import { expect, test } from "@playwright/test";

for (const width of [320, 375, 414, 768, 1024, 1440]) {
  test(`planetary dossier keeps facts readable and sources accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    const card = page.getByRole("complementary", { name: "Earth planetary profile", exact: true });
    await expect(card.getByRole("heading", { name: "Earth", exact: true })).toBeVisible();
    await expect(card.getByRole("heading", { name: "Environment", exact: true })).toBeVisible();
    await expect(card.locator(".telemetry-status > span")).toHaveCount(0);
    await expect(card.locator(".metric-grid > div")).toHaveCount(4);
    const rows = await card.locator(".metric-grid > div").evaluateAll((elements) => elements.map((element) => {
      const label = element.querySelector("dt")!.getBoundingClientRect();
      const value = element.querySelector("dd")!.getBoundingClientRect();
      return { separated: label.right <= value.left, sameRow: Math.abs(label.y + label.height / 2 - value.y - value.height / 2) < 8, overflow: element.scrollWidth > element.clientWidth + 1 };
    }));
    expect(rows.every((row) => row.separated && row.sameRow && !row.overflow)).toBe(true);
    await expect(card.getByText(/not live telemetry/)).toBeVisible();
    const notes = card.locator("details");
    await expect(notes).not.toHaveAttribute("open");
    await notes.getByText("Reading these values", { exact: true }).click();
    await expect(notes).toHaveAttribute("open", "");
    await expect(notes).toContainText("Equatorial diameter and effective gravity");
    await expect(card.getByRole("link", { name: "NASA facts" })).toHaveAttribute("href", /nasa\.gov/);
    await expect(card.getByRole("link", { name: "Data notes" })).toHaveAttribute("href", /planetfact_notes/);
    await card.getByRole("link", { name: "NASA facts" }).focus();
    await expect(card.getByRole("link", { name: "NASA facts" })).toBeFocused();
    const bounds = await card.boundingBox();
    const hero = await page.locator(".command-hero").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(hero!.y + hero!.height);
  });
}

test("dossier disclosure follows the selected planet's scientific qualifications", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Focus Jupiter in explorer", exact: true }).click();
  const card = page.getByRole("complementary", { name: "Jupiter planetary profile", exact: true });
  await expect(card).toContainText(/no solid surface/i);
  await card.getByText("Reading these values", { exact: true }).click();
  await expect(card.locator("details")).toContainText("1-bar level; no solid surface");
  await page.getByRole("button", { name: "Focus Venus in explorer", exact: true }).click();
  const venus = page.getByRole("complementary", { name: "Venus planetary profile", exact: true });
  await venus.getByText("Reading these values", { exact: true }).click();
  await expect(venus.locator("details")).toContainText("Retrograde rotation");
});
