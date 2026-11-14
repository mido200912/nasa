import { afterEach, expect, mock, test } from 'bun:test';
import { AiProviderService } from '../src/services/aiProviderService';
import { RagService } from '../src/services/ragService';
import { AiController } from '../src/controllers/aiController';
import { Hono } from 'hono';
import { createApplication } from '../src/index';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const question = { question: 'NASA oxygen fire microgravity', environment: 'iss' as const };
const slot = { index: 1, key: 'technical-test-token-not-a-real-key', provider: 'openrouter' as const, baseUrl: 'https://provider.invalid/api/v1', model: 'technical-model' };

test('unconfigured provider returns a safe 503, never local text labeled as AI', async () => {
  const provider = new AiProviderService([]);
  const app = new Hono().post('/', new AiController(new RagService(provider), provider).handleQuery);
  const response = await app.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(question) });
  expect(response.status).toBe(503);
  const body = await response.json() as { success: boolean; answer?: string; errorCode: string };
  expect(body.success).toBe(false);
  expect(body.answer).toBeUndefined();
  expect(body.errorCode).toBe('PROVIDER_UNAVAILABLE');
});

test('provider output and actual model metadata survive retrieval orchestration (fake provider transport only)', async () => {
  globalThis.fetch = mock(async (_url, init) => {
    const request = JSON.parse(init!.body as string);
    expect(request.model).toBe('technical-model');
    return Response.json({ model: 'technical-model-returned', choices: [{ finish_reason: 'stop', message: { content: 'Technical provider fixture response; not live inference or scientific evidence.' } }] });
  }) as unknown as typeof fetch;
  const response = await new RagService(new AiProviderService([slot])).query(question);
  expect(response.answer).toContain('Technical provider fixture');
  expect(response.generation).toEqual({ mode: 'ProviderInference', provider: 'openrouter', model: 'technical-model-returned' });
  expect(response.sources.length).toBeGreaterThan(0);
});

test('reasoning-only output is never returned as a user-facing answer', async () => {
  globalThis.fetch = mock(async () => Response.json({ choices: [{ message: { reasoning: 'Private chain of thought, not an answer' } }] })) as unknown as typeof fetch;
  await expect(new AiProviderService([slot]).generateCompletion('Technical fixture')).rejects.toThrow();
});

test.each(['nvidia/nemotron-3.5-lightning:free', 'nvidia/nemotron-3.5-lightning'])('optional reasoning is disabled for %s without changing prompts or model', async (model) => {
  globalThis.fetch = mock(async (_url, init) => {
    const request = JSON.parse(init!.body as string);
    expect(request.model).toBe(model);
    expect(request.reasoning).toEqual({ enabled: false });
    expect(request.messages).toEqual([
      { role: 'system', content: 'Technical system fixture.' },
      { role: 'user', content: 'Technical question fixture.' },
    ]);
    return Response.json({ model, choices: [{ finish_reason: 'stop', message: { content: 'Technical final answer.' } }] });
  }) as unknown as typeof fetch;
  const result = await new AiProviderService([{ ...slot, model }]).generateCompletion('Technical question fixture.', 'Technical system fixture.');
  expect(result.text).toBe('Technical final answer.');
});

test('other configured models keep their existing reasoning behavior', async () => {
  globalThis.fetch = mock(async (_url, init) => {
    expect(JSON.parse(init!.body as string).reasoning).toBeUndefined();
    return Response.json({ model: slot.model, choices: [{ finish_reason: 'stop', message: { content: 'Technical final answer.' } }] });
  }) as unknown as typeof fetch;
  await new AiProviderService([slot]).generateCompletion('Technical fixture.');
});

test.each([
  { finish_reason: 'length', message: { content: 'Truncated private output.', reasoning: 'Private reasoning.' } },
  { finish_reason: 'stop', message: { content: '', reasoning: 'Private reasoning.' } },
])('disabling optional reasoning never makes a truncated or absent final answer acceptable: %j', async (choice) => {
  globalThis.fetch = mock(async () => Response.json({ model: 'nvidia/nemotron-3.5-lightning:free', choices: [choice] })) as unknown as typeof fetch;
  await expect(new AiProviderService([{ ...slot, model: 'nvidia/nemotron-3.5-lightning:free' }]).generateCompletion('Technical fixture.')).rejects.toThrow();
});

test('missing or oversized actual model identity is rejected, not replaced by the configured model', async () => {
  for (const model of [undefined, 'x'.repeat(101)]) {
    globalThis.fetch = mock(async () => Response.json({ model, choices: [{ finish_reason: 'stop', message: { content: 'Technical final answer fixture.' } }] })) as unknown as typeof fetch;
    await expect(new AiProviderService([slot]).generateCompletion('Technical fixture')).rejects.toThrow();
  }
});

test('upstream error details and request secrets never reach the public response', async () => {
  globalThis.fetch = mock(async () => Response.json({ error: { message: 'private-provider-token' } }, { status: 401 })) as unknown as typeof fetch;
  const provider = new AiProviderService([slot]);
  const app = new Hono().post('/', new AiController(new RagService(provider), provider).handleQuery);
  const response = await app.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(question) });
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('private-provider-token');
});

test.each([401, 402, 403, 404, 429, 503])('isolated provider HTTP %i is a safe failure, never a successful local answer', async (status) => {
  const fetcher = mock(async () => Response.json({ error: { code: status, message: 'private-provider-token-and-account-detail' } }, { status }));
  globalThis.fetch = fetcher as unknown as typeof fetch;
  const provider = new AiProviderService([slot]);
  const app = new Hono().post('/', new AiController(new RagService(provider), provider).handleQuery);
  const response = await app.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(question) });
  expect(response.status).toBe(503);
  const text = await response.text();
  expect(text).not.toContain('private-provider-token');
  expect(text).not.toContain(slot.key);
  expect(JSON.parse(text).answer).toBeUndefined();
  expect(provider.getKeyPoolStatus().keys[0]!.status).toBe([402, 403, 429].includes(status) ? 'RATE_LIMITED' : 'ERROR');
  await expect(provider.generateCompletion('Technical cooldown fixture')).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test('isolated generation deadline returns safe 504 without a fallback answer', async () => {
  const rag = { query: async () => { throw new DOMException('private upstream timeout detail', 'TimeoutError'); } } as unknown as RagService;
  const app = new Hono().post('/', new AiController(rag, new AiProviderService([])).handleQuery);
  const response = await app.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(question) });
  expect(response.status).toBe(504);
  expect(await response.text()).not.toContain('private');
});

test('production hides diagnostics and blocks legacy unvalidated scientific simulators', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const app = createApplication(new AiProviderService([]));
    for (const path of ['/test', '/api/v1/ai/key-status', '/api/v1/ai/key-reset']) {
      expect((await app.request(path)).status).toBe(404);
    }
    for (const path of ['/stress-test', '/hazard-evaluation', '/physics-engine']) {
      const response = await app.request(`/api/v1/simulator${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      expect(response.status).toBe(422);
      expect(await response.text()).toContain('HABITAT_FIXTURE_NOT_APPROVED');
    }
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
  }
});
