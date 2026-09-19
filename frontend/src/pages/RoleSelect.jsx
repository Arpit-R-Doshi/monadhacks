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
          <div className="role-logo">⚡</div>
          <h1>Welcome to <span className="gradient-text">SYN3RGY</span></h1>
          <p>Choose how you want to use the decentralized AI marketplace</p>
        </div>

        {!wallet && (
          <div className="role-wallet-notice">
            <span>🔗</span>
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
            <div className="role-card-icon user-icon">👤</div>
            <h2>User</h2>
            <p>Browse, discover, and run AI models. Chat with powerful LLMs through our encrypted inference pipeline.</p>
            <ul className="role-features">
              <li>🔍 Browse AI marketplace</li>
              <li>💬 Chat with models</li>
              <li>📊 View usage analytics</li>
              <li>📜 Access chat history</li>
            </ul>
            <div className="role-card-action">
              <span className="btn btn-primary">Enter as User →</span>
            </div>
          </motion.div>

          <motion.div
            className="role-card"
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => selectRole('owner')}
          >
            <div className="role-card-icon owner-icon">🏗️</div>
            <h2>Model Owner</h2>
            <p>Register, manage, and monetize your AI models on the blockchain-backed marketplace.</p>
            <ul className="role-features">
              <li>🚀 Upload & register models</li>
              <li>💰 Set pricing & earn SYN</li>
              <li>📈 Track model performance</li>
              <li>🔐 Manage encryption keys</li>
            </ul>
            <div className="role-card-action">
              <span className="btn btn-secondary">Enter as Owner →</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
