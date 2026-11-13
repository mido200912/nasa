# Public REST API specification

Revision 2026-11-11. Base path `/api`; camelCase JSON; dates UTC; no EF entities exposed. Lists use `page`/`pageSize` (1..100). All errors are `application/problem+json` with `errorCode` and `correlationId`.

```json
{"type":"https://httpstatuses.com/503","title":"AI service unavailable","status":503,"errorCode":"AI_UNAVAILABLE","correlationId":"guid","analysisId":"guid"}
```

`analysisId` appears only when a `HabitatAnalysis` was persisted before failure, enabling `GET /api/habitat-analyses/{analysisId}`. Internal provider errors/secrets are never returned.

## Catalog / Explorer

| Method / route | response DTO and purpose | statuses / validation |
|---|---|---|
| GET `/environments` | `EnvironmentListItemDto[]`: id, code, name, type, nullable `defaults` including gravity regime/effective g and source ID | 200 |
| GET `/materials?search=&category=&page=` | `PagedResponse<MaterialListItemDto>` | 200; 400 page bounds |
| GET `/materials/{id}` | `MaterialDetailDto`, optional curated `properties` | 200/404 |
| GET `/experiments?search=&discipline=&gravityCondition=&materialId=&page=` | `PagedResponse<ExperimentListItemDto>` | 200/400; catalog is not exhaustive PSI search |
| GET `/experiments/{id}` | `ExperimentDetailDto`: summary parameters (not raw time series), materials, sources | 200/404 |
| GET `/sources/{id}` | `SourceDetailDto`: origin, normalized DOI, URL, curationStatus | 200/404 |
| GET `/technologies?search=&category=&domain=&page=` | `PagedResponse<TechnologyListItemDto>` | 200/400 enum/page |
| GET `/technologies/{id}` | `TechnologyDetailDto`: applications and `relatedExperiments` from MVP `TechnologyExperiment` | 200/404 |

## Habitat

### `POST /habitat-analyses`

`CreateHabitatAnalysisRequest` always requires `environmentId`, `materialId`, and optional `language`; all scientific inputs are nullable:

```json
{
  "environmentId": 1,
  "materialId": 5,
  "oxygenVolumePercent": 30.0,
  "pressureKPa": null,
  "temperatureCelsius": 22.0,
  "gravityRegime": "Microgravity",
  "effectiveGravityG": null,
  "additionalParameters": { "sampleOrientation": "vertical" },
  "language": "en"
}
```

Validation: environment/material must exist and be active; oxygen is 0..100 **volume percent**; pressure >0 if present; temperature >= -273.15 if present; effective g >=0 if present and needs a gravity regime; `additionalParameters` max 20 scalar keys/500 chars. A missing scientific field is valid unless the backend-approved `AiCapabilityProfile` says it is required for this request; then 422 `AI_REQUIRED_INPUT_MISSING`. A valid `SourcedDefault` replaces only an omitted value with a display-approved, source-linked default and is reported as such. No value is silently invented.

Status: 201 completed; 400 malformed/shape; 404 catalog; 422 physical range/profile requirement; 502 invalid AI response; 503 unavailable; 504 timeout. On 502/503/504 after persistence, response is ProblemDetails with `analysisId`; client retrieves its `Failed` record.

```json
{
  "id":"guid","status":"Completed","requestedAt":"2026-11-11T10:00:00.000Z",
  "environment":{"id":1,"code":"ISS","name":"International Space Station"},
  "material":{"id":5,"code":"MAT_A","name":"Example material"},
  "inputs":{
    "oxygenVolumePercent":{"value":30.0,"origin":"UserProvided","measurementBasis":"VolumePercent"},
    "pressureKPa":{"value":null,"origin":"Missing"},
    "gravity":{"regime":"Microgravity","effectiveGravityG":null,"origin":"UserProvided"}
  },
  "result":{"riskLabel":"Indeterminate","analysisBasis":"LlmInterpretationOnly","isMock":false,"isScientificallyValidated":false,"explanation":"AI interpretation; verify cited evidence.","factors":[],"citations":[],"limitations":["No independently approved validated model is registered."]},
  "disclaimer":"AI interpretation, not a scientifically validated safety decision."
}
```

`GET /habitat-analyses/{id}` returns 200 for Completed **and Failed** records, 404 otherwise. Failed response contains `status`, `error { code, message }`, IDs/input snapshot, no fabricated result. `GET /habitat-analyses` is Should.

`AnalysisBasis` returned by API is backend-computed only: `Mock` if `IsMock`; `LlmInterpretationOnly` for every non-mock MVP reply; `ValidatedModel` only when a separately registered, approved backend validation record supports that exact model/version/scope. Thus `isScientificallyValidated` is false in MVP and never trusts an AI-provided label.

## Knowledge

### `POST /knowledge/queries`

`CreateKnowledgeQueryRequest`:

```json
{"question":"How does oxygen concentration affect flame behavior in microgravity?","filters":{"materialId":5,"yearFrom":2010,"yearTo":2026},"maxSources":5,"language":"en"}
```

Question is 3..2000 trimmed chars; `maxSources` 1..10; years 1950..current and ordered; material filter must exist. 201, 400, 404, 502, 503, 504 apply. `GET /knowledge/queries/{id}` is Should.

```json
{"id":"guid","status":"Completed","question":"How does oxygen concentration affect flame behavior in microgravity?","answer":"AI-generated answer.","answerOrigin":"AiGenerated","groundingStatus":"HasMatchedCitations","isMock":false,"citations":[{"matchStatus":"Matched","source":{"id":7,"title":"Curated source","doi":"10.example/doi","url":"https://example.invalid"},"excerpt":"Source excerpt.","relevanceScore":0.82}],"disclaimer":"AI-generated answer; verify cited sources."}
```

`GroundingStatus` is one of `HasMatchedCitations`, `HasOnlyUnmatchedCitations`, `NoCitations`. It is computed after local matching and is independent of `isMock`; it does not certify scientific correctness. Unknown citations remain raw `Unmatched` values.

## System/frontend

`GET /health` (Should) returns API/database status plus `aiMode: Mock|Http`, never credentials. Habitat UI uses environments/materials/analysis; Knowledge UI uses query/source; Technology UI uses technologies and its related experiment summaries. Frontend calls only the API. Request cancellation propagates to AI calls and is logged safely.

## Revision summary

Habitat DTOs now preserve unknown inputs and distinguish origin/default basis; failure ProblemDetails carries `analysisId`; grounding values are corrected; result basis/validation are backend-owned; Technology Details explicitly relies on MVP relationship data.
