# src/assets — الأصولُ الثابتة (SOT-085 · KIVO_263)

> المعيار: «كل صورة static مضغوطة ومعلومة الاستخدام ولا تحتوي بيانات حساسة» — وفصلُ الأصول الثابتة عن رفعات المستخدمين.
> يفحصه `tools/assets_check.py` (في `check:263` والمستودع الرسمي): كلُّ ملفٍّ هنا مذكورٌ في هذا الجدول، ومستعمَلٌ في المصدر، وتحت سقف حجمه، وبلا بياناتٍ وصفية (EXIF/GPS/نصوص PNG).

| الملف | الاستعمال | الموضع |
|---|---|---|
| `images/favicon.svg` | أيقونةُ المتصفح (متّجهة) | `src/layouts/index.template.html` |
| `images/apple-touch-180.png` | أيقونةُ الشاشة الرئيسية في iOS | `src/layouts/index.template.html` |
| `images/icon-192.png` · `images/icon-512.png` | أيقوناتُ تطبيق الجوال (PWA) | `src/manifests/manifest.webmanifest.json` |
| `images/haramain-print.png` | ترويسةُ الطباعة الموحّدة (شعارُ الحرمين) | `src/blocks.json` · وحداتُ الطباعة |
| `fonts/cairo-*.woff2` · `fonts/almarai-800-*.woff2` | خطّا المنصة (Cairo · Almarai) مقسَّمَين بالنطاق — تراخيصُها في `public/THIRD-PARTY-NOTICES.txt` | `src/styles` |
| `icons/catalog.json` | فهرسُ الأيقونات (SVG نصاً) — `tools/icons.py` | `src/assets/icons/README.md` |

**ما ليس هنا**: صورُ المستخدمين (خرائطُ المواقع · صورُ المضبوطات · صورُ الموظفين) بياناتٌ لا أصول — تُرفع إلى الخادم `/api/img/` (D1 أو R2 · ADR-027)
ولا تُضمَّن في الحزمة أبداً.
