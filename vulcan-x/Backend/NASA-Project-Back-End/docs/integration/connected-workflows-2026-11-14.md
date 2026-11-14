# Connected workflows — 14 November 2026

## Outcome

The remaining frontend wiring was applied on top of the repository's existing live catalog, provider-provenance and persistence work. The dashboard defaults to the live Habitat workspace. Synthetic combustion output is available only after explicitly choosing **Offline simulation**; it never replaces a failed live result.

This is **not** a claim of scientifically validated simulation or successful current provider inference. The Habitat approval gate remains closed. The configured provider returned an unusable final response in the fresh live verification described below.

## Changes

- Added GET `/api/habitat-analyses/capabilities` and a fixed same-origin Next.js proxy. It returns only the existing gate's `enabled` boolean, never approval-reference details.
- Connected the Habitat form to capabilities, validated explicit input submission, saved-result rendering, safe errors with retained IDs, cancellation and unmount cleanup. Same-tick double submissions are prevented; late cancelled responses cannot replace newer results.
- Kept the server-side scientific gate and Bun's production legacy-simulator block. No approval configuration, scientific fixture, measurement, solver or source was fabricated.
- Separated the default live Habitat workspace from the existing educational chamber, timers, synthetic charts and local teaching endpoint.
- Labelled the shared header values as **Offline scenario preview**, so they cannot be mistaken for the separate live form's scientific inputs.
- Removed ineffective year/language/source-count controls from the Knowledge UI. The existing compatibility API fields remain; material remains explicitly saved context rather than a retrieval filter.
- Fixed Knowledge citation matching for returned URLs and legacy titles. URL fragments are ignored and scheme/host normalized; path/query semantics are preserved. Only a unique approved catalog record can match. Unmatched URLs persist in `RawUrl`, are displayed as unverified text, and are not promoted to verified links. Creation and retrieval include the same linked source metadata.
- Bounded source-reference counts/lengths against persistence limits and loaded approved source records once per query rather than once per citation.
- Increased the default Knowledge cancellation budget from 7s to 45s: a full 40s provider attempt can now complete within the existing 55s provider / 60s API / 75s Next.js budgets. Explicit overrides remain validated. The user's configured model/key and pre-existing `ai-model/.env.example` changes were preserved.
- Added local startup automation, an ignored frontend `.env.local` pointing at loopback API 5082, a useful local `.env.example`, tests and updated setup documentation.

## Local startup

Prerequisites: Node/npm, Bun, .NET 8 SDK, frontend/AI dependencies, built frontend, and an already migrated/seeded SQL Server database. Configure SQL via User Secrets ID `NASA.FireSafety.Development` or `ConnectionStrings__FireSafetyDb`. Keep OpenRouter configuration in `ai-model/.env` or the server environment. Never place secrets in `NEXT_PUBLIC_*`.

```powershell
# From vulcan-x/ai-model
bun install --frozen-lockfile

# From vulcan-x/Frontend
npm ci
npm run build

# From the repository root; use -DotNet <dotnet-8.exe> if needed.
.\vulcan-x\scripts\Start-Local.ps1
```

Default addresses:

- Frontend: `http://127.0.0.1:3012`
- API: `http://127.0.0.1:5082`
- Private Bun: `http://127.0.0.1:4000`

The Windows launcher refuses occupied ports, starts only its own processes, restores the calling environment and prints its process IDs/log directory. Logs and its process manifest are under `%LOCALAPPDATA%\Temp\opencode\nasa-local-*`. It does not install services, create/reset databases, run migrations automatically, change credentials, or stop existing applications. It starts a production frontend/private Bun with the local Development API/User Secrets; this is local QA, not production deployment signoff.

## Executed verification

- Frontend: `npm run build`, `npm run lint`, `npm run typecheck` pass; `npm test`: **134 passed**.
- Backend: .NET **8.0.422**, real dedicated SQL connection loaded from existing User Secrets without printing credentials; **64 passed, 4 opt-in tests skipped**. Real SQL checks include migration/seed integrity and URL-citation create/retrieve equality with foreign keys. Technical test records are labelled fixtures, not inference or science evidence.
- Bun: `bun install --frozen-lockfile`, `bunx tsc --noEmit` pass; `bun test`: **34 passed**.
- Targeted browser regression run: **11 passed**, including the new live/approval/cancellation workflows and existing scroll checks.
- Real browser/API/SQL run: **3 passed** for eight catalog endpoints/relationships, the closed scientific approval gate, and retrieval/display of an actual failed provider record. No route interception or fake IDs were used in these live checks.
- Full browser suite: **139 passed, 6 live opt-in tests skipped, 0 failed** (`BASE_URL=http://127.0.0.1:3012 npx playwright test --workers=2`). Ordinary UI tests use declared contract fixtures and are not represented as live provider/science evidence. The separately attempted live-provider success check remains failed as documented below.
- After the final shared-header clarification, the production frontend was rebuilt and **46 dashboard/Habitat/Knowledge browser regressions passed**, including six responsive widths. Lint/typecheck and final live catalog/readiness/failed-record GET probes also passed.
- TestSprite is not linked to this repository; verification uses the existing Vitest/xUnit/Bun/Playwright suites, not a claimed TestSprite run.

Runtime probes through frontend 3012 returned 200 for environments, paginated materials, Habitat capabilities (`enabled:false`) and frontend readiness. The actual catalog remains deliberately small (three environments, one PMMA material, one experiment and one technology); no extra materials or measured properties were invented.

### Actual provider limitation

The live browser success test was genuinely attempted:

1. Initial call reached the provider but hit the old seven-second Knowledge deadline, returning 504.
2. After correcting the deadline and restarting the session-owned Bun process, a fresh request returned **502 / `VULCANX_INVALID_RESPONSE`**, not a successful answer.
3. Retained query ID `a512386c-e18e-4e28-bce8-ca3bf16be4e9` was fetched through the frontend and rendered in a real browser: `status=Failed`, `answer=null`, no citations, no manufactured inference provenance.

The live-success test's failure is not hidden by changing its assertions or treating the failure-path test as successful inference. The configured provider/model must produce a usable final response before successful current inference can be claimed. No automatic model switch, reasoning-as-answer substitution, fabricated fallback or additional provider retry was introduced.

## Remaining requirements

- Genuine science approval/provenance and a reviewed numerical adapter before enabling scientific Habitat submission. Current production Bun intentionally blocks the legacy formula simulators; an approval string alone is not a validated adapter.
- A usable response from the selected OpenRouter model/provider under the configured token/deadline limits; verify a new successful create/retrieve round trip after resolving provider configuration.
- Grade-specific research data for genuine measured material comparisons, rather than synthetic profiles. Offline reference/teaching content remains intentionally available and labelled.
- Production topology, supported .NET runtime decision, HTTPS, execution ceilings and operational signoff remain separate deployment requirements.
