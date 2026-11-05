# المستودع والبناء والتشغيل — رشاد (RISHAD)

> نُقل هذا المحتوى من `README.md` كما هو (RISHAD-266) ليبقى الملف التعريفي مختصراً. تعليماتُ البناء والاختبار وقواعدُ العمل هنا هي المرجع.

> المرجع الرسمي للمتطلبات: `docs/sot/KIVO_MASTER_REQUIREMENTS_v6.json` (SOT v6) — اللوحة `docs/sot/KIVO_MASTER_SOURCE_OF_TRUTH_v6.html` والـCSV مولَّدان منه.
> نقطة الاستئناف الحالية: [سجل تنفيذ RISHAD 266](RISHAD_266_IMPLEMENTATION.md). ملفات `STATE.md` وتقارير KIVO القديمة أدلة تاريخية؛ لا تُعامل باعتبارها نتيجة فحص النسخة الحالية.

## خريطة المستودع (KIVO_259 · AUD-029 — البنيةُ الرسمية: 15 مدخلاً في الجذر)

**المستودعُ الرسمي** هو هذه المدخلاتُ الخمسة عشر وحدها؛ `python3 tools/export_official.py --check` يصدّرها إلى مجلدٍ منفصل ويُثبت أنها تكفي نفسَها
(المولِّد · البناء · اختباراتُ الوحدة كلُّها · الفحوصُ المعمارية · مرجعُ SOT) بلا أيّ ملفٍّ من المختبر.

| المسار | ما فيه | ملاحظة |
|---|---|---|
| `src/` | **المصدرُ الحيّ** بالشجرة المعيارية: `core` · `layouts` · `components` · `services` · `i18n` · `api` · `auth` · `permissions` (+`registry/`) · `manifests` · `modules` (الصفحاتُ مصدراً) · `pages` (مولَّدة) · `styles` (+`tokens/`) · `assets/{fonts,images,icons}` · `plugins` (العدساتُ إضافات · ADR-018) · `schemas` · `scope` · `types` · `blocks.json` · `layout.json` | ADR-012 |
| `workers/` | أجزاءُ عامل Cloudflare (`parts/*` + `parts.json`) و`_worker.js` المولَّد | ADR-006 · ADR-009 |
| `public/` · `migrations/` · `config/` | الملفاتُ الثابتة للجذر · ترحيلاتُ D1 المرقَّمة (ADR-011) · مخطّطُ البيئة وwrangler.toml (بلا قيم ولا أسرار) | |
| `tools/` | البناءُ الحتمي `build.py` و`build_chain.sh` · المولِّد `generate.py` · `tokens.py` · `plugins.py` · `kivo_ns.mjs` · `gen_types.mjs` · فحصُ الإصدار `release_check.py` · التغليف `pack.py` · المرجع `sot.py` (+`sot_render.py` · `sot_verify.py`) · السقّاطات (`lint_ratchet` · `color_ratchet` · `empty_catch_ratchet` · `bp_ratchet`) · `sbom.py` · `env_check.py` · `deps_check.py` · `trace.py` · `test_catalog.py` · `export_official.py` · `sec/` · `d1/` | |
| `tests/` | `unit/` (العاملُ والمحرّكاتُ داخل Node) · `source/` (براهينُ المصدر لكل مرشّح + فحوصُ المعمارية) · `fixtures/` (مولِّدُ بيانات الاختبار) · `baselines/` (خطوطُ أساس السقّاطات) | `npm run test:unit` · `npm run check` |
| `docs/` | `adr/` · `runbooks/` · `sot/` المرجعُ الرسمي (+`ref/` مدخلاتُ التحقّق الثابتة) · `compliance/` (SBOM CycloneDX في `docs/compliance/sbom/` + `docs/compliance/LICENSES.md` — مولَّدان) · `reference/` (وثيقةُ v24.9 — مصدرُ شجرة الصلاحيات) · `architecture.md` · `developer.md` · `testing.md` · `traceability.md` · … | |
| `.github/workflows/ci.yml` | البوابةُ الآلية (static · lint · SBOM · env · unit · source proofs · integration) + البوابةُ الكاملة يدوياً | |
| `package.json` · `package-lock.json` · `README.md` · `CHANGELOG.md` · `eslint.config.mjs` · `.gitignore` | | |

