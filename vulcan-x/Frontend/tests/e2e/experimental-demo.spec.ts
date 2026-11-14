import { expect, test, type Page } from "@playwright/test";
import { mockCatalog } from "./helpers/catalog-fixtures";

// Technical contract fixtures only; these responses are not evidence of live inference.
const queryId = "9d755727-8ca2-4c0a-a78c-4d94d3c1137f";
const response = {
  id: queryId, status: "Completed", question: "Experimental habitat demo",
  answer: "Technical test answer, not scientific evidence.", groundingStatus: "NoCitations",
  isMock: true, citations: [], error: null, disclaimer: "Not scientifically validated.",
};

test.beforeEach(async ({ page }) => {
  await mockCatalog(page);
  await page.route("**/api/backend/materials/23", (route) => route.fulfill({
    json: { id: 23, code: "PMMA", name: "Fixture material", category: null, description: null, properties: [] },
  }));
});

async function prepare(page: Page) {
  await page.getByRole("combobox", { name: "Catalog environment", exact: true }).click();
  await page.getByRole("option", { name: "Fixture station — OrbitalStation", exact: true }).click();
  await page.getByRole("combobox", { name: "Catalog material", exact: true }).click();
  await page.getByRole("option", { name: "Fixture material", exact: true }).click();
  await page.getByLabel("Demo oxygen concentration").fill("21");
  await page.getByLabel("Demo pressure").fill("101.325");
  await page.getByRole("checkbox", { name: /I understand this is an experimental AI explanation/ }).check();
}

test("demo is the default, never auto-submits or changes the scientific approval gate", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (r) => { if (r.method() === "POST") posts.push(r.url()); });
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Experimental AI demo", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Experimental habitat AI demo" })).toBeVisible();
  await expect(page.getByLabel("Demo oxygen concentration")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Ask AI about this demo", exact: true })).toBeDisabled();
  expect(posts).toEqual([]);
  await page.getByRole("button", { name: "Live Habitat Analysis", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit persisted Habitat Analysis (scientific fixture required)" })).toBeDisabled();
});

test("sends explicit conditions to Knowledge once, preserves provenance and labels the result unvalidated", async ({ page }) => {
  const bodies: { question: string; environmentId: number; materialId: number }[] = [];
  const habitatPosts: string[] = [];
  page.on("request", (r) => { if (r.method() === "POST" && r.url().endsWith("/habitat-analyses")) habitatPosts.push(r.url()); });
  await page.route("**/api/backend/knowledge/queries", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: response });
  });
  await page.goto("/dashboard");
  await prepare(page);
  await page.getByLabel("Question about this scenario").fill("Which evidence is missing?");
  await page.locator("#experimental-demo-form").evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  await expect(page.getByRole("heading", { name: "Experimental AI demo response" })).toBeVisible();
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({ environmentId: 17, materialId: 23 });
  expect(bodies[0].question).toContain('"material":"Fixture material"');
  expect(bodies[0].question).toContain('"pressureKPa":101.325');
  expect(bodies[0].question).toContain("not scientifically validated");
  expect(habitatPosts).toEqual([]);
  await expect(page.getByText("Mock response — not a live AI result or scientific validation.")).toBeVisible();
  await expect(page.getByLabel("Saved demo query ID")).toHaveValue(queryId);
});

test("provider errors retain the query ID for retrieval and never substitute a synthetic result", async ({ page }) => {
  let posts = 0;
  await page.route("**/api/backend/knowledge/queries", (route) => {
    posts++;
    return route.fulfill({ status: 503, json: { status: 503, title: "Provider unavailable", detail: "Try retrieving the saved query.", queryId } });
  });
  await page.route(`**/api/backend/knowledge/queries/${queryId}`, (route) => route.fulfill({ json: {
    ...response, status: "Failed", answer: null, groundingStatus: null, error: { code: "AI_UNAVAILABLE", message: "Provider unavailable." },
  } }));
  await page.goto("/dashboard");
  await prepare(page);
  await page.getByRole("button", { name: "Ask AI about this demo", exact: true }).click();
  await expect(page.locator(".cc-demo").getByRole("alert")).toContainText("Provider unavailable");
  await expect(page.getByLabel("Saved demo query ID")).toHaveValue(queryId);
  await page.getByRole("button", { name: "Retrieve demo response" }).click();
  await expect(page.getByRole("heading", { name: "Experimental AI demo response" })).toBeVisible();
  await expect(page.getByText("No persisted answer is available for this query.")).toBeVisible();
  expect(posts).toBe(1);
});

test("catalog lookup errors do not submit an unnamed material", async ({ page }) => {
  let posts = 0;
  await page.route("**/api/backend/materials/23", (route) => route.fulfill({ status: 503, json: {} }));
  await page.route("**/api/backend/knowledge/queries", (route) => { posts++; return route.fulfill({ status: 201, json: response }); });
  await page.goto("/dashboard");
  await prepare(page);
  await page.getByRole("button", { name: "Ask AI about this demo", exact: true }).click();
  await expect(page.locator(".cc-demo").getByRole("alert")).toContainText("Demo request could not be completed");
  expect(posts).toBe(0);
});

test("cancelled or unmounted demo requests abort and late results cannot replace a newer request", async ({ page }) => {
  await page.goto("/dashboard");
  await prepare(page);
  await page.evaluate(() => {
    const original = window.fetch;
    const pending: { signal: AbortSignal; resolve: (r: Response) => void }[] = [];
    Object.assign(window, { demoPending: pending });
    window.fetch = (input, init) => String(input).endsWith("/api/backend/knowledge/queries")
      ? new Promise<Response>((resolve) => pending.push({ signal: init!.signal as AbortSignal, resolve }))
      : original(input, init);
  });
  await page.getByRole("button", { name: "Ask AI about this demo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel demo request" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { demoPending: unknown[] }).demoPending.length)).toBe(1);
  await page.getByRole("button", { name: "Cancel demo request" }).click();
  await page.getByRole("button", { name: "Ask AI about this demo", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { demoPending: unknown[] }).demoPending.length)).toBe(2);
  await page.evaluate((payload) => {
    const pending = (window as unknown as { demoPending: { signal: AbortSignal; resolve: (r: Response) => void }[] }).demoPending;
    if (!pending[0].signal.aborted) throw new Error("Cancelled signal was not aborted");
    pending[0].resolve(Response.json(payload, { status: 201 }));
  }, response);
  await expect(page.getByRole("heading", { name: "Experimental AI demo response" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel demo request" })).toBeVisible();
  await page.getByRole("button", { name: "Live Habitat Analysis", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { demoPending: { signal: AbortSignal }[] }).demoPending[1].signal.aborted)).toBe(true);
});

for (const width of [320, 768, 1440]) {
  test(`demo remains usable at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/dashboard");
    await page.locator("html").evaluate((e) => { e.style.fontSize = "200%"; });
    await expect(page.getByRole("heading", { name: "Experimental habitat AI demo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ask AI about this demo", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
