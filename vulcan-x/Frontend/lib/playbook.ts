import { researchLinks } from "@/lib/environments";
import { environmentNames, type EnvironmentId, type SimulationInput } from "@/lib/simulation";

export const incidentScenarios = {
  arc: { title: "Electrical cable arc", prompt: "Electrical cable arc in a Lunar base airlock at 30% O₂", focus: "electrical isolation and cable-route telemetry" },
  battery: { title: "Battery thermal runaway", prompt: "Lithium battery thermal runaway in a Mars rover", focus: "battery chemistry, pack telemetry, and re-ignition monitoring" },
  smoke: { title: "Unlocated smoke", prompt: "Unlocated smoke detected in the ISS laboratory", focus: "sensor corroboration, crew reports, and forced ventilation" },
} as const;
export type IncidentId = keyof typeof incidentScenarios;
export const protocolDisclaimer = "Educational review outline. Not an emergency procedure, equipment specification, or live AI output. Follow approved mission procedures and qualified safety personnel.";

export function buildPlaybook(incident: IncidentId, input: SimulationInput & { environment: EnvironmentId }, prompt: string) {
  const scenario = incidentScenarios[incident];
  return {
    title: scenario.title,
    prompt: prompt.trim().slice(0, 1200),
    context: `${environmentNames[input.environment]} · ${input.oxygenLevel}% O₂ · ${input.pressurePsi.toFixed(1)} psi · ${input.gravityG.toFixed(2)} g · ${input.selectedMaterial.replaceAll("_", " ")}`,
    disclaimer: protocolDisclaimer,
    sections: [
      { id: "containment", title: "Immediate containment review", timing: "0–30 s planning window, not a response deadline", items: [
        `Identify the approved incident checklist for ${scenario.focus}.`,
        "Confirm crew notification, compartment identification, and operator ownership in the certified plan.",
        "Have the responsible operator review HVAC and oxygen isolation. Do not infer depressurization thresholds from this demo.",
      ] },
      { id: "suppression", title: "Targeted suppression review", timing: "Equipment selection requires qualified review", items: [
        incident === "battery" ? "Ask a qualified battery-safety specialist to review chemistry-specific cooling, electrical isolation, and propagation controls." : "Ask a qualified fire-protection specialist to review electrical compatibility and the certified agent selection.",
        "Compare fine-water-mist and CO₂ limitations against occupancy, enclosure geometry, and actual equipment tests; neither is a universal recommendation.",
        "Obtain nozzle pressure, agent quantity, and application limits from the approved system documentation. No setpoints are generated here.",
      ] },
      { id: "atmosphere", title: "Post-fire atmosphere review", timing: "Before any authorized re-entry or restart", items: [
        "Identify required smoke and toxic-byproduct sampling in the approved atmospheric recovery plan.",
        "Have environmental-control specialists assess scrubber and filter compatibility with the identified materials.",
        "Require authorized atmosphere clearance and incident review; a checked box here is not operational clearance.",
      ] },
      { id: "evidence", title: "Research and evidence gaps", timing: "Reading context, not retrieved grounding", items: [
        "BASS-II and Saffire explore solid-fuel combustion and spacecraft fire behavior; FLEX and ACME investigate other combustion mechanisms.",
        "These public program links are reading references, not retrieved passages, matched material tests, or validation of this outline.",
        "Attach grade-specific test reports, certified system documentation, and an engineering sign-off before considering any operational application.",
      ] },
    ],
    references: [
      { label: "BASS-II / combustion overview", href: researchLinks["BASS-II"] },
      { label: "Saffire program context", href: researchLinks.Saffire },
      { label: "FLEX / combustion overview", href: researchLinks.FLEX },
      { label: "ACME research", href: researchLinks.ACME },
      { label: "NASA Physical Sciences Informatics", href: "https://www.nasa.gov/psi/" },
    ],
  };
}
export type Playbook = ReturnType<typeof buildPlaybook>;

export function exportPlaybook(book: Playbook, checked: string[]) {
  return `# VULCAN-X — ${book.title}\n\n${book.disclaimer}\n\nContext: ${book.context}\n\nUser question: ${book.prompt}\n\n${book.sections.map((section) => `## ${section.title}\n${section.timing}\n\n${section.items.map((item, index) => `- [${checked.includes(`${section.id}-${index}`) ? "x" : " "}] ${item}`).join("\n")}`).join("\n\n")}\n\n## Reading references (not retrieved citations)\n${book.references.map((item) => `- ${item.label}: ${item.href}`).join("\n")}\n`;
}
