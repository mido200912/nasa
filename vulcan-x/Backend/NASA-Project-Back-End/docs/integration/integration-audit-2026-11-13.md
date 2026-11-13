# Frontend–backend–SQL–AI integration audit — 13 November 2026

> **Subsequent verification:** after the owner securely configured the local credential, genuine direct and browser-to-SQL OpenRouter inference passed. See [openrouter-inference-verification-2026-11-13.md](openrouter-inference-verification-2026-11-13.md). The earlier missing-key results below remain historical evidence; scientific/deployment requirements remain.

## Outcome and scope

Current source and runtime were checked independently of earlier milestone reports. Live catalog navigation, failed Knowledge creation/retrieval, real SQL workflows, anonymous proxying, cancellation, and offline tools were exercised. Genuine provider inference and scientific Habitat analysis are **not verified**.

Architecture remains:

```text
Browser → same-origin Next.js 16 / React 19 route handlers
        → ASP.NET Core net8.0 / EF Core 8
        → SQL Server
        → private Bun/Hono Vulcan-X → OpenRouter (only with authorized credentials)
```

Initial branch: `milestone-6-integration`; initial clean HEAD: `d8f0f49baf8c148d682c21283c6d556adaf2a457`. All audit changes remain uncommitted. No push, reset, database deletion, migration deletion, or unrelated-process termination was performed. The pre-existing service on port 3000 was not used or stopped.

This audit covers the application routes/components, frontend data boundaries/hooks/store, ASP.NET controllers/services/DTOs/model/seeder/migration/client, Bun routes/controllers/providers/retrieval and legacy simulators, configuration, tests and documentation. Build outputs, `.vs` IDE files, and historical reports are not evidence of current application behavior.

## A. Feature and integration map

`/api/backend/...` paths below are Next.js route handlers. Backend paths are relative to the server-only ASP.NET origin. Lists/details use GET; only Knowledge creation is an enabled live write workflow.

