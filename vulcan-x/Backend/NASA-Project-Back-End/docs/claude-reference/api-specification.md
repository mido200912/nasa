# api-specification.md — مواصفات الـ REST API (الواجهة العامة للـ Frontend)

> **الحالة:** مقترح. الأولوية: `[Must]` / `[Nice]`.
> **تنبيه:** كل القيم الرقمية في الأمثلة **توضيحية فقط** لشرح الشكل، وليست قيماً علمية ولا نتائج محقَّقة.

---

## 1. اتفاقيات عامة

| البند | القرار |
|---|---|
| Base path | `/api` (بدون versioning في الـ MVP؛ يمكن إضافة `/api/v1` لاحقاً) |
| JSON | `camelCase`، الـ enums كنص (`JsonStringEnumConverter`)، التواريخ ISO-8601 UTC |
| الأخطاء | `application/problem+json` (RFC 7807) + حقول إضافية `errorCode`, `correlationId`, `errors` |
| الترقيم | `?page=1&pageSize=20` (الحد الأقصى 100) والرد `PagedResponse<T>` |
| Swagger | `/swagger` في بيئة التطوير والعرض |
| Auth | لا يوجد (MVP). CORS مقيَّد بأصل الـ Frontend |
| رأس التتبع | `X-Correlation-Id` يُولَّد إن غاب ويُعاد في الرد |

**غلاف الترقيم:**
```json
{ "items": [ ], "page": 1, "pageSize": 20, "totalCount": 42 }
```

**رد خطأ موحّد:**
```json
{
  "type": "https://httpstatuses.com/400",
  "title": "Validation failed",
  "status": 400,
  "errorCode": "VALIDATION_ERROR",
  "correlationId": "5c1c9f1a-2b0e-4c9e-9b61-0f3a5d6b0a11",
  "errors": { "oxygenPercent": ["Must be between 0 and 100."] }
}
```

---

## 2. Module 1 — Habitat Environment Stress-Test

### 2.1 `GET /api/environments` `[Must]`

| البند | القيمة |
|---|---|
| الغرض | قائمة البيئات لقائمة الاختيار |
| Request | — |
| Response | `200` → `EnvironmentDto[]` |
| Status | `200` |

```json
[
  {
    "id": 1,
    "code": "ISS",
    "name": "International Space Station",
    "environmentType": "OrbitalStation",
    "description": "…",
    "defaults": {
      "oxygenPercent": null,
      "pressureKPa": null,
      "temperatureCelsius": null,
      "gravityLevelG": null,
      "sourceId": null,
      "note": "Defaults not yet curated"
    }
  }
]
```
> القيم الافتراضية `null` حتى تُملأ من مصدر موثّق (انظر `database-design.md` §4.3). الـ Frontend يعامل `null` كـ "المستخدم يُدخل القيمة".

### 2.2 `GET /api/environments/{id}` `[Nice]`
`200 EnvironmentDto` / `404`.

### 2.3 `GET /api/materials?search=&category=` `[Must]`

| Response | `200` → `MaterialListItemDto[]` |
|---|---|

```json
[ { "id": 5, "code": "MAT_EXAMPLE", "name": "Example material", "category": "Polymer" } ]
```

### 2.4 `GET /api/materials/{id}` `[Nice]`
`200 MaterialDetailDto` (مع `properties[]` و`experimentCount`) / `404`.

### 2.5 `POST /api/habitat-analyses` `[Must]`

**الغرض:** إنشاء تحليل لبيئة ومادة، استدعاء خدمة الـ AI، إرجاع النتيجة (متزامن — انظر `integration-contracts.md` §6).

**Request DTO — `CreateHabitatAnalysisRequest`:**

| الحقل | النوع | مطلوب | قاعدة |
|---|---|---|---|
| `environmentId` | int | نعم | يجب أن يوجد وIsActive |
| `materialId` | int | نعم | يجب أن يوجد وIsActive |
| `oxygenPercent` | decimal? | لا* | 0–100؛ إن غاب تُستخدم قيمة البيئة الافتراضية إن وُجدت |
| `pressureKPa` | decimal? | لا* | > 0 |
| `temperatureCelsius` | decimal? | لا* | ≥ -273.15 |
| `gravityLevelG` | decimal? | لا* | ≥ 0 |
| `additionalParameters` | object? | لا | مفاتيح/قيم رقمية أو نصية (≤ 20 مفتاحاً) — تُتفق مع فريق الـ AI |

\* إن لم تُرسَل القيمة ولا يوجد افتراضي للبيئة → `422` مع `errorCode = MISSING_REQUIRED_PARAMETER`.

