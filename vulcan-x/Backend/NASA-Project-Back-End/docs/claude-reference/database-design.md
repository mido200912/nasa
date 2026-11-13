# database-design.md — تصميم قاعدة البيانات (SQL Server + EF Core 8 Code-First)

> كل أسماء الكيانات والأعمدة والجداول بالإنجليزية كما سيُكتب في الكود. الشرح بالعربية.

---

## 1. نظرة عامة ومراجعة نقدية للكيانات المقترحة

| الكيان المقترح | القرار | السبب |
|---|---|---|
| `SpaceEnvironment` | **يبقى** | أضفت قيماً افتراضية اختيارية مرتبطة بمصدر. |
| `Material` | **يبقى** + `MaterialProperty` (Nice) | خصائص المواد تختلف ولا تُوضع كلها أعمدة. |
| `Experiment` | **يبقى** + `ExperimentParameter` | تجارب PSI لا تتشارك معاملات ثابتة. |
| `Simulation` | **يُعاد تسميته `HabitatAnalysis`** | لا نملك نموذج محاكاة مُتحقَّقاً. الاسم الصادق يمنع الإيحاء العلمي الزائد. |
| `SimulationResult` | **`HabitatAnalysisResult`** + `AnalysisFactor` + `AnalysisReference` | نفصل العوامل والمراجع في جداول فرعية؛ ونضيف `AnalysisBasis`. |
| `Technology` | **يبقى** | |
| `TechnologyApplication` | **يبقى** + `Domain` (Space/Earth) + `EvidenceLevel` | يميّز التطبيق الموثّق في مصدر عن المقترح من الفريق. |
| `ResearchSource` | **يبقى ويصبح مركز الـ provenance** | كل مرجع في النظام يمر منه. |
| — | **إضافة** `SourceAsset` (Nice) | مؤشر لملفات خارجية بدل تخزينها. |
| — | **إضافة** `KnowledgeQuery` + `KnowledgeCitation` | سجل أسئلة Module 2 وإجاباتها ومراجعها. |
| — | **إضافة** جداول ربط: `ExperimentMaterial`, `ExperimentSource`, `TechnologyExperiment`, `TechnologySource` | علاقات many-to-many. |

**الإجمالي:** 20 جدولاً. جزء منها صغير جداً (ربط). المجموعة **Must** لليوم 1 مذكورة في §8.

---

## 2. الاتفاقيات العامة (Conventions)

| الموضوع | القرار |
|---|---|
| المفاتيح | `int IDENTITY` للـ catalog (بيئات، مواد، تجارب، مصادر، تقنيات). `uniqueidentifier` (Guid) لـ `HabitatAnalysis` و`KnowledgeQuery` لأنها تُعرض في روابط ولا نريدها قابلة للتخمين. |
| الـ Enums | تُخزَّن **كنص** (`nvarchar`) عبر `HasConversion<string>()` + قيد `CHECK` حيث يلزم. أسهل في القراءة والـ debugging وأكثر ثباتاً من الأرقام عند تعديل الـ enum. |
| الأرقام العلمية | `decimal(p,s)` مع الوحدة مدمجة في اسم العمود (`PressureKPa`) أو في عمود `Unit`. لا `float` للقيم المعروضة. |
| الوقت | `datetime2(0/3)` بتوقيت **UTC** دائماً. أعمدة `CreatedAt` افتراضياً `SYSUTCDATETIME()`. |
| النصوص | `nvarchar(n)` بأطوال محددة؛ `nvarchar(max)` فقط للنصوص الطويلة (ملخصات، JSON). |
| الحذف | `Restrict` للعلاقات من سجل التحليلات إلى الـ catalog؛ `Cascade` للجداول الفرعية الملكية (parameters, factors...). لا soft delete في الـ MVP. |
| JSON | أعمدة `nvarchar(max)` لـ raw responses والمعاملات الإضافية؛ مع `CHECK (ISJSON(col)=1)`. لا نستعلم داخلها في الـ MVP. |
| Naming | أسماء الجداول جمع PascalCase (`SpaceEnvironments`) افتراضي EF. |

---

## 3. مخطط العلاقات (ERD)

