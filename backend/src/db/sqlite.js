import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In Vercel serverless environment, use /tmp which is writable
let DB_PATH;
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  DB_PATH = join('/tmp', 'synergy.db');
  const sourceDb = join(__dirname, '..', '..', 'synergy.db');
  if (!fs.existsSync(DB_PATH) && fs.existsSync(sourceDb)) {
    try {
      fs.copyFileSync(sourceDb, DB_PATH);
      console.log('[DB] Seeded database copied to /tmp/synergy.db for Vercel');
    } catch (e) {
      console.warn('[DB] Could not copy seed DB to /tmp:', e.message);
    }
  }
} else {
  DB_PATH = process.env.DB_PATH || join(__dirname, '..', '..', 'synergy.db');
}

let db;

export function initDB() {
  db = new Database(DB_PATH);
  try {
    db.pragma('journal_mode = WAL');
  } catch (e) {
    db.pragma('journal_mode = DELETE');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      ipfs_cid TEXT,
      owner_address TEXT,
      ollama_model TEXT,
      price_per_use REAL DEFAULT 1,
      subscription_price REAL DEFAULT 10,
      rate_limit INTEGER DEFAULT 10,
      encryption_key TEXT,
      is_active INTEGER DEFAULT 1,
      total_uses INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      model_id TEXT,
      user_address TEXT,
      session_id TEXT,
      prompt_text TEXT,
      encrypted_prompt_cid TEXT,
      response_text TEXT,
      response_cid TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      tx_hash TEXT,
      duration_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS users (
      address TEXT PRIMARY KEY,
      balance REAL DEFAULT 0,
      total_spent REAL DEFAULT 0,
      total_prompts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      user_address TEXT,
      model_id TEXT,
      request_count INTEGER DEFAULT 0,
      window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_address, model_id)
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_address TEXT,
      model_id TEXT,
      tokens_allocated INTEGER,
      tokens_used INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key_hash TEXT UNIQUE NOT NULL,
      key_prefix TEXT NOT NULL,
      user_address TEXT NOT NULL,
      name TEXT DEFAULT 'Default',
      is_active INTEGER DEFAULT 1,
      total_requests INTEGER DEFAULT 0,
      total_tokens_used INTEGER DEFAULT 0,
      rate_limit_rpm INTEGER DEFAULT 60,
      usage_limit_requests INTEGER DEFAULT 0,
      usage_limit_mon REAL DEFAULT 0,
      total_spent_mon REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS api_key_rate_limits (
      key_id TEXT PRIMARY KEY,
      request_count INTEGER DEFAULT 1,
      window_start DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS model_co_owners (
      model_id TEXT,
      wallet_address TEXT,
      share_percent REAL DEFAULT 0,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (model_id, wallet_address)
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      local_amount REAL,
      method TEXT DEFAULT 'bank_transfer',
      status TEXT DEFAULT 'pending',
      payout_info TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME
    );
  `);

  console.log('[DB] SQLite initialized at', DB_PATH);

  // Alter existing models table to add the new remote compute columns if they don't exist
  try {
    const columns = db.pragma('table_info(models)');
    const hasComputeUrl = columns.some(c => c.name === 'compute_node_url');
    if (!hasComputeUrl) {
      db.exec(`
        ALTER TABLE models ADD COLUMN compute_node_url TEXT;
        ALTER TABLE models ADD COLUMN input_modality TEXT DEFAULT 'text';
        ALTER TABLE models ADD COLUMN is_remote INTEGER DEFAULT 0;
        ALTER TABLE models ADD COLUMN model_weights_cid TEXT;
        ALTER TABLE models ADD COLUMN model_config_cid TEXT;
      `);
      console.log('[DB] Added remote compute columns to models table.');
    }
  } catch (err) {
    console.error('[DB] Alter table check failed:', err.message);
  }

  // Add session_id to prompts table if not present
  try {
    const promptCols = db.pragma('table_info(prompts)');
    const hasSessionId = promptCols.some(c => c.name === 'session_id');
    if (!hasSessionId) {
      db.exec(`ALTER TABLE prompts ADD COLUMN session_id TEXT;`);
      console.log('[DB] Added session_id column to prompts table.');
    }
  } catch (err) {
    console.error('[DB] session_id migration failed:', err.message);
  }

  // Add rate limiting and usage limits columns to api_keys table if not present
  try {
    const keyCols = db.pragma('table_info(api_keys)');
    if (!keyCols.some(c => c.name === 'rate_limit_rpm')) {
      db.exec(`ALTER TABLE api_keys ADD COLUMN rate_limit_rpm INTEGER DEFAULT 60;`);
    }
    if (!keyCols.some(c => c.name === 'usage_limit_requests')) {
      db.exec(`ALTER TABLE api_keys ADD COLUMN usage_limit_requests INTEGER DEFAULT 0;`);
    }
    if (!keyCols.some(c => c.name === 'usage_limit_mon')) {
      db.exec(`ALTER TABLE api_keys ADD COLUMN usage_limit_mon REAL DEFAULT 0;`);
    }
    if (!keyCols.some(c => c.name === 'total_spent_mon')) {
      db.exec(`ALTER TABLE api_keys ADD COLUMN total_spent_mon REAL DEFAULT 0;`);
    }
  } catch (err) {
    console.error('[DB] api_keys columns migration failed:', err.message);
  }

  return db;
}

export function getDB() {
  return db;
}

// Model operations
export function saveModel(model) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO models (
      id, name, description, category, ipfs_cid, owner_address, ollama_model, price_per_use, subscription_price, rate_limit, encryption_key,
      compute_node_url, input_modality, is_remote, model_weights_cid, model_config_cid
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    model.id, model.name, model.description, model.category, model.ipfsCid, model.ownerAddress, model.ollamaModel, model.pricePerUse, model.subscriptionPrice, model.rateLimit, model.encryptionKey,
    model.computeNodeUrl || null, model.inputModality || 'text', model.isRemote ? 1 : 0, model.modelWeightsCid || null, model.modelConfigCid || null
  );
}

export function deleteModel(id) {
  // Soft delete by setting is_active = 0
  return db.prepare('UPDATE models SET is_active = 0 WHERE id = ?').run(id);
}

export function getModels() {
  return db.prepare('SELECT * FROM models WHERE is_active = 1').all();
}

export function getModelById(id) {
  return db.prepare('SELECT * FROM models WHERE id = ?').get(id);
}

// Prompt operations
export function savePrompt(prompt) {
  const stmt = db.prepare(`
    INSERT INTO prompts (id, model_id, user_address, session_id, prompt_text, encrypted_prompt_cid, input_tokens, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(prompt.id, prompt.modelId, prompt.userAddress, prompt.sessionId || null, prompt.promptText, prompt.encryptedPromptCid, prompt.inputTokens, prompt.status || 'pending');
}

export function updatePromptResponse(promptId, response) {
  const stmt = db.prepare(`
    UPDATE prompts SET response_text = ?, response_cid = ?, output_tokens = ?, status = ?, tx_hash = ?, duration_ms = ?, completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(response.responseText, response.responseCid, response.outputTokens, 'completed', response.txHash, response.durationMs, promptId);
}

export function getPromptsByUser(userAddress) {
  return db.prepare('SELECT * FROM prompts WHERE user_address = ? ORDER BY created_at DESC LIMIT 50').all(userAddress);
}

// User operations
export function getOrCreateUser(address) {
  let user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  if (!user) {
    db.prepare('INSERT INTO users (address, balance) VALUES (?, 100)').run(address);
    user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  }
  return user;
}

export function updateUserBalance(address, amount) {
  db.prepare('UPDATE users SET balance = balance + ?, total_spent = total_spent + ? WHERE address = ?').run(amount, amount < 0 ? Math.abs(amount) : 0, address);
}

// Rate limiting
export function checkRateLimit(userAddress, modelId, limit) {
  const row = db.prepare('SELECT * FROM rate_limits WHERE user_address = ? AND model_id = ?').get(userAddress, modelId);

  if (!row) {
    db.prepare('INSERT INTO rate_limits (user_address, model_id, request_count) VALUES (?, ?, 1)').run(userAddress, modelId);
    return true;
  }

  const windowStart = new Date(row.window_start);
  const now = new Date();
  const diffMinutes = (now - windowStart) / 60000;

  if (diffMinutes >= 1) {
    db.prepare('UPDATE rate_limits SET request_count = 1, window_start = CURRENT_TIMESTAMP WHERE user_address = ? AND model_id = ?').run(userAddress, modelId);
    return true;
  }

  if (row.request_count >= limit) return false;

  db.prepare('UPDATE rate_limits SET request_count = request_count + 1 WHERE user_address = ? AND model_id = ?').run(userAddress, modelId);
  return true;
}

export function incrementModelUses(modelId) {
  db.prepare('UPDATE models SET total_uses = total_uses + 1 WHERE id = ?').run(modelId);
}

// Subscription operations
export function createSubscription(sub) {
  const stmt = db.prepare(`
    INSERT INTO subscriptions (id, user_address, model_id, tokens_allocated, expires_at)
    VALUES (?, ?, ?, ?, datetime('now', '+30 days'))
  `);
  return stmt.run(sub.id, sub.userAddress, sub.modelId, sub.tokensAllocated);
}

export function getSubscription(userAddress, modelId) {
  return db.prepare(`
    SELECT * FROM subscriptions 
    WHERE user_address = ? AND model_id = ? AND status = 'active' AND expires_at > datetime('now')
    ORDER BY created_at DESC LIMIT 1
  `).get(userAddress, modelId);
}

export function getUserSubscriptions(userAddress) {
  return db.prepare(`
    SELECT s.*, m.name as model_name, m.ipfs_cid, m.owner_address
    FROM subscriptions s
    JOIN models m ON s.model_id = m.id
    WHERE s.user_address = ? AND s.status = 'active'
    ORDER BY s.created_at DESC
  `).all(userAddress);
}

export function getOwnerSubscriptionStats(ownerAddress) {
  const subscribers = db.prepare(`
    SELECT count(DISTINCT s.user_address) as count, s.model_id
    FROM subscriptions s
    JOIN models m ON s.model_id = m.id
    WHERE m.owner_address = ? AND s.status = 'active' AND s.expires_at > datetime('now')
    GROUP BY s.model_id
  `).all(ownerAddress);

  const tokens = db.prepare(`
    SELECT sum(s.tokens_allocated) as total_allocated, sum(s.tokens_used) as total_burnt, s.model_id
    FROM subscriptions s
    JOIN models m ON s.model_id = m.id
    WHERE m.owner_address = ?
    GROUP BY s.model_id
  `).all(ownerAddress);

  return { subscribers, tokens };
}

export function updateSubscriptionTokens(id, tokensUsed) {
  db.prepare('UPDATE subscriptions SET tokens_used = tokens_used + ? WHERE id = ?').run(tokensUsed, id);
}

// API Key operations
export function createApiKey({ id, keyHash, keyPrefix, userAddress, name, rateLimitRpm, usageLimitRequests, usageLimitMon }) {
  const stmt = db.prepare(`
    INSERT INTO api_keys (
      id, key_hash, key_prefix, user_address, name,
      rate_limit_rpm, usage_limit_requests, usage_limit_mon, total_spent_mon
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  return stmt.run(
    id,
    keyHash,
    keyPrefix,
    userAddress,
    name || 'Default',
    Number(rateLimitRpm) || 60,
    Number(usageLimitRequests) || 0,
    Number(usageLimitMon) || 0
  );
}

export function getApiKeyByHash(keyHash) {
  return db.prepare(`
    SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1
  `).get(keyHash);
}

export function getApiKeysByUser(userAddress) {
  return db.prepare(`
    SELECT id, key_prefix, name, is_active, total_requests, total_tokens_used,
           rate_limit_rpm, usage_limit_requests, usage_limit_mon, total_spent_mon,
           created_at, last_used_at
    FROM api_keys WHERE user_address = ?
    ORDER BY created_at DESC
  `).all(userAddress);
}

export function revokeApiKey(keyId, userAddress) {
  return db.prepare(`
    UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_address = ?
  `).run(keyId, userAddress);
}

export function updateApiKeyUsage(keyId, tokensUsed, costMon = 0) {
  db.prepare(`
    UPDATE api_keys 
    SET total_requests = total_requests + 1,
        total_tokens_used = total_tokens_used + ?,
        total_spent_mon = total_spent_mon + ?,
        last_used_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(tokensUsed, costMon, keyId);
}

export function updateApiKeyLimits(keyId, userAddress, { rateLimitRpm, usageLimitRequests, usageLimitMon }) {
  return db.prepare(`
    UPDATE api_keys 
    SET rate_limit_rpm = ?, usage_limit_requests = ?, usage_limit_mon = ?
    WHERE id = ? AND user_address = ?
  `).run(
    Number(rateLimitRpm) || 60,
    Number(usageLimitRequests) || 0,
    Number(usageLimitMon) || 0,
    keyId,
    userAddress
  );
}

export function checkApiKeyRateLimit(keyId, limitRpm = 60) {
  const limit = Number(limitRpm) || 60;
  const now = Date.now();
  const row = db.prepare('SELECT * FROM api_key_rate_limits WHERE key_id = ?').get(keyId);

  if (!row) {
    db.prepare('INSERT OR REPLACE INTO api_key_rate_limits (key_id, request_count, window_start) VALUES (?, 1, ?)').run(keyId, now);
    return { allowed: true, remaining: limit - 1, limit, resetInSeconds: 60 };
  }

  // Support both epoch integer or UTC date string
  let windowStart = typeof row.window_start === 'number'
    ? row.window_start
    : (new Date(String(row.window_start).endsWith('Z') ? row.window_start : row.window_start + 'Z').getTime());

  if (isNaN(windowStart)) windowStart = now;

  const elapsedMs = now - windowStart;
  const elapsedSec = elapsedMs / 1000;

  if (elapsedSec >= 60) {
    db.prepare('UPDATE api_key_rate_limits SET request_count = 1, window_start = ? WHERE key_id = ?').run(now, keyId);
    return { allowed: true, remaining: limit - 1, limit, resetInSeconds: 60 };
  }

  if (row.request_count >= limit) {
    return { allowed: false, remaining: 0, limit, resetInSeconds: Math.ceil(60 - elapsedSec) };
  }

  db.prepare('UPDATE api_key_rate_limits SET request_count = request_count + 1 WHERE key_id = ?').run(keyId);
  return { allowed: true, remaining: limit - (row.request_count + 1), limit, resetInSeconds: Math.ceil(60 - elapsedSec) };
}

export function checkApiKeyUsageLimits(keyRecord, costMon = 0) {
  if (!keyRecord) return { allowed: true };

  // 1. Check max requests cap
  if (keyRecord.usage_limit_requests && keyRecord.usage_limit_requests > 0) {
    if (keyRecord.total_requests >= keyRecord.usage_limit_requests) {
      return {
        allowed: false,
        reason: `API key has reached its request limit of ${keyRecord.usage_limit_requests} requests.`,
        type: 'request_limit_exceeded',
      };
    }
  }

  // 2. Check MON budget spend cap
  if (keyRecord.usage_limit_mon && keyRecord.usage_limit_mon > 0) {
    const projectedSpend = (keyRecord.total_spent_mon || 0) + costMon;
    if (projectedSpend > keyRecord.usage_limit_mon) {
      return {
        allowed: false,
        reason: `API key has reached its spend budget limit of ${keyRecord.usage_limit_mon} MON (total spent: ${(keyRecord.total_spent_mon || 0).toFixed(2)} MON).`,
        type: 'budget_limit_exceeded',
      };
    }
  }

  return { allowed: true };
}

// ─── CO-OWNERSHIP OPERATIONS ────────────────────────────────

export function addCoOwner(modelId, walletAddress, sharePercent) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO model_co_owners (model_id, wallet_address, share_percent)
    VALUES (?, ?, ?)
  `);
  return stmt.run(modelId, walletAddress.toLowerCase(), sharePercent);
}

export function removeCoOwner(modelId, walletAddress) {
  return db.prepare('DELETE FROM model_co_owners WHERE model_id = ? AND wallet_address = ?')
    .run(modelId, walletAddress.toLowerCase());
}

export function getCoOwners(modelId) {
  return db.prepare('SELECT * FROM model_co_owners WHERE model_id = ? ORDER BY added_at ASC')
    .all(modelId);
}

export function transferModelOwnership(modelId, currentOwner, newOwner) {
  const txn = db.transaction(() => {
    // Update model's primary owner
    db.prepare('UPDATE models SET owner_address = ? WHERE id = ? AND owner_address = ?')
      .run(newOwner.toLowerCase(), modelId, currentOwner.toLowerCase());

    // Remove new owner from co-owners if they were one
    db.prepare('DELETE FROM model_co_owners WHERE model_id = ? AND wallet_address = ?')
      .run(modelId, newOwner.toLowerCase());
  });
  txn();
}

export function getModelsSharedWithMe(walletAddress) {
  return db.prepare(`
    SELECT m.*, co.share_percent
    FROM model_co_owners co
    JOIN models m ON co.model_id = m.id
    WHERE co.wallet_address = ? AND m.is_active = 1
  `).all(walletAddress.toLowerCase());
}

// ── Withdrawals ──
export function createWithdrawal({ id, walletAddress, amount, currency, localAmount, method, payoutInfo }) {
  db.prepare(`
    INSERT INTO withdrawals (id, wallet_address, amount, currency, local_amount, method, status, payout_info)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(id, walletAddress.toLowerCase(), amount, currency, localAmount, method, payoutInfo || '');
}

export function getWithdrawals(walletAddress) {
  return db.prepare('SELECT * FROM withdrawals WHERE wallet_address = ? ORDER BY created_at DESC').all(walletAddress.toLowerCase());
}

export function updateWithdrawalStatus(id, status) {
  db.prepare('UPDATE withdrawals SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
}

