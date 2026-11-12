import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../test-results/scroll/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const results = [];
try {
  // These are observed renderer/RAF measurements, NOT GPU hardware utilization.
  // Run one page at a time against a production server without concurrent tests.
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://localhost:3000");
    await expect(page.getByRole("button", { name: "Focus Earth in explorer", exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const before = await cdp.send("Performance.getMetrics");
    const frames = await page.evaluate(async () => {
      const observations = [];
      const longTasks = [];
      const observer = new PerformanceObserver((list) => longTasks.push(...list.getEntries().map((entry) => entry.duration)));
      observer.observe({ type: "longtask", buffered: false });
      const end = document.getElementById("architecture").offsetTop;
      const begin = performance.now();
      let previous = begin;
      await new Promise((resolve) => {
        function frame(now) {
          observations.push(now - previous);
          previous = now;
          const progress = Math.min((now - begin) / 6500, 1);
          window.scrollTo({ top: progress * end, behavior: "instant" });
          if (progress < 1) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
      observer.disconnect();
      observations.sort((a, b) => a - b);
      return {
        frames: observations.length,
        medianFrameMs: observations[Math.floor(observations.length * 0.5)],
        p95FrameMs: observations[Math.floor(observations.length * 0.95)],
        framesOver50ms: observations.filter((duration) => duration > 50).length,
        longTasks: longTasks.length,
        longestTaskMs: Math.max(0, ...longTasks),
      };
    });
    const after = await cdp.send("Performance.getMetrics");
    const value = (data, name) => data.metrics.find((metric) => metric.name === name)?.value ?? 0;
    const renderer = Object.fromEntries(["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration", "LayoutCount", "RecalcStyleCount"].map((name) => [name, value(after, name) - value(before, name)]));
    await expect(page.locator(".orbital-canvas")).toHaveAttribute("data-rendering", "on-demand");
    for (const [label, selector] of [["architecture", "#architecture"], ["features", "#engines"], ["science", "#paradox"]]) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      const section = page.locator(selector);
      expect(await section.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
      await page.screenshot({ path: fileURLToPath(new URL(`${label}-${width}.png`, output)) });
    }
    await page.evaluate(() => window.scrollTo({ top: 340, behavior: "instant" }));
    await page.screenshot({ path: fileURLToPath(new URL(`descent-${width}.png`, output)) });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    expect(await page.locator(".hero-intro").evaluate((element) => getComputedStyle(element).transform)).toBe("none");
    results.push({ width, errors, frames, renderer });
    await page.close();
  }
  await writeFile(new URL("performance.json", output), JSON.stringify({ note: "Headless Chromium renderer and requestAnimationFrame samples, not hardware GPU utilization or a guaranteed frame rate.", results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => result.errors.length)) process.exitCode = 1;
} finally { await browser.close(); }
