# دليلُ المطوّر — من بيئةٍ نظيفة إلى بناءٍ مثبَت (SOT-160)

هذا الدليلُ يُختبر فعلاً: `tools/onboard_check.sh` ينفّذ الخطوات أدناه في استنساخٍ جديد ويقارن البصمات (الدليل في `reports/k2NN/onboard_*.txt`).

## المتطلبات
- Linux/macOS · git · **Node 22** + npm 10 · **Python 3.12+** + `pip install jsonschema` (لمخطّطات ملفات الإعداد في `generate.py --check`) · متصفحُ Chromium عبر Playwright للحزم المتصفحية فقط.
- لا حسابَ Cloudflare ولا رمزَ API لازمين للبناء والاختبار المحلي (Miniflare يحاكي D1/Pages). النشرُ على Preview يحتاج لوحةَ Cloudflare (`docs/runbooks/preview-deploy.md`).

## 1) الاستنساخ والاعتماديات (مثبَّتة بالقفل)
```bash
git clone <repo> kivo && cd kivo          # اليوم لا مستودعَ بعيداً: المستودعُ يُسلَّم ملفاً (git bundle) — git clone KIVO_repo.bundle kivo · ودفعُه إلى GitHub خاصٍّ قرارُ المالك
npm ci --ignore-scripts && (cd cfbench && npm ci --ignore-scripts) && pip install jsonschema
npx playwright install chromium        # للحزم المتصفحية فقط (اختياري للبناء)
```

## 2) أين المصدر؟ (KIVO_259 · ADR-012 · ADR-020 — المستودعُ الرسمي 15 مدخلاً)
- `src/` في الجذر: `core` (التشغيل · React · dc-runtime · المحمِّل · الإصدار) · `layouts` (الغلاف `index.template.html` · `root-logic.js` · `helmet-global.css` · المنصة 260) · `components` · `services` · `i18n` · `api` · `auth` · `permissions` (+ `registry/` سجلُّ الصلاحيات) · `manifests` (`pages.json` · webmanifest) · `modules/<page>/{meta.json,helmet.css,view.html,logic.js}` (المصدرُ المقروء للصفحات) · `pages/` (مولَّدة) · `styles/` (+ `tokens/tokens.json`) · `assets/{fonts,images}` · `blocks.json` (ترتيبُ البناء) · `layout.json` (التخطيطُ الذي تقرأه الأدوات).
- بجوارها: `workers/parts/*` (الخادمُ أجزاءً) → `workers/_worker.js` (مولَّد) · `public/` (ملفاتُ الجذر الثابتة) · `migrations/*.sql` · `config/env.schema.json`.
- **المشتقّاتُ لا تُحرَّر يدوياً** (21 ملفاً — ومنها منذ 259 جزءُ الإضافات `workers/parts/006a-lens-plugins.js`: الصفحات · العامل · السجل · manifest الصفحات · الترحيلات · 070/080): `python3 tools/generate.py --src src` يولّدها، و`--check` يرفض أيَّ انحراف (CI).
- المختبرُ الانتقالي خارج البنية الرسمية: `cfbench/` (حزمُ التكامل والمتصفح) · `gateall2NN.sh` · المرشّحاتُ السابقة `k242/` … `k250/` لقطاتٌ مجمَّدة (الأدواتُ نفسُها تبنيها) · `registry*/` · `pk*/` · `reports/`.
- **الأيقونات** (KIVO_253 · ADR-014): المصدرُ `src/assets/icons/catalog.json` والفهرسُ المرئي `docs/icons.html`؛ القوالبُ تشير `<svg data-i="i-…" …></svg>` والأجسادُ تُركَّب عند البناء. أيقونةٌ جديدة: اكتبها `<svg>` مضمَّنةً في القالب ثم `python3 tools/icons.py extract --src src` (ينقلها إلى الفهرس ويستبدلها بالإشارة ويحدّث الفهرسَ المرئي)؛ الحارس `python3 tools/icons.py check --src src` (في `npm run build/check` وCI).
- **نقاطُ الكسر** (AUD-019): المقياسُ في `tokens.json → breakpoints` (420 · 640 · 900 · 1024 · 1280)؛ `@media` جديد يستعمل قيمةً منه، والقيمُ الموروثة في `tests/baselines/bp.baseline.json` لا تزيد (`tools/bp_ratchet.py src`).
- **CSP** (AUD-005 خطوة ٢): `script-src 'self' 'nonce-…'` — لا سكربتَ مضمَّناً في الغلاف غيرَ حقن `__BS_BOOT` (يحمل nonce الطلب من العامل)؛ أيُّ `<script>` مضمَّنٍ جديد في القوالب سيُرفض في المتصفح — المنطقُ يُكتب في `modules/*/logic.js` ويُصرَّف.
- **نصُّ المنطق لا يُشحن مرتين** (AUD-024): جسدُ `<script data-dc-script>` في الغلاف ونصوص الصفحات علامةٌ قصيرة عند البناء؛ المنطقُ في `*.logic.js`/`root-logic.js`. الفحوصُ الساكنة تقرأ النصَّ الكامل عبر `cfbench/split242.mjs indexText` (يعيد الأجساد من التعريفات).

