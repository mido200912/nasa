import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chromium" } }],
  webServer: { command: "npm run start", env: { PORT: new URL(baseURL).port || "3000" }, url: baseURL, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
