# Hosting decision pack — 14 November 2026

No provider, subscription, domain, public URL or paid deployment is selected.
Recommendation: start with **one private container environment for Next.js/API/Bun
plus separately provisioned, private managed SQL Server-compatible hosting**,
unless the owner has personnel for VPS operations. This minimizes cross-provider
networking complexity and keeps the public surface limited to the edge/Next app.
It is a recommendation, not a purchase or production signoff.

| Approach | Fit and known capabilities | Decisions/limits still requiring verification |
| --- | --- | --- |
| VPS/private server + separately hosted SQL Server | Can run all three Linux containers/processes and a reverse proxy on a private network. Only edge 443 public; SQL can be managed or separately operated. OS/storage/backups, certificate renewal, firewall, updates and monitoring are operator responsibilities. No inherent serverless function ceiling from using a VPS; configured proxy/server/process limits still apply. | Provider/VPS SKU/resources, patch/support policy, DDoS/edge controls, private connection to SQL, storage/IOPS/backups, actual request/drain timeouts, traffic/concurrency capacity, secret-manager integration and operator on-call |
| Container hosting with internal ingress/networking | Suitable for separate Node, .NET 8 and Bun images. Use internal-only API/Bun and private SQL connectivity, platform secret injection, central logs and independent readiness/liveness. Azure Container Apps is one documented candidate, not selected. | Region/network mode, internal routing and all bypass URLs, certificate/egress policy, scaling/replica budgets, resource/concurrency settings, revision/drain behavior, persistence/backup integration and platform-specific .NET support |
| Managed frontend + private backend/AI/SQL | Next.js may run on managed Node hosting while API/Bun/SQL remain elsewhere. Frontend secret contains only private API origin, not OpenRouter/SQL secrets. Requires genuinely private connectivity or an approved protected origin—not a publicly exposed unauthenticated API “because it has an obscure URL.” | Private-network connectivity/plan entitlement, edge/header ownership, cross-region latency, runtime/body/execution limits, static/function packaging, replication and credit budgets, central correlation/logging, DNS/TLS ownership and operational split |

## Owner decision: mandatory .NET 8 competition target

The owner explicitly confirmed that the NASA competition **requires .NET 8**.
This is an accepted project constraint: retain `net8.0` in both backend projects,
EF Core on compatible 8.x packages, and .NET 8 SDK/ASP.NET container bases.
Do not add another target, migrate to .NET 10, upgrade EF Core to 10.x, or change
unrelated package versions. The framework requirement is settled; it is not a
claim of Microsoft production support or approval to deploy publicly.

.NET 8 reached its official end-of-support date on **November 10, 2026**, as
recorded by the audit and current official release metadata. Use the latest
available .NET 8 patch wherever possible: currently SDK **8.0.428**, runtime
**8.0.34**, already pinned in the API Dockerfile. A latest patch **does not restore
official Microsoft support after EOL**. Security updates and official servicing
are no longer guaranteed. Remain within .NET 8 if another 8.x patch becomes
available; do not use framework migration as an implicit deployment workaround.

### Mandatory public-deployment support-risk gate — not yet approved

The owner's acceptance of the competition framework constraint is **not** blanket
acceptance of a particular public deployment's security risk. Before public
production, obtain a documented, environment/release-specific risk approval
covering:

- Named accountable owner/security approver, date, review/expiry date, exact
  release/image digests and intended public exposure.
- Acknowledgment of .NET 8 EOL, latest available 8.x patch used (or a documented
  exception), no guarantee of future servicing, and residual/unpatchable risk.
- Evidence that feasible compensating controls are configured **and verified**:
  private API/Bun/SQL ingress; approved HTTPS/TLS and proxy trust; least-privilege
  SQL and managed/rotated secrets; anonymous rate/cost/body/concurrency controls;
  maintained OS/base-image updates and vulnerability/SBOM review; central
  monitoring/alerts; verified backups/restore and immutable-release rollback.
- A named vulnerability-monitoring/incident owner, periodic reassessment, and
  criteria to withhold or suspend public access if a critical risk cannot be
  mitigated within the mandatory .NET 8 constraint.

These controls reduce exposure but **cannot restore vendor support or guarantee
protection against unpatched runtime vulnerabilities**. Some are implemented in
source; real platform/network/SQL/monitoring configuration is still unapproved.
Do not treat successful builds/tests, a latest patch, or the framework decision
as a completed support-risk gate. No deployment-risk approval was supplied here.

