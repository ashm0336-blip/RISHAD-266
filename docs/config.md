# الإعداداتُ غيرُ السرّية (SOT-114) ومتغيّراتُ البيئة (SOT-115) — KIVO

| الإعداد | الملف (المصدر الواحد) | المستهلك | التحقق |
|---|---|---|---|
| كتلُ البناء والغلاف (ترتيبُ الأصول · `dcLogic` · `dcLogicInline` · الصفحات الكسولة) + تخطيطُ المصدر | `src/blocks.json` · `src/layout.json` | `tools/build.py` | `tests/source/k2NNeq.py` · `src/schemas/*.schema.json` |
| manifest الصفحات (المفاتيح · التبويبات · الحاويات · العدسات · القائمة) | `src/manifests/pages.json` | `src/manifests/255-page-manifest.js` (مولَّد) · `PG_REG` في الخادم | `generate.py --check` · `pages.schema.json` · `k247src.py (ج)` |
| سجلُّ الصلاحيات v24.9 (الموارد · القدرات · الأبعاد) | `src/permissions/registry/registry-v24.9.json` + `engine.js` + `targets.json` | `src/permissions/340-registry-v24-9.js` · `workers/parts/004-registry-2.js` (مولَّدان) | `generate.py --check` · `gate.py` (تطابقُ السجلّين) |
| رموزُ التصميم (primitives · semantic · dark) | `src/styles/tokens/tokens.json` | `src/styles/070-theme-tokens.css` · `080-theme-dark.css` (مولَّدان) | `tokens.py verify` · سقّاطةُ الألوان · `tokens.schema.json` |
| مخطّطُ قاعدة D1 | `migrations/NNNN_*.sql` (جذرُ المستودع) | `workers/parts/051a-schema-migrations.js` (مولَّد) → `initDb` | `tests/unit/migrations.test.mjs` · `generate.py --check` |
| متغيّراتُ البيئة وروابطُ Pages (أسماءٌ وأنواعٌ وقيود — بلا قيم) | `config/env.schema.json` (جذرُ المستودع) | لوحةُ Cloudflare (Settings → Variables/Bindings) · العامل `env.*` | `tools/env_check.py` |
| سياساتُ الأمن القابلة للضبط من شاشة مدير النظام (قفلُ الدخول · المهل) | D1 `meta` (تُقرأ لكل طلب — `loadPolicy`) | الخادم | `cfbench/…sec` (حدُّ المعدّل وقفلُ الدخول) |
| وضعُ الإنفاذ | ENV `KIVO_AUTHZ_MODE` ∧ D1 `meta.authz_mode` (ADR-002) | الخادم | `tests/unit/rm1_*` · `k2NNui.mjs` |

## القيمُ بحسب البيئة (بلا أسرار)
- **Production** (`kivo-d81.pages.dev` · فرع main · D1 `bassam-db`): لا متغيّرات مضبوطة (= legacy) — لا تُمسّ.
- **Preview** (`test.kivo-d81.pages.dev` · فرع test · D1 `bassam-db-preview`): `KIVO_AUTHZ_MODE=enforce` · `KIVO_TEST_FIXTURE=allow` (يُزال بعد الاختبارات — SOT-173) · `KIVO_TEST_HOST` اختياري.
- الأسرار: لا توجد متغيّراتُ بيئةٍ سرّية؛ مفتاحُ الاستعادة بصمةٌ في D1 (`meta.rk`) ويُدار من شاشة مدير النظام (SOT-140).

## قواعد
1. كلُّ إعدادٍ له ملفٌ واحد مصدرٌ ومشتقٌّ مولَّد محروسٌ بـ`--check` في CI؛ لا يُحرَّر المشتقُّ يدوياً.
2. إضافةُ متغيّر بيئة = تعديلُ `env.schema.json` أولاً (الاسم · النوع · القيم المسموحة · البيئات) ثم استعمالُه في العامل؛ `env_check.py` يرفض المستعملَ غيرَ المعلن والمعلنَ غيرَ المستعمل.
3. لا قيمةَ سرّية في المستودع ولا في هذا الملف.
