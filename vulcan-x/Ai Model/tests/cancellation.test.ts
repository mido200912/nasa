import { afterEach, expect, mock, test } from 'bun:test';
import { AiProviderService } from '../src/services/aiProviderService';
import { AiController } from '../src/controllers/aiController';
import { RagService } from '../src/services/ragService';
import { Hono } from 'hono';

const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; });

test('provider cancellation reaches fetch and does not rotate keys or produce a fallback', async () => {
  const provider = new AiProviderService([1, 2].map((index) => ({ index, key: 'technical-test-token-not-a-real-key', provider: 'openrouter', baseUrl: 'http://provider.invalid', model: 'technical-fixture' })));
  let upstream: AbortSignal | undefined;
  const called = new Promise<void>((resolve) => {
    globalThis.fetch = mock((_url: unknown, init?: RequestInit) => new Promise<Response>((_done, reject) => {
      upstream = init!.signal!;
      upstream.addEventListener('abort', () => reject(upstream!.reason));
      resolve();
    })) as typeof fetch;
  });
  const controller = new AbortController();
  const pending = provider.generateCompletion('Technical cancellation test', 'Not a scientific request', controller.signal);
  await called;
  controller.abort(new DOMException('Cancelled', 'AbortError'));
  await expect(pending).rejects.toThrow('Cancelled');
  expect(upstream!.aborted).toBe(true);
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});

test('AI controller never returns private upstream exception details', async () => {
  const rag = { query: async () => { throw new Error('private-provider-token-and-internal-path'); } } as unknown as RagService;
  const app = new Hono().post('/', new AiController(rag, new AiProviderService()).handleQuery);
  const response = await app.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'technical test', environment: 'iss' }) });
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain('private-provider');
});
