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
        <span className="logo-text">ECLIPSE<span className="highlight">.AI</span></span>
      </Link>

      <div className="navbar-links">
        <Link to="/" className={isActive('/')}>
          <span className="nav-icon"></span> Home
        </Link>
        {(!userRole || userRole === 'user') && (
          <>
            <Link to="/marketplace" className={isActive('/marketplace')}>
              Marketplace
            </Link>
            <Link to="/history" className={isActive('/history')}>
              History
            </Link>
            <Link to="/dashboard" className={isActive('/dashboard')}>
              Dashboard
            </Link>
          </>
        )}
        {userRole === 'owner' && (
          <>
            <Link to="/marketplace" className={isActive('/marketplace')}>
              Marketplace
            </Link>
            <Link to="/owner/upload" className={isActive('/owner/upload')}>
              Upload
            </Link>
            <Link to="/owner" className={isActive('/owner')}>
              My Models
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
            Switch
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
