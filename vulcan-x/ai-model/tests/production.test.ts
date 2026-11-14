import { expect, mock, spyOn, test } from 'bun:test';
import { createApplication } from '../src/index';
import { AiProviderService } from '../src/services/aiProviderService';

test('private liveness is not provider readiness', async () => {
  const app = createApplication(new AiProviderService([]));
  expect((await app.request('/health/live')).status).toBe(200);
  const readiness = await app.request('/health/ready');
  expect(readiness.status).toBe(503);
  expect(await readiness.text()).not.toContain('key');
});
test('actual bytes are bounded even with a dishonest content-length', async () => {
  const app = createApplication(new AiProviderService([]));
  const response = await app.request('/api/v1/ai/query', { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '1' }, body: 'x'.repeat(32769) });
  expect(response.status).toBe(413);
});
test('malformed bodies and unknown failures have safe JSON responses and correlation', async () => {
  const app = createApplication(new AiProviderService([]));
  const response = await app.request('/api/v1/ai/query', { method: 'POST', body: '{' });
  expect(response.status).toBe(400);
  expect(response.headers.get('x-correlation-id')).toMatch(/^[0-9a-f-]{36}$/);
});

test('isolated provider timing events contain durations and categories, never credentials or content', async () => {
  const originalFetch = globalThis.fetch;
  const messages: string[] = [];
  const log = spyOn(console, 'log').mockImplementation((value) => { messages.push(String(value)); });
  const warn = spyOn(console, 'warn').mockImplementation((value) => { messages.push(String(value)); });
  const slot = { index: 1, key: 'technical-test-credential-only', provider: 'openrouter' as const, baseUrl: 'https://provider.invalid/api/v1', model: 'technical-model' };
  try {
    globalThis.fetch = mock(async () => Response.json({ model: 'technical-model', choices: [{ finish_reason: 'stop', message: { content: 'Technical response fixture.' } }] })) as unknown as typeof fetch;
    await new AiProviderService([slot]).generateCompletion('private-question-do-not-log');
    globalThis.fetch = mock(async () => Response.json({ error: 'private-provider-detail' }, { status: 429 })) as unknown as typeof fetch;
    await expect(new AiProviderService([slot]).generateCompletion('private-question-do-not-log')).rejects.toThrow();
    const events = messages.filter(message => message.startsWith('{"event":"provider_')).map(message => JSON.parse(message));
    expect(events.map(event => event.event)).toEqual(['provider_completed', 'provider_failed']);
    expect(events[1].category).toBe('quota_or_rate_limit');
    expect(events.every(event => Number.isInteger(event.durationMs) && event.durationMs >= 0)).toBe(true);
    expect(messages.join('\n')).not.toContain(slot.key);
    expect(messages.join('\n')).not.toContain('private-question-do-not-log');
    expect(messages.join('\n')).not.toContain('private-provider-detail');
  } finally { globalThis.fetch = originalFetch; log.mockRestore(); warn.mockRestore(); }
});
