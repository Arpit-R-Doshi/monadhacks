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
import RoleSelect from './pages/RoleSelect.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import { useAccount, useBalance } from 'wagmi';
import { monadTestnet } from './main.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const AppContext = createContext();

function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(() => localStorage.getItem('eclipse_role') || null);
  const [appConfig, setAppConfig] = useState(null);
  const { address, isConnected } = useAccount();

  // Reactive on-chain native Monad testnet balance from Wagmi
  const { data: onChainBalData, refetch: refetchOnChainBal } = useBalance({
    address: address,
    chainId: monadTestnet.id,
  });

  // Sync reactive Wagmi balance to state
  useEffect(() => {
    if (onChainBalData?.formatted) {
      setBalance(parseFloat(onChainBalData.formatted));
    }
  }, [onChainBalData]);

  // Fetch app config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/api/config`);
        const data = await res.json();
        if (data.success) setAppConfig(data.config);
      } catch (err) {
        console.error('Failed to load API config:', err);
      }
    };
    fetchConfig();
  }, []);

  // Persist role to localStorage
  const handleSetRole = (role) => {
    setUserRole(role);
    if (role) {
      localStorage.setItem('eclipse_role', role);
    } else {
      localStorage.removeItem('eclipse_role');
    }
  };

  const syncBackendWallet = async (addr) => {
    try {
      const res = await fetch(`${API_URL}/api/wallet/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.monadBalance && data.monadBalance !== '0.00' && data.monadBalance !== '0') {
          setBalance(parseFloat(data.monadBalance));
        } else if (data.user?.balance !== undefined) {
          setBalance(data.user.balance);
        }
      }
    } catch (err) {
      console.error('Wallet sync error:', err);
    }
  };

  const refreshBalance = async () => {
    if (!wallet) return;
    try {
      if (refetchOnChainBal) {
        const onChainRes = await refetchOnChainBal();
        if (onChainRes.data?.formatted) {
          setBalance(parseFloat(onChainRes.data.formatted));
          return;
        }
      }
      const res = await fetch(`${API_URL}/api/wallet/balance/${wallet}`);
      const data = await res.json();
      if (data.monadBalance && data.monadBalance !== '0.00') {
        setBalance(parseFloat(data.monadBalance));
      } else if (data.platformBalance !== undefined) {
        setBalance(data.platformBalance);
      }
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
        if (refetchOnChainBal) refetchOnChainBal();
      }
    } catch (err) {
      console.error('Faucet error:', err);
    }
    setLoading(false);
  };

  // Sync on-chain balance changes when wallet connects or changes
  useEffect(() => {
    if (onChainBalData?.formatted) {
      const onChainVal = parseFloat(onChainBalData.formatted);
      if (onChainVal > 0) {
        setBalance(onChainVal);
      }
    }
  }, [onChainBalData]);

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
    refreshBalance, claimFaucet, currency: 'MON',
    userRole, setUserRole: handleSetRole,
    API_URL, appConfig,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: {
            background: 'rgba(20, 20, 30, 0.9)',
            color: '#f1f5f9',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
          },
        }} />
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<RoleSelect />} />
          {/* User routes */}
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/model/:id" element={<ModelDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<ChatHistory />} />
          {/* Owner routes */}
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/owner/upload" element={<UploadModel />} />
        </Routes>
        <footer className="footer">
          <p>© 2026 ECLIPSE.AI — Decentralized AI Model Marketplace | Built on Monad Testnet</p>
        </footer>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
