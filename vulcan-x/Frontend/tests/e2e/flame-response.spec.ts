import { expect, test, type Page } from "@playwright/test";
import { flamePixels } from "./helpers/flame-pixels";

test("SVG fallback responds to oxygen, pressure, gravity and material too", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind === "webgl" || kind === "webgl2" || kind === "experimental-webgl") return null;
      return original.apply(this, [kind, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto("/dashboard");
  const envelope = page.locator(".cc-flame-fallback svg > g");
  await expect(envelope).toBeVisible();
  const initial = await envelope.getAttribute("transform");
  await sliderExtreme(page, "Oxygen concentration", "End");
  await expect(envelope).not.toHaveAttribute("transform", initial!);
  const oxygen = await envelope.getAttribute("transform");
  await sliderExtreme(page, "Cabin pressure", "Home");
  await expect(envelope).not.toHaveAttribute("transform", oxygen!);
  await sliderExtreme(page, "Gravity", "Home");
  await expect(page.getByRole("img", { name: "Conceptual spherical diffusion envelope", exact: true })).toBeVisible();
  const zeroGravity = await envelope.getAttribute("transform");
  await page.getByRole("combobox", { name: "Test material", exact: true }).click();
  await page.getByRole("option", { name: "Teflon / PTFE", exact: true }).click();
  await expect(envelope).not.toHaveAttribute("transform", zeroGravity!);
});

async function sliderExtreme(page: Page, label: string, key: "Home" | "End") {
  await page.getByRole("slider", { name: label, exact: true }).focus();
  await page.keyboard.press(key);
}

for (const width of [375, 1440]) {
  test(`all four inputs visibly change the actual flame at ${width}px even with reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto("/dashboard");
    await expect(page.locator(".cc-flame-viewport")).toHaveAttribute("data-ready", "true");

    await sliderExtreme(page, "Oxygen concentration", "Home");
    const lowOxygen = await flamePixels(page);
    await sliderExtreme(page, "Oxygen concentration", "End");
    const highOxygen = await flamePixels(page);
    expect(highOxygen.count).toBeGreaterThan(lowOxygen.count * 1.25);
    expect(highOxygen.brightness).toBeGreaterThan(lowOxygen.brightness * 1.3);

    await sliderExtreme(page, "Cabin pressure", "Home");
    const lowPressure = await flamePixels(page);
    await sliderExtreme(page, "Cabin pressure", "End");
    const highPressure = await flamePixels(page);
    expect(highPressure.brightness).toBeGreaterThan(lowPressure.brightness * 1.15);

    await sliderExtreme(page, "Gravity", "Home");
    const zeroGravity = await flamePixels(page);
    await sliderExtreme(page, "Gravity", "End");
    const earthGravity = await flamePixels(page);
    expect(zeroGravity.aspect).toBeGreaterThan(0.85);
    expect(zeroGravity.blue).toBeGreaterThan(200);
    expect(earthGravity.aspect).toBeLessThan(0.65);

    await page.getByRole("combobox", { name: "Test material", exact: true }).click();
    await page.getByRole("option", { name: "Teflon / PTFE", exact: true }).click();
    const ptfe = await flamePixels(page);
    await page.getByRole("combobox", { name: "Test material", exact: true }).click();
    await page.getByRole("option", { name: "Acoustic melamine foam", exact: true }).click();
    const foam = await flamePixels(page);
    expect(foam.brightness).toBeGreaterThan(ptfe.brightness * 1.2);

    await page.getByRole("button", { name: "Reset scenario", exact: true }).click();
    await expect(page.locator(".cc-flame-response")).toContainText("Kapton wire insulation");
    await expect(page.locator(".cc-flame-viewport")).toHaveAttribute("data-rendering", "on-demand");
    expect(errors).toEqual([]);
  });
}
