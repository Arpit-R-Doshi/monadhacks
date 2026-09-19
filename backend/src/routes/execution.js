import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt } from '../services/encryption.js';
import { uploadToIPFS } from '../services/ipfs.js';
import { createPromptOnChain, submitResponseOnChain } from '../services/blockchain.js';
import { runInference, healthCheck } from '../services/compute.js';
import { processImageAndExtractText } from '../services/vision.js';
import { getModelById, savePrompt, updatePromptResponse, getPromptsByUser, checkRateLimit, incrementModelUses, getOrCreateUser, updateUserBalance } from '../db/sqlite.js';

const router = Router();

/**
 * POST /api/execute
 * Full prompt execution pipeline
 */
router.post('/', async (req, res) => {
  try {
    const { modelId, prompt, userAddress, image } = req.body;

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

    // 3. Check user balance
    const user = getOrCreateUser(userAddress);
    if (user.balance < model.price_per_use) {
      return res.status(402).json({ error: 'Insufficient SYN balance', balance: user.balance, required: model.price_per_use });
    }

    let finalPrompt = prompt;

    // 3.5. Process Image Layer (OpenCV/OCR)
    if (image) {
      console.log('[Vision] Processing attached image layer...');
      try {
        const extractedInfo = await processImageAndExtractText(image);
        if (extractedInfo && extractedInfo.trim() !== '') {
          finalPrompt = `I am attaching an image. Here is the visual extraction information from OpenCV/OCR:\n"${extractedInfo}"\n\nUser Question:\n${prompt}`;
        } else {
          finalPrompt = `I am attaching an image, but it appears to be empty or contain no recognizable text.\n\nUser Question:\n${prompt}`;
        }
      } catch (visionErr) {
        console.error('[Vision] Failed to process image:', visionErr);
        // Continue but inform the model the vision layer failed
        finalPrompt = `[Note: The user attached an image, but the computer vision extraction layer failed to process it.]\n\nUser Question:\n${prompt}`;
      }
    }

    const promptId = uuidv4();

    // 4. Encrypt prompt
    // Note: We don't encrypt the base64 image here to save DB/IPFS space and gas, 
    // but in a fully secure architecture, you would encrypt images as well.
    const encryptedPrompt = encrypt(finalPrompt, model.encryption_key);

    // 5. Upload encrypted prompt to IPFS
    const { cid: promptCid } = await uploadToIPFS(encryptedPrompt, `prompt_${promptId}`);

    // 6. Record prompt on-chain
    const inputTokens = Math.ceil(finalPrompt.length / 4);
    const chainResult = await createPromptOnChain(promptId, modelId, promptCid, inputTokens);

    // 7. Save prompt to DB
    savePrompt({
      id: promptId,
      modelId,
      userAddress,
      promptText: finalPrompt,
      encryptedPromptCid: promptCid,
      inputTokens,
      status: 'processing',
    });

    // 8. Run inference via compute node (Ollama)
    const inferenceResult = await runInference(model.ollama_model, finalPrompt);

    // 9. Encrypt response
    const encryptedResponse = encrypt(inferenceResult.response, model.encryption_key);

    // 10. Upload encrypted response to IPFS
    const { cid: responseCid } = await uploadToIPFS(encryptedResponse, `response_${promptId}`);

    // 11. Submit response on-chain
    const computeNodeAddress = process.env.COMPUTE_NODE_ADDRESS || '0x0000000000000000000000000000000000000000';
    const responseChainResult = await submitResponseOnChain(promptId, computeNodeAddress, responseCid, inferenceResult.outputTokens);

    // 12. Deduct payment
    updateUserBalance(userAddress, -model.price_per_use);
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

export default router;