## 3) البناءُ الحتمي
```bash
bash tools/build_chain.sh 259     # يبني المُبقاةَ المعلنة في build:259 (255 و254 — آخرُ منشورَين) من وسومها إن غابت، ثم pk259 + pk259.mono + MANIFEST
```
نفسُ المدخلات ⇒ نفسُ البايتات (`tests/source/k254src.py (د)` يعيد البناءَ ويقارن).

## 4) الفحوصُ بترتيب الكلفة (KIVO_259)
```bash
python3 tools/generate.py --src src --check                 # المشتقّات = مصادرها (ومعها الإضافات والمخطّطات)
python3 tools/plugins.py check && python3 tools/tokens.py check src && python3 tools/deps_check.py && node tools/kivo_ns.mjs tools/kivo_ns.json --check
npm run lint && python3 tools/color_ratchet.py src && python3 tools/empty_catch_ratchet.py src && python3 tools/bp_ratchet.py src && python3 tools/icons.py check --src src   # السقّاطات
python3 tools/sbom.py --src src --check && python3 tools/env_check.py src && python3 tools/sot_verify.py
npm run test:unit:259                                       # 171 اختباراً — العاملُ داخل Node فوق D1 بديل (~2 دقيقة)
npm run check                                               # براهينُ المصدر: الفرقُ المعلن عن الوسم السابق · التكافؤ · الخصوصية (Python)
python3 tools/export_official.py --check                    # المستودعُ الرسمي وحده يكفي نفسَه (AUD-029)
# — المختبرُ الانتقالي (cfbench · متصفح حقيقي + Miniflare) — سكربتاتُ npm المختبرية كلُّها lab:* (لا تعمل في المستودع الرسمي وحده — export_official يتحقّق) —
npm run lab:logic:259 && npm run lab:int:rm1                # المنطقُ المُصرَّف · المسابيرُ الأمنية (دقائق)
npm run lab:perm:259 && npm run lab:ns:259 && npm run lab:print:259   # شجرةُ v24.9 والسقف · الواجهةُ العامة KIVO · تكافؤُ الطباعة مع 255
npm run lab:devices:259 && npm run lab:a11y:259             # مصفوفةُ الأجهزة · axe (سقّاطتا tests/baselines/touch|a11y.baseline.json)
npm run lab:vis:259                                         # السقّاطةُ البصرية مع KIVO_240 (64 شاشة · ~45 دقيقة)
bash gateall259.sh pk259                                    # البوابةُ الكاملة (≈140 حزمة · ~3 ساعات) — قبل كل تسليم (= npm run lab:gate)
python3 tools/release_check.py 259 --gate reports/k259/gate_259_run1.txt   # لا نشرَ بلا دليل
```
- اختبارُ وحدةٍ واحد: `node --test tests/unit/migrations.test.mjs`. عاملٌ آخر: `KIVO_WORKER=<مسار _worker.js> KIVO_DIST=<حزمته> npm run test:unit` (الاختباراتُ المشروطة بإصدارٍ لاحق تُتخطّى على الأقدم).
- البوابةُ تدعم الاستئناف بعد انقطاع: `GATE_DONE=$PWD/reports/k259/gate_259_done.txt bash gateall259.sh pk259` (شغّلها منفصلةً عن الصدفة: `setsid nohup … &`).
- براهينُ المرشّح تقارن بالوسم git السابق (`KIVO_258` لـ259 — `KIVO_PREV_TAG` يبدّله) وبحزمته إن وُجدت (أو `KIVO_PREV_PK=<مسار>`)؛ خطُّ أساس الخصوصية (KIVO_240) مُلتزَمٌ في `tests/source/pii_baseline_240.json`.

## 5) تعديلٌ نموذجي (دورةُ العمل)
1. المرشّحُ التالي يُعدَّل في `src/` مباشرةً (فرعُ git لكل مرشّح؛ الإصدارُ في `src/core/270-bs-ver.js` و`workers/parts/002` و`056`)؛ عند التسليم تُحفظ لقطةٌ مجمَّدة (وسم git) والحزمةُ `pk2NN` ببصماتها.
2. عدّل **المصدر** (جزءَ خادم في `workers/parts` · وحدةَ صفحة في `src/modules` · `src/styles/tokens/tokens.json` · `src/manifests/pages.json` · ترحيلاً جديداً في `migrations/`) ثم `npm run generate` ثم ابنِ وافحص.
3. اكتب اختبارَ الفرق المعلن `tests/source/k2NNsrc.py` (ما الذي تغيّر بالضبط عن السابق) واختباراتِ الوحدة لما استُحدث؛ حدّث `CHANGELOG.md` و`docs/adr/` لقرارٍ معماري و`STATE.md` لنقطة الاستئناف.
4. حدّث المرجعَ الرسمي بعد الإثبات فقط: `python3 tools/sot.py set <ID> --status … --level محلي --evidence …` ثم `render`.
5. التغليف: `python3 tools/pack.py KIVO_2NN pk2NN /mnt/user-data/outputs/KIVO_2NN` (zip + SHA-256 + MANIFEST).

