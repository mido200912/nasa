import type { Context } from 'hono';
import { z } from 'zod';
import type { PhysicsSimulatorService } from '../services/physicsSimulatorService';

const StressTestSchema = z.object({
  habitat: z.enum(['lunar', 'mars', 'iss']),
  oxygen_concentration: z.number().min(0).max(100, 'Oxygen concentration must be between 0 and 100%'),
  pressure_psi: z.number().positive('Pressure (psi) must be a positive number'),
  material_type: z.string().min(1, 'material_type cannot be empty'),
});

export class SimulatorController {
  private simulatorService: PhysicsSimulatorService;

  constructor(simulatorService: PhysicsSimulatorService) {
    this.simulatorService = simulatorService;
  }

  /**
   * POST /api/v1/simulator/stress-test
   */
  public handleStressTest = async (c: Context) => {
    try {
      const body = await c.req.json().catch(() => null);
      if (!body) {
        return c.json(
          {
            success: false,
            error: 'Invalid or missing JSON body in request',
          },
          400
        );
      }

      const parseResult = StressTestSchema.safeParse(body);
      if (!parseResult.success) {
        const issues = parseResult.error.issues || (parseResult.error as any).errors || [];
        return c.json(
          {
            success: false,
            error: 'Validation failed',
            details: issues.map((e: any) => e.message),
          },
          400
        );
      }

      const simulation_result = await this.simulatorService.simulate(parseResult.data);

      return c.json(
        {
          success: true,
          simulation_result,
        },
        200
      );
    } catch (err: any) {
      console.error('[SimulatorController] Error executing stress test:', err);
      return c.json(
        {
          success: false,
          error: 'An internal error occurred during simulation',
          message: err?.message || 'Unknown error',
        },
        500
      );
    }
  };
}
