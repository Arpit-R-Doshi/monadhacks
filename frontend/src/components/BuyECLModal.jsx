import { useState, useContext } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../App.jsx';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 84.0 },
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rate: 3.67 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rate: 1.34 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 149.0 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rate: 1.53 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 1.36 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rate: 4.97 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', rate: 4.72 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', rate: 35.0 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', rate: 1320.0 },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', rate: 56.0 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', rate: 15700.0 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', rate: 18.5 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', rate: 3.75 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', rate: 7.82 },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', rate: 0.88 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rate: 7.25 },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', rate: 110.0 },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', rate: 310.0 },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', rate: 133.0 },
];

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

export default function BuyECLModal({ isOpen, onClose }) {
  const { wallet, refreshBalance, API_URL } = useContext(AppContext);
  const [currency, setCurrency] = useState('INR');
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const eclTokens = amount ? +(Number(amount) / selectedCurrency.rate).toFixed(2) : 0;

  const handleQuickAmount = (usdValue) => {
    const localAmount = Math.round(usdValue * selectedCurrency.rate);
    setAmount(localAmount.toString());
  };

  const handlePayment = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!wallet) {
      toast.error('Connect your wallet first');
      return;
    }

    setProcessing(true);
    try {
      // 1. Create order on backend
      const orderRes = await fetch(`${API_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          currency: currency,
          walletAddress: wallet,
        }),
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        toast.error(orderData.error || 'Failed to create order');
        setProcessing(false);
        return;
      }

      // 2. Open Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Eclipse.AI',
        description: `Purchase ${orderData.order.eclTokens} ECL Tokens`,
        order_id: orderData.order.id,
        handler: async function (response) {
          // 3. Verify payment on backend
          try {
            const verifyRes = await fetch(`${API_URL}/api/payments/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                walletAddress: wallet,
                eclTokens: orderData.order.eclTokens,
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              toast.success(`🎉 ${orderData.order.eclTokens} ECL tokens credited!`);
              refreshBalance();
              onClose();
            } else {
              toast.error(verifyData.error || 'Verification failed');
            }
          } catch (err) {
            toast.error('Payment verification failed: ' + err.message);
          }
        },
        prefill: {
          name: 'Eclipse.AI User',
        },
        theme: {
          color: '#7c3aed',
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
    setProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div className="card" style={{
        width: '480px', maxHeight: '85vh', overflow: 'auto', padding: '2rem',
        background: 'rgba(15, 15, 25, 0.95)', border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>💰 Buy ECL Tokens</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer',
            color: 'var(--text-muted)', lineHeight: 1,
          }}>✕</button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          1 USD = 1 ECL Token. Select your currency and amount below.
        </p>

        {/* Currency Selector */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
            Currency
          </label>
          <select
            className="form-select"
            value={currency}
            onChange={(e) => { setCurrency(e.target.value); setAmount(''); }}
            style={{ fontSize: '0.9rem' }}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Amount Buttons */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
            Quick Select (USD equivalent)
          </label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {QUICK_AMOUNTS.map(usd => (
              <button
                key={usd}
                type="button"
                onClick={() => handleQuickAmount(usd)}
                className="nav-action-btn"
                style={{
                  padding: '0.4rem 0.85rem', fontSize: '0.8rem',
                  background: eclTokens === usd ? 'var(--accent-primary)' : undefined,
                  color: eclTokens === usd ? 'white' : undefined,
                }}
              >
                ${usd} → {usd} ECL
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
            Amount ({selectedCurrency.symbol} {selectedCurrency.code})
          </label>
          <input
            className="form-input"
            type="number"
            min="1"
            placeholder={`Enter amount in ${selectedCurrency.code}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ fontSize: '1rem' }}
          />
        </div>

        {/* Conversion Preview */}
        {amount && Number(amount) > 0 && (
          <div style={{
            padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>You will receive</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {eclTokens} ECL
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              {selectedCurrency.symbol}{Number(amount).toLocaleString()} {selectedCurrency.code} × {(1 / selectedCurrency.rate).toFixed(4)} = {eclTokens} ECL
            </div>
          </div>
        )}

        {/* Pay Button */}
        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          onClick={handlePayment}
          disabled={processing || !amount || Number(amount) <= 0}
        >
          {processing ? 'Processing...' : `Pay ${selectedCurrency.symbol}${Number(amount || 0).toLocaleString()} ${selectedCurrency.code}`}
        </button>

        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem' }}>
          Powered by Razorpay Sandbox • Secure Payment Gateway
        </p>
      </div>
    </div>
  );
}
