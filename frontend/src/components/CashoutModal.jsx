import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../App.jsx';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 84.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rate: 3.67 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rate: 1.34 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 149.0 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rate: 1.53 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 1.36 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rate: 4.97 },
];

const METHODS = [
  { id: 'bank_transfer', label: '🏦 Bank Transfer', desc: 'Direct to your bank account' },
  { id: 'upi', label: '📱 UPI', desc: 'Instant via UPI ID' },
  { id: 'paypal', label: '🌐 PayPal', desc: 'Sent to PayPal email' },
  { id: 'crypto', label: '₿ Crypto (USDT)', desc: 'To your USDT wallet address' },
];

export default function CashoutModal({ isOpen, onClose, onSuccess }) {
  const { wallet, balance, API_URL, refreshBalance } = useContext(AppContext);
  const [eclAmount, setEclAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [method, setMethod] = useState('bank_transfer');
  const [payoutInfo, setPayoutInfo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const localAmount = eclAmount ? +(Number(eclAmount) * selectedCurrency.rate).toFixed(2) : 0;

  useEffect(() => {
    if (isOpen && wallet) fetchWithdrawals();
  }, [isOpen, wallet]);

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch(`${API_URL}/api/payments/withdrawals/${wallet}`);
      const data = await res.json();
      if (data.success) setWithdrawals(data.withdrawals);
    } catch (err) { console.error(err); }
  };

  const handleCashout = async () => {
    const amount = Number(eclAmount);
    if (!amount || amount <= 0) return toast.error('Enter a valid amount');
    if (amount > balance) return toast.error(`Insufficient balance (${balance.toFixed(2)} ECL)`);
    if (amount < 1) return toast.error('Minimum cashout is 1 ECL');
    if (!payoutInfo.trim()) return toast.error('Enter your payout details');

    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: wallet,
          eclAmount: amount,
          currency,
          method,
          payoutInfo: payoutInfo.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        refreshBalance();
        setEclAmount('');
        setPayoutInfo('');
        fetchWithdrawals();
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Cashout failed');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
    setProcessing(false);
  };

  const getPayoutPlaceholder = () => {
    switch (method) {
      case 'bank_transfer': return 'Bank name, Account number, IFSC/SWIFT...';
      case 'upi': return 'your-upi@bank';
      case 'paypal': return 'your-email@paypal.com';
      case 'crypto': return '0x... or TRC20 USDT address';
      default: return 'Enter payout details';
    }
  };

  const statusColor = (s) => {
    if (s === 'completed') return '#059669';
    if (s === 'processing') return '#f59e0b';
    if (s === 'failed') return '#ef4444';
    return '#8896a6';
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div className="card" style={{
        width: '520px', maxHeight: '88vh', overflow: 'auto', padding: '2rem',
        background: 'rgba(15, 15, 25, 0.95)', border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>💸 Cashout Earnings</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer',
            color: 'var(--text-muted)', lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Available balance */}
        <div style={{
          padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Available Balance</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {balance.toFixed(2)} ECL
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>≈ ${balance.toFixed(2)} USD</div>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
            Amount (ECL)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="form-input"
              type="number"
              min="1"
              max={balance}
              placeholder="Enter ECL amount"
              value={eclAmount}
              onChange={(e) => setEclAmount(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="nav-action-btn"
              onClick={() => setEclAmount(Math.floor(balance).toString())}
              style={{ whiteSpace: 'nowrap' }}
            >
              Max
            </button>
          </div>
        </div>

        {/* Currency */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
            Receive In
          </label>
          <select
            className="form-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
            ))}
          </select>
        </div>

        {/* Conversion preview */}
        {eclAmount && Number(eclAmount) > 0 && (
          <div style={{
            padding: '0.75rem', borderRadius: '10px', marginBottom: '1rem',
            background: 'rgba(52,211,153,0.1)', textAlign: 'center',
            fontSize: '0.88rem', fontWeight: 600, color: '#34d399',
          }}>
            {eclAmount} ECL → {selectedCurrency.symbol}{localAmount.toLocaleString()} {selectedCurrency.code}
          </div>
        )}

        {/* Payout Method */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
            Payout Method
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {METHODS.map(m => (
              <button
                key={m.id}
                className="nav-action-btn"
                onClick={() => setMethod(m.id)}
                style={{
                  padding: '0.6rem', textAlign: 'left', fontSize: '0.78rem',
                  background: method === m.id ? 'var(--accent-primary)' : undefined,
                  color: method === m.id ? 'white' : undefined,
                  border: method === m.id ? '1px solid rgba(124,58,237,0.4)' : undefined,
                }}
              >
                <div style={{ fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: '0.68rem', opacity: 0.8, marginTop: '0.15rem' }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Payout Details */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
            Payout Details
          </label>
          <input
            className="form-input"
            placeholder={getPayoutPlaceholder()}
            value={payoutInfo}
            onChange={(e) => setPayoutInfo(e.target.value)}
          />
        </div>

        {/* Cashout Button */}
        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          onClick={handleCashout}
          disabled={processing || !eclAmount || Number(eclAmount) <= 0}
        >
          {processing ? 'Processing...' : `Withdraw ${eclAmount || 0} ECL`}
        </button>

        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem' }}>
          Withdrawals are processed within 1-3 business days
        </p>

        {/* Withdrawal History */}
        {withdrawals.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Withdrawal History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {withdrawals.slice(0, 5).map(w => (
                <div key={w.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0.8rem', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '0.8rem',
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{w.amount} ECL → {w.local_amount} {w.currency}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {w.method.replace('_', ' ')} • {new Date(w.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 600, color: statusColor(w.status),
                    textTransform: 'capitalize',
                  }}>
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
