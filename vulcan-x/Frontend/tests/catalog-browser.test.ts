import { afterEach, expect, it, vi } from "vitest";
import { getCatalogPage, getCatalogRecord } from "@/lib/catalog-browser";

afterEach(() => vi.unstubAllGlobals());
it("uses actual same-origin IDs, paging and encoded search, without fallback data", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ items: [{ id: 41, title: "SQL experiment", discipline: "Combustion" }], page: 2, pageSize: 10, totalCount: 11 }));
  vi.stubGlobal("fetch", fetcher);
  const result = await getCatalogPage("experiments", { search: "fire & oxygen", page: 2 });
  expect(fetcher.mock.calls[0][0]).toBe("/api/backend/experiments?search=fire+%26+oxygen&page=2&pageSize=10");
  expect(result.items[0].id).toBe(41);
});
it("preserves network/HTTP failure rather than returning static entries", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: 503, title: "Unavailable" }, { status: 503 })));
  await expect(getCatalogPage("materials", { search: "", page: 1 })).rejects.toThrow();
});
it("rejects malformed nested catalog records before rendering", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id: 7, title: {}, sources: [null] })));
  await expect(getCatalogRecord("experiments", 7)).rejects.toThrow();
});
it("does not request invalid record IDs", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(getCatalogRecord("sources", -1)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
