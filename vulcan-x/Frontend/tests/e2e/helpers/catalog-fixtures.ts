import type { Page } from "@playwright/test";

// Contract fixtures for educational UI regressions, not live SQL/API evidence.
export async function mockCatalog(page: Page) {
  await page.route("**/api/backend/environments", (route) => route.fulfill({ json: [{ id: 17, code: "ISS", name: "Fixture station", type: "OrbitalStation" }] }));
  await page.route("**/api/backend/materials?*", (route) => route.fulfill({ json: { items: [{ id: 23, code: "PMMA", name: "Fixture material", category: null }], page: 1, pageSize: 50, totalCount: 1 } }));
}