| Frontend feature/component | Next.js route | ASP.NET endpoint | Actual data source / behavior | Status |
| --- | --- | --- | --- | --- |
| Landing `CommandHero`, planet explorer/dossier | None | None | Bundled `planet-profiles`, solar/orbit geometry and procedural shaders | Intentionally offline reference/illustration; not telemetry |
| Landing `FireParadox` | None | None | SVG concepts and local state | Intentionally illustrative |
| Landing `EnginePreviews` risk/material/bridge/Playbook cards | None | None | `risk.ts`, scenario scores, scripted text | Explicit preview, not live inference |
| Landing `SystemArchitecture` | None | None | Architecture explanation and navigation links | Corrected obsolete “no live RAG connected” wording; configuration is still required |
| `DashboardShell`, `SimulationProvider`, shared scenario telemetry | None | None | Per-provider Zustand store; validated tab session storage | Offline scenario state, not live sensor readings |
| `Controls.EnvironmentSelect` in dashboard/Knowledge | `/api/backend/environments` | `/api/environments` | `CatalogQueryService` → SQL `SpaceEnvironments` | Live verified; IDs, loading/empty/error/retry; no invented defaults |
| `Controls.MaterialSelect` | `/api/backend/materials` | `/api/materials` | SQL `Materials`; search and paged loading | Live verified; selection IDs distinct from illustrative material aliases |
| Material matrix → `CatalogBrowser` default live view | `/api/backend/materials`, `/materials/{id}` | `/api/materials`, `/api/materials/{id}` | SQL `Materials`, `MaterialProperties`, property source references | Live verified; search/paging/refresh, detail, selection, cancellation and error/empty states |
| Material matrix → experiments tab | `/api/backend/experiments`, `/experiments/{id}` | `/api/experiments`, `/api/experiments/{id}` | SQL `Experiments`, parameters, `ExperimentMaterials`, `ExperimentSources` | Live verified; follows real material/source IDs |
| Catalog source links | `/api/backend/sources/{id}` | `/api/sources/{id}` | SQL `ResearchSources`; curation, publisher, DOI and URL metadata | Live verified; HTTP(S)-only external links |
| Material matrix → Offline material scenarios | None | None | Six synthetic `materialCatalog` profiles, local filters and comparator | Intentionally retained behind explicit offline-mode selection |
| Earth bridge → live `CatalogBrowser` | `/api/backend/technologies`, `/technologies/{id}` plus related experiment/source routes | `/api/technologies`, `/api/technologies/{id}` | SQL `Technologies`, `TechnologyApplications`, related experiments/source records | Live verified; not substituted with static pathway cards |
| Earth bridge → offline workbench | None | None | Three translation concepts; user-editable baseline/target calculations | Intentionally offline; targets are assumptions, not measured gains |
| `StressTestModule`, `TelemetryCharts`, `FlameSimulator3D` | `/api/v1/simulator/stress-test` **on Next.js** | **None** | Local `buildStressTestResult`, synthetic scenario model; procedural 3D/SVG | Intentionally educational; label now explicitly says “no AI/backend” |
| Stress-test sliders, suppression and reignition | Same local teaching route / store | None | Client timers, illustrative suppression duration and animation | Verified local behavior; not a real control/suppression operation |
| `HabitatAnalysisPanel` submission | `/api/backend/habitat-analyses` | POST `/api/habitat-analyses` | Would use `HabitatAnalysisService`/SQL/AI only after genuine approval | **Disabled** in UI and backend; blank scientific values; tested 422 approval gate |
| `HabitatRecordLookup` | `/api/backend/habitat-analyses/{guid}` | GET `/api/habitat-analyses/{guid}` | Existing SQL Habitat records, factors/citations/input provenance | New GET-only UI; fixture browser 404 and malformed nested-response tests pass; no approved completed scientific record supplied |
| `PlaybookModule` → Offline Playbook | None | None | Three deterministic review templates; checklists, simulated streaming, Markdown export | Verified without backend; question is attached for a human reviewer, not interpreted by AI |
| `KnowledgeQueryPanel` POST | `/api/backend/knowledge/queries` | POST `/api/knowledge/queries` | SQL Running record → `IVulcanXAiClient` → Bun `/api/v1/ai/query` → provider → SQL terminal record | Actual missing-provider path verified end-to-end; successful provider path externally blocked |
| `KnowledgeQueryPanel` retrieval/result | `/api/backend/knowledge/queries/{guid}` | GET `/api/knowledge/queries/{guid}` | SQL `KnowledgeQueries`/`KnowledgeCitations`/source relationships | Live Failed retrieval verified; Completed/citation/provenance round-trips tested on real SQL with declared upstream fixtures |
| Raw ASP.NET AI query/health/datasets compatibility routes | Not exposed by Next.js allowlist | `/api/v1/ai/query`, `/api/v1/ai/health`, `/api/v1/datasets` | `VulcanXAiClient` → Bun/provider or bundled retrieval catalog | Server-side compatibility only; health checks Bun process, not provider/SQL readiness |
| Legacy raw scientific simulator routes | **No Next.js proxy**; not the educational route above | `/api/v1/simulator/stress-test`, `/hazard-evaluation` | Legacy Bun formula experiments | Default backend scientific gate now blocks bypass. Bun production additionally returns 422 for these and `/physics-engine` |
| Bun `/test`, key-status/reset | Not proxied | None | Developer diagnostics only | Hidden with 404 in production; wildcard CORS removed; loopback binding retained |
| Bun links/datasets catalogs | Not directly consumed by the dashboard | Backend datasets compatibility route only | Bundled `official_nasa_corpus.ts` / link summaries, not SQL or live document ingestion | Retained retrieval context; not LLM evidence |

Catalog API filters remain compatible: search/category/page/pageSize; experiment discipline/gravity/materialId; technology category/domain. The new browser deliberately exposes search/paging and record navigation rather than inventing advanced-filter semantics.

Knowledge forwards **only question/environment** under the existing Bun contract. Material/year/maxSources are explicitly labeled saved context, not provider retrieval filters. Language is labeled not applied and is not persisted/forwarded. No new retrieval-filter, language-generation, authentication, account, admin-edit, or ingestion workflow is claimed.

## B. Mock/static data disposition

