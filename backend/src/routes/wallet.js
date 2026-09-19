import { Router } from 'express';
import { getTokenBalance, getMonadNativeBalance, claimFaucet } from '../services/blockchain.js';
import { getOrCreateUser, updateUserBalance } from '../db/sqlite.js';

const router = Router();

/**
 * POST /api/wallet/connect
 * Connect wallet and initialize user with Monad testnet balance
 */
router.post('/connect', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Wallet address required' });

    const user = getOrCreateUser(address);
    let monadBal = '0';
    try {
      monadBal = await getMonadNativeBalance(address);
      const parsedOnChain = parseFloat(monadBal);
      if (parsedOnChain > 0 && user.balance < parsedOnChain) {
        updateUserBalance(address, parsedOnChain - user.balance);
      }
    } catch (e) {
      console.log('[Wallet] Monad balance sync notice:', e.message);
    }

    const updatedUser = getOrCreateUser(address);
    res.json({
      success: true,
      currency: 'MON',
      monadBalance: monadBal,
      user: {
        address: updatedUser.address,
        balance: updatedUser.balance,
        totalSpent: updatedUser.total_spent,
        totalPrompts: updatedUser.total_prompts,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/wallet/balance/:address
 * Get user balance (Monad test token balance + platform balance)
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const address = req.params.address;
    const user = getOrCreateUser(address);
    let monadBalance = '0';
    let tokenBalance = '0';

    try {
      monadBalance = await getMonadNativeBalance(address);
      const parsedMonad = parseFloat(monadBalance);
      if (parsedMonad > 0 && user.balance < parsedMonad) {
        updateUserBalance(address, parsedMonad - user.balance);
      }
    } catch (e) {
      console.log('[Wallet] Could not fetch native Monad balance:', e.message);
    }

    try {
      tokenBalance = await getTokenBalance(address);
    } catch (e) {
      console.log('[Wallet] Could not fetch on-chain token balance:', e.message);
    }

    const refreshedUser = getOrCreateUser(address);

    res.json({
      address,
      currency: 'MON',
      platformBalance: refreshedUser.balance,
      monadBalance,
      onChainBalance: monadBalance !== '0.00' ? monadBalance : tokenBalance,
      totalSpent: refreshedUser.total_spent,
      totalPrompts: refreshedUser.total_prompts,
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
