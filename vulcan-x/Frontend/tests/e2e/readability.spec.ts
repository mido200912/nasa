import { expect, test } from "@playwright/test";

for (const width of [320, 375, 414, 768, 1024, 1440]) {
  test(`reading text and supporting labels stay comfortable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    for (const selector of [".engine-card > p:not(.fine-print)", ".bridge-output p", ".pipeline-stage > p", ".architecture-heading > p", ".paradox-copy > p:not(.fine-print)", ".telemetry-note"]) {
      const sizes = await page.locator(selector).evaluateAll((elements) => elements.map((element) => ({ size: parseFloat(getComputedStyle(element).fontSize), leading: parseFloat(getComputedStyle(element).lineHeight) / parseFloat(getComputedStyle(element).fontSize), family: getComputedStyle(element).fontFamily })));
      expect(sizes.length).toBeGreaterThan(0);
      for (const style of sizes) {
        expect(style.size, selector).toBeGreaterThanOrEqual(16);
        expect(style.leading, selector).toBeGreaterThanOrEqual(1.5);
        expect(style.family, selector).not.toContain("Condensed");
      }
    }
    for (const selector of [".pipeline-status", ".pipeline-stage h3 > span", ".fine-print", ".range-labels", ".risk-row .mono", ".playbook-empty .mono", ".telemetry-context", ".comparison-provenance", ".hero-bottom > a"]) {
      for (const size of await page.locator(selector).evaluateAll((elements) => elements.map((element) => parseFloat(getComputedStyle(element).fontSize)))) expect(size, selector).toBeGreaterThanOrEqual(12);
    }
    await expect(page.getByLabel("Incident scenario")).toHaveCSS("font-size", "16px");
    const issues = await page.locator(".engine-card, .pipeline-stage, .telemetry-panel").evaluateAll((elements) => elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.className));
    expect(issues).toEqual([]);
    await page.getByText("Reading these values", { exact: true }).click();
    const card = await page.locator(".telemetry-panel").boundingBox();
    const hero = await page.locator(".command-hero").boundingBox();
    expect(card!.y + card!.height + 60).toBeLessThanOrEqual(hero!.y + hero!.height);
  });
}

test("preview and architecture content reflows with 200% text sizing", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto("/");
  await page.locator("html").evaluate((element) => { element.style.fontSize = "200%"; });
  const issues = await page.locator(".engine-card, .pipeline-stage").evaluateAll((elements) => elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.className));
  expect(issues).toEqual([]);
  await page.getByRole("slider", { name: "Oxygen concentration" }).fill("25");
  await page.getByRole("switch", { name: "Terrestrial engineering mode" }).click();
  await expect(page.getByRole("heading", { name: "Fine-water-mist suppression" })).toBeVisible();
});
