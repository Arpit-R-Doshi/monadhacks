import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const NODE_ADDRESS = process.env.NODE_ADDRESS || '0xComputeNode1';

console.log(`
╔═══════════════════════════════════════════╗
║     SYN3RGY Compute Node Worker          ║
║     Listening for inference requests     ║
╠═══════════════════════════════════════════╣
║  Backend:  ${BACKEND_URL.padEnd(30)}║
║  Ollama:   ${OLLAMA_URL.padEnd(30)}║
║  Node:     ${NODE_ADDRESS.slice(0, 28).padEnd(30)}║
╚═══════════════════════════════════════════╝
`);

// Check Ollama health
async function checkOllama() {
  try {
    const res = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
    const models = res.data.models?.map(m => m.name) || [];
    console.log('✅ Ollama connected. Models:', models.join(', '));
    return true;
  } catch (err) {
    console.log('⚠️  Ollama not reachable:', err.message);
    return false;
  }
}

// Poll for pending prompts (simplified event-driven alternative)
async function pollForPrompts() {
  console.log('🔄 Polling for pending prompts...');
  
  // In a full implementation, this would listen to blockchain events:
  // contracts.prompt.on('PromptCreated', async (promptId, modelId, user, cid) => {...})
  // For demo, the backend handles execution directly when /api/execute is called
  
  console.log('ℹ️  Note: In this architecture, the backend acts as the compute orchestrator.');
  console.log('   The backend calls Ollama directly when /api/execute is invoked.');
  console.log('   For a fully decentralized setup, this worker would:');
  console.log('   1. Listen for PromptCreated events from the blockchain');
  console.log('   2. Fetch encrypted prompts from IPFS');
  console.log('   3. Decrypt and run inference via Ollama');
  console.log('   4. Encrypt responses and upload to IPFS');
  console.log('   5. Submit ResponseSubmitted transaction on-chain');
}

// Run inference directly
async function runInference(model, prompt) {
  console.log(`\n📝 Running inference on ${model}...`);
  const startTime = Date.now();

  try {
    const res = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model,
      prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 512 },
    }, { timeout: 120000 });

    const duration = Date.now() - startTime;
    console.log(`✅ Inference complete in ${duration}ms`);
    console.log(`   Response length: ${res.data.response.length} chars`);

    return {
      response: res.data.response,
      duration,
      inputTokens: Math.ceil(prompt.length / 4),
      outputTokens: Math.ceil(res.data.response.length / 4),
    };
  } catch (err) {
    console.error('❌ Inference failed:', err.message);
    throw err;
  }
}

// Main
async function main() {
  const ollamaAvailable = await checkOllama();

  if (!ollamaAvailable) {
    console.log('\n💡 To start Ollama:');
    console.log('   1. Install: https://ollama.com');
    console.log('   2. Pull models: ollama pull gemma:2b && ollama pull llama3:8b');
    console.log('   3. Run: ollama serve');
    console.log('   4. Restart this worker');
  }

  await pollForPrompts();

  // Keep alive
  console.log('\n🟢 Worker is running. The backend handles inference requests via /api/execute.');
  console.log('   Press Ctrl+C to stop.\n');

  // Heartbeat
  setInterval(async () => {
    const healthy = await checkOllama();
    if (healthy) {
      console.log(`[${new Date().toLocaleTimeString()}] 💓 Heartbeat: Ollama healthy`);
    }
  }, 30000);
}

main().catch(console.error);
