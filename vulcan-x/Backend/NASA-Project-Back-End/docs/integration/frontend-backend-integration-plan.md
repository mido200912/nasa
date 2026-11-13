# Frontend/backend integration execution plan

Updated: 13 November 2026. This supplements the Milestone 5/6 handoff with the contracts actually present in this checkout. See [execution report](milestone-5-6-report.md) for results; this plan is not evidence that a live path passed.

## Contract reconciliation

- Use Option B: browser → same-origin Next.js `/api/backend/*` → ASP.NET Core → SQL Server / Vulcan-X. Backend addresses and keys remain server-only. No authentication, browser-to-backend calls, or additional CORS are introduced.
- Current public DTOs/controllers and `KnowledgeQueryService.cs` agree with the handoff's top-level Knowledge request. Older `codex-design/04-integration-contracts.md` describes a **provisional** internal `/v1/knowledge/ask` contract, not the currently implemented Vulcan-X `/api/v1/ai/query`. Do not implement the provisional contract as if it were deployed.
- Only `question` and mapped `environment` reach Vulcan-X. `environmentId`, `materialId`, `yearFrom`, `yearTo`, and `maxSources` are retained in `FiltersJson`; `language` is accepted but neither persisted nor forwarded. The UI documents this limitation instead of claiming effective retrieval filters.
- `GroundingStatus` describes exact local title matching, not source authenticity or scientific validation. Never create source records/URLs from unmatched titles.
- Current backend health forwarding is `GET /api/v1/ai/health`; it probes Vulcan-X, **not SQL readiness**. Vulcan-X exposes `GET /health`. There is no implemented backend root `/health` readiness route.
- Milestone 6 implements 32 KB body limits, per-process 32/2/2 concurrency permits and no waiting queue. Actual byte limits cover chunked bodies. Oversize/saturation are safe 413/429 ProblemDetails; permits release in `finally`. Automated tests cover global, Habitat, Knowledge and raw AI proxy boundaries; actual Kestrel 413 and TCP Knowledge 429 have passed.
- Coherent local synchronous budgets are provider 55s total (40s per attempt), backend AI 60s, independent failure cleanup 5s, proxy 75s. Declare the same backend AI timeout through server-only `FIRE_SAFETY_AI_TIMEOUT_SECONDS`; proxy requires at least +15s. An optional **actual** `FIRE_SAFETY_MAX_EXECUTION_SECONDS` must fit proxy+5s or requests fail closed. No production platform/ceiling was supplied: production execution-limit signoff remains blocked. A host unable to fit this budget needs a designed async job workflow before deployment.
- Cancellation uses existing `Failed`/`REQUEST_CANCELLED`, discards partial tracked output and reloads persisted records with a five-second cleanup token. Actual SQL/TCP tests verify Running → Failed on cancellation, timeout and unexpected failures. A completed commit is not overwritten by a cancellation arriving afterward. There is still no idempotent POST promise.
- Habitat submission remains disabled in UI and backend. No approved scientific fixture has been supplied. Configuring an approval reference is an operator/science-team responsibility, not scientific validation performed by code.

## Clean-machine setup

