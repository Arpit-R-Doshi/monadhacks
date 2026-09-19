import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { getApiKeyByHash, updateApiKeyUsage, getModelById, getModels, getOrCreateUser, updateUserBalance, incrementModelUses, savePrompt, updatePromptResponse } from '../db/sqlite.js';
import { runInference } from '../services/compute.js';
import { encrypt } from '../services/encryption.js';
import { uploadToIPFS } from '../services/ipfs.js';

const router = Router();

function hashKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Middleware: authenticate API key from Authorization header
 */
function authenticateApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { message: 'Missing or invalid Authorization header. Use: Bearer syn3_xxxxx', type: 'auth_error' }
    });
  }

  const apiKey = authHeader.replace('Bearer ', '').trim();
  if (!apiKey.startsWith('syn3_')) {
    return res.status(401).json({
      error: { message: 'Invalid API key format', type: 'auth_error' }
    });
  }

  const keyHash = hashKey(apiKey);
  const keyRecord = getApiKeyByHash(keyHash);

  if (!keyRecord) {
    return res.status(401).json({
      error: { message: 'Invalid or revoked API key', type: 'auth_error' }
    });
  }

  req.apiKey = keyRecord;
  req.userAddress = keyRecord.user_address;
  next();
}

/**
 * GET /api/v1/models
 * List available models (OpenAI-compatible)
 */
router.get('/models', authenticateApiKey, (req, res) => {
  const models = getModels();
  res.json({
    object: 'list',
    data: models.map(m => ({
      id: m.id,
      object: 'model',
      created: Math.floor(new Date(m.created_at).getTime() / 1000),
      owned_by: m.owner_address,
      meta: {
        name: m.name,
        description: m.description,
        category: m.category,
        price_per_use: m.price_per_use,
      }
    }))
  });
});

/**
 * POST /api/v1/chat/completions
 * OpenAI-compatible chat completions endpoint
 */
router.post('/chat/completions', authenticateApiKey, async (req, res) => {
  const startTime = Date.now();

  try {
    const { model: modelId, messages, max_tokens, temperature, stream } = req.body;

    if (!modelId) {
      return res.status(400).json({
        error: { message: 'Missing required field: model', type: 'invalid_request' }
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: { message: 'Missing or invalid messages array', type: 'invalid_request' }
      });
    }

    // Resolve model
    const modelRecord = getModelById(modelId);
    if (!modelRecord) {
      return res.status(404).json({
        error: { message: `Model '${modelId}' not found`, type: 'not_found' }
      });
    }

    // Check user balance (pay-as-you-go: 1 SYN per request)
    const costPerRequest = modelRecord.price_per_use ?? 1;
    const user = getOrCreateUser(req.userAddress);
    if (user.balance < costPerRequest) {
      return res.status(402).json({
        error: {
          message: `Insufficient SYN balance. You have ${user.balance} SYN, need ${costPerRequest} SYN per request. Top up via the dashboard faucet.`,
          type: 'insufficient_funds'
        }
      });
    }

    // Build prompt from messages (OpenAI format → single prompt)
    const prompt = messages.map(m => {
      if (m.role === 'system') return `System: ${m.content}`;
      if (m.role === 'user') return `User: ${m.content}`;
      if (m.role === 'assistant') return `Assistant: ${m.content}`;
      return m.content;
    }).join('\n\n');

    // Run inference
    const inferenceResult = await runInference(modelRecord.ollama_model, prompt);
    const totalTokens = (inferenceResult.inputTokens || 0) + (inferenceResult.outputTokens || 0);

    // Deduct balance
    updateUserBalance(req.userAddress, -costPerRequest);
    incrementModelUses(modelId);
    updateApiKeyUsage(req.apiKey.id, totalTokens);

    // Save prompt record
    const promptId = uuidv4();
    const encryptedPrompt = encrypt(prompt, modelRecord.encryption_key);
    const { cid: promptCid } = await uploadToIPFS(encryptedPrompt, `api_prompt_${promptId}`);

    savePrompt({
      id: promptId,
      modelId,
      userAddress: req.userAddress,
      promptText: prompt,
      encryptedPromptCid: promptCid,
      inputTokens: inferenceResult.inputTokens || 0,
      status: 'completed',
    });

    const encryptedResponse = encrypt(inferenceResult.response, modelRecord.encryption_key);
    const { cid: responseCid } = await uploadToIPFS(encryptedResponse, `api_response_${promptId}`);

    updatePromptResponse(promptId, {
      responseText: inferenceResult.response,
      responseCid,
      outputTokens: inferenceResult.outputTokens || 0,
      txHash: '0x_api_' + promptId.slice(0, 16),
      durationMs: Date.now() - startTime,
    });

    // Return OpenAI-compatible response
    res.json({
      id: `chatcmpl-${promptId}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: modelId,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: inferenceResult.response,
        },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: inferenceResult.inputTokens || 0,
        completion_tokens: inferenceResult.outputTokens || 0,
        total_tokens: totalTokens,
      },
      syn3rgy: {
        cost: costPerRequest,
        remaining_balance: user.balance - costPerRequest,
        ipfs_cid: responseCid,
        prompt_id: promptId,
      }
    });

  } catch (err) {
    console.error('[API v1] Inference error:', err);
    res.status(500).json({
      error: { message: err.message, type: 'server_error' }
    });
  }
});

export default router;
