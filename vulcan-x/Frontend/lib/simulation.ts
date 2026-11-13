export type EnvironmentId = "lunar" | "mars" | "iss" | "earth";
export type MaterialId = "cable_insulation" | "acoustic_foam" | "pmma_acrylic" | "nomex_fabric" | "silicone_elastomer" | "teflon_ptfe";
export interface Parameters { oxygenLevel: number; pressurePsi: number; gravityG: number }
export interface SimulationInput extends Parameters { selectedMaterial: MaterialId }

export const environmentNames: Record<EnvironmentId, string> = {
  lunar: "Lunar base", mars: "Mars habitat", iss: "ISS lab", earth: "Earth bridge",
};
export const presets: Record<EnvironmentId, Parameters> = {
  lunar: { oxygenLevel: 30, pressurePsi: 10.2, gravityG: 0.16 },
  mars: { oxygenLevel: 21, pressurePsi: 14.7, gravityG: 0.38 },
  iss: { oxygenLevel: 21, pressurePsi: 14.7, gravityG: 0 },
  earth: { oxygenLevel: 21, pressurePsi: 14.7, gravityG: 1 },
};

/** Synthetic UI profiles, NOT extracted material properties or experiment results.
 * Source names identify research to explore, not proof that a grade was tested. */
export const materialCatalog: { id: MaterialId; name: string; family: string; context: string; behavior: string; demoHazards: [number, number, number, number] }[] = [
  { id: "cable_insulation", name: "Kapton wire insulation", family: "Electrical", context: "Saffire", behavior: "Spread depends on insulation grade, geometry, and forced flow.", demoHazards: [72, 62, 78, 65] },
  { id: "acoustic_foam", name: "Acoustic melamine foam", family: "Interior", context: "BASS-II", behavior: "Porosity and ventilation can alter heat and oxygen transport.", demoHazards: [82, 76, 85, 70] },
  { id: "pmma_acrylic", name: "PMMA acrylic", family: "Polymer", context: "BASS-II / SOFIE", behavior: "Solid-fuel spread is sensitive to oxygen and imposed flow.", demoHazards: [77, 83, 62, 72] },
  { id: "nomex_fabric", name: "Nomex HT90-40", family: "Textile", context: "Saffire", behavior: "Fabric weave, thickness, and oxygen enrichment matter.", demoHazards: [38, 42, 46, 40] },
  { id: "silicone_elastomer", name: "Silicone elastomer", family: "Polymer", context: "Saffire", behavior: "Formulation and exposure conditions must be characterized.", demoHazards: [49, 53, 56, 48] },
  { id: "teflon_ptfe", name: "Teflon / PTFE", family: "Polymer", context: "BASS-II", behavior: "Thermal decomposition still requires byproduct assessment.", demoHazards: [27, 34, 65, 43] },
];

export function isEnvironment(value: unknown): value is EnvironmentId {
  return typeof value === "string" && Object.hasOwn(presets, value);
}
export function isMaterial(value: unknown): value is MaterialId {
  return materialCatalog.some((material) => material.id === value);
}
function clamp(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
export function normalizeParameters(input: Parameters): Parameters {
  return {
    oxygenLevel: clamp(input.oxygenLevel, 15, 40, 30),
    pressurePsi: clamp(input.pressurePsi, 5, 14.7, 10.2),
    gravityG: clamp(input.gravityG, 0, 1, 0.16),
  };
}

/** Deliberately transparent teaching heuristic, not fitted NASA empirical curves.
 * 3.5x is the supplied lunar UI example, NOT a research-backed burn-rate claim. */
export function calculateSimulation(input: SimulationInput) {
  const { oxygenLevel, pressurePsi, gravityG } = normalizeParameters(input);
  const material = materialCatalog.find((item) => item.id === input.selectedMaterial) ?? materialCatalog[0];
  const oxygenGain = (oxygenLevel - 21) * ((2.5 + 4.5 * 0.03) / 9);
  const pressureOffset = (pressurePsi - 14.7) * 0.03;
  const burnRateMultiplier = Math.round(Math.max(0.2, 1 + oxygenGain + pressureOffset) * 10) / 10;
  const environmentalOffset = (oxygenLevel - 21) * 2 + (pressurePsi - 14.7) * 0.6;
  const hazardProfile = material.demoHazards.map((value) => Math.round(clamp(value + environmentalOffset, 0, 100, 0)));
  const ignitabilityRiskScore = hazardProfile[0];
  return {
    validated: false as const,
    burnRateMultiplier,
    ignitabilityRiskScore,
    riskLabel: ignitabilityRiskScore >= 75 ? "Elevated scenario" : ignitabilityRiskScore >= 45 ? "Moderate scenario" : "Lower scenario index",
    flameMorphology: gravityG < 0.1 ? "Spherical cool diffusion" : oxygenLevel >= 28 ? "Accelerated upward plume" : "Buoyant upward plume",
    // These indices and delay are synthetic too; never label them as measurements.
    ignitionDelaySeconds: Math.round(24 / Math.max(0.2, burnRateMultiplier)),
    toxicityIndex: hazardProfile[2],
    hazardProfile,
    spread: Array.from({ length: 13 }, (_, i) => ({ seconds: i * 5, earth: +(i * 0.08).toFixed(2), habitat: +(i * 0.08 * burnRateMultiplier).toFixed(2) })),
  };
}
