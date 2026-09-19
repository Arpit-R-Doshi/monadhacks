import { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../App.jsx';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Navbar() {
  const { wallet, balance, claimFaucet, loading, userRole, setUserRole } = useContext(AppContext);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path ? 'active' : '';
  const isActivePrefix = (prefix) => location.pathname.startsWith(prefix) ? 'active' : '';

  const switchRole = () => {
    setUserRole(null);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <div className="logo-icon">⚡</div>
        <span>SYN<span className="highlight">3RGY</span></span>
      </Link>

      <div className="navbar-links">
        <Link to="/" className={isActive('/')}>Home</Link>
        {(!userRole || userRole === 'user') && (
          <>
            <Link to="/marketplace" className={isActive('/marketplace')}>Marketplace</Link>
            <Link to="/history" className={isActive('/history')}>History</Link>
            <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
          </>
        )}
        {userRole === 'owner' && (
          <>
            <Link to="/owner" className={isActive('/owner')}>My Models</Link>
            <Link to="/owner/upload" className={isActive('/owner/upload')}>Upload Model</Link>
            <Link to="/marketplace" className={isActive('/marketplace')}>Marketplace</Link>
          </>
        )}
      </div>

      <div className="navbar-actions">
        {wallet && userRole && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={switchRole}
            title="Switch role"
            style={{ fontSize: '0.75rem' }}
          >
            {userRole === 'user' ? '👤' : '🏗️'} Switch
          </button>
        )}
        {wallet && (
          <>
            <span className="balance-badge">💎 {balance.toFixed(1)} SYN</span>
            <button className="btn btn-sm btn-ghost" onClick={claimFaucet} disabled={loading}>
              {loading ? '...' : '🚰 Faucet'}
            </button>
          </>
        )}
        <ConnectButton showBalance={false} />
      </div>
    </nav>
  );
}
