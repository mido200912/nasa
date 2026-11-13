import { Hono } from 'hono';
import { productionBoundary } from './middleware/production';
import { env } from './config/env';
import { AiProviderService } from './services/aiProviderService';
import { RagService } from './services/ragService';
import { PhysicsSimulatorService } from './services/physicsSimulatorService';
import { PhysicsEngineService } from './services/physicsEngineService';
import { AiController } from './controllers/aiController';
import { SimulatorController } from './controllers/simulatorController';
import { createMainRouter } from './routes';
import { OFFICIAL_NASA_CORPUS } from './data/official_nasa_corpus';

export function createApplication(aiProviderService = new AiProviderService()) {
const app = new Hono();

// Global Middlewares
app.use('*', productionBoundary());
app.onError((_error, c) => c.json({ success: false, errorCode: 'INTERNAL_ERROR' }, 500));
app.get('/health/live', (c) => c.json({ status: 'live' }));
app.get('/health/ready', (c) => {
  const possible = aiProviderService.getKeyPoolStatus().keys.some((slot) =>
    slot.maskedKey !== 'NOT_CONFIGURED' && (!slot.cooldownUntil || Date.parse(slot.cooldownUntil) <= Date.now()));
  return c.json({ status: possible ? 'ready' : 'unavailable', provider: 'unknown' }, possible ? 200 : 503);
});
// Private server-to-server service: no browser CORS or production test/key tools.
app.use('*', async (c, next) => {
  if (process.env.NODE_ENV === 'production' && ['/test', '/api/v1/ai/key-status', '/api/v1/ai/key-reset'].includes(c.req.path))
    return c.notFound();
  if (process.env.NODE_ENV === 'production' && c.req.method === 'POST'
    && ['/api/v1/simulator/stress-test', '/api/v1/simulator/hazard-evaluation', '/api/v1/simulator/physics-engine'].includes(c.req.path))
    return c.json({ success: false, error: 'Legacy illustrative formulas are not approved for live scientific analysis.', errorCode: 'HABITAT_FIXTURE_NOT_APPROVED' }, 422);
  await next();
});

// Dependency Injection: Initialize Services
const ragService = new RagService(aiProviderService);
const physicsSimulatorService = new PhysicsSimulatorService(aiProviderService);
const physicsEngineService = new PhysicsEngineService(aiProviderService);

// Initialize Controllers
const aiController = new AiController(ragService, aiProviderService);
const simulatorController = new SimulatorController(physicsSimulatorService, physicsEngineService);

// Mount Application Routes
const mainRouter = createMainRouter(aiController, simulatorController);
app.route('/', mainRouter);
return app;
}
const app = createApplication();

// Banner
console.log('================================================================');
console.log('🚀 VULCAN-X: AI Combustion Engine & Space Safety Backend');
console.log('🏆 2026 NASA Space Apps Challenge: "Flame in Freefall"');
console.log('================================================================');
console.log(`📡 Server running on: http://localhost:${env.PORT}`);
console.log(`📚 Official NASA source chunks loaded: ${OFFICIAL_NASA_CORPUS.length}`);
console.log(`🔑 OpenRouter configured key slots: ${env.API_KEYS.filter((slot) => slot.key.length > 5).length}/5 (not proof of provider connectivity)`);
console.log('----------------------------------------------------------------');
console.log(`• Knowledge & RAG Query : POST http://localhost:${env.PORT}/api/v1/ai/query`);
console.log(`• Habitat Stress Test   : POST http://localhost:${env.PORT}/api/v1/simulator/stress-test`);
console.log(`• Key Pool Health Status: GET  http://localhost:${env.PORT}/api/v1/ai/key-status`);
console.log(`• Datasets Catalog      : GET  http://localhost:${env.PORT}/api/v1/datasets`);
console.log('================================================================\n');

export default {
  // Private upstream by default; never expose diagnostic/key-management routes through Next.js.
  hostname: process.env.VULCANX_BIND_HOST || '127.0.0.1',
  port: env.PORT,
  fetch: app.fetch,
};

