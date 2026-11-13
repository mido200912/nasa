# Deployment and operations runbook

These are provider-neutral release instructions, not a public deployment. Replace
`APPROVED_*` placeholders only after the owner approves the target. Keep .NET 8 as
requested, but see its end-of-support blocker in the decision pack.

## 1. Network and TLS boundary

| Source | Allowed destination | Policy |
| --- | --- | --- |
| Internet/browser | Approved edge HTTPS 443 → Next.js | Only public application listener; approved Host allowlist; TLS 1.2/1.3; redirect port 80 only for that Host |
| Edge | Next.js private listener | Restrict ingress to edge peers; deny direct public access to Next's origin |
| Next.js | ASP.NET private listener | Only approved Next peers; no public API port |
| ASP.NET | SQL Server private TLS endpoint | Only app/migration/operator sources; no public SQL port; certificate hostname must match |
| ASP.NET | Bun private listener | Only approved API peers; no public Bun port |
| Bun | `https://openrouter.ai:443` | Restricted outbound HTTPS/DNS; never send provider credentials elsewhere |
| Operators/backup jobs | Approved management/backup endpoints | Separate least-privilege identities; no browser access |

`EXPOSE` in a Dockerfile does not publish ports. No production compose/network,
domain, TLS certificate, cloud account, SQL volume or public port mapping is
provided. Configure firewalls/security groups/network policies after approval.

### Real client IP contract

1. The immediate edge must **overwrite**, not append, `X-Flame-Client-IP` with its
   verified socket client IP, overwrite `X-Forwarded-Proto`, and discard incoming XFF.
2. Lock Next's ingress to that edge. If a CDN precedes it, configure the CDN's
   verified immediate peers first; do not blindly enable nginx `real_ip`.
3. Only then set Next `FIRE_SAFETY_TRUST_EDGE_CLIENT_IP=true`.
4. Set backend `TrustedProxyAddresses__0`, `__1`, ... to the exact approved Next peer
   addresses seen by Kestrel (including mapped IPv6 form when required). Do not use
   wildcard networks or `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true`.
5. Test that arbitrary XFF/header spoofing cannot split a client's rate bucket,
   while two genuine client IPs have independent buckets. Test all ingress paths,
   including preview/origin URLs and health endpoints.

Until this contract is established, forwarding is disabled and the API conservatively
limits the Next peer as one shared bucket. That prevents trusting spoofed IPs but is
**not** a verified end-user-IP topology. The supplied nginx template is illustrative
and must be adapted, syntax checked and load tested on the approved edge.

## 2. Configuration and secrets

`production.env.example` is an inventory, **not** a shared env file. Inject only
each service's own values using the chosen secret manager. Do not copy the owner's
local `.env` into a container, build context, release bundle, frontend or report.

