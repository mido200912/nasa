import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = new URL("../test-results/visual/", import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const results = [];
try {
  for (const width of [320, 375, 414, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.BASE_URL ?? "http://localhost:3000");
    await page.getByRole("button", { name: "Focus Neptune in explorer", exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: fileURLToPath(new URL(`hero-${width}.png`, directory)) });
    if (width === 1440 || width === 375) {
      await page.screenshot({ path: fileURLToPath(new URL(`page-${width}.png`, directory)), fullPage: true });
    }
    await page.locator(".telemetry-panel").screenshot({ path: fileURLToPath(new URL(`card-${width}-earth.png`, directory)) });
    const layout = await page.evaluate(() => {
      const clickableWraps = [...document.querySelectorAll("button, .button, .text-link")].filter((element) => {
        if (!element.getBoundingClientRect().width) return false;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let text;
        while ((text = walker.nextNode())) {
          if (!text.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(text);
          if (range.getClientRects().length > 1) return true;
        }
        return false;
      }).map((element) => element.textContent.trim());
      const card = document.querySelector(".telemetry-panel").getBoundingClientRect();
      const hero = document.querySelector(".command-hero").getBoundingClientRect();
      const overflowingMetrics = [...document.querySelectorAll(".metric-grid dd")].filter((metric) => metric.scrollWidth > metric.clientWidth + 1).length;
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, clickableWraps, cardClipped: card.bottom > hero.bottom + 1, overflowingMetrics };
    });
    results.push({ width, errors, ...layout });
    if (width === 1440 || width === 375) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const initial = await page.getByRole("button", { name: "Focus Earth in explorer", exact: true }).boundingBox();
      for (const planet of ["Jupiter", "Saturn"]) {
        await page.getByRole("button", { name: `Focus ${planet} in explorer`, exact: true }).click();
        const focus = page.getByRole("button", { name: `Focus ${planet} in explorer`, exact: true });
        await expect(focus).toContainText("IN FOCUS");
        await expect.poll(async () => {
          const box = await focus.boundingBox();
          return box && initial ? Math.abs(box.x + box.width / 2 - (initial.x + initial.width / 2)) : Infinity;
        }).toBeLessThan(2);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.screenshot({ path: fileURLToPath(new URL(`hero-${width}-${planet.toLowerCase()}.png`, directory)) });
        await expect(page.locator(".telemetry-panel h2")).toHaveText(planet);
        await page.locator(".telemetry-panel").screenshot({ path: fileURLToPath(new URL(`card-${width}-${planet.toLowerCase()}.png`, directory)) });
      }
    }
    if (width === 1440 || width === 375) {
      const comparison = page.locator(".flame-comparison");
      for (const [mode, name] of [["microgravity", "Microgravity"], ["earth", "Earth gravity"]]) {
        await comparison.getByRole("button", { name, exact: false }).click();
        await expect(comparison.locator(`svg[data-flame="${mode}"]`)).toBeVisible();
        await comparison.screenshot({ path: fileURLToPath(new URL(`flame-${width}-${mode}.png`, directory)) });
      }
    }
    await page.close();
  }
  await writeFile(new URL("results.json", directory), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => result.errors.length || result.clickableWraps.length || result.scrollWidth > result.width || result.cardClipped || result.overflowingMetrics)) process.exitCode = 1;
} finally {
  await browser.close();
}
