import { afterEach, expect, it, vi } from "vitest";
import { getHabitatCapabilities } from "@/lib/habitat-analysis";
import { GET } from "@/app/api/backend/habitat-analyses/capabilities/route";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("maps the capabilities request to a fixed backend path", async () => {
  vi.stubEnv("FIRE_SAFETY_API_BASE_URL", "http://backend.example.test");
  const fetcher = vi.fn().mockResolvedValue(Response.json({ enabled: false }));
  vi.stubGlobal("fetch", fetcher);
  expect((await GET(new Request("http://frontend.example.test/api/backend/habitat-analyses/capabilities"))).status).toBe(200);
  expect(fetcher.mock.calls[0][0].href).toBe("http://backend.example.test/api/habitat-analyses/capabilities");
});

it("fails closed on errors or malformed capabilities, never treating a string as permission", async () => {
  for (const payload of [{ enabled: "true" }, {}, null]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
    await expect(getHabitatCapabilities()).rejects.toThrow();
  }
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ enabled: true }, { status: 503 })));
  await expect(getHabitatCapabilities()).rejects.toThrow();
});

it("returns explicit backend approval state and passes cancellation", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ enabled: false }));
  vi.stubGlobal("fetch", fetcher);
  const controller = new AbortController();
  expect(await getHabitatCapabilities(controller.signal)).toEqual({ enabled: false });
  expect(fetcher.mock.calls[0][1].signal).toBe(controller.signal);
});
