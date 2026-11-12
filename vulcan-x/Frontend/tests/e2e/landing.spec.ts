import { expect, test } from "@playwright/test";

test("scene labels synchronize the active planet card", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Earth", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Focus Mars in explorer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mars", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Focus Earth in explorer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Earth", exact: true })).toBeVisible();
});

test("hero omits removed command labels", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("MISSION CONTROL", { exact: false })).toHaveCount(0);
  await expect(page.getByText("UNDERSTAND THE FIRE. PROTECT THE MISSION.", { exact: true })).toHaveCount(0);
  await expect(page.locator(".hero-topline")).toHaveCount(0);
  await expect(page.locator(".status-dot")).toHaveCount(0);
  expect(await page.locator(".command-hero").evaluate((element) => getComputedStyle(element, "::before").backgroundImage)).toBe("none");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("interactive previews work without claiming real AI inference", async ({ page }) => {
  await page.goto("/");
  const slider = page.getByRole("slider", { name: "Oxygen concentration" });
  await slider.fill("21");
  const baseline = await page.getByTestId("risk-score").textContent();
  await slider.fill("35");
  expect(Number(await page.getByTestId("risk-score").textContent())).toBeGreaterThan(Number(baseline));
  await page.getByRole("switch", { name: "Terrestrial engineering mode" }).click();
  await expect(page.getByText("Terrestrial engineering spec", { exact: true })).toBeVisible();
  await page.getByLabel("Incident scenario").selectOption("arc");
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(page.getByText("Preview complete · engineering review required")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Use the approved electrical-isolation procedure.")).toBeVisible();
  await page.getByLabel("Incident scenario").selectOption("dust");
  await expect(page.getByText("Select a scenario to build a response outline.")).toBeVisible();
});

for (const width of [320, 375, 414, 768, 1440]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({ screen: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.screen);
    const card = await page.locator(".telemetry-panel").boundingBox();
    const hero = await page.locator(".command-hero").boundingBox();
    if (!card || !hero) throw new Error("Planet card did not render");
    expect(card.y + card.height + 60).toBeLessThanOrEqual(hero.y + hero.height);
    await expect(page.getByRole("button", { name: "Focus Earth in explorer", exact: true })).toBeVisible();
  });
}

test("WebGL is single-context and stops continuous rendering below hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.locator("#architecture").scrollIntoViewIfNeeded();
  await expect(page.locator(".orbital-canvas")).toHaveAttribute("data-rendering", "on-demand");
});

test("reduced motion uses on-demand rendering", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".orbital-canvas")).toHaveAttribute("data-rendering", "on-demand");
  const marsLabel = page.getByRole("button", { name: "Focus Mars in explorer", exact: true });
  await expect(marsLabel).toBeVisible();
  const initial = await marsLabel.boundingBox();
  if (!initial) throw new Error("Mars label did not render");
  await marsLabel.click();
  await expect(page.getByRole("heading", { name: "Mars", exact: true })).toBeVisible();
  const after = await marsLabel.boundingBox();
  expect(Math.abs(after!.x - initial.x)).toBeGreaterThan(5);
  await expect(marsLabel).toContainText("IN FOCUS");
});

test("scene compiles shaders without browser errors and planet labels select nodes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Focus Mars in explorer", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Focus Mars in explorer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mars", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("scene planet labels are keyboard operable", async ({ page }) => {
  await page.goto("/");
  const mars = page.getByRole("button", { name: "Focus Mars in explorer", exact: true });
  await mars.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Mars", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Focus Venus in explorer", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("heading", { name: "Venus", exact: true })).toBeVisible();
});

test("touch swiping rotates the mobile orbit", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 900 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("/");
  const neptune = page.getByRole("button", { name: "Focus Neptune in explorer", exact: true });
  await expect(neptune).toBeVisible();
  const initial = await neptune.boundingBox();
  if (!initial) throw new Error("Neptune did not render");
  const canvas = await page.locator("canvas").boundingBox();
  if (!canvas) throw new Error("Canvas did not render");
  const client = await context.newCDPSession(page);
  const y = canvas.y + canvas.height * 0.75;
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 280, y }] });
  for (let step = 1; step <= 12; step++) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 280 - step * 18, y }] });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => Math.abs((await neptune.boundingBox())!.x - initial.x)).toBeGreaterThan(10);
  await expect(page.getByRole("button", { name: "Focus Mars in explorer", exact: true })).toContainText("IN FOCUS");
  await expect(page.getByRole("heading", { name: "Mars", exact: true })).toBeVisible();
  await context.close();
});

