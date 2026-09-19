import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { AppContext } from '../App.jsx';

export default function UploadModel() {
  const { wallet, API_URL } = useContext(AppContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'text-generation',
    ollamaModel: 'gemma:2b',
    subscriptionPrice: 10,
    rateLimit: 10,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!wallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!form.name || !form.ollamaModel) {
      toast.error('Name and Ollama model are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/models/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ollamaModel: form.ollamaModel,
          ownerAddress: wallet,
          subscriptionPrice: Number(form.subscriptionPrice),
          rateLimit: Number(form.rateLimit),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Model registered successfully!');
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

        <form className="card upload-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Model Name *</label>
            <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="e.g., My Custom Gemma" required />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" name="description" value={form.description} onChange={handleChange} placeholder="Describe what your model does..." />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" name="category" value={form.category} onChange={handleChange}>
                <option value="text-generation">Text Generation</option>
                <option value="code-generation">Code Generation</option>
                <option value="summarization">Summarization</option>
                <option value="translation">Translation</option>
                <option value="question-answering">Question Answering</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ollama Model *</label>
              <select className="form-select" name="ollamaModel" value={form.ollamaModel} onChange={handleChange}>
                <option value="gemma:2b">Gemma 2B</option>
                <option value="gemma:7b">Gemma 7B</option>
                <option value="llama3:8b">Llama 3 8B</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ width: '100%' }}>
              <label className="form-label">Subscription Price (SYN/month)</label>
              <input className="form-input" type="number" name="subscriptionPrice" value={form.subscriptionPrice} onChange={handleChange} min="0" step="1" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Rate Limit (requests/minute)</label>
            <input className="form-input" type="number" name="rateLimit" value={form.rateLimit} onChange={handleChange} min="1" max="100" />
          </div>

          <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(108,43,217,0.08)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>🔐 Security:</strong> Your model metadata will be encrypted with AES-256 and stored on IPFS. The encryption key is stored securely on the platform. Ownership is linked to your wallet: <span style={{ fontFamily: 'monospace', color: 'var(--accent-secondary)' }}>{wallet.slice(0, 10)}...</span>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: '1.5rem' }}>
            {loading ? 'Encrypting & Uploading...' : '🚀 Register Model on Blockchain'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
