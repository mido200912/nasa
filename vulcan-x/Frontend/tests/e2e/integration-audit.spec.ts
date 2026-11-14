import { expect, test } from "@playwright/test";

test("live catalog defaults to backend records and never substitutes offline material candidates", async ({ page }) => {
  await page.route("**/api/backend/materials?*", (route) => route.fulfill({ status: 503, json: { status: 503, title: "Unavailable" } }));
  await page.goto("/dashboard/materials");
  await expect(page.getByRole("heading", { name: "Live materials catalog" })).toBeVisible();
  await expect(page.getByText(/Live catalog unavailable/)).toBeVisible();
  await expect(page.getByText("PMMA acrylic", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Offline material scenarios", exact: true }).click();
  await expect(page.getByText(/Offline educational scenarios only/)).toBeVisible();
  await expect(page.getByText("PMMA acrylic", { exact: true }).first()).toBeVisible();
});

test("live catalog refreshes, searches and follows actual record IDs (declared fixtures only)", async ({ page }) => {
  await page.route("**/api/backend/materials?*", (route) => route.fulfill({ json: { items: [{ id: 47, name: "Fixture material", code: "FIXTURE", category: null }], page: 1, pageSize: 10, totalCount: 1 } }));
  await page.route("**/api/backend/materials/47", (route) => route.fulfill({ json: { id: 47, name: "Fixture material", category: null, description: "Persisted technical fixture", properties: [] } }));
  await page.goto("/dashboard/materials");
  await page.getByRole("button", { name: "View Fixture material", exact: true }).click();
  await expect(page.getByText("materials ID: 47", { exact: false })).toBeVisible();
  await expect(page.getByText("Persisted technical fixture", { exact: true })).toBeVisible();
  await page.route("**/api/backend/materials?*", (route) => route.fulfill({ json: { items: [], page: 1, pageSize: 10, totalCount: 0 } }));
  await page.getByRole("button", { name: "Refresh catalog", exact: true }).click();
  await expect(page.getByText("No live catalog records match this query.", { exact: true })).toBeVisible();
});

test("saved Habitat lookup performs GET without needing a new analysis submission", async ({ page }) => {
  await page.route("**/api/backend/environments", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/backend/materials?*", (route) => route.fulfill({ json: { items: [], page: 1, pageSize: 50, totalCount: 0 } }));
  const id = "9d755727-8ca2-4c0a-a78c-4d94d3c1137f";
  await page.route(`**/api/backend/habitat-analyses/${id}`, (route) => route.fulfill({ status: 404, json: { status: 404, title: "Saved analysis not found" } }));
  await page.goto("/dashboard");
  await page.getByLabel("Saved analysis ID", { exact: true }).fill(id);
  await page.getByRole("button", { name: "Retrieve analysis", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Saved analysis not found", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit persisted Habitat Analysis", exact: true })).toBeDisabled();
});
