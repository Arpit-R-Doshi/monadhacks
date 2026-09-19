import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env'), override: true });
dotenv.config({ path: join(__dirname, '..', '..', '.env'), override: true });
console.log('[Config] OLLAMA_URL =', process.env.OLLAMA_URL);

// Import modules
import { initDB } from './db/sqlite.js';
import { initBlockchain } from './services/blockchain.js';
import { testConnection } from './services/ipfs.js';
import { healthCheck } from './services/compute.js';

// Import routes
import modelRoutes from './routes/models.js';
import executionRoutes from './routes/execution.js';
import walletRoutes from './routes/wallet.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Initialize services
console.log('\n🚀 Starting SYN3RGY Backend...\n');

const db = initDB();
const blockchain = initBlockchain();

// Routes
app.use('/api/models', modelRoutes);
app.use('/api/execute', executionRoutes);
app.use('/api/wallet', walletRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const ipfs = await testConnection();
  const compute = await healthCheck();

  res.json({
    status: 'ok',
    platform: 'SYN3RGY',
    version: '1.0.0',
    services: {
      database: { connected: true },
      blockchain: {
        connected: !!blockchain.signer,
        network: 'Polygon Amoy',
        chainId: 80002,
      },
      ipfs,
      compute,
    },
  });
});

// Seed demo models if DB is empty
app.get('/api/seed', async (req, res) => {
  const { getModels, saveModel } = await import('./db/sqlite.js');
  const { generateKey } = await import('./services/encryption.js');

  const existing = getModels();
  if (existing.length > 0) {
    return res.json({ message: 'Models already seeded', count: existing.length });
  }

  const demoModels = [
    {
      id: 'gemma-2b-demo',
      name: 'Gemma 2B',
      description: 'Google\'s lightweight open model. Fast and efficient for general text generation, summarization, and Q&A tasks. Ideal for quick responses with low latency.',
      category: 'text-generation',
      ipfsCid: 'QmDemo_Gemma2B_Encrypted_Model_CID',
      ownerAddress: '0xDemoOwner1',
      ollamaModel: 'gemma:2b',
      pricePerUse: 1,
      subscriptionPrice: 10,
      rateLimit: 10,
      encryptionKey: generateKey(),
    },
    {
      id: 'llama3-8b-demo',
      name: 'Llama 3 8B',
      description: 'Meta\'s powerful open-source LLM. Excellent for complex reasoning, code generation, and creative writing. Best balance of quality and speed.',
      category: 'text-generation',
      ipfsCid: 'QmDemo_Llama3_8B_Encrypted_Model_CID',
      ownerAddress: '0xDemoOwner2',
      ollamaModel: 'llama3:8b',
      pricePerUse: 2,
      subscriptionPrice: 20,
      rateLimit: 10,
      encryptionKey: generateKey(),
    },
  ];

  for (const model of demoModels) {
    saveModel(model);
  }

  res.json({ message: 'Demo models seeded', models: demoModels.map(m => ({ id: m.id, name: m.name })) });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ SYN3RGY Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌱 Seed models:  http://localhost:${PORT}/api/seed\n`);
});

export default app;
