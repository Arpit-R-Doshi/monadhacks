import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt } from '../services/encryption.js';
import { uploadToIPFS } from '../services/ipfs.js';
import { runInference, healthCheck, COMPUTE_NODES, getNodeById, allNodesHealth, MODEL_COMPENSATION_RATES } from '../services/compute.js';
import { getModelById, savePrompt, updatePromptResponse, getPromptsByUser, checkRateLimit, incrementModelUses, getOrCreateUser, updateUserBalance, getSubscription, updateSubscriptionTokens, addWorkerEarnings } from '../db/sqlite.js';
import { createPromptOnChain, submitResponseOnChain, deductFromSubscriptionOnChain, hasActiveSubscription as hasActiveSubOnChain } from '../services/blockchain.js';

const router = Router();

/**
 * POST /api/execute
 * Full prompt execution pipeline
 */
router.post('/', async (req, res) => {
  try {
    const { modelId, prompt, userAddress, sessionId, nodeId } = req.body;

    if (!modelId || !prompt || !userAddress) {
      return res.status(400).json({ error: 'Missing required fields: modelId, prompt, userAddress' });
    }

    // 1. Get model details
    const model = getModelById(modelId);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    if (!model.is_active) return res.status(400).json({ error: 'Model is inactive' });

    // 2. Check rate limit
    const allowed = checkRateLimit(userAddress, modelId, model.rate_limit);
    if (!allowed) {
      return res.status(429).json({ error: `Rate limit exceeded. Max ${model.rate_limit} requests/minute.` });
    }

    // 3. Check for active subscription
    const user = getOrCreateUser(userAddress);
    
    // Perform read from Monad Testnet RPC
    try {
      const hasMonadSub = await hasActiveSubOnChain(userAddress, modelId);
      if (!hasMonadSub) {
         console.warn('[Execution] No on-chain subscription found, proceeding with local check only.');
      }
    } catch (chainErr) {
      console.warn('[Execution] On-chain subscription check failed:', chainErr.shortMessage || chainErr.message);
    }
    
    const sub = getSubscription(userAddress, modelId);
    if (sub && sub.tokens_used >= sub.tokens_allocated) {
       return res.status(402).json({ error: 'Subscription token limit reached for this month.' });
    }

    const selectedNode = getNodeById(nodeId);
    const finalPrompt = prompt;
    const promptId = uuidv4();

    // 4. Encrypt prompt
    const encryptedPrompt = encrypt(finalPrompt, model.encryption_key);

    // 5. Upload encrypted prompt to IPFS
    const { cid: promptCid } = await uploadToIPFS(encryptedPrompt, `prompt_${promptId}`);

    // 6. Record prompt on-chain
    const inputTokens = Math.ceil(finalPrompt.length / 4);
    let chainResult = { hash: '0x_local' };
    try {
      chainResult = await createPromptOnChain(promptId, modelId, promptCid, inputTokens);
    } catch (chainErr) {
      console.warn('[Execution] On-chain prompt recording failed:', chainErr.shortMessage || chainErr.message);
    }

    // 7. Save prompt to DB
    savePrompt({
      id: promptId,
      modelId,
      userAddress,
      sessionId: sessionId || null,
      promptText: finalPrompt,
      encryptedPromptCid: promptCid,
      inputTokens,
      status: 'processing',
    });

    // 8. Run inference via compute node (Ollama or Remote Peer or Groq)
    const inferenceResult = await runInference(model, finalPrompt, null, selectedNode.url);
    console.log(`[Execution] Inference completed on ${selectedNode.name} (${selectedNode.id})`);

    // 8.5 Compensate Worker if run on Ollama
    if (selectedNode.id === 'ollama-local') {
      const ollamaModelName = inferenceResult.model || model.ollama_model;
      const compensation = MODEL_COMPENSATION_RATES[ollamaModelName] || 0.05; // default to 0.05 MON
      const workerWallet = '0x0D53ae112F699a30Af6daC175E353172B7Db7cB9'; // Default hardcoded worker
      addWorkerEarnings(workerWallet, compensation);
      console.log(`[Execution] Worker ${workerWallet} compensated ${compensation} MON for running ${ollamaModelName}`);
    }

    // 9. Encrypt response
    const encryptedResponse = encrypt(inferenceResult.response, model.encryption_key);

    // 10. Upload encrypted response to IPFS
    const { cid: responseCid } = await uploadToIPFS(encryptedResponse, `response_${promptId}`);

    // 11. Submit response on-chain
    const computeNodeAddress = process.env.COMPUTE_NODE_ADDRESS || '0x0000000000000000000000000000000000000000';
    let responseChainResult = { hash: '0x_local' };
    try {
      responseChainResult = await submitResponseOnChain(promptId, computeNodeAddress, responseCid, inferenceResult.outputTokens);
    } catch (chainErr) {
      console.warn('[Execution] On-chain response submission failed:', chainErr.shortMessage || chainErr.message);
    }

    // 12. Deduct tokens
    const totalTokens = inferenceResult.inputTokens + inferenceResult.outputTokens;
    
    // Persist to Layer-2 Smart Contract
    try {
      await deductFromSubscriptionOnChain(userAddress, modelId, totalTokens);
    } catch (chainErr) {
      console.warn('[Execution] On-chain deduction failed:', chainErr.shortMessage || chainErr.message);
    }
    
    // Persist to lightning-fast DB read index
    if (sub) {
      updateSubscriptionTokens(sub.id, totalTokens);
    }
    incrementModelUses(modelId);

    // 13. Update prompt in DB
    updatePromptResponse(promptId, {
      responseText: inferenceResult.response,
      responseCid,
      outputTokens: inferenceResult.outputTokens,
      txHash: responseChainResult.hash,
      durationMs: inferenceResult.duration,
    });

    res.json({
      success: true,
      promptId,
      response: inferenceResult.response,
      metadata: {
        model: inferenceResult.model,
        inputTokens: inferenceResult.inputTokens,
        outputTokens: inferenceResult.outputTokens,
        duration: inferenceResult.duration,
        promptCid,
        responseCid,
        txHash: responseChainResult.hash,
        simulated: inferenceResult.simulated || false,
      },
      balance: user.balance - model.price_per_use,
    });
  } catch (err) {
    console.error('[Execute] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/execute/history/:address
 * Get prompt history for a user
 */
router.get('/history/:address', (req, res) => {
  try {
    const prompts = getPromptsByUser(req.params.address);
    res.json({ prompts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/execute/health
 * Check compute node health
 */
router.get('/health', async (req, res) => {
  const health = await healthCheck();
  res.json(health);
});

/**
 * GET /api/execute/nodes
 * List all available compute nodes
 */
router.get('/nodes', (req, res) => {
  res.json({
    success: true,
    nodes: COMPUTE_NODES.map(n => ({
      id: n.id,
      name: n.name,
      location: n.location,
      specs: n.specs,
      icon: n.icon,
    })),
  });
});

/**
 * GET /api/execute/nodes/health
 * Check health of all compute nodes
 */
router.get('/nodes/health', async (req, res) => {
  const nodes = await allNodesHealth();
  res.json({ success: true, nodes });
});

export default router;
