"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSimulationStore } from "@/components/SimulationProvider";
import { EnvironmentSelect, MaterialSelect } from "@/components/dashboard/Controls";
import { KnowledgeQueryResult } from "@/components/dashboard/KnowledgeQueryPanel";
import { getCatalogRecord } from "@/lib/catalog-browser";
import { createExperimentalDemoRequest, emptyExperimentalDemo, ExperimentalDemoError, validateExperimentalDemo, type ExperimentalDemoDraft } from "@/lib/experimental-demo";
import { getKnowledgeQuery, submitKnowledgeQuery, type KnowledgeOutcome } from "@/lib/knowledge-query";

type Inputs = Omit<ExperimentalDemoDraft, "environmentId" | "materialId">;
const initialInputs: Inputs = {
  oxygenVolumePercent: "", pressureKPa: "", temperatureCelsius: "",
  effectiveGravityG: "", question: "", acknowledged: false,
};

export function ExperimentalDemoPanel() {
  const environmentId = useSimulationStore((state) => state.catalogEnvironmentId);
  const materialId = useSimulationStore((state) => state.catalogMaterialId);
  const [inputs, setInputs] = useState<Inputs>(initialInputs);
  const [outcome, setOutcome] = useState<KnowledgeOutcome | null>(null);
  const [retrieveId, setRetrieveId] = useState("");
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const draft = { ...emptyExperimentalDemo(environmentId, materialId), ...inputs };
  const errors = validateExperimentalDemo(draft);

  useEffect(() => () => {
    requestVersion.current++;
    controller.current?.abort();
  }, []);

  async function runRequest(send: (signal: AbortSignal) => Promise<KnowledgeOutcome>) {
    if (controller.current) return;
    const current = ++requestVersion.current;
    const pending = new AbortController();
    controller.current = pending;
    setLoading(true); setOutcome(null);
    try {
      const next = await send(pending.signal);
      if (current !== requestVersion.current) return;
      setOutcome(next);
      const savedId = "query" in next ? next.query.id : next.problem.queryId;
      if (savedId) setRetrieveId(savedId);
    } catch (cause) {
      if (current !== requestVersion.current) return;
      setOutcome({ problem: {
        status: cause instanceof ExperimentalDemoError ? 400 : 502,
        title: "Demo request could not be completed",
        detail: cause instanceof ExperimentalDemoError ? Object.values(cause.errors).join(" ")
          : "The catalog or AI service could not be reached. No synthetic answer has been substituted.",
      } });
    } finally {
      if (current === requestVersion.current) { controller.current = null; setLoading(false); }
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (Object.keys(errors).length || controller.current) return;
    // Resolve the actual material name: Knowledge saves materialId but does not forward it to the AI.
    const submitted = { ...draft };
    await runRequest(async (signal) => {
      const material = await getCatalogRecord("materials", submitted.materialId!, signal);
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const request = createExperimentalDemoRequest(submitted, { id: material.id, name: material.label });
      return submitKnowledgeQuery(request, signal);
    });
  }

  function cancel() {
    requestVersion.current++;
    controller.current?.abort(); controller.current = null; setLoading(false);
    setOutcome({ problem: {
      status: 499, title: "Demo request cancelled",
      detail: "Cancellation may leave a saved Knowledge query. Retrieve its ID if known before sending a new request.",
    } });
  }

  function update(key: keyof Omit<Inputs, "acknowledged">, value: string) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  return <div className="cc-demo">
    <section className="cc-panel cc-console" aria-labelledby="experimental-demo-title">
      <div className="cc-panel-heading"><div><h2 id="experimental-demo-title">Experimental habitat AI demo</h2><p className="cc-caption">Your inputs → hosted Knowledge API → AI explanation.</p></div><span className="cc-tag">Not scientifically validated</span></div>
      <p id="demo-limitations">Explore a hypothetical scenario with AI. This is not a fire-risk prediction, safety assessment, or emergency-response tool. The scientific Habitat workflow stays separate and locked.</p>
      <form id="experimental-demo-form" onSubmit={submit} aria-describedby="demo-limitations">
        <fieldset disabled={loading}>
          <legend className="sr-only">Experimental scenario inputs</legend>
          <EnvironmentSelect id="demo-environment" showIllustrative={false} />
          <MaterialSelect id="demo-material" showIllustrative={false} />
          <div className="cc-habitat-form-grid">
            <DemoInput label="Demo oxygen concentration" id="demo-oxygen" value={inputs.oxygenVolumePercent} unit="volume %" error={errors.oxygenVolumePercent} onChange={(v) => update("oxygenVolumePercent", v)} />
            <DemoInput label="Demo pressure" id="demo-pressure" value={inputs.pressureKPa} unit="kPa" error={errors.pressureKPa} onChange={(v) => update("pressureKPa", v)} />
            <DemoInput label="Demo temperature" id="demo-temperature" value={inputs.temperatureCelsius} unit="°C · optional" error={errors.temperatureCelsius} onChange={(v) => update("temperatureCelsius", v)} />
            <DemoInput label="Demo effective gravity" id="demo-gravity" value={inputs.effectiveGravityG} unit="g · optional" error={errors.effectiveGravityG} onChange={(v) => update("effectiveGravityG", v)} />
          </div>
          <p className="cc-caption">Enter your own hypothetical values. Blank optional values remain unknown. Offline sliders and presets are never copied into this request.</p>
          <label htmlFor="demo-question">Question about this scenario <span className="cc-caption">(optional)</span></label>
          <textarea id="demo-question" rows={3} maxLength={600} value={inputs.question} onChange={(e) => update("question", e.target.value)} placeholder="For example: What evidence would be needed to understand this scenario?" />
          <label className="cc-demo-ack"><input type="checkbox" checked={inputs.acknowledged} onChange={(e) => setInputs((current) => ({ ...current, acknowledged: e.target.checked }))} />I understand this is an experimental AI explanation, not a scientifically validated safety analysis.</label>
        </fieldset>
        <div className="cc-actions">{loading
          ? <button key="cancel" type="button" className="button button-outline" onClick={cancel}>Cancel demo request</button>
          : <button key="submit" type="submit" className="button" disabled={Object.keys(errors).length > 0}>Ask AI about this demo</button>}</div>
        {Object.keys(errors).length > 0 ? <p className="cc-caption">Select an environment and material, enter valid oxygen and pressure values, and acknowledge the demo limitations to continue.</p> : null}
      </form>
      <p className="cc-caption">Each submission is saved as a Knowledge query, not a Habitat Analysis. Provider errors are shown as errors; requests are never retried automatically.</p>
    </section>
    {loading ? <p role="status">Requesting the AI explanation… No result is assumed until the backend responds.</p> : null}
    {outcome && "problem" in outcome ? <div className="cc-error" role="alert"><h3>{outcome.problem.title}</h3><p>{outcome.problem.detail}</p><p className="cc-caption">HTTP {outcome.problem.status}{outcome.problem.errorCode ? ` · ${outcome.problem.errorCode}` : ""}{outcome.problem.queryId ? ` · Saved query ID: ${outcome.problem.queryId}` : ""}</p></div> : null}
    {outcome && "query" in outcome ? <KnowledgeQueryResult query={outcome.query} heading="Experimental AI demo response" /> : null}
    <section className="cc-panel" aria-label="Retrieve saved demo response">
      <div className="cc-field"><label htmlFor="demo-query-id">Saved demo query ID</label><input id="demo-query-id" value={retrieveId} onChange={(e) => setRetrieveId(e.target.value)} disabled={loading} placeholder="Knowledge query GUID" /></div>
      <div className="cc-actions"><button type="button" className="button button-outline" disabled={loading || !retrieveId.trim()} onClick={() => { void runRequest((signal) => getKnowledgeQuery(retrieveId.trim(), signal)); }}>Retrieve demo response</button></div>
      <p className="cc-caption">A timed-out request may already have been saved. Retrieve its status before resubmitting. Its recorded question shows the inputs that were sent.</p>
    </section>
  </div>;
}

function DemoInput({ label, id, value, unit, error, onChange }: { label: string; id: string; value: string; unit: string; error?: string; onChange: (v: string) => void }) {
  return <div className="cc-field"><label htmlFor={id}>{label} <span className="cc-caption">{unit}</span></label><input id={id} inputMode="decimal" value={value} maxLength={30} onChange={(e) => onChange(e.target.value)} placeholder="Enter a hypothetical value" aria-invalid={Boolean(value.trim() && error)} aria-describedby={value.trim() && error ? `${id}-error` : undefined} />{value.trim() && error ? <p id={`${id}-error`} className="cc-field-error">{error}</p> : null}</div>;
}
