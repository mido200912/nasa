import { describe, expect, it } from "vitest";
import { wrapIndex } from "../lib/orbit";

describe("habitat telemetry navigation", () => {
  it("wraps previous and next selection", () => {
    expect(wrapIndex(-1)).toBe(3);
    expect(wrapIndex(4)).toBe(0);
  });
  it("preserves each valid environment selection", () => {
    for (let index = 0; index < 4; index++) {
      expect(wrapIndex(index)).toBe(index);
    }
  });
  it("wraps selections across multiple cycles", () => {
    expect(wrapIndex(9)).toBe(1);
    expect(wrapIndex(-9)).toBe(3);
  });
});
