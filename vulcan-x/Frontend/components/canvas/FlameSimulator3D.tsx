"use client";

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { useCompactViewport } from "@/components/canvas/useCompactViewport";
import { getFlameResponse, type FlameResponse } from "@/lib/flame-response";
import { materialCatalog, type SimulationInput } from "@/lib/simulation";
import { useSimulationStore } from "@/components/SimulationProvider";
import { buildStressTestResult, chamberLift } from "@/lib/stress-test";
import { ChamberParticles, HabitatChamber, flamePower, type ChamberProps } from "@/components/canvas/HabitatChamber";

const vertexShader = `
uniform float uLift;
uniform float uSize;
uniform float uStretch;
uniform float uWidth;
uniform float uDistortion;
uniform float uPower;
uniform float uTime;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vView;
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
float noise(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
void main() {
  vec3 p=position;
  float height=clamp((p.y+0.82)/1.64,0.0,1.0);
  float turbulence=noise(p*4.0-vec3(0,uTime*0.5,0));
  p *= 1.0 + (turbulence-0.5)*uDistortion;
  float taper=mix(1.0,1.0-height*0.82,uLift);
  p.xz*=taper*uWidth;
  p.y=(p.y+0.82)*uStretch-0.82;
  p*=uSize;
  p.x+=sin(height*5.0-uTime)*height*height*uDistortion*uLift;
  p.y+=height*height*(turbulence-0.5)*uDistortion*uLift*2.0;
  p*=uPower;
  vLocal=position;
  vec4 view=modelViewMatrix*vec4(p,1.0);
  vNormal=normalize(normalMatrix*normal);
  vView=-view.xyz;
  gl_Position=projectionMatrix*view;
}`;
const fragmentShader = `
uniform float uLift;
uniform float uBrightness;
uniform float uOpacity;
uniform float uPower;
uniform float uCoreRadius;
uniform float uTime;
uniform vec3 uCool;
uniform vec3 uBlue;
uniform vec3 uWarm;
uniform vec3 uHot;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float buoyancy=uLift;
  float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),1.5);
  float band=0.5+0.5*sin(vLocal.y*9.0+sin(vLocal.x*6.0+uTime)*0.6-uTime*0.7);
  float core=pow(max(0.0,1.0-rim),mix(7.0,1.2,uCoreRadius));
  vec3 cool=mix(mix(uBlue,uCool,rim),mix(uWarm,uHot,band),core*0.9);
  vec3 warm=mix(uHot,uWarm,smoothstep(-0.7,0.6,vLocal.y));
  vec3 color=mix(cool,warm,buoyancy);
  color*=(0.85+band*0.15)*uBrightness*uPower;
  float alpha=min(0.98,uOpacity+rim*0.18)*uPower;
  gl_FragColor=vec4(color,alpha);
}`;

function FlameMesh({ response, chamber, onReady }: { response: FlameResponse; chamber: ChamberProps; onReady: () => void }) {
  const invalidate = useThree((state) => state.invalidate);
  const elapsed = useRef(0);
  const rendered = useRef(false);
  const material = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    return { uLift: { value: 0 }, uSize: { value: 1 }, uStretch: { value: 1 }, uWidth: { value: 1 }, uBrightness: { value: 1 }, uOpacity: { value: 0.8 }, uDistortion: { value: 0.08 }, uTime: { value: 0 }, uPower: { value: 1 }, uCoreRadius: { value: 0.5 }, uCool: { value: new THREE.Color(styles.getPropertyValue("--color-flame-cool").trim()) }, uBlue: { value: new THREE.Color(styles.getPropertyValue("--color-flame-blue").trim()) }, uWarm: { value: new THREE.Color(styles.getPropertyValue("--color-flame-orange").trim()) }, uHot: { value: new THREE.Color(styles.getPropertyValue("--color-flame-hot").trim()) } };
  }, []);
  useEffect(() => {
    if (!material.current) return;
    const live = material.current.uniforms;
    const lift = chamberLift(chamber.gravity);
    live.uLift.value = lift;
    live.uSize.value = THREE.MathUtils.clamp(chamber.result.flameParams.coreRadius / 1.2, 0.4, 1.22);
    live.uStretch.value = Math.min(1 + lift * 0.9, 3.05 / (1.64 * live.uSize.value));
    live.uWidth.value = 1 - lift * 0.38;
    live.uBrightness.value = response.brightness;
    live.uOpacity.value = response.opacity;
    live.uDistortion.value = response.distortion;
    live.uCool.value.set(chamber.result.flameParams.outerPlasmaColor);
    live.uWarm.value.set(chamber.result.flameParams.coreColor);
    live.uCoreRadius.value = THREE.MathUtils.clamp((chamber.result.burnRateMultiplier - 0.2) / 6.5, 0.05, 0.9);
    invalidate();
  }, [response, chamber.gravity, chamber.result, invalidate]);
  useFrame((_, delta) => {
    if (!material.current) return;
    if (chamber.moving) elapsed.current += Math.min(delta, 0.05) * response.speed;
    material.current.uniforms.uTime.value = elapsed.current;
    const power = flamePower(chamber);
    material.current.uniforms.uPower.value = THREE.MathUtils.lerp(material.current.uniforms.uPower.value, power, chamber.moving ? 1 - Math.exp(-delta * 12) : 1);
    // Keep the flame seated above the material platform across size changes.
    if (mesh.current) mesh.current.position.y = -0.99 + 0.82 * material.current.uniforms.uSize.value * power;
  });
  return <mesh ref={mesh} visible={!chamber.extinguished} onAfterRender={() => { if (!rendered.current) { rendered.current = true; onReady(); } }}><sphereGeometry args={[0.82, 56, 40]} /><shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} transparent depthWrite={false} /></mesh>;
}

class FlameBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function requireWebGL(canvas: HTMLCanvasElement | null) {
  if (canvas && !canvas.getContext("webgl2", { antialias: true, powerPreference: "high-performance" })) throw new Error("WebGL unavailable");
}
function FlameFallback({ response, chamber }: { response: FlameResponse; chamber: ChamberProps }) {
  const lift = chamberLift(chamber.gravity);
  const scaleX = response.size * (1 - lift * 0.25);
  const scaleY = response.size * (1 + lift * 0.1);
  const sphere = lift < 0.5;
  return <div className="cc-flame-fallback"><svg viewBox="0 0 200 280" role="img" aria-label={chamber.extinguished ? "Illustrative sample extinguished" : sphere ? "Conceptual spherical diffusion envelope" : "Conceptual upward flame plume"}><g transform={`translate(100 140) scale(${scaleX} ${scaleY}) translate(-100 -120)`} opacity={chamber.extinguished ? 0 : chamber.isSuppressing ? response.opacity * 0.3 : response.opacity} style={{ filter: `brightness(${response.brightness})` }}>{sphere ? <><circle cx="100" cy="118" r="62" fill="var(--color-flame-blue)" /><circle cx="100" cy="118" r="38" fill="var(--color-flame-cool)" /></> : <><path d="M100 24C98 80 45 112 54 170C62 225 151 219 151 166C153 122 115 110 100 24Z" fill="var(--color-flame-orange)" /><path d="M100 104C92 142 76 157 80 181C86 211 127 205 126 179C124 152 106 139 100 104Z" fill="var(--color-flame-hot)" /></>}</g>{chamber.isSuppressing && <path d="M35 20L85 180M75 20L95 180M125 20L105 180M165 20L115 180" stroke="var(--color-flame-cool)" strokeWidth="5" strokeDasharray="2 8" />}</svg><span>3D unavailable · accessible illustration</span></div>;
}

export default function FlameSimulator3D({ input }: { input: SimulationInput }) {
  const response = useMemo(() => getFlameResponse(input), [input]);
  const result = useSimulationStore((state) => state.stressTestResult);
  const environment = useSimulationStore((state) => state.environment);
  const isSuppressing = useSimulationStore((state) => state.isSuppressing);
  const extinguished = useSimulationStore((state) => state.flameExtinguished);
  const startedAt = useSimulationStore((state) => state.suppressionStartedAt);
  const duration = useSimulationStore((state) => state.suppressionDurationSeconds);
  const liveResult = useMemo(() => result ?? buildStressTestResult({ ...input, environment, materialId: input.selectedMaterial }), [result, input, environment]);
  const container = useRef<HTMLDivElement>(null);
  const requestFrame = useRef<(() => void) | null>(null);
  const [active, setActive] = useState(true);
  const [scrolling, setScrolling] = useState(false);
  const reduced = useReducedMotion();
  const compact = useCompactViewport();
  useEffect(() => {
    if (!container.current) return;
    let intersecting = true;
    const update = () => { setActive(intersecting && !document.hidden); if (intersecting && !document.hidden) requestFrame.current?.(); };
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; update(); });
    observer.observe(container.current);
    document.addEventListener("visibilitychange", update);
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => { setScrolling(true); clearTimeout(timeout); timeout = setTimeout(() => setScrolling(false), 160); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); window.removeEventListener("scroll", onScroll); clearTimeout(timeout); };
  }, []);
  const moving = active && !scrolling && !reduced;
  useEffect(() => {
    requestFrame.current?.();
    // Demand-render sparse progress frames; never resume ambient animation in
    // reduced motion, offscreen, background, or scroll-suspended states.
    if (!isSuppressing || !active || scrolling || moving) return;
    const timer = setInterval(() => requestFrame.current?.(), 100);
    return () => clearInterval(timer);
  }, [isSuppressing, extinguished, active, scrolling, moving]);
  const chamber = { result: liveResult, gravity: input.gravityG, moving, isSuppressing, extinguished, startedAt, duration };
  const fallback = <FlameFallback chamber={chamber} response={response} />;
  const materialName = materialCatalog.find((item) => item.id === input.selectedMaterial)?.name ?? "Selected material";
  return <div ref={container} className="cc-flame-viewport" data-rendering={moving ? "active" : "on-demand"} data-suppression={extinguished ? "extinguished" : isSuppressing ? "discharging" : "standby"}>
    <FlameBoundary fallback={fallback}><Canvas ref={requireWebGL} aria-label={`Conceptual combustion visualization: ${input.oxygenLevel}% oxygen, ${input.pressurePsi.toFixed(1)} psi, ${input.gravityG.toFixed(2)} g, ${materialName}${extinguished ? ", sample extinguished" : ""}`} role="img" dpr={[1, compact ? 1 : 1.5]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ position: [0, 1.35, 7.8], fov: 46 }} frameloop={moving ? "always" : "demand"} resize={{ scroll: false }} fallback={fallback} onCreated={({ gl, invalidate, camera }) => { gl.setClearAlpha(0); camera.lookAt(0, 0.2, 0); requestFrame.current = invalidate; }}><HabitatChamber {...chamber} /><FlameMesh response={response} chamber={chamber} onReady={() => { if (container.current) container.current.dataset.ready = "true"; }} /><ChamberParticles {...chamber} /><ChamberParticles {...chamber} mist /></Canvas></FlameBoundary>
  </div>;
}
