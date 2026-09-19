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

### 1. Backend
```bash
cd backend
npm install
npm run dev
# Seed demo models: curl http://localhost:3001/api/seed
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Deploy Smart Contracts
```bash
source .env
forge script script/Deploy.s.sol --rpc-url https://rpc-amoy.polygon.technology/ --broadcast
```

### 4. Ollama (Compute Node)
```bash
ollama pull gemma:2b
ollama pull llama3:8b
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
