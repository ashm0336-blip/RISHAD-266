# التدقيقُ الأمني النهائي — SOT-165

> مولَّدٌ بـ`python3 tools/sec/audit.py` من الأدلة (الحزمة `pk262` · سجلاتُ البوابة · سجلُّ تحقق Preview) — 2026-10-12.

**الحكم: PASS** — كلُّ الأقسام ①–⑥ ناجحة ولا ثغرةَ حرجة/عالية في ما يُشحن.

## ① الأسرار — ✔

✔ مسحُ الأسرار: 4107 ملفاً متتبَّعاً + 137 ملفاً في pk262 — 0 اكتشاف في المصدر الرسمي والعُدّة والحزمة · للعلم في أجيال المختبر: {"pw-hash": 48}

## ② الاعتماديات — ✔

ما يُشحن (react@18.3.1, react-dom@18.3.1, fflate@0.8.3 — npm advisories: {} · وبقيةُ SBOM runtime: Cairo (variable font)@3.130, KIVO bullet glyph@1.000, Almarai@1.10, dc-runtime@KIVO_246+, kivo-worker@2026.10.12-262) · أدواتُ التطوير/الاختبار (لا تُشحن): root (أدواتُ البناء والفحص) {} · cfbench (عُدّةُ الاختبار المحلي) {"moderate": 1, "high": 3, "total": 4}

