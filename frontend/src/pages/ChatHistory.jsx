import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../App.jsx';

export default function ChatHistory() {
  const { wallet, API_URL } = useContext(AppContext);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (wallet) {
      fetchHistory();
    } else {
      setLoading(false);
    }
  }, [wallet]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/history/${wallet}`);
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations);
        if (data.conversations.length > 0) {
          setActiveConv(data.conversations[0].modelId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
    setLoading(false);
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

  const getModelIcon = (name) => {
    if (!name) return '🤖';
    if (name.toLowerCase().includes('gemma')) return '💎';
    if (name.toLowerCase().includes('llama')) return '🦙';
    return '🤖';
  };

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

  const activeConvData = filteredConvs.find(c => c.modelId === activeConv);

  if (!wallet) {
    return (
      <div className="history-page">
        <div className="empty-state" style={{ padding: '6rem 2rem' }}>
          <div className="icon">🔐</div>
          <h3>Connect your wallet</h3>
          <p>Your chat history will appear here once you connect your wallet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h1>Chat History</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            All your previous conversations across AI models
          </p>
        </div>
        <div className="search-bar" style={{ minWidth: '280px' }}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="empty-state" style={{ padding: '4rem' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem' }}>Loading your conversations...</p>
        </div>
      ) : filteredConvs.length === 0 ? (
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
                key={conv.modelId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`history-conv-item ${activeConv === conv.modelId ? 'active' : ''}`}
                onClick={() => setActiveConv(conv.modelId)}
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
                    <span>{formatDate(conv.messages[0]?.createdAt)}</span>
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
                              <div className="meta" style={{ marginTop: '0.5rem' }}>
                                {msg.inputTokens > 0 && <span>📥 {msg.inputTokens} in</span>}
                                {msg.outputTokens > 0 && <span>📤 {msg.outputTokens} out</span>}
                                {msg.durationMs > 0 && <span>⏱️ {(msg.durationMs / 1000).toFixed(1)}s</span>}
                                {msg.txHash && (
                                  <a
                                    href={`https://www.oklink.com/amoy/tx/${msg.txHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: 'var(--accent-secondary)' }}
                                  >
                                    ⛓️ View on chain
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
                <div className="icon">👈</div>
                <p>Select a conversation</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
