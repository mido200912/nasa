import { describe, expect, it, vi } from "vitest";
import { calculateSimulation, materialCatalog, presets, normalizeParameters } from "@/lib/simulation";
import { createSimulationStore } from "@/store/useSimulationStore";
import { buildPlaybook } from "@/lib/playbook";

describe("illustrative simulation", () => {
  it("has all six materials and a qualified lunar example", () => {
    expect(materialCatalog).toHaveLength(6);
    const result = calculateSimulation({ ...presets.lunar, selectedMaterial: "cable_insulation" });
    expect(result.burnRateMultiplier).toBe(3.5);
    expect(result.validated).toBe(false);
    expect(result.ignitabilityRiskScore).toBeGreaterThanOrEqual(0);
    expect(result.ignitabilityRiskScore).toBeLessThanOrEqual(100);
  });
  it("keeps an Earth baseline and distinguishes diffusion from buoyant flames", () => {
    expect(calculateSimulation({ ...presets.earth, selectedMaterial: "cable_insulation" }).burnRateMultiplier).toBe(1);
    expect(calculateSimulation({ ...presets.iss, selectedMaterial: "cable_insulation" }).flameMorphology).toBe("Spherical cool diffusion");
    expect(calculateSimulation({ ...presets.lunar, selectedMaterial: "cable_insulation" }).flameMorphology).toBe("Accelerated upward plume");
  });
  it("rejects nonfinite values and clamps ranges", () => {
    expect(normalizeParameters({ oxygenLevel: Infinity, pressurePsi: NaN, gravityG: -2 })).toEqual({ oxygenLevel: 30, pressurePsi: 10.2, gravityG: 0 });
    expect(normalizeParameters({ oxygenLevel: 60, pressurePsi: 1, gravityG: 5 })).toEqual({ oxygenLevel: 40, pressurePsi: 5, gravityG: 1 });
  });
  it("responds monotonically to oxygen and selected material", () => {
    const base = { ...presets.lunar, selectedMaterial: "cable_insulation" as const };
    expect(calculateSimulation({ ...base, oxygenLevel: 40 }).burnRateMultiplier).toBeGreaterThan(calculateSimulation({ ...base, oxygenLevel: 15 }).burnRateMultiplier);
    expect(calculateSimulation({ ...base, selectedMaterial: "teflon_ptfe" }).ignitabilityRiskScore).toBeLessThan(calculateSimulation(base).ignitabilityRiskScore);
  });
});

describe("shared scenario state", () => {
  it("applies complete presets and marks edited parameters as custom", () => {
    const store = createSimulationStore();
    store.getState().setEnvironment("iss");
    expect(store.getState()).toMatchObject({ ...presets.iss, environment: "iss", custom: false, focusedPlanet: "earth" });
    store.getState().setParameter("oxygenLevel", 34);
    expect(store.getState()).toMatchObject({ oxygenLevel: 34, custom: true });
    store.getState().setEnvironment("mars");
    expect(store.getState()).toMatchObject({ ...presets.mars, focusedPlanet: "mars", custom: false });
  });
  it("preserves material and bridge state across environment switches", () => {
    const store = createSimulationStore();
    store.getState().setMaterial("nomex_fabric");
    store.getState().setEarthImpactMode(true);
    store.getState().setEnvironment("lunar");
    expect(store.getState()).toMatchObject({ selectedMaterial: "nomex_fabric", earthImpactMode: true });
  });
  it("validates persisted values without accepting injected actions", async () => {
    vi.stubGlobal("sessionStorage", { getItem: () => JSON.stringify({ state: { environment: "bad", oxygenLevel: 999, pressurePsi: -3, gravityG: 8, selectedMaterial: "bad", earthImpactMode: "yes", focusedPlanet: "bad", setEnvironment: "injected" }, version: 0 }), setItem: vi.fn(), removeItem: vi.fn() });
    try {
      const store = createSimulationStore();
      await store.persist.rehydrate();
      expect(store.getState()).toMatchObject({ environment: "lunar", oxygenLevel: 40, pressurePsi: 5, gravityG: 1, selectedMaterial: "cable_insulation", earthImpactMode: false, focusedPlanet: "earth" });
      store.getState().setEnvironment("iss");
      expect(store.getState().gravityG).toBe(0);
    } finally { vi.unstubAllGlobals(); }
  });
  it("remains usable with blocked storage", async () => {
    vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } });
    try {
      const store = createSimulationStore();
      await store.persist.rehydrate();
      expect(() => store.getState().setEnvironment("mars")).not.toThrow();
      expect(store.getState().environment).toBe("mars");
    } finally { vi.unstubAllGlobals(); }
  });
});

describe("review-only playbooks", () => {
  it("includes scenario context, four sections, references, and no equipment setpoints", () => {
    const book = buildPlaybook("battery", { ...presets.mars, environment: "mars", selectedMaterial: "pmma_acrylic" }, "Rover battery incident");
    expect(book.context).toContain("Mars");
    expect(book.prompt).toBe("Rover battery incident");
    expect(book.sections).toHaveLength(4);
    expect(book.sections[1].items.join(" ")).toContain("qualified");
    expect(book.disclaimer).toContain("Not an emergency procedure");
    expect(book.references.map((item) => item.label).join(" ")).toContain("FLEX");
    expect(book.references.every((item) => item.href.startsWith("https://www.nasa.gov/"))).toBe(true);
  });
});
