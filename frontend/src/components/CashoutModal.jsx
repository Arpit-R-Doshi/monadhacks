import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../App.jsx';

export default function CashoutModal({ isOpen, onClose, onSuccess }) {
  const { wallet, API_URL, refreshBalance } = useContext(AppContext);
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [processing, setProcessing] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [lastTx, setLastTx] = useState(null);

  useEffect(() => {
    if (isOpen && wallet) {
      setRecipientAddress(wallet);
      fetchEarnings();
      fetchWithdrawals();
      setLastTx(null);
    }
  }, [isOpen, wallet]);

  const fetchEarnings = async () => {
    if (!wallet) return;
    setLoadingEarnings(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/owner-earnings/${wallet}`);
      const data = await res.json();
      if (data.success && data.earnings) {
        setEarnings(data.earnings);
      }
    } catch (err) {
      console.error('[CashoutModal] Error fetching earnings:', err);
    }
    setLoadingEarnings(false);
  };

  const fetchWithdrawals = async () => {
    if (!wallet) return;
    try {
      const res = await fetch(`${API_URL}/api/payments/withdrawals/${wallet}`);
      const data = await res.json();
      if (data.success) {
        setWithdrawals(data.withdrawals || []);
      }
    } catch (err) {
      console.error('[CashoutModal] Error fetching withdrawals:', err);
    }
  };

  const availableBalance = earnings ? earnings.withdrawableAmount : 0;

  const handleCashout = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return toast.error('Please enter a valid positive MON amount');
    }
    if (numAmount > availableBalance) {
      return toast.error(`Insufficient earnings. You have ${availableBalance.toFixed(4)} MON available.`);
    }

    const targetAddress = (recipientAddress || wallet).trim();
    if (!targetAddress.startsWith('0x') || targetAddress.length !== 42) {
      return toast.error('Please enter a valid 42-character 0x Monad wallet address');
    }

    setProcessing(true);
    setLastTx(null);

    const toastId = toast.loading(`Submitting ${numAmount} MON on-chain cashout to Monad Testnet...`);

    try {
      const res = await fetch(`${API_URL}/api/payments/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: wallet,
          amount: numAmount,
          recipientAddress: targetAddress,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Success! Transferred ${numAmount} MON on Monad Testnet`, { id: toastId });
        setLastTx({
          hash: data.txHash,
          explorerUrl: data.explorerUrl,
          amount: numAmount,
          recipient: targetAddress,
        });
        setAmount('');
        if (data.summary) {
          setEarnings(data.summary);
        } else {
          fetchEarnings();
        }
        fetchWithdrawals();
        refreshBalance();
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Monad cashout failed', { id: toastId });
      }
    } catch (err) {
      toast.error('Cashout network error: ' + err.message, { id: toastId });
    }
    setProcessing(false);
  };

  const formatShortAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handlePreset = (pct) => {
    if (!availableBalance || availableBalance <= 0) return;
    const val = (availableBalance * pct).toFixed(4);
    setAmount(parseFloat(val).toString());
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '1rem',
    }}>
      <div className="card" style={{
        width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: '2rem',
        background: 'rgba(15, 15, 26, 0.96)', border: '1px solid rgba(139, 92, 246, 0.25)',
        boxShadow: '0 25px 60px -15px rgba(124, 58, 237, 0.3)',
        borderRadius: '16px',
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                Cashout Model Earnings
              </h3>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Direct on-chain MON token payout to your Monad wallet on Monad Testnet.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = '#fff'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
          >
            x
          </button>
        </div>

        {/* Network Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.65rem 1rem', borderRadius: '10px', marginBottom: '1.25rem',
          background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.25)',
          fontSize: '0.78rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c4b5fd', fontWeight: 600 }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6',
              boxShadow: '0 0 8px #8b5cf6', display: 'inline-block'
            }}></span>
            Monad Testnet (Chain ID 10143)
          </div>
          <span style={{ color: '#a78bfa', fontSize: '0.74rem' }}>Native Token: <strong>MON</strong></span>
        </div>

        {/* Earnings Stats Cards */}
        <div style={{
          padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem',
          background: 'radial-gradient(ellipse at top left, rgba(139,92,246,0.15), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600 }}>
              Available To Cashout
            </span>
            {loadingEarnings && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Refreshing...</span>}
          </div>

          <div style={{
            fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            lineHeight: 1.1, marginBottom: '0.8rem',
          }}>
            {availableBalance.toFixed(4)} <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>MON</span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
            paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: '0.76rem', color: 'var(--text-muted)',
          }}>
            <div>
              <div>Total Model Earnings:</div>
              <div style={{ color: '#e2e8f0', fontWeight: 600, marginTop: '0.15rem' }}>
                {earnings?.totalEarnings?.toFixed(4) || '0.0000'} MON
              </div>
            </div>
            <div>
              <div>Already Cashed Out:</div>
              <div style={{ color: '#e2e8f0', fontWeight: 600, marginTop: '0.15rem' }}>
                {earnings?.totalWithdrawn?.toFixed(4) || '0.0000'} MON
              </div>
            </div>
          </div>
        </div>

        {/* Success Alert with Explorer link if transaction succeeded */}
        {lastTx && (
          <div style={{
            padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem',
            background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700, fontSize: '0.88rem' }}>
              On-Chain Transfer Confirmed!
            </div>
            <p style={{ margin: '0.35rem 0 0.6rem 0', fontSize: '0.78rem', color: '#d1fae5' }}>
              Sent <strong>{lastTx.amount} MON</strong> directly to <code>{formatShortAddress(lastTx.recipient)}</code>
            </p>
            {lastTx.explorerUrl && (
              <a
                href={lastTx.explorerUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  fontSize: '0.75rem', fontWeight: 600, color: '#6ee7b7',
                  textDecoration: 'none', background: 'rgba(16,185,129,0.15)',
                  padding: '0.35rem 0.65rem', borderRadius: '6px',
                }}
              >
                View on Monad Explorer ↗
              </a>
            )}
          </div>
        )}

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Amount Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Amount to Cashout (MON)
              </label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => handlePreset(0.25)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px',
                    color: '#c4b5fd', fontSize: '0.7rem', padding: '0.15rem 0.4rem', cursor: 'pointer',
                  }}
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(0.5)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px',
                    color: '#c4b5fd', fontSize: '0.7rem', padding: '0.15rem 0.4rem', cursor: 'pointer',
                  }}
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(1.0)}
                  style={{
                    background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)', borderRadius: '4px',
                    color: '#ddd6fe', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', cursor: 'pointer',
                  }}
                >
                  MAX
                </button>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="any"
                min="0"
                max={availableBalance}
                className="form-input"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: '100%', fontSize: '1.1rem', fontWeight: 600,
                  paddingRight: '4.5rem',
                }}
              />
              <span style={{
                position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa', pointerEvents: 'none',
              }}>
                MON
              </span>
            </div>
          </div>

          {/* Recipient Monad Wallet Address */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Recipient Monad Wallet Address
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              style={{ width: '100%', fontSize: '0.88rem', fontFamily: 'monospace' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Defaults to your connected owner wallet ({formatShortAddress(wallet)}).
            </div>
          </div>

          {/* Cashout Action Button */}
          <button
            className="btn btn-primary btn-lg"
            style={{
              width: '100%', marginTop: '0.5rem', fontSize: '1.05rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.9rem',
            }}
            onClick={handleCashout}
            disabled={processing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance}
          >
            {processing ? (
              <>
                <div className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                <span>Sending on Monad Testnet...</span>
              </>
            ) : (
              <>
                <span>Withdraw {amount ? `${amount} MON` : 'MON'} to Monad Wallet</span>
              </>
            )}
          </button>
        </div>

        {/* Withdrawal History */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Recent Monad Cashouts
          </h4>

          {withdrawals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              No cashouts yet. Earn MON tokens from your AI models to withdraw!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto' }}>
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.65rem 0.85rem', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '0.8rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff' }}>
                      {w.amount} MON
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      To {formatShortAddress(w.recipient_address || w.wallet_address)} • {new Date(w.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px',
                      background: w.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: w.status === 'completed' ? '#34d399' : '#fbbf24',
                      textTransform: 'capitalize',
                    }}>
                      {w.status}
                    </span>
                    {w.tx_hash && !w.tx_hash.startsWith('0x_') ? (
                      <a
                        href={`https://testnet.monadexplorer.com/tx/${w.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: '#a78bfa', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600,
                          padding: '0.2rem 0.4rem', borderRadius: '4px', background: 'rgba(139,92,246,0.15)',
                        }}
                      >
                        Explorer ↗
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <p style={{
          fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center',
          marginTop: '1.25rem', marginBottom: 0,
        }}>
          Monad Testnet instant settlement. Gas fees are sponsored by the ECLIPSE protocol.
        </p>
      </div>
    </div>
  );
}