```json
{
  "environmentId": 1,
  "materialId": 5,
  "oxygenPercent": 30.0,
  "pressureKPa": 101.3,
  "temperatureCelsius": 22.0,
  "gravityLevelG": 0,
  "additionalParameters": null
}
```

**Response DTO — `HabitatAnalysisResponse`** (`201 Created` + `Location: /api/habitat-analyses/{id}`):

```json
{
  "id": "0b8a6f5e-0a3b-4a56-9a64-7f5f0d3b1c22",
  "status": "Completed",
  "requestedAt": "2026-11-12T09:30:00Z",
  "completedAt": "2026-11-12T09:30:14Z",
  "environment": { "id": 1, "code": "ISS", "name": "International Space Station" },
  "material": { "id": 5, "code": "MAT_EXAMPLE", "name": "Example material" },
  "inputs": {
    "oxygenPercent":      { "value": 30.0,  "origin": "UserProvided" },
    "pressureKPa":        { "value": 101.3, "origin": "UserProvided" },
    "temperatureCelsius": { "value": 22.0,  "origin": "UserProvided" },
    "gravityLevelG":      { "value": 0,     "origin": "UserProvided" }
  },
  "result": {
    "riskLabel": "Moderate",
    "analysisBasis": "LlmInterpretationOnly",
    "isMock": false,
    "isScientificallyValidated": false,
    "explanation": "نص التفسير الذي أنتجه الـ AI …",
    "factors": [
      { "name": "Oxygen concentration", "description": "…", "direction": "IncreasesRisk" }
    ],
    "references": [
      {
        "matchStatus": "Matched",
        "source": {
          "id": 12, "title": "…", "origin": "NasaOriginal",
          "doi": "10.xxxx/placeholder", "url": "https://…"
        },
        "excerpt": "…"
      },
      {
        "matchStatus": "Unmatched",
        "source": null,
        "rawTitle": "…", "rawUrl": "https://…", "excerpt": "…"
      }
    ],
    "limitations": [
      "No validated flammability model is available in this MVP.",
      "Output is an AI-generated interpretation, not an experimental result."
    ],
    "model": { "name": "provider-model-name", "version": "…" }
  },
  "warnings": [ "Inputs are outside the range covered by reference experiments." ],
  "disclaimer": "AI-generated indicative analysis. Not scientifically validated. Do not use for safety decisions."
}
```

**قواعد الـ response:**
- `isScientificallyValidated = (analysisBasis == "ValidatedModel")`. في الـ MVP متوقع دائماً `false`.
- `disclaimer` يضيفه الـ **Backend** (ثابت في الإعدادات)، لا الـ AI، ولا يُحذف.
- الحقل `warnings` يتضمّن ناتج فحص التغطية (Nice).

| Status | الحالة |
|---|---|
| `201` | تم التحليل |
| `400` | JSON غير صالح / نوع خاطئ / فشل Validation أساسي |
| `404` | `environmentId` أو `materialId` غير موجود |
| `422` | معامل ناقص ولا افتراضي له؛ أو تجاوز حد فيزيائي |
| `502` | رد الـ AI غير صالح (`AI_INVALID_RESPONSE`) |
| `503` | الـ AI غير متاح (`AI_UNAVAILABLE`) أو الـ Backend غير مهيأ له |
| `504` | انتهاء المهلة (`AI_TIMEOUT`) |

في حالات `502/503/504`: يُحفظ السجل بحالة `Failed`، ويتضمن رد الخطأ `analysisId` لتتبعه.

### 2.6 `GET /api/habitat-analyses/{id}` `[Must]`
`200 HabitatAnalysisResponse` / `404`. إن كانت الحالة `Failed` يرجع `200` مع `status = "Failed"` و`error: { code, message }` بدل `result`.

### 2.7 `GET /api/habitat-analyses?page=&pageSize=&environmentId=&materialId=` `[Nice]`
`200 PagedResponse<HabitatAnalysisSummaryDto>` (id, الحالة، البيئة، المادة، riskLabel، requestedAt).

---

## 3. Module 2 — SI Knowledge & RAG Assistant

### 3.1 `POST /api/knowledge/queries` `[Must]`

**الغرض:** إرسال سؤال لغة طبيعية. (REST: إنشاء مورد "query"، ويعيد الجواب مباشرة في الـ MVP.)

**Request — `CreateKnowledgeQueryRequest`:**

