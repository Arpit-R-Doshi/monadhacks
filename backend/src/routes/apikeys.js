import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';
import { createApiKey, getApiKeysByUser, revokeApiKey, updateApiKeyLimits } from '../db/sqlite.js';

const router = Router();

function hashKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * POST /api/keys/generate
 * Generate a new API key with optional rate limit and usage limits
 */
router.post('/generate', (req, res) => {
  try {
    const { userAddress, name, rateLimitRpm, usageLimitRequests, usageLimitMon } = req.body;

    if (!userAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    // Check existing key count (max 5 per user)
    const existing = getApiKeysByUser(userAddress);
    const activeKeys = existing.filter(k => k.is_active);
    if (activeKeys.length >= 5) {
      return res.status(400).json({ error: 'Maximum 5 active API keys allowed' });
    }

    // Generate key: ecl_<random 48 hex chars>
    const rawKey = 'ecl_' + randomBytes(24).toString('hex');
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12) + '...';
    const keyId = uuidv4();

    createApiKey({
      id: keyId,
      keyHash,
      keyPrefix,
      userAddress,
      name: name || 'Default',
      rateLimitRpm: rateLimitRpm || 60,
      usageLimitRequests: usageLimitRequests || 0,
      usageLimitMon: usageLimitMon || 0,
    });

    // Return full key only once — it won't be shown again
    res.json({
      success: true,
      key: {
        id: keyId,
        apiKey: rawKey,
        prefix: keyPrefix,
        name: name || 'Default',
        rateLimitRpm: rateLimitRpm || 60,
        usageLimitRequests: usageLimitRequests || 0,
        usageLimitMon: usageLimitMon || 0,
      },
      message: '⚠️ Save this API key now. It will not be shown again.',
    });

  } catch (err) {
    console.error('[API Keys] Generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/keys/list/:address
 * List all API keys for a wallet
 */
router.get('/list/:address', (req, res) => {
  try {
    const keys = getApiKeysByUser(req.params.address);
    res.json({ success: true, keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/keys/limits/:keyId
 * Update rate limit and usage limits on an API key
 */
router.put('/limits/:keyId', (req, res) => {
  try {
    const { userAddress, rateLimitRpm, usageLimitRequests, usageLimitMon } = req.body;
    if (!userAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    updateApiKeyLimits(req.params.keyId, userAddress, {
      rateLimitRpm,
      usageLimitRequests,
      usageLimitMon,
    });

    res.json({ success: true, message: 'API key limits updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/keys/revoke/:keyId
 * Revoke an API key
 */
router.delete('/revoke/:keyId', (req, res) => {
  try {
    const { userAddress } = req.body;
    if (!userAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    revokeApiKey(req.params.keyId, userAddress);
    res.json({ success: true, message: 'API key revoked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
