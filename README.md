# 🌌 ECLIPSE.AI — Decentralized AI Model Marketplace on Monad

[![Monad Testnet](https://img.shields.io/badge/Network-Monad_Testnet_(10143)-836ef9?style=for-the-badge&logo=ethereum)](https://testnet.monadexplorer.com)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org/)
[![Groq Cloud LPU](https://img.shields.io/badge/Inference-Groq_Cloud_LPU-f55036?style=for-the-badge)](https://groq.com/)
[![React + Vite](https://img.shields.io/badge/Frontend-React_19_+_Vite-61dafb?style=for-the-badge&logo=react)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**ECLIPSE.AI** is a decentralized, high-throughput marketplace for AI models deployed on the **Monad Testnet** (10,000 TPS, 1-second finality). It enables AI creators to monetize models trustlessly with AES-256 IPFS encryption, automatic on-chain revenue sharing in native Monad testnet tokens (**MON**), and sub-second inference powered by a resilient multi-key **Groq Cloud LPU** pool.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [System Architecture Flow](#-system-architecture-flow)
- [User Workflows](#-user-workflows)
  - [1. Model Consumer Journey](#1-model-consumer-journey)
  - [2. Model Owner & Monetization Journey](#2-model-owner--monetization-journey)
  - [3. Developer API & Rate-Limited Access](#3-developer-api--rate-limited-access)
- [Monorepo Directory Structure](#-monorepo-directory-structure)
- [Sub-Module Documentation](#-sub-module-documentation)
- [Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [1. Clone & Configure Environment](#1-clone--configure-environment)
  - [2. Start the Backend Engine](#2-start-the-backend-engine)
  - [3. Launch the Frontend UI](#3-launch-the-frontend-ui)
  - [4. Deploy Smart Contracts to Monad Testnet](#4-deploy-smart-contracts-to-monad-testnet)
- [Smart Contracts & On-Chain Revenue Model](#-smart-contracts--on-chain-revenue-model)
- [Vercel Deployment Guide](#-vercel-deployment-guide)
- [Security & Verification](#-security--verification)
- [License](#-license)

---

## 🏗️ Architectural Overview

```mermaid
graph TD
    subgraph Clients["Clients & Developers"]
        UserBrowser["Web3 Browser (MetaMask / RainbowKit)"]
        APIDev["API Consumer (cURL / Python / Node.js)"]
    end

    subgraph Frontend["Frontend Layer (React + Vite)"]
        UI["ECLIPSE UI (Marketplace, Chat, Dashboard)"]
        Wagmi["Wagmi / Viem (Monad Testnet: 10143)"]
    end

    subgraph Backend["Backend Gateway (Express.js / Vercel Serverless)"]
        Router["Express REST API & /api/v1 Router"]
        RateLimiter["Sliding-Window Rate Limiter & Budget Caps"]
        DB[(SQLite /tmp/synergy.db)]
    end

    subgraph Compute["AI Inference Engine"]
        GroqPool["Groq Cloud LPU Multi-Key Pool\n(Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B)"]
        Vision["OCR & Computer Vision Preprocessor"]
        OllamaNode["Edge Compute Worker (Local Ollama Node)"]
    end

    subgraph Blockchain["Monad Testnet (Chain ID 10143)"]
        ModelRegistry["ModelRegistry.sol\n(Metadata, Owners, Pricing)"]
        PaymentManager["PaymentManager.sol\n(Native MON Revenue Splits)"]
        PromptExecution["PromptExecution.sol\n(Prompt & Output Hashes)"]
    end

    subgraph Storage["Decentralized Storage"]
        IPFS["IPFS / Pinata (AES-256 Encrypted Model Weights & Prompts)"]
    end

    UserBrowser -->|Interacts| UI
    UI -->|Web3 Payable Tx| Wagmi
    Wagmi -->|Native MON Transactions| PaymentManager
    UI -->|REST Calls| Router
    APIDev -->|Bearer ecl_...| Router

    Router --> RateLimiter
    RateLimiter --> DB
    Router -->|Text & Vision Inference| GroqPool
    Router -->|Multimodal Image Extraction| Vision
    Vision --> GroqPool
    Router -->|Edge Fallback| OllamaNode

    Router -->|Verify / Record| Blockchain
    Router -->|Upload Encrypted Payloads| IPFS
```

---

## 🔄 System Architecture Flow

### 1. Model Consumer Journey

```mermaid
sequenceDiagram
    autonumber
    actor User as Model Consumer
    participant UI as ECLIPSE Frontend
    participant Wallet as MetaMask (Chain 10143)
    participant Contract as PaymentManager.sol
    participant API as Backend API
    participant Groq as Groq LPU Engine

    User->>UI: Connect Wallet & Select AI Model
    alt Model Subscription
        UI->>Wallet: Prompt 1-step Native MON Payment
        Wallet->>Contract: subscribe(modelId, owner, quota, duration) { value: priceWei }
        Contract-->>Contract: Split: 85% to Owner, 10% Nodes, 5% Platform
        Contract-->>Wallet: Tx Receipt (Confirmed on Monad)
        Wallet-->>UI: Subscription Active
        UI->>API: POST /api/subscriptions/sync
    end

    User->>UI: Submit Prompt (Text or Image)
    UI->>API: POST /api/execute
    API->>API: Validate Active Subscription / User Balance
    API->>Groq: Stream Inference through High-Speed LPU
    Groq-->>API: Generated AI Output + Token Counts
    API->>API: Log Execution & IPFS Prompt Hash
    API-->>UI: Return Response & Metrics
    UI-->>User: Display AI Response & Latency Stats
```

---

### 2. Model Owner & Monetization Journey

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Model Owner
    participant UI as Owner Dashboard
    participant IPFS as IPFS / Pinata
    participant Registry as ModelRegistry.sol
    participant Payments as PaymentManager.sol

    Owner->>UI: Upload Model Weights & Set Pricing (MON)
    UI->>UI: Encrypt Weights Client-Side (AES-256-GCM)
    UI->>IPFS: Pin Encrypted Bundle -> IPFS CID
    IPFS-->>UI: Return CID
    UI->>Registry: registerModel(name, ipfsCID, pricePerUse, subPrice)
    Registry-->>UI: Model Registered On-Chain!
    Note over Payments,Owner: Users execute model or subscribe
    Payments->>Owner: 85% of every transaction transferred directly in native MON
```

---

### 3. Developer API & Rate-Limited Access

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / External System
    participant Gateway as Backend Gateway
    participant Limiter as Rate Limit & Budget Engine
    participant DB as SQLite DB
    participant Groq as Groq Multi-Key Pool

    Dev->>Gateway: POST /api/v1/chat/completions (Bearer ecl_key)
    Gateway->>DB: Query API Key, Quota & Budget
    Gateway->>Limiter: Check Sliding-Window RPM & Lifetime Budget
    alt Limit Exceeded
        Limiter-->>Gateway: Rate / Spend Limit Hit
        Gateway-->>Dev: HTTP 429 Too Many Requests (X-RateLimit-Reset, Retry-After)
    else Limit OK
        Limiter->>DB: Increment Total Requests & Spent MON
        Gateway->>Groq: Forward Prompt to Active Groq Key
        alt Key Rate-Limited (429)
            Gateway->>Groq: Auto-Failover to Next Groq Key in Pool
        end
        Groq-->>Gateway: Response Payload
        Gateway-->>Dev: HTTP 200 OK (OpenAI-compatible format)
    end
```

---

## 📁 Monorepo Directory Structure

```plaintext
monadhacks/
├── api/                     # Vercel serverless entry point
│   └── index.js             # Serverless bridge exporting the Express app
├── backend/                 # Node.js Express Backend API
│   ├── src/
│   │   ├── abis/            # Contract ABI artifacts (PaymentManager, ModelRegistry, PromptExecution)
│   │   ├── db/              # SQLite database (sqlite.js, schema, auto-migration)
│   │   ├── routes/          # Express route controllers:
│   │   │   ├── apikeys.js   # API key generation, budget & RPM management
│   │   │   ├── execution.js # Interactive inference controller
│   │   │   ├── history.js   # Chat history persistence
│   │   │   ├── inference.js # OpenAI-compatible /v1/chat/completions endpoint
│   │   │   ├── models.js    # Model catalog & metadata
│   │   │   ├── payments.js  # Earnings withdrawal & cashout handlers
│   │   │   └── subscriptions.js # On-chain subscription indexer
│   │   ├── services/        # Core business services:
│   │   │   ├── blockchain.js# Monad RPC provider & contract interfaces
│   │   │   ├── compute.js   # Groq multi-key pool & local Ollama failover
│   │   │   ├── encryption.js# AES-256 payload encryption utilities
│   │   │   └── ipfs.js      # Pinata IPFS upload & gateway service
│   │   └── server.js        # Server bootstrap & middleware setup
│   ├── package.json
│   └── README.md            # 📖 Backend Sub-Module Guide
├── frontend/                # React 19 + Vite Web Application
│   ├── src/
│   │   ├── components/      # UI components (Navbar, FaucetModal, CashoutModal, WebGLShader)
│   │   ├── pages/           # Application views:
│   │   │   ├── Landing.jsx       # Hero landing page with interactive WebGL shader
│   │   │   ├── Marketplace.jsx   # AI model discovery catalog
│   │   │   ├── ModelDetail.jsx   # Interactive inference chat & on-chain subscription
│   │   │   ├── Dashboard.jsx     # Developer API keys, usage metrics & faucet
│   │   │   ├── OwnerDashboard.jsx# Model owner earnings & analytics
│   │   │   ├── UploadModel.jsx   # Encrypted model publishing studio
│   │   │   └── RoleSelect.jsx    # Persona selection (Consumer vs Creator)
│   │   ├── App.jsx          # Root component & global state context
│   │   └── main.jsx         # Wagmi, RainbowKit & Monad Testnet config
│   ├── package.json
│   └── README.md            # 📖 Frontend Sub-Module Guide
├── src/                     # Foundry Solidity Smart Contracts
│   ├── ModelRegistry.sol    # On-chain model catalog registry
│   ├── PaymentManager.sol   # Native MON payable revenue router (85/10/5)
│   ├── PromptExecution.sol  # On-chain prompt and execution hash records
│   └── README.md            # 📖 Smart Contracts Sub-Module Guide
├── script/                  # Foundry Deployment Scripts
│   └── Deploy.s.sol         # Monad Testnet automated broadcast script
├── compute-node/            # Decentralized Compute Node Worker
│   ├── worker.js            # Node worker script for local edge processing
│   ├── package.json
│   └── README.md            # 📖 Compute Node Sub-Module Guide
├── foundry.toml             # Foundry configuration (Monad Testnet RPC: 10143)
├── vercel.json              # Root fullstack Vercel deployment manifest
├── package.json             # Root monorepo build & orchestrator scripts
└── README.md                # Main repository documentation
```

---

## 📚 Sub-Module Documentation

For deep-dive documentation into each component of the ecosystem, refer to the dedicated sub-READMEs:

| Module | Purpose | Link |
|--------|---------|------|
| **Frontend** | React UI, WebGL shader, Wagmi & MetaMask wallet integration, live inference chat | [Frontend Guide](file:///Users/arpitdoshi/monadhacks/frontend/README.md) |
| **Backend** | Express API, Groq LPU pool, rate limiting, budget caps, OpenAI-compatible endpoint | [Backend Guide](file:///Users/arpitdoshi/monadhacks/backend/README.md) |
| **Smart Contracts** | Foundry Solidity contracts, native MON revenue splits, deployment scripts | [Contracts Guide](file:///Users/arpitdoshi/monadhacks/src/README.md) |
| **Compute Node** | Decentralized compute worker, edge inference, reward claims | [Compute Node Guide](file:///Users/arpitdoshi/monadhacks/compute-node/README.md) |

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **Foundry**: For smart contract compilation and deployment ([Install Foundry](https://getfoundry.sh/))
- **Web3 Wallet**: [MetaMask](https://metamask.io/) or Rainbow Wallet configured with **Monad Testnet**

---

### 1. Clone & Configure Environment

```bash
# Clone the repository
git clone https://github.com/Arpit-R-Doshi/monadhacks.git
cd monadhacks

# Copy environment template
cp .env.example .env
```

Edit `.env` to configure your keys:
```env
# Blockchain (Monad Testnet)
DEPLOYER_PRIVATE_KEY=your_private_key_here
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz/
MONAD_CHAIN_ID=10143

# Contract Addresses (filled after deploying contracts)
MODEL_REGISTRY_ADDRESS=
PAYMENT_MANAGER_ADDRESS=
PROMPT_EXECUTION_ADDRESS=

# AI Cloud Inference (Groq Multi-Key Pool)
GROQ_API_KEY=gsk_...
GROQ_API_KEY_1=gsk_...
GROQ_API_KEY_2=gsk_...

# Server
PORT=3001
FRONTEND_URL=http://localhost:5173
```

---

### 2. Start the Backend Engine

```bash
cd backend
npm install
npm run dev
```
* The backend will start on **`http://localhost:3001`**.
* Health Check: `curl http://localhost:3001/api/health`
* Seed Models: `curl http://localhost:3001/api/seed`

---

### 3. Launch the Frontend UI

```bash
cd ../frontend
npm install
npm run dev
```
* The frontend will be available at **`http://localhost:5173`**.
* Connect your MetaMask wallet and claim testnet tokens from the built-in **Faucet Modal**.

---

### 4. Deploy Smart Contracts to Monad Testnet

Ensure your deployer address has testnet MON from the [Official Monad Faucet](https://testnet.monad.xyz/):

```bash
# From root directory:
forge build

# Deploy to Monad Testnet:
forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.monad.xyz/ --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

Once deployed, copy the printed contract addresses (`ModelRegistry`, `PaymentManager`, `PromptExecution`) into your `.env` file!

---

## 🔐 Smart Contracts & On-Chain Revenue Model

All payments, subscriptions, and payouts are conducted **exclusively in native Monad testnet tokens (`MON`)**.

| Contract | Functionality | Revenue Split / Mechanism |
|----------|---------------|---------------------------|
| **`PaymentManager.sol`** | Native `payable` router for inference & subscriptions | **85%** directly to Model Owner<br>**10%** to Compute Node Workers<br>**5%** to Platform Treasury |
| **`ModelRegistry.sol`** | Immutable model registry | Stores encrypted model IPFS CIDs, ownership proof, and pricing metadata |
| **`PromptExecution.sol`** | Cryptographic verification | Tracks prompt lifecycle hashes on-chain for tamper-proof audit trails |

### Native MON Subscription Flow (No Approval Required)

Unlike traditional ERC-20 tokens that require a separate `approve()` transaction, users subscribe with a single on-chain transaction:

```solidity
// Direct native payable subscription in PaymentManager.sol
function subscribe(
    string calldata _modelId,
    address _modelOwner,
    uint256 _quota,
    uint256 _duration
) external payable {
    require(msg.value > 0, "Price must be > 0");
    uint256 ownerAmount = (msg.value * MODEL_OWNER_SHARE) / 10000;
    uint256 platformAmount = msg.value - ownerAmount;

    (bool sentOwner, ) = payable(_modelOwner).call{value: ownerAmount}("");
    require(sentOwner, "Failed to send MON to model owner");
    ...
}
```

---

## ☁️ Vercel Deployment Guide

ECLIPSE.AI is configured for instantaneous deployment on **Vercel** with fullstack monorepo support:

1. Import the repository into your [Vercel Dashboard](https://vercel.com).
2. Set the **Framework Preset** to `Vite`.
3. Add environment variables in the Vercel Project Settings:
   - `GROQ_API_KEY`, `GROQ_API_KEY_1`, `GROQ_API_KEY_2`, etc.
   - `MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz/`
   - `MONAD_CHAIN_ID=10143`
   - `DEPLOYER_PRIVATE_KEY=...`
   - `MODEL_REGISTRY_ADDRESS`, `PAYMENT_MANAGER_ADDRESS`, `PROMPT_EXECUTION_ADDRESS`
4. Click **Deploy**. Vercel automatically builds `frontend/dist` and mounts serverless routes via `/api/index.js`.

---

## 🛡️ Security & Verification

- **End-to-End Encryption**: Models and prompts are encrypted client-side using **AES-256-GCM** before being pinned to IPFS.
- **Audited Smart Contracts**: Contracts inherit OpenZeppelin's standard `Ownable` and `ReentrancyGuard` patterns.
- **Key Safety**: Private keys are strictly ignored by `.gitignore` and never committed or transmitted to client browsers.
- **Rate Limiting**: API keys feature customizable requests-per-minute (RPM) limits, hard lifetime request caps, and MON spend caps to protect developer budgets.

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