| Source | Finding and action |
| --- | --- |
| `Ai Model/src/services/ragService.ts` deterministic Knowledge fallback | **Removed.** Previously returned local text with success after provider failure. Now only actual usable provider final text can become a new live successful answer |
| Provider `message.reasoning` fallback | **Removed.** Reasoning-only/truncated/unusable output is rejected, never displayed as a final answer |
| Configured-model substitution | **Removed.** Missing/oversized actual returned model identity fails validation; it is not replaced with the configured model name |
| Material matrix's six static catalog candidates | **Replaced as default** with SQL materials/experiments. Retained only in explicitly selected offline workspace |
| Earth bridge static technology-like cards | Added a real SQL technology browser above them; retained concepts/target math under “Offline translation workbench” |
| `lib/simulation.ts`, `risk.ts`, `flame-response.ts`, `stress-test.ts` | Retained educational synthetic weights/formulas. Not silently promoted into live physics, material measurements or AI responses |
| `lib/playbook.ts`, landing preview streaming | Retained deliberate deterministic/offline outlines. No model-call claim; export includes qualifications |
| `lib/environments.ts`, planetary reference profiles | Retained labeled research links/reference values, not telemetry or supporting evidence for synthetic numeric outputs |
| SQL `CuratedCatalogSeeder` | Retained real persisted metadata seed, not mocked HTTP. Current tiny catalog has three environments, one material, one experiment, three sources and one technology. Does not constitute complete NASA PSI ingestion or an approved Habitat fixture |
| Bun corpus/link-intelligence JSON | Retained static retrieval context and URL catalog. Lexical/synonym matching is not vector retrieval, live ingestion, citation entailment or inference |
| Legacy `physicsSimulatorService` / `physicsEngineService` | Existing unvalidated coefficients/thresholds and deterministic text are **not accepted as scientific evidence**. Not connected to live dashboard physics; blocked at Bun production and default backend scientific gates. Development experiments remain in source, not certified models |
| Historical saved Knowledge answers | Preserved, not rewritten/deleted. Missing provenance renders `Unspecified`; no retroactive provider-inference claim |
| Vitest, Bun contract tests, Playwright route fixtures, controlled TCP harness | Test-only, explicitly labeled. New provider injection preserves meaningful API assertions without manufacturing “live” evidence. Timing fixtures require explicit opt-in |
| `test.html` and legacy API-document examples | Developer/historical examples, not dashboard data. Test bench hidden in production; docs now flag unvalidated/historical numerical examples and removed fallback semantics |
| WebGL/SVG fallback and session-storage fallback | Retained legitimate accessible/offline rendering/state behavior, not API or AI fallback |

No fabricated scientific inputs/citations, new scientific default measurements, live Habitat success, or provider completion were supplied.

## C. AI pipeline and actual evidence

### Implemented path

1. Browser submits same-origin Knowledge POST with a real SQL catalog environment ID.
2. Next.js validates/bounds JSON and proxies only allowlisted methods/routes. `FIRE_SAFETY_API_BASE_URL` is server-only.
3. ASP.NET validates catalog relationships, commits a Running `KnowledgeQuery`, maps ISS/lunar/Mars codes to Bun environment names and sends question/environment.
4. Bun ranks bundled research context and invokes `AiProviderService.generateCompletion`.
5. With a usable authorized key, the provider sends server-side `Authorization: Bearer [REDACTED]` to the configured OpenRouter `/chat/completions`, with messages/model. No browser key is used.
6. Final answer validation rejects empty, reasoning-only, truncated and oversized content and missing/over-100-character model identity. The model limit matches the existing SQL column.
7. Success carries `generation.mode=ProviderInference`, `provider=openrouter`, and actual returned model. ASP.NET persists those in existing model/provenance columns and returns them through Next.js.
8. Failure returns safe categories, persists Failed without answer/citations, and exposes queryId for GET retrieval. HTTP 504/502/503 retain timeout/invalid-response/unavailable distinctions.

