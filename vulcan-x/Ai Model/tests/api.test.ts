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
    expect(new Set(data.datasets.map((chunk: any) => chunk.category))).toEqual(
      new Set(['psi_research', 'scientific_guide', 'historical_incident', 'earth_spinoff'])
    );
    for (const chunk of data.datasets) {
      expect(typeof chunk.text_content).toBe('string');
      expect(chunk.text_content.length).toBeGreaterThan(0);
      expect(chunk.source_url).toMatch(/^https:\/\//);
      expect(typeof chunk.citation_title).toBe('string');
    }
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
    'POST /api/v1/ai/query returns source-bound official NASA chunks',
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
      expect(Array.isArray(data.retrieved_chunks)).toBe(true);
      expect(data.retrieved_chunks.length).toBeGreaterThan(0);
      for (const chunk of data.retrieved_chunks) {
        expect(typeof chunk.text_content).toBe('string');
        expect(chunk.source_url).toMatch(/^https:\/\//);
        expect(typeof chunk.citation_title).toBe('string');
        expect(['psi_research', 'scientific_guide', 'historical_incident', 'earth_spinoff']).toContain(chunk.category);
      }
      expect(['Low', 'Medium', 'High']).toContain(data.risk_level);
    },
    { timeout: 30000 }
  );

  test('historical incidents yield a source-bound emergency playbook', async () => {
    const res = await app.fetch(
      new Request('http://localhost:4000/api/v1/ai/query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'What did Apollo 1 teach about oxygen and emergency escape?', environment: 'iss' }),
      })
    );
    const data = (await res.json()) as any;
    expect(data.emergency_playbook.length).toBeGreaterThan(0);
    expect(data.retrieved_chunks.some((chunk: any) => chunk.category === 'historical_incident')).toBe(true);
  }, { timeout: 35000 });

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
    { timeout: 45000 }
  );

  test('GET /api/v1/ai/links returns link intelligence catalog and handles search queries', async () => {
    const res = await app.fetch(new Request('http://localhost:4000/api/v1/ai/links'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.count).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(data.links)).toBe(true);
    for (const link of data.links) {
      expect(link.url).toMatch(/^https:\/\//);
      expect(typeof link.title).toBe('string');
      expect(typeof link.summary).toBe('string');
      expect(Array.isArray(link.key_findings)).toBe(true);
      expect(link.key_findings.length).toBeGreaterThan(0);
      expect(Array.isArray(link.keywords)).toBe(true);
      expect(Array.isArray(link.environments)).toBe(true);
    }

    // Query search test
    const searchRes = await app.fetch(new Request('http://localhost:4000/api/v1/ai/links?q=apollo'));
    expect(searchRes.status).toBe(200);
    const searchData = (await searchRes.json()) as any;
    expect(searchData.success).toBe(true);
    expect(searchData.links.length).toBeGreaterThan(0);
    expect(searchData.links.some((l: any) => l.title.toLowerCase().includes('apollo') || l.summary.toLowerCase().includes('apollo'))).toBe(true);
  });

  test(
    'POST /api/v1/simulator/hazard-evaluation calculates 3D visual parameters for lunar base PMMA',
    async () => {
      const reqBody = {
        target_planet_or_habitat: 'lunar_base',
        oxygen_concentration: 32.0,
        pressure_psi: 9.5,
        material_type: 'PMMA Acrylic',
      };

      const res = await app.fetch(
        new Request('http://localhost:4000/api/v1/simulator/hazard-evaluation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
        })
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.simulation_metadata).toBeDefined();
      expect(data.simulation_metadata.target_planet_or_habitat).toBe('lunar_base');
      expect(data.simulation_metadata.gravity_g).toBe(0.166);
      expect(typeof data.simulation_metadata.hazard_score_percentage).toBe('number');
      expect(['NOMINAL', 'ELEVATED_RISK', 'CRITICAL_HAZARD']).toContain(data.simulation_metadata.safety_status);

      expect(data.visual_3d_trigger_params).toBeDefined();
      expect(data.visual_3d_trigger_params.render_flame).toBe(true);
      expect(data.visual_3d_trigger_params.flame_geometry_type).toBe('spherical_blue_core');
      expect(typeof data.visual_3d_trigger_params.flame_spread_velocity_mm_s).toBe('number');
      expect(typeof data.visual_3d_trigger_params.risk_color_hex).toBe('string');
      expect(typeof data.visual_3d_trigger_params.particle_explosion_density).toBe('number');
      expect(typeof data.visual_3d_trigger_params.warning_flash_ui).toBe('boolean');

      expect(typeof data.scientific_explanation).toBe('string');
      expect(data.scientific_explanation.length).toBeGreaterThan(15);
    },
    { timeout: 35000 }
  );
});

