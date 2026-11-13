# Milestones 5–6 execution report

> Historical evidence below is retained unchanged. Current provider-only Knowledge semantics, live catalog UI, safety fixes and freshly executed verification are documented in [integration-audit-2026-11-13.md](integration-audit-2026-11-13.md). Earlier HTTP successes based on source-bound local text are not proof of LLM inference.

### Merge reconciliation with updated main — 13 November 2026

Merged main commit `f826fb6` (NASA link-intelligence expansion and optional grounded provider generation) with the Milestone 5/6 implementation. Preserved both retrieval/link features and cancellation safeguards. The newer Knowledge generation path now receives the caller signal and cancels actual provider work at main's seven-second deadline; client cancellation cannot silently become fallback success. Added one regression case for this merged path. Post-resolution checks: **14 Bun tests / 187 assertions** and **124 frontend unit tests** passed; frontend lint passed. Earlier live evidence below describes the implementation at its execution time: the merged service now supports optional provider synthesis, but genuine provider inference has still not been verified without credentials. Scientific approval/deployment blockers remain unchanged.

## Current Milestone 6 continuation — 13 November 2026

**Milestone 5 remains complete. Milestone 6 is still INCOMPLETE:** all feasible local engineering/integration work below passed, but no responsible science-team-approved Habitat fixture or authoritative production hosting/execution ceiling was supplied. Provider-backed inference is also unavailable and is not part of the current source-bound Knowledge implementation. No fabricated approval, scientific input, citation, provider response, or live Habitat success is claimed.

This section supersedes the earlier blocked baseline retained below. Existing uncommitted Milestone 5 edits were preserved. Repository HEAD was detached at `9dbf3c564705b7add78851113cc96bf34f0f7333`; no commit, push, reset or cleanup of user work was performed.

### Runtime and SQL provisioning — current evidence

| Item | Verified result |
| --- | --- |
| OS / JS tools | Windows 11 Home 10.0.26300 x64; Node v24.16.0; npm 11.18.0; Bun 1.4.4 |
| Actual development SDK/runtime | **.NET SDK 8.0.422, ASP.NET Core / .NET runtime 8.0.28**, extracted to approved temporary storage; official Microsoft SDK archive SHA-512 verified against release metadata. All current backend restore/build/test used this SDK/runtime, not SDK 9 or runtime roll-forward. |
| Project target/tooling | `net8.0`, EF Core 8.0.34 unchanged. Added SDK-8 `.sln` plus `global.json` (8.0.400/latestPatch); retained original `.slnx`. |
| SQL engine | Dedicated Docker SQL Server **2022 Developer 16.0.4325.4 (64-bit)**; Docker Linux engine 29.9.3. Container `flame-m6-sql-neon-tiger`, bound only to loopback port 14339, memory capped at 2 GB / 2 CPUs. Other running project containers were left intact. |
| SQL image | `mcr.microsoft.com/mssql/server:2022-latest`, pulled digest `sha256:4525e3efac9f3e241cb003bb2ff2a82818b502f37e12049d788b1a9fa7e13b7f` |
| Databases | `Flame_M6_Dev` for workflows; separate fresh `Flame_M6_SeedEvidence` for reproducible first/second seed evidence. Random local credential stored only in User Secrets/container environment; no populated connection string in the repository/report. |
| Migration/schema | Applied the existing `20261112173807_InitialDatabaseSchema` with EF `MigrateAsync` against real SQL Server. One migration-history row, **17 application tables**, trusted/enabled foreign keys. No schema change/new migration. |
| Test target safety | SQL tests reject any database not named `Flame_M6_*`; no InMemory/SQLite substitution, database reset/deletion or unknown target seeding. |

Fresh `Flame_M6_SeedEvidence` seed result, captured in `seed-evidence-fresh.trx`:

| Seed counter | First call | Second call |
| --- | ---: | ---: |
| ResearchSources | 3 | 0 |
| Environments | 3 | 0 |
| Materials | 1 | 0 |
| Experiments | 1 | 0 |
| ExperimentSources | 1 | 0 |
| Technologies | 1 | 0 |
| TechnologyApplications | 1 | 0 |

The actual `--seed-curated-catalog` CLI was also executed twice on the already seeded `Flame_M6_Dev`; **both returned zero additions for all seven counters**. Counts/stable keys remained equal before/after repeated seeds; no duplicate stable-key records.

