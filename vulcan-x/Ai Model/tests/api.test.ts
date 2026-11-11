import { describe, expect, test } from 'bun:test';
import app from '../src/index';

describe('Vulcan-X Backend & AI Engine API Tests', () => {
  test('GET /test serves interactive HTML test bench', async () => {
    const res = await app.fetch(new Request('http://localhost:4000/test'));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('VULCAN-X');
  });

  test('GET /health returns healthy status', async () => {
    const res = await app.fetch(new Request('http://localhost:4000/health'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('healthy');
  });

  test('GET /api/v1/datasets returns NASA PSI datasets', async () => {
    const res = await app.fetch(new Request('http://localhost:4000/api/v1/datasets'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.count).toBeGreaterThanOrEqual(5);
  });

  test('GET /api/v1/ai/key-status returns 5-key OpenRouter rotation pool status', async () => {
    const res = await app.fetch(new Request('http://localhost:4000/api/v1/ai/key-status'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.totalKeys).toBe(5);
    expect(data.keys.length).toBe(5);
    expect(data.keys[0].provider).toBe('openrouter');
  });

  test(
    'POST /api/v1/ai/query handles knowledge query with scientific fallback',
    async () => {
      const reqBody = {
        question: 'How does high oxygen in a lunar base affect solid material flammability and flame spread?',
        environment: 'lunar_base',
      };

      const res = await app.fetch(
        new Request('http://localhost:4000/api/v1/ai/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
        })
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(typeof data.answer).toBe('string');
      expect(data.answer.length).toBeGreaterThan(10);
      expect(Array.isArray(data.sources)).toBe(true);
      expect(data.sources.length).toBeGreaterThan(0);
      expect(['Low', 'Medium', 'High']).toContain(data.risk_level);
    },
    { timeout: 30000 }
  );

  test('POST /api/v1/ai/query rejects invalid environment with 400', async () => {
    const reqBody = {
      question: 'Is this safe?',
      environment: 'invalid_zone',
    };

    const res = await app.fetch(
      new Request('http://localhost:4000/api/v1/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      })
    );

    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.success).toBe(false);
  });

  test(
    'POST /api/v1/simulator/stress-test calculates simulation results',
    async () => {
      const reqBody = {
        habitat: 'lunar',
        oxygen_concentration: 30.0,
        pressure_psi: 10.2,
        material_type: 'PMMA Acrylic',
      };

      const res = await app.fetch(
        new Request('http://localhost:4000/api/v1/simulator/stress-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
        })
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.simulation_result).toBeDefined();
      expect(typeof data.simulation_result.ignition_speed_multiplier).toBe('number');
      expect(data.simulation_result.ignition_speed_multiplier).toBeGreaterThan(1.0);
      expect(['Safe', 'Warning', 'Critical']).toContain(data.simulation_result.safety_status);
      expect(typeof data.simulation_result.recommendation).toBe('string');
    },
    { timeout: 35000 }
  );

  test(
    'POST /api/v1/simulator/stress-test handles Nomex in ISS as safe/moderate',
    async () => {
      const reqBody = {
        habitat: 'iss',
        oxygen_concentration: 21.0,
        pressure_psi: 14.7,
        material_type: 'Nomex Aramid',
      };

      const res = await app.fetch(
        new Request('http://localhost:4000/api/v1/simulator/stress-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
        })
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.simulation_result.ignition_speed_multiplier).toBeLessThan(1.0);
      expect(data.simulation_result.safety_status).toBe('Safe');
    },
    { timeout: 35000 }
  );
});

