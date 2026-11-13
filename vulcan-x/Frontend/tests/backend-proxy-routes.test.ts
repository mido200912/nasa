import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as environmentsGet } from "@/app/api/backend/environments/route";
import { GET as materialsGet } from "@/app/api/backend/materials/route";
import { GET as materialGet } from "@/app/api/backend/materials/[id]/route";
import { GET as experimentsGet } from "@/app/api/backend/experiments/route";
import { GET as experimentGet } from "@/app/api/backend/experiments/[id]/route";
import { GET as sourceGet } from "@/app/api/backend/sources/[id]/route";
import { GET as technologiesGet } from "@/app/api/backend/technologies/route";
import { GET as technologyGet } from "@/app/api/backend/technologies/[id]/route";
import { POST as habitatPost } from "@/app/api/backend/habitat-analyses/route";
import { GET as habitatGet } from "@/app/api/backend/habitat-analyses/[id]/route";
import { POST as knowledgePost } from "@/app/api/backend/knowledge/queries/route";
import { GET as knowledgeGet } from "@/app/api/backend/knowledge/queries/[id]/route";

const frontendBase = "http://frontend.example.test";
const backendBase = "https://backend.example.test";
const guid = "9d755727-8ca2-4c0a-a78c-4d94d3c1137f";

const request = (path: string, init?: RequestInit) => new Request(`${frontendBase}${path}`, init);
const context = (id: string) => ({ params: Promise.resolve({ id }) });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("same-origin backend proxy route mapping", () => {
  it.each([
    ["environments", () => environmentsGet(request("/api/backend/environments")), `${backendBase}/api/environments`],
    ["materials", () => materialsGet(request("/api/backend/materials?search=pmma&category=polymer&page=2&pageSize=10&ignored=x")), `${backendBase}/api/materials?search=pmma&category=polymer&page=2&pageSize=10`],
    ["material detail", () => materialGet(request("/api/backend/materials/12"), context("12")), `${backendBase}/api/materials/12`],
    ["experiments", () => experimentsGet(request("/api/backend/experiments?discipline=combustion&gravityCondition=Microgravity&materialId=3&page=1&pageSize=25")), `${backendBase}/api/experiments?discipline=combustion&gravityCondition=Microgravity&materialId=3&page=1&pageSize=25`],
    ["experiment detail", () => experimentGet(request("/api/backend/experiments/13"), context("13")), `${backendBase}/api/experiments/13`],
    ["source detail", () => sourceGet(request("/api/backend/sources/14"), context("14")), `${backendBase}/api/sources/14`],
    ["technologies", () => technologiesGet(request("/api/backend/technologies?category=FireDetection&domain=Space&page=3&pageSize=5")), `${backendBase}/api/technologies?category=FireDetection&domain=Space&page=3&pageSize=5`],
    ["technology detail", () => technologyGet(request("/api/backend/technologies/15"), context("15")), `${backendBase}/api/technologies/15`],
    ["habitat detail", () => habitatGet(request(`/api/backend/habitat-analyses/${guid}`), context(guid)), `${backendBase}/api/habitat-analyses/${guid}`],
    ["knowledge detail", () => knowledgeGet(request(`/api/backend/knowledge/queries/${guid}`), context(guid)), `${backendBase}/api/knowledge/queries/${guid}`],
  ])("maps %s to its fixed ASP.NET Core route", async (_name, invoke, expected) => {
    vi.stubEnv("FIRE_SAFETY_API_BASE_URL", backendBase);
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetcher);

    expect((await invoke()).status).toBe(200);
    expect(fetcher.mock.calls[0][0].href).toBe(expected);
  });

  it("serializes only the Habitat body to its fixed backend route", async () => {
    vi.stubEnv("FIRE_SAFETY_API_BASE_URL", backendBase);
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: guid, status: "Completed" }, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const body = { environmentId: 1, materialId: 2, oxygenVolumePercent: 30, pressureKPa: 70.3 };

    const response = await habitatPost(request("/api/backend/habitat-analyses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

    expect(response.status).toBe(201);
    expect(fetcher.mock.calls[0][0].href).toBe(`${backendBase}/api/habitat-analyses`);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(body);
  });

  it("serializes the canonical top-level Knowledge DTO without a filters object", async () => {
    vi.stubEnv("FIRE_SAFETY_API_BASE_URL", backendBase);
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: guid, status: "Completed" }, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const body = { question: "What happens in microgravity?", environmentId: 1, materialId: 2, yearFrom: 2000, yearTo: 2020, maxSources: 5, language: "en" };

    const response = await knowledgePost(request("/api/backend/knowledge/queries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

    expect(response.status).toBe(201);
    expect(fetcher.mock.calls[0][0].href).toBe(`${backendBase}/api/knowledge/queries`);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(body);
  });
});

describe("backend proxy safety and error behavior", () => {
  it.each([400, 404, 422, 429, 502, 503, 504])("preserves a valid backend ProblemDetails response with status %i", async (status) => {
    vi.stubEnv("FIRE_SAFETY_API_BASE_URL", backendBase);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status, title: "Backend title", detail: "Safe detail", errorCode: "SAFE", traceId: "trace", analysisId: guid, unexpected: "not forwarded" }, { status })));

    const response = await habitatPost(request("/api/backend/habitat-analyses", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }));

    expect(response.status).toBe(status);
    expect(response.headers.get("content-type")).toContain("application/problem+json");
    expect(await response.json()).toEqual({ status, title: "Backend title", detail: "Safe detail", errorCode: "SAFE", traceId: "trace", analysisId: guid });
  });

  it("returns safe errors for missing/invalid configuration and connection failure", async () => {
    vi.stubEnv("FIRE_SAFETY_API_BASE_URL", "");
    expect((await environmentsGet(request("/api/backend/environments"))).status).toBe(503);

    vi.stubEnv("FIRE_SAFETY_API_BASE_URL", "file:///secret");
    expect((await environmentsGet(request("/api/backend/environments"))).status).toBe(503);

    vi.stubEnv("FIRE_SAFETY_API_BASE_URL", backendBase);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private upstream detail")));
    const response = await environmentsGet(request("/api/backend/environments"));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private upstream detail");
  });

  it("returns safe timeout and cancellation responses", async () => {
    vi.stubEnv("FIRE_SAFETY_API_BASE_URL", backendBase);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")));
    expect((await environmentsGet(request("/api/backend/environments"))).status).toBe(504);

    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")));
    expect((await environmentsGet(request("/api/backend/environments", { signal: controller.signal }))).status).toBe(499);
  });

  it("rejects malformed JSON, invalid route identifiers, and malformed upstream JSON safely", async () => {
    vi.stubEnv("FIRE_SAFETY_API_BASE_URL", backendBase);
    expect((await knowledgePost(request("/api/backend/knowledge/queries", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status).toBe(400);
    expect((await habitatPost(request("/api/backend/habitat-analyses", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" }))).status).toBe(415);
    expect((await materialGet(request("/api/backend/materials/not-a-number"), context("not-a-number"))).status).toBe(400);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 200, headers: { "Content-Type": "application/json" } })));
    expect((await environmentsGet(request("/api/backend/environments"))).status).toBe(502);
  });

  it("does not accept an arbitrary client-controlled destination URL", async () => {
    vi.stubEnv("FIRE_SAFETY_API_BASE_URL", backendBase);
    const fetcher = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetcher);

    await materialsGet(request("/api/backend/materials?url=https://attacker.example&search=pmma"));

    expect(fetcher.mock.calls[0][0].href).toBe(`${backendBase}/api/materials?search=pmma`);
  });
});
