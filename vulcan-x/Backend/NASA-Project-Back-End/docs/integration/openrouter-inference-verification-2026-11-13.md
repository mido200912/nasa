# Genuine OpenRouter inference verification — 13 November 2026

## Outcome

**REAL OPENROUTER INFERENCE VERIFIED END-TO-END**

Exactly two genuine completion requests were executed: one direct check through the existing `AiProviderService`, and one Knowledge submission through the actual browser UI. No model, provider, base URL, credential variable, production request builder or timeout was changed. No deterministic response, provider fixture, timing harness or cached application answer was substituted in either live request.

This supplements the [earlier integration audit](integration-audit-2026-11-13.md). Its missing-credential/inference blocker is now resolved **in this local environment**. Scientific validation and production-deployment approval remain separate.

## A. Active configuration

| Item | Verified value |
| --- | --- |
| Worktree | `C:\Users\amrma\.local\share\opencode\worktree\c1bdf7\neon-tiger` |
| Branch / HEAD | `milestone-6-integration` / `d8f0f49baf8c148d682c21283c6d556adaf2a457` |
| Owner-edited secret file | `vulcan-x\Ai Model\.env` in that exact worktree |
| Variable | `OPENROUTER_API_KEY_1` — value and partial value never displayed |
| File/runtime check | Exactly one assignment, non-empty; Bun's loaded value equals the saved file value |
| Configuration mechanism | Existing Bun automatic `.env` loading and `src/config/env.ts` → `process.env`; no second loader/configuration file |
| Available slot | Slot 1 ACTIVE; remaining slots unconfigured |
| Git protection | `git check-ignore -v` resolves to `Ai Model/.gitignore:19`; file neither tracked nor staged |
| Provider/base | OpenRouter / `https://openrouter.ai/api/v1` |
| Configured model | `meta-llama/llama-3.3-70b-instruct` — unchanged |
| Forbidden live flags | No `FIRE_SAFETY_PROVIDER_UNAVAILABLE`, timing fixture or stopped-service flag active in live execution |

The fresh production Bun process was started from `vulcan-x\Ai Model`, not an old process with stale environment. ASP.NET ran on .NET 8 at private loopback 5082; Next.js production ran at 3109; Bun at 4000. Existing port 3000 was not used or stopped.

The provider constructs server-side bearer authentication, sends the configured model and messages, and validates final assistant `message.content` plus actual response `model`. Empty, reasoning-only, truncated and unusable output is rejected. Model identity is not substituted from configuration. Cancellation/deadlines and safe failure categories remain unchanged.

## B. Direct provider execution

The direct Bun script imported and called the actual existing `AiProviderService.generateCompletion` with the owner's configured credential. The educational prompt asked why microgravity fire behavior can differ from Earth and required uncertainty/general-principle distinctions; the system instruction limited the answer to 80 words and prohibited invented citations, measurements and operating procedures.

| Evidence | Actual result |
| --- | --- |
| UTC request time | `2026-11-13T21:40:04.798Z` |
| HTTPS operation | POST `https://openrouter.ai/api/v1/chat/completions` |
| Authentication | Present in real outgoing request; accepted by provider; header value not captured |
| Provider status | 200 |
| Provider generation ID | `gen-1794606005-yyP3tWjyGDqXqSBHJoEU` |
| Actual returned model | `meta-llama/llama-3.3-70b-instruct` |
| Finish reason / final output | `stop` / 298 non-empty characters; passed existing validation |
| Token usage | 76 prompt + 49 completion = 125 total |
| Duration | 2,256 ms observed transport/response; 2,294 ms complete provider call |

The returned answer distinguished general transport/convection principles from uncertain detailed effects requiring scientific validation. This is genuine model output, **not independent validation of its scientific correctness**.

A temporary QA-only transparent fetch observer forwarded the original request unchanged using the real native fetch and returned the original response unchanged. It saved only allowlisted response metadata, usage and answer length/hash. It supplied no mocked response and never saved authentication-header values. It guarded the destination to the intended OpenRouter HTTPS completion endpoint. This observer was not added to production source or configuration.

## C. Full application submission, persistence and retrieval

The existing opt-in Playwright live-provider test used the actual user-facing `/dashboard/playbook` → **Live Knowledge** form, selected ISS and PMMA from real SQL-backed catalog responses, entered the educational question, and clicked **Ask live Knowledge service** once. No `page.route` interception was used in that test.

### Actual chronological trace (UTC)

