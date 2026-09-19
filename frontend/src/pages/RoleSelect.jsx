import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppContext } from '../App.jsx';

export default function RoleSelect() {
  const { wallet, setUserRole } = useContext(AppContext);
  const navigate = useNavigate();

  const selectRole = (role) => {
    setUserRole(role);
    if (role === 'user') {
      navigate('/marketplace');
    } else if (role === 'worker') {
      navigate('/worker');
    } else {
      navigate('/owner');
    }
  };

  return (
    <div className="role-select-page">
      <motion.div
        className="role-select-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="role-header">
          <div className="role-logo">E</div>
          <h1>Welcome to <span className="gradient-text">ECLIPSE.AI</span></h1>
          <p>Choose how you want to use the decentralized AI marketplace</p>
        </div>

        {!wallet && (
          <div className="role-wallet-notice">
            <span>Connect your wallet first using the button in the top-right corner</span>
          </div>
        )}

        <div className="role-cards">
          <motion.div
            className="role-card"
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => selectRole('user')}
          >
            <div className="role-card-icon user-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <h2>User</h2>
            <p>Browse, discover, and run AI models. Chat with powerful LLMs through our encrypted inference pipeline.</p>
            <ul className="role-features">
              <li>Browse AI marketplace</li>
              <li>Chat with models</li>
              <li>View usage analytics</li>
              <li>Access chat history</li>
            </ul>
            <div className="role-card-action">
              <span className="btn btn-primary">Enter as User</span>
            </div>
          </motion.div>

          <motion.div
            className="role-card"
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => selectRole('owner')}
          >
            <div className="role-card-icon owner-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="16"/>
                <line x1="10" y1="14" x2="14" y2="14"/>
              </svg>
            </div>
            <h2>Model Owner</h2>
            <p>Register, manage, and monetize your AI models on the blockchain-backed marketplace.</p>
            <ul className="role-features">
              <li>Upload and register models</li>
              <li>Set pricing and earn MON</li>
              <li>Track model performance</li>
              <li>Manage encryption keys</li>
            </ul>
            <div className="role-card-action">
              <span className="btn btn-secondary">Enter as Owner</span>
            </div>
          </motion.div>
          <motion.div
            className="role-card"
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => selectRole('worker')}
          >
            <div className="role-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h2>Compute Worker</h2>
            <p>Provide local compute power via Ollama and earn MON tokens for processing inferences.</p>
            <ul className="role-features">
              <li>Opt-in to local models</li>
              <li>Earn MON per inference</li>
              <li>Track tasks processed</li>
              <li>Cash out directly to wallet</li>
            </ul>
            <div className="role-card-action">
              <span className="btn" style={{ background: '#10b981', color: 'white', border: 'none' }}>Enter as Worker</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
