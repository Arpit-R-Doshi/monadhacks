import { Router } from 'express';
import { getPromptsByUser, getModelById, getUserTokenUsageSummary, getDB } from '../db/sqlite.js';

const router = Router();

/**
 * GET /api/history/summary/:userAddress
 * Get token usage summary (aggregate, per-model breakdown, and subscriptions)
 */
router.get('/summary/:userAddress', (req, res) => {
  try {
    const { userAddress } = req.params;
    if (!userAddress) return res.status(400).json({ error: 'User address required' });
    const summary = getUserTokenUsageSummary(userAddress);
    res.json({ success: true, summary });
  } catch (err) {
    console.error('[History Summary] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/history/prompts/:userAddress
 * Get detailed flat prompt execution usage history with token metrics and explorer links
 */
router.get('/prompts/:userAddress', (req, res) => {
  try {
    const { userAddress } = req.params;
    if (!userAddress) return res.status(400).json({ error: 'User address required' });
    const rawPrompts = getPromptsByUser(userAddress);
    const prompts = rawPrompts.map(p => ({
      ...p,
      total_tokens: (p.input_tokens || 0) + (p.output_tokens || 0),
      explorerUrl: p.tx_hash && !p.tx_hash.startsWith('0x_')
        ? `https://testnet.monadexplorer.com/tx/${p.tx_hash}`
        : null,
    }));
    res.json({ success: true, prompts });
  } catch (err) {
    console.error('[History Prompts] Error:', err);
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
      WHERE LOWER(user_address) = ? AND model_id = ? AND status = 'completed'
      ORDER BY created_at ASC
      LIMIT 50
    `).all(userAddress.toLowerCase(), modelId);

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

/**
 * GET /api/history/:userAddress
 * Get all chat history for a user across all models (grouped by conversation)
 */
router.get('/:userAddress', (req, res) => {
  try {
    const { userAddress } = req.params;
    const db = getDB();

    const prompts = db.prepare(`
      SELECT p.*, m.name as model_name, m.category as model_category, m.ollama_model
      FROM prompts p
      LEFT JOIN models m ON p.model_id = m.id
      WHERE LOWER(p.user_address) = ?
      ORDER BY p.created_at DESC
      LIMIT 200
    `).all(userAddress.toLowerCase());

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

    const conversations = Object.values(grouped).sort((a, b) => {
      const aTime = new Date(a.messages[0]?.createdAt || 0);
      const bTime = new Date(b.messages[0]?.createdAt || 0);
      return bTime - aTime;
    });

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

export default router;
