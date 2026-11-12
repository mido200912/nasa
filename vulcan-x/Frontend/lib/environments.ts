export const environments = [
  {
    id: "lunar", short: "Lunar base", name: "Lunar Base", designation: "ARTEMIS / SURFACE HABITAT",
    coordinates: "25.85° S · 36.13° W", color: "lunar", status: "CRITICAL SCENARIO",
    description: "An oxygen-rich atmosphere. A very different threshold for ignition.",
    metrics: [{ label: "Oxygen", value: "30", unit: "%" }, { label: "Pressure", value: "10.2", unit: "psi" }, { label: "Burn rate*", value: "3.5", unit: "×" }, { label: "Gravity", value: "0.16", unit: "g" }],
    note: "+40% ignitability*", sources: ["BASS-II", "Saffire"], footnote: "*Brief-supplied scenario figures; not validated NASA measurements. Material response varies.",
  },
  {
    id: "mars", short: "Mars habitat", name: "Mars Habitat", designation: "MARS / SEALED HABITAT",
    coordinates: "18.44° N · 77.45° E", color: "mars", status: "DUST RISK SCENARIO",
    description: "A sealed habitat. A dust environment that changes the safety equation.",
    metrics: [{ label: "Oxygen (sealed)", value: "21", unit: "%" }, { label: "Pressure*", value: "14.7", unit: "psi" }, { label: "Gravity", value: "0.38", unit: "g" }, { label: "Playbook", value: "ON", unit: "DEMO" }],
    note: "Perchlorate dust risk", sources: ["FLEX", "ACME"], footnote: "*Illustrative sealed-habitat setting. Playbook is a scripted preview, not autonomous guidance.",
  },
  {
    id: "iss", short: "ISS lab", name: "ISS Microgravity Lab", designation: "LOW EARTH ORBIT / RESEARCH LAB",
    coordinates: "LEO · ~400 KM ALTITUDE", color: "iss", status: "MICROGRAVITY SCENARIO",
    description: "No buoyant rise. Flame spread becomes a diffusion problem.",
    metrics: [{ label: "Oxygen", value: "21", unit: "%" }, { label: "Pressure", value: "14.7", unit: "psi" }, { label: "Gravity (approx.)", value: "0.0", unit: "g" }, { label: "Flame", value: "360", unit: "°" }],
    note: "Spherical / cool flames", sources: ["BASS-II", "Saffire"], footnote: "Conceptual flame visualization; not every microgravity flame is spherical or cool.",
  },
  {
    id: "earth", short: "Earth bridge", name: "Terrestrial Impact Bridge", designation: "EARTH / RESEARCH TRANSLATION",
    coordinates: "SPACE RESEARCH → EARTH APPLICATION", color: "earth", status: "DUAL-USE PREVIEW",
    description: "Bring the research home. Better questions for fire safety on Earth.",
    metrics: [{ label: "Oxygen", value: "21", unit: "%" }, { label: "Pressure", value: "14.7", unit: "psi" }, { label: "Gravity", value: "1.0", unit: "g" }, { label: "Dual-use", value: "ON", unit: "DEMO" }],
    note: "Water mist + thermal protection", sources: ["FLEX", "ACME"], footnote: "Conceptual engineering translation, not a certified equipment or suppression specification.",
  },
] as const;

export const researchLinks = {
  "BASS-II": "https://www.nasa.gov/missions/station/iss-research/studying-combustion-and-fire-safety/",
  Saffire: "https://www.nasa.gov/news-release/nasa-prepares-to-ignite-third-saffire-experiment/",
  FLEX: "https://www.nasa.gov/missions/station/iss-research/studying-combustion-and-fire-safety/",
  ACME: "https://www.nasa.gov/centers-and-facilities/glenn/studying-flame-behavior-in-microgravity-with-a-solid-high-five/",
} as const;
