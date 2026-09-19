import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateKey, encrypt } from '../services/encryption.js';
import { uploadToIPFS } from '../services/ipfs.js';
import { registerModelOnChain } from '../services/blockchain.js';
import { saveModel, getModels, getModelById } from '../db/sqlite.js';

const router = Router();

/**
 * POST /api/models/upload
 * Register a new AI model on the platform
 */
router.post('/upload', async (req, res) => {
  try {
    const { name, description, category, ollamaModel, pricePerUse, subscriptionPrice, rateLimit, ownerAddress } = req.body;

    if (!name || !ollamaModel || !ownerAddress) {
      return res.status(400).json({ error: 'Missing required fields: name, ollamaModel, ownerAddress' });
    }

    const modelId = uuidv4();
    const encryptionKey = generateKey();

    // Create model metadata and encrypt it
    const metadata = JSON.stringify({ modelId, name, description, ollamaModel, category });
    const encryptedMetadata = encrypt(metadata, encryptionKey);

    // Upload encrypted metadata to IPFS
    const { cid } = await uploadToIPFS(encryptedMetadata, `model_${modelId}`);

    // Register on blockchain
    const txResult = await registerModelOnChain(
      modelId, name, description || '', cid,
      category || 'text-generation',
      pricePerUse || 1, subscriptionPrice || 10, rateLimit || 10
    );

    // Save to local DB
    saveModel({
      id: modelId,
      name,
      description: description || '',
      category: category || 'text-generation',
      ipfsCid: cid,
      ownerAddress,
      ollamaModel,
      pricePerUse: pricePerUse || 1,
      subscriptionPrice: subscriptionPrice || 10,
      rateLimit: rateLimit || 10,
      encryptionKey,
    });

    res.json({
      success: true,
      model: {
        id: modelId,
        name,
        description,
        category: category || 'text-generation',
        ipfsCid: cid,
        ownerAddress,
        ollamaModel,
        pricePerUse: pricePerUse || 1,
        subscriptionPrice: subscriptionPrice || 10,
        rateLimit: rateLimit || 10,
      },
      blockchain: txResult,
    });
  } catch (err) {
    console.error('[Models] Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/models
 * List all available models
 */
router.get('/', (req, res) => {
  try {
    const models = getModels();
    // Strip encryption keys from response
    const safeModels = models.map(({ encryption_key, ...rest }) => rest);
    res.json({ models: safeModels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/models/:id
 * Get model details
 */
router.get('/:id', (req, res) => {
  try {
    const model = getModelById(req.params.id);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    const { encryption_key, ...safeModel } = model;
    res.json({ model: safeModel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
