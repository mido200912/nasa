# Milestone 7 — production readiness

**Verdict: PARTIALLY READY — EXTERNAL INFRASTRUCTURE DECISIONS REQUIRED**

Prepared 14 November 2026. This is local hardening/deployment preparation, **not**
public deployment approval. No provider/domain/subscription was selected or
purchased. No public deployment, commit, push, account system or scientific engine
was introduced. Habitat submission remains disabled.

Worktree: `C:\Users\amrma\.local\share\opencode\worktree\c1bdf7\neon-tiger`;
branch `milestone-6-integration`; HEAD
`d8f0f49baf8c148d682c21283c6d556adaf2a457`. Existing uncommitted audit/inference work
was retained. The owner's ignored Bun `.env` was not changed, copied into release
assets or displayed.

### Owner decision follow-up — .NET 8 remains mandatory

The owner explicitly confirmed the NASA competition requires **.NET 8**. This is
an **accepted project constraint**, not a request to migrate and not a claim that
the runtime is production-supported. Both backend projects remain strictly
`net8.0`; all EF Core packages remain compatible 8.x. No `TargetFramework`/
`TargetFrameworks`, EF version, unrelated dependency version or Docker base-image
version was changed for this follow-up. Do not introduce .NET 10 or another target.

The audit records official .NET 8 end of support on **November 10, 2026**. Current
official metadata still lists SDK **8.0.428** and runtime **8.0.34**; the existing
API Dockerfile pins those versions. Use the latest available .NET 8 patch wherever
possible. The latest patch **does not restore official Microsoft support after
EOL**; security updates and official servicing are no longer guaranteed.

**Separate public-production support-risk gate: OPEN.** The framework decision
does not approve deployment risk. Before public release, document the accountable
owner/security approver, environment/release/image digests, risk acknowledgment,
review/expiry date, residual vulnerabilities and evidence of the feasible
compensating controls: private service boundaries, approved TLS/proxy trust,
least-privilege SQL/secrets, anonymous rate/cost/body/concurrency controls,
maintained OS/base-image scanning, monitoring/incident ownership, backup/restore
and rollback. Define reassessment and suspend-access criteria for unmitigated
critical risks. These measures cannot restore vendor servicing or guarantee
protection against unpatched .NET 8 vulnerabilities. This deployment-risk approval
and infrastructure verification have **not** been supplied.

