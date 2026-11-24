# src/assets — الأصولُ الثابتة (SOT-085 · KIVO_263)

> المعيار: «كل صورة static مضغوطة ومعلومة الاستخدام ولا تحتوي بيانات حساسة» — وفصلُ الأصول الثابتة عن رفعات المستخدمين.
> يفحصه `tools/assets_check.py` (في `check:263` والمستودع الرسمي): كلُّ ملفٍّ هنا مذكورٌ في هذا الجدول، ومستعمَلٌ في المصدر، وتحت سقف حجمه، وبلا بياناتٍ وصفية (EXIF/GPS/نصوص PNG).

| الملف | الاستعمال | الموضع |
|---|---|---|
| `images/favicon.svg` | أيقونةُ المتصفح (متّجهة) | `src/layouts/index.template.html` |
| `images/apple-touch-180.png` | أيقونةُ الشاشة الرئيسية في iOS | `src/layouts/index.template.html` |
| `images/icon-192.png` · `images/icon-512.png` | أيقوناتُ تطبيق الجوال (PWA) | `src/manifests/manifest.webmanifest.json` |
| `images/haramain-print.png` | ترويسةُ الطباعة الموحّدة (شعارُ الحرمين) | `src/blocks.json` · وحداتُ الطباعة |
| `images/report-cover.jpg` | غلافُ التقرير (الصفحةُ الأولى في ملف PDF): ملفُّ تصميم المالك الأصلي كما في البرودكشن — الخلفيةُ والأشكالُ والشعاران، والنصوصُ ترسمها المنصة. لا يُحمَّل إلا عند صنع الملف · سقفٌ مسمّى في `tools/assets_check.py` (V7 · 53) | `src/systems/_shared/print/566-print-core.js` |
| `vendor/html2canvas-1.4.1.min.js` | رسّامُ صفحات PDF على أجهزة أبل (سفاري يرسم صورةَ الصفحة SVG foreignObject ناقصةً أو يمنع قراءةَ لوحتها) — `dist/html2canvas.min.js` من حزمة npm ‏1.4.1 بايتاً. لا يُحمَّل إلا حين يلزم؛ رخصتُه (MIT) في `public/THIRD-PARTY-NOTICES.txt` (V7 · 53) | `src/systems/_shared/print/566-print-core.js` |
| `fonts/cairo-*.woff2` · `fonts/almarai-800-*.woff2` | خطّا المنصة (Cairo · Almarai) مقسَّمَين بالنطاق — تراخيصُها في `public/THIRD-PARTY-NOTICES.txt` | `src/styles` |
| `icons/catalog.json` | فهرسُ الأيقونات (SVG نصاً) — `tools/icons.py` | `src/assets/icons/README.md` |

**ما ليس هنا**: صورُ المستخدمين (خرائطُ المواقع · صورُ المضبوطات · صورُ الموظفين) بياناتٌ لا أصول — تُرفع إلى الخادم `/api/img/` (D1 أو R2 · ADR-027)
ولا تُضمَّن في الحزمة أبداً.
