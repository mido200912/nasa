import { expect, test, type Page } from "@playwright/test";

// Contract fixtures only: these tests do not claim live database/AI coverage.
const queryId = "9d755727-8ca2-4c0a-a78c-4d94d3c1137f";
const completed = {
  id: queryId, status: "Completed", question: "What evidence should a reviewer consult?",
  answer: "AI interpretation for review, not validation.", groundingStatus: "HasMatchedCitations", isMock: false,
  citations: [
    { matchStatus: "Matched", source: { id: 7, title: "Fixture catalog source", doi: "fixture-doi", url: "https://example.test/source" }, rawTitle: null, rawUrl: null, excerpt: null, relevanceScore: null },
    { matchStatus: "Unmatched", source: null, rawTitle: "Unverified fixture title", rawUrl: "https://unverified.example", excerpt: null, relevanceScore: null },
  ], error: null, disclaimer: "AI-generated answer; verify cited sources.",
};

async function openLive(page: Page) {
  await page.route("**/api/backend/environments", (route) => route.fulfill({ json: [{ id: 17, code: "ISS", name: "Fixture station", type: "OrbitalStation", description: null }] }));
  await page.route("**/api/backend/materials?*", (route) => route.fulfill({ json: { items: [], page: 1, pageSize: 50, totalCount: 0 } }));
  await page.goto("/dashboard/playbook");
  await page.getByRole("button", { name: "Live Knowledge", exact: true }).click();
}

async function prepareQuestion(page: Page) {
  await page.getByRole("combobox", { name: "Catalog environment", exact: true }).click();
  await page.getByRole("option", { name: "Fixture station — OrbitalStation", exact: true }).click();
  await page.getByLabel("Research question", { exact: true }).fill(completed.question);
}

test("requires an explicit catalog selection, submits once, renders citations and retrieves", async ({ page }) => {
  const bodies: unknown[] = [];
  await page.route("**/api/backend/knowledge/queries", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: completed });
  });
  await page.route(`**/api/backend/knowledge/queries/${queryId}`, (route) => route.fulfill({ json: completed }));
  await openLive(page);
  await page.getByLabel("Research question", { exact: true }).fill(completed.question);
  await expect(page.getByRole("button", { name: "Ask live Knowledge service" })).toBeDisabled();
  await expect(page.getByText("Select a catalog environment before asking a live question.", { exact: true })).toBeVisible();
  await prepareQuestion(page);
  // Two synchronous submit events must still produce only one persisted POST.
  await page.locator("form").evaluate((element) => { const form = element as HTMLFormElement; form.requestSubmit(); form.requestSubmit(); });
  await expect(page.getByRole("heading", { name: "Persisted Knowledge response" })).toBeVisible();
  expect(bodies).toEqual([{ question: completed.question, environmentId: 17, materialId: null, yearFrom: null, yearTo: null, maxSources: 5, language: "en" }]);
  await expect(page.getByRole("link", { name: "Fixture catalog source", exact: true })).toHaveAttribute("href", "https://example.test/source");
  await expect(page.getByText(/Unmatched \/ unverified/)).toBeVisible();
  await expect(page.locator('a[href="https://unverified.example"]')).toHaveCount(0);
  await expect(page.getByText(/local citation-matching outcome, not scientific verification/)).toBeVisible();
  await expect(page.getByLabel("Persisted query ID")).toHaveValue(queryId);
  await page.getByRole("button", { name: "Retrieve", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Persisted Knowledge response" })).toBeVisible();
});

test("preserves an error query ID for retrying retrieval, including Failed and no-citation records", async ({ page }) => {
  await page.route("**/api/backend/knowledge/queries", (route) => route.fulfill({ status: 504, json: { status: 504, title: "AI timed out", detail: "Safe failure.", errorCode: "VULCANX_TIMEOUT", queryId } }));
  await page.route(`**/api/backend/knowledge/queries/${queryId}`, (route) => route.fulfill({ json: { ...completed, status: "Failed", answer: null, groundingStatus: null, citations: [], error: { code: "VULCANX_TIMEOUT", message: "The persisted query failed." } } }));
  await openLive(page);
  await prepareQuestion(page);
  await page.getByRole("button", { name: "Ask live Knowledge service" }).click();
  await expect(page.getByRole("heading", { name: "AI timed out" })).toBeVisible();
  await expect(page.getByLabel("Persisted query ID")).toHaveValue(queryId);
  await page.getByRole("button", { name: "Retrieve", exact: true }).click();
  await expect(page.getByText("The persisted query failed.", { exact: true })).toBeVisible();
  await expect(page.getByText("No citations were returned. This answer is not source-verified.", { exact: true })).toBeVisible();
  await page.route(`**/api/backend/knowledge/queries/${queryId}`, (route) => route.fulfill({ json: { ...completed, isMock: true, citations: [], groundingStatus: "NoCitations" } }));
  await page.getByRole("button", { name: "Retrieve", exact: true }).click();
  await expect(page.getByText(/Mock response.*not a live AI result/)).toBeVisible();
});

test("cancelled requests cannot unlock or replace a newer request and mode switches abort", async ({ page }) => {
  await openLive(page);
  await prepareQuestion(page);
  await page.evaluate(() => {
    const original = window.fetch;
    const pending: { signal: AbortSignal; resolve: (response: Response) => void }[] = [];
    Object.assign(window, { knowledgePending: pending });
    window.fetch = (input, init) => String(input).includes("/knowledge/queries")
      ? new Promise<Response>((resolve) => pending.push({ signal: init!.signal as AbortSignal, resolve }))
      : original(input, init);
  });
  await page.getByRole("button", { name: "Ask live Knowledge service" }).click();
  await page.getByRole("button", { name: "Cancel request" }).click();
  await expect(page.getByText(/Cancellation does not delete a query/)).toBeVisible();
  await page.getByRole("button", { name: "Ask live Knowledge service" }).click();
  await page.evaluate((query) => {
    const pending = (window as unknown as { knowledgePending: { signal: AbortSignal; resolve: (response: Response) => void }[] }).knowledgePending;
    if (!pending[0].signal.aborted) throw new Error("Cancelled signal was not aborted");
    pending[0].resolve(Response.json(query, { status: 201 }));
  }, completed);
  await expect(page.getByRole("button", { name: "Cancel request" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retrieve", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Persisted Knowledge response" })).toHaveCount(0);
  await page.getByRole("button", { name: "Offline Playbook", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { knowledgePending: { signal: AbortSignal }[] }).knowledgePending[1].signal.aborted)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Generate outline", exact: true }).click();
  await expect(page.getByText("Preview complete · engineering review required", { exact: true })).toBeVisible();
});

test("offline Playbook works with all backend requests unavailable", async ({ page }) => {
  const requests: string[] = [];
  await page.route("**/api/backend/**", (route) => { requests.push(route.request().url()); return route.abort(); });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard/playbook");
  await page.getByRole("button", { name: "Generate outline", exact: true }).click();
  await expect(page.getByText("Preview complete · engineering review required", { exact: true })).toBeVisible();
  await expect(page.getByText("Offline educational preview", { exact: true })).toBeVisible();
  expect(requests.filter((url) => url.includes("/knowledge/"))).toEqual([]);
});

for (const width of [320, 768, 1440]) {
  test(`live Knowledge and persisted results fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.route(`**/api/backend/knowledge/queries/${queryId}`, (route) => route.fulfill({ json: completed }));
    await openLive(page);
    await page.getByLabel("Persisted query ID").fill(queryId);
    await page.getByRole("button", { name: "Retrieve", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Persisted Knowledge response" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
