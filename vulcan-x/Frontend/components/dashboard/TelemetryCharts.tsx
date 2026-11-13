"use client";

import { Area, AreaChart, CartesianGrid, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import { calculateSimulation, type SimulationInput } from "@/lib/simulation";
import { useState } from "react";

const chartColors = { active: "var(--color-control)", baseline: "var(--color-body)", grid: "var(--color-line-strong)", text: "var(--color-muted)" };
const tooltipStyle = { background: "var(--color-panel-raised)", border: "1px solid var(--color-line-strong)", borderRadius: 4, color: "var(--color-text)", fontSize: 14 };
const axes = ["Ignitability", "Heat release", "Smoke", "Suppression"];

export default function TelemetryCharts({ input }: { input: SimulationInput }) {
  const metrics = calculateSimulation(input);
  return <div className="cc-chart-grid"><section className="cc-panel"><div className="cc-panel-heading"><h2>Flame spread over time</h2><span className="cc-caption">Synthetic / relative velocity</span></div><div className="cc-chart" role="img" aria-label={`Illustrative spread curve: habitat ${metrics.burnRateMultiplier} times the Earth baseline, 0 to 60 seconds.`}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={metrics.spread} margin={{ left: -16, right: 12, top: 16, bottom: 0 }} accessibilityLayer>
      <CartesianGrid stroke={chartColors.grid} vertical={false} /><XAxis dataKey="seconds" tick={{ fill: chartColors.text, fontSize: 13 }} tickFormatter={(value: number) => `${value}s`} minTickGap={24} /><YAxis tick={{ fill: chartColors.text, fontSize: 13 }} /><Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => `${value} seconds (illustrative)`} /><Legend />
      <Area name="Earth baseline" type="monotone" dataKey="earth" stroke={chartColors.baseline} fill={chartColors.baseline} fillOpacity={0.04} strokeDasharray="4 4" isAnimationActive={false} />
      <Area name="Active habitat" type="monotone" dataKey="habitat" stroke={chartColors.active} fill={chartColors.active} fillOpacity={0.14} isAnimationActive={false} />
    </AreaChart></ResponsiveContainer></div><p className="cc-caption">Normalized teaching curves, not measured spread velocities. Earth baseline ends at 0.96 relative units at 60 s.</p></section>
    <section className="cc-panel"><div className="cc-panel-heading"><h2>Material hazard profile</h2><span className="cc-caption">Synthetic indices / 0–100</span></div><HazardRadar values={metrics.hazardProfile} /><p className="cc-caption">Indices are demonstration weights, not material certification or measured toxicity.</p></section></div>;
}

export function HazardRadar({ values, comparison, names = ["Selected material", "Comparison"] }: { values: number[]; comparison?: number[]; names?: [string, string] }) {
  const [width, setWidth] = useState(0);
  // Fit the plot to its container, reserving room for the full axis labels.
  // Viewport breakpoints alone miss narrow chart columns on tablet layouts.
  const radius = Math.max(16, Math.min(80, width / 2 - 88));
  const data = axes.map((axis, index) => ({ axis, active: values[index], comparison: comparison?.[index] }));
  return <div className="cc-chart cc-radar" role="img" aria-label={`${names[0]} demo indices: ${axes.map((axis, index) => `${axis} ${values[index]}`).join(", ")}${comparison ? `. ${names[1]}: ${comparison.join(", ")}` : ""}`}><ResponsiveContainer width="100%" height="100%" minWidth={0} onResize={(nextWidth) => setWidth(nextWidth)}>
    <RadarChart data={data} outerRadius={radius} accessibilityLayer><PolarGrid stroke={chartColors.grid} /><PolarAngleAxis dataKey="axis" tick={{ fill: chartColors.text, fontSize: 13 }} /><PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} />
      <Radar name={names[0]} dataKey="active" stroke={chartColors.active} fill={chartColors.active} fillOpacity={0.16} isAnimationActive={false} />{comparison && <Radar name={names[1]} dataKey="comparison" stroke={chartColors.baseline} strokeDasharray="4 4" fillOpacity={0} isAnimationActive={false} />}{comparison && <Legend />}
    </RadarChart></ResponsiveContainer></div>;
}

export function ImpactChart({ baseline, target, unit, title }: { baseline: number; target: number; unit: string; title: string }) {
  return <div className="cc-impact-chart" role="img" aria-label={`${title}: baseline ${baseline} ${unit}; target ${target} ${unit}. Assumptions, not results.`}><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={[{ label: "Baseline", value: baseline }, { label: "Target", value: target }]} margin={{ left: -16, right: 12, top: 12, bottom: 0 }} accessibilityLayer><CartesianGrid vertical={false} stroke={chartColors.grid} /><XAxis dataKey="label" tick={{ fill: chartColors.text, fontSize: 13 }} /><YAxis tick={{ fill: chartColors.text, fontSize: 13 }} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} ${unit}`, "Assumed value"]} /><Bar dataKey="value" fill={chartColors.active} maxBarSize={48} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>;
}
