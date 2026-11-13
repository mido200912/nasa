import type { EnvironmentId, MaterialId } from "@/lib/simulation";

export type CatalogEnvironment = {
  id: number;
  code: string;
  name: string;
  type: string;
};

export type CatalogMaterial = {
  id: number;
  code: string;
  name: string;
  category: string | null;
};

export type PagedCatalogMaterials = {
  items: CatalogMaterial[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export class CatalogApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function getCatalogEnvironments(signal?: AbortSignal): Promise<CatalogEnvironment[]> {
  const response = await fetch("/api/backend/environments", { signal, cache: "no-store" });
  const payload = await responseJson(response);
  if (!response.ok) throw new CatalogApiError(problemMessage(payload, "Environment catalog is unavailable."), response.status);
  if (!Array.isArray(payload) || !payload.every(isCatalogEnvironment)) throw new CatalogApiError("Environment catalog returned an invalid response.", 502);
  return payload;
}

export async function getCatalogMaterials(options: { search?: string; page?: number; pageSize?: number }, signal?: AbortSignal): Promise<PagedCatalogMaterials> {
  const query = new URLSearchParams();
  if (options.search?.trim()) query.set("search", options.search.trim());
  query.set("page", String(options.page ?? 1));
  query.set("pageSize", String(options.pageSize ?? 50));
  const response = await fetch(`/api/backend/materials?${query}`, { signal, cache: "no-store" });
  const payload = await responseJson(response);
  if (!response.ok) throw new CatalogApiError(problemMessage(payload, "Material catalog is unavailable."), response.status);
  if (!isPagedCatalogMaterials(payload)) throw new CatalogApiError("Material catalog returned an invalid response.", 502);
  return payload;
}

export function environmentVisualAlias(code: string): EnvironmentId | null {
  switch (code.trim().toUpperCase()) {
    case "ISS": return "iss";
    case "LUNAR_HABITAT": return "lunar";
    case "MARS_HABITAT": return "mars";
    default: return null;
  }
}

export function materialVisualAlias(code: string): MaterialId | null {
  switch (code.trim().toUpperCase()) {
    case "PMMA": return "pmma_acrylic";
    default: return null;
  }
}

async function responseJson(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return null; }
}

function problemMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.detail === "string" ? value.detail : fallback;
}

function isCatalogEnvironment(value: unknown): value is CatalogEnvironment {
  return isRecord(value) && isPositiveInteger(value.id) && isString(value.code) && isString(value.name) && isString(value.type);
}

function isCatalogMaterial(value: unknown): value is CatalogMaterial {
  return isRecord(value) && isPositiveInteger(value.id) && isString(value.code) && isString(value.name) && (value.category === null || isString(value.category));
}

function isPagedCatalogMaterials(value: unknown): value is PagedCatalogMaterials {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(isCatalogMaterial)
    && isPositiveInteger(value.page) && isPositiveInteger(value.pageSize) && typeof value.totalCount === "number" && Number.isInteger(value.totalCount) && value.totalCount >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
