export type KnowledgeDraft = {
  question: string;
  environmentId: number | null;
  materialId: number | null;
  yearFrom: string;
  yearTo: string;
  maxSources: string;
  language: string;
};

export type CreateKnowledgeQueryRequest = {
  question: string;
  environmentId: number;
  materialId: number | null;
  yearFrom: number | null;
  yearTo: number | null;
  maxSources: number;
  language: string | null;
};

export type KnowledgeQuery = {
  id: string;
  status: string;
  question: string;
  answer: string | null;
  groundingStatus: "HasMatchedCitations" | "HasOnlyUnmatchedCitations" | "NoCitations" | null;
  isMock: boolean;
  citations: KnowledgeCitation[];
  error: { code: string | null; message: string | null } | null;
  disclaimer: string;
};

export type KnowledgeCitation = {
  matchStatus: "Matched" | "Unmatched" | string;
  source: { id: number; title: string; doi: string | null; url: string | null } | null;
  rawTitle: string | null;
  rawUrl: string | null;
  excerpt: string | null;
  relevanceScore: number | null;
};

export type KnowledgeProblemDetails = { status: number; title: string; detail?: string; errorCode?: string; traceId?: string; queryId?: string; errors?: Record<string, string[]> };
export type KnowledgeOutcome = { query: KnowledgeQuery } | { problem: KnowledgeProblemDetails };

export const emptyKnowledgeDraft = (environmentId: number | null, materialId: number | null): KnowledgeDraft => ({ question: "", environmentId, materialId, yearFrom: "", yearTo: "", maxSources: "5", language: "en" });

export function validateKnowledgeDraft(draft: KnowledgeDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const question = draft.question.trim();
  if (question.length < 3 || question.length > 2000) errors.question = "Question must contain 3 to 2,000 non-whitespace characters.";
  if (!isPositiveInteger(draft.environmentId)) errors.environmentId = "Select a catalog environment before asking a live question.";
  if (draft.materialId !== null && !isPositiveInteger(draft.materialId)) errors.materialId = "The selected catalog material is invalid.";
  validateYear(draft.yearFrom, "yearFrom", errors);
  validateYear(draft.yearTo, "yearTo", errors);
  const from = optionalInteger(draft.yearFrom);
  const to = optionalInteger(draft.yearTo);
  if (from !== null && to !== null && from > to) errors.yearTo = "yearTo must not be earlier than yearFrom.";
  const maxSources = optionalInteger(draft.maxSources);
  if (maxSources === null || maxSources < 1 || maxSources > 10) errors.maxSources = "maxSources must be an integer from 1 to 10.";
  if (draft.language.length > 10) errors.language = "Language must be at most 10 characters.";
  return errors;
}

export function createKnowledgeRequest(draft: KnowledgeDraft): CreateKnowledgeQueryRequest {
  const errors = validateKnowledgeDraft(draft);
  if (Object.keys(errors).length) throw new KnowledgeFormError(errors);
  return {
    question: draft.question.trim(),
    environmentId: draft.environmentId!,
    materialId: draft.materialId,
    yearFrom: optionalInteger(draft.yearFrom),
    yearTo: optionalInteger(draft.yearTo),
    maxSources: optionalInteger(draft.maxSources)!,
    language: draft.language.trim() || null,
  };
}

