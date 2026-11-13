import { materialCatalog, normalizeParameters, type SimulationInput } from "@/lib/simulation";

/** Art-directed display mappings, NOT measured material response or a combustion
 * law. Exaggerated within camera-safe bounds so input changes are easy to see. */
export function getFlameResponse(input: SimulationInput) {
  const parameters = normalizeParameters(input);
  const oxygen = (parameters.oxygenLevel - 15) / 25;
  const pressure = (parameters.pressurePsi - 5) / 9.7;
  const material = materialCatalog.find((item) => item.id === input.selectedMaterial) ?? materialCatalog[0];
  // Reuse the already disclosed synthetic heat-release index, not a new
  // purported material property or arbitrary chemical flame-color assignment.
  const activity = (material.demoHazards[1] - 34) / 49;
  const g = parameters.gravityG;
  const blend = Math.max(0, Math.min(1, (g - 0.06) / 0.04));
  const lift = blend * blend * (3 - 2 * blend) * (0.48 + 0.52 * Math.sqrt(g));
  const size = Math.min(1.22, (0.68 + 0.38 * oxygen + 0.22 * pressure) * (0.74 + 0.30 * activity));
  const stretch = Math.min(1 + lift * (0.72 + 0.34 * oxygen), 1.74 / (0.82 * size));
  return {
    validated: false as const,
    size,
    lift,
    stretch,
    width: 1 + lift * ((0.9 - 0.38 * Math.sqrt(g)) * (0.82 + 0.24 * pressure) - 1),
    brightness: 0.5 + 0.55 * oxygen + 0.24 * pressure + 0.26 * activity,
    opacity: Math.min(0.95, 0.55 + 0.2 * oxygen + 0.1 * pressure + 0.1 * activity),
    speed: 0.45 + 0.8 * oxygen + 0.25 * pressure + 0.35 * activity,
    distortion: 0.025 + 0.07 * activity + 0.03 * oxygen,
  };
}
export type FlameResponse = ReturnType<typeof getFlameResponse>;
