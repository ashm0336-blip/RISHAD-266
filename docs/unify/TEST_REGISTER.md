# سجل الاختبارات الفاشلة المتبقية — RISHAD-266 claude/unify-266

## الحالة الحالية (المرشّح بعد معالجة الأسباب المشتركة · 2026-11-03)
- الأمر نفسه (317 ملفاً · 3 بالتوازي) + ملفات Python الثلاثة. الحصيلة: **2225 نجاحاً · 11 إخفاقاً · 0 ملغى في 7 ملفات** (كانت 1735 · 471 · 22 في 87 ملفاً).
- المقارنة بالأسماء: **لا اختبار يفشل الآن إلا وكان في سجل 68893bc** (صفر إخفاق جديد). البوابة check:265 19/19 + الأسرار 0 · الوثائق 17/17 · العامل gz 455343 / 460000 (لم يُرفع سقف).
- `operational_delete_sqlite.py` ليس اختباراً مستقلاً: مساعدٌ يقرأ من stdin ويستدعيه operational_delete_atomic.test.mjs (4/0).

### كيف أُغلقت الـ460 (بالسبب المشترك)
| السبب | ما أُصلح | التصنيف |
|---|---|---|
| تجهيزات المخطط 9 | تأكيد المخطط 10 · تحويلٌ تشغيلي حقيقي (installOperationalFixture/adoptOperationalFixture) في irshad_domain_fx · seized_fx · award_domain · custody_review_fx · custody_scenarios_fx · business_atomic_fx | تجهيز قديم |
| موارد تشغيلية تُقرأ/تُكتب كـKV | /api/operations/read وغلاف العمليات (requestId · epoch · base) · مفتاح KV عادي (bassam_last_export_v1) حيث موضوعُ الاختبار مسارُ KV | تجهيز قديم |
| نسخ احتياطية v3 | بيان v4 بمجال operations؛ القيم المنمّطة تُرمَّز كما في 019t ولا تُسقط صامتة | تجهيز قديم |
| أدوات واجهة بلا خدمة العمليات | خدمة operations في التجهيز بعقد القراءة الحقيقي (قراءة غير مُحمَّلة ⇒ operations-read-required) | تجهيز قديم |
| دوالّ مستخرجة ناقصة | _businessBaseValid · rsResetRoute · dataReady/ensureData · قواعد seized/awards في الجرد | مدخل اختبار مفقود |
| سقف النطاق القديم (Shift/Site) | توقعات المصفوفة والاستعلام بعد التقاعد مع الاستشهاد (74554f6 · 061-enf-read.js:3 · docs/architecture.md:114) | متطلب متقاعد |
| أعطال فعلية في التطبيق | (1) نقل موظف مأذون يُرفض بمراجع يولّدها الخادم (019e) · (2) دمج استعادةٍ في إدارة جديدة ⇒ restore-operations-empty (019t) · (3) غياب صف meta rev ⇒ TypeError 500 (019r · 019n) · (4) جولة D1 زائدة في «سجلّي» (019r) · (5) «تُعاد المحاولة تلقائياً» كاذبة بعد انتهاء الجلسة (profile) · (6) أداة لقطة D1 ترفض شجرة ops_nodes (snapshot_local.py) | عطل فعلي — أُصلح |
- كلُّ تعديل اختبار راجعه مراجعٌ مضاد مستقل؛ ما وجده (تأكيدٌ نُقل لحارس آخر · مفتاحٌ منمّط يُسقط صامتاً · فحصُ قراءةٍ تكراري · شروطٌ مسبقة غير مؤكَّدة) أُصلح وأُعيدت مراجعته.

### المتبقي (11) — مفتوح بسببه
| الملف | الاختبار | السبب | التصنيف |
|---|---|---|---|
| atomic_restore_review | 13,006 حساباً في دفعة استعادة ≤100 عبارة | 112 عبارة (كانت 192 قبل تجميع حراس 019r). الفائض موزّع خارج 019r (preimage · شهود kv · revGuard 054 · حراس العهد والتنبيهات) | عطل أداء — مفتوح |
| business_atomic | 11 · الميزانية نفسها | 111 عبارة، السبب نفسه | عطل أداء — مفتوح |
| custody_mixed_compile_guard | 2 · 3 (الحفظ الجزئي) | الموارد المنمّطة تُحفظ دفعةً كاملة أو تُرفض كاملة؛ عقد «الحفظ الجزئي» القديم يحتاج قرار المالك | قرار المالك |
| employee_department_atomic | 14 | حذف مدير النظام لإدارة فيها 800 مفتاح مجهول ⇒ 200 والاختبار يطلب 403 (قاعدة 060 «وحدة زائلة» من 28472be بلا موافقة موثَّقة) | قرار المالك |
| employee_transition_server | 10 | السجل المنمّط للموظف مغلق ولا يحمل حقل role القديم؛ هل يُشترط بقاء الحقول القديمة غير المعروفة؟ | قرار المالك |
| k264_merge | D-6 rounds/tasks × legacy/enforce (4) | الجولات والمهام صارت موارد عمليات تحسم التزامن بالتعارض لا بالدمج الثلاثي | قرار المالك |
| k264_review | [legacy] A3a | السبب نفسه (لافتات الدمج الثلاثي على الجولات) | قرار المالك |

