import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppContext } from '../App.jsx';

export default function Landing() {
  const { wallet, connectWallet } = useContext(AppContext);

  const features = [
    { icon: '🔐', title: 'Encrypted Model Storage', desc: 'All models are AES-256 encrypted before being stored on IPFS. Only authorized compute nodes can decrypt and run inference.' },
    { icon: '⛓️', title: 'Blockchain Ownership', desc: 'Model ownership is linked to your wallet address. Immutable metadata and ownership records stored on Polygon Amoy.' },
    { icon: '💰', title: 'Transparent Payments', desc: 'Pay-per-use and subscription models. Smart contracts handle revenue splitting: 85% owner, 10% compute, 5% platform.' },
    { icon: '🌐', title: 'Decentralized Storage', desc: 'Models stored on IPFS with only CIDs and metadata on-chain. No single point of failure or censorship.' },
    { icon: '⚡', title: 'Compute Network', desc: 'Distributed compute nodes run model inference. Nodes are incentivized with SYN token rewards.' },
    { icon: '🔍', title: 'Full Transparency', desc: 'Every prompt, response, and payment is recorded on the blockchain. No hidden fees or intermediaries.' },
  ];

  return (
    <div>
      <section className="hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="hero-badge">
            <span className="dot"></span>
            Live on Polygon Amoy Testnet
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Decentralized AI<br />
          <span className="gradient-text">Model Marketplace</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Publish, share, and monetize your ML models on a trustless, blockchain-powered
          platform. No intermediaries. Full encryption. Transparent payments.
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link to="/marketplace" className="btn btn-primary btn-lg">
            🚀 Explore Models
          </Link>
          {!wallet && (
            <button className="btn btn-secondary btn-lg" onClick={connectWallet}>
              🦊 Connect Wallet
            </button>
          )}
        </motion.div>

        <motion.div
          className="hero-stats"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="hero-stat">
            <div className="value">2+</div>
            <div className="label">AI Models</div>
          </div>
          <div className="hero-stat">
            <div className="value">L2</div>
            <div className="label">Polygon Amoy</div>
          </div>
          <div className="hero-stat">
            <div className="value">AES-256</div>
            <div className="label">Encryption</div>
          </div>
          <div className="hero-stat">
            <div className="value">IPFS</div>
            <div className="label">Storage</div>
          </div>
        </motion.div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Why SYN3RGY?</h2>
        <p className="section-subtitle">A fully decentralized pipeline from model upload to inference execution</p>

        <div className="features-grid">
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="card feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">End-to-end encrypted inference in 4 steps</p>
        <div className="features-grid" style={{ maxWidth: '900px', margin: '0 auto' }}>
          {[
            { step: '01', title: 'Upload & Encrypt', desc: 'Model owners encrypt their ML model with AES-256 and upload to IPFS. Metadata is registered on-chain.' },
            { step: '02', title: 'Browse & Select', desc: 'Users browse the marketplace, compare pricing, and select a model for inference.' },
            { step: '03', title: 'Pay & Execute', desc: 'SYN tokens are deducted. Prompt is encrypted, stored on IPFS, and sent to a compute node.' },
            { step: '04', title: 'Decrypt & Receive', desc: 'Compute node runs inference, encrypts result, stores on IPFS. User decrypts and receives response.' },
          ].map((s, i) => (
            <motion.div
              key={i}
              className="card feature-card"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="feature-icon" style={{ fontSize: '1rem', fontWeight: 800 }}>{s.step}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
