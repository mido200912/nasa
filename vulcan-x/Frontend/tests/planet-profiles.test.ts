import { describe, expect, it } from "vitest";
import { getPlanetMetrics, planetProfiles } from "../lib/planet-profiles";
import { solarPlanets } from "../lib/solar-system";

describe("planet card reference data", () => {
  it("provides a distinct sourced profile and four metrics for every planet", () => {
    expect(Object.keys(planetProfiles).sort()).toEqual(solarPlanets.map((planet) => planet.id).sort());
    for (const planet of solarPlanets) {
      const profile = planetProfiles[planet.id];
      const metrics = getPlanetMetrics(profile);
      expect(metrics).toHaveLength(4);
      expect(metrics.every((metric) => metric.label && metric.value && metric.unit)).toBe(true);
      expect(profile.source).toMatch(/^https:\/\/nssdc\.gsfc\.nasa\.gov\/planetary\/factsheet\//);
      expect(profile.note).not.toMatch(/burn rate|ignitability/i);
    }
    expect(new Set(Object.values(planetProfiles).map((profile) => profile.temperatureC)).size).toBe(8);
  });

  it("uses planetary reference values rather than sealed-habitat assumptions", () => {
    expect(planetProfiles.earth.temperatureC).toBe(15);
    expect(planetProfiles.mars.temperatureC).toBe(-65);
    expect(planetProfiles.jupiter.temperatureC).toBe(-110);
    expect(planetProfiles.jupiter.gravity).toBe(23.1);
    expect(planetProfiles.venus.temperatureC).toBeGreaterThan(planetProfiles.mercury.temperatureC);
  });

  it("keeps giant-planet reference levels and retrograde rotation explicit", () => {
    for (const id of ["jupiter", "saturn", "uranus", "neptune"]) {
      expect(planetProfiles[id].footnote).toContain("1-bar");
    }
    expect(planetProfiles.venus.footnote).toContain("Retrograde");
    expect(planetProfiles.uranus.footnote).toContain("Retrograde");
    expect(getPlanetMetrics(planetProfiles.venus).find((metric) => metric.label === "Rotation")?.unit).toBe("days");
    expect(getPlanetMetrics(planetProfiles.earth).find((metric) => metric.label === "Rotation")?.unit).toBe("hours");
  });
});
