import { expect, test } from "@playwright/test";
import { flamePixels } from "./helpers/flame-pixels";
import { mockCatalog } from "./helpers/catalog-fixtures";

test.beforeEach(async ({ page }) => { await mockCatalog(page); });

test("stress-test endpoint validates live requests", async ({ request }) => {
  const data = { environment: "lunar", oxygenLevel: 30, pressurePsi: 10.2, gravityG: 0.16, materialId: "pmma_acrylic" };
  const response = await request.post("/api/v1/simulator/stress-test", { data });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ illustrative: true, flameParams: { morphology: "spherical_expanding" } });
  expect((await request.post("/api/v1/simulator/stress-test", { data: { ...data, oxygenLevel: 500 } })).status()).toBe(400);
});

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`chamber sync, suppression and reignition work with motion: ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto("/dashboard");
    await expect(page.locator(".cc-flame-viewport")).toHaveAttribute("data-ready", "true");
    await expect(page.getByTestId("stress-test-sync")).toContainText("Synced");
    await expect(page.getByTestId("chamber-morphology")).toContainText("Spherical Cool Plasma");
    await page.getByRole("button", { name: "Deploy Fine-Water-Mist Suppression", exact: true }).click();
    await expect(page.getByTestId("nozzle-status")).toContainText("DISCHARGING 50µm MIST");
    await expect(page.locator(".cc-flame-viewport")).toHaveAttribute("data-suppression", "discharging");
    await expect(page.getByTestId("nozzle-status")).toContainText("EXTINGUISHED", { timeout: 10000 });
    await page.getByRole("button", { name: "Re-Ignite Test Sample", exact: true }).click();
    await expect(page.getByTestId("nozzle-status")).toContainText("STANDBY");
    await page.getByRole("slider", { name: "Gravity", exact: true }).focus();
    await page.keyboard.press("End");
    await expect(page.getByTestId("chamber-morphology")).toContainText("Buoyant Teardrop");
    await expect(page.getByTestId("stress-test-sync")).toContainText("Synced");
    expect(errors).toEqual([]);
  });
}

test("slider feedback is immediate while network calls coalesce at 300ms", async ({ page }) => {
  await page.clock.install();
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/api/v1/simulator/stress-test", async (route) => {
    payloads.push(route.request().postDataJSON());
    await route.continue();
  });
  await page.goto("/dashboard");
  await page.clock.runFor(500);
  await expect(page.getByTestId("stress-test-sync")).toContainText("Synced");
  const initial = payloads.length;
  await page.getByRole("slider", { name: "Oxygen concentration", exact: true }).focus();
  for (let i = 0; i < 5; i++) { await page.keyboard.press("ArrowRight"); await page.clock.runFor(40); }
  await expect(page.getByRole("img", { name: /Conceptual combustion visualization: 35% oxygen/ })).toBeVisible();
  expect(payloads).toHaveLength(initial);
  await page.clock.runFor(350);
  await expect.poll(() => payloads.length).toBe(initial + 1);
  expect(payloads.at(-1)?.oxygenLevel).toBe(35);
});

test("API failure is visible and retry recovers without losing the scenario", async ({ page }) => {
  await page.route("**/api/v1/simulator/stress-test", (route) => route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Unavailable" }) }));
  await page.goto("/dashboard");
  await expect(page.getByTestId("stress-test-sync")).toContainText("Unavailable");
  await expect(page.getByRole("button", { name: "Deploy Fine-Water-Mist Suppression", exact: true })).toBeEnabled();
  await page.unroute("**/api/v1/simulator/stress-test");
  await page.getByRole("button", { name: "Retry API sync", exact: true }).click();
  await expect(page.getByTestId("stress-test-sync")).toContainText("Synced");
});

test("suppression visibly shrinks and removes the rendered flame, then restores it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/dashboard");
  await page.clock.runFor(500);
  await expect(page.getByTestId("stress-test-sync")).toContainText("Synced");
  await expect(page.locator(".cc-flame-viewport")).toHaveAttribute("data-ready", "true");
  const burning = await flamePixels(page);
  const sceneTop = await page.locator(".cc-flame-viewport").evaluate((element) => element.getBoundingClientRect().top + scrollY);
  await page.getByRole("button", { name: "Deploy Fine-Water-Mist Suppression", exact: true }).click();
  expect(await page.locator(".cc-flame-viewport").evaluate((element) => element.getBoundingClientRect().top + scrollY)).toBeCloseTo(sceneTop, 0);
  await page.clock.runFor(2200);
  const shrinking = await flamePixels(page);
  expect(shrinking.count).toBeLessThan(burning.count * 0.65);
  await page.clock.runFor(2200);
  await expect(page.getByTestId("nozzle-status")).toContainText("EXTINGUISHED");
  const extinguished = await flamePixels(page);
  expect(extinguished.count).toBeLessThan(burning.count * 0.15);
  await page.getByRole("button", { name: "Re-Ignite Test Sample", exact: true }).click();
  const restored = await flamePixels(page);
  expect(restored.count).toBeGreaterThan(burning.count * 0.9);
});

test("fallback also suppresses and reignites without WebGL", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind === "webgl" || kind === "webgl2") return null;
      return getContext.apply(this, [kind, ...args] as Parameters<typeof getContext>);
    } as typeof getContext;
  });
  await page.goto("/dashboard");
  await expect(page.locator(".cc-flame-fallback svg > g")).toBeVisible();
  await page.getByRole("button", { name: "Deploy Fine-Water-Mist Suppression", exact: true }).click();
  await expect(page.locator(".cc-flame-fallback svg > path")).toBeVisible();
  await expect(page.locator(".cc-flame-fallback svg > g")).toHaveAttribute("opacity", "0", { timeout: 10000 });
  await page.getByRole("button", { name: "Re-Ignite Test Sample", exact: true }).click();
  await expect(page.locator(".cc-flame-fallback svg > g")).not.toHaveAttribute("opacity", "0");
});