```mermaid
erDiagram
    SpaceEnvironment ||--o{ HabitatAnalysis : "analyzed in"
    Material ||--o{ HabitatAnalysis : "analyzed for"
    HabitatAnalysis ||--o| HabitatAnalysisResult : "has"
    HabitatAnalysisResult ||--o{ AnalysisFactor : "has"
    HabitatAnalysisResult ||--o{ AnalysisReference : "cites"
    ResearchSource |o--o{ AnalysisReference : "matched to"

    ResearchSource |o--o{ SpaceEnvironment : "defaults sourced from"
    Material ||--o{ MaterialProperty : "has"
    ResearchSource |o--o{ MaterialProperty : "sourced from"

    ResearchSource ||--o{ SourceAsset : "has files"

    Experiment ||--o{ ExperimentParameter : "has"
    Experiment ||--o{ ExperimentMaterial : ""
    Material ||--o{ ExperimentMaterial : ""
    Experiment ||--o{ ExperimentSource : ""
    ResearchSource ||--o{ ExperimentSource : ""

    Technology ||--o{ TechnologyApplication : "has"
    ResearchSource |o--o{ TechnologyApplication : "documented by"
    Technology ||--o{ TechnologyExperiment : ""
    Experiment ||--o{ TechnologyExperiment : ""
    Technology ||--o{ TechnologySource : ""
    ResearchSource ||--o{ TechnologySource : ""

    KnowledgeQuery ||--o{ KnowledgeCitation : "cites"
    ResearchSource |o--o{ KnowledgeCitation : "matched to"

    SpaceEnvironment {
        int Id PK
        string Code UK
        string Name
    }
    Material {
        int Id PK
        string Code UK
        string Name
    }
    HabitatAnalysis {
        guid Id PK
        int SpaceEnvironmentId FK
        int MaterialId FK
        string Status
    }
    HabitatAnalysisResult {
        int Id PK
        guid HabitatAnalysisId FK_UK
        string AnalysisBasis
    }
    ResearchSource {
        int Id PK
        string Origin
        string Doi
    }
    Experiment {
        int Id PK
        string ExternalId
    }
    Technology {
        int Id PK
        string Slug UK
    }
    KnowledgeQuery {
        guid Id PK
        string Status
    }
```

---

## 4. تفاصيل الكيانات

> **الرموز:** PK = مفتاح أساسي، FK = مفتاح أجنبي، UK = فريد، `NN` = إلزامي، `NULL` = اختياري.
> أنواع SQL المكتوبة هي ما ستُولَّده الـ migration عبر `HasMaxLength` / `HasPrecision`.

### 4.1 ResearchSource — مركز الـ Provenance

**الغرض:** تمثيل أي مرجع علمي: dataset من PSI، تقرير NTRS، مقالة. كل جدول يحتاج مرجعاً يشير إلى هذا الجدول.

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `int IDENTITY` | NN | **PK** |
| `Title` | `nvarchar(500)` | NN | |
| `SourceType` | `nvarchar(30)` | NN | `PsiDataset`, `NasaPublication`, `JournalArticle`, `TechnicalReport`, `Other` |
| `Origin` | `nvarchar(30)` | NN | **`NasaOriginal`**, `ThirdParty`, `TeamCurated` — هذا هو الفرق بين بحث NASA الأصلي وغيره |
| `ExternalSystem` | `nvarchar(50)` | NULL | مثال: `PSI`, `NTRS` |
| `ExternalId` | `nvarchar(200)` | NULL | معرّف المصدر في نظامه |
| `Doi` | `nvarchar(200)` | NULL | |
| `Url` | `nvarchar(2000)` | NULL | الرابط الأصلي |
| `Authors` | `nvarchar(1000)` | NULL | |
| `PublishedYear` | `smallint` | NULL | |
| `Abstract` | `nvarchar(max)` | NULL | نص من المصدر نفسه (للعرض والـ RAG المرجعي) |
| `Citation` | `nvarchar(1000)` | NULL | صيغة الاقتباس الجاهزة |
| `License` | `nvarchar(200)` | NULL | شروط إعادة الاستخدام (تُملأ بعد التحقق) |
| `AccessedAt` | `date` | NULL | متى راجعها الفريق |
| `VerifiedByTeam` | `bit` | NN (0) | هل تأكد الفريق من صحة الرابط/المعلومات |
| `CreatedAt` | `datetime2(0)` | NN | |