| Owner | Configuration | Handling |
| --- | --- | --- |
| Next | `NODE_ENV`, `PORT`, `HOSTNAME` | Production runtime/private bind |
| Next | `FIRE_SAFETY_API_BASE_URL` | Private API origin, no credentials/path/query |
| Next | `FIRE_SAFETY_AI_TIMEOUT_SECONDS`, `FIRE_SAFETY_API_TIMEOUT_SECONDS`, `FIRE_SAFETY_MAX_EXECUTION_SECONDS` | Match backend and real platform ceiling |
| Next | `FIRE_SAFETY_TRUST_EDGE_CLIENT_IP` | Disabled until ingress trust contract above is verified |
| API | `ASPNETCORE_ENVIRONMENT`, `ASPNETCORE_HTTP_PORTS`, `AllowedHosts` | Production; explicit internal Host allowlist and approved bind |
| API | `ConnectionStrings__FireSafetyDb` | Secret; TLS/certificate validation, `Persist Security Info=False`, never `sa` |
| API | `VulcanX__BaseUrl`, `VulcanX__TimeoutSeconds` | Approved private Bun origin; default 60 seconds |
| API | `TrustedProxyAddresses__N` | Exact approved proxy IPs only |
| API | `AnonymousRateLimit__*` | Conservative per-process defaults below; revise only after traffic/budget approval |
| API | `HabitatSubmission__Enabled` | Keep false; approval reference is not scientific validation |
| Provisioning job | `DATABASE_MIGRATION_CONFIRM` | Exact intended database name; never a browser/user parameter |
| Bun | `OPENROUTER_API_KEY_1` ... `_5` | Secret, Bun only; existing aliases supported in `src/config/env.ts`, prefer canonical names |
| Bun | `OPENROUTER_API_KEY` | Existing single-key alias for slot 1 only; avoid configuring conflicting aliases |
| Bun | `OPENROUTER_MODEL`, `OPENROUTER_MODEL_N`, `AI_MODEL` | Existing model precedence; unchanged default `meta-llama/llama-3.3-70b-instruct` |
| Bun | `OPENROUTER_BASE_URL` | Production restricted to approved OpenRouter HTTPS base |
| Bun | `OPENROUTER_MAX_OUTPUT_TOKENS` | Default 512; validated 64–2500 |
| Bun | `KNOWLEDGE_TIMEOUT_MS`, `PROVIDER_TIMEOUT_MS`, `PROVIDER_ATTEMPT_TIMEOUT_MS` | Default 7000 / 55000 / 40000; validated ordering |
| Bun | `KEY_COOLDOWN_MS`, `NODE_ENV`, `PORT`, `VULCANX_BIND_HOST` | Default cooldown 60000; production/private container bind; no public publication |

Existing compatibility key aliases are `AI_KEY_N` and `AI_API_KEY_N`. Never put any
key/SQL secret in `NEXT_PUBLIC_*`, frontend env, build arguments or image labels.
Run `node preflight.mjs frontend|api|ai` with only the corresponding service's
deployment environment. It intentionally fails frontend preflight until an actual
hosting ceiling is supplied. Runtime API separately validates production SQL TLS,
certificate trust and non-SA settings. Validate proxy/host/TLS configuration as a
separate deployment gate, not by setting a pretend ceiling to pass the script.

### Rotation

Create the replacement credential in the provider/SQL secret manager, deploy it to
its owning service, restart/roll that service, and verify readiness and a separately
approved bounded smoke request. Revoke the old credential only after confirmed
cutover. For SQL use distinct credentials with overlapping validity; do not grant
DDL to the app identity. Never deliberately corrupt the owner's live key to test
error handling. Fixture tests cover invalid credentials/quota/rate limits.

## 3. Build, release and rollback

From repository root:

```text
docker build -t APPROVED_REGISTRY/frontend:RELEASE -f vulcan-x/Frontend/Dockerfile vulcan-x/Frontend
docker build -t APPROVED_REGISTRY/api:RELEASE -f vulcan-x/Backend/NASA-Project-Back-End/NASA.FireSafety.API/Dockerfile vulcan-x/Backend/NASA-Project-Back-End/NASA.FireSafety.API
docker build -t APPROVED_REGISTRY/ai:RELEASE -f "vulcan-x/Ai Model/Dockerfile" "vulcan-x/Ai Model"
```

All are multi-stage/non-root with restrictive Docker contexts and no secret build
arguments. Before release, resolve approved tags to immutable digests, scan the
resulting images/SBOMs in the selected registry, archive provenance and lockfiles,
and review base-image support. Local tags are not a registry or deployment.

For non-container builds: frontend `npm ci`, `npm run build`, `npm run start`
(the start script runs standalone output with static assets); API `dotnet publish
-c Release` using .NET 8; Bun `bun install --frozen-lockfile --production`, then
`bun --no-env-file src/index.ts` with server-managed environment. Do not run Bun
from a frontend/repository cwd and expect it to load another service's env file.

