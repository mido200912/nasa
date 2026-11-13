"use client";

import { useSimulationStore } from "@/components/SimulationProvider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { environmentNames, isEnvironment, isMaterial, materialCatalog, type Parameters } from "@/lib/simulation";

export function Choice({ id, label, value, onChange, options, disabled = false }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return <div className="cc-field"><label htmlFor={id} id={`${id}-label`}>{label}</label><Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger id={id} aria-labelledby={`${id}-label`} className="cc-select"><SelectValue /></SelectTrigger>
    <SelectContent position="popper" align="start" sideOffset={4} collisionPadding={12} className="cc-menu">{options.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
  </Select></div>;
}

export function EnvironmentSelect({ id = "environment", compact = false }: { id?: string; compact?: boolean }) {
  const environment = useSimulationStore((state) => state.environment);
  const custom = useSimulationStore((state) => state.custom);
  const setEnvironment = useSimulationStore((state) => state.setEnvironment);
  const setParameter = useSimulationStore((state) => state.setParameter);
  const oxygen = useSimulationStore((state) => state.oxygenLevel);
  return <Choice id={id} label={compact ? "Environment preset" : "Environment"} value={custom ? "custom" : environment} onChange={(value) => { if (isEnvironment(value)) setEnvironment(value); else if (value === "custom") setParameter("oxygenLevel", oxygen); }} options={[...Object.entries(environmentNames).map(([value, label]) => ({ value, label })), { value: "custom", label: "Custom what-if" }]} />;
}

export function MaterialSelect({ id = "material" }: { id?: string }) {
  const material = useSimulationStore((state) => state.selectedMaterial);
  const setMaterial = useSimulationStore((state) => state.setMaterial);
  return <Choice id={id} label="Test material" value={material} onChange={(value) => { if (isMaterial(value)) setMaterial(value); }} options={materialCatalog.map((item) => ({ value: item.id, label: item.name }))} />;
}

export function ParameterSlider({ parameter, label, min, max, step, unit, digits = 0 }: { parameter: keyof Parameters; label: string; min: number; max: number; step: number; unit: string; digits?: number }) {
  const value = useSimulationStore((state) => state[parameter]);
  const setParameter = useSimulationStore((state) => state.setParameter);
  return <div className="cc-field cc-slider-field"><div className="cc-field-heading"><label id={`${parameter}-label`}>{label}</label><output>{value.toFixed(digits)} <span>{unit}</span></output></div>
    <Slider aria-labelledby={`${parameter}-label`} min={min} max={max} step={step} value={[value]} onValueChange={([next]) => setParameter(parameter, next)} className="cc-slider" />
    <div className="cc-range"><span>{min} {unit}</span><span>{max} {unit}</span></div>
  </div>;
}