**الفهارس/القيود:**
- UK مُرشَّح: `UX_ResearchSources_ExternalSystem_ExternalId` على `(ExternalSystem, ExternalId)` **`WHERE ExternalSystem IS NOT NULL AND ExternalId IS NOT NULL`**.
- فهرس على `Doi`.
- لا فهرس على `Url` (يتجاوز حد 900 بايت للمفاتيح).
- `CHECK` على `SourceType` و`Origin` ضمن القيم المسموحة.

**ملاحظة:** مصدر الـ AI نفسه **ليس** `ResearchSource`. نص الـ AI يعيش في `HabitatAnalysisResult` و`KnowledgeQuery.Answer` ويُوسم كـ AI-generated.

---

### 4.2 SourceAsset (Nice-to-have)

**الغرض:** مؤشر لملف خارجي (PDF، ملف بيانات) مرتبط بمصدر. لا نخزّن الملف في SQL.

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `int IDENTITY` | NN | **PK** |
| `ResearchSourceId` | `int` | NN | **FK** → ResearchSources (Cascade) |
| `FileName` | `nvarchar(260)` | NN | |
| `Uri` | `nvarchar(2000)` | NN | رابط أو مسار |
| `StorageKind` | `nvarchar(30)` | NN | `RemotePsi`, `TeamStorage`, `LocalFile` |
| `MediaType` | `nvarchar(100)` | NULL | |
| `SizeBytes` | `bigint` | NULL | |
| `Sha256` | `char(64)` | NULL | لإثبات سلامة الملف |
| `Description` | `nvarchar(500)` | NULL | |

فهرس: `IX_SourceAssets_ResearchSourceId`.

---

### 4.3 SpaceEnvironment

**الغرض:** بيئات Module 1 (ISS، Lunar Base، Mars Habitat).

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `int IDENTITY` | NN | **PK** |
| `Code` | `nvarchar(30)` | NN | **UK**: `ISS`, `LUNAR_BASE`, `MARS_HABITAT` |
| `Name` | `nvarchar(100)` | NN | |
| `EnvironmentType` | `nvarchar(30)` | NN | `OrbitalStation`, `LunarSurface`, `MarsSurface` |
| `Description` | `nvarchar(1000)` | NULL | |
| `DefaultOxygenPercent` | `decimal(5,2)` | NULL | |
| `DefaultPressureKPa` | `decimal(9,3)` | NULL | |
| `DefaultTemperatureCelsius` | `decimal(6,2)` | NULL | |
| `GravityLevelG` | `decimal(6,4)` | NULL | بوحدة g (مثلاً 0 للميكروجاذبية) |
| `DefaultsSourceId` | `int` | NULL | **FK** → ResearchSources (`SetNull`) |
| `DefaultsNote` | `nvarchar(500)` | NULL | |
| `IsActive` | `bit` | NN (1) | |
| `CreatedAt` | `datetime2(0)` | NN | |

**قرار مهم:** القيم الافتراضية **اختيارية (NULL)** وكل قيمة تُملأ **فقط عند وجود مصدر** (`DefaultsSourceId`). لن أضع لك أرقاماً من عندي: قيم ISS قد تكون معروفة، لكن قيم Lunar/Mars habitats تعتمد على تصميم مفترض. إن لم يوجد مصدر يترك الحقل NULL ويُطلب من المستخدم إدخال القيمة.

القيود: `CHECK` للقيم الفيزيائية الحدّية (انظر §6).

---

### 4.4 Material

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `int IDENTITY` | NN | **PK** |
| `Code` | `nvarchar(50)` | NN | **UK** |
| `Name` | `nvarchar(150)` | NN | |
| `Category` | `nvarchar(50)` | NULL | نص حر في الـ MVP (مثل Polymer / Textile / Metal) |
| `Description` | `nvarchar(1000)` | NULL | |
| `IsActive` | `bit` | NN (1) | |
| `CreatedAt` | `datetime2(0)` | NN | |

فهرس: `IX_Materials_Category`.