test("planetary explorer shows all eight planets on a Sun-free curved path", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page.getByRole("group", { name: "Orbital view", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Focus Neptune in explorer", exact: true })).toBeVisible();
  await expect(page.getByText("Sun", { exact: true })).toHaveCount(0);
  await expect(page.locator(".solar-sun-label")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Focus .+ in explorer$/ })).toHaveCount(8);
  for (const planet of ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]) {
    await page.getByRole("button", { name: `Focus ${planet} in explorer`, exact: true }).click();
    await expect(page.getByRole("region", { name: "Solar body information" })).toContainText(planet);
    const label = page.getByRole("button", { name: `Focus ${planet} in explorer`, exact: true });
    await expect(label).toBeVisible();
    await expect(label).toContainText("IN FOCUS");
  }
  await expect(page.locator("canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("right-hand card follows all eight active planets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Earth", exact: true })).toBeVisible();
  const temperatures = { Mercury: "167", Venus: "464", Earth: "15", Mars: "−65", Jupiter: "−110", Saturn: "−140", Uranus: "−195", Neptune: "−200" };
  for (const [planet, temperature] of Object.entries(temperatures)) {
    await page.getByRole("button", { name: `Focus ${planet} in explorer`, exact: true }).click();
    const card = page.getByRole("complementary", { name: `${planet} planetary profile`, exact: true });
    await expect(card.getByRole("heading", { name: planet, exact: true })).toBeVisible();
    await expect(card.locator(".metric-grid")).toContainText(temperature);
    await expect(card.locator(".metric-grid > div")).toHaveCount(4);
    await expect(card).not.toContainText("scenario remains selected");
    await expect(card).not.toContainText("Burn rate");
    await expect(card.getByRole("link", { name: "NASA facts" })).toHaveAttribute("href", /nasa\.gov\/planetary\/factsheet/);
  }
});

test("rapid planet changes settle on the latest profile with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Focus Neptune in explorer", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Focus .+ in explorer$/ }).evaluateAll((buttons) => {
    for (const planet of ["Jupiter", "Venus", "Neptune"]) {
      (buttons.find((button) => button.getAttribute("aria-label") === `Focus ${planet} in explorer`) as HTMLButtonElement)?.click();
    }
  });
  await expect(page.getByRole("heading", { name: "Neptune", exact: true })).toBeVisible();
  await expect(page.locator(".telemetry-panel")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Focus Neptune in explorer", exact: true })).toContainText("IN FOCUS");
});

test("focused description is grouped with the scene, not detached below it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  const focus = page.getByRole("button", { name: "Focus Earth in explorer", exact: true });
  await expect(focus).toBeVisible();
  const label = await focus.boundingBox();
  const description = await page.getByRole("region", { name: "Solar body information" }).boundingBox();
  if (!label || !description) throw new Error("Explorer did not render");
  expect(description.width).toBeLessThanOrEqual(400);
  expect(description.y - (label.y + label.height)).toBeLessThan(12);
  expect(Math.abs(description.x + description.width/2 - (label.x + label.width/2))).toBeLessThan(2);
});

test("selecting a planet brings it into the large foreground spotlight", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const earth = page.getByRole("button", { name: "Focus Earth in explorer", exact: true });
  const neptune = page.getByRole("button", { name: "Focus Neptune in explorer", exact: true });
  await expect(earth).toContainText("IN FOCUS");
  const initialEarth = await earth.boundingBox();
  const initialNeptune = await neptune.boundingBox();
  if (!initialEarth || !initialNeptune) throw new Error("Explorer did not render");
  expect(initialEarth.y).toBeGreaterThan(initialNeptune.y);
  await neptune.click();
  await expect(neptune).toContainText("IN FOCUS");
  await expect(earth).not.toContainText("IN FOCUS");
  await expect.poll(async () => {
    const box = await neptune.boundingBox();
    return box ? Math.abs(box.x + box.width/2 - (initialEarth.x + initialEarth.width/2)) : Infinity;
  }).toBeLessThan(5);
});

