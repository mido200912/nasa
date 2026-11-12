"use client";

import { Component, useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PlanetInformation, SolarSystemScene } from "@/components/canvas/SolarSystemScene";
import { frameSolarCamera } from "@/lib/solar-framing";
import { useCompactViewport } from "@/components/canvas/useCompactViewport";
import { solarPlanets, type SolarPlanet } from "@/lib/solar-system";

interface OrbitProps {
  onSelect: (index: number) => void;
  visible: boolean;
  paused: boolean;
  reducedMotion: boolean;
  selectedPlanet: string;
  onInspect: (id: string) => void;
}
interface OrbitMotion { current: number; target: number }

function requireWebGL2(canvas: HTMLCanvasElement | null) {
  // Check the actual R3F canvas, not a second probe canvas/context. Throwing in
  // the ref's layout phase lets React catch failure before R3F's async configure.
  if (canvas && !canvas.getContext("webgl2", { antialias: true, powerPreference: "high-performance" })) {
    throw new Error("WebGL 2 is unavailable on this device.");
  }
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function SceneFallback({ planet, onInspect }: { planet: SolarPlanet; onInspect: (id: string) => void }) {
  return <div className="scene-fallback"><div className="fallback-planet" /><p role="status">3D view unavailable.<br />Choose a planet to explore its reference data.</p><div className="fallback-planets" role="group" aria-label="Planet reference data">{solarPlanets.map((item) => <button key={item.id} className="solar-orbit-label" aria-label={`Focus ${item.name} in explorer`} aria-pressed={item.id === planet.id} onClick={() => onInspect(item.id)}>{item.name}</button>)}</div><PlanetInformation planet={planet} /></div>;
}

function SceneCamera() {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const mobile = useCompactViewport();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      frameSolarCamera(camera, size.width, size.height, mobile);
    }
    camera.updateMatrixWorld();
    invalidate();
  }, [camera, invalidate, mobile, size.width, size.height]);
  return null;
}

export default function OrbitalSystem(props: OrbitProps) {
  const planet = solarPlanets.find((item) => item.id === props.selectedPlanet) ?? solarPlanets[2];
  const motion = useRef<OrbitMotion>({ current: 0, target: 0 });
  const drag = useRef<{ x: number; start: number; moved: boolean; pointer: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const canvasInvalidate = useRef<(() => void) | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const mobile = useCompactViewport();
  const [scrolling, setScrolling] = useState(false);
  const [sceneVisible, setSceneVisible] = useState(true);
  const renderActive = props.visible && sceneVisible && !scrolling && !props.paused && !props.reducedMotion;
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setSceneVisible(entry.isIntersecting);
      if (entry.isIntersecting) canvasInvalidate.current?.();
    }, { rootMargin: "40px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let idle: ReturnType<typeof setTimeout> | undefined;
    let inGesture = false;
    const onScroll = () => {
      // Two state changes per gesture, not per scroll frame. Let the browser
      // composite the existing canvas while the document moves.
      if (!inGesture) { inGesture = true; setScrolling(true); }
      clearTimeout(idle);
      idle = setTimeout(() => { inGesture = false; setScrolling(false); }, 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(idle); window.removeEventListener("scroll", onScroll); };
  }, []);
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest("button"))) return;
    drag.current = { x: event.clientX, start: event.clientX, moved: false, pointer: event.pointerId };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const session = drag.current;
    if (!session || session.pointer !== event.pointerId) return;
    if (Math.abs(event.clientX - session.start) > 8) {
      session.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (session.moved) {
      motion.current.target += (event.clientX - session.x) * 0.008;
      canvasInvalidate.current?.();
    }
    session.x = event.clientX;
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const session = drag.current;
    if (!session || session.pointer !== event.pointerId) return;
    if (session.moved) {
      const selected = Math.max(0, solarPlanets.findIndex((planet) => planet.id === props.selectedPlanet));
      const direction = event.clientX < session.start ? 1 : -1;
      props.onInspect(solarPlanets[(selected + direction + solarPlanets.length) % solarPlanets.length].id);
    }
    motion.current.target = 0;
    canvasInvalidate.current?.();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
    setDragging(false);
  }
  return <div ref={container} className={`orbital-canvas ${dragging ? "is-dragging" : ""}`} data-rendering={renderActive ? "active" : "on-demand"}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
    <SceneBoundary fallback={<SceneFallback planet={planet} onInspect={props.onInspect} />}>
      <Canvas ref={requireWebGL2} role="group" aria-label="Planetary explorer; swipe or select a planet to focus" resize={{ scroll: false, offsetSize: true }} dpr={[1, mobile ? 1 : 1.5]} gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 3.8, 13.5], fov: 43, near: 0.1, far: 60 }}
        frameloop={renderActive ? "always" : "demand"}
        fallback={<SceneFallback planet={planet} onInspect={props.onInspect} />}
        onCreated={({ camera, invalidate, gl }) => { camera.lookAt(0, 0, 0); canvasInvalidate.current = invalidate; gl.setClearAlpha(0); }}>
        <SceneCamera />
        <SolarSystemScene motion={motion} paused={props.paused} reducedMotion={props.reducedMotion} selectedPlanet={props.selectedPlanet} onInspect={props.onInspect} onSelectHabitat={props.onSelect} />
      </Canvas>
    </SceneBoundary>
  </div>;
}
