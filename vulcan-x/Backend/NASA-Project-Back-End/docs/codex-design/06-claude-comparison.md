# Independent comparison with Claude reference

وثائق Claude موجودة في `docs/claude-reference/` وقد روجعت. هذا التحديث يحافظ على Modular Monolith وprovenance وMock، ويصحح تفاصيل تؤثر مباشرة في migration والعقود.

| Area | Claude proposal | Codex revised proposal | Decision | Technical reason |
|---|---|---|---|---|
| workspace | assumed no project | existing net8 project | Modify | audit factual correction |
| architecture | modular monolith + independent AI | same | Keep | right scope/team boundary |
| Habitat inputs | final oxygen/pressure/temp/gravity required after defaults | nullable snapshots + explicit origin; capability profile decides requirements | Modify | no invented defaults or premature AI assumptions |
| gravity | numeric `GravityG` | `GravityRegime` + optional `EffectiveGravityG` | Modify | microgravity is not literal zero |
| parameters | flexible values, unique experiment/key | source FK + `ValueType`; no brittle unique key | Modify | preserves provenance and repeated contextual summaries |
| raw data | catalog/links | explicit exclusion of repeated/time-series from SQL MVP | Keep/strengthen | avoids needless EAV/raw tables |
| source review | `Verified` | `Draft,MetadataReviewed,ApprovedForDisplay` | Modify | separates review quality from scientific origin |
| DOI | stored DOI | normalized DOI before uniqueness/matching | Modify | avoids duplicate resolver/case forms |
| analysis basis | AI can return, backend downgrades | backend computes exact final values | Modify | prevents AI from asserting validation |
| Knowledge grounding | included `Mock`/HasCitations | matched/unmatched/no-citation only; `IsMock` separate | Modify | grounding is not execution mode |
| technology relation | `TechnologyExperiment` optional but API returns experiments | MVP relationship table; `TechnologySource` Should | Modify | removes API/schema conflict |
| sync failures | persist Failed | ProblemDetails has `analysisId` if persisted | Strengthen | frontend can retrieve failed record |
| PSI | curated catalog/no assumed API | same | Keep | verified practical strategy |

## Revision summary

1. لا يوجد redesign: architecture, service boundary, curated PSI strategy، وmock-first delivery بقيت كما هي.
2. تم تصحيح nullable Habitat contract، gravity semantics، profile-based requirement policy، وfailure retrieval.
3. تم توسيع database specification إلى properties/FKs/checks/indexes/delete behavior بدون إضافة raw-data infrastructure.
4. `ValidatedModel` مؤجل تقنيًا وحوكميًا؛ لا يفعّل في MVP بمجرد قول AI ذلك.

## ما يبقى مؤجلاً

`SourceAsset`, automatic PSI importer, raw time-series ingestion, user authentication/admin CRUD, async workers, and validated-model registry implementation. لا يُطلب أي منها قبل MVP؛ registry ضروري فقط قبل السماح مستقبلًا بـ `ValidatedModel`.
