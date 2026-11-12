import { expect, test } from "@playwright/test";

declare global {
  interface Window { __vulcanDraws: number }
}

test("native scrolling leaves hero text and telemetry steady", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Focus Earth in explorer", exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 360, behavior: "instant" }));
  for (const selector of [".hero-intro", ".telemetry-position", "[data-motion-reveal]", ".pipeline-stage"]) {
    for (const target of await page.locator(selector).all()) {
      const styles = await target.evaluate((element) => ({ transform: getComputedStyle(element).transform, opacity: getComputedStyle(element).opacity, hint: element.style.willChange }));
      expect(styles).toEqual({ transform: "none", opacity: "1", hint: "" });
    }
  }
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "Focus Mars in explorer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mars", exact: true })).toBeVisible();
});

test("native scrolling keeps the planet scene steady without resizing WebGL", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Focus Earth in explorer", exact: true })).toBeVisible();
  const buffer = await page.locator("canvas").evaluate((canvas) => ({ width: (canvas as HTMLCanvasElement).width, height: (canvas as HTMLCanvasElement).height }));
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: "instant" }));
  expect(await page.locator(".orbital-canvas").evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  expect(await page.locator("canvas").evaluate((canvas) => ({ width: (canvas as HTMLCanvasElement).width, height: (canvas as HTMLCanvasElement).height }))).toEqual(buffer);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  expect(await page.locator(".orbital-canvas").evaluate((element) => getComputedStyle(element).transform)).toBe("none");
});

test("scrolling suspends continuous WebGL and returns to normal when idle", async ({ page }) => {
  await page.addInitScript(() => {
    window.__vulcanDraws = 0;
    const original = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (...args: Parameters<typeof original>) {
      window.__vulcanDraws++;
      return original.apply(this, args);
    };
  });
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => window.__vulcanDraws)).toBeGreaterThan(0);
  const sample = await page.evaluate(async () => {
    let drawsAtStart = 0;
    let drawsAtEnd = 0;
    let scrollingMode = "";
    for (let frame = 0; frame < 30; frame++) {
      window.scrollTo({ top: 30 + frame * 3, behavior: "instant" });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (frame === 10) drawsAtStart = window.__vulcanDraws;
      if (frame === 29) { drawsAtEnd = window.__vulcanDraws; scrollingMode = document.querySelector<HTMLElement>(".orbital-canvas")!.dataset.rendering!; }
    }
    return { draws: drawsAtEnd - drawsAtStart, scrollingMode };
  });
  expect(sample.scrollingMode).toBe("on-demand");
  expect(sample.draws).toBe(0);
  await expect(page.locator(".orbital-canvas")).toHaveAttribute("data-rendering", "active");
  await page.getByRole("link", { name: "Launch simulator", exact: false }).click();
  await expect(page).toHaveURL(/#stress-test$/);
  await expect(page.getByRole("slider", { name: "Oxygen concentration" })).toBeInViewport();
});

test("high-DPI canvas caps pixel cost and still suspends off-screen", async ({ browser }) => {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, deviceScaleFactor: 2 });
    try {
      const page = await context.newPage();
      await page.goto("/");
      await expect(page.getByRole("button", { name: "Focus Earth in explorer", exact: true })).toBeVisible();
      const ratio = await page.locator("canvas").evaluate((canvas) => (canvas as HTMLCanvasElement).width / canvas.getBoundingClientRect().width);
      expect(ratio).toBeLessThanOrEqual(width < 1024 ? 1.01 : 1.51);
      await page.evaluate(() => window.scrollTo({ top: 950, behavior: "instant" }));
      await expect(page.locator(".orbital-canvas")).toHaveAttribute("data-rendering", "on-demand");
      await expect(page.locator("canvas")).toHaveCount(1);
    } finally { await context.close(); }
  }
});

test("steady flame graphics preserve gravity modes and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  const flame = page.locator(".flame-motion");
  const top = await flame.evaluate((element) => element.getBoundingClientRect().top + scrollY);
  await page.evaluate((top) => window.scrollTo({ top: top - innerHeight + 80, behavior: "instant" }), top);
  expect(await flame.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  await page.evaluate((top) => window.scrollTo({ top: top - innerHeight * 0.35, behavior: "instant" }), top);
  expect(await flame.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  await page.getByRole("button", { name: "Earth gravity", exact: false }).click();
  await expect(page.getByRole("img", { name: "Conceptual upward orange flame under Earth gravity" })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator(".flame-motion").evaluate((element) => element.getAnimations().length)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await flame.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
});

test("all narrative content remains visible without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto("/");
    for (const selector of [".paradox-copy", ".flame-motion", "[data-motion-reveal]", ".pipeline-stage"]) {
      for (const element of await page.locator(selector).all()) {
        await expect(element).toBeVisible();
        expect(await element.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
      }
    }
  } finally { await context.close(); }
});
