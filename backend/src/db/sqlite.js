import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', '..', 'synergy.db');
let db;

export function initDB() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

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
  `);

  console.log('[DB] SQLite initialized at', DB_PATH);
  return db;
}

export function getDB() {
  return db;
}

// Model operations
export function saveModel(model) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO models (id, name, description, category, ipfs_cid, owner_address, ollama_model, price_per_use, subscription_price, rate_limit, encryption_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(model.id, model.name, model.description, model.category, model.ipfsCid, model.ownerAddress, model.ollamaModel, model.pricePerUse, model.subscriptionPrice, model.rateLimit, model.encryptionKey);
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
    INSERT INTO prompts (id, model_id, user_address, prompt_text, encrypted_prompt_cid, input_tokens, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(prompt.id, prompt.modelId, prompt.userAddress, prompt.promptText, prompt.encryptedPromptCid, prompt.inputTokens, prompt.status || 'pending');
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
