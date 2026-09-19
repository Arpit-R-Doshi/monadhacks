import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '../App.jsx';

export default function Navbar() {
  const { wallet, balance, connectWallet, claimFaucet, loading } = useContext(AppContext);
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const truncateAddr = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <div className="logo-icon">⚡</div>
        <span>SYN<span className="highlight">3RGY</span></span>
      </Link>

      <div className="navbar-links">
        <Link to="/" className={isActive('/')}>Home</Link>
        <Link to="/marketplace" className={isActive('/marketplace')}>Marketplace</Link>
        <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
        <Link to="/upload" className={isActive('/upload')}>Upload Model</Link>
      </div>

      <div className="navbar-actions">
        {wallet && (
          <>
            <span className="balance-badge">💎 {balance.toFixed(1)} SYN</span>
            <button className="btn btn-sm btn-ghost" onClick={claimFaucet} disabled={loading}>
              {loading ? '...' : '🚰 Faucet'}
            </button>
          </>
        )}
        <button
          className={`wallet-btn ${wallet ? 'connected' : ''}`}
          onClick={wallet ? undefined : connectWallet}
        >
          {wallet ? (
            <>
              <span style={{ color: '#00e676', fontSize: '0.6rem' }}>●</span>
              <span className="wallet-address">{truncateAddr(wallet)}</span>
            </>
          ) : (
            <>🦊 Connect Wallet</>
          )}
        </button>
      </div>
    </nav>
  );
}
