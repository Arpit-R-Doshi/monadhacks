# SYN3RGY — Decentralized AI Model Marketplace

A blockchain-powered platform for publishing, sharing, and monetizing ML models with encrypted storage, trustless execution, and transparent payments on Polygon Amoy.

## 🏗️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Blockchain** | Polygon Amoy Testnet (Chain ID: 80002) |
| **Smart Contracts** | Solidity 0.8.20 + Foundry |
| **Backend** | Node.js + Express |
| **Frontend** | React + Vite |
| **Storage** | IPFS (Pinata) |
| **AI Inference** | Ollama (Gemma, Llama 3) |
| **Wallet** | MetaMask |
| **Encryption** | AES-256-GCM |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Foundry (for smart contracts)
- Git with submodules support
- MetaMask or Web3 wallet

### Setup Steps

#### 1. Clone & Initialize Dependencies
```bash
git clone https://github.com/syn3rgy2026/KAMALVAASI_Syn3rgy_ArpitDoshi.git
cd KAMALVAASI_Syn3rgy_ArpitDoshi
git submodule update --init --recursive  # Fetch OpenZeppelin contracts
```

#### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
# Blockchain
DEPLOYER_PRIVATE_KEY=your_private_key_here
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology/

# Contract Addresses (after deployment)
SYN3RGY_TOKEN_ADDRESS=0x...
MODEL_REGISTRY_ADDRESS=0x...
PAYMENT_MANAGER_ADDRESS=0x...
PROMPT_EXECUTION_ADDRESS=0x...

# Server
PORT=3001
FRONTEND_URL=http://localhost:5174

# IPFS (Pinata)
PINATA_JWT=your_pinata_jwt_here

# Ollama Nodes
OLLAMA_URL=http://localhost:11434
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
# App runs on http://localhost:5174
```

#### 5. Smart Contracts Deployment
```bash
# Compile contracts
forge build

# Deploy to Polygon Amoy
forge script script/Deploy.s.sol --rpc-url https://rpc-amoy.polygon.technology/ --broadcast --private-key $DEPLOYER_PRIVATE_KEY

# Update CONTRACT ADDRESSES in .env after deployment
```

#### 6. Ollama (Local AI Inference)
```bash
# Pull models
ollama pull gemma:2b
ollama pull llama3:8b

# Start Ollama server (runs on http://localhost:11434)
ollama serve
```

## 🔐 Smart Contracts

| Contract | Purpose |
|----------|---------|
| **SYN3RGYToken** | ERC-20 platform token with faucet |
| **ModelRegistry** | On-chain model metadata registry |
| **PaymentManager** | Pay-per-use and subscription payments |
| **PromptExecution** | Prompt lifecycle tracking |

## 📜 License
MIT
