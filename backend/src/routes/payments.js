import { Router } from 'express';
import { getOrCreateUser, updateUserBalance, createWithdrawal, getWithdrawals } from '../db/sqlite.js';

const router = Router();

/**
 * Notice: Razorpay functionality has been removed in favor of Monad Testnet native tokens (MON).
 */
router.post('/create-order', (req, res) => {
  res.status(400).json({
    error: 'Fiat payment gateway is currently disabled. Please use native Monad testnet tokens (MON) for inference and subscriptions.',
    currency: 'MON',
  });
});

router.post('/verify', (req, res) => {
  res.status(400).json({
    error: 'Fiat payment gateway is currently disabled. Please use native Monad testnet tokens (MON) for inference and subscriptions.',
    currency: 'MON',
  });
});

/**
 * POST /api/payments/cashout
 * Model owner requests a cashout of earnings in MON
 */
router.post('/cashout', async (req, res) => {
  try {
    const { walletAddress, eclAmount, method, payoutInfo } = req.body;
    const amount = Number(eclAmount);

    if (!walletAddress || !amount || amount <= 0) {
      return res.status(400).json({ error: 'walletAddress and a positive amount are required' });
    }

    const user = getOrCreateUser(walletAddress);
    if (user.balance < amount) {
      return res.status(400).json({
        error: `Insufficient balance. You have ${user.balance.toFixed(2)} MON but requested ${amount} MON.`,
      });
    }

    const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Deduct from balance
    updateUserBalance(walletAddress, -amount);

    // Record withdrawal
    createWithdrawal({
      id: withdrawalId,
      walletAddress,
      amount: amount,
      currency: 'MON',
      localAmount: amount,
      method: method || 'onchain_monad',
      payoutInfo: payoutInfo || walletAddress,
    });

    const updatedUser = getOrCreateUser(walletAddress);

    console.log(`[Cashout] 💸 ${amount} MON cashout request for ${walletAddress} | ID: ${withdrawalId}`);

    res.json({
      success: true,
      withdrawal: {
        id: withdrawalId,
        amount: amount,
        currency: 'MON',
        method: method || 'onchain_monad',
        status: 'pending',
      },
      newBalance: updatedUser.balance,
      message: `Cashout request of ${amount} MON submitted!`,
    });
  } catch (err) {
    console.error('[Cashout] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/payments/withdrawals/:wallet
 * Get withdrawal history for an owner
 */
router.get('/withdrawals/:wallet', (req, res) => {
  try {
    const withdrawals = getWithdrawals(req.params.wallet);
    res.json({ success: true, withdrawals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
