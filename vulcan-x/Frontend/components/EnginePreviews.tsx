"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CircleDot, FileText, Globe2, RotateCcw, Satellite, ShieldCheck, Square } from "lucide-react";
import { calculateDemoRisk } from "@/lib/risk";
import { Reveal } from "@/components/ui/Reveal";

function StressTest() {
  const [oxygen, setOxygen] = useState(30);
  const [pressure, setPressure] = useState(10.2);
  const risk = calculateDemoRisk(oxygen, pressure);
  return <article className="engine-card stress-card" id="stress-test">
    <div className="engine-card-top"><span>01 / Predict</span><span className="card-demo-tag">Interactive demo</span></div>
    <h3>Ask “what if.”<br />Before ignition.</h3><p>Change the atmosphere. See how an illustrative material-risk matrix responds.</p>
    <div className="stress-controls"><label htmlFor="oxygen">Oxygen concentration<span className="mono">{oxygen}<small>% O₂</small></span></label><input id="oxygen" type="range" min="18" max="35" step="1" value={oxygen} onChange={(event) => setOxygen(Number(event.target.value))} /><div className="range-labels"><span>18% / Earth-like</span><span>35% / O₂-rich</span></div>
      <label htmlFor="pressure">Habitat pressure<span className="mono">{pressure.toFixed(1)}<small>psi</small></span></label><input id="pressure" type="range" min="7" max="15" step="0.1" value={pressure} onChange={(event) => setPressure(Number(event.target.value))} />
    </div>
    <div className="risk-heading"><span>Illustrative risk matrix</span><span>{risk.label.charAt(0) + risk.label.slice(1).toLowerCase()}</span></div>
    <div className="risk-bars">{risk.materials.map((material, index) => <div className="risk-row" key={material.name}><div><span>{material.name}</span><span className="mono">{material.value}<span className="muted"> / 100</span></span></div><div className="risk-track"><span className={`risk-fill risk-${index}`} style={{ transform: `scaleX(${material.value / 100})` }} /></div></div>)}</div>
    <div className="risk-bottom"><span>Scenario index <strong data-testid="risk-score">{risk.score}</strong><span className="muted"> / 100</span></span><button className="reset-button" aria-label="Reset atmosphere" onClick={() => { setOxygen(30); setPressure(10.2); }}><RotateCcw size={13} />Reset</button></div>
    <p className="fine-print">Unvalidated UI model. Not NASA experimental data or a safety assessment.</p>
  </article>;
}

function DualUseBridge() {
  const [earthMode, setEarthMode] = useState(false);
  return <article className="engine-card bridge-card"><div className="engine-card-top"><span>02 / Translate</span><ArrowUpRight size={16} /></div><h3>Space science.<br />Earth-side impact.</h3><p>Turn combustion questions into better terrestrial engineering requirements.</p>
    <div className="bridge-visual" aria-hidden="true"><div className={`bridge-node ${!earthMode ? "selected" : ""}`}><Satellite size={28} strokeWidth={1} /><span>ORBIT</span></div><div className="bridge-connection"><span /><ArrowRight size={15} /><span /></div><div className={`bridge-node ${earthMode ? "selected" : ""}`}><Globe2 size={30} strokeWidth={1} /><span>EARTH</span></div></div>
    <div className="bridge-toggle"><span>Terrestrial mode</span><button role="switch" aria-checked={earthMode} aria-label="Terrestrial engineering mode" onClick={() => setEarthMode((value) => !value)}><span /></button></div>
    <div className="bridge-output" aria-live="polite"><span className="bridge-output-title">{earthMode ? "Terrestrial engineering spec" : "Space experiment context"}</span><h4>{earthMode ? "Fine-water-mist suppression" : "Droplet combustion behavior"}</h4><p>{earthMode ? "Evaluate droplet distribution, electrical compatibility, and enclosure ventilation against applicable fire-test standards." : "Explore how droplets burn and extinguish when buoyancy no longer drives the transport of heat and oxygen."}</p><span className="bridge-output-foot"><CircleDot size={11} />{earthMode ? "Concept spec · validation required" : "Research context · NASA FLEX"}</span></div>
    <div className="bridge-secondary"><ShieldCheck size={16} /><span>{earthMode ? "Thermal gear: require certified heat-flux testing." : "Thermal protection is another translation pathway."}</span></div>
  </article>;
}