| النطاق | الحزمة | الخطورة | المصدر | الإصلاح |
|---|---|---|---|---|
| cfbench (عُدّةُ الاختبار المحلي) | @fastify/busboy | high | @fastify/busboy vulnerable to Denial of Service via prototype-named multipart part header؛ @fastify/busboy vulnerable to | {'name': 'miniflare', 'version': '5.20261006.1-alpha', 'isSe |
| cfbench (عُدّةُ الاختبار المحلي) | miniflare | moderate | undici؛ ws | {'name': 'miniflare', 'version': '5.20261006.1-alpha', 'isSe |
| cfbench (عُدّةُ الاختبار المحلي) | undici | high | @fastify/busboy؛ Undici has an unbounded decompression chain in HTTP responses on Node.js Fetch API via Content-Encoding | {'name': 'miniflare', 'version': '5.20261006.1-alpha', 'isSe |
| cfbench (عُدّةُ الاختبار المحلي) | ws | high | ws: Uninitialized memory disclosure؛ ws: Memory exhaustion DoS from tiny fragments and data chunks | {'name': 'miniflare', 'version': '5.20261006.1-alpha', 'isSe |

## ③ اختباراتُ الأمن في الوحدة (15 ملفاً على عامل الحزمة) — ✔

# pass 62 · # fail 0

## ④ حزمُ الأمن في البوابة (23 حزمة · 2049 تأكيداً) — ✔

مخفقة: 0

| الحزمة | نجح | أخفق | السجل |
|---|---|---|---|
| R194 ربطُ الحرّاس: المصنِّفُ على الـ73 (Node) | 140 | 0 | reports/k262/gate_262_run1.txt |
| R195 ربطُ الحرّاس: المصنِّفُ على الـ71 (Node) | 178 | 0 | reports/k262/gate_262_run1.txt |
| R196 ربطُ الحرّاس — مصنِّفُ Phase 3 على الـ71 (Node) | 184 | 0 | reports/k262/gate_262_run1.txt |
| R197 ربطُ الحرّاس على v24.4 — المصنِّفُ كما هو (Node) | 184 | 0 | reports/k262/gate_262_run1.txt |
| R198 ربطُ الحرّاس على v24.5 — المصنِّفُ كما هو (Node) | 189 | 0 | reports/k262/gate_262_run1.txt |
| التفويض | 46 | 0 | reports/k262/gate_262_run1.txt |
| إحكام النواة | 94 | 0 | reports/k262/gate_262_run1b.txt |
| الكسر العدائي | 60 | 0 | reports/k262/gate_262_run1.txt |
| ملكية الصور — العدائي | 31 | 0 | reports/k262/gate_262_run1.txt |
| الأمن | 42 | 0 | reports/k262/gate_262_run1.txt |
| حدُّ المعدّل وقفلُ الدخول | 15 | 0 | reports/k262/gate_262_run1.txt |
| ذاكرةُ صور الجلسة | 23 | 0 | reports/k262/gate_262_run1.txt |
| سلامةُ البيانات تحت الأداء | 13 | 0 | reports/k262/gate_262_run1.txt |
| KIVO_242 G7 CSP والبيان · الفروقُ المعلنة | 18 | 0 | reports/k262/gate_262_run1.txt |
| KIVO_243 المصفوفة — 242 ↔ 243 legacy ↔ بلا ENV ↔ enforce (ناقلان) | 502 | 0 | reports/k262/gate_262_run1b.txt |
| KIVO_243 الواجهةُ في وضع الإنفاذ (متصفح)النتيجة: 27 نجاح · 0 إخفاق | 27 | 0 | reports/k262/gate_262_run1.txt |
| KIVO_244 RM-1 وحدة: fail-closed · قيدُ المضيف · TTL · pingالنتيجة: 202 نجاح · 0 إخفاق | 202 | 0 | reports/k262/gate_262_run1.txt |
| KIVO_244 AUD-003 قائمةُ مفاتيح المزامنة (متصفح) | 8 | 0 | reports/k262/gate_262_run1.txt |
| KIVO_244 AUD-006 مسبارُ XSS المخزَّن — 29 شاشة (متصفح) | 11 | 0 | reports/k262/gate_262_run1.txt |
| KIVO_253 AUD-008/SOT-048 المنطقُ المُصرَّف مسبقاً · CSP بلا unsafe-eval (متصفح) | 19 | 0 | reports/k262/gate_262_run1.txt |
| KIVO_255 SOT-050/151 الجلسةُ الطويلة — 30 دورة × 15 شاشة · الكومة/العقد/المستمعون (متصفح) | 7 | 0 | reports/k262/gate_262_run1.txt |
| KIVO_259 SOT-167 رحلاتُ P0 بالنقر بأدوارٍ حقيقية — الجلسة · المهام · التقرير اليومي · 14 ص | 26 | 0 | reports/k262/gate_262_run1.txt |
| KIVO_260 SOT-167 رحلاتُ P0 (الجزءُ الثاني) — الغيابُ والاعتمادُ وإغلاقُ اليوم · تجميدُ الح | 30 | 0 | reports/k262/gate_262_run1.txt |

## ⑤ Preview (verify_262_preview_2026-10-12.json) — ✔

CSP nonce لكل طلب · بلا unsafe-inline/eval · nosniff · HSTS · 401 بلا جلسة · ping بلا أعداد

## ⑥ نموذجُ التهديد — ✔

✔ ★ نموذجُ التهديد: كلُّ اختبارٍ مثبِتٍ مُشارٍ إليه (58) موجودٌ في العُدّة   ← []

## ⑦ بنودُ المرجع الأمنية غيرُ المكتملة

10 بنداً

| البند | العنوان | الأولوية | الحالة | التالي |
|---|---|---|---|---|
| SOT-009 | Default Deny | P0 | جزئي | تغطية أنواع فشل D1 وedge cases قبل Production. |
| SOT-125 | security/ — سياسات وأدوات أمنية مشتركة | P0 | جزئي | فصل CSP/origin/rate-limit/security helpers/threat docs حسب التقنية. |
| SOT-135 | Threat Model شامل | P0 | جزئي | ربط الأصول والتهديدات والضوابط بالاختبارات. |
| SOT-136 | Privilege Escalation Adversarial Tests | P0 | جزئي | اختبار تعديل payload/session/route/module state. |
| SOT-137 | Session Lifecycle / Stale Session | P0 | جزئي | اختبار expiry/logout/role change/department change. |
| SOT-140 | Secrets Lifecycle | P0 | جزئي | توثيق storage/access/rotation/revocation. |
| SOT-173 | Preview — تعطيل أداة TEST_ONLY بعد الاختبارات | P0 | غير منفذ | إلغاء متغير أداة الاختبار عند انتهاء الحاجة، ثم تنفيذ reset آمن بعد حفظ المخرجات. |
| SOT-192 | لا نقل Production قبل Security Hardening وAlignment | P0 | غير منفذ | إجراء Alignment Audit شاملاً ثم خطة مرحلة مستقلة لإغلاق المخاطر. |
| AUD-044 | تفعيلُ حساب الموظف تلقائياً: اسمُ المستخدم رقمُ الهوية (أو ا | P1 | معلّق بقرار |  |
| AUD-049 | حارسُ الدخول على المصدر والزوج بلا سقفٍ لكل حساب — تخمينٌ مو | P1 | جزئي | نُفّذ قرار المالك (v7-C Issue 2): إنذار · تناقص · إبطاء مطفأ (thrOn)؛ الباقي سياسة الكلمة |

## Production (منفصلة — لا تُمسّ قبل الاعتماد النهائي)

- KIVO_242 منشورة. ثغرةُ AUD-033 (بصماتُ كلمات المرور لغير مدير النظام عبر denied/conflicts.cur) **قائمةٌ فيها** حتى يُنشر الإصلاح:
  حزمةُ `hotfix/KIVO_242_HOTFIX_AUD033/` جاهزةٌ غيرُ منشورة، والمرشّحُ الحالي يحمل الإصلاح. بعد أيّ نشرٍ معتمد: **تدويرُ كلمات المرور** (البصماتُ ربما كُشفت).