Actual fresh seeded table counts: ResearchSources **3**, SpaceEnvironments **3**, Materials **1**, ExperimentMaterials **1**, Experiments **1**, ExperimentSources **1**, Technologies **1**, TechnologyApplications **1**; AnalysisCitations, AnalysisFactors, ExperimentParameters, HabitatAnalyses, KnowledgeCitations, KnowledgeQueries, MaterialProperties, TechnologyExperiments, TechnologySources **0**. Migration history is an additional infrastructure table, not one of the 17 entities.

Workflow database snapshot after the final integration rerun: KnowledgeQueries **31**, KnowledgeCitations **22**, HabitatAnalyses **0**; no Pending/Running records at the checked snapshot. Remaining catalog/relationship counts equal the fresh catalog above. The earlier 30-record snapshot contained 11 Completed and 19 Failed (9 cancellation, 4 timeout, 3 unavailable, 2 invalid response, 1 unexpected workflow failure); the additional record was the successful browser rerun noted below. Test records are retained, not deleted to disguise failures.

### Implemented protections and cancellation semantics

- Enforced **32 KB** bodies at Kestrel and middleware, covering declared length and actual/chunked bytes; Next.js also bounds JSON body reads. Oversize → safe **413**.
- Per-process **32 global**, **2 Habitat**, **2 Knowledge** concurrent requests; **zero waiting queue**. Raw AI/simulator proxy routes share their corresponding permits. Saturation → safe **429**. Try-acquire + `finally` releases on success/error/cancellation/body rejection. No IP/forwarded-header trust, authentication or CORS added.
- Centralized safe unexpected/database error responses (**500/503**, `errorCode`, `traceId`, no raw exception). SQL outage through actual Next.js/ASP.NET returned safe `DATABASE_UNAVAILABLE` and recovered after SQL restart.
- Workflow cleanup retains existing **Failed** status with `REQUEST_CANCELLED`, `VULCANX_TIMEOUT`, or safe failure code, completion time and duration. It clears partial tracked results, reloads the committed record, and uses its own **five-second token**. A committed Completed record is not rewritten by late cancellation. SQL unavailability remains an honest limit on cleanup guarantees. Process crashes/restarts are not claimed to have a durable job-recovery mechanism.
- Actual TCP cancellation tests proved Next.js signal → ASP.NET `RequestAborted` → upstream socket close, and **Running → Failed in SQL**. Upstream harness metrics after cancellation showed **active=0, disconnected=3**. No POST idempotency promise or automatic retry was introduced.
- Bun propagates caller signals, does not rotate keys after cancellation, strips private exception details, bounds provider work at **55s total / 40s per attempt**, and aborts actual hazard-explanation work at **8s** instead of leaving a losing promise running. Existing educational numerical formulas were not changed. Bun binds to private loopback by default; diagnostics remain outside the browser/backend allowlists.
- Habitat live submission is disabled by default **in backend and UI**, not only client-side. Enablement requires a real approval/provenance reference; none was supplied. Empty scientific inputs remain empty; no demo values were promoted to approved defaults. `isScientificallyValidated` remains false.

### Timeout strategy and deployment boundary

Verified local self-hosted chain: Bun provider **55s** → ASP.NET AI **60s** → bounded terminal cleanup **5s** → Next.js proxy **75s**, leaving 10s transport/processing margin. All values are server-side. `FIRE_SAFETY_AI_TIMEOUT_SECONDS` must declare the same value as `VulcanX:TimeoutSeconds`; proxy requires at least declared AI +15s. `FIRE_SAFETY_API_TIMEOUT_SECONDS` is configurable; optional `FIRE_SAFETY_MAX_EXECUTION_SECONDS` must allow proxy+5s or requests fail closed with safe 503.

**No production platform or hard execution ceiling is configured/approved in this checkout.** Local Next.js Node hosting passed an actual **11-second** request (the old 10s regression). Controlled deadline testing used backend **15s** while retaining the conservative proxy budget, returned **504 + real queryId** before proxy expiry, and persisted Failed in SQL. This does not certify a 75s serverless deployment budget. A host with shorter hard limits needs a designed durable async/polling workflow; no speculative async API/schema was added without a deployment target.

### Commands and exact final results

Temporary build/evidence paths are outside Git. `<sdk8>/dotnet.exe` below is the verified SDK 8 executable, `<artifacts>` is `flame-m6-build`, and `<evidence>` is `flame-m6-evidence` in approved temporary storage. See backend README for portable setup.