**المختبر الانتقالي** (في المستودع الانتقالي نفسِه للتاريخ والبراهين — خارج البنية الرسمية ولا يُصدَّر): `cfbench/` (حزمُ البوابة الكاملة: Miniflare + Playwright) ·
`gateall2NN.sh` · المرشّحاتُ السابقة `k242/`…`k250/` (`k242/src` أساسُ Production) · أجيالُ السجلّ `registry*/` · `lab/archive/` · الحزمُ المبنيّة `pk*/` · أدلةُ `reports/` · `STATE.md`.

## كيف تبني وتختبر النسخة الحالية

تحتاج Node.js يدعم `node:sqlite`، وPython 3.11 أو أحدث مع `jsonschema`، وBash. على Windows يمكن تحديد مفسر Python وGit Bash من PowerShell إذا لم تكن أسماؤهما متاحة في `PATH`:

```powershell
$env:KIVO_PYTHON = 'C:\path\to\python.exe'
$env:KIVO_BASH = 'C:\Program Files\Git\bin\bash.exe'
```

ثم من جذر المستودع:

```bash
npm ci
npm run generate
npm run build
npm run check
npm run test:unit
```

`npm run build` و`npm run build:265` يستعملان مسار البناء الموجود في `tools/build_chain.sh` بوضع `--current`. لا يحتاج هذا المسار وسوم Git التاريخية، ولا يضم أصول `pk264` أو `pk263` التي تستعمل عقود تخزين أقدم. للتحقق القرائي من المشتقات دون إعادة كتابتها: `npm run generate -- --check`.

البناء ينتج `pk265/` ونسخة المقارنة `pk265.mono/` وبيان الملفات `pk265.build.json` و`pk265.MANIFEST.sha256`. يظل مصدر العامل في `workers/parts/` مقروءًا؛ العامل المشتق وحده يُصغّر بأداة `tools/jsmin_tokens.mjs` الموجودة، مع برهان تساوي الرموز وفواصل الأسطر وحفظ علامتي إزالة أدوات الاختبار. يسجل البيان بصمة المصدر وبصمة الناتج، ويتحقق الأمر التالي من مجموعة ملفات الحزمة وبايتاتها ومن برهان العامل دون تعديلها:

```bash
python tools/build.py --src src --mode split --pages lazy --minify-worker --out pk265 --verify
```

تُنشأ أيضًا نسخة محلية `pk265.prod/` للتحقق من إزالة أداة الاختبار؛ وجودها لا يعني اعتماد نشر Production. لا تنفذ أوامر البناء نشرًا أو ترحيل D1 أو Commit أو Push. عند تغيير عقد التخزين، يلزم تحديث التبويبات القديمة بدل شحن عملاء العقود المتقاعدة مع الحزمة الجديدة.

المقارنات التاريخية محفوظة صراحةً في `build:265:legacy` و`check:265:legacy` و`build:chain:legacy`. تحتاج هذه الأوامر المراجع والحزم التاريخية المناسبة؛ لا يدّعي نجاح البناء الحالي أن هذه المقارنات شُغّلت أو نجحت. فحص `check` الحالي يبقي مقارنة الحزمة المقسمة بالمونوليث والفحوص المعمارية وفحص الأسرار وبرهان العامل، دون استبدال المرجع التاريخي المفقود بمرجع مفترض.

## قواعد لا تتغير
1. Production (`kivo-d81.pages.dev` · D1 `bassam-db`) خارج التفويض: لا نشر، لا تعديل، لا ترحيل.
2. أي «مكتمل» في SOT يحتاج دليلاً (مسار/سطر/ملف نتائج/لقطة) لا ذاكرة؛ نجاح Preview ليس اعتماداً للإنتاج.
3. لا تُضعَف الاختبارات؛ أي تعديل في اختبار قائم يُفصح عنه في `CHANGELOG.md` وفي حزمة التسليم.
4. كل حزمة تسليم تحمل `MANIFEST.sha256` وتُسجَّل في `CHANGELOG.md` مع وسم git.
