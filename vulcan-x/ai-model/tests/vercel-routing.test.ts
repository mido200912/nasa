import { expect, test } from 'bun:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplication } from '../src/index';
import { AiProviderService } from '../src/services/aiProviderService';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('Vercel uses the native Bun server without a competing file-based API function', async () => {
  const config = await Bun.file(resolve(root, 'vercel.json')).json();
  expect(config.framework).toBe('bun');
  expect(config.bunVersion).toBe('1.4.x');
  expect(await Bun.file(resolve(root, 'server.ts')).exists()).toBe(true);
  const competingFunctions = [...new Bun.Glob('api/**/*.{ts,js,mjs,cjs}').scanSync({ cwd: root })];
  expect(competingFunctions).toEqual([]);
});

test.each([
  { NODE_ENV: 'production', VERCEL: undefined, VERCEL_ENV: undefined },
  { NODE_ENV: 'development', VERCEL: '1', VERCEL_ENV: undefined },
  { NODE_ENV: undefined, VERCEL: undefined, VERCEL_ENV: 'production' },
  { NODE_ENV: 'development', VERCEL: undefined, VERCEL_ENV: 'preview' },
])('hosted routing protects scientific and diagnostic routes for %j', async (settings) => {
  const keys = ['NODE_ENV', 'VERCEL', 'VERCEL_ENV'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) {
    if (settings[key] === undefined) delete process.env[key];
    else process.env[key] = settings[key];
  }
  try {
    const app = createApplication(new AiProviderService([]));
    expect((await app.request('/health/live')).status).toBe(200);
    expect((await app.request('/api/v1/datasets')).status).toBe(200);
    const invalid = await app.request('/api/v1/ai/query', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ success: false });
    expect((await app.request('/api/v1/ai/key-status')).status).toBe(404);
    expect((await app.request('/test')).status).toBe(404);
    const scientific = await app.request('/api/v1/simulator/stress-test', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    });
    expect(scientific.status).toBe(422);
    expect(await scientific.json()).toMatchObject({ errorCode: 'HABITAT_FIXTURE_NOT_APPROVED' });
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
