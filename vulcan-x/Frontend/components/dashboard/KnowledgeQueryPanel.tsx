"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createKnowledgeRequest, emptyKnowledgeDraft, getKnowledgeQuery, KnowledgeFormError, submitKnowledgeQuery, validateKnowledgeDraft, type KnowledgeOutcome, type KnowledgeQuery } from "@/lib/knowledge-query";
import { EnvironmentSelect, MaterialSelect } from "@/components/dashboard/Controls";

type Inputs = Omit<ReturnType<typeof emptyKnowledgeDraft>, "environmentId" | "materialId">;
const initialInputs: Inputs = { question: "", yearFrom: "", yearTo: "", maxSources: "5", language: "en" };

export function KnowledgeQueryPanel({ environmentId, materialId }: { environmentId: number | null; materialId: number | null }) {
  const [inputs, setInputs] = useState<Inputs>(initialInputs);
  const [outcome, setOutcome] = useState<KnowledgeOutcome | null>(null);
  const [retrieveId, setRetrieveId] = useState("");
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const draft = { ...emptyKnowledgeDraft(environmentId, materialId), ...inputs };
  const errors = validateKnowledgeDraft(draft);

  useEffect(() => () => {
    requestVersion.current++;
    controller.current?.abort();
    controller.current = null;
  }, []);

  async function runRequest(send: (signal: AbortSignal) => Promise<KnowledgeOutcome>) {
    // State updates are asynchronous; the ref locks even same-tick submissions.
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
    } finally {
      // An older cancelled request must not unlock a newer one.
      if (current === requestVersion.current) { setLoading(false); controller.current = null; }
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (controller.current) return;
    try {
      const request = createKnowledgeRequest(draft);
      await runRequest((signal) => submitKnowledgeQuery(request, signal));
    } catch (cause) {
      if (cause instanceof KnowledgeFormError) setOutcome({ problem: { status: 400, title: "Check the live Knowledge form", detail: Object.values(cause.errors).join(" "), errorCode: "KNOWLEDGE_FORM_INVALID" } });
    }
  }

  async function retrieve() {
    await runRequest((signal) => getKnowledgeQuery(retrieveId.trim(), signal));
  }

  function cancel() {
    requestVersion.current++;
    controller.current?.abort(); controller.current = null; setLoading(false);
    setOutcome({ problem: { status: 499, title: "Request cancelled", detail: "Cancellation does not delete a query already saved by the backend. A new submission may create another record; retrieve its ID if known.", errorCode: "REQUEST_CANCELLED" } });
  }

  return <div className="cc-playbook-grid"><section className="cc-panel cc-console"><div className="cc-panel-heading"><div><h2>Live Knowledge query</h2><p className="cc-caption">Persisted backend workflow. Provider availability and response provenance are reported, not assumed.</p></div><span className="cc-tag">Live service</span></div>
    <EnvironmentSelect id="knowledge-environment" compact showIllustrative={false} />
    <MaterialSelect id="knowledge-material" showIllustrative={false} />
    <form onSubmit={submit}><label htmlFor="knowledge-question">Research question</label><textarea id="knowledge-question" maxLength={2000} rows={5} value={inputs.question} disabled={loading} onChange={(event) => setInputs((current) => ({ ...current, question: event.target.value }))} aria-describedby="knowledge-note" />{errors.question ? <FieldError value={errors.question} /> : null}
      <p id="knowledge-note" className="cc-caption">Only the question and selected catalog environment are sent to Vulcan-X. Material, years, and max sources are saved context, not retrieval filters. Language is accepted by the API but is not currently retained or forwarded.</p>
      <div className="cc-knowledge-grid"><ReadOnly label="Catalog environment ID" value={environmentId?.toString() ?? "Select a catalog environment above"} error={errors.environmentId} /><ReadOnly label="Catalog material ID (optional)" value={materialId?.toString() ?? "No catalog material selected"} error={errors.materialId} /><TextField id="knowledge-year-from" label="Year from (saved context)" value={inputs.yearFrom} error={errors.yearFrom} onChange={(yearFrom) => setInputs((current) => ({ ...current, yearFrom }))} /><TextField id="knowledge-year-to" label="Year to (saved context)" value={inputs.yearTo} error={errors.yearTo} onChange={(yearTo) => setInputs((current) => ({ ...current, yearTo }))} /><TextField id="knowledge-max-sources" label="Max sources (saved context)" value={inputs.maxSources} error={errors.maxSources} onChange={(maxSources) => setInputs((current) => ({ ...current, maxSources }))} /><TextField id="knowledge-language" label="Language (not currently applied)" value={inputs.language} error={errors.language} onChange={(language) => setInputs((current) => ({ ...current, language }))} /></div>
      <div className="cc-actions">{loading ? <button key="cancel" type="button" className="button button-outline" onClick={cancel}>Cancel request</button> : <button key="submit" type="submit" className="button" disabled={Object.keys(errors).length > 0}>Ask live Knowledge service</button>}</div>
    </form>
    <div className="cc-console-output"><span className="cc-caption">Retrieve a persisted query</span><div className="cc-actions"><input aria-label="Persisted query ID" value={retrieveId} onChange={(event) => setRetrieveId(event.target.value)} placeholder="Query GUID" disabled={loading} /><button type="button" className="button button-outline" onClick={() => { void retrieve(); }} disabled={loading || !retrieveId.trim()}>Retrieve</button></div><p className="cc-caption">Retry retrieval with the saved ID after an error or while a record is Running. Submitting another question creates a new record; failed submissions are never retried automatically.</p></div>
  </section><KnowledgeResult outcome={outcome} loading={loading} /></div>;
}

