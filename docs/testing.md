# الاختبارات — الكتالوجُ والهرم (SOT-132 · SOT-109…113)

> مولَّدٌ آلياً بـ`python3 tools/test_catalog.py` من حزم البوابة الدائمة (`gateall265.sh`) و`tests/` وآخر جولة بوابة بأجزاء استئنافها (`reports/k265/gate_265_run4.txt + reports/k265/gate_265_run4b.txt`)؛ لا يُحرَّر يدوياً.
> التصنيفُ بمحتوى الملف: متصفحٌ ⇒ طرفٌ لطرف · Miniflare بلا متصفح ⇒ تكامل · Node بلا خادم ⇒ وحدة · Python ⇒ براهينُ ساكنة · وأسماءُ الحزم البصرية والأداء.

## الهرم

| الطبقة | الحزم | في البوابة | تأكيداتٌ ناجحة في آخر بوابة | اختباراتُ الوحدة |
|---|---|---|---|---|
| وحدة (Node · بلا خادم ولا متصفح) | 149 | 146 | 858 | 356 |
| براهينُ المصدر (Python · ساكن) | 49 | 7 | 125 | — |
| فحوصٌ ساكنة على الحزمة | 9 | 9 | 72 | — |
| تكامل (Miniflare · بلا متصفح) | 30 | 28 | 1,082 | — |
| طرفٌ لطرف (متصفح + خادم) | 82 | 73 | 2,358 | — |
| بصريّ · إتاحة · أجهزة | 23 | 7 | 276 | — |
| أداء · حِمل · تحمّل | 16 | 10 | 180 | — |

## تغطيةُ بنود P0 (من مصفوفة التتبّع)

- P0 «مكتمل»: 87 — باختبارٍ مُشارٍ إليه 45 · بتحقّقٍ مسجَّلٍ في المرجع (Preview/إجراء/ساكن) 8 · بدليلٍ نصّيٍّ وحده 34
- P0 مفتوح: 38 — له اختبارٌ أو كودٌ مُشارٌ إليه 38 (التفاصيل: `docs/traceability.md`)

## الحزم

