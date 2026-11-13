# Integration contracts and data ingress

## Boundary and operating rules

Public contracts are in `03-api-specification.md`. Internal AI contracts are provisional `contractVersion: "1.1-draft"` and live only behind typed `HttpClient`/`IAiClient`; Node/Python/provider are not exposed to frontend. Base URL/secret come from options + User Secrets/environment variables. Each request carries `requestId` and `X-Correlation-Id`; linked cancellation tokens, explicit operation timeouts, and safe logging apply. No automatic retry for AI POSTs in MVP.

## Backend-owned Habitat requirement and basis rules

Before calling AI, backend resolves each field to `UserProvided`, display-approved `SourcedDefault`, or `Missing`. It evaluates an approved versioned `AiCapabilityProfile` to decide which values are required. If no profile exists, unknowns are sent explicitly; none are invented. The profile is backend configuration/governance, not a value returned by AI.

AI may return a suggested label only; it does not control `AnalysisBasis` or validation. Final backend mapping is exact:

| condition | stored/API `AnalysisBasis` | `IsMock` | `isScientificallyValidated` |
|---|---|---|---|
| `MockAiClient` response | `Mock` | true | false |
| real HTTP response in MVP | `LlmInterpretationOnly` | false | false |
| future response backed by independently registered, approved model/version/scope | `ValidatedModel` | false | true only if registry says validated |

`ValidatedModel` in AI JSON is ignored unless that independent backend registry exists and matches; no such registry is MVP scope.

## Habitat internal contract

`POST {AiBaseUrl}/v1/habitat/analyze`

```json
{
  "contractVersion":"1.1-draft","requestId":"guid","language":"en",
  "environment":{"code":"ISS","type":"OrbitalStation"},
  "material":{"code":"MAT_A","name":"Example material","properties":[]},
  "conditions":{
    "oxygenVolumePercent":{"value":30.0,"origin":"UserProvided","measurementBasis":"VolumePercent"},
    "pressureKPa":{"value":null,"origin":"Missing"},
    "temperatureCelsius":{"value":22.0,"origin":"UserProvided"},
    "gravity":{"regime":"Microgravity","effectiveGravityG":null,"origin":"UserProvided"}
  },
  "additionalParameters":{},
  "referenceExperiments":[{"externalSystem":"PSI","externalId":"approved-id","doi":"optional","title":"Curated title"}]
}
```

The AI must support explicit null/`Missing`, not reinterpret it as zero/default. 200 must echo `requestId` and include `analysis { riskLabel?, explanation, factors[], limitations[], citations[] }`, `model {name,version?}`, warnings. `analysisBasis` may be accepted as an informational suggestion but is not persisted or exposed as authority. Citation shape is `externalSystem`, `externalId`, `doi`, `title`, `url`, `excerpt`; backend normalizes DOI and matches external pair then DOI.

## Knowledge internal contract

`POST {AiBaseUrl}/v1/knowledge/ask`:

```json
{"contractVersion":"1.1-draft","requestId":"guid","language":"en","question":"...","filters":{"materialCode":"MAT_A","yearFrom":2010,"yearTo":2026},"maxSources":5}
```

200 response: `{requestId, answer, citations[], model, warnings[]}`. Backend never creates a `ResearchSource` automatically. It saves raw unmatched citations and computes the three API grounding states after matching.

AI error body: `{"error":{"code":"...","message":"safe text","retryable":false}}`. Map 400/422 or invalid JSON/request-id to 502; 401/403/429/5xx/network to 503; timeout to 504. Do not forward upstream body.

## Synchronous persistence and failure

MVP is synchronous: backend persists `HabitatAnalysis` as `Pending/Running` before the external call. Success atomically writes completed result/citations. If the call is unavailable, times out, or is invalid, it records `Failed`, safe `ErrorCode`/message, completion time and duration. The HTTP ProblemDetails adds persisted `analysisId`; frontend can immediately call `GET /api/habitat-analyses/{analysisId}`. If persistence itself fails, no analysisId is claimed and database error is 503. Future async is justified only by measured P95/proxy limits; it returns 202 and keeps the same retrieval route.

## Mock contract

`MockAiClient` returns the exact internal shapes above, including fields with `Missing` inputs. Backend—not mock text—sets `IsMock=true` and final `AnalysisBasis=Mock`; mock `riskLabel` is `Placeholder`, and explanation explicitly says demo/non-scientific. A configuration-controlled failure scenario tests 503/504 handling. Real and mock both use same citation matching, DTO mapping, disclaimers, and persistence path.

## PSI ingestion and safety

Select 5–15 real combustion investigations, record original URL/identifier/normalized DOI/license/access time, and curate a seed catalog. SQL holds metadata and summarized parameters; raw repeated measurement/time-series data, PDF, imagery and files stay in PSI/approved storage. PSI search/download is verified; a public REST API is not assumed. Validate technical shape, limits and contracts separately from scientific validity; restrict CORS, HTTPS, secrets, and safe logs.

## Revision summary

Internal Habitat conditions now carry nullable values with origin/basis; backend owns required-input policy and analysis basis; Mock and real paths use one contract; persisted synchronous failures are discoverable by `analysisId`.
