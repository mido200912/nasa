import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/simulator/stress-test/route";
import { createSimulationStore } from "@/store/useSimulationStore";
import { buildStressTestResult, parseStressTestResult } from "@/lib/stress-test";

const input = { environment: "lunar" as const, oxygenLevel: 30, pressurePsi: 10.2, gravityG: 0.16, materialId: "pmma_acrylic" as const };
const request = (body: unknown) => new Request("http://localhost:3001/api/v1/simulator/stress-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("stress-test HTTP boundary", () => {
  it("returns the complete qualified, input-responsive contract", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const response = await POST(request(input));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const result = await response.json();
    expect(parseStressTestResult(result)).not.toBeNull();
    expect(result).toMatchObject({ illustrative: true, burnRateMultiplier: 3.5, flameParams: { morphology: "spherical_expanding" }, suppressionSpec: { recommendedAgent: "Fine-Water-Mist", dropletMicrons: 50 } });
    expect(result.disclaimer).toContain("not");
    const earth = buildStressTestResult({ ...input, gravityG: 1 });
    const low = buildStressTestResult({ ...input, oxygenLevel: 15, materialId: "teflon_ptfe" });
    expect(earth.flameParams.morphology).toBe("teardrop_upward");
    expect(result.flameParams.coreRadius).toBeGreaterThan(low.flameParams.coreRadius);
    expect(result.flameParams.particleDensity).toBeGreaterThan(low.flameParams.particleDensity);
  });
  it.each([{ oxygenLevel: "30" }, { oxygenLevel: 41 }, { pressurePsi: 0 }, { gravityG: -1 }, { environment: "venus" }, { materialId: "unknown" }])("rejects invalid input %j", async (patch) => {
    expect((await POST(request({ ...input, ...patch }))).status).toBe(400);
  });
  it("rejects malformed, oversized and non-JSON bodies", async () => {
    expect((await POST(new Request(request(input), { body: "{" }))).status).toBe(400);
    expect((await POST(request({ ...input, extra: "x".repeat(3000) }))).status).toBe(413);
    expect((await POST(new Request(request(input), { headers: { "Content-Type": "text/plain" } }))).status).toBe(415);
  });
  it("remains an offline illustrative route even when legacy public configuration exists", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://untrusted.example.test");
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);

    const response = await POST(request(input));

    expect(response.status).toBe(200);
    expect(upstream).not.toHaveBeenCalled();
    expect((await response.json()).illustrative).toBe(true);
  });
});

describe("transient simulator state", () => {
  it("uses the default suppression timer, ignores double deployments, and cancels it on reignition", () => {
    vi.useFakeTimers();
    const store = createSimulationStore();
    expect(store.getState()).toMatchObject({ isSuppressing: false, flameExtinguished: false, isLoadingStressTest: false, stressTestResult: null });
    store.getState().triggerSuppression();
    vi.advanceTimersByTime(2000);
    store.getState().triggerSuppression();
    vi.advanceTimersByTime(2000);
    expect(store.getState()).toMatchObject({ isSuppressing: false, flameExtinguished: true });
    store.getState().resetIgnition();
    store.getState().triggerSuppression();
    store.getState().resetIgnition();
    vi.advanceTimersByTime(5000);
    expect(store.getState()).toMatchObject({ isSuppressing: false, flameExtinguished: false });
  });
  it("posts the exact snapshot, validates the response, and captures API suppression duration", async () => {
    vi.useFakeTimers();
    const result = buildStressTestResult(input);
    const fetcher = vi.fn().mockResolvedValue(Response.json(result));
    vi.stubGlobal("fetch", fetcher);
    const store = createSimulationStore();
    store.getState().setMaterial("pmma_acrylic");
    await store.getState().runStressTest();
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(input);
    expect(store.getState().stressTestResult).toMatchObject(result);
    store.getState().triggerSuppression();
    vi.advanceTimersByTime(result.suppressionSpec.extinguishTimeSeconds * 1000 - 1);
    expect(store.getState().isSuppressing).toBe(true);
    vi.advanceTimersByTime(1);
    expect(store.getState().flameExtinguished).toBe(true);
  });
  it("ignores stale responses even if the transport ignores abort; scenario edits cancel suppression", async () => {
    vi.useFakeTimers();
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    const store = createSimulationStore();
    const pending = store.getState().runStressTest();
    store.getState().triggerSuppression();
    store.getState().setParameter("oxygenLevel", 35);
    resolve(Response.json(buildStressTestResult(input)));
    await pending;
    vi.advanceTimersByTime(6000);
    expect(store.getState()).toMatchObject({ oxygenLevel: 35, stressTestResult: null, isLoadingStressTest: false, isSuppressing: false, flameExtinguished: false });
  });
  it("keeps immediate controls usable after API failure or invalid output", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ invalid: true })));
    const store = createSimulationStore();
    await store.getState().runStressTest();
    expect(store.getState().stressTestError).toBeTruthy();
    expect(store.getState().isLoadingStressTest).toBe(false);
    store.getState().setParameter("gravityG", 1);
    expect(store.getState().gravityG).toBe(1);
    expect(store.getState().stressTestError).toBeNull();
  });
  it("never restores transient API or suppression state from session storage", async () => {
    vi.stubGlobal("sessionStorage", { getItem: () => JSON.stringify({ state: { isSuppressing: true, flameExtinguished: true, isLoadingStressTest: true, stressTestResult: buildStressTestResult(input), suppressionStartedAt: 1, triggerSuppression: "injected" } }), setItem: vi.fn(), removeItem: vi.fn() });
    const store = createSimulationStore();
    await store.persist.rehydrate();
    expect(store.getState()).toMatchObject({ isSuppressing: false, flameExtinguished: false, isLoadingStressTest: false, stressTestResult: null, suppressionStartedAt: null });
    expect(typeof store.getState().triggerSuppression).toBe("function");
  });
});
