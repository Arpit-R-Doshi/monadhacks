# ECLIPSE — Decentralized AI Model Marketplace on Monad

A high-speed blockchain-powered platform for publishing, sharing, and monetizing ML models with encrypted storage, trustless execution, and transparent payments on Monad Testnet.

## 🏗️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Blockchain** | Monad Testnet (Chain ID: 10143) |
| **Smart Contracts** | Solidity 0.8.20 + Foundry |
| **Backend** | Node.js + Express |
| **Frontend** | React + Vite |
| **Storage** | IPFS (Pinata) |
| **AI Inference** | Groq Cloud LPU Engine |
| **Wallet** | MetaMask / RainbowKit |
| **Encryption** | AES-256-GCM |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Foundry (for smart contracts)
- MetaMask or Web3 wallet

### Setup Steps

#### 1. Clone & Initialize Dependencies
```bash
git clone https://github.com/Arpit-R-Doshi/monadhacks.git
cd monadhacks
```

#### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
# Blockchain (Monad Testnet)
DEPLOYER_PRIVATE_KEY=your_private_key_here
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz/
MONAD_CHAIN_ID=10143

# Contract Addresses (filled after deployment)
ECLIPSE_TOKEN_ADDRESS=0x...
MODEL_REGISTRY_ADDRESS=0x...
PAYMENT_MANAGER_ADDRESS=0x...
PROMPT_EXECUTION_ADDRESS=0x...

# Server
PORT=3001
FRONTEND_URL=http://localhost:5173

# Groq Cloud AI Inference
GROQ_API_KEY=gsk_...
```

#### 3. Backend Setup
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:3001
```

#### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

#### 5. Smart Contracts Deployment on Monad
```bash
# Compile contracts
forge build

# Deploy to Monad Testnet
forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.monad.xyz/ --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

## 🔐 Smart Contracts

| Contract | Purpose |
|----------|---------|
| **EclipseToken** | ERC-20 platform credit token (`ECL`) with testnet faucet |
| **ModelRegistry** | On-chain model metadata registry |
| **PaymentManager** | Pay-per-use and subscription payments |
| **PromptExecution** | Prompt lifecycle and verification tracking |

## 📜 License
MIT
