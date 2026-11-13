# Four-day delivery roadmap

## Priority

| Must | Should | Nice / Future |
|---|---|---|
| schema + migration, curated seed, catalog reads, Mock AI, Habitat and Knowledge flows, provenance/citations, Technology explorer **with `TechnologyExperiment`**, Swagger/errors/CORS | AI health, history, material properties, `TechnologySource`, rate limit | auth, admin CRUD, async workers, importer, full text, validated computational model |

## Ordered plan

| day | Backend independent work | AI dependency | Frontend dependency / exit criterion |
|---|---|---|---|
| 1 | confirm contract, including `AiCapabilityProfile`, nullable inputs, DOI normalization, failure `analysisId`; create entities/configurations/DbContext/migration; options, ProblemDetails, correlation, CORS plan; seed schema | AI team signs fields, identifiers, mock/live endpoint plan | share API draft and required origin. Exit: DB builds and Swagger starts. |
| 2 | seed 5–15 curated records; GET catalog/technology including related experiments; `IAiClient` + Mock; Habitat end-to-end persistence/failure retrieval | AI sends example success/error JSON | frontend starts all screens against Swagger/mock. Exit: complete demo works with clearly marked mock. |
| 3 | typed client, timeouts/errors, citation matching; integration tests/manual contract tests | live service + measured latency + matched corpus identifiers | integrate actual errors/loading/disclaimer. Exit: live path or an explicit Mock fallback. |
| 4 | stability, data/provenance review, test unavailable/timeout/invalid reply, demo scripts/README | final contract freeze | full rehearsal. Exit: frontend only uses API; mock badge and scientific disclaimers visible. |

## Owner boundaries

Backend owns SQL/schema/API/DTO validation/persistence/HTTP bridge. AI owns model/provider/RAG/corpus embeddings/prompt and returns citation identifiers. Frontend owns rendering/loading/error/disclaimer badges and never secrets. A shared curation task chooses the same evidence set for SQL and RAG.

## Risks and mitigations

| risk | mitigation |
|---|---|
| AI unfinished or contract changes | Mock-compatible contract; isolate mapper; freeze v1 draft on day 1 |
| PSI download/data shape delays | manual curated metadata, links not raw files |
| science overclaim | backend disclaimer/status + source/evidence badges; no `Simulation` wording |
| latency/provider quota | measured timeout, no auto retry, demo Mock fallback |
| one backend developer | no generic repositories/CQRS/microservices; Must scope gate |

## MVP acceptance

- API starts, migration and idempotent seed succeed on local SQL Server.
- Three UI modules consume documented backend endpoints.
- Habitat and Knowledge create persisted records in Mock and HTTP modes.
- Every output shows mock/AI basis, limitations/disclaimer and citations; unmatched stays unmatched.
- Failure yields safe ProblemDetails with correlation ID, never provider secret/stack trace.

