import "server-only";
import { env } from "node:process";

const responseLimitBytes = 1024 * 1024;
const proxyTimeoutMs = 10_000;

const allowedBackendPaths = [
  /^\/api\/environments$/,
  /^\/api\/materials(?:\/\d+)?$/,
  /^\/api\/experiments(?:\/\d+)?$/,
  /^\/api\/sources\/\d+$/,
  /^\/api\/technologies(?:\/\d+)?$/,
  /^\/api\/habitat-analyses(?:\/[0-9a-f-]{36})?$/i,
  /^\/api\/knowledge\/queries(?:\/[0-9a-f-]{36})?$/i,
];

type JsonRecord = Record<string, unknown>;

export type BackendProxyRequest = {
  method: "GET" | "POST";
  path: string;
  query?: URLSearchParams;
  body?: unknown;
};

export class BackendConfigurationError extends Error {}

export async function proxyFireSafetyApi(request: Request, proxyRequest: BackendProxyRequest): Promise<Response> {
  if (!allowedBackendPaths.some((pattern) => pattern.test(proxyRequest.path))) {
    return problem(500, "Proxy route configuration is invalid", "The requested backend route is not permitted.", "BACKEND_ROUTE_NOT_PERMITTED");
  }

  let target: URL;
  try {
    target = buildTarget(request, proxyRequest.path, proxyRequest.query);
  } catch (cause) {
    if (cause instanceof BackendConfigurationError) {
      return problem(503, "Backend service is not configured", "The application backend configuration is unavailable.", "BACKEND_CONFIGURATION_ERROR");
    }
    return problem(500, "Proxy route configuration is invalid", "The requested backend route is not permitted.", "BACKEND_ROUTE_NOT_PERMITTED");
  }

  try {
    const headers = new Headers({ Accept: "application/json" });
    let body: string | undefined;
    if (proxyRequest.method === "POST") {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(proxyRequest.body);
    }

    const response = await fetch(target, {
      method: proxyRequest.method,
      headers,
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(proxyTimeoutMs)]),
    });
    return await translateResponse(response);
  } catch (cause) {
    if (request.signal.aborted) {
      return problem(499, "Request was cancelled", "The request was cancelled before the backend responded.", "REQUEST_CANCELLED");
    }
    if (cause instanceof DOMException && cause.name === "TimeoutError") {
      return problem(504, "Backend request timed out", "The backend did not respond in time.", "BACKEND_TIMEOUT");
    }
    return problem(502, "Backend service is unavailable", "The application backend could not be reached.", "BACKEND_UNAVAILABLE");
  }
}

function buildTarget(request: Request, path: string, query?: URLSearchParams): URL {
  const configured = env.FIRE_SAFETY_API_BASE_URL?.trim();
  if (!configured) throw new BackendConfigurationError("Missing base URL.");

  let base: URL;
  try {
    base = new URL(configured);
  } catch {
    throw new BackendConfigurationError("Invalid base URL.");
  }
  if (!isSafeBaseUrl(base)) throw new BackendConfigurationError("Unsafe base URL.");

  const target = new URL(`${base.origin}${path}`);
  if (query) target.search = query.toString();
  if (target.origin === new URL(request.url).origin) throw new BackendConfigurationError("Self-proxy loop.");
  return target;
}

function isSafeBaseUrl(url: URL): boolean {
  return (url.protocol === "http:" || url.protocol === "https:")
    && !url.username
    && !url.password
    && !url.search
    && !url.hash
    && (url.pathname === "/" || url.pathname === "");
}

async function translateResponse(upstream: Response): Promise<Response> {
  const text = await readBody(upstream.body, responseLimitBytes);
  if (upstream.ok) {
    if (!text) return new Response(null, { status: upstream.status, headers: noStoreHeaders() });
    const json = parseJson(text);
    if (json === undefined) return problem(502, "Backend returned an invalid response", "The backend response could not be processed.", "BACKEND_INVALID_RESPONSE");
    return Response.json(json, { status: upstream.status, headers: noStoreHeaders() });
  }

  const json = parseJson(text);
  if (isProblemDetails(json)) {
    return Response.json(safeProblemDetails(json), {
      status: upstream.status,
      headers: { ...noStoreHeaders(), "Content-Type": "application/problem+json; charset=utf-8" },
    });
  }
  return problem(upstream.status, "Backend request failed", "The application backend returned an unexpected error response.", "BACKEND_INVALID_ERROR_RESPONSE");
}

async function readBody(body: ReadableStream<Uint8Array> | null, limit: number): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RangeError("Response body too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function parseJson(value: string): unknown | undefined {
  try { return JSON.parse(value) as unknown; } catch { return undefined; }
}

function isProblemDetails(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && typeof (value as JsonRecord).title === "string"
    && typeof (value as JsonRecord).status === "number";
}

function safeProblemDetails(value: JsonRecord): JsonRecord {
  const safe: JsonRecord = {};
  for (const key of ["type", "title", "status", "detail", "instance", "errorCode", "traceId", "analysisId", "queryId", "errors"]) {
    if (key in value) safe[key] = value[key];
  }
  return safe;
}

function problem(status: number, title: string, detail: string, errorCode: string): Response {
  return Response.json({ status, title, detail, errorCode }, {
    status,
    headers: { ...noStoreHeaders(), "Content-Type": "application/problem+json; charset=utf-8" },
  });
}

function noStoreHeaders(): HeadersInit {
  return { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
}