1. Clone this repository; record `git rev-parse HEAD` and `git status --short`. Do not use committed/local `bin` or `obj` as working builds. Current checkout includes such artifacts; build into a separate artifact directory for verification.
2. Install a .NET 8.0.4xx SDK **and ASP.NET Core 8 runtime**, Node/npm compatible with Next.js, Bun, SQL Server/LocalDB, and optional EF Core 8 CLI tooling. Record versions (`dotnet --info`, `dotnet --list-runtimes`, `node --version`, `npm --version`, `bun --version`, SQL `SELECT @@VERSION`). A .NET Core 8 runtime alone does not provide ASP.NET Core 8. Use the new SDK-8-compatible `.sln`; `.slnx` was retained but is not needed for .NET 8 builds.
3. Provision an explicitly approved, dedicated development SQL database under this machine's account. Set `ConnectionStrings__FireSafetyDb` locally without committing or printing credentials. The old user's `NASA_FireSafety_Dev` is historical, not automatically available or an approved target here. Never run migrations/seeding against an unknown/shared/production database.
4. Set backend `VulcanX__BaseUrl` to the intended private Vulcan-X origin and set matching timeout configuration as above. Read API ports from `NASA.FireSafety.API/NASA.FireSafety.API/Properties/launchSettings.json` or startup output. The current dedicated local QA setup is documented in the backend README; it is not an assumption about another laptop.
5. In `vulcan-x/Frontend`, run `npm ci`. Copy `.env.example` to ignored `.env.local`; set only server-side `FIRE_SAFETY_API_BASE_URL` to the intended API origin. Verify `.env.local` is ignored. Do not use `NEXT_PUBLIC_*`, commit secrets, or trust arbitrary `X-Forwarded-For` values.
6. In `vulcan-x/Ai Model`, run `bun install --frozen-lockfile`. Provision provider credentials only if approved/available, using ignored local configuration. Local deterministic source-bound responses do not prove paid provider inference or scientific validity.

## Database and backend commands

From `vulcan-x/Backend/NASA-Project-Back-End/NASA.FireSafety.API`, after the target database has been confirmed:

```powershell
# Use your chosen artifact directory; no original machine path is required.
$artifacts = Join-Path $env:TEMP 'flame-handoff-dotnet'
dotnet restore NASA.FireSafety.API.sln --artifacts-path $artifacts
dotnet build NASA.FireSafety.API.sln --no-restore --artifacts-path $artifacts
dotnet test NASA.FireSafety.API.sln --no-build --artifacts-path $artifacts

# EF Core 8 tooling must already be installed; connection comes from local configuration.
dotnet ef database update --project NASA.FireSafety.API/NASA.FireSafety.API.csproj
dotnet run --project NASA.FireSafety.API/NASA.FireSafety.API.csproj --no-launch-profile -- --seed-curated-catalog
dotnet run --project NASA.FireSafety.API/NASA.FireSafety.API.csproj --no-launch-profile -- --seed-curated-catalog
```

Record migration history, the 17 application tables, counts and unique stable keys before/after the second seed. The second seed must not add duplicates. Start the backend with its documented launch profile after provisioning. Backend unit tests use in-memory fixtures and cannot replace SQL verification.

Set `FIRE_SAFETY_SQL_TEST_CONNECTION` from the **local secret**, targeting a dedicated `Flame_M6_*` database, to enable `SqlWorkflowTests`. These apply the existing migration and test seed idempotency, persisted context/citations, terminal errors, cancellation and late replies using the actual SQL provider. Upstream responses in those service tests are explicit fixtures, not provider inference.

For actual TCP cancellation/deadline/capacity tests:

1. Start the real Bun service on private loopback 4000.
2. From `Frontend`, run `node tests/integration/controlled-vulcan.mjs` (loopback test harness 4011).
3. Start a separate backend process on loopback 5083 with the same local SQL secret, `VulcanX__BaseUrl=http://127.0.0.1:4011`, and `VulcanX__TimeoutSeconds=15` (test timing override only).
4. Start a production Next.js process on loopback 3109 with `FIRE_SAFETY_API_BASE_URL=http://127.0.0.1:5083`. The proxy's normal 75-second budget remains conservative.
5. Set `FIRE_SAFETY_LIVE_PROXY_URL=http://127.0.0.1:3109` alongside the SQL test connection and run the complete `.sln` tests. The four TCP tests prove actual RequestAborted propagation, SQL terminal persistence, 504 before proxy expiry, 429/recovery and an 11-second successful request. The timing harness forwards successful answers from the actual source-bound service; it fabricates no AI/scientific answer.

Absent SQL/TCP environment variables are explicitly **skipped**, never counted as live passes. SQL test collections serialize database-count checks; do not concurrently run browser writers against the same verification database.

