import { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../App.jsx';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Navbar() {
  const { wallet, balance, userRole, setUserRole } = useContext(AppContext);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const switchRole = () => {
    setUserRole(null);
    navigate('/login');
  };
  const isLanding = location.pathname === '/';

  return (
    <nav className={`navbar ${isLanding ? 'navbar-transparent' : ''}`}>
      <Link to="/" className="navbar-logo">
        <div className="logo-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
          </svg>
        </div>
        <span className="logo-text">eclipse<span className="highlight">.ai</span></span>
      </Link>

      <div className="navbar-links">
        <Link to="/" className={isActive('/')}>
          <span className="nav-icon">🏠</span> Home
        </Link>
        {(!userRole || userRole === 'user') && (
          <>
            <Link to="/marketplace" className={isActive('/marketplace')}>
              <span className="nav-icon">🛒</span> Marketplace
            </Link>
            <Link to="/history" className={isActive('/history')}>
              <span className="nav-icon">💬</span> History
            </Link>
            <Link to="/dashboard" className={isActive('/dashboard')}>
              <span className="nav-icon">📊</span> Dashboard
            </Link>
          </>
        )}
        {userRole === 'owner' && (
          <>
            <Link to="/owner" className={isActive('/owner')}>
              <span className="nav-icon">🤖</span> My Models
            </Link>
            <Link to="/owner/upload" className={isActive('/owner/upload')}>
              <span className="nav-icon">📤</span> Upload
            </Link>
            <Link to="/marketplace" className={isActive('/marketplace')}>
              <span className="nav-icon">🛒</span> Marketplace
            </Link>
          </>
        )}
      </div>

      <div className="navbar-actions">
        {wallet && userRole && (
          <button
            className="nav-action-btn"
            onClick={switchRole}
            title="Switch role"
          >
            {userRole === 'user' ? '👤' : '🏗️'} Switch
          </button>
        )}
        {wallet && (
          <div className="balance-badge">
            <span className="balance-icon">◆</span>
            <span>{balance.toFixed(1)}</span>
            <span className="balance-unit">ECL</span>
          </div>
        )}
        <ConnectButton showBalance={false} />
      </div>
    </nav>
  );
}