Cancellation/deadlines: caller abort propagates through Next.js/HttpClient/Bun/provider fetch; cancellation does not rotate another key or become fallback success. Knowledge synthesis has a 7-second budget, provider operations an overall 55-second budget/per-attempt 40-second limit, default backend AI timeout 60 seconds and Next.js 75 seconds. Backend terminal cleanup has a separate 5-second token. Actual host execution ceiling remains unknown.

### Verified facts (not claims inferred from code)

| Question | Result |
| --- | --- |
| Is ASP.NET connected to actual Vulcan-X? | **Yes.** Real HTTP request to `/api/v1/ai/query`, Bun access log 503, SQL Failed record and browser retrieval observed |
| Is OpenRouter implemented? | **Yes**, server-side HTTP path, key rotation, deadline/cancellation and final-output/model validation |
| Are credentials configured here? | **No**. No populated service/frontend env files or provider key process configuration; production startup reports 0/5 configured slots |
| Was OpenRouter connectivity/provider authentication verified? | **No**; missing authorized credentials prevents reaching a model |
| Was real LLM inference verified? | **No** |
| Which model was actually used? | **None verified**. The configured default `meta-llama/llama-3.3-70b-instruct` is configuration, not an executed model |
| Is retrieval itself inference? | **No.** Local corpus/link ranking remains deterministic research context |
| Does `isMock:false` prove inference? | **No.** Provenance is separate; metadata-free/historical answers are `Unspecified` |
| Are citations scientifically verified? | **No.** Retrieved URLs/exact local title matches are not claim entailment, model citations or scientific validation |

### Real redacted execution trace

Production frontend at loopback 3109 → current net8.0 API at 5082 → actual production Bun at 4000; SQL at private loopback 14339. All are QA processes, not deployment claims.

```text
Browser POST /api/backend/knowledge/queries
  question: "NASA oxygen fire provider unavailable audit 1794602822849"
  environmentId: 1 (ISS, returned by SQL catalog)
Next.js → ASP.NET POST /api/knowledge/queries
  SQL INSERT KnowledgeQueries status=Running
ASP.NET → Bun POST /api/v1/ai/query
  body shape: { question: "...", environment: "iss" }
Bun log: POST /api/v1/ai/query → 503 (3ms)
  configured provider key slots: 0/5
  no provider/model request made; no Authorization header transmitted
ASP.NET SQL UPDATE → status=Failed, errorCode=VULCANX_UNAVAILABLE
Browser POST → 503, persisted queryId returned
Browser GET /api/backend/knowledge/queries/92bb9b75-dc9e-424d-be88-979304f5a68c → 200
```

Actual retrieved response (no secrets):

```json
{
  "id": "92bb9b75-dc9e-424d-be88-979304f5a68c",
  "status": "Failed",
  "answer": null,
  "groundingStatus": null,
  "isMock": false,
  "citations": [],
  "error": {
    "code": "VULCANX_UNAVAILABLE",
    "message": "The knowledge query could not be completed."
  },
  "generation": { "mode": "Unspecified", "provider": null, "model": null }
}
```

An independent parameterized SQL read confirmed that ID, `Status=Failed`, `Answer IS NULL`, error code, NULL model/contract, and terminal completion timestamp. An earlier equivalent run saved ID `7324b86e-36b3-4826-86c6-91b406eeec4a`. A separate browser run with Bun actually stopped saved `6e08c295-8ca5-423d-a173-f1c37dbfc6b0`, also Failed/no answer. These are failure-path evidence, **not successful model-response evidence**.

Browser catalog traffic was also observed in the in-app browser: GET `/api/backend/materials?page=1&pageSize=10` → 200; browser tests followed actual material ID 1 → experiment ID 1 → source ID 2, and technology ID 1/application/source. No page routing/interception was used in live SQL tests.

## D. Commands and results

Commands below are run from the corresponding project directory. `dotnet` means the actual .NET **8.0.422** executable at `%LOCALAPPDATA%\Temp\opencode\flame-m6-sdk8\dotnet.exe`, with `DOTNET_ROOT`/`DOTNET_ROOT_X64` set accordingly; runtime 8.0.28. `$artifacts` is the approved temp `flame-audit-build`, `$evidence` is `flame-audit-evidence`. SQL connection is loaded from local User Secrets into `FIRE_SAFETY_SQL_TEST_CONNECTION` without printing it.

