import { expect, test } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`removed hero control strips leave no empty space at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Focus Earth in explorer", exact: true })).toBeVisible();
    await expect(page.locator(".solar-explorer, .orbit-toolbar, .environment-navigation")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Inspect planets", exact: true })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Choose environment", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Pause planet rotation|Previous environment|Next environment/ })).toHaveCount(0);
    const layout = await page.evaluate(() => {
      const scene = document.querySelector(".orbital-canvas")!.getBoundingClientRect();
      const card = document.querySelector(".telemetry-position")!.getBoundingClientRect();
      const hero = document.querySelector(".command-hero")!.getBoundingClientRect();
      return { gap: innerWidth < 1024 ? card.top - scene.bottom : hero.bottom - scene.bottom };
    });
    expect(layout.gap).toBeGreaterThanOrEqual(0);
    expect(layout.gap).toBeLessThan(140);
    await page.getByRole("button", { name: "Focus Mars in explorer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Mars", exact: true })).toBeVisible();
  });
}