| Command | Exact result |
| --- | --- |
| `<sdk8>/dotnet.exe --info` | SDK **8.0.422**, host/runtime **8.0.28** |
| `dotnet restore NASA.FireSafety.API.sln --artifacts-path <artifacts>` | Passed; both projects restored/up-to-date |
| `dotnet build NASA.FireSafety.API.sln --no-restore --artifacts-path <artifacts>` | Passed; **0 warnings, 0 errors** |
| `dotnet test NASA.FireSafety.API.sln --no-build --artifacts-path <artifacts> --logger 'trx;LogFileName=milestone6-final.trx' --results-directory <evidence>` with SQL + live-proxy environment | **46 passed, 0 failed, 0 skipped**; .NET 8 execution; includes 10 protection cases, 10 real-SQL service cases, 4 actual TCP proxy cases, approval gate, and preserved prior tests |
| Fresh seed verification filter on new `Flame_M6_SeedEvidence` | **1 passed**, first/second counter results above; existing migration applied |
| `--seed-curated-catalog` twice | Both passed; all counters zero on existing workflow DB |
| `npm install --save-dev --save-exact vitest@4.1.12` | Compatible minor patch, critical advisory removed |
| `npm audit fix` (without force) | No further compatible fix; seven moderate development findings remain |
| `npm ci` | Passed; 680 packages installed from updated lockfile |
| `npm test` | **124 passed, 0 failed, 14 files** (baseline 119 + 3 timeout/budget + 2 proxy-size cases) |
| `npm run lint` | Passed, exit 0 |
| `npm run build` | Passed, optimized production build and TypeScript, exit 0 |
| `npm run typecheck` | Passed, exit 0 (sequential after build) |
| `npx playwright test --workers=1`, `BASE_URL=http://localhost:3107`, live SQL enabled, real backend/Bun | **133 passed, 0 failed, 1 intentionally skipped** (134 defined; baseline 130 +4 live integration gates). The one skipped unavailable-upstream scenario requires stopping Bun and was run separately below. |
| `npx playwright test tests/e2e/live-sql.spec.ts --grep 'real unavailable' --workers=1`, live-failure enabled and actual Bun stopped | **1 passed, 0 failed**; actual Failed SQL record/GET and browser error-ID state |
| `npx playwright test tests/e2e/live-sql.spec.ts --grep-invert 'real unavailable' --workers=1` after final rebuild | **3 passed, 0 failed**; live catalog, browser Knowledge, Habitat gate |
| `bun install --frozen-lockfile` | Passed; lockfile unchanged |
| `bun test` | **12 passed, 0 failed, 122 assertions** (baseline 10 + 2 cancellation/error-safety cases) |
| `npm audit` | **7 moderate, 0 high, 0 critical**; development-only chain below |
| `npm audit --omit=dev` | **0 vulnerabilities** |

Initial red tests reproduced the short proxy budget, unbounded request reads, missing body/concurrency implementation, Running records after cancellation, missing backend approval gate, and upstream error leakage. They were fixed rather than weakening assertions. The original 119 unit/130 browser assertions remain intact. New SQL/TCP tests explicitly skip when their external environments are not provided; the recorded 46-test run provided both and skipped none. TestSprite remains unconfigured; no unsolicited external project created.

### Evidence classification

