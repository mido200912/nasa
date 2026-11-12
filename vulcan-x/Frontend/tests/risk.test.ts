import { describe, expect, it } from "vitest";
import { calculateDemoRisk } from "../lib/risk";

describe("illustrative stress-test model", () => {
  it("is explicitly labeled as unvalidated", () => {
    expect(calculateDemoRisk(30, 10.2).validated).toBe(false);
  });
  it("increases illustrative risk with oxygen", () => {
    expect(calculateDemoRisk(30, 10.2).score).toBeGreaterThan(calculateDemoRisk(21, 10.2).score);
  });
  it("keeps scores bounded and rejects non-finite inputs", () => {
    expect(calculateDemoRisk(1000, 1000).score).toBeLessThanOrEqual(100);
    expect(() => calculateDemoRisk(Number.NaN, 10)).toThrow();
  });
});
