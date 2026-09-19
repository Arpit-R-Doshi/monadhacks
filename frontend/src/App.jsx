import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect, createContext } from 'react';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar.jsx';
import Landing from './pages/Landing.jsx';
import Marketplace from './pages/Marketplace.jsx';
import ModelDetail from './pages/ModelDetail.jsx';
import Dashboard from './pages/Dashboard.jsx';
import UploadModel from './pages/UploadModel.jsx';
import ChatHistory from './pages/ChatHistory.jsx';
import { useAccount } from 'wagmi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const AppContext = createContext();

function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const { address, isConnected } = useAccount();

  const syncBackendWallet = async (addr) => {
    try {
      const res = await fetch(`${API_URL}/api/wallet/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (data.success) {
        setBalance(data.user.balance);
      }
    } catch (err) {
      console.error('Wallet sync error:', err);
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

  // Listen for account changes via Wagmi hook
  useEffect(() => {
    if (isConnected && address) {
      setWallet(address);
      syncBackendWallet(address);
    } else {
      setWallet(null);
      setBalance(0);
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (wallet) refreshBalance();
  }, [wallet]);

  const contextValue = {
    wallet, balance, loading, setLoading,
    refreshBalance, claimFaucet,
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
          <Route path="/history" element={<ChatHistory />} />
        </Routes>
        <footer className="footer">
          <p>© 2026 SYN3RGY — Decentralized AI Model Marketplace | Built on Polygon Amoy</p>
        </footer>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