| Check / actual command | Result and qualification |
| --- | --- |
| Frontend `npm ci` | Success; lockfile unchanged. Warned about existing esbuild install-script approval policy; no policy override |
| `npm test` | **129 passed**, 15 files, 0 failed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed; run sequentially after production build |
| `npm run build` | Passed; Next.js **16.4.6**, Webpack, all four dashboard pages and backend proxy routes generated |
| `BASE_URL=http://127.0.0.1:3107 npm run test:e2e -- --workers=2` (PowerShell env assignment) | **133 passed, 5 skipped, 0 failed**, 138 total. npm swallowed the worker flag and Playwright actually used eight workers; this is recorded, not represented as a two-worker run |
| `BASE_URL=http://127.0.0.1:3109`, `FIRE_SAFETY_LIVE_SQL=1`, `FIRE_SAFETY_PROVIDER_UNAVAILABLE=1`; `npx playwright test tests/e2e/live-sql.spec.ts --workers=1 --output=test-results/audit-live-final` | **3 passed, 2 skipped, 0 failed**. Real catalogs/relationships; real running-Bun missing-provider failure/retrieval/all-module navigation/offline outline; Habitat safety gate. Skips: provider success and separate stopped-service scenario |
| Same live base/SQL flag, `FIRE_SAFETY_LIVE_FAILURE=1`; `npx playwright test tests/e2e/live-sql.spec.ts --grep 'real unavailable' --workers=1 --output=test-results/audit-stopped-service` | **1 passed**, 0 failed; actual Bun stopped, real Failed SQL query retrieved |
| Bun `bun install --frozen-lockfile` | Passed; no lockfile changes |
| Bun `bun test` | **20 passed, 209 assertions, 3 files, 0 failed**. Provider transport/contract fixtures are explicitly technical, not inference |
| Bun `bunx tsc --noEmit` | Passed; fixed existing typed-499 and optional split-index errors |
| .NET restore/build (performed by `dotnet test ...`) | Both projects restore/build on **net8.0**, no framework upgrade |
| `dotnet test NASA.FireSafety.API.sln --artifacts-path $artifacts --logger 'trx;LogFileName=audit-backend-sql-tcp.trx' --results-directory $evidence` with SQL connection, `FIRE_SAFETY_LIVE_PROXY_URL=http://127.0.0.1:3107`, `FIRE_SAFETY_TIMING_FIXTURE=1` | **54 passed, 0 skipped, 0 failed**, 40-second run. Real SQL plus real Next.js/API TCP; controlled upstream timing fixtures, not provider inference |
| `npm audit --json` / `npm audit --omit=dev` | **7 moderate development-only findings / 0 production vulnerabilities**. One minimatch glob amplification advisory propagated through typescript-eslint packages |
| Targeted transitive update and `npm audit fix --dry-run --ignore-scripts` | No compatible changes/fix produced; lockfile unchanged. Latest observed typescript-eslint 8.72.2 still depends on minimatch `^10.2.2`, within advisory range. No forced major override or hidden audit suppression |
| Bun `bun audit` | No vulnerabilities, 27 packages checked |
| `dotnet list NASA.FireSafety.API.sln package --vulnerable --include-transitive` | No known vulnerable API or test-project packages from current NuGet sources |
| `git diff --check` | Passed (only repository CRLF-normalization warnings during ordinary diff commands) |

The ordinary browser suite includes fixture-based catalog/Knowledge rendering, missing-provider proxy errors, loading/cancellation/retry, offline operation with all backend requests unavailable, Habitat disabled state/read-only lookup, navigation, mobile layouts, reduced motion, real rendered-flame changes, and WebGL fallback. It is not 133 live SQL tests.

Real SQL coverage includes migration/17-table model and repeat-seed idempotence, trusted/enabled foreign keys, Completed and Failed creation/retrieval, matched/unmatched/no citations, provider provenance, late-response cancellation, partial-success prevention, duplicate submissions as distinct records, real FK failure and explicit rollback. The rollback test uses only its own transaction; no existing record/database is deleted. TCP checks verify Running → Failed cancellation, upstream 504 before proxy deadline, an 11-second response surviving the proxy, and two-operation saturation → 429 → reusable capacity.

