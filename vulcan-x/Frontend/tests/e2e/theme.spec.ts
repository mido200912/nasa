import { expect, test } from "@playwright/test";

function contrast(first: string, second: string) {
  const luminance = (color: string) => {
    const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const width of [375, 1440]) {
  test(`NASA-inspired colors preserve dark surfaces and readable controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    const primary = page.getByRole("link", { name: "Launch simulator", exact: false });
    await expect(primary).toHaveCSS("background-color", "rgb(0, 50, 160)");
    await expect(primary).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(5, 5, 8)");
    for (const mark of await page.locator(".brand-x, .wordmark > svg").all()) {
      await expect(mark).toHaveCSS("color", "rgb(107, 153, 255)");
    }
    for (const data of await page.locator(".atmosphere-equation .equation-result, .risk-heading > span:last-child").all()) {
      await expect(data).toHaveCSS("color", "rgb(155, 188, 255)");
    }
    for (const hover of [false, true]) {
      if (hover) await primary.hover();
      const colors = await primary.evaluate((element) => ({ text: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }));
      expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(4.5);
    }
    await primary.focus();
    const focus = await primary.evaluate((element) => ({ outline: getComputedStyle(element).outlineColor, background: getComputedStyle(document.body).backgroundColor }));
    expect(contrast(focus.outline, focus.background)).toBeGreaterThanOrEqual(3);
    const card = page.locator(".telemetry-panel");
    const colors = await card.getByRole("link", { name: "NASA facts" }).evaluate((element) => ({ text: getComputedStyle(element).color, background: getComputedStyle(element.closest(".telemetry-panel")!).backgroundColor }));
    expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(4.5);
  });
}

test("changing brand colors does not recolor the physical flame illustration", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Earth gravity", exact: false }).click();
  const plume = page.locator('svg[data-flame="earth"] linearGradient').first();
  await expect(plume.locator("stop").first()).toHaveCSS("stop-color", "rgb(255, 85, 0)");
  await expect(page.locator(".risk-fill").first()).toHaveCSS("background-color", "rgb(107, 153, 255)");
});