See the [updated owner decision and approval requirements](hosting-decision-pack.md#owner-decision-mandatory-net-8-competition-target).
Passing builds/tests alone never clears this gate.

#### Owner follow-up verification

New evidence is retained separately in
`C:\Users\amrma\AppData\Local\Temp\opencode\flame-m7-net8-owner-evidence`;
all previous build logs/caches/evidence remain intact.

| Follow-up check | Actual result |
| --- | --- |
| Source and evaluated project targets | **2/2 projects `net8.0` only**, empty evaluated `TargetFrameworks`; EF Core references all **8.0.34**; no project/package/global.json/Dockerfile edits |
| Official .NET 8 metadata recheck | Latest SDK **8.0.428**, runtime **8.0.34**, support phase `eol`, EOL **2026-11-10** |
| Release solution build | **Passed, 0 warnings, 0 errors**, using existing local SDK 8.0.422/runtime 8.0.28; this older local runtime is not approved for deployment |
| Release suite with preserved dedicated QA SQL database | **61 passed, 0 failed, 4 skipped**, 65 total; four TCP timing-harness cases intentionally not enabled in this follow-up. No paid provider calls; prior separate complete 65-test timing run remains historical evidence below |
| Genuine inference record preservation | Independent read confirms the original answer hash and OpenRouter/model/contract still match; no record replacement or fresh inference |
| API cached Docker retry | **Blocked/incomplete**: both pinned MCR manifests returned HTTPS 200 with normal certificate verification; SDK layer `sha256:760fc116676481682ba391e2bab0deff494614e43a8f24197c4f025068ddb698` reached only **26.21/182.55 MB after 516.2 seconds** in the final log. Runtime layer `sha256:b7f13f868967b3114809277e7f3b231178346cd20361e83bc321791419e32a9f` was **27.26/33.15 MB**; other layers were still incomplete. One bounded cached retry was canceled because of sustained insufficient registry throughput, including its verified buildx child; no repeated large download, cache pruning, TLS bypass or image-version change |

**API container gate remains OPEN.** No successful API image was produced, so
non-root runtime identity, container startup, Docker liveness command, image-layer/
configuration secret audit, actual private SQL/Bun connectivity and actual .NET 8
runtime inside the image remain **unverified**, not passed. The Dockerfile's
`USER app`, `--healthcheck` and 8.0.34 runtime pin are source configuration only;
the existing restrictive context and absence of build-time secrets are not a
substitute for inspecting a completed image. A local image-audit helper was
prepared only in the external evidence directory; it was not run against a
nonexistent image and was not added to application source.

Registry manifest reachability is not proof that blob transfers can complete.
Resume from retained cache only when sustained MCR layer access is adequate.
After building, verify the six container gates above with an isolated non-root
smoke run. Do not publish ports or provide real provider credentials merely for a
liveness probe. Production readiness must separately verify API→SQL private TLS
with an approved least-privilege identity and API→Bun private ingress. The local
self-signed/admin SQL configuration can be used only as explicitly labeled
Staging evidence, never by relaxing Production validation. A no-key Bun 503 is
honest provider-unavailable readiness, not a successful inference probe.

Local host tooling is explicitly distinguished from deployment images: latest
available .NET 8 patches must be used wherever possible; there is no claim the
older host SDK/runtime has current patch parity. The Dockerfile remains pinned
to the latest listed .NET 8 SDK/runtime, and its registry/build outcome is recorded
below. No machine security policy, TLS verification or registry trust was weakened.

## A. Production security audit

### Request-surface inventory

Only Next.js is intended to be publicly reachable. “Private” below describes the
required production boundary, **not** a firewall deployed by this milestone.

| Surface | Risks / implemented controls / residual requirements |
| --- | --- |
| Next pages `/`, `/dashboard`, `/dashboard/materials`, `/dashboard/playbook`, `/dashboard/earth-bridge` | Security headers/CSP, no powered-by header; offline content remains educational. CSP permits inline script/style for current Next rendering; this is not a strict nonce-based CSP or proof that arbitrary HTML is safe. |
| Next `/api/backend/environments` | Same-origin allowlisted API proxy; validated configuration; no arbitrary destination or provider credentials. Catalog GET subject to API limits. |
| Next `/api/backend/materials[/{id}]`, `/experiments[/{id}]`, `/technologies[/{id}]`, `/sources/{id}` | Fixed proxy paths, actual SQL IDs, bounded pagination/search and safe missing/invalid records. No public editing routes. |
| Next `/api/backend/knowledge/queries` POST | 32KB boundary, validation, cancellation; stricter expensive-attempt/hour limits downstream, no automatic POST retry, genuine provenance only. Anonymous clients can still spend an allowed budget; edge/account caps required. |
| Next `/api/backend/knowledge/queries/{guid}` GET | Saved-record lookup, bounded API rate; no list-all endpoint or user accounts. GUID is not authorization: users must not submit confidential material; owner must approve retention/privacy policy for anonymous records. |
| Next `/api/backend/habitat-analyses` POST and `/{guid}` GET | Scientific POST gate remains closed; saved lookup remains read-only. No invented approved inputs or scientific validation. |
| Next `/api/v1/simulator/stress-test` | Explicitly local educational calculation, not provider inference or validated Habitat adapter; its existing JSON body limit is 2KB. Needs edge general/body/connection limits like every public route. |
| Next `/api/health/live`, `/api/health/ready` | Public minimal status only; live makes no dependency call, ready returns aggregate 200/503 without SQL/Bun/private address details. Edge must rate-limit these too. |
| API `/api/environments`, `/api/materials[/{id}]`, `/api/experiments[/{id}]`, `/api/sources/{id}`, `/api/technologies[/{id}]` GET | Private API; SQL via EF, input/pagination validation, anonymous rate/concurrency limits and sanitized SQL failures. |
| API `/api/knowledge/queries` POST / `/{guid}` GET | Existing Running→Completed/Failed persistence retained. New expensive limits include invalid attempts and raw-AI route; bounded upstream reads/full-response deadline; no silent deterministic AI success. |
| API `/api/habitat-analyses` POST / `/{guid}` GET | Existing science approval gate retained; no public scientific submission enabled. |
| API `/api/v1/ai/query` POST | Potential credit-spending bypass now shares expensive rate/concurrency limits with Knowledge. Not exposed by Next's proxy allowlist; API must still be private. |
| API `/api/v1/ai/health`, `/api/v1/datasets` GET | Private, rate limited; legacy health proves Bun process only. No key-management proxy controller. |
| API `/api/v1/simulator/stress-test`, `/hazard-evaluation` POST | Existing legacy gate retained; cannot bypass disabled Habitat submission. |
| API `/health/live`, `/health/ready` | New private checks; SQL/Bun aggregate with bounded budget and provider explicitly unknown; no secrets/raw errors. |
| API Swagger/developer/test routes | Swagger only in Development; actual Staging `/swagger/index.html` and `/api/test` returned 404. No wildcard CORS/auth/JWT/cookies/roles added. |
| Bun `/`, `/health`, `/health/live`, `/health/ready` | Private only. Liveness is distinct from configured/cooldown readiness; provider always unknown without real request evidence. No paid health probe. |
| Bun `/api/v1/ai/query` POST | Private credit-bearing path; actual-byte 32KB body limit, five-second body deadline, 32 global/two expensive permits, provider deadlines/token cap/bounded response/redirect rejection. |
| Bun `/api/v1/ai/links`, `/api/v1/datasets` GET | Private lexical/source lookup; not complete NASA PSI ingestion or scientific validation. Bounded general service permits; isolate ingress. |
| Bun `/api/v1/ai/key-status`, `/api/v1/ai/key-reset` | Existing production diagnostic gate retained; no public credential administration. Partial-key diagnostic masking replaced with configured/not-configured only. |
| Bun `/api/v1/simulator/stress-test`, `/hazard-evaluation`, `/physics-engine` | Unvalidated legacy scientific routes remain rejected in Production. `/test` is hidden; `/demo` can only redirect to that closed test route. |

### Hardening implemented

- Per-API-process fixed-window defaults: **120/minute/client**, additionally
  **6 expensive attempts/minute/client** and **100/hour/process**. At most 4096
  client buckets; monotonic windows; bounded state; full state fails closed.
- Preserved **32 global / 2 Knowledge / 2 Habitat**, 32KB actual body bytes,
  cancellation and no waiting queues. Bun independently limits private requests.
- Default forwarded-header processing is disabled. Approved exact immediate Next
  peers can be explicitly trusted with a one-hop limit. Next ignores arbitrary
  XFF and forwards only one validated edge-owned client IP when explicitly enabled.
  Automatic broad forwarding is rejected at API startup.
- Production SQL rejects disabled encryption, untrusted server certificates,
  `sa` and persisted security info. This does not prove arbitrary custom usernames
  have least privilege; real grants/certificates require infrastructure verification.
- Safe ProblemDetails, UUID correlation, no-store/nosniff and structured request/
  terminal logs; no request-body/auth/key/SQL-password logging.
- Upstream response decoding capped at 1MB and whole-operation deadlines retained
  after streaming headers. Provider output defaults to 512 tokens (64–2500 range);
  model/provider unchanged.

### Residual risks

Per-process controls reset at restart and multiply with replicas. They are not a
distributed quota, DDoS defense or money guarantee. Until trusted ingress is
approved, all clients behind Next conservatively share its peer bucket. Configure
edge limits and OpenRouter account spending controls before opening ingress.
POST is intentionally **not idempotent**: repeated submissions create separate
records/charges; never auto-retry uncertain outcomes. Anonymous saved GUIDs are not
access control. No production load/DDoS/privacy/TLS certification is claimed.

## B. Deployment architecture

```text
Browser → approved HTTPS edge → private Next.js
                              → private ASP.NET Core net8.0
                                ├─ private, separately provisioned SQL Server
                                └─ private Vulcan-X → HTTPS OpenRouter
```

Recommend a private container environment for all three services and separately
hosted SQL Server-compatible storage. Do not publish API/Bun/SQL ports. Restrict
Next's origin to the approved edge, API to Next peers, Bun to API peers, SQL to
application/migration/operators, and Bun egress to approved HTTPS/DNS.

The [hosting decision pack](hosting-decision-pack.md) compares VPS, private
container platforms and split managed-frontend hosting, separating official facts
from unapproved plan/network assumptions. No production compose file was invented.

## C. Configuration and secrets

See [environment inventory](production.env.example) and the service ownership,
IP trust, TLS and rotation tables in the [operations runbook](operations-runbook.md).
Provider keys belong **only to Bun**; SQL connection strings **only to API and
approved provisioning jobs**. No shared production env file, secret build argument
or `NEXT_PUBLIC_*` credential is permitted.

`node preflight.mjs frontend|api|ai` checks the corresponding process environment
without displaying its values. Frontend deliberately fails until the actual hard
execution ceiling is supplied. API validates SQL at Production startup. Templates
contain placeholders, not approved infrastructure. Local SQL QA uses Staging
because the existing local server uses a self-signed certificate/admin identity;
that is not production TLS/least-privilege signoff.

## D. SQL production plan

- Existing EF Core 8 migrations/schema remain unchanged. No database/record was
  dropped, recreated or restored over.
- Added explicit published-API `--migrate-database`; seeding remains an explicit
  separate command. Production provisioning requires exact database-name
  confirmation. Normal startup never applies migrations.
- Clean uniquely named local QA database migrated successfully, seeded twice,
  then backed up with COPY_ONLY/CHECKSUM. RESTORE VERIFYONLY passed; restore into
  a distinct new target passed. Both targets have 17 application tables, three
  environments, one material and three research sources. Databases/backup retained.
  Targets: `Flame_M6_M7_279612114d274b8f8e9e3d8705542ae2` and
  `Flame_M6_M7_279612114d274b8f8e9e3d8705542ae2_Restore`;
  backup remains in the existing QA SQL container's data directory.
- Separate application and migrator/backup identities, trusted SQL TLS, private
  ingress, encrypted off-host backups, retention/RPO/RTO, monitoring and sizing
  remain mandatory owner/infrastructure decisions.
- Rollback is previous compatible app images or a reviewed forward schema fix.
  Restore incompatible data/schema into a **new** target and approve a cutover;
  never blindly downgrade EF/delete tables/use WITH REPLACE on an existing target.

The runbook provides commands, restore/rotation/release gates and a proposed
backup approach explicitly subject to approval. `Verify-DisposableDatabase.ps1`
is local Linux-SQL-container QA, not an assumed production backup deployment.

Independent read of preserved query
`17f284ad-4a3e-4462-bd50-bd8b0f64b145` confirms the answer SHA-256 still matches
`10a9de3b04b4bf23b7b5dcd37a0927f22d561cf5f597ecbd549a6467e360ae46`
and retains OpenRouter/actual model/contract provenance.

## E. AI operations and observability

Timeout policy: synthesis ≤ provider overall < API AI deadline; Next proxy ≥ API
+15 seconds; actual host ceiling ≥ Next +5 seconds. Current defaults remain
7s synthesis / 55s provider overall / 40s attempt / 60s API / 75s Next. Cleanup
has an independent bounded five-second token. Account for every edge/drain limit.
If the approved platform cannot fit this, obtain approval for persisted jobs and
polling; no speculative queue was implemented.

Actual provider output/model provenance and failed/cancelled persistence remain
honest. Liveness is not readiness, and configured keys/cooldown are not provider
availability. Readiness never consumes credits; provider status is `unknown`.
The [previous genuine inference report](../integration/openrouter-inference-verification-2026-11-13.md)
remains the historical successful inference evidence; **zero additional paid
requests** were made for Milestone 7.

Request/HttpClient durations and safe Bun `provider_completed`/`provider_failed`
events contain actual per-attempt duration and allowlisted failure category, never
prompt/key/error-body content. API Meter `Flame.FireSafety` includes request counts/duration, rejection
and Knowledge terminal counters. An approved collector/log sink is still needed;
no public metrics port or new monitoring service was added. Configure alerts for
availability, tail latency, 429/5xx, SQL failures, Bun readiness, provider quota/
failures, terminal query failures/Running age, saturation and backup/restore health.

## F. Deployment artifacts

- Three separate multi-stage, non-root production Dockerfiles and restrictive
  adjacent `.dockerignore` files; no embedded credentials or public port mappings.
- Frontend standalone build/start script and security headers.
- Production API JSON logging defaults and explicit provisioning/health CLI.
- Environment inventory, safe nginx edge template and fail-closed preflight.
- Operations/SQL/rotation/release/rollback runbook and authoritative hosting pack.
- Safe disposable SQL migration/seed/backup/restore verification script.

Docker liveness checks deliberately do not restart processes merely because SQL/
provider is unavailable. Orchestrator readiness must be separately configured.
Image digest/SBOM scanning and real platform firewall/TLS verification remain
release gates.

## G. Verification

Evidence directory: `C:\Users\amrma\AppData\Local\Temp\opencode\flame-m7-evidence`.
Browser outputs remain under ignored frontend `test-results`. Counts below are
separate runs; do not sum them as unique tests.

| Check | Actual result / classification |
| --- | --- |
| Frontend unit tests | **131 passed, 0 failed**, 16 files; fixture/unit evidence |
| Frontend lint / TypeScript | Both passed |
| Frontend production build | Passed, Next.js 16.4.6/React 19; production Webpack/standalone output |
| Full production browser suite, repeated with standalone startup | **134 passed, 0 failed, 5 skipped**, 139 total; UI/offline/explicit fixture checks; opt-in SQL/provider cases excluded here |
| Real SQL + production Next/Bun + Release API (Staging) browser run | **3 passed, 0 failed, 2 skipped**: catalogs, real no-credential failure persisted/navigable, Habitat closed. Paid inference and separately stopped-upstream scenarios deliberately not enabled |
| Bun final tests | **31 passed, 0 failed**, 266 assertions, four files; no owner `.env` loaded; isolated provider fixtures, including safe per-attempt telemetry |
| Bun TypeScript / production startup | Passed; no-key production process live 200/ready 503 |
| .NET 8 Release publish | Passed; SDK 8.0.422/runtime 8.0.28 locally; latest-patch container pins separately specified |
| Current .NET suite with real SQL, ordinary successful retry | **61 passed, 0 failed, 4 skipped**, 65 total; includes new header-clear/rate/proxy/SQL/upstream-size regressions and real SQL workflows; timing harness not enabled in this run |
| Complete .NET suite with real SQL and explicit TCP timing harness | **65 passed, 0 failed, 0 skipped**; actual Next→API→SQL cancellation, 11-second response, deadline and concurrency tests, plus all unit/SQL regressions. Harness responses are explicitly fixtures, not paid/provider/scientific evidence |
| .NET tests with actual dedicated SQL connection, Debug | Runner reports **0 passed, 56 failed, 4 skipped, 60 total**; all 56 blocked by assembly load/Application Control `0x800711C7`, not failed behavior assertions |
| Ordinary Release test retry | Build passed, **zero tests discovered/executed** because Application Control blocked test assembly loading. CLI exit 0 is not a passing suite. No policy disabled or bypassed |
| Disposable SQL provisioning/restore | Passed migration, repeat seed, backup checksum/verification and separate-target restore; no existing database overwritten |
| Real health HTTP | Next/API/Bun live 200; no-key Bun/API/Next ready 503. Private API reports SQL available/Bun unavailable/provider unknown; public Next returns only aggregate status |
| Rate/spoof HTTP | Changing arbitrary XFF and edge-IP headers did not evade the shared expensive bucket; invalid catalog attempts reached 429 with Retry-After 60; no provider call |
| Staging diagnostics HTTP | Swagger and `/api/test` returned 404 |
| Provisioning/preflight guards | **Seven isolated preflight assertions passed**, including single-key/legacy-slot secret ownership; uppercase explicit seed command also rejected missing Production target confirmation before any SQL connection |
| Existing genuine SQL result | Independent read/hash/provenance preservation passed |
| npm production dependency audit | **0 vulnerabilities** |
| Full npm dependency audit | **7 moderate, 0 high, 0 critical**, development-only minimatch/typescript-eslint chain; safe audit-fix dry run changes zero packages |
| Bun dependency audit | **0 vulnerabilities**, 27 packages checked |
| NuGet API/tests transitive audit | No known vulnerable packages in current source |
| Bun final Docker image | Build/export succeeded; image `sha256:abd9ca3ca488325b817368de6c758b699f3867103d7510f947903bd162718585`; user `bun`, UID 1000, live 200/ready 503 with network disabled, no `/app/.env`; final smoke container stopped/retained |
| Frontend initial Docker image | Build/export log and image inspection confirm success despite initial PowerShell wrapper exit 1; non-root UID 1000, page/static asset/live 200, ready 503, security headers and absent `/app/.env` verified with network disabled. Final-source rebuild recorded separately below |
| Frontend final-source Docker image | Build passed; image `sha256:16a171961a0fa06fac192b03838034bb7c970b543a7749a31cc477931a7f1d1f`; final smoke UID 1000, page/static/live 200, aggregate ready 503, security headers and no `/app/.env`; network disabled, container stopped/retained |
| API Docker image | **Blocked/incomplete**: approved latest .NET base tags resolved, but MCR base-layer transfers remained incomplete after extended waits; task-owned builds canceled, cache/logs retained. No API image was produced; container runtime/health/non-root verification is not claimed. Host Release publish/runtime/tests passed separately |
| Docker summary | **2 of 3 final service images built and smoke-verified; 1 blocked** by incomplete base-image acquisition. No code/build assertion failure is substituted for this network limitation |
| Final secret/Git boundary check | **78 changed paths, 64 client JS bundles and 39 evidence files** scanned with credential-shape heuristics; zero matches. Owner `.env` remains ignored/untracked, zero staged files, unchanged branch/HEAD; no task QA containers/listeners left running. This heuristic scan is not a complete secret-detection certification |
| TestSprite | Not run: no linked repo project and only local/private targets; no external deployment/tunnel or setup was authorized |

The development audit advisory is
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249):
installed minimatch 10.2.6 under typescript-estree; current parent requires
`^10.2.2`, while advisory fix starts at 11.0.1. No unreviewed cross-major override/
forced tooling replacement was introduced. Keep builds isolated from untrusted
glob workloads and resolve via an approved compatible tooling update before
accepting untrusted build inputs. This does not affect the production npm graph.

