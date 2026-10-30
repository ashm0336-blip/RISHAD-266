# سياسةُ الاعتماديات والطرف الثالث — المورَّد مقابل المُدار بالحزم (SOT-090 · SOT-141) · KIVO_261

> **المتطلب** (`docs/sot/KIVO_MASTER_REQUIREMENTS_v6.csv`): SOT-090 «vendor/ أو dependencies policy — الطرف الثالث» — «أي كود طرف ثالث يجب أن يكون معروف المصدر والترخيص» · المطلوب: «حصر vendor المحلي مقابل package-managed dependencies» · القبول: «كل dependency/version/license/source موثق وقابل للتحديث» و«لا نسخ مجهولة المصدر». ومعه SOT-141 «SBOM + Dependencies + Licenses» — القبول: «لا dependency مجهولة أو license غير مقبول أو Critical CVE مفتوح»، وإجراءُ التدقيق: «تثبيت fflate وفحص CVE في CI».
> **المصادر**: `docs/compliance/LICENSES.md` و`docs/compliance/sbom/*.cdx.json` (CycloneDX 1.5 — يولّدهما `tools/sbom.py`) · `package.json` · `package-lock.json` · `cfbench/package.json` · `cfbench/package-lock.json` · `tools/sec/audit.py` (ومخرجُه `docs/security-audit.md`) · ADR-008 · ADR-012 · `docs/threat-model.md` (T12 و§4).
> **«قرارُ المالك»** = بندٌ لم يُحسم في المستودع؛ و«مقترح» = صياغةٌ تنتظر اعتماده.

## 1) المبدأ القائم
- **لا اعتمادياتِ npm وقتَ التشغيل**: «وقتُ التشغيل بلا اعتماديات npm: كلُّ ما يُشحن مضمَّنٌ … ومُعرَّفٌ ببصمته» (`docs/compliance/LICENSES.md`) · `kivo:no-runtime-npm-deps = true` (`runtime.cdx.json`) · و«لا CDN · لا خطوطَ خارجية» مع CSP `default-src 'self'` (`tools/sbom.py` · `docs/compliance/LICENSES.md`).
- **المشحونُ من الطرف الثالث مورَّدٌ في شجرة المصدر نفسِها** (`src/core/` · `src/assets/fonts/` — ADR-012)، لا في مجلد `vendor/`؛ وهويتُه بصمةُ SHA-256 في `runtime.cdx.json`.
- **أدواتُ البناء والاختبار وحدها تُدار بـnpm**، وأقفالُها مُلتزَمة، ولا يدخل منها شيءٌ في الحزمة. (عبارةُ التدقيق «لا package manifest للمنتج نفسِه (package.json في cfbench للمختبر فقط)» لا تطابق الشجرةَ الحالية: في الجذر اليوم `package.json` لأدوات البناء `devDependencies`؛ والمنتجُ ما زال بلا اعتمادياتِ تشغيل.)
- قواعدُ الاعتماد **الداخلية** بين الطبقات (R1–R4 · `tools/deps_check.py`) شأنٌ آخر — `docs/architecture.md`.