### اكتشافٌ بعد c70ab4b (2026-11-03) — اختبارٌ يعتمد على الساعة
- `request_db_guard` 14 (ميزانية 7 رحلات D1 لملخّص تنبيهات مدير النظام): ينجح بين 22:00 و06:00 UTC تقريباً، ويفشل نهاراً (11–15 رحلة) على c70ab4b نفسه وعلى المرشّح — ليس من تغييرٍ جديد.
- السبب: كلُّ `GET /api/notifications` يشغّل `nfIrshadDaily` و`nfSeizedDue` (تذكيراتٌ مرتبطة بوقت اليوم)، فيقرأ موارد العمليات ويكتب دفعة تنبيهٍ محميّة بعدم التكرار. تشغيلُ نظامٍ داخل القراءة كحالة security-poll — مفتوح لقرار المالك (تقييده بحارسٍ زمني مشترك أو نقله)، ولم يُغيَّر.

### ملاحظات أمنية للمراجعة (لم تُغيَّر)
- في الوضع الاحتياطي legacy وحده: مدير إدارة يحذف سجل التكريم في إدارةٍ سقفُها لا يشمل صفحة التكريم عبر `/api/award/act {op:'delete'}` (038 awardCleanup لا يفحص السقف). Test على الإنفاذ. الإصلاح المقترح يشدّد ولا يخفّف — بقرار المالك.
- حارس النسخ في العميل (canBk) ما زال يسمح لدور «dept» المتقاعد.

## سجل 68893bc (2026-11-02 · قبل المعالجة)
- الأمر: بعد `npm run -s build`، لكل ملفٍ على حدة `KIVO_WORKER=workers/_worker.js KIVO_DIST=pk265 KIVO_SRC=src node --no-warnings --test tests/unit/<الملف>` (317 ملفاً · 4 بالتوازي · TMPDIR مؤقت لكل ملف).
- الحصيلة: 1735 نجاح · **471 إخفاق** · 22 ملغى · في 87 ملفاً.
- المقارنة بأسماء الاختبارات: لا إخفاقَ جديد مقابل حزمة aae024c (1729 نجاحاً · 471 إخفاقاً) ولا مقابل 1375a98 (1690 · 494).
- **هذه الإخفاقات مفتوحة كلها.** ثباتُ عددها أو نقصُه لا يعني إغلاقها؛ لا يُغلق بندٌ إلا بإصلاحٍ واختبارٍ ينجح، أو بتصنيفٍ مكتوب (انجراف تجهيز / اختلاف إصدار) مع دليله.
- العمود «عند be4ce02» من السجل الأصلي أدناه (— = لم يكن فيه).

