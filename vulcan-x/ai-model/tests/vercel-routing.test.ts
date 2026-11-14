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

test('production routing exposes Knowledge validation and datasets while protecting scientific and diagnostic routes', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
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
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
