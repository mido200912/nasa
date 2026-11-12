import { describe, expect, it } from "vitest";
import { solarPlanets } from "../lib/solar-system";

describe("full solar system", () => {
  it("contains all eight planets in order from the Sun", () => {
    expect(solarPlanets.map((planet) => planet.name)).toEqual([
      "Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune",
    ]);
    for (let index = 1; index < solarPlanets.length; index++) {
      expect(solarPlanets[index].orbitRadius).toBeGreaterThan(solarPlanets[index - 1].orbitRadius);
    }
  });

  it("keeps every planet clear of the orbital origin and gives Saturn rings", () => {
    for (const planet of solarPlanets) {
      expect(planet.orbitRadius * 0.75 - planet.radius).toBeGreaterThan(0);
    }
    expect(solarPlanets.find((planet) => planet.id === "saturn")?.rings).toBe(true);
  });

  it("uses enlarged planet meshes so surface details remain visible", () => {
    expect(Math.min(...solarPlanets.map((planet) => planet.radius))).toBeGreaterThanOrEqual(0.32);
    expect(solarPlanets.find((planet) => planet.id === "earth")!.radius).toBeGreaterThanOrEqual(0.5);
    expect(solarPlanets.find((planet) => planet.id === "jupiter")!.radius).toBeGreaterThanOrEqual(0.85);
    expect(solarPlanets.find((planet) => planet.id === "saturn")!.radius).toBeGreaterThanOrEqual(0.7);
  });

  it("has a distinct procedural surface for each planet", () => {
    expect(new Set(solarPlanets.map((planet) => planet.shaderKind)).size).toBe(8);
  });
});
