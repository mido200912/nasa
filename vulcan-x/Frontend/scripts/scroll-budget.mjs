import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const output = new URL("../test-results/scroll/", import.meta.url);
await mkdir(output, { recursive: true });
const label = process.argv.includes("--before") ? "before" : "after";
const browser = await chromium.launch({ channel: "chromium" });
const results = [];
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, deviceScaleFactor: 2 });
    await page.addInitScript(() => {
      window.__draws = 0;
      const original = WebGL2RenderingContext.prototype.drawElements;
      WebGL2RenderingContext.prototype.drawElements = function (...args) { window.__draws++; return original.apply(this, args); };
    });
    await page.goto("http://localhost:3000");
    await expect(page.getByRole("button", { name: "Focus Earth in explorer", exact: true })).toBeVisible();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Performance.enable");
    const before = await cdp.send("Performance.getMetrics");
    const sample = await page.evaluate(async () => {
      const intervals = [];
      const beforeDraws = window.__draws;
      const start = performance.now();
      let previous = start;
      await new Promise((resolve) => {
        function step(now) {
          intervals.push(now - previous);
          previous = now;
          const progress = Math.min((now - start) / 3000, 1);
          window.scrollTo({ top: progress * 350, behavior: "instant" });
          if (progress < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      });
      intervals.sort((a, b) => a - b);
      const canvas = document.querySelector("canvas");
      return { drawsDuringScroll: window.__draws - beforeDraws, frames: intervals.length, p95FrameMs: intervals[Math.floor(intervals.length * 0.95)], framesOver50ms: intervals.filter((value) => value > 50).length, drawingBufferPixels: canvas.width * canvas.height, rendering: document.querySelector(".orbital-canvas").dataset.rendering };
    });
    const after = await cdp.send("Performance.getMetrics");
    const value = (data, name) => data.metrics.find((metric) => metric.name === name)?.value ?? 0;
    results.push({ width, ...sample, scriptMs: (value(after, "ScriptDuration") - value(before, "ScriptDuration")) * 1000, taskMs: (value(after, "TaskDuration") - value(before, "TaskDuration")) * 1000 });
    await page.close();
  }
  const report = { label, conditions: "Headless Chromium, DPR 2, 4× CPU throttle, 3-second native hero scroll. Draw calls and renderer time, not hardware GPU utilization.", results };
  await writeFile(new URL(`budget-${label}.json`, output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
