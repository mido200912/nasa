"use client";

import { useId, useState } from "react";
import { MoveUpRight } from "lucide-react";
import { researchLinks } from "@/lib/environments";

function FlameIllustration({ microgravity }: { microgravity: boolean }) {
  const id = useId();
  return <svg className="flame-illustration" data-flame={microgravity ? "microgravity" : "earth"} viewBox="0 0 480 300" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-plume`} x1="0" y1="0" x2="0.2" y2="1">
        <stop stopColor="var(--color-flame-edge)" stopOpacity="0.12" />
        <stop offset="0.35" stopColor="var(--color-flame-edge)" stopOpacity="0.9" />
        <stop offset="0.76" stopColor="var(--color-flame-orange)" />
        <stop offset="1" stopColor="var(--color-flame-hot)" />
      </linearGradient>
      <linearGradient id={`${id}-core`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="var(--color-flame-hot)" stopOpacity="0.05" />
        <stop offset="0.55" stopColor="var(--color-flame-hot)" stopOpacity="0.9" />
        <stop offset="1" stopColor="var(--color-text)" />
      </linearGradient>
      <radialGradient id={`${id}-sphere`} cx="42%" cy="38%" r="62%">
        <stop stopColor="var(--color-flame-cool)" stopOpacity="0.48" />
        <stop offset="0.42" stopColor="var(--color-flame-blue)" stopOpacity="0.62" />
        <stop offset="0.78" stopColor="var(--color-flame-blue)" stopOpacity="0.4" />
        <stop offset="1" stopColor="var(--color-flame-blue)" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-halo`}>
        <stop stopColor="var(--color-flame-blue)" stopOpacity="0.14" />
        <stop offset="1" stopColor="var(--color-flame-blue)" stopOpacity="0" />
      </radialGradient>
      <marker id={`${id}-arrow`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path className="flame-arrowhead" d="M0 0 5 3 0 6" fill="none" strokeWidth="1.2" /></marker>
    </defs>
    {microgravity ? <>
      <circle cx="240" cy="147" r="102" fill={`url(#${id}-halo)`} />
      <circle cx="240" cy="147" r="73" fill={`url(#${id}-sphere)`} />
      <circle cx="240" cy="147" r="5" fill="var(--color-flame-hot)" />
      <circle cx="239" cy="146" r="2" fill="var(--color-text)" />
      <g className="flame-flow" markerEnd={`url(#${id}-arrow)`}>
        <path d="M96 147H157" /><path d="M384 147H323" />
        <path d="M240 24V64" /><path d="M240 270V230" />
      </g>
    </> : <>
      <path d="M239 239C207 239 194 216 204 190C214 163 222 129 239 106C250 91 252 74 249 49C270 83 265 111 276 137C288 165 287 183 276 206C268 225 256 238 245 239Z" fill={`url(#${id}-plume)`} />
      <path d="M242 237C218 233 215 217 225 195C233 177 240 155 245 133C250 157 266 179 264 200C262 221 254 234 246 238Z" fill={`url(#${id}-core)`} />
      <path d="M241 238C231 229 231 217 239 200C239 215 250 220 246 238Z" fill="var(--color-text)" fillOpacity="0.7" />
      <path d="M220 235Q240 226 260 235Q246 247 220 235Z" fill="var(--color-flame-blue)" fillOpacity="0.7" />
      <path d="M240 234V250" stroke="var(--color-body)" strokeWidth="3" strokeLinecap="round" />
      <path d="M226 251H254" stroke="var(--color-quiet)" strokeWidth="2" strokeLinecap="round" />
      <g className="flame-flow" markerEnd={`url(#${id}-arrow)`}>
        <path d="M156 232C133 202 143 164 162 132" />
        <path d="M324 232C347 202 337 164 318 132" />
      </g>
    </>}
  </svg>;
}

export function FireParadox() {
  const [microgravity, setMicrogravity] = useState(true);
  return <section className="paradox-section section-container" id="paradox">
    <div className="paradox-copy"><span className="section-label">The microgravity fire paradox</span><h2>Take away gravity.<br />The danger stays.</h2><p>On Earth, hot gases rise. In microgravity, they don’t. Oxygen reaches a flame by diffusion and ventilation, creating unfamiliar shapes—and unfamiliar risks.</p><p className="subtle-copy">A flame can be cooler, nearly invisible, and still sustain combustion. Fire safety needs a different frame of reference.</p><a className="text-link" href={researchLinks.Saffire} target="_blank" rel="noreferrer">Inside the Saffire experiments <MoveUpRight size={15} /></a>
      <div className="atmosphere-equation mono"><div><strong>30<span>%</span></strong><span>O₂ scenario</span></div><span className="equation-symbol">+</span><div><strong>10.2<span>psi</span></strong><span>Habitat pressure</span></div><span className="equation-symbol">→</span><div className="equation-result"><strong>+40<span>%*</span></strong><span>Ignitability</span></div></div>
      <p className="fine-print">*Illustrative figure supplied in the project brief, not a universal material property or verified experimental result.</p>
    </div>
    <div className="flame-comparison" data-gravity={microgravity ? "microgravity" : "earth"}>
      <div className="comparison-header"><span>Gravity changes the shape</span><span>Illustration</span></div>
      <div className="comparison-tabs" role="group" aria-label="Flame comparison"><button aria-pressed={!microgravity} onClick={() => setMicrogravity(false)}>Earth gravity<span>1.0 g</span></button><button aria-pressed={microgravity} onClick={() => setMicrogravity(true)}>Microgravity<span>~0 g</span></button></div>
      <div className={`flame-stage ${microgravity ? "is-microgravity" : "is-earth"}`} role="img" aria-label={microgravity ? "Conceptual spherical blue diffusion flame in microgravity" : "Conceptual upward orange flame under Earth gravity"}>
        <div className="flame-motion"><FlameIllustration microgravity={microgravity} /></div>
        <span className="flame-annotation">{microgravity ? "Oxygen moves inward" : "Hot gases move upward"}</span>
      </div>
      <div className="comparison-footer"><div><h3>{microgravity ? "Shaped by diffusion" : "Shaped by buoyancy"}</h3><p>{microgravity ? "In still air, oxygen diffuses inward around the fuel. Ventilation can distort this shape." : "Buoyancy draws hot gases upward and fresh air toward the fuel."}</p></div><div className="comparison-provenance"><span>Conceptual · not to scale</span><a href={researchLinks["BASS-II"]} target="_blank" rel="noreferrer">NASA research<MoveUpRight size={12} aria-hidden="true" /></a></div></div>
    </div>
  </section>;
}
