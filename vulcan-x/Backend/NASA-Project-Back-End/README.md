# Flame in Freefall backend

ASP.NET Core **net8.0**, EF Core 8, SQL Server. Anonymous API; no login/JWT/roles or extra CORS. Browser calls same-origin Next.js routes, never this origin directly.

For release preparation see the [Milestone 7 report](docs/deployment/milestone-7-production-readiness-report.md),
[operations/SQL runbook](docs/deployment/operations-runbook.md) and
[hosting decision pack](docs/deployment/hosting-decision-pack.md). .NET 8 is retained
as required but reached end of support on 10 November 2026; public release requires
an explicit owner support-risk decision. Local SQL Staging checks are not production TLS signoff.

## Prerequisites and configuration

- Install the .NET **8.0.4xx SDK** and ASP.NET Core 8 runtime. `NASA.FireSafety.API/global.json` permits only .NET 8 SDK patch updates. Use the `.sln` for SDK 8; the older `.slnx` is retained but requires newer solution tooling, not a framework upgrade.
- Provision a **dedicated** SQL Server development database. LocalDB belongs to its Windows user; the original database is not assumed available.
- Store `ConnectionStrings:FireSafetyDb` only in local User Secrets (ID `NASA.FireSafety.Development`) or the `ConnectionStrings__FireSafetyDb` process environment. Do not put credentials in appsettings/source/committed files.
- Configure `VulcanX:BaseUrl` / `VulcanX__BaseUrl` for the private Bun service (local default localhost:4000). `VulcanX:TimeoutSeconds` defaults to 60; Next.js's declared AI timeout must match it and its proxy budget must be at least 15 seconds larger.
- API launch settings contain HTTP 5082 and HTTPS 7137. Use HTTPS/trusted termination in deployment; do not infer deployment execution limits from these development ports.

The Milestone 6 QA database was SQL Server 2022 Developer in the dedicated `flame-m6-sql-neon-tiger` Docker container, loopback port 14339, database `Flame_M6_Dev`. Its random credential is **only** in local User Secrets/container environment. Other containers/databases were not changed. `docker start flame-m6-sql-neon-tiger` resumes this local QA database; do not remove its container if its data is needed. A fresh machine must provision its own database/credential.

## Build and seed

From `NASA.FireSafety.API`, using a .NET 8 `dotnet` executable:

```powershell
$artifacts = Join-Path $env:TEMP 'flame-m6-build'
dotnet restore NASA.FireSafety.API.sln --artifacts-path $artifacts
dotnet build NASA.FireSafety.API.sln --no-restore --artifacts-path $artifacts
dotnet test NASA.FireSafety.API.sln --no-build --artifacts-path $artifacts
```

Default tests explicitly skip external SQL/TCP gates without their environment variables. To apply the existing migration and verify the actual SQL schema and seed, set `FIRE_SAFETY_SQL_TEST_CONNECTION` from your approved local secret (never print it), then run:

```powershell
dotnet test NASA.FireSafety.API.sln --artifacts-path $artifacts --filter FullyQualifiedName~SqlWorkflowTests
# Equivalent migration setup with installed EF Core 8 tooling:
# dotnet ef database update --project NASA.FireSafety.API/NASA.FireSafety.API.csproj
$api = Join-Path $artifacts 'bin/NASA.FireSafety.API/debug/NASA.FireSafety.API.dll'
# Development loads local User Secrets; production should use the process environment.
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet $api --seed-curated-catalog
dotnet $api --seed-curated-catalog
dotnet $api
```

SQL tests reject databases not named `Flame_M6_*`. They use the real SQL Server provider/migration, not SQLite or InMemory. They insert tagged technical query records and never delete/reset a database. Upstream response fixtures are identified as such, not provider/scientific evidence.

## Protections and workflow semantics

- 32 KB actual request body limit (declared and chunked bytes), also enforced by Kestrel. Oversize → 413 safe ProblemDetails.
- Per backend process: 32 concurrent requests, two Habitat AI operations and two Knowledge AI operations. No waiting queue. Saturation → 429 safe ProblemDetails. Raw AI/simulator proxy routes share the corresponding operation permits. Success, error, body rejection and cancellation release permits.
- Public unexpected/database errors are sanitized to 500/503 ProblemDetails. Production Swagger is disabled. `/api/v1/ai/health` checks **only Vulcan-X**, not database readiness. No public key-management routes are mapped.
- Knowledge/Habitat records use existing `Failed` status for cancellation (`REQUEST_CANCELLED`), with completion time. Failure cleanup reloads persisted state after discarding partial tracked results and uses its own **five-second** token. A completed commit is not overwritten by late cancellation. If SQL is unavailable, terminal persistence cannot be guaranteed and no successful cleanup is claimed.
- Cancellation does not make POST idempotent. There is no automatic POST retry or new idempotency contract.
- Habitat persisted submission is disabled by default at the controller **and UI**. GET `/api/habitat-analyses/capabilities` exposes only the existing gate's `enabled` boolean (no approval-document reference), so the frontend can submit once genuine approval enables the backend. Enabling `HabitatSubmission:Enabled` requires a nonempty `ApprovedFixtureReference`, which must identify genuine science-team approval/provenance. No such fixture was supplied; do not enable it from a demo/test configuration. Scientific-validation flags remain false.
- Legacy raw simulator controllers now share this disabled gate; they must not bypass Habitat safety. Bun additionally rejects these unvalidated simulator paths in production. Approval alone is not a validated numerical adapter.
- Knowledge still forwards **only question/environment** to Vulcan-X; material/year/max-sources remain saved context. Language remains accepted but not persisted/forwarded. The UI no longer offers ineffective year/language/source-count controls. Citations match unambiguous approved URLs (scheme/host normalized, fragments ignored, path/query preserved) or legacy exact titles. Unmatched URLs persist in `RawUrl`; duplicates are not guessed. Creation and retrieval return the same linked-source metadata. Matching is not scientific verification.
- Provider failures are persisted, never replaced with local-text success. Provider-reported provenance round-trips in existing `ModelName`, `ModelVersion`, `ContractVersion` columns (`knowledge-inference/1`); historical/metadata-free records return `Unspecified`. No migration was needed.

See the [current integration audit](docs/integration/integration-audit-2026-11-13.md) for fresh execution evidence and remaining external blockers. The [integration plan](docs/integration/frontend-backend-integration-plan.md) and [milestone report](docs/integration/milestone-5-6-report.md) retain historical context.