The earlier Application Control block cleared on an ordinary retry; current
Milestone 7 tests passed without disabling/bypassing policy. The unsuccessful runs
are retained as diagnostic history, not counted as assertion failures or erased.
Historical Milestone 6 coverage was not substituted for these current tests.
The separate timing-only API used a 12-second upstream deadline/27-second Next
budget and 60/minute expensive-attempt allowance to exercise concurrency rather
than rate rejection. Production defaults were not changed; real default-rate
HTTP tests ran separately on port 3109/5082. Timing fixtures never forwarded to
OpenRouter and do not establish AI inference or scientific accuracy.
The real missing-credential browser run retained Failed query
`9f730f9d-0feb-4a25-95c7-616d85231dc8` with a null answer; this is error-path
evidence, never described as provider inference.

API container follow-up: rerun the documented API `docker build` with working
registry access; verify its configured `app` user, actual UID, liveness command,
secret-free image/configuration and private SQL/Bun readiness before staging
acceptance. The source Dockerfile pins SDK 8.0.428/runtime 8.0.34, but neither a
successful latest-patch container nor a base-image vulnerability scan is inferred
from a successful host publish.

## H. Changed files

Paths below are relative to their stated directory. Existing uncommitted work
listed afterward remains part of the worktree, not newly attributed to Milestone 7.

