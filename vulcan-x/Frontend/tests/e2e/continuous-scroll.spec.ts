import { expect, test } from "@playwright/test";

for (const settings of [
  { label: "desktop", width: 1440, touch: false, reduced: false },
  { label: "narrow window", width: 900, touch: false, reduced: false },
  { label: "touch device", width: 375, touch: true, reduced: false },
  { label: "reduced motion", width: 1440, touch: false, reduced: true },
]) {
  test(`wheel input scrolls continuously on ${settings.label}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: settings.width, height: 900 }, hasTouch: settings.touch, reducedMotion: settings.reduced ? "reduce" : "no-preference" });
    try {
      const page = await context.newPage();
      await page.goto("/");
      await expect(page.getByRole("button", { name: "Focus Earth in explorer", exact: true })).toBeVisible();
      await page.mouse.move(settings.width * 0.45, 200);
      await page.mouse.wheel(0, 120);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(120, 0);
      await page.mouse.wheel(0, 80);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(200, 0);
      await page.mouse.wheel(0, -50);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(150, 0);
      await expect(page.getByRole("navigation", { name: "Section navigation" })).toHaveCount(0);
      expect(await page.locator("html").evaluate((element) => getComputedStyle(element).scrollSnapType)).toBe("none");
    } finally { await context.close(); }
  });
}

test("scrolling never transforms the scene or science graphics", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Focus Earth in explorer", exact: true })).toBeVisible();
  const graphics = page.locator(".orbital-canvas, .flame-comparison, .flame-motion, .bridge-node, .bridge-connection");
  for (const top of [0, 300, 1000, 1800]) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), top);
    for (const graphic of await graphics.all()) {
      expect(await graphic.evaluate((element) => ({ transform: getComputedStyle(element).transform, animation: getComputedStyle(element).animationName }))).toEqual({ transform: "none", animation: "none" });
    }
  }
});