Initial .NET attempts encountered Windows Application Control `0x800711C7`: one discovery collapse, then 0 passed/42 assembly-load failures/4 skips. These were **not passing tests or application assertion failures**. Ordinary subsequent execution succeeded (47/4, then 48/4, finally 54/0); no machine protection was disabled/bypassed. There is no remaining backend-runtime blocker at the end of this verification.

Regression tests were observed red before fixing silent provider fallback, reasoning-only output, missing model identity, malformed nested Habitat responses and production legacy-simulator gating. Existing assertions were retained; API tests now inject an explicit provider fixture rather than treating local retrieval as AI success.

TestSprite is not linked/configured in this repository; no TestSprite run/deployment is claimed. Verification used the project's existing Vitest, Bun, xUnit and Playwright tooling.

Local artifacts: `%LOCALAPPDATA%\Temp\opencode\flame-audit-evidence\audit-backend-sql-tcp.trx`, earlier blocked/final TRX runs, `vulcan-production.log`, `api-production.log`, and `api-timing.log`. These are local execution records, not committed credentials or a portable deployment. Successful live browser response IDs and redacted trace are recorded above.

## E. Safety, configuration and remaining requirements

1. **OpenRouter:** supply an authorized server-side key, permitted model and working outbound HTTPS/provider quota. Restart Bun and run the explicit live-provider browser test. Record actual model/response/provider request evidence. Do not set the provider flag against the fixture harness.
2. **Habitat science approval:** no approved scientific fixture/provenance or validated numerical adapter exists here. UI/backend submission remains disabled; production Bun blocks legacy scientific simulation. Approval must include input units/origins, source evidence, expected output/uncertainty and a reviewed adapter. A nonempty configuration string is not scientific validation.
3. **Deployment:** no authoritative production platform, execution ceiling, private service topology or HTTPS termination contract was supplied. Local 60/75-second budgets are not proof of deployability. Verify declared host ceilings or design asynchronous work before production.
4. **Research coverage:** SQL contains a deliberately tiny curated catalog; bundled lexical retrieval is not a full PSI ingestion/vector search pipeline. Broader source coverage and independent scientific review require real datasets, not invented entries.
5. **Known feature boundaries:** material/year/maxSources remain saved Knowledge context, not filters; language is not applied. POSTs are not idempotent: duplicate submissions create separate IDs, and cancellation is not rollback. These limitations are explicitly labeled, and POSTs are never automatically retried.
6. **Legacy experiment code/docs:** development-only Bun formula services and historical numeric examples remain unvalidated and must not be promoted as certified predictions or actual emergency procedures. Production gates are a safety boundary, not validation of the underlying code.
7. **Development dependencies:** seven moderate minimatch/typescript-eslint findings remain; compatible update/dry-run attempts did not resolve them. Production npm, Bun and NuGet audits were clean at execution time; this is not a guarantee against future advisories.

No JWT, login, account, roles, browser cookies, new authorization requirement, wildcard CORS or provider key exposure was introduced. Proxy routes remain allowlisted, bounded, no-store, cancellation-aware and server-only. Markdown skips HTML and catalog/source URLs accept only HTTP(S). Production Swagger is 404. Pattern scanning of tracked source/config/docs found no OpenRouter/OpenAI key-shaped secrets or populated SQL passwords; the `NEXT_PUBLIC` match was documentation warning against exposure, not client configuration. This limited scan is not a comprehensive historical secret-scan guarantee.

SQL container/databases and all existing records are preserved. Tagged technical test records remain for audit; they are not scientific data or real model outputs. At completion the QA Next.js/API/Bun/timing-harness processes launched by this task were stopped; their shell termination exit codes are intentional cleanup, not failed test verdicts. The SQL container was retained and the unrelated port-3000 process was not stopped.

## F. Changed-file inventory

All paths below are relative to `vulcan-x/` unless prefixed with repository root.

