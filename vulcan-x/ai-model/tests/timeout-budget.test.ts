import { expect, test } from 'bun:test';

test('the default Knowledge budget permits a full provider attempt and remains inside the upstream budget', () => {
  const child = Bun.spawnSync([process.execPath, '--eval', `
    delete process.env.KNOWLEDGE_TIMEOUT_MS;
    delete process.env.PROVIDER_TIMEOUT_MS;
    delete process.env.PROVIDER_ATTEMPT_TIMEOUT_MS;
    const { env } = await import('./src/config/env.ts');
    console.log(JSON.stringify({ knowledge: env.KNOWLEDGE_TIMEOUT_MS, provider: env.PROVIDER_TIMEOUT_MS, attempt: env.PROVIDER_ATTEMPT_TIMEOUT_MS }));
  `], { cwd: process.cwd() });
  expect(child.exitCode).toBe(0);
  const budget = JSON.parse(child.stdout.toString());
  expect(budget.knowledge).toBeGreaterThan(budget.attempt);
  expect(budget.knowledge).toBeLessThan(budget.provider);
});
