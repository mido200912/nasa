/** Safe categories only: never carry raw provider response bodies or credentials. */
export class ProviderUnavailableError extends Error {
  constructor() { super('OpenRouter is unavailable or not configured.'); }
}
export class ProviderResponseError extends Error {
  constructor() { super('OpenRouter returned no usable final answer.'); }
}
