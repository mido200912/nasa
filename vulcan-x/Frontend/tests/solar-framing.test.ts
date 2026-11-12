import { describe, expect, it } from "vitest";
import { PerspectiveCamera } from "three";
import { frameSolarCamera } from "../lib/solar-framing";

describe("wide solar-system framing", () => {
  for (const pageWidth of [1024, 1280, 1440, 1920]) {
    it(`fills approximately 70% of a ${pageWidth}px desktop page`, () => {
      const canvasWidth = pageWidth * 0.74;
      const canvasHeight = Math.max(460, Math.min(750, pageWidth * 0.35));
      const camera = new PerspectiveCamera(43, canvasWidth / canvasHeight, 0.1, 60);
      const frame = frameSolarCamera(camera, canvasWidth, canvasHeight, false);
      expect(frame.widthRatio * 0.74).toBeCloseTo(0.7, 1);
      expect(frame.heightRatio).toBeLessThanOrEqual(0.93);
      expect(camera.zoom).toBeGreaterThan(0);
    });
  }

  it("keeps the complete system in the mobile drawing area", () => {
    const camera = new PerspectiveCamera(43, 375 / 260, 0.1, 60);
    const frame = frameSolarCamera(camera, 375, 260, true);
    expect(frame.widthRatio).toBeLessThanOrEqual(0.95);
    expect(frame.heightRatio).toBeLessThanOrEqual(0.93);
  });
});