| الملف | نجاح | إخفاق | ملغى | عند be4ce02 | أول رسالة إخفاق | الحالة |
|---|---|---|---|---|---|---|
| custody_relational.test.mjs | 8 | 31 | 0 | 31 | Expected values to be strictly equal: | مفتوح |
| k264_api_authz_matrix.test.mjs | 1 | 24 | 0 | 24 | "Cannot read properties of null (reading '1448-5-22')" | مفتوح |
| business_atomic.test.mjs | 0 | 18 | 0 | 18 | Expected values to be strictly equal: | مفتوح |
| irshad_operations.test.mjs | 0 | 18 | 0 | 18 | Actual canonical schema9 includes the unchanged Irshad migration8 and the later business cutover | مفتوح |
| seized_operations.test.mjs | 0 | 17 | 0 | 17 | Expected values to be strictly equal: 10 !== 9 (schema version) | مفتوح |
| atomic_restore_review.test.mjs | 3 | 15 | 22 | 37 | {"ok":0,"err":"restore-incomplete-manifest"} | مفتوح |
| irshad_domain_cutover.test.mjs | 4 | 15 | 0 | 15 | Actual canonical schema9 includes the unchanged Irshad migration8 and the later business cutover | مفتوح |
| notifications_review_security.test.mjs | 5 | 15 | 0 | 15 | read: status | مفتوح |
| employee_department_atomic.test.mjs | 1 | 13 | 0 | 13 | {"ok":0,"err":"worker-error","rid":"c4e51f6d63e7"} | مفتوح |
| employee_transition_server.test.mjs | 0 | 13 | 0 | 13 | 'operations-legacy-source-present' | مفتوح |
| atomic_restore_client.test.mjs | 0 | 12 | 0 | 12 | '{"backupMsg":"تعذّر التصدير"}' | مفتوح |
| irshad_atomic_domain.test.mjs | 0 | 12 | 0 | 12 | Actual canonical schema9 includes the unchanged Irshad migration8 and the later business cutover | مفتوح |
| seized_codec.test.mjs | 0 | 12 | 0 | 12 | "Export 'enfEmpScopeOf' is not defined in module" | مفتوح |
| award_domain.test.mjs | 4 | 11 | 0 | 11 | Generate and register the actual schema9 before Award integration tests | مفتوح |
| custody_client_integration.test.mjs | 0 | 11 | 0 | 11 | "Cannot read properties of undefined (reading 'operations')" | مفتوح |
| atomic_restore_images.test.mjs | 0 | 9 | 0 | 9 | {"ok":0,"err":"operations-legacy-source-present"} | مفتوح |
| irshad_query.test.mjs | 1 | 9 | 0 | 9 | 'operations-legacy-source-present' | مفتوح |
| seized_due.test.mjs | 0 | 9 | 0 | 9 | Expected values to be strictly equal: | مفتوح |
| custody_admin_wipe_ui.test.mjs | 0 | 8 | 0 | 8 | 'this._businessBaseValid is not a function' | مفتوح |
| irshad_daily.test.mjs | 0 | 8 | 0 | 8 | Actual canonical schema9 includes the unchanged Irshad migration8 and the later business cutover | مفتوح |
| seized_query.test.mjs | 0 | 8 | 0 | 8 | "Export 'enfEmpScopeOf' is not defined in module" | مفتوح |
| custody_department_delete_ui.test.mjs | 0 | 7 | 0 | 7 | 'this._businessBaseValid is not a function' | مفتوح |
| k264_sec_contracts.test.mjs | 1 | 7 | 0 | 2 | 'irshad-cutover-target-not-empty' | مفتوح |
| rishad266_cloud_storage.test.mjs | 2 | 7 | 0 | 7 | The input did not match the regular expression /department-scope-required/. Input: | مفتوح |
| canvas_own_w1c2.test.mjs | 7 | 6 | 0 | 6 | الحفظُ يحمل نسخةَ الجهاز الآخر | مفتوح |
| custody_identity_api.test.mjs | 1 | 6 | 0 | 6 | {"status":500,"err":"worker-error"} | مفتوح |
| me_history.test.mjs | 3 | 6 | 0 | 9 | "Cannot read properties of null (reading '1448-5-22')" | مفتوح |
| dstats_relational.test.mjs | 21 | 5 | 0 | 5 | "Cannot read properties of undefined (reading 'v')" | مفتوح |
| k264_identity.test.mjs | 0 | 5 | 0 | 5 | 'relational-domain-api-required' | مفتوح |
| k264_merge.test.mjs | 3 | 5 | 0 | 5 | 'relational-domain-api-required' | مفتوح |
| k264_review.test.mjs | 5 | 5 | 0 | 5 | 'relational-domain-api-required' | مفتوح |
| migrations.test.mjs | 2 | 5 | 0 | 5 | '0009_seized_awards.sql يختم schema_version' | مفتوح |
| tasks_kpis_cancel_w1.test.mjs | 1 | 5 | 0 | 5 | 'operations-read-required' | مفتوح |
| adversarial.test.mjs | 7 | 4 | 0 | 7 | 'المفتاح موجود' | مفتوح |
| business_sqlite_limits.test.mjs | 3 | 4 | 0 | 4 | Expected values to be strictly equal: | مفتوح |
| daily_midpoint_w1c1.test.mjs | 2 | 4 | 0 | 4 | touch: الرأسُ المُضاف حيث تُرك | مفتوح |
| k264_readset.test.mjs | 0 | 4 | 0 | 4 | 'البداية: بلا عرض المهام' | مفتوح |
| lock_hints_w1.test.mjs | 6 | 4 | 0 | 4 | "Cannot read properties of undefined (reading 'operations')" | مفتوح |
| notifications_review_backup.test.mjs | 0 | 4 | 0 | 4 | {"ok":0,"err":"worker-error","rid":"9cd4c9bac074"} | مفتوح |
| refresh_seed_commit_w1fix.test.mjs | 1 | 4 | 0 | 4 | 'dataReady is not defined' | مفتوح |
| schema_upgrade_permit.test.mjs | 8 | 4 | 0 | 4 | Expected values to be strictly equal: | مفتوح |
| users_scope_w1.test.mjs | 6 | 4 | 0 | 8 | sup: الإقلاع = المرجع | مفتوح |
| custody_carry.test.mjs | 0 | 3 | 0 | 3 | {"ok":0,"err":"worker-error","rid":"d9ba168cbdd1"} | مفتوح |
| custody_mixed_compile_guard.test.mjs | 0 | 3 | 0 | 3 | {"status":500,"err":"worker-error"} | مفتوح |
| dept_delete_guard.test.mjs | 1 | 3 | 0 | 3 | 'this._businessBaseValid is not a function' | مفتوح |
| dstats_review_security.test.mjs | 2 | 3 | 0 | 3 | "Cannot read properties of undefined (reading 'v')" | مفتوح |
| k264_dayfocus.test.mjs | 0 | 3 | 0 | 1 | "Cannot read properties of undefined (reading 'set')" | مفتوح |
| plan_canvas_w1.test.mjs | 3 | 3 | 0 | 3 | savePlan لم يُستدعَ (كان يُستدعى في كل انتقال) | مفتوح |
| reset_restore_receipts.test.mjs | 0 | 3 | 0 | 3 | {"ok":0,"err":"restore-incomplete-manifest"} | مفتوح |
| retired_snapshot_rollback.test.mjs | 0 | 3 | 0 | 3 | bassam_dstats_v1 | مفتوح |
| save_race.test.mjs | 0 | 3 | 0 | 3 | Expected values to be strictly equal: | مفتوح |
| backup_numeric_witness.test.mjs | 0 | 2 | 0 | 2 | {"ok":0,"err":"worker-error","rid":"d0f7d88e05da"} | مفتوح |
| custody_employee_transition_ui.test.mjs | 10 | 2 | 0 | 2 | 'import context did not become ready' | مفتوح |
| custody_store.test.mjs | 2 | 2 | 0 | 2 | {"status":500,"err":"worker-error"} | مفتوح |
| d1_fault_sweep.test.mjs | 0 | 2 | 0 | 2 | Both legacy fixture sources exist before explicit installation | مفتوح |
| d1_tools.test.mjs | 4 | 2 | 0 | 2 | 'حفظُ مفتاح إدارة قبل النسخ' | مفتوح |
| emp_dup_route.test.mjs | 0 | 2 | 0 | 2 | 'قائمةُ tst_d1 من المِثال' | مفتوح |
| integrity.test.mjs | 0 | 2 | 0 | 2 | Expected values to be strictly equal: | مفتوح |
| irshad_backup_ui.test.mjs | 2 | 2 | 0 | 2 | 'تعذّر التصدير' | مفتوح |
| k264_changes.test.mjs | 3 | 2 | 0 | 2 | Expected values to be strictly equal: | مفتوح |
| k264_sec_bodies.test.mjs | 2 | 2 | 0 | 2 | 'irshad-cutover-target-not-empty' | مفتوح |
| k264_sec_read_ceiling.test.mjs | 0 | 2 | 0 | 2 | 'irshad-cutover-target-not-empty' | مفتوح |
| k264_sec_uid_reads.test.mjs | 0 | 2 | 0 | 2 | 'irshad-cutover-target-not-empty' | مفتوح |
| plan_status_noreason265.test.mjs | 1 | 2 | 0 | 2 | "Cannot read properties of null (reading 'floors')" | مفتوح |
| profile_stamp265.test.mjs | 3 | 2 | 0 | 2 | "Cannot read properties of undefined (reading 'day')" | مفتوح |
| restore_full_super.test.mjs | 0 | 2 | 0 | 2 | 'مرفوضة: 400 {"ok":0,"err":"operations-request-envelope"}' | مفتوح |
| api_contract_matrix.test.mjs | 1 | 1 | 0 | 2 | 'جسمٌ خاطئٌ للاختبار: /api/seized/act' | مفتوح |
| api_shapes.test.mjs | 2 | 1 | 0 | 1 | "Cannot read properties of undefined (reading 'bsdept:dR:bassam_options_v1')" | مفتوح |
| aud_last.test.mjs | 1 | 1 | 0 | 1 | Expected values to be strictly equal: | مفتوح |
| custody_history_compat.test.mjs | 3 | 1 | 0 | 1 | Expected values to be strictly equal: | مفتوح |
| emp_dup.test.mjs | 4 | 1 | 0 | 1 | Expected values to be strictly equal: | مفتوح |
| k264_activedept.test.mjs | 1 | 1 | 0 | 1 | Expected values to be strictly equal: | مفتوح |
| k264_gate335_e2e.test.mjs | 0 | 1 | 0 | 1 | سطرُ النتيجة: d-266/workers/_worker.js?inst=3:18468:17) ¦     at async opResourceMany (file:///home/user/rishad-266/work | مفتوح |
| kpis_tasks265.test.mjs | 2 | 1 | 0 | 1 | اللوحةُ الوحيدةُ المتاحة تُفتح تلقائياً | مفتوح |
| notifications_review_client.test.mjs | 13 | 1 | 0 | 1 | An actual API response satisfies the client contract | مفتوح |
| notifications_roundtrips.test.mjs | 2 | 1 | 0 | 1 | Expected values to be strictly equal: | مفتوح |
| page_modules_parts.test.mjs | 1 | 1 | 0 | 1 | saveLocks في الأصل | مفتوح |
| perf_memo.test.mjs | 2 | 1 | 0 | 1 | 'مدخلاتُ المفتاح كاملة' | مفتوح |
| profile_tasks_current265.test.mjs | 21 | 1 | 0 | 1 | 'session401: طلباتٌ محدودة في عشر دقائق (كانت آلافاً): 1' | مفتوح |
| refresh_tabs_w1.test.mjs | 8 | 1 | 0 | 1 | 'operations-read-required' | مفتوح |
| rishad266_identity_compat.test.mjs | 14 | 1 | 0 | 1 | 'Illegal return statement' | مفتوح |
| rishad266_preview_reset.test.mjs | 2 | 1 | 0 | 1 | Traceback (most recent call last): | مفتوح |
| rishad266_recovery_validation.test.mjs | 3 | 1 | 0 | 1 | 'rsResetRoute is not defined' | مفتوح |
| scope_projection.test.mjs | 0 | 1 | 0 | 1 | "Cannot read properties of null (reading 'floors')" | مفتوح |
| source_audit_tools.test.mjs | 0 | 1 | 0 | 1 | /home/user/rishad-266/tools/module_charter.py:18: ResourceWarning: unclosed file <_io.TextIOWrapper name='/home/user/ris | مفتوح |
| tasks_hotfix242_sql.test.mjs | 0 | 1 | 0 | 1 | Retired resource: use await replaceOperationalFixture for an explicit typed test mutation | مفتوح |
| worktype_fixed.test.mjs | 2 | 1 | 0 | 1 | 'wkAdd() { يُرفض برسالة' | مفتوح |

---

## السجل الأصلي (عند develop be4ce02 — للتاريخ)

### سجل الاختبارات الفاشلة — RISHAD-266 عند develop be4ce02 (شيفرة cd80cf2)

- الأمر: `npm ci` (أو node_modules المثبت بالقفل نفسه) ثم `npm run -s build` ثم `npm run -s test:unit:265`
- البيئة: Node v22.22.0 · Python 3 · TZ=UTC · التشغيل 2026-11-01 11:56–12:11 UTC · بصمة sha256 للعامل workers/_worker.js تبدأ بـ 030e78621fe6e71d
- الحصيلة (من مشغّل node:test): 2048 اختباراً · 1445 نجاح · 571 إخفاق · 22 ملغى · 10 متخطى.
- على المستوى الأعلى (اختبار لكل سطر TAP): 522 إخفاقاً و22 ملغى في 100 ملفاً. الفرق مع 571 = اختباراتٌ فرعية داخل اختبارات أمّ.
- التصنيف (عطل حقيقي / انجراف تجهيز / اختلاف إصدار) يُضاف هنا مع كل دفعة إصلاح. لا يُحذف اختبار ولا يُتخطى دون تفسير مكتوب هنا.

| الملف | الإخفاقات | أكثر رسالة تكراراً | التصنيف | الحالة |
|---|---|---|---|---|
| atomic_restore_review.test.mjs | 37 | 'Promise resolution is still pending but the event loop has already resolved' | لم يُصنَّف بعد | مفتوح |
| custody_relational.test.mjs | 31 | Expected values to be strictly equal: 500 !== 400 | لم يُصنَّف بعد | مفتوح |
| k264_api_authz_matrix.test.mjs | 24 | "Cannot read properties of null (reading '1448-5-21')" | لم يُصنَّف بعد | مفتوح |
| business_atomic.test.mjs | 18 | Expected values to be strictly equal: 10 !== 9 | لم يُصنَّف بعد | مفتوح |
| irshad_operations.test.mjs | 18 | Actual canonical schema9 includes the unchanged Irshad migration8 and the later business cutover 10 !== 9 | لم يُصنَّف بعد | مفتوح |
| seized_operations.test.mjs | 17 | Expected values to be strictly equal: 10 !== 9 | لم يُصنَّف بعد | مفتوح |
| irshad_domain_cutover.test.mjs | 15 | Actual canonical schema9 includes the unchanged Irshad migration8 and the later business cutover 10 !== 9 | لم يُصنَّف بعد | مفتوح |
| notifications_review_security.test.mjs | 15 | operation: status 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| employee_department_atomic.test.mjs | 13 | {"ok":0,"err":"worker-error","rid":"5423dbc5f665"} 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| employee_transition_server.test.mjs | 13 | 'operations-legacy-source-present' | لم يُصنَّف بعد | مفتوح |
| atomic_restore_client.test.mjs | 12 | '{"backupMsg":"تعذّر التصدير"}' | لم يُصنَّف بعد | مفتوح |
| irshad_atomic_domain.test.mjs | 12 | Actual canonical schema9 includes the unchanged Irshad migration8 and the later business cutover 10 !== 9 | لم يُصنَّف بعد | مفتوح |
| seized_codec.test.mjs | 12 | Expected values to be strictly equal: 10 !== 9 | لم يُصنَّف بعد | مفتوح |
| award_domain.test.mjs | 11 | Generate and register the actual schema9 before Award integration tests 10 !== 9 | لم يُصنَّف بعد | مفتوح |
| custody_client_integration.test.mjs | 11 | "Cannot read properties of undefined (reading 'operations')" | لم يُصنَّف بعد | مفتوح |
| atomic_restore_images.test.mjs | 9 | {"ok":0,"err":"operations-legacy-source-present"} 503 !== 200 | لم يُصنَّف بعد | مفتوح |
| irshad_query.test.mjs | 9 | 'operations-legacy-source-present' | لم يُصنَّف بعد | مفتوح |
| me_history.test.mjs | 9 | "Cannot read properties of undefined (reading 'linked')" | لم يُصنَّف بعد | مفتوح |
| plan_scope_hidden.test.mjs | 9 | '2 subtests failed' | لم يُصنَّف بعد | مفتوح |
| seized_due.test.mjs | 9 | Expected values to be strictly equal: 10 !== 9 | لم يُصنَّف بعد | مفتوح |
| custody_admin_wipe_ui.test.mjs | 8 | 'this._businessBaseValid is not a function' | لم يُصنَّف بعد | مفتوح |
| irshad_daily.test.mjs | 8 | Actual canonical schema9 includes the unchanged Irshad migration8 and the later business cutover 10 !== 9 | لم يُصنَّف بعد | مفتوح |
| k264_sec_self_fields.test.mjs | 8 | "Cannot read properties of undefined (reading 'v')" | لم يُصنَّف بعد | مفتوح |
| seized_query.test.mjs | 8 | Expected values to be strictly equal: 10 !== 9 | لم يُصنَّف بعد | مفتوح |
| users_scope_w1.test.mjs | 8 | sup: الإقلاع = المرجع + actual - expected ... Skipped lines [ { dis: 0, id: 'su', | لم يُصنَّف بعد | مفتوح |
| adversarial.test.mjs | 7 | 'الرد موثَّق: 503' | لم يُصنَّف بعد | مفتوح |
| custody_department_delete_ui.test.mjs | 7 | 'this._businessBaseValid is not a function' | لم يُصنَّف بعد | مفتوح |
| hardening_261.test.mjs | 7 | Expected values to be strictly equal: 0 !== 1 | لم يُصنَّف بعد | مفتوح |
| rishad266_cloud_storage.test.mjs | 7 | 'relational-domain-api-required' | لم يُصنَّف بعد | مفتوح |
| canvas_own_w1c2.test.mjs | 6 | الحفظُ يحمل نسخةَ الجهاز الآخر + actual - expected + 'TEST_ONLY_z1' - 'TEST_ONLY_zR TEST_ONLY_z1' ^ | لم يُصنَّف بعد | مفتوح |
| custody_identity_api.test.mjs | 6 | {"status":500,"err":"worker-error"} 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| dstats_relational.test.mjs | 5 | "Cannot read properties of undefined (reading 'v')" | لم يُصنَّف بعد | مفتوح |
| first_plan_empty.test.mjs | 5 | '3 subtests failed' | لم يُصنَّف بعد | مفتوح |
| k264_identity.test.mjs | 5 | 'relational-domain-api-required' | لم يُصنَّف بعد | مفتوح |
| k264_merge.test.mjs | 5 | 'التبويبان يقرآن bsdept:tst_d1:bassam_rounds_v1' | لم يُصنَّف بعد | مفتوح |
| k264_review.test.mjs | 5 | 'relational-domain-api-required' | لم يُصنَّف بعد | مفتوح |
| migrations.test.mjs | 5 | Expected values to be strictly deep-equal: + actual - expected ... Skipped lines [ 'aud', 'audit', 'authz', 'a | لم يُصنَّف بعد | مفتوح |
| tasks_kpis_cancel_w1.test.mjs | 5 | 'operations-read-required' | لم يُصنَّف بعد | مفتوح |
| users_no.test.mjs | 5 | "Cannot read properties of undefined (reading 'v')" | لم يُصنَّف بعد | مفتوح |
| business_sqlite_limits.test.mjs | 4 | Expected values to be strictly equal: 10 !== 9 | لم يُصنَّف بعد | مفتوح |
| daily_midpoint_w1c1.test.mjs | 4 | touch: الرأسُ المُضاف حيث تُرك + actual - expected [ { x: 100, y: 100 }, { - x: 200, - y: 180 - }, - { x: 300, | لم يُصنَّف بعد | مفتوح |
| k264_readset.test.mjs | 4 | 'البداية: بلا عرض المهام' | لم يُصنَّف بعد | مفتوح |
| lock_hints_w1.test.mjs | 4 | "Cannot read properties of undefined (reading 'operations')" | لم يُصنَّف بعد | مفتوح |
| notifications_review_backup.test.mjs | 4 | {"ok":0,"err":"worker-error","rid":"af7d8b5651bd"} 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| refresh_seed_commit_w1fix.test.mjs | 4 | 'dataReady is not defined' | لم يُصنَّف بعد | مفتوح |
| schema_upgrade_permit.test.mjs | 4 | Expected values to be strictly equal: '10' !== '8' | لم يُصنَّف بعد | مفتوح |
| custody_carry.test.mjs | 3 | {"ok":0,"err":"worker-error","rid":"e76c47b09857"} 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| custody_mixed_compile_guard.test.mjs | 3 | {"status":500,"err":"worker-error"} 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| dept_delete_guard.test.mjs | 3 | 'this._businessBaseValid is not a function' | لم يُصنَّف بعد | مفتوح |
| dstats_review_security.test.mjs | 3 | "Cannot read properties of undefined (reading 'v')" | لم يُصنَّف بعد | مفتوح |
| plan_canvas_w1.test.mjs | 3 | savePlan لم يُستدعَ (كان يُستدعى في كل انتقال) 3 !== 0 | لم يُصنَّف بعد | مفتوح |
| pw_upgrade_rev.test.mjs | 3 | Expected values to be strictly equal: 401 !== 200 | لم يُصنَّف بعد | مفتوح |
| reset_restore_receipts.test.mjs | 3 | {"ok":0,"err":"restore-incomplete-manifest"} 400 !== 200 | لم يُصنَّف بعد | مفتوح |
| retired_snapshot_rollback.test.mjs | 3 | bassam_dstats_v1 500 !== 400 | لم يُصنَّف بعد | مفتوح |
| save_race.test.mjs | 3 | Expected values to be strictly equal: 0 !== 1 | لم يُصنَّف بعد | مفتوح |
| api_contract_matrix.test.mjs | 2 | 'موظف ⇐ /api/me/today: 500' | لم يُصنَّف بعد | مفتوح |
| backup_numeric_witness.test.mjs | 2 | {"ok":0,"err":"worker-error","rid":"ade6b0addb3e"} 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| custody_employee_transition_ui.test.mjs | 2 | 'import context did not become ready' | لم يُصنَّف بعد | مفتوح |
| custody_store.test.mjs | 2 | {"status":500,"err":"worker-error"} 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| d1_fault_sweep.test.mjs | 2 | Expected values to be strictly equal: '10' !== '8' | لم يُصنَّف بعد | مفتوح |
| d1_tools.test.mjs | 2 | Expected values to be strictly equal: 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| emp_dup_route.test.mjs | 2 | 'قائمةُ tst_d1 من المِثال' | لم يُصنَّف بعد | مفتوح |
| integrity.test.mjs | 2 | Expected values to be strictly equal: 0 !== 1 | لم يُصنَّف بعد | مفتوح |
| irshad_backup_ui.test.mjs | 2 | 'تعذّر التصدير' | لم يُصنَّف بعد | مفتوح |
| k264_changes.test.mjs | 2 | Expected values to be strictly equal: + actual - expected + null - '{"test":"TEST_ONLY","gen":0}' | لم يُصنَّف بعد | مفتوح |
| k264_sec_bodies.test.mjs | 2 | {"ok":0,"err":"worker-error","rid":"785eb3d80ec6"} 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| k264_sec_contracts.test.mjs | 2 | 'يقرأ مفتاحَ نطاقه' | لم يُصنَّف بعد | مفتوح |
| k264_sec_read_ceiling.test.mjs | 2 | 'legacy su: typed Irshad {"ok":0,"err":"worker-error","rid":"0d8ae9a2b3de"}' | لم يُصنَّف بعد | مفتوح |
| k264_sec_uid_reads.test.mjs | 2 | Expected values to be strictly equal: 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| operations_admin_shifts.test.mjs | 2 | 'registry.treeFlat is not a function' | لم يُصنَّف بعد | مفتوح |
| perms_lensz.test.mjs | 2 | 'الترقيةُ إلى 1 مقبولة: {"ok":0,"err":"operations-legacy-source-present"}' | لم يُصنَّف بعد | مفتوح |
| plan_status_noreason265.test.mjs | 2 | "Cannot read properties of null (reading 'floors')" | لم يُصنَّف بعد | مفتوح |
| profile_stamp265.test.mjs | 2 | "Cannot read properties of undefined (reading 'day')" | لم يُصنَّف بعد | مفتوح |
| restore_full_super.test.mjs | 2 | 'مرفوضة: 400 {"ok":0,"err":"operations-request-envelope"}' | لم يُصنَّف بعد | مفتوح |
| session_lifecycle.test.mjs | 2 | {"ok":0,"err":"operations-legacy-source-present"} 0 !== 1 | لم يُصنَّف بعد | مفتوح |
| api_shapes.test.mjs | 1 | "Cannot read properties of undefined (reading 'bsdept:dR:bassam_options_v1')" | لم يُصنَّف بعد | مفتوح |
| aud_last.test.mjs | 1 | Expected values to be strictly equal: 0 !== 1 | لم يُصنَّف بعد | مفتوح |
| custody_history_compat.test.mjs | 1 | Expected values to be strictly equal: 500 !== 400 | لم يُصنَّف بعد | مفتوح |
| d1_session_shape.test.mjs | 1 | 'المفاتيحُ المحمولة لمدير الإدارة تعود من الطلب المتداخل' | لم يُصنَّف بعد | مفتوح |
| emp_dup.test.mjs | 1 | Expected values to be strictly equal: 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| k264_activedept.test.mjs | 1 | Expected values to be strictly equal: 0 !== 1 | لم يُصنَّف بعد | مفتوح |
| k264_dayfocus.test.mjs | 1 | 'زُرعت قيمةٌ مشتركة قديمة' | لم يُصنَّف بعد | مفتوح |
| k264_gate335_e2e.test.mjs | 1 | سطرُ النتيجة: /head/package.json. file:///tmp/claude-0/-home-user/bb495e0d-4a91-5493-bdbe-13d1a5924e57/scratch | لم يُصنَّف بعد | مفتوح |
| k264_sec_az_staffing.test.mjs | 1 | supB /api/authz 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| kpis_tasks265.test.mjs | 1 | اللوحةُ الوحيدةُ المتاحة تُفتح تلقائياً false !== true | لم يُصنَّف بعد | مفتوح |
| notifications_review_client.test.mjs | 1 | An actual API response satisfies the client contract 0 !== 1 | لم يُصنَّف بعد | مفتوح |
| notifications_roundtrips.test.mjs | 1 | Expected values to be strictly equal: 500 !== 200 | لم يُصنَّف بعد | مفتوح |
| page_modules_parts.test.mjs | 1 | saveLocks في الأصل + actual - expected + 'undefined' - 'function' | لم يُصنَّف بعد | مفتوح |
| perf_memo.test.mjs | 1 | 'مدخلاتُ المفتاح كاملة' | لم يُصنَّف بعد | مفتوح |
| ph_exfil.test.mjs | 1 | Expected values to be strictly equal: 503 !== 200 | لم يُصنَّف بعد | مفتوح |
| profile_tasks_current265.test.mjs | 1 | 'session401: طلباتٌ محدودة في عشر دقائق (كانت آلافاً): 1' | لم يُصنَّف بعد | مفتوح |
| refresh_tabs_w1.test.mjs | 1 | 'operations-read-required' | لم يُصنَّف بعد | مفتوح |
| rishad266_identity_compat.test.mjs | 1 | 'Illegal return statement' | لم يُصنَّف بعد | مفتوح |
| rishad266_preview_reset.test.mjs | 1 | Traceback (most recent call last): File "<string>", line 16, in <module> assert 'R2' not in sql.replace('-- Al | لم يُصنَّف بعد | مفتوح |
| rishad266_recovery_validation.test.mjs | 1 | 'rsResetRoute is not defined' | لم يُصنَّف بعد | مفتوح |
| scope_projection.test.mjs | 1 | "Cannot read properties of null (reading 'floors')" | لم يُصنَّف بعد | مفتوح |
| seized_award_cloud_ui.test.mjs | 1 | Command failed: git show 4d8ab1e:src/modules/seized/logic.js fatal: not a git repository (or any of the parent | لم يُصنَّف بعد | مفتوح |
| source_audit_tools.test.mjs | 1 | /tmp/claude-0/-home-user/bb495e0d-4a91-5493-bdbe-13d1a5924e57/scratchpad/t571/head/tools/module_charter.py:18: | لم يُصنَّف بعد | مفتوح |
| tasks_hotfix242_sql.test.mjs | 1 | Retired resource: use await replaceOperationalFixture for an explicit typed test mutation true !== false | لم يُصنَّف بعد | مفتوح |
| worktype_fixed.test.mjs | 1 | 'wkAdd() { يُرفض برسالة' | لم يُصنَّف بعد | مفتوح |