### 4.5 MaterialProperty (Nice-to-have)

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `int IDENTITY` | NN | **PK** |
| `MaterialId` | `int` | NN | **FK** → Materials (Cascade) |
| `Name` | `nvarchar(100)` | NN | اسم الخاصية |
| `ValueNumeric` | `decimal(18,6)` | NULL | |
| `ValueText` | `nvarchar(200)` | NULL | |
| `Unit` | `nvarchar(30)` | NULL | |
| `ResearchSourceId` | `int` | NULL | **FK** (`SetNull`) — من أين جاءت القيمة |

قيد: `CHECK (ValueNumeric IS NOT NULL OR ValueText IS NOT NULL)`. فهرس: `(MaterialId)`.
لا UK على `(MaterialId, Name)` لأن مصدرين مختلفين قد يعطيان قيمتين.

---

### 4.6 Experiment

**الغرض:** تجربة علمية منتقاة من PSI (أو مصدر آخر) في الـ catalog. **ليست** نسخة كاملة من الـ dataset.

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `int IDENTITY` | NN | **PK** |
| `Title` | `nvarchar(300)` | NN | |
| `ExternalSystem` | `nvarchar(50)` | NULL | `PSI` |
| `ExternalId` | `nvarchar(200)` | NULL | معرّف التجربة/الـ dataset في PSI |
| `Discipline` | `nvarchar(50)` | NN | الافتراضي `CombustionScience` |
| `Platform` | `nvarchar(100)` | NULL | ISS / Parabolic flight / Drop tower / Ground |
| `GravityCondition` | `nvarchar(30)` | NULL | `Microgravity`, `Lunar`, `Martian`, `Earth`, `Variable`, `Unknown` |
| `Summary` | `nvarchar(max)` | NN | ملخص أعدّه الفريق من المصدر |
| `KeyFindings` | `nvarchar(max)` | NULL | ما وثّقه المصدر (لا استنتاجات الفريق) |
| `PrincipalInvestigator` | `nvarchar(200)` | NULL | |
| `PerformedFrom` / `PerformedTo` | `date` | NULL | |
| `CurationStatus` | `nvarchar(20)` | NN | `Draft`, `Verified` |
| `CuratedAt` | `datetime2(0)` | NN | |

**الفهارس:**
- UK مُرشَّح على `(ExternalSystem, ExternalId)` عند عدم NULL.
- `IX_Experiments_Discipline`, `IX_Experiments_GravityCondition`.
- بحث النص في MVP: `LIKE` على `Title`/`Summary` (يكفي لعشرات السجلات). Full-Text = Future.

**Provenance:** يجب أن يملك كل `Experiment` **مصدراً أساسياً واحداً على الأقل** (`ExperimentSource.Role = 'Primary'`). يُفرض في الـ Service والـ seeder (غير قابل للفرض بقيد DB بسهولة).

### 4.7 ExperimentParameter

**الغرض:** معاملات التجربة (ظروف، قياسات، نتائج) بشكل مرن.

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `int IDENTITY` | NN | **PK** |
| `ExperimentId` | `int` | NN | **FK** → Experiments (Cascade) |
| `ParameterKey` | `nvarchar(100)` | NN | من قائمة ثوابت في الكود مثل `OxygenConcentration`, `Pressure`, `AmbientTemperature` |
| `DisplayName` | `nvarchar(150)` | NULL | |
| `Category` | `nvarchar(20)` | NN | `Condition`, `Measurement`, `Result` |
| `ValueNumeric` | `decimal(18,6)` | NULL | |
| `ValueMin` / `ValueMax` | `decimal(18,6)` | NULL | لنطاقات |
| `ValueText` | `nvarchar(500)` | NULL | |
| `Unit` | `nvarchar(30)` | NULL | |
| `Notes` | `nvarchar(500)` | NULL | |

قيد: `CHECK (ValueNumeric IS NOT NULL OR ValueText IS NOT NULL OR (ValueMin IS NOT NULL AND ValueMax IS NOT NULL))`.
فهارس: `(ExperimentId)`, `(ParameterKey, ExperimentId)`.

