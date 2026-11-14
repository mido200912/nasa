import { expect, test } from "@playwright/test";

test("real saved report renders the simpler design without another inference request", async ({ page, request }, testInfo) => {
  const id = process.env.FIRE_SAFETY_SAVED_HABITAT_ID;
  test.skip(!id, "Supply an existing Habitat Analysis ID for read-only production verification.");
  const response = await request.get(`/api/backend/habitat-analyses/${id}`);
  expect(response.status()).toBe(200);
  const saved = await response.json();
  expect(saved.status).toBe("Completed");
  const posts: string[] = [];
  page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/habitat-analyses")) posts.push(r.url()); });
  await page.goto("/dashboard");
  await page.getByLabel("Saved analysis ID", { exact: true }).fill(id!);
  await page.getByRole("button", { name: "Retrieve analysis", exact: true }).click();
  const result = page.locator(".cc-habitat-result");
  await expect(result.getByRole("heading", { name: "Analysis result", exact: true })).toBeVisible();
  await expect(result).toContainText("Not scientifically validated");
  const expand = result.getByRole("button", { name: "Read full assessment" });
  if (await expand.count()) {
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await testInfo.attach("compact-real-assessment", { body: await result.screenshot(), contentType: "image/png" });
    await expand.click();
    await expect(result.locator("[data-report-body]")).not.toContainText("**");
  }
  await result.getByText("Record details", { exact: true }).click();
  await result.getByText("Original saved response", { exact: true }).click();
  await expect(result.locator("pre")).toHaveText(saved.result.explanation);
  expect(posts).toEqual([]);
  console.log(`Read-only report verification: ${id}, original answer unchanged, no inference request.`);
});

// Opt-in only: real backend, real database and actual provider inference, no routes mocked.
test("real main Habitat form saves and retrieves its AI assessment", async ({ page }, testInfo) => {
  test.skip(process.env.FIRE_SAFETY_LIVE_PROVIDER !== "1", "Requires authorized live provider and backend deployment.");
  test.setTimeout(120_000);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Habitat Analysis", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Experimental AI demo", exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Catalog environment", exact: true }).click();
  await page.getByRole("option", { name: "International Space Station — OrbitalStation", exact: true }).click();
  await page.getByRole("combobox", { name: "Catalog material", exact: true }).click();
  await page.getByRole("option", { name: "PMMA — Solid fuel", exact: true }).click();
  await page.locator("#habitat-oxygen").fill("21");
  await page.locator("#habitat-pressure").fill("101.325");
  await page.locator("#habitat-temperature").fill("22");
  await page.getByRole("combobox", { name: "Gravity regime", exact: true }).click();
  await page.getByRole("option", { name: "Microgravity", exact: true }).click();
  await page.locator("#habitat-gravity").fill("0");
  const posted = page.waitForResponse(r => r.url().endsWith("/api/backend/habitat-analyses") && r.request().method() === "POST", { timeout: 90_000 });
  await page.getByRole("button", { name: "Submit persisted Habitat Analysis", exact: true }).click();
  const response = await posted;
  const created = await response.json();
  console.log(JSON.stringify({ httpStatus: response.status(), id: created.id ?? created.analysisId, status: created.status, generation: created.generation, errorCode: created.errorCode }));
  expect(response.status()).toBe(201);
  expect(created.status).toBe("Completed");
  expect(created.result.isMock).toBe(false);
  expect(created.result.isScientificallyValidated).toBe(false);
  expect(created.result.explanation.length).toBeGreaterThan(0);
  expect(created.result.factors).toEqual([]);
  expect(created.result.riskLabel).toBeNull();
  expect(created.generation).toMatchObject({ mode: "ProviderInference", provider: "openrouter" });
  expect(created.generation.model.length).toBeGreaterThan(0);
  expect(created.inputs.temperatureCelsius).toMatchObject({ value: 22, origin: "UserProvided" });
  await expect(page.getByRole("heading", { name: "Analysis result", exact: true })).toBeVisible();
  await page.getByLabel("Saved analysis ID", { exact: true }).fill(created.id);
  const retrieved = page.waitForResponse(r => r.url().endsWith(`/api/backend/habitat-analyses/${created.id}`));
  await page.getByRole("button", { name: "Retrieve analysis", exact: true }).click();
  const savedResponse = await retrieved;
  expect(savedResponse.status()).toBe(200);
  const saved = await savedResponse.json();
  expect(saved.result).toEqual(created.result);
  expect(saved.generation).toEqual(created.generation);
  expect(saved.inputs).toEqual(created.inputs);
  await expect(page.getByRole("heading", { name: "Analysis result", exact: true })).toHaveCount(2);
  const evidence = { target: testInfo.project.use.baseURL, mocked: false, id: created.id, httpStatus: response.status(), retrievalStatus: savedResponse.status(), status: saved.status, generation: saved.generation, answerCharacters: saved.result.explanation.length, citations: saved.result.citations.length, sameAnswer: saved.result.explanation === created.result.explanation };
  console.log(JSON.stringify(evidence, null, 2));
  await testInfo.attach("habitat-live-evidence", { body: JSON.stringify(evidence, null, 2), contentType: "application/json" });
  await testInfo.attach("habitat-live-page", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
});