| Gate | Status | Evidence |
| --- | --- | --- |
| Migration, 17 tables, FK trust, repeated seed, no duplicates | Passed — live evidence | SQL Server engine/version and actual before/after table counts above; existing migration only |
| Eight catalog APIs | Passed — live evidence | Actual environments/materials list+detail/experiments list+detail/source detail/technologies list+detail through production Next.js; search, page size/page2, relationships, safe 404 checked |
| Browser real catalog IDs | Passed — live evidence | environment **1**, material **1**, experiment **1**, source **2**, technology **1** discovered from responses; no hardcoded input IDs in test |
| Browser persisted Knowledge POST/GET | Passed — live evidence | Real SQL + actual Bun source-bound retrieval; two sample IDs below; all browser API traffic same-origin `/api/backend/*` |
| Real upstream unavailable + browser failed record retrieval | Passed — live evidence | Bun process actually stopped, 503 + real queryId, GET Failed; no fake response |
| Cancellation SQL persistence / RequestAborted / late-response safety | Passed — live evidence | Four TCP tests and actual SQL terminal-state assertions; controlled upstream timing, not provider inference |
| Matched/unmatched/no-citation record mapping | Passed — automated test | Real SQL service tests with explicitly labeled upstream fixtures; current actual Vulcan-X returns URLs, which remain unmatched by exact-title-only matcher |
| Citation rendering / unmount / same-tick duplicate/race states | Passed — fixture/mock only | Preserved seven Knowledge browser scenarios; no invented source added to catalog |
| 32 KB actual/chunked limit | Passed — live evidence | Actual Kestrel POSTs return 413 with safe body; middleware/proxy boundary cases also automated |
| Global32 / Habitat2 / Knowledge2 / zero queue | Passed — automated test | Ten deterministic blocking-task protection cases, all passed; operation capacity shared with raw proxy paths |
| Actual HTTP saturation/permit recovery | Passed — live evidence | Two live Knowledge operations held, third returned 429, both cancelled records became Failed, subsequent request succeeded |
| Upstream deadline / >10s valid operation | Passed — live evidence | Actual TCP + SQL with controlled 15s deadline and 11s delayed actual source-bound response; no fabricated successful answer |
| SQL failure response safety/recovery | Passed — live evidence | Dedicated SQL container stopped, real proxy returned 503 `DATABASE_UNAVAILABLE` without connection details; restarted SQL returned three environments |
| Backend/Bun health | Passed — live evidence | Both actual `/health` and backend `/api/v1/ai/health` returned 200 healthy (not SQL readiness) |
| Offline Playbook / educational WebGL | Passed — automated test | Full preserved browser suite; offline generation works with backend requests blocked |
| Missing-scientific-fixture gate | Passed — live evidence | Browser scientific fields blank/submit disabled; real backend rejected 422 `HABITAT_FIXTURE_NOT_APPROVED`; **zero Habitat records** |
| Approved-fixture Habitat Completed/Failed lifecycle | Blocked — external dependency | Responsible science/AI team has supplied no approved input/provenance fixture; no real analysisId generated |
| Genuine provider-backed inference | Blocked — external dependency | No provider credentials present; current Knowledge service is source-bound retrieval and never calls provider generation. Provider cancellation is tested with controlled fake transport only. |
| Production host execution-limit signoff | Blocked — external dependency | No intended production host/configuration/hard request ceiling supplied; no claim of deployment-budget compliance |
| System crash recovery of in-flight jobs | Not tested | No durable async job/recovery mechanism introduced or claimed |
| Secret/client-bundle boundary | Passed — automated test | Tracked real-key-pattern scan **0**, only `.env.example` tracked, static bundle private-config scan **0**; limited pattern scan, not a guarantee no unknown secret exists |

### Real saved-record samples

| Origin | Actual SQL ID | Persisted outcome |
| --- | --- | --- |
| Browser → production Next.js → API → actual source-bound Bun | `dc7650b4-6b21-426b-b55c-d670866e4e0f` | Completed, HasOnlyUnmatchedCitations; not provider inference/scientific validation |
| Final browser rerun | `949962a5-07f0-4690-86a9-e090e5a983ca` | Completed, HasOnlyUnmatchedCitations |
| Browser with actual Bun process stopped | `c2349e3d-40b6-4db9-b354-4515c18118e6` | Failed, VULCANX_UNAVAILABLE; retrievable through UI |
| Actual TCP cancellation with controlled upstream timing | `48360a93-e32f-46cf-b6c7-aa02b951d8a9` | Failed, REQUEST_CANCELLED |
| Actual TCP upstream timeout with controlled timing | `58b0a5d2-5ab8-43d5-9928-f94ea9948a36` | Failed, VULCANX_TIMEOUT; proxy preserved 504/queryId |
| 11-second controlled delay forwarding actual source-bound reply | `54a22aaf-97bc-4ae5-a2d3-8dc1f42c71a5` | Completed; old short-proxy bug regression |

Matched/no-citation/invalid-response service-test IDs are real SQL records with **fixture upstreams**, not genuine provider successes. No real Habitat `analysisId` exists; technical InMemory Habitat unit fixtures are not approved scientific inputs.

### Dependency/security review