**لماذا ليس أعمدة ثابتة؟** لأنك لا تعرف أن كل تجربة تحتوي أكسجين وضغطاً وحرارة. نمط key/value/unit يقبل أي معاملات، ويمثّل "غير موجود" بغياب الصف بدل قيمة NULL غامضة. الثمن: استعلامات أكثر تعقيداً، وهو مقبول لعدد تجارب صغير. **مخاطرة:** تضارب أسماء المفاتيح؛ تُعالَج بقائمة ثوابت واحدة (`ParameterKeys`) ومستقبلاً جدول `ParameterDefinition`.

### 4.8 ExperimentMaterial / ExperimentSource (ربط)

| الجدول | الأعمدة | PK |
|---|---|---|
| `ExperimentMaterial` | `ExperimentId` FK، `MaterialId` FK، `Role nvarchar(30) NULL` | `(ExperimentId, MaterialId)` |
| `ExperimentSource` | `ExperimentId` FK، `ResearchSourceId` FK، `Role nvarchar(30) NN` (`Primary`, `Publication`, `Dataset`, `Related`) | `(ExperimentId, ResearchSourceId)` |

فهرس عكسي على `MaterialId` و`ResearchSourceId`. الحذف: Cascade من Experiment، Restrict من الجهة الأخرى.

---

### 4.9 HabitatAnalysis

**الغرض:** سجل طلب تحليل واحد (مدخلات + حالة).

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `uniqueidentifier` | NN | **PK** (يُولَّد في التطبيق) |
| `SpaceEnvironmentId` | `int` | NN | **FK** (Restrict) |
| `MaterialId` | `int` | NN | **FK** (Restrict) |
| `OxygenPercent` | `decimal(5,2)` | NN | القيمة النهائية بعد حل الافتراضيات |
| `PressureKPa` | `decimal(9,3)` | NN | |
| `TemperatureCelsius` | `decimal(6,2)` | NN | |
| `GravityLevelG` | `decimal(6,4)` | NN | |
| `InputOriginJson` | `nvarchar(max)` | NULL | لكل معامل: `UserProvided` أو `EnvironmentDefault` |
| `AdditionalParametersJson` | `nvarchar(max)` | NULL | معاملات إضافية تتفق عليها مع فريق الـ AI |
| `Status` | `nvarchar(20)` | NN | `Pending`, `Running`, `Completed`, `Failed` |
| `ErrorCode` | `nvarchar(50)` | NULL | `AI_TIMEOUT`, `AI_UNAVAILABLE`, `AI_INVALID_RESPONSE`, ... |
| `ErrorMessage` | `nvarchar(1000)` | NULL | |
| `CorrelationId` | `uniqueidentifier` | NN | لربط السجلات بالطلب |
| `RequestedAt` | `datetime2(3)` | NN | |
| `CompletedAt` | `datetime2(3)` | NULL | |
| `DurationMs` | `int` | NULL | |

**القيود:** `CHECK (OxygenPercent BETWEEN 0 AND 100)`، `CHECK (PressureKPa > 0)`، `CHECK (TemperatureCelsius >= -273.15)`، `CHECK (GravityLevelG >= 0)` — هذه حدود **فيزيائية/تقنية** وليست عتبات علمية للخطر.
**فهارس:** `(RequestedAt DESC)`, `(SpaceEnvironmentId, MaterialId)`.

**لماذا نخزّن القيم النهائية لا الـ IDs فقط؟** لأن القيم الافتراضية للبيئة قد تتغير لاحقاً، والسجل التاريخي يجب أن يعكس ما أُرسل فعلاً للـ AI.

### 4.10 HabitatAnalysisResult

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `int IDENTITY` | NN | **PK** |
| `HabitatAnalysisId` | `uniqueidentifier` | NN | **FK + UK** (1:1، Cascade) |
| `RiskLabel` | `nvarchar(30)` | NULL | تصنيف نصي من الـ AI (المفردات يتفق عليها الفريق) |
| `AnalysisBasis` | `nvarchar(40)` | NN | `LlmInterpretationOnly`, `ReferenceDataMatch`, `ValidatedModel`, `Mock` |
| `IsMock` | `bit` | NN | |
| `Explanation` | `nvarchar(max)` | NN | نص الـ AI |
| `Limitations` | `nvarchar(max)` | NULL | قيود يذكرها الـ AI/الـ Backend |
| `ModelName` | `nvarchar(100)` | NULL | |
| `ModelVersion` | `nvarchar(50)` | NULL | |
| `ContractVersion` | `nvarchar(20)` | NN | نسخة عقد الـ AI المستخدمة |
| `RawResponseJson` | `nvarchar(max)` | NULL | الرد الخام للتدقيق |
| `CreatedAt` | `datetime2(3)` | NN | |

