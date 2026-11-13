# Vulcan-X end-to-end smoke test — 2026-11-12

## النتيجة

**E2E لم ينجح ولم يُدّعَ نجاحه.** إعداد `VulcanX:BaseUrl` الفعلي هو `http://localhost:4000`، وفحص `GET /health` أعاد `connection refused`؛ خدمة Vulcan-X ليست قيد التشغيل أو ليست مستمعة على هذا العنوان.

## حالة الاختبارات المطلوبة

| Public ASP.NET Core endpoint | مثال الطلب المستخدم من وثيقة AI | النتيجة |
|---|---|---|
| `POST /api/v1/ai/query` | question عن 34% O2 / lunar habitat، `environment: lunar_base` | محجوب: upstream غير متاح؛ لم تصل response حقيقية للتحقق من deserialization |
| `GET /api/v1/ai/health` | لا body | محجوب: upstream غير متاح |
| `POST /api/v1/simulator/stress-test` | lunar, 30.0 O2, 10.2 psi, PMMA Acrylic | محجوب: upstream غير متاح |
| `POST /api/v1/simulator/hazard-evaluation` | lunar_base, 32.0 O2, 9.5 psi, PMMA Acrylic | محجوب: upstream غير متاح |
| `GET /api/v1/datasets` | لا body | محجوب: upstream غير متاح |

لم تسجل هذه النتائج HTTP status من الـ public API لأن sandbox المحلي لم يستطع إكمال request pipeline: تشغيل HTTP-only يفعّل `UseHttpsRedirection()` من المشروع، لكن لا يوجد HTTPS port محدد؛ logging لهذا التحذير يحاول Windows Event Log وهو غير مسموح في sandbox. تشغيل profile `https` فشل أيضًا لأن developer certificate غير موجود. هذا عائق بيئة الاختبار، وليس دليلًا على سلوك الإنتاج أو عيب في عقد Vulcan-X.

## ما تم التحقق منه

- الـ typed client يستخدم routes وJSON names الفعلية: `question`, `environment`, `oxygen_concentration`, `pressure_psi`, `material_type`, و`target_planet_or_habitat`.
- `BaseUrl` و`TimeoutSeconds` configurable ولا توجد مفاتيح OpenRouter في backend.
- لا توجد public routes لـ `key-status` أو `key-reset`.
- اختبارات mock الآلية السابقة مرّت: 4/4، وتشمل serialization لمسار query، malformed JSON، upstream 400، وDataAnnotations validation.

## خطوات إعادة التنفيذ خارج sandbox

1. شغّل خدمة AI من مشروعها كما وصف فريق AI (`bun run dev`) وتحقق:

```powershell
Invoke-WebRequest http://localhost:4000/health
```

2. جهّز شهادة التطوير مرة واحدة إن لزم:

```powershell
dotnet dev-certs https --trust
```

3. شغّل backend:

```powershell
dotnet run --project .\NASA.FireSafety.API\NASA.FireSafety.API\NASA.FireSafety.API.csproj --launch-profile https
```

4. نفّذ الأمثلة الخمسة أعلاه ضد `https://localhost:7137`، ثم تحقق من response structure المحددة في `docs/VulcanX_AI_Team_API_Documentation.md`: query (`success`, `answer`, `sources`, `risk_level`)، health (`status`, `uptime`, `timestamp`)، stress-test (`simulation_result`)، hazard (`simulation_metadata`, `visual_3d_trigger_params`, `scientific_explanation`)، datasets (`count`, `datasets`).

5. أوقف AI service وأعد طلبًا واحدًا؛ المتوقع من backend `503` مع ProblemDetails آمن و`errorCode: VULCANX_UNAVAILABLE`. اختبر malformed upstream payload باستخدام mock handler أو proxy؛ المتوقع `502` و`VULCANX_INVALID_RESPONSE`.

