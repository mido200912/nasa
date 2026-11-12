/** UI demonstration only. Not fitted to experiments and not a combustion prediction. */
export function calculateDemoRisk(oxygen: number, pressure: number) {
  if (!Number.isFinite(oxygen) || !Number.isFinite(pressure)) {
    throw new Error("Oxygen and pressure must be finite numbers.");
  }
  const o2 = Math.max(15, Math.min(40, oxygen));
  const psi = Math.max(5, Math.min(16, pressure));
  const score = Math.round(Math.max(0, Math.min(100, 38 + (o2 - 21) * 4 + (psi - 14.7) * 1.2)));
  return {
    validated: false as const,
    score,
    label: score >= 65 ? "ELEVATED" : score >= 40 ? "MODERATE" : "BASELINE",
    materials: [
      { name: "Cable insulation", value: Math.min(100, score + 18) },
      { name: "Cotton fabric", value: Math.min(100, score + 6) },
      { name: "Composite panel", value: Math.max(0, score - 14) },
    ],
  };
}
