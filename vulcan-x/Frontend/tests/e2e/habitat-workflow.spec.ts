import { expect, test, type Page } from "@playwright/test";
import { mockCatalog } from "./helpers/catalog-fixtures";

// Approval/response fixtures exercise wiring only, never real scientific approval.
const id = "9d755727-8ca2-4c0a-a78c-4d94d3c1137f";
const analysis = {
  id, status: "Completed", requestedAt: "2026-11-14T00:00:00Z",
  environment: { id: 17, code: "ISS", name: "Fixture station" },
  material: { id: 23, code: "PMMA", name: "Fixture material" },
  inputs: {
    oxygenVolumePercent: { value: 21, origin: "UserProvided", measurementBasis: "VolumePercent" },
    pressureKPa: { value: 101.325, origin: "UserProvided", measurementBasis: null },
    temperatureCelsius: { value: null, origin: "Missing", measurementBasis: null },
    gravity: { regime: null, effectiveGravityG: null, origin: "Missing" },
  },
  result: { riskLabel: "Review", analysisBasis: "LlmInterpretationOnly", isMock: false, isScientificallyValidated: false, explanation: "Technical fixture only, not scientific evidence.", limitations: "Unvalidated.", factors: [], citations: [] },
  error: null, disclaimer: "Not a scientifically validated safety decision.",
};

async function prepare(page: Page) {
  await page.getByRole("combobox", { name: "Catalog environment", exact: true }).click();
  await page.getByRole("option", { name: "Fixture station — OrbitalStation", exact: true }).click();
  await page.getByRole("combobox", { name: "Catalog material", exact: true }).click();
  await page.getByRole("option", { name: "Fixture material", exact: true }).click();
  await page.locator("#habitat-oxygen").fill("21");
  await page.locator("#habitat-pressure").fill("101.325");
}

test.beforeEach(async ({ page }) => { await mockCatalog(page); });

