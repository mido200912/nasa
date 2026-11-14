import { Hono } from 'hono';
import type { SimulatorController } from '../controllers/simulatorController';

export function createSimulatorRoutes(simulatorController: SimulatorController) {
  const router = new Hono();

  // POST /api/v1/simulator/stress-test (Existing Stress Test)
  router.post('/stress-test', simulatorController.handleStressTest);

  // POST /api/v1/simulator/hazard-evaluation (Planetary & Habitat 3D Simulation Hazard Evaluation)
  router.post('/hazard-evaluation', simulatorController.handleHazardEvaluation);
  router.post('/physics-engine', simulatorController.handleHazardEvaluation);

  return router;
}
