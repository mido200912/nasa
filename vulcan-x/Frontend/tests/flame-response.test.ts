import { describe, expect, it } from "vitest";
import { getFlameResponse } from "@/lib/flame-response";
import { materialCatalog, presets, type SimulationInput } from "@/lib/simulation";

const lunar: SimulationInput = { ...presets.lunar, selectedMaterial: "cable_insulation" };
describe("illustrative flame response", () => {
  it("makes oxygen visibly change scale, brightness and motion", () => {
    const low = getFlameResponse({ ...lunar, oxygenLevel: 15 });
    const high = getFlameResponse({ ...lunar, oxygenLevel: 40 });
    expect(high.size / low.size).toBeGreaterThan(1.25);
    expect(high.brightness / low.brightness).toBeGreaterThan(1.3);
    expect(high.speed).toBeGreaterThan(low.speed);
  });
  it("makes pressure visibly change the envelope and brightness", () => {
    const low = getFlameResponse({ ...lunar, pressurePsi: 5 });
    const high = getFlameResponse({ ...lunar, pressurePsi: 14.7 });
    expect(high.size / low.size).toBeGreaterThan(1.15);
    expect(high.brightness).toBeGreaterThan(low.brightness);
    expect(high.width).not.toBe(low.width);
  });
  it("keeps microgravity spherical and varies plume shape across partial gravity", () => {
    const iss = getFlameResponse({ ...lunar, gravityG: 0 });
    const moon = getFlameResponse(lunar);
    const mars = getFlameResponse({ ...lunar, gravityG: 0.38 });
    const earth = getFlameResponse({ ...lunar, gravityG: 1 });
    expect(iss.lift).toBe(0);
    expect(iss.stretch).toBe(1);
    expect(iss.width).toBe(1);
    expect(mars.stretch).toBeGreaterThan(moon.stretch);
    expect(earth.stretch).toBeGreaterThan(mars.stretch);
  });
  it("gives each material a distinct bounded synthetic response", () => {
    const profiles = materialCatalog.map((material) => getFlameResponse({ ...lunar, selectedMaterial: material.id }));
    expect(new Set(profiles.map((profile) => profile.size)).size).toBe(6);
    const foam = getFlameResponse({ ...lunar, selectedMaterial: "acoustic_foam" });
    const ptfe = getFlameResponse({ ...lunar, selectedMaterial: "teflon_ptfe" });
    expect(foam.size / ptfe.size).toBeGreaterThan(1.15);
    expect(foam.brightness).toBeGreaterThan(ptfe.brightness);
    expect(foam.distortion).toBeGreaterThan(ptfe.distortion);
    for (const gravityG of [0, 0.08, 0.1, 0.16, 0.38, 1]) for (const oxygenLevel of [15, 40]) for (const pressurePsi of [5, 14.7]) {
      const result = getFlameResponse({ ...lunar, gravityG, oxygenLevel, pressurePsi, selectedMaterial: "pmma_acrylic" });
      expect(result.size * result.stretch * 0.82).toBeLessThan(1.76);
      expect(result.validated).toBe(false);
      expect(Object.values(result).filter((value) => typeof value === "number").every(Number.isFinite)).toBe(true);
    }
  });
});
