export const habitatGravityRegimes = ["Microgravity", "ReducedGravity", "EarthLike", "Hypergravity", "Unspecified"] as const;
export type HabitatGravityRegime = (typeof habitatGravityRegimes)[number];

export type HabitatAnalysisDraft = {
  environmentId: number | null;
  materialId: number | null;
  oxygenVolumePercent: string;
  pressureKPa: string;
  temperatureCelsius: string;
  gravityRegime: HabitatGravityRegime | "";
  effectiveGravityG: string;
  language: string;
};

export type CreateHabitatAnalysisRequest = {
  environmentId: number;
  materialId: number;
  oxygenVolumePercent: number | null;
  pressureKPa: number | null;
  temperatureCelsius: number | null;
  gravityRegime: HabitatGravityRegime | null;
  effectiveGravityG: number | null;
  additionalParameters: Record<string, string> | null;
  language: string | null;
};

export type HabitatAnalysis = {
  id: string;
  status: string;
  requestedAt: string;
  environment: { id: number; code: string; name: string };
  material: { id: number; code: string; name: string };
  inputs: {
    oxygenVolumePercent: InputValue;
    pressureKPa: InputValue;
    temperatureCelsius: InputValue;
    gravity: { regime: string | null; effectiveGravityG: number | null; origin: string };
  };
  result: HabitatResult | null;
  error: { code: string | null; message: string | null } | null;
  disclaimer: string;
  generation?: { mode: string; provider: string | null; model: string | null } | null;
};

export type InputValue = { value: number | null; origin: string; measurementBasis: string | null };
export type HabitatResult = {
  riskLabel: string | null;
  analysisBasis: string | null;
  isMock: boolean;
  isScientificallyValidated: boolean;
  explanation: string | null;
  limitations: string | null;
  factors: { name: string; description: string | null; direction: string | null }[];
  citations: { matchStatus: string; source: { id: number; title: string; doi: string | null; url: string | null } | null; rawTitle: string | null; rawUrl: string | null; excerpt: string | null }[];
};

export type ProblemDetails = { status: number; title: string; detail?: string; errorCode?: string; traceId?: string; analysisId?: string; errors?: Record<string, string[]> };
export type HabitatApiOutcome = { analysis: HabitatAnalysis } | { problem: ProblemDetails };

export async function getHabitatCapabilities(signal?: AbortSignal): Promise<{ enabled: boolean }> {
  const response = await fetch("/api/backend/habitat-analyses/capabilities", { signal, cache: "no-store" });
  const body: unknown = await response.json();
  if (!response.ok || !isRecord(body) || typeof body.enabled !== "boolean")
    throw new Error("The analysis service status is unavailable. Refresh to check again.");
  return { enabled: body.enabled };
}

export const emptyHabitatDraft = (environmentId: number | null, materialId: number | null): HabitatAnalysisDraft => ({
  environmentId,
  materialId,
  oxygenVolumePercent: "",
  pressureKPa: "",
  temperatureCelsius: "",
  gravityRegime: "",
  effectiveGravityG: "",
  language: "en",
});

export function validateHabitatDraft(draft: HabitatAnalysisDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isPositiveInteger(draft.environmentId)) errors.environmentId = "Select a catalog environment.";
  if (!isPositiveInteger(draft.materialId)) errors.materialId = "Select a catalog material.";
  validateOptionalNumber(draft.oxygenVolumePercent, "oxygenVolumePercent", 0, 100, "Oxygen must be a volume percentage from 0 to 100.", errors);
  validateOptionalNumber(draft.pressureKPa, "pressureKPa", 0.000001, 999999, "Pressure must be between 0.000001 and 999999 kPa.", errors);
  validateOptionalNumber(draft.temperatureCelsius, "temperatureCelsius", -273.15, 999999, "Temperature must be between -273.15 and 999999 °C.", errors);
  validateOptionalNumber(draft.effectiveGravityG, "effectiveGravityG", 0, 999999, "Effective gravity must be between 0 and 999999 g.", errors);
  if (draft.effectiveGravityG.trim() && !draft.gravityRegime) errors.gravityRegime = "Select a gravity regime when effective gravity is supplied.";
  if (draft.language.length > 10) errors.language = "Language must be at most 10 characters.";
  return errors;
}

/** Submit explicit conditions for qualitative interpretation, never offline illustration defaults. */
export function createHabitatRequest(draft: HabitatAnalysisDraft, interpretationEnabled: boolean): CreateHabitatAnalysisRequest {
  const errors = validateHabitatDraft(draft);
  if (Object.keys(errors).length) throw new HabitatFormError(errors);
  if (!interpretationEnabled) throw new HabitatFormError({ scientificInputs: "AI habitat interpretation is disabled or its service status is unavailable." });

  const oxygenVolumePercent = optionalNumber(draft.oxygenVolumePercent);
  const pressureKPa = optionalNumber(draft.pressureKPa);
  if (oxygenVolumePercent === null || pressureKPa === null) throw new HabitatFormError({ scientificInputs: "Enter oxygen volume percent and pressure in kPa." });
  return {
    environmentId: draft.environmentId!,
    materialId: draft.materialId!,
    oxygenVolumePercent,
    pressureKPa,
    temperatureCelsius: optionalNumber(draft.temperatureCelsius),
    gravityRegime: draft.gravityRegime || null,
    effectiveGravityG: optionalNumber(draft.effectiveGravityG),
    additionalParameters: null,
    language: draft.language.trim() || null,
  };
}

