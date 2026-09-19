import { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../App.jsx';
import CashoutModal from '../components/CashoutModal.jsx';

const LOCAL_MODELS = [
  { id: 'phi3-mini', name: 'Phi-3 Mini', params: '3.8B', memory: '2.2GB', rate: 0.05 },
  { id: 'gemma-2b', name: 'Gemma 2B', params: '2B', memory: '1.4GB', rate: 0.04 },
  { id: 'llama-3-8b', name: 'Llama 3 8B', params: '8B', memory: '4.8GB', rate: 0.10 },
  { id: 'tinyllama', name: 'TinyLlama', params: '1.1B', memory: '640MB', rate: 0.01 },
  { id: 'qwen2-0.5b', name: 'Qwen2 0.5B', params: '0.5B', memory: '400MB', rate: 0.01 },
];

export default function WorkerDashboard() {
  const { wallet, balance } = useContext(AppContext);
  const [showCashout, setShowCashout] = useState(false);
  const [optedIn, setOptedIn] = useState({ 'phi3-mini': true, 'llama-3-8b': true });

  const toggleOptIn = (modelId) => {
    setOptedIn(prev => ({ ...prev, [modelId]: !prev[modelId] }));
  };

  if (!wallet) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Worker Not Found</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Please connect a wallet to view the worker dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Worker Dashboard</h1>
          <p className="page-subtitle">Manage your local compute node and earnings.</p>
        </div>
      </div>

      <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <motion.div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.02) 100%)', border: '1px solid rgba(16,185,129,0.2)' }} whileHover={{ y: -5 }}>
          <h3>Total Worker Earnings</h3>
          <div className="stat-value" style={{ color: '#10b981' }}>{typeof balance === 'number' ? balance.toFixed(3) : '0.000'} <span style={{ fontSize: '1rem' }}>MON</span></div>
          <button onClick={() => setShowCashout(true)} className="btn" style={{ background: '#10b981', color: 'white', border: 'none', width: '100%', marginTop: '1rem', padding: '0.6rem' }}>
            Cash Out to Wallet
          </button>
        </motion.div>

        <motion.div className="stat-card" whileHover={{ y: -5 }}>
          <h3>Node Status</h3>
          <div className="stat-value" style={{ color: '#0ea5e9' }}>ONLINE</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Connected to <strong>ollama-local</strong> endpoint
          </p>
        </motion.div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.4rem' }}>Available Models for Compute</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem' }}>
          Toggle the models your local Ollama instance is configured to process. You will earn the listed MON rate for every successful inference.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {LOCAL_MODELS.map(model => (
            <div key={model.id} style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: `1px solid ${optedIn[model.id] ? '#10b981' : 'rgba(255,255,255,0.1)'}`, 
              borderRadius: '8px', 
              padding: '1.25rem',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{model.name}</h3>
                  <div style={{ 
                    background: optedIn[model.id] ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', 
                    color: optedIn[model.id] ? '#10b981' : 'var(--text-muted)', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: 'bold' 
                  }}>
                    {optedIn[model.id] ? 'ACTIVE' : 'INACTIVE'}
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', fontFamily: 'var(--font-body)', textTransform: 'none' }}>
                  Params: {model.params} | RAM: {model.memory}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#facc15' }}>
                  +{model.rate.toFixed(2)} MON / run
                </div>
                <button 
                  onClick={() => toggleOptIn(model.id)}
                  style={{
                    background: optedIn[model.id] ? 'transparent' : 'var(--accent-primary)',
                    color: optedIn[model.id] ? 'var(--text-secondary)' : '#fff',
                    border: optedIn[model.id] ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                >
                  {optedIn[model.id] ? 'Opt Out' : 'Opt In'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCashout && (
        <CashoutModal 
          isOpen={showCashout} 
          onClose={() => setShowCashout(false)} 
        />
      )}
    </div>
  );
}