```text
Browser GET /api/backend/environments → 200
Browser GET /api/backend/materials → 200
  selected SQL catalog environment 1 (ISS), material 1 (PMMA)

Browser POST /api/backend/knowledge/queries
  Next.js forwards to ASP.NET POST /api/knowledge/queries
  ASP.NET inserts KnowledgeQueries:
    id=17f284ad-4a3e-4462-bd50-bd8b0f64b145
    RequestedAt=2026-11-13T21:43:56.555
  Independent SQL observer at 21:43:56.6077290Z:
    Running; answer absent; model/provider/contract NULL

ASP.NET sends POST http://127.0.0.1:4000/api/v1/ai/query
Bun receives the request and invokes existing OpenRouter provider service
  HTTPS POST https://openrouter.ai/api/v1/chat/completions
  started=2026-11-13T21:43:56.734Z
  authentication present; value never captured
  provider status=200, finish_reason=stop
  response id=gen-1794606237-o5oe1DyN0OZyarE6T956
  actual response model=meta-llama/llama-3.3-70b-instruct
  final answer=325 characters; actual provider output validated
  usage=1797 prompt + 66 completion = 1863 total tokens
  provider response observed after 2670ms
Bun → ASP.NET 200; backend HttpClient observed 2788ms to headers
ASP.NET saves Completed, answer, citations and actual model provenance
  CompletedAt=2026-11-13T21:43:59.456
Independent SQL observer at 21:43:59.7496938Z:
  Completed, answer length 325, actual provider/model present

Next.js → browser POST response 201
Browser clicks Retrieve using returned saved ID
Browser GET /api/backend/knowledge/queries/17f284ad-4a3e-4462-bd50-bd8b0f64b145 → 200
  Retrieved result equals POST result; real answer and generation metadata displayed
```

Every browser API request in the live test stayed on the Next.js origin. The browser made no OpenRouter request and received no provider credentials.

### Independent SQL evidence

An independent parameterized `System.Data.SqlClient` query read the existing `Flame_M6_Dev` SQL Server database; this was not inferred from an HTTP response.

| Field/check | Result |
| --- | --- |
| Query ID | `17f284ad-4a3e-4462-bd50-bd8b0f64b145` |
| Status / answer | `Completed` / 325 characters |
| `ModelName` → `generation.model` | `meta-llama/llama-3.3-70b-instruct` |
| `ModelVersion` → `generation.provider` | `openrouter` |
| `ContractVersion` → `generation.mode` | `knowledge-inference/1` → `ProviderInference` |
| SQL answer SHA-256 | `10a9de3b04b4bf23b7b5dcd37a0927f22d561cf5f597ecbd549a6467e360ae46` |
| Matches actual OpenRouter final-answer SHA-256 | **Yes** |
| SQL model matches actual OpenRouter response model | **Yes** |
| SQL answer equals browser POST and GET answer | **Yes** |
| SQL answer equals rendered browser text in this run | **Yes** |
| Mock indicator | `isMock=false`; supplemented by actual transport/model/hash evidence, not used alone as proof |

The generated answer mentioned buoyancy/diffusion, linked the supplied NASA research-context URL and identified modeling evidence gaps. Broad claims in that text are not treated as validated scientific conclusions. Citation matching returned `HasOnlyUnmatchedCitations`: retrieved URLs did not become fabricated catalog matches. The UI visibly retains that qualification and the non-validation disclaimer.

Exactly 49 + 66 = **115 completion tokens** were reported across the two live requests (1,988 total prompt/completion tokens). Regression tests did not send additional provider completion requests.

## D. Regression and failure verification

| Actual command/check | Result | Evidence classification |
| --- | --- | --- |
| Bun `bun --no-env-file test` | **27 passed, 0 failed; 253 assertions, 3 files** | Explicit fixture/in-process checks; real `.env` deliberately not loaded into this test process |
| Bun `bunx tsc --noEmit` | Passed | Static check |
| Frontend `npm test` | **129 passed, 0 failed; 15 files** | Unit/contract tests |
| Frontend `npm run lint` | Passed, including enhanced live test | Static check |
| Frontend `npm run typecheck` | Passed after build/test changes | Static check |
| Frontend `npm run build` | Passed; Next.js 16.4.6 / production Webpack build | Actual build used by browser run |
| .NET 8 `dotnet test NASA.FireSafety.API.sln --artifacts-path <approved-temp>/flame-audit-build --logger 'trx;LogFileName=openrouter-backend.trx' --results-directory <approved-temp>/flame-openrouter-evidence` with real SQL connection | **50 passed, 0 failed, 4 skipped; 54 total**; restore/build succeeded | Real SQL workflows plus isolated upstream fixtures. Four TCP timing-harness tests skipped because no harness was started for this live-provider task |
| Live: `BASE_URL=http://127.0.0.1:3109`, `FIRE_SAFETY_LIVE_SQL=1`, `FIRE_SAFETY_LIVE_PROVIDER=1`; `npx playwright test tests/e2e/live-sql.spec.ts --grep 'real browser provider' --workers=1 --output=test-results/openrouter-live` | **1 passed, 0 failed, 0 skipped** | Genuine provider + real browser, proxy, API and SQL |
| Regression: `BASE_URL=http://127.0.0.1:3109`; `npx playwright test --workers=4 --output=test-results/openrouter-regression` without live-submit flags | **133 passed, 0 failed, 5 skipped; 138 total** | UI/local-service/declared-fixture checks. Five opt-in SQL/live scenarios skipped in this separate run; the provider workflow was already executed once above |
| SQL state observer + independent SQL/hash comparison | Passed; real Running → Completed observed, all answer/model equality checks true | Actual SQL/provider/browser evidence, no fixture |
| `git diff --check` | Passed | Working-tree hygiene |

