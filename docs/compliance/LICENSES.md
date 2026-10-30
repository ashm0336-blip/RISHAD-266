# التراخيص وقائمةُ المكوّنات (SBOM) — KIVO

المصدر: `tools/sbom.py` (CycloneDX 1.5 في `docs/compliance/sbom/`؛ هذا الملفُ مولَّد — لا يُحرَّر يدوياً). وقتُ التشغيل بلا اعتماديات npm: كلُّ ما يُشحن مضمَّنٌ في `client/` ومُعرَّفٌ ببصمته.

## ما يُشحن إلى المستخدم (runtime.cdx.json)

| المكوّن | الإصدار | الرخصة | الملفات | ملاحظة |
|---|---|---|---|---|
| react | 18.3.1 | MIT | core/010-react.js | react.production.min.js مضمَّن (UMD) — بلا تعديل |
| react-dom | 18.3.1 | MIT | core/020-react-dom.js | react-dom.production.min.js مضمَّن؛ يحمل مقطع Modernizr 3.0.0pre (MIT) |
| fflate | 0.8.3 | MIT | core/030-pages-loader.js | KIVO_261: السطرُ 5 من محمِّل الصفحات = umd/index.js من fflate@0.8.3 بايتاً (SHA-256 462ef8041fc970e3…؛ قورن بحزم npm ‏0.7.4–0.8.3) · في المصدر ووضع المونوليث وحدهما — البناءُ المنشور (الكسول) لا يشحنه (tools/build.py lazy_loader) |
| Cairo (variable font) | 3.130 | OFL-1.1 | assets/fonts/cairo-arabic.woff2 · assets/fonts/cairo-latin.woff2 · assets/fonts/cairo-latin-ext.woff2 | ثلاث شرائح يونيكود؛ مضمَّنةٌ محلياً — لا طلبَ خارجياً · الإصدارُ وحقُّ النسخ من جدول name في الخط · نصُّ الرخصة في THIRD-PARTY-NOTICES.txt |
| KIVO bullet glyph | 1.000 | proprietary | assets/fonts/cairo-bullet.woff2 | رمزٌ أصليٌّ رُسم لـKIVO (R188) لـU+2022 وحده — ليس من Cairo وإن حمل اسمَ عائلتها في CSS (جدول name: «Original glyph drawn for KIVO») |
| Almarai | 1.10 | OFL-1.1 | assets/fonts/almarai-800-arabic.woff2 · assets/fonts/almarai-800-latin.woff2 | الوزن 800 للأرقام/التقارير · الإصدارُ وحقُّ النسخ من جدول name · نصُّ الرخصة في THIRD-PARTY-NOTICES.txt |
| dc-runtime | KIVO_246+ | proprietary | core/050-dc-runtime.js | مكوّنٌ يُصان في المشروع (ADR-008): المصدرُ المقروء هنا هو المصدر؛ رأسُ الملف يذكر أنه وُلِّد أصلاً من مصادر TypeScript غيرِ موجودة في المستودع — سندُ الملكية/الترخيص يؤكّده المالك (docs/threat-model.md §4 بند 7) |
| kivo-worker | 2026.10.14-265 | proprietary | ../workers/_worker.js | عاملُ Cloudflare Pages المولَّد من workers/parts (ADR-009) |

لا رخصةَ copyleft (GPL/AGPL/LGPL) في ما يُشحن؛ React/ReactDOM بترخيص MIT، والخطوط OFL-1.1 (تضمينُها في الويب مسموحٌ بشرط عدم بيعها منفردة). نصوصُ الرخص كاملةً مع حقوق النسخ في `public/THIRD-PARTY-NOTICES.txt` المنشور مع كل إصدار (`/THIRD-PARTY-NOTICES.txt`) — لأن التصغيرَ يحذف رأسَ `@license` من ملفات React المشحونة. fflate (MIT) في المصدر وحده ولا يُشحن.

## أدواتُ البناء والاختبار (لا تُشحن)

- `tooling-root.cdx.json`: 118 مكوّناً — MIT: 90 · Apache-2.0: 14 · BSD-2-Clause: 6 · ISC: 5 · Python-2.0: 1 · MPL-2.0: 1 · BSD-3-Clause: 1

## البنية التحتية وأدواتٌ خارج npm

- Cloudflare Pages (Workers) · D1 · R2 — خاضعة لشروط Cloudflare؛ لا مكتباتٍ خارجية وقتَ التشغيل (CSP `default-src 'self'`).
- workerd (ضمن miniflare) Apache-2.0 · Playwright Apache-2.0 · Chromium BSD-3-Clause (اختبارٌ فقط) · Python 3 (المكتبة القياسية للبناء والأدوات) PSF-2.0.
- كودُ KIVO (كلُّ ما عدا المذكور أعلاه): ملكيةُ المالك.

## التحديث

`python3 tools/sbom.py --src k2NN/src` بعد كل مرشّح؛ الفحصُ في CI: `python3 tools/sbom.py --check` يعيد التوليد ويقارن (`runtime.cdx.json` يتغيّر مع بصمات الملفات).
