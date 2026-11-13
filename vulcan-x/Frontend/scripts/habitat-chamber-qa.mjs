import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = new URL("../test-results/habitat-chamber/", import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const results = [];
try {
  for (const width of [320, 375, 414, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.clock.install();
    await page.goto(`${process.env.BASE_URL ?? "http://localhost:3001"}/dashboard`);
    await page.clock.runFor(500);
    await expect(page.getByTestId("stress-test-sync")).toContainText("Synced");
    await expect(page.locator(".cc-flame-viewport")).toHaveAttribute("data-ready", "true");
    const capture = async (name) => {
      await page.locator(".cc-visual-panel").screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, directory)) });
      const layout = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, overflowing: [...document.querySelectorAll('[aria-label="Habitat chamber status"] > span, .cc-visual-panel button')].filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.textContent) }));
      results.push({ width, phase: name, layout, errors: [...errors] });
    };
    await capture("burning");
    await page.getByRole("button", { name: "Deploy Fine-Water-Mist Suppression", exact: true }).click();
    await page.clock.runFor(2000);
    await capture("mist");
    await page.clock.runFor(2400);
    await expect(page.getByTestId("nozzle-status")).toContainText("EXTINGUISHED");
    await capture("extinguished");
    await page.getByRole("button", { name: "Re-Ignite Test Sample", exact: true }).click();
    await page.getByRole("slider", { name: "Gravity", exact: true }).focus();
    await page.keyboard.press("End");
    await page.clock.runFor(500);
    await capture("earth");
    if (width === 375 || width === 1440) {
      await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
      await capture("text-200-percent");
    }
    await page.close();
  }
  await writeFile(new URL("results.json", directory), JSON.stringify(results, null, 2));
  const failures = results.filter((item) => item.layout.document > item.layout.viewport || item.layout.overflowing.length || item.errors.length);
  console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally { await browser.close(); }
