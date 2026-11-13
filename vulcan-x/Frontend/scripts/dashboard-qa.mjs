import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = new URL("../test-results/dashboard-visual/", import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const results = [];
const base = process.env.BASE_URL ?? "http://localhost:3000";
try {
  for (const width of [320, 375, 414, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of ["", "/playbook", "/earth-bridge", "/materials"]) {
      const name = route.slice(1) || "stress-test";
      await page.goto(`${base}/dashboard${route}`);
      await expect(page.locator(".cc-page-heading h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      if (!route) {
        await expect(page.locator("canvas")).toHaveCount(1);
        await expect(page.locator(".cc-chart .recharts-area")).toHaveCount(2);
        await expect(page.locator(".cc-chart .recharts-radar")).toHaveCount(1);
        await page.locator(".cc-flame-viewport").scrollIntoViewIfNeeded();
        await expect(page.locator(".cc-flame-viewport")).toHaveAttribute("data-ready", "true");
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      }
      if (route === "/playbook") {
        await page.getByRole("button", { name: "Generate outline", exact: true }).click();
        await expect(page.getByText("Preview complete · engineering review required")).toBeVisible();
      }
      if (route === "/earth-bridge") {
        const toggle = page.getByRole("switch", { name: "Terrestrial impact mode" });
        if (!(await toggle.isChecked())) await toggle.click();
        await expect(page.locator(".cc-impact-chart .recharts-bar")).toHaveCount(1);
      }
      if (route === "/materials") await expect(page.locator(".cc-chart .recharts-radar")).toHaveCount(2);
      if (width === 375 || width === 1440) await page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, directory)), fullPage: true });
      const layout = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clippedHeadings: [...document.querySelectorAll(".cc-main h1,.cc-main h2,.cc-main h3")].filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.textContent),
        clippedChartLabels: [...document.querySelectorAll(".recharts-polar-angle-axis-tick-value")].filter((element) => { const bounds = element.getBoundingClientRect(); const chart = element.closest(".cc-chart").getBoundingClientRect(); return bounds.left < chart.left - 1 || bounds.right > chart.right + 1; }).map((element) => element.textContent),
      }));
      results.push({ width, module: name, textScale: "100%", errors: [...errors], ...layout });
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      const enlarged = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clippedHeadings: [...document.querySelectorAll(".cc-main h1,.cc-main h2,.cc-main h3")].filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.textContent) }));
      results.push({ width, module: name, textScale: "200%", errors: [...errors], ...enlarged });
      if (width === 375 || width === 1440) await page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}-200pct.png`, directory)), fullPage: true });
      await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    }
    await page.close();
  }
  await writeFile(new URL("results.json", directory), JSON.stringify(results, null, 2));
  const failures = results.filter((result) => result.errors.length || result.scrollWidth > result.width || result.clippedHeadings.length || result.clippedChartLabels?.length);
  console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally { await browser.close(); }
