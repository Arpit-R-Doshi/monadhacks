# 💻 ECLIPSE.AI Frontend Application

The frontend is a modern, high-performance Web3 single-page application built with **React 19**, **Vite**, **Tailwind/Vanilla CSS**, **Framer Motion**, and **Wagmi / Viem / RainbowKit** connected directly to the **Monad Testnet** (Chain ID: `10143`).

---

## 📑 Table of Contents

- [Features](#-features)
- [Component & Page Hierarchy](#-component--page-hierarchy)
- [Page Overview](#-page-overview)
- [Web3 & Smart Contract Interaction Flow](#-web3--smart-contract-interaction-flow)
- [Local Development Setup](#-local-development-setup)
- [Building for Production](#-building-for-production)
- [Vercel Deployment Details](#-vercel-deployment-details)

---

## ✨ Features

- **Interactive WebGL Hero**: Custom fragment shader rendering interactive particle motion on the landing page.
- **Seamless Wallet Integration**: Powered by RainbowKit & Wagmi with auto-switching to Monad Testnet (`10143`).
- **Live On-Chain Balance**: Real-time display of native `MON` balances using Wagmi's reactive hooks.
- **1-Click Testnet Faucet Modal**: Direct link to official Monad testnet faucet, instantaneous 10 MON backend claim, and MetaMask network adder.
- **Real-Time AI Inference Chat**: Interactive prompt runner with markdown rendering, execution latency metrics, and IPFS prompt CID links.
- **Multimodal Computer Vision**: Upload images directly in chat; auto-processed with OCR and passed to Groq LPUs.
- **Developer API Dashboard**: Generate and manage scoped API keys (`ecl_...`) with configurable sliding-window RPM (15 to 300 RPM), max request caps, and MON spend caps.
- **Model Publishing Studio**: Client-side AES-256 encryption for model weights with automated IPFS upload via Pinata.

---

## 🏛️ Component & Page Hierarchy

```plaintext
frontend/src/
├── App.jsx                  # Main application wrapper, AppContext provider, Router
├── main.jsx                 # RainbowKit, WagmiConfig & Monad Testnet setup
├── index.css                # Global design system & theme variables
├── components/
│   ├── Navbar.jsx           # Top navigation, role switcher, live MON balance badge
│   ├── FaucetModal.jsx      # Monad testnet faucet modal & network adder
│   ├── CashoutModal.jsx     # Model owner earnings withdrawal interface
│   └── WebGLShader.jsx      # Interactive canvas shader background for hero section
└── pages/
    ├── Landing.jsx          # Public showcase, feature highlights, and animated stats
    ├── RoleSelect.jsx       # Persona selector: Model Consumer vs Model Owner
    ├── Marketplace.jsx      # Model catalog with filtering, search, and pricing
    ├── ModelDetail.jsx      # Inference chat room, token stats, and on-chain subscribe
    ├── Dashboard.jsx        # Developer portal: API keys, usage metrics, limits, quickstart
    ├── OwnerDashboard.jsx   # Model creator portal: registered models, stats, cashout
    └── UploadModel.jsx      # 3-step wizard for AES-256 encryption & model registration
```

---

## 🖥️ Page Overview

### 1. `Landing.jsx`
The entrance to the marketplace featuring an interactive WebGL canvas background shader. Outlines key benefits of Monad Testnet (10,000 TPS, sub-second latency, zero gas griefing).

### 2. `Marketplace.jsx`
Browse verified AI models (e.g. Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B) with pricing in native **MON**, rate limits, category filters, and latency badges.

### 3. `ModelDetail.jsx`
The core interactive inference workspace:
- Check subscription status or test free demo prompts.
- **1-Step Subscription**: Directly pay in native MON without approval steps.
- **Chat & Vision Prompting**: Attach images or text prompts; view token in/out stats, latency, and IPFS audit links.
- **Compute Node Selector**: Switch between Groq Cloud LPU or Edge Compute Worker.

### 4. `Dashboard.jsx`
Developer management suite:
- Generate scoped API keys (`ecl_...`).
- Set rate limits: `15`, `30`, `60`, `120`, or `300` Requests Per Minute.
- Set lifetime request caps (e.g. 500 requests) or budget caps (e.g. 25 MON).
- Copy instant cURL, Python, and Node.js quickstart code.

### 5. `UploadModel.jsx`
Studio for AI model creators:
- Encrypts model weights client-side using `crypto.subtle` AES-256-GCM.
- Automatically generates IPFS CIDs and submits on-chain registry transactions.

---

## 🔗 Web3 & Smart Contract Interaction Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant App as App.jsx / Wagmi
    participant ModelDetail as ModelDetail.jsx
    participant Wallet as MetaMask
    participant Contract as PaymentManager (Monad)
    participant Backend as Backend API

    User->>App: Connect MetaMask / RainbowKit
    App->>App: Detect Chain ID 10143 (Monad Testnet)
    App->>App: Query native MON balance via useBalance()
    
    User->>ModelDetail: Click "Subscribe Now (10 MON)"
    ModelDetail->>Wallet: Request walletClient.writeContract()
    Note over Wallet,Contract: Function: subscribe(modelId, owner, quota, duration)<br/>Value: 10 MON
    Wallet->>Contract: Broadcast Tx to Monad Testnet
    Contract-->>Wallet: Confirmation Receipt (1s block time)
    Wallet-->>ModelDetail: Tx Hash confirmed
    ModelDetail->>Backend: POST /api/subscriptions/sync
    Backend-->>ModelDetail: Subscription verified & synced in DB
    ModelDetail-->>User: Chat paywall unlocked (50,000 tokens)
```

---

## 🛠️ Local Development Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Variables
Create a `.env` file in `frontend/` (or rely on root `.env` proxying):
```env
VITE_API_URL=http://localhost:3001
```

### 3. Start the Vite Dev Server
```bash
npm run dev
```
The app will be accessible at: **`http://localhost:5173`**.

---

## 📦 Building for Production

To create an optimized production build:
```bash
npm run build
```
Build output is generated in `frontend/dist/`.

---

## ☁️ Vercel Deployment Details

The frontend includes a standalone [vercel.json](file:///Users/arpitdoshi/monadhacks/frontend/vercel.json) that ensures seamless client-side single page routing:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This prevents `404 Not Found` errors when refreshing routes like `/marketplace`, `/dashboard`, or `/models/:id`.
