import { calculateSimulation, isEnvironment, isMaterial, materialCatalog, type EnvironmentId, type MaterialId, type Parameters } from "@/lib/simulation";
import { getFlameResponse } from "@/lib/flame-response";

export interface StressTestRequest extends Parameters { environment: EnvironmentId; materialId: MaterialId }
export interface StressTestResult {
  riskScore: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  riskColorHex: string;
  burnRateMultiplier: number;
  flameParams: { morphology: "spherical_expanding" | "teardrop_upward"; coreRadius: number; outerPlasmaColor: string; coreColor: string; particleDensity: number; expansionVelocity: number };
  suppressionSpec: { recommendedAgent: string; dropletMicrons: number; extinguishTimeSeconds: number };
  nasaReference: string;
  illustrative?: boolean;
  disclaimer?: string;
}

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const numberIn = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const hex = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const text = (value: unknown, max = 240): value is string => typeof value === "string" && value.length > 0 && value.length <= max;

/** Explicit boundary allowlist: never coerce numeric strings or clamp API input. */
export function parseStressTestRequest(value: unknown): StressTestRequest | null {
  if (!record(value) || !isEnvironment(value.environment) || !isMaterial(value.materialId) || !numberIn(value.oxygenLevel, 15, 40) || !numberIn(value.pressurePsi, 5, 14.7) || !numberIn(value.gravityG, 0, 1)) return null;
  return { environment: value.environment, oxygenLevel: value.oxygenLevel, pressurePsi: value.pressurePsi, gravityG: value.gravityG, materialId: value.materialId };
}

/** Upstream output is untrusted too; bounds protect GPU allocations and timers. */
export function parseStressTestResult(value: unknown): StressTestResult | null {
  if (!record(value) || !numberIn(value.riskScore, 0, 100) || !["LOW", "MODERATE", "HIGH", "CRITICAL"].includes(String(value.riskLevel)) || !hex(value.riskColorHex) || !numberIn(value.burnRateMultiplier, 0.1, 20) || !text(value.nasaReference)) return null;
  const f = value.flameParams, s = value.suppressionSpec;
  if (!record(f) || !["spherical_expanding", "teardrop_upward"].includes(String(f.morphology)) || !numberIn(f.coreRadius, 0.1, 3) || !hex(f.outerPlasmaColor) || !hex(f.coreColor) || !numberIn(f.particleDensity, 0, 1024) || !Number.isInteger(f.particleDensity) || !numberIn(f.expansionVelocity, 0, 10)) return null;
  if (!record(s) || !text(s.recommendedAgent, 80) || !numberIn(s.dropletMicrons, 1, 1000) || !numberIn(s.extinguishTimeSeconds, 0.1, 60)) return null;
  return {
    riskScore: value.riskScore, riskLevel: value.riskLevel as StressTestResult["riskLevel"], riskColorHex: value.riskColorHex, burnRateMultiplier: value.burnRateMultiplier,
    flameParams: { morphology: f.morphology as StressTestResult["flameParams"]["morphology"], coreRadius: f.coreRadius, outerPlasmaColor: f.outerPlasmaColor, coreColor: f.coreColor, particleDensity: f.particleDensity, expansionVelocity: f.expansionVelocity },
    suppressionSpec: { recommendedAgent: s.recommendedAgent, dropletMicrons: s.dropletMicrons, extinguishTimeSeconds: s.extinguishTimeSeconds },
    nasaReference: value.nasaReference,
    ...(value.illustrative === true ? { illustrative: true } : {}),
    ...(text(value.disclaimer, 1000) ? { disclaimer: value.disclaimer } : {}),
  };
}

export function chamberLift(gravity: number) {
  const t = Math.max(0, Math.min(1, (gravity - 0.4) / 0.3));
  return t * t * (3 - 2 * t);
}

/** Synthetic display service, NOT a combustion/suppression solver or NASA fit. */
export function buildStressTestResult(input: StressTestRequest): StressTestResult {
  const scenario = { ...input, selectedMaterial: input.materialId };
  const metrics = calculateSimulation(scenario);
  const visual = getFlameResponse(scenario);
  const material = materialCatalog.find((item) => item.id === input.materialId)!;
  const activity = (material.demoHazards[1] - 34) / 49;
  const oxygen = (input.oxygenLevel - 15) / 25;
  const score = metrics.ignitabilityRiskScore;
  return {
    riskScore: score, riskLevel: score >= 85 ? "CRITICAL" : score >= 70 ? "HIGH" : score >= 45 ? "MODERATE" : "LOW",
    // Hazard illumination inside the scientific scene, not UI/brand colors.
    riskColorHex: score >= 85 ? "#FF2A00" : score >= 70 ? "#FF8800" : "#6B99FF",
    burnRateMultiplier: metrics.burnRateMultiplier,
    flameParams: { morphology: chamberLift(input.gravityG) < 0.5 ? "spherical_expanding" : "teardrop_upward", coreRadius: +(visual.size * 1.2).toFixed(3), outerPlasmaColor: "#00E5FF", coreColor: "#FF5500", particleDensity: Math.round(48 + oxygen * 190 + activity * 110), expansionVelocity: +(0.45 + oxygen * 1.1 + activity * 0.8).toFixed(2) },
    suppressionSpec: { recommendedAgent: "Fine-Water-Mist", dropletMicrons: 50, extinguishTimeSeconds: 4.2 },
    nasaReference: "NASA BASS-II / Saffire-IV (reading context only; not the source of these values)",
    illustrative: true,
    disclaimer: "Synthetic teaching values, not validated predictions or equipment recommendations. Suppression duration is an animation setting, not an extinguishment forecast. No NASA endorsement.",
  };
}
