import { afterEach, describe, expect, it, vi } from "vitest";
import { environmentVisualAlias, getCatalogEnvironments, getCatalogMaterials, materialVisualAlias } from "@/lib/catalog";
import { createSimulationStore } from "@/store/useSimulationStore";

afterEach(() => vi.unstubAllGlobals());

describe("catalog client", () => {
  it("loads environment records and preserves their database IDs", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json([{ id: 17, code: "ISS", name: "International Space Station", type: "Orbital habitat" }]));
    vi.stubGlobal("fetch", fetcher);

    await expect(getCatalogEnvironments()).resolves.toEqual([{ id: 17, code: "ISS", name: "International Space Station", type: "Orbital habitat" }]);
    expect(fetcher.mock.calls[0][0]).toBe("/api/backend/environments");
  });

  it("preserves an empty environment response for the selector empty state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([])));

    await expect(getCatalogEnvironments()).resolves.toEqual([]);
  });

  it("forwards material search and pagination only through the same-origin route", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ items: [{ id: 23, code: "PMMA", name: "PMMA", category: "Polymer" }], page: 2, pageSize: 50, totalCount: 51 }));
    vi.stubGlobal("fetch", fetcher);

    const result = await getCatalogMaterials({ search: " pmma ", page: 2, pageSize: 50 });

    expect(fetcher.mock.calls[0][0]).toBe("/api/backend/materials?search=pmma&page=2&pageSize=50");
    expect(result).toMatchObject({ page: 2, totalCount: 51, items: [{ id: 23, code: "PMMA" }] });
  });

  it("preserves an empty material page without inventing a fallback material", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 50, totalCount: 0 })));

    await expect(getCatalogMaterials({ search: "missing" })).resolves.toMatchObject({ items: [], totalCount: 0 });
  });

  it("rejects empty, malformed, and failed catalog responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ status: 503, detail: "Service unavailable" }, { status: 503 })));
    await expect(getCatalogEnvironments()).rejects.toMatchObject({ status: 503, message: "Service unavailable" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ items: [] })));
    await expect(getCatalogMaterials({})).rejects.toMatchObject({ status: 502 });
  });

  it("passes cancellation to the browser fetch request", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));
    vi.stubGlobal("fetch", fetcher);
    controller.abort();

    await expect(getCatalogEnvironments(controller.signal)).rejects.toThrow("Aborted");
    expect(fetcher.mock.calls[0][1].signal).toBe(controller.signal);
  });
});

describe("catalog IDs and illustrative aliases", () => {
  it("uses only explicit code mappings for educational aliases", () => {
    expect(environmentVisualAlias("ISS")).toBe("iss");
    expect(environmentVisualAlias("LUNAR_HABITAT")).toBe("lunar");
    expect(environmentVisualAlias("unknown")).toBeNull();
    expect(materialVisualAlias("PMMA")).toBe("pmma_acrylic");
    expect(materialVisualAlias("Kapton wire insulation")).toBeNull();
  });

  it("keeps catalog IDs outside persisted educational state and clears them when a visual scenario changes", async () => {
    const store = createSimulationStore();
    store.getState().setCatalogEnvironment(17, "iss");
    store.getState().setCatalogMaterial(23, "pmma_acrylic");
    expect(store.getState()).toMatchObject({ catalogEnvironmentId: 17, catalogMaterialId: 23, environment: "iss", selectedMaterial: "pmma_acrylic" });
    expect(store.persist.getOptions().partialize?.(store.getState())).not.toHaveProperty("catalogEnvironmentId");
    expect(store.persist.getOptions().partialize?.(store.getState())).not.toHaveProperty("catalogMaterialId");

    store.getState().setEnvironment("mars");
    store.getState().setMaterial("nomex_fabric");
    expect(store.getState()).toMatchObject({ catalogEnvironmentId: null, catalogMaterialId: null, environment: "mars", selectedMaterial: "nomex_fabric" });
    await store.persist.clearStorage();
  });
});
