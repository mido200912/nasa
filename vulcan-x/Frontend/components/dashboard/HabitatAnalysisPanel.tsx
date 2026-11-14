"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { prepareHabitatReport } from "@/lib/habitat-report";
import styles from "./HabitatAnalysisResult.module.css";
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
  const [availability, setAvailability] = useState<{ enabled: boolean } | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<HabitatApiOutcome | null>(null);
  const controller = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const draft = { ...emptyHabitatDraft(environmentId, materialId), ...inputs };
  const errors = validateHabitatDraft(draft);
  const canSubmit = availability?.enabled === true && Object.keys(errors).length === 0
    && inputs.oxygenVolumePercent.trim() !== "" && inputs.pressureKPa.trim() !== "";

  useEffect(() => {
    const pending = new AbortController();
    void getHabitatCapabilities(AbortSignal.any([pending.signal, AbortSignal.timeout(10000)]))
      .then((value) => { if (!pending.signal.aborted) setAvailability(value); })
      .catch(() => { if (!pending.signal.aborted) setAvailabilityError("The analysis service status is unavailable. Refresh to check again."); });
    return () => pending.abort();
  }, [refresh]);
  useEffect(() => () => { requestVersion.current++; controller.current?.abort(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (controller.current) return;
    try {
      const payload = createHabitatRequest(draft, availability?.enabled === true);
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
    <div className="cc-panel-heading"><div><h2 id="persisted-habitat-title">Habitat conditions</h2><p className="cc-caption">Your inputs and AI assessment are saved as a Habitat Analysis record.</p></div><span className="cc-tag">{availability?.enabled ? "AI analysis available" : "Analysis unavailable"}</span></div>
    {!availability?.enabled ? <div className="cc-error" role="status"><p>{availabilityError || (availability ? "AI habitat interpretation is disabled by the server operator." : "Checking analysis service availability…")}</p><button type="button" className="button button-outline" onClick={() => { setAvailability(null); setAvailabilityError(""); setRefresh((value) => value + 1); }}>Refresh service status</button></div> : <p className="cc-caption">Enter the conditions you want assessed. The AI discusses relevant research and evidence gaps; it does not certify a habitat as safe.</p>}
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
    <p className="cc-caption">Oxygen (volume %) and pressure (kPa) are required. Optional fields remain unknown when blank. Offline simulation presets are never copied into this form.</p>
    <button type="submit" className="button" disabled={loading || !canSubmit}>Submit persisted Habitat Analysis</button>
    {loading ? <button type="button" className="button button-outline" onClick={cancel}>Cancel analysis request</button> : null}
    </form>
    {loading ? <p role="status">Saving and requesting analysis through the backend…</p> : null}
    <p className="cc-caption">Environment, material, oxygen, pressure, temperature and gravity are forwarded to the AI with their input origins. No request is automatically retried.</p>
    {outcome && "problem" in outcome ? <div className="cc-error" role="alert"><h3>{outcome.problem.title}</h3><p>{outcome.problem.detail}</p><p>HTTP {outcome.problem.status} · {outcome.problem.errorCode}</p>{outcome.problem.analysisId ? <p>Retained analysis ID: <code>{outcome.problem.analysisId}</code>. Use the saved-analysis lookup below before submitting again.</p> : null}</div> : null}
  </section>{outcome && "analysis" in outcome ? <HabitatAnalysisResultView analysis={outcome.analysis} /> : null}</>;
}

function ReadOnlyField({ label, value, error }: { label: string; value: string; error?: string }) {
  return <div className="cc-field"><label>{label}</label><output className="cc-readonly-value">{value}</output>{error ? <FieldError value={error} /> : null}</div>;
}

function ScientificInput({ label, id, value, unit, error, onChange }: { label: string; id: string; value: string; unit: string; error?: string; onChange: (value: string) => void }) {
  return <div className="cc-field"><label htmlFor={id}>{label} <span className="cc-caption">{unit}</span></label><input id={id} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Enter a value" />{error ? <FieldError value={error} /> : null}</div>;
}

function FieldError({ value }: { value: string }) { return <p className="cc-field-error" role="alert">{value}</p>; }

export function HabitatAnalysisResultView({ analysis }: { analysis: HabitatAnalysis }) {
  const result = analysis.result;
  const [expanded, setExpanded] = useState(false);
  const reportId = useId();
  const report = prepareHabitatReport(result?.explanation ?? "");
  const gravity = analysis.inputs.gravity;
  return <section className={`cc-panel cc-habitat-result ${styles.report}`} aria-label="Habitat analysis result" aria-live="polite">
    <header className={styles.header}>
      <div><h2>Analysis result</h2><p className={styles.context}>{analysis.environment.name} · {analysis.material.name}</p></div>
      <span className={styles.status}>{analysis.status}</span>
    </header>
    <p className={styles.notice}><strong>{!result ? "Analysis record" : result.isMock ? "Mock response" : "AI assessment"}</strong><span>Not scientifically validated</span></p>
    <dl className={styles.conditions}>
      <div><dt>Oxygen</dt><dd>{inputWithUnit(analysis.inputs.oxygenVolumePercent.value, "%")}</dd></div>
      <div><dt>Pressure</dt><dd>{inputWithUnit(analysis.inputs.pressureKPa.value, " kPa")}</dd></div>
      <div><dt>Temperature</dt><dd>{inputWithUnit(analysis.inputs.temperatureCelsius.value, " °C")}</dd></div>
      <div><dt>Gravity</dt><dd>{gravity.effectiveGravityG !== null ? <>{gravity.effectiveGravityG} g{gravity.regime ? <small>{gravity.regime}</small> : null}</> : gravity.regime ?? "Not supplied"}</dd></div>
    </dl>
    {analysis.error ? <div className="cc-error" role="alert"><p>{analysis.error.message ?? "The persisted analysis failed."}</p><p className="cc-caption">{analysis.error.code ?? "No backend error code supplied."}</p></div> : null}
    {result ? <div className={styles.reading}>
      <h3>{report.hasMore && !expanded ? "Assessment preview" : "Assessment"}</h3>
      <div id={reportId} data-report-body>
        {report.hasMore && !expanded ? <p className={styles.preview}>{report.preview}</p> : report.markdown
          ? <div className={styles.prose}><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ img: () => null }}>{report.markdown}</ReactMarkdown></div>
          : <p className={styles.preview}>No assessment text is available for this record.</p>}
      </div>
      {report.hasMore ? <button type="button" className={styles.expand} aria-expanded={expanded} aria-controls={reportId} onClick={() => setExpanded((value) => !value)}>
        {expanded ? "Show less" : "Read full assessment"}<ChevronDown size={16} aria-hidden="true" />
      </button> : null}
    </div> : null}
    <div className={styles.disclosures}>
      {result ? <details className={styles.disclosure}>
        <summary><span>Sources</span><span className={styles.count}>{result.citations.length}</span></summary>
        {result.citations.length ? <><p className={styles.detailCopy}>Retrieved references, not validation of these exact conditions.</p><ul className={styles.sourceList}>{result.citations.map((citation, index) => {
          const url = citation.source?.url ?? citation.rawUrl;
          const title = citation.source?.title ?? citation.rawTitle ?? (url && safeUrl(url) ? new URL(url).hostname.replace(/^www\./, "") : "Unresolved reference");
          return <li key={`${citation.matchStatus}-${index}`}>
            {url && safeUrl(url) ? <a href={url} target="_blank" rel="noreferrer">{title}</a> : title}
            <small>{citation.matchStatus === "Matched" ? "Matched to catalog · not scientific validation" : "Not matched to catalog"}</small>
          </li>;
        })}</ul></> : <p className={styles.detailCopy}>No structured citations were returned.</p>}
      </details> : null}
      <details className={styles.disclosure}>
        <summary><span>Record details</span></summary>
        <dl className={styles.metadata}>
          <div><dt>Analysis ID</dt><dd><code>{analysis.id}</code></dd></div>
          {analysis.generation?.mode === "ProviderInference" ? <div><dt>Provider / model</dt><dd>{analysis.generation.provider} · {analysis.generation.model}</dd></div> : null}
          <div><dt>Analysis basis</dt><dd>{result?.analysisBasis === "LlmInterpretationOnly" ? "Qualitative AI interpretation" : result?.analysisBasis ?? "Not supplied"}</dd></div>
          <div><dt>Input origins</dt><dd>Oxygen: {analysis.inputs.oxygenVolumePercent.origin} · Pressure: {analysis.inputs.pressureKPa.origin} · Temperature: {analysis.inputs.temperatureCelsius.origin} · Gravity: {gravity.origin}</dd></div>
        </dl>
        {result?.factors.length ? <><h3>Reported factors</h3><ul className={styles.sourceList}>{result.factors.map((factor, index) => <li key={`${factor.name}-${index}`}><strong>{factor.name}</strong>{factor.description ? ` — ${factor.description}` : ""}</li>)}</ul></> : null}
        {result?.limitations ? <p className={styles.detailCopy}>{result.limitations}</p> : null}
        <p className={styles.detailCopy}>{analysis.disclaimer}</p>
        {result?.explanation ? <details className={styles.original}><summary>Original saved response</summary><pre>{result.explanation}</pre></details> : null}
      </details>
    </div>
  </section>;
}

function inputWithUnit(value: number | null, unit: string) { return value === null ? "Not supplied" : `${value}${unit}`; }

function safeUrl(value: string): boolean {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}
