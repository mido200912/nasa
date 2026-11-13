"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { Download, Send, Square, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSimulationStore } from "@/components/SimulationProvider";
import { buildPlaybook, exportPlaybook, incidentScenarios, type IncidentId, type Playbook } from "@/lib/playbook";
import { environmentNames, type EnvironmentId, type SimulationInput } from "@/lib/simulation";
import { KnowledgeQueryPanel } from "@/components/dashboard/KnowledgeQueryPanel";

export function PlaybookModule() {
  const environment = useSimulationStore((state) => state.environment);
  const oxygenLevel = useSimulationStore((state) => state.oxygenLevel);
  const pressurePsi = useSimulationStore((state) => state.pressurePsi);
  const gravityG = useSimulationStore((state) => state.gravityG);
  const selectedMaterial = useSimulationStore((state) => state.selectedMaterial);
  const catalogEnvironmentId = useSimulationStore((state) => state.catalogEnvironmentId);
  const catalogMaterialId = useSimulationStore((state) => state.catalogMaterialId);
  const [mode, setMode] = useState<"offline" | "live">("offline");
  const input = { environment, oxygenLevel, pressurePsi, gravityG, selectedMaterial };
  // A changed context creates a new review session, cancelling all stale output.
  return <><div className="cc-page-heading"><div><h1>Safety playbook & research console</h1><p>A structured outline for engineering review. Not autonomous emergency advice.</p></div><span className="cc-tag">{mode === "live" ? "Live AI / persisted" : "Offline educational preview"}</span></div><div className="cc-actions cc-mode-actions" role="group" aria-label="Research console mode"><button type="button" className={mode === "offline" ? "button" : "button button-outline"} onClick={() => setMode("offline")}>Offline Playbook</button><button type="button" className={mode === "live" ? "button" : "button button-outline"} onClick={() => setMode("live")}>Live Knowledge</button></div>{mode === "live" ? <KnowledgeQueryPanel environmentId={catalogEnvironmentId} materialId={catalogMaterialId} /> : <PlaybookConsole key={JSON.stringify(input)} input={input} />}</>;
}

