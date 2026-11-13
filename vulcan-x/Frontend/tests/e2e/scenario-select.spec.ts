import { expect, test } from "@playwright/test";

for (const width of [320, 375, 414, 768, 1440]) {
  test(`incident picker has readable dark options at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const picker = page.getByRole("combobox", { name: "Incident scenario", exact: true });
    await expect(picker).toHaveText("Electrical arc");
    expect((await picker.boundingBox())!.height).toBeLessThanOrEqual(50);
    await picker.click();
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    await expect(list.getByRole("option")).toHaveCount(3);
    await expect(list.getByRole("option", { name: /Electrical arc/ })).toHaveAttribute("aria-selected", "true");
    await expect(list.locator(".scenario-location, .scenario-menu-label, .scenario-check")).toHaveCount(0);
    const box = await list.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(8);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width - 8);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(800);
    await list.getByRole("option", { name: /Dust contamination/ }).click();
    await expect(list).toHaveCount(0);
    await expect(picker).toContainText("Dust contamination");
    await expect(picker).toHaveText("Dust contamination");
    await expect(picker).toBeFocused();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Generate preview", exact: true }).click();
    await expect(page.locator(".playbook-output pre")).toContainText("Flag the airlock contamination event.");
  });
}

test("picker supports keyboard selection, typeahead and Escape without changing the choice", async ({ page }) => {
  await page.goto("/");
  const picker = page.getByRole("combobox", { name: "Incident scenario", exact: true });
  await picker.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(page.getByRole("option", { name: /Electrical arc/ })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: /Dust contamination/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(picker).toContainText("Dust contamination");
  await expect(picker).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: /Dust contamination/ })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("option", { name: /Electrical arc/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(picker).toContainText("Dust contamination");
  await expect(picker).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(page.getByRole("option", { name: /Dust contamination/ })).toBeFocused();
  await page.keyboard.press("s");
  await expect(page.getByRole("option", { name: /Smoke detection/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(picker).toContainText("Smoke detection");
  await expect(picker).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Generate preview", exact: true })).toBeFocused();
});

test("picker is locked during streaming, unlocks on stop and clears stale output on a new choice", async ({ page }) => {
  await page.goto("/");
  const picker = page.getByRole("combobox", { name: "Incident scenario", exact: true });
  await page.getByRole("button", { name: "Generate preview", exact: true }).click();
  await expect(picker).toBeDisabled();
  await page.getByRole("button", { name: "Stop preview", exact: true }).click();
  await expect(picker).toBeEnabled();
  await picker.click();
  await page.getByRole("option", { name: /Smoke detection/ }).click();
  await expect(page.getByText("Select a scenario to build a response outline.", { exact: true })).toBeVisible();
  await picker.click();
  await page.mouse.click(4, 100);
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(picker).toContainText("Smoke detection");
});

test("picker reflows at 200% text size", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 960 });
  await page.goto("/");
  await page.locator("html").evaluate((element) => { element.style.fontSize = "200%"; });
  await page.getByRole("combobox", { name: "Incident scenario", exact: true }).click();
  const list = page.getByRole("listbox");
  for (const option of await list.getByRole("option").all()) {
    expect(await option.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
  await list.getByRole("option", { name: /Dust contamination/ }).click();
  await expect(page.getByRole("combobox")).toContainText("Dust contamination");
});

test("picker supports touch selection", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const picker = page.getByRole("combobox", { name: "Incident scenario", exact: true });
    await picker.tap();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.getByRole("option", { name: /Smoke detection/ }).tap();
    await expect(picker).toContainText("Smoke detection");
    await expect(page.getByRole("listbox")).toHaveCount(0);
  } finally { await context.close(); }
});

for (const mode of ["overlay", "Windows classic"] as const) {
  test(`opening and closing the picker never shifts the cards with ${mode} scrollbars`, async ({ playwright, baseURL }) => {
    test.skip(mode === "Windows classic" && process.platform !== "win32", "Native Windows scrollbar regression");
    const browser = await playwright.chromium.launch({ channel: "chromium", headless: mode === "overlay" });
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(baseURL!);
      const picker = page.getByRole("combobox", { name: "Incident scenario", exact: true });
      await picker.scrollIntoViewIfNeeded();
      const measure = () => page.locator(".engine-card").evaluateAll((elements) => elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { x: box.x, width: box.width };
      }));
      const before = await measure();
      const scroll = await page.evaluate(() => scrollY);
      for (const close of ["Escape", "selection"]) {
        await picker.click();
        await expect(page.getByRole("listbox")).toBeVisible();
        expect(await measure()).toEqual(before);
        expect(await page.evaluate(() => scrollY)).toBe(scroll);
        if (close === "Escape") await page.keyboard.press("Escape");
        else await page.getByRole("option", { name: /Smoke detection/ }).click();
        await expect(page.getByRole("listbox")).toHaveCount(0);
        expect(await measure()).toEqual(before);
      }
    } finally { await browser.close(); }
  });
}
