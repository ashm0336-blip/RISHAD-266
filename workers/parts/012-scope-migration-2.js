/* ═══ KIVO · R203 · Phase 4.5 — Scope Migration Design & Dry-Run + Identity Hardening على v24.9 (مولَّدٌ آلياً من registry10/gen_migration.py + migration_engine.js — لا يُحرَّر يدوياً) ═══
   الوثيقةُ المرجعية v24.9 · SHA-256 6e9aba634577b9ac09498edcb0a5b42453bf44c1509e6ae272281162d2a1cdde
   يُحمَّل بعد KIVO_SCOPE ولا يمسّه. الوضع: dry-run — KIVO_SCOPE_MIGRATION.dryRun(input, hooks) يستخرج الأدلةَ من البيانات الفعلية ويصنّف (exact · inferable-high-confidence · ambiguous · missing · conflicting)
   ويسقط الأثرَ على القراءة (KIVO_SCOPE.evaluateRead قبل/بعد) وعلى عدّادات الظلّ — ولا يكتب قيمةَ نطاقٍ قط (writes = 0). لا Enforcement · لا Default Deny · لا Filtering. */
var KIVO_SCOPE_MIGRATION_DATA = {"version":"v24.9","docSha256":"6e9aba634577b9ac09498edcb0a5b42453bf44c1509e6ae272281162d2a1cdde","phase":4.2,"mode":"dry-run","model":{"record":"bsdept:<d>:bassam_scope_v1 — سجلٌّ منفصل عن Permission Keys وعن bassam_perms_v1 (لا يُكتب في Phase 4.2)","ceiling":{"Site":{"mode":"ALL | list | unknown","list":"['f:<sid>', …] عند list","basis":"مصدرُ الدليل","at/by":"وقتُ الترحيل وفاعلُه (لاحقاً)"},"Zone/Element":{"mode":"ALL | list | unknown","list":"['z:<code>', 'gn:<num>', 'm:<id>', …] عند list"}},"employee":{"Site":{"mode":"inherit | list | single | unknown","value":"f:<sid> عند single","list":"[…] عند list","basis":"المصدر"},"Zone/Element":{"mode":"inherit | list | single | unknown"},"Shift":{"mode":"staffing-bound | unknown | n/a","value":"staffing_v3[y-m][ekey].shift (مشتقٌّ عند التقييم لا منسوخ)"}},"semantics":{"ALL":"كلُّ مواقع/عناصر خطة الإدارة الحالية والمستقبلية (ديناميكي) — يساوي القائمةَ المعدَّدة اليوم","inherit":"الموظفُ محدودٌ بسقف إدارته (ليس ALL بالدور: السقفُ نفسُه قد يكون list أو unknown)","unknown":"يبقى unknown في المحرّك حتى يُحسم — لا deny ولا allow"},"engineBinding":{"Site":"plan ⇒ f:<sid> · rounds ⇒ rounds:#<i> (موضعياً عبر floors[i]) · irshad/seized ⇒ loc (خارج هذا الترحيل)","Zone/Element":"الهويّاتُ نفسُها في الخطة والجولات (منسوخة)","Shift":"ctx.actorShift(y-m) من staffing_v3 — قائمٌ في المحرّك"}},"rules":[{"id":"R1","title":"الدورُ وحده ≠ ALL","text":"مديرُ الإدارة/مديرُ القطاع/مديرُ النظام لا ينالون ALL بالدور؛ سقفُ Site/Zone لإدارةٍ يأتي من سجلِّ السقف وحده؛ غيابُه ⇒ unknown:unmigrated-department-ceiling (D4‑04 كما هي)"},{"id":"R2","title":"GM = union","text":"سقفُ مدير القطاع = اتحادُ سقوف إدارات فرعه داخل سقف الفرع (ancChain)؛ يُقيَّم لكل إدارةٍ مستهدفة بسقفها، والإدارةُ ذاتُ السقف المجهول تبقى unknown عند استهدافها"},{"id":"R3","title":"super يحترم سقفَ الإدارة المستهدفة","text":"على الموارد التشغيلية (مفاتيحُ bsdept:<d>:…) يخضع مديرُ النظام لسقف الإدارة المستهدفة؛ الموارد المنصّية خارج ذلك"},{"id":"R4","title":"Shift manager semantics بلا تغيير","text":"فاعلو السقف (dept · mgr · gm · super) غيرُ مقيدين بالوردية (n/a)؛ الموظفُ: Shift مربوطٌ بالجدول الشهري الحيّ (staffing-bound) لا قيمةً منسوخة"},{"id":"R5","title":"هويةُ الموقع والعنصر","text":"Site = plan.floors[].sid (f:<sid>)؛ العناصرُ بهويّات المحرّك (z:code · gn:num/g:id · m:id/mL:label)؛ طوابقُ يوم الجولة بلا sid ⇒ rounds:#i موضعياً (MP‑01)"},{"id":"R6","title":"لا قيمةَ بلا دليل","text":"missing/ambiguous/conflicting تبقى unknown؛ الترحيلُ لا يكتب إلا المحسوم (exact · inferable) وبعد تعميدٍ صريح — وPhase 4.2 لا تكتب شيئاً"}],"classes":[{"cls":"exact","criteria":"دليلٌ واحد أو مصادرُ متفقةٌ تماماً على القيمة","outcome":"يُحسم بعد الترحيل (قيمةٌ مقترحة بمصدرها)"},{"cls":"inferable-high-confidence","criteria":"استنتاجٌ عالي الثقة من قاعدةٍ ثابتة أو مصدرٍ واحدٍ مشتق (جولاتُ الشهر فقط · inherit لغير راصد الميدان · العلاقةُ الموضعية المتسقة)","outcome":"يُحسم بعد الترحيل — مع ذكر الأساس"},{"cls":"ambiguous","criteria":"تقاطعٌ جزئي بين المصادر · دليلٌ قديم (شهرٌ سابق) · تسكينٌ برمزٍ قديم · طابقٌ بلا sid","outcome":"يبقى unknown — يحتاج قراراً بشرياً أو توحيدَ بيانات"},{"cls":"missing","criteria":"لا دليلَ في البيانات الفعلية","outcome":"يبقى unknown — لا تُخترع قيمة"},{"cls":"conflicting","criteria":"مصادرُ منفصلةٌ متعارضة (الخطةُ ≠ الجولات · الجدولُ ≠ التقرير)","outcome":"يبقى unknown — يُحسم بتصحيح البيانات أولاً"}],"evidence":[{"dim":"Site","entity":"سقفُ الإدارة","sources":"plan.floors[].sid (+ name · num · index) · rounds_v1[day].d[i] ↔ floors[i] (موضعياً)","rule":"exact إذا كانت كلُّ الطوابق تحمل sid؛ ambiguous إن غاب sid؛ missing بلا خطة"},{"dim":"Site","entity":"الموظف (راصدُ الميدان المحض)","sources":"plan.floors[i].{zones,gates,marks}[].emp ∋ ekey · plan.months[y-m].d[i] · rounds_v1[y-m-*].d[i] (موضعياً)","rule":"exact: الخطة (أو الخطة = الجولات) · inferable: الجولات فقط · ambiguous: تقاطعٌ جزئي أو رمزٌ قديم · conflicting: منفصلان · missing: لا تسكين"},{"dim":"Site","entity":"الموظف (غيرُ راصد الميدان)","sources":"قاعدة AS‑IS: لا قيدَ فردياً خارج Assigned/fieldObsOnly","rule":"inferable: inherit (سقفُ الإدارة) — يحفظ السلوك؛ missing إن كان سقفُ الإدارة missing"},{"dim":"Zone/Element","entity":"سقفُ الإدارة","sources":"plan.floors[].{zones,gates,marks}[] بهويّات المحرّك","rule":"exact (ALL ديناميكي = عناصرُ الخطة)؛ missing بلا عناصر"},{"dim":"Zone/Element","entity":"الموظف","sources":"emp[] على العناصر (الخطة · لقطةُ الشهر · جولاتُ الشهر)","rule":"كقاعدة Site؛ القيمةُ قائمةُ هويّات العناصر"},{"dim":"Shift","entity":"الموظف","sources":"staffing_v3[y-m][ekey].shift (الشهرُ الجاري) · dreport_v1[y-m-*].shifts[*].roster[ekey].shift · staffing_v3[الشهر السابق] (قديم)","rule":"exact: جدولٌ حيّ (يوافقه التقرير أو لا تقرير) · ambiguous: تغييرٌ داخل الشهر / تقريرٌ بلا جدول / شهرٌ سابق فقط · conflicting: الجدولُ ≠ التقرير · missing: لا شيء"}],"readiness":{"classes":[{"cls":"intentionally session-global","text":"تقرؤه كلُّ جلسة بطبيعته (تصفّح · هوية · حسابُ الورقة) — يبقى بلا مفتاح قراءة"},{"cls":"super-only","text":"لا يقرؤه إلا مديرُ النظام (يُفرض بالاسم أو بالمورد المجهول)"},{"cls":"technical state","text":"راياتُ ترحيلٍ أو طوابعُ أو حالةٌ تقنية — بلا قيمةٍ تشغيلية للجلسة"},{"cls":"should eventually receive explicit read permission/scope","text":"مرشَّحٌ لمفتاح قراءةٍ صريح أو إسقاطِ نطاقٍ (Department/Own) في مرحلةٍ لاحقة — لا تغييرَ الآن"}],"table":[{"resource":"bassam_auth_users_v1","cls":"intentionally session-global","target":"intentionally session-global","note":"الحساباتُ بلا بصمات (stripPh) لعرض الأسماء والأدوار في كل الصفحات"},{"resource":"bassam_perms_v1","cls":"intentionally session-global","target":"should eventually receive explicit read permission/scope","note":"تحمل أوراقَ كل الإدارات لكل جلسة؛ الواجهةُ تحتاج ورقةَ إدارة الجلسة فقط ⇒ مرشَّحٌ لإسقاط Department مستقبلاً"},{"resource":"bassam_depts_v1","cls":"intentionally session-global","target":"intentionally session-global","note":"شجرةُ الإدارات للتصفّح والعرض"},{"resource":"bassam_gdepts_v1","cls":"intentionally session-global","target":"intentionally session-global","note":"القطاعات/الإداراتُ العليا للتصفّح"},{"resource":"bassam_platform_v1","cls":"intentionally session-global","target":"intentionally session-global","note":"وحداتُ المنصة والهوية"},{"resource":"bassam_notif_cfg_v1","cls":"intentionally session-global","target":"intentionally session-global","note":"إعداداتُ التنبيهات لكل جلسة"},{"resource":"bassam_bc_v1","cls":"intentionally session-global","target":"intentionally session-global","note":"التعاميمُ لكل المستخدمين"},{"resource":"bassam_notif_sys_v1","cls":"super-only","target":"super-only","note":"canRead0 يرفضها لغير super بالاسم (K_NSYS)"},{"resource":"bassam_struct_seed_v1","cls":"technical state","target":"super-only","note":"رايةُ بذر الهيكل — لا تحتاجها جلسةُ موظف"},{"resource":"bassam_perm_admsubs_v2","cls":"technical state","target":"super-only","note":"رايةُ ترحيل تبويبات الإعدادات"},{"resource":"bassam_last_full_export_v1","cls":"technical state","target":"super-only","note":"طابعُ النسخة الشاملة — معلومةٌ إدارية"},{"resource":"bassam_perm_help_v1","cls":"technical state","target":"super-only","note":"رايةُ ترحيلٍ لمرّة"},{"resource":"bassam_perm_irshad_cap_v1","cls":"technical state","target":"super-only","note":"رايةُ ترحيلٍ لمرّة"},{"resource":"bassam_perm_seized_cap_v1","cls":"technical state","target":"super-only","note":"رايةُ ترحيلٍ لمرّة"},{"resource":"bassam_perm_leaf_v1","cls":"technical state","target":"super-only","note":"رايةُ ترحيلٍ لمرّة"},{"resource":"bassam_perm_mgr_explicit_v1","cls":"technical state","target":"super-only","note":"رايةُ ترحيلٍ لمرّة"},{"resource":"bassam_irshad_retro_v1","cls":"technical state","target":"should eventually receive explicit read permission/scope","note":"حالةُ نوافذ الاستدراك (dept-state): super-only عند boot اليوم؛ مسارُها المعلَن GET /api/retro لقارئ سجلات الاسترشاد ⇒ مرشَّحٌ لربطٍ صريح بـir.rec.view + Department"},{"resource":"bassam_seized_retro_v1","cls":"technical state","target":"should eventually receive explicit read permission/scope","note":"كسابقه لسجلات المضبوطات (sz.rec.view + Department)"},{"resource":"bassam_profile_v1","cls":"intentionally session-global","target":"should eventually receive explicit read permission/scope","note":"موردُ قاعدةٍ (rule) بلا مفاتيح: ملفُّ الجلسة الشخصي — مرشَّحٌ لمفتاح قراءةٍ Own صريح"},{"resource":"bassam_first_boot_v1","cls":"technical state","target":"technical state","note":"رايةٌ تقنية تُكتب مرّة"},{"resource":"bassam_demo_purged_v1","cls":"technical state","target":"technical state","note":"رايةٌ تقنية تُكتب مرّة"}]},"contract":{"scope":"راصدُ الميدان (fieldObsOnly) على bassam_rounds_v1 — simulation فقط؛ لا filtering في Phase 4.2","keep":[["الحاويات","يومُ الجولة (t · ap · shAp · off …) وكلُّ طوابقه (hidePaths · hideGates · hideMarks …) — كاملةً ومتماسكة؛ لا يُحذف طابقٌ لأنه بلا عناصر مسنَدة"],["العناصرُ المسنَدة (emp ∋ ekey)","كاملةً بحقول الرصد (FIELD_KEYS) — وهي mySpots"],["العناصرُ غيرُ المسنَدة","هيكلٌ للرسم: الهويةُ (code/num/label/id) والهندسةُ (d · cx · cy · x · y · rawA) وemp[] (لحساب mySpots) — بلا حقول الرصد"],["المسارات (paths)","كاملةً (لا تسكينَ ولا حالةَ رصد عليها)"],["الخطة (bassam_plan_v1)","سياقُ رسمٍ: الطوابقُ وهندسةُ العناصر كاملةً — لا تُحجب"]],"redact":["fst","flow","fAt","fBy","fKind","fLog","closed","off","cAt","cAtMs","cWhy","cBy"],"pending":["pc · count (كثافةُ المصليات — بياناتُ محرّر الجولات): قرارُ حجبها عن غير المسنَد يُتّخذ عند Enforcement"],"invariants":[["containersCoherent","كلُّ طوابق اليوم محفوظة ⇒ كلُّ عنصرٍ مسنَد حاويتُه موجودة"],["geometryPreserved","عددُ عناصر الرسم قبل الإسقاط = بعده (الهياكلُ تحفظ الهوية والهندسة) ⇒ الخريطةُ لا تنكسر"],["mySpotsEqual","mySpots (الواجهة: emp ∩ {ekey, eid, nid, name}) = المحفوظ (الخادم: emp ∋ ekey) — يخفق مع تسكينٍ برمزٍ قديم (legacyOnly > 0) ⇒ توحيدُ المفتاح قبل أي filtering"],["fieldStateHiddenOnStubs","لا حقلَ رصدٍ على هيكلٍ غيرِ مسنَد"]]},"nf01":{"id":"NF‑01","title":"Field Flow Kind Constraint","status":"documented — no behavior change (Hardening candidate)","asis":[["الواجهة","BassamField.flowOn(kind) { return kind !== 'zones'; } — المسارُ (دخول/خروج) للأبواب والمعالم فقط؛ المصلّى مكانٌ لا ممرّ (KINDS = gates · zones · marks)"],["الخادم","FIELD_KEYS = {fst, flow, fAt, fBy, fKind, fLog, closed, off, cAt, cAtMs, cWhy, cBy} × FIELD_KINDS = {gates, zones, marks}: fieldObsOnly يقبل flow على المصلّى (zones) إن كان الفاعلُ مسنَداً عليه — لا قيدَ بالنوع"],["الظلّ","المصنِّف (KIVO_GUARDS) يصنّف أيَّ حقلٍ من FIELD_KEYS على zones/gates/marks إلى lens.<col>.status.change — بلا تمييزٍ للمسار"]],"tobe":[["gates","flow مسموح"],["marks","flow مسموح"],["zones","المسارُ الاتجاهي (flow) ممنوع — المصلّى يُرصد بحالته (fst/off/closed) فقط"]],"proposal":"سياسةُ حقلٍ خاصةٌ بالنوع (kind-specific field policy): fp.field.flow.kind — FIELD_KEYS_BY_KIND = { gates: FIELD_KEYS, marks: FIELD_KEYS, zones: FIELD_KEYS − {flow} }؛ تُطبَّق في fieldObsOnly (راصدُ الميدان) وفي مصنِّف الظلّ (lens.zones.status.change لا يقبل flow) — عند مرحلة Hardening بتعميدٍ صريح","impact":[["السلوكُ الحالي","كتابةُ zones[].flow عبر API مباشرةً (لا من الواجهة) مقبولةٌ اليوم لراصد الميدان المسنَد ولمحرّر الجولات؛ بعد الإصلاح تُرفض (deny:field / shape)"],["الواجهة","لا تتأثر — لا تكتب flow على المصلّى أصلاً"],["البياناتُ القائمة","يُحصى في Dry-Run كلُّ مصلّى يحمل flow في الجولات (zonesWithFlow) — دليلُ استعمالٍ خارج الواجهة إن وُجد؛ لا تنظيفَ الآن"],["الظلّ","مفتاحٌ أو سياسةُ حقلٍ جديدة في السجل (fp.field.flow.kind) — لا يغيّر مفاتيحَ الصلاحيات الـ269"],["الخطر","منخفض: الحقلُ تشغيليٌّ لا أمني؛ الأثرُ الوحيد رفضُ كتاباتٍ لا تُنتجها الواجهة"]],"tests":["راصدُ ميدانٍ مسنَد يكتب gates[].flow ⇒ ok · marks[].flow ⇒ ok · zones[].flow ⇒ deny (بعد الإصلاح) — واليومَ ok (يُثبَّت AS‑IS أولاً)","محرّرُ الجولات يكتب zones[].flow عبر API ⇒ القرارُ في Hardening (رفضُ shape أم قبول)","الواجهة: flowOn(zones) = false ثابتٌ · لا زرَّ مسارٍ على المصلّى في صفحة الرصد","الظلّ: المصنِّفُ يُصدر lens.zones.status.change لـfst/off وحدها على المصلّى؛ flow على المصلّى يُعلَم unexpected-field"]},"telemetryNote":{"title":"سياقُ أرقام telemetry القراءة (P4.1.1): fieldViewReads مقابل bySelectedKey","fieldViewReads":"عددُ القراءات التي حمل فيها الفاعلُ field.view فعلاً (held) — مفتاحٌ مختارٌ بحقّ الحامل (150 في سيناريو KIVO_236)","bySelectedKey":"عددُ المرّات التي دخل فيها المفتاحُ قائمةَ التقييم (useKeys): المحمولُ عند الحامل + كلُّ مفاتيح المورد المربوطة عند مسبار قراءةٍ مرفوضة قديماً (route-probe:asis-deny) — 155 = 150 (held) + 5 (route-probe على موارد مربوطة بـfield.view: قراءاتُ إدارةٍ أخرى/خارج الفرع لجولاتٍ وخطة)","fieldViewProbeReads":"عدّادٌ جديد في KIVO_237 (fieldViewProbeReads) يفصل الخمسة صراحةً: bySelectedKey[field.view] = fieldViewReads + fieldViewProbeReads"},"decisions":[{"id":"P4.2‑01","title":"Migration Model & Schema"},{"id":"P4.2‑02","title":"Evidence Extraction"},{"id":"P4.2‑03","title":"Dry-Run Classification"},{"id":"P4.2‑04","title":"Read Enforcement Readiness"},{"id":"P4.2‑05","title":"Read Projection Contract — رصدُ الميدان"},{"id":"P4.2‑06","title":"NF‑01 — Field Flow Kind Constraint (توثيق)"},{"id":"P4.2‑07","title":"Documentation cleanup + سياقُ الأرقام"},{"id":"MP‑01","title":"Migration prerequisite — هويةُ طوابق الجولة"}],"notChanged":["مفاتيح الصلاحيات: 269 (255 نشطة + 14 محجوزة) · scopeDims · الحرّاس · محرّكُ النطاق · جدولُ ربط القراءة — كما في v24.5.1","لا كتابةَ قيم نطاق · لا Enforcement · لا Default Deny · لا Filtering · لا Permission Migration · لا Navigation · لا إصلاحَ NF‑01 · لا R190/R182 · لا تنظيفَ كودٍ ميت · لا Phase 5 · لا نشر"],"identity":{"decisions":[{"id":"IH‑01","title":"Stable Site identity","final":"طابقُ الجولة الجديد يحمل sid طابق الخطة المصدر — لا هويةَ موضعية جديدة (rounds:#i) لأي طابقٍ يُنشأ بعد KIVO_238؛ المحرّكُ يقرأ طابقَ الجولة ذا sid بهوية الخطة نفسِها f:<sid>"},{"id":"IH‑02","title":"Stable Element identity (uid)","final":"حقلٌ واحد ثابت uid لكل عنصرٍ تشغيلي (zones · gates · marks · paths) يُولَّد عند الإنشاء ولا يُشتقّ من label/code/num ولا يُعاد استعمالُ eid الموظف أو iid الخريطة؛ يُحفظ عبر الخطة → لقطة الشهر → الجولات → المزامنة/النسخ"},{"id":"IH‑03","title":"Assignment canonicalization (ekey only)","final":"كلُّ تسكينٍ جديد في emp[] يخزّن ekey (= eid الموظف) فقط — محرّرُ الخطة (اللوحة · التوزيعُ التلقائي · النطاقات · النسخُ من جولة) والجولاتُ اليومية (التبديل · النقل · التراجع) والتقريرُ اليومي (كان قياسياً)؛ القراءةُ متسامحةٌ مع الرموز القديمة وتعرض أسماءً؛ مرآةُ الجذر plan.* تُصحَّح مع الحفظ"},{"id":"IH‑04","title":"Audit counting fix","final":"عدُّ أيام الجولات = مفاتيحُ التاريخ فقط؛ تُستثنى __pMig و m:* والمفاتيحُ التقنية"},{"id":"D4‑09","title":"Shift READ + WRITE scoped (قرارٌ مقفل)","final":"حيثما أعلن مفتاحٌ Shift في scopeDims يبقى النطاقُ نافذاً على القراءة والكتابة معاً (staffing-bound للموظف · n/a لفاعلي السقف — R4)؛ لا يُحوَّل Shift إلى write-only؛ قواعدُ السقف (R1…R3 · D4‑04) بلا تغيير"}],"schema":{"element":{"field":"uid","shape":"'u' + base36(time) + base36(random) + base36(random) — عشوائيٌّ غيرُ مشتقّ","immutability":"يُولَّد مرّةً عند الإنشاء ولا يتغيّر بتعديل الرمز/الرقم/الاسم/الهندسة ولا بالنسخ بين الأشهر أو إلى الجولات","notDerivedFrom":"label · code · num · name · eid الموظف · iid الخريطة · eid التدقيق (R169)","kinds":"zones · gates (بما فيها الفتحات) · marks · paths"},"site":{"field":"sid","onPlan":"موجودٌ منذ R169 (BassamAudit.newId(\"s_\") عند الحفظ · stampList)","onRounds":"جديد: كلُّ طابق جولةٍ يُنشأ بعد KIVO_238 يحمل sid طابق الخطة المصدر (الإنشاءُ من الخطة · النسخُ من يومٍ آخر · طابقٌ جديد في المزامنة · استيرادُ الحصر)","legacy":"طوابقُ الجولات القديمة بلا sid تبقى موضعية (rounds:#i) حتى backfill معمَّد (MP‑01 proposal)"},"assignment":{"token":"ekey = eid الموظف (BassamEmp.key) — الرمزُ الوحيد للتسكينات الجديدة","read":"متسامحة: eid · nid · الاسم (BassamEmp.tokens/resolve) تُعرض أسماءً وتُقارن بالرمز القياسي","legacy":"التسكيناتُ القديمة (أسماء · nid) لا تُكتب ولا تُحوَّل إلا عند لمسها من المستخدم (تبديلٌ) أو بترحيلٍ معمَّد (Canonicalization proposal)"}},"engineBinding":{"ID.zones":"e.uid ? 'u:'+uid : (e.code || e.ser || e.name || e.id || e.eid → 'z:'+v)","ID.gates":"e.uid ? 'u:'+uid : (g:id | gl:gid/leafNo | gg:gid | gn:num | gL:label)","ID.marks":"e.uid ? 'u:'+uid : (m:id | mL:label)","ID.paths":"e.uid ? 'u:'+uid : (p:id|code|name)","rounds floor Site":"fl.sid ? 'f:'+fl.sid : 'rounds:'+(fl.name || fl.num || '#'+i)"},"migration":[{"item":"uid للعناصر القائمة","proposal":"لكل عنصرٍ بلا uid في الخطة ولقطات الأشهر والجولات: uid واحدٌ يُمنح لسلسلة العنصر نفسِه (الخطة ↔ اللقطة ↔ الجولات) بربطٍ عبر (الطابق · النوع · الهويةُ القديمة)؛ الهويّاتُ المكرَّرة داخل الطابق (معالمُ بالاسم نفسِه مثلاً) تُربط موضعياً إن تساوى العددُ وإلا تُعلَّم manual","mode":"proposal-only — لا كتابة"},{"item":"sid لطوابق الجولات القديمة (MP‑01)","proposal":"old → proposed sid من لقطة شهر اليوم أو أفضلِ طابق خطةٍ بتداخل الهويّات أو الموضع (high · medium · low) مع الدليل","mode":"proposal-only — لا backfill تلقائي"},{"item":"توحيدُ التسكينات القديمة","proposal":"كلُّ رمزٍ غيرِ ekey (nid · اسم · مجهول) → ekey المقترح مع الثقة؛ مرآةُ الجذر (plan.zones/gates/marks/paths = الطابقُ النشط عند الحفظ) تُحصى وتُصحَّح تلقائياً مع أول حفظٍ بعد تصحيح الطابق","mode":"proposal-only — لا كتابة"}],"auditCounting":[{"item":"أيامُ الجولات (rounds day count)","rule":"مفاتيحُ التاريخ فقط ^\\d{4}-\\d{1,2}-\\d{1,2}$ — تُستثنى __pMig و m:* (أقفالُ الشهر) وأيُّ مفتاحٍ تقني","note":"المحرّكُ (parseDay) كان يفعل ذلك؛ أدواتُ الجرد (p42prod) صُحِّحت"},{"item":"عناصرُ الجولات","rule":"تُعدّ داخل طوابق الأيام (d[i]) فقط — لقطاتُ الاعتماد (shAp[*].snap) لا تُعدّ عناصرَ تشغيلية","note":"تجنّبُ العدّ المزدوج"}]}};
var KIVO_SCOPE_MIGRATION = (function (M, S, R) {
  'use strict';
  /* ═══ Phase 4.2 (v24.6) — Scope Migration Design & Dry-Run: محرّكُ الجرد والتصنيف والإسقاط — قراءةٌ فقط، لا يكتب قيمةَ نطاقٍ قط ═══
     يستخرج الأدلةَ من البيانات الفعلية (الخطة · الجولات · الجدولُ الشهري · التقريرُ اليومي · التسكين emp[]) ويصنّف كلَّ إدارةٍ (سقفُ Site · سقفُ Zone/Element)
     وكلَّ موظفٍ (Site · Zone/Element · Shift) إلى: exact · inferable-high-confidence · ambiguous · missing · conflicting — ولا يخترع قيمةً عند غياب الدليل.
     ثم يسقط (simulation) أثرَ القيم المقترحة على القراءة بالمحرّك نفسِه (KIVO_SCOPE.evaluateRead) وعلى عدّادات الظلّ — بلا filtering ولا كتابة. */
  var DIMS = ['Site', 'Zone/Element', 'Shift'], SE = ['Site', 'Zone/Element'];
  var CLS = ['exact', 'inferable-high-confidence', 'ambiguous', 'missing', 'conflicting'];
  var RESOLVED = { 'exact': 1, 'inferable-high-confidence': 1 };
  /* حقولُ حالة الرصد كما في الخادم (FIELD_KEYS) — تُستعمل في عقد الإسقاط (ما يُحجب عن العنصر غيرِ المسنَد مستقبلاً) وفي NF‑01 */
  var FIELD_KEYS = ['fst', 'flow', 'fAt', 'fBy', 'fKind', 'fLog', 'closed', 'off', 'cAt', 'cAtMs', 'cWhy', 'cBy'];
  var EMP_COLS = ['gates', 'zones', 'marks'], ALL_COLS = ['zones', 'gates', 'marks', 'paths'];   /* التسكينُ على gates/zones/marks؛ سقفُ العناصر يشمل المسارات أيضاً (بُعدُ Zone/Element في المحرّك يقيس p: أيضاً) */
  var SE_RES = ['bassam_plan_v1', 'bassam_rounds_v1'], SH_RES = ['bassam_dreport_v1', 'bassam_staffing_v3'], RES_FIELD = { bassam_plan_v1: 'plan', bassam_rounds_v1: 'rounds', bassam_dreport_v1: 'dreport', bassam_staffing_v3: 'staffing' };
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function obj(x) { return isObj(x) ? x : {}; }
  function str(x) { return x == null ? '' : String(x); }
  function has(a, v) { for (var i = 0; i < a.length; i++) if (String(a[i]) === String(v)) return true; return false; }
  function uniq(a) { var s = {}, o = [], i; for (i = 0; i < a.length; i++) { var k = String(a[i]); if (!s[k]) { s[k] = 1; o.push(a[i]); } } return o; }
  function inter(a, b) { var o = [], i; for (i = 0; i < a.length; i++) if (has(b, a[i])) o.push(a[i]); return o; }
  function cnt() { var o = {}, i; for (i = 0; i < CLS.length; i++) o[CLS[i]] = 0; o['n/a'] = 0; return o; }
  /* هويّاتُ العناصر — نسخةٌ حرفية من مقيّم النطاق (KIVO_SCOPE · ID) كي تتطابق قيمُ الجرد مع ما يقيسه المحرّك */
  /* KIVO_238 · IH‑02: الهويةُ الثابتة uid أولاً ('u:'+uid) — وإلا المخطّطُ القديم للسجلات القديمة */
  function uidOf(e) { return isObj(e) && e.uid != null && e.uid !== '' ? 'u:' + e.uid : null; }
  var ID = {
    zones: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; var v = e.code || e.ser || e.name || e.id || e.eid; return v == null || v === '' ? null : 'z:' + v; },
    gates: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; if (e.id != null && e.id !== '') return 'g:' + e.id; if (e.gid != null && e.leafNo != null) return 'gl:' + e.gid + '/' + e.leafNo; if (e.gid != null) return 'gg:' + e.gid; if (e.num != null && e.num !== '') return 'gn:' + e.num; if (e.label) return 'gL:' + e.label; return null; },
    marks: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; if (e.id != null && e.id !== '') return 'm:' + e.id; if (e.label) return 'mL:' + e.label; return null; },
    paths: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; var v = e.id || e.code || e.name; return v == null || v === '' ? null : 'p:' + v; },
    floors: function (e, i) { if (!isObj(e)) return '#' + i; var v = e.sid || e.id; return v == null || v === '' ? '#' + i : 'f:' + v; }
  };
  function parseDay(k) { var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(k)); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function mkOf(T) { return T.y + '-' + T.m; }
  function prevMonth(T) { return T.m === 1 ? { y: T.y - 1, m: 12 } : { y: T.y, m: T.m - 1 }; }
  /* رموزُ الموظف كما تطابقها الواجهة (BassamEmp.tokens: eid · nid · name) + مفتاحُه — الخادمُ يطابق ekey وحده (fieldObsOnly) */
  function tokensOf(ekey, employees) {
    var t = {}; t[String(ekey)] = 1;
    for (var i = 0; i < arr(employees).length; i++) { var e = employees[i]; if (!isObj(e)) continue; var k = e.eid || e.nid || e.name; if (String(k) !== String(ekey)) continue; [e.eid, e.nid, e.name].forEach(function (x) { if (x != null && x !== '') t[String(x)] = 1; }); }
    return t;
  }
  function matchEmp(emp, toks, ekey) { if (has(emp, ekey)) return 'ekey'; for (var i = 0; i < emp.length; i++) if (toks[String(emp[i])]) return 'legacy-token'; return null; }
  function floorElements(f, cols) {
    var out = [], c, i, CC = cols || EMP_COLS; f = obj(f);
    for (c = 0; c < CC.length; c++) { var col = CC[c], a = arr(f[col]); for (i = 0; i < a.length; i++) { var id = ID[col](a[i]); if (id == null) id = '#' + i; var el = obj(a[i]); out.push({ col: col, idx: i, id: id, emp: arr(el.emp).map(String), flow: el.flow != null && el.flow !== '' }); } }
    return out;
  }
  function planSites(plan) {
    var P = obj(plan), fl = arr(P.floors), out = [], i;
    /* KIVO_238 · IH‑03: خطةٌ قديمة أحاديةُ الطابق (جذرُ plan.zones/gates/marks/paths بلا floors) تُقرأ طابقاً واحداً موضعياً */
    if (!fl.length && (arr(P.zones).length || arr(P.gates).length || arr(P.marks).length || arr(P.paths).length)) fl = [{ zones: P.zones, gates: P.gates, marks: P.marks, paths: P.paths, name: P.name }];
    for (i = 0; i < fl.length; i++) { var f = obj(fl[i]); out.push({ idx: i, sid: f.sid == null || f.sid === '' ? null : String(f.sid), id: ID.floors(f, i), roundsId: 'rounds:#' + i, name: str(f.name), num: f.num == null ? null : f.num, elements: floorElements(f), allElements: floorElements(f, ALL_COLS) }); }
    return out;
  }
  /* ── سقفُ الإدارة (Site · Zone/Element): الدليلُ الخطةُ نفسُها — floors[].sid والعناصرُ داخلها؛ العلاقةُ مع الجولات موضعية (MP‑01) ── */
  function roundsRelation(sites, rounds) {
    var days = Object.keys(obj(rounds)).filter(function (k) { return !!parseDay(k); }), same = 0, n = 0, empty = 0, diff = [], i;
    for (i = 0; i < days.length; i++) { var rec = obj(rounds[days[i]]); if (!Array.isArray(rec.d)) continue; if (!rec.d.length) { empty++; continue; } n++; if (rec.d.length === sites.length) same++; else if (diff.length < 10) diff.push({ day: days[i], floors: rec.d.length, planFloors: sites.length }); }
    var withSid = 0; for (i = 0; i < days.length; i++) { var r2 = obj(rounds[days[i]]); if (Array.isArray(r2.d) && r2.d.some(function (f) { return isObj(f) && f.sid != null && f.sid !== ''; })) withSid++; }
    return { days: n, emptyDays: empty, positionalMatch: same, mismatchDays: n - same, mismatchSamples: diff, daysWithSid: withSid, cls: n === 0 ? 'missing' : (n === same ? 'inferable-high-confidence' : 'ambiguous'),
             basis: 'MP‑01: طوابقُ يوم الجولة لا تحمل sid (الواجهة تنشئها من floors[i] بالموضع) ⇒ علاقةُ rounds.d[i] ↔ plan.floors[i] موضعية؛ مطابقةُ العدد في كل الأيام تجعلها inferable، واختلافُه يجعلها ambiguous' };
  }
  function deptCeiling(d, data) {
    var sites = planSites(obj(data).plan), i, elems = [], ids = [], k;
    for (i = 0; i < sites.length; i++) { ids.push(sites[i].id); elems = elems.concat(sites[i].allElements.map(function (e) { return e.id; })); }
    elems = uniq(elems);
    /* عناصرُ الجولات (كلُّ الأيام): قد تحوي عناصرَ ليست في الخطة الحالية (أضيفت في يومٍ أو حُذفت من الخطة لاحقاً) — سقفُ ALL ديناميكي يشمل بياناتِ الإدارة كلَّها؛ تُحصى «غيرُ المخطَّطة» شاهداً */
    var rnd = obj(obj(data).rounds), rElems = [], planSet = {}; for (i = 0; i < elems.length; i++) planSet[elems[i]] = 1;
    for (k in rnd) { if (!parseDay(k)) continue; var dl = arr(obj(rnd[k]).d); for (i = 0; i < dl.length; i++) { var fe = floorElements(dl[i], ALL_COLS); for (var q = 0; q < fe.length; q++) rElems.push(fe[q].id); } }
    rElems = uniq(rElems); var unplanned = rElems.filter(function (x) { return !planSet[x]; }), universe = uniq(elems.concat(rElems));
    var rel = roundsRelation(sites, obj(data).rounds), noSid = sites.filter(function (s) { return !s.sid; }).length;
    var Site = sites.length
      ? { cls: noSid ? 'ambiguous' : 'exact', proposed: { mode: noSid ? 'unknown' : 'ALL', enumerated: ids, roundsPositional: sites.map(function (s) { return s.roundsId; }) },
          evidence: [{ source: 'plan.floors[].sid', value: ids }, { source: 'rounds.d[i] ↔ plan.floors[i] (positional)', value: rel.cls + ' (' + rel.positionalMatch + '/' + rel.days + ' days)' }],
          basis: noSid ? ('طابقٌ بلا sid (' + noSid + ') — هويةُ الموقع غيرُ ثابتة؛ لا يُقترح سقفٌ قبل ترحيل الهوية') : 'سقفُ الإدارة = خطتُها كاملةً (ALL ديناميكي = كلُّ floors[].sid الحالية والمستقبلية داخل خطتها؛ لا دليلَ على سقفٍ أضيق — AS‑IS لا يقيّد الإدارة داخل خطتها)' }
      : { cls: 'missing', proposed: { mode: 'unknown', enumerated: [] }, evidence: [], basis: 'لا خطةَ أو لا طوابقَ لهذه الإدارة — لا يُخترع سقف' };
    var ZE = elems.length
      ? { cls: 'exact', proposed: { mode: 'ALL', enumerated: universe, planElements: elems.length, roundsElements: rElems.length, unplannedInRounds: unplanned.length, unplannedSamples: unplanned.slice(0, 10) }, evidence: [{ source: 'plan.floors[].{zones,gates,marks,paths}[] (ID: z:/gn:/g:/m:/mL:/p:)', value: elems.length + ' elements' }, { source: 'rounds_v1[*].d[i].{zones,gates,marks,paths}[]', value: rElems.length + ' elements (' + unplanned.length + ' not in current plan)' }], basis: 'سقفُ العناصر = عناصرُ بيانات الإدارة كلُّها (الخطةُ ∪ الجولات · بما فيها المسارات) — ALL ديناميكي؛ العناصرُ غيرُ المخطَّطة في الجولات تُحصى شاهداً ولا تُستثنى؛ لا دليلَ على سقفٍ أضيق' }
      : { cls: 'missing', proposed: { mode: 'unknown', enumerated: [] }, evidence: [], basis: 'لا عناصرَ في خطة الإدارة' };
    return { dept: d, Site: Site, 'Zone/Element': ZE, sites: sites.map(function (s) { return { idx: s.idx, sid: s.sid, id: s.id, roundsId: s.roundsId, name: s.name, elements: s.allElements.length, assignable: s.elements.length }; }), elements: universe.length, planElements: elems.length, unplannedInRounds: unplanned.length, relation: rel };
  }
  /* ── تسكينُ الموظف: الخطةُ الحالية · لقطةُ الشهر · أيامُ الجولات في الشهر الجاري (موضعياً) ── */
  function assignmentsOf(ekey, toks, data, T, sites) {
    var out = { plan: [], month: [], rounds: [], legacyToken: 0, ekeyMatch: 0 }, i, k;
    var note = function (m) { if (m === 'legacy-token') out.legacyToken++; else out.ekeyMatch++; };
    for (i = 0; i < sites.length; i++) for (k = 0; k < sites[i].elements.length; k++) { var e = sites[i].elements[k], m = matchEmp(e.emp, toks, ekey); if (m) { note(m); out.plan.push({ site: sites[i].id, siteIdx: sites[i].idx, element: e.id, col: e.col, match: m }); } }
    var plan = obj(obj(data).plan), mo = obj(plan.months)[mkOf(T)], md = Array.isArray(mo) ? mo : arr(obj(mo).d);
    for (i = 0; i < md.length; i++) { var fe = floorElements(md[i]); for (k = 0; k < fe.length; k++) { var m2 = matchEmp(fe[k].emp, toks, ekey); if (m2) { note(m2); out.month.push({ site: sites[i] ? sites[i].id : '#' + i, siteIdx: i, element: fe[k].id, col: fe[k].col, match: m2 }); } } }
    var rounds = obj(obj(data).rounds), days = Object.keys(rounds);
    for (i = 0; i < days.length; i++) { var p = parseDay(days[i]); if (!p || p.y !== T.y || p.m !== T.m) continue; var dl = arr(obj(rounds[days[i]]).d); for (var fi = 0; fi < dl.length; fi++) { var fe2 = floorElements(dl[fi]); for (k = 0; k < fe2.length; k++) { var m3 = matchEmp(fe2[k].emp, toks, ekey); if (m3) { note(m3); out.rounds.push({ day: days[i], siteIdx: fi, site: sites[fi] ? sites[fi].id : '#' + fi, roundsSite: 'rounds:#' + fi, element: fe2[k].id, col: fe2[k].col, match: m3 }); } } } }
    return out;
  }
  /* تصنيفُ مجموعتَي قيم (الخطةُ ∪ لقطةُ الشهر) مقابل (الجولات): اتفاقٌ تام ⇒ exact · مصدرٌ واحد ⇒ exact/inferable · تقاطعٌ جزئي ⇒ ambiguous · انفصالٌ ⇒ conflicting · لا شيء ⇒ missing */
  function classifySets(A, B) {
    var a = uniq(A), b = uniq(B);
    if (!a.length && !b.length) return { cls: 'missing', values: [], basis: 'لا تسكينَ في الخطة ولا في جولات الشهر' };
    if (!b.length) return { cls: 'exact', values: a, basis: 'تسكينُ الخطة (floors/months emp[]) — لا جولاتَ مخالفة' };
    if (!a.length) return { cls: 'inferable-high-confidence', values: b, basis: 'تسكينُ جولات الشهر فقط (لقطاتٌ يومية من الخطة) — لا تسكينَ في الخطة الحالية' };
    var x = inter(a, b);
    if (x.length === a.length && x.length === b.length) return { cls: 'exact', values: a, basis: 'تسكينُ الخطة = تسكينُ الجولات' };
    if (!x.length) return { cls: 'conflicting', values: uniq(a.concat(b)), basis: 'تسكينُ الخطة وتسكينُ الجولات منفصلان (تغييرُ تسكينٍ لم يُطبَّق في أحدهما)' };
    return { cls: 'ambiguous', values: uniq(a.concat(b)), basis: 'تقاطعٌ جزئي بين الخطة والجولات' };
  }
  function siteEnum(siteId, sites) { var out = [siteId]; for (var i = 0; i < sites.length; i++) if (sites[i].id === siteId) out.push(sites[i].roundsId); if (/^#\d+$/.test(siteId)) out.push('rounds:' + siteId); return uniq(out); }
  function employeeSE(ekey, toks, data, T, D, fieldOnly, heldDims) {
    var sites = D.sites.map(function (s) { return { idx: s.idx, sid: s.sid, id: s.id, roundsId: s.roundsId, elements: [] }; });
    var full = planSites(obj(data).plan); for (var i = 0; i < full.length; i++) if (sites[i]) sites[i].elements = full[i].elements;
    var asg = assignmentsOf(ekey, toks, data, T, sites), out = {};
    var planSites_ = asg.plan.map(function (x) { return x.site; }).concat(asg.month.map(function (x) { return x.site; })), rndSites = asg.rounds.map(function (x) { return x.site; });
    var planEl = asg.plan.map(function (x) { return x.element; }).concat(asg.month.map(function (x) { return x.element; })), rndEl = asg.rounds.map(function (x) { return x.element; });
    var ev = [{ source: 'plan.floors[].{zones,gates,marks}[].emp', n: asg.plan.length }, { source: 'plan.months[' + mkOf(T) + '].d[].emp', n: asg.month.length }, { source: 'rounds_v1[' + mkOf(T) + '-*].d[i].emp (positional ↔ plan.floors[i])', n: asg.rounds.length }];
    if (!fieldOnly) {
      /* ليس راصدَ ميدانٍ محضاً: AS‑IS لا يقيّد الموظفَ بموقعٍ أو عنصرٍ خارج Assigned/fieldObsOnly ⇒ الترحيلُ الأمين = inherit (سقفُ الإدارة) — ليس ALL بالدور، بل الانعدامُ المثبَت لقيدٍ فردي */
      var inhBasis = 'AS‑IS: canWrite/canRead يقيّدان الموظف بسقف إدارته (capOnDept/deptInScope) فقط؛ القيدُ الفردي بالموقع/العنصر لا يوجد إلا لراصد الميدان المحض (fieldObsOnly ⇒ Assigned). inherit يحفظ السلوكَ ولا يساوي ALL (محدودٌ بسقف الإدارة)';
      for (var j = 0; j < SE.length; j++) if (heldDims[SE[j]]) out[SE[j]] = { cls: D[SE[j]].cls === 'missing' ? 'missing' : 'inferable-high-confidence', proposed: { mode: 'inherit' }, evidence: [{ source: 'AS‑IS rule (fieldObsOnly=false)', value: 'no employee-level restriction' }].concat(ev), basis: D[SE[j]].cls === 'missing' ? 'inherit يحتاج سقفَ إدارةٍ موجوداً — سقفُ الإدارة missing' : inhBasis, alsoAssigned: SE[j] === 'Site' ? uniq(planSites_.concat(rndSites)) : uniq(planEl.concat(rndEl)) };
      return { scope: out, assignments: asg };
    }
    if (heldDims.Site) {
      var cs = classifySets(planSites_, rndSites), vals = cs.values;
      var ent = { cls: cs.cls, proposed: RESOLVED[cs.cls] ? { mode: vals.length === 1 ? 'single' : 'list', value: vals.length === 1 ? vals[0] : null, list: vals, engineIds: uniq([].concat.apply([], vals.map(function (v) { return siteEnum(v, sites); }))) } : { mode: 'unknown', candidates: vals }, evidence: ev, basis: cs.basis };
      if (asg.legacyToken && !asg.ekeyMatch && RESOLVED[cs.cls]) { ent.cls = 'ambiguous'; ent.proposed = { mode: 'unknown', candidates: vals }; ent.basis += ' — التسكينُ برمزٍ قديم (eid/nid/name) لا بمفتاح الموظف: الواجهةُ تعدّه موقعَه والخادمُ (fieldObsOnly/Assigned) لا يقبله ⇒ يحتاج توحيدَ المفتاح قبل الترحيل'; }
      else if (RESOLVED[cs.cls] && vals.some(function (v) { return /^#\d+$/.test(String(v)); })) { ent.cls = 'ambiguous'; ent.proposed = { mode: 'unknown', candidates: vals }; ent.basis += ' — موقعُه طابقٌ بلا sid (هويةٌ موضعية #i غيرُ ثابتة · MP‑01) ⇒ لا يُرحَّل قبل تثبيت هوية الطابق'; }
      out.Site = ent;
    }
    if (heldDims['Zone/Element']) {
      var ce = classifySets(planEl, rndEl), ve = ce.values;
      var ent2 = { cls: ce.cls, proposed: RESOLVED[ce.cls] ? { mode: ve.length === 1 ? 'single' : 'list', value: ve.length === 1 ? ve[0] : null, list: ve, engineIds: ve } : { mode: 'unknown', candidates: ve }, evidence: ev, basis: ce.basis };
      if (asg.legacyToken && !asg.ekeyMatch && RESOLVED[ce.cls]) { ent2.cls = 'ambiguous'; ent2.proposed = { mode: 'unknown', candidates: ve }; ent2.basis += ' — التسكينُ برمزٍ قديم لا بمفتاح الموظف'; }
      out['Zone/Element'] = ent2;
    }
    return { scope: out, assignments: asg };
  }
  /* ── الوردية: الجدولُ الشهري الحيّ للشهر الجاري هو الدليلُ الصالح؛ التقريرُ اليومي شاهدٌ ثانٍ؛ الشهرُ السابق دليلٌ قديم لا يُرحَّل ── */
  function shiftOf(ekey, toks, data, T) {
    var staffing = obj(obj(data).staffing), cur = obj(staffing[mkOf(T)]), rec = null, k;
    for (k in cur) if (String(k) === String(ekey) || toks[String(k)]) { rec = obj(cur[k]); break; }
    var curShift = rec && rec.shift != null && rec.shift !== '' ? String(rec.shift) : null;
    var pm = prevMonth(T), prev = obj(staffing[mkOf(pm)]), prevShift = null; for (k in prev) if (String(k) === String(ekey) || toks[String(k)]) { var pr = obj(prev[k]); if (pr.shift != null && pr.shift !== '') prevShift = String(pr.shift); break; }
    var dr = obj(obj(data).dreport), days = Object.keys(dr), roster = [], i;
    for (i = 0; i < days.length; i++) { var p = parseDay(days[i]); if (!p || p.y !== T.y || p.m !== T.m) continue; var sh = obj(obj(dr[days[i]]).shifts), s; for (s in sh) { var ro = arr(obj(sh[s]).roster); for (var q = 0; q < ro.length; q++) { var r = obj(ro[q]); if (String(r.ekey) === String(ekey) || toks[String(r.ekey)]) roster.push({ day: days[i], shift: String(r.shift || s) }); } } }
    var rs = uniq(roster.map(function (x) { return x.shift; }));
    var ev = [{ source: 'staffing_v3[' + mkOf(T) + '][ekey].shift', value: curShift }, { source: 'dreport_v1[' + mkOf(T) + '-*].shifts[*].roster[ekey].shift', value: rs }, { source: 'staffing_v3[' + mkOf(pm) + '] (stale)', value: prevShift }];
    if (curShift) {
      if (!rs.length || (rs.length === 1 && rs[0] === curShift)) return { cls: 'exact', proposed: { mode: 'staffing-bound', value: curShift, period: mkOf(T) }, evidence: ev, basis: 'الجدولُ الشهري الحيّ للشهر الجاري' + (rs.length ? ' ويوافقه التقريرُ اليومي' : '') };
      if (has(rs, curShift)) return { cls: 'ambiguous', proposed: { mode: 'unknown', candidates: uniq([curShift].concat(rs)) }, evidence: ev, basis: 'تغييرُ وردية داخل الشهر: التقريرُ اليومي يحمل ورديةً أخرى في أيامٍ منه' };
      return { cls: 'conflicting', proposed: { mode: 'unknown', candidates: uniq([curShift].concat(rs)) }, evidence: ev, basis: 'الجدولُ الشهري والتقريرُ اليومي لا يتفقان على وردية الشهر الجاري' };
    }
    if (rs.length === 1) return { cls: 'ambiguous', proposed: { mode: 'unknown', candidates: rs }, evidence: ev, basis: 'التقريرُ اليومي يحمل وردية لكنّ الجدولَ الشهري الحيّ بلا صفٍّ للموظف هذا الشهر (دليلٌ مشتق لا حيّ)' };
    if (rs.length > 1) return { cls: 'conflicting', proposed: { mode: 'unknown', candidates: rs }, evidence: ev, basis: 'ورديّاتٌ متعددة في تقارير الشهر بلا جدولٍ حيّ' };
    if (prevShift) return { cls: 'ambiguous', proposed: { mode: 'unknown', candidates: [prevShift] }, evidence: ev, basis: 'دليلُ الشهر السابق فقط — الورديةُ تتغيّر شهرياً فلا يُرحَّل' };
    return { cls: 'missing', proposed: { mode: 'unknown' }, evidence: ev, basis: 'لا صفَّ في الجدول الشهري ولا في تقارير الشهر' };
  }
  /* ── الأبعادُ التي يحملها الفاعل من مفاتيحه المحمولة (KIVO_REGISTRY.can بسياقه) ── */
  function heldKeysOf(cx) { var out = [], i; for (i = 0; i < R.keys.length; i++) { var e = R.byKey[R.keys[i]]; if (!e || e.status !== 'active') continue; try { if (R.can(R.keys[i], cx).ok) out.push(R.keys[i]); } catch (e1) { swallow('scope-heldKeys', e1); } } return out; }
  function dimsOf(keys) { var d = {}, i, j; for (i = 0; i < keys.length; i++) { var e = R.byKey[keys[i]]; for (j = 0; e && j < arr(e.scopeDims).length; j++) if (DIMS.indexOf(e.scopeDims[j]) !== -1) d[e.scopeDims[j]] = 1; } return d; }
  /* ── عقدُ الإسقاط لراصد الميدان (simulation فقط): الحاوياتُ كاملة · العناصرُ المسنَدة كاملة · غيرُ المسنَد هيكلٌ (هويةٌ + هندسة) بلا حقول رصد ── */
  function fieldProjection(dayRec, ekey, toks) {
    var floors = arr(obj(dayRec).d), out = { containers: { day: dayRec ? 1 : 0, floors: floors.length, keptFloors: floors.length }, elements: { total: 0, kept: 0, stub: 0, legacyOnly: 0 }, paths: 0, keptIds: [], legacyIds: [], redactedKeys: FIELD_KEYS.slice(), densityKeys: ['pc', 'count'], stubFieldState: 0 }, fi, c, i;
    for (fi = 0; fi < floors.length; fi++) { var f = obj(floors[fi]); out.paths += arr(f.paths).length;
      for (c = 0; c < EMP_COLS.length; c++) { var a = arr(f[EMP_COLS[c]]); for (i = 0; i < a.length; i++) { var el = obj(a[i]), emp = arr(el.emp).map(String); out.elements.total++; var m = matchEmp(emp, toks, ekey);
        if (m === 'ekey') { out.elements.kept++; out.keptIds.push(fi + '/' + EMP_COLS[c] + '/' + i); }
        else { out.elements.stub++; if (m === 'legacy-token') { out.elements.legacyOnly++; out.legacyIds.push(fi + '/' + EMP_COLS[c] + '/' + i); } for (var q = 0; q < FIELD_KEYS.length; q++) if (el[FIELD_KEYS[q]] !== undefined) { out.stubFieldState++; break; } } } } }
    /* mySpots (الواجهة: الرموزُ كلُّها) مقابل المحفوظ (الخادم: ekey) */
    out.mySpots = out.elements.kept + out.elements.legacyOnly;
    out.invariants = { containersCoherent: out.containers.keptFloors === out.containers.floors, geometryPreserved: true, mySpotsEqual: out.elements.legacyOnly === 0, keptSubsetOfMySpots: true, fieldStateHiddenOnStubs: out.stubFieldState, note: out.elements.legacyOnly ? 'عناصرُ تسكينٍ برمزٍ قديم: تظهر في mySpots ولا يقبلها الخادم — توحيدُ المفتاح قبل أي filtering' : 'mySpots = المحفوظ' };
    return out;
  }
  /* ── NF‑01 شاهدُ البيانات: flow على المصليات (zones) في الجولات — الواجهةُ لا تكتبه (flowOn(kind) = kind !== zones) والخادمُ يقبله (FIELD_KEYS) ── */
  function nf01Evidence(byDept) {
    var out = { zonesWithFlow: 0, gatesWithFlow: 0, marksWithFlow: 0, days: 0, samples: [] }, d;
    for (d in byDept) { var rounds = obj(obj(byDept[d]).rounds), k; for (k in rounds) { if (!parseDay(k)) continue; out.days++; var dl = arr(obj(rounds[k]).d); for (var fi = 0; fi < dl.length; fi++) { var f = obj(dl[fi]); ['zones', 'gates', 'marks'].forEach(function (col) { var a = arr(f[col]); for (var i = 0; i < a.length; i++) { var el = obj(a[i]); if (el.flow != null && el.flow !== '') { out[col + 'WithFlow']++; if (col === 'zones' && out.samples.length < 10) out.samples.push({ dept: d, day: k, floor: fi, zone: ID.zones(el) || ('#' + i), flow: el.flow }); } } }); } } }
    return out;
  }
  /* ── الإسقاطُ على القراءة بالمحرّك نفسِه: قبل (اليوم: بلا قيم) / بعد (القيمُ المقترحة للمحسوم فقط) ── */
  function scopeValuesFor(scopeRec, D) {
    var sv = {}, any = false, j;
    for (j = 0; j < SE.length; j++) { var e = scopeRec[SE[j]]; if (!e) continue;
      if (e.proposed && e.proposed.mode === 'inherit' && D[SE[j]].proposed.mode === 'ALL') { sv[SE[j]] = SE[j] === 'Site' ? uniq([].concat.apply([], D.sites.map(function (s) { return [s.id, s.roundsId]; }))) : D[SE[j]].proposed.enumerated.slice(); any = true; }
      else if (e.proposed && (e.proposed.mode === 'single' || e.proposed.mode === 'list')) { sv[SE[j]] = e.proposed.engineIds.slice(); any = true; } }
    if (scopeRec.Shift && scopeRec.Shift.proposed && scopeRec.Shift.proposed.mode === 'staffing-bound' && scopeRec.Shift.proposed.value) { sv.Shift = [scopeRec.Shift.proposed.value]; any = true; }
    return any ? sv : null;
  }
  function ceilingFnFor(depts) { return function (dim, dept, actor) { var D = depts[dept]; if (!D || !D[dim]) return null; return D[dim].proposed.mode === 'ALL' ? 'ALL' : null; }; }
  function sumRows(acc, r) { acc.items += r.rows.items; acc.allowed += r.rows.allowed; acc.denied += r.rows.denied; acc.unknown += r.rows.unknown; acc.notApplicable += r.rows.notApplicable; return acc; }
  function zeroRows() { return { items: 0, allowed: 0, denied: 0, unknown: 0, notApplicable: 0 }; }
  /* ── الجردُ الكامل (dry-run): لا يكتب شيئاً — يعيد تقريراً ── */
  /* ═══ KIVO_238 · Phase 4.3 — جردُ الهوية (قراءةٌ فقط): sid على طوابق الجولات · uid على العناصر · رموزُ emp[] (قياسي ekey / قديم / مجهول) · مرآةُ الجذر ═══ */
  function identityAudit(depts, byDept, users) {
    var acct = {}, i, d; for (i = 0; i < arr(users).length; i++) { var u = users[i]; if (isObj(u) && u.ekey && String(u.ekey).slice(0, 4) !== 'mgr:' && String(u.ekey).slice(0, 3) !== 'gm:') (acct[str(u.deptId)] = acct[str(u.deptId)] || {})[String(u.ekey)] = 1; }
    var out = { phase: 4.3, mode: 'dry-run', writes: 0, perDept: {}, totals: null, dayKeyRule: '^\\d{4}-\\d{1,2}-\\d{1,2}$ (IH‑04: __pMig · m:* · المفاتيحُ التقنية مستثناة)' };
    var tot = { planElements: 0, planWithUid: 0, planLegacyIds: 0, planNullId: 0, snapshotFloors: 0, snapshotFloorsWithSid: 0, roundsDays: 0, roundsFloors: 0, roundsFloorsWithSid: 0, roundsElements: 0, roundsWithUid: 0, empTokens: 0, empCanonical: 0, empLegacyResolvable: 0, empUnknown: 0, rootMirrorTokens: 0 };
    for (i = 0; i < arr(depts).length; i++) { d = depts[i] && depts[i].id; if (!d) continue; var b = obj(byDept[d]), plan = obj(b.plan), rounds = obj(b.rounds), emps = arr(b.employees), A = acct[String(d)] || {};
      var toks = {}; for (var e = 0; e < emps.length; e++) { var em = emps[e]; if (!isObj(em)) continue; [em.eid, em.nid, em.name].forEach(function (x) { if (x != null && x !== '') toks[String(x)] = 1; }); }
      var o = { planElements: 0, planWithUid: 0, planLegacyIds: 0, planNullId: 0, snapshotFloors: 0, snapshotFloorsWithSid: 0, roundsDays: 0, roundsFloors: 0, roundsFloorsWithSid: 0, roundsElements: 0, roundsWithUid: 0, empTokens: 0, empCanonical: 0, empLegacyResolvable: 0, empUnknown: 0, rootMirrorTokens: 0 };
      var cntEls = function (f, isRounds) { for (var c = 0; c < ALL_COLS.length; c++) { var a = arr(obj(f)[ALL_COLS[c]]); for (var k = 0; k < a.length; k++) { var el = a[k]; if (isRounds) { o.roundsElements++; if (uidOf(el)) o.roundsWithUid++; } else { o.planElements++; if (uidOf(el)) o.planWithUid++; else if (ID[ALL_COLS[c]](el) == null) o.planNullId++; else o.planLegacyIds++; } } } };
      var cntEmp = function (f, root) { for (var c = 0; c < EMP_COLS.length; c++) { var a = arr(obj(f)[EMP_COLS[c]]); for (var k = 0; k < a.length; k++) { var em2 = arr(obj(a[k]).emp); for (var q = 0; q < em2.length; q++) { var t = String(em2[q]); if (root) { o.rootMirrorTokens++; continue; } o.empTokens++; if (A[t]) o.empCanonical++; else if (toks[t]) o.empLegacyResolvable++; else o.empUnknown++; } } } };
      var fl = arr(plan.floors); for (var f1 = 0; f1 < fl.length; f1++) { cntEls(fl[f1], false); cntEmp(fl[f1], false); }
      if (!fl.length) { cntEls(plan, false); cntEmp(plan, false); } else cntEmp(plan, true);
      var M2 = obj(plan.months); for (var mk in M2) { var md = Array.isArray(M2[mk]) ? M2[mk] : arr(obj(M2[mk]).d); for (var f2 = 0; f2 < md.length; f2++) { o.snapshotFloors++; if (obj(md[f2]).sid) o.snapshotFloorsWithSid++; cntEmp(md[f2], false); } }
      for (var rk in rounds) { if (!parseDay(rk)) continue; o.roundsDays++; var dl = arr(obj(rounds[rk]).d); for (var f3 = 0; f3 < dl.length; f3++) { o.roundsFloors++; if (obj(dl[f3]).sid) o.roundsFloorsWithSid++; cntEls(dl[f3], true); cntEmp(dl[f3], false); } }
      out.perDept[d] = o; for (var kk in tot) tot[kk] += o[kk];
    }
    out.totals = tot; return out;
  }
  function dryRun(input, H) {
    H = H || {}; var T = H.today, now = H.now || 0, report = { version: M.version, docSha256: M.docSha256, phase: 4.2, mode: 'dry-run', writes: 0, today: T, generated: now, model: M.model, rules: M.rules, classes: CLS.slice(), dims: DIMS.slice(), departments: {}, branches: {}, employees: {}, ceilingActors: [], counts: { departments: 0, branches: 0, actors: 0, outOfScope: 0, noAccount: 0, ceilingActors: 0, byDim: {}, deptCeiling: {}, entityPairs: { unknownToday: 0, resolved: 0, remaining: 0 } }, cases: { exact: [], 'inferable-high-confidence': [], ambiguous: [], missing: [], conflicting: [] }, projection: { read: { actors: 0, truncatedActors: 0, before: zeroRows(), after: zeroRows(), perActor: [] }, field: [], telemetry: null }, readiness: null, nf01: null };
    var depts = arr(input.depts), byDept = obj(input.byDept), users = arr(input.users), perms = obj(input.perms), i, j, d;
    for (i = 0; i < DIMS.length; i++) report.counts.byDim[DIMS[i]] = cnt();
    report.counts.deptCeiling = { Site: cnt(), 'Zone/Element': cnt() };
    /* الإدارات */
    for (i = 0; i < depts.length; i++) { d = depts[i] && depts[i].id; if (!d) continue; var D = deptCeiling(d, byDept[d] || {}); report.departments[d] = D; report.counts.departments++;
      for (j = 0; j < SE.length; j++) { report.counts.deptCeiling[SE[j]][D[SE[j]].cls]++; report.counts.entityPairs.unknownToday++; if (RESOLVED[D[SE[j]].cls]) report.counts.entityPairs.resolved++; else report.counts.entityPairs.remaining++; report.cases[D[SE[j]].cls].push({ kind: 'department-ceiling', dept: d, dim: SE[j], proposed: D[SE[j]].proposed.mode, enumerated: D[SE[j]].proposed.enumerated.length, basis: D[SE[j]].basis }); } }
    /* الفروع: gm = union سقوف إدارات فرعه (كلُّ إدارةٍ بسقفها؛ المجهولُ يبقى مجهولاً عند استهدافها) */
    var gids = {}; for (i = 0; i < depts.length; i++) if (depts[i] && depts[i].gid) (gids[depts[i].gid] = gids[depts[i].gid] || []).push(depts[i].id);
    for (var g in gids) { var un = { Site: [], 'Zone/Element': [] }, unknownIn = []; for (i = 0; i < gids[g].length; i++) { var Dg = report.departments[gids[g][i]]; if (!Dg) continue; for (j = 0; j < SE.length; j++) { if (Dg[SE[j]].proposed.mode === 'ALL') un[SE[j]] = un[SE[j]].concat(Dg[SE[j]].proposed.enumerated); else if (unknownIn.indexOf(gids[g][i]) === -1) unknownIn.push(gids[g][i]); } }
      report.branches[g] = { depts: gids[g], union: { Site: uniq(un.Site), 'Zone/Element': uniq(un['Zone/Element']).length }, unknownDepts: unknownIn, rule: 'R2: gm ceiling = union of member department ceilings; a member with unknown ceiling stays unknown when targeted' }; report.counts.branches++; }
    /* الفاعلون */
    var ceilFn = ceilingFnFor(report.departments), actorsDone = 0, MAX_ACTORS = H.maxActors || 300;
    for (i = 0; i < users.length; i++) { var u = users[i]; if (!u || u.dis || !u.id) continue;
      var role = u.role; if (role === 'super' || role === 'dept' || role === 'gm' || !!u.mgr || String(u.ekey || '').slice(0, 4) === 'mgr:') { report.ceilingActors.push({ id: u.id, role: role, mgr: !!u.mgr, ekey: str(u.ekey), dept: str(u.deptId), gid: str(u.gid), scope: 'inherits department ceiling (R1: role ≠ ALL)' }); report.counts.ceilingActors++; continue; }
      if (role !== 'staff') continue;
      d = str(u.deptId); if (!d || !byDept[d] && !report.departments[d]) { continue; }
      var A = H.actorOf ? H.actorOf(u) : null; if (!A) { report.counts.noAccount++; continue; }
      var cx = H.ctxOf(A, d), held = heldKeysOf(cx), hd = dimsOf(held), hasDim = false; for (var q in hd) hasDim = true;
      var ek = str(u.ekey) || ('u:' + u.id), toks = tokensOf(ek, obj(byDept[d]).employees);
      if (!hasDim) { report.counts.outOfScope++; (report.employees[d] = report.employees[d] || {})[ek] = { id: u.id, dims: [], outOfScope: true, held: held.length }; continue; }
      report.counts.actors++;
      var fieldOnly = !!(H.fieldOnly && H.fieldOnly(A, d)), D2 = report.departments[d] || deptCeiling(d, byDept[d] || {});
      var se = employeeSE(ek, toks, byDept[d] || {}, T, D2, fieldOnly, hd), rec = { id: u.id, ekey: ek, dims: Object.keys(hd), fieldOnly: fieldOnly, held: held.length, legacyTokenAssignments: se.assignments.legacyToken, scope: se.scope };
      if (hd.Shift) rec.scope.Shift = shiftOf(ek, toks, byDept[d] || {}, T);
      for (j = 0; j < DIMS.length; j++) { var sc = rec.scope[DIMS[j]]; if (!sc) continue; report.counts.byDim[DIMS[j]][sc.cls]++; report.counts.entityPairs.unknownToday++; if (RESOLVED[sc.cls]) report.counts.entityPairs.resolved++; else report.counts.entityPairs.remaining++;
        if (report.cases[sc.cls].length < 400) report.cases[sc.cls].push({ kind: 'employee', dept: d, ekey: ek, dim: DIMS[j], fieldOnly: fieldOnly, proposed: sc.proposed, basis: sc.basis, evidence: sc.evidence }); }
      (report.employees[d] = report.employees[d] || {})[ek] = rec;
      /* الإسقاطُ على القراءة (كما يُحقن في boot): قبل/بعد — بالمحرّك نفسِه */
      if (H.pv4Ctx && actorsDone < MAX_ACTORS) { actorsDone++; var sv = scopeValuesFor(rec.scope, D2), ok = {}; for (j = 0; j < held.length; j++) ok[held[j]] = true;
        var per = { ekey: ek, dept: d, fieldOnly: fieldOnly, scopeValues: sv ? Object.keys(sv) : [], resources: {} }, resList = SE_RES.concat(SH_RES);
        for (j = 0; j < resList.length; j++) { var rn = resList[j], val = obj(byDept[d])[RES_FIELD[rn]]; if (val == null) continue; var rk = S.readKeysFor(rn), keys = rk.keys.filter(function (k) { return ok[k]; }); if (!keys.length) continue;
          var kn = 'bsdept:' + d + ':' + rn, c1 = H.pv4Ctx(A, d, kn, ok, byDept[d]), r1 = S.evaluateRead(keys, c1.actor, rn, val, c1);
          var c2 = H.pv4Ctx(A, d, kn, ok, byDept[d]); c2.scopeValues = sv; c2.deptCeiling = ceilFn; var r2 = S.evaluateRead(keys, c2.actor, rn, val, c2);
          per.resources[rn] = { keys: keys, before: r1.rows, after: r2.rows, beforeUnknownDims: r1.unknownDims, afterUnknownDims: r2.unknownDims, afterDenyDims: r2.denyDims, truncated: r1.truncated };
          sumRows(report.projection.read.before, r1); sumRows(report.projection.read.after, r2); }
        report.projection.read.perActor.push(per); report.projection.read.actors++;
        if (fieldOnly) { var rk2 = obj(obj(byDept[d]).rounds), dk = T ? (T.y + '-' + T.m + '-' + T.d) : ''; if (rk2[dk]) { var fp = fieldProjection(rk2[dk], ek, toks); fp.ekey = ek; fp.dept = d; fp.day = dk; report.projection.field.push(fp); } } }
      else if (H.pv4Ctx) report.projection.read.truncatedActors++;
    }
    /* عدّاداتُ الظلّ (إن مُرّرت): unknown اليوم بحسب الفاعل والبُعد ⇒ ما سيُحسم بالتصنيف المقترح */
    if (H.telemetry) report.projection.telemetry = mapTelemetry(H.telemetry, report);
    report.readiness = readiness(); report.nf01 = { finding: M.nf01, dataEvidence: nf01Evidence(byDept) };
    report.contract = M.contract; report.identity = identityAudit(depts, byDept, users); report.identityModel = M.identity || null; report.summary = summarize(report);
    return report;
  }
  function classOfActor(report, actorKey, dept, dim) {
    if (dim === 'Shift' && actorKey.indexOf('role:') === 0) return 'n/a';
    if (actorKey.indexOf('role:') === 0) { var D = report.departments[dept]; return D && D[dim] ? D[dim].cls : 'missing'; }
    var E = report.employees[dept] && report.employees[dept][actorKey]; if (!E || !E.scope || !E.scope[dim]) return 'n/a';
    return E.scope[dim].cls;
  }
  function mapTelemetry(PV4, report) {
    var out = {}, side;
    for (side = 0; side < 2; side++) { var nm = side ? 'read' : 'write', ST = obj(PV4[nm]), U = obj(ST.unknownByActor), k, o = { unknownToday: 0, resolved: 0, remaining: 0, notApplicable: 0, byDim: {}, byClass: {}, actors: 0 };
      for (k in U) { o.actors++; var parts = k.split('|'), ak = parts[0], dept = parts[1] || '', dim; for (dim in U[k]) { var n = U[k][dim] || 0; o.unknownToday += n; var c = classOfActor(report, ak, dept, dim); o.byDim[dim] = o.byDim[dim] || { unknownToday: 0, resolved: 0, remaining: 0 }; o.byDim[dim].unknownToday += n; o.byClass[c] = (o.byClass[c] || 0) + n;
          if (RESOLVED[c]) { o.resolved += n; o.byDim[dim].resolved += n; } else if (c === 'n/a') { o.notApplicable += n; o.remaining += n; o.byDim[dim].remaining += n; } else { o.remaining += n; o.byDim[dim].remaining += n; } } }
      o.migrationNeededByDim = ST.migrationNeededByDim || {}; o.unknownEvaluations = ST.unknownMigration || 0; out[nm] = o; }
    return out;
  }
  function readiness() {
    var RB = obj(S.readBindings), NK = obj(RB.noReadKey), SPR = obj(obj(RB.special).rule), tbl = arr(M.readiness && M.readiness.table), by = {}, i, out = { table: tbl, classes: M.readiness && M.readiness.classes, unclassified: [], extra: [], byClass: {} };
    for (i = 0; i < tbl.length; i++) { by[tbl[i].resource] = tbl[i]; out.byClass[tbl[i].cls] = (out.byClass[tbl[i].cls] || 0) + 1; }
    var k; for (k in NK) if (!by[k]) out.unclassified.push(k); for (k in SPR) if (!SPR[k].keys.length && !by[k]) out.unclassified.push(k);
    for (i = 0; i < tbl.length; i++) if (!NK[tbl[i].resource] && !(SPR[tbl[i].resource] && !SPR[tbl[i].resource].keys.length)) out.extra.push(tbl[i].resource);
    return out;
  }
  function summarize(rp) {
    var c = rp.counts, byDim = {}, k, dim;
    for (dim in c.byDim) { var t = 0, r = 0; for (k in c.byDim[dim]) { if (k === 'n/a') continue; t += c.byDim[dim][k]; if (RESOLVED[k]) r += c.byDim[dim][k]; } byDim[dim] = { pairs: t, resolved: r, remaining: t - r }; }
    return { departments: c.departments, branches: c.branches, actors: c.actors, ceilingActors: c.ceilingActors, outOfScope: c.outOfScope, entityPairs: c.entityPairs, byDim: byDim, deptCeiling: c.deptCeiling, readRows: { actors: rp.projection.read.actors, truncatedActors: rp.projection.read.truncatedActors, before: rp.projection.read.before, after: rp.projection.read.after }, fieldProjections: rp.projection.field.length, telemetry: rp.projection.telemetry ? { write: { unknownToday: rp.projection.telemetry.write.unknownToday, resolved: rp.projection.telemetry.write.resolved, remaining: rp.projection.telemetry.write.remaining }, read: { unknownToday: rp.projection.telemetry.read.unknownToday, resolved: rp.projection.telemetry.read.resolved, remaining: rp.projection.telemetry.read.remaining } } : null };
  }
  return { version: M.version, docSha256: M.docSha256, phase: 4.2, mode: 'dry-run', dims: DIMS.slice(), classes: CLS.slice(), model: M.model, rules: M.rules, readiness: M.readiness, nf01: M.nf01, contract: M.contract, telemetryNote: M.telemetryNote, identity: M.identity || null,
           FIELD_KEYS: FIELD_KEYS.slice(), ID: ID, dryRun: dryRun, deptCeiling: deptCeiling, employeeSE: employeeSE, shiftOf: shiftOf, fieldProjection: fieldProjection, nf01Evidence: nf01Evidence, tokensOf: tokensOf, classifySets: classifySets, planSites: planSites, heldKeysOf: heldKeysOf, dimsOf: dimsOf, identityAudit: identityAudit };
})(KIVO_SCOPE_MIGRATION_DATA, KIVO_SCOPE, KIVO_REGISTRY);

