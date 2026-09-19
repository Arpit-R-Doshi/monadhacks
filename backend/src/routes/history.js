import { Router } from 'express';
import { getPromptsByUser, getModelById } from '../db/sqlite.js';
import { getDB } from '../db/sqlite.js';

const router = Router();

/**
 * GET /api/history/:userAddress
 * Get all chat history for a user across all models
 */
router.get('/:userAddress', (req, res) => {
  try {
    const { userAddress } = req.params;
    const db = getDB();

    const prompts = db.prepare(`
      SELECT p.*, m.name as model_name, m.category as model_category, m.ollama_model
      FROM prompts p
      LEFT JOIN models m ON p.model_id = m.id
      WHERE p.user_address = ?
      ORDER BY p.created_at DESC
      LIMIT 200
    `).all(userAddress);

    // Group prompts by session_id (or by model_id for legacy prompts without session)
    const grouped = {};
    for (const p of prompts) {
      const key = p.session_id || `legacy_${p.model_id}`;
      if (!grouped[key]) {
        grouped[key] = {
          sessionId: key,
          modelId: p.model_id,
          modelName: p.model_name || p.model_id,
          modelCategory: p.model_category,
          startedAt: p.created_at,
          messages: [],
        };
      }
      grouped[key].messages.push({
        id: p.id,
        userPrompt: p.prompt_text,
        assistantResponse: p.response_text,
        status: p.status,
        inputTokens: p.input_tokens,
        outputTokens: p.output_tokens,
        durationMs: p.duration_ms,
        txHash: p.tx_hash,
        promptCid: p.encrypted_prompt_cid,
        responseCid: p.response_cid,
        createdAt: p.created_at,
        completedAt: p.completed_at,
      });
    }

    // Sort conversations by most recent message
    const conversations = Object.values(grouped).sort((a, b) => {
      const aTime = new Date(a.messages[0]?.createdAt || 0);
      const bTime = new Date(b.messages[0]?.createdAt || 0);
      return bTime - aTime;
    });

    // Reverse messages within each conversation to chronological order
    for (const conv of conversations) {
      conv.messages.reverse();
    }

    res.json({
      success: true,
      total: prompts.length,
      conversations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/history/:userAddress/:modelId
 * Get chat history for a specific user+model pair (for chat restore)
 */
router.get('/:userAddress/:modelId', (req, res) => {
  try {
    const { userAddress, modelId } = req.params;
    const db = getDB();

    const prompts = db.prepare(`
      SELECT * FROM prompts
      WHERE user_address = ? AND model_id = ? AND status = 'completed'
      ORDER BY created_at ASC
      LIMIT 50
    `).all(userAddress, modelId);

    // Convert to chat message format
    const messages = [];
    for (const p of prompts) {
      messages.push({
        role: 'user',
        content: p.prompt_text,
        timestamp: p.created_at,
        id: p.id,
      });
      if (p.response_text) {
        messages.push({
          role: 'assistant',
          content: p.response_text,
          timestamp: p.completed_at || p.created_at,
          id: `${p.id}-response`,
          meta: {
            inputTokens: p.input_tokens,
            outputTokens: p.output_tokens,
            duration: p.duration_ms,
            txHash: p.tx_hash,
            promptCid: p.encrypted_prompt_cid,
            responseCid: p.response_cid,
          },
        });
      }
    }

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
