interface PlanetProfile {
  temperatureC: number;
  gravity: number;
  diameterKm: number;
  rotationHours: number;
  status: string;
  note: string;
  footnote: string;
  source: string;
}

export const PLANET_FACT_NOTES = "https://nssdc.gsfc.nasa.gov/planetary/factsheet/planetfact_notes.html";
const surfaceNote = "Rounded NASA references, not live readings. Equatorial diameter and effective gravity; surface mean temperature.";
const giantNote = "Rounded NASA references, not live readings. Temperature and effective gravity at the 1-bar level; no solid surface.";

// NASA/NSSDCA metric fact sheet, checked 2026-11-12. Rotation is sidereal;
// negative values denote retrograde rotation. Never substitute habitat/demo values.
export const planetProfiles: Readonly<Record<string, PlanetProfile>> = {
  mercury: {
    temperatureC: 167, gravity: 3.7, diameterKm: 4879, rotationHours: 1407.6,
    status: "AIRLESS WORLD", note: "A thin exosphere; extreme day–night temperature swings.",
    footnote: surfaceNote, source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html",
  },
  venus: {
    temperatureC: 464, gravity: 8.9, diameterKm: 12104, rotationHours: -5832.5,
    status: "EXTREME SURFACE HEAT", note: "Dense carbon-dioxide atmosphere; a strong greenhouse effect.",
    footnote: `${surfaceNote} Retrograde rotation.`, source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html",
  },
  earth: {
    temperatureC: 15, gravity: 9.8, diameterKm: 12756, rotationHours: 23.9,
    status: "OXYGEN-BEARING ATMOSPHERE", note: "Nitrogen–oxygen air; fire behavior depends on local conditions.",
    footnote: surfaceNote, source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html",
  },
  mars: {
    temperatureC: -65, gravity: 3.7, diameterKm: 6792, rotationHours: 24.6,
    status: "THIN ATMOSPHERE", note: "Cold, carbon-dioxide-rich air; a habitat needs its own life support.",
    footnote: surfaceNote, source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
  },
  jupiter: {
    temperatureC: -110, gravity: 23.1, diameterKm: 142984, rotationHours: 9.9,
    status: "NO SOLID SURFACE", note: "Hydrogen–helium atmosphere with powerful storms.",
    footnote: giantNote, source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html",
  },
  saturn: {
    temperatureC: -140, gravity: 9.0, diameterKm: 120536, rotationHours: 10.7,
    status: "NO SOLID SURFACE", note: "Hydrogen–helium atmosphere, fast winds, and icy rings.",
    footnote: giantNote, source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html",
  },
  uranus: {
    temperatureC: -195, gravity: 8.7, diameterKm: 51118, rotationHours: -17.2,
    status: "ICE GIANT ATMOSPHERE", note: "Hydrogen, helium, and methane; an extreme axial tilt.",
    footnote: `${giantNote} Retrograde rotation.`, source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html",
  },
  neptune: {
    temperatureC: -200, gravity: 11.0, diameterKm: 49528, rotationHours: 16.1,
    status: "ICE GIANT ATMOSPHERE", note: "Methane-bearing atmosphere with exceptionally fast winds.",
    footnote: giantNote, source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html",
  },
};

const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function getPlanetMetrics(profile: PlanetProfile) {
  const rotation = Math.abs(profile.rotationHours);
  return [
    { label: "Mean temperature", value: String(profile.temperatureC).replace("-", "−"), unit: "°C" },
    { label: "Gravity (equatorial)", value: profile.gravity.toFixed(1), unit: "m/s²" },
    { label: "Diameter", value: compactNumber.format(profile.diameterKm), unit: "km" },
    { label: "Rotation", value: (rotation > 48 ? rotation / 24 : rotation).toFixed(1), unit: rotation > 48 ? "days" : "hours" },
  ];
}
