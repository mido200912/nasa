import { Hono } from 'hono';
import { OFFICIAL_NASA_CORPUS } from '../data/official_nasa_corpus';
import type { AiController } from '../controllers/aiController';
import type { SimulatorController } from '../controllers/simulatorController';
import { createAiRoutes } from './aiRoutes';
import { createSimulatorRoutes } from './simulatorRoutes';

export function createMainRouter(
  aiController: AiController,
  simulatorController: SimulatorController
) {
  const router = new Hono();

  // Root & Health check
  router.get('/', (c) =>
    c.json({
      name: 'Vulcan-X AI & Combustion Backend Engine',
      edition: 'NASA Space Apps Challenge 2026',
      challenge: 'Flame in Freefall: AI-Powered Fire Safety Insights',
      status: 'operational',
      endpoints: {
        ai_query: 'POST /api/v1/ai/query',
        ai_links: 'GET /api/v1/ai/links?q=:search',
        key_status: 'GET /api/v1/ai/key-status',
        simulator_stress_test: 'POST /api/v1/simulator/stress-test',
        hazard_evaluation: 'POST /api/v1/simulator/hazard-evaluation',
        datasets: 'GET /api/v1/datasets',
        health: 'GET /health',
      },
    })
  );

  router.get('/health', (c) =>
    c.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  );

  // Interactive Web Test Bench
  router.get('/test', async (c) => {
    const file = Bun.file('test.html');
    if (await file.exists()) {
      return c.html(await file.text());
    }
    return c.text('test.html not found', 404);
  });
  router.get('/demo', (c) => c.redirect('/test'));

  // Mount API v1 sub-routers
  router.route('/api/v1/ai', createAiRoutes(aiController));
  router.route('/api/v1/simulator', createSimulatorRoutes(simulatorController));

  // Official NASA source-bound corpus catalog; every entry is a retrievable chunk.
  router.get('/api/v1/datasets', (c) => {
    return c.json({
      success: true,
      count: OFFICIAL_NASA_CORPUS.length,
      datasets: OFFICIAL_NASA_CORPUS,
    });
  });

  return router;
}

