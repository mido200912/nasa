import type { MiddlewareHandler } from 'hono';

// Private-service limits complement, not replace, public edge/API rate controls.
export function productionBoundary(): MiddlewareHandler {
  let active = 0, expensive = 0;
  return async (c, next) => {
    const started = performance.now();
    const supplied = c.req.header('x-correlation-id');
    const correlation = supplied && /^[0-9a-f-]{36}$/i.test(supplied) ? supplied : crypto.randomUUID();
    c.header('X-Correlation-ID', correlation);
    c.header('Cache-Control', 'no-store');
    c.header('X-Content-Type-Options', 'nosniff');
    const deny = (errorCode: string, status: 408 | 413 | 429) => {
      c.res = c.json({ success: false, errorCode }, status);
      return c.res;
    };
    const costly = c.req.method === 'POST' && c.req.path.startsWith('/api/v1/');
    if (active >= 32 || (costly && expensive >= 2)) {
      console.warn(JSON.stringify({ event: 'request_rejected', correlation, category: 'concurrency', status: 429 }));
      return deny('CONCURRENCY_LIMIT', 429);
    }
    active++; if (costly) expensive++;
    try {
      if (c.req.raw.body) {
        if (Number(c.req.header('content-length')) > 32768) return deny('REQUEST_BODY_TOO_LARGE', 413);
        const reader = c.req.raw.body.getReader();
        let size = 0, timedOut = false;
        const parts: Uint8Array[] = [];
        const cancel = () => { void reader.cancel().catch(() => {}); };
        const timeout = setTimeout(() => { timedOut = true; cancel(); }, 5000);
        c.req.raw.signal.addEventListener('abort', cancel, { once: true });
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 32768) { cancel(); return deny('REQUEST_BODY_TOO_LARGE', 413); }
            parts.push(value);
          }
          if (timedOut) return deny('REQUEST_BODY_TIMEOUT', 408);
          if (c.req.raw.signal.aborted) { c.res = new Response(null, { status: 499 }); return c.res; }
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const part of parts) { bytes.set(part, offset); offset += part.length; }
          c.req.raw = new Request(c.req.raw, { body: bytes });
        } finally {
          clearTimeout(timeout); c.req.raw.signal.removeEventListener('abort', cancel); reader.releaseLock();
        }
      }
      await next();
    } finally {
      active--; if (costly) expensive--;
      console.log(JSON.stringify({ event: 'request_completed', correlation, method: c.req.method, status: c.res.status, durationMs: Math.round(performance.now() - started) }));
    }
  };
}
