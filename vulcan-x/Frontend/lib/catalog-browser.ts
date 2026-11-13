export type CatalogKind = "materials" | "experiments" | "technologies";
export type RecordKind = CatalogKind | "sources";
export type CatalogEntry = { id: number; label: string; context: string | null };
export type CatalogPage = { items: CatalogEntry[]; page: number; pageSize: number; totalCount: number };
export type CatalogRecord = CatalogEntry & {
  description: string | null;
  facts: { label: string; value: string }[];
  related: { kind: RecordKind; id: number; label: string }[];
  url: string | null;
};
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const id = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const text = (v: unknown): v is string => typeof v === "string";
const nullableText = (v: unknown): v is string | null => v === null || text(v);
const fail = (): never => { throw new Error("The catalog returned an invalid response. No offline entries have been substituted."); };

async function json(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`/api/backend/${path}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`Catalog request failed (HTTP ${response.status}). Retry when the backend is available.`);
  return response.json();
}
function entry(v: unknown, kind: RecordKind): CatalogEntry {
  if (!record(v) || !id(v.id)) return fail();
  const label = kind === "materials" || kind === "technologies" ? v.name : v.title;
  const context = kind === "experiments" ? v.discipline : kind === "sources" ? v.publisher : v.category;
  if (!text(label) || !(context === undefined || nullableText(context))) return fail();
  return { id: v.id, label, context: context ?? null };
}
export async function getCatalogPage(kind: CatalogKind, options: { search: string; page: number }, signal?: AbortSignal): Promise<CatalogPage> {
  const query = new URLSearchParams();
  if (options.search.trim()) query.set("search", options.search.trim());
  query.set("page", String(options.page)); query.set("pageSize", "10");
  const v = await json(`${kind}?${query}`, signal);
  if (!record(v) || !Array.isArray(v.items) || !id(v.page) || !id(v.pageSize) || typeof v.totalCount !== "number" || !Number.isSafeInteger(v.totalCount) || v.totalCount < 0) return fail();
  return { items: v.items.map((item) => entry(item, kind)), page: v.page, pageSize: v.pageSize, totalCount: v.totalCount };
}
export async function getCatalogRecord(kind: RecordKind, identifier: number, signal?: AbortSignal): Promise<CatalogRecord> {
  if (!id(identifier)) throw new Error("Invalid catalog identifier.");
  const v = await json(`${kind}/${identifier}`, signal);
  if (!record(v)) return fail();
  const fields: Record<string, unknown> = v;
  const item = entry(v, kind);
  const description = kind === "materials" ? v.description : kind === "sources" ? v.citationText : v.summary;
  if (!(description === undefined || nullableText(description))) return fail();
  const result: CatalogRecord = { ...item, description: description ?? null, facts: [], related: [], url: null };
  function relation(kind: RecordKind, source: unknown) {
    if (!record(source) || !id(source.id)) return fail();
    const label = source.title ?? source.name;
    if (!text(label)) return fail();
    result.related.push({ kind, id: source.id, label });
  }
  function array(key: string): unknown[] { if (!Array.isArray(fields[key])) return fail(); return fields[key] as unknown[]; }
  if (kind === "materials") {
    for (const p of array("properties")) {
      if (!record(p) || !text(p.displayName) || !nullableText(p.unit) || !nullableText(p.valueText) || !(p.valueNumber === null || typeof p.valueNumber === "number") || !(p.researchSourceId === null || id(p.researchSourceId))) return fail();
      result.facts.push({ label: p.displayName, value: `${p.valueNumber ?? p.valueText ?? "Unknown / not curated"}${p.unit ? ` ${p.unit}` : ""}` });
      if (id(p.researchSourceId)) result.related.push({ kind: "sources", id: p.researchSourceId, label: `Property source ${p.researchSourceId}` });
    }
  }
  if (kind === "experiments") {
    for (const m of array("materials")) relation("materials", m);
    for (const s of array("sources")) relation("sources", s);
    for (const p of array("parameters")) {
      if (!record(p) || !text(p.displayName) || !nullableText(p.unit) || !nullableText(p.valueText) || !(p.valueNumber === null || typeof p.valueNumber === "number")) return fail();
      result.facts.push({ label: p.displayName, value: `${p.valueNumber ?? p.valueText ?? "Unknown / see source"}${p.unit ? ` ${p.unit}` : ""}` });
    }
    if (nullableText(v.keyFindings) && v.keyFindings) result.facts.push({ label: "Catalog findings", value: v.keyFindings });
  }
  if (kind === "technologies") {
    for (const a of array("applications")) {
      if (!record(a) || !text(a.title) || !text(a.description) || !text(a.domain) || !text(a.evidenceLevel)) return fail();
      result.facts.push({ label: `${a.title} · ${a.domain} · ${a.evidenceLevel}`, value: a.description });
      if (a.source !== null) relation("sources", a.source);
    }
    for (const e of array("relatedExperiments")) relation("experiments", e);
  }
  if (kind === "sources") {
    if (!nullableText(v.url) || !nullableText(v.doi) || !text(v.curationStatus)) return fail();
    result.url = v.url;
    result.facts.push({ label: "Curation status", value: v.curationStatus });
    if (v.doi) result.facts.push({ label: "DOI", value: v.doi });
  }
  return result;
}
