export interface ApiKeySlotConfig {
  index: number;
  key: string;
  provider: 'openrouter';
  baseUrl: string;
  model: string;
}

function integer(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid server configuration: ${name}`);
  return value;
}
export const env = {
  PORT: Number(process.env.PORT || 4000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct',
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  KEY_COOLDOWN_MS: integer('KEY_COOLDOWN_MS', 60000, 1000, 3600000),
  MAX_OUTPUT_TOKENS: integer('OPENROUTER_MAX_OUTPUT_TOKENS', 512, 64, 2500),
  // Allow a complete 40s provider attempt while staying below provider/API deadlines.
  KNOWLEDGE_TIMEOUT_MS: integer('KNOWLEDGE_TIMEOUT_MS', 45000, 1000, 55000),
  PROVIDER_TIMEOUT_MS: integer('PROVIDER_TIMEOUT_MS', 55000, 1000, 55000),
  PROVIDER_ATTEMPT_TIMEOUT_MS: integer('PROVIDER_ATTEMPT_TIMEOUT_MS', 40000, 1000, 40000),

  // 5 OpenRouter API Key Slots Pool
  API_KEYS: [1, 2, 3, 4, 5].map((i): ApiKeySlotConfig => {
    const key =
      process.env[`OPENROUTER_API_KEY_${i}`] ||
      process.env[`AI_KEY_${i}`] ||
      process.env[`AI_API_KEY_${i}`] ||
      (i === 1 ? process.env.OPENROUTER_API_KEY || '' : '');

    const model =
      process.env[`OPENROUTER_MODEL_${i}`] ||
      process.env.OPENROUTER_MODEL ||
      process.env.AI_MODEL ||
      'meta-llama/llama-3.3-70b-instruct';

    return {
      index: i,
      key: (key || '').trim(),
      provider: 'openrouter',
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      model,
    };
  }),
};
if (env.PROVIDER_ATTEMPT_TIMEOUT_MS > env.PROVIDER_TIMEOUT_MS || env.KNOWLEDGE_TIMEOUT_MS > env.PROVIDER_TIMEOUT_MS)
  throw new Error('Incompatible provider timeout configuration');
if (process.env.NODE_ENV === 'production' && env.OPENROUTER_BASE_URL !== 'https://openrouter.ai/api/v1')
  throw new Error('Production provider URL must be the approved OpenRouter HTTPS endpoint');