**قاعدة:** `AnalysisBasis = ValidatedModel` لا تُقبل من الـ AI إلا إذا اتفق الفريق صراحة أن هناك نموذجاً مُتحقَّقاً؛ وإلا يُخفَّض إلى `LlmInterpretationOnly` في الـ Service (حماية من claim غير مدعوم).

### 4.11 AnalysisFactor

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `int IDENTITY` | NN | **PK** |
| `HabitatAnalysisResultId` | `int` | NN | **FK** (Cascade) |
| `Name` | `nvarchar(150)` | NN | |
| `Description` | `nvarchar(1000)` | NULL | |
| `Direction` | `nvarchar(20)` | NULL | `IncreasesRisk`, `DecreasesRisk`, `Unclear` |
| `SortOrder` | `int` | NN | |

### 4.12 AnalysisReference و KnowledgeCitation

نفس الهيكل في الجدولين (مرجع مستشهَد به من الـ AI):

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `int IDENTITY` | NN | **PK** |
| `HabitatAnalysisResultId` / `KnowledgeQueryId` | `int` / `uniqueidentifier` | NN | **FK** (Cascade) |
| `ResearchSourceId` | `int` | NULL | **FK** (`SetNull`) — يُملأ عند نجاح المطابقة مع الـ catalog |
| `MatchStatus` | `nvarchar(20)` | NN | `Matched`, `Unmatched` |
| `RawTitle` | `nvarchar(500)` | NULL | كما أرسلها الـ AI |
| `RawUrl` | `nvarchar(2000)` | NULL | |
| `RawExternalId` | `nvarchar(200)` | NULL | |
| `Excerpt` | `nvarchar(2000)` | NULL | مقتطف من المصدر |
| `RelevanceScore` | `decimal(5,4)` | NULL | (KnowledgeCitation فقط) |
| `SortOrder` | `int` | NN | |

قيد: `CHECK (ResearchSourceId IS NOT NULL OR RawTitle IS NOT NULL OR RawUrl IS NOT NULL)`.

**لماذا نُبقي `Raw*`؟** الـ AI قد يستشهد بمصدر ليس في الـ catalog. بدلاً من رمي الـ citation أو إنشاء `ResearchSource` غير موثّق تلقائياً، نحفظه كما هو بحالة `Unmatched`، ويعرضه الـ Frontend بشارة "غير مطابق مع المصادر الموثّقة". هذا يحمي الـ provenance.

### 4.13 KnowledgeQuery

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `uniqueidentifier` | NN | **PK** |
| `Question` | `nvarchar(2000)` | NN | |
| `FiltersJson` | `nvarchar(max)` | NULL | |
| `Answer` | `nvarchar(max)` | NULL | NULL عند الفشل |
| `Status` | `nvarchar(20)` | NN | `Running`, `Completed`, `Failed` |
| `GroundingStatus` | `nvarchar(20)` | NULL | `HasCitations`, `NoCitations`, `Mock` — يحدده الـ Backend من عدد الـ citations |
| `IsMock` | `bit` | NN | |
| `ModelName` | `nvarchar(100)` | NULL | |
| `ContractVersion` | `nvarchar(20)` | NN | |
| `ErrorCode` / `ErrorMessage` | `nvarchar(50)` / `nvarchar(1000)` | NULL | |
| `CorrelationId` | `uniqueidentifier` | NN | |
| `RequestedAt` / `CompletedAt` | `datetime2(3)` | NN / NULL | |
| `DurationMs` | `int` | NULL | |

**ملاحظة صادقة:** `HasCitations` لا يعني أن الإجابة صحيحة، فقط أن الـ AI أرفق مراجع. لذلك الاسم `GroundingStatus` يقيس وجود مراجع لا صحة الإجابة، والـ Frontend يعرض ذلك بصيغة "مدعومة بمراجع مُرفقة" لا "مُتحقَّق منها".