function KnowledgeResult({ outcome, loading }: { outcome: KnowledgeOutcome | null; loading: boolean }) {
  if (loading) return <section className="cc-panel cc-protocol" aria-live="polite"><div className="cc-protocol-empty"><h3>Asking the Knowledge service…</h3><p>The persisted query will be displayed when the backend responds.</p></div></section>;
  if (!outcome) return <section className="cc-panel cc-protocol"><div className="cc-protocol-empty"><h3>No live query yet</h3><p>Ask a question using a selected catalog environment, or retrieve a known persisted query ID.</p><p className="cc-caption">Live answers are AI-generated and are not scientific validation.</p></div></section>;
  if ("problem" in outcome) return <section className="cc-panel cc-protocol"><div className="cc-error" role="alert"><h3>{outcome.problem.title}</h3><p>{outcome.problem.detail ?? "The Knowledge request could not be completed."}</p><p className="cc-caption">HTTP {outcome.problem.status} · {outcome.problem.errorCode ?? "No backend error code supplied."}{outcome.problem.queryId ? ` Persisted query ID: ${outcome.problem.queryId}` : ""}</p>{outcome.problem.errors ? <ul>{Object.entries(outcome.problem.errors).flatMap(([field, messages]) => messages.map((message, index) => <li key={`${field}-${index}`}>{field}: {message}</li>))}</ul> : null}{outcome.problem.traceId ? <p className="cc-caption">Trace ID: {outcome.problem.traceId}</p> : null}</div>{outcome.problem.queryId ? <p className="cc-caption">The retrieval field contains the saved ID. Retrieve its persisted status before submitting again.</p> : null}</section>;
  return <KnowledgeQueryResult query={outcome.query} />;
}

export function KnowledgeQueryResult({ query }: { query: KnowledgeQuery }) {
  return <section className="cc-panel cc-protocol" aria-live="polite"><div className="cc-panel-heading"><div><h2>Persisted Knowledge response</h2><p className="cc-caption">Query ID: {query.id}</p></div><span className="cc-tag">{query.status}</span></div>
    {query.isMock ? <p className="cc-caption">Mock response — not a live AI result or scientific validation.</p> : null}
    <p className="cc-caption">{query.generation?.mode === "ProviderInference"
      ? `Generation: provider inference reported by Vulcan-X · ${query.generation.provider} · ${query.generation.model}. Not scientific validation.`
      : "Generation: unspecified or historical. This saved answer is not evidence of verified LLM inference."}</p>
    <p className="cc-caption">Question: {query.question}</p>{query.error ? <div className="cc-error" role="alert"><p>{query.error.message ?? "The persisted query failed."}</p><p className="cc-caption">{query.error.code ?? "No backend error code supplied."}</p></div> : null}
    {query.answer ? <div className="cc-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{query.answer}</ReactMarkdown></div> : <p className="cc-empty">No persisted answer is available for this query.</p>}
    <h3>Grounding status</h3><p>{groundingText(query.groundingStatus)}</p><p className="cc-caption">This is a local citation-matching outcome, not scientific verification.</p>
    <h3>Citations</h3>{query.citations.length ? <ul className="cc-citation-list">{query.citations.map((citation, index) => <li key={`${citation.matchStatus}-${index}`}><strong>{citation.matchStatus}</strong>{citation.matchStatus === "Matched" && citation.source ? <><span> — {citation.source.url && safeUrl(citation.source.url) ? <a href={citation.source.url} target="_blank" rel="noreferrer">{citation.source.title}</a> : citation.source.title}</span><p className="cc-caption">Catalog source ID: {citation.source.id}{citation.source.doi ? ` · DOI: ${citation.source.doi}` : ""}</p><p className="cc-caption">Catalog-linked metadata; title matching does not prove scientific correctness.</p></> : <><span> — {citation.rawTitle ?? "Unmatched source text unavailable"}</span><p className="cc-caption">Unmatched / unverified. No catalog source link was created.</p></>}{citation.excerpt ? <p>{citation.excerpt}</p> : null}</li>)}</ul> : <p className="cc-empty">No citations were returned. This answer is not source-verified.</p>}
    <p className="cc-caption">{query.disclaimer}</p>
  </section>;
}

function groundingText(value: KnowledgeQuery["groundingStatus"]) {
  switch (value) {
    case "HasMatchedCitations": return "One or more returned citation labels matched catalog records.";
    case "HasOnlyUnmatchedCitations": return "Citation labels were returned, but none matched a catalog record.";
    case "NoCitations": return "No citations were returned by the AI service.";
    default: return "No grounding status is available.";
  }
}

function ReadOnly({ label, value, error }: { label: string; value: string; error?: string }) { return <div className="cc-field"><label>{label}</label><output className="cc-readonly-value">{value}</output>{error ? <FieldError value={error} /> : null}</div>; }
function TextField({ id, label, value, error, onChange }: { id: string; label: string; value: string; error?: string; onChange: (value: string) => void }) { return <div className="cc-field"><label htmlFor={id}>{label}</label><input id={id} value={value} onChange={(event) => onChange(event.target.value)} />{error ? <FieldError value={error} /> : null}</div>; }
function FieldError({ value }: { value: string }) { return <p className="cc-field-error" role="alert">{value}</p>; }
function safeUrl(value: string): boolean { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } }
