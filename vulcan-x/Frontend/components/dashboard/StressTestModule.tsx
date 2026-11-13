"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { ArrowUpRight, Droplets, Flame, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useSimulationStore } from "@/components/SimulationProvider";
import { EnvironmentSelect, MaterialSelect, ParameterSlider } from "@/components/dashboard/Controls";
import { HabitatAnalysisPanel } from "@/components/dashboard/HabitatAnalysisPanel";
import { calculateSimulation, materialCatalog } from "@/lib/simulation";
import { chamberLift } from "@/lib/stress-test";
import styles from "./StressTestModule.module.css";

const FlameSimulator3D = dynamic(() => import("@/components/canvas/FlameSimulator3D"), { ssr: false, loading: () => <div className="cc-viewport-loading" role="status">Preparing combustion illustration…</div> });
const TelemetryCharts = dynamic(() => import("@/components/dashboard/TelemetryCharts"), { ssr: false, loading: () => <div className="cc-loading-block" role="status">Preparing charts…</div> });

export function StressTestModule() {
  const oxygenLevel = useSimulationStore((state) => state.oxygenLevel);
  const pressurePsi = useSimulationStore((state) => state.pressurePsi);
  const gravityG = useSimulationStore((state) => state.gravityG);
  const selectedMaterial = useSimulationStore((state) => state.selectedMaterial);
  const reset = useSimulationStore((state) => state.reset);
  const environment = useSimulationStore((state) => state.environment);
  const result = useSimulationStore((state) => state.stressTestResult);
  const loading = useSimulationStore((state) => state.isLoadingStressTest);
  const error = useSimulationStore((state) => state.stressTestError);
  const isSuppressing = useSimulationStore((state) => state.isSuppressing);
  const extinguished = useSimulationStore((state) => state.flameExtinguished);
  const deploy = useSimulationStore((state) => state.triggerSuppression);
  const resetIgnition = useSimulationStore((state) => state.resetIgnition);
  const runStressTest = useSimulationStore((state) => state.runStressTest);
  const cancelStressTest = useSimulationStore((state) => state.cancelStressTest);
  useEffect(() => {
    const timer = setTimeout(() => { void runStressTest(); }, 300);
    return () => { clearTimeout(timer); cancelStressTest(); };
  }, [environment, oxygenLevel, pressurePsi, gravityG, selectedMaterial, runStressTest, cancelStressTest]);
  useEffect(() => () => { resetIgnition(); }, [resetIgnition]);
  const input = { oxygenLevel, pressurePsi, gravityG, selectedMaterial };
  const metrics = calculateSimulation(input);
  const material = materialCatalog.find((item) => item.id === selectedMaterial)!;
  return <>
    <div className="cc-page-heading"><div><h1>Habitat stress-test</h1><p>Change the atmosphere. Explore how the questions change.</p></div><button className="button button-outline" onClick={reset}><RotateCcw size={15} aria-hidden="true" />Reset scenario</button></div>
    <div className="cc-simulator-grid"><section className="cc-panel cc-parameters" aria-label="Simulation parameters"><div className="cc-panel-heading"><h2>Scenario inputs</h2><span className="cc-caption">What-if controls</span></div><EnvironmentSelect /><ParameterSlider parameter="oxygenLevel" label="Oxygen concentration" min={15} max={40} step={1} unit="%" /><ParameterSlider parameter="pressurePsi" label="Cabin pressure" min={5} max={14.7} step={0.1} unit="psi" digits={1} /><ParameterSlider parameter="gravityG" label="Gravity" min={0} max={1} step={0.01} unit="g" digits={2} /><MaterialSelect /><p className="cc-caption">Reading context: {material.context}. Not a matched test record for this material grade.</p></section>
      <section className={`cc-panel cc-visual-panel ${styles.chamberPanel}`}><div className="cc-panel-heading"><h2>Combustion morphology</h2><span className="cc-caption">3D habitat chamber · illustrative</span></div>
        <div className={styles.hud} aria-label="Habitat chamber status">
          <span className={styles.pill} data-testid="chamber-morphology"><span>Flame morphology</span>{chamberLift(gravityG) < 0.5 ? "Spherical Cool Plasma" : "Buoyant Teardrop"}</span>
          <span className={styles.pill} data-testid="nozzle-status" role="status"><span>Nozzle status</span>{extinguished ? "EXTINGUISHED" : isSuppressing ? `DISCHARGING ${result?.suppressionSpec.dropletMicrons ?? 50}µm MIST` : "STANDBY"}</span>
          <span className={styles.pill} data-testid="stress-test-sync" role="status"><span>API sync</span>{loading ? "Syncing…" : error ? "Unavailable · local preview" : result ? "Synced · unvalidated" : "Pending · local preview"}</span>
        </div>
        <FlameSimulator3D input={input} />
        <div className={styles.actions}>{extinguished ? <button className="button" onClick={resetIgnition}><Flame size={18} aria-hidden="true" />Re-Ignite Test Sample</button> : <button className="button" disabled={isSuppressing} onClick={deploy}><Droplets size={18} aria-hidden="true" />{isSuppressing ? "Mist suppression in progress…" : "Deploy Fine-Water-Mist Suppression"}</button>}<p className="cc-caption">Simulated discharge only. Droplet size and extinguishment time are animation settings, not equipment guidance.</p></div>
        {error && <div className={styles.error} role="alert"><p>{error}</p><button className="button button-outline" onClick={() => { void runStressTest(); }}>Retry API sync</button></div>}
        <div className="cc-morphology"><strong>{chamberLift(gravityG) < 0.5 ? "Spherical cool diffusion" : metrics.flameMorphology}</strong><p className="cc-flame-response">{oxygenLevel}% O₂ · {pressurePsi.toFixed(1)} psi · {gravityG.toFixed(2)} g<br />{material.name}</p><p className="cc-caption">All four inputs visibly change this illustration. Size, brightness, shape, and motion are exaggerated teaching cues—not calibrated predictions or evidence that a material will ignite.</p><p className="cc-caption">Conceptual, not to scale. Forced ventilation can distort microgravity flames; low gravity does not imply a cool flame in every case.</p>{result && <p className="cc-caption">API scenario index: {result.riskScore} / 100 · {result.riskLevel} (synthetic). Reading context: {result.nasaReference}. Not validation of this model.</p>}</div></section>
      <section className="cc-panel cc-risk-panel" aria-label="Illustrative risk matrix"><div className="cc-panel-heading"><h2>Instant risk matrix</h2><span className="cc-caption">Unvalidated demo</span></div><div className="cc-score"><span>Scenario index</span><strong data-testid="dashboard-risk-score">{metrics.ignitabilityRiskScore}<small> / 100</small></strong><span>{metrics.riskLabel}</span></div><div className="cc-score-track" aria-hidden="true"><span style={{ transform: `scaleX(${metrics.ignitabilityRiskScore / 100})` }} /></div>
        <dl className="cc-facts"><div><dt>Burn-rate multiplier</dt><dd data-testid="burn-multiplier">{metrics.burnRateMultiplier.toFixed(1)}× <small>Earth reference</small></dd></div><div><dt>Ignition delay*</dt><dd>{metrics.ignitionDelaySeconds} <small>s / synthetic</small></dd></div><div><dt>Toxicity index*</dt><dd>{metrics.toxicityIndex} <small>/ 100</small></dd></div></dl><p className="cc-caption">*Teaching values only. No material-specific ignition or toxicology data is loaded.</p><Link className="text-link" href="/dashboard/playbook">Review a playbook<ArrowUpRight size={15} aria-hidden="true" /></Link>
      </section></div>
    <HabitatAnalysisPanel />
    <TelemetryCharts input={input} />
    <details className="cc-methodology"><summary>Model assumptions & limitations</summary><p>This interface uses a transparent, synthetic heuristic—not NASA BASS-II, Saffire, or FLEX empirical curves. The 3.5× lunar burn-rate example comes from the project brief, not validated measurements. Oxygen and pressure change demonstration weights; material profiles are synthetic. Gravity controls the illustration, not a physically calibrated spread law. No scenario is certified safe.</p><p>Engineering use requires grade-specific experimental data, documented operating conditions, uncertainty analysis, and independent validation.</p></details>
  </>;
}
