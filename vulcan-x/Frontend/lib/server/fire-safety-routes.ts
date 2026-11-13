import { proxyFireSafetyApi } from "@/lib/server/fire-safety-api";

const numericId = /^[1-9]\d*$/;
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type QueryName = "search" | "category" | "discipline" | "gravityCondition" | "materialId" | "domain" | "page" | "pageSize";

export function catalogCollection(request: Request, path: "/api/materials" | "/api/experiments" | "/api/technologies", allowedQueryNames: readonly QueryName[]) {
  return proxyFireSafetyApi(request, { method: "GET", path, query: permittedQuery(request, allowedQueryNames) });
}

export function catalogDetail(request: Request, basePath: "/api/materials" | "/api/experiments" | "/api/sources" | "/api/technologies", id: string) {
  if (!numericId.test(id)) return invalidIdentifier();
  return proxyFireSafetyApi(request, { method: "GET", path: `${basePath}/${id}` });
}

export function habitatDetail(request: Request, id: string) {
  if (!guid.test(id)) return invalidIdentifier();
  return proxyFireSafetyApi(request, { method: "GET", path: `/api/habitat-analyses/${id}` });
}

export function knowledgeDetail(request: Request, id: string) {
  if (!guid.test(id)) return invalidIdentifier();
  return proxyFireSafetyApi(request, { method: "GET", path: `/api/knowledge/queries/${id}` });
}

export async function jsonPost(request: Request, path: "/api/habitat-analyses" | "/api/knowledge/queries") {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return Response.json({ status: 415, title: "Unsupported media type", detail: "Use application/json.", errorCode: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415, headers: { "Content-Type": "application/problem+json; charset=utf-8" } });
  }
  let body: unknown;
  try { body = await limitedJson(request); } catch (cause) {
    if (cause instanceof RangeError) return Response.json({ status: 413, title: "Request body is too large", errorCode: "REQUEST_BODY_TOO_LARGE" }, { status: 413, headers: { "Content-Type": "application/problem+json; charset=utf-8", "Cache-Control": "no-store" } });
    if (request.signal.aborted) return Response.json({ status: 499, title: "Request cancelled", errorCode: "REQUEST_CANCELLED" }, { status: 499 });
    return Response.json({ status: 400, title: "Invalid JSON", detail: "The request body must be valid JSON.", errorCode: "INVALID_JSON" }, { status: 400, headers: { "Content-Type": "application/problem+json; charset=utf-8" } });
  }
  return proxyFireSafetyApi(request, { method: "POST", path, body });
}

async function limitedJson(request: Request): Promise<unknown> {
  const limit = 32 * 1024;
  if (Number(request.headers.get("content-length")) > limit) throw new RangeError("Body limit");
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing JSON");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new RangeError("Body limit"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

function permittedQuery(request: Request, names: readonly QueryName[]): URLSearchParams {
  const source = new URL(request.url).searchParams;
  const result = new URLSearchParams();
  for (const name of names) {
    for (const value of source.getAll(name)) result.append(name, value);
  }
  return result;
}

function invalidIdentifier(): Response {
  return Response.json({ status: 400, title: "Invalid identifier", detail: "The route identifier has an invalid format.", errorCode: "INVALID_ROUTE_IDENTIFIER" }, { status: 400, headers: { "Content-Type": "application/problem+json; charset=utf-8" } });
}
