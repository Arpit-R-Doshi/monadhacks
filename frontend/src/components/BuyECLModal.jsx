import { useState, useContext } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../App.jsx';

export default function BuyECLModal({ isOpen, onClose }) {
  const { wallet, balance, refreshBalance, claimFaucet, API_URL } = useContext(AppContext);
  const [claiming, setClaiming] = useState(false);

  if (!isOpen) return null;

  const handleClaim = async () => {
    if (!wallet) {
      toast.error('Connect your wallet first');
      return;
    }

    setClaiming(true);
    try {
      const res = await fetch(`${API_URL}/api/wallet/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Claimed ${data.credited || 10} MON test tokens!`);
        refreshBalance();
        onClose();
      } else {
        toast.error(data.error || 'Faucet claim failed');
      }
    } catch (err) {
      toast.error('Network error requesting tokens');
    }
    setClaiming(false);
  };

  const handleAddMonadNetwork = async () => {
    if (!window.ethereum) {
      toast.error('No Web3 wallet detected');
      return;
    }
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x279f', // 10143 in hex
          chainName: 'Monad Testnet',
          nativeCurrency: {
            name: 'Monad',
            symbol: 'MON',
            decimals: 18,
          },
          rpcUrls: ['https://testnet-rpc.monad.xyz/'],
          blockExplorerUrls: ['https://testnet.monadexplorer.com'],
        }],
      });
      toast.success('Monad Testnet added to wallet!');
    } catch (err) {
      toast.error('Failed to add network: ' + err.message);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card, #121224)',
          border: '1px solid var(--border-color, rgba(167, 139, 250, 0.3))',
          borderRadius: '16px', maxWidth: '480px', width: '100%',
          padding: '2rem', color: '#fff', position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'none', border: 'none', color: 'var(--text-muted, #888)',
            fontSize: '1.25rem', cursor: 'pointer',
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⟠</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
            Get Monad Testnet Tokens
          </h2>
          <p style={{ color: 'var(--text-secondary, #a1a1aa)', fontSize: '0.85rem', margin: 0 }}>
            Monad Test Tokens (MON) are the native platform currency for inference & subscriptions.
          </p>
        </div>

        {/* Current Balance */}
        <div style={{
          background: 'rgba(167, 139, 250, 0.08)',
          border: '1px solid rgba(167, 139, 250, 0.2)',
          borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)' }}>Your Connected Balance</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#a78bfa' }}>
              {Number(balance).toFixed(3)} MON
            </div>
          </div>
          <span style={{
            fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '0.2rem 0.6rem', borderRadius: '20px',
          }}>
            Chain ID: 10143
          </span>
        </div>

        {/* Action 1: Claim Faucet */}
        <button
          onClick={handleClaim}
          disabled={claiming}
          style={{
            width: '100%', padding: '0.85rem', borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.95rem',
            cursor: claiming ? 'not-allowed' : 'pointer', marginBottom: '0.75rem',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
          }}
        >
          {claiming ? 'Claiming Monad Tokens...' : '⚡ Instant Claim Faucet (10 MON)'}
        </button>

        {/* Action 2: Official Monad Faucet */}
        <a
          href="https://testnet.monad.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', textAlign: 'center', width: '100%', padding: '0.85rem',
            borderRadius: '10px', background: 'rgba(255,255,255,0.05)',
            color: '#c5c5d2', border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none', marginBottom: '0.75rem',
          }}
        >
          ↗ Open Official Monad Faucet
        </a>

        {/* Action 3: Add Monad Testnet */}
        <button
          onClick={handleAddMonadNetwork}
          style={{
            width: '100%', padding: '0.65rem', borderRadius: '8px',
            background: 'none', color: 'var(--text-muted, #a1a1aa)',
            border: '1px dashed rgba(255,255,255,0.15)', fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          + Add Monad Testnet (RPC 10143) to MetaMask
        </button>

        {/* Footer info */}
        <div style={{
          textAlign: 'center', marginTop: '1.25rem', fontSize: '0.75rem',
          color: 'var(--text-muted, #71717a)',
        }}>
          Powered by Monad High-Throughput EVM Testnet • 10,000 TPS
        </div>
      </div>
    </div>
  );
}
