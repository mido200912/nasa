import { expect, test } from "@playwright/test";
import { mockCatalog } from "./helpers/catalog-fixtures";

test.beforeEach(async ({ page }) => { await mockCatalog(page); });

test("landing selection launches the shared Mars scenario and preserves it on return", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Focus Mars in explorer", exact: true }).click();
  await page.getByRole("link", { name: "Launch simulator" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Offline simulation", exact: true }).click();
  await expect(page.locator(".cc-telemetry")).toContainText("Mars habitat");
  await expect(page.getByRole("slider", { name: "Gravity", exact: true })).toHaveAttribute("aria-valuenow", "0.38");
  await page.getByRole("link", { name: "Planetary explorer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mars", exact: true })).toBeVisible();
});

test("presets, custom sliders, material changes and session reload stay synchronized", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Offline simulation", exact: true }).click();
  await expect(page.getByTestId("burn-multiplier")).toContainText("3.5×");
  await page.getByRole("combobox", { name: "Illustrative WebGL scenario", exact: true }).click();
  await page.getByRole("option", { name: "ISS lab", exact: true }).click();
  await expect(page.getByText("Spherical cool diffusion", { exact: true })).toBeVisible();
  const oxygen = page.getByRole("slider", { name: "Oxygen concentration", exact: true });
  await oxygen.focus(); await page.keyboard.press("End");
  await expect(oxygen).toHaveAttribute("aria-valuenow", "40");
  await expect(page.getByRole("combobox", { name: "Illustrative WebGL scenario", exact: true })).toContainText("Custom what-if");
  await expect(page.getByRole("combobox", { name: "Environment preset", exact: true })).toHaveCount(0);
  await expect(page.locator(".cc-telemetry")).toContainText("Offline scenario preview / custom");
  await page.getByRole("combobox", { name: "Illustrative material scenario", exact: true }).click();
  await page.getByRole("option", { name: "Teflon / PTFE", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Offline simulation", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Oxygen concentration", exact: true })).toHaveAttribute("aria-valuenow", "40");
  await expect(page.getByRole("combobox", { name: "Illustrative material scenario", exact: true })).toContainText("Teflon / PTFE");
  await page.getByRole("button", { name: "Reset scenario", exact: true }).click();
  await expect(page.getByTestId("burn-multiplier")).toContainText("3.5×");
});

