import { Hono } from 'hono';
import type { SimulatorController } from '../controllers/simulatorController';

export function createSimulatorRoutes(simulatorController: SimulatorController) {
  const router = new Hono();

  // POST /api/v1/simulator/stress-test
  router.post('/stress-test', simulatorController.handleStressTest);

  return router;
}

