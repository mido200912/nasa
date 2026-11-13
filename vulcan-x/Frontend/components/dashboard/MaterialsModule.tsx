"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Choice } from "@/components/dashboard/Controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSimulationStore } from "@/components/SimulationProvider";
import { calculateSimulation, isMaterial, materialCatalog, presets, type MaterialId } from "@/lib/simulation";

const HazardRadar = dynamic(() => import("@/components/dashboard/TelemetryCharts").then((module) => module.HazardRadar), { ssr: false, loading: () => <div className="cc-chart">Preparing comparison…</div> });

export function MaterialsModule() {
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState("all");
  const [source, setSource] = useState("all");
  const [first, setFirst] = useState<MaterialId>("cable_insulation");
  const [second, setSecond] = useState<MaterialId>("nomex_fabric");
  const setMaterial = useSimulationStore((state) => state.setMaterial);
  const oxygenLevel = useSimulationStore((state) => state.oxygenLevel);
  const pressurePsi = useSimulationStore((state) => state.pressurePsi);
  const gravityG = useSimulationStore((state) => state.gravityG);
  const selectedMaterial = useSimulationStore((state) => state.selectedMaterial);
  const filtered = materialCatalog.filter((material) => `${material.name} ${material.family} ${material.context}`.toLowerCase().includes(search.trim().toLowerCase()) && (family === "all" || material.family === family) && (source === "all" || material.context.includes(source)));
  const a = materialCatalog.find((item) => item.id === first)!;
  const b = materialCatalog.find((item) => item.id === second)!;
  const input = { oxygenLevel, pressurePsi, gravityG };
  const metricsA = calculateSimulation({ ...input, selectedMaterial: first });
  const metricsB = calculateSimulation({ ...input, selectedMaterial: second });
  function selectComparison(slot: "first" | "second", value: string) {
    if (!isMaterial(value)) return;
    if (slot === "first") { setFirst(value); if (value === second) setSecond(first); }
    else { setSecond(value); if (value === first) setFirst(second); }
  }
  return <><div className="cc-page-heading"><div><h1>Material & experiment matrix</h1><p>A research starting point, not an imported NASA PSI dataset.</p></div><a className="button button-outline" href="https://www.nasa.gov/psi/" target="_blank" rel="noreferrer">Open NASA PSI ↗</a></div>
    <section className="cc-panel"><div className="cc-material-filters"><div className="cc-field"><label htmlFor="material-search">Search materials</label><div className="cc-search"><Search size={17} aria-hidden="true" /><input id="material-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, family, or program" maxLength={100} /></div></div><Choice id="material-family" label="Material family" value={family} onChange={setFamily} options={[{ value: "all", label: "All families" }, ...["Electrical", "Interior", "Polymer", "Textile"].map((value) => ({ value, label: value }))]} /><Choice id="material-source" label="Research context" value={source} onChange={setSource} options={[{ value: "all", label: "All programs" }, ...["BASS-II", "Saffire", "SOFIE"].map((value) => ({ value, label: value }))]} /></div><p className="cc-caption" role="status">{filtered.length} of {materialCatalog.length} materials shown. LOI is not curated; program tags are reading context, not verified material-test matches.</p>
      <Table className="cc-material-table"><caption className="sr-only">Spacecraft material research candidates. Risk values are synthetic lunar-scenario indices. Earth limiting oxygen index measurements are not loaded.</caption><TableHeader><TableRow><TableHead>Material name</TableHead><TableHead>Earth O₂ limit (LOI)</TableHead><TableHead>Lunar 30% O₂ index</TableHead><TableHead>Microgravity behavior</TableHead><TableHead>Research context</TableHead><TableHead>Use in simulator</TableHead></TableRow></TableHeader><TableBody>{filtered.length ? filtered.map((material) => {
        const risk = calculateSimulation({ ...presets.lunar, selectedMaterial: material.id });
        return <TableRow key={material.id}><TableCell><strong>{material.name}</strong><span className="cc-table-secondary">{material.family}</span></TableCell><TableCell>—<span className="cc-table-secondary">Not curated</span></TableCell><TableCell>{risk.ignitabilityRiskScore} / 100<span className="cc-table-secondary">Synthetic, not measured</span></TableCell><TableCell>{material.behavior}</TableCell><TableCell>{material.context}<span className="cc-table-secondary">Not a test citation</span></TableCell><TableCell><button className="button button-outline" disabled={selectedMaterial === material.id} onClick={() => setMaterial(material.id)} aria-label={`Use ${material.name} in simulator`}>{selectedMaterial === material.id ? "Selected" : "Select material"}</button></TableCell></TableRow>;
      }) : <TableRow><TableCell colSpan={6}><div className="cc-empty"><h3>No materials match</h3><p>Try another name or clear the filters.</p><button className="button button-outline" onClick={() => { setSearch(""); setFamily("all"); setSource("all"); }}>Clear filters</button></div></TableCell></TableRow>}</TableBody></Table>
      <p className="cc-caption">LOI depends on grade and test method; an Earth test cannot directly predict reduced-gravity performance. No grade-specific values or NASA material approvals are asserted.</p>
    </section>
    <section className="cc-panel cc-comparator"><div className="cc-panel-heading"><div><h2>Head-to-head comparison</h2><p className="cc-caption">Active atmosphere: {oxygenLevel}% O₂ / {pressurePsi.toFixed(1)} psi / {gravityG.toFixed(2)} g</p></div><Link className="text-link" href="/dashboard">Adjust atmosphere<ArrowRight size={15} aria-hidden="true" /></Link></div><div className="cc-compare-controls"><Choice id="compare-first" label="First material" value={first} onChange={(value) => selectComparison("first", value)} options={materialCatalog.map((item) => ({ value: item.id, label: item.name }))} /><Choice id="compare-second" label="Second material" value={second} onChange={(value) => selectComparison("second", value)} options={materialCatalog.map((item) => ({ value: item.id, label: item.name }))} /></div><div className="cc-compare-result"><HazardRadar values={metricsA.hazardProfile} comparison={metricsB.hazardProfile} names={[a.name, b.name]} /><div><h3>Synthetic scenario profiles</h3><dl className="cc-facts"><div><dt>{a.name}</dt><dd>{metricsA.ignitabilityRiskScore} <small>/ 100</small></dd></div><div><dt>{b.name}</dt><dd>{metricsB.ignitabilityRiskScore} <small>/ 100</small></dd></div></dl><p>These weights demonstrate comparison behavior. They do not establish a safer material or predict heat release, smoke, or suppression performance.</p><p className="cc-caption">For a real comparison, import matched test reports with material grade, dimensions, ventilation, pressure, oxygen, and uncertainty.</p></div></div></section>
  </>;
}
