"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getCatalogPage, getCatalogRecord, type CatalogKind, type CatalogPage, type CatalogRecord, type RecordKind } from "@/lib/catalog-browser";
import { useSimulationStore } from "@/components/SimulationProvider";

export function CatalogBrowser({ initialKind, allowExperiments = false }: { initialKind: CatalogKind; allowExperiments?: boolean }) {
  const [kind, setKind] = useState(initialKind);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState({ search: "", page: 1, refresh: 0 });
  const [list, setList] = useState<{ data: CatalogPage | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [selected, setSelected] = useState<{ kind: RecordKind; id: number } | null>(null);
  const [detail, setDetail] = useState<{ data: CatalogRecord | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: false });
  const [retryDetail, setRetryDetail] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const listController = useRef<AbortController | null>(null);
  const detailController = useRef<AbortController | null>(null);
  const setCatalogMaterial = useSimulationStore((state) => state.setCatalogMaterial);
  const currentMaterial = useSimulationStore((state) => state.catalogMaterialId);

  useEffect(() => {
    const controller = new AbortController(); listController.current = controller;
    void getCatalogPage(kind, query, controller.signal).then((data) => {
      if (!controller.signal.aborted) setList({ data, loading: false, error: null });
    }).catch(() => { if (!controller.signal.aborted) setList({ data: null, loading: false, error: "Live catalog unavailable. Retry the backend request; no offline entries are shown here." }); });
    return () => controller.abort();
  }, [kind, query]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController(); detailController.current = controller;
    void getCatalogRecord(selected.kind, selected.id, controller.signal).then((data) => {
      if (!controller.signal.aborted) setDetail({ data, loading: false, error: null });
    }).catch(() => { if (!controller.signal.aborted) setDetail({ data: null, loading: false, error: "This catalog record could not be retrieved. It may be missing or the backend is unavailable." }); });
    return () => controller.abort();
  }, [selected, retryDetail]);
  function reload(next = query) {
    setCancelled(false); setList({ data: null, error: null, loading: true });
    setQuery({ ...next, refresh: next.refresh + 1 });
  }
  function search(event: FormEvent) { event.preventDefault(); reload({ search: input, page: 1, refresh: query.refresh }); }
  function open(kind: RecordKind, id: number) { setDetail({ data: null, error: null, loading: true }); setSelected({ kind, id }); }
  function cancel() {
    listController.current?.abort(); detailController.current?.abort();
    setList((state) => ({ ...state, loading: false })); setDetail((state) => ({ ...state, loading: false })); setCancelled(true);
  }
  return <section className="cc-panel cc-live-catalog" aria-label={`Live ${initialKind} catalog`}>
    <div className="cc-panel-heading"><div><h2>Live {kind} catalog</h2><p className="cc-caption">Persisted backend records, not illustrative scenarios or scientific validation.</p></div><span className="cc-tag">Live database</span></div>
    {allowExperiments ? <div className="cc-actions" role="group" aria-label="Catalog type">{(["materials", "experiments"] as const).map((value) => <button key={value} className="button button-outline" type="button" aria-pressed={kind === value} onClick={() => { setKind(value); setSelected(null); setDetail({ data: null, error: null, loading: false }); reload({ search: "", page: 1, refresh: query.refresh }); setInput(""); }}>{value === "materials" ? "Catalog materials" : "Catalog experiments"}</button>)}</div> : null}
    <form onSubmit={search} className="cc-actions"><div className="cc-field"><label htmlFor={`live-${initialKind}-search`}>Search live {kind}</label><input id={`live-${initialKind}-search`} type="search" maxLength={100} value={input} onChange={(event) => setInput(event.target.value)} /></div><button type="submit" className="button">Search catalog</button><button type="button" className="button button-outline" onClick={() => reload()}>Refresh catalog</button>{list.loading || detail.loading ? <button type="button" className="button button-outline" onClick={cancel}>Cancel catalog request</button> : null}</form>
    {cancelled ? <p role="status">Catalog request cancelled. Refresh or search to try again.</p> : null}
    {list.loading ? <p role="status">Loading live catalog…</p> : list.error ? <div role="alert" className="cc-error"><p>{list.error}</p><button className="button button-outline" onClick={() => reload()}>Retry live catalog</button></div> : list.data ? <>
      <p className="cc-caption" role="status">Page {list.data.page} · {list.data.totalCount} catalog records</p>
      {list.data.items.length ? <ul className="cc-citation-list">{list.data.items.map((item) => <li key={item.id}><strong>{item.label}</strong><p className="cc-caption">Catalog ID: {item.id}{item.context ? ` · ${item.context}` : ""}</p><div className="cc-actions"><button className="button button-outline" onClick={() => open(kind, item.id)}>View {item.label}</button>{kind === "materials" ? <button className="button button-outline" disabled={currentMaterial === item.id} onClick={() => setCatalogMaterial(item.id, null)}>{currentMaterial === item.id ? "Catalog material selected" : `Select catalog material ${item.label}`}</button> : null}</div></li>)}</ul> : <p className="cc-empty">No live catalog records match this query.</p>}
      <div className="cc-actions"><button className="button button-outline" disabled={query.page <= 1} onClick={() => reload({ ...query, page: query.page - 1 })}>Previous catalog page</button><button className="button button-outline" disabled={list.data.page * list.data.pageSize >= list.data.totalCount} onClick={() => reload({ ...query, page: query.page + 1 })}>Next catalog page</button></div>
    </> : null}
    {selected ? <section className="cc-console-output" aria-live="polite"><h3>Catalog record details</h3>{detail.loading ? <p role="status">Loading persisted record…</p> : detail.error ? <div role="alert" className="cc-error"><p>{detail.error}</p><button className="button button-outline" onClick={() => { setDetail({ data: null, error: null, loading: true }); setRetryDetail((value) => value + 1); }}>Retry record</button></div> : detail.data ? <>
      <h4>{detail.data.label}</h4><p className="cc-caption">{selected.kind} ID: {detail.data.id} · {detail.data.context ?? "No category supplied"}</p><p>{detail.data.description ?? "No description supplied by the catalog."}</p>
      {detail.data.facts.length ? <dl className="cc-facts">{detail.data.facts.map((fact, index) => <div key={index}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : <p className="cc-caption">No curated numeric properties or additional measurements supplied. No defaults have been invented.</p>}
      {detail.data.related.length ? <><h4>Related catalog records</h4><ul>{detail.data.related.map((item, index) => <li key={`${item.kind}-${item.id}-${index}`}><button className="text-link" onClick={() => open(item.kind, item.id)}>{item.label} · {item.kind} ID {item.id}</button></li>)}</ul></> : null}
      {detail.data.url && safeUrl(detail.data.url) ? <a href={detail.data.url} target="_blank" rel="noreferrer">Open catalog source ↗</a> : null}
    </> : null}</section> : null}
  </section>;
}
function safeUrl(value: string) { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } }
