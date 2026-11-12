import { expect, test } from "@playwright/test";

for (const width of [320, 375, 414, 768, 1024, 1440]) {
  test(`science action is a clear secondary button at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    const link = page.getByRole("link", { name: "Explore the science", exact: true });
    await expect(link).toHaveAttribute("href", "#paradox");
    await expect(link).toHaveCSS("border-top-style", "solid");
    await expect(link).toHaveCSS("border-top-width", "1px");
    const box = await link.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(await link.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    const normal = await link.evaluate((element) => getComputedStyle(element).backgroundColor);
    await link.hover();
    await expect.poll(() => link.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(normal);
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#paradox$/);
    await expect(page.getByRole("heading", { name: "Take away gravity. The danger stays." })).toBeInViewport();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("link", { name: "Explore the science", exact: true }).click();
    await expect(page).toHaveURL(/#paradox$/);
  });
}