test("playbook streams, stops, regenerates, checks items and exports qualified context", async ({ page }) => {
  await page.goto("/dashboard/playbook");
  await expect(page.getByRole("button", { name: "Export protocol" })).toBeDisabled();
  await page.getByRole("button", { name: "Battery thermal runaway", exact: true }).click();
  await page.getByRole("button", { name: "Generate outline", exact: true }).click();
  await expect(page.getByRole("button", { name: "Electrical cable arc", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Stop preview", exact: true }).click();
  await expect(page.getByText("Preview stopped. Regenerate to complete the outline.")).toBeVisible();
  await page.getByRole("button", { name: "Regenerate outline", exact: true }).click();
  await expect(page.getByText("Preview complete · engineering review required")).toBeVisible();
  await expect(page.locator(".cc-protocol-section")).toHaveCount(4);
  await page.getByRole("checkbox").first().check();
  await expect(page.getByText(/1 \/ 12 items checked/)).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export protocol", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("vulcan-x-review-outline.md");
  await page.getByRole("button", { name: "Unlocated smoke", exact: true }).click();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export protocol" })).toBeDisabled();
});

test("a context change cancels stale playbooks, including an active stream", async ({ page }) => {
  await page.goto("/dashboard/playbook");
  await page.getByRole("button", { name: "Generate outline", exact: true }).click();
  await page.getByRole("link", { name: "Stress-test Atmosphere & materials", exact: true }).click();
  await page.getByRole("button", { name: "Offline simulation", exact: true }).click();
  await page.getByRole("combobox", { name: "Illustrative WebGL scenario", exact: true }).click();
  await page.getByRole("option", { name: "Mars habitat", exact: true }).click();
  await page.getByRole("link", { name: "Safety playbook Research & review", exact: true }).click();
  await expect(page.getByText("Ready for a local preview")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No outline generated", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export protocol" })).toBeDisabled();
  await expect(page.locator(".cc-context")).toContainText("Mars habitat");
});

test("terrestrial mode and target charts are interactive without claiming measured gains", async ({ page }) => {
  await page.goto("/dashboard/earth-bridge");
  const mode = page.getByRole("switch", { name: "Terrestrial impact mode", exact: true });
  await expect(mode).not.toBeChecked(); await mode.click();
  await expect(page.getByText("80%", { exact: false }).last()).toBeVisible();
  await page.getByLabel("Baseline", { exact: true }).nth(1).fill("10");
  await page.getByLabel("Target", { exact: true }).nth(1).fill("12");
  await expect(page.getByText("20%", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Stress-test", exact: false }).click();
  await page.getByRole("link", { name: "Earth bridge", exact: false }).click();
  await expect(mode).toBeChecked();
});

test("material search, empty state, source filter, comparator and simulator selection work", async ({ page }) => {
  await page.goto("/dashboard/materials");
  await page.getByRole("button", { name: "Offline material scenarios", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search materials" }).fill("no match here");
  await expect(page.getByRole("heading", { name: "No materials match" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByRole("combobox", { name: "Research context", exact: true }).click();
  await page.getByRole("option", { name: "SOFIE", exact: true }).click();
  await expect(page.getByText("1 of 6 materials shown.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Use PMMA acrylic in simulator", exact: true }).click();
  await expect(page.getByRole("button", { name: "Use PMMA acrylic in simulator", exact: true })).toBeDisabled();
  await page.getByRole("combobox", { name: "First material", exact: true }).click();
  await page.getByRole("option", { name: "Nomex HT90-40", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Second material", exact: true })).toContainText("Kapton wire insulation");
  await page.getByRole("link", { name: "Adjust atmosphere", exact: true }).click();
  await page.getByRole("button", { name: "Offline simulation", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Illustrative material scenario", exact: true })).toContainText("PMMA acrylic");
});

test("dashboard menus do not shift content and return keyboard focus", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Offline simulation", exact: true }).click();
  // Radix deliberately hides the rest of the accessibility tree while open;
  // measure the same DOM heading rather than querying the hidden role.
  const heading = page.locator(".cc-page-heading h1");
  const initial = await heading.boundingBox();
  const trigger = page.getByRole("combobox", { name: "Illustrative material scenario", exact: true });
  await trigger.click(); await expect(page.getByRole("listbox")).toBeVisible();
  const opened = await heading.boundingBox();
  expect(Math.abs(opened!.x - initial!.x)).toBeLessThan(1);
  await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
});

test("single flame canvas honors reduced motion and offscreen rendering suspension", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Offline simulation", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator(".cc-flame-viewport")).toHaveAttribute("data-rendering", "on-demand");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator(".cc-methodology").scrollIntoViewIfNeeded();
  await expect(page.locator(".cc-flame-viewport")).toHaveAttribute("data-rendering", "on-demand");
  expect(errors).toEqual([]);
});

test("simulator controls and illustration remain usable without WebGL", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind === "webgl" || kind === "webgl2" || kind === "experimental-webgl") return null;
      return original.apply(this, [kind, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Offline simulation", exact: true }).click();
  await expect(page.getByText("3D unavailable · accessible illustration")).toBeVisible();
  await page.getByRole("combobox", { name: "Illustrative WebGL scenario", exact: true }).click();
  await page.getByRole("option", { name: "ISS lab", exact: true }).click();
  await expect(page.getByRole("img", { name: "Conceptual spherical diffusion envelope", exact: true })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Gravity", exact: true })).toHaveAttribute("aria-valuenow", "0");
});

test("reduced-motion playbooks complete immediately and question changes invalidate exports", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard/playbook");
  await page.getByRole("button", { name: "Generate outline", exact: true }).click();
  await expect(page.getByRole("button", { name: "Export protocol" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Stop preview" })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Question for the engineering reviewer" }).fill("<script>alert('test')</script>");
  await expect(page.getByRole("button", { name: "Export protocol" })).toBeDisabled();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});

for (const width of [320, 375, 414, 768, 1024, 1440]) {
  for (const [path, heading] of [["/dashboard", "Habitat Analysis"], ["/dashboard/playbook", "Safety playbook & research console"], ["/dashboard/earth-bridge", "Earth–space dual-use bridge"], ["/dashboard/materials", "Material & experiment matrix"]]) {
    test(`${path} fits at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      const dimensions = await page.evaluate(() => ({ screen: innerWidth, document: document.documentElement.scrollWidth }));
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.screen);
      if (width < 900) {
        await page.getByRole("button", { name: "Open module navigation", exact: true }).click();
        await expect(page.getByRole("navigation", { name: "Simulation modules", exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Close module navigation", exact: true }).click();
      }
    });
  }
}