Roll out private SQL/provisioning → Bun → API → Next → edge. Check internal
liveness/readiness and anonymous catalog/retrieval before enabling public ingress.
Keep previous immutable releases. Drain requests before terminating: allow at
least the approved proxy deadline plus cleanup overhead. A forced termination may
leave Running records; investigate those records and correlate logs before any
resubmission. Do not automatically resubmit POSTs.

Application rollback: stop public writes/drain, restore the previous tested image
set/config and verify read endpoints. Do not blindly run EF `database update 0`,
drop tables, recreate databases or auto-downgrade schema. For incompatible schema,
use a reviewed forward fix or restore into a **new database**, verify it, and
perform an approved connection-string cutover. Preserve the original for evidence.

## 4. SQL Server plan

- Provision supported SQL Server (or an explicitly reviewed compatible managed
  offering), private networking, storage/IOPS, encryption at rest and trusted TLS.
  Production must validate the server certificate; do not use
  `TrustServerCertificate=True` or disable encryption.
- Use a least-privilege app user with SELECT on catalogs and required
  SELECT/INSERT/UPDATE on Knowledge/analysis tables; no server admin, database
  owner, CREATE DATABASE, ALTER schema or backup rights. Review exact grants
  against the current EF-generated SQL. Catalog editing is not a public feature.
- Use a separate operator/migrator identity limited to approved database DDL,
  migration history and seed inserts. Review the existing migration and a schema
  diff first; take/verify a backup. No automatic startup migration exists.
- Explicit commands on the published API: `dotnet NASA.FireSafety.API.dll
  --migrate-database`, then `--seed-curated-catalog`. In Production each requires
  `DATABASE_MIGRATION_CONFIRM` equal to the connection's database. Do not point
  provisioning at an unapproved target. Repeat seed is additive/idempotent, not
  scientific-data ingestion.
- EF connection resiliency retries transient SQL operations at most three times
  with bounded delays. It does not retry OpenRouter/Knowledge POSTs as new jobs.
  Application-assigned query GUIDs help identify an ambiguous insert/commit;
  they do not make repeated HTTP submissions idempotent. Ambiguous commits
  still require retrieval/reconciliation.
- Candidate policy **for owner approval, not an adopted SLA**: daily full,
  periodic differential and transaction-log backups appropriate to the agreed
  recovery model/RPO; encrypted immutable off-host copies and separate backup
  identity. Owner must choose cadence, retention, geography, RPO and RTO based on
  data sensitivity, jurisdiction, budget and expected use.
- Monitor free space/autogrowth, log growth, backup age/failure, restore duration,
  connection pool pressure, deadlocks, waits, query latency, CPU/memory/IO and
  long-Running Knowledge records. Estimate size from approved question/answer
  retention and expected submissions, not fabricated traffic figures.
- Restore exercise: use a new isolated target with separate data/log paths,
  checksum validation and catalog/FK/migration/record checks. Never `WITH REPLACE`
  against an existing database. Record measured restore time and compare with
  approved objectives before production signoff.

`Verify-DisposableDatabase.ps1` is **local SQL-container QA only**: it accepts a
secure process connection, refuses existing targets, generates a uniquely named
QA database, explicitly migrates/seeds twice, takes a COPY_ONLY/CHECKSUM backup,
verifies it, restores to another new target and checks 17 tables/catalog counts.
Both QA databases/backup are retained. It assumes the existing Linux SQL
container's `/var/opt/mssql/data` path and does not define production backup storage.
It uses Staging for the self-signed local certificate; this is not production TLS
or production least-privilege certification.

## 5. AI and timeout alignment

No further paid inference is needed for Milestone 7. The preserved genuine result
`17f284ad-4a3e-4462-bd50-bd8b0f64b145` and its provider/SQL answer-hash evidence
remain in the preceding verification report.

