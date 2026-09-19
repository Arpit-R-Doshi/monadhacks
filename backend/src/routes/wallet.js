import { Router } from 'express';
import { getTokenBalance, claimFaucet } from '../services/blockchain.js';
import { getOrCreateUser, updateUserBalance } from '../db/sqlite.js';

const router = Router();

/**
 * POST /api/wallet/connect
 * Connect wallet and initialize user
 */
router.post('/connect', (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Wallet address required' });

    const user = getOrCreateUser(address);
    res.json({
      success: true,
      user: {
        address: user.address,
        balance: user.balance,
        totalSpent: user.total_spent,
        totalPrompts: user.total_prompts,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/wallet/balance/:address
 * Get user balance (on-chain + local)
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const address = req.params.address;
    const user = getOrCreateUser(address);
    let onChainBalance = '0';

    try {
      onChainBalance = await getTokenBalance(address);
    } catch (e) {
      console.log('[Wallet] Could not fetch on-chain balance:', e.message);
    }

    res.json({
      address,
      platformBalance: user.balance,
      onChainBalance,
      totalSpent: user.total_spent,
      totalPrompts: user.total_prompts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/wallet/faucet
 * Claim demo tokens
 */
router.post('/faucet', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Wallet address required' });

    // Add platform credits
    const user = getOrCreateUser(address);
    updateUserBalance(address, 100);

    // Try on-chain faucet too
    let chainResult = { simulated: true };
    try {
      chainResult = await claimFaucet(address);
    } catch (e) {
      console.log('[Wallet] On-chain faucet failed:', e.message);
    }

    res.json({
      success: true,
      credited: 100,
      newBalance: user.balance + 100,
      blockchain: chainResult,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
