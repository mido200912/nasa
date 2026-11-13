import { env, type ApiKeySlotConfig } from '../config/env';
import type { KeyPoolStatus, KeySlotInfo, KeyStatus } from '../types';
import { ProviderResponseError, ProviderUnavailableError } from './providerErrors';

interface InternalKeySlot {
  config: ApiKeySlotConfig;
  status: KeyStatus;
  failCount: number;
  successCount: number;
  cooldownUntil: number | null;
  lastUsedAt?: string;
  lastError?: string;
}

export class AiProviderService {
  private slots: InternalKeySlot[];
  private activeSlotIndex: number = 0;

  constructor(configs: ApiKeySlotConfig[] = env.API_KEYS) {
    this.slots = configs.map((config, idx) => ({
      config,
      status: config.key ? (idx === 0 ? 'ACTIVE' : 'STANDBY') : 'ERROR',
      failCount: 0,
      successCount: 0,
      cooldownUntil: null,
      lastError: config.key ? undefined : 'No OpenRouter API key provided in environment',
    }));

    // Find first valid slot to make active
    const firstValid = this.slots.findIndex((s) => s.config.key && s.config.key.length > 5);
    if (firstValid !== -1) {
      const validSlot = this.slots[firstValid];
      if (validSlot) {
        this.activeSlotIndex = firstValid;
        validSlot.status = 'ACTIVE';
      }
    }
  }

