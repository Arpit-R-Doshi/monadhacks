import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { generateKey, encrypt } from '../services/encryption.js';
import { uploadToIPFS } from '../services/ipfs.js';
import { registerModelOnChain } from '../services/blockchain.js';
import { saveModel, getModels, getModelById, deleteModel, getOwnerSubscriptionStats, addCoOwner, removeCoOwner, getCoOwners, transferModelOwnership, getModelsSharedWithMe } from '../db/sqlite.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for demo purposes
});

// Helper: parse a number, treating NaN as missing so that 0 is preserved as a valid value
function numOrDefault(val, fallback) {
  const n = Number(val);
  return Number.isNaN(n) ? fallback : n;
}

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

    // Register on blockchain (graceful — saves to DB regardless)
    try {
      await registerModelOnChain(
        modelId, name, description || '', cid,
        category || 'text-generation',
        numOrDefault(pricePerUse, 1), numOrDefault(subscriptionPrice, 10), numOrDefault(rateLimit, 10)
      );
      console.log(`[Models] ✅ Registered ${modelId} on-chain.`);
    } catch (chainErr) {
      console.warn(`[Models] ⚠️ On-chain registration failed (model will still be saved locally): ${chainErr.shortMessage || chainErr.message}`);
    }

    // Save to local DB
    saveModel({
      id: modelId,
      name,
      description: description || '',
      category: category || 'text-generation',
      ipfsCid: cid,
      ownerAddress,
      ollamaModel: ollamaModel || '',
      pricePerUse: numOrDefault(pricePerUse, 1),
      subscriptionPrice: numOrDefault(subscriptionPrice, 10),
      rateLimit: numOrDefault(rateLimit, 10),
      encryptionKey,
      computeNodeUrl: computeNodeUrl || null,
      inputModality: inputModality || 'text',
      isRemote: isRemote === 'true',
      modelWeightsCid: weightsCid,
      modelConfigCid: configCid
    });

    // Handle co-owners passed during upload
    const coOwnersRaw = req.body.coOwners;
    if (coOwnersRaw) {
      try {
        const coOwners = JSON.parse(coOwnersRaw);
        let totalShare = 0;
        for (const co of coOwners) {
          if (co.address && co.sharePercent > 0) {
            totalShare += co.sharePercent;
            if (totalShare > 100) break;
            addCoOwner(modelId, co.address, co.sharePercent);
          }
        }
        console.log(`[Models] Added ${coOwners.length} co-owners for ${modelId}`);
      } catch (e) {
        console.warn('[Models] Failed to parse coOwners:', e.message);
      }
    }

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
 * GET /api/models/shared/:wallet
 * Get models shared with a wallet (MUST be before /:id)
 */
router.get('/shared/:wallet', (req, res) => {
  try {
    const models = getModelsSharedWithMe(req.params.wallet);
    const safeModels = models.map(({ encryption_key, ...rest }) => rest);
    res.json({ success: true, models: safeModels });
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

// ─── CO-OWNERSHIP ROUTES ────────────────────────────────────

/**
 * POST /api/models/:id/share
 * Add or update co-owners for a model
 */
router.post('/:id/share', (req, res) => {
  try {
    const { id } = req.params;
    const { ownerAddress, coOwners } = req.body;

    if (!ownerAddress || !coOwners || !Array.isArray(coOwners)) {
      return res.status(400).json({ error: 'ownerAddress and coOwners array required' });
    }

    const model = getModelById(id);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    if (model.owner_address.toLowerCase() !== ownerAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Only the primary owner can manage co-owners' });
    }

    // Validate total doesn't exceed 100
    let totalShare = 0;
    for (const co of coOwners) {
      if (!co.address || co.sharePercent <= 0 || co.sharePercent > 100) {
        return res.status(400).json({ error: `Invalid co-owner entry: ${JSON.stringify(co)}` });
      }
      if (co.address.toLowerCase() === ownerAddress.toLowerCase()) {
        return res.status(400).json({ error: 'Primary owner cannot be added as co-owner' });
      }
      totalShare += co.sharePercent;
    }
    if (totalShare > 100) {
      return res.status(400).json({ error: `Total share ${totalShare}% exceeds 100%` });
    }

    // Clear existing co-owners and re-add
    const existing = getCoOwners(id);
    for (const co of existing) {
      removeCoOwner(id, co.wallet_address);
    }
    for (const co of coOwners) {
      addCoOwner(id, co.address, co.sharePercent);
    }

    res.json({ success: true, message: `${coOwners.length} co-owners updated.` });
  } catch (err) {
    console.error('[Models API] Share error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/models/:id/co-owners
 * List co-owners for a model
 */
router.get('/:id/co-owners', (req, res) => {
  try {
    const coOwners = getCoOwners(req.params.id);
    res.json({ success: true, coOwners });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/models/:id/co-owners/:wallet
 * Remove a single co-owner
 */
router.delete('/:id/co-owners/:wallet', (req, res) => {
  try {
    const { id, wallet } = req.params;
    const { ownerAddress } = req.body;

    const model = getModelById(id);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    if (model.owner_address.toLowerCase() !== ownerAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Only the primary owner can remove co-owners' });
    }

    removeCoOwner(id, wallet);
    res.json({ success: true, message: 'Co-owner removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/models/:id/transfer
 * Transfer full ownership of a model
 */
router.post('/:id/transfer', (req, res) => {
  try {
    const { id } = req.params;
    const { currentOwner, newOwner } = req.body;

    if (!currentOwner || !newOwner) {
      return res.status(400).json({ error: 'currentOwner and newOwner required' });
    }
    if (currentOwner.toLowerCase() === newOwner.toLowerCase()) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }

    const model = getModelById(id);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    if (model.owner_address.toLowerCase() !== currentOwner.toLowerCase()) {
      return res.status(403).json({ error: 'You are not the owner of this model' });
    }

    transferModelOwnership(id, currentOwner, newOwner);

    res.json({ success: true, message: `Ownership transferred to ${newOwner}` });
  } catch (err) {
    console.error('[Models API] Transfer error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
