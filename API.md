# ECLIPSE.AI API Reference

Base URL: `http://localhost:3001`

All endpoints that require a wallet address use it as a path parameter or in the request body.

---

## Models

### GET /api/models
List all registered AI models.

**Response:**
```json
{
  "success": true,
  "models": [
    {
      "id": "llama3-8b-demo",
      "name": "Llama 3 8B",
      "description": "...",
      "category": "text-generation",
      "price_per_use": 0.2,
      "rate_limit": 10,
      "total_uses": 42
    }
  ]
}
```

### GET /api/models/:id
Get a single model by ID.

### POST /api/models/register
Register a new AI model.

**Body:**
```json
{
  "walletAddress": "0x...",
  "name": "My Model",
  "description": "...",
  "category": "text-generation",
  "pricePerUse": 0.2,
  "rateLimit": 10,
  "baseModel": "llama-3.3-70b-versatile"
}
```

---

## Payments & Subscriptions

### GET /api/payments/subscription/:wallet/:modelId
Check if a wallet has an active subscription.

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub_...",
    "tokens_allocated": 50000,
    "tokens_used": 1200,
    "expires_at": "2026-10-19T..."
  }
}
```

### POST /api/payments/subscribe
Subscribe to a model (pay-per-month).

**Body:**
```json
{
  "walletAddress": "0x...",
  "modelId": "llama3-8b-demo",
  "txHash": "0x..."
}
```

### GET /api/payments/owner-earnings/:wallet
Get withdrawable earnings for a model owner.

**Response:**
```json
{
  "success": true,
  "earnings": {
    "totalEarnings": 12.5,
    "totalWithdrawn": 4.0,
    "withdrawableAmount": 8.5,
    "currency": "MON"
  }
}
```

### POST /api/payments/cashout
Withdraw earnings to a Monad wallet (on-chain transfer).

**Body:**
```json
{
  "walletAddress": "0x...",
  "amount": 5.0,
  "recipientAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "explorerUrl": "https://testnet.monadexplorer.com/tx/0x..."
}
```

---

## Inference (Execution)

### POST /api/execution/run
Submit a prompt to a model for inference.

**Body:**
```json
{
  "walletAddress": "0x...",
  "modelId": "llama3-8b-demo",
  "prompt": "Explain quantum computing",
  "nodeId": "groq-cloud"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Quantum computing uses...",
  "inputTokens": 12,
  "outputTokens": 180,
  "duration": 920,
  "node": "groq-cloud"
}
```

### GET /api/execution/nodes
List all available compute nodes and their health status.

**Response:**
```json
{
  "success": true,
  "nodes": [
    {
      "id": "groq-cloud",
      "name": "Groq Cloud Engine",
      "healthy": true,
      "models": ["llama-3.3-70b-versatile", "gemma2-9b-it"]
    },
    {
      "id": "ollama-local",
      "name": "Local Ollama Node",
      "healthy": false
    }
  ]
}
```

---

## History

### GET /api/history/prompts/:wallet
Get all prompt records for a wallet.

### GET /api/history/sessions/:wallet
Get chat sessions grouped by model.

### GET /api/history/session/:sessionId
Get all messages for a specific session.

---

## API Keys

### POST /api/apikeys/generate
Generate a new API key.

**Body:**
```json
{
  "walletAddress": "0x...",
  "name": "Production",
  "rateLimitRpm": 60,
  "usageLimitRequests": 0,
  "usageLimitMon": 0
}
```

**Response:**
```json
{
  "success": true,
  "apiKey": "ecl_live_...",
  "keyId": "key_..."
}
```

> The full API key is only returned once. Store it securely.

### GET /api/apikeys/list/:wallet
List all API keys for a wallet (without the full key value).

### DELETE /api/apikeys/:keyId
Revoke an API key.

---

## Using API Keys

Include your API key in the `Authorization` header:

```
Authorization: Bearer ecl_live_your_key_here
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ecl_live_your_key_here" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## Health Check

### GET /api/health
Returns service status.

```json
{
  "status": "ok",
  "services": {
    "database": { "connected": true },
    "blockchain": { "connected": true },
    "compute": { "healthy": true }
  }
}
```
