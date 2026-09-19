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

const router = Router();

/**
 * POST /api/subscriptions/subscribe
 * Subscribes a user to a model using SYN tokens
 */
router.post('/subscribe', (req, res) => {
  try {
    const { userAddress, modelId } = req.body;

    if (!userAddress || !modelId) {
      return res.status(400).json({ error: 'Missing userAddress or modelId' });
    }

    const model = getModelById(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const user = getOrCreateUser(userAddress);
    if (user.balance < model.subscription_price) {
      return res.status(402).json({ error: 'Insufficient SYN balance for subscription' });
    }

    // Check if an active subscription already exists
    const existing = getSubscription(userAddress, modelId);
    if (existing) {
      return res.status(400).json({ error: 'Already actively subscribed to this model' });
    }

    // Process Payment
    // Deduct from user
    updateUserBalance(userAddress, -model.subscription_price);
    
    // Credit to owner
    getOrCreateUser(model.owner_address); // Ensure owner exists in DB
    updateUserBalance(model.owner_address, model.subscription_price);

    // Create Subscription
    const subId = uuidv4();
    createSubscription({
      id: subId,
      userAddress,
      modelId,
      tokensAllocated: 50000, // Hardcoded 50k tokens per month for now
    });

    res.json({
      success: true,
      subscriptionId: subId,
      newBalance: user.balance - model.subscription_price,
      message: 'Subscribed successfully. 50,000 tokens allocated.'
    });

  } catch (err) {
    console.error('[Subscriptions] Subscribe error:', err);
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