Vitest direct dev dependency **4.0.18 → 4.1.12** removed the critical exposed-development-server advisory and related mocker findings. Full frontend checks passed after the compatible update; no forced update/override/major bump. Remaining **7 moderate dev-only** findings are `minimatch` (10.2.6) via `@typescript-eslint/typescript-estree`, `@typescript-eslint/parser`, `@typescript-eslint/type-utils`, `@typescript-eslint/utils`, `@typescript-eslint/eslint-plugin`, and `typescript-eslint` (8.72.2). Advisory GHSA-g3hv-75wg-m249 requires minimatch >=11.0.1; the currently published parent still requests ^10.2.2. `npm audit fix` did not resolve it. A forced minimatch-major override was not used without upstream compatibility proof. Production dependency audit reports zero.

Only placeholder `.env.example` files are tracked; random SQL credentials stayed in local User Secrets/container environment, never browser bundles/source/report. Actual production API Swagger and unallowlisted key-status return 404. AI diagnostics bind privately and are not exposed by backend/Next.js. Safe SQL outage/413/429 errors, no auth/JWT/roles/new CORS, and scientific disclaimers were retained.

### Changed files in this continuation (in addition to preserved Milestone 5 files)

Paths relative to `vulcan-x/`:

- `Backend/NASA-Project-Back-End/README.md`: actual .NET8/SQL setup, secrets, limits, test and fixture gates.
- `Backend/NASA-Project-Back-End/NASA.FireSafety.API/global.json`, `NASA.FireSafety.API.sln`: actual .NET8 SDK selection and compatible solution.
- Under `Backend/NASA-Project-Back-End/NASA.FireSafety.API/NASA.FireSafety.API/`: `Program.cs`, `NASA.FireSafety.API.csproj`; `Middleware/RequestProtectionMiddleware.cs`, `Middleware/SafeErrorsMiddleware.cs`; `Services/KnowledgeQueryService.cs`, `Services/HabitatAnalysisService.cs`, `Services/HabitatSubmissionOptions.cs`; `Controllers/HabitatAnalysesController.cs`: request enforcement, sanitized errors, bounded terminal persistence, approval gate and User Secrets ID.
- Under its `NASA.FireSafety.API.Tests/`: `NASA.FireSafety.API.Tests.csproj`, `PersistenceWorkflowTests.cs`, `RequestProtectionTests.cs`, `HabitatApprovalGateTests.cs`, `SqlWorkflowTests.cs`, `LiveProxyCancellationTests.cs`: preserved plus added deterministic, real SQL and TCP test coverage.
- `Frontend/lib/server/fire-safety-api.ts`, `lib/server/fire-safety-routes.ts`, `.env.example`: coherent budget validation and bounded proxy bodies.
- `Frontend/package.json`, `package-lock.json`: compatible Vitest security patch.
- `Frontend/tests/backend-proxy-routes.test.ts`, `tests/proxy-timeout.test.ts`, `tests/e2e/live-sql.spec.ts`, `tests/integration/controlled-vulcan.mjs`: boundary, budget and actual browser/TCP integration evidence.
- `Frontend/README.md`: live opt-in commands and timeout/deployment limitations.
- `Ai Model/src/controllers/aiController.ts`, `src/controllers/simulatorController.ts`, `src/services/aiProviderService.ts`, `src/services/physicsSimulatorService.ts`, `src/services/physicsEngineService.ts`, `src/services/ragService.ts`, `src/index.ts`, `.env.example`, `README.md`, `tests/cancellation.test.ts`: signal propagation, bounded provider work, safe error details/private bind, tests/docs. No educational scientific formula change.
- This report and `frontend-backend-integration-plan.md`: superseding evidence and portable runbook.

**Remaining blockers:** approved scientific Habitat fixture/provenance; provider credentials and an approved provider-backed workflow if inference is required; actual production deployment platform/execution-limit approval; compatible upstream resolution of seven moderate development-only advisories. Local SQL/runtime/protections/cancellation/Knowledge integration are no longer blockers. **Milestone 6 is not marked complete while the mandatory approval/deployment gates remain blocked.**

QA cleanup: application/Bun/timing-harness processes were stopped after verification; the dedicated SQL container was **stopped, not deleted**, preserving both databases and test evidence. Resume with `docker start flame-m6-sql-neon-tiger` and local User Secrets; no credentials are in this report. Detailed TRX evidence remains under approved temporary `flame-m6-evidence` storage. `git diff --check` passed; no commits/pushes were made.

---

## Historical Milestone 5 completion / initial Milestone 6 baseline (superseded)

Date: 13 November 2026.

**Milestone 5: complete (frontend implementation and verification). Milestone 6: incomplete / blocked.** No live SQL-backed Knowledge/Habitat success is claimed. See [execution plan](frontend-backend-integration-plan.md) for clean-machine setup and remaining evidence gates.