---

### 4.14 Technology

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `int IDENTITY` | NN | **PK** |
| `Slug` | `nvarchar(100)` | NN | **UK** |
| `Name` | `nvarchar(200)` | NN | |
| `Category` | `nvarchar(30)` | NN | `FireDetection`, `FireSuppression`, `SmokeMonitoring`, `BuildingSafety`, `Other` |
| `Summary` | `nvarchar(1000)` | NN | |
| `Description` | `nvarchar(max)` | NULL | |
| `SpaceOriginSummary` | `nvarchar(max)` | NULL | الأصل البحثي |
| `IsPublished` | `bit` | NN | |
| `CreatedAt` / `UpdatedAt` | `datetime2(0)` | NN | |

### 4.15 TechnologyApplication

| العمود | النوع | NULL | ملاحظات |
|---|---|---|---|
| `Id` | `int IDENTITY` | NN | **PK** |
| `TechnologyId` | `int` | NN | **FK** (Cascade) |
| `Domain` | `nvarchar(10)` | NN | `Space`, `Earth` |
| `Title` | `nvarchar(200)` | NN | |
| `Description` | `nvarchar(max)` | NN | |
| `EvidenceLevel` | `nvarchar(30)` | NN | **`DocumentedInSource`** أو **`TeamProposed`** |
| `ResearchSourceId` | `int` | NULL | **FK** (`SetNull`) |
| `SortOrder` | `int` | NN | |

قيد: `CHECK (EvidenceLevel <> 'DocumentedInSource' OR ResearchSourceId IS NOT NULL)`.
**السبب:** "التطبيق الأرضي المحتمل" غالباً استنتاج من الفريق، ويجب أن يظهر كذلك في الواجهة وليس كحقيقة مصدَّرة من NASA.

### 4.16 TechnologyExperiment / TechnologySource (ربط)

| الجدول | الأعمدة | PK |
|---|---|---|
| `TechnologyExperiment` | `TechnologyId` FK، `ExperimentId` FK | `(TechnologyId, ExperimentId)` |
| `TechnologySource` | `TechnologyId` FK، `ResearchSourceId` FK | `(TechnologyId, ResearchSourceId)` |

---

## 5. الـ Provenance: كيف نمثّل المصدر الأصلي مقابل تفسير الـ AI

| نوع المحتوى | أين يُخزَّن | كيف يُوسم |
|---|---|---|
| بيانات/ملخصات تجارب من NASA | `Experiment`, `ExperimentParameter` | `Experiment` مربوط بـ `ResearchSource` ذي `Origin = NasaOriginal`؛ `CurationStatus` |
| مرجع (dataset / ورقة) | `ResearchSource` | `Origin`, `ExternalSystem+ExternalId`, `Doi`, `Url`, `VerifiedByTeam` |
| نص AI (تحليل أو إجابة) | `HabitatAnalysisResult`, `KnowledgeQuery` | `AnalysisBasis` / `GroundingStatus` / `IsMock` / `ModelName+Version` |
| مراجع استشهد بها الـ AI | `AnalysisReference`, `KnowledgeCitation` | `MatchStatus` (`Matched` أو `Unmatched`) + `Raw*` |
| تطبيقات تقنية مقترحة | `TechnologyApplication` | `EvidenceLevel` |

**قواعد صارمة:**
1. لا يُدخَل نص مولَّد بالـ AI إلى `Experiment` أو `ResearchSource` تلقائياً.
2. كل استجابة API فيها نص AI تتضمن حقول الوسم أعلاه.
3. لا يُنشأ `ResearchSource` من citation الـ AI دون مراجعة بشرية.

---

## 6. الفرق بين تحقق تقني وتحقق علمي (على مستوى DB)

`CHECK` constraints في الـ DB تفرض **حدوداً فيزيائية/تقنية مطلقة** فقط (النسبة المئوية بين 0 و100، الضغط موجب، الحرارة فوق الصفر المطلق، الجاذبية غير سالبة). **لا** تفرض أي عتبة علمية للخطر ولا نطاق "آمن". أي حكم علمي يخص الـ AI/النماذج وليس قاعدة البيانات.

