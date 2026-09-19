import { Router } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getOrCreateUser, updateUserBalance, createWithdrawal, getWithdrawals } from '../db/sqlite.js';

const router = Router();

// Lazy-initialize Razorpay (only when keys are present)
let razorpay = null;
function getRazorpay() {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || keyId === 'your_razorpay_key_id_here') {
      throw new Error('Razorpay API keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    }
    razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpay;
}

// Supported currencies and their approximate exchange rates to USD
const EXCHANGE_RATES = {
  USD: 1,
  INR: 84.0,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SGD: 1.34,
  JPY: 149.0,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.88,
  CNY: 7.25,
  KRW: 1320.0,
  MYR: 4.72,
  THB: 35.0,
  BRL: 4.97,
  ZAR: 18.5,
  SAR: 3.75,
  HKD: 7.82,
  PHP: 56.0,
  IDR: 15700.0,
  BDT: 110.0,
  LKR: 310.0,
  NPR: 133.0,
};

/**
 * GET /api/payments/currencies
 * Return supported currencies and exchange rates
 */
router.get('/currencies', (req, res) => {
  res.json({
    success: true,
    baseCurrency: 'USD',
    tokenRate: '1 USD = 1 ECL',
    currencies: Object.entries(EXCHANGE_RATES).map(([code, rate]) => ({
      code,
      rateToUSD: rate,
      eclPerUnit: +(1 / rate).toFixed(6),
    })),
  });
});

/**
 * POST /api/payments/create-order
 * Create a Razorpay order for purchasing ECL tokens
 */
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency, walletAddress } = req.body;

    if (!amount || !currency || !walletAddress) {
      return res.status(400).json({ error: 'amount, currency, and walletAddress are required' });
    }

    const upperCurrency = currency.toUpperCase();
    if (!EXCHANGE_RATES[upperCurrency]) {
      return res.status(400).json({ error: `Unsupported currency: ${currency}` });
    }

    // Calculate ECL tokens (amount in smallest unit / 100 = amount in currency, then convert to USD)
    const amountInCurrency = amount; // amount in whole currency units
    const eclTokens = +(amountInCurrency / EXCHANGE_RATES[upperCurrency]).toFixed(2);

    // Razorpay expects amount in smallest currency unit (paise for INR, cents for USD)
    const razorpayAmount = Math.round(amountInCurrency * 100);

    const order = await getRazorpay().orders.create({
      amount: razorpayAmount,
      currency: upperCurrency,
      receipt: `ecl_${walletAddress.slice(0, 8)}_${Date.now()}`,
      notes: {
        walletAddress,
        eclTokens: eclTokens.toString(),
        platform: 'ECLIPSE.AI',
      },
    });

    console.log(`[Payments] Order created: ${order.id} | ${amountInCurrency} ${upperCurrency} → ${eclTokens} ECL for ${walletAddress}`);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        eclTokens,
      },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[Payments] Create order error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/payments/verify
 * Verify Razorpay payment and credit ECL tokens
 */
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, walletAddress, eclTokens } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !walletAddress || !eclTokens) {
      return res.status(400).json({ error: 'Missing required payment verification fields' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.warn('[Payments] ⚠️ Signature mismatch! Possible tampering.');
      return res.status(400).json({ error: 'Payment verification failed: Invalid signature' });
    }

    // Credit ECL tokens to the user's platform balance
    const user = getOrCreateUser(walletAddress);
    updateUserBalance(walletAddress, Number(eclTokens));

    const updatedUser = getOrCreateUser(walletAddress);

    console.log(`[Payments] ✅ Payment verified: ${eclTokens} ECL credited to ${walletAddress} | Payment: ${razorpay_payment_id}`);

    res.json({
      success: true,
      message: `${eclTokens} ECL tokens credited to your account!`,
      newBalance: updatedUser.balance,
      paymentId: razorpay_payment_id,
    });
  } catch (err) {
    console.error('[Payments] Verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/payments/cashout
 * Model owner requests a cashout of ECL tokens
 */
router.post('/cashout', async (req, res) => {
  try {
    const { walletAddress, eclAmount, currency, method, payoutInfo } = req.body;

    if (!walletAddress || !eclAmount || eclAmount <= 0) {
      return res.status(400).json({ error: 'walletAddress and a positive eclAmount are required' });
    }

    const user = getOrCreateUser(walletAddress);
    if (user.balance < eclAmount) {
      return res.status(400).json({
        error: `Insufficient balance. You have ${user.balance.toFixed(2)} ECL but requested ${eclAmount} ECL.`,
      });
    }

    const selectedCurrency = (currency || 'USD').toUpperCase();
    const rate = EXCHANGE_RATES[selectedCurrency] || 1;
    const localAmount = +(eclAmount * rate).toFixed(2); // 1 ECL = 1 USD, then convert

    const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Deduct from balance
    updateUserBalance(walletAddress, -eclAmount);

    // Record withdrawal
    createWithdrawal({
      id: withdrawalId,
      walletAddress,
      amount: eclAmount,
      currency: selectedCurrency,
      localAmount,
      method: method || 'bank_transfer',
      payoutInfo: payoutInfo || '',
    });

    const updatedUser = getOrCreateUser(walletAddress);

    console.log(`[Cashout] 💸 ${eclAmount} ECL → ${localAmount} ${selectedCurrency} | ${walletAddress} | ID: ${withdrawalId}`);

    res.json({
      success: true,
      withdrawal: {
        id: withdrawalId,
        eclAmount,
        localAmount,
        currency: selectedCurrency,
        method: method || 'bank_transfer',
        status: 'pending',
      },
      newBalance: updatedUser.balance,
      message: `Withdrawal of ${eclAmount} ECL (${localAmount} ${selectedCurrency}) submitted! Processing in 1-3 business days.`,
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