### Milestone 7 additions/updates

| Directory | Files / explanation |
| --- | --- |
| Repository root | `README.md`: deployment navigation |
| `vulcan-x/Ai Model` | `.env.example`: bounded output/deadline inventory; `Dockerfile`, `.dockerignore`: private non-root packaging |
| `vulcan-x/Ai Model/src` | `config/env.ts`: validated limits/approved production provider URL; `index.ts`: private production boundary/health; `middleware/production.ts`: actual-byte/body-time/concurrency/correlation controls; `services/aiProviderService.ts`: bounded output/read/redirect controls, safe per-attempt telemetry and no key prefixes; `services/ragService.ts`: configured synthesis deadline |
| `vulcan-x/Ai Model/tests` | `production.test.ts`: readiness, dishonest length and malformed-body/correlation regressions |
| `vulcan-x/Backend/NASA-Project-Back-End` | `README.md`: deployment navigation/support warning |
| `…/NASA.FireSafety.API` | `Dockerfile`, `.dockerignore`: SDK 8.0.428/runtime 8.0.34 non-root packaging |
| `…/NASA.FireSafety.API/NASA.FireSafety.API` | `Program.cs`: validated production config, explicit provisioning, health/telemetry/trust; `appsettings.Production.json`: safe logging |
| `…/NASA.FireSafety.API/NASA.FireSafety.API/Middleware` | `ProductionHardening.cs`: bounded rate limits, metrics, safe correlation and SQL/proxy checks; `CorrelationHandler.cs`: outgoing correlation |
| `…/NASA.FireSafety.API/NASA.FireSafety.API/ExternalServices/VulcanXAI` | `VulcanXAiClient.cs`: safe origin, bounded streamed responses/full deadlines/no raw exception logging |
| `…/NASA.FireSafety.API/NASA.FireSafety.API/Services` | `KnowledgeQueryService.cs`: terminal query metrics/logs, preserved provenance behavior |
| `…/NASA.FireSafety.API/NASA.FireSafety.API.Tests` | `ProductionHardeningTests.cs`: rate/trusted proxy/SQL regressions; `VulcanXAiClientTests.cs`: oversized-response regression alongside preserved earlier tests |
| `…/docs/deployment` | This report; `operations-runbook.md`; `hosting-decision-pack.md`; `production.env.example`; `nginx.conf.example`; `preflight.mjs`; `Verify-DisposableDatabase.ps1` |
| `vulcan-x/Frontend` | `.env.example`: trust contract; `Dockerfile`, `.dockerignore`: non-root standalone packaging; `next.config.ts`: standalone/security headers; `package.json`: correct production start |
| `vulcan-x/Frontend/app/api/health` | `live/route.ts`, `ready/route.ts`: safe liveness/aggregate readiness |
| `vulcan-x/Frontend/lib/server` | `fire-safety-api.ts`: validated forwarded IP/correlation/Retry-After/health proxy; `trusted-client-ip.ts`: explicit edge opt-in |
| `vulcan-x/Frontend/scripts` | `start.mjs`: start generated standalone output with static/public assets, no env copying |
| `vulcan-x/Frontend/tests` | `trusted-client-ip.test.ts`, `e2e/production-hardening.spec.ts`: spoofing/CSP/health/offline regressions |