## 5ب) إضافةُ عدسة (KIVO_259 · ADR-018 · AUD-030) — ملفّا بيانات، بلا كود
1. `src/plugins/lenses/<key>/manifest.json` على المخطّط `src/schemas/lens-plugin.schema.json`: الاسم · `order` · `owner: lens.<key>` · المضيفات · المفاتيح (`own`/`reserved`/`managedRefs`)
   · الموارد (`elementFields` حقولٌ فوق عناصر أعمدةٍ قائمة · `floorFields` حقولُ الطابق · أو `column` لعمود عناصرٍ جديد) · الحرّاس (`enable` · الموارد) · الاختبارات. ثم `python3 tools/plugins.py fmt`.
2. مفاتيحُها في سجلّ v24.9 (`src/permissions/registry/registry-v24.9.json`: المالكُ `lens.<key>` من نوع lens · المفاتيحُ بـ`asisMap` · وأهدافُ الذرّات إن كانت تُترجم من الأوراق القديمة).
3. `python3 tools/generate.py --src src` (LENS_REG · `workers/parts/006a-lens-plugins.js` · العامل · السجلّ) ثم `python3 tools/perm_tree.py emit` (الشجرة تُلحقها بحاوية «العدسات (Plugins)»).
4. الفحص: `python3 tools/plugins.py check` · `node --test tests/unit/plugins.test.mjs` · `python3 tests/source/plugin_add_check.py` (البرهانُ نفسُه على عدسةٍ مثال).
- النتيجة: تظهر في سقف الإدارة ونافذة الموظف والقوالب، وتحرسها طبقةُ الإنفاذ (ربطُ مفاتيحها · بوابتُها وسقفُها · تصنيفُ حقولها بمفاتيحها · حجبُ حقولها حين تُطفأ وإعادتُها عند الحفظ).
  رسمُها على الخريطة يحتاج عارضَها في وحدتي الخطة والمتابعة (خارج القبول — ADR-018). الوحداتُ المرجعية (registry10) لا تُحرَّر: اعتمادُ العدسة في الوثيقة يُدرجها فيها.

## 5ج) أين يذهب الكود الجديد؟ (KIVO_263 · SOT-104/105 · `tools/deps_check.py` R1–R4)
- **أداةٌ صغيرة** (تنسيقُ رقم · مفتاحُ موظف · بحثٌ موحّد · بدائياتُ عرض): خدمةٌ **منصّية** في `src/services/` — نقيّة (لا DOM ولا تخزين ولا شبكة إلا ما تُمرَّر إليه)،
  صغيرة، بلا إشارةٍ إلى خدمةٍ مجالية ولا وحدة صفحة (R3 · R4)، ولها اختبارُ وحدةٍ في سياق vm (`tests/unit/utils_pure.test.mjs` · `client_engines.test.mjs`).
- **قاعدةُ عملٍ يتشاركها أكثرُ من صفحة** (الاحتياج · الأبواب · مصدرُ الشهر · رصدُ الميدان): خدمةٌ **مجالية** في `src/services/` (قائمة `DOMAIN` في deps_check) — لا تُستدعى من خدمةٍ منصّية.
- **منطقُ صفحةٍ واحدة**: في `src/modules/<وحدة>/logic.js`؛ وما يُحسب بلا واجهة (أرقامٌ · تحويلات) يُستخرج إلى خدمةٍ ويُختبر — فتبقى الصفحةُ رفيعة (SOT-105)؛ لا إطارَ جديد.
- **قرارُ صلاحيةٍ أو نطاق**: في الخادم وحده (ADR-034) — الواجهةُ تسأل `BassamPerm` وتعرض ما يصلها.

## 6) ما لا يُفعل
- Production (`kivo-d81.pages.dev` · D1 `bassam-db`) خارج التفويض: لا نشر ولا تعديل ولا ترحيل ولا تنظيف.
- لا تعديلَ اختبارٍ قائم لإخفاء إخفاق؛ التكييفُ يُعلَن (`CHANGELOG.md` · رأسُ الحزمة).
- لا أسرارَ في المستودع (`config/env.schema.json` أسماءٌ فقط).

## المراجع
`docs/architecture.md` · `docs/api.md` · `docs/security.md` · `docs/config.md` · `docs/design-system.md` · `docs/modules.md` · `docs/runbooks/*` · `docs/adr/*` · `docs/sot/*` (المرجعُ الرسمي).
