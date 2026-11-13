"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { chamberLift, type StressTestResult } from "@/lib/stress-test";

export interface ChamberProps {
  result: StressTestResult;
  gravity: number;
  moving: boolean;
  isSuppressing: boolean;
  extinguished: boolean;
  startedAt: number | null;
  duration: number;
}

export function flamePower({ isSuppressing, extinguished, startedAt, duration }: ChamberProps) {
  if (extinguished) return 0;
  if (!isSuppressing || startedAt === null) return 1;
  const progress = THREE.MathUtils.clamp((Date.now() - startedAt) / (duration * 1000), 0, 1);
  return 1 - progress * progress * (3 - 2 * progress);
}

const nozzles = [[-1.1, 2.3, -0.75], [1.1, 2.3, -0.75], [-1.1, 2.3, 0.75], [1.1, 2.3, 0.75]] as const;

/** Procedural test bay. All meshes share one canvas; no shadows/postprocessing. */
export function HabitatChamber(props: ChamberProps) {
  const light = useRef<THREE.PointLight>(null);
  const strips = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const invalidate = useThree((state) => state.invalidate);
  const colors = useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const read = (token: string) => css.getPropertyValue(token).trim();
    return { wall: read("--color-panel"), metal: read("--color-panel-raised"), text: read("--color-text"), nominal: new THREE.Color(read("--color-control")) };
  }, []);
  const target = useMemo(() => new THREE.Color(props.result.riskColorHex), [props.result.riskColorHex]);
  const blended = useMemo(() => new THREE.Color(), []);
  useEffect(() => { invalidate(); }, [props.result, props.extinguished, props.isSuppressing, invalidate]);
  useFrame(({ clock }, delta) => {
    const power = flamePower(props);
    const pulse = props.moving && props.result.riskScore >= 70 ? 0.8 + Math.sin(clock.elapsedTime * 6) * 0.2 : 1;
    blended.copy(colors.nominal).lerp(target, power);
    const smoothing = props.moving ? 1 - Math.exp(-delta * 8) : 1;
    if (light.current) {
      light.current.color.lerp(blended, smoothing);
      light.current.intensity = THREE.MathUtils.lerp(light.current.intensity, 1.5 + power * pulse * 7, smoothing);
    }
    for (const strip of strips.current) {
      if (!strip) continue;
      strip.emissive.lerp(blended, smoothing);
      strip.emissiveIntensity = 0.6 + power * pulse * 1.8;
    }
  });
  return <>
    <ambientLight intensity={0.65} />
    <pointLight position={[0, 3.2, 3]} intensity={18} color={colors.text} distance={14} decay={2} />
    <directionalLight position={[2, 4, 5]} intensity={2.4} color={colors.nominal} />
    <pointLight ref={light} position={[0, 0.6, 1]} distance={11} decay={2} />
    <mesh position={[0, 0.2, -2.25]}><boxGeometry args={[6.4, 4.8, 0.12]} /><meshStandardMaterial color={colors.wall} emissive={colors.wall} emissiveIntensity={0.7} metalness={0.8} roughness={0.3} /></mesh>
    {[-1, 1].map((side) => <group key={side}>
      <mesh position={[side * 2.65, 0.2, -0.7]} rotation={[0, side * -0.28, 0]}><boxGeometry args={[0.14, 4.8, 3.6]} /><meshStandardMaterial color={colors.metal} emissive={colors.metal} emissiveIntensity={0.6} metalness={0.85} roughness={0.25} /></mesh>
      {[-1.65, -0.55, 0.55, 1.65].map((y) => <mesh key={y} position={[side * 2.23, y, -1.65]}><boxGeometry args={[0.5, 0.06, 0.4]} /><meshStandardMaterial color={colors.metal} metalness={0.9} roughness={0.2} /></mesh>)}
      <mesh position={[side * 1.9, 0.2, -2.13]}><boxGeometry args={[0.045, 3.8, 0.025]} /><meshStandardMaterial ref={(material) => { strips.current[side === -1 ? 0 : 1] = material; }} color={colors.metal} emissive={colors.nominal} toneMapped={false} /></mesh>
      <mesh position={[side * 0.9, 2.3, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 1.8, 12]} /><meshStandardMaterial color={colors.metal} metalness={0.95} roughness={0.18} /></mesh>
      <mesh position={[side * 1.1, 2.3, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.045, 0.045, 1.5, 12]} /><meshStandardMaterial color={colors.metal} metalness={0.95} roughness={0.18} /></mesh>
    </group>)}
    {[-1.05, 0, 1.05].map((x) => <mesh key={x} position={[x, 0.2, -2.14]}><boxGeometry args={[0.025, 4.4, 0.03]} /><meshStandardMaterial color={colors.metal} emissive={colors.metal} emissiveIntensity={0.8} metalness={0.85} roughness={0.25} /></mesh>)}
    <mesh position={[0, -1.65, 0]}><boxGeometry args={[6.4, 0.12, 6]} /><meshStandardMaterial color={colors.wall} emissive={colors.wall} emissiveIntensity={0.6} metalness={0.8} roughness={0.3} /></mesh>
    <gridHelper args={[6, 16, colors.metal, colors.metal]} position={[0, -1.58, 0]} />
    <mesh position={[0, -1.36, 0]}><cylinderGeometry args={[0.83, 1.02, 0.42, 48]} /><meshStandardMaterial color={colors.metal} emissive={colors.metal} emissiveIntensity={0.8} metalness={0.95} roughness={0.2} /></mesh>
    <mesh position={[0, -1.12, 0]}><cylinderGeometry args={[0.83, 0.83, 0.06, 48]} /><meshStandardMaterial color={colors.wall} emissive={colors.wall} emissiveIntensity={0.6} metalness={0.9} roughness={0.15} /></mesh>
    <mesh position={[0, -1.05, 0]}><boxGeometry args={[0.42, 0.1, 0.42]} /><meshStandardMaterial color={colors.metal} metalness={0.75} roughness={0.25} /></mesh>
    <mesh position={[0, 2.3, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 1.9, 12]} /><meshStandardMaterial color={colors.metal} metalness={0.95} roughness={0.18} /></mesh>
    {nozzles.map((position, i) => <mesh key={i} position={[...position]} rotation={[position[2] * -0.18, 0, position[0] * 0.2]}><cylinderGeometry args={[0.06, 0.12, 0.23, 16]} /><meshStandardMaterial color={colors.metal} metalness={0.95} roughness={0.15} /></mesh>)}
  </>;
}

