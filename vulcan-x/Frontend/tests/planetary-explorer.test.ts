import { describe, expect, it } from "vitest";
import { getExplorerPath, getExplorerTransform, solarPlanets } from "../lib/solar-system";

describe("planetary explorer composition", () => {
  it("puts the selected planet in front on one tilted elliptical path", () => {
    for (let selected = 0; selected < 8; selected++) {
      const front = getExplorerTransform(selected, selected, false);
      expect(front.x).toBe(-1.2);
      expect(front.z).toBeGreaterThan(0);
      const others = solarPlanets.map((_, index) => getExplorerTransform(index, selected, false)).filter((_, index) => index !== selected);
      expect(others.every((item) => item.z < front.z && item.radius < front.radius)).toBe(true);
      expect(Math.max(...others.map((item) => item.y)) - Math.min(...others.map((item) => item.y))).toBeGreaterThan(4);
      expect(Math.max(...others.map((item) => item.radius)) / Math.min(...others.map((item) => item.radius))).toBeGreaterThan(1.3);
      expect(others.every((item) => item.radius < front.radius * 0.6 && item.brightness < 0.65)).toBe(true);
      for (let offset = 0; offset < 8; offset++) {
        const item = getExplorerTransform((selected + offset) % 8, selected, false);
        const path = getExplorerPath(offset / 8, false);
        expect([item.x, item.y, item.z]).toEqual([path.x, path.y, path.z]);
      }
    }
  });

  it("moves the newly selected planet to the spotlight", () => {
    expect(getExplorerTransform(7, 7, false).radius).toBeGreaterThan(getExplorerTransform(7, 2, false).radius);
    expect(getExplorerTransform(7, 7, false).x).toBe(-1.2);
  });

  it("preserves the composition at a smaller mobile scale", () => {
    const desktop = getExplorerTransform(1, 2, false);
    const mobile = getExplorerTransform(1, 2, true);
    expect(mobile.x).toBeCloseTo(desktop.x * 0.48);
    expect(mobile.radius).toBeCloseTo(desktop.radius * 0.48);
  });

  it("closes the curve without an empty-center solar-system layout", () => {
    const start = getExplorerPath(0, false);
    const end = getExplorerPath(1, false);
    expect(end.x).toBeCloseTo(start.x);
    expect(end.y).toBeCloseTo(start.y);
    expect(end.z).toBeCloseTo(start.z);
  });
});
