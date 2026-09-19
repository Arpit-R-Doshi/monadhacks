# ECLIPSE.AI Deployment Guide

## Prerequisites

- Node.js 18+
- npm 9+
- MetaMask with Monad Testnet configured
- MON testnet tokens (from Monad faucet)
- Groq API key (https://console.groq.com)

## Monad Testnet Configuration

| Setting | Value |
|---|---|
| Network Name | Monad Testnet |
| RPC URL | `https://testnet-rpc.monad.xyz/` |
| Chain ID | 10143 |
| Currency Symbol | MON |
| Explorer | `https://testnet.monadexplorer.com` |

---

## 1. Clone and Install

```bash
git clone https://github.com/Arpit-R-Doshi/monadhacks
cd monadhacks

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install contract dependencies (if redeploying)
cd contracts && npm install && cd ..
```

---

## 2. Environment Configuration

Create `.env` at the project root:

```env
# Blockchain
DEPLOYER_PRIVATE_KEY=your_wallet_private_key
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz/
MONAD_CHAIN_ID=10143

# Contract Addresses (after deployment)
MODEL_REGISTRY_ADDRESS=0x2f02861ff42c0d04823dadd08326de0b07f57dfe
PAYMENT_MANAGER_ADDRESS=0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2
PROMPT_EXECUTION_ADDRESS=0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1

# Groq Cloud (required for cloud inference)
GROQ_API_KEY=gsk_...

# Server
PORT=3001
FRONTEND_URL=http://localhost:5173

# Encryption
MASTER_ENCRYPTION_KEY=your_32_byte_hex_key
```

---

## 3. Deploy Smart Contracts (First Time Only)

```bash
cd contracts
npx hardhat run scripts/deploy.js --network monad_testnet
```

Copy the output addresses into your `.env` file.

---

## 4. Start the Backend

```bash
cd backend
npm run dev
```

The backend starts on `http://localhost:3001`.

To seed demo models:
```bash
curl http://localhost:3001/api/seed
```

---

## 5. Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend starts on `http://localhost:5173`.

---

## 6. Optional: Local Ollama Node

To use the Local Ollama compute node:

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3

# Start Ollama (default port 11434)
ollama serve
```

The backend will automatically detect it at `http://localhost:11434`.

---

## Production Deployment

### Backend

```bash
cd backend
NODE_ENV=production npm start
```

Use a process manager like `pm2`:

```bash
npm install -g pm2
pm2 start src/index.js --name eclipse-backend
pm2 save
```

### Frontend

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel, Netlify, or any static host
```

Set the `VITE_API_URL` environment variable to your production backend URL.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| "No wallet detected" | Install MetaMask and add Monad Testnet |
| Contract call fails | Check `DEPLOYER_PRIVATE_KEY` has enough MON for gas |
| Groq inference fails | Verify `GROQ_API_KEY` is valid |
| Ollama node offline | Run `ollama serve` on the local machine |
| DB errors | Delete `backend/synergy.db` to reset (loses all data) |