## Machine and source baseline

| Item | Observed |
| --- | --- |
| OS | Windows 11 Home, 10.0.26300, x64 |
| Repository | Single monorepo; frontend, backend and AI baseline commit `9dbf3c564705b7add78851113cc96bf34f0f7333` (`First Commit - Backend Integration`) |
| Initial working tree | Clean; partial Milestone 5 work was already committed, not an outstanding user diff |
| .NET SDK | 9.0.300; projects remain `net8.0` |
| System runtimes | Microsoft.NETCore.App 8.0.28 / 9.0.5; Microsoft.AspNetCore.App **9.0.5 only** (8 missing) |
| Temporary QA runtime | Microsoft.NETCore.App and Microsoft.AspNetCore.App **8.0.28**, extracted under the approved temp directory from Microsoft's release archives after SHA-512 checks against official release metadata. System installation unchanged. |
| Node / npm / Bun | v24.16.0 / 11.18.0 / 1.4.4 |
| Next.js / Vitest | 16.4.6 / 4.0.18, installed from existing lockfile |
| SQL Server | No SQL services, SQL tooling on PATH, or confirmed dedicated database available; version unavailable |
| Local configuration | No `ConnectionStrings:FireSafetyDb` in checked-in appsettings or corresponding process environment variable. No populated local secrets created. |
| API configuration | Launch settings: HTTP 5082, HTTPS 7137. Backend Vulcan-X base defaults to localhost:4000, timeout 60 seconds. Frontend server-only base URL not provisioned for a real backend. |

## Files changed

Paths below are relative to `vulcan-x/`:

| File | Change |
| --- | --- |
| `Frontend/lib/knowledge-query.ts` | Validate nested answers/citations/source/error fields; reject malformed responses safely while retaining valid saved query IDs. |
| `Frontend/components/dashboard/KnowledgeQueryPanel.tsx` | Synchronous duplicate-submit lock; stale-response/finalizer protection; abort on unmount; distinct cancel/submit button identities; cancellation/persistence warning; automatic saved-ID retrieval field; validation/trace/status display; mock labeling, source ID/DOI and accurate context limitations. |
| `Frontend/components/dashboard/PlaybookModule.tsx` | Qualify the no-provider/no-backend text as **offline mode**; no educational generation behavior changed. |
| `Frontend/tests/knowledge-query.test.ts` | Running/Failed records and malformed nested success/error regression cases, alongside canonical contract, status/ID, citation and offline tests. |
| `Frontend/tests/e2e/knowledge-query.spec.ts` | Seven browser tests: missing selection, submission/retrieval, citations, Failed/mock/no-citation results, same-tick duplicate prevention, cancellation races/unmount, offline independence, and three widths. Explicit contract fixtures, not live integration. |
| `Frontend/tests/e2e/helpers/catalog-fixtures.ts` | Shared deterministic catalog fixtures for educational regressions; not SQL evidence. |
| `Frontend/tests/e2e/dashboard.spec.ts` | Update stale pre-integration control labels and isolate educational tests from unavailable backend catalog requests; assertions retained. |
| `Frontend/tests/e2e/flame-response.spec.ts` | Same control-label and catalog-fixture repair for existing WebGL/SVG regressions. |
| `Frontend/tests/e2e/habitat-chamber.spec.ts` | Isolate educational chamber regressions from absent live catalog services using the same explicit fixtures. |
| `Frontend/tests/e2e/scroll-motion.spec.ts` | Retain rendering assertions; verify navigation lands at the simulator heading, then use ordinary scrolling to reach sliders now below the added catalog controls. |
| `Frontend/README.md` | Server-only setup, live/offline distinction, accurate Knowledge context/cancellation limitations, links to this report and plan. |
| `Backend/NASA-Project-Back-End/docs/integration/frontend-backend-integration-plan.md` | Reconciled current contracts, setup/run commands, unresolved backend discrepancies and live evidence matrix. |
| `Backend/NASA-Project-Back-End/docs/integration/milestone-5-6-report.md` | This report. |

No backend runtime code, database schema/migrations, AI implementation, dependency manifests/lockfiles, authentication or CORS settings were changed. Temporary .NET build artifacts were directed outside the repository, avoiding its pre-existing tracked bin/obj files.

## Automated commands and results

