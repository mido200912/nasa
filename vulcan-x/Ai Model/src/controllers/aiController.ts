import type { Context } from 'hono';
import { z } from 'zod';
import type { RagService } from '../services/ragService';
import type { AiProviderService } from '../services/aiProviderService';

const AiQuerySchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
  environment: z.enum(['lunar_base', 'mars_rover', 'iss', 'earth']),
});

export class AiController {
  private ragService: RagService;
  private aiProvider: AiProviderService;

  constructor(ragService: RagService, aiProvider: AiProviderService) {
    this.ragService = ragService;
    this.aiProvider = aiProvider;
  }

  /**
   * POST /api/v1/ai/query
   */
  public handleQuery = async (c: Context) => {
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

      const parseResult = AiQuerySchema.safeParse(body);
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

      const response = await this.ragService.query(parseResult.data, c.req.raw.signal);
      return c.json(response, 200);
    } catch (err: any) {
      if (c.req.raw.signal.aborted) return c.json({ success: false, error: 'Request cancelled' }, 499);
      console.error('[AiController] Query processing failed');
      return c.json(
        {
          success: false,
          error: 'An internal error occurred while processing the AI query',
        },
        500
      );
    }
  };

  /**
   * GET /api/v1/ai/key-status
   * Health and rotation status of the 5-key API pool
   */
  public getKeyStatus = async (c: Context) => {
    const status = this.aiProvider.getKeyPoolStatus();
    return c.json(
      {
        success: true,
        ...status,
      },
      200
    );
  };

  /**
   * POST /api/v1/ai/key-reset
   * Reset the key pool: clears all fail counts, cooldowns, and errors
   */
  public resetKeyPool = async (c: Context) => {
    this.aiProvider.resetKeyPool();
    const status = this.aiProvider.getKeyPoolStatus();
    return c.json(
      {
        success: true,
        message: 'Key pool has been fully reset',
        ...status,
      },
      200
    );
  };
}
