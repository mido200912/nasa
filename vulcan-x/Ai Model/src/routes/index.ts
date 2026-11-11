import { Hono } from 'hono';
import { NASA_PSI_KNOWLEDGE_BASE } from '../data/nasa_psi_knowledge_base';
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

  // NASA PSI Datasets Catalog endpoint
  router.get('/api/v1/datasets', (c) => {
    return c.json({
      success: true,
      count: NASA_PSI_KNOWLEDGE_BASE.length,
      datasets: NASA_PSI_KNOWLEDGE_BASE.map((d) => ({
        id: d.id,
        investigation: d.investigation,
        title: d.title,
        environment: d.environment,
        gravity_condition: d.gravity_condition,
        citation: d.citation,
      })),
    });
  });

  return router;
}

