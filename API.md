# 🔌 ECLIPSE.AI Developer API Documentation

ECLIPSE.AI provides an OpenAI-compatible REST API allowing AI agents, autonomous bots, backend services, and Python/Node.js scripts to execute inference against decentralized models hosted on the Monad network.

---

## 📑 Table of Contents

- [1. Authentication](#1-authentication)
- [2. Base URLs](#2-base-urls)
- [3. OpenAI-Compatible Chat Completions](#3-openai-compatible-chat-completions)
- [4. Platform Endpoints](#4-platform-endpoints)
  - [4.1 POST /api/execute (Direct Execution)](#41-post-apiexecute-direct-execution)
  - [4.2 GET /api/models (List Marketplace Models)](#42-get-apimodels-list-marketplace-models)
  - [4.3 GET /api/compute/nodes (Active Compute Nodes)](#43-get-apicomputenodes-active-compute-nodes)
  - [4.4 GET /api/user/purchases (User Purchase History)](#44-get-apiuserpurchases-user-purchase-history)
  - [4.5 GET /api/user/prompts (Prompt & Token Usage Ledger)](#45-get-apiuserprompts-prompt--token-usage-ledger)
  - [4.6 POST /api/user/cashout (Owner MON Cashout)](#46-post-apiusercashout-owner-mon-cashout)
- [5. Rate Limiting & Spend Caps](#5-rate-limiting--spend-caps)
- [6. Code Examples (Python, JavaScript, cURL)](#6-code-examples-python-javascript-curl)

---

## 1. Authentication

All requests to `/api/v1/*` endpoints require a Bearer token generated from the [Developer Dashboard](http://localhost:5173/dashboard):

```http
Authorization: Bearer ecl_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

API Keys are:
- Scoped to your connected Web3 wallet address.
- Protected by sliding-window rate limits (`15`, `30`, `60`, `120`, or `300` RPM).
- Configurable with lifetime request caps and maximum native `MON` spend caps.

---

## 2. Base URLs

| Environment | Base URL |
|:---|:---|
| **Local Development** | `http://localhost:3001` |
| **Vercel / Production** | `https://your-domain.vercel.app` |

---

## 3. OpenAI-Compatible Chat Completions

```http
POST /api/v1/chat/completions
```

Drop-in replacement for `api.openai.com/v1/chat/completions`. Use existing OpenAI client libraries without code modifications.

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer ecl_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Request Body
```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {
      "role": "system",
      "content": "You are a decentralized AI assistant on Monad."
    },
    {
      "role": "user",
      "content": "Explain parallel EVM execution on Monad in 2 sentences."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1024
}
```

### Response (200 OK)
```json
{
  "id": "chatcmpl-ecl-9b2e1f40",
  "object": "chat.completion",
  "created": 1726738800,
  "model": "llama-3.3-70b-versatile",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Monad achieves 10,000 TPS by decoupling transaction execution from consensus and executing independent transactions in parallel using optimistic concurrency control. Conflicts are automatically detected and re-executed, ensuring full EVM equivalence at massive scale."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 28,
    "completion_tokens": 42,
    "total_tokens": 70
  },
  "eclipse_metadata": {
    "engine": "groq-cloud",
    "compute_latency_ms": 192,
    "cost_mon": 0.001
  }
}
```

---

## 4. Platform Endpoints

### 4.1 POST `/api/execute`
Direct execution endpoint used by the Web UI and custom integrations.

```json
{
  "modelId": "llama-3.3-70b-versatile",
  "prompt": "Write a smart contract in Solidity for a token faucet.",
  "userAddress": "0x75199c1aa8F21Eb583027BbB6763B7c79CC180D6",
  "sessionId": "b2dfa508-b129-4ce4-8c43-4b3a5f3a148d",
  "nodeId": "groq-cloud"
}
```

### 4.2 GET `/api/models`
Returns all registered and verified models in the marketplace, including single-digit MON pricing, owner address, context windows, and latency.

### 4.3 GET `/api/compute/nodes`
Returns the status, latency, and operational health of all inference compute nodes (Groq Cloud LPU engine and decentralized edge Ollama nodes).

### 4.4 GET `/api/user/purchases?wallet=0x...`
Fetches a user's subscription and pay-per-use transaction history with on-chain transaction hashes, block explorer links, and expiration timestamps.

### 4.5 GET `/api/user/prompts?wallet=0x...`
Fetches the complete prompt execution and token consumption ledger for the specified wallet, including input tokens, output tokens, compute node, and transaction receipts.

### 4.6 POST `/api/user/cashout`
Initiates owner earnings payout strictly in native **MON** tokens.
```json
{
  "ownerAddress": "0x75199c1aa8F21Eb583027BbB6763B7c79CC180D6"
}
```

---

## 5. Rate Limiting & Spend Caps

Every developer API key enforces:
1. **Sliding-Window RPM**: Tracked dynamically across the past 60-second window.
2. **Lifetime Request Quota**: Prevents rogue scripts from exceeding a developer's allocated budget.
3. **MON Spend Cap**: Hard ceiling in native MON tokens.

### Rate Limit Headers Returned
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 57
X-RateLimit-Reset: 1726738860
```

### Rate Limit Exceeded (HTTP 429)
```json
{
  "error": "Rate limit exceeded. Your key is capped at 60 requests per minute.",
  "retry_after_seconds": 12
}
```

---

## 6. Code Examples (Python, JavaScript, cURL)

### Python (OpenAI SDK)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3001/api/v1",
    api_key="ecl_live_xxxxxxxxxxxxxxxxxxxxxxxx"
)

response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[
        {"role": "system", "content": "You are a quantitative finance expert."},
        {"role": "user", "content": "What is the capital asset pricing model?"}
    ]
)

print(response.choices[0].message.content)
```

### JavaScript / Node.js
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:3001/api/v1',
  apiKey: 'ecl_live_xxxxxxxxxxxxxxxxxxxxxxxx',
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: 'Generate a Monad deploy script in Foundry.' }],
  });

  console.log(completion.choices[0].message.content);
}

main();
```

### cURL
```bash
curl -X POST http://localhost:3001/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ecl_live_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [
      { "role": "user", "content": "Hello from Monad!" }
    ]
  }'
```
