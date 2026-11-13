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
  try { body = await request.json(); } catch {
    return Response.json({ status: 400, title: "Invalid JSON", detail: "The request body must be valid JSON.", errorCode: "INVALID_JSON" }, { status: 400, headers: { "Content-Type": "application/problem+json; charset=utf-8" } });
  }
  return proxyFireSafetyApi(request, { method: "POST", path, body });
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
