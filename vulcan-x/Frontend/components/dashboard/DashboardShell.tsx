"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowLeft, BookOpen, FlaskConical, Flame, Globe2, Menu, X } from "lucide-react";
import { useSimulationStore } from "@/components/SimulationProvider";
import { environmentNames } from "@/lib/simulation";

const modules = [
  { href: "/dashboard", name: "Stress-test", description: "Atmosphere & materials", icon: Activity },
  { href: "/dashboard/playbook", name: "Safety playbook", description: "Research & review", icon: BookOpen },
  { href: "/dashboard/earth-bridge", name: "Earth bridge", description: "Research translation", icon: Globe2 },
  { href: "/dashboard/materials", name: "Material matrix", description: "Compare & investigate", icon: FlaskConical },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const environment = useSimulationStore((state) => state.environment);
  const oxygen = useSimulationStore((state) => state.oxygenLevel);
  const pressure = useSimulationStore((state) => state.pressurePsi);
  const gravity = useSimulationStore((state) => state.gravityG);
  const custom = useSimulationStore((state) => state.custom);
  return <div className="command-center">
    <aside className="cc-sidebar" aria-label="Command center navigation">
      <div className="cc-sidebar-top"><Link href="/" className="wordmark"><Flame size={25} aria-hidden="true" />VULCAN<span className="brand-x">-X</span></Link><button className="icon-button cc-menu-button" aria-label={navigationOpen ? "Close module navigation" : "Open module navigation"} aria-expanded={navigationOpen} aria-controls="module-navigation" onClick={() => setNavigationOpen(!navigationOpen)}>{navigationOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
      <span className="cc-sidebar-caption">Command center</span>
      <nav id="module-navigation" className="cc-module-nav" data-open={navigationOpen} aria-label="Simulation modules">{modules.map((item) => <Link href={item.href} key={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setNavigationOpen(false)}><item.icon size={19} aria-hidden="true" /><span>{item.name}<small>{item.description}</small></span></Link>)}</nav>
      <div className="cc-sidebar-bottom"><p>Research into readiness.<br />Never a substitute for validation.</p><Link className="text-link" href="/"><ArrowLeft size={15} aria-hidden="true" />Planetary explorer</Link><span className="cc-caption">Independent educational demonstrator</span></div>
    </aside>
    <div className="cc-workspace"><header className="cc-telemetry"><div><span className="cc-caption">Active scenario{custom ? " / custom" : ""}</span><strong>{environmentNames[environment]}</strong></div><dl><div><dt>O₂</dt><dd>{oxygen}%</dd></div><div><dt>Pressure</dt><dd>{pressure.toFixed(1)} <span>psi</span></dd></div><div><dt>Gravity</dt><dd>{gravity.toFixed(2)} <span>g</span></dd></div></dl><span className="cc-engine-status">Knowledge engine <strong>Local preview</strong></span></header>
      <main id="main-content" className="cc-main"><div className="cc-notice"><span>Illustrative workspace</span><p>Not a validated prediction or emergency-response tool. Research links are reading context, not live retrieval.</p></div>{children}</main>
      <footer className="cc-footer"><span>VULCAN-X / Research demonstrator</span><a href="https://www.nasa.gov/psi/" target="_blank" rel="noreferrer">Explore NASA PSI ↗</a></footer>
    </div>
  </div>;
}
