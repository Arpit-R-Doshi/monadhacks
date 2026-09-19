import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect, createContext } from 'react';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar.jsx';
import Landing from './pages/Landing.jsx';
import Marketplace from './pages/Marketplace.jsx';
import ModelDetail from './pages/ModelDetail.jsx';
import Dashboard from './pages/Dashboard.jsx';
import UploadModel from './pages/UploadModel.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const AppContext = createContext();

function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      setWallet(address);

      // Connect to backend
      const res = await fetch(`${API_URL}/api/wallet/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.success) {
        setBalance(data.user.balance);
      }
    } catch (err) {
      console.error('Wallet connect error:', err);
    }
  };

  const refreshBalance = async () => {
    if (!wallet) return;
    try {
      const res = await fetch(`${API_URL}/api/wallet/balance/${wallet}`);
      const data = await res.json();
      setBalance(data.platformBalance);
    } catch (err) {
      console.error('Balance refresh error:', err);
    }
  };

  const claimFaucet = async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/wallet/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet }),
      });
      const data = await res.json();
      if (data.success) {
        setBalance(data.newBalance);
      }
    } catch (err) {
      console.error('Faucet error:', err);
    }
    setLoading(false);
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWallet(accounts[0]);
        } else {
          setWallet(null);
          setBalance(0);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (wallet) refreshBalance();
  }, [wallet]);

  const contextValue = {
    wallet, balance, loading, setLoading,
    connectWallet, refreshBalance, claimFaucet,
    API_URL,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#f0f0f5',
            border: '1px solid rgba(255,255,255,0.06)',
          },
        }} />
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/model/:id" element={<ModelDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<UploadModel />} />
        </Routes>
        <footer className="footer">
          <p>© 2026 SYN3RGY — Decentralized AI Model Marketplace | Built on Polygon Amoy</p>
        </footer>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