The Bun suite now separately covers HTTP **401** invalid credentials, **402/403** credit/quota/permission failure, **404** unavailable model, **429** rate limit and **503** provider unavailability. Each uses a deliberately fake transport/key, checks safe 503 with no answer/private details, checks error/rate-limited slot state, and verifies that cooldown prevents immediate extra transport calls. Another isolated test checks safe 504 for generation timeout. Existing tests retain caller-cancellation propagation, no key rotation on cancellation, reasoning-only/missing-model rejection, and production diagnostic/simulator gates.

Backend real-SQL tests verify that upstream timeout/unavailable/invalid-response failures persist as Failed with no answer and remain retrievable; cancellation and late replies cannot save partial success. These fixture tests are **not** presented as genuine inference or as a reason to modify the owner's key. No real credential was invalidated or overwritten.

### Changes made for this task

- `Ai Model/tests/integration-audit.test.ts`: added isolated provider-status/cooldown/timeout regressions, without using the real credential.
- `Frontend/tests/e2e/live-sql.spec.ts`: strengthened live-test rejection of fixture flags, model identity assertions, rendered-answer checks, provenance display assertions and optional secret-free evidence/screenshot capture. Existing assertions remain.
- This report and documentation links: record actual new evidence without replacing historical audit results.
- Temporary QA-only direct/observer/SQL/security scripts and artifacts live under approved temporary storage, not production source.

No production provider implementation, model, endpoint, timeout, database schema, migration, credential file content, or authentication architecture required modification.

## E. Secret safety and Git

The owner's key was never printed, echoed, inserted into a prompt, command argument, committed source, report, screenshot or browser request. Only the intended real OpenRouter authentication requests transmitted it.

An in-memory exact-secret scan checked staged and unstaged diffs, tracked/non-ignored source/config/document files, frontend static build artifacts/local environment files, and temporary evidence/logs. UTF-16 log NULs were normalized for scanning; only boolean/count results were emitted, never matching content or the key. **No exposure was detected.** The scan also confirmed the runtime value equals the saved file, exactly one slot assignment, and ignored/untracked/unstaged secret-file status.

The production key-management/test routes remained hidden; no masked-key diagnostic response was requested or saved. The test runner used `--no-env-file` for fixture tests instead of putting the owner's secret into fixture scenarios. The Next.js/API processes do not need or receive the OpenRouter key.

Existing uncommitted audit work was preserved. No commit, push, reset, clean, database deletion, record deletion, or migration deletion was performed. Existing SQL databases and the genuine completed record remain available. The QA Next.js/API/Bun processes started by this task were stopped after verification; their termination exit codes are intentional cleanup, not test failures. The unrelated port-3000 process and SQL service were left running.

## F. Evidence artifacts and remaining production requirements

Local artifacts are under:

`C:\Users\amrma\AppData\Local\Temp\opencode\flame-openrouter-evidence\`

- `direct-transport.jsonl`, `direct-result.json`: genuine direct transport metadata/final answer.
- `application-transport.jsonl`: real OpenRouter application-call metadata and final-answer hash.
- `browser-result.json`, `browser-result.json.png`: submitted/retrieved response, rendered answer and same-origin network statuses; completed UI screenshot.
- `sql-transitions.json`, `sql-verification.json`: independent SQL state/provenance/hash evidence.
- `openrouter-backend.trx`: current backend results.
- `vulcan-live-final.log`, `api-live.log`, `next-live.log`: QA service logs with no credential values.
- `security-verification.json`: secret-scan/configuration safety results.

Remaining requirements:

1. **Production infrastructure:** configure private backend/Bun/SQL connectivity, authorized deployment secrets and HTTPS termination. Supply the actual hosting hard execution ceiling and validate the synchronous timeout budget; one local successful request is not production availability/load certification.
2. **Provider operations:** maintain a permitted model, valid credentials, credits/quota and outbound OpenRouter access. Only slot 1 is configured. Two successful calls do not guarantee future quota/availability.
3. **Scientific approval:** Habitat submission remains disabled. No approved scientific fixture, validated numerical adapter or scientific-validation claim is supplied by successful LLM inference.
4. **Evidence quality:** bundled lexical research context and local title matching are not complete PSI ingestion, citation entailment or independent scientific validation. Model output still requires qualified review.
5. **Known boundaries:** Knowledge material/year/maxSources are saved context, not applied retrieval filters; language is not applied; POSTs are not idempotent. The existing development-only dependency advisories from the broader audit are not resolved by this provider verification.

The inference/persistence/browser objective is verified; these remaining production/scientific requirements are not represented as completed.