| الملف | الطبقة | في البوابة | آخر بوابة | العنوان |
|---|---|---|---|---|
| `cfbench/bkdept.mjs` | وحدة | ✔ | — |  |
| `cfbench/gcref.mjs` | وحدة | ✔ | — |  |
| `cfbench/k243ops.mjs` | وحدة | ✔ | نجح 50 | KIVO_243 التشغيل — الأداة · مفتاحُ الطوارئ · الحواجز · السجل · الترحيل |
| `cfbench/k243xdiff.mjs` | وحدة | ✔ | — |  |
| `cfbench/k259journeys_enf.mjs` | وحدة | ✔ | نجح 27 | KIVO_263 SOT-167/111 رحلاتُ P0 الأولى في الإنفاذ — الجلسة · المهام (والسببُ المطلوب) · الت |
| `cfbench/k260journeys_enf.mjs` | وحدة | ✔ | نجح 30 | KIVO_263 SOT-167/111 رحلاتُ P0 الثانية في الإنفاذ — الغياب والاعتماد والإغلاق · التجميد ·  |
| `cfbench/k263rollback_local.mjs` | وحدة | — | — |  |
| `cfbench/k264rollback_local.mjs` | وحدة | — | — |  |
| `cfbench/k265rollback_local.mjs` | وحدة | — | — |  |
| `cfbench/p21bind.mjs` | وحدة | ✔ | — |  |
| `cfbench/p21diff.mjs` | وحدة | ✔ | — |  |
| `cfbench/p2bind.mjs` | وحدة | ✔ | — |  |
| `cfbench/p3bind.mjs` | وحدة | ✔ | نجح 184 | R196 ربطُ الحرّاس — مصنِّفُ Phase 3 على الـ71 (Node) |
| `cfbench/p3build.mjs` | وحدة | ✔ | نجح 42 | R196 KIVO_BUILD — الـ10 to-build وآلياتُها (Node) |
| `cfbench/p3diff.mjs` | وحدة | ✔ | نجح 8 | R196 عزلُ أثر مصنِّف Phase 3 (R195 → R196) |
| `cfbench/p411scope.mjs` | وحدة | ✔ | — |  |
| `cfbench/p41bind.mjs` | وحدة | ✔ | — |  |
| `cfbench/p41scope.mjs` | وحدة | ✔ | نجح 122 | R198 KIVO_SCOPE 4.1 — القراءةُ وسقفُ الإدارة وD4-02/03 (Node) |
| `cfbench/p41term.mjs` | وحدة | ✔ | نجح 24 | R198 D4-05 Terminology Lock — المصنِّفُ والقاموس (Node) |
| `cfbench/p45bind.mjs` | وحدة | ✔ | — |  |
| `cfbench/p45identity.mjs` | وحدة | ✔ | نجح 59 | R203 KIVO_IDENTITY_MIGRATION v24.9 — بروفةُ الهوية + إقفالُ sid (IP‑01/IP‑02) على بياناتٍ  |
| `cfbench/p45migration.mjs` | وحدة | ✔ | — |  |
| `cfbench/p45preflight.mjs` | وحدة | ✔ | نجح 41 | R203 KIVO_IDENTITY_PREFLIGHT — التمهيدُ المُدمَج (applyTierA · legacyIdMap · unlinked · co |
| `cfbench/p4bind.mjs` | وحدة | ✔ | نجح 184 | R197 ربطُ الحرّاس على v24.4 — المصنِّفُ كما هو (Node) |
| `cfbench/p4scope.mjs` | وحدة | ✔ | نجح 87 | R197 KIVO_SCOPE — محرّكُ النطاق والأبعادُ العشرة (Node) |
| `registry/check_registry.mjs` | وحدة | ✔ | — |  |
| `registry10/check_registry.mjs` | وحدة | ✔ | — |  |
| `registry243/check_registry.mjs` | وحدة | ✔ | — |  |
| `registry3/check_registry.mjs` | وحدة | ✔ | — |  |
| `registry4/check_registry.mjs` | وحدة | ✔ | — |  |
| `registry5/check_registry.mjs` | وحدة | ✔ | — |  |
| `registry6/check_registry.mjs` | وحدة | ✔ | — |  |
| `registry7/check_registry.mjs` | وحدة | ✔ | — |  |
| `registry8/check_registry.mjs` | وحدة | ✔ | — |  |
| `registry9/check_registry.mjs` | وحدة | ✔ | — |  |
| `tests/unit/admin_routes.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/adversarial.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/api_contract_matrix.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/api_contracts.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/api_shapes.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/atomic_guard.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/aud_last.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/auth_routes.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/body_schemas.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/ci_release.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/client_engines.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/components_catalog.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/csp_nonce.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/csrf.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/csrf_origin.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/d1_fault_sweep.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/d1_init_hang.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/d1_session_shape.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/d1_tools.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/d1_trips.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/engines_core.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/engines_pure.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/engines_scope.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/first_plan_empty.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/gate_manifest.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/global_keys.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/guard_unlock.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/hardening_261.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/img_type.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/integrity.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_activedept.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_api_authz_matrix.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_changes.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_dayfocus.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_gate335_e2e.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_identity.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_merge.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_noserver.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_readset.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_review.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_sec_az_staffing.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_sec_bodies.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_sec_contracts.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_sec_read_ceiling.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_sec_self_fields.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/k264_sec_uid_reads.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/key_decisions.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/login_burst.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/logs.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/longpoll_cap.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/matrix_resume.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/me_history.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/migrations.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/pack_prod.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/perm_slice.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/perm_tree_recur265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/perms_lensz.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/ph_downgrade.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/ph_exfil.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/plan_scope_hidden.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/plugins.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/prod_strip.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/profile_facts.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/profile_page.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/profile_security.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/profile_tasks_current265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/pw_upgrade_rev.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/rate_limits.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/rate_policy.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/req_log.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/restore_full_super.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/rm1_failclosed.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/rm1_ping.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/rm1_testapi_guard.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/save_race.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/scope_ids.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/scope_projection.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/session_lifecycle.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_acceptance.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_acct265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_c1_session.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_edit_integrity.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_fix265_f1.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_fix265_f1nid.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_fix265_f2.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_fix265_f3.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_fix265_g1.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_fix265_g2.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_fix265_reopen.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_hotfix242_sql.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_k265_f10.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_merge_grp265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_model_parity.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_p0_selfread.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_page_acct265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_page_p2.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_page_recur265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_page_rereview265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_page_review265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_page_unified265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_page_verify265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_profile_patch.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_recur265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_recur265b.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_rereview265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_review265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_selfwrite_guard.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_unified265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/tasks_verify265.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/theme_contract.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/touch_pad.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/users_no.test.mjs` | وحدة | ✔ | — |  |
| `tests/unit/utils_pure.test.mjs` | وحدة | ✔ | — |  |
| `tools/engine_coverage.mjs` | وحدة | ✔ | — |  |
| `tests/source/docs_check.py` | براهينُ المصدر | ✔ | نجح 17 | KIVO_258 AUD-031 الوثائق — كلُّ مسارٍ موثَّق · كلُّ قرارٍ له ADR · الفهرس · الروابط (Pytho |
| `tests/source/k251eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k251pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k251src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k252eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k252pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k252src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k253eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k253pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k253src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k254eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k254pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k254src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k255eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k255pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k255src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k256eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k256pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k256src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k257eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k257pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k257src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k258eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k258pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k258src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k259eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k259pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k259src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k260eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k260pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k260src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k261eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k261pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k261src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k262eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k262pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k262src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k263eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k263pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k263src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k264eq.py` | براهينُ المصدر | — | — |  |
| `tests/source/k264pii.py` | براهينُ المصدر | — | — |  |
| `tests/source/k264src.py` | براهينُ المصدر | — | — |  |
| `tests/source/k265eq.py` | براهينُ المصدر | ✔ | نجح 19 | KIVO_242 G2 تكافؤُ التنفيذ — إعادةُ تركيب dist = النصُّ الكامل (Python · k243eq) |
| `tests/source/k265pii.py` | براهينُ المصدر | ✔ | نجح 10 | KIVO_242 G9 خصوصيةُ الأصول الثابتة (Python · k243pii) |
| `tests/source/k265src.py` | براهينُ المصدر | ✔ | نجح 44 | KIVO_265 الفرقُ بالضبط عن KIVO_264 · سقّالةُ الإصدار ونظامُ المهام · ثوابتُ 264 (Python) |
| `tests/source/obs_check.py` | براهينُ المصدر | ✔ | نجح 15 | KIVO_258 SOT-124/143 المراقبةُ معرَّفةٌ مركزياً ومتّسقة · المقاييسُ والتنبيهاتُ من السجل ( |
| `tests/source/page_add_check.py` | براهينُ المصدر | ✔ | نجح 6 | KIVO_258 AUD-015 إضافةُ صفحة = ملفٌ واحد (pages.json ⇒ كلُّ السجلات · Python) |
| `tests/source/plugin_add_check.py` | براهينُ المصدر | ✔ | نجح 14 | KIVO_259 AUD-030 إضافةُ عدسةٍ = مجلدُ إضافةٍ واحد في نسخةٍ مؤقتة (Python) |
| `chkbal.py` | فحوصٌ ساكنة على الحزمة | ✔ | — |  |
| `chksvg.py` | فحوصٌ ساكنة على الحزمة | ✔ | — |  |
| `chkvar.py` | فحوصٌ ساكنة على الحزمة | ✔ | — |  |
| `gate.py` | فحوصٌ ساكنة على الحزمة | ✔ | — |  |
| `k242/tests/k242bind.py` | فحوصٌ ساكنة على الحزمة | ✔ | نجح 20 | KIVO_242 فرقُ KIVO_240 → KIVO_242 بالضبط — على KIVO_242 المسلَّمة (Python) |
| `k242/tests/k242rt.py` | فحوصٌ ساكنة على الحزمة | ✔ | نجح 17 | KIVO_242 G0/G1 سلسلةُ الأساس — على KIVO_242 المسلَّمة (Python) |
| `tools/export_official.py` | فحوصٌ ساكنة على الحزمة | ✔ | نجح 34 | KIVO_259 AUD-029 المستودعُ الرسمي وحده يكفي نفسَه — التصدير · البناء · الوحدة · الفحوص (Py |
| `tools/gate_manifest.py` | فحوصٌ ساكنة على الحزمة | ✔ | — |  |
| `tools/sec/secrets_scan.py` | فحوصٌ ساكنة على الحزمة | ✔ | نجح 1 | KIVO_258 SOT-140/165 مسحُ الأسرار — المصدرُ الرسمي والعُدّة والحزمة 0 (Python) |
| `cfbench/action.mjs` | تكامل | ✔ | نجح 37 | مصفوفة الأفعال |
| `cfbench/adv.mjs` | تكامل | ✔ | نجح 31 | ملكية الصور — العدائي |
| `cfbench/audunify.mjs` | تكامل | ✔ | نجح 35 | R169-CC توحيدُ سجل التدقيق |
| `cfbench/authz.mjs` | تكامل | ✔ | نجح 46 | التفويض |
| `cfbench/break.mjs` | تكامل | ✔ | نجح 60 | الكسر العدائي |
| `cfbench/core.mjs` | تكامل | ✔ | نجح 68 | إغلاق النواة |
| `cfbench/diff.mjs` | تكامل | ✔ | — |  |
| `cfbench/disc.mjs` | تكامل | ✔ | — | كشف الإغلاق |
| `cfbench/entity.mjs` | تكامل | ✔ | نجح 112 | الكيان لا الخاصيّة |
| `cfbench/fix.mjs` | تكامل | ✔ | نجح 44 | انحسار الإصلاحات |
| `cfbench/flag.mjs` | تكامل | ✔ | نجح 29 | نطاقُ الرايات |
| `cfbench/func.mjs` | تكامل | ✔ | نجح 22 | الوظيفي |
| `cfbench/hard.mjs` | تكامل | ✔ | نجح 94 | إحكام النواة |
| `cfbench/img.mjs` | تكامل | ✔ | نجح 56 | الصور و/api/changes والحجم |
| `cfbench/imgcap.mjs` | تكامل | ✔ | نجح 27 | سقفُ حمولة الصورة |
| `cfbench/imgls.mjs` | تكامل | ✔ | نجح 31 | جردُ الصور — بلا أجسام |
| `cfbench/k263firstplan.mjs` | تكامل | ✔ | نجح 12 | KIVO_263 SOT-188 الخطةُ الأولى لإدارةٍ بلا خطةٍ ولا سقف — مديرُ النظام وحده · لا وصولَ قبل |
| `cfbench/k263probe_proj.mjs` | تكامل | — | — |  |
| `cfbench/k263probe_task.mjs` | تكامل | — | — |  |
| `cfbench/own.mjs` | تكامل | ✔ | نجح 43 | ملكية الصور — الوظيفي |
| `cfbench/p3marker.mjs` | تكامل | ✔ | — |  |
| `cfbench/p45shadow.mjs` | تكامل | ✔ | — |  |
| `cfbench/prot.mjs` | تكامل | ✔ | نجح 49 | عقودُ البروتوكول |
| `cfbench/read01.mjs` | تكامل | ✔ | نجح 39 | R169-CC READ-01 تخويلُ القراءة |
| `cfbench/rel.mjs` | تكامل | ✔ | نجح 24 | الموثوقية |
| `cfbench/res.mjs` | تكامل | ✔ | نجح 115 | عقود الموارد |
| `cfbench/restoreimg.mjs` | تكامل | ✔ | نجح 37 | R169-CC استعادةُ الخرائط |
| `cfbench/rev4.mjs` | تكامل | ✔ | نجح 14 | تفرّدُ المراجعة تحت التزامن |
| `cfbench/sec.mjs` | تكامل | ✔ | نجح 42 | الأمن |
| `cfbench/sec163.mjs` | تكامل | ✔ | نجح 15 | حدُّ المعدّل وقفلُ الدخول |
| `cfbench/ack.mjs` | طرفٌ لطرف | ✔ | نجح 19 | صدقُ رسائل النجاح — بعد إقرار الخادم |
| `cfbench/alpha247.mjs` | طرفٌ لطرف | ✔ | نجح 44 | الشفافيةُ في خطّ ضغط الصور (alpha247 — أنماطٌ تقبل تصغير esbuild) |
| `cfbench/audit.mjs` | طرفٌ لطرف | ✔ | نجح 92 | R169 سجلُّ الأنشطة الموحَّد |
| `cfbench/bkimg.mjs` | طرفٌ لطرف | ✔ | نجح 20 | اكتمالُ صور نسخة الإدارة والمسح |
| `cfbench/bkstamp.mjs` | طرفٌ لطرف | ✔ | نجح 23 | عقدُ طابع النسخة الشاملة |
| `cfbench/collab.mjs` | طرفٌ لطرف | ✔ | نجح 40 | التحديثُ الحيّ بلا إعادةِ تركيب (متصفحان) |
| `cfbench/dlg.mjs` | طرفٌ لطرف | ✔ | نجح 29 | الحواراتُ ولوحةُ المفاتيح |
| `cfbench/drag.mjs` | طرفٌ لطرف | ✔ | نجح 14 | R171 سحبُ الكانفس ورسمُه |
| `cfbench/dsperm.mjs` | طرفٌ لطرف | ✔ | نجح 69 | R180 الإحصائياتُ في الشجرة والسقف والخادم |
| `cfbench/dsround.mjs` | طرفٌ لطرف | ✔ | نجح 57 | R169 المتابعةُ اليومية — مفتوحةٌ/معتمدة |
| `cfbench/dstats.mjs` | طرفٌ لطرف | ✔ | نجح 167 | R170 الإحصائياتُ اليومية والتحليلات |
| `cfbench/esc.mjs` | طرفٌ لطرف | ✔ | نجح 13 | Escape يُغلق الحوارَ المفتوح |
| `cfbench/explore.mjs` | طرفٌ لطرف | ✔ | نجح 27 | QA استكشافيّ — الوحدات الأربع عشرة |
| `cfbench/explore2.mjs` | طرفٌ لطرف | ✔ | نجح 22 | QA استكشافيّ — تدفّقاتٌ إضافية |
| `cfbench/fdbar.mjs` | طرفٌ لطرف | ✔ | نجح 19 | R169-CC شريطُ رصد الميدان |
| `cfbench/imgmatrix.mjs` | طرفٌ لطرف | ✔ | نجح 21 | مصفوفةُ مداخل الصور A/B |
| `cfbench/k250logic.mjs` | طرفٌ لطرف | — | — |  |
| `cfbench/k250ui.mjs` | طرفٌ لطرف | — | — |  |
| `cfbench/k251logic.mjs` | طرفٌ لطرف | — | — |  |
| `cfbench/k251ui.mjs` | طرفٌ لطرف | — | — |  |
| `cfbench/k252logic.mjs` | طرفٌ لطرف | — | — |  |
| `cfbench/k252ui.mjs` | طرفٌ لطرف | — | — |  |
| `cfbench/k253logic.mjs` | طرفٌ لطرف | ✔ | نجح 19 | KIVO_253 AUD-008/SOT-048 المنطقُ المُصرَّف مسبقاً · CSP بلا unsafe-eval (متصفح) |
| `cfbench/k253offline.mjs` | طرفٌ لطرف | ✔ | نجح 10 | KIVO_253 SOT-157 حالةُ «بلا اتصال» — المؤشرُ لحظةَ الانقطاع · الطابورُ عند العودة (متصفح) |
| `cfbench/k253ui.mjs` | طرفٌ لطرف | ✔ | نجح 27 | KIVO_243 الواجهةُ في وضع الإنفاذ (متصفح) |
| `cfbench/k254print.mjs` | طرفٌ لطرف | — | — |  |
| `cfbench/k254ux.mjs` | طرفٌ لطرف | ✔ | نجح 25 | KIVO_254 RM-3 البنود ١-٤ و٦ — اللافتة · الهيكل · أعد المحاولة · الحاشيةُ اللمسية · التباين |
| `cfbench/k255console.mjs` | طرفٌ لطرف | ✔ | نجح 6 | KIVO_255 SOT-130/131 نظافةُ وحدة التحكم والشبكة — 15 شاشة بجلسة (متصفح) |
| `cfbench/k256perm.mjs` | طرفٌ لطرف | ✔ | نجح 65 | KIVO_256 شجرةُ صلاحيات الموظف وسقفُ الإدارة v24.9 — البنيةُ 1 إلى 1 · الواجهة = الخادم · ا |
| `cfbench/k258dr.mjs` | طرفٌ لطرف | ✔ | نجح 16 | KIVO_259 SOT-147 تمرينُ التعافي من الكوارث — النسخة · الفقدُ الكامل · الاستعادة · RTO/RPO  |
| `cfbench/k258ns.mjs` | طرفٌ لطرف | ✔ | نجح 10 | KIVO_258 AUD-016 الواجهةُ العامة window.KIVO — العدُّ ≤ 5 · window.X ≡ KIVO.X · الطبقةُ أو |
| `cfbench/k258print.mjs` | طرفٌ لطرف | ✔ | نجح 14 | KIVO_258 AUD-013 نواةُ الطباعة — الوثيقةُ = ما كان يبنيه الباني المنفصل حرفاً (258 ↔ 257 · |
| `cfbench/k259journeys.mjs` | طرفٌ لطرف | ✔ | نجح 26 | KIVO_259 SOT-167 رحلاتُ P0 بالنقر بأدوارٍ حقيقية — الجلسة · المهام · التقرير اليومي · 14 ص |
| `cfbench/k259shots.mjs` | طرفٌ لطرف | — | — |  |
| `cfbench/k260journeys.mjs` | طرفٌ لطرف | ✔ | نجح 30 | KIVO_260 SOT-167 رحلاتُ P0 (الجزءُ الثاني) — الغيابُ والاعتمادُ وإغلاقُ اليوم · تجميدُ الح |
| `cfbench/k261sys.mjs` | طرفٌ لطرف | ✔ | نجح 28 | KIVO_261 SOT-036/079 سيناريو مدير النظام بالنقر — السياسات · الجلسات · فكُّ القفل · مفتاحُ |
| `cfbench/k261tamper.mjs` | طرفٌ لطرف | ✔ | نجح 20 | KIVO_261 SOT-136 العبثُ بحالة الواجهة لا يرفع الصلاحية — الوضعان (متصفح) |
| `cfbench/k261tree.mjs` | طرفٌ لطرف | ✔ | نجح 40 | KIVO_261 SOT-003/010/015 شجرةُ صلاحيات الموظف وسقفُ الإدارة = المنصة 1 إلى 1 — كلُّ ورقةٍ  |
| `cfbench/k262probe.mjs` | طرفٌ لطرف | — | — |  |
| `cfbench/k262scope.mjs` | طرفٌ لطرف | ✔ | نجح 33 | KIVO_262 سقفُ النطاق من الواجهة يحكم الخادم — الإدارة والموظف · مدير الإدارة · الوضعُ القد |
| `cfbench/k263journeys.mjs` | طرفٌ لطرف | ✔ | نجح 29 | KIVO_263 SOT-111 رحلاتُ P0 التي كانت API فقط — القفلُ · الخروجُ بالنقر · الكلمةُ الإجبارية |
| `cfbench/k263journeys2.mjs` | طرفٌ لطرف | ✔ | نجح 26 | KIVO_263 SOT-111 رحلاتُ P0 الجزءُ الثاني — الموظفون (إضافة · بحث · تعديل · حذف) · الإحصائي |
| `cfbench/live.mjs` | طرفٌ لطرف | ✔ | نجح 14 | R175 الإيماءةُ بلا إعادة رسم |
| `cfbench/lsallow.mjs` | طرفٌ لطرف | ✔ | نجح 8 | KIVO_244 AUD-003 قائمةُ مفاتيح المزامنة (متصفح) |
| `cfbench/menus.mjs` | طرفٌ لطرف | ✔ | نجح 29 | R177 القوائمُ المنسدلة فوق الجداول |
| `cfbench/notifclr.mjs` | طرفٌ لطرف | ✔ | نجح 16 | R169-CC3 حذفُ الكل في الجرس |
| `cfbench/notifstick.mjs` | طرفٌ لطرف | ✔ | نجح 18 | R179 التنبيهاتُ تنحذف وتُقرأ لكل دور |
| `cfbench/p1cmp.mjs` | طرفٌ لطرف | ✔ | — |  |
| `cfbench/p45flows.mjs` | طرفٌ لطرف | ✔ | نجح 50 | R203 KIVO_240 — التدفقاتُ الحقيقية في المتصفح + Dry-Run + بروفةُ الهوية + التمهيدُ قراءةً  |
| `cfbench/p45reg.mjs` | طرفٌ لطرف | ✔ | — |  |
| `cfbench/p45ui.mjs` | طرفٌ لطرف | ✔ | نجح 87 | R203 KIVO_240 — تثبيتُ الهوية في المتصفح (uid الآمن · sid منذ إنشاء الموقع · ekey · planSy |
| `cfbench/pf264.mjs` | طرفٌ لطرف | ✔ | نجح 85 | KIVO_264 «ملفي» — التبويباتُ الأربعة · موقعك اليوم · أيام الراحة · السجل · الحوارات · 320/ |
| `cfbench/plan.mjs` | طرفٌ لطرف | ✔ | نجح 43 | حذفُ خطة الشهر — الدلالةُ والكنس |
| `cfbench/plancreate.mjs` | طرفٌ لطرف | ✔ | نجح 55 | R169 إنشاءُ الخطة — الخياراتُ الثلاثة |
| `cfbench/r181.mjs` | طرفٌ لطرف | ✔ | نجح 64 | R181 أرقامُ التحليلات والأقفال وقراءةُ الخادم |
| `cfbench/r182.mjs` | طرفٌ لطرف | ✔ | نجح 73 | R182 الأرقامُ العربية في المنصة والأقفالُ والمواقع |
| `cfbench/r182pos.mjs` | طرفٌ لطرف | ✔ | نجح 4 | R182 الأرقامُ في مواضعها حرفاً بحرف |
| `cfbench/r182tpl.mjs` | طرفٌ لطرف | ✔ | نجح 15 | R182 قالبُ الموظف واحدٌ في كل الشاشات |
| `cfbench/r183cards.mjs` | طرفٌ لطرف | ✔ | نجح 23 | R183 كروتُ المهام والعهد بتصميم التقرير اليومي |
| `cfbench/r183cnt.mjs` | طرفٌ لطرف | ✔ | نجح 39 | R183 العددُ والمعدودُ في المنصة كلها |
| `cfbench/r183lock.mjs` | طرفٌ لطرف | ✔ | نجح 28 | R183 أقفالُ الإحصائيات في الخادم (128) |
| `cfbench/r183nf.mjs` | طرفٌ لطرف | ✔ | نجح 15 | R183 التنبيهاتُ بالصلاحيات وجرسُ مدير النظام |
| `cfbench/r183pct.mjs` | طرفٌ لطرف | ✔ | نجح 8 | R183 ٪ يسارَ الرقم في المنصة كلها |
| `cfbench/r183tab.mjs` | طرفٌ لطرف | ✔ | نجح 11 | R183 طلبُ تبويب مدير النظام يغلب الاستعادة |
| `cfbench/r183ui.mjs` | طرفٌ لطرف | ✔ | نجح 23 | R183 الروابطُ على الجوال والبحثُ بالأرقام العربية |
| `cfbench/r184pen.mjs` | طرفٌ لطرف | ✔ | نجح 36 | R184 التحريرُ على الكانفس بالقلم والإصبع |
| `cfbench/r185hist.mjs` | طرفٌ لطرف | ✔ | — |  |
| `cfbench/r187.mjs` | طرفٌ لطرف | ✔ | نجح 42 | R187 الجدولُ الشهريُّ بالورديات والفاصلُ العالميّ |
| `cfbench/r188.mjs` | طرفٌ لطرف | ✔ | نجح 52 | R188 عرضٌ فقط · سجلُّ التحليلات · ألف/مليون |
| `cfbench/r189.mjs` | طرفٌ لطرف | ✔ | نجح 35 | R189 الفاصلُ المعروض «-» |
| `cfbench/r190.mjs` | طرفٌ لطرف | ✔ | نجح 108 | R190 سجلُّ التشغيل الميداني · الاستيراد · مديرُ القطاع |
| `cfbench/r191.mjs` | طرفٌ لطرف | ✔ | نجح 54 | R191 أعمدةُ السجل · القوائمُ المغلقة · شجرةُ الإدارات |
| `cfbench/r191role.mjs` | طرفٌ لطرف | ✔ | نجح 31 | R191 خانةُ «الدور» في نافذة المدير |
| `cfbench/r192.mjs` | طرفٌ لطرف | ✔ | نجح 24 | R192 اسمُ القطاع والإدارة العليا لمديرهما |
| `cfbench/racebase.mjs` | طرفٌ لطرف | ✔ | نجح 9 | سباقُ أساسِ الدمج — متصفحان |
| `cfbench/restore.mjs` | طرفٌ لطرف | ✔ | نجح 22 | الاستعادةُ وصدقُ تقريرها |
| `cfbench/savepath.mjs` | طرفٌ لطرف | ✔ | نجح 27 | مسارُ الحفظ غيرُ المتزامن |
| `cfbench/tasks264_p2ui.mjs` | طرفٌ لطرف | ✔ | نجح 33 | KIVO_265 نظامُ المهام — الإسنادُ والاستلامُ والتوثيقُ والمراجعة والتكرار بالأدوار · العزل  |
| `cfbench/tkclock.mjs` | طرفٌ لطرف | ✔ | نجح 29 | عدّاداتُ المهام بلا إعادة رسم |
| `cfbench/typesafe.mjs` | طرفٌ لطرف | ✔ | نجح 13 | سلامةُ البيانات تحت الأداء |
| `cfbench/xss.mjs` | طرفٌ لطرف | ✔ | نجح 11 | KIVO_244 AUD-006 مسبارُ XSS المخزَّن — 29 شاشة (متصفح) |
| `cfbench/zcodes.mjs` | طرفٌ لطرف | ✔ | نجح 24 | R178 رموزُ خيارات المصلى |
| `cfbench/a11y.mjs` | بصريّ · إتاحة · أجهزة | ✔ | نجح 5 | KIVO_253 AUD-020 سقّاطةُ الإتاحة — axe على 32 شاشة حقيقية (KIVO_263 · ترتيبُ العناوين) (مت |
| `cfbench/k250vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k251vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k252vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k253devices.mjs` | بصريّ · إتاحة · أجهزة | ✔ | نجح 31 | KIVO_254 SOT-053/054/057 مصفوفةُ الأجهزة — 5 أجهزة × 14 شاشة · لمسٌ (سقّاطةٌ مع الحاشية) · |
| `cfbench/k253vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k254focus.mjs` | بصريّ · إتاحة · أجهزة | ✔ | نجح 15 | KIVO_254 RM-3 البند ٧ لوحةُ المفاتيح — التنقّلُ الـ11 · الطيّ · المستخدم · ترتيبُ Tab · حل |
| `cfbench/k254vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k255vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k256vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k257vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k258layout.mjs` | بصريّ · إتاحة · أجهزة | ✔ | نجح 12 | KIVO_261 SOT-133/153 الانحدارُ البصريُّ الهندسي — 7 أجهزة (+320 · 360) × 14 شاشة · 0 قصٍّ  |
| `cfbench/k258vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k259vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k260vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k261vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k262vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k263vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k264vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/k265vis.mjs` | بصريّ · إتاحة · أجهزة | — | — |  |
| `cfbench/pointer.mjs` | بصريّ · إتاحة · أجهزة | ✔ | نجح 18 | R171 طبقةُ إدخال الكانفس |
| `cfbench/theme248.mjs` | بصريّ · إتاحة · أجهزة | ✔ | نجح 120 | السمةُ الحقيقية فاتح/داكن (theme248 — طبقاتُ الرموز · أنماطٌ تقبل تصغير esbuild) |
| `cfbench/visual.mjs` | بصريّ · إتاحة · أجهزة | ✔ | نجح 75 | الإقفالُ البصريّ — لا تمويهَ ولا مرشِّحَ ليليّاً |
| `cfbench/bigmap243.mjs` | أداء · حِمل · تحمّل | ✔ | نجح 8 | R169-CC2 سقفُ الخريطة الأصلية (خريطةٌ اصطناعية بديلة) |
| `cfbench/bkbig243.mjs` | أداء · حِمل · تحمّل | ✔ | نجح 6 | R169-CC2 نسخةٌ بخرائطَ ضخمة (خريطةٌ اصطناعية بديلة) |
| `cfbench/imgcache.mjs` | أداء · حِمل · تحمّل | ✔ | نجح 23 | ذاكرةُ صور الجلسة |
| `cfbench/k250cache.mjs` | أداء · حِمل · تحمّل | — | — |  |
| `cfbench/k250lazy.mjs` | أداء · حِمل · تحمّل | — | — |  |
| `cfbench/k251cache.mjs` | أداء · حِمل · تحمّل | — | — |  |
| `cfbench/k251lazy.mjs` | أداء · حِمل · تحمّل | — | — |  |
| `cfbench/k252cache.mjs` | أداء · حِمل · تحمّل | — | — |  |
| `cfbench/k252lazy.mjs` | أداء · حِمل · تحمّل | — | — |  |
| `cfbench/k253cache.mjs` | أداء · حِمل · تحمّل | ✔ | نجح 21 | KIVO_242 G6 التخزينُ والرؤوس (k243cache — البناءُ من مصدر المرشَّح) |
| `cfbench/k253lazy.mjs` | أداء · حِمل · تحمّل | ✔ | نجح 29 | KIVO_242 G10 الصفحاتُ الكسولة · الحارس · نافذةُ الإصدارين (k243lazy — البناءُ من مصدر المر |
| `cfbench/k255soak.mjs` | أداء · حِمل · تحمّل | ✔ | نجح 7 | KIVO_255 SOT-050/151 الجلسةُ الطويلة — 30 دورة × 15 شاشة · الكومة/العقد/المستمعون (متصفح) |
| `cfbench/k258load.mjs` | أداء · حِمل · تحمّل | ✔ | نجح 11 | KIVO_259 SOT-150/166 الحِملُ والتزامن — لا تحديثَ ضائعاً · لا 5xx · السلامة · المقاييس (مح |
| `cfbench/perfui.mjs` | أداء · حِمل · تحمّل | ✔ | نجح 21 | أداءُ الواجهة — عقودٌ سلوكيّة |
| `cfbench/r186night243.mjs` | أداء · حِمل · تحمّل | ✔ | نجح 28 | R186 خرائطُ المواقع في الوضع الليلي (خريطةٌ اصطناعية بديلة للقسم ز) |
| `cfbench/reload.mjs` | أداء · حِمل · تحمّل | ✔ | نجح 26 | استعادةُ الموضع بعد التحديث |
