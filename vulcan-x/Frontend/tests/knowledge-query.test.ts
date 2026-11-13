import { afterEach, describe, expect, it, vi } from "vitest";
import { createKnowledgeRequest, emptyKnowledgeDraft, getKnowledgeQuery, KnowledgeFormError, submitKnowledgeQuery, validateKnowledgeDraft } from "@/lib/knowledge-query";
import { buildPlaybook } from "@/lib/playbook";
import { presets } from "@/lib/simulation";

const queryId = "9d755727-8ca2-4c0a-a78c-4d94d3c1137f";
const baseQuery = {
  id: queryId,
  status: "Completed",
  question: "How does oxygen concentration affect flame behavior?",
  answer: "AI-generated answer.",
  groundingStatus: "HasMatchedCitations",
  isMock: false,
  citations: [{ matchStatus: "Matched", source: { id: 7, title: "Catalog source", doi: null, url: "https://example.test/source" }, rawTitle: null, rawUrl: null, excerpt: "Relevant excerpt.", relevanceScore: null }],
  error: null,
  disclaimer: "AI-generated answer; verify cited sources.",
};

afterEach(() => vi.unstubAllGlobals());

describe("Knowledge request preparation", () => {
  it("uses database catalog IDs and the actual top-level DTO", () => {
    const request = createKnowledgeRequest({ ...emptyKnowledgeDraft(17, 23), question: "How does oxygen concentration affect flame behavior?", yearFrom: "2000", yearTo: "2020", maxSources: "5", language: "en" });
    expect(request).toEqual({ question: "How does oxygen concentration affect flame behavior?", environmentId: 17, materialId: 23, yearFrom: 2000, yearTo: 2020, maxSources: 5, language: "en" });
    expect(request).not.toHaveProperty("filters");
  });

  it("rejects missing question, catalog environment, invalid years, and invalid maxSources", () => {
    const errors = validateKnowledgeDraft({ ...emptyKnowledgeDraft(null, null), question: " ", yearFrom: "2021", yearTo: "2020", maxSources: "11" });
    expect(errors).toMatchObject({ question: expect.any(String), environmentId: expect.any(String), yearTo: expect.any(String), maxSources: expect.any(String) });
    expect(() => createKnowledgeRequest({ ...emptyKnowledgeDraft(null, null), question: "x" })).toThrow(KnowledgeFormError);
  });
});

describe("Knowledge same-origin API client", () => {
  it("submits the canonical request and captures a successful persisted query", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(baseQuery, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const request = createKnowledgeRequest({ ...emptyKnowledgeDraft(17, null), question: baseQuery.question });

    await expect(submitKnowledgeQuery(request)).resolves.toEqual({ query: baseQuery });
    expect(fetcher.mock.calls[0][0]).toBe("/api/backend/knowledge/queries");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(request);
  });

  it("retrieves a persisted query ID and preserves all grounding statuses", async () => {
    for (const groundingStatus of ["HasMatchedCitations", "HasOnlyUnmatchedCitations", "NoCitations"] as const) {
      const payload = { ...baseQuery, groundingStatus, citations: groundingStatus === "NoCitations" ? [] : baseQuery.citations };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
      await expect(getKnowledgeQuery(queryId)).resolves.toEqual({ query: payload });
    }
  });

  it("preserves unmatched citations as raw unverified text", async () => {
    const payload = { ...baseQuery, groundingStatus: "HasOnlyUnmatchedCitations", citations: [{ matchStatus: "Unmatched", source: null, rawTitle: "AI source label", rawUrl: "https://unverified.example", excerpt: null, relevanceScore: null }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
    await expect(getKnowledgeQuery(queryId)).resolves.toEqual({ query: payload });
  });

  it.each([400, 404, 422, 429, 502, 503, 504])("preserves ProblemDetails status %i and queryId", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status, title: "Backend failure", detail: "Safe detail", errorCode: "SAFE", queryId }, { status })));
    await expect(getKnowledgeQuery(queryId)).resolves.toEqual({ problem: { status, title: "Backend failure", detail: "Safe detail", errorCode: "SAFE", queryId } });
  });

  it("returns safe network, timeout, cancellation, and malformed-response outcomes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("private provider error")).mockRejectedValueOnce(new DOMException("Aborted", "AbortError")).mockResolvedValueOnce(Response.json({ status: "bad" }, { status: 200 })));
    await expect(getKnowledgeQuery(queryId)).resolves.toMatchObject({ problem: { status: 502, errorCode: "KNOWLEDGE_BACKEND_UNAVAILABLE" } });
    await expect(getKnowledgeQuery(queryId)).resolves.toMatchObject({ problem: { status: 499, errorCode: "REQUEST_CANCELLED" } });
    await expect(getKnowledgeQuery(queryId)).resolves.toMatchObject({ problem: { status: 502, errorCode: "KNOWLEDGE_INVALID_RESPONSE" } });
  });

  it("does not send invalid query IDs to the backend", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(getKnowledgeQuery("not-a-guid")).resolves.toMatchObject({ problem: { status: 400 } });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("Offline Playbook remains independent", () => {
  it("keeps deterministic local preview behavior without a Knowledge API request", () => {
    const book = buildPlaybook("arc", { ...presets.lunar, environment: "lunar", selectedMaterial: "cable_insulation" }, "Review cable isolation");
    expect(book.prompt).toBe("Review cable isolation");
    expect(book.disclaimer).toContain("Educational review outline");
    expect(book.references).not.toHaveLength(0);
  });
});
