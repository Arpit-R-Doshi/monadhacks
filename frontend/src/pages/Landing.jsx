import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppContext } from '../App.jsx';
import WebGLShader from '../components/WebGLShader.jsx';

export default function Landing() {
  const { wallet } = useContext(AppContext);

  const features = [
    { icon: '🔐', title: 'E2E Encryption', desc: 'AES-256 encrypted models on IPFS. Only authorized compute nodes decrypt for inference.' },
    { icon: '⛓️', title: 'On-Chain Ownership', desc: 'Immutable ownership on Polygon. Your wallet = your proof of authorship.' },
    { icon: '💰', title: 'Instant Revenue', desc: 'Smart contracts auto-split revenue. No middlemen, no delays.' },
    { icon: '🌐', title: 'IPFS Storage', desc: 'Censorship-resistant, decentralized model storage with zero single-point failure.' },
    { icon: '⚡', title: 'Edge Compute', desc: 'Distributed inference nodes. Sub-second latency. GPU-accelerated.' },
    { icon: '🔍', title: 'Full Auditability', desc: 'Every prompt, response, and payment immutably recorded on-chain.' },
  ];

  const steps = [
    { num: '01', title: 'Upload & Encrypt', desc: 'Encrypt your model with AES-256 and deploy to IPFS. Register ownership on-chain.', color: '#7c3aed' },
    { num: '02', title: 'Discover & Select', desc: 'Browse the marketplace. Compare pricing, reviews, and capabilities.', color: '#3b82f6' },
    { num: '03', title: 'Pay & Execute', desc: 'ECL tokens deducted via smart contract. Prompt encrypted and routed to compute.', color: '#10b981' },
    { num: '04', title: 'Receive & Verify', desc: 'Inference result decrypted and returned. Full transaction proof on blockchain.', color: '#f59e0b' },
  ];

  const stats = [
    { value: '2+', label: 'Live Models' },
    { value: 'L2', label: 'Polygon Amoy' },
    { value: 'AES-256', label: 'Encryption' },
    { value: 'IPFS', label: 'Storage' },
  ];

  return (
    <div className="landing-page">
      {/* ─── HERO WITH SHADER ─── */}
      <section className="shader-hero">
        <WebGLShader />
        <div className="shader-hero-overlay" />
        <div className="shader-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="shader-badge">
              <span className="shader-badge-dot" />
              Live on Polygon Amoy Testnet
            </div>
          </motion.div>

          <motion.h1
            className="shader-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            The Future of<br />
            <span className="shader-title-accent">AI Ownership</span>
          </motion.h1>

          <motion.p
            className="shader-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            Publish, monetize, and run AI models on a trustless blockchain network.
            <br />Zero intermediaries. Full encryption. Transparent revenue.
          </motion.p>

          <motion.div
            className="shader-cta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link to="/login" className="cta-primary">
              Get Started →
            </Link>
            <Link to="/marketplace" className="cta-secondary">
              Browse Models
            </Link>
          </motion.div>

          <motion.div
            className="shader-stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {stats.map((s, i) => (
              <div key={i} className="shader-stat">
                <div className="shader-stat-value">{s.value}</div>
                <div className="shader-stat-label">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* ─── SECTIONS WITH SOLID BACKGROUND ─── */}
      <div className="landing-body">
        {/* ─── FEATURES ─── */}
        <section className="landing-features">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-section-header"
          >
            <h2>Why Eclipse<span style={{ color: 'var(--accent-primary)' }}>.AI</span>?</h2>
            <p>A fully decentralized pipeline — from model upload to inference execution</p>
          </motion.div>

          <div className="landing-features-grid">
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="landing-feature-card"
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="landing-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="landing-steps">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-section-header"
          >
            <h2>How It Works</h2>
            <p>End-to-end encrypted inference in four steps</p>
          </motion.div>

          <div className="landing-steps-grid">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                className="landing-step-card"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
              >
                <div className="landing-step-num" style={{ background: s.color }}>{s.num}</div>
                <div className="landing-step-body">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── CTA BOTTOM ─── */}
        <section className="landing-bottom-cta">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2>Ready to build the future?</h2>
            <p>Join the decentralized AI revolution. Publish your first model in minutes.</p>
            <div className="shader-cta" style={{ justifyContent: 'center' }}>
              <Link to="/login" className="cta-primary">
                Launch App →
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