Frontend commands run from `vulcan-x/Frontend`; backend commands from `vulcan-x/Backend/NASA-Project-Back-End/NASA.FireSafety.API`; AI commands from `vulcan-x/Ai Model`.

| Command | Result |
| --- | --- |
| `npm ci` | Passed; installed existing lockfile, 680 packages. Audit reported 9 existing advisories: 8 moderate, 1 critical. |
| `npm test` | **Passed: 13 files, 119 tests; 0 failures.** |
| `npm run lint` | Passed, exit 0; no diagnostics. |
| `npm run build` | Passed, exit 0; optimized production build and TypeScript checks succeeded. |
| `npm run typecheck` | Passed, exit 0; no diagnostics, run after build. |
| `npx playwright test tests/e2e/knowledge-query.spec.ts --workers=1` with `BASE_URL=http://localhost:3107` | **Passed: 7 tests, 0 failures.** |
| Initial broader `npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/knowledge-query.spec.ts --workers=1` | 35 passed / 6 failed. Five failures referenced obsolete `Environment`/`Test material` labels; the sixth captured expected 503 catalog console errors without a configured backend. Tests repaired with current labels and explicit fixtures; no app assertions removed. |
| First full `npx playwright test --workers=1` | 127 passed / 3 failed. Two chamber cases captured unconfigured-catalog 503s and now use explicit catalog fixtures. One scroll test assumed the oxygen slider remained above the fold before catalog controls were added; it now verifies the destination heading then scrolls normally to the control. |
| Final `npx playwright test --workers=1` with `BASE_URL=http://localhost:3107` | **Passed: 130 tests, 0 failures (15 files, 3.2 minutes).** Includes all seven Knowledge cases and educational WebGL/SVG/offline regressions. |
| `dotnet restore NASA.FireSafety.API.slnx --artifacts-path <temporary-artifacts-directory>` | Passed; both projects restored. |
| `dotnet build NASA.FireSafety.API.slnx --no-restore --artifacts-path <temporary-artifacts-directory>` | **Passed: 0 warnings, 0 errors.** |
| Initial `dotnet test NASA.FireSafety.API.slnx --no-build --artifacts-path <temporary-artifacts-directory>` | Aborted, exit 1; 0 tests executed because system ASP.NET Core 8 was missing. Target framework was not changed or rolled forward to disguise this. |
| Same `dotnet test` with `DOTNET_ROOT_X64` and `DOTNET_ROOT` pointing to the verified temporary 8.0.28 runtime | **Passed: 19 tests, 0 failures, 0 skipped.** Actual `net8.0` execution; in-memory/stub tests, not live SQL evidence. |
| `bun install --frozen-lockfile` | Passed; 9 packages installed, lockfile unchanged. |
| `bun test` | **Passed: 10 tests, 0 failures, 117 assertions.** Source-bound/deterministic paths operated without provider keys; logs explicitly reported unavailable OpenRouter keys for recommendation fallback. Not proof of provider inference. |

The new unit tests initially reproduced eight malformed-response failures. The first Knowledge browser run reproduced duplicate POSTs and missing error-ID/cancellation behavior. A subsequent run exposed cancel-button DOM reuse triggering form submission; distinct button keys fixed that regression. Final Knowledge tests passed all seven cases. An early typecheck was run concurrently with build and failed on regenerated `.next/types`; sequential rerun passed. These diagnostic failures are not hidden final successes.

TestSprite: skipped because this repo is not linked/configured; existing Vitest/Playwright suites were used instead.

## Live/partial integration matrix

