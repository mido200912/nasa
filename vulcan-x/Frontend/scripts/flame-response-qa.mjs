import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = new URL("../test-results/flame-response/", import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const results = [];
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, reducedMotion: "reduce" });
    await page.goto(`${process.env.BASE_URL ?? "http://localhost:3001"}/dashboard`);
    await expect(page.locator(".cc-flame-viewport")).toHaveAttribute("data-ready", "true");
    const cases = [
      { name: "lunar" },
      { name: "oxygen-low", slider: "Oxygen concentration", key: "Home" },
      { name: "oxygen-high", slider: "Oxygen concentration", key: "End" },
      { name: "pressure-low", slider: "Cabin pressure", key: "Home" },
      { name: "pressure-high", slider: "Cabin pressure", key: "End" },
      { name: "gravity-zero", slider: "Gravity", key: "Home" },
      { name: "gravity-earth", slider: "Gravity", key: "End" },
      { name: "material-ptfe", material: "Teflon / PTFE" },
      { name: "material-foam", material: "Acoustic melamine foam" },
    ];
    for (const item of cases) {
      if (item.slider) { await page.getByRole("slider", { name: item.slider, exact: true }).focus(); await page.keyboard.press(item.key); }
      if (item.material) { await page.getByRole("combobox", { name: "Test material", exact: true }).click(); await page.getByRole("option", { name: item.material, exact: true }).click(); }
      await page.locator(".cc-visual-panel").screenshot({ path: fileURLToPath(new URL(`${item.name}-${width}.png`, directory)) });
      results.push({ width, case: item.name, description: await page.getByRole("img", { name: /Conceptual combustion visualization/ }).getAttribute("aria-label") });
    }
    await page.close();
  }
  await writeFile(new URL("results.json", directory), JSON.stringify(results, null, 2));
  console.log(`Captured ${results.length} parameter-response panels.`);
} finally { await browser.close(); }