const particleVertex = `
attribute vec4 aSeed;
attribute vec3 aDirection;
uniform float uTime;
uniform float uLift;
uniform float uSpeed;
uniform float uSize;
uniform float uPower;
uniform float uMist;
varying float vAlpha;
void main() {
  float age=fract(aSeed.x+uTime*uSpeed*0.25);
  vec3 radial=aDirection*(0.55+age*1.9)*uSize;
  vec3 upward=vec3(aDirection.x*(0.25+age*0.45),-0.3+age*3.1,aDirection.z*(0.25+age*0.45));
  vec3 ember=mix(radial,upward,uLift)*uPower;
  float nozzle=floor(aSeed.y*4.0);
  vec3 start=vec3(mod(nozzle,2.0)<0.5?-1.1:1.1,2.18,nozzle<1.5?-0.75:0.75);
  vec3 end=vec3(aDirection.x*0.8,-1.15,aDirection.z*0.8);
  vec3 mist=mix(start,end,age)+aDirection*age*0.16;
  vec3 pos=mix(ember,mist,uMist);
  vec4 view=modelViewMatrix*vec4(pos,1.0);
  gl_Position=projectionMatrix*view;
  gl_PointSize=clamp((uMist>0.5?24.0:17.0)*(0.65+aSeed.z*0.5)/max(1.0,-view.z),1.0,6.0);
  vAlpha=sin(age*3.14159)*(uMist>0.5?0.85:uPower*0.8);
}`;
const particleFragment = `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d=length(gl_PointCoord-0.5)*2.0;
  if(d>1.0) discard;
  gl_FragColor=vec4(uColor,(1.0-d)*vAlpha);
}`;

/** Fixed bounded buffers; emission/movement evaluated on the GPU, no per-frame allocations. */
export function ChamberParticles({ mist = false, ...props }: ChamberProps & { mist?: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useRef<THREE.BufferGeometry>(null);
  const elapsed = useRef(0);
  const invalidate = useThree((state) => state.invalidate);
  const data = useMemo(() => {
    const count = mist ? 1200 : 1024;
    const positions = new Float32Array(count * 3), seeds = new Float32Array(count * 4), directions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = i * 2.399963, z = 1 - 2 * ((i * 0.618034) % 1), r = Math.sqrt(1 - z * z);
      directions.set([r * Math.cos(a), z, r * Math.sin(a)], i * 3);
      seeds.set([(i * 0.754878) % 1, (i * 0.56984) % 1, (i * 0.438289) % 1, 0], i * 4);
    }
    return { positions, seeds, directions };
  }, [mist]);
  const uniforms = useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    const color = new THREE.Color(styles.getPropertyValue(mist ? "--color-flame-cool" : "--color-flame-orange").trim());
    if (mist) color.lerp(new THREE.Color(styles.getPropertyValue("--color-text").trim()), 0.8);
    return { uTime: { value: 0 }, uLift: { value: 0 }, uSpeed: { value: 1 }, uSize: { value: 1 }, uPower: { value: 1 }, uMist: { value: mist ? 1 : 0 }, uColor: { value: color } };
  }, [mist]);
  useEffect(() => {
    geometry.current?.setDrawRange(0, mist ? 1200 : props.result.flameParams.particleDensity);
    invalidate();
  }, [mist, props.result.flameParams.particleDensity, props.isSuppressing, props.extinguished, invalidate]);
  useFrame((_, delta) => {
    if (!material.current) return;
    if (props.moving) elapsed.current += Math.min(delta, 0.05);
    const u = material.current.uniforms;
    u.uTime.value = elapsed.current;
    u.uLift.value = chamberLift(props.gravity);
    u.uSpeed.value = mist ? 3 : props.result.flameParams.expansionVelocity;
    u.uSize.value = props.result.flameParams.coreRadius * 0.6;
    u.uPower.value = flamePower(props);
  });
  return <points frustumCulled={false} visible={mist ? props.isSuppressing : !props.extinguished}>
    <bufferGeometry ref={geometry}>
      <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      <bufferAttribute attach="attributes-aSeed" args={[data.seeds, 4]} />
      <bufferAttribute attach="attributes-aDirection" args={[data.directions, 3]} />
    </bufferGeometry>
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={particleVertex} fragmentShader={particleFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
  </points>;
}
