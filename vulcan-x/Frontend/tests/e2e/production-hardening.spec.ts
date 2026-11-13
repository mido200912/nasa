import { expect, test } from "@playwright/test";

test("production responses enforce browser boundaries without exposing dependency details", async ({ page, request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["content-security-policy"]).toContain("connect-src 'self'");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response.headers()["content-security-policy"]).not.toContain("unsafe-eval");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
  const live = await request.get("/api/health/live");
  expect(await live.json()).toEqual({ status: "live" });
  const ready = await request.get("/api/health/ready");
  expect([200, 503]).toContain(ready.status());
  expect(Object.keys(await ready.json())).toEqual(["status"]);
  await page.goto("/dashboard/playbook");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Generate outline", exact: true }).click();
  await expect(page.getByText("Preview complete · engineering review required", { exact: true })).toBeVisible();
});
