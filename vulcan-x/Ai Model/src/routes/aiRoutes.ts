import { Hono } from 'hono';
import type { AiController } from '../controllers/aiController';

export function createAiRoutes(aiController: AiController) {
  const router = new Hono();

  // POST /api/v1/ai/query
  router.post('/query', aiController.handleQuery);

  // GET /api/v1/ai/links (Search and inspect intelligence contained inside NASA links)
  router.get('/links', aiController.getLinkIntelligence);

  // GET /api/v1/ai/key-status (Inspection for 5-API Key Rotation pool)
  router.get('/key-status', aiController.getKeyStatus);

  // POST /api/v1/ai/key-reset (Reset all key statuses)
  router.post('/key-reset', aiController.resetKeyPool);

  return router;
}
