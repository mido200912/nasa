import { afterEach, expect, it, vi } from "vitest";
import { proxyFireSafetyApi } from "@/lib/server/fire-safety-api";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it("allows ordinary operations longer than the former ten-second proxy budget", async () => {
  vi.useFakeTimers();
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), ms);
    return controller.signal;
  });
  vi.stubEnv("FIRE_SAFETY_API_BASE_URL", "http://backend.example.test");
  vi.stubGlobal("fetch", vi.fn((_url, init) => new Promise<Response>((resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(init.signal.reason));
    setTimeout(() => resolve(Response.json({ ok: true })), 11_000);
  })));
  const pending = proxyFireSafetyApi(new Request("http://frontend.test/api/backend/knowledge/queries"), { method: "POST", path: "/api/knowledge/queries", body: {} });
  await vi.advanceTimersByTimeAsync(11_000);
  expect((await pending).status).toBe(200);
});

it("fails closed when the configured deployment execution ceiling cannot fit the proxy budget", async () => {
  vi.stubEnv("FIRE_SAFETY_API_BASE_URL", "http://backend.example.test");
  vi.stubEnv("FIRE_SAFETY_MAX_EXECUTION_SECONDS", "30");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const response = await proxyFireSafetyApi(new Request("http://frontend.test/api/backend/environments"), { method: "GET", path: "/api/environments" });
  expect(response.status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});

it("rejects a proxy budget shorter than the declared upstream and cleanup budgets", async () => {
  vi.stubEnv("FIRE_SAFETY_API_BASE_URL", "http://backend.example.test");
  vi.stubEnv("FIRE_SAFETY_API_TIMEOUT_SECONDS", "20");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const response = await proxyFireSafetyApi(new Request("http://frontend.test/api/backend/environments"), { method: "GET", path: "/api/environments" });
  expect(response.status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});
