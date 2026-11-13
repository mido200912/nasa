import { afterEach, describe, expect, it, vi } from "vitest";
import { createHabitatRequest, emptyHabitatDraft, getHabitatAnalysis, HabitatFormError, submitHabitatAnalysis, validateHabitatDraft } from "@/lib/habitat-analysis";

const analysisId = "9d755727-8ca2-4c0a-a78c-4d94d3c1137f";
const completeAnalysis = {
  id: analysisId,
  status: "Completed",
  requestedAt: "2026-11-13T12:00:00Z",
  environment: { id: 17, code: "ISS", name: "International Space Station" },
  material: { id: 23, code: "PMMA", name: "PMMA" },
  inputs: {
    oxygenVolumePercent: { value: 30, origin: "UserProvided", measurementBasis: "VolumePercent" },
    pressureKPa: { value: 70.3, origin: "UserProvided", measurementBasis: null },
    temperatureCelsius: { value: null, origin: "Missing", measurementBasis: null },
    gravity: { regime: "Microgravity", effectiveGravityG: null, origin: "UserProvided" },
  },
  result: { riskLabel: "Review", analysisBasis: "LlmInterpretationOnly", isMock: false, isScientificallyValidated: false, explanation: "Interpretation only.", limitations: "Not validated.", factors: [{ name: "Factor", description: "Description", direction: "Unclear" }], citations: [] },
  error: null,
  disclaimer: "AI interpretation, not a scientifically validated safety decision.",
};

afterEach(() => vi.unstubAllGlobals());

describe("Habitat Analysis request preparation", () => {
  it("does not use illustrative values as scientific input defaults", () => {
    expect(emptyHabitatDraft(17, 23)).toMatchObject({ environmentId: 17, materialId: 23, oxygenVolumePercent: "", pressureKPa: "", temperatureCelsius: "", gravityRegime: "", effectiveGravityG: "" });
  });

  it("validates catalog IDs, scientific ranges, and gravity pairing", () => {
    const errors = validateHabitatDraft({ ...emptyHabitatDraft(null, null), oxygenVolumePercent: "101", pressureKPa: "0", temperatureCelsius: "-274", effectiveGravityG: "0.16" });
    expect(errors).toMatchObject({ environmentId: expect.any(String), materialId: expect.any(String), oxygenVolumePercent: expect.any(String), pressureKPa: expect.any(String), temperatureCelsius: expect.any(String), gravityRegime: expect.any(String) });
  });

  it("keeps live submission disabled before a scientific fixture is approved", () => {
    const draft = { ...emptyHabitatDraft(17, 23), oxygenVolumePercent: "30", pressureKPa: "70.3", gravityRegime: "Microgravity" as const };
    expect(() => createHabitatRequest(draft, false)).toThrow(HabitatFormError);
    try { createHabitatRequest(draft, false); } catch (error) {
      expect((error as HabitatFormError).errors.scientificInputs).toContain("disabled");
    }
  });

  it("builds the exact backend request only when a future approved fixture enables it", () => {
    const draft = { ...emptyHabitatDraft(17, 23), oxygenVolumePercent: "30", pressureKPa: "70.3", temperatureCelsius: "20", gravityRegime: "Microgravity" as const, effectiveGravityG: "0", language: "en" };
    expect(createHabitatRequest(draft, true)).toEqual({ environmentId: 17, materialId: 23, oxygenVolumePercent: 30, pressureKPa: 70.3, temperatureCelsius: 20, gravityRegime: "Microgravity", effectiveGravityG: 0, additionalParameters: null, language: "en" });
    expect(() => createHabitatRequest({ ...draft, pressureKPa: "" }, true)).toThrow(HabitatFormError);
  });
});

describe("Habitat Analysis same-origin API client", () => {
  it("preserves a successful persisted analysis response", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(completeAnalysis, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const request = createHabitatRequest({ ...emptyHabitatDraft(17, 23), oxygenVolumePercent: "30", pressureKPa: "70.3", gravityRegime: "Microgravity" }, true);

    const outcome = await submitHabitatAnalysis(request);

    expect(fetcher.mock.calls[0][0]).toBe("/api/backend/habitat-analyses");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(request);
    expect(outcome).toEqual({ analysis: completeAnalysis });
  });

  it.each([400, 404, 422, 502, 503, 504])("preserves backend ProblemDetails status %i and analysisId", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status, title: "Backend failure", detail: "Safe detail", errorCode: "SAFE", analysisId }, { status })));

    const outcome = await getHabitatAnalysis(analysisId);

    expect(outcome).toEqual({ problem: { status, title: "Backend failure", detail: "Safe detail", errorCode: "SAFE", analysisId } });
  });

  it("returns safe network and cancellation outcomes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("private network detail")).mockRejectedValueOnce(new DOMException("Aborted", "AbortError")));
    await expect(getHabitatAnalysis(analysisId)).resolves.toMatchObject({ problem: { status: 502, errorCode: "HABITAT_BACKEND_UNAVAILABLE" } });
    await expect(getHabitatAnalysis(analysisId)).resolves.toMatchObject({ problem: { status: 499, errorCode: "REQUEST_CANCELLED" } });
  });

  it("rejects invalid identifiers without sending a request", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(getHabitatAnalysis("not-a-guid")).resolves.toMatchObject({ problem: { status: 400 } });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not treat malformed success JSON as a completed analysis", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: "Completed" }, { status: 201 })));
    const request = createHabitatRequest({ ...emptyHabitatDraft(17, 23), oxygenVolumePercent: "30", pressureKPa: "70.3" }, true);
    await expect(submitHabitatAnalysis(request)).resolves.toMatchObject({ problem: { status: 502, errorCode: "HABITAT_INVALID_RESPONSE" } });
  });
});
