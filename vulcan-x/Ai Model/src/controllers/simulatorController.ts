import type { Context } from 'hono';
import { z } from 'zod';
import type { PhysicsSimulatorService } from '../services/physicsSimulatorService';
import type { PhysicsEngineService } from '../services/physicsEngineService';
import type { EnvironmentType } from '../types';

const StressTestSchema = z.object({
  habitat: z.enum(['lunar', 'mars', 'iss']),
  oxygen_concentration: z.number().min(0).max(100, 'Oxygen concentration must be between 0 and 100%'),
  pressure_psi: z.number().positive('Pressure (psi) must be a positive number'),
  material_type: z.string().min(1, 'material_type cannot be empty'),
});

const HazardEvaluationSchema = z.object({
  target_planet_or_habitat: z
    .enum(['lunar_base', 'mars_rover', 'iss', 'earth', 'lunar', 'mars'])
    .transform((val): EnvironmentType => {
      if (val === 'lunar') return 'lunar_base';
      if (val === 'mars') return 'mars_rover';
      return val;
    }),
  oxygen_concentration: z.number().min(0).max(100, 'Oxygen concentration must be between 0 and 100%'),
  pressure_psi: z.number().positive('Pressure (psi) must be a positive number'),
  material_type: z.string().min(1, 'material_type cannot be empty'),
});

export class SimulatorController {
  private simulatorService: PhysicsSimulatorService;
  private physicsEngineService?: PhysicsEngineService;

  constructor(
    simulatorService: PhysicsSimulatorService,
    physicsEngineService?: PhysicsEngineService
  ) {
    this.simulatorService = simulatorService;
    this.physicsEngineService = physicsEngineService;
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

      const simulation_result = await this.simulatorService.simulate(parseResult.data, c.req.raw.signal);

      return c.json(
        {
          success: true,
          simulation_result,
        },
        200
      );
    } catch (err: any) {
      if (c.req.raw.signal.aborted) return Response.json({ success: false, error: 'Request cancelled' }, { status: 499 });
      console.error('[SimulatorController] Stress test failed');
      return c.json(
        {
          success: false,
          error: 'An internal error occurred during simulation',
        },
        500
      );
    }
  };

  /**
   * POST /api/v1/simulator/hazard-evaluation
   * Evaluates planetary & habitat hazard with 3D canvas trigger parameters
   */
  public handleHazardEvaluation = async (c: Context) => {
    try {
      if (!this.physicsEngineService) {
        return c.json(
          {
            success: false,
            error: 'Physics engine service is not configured',
          },
          500
        );
      }

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

      const parseResult = HazardEvaluationSchema.safeParse(body);
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

      const result = await this.physicsEngineService.evaluateHazard(parseResult.data, c.req.raw.signal);
      return c.json(result, 200);
    } catch (err: any) {
      if (c.req.raw.signal.aborted) return Response.json({ success: false, error: 'Request cancelled' }, { status: 499 });
      console.error('[SimulatorController] Hazard evaluation failed');
      return c.json(
        {
          success: false,
          error: 'An internal error occurred during planetary hazard evaluation',
        },
        500
      );
    }
  };
}
