import { expect, test } from "@playwright/test";

for (const width of [320, 375, 768, 1440]) {
  test(`approved wordmark replaces branding without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    const marks = page.locator(".wordmark img");
    await expect(marks).toHaveCount(2);
    for (const mark of await marks.all()) {
      await mark.scrollIntoViewIfNeeded();
      await expect(mark).toHaveAttribute("alt", "VULCAN-X");
      await expect(mark).toBeVisible();
      expect(await mark.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    await expect(page.locator(".wordmark > svg")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto("/dashboard");
    await expect(page.locator(".cc-sidebar .wordmark img")).toBeVisible();
    await expect(page.locator(".cc-sidebar .wordmark")).toHaveAttribute("href", "/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator(".cc-sidebar .wordmark").click();
    await expect(page).toHaveURL(/\/$/);
  });
}
