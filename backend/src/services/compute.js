import axios from 'axios';

function getOllamaUrl() { return process.env.OLLAMA_URL || 'http://localhost:11434'; }

// Available models mapping
const MODEL_MAP = {
  'gemma': 'gemma:2b',
  'gemma-2b': 'gemma:2b',
  'gemma-7b': 'gemma:7b',
  'llama3': 'llama3:8b',
  'llama3-8b': 'llama3:8b',
};

/**
 * Check if Ollama is running and accessible
 */
export async function healthCheck() {
  try {
    const res = await axios.get(`${getOllamaUrl()}/api/tags`, { timeout: 5000 });
    return {
      healthy: true,
      models: res.data.models?.map(m => m.name) || [],
      url: getOllamaUrl(),
    };
  } catch (err) {
    return { healthy: false, error: err.message, url: getOllamaUrl() };
  }
}

/**
 * Run inference on a model via Ollama
 * @param {string} modelName - Model identifier
 * @param {string} prompt - The prompt text
 * @returns {Promise<{response: string, inputTokens: number, outputTokens: number, duration: number}>}
 */
export async function runInference(modelName, prompt) {
  const ollamaModel = MODEL_MAP[modelName] || modelName;

  try {
    const startTime = Date.now();

    const res = await axios.post(`${getOllamaUrl()}/api/generate`, {
      model: ollamaModel,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 512,
      },
    }, {
      timeout: 120000, // 2 min timeout
    });

    const duration = Date.now() - startTime;
    const responseText = res.data.response || '';

    // Estimate token counts
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(responseText.length / 4);

    return {
      response: responseText,
      inputTokens,
      outputTokens,
      duration,
      model: ollamaModel,
    };
  } catch (err) {
    // If Ollama is not available, return a simulated response
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
      console.log('[Compute-SIM] Ollama not available, simulating response');
      return simulateInference(modelName, prompt);
    }
    throw err;
  }
}

/**
 * Simulate inference when Ollama is not available
 */
function simulateInference(modelName, prompt) {
  const responses = [
    `[Simulated ${modelName} response] Based on your query about "${prompt.substring(0, 50)}...", here's the analysis: This is a simulated response for demo purposes. In production, this would be processed by the actual ${modelName} model running on a compute node.`,
    `[Simulated ${modelName} response] I've analyzed your prompt. The key points are: 1) Your query touches on important concepts. 2) In a live deployment, the ${modelName} model would provide detailed, context-aware responses. 3) This simulation demonstrates the end-to-end flow of the SYN3RGY platform.`,
  ];

  const response = responses[Math.floor(Math.random() * responses.length)];
  const inputTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(response.length / 4);

  return {
    response,
    inputTokens,
    outputTokens,
    duration: 500 + Math.random() * 1000,
    model: modelName,
    simulated: true,
  };
}

/**
 * List available models on the compute node
 */
export async function listModels() {
  try {
    const res = await axios.get(`${getOllamaUrl()}/api/tags`, { timeout: 5000 });
    return res.data.models || [];
  } catch {
    return [
      { name: 'gemma:2b', size: 1400000000, details: { family: 'gemma', parameter_size: '2B' } },
      { name: 'llama3:8b', size: 4700000000, details: { family: 'llama', parameter_size: '8B' } },
    ];
  }
}
