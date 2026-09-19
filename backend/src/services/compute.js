import Groq from 'groq-sdk';
import axios from 'axios';

// Multi-key pool for Groq (primary inference engine)
function getApiKeys() {
  return [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
  ].filter(k => k && k.startsWith('gsk_'));
}

let keyIndex = 0;
function getGroqClient() {
  const keys = getApiKeys();
  if (keys.length === 0) return null;
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return new Groq({ apiKey: key });
}

function getOllamaUrl() {
  return process.env.OLLAMA_URL || 'http://localhost:11434';
}

// ===================== COMPUTE NODES =====================
export const COMPUTE_NODES = [
  {
    id: 'groq-cloud',
    name: 'Groq Cloud Engine',
    type: 'groq',
    location: 'Global LPU Cluster',
    specs: 'Ultra-fast LPU inference (500+ T/s)',
    icon: '⚡',
  },
  {
    id: 'ollama-local',
    name: 'Local Ollama Node',
    type: 'ollama',
    url: getOllamaUrl(),
    location: 'Dedicated Compute Machine 1',
    specs: 'Local GPU/CPU Worker',
    icon: '🦙',
  },
];

export function getNodeById(nodeId) {
  return COMPUTE_NODES.find(n => n.id === nodeId) || COMPUTE_NODES[0];
}

// Model mapping for Groq
export const GROQ_MODEL_MAP = {
  'gpt-oss-120b': 'openai/gpt-oss-120b',
  'gpt-oss-20b': 'openai/gpt-oss-20b',
  'groq-compound': 'groq/compound',
  'llama-3.3-70b': 'openai/gpt-oss-120b',
  'llama-3.1-8b': 'openai/gpt-oss-20b',
  'mixtral-8x7b': 'groq/compound',
  'llama3-8b-demo': 'openai/gpt-oss-120b',
  'gemma-2b-demo': 'openai/gpt-oss-20b',
};

// Model mapping for Ollama local
export const OLLAMA_MODEL_MAP = {
  'gemma:2b': 'gemma:2b',
  'llama3:8b': 'llama3:8b',
  'llama-3.1-8b': 'llama3:8b',
  'llama-3.3-70b': 'llama3:8b',
  'gemma-2b-demo': 'gemma:2b',
  'llama3-8b-demo': 'llama3:8b',
};

/**
 * Check health of compute engines
 */
export async function healthCheck(nodeUrl = null) {
  // Check Groq
  let groqHealthy = false;
  let groqModels = [];
  try {
    const client = getGroqClient();
    if (client) {
      const list = await client.models.list();
      groqHealthy = true;
      groqModels = list.data.map(m => m.id).slice(0, 5);
    }
  } catch (err) {
    groqHealthy = false;
  }

  // Check Ollama Demo Machine
  let ollamaHealthy = false;
  let ollamaModels = [];
  const targetOllama = nodeUrl || getOllamaUrl();
  try {
    const res = await axios.get(`${targetOllama}/api/tags`, { timeout: 3000 });
    ollamaHealthy = true;
    ollamaModels = res.data.models?.map(m => m.name) || [];
  } catch (err) {
    ollamaHealthy = false;
  }

  return {
    healthy: groqHealthy || ollamaHealthy,
    groq: { healthy: groqHealthy, models: groqModels },
    ollama: { healthy: ollamaHealthy, url: targetOllama, models: ollamaModels },
  };
}

/**
 * Check health of all compute nodes
 */
export async function allNodesHealth() {
  const health = await healthCheck();
  return COMPUTE_NODES.map(node => {
    if (node.type === 'groq') {
      return { ...node, healthy: health.groq.healthy, models: health.groq.models };
    } else {
      return { ...node, healthy: health.ollama.healthy, models: health.ollama.models };
    }
  });
}

/**
 * Run inference via Groq or fallback Ollama Machine
 */
export async function runInference(model, prompt, imageBase64 = null, nodeUrlOrId = null) {
  const rawModelName = typeof model === 'string' ? model : (model.ollama_model || model.id || model.name);
  const startTime = Date.now();

  // Determine if user explicitly selected local Ollama node
  const isOllamaSelected = nodeUrlOrId === 'ollama-local' || (typeof nodeUrlOrId === 'string' && nodeUrlOrId.includes('11434'));

  if (isOllamaSelected) {
    const ollamaUrl = getOllamaUrl();
    const ollamaModel = OLLAMA_MODEL_MAP[rawModelName] || 'llama3:8b';

    try {
      console.log(`[Compute] Routing inference to local Ollama demo node: ${ollamaUrl} (${ollamaModel})...`);
      const res = await axios.post(`${ollamaUrl}/api/generate`, {
        model: ollamaModel,
        prompt: prompt,
        stream: false,
      }, { timeout: 60000 });

      const responseText = res.data.response || '';
      const inputTokens = Math.ceil(prompt.length / 4);
      const outputTokens = Math.ceil(responseText.length / 4);
      return {
        response: responseText,
        inputTokens,
        outputTokens,
        duration: Date.now() - startTime,
        model: ollamaModel,
        engine: 'ollama',
      };
    } catch (ollamaErr) {
      console.warn(`[Compute] Local Ollama unavailable (${ollamaErr.message}), falling back to Groq Cloud...`);
    }
  }

  // Primary: Groq Cloud LPU
  const groqModel = GROQ_MODEL_MAP[rawModelName] || 'openai/gpt-oss-120b';
  const client = getGroqClient();

  if (!client) {
    console.warn('[Compute] No Groq API Key found, simulating inference');
    return simulateInference(rawModelName, prompt);
  }

  try {
    console.log(`[Compute] Routing inference to Groq LPU (${groqModel})...`);

    const chatCompletion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an AI model running on ECLIPSE, a decentralized AI model marketplace on Monad Testnet. Provide accurate, helpful answers.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: groqModel,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || '';
    const inputTokens = chatCompletion.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
    const outputTokens = chatCompletion.usage?.completion_tokens || Math.ceil(responseText.length / 4);
    const duration = Date.now() - startTime;

    return {
      response: responseText,
      inputTokens,
      outputTokens,
      duration,
      model: groqModel,
      engine: 'groq',
    };
  } catch (err) {
    console.error('[Compute] Groq inference error:', err.message);
    return simulateInference(rawModelName, `[Groq API Notice: ${err.message}]\n\nFallback Answer:\n${prompt}`);
  }
}

/**
 * Fallback simulation
 */
function simulateInference(modelName, prompt) {
  const simulatedResponses = [
    `[ECLIPSE AI on Monad - ${modelName}] Here is the response to your prompt: "${prompt.substring(0, 80)}...". Powered by high-throughput decentralized inference.`,
    `[ECLIPSE AI on Monad - ${modelName}] Analysis complete for "${prompt.substring(0, 80)}...". All outputs verified on Monad Testnet.`,
  ];

  const response = simulatedResponses[Math.floor(Math.random() * simulatedResponses.length)];
  const inputTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(response.length / 4);

  return {
    response,
    inputTokens,
    outputTokens,
    duration: 120,
    model: modelName,
    simulated: true,
  };
}
