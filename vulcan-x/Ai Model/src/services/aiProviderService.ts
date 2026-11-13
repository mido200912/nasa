import { env, type ApiKeySlotConfig } from '../config/env';
import type { KeyPoolStatus, KeySlotInfo, KeyStatus } from '../types';

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

  constructor() {
    this.slots = env.API_KEYS.map((config, idx) => ({
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
    systemPrompt: string = 'You are the Vulcan-X NASA Space Apps AI combustion safety expert.'
  ): Promise<{ text: string; keyUsed: number; provider: string; model: string }> {
    const totalSlots = this.slots.length;
    let attempts = 0;

    while (attempts < totalSlots) {
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
        const result = await this.callOpenRouterApi(slot, userPrompt, systemPrompt);

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
          text: result,
          keyUsed: slot.config.index,
          provider: 'openrouter',
          model: slot.config.model,
        };
      } catch (err: any) {
        const errorMessage = err?.message || String(err);
        const isRateLimit = errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit');
        const isQuota =
          errorMessage.includes('403') ||
          errorMessage.includes('402') ||
          errorMessage.toLowerCase().includes('credit') ||
          errorMessage.toLowerCase().includes('quota');

        slot.failCount++;
        slot.lastError = errorMessage;
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
          console.error(`[AiProviderService] ❌ OpenRouter Key Slot #${slot.config.index} error: ${errorMessage}`);
        }

        console.warn(`[AiProviderService] 🔄 Auto-rotating to next OpenRouter key in pool...`);
        attempts++;
      }
    }

    // Never manufacture an offline scientific answer. Callers retain their own
    // explicitly sourced response or report that generation is unavailable.
    throw new Error('All OpenRouter API keys are unavailable; no unsourced fallback response was generated.');
  }

  /**
   * OpenRouter API caller with required headers
   */
  private async callOpenRouterApi(
    slot: InternalKeySlot,
    userPrompt: string,
    systemPrompt: string
  ): Promise<string> {
    const url = `${slot.config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000); // 40s timeout for free reasoning models

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
          max_tokens: 2500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;
      if (data?.error) {
        throw new Error(`OpenRouter Error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      const choice = data?.choices?.[0];
      const message = choice?.message;
      let content = message?.content || choice?.text;

      // Support reasoning models where output might be in message.reasoning
      if (!content && message?.reasoning) {
        content = message.reasoning;
      }

      if (!content) {
        const detail = choice?.finish_reason ? `finish_reason: ${choice.finish_reason}` : JSON.stringify(data).slice(0, 150);
        throw new Error(`OpenRouter returned empty content (${detail})`);
      }

      return content.trim();
    } catch (err: any) {
      clearTimeout(timeoutId);
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
      const maskedKey =
        rawKey && rawKey.length > 8
          ? `${rawKey.slice(0, 7)}...${rawKey.slice(-4)}`
          : rawKey
          ? '***'
          : 'NOT_CONFIGURED';

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