## 2) الجرد أ — ما يُشحن إلى المستخدم (مورَّد · `runtime.cdx.json`)
| المكوّن | الإصدار | الرخصة | الملف | المورّد · `purl` | البصمة (SBOM) | ملاحظةٌ أو فجوة |
|---|---|---|---|---|---|---|
| react | 18.3.1 | MIT | `src/core/010-react.js` | Meta · `pkg:npm/react@18.3.1` | (SBOM) | «react.production.min.js مضمَّن (UMD) — بلا تعديل» بحسب SBOM؛ ترويسةُ `@license React` في المصدر، ويحذفها التصغيرُ من الملف المشحون — فنصُّ الرخصة كاملاً في `public/THIRD-PARTY-NOTICES.txt` المنشور (KIVO_261) |
| react-dom | 18.3.1 | MIT | `src/core/020-react-dom.js` | Meta · `pkg:npm/react-dom@18.3.1` | `35f4f974…` | يحمل مقطع «Modernizr 3.0.0pre (Custom Build) \| MIT»؛ ترويسةُ `@license` محفوظة |
| fflate | **0.8.3** (KIVO_261) | MIT | السطرُ 5 من `src/core/030-pages-loader.js` | Arjun Barrett · `pkg:npm/fflate@0.8.3` | `462ef804…` (السطرُ وحده = `umd/index.js` من حزمة npm بايتاً) | حُدِّد الإصدارُ بمقارنة السطر بحزم npm ‏0.7.4–0.8.3 (مطابقٌ بايتاً لـ0.8.3 وحده). **لا يُشحن**: البناءُ المنشور (الكسول) يحذفه (`tools/build.py` `lazy_loader`)؛ يبقى في المصدر ووضع المونوليث للاختبار. صار يدخل فحصَ `audit.py` (إصدارٌ رقمي) |
| Cairo (متغيّر) | 3.130 | OFL-1.1 | `src/assets/fonts/cairo-{arabic,latin,latin-ext}.woff2` | The Cairo Project Authors (Google Fonts) | 3 بصمات | حقُّ النسخ ورابطُ OFL في جدول `name` (تحقّقٌ بـfontTools في KIVO_261)؛ نصُّ الرخصة الكامل في `public/THIRD-PARTY-NOTICES.txt` · `cairo-bullet.woff2` ليس من Cairo: «Original glyph drawn for KIVO (R188)» — مكوّنٌ مستقلٌّ في SBOM |
| Almarai 800 | 1.10 | OFL-1.1 | `src/assets/fonts/almarai-800-{arabic,latin}.woff2` | Boutros Fonts (Google Fonts) | بصمتان | حقُّ النسخ ورابطُ OFL في جدول `name` (تحقّقٌ في KIVO_261)؛ النصُّ الكامل في `public/THIRD-PARTY-NOTICES.txt` |
| dc-runtime | KIVO_246+ | proprietary | `src/core/050-dc-runtime.js` | KIVO | `3d61d449…` | رأسُ الملف: «كان مولَّداً من dc-runtime/src/*.ts (esbuild)؛ مصدرُ TypeScript غيرُ موجودٍ في المستودع، فمنذ KIVO_246 هذا الملفُ المقروء هو المصدرُ المُعتمَد» (ADR-008) — **قرارُ المالك**: تأكيدُ سند ملكيته وترخيصه (`docs/threat-model.md` §4 (7) · `docs/due-diligence.md` §1) |
| kivo-worker | من `src/core/270-bs-ver.js` | proprietary | `workers/_worker.js` | KIVO | `b6164d09…` (بناءُ 259) | مولَّدٌ من `workers/parts/*` (ADR-009) — بصمتُه تتبع كلَّ تغييرٍ في الأجزاء |

- **خارج SBOM (فجوة)**: الصورُ في `src/assets/images/` (`apple-touch-180.png` · `favicon.svg` · `haramain-print.png` · `icon-192.png` · `icon-512.png`) وفي `public/` (`favicon.ico` · `apple-touch-icon.png`)، وفهرسُ الأيقونات `src/assets/icons/catalog.json` (377 أيقونة؛ ADR-014 لا يذكر لأشكالها مصدراً ولا رخصة) — أصلُها وترخيصُها غيرُ مسجَّلين: **إفادةُ المالك**، ثم إدراجُها في SBOM أو إعلانُها ملكاً للمشروع.
- **بلا مكتبة**: قراءةُ xlsx وكتابتُه «self-contained … (no external libraries)» عبر `DecompressionStream` في المتصفح (`src/services/570-bassam-xlsx.js`).
- **البنيةُ التحتية**: Cloudflare Pages (Workers) · D1 · R2 «خاضعة لشروط Cloudflare» (`docs/compliance/LICENSES.md`) — خدماتٌ لا كودٌ مشحون.

## 3) الجرد ب — أدواتُ البناء والاختبار (مُدارةٌ بـnpm · لا تُشحن)
| الحزمة المباشرة | الإصدار المثبَّت | الرخصة (SBOM) | الملف | أين تُستعمل |
|---|---|---|---|---|
| acorn | 8.19.0 | MIT | `package.json` | `tools/ast_equal.mjs` · `engine_coverage.mjs` · `jsmin_tokens.mjs` · `kivo_ns.mjs` · `page_kit.mjs` · `wrap_long_lines.mjs` |
| axe-core | 4.10.3 | MPL-2.0 | `package.json` | `cfbench/a11y.mjs` (سقّاطةُ الإتاحة) |
| esbuild | 0.25.10 | MIT | `package.json` | `tools/generate.py` · `tools/page_modules.py` · `tools/gen_types.mjs` |
| eslint · globals | 9.39.1 · 16.4.0 | MIT · MIT | `package.json` | `npm run lint` · `eslint.config.mjs` |
| playwright | 1.64.0 | Apache-2.0 | `package.json` | حزمُ المتصفح في `cfbench/` |
| prettier | 3.6.2 | MIT | `package.json` | `tools/page_kit.mjs` · `tools/page_modules.py` |
| miniflare | 3.20250718.3 | MIT | `cfbench/package.json` | حزمُ التكامل في `cfbench/` (workerd · D1 بديل) |
| acorn · acorn-walk | 8.14.0 · 8.3.2 | MIT · MIT | `cfbench/package.json` | `cfbench/audit_*.mjs` |

- **الأقفال**: `package-lock.json` (118 حزمةً = مكوّناتُ `tooling-root.cdx.json`) و`cfbench/package-lock.json` (29 = `tooling-cfbench.cdx.json`)، كلاهما `lockfileVersion 3`.
- **التراخيص في الأدوات** (`docs/compliance/LICENSES.md`): الجذر — MIT 90 · Apache-2.0 14 · BSD-2-Clause 6 · ISC 5 · Python-2.0 1 (`argparse@2.0.1`) · MPL-2.0 1 (`axe-core@4.10.3`) · BSD-3-Clause 1؛ والمختبر — MIT 18 · Apache-2.0 6 · Unlicense 3 (`get-source` · `printable-characters` · `stacktracey`) · BSD-2-Clause 1 · BSD-3-Clause 1.
- **خارج npm**: workerd (ضمن miniflare) Apache-2.0 · Chromium عبر Playwright BSD-3-Clause «اختبارٌ فقط» · Python 3 «المكتبة القياسية» PSF-2.0 (`docs/compliance/LICENSES.md`) · `jsonschema` لفحص المخطّطات (`docs/developer.md`) · إجراءاتُ GitHub في `.github/workflows/ci.yml`.

## 4) التثبيت (Pinning)
- **القائم — npm**: إصداراتٌ دقيقة بلا `^` ولا `~` في الملفين · `engines.node >=22` · التثبيتُ بـ`npm ci --ignore-scripts` وحده (`docs/developer.md` §1 · `ci.yml`) فلا تعمل سكربتاتُ التثبيت. وفي `cfbench/package.json` تَرِد الحزمُ تحت `dependencies` (حزمةٌ مختبرية `private`) لا `devDependencies`.
- **القائم — Python**: CI يثبّت `jsonschema==4.26.0`، و`docs/developer.md` يكتب `pip install jsonschema` بلا إصدار، ولا ملفَّ متطلبات في الجذر.
- **القائم — المورَّد**: البصمةُ في SBOM؛ وأيُّ تغييرٍ في ملفٍّ مورَّد يكشفه `tools/sbom.py --check` (فرقٌ عن الملتزَم) وبرهانُ الفرق المعلن `tests/source/k2NNsrc.py` (يغطي `src/` · `workers/` · `public/` · `migrations/` · `config/` · `build/` · `tools/`).
- **القائم — GitHub Actions**: `actions/checkout@v4` · `actions/setup-node@v4` · `actions/setup-python@v5` · `actions/upload-artifact@v4` — بالوسم الرئيسي لا ببصمة الإيداع.
- **ملاحظاتُ اتساق**: `acorn` بإصدارين (8.19.0 في الجذر · 8.14.0 في المختبر) · رأسُ `package-lock.json` يحمل `"version": "249.0.0-dev"` و`package.json` يحمل `260.0.0-dev` (حقلٌ وصفيٌّ للحزمة الجذر).
- **قرارُ المالك**: تثبيتُ إجراءات GitHub ببصمة الإيداع · ملفُّ متطلباتٍ مثبَّت لـPython (`jsonschema==4.26.0` كما في CI) · توحيدُ `acorn`.

## 5) سياسةُ الترخيص
- **القائم** (KIVO_261): «لا رخصةَ copyleft (GPL/AGPL/LGPL) في ما يُشحن؛ React/ReactDOM بترخيص MIT، والخطوط OFL-1.1» — ونصوصُ الرخص كاملةً مع حقوق النسخ في `public/THIRD-PARTY-NOTICES.txt` الذي يُنشر مع كل إصدار (`/THIRD-PARTY-NOTICES.txt`)، و`tools/sbom.py` يُخفق إن غاب عنه مكوّنٌ مشحون أو نصُّ MIT/OFL. «كودُ KIVO: ملكيةُ المالك» — عدا سندِ `dc-runtime` (قرارُ المالك).
- **في الأدوات**: MPL-2.0 (`axe-core`) وPython-2.0 وUnlicense تُستعمل في البناء والاختبار ولا تدخل الحزمة.
- **مقترح — قرارُ المالك**: (1) ما يُشحن: MIT · BSD · ISC · Apache-2.0 · OFL-1.1 (للخطوط) · والملكية؛ وكلُّ copyleft (GPL · AGPL · LGPL · MPL) ممنوعٌ في الشحن إلا باستثناءٍ مكتوب من المالك · (2) الأدوات: أيُّ ترخيصٍ مفتوح بشرط ألّا يدخل الحزمة، ويُراجَع كلُّ ترخيصٍ جديد يظهر في عدّاد `docs/compliance/LICENSES.md` · (3) كلُّ مكوّنٍ مشحون يحمل إشعارَ ترخيصه في ملفّه أو بجانبه — ويبدأ ذلك بـ`fflate` ونصّ OFL للخطوط.

## 6) توليدُ SBOM وفحصُه (`tools/sbom.py`)
- `python3 tools/sbom.py --src src` يكتب: `runtime.cdx.json` (ما يُشحن ببصماته من المصدر الحيّ — وقائمةُ مكوّناته **مكتوبةٌ في الأداة** `rt`/`PATHS` لا تُكتشف آلياً) · `tooling-root.cdx.json` و`tooling-cfbench.cdx.json` (من القفلين بـ`npm sbom --sbom-format cyclonedx --package-lock-only`، مع حذف `serialNumber`/`timestamp` ليكون الناتجُ حتمياً) · ثم `docs/compliance/LICENSES.md`.
- `--check` يولّد في مجلدٍ مؤقت ويقارن الملتزَم ويُخفق على أيّ فرق — في CI (خطوةُ «SBOM = generated» في `ci.yml`) وفي `tools/release_check.py`؛ وفي المستودع الرسمي بلا `cfbench/` لا يُقارَن `docs/compliance/LICENSES.md` (يعدّ عُدّةَ المختبر) إلا في المستودع الانتقالي.
- **إضافةُ مكوّنٍ مورَّد أو ترقيتُه** = تعديلُ `rt` و`PATHS` في `tools/sbom.py` (الاسم · الإصدار · الرخصة · الملفات · `purl` · المورّد) ثم التوليد ثم `--check`.
- **KIVO_261**: يُولَّد SBOM للمرشّح عند رفع الإصدار (`kivo-worker` من `src/core/270-bs-ver.js`) ويُفحص `--check` في البوابة و`release_check` — كان الملتزَم في 260 يخصّ 259 فأخفقت حزمةُ `export_official` في بوابة 260 حتى أُعيد توليدُه.

## 7) التحديثُ وإيقاعُه
- **القائم**: لا إيقاعَ مكتوب؛ أيُّ تحديثٍ يدخل مرشّحاً (فرعٌ لكل مرشّح · `CHANGELOG.md` · البوابةُ الكاملة) كأيّ تعديلٍ في المصدر (`docs/developer.md` §5).
- **مقترحُ الإجراء** (بأدوات المستودع نفسِها): 1) جلبُ المكوّن من مصدره الرسمي بإصدارٍ دقيق مع إشعار ترخيصه · 2) وضعُه في موضعه من `src/` · 3) تحديثُ `tools/sbom.py` · 4) `tools/sbom.py` ثم `--check` · 5) الفرقُ المعلن (`tests/source/k2NNsrc.py` · `k2NNdiff.json`) و`CHANGELOG.md` · 6) البوابةُ الكاملة و`tools/release_check.py` · 7) موافقةُ المالك لأيّ مكوّنٍ مشحونٍ جديد.
- **قرارُ المالك**: الإيقاع — مقترح: مراجعةُ النشرات عند كل مرشّح · ترقيةُ الأدوات دورياً أو عند نشرةٍ عالية · ولا ترقيةَ رئيسية لما يُشحن (React 18.3.1) بلا ADR وبوابةٍ كاملة.

## 8) نشراتُ الأمان (Advisories)
- **القائم**: `tools/sec/audit.py` (SOT-165) يشغّل `npm audit --json` على الجذر و`cfbench`، وعلى ما يُشحن من npm بإصدارٍ دقيق (حزمةٌ مؤقتة تحوي `react` و`react-dom` ثم `npm audit`)؛ والحكمُ PASS ⇔ لا ثغرةَ حرجة/عالية في ما يُشحن، وثغراتُ الأدوات «تُعدّ وتُصنَّف (لا تُشحن ولا تعمل في Cloudflare)». المخرج: `docs/security-audit.md` و`reports/security_audit.json`.
- **آخرُ تشغيل** (2026-10-11 · `pk259`): ما يُشحن `{}` · أدواتُ الجذر `{}` · المختبر `{"moderate": 1, "high": 3}` — `@fastify/busboy` · `undici` · `ws` · `miniflare`، والإصلاحُ الذي يقترحه npm ترقيةُ `miniflare` إلى `5.20261006.1-alpha` (إصدارٌ رئيسي).
- **الفجوات**: الفحصُ ليس في CI (`docs/threat-model.md` T12 و§4 (5)) · يحتاج شبكةً إلى سجلّ npm · الخطوطُ و`dc-runtime` خارج قواعد npm. (أُغلقت في KIVO_261: إصدارُ `fflate` صار رقمياً فيدخل الفحص.)
- **قرارُ المالك**: ترقيةُ `miniflare` في المختبر أو قبولُ الخطر · إدراجُ الفحص في CI (بعد دفع المستودع إلى GitHub).

## 9) من يوافق
- **المالكُ في المرجع**: SOT-090 «Engineering» · SOT-141 «Engineering/Product» (عمود `owner` في `KIVO_MASTER_REQUIREMENTS_v6.csv`).
- **القائم**: Preview بعد البوابة و`release_check` (`docs/runbooks/preview-deploy.md`)؛ وProduction «بقرارٍ صريح من المالك» (`docs/runbooks/production-release.md`).
- **قرارُ المالك** (مقترح): الهندسةُ تقترح بالأدلة (SBOM · `audit.py` · البوابة) والمالكُ يعتمد كلَّ مكوّنٍ مشحونٍ جديد أو ترقيةٍ رئيسية أو استثناءِ ترخيص.

## 10) سجلُّ البنود المعلّقة
| البند | الحالة | المرجع |
|---|---|---|
| سندُ ملكية `dc-runtime` وترخيصُه | قرارُ المالك | `docs/threat-model.md` §4 (7) · `docs/due-diligence.md` §1 و§6 · `STATE.md` |
| إصدارُ `fflate` وإشعارُ MIT في نسخته المضمَّنة | **أُغلق في KIVO_261** (0.8.3 · لا يُشحن · الإشعارُ في THIRD-PARTY-NOTICES وLICENSES) | SOT-141 · §2 |
| نصُّ رخصة OFL مع الخطوط | يحتاج تحقّقاً | §2 |
| أصلُ الصور وأشكالِ فهرس الأيقونات وترخيصُها | إفادةُ المالك | §2 |
| فحصُ الثغرات في CI · دفعُ CI إلى GitHub | قرارُ المالك | `docs/threat-model.md` T12 · ترويسةُ `ci.yml` |
| ترقيةُ `miniflare` (ثغراتُ العُدّة) | قرارُ المالك | `docs/security-audit.md` |
| إيقاعُ التحديث وسياسةُ الترخيص المكتوبة (§5 · §7) | قرارُ المالك | هذا الملف |
| مجلدُ `vendor/` مستقلٌّ أم البقاءُ في شجرة `src/` | قرارُ المالك (اليوم: شجرةُ `src/` — ADR-012) | SOT-090 |
| تثبيتُ إجراءات GitHub بالبصمة · ملفُّ متطلبات Python · توحيدُ `acorn` | قرارُ المالك | §4 |
| توليدُ SBOM للمرشّح الحالي | **أُغلق** (يُولَّد مع كل رفع إصدار ويُفحص في البوابة) | §6 |
