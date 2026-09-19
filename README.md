# 🌌 ECLIPSE.AI — Decentralized AI Model Marketplace on Monad

[![Monad Testnet](https://img.shields.io/badge/Network-Monad_Testnet_(10143)-836ef9?style=for-the-badge&logo=ethereum)](https://testnet.monadexplorer.com)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org/)
[![Groq Cloud LPU](https://img.shields.io/badge/Inference-Groq_Cloud_LPU-f55036?style=for-the-badge)](https://groq.com/)
[![React + Vite](https://img.shields.io/badge/Frontend-React_19_+_Vite-61dafb?style=for-the-badge&logo=react)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**ECLIPSE.AI** is a decentralized, high-throughput marketplace for AI models deployed on the **Monad Testnet** (10,000 TPS, 1-second finality). It enables AI creators to monetize models trustlessly with AES-256 IPFS encryption, automatic on-chain revenue sharing in native Monad testnet tokens (**MON**), single-digit token pricing, and ultra-fast inference powered by a resilient multi-key **Groq Cloud LPU** pool.

---

## 📑 Table of Contents

- [Live Testnet Deployments](#-live-testnet-deployments)
- [Deep-Dive Documentation](#-deep-dive-documentation)
- [Architectural Overview](#-architectural-overview)
- [System Workflows](#-system-workflows)
  - [1. Model Consumer Journey](#1-model-consumer-journey)
  - [2. Model Owner & Monetization Journey](#2-model-owner--monetization-journey)
  - [3. Developer API & Rate-Limited Access](#3-developer-api--rate-limited-access)
- [Monorepo Directory Structure](#-monorepo-directory-structure)
- [Sub-Module Documentation](#-sub-module-documentation)
- [Quick Start Guide](#-quick-start-guide)
- [Smart Contracts & On-Chain Revenue Model](#-smart-contracts--on-chain-revenue-model)
- [Vercel Deployment Guide](#-vercel-deployment-guide)
- [Security & Verification](#-security--verification)
- [License](#-license)

---

## 🌐 Live Testnet Deployments

ECLIPSE.AI is actively deployed and verified on **Monad Testnet (Chain ID: `10143`)**:

| Contract | Address | Explorer Link |
|:---|:---|:---|
| **`ModelRegistry`** | `0x2f02861ff42c0d04823dadd08326de0b07f57dfe` | [View on Monad Explorer](https://testnet.monadexplorer.com/address/0x2f02861ff42c0d04823dadd08326de0b07f57dfe) |
| **`PaymentManager`** | `0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2` | [View on Monad Explorer](https://testnet.monadexplorer.com/address/0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2) |
| **`PromptExecution`** | `0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1` | [View on Monad Explorer](https://testnet.monadexplorer.com/address/0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1) |
| **Default Model Owner** | `0x75199c1aa8F21Eb583027BbB6763B7c79CC180D6` | [View on Monad Explorer](https://testnet.monadexplorer.com/address/0x75199c1aa8F21Eb583027BbB6763B7c79CC180D6) |

---

## 📚 Deep-Dive Documentation

For comprehensive sub-system specifications, refer to our dedicated guides:

- 🏛️ **[ARCHITECTURE.md](ARCHITECTURE.md)** — Full architectural specifications, state machines, encryption lifecycles, and sequence diagrams.
- 🚀 **[DEPLOYMENT.md](DEPLOYMENT.md)** — Step-by-step Foundry deployment, environment configurations, and Vercel hosting setup.
- 🔌 **[API.md](API.md)** — OpenAI-compatible completions API reference, cURL/Python/Node.js snippets, and rate limit headers.

---

## 🏗️ Architectural Overview

```mermaid
graph TD
    subgraph Clients["Clients & Developers"]
        UserBrowser["Web3 Browser (MetaMask / RainbowKit)"]
        APIDev["API Consumer (cURL / Python / Node.js)"]
    end

    subgraph Frontend["Frontend Layer (React 19 + Vite)"]
        UI["ECLIPSE UI (Marketplace, Chat, Dashboard)"]
        ChatHist["Chat & Usage History (Tx Receipts & Token Ledger)"]
        Wagmi["Wagmi / Viem (Monad Testnet: 10143)"]
    end

    subgraph Backend["Backend Gateway (Express.js / Vercel Serverless)"]
        Router["Express REST API & /api/v1 Router"]
        RateLimiter["Sliding-Window Rate Limiter & Budget Caps"]
        DB[(SQLite synergy.db)]
    end

    subgraph Compute["AI Inference Engine"]
        GroqPool["Groq Cloud LPU Multi-Key Pool\n(Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B)"]
        OllamaNode["Edge Compute Worker (Local Ollama Node)"]
    end

    subgraph Blockchain["Monad Testnet (Chain ID 10143)"]
        ModelRegistry["ModelRegistry.sol\n(Metadata, Owners, Pricing)"]
        PaymentManager["PaymentManager.sol\n(Native MON Revenue Splits)"]
        PromptExecution["PromptExecution.sol\n(Prompt & Output Hashes)"]
    end

    subgraph Storage["Decentralized Storage"]
        IPFS["IPFS / Pinata (AES-256 Encrypted Prompts & Responses)"]
    end

    UserBrowser -->|Interacts| UI
    UI -->|Web3 Payable Tx| Wagmi
    Wagmi -->|Native MON Transactions| PaymentManager
    UI -->|REST Calls| Router
    UI --> ChatHist
    APIDev -->|Bearer ecl_...| Router

    Router --> RateLimiter
    RateLimiter --> DB
    Router -->|Text Inference| GroqPool
    Router -->|Edge Fallback| OllamaNode

    Router -->|Verify / Record| Blockchain
    Router -->|Upload Encrypted Payloads| IPFS
```

---

## 🔄 System Workflows

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
    alt Model Subscription (Single-Digit MON)
        UI->>Wallet: Prompt 1-step Native MON Payment
        Wallet->>Contract: subscribe(modelId, owner, quota, duration) { value: priceWei }
        Contract-->>Contract: Split: 85% to Owner, 10% Nodes, 5% Platform
        Contract-->>Wallet: Tx Receipt (Confirmed on Monad)
        Wallet-->>UI: Subscription Active
        UI->>API: POST /api/subscriptions/sync
    end

    User->>UI: Submit Text Prompt
    UI->>API: POST /api/execute { modelId, prompt, userAddress }
    API->>API: Validate Active Subscription / User Balance
    API->>Groq: Stream Inference through High-Speed LPU Pool
    Groq-->>API: Generated AI Output + Token Metrics
    API->>API: Log Execution & IPFS Prompt Hash
    API-->>UI: Display Response + Clean Token In/Out/Latency Metrics
```

### 2. Model Owner & Monetization Journey

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Model Creator (0x75199c1aa8F...)
    participant UI as Studio UI
    participant IPFS as Pinata IPFS
    participant Registry as ModelRegistry.sol
    participant Payment as PaymentManager.sol

    Owner->>UI: Upload Model Weights / System Prompt
    UI->>UI: Encrypt with AES-256-GCM client-side
    UI->>IPFS: Pin encrypted weights to IPFS
    IPFS-->>UI: Return Model CID
    UI->>Registry: registerModel(modelId, ipfsCID, pricePerUse, subPrice)
    Registry-->>UI: Model Live on Marketplace

    Note over Payment: Consumers subscribe in native MON
    Owner->>UI: Open Owner Dashboard
    UI->>Payment: Query accumulated owner earnings
    Owner->>Payment: cashoutOwnerEarnings()
    Payment-->>Owner: 100% Native MON transferred directly to wallet
```

---

## 📂 Monorepo Directory Structure

```plaintext
monadhacks/
├── backend/                 # Node.js / Express inference gateway & SQLite DB
│   ├── src/
│   │   ├── routes/          # /api/execute, /api/models, /api/user, /api/v1
│   │   ├── services/        # compute.js (Groq failover), encryption.js, blockchain.js
│   │   └── db/              # sqlite.js schema, migrations, seed data
│   └── README.md            # Backend documentation
│
├── frontend/                # React 19 + Vite Web3 application
│   ├── src/
│   │   ├── components/      # Navbar, FaucetModal, CashoutModal, WebGLShader
│   │   ├── pages/           # Marketplace, ModelDetail, ChatHistory, Dashboard, Owner
│   │   └── contracts/       # Contract addresses & Foundry ABIs
│   └── README.md            # Frontend documentation
│
├── src/                     # Solidity smart contracts (Foundry)
│   ├── ModelRegistry.sol    # Model registry & pricing catalog
│   ├── PaymentManager.sol   # Native MON revenue router (85/10/5 split)
│   ├── PromptExecution.sol  # Verifiable execution ledger
│   └── README.md            # Foundry contracts documentation
│
├── compute-node/            # Edge worker for decentralized Ollama inference
│   └── README.md            # Compute node documentation
│
├── ARCHITECTURE.md          # End-to-end technical specifications
├── DEPLOYMENT.md            # Deployment & operations runbook
├── API.md                   # Developer REST API & OpenAI completions reference
└── README.md                # Root project overview
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **Foundry**: For smart contract compilation and deployment ([Install Foundry](https://getfoundry.sh/))
- **Web3 Wallet**: [MetaMask](https://metamask.io/) or Rainbow Wallet configured with **Monad Testnet**

### 1. Clone & Configure Environment
```bash
git clone https://github.com/Arpit-R-Doshi/monadhacks.git
cd monadhacks
cp .env.example .env
```

### 2. Start the Backend Engine
```bash
cd backend
npm install
npm run dev
# Health check: curl http://localhost:3001/api/health
```

### 3. Launch the Frontend UI
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. Connect MetaMask to **Monad Testnet** (`10143`).

---

## 🔐 Smart Contracts & On-Chain Revenue Model

All transactions, subscriptions, and withdrawals operate **strictly in native Monad testnet tokens (`MON`)**:

| Contract | Functionality | Revenue Split / Mechanism |
|:---|:---|:---|
| **`PaymentManager.sol`** | Native `payable` router for inference & subscriptions | **85%** directly to Model Owner<br>**10%** to Compute Node Workers<br>**5%** to Platform Treasury |
| **`ModelRegistry.sol`** | Immutable model registry | Stores encrypted model IPFS CIDs, ownership proof, and pricing metadata |
| **`PromptExecution.sol`** | Cryptographic verification | Tracks prompt lifecycle hashes on-chain for tamper-proof audit trails |

---

## 🛡️ Security & Verification

- **Pure Confidential Computing**: Model prompts are encrypted using **AES-256-GCM** before being pinned to IPFS.
- **Audited Solidity Patterns**: Inherits standard OpenZeppelin `Ownable` and `ReentrancyGuard` implementations.
- **Decentralized Verifiability**: Dedicated **Usage & Purchase History** ledger lets users audit all on-chain transactions on Monad Explorer.

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