export async function submitKnowledgeQuery(request: CreateKnowledgeQueryRequest, signal?: AbortSignal): Promise<KnowledgeOutcome> {
  return sendKnowledgeRequest("/api/backend/knowledge/queries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal });
}

export async function getKnowledgeQuery(id: string, signal?: AbortSignal): Promise<KnowledgeOutcome> {
  if (!isGuid(id)) return { problem: { status: 400, title: "Invalid query identifier", errorCode: "INVALID_QUERY_ID" } };
  return sendKnowledgeRequest(`/api/backend/knowledge/queries/${id}`, { signal });
}

export class KnowledgeFormError extends Error {
  constructor(readonly errors: Record<string, string>) { super("Knowledge form validation failed."); }
}

async function sendKnowledgeRequest(url: string, init: RequestInit): Promise<KnowledgeOutcome> {
  try {
    const response = await fetch(url, { ...init, cache: "no-store" });
    const body = await readJson(response);
    if (response.status === 201 || response.status === 200) {
      if (isKnowledgeQuery(body)) return { query: body };
      return { problem: { status: 502, title: "Invalid Knowledge response", detail: "The persisted Knowledge response could not be processed.", errorCode: "KNOWLEDGE_INVALID_RESPONSE", ...queryIdentifier(body, "id") } };
    }
    if (isProblemDetails(body)) return { problem: body };
    return { problem: { status: response.status || 502, title: "Knowledge request failed", detail: "The backend returned an unexpected response.", errorCode: "KNOWLEDGE_INVALID_ERROR_RESPONSE", ...queryIdentifier(body, "queryId") } };
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") return { problem: { status: 499, title: "Request cancelled", detail: "The request was cancelled.", errorCode: "REQUEST_CANCELLED" } };
    return { problem: { status: 502, title: "Knowledge service unavailable", detail: "The Knowledge backend could not be reached.", errorCode: "KNOWLEDGE_BACKEND_UNAVAILABLE" } };
  }
}

async function readJson(response: Response): Promise<unknown> { try { return await response.json(); } catch { return null; } }
function optionalInteger(value: string): number | null { if (!value.trim()) return null; const number = Number(value); return Number.isSafeInteger(number) ? number : null; }
function validateYear(value: string, key: string, errors: Record<string, string>) { if (!value.trim()) return; const year = optionalInteger(value); if (year === null || year < 1950 || year > 2100) errors[key] = `${key} must be an integer from 1950 to 2100.`; }
function isPositiveInteger(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }
function isGuid(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isNullableString(value: unknown): value is string | null { return value === null || typeof value === "string"; }
function queryIdentifier(value: unknown, key: string): { queryId?: string } {
  return isRecord(value) && typeof value[key] === "string" && isGuid(value[key]) ? { queryId: value[key] } : {};
}
function isProblemDetails(value: unknown): value is KnowledgeProblemDetails {
  return isRecord(value) && typeof value.status === "number" && Number.isInteger(value.status) && typeof value.title === "string"
    && ["detail", "errorCode", "traceId", "queryId"].every((key) => value[key] === undefined || typeof value[key] === "string")
    && (value.errors === undefined || (isRecord(value.errors) && Object.values(value.errors).every((messages) => Array.isArray(messages) && messages.every((message) => typeof message === "string"))));
}
function isKnowledgeQuery(value: unknown): value is KnowledgeQuery {
  return isRecord(value) && typeof value.id === "string" && isGuid(value.id) && typeof value.status === "string" && typeof value.question === "string"
    && isNullableString(value.answer) && (value.groundingStatus === null || ["HasMatchedCitations", "HasOnlyUnmatchedCitations", "NoCitations"].includes(value.groundingStatus as string))
    && typeof value.isMock === "boolean" && Array.isArray(value.citations) && value.citations.every(isKnowledgeCitation)
    && (value.error === null || (isRecord(value.error) && isNullableString(value.error.code) && isNullableString(value.error.message)))
    && typeof value.disclaimer === "string";
}
function isKnowledgeCitation(value: unknown): value is KnowledgeCitation {
  return isRecord(value) && typeof value.matchStatus === "string"
    && (value.source === null || (isRecord(value.source) && isPositiveInteger(value.source.id) && typeof value.source.title === "string" && isNullableString(value.source.doi) && isNullableString(value.source.url)))
    && isNullableString(value.rawTitle) && isNullableString(value.rawUrl) && isNullableString(value.excerpt)
    && (value.relevanceScore === null || (typeof value.relevanceScore === "number" && Number.isFinite(value.relevanceScore)));
}
