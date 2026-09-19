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

// Import modules
import { initDB } from './db/sqlite.js';
import { initBlockchain } from './services/blockchain.js';
import { testConnection } from './services/ipfs.js';
import { healthCheck } from './services/compute.js';

// Import routes
import modelRoutes from './routes/models.js';
import executionRoutes from './routes/execution.js';
import walletRoutes from './routes/wallet.js';
import historyRoutes from './routes/history.js';
import subscriptionRoutes from './routes/subscriptions.js';
import apiKeyRoutes from './routes/apikeys.js';
import inferenceRoutes from './routes/inference.js';
import paymentRoutes from './routes/payments.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Initialize services
console.log('\n🚀 Starting ECLIPSE.AI Backend (Monad Testnet)...\n');

const db = initDB();
const blockchain = initBlockchain();

// Routes
app.use('/api/models', modelRoutes);
app.use('/api/execute', executionRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/v1', inferenceRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const ipfs = await testConnection();
  const compute = await healthCheck();

  res.json({
    status: 'ok',
    platform: 'ECLIPSE',
    network: 'Monad Testnet',
    chainId: 10143,
    version: '1.0.0',
    services: {
      database: { connected: true },
      blockchain: {
        connected: !!blockchain.signer,
        network: 'Monad Testnet',
        chainId: 10143,
      },
      ipfs,
      compute,
    },
  });
});

// App Config for frontend Web3
app.get('/api/config', async (req, res) => {
  const { getContractConfig } = await import('./services/blockchain.js');
  res.json({
    success: true,
    config: getContractConfig()
  });
});

// Seed demo Groq models
app.get('/api/seed', async (req, res) => {
  const { getModels, saveModel } = await import('./db/sqlite.js');
  const { generateKey } = await import('./services/encryption.js');

  const demoModels = [
    {
      id: 'llama-3.3-70b',
      name: 'Llama 3.3 70B Versatile',
      description: 'Meta\'s flagship open model running on Groq LPU inference. Exceptional reasoning, coding, and multilingual performance at ultra-high speed.',
      category: 'general-intelligence',
      ipfsCid: 'QmEclipse_Llama33_70B_Encrypted_CID',
      ownerAddress: '0x0D53ae112F699a30Af6daC175E353172B7Db7cB9',
      ollamaModel: 'llama-3.3-70b-versatile',
      pricePerUse: 1,
      subscriptionPrice: 10,
      rateLimit: 30,
      encryptionKey: generateKey(),
    },
    {
      id: 'llama-3.1-8b',
      name: 'Llama 3.1 8B Instant',
      description: 'Ultra-fast low-latency text model powered by Groq LPUs. Ideal for real-time assistants, classification, and summarization.',
      category: 'instant-chat',
      ipfsCid: 'QmEclipse_Llama31_8B_Encrypted_CID',
      ownerAddress: '0x0D53ae112F699a30Af6daC175E353172B7Db7cB9',
      ollamaModel: 'llama-3.1-8b-instant',
      pricePerUse: 0.5,
      subscriptionPrice: 5,
      rateLimit: 60,
      encryptionKey: generateKey(),
    },
    {
      id: 'mixtral-8x7b',
      name: 'Mixtral 8x7B MoE',
      description: 'Mistral\'s leading mixture-of-experts model on Groq. High quality across code, mathematics, and complex reasoning.',
      category: 'reasoning',
      ipfsCid: 'QmEclipse_Mixtral_8x7B_Encrypted_CID',
      ownerAddress: '0x0D53ae112F699a30Af6daC175E353172B7Db7cB9',
      ollamaModel: 'mixtral-8x7b-32768',
      pricePerUse: 1.5,
      subscriptionPrice: 15,
      rateLimit: 30,
      encryptionKey: generateKey(),
    },
  ];

  for (const model of demoModels) {
    saveModel(model);
  }

  res.json({ message: 'ECLIPSE Groq models seeded', models: demoModels.map(m => ({ id: m.id, name: m.name })) });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ ECLIPSE Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌱 Seed models:  http://localhost:${PORT}/api/seed\n`);
});

export default app;
