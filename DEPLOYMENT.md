# 🚀 ECLIPSE.AI Deployment & Operations Guide

This guide covers deploying the smart contracts to the **Monad Testnet**, running the backend gateway and compute nodes, launching the frontend web application, and production hosting on Vercel.

---

## 📑 Table of Contents

- [1. Monad Testnet Network Details](#1-monad-testnet-network-details)
- [2. Active Contract Deployments](#2-active-contract-deployments)
- [3. Environment Variables](#3-environment-variables)
- [4. Smart Contract Deployment with Foundry](#4-smart-contract-deployment-with-foundry)
- [5. Local Full-Stack Setup](#5-local-full-stack-setup)
- [6. Production Deployment (Vercel)](#6-production-deployment-vercel)
- [7. Compute Worker Node Deployment](#7-compute-worker-node-deployment)
- [8. Verification & Explorer Links](#8-verification--explorer-links)

---

## 1. Monad Testnet Network Details

| Parameter | Value |
|:---|:---|
| **Network Name** | Monad Testnet |
| **Chain ID** | `10143` (`0x279f`) |
| **Native Token Symbol** | `MON` |
| **RPC Endpoint** | `https://testnet-rpc.monad.xyz/` |
| **Block Explorer** | [https://testnet.monadexplorer.com](https://testnet.monadexplorer.com) |
| **Official Faucet** | [https://testnet.monad.xyz/](https://testnet.monad.xyz/) |

---

## 2. Active Contract Deployments

The following contracts are actively deployed on the **Monad Testnet**:

| Contract | Address | Explorer Link |
|:---|:---|:---|
| **`ModelRegistry`** | `0x2f02861ff42c0d04823dadd08326de0b07f57dfe` | [View on Explorer](https://testnet.monadexplorer.com/address/0x2f02861ff42c0d04823dadd08326de0b07f57dfe) |
| **`PaymentManager`** | `0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2` | [View on Explorer](https://testnet.monadexplorer.com/address/0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2) |
| **`PromptExecution`** | `0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1` | [View on Explorer](https://testnet.monadexplorer.com/address/0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1) |
| **Primary Model Owner** | `0x75199c1aa8F21Eb583027BbB6763B7c79CC180D6` | [View on Explorer](https://testnet.monadexplorer.com/address/0x75199c1aa8F21Eb583027BbB6763B7c79CC180D6) |

---

## 3. Environment Variables

Create a `.env` file in the root directory (or update [.env](file:///Users/arpitdoshi/monadhacks/.env)):

```env
# ============================================
# Blockchain Configuration (Monad Testnet)
# ============================================
DEPLOYER_PRIVATE_KEY=your_private_key_here
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz/
MONAD_CHAIN_ID=10143

# ============================================
# Active Contract Addresses
# ============================================
MODEL_REGISTRY_ADDRESS=0x2f02861ff42c0d04823dadd08326de0b07f57dfe
PAYMENT_MANAGER_ADDRESS=0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2
PROMPT_EXECUTION_ADDRESS=0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1

# ============================================
# IPFS & Pinata Gateway
# ============================================
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
PINATA_JWT=your_pinata_jwt

# ============================================
# Groq Cloud Multi-Key Pool (Ultra-fast LPUs)
# ============================================
GROQ_API_KEY=gsk_your_primary_key
GROQ_API_KEY_1=gsk_key_1
GROQ_API_KEY_2=gsk_key_2
GROQ_API_KEY_3=gsk_key_3
GROQ_API_KEY_4=gsk_key_4

# ============================================
# Backend Server Configuration
# ============================================
PORT=3001
NODE_ENV=production
```

---

## 4. Smart Contract Deployment with Foundry

To redeploy or update smart contracts on the Monad Testnet:

### 1. Build Contracts
```bash
forge build
```

### 2. Run Deploy Script
```bash
forge script script/Deploy.s.sol \
  --rpc-url https://testnet-rpc.monad.xyz/ \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
```

The script will deploy:
1. `ModelRegistry.sol`
2. `PaymentManager.sol`
3. `PromptExecution.sol`

Update the output contract addresses into your root `.env` and `frontend/src/contracts/` ABI bindings.

---

## 5. Local Full-Stack Setup

### Step 1: Install Dependencies
```bash
# Root & Foundry dependencies
forge install

# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install
```

### Step 2: Seed SQLite Database
Ensure default models (Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B) are seeded with owner `0x75199c1aa8F21Eb583027BbB6763B7c79CC180D6` and single-digit MON pricing:
```bash
cd backend
npm run dev
# In another terminal or browser, trigger seed:
curl http://localhost:3001/api/seed
```

### Step 3: Launch Frontend
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. Connect MetaMask to **Monad Testnet** (`10143`).

---

## 6. Production Deployment (Vercel)

The repository is configured for turnkey single-repository deployment on **Vercel** via `vercel.json`:

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Deploying via Vercel CLI:
```bash
npm install -g vercel
vercel --prod
```

Configure all variables from `.env` in your Vercel Project Settings under **Environment Variables**.

---

## 7. Compute Worker Node Deployment

To join as a decentralized compute node and earn 10% of transaction fees in native MON:

```bash
cd compute-node
npm install

# Configure worker node address
export BACKEND_URL="https://your-backend-domain.com"
export OLLAMA_URL="http://localhost:11434"
export NODE_ADDRESS="0xYourComputeNodeAddress"

npm start
```

---

## 8. Verification & Explorer Links

Transactions, model registrations, and subscription payments can be tracked on the official Monad Testnet explorer:

- **Monad Explorer Homepage**: [https://testnet.monadexplorer.com](https://testnet.monadexplorer.com)
- **Model Registry Contract**: [`0x2f02861ff42c0d04823dadd08326de0b07f57dfe`](https://testnet.monadexplorer.com/address/0x2f02861ff42c0d04823dadd08326de0b07f57dfe)
- **Payment Manager Contract**: [`0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2`](https://testnet.monadexplorer.com/address/0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2)
- **Prompt Execution Contract**: [`0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1`](https://testnet.monadexplorer.com/address/0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1)