---

## 7. استراتيجية PSI: ما الذي يُخزَّن في SQL وما الذي يبقى خارجه

| البند | في SQL Server | خارجياً |
|---|---|---|
| معرّف التجربة/الـ dataset، العنوان، DOI، الرابط | ✔ `ResearchSource` / `Experiment` | — |
| ملخص التجربة (من إعداد الفريق من المصدر) | ✔ `Experiment.Summary` | — |
| معاملات مفتاحية قليلة (أكسجين، ضغط، جاذبية...) | ✔ `ExperimentParameter` | — |
| الملفات الخام (قياسات، فيديو، صور) | ✘ | ✔ رابط في `SourceAsset` يشير للمصدر الأصلي أو تخزين الفريق |
| PDF الأوراق | ✘ | ✔ رابط/تخزين، والـ AI team يفهرسها في الـ RAG |
| فهرس Vector والـ embeddings | ✘ | ✔ عند فريق الـ AI |

**عملياً في 4 أيام:**
1. الفريق يختار **5 إلى 15 تجربة** احتراقية (يتحقق منها في PSI و/أو NTRS) — *مهمة مشتركة مع فريق الـ AI حتى يتطابق الـ corpus مع الـ catalog*.
2. تُحفظ في ملفات `Data/Seed/SeedData/*.json` (مصادر، تجارب، معاملات).
3. `DbSeeder` يقرأها عند بدء التشغيل (idempotent: يتحقق من `ExternalSystem+ExternalId` قبل الإدراج).
4. **مفتاح الربط بين SQL والـ RAG:** `ExternalSystem + ExternalId` (أو `Doi`). الـ AI يُرجع هذه المعرّفات في الـ citations والـ Backend يطابقها مع `ResearchSource`.

**ما لا نفترضه:** وجود API لـ PSI، تجانس بنية الـ datasets، أو أن كل تجربة تحوي نفس المعاملات (لذلك نمط `ExperimentParameter`)، أو حق إعادة توزيع الملفات (لذلك نخزّن روابط لا نسخاً حتى يُتحقَّق من `License`).

---

## 8. أولويات التنفيذ على مستوى الجداول

| المجموعة | الجداول |
|---|---|
| **Must (اليوم 1)** | `ResearchSource`, `SpaceEnvironment`, `Material`, `Experiment`, `ExperimentParameter`, `ExperimentMaterial`, `ExperimentSource`, `HabitatAnalysis`, `HabitatAnalysisResult`, `AnalysisFactor`, `AnalysisReference`, `Technology`, `TechnologyApplication`, `KnowledgeQuery`, `KnowledgeCitation` |
| **يومان (قبل نهاية التحضير)** | `TechnologyExperiment`, `TechnologySource` (إن تبقى وقت) |
| **Nice** | `MaterialProperty`, `SourceAsset` |

نصيحة: أنشئ **كل** الكيانات في migration واحدة في اليوم 1 (تكلفة الجداول الصغيرة قليلة)، لكن لا تبنِ لها endpoints قبل الحاجة.

---

## 9. ملاحظات EF Core 8 عملية

- استخدم `IEntityTypeConfiguration<T>` لكل كيان لتبقى الـ DbContext مقروءة.
- `HasConversion<string>()` لكل enum + `HasMaxLength`.
- `HasPrecision(p, s)` لكل decimal (وإلا يظهر تحذير ويُقتطع).
- الفهارس المُرشَّحة: `.HasIndex(...).IsUnique().HasFilter("[ExternalId] IS NOT NULL ...")`.
- `CHECK`: `ToTable(t => t.HasCheckConstraint("CK_...", "..."))`.
- للقراءة فقط في الـ catalog: `.AsNoTracking()` و`Select` مباشرة إلى DTO.
- تجنب `Include` متعدد المستويات في القوائم (يسبب cartesian explosion)؛ استعمل `AsSplitQuery()` في صفحات التفاصيل.
- الـ seed: `DbSeeder` مخصص (من JSON) بدل `HasData`، لأن `HasData` يتطلب IDs ثابتة وتضيف ضجيجاً في الـ migrations.