| الحقل | النوع | مطلوب | قاعدة |
|---|---|---|---|
| `question` | string | نعم | 3–2000 حرفاً بعد trim |
| `filters.discipline` | string? | لا | |
| `filters.materialId` | int? | لا | يجب أن يوجد |
| `filters.yearFrom` / `yearTo` | int? | لا | 1950–السنة الحالية، `yearFrom ≤ yearTo` |
| `maxSources` | int? | لا | 1–10 (افتراضي 5) |

```json
{
  "question": "How does oxygen concentration affect flame behavior in microgravity?",
  "filters": { "discipline": "CombustionScience" },
  "maxSources": 5
}
```

**Response — `KnowledgeQueryResponse`** (`201 Created`):

```json
{
  "id": "a3d4a9f2-6d0f-4cf8-8f5a-5f1b9d7f2b10",
  "status": "Completed",
  "question": "How does oxygen concentration affect flame behavior in microgravity?",
  "answer": "إجابة الـ AI المبنية على المصادر المسترجعة …",
  "answerOrigin": "AiGenerated",
  "groundingStatus": "HasCitations",
  "isMock": false,
  "citations": [
    {
      "matchStatus": "Matched",
      "source": {
        "id": 3,
        "title": "…",
        "origin": "NasaOriginal",
        "externalSystem": "PSI",
        "externalId": "…",
        "doi": "10.xxxx/placeholder",
        "url": "https://…"
      },
      "excerpt": "…",
      "relevanceScore": 0.82
    }
  ],
  "model": { "name": "provider-model-name", "version": "…" },
  "requestedAt": "2026-11-12T09:40:00Z",
  "durationMs": 6120,
  "disclaimer": "AI-generated answer based on retrieved documents. Verify against the cited sources."
}
```

| Status | الحالة |
|---|---|
| `201` | نجاح (حتى لو `groundingStatus = NoCitations`، مع إظهار تحذير) |
| `400` | سؤال فارغ/طويل/فلتر غير صالح |
| `404` | `filters.materialId` غير موجود |
| `502/503/504` | كما في §2.5 |

### 3.2 `GET /api/knowledge/queries/{id}` `[Nice]`
`200 KnowledgeQueryResponse` / `404`.

### 3.3 `GET /api/experiments` `[Must]`

الغرض: تصفح الـ catalog (يغذّي واجهة استكشاف التجارب).

| Query param | وصف |
|---|---|
| `search` | بحث `LIKE` في `Title`/`Summary` |
| `discipline` | |
| `gravityCondition` | |
| `materialId` | |
| `page`, `pageSize` | |

```json
{
  "items": [
    {
      "id": 7,
      "title": "…",
      "discipline": "CombustionScience",
      "platform": "ISS",
      "gravityCondition": "Microgravity",
      "summary": "…",
      "primarySource": { "id": 3, "title": "…", "doi": "…", "url": "https://…" },
      "materials": [ { "id": 5, "name": "…" } ]
    }
  ],
  "page": 1, "pageSize": 20, "totalCount": 12
}
```
`200`، `400` (معاملات الترقيم).

### 3.4 `GET /api/experiments/{id}` `[Must]`

```json
{
  "id": 7,
  "title": "…",
  "externalSystem": "PSI",
  "externalId": "…",
  "discipline": "CombustionScience",
  "platform": "ISS",
  "gravityCondition": "Microgravity",
  "summary": "…",
  "keyFindings": "…",
  "curationStatus": "Verified",
  "contentOrigin": "TeamCuratedFromSource",
  "parameters": [
    { "key": "OxygenConcentration", "displayName": "…", "category": "Condition",
      "valueNumeric": null, "valueMin": null, "valueMax": null, "valueText": "…", "unit": "%" }
  ],
  "materials": [ { "id": 5, "name": "…", "role": null } ],
  "sources": [ { "role": "Primary", "source": { "id": 3, "title": "…", "origin": "NasaOriginal", "doi": "…", "url": "https://…" } } ],
  "technologies": [ { "id": 2, "name": "…" } ]
}
```
`200` / `404`.

### 3.5 `GET /api/sources/{id}` `[Must]`
يُستخدم عند نقر المستخدم على citation.

```json
{
  "id": 3, "title": "…", "sourceType": "PsiDataset", "origin": "NasaOriginal",
  "externalSystem": "PSI", "externalId": "…", "doi": "…", "url": "https://…",
  "authors": "…", "publishedYear": 2020, "citation": "…",
  "verifiedByTeam": true, "license": null, "assets": []
}
```
`200` / `404`.

### 3.6 `GET /api/sources?search=&origin=&page=` `[Nice]`

---

## 4. Module 3 — Earth-Space Dual-Use Bridge

