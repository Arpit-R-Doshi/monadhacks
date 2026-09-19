import { Router } from 'express';
import { getOrCreateUser, updateUserBalance, createWithdrawal, getWithdrawals, getOwnerEarningsSummary } from '../db/sqlite.js';
import { transferMonadNative } from '../services/blockchain.js';

const router = Router();

/**
 * Notice: Razorpay / Fiat functionality has been removed in favor of Monad Testnet native tokens (MON).
 */
router.post('/create-order', (req, res) => {
  res.status(400).json({
    error: 'Fiat payment gateway is disabled. All model operations and cashouts are in native Monad tokens (MON).',
    currency: 'MON',
  });
});

router.post('/verify', (req, res) => {
  res.status(400).json({
    error: 'Fiat payment gateway is disabled. All model operations and cashouts are in native Monad tokens (MON).',
    currency: 'MON',
  });
});

/**
 * GET /api/payments/owner-earnings/:wallet
 * Get verified model owner earnings summary in MON
 */
router.get('/owner-earnings/:wallet', (req, res) => {
  try {
    const { wallet } = req.params;
    if (!wallet) return res.status(400).json({ error: 'Wallet address required' });

    const summary = getOwnerEarningsSummary(wallet);
    res.json({ success: true, earnings: summary });
  } catch (err) {
    console.error('[Owner Earnings] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/payments/cashout
 * Model owner requests cashout of earnings strictly in native Monad testnet tokens (MON).
 * Directly transfers MON on Monad Testnet (Chain ID 10143) to the owner's wallet address.
 */
router.post('/cashout', async (req, res) => {
  try {
    const { walletAddress, eclAmount, amount: rawAmount, recipientAddress } = req.body;
    const amount = Number(rawAmount !== undefined ? rawAmount : eclAmount);

    if (!walletAddress || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid walletAddress and a positive MON amount are required' });
    }

    const destinationAddress = (recipientAddress || walletAddress).trim();
    if (!destinationAddress.startsWith('0x') || destinationAddress.length !== 42) {
      return res.status(400).json({ error: 'Invalid Monad recipient address format. Must be a 42-character 0x address.' });
    }

    // Verify owner's withdrawable earnings
    const summary = getOwnerEarningsSummary(walletAddress);
    if (amount > summary.withdrawableAmount) {
      return res.status(400).json({
        error: `Insufficient withdrawable earnings. You have ${summary.withdrawableAmount.toFixed(4)} MON available, but requested ${amount} MON.`,
        available: summary.withdrawableAmount,
      });
    }

    console.log(`[Cashout] Processing on-chain Monad cashout: ${amount} MON for owner ${walletAddress} -> recipient ${destinationAddress}...`);

    // Execute direct on-chain Monad Testnet transfer
    let txResult;
    try {
      txResult = await transferMonadNative(destinationAddress, amount);
    } catch (chainErr) {
      console.error('[Cashout] On-chain transfer failed:', chainErr);
      return res.status(500).json({
        error: `Monad on-chain transfer failed: ${chainErr.message || 'RPC transaction error'}`,
      });
    }

    const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Deduct from internal user balance if present
    const user = getOrCreateUser(walletAddress);
    if (user && user.balance > 0) {
      const deductFromBal = Math.min(user.balance, amount);
      updateUserBalance(walletAddress, -deductFromBal);
    }

    // Record on-chain withdrawal in DB
    createWithdrawal({
      id: withdrawalId,
      walletAddress,
      recipientAddress: destinationAddress,
      amount,
      currency: 'MON',
      localAmount: amount,
      method: 'monad_testnet',
      status: 'completed',
      payoutInfo: destinationAddress,
      txHash: txResult.hash,
    });

    const updatedSummary = getOwnerEarningsSummary(walletAddress);

    console.log(`[Cashout] ✅ Successfully sent ${amount} MON to ${destinationAddress} | Tx: ${txResult.hash}`);

    res.json({
      success: true,
      txHash: txResult.hash,
      explorerUrl: `https://testnet.monadexplorer.com/tx/${txResult.hash}`,
      withdrawal: {
        id: withdrawalId,
        amount,
        currency: 'MON',
        recipient: destinationAddress,
        txHash: txResult.hash,
        status: 'completed',
      },
      summary: updatedSummary,
      message: `Successfully transferred ${amount} MON to ${destinationAddress.slice(0, 6)}...${destinationAddress.slice(-4)} on Monad Testnet!`,
    });
  } catch (err) {
    console.error('[Cashout] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/payments/withdrawals/:wallet
 * Get withdrawal history for a model owner with Monad explorer links
 */
router.get('/withdrawals/:wallet', (req, res) => {
  try {
    const rawWithdrawals = getWithdrawals(req.params.wallet);
    const withdrawals = rawWithdrawals.map(w => ({
      ...w,
      currency: 'MON',
      explorerUrl: w.tx_hash && !w.tx_hash.startsWith('0x_') ? `https://testnet.monadexplorer.com/tx/${w.tx_hash}` : null,
    }));
    res.json({ success: true, withdrawals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