Policy: synthesis ≤ provider overall < backend AI timeout; proxy ≥ backend +15s;
actual host hard ceiling ≥ proxy +5s. Per-attempt provider timeout ≤ provider
overall. Defaults: synthesis 7s, overall 55s, attempt 40s, backend 60s, terminal
cleanup 5s, Next proxy 75s. Reverse proxy/read/drain timeouts must also fit. Do not
raise one number in isolation. A short host needs a separately approved persisted
job-state/polling design; no unbounded queue was added.

Conservative API defaults: 120 requests/minute/client; expensive Knowledge/raw-AI
attempts additionally 6/minute/client and 100/hour/process. Rejected/invalid
submissions still count as attempts. State is capped at 4096 client buckets and
expires by inactivity/window; full state fails closed. Limits include legacy raw
AI routes. Concurrency remains 32 global / 2 Knowledge / 2 Habitat, try-acquire
only. Bun adds 32/2 private-service permits and 32KB actual-byte/body-time limits.
All limits are **per process**; scaling multiplies budgets. A selected edge must
enforce cross-instance IP limits, and OpenRouter account spending caps/alerts must
bound cost independently. These defaults are not a purchased quota/load SLA.

No silent deterministic Knowledge fallback. Provider responses and backend AI
responses are bounded at 1MB before JSON decoding; final answers remain bounded/
validated and carry actual returned model provenance. HTTP error bodies and
credentials are not logged. Cooling down a key is not proof it is usable later;
provider readiness remains unknown without actual request evidence.

## 6. Health, logs and alerts

| Endpoint | Meaning / exposure |
| --- | --- |
| Next `/api/health/live` | Process liveness, no dependency call |
| Next `/api/health/ready` | Safe aggregate 200/503; no dependency/address details |
| API `/health/live` | Private process liveness |
| API `/health/ready` | Private SQL/Bun readiness, bounded 3-second dependency budget; provider explicitly `unknown` |
| Bun `/health/live` | Private process liveness |
| Bun `/health/ready` | Configuration/cooldown readiness only; provider explicitly `unknown`, no paid call |
| Existing Bun `/health`, backend AI health | Process probes only, not provider/SQL validation |

Docker healthchecks use **liveness** to avoid restart storms on external outages;
the orchestrator/load balancer must separately configure readiness before ingress.
A 200 from a liveness endpoint is never proof of OpenRouter availability.

API JSON logs contain correlation, method, duration/status, safe rejection/error
categories and Knowledge terminal IDs. Next generates correlation UUIDs, API
propagates them to Bun, and response headers retain them. Bun logs structured
request status/duration/correlation and safe provider failures; no bodies, query
text, auth headers, key prefixes or SQL credentials. Production EF SQL command
logging is suppressed. Do not enable sensitive-data/body/header logging.

The API exposes `System.Diagnostics.Metrics` instruments via Meter
`Flame.FireSafety`: `flame.requests`, `flame.request.duration`,
`flame.rejections`, `flame.knowledge.terminal`. Connect an approved
OpenTelemetry/agent collector after platform selection; no public metrics endpoint
or new monitoring service was introduced. Export provider latency/failure events
from Bun request logs and backend HttpClient durations.

Set approved alerts for external/aggregate readiness, p95/p99 latency, sustained
5xx/429, SQL/connection failures, lost Bun readiness, OpenRouter quota/rate errors,
Knowledge failure ratio/Running age, concurrency saturation, provider token/credit
budget and backup freshness/restore failures. Baseline thresholds against measured
traffic and the owner's SLA; never invent an SLA from a local test.

## 7. Release gate

- Approve hosting/network/hostnames/TLS and .NET 8 support risk.
- Complete secret-manager, least-privilege SQL and encrypted backup/restore signoff.
- Supply actual execution ceiling and verify preflight/timeout alignment.
- Verify ingress isolation, spoof-resistant IP mapping and multi-replica budget.
- Build, scan, smoke test non-root images and archive exact digests/results.
- Verify catalogs, saved query retrieval, offline tools and closed Habitat gate.
- Perform paid inference smoke only with explicit budget approval if needed.
- Load test, monitor, verify rollback and rehearse restore before public opening.
