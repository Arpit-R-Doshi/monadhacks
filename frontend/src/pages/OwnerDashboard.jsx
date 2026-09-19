import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppContext } from '../App.jsx';
import CashoutModal from '../components/CashoutModal.jsx';

export default function OwnerDashboard() {
  const { wallet, balance, API_URL } = useContext(AppContext);
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [health, setHealth] = useState(null);
  const [subStats, setSubStats] = useState({ subscribers: [], tokens: [] });
  const [loading, setLoading] = useState(true);
  const [sharedModels, setSharedModels] = useState([]);

  // Modal state
  const [shareModal, setShareModal] = useState(null); // model object or null
  const [shareCoOwners, setShareCoOwners] = useState([]);
  const [transferModal, setTransferModal] = useState(null);
  const [transferAddress, setTransferAddress] = useState('');
  const [showCashout, setShowCashout] = useState(false);

  useEffect(() => {
    if (wallet) {
      fetchMyModels();
      fetchHealth();
      fetchSubStats();
      fetchSharedModels();
    } else {
      setLoading(false);
    }
  }, [wallet]);

  const fetchSharedModels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/models/shared/${wallet}`);
      const data = await res.json();
      if (data.success) setSharedModels(data.models);
    } catch (err) { console.error('Shared models error:', err); }
  };

  const fetchMyModels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/models`);
      const data = await res.json();
      // Filter to only models owned by this wallet
      const myModels = (data.models || []).filter(
        m => m.owner_address?.toLowerCase() === wallet?.toLowerCase()
      );
      setModels(myModels);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
    setLoading(false);
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/health`);
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error('Health error:', err);
    }
  };

  const fetchSubStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/owner/${wallet}`);
      const data = await res.json();
      if (data.success) {
        setSubStats(data.stats);
      }
    } catch (err) {
      console.error('Sub stats error:', err);
    }
  };

  const getModelIcon = (name) => {
    if (name?.toLowerCase().includes('gemma')) return '💎';
    if (name?.toLowerCase().includes('llama')) return '🦙';
    return '🤖';
  };

  const totalEarnings = models.reduce((sum, m) => sum + (m.total_uses * m.price_per_use), 0);
  const totalUses = models.reduce((sum, m) => sum + (m.total_uses || 0), 0);
  const totalSubs = subStats.subscribers.reduce((sum, s) => sum + s.count, 0);

  if (!wallet) {
    return (
      <div className="owner-dashboard">
        <div className="empty-state" style={{ paddingTop: '6rem' }}>
          <div className="icon">🔒</div>
          <h3>Connect your wallet</h3>
          <p>Connect your wallet to manage your AI models</p>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-dashboard">
      <div className="owner-header">
        <div>
          <h1>Owner Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage your AI models and track earnings
          </p>
        </div>
        <Link to="/owner/upload" className="btn btn-primary">🚀 Upload New Model</Link>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <motion.div className="card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="stat-icon" style={{ background: 'rgba(108,43,217,0.15)', color: '#a78bfa' }}>🤖</div>
          <div className="stat-value">{models.length}</div>
          <div className="stat-label">Your Models</div>
        </motion.div>
        
        <motion.div className="card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="stat-icon" style={{ background: 'rgba(33,150,243,0.15)', color: '#64b5f6' }}>👥</div>
          <div className="stat-value">{totalSubs}</div>
          <div className="stat-label">Active Subscribers</div>
        </motion.div>

        <motion.div className="card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>💰</div>
          <div className="stat-value">{totalEarnings.toFixed(1)}</div>
          <div className="stat-label">Total Earnings (ECL)</div>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: '0.75rem', width: '100%' }}
            onClick={() => setShowCashout(true)}
          >
            💸 Cashout
          </button>
        </motion.div>

        <motion.div className="card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="stat-icon" style={{ background: 'rgba(33,150,243,0.15)', color: '#64b5f6' }}>📊</div>
          <div className="stat-value">{totalUses}</div>
          <div className="stat-label">Total Inferences</div>
        </motion.div>

        <motion.div className="card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="stat-icon" style={{ background: 'rgba(255,171,64,0.15)', color: '#ffab40' }}>⚡</div>
          <div className="stat-value">{health?.services?.compute?.healthy ? 'Online' : 'Sim'}</div>
          <div className="stat-label">Compute Node</div>
        </motion.div>
      </div>

      {/* Platform Status */}
      {health && (
        <motion.div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>🏥 Platform Status</h3>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`status-badge ${health.services?.database?.connected ? 'completed' : 'failed'}`}>●</span>
              Database
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`status-badge ${health.services?.blockchain?.connected ? 'completed' : 'pending'}`}>●</span>
              Blockchain
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`status-badge ${health.services?.ipfs?.connected ? 'completed' : 'pending'}`}>●</span>
              IPFS
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`status-badge ${health.services?.compute?.healthy ? 'completed' : 'pending'}`}>●</span>
              Compute
            </div>
          </div>
        </motion.div>
      )}

      {/* Your Models */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700 }}>Your Models</h3>

        {loading ? (
          <div className="empty-state" style={{ padding: '3rem' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : models.length === 0 ? (
          <div className="card empty-state" style={{ padding: '3rem' }}>
            <div className="icon">📦</div>
            <h3>No models yet</h3>
            <p>Upload your first AI model to start earning ECL tokens!</p>
            <Link to="/owner/upload" className="btn btn-primary" style={{ marginTop: '1rem' }}>🚀 Upload Model</Link>
          </div>
        ) : (
          <div className="models-grid">
            {models.map((model, i) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="card model-card" style={{ cursor: 'default' }}>
                  <div className="model-header">
                    <div className="model-avatar">{getModelIcon(model.name)}</div>
                    <div>
                      <div className="model-name">{model.name}</div>
                      <div className="model-category">{model.category}</div>
                    </div>
                    <span className={`status-badge ${model.is_active ? 'completed' : 'failed'}`} style={{ marginLeft: 'auto' }}>
                      {model.is_active ? '● Active' : '● Paused'}
                    </span>
                  </div>

                  <p className="model-description">{model.description}</p>

                  <div className="model-stats">
                    <div className="model-stat-item">
                      <span>👥</span>
                      <span className="value">{subStats.subscribers.find(s => s.model_id === model.id)?.count || 0}</span> subs
                    </div>
                    <div className="model-stat-item">
                      <span>🔥</span>
                      <span className="value">{subStats.tokens.find(s => s.model_id === model.id)?.total_burnt || 0}</span> burnt
                    </div>
                    <div className="model-stat-item">
                      <span>⚡</span>
                      <span className="value">{model.rate_limit}</span> req/min
                    </div>
                  </div>

                  <div className="model-footer">
                    <div className="model-price">
                      <span className="amount">{model.subscription_price}</span>
                      <span className="unit">ECL / mo</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={async () => {
                          // Fetch existing co-owners
                          try {
                            const res = await fetch(`${API_URL}/api/models/${model.id}/co-owners`);
                            const data = await res.json();
                            setShareCoOwners((data.coOwners || []).map(c => ({ address: c.wallet_address, sharePercent: c.share_percent })));
                          } catch { setShareCoOwners([]); }
                          setShareModal(model);
                        }}
                        style={{
                          background: 'rgba(33,150,243,0.1)', color: '#64b5f6', border: '1px solid rgba(33,150,243,0.3)',
                          padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
                        }}
                      >
                        Share
                      </button>
                      <button
                        onClick={() => { setTransferModal(model); setTransferAddress(''); }}
                        style={{
                          background: 'rgba(255,171,64,0.1)', color: '#ffab40', border: '1px solid rgba(255,171,64,0.3)',
                          padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
                        }}
                      >
                        Transfer
                      </button>
                      <button 
                        onClick={async () => {
                          const subsCount = subStats.subscribers.find(s => s.model_id === model.id)?.count || 0;
                          if (subsCount > 0) {
                            alert(`Cannot remove: The model still has ${subsCount} active subscribers. Wait for their subscriptions to expire.`);
                            return;
                          }
                          if (!confirm(`Are you sure you want to remove ${model.name}?`)) return;
                          
                          try {
                            const res = await fetch(`${API_URL}/api/models/${model.id}`, {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ownerAddress: wallet })
                            });
                            const data = await res.json();
                            if (data.success) {
                               fetchMyModels();
                            } else {
                               alert(data.error);
                            }
                          } catch (err) {
                            alert('Network error removing model.');
                          }
                        }}
                        style={{
                          background: 'rgba(244,67,54,0.1)', color: '#ef5350', border: '1px solid rgba(244,67,54,0.3)',
                          padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
                        }}
                      >
                        Remove
                      </button>
                      <Link to={`/model/${model.id}`} className="btn btn-primary btn-sm">View Chat →</Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Shared With Me Section */}
      {sharedModels.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700 }}>🤝 Shared With Me</h3>
          <div className="models-grid">
            {sharedModels.map((model, i) => (
              <motion.div key={model.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="card model-card" style={{ cursor: 'default', borderLeft: '3px solid #64b5f6' }}>
                  <div className="model-header">
                    <div className="model-avatar">{getModelIcon(model.name)}</div>
                    <div>
                      <div className="model-name">{model.name}</div>
                      <div className="model-category">{model.category}</div>
                    </div>
                    <span className="status-badge completed" style={{ marginLeft: 'auto' }}>Co-Owner ({model.share_percent}%)</span>
                  </div>
                  <p className="model-description">{model.description}</p>
                  <div className="model-footer">
                    <div className="model-price">
                      <span className="amount">{model.subscription_price}</span>
                      <span className="unit">ECL / mo</span>
                    </div>
                    <Link to={`/model/${model.id}`} className="btn btn-primary btn-sm">View Chat →</Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── SHARE MODAL ─── */}
      {shareModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '520px', maxHeight: '80vh', overflow: 'auto', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>👥 Share "{shareModal.name}"</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Add wallet addresses and set their revenue share percentage.</p>

            {shareCoOwners.map((co, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <input
                  className="form-input"
                  placeholder="0x... wallet address"
                  value={co.address}
                  onChange={(e) => {
                    const u = [...shareCoOwners]; u[idx].address = e.target.value; setShareCoOwners(u);
                  }}
                  style={{ flex: 3 }}
                />
                <input
                  className="form-input"
                  type="number" min="1" max="100"
                  value={co.sharePercent}
                  onChange={(e) => {
                    const u = [...shareCoOwners]; u[idx].sharePercent = Number(e.target.value); setShareCoOwners(u);
                  }}
                  style={{ flex: 1, textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>%</span>
                <button type="button" onClick={() => setShareCoOwners(prev => prev.filter((_, i) => i !== idx))}
                  style={{ background: 'rgba(244,67,54,0.1)', color: '#ef5350', border: '1px solid rgba(244,67,54,0.3)', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
              </div>
            ))}

            <button type="button" onClick={() => setShareCoOwners(prev => [...prev, { address: '', sharePercent: 10 }])}
              style={{ background: 'rgba(33,150,243,0.15)', color: '#64b5f6', border: '1px solid rgba(33,150,243,0.3)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', marginBottom: '1rem' }}>
              + Add Co-Owner
            </button>

            {shareCoOwners.length > 0 && (
              <div style={{ fontSize: '0.8rem', color: shareCoOwners.reduce((s, c) => s + c.sharePercent, 0) > 100 ? '#ef5350' : '#059669', marginBottom: '1rem' }}>
                Total co-owner share: {shareCoOwners.reduce((s, c) => s + c.sharePercent, 0)}% — Your share: {100 - shareCoOwners.reduce((s, c) => s + c.sharePercent, 0)}%
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => {
                const valid = shareCoOwners.filter(c => c.address && c.sharePercent > 0);
                const total = valid.reduce((s, c) => s + c.sharePercent, 0);
                if (total > 100) { alert('Total share exceeds 100%'); return; }
                try {
                  const res = await fetch(`${API_URL}/api/models/${shareModal.id}/share`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ownerAddress: wallet, coOwners: valid })
                  });
                  const data = await res.json();
                  if (data.success) { alert('Co-owners updated!'); setShareModal(null); }
                  else alert(data.error);
                } catch (err) { alert('Error: ' + err.message); }
              }}>Save Co-Owners</button>
              <button className="btn" style={{ flex: 1, background: 'var(--bg-highlight)', border: '1px solid var(--border-color)' }} onClick={() => setShareModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TRANSFER MODAL ─── */}
      {transferModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '480px', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>🔄 Transfer "{transferModal.name}"</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Transfer full primary ownership to another wallet. This action is irreversible.</p>
            <input
              className="form-input"
              placeholder="New owner wallet address (0x...)"
              value={transferAddress}
              onChange={(e) => setTransferAddress(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn" style={{ flex: 1, background: '#ef5350', color: '#fff', border: 'none' }} onClick={async () => {
                if (!transferAddress || !transferAddress.startsWith('0x')) { alert('Enter a valid wallet address'); return; }
                if (!confirm(`Transfer ${transferModal.name} to ${transferAddress}? This cannot be undone.`)) return;
                try {
                  const res = await fetch(`${API_URL}/api/models/${transferModal.id}/transfer`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentOwner: wallet, newOwner: transferAddress })
                  });
                  const data = await res.json();
                  if (data.success) { alert('Ownership transferred!'); setTransferModal(null); fetchMyModels(); fetchSharedModels(); }
                  else alert(data.error);
                } catch (err) { alert('Error: ' + err.message); }
              }}>Transfer Ownership</button>
              <button className="btn" style={{ flex: 1, background: 'var(--bg-highlight)', border: '1px solid var(--border-color)' }} onClick={() => setTransferModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <CashoutModal isOpen={showCashout} onClose={() => setShowCashout(false)} />
    </div>
  );
}
