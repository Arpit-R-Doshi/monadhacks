import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadABI(name) {
  return JSON.parse(readFileSync(join(__dirname, '..', 'abis', `${name}.json`), 'utf-8'));
}

let provider, signer, contracts = {};

/**
 * Initialize blockchain connection
 */
export function initBlockchain() {
  const rpc = process.env.POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology/';
  provider = new ethers.JsonRpcProvider(rpc);

  if (process.env.DEPLOYER_PRIVATE_KEY) {
    signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    console.log('[Blockchain] Signer address:', signer.address);
  }

  // Initialize contracts if addresses are set
  const tokenAddr = process.env.SYN3RGY_TOKEN_ADDRESS;
  const registryAddr = process.env.MODEL_REGISTRY_ADDRESS;
  const paymentAddr = process.env.PAYMENT_MANAGER_ADDRESS;
  const promptAddr = process.env.PROMPT_EXECUTION_ADDRESS;

  if (tokenAddr) {
    contracts.token = new ethers.Contract(tokenAddr, loadABI('SYN3RGYToken'), signer || provider);
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

  console.log('[Blockchain] Connected to', rpc);
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
 * Register model on-chain
 */
export async function registerModelOnChain(modelId, name, description, ipfsCID, category, pricePerUse, subscriptionPrice, rateLimit) {
  if (!contracts.registry) {
    console.log('[Blockchain-SIM] Simulating registerModel:', modelId);
    return { hash: '0x' + 'sim'.repeat(21), simulated: true };
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
 * Get all models from chain
 */
export async function getModelsFromChain() {
  if (!contracts.registry) return [];
  try {
    return await contracts.registry.getAllModels();
  } catch (e) {
    console.error('[Blockchain] Error getting models:', e.message);
    return [];
  }
}

/**
 * Record prompt on-chain
 */
export async function createPromptOnChain(promptId, modelId, encryptedPromptCID, inputTokens) {
  if (!contracts.prompt) {
    console.log('[Blockchain-SIM] Simulating createPrompt:', promptId);
    return { hash: '0x' + 'sim'.repeat(21), simulated: true };
  }

  const tx = await contracts.prompt.createPrompt(promptId, modelId, encryptedPromptCID, inputTokens);
  const receipt = await tx.wait();
  return { hash: receipt.hash, simulated: false };
}

/**
 * Submit response on-chain
 */
export async function submitResponseOnChain(promptId, computeNode, responseCID, outputTokens) {
  if (!contracts.prompt) {
    return { hash: '0x' + 'sim'.repeat(21), simulated: true };
  }

  const tx = await contracts.prompt.submitResponse(promptId, computeNode, responseCID, outputTokens);
  const receipt = await tx.wait();
  return { hash: receipt.hash, simulated: false };
}

/**
 * Get SYN token balance
 */
export async function getTokenBalance(address) {
  if (!contracts.token) return '0';
  const balance = await contracts.token.balanceOf(address);
  return ethers.formatEther(balance);
}

/**
 * Claim faucet tokens
 */
export async function claimFaucet(userAddress) {
  if (!contracts.token) {
    return { hash: '0x' + 'sim'.repeat(21), simulated: true, balance: '100' };
  }

  // Mint tokens to user via owner
  const tx = await contracts.token.mint(userAddress, ethers.parseEther('100'));
  const receipt = await tx.wait();
  const balance = await getTokenBalance(userAddress);
  return { hash: receipt.hash, simulated: false, balance };
}