### Preserved earlier uncommitted files

- `vulcan-x/Ai Model/`: `README.md`, `API_DOCUMENTATION.md`,
  `src/controllers/aiController.ts`, `src/controllers/simulatorController.ts`,
  `src/types/index.ts`, `src/services/providerErrors.ts`, `tests/api.test.ts`,
  `tests/cancellation.test.ts`, `tests/integration-audit.test.ts`:
  prior provenance/failure/scientific-boundary audit.
- Backend API: `Controllers/VulcanXSimulatorController.cs`,
  `DTOs/Knowledge/KnowledgeDtos.cs`,
  `ExternalServices/VulcanXAI/Contracts/Responses/AiQueryResponse.cs`:
  prior legacy safety/provenance contracts.
- Backend tests: `LiveProxyCancellationTests.cs`, `PersistenceWorkflowTests.cs`,
  `SqlWorkflowTests.cs`, `LegacySimulatorGateTests.cs`: existing SQL, timing,
  cancellation/provenance and scientific-gate audit coverage.
- Backend docs: `docs/integration/milestone-5-6-report.md`,
  `docs/integration/integration-audit-2026-11-13.md`,
  `docs/integration/openrouter-inference-verification-2026-11-13.md`:
  preserved audit/genuine inference evidence.
- Frontend: `README.md`, `app/dashboard/dashboard.css`,
  `components/SystemArchitecture.tsx`,
  `components/dashboard/DashboardShell.tsx`, `EarthBridgeModule.tsx`,
  `KnowledgeQueryPanel.tsx`, `MaterialsModule.tsx`, `StressTestModule.tsx`,
  `CatalogBrowser.tsx`, `HabitatRecordLookup.tsx`: prior real catalog/provenance/
  read-only Habitat navigation work.
