export interface SolarPlanet {
  id: string;
  name: string;
  orbitRadius: number;
  radius: number;
  phase: number;
  shaderKind: number;
  rim: string;
  type: string;
  detail: string;
  rings?: boolean;
}

// Orbital order is real; distances, sizes, initial phases and speeds are illustrative.
export const solarPlanets: readonly SolarPlanet[] = [
  { id: "mercury", name: "Mercury", orbitRadius: 1.9, radius: 0.32, phase: -0.8, shaderKind: 4, rim: "#b7a89a", type: "ROCKY PLANET", detail: "The innermost planet. A cratered surface and almost no atmosphere." },
  { id: "venus", name: "Venus", orbitRadius: 2.45, radius: 0.45, phase: 2.2, shaderKind: 5, rim: "#f3cf8a", type: "ROCKY PLANET", detail: "A rocky world hidden beneath thick, heat-trapping clouds." },
  { id: "earth", name: "Earth", orbitRadius: 3.05, radius: 0.5, phase: -1.4, shaderKind: 3, rim: "#51baff", type: "ROCKY PLANET / HABITAT CONTEXT", detail: "Our ocean world. The Moon and ISS are shown as local research destinations." },
  { id: "mars", name: "Mars", orbitRadius: 3.8, radius: 0.43, phase: 0.85, shaderKind: 1, rim: "#e4a15b", type: "ROCKY PLANET / HABITAT CONTEXT", detail: "The red planet. Habitat telemetry describes a sealed interior, not the Martian atmosphere." },
  { id: "jupiter", name: "Jupiter", orbitRadius: 4.7, radius: 0.85, phase: 1.95, shaderKind: 6, rim: "#d6b58b", type: "GAS GIANT", detail: "Cloud bands, powerful storms, and the largest planet in our solar system." },
  { id: "saturn", name: "Saturn", orbitRadius: 5.6, radius: 0.7, phase: -1.6, shaderKind: 7, rim: "#dfcb9e", type: "GAS GIANT", detail: "An icy ring system surrounds this softly banded gas giant.", rings: true },
  { id: "uranus", name: "Uranus", orbitRadius: 6.45, radius: 0.57, phase: -0.25, shaderKind: 8, rim: "#97dcdf", type: "ICE GIANT", detail: "A pale cyan ice giant with an extreme axial tilt." },
  { id: "neptune", name: "Neptune", orbitRadius: 7.3, radius: 0.54, phase: 2.85, shaderKind: 9, rim: "#4b85f4", type: "ICE GIANT", detail: "The outermost planet, with a deep-blue atmosphere and fast winds." },
];

/** One tilted ellipse shared by the guide and planet positions; not an ephemeris. */
export function getExplorerPath(progress: number, compact: boolean) {
  const angle = progress * Math.PI * 2;
  const scale = compact ? 0.48 : 1;
  const across = Math.sin(angle) * 9;
  const depth = Math.cos(angle);
  return {
    x: (across - depth * 1.2) * scale,
    y: (0.5 - depth * 2.1 + across * 0.12) * scale,
    z: (depth * 4 - 1) * scale,
  };
}

/** Focus stays on the near side; the other planets recede around the curve. */
export function getExplorerTransform(index: number, selected: number, compact: boolean) {
  const offset = ((index - selected) % solarPlanets.length + solarPlanets.length) % solarPlanets.length;
  const scale = compact ? 0.48 : 1;
  const planet = solarPlanets[index];
  const position = getExplorerPath(offset / solarPlanets.length, compact);
  if (offset === 0) {
    return { ...position, radius: (planet.rings ? 1.1 : 1.85) * scale, brightness: 1 };
  }
  const near = (Math.cos(offset / solarPlanets.length * Math.PI * 2) + 1) / 2;
  return {
    ...position,
    radius: (0.36 + planet.radius * 0.2) * (0.72 + near * 0.35) * scale,
    brightness: 0.4 + near * 0.2,
  };
}
