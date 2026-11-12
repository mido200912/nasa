"use client";

/* eslint-disable react-hooks/immutability -- Three.js animation uses mutable uniforms and shared frame refs, not React state. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei/web/Html";
import { Line } from "@react-three/drei/core/Line";
import * as THREE from "three";
import { getExplorerPath, getExplorerTransform, solarPlanets, type SolarPlanet } from "@/lib/solar-system";
import { useCompactViewport } from "@/components/canvas/useCompactViewport";
import { atmosphereFragmentShader, planetFragmentShader, planetVertexShader, saturnRingFragmentShader, saturnRingVertexShader } from "@/lib/planet-shaders";

interface SolarSceneProps {
  motion: React.RefObject<{ current: number; target: number }>;
  paused: boolean;
  reducedMotion: boolean;
  selectedPlanet: string;
  onInspect: (id: string) => void;
  onSelectHabitat: (index: number) => void;
}

export function PlanetInformation({ planet }: { planet: SolarPlanet }) {
  return <section className="solar-body-info" aria-label="Solar body information" aria-live="polite"><div><strong>{planet.name}</strong><span className="mono">{planet.type}</span></div><p>{planet.detail}</p></section>;
}

function SolarPlanetMesh({ planet, index, mobile, selectedIndex, onInspect, onSelectHabitat, paused, reducedMotion }: {
  planet: SolarPlanet; index: number; mobile: boolean; selectedIndex: number;
  onInspect: SolarSceneProps["onInspect"]; onSelectHabitat: SolarSceneProps["onSelectHabitat"];
  paused: boolean; reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const sphere = useRef<THREE.Mesh>(null);
  const selected = index === selectedIndex;
  const target = getExplorerTransform(index, selectedIndex, mobile);
  // Stable mount pose: subsequent selections interpolate the Three.js objects.
  const [initial] = useState(() => target);
  const progress = useRef(((index - selectedIndex + solarPlanets.length) % solarPlanets.length) / solarPlanets.length);
  const radius = planet.radius;
  const invalidate = useThree((state) => state.invalidate);
  const uniforms = useMemo(() => ({ uKind: { value: planet.shaderKind }, uBrightness: { value: initial.brightness }, uRim: { value: new THREE.Color(planet.rim) }, uSolarLighting: { value: 0 }, uSunPosition: { value: new THREE.Vector3() } }), [planet, initial.brightness]);
  useEffect(() => { invalidate(); }, [selectedIndex, mobile, invalidate]);
  useFrame((_, delta) => {
    if (!group.current) return;
    const blend = reducedMotion ? 1 : Math.min(delta * 6, 1);
    const node = group.current;
    const targetProgress = ((index - selectedIndex + solarPlanets.length) % solarPlanets.length) / solarPlanets.length;
    // Travel along the curve, taking the shortest route, instead of cutting across it.
    const remaining = ((targetProgress - progress.current + 0.5) % 1 + 1) % 1 - 0.5;
    progress.current += remaining * blend;
    const position = getExplorerPath(progress.current, mobile);
    node.position.set(position.x, position.y, position.z);
    node.scale.setScalar(THREE.MathUtils.lerp(node.scale.x, target.radius / radius, blend));
    uniforms.uBrightness.value = THREE.MathUtils.lerp(uniforms.uBrightness.value, target.brightness, blend);
    if (Math.abs(node.position.x-target.x) + Math.abs(node.position.y-target.y) + Math.abs(node.position.z-target.z) + Math.abs(node.scale.x-target.radius/radius) > 0.001) invalidate();
    if (sphere.current && !paused && !reducedMotion) sphere.current.rotation.y += Math.min(delta, 0.05) * 0.08;
    // Html labels project matrixWorld later in this frame, including demand-only frames.
    node.updateWorldMatrix(true, true);
  }, -1);

  return <group ref={group} position={[initial.x, initial.y, initial.z]} scale={initial.radius/radius}>
    <mesh ref={sphere} rotation={planet.id === "uranus" ? [0, 0, 1.7] : [0, 0, 0]} onClick={(event) => { event.stopPropagation(); onInspect(planet.id); }}>
      <sphereGeometry args={[radius, 48, 32]} /><shaderMaterial vertexShader={planetVertexShader} fragmentShader={planetFragmentShader} uniforms={uniforms} />
    </mesh>
    <mesh scale={1.055}><sphereGeometry args={[radius, 32, 24]} /><shaderMaterial vertexShader={planetVertexShader} fragmentShader={atmosphereFragmentShader} uniforms={uniforms} transparent depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending} /></mesh>
    {planet.rings && <mesh rotation={[-Math.PI / 2 - 0.32, 0.2, 0.2]}><ringGeometry args={[radius * 1.3, radius * 2.25, 96]} /><shaderMaterial vertexShader={saturnRingVertexShader} fragmentShader={saturnRingFragmentShader} uniforms={uniforms} transparent side={THREE.DoubleSide} depthWrite={false} /></mesh>}
    <Html position={[0, -radius*(selected ? 1.12 : 1.5), 0]} center style={selected ? { transform: "translate3d(-50%, 0, 0)" } : undefined} zIndexRange={[4, 1]}>
      <div className={selected ? "planet-focus-info" : undefined}><button className={`solar-orbit-label ${selected ? "is-selected" : ""}`} onClick={() => onInspect(planet.id)} aria-label={`Focus ${planet.name} in explorer`}>{selected ? "IN FOCUS" : planet.name}</button>{selected && <PlanetInformation planet={planet} />}</div>
    </Html>
    {planet.id === "earth" && selected && <>
      <mesh position={[radius * 1.8, radius * 0.9, 0]} onClick={(event) => { event.stopPropagation(); onSelectHabitat(0); }}><sphereGeometry args={[radius * 0.23, 20, 16]} /><meshStandardMaterial color="#b3b7c2" roughness={0.9} /></mesh>
      <group position={[-radius * 1.5, radius * 0.75, 0]} rotation={[0.15, 0, -0.3]}>
        <mesh><boxGeometry args={[radius * 0.2, radius * 0.06, radius * 0.06]} /><meshStandardMaterial color="#b3b7c2" metalness={0.8} roughness={0.3} /></mesh>
        {[-1, 1].map((side) => <mesh key={side} position={[side * radius * 0.18, 0, 0]}><boxGeometry args={[radius * 0.13, radius * 0.22, radius * 0.015]} /><meshStandardMaterial color="#244d78" metalness={0.5} roughness={0.5} /></mesh>)}
      </group>
    </>}
  </group>;
}

export function SolarSystemScene({ motion, paused, reducedMotion, selectedPlanet, onInspect, onSelectHabitat }: SolarSceneProps) {
  const mobile = useCompactViewport();
  const invalidate = useThree((state) => state.invalidate);
  const ribbon = useRef<THREE.Group>(null);
  const curve = useMemo(() => Array.from({ length: 129 }, (_, index): [number, number, number] => {
    const point = getExplorerPath(index / 128, mobile);
    return [point.x, point.y, point.z];
  }), [mobile]);
  const selectedIndex = Math.max(0, solarPlanets.findIndex((planet) => planet.id === selectedPlanet));
  useFrame((_, delta) => {
    motion.current.current = reducedMotion ? motion.current.target : THREE.MathUtils.lerp(motion.current.current, motion.current.target, Math.min(delta * 4.5, 1));
    if (ribbon.current) ribbon.current.position.x = motion.current.current;
    if (Math.abs(motion.current.current - motion.current.target) > 0.0005) invalidate();
  }, -2);
  return <>
    <ambientLight intensity={0.65} /><directionalLight position={[-5, 6, 8]} intensity={2} />
    <group ref={ribbon}>
      <Line points={curve} color="#596274" lineWidth={0.65} transparent opacity={0.28} />
      {solarPlanets.map((planet, index) => <SolarPlanetMesh key={planet.id} planet={planet} index={index} mobile={mobile} selectedIndex={selectedIndex} onInspect={onInspect} onSelectHabitat={onSelectHabitat} paused={paused} reducedMotion={reducedMotion} />)}
    </group>
  </>;
}