### Follow-up evidence and unresolved API image gate

- Both source and evaluated backend/test targets are `net8.0` only; all EF Core
  references remain 8.0.34. No project/package/global.json/Dockerfile was edited.
- Release build passed with zero warnings/errors. Release tests against the
  preserved dedicated SQL database: **61 passed, 0 failed, 4 timing-harness tests
  skipped**. Existing local SDK 8.0.422/runtime 8.0.28 is QA tooling, not the
  approved deployment patch level.
- One cached API image retry used the unchanged SDK 8.0.428/ASP.NET 8.0.34 bases.
  MCR manifests returned verified HTTPS 200, but the 182.55 MB SDK layer reached
  only **26.21 MB after 516.2 seconds** in the retained final log;
  runtime/other layers were also incomplete.
  The task-owned retry was canceled for sustained insufficient registry
  throughput; existing and new logs/cache were retained. No TLS/registry or
  machine-security bypass, repeated large download or framework substitution.
- **API image gate remains open:** no completed image means no verified actual
  runtime/UID/startup/liveness/layer-secret audit or private SQL/Bun connectivity.
  Resume only with adequate registry blob throughput, then smoke-test the actual
  .NET 8 image. Source configuration and host test success do not close this gate.

Details and evidence locations are in the
[Milestone 7 report](milestone-7-production-readiness-report.md).

## Authoritative facts checked today

- [.NET 8 release metadata](https://builds.dotnet.microsoft.com/dotnet/release-metadata/8.0/releases.json):
  latest listed runtime **8.0.34**, SDK **8.0.428**, support phase **eol**, end of
  life **2026-11-10**. Rechecked for the owner decision; the existing Docker pins
  remain the latest listed .NET 8 versions. The mandatory competition target is
  retained, with the separate public-deployment support-risk gate above still
  open. No target, EF package or base-image version was changed.
- [ASP.NET forwarded headers](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-8.0):
  immediate peer trust/forward limit matter; arbitrary XFF is not a safe client
  identity. Our default processes no forwarded headers; configured trust is an
  explicit IP allowlist with one hop.
- [Azure Container Apps ingress](https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview):
  supports external/internal ingress and TLS termination; the documented HTTP
  request timeout is **240 seconds**. Internal apps can still be reachable through
  an environment-level HTTP route if configured there—review those routes too.
  This is not approval of a particular environment/plan or proof of actual limits.
- [Render private networking](https://render.com/docs/private-network):
  services in the same region/workspace can communicate privately; free web
  services cannot receive private-network traffic. Managed Postgres is not a
  substitute for this project's SQL Server. Separate SQL Server hosting would
  need a reviewed connection; no Render execution ceiling/plan is assumed.
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations):
  the retrieved Fluid Compute Node/Bun/Python table lists Hobby 300-second
  default/maximum; Pro/Enterprise 300-second default, 800-second maximum and an
  extended 1800-second beta subject to runtime/config requirements. Edge has a
  different response-start constraint. These are conditional documentation
  facts—not the project's selected plan/actual hard ceiling. Private connectivity,
  current entitlements and deployment runtime must be checked independently.

Web search integration returned HTTP 402; the facts above were read directly
from official documentation/release metadata. No pricing/free-tier sufficiency,
availability, SQL retention policy, purchased resource capacity or deployment URL
is asserted. Documentation and entitlements can change; recheck at selection.

## Owner decision checklist

1. Provider(s), region(s), public domain/DNS owner and HTTPS termination.
2. Exact ingress/private network paths and proxy peer addresses; forbid bypass.
3. Actual hard request and shutdown/drain ceilings on every hop, including Next.
4. Supported SQL Server offering/version, private TLS certificates, identities,
   encrypted backup location/cadence/retention, RPO/RTO and restore ownership.
5. Traffic/load target, maximum replicas, IP thresholds, provider-hour/token/credit
   budget and OpenRouter account limits/model permission.
6. Secret manager/rotation owners, log retention/redaction and alert/on-call owner.
7. Framework decision **confirmed**: competition requires .NET 8. Separate,
   documented public-deployment support-risk/compensating-control approval
   **still required**; no automatic migration or production-support claim.
8. Staging acceptance, rollback rehearsal and public-release authorization.
9. Separate science-team authorization and validated Habitat adapter; keep disabled.