const scenarios = {
  arc: { title: "Electrical arc / sealed Mars habitat", steps: ["Flag the suspected arc and alert the crew.", "Use the approved electrical-isolation procedure.", "Assess smoke and atmospheric telemetry remotely.", "Follow the habitat’s certified response checklist.", "Require engineering review before re-entry or restart."] },
  smoke: { title: "Smoke detection / orbital research lab", steps: ["Record the sensor location and alert the crew.", "Correlate smoke reports with atmospheric telemetry.", "Identify the approved compartment response checklist.", "Escalate to the responsible mission safety operator.", "Log the incident for engineering review."] },
  dust: { title: "Dust contamination / Mars airlock", steps: ["Flag the airlock contamination event.", "Notify the habitat environmental-control operator.", "Review airlock isolation and dust-monitoring telemetry.", "Use the approved contamination-control procedure.", "Require a qualified review before resuming operations."] },
} as const;

function PlaybookPreview() {
  const [scenario, setScenario] = useState<keyof typeof scenarios>("arc");
  const [run, setRun] = useState<{ scenario: keyof typeof scenarios; text: string; status: "idle" | "streaming" | "complete" }>({ scenario: "arc", text: "", status: "idle" });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  function generate() {
    if (timer.current) clearInterval(timer.current);
    const output = scenarios[scenario].steps.map((step, index) => `${String(index + 1).padStart(2, "0")}  ${step}`).join("\n\n");
    if (reducedMotion) { setRun({ scenario, text: output, status: "complete" }); return; }
    let length = 0;
    setRun({ scenario, text: "", status: "streaming" });
    timer.current = setInterval(() => {
      length = Math.min(output.length, length + 9);
      setRun({ scenario, text: output.slice(0, length), status: length === output.length ? "complete" : "streaming" });
      if (length === output.length && timer.current) { clearInterval(timer.current); timer.current = null; }
    }, 28);
  }
  function stop() { if (timer.current) clearInterval(timer.current); timer.current = null; setRun((current) => ({ ...current, status: "idle" })); }
  return <article className="engine-card playbook-card"><div className="engine-card-top"><span>03 / Respond</span><FileText size={16} /></div><h3>A scenario in.<br />A playbook out.</h3><p>Preview a research-informed response structure. Built for review, never blind execution.</p>
    <label className="incident-label" htmlFor="incident">Incident scenario</label><select id="incident" value={scenario} onChange={(event) => { const next = event.target.value as keyof typeof scenarios; setScenario(next); setRun({ scenario: next, text: "", status: "idle" }); }} disabled={run.status === "streaming"}>{Object.entries(scenarios).map(([value, item]) => <option key={value} value={value}>{item.title}</option>)}</select>
    <div className="playbook-output"><div className="output-heading"><span>Protocol preview</span><span>FLEX / ACME</span></div>{run.text ? <pre>{run.text}{run.status === "streaming" && <span className="typing-caret">▌</span>}</pre> : <div className="playbook-empty"><FileText size={25} strokeWidth={1} /><span>{run.status === "streaming" ? "Preparing preview…" : "Select a scenario to build a response outline."}</span><span className="mono">Scripted demo · no live AI</span></div>}</div>
    <div className="playbook-action">{run.status === "streaming" ? <button className="button button-outline" onClick={stop}><Square size={12} />Stop preview</button> : <button className="button" onClick={generate}>{run.text ? "Regenerate preview" : "Generate preview"}<ArrowRight size={14} /></button>}<span>{run.status === "complete" ? <Check size={14} /> : <ShieldCheck size={14} />}Review required</span></div>
    <p className="fine-print" role="status">{run.status === "complete" ? "Preview complete · engineering review required" : "Educational outline only. In an emergency, follow approved mission procedures."}</p>
  </article>;
}

export function EnginePreviews() {
  return <section className="engines-section section-container" id="engines"><div className="engines-section-head"><div><span className="section-label">Research into readiness</span><h2>From a paper.<br />To a better decision.</h2></div><div><p>Three ways to explore what the research means for the next habitat—and the world we already call home.</p><a className="text-link" href="#stress-test">Test a scenario <ArrowDown size={14} /></a></div></div><div className="engine-grid"><Reveal><StressTest /></Reveal><Reveal><DualUseBridge /></Reveal><Reveal><PlaybookPreview /></Reveal></div></section>;
}