## Automated frontend and AI checks

From `vulcan-x/Frontend`:

```powershell
npm test
npm run lint
npm run build
npm run typecheck
npx playwright install chromium
# Optional free frontend test port; do not reuse another application's server.
$env:BASE_URL = 'http://localhost:3107'
npx playwright test tests/e2e/knowledge-query.spec.ts --workers=1
npx playwright test --workers=1
```

Run typecheck **after**, not concurrently with build: Next.js regenerates `.next/types`. Knowledge browser tests explicitly use contract fixtures, including delayed responses to prove cancellation/duplicate-submit behavior. They are not live SQL/AI E2E tests. TestSprite is not configured; use this repo's Vitest/Playwright tools without creating an external project.

For the real SQL browser gates, set `FIRE_SAFETY_LIVE_SQL=1` and the production proxy's backend origin before the full browser command. The added `live-sql.spec.ts` uses no route mocks: eight catalog endpoints, IDs/relationships/filtering/paging, browser selection/Knowledge POST/GET, same-origin traffic, and the Habitat gate. Run its unavailable-service case separately with the real Bun process stopped, `FIRE_SAFETY_LIVE_FAILURE=1`, and `--grep 'real unavailable'`. Restart Bun afterward. Do not count source-bound excerpt retrieval as provider inference.

From `vulcan-x/Ai Model`: `bun test`. Then start the service with `bun run src/index.ts` and verify `/health` over HTTP. Record whether provider credentials/inference were available; do not equate deterministic fallback success with provider success.

## Manual live matrix and evidence gates

For each row record `Passed — live evidence`, `Passed — automated test`, `Passed — fixture/mock only`, `Blocked — external dependency`, or `Not tested`, with date, status, safe summary and actual record IDs where available. Never record secrets or full connection strings.

| Area | Required live check |
| --- | --- |
| Catalog | All eight read endpoints: environments; materials list/detail; experiments list/detail; sources detail; technologies list/detail. Use IDs discovered from actual records, check relationships, pagination, filters, and empty results. Compare displayed catalog IDs with SQL. |
| Proxy | Browser network uses only same-origin `/api/backend/*`. Confirm fixed paths/methods, rejected arbitrary paths, safe ProblemDetails/status/ID forwarding, backend-unavailable behavior, no addresses/secrets in client bundles. |
| Habitat gate | Live submission stays disabled without approved scientific fixtures; educational WebGL/sliders do not supply scientific defaults. |
| Habitat live | Only with an approved fixture: POST, Running → Completed, GET and compare persisted inputs, factors/citations/limitations. Confirm `LlmInterpretationOnly` and scientific-validation false. Controlled upstream failure must persist Failed and return `analysisId`. |
| Knowledge live | Select an actual catalog environment; POST, inspect upstream question/environment only, GET the saved ID and compare answer/status. Exercise matched, unmatched and no-citation responses without fabricating evidence. |
| Failure persistence | Controlled invalid/unavailable/timeout upstream response: safe 502/503/504, persisted Failed and `queryId` where supplied. Retrieve before resubmitting; POST has no idempotency contract. Test cancellation for stuck Running records. |
| Limits/security | Verify malformed JSON, invalid IDs/fields, actual/chunked oversized bodies, all concurrency boundaries, permit cleanup and safe 413/429. Exercise SQL outage sanitization through Next.js. No implicit forwarded-IP trust. |
| Offline | Stop backend/Vulcan-X; generate/stop/regenerate/export Offline Playbook. No live labels or live query required; WebGL remains illustrative. |
| Regression | Full frontend, backend and AI suites plus all live rows above. Document existing regression failures rather than silently weakening tests. |

Milestone 6 stays incomplete while required scientific approval, provider/deployment gates or live checks remain blocked. The prior missing protections and SQL/runtime setup have now been implemented/tested locally; that does not grant scientific approval or certify an unspecified production platform. See the current execution report rather than treating the previous baseline as current evidence.
