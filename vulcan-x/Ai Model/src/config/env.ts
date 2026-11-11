export interface ApiKeySlotConfig {
  index: number;
  key: string;
  provider: 'openrouter';
  baseUrl: string;
  model: string;
}

export const env = {
  PORT: Number(process.env.PORT || 4000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct',
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  KEY_COOLDOWN_MS: Number(process.env.KEY_COOLDOWN_MS || 60000), // 1 minute cooldown on 429 / rate limit

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
