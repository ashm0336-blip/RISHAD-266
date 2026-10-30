# سجلُّ القرارات المعمارية (ADR) — الفهرس

> مولَّدٌ من رؤوس الملفات بـ`tools/adr_index.py` (لا يُحرَّر يدوياً) · `--check` في البوابة. الصيغة: [ADR-000](ADR-000-record-format.md).

| القرار | العنوان | الحالة | آخرُ تحديث | البنود |
|---|---|---|---|---|
| [ADR-000](ADR-000-record-format.md) | صيغة سجل القرارات المعمارية | معتمد | — | — |
| [ADR-001](ADR-001-candidate-over-frozen-baseline.md) | كل تطوير مرشّحٌ (Candidate) مستقل فوق أساس مجمَّد | معتمد (قائم منذ KIVO_242؛ مسجَّل هنا) | — | SOT-001 · SOT-073 · SOT-075 |
| [ADR-002](ADR-002-enforcement-decision-env-and-d1.md) | قرار الإنفاذ = ENV ∧ D1، وتركيب الحكم deny > unknown > allow | معتمد (KIVO_243) | — | SOT-008 · SOT-009 · SOT-032 · SOT-033 |
| [ADR-003](ADR-003-fail-closed-on-d1-read-failure.md) | fail-closed عند تعذّر قراءة وضع الإنفاذ من D1 (مع إبقاء مفتاح الإيقاف المقصود) | معتمد | — | AUD-001 · SOT-172 |
| [ADR-004](ADR-004-test-fixture-api-host-guard-ttl.md) | أداة الاختبار الداخلية مقيَّدة بالمضيف وبعمر جلسة قصير وبكنس دفاعي | معتمد | — | AUD-002 · SOT-173 · SOT-183 · SOT-184 · SOT-186 |
| [ADR-005](ADR-005-json-is-the-official-sot.md) | JSON هو المصدر الرسمي للمتطلبات؛ HTML وCSV مخرجات مولَّدة | معتمد | — | SOT-076 · SOT-128 · SOT-192 |
| [ADR-006](ADR-006-repo-at-lab-root-then-restructure.md) | المستودع عند جذر المختبر الآن، وإعادة الهيكلة إلى الشجرة المستهدفة تدريجياً ببرهان | معتمد | — | AUD-028 · AUD-029 · SOT-080 · SOT-136 |
| [ADR-007](ADR-007-source-recovery-strategy.md) | استعادة مصادر الصفحات المضغوطة وdc-runtime | مقترح للتنفيذ في RM-2 | نُفِّذ — dc-runtime مصدرٌ مقروء ومنطقُ الصفحات مُصرَّف (ADR-008 · KIVO_246) · الصفحاتُ الثماني المضغوطة صارت مصادرَ مقروءة ببرهان تساوي الناتج (AUD-007 · KIVO_256/257 · ADR-016) | AUD-007 · AUD-008 · SOT-049 · SOT-050 · SOT-051 |
| [ADR-008](ADR-008-dc-runtime-source-and-precompiled-logic.md) | dc-runtime: الملف المقروء هو المصدر، ومنطق الصفحات مُصرَّف مسبقاً (CSP بلا unsafe-eval) | معتمد | — | AUD-006 · AUD-008 · SOT-048 |
| [ADR-009](ADR-009-derived-files-single-source.md) | الملفات المشتقّة داخل المصدر تُولَّد من مصدر واحد وتُفحص في CI (السجل · الخادم · الصفحات) | معتمد | — | AUD-007 · AUD-011 |
| [ADR-010](ADR-010-page-manifest-single-source.md) | manifest واحد للصفحات يغذّي الواجهة والخادم (AUD-015) | معتمد | — | AUD-015 · SOT-003 · SOT-004 |
| [ADR-011](ADR-011-numbered-migrations-schema-version.md) | ترحيلاتٌ مرقَّمة وschema_version بدل DDL على كل بدء (AUD-022) | معتمد | — | AUD-022 · SOT-107 · SOT-134 |
| [ADR-012](ADR-012-target-source-tree.md) | الشجرةُ المستهدفة في جذر المستودع (SOT-080 · SOT-081 · SOT-082 · SOT-083 · SOT-086/087 · SOT-092 · SOT-095–099 · SOT-106 · SOT-107 · SOT-114 · SOT-119 · SOT-123) | معتمد | — | SOT-080 · SOT-081 · SOT-082 · SOT-083 · SOT-086 · SOT-092 · SOT-095 · SOT-106 · SOT-107 · SOT-114 · SOT-119 · SOT-123 |
| [ADR-013](ADR-013-structured-logs-request-id-error-policy.md) | سجلٌّ منظَّم ومعرّفُ طلبٍ وسياسةُ أخطاء (SOT-142 · SOT-144 · AUD-021) | معتمد | — | AUD-021 · SOT-142 · SOT-144 |
| [ADR-014](ADR-014-icon-catalog.md) | منظومةُ الأيقونات: فهرسٌ واحد يُركَّب عند البناء (AUD-018 · SOT-084 · SOT-152) | معتمد | — | AUD-018 · SOT-084 · SOT-152 |
| [ADR-015](ADR-015-v24-permission-tree-ui.md) | شجرةُ صلاحيات الموظف وسقفُ الإدارة على شجرة v24.9 (SOT-003 · SOT-004 · SOT-005 · SOT-010 · SOT-015) | معتمد | — | SOT-003 · SOT-004 · SOT-005 · SOT-010 · SOT-015 |
| [ADR-016](ADR-016-structure-split-kit-minify.md) | هندسةُ المصدر بلا تغييرٍ سلوكي: التقسيمُ بالمسؤولية · سماتُ الصفحات · التصغيرُ الحافظ للرموز (AUD-010 · AUD-012 · AUD-014 · AUD-007 · AUD-024) | معتمد | — | AUD-007 · AUD-010 · AUD-012 · AUD-014 · AUD-024 |
| [ADR-017](ADR-017-public-namespace-and-print-core.md) | واجهةٌ عامة واحدة `window.KIVO` بطبقة توافقٍ خلفي · ونواةُ طباعةٍ مشتركة بخياراتٍ صريحة (AUD-016 · AUD-013) | معتمد | — | AUD-013 · AUD-016 |
| [ADR-018](ADR-018-lens-plugins.md) | العدساتُ إضافاتٌ بـmanifest: المفاتيح · الموارد · الحرّاس · الاختبارات (AUD-030 · SOT-089 · SOT-069) | معتمد | — | AUD-030 · SOT-069 · SOT-089 |
| [ADR-019](ADR-019-page-view-model-pattern.md) | نمطُ الصفحة: نموذجُ عرضٍ (view-model) فوق وقت التشغيل dc-runtime + قالبٌ مربوط + مزيجاتُ عُدّة الصفحات (SOT-105) | معتمد | — | SOT-105 |
| [ADR-020](ADR-020-official-repository-structure.md) | البنيةُ الرسمية للمستودع: 15 مدخلاً في الجذر، والمختبرُ خارجها (AUD-029) | معتمد | — | AUD-029 |
| [ADR-021](ADR-021-save-revision-guard.md) | حارسُ النسخة في الحفظ: مقارنةٌ ومبادلةٌ لكل مجموعة مفاتيح في معاملةٍ واحدة (SOT-150 · SOT-166 · AUD-047) | معتمد | — | AUD-047 · SOT-150 · SOT-166 |
| [ADR-022](ADR-022-login-lock-under-concurrency.md) | قفلُ الدخول تحت التزامن: حجزٌ ذرّي · قفلٌ مؤقّت عند الحجز · قفلٌ كاملٌ متضاعف عند الإخفاق المؤكَّد (SOT-168 · SOT-150 · AUD-049) | معتمد | — | AUD-049 · SOT-150 · SOT-168 |
| [ADR-023](ADR-023-credential-minimisation.md) | تقليلُ بيانات الاعتماد المغادرة للخادم: لا بصمات كلمات مرور أبداً · والرقمُ الوظيفي لصاحبه ومدير النظام وحدهما (AUD-033 · SR-1 · SR-8) | معتمد | — | AUD-033 |
| [ADR-024](ADR-024-tree-matches-rendered-platform.md) | الشجرةُ = المنصةُ المرسومة: لوحاتُ «مؤشرات الإدارة» أوراقٌ «خارج الصفحة» · وتبويباتُ الحاوية بصلاحية المستخدم (SOT-003 · SOT-010) | معتمد | — | SOT-003 · SOT-010 |
| [ADR-025](ADR-025-health-readiness-and-longpoll-cap.md) | النبضُ يفرّق الحيَّ من الجاهز · وانتظارُ التغييرات محدود (SOT-145 · AUD-050 · SR-5) | معتمد | — | AUD-050 · SOT-145 |
| [ADR-026](ADR-026-data-scope-unknown-means-deny.md) | نطاقُ البيانات في الإنفاذ: السقفُ غيرُ المهاجر «مجهول» يُرفض — لا تخمينَ لسقوف الإدارات (SOT-015 · SOT-098 · SOT-188 · SOT-189) | معتمد | — | SOT-015 · SOT-098 · SOT-188 · SOT-189 |
| [ADR-027](ADR-027-image-storage-d1-r2-and-ownership.md) | الصور: نصُّ data URL في D1 (أو R2 إن رُبطت) · رفعٌ مقطَّع ذرّي · ملكيةٌ ثابتة واستعمالٌ منفصل (SOT-068 · SOT-139 · AUD-019) | معتمد | — | AUD-019 · SOT-068 · SOT-139 |
| [ADR-028](ADR-028-design-tokens-two-layers.md) | رموزُ التصميم طبقتان: بدائيةٌ ودلالية · والأسماءُ الحرفية القديمة مستعارةٌ على الدلالية (AUD-017 · SOT-152 · SOT-088) | معتمد | — | AUD-017 · SOT-088 · SOT-152 |
| [ADR-029](ADR-029-data-scope-ui-and-enforce-on-preview.md) | سقفُ النطاق يُحسم من الواجهة · والإنفاذُ مفعَّلٌ على Preview بأمر المالك (SOT-014 · SOT-015 · SOT-188 · ADR-026) | معتمد | — | SOT-014 · SOT-015 · SOT-188 |
| [ADR-030](ADR-030-password-hash-format-guard.md) | بصمةُ كلمة المرور الجديدة بصيغة PBKDF2 وحدها لغير مدير النظام (تصليب · المراجعة المعمارية KIVO_262) | معتمد | — | — |
| [ADR-031](ADR-031-first-plan-bootstrap.md) | الخطةُ الأولى لإدارةٍ بلا خطةٍ ولا سقف: مديرُ النظام وحده (SOT-188 · KIVO_263) | معتمد | «الفارغة» = لا موقعَ ولا عنصر · محتوى الأشهر والطوابق المضافة/المحذوفة يُقيَّم في الإنفاذ (قرارُ المالك) | SOT-188 |
| [ADR-032](ADR-032-request-body-schemas.md) | مخطّطاتُ أجسام الطلبات المغيِّرة مصدرٌ واحد يفرضه الخادم (SOT-101 · KIVO_263) | معتمد | — | SOT-101 |
| [ADR-033](ADR-033-mandatory-suites.md) | غيابُ أيّ اختبارٍ إلزامي إخفاقٌ للبوابة لا تخطٍّ (KIVO_263) | معتمد | استثناءُ «غيرُ إلزامي بقرار المالك» (R185) · الاستئنافُ مربوطٌ ببصمة المرشّح | — |
| [ADR-034](ADR-034-single-scope-engine.md) | محرّكُ نطاقٍ واحد في الخادم والواجهةُ تستهلك قراره (SOT-098 · KIVO_263) | معتمد | — | SOT-098 |
| [ADR-035](ADR-035-full-restore-super-only.md) | الاستعادةُ الشاملة لمدير النظام وحده · واستعادةُ الإدارة بمنحٍ صريحٍ لـ`backup.restore` (SOT-190 · KIVO_263) | معتمد | — | SOT-190 |
| [ADR-036](ADR-036-production-package-without-test-tool.md) | حزمةُ الإنتاج بلا أداة الاختبار كوداً · وحزمةُ رفعٍ للإنتاج غيرُ حزمة Preview (SOT-173 · KIVO_263) | معتمد | تحقّقُ `prod_strip` يوازن العاملَ بنزع عامل المرشّح الحالي ويرفض الملفَّ الزائد (إعادةُ التدقيق · N4) | SOT-173 |
