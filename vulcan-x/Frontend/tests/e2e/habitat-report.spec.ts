import { expect, test } from "@playwright/test";
import { mockCatalog } from "./helpers/catalog-fixtures";

const id = "9d755727-8ca2-4c0a-a78c-4d94d3c1137f";
const explanation = "Habitat Fire and Combustion Assessment: Lunar Habitat **Qualitative Assessment** - **Oxygen:** At 34% volume, evidence is incomplete. - **Pressure:** Pressure is 2 kPa. **Evidence Gaps and Research Needed** - Missing temperature. " + "Grade-specific tests are needed. ".repeat(35) + "**Sources** – NASA research.";
const saved = {
  id, status: "Completed", requestedAt: "2026-11-14T00:00:00Z",
  environment: { id: 17, code: "LUNAR_HABITAT", name: "Lunar habitat" },
  material: { id: 23, code: "PMMA", name: "PMMA" },
  inputs: {
    oxygenVolumePercent: { value: 34, origin: "UserProvided", measurementBasis: "VolumePercent" },
    pressureKPa: { value: 2, origin: "UserProvided", measurementBasis: null },
    temperatureCelsius: { value: null, origin: "Missing", measurementBasis: null },
    gravity: { regime: "Microgravity", effectiveGravityG: 0, origin: "UserProvided" },
  },
  result: { riskLabel: null, analysisBasis: "LlmInterpretationOnly", isMock: false, isScientificallyValidated: false, explanation, limitations: "Unvalidated technical fixture.", factors: [], citations: [
    { matchStatus: "Unmatched", source: null, rawTitle: null, rawUrl: "https://www.nasa.gov/research/", excerpt: null },
    { matchStatus: "Unmatched", source: null, rawTitle: "Unsafe URL fixture", rawUrl: "javascript:alert(1)", excerpt: null },
  ] },
  generation: { mode: "ProviderInference", provider: "openrouter", model: "technical-fixture" },
  error: null, disclaimer: "Not a scientifically validated safety decision.",
};

async function retrieve(page: import("@playwright/test").Page, response = saved) {
  await mockCatalog(page);
  await page.route(`**/api/backend/habitat-analyses/${id}`, (route) => route.fulfill({ json: response }));
  await page.goto("/dashboard");
  await page.getByLabel("Saved analysis ID", { exact: true }).fill(id);
  await page.getByRole("button", { name: "Retrieve analysis", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Analysis result", exact: true })).toBeVisible();
}

test("saved assessments start compact, expand into formatted sections, and keep technical details secondary", async ({ page }) => {
  await retrieve(page);
  const result = page.locator(".cc-habitat-result");
  await expect(result).toContainText("34%");
  await expect(result).toContainText("2 kPa");
  await expect(result).toContainText("0 g");
  await expect(result).toContainText("Not scientifically validated");
  await expect(result.getByText("Not supplied", { exact: true })).toBeVisible();
  await expect(result.getByRole("button", { name: "Read full assessment" })).toHaveAttribute("aria-expanded", "false");
  await expect(result.getByText("technical-fixture", { exact: false })).not.toBeVisible();
  await result.getByRole("button", { name: "Read full assessment" }).click();
  await expect(result.getByRole("heading", { name: "Evidence Gaps and Research Needed", exact: true })).toBeVisible();
  await expect(result.locator("li strong").filter({ hasText: "Pressure:" })).toBeVisible();
  await expect(result.locator("[data-report-body]")).not.toContainText("**");
  await result.getByRole("button", { name: "Show less" }).click();
  await expect(result.getByRole("heading", { name: "Evidence Gaps and Research Needed", exact: true })).not.toBeVisible();
  await result.locator("summary").filter({ hasText: /^Sources/ }).click();
  await expect(result.getByRole("link", { name: "nasa.gov", exact: true })).toHaveAttribute("href", "https://www.nasa.gov/research/");
  expect(await result.locator('a[href^="javascript:"]').count()).toBe(0);
  await result.getByText("Record details", { exact: true }).click();
  await expect(result).toContainText("openrouter · technical-fixture");
  await expect(result).toContainText(id);
  await result.getByText("Original saved response", { exact: true }).click();
  await expect(result.locator("pre")).toHaveText(explanation);
});

test("AI output cannot inject HTML, remote images or executable links into the report", async ({ page }) => {
  await retrieve(page, { ...saved, result: { ...saved.result, explanation: "## Assessment\n\nA technical fixture only.\n\n<script>window.reportInjected=true</script><img src=\"https://tracking.invalid/pixel\">\n\n![Tracking image](https://tracking.invalid/markdown-pixel)\n\n[Unsafe link](javascript:alert(1))" } });
  const result = page.locator(".cc-habitat-result");
  await result.getByRole("button", { name: "Read full assessment" }).click();
  expect(await page.evaluate(() => (window as unknown as { reportInjected?: boolean }).reportInjected)).toBeUndefined();
  await expect(result.locator("[data-report-body] img, [data-report-body] script")).toHaveCount(0);
  await expect(result.locator('[data-report-body] a[href^="javascript:"]')).toHaveCount(0);
});

for (const width of [320, 375, 414, 768, 1440]) {
  test(`report reflows at ${width}px with enlarged text and expanded disclosures`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await retrieve(page);
    await page.locator("html").evaluate((element) => { element.style.fontSize = "200%"; });
    const result = page.locator(".cc-habitat-result");
    await result.getByRole("button", { name: "Read full assessment" }).click();
    await result.locator("summary").filter({ hasText: /^Sources/ }).click();
    await result.getByText("Record details", { exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const prose = await result.locator("[data-report-body]").boundingBox();
    expect(prose!.width).toBeLessThanOrEqual(width);
  });
}
