import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { generateKey, encrypt } from '../services/encryption.js';
import { uploadToIPFS } from '../services/ipfs.js';
import { registerModelOnChain } from '../services/blockchain.js';
import { saveModel, getModels, getModelById, deleteModel, getOwnerSubscriptionStats } from '../db/sqlite.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for demo purposes
});

/**
 * POST /api/models/upload
 * Register a new AI model on the platform (Supports Custom Weights)
 */
router.post('/upload', upload.fields([{ name: 'weightsFile' }, { name: 'configFile' }]), async (req, res) => {
  try {
    const { name, description, category, ollamaModel, pricePerUse, subscriptionPrice, rateLimit, ownerAddress, computeNodeUrl, inputModality, isRemote } = req.body;

    if (!name || (!ollamaModel && !isRemote) || !ownerAddress) {
      return res.status(400).json({ error: 'Missing required fields: name, model identifier, ownerAddress' });
    }

    const modelId = uuidv4();
    const encryptionKey = generateKey();

    // Handle Custom Files (IPFS upload for weights and config)
    let weightsCid = null;
    let configCid = null;

    if (isRemote === 'true' && req.files) {
      if (req.files.weightsFile?.[0]) {
        console.log(`[Models] Uploading weights file to IPFS for ${modelId}`);
        const result = await uploadToIPFS(req.files.weightsFile[0].buffer, `weights_${modelId}.pt`);
        weightsCid = result.cid;
      }
      if (req.files.configFile?.[0]) {
        console.log(`[Models] Uploading config file to IPFS for ${modelId}`);
        const result = await uploadToIPFS(req.files.configFile[0].buffer, `config_${modelId}.json`);
        configCid = result.cid;
      }
    }

    // Create model metadata and encrypt it
    const metadataObj = { modelId, name, description, ollamaModel, category, inputModality, isRemote: isRemote === 'true', computeNodeUrl, weightsCid, configCid };
    const metadata = JSON.stringify(metadataObj);
    const encryptedMetadata = encrypt(metadata, encryptionKey);

    // Upload encrypted metadata to IPFS
    const { cid } = await uploadToIPFS(encryptedMetadata, `model_${modelId}`);

    // Register on blockchain (Skipped per user request to avoid 500 gas errors)
    console.log(`[Models] Bypassing blockchain registration for ${modelId}, storing locally only.`);
    // await registerModelOnChain(
    //  modelId, name, description || '', cid,
    //  category || 'text-generation',
    //  Number(pricePerUse) || 1, Number(subscriptionPrice) || 10, Number(rateLimit) || 10
    // );

    // Save to local DB
    saveModel({
      id: modelId,
      name,
      description: description || '',
      category: category || 'text-generation',
      ipfsCid: cid,
      ownerAddress,
      ollamaModel: ollamaModel || '',
      pricePerUse: Number(pricePerUse) || 1,
      subscriptionPrice: Number(subscriptionPrice) || 10,
      rateLimit: Number(rateLimit) || 10,
      encryptionKey,
      computeNodeUrl: computeNodeUrl || null,
      inputModality: inputModality || 'text',
      isRemote: isRemote === 'true',
      modelWeightsCid: weightsCid,
      modelConfigCid: configCid
    });

    res.json({
      success: true,
      model: {
        id: modelId,
        name,
        category: category || 'text-generation',
        inputModality: inputModality || 'text',
        isRemote: isRemote === 'true',
      }
    });

  } catch (err) {
    console.error('[Models API] Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/models/:id
 * Remove a model from the marketplace
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ownerAddress } = req.body;

    if (!ownerAddress) return res.status(400).json({ error: 'ownerAddress required' });

    const model = getModelById(id);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    if (model.owner_address !== ownerAddress) return res.status(403).json({ error: 'Unauthorized to delete this model' });

    // Check active subscriptions
    const { subscribers } = getOwnerSubscriptionStats(ownerAddress);
    const modelSubs = subscribers.find(s => s.model_id === id);

    if (modelSubs && modelSubs.count > 0) {
      return res.status(400).json({ error: `Cannot delete model: it has ${modelSubs.count} active subscribers. Please wait for subscriptions to expire.` });
    }

    // Soft delete
    deleteModel(id);

    res.json({ success: true, message: 'Model successfully removed from marketplace.' });

  } catch (err) {
    console.error('[Models API] Delete error:', err);
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
