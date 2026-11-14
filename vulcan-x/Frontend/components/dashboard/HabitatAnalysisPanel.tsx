"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSimulationStore } from "@/components/SimulationProvider";
import { Choice } from "@/components/dashboard/Controls";
import { createHabitatRequest, emptyHabitatDraft, getHabitatCapabilities, habitatGravityRegimes, HabitatFormError, submitHabitatAnalysis, validateHabitatDraft, type HabitatAnalysis, type HabitatAnalysisDraft, type HabitatApiOutcome } from "@/lib/habitat-analysis";

type DraftInputs = Omit<HabitatAnalysisDraft, "environmentId" | "materialId">;

const blankInputs: DraftInputs = {
  oxygenVolumePercent: "",
  pressureKPa: "",
  temperatureCelsius: "",
  gravityRegime: "",
  effectiveGravityG: "",
  language: "en",
};

export function HabitatAnalysisPanel() {
  const environmentId = useSimulationStore((state) => state.catalogEnvironmentId);
  const materialId = useSimulationStore((state) => state.catalogMaterialId);
  const [inputs, setInputs] = useState<DraftInputs>(blankInputs);
  const [approval, setApproval] = useState<{ enabled: boolean } | null>(null);
  const [approvalError, setApprovalError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<HabitatApiOutcome | null>(null);
  const controller = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const draft = { ...emptyHabitatDraft(environmentId, materialId), ...inputs };
  const errors = validateHabitatDraft(draft);
  const canSubmit = approval?.enabled === true && Object.keys(errors).length === 0
    && inputs.oxygenVolumePercent.trim() !== "" && inputs.pressureKPa.trim() !== "";

  useEffect(() => {
    const pending = new AbortController();
    void getHabitatCapabilities(AbortSignal.any([pending.signal, AbortSignal.timeout(10000)]))
      .then((value) => { if (!pending.signal.aborted) setApproval(value); })
      .catch(() => { if (!pending.signal.aborted) setApprovalError("The backend approval state is unavailable. Live submission remains disabled."); });
    return () => pending.abort();
  }, [refresh]);
  useEffect(() => () => { requestVersion.current++; controller.current?.abort(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (controller.current) return;
    try {
      const payload = createHabitatRequest(draft, approval?.enabled === true);
      const current = ++requestVersion.current;
      const pending = new AbortController();
      controller.current = pending;
      setLoading(true); setOutcome(null);
      try {
        const result = await submitHabitatAnalysis(payload, pending.signal);
        if (current === requestVersion.current) setOutcome(result);
      } finally {
        if (current === requestVersion.current) { controller.current = null; setLoading(false); }
      }
    } catch (cause) {
      if (cause instanceof HabitatFormError) setOutcome({ problem: { status: 400, title: "Check the Habitat inputs", detail: Object.values(cause.errors).join(" ") } });
    }
  }

  function cancel() {
    requestVersion.current++; controller.current?.abort(); controller.current = null; setLoading(false);
    setOutcome({ problem: { status: 499, title: "Analysis request cancelled", detail: "Cancellation does not delete a record already saved by the backend. Retrieve its ID if known before submitting again." } });
  }

  return <><section className="cc-panel cc-habitat-analysis" aria-labelledby="persisted-habitat-title">
    <div className="cc-panel-heading"><div><h2 id="persisted-habitat-title">Persisted Habitat Analysis</h2><p className="cc-caption">Live backend workflow, separate from the offline WebGL illustration.</p></div><span className="cc-tag">{approval?.enabled ? "Backend submission enabled · unvalidated" : "Live submission disabled"}</span></div>
    {!approval?.enabled ? <div className="cc-error" role="status"><p>{approvalError || (approval ? "Live analysis is unavailable until a scientifically documented oxygen and pressure fixture/default is approved. The offline WebGL presets are never copied into this form." : "Checking the backend scientific-approval gate…")}</p><button type="button" className="button button-outline" onClick={() => { setApproval(null); setApprovalError(""); setRefresh((value) => value + 1); }}>Refresh approval status</button></div> : <p className="cc-caption">The backend permits submission. This does not certify the model or make results scientifically validated. Enter only documented inputs.</p>}
    <form onSubmit={submit}>
    <fieldset disabled={loading} className="cc-habitat-form-grid">
      <ReadOnlyField label="Catalog environment ID" value={environmentId?.toString() ?? "Select a catalog environment above"} error={errors.environmentId} />
      <ReadOnlyField label="Catalog material ID" value={materialId?.toString() ?? "Select a catalog material above"} error={errors.materialId} />
      <ScientificInput label="Oxygen concentration" id="habitat-oxygen" value={inputs.oxygenVolumePercent} unit="volume %" error={errors.oxygenVolumePercent} onChange={(oxygenVolumePercent) => setInputs((current) => ({ ...current, oxygenVolumePercent }))} />
      <ScientificInput label="Pressure" id="habitat-pressure" value={inputs.pressureKPa} unit="kPa" error={errors.pressureKPa} onChange={(pressureKPa) => setInputs((current) => ({ ...current, pressureKPa }))} />
      <ScientificInput label="Temperature" id="habitat-temperature" value={inputs.temperatureCelsius} unit="°C (optional)" error={errors.temperatureCelsius} onChange={(temperatureCelsius) => setInputs((current) => ({ ...current, temperatureCelsius }))} />
      <ScientificInput label="Effective gravity" id="habitat-gravity" value={inputs.effectiveGravityG} unit="g (optional)" error={errors.effectiveGravityG} onChange={(effectiveGravityG) => setInputs((current) => ({ ...current, effectiveGravityG }))} />
      {/* Radix items cannot use ""; the UI sentinel maps back to the existing missing-input value. */}
      <div><Choice id="habitat-gravity-regime" label="Gravity regime" value={inputs.gravityRegime || "not_supplied"} disabled={loading} onChange={(value) => {
        if (value === "not_supplied" || habitatGravityRegimes.some((regime) => regime === value)) {
          setInputs((current) => ({ ...current, gravityRegime: value === "not_supplied" ? "" : value as DraftInputs["gravityRegime"] }));
        }
      }} options={[{ value: "not_supplied", label: "Unknown / not supplied" }, ...habitatGravityRegimes.map((regime) => ({ value: regime, label: regime }))]} />{errors.gravityRegime ? <FieldError value={errors.gravityRegime} /> : null}</div>
    </fieldset>
    <p className="cc-caption">Oxygen is expressed as oxygen volume percentage. Pressure is expressed in kPa. Blank fields remain unknown; the form never replaces them with illustrative values or zeros.</p>
    <button type="submit" className="button" disabled={loading || !canSubmit}>{approval?.enabled ? "Submit persisted Habitat Analysis" : "Submit persisted Habitat Analysis (scientific fixture required)"}</button>
    {loading ? <button type="button" className="button button-outline" onClick={cancel}>Cancel analysis request</button> : null}
    </form>
    {loading ? <p role="status">Saving and requesting analysis through the backend…</p> : null}
    <p className="cc-caption">Only catalog IDs and the documented values in this form are submitted. Temperature and gravity are retained as context; the current upstream contract uses habitat, material, oxygen and pressure. No request is automatically retried.</p>
    {outcome && "problem" in outcome ? <div className="cc-error" role="alert"><h3>{outcome.problem.title}</h3><p>{outcome.problem.detail}</p><p>HTTP {outcome.problem.status} · {outcome.problem.errorCode}</p>{outcome.problem.analysisId ? <p>Retained analysis ID: <code>{outcome.problem.analysisId}</code>. Use the saved-analysis lookup below before submitting again.</p> : null}</div> : null}
  </section>{outcome && "analysis" in outcome ? <HabitatAnalysisResultView analysis={outcome.analysis} /> : null}</>;
}

function ReadOnlyField({ label, value, error }: { label: string; value: string; error?: string }) {
  return <div className="cc-field"><label>{label}</label><output className="cc-readonly-value">{value}</output>{error ? <FieldError value={error} /> : null}</div>;
}

function ScientificInput({ label, id, value, unit, error, onChange }: { label: string; id: string; value: string; unit: string; error?: string; onChange: (value: string) => void }) {
  return <div className="cc-field"><label htmlFor={id}>{label} <span className="cc-caption">{unit}</span></label><input id={id} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder="No approved value" />{error ? <FieldError value={error} /> : null}</div>;
}

function FieldError({ value }: { value: string }) { return <p className="cc-field-error" role="alert">{value}</p>; }

export function HabitatAnalysisResultView({ analysis }: { analysis: HabitatAnalysis }) {
  const result = analysis.result;
  return <section className="cc-panel cc-habitat-result" aria-live="polite">
    <div className="cc-panel-heading"><div><h2>Persisted analysis result</h2><p className="cc-caption">Record {analysis.id}</p></div><span className="cc-tag">{analysis.status}</span></div>
    <p><strong>{analysis.environment.name}</strong> · <strong>{analysis.material.name}</strong></p>
    <dl className="cc-facts"><div><dt>Oxygen</dt><dd>{formatInput(analysis.inputs.oxygenVolumePercent)}</dd></div><div><dt>Pressure</dt><dd>{formatInput(analysis.inputs.pressureKPa)}</dd></div><div><dt>Temperature</dt><dd>{formatInput(analysis.inputs.temperatureCelsius)}</dd></div><div><dt>Gravity</dt><dd>{analysis.inputs.gravity.regime ?? "Unknown"} · {analysis.inputs.gravity.origin}</dd></div></dl>
    {analysis.error ? <div className="cc-error" role="alert"><p>{analysis.error.message ?? "The persisted analysis failed."}</p><p className="cc-caption">{analysis.error.code ?? "No backend error code supplied."}</p></div> : null}
    {result ? <><p><strong>Basis:</strong> {result.analysisBasis ?? "Unknown"}</p><p><strong>Scientific validation:</strong> {result.isScientificallyValidated ? "Validated" : "Not scientifically validated"}</p><p>{result.explanation}</p>{result.limitations ? <p className="cc-caption">{result.limitations}</p> : null}<h3>Factors</h3>{result.factors.length ? <ul>{result.factors.map((factor, index) => <li key={`${factor.name}-${index}`}><strong>{factor.name}</strong>{factor.description ? ` — ${factor.description}` : ""}</li>)}</ul> : <p className="cc-caption">No analysis factors were returned.</p>}<h3>Citations</h3>{result.citations.length ? <ul>{result.citations.map((citation, index) => <li key={`${citation.matchStatus}-${index}`}>{citation.source ? <>{citation.matchStatus}: {citation.source.url && safeUrl(citation.source.url) ? <a href={citation.source.url} target="_blank" rel="noreferrer">{citation.source.title}</a> : citation.source.title}</> : <>{citation.matchStatus}: {citation.rawTitle ?? "Unresolved reference"}</>}</li>)}</ul> : <p className="cc-caption">No structured citations were returned for this analysis.</p>}</> : null}
    <p className="cc-caption">{analysis.disclaimer}</p>
  </section>;
}

function formatInput(input: { value: number | null; origin: string; measurementBasis: string | null }) {
  return `${input.value ?? "Unknown"}${input.measurementBasis ? ` ${input.measurementBasis}` : ""} · ${input.origin}`;
}

function safeUrl(value: string): boolean {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}
