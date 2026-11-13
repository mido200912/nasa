"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSimulationStore } from "@/components/SimulationProvider";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, ChevronDown, Crosshair } from "lucide-react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { environments, researchLinks } from "@/lib/environments";
import { solarPlanets } from "@/lib/solar-system";
import { getPlanetMetrics, PLANET_FACT_NOTES, planetProfiles } from "@/lib/planet-profiles";

const OrbitalSystem = dynamic(() => import("@/components/canvas/OrbitalSystem"), {
  ssr: false,
  loading: () => <div className="scene-loading" role="status"><Crosshair size={28} /><span>INITIALIZING ORBITAL VIEW</span></div>,
});

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function CommandHero() {
  const environmentId = useSimulationStore((state) => state.environment);
  const setEnvironment = useSimulationStore((state) => state.setEnvironment);
  const activeIndex = environments.findIndex((item) => item.id === environmentId);
  const [visible, setVisible] = useState(true);
  const selectedPlanet = useSimulationStore((state) => state.focusedPlanet);
  const selectPlanet = useSimulationStore((state) => state.inspectPlanet);
  const [cardMode, setCardMode] = useState<"planet" | "habitat">("planet");
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const hero = useRef<HTMLElement>(null);
  const environment = environments[activeIndex];
  const inspectedPlanet = solarPlanets.find((planet) => planet.id === selectedPlanet) ?? solarPlanets[2];
  const profile = planetProfiles[inspectedPlanet.id];
  const card = cardMode === "planet" ? {
    id: `planet-${inspectedPlanet.id}`, name: inspectedPlanet.name,
    number: solarPlanets.indexOf(inspectedPlanet) + 1, heading: "Planetary dossier",
    context: "Reference values, not live telemetry.", designation: inspectedPlanet.type,
    status: profile.status, metrics: getPlanetMetrics(profile), note: profile.note, footnote: profile.footnote,
    sources: [{ label: "NASA facts", href: profile.source }, { label: "Data notes", href: PLANET_FACT_NOTES }],
  } : {
    ...environment, id: `habitat-${environment.id}`, number: activeIndex + 1, heading: "Habitat scenario",
    context: "Sealed-habitat scenario, not planetary conditions.",
    sources: environment.sources.map((source) => ({ label: source, href: researchLinks[source] })),
  };

  function selectEnvironment(index: number) {
    setCardMode("habitat");
    setEnvironment(environments[index].id);
  }
  function inspectPlanet(id: string) {
    setCardMode("planet");
    selectPlanet(id);
  }

  useEffect(() => {
    const element = hero.current;
    if (!element) return;
    let intersecting = true;
    const updateVisibility = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; updateVisibility(); }, { threshold: 0 });
    observer.observe(element);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", updateVisibility); };
  }, []);

  return <section ref={hero} className="command-hero" id="mission-control" data-view="solar" aria-label="Interactive planetary explorer">
    <header className="navbar">
      <a href="#mission-control" className="wordmark"><BrandWordmark /><span className="brand-divider" /><span className="brand-sub">NASA PSI<br />Research explorer</span></a>
      <div className="nav-right"><span className="engine-status">RAG engine <span className="muted">/ Preview</span></span><Link className="button button-small" href="/dashboard">Launch simulator <ArrowUpRight size={15} /></Link></div>
    </header>

    <div className="hero-intro"><h1><span className="hero-title-line">Different worlds.</span><br /><span className="hero-title-line">Different <span>fire rules.</span></span></h1><p>Stress-test the next frontier.<br /> Explore combustion beyond Earth.</p><a href="#paradox" className="text-link science-button"><span>Explore the science</span><span className="science-button-icon" aria-hidden="true"><ArrowDown size={17} strokeWidth={1.75} /></span></a></div>

    <OrbitalSystem onSelect={selectEnvironment} visible={visible} paused={false} reducedMotion={reducedMotion} selectedPlanet={selectedPlanet} onInspect={inspectPlanet} />

    <div className="telemetry-position" aria-live="polite"><AnimatePresence mode="wait" initial={false}><motion.aside key={card.id} className="telemetry-panel" data-mode={cardMode} aria-label={cardMode === "planet" ? `${card.name} planetary profile` : `${card.name} telemetry`}
      initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
      <header className="dossier-header">
        <div className="telemetry-heading"><span>{card.heading}</span><span className="dossier-index mono">{String(card.number).padStart(2, "0")} <span aria-hidden="true">/</span> {cardMode === "planet" ? "08" : "04"}</span></div>
        <div className="telemetry-title"><h2>{card.name}</h2></div>
        <p className="telemetry-designation">{card.designation.toLowerCase()}</p>
        <p className="telemetry-status">{card.status.charAt(0) + card.status.slice(1).toLowerCase()}</p>
      </header>
      <dl className="metric-grid">{card.metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}<span>{metric.unit}</span></dd></div>)}</dl>
      <section className="dossier-environment" aria-label="Environment notes"><h3>Environment</h3><p className="telemetry-note">{card.note}</p></section>
      <footer className="dossier-footer">
        <p className="telemetry-context">{card.context}</p>
        <div className="telemetry-sources">{card.sources.map((source) => <a key={source.label} href={source.href} target="_blank" rel="noreferrer">{source.label}<ArrowUpRight size={13} aria-hidden="true" /></a>)}</div>
        <details className="dossier-notes"><summary>Reading these values<ChevronDown size={13} aria-hidden="true" /></summary><p className="telemetry-disclaimer">{card.footnote}</p></details>
      </footer>
    </motion.aside></AnimatePresence></div>

    <div className="hero-bottom"><span>Procedural rendering <span className="muted">/ No textures required</span></span><a href="#paradox">Scroll to discover <ArrowDown size={12} /></a><span className="hero-bottom-coordinate">{environment.coordinates}</span></div>
    <span className="sr-only" role="status">{cardMode === "planet" ? `Selected planet: ${inspectedPlanet.name}` : `Selected environment: ${environment.name}`}</span>
  </section>;
}