function PlaybookConsole({ input }: { input: SimulationInput & { environment: EnvironmentId } }) {
  const [incident, setIncident] = useState<IncidentId>("arc");
  const [prompt, setPrompt] = useState(incidentScenarios.arc.prompt as string);
  const [run, setRun] = useState<{ book: Playbook | null; text: string; status: "idle" | "streaming" | "complete" | "stopped" }>({ book: null, text: "", status: "idle" });
  const [checked, setChecked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [exported, setExported] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const streaming = run.status === "streaming";

  function generate(event: FormEvent) {
    event.preventDefault();
    if (streaming) return;
    if (!prompt.trim() || prompt.length > 1200) { setError("Enter a question of 1–1,200 characters."); return; }
    setError(""); setChecked([]); setExported(false);
    const book = buildPlaybook(incident, input, prompt);
    const output = `### Review context\n${book.context}\n\n### Selected topic\n${book.title}\n\nThis local preview uses the selected incident template. Your question is attached for a human reviewer, not interpreted by an AI model.\n\n${book.sections.map((section) => `**${section.title}**\n\n${section.items[0]}`).join("\n\n")}\n\n**Complete — engineering review required.**`;
    if (reduced) { setRun({ book, text: output, status: "complete" }); return; }
    setRun({ book, text: "", status: "streaming" });
    let cursor = 0;
    timer.current = setInterval(() => {
      cursor = Math.min(output.length, cursor + 32);
      setRun({ book, text: output.slice(0, cursor), status: cursor === output.length ? "complete" : "streaming" });
      if (cursor === output.length && timer.current) { clearInterval(timer.current); timer.current = null; }
    }, 28);
  }
  function stop() { if (timer.current) clearInterval(timer.current); timer.current = null; setRun((current) => ({ ...current, status: "stopped" })); }
  function selectIncident(value: IncidentId) {
    setIncident(value); setPrompt(incidentScenarios[value].prompt); setChecked([]); setExported(false); setError("");
    setRun({ book: null, text: "", status: "idle" });
  }
  function download() {
    if (!run.book || run.status !== "complete") return;
    try {
      const url = URL.createObjectURL(new Blob([exportPlaybook(run.book, checked)], { type: "text/markdown;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "vulcan-x-review-outline.md"; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setExported(true);
    } catch { setError("Export could not be prepared. Retry in a browser with downloads enabled."); }
  }
  return <div className="cc-playbook-grid"><section className="cc-panel cc-console"><div className="cc-panel-heading"><h2>Incident context</h2><span className="cc-caption">Local template engine</span></div><p className="cc-context">{environmentNames[input.environment]} · {input.oxygenLevel}% O₂ · {input.pressurePsi.toFixed(1)} psi · {input.gravityG.toFixed(2)} g</p><fieldset className="cc-scenarios" disabled={streaming}><legend>Choose a review topic</legend>{(Object.entries(incidentScenarios) as [IncidentId, typeof incidentScenarios[IncidentId]][]).map(([id, scenario]) => <button key={id} aria-pressed={incident === id} onClick={() => selectIncident(id)}>{scenario.title}</button>)}</fieldset>
      <form onSubmit={generate}><label htmlFor="research-question">Question for the engineering reviewer</label><textarea id="research-question" maxLength={1200} rows={4} value={prompt} disabled={streaming} onChange={(event) => { setPrompt(event.target.value); if (run.book) { setRun({ book: null, text: "", status: "idle" }); setChecked([]); } setError(""); }} aria-describedby="question-note" /><p id="question-note" className="cc-caption">No provider, document index, or backend is configured. Questions stay in this page; the fallback streams a fixed review template for the selected topic.</p><div className="cc-actions">{streaming ? <button key="stop" type="button" className="button button-outline" onClick={(event) => { event.preventDefault(); stop(); }}><Square size={14} aria-hidden="true" />Stop preview</button> : <button key="generate" className="button" type="submit" disabled={!prompt.trim()}><Send size={15} aria-hidden="true" />{run.book ? "Regenerate outline" : "Generate outline"}</button>}</div></form>
      {error && <p role="alert" className="cc-error">{error}</p>}<div className="cc-console-output"><span className="cc-caption">Research console / simulated streaming</span>{run.text ? <div className="cc-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{run.text}</ReactMarkdown></div> : <p className="cc-empty">Select a topic and generate a review outline. No retrieval or inference will be performed.</p>}</div><p role="status" className="cc-caption">{streaming ? "Streaming local preview…" : run.status === "stopped" ? "Preview stopped. Regenerate to complete the outline." : run.status === "complete" ? "Preview complete · engineering review required" : "Ready for a local preview"}</p>
    </section><section className="cc-panel cc-protocol"><div className="cc-panel-heading"><h2>Structured review outline</h2><button className="button button-outline" disabled={run.status !== "complete"} onClick={download}><Download size={15} aria-hidden="true" />Export protocol</button></div>{run.book && run.status === "complete" ? <>
      <p className="cc-context">{run.book.context}</p><p className="cc-caption">Question attached: {run.book.prompt}</p><p className="cc-caption">Review acknowledgement only: {checked.length} / {run.book.sections.reduce((sum, section) => sum + section.items.length, 0)} items checked. This is not task execution or safety clearance.</p>
      {run.book.sections.map((section) => <section key={section.id} className="cc-protocol-section"><h3>{section.title}</h3><p className="cc-caption">{section.timing}</p>{section.items.map((item, index) => { const id = `${section.id}-${index}`; return <label className="cc-check-item" key={id}><input type="checkbox" checked={checked.includes(id)} onChange={() => setChecked((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id])} /><span>{item}</span></label>; })}</section>)}
      <div className="cc-references"><h3>NASA reading references</h3><p className="cc-caption">Public research links, not retrieved citations or verification of this protocol.</p>{run.book.references.map((reference) => <a key={reference.label} href={reference.href} target="_blank" rel="noreferrer">{reference.label} ↗</a>)}</div><p className="cc-caption">{run.book.disclaimer}</p>
    </> : <div className="cc-protocol-empty"><BookOpen size={32} strokeWidth={1.2} aria-hidden="true" /><h3>{streaming ? "Preparing the review outline" : "No outline generated"}</h3><p>Generate a local preview to review containment questions, suppression limitations, atmospheric recovery, and evidence gaps.</p><p className="cc-caption">No nozzle pressure or depressurization setpoint will be invented.</p></div>}{exported && <p role="status" className="cc-caption">Review outline exported with context, references, and limitations.</p>}</section></div>;
}