test("gravity uses the shared custom select, supports keyboard selection and keeps unknown distinct from Unspecified", async ({ page }) => {
  await page.route("**/api/backend/habitat-analyses/capabilities", (route) => route.fulfill({ json: { enabled: true } }));
  const bodies: { gravityRegime: string | null }[] = [];
  await page.route("**/api/backend/habitat-analyses", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: analysis });
  });
  await page.goto("/dashboard");
  await prepare(page);
  const gravity = page.getByRole("combobox", { name: "Gravity regime", exact: true });
  await expect(gravity).toHaveAttribute("data-slot", "select-trigger");
  await expect(gravity).toHaveText("Unknown / not supplied");
  await gravity.focus();
  await page.keyboard.press("Space");
  const list = page.getByRole("listbox");
  await expect(list).toHaveClass(/cc-menu/);
  await expect(list.getByRole("option")).toHaveCount(6);
  await page.keyboard.press("r");
  await expect(page.getByRole("option", { name: "ReducedGravity", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(gravity).toHaveText("ReducedGravity");
  await expect(gravity).toBeFocused();
  await gravity.click();
  await page.getByRole("option", { name: "Unspecified", exact: true }).click();
  await page.getByRole("button", { name: "Submit persisted Habitat Analysis", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Persisted analysis result" })).toBeVisible();
  expect(bodies[0].gravityRegime).toBe("Unspecified");
  await gravity.click();
  await page.getByRole("option", { name: "Unknown / not supplied", exact: true }).click();
  await page.getByRole("button", { name: "Submit persisted Habitat Analysis", exact: true }).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1].gravityRegime).toBeNull();
  await gravity.click();
  await page.getByRole("option", { name: "EarthLike", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(gravity).toHaveText("Unknown / not supplied");
  await expect(gravity).toBeFocused();
});

for (const width of [320, 768, 1440]) {
  test(`gravity custom menu fits at ${width}px with enlarged text and does not shift the form`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/dashboard");
    await page.locator("html").evaluate((element) => { element.style.fontSize = "200%"; });
    const gravity = page.getByRole("combobox", { name: "Gravity regime", exact: true });
    await expect(gravity).toHaveAttribute("data-slot", "select-trigger");
    await gravity.scrollIntoViewIfNeeded();
    const before = await gravity.boundingBox();
    await gravity.click();
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    const box = await list.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(8);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width - 8);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(960);
    // Radix hides the background from the accessibility tree while its menu is open.
    const openTrigger = await page.locator("#habitat-gravity-regime").boundingBox();
    expect(Math.abs(openTrigger!.x - before!.x)).toBeLessThan(1);
    await page.getByRole("option", { name: "Microgravity", exact: true }).click();
    await expect(gravity).toHaveText("Microgravity");
    await expect(gravity).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test("live is the default; no canvas or local simulator request runs until offline mode is explicitly selected", async ({ page }) => {
  const localRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/v1/simulator")) localRequests.push(request.url()); });
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Live Habitat Analysis", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("canvas")).toHaveCount(0);
  await prepare(page);
  await expect(page.getByRole("button", { name: "Submit persisted Habitat Analysis (scientific fixture required)", exact: true })).toBeDisabled();
  expect(localRequests).toEqual([]);
  await page.getByRole("button", { name: "Offline simulation", exact: true }).click();
  await expect(page.getByTestId("stress-test-sync")).toContainText("illustrative");
});

test("approval lookup errors fail closed and can be refreshed", async ({ page }) => {
  await page.route("**/api/backend/habitat-analyses/capabilities", (route) => route.fulfill({ status: 503, json: { enabled: true } }));
  await page.goto("/dashboard");
  await expect(page.getByText("The backend approval state is unavailable. Live submission remains disabled.", { exact: true })).toBeVisible();
  await page.route("**/api/backend/habitat-analyses/capabilities", (route) => route.fulfill({ json: { enabled: false } }));
  await page.getByRole("button", { name: "Refresh approval status" }).click();
  await expect(page.getByText(/Live analysis is unavailable until/)).toBeVisible();
});

test("approved contract fixture submits only explicit inputs once and renders a persisted result", async ({ page }) => {
  await page.route("**/api/backend/habitat-analyses/capabilities", (route) => route.fulfill({ json: { enabled: true } }));
  const bodies: unknown[] = [];
  await page.route("**/api/backend/habitat-analyses", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: analysis });
  });
  await page.goto("/dashboard");
  await expect(page.locator("#habitat-oxygen")).toHaveValue("");
  await expect(page.locator("#habitat-pressure")).toHaveValue("");
  await prepare(page);
  await page.locator(".cc-habitat-analysis form").evaluate((element) => {
    const form = element as HTMLFormElement; form.requestSubmit(); form.requestSubmit();
  });
  await expect(page.getByRole("heading", { name: "Persisted analysis result" })).toBeVisible();
  expect(bodies).toEqual([{ environmentId: 17, materialId: 23, oxygenVolumePercent: 21, pressureKPa: 101.325, temperatureCelsius: null, gravityRegime: null, effectiveGravityG: null, additionalParameters: null, language: "en" }]);
  await expect(page.locator(".cc-habitat-result")).toContainText("Scientific validation: Not scientifically validated");
});

test("backend failures retain their saved ID without inserting a synthetic result", async ({ page }) => {
  await page.route("**/api/backend/habitat-analyses/capabilities", (route) => route.fulfill({ json: { enabled: true } }));
  await page.route("**/api/backend/habitat-analyses", (route) => route.fulfill({ status: 504, json: { status: 504, title: "Analysis timed out", analysisId: id } }));
  await page.goto("/dashboard");
  await prepare(page);
  await page.getByRole("button", { name: "Submit persisted Habitat Analysis", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Analysis timed out" })).toBeVisible();
  await expect(page.getByText(/Retained analysis ID:/)).toContainText(id);
  await expect(page.getByRole("heading", { name: "Persisted analysis result" })).toHaveCount(0);
  await expect(page.getByTestId("dashboard-risk-score")).toHaveCount(0);
});

test("cancellation and workspace changes abort pending analysis without letting late results replace a new request", async ({ page }) => {
  await page.route("**/api/backend/habitat-analyses/capabilities", (route) => route.fulfill({ json: { enabled: true } }));
  await page.goto("/dashboard");
  await prepare(page);
  await page.evaluate(() => {
    const original = window.fetch;
    const pending: { signal: AbortSignal; resolve: (response: Response) => void }[] = [];
    Object.assign(window, { habitatPending: pending });
    window.fetch = (input, init) => String(input).endsWith("/api/backend/habitat-analyses")
      ? new Promise<Response>((resolve) => pending.push({ signal: init!.signal as AbortSignal, resolve }))
      : original(input, init);
  });
  await page.getByRole("button", { name: "Submit persisted Habitat Analysis", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Gravity regime", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancel analysis request", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Gravity regime", exact: true })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Analysis request cancelled" })).toBeVisible();
  await page.getByRole("button", { name: "Submit persisted Habitat Analysis", exact: true }).click();
  await page.evaluate((result) => {
    const pending = (window as unknown as { habitatPending: { signal: AbortSignal; resolve: (response: Response) => void }[] }).habitatPending;
    if (!pending[0].signal.aborted) throw new Error("First request was not aborted");
    pending[0].resolve(Response.json(result, { status: 201 }));
  }, analysis);
  await expect(page.getByRole("button", { name: "Cancel analysis request", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Persisted analysis result" })).toHaveCount(0);
  await page.getByRole("button", { name: "Offline simulation", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { habitatPending: { signal: AbortSignal }[] }).habitatPending[1].signal.aborted)).toBe(true);
});
