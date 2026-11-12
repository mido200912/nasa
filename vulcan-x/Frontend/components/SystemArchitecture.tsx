import { ArrowRight, ArrowUpRight, BookOpen, Box, Cpu, FileCheck2, Flame } from "lucide-react";

const engines = [
  { name: "RAG Knowledge", sub: "Research engine", description: "NASA PSI papers & experiment context", icon: BookOpen, status: "Planned integration" },
  { name: "Predictive Stress-Test", sub: "Scenario engine", description: "Atmospheric inputs & material scenarios", icon: Cpu, status: "Illustrative model" },
  { name: "3D Microgravity", sub: "Visual engine", description: "Interactive environments & flame concepts", icon: Box, status: "Interactive" },
  { name: "Earth Spinoff & Playbook", sub: "Outline generator", description: "Engineering translation & response outlines", icon: FileCheck2, status: "Scripted preview" },
];

export function SystemArchitecture() {
  return <><section className="architecture-section section-container" id="architecture"><div className="architecture-heading"><h2>Four engines. One mission.</h2><p>A connected vision for habitat fire intelligence.</p></div><div className="architecture-pipeline">{engines.map((engine, index) => <div className="pipeline-stage" key={engine.name}><div className="pipeline-stage-top"><span className="mono">0{index + 1}</span><engine.icon size={21} strokeWidth={1.2} /></div><h3>{engine.name}<span className="mono">{engine.sub}</span></h3><p>{engine.description}</p><span className="pipeline-status mono">{engine.status}</span>{index < engines.length - 1 && <ArrowRight className="pipeline-arrow" size={17} />}</div>)}</div><div className="architecture-note">Frontend demonstrator<span className="muted">/</span>No live RAG or certified predictive model connected</div></section>
      <footer className="site-footer section-container"><div className="footer-main"><a href="#mission-control" className="wordmark"><Flame size={23} /><span>VULCAN<span className="brand-x">-X</span></span></a><span className="footer-tagline">Safer beyond Earth. Smarter on it.</span><a className="text-link" href="https://psi.nasa.gov/" target="_blank" rel="noreferrer">Explore NASA PSI <ArrowUpRight size={14} /></a></div><div className="footer-fineprint"><p>Independent educational concept. Not affiliated with or endorsed by NASA. Research links provide context, not validation of demo outputs.</p><span className="mono">VULCAN-X / 2026</span></div><p className="asset-attribution">Optional texture maps: <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">Solar System Scope</a> · CC BY 4.0. Planets are rendered procedurally.</p></footer></>;
}
