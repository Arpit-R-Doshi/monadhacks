import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useWriteContract, usePublicClient } from 'wagmi';
import { parseEther, parseGwei, parseAbi } from 'viem';
import { AppContext } from '../App.jsx';

export default function ModelDetail() {
  const { id } = useParams();
  const { wallet, balance, API_URL, refreshBalance, appConfig } = useContext(AppContext);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [model, setModel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [sending, setSending] = useState(false);
  
  // Subscription state
  const [subscribed, setSubscribed] = useState(false);
  const [subDetails, setSubDetails] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchModel();
    setMessages([]);  // clear on model switch
    setHistoryLoaded(false);
    setSessionId(crypto.randomUUID()); // new session for each model
  }, [id]);

  // Load chat history and check subscription when wallet is connected
  useEffect(() => {
    if (wallet && id) {
      loadHistory();
      checkSubscription();
    }
  }, [wallet, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchModel = async () => {
    try {
      const res = await fetch(`${API_URL}/api/models/${id}`);
      const data = await res.json();
      setModel(data.model);
    } catch (err) {
      console.error('Failed to fetch model:', err);
    }
  };

  const checkSubscription = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/check/${wallet}/${id}`);
      const data = await res.json();
      if (data.success && data.subscribed) {
        setSubscribed(true);
        setSubDetails(data.subscription);
      } else {
        setSubscribed(false);
        setSubDetails(null);
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
    }
  };

  const handleSubscribe = async () => {
    if (!wallet || !appConfig) {
      toast.error('Connect your wallet and wait for config to load.');
      return;
    }
    
    setSubscribing(true);
    try {
      const price = model.subscription_price.toString();
      const priceWei = parseEther(price);
      const tokenAbi = parseAbi(appConfig.abis.SYN3RGYToken);
      const paymentAbi = parseAbi(appConfig.abis.PaymentManager);
      const gasOverrides = {
        maxPriorityFeePerGas: parseGwei('40'),
        maxFeePerGas: parseGwei('50'),
      };
      
      // Pre-flight: check on-chain SYN balance
      toast.loading('Checking on-chain balance...', { id: 'sub-tx' });
      const onChainBal = await publicClient.readContract({
        address: appConfig.addresses.SYN3RGYToken,
        abi: tokenAbi,
        functionName: 'balanceOf',
        args: [wallet],
      });
      
      if (onChainBal < priceWei) {
        toast.error('Insufficient on-chain ECL tokens. Purchase more from the marketplace!', { id: 'sub-tx' });
        setSubscribing(false);
        return;
      }
      
      // Step 1: Approve ECL tokens for PaymentManager
      toast.loading('Step 1/3: Approve ECL tokens in MetaMask...', { id: 'sub-tx' });
      const approveHash = await writeContractAsync({
        address: appConfig.addresses.SYN3RGYToken,
        abi: tokenAbi,
        functionName: 'approve',
        args: [appConfig.addresses.PaymentManager, priceWei],
        ...gasOverrides,
      });
      
      toast.loading('Step 1/3: Waiting for approval confirmation...', { id: 'sub-tx' });
      const approveReceipt = await publicClient.waitForTransactionReceipt({ 
        hash: approveHash,
        confirmations: 1,
        timeout: 120_000,
      });
      
      if (approveReceipt.status === 'reverted') {
        toast.error('Approval transaction reverted on-chain.', { id: 'sub-tx' });
        setSubscribing(false);
        return;
      }
      
      // Buffer for Polygon RPC load-balancers
      await new Promise(r => setTimeout(r, 3000));
      
      // Step 2: Subscribe on PaymentManager
      toast.loading('Step 2/3: Confirm subscription in MetaMask...', { id: 'sub-tx' });
      const subHash = await writeContractAsync({
        address: appConfig.addresses.PaymentManager,
        abi: paymentAbi,
        functionName: 'subscribe',
        args: [id, model.owner_address, 50000n, priceWei, 2592000n],
        ...gasOverrides,
      });
      
      toast.loading('Step 2/3: Waiting for subscription confirmation...', { id: 'sub-tx' });
      const subReceipt = await publicClient.waitForTransactionReceipt({ 
        hash: subHash,
        confirmations: 1,
        timeout: 120_000,
      });
      
      if (subReceipt.status === 'reverted') {
        toast.error('Subscription transaction reverted on-chain.', { id: 'sub-tx' });
        setSubscribing(false);
        return;
      }

      // Step 3: Synchronize SQLite read-index
      toast.loading('Step 3/3: Syncing local index...', { id: 'sub-tx' });
      const syncRes = await fetch(`${API_URL}/api/subscriptions/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: wallet, modelId: id }),
      });
      const data = await syncRes.json();
      
      if (data.success) {
        toast.success('🎉 Subscribed on-chain successfully!', { id: 'sub-tx' });
        setSubscribed(true);
        refreshBalance();
        checkSubscription();
      } else {
        toast.error(data.error || 'Sync failed', { id: 'sub-tx' });
      }
    } catch (err) {
      const msg = err?.shortMessage || err?.cause?.shortMessage || err?.message || 'Transaction error';
      toast.error(msg, { id: 'sub-tx' });
      console.error('[Web3 Subscribe Error]', err);
    }
    setSubscribing(false);
  };

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/history/${wallet}/${id}`);
      const data = await res.json();
      if (data.success && data.messages.length > 0) {
        // Mark historical messages so we can show a divider
        const historical = data.messages.map(m => ({ ...m, historical: true }));
        setMessages(historical);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
    setHistoryLoaded(true);
  };

  const sendPrompt = async () => {
    if (!prompt.trim() || sending) return;

    if (!wallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (balance < (model?.price_per_use || 1)) {
      toast.error('Insufficient ECL balance. Buy more tokens!');
      return;
    }

    const userMsg = { role: 'user', content: prompt, image: imageBase64, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    
    const payloadImage = imageBase64;
    
    setPrompt('');
    setImageFile(null);
    setImageBase64('');
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: id,
          prompt: prompt,
          userAddress: wallet,
          image: payloadImage,
          sessionId: sessionId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const assistantMsg = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          meta: data.metadata,
        };
        setMessages(prev => [...prev, assistantMsg]);
        refreshBalance();
        toast.success(`Inference complete! Cost: ${model.price_per_use} ECL`);
      } else {
        toast.error(data.error || 'Execution failed');
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error}`,
          timestamp: new Date(),
          error: true,
        }]);
      }
    } catch (err) {
      toast.error('Network error: ' + err.message);
    }

    setSending(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImageBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  };

  if (!model) {
    return (
      <div className="model-detail">
        <div className="empty-state">
          <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem' }}>Loading model...</p>
        </div>
      </div>
    );
  }

  const getModelIcon = (name) => {
    if (name?.toLowerCase().includes('gemma')) return '💎';
    if (name?.toLowerCase().includes('llama')) return '🦙';
    return '🤖';
  };

  return (
    <div className="model-detail">
      <Link to="/marketplace" className="back-link">← Back to Marketplace</Link>

      <motion.div
        className="model-detail-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="model-avatar" style={{ width: 64, height: 64, fontSize: '2rem' }}>
          {getModelIcon(model.name)}
        </div>
        <div className="model-detail-info">
          <h1>{model.name}</h1>
          <p className="description">{model.description}</p>

          <div className="detail-stats">
            <div className="detail-stat">
              <div className="label">Monthly Sub</div>
              <div className="value" style={{ color: '#a78bfa' }}>{model.subscription_price} ECL</div>
            </div>
            <div className="detail-stat">
              <div className="label">Pay Per Use</div>
              <div className="value" style={{ color: '#a78bfa' }}>{model.price_per_use} ECL</div>
            </div>
            <div className="detail-stat">
              <div className="label">Rate Limit</div>
              <div className="value">{model.rate_limit}/min</div>
            </div>
            <div className="detail-stat">
              <div className="label">Total Uses</div>
              <div className="value">{model.total_uses}</div>
            </div>
            <div className="detail-stat">
              <div className="label">Encryption</div>
              <div className="value" style={{ color: '#059669' }}>AES-256</div>
            </div>
            <div className="detail-stat">
              <div className="label">Storage</div>
              <div className="value">IPFS</div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="prompt-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="prompt-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <h3>💬 Run Inference</h3>
            <span className="status-badge completed">● Live</span>
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  setHistoryLoaded(true);
                  setSessionId(crypto.randomUUID());
                  setPrompt('');
                  setImageFile(null);
                  setImageBase64('');
                  toast.success('New chat started');
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: 'rgba(167,139,250,0.1)', color: '#a78bfa',
                  border: '1px solid rgba(167,139,250,0.3)', padding: '0.35rem 0.9rem',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(167,139,250,0.25)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(167,139,250,0.1)'; }}
              >
                ✨ New Chat
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {subDetails && (
               <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                 Tokens remaining: <span style={{ color: 'var(--text)', fontWeight: 'bold' }}>{subDetails.tokens_allocated - subDetails.tokens_used}</span> / {subDetails.tokens_allocated}
               </div>
            )}
            {wallet && <span className="balance-badge">💎 {balance.toFixed(1)} ECL</span>}
          </div>
        </div>

        <div className="prompt-messages">
          {messages.length === 0 && historyLoaded && (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="icon">💬</div>
              <h3>Start a conversation</h3>
              <p>Enter a prompt below to run inference on {model.name}</p>
            </div>
          )}
          {messages.length === 0 && !historyLoaded && wallet && (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
              <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading chat history...</p>
            </div>
          )}

          {/* Historical messages separator */}
          {messages.some(m => m.historical) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>📜 Previous conversation</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`} style={msg.error ? { borderColor: 'var(--error)' } : {}}>
              {msg.image && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <img src={msg.image} alt="Upload" style={{ maxWidth: '200px', borderRadius: '8px' }} />
                </div>
              )}
              {msg.content}
              {msg.meta && (
                <div className="meta">
                  {msg.meta.inputTokens > 0 && <span>📥 {msg.meta.inputTokens} in</span>}
                  {msg.meta.outputTokens > 0 && <span>📤 {msg.meta.outputTokens} out</span>}
                  {msg.meta.duration > 0 && <span>⏱️ {(msg.meta.duration / 1000).toFixed(1)}s</span>}
                  {msg.meta.promptCid && (
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${msg.meta.promptCid}`}
                      target="_blank"
                      rel="noreferrer"
                      title="View encrypted prompt on IPFS"
                      style={{ color: '#a78bfa', textDecoration: 'none' }}
                    >
                      📌 IPFS
                    </a>
                  )}
                  {msg.meta.txHash && !msg.meta.simulated && (
                    <a
                      href={`https://amoy.polygonscan.com/tx/${msg.meta.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      title="View transaction on Polygon Amoy Explorer"
                      style={{ color: '#34d399', textDecoration: 'none' }}
                    >
                      ⛓️ Polygonscan
                    </a>
                  )}
                  {msg.meta.txHash && msg.meta.simulated && (
                    <span title="Simulated on-chain (testnet tx omitted)" style={{ color: 'var(--text-muted)' }}>
                      🔵 Simulated
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="message assistant">
              <span className="loading-dots">Thinking</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {(!wallet || subscribed) ? (
          <div className="prompt-input-container" style={{ position: 'relative' }}>
            {imageBase64 && (
              <div className="image-preview" style={{ padding: '0.5rem', background: 'var(--bg-glass)', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img src={imageBase64} alt="Preview" style={{ height: '40px', borderRadius: '4px' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{imageFile?.name}</span>
                <button 
                  onClick={() => { setImageFile(null); setImageBase64(''); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}
                >✕</button>
              </div>
            )}
            <div className="prompt-input" style={{ borderRadius: imageBase64 ? '0 0 8px 8px' : '8px' }}>
                <button
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!wallet || sending}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer', padding: '0 0.5rem' }}
                  title="Attach Image"
                >
                  📸
                </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={wallet ? `Ask ${model.name} anything...` : 'Connect wallet to start...'}
                disabled={!wallet || sending}
                rows={1}
              />
              <button
                className="send-btn"
                onClick={sendPrompt}
                disabled={!wallet || !prompt.trim() || sending}
              >
                {sending ? '⏳' : '↑'}
              </button>
            </div>
          </div>
        ) : (
          <div className="subscription-prompt card" style={{ padding: '2rem', textAlign: 'center', marginTop: '1rem', border: '1px solid var(--accent-primary)', background: 'rgba(108, 43, 217, 0.05)' }}>
            <h3>Subscribe to {model.name}</h3>
            <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>You need an active subscription to run inference on this model. A subscription gives you 50,000 tokens for 30 days.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{model.subscription_price} ECL</span>
              <span style={{ color: 'var(--text-muted)' }}>/ month</span>
            </div>
            <button 
              className="btn btn-primary btn-lg" 
              onClick={handleSubscribe} 
              disabled={subscribing}
              style={{ width: '100%', maxWidth: '300px' }}
            >
              {subscribing ? 'Processing...' : 'Subscribe Now'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