| Files | Change |
| --- | --- |
| `Frontend/components/dashboard/CatalogBrowser.tsx` **new**, `Frontend/lib/catalog-browser.ts` **new** | Live material/experiment/technology/source search, paging, normalized record validation, relationships, selection, retry/cancel/no-fallback states |
| `Frontend/components/dashboard/HabitatRecordLookup.tsx` **new** | Saved-record GET-only UI; never enables scientific submission |
| `Frontend/components/dashboard/MaterialsModule.tsx` | Live default catalog; explicit offline comparison mode |
| `Frontend/components/dashboard/EarthBridgeModule.tsx` | Live technology browser; separate offline target workbench |
| `Frontend/components/dashboard/DashboardShell.tsx`, `StressTestModule.tsx`, `Frontend/components/SystemArchitecture.tsx`, `Frontend/app/dashboard/dashboard.css` | Correct live/offline/provenance labels; clarify local teaching API; responsive live catalog surfaces |
| `Frontend/components/dashboard/KnowledgeQueryPanel.tsx`, `Frontend/lib/knowledge-query.ts` | Persisted provider provenance validation/display; no historical inference claim |
| `Frontend/lib/habitat-analysis.ts` | Validate nested saved inputs/results/citations/ProblemDetails before rendering |
| `Ai Model/src/services/providerErrors.ts` **new** | Safe provider unavailable/invalid-answer categories |
| `Ai Model/src/services/ragService.ts` | Remove deterministic Knowledge fallback; qualified context prompt; propagate actual final answer/provenance |
| `Ai Model/src/services/aiProviderService.ts` | Reject reasoning/truncation/invalid model identity; align 100-character SQL model boundary; retain safe key errors and cancellation |
| `Ai Model/src/controllers/aiController.ts`, `simulatorController.ts`, `types/index.ts`, `index.ts` | Safe failure HTTP mapping/typing, injectable app, metadata contract, truthful configuration banner, no wildcard CORS, production diagnostics/scientific gates |
| `Backend/NASA-Project-Back-End/NASA.FireSafety.API/NASA.FireSafety.API/Services/KnowledgeQueryService.cs` | Validate/store/report provenance in existing columns; safe historical semantics |
| Same API project's `DTOs/Knowledge/KnowledgeDtos.cs`, `ExternalServices/VulcanXAI/Contracts/Responses/AiQueryResponse.cs`, `ExternalServices/VulcanXAI/VulcanXAiClient.cs` | Generation DTOs and upstream 504/502 classification |
| Same API project's `Controllers/VulcanXSimulatorController.cs` | Close default raw-simulator bypass of scientific-submission gate |
| Same solution's tests: `LegacySimulatorGateTests.cs` **new**, `PersistenceWorkflowTests.cs`, `SqlWorkflowTests.cs`, `VulcanXAiClientTests.cs`, `LiveProxyCancellationTests.cs` | Safety/status/provenance regressions; real SQL duplicate/FK/rollback cases; explicit timing-fixture semantics |
| `Ai Model/tests/integration-audit.test.ts` **new**, `api.test.ts`, `cancellation.test.ts` | Provider failure/final output/identity/production-gate tests; declared provider fixture; typing |
| `Frontend/tests/catalog-browser.test.ts` **new**, `tests/e2e/integration-audit.spec.ts` **new**, `habitat-analysis.test.ts`, `tests/e2e/dashboard.spec.ts`, `tests/e2e/live-sql.spec.ts` | Boundary/UI regressions and actual no-provider SQL browser evidence; live provider success explicitly gated |
| `Frontend/tests/integration/controlled-vulcan.mjs` | Explicit fixture-vs-real-provider mode; timing fixture cannot masquerade as inference |
| Root `README.md`; frontend/backend/Bun READMEs; Bun `API_DOCUMENTATION.md`; historical `milestone-5-6-report.md`; this report **new** | Current runbook, evidence, mock/static inventory, safety/external blockers; historical evidence preserved |

No source files removed. No database schema/migration, package manifest/lockfile, target framework, or authentication architecture changed.

## G. Final verdict

**PARTIALLY INTEGRATED — EXTERNAL BLOCKERS REMAIN**
