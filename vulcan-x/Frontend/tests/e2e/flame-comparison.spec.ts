import { expect, test } from "@playwright/test";

for (const width of [320, 375, 414, 768, 1440]) {
  test(`flame comparison shows distinct clear illustrations at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    const comparison = page.locator(".flame-comparison");
    await comparison.scrollIntoViewIfNeeded();
    await expect(comparison.locator(".flame-crosshair, .flame-orbit, .flame-visual")).toHaveCount(0);
    await expect(comparison.locator('svg[data-flame="microgravity"]')).toBeVisible();
    await expect(comparison).toContainText("Ventilation can distort this shape");
    const before = await comparison.boundingBox();
    await comparison.getByRole("button", { name: "Earth gravity", exact: false }).focus();
    await page.keyboard.press("Enter");
    await expect(comparison.locator('svg[data-flame="earth"]')).toBeVisible();
    await expect(comparison.getByRole("img")).toHaveAttribute("aria-label", /upward orange flame/);
    await expect(comparison.getByRole("button", { name: "Earth gravity", exact: false })).toHaveAttribute("aria-pressed", "true");
    const after = await comparison.boundingBox();
    expect(after!.height).toBeCloseTo(before!.height, 0);
    expect(after!.x).toBeGreaterThanOrEqual(0);
    expect(after!.x + after!.width).toBeLessThanOrEqual(width);
    await comparison.getByRole("button", { name: "Microgravity", exact: false }).click();
    await expect(comparison.locator('svg[data-flame="microgravity"]')).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await comparison.locator(".flame-motion").evaluate((element) => element.getAnimations().length)).toBe(0);
  });
}
