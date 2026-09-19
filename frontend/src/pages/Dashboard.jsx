import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../App.jsx';

export default function Dashboard() {
  const { wallet, balance, API_URL } = useContext(AppContext);
  const [prompts, setPrompts] = useState([]);
  const [health, setHealth] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    if (wallet) {
      fetchHistory();
      fetchSubscriptions();
    }
    fetchHealth();
  }, [wallet]);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/user/${wallet}`);
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.subscriptions || []);
      }
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/execute/history/${wallet}`);
      const data = await res.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      console.error('History fetch error:', err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/health`);
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error('Health check error:', err);
    }
  };

  if (!wallet) {
    return (
      <div className="dashboard">
        <div className="empty-state" style={{ paddingTop: '6rem' }}>
          <div className="icon">🔒</div>
          <h3>Connect your wallet to view dashboard</h3>
          <p style={{ marginBottom: '1.5rem' }}>View your usage history, balance, and transaction records</p>
        </div>
      </div>
    );
  }

  const totalSpent = prompts.reduce((sum, p) => sum + (p.input_tokens + p.output_tokens) * 0.001, 0);
  const completedCount = prompts.filter(p => p.status === 'completed').length;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Your activity and usage overview</p>
      </div>

      <div className="dashboard-grid">
        <motion.div className="card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="stat-icon" style={{ background: 'rgba(108,43,217,0.15)', color: '#a78bfa' }}>💎</div>
          <div className="stat-value">{balance.toFixed(1)}</div>
          <div className="stat-label">SYN Balance</div>
        </motion.div>

        <motion.div className="card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="stat-icon" style={{ background: 'rgba(33,150,243,0.15)', color: '#64b5f6' }}>📊</div>
          <div className="stat-value">{prompts.length}</div>
          <div className="stat-label">Total Prompts</div>
        </motion.div>

        <motion.div className="card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="stat-icon" style={{ background: 'rgba(0,230,118,0.15)', color: '#00e676' }}>✅</div>
          <div className="stat-value">{completedCount}</div>
          <div className="stat-label">Successful</div>
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
              Blockchain {health.services?.blockchain?.connected ? '' : '(Sim)'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`status-badge ${health.services?.ipfs?.connected ? 'completed' : 'pending'}`}>●</span>
              IPFS {health.services?.ipfs?.mode === 'simulation' ? '(Sim)' : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`status-badge ${health.services?.compute?.healthy ? 'completed' : 'pending'}`}>●</span>
              Compute {health.services?.compute?.healthy ? '' : '(Sim)'}
            </div>
          </div>
        </motion.div>
      )}

      {/* Active Subscriptions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 700 }}>Your Active Subscriptions</h3>
        
        {subscriptions.length === 0 ? (
          <div className="card empty-state" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <div className="icon">🎫</div>
            <h3>No Active Subscriptions</h3>
            <p>You haven't subscribed to any AI models yet.</p>
          </div>
        ) : (
          <div className="models-grid" style={{ marginBottom: '2rem' }}>
            {subscriptions.map(sub => {
               const percent = Math.min(100, Math.round((sub.tokens_used / sub.tokens_allocated) * 100));
               return (
                  <div key={sub.id} className="card model-card" style={{ cursor: 'default' }}>
                    <div className="model-header">
                      <div>
                        <div className="model-name">{sub.model_name}</div>
                        <div className="model-category" style={{ fontSize: '0.7rem' }}>Expires: {new Date(sub.expires_at).toLocaleDateString()}</div>
                      </div>
                      <span className="status-badge completed" style={{ marginLeft: 'auto' }}>● Active</span>
                    </div>
                    
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                        <span>Tokens Used</span>
                        <span style={{ fontWeight: 'bold' }}>{sub.tokens_used} / {sub.tokens_allocated}</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-highlight)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${percent}%`, background: percent >= 90 ? 'var(--error)' : 'var(--accent-primary)', transition: 'width 0.3s ease' }}></div>
                      </div>
                    </div>
                  </div>
               );
            })}
          </div>
        )}
      </motion.div>

      {/* Transaction History */}
      <motion.div className="card" style={{ padding: '1.5rem' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>📜 Prompt History</h3>

        {prompts.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p>No prompts yet. Go to the marketplace and try a model!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Prompt</th>
                  <th>Tokens</th>
                  <th>Status</th>
                  <th>IPFS CID</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {prompts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.model_id?.split('-')[0]}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.prompt_text}
                    </td>
                    <td>{p.input_tokens + p.output_tokens}</td>
                    <td>
                      <span className={`status-badge ${p.status}`}>
                        {p.status === 'completed' ? '✓' : '⏳'} {p.status}
                      </span>
                    </td>
                    <td>
                      {p.encrypted_prompt_cid && (
                        <span className="tx-hash">{p.encrypted_prompt_cid.slice(0, 12)}...</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
