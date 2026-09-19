# ECLIPSE.AI Architecture

## System Overview

```
Browser (React + Vite)
        │
        │ REST API (HTTP)
        ▼
Express Backend (Node.js)
        │
   ┌────┴────────────┐
   │                 │
   ▼                 ▼
SQLite DB       Monad Testnet
(synergy.db)    (Smart Contracts)
        │
   ┌────┴────────────┐
   │                 │
   ▼                 ▼
Groq Cloud      Local Ollama
(LPU Inference) (GPU/CPU)
```

## Components

### Frontend (`/frontend`)

| File | Purpose |
|---|---|
| `src/App.jsx` | Root component, global context (wallet, balance, role) |
| `src/index.css` | Full design system — CSS variables, type scale, components |
| `src/pages/` | All page-level components |
| `src/components/Navbar.jsx` | Navigation bar with wallet connection |
| `src/components/CashoutModal.jsx` | MON earnings withdrawal UI |

**Key design decisions:**
- Single CSS file for global design system (no component-level CSS)
- CSS custom properties for theming (`--accent-primary: #4f46e5`)
- Type scale variables (`--text-xs` → `--text-3xl`) for consistent sizing
- Bebas Neue for headings/labels, Manrope for body text

### Backend (`/backend/src`)

| File | Purpose |
|---|---|
| `routes/models.js` | CRUD for AI model registry |
| `routes/payments.js` | Subscriptions, cashout, owner earnings |
| `routes/execution.js` | Prompt submission + compute node routing |
| `routes/history.js` | Chat sessions and prompt history |
| `routes/apikeys.js` | API key generation and management |
| `services/compute.js` | Compute node definitions (Groq + Ollama) |
| `services/blockchain.js` | Monad RPC interactions via ethers.js |
| `db/sqlite.js` | All database queries and schema management |

### Smart Contracts (`/contracts`)

| Contract | Role |
|---|---|
| `ModelRegistry.sol` | On-chain model metadata, ownership, co-owners |
| `PaymentManager.sol` | Subscription payments, earnings tracking |
| `PromptExecution.sol` | Execution proof logging on-chain |

## Data Flow: User Sends a Prompt

1. User types a message in `ModelDetail.jsx`
2. Frontend `POST /api/execution/run` with `{ modelId, prompt, walletAddress, nodeId }`
3. Backend checks subscription validity in SQLite
4. Backend routes to selected compute node:
   - **Groq Cloud**: Calls Groq API with mapped model ID
   - **Local Ollama**: HTTP request to local Ollama server
5. Response streamed back, token counts recorded
6. Prompt record saved to `prompts` table in SQLite
7. Frontend displays assistant message with meta (tokens, latency)

## Data Flow: Model Owner Cashes Out

1. Owner opens CashoutModal in OwnerDashboard
2. Frontend `GET /api/payments/owner-earnings/:wallet` to fetch withdrawable amount
3. Owner enters amount + recipient address, clicks Withdraw
4. Backend `POST /api/payments/cashout`:
   - Verifies amount ≤ withdrawable balance
   - Sends on-chain MON transfer via `PaymentManager` contract
   - Records withdrawal in `withdrawals` table
5. Frontend shows tx hash with Monad Explorer link

## Database Schema (SQLite)

```sql
users         (address, balance, total_spent, total_prompts)
models        (id, name, owner, price_per_use, category, ...)
subscriptions (id, wallet, model_id, tokens_allocated, tokens_used, ...)
prompts       (id, wallet, model_id, prompt_text, input_tokens, output_tokens, ...)
withdrawals   (id, wallet_address, amount, status, tx_hash, ...)
api_keys      (id, wallet, name, key_hash, rate_limit_rpm, ...)
```

## Compute Nodes

| Node | Type | Models |
|---|---|---|
| Groq Cloud Engine | Cloud LPU | Llama 3 8B/70B, Gemma 2B, Mixtral 8x7B, Whisper |
| Local Ollama Node | Local GPU/CPU | Any locally-pulled Ollama model |

Node selection is per-request. The user picks a node in the ModelDetail UI; the backend routes accordingly.

## Security

- Wallet authentication is signature-based (MetaMask `eth_requestAccounts`)
- Model encryption keys are AES-256 encrypted at rest
- API keys are hashed (SHA-256) before storage; only the prefix is shown after creation
- No IPFS or image upload surface (removed for simplicity)
