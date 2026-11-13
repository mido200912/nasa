import { expect, test } from "@playwright/test";

// Opt-in REAL API/SQL tests. No page.route(), fake IDs or fabricated AI responses.
test.describe("live SQL integration", () => {
  test.skip(process.env.FIRE_SAFETY_LIVE_SQL !== "1", "Requires migrated/seeded dedicated SQL Server, ASP.NET and Vulcan-X.");

  test("eight catalog endpoints, relationships, paging, search and safe missing records", async ({ request }) => {
    const environments = await (await request.get("/api/backend/environments")).json();
    expect(environments.length).toBeGreaterThan(0);
    expect(environments.every((item: { id: number }) => item.id > 0)).toBe(true);
    const materials = await (await request.get("/api/backend/materials?page=1&pageSize=1&search=PMMA")).json();
    expect(materials.items).toHaveLength(1);
    const material = await (await request.get(`/api/backend/materials/${materials.items[0].id}`)).json();
    expect(material.code).toBe("PMMA");
    const experiments = await (await request.get(`/api/backend/experiments?materialId=${material.id}&page=1&pageSize=1`)).json();
    expect(experiments.items).toHaveLength(1);
    const experiment = await (await request.get(`/api/backend/experiments/${experiments.items[0].id}`)).json();
    expect(experiment.materials.some((item: { id: number }) => item.id === material.id)).toBe(true);
    expect(experiment.sources.length).toBeGreaterThan(0);
    const source = await (await request.get(`/api/backend/sources/${experiment.sources[0].id}`)).json();
    expect(source.title).toBe(experiment.sources[0].title);
    const technologies = await (await request.get("/api/backend/technologies?page=1&pageSize=1")).json();
    expect(technologies.items).toHaveLength(1);
    const technology = await (await request.get(`/api/backend/technologies/${technologies.items[0].id}`)).json();
    expect(technology.applications[0].source.id).toBeGreaterThan(0);
    expect((await (await request.get("/api/backend/materials?search=M6_nonexistent_catalog_record")).json()).items).toEqual([]);
    expect((await (await request.get("/api/backend/materials?page=2&pageSize=1")).json()).items).toEqual([]);
    expect((await request.get("/api/backend/materials/2147483647")).status()).toBe(404);
    console.log(`LIVE SQL catalog IDs: environment=${environments[0].id}, material=${material.id}, experiment=${experiment.id}, source=${source.id}, technology=${technology.id}`);
  });

  test("real browser selection, source-bound Knowledge POST and saved-ID retrieval", async ({ page, request }) => {
    test.skip(process.env.FIRE_SAFETY_LIVE_FAILURE === "1", "Vulcan-X intentionally unavailable for separate failure test.");
    const environments = await (await request.get("/api/backend/environments")).json();
    const environment = environments.find((item: { code: string }) => item.code === "ISS");
    const browserBackendRequests: string[] = [];
    page.on("request", (request) => { if (request.url().includes("/api/")) browserBackendRequests.push(request.url()); });
    await page.goto("/dashboard/playbook");
    await page.getByRole("button", { name: "Live Knowledge", exact: true }).click();
    await page.getByRole("combobox", { name: "Catalog environment", exact: true }).click();
    await page.getByRole("option").filter({ hasText: environment.name }).click();
    await page.getByRole("combobox", { name: "Catalog material", exact: true }).click();
    await page.getByRole("option").filter({ hasText: "PMMA" }).click();
    const question = `What do NASA sources say about oxygen and fire in microgravity? M6 ${Date.now()}`;
    await page.getByLabel("Research question", { exact: true }).fill(question);
    const posted = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/backend/knowledge/queries"));
    await page.getByRole("button", { name: "Ask live Knowledge service" }).click();
    const response = await posted;
    expect(response.status()).toBe(201);
    const saved = await response.json();
    expect(saved.status).toBe("Completed");
    expect(saved.answer.length).toBeGreaterThan(0);
    expect(saved.question).toBe(question);
    await expect(page.getByLabel("Persisted query ID")).toHaveValue(saved.id);
    await expect(page.getByText(/local citation-matching outcome, not scientific verification/)).toBeVisible();
    await page.getByRole("button", { name: "Retrieve", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Persisted Knowledge response" })).toBeVisible();
    const retrieved = await (await request.get(`/api/backend/knowledge/queries/${saved.id}`)).json();
    expect(retrieved).toEqual(saved);
    const origin = new URL(page.url()).origin;
    expect(browserBackendRequests.every((url) => url.startsWith(`${origin}/api/backend/`))).toBe(true);
    console.log(`LIVE SQL + actual Vulcan-X source-bound (NOT provider inference) queryId=${saved.id}, status=${saved.status}, grounding=${saved.groundingStatus}`);
  });

  test("scientific fixture gate remains closed in the browser and backend", async ({ page, request }) => {
    const environments = await (await request.get("/api/backend/environments")).json();
    const materials = await (await request.get("/api/backend/materials")).json();
    await page.goto("/dashboard");
    await expect(page.locator("#habitat-oxygen")).toHaveValue("");
    await expect(page.locator("#habitat-pressure")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Submit persisted Habitat Analysis (scientific fixture required)", exact: true })).toBeDisabled();
    const response = await request.post("/api/backend/habitat-analyses", { data: { environmentId: environments[0].id, materialId: materials.items[0].id } });
    expect(response.status()).toBe(422);
    expect((await response.json()).errorCode).toBe("HABITAT_FIXTURE_NOT_APPROVED");
  });

  test("real unavailable Vulcan-X persists a Failed query and exposes its saved ID safely", async ({ page, request }) => {
    test.skip(process.env.FIRE_SAFETY_LIVE_FAILURE !== "1", "Run separately with the actual Vulcan-X process stopped.");
    const environment = (await (await request.get("/api/backend/environments")).json()).find((item: { code: string }) => item.code === "ISS");
    await page.goto("/dashboard/playbook");
    await page.getByRole("button", { name: "Live Knowledge", exact: true }).click();
    await page.getByRole("combobox", { name: "Catalog environment", exact: true }).click();
    await page.getByRole("option").filter({ hasText: environment.name }).click();
    await page.getByLabel("Research question", { exact: true }).fill(`NASA oxygen source unavailable M6 ${Date.now()}`);
    const posted = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/backend/knowledge/queries"));
    await page.getByRole("button", { name: "Ask live Knowledge service" }).click();
    const response = await posted;
    expect(response.status()).toBe(503);
    const problem = await response.json();
    expect(problem.queryId).toMatch(/^[0-9a-f-]{36}$/i);
    await expect(page.getByLabel("Persisted query ID")).toHaveValue(problem.queryId);
    await page.getByRole("button", { name: "Retrieve", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Persisted Knowledge response" })).toBeVisible();
    const saved = await (await request.get(`/api/backend/knowledge/queries/${problem.queryId}`)).json();
    expect(saved.status).toBe("Failed");
    expect(saved.answer).toBeNull();
    console.log(`LIVE SQL + actual unavailable upstream queryId=${problem.queryId}, status=${saved.status}, code=${saved.error.code}`);
  });
});
