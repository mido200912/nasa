"use client";

import dynamic from "next/dynamic";
import { ArrowRight, Droplets, Shield, Radio } from "lucide-react";
import { useSimulationStore } from "@/components/SimulationProvider";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { researchLinks } from "@/lib/environments";

const ImpactChart = dynamic(() => import("@/components/dashboard/TelemetryCharts").then((module) => module.ImpactChart), { ssr: false, loading: () => <div className="cc-impact-chart">Preparing assumed-value chart…</div> });
const pathways = [
  { icon: Droplets, title: "Suppression & water use", source: "Droplet combustion and extinction", context: "FLEX / Saffire reading context", href: researchLinks.FLEX, space: "Investigate transport and extinction when buoyancy no longer dominates. These experiments do not certify a building suppression system.", earth: "Evaluate fine-water-mist systems for data centers and high-rises against the applicable full-scale fire-test and electrical-compatibility standards.", qualification: "80% less water is a brief-supplied scenario target, not an established NASA result." },
  { icon: Shield, title: "Thermal protection", source: "Oxygen-enriched material behavior", context: "BASS-II reading context", href: researchLinks["BASS-II"], space: "Ask how oxygen concentration, fabric structure, and airflow change combustion. A polymer or weave cannot be judged by a program name alone.", earth: "Define test requirements for firefighter turnout fabrics and helmets: heat flux, total heat loss, durability, and certified ensemble compatibility.", qualification: "No thermal-resistance improvement has been verified. Enter a test target below to explore a comparison." },
  { icon: Radio, title: "Early detection", source: "Low-luminosity combustion", context: "ACME / FLEX reading context", href: researchLinks.ACME, space: "Explore why flame appearance alone is not a reliable indication of combustion state. Sensor response depends on the fuel and conditions.", earth: "Investigate complementary gas, thermal, and optical sensing for industrial facilities. Validate detection and false-alarm performance on the actual hazard.", qualification: "No detection lead-time gain has been verified. Targets below are assumptions, not performance claims." },
];

export function EarthBridgeModule() {
  const enabled = useSimulationStore((state) => state.earthImpactMode);
  const setEnabled = useSimulationStore((state) => state.setEarthImpactMode);
  return <><div className="cc-page-heading"><div><h1>Earth–space dual-use bridge</h1><p>Translate a research question—not an unverified performance claim.</p></div></div><div className="cc-bridge-mode cc-panel"><div><h2>Terrestrial impact mode</h2><p>{enabled ? "Engineering requirement concepts are visible alongside the research." : "Explore the space research, then enable terrestrial translation."}</p></div><label className="cc-switch-label" htmlFor="earth-impact"><span>{enabled ? "On" : "Off"}</span><Switch id="earth-impact" aria-label="Terrestrial impact mode" checked={enabled} onCheckedChange={setEnabled} className="cc-switch" /></label></div>
    <div className="cc-translation-list">{pathways.map((pathway) => <article className="cc-panel cc-translation" key={pathway.title}><div className="cc-translation-title"><pathway.icon size={20} aria-hidden="true" /><h2>{pathway.title}</h2></div><div className="cc-translation-columns"><div><span className="cc-caption">Microgravity research question</span><h3>{pathway.source}</h3><p>{pathway.space}</p><a className="text-link" href={pathway.href} target="_blank" rel="noreferrer">{pathway.context} ↗</a></div><ArrowRight size={20} aria-hidden="true" /><div><span className="cc-caption">Terrestrial engineering concept</span><h3>{enabled ? "Requirements to investigate" : "Translation paused"}</h3><p>{enabled ? pathway.earth : "Enable terrestrial impact mode to reveal the engineering translation for this pathway."}</p><p className="cc-caption">{pathway.qualification}</p></div></div></article>)}</div>
    <div className="cc-page-subheading"><h2>Impact target workbench</h2><p>Compare assumed targets, not measured outcomes. Water defaults to the brief’s 80% reduction example; other targets must be supplied.</p></div><div className="cc-impact-grid"><ImpactTarget title="Water use" unit="L" defaultBaseline="100" defaultTarget="20" mode={enabled} lowerBetter /><ImpactTarget title="Thermal resistance" unit="test units" mode={enabled} /><ImpactTarget title="Detection lead time" unit="s" mode={enabled} /></div>
  </>;
}

function ImpactTarget({ title, unit, defaultBaseline = "", defaultTarget = "", mode, lowerBetter = false }: { title: string; unit: string; defaultBaseline?: string; defaultTarget?: string; mode: boolean; lowerBetter?: boolean }) {
  const [baseline, setBaseline] = useState(defaultBaseline);
  const [target, setTarget] = useState(defaultTarget);
  const base = Number(baseline), goal = Number(target);
  const valid = baseline !== "" && target !== "" && Number.isFinite(base) && Number.isFinite(goal) && base > 0 && goal >= 0 && base <= 1000000 && goal <= 1000000;
  const difference = valid ? ((lowerBetter ? base - goal : goal - base) / base) * 100 : null;
  const id = title.toLowerCase().replaceAll(" ", "-");
  return <section className="cc-panel"><h3>{title}</h3><p className="cc-caption">Assumed comparison / {unit}</p><fieldset className="cc-impact-inputs" disabled={!mode}><div className="cc-field"><label htmlFor={`${id}-baseline`}>Baseline</label><input id={`${id}-baseline`} type="number" min="0.01" max="1000000" step="any" placeholder="Enter value" value={baseline} onChange={(event) => setBaseline(event.target.value)} /></div><div className="cc-field"><label htmlFor={`${id}-target`}>Target</label><input id={`${id}-target`} type="number" min="0" max="1000000" step="any" placeholder="Enter value" value={target} onChange={(event) => setTarget(event.target.value)} /></div></fieldset>{valid && mode ? <><ImpactChart baseline={base} target={goal} unit={unit} title={title} /><p className="cc-impact-value">{difference!.toFixed(0)}% <span>{lowerBetter ? "reduction target" : "increase target"}</span></p></> : <div className="cc-impact-empty">{mode ? "Enter a positive baseline and non-negative target (up to 1,000,000) to compare assumptions." : "Enable terrestrial mode to compare targets."}</div>}<p className="cc-caption">Scenario assumption only. No experimentally validated gain is loaded.</p></section>;
}
