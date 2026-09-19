import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppContext } from '../App.jsx';

export default function OwnerDashboard() {
  const { wallet, balance, API_URL } = useContext(AppContext);
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [health, setHealth] = useState(null);
  const [subStats, setSubStats] = useState({ subscribers: [], tokens: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wallet) {
      fetchMyModels();
      fetchHealth();
      fetchSubStats();
    } else {
      setLoading(false);
    }
  }, [wallet]);

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
          <div className="stat-icon" style={{ background: 'rgba(0,230,118,0.15)', color: '#00e676' }}>💰</div>
          <div className="stat-value">{totalEarnings.toFixed(1)}</div>
          <div className="stat-label">Total Earnings (SYN)</div>
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
            <p>Upload your first AI model to start earning SYN tokens!</p>
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
                      <span className="unit">SYN / mo</span>
                    </div>
                    <Link to={`/model/${model.id}`} className="btn btn-primary btn-sm">View Chat →</Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