- Frontend libraries/tests: `lib/habitat-analysis.ts`, `lib/knowledge-query.ts`,
  `lib/catalog-browser.ts`, `tests/catalog-browser.test.ts`,
  `tests/habitat-analysis.test.ts`, `tests/e2e/dashboard.spec.ts`,
  `tests/e2e/live-sql.spec.ts`, `tests/e2e/integration-audit.spec.ts`,
  `tests/integration/controlled-vulcan.mjs`: preserved integration/audit coverage.

No migrations, owner credentials or unrelated assets/processes were replaced.
Generated builds, QA databases/backups, local images, stopped smoke containers and
logs are retained as local evidence, not committed deployment infrastructure.
Only task-owned QA listeners on 3109/3110/4000/4011/5082/5083 were stopped after
verification. The unrelated port 3000 process and existing SQL port 14339 remain
running. An optional latest Windows SDK download was canceled once ordinary tests
passed with the existing .NET 8 SDK; no completed latest Windows SDK install is
claimed, and partial download data was not deleted.

## I. External decisions and release blockers

1. Approve provider/region/resources, private topology, exact trusted peers, all
   origin/preview bypass restrictions and end-user-IP contract.
2. Supply domain/DNS ownership, public HTTPS endpoint/certificates/renewal owner.
3. Confirm actual per-hop execution/body/concurrency/drain ceilings and preflight;
   approve persisted jobs/polling only if synchronous timing cannot fit.
