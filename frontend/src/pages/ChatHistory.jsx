import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../App.jsx';

export default function ChatHistory() {
  const { wallet, API_URL } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('usage'); // 'usage' | 'purchases' | 'chats'
  const [summary, setSummary] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState('all');

  useEffect(() => {
    if (wallet) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [wallet]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSummary(),
        fetchPrompts(),
        fetchSubscriptions(),
        fetchConversations(),
      ]);
    } catch (err) {
      console.error('[History] Fetch error:', err);
    }
    setLoading(false);
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/api/history/summary/${wallet}`);
      const data = await res.json();
      if (data.success && data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Summary error:', err);
    }
  };

  const fetchPrompts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/history/prompts/${wallet}`);
      const data = await res.json();
      if (data.success) {
        setPrompts(data.prompts || []);
      }
    } catch (err) {
      console.error('Prompts error:', err);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/user/${wallet}`);
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.subscriptions || []);
      }
    } catch (err) {
      console.error('Subscriptions error:', err);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/history/${wallet}`);
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
        if (data.conversations?.length > 0 && !activeConv) {
          setActiveConv(data.conversations[0].sessionId);
        }
      }
    } catch (err) {
      console.error('Conversations error:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const formatShortAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getModelIcon = (name) => {
    if (!name) return '🤖';
    const n = name.toLowerCase();
    if (n.includes('gemma')) return '💎';
    if (n.includes('llama')) return '🦙';
    if (n.includes('mixtral')) return '🌪️';
    return '🤖';
  };

  // Filtered prompts
  const filteredPrompts = prompts.filter(p => {
    const matchesModel = selectedModel === 'all' || p.model_id === selectedModel;
    if (!matchesModel) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.prompt_text?.toLowerCase().includes(q) ||
      p.response_text?.toLowerCase().includes(q) ||
      p.model_name?.toLowerCase().includes(q) ||
      p.model_id?.toLowerCase().includes(q)
    );
  });

  // Filtered subscriptions
  const filteredSubscriptions = subscriptions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.model_name?.toLowerCase().includes(q) || s.model_id?.toLowerCase().includes(q);
  });

  // Filtered conversations
  const filteredConvs = conversations.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.modelName?.toLowerCase().includes(q) ||
      c.messages?.some(m =>
        m.userPrompt?.toLowerCase().includes(q) ||
        m.assistantResponse?.toLowerCase().includes(q)
      )
    );
  });

  const activeConvData = filteredConvs.find(c => c.sessionId === activeConv);

  // Distinct models for filtering
  const distinctModels = Array.from(new Set(prompts.map(p => p.model_id))).filter(Boolean);

  if (!wallet) {
    return (
      <div className="history-page">
        <div className="empty-state" style={{ padding: '6rem 2rem' }}>
          <div className="icon">🔒</div>
          <h3>Connect your wallet</h3>
          <p>Your usage records, token consumption, and purchase history will appear here once you connect your wallet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page" style={{ maxWidth: '1360px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Usage & Purchase History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.35rem' }}>
            Live on-chain records, token consumption, model subscriptions, and chat transcripts on Monad Testnet
          </p>
        </div>

        {/* Search */}
        <div className="search-bar" style={{ minWidth: '280px', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search prompts, models, responses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Aggregate Token Usage & Activity Bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div className="card stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Total Tokens Consumed
          </div>
          <div style={{
            fontSize: '1.9rem', fontWeight: 800, marginTop: '0.2rem',
            background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {(summary?.totalTokens || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            In: {(summary?.totalInputTokens || 0).toLocaleString()} | Out: {(summary?.totalOutputTokens || 0).toLocaleString()}
          </div>
        </div>

        <div className="card stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Total Inferences
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '0.2rem', color: '#fff' }}>
            {summary?.inferences || prompts.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.25rem' }}>
            ⚡ Avg Latency: {summary?.avgLatencyMs || 0} ms
          </div>
        </div>

        <div className="card stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Active Purchases
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '0.2rem', color: '#c4b5fd' }}>
            {subscriptions.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Spent: {summary?.totalMonSpent || 0} MON
          </div>
        </div>

        <div className="card stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Subscription Quota Usage
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: '0.2rem', color: '#f59e0b' }}>
            {summary?.totalAllocatedTokens > 0
              ? `${Math.round((summary.totalConsumedTokens / summary.totalAllocatedTokens) * 100)}%`
              : '0%'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {(summary?.totalConsumedTokens || 0).toLocaleString()} / {(summary?.totalAllocatedTokens || 0).toLocaleString()} tokens
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '1.75rem', paddingBottom: '0.5rem',
      }}>
        <button
          onClick={() => setActiveTab('usage')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700,
            color: activeTab === 'usage' ? '#fff' : 'var(--text-muted)',
            background: activeTab === 'usage' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
            borderBottom: activeTab === 'usage' ? '2px solid #8b5cf6' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          <span>📊</span> Usage & Token History
          <span style={{
            fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '10px',
            background: 'rgba(255,255,255,0.08)', color: '#c4b5fd',
          }}>
            {prompts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700,
            color: activeTab === 'purchases' ? '#fff' : 'var(--text-muted)',
            background: activeTab === 'purchases' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
            borderBottom: activeTab === 'purchases' ? '2px solid #8b5cf6' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          <span>💳</span> Purchase History
          <span style={{
            fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '10px',
            background: 'rgba(255,255,255,0.08)', color: '#c4b5fd',
          }}>
            {subscriptions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('chats')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700,
            color: activeTab === 'chats' ? '#fff' : 'var(--text-muted)',
            background: activeTab === 'chats' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
            borderBottom: activeTab === 'chats' ? '2px solid #8b5cf6' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          <span>💬</span> Chat Sessions
          <span style={{
            fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '10px',
            background: 'rgba(255,255,255,0.08)', color: '#c4b5fd',
          }}>
            {conversations.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="empty-state" style={{ padding: '4rem' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading history records...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: USAGE & TOKEN HISTORY */}
          {activeTab === 'usage' && (
            <div>
              {/* Model Filter Bar */}
              {distinctModels.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Filter by model:</span>
                  <button
                    onClick={() => setSelectedModel('all')}
                    style={{
                      padding: '0.35rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer',
                      background: selectedModel === 'all' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
                      color: selectedModel === 'all' ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    All Models ({prompts.length})
                  </button>
                  {distinctModels.map(mId => (
                    <button
                      key={mId}
                      onClick={() => setSelectedModel(mId)}
                      style={{
                        padding: '0.35rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer',
                        background: selectedModel === mId ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
                        color: selectedModel === mId ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {mId}
                    </button>
                  ))}
                </div>
              )}

              {filteredPrompts.length === 0 ? (
                <div className="card empty-state" style={{ padding: '3rem' }}>
                  <div className="icon">📝</div>
                  <h3>No inference history found</h3>
                  <p>You haven't run any prompts or API requests yet.</p>
                  <Link to="/marketplace" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    Try a Model in Marketplace
                  </Link>
                </div>
              ) : (
                <div className="card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
                  <table className="tx-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Prompt & Response Snippet</th>
                        <th>Prompt In</th>
                        <th>Completion Out</th>
                        <th>Total Tokens</th>
                        <th>Latency</th>
                        <th>Status</th>
                        <th>Time</th>
                        <th>Proof & Explorer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPrompts.map((p) => {
                        const totalTokens = (p.input_tokens || 0) + (p.output_tokens || 0);
                        return (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                              <span style={{ marginRight: '0.4rem' }}>{getModelIcon(p.model_name || p.model_id)}</span>
                              {p.model_name || p.model_id}
                            </td>
                            <td style={{ maxWidth: '280px' }}>
                              <div style={{ fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.prompt_text}
                              </div>
                              {p.response_text && (
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.2rem' }}>
                                  ↳ {p.response_text}
                                </div>
                              )}
                            </td>
                            <td>
                              <span style={{
                                padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                                background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', fontWeight: 600,
                              }}>
                                {p.input_tokens || 0}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                                background: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe', fontWeight: 600,
                              }}>
                                {p.output_tokens || 0}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.78rem',
                                background: 'rgba(139, 92, 246, 0.25)', color: '#fff', fontWeight: 700,
                              }}>
                                {totalTokens}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {p.duration_ms ? `${(p.duration_ms / 1000).toFixed(2)}s` : '—'}
                            </td>
                            <td>
                              <span className={`status-badge ${p.status}`} style={{ fontSize: '0.72rem' }}>
                                {p.status === 'completed' ? '✓ Completed' : p.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {new Date(p.created_at).toLocaleString()}
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                {p.explorerUrl ? (
                                  <a
                                    href={p.explorerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      fontSize: '0.72rem', color: '#a78bfa', textDecoration: 'none',
                                      padding: '0.2rem 0.45rem', borderRadius: '4px', background: 'rgba(139,92,246,0.15)',
                                    }}
                                  >
                                    Monad ↗
                                  </a>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>On-Chain</span>
                                )}
                                {p.encrypted_prompt_cid && (
                                  <a
                                    href={`https://gateway.pinata.cloud/ipfs/${p.encrypted_prompt_cid}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      fontSize: '0.72rem', color: '#38bdf8', textDecoration: 'none',
                                      padding: '0.2rem 0.45rem', borderRadius: '4px', background: 'rgba(56,189,248,0.15)',
                                    }}
                                    title="IPFS CID"
                                  >
                                    IPFS ↗
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PURCHASE & SUBSCRIPTION HISTORY */}
          {activeTab === 'purchases' && (
            <div>
              {filteredSubscriptions.length === 0 ? (
                <div className="card empty-state" style={{ padding: '3.5rem' }}>
                  <div className="icon">💳</div>
                  <h3>No purchase records found</h3>
                  <p>You haven't purchased any monthly model subscriptions yet.</p>
                  <Link to="/marketplace" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    Browse Models & Subscribe
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                  {filteredSubscriptions.map((sub) => {
                    const percent = Math.min(100, Math.round(((sub.tokens_used || 0) / (sub.tokens_allocated || 50000)) * 100));
                    const isExpired = new Date(sub.expires_at) < new Date();
                    return (
                      <div
                        key={sub.id}
                        className="card"
                        style={{
                          padding: '1.5rem', position: 'relative',
                          border: isExpired ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(139,92,246,0.3)',
                          background: 'rgba(15, 15, 26, 0.7)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '1.6rem' }}>{getModelIcon(sub.model_name)}</span>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                                {sub.model_name || sub.model_id}
                              </h3>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {sub.category || 'Text Generation'}
                              </span>
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px',
                            background: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isExpired ? '#f87171' : '#34d399',
                          }}>
                            {isExpired ? 'Expired' : 'Active Subscription'}
                          </span>
                        </div>

                        {/* Token Consumption Quota Progress */}
                        <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Token Consumption</span>
                            <span style={{ fontWeight: 700, color: '#fff' }}>
                              {(sub.tokens_used || 0).toLocaleString()} / {(sub.tokens_allocated || 50000).toLocaleString()} ({percent}%)
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${percent}%`,
                              background: percent > 85 ? '#ef4444' : 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                              transition: 'width 0.4s ease',
                            }} />
                          </div>
                        </div>

                        {/* Purchase Meta */}
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
                          padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)',
                          fontSize: '0.75rem', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.04)',
                        }}>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Price Paid:</div>
                            <div style={{ fontWeight: 700, color: '#c4b5fd', marginTop: '0.15rem' }}>
                              {sub.subscription_price !== undefined ? `${sub.subscription_price} MON` : 'Native MON'}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Expires:</div>
                            <div style={{ fontWeight: 600, color: '#e2e8f0', marginTop: '0.15rem' }}>
                              {new Date(sub.expires_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Purchased On:</div>
                            <div style={{ fontWeight: 600, color: '#e2e8f0', marginTop: '0.15rem' }}>
                              {new Date(sub.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>Proof On-Chain:</div>
                            <div style={{ marginTop: '0.15rem' }}>
                              {sub.explorerUrl ? (
                                <a
                                  href={sub.explorerUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}
                                >
                                  Monad Explorer ↗
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Monad Testnet</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action CTA */}
                        <Link
                          to={`/model/${sub.model_id}`}
                          className="btn btn-primary"
                          style={{ width: '100%', textAlign: 'center', display: 'block', fontSize: '0.9rem', padding: '0.65rem' }}
                        >
                          Launch Model & Run Inference →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHAT CONVERSATIONS */}
          {activeTab === 'chats' && (
            <div>
              {filteredConvs.length === 0 ? (
                <div className="empty-state" style={{ padding: '4rem' }}>
                  <div className="icon">💬</div>
                  <h3>{search ? 'No results found' : 'No conversations yet'}</h3>
                  <p>{search ? 'Try a different search term.' : 'Start chatting with AI models in the marketplace!'}</p>
                  {!search && <Link to="/marketplace" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Models</Link>}
                </div>
              ) : (
                <div className="history-layout">
                  {/* Sidebar with conversation list */}
                  <div className="history-sidebar">
                    {filteredConvs.map((conv, i) => (
                      <motion.div
                        key={conv.sessionId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`history-conv-item ${activeConv === conv.sessionId ? 'active' : ''}`}
                        onClick={() => setActiveConv(conv.sessionId)}
                      >
                        <div className="conv-icon">{getModelIcon(conv.modelName)}</div>
                        <div className="conv-meta">
                          <div className="conv-name">{conv.modelName}</div>
                          <div className="conv-preview">
                            {conv.messages[0]?.userPrompt?.slice(0, 50)}
                            {conv.messages[0]?.userPrompt?.length > 50 ? '...' : ''}
                          </div>
                          <div className="conv-stats">
                            <span>{conv.messages.length} msg{conv.messages.length !== 1 ? 's' : ''}</span>
                            <span>{formatDate(conv.messages[conv.messages.length - 1]?.createdAt)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Chat thread panel */}
                  <div className="history-thread">
                    {activeConvData ? (
                      <>
                        <div className="history-thread-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="model-avatar" style={{ width: 40, height: 40, fontSize: '1.2rem' }}>
                              {getModelIcon(activeConvData.modelName)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{activeConvData.modelName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                {activeConvData.modelCategory || 'text-generation'}
                              </div>
                            </div>
                          </div>
                          <Link
                            to={`/model/${activeConvData.modelId}`}
                            className="btn btn-primary btn-sm"
                          >
                            Continue Chat →
                          </Link>
                        </div>

                        <div className="history-messages">
                          {activeConvData.messages.map((msg, i) => (
                            <motion.div
                              key={msg.id || i}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                            >
                              {/* User message */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                                <div className="message user" style={{ maxWidth: '70%' }}>
                                  {msg.userPrompt}
                                  <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '0.25rem', textAlign: 'right' }}>
                                    {formatDate(msg.createdAt)}
                                  </div>
                                </div>
                              </div>

                              {/* Assistant response */}
                              {msg.assistantResponse && (
                                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.25rem' }}>
                                  <div className="message assistant" style={{ maxWidth: '70%' }}>
                                    {msg.assistantResponse}
                                    {(msg.inputTokens || msg.outputTokens || msg.durationMs) && (
                                      <div className="meta" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {msg.inputTokens > 0 && (
                                          <span style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                            In: {msg.inputTokens}
                                          </span>
                                        )}
                                        {msg.outputTokens > 0 && (
                                          <span style={{ background: 'rgba(168,85,247,0.15)', color: '#d8b4fe', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                            Out: {msg.outputTokens}
                                          </span>
                                        )}
                                        <span style={{ fontWeight: 700, color: '#c4b5fd' }}>
                                          Total: {(msg.inputTokens || 0) + (msg.outputTokens || 0)} tokens
                                        </span>
                                        {msg.durationMs > 0 && <span>• {(msg.durationMs / 1000).toFixed(2)}s</span>}
                                        {msg.txHash && (
                                          <a
                                            href={`https://testnet.monadexplorer.com/tx/${msg.txHash}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ color: '#836ef9', textDecoration: 'none', marginLeft: 'auto' }}
                                            title="View transaction on Monad Explorer"
                                          >
                                            Explorer ↗
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="empty-state" style={{ height: '100%' }}>
                        <div className="icon">💬</div>
                        <p>Select a conversation</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