export async function submitHabitatAnalysis(request: CreateHabitatAnalysisRequest, signal?: AbortSignal): Promise<HabitatApiOutcome> {
  return sendHabitatRequest("/api/backend/habitat-analyses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal });
}

export async function getHabitatAnalysis(id: string, signal?: AbortSignal): Promise<HabitatApiOutcome> {
  if (!isGuid(id)) return { problem: { status: 400, title: "Invalid analysis identifier", errorCode: "INVALID_ANALYSIS_ID" } };
  return sendHabitatRequest(`/api/backend/habitat-analyses/${id}`, { signal });
}

export class HabitatFormError extends Error {
  constructor(readonly errors: Record<string, string>) { super("Habitat form validation failed."); }
}

async function sendHabitatRequest(url: string, init: RequestInit): Promise<HabitatApiOutcome> {
  try {
    const response = await fetch(url, { ...init, cache: "no-store" });
    const body = await readJson(response);
    if (response.status === 201 || response.status === 200) {
      if (isHabitatAnalysis(body)) return { analysis: body };
      return { problem: { status: 502, title: "Invalid Habitat response", detail: "The persisted analysis response could not be processed.", errorCode: "HABITAT_INVALID_RESPONSE" } };
    }
    if (isProblemDetails(body)) return { problem: body };
    return { problem: { status: response.status || 502, title: "Habitat request failed", detail: "The backend returned an unexpected response.", errorCode: "HABITAT_INVALID_ERROR_RESPONSE" } };
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") return { problem: { status: 499, title: "Request cancelled", detail: "The request was cancelled.", errorCode: "REQUEST_CANCELLED" } };
    return { problem: { status: 502, title: "Habitat service unavailable", detail: "The Habitat backend could not be reached.", errorCode: "HABITAT_BACKEND_UNAVAILABLE" } };
  }
}

async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return null; }
}

function validateOptionalNumber(value: string, key: string, min: number, max: number, message: string, errors: Record<string, string>) {
  if (!value.trim()) return;
  const parsed = optionalNumber(value);
  if (parsed === null || parsed < min || parsed > max) errors[key] = message;
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isPositiveInteger(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }
function isGuid(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function nullableText(value: unknown): value is string | null { return value === null || typeof value === "string"; }
function nullableNumber(value: unknown): value is number | null { return value === null || (typeof value === "number" && Number.isFinite(value)); }
function isProblemDetails(value: unknown): value is ProblemDetails {
  return isRecord(value) && typeof value.status === "number" && typeof value.title === "string"
    && ["detail", "errorCode", "traceId", "analysisId"].every((key) => value[key] === undefined || typeof value[key] === "string")
    && (value.errors === undefined || (isRecord(value.errors) && Object.values(value.errors).every((messages) => Array.isArray(messages) && messages.every((item) => typeof item === "string"))));
}
function catalogReference(value: unknown): boolean { return isRecord(value) && isPositiveInteger(value.id) && typeof value.code === "string" && typeof value.name === "string"; }
function inputValue(value: unknown): boolean { return isRecord(value) && nullableNumber(value.value) && typeof value.origin === "string" && nullableText(value.measurementBasis); }
function isHabitatAnalysis(value: unknown): value is HabitatAnalysis {
  return isRecord(value) && typeof value.id === "string" && typeof value.status === "string" && typeof value.requestedAt === "string"
    && (value.generation === undefined || value.generation === null || (isRecord(value.generation) && typeof value.generation.mode === "string" && nullableText(value.generation.provider) && nullableText(value.generation.model)))
    && catalogReference(value.environment) && catalogReference(value.material) && isRecord(value.inputs)
    && inputValue(value.inputs.oxygenVolumePercent) && inputValue(value.inputs.pressureKPa) && inputValue(value.inputs.temperatureCelsius)
    && isRecord(value.inputs.gravity) && nullableText(value.inputs.gravity.regime) && nullableNumber(value.inputs.gravity.effectiveGravityG) && typeof value.inputs.gravity.origin === "string"
    && (value.error === null || (isRecord(value.error) && nullableText(value.error.code) && nullableText(value.error.message)))
    && (value.result === null || (isRecord(value.result) && nullableText(value.result.analysisBasis) && nullableText(value.result.riskLabel) && nullableText(value.result.explanation) && nullableText(value.result.limitations)
      && typeof value.result.isMock === "boolean" && typeof value.result.isScientificallyValidated === "boolean"
      && Array.isArray(value.result.factors) && value.result.factors.every((factor) => isRecord(factor) && typeof factor.name === "string" && nullableText(factor.description) && nullableText(factor.direction))
      && Array.isArray(value.result.citations) && value.result.citations.every((citation) => isRecord(citation) && typeof citation.matchStatus === "string" && nullableText(citation.rawTitle) && nullableText(citation.rawUrl) && nullableText(citation.excerpt)
        && (citation.source === null || (isRecord(citation.source) && isPositiveInteger(citation.source.id) && typeof citation.source.title === "string" && nullableText(citation.source.doi) && nullableText(citation.source.url))))))
    && typeof value.disclaimer === "string";
}