4. Approve SQL Server offering/support/storage, least-privilege identities,
   trusted certificates, backups/retention/geography/RPO/RTO and restore ownership.
5. Specify expected traffic/load/replicas, rate thresholds, OpenRouter budget/
   account cap/model permission, secret rotation and anonymous data retention.
6. Choose logging/metrics sink/retention/alerts/on-call and rehearse rollback/load/
   restore on real staging infrastructure.
7. **.NET 8 requirement confirmed; deployment support-risk approval still open:**
   competition requires strict `net8.0`/EF Core 8.x/.NET 8 images. EOL remains
   **2026-11-10**, latest listed runtime **8.0.34**, SDK **8.0.428**. Use latest
   8.x patches where possible, but official support/servicing is not restored.
   Obtain the documented risk/compensating-control approval described above;
   framework migration is not authorized by this milestone.
8. Complete final image scans and actual production TLS/network checks. Current
   .NET/SQL tests passed after an ordinary retry; Application Control was not
   weakened to make tests green. Restore adequate MCR access and finish the API
    image build/non-root/health smoke; this packaging gate remains explicitly open.
9. Independently approve scientific inputs and validate a Habitat adapter before
   enabling submission. Inference success is not scientific correctness.

Authoritative sources and conditional hosting-limit facts are linked in the
decision pack. Web search itself returned HTTP 402; official pages/release metadata
were accessed directly. No fabricated pricing, capacity, SLA or cloud limit is used.

## J. Readiness verdict

**PARTIALLY READY — EXTERNAL INFRASTRUCTURE DECISIONS REQUIRED**

Meaningful local safeguards, production builds, real SQL restore and browser/Bun
verification are in place. Public production is **not approved**: hosting/network/
SQL/budget/support choices and explicitly blocked verification gates remain.
The API container build/smoke is one such open gate; successful host tests are
not a substitute. Existing Markdown hard-break whitespace was preserved rather
than cosmetically rewriting pre-existing changes.