test("reduced-motion focus labels stay attached through consecutive selections", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const earth = page.getByRole("button", { name: "Focus Earth in explorer", exact: true });
  await expect(earth).toBeVisible();
  const origin = await earth.boundingBox();
  if (!origin) throw new Error("Explorer did not render");
  for (const planet of ["Jupiter", "Saturn", "Uranus", "Neptune", "Earth"]) {
    await page.getByRole("button", { name: `Focus ${planet} in explorer`, exact: true }).click();
    const label = page.getByRole("button", { name: `Focus ${planet} in explorer`, exact: true });
    await expect(label).toContainText("IN FOCUS");
    await expect.poll(async () => {
      const box = await label.boundingBox();
      return box ? Math.abs(box.x + box.width / 2 - (origin.x + origin.width / 2)) : Infinity;
    }).toBeLessThan(2);
  }
});

test("dragging advances the focused planet and synchronizes its card", async ({ page }) => {
  await page.goto("/");
  const neptune = page.getByRole("button", { name: "Focus Neptune in explorer", exact: true });
  await expect(neptune).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const initial = await neptune.boundingBox();
  const canvas = await page.locator("canvas").boundingBox();
  if (!initial || !canvas) throw new Error("Solar system did not render");
  const x = canvas.x + canvas.width * 0.5;
  const y = canvas.y + canvas.height * 0.1;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 100, y, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await neptune.boundingBox())!.x - initial.x)).toBeGreaterThan(12);
  await expect(page.getByRole("button", { name: "Focus Mars in explorer", exact: true })).toContainText("IN FOCUS");
  await expect(page.getByRole("heading", { name: "Mars", exact: true })).toBeVisible();
});

test("solar system occupies the wide desktop area beside telemetry", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Focus Neptune in explorer", exact: true })).toBeVisible();
  const scene = await page.locator(".orbital-canvas").boundingBox();
  const telemetry = await page.locator(".telemetry-position").boundingBox();
  if (!scene || !telemetry) throw new Error("Solar layout did not render");
  expect(scene.y).toBeCloseTo(248, 0);
  expect(scene.height).toBeCloseTo(504, 0);
  expect(telemetry.y).toBeCloseTo(112, 0);
  expect(scene.width / 1440).toBeGreaterThanOrEqual(0.7);
  expect(scene.width / 1440).toBeLessThanOrEqual(0.76);
  expect(scene.x + scene.width).toBeLessThanOrEqual(telemetry.x + 5);
});

test("only the solar system remains and the right-hand card aligns with the intro", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Habitat focus", exact: true })).toHaveCount(0);
  await expect(page.locator(".scene-view-switch")).toHaveCount(0);
  const card = await page.locator(".telemetry-position").boundingBox();
  const intro = await page.locator(".hero-intro").boundingBox();
  if (!card || !intro) throw new Error("Hero did not render");
  expect(Math.abs(card.y - intro.y)).toBeLessThanOrEqual(4);
  expect(card.y).toBeLessThan(200);
  await expect(page.getByRole("button", { name: "Focus Neptune in explorer", exact: true })).toBeVisible();
});

test("planet references remain usable when WebGL is unavailable", async ({ playwright, baseURL }) => {
  const browser = await playwright.chromium.launch({ channel: "chromium", args: ["--disable-webgl"] });
  try {
    const page = await browser.newPage();
    await page.goto(baseURL!);
    await expect(page.getByText("3D view unavailable.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Focus Saturn in explorer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Saturn", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Focus Mars in explorer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Mars", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 375, height: 900 });
    await page.getByRole("button", { name: "Focus Neptune in explorer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Neptune", exact: true })).toBeVisible();
    const description = await page.getByRole("region", { name: "Solar body information" }).boundingBox();
    const card = await page.locator(".telemetry-panel").boundingBox();
    if (!description || !card) throw new Error("Fallback layout did not render");
    expect(description.y + description.height).toBeLessThan(card.y);
  } finally {
    await browser.close();
  }
});
