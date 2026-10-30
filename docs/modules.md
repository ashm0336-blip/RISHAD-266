# src/modules — الصفحات كوحدات (منذ KIVO_245 · النمطُ في ADR-019 · KIVO_259)

كل صفحة مجلد تحت `src/modules/<slug>/` (14 صفحة · السجلُّ `src/modules/modules.json` · ومكانُها في التنقّل `src/manifests/pages.json`):
| الملف | المحتوى | يُحرَّر؟ |
|---|---|---|
| `meta.json` | الاسم الأصلي · الغلاف الحرفي (ما قبل `<helmet>` · الفواصل · وسم السكربت · ما بعده) · هل كان السكربت مضغوطاً · بصمة الأصل | لا (مولَّد) |
| `helmet.css` | أنماط الصفحة (كانت داخل `<helmet>`) | نعم |
| `view.html` | قالب x-dc للصفحة (الربط `{{ }}` · `<sc-if>` · `<sc-for>`) | نعم |
| `logic.js` | `class Component extends DCLogic { … }` — مصدرٌ مقروء (12 صفحة أُعيد تنسيقها بـprettier من المضغوط؛ أسماءُ المناهج محفوظة، المتغيّراتُ المحلية ما زالت مختصرة وتُعاد تسميتها تدريجياً) | نعم |

**التركيب**: `python3 tools/generate.py --src src` يولّد `src/pages/<name>.dc.html` من الوحدات (بأداة `tools/page_modules.py`؛ السكربتُ يُصغَّر بـesbuild للصفحات التي كان سكربتُها مضغوطاً أصلاً، والباقي حرفاً) — حتميّ، و`--check` يفشل على أيّ مشتقٍّ ≠ مصدره. والمناهجُ المشتركة بين الصفحات مزيجاتٌ في `src/components/565-page-kit.js` (ADR-016 · AUD-012) لا تُنسخ.

**القاعدة** (ADR-006/007): `src/pages/*.dc.html` ملفات مولَّدة **مُلتزَمة** (commit) حتى يستهلك البناء الوحدات مباشرة؛ أي تعديل يُجرى في `modules/` ثم يُعاد التركيب ويُلتزَم الاثنان معاً — البوابة تكشف أي تباين.

| الصفحة | slug | الحجم بعد إعادة التنسيق | ملاحظة |
|---|---|---|---|
| Employees | employees | 6,201 سطراً | كان 9 أسطر |
| Tasks | tasks | 2,497 | |
| Daily Sessions | daily | 20,267 | أكبر صفحة (المتابعة اليومية) |
| Operational Plan | plan | 19,783 | توأم المتابعة في الطباعة والتقويم (AUD-013) |
| Staffing | staff | 3,013 | |
| Admin | admin | 303 (كما كان) | لم يكن مضغوطاً |
| Profile | profile | 2,736 | |
| Irshad | irshad | 2,036 | |
| Award | award | 2,406 | |
| Daily Report | dreport | 4,400 | |
| Planning | planning | 100 | حاوية الخطة |
| Seized | seized | 3,113 | |
| KPIs | kpis | 75 | عارض |
| Daily Stats | dstats | 1,688 (كما كان) | لم يكن مضغوطاً |
