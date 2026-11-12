import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../test-results/scroll/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    recordVideo: { dir: fileURLToPath(output), size: { width: 1440, height: 960 } },
  });
  const page = await context.newPage();
  const video = page.video();
  await page.goto("http://localhost:3000");
  await expect(page.getByRole("button", { name: "Focus Earth in explorer", exact: true })).toBeVisible();
  await page.mouse.move(700, 280);
  const frames = (count) => page.evaluate(async (count) => {
    for (let index = 0; index < count; index++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
  await frames(15);
  for (let step = 0; step < 48; step++) {
    if (await page.evaluate(() => scrollY >= document.documentElement.scrollHeight - innerHeight - 1)) break;
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 160);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
    await frames(8);
  }
  await frames(30);
  await context.close();
  const path = fileURLToPath(new URL("motion-demo.webm", output));
  await video.saveAs(path);
  console.log(path);
} finally { await browser.close(); }