  /**
   * Generates AI completion with transparent 5 OpenRouter key rotation and failover.
   */
  public async generateCompletion(
    userPrompt: string,
    systemPrompt: string = 'You are the Vulcan-X NASA Space Apps AI combustion safety expert.',
    signal?: AbortSignal
  ): Promise<{ text: string; keyUsed: number; provider: string; model: string }> {
    const operation = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(env.PROVIDER_TIMEOUT_MS)]);
    const totalSlots = this.slots.length;
    let attempts = 0;
    let lastFailure: unknown;

    while (attempts < totalSlots) {
      operation.throwIfAborted();
      const slotIndex = (this.activeSlotIndex + attempts) % totalSlots;
      const slot = this.slots[slotIndex];

      // Type-guard: ensure slot exists at index
      if (!slot) {
        attempts++;
        continue;
      }

      // Check if slot has a key and is not in cooldown
      if (!slot.config.key || slot.config.key.length < 5) {
        attempts++;
        continue;
      }

      if (slot.cooldownUntil && Date.now() < slot.cooldownUntil) {
        // Still in cooldown
        attempts++;
        continue;
      }

      // If cooldown expired, restore to STANDBY/ACTIVE
      if (slot.cooldownUntil && Date.now() >= slot.cooldownUntil) {
        slot.cooldownUntil = null;
        slot.status = 'STANDBY';
      }

      try {
        console.log(
          `[AiProviderService] Requesting OpenRouter via Key Slot #${slot.config.index} (Model: ${slot.config.model})...`
        );
        const result = await this.callOpenRouterApi(slot, userPrompt, systemPrompt, operation);
        operation.throwIfAborted();

        // Success! Reset error state completely
        slot.successCount++;
        slot.failCount = 0;  // Reset fail count on success
        slot.status = 'ACTIVE';
        slot.lastUsedAt = new Date().toISOString();
        slot.lastError = undefined;
        slot.cooldownUntil = null;
        this.activeSlotIndex = slotIndex;

        // Mark all other slots as STANDBY (not ERROR) if they have valid keys
        for (let i = 0; i < this.slots.length; i++) {
          const otherSlot = this.slots[i];
          if (i !== slotIndex && otherSlot && otherSlot.config.key && otherSlot.config.key.length > 5) {
            if (otherSlot.status !== 'RATE_LIMITED' || (otherSlot.cooldownUntil && Date.now() >= otherSlot.cooldownUntil)) {
              otherSlot.status = 'STANDBY';
              otherSlot.cooldownUntil = null;
            }
          }
        }

        return {
          text: result.text,
          keyUsed: slot.config.index,
          provider: 'openrouter',
          model: result.model,
        };
      } catch (err: any) {
        operation.throwIfAborted(); // Cancellation must not consume another key or return fallback success.
        lastFailure = err;
        const errorMessage = err?.message || String(err);
        const isRateLimit = errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit');
        const isQuota =
          errorMessage.includes('403') ||
          errorMessage.includes('402') ||
          errorMessage.toLowerCase().includes('credit') ||
          errorMessage.toLowerCase().includes('quota');

        slot.failCount++;
        slot.lastError = 'Provider request failed';
        slot.lastUsedAt = new Date().toISOString();

        if (isRateLimit || isQuota) {
          slot.status = 'RATE_LIMITED';
          slot.cooldownUntil = Date.now() + env.KEY_COOLDOWN_MS;
          console.warn(
            `[AiProviderService] ⚠️ OpenRouter Key Slot #${slot.config.index} hit RATE LIMIT / QUOTA (429/402). Setting cooldown for ${env.KEY_COOLDOWN_MS / 1000}s.`
          );
        } else {
          slot.status = 'ERROR';
          slot.cooldownUntil = Date.now() + 15000; // 15s quick retry cooldown
          console.error(`[AiProviderService] OpenRouter Key Slot #${slot.config.index} request failed`);
        }

        console.warn(`[AiProviderService] 🔄 Auto-rotating to next OpenRouter key in pool...`);
        attempts++;
      }
    }

    // Never manufacture an offline scientific answer. Callers retain their own
    // explicitly sourced response or report that generation is unavailable.
    if (lastFailure instanceof ProviderResponseError) throw lastFailure;
    throw new ProviderUnavailableError();
  }

  /**
   * OpenRouter API caller with required headers
   */
  private async callOpenRouterApi(
    slot: InternalKeySlot,
    userPrompt: string,
    systemPrompt: string,
    signal: AbortSignal
  ): Promise<{ text: string; model: string }> {
    const url = `${slot.config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const attemptStarted = performance.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${slot.config.key}`,
          'HTTP-Referer': 'https://vulcan-x.nasa-spaceapps.org',
          'X-Title': 'Vulcan-X NASA Space Apps Challenge',
        },
        body: JSON.stringify({
          model: slot.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2, // Low temperature for scientific precision & zero hallucination
          max_tokens: env.MAX_OUTPUT_TOKENS,
        }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(env.PROVIDER_ATTEMPT_TIMEOUT_MS)]),
        redirect: 'error',
      });


      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new ProviderResponseError();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 1024 * 1024) { await reader.cancel(); throw new ProviderResponseError(); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      let data: any;
      try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new ProviderResponseError(); }
      if (data?.error) {
        throw new Error('Provider returned an unsuccessful response');
      }
      const choice = data?.choices?.[0];
      const message = choice?.message;
      const content = message?.content;
      // Reasoning is not a final answer. Neither malformed nor truncated output
      // is substituted with local text and called successful inference.
      if (typeof content !== 'string' || !content.trim() || content.length > 100_000
        || (choice.finish_reason && choice.finish_reason !== 'stop')
        || typeof data.model !== 'string' || !data.model.trim() || data.model.length > 100) throw new ProviderResponseError();
      console.log(JSON.stringify({ event: 'provider_completed', provider: 'openrouter', durationMs: Math.round(performance.now() - attemptStarted) }));
      return { text: content.trim(), model: data.model };
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      console.warn(JSON.stringify({
        event: 'provider_failed', provider: 'openrouter',
        category: signal.aborted ? 'cancelled_or_deadline' : /429|402|403/.test(message) ? 'quota_or_rate_limit' : err instanceof ProviderResponseError ? 'invalid_response' : 'unavailable',
        durationMs: Math.round(performance.now() - attemptStarted),
      }));
      throw err;
    }
  }

  /**
   * Resets all key slots: clears fail counts, errors, cooldowns, and restores statuses
   */
  public resetKeyPool(): void {
    this.slots.forEach((slot, idx) => {
      if (slot.config.key && slot.config.key.length > 5) {
        slot.failCount = 0;
        slot.successCount = 0;
        slot.status = idx === 0 ? 'ACTIVE' : 'STANDBY';
        slot.cooldownUntil = null;
        slot.lastError = undefined;
        slot.lastUsedAt = undefined;
      }
    });
    this.activeSlotIndex = this.slots.findIndex((s) => s.config.key && s.config.key.length > 5);
    if (this.activeSlotIndex === -1) this.activeSlotIndex = 0;
    console.log('[AiProviderService] 🔄 Key pool has been fully reset.');
  }

  /**
   * Returns current pool diagnostics and health metrics
   */
  public getKeyPoolStatus(): KeyPoolStatus {
    const keys: KeySlotInfo[] = this.slots.map((slot) => {
      const rawKey = slot.config.key;
      const maskedKey = rawKey ? 'CONFIGURED' : 'NOT_CONFIGURED';

      return {
        index: slot.config.index,
        provider: 'openrouter',
        maskedKey,
        status: slot.status,
        failCount: slot.failCount,
        successCount: slot.successCount,
        lastUsedAt: slot.lastUsedAt,
        cooldownUntil: slot.cooldownUntil ? new Date(slot.cooldownUntil).toISOString() : undefined,
      };
    });

    return {
      totalKeys: this.slots.length,
      activeKeyIndex: this.slots[this.activeSlotIndex]?.config.index || 1,
      keys,
    };
  }
}