### 4.1 `GET /api/technologies?category=&domain=&search=` `[Must]`

`domain` = `Space` أو `Earth`: يرجع التقنيات التي لها تطبيق في ذلك المجال.

```json
[
  {
    "id": 2,
    "slug": "water-mist-suppression",
    "name": "Water mist fire suppression",
    "category": "FireSuppression",
    "summary": "…",
    "applicationDomains": [ "Space", "Earth" ]
  }
]
```
`200` / `400` (قيمة enum غير صالحة).

### 4.2 `GET /api/technologies/{id}` `[Must]`

```json
{
  "id": 2,
  "slug": "water-mist-suppression",
  "name": "…",
  "category": "FireSuppression",
  "summary": "…",
  "description": "…",
  "spaceOriginSummary": "…",
  "applications": [
    {
      "domain": "Space",
      "title": "…", "description": "…",
      "evidenceLevel": "DocumentedInSource",
      "source": { "id": 9, "title": "…", "doi": "…", "url": "https://…" }
    },
    {
      "domain": "Earth",
      "title": "…", "description": "…",
      "evidenceLevel": "TeamProposed",
      "source": null
    }
  ],
  "relatedExperiments": [ { "id": 7, "title": "…" } ],
  "sources": [ { "id": 9, "title": "…", "url": "https://…" } ]
}
```
`200` / `404`.
**قاعدة عرض:** `evidenceLevel = TeamProposed` يعرضها الـ Frontend بشارة "اقتراح الفريق".

---

## 5. System

| Method | Route | الغرض | Status |
|---|---|---|---|
| GET | `/api/health` `[Must]` | حالة الـ API وقاعدة البيانات: `{ "status": "Healthy", "database": "Up", "aiMode": "Mock" }` | `200` / `503` |
| GET | `/api/health/ai` `[Nice]` | يتحقق من خدمة الـ AI: `{ "reachable": true, "mode": "Http", "latencyMs": 120 }` | `200` (حتى لو غير متاح، مع `reachable:false`) |

`aiMode` يخبر الـ Frontend إن كان النظام يعمل بالـ Mock ليعرض شارة واضحة.

---

## 6. ملخص كل endpoints

| # | Method | Route | أولوية |
|---|---|---|---|
| 1 | GET | `/api/environments` | Must |
| 2 | GET | `/api/environments/{id}` | Nice |
| 3 | GET | `/api/materials` | Must |
| 4 | GET | `/api/materials/{id}` | Nice |
| 5 | POST | `/api/habitat-analyses` | Must |
| 6 | GET | `/api/habitat-analyses/{id}` | Must |
| 7 | GET | `/api/habitat-analyses` | Nice |
| 8 | POST | `/api/knowledge/queries` | Must |
| 9 | GET | `/api/knowledge/queries/{id}` | Nice |
| 10 | GET | `/api/experiments` | Must |
| 11 | GET | `/api/experiments/{id}` | Must |
| 12 | GET | `/api/sources/{id}` | Must |
| 13 | GET | `/api/sources` | Nice |
| 14 | GET | `/api/technologies` | Must |
| 15 | GET | `/api/technologies/{id}` | Must |
| 16 | GET | `/api/health` | Must |
| 17 | GET | `/api/health/ai` | Nice |

**Must = 12 endpoints**، معظمها GET بسيطة. الجزء الصعب الوحيد: #5 و#8.

**خارج النطاق عمداً (Future):** CRUD لإدارة الـ catalog (الـ seed JSON يكفي)، حذف سجلات، مصادقة.

---

## 7. DTOs — قائمة الأسماء المقترحة

```
DTOs/Common:      PagedResponse<T>, SourceSummaryDto, ModelInfoDto
DTOs/Catalog:     EnvironmentDto, EnvironmentDefaultsDto, MaterialListItemDto, MaterialDetailDto,
                  ExperimentListItemDto, ExperimentDetailDto, ExperimentParameterDto, SourceDetailDto
DTOs/Habitat:     CreateHabitatAnalysisRequest, HabitatAnalysisResponse, HabitatInputsDto,
                  AnalysisResultDto, AnalysisFactorDto, ReferenceDto, HabitatAnalysisSummaryDto
DTOs/Knowledge:   CreateKnowledgeQueryRequest, KnowledgeFiltersDto, KnowledgeQueryResponse, CitationDto
DTOs/Technologies: TechnologyListItemDto, TechnologyDetailDto, TechnologyApplicationDto
```
الـ DTOs **records** (`public record X(...)` أو `init` properties) والـ Mapping extension methods.
