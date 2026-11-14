import type { Context } from 'hono';
import { z } from 'zod';
import type { RagService } from '../services/ragService';
import type { AiProviderService } from '../services/aiProviderService';
import { ProviderUnavailableError, ProviderResponseError } from '../services/providerErrors';

const AiQuerySchema = z.object({
  question: z.string().trim().min(3, 'Question must contain at least three characters').max(2000),
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
      if (c.req.raw.signal.aborted) return Response.json({ success: false, error: 'Request cancelled' }, { status: 499 });
      if (err instanceof ProviderUnavailableError) return c.json({ success: false, error: err.message, errorCode: 'PROVIDER_UNAVAILABLE' }, 503);
      if (err instanceof ProviderResponseError) return c.json({ success: false, error: err.message, errorCode: 'PROVIDER_INVALID_RESPONSE' }, 502);
      if (err instanceof DOMException && err.name === 'TimeoutError') return c.json({ success: false, error: 'Provider request timed out.', errorCode: 'PROVIDER_TIMEOUT' }, 504);
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
   * GET /api/v1/ai/links
   * Inspect and search links and their contained intelligence, findings, and categories
   */
  public getLinkIntelligence = async (c: Context) => {
    try {
      const q = c.req.query('q');
      const results = q ? this.ragService.searchLinks(q) : this.ragService.getLinkIntelligenceCatalog();
      return c.json(
        {
          success: true,
          count: results.length,
          query: q || null,
          links: results,
        },
        200
      );
    } catch (err: any) {
      console.error('[AiController] Link intelligence request failed');
      return c.json(
        {
          success: false,
          error: 'An internal error occurred while inspecting links',
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
