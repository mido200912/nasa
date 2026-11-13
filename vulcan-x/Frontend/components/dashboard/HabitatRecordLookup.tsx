"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getHabitatAnalysis, type HabitatApiOutcome } from "@/lib/habitat-analysis";
import { HabitatAnalysisResultView } from "@/components/dashboard/HabitatAnalysisPanel";

export function HabitatRecordLookup() {
  const [id, setId] = useState("");
  const [outcome, setOutcome] = useState<HabitatApiOutcome | null>(null);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function retrieve(event: FormEvent) {
    event.preventDefault();
    if (controller.current) return;
    const pending = new AbortController(); controller.current = pending;
    setLoading(true); setOutcome(null);
    const next = await getHabitatAnalysis(id.trim(), pending.signal);
    if (!pending.signal.aborted) { setOutcome(next); setLoading(false); controller.current = null; }
  }
  function cancel() { controller.current?.abort(); controller.current = null; setLoading(false); setOutcome({ problem: { status: 499, title: "Retrieval cancelled" } }); }
  return <section className="cc-panel"><h2>Retrieve a saved Habitat analysis</h2><p className="cc-caption">Read-only retrieval does not enable live submission or certify a saved result.</p>
    <form className="cc-actions" onSubmit={retrieve}><div className="cc-field"><label htmlFor="saved-analysis-id">Saved analysis ID</label><input id="saved-analysis-id" value={id} disabled={loading} onChange={(event) => setId(event.target.value)} /></div><button key="retrieve" className="button" disabled={loading || !id.trim()}>Retrieve analysis</button>{loading ? <button key="cancel" type="button" className="button button-outline" onClick={cancel}>Cancel analysis retrieval</button> : null}</form>
    {loading ? <p role="status">Retrieving persisted Habitat analysis…</p> : null}
    {outcome && "problem" in outcome ? <div className="cc-error" role="alert"><h3>{outcome.problem.title}</h3><p>{outcome.problem.detail ?? `Retrieval returned HTTP ${outcome.problem.status}. Check the saved ID or retry.`}</p></div> : outcome && "analysis" in outcome ? <HabitatAnalysisResultView analysis={outcome.analysis} /> : null}
  </section>;
}
