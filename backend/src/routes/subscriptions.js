import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  getOrCreateUser, 
  updateUserBalance, 
  getModelById, 
  createSubscription, 
  getSubscription,
  getUserSubscriptions,
  getOwnerSubscriptionStats
} from '../db/sqlite.js';
import { hasActiveSubscription } from '../services/blockchain.js';

const router = Router();

/**
 * POST /api/subscriptions/sync
 * Syncs a layer-2 on-chain subscription to the fast local SQLite read-index
 */
router.post('/sync', async (req, res) => {
  try {
    const { userAddress, modelId } = req.body;

    if (!userAddress || !modelId) {
      return res.status(400).json({ error: 'Missing userAddress or modelId' });
    }

    const model = getModelById(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Verify on-chain presence
    const isValid = await hasActiveSubscription(userAddress, modelId);
    if (!isValid) {
      return res.status(403).json({ error: 'No active subscription found on Polygon Amoy for this wallet.' });
    }

    // Check if an active subscription already exists locally
    const existing = getSubscription(userAddress, modelId);
    if (existing) {
      return res.json({ success: true, message: 'Already synced.' });
    }

    // Create Subscription internally for fast dashboard querying
    const subId = uuidv4();
    createSubscription({
      id: subId,
      userAddress,
      modelId,
      tokensAllocated: 50000,
    });

    res.json({
      success: true,
      subscriptionId: subId,
      message: 'Subscription fully synchronized to read-index.'
    });

  } catch (err) {
    console.error('[Subscriptions] Sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subscriptions/user/:address
 * Get all active subscriptions for a user
 */
router.get('/user/:address', (req, res) => {
  try {
    const subs = getUserSubscriptions(req.params.address);
    res.json({ success: true, subscriptions: subs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subscriptions/check/:address/:modelId
 * Helper to check specific subscription status
 */
router.get('/check/:address/:modelId', (req, res) => {
  try {
    const sub = getSubscription(req.params.address, req.params.modelId);
    res.json({ success: true, subscribed: !!sub, subscription: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subscriptions/owner/:address
 * Get metrics for models owned by this address
 */
router.get('/owner/:address', (req, res) => {
  try {
    const stats = getOwnerSubscriptionStats(req.params.address);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
