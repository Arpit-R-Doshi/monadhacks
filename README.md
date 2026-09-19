# ECLIPSE.AI

**Decentralized AI Model Marketplace on Monad Testnet**

ECLIPSE.AI is a full-stack Web3 application that lets users browse, subscribe to, and run inference on AI models via an on-chain payment system built on the Monad blockchain. Model owners can register, price, and monetize their models while users access them through a clean chat interface.

---

## Features

### For Users
- Browse an AI model marketplace with real-time pricing in MON tokens
- Subscribe to models with on-chain payments
- Chat with models via an encrypted inference pipeline (Groq Cloud + Local Ollama)
- View full prompt history, token usage, and spend analytics
- Generate API keys for programmatic access (pay-per-use)

### For Model Owners
- Register AI models with custom pricing (MON/use or MON/month)
- Track usage, earnings, and subscriber counts
- Cash out earnings directly to a Monad wallet
- Share model co-ownership and set revenue split percentages
- Transfer model ownership on-chain

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Monad Testnet (Chain ID 10143) |
| Smart Contracts | Solidity + Hardhat |
| Backend | Node.js + Express + SQLite |
| AI Inference | Groq Cloud (LPU) + Local Ollama |
| Frontend | React + Vite |
| Styling | Vanilla CSS, Bebas Neue + Manrope fonts |
| Wallet | MetaMask / EIP-1193 compatible |

---

## Quick Start

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Monad Testnet configured in MetaMask (Chain ID: 10143, RPC: `https://testnet-rpc.monad.xyz/`)
- (Optional) Groq API key for cloud inference

### 1. Clone and Install

```bash
git clone https://github.com/Arpit-R-Doshi/monadhacks
cd monadhacks
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

### 2. Configure Environment

Copy and fill in the `.env` file at the root:

```bash
cp .env.example .env
```

Key variables:
```env
GROQ_API_KEY=your_groq_api_key
MODEL_REGISTRY_ADDRESS=0x...
PAYMENT_MANAGER_ADDRESS=0x...
PROMPT_EXECUTION_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...
```

### 3. Deployed Contracts (Monad Testnet)

The following smart contracts are actively deployed on the Monad Testnet (Chain ID 10143) and integrated into this prototype:

- **Model Registry**: `0x2f02861ff42c0d04823dadd08326de0b07f57dfe`
- **Payment Manager**: `0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2`
- **Prompt Execution**: `0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1`

### 3. Deploy Contracts (if needed)

```bash
cd contracts
npx hardhat run scripts/deploy.js --network monad_testnet
```

### 4. Run the App

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:3001

---

## Project Structure

```
monadhacks/
├── contracts/          # Solidity smart contracts
├── backend/            # Express API server
│   └── src/
│       ├── routes/     # API routes (models, payments, prompts, etc.)
│       ├── services/   # Compute nodes, blockchain integration
│       └── db/         # SQLite database
├── frontend/           # React + Vite app
│   └── src/
│       ├── pages/      # Marketplace, Dashboard, History, etc.
│       ├── components/ # Navbar, CashoutModal, FaucetModal
│       └── index.css   # Global design system
└── .env                # Environment configuration
```

---

## Smart Contracts

| Contract | Address |
|---|---|
| ModelRegistry | `0x2f02861ff42c0d04823dadd08326de0b07f57dfe` |
| PaymentManager | `0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2` |
| PromptExecution | `0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1` |

---

## License

MIT
