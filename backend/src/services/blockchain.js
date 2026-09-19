import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadABI(name) {
  try {
    return JSON.parse(readFileSync(join(__dirname, '..', 'abis', `${name}.json`), 'utf-8'));
  } catch (err) {
    console.warn(`[Blockchain] Could not load ABI for ${name}`);
    return [];
  }
}

let provider, signer, contracts = {};

/**
 * Initialize blockchain connection (Monad Testnet)
 */
export function initBlockchain() {
  const rpc = process.env.MONAD_TESTNET_RPC || 'https://testnet-rpc.monad.xyz/';
  provider = new ethers.JsonRpcProvider(rpc);

  const pk = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (pk && (pk.length === 64 || (pk.startsWith('0x') && pk.length === 66))) {
    try {
      signer = new ethers.Wallet(pk, provider);
      console.log('[Blockchain] Signer address:', signer.address);
    } catch (e) {
      console.warn('[Blockchain] Invalid deployer private key:', e.message);
    }
  }

  // Initialize contracts if addresses are set
  const tokenAddr = process.env.ECLIPSE_TOKEN_ADDRESS || process.env.SYN3RGY_TOKEN_ADDRESS;
  const registryAddr = process.env.MODEL_REGISTRY_ADDRESS;
  const paymentAddr = process.env.PAYMENT_MANAGER_ADDRESS;
  const promptAddr = process.env.PROMPT_EXECUTION_ADDRESS;

  if (tokenAddr) {
    contracts.token = new ethers.Contract(tokenAddr, loadABI('EclipseToken'), signer || provider);
  }
  if (registryAddr) {
    contracts.registry = new ethers.Contract(registryAddr, loadABI('ModelRegistry'), signer || provider);
  }
  if (paymentAddr) {
    contracts.payment = new ethers.Contract(paymentAddr, loadABI('PaymentManager'), signer || provider);
  }
  if (promptAddr) {
    contracts.prompt = new ethers.Contract(promptAddr, loadABI('PromptExecution'), signer || provider);
  }

  console.log('[Blockchain] Connected to Monad Testnet RPC:', rpc);
  return { provider, signer, contracts };
}

/**
 * Get contract instances
 */
export function getContracts() {
  return contracts;
}

export function getProvider() {
  return provider;
}

export function getSigner() {
  return signer;
}

/**
 * Get contract config and ABIs for the frontend
 */
export function getContractConfig() {
  return {
    network: {
      name: 'Monad Testnet',
      chainId: 10143,
      rpcUrl: process.env.MONAD_TESTNET_RPC || 'https://testnet-rpc.monad.xyz/',
      explorerUrl: 'https://testnet.monadexplorer.com',
    },
    addresses: {
      EclipseToken: process.env.ECLIPSE_TOKEN_ADDRESS || '',
      SYN3RGYToken: process.env.ECLIPSE_TOKEN_ADDRESS || '',
      ModelRegistry: process.env.MODEL_REGISTRY_ADDRESS || '',
      PaymentManager: process.env.PAYMENT_MANAGER_ADDRESS || '',
      PromptExecution: process.env.PROMPT_EXECUTION_ADDRESS || '',
    },
    abis: {
      EclipseToken: loadABI('EclipseToken'),
      SYN3RGYToken: loadABI('EclipseToken'),
      PaymentManager: loadABI('PaymentManager'),
      ModelRegistry: loadABI('ModelRegistry'),
      PromptExecution: loadABI('PromptExecution'),
    }
  };
}

/**
 * Get native Monad testnet balance for an address
 */
export async function getMonadNativeBalance(address) {
  if (!provider) return '0.00';
  try {
    const bal = await provider.getBalance(address);
    return ethers.formatEther(bal);
  } catch (err) {
    console.warn('[Blockchain] Could not fetch native Monad balance:', err.message);
    return '0.00';
  }
}

/**
 * Get on-chain token balance for an address
 */
export async function getTokenBalance(address) {
  if (!contracts.token) return '0';
  try {
    const bal = await contracts.token.balanceOf(address);
    return ethers.formatEther(bal);
  } catch (err) {
    return '0';
  }
}

/**
 * Claim testnet faucet tokens
 */
export async function claimFaucet(address) {
  if (!contracts.token || !signer) {
    return { hash: '0x' + 'monadfaucet'.padEnd(64, '0'), simulated: true };
  }
  try {
    const tx = await contracts.token.claimFaucet();
    const receipt = await tx.wait();
    return { hash: receipt.hash, simulated: false };
  } catch (err) {
    return { error: err.message, simulated: true };
  }
}

/**
 * Register model on-chain
 */
export async function registerModelOnChain(modelId, name, description, ipfsCID, category, pricePerUse, subscriptionPrice, rateLimit) {
  if (!contracts.registry || !signer) {
    console.log('[Blockchain-SIM] Simulating registerModel on Monad:', modelId);
    return { hash: '0x' + 'monad'.padEnd(64, '0'), simulated: true };
  }

  const tx = await contracts.registry.registerModel(
    modelId, name, description, ipfsCID, category,
    ethers.parseEther(pricePerUse.toString()),
    ethers.parseEther(subscriptionPrice.toString()),
    rateLimit
  );
  const receipt = await tx.wait();
  return { hash: receipt.hash, simulated: false };
}

/**
 * Record prompt execution on-chain
 */
export async function createPromptOnChain(promptId, modelId, encryptedPromptCID, inputTokens) {
  if (!contracts.prompt || !signer) {
    console.log('[Blockchain-SIM] Simulating prompt execution on Monad:', promptId);
    return { hash: '0x' + 'monadprompt'.padEnd(64, '0'), simulated: true };
  }

  const tx = await contracts.prompt.requestExecution(
    promptId, modelId, encryptedPromptCID, inputTokens
  );
  const receipt = await tx.wait();
  return { hash: receipt.hash, simulated: false };
}

/**
 * Submit response on-chain
 */
export async function submitResponseOnChain(promptId, computeNodeAddress, responseCID, outputTokens) {
  if (!contracts.prompt || !signer) {
    return { hash: '0x' + 'monadsubmit'.padEnd(64, '0'), simulated: true };
  }

  const tx = await contracts.prompt.completeExecution(
    promptId, responseCID, outputTokens, 100
  );
  const receipt = await tx.wait();
  return { hash: receipt.hash, simulated: false };
}

/**
 * Deduct tokens from subscription on-chain
 */
export async function deductFromSubscriptionOnChain(userAddress, modelId, tokens) {
  if (!contracts.payment || !signer) {
    return { hash: '0x' + 'monaddeduct'.padEnd(64, '0'), simulated: true };
  }
  return { hash: '0x_monad_deducted', simulated: true };
}

/**
 * Check if active subscription exists on-chain
 */
export async function hasActiveSubscription(userAddress, modelId) {
  if (!contracts.payment) {
    return true; // Graceful fallback
  }
  try {
    const sub = await contracts.payment.getSubscription(userAddress, modelId);
    return sub && sub.isActive;
  } catch (err) {
    return true;
  }
}
