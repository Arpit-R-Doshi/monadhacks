import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { AppContext } from '../App.jsx';
import BuyECLModal from '../components/BuyECLModal.jsx';

export default function Dashboard() {
  const { wallet, balance, API_URL } = useContext(AppContext);
  const [prompts, setPrompts] = useState([]);
  const [health, setHealth] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [justCreatedKey, setJustCreatedKey] = useState(null);
  const [snippetTab, setSnippetTab] = useState('curl');
  const [selectedModel, setSelectedModel] = useState('gemma-2b-demo');
  const [models, setModels] = useState([]);
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    if (wallet) {
      fetchHistory();
      fetchSubscriptions();
      fetchApiKeys();
    }
    fetchHealth();
    fetchModels();
  }, [wallet]);

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/models`);
      const data = await res.json();
      setModels(data.models || []);
    } catch (err) { console.error(err); }
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch(`${API_URL}/api/keys/list/${wallet}`);
      const data = await res.json();
      if (data.success) setApiKeys(data.keys || []);
    } catch (err) { console.error('API keys fetch error:', err); }
  };

  const generateKey = async () => {
    if (!wallet) return;
    setGeneratingKey(true);
    try {
      const res = await fetch(`${API_URL}/api/keys/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: wallet, name: newKeyName || 'Default' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('API key generated! Copy it now — it won\'t be shown again.');
        setJustCreatedKey(data.key.apiKey);
        setNewKeyName('');
        fetchApiKeys();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Failed to generate API key');
    }
    setGeneratingKey(false);
  };

  const handleRevoke = async (keyId) => {
    try {
      const res = await fetch(`${API_URL}/api/keys/revoke/${keyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: wallet }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('API key revoked');
        fetchApiKeys();
      }
    } catch (err) {
      toast.error('Failed to revoke key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/user/${wallet}`);
      const data = await res.json();
      if (data.success) setSubscriptions(data.subscriptions || []);
    } catch (err) { console.error('Failed to fetch subscriptions:', err); }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/execute/history/${wallet}`);
      const data = await res.json();
      setPrompts(data.prompts || []);
    } catch (err) { console.error('History fetch error:', err); }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/health`);
      const data = await res.json();
      setHealth(data);
    } catch (err) { console.error('Health check error:', err); }
  };

  const apiKeyForSnippet = justCreatedKey || 'syn3_your_api_key_here';
  const baseUrl = window.location.origin.replace(':5173', ':3001');

  const snippets = {
    curl: `curl -X POST ${baseUrl}/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKeyForSnippet}" \\
  -d '{
    "model": "${selectedModel}",
    "messages": [
      {"role": "user", "content": "Explain quantum computing in simple terms"}
    ]
  }'`,

    python: `import requests

API_KEY = "${apiKeyForSnippet}"
BASE_URL = "${baseUrl}/api/v1"

response = requests.post(
    f"{BASE_URL}/chat/completions",
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    },
    json={
        "model": "${selectedModel}",
        "messages": [
            {"role": "user", "content": "Explain quantum computing in simple terms"}
        ]
    }
)

data = response.json()
print(data["choices"][0]["message"]["content"])
print(f"Tokens used: {data['usage']['total_tokens']}")
print(f"Remaining balance: {data['syn3rgy']['remaining_balance']} ECL")`,

    javascript: `const API_KEY = "${apiKeyForSnippet}";
const BASE_URL = "${baseUrl}/api/v1";

const response = await fetch(\`\${BASE_URL}/chat/completions\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": \`Bearer \${API_KEY}\`
  },
  body: JSON.stringify({
    model: "${selectedModel}",
    messages: [
      { role: "user", content: "Explain quantum computing in simple terms" }
    ]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
console.log("Tokens used:", data.usage.total_tokens);
console.log("Remaining balance:", data.syn3rgy.remaining_balance, "SYN");`,
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
          <div className="stat-label">ECL Balance</div>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: '0.75rem', width: '100%' }}
            onClick={() => setShowBuyModal(true)}
          >
            💰 Buy ECL
          </button>
        </motion.div>

        <motion.div className="card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="stat-icon" style={{ background: 'rgba(33,150,243,0.15)', color: '#64b5f6' }}>📊</div>
          <div className="stat-value">{prompts.length}</div>
          <div className="stat-label">Total Prompts</div>
        </motion.div>

        <motion.div className="card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>✅</div>
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

      {/* API Keys Section */}
      <motion.div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🔑 API Keys
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>Pay-as-you-go · {apiKeys.filter(k => k.is_active).length}/5 active</span>
        </h3>

        {/* Generate Key */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Key name (e.g. production, dev)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            style={{
              flex: 1, minWidth: '200px', padding: '0.6rem 1rem',
              background: 'var(--bg-highlight)', border: '1px solid var(--border-color)',
              borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem',
            }}
          />
          <button
            onClick={generateKey}
            disabled={generatingKey}
            className="btn-primary"
            style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            {generatingKey ? 'Generating...' : '+ Generate Key'}
          </button>
        </div>

        {/* Just Created Key Banner */}
        {justCreatedKey && (
          <div style={{
            background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.3)',
            borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.85rem' }}>⚠️ Copy your API key now — it won't be shown again!</span>
              <button onClick={() => setJustCreatedKey(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '8px',
              fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all',
            }}>
              <span style={{ flex: 1 }}>{justCreatedKey}</span>
              <button
                onClick={() => copyToClipboard(justCreatedKey)}
                style={{
                  background: 'var(--accent-primary)', color: '#fff', border: 'none',
                  padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap',
                }}
              >
                📋 Copy
              </button>
            </div>
          </div>
        )}

        {/* Keys Table */}
        {apiKeys.length > 0 && (
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Requests</th>
                  <th>Tokens Used</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(k => (
                  <tr key={k.id}>
                    <td style={{ fontWeight: 600 }}>{k.name}</td>
                    <td><code style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>{k.key_prefix}</code></td>
                    <td>{k.total_requests}</td>
                    <td>{k.total_tokens_used.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${k.is_active ? 'completed' : 'failed'}`}>
                        {k.is_active ? '● Active' : '● Revoked'}
                      </span>
                    </td>
                    <td>
                      {k.is_active && (
                        <button
                          onClick={() => handleRevoke(k.id)}
                          style={{
                            background: 'rgba(244,67,54,0.1)', color: '#ef5350', border: '1px solid rgba(244,67,54,0.3)',
                            padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem',
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Code Snippets */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>📄 Quick Start Code</h4>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                background: 'var(--bg-highlight)', border: '1px solid var(--border-color)',
                borderRadius: '6px', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', fontSize: '0.8rem',
              }}
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
              {models.length === 0 && <option value="gemma-2b-demo">Gemma 2B</option>}
            </select>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {['curl', 'python', 'javascript'].map(tab => (
              <button
                key={tab}
                onClick={() => setSnippetTab(tab)}
                style={{
                  padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                  background: snippetTab === tab ? 'var(--accent-primary)' : 'var(--bg-highlight)',
                  color: snippetTab === tab ? '#fff' : 'var(--text-secondary)',
                  border: snippetTab === tab ? 'none' : '1px solid var(--border-color)',
                  textTransform: 'capitalize', fontWeight: snippetTab === tab ? 600 : 400,
                }}
              >
                {tab === 'curl' ? 'cURL' : tab === 'python' ? 'Python' : 'JavaScript'}
              </button>
            ))}
          </div>

          {/* Code Block */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => copyToClipboard(snippets[snippetTab])}
              style={{
                position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 2,
                background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)',
                padding: '0.3rem 0.7rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem',
              }}
            >
              📋 Copy
            </button>
            <pre style={{
              background: '#0d0d1a', border: '1px solid var(--border-color)', borderRadius: '10px',
              padding: '1.25rem', overflowX: 'auto', fontSize: '0.8rem', lineHeight: 1.6,
              color: '#c5c5d2', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}>
              <code>{snippets[snippetTab]}</code>
            </pre>
          </div>
        </div>
      </motion.div>

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

      <BuyECLModal isOpen={showBuyModal} onClose={() => setShowBuyModal(false)} />
    </div>
  );
}
