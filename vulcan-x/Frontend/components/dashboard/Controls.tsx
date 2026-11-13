"use client";

import { useState } from "react";
import { useSimulationStore } from "@/components/SimulationProvider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { environmentVisualAlias, materialVisualAlias } from "@/lib/catalog";
import { useCatalogEnvironments, useCatalogMaterials } from "@/hooks/useCatalogSelectors";
import { environmentNames, isEnvironment, isMaterial, materialCatalog, type Parameters } from "@/lib/simulation";

export function Choice({ id, label, value, onChange, options, disabled = false }: {
  id: string; label: string; value?: string; onChange: (value: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return <div className="cc-field"><label htmlFor={id} id={`${id}-label`}>{label}</label><Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger id={id} aria-labelledby={`${id}-label`} className="cc-select"><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
    <SelectContent position="popper" align="start" sideOffset={4} collisionPadding={12} className="cc-menu">{options.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
  </Select></div>;
}

export function EnvironmentSelect({ id = "environment", compact = false, showIllustrative = true }: { id?: string; compact?: boolean; showIllustrative?: boolean }) {
  const environment = useSimulationStore((state) => state.environment);
  const custom = useSimulationStore((state) => state.custom);
  const catalogEnvironmentId = useSimulationStore((state) => state.catalogEnvironmentId);
  const setCatalogEnvironment = useSimulationStore((state) => state.setCatalogEnvironment);
  const setEnvironment = useSimulationStore((state) => state.setEnvironment);
  const setParameter = useSimulationStore((state) => state.setParameter);
  const oxygen = useSimulationStore((state) => state.oxygenLevel);
  const catalog = useCatalogEnvironments();
  const options = catalog.items.map((item) => ({ value: String(item.id), label: `${item.name} — ${item.type}` }));
  return <div className="cc-catalog-selector">
    <Choice id={`${id}-catalog`} label="Catalog environment" value={catalogEnvironmentId?.toString()} disabled={catalog.loading || catalog.items.length === 0} onChange={(value) => {
      const selected = catalog.items.find((item) => item.id === Number(value));
      if (selected) setCatalogEnvironment(selected.id, environmentVisualAlias(selected.code));
    }} options={options} />
    <CatalogState loading={catalog.loading} error={catalog.error} empty={!catalog.loading && !catalog.error && catalog.items.length === 0} retry={catalog.retry} emptyMessage="No active catalog environments are available." />
    <p className="cc-caption">Catalog ID is retained separately. A recognized code changes only the illustrative WebGL scenario; it does not set scientific analysis inputs.</p>
    {showIllustrative ? <Choice id={id} label={compact ? "Illustrative environment preset" : "Illustrative WebGL scenario"} value={custom ? "custom" : environment} onChange={(value) => { if (isEnvironment(value)) setEnvironment(value); else if (value === "custom") setParameter("oxygenLevel", oxygen); }} options={[...Object.entries(environmentNames).map(([value, label]) => ({ value, label })), { value: "custom", label: "Custom what-if" }]} /> : null}
  </div>;
}

export function MaterialSelect({ id = "material", showIllustrative = true }: { id?: string; showIllustrative?: boolean }) {
  const material = useSimulationStore((state) => state.selectedMaterial);
  const catalogMaterialId = useSimulationStore((state) => state.catalogMaterialId);
  const setCatalogMaterial = useSimulationStore((state) => state.setCatalogMaterial);
  const setMaterial = useSimulationStore((state) => state.setMaterial);
  const [search, setSearch] = useState("");
  const catalog = useCatalogMaterials(search);
  const options = catalog.items.map((item) => ({ value: String(item.id), label: item.category ? `${item.name} — ${item.category}` : item.name }));
  return <div className="cc-catalog-selector">
    <div className="cc-field"><label htmlFor={`${id}-search`}>Search catalog materials</label><input id={`${id}-search`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search curated materials" maxLength={100} /></div>
    <Choice id={`${id}-catalog`} label="Catalog material" value={catalogMaterialId?.toString()} disabled={catalog.loading || catalog.items.length === 0} onChange={(value) => {
      const selected = catalog.items.find((item) => item.id === Number(value));
      if (selected) setCatalogMaterial(selected.id, materialVisualAlias(selected.code));
    }} options={options} />
    <CatalogState loading={catalog.loading} error={catalog.error} empty={!catalog.loading && !catalog.error && catalog.items.length === 0} retry={catalog.retry} emptyMessage={search ? "No catalog materials match this search." : "No active catalog materials are available."} />
    {!catalog.loading && !catalog.error && catalog.hasMore ? <button type="button" className="button button-outline" onClick={catalog.loadMore}>Load more catalog materials</button> : null}
    <p className="cc-caption">Catalog IDs and categories come from the backend. Any mapped illustrative material remains a visual-only teaching scenario, not a property or safety claim.</p>
    {showIllustrative ? <Choice id={id} label="Illustrative material scenario" value={material} onChange={(value) => { if (isMaterial(value)) setMaterial(value); }} options={materialCatalog.map((item) => ({ value: item.id, label: item.name }))} /> : null}
  </div>;
}

function CatalogState({ loading, error, empty, retry, emptyMessage }: { loading: boolean; error: string | null; empty: boolean; retry: () => void; emptyMessage: string }) {
  if (loading) return <p className="cc-caption" role="status">Loading curated catalog…</p>;
  if (error) return <div className="cc-error" role="alert"><p>{error}</p><button type="button" className="button button-outline" onClick={retry}>Retry catalog request</button></div>;
  if (empty) return <div className="cc-empty" role="status"><p>{emptyMessage}</p><button type="button" className="button button-outline" onClick={retry}>Retry catalog request</button></div>;
  return null;
}

export function ParameterSlider({ parameter, label, min, max, step, unit, digits = 0 }: { parameter: keyof Parameters; label: string; min: number; max: number; step: number; unit: string; digits?: number }) {
  const value = useSimulationStore((state) => state[parameter]);
  const setParameter = useSimulationStore((state) => state.setParameter);
  return <div className="cc-field cc-slider-field"><div className="cc-field-heading"><label id={`${parameter}-label`}>{label}</label><output>{value.toFixed(digits)} <span>{unit}</span></output></div>
    <Slider aria-labelledby={`${parameter}-label`} min={min} max={max} step={step} value={[value]} onValueChange={([next]) => setParameter(parameter, next)} className="cc-slider" />
    <div className="cc-range"><span>{min} {unit}</span><span>{max} {unit}</span></div>
  </div>;
}