| Area | Status | Evidence / limitation |
| --- | --- | --- |
| Clean dependency restore / frontend build | Passed | npm/Bun locked installs and fresh .NET restore/build above; no original-machine binaries used. |
| SQL migrations / 17 tables / seed twice | Blocked | No provisioned approved SQL target; no migrations or seed run. Database name: **none provisioned**; historical `NASA_FireSafety_Dev` not assumed available. |
| Eight catalog endpoints and UI-to-SQL IDs | Blocked | No provisioned SQL path; unit/browser fixture results are not live catalog evidence. |
| Next.js rejection / backend unavailable | Passed (partial) | Production Next.js smoke server with a deliberately unavailable loopback backend: environments → **502**; unsupported Knowledge collection GET → **405**; invalid query ID → **400**; malformed JSON → **400**; non-JSON body → **415**; non-allowlisted key-status path → **404**. Response checks found no unavailable backend port, ECONNREFUSED, stack trace or connection string. |
| Proxy status/ProblemDetails/persisted IDs | Passed (fixtures); live persisted-ID checks blocked | Existing route tests cover allowlisted paths/statuses; Knowledge client tests cover 400/404/422/429/502/503/504 and queryId. Actual validation forwarding is separately verified below, but no real persisted record ID was available. |
| Real Next.js → ASP.NET validation | Passed (partial live) | Fresh backend ran on temporary .NET 8 with a deliberately unusable loopback SQL configuration, never migrated/seeded. Empty-body Knowledge and Habitat POSTs through the production Next.js proxy each returned actual ASP.NET **400** validation ProblemDetails (2 invalid fields), with traceId preserved and no authentication or private connection details. These requests fail model validation before SQL access; no records created. |
| Real ASP.NET → Vulcan-X health | Passed (partial live) | Backend `GET /api/v1/ai/health` called the actual Bun process and returned **200**, `status=healthy`. This does not test SQL readiness or provider inference. |
| Client bundle address boundary | Passed (limited scan) | Production `.next/static/**/*.js` scan: **0** matches for `FIRE_SAFETY_API_BASE_URL`, backend launch origins, or localhost:4000. No real provider secrets were configured; this is not a complete secret audit. |
| Habitat unapproved-fixture guard | Passed (unit contract) | Existing tests keep scientific fixture approval false; no illustrative oxygen/pressure/material values promoted to scientific defaults. |
| Habitat approved-fixture live lifecycle/failure | Blocked | No approved scientific fixture or working SQL/backend. No real `analysisId` generated. |
| Knowledge real POST/GET/Failed persistence | Blocked | Needs a provisioned SQL target. All saved-record UI tests use declared fixtures. No real `queryId` generated. |
| Vulcan-X process `/health` | Passed | Started the actual Bun service; HTTP **200**, `status=healthy`. Temporary service stopped afterward. |
| Upstream provider-backed inference | Not Tested | No provider credentials; no paid/external inference attempted. |
| Offline Playbook / WebGL | Passed | Offline generation passed with all backend requests blocked; Knowledge mode-switch abort tested. All 130 browser regressions passed; simulator implementation unchanged. |
| Backend explicit size/concurrency protections | Failed (source verification); live Not Tested | Reported 32 KB / 32 global / 2 Habitat / 2 Knowledge limits are absent from checked-in Program/controllers. Do not claim 413/429 saturation evidence. |
| Public error leakage across real backend failures | Blocked | Proxy smoke checks safe; no SQL/backend exception path exercised live. |
| Full frontend browser regression | Passed | 130 passed, 0 failed; catalog-dependent educational checks use explicitly identified fixtures, not live SQL. |

Fixture query ID `9d755727-8ca2-4c0a-a78c-4d94d3c1137f` is **test data only**, not a successfully persisted live record. Successful/failed live analysisId and queryId samples: **unavailable**.

## Remaining limitations and release blockers

1. For ongoing development install the .NET 8 SDK / ASP.NET Core 8 runtime, or explicitly select the verified temporary runtime used for these 19 passing tests. Provision an approved dedicated SQL development database, migrate, seed twice, and verify live catalog/workflow paths.
2. Reconcile missing backend body/concurrency protections with its owner before release. No backend implementation was silently substituted for the handoff's claims.
3. Reconcile the 10-second Next.js proxy budget with the backend's 60-second AI timeout. Client/proxy cancellation may occur after persistence, and the backend cancellation-to-Failed behavior needs a live test; cancelled POSTs are not safely idempotent.
4. Supply an approved scientific Habitat fixture before enabling or claiming successful live Habitat analysis. Existing scientific-validation flags remain false.
5. Current backend accepts but does not retain/forward Knowledge language. UI now says this explicitly; other saved context fields are not retrieval filters. Older provisional internal contracts were not implemented.
6. Existing `npm audit` advisories include critical direct dev dependency `vitest` and moderate ESLint/Vitest transitive packages. No forced dependency update was applied as part of this feature; review/remediate separately, and do not expose the Vitest development server.
7. Complete the manual live matrix and retain request/record IDs before closing Milestone 6. No clean second-machine SQL setup, provider inference, timeout persistence, or concurrency evidence is fabricated.

Offline generation logic/WebGL, anonymous architecture and scientific disclaimers remain intact. No credentials, populated local connection strings, invented scientific values, fabricated citations or validation claims were added. Temporary smoke services were stopped.
