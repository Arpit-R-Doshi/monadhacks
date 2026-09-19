import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { AppContext } from '../App.jsx';

export default function UploadModel() {
  const { wallet, API_URL } = useContext(AppContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isRemote, setIsRemote] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'text-generation',
    ollamaModel: 'gemma:2b',
    subscriptionPrice: 10,
    rateLimit: 10,
    computeNodeUrl: '',
    inputModality: 'text',
  });

  const [files, setFiles] = useState({
    weightsFile: null,
    configFile: null,
  });

  const [coOwners, setCoOwners] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles.length > 0) {
      setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!wallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!form.name) {
      toast.error('Model name is required');
      return;
    }

    if (!isRemote && !form.ollamaModel) {
      toast.error('Ollama Base Model is required for local processing');
      return;
    }

    if (isRemote && !form.computeNodeUrl) {
      toast.error('Compute Node URL is required for custom model execution');
      return;
    }

    if (isRemote && (!files.weightsFile || !files.configFile)) {
      toast.error('PyTorch Weights (.pt) and Config (.json) are required for custom remote mode');
      return;
    }

    // Optional limitation: Enforce file extensions
    if (isRemote && files.weightsFile && !files.weightsFile.name.endsWith('.pt') && !files.weightsFile.name.endsWith('.bin')) {
      toast.error('Weights file must be a .pt or .bin PyTorch format');
      return;
    }
    if (isRemote && files.configFile && !files.configFile.name.endsWith('.json')) {
      toast.error('Config file must be a .json format');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('subscriptionPrice', form.subscriptionPrice);
      formData.append('rateLimit', form.rateLimit);
      formData.append('ownerAddress', wallet);
      formData.append('isRemote', isRemote.toString());
      formData.append('inputModality', form.inputModality);

      if (!isRemote) {
        formData.append('ollamaModel', form.ollamaModel);
      } else {
        formData.append('computeNodeUrl', form.computeNodeUrl);
        formData.append('weightsFile', files.weightsFile);
        formData.append('configFile', files.configFile);
      }

      // Append co-owners if any
      const validCoOwners = coOwners.filter(c => c.address && c.sharePercent > 0);
      if (validCoOwners.length > 0) {
        formData.append('coOwners', JSON.stringify(validCoOwners));
      }

      const res = await fetch(`${API_URL}/api/models/upload`, {
        method: 'POST',
        // Note: Do NOT set Content-Type header manually when using FormData and fetch. Browser sets it with boundary automatically.
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Model registered effectively ${isRemote ? '(Custom Mode)' : '(Base Mode)'}!`);
        navigate('/owner');
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
    setLoading(false);
  };

  if (!wallet) {
    return (
      <div className="upload-page">
        <div className="empty-state" style={{ paddingTop: '4rem' }}>
          <div className="icon">🔒</div>
          <h3>Connect your wallet to upload models</h3>
          <p style={{ marginBottom: '1.5rem' }}>You need a connected wallet to register model ownership</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1>Upload Model</h1>
        <p className="subtitle">Register your AI model on the decentralized marketplace</p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            type="button"
            className={`btn ${!isRemote ? 'btn-primary' : ''}`}
            onClick={() => setIsRemote(false)}
            style={{ flex: 1, background: !isRemote ? 'var(--accent-primary)' : 'var(--bg-highlight)', border: '1px solid var(--border-color)', color: !isRemote ? '#fff' : 'var(--text-secondary)' }}
          >
            Public Base Model (Ollama)
          </button>
          <button 
            type="button"
            className={`btn ${isRemote ? 'btn-primary' : ''}`}
            onClick={() => setIsRemote(true)}
            style={{ flex: 1, background: isRemote ? 'var(--accent-primary)' : 'var(--bg-highlight)', border: '1px solid var(--border-color)', color: isRemote ? '#fff' : 'var(--text-secondary)' }}
          >
            Custom PyTorch Model (Remote Peer)
          </button>
        </div>

        <form className="card upload-form" onSubmit={handleSubmit} encType="multipart/form-data">
          
          <div className="form-group">
            <label className="form-label">Model Name *</label>
            <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="e.g., My Custom Protocol" required />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" name="description" value={form.description} onChange={handleChange} placeholder="Describe what your model does..." />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Category</label>
              <select className="form-select" name="category" value={form.category} onChange={handleChange}>
                <option value="text-generation">Text Generation</option>
                <option value="code-generation">Code Generation</option>
                <option value="summarization">Summarization</option>
                <option value="translation">Translation</option>
                <option value="question-answering">Question Answering</option>
                <option value="vision">Computer Vision</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Input Modality</label>
              <select className="form-select" name="inputModality" value={form.inputModality} onChange={handleChange}>
                <option value="text">Text Only</option>
                <option value="image">Image (Vision)</option>
                <option value="both">Text & Image (Multimodal)</option>
              </select>
            </div>
          </div>

          {!isRemote ? (
            <div className="form-group" style={{ padding: '1rem', background: 'var(--bg-highlight)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
              <label className="form-label" style={{ color: 'var(--accent-primary)' }}>Select Ollama Base Engine *</label>
              <select className="form-select" name="ollamaModel" value={form.ollamaModel} onChange={handleChange}>
                <option value="gemma:2b">Gemma 2B</option>
                <option value="gemma:7b">Gemma 7B</option>
                <option value="llama3:8b">Llama 3 8B</option>
              </select>
            </div>
          ) : (
            <div style={{ padding: '1rem', background: 'rgba(108,43,217,0.05)', borderRadius: '8px', border: '1px dashed var(--accent-primary)', marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Remote Peer Network Configuration</h4>
              
              <div className="form-group">
                <label className="form-label">PyTorch Weights (.pt / .bin) *</label>
                <input type="file" name="weightsFile" onChange={handleFileChange} className="form-input" accept=".pt,.bin" style={{ padding: '0.4rem' }} required={isRemote} />
              </div>

              <div className="form-group">
                <label className="form-label">Model Config (.json) *</label>
                <input type="file" name="configFile" onChange={handleFileChange} className="form-input" accept=".json" style={{ padding: '0.4rem' }} required={isRemote} />
              </div>

              <div className="form-group">
                <label className="form-label">Compute Node URL *</label>
                <input className="form-input" name="computeNodeUrl" value={form.computeNodeUrl} onChange={handleChange} placeholder="e.g., https://my-friend-node.ngrok-free.app" required={isRemote} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>This is the Ngrok or endpoint URL where the Peer Worker script is running.</p>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group" style={{ width: '100%' }}>
              <label className="form-label">Subscription Rate (SYN/month)</label>
              <input className="form-input" type="number" name="subscriptionPrice" value={form.subscriptionPrice} onChange={handleChange} min="0" step="1" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Rate Limit (requests/minute)</label>
            <input className="form-input" type="number" name="rateLimit" value={form.rateLimit} onChange={handleChange} min="1" max="100" />
          </div>

          {/* ─── CO-OWNERSHIP SECTION ─── */}
          <div style={{ padding: '1rem', background: 'rgba(33,150,243,0.06)', borderRadius: '8px', border: '1px dashed rgba(33,150,243,0.3)', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, color: '#64b5f6', fontSize: '0.95rem' }}>👥 Co-Ownership & Revenue Sharing</h4>
              <button
                type="button"
                onClick={() => setCoOwners(prev => [...prev, { address: '', sharePercent: 10 }])}
                style={{ background: 'rgba(33,150,243,0.15)', color: '#64b5f6', border: '1px solid rgba(33,150,243,0.3)', padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
              >
                + Add Co-Owner
              </button>
            </div>

            {coOwners.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No co-owners added. You will retain 100% ownership.</p>
            )}

            {coOwners.map((co, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <input
                  className="form-input"
                  placeholder="0x... wallet address"
                  value={co.address}
                  onChange={(e) => {
                    const updated = [...coOwners];
                    updated[idx].address = e.target.value;
                    setCoOwners(updated);
                  }}
                  style={{ flex: 3 }}
                />
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  max="100"
                  value={co.sharePercent}
                  onChange={(e) => {
                    const updated = [...coOwners];
                    updated[idx].sharePercent = Number(e.target.value);
                    setCoOwners(updated);
                  }}
                  style={{ flex: 1, textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '15px' }}>%</span>
                <button
                  type="button"
                  onClick={() => setCoOwners(prev => prev.filter((_, i) => i !== idx))}
                  style={{ background: 'rgba(244,67,54,0.1)', color: '#ef5350', border: '1px solid rgba(244,67,54,0.3)', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  ✕
                </button>
              </div>
            ))}

            {coOwners.length > 0 && (
              <div style={{ fontSize: '0.8rem', color: coOwners.reduce((s, c) => s + c.sharePercent, 0) > 100 ? '#ef5350' : '#00e676', marginTop: '0.25rem' }}>
                Co-owner total: {coOwners.reduce((s, c) => s + c.sharePercent, 0)}% — Your share: {100 - coOwners.reduce((s, c) => s + c.sharePercent, 0)}%
              </div>
            )}
          </div>

          <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(0, 230, 118, 0.08)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>🛡️ Decentralization Info:</strong> Model parameters will be synced onto IPFS guaranteeing immutable persistence. Operations route through verifiable compute paths encrypted with AES-256 bound to <span style={{ fontFamily: 'monospace', color: '#00e676' }}>{wallet.slice(0, 10)}...</span>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: '1.5rem' }}>
            {loading ? 'Encrypting & Synching to IPFS...' : '🚀 Register Model on Blockchain'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
