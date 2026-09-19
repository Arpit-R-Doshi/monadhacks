import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppContext } from '../App.jsx';

export default function Marketplace() {
  const { API_URL } = useContext(AppContext);
  const [models, setModels] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/models`);
      const data = await res.json();
      setModels(data.models || []);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
    setLoading(false);
  };

  const filtered = models.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getModelInitials = (name) => {
    if (!name) return 'AI';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="marketplace">
      <div className="marketplace-header">
        <div>
          <h1>AI Model Marketplace</h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: `'Bebas Neue', display, sans-serif`, fontSize: '1.2rem', letterSpacing: '0.06em', marginTop: '0.25rem' }}>
            Browse and run encrypted AI models with transparent pricing
          </p>
        </div>
        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem' }}>Loading models...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon" style={{ background: 'var(--accent-primary)', color: 'white', borderRadius: '12px', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.2rem', fontWeight: 700 }}>AI</div>
          <h3>No models found</h3>
          <p>Try seeding demo models by visiting the backend /api/seed endpoint</p>
        </div>
      ) : (
        <div className="models-grid">
          {filtered.map((model, i) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={`/model/${model.id}`}>
                <div className="card model-card">
                  <div className="model-header">
                    <div className="model-avatar">{getModelInitials(model.name)}</div>
                    <div>
                      <div className="model-name">{model.name}</div>
                      <div className="model-category">{model.category || 'text-generation'}</div>
                    </div>
                  </div>

                  <p className="model-description">{model.description}</p>

                  <div className="model-stats">
                    <div className="model-stat-item">
                      <span className="value">{model.total_uses || 0}</span> uses
                    </div>
                    <div className="model-stat-item">
                      <span className="value">{model.rate_limit || 10}</span> req/min
                    </div>
                    <div className="model-stat-item">
                      <span className="value">AES-256</span>
                    </div>
                  </div>

                  <div className="model-footer">
                    <div className="model-price">
                      <span className="amount">{model.price_per_use || 1}</span>
                      <span className="unit">MON / use</span>
                    </div>
                    <span className="btn btn-primary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.875rem', letterSpacing: '0.06em' }}>Try Now</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
