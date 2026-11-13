"use client";

import { useState } from "react";
import { useSimulationStore } from "@/components/SimulationProvider";
import { emptyHabitatDraft, habitatGravityRegimes, validateHabitatDraft, type HabitatAnalysis, type HabitatAnalysisDraft } from "@/lib/habitat-analysis";

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
  const draft = { ...emptyHabitatDraft(environmentId, materialId), ...inputs };
  const errors = validateHabitatDraft(draft);

  return <section className="cc-panel cc-habitat-analysis" aria-labelledby="persisted-habitat-title">
    <div className="cc-panel-heading"><div><h2 id="persisted-habitat-title">Persisted Habitat Analysis</h2><p className="cc-caption">Prepared separately from the illustrative WebGL chamber.</p></div><span className="cc-tag">Live submission disabled</span></div>
    <div className="cc-error" role="status"><p>Live analysis is unavailable until a scientifically documented oxygen and pressure fixture/default is approved. The WebGL controls and presets above are not copied into this form.</p></div>
    <div className="cc-habitat-form-grid">
      <ReadOnlyField label="Catalog environment ID" value={environmentId?.toString() ?? "Select a catalog environment above"} error={errors.environmentId} />
      <ReadOnlyField label="Catalog material ID" value={materialId?.toString() ?? "Select a catalog material above"} error={errors.materialId} />
      <ScientificInput label="Oxygen concentration" id="habitat-oxygen" value={inputs.oxygenVolumePercent} unit="volume %" error={errors.oxygenVolumePercent} onChange={(oxygenVolumePercent) => setInputs((current) => ({ ...current, oxygenVolumePercent }))} />
      <ScientificInput label="Pressure" id="habitat-pressure" value={inputs.pressureKPa} unit="kPa" error={errors.pressureKPa} onChange={(pressureKPa) => setInputs((current) => ({ ...current, pressureKPa }))} />
      <ScientificInput label="Temperature" id="habitat-temperature" value={inputs.temperatureCelsius} unit="°C (optional)" error={errors.temperatureCelsius} onChange={(temperatureCelsius) => setInputs((current) => ({ ...current, temperatureCelsius }))} />
      <ScientificInput label="Effective gravity" id="habitat-gravity" value={inputs.effectiveGravityG} unit="g (optional)" error={errors.effectiveGravityG} onChange={(effectiveGravityG) => setInputs((current) => ({ ...current, effectiveGravityG }))} />
      <div className="cc-field"><label htmlFor="habitat-gravity-regime">Gravity regime</label><select id="habitat-gravity-regime" className="cc-select-native" value={inputs.gravityRegime} onChange={(event) => setInputs((current) => ({ ...current, gravityRegime: event.target.value as DraftInputs["gravityRegime"] }))}><option value="">Unknown / not supplied</option>{habitatGravityRegimes.map((regime) => <option key={regime} value={regime}>{regime}</option>)}</select>{errors.gravityRegime ? <FieldError value={errors.gravityRegime} /> : null}</div>
      <div className="cc-field"><label htmlFor="habitat-language">Language</label><input id="habitat-language" value={inputs.language} maxLength={10} onChange={(event) => setInputs((current) => ({ ...current, language: event.target.value }))} />{errors.language ? <FieldError value={errors.language} /> : null}</div>
    </div>
    <p className="cc-caption">Oxygen is expressed as oxygen volume percentage. Pressure is expressed in kPa. Blank fields remain unknown; the form never replaces them with illustrative values or zeros.</p>
    <button type="button" className="button" disabled aria-disabled="true">Submit persisted Habitat Analysis (scientific fixture required)</button>
    <p className="cc-caption">When approved inputs are available, this workflow will submit only `catalogEnvironmentId`, `catalogMaterialId`, and documented scientific values to `/api/backend/habitat-analyses`.</p>
  </section>;
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
