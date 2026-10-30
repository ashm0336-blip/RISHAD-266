/* ═══ KIVO · R203 · Phase 4.5 — Guard Binding Shadow على v24.9 (مولَّدٌ آلياً من registry10/guard_bindings.py — لا يُحرَّر يدوياً؛ المصنِّفُ كما في Phase 3) ═══
   الوثيقةُ المرجعية v24.9 · SHA-256 6e9aba634577b9ac09498edcb0a5b42453bf44c1509e6ae272281162d2a1cdde
   يُحمَّل بعد KIVO_REGISTRY ولا يمسّه. الوضع: shadow — المصنِّفُ يُخرج مفاتيحَ v24.5.1 المطلوبة للكتابة، والحكمُ النافذ للنظام القديم. */
var KIVO_GUARD_BINDINGS = {"version":"v24.9","docSha256":"6e9aba634577b9ac09498edcb0a5b42453bf44c1509e6ae272281162d2a1cdde","phase":4.1,"mode":"shadow","toBind":71,"shadowOnly":[{"key":"backup.restore","res":"كلُّ موارد الإدارة في الحفظة (+ bassam_last_export_v1)","where":"Phase 3: marker صريح في الطلب ops[k] = {op:\"backup.restore\", scope:\"dept|full\", mode, reason} يضبطه bkCommit/fbkCommit (ومعه أحداثُ التدقيق dataset·import|restore كدليلٍ مساند)","how":"كلُّ مفتاحٍ في حفظةِ استعادةٍ يُطلَب له backup.restore فوقَ مفاتيح موردِه · سياسةُ الحفظة: super OR (role:mgr AND backup.restore) تُحسب wouldAllow/wouldDeny مع السبب · missingReason يُحصى — ظلٌّ فقط","asis":"لا فحصَ صريحاً في الخادم؛ كلُّ مورد يمرّ بحارسه (يبقى كما هو)","decl":"v24.3 (F-13): to-build — Phase 3 بنت الآلية ظلّياً (KIVO_BUILD.restorePolicy)؛ الإنفاذُ لاحقاً بعد التعميد","owner":"admin/backup","guardStatus":"to-build"},{"key":"import.run","res":"bassam_employees_v1 (+ bassam_options_v1 · bassam_staffing_v3 · bassam_shift_options_v1 · مسحُ import.replace في الحفظة)","where":"Phase 3: marker صريح في الطلب ops[k] = {op:\"import.run\", mode:\"add|update|replace\", n} يضبطه BassamEmpImp.commit عبر __BS_OP_MODE — لا استدلالَ بالشكل","how":"كلُّ مفتاحٍ يحمل العلامةَ يُطلَب له import.run فوقَ مفاتيح موردِه (الحكمُ المستهدف: import.run ∧ حرّاسُ المورد)؛ الشكلُ الجماعي «2+ موظفين» بلا علامة يُحصى heuristicWithoutMarker للقياس فقط — ظلٌّ فقط","asis":"الواجهة: can(\"emps\",\"add\"|\"edit\") · الخادم: emps/data (create/edit) — لا admin/import:add (تبقى كما هي)","decl":"v24.3 (F-10): to-build — Phase 3 بنت العلامةَ والآلية ظلّياً (KIVO_BUILD.importMarker)؛ العلامةُ لا تمنح صلاحيةً ولا تتجاوز حارساً","owner":"admin/import","guardStatus":"to-build"}],"bindings":[{"key":"dstats.haram.approve","res":"bassam_dstats_v1","where":"locks[\"haram|y-m\"]: ap يظهر · أو القيمة true · أو mo يزول · أو dshut[d] يظهر · أو dopen[d] يزول","how":"اتجاه الإغلاق على سجل قفل الشهر (dsLockRec): كلُّ تغيّرٍ يزيد القفلَ = approve","asis":"dstats/haram:approve (dstatsRule: need.approve)","decl":"","dup":"","owner":"dstats/haram","type":"decision","guardKind":"ops"},{"key":"dstats.haram.reopen","res":"bassam_dstats_v1","where":"locks[\"haram|y-m\"]: ap يزول · أو mo يظهر · أو dopen[d] يظهر · أو dshut[d] يزول","how":"اتجاه الفتح على سجل قفل الشهر: كلُّ تغيّرٍ يُنقص القفلَ = reopen","asis":"dstats/haram:approve (مفتاحٌ واحدٌ للاتجاهَين)","decl":"","dup":"","owner":"dstats/haram","type":"decision","guardKind":"ops"},{"key":"dstats.nabawi.approve","res":"bassam_dstats_v1","where":"locks[\"nabawi|y-m\"]: ap يظهر · أو القيمة true · أو mo يزول · أو dshut[d] يظهر · أو dopen[d] يزول","how":"اتجاه الإغلاق على سجل قفل الشهر (dsLockRec): كلُّ تغيّرٍ يزيد القفلَ = approve","asis":"dstats/nabawi:approve (dstatsRule: need.approve)","decl":"","dup":"","owner":"dstats/nabawi","type":"decision","guardKind":"ops"},{"key":"dstats.nabawi.reopen","res":"bassam_dstats_v1","where":"locks[\"nabawi|y-m\"]: ap يزول · أو mo يظهر · أو dopen[d] يظهر · أو dshut[d] يزول","how":"اتجاه الفتح على سجل قفل الشهر: كلُّ تغيّرٍ يُنقص القفلَ = reopen","asis":"dstats/nabawi:approve (مفتاحٌ واحدٌ للاتجاهَين)","decl":"","dup":"","owner":"dstats/nabawi","type":"decision","guardKind":"ops"},{"key":"staff.lock","res":"bassam_staffing_locks_v1 (+ bassam_staffing_v3[\"y-m\"].__shifts)","where":"locks[\"y-m\"]: → true (من غيابٍ أو {mo:1}) · أو {mo:1} يزول لشهرٍ منقضٍ · لقطة __shifts تظهر","how":"اتجاه القفل على خريطة أقفال الجدول الشهري (OPS **)","asis":"staff:approve","decl":"","dup":"لقطة __shifts في staffing_v3 تُكتب مع القفل نفسِه (مسارٌ ثانٍ لعمليةٍ واحدة) — مبرَّر","owner":"staff","type":"decision","guardKind":"ops"},{"key":"staff.reopen","res":"bassam_staffing_locks_v1 (+ __shifts)","where":"locks[\"y-m\"]: true يزول · أو → {mo:1} · لقطة __shifts تزول","how":"اتجاه الفتح","asis":"staff:approve","decl":"","dup":"","owner":"staff","type":"decision","guardKind":"ops"},{"key":"plan.approve","res":"bassam_plan_v1","where":"months[\"y-m\"].mo يزول (إعادة قفل شهرٍ منقضٍ) · months[\"y-m\"].d[i].approved → true","how":"اتجاه الاعتماد (OPS months.*.mo · months.*.d.*.approved)","asis":"plan:approve","decl":"v24.3 (F-04): mo:1 = شهرٌ منقضٍ فُتح بأثرٍ رجعي — ظهورُه reopen وزوالُه approve/lock (متوافقٌ الآن مع نصّ الوثيقة)","dup":"","owner":"plan","type":"decision","guardKind":"ops"},{"key":"plan.reopen","res":"bassam_plan_v1","where":"months[\"y-m\"].mo يظهر · months[\"y-m\"].d[i].approved → false · floors[i].approved → false","how":"اتجاه الفتح","asis":"plan:approve","decl":"","dup":"","owner":"plan","type":"decision","guardKind":"ops"},{"key":"report.approve","res":"bassam_dreport_v1","where":"[\"y-m-d\"].shifts[sh].ap/apAt/apBy تظهر · [\"m:y-m\"].dshut[d] يظهر · [\"m:y-m\"].dopen[d] يزول","how":"اتجاه الاعتماد/الإغلاق (drSetAp · drToggleDayLock)","asis":"dreport:approve","decl":"","dup":"","owner":"dreport","type":"decision","guardKind":"ops"},{"key":"report.reopen","res":"bassam_dreport_v1","where":"[\"y-m-d\"].shifts[sh].ap/apAt/apBy تزول · [\"m:y-m\"].dopen[d] يظهر · [\"m:y-m\"].dshut[d] يزول","how":"اتجاه الفتح","asis":"dreport:approve","decl":"","dup":"","owner":"dreport","type":"decision","guardKind":"ops"},{"key":"round.approve","res":"bassam_rounds_v1","where":"[\"y-m-d\"].ap 0→1 · .d[i].ap 0→1 · .shAp[sh] → {ap:1,at,snap} · [\"m:y-m\"].ap يظهر · .mo يزول · .dshut[d] يظهر · .dopen[d] يزول","how":"اتجاه الاعتماد (approveToggle · setShiftAp · _setMonthAp · _toggleDayLock)","asis":"daily/rounds:approve","decl":"","dup":"","owner":"daily/rounds","type":"decision","guardKind":"ops"},{"key":"round.reopen","res":"bassam_rounds_v1","where":"[\"y-m-d\"].ap 1→0 · .d[i].ap 1→0 · .shAp[sh] → {ap:0} · [\"m:y-m\"].ap يزول · .mo يظهر · .dopen[d] يظهر · .dshut[d] يزول","how":"اتجاه الفتح","asis":"daily/rounds:approve","decl":"","dup":"","owner":"daily/rounds","type":"decision","guardKind":"ops"},{"key":"task.month.lock","res":"bassam_tasks_locks_v1","where":"locks[\"y-m\"]: → true · أو {mo:1} يزول لشهرٍ منقضٍ","how":"اتجاه القفل (OPS **)","asis":"tasks:approve","decl":"","dup":"","owner":"tasks","type":"decision","guardKind":"ops"},{"key":"task.month.reopen","res":"bassam_tasks_locks_v1","where":"locks[\"y-m\"]: true يزول · أو → {mo:1}","how":"اتجاه الفتح","asis":"tasks:approve","decl":"","dup":"","owner":"tasks","type":"decision","guardKind":"ops"},{"key":"award.res.approve","res":"bassam_award_v1","where":"recs[id].st → «معتمد» (من «قيد التحكيم» أو «مستبعد»)","how":"انتقالُ الحالة على ترشيحٍ قائم (awSetStatus)","asis":"award/res:approve","decl":"v24.3 (F-09): award.res.reopen محجوزٌ بقاعدة رفض — الانتقالُ العائد إلى «قيد التحكيم» يُحصى __unmapped (محجوز) ولا يُصدر المفتاحَ المحجوز؛ المصدر لا يكتب stWhy/stAt/stBy (متطلب TO-BE باقٍ)","dup":"","owner":"award/res","type":"decision","guardKind":"ops"},{"key":"award.res.reject","res":"bassam_award_v1","where":"recs[id].st → «مستبعد» (من «قيد التحكيم» أو «معتمد»)","how":"انتقالُ الحالة؛ سببُ الرفض (stWhy) متطلبُ TO-BE — يُحصى غيابُه ظلّياً ولا يُرفض","asis":"award/res:approve","decl":"","dup":"","owner":"award/res","type":"decision","guardKind":"ops"},{"key":"cust.move.issue","res":"bassam_custody_v1","where":"moves[] إلحاقٌ في الذيل حيث move.t === \"out\" (تسليم)","how":"المصنِّف يقرأ الحقلَ الفيزيائي t من كلِّ حركةٍ مُلحَقة (v24.3 F-01)","asis":"custodyMoveOp: out ⇐ emps/custody:add أو edit — asisMap في v24.3 مطابقٌ للمصدر","decl":"","dup":"","owner":"emps/custody","type":"edit","guardKind":"field"},{"key":"cust.move.return","res":"bassam_custody_v1","where":"moves[] إلحاقٌ في الذيل حيث move.t === \"in\" (استرجاع)","how":"المصنِّف يقرأ الحقلَ الفيزيائي t من كلِّ حركةٍ مُلحَقة (v24.3 F-01)","asis":"custodyMoveOp: in ⇐ emps/custody:edit وحده — asisMap في v24.3 مطابقٌ للمصدر","decl":"","dup":"","owner":"emps/custody","type":"edit","guardKind":"field"},{"key":"cust.move.damage","res":"bassam_custody_v1","where":"moves[] إلحاقٌ في الذيل حيث move.t === \"dmg\" (تلف)","how":"المصنِّف يقرأ الحقلَ الفيزيائي t من كلِّ حركةٍ مُلحَقة (v24.3 F-01)","asis":"custodyMoveOp: dmg ⇐ emps/custody:edit وحده — asisMap في v24.3 مطابقٌ للمصدر","decl":"","dup":"","owner":"emps/custody","type":"edit","guardKind":"field"},{"key":"cust.move.lost","res":"bassam_custody_v1","where":"moves[] إلحاقٌ في الذيل حيث move.t === \"lost\" (فقد)","how":"المصنِّف يقرأ الحقلَ الفيزيائي t من كلِّ حركةٍ مُلحَقة (v24.3 F-01)","asis":"custodyMoveOp: lost ⇐ emps/custody:edit وحده — asisMap في v24.3 مطابقٌ للمصدر","decl":"","dup":"","owner":"emps/custody","type":"edit","guardKind":"field"},{"key":"task.assign","res":"bassam_tasks_v1","where":"[\"y-m-d\"][i]: الأعمدة 7 (الأحرف الأولى) · 8 (اسم المكلَّف) · 14 (ekey) · 17/18 (المجموعة)","how":"تغيّرُ أيٍّ من أعمدة الإسناد على صفٍّ قائم","asis":"tasks:edit","decl":"","dup":"","owner":"tasks","type":"edit","guardKind":"field"},{"key":"task.evidence","res":"bassam_tasks_v1","where":"[\"y-m-d\"][i][21] = {imgs[img_tsk…], note, at} (توثيقُ الإنهاء)","how":"تغيّرُ العمود 21؛ يُرافق task.finish عند tkFinish","asis":"tasks:edit أو selfTaskOnly (TASK_SELF)","decl":"","dup":"مع task.finish حين يُكتب الإنهاءُ والتوثيقُ في حفظةٍ واحدة (عمودان مختلفان) — مبرَّر","owner":"tasks","type":"edit","guardKind":"field"},{"key":"task.accept","res":"bassam_tasks_v1","where":"[3]: pending → in_progress (+[11] وقتُ البدء) · أو pending → declined (+[20] سببُ الاعتذار)","how":"انتقالُ عمود الحالة من pending","asis":"tasks:edit أو selfTaskOnly","decl":"","dup":"","owner":"tasks","type":"operation","guardKind":"field"},{"key":"task.finish","res":"bassam_tasks_v1","where":"[3]: in_progress → done (+[12] وقتُ الإنهاء · [6] الأداء)","how":"انتقالُ عمود الحالة إلى done","asis":"tasks:edit أو selfTaskOnly","decl":"","dup":"","owner":"tasks","type":"operation","guardKind":"field"},{"key":"task.reopen","res":"bassam_tasks_v1","where":"[3]: done → in_progress (المصدر: _doReopen يُبقي [11] ويُفرغ [12]/[6]) · أو done/declined → pending","how":"انتقالٌ عائدٌ من حالةٍ منتهية","asis":"tasks:edit","decl":"","dup":"","owner":"tasks","type":"decision","guardKind":"field"},{"key":"report.att.absence","res":"bassam_dreport_v1","where":"shifts[sh].roster[ekey].st → \"ab\" (أو العودةُ منها إلى \"pr\")","how":"حقلُ الحالة على صف الموظف","asis":"dreport:edit (rpMark بلا PC)","decl":"إلغاءُ الحالة (العودةُ إلى pr) تُربط بمفتاح الحالة التي أُلغيت","dup":"","owner":"dreport","type":"edit","guardKind":"field"},{"key":"report.att.leave","res":"bassam_dreport_v1","where":"roster[ekey].st → \"lv\" (+ lvk نوعُ الإجازة من ref.leave_type)","how":"حقلُ الحالة","asis":"dreport:edit","decl":"","dup":"","owner":"dreport","type":"edit","guardKind":"field"},{"key":"report.att.late_in","res":"bassam_dreport_v1 (+ [\"m:y-m\"].perm[ekey])","where":"roster[ekey].st → \"pm\" مع pmk === \"in\" · والأثرُ الداخلي: سجلُّ النصاب الشهري [\"m:y-m\"].perm[ekey] (Backend Rule rule.report.permission_quota)","how":"حقلُ الحالة + نوعُ الاستئذان؛ تغيّرُ سجل النصاب وحدَه يُصنَّف anyOf(late_in, early_out) لا مفتاحاً مستقلاً","asis":"dreport:edit (الصف) · dreport:add لأول سجل m:y-m في الشهر (cmpMap) — فارقٌ خشِن موثَّق (F-03)","decl":"v24.3 (F-02/F-03): لا حالةَ استئذانٍ مستقلة؛ النصابُ أثرٌ داخليٌّ مسموحٌ لمن يملك late_in أو early_out بلا report.create ولا add عام","dup":"","owner":"dreport","type":"edit","guardKind":"field"},{"key":"report.att.early_out","res":"bassam_dreport_v1 (+ [\"m:y-m\"].perm[ekey])","where":"roster[ekey].st → \"pm\" مع pmk === \"out\" (الافتراضي) · والأثرُ الداخلي: سجلُّ النصاب الشهري","how":"حقلُ الحالة + نوعُ الاستئذان؛ سجلُّ النصاب anyOf(late_in, early_out)","asis":"dreport:edit (الصف) · dreport:add لأول سجل m:y-m","decl":"v24.3 (F-02/F-03): كما late_in","dup":"","owner":"dreport","type":"edit","guardKind":"field"},{"key":"tpl.supervisory","res":"bassam_perm_tpls_v1","where":"[id].sup (boolean) — وسمُ «إشرافي» (tpSupTog)","how":"تغيّرُ حقل sup وحده على قالبٍ قائم","asis":"admin/ptpls:edit","decl":"","dup":"","owner":"admin/ptpls","type":"decision","guardKind":"field"},{"key":"lens.zones.create","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"كيانٌ يظهر في zones[] (الهوية: code → ser → name → id/eid)","how":"مواءمةُ المجموعة بالهوية ثم: ظهورٌ = create","asis":"plan:add / daily/rounds:add (المصدر: الواجهةُ لا تفحص إلا بوابةَ الحفظ edit|approve|add)","decl":"","dup":"","owner":"lens.zones","type":"create","guardKind":"collection"},{"key":"lens.zones.data.edit","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"حقولُ الخصائص على كيانٍ قائم في zones[] (ما ليس هندسةً ولا حالةً ولا توزيعاً ولا كثافة)","how":"الحقلُ المتغيّرُ خارجَ الصفوف المسمّاة","asis":"plan:edit / daily/rounds:edit","decl":"pri (الأولوية أ/ب/ج) · lang/lsz (زاوية/حجم العنوان) · area (المساحة م² — تبقى هنا بقرار F-06) تُصنَّف خصائصَ — لا مفتاحَ مستقلاً لها","dup":"","owner":"lens.zones","type":"edit","guardKind":"collection"},{"key":"lens.zones.geometry.edit","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"الحقولُ الهندسية في zones[]: d · hs · cx · cy · rawA · kind · unp","how":"الحقلُ المتغيّر ∈ صفّ الهندسة","asis":"plan:edit / daily/rounds:edit","decl":"","dup":"","owner":"lens.zones","type":"operation","guardKind":"collection"},{"key":"lens.zones.status.change","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"حقولُ الحالة في zones[]: off · cWhy · cAt · cAtMs · cBy · fst · flow · fAt · fBy · fKind · fLog","how":"الحقلُ المتغيّر ∈ FIELD_KEYS (+ closed للأبواب / off للمصليات والمعالم)","asis":"daily/rounds:edit · أو daily/field:view عبر fieldObsOnly (الموقعُ مسكَّنٌ للفاعل) — v24.3 (F-14): الرصدُ يستهلك هذا المفتاح بنطاق Assigned (مؤجَّل لمرحلة Data Scope)","decl":"","dup":"","owner":"lens.zones","type":"operation","guardKind":"collection"},{"key":"lens.zones.delete","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"كيانٌ يزول من zones[]","how":"مواءمةٌ بالهوية ثم: زوالٌ = delete","asis":"plan:del / daily/rounds:del","decl":"","dup":"","owner":"lens.zones","type":"delete","guardKind":"collection"},{"key":"lens.paths.create","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"كيانٌ يظهر في paths[] (الهوية: code → name → id)","how":"مواءمةُ المجموعة بالهوية ثم: ظهورٌ = create","asis":"plan:add / daily/rounds:add (المصدر: الواجهةُ لا تفحص إلا بوابةَ الحفظ edit|approve|add)","decl":"","dup":"","owner":"lens.paths","type":"create","guardKind":"collection"},{"key":"lens.paths.edit","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"حقولُ الخصائص على كيانٍ قائم في paths[] (ما ليس هندسةً ولا حالةً ولا توزيعاً ولا كثافة)","how":"الحقلُ المتغيّرُ خارجَ الصفوف المسمّاة","asis":"plan:edit / daily/rounds:edit","decl":"type · dir · line · w · anim · hideLabel — أمّا active فصار lens.paths.status.change (v24.3 F-06)","dup":"","owner":"lens.paths","type":"edit","guardKind":"collection"},{"key":"lens.paths.geometry.edit","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"الحقولُ الهندسية في paths[]: pts","how":"الحقلُ المتغيّر ∈ صفّ الهندسة","asis":"plan:edit / daily/rounds:edit","decl":"","dup":"","owner":"lens.paths","type":"operation","guardKind":"collection"},{"key":"lens.paths.status.change","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"paths[].active (true/false) — تفعيل/تعطيل المسار (side-panel · bulk)","how":"الحقلُ active وحدَه؛ ما سواه lens.paths.edit (type · dir · line · w · anim · hideLabel)","asis":"plan:edit / daily/rounds:edit","decl":"v24.3 (F-06): فُعِّل من محجوز","dup":"","owner":"lens.paths","type":"operation","guardKind":"collection"},{"key":"lens.paths.delete","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"كيانٌ يزول من paths[]","how":"مواءمةٌ بالهوية ثم: زوالٌ = delete","asis":"plan:del / daily/rounds:del","decl":"","dup":"","owner":"lens.paths","type":"delete","guardKind":"collection"},{"key":"lens.gates.create","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"كيانٌ يظهر في gates[] (الهوية: gid+leafNo → num → label → id)","how":"مواءمةُ المجموعة بالهوية ثم: ظهورٌ = create","asis":"plan:add / daily/rounds:add (المصدر: الواجهةُ لا تفحص إلا بوابةَ الحفظ edit|approve|add)","decl":"","dup":"","owner":"lens.gates","type":"create","guardKind":"collection"},{"key":"lens.gates.edit","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"حقولُ الخصائص على كيانٍ قائم في gates[] (ما ليس هندسةً ولا حالةً ولا توزيعاً ولا كثافة)","how":"الحقلُ المتغيّرُ خارجَ الصفوف المسمّاة","asis":"plan:edit / daily/rounds:edit","decl":"leafN · cats · gtype · loc · kind · route · cls · hideNum/hideLabel","dup":"","owner":"lens.gates","type":"edit","guardKind":"collection"},{"key":"lens.gates.geometry.edit","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"الحقولُ الهندسية في gates[]: x · y · unp","how":"الحقلُ المتغيّر ∈ صفّ الهندسة","asis":"plan:edit (الأبوابُ لا تُسحب في الجولة)","decl":"","dup":"","owner":"lens.gates","type":"operation","guardKind":"collection"},{"key":"lens.gates.status.change","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"حقولُ الحالة في gates[]: closed · cWhy · cAt · cAtMs · cBy · fst · flow · fAt · fBy · fKind · fLog","how":"الحقلُ المتغيّر ∈ FIELD_KEYS (+ closed للأبواب / off للمصليات والمعالم)","asis":"daily/rounds:edit · أو daily/field:view عبر fieldObsOnly (الموقعُ مسكَّنٌ للفاعل) — v24.3 (F-14): الرصدُ يستهلك هذا المفتاح بنطاق Assigned (مؤجَّل لمرحلة Data Scope)","decl":"","dup":"","owner":"lens.gates","type":"operation","guardKind":"collection"},{"key":"lens.gates.delete","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"كيانٌ يزول من gates[]","how":"مواءمةٌ بالهوية ثم: زوالٌ = delete","asis":"plan:del / daily/rounds:del","decl":"","dup":"","owner":"lens.gates","type":"delete","guardKind":"collection"},{"key":"lens.marks.create","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"كيانٌ يظهر في marks[] (الهوية: label → id (ثم الفهرس))","how":"مواءمةُ المجموعة بالهوية ثم: ظهورٌ = create","asis":"plan:add / daily/rounds:add (المصدر: الواجهةُ لا تفحص إلا بوابةَ الحفظ edit|approve|add)","decl":"","dup":"","owner":"lens.marks","type":"create","guardKind":"collection"},{"key":"lens.marks.edit","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"حقولُ الخصائص على كيانٍ قائم في marks[] (ما ليس هندسةً ولا حالةً ولا توزيعاً ولا كثافة)","how":"الحقلُ المتغيّرُ خارجَ الصفوف المسمّاة","asis":"plan:edit / daily/rounds:edit","decl":"kind · hideLabel","dup":"","owner":"lens.marks","type":"edit","guardKind":"collection"},{"key":"lens.marks.geometry.edit","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"الحقولُ الهندسية في marks[]: x · y · unp","how":"الحقلُ المتغيّر ∈ صفّ الهندسة","asis":"plan:edit / daily/rounds:edit","decl":"","dup":"","owner":"lens.marks","type":"operation","guardKind":"collection"},{"key":"lens.marks.status.change","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"حقولُ الحالة في marks[]: off · cWhy · cAt · cAtMs · cBy · fst · flow · fAt · fBy · fKind · fLog","how":"الحقلُ المتغيّر ∈ FIELD_KEYS (+ closed للأبواب / off للمصليات والمعالم)","asis":"daily/rounds:edit · أو daily/field:view عبر fieldObsOnly (الموقعُ مسكَّنٌ للفاعل) — v24.3 (F-14): الرصدُ يستهلك هذا المفتاح بنطاق Assigned (مؤجَّل لمرحلة Data Scope)","decl":"","dup":"","owner":"lens.marks","type":"operation","guardKind":"collection"},{"key":"lens.marks.delete","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"كيانٌ يزول من marks[]","how":"مواءمةٌ بالهوية ثم: زوالٌ = delete","asis":"plan:del / daily/rounds:del","decl":"","dup":"","owner":"lens.marks","type":"delete","guardKind":"collection"},{"key":"lens.dist.assign.edit","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X) (+ mvLog)","where":"emp[] على zones/gates/marks (التسكين) · ويُرافقه [\"y-m-d\"].mvLog[] في الجولة","how":"الحقلُ emp وحدَه (أو mvLog)","asis":"daily/rounds:edit (وplan:edit في الخطة)","decl":"","dup":"","owner":"lens.dist","type":"edit","guardKind":"collection"},{"key":"lens.dist.need.edit","res":"bassam_plan_v1 (floors[i].X · months[k].d[i].X · الجذر) و bassam_rounds_v1 ([\"y-m-d\"].d[i].X)","where":"needN · needS · uniNeed على zones/gates/marks","how":"الحقلُ ∈ {needN, needS, uniNeed}","asis":"plan:edit / daily/rounds:edit","decl":"","dup":"","owner":"lens.dist","type":"edit","guardKind":"collection"},{"key":"lens.dens.reading.record","res":"bassam_rounds_v1 (و bassam_plan_v1 عند التصفير)","where":"zones[].count · zones[].pc.<fajr|dhuhr|asr|maghrib|isha> = {n,cap[,p]}","how":"الحقلُ ∈ {count, pc}","asis":"daily/rounds:edit","decl":"","dup":"","owner":"lens.dens","type":"edit","guardKind":"collection"},{"key":"lens.dens.threshold.configure","res":"bassam_plan_v1","where":"floors[i].dens ∈ {base, mid, high, null} — معيارُ/عتبةُ الكثافة للموقع (لوحة الكثافة)","how":"الحقلُ dens على الموقع وحدَه؛ zones[].area تبقى lens.zones.data.edit","asis":"plan:edit","decl":"v24.3 (F-06): فُعِّل من محجوز؛ area لا تُنقل إليه","dup":"","owner":"lens.dens","type":"operation","guardKind":"field"},{"key":"map.replace","res":"bassam_plan_v1","where":"floors[i].iid (معرّفُ صورة الخريطة في IndexedDB) · img · imgW · imgH · chipTone","how":"تغيّرُ معرّف الصورة أو أبعادها (siteModalSave)","asis":"plan:edit","decl":"","dup":"","owner":"plan","type":"operation","guardKind":"cap"},{"key":"map.calibrate","res":"bassam_plan_v1","where":"floors[i].mpu (مترٌ لكل وحدة خريطة)","how":"تغيّرُ mpu وحدَه (dens صار lens.dens.threshold.configure)","asis":"plan:edit","decl":"","dup":"","owner":"plan","type":"operation","guardKind":"cap"},{"key":"round.sync.plan","res":"bassam_rounds_v1","where":"[\"y-m-d\"].synced = Date.now() مع استبدال d[i].{zones,gates,marks,paths} من الخطة","how":"حين يتغيّر synced في الحفظة تُطوى كلُّ فروق كيانات اليوم تحت هذا المفتاح وحده","asis":"daily/rounds:edit (الواجهة: _dsCanWrite)","decl":"","dup":"","owner":"daily/rounds","type":"operation","guardKind":"cap"},{"key":"emp.record.bulk.delete","res":"bassam_employees_v1 (+ تنظيفات dreport {} · custody.moves [] · award.recs [] · staffing)","where":"زوالُ ≥2 سجلٍّ في كتابةٍ واحدة أو القائمةُ تصير [] · والتنظيفاتُ المرافقة بسياق empsEmpty","how":"عدُّ الكيانات الزائلة في الكتابة الواحدة","asis":"emps/data:del (+ wipeAllowed→emps)","decl":"العتبة: 2+ سجلّ = جماعي؛ سجلٌّ واحد = emp.record.delete (المصدرُ لا يرسل علامةَ «حذف المحدد»)","dup":"","owner":"emps/data","type":"operation","guardKind":"cap"},{"key":"staff.bulk.delete","res":"bassam_staffing_v3 / v2","where":"زوالُ مفتاح الشهر كلِّه [\"y-m\"] (delMonthDo) أو زوالُ كلِّ صفوفه","how":"شكلُ التفريغ الكامل","asis":"staff:del (الواجهة) · staff:edit (الحفظ)","decl":"","dup":"","owner":"staff","type":"operation","guardKind":"cap"},{"key":"task.bulk.delete","res":"bassam_tasks_v1","where":"زوالُ ≥2 صفٍّ في كتابةٍ واحدة (حذفُ شهر · حذفُ مجموعة)","how":"عدُّ الصفوف الزائلة","asis":"tasks:del","decl":"العتبة: 2+ صفّ = جماعي؛ صفٌّ واحد = task.delete","dup":"","owner":"tasks","type":"operation","guardKind":"cap"},{"key":"ir.rec.bulk.delete","res":"bassam_irshad_v1","where":"زوالُ ≥2 تقريرٍ من reports[] في كتابةٍ واحدة (تقارير شهر y/m)","how":"عدُّ التقارير الزائلة","asis":"irshad/records:del","decl":"العتبة: 2+ = جماعي","dup":"","owner":"irshad/records","type":"operation","guardKind":"cap"},{"key":"sz.rec.bulk.delete","res":"bassam_seized_v1","where":"زوالُ ≥2 محضرٍ من reports[] في كتابةٍ واحدة","how":"عدُّ المحاضر الزائلة","asis":"seized/records:del","decl":"العتبة: 2+ = جماعي","dup":"","owner":"seized/records","type":"operation","guardKind":"cap"},{"key":"award.doc.reset","res":"bassam_award_docs_v2","where":"استبدالُ مجموعةٍ كاملة (A|B|C): title+lead+foot+secs تتغيّر معاً أو يتغيّر طولُ secs مع ≥½ أقسامها","how":"شكلُ الاستبدال الكامل للمجموعة (awSetReset يستبدل المجموعةَ المختارة بالأصل)","asis":"award/doc:del","decl":"نصُّ v24.2: استبدالٌ كامل للمورد؛ المصدرُ يستبدل مجموعةً واحدة. الخادمُ لا يعرف النصَّ الأصلي فالاستدلالُ بالشكل","dup":"","owner":"award/doc","type":"operation","guardKind":"cap"},{"key":"report.transfer","res":"bassam_dreport_v1","where":"shifts[A].roster[ekey] يزول + shifts[A].tout[ekey]={to,why} · shifts[B].roster يظهر فيه {ekey, tin:1, tfrom, treason}","how":"نقلُ صفٍّ بين ورديتَين (rpTransfer)","asis":"dreport:edit (بلا PC في الواجهة)","decl":"","dup":"","owner":"dreport","type":"edit","guardKind":"cap"},{"key":"round.edit","res":"bassam_rounds_v1","where":"[\"y-m-d\"].t · from · imp · d[i].hideZones/hidePaths/hideGates/hideMarks/showCodes · ظهور/زوال d[i] (موقعٌ أُضيف/حُذف في الخطة)","how":"ما ليس كياناً ولا اعتماداً ولا مزامنة","asis":"daily/rounds:edit","decl":"لا ملاحظاتَ ولا وردية داخل سجل الجولة في المصدر (الوردية في bassam_dayshift_v1)","dup":"","owner":"daily/rounds","type":"edit","guardKind":"cap"},{"key":"emp.account.activate","res":"bassam_auth_users_v1","where":"سجلٌّ جديد role=staff/deptId/ekey/un/ph/dis:0 · أو سجلٌّ قائم: dis 1→0 أو تجديدُ un/alt/ph/name مع dis:0","how":"كيانُ حسابٍ واحدٍ ظهر أو تبدّل تفعيلاً","asis":"usersRule: isMgrOf + emps/data:add (جديد) أو :edit (قائم)","decl":"","dup":"","owner":"emps/data","type":"operation","guardKind":"rule"},{"key":"emp.account.freeze","res":"bassam_auth_users_v1","where":"سجلٌّ قائم: dis 0→1","how":"حقلُ dis وحده","asis":"usersRule: emps/data:edit","decl":"","dup":"","owner":"emps/data","type":"operation","guardKind":"rule"},{"key":"emp.account.bulk.activate","res":"bassam_auth_users_v1","where":"≥2 حساب تفعيلاً في كتابةٍ واحدة (activateStaffMany · onBulkAcc act)","how":"عدُّ الحسابات المتأثرة","asis":"usersRule (كلُّ سجلٍّ على حدة)","decl":"العتبة: 2+ = جماعي","dup":"","owner":"emps/data","type":"operation","guardKind":"rule"},{"key":"emp.account.bulk.freeze","res":"bassam_auth_users_v1","where":"≥2 حساب dis→1 في كتابةٍ واحدة (onBulkAcc frz)","how":"عدُّ الحسابات المتأثرة","asis":"usersRule","decl":"العتبة: 2+ = جماعي","dup":"","owner":"emps/data","type":"operation","guardKind":"rule"},{"key":"perm.assign","res":"bassam_perms_v1","where":"emps[d][ekey] · tplOf[d][ekey] · empLens[d][ekey]","how":"تغيّرُ أوراق الموظفين/قوالبهم/عدساتهم في إدارةٍ d","asis":"permsRule: isMgrOf(d) + cap + ورقةُ التضييق","decl":"","dup":"","owner":"perm","type":"operation","guardKind":"rule"},{"key":"sys.ceiling.set","res":"bassam_perms_v1","where":"caps[d] · subs[d] (و :tabs) · lenses[d] · patterns · lensZ","how":"تغيّرُ سقوف الإدارات (مدير النظام وحده)","asis":"permsRule: why=super لغير مدير النظام (lenses: ترقيةٌ آلية مسموحة)","decl":"","dup":"","owner":"sysadmin","type":"decision","guardKind":"rule"}],"decisions":[{"id":"D-01","topic":"حركاتُ العهدة","status":"حُسم في v24.3 (F-01)","text":"الحقلُ الفيزيائي t ∈ {out,in,dmg,lost}؛ asisMap: issue ← add|edit · return/damage/lost ← edit — مطابقٌ للمصدر؛ لم يبقَ فارقُ «خطأ ربط»."},{"id":"D-02","topic":"الاستئذان وأنواعُه","status":"حُسم في v24.3 (F-02/F-03)","text":"late_in = pm/in · early_out = pm/out · report.att.permission صار Backend Rule rule.report.permission_quota (سجلُّ [\"m:y-m\"].perm[ekey]) مصنَّفاً anyOf(late_in, early_out)."},{"id":"D-03","topic":"إلغاءُ حالة الحضور","status":"معلَن (باقٍ)","text":"العودةُ إلى \"pr\" تُربط بمفتاح الحالة التي أُلغيت (ab→absence · lv→leave · pm→late_in/early_out) — كما وثّقته v24.3."},{"id":"D-04","topic":"round.day.disable","status":"حُسم في v24.3 (F-05)","text":"محجوز؛ off على مستوى اليوم (إن ورد من عميلٍ آخر) يُحصى __unmapped:rounds.day.off ولا يُصدر المفتاحَ المحجوز. off على العناصر = lens.*.status.change."},{"id":"D-05","topic":"mo","status":"حُسم في v24.3 (F-04)","text":"mo:1 = شهرٌ منقضٍ فُتح بأثرٍ رجعي → ظهورُه reopen وزوالُه approve/lock — نصُّ الوثيقة والمصنِّف متفقان."},{"id":"D-06","topic":"اعتمادُ موقعٍ في الخطة","status":"معلَن (باقٍ)","text":"floors[i].approved→true = site.approve ومعه مرآتُه months[cur].d[i].approved = plan.approve (مساران لعمليةٍ واحدة — مبرَّر)؛ الإلغاءُ = plan.reopen."},{"id":"D-07","topic":"حقولُ المصليات بلا مفتاحٍ مخصوص","status":"معلَن (باقٍ) — area مثبَّتة بقرار F-06","text":"pri · lang · lsz · area → lens.zones.data.edit؛ cap مشتقٌّ (يُهمَل)؛ count/pc → lens.dens.reading.record."},{"id":"D-08","topic":"المسارات","status":"حُسم في v24.3 (F-06)","text":"paths[].active → lens.paths.status.change (فُعِّل)؛ بقيةُ الحقول lens.paths.edit."},{"id":"D-09","topic":"معيارُ الكثافة","status":"حُسم في v24.3 (F-06)","text":"floors[i].dens → lens.dens.threshold.configure (فُعِّل)؛ map.calibrate = mpu وحده؛ zones[].area تبقى data.edit."},{"id":"D-10","topic":"عتباتُ الجماعي","status":"معلَن (باقٍ)","text":"bulk = 2+ كيان يزول (أو حساب يتبدّل) في كتابةٍ واحدة، أو زوالُ مفتاح الشهر كلِّه؛ واحدٌ = المفتاحُ الإفراديّ."},{"id":"D-11","topic":"التوثيق","status":"معلَن (باقٍ)","text":"task.evidence = العمود 21 وحده؛ [6] الأداء مشتقٌّ يُرافق finish/reopen؛ [20] سببُ الاعتذار يُرافق accept(declined)."},{"id":"D-12","topic":"task.reopen","status":"حُسم في v24.3 (F-12)","text":"done → in_progress مع تفريغ [12]/[6] وإبقاء [11]؛ لا declined → pending في المصدر — نصُّ الوثيقة مطابق."},{"id":"D-13","topic":"award.doc.reset","status":"معلَن (باقٍ)","text":"يستبدل مجموعةً واحدة (A|B|C)؛ الخادمُ لا يعرف النصَّ الأصلي → استدلالٌ بشكل الاستبدال الكامل للمجموعة."},{"id":"D-14","topic":"backup.restore","status":"حُسم في v24.3 (F-13) — Phase 3: علامةٌ صريحة + سياسةٌ ظلّية","text":"to-build بسياسة super OR (role:mgr AND backup.restore)؛ Phase 3: تُعرف الاستعادةُ من marker صريح (ops[k].op = backup.restore من bkCommit/fbkCommit) وتبقى أحداثُ التدقيق (dataset · import|restore) دليلاً مسانداً يُقارَن به (markerWithoutAud · audWithoutMarker)؛ wouldAllow/wouldDeny والسببُ وmissingReason تُحصى ولا تمنع."},{"id":"D-15","topic":"import.run","status":"حُسم في v24.3 (F-10) — Phase 3: علامةٌ صريحة","text":"to-build بعلامةٍ صريحة من الواجهة (Phase 3: ops[k].op = import.run من BassamEmpImp.commit)؛ الاستدلالُ «2+ سجلّ» صار علماً للقياس لا مصدراً للمفتاح؛ AS‑IS يمرّ بـemps/data."},{"id":"D-16","topic":"tpl.supervisory","status":"حُسم في v24.3 (F-07)","text":"الحقلُ bassam_perm_tpls_v1[].sup."},{"id":"D-17","topic":"حذفُ يومِ تقريرٍ يوميّ","status":"حُسم في v24.3 (F-08)","text":"report.day.delete مفتاحٌ مستقل (exists · asis dreport:del) — المصنِّف يُخرجه بدل __unmapped."},{"id":"D-18","topic":"staffing: الحقول بلا مفتاح","status":"معلَن (باقٍ)","text":"leaves/perm (إجازات/استئذانات الموظف في الشهر) → staff.rest · ظهورُ صفِّ موظفٍ في شهرٍ قائم → staff.shift.assign · staff.move بلا مسارٍ مستقل (الورديةُ حقلٌ واحد)."},{"id":"D-19","topic":"رصدُ الميدان","status":"حُسم في v24.3 (F-14) — مؤجَّل لمرحلة Data Scope","text":"كاتبُ daily/field:view يمرّ في AS‑IS عبر fieldObsOnly؛ v24.3 ينصّ على استهلاكه lens.*.status.change بنطاق Assigned — يُحصى «تصميماً معلَناً» حتى مرحلة Data Scope."},{"id":"D-20","topic":"حذفُ حسابِ دخول","status":"معلَن (باقٍ)","text":"removeStaffAccount (مع حذف الموظف) → emp.record.delete؛ لا مفتاحَ حسابٍ مستقلاً للحذف في v24.3."}],"counts":{"bindings":71,"toBind":71,"unbound":0,"unknownKeys":0,"reservedEmitted":0,"shadowOnly":2,"duplicatesJustified":2,"duplicatesUnjustified":0,"emittedKeys":122,"coveredResources":20,"decisions":20}};
var KIVO_GUARDS = (function (B, R) {
  'use strict';
  /* ═══ R200 · Phase 4.2 — Guard Binding (shadow) على v24.5.1 (المصنِّفُ كما في Phase 3): يُصنِّف كلَّ كتابةٍ (قديم → جديد) إلى مفاتيح v24.5.1 المطلوبة — للقياس فقط ═══
     لا يحكم: الحكمُ النافذ للنظام القديم (canWrite0). النتيجةُ تُقارَن وتُحصى في الذاكرة ثم تُقرأ من /api/permv2. */
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function deq(a, b) {
    if (a === b) return true;
    if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return a == null && b == null ? true : false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (!deq(a[i], b[i])) return false; return true; }
    var ka = Object.keys(a), kb = Object.keys(b); if (ka.length !== kb.length) return false;
    for (var q = 0; q < ka.length; q++) { if (!Object.prototype.hasOwnProperty.call(b, ka[q]) || !deq(a[ka[q]], b[ka[q]])) return false; }
    return true;
  }
  function union(a, b) { var s = {}, o = [], k; a = isObj(a) ? a : {}; b = isObj(b) ? b : {}; for (k in a) if (!s[k]) { s[k] = 1; o.push(k); } for (k in b) if (!s[k]) { s[k] = 1; o.push(k); } return o; }
  function strip(o, k) { var r = {}, q; if (!isObj(o)) return {}; for (q in o) if (q !== k) r[q] = o[q]; return r; }
  function emptyObj(o) { return isObj(o) && !Object.keys(o).length; }
  function prefixEq(la, lb) { if (lb.length < la.length) return false; for (var i = 0; i < la.length; i++) if (!deq(la[i], lb[i])) return false; return true; }
  function gone(ctx, v) { if (v == null || v === '' || String(v) === '__shifts') return false; return !!(ctx && ctx.emps && ctx.emps.live && !ctx.emps.live[String(v)]); }
  /* نتيجةُ التصنيف: ops (مفتاح · مسار · ملاحظة) · alt (مفاتيحُ بديلةٌ تكفي وحدها: القواعدُ الذاتية) · residual (مساراتٌ لم تُنسب) · tech */
  function Res() { this.ops = []; this.alt = []; this.any = []; this.residual = []; this.tech = []; this.flags = {}; }
  Res.prototype.op = function (key, path, note) { this.ops.push({ key: key, path: String(path), note: note || '' }); return this; };
  /* anyOf: مجموعةُ مفاتيح يكفي واحدٌ منها لهذا المسار (قاعدةٌ خلفية مشتركة) */
  Res.prototype.anyOf = function (keys, path, note) { this.any.push({ keys: keys, path: String(path), note: note || '' }); return this; };
  Res.prototype.res = function (path, note) { this.residual.push({ path: String(path), note: note || '' }); return this; };
  Res.prototype.tec = function (path) { this.tech.push(String(path)); return this; };
  Res.prototype.keys = function () { var s = {}, o = [], i; for (i = 0; i < this.ops.length; i++) if (!s[this.ops[i].key]) { s[this.ops[i].key] = 1; o.push(this.ops[i].key); } return o; };
  Res.prototype.allKeys = function () { var o = this.keys(), s = {}, i, j; for (i = 0; i < o.length; i++) s[o[i]] = 1; for (i = 0; i < this.any.length; i++) for (j = 0; j < this.any[i].keys.length; j++) if (!s[this.any[i].keys[j]]) { s[this.any[i].keys[j]] = 1; o.push(this.any[i].keys[j]); } return o; };
  /* ── مواءمةُ مجموعةٍ بالهوية: ما لا هويةَ له يُزاوَج بترتيبه ── */
  function matchById(la, lb, idf) {
    var ma = {}, mb = {}, ua = [], ub = [], out = { added: [], removed: [], changed: [] }, i, id, ids = {}, k;
    for (i = 0; i < la.length; i++) { id = idf(la[i], i); if (id != null && ma[id] === undefined) { ma[id] = i; ids[id] = 1; } else ua.push(i); }
    for (i = 0; i < lb.length; i++) { id = idf(lb[i], i); if (id != null && mb[id] === undefined) { mb[id] = i; ids[id] = 1; } else ub.push(i); }
    for (k in ids) {
      var ia = ma[k], ib = mb[k];
      if (ia === undefined) out.added.push({ id: k, b: lb[ib], i: ib });
      else if (ib === undefined) out.removed.push({ id: k, a: la[ia], i: ia });
      else if (!deq(la[ia], lb[ib])) out.changed.push({ id: k, a: la[ia], b: lb[ib] });
    }
    var n = Math.min(ua.length, ub.length);
    for (i = 0; i < n; i++) if (!deq(la[ua[i]], lb[ub[i]])) out.changed.push({ id: '#' + ub[i], a: la[ua[i]], b: lb[ub[i]] });
    for (i = n; i < ua.length; i++) out.removed.push({ id: '#' + ua[i], a: la[ua[i]], i: ua[i] });
    for (i = n; i < ub.length; i++) out.added.push({ id: '#' + ub[i], b: lb[ub[i]], i: ub[i] });
    return out;
  }
  /* إعادةُ تسمية: كيانٌ «زال» وآخر «ظهر» في الموضع نفسِه وبهندسةٍ واحدة = تعديلُ هويةٍ لا حذفٌ وإنشاء */
  function repairRename(m, geomEq) {
    var i, j, keepR = [], used = {};
    for (i = 0; i < m.removed.length; i++) {
      var hit = -1;
      for (j = 0; j < m.added.length && hit < 0; j++) if (!used[j] && m.added[j].i === m.removed[i].i && geomEq(m.removed[i].a, m.added[j].b)) hit = j;
      if (hit >= 0) { used[hit] = 1; m.changed.push({ id: m.removed[i].id + '→' + m.added[hit].id, a: m.removed[i].a, b: m.added[hit].b }); }
      else keepR.push(m.removed[i]);
    }
    var keepA = []; for (j = 0; j < m.added.length; j++) if (!used[j]) keepA.push(m.added[j]);
    m.removed = keepR; m.added = keepA; return m;
  }
  /* ═══ العدسات: أصنافُ الحقول (من الواجهة الفعلية — Operational Plan · Daily Sessions · BassamField) ═══ */
  var FIELD_KEYS = { fst: 1, flow: 1, fAt: 1, fBy: 1, fKind: 1, fLog: 1, closed: 1, off: 1, cAt: 1, cAtMs: 1, cWhy: 1, cBy: 1 };
  var GEOM = { zones: { d: 1, hs: 1, cx: 1, cy: 1, rawA: 1, kind: 1, unp: 1 }, paths: { pts: 1 }, gates: { x: 1, y: 1, unp: 1 }, marks: { x: 1, y: 1, unp: 1 } };
  var DIST_ASSIGN = { emp: 1 }, DIST_NEED = { needN: 1, needS: 1, uniNeed: 1 }, DENS = { count: 1, pc: 1 }, DERIVED_Z = { cap: 1 };
  var LENS_COLS = { zones: 1, gates: 1, marks: 1, paths: 1 };
  var EDIT_KEY = { zones: 'lens.zones.data.edit', gates: 'lens.gates.edit', marks: 'lens.marks.edit', paths: 'lens.paths.edit' };
  /* KIVO_238 · IH‑02: الهويةُ الثابتة uid أولاً ('u:'+uid) — وإلا المخطّطُ القديم للسجلات القديمة */
  function uidOf(e) { return isObj(e) && e.uid != null && e.uid !== '' ? 'u:' + e.uid : null; }
  var ID = {
    zones: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; var v = e.code || e.ser || e.name || e.id || e.eid; return v == null || v === '' ? null : 'z:' + v; },
    gates: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; if (e.id != null && e.id !== '') return 'g:' + e.id; if (e.gid != null && e.leafNo != null) return 'gl:' + e.gid + '/' + e.leafNo; if (e.gid != null) return 'gg:' + e.gid; if (e.num != null && e.num !== '') return 'gn:' + e.num; if (e.label) return 'gL:' + e.label; return null; },
    marks: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; if (e.id != null && e.id !== '') return 'm:' + e.id; if (e.label) return 'mL:' + e.label; return null; },
    paths: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; var v = e.id || e.code || e.name; return v == null || v === '' ? null : 'p:' + v; },
    sectors: function (e) { if (!isObj(e)) return null; var v = e.id || e.code || e.name; return v == null || v === '' ? null : 's:' + v; },
    floors: function (e, i) { if (!isObj(e)) return '#' + i; var v = e.sid || e.id; return v == null || v === '' ? '#' + i : 'f:' + v; }
  };
  function geomEq(col) { return function (a, b) { var g = GEOM[col], k; if (!isObj(a) || !isObj(b)) return false; var any = false; for (k in g) { if (a[k] === undefined && b[k] === undefined) continue; any = true; if (!deq(a[k], b[k])) return false; } return any; }; }
  function classifyEntity(R, col, x, y, p, ctx) {
    var ks = union(x, y), i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(x[k], y[k])) continue;
      if (col === 'zones' && DERIVED_Z[k]) continue;                                                   /* cap مشتقٌّ من area×mpu×dens */
      if (GEOM[col][k]) { R.op('lens.' + col + '.geometry.edit', p + '.' + k); continue; }
      if (col === 'paths' && k === 'active') { R.op('lens.paths.status.change', p + '.active', 'v24.3 F-06'); continue; }
      if (col !== 'paths' && FIELD_KEYS[k]) { R.op('lens.' + col + '.status.change', p + '.' + k); continue; }
      if (col !== 'paths' && DIST_ASSIGN[k]) {
        var oa = arr(x[k]), ob = arr(y[k]);
        if (ob.length < oa.length && goneOnly(oa, ob, ctx)) { R.op(ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete', p + '.emp', 'cleanup-gone'); continue; }
        R.op('lens.dist.assign.edit', p + '.emp'); continue;
      }
      if (col !== 'paths' && DIST_NEED[k]) { R.op('lens.dist.need.edit', p + '.' + k); continue; }
      if (col === 'zones' && DENS[k]) { R.op('lens.dens.reading.record', p + '.' + k); continue; }
      R.op(EDIT_KEY[col], p + '.' + k);
    }
  }
  function goneOnly(oa, ob, ctx) { var kept = [], i, hit = 0; for (i = 0; i < oa.length; i++) { if (gone(ctx, oa[i])) { hit++; continue; } kept.push(oa[i]); } return hit > 0 && deq(kept, ob); }
  function classifyLensCol(R, col, la, lb, p, ctx) {
    var m = repairRename(matchById(la, lb, ID[col]), geomEq(col)), i;
    for (i = 0; i < m.added.length; i++) R.op('lens.' + col + '.create', p + '[' + m.added[i].id + ']');
    for (i = 0; i < m.removed.length; i++) R.op('lens.' + col + '.delete', p + '[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) classifyEntity(R, col, m.changed[i].a, m.changed[i].b, p + '[' + m.changed[i].id + ']', ctx);
  }
  function classifySectors(R, la, lb, p) {
    var m = matchById(la, lb, ID.sectors), i;
    for (i = 0; i < m.added.length; i++) R.op('sector.create', p + '[' + m.added[i].id + ']');
    for (i = 0; i < m.removed.length; i++) R.op('sector.delete', p + '[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) R.op('sector.edit', p + '[' + m.changed[i].id + ']');
  }
  /* موقعٌ/طابق: في الخطة floors[i] وmonths[k].d[i] — وفي الجولة ["y-m-d"].d[i] */
  function classifyFloor(R, x, y, p, host, ctx) {
    x = isObj(x) ? x : {}; y = isObj(y) ? y : {};
    var ks = union(x, y), i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(x[k], y[k])) continue;
      if (LENS_COLS[k]) { classifyLensCol(R, k, arr(x[k]), arr(y[k]), p + '.' + k, ctx); continue; }
      if (k === 'sectors') { classifySectors(R, arr(x[k]), arr(y[k]), p + '.sectors'); continue; }
      if (host === 'rounds') {
        if (k === 'ap') { R.op(y.ap ? 'round.approve' : 'round.reopen', p + '.ap'); continue; }
        R.op('round.edit', p + '.' + k); continue;                                                     /* hideZones/hidePaths/hideGates/hideMarks/showCodes */
      }
      if (k === 'approved') { R.op(y.approved ? (p.indexOf('months') === 0 ? 'plan.approve' : 'site.approve') : 'plan.reopen', p + '.approved'); continue; }
      if (k === 'iid' || k === 'img' || k === 'imgW' || k === 'imgH') { R.op('map.replace', p + '.' + k); continue; }
      if (k === 'mpu') { R.op('map.calibrate', p + '.mpu'); continue; }
      if (k === 'dens') { R.op('lens.dens.threshold.configure', p + '.dens', 'v24.3 F-06'); continue; }
      R.op('site.edit', p + '.' + k);                                                                   /* name · num · chip · chipTone · create · hide* · showCodes */
    }
  }
  function normMonth(v) { if (Array.isArray(v)) return { c: 1, d: v }; return isObj(v) ? v : {}; }
  function normLock(v) { if (v === true || v === 1) return { ap: 1 }; return isObj(v) ? v : {}; }
  function dayMap(R, xa, xb, p, kAdd, kDel) { xa = isObj(xa) ? xa : {}; xb = isObj(xb) ? xb : {}; var ks = union(xa, xb), i; for (i = 0; i < ks.length; i++) { if (deq(xa[ks[i]], xb[ks[i]])) continue; if (xa[ks[i]] === undefined) R.op(kAdd, p + '[' + ks[i] + ']'); else if (xb[ks[i]] === undefined) R.op(kDel, p + '[' + ks[i] + ']'); else R.res(p + '[' + ks[i] + ']', 'flag-shape'); } }
  /* سجلُّ قفل شهرٍ {ap · mo · dopen · dshut} — الاتجاهُ لا الحقل: ap↑/mo↓/dshut+/dopen− = قفل · العكسُ فتح */
  function classifyMonthRec(R, x, y, p, kAp, kRe) {
    x = normLock(x); y = normLock(y);
    if (!!x.ap !== !!y.ap) R.op(y.ap ? kAp : kRe, p + '.ap');
    if (!!x.mo !== !!y.mo) R.op(y.mo ? kRe : kAp, p + '.mo');
    if (!deq(x.dopen, y.dopen)) dayMap(R, x.dopen, y.dopen, p + '.dopen', kRe, kAp);
    if (!deq(x.dshut, y.dshut)) dayMap(R, x.dshut, y.dshut, p + '.dshut', kAp, kRe);
    var ks = union(x, y), i; for (i = 0; i < ks.length; i++) { var k = ks[i]; if (k === 'ap' || k === 'mo' || k === 'dopen' || k === 'dshut' || k === 'auto' || k === 'perm') continue; if (!deq(x[k], y[k])) R.res(p + '.' + k, 'unlisted-lock-field'); }
  }
  var C = {};
  /* ═══ الخطة التشغيلية ═══ */
  C['bassam_plan_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var m = matchById(arr(a.floors), arr(b.floors), ID.floors), i, k;
    for (i = 0; i < m.added.length; i++) R.op('site.create', 'floors[' + m.added[i].id + ']');
    for (i = 0; i < m.removed.length; i++) R.op('site.delete', 'floors[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) classifyFloor(R, m.changed[i].a, m.changed[i].b, 'floors[' + m.changed[i].id + ']', 'plan', ctx);
    var cols = ['zones', 'gates', 'marks', 'paths'];
    for (i = 0; i < cols.length; i++) if (!deq(a[cols[i]], b[cols[i]])) classifyLensCol(R, cols[i], arr(a[cols[i]]), arr(b[cols[i]]), cols[i], ctx);   /* مرآةُ الموقع النشط في الجذر */
    var ma = isObj(a.months) ? a.months : {}, mb = isObj(b.months) ? b.months : {}, ks = union(ma, mb);
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(ma[k], mb[k])) continue;
      if (ma[k] === undefined) { R.op('plan.create', 'months[' + k + ']'); continue; }
      if (mb[k] === undefined) { R.op('plan.delete', 'months[' + k + ']'); continue; }
      var x = normMonth(ma[k]), y = normMonth(mb[k]);
      if (!!x.mo !== !!y.mo) R.op(y.mo ? 'plan.reopen' : 'plan.approve', 'months[' + k + '].mo');
      var mm = matchById(arr(x.d), arr(y.d), ID.floors), q;
      for (q = 0; q < mm.added.length; q++) R.op('site.create', 'months[' + k + '].d[' + mm.added[q].id + ']');
      for (q = 0; q < mm.removed.length; q++) R.op('site.delete', 'months[' + k + '].d[' + mm.removed[q].id + ']');
      for (q = 0; q < mm.changed.length; q++) classifyFloor(R, mm.changed[q].a, mm.changed[q].b, 'months[' + k + '].d[' + mm.changed[q].id + ']', 'plan', ctx);
    }
    var da = isObj(a.delMonths) ? a.delMonths : {}, db = isObj(b.delMonths) ? b.delMonths : {}; ks = union(da, db);
    for (i = 0; i < ks.length; i++) { if (deq(da[ks[i]], db[ks[i]])) continue; R.op(db[ks[i]] === undefined ? 'plan.create' : 'plan.delete', 'delMonths[' + ks[i] + ']'); }
    if (!deq(a.cfg, b.cfg)) R.tec('cfg'); if (!deq(a.pMig, b.pMig)) R.tec('pMig');
    ks = union(a, b); for (i = 0; i < ks.length; i++) { k = ks[i]; if (k === 'floors' || k === 'months' || k === 'delMonths' || k === 'cfg' || k === 'pMig' || LENS_COLS[k]) continue; if (!deq(a[k], b[k])) R.res(k, 'unknown-root-key'); }
  };
  /* ═══ الجولات اليومية ═══ */
  function classifyShAp(R, x, y, p) { x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; var ks = union(x, y), i; for (i = 0; i < ks.length; i++) { if (deq(x[ks[i]], y[ks[i]])) continue; var on = isObj(y[ks[i]]) && !!y[ks[i]].ap; R.op(on ? 'round.approve' : 'round.reopen', p + '[' + ks[i] + ']'); } }
  function classifyDay(R, x, y, k, ctx) {
    if (x === undefined) { R.op('round.create', k); return; }
    if (y === undefined) { R.op('round.delete', k); return; }
    if (!isObj(x) || !isObj(y)) { R.res(k, 'shape'); return; }
    var synced = !deq(x.synced, y.synced) && y.synced != null, ks = union(x, y), i, f;
    for (i = 0; i < ks.length; i++) {
      f = ks[i]; if (deq(x[f], y[f])) continue;
      if (f === 'ap') { R.op(y.ap ? 'round.approve' : 'round.reopen', k + '.ap'); continue; }
      if (f === 'shAp') { classifyShAp(R, x.shAp, y.shAp, k + '.shAp'); continue; }
      if (f === 'synced') { R.op('round.sync.plan', k + '.synced'); continue; }
      if (f === 'd') {
        if (synced) { R.op('round.sync.plan', k + '.d', 'collapsed'); continue; }
        var m = matchById(arr(x.d), arr(y.d), function (e, i2) { return '#' + i2; }), q;
        for (q = 0; q < m.added.length; q++) R.op('round.edit', k + '.d[' + m.added[q].id + ']', 'site-added');
        for (q = 0; q < m.removed.length; q++) R.op('round.edit', k + '.d[' + m.removed[q].id + ']', 'site-removed');
        for (q = 0; q < m.changed.length; q++) classifyFloor(R, m.changed[q].a, m.changed[q].b, k + '.d[' + m.changed[q].id + ']', 'rounds', ctx);
        continue;
      }
      if (f === 'off') { R.op('__unmapped:rounds.day.off(reserved:round.day.disable)', k + '.off', 'v24.3 F-05 — محجوز؛ لا قدرة يومية في المصدر'); continue; }
      if (f === 'mvLog') { R.op('lens.dist.assign.edit', k + '.mvLog', 'coverage-log'); continue; }
      if (f === 't' || f === 'from' || f === 'imp' || f === 'auto') { R.op('round.edit', k + '.' + f); continue; }
      R.res(k + '.' + f, 'unlisted-day-field');
    }
  }
  C['bassam_rounds_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(a[k], b[k])) continue;
      if (k === '__pMig') { R.tec(k); continue; }
      if (/^m:\d{4}-\d{1,2}$/.test(k)) { if (b[k] === undefined && a[k] && normLock(a[k]).ap) { R.op('round.reopen', k, 'month-record-removed'); continue; } classifyMonthRec(R, a[k], b[k], k, 'round.approve', 'round.reopen'); continue; }
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(k)) { classifyDay(R, a[k], b[k], k, ctx); continue; }
      if (/^\d{4}-\d{1,2}-\d{1,2}-/.test(k)) { R.op(b[k] === undefined ? 'round.delete' : 'round.edit', k, 'legacy-key'); continue; }
      R.res(k, 'unknown-root-key');
    }
  };
  /* ═══ التقرير اليومي ═══ */
  function attKey(r) { if (!isObj(r)) return null; var st = String(r.st || 'pr'); if (st === 'ab') return 'report.att.absence'; if (st === 'lv') return 'report.att.leave'; if (st === 'pm') return String(r.pmk || 'out') === 'in' ? 'report.att.late_in' : 'report.att.early_out'; return null; }
  function classifyRoster(R, la, lb, p, pulledNow, toutGain) {
    var m = matchById(la, lb, function (e) { return isObj(e) && e.ekey != null ? String(e.ekey) : null; }), i, c, f, ks;
    for (i = 0; i < m.added.length; i++) { var nb = m.added[i].b; R.op(isObj(nb) && nb.tin ? 'report.transfer' : (pulledNow ? 'report.create' : 'report.edit'), p + '[' + m.added[i].id + ']', 'row-added'); }
    for (i = 0; i < m.removed.length; i++) R.op(toutGain[m.removed[i].id] ? 'report.transfer' : 'report.edit', p + '[' + m.removed[i].id + ']', 'row-removed');
    for (i = 0; i < m.changed.length; i++) {
      c = m.changed[i]; ks = union(c.a, c.b);
      var stCh = !deq(c.a.st, c.b.st), pmCh = !deq(c.a.pmk, c.b.pmk), lvCh = !deq(c.a.lvk, c.b.lvk), other = [];
      for (f = 0; f < ks.length; f++) { var fk = ks[f]; if (deq(c.a[fk], c.b[fk])) continue; if (fk === 'st' || fk === 'pmk' || fk === 'lvk') continue; if (fk === 'tin' || fk === 'tfrom' || fk === 'treason') { R.op('report.transfer', p + '[' + c.id + '].' + fk); continue; } other.push(fk); }
      if (stCh) R.op(attKey(c.b) || attKey(c.a) || 'report.edit', p + '[' + c.id + '].st ' + (c.a.st || 'pr') + '→' + (c.b.st || 'pr'));
      else if (pmCh && String(c.b.st) === 'pm') R.op(attKey(c.b), p + '[' + c.id + '].pmk');
      else if (lvCh && String(c.b.st) === 'lv') R.op('report.att.leave', p + '[' + c.id + '].lvk');
      else if (pmCh || lvCh) R.op('report.edit', p + '[' + c.id + '].pmk/lvk');
      if (other.length) R.op('report.edit', p + '[' + c.id + '].' + other.join('/'));
    }
  }
  function classifyShift(R, x, y, p) {
    x = isObj(x) ? x : {}; y = isObj(y) ? y : {};
    var pulledNow = !x.pulled && !!y.pulled, ks = union(x, y), i, f, toutGain = {}, ta = isObj(x.tout) ? x.tout : {}, tb = isObj(y.tout) ? y.tout : {}, tk;
    for (tk in tb) if (!deq(ta[tk], tb[tk])) toutGain[tk] = 1;
    for (i = 0; i < ks.length; i++) {
      f = ks[i]; if (deq(x[f], y[f])) continue;
      if (f === 'ap' || f === 'apAt' || f === 'apBy') { if (f === 'ap' || deq(x.ap, y.ap)) R.op(y.ap ? 'report.approve' : 'report.reopen', p + '.' + f); continue; }
      if (f === 'tout') { R.op('report.transfer', p + '.tout'); continue; }
      if (f === 'roster') { classifyRoster(R, arr(x.roster), arr(y.roster), p + '.roster', pulledNow, toutGain); continue; }
      if (pulledNow) { R.op('report.create', p + '.' + f, 'pull'); continue; }                          /* سحبُ الوردية: pulled · sig · def · rest · muk … عمليةٌ واحدة */
      R.op('report.edit', p + '.' + f);                                                                /* leaders · rest · restSrc · muk */
    }
  }
  C['bassam_dreport_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    if (emptyObj(b) && !emptyObj(a) && ctx && (ctx.imp || ctx.empsEmpty)) { R.op(ctx.imp ? 'import.replace' : 'emp.record.bulk.delete', '*', 'wipe'); return; }
    var ks = union(a, b), i, k, x, y;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; x = a[k]; y = b[k]; if (deq(x, y)) continue;
      if (k === '__ldcs') { R.op('report.edit', k); continue; }
      if (/^m:/.test(k)) { x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; classifyMonthRec(R, x, y, k, 'report.approve', 'report.reopen'); if (!deq(x.perm, y.perm)) R.anyOf(['report.att.late_in', 'report.att.early_out'], k + '.perm', 'rule.report.permission_quota (v24.3 F-03)'); continue; }
      if (x === undefined) { R.op('report.create', k); continue; }
      if (y === undefined) { R.op('report.day.delete', k, 'v24.3 F-08 (drRsDo)'); continue; }
      if (!isObj(x) || !isObj(y)) { R.res(k, 'shape'); continue; }
      var sx = isObj(x.shifts) ? x.shifts : {}, sy = isObj(y.shifts) ? y.shifts : {}, sk = union(sx, sy), q;
      for (q = 0; q < sk.length; q++) {
        var sh = sk[q]; if (deq(sx[sh], sy[sh])) continue;
        var p = k + '.shifts[' + sh + ']';
        if (sx[sh] === undefined) { var ro = isObj(sy[sh]) ? arr(sy[sh].roster) : [], tin = false, z; for (z = 0; z < ro.length; z++) if (isObj(ro[z]) && ro[z].tin) tin = true; R.op(tin ? 'report.transfer' : 'report.create', p, 'shift-added'); continue; }
        if (sy[sh] === undefined) { R.op('__unmapped:dreport.shift.delete', p); continue; }
        classifyShift(R, sx[sh], sy[sh], p);
      }
      var dk = union(x, y); for (q = 0; q < dk.length; q++) if (dk[q] !== 'shifts' && !deq(x[dk[q]], y[dk[q]])) { if (dk[q] === 'created') R.tec(k + '.created'); else R.res(k + '.' + dk[q], 'unlisted-day-field'); }
    }
  };
  /* ═══ المهام ═══ */
  var TASK_SELF = { 3: 1, 6: 1, 11: 1, 12: 1, 20: 1, 21: 1 }, TASK_ST = { pending: 1, in_progress: 1, done: 1, declined: 1 }, ASSIGN_COLS = { 7: 1, 8: 1, 14: 1, 17: 1, 18: 1 };
  function taskIds(x, y) { var dup = {}; function scan(rows) { var seen = {}, i, k; for (i = 0; i < rows.length; i++) { k = String(Array.isArray(rows[i]) ? rows[i][13] : ''); if (seen[k]) dup[k] = 1; seen[k] = 1; } } scan(x); scan(y); return function (r) { if (!Array.isArray(r) || r[13] == null) return null; var id = String(r[13]); return dup[id] ? id + '|' + String(r[14] == null ? '' : r[14]) : id; }; }
  function classifyTaskRow(R, r0, r1, p, ctx) {
    var n = Math.max(r0.length, r1.length), j, C = [], self = !!(ctx && ctx.actor && ctx.actor.ekey && String(r0[14] == null ? '' : r0[14]) === String(ctx.actor.ekey));
    for (j = 0; j < n; j++) { var v0 = r0[j] === undefined ? null : r0[j], v1 = r1[j] === undefined ? null : r1[j]; if (!deq(v0, v1)) C.push(j); }
    var selfOk = self && !(r0[3] === 'done' || r0[3] === 'declined') && TASK_ST[String(r1[3])], q;
    for (q = 0; q < C.length && selfOk; q++) if (!TASK_SELF[C[q]]) selfOk = false;
    if (selfOk) R.alt.push('self.task.respond');
    var abs = {}, rest = [];
    if (C.indexOf(3) !== -1) {
      var f = String(r0[3]), t = String(r1[3]), key;
      if (f === 'pending' && (t === 'in_progress' || t === 'declined')) { key = 'task.accept'; abs[11] = abs[12] = abs[20] = 1; }
      else if (t === 'done') { key = 'task.finish'; abs[12] = abs[6] = 1; }
      else if ((f === 'done' || f === 'declined') && (t === 'in_progress' || t === 'pending')) { key = 'task.reopen'; abs[11] = abs[12] = abs[6] = 1; }
      else key = 'task.edit';
      R.op(key, p + '[3] ' + f + '→' + t);
    }
    if (C.indexOf(21) !== -1) R.op('task.evidence', p + '[21]');
    var asg = []; for (q = 0; q < C.length; q++) if (ASSIGN_COLS[C[q]]) asg.push(C[q]);
    if (asg.length) R.op('task.assign', p + '[' + asg.join('/') + ']');
    for (q = 0; q < C.length; q++) { j = C[q]; if (j === 3 || j === 21 || ASSIGN_COLS[j] || abs[j]) continue; rest.push(j); }
    if (rest.length) R.op('task.edit', p + '[' + rest.join('/') + ']');
  }
  C['bassam_tasks_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, removed = [], q;
    for (i = 0; i < ks.length; i++) {
      var day = ks[i], x = arr(a[day]), y = arr(b[day]); if (deq(x, y)) continue;
      var m = matchById(x, y, taskIds(x, y));
      for (q = 0; q < m.added.length; q++) R.op('task.create', day + '[' + m.added[q].id + ']');
      for (q = 0; q < m.removed.length; q++) removed.push(day + '[' + m.removed[q].id + ']');
      for (q = 0; q < m.changed.length; q++) {
        var c = m.changed[q];
        if (Array.isArray(c.a) && Array.isArray(c.b) && gone(ctx, c.a[14]) && c.b[14] === '' && c.b[8] === '' && Array.isArray(c.b[7]) && !c.b[7].length) { R.op(ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete', day + '[' + c.id + ']', 'cleanup-gone'); continue; }
        if (Array.isArray(c.a) && Array.isArray(c.b)) classifyTaskRow(R, c.a, c.b, day + '[' + c.id + ']', ctx); else R.res(day + '[' + c.id + ']', 'row-shape');
      }
    }
    if (removed.length >= 2) R.op('task.bulk.delete', removed.join(' · '), 'n=' + removed.length); else for (q = 0; q < removed.length; q++) R.op('task.delete', removed[q]);
  };
  /* ═══ أقفالُ الأشهر (الجدول الشهري · المهام) ═══ */
  function lockMap(kLock, kOpen) {
    return function (R, a, b) {
      a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
      var ks = union(a, b), i, x, y, k;
      for (i = 0; i < ks.length; i++) {
        k = ks[i]; x = a[k]; y = b[k]; if (deq(x, y)) continue;
        var xl = x === true, yl = y === true, xm = isObj(x) && !!x.mo, ym = isObj(y) && !!y.mo;
        if (yl && !xl) R.op(kLock, k, (xm ? '{mo:1}' : '∅') + '→true');
        else if (xl && !yl) R.op(kOpen, k, 'true→' + (ym ? '{mo:1}' : '∅'));
        else if (ym && !xm) R.op(kOpen, k, '→{mo:1}');
        else if (xm && !ym) R.op(kLock, k, '{mo:1}→∅');
        else R.res(k, 'lock-shape');
      }
    };
  }
  C['bassam_tasks_locks_v1'] = lockMap('task.month.lock', 'task.month.reopen');
  C['bassam_staffing_locks_v1'] = lockMap('staff.lock', 'staff.reopen');
  /* ═══ الجدول الشهري ═══ */
  function staffing(R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, mk, x, y;
    for (i = 0; i < ks.length; i++) {
      mk = ks[i]; x = a[mk]; y = b[mk]; if (deq(x, y)) continue;
      if (x === undefined) { R.op('staff.create', mk); continue; }
      if (y === undefined) { R.op('staff.bulk.delete', mk, 'month-removed'); continue; }
      if (!isObj(x) || !isObj(y)) { R.res(mk, 'shape'); continue; }
      var eks = union(x, y), q, removed = [], cleaned = 0, rowsBefore = 0, ek, r0, r1, p;
      for (ek in x) if (ek !== '__shifts') rowsBefore++;
      for (q = 0; q < eks.length; q++) {
        ek = eks[q]; r0 = x[ek]; r1 = y[ek]; if (deq(r0, r1)) continue; p = mk + '[' + ek + ']';
        if (ek === '__shifts') { R.op(r1 !== undefined ? 'staff.lock' : 'staff.reopen', p, 'snapshot'); continue; }
        if (r0 === undefined) { R.op('staff.shift.assign', p, 'row-added (D-18)'); continue; }
        if (r1 === undefined) { if (gone(ctx, ek)) { cleaned++; R.op(ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete', p, 'cleanup-gone'); } else removed.push(p); continue; }
        if (!isObj(r0) || !isObj(r1)) { R.res(p, 'shape'); continue; }
        var fs = union(r0, r1), z;
        for (z = 0; z < fs.length; z++) {
          var f = fs[z]; if (deq(r0[f], r1[f])) continue;
          if (f === 'shift') R.op('staff.shift.assign', p + '.shift');
          else if (f === 'rest' || f === 'leaves' || f === 'perm') R.op('staff.rest', p + '.' + f);
          else if (f === 'cs') R.op('staff.callsign.assign', p + '.cs');
          else if (f === 'muk') R.op('staff.tasking.assign', p + '.muk');
          else R.res(p + '.' + f, 'unlisted-field');
        }
      }
      if (removed.length && rowsBefore > 0 && removed.length + cleaned >= rowsBefore) R.op('staff.bulk.delete', mk, 'all-rows-removed');
      else if (removed.length >= 2) R.op('staff.bulk.delete', removed.join(' · '), 'n=' + removed.length);
      else for (q = 0; q < removed.length; q++) R.op('staff.delete', removed[q]);
    }
  }
  C['bassam_staffing_v3'] = staffing; C['bassam_staffing_v2'] = staffing;
  /* ═══ الإحصائيات اليومية (عامّ) ═══ */
  C['bassam_dstats_v1'] = function (R, a, b) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, k, x, y, q;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; x = a[k]; y = b[k]; if (deq(x, y)) continue;
      if (k === 'haram' || k === 'nabawi') { x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; var dk = union(x, y), n = 0; for (q = 0; q < dk.length; q++) if (!deq(x[dk[q]], y[dk[q]])) n++; if (n) R.op('dstats.' + k + '.entry', k, n + ' day(s)'); continue; }
      if (k === 'locks') { x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; var lk = union(x, y); for (q = 0; q < lk.length; q++) { if (deq(x[lk[q]], y[lk[q]])) continue; var mt = /^(haram|nabawi)\|/.exec(lk[q]); if (!mt) { R.res('locks[' + lk[q] + ']', 'bad-lock-key'); continue; } classifyMonthRec(R, x[lk[q]], y[lk[q]], 'locks[' + lk[q] + ']', 'dstats.' + mt[1] + '.approve', 'dstats.' + mt[1] + '.reopen'); } continue; }
      R.res(k, 'unknown-root-key');
    }
  };
  /* ═══ العهد ═══ */
  var MOVE_KEY = { out: 'cust.move.issue', 'in': 'cust.move.return', dmg: 'cust.move.damage', lost: 'cust.move.lost' };
  C['bassam_custody_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ia = arr(a.items), ib = arr(b.items), m = matchById(ia, ib, function (e) { return isObj(e) && e.name != null && e.name !== '' ? 'n:' + e.name : null; }), i;
    var ren = Math.min(m.added.length, m.removed.length);                                                /* إعادةُ تسمية صنف: زوالٌ وظهورٌ بعددٍ واحد */
    for (i = 0; i < ren; i++) R.op('ref.custody_type.edit', 'items[' + m.removed[i].id + '→' + m.added[i].id + ']', 'rename');
    for (i = ren; i < m.added.length; i++) R.op('ref.custody_type.create', 'items[' + m.added[i].id + ']');
    for (i = ren; i < m.removed.length; i++) R.op('ref.custody_type.delete', 'items[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) R.op('ref.custody_type.edit', 'items[' + m.changed[i].id + ']');
    var ma = arr(a.moves), mb = arr(b.moves);
    if (deq(ma, mb)) { /* لا شيء في الحركات */ }
    else if (!mb.length && ma.length && deq(strip(a, 'moves'), strip(b, 'moves'))) R.op(ctx && ctx.imp ? 'import.replace' : (ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : '__unmapped:custody.moves.wipe'), 'moves', 'wipe');
    else if (mb.length > ma.length && prefixEq(ma, mb)) { for (i = ma.length; i < mb.length; i++) { var t = isObj(mb[i]) ? String(mb[i].t) : ''; R.op(MOVE_KEY[t] || ('__unmapped:custody.move.t=' + t), 'moves[' + i + '].t=' + t); } }
    else if (mb.length < ma.length && goneOnly(ma.map(function (mv) { return isObj(mv) ? mv.eid : null; }), mb.map(function (mv) { return isObj(mv) ? mv.eid : null; }), ctx) && deq(ma.filter(function (mv) { return !gone(ctx, isObj(mv) ? mv.eid : null); }), mb)) R.op(ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete', 'moves', 'cleanup-gone');
    else if (mb.length === ma.length && ren > 0) { var onlyItem = true; for (i = 0; i < ma.length && onlyItem; i++) if (!deq(ma[i], mb[i]) && !deq(strip(ma[i], 'item'), strip(mb[i], 'item'))) onlyItem = false; if (onlyItem) R.op('ref.custody_type.edit', 'moves[].item', 'rename-cascade'); else R.res('moves', 'non-append-change'); }
    else R.res('moves', 'non-append-change');
    var ks = union(a, b); for (i = 0; i < ks.length; i++) if (ks[i] !== 'items' && ks[i] !== 'moves' && !deq(a[ks[i]], b[ks[i]])) R.res(ks[i], 'unknown-root-key');
  };
  /* ═══ جائزةُ التميز ═══ */
  C['bassam_award_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ra = arr(a.recs), rb = arr(b.recs), i;
    if (!rb.length && ra.length && deq(strip(a, 'recs'), strip(b, 'recs'))) { R.op(ctx && ctx.imp ? 'import.replace' : (ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : '__unmapped:award.recs.wipe'), 'recs', 'wipe'); return; }
    var m = matchById(ra, rb, function (e) { return isObj(e) && e.id != null ? 'r:' + e.id : null; });
    for (i = 0; i < m.added.length; i++) R.op('award.new.create', 'recs[' + m.added[i].id + ']');
    for (i = 0; i < m.removed.length; i++) R.op(gone(ctx, isObj(m.removed[i].a) ? m.removed[i].a.ekey : null) ? (ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete') : 'award.res.delete', 'recs[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) {
      var c = m.changed[i], p = 'recs[' + c.id + ']', ks = union(c.a, c.b), q, other = [];
      for (q = 0; q < ks.length; q++) { if (deq(c.a[ks[q]], c.b[ks[q]])) continue; if (ks[q] === 'st') continue; other.push(ks[q]); }
      if (!deq(c.a.st, c.b.st)) {
        var to = String(c.b.st);
        if (to === 'معتمد') R.op('award.res.approve', p + '.st ' + c.a.st + '→' + to);
        else if (to === 'مستبعد') { R.op('award.res.reject', p + '.st ' + c.a.st + '→' + to); if (!(c.b.stWhy || c.b.why || c.b.reason)) R.flags.rejectNoReason = (R.flags.rejectNoReason || 0) + 1; }
        else R.op('__unmapped:award.st.back(reserved:award.res.reopen)', p + '.st ' + c.a.st + '→' + to, 'v24.3 F-09 — يُرفض ما دام محجوزاً');
      }
      if (other.length) R.op('award.res.edit', p + '.' + other.join('/'));
    }
    var rk = union(a, b); for (i = 0; i < rk.length; i++) if (rk[i] !== 'recs' && !deq(a[rk[i]], b[rk[i]])) R.res(rk[i], 'unknown-root-key');
  };
  C['bassam_award_docs_v2'] = function (R, a, b) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, g, x, y;
    for (i = 0; i < ks.length; i++) {
      g = ks[i]; x = a[g]; y = b[g]; if (deq(x, y)) continue;
      if (x === undefined) { R.op('award.doc.create', g, 'group-created'); continue; }
      if (y === undefined) { R.op('award.doc.delete', g, 'group-removed'); continue; }
      x = isObj(x) ? x : {}; y = isObj(y) ? y : {};
      var sx = arr(x.secs), sy = arr(y.secs), meta = 0, q, diff = 0, n = Math.max(sx.length, sy.length);
      if (!deq(x.title, y.title)) meta++; if (!deq(x.lead, y.lead)) meta++; if (!deq(x.foot, y.foot)) meta++;
      for (q = 0; q < n; q++) if (!deq(sx[q], sy[q])) diff++;
      var reset = (meta === 3 && !deq(sx, sy)) || (n >= 2 && diff === n && meta >= 1);                  /* كلُّ الأقسام تبدّلت ومعها الترويسة = استبدالٌ كامل */
      if (reset) { R.op('award.doc.reset', g, 'full-replace-shape'); continue; }
      if (!deq(sx, sy)) { if (sy.length > sx.length && prefixEq(sx, sy)) R.op('award.doc.create', g + '.secs', 'appended'); else if (sy.length < sx.length) R.op('award.doc.delete', g + '.secs'); else R.op('award.doc.edit', g + '.secs'); }
      if (meta) R.op('award.doc.edit', g + '.meta');
    }
  };
  /* ═══ الموظفون ═══ */
  C['bassam_employees_v1'] = function (R, a, b, ctx) {
    var la = arr(a), lb = arr(b), i;
    var m = matchById(la, lb, function (e) { if (!isObj(e)) return null; var v = e.nid || e.eid || e.empno || e.name; return v == null || v === '' ? null : 'e:' + v; });
    if (m.removed.length >= 2 || (!lb.length && la.length)) R.op('emp.record.bulk.delete', 'n=' + m.removed.length, 'D-10');
    else for (i = 0; i < m.removed.length; i++) R.op('emp.record.delete', '[' + m.removed[i].id + ']');
    /* Phase 3 (F-10): لا استدلالَ بالشكل — import.run يأتي من marker الطلب (ctx.op) في classify()؛ الشكلُ الجماعي يُسجَّل علماً للقياس فقط */
    if (m.added.length + m.changed.length >= 2) R.flags.importHeuristic = (R.flags.importHeuristic || 0) + 1;
    for (i = 0; i < m.added.length; i++) R.op('emp.record.create', '[' + m.added[i].id + ']');
    for (i = 0; i < m.changed.length; i++) {
      var c = m.changed[i], ks = union(c.a, c.b), q, f = [];
      for (q = 0; q < ks.length; q++) if (!deq(c.a[ks[q]], c.b[ks[q]])) f.push(ks[q]);
      if (f.length === 1 && f[0] === 'email' && ctx && ctx.actor && String(c.a.eid || c.a.nid || c.a.name) === String(ctx.actor.ekey)) { R.alt.push('self.profile.edit'); }
      if (f.length === 1 && f[0] === 'eid' && (c.a.eid == null || c.a.eid === '')) { R.tec('[' + c.id + '].eid (adopt)'); continue; }
      if (f.length === 1 && f[0] === 'job') { R.tec('[' + c.id + '].job (drop)'); continue; }
      R.op('emp.record.edit', '[' + c.id + '].' + f.join('/'));
    }
  };
  /* ═══ الحسابات (عامّ) ═══ */
  var SELF_FIELDS = { ph: 1, name: 1, email: 1, phone: 1, un: 1, alt: 1 };
  C['bassam_auth_users_v1'] = function (R, a, b, ctx) {
    var la = arr(a), lb = arr(b), i, me = ctx && ctx.actor ? String(ctx.actor.id || '') : '';
    var m = matchById(la, lb, function (e) { return isObj(e) && e.id != null ? 'u:' + e.id : null; }), act = [], frz = [];
    function plainStaff(u) { return isObj(u) && u.role === 'staff' && !u.mgr; }
    for (i = 0; i < m.added.length; i++) { if (plainStaff(m.added[i].b)) act.push('[' + m.added[i].id + '] new'); else R.op('sys.users.manage', '[' + m.added[i].id + '] new ' + (m.added[i].b && m.added[i].b.role)); }
    for (i = 0; i < m.removed.length; i++) { if (plainStaff(m.removed[i].a)) R.op('emp.record.delete', '[' + m.removed[i].id + '] removed', 'D-20'); else R.op('sys.users.manage', '[' + m.removed[i].id + '] removed'); }
    for (i = 0; i < m.changed.length; i++) {
      var c = m.changed[i], ks = union(c.a, c.b), q, f = [];
      for (q = 0; q < ks.length; q++) { if (deq(c.a[ks[q]], c.b[ks[q]])) continue; if (ks[q] === 'ph' && (c.b.ph === undefined || c.b.ph === '')) continue; f.push(ks[q]); }   /* ph الغائب يُورَث (usersRule) */
      if (!f.length) continue;
      if (me && 'u:' + me === c.id) { var onlySelf = true; for (q = 0; q < f.length; q++) if (!SELF_FIELDS[f[q]]) onlySelf = false; if (onlySelf) { R.op(f.length === 1 && f[0] === 'ph' ? 'self.password.change' : 'self.profile.edit', '[' + c.id + '].' + f.join('/')); continue; } R.op('sys.users.manage', '[' + c.id + '].' + f.join('/'), 'self-non-self-field'); continue; }
      if (!plainStaff(c.a) || !plainStaff(c.b)) { R.op('sys.users.manage', '[' + c.id + '].' + f.join('/')); continue; }
      var disA = !!c.a.dis, disB = !!c.b.dis;
      if (!disA && disB) frz.push('[' + c.id + '].dis 0→1');
      else if (disA && !disB) act.push('[' + c.id + '].dis 1→0');
      else { var cred = false; for (q = 0; q < f.length; q++) if (f[q] === 'un' || f[q] === 'alt' || f[q] === 'ph' || f[q] === 'name' || f[q] === 'no' || f[q] === 'mc') cred = true; if (cred && f.length) act.push('[' + c.id + '].' + f.join('/') + ' refresh'); else R.op('sys.users.manage', '[' + c.id + '].' + f.join('/'), 'role/scope-field'); }
    }
    if (act.length >= 2) R.op('emp.account.bulk.activate', act.join(' · '), 'n=' + act.length); else for (i = 0; i < act.length; i++) R.op('emp.account.activate', act[i]);
    if (frz.length >= 2) R.op('emp.account.bulk.freeze', frz.join(' · '), 'n=' + frz.length); else for (i = 0; i < frz.length; i++) R.op('emp.account.freeze', frz[i]);
  };
  /* ═══ الصلاحيات (عامّ) ═══ */
  var PERM_GRANT = { emps: 1, tplOf: 1, empLens: 1 };
  C['bassam_perms_v1'] = function (R, a, b) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, k, x, y, q, dk;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; x = a[k]; y = b[k]; if (deq(x, y)) continue;
      x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; dk = union(x, y);
      if (PERM_GRANT[k]) { for (q = 0; q < dk.length; q++) if (!deq(x[dk[q]], y[dk[q]])) R.op('perm.assign', k + '[' + dk[q] + ']'); continue; }
      if (k === 'lenses') { var up = true; for (q = 0; q < dk.length && up; q++) { var lo = arr(x[dk[q]]), ln = arr(y[dk[q]]), z; for (z = 0; z < lo.length && up; z++) if (ln.indexOf(lo[z]) === -1) up = false; for (z = 0; z < ln.length && up; z++) if (lo.indexOf(ln[z]) === -1 && ln[z] !== 'zones') up = false; } if (up) { R.tec('lenses (zones upgrade)'); continue; } }
      for (q = 0; q < dk.length; q++) if (!deq(x[dk[q]], y[dk[q]])) R.op('sys.ceiling.set', k + '[' + dk[q] + ']');
    }
  };
  /* ═══ قوالبُ الصلاحيات ═══ */
  C['bassam_perm_tpls_v1'] = function (R, a, b) {
    var la = arr(a), lb = arr(b), i, m = matchById(la, lb, function (e) { return isObj(e) && e.id != null ? 't:' + e.id : null; });
    for (i = 0; i < m.added.length; i++) R.op('tpl.create', '[' + m.added[i].id + ']');
    for (i = 0; i < m.removed.length; i++) R.op('tpl.delete', '[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) { var c = m.changed[i], ks = union(c.a, c.b), q, f = []; for (q = 0; q < ks.length; q++) if (!deq(c.a[ks[q]], c.b[ks[q]])) f.push(ks[q]); if (f.indexOf('sup') !== -1) R.op('tpl.supervisory', '[' + c.id + '].sup'); var rest = f.filter(function (z) { return z !== 'sup'; }); if (rest.length) R.op('tpl.edit', '[' + c.id + '].' + rest.join('/')); }
    if (!m.added.length && !m.removed.length && !m.changed.length && !deq(la, lb)) R.op('tpl.edit', '[] reorder');
  };
  C['bassam_perm_tpls_named_v1'] = function (R) { R.tec('migration-flag'); };
  /* ═══ الاسترشاد · المضبوطات ═══ */
  function recBulk(prefix) {
    return function (R, a, b) {
      a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
      var m = matchById(arr(a.reports), arr(b.reports), function (e) { return isObj(e) && e.id != null ? 'r:' + e.id : null; }), i;
      for (i = 0; i < m.added.length; i++) R.op(prefix + '.create', 'reports[' + m.added[i].id + ']');
      if (m.removed.length >= 2) R.op(prefix + '.bulk.delete', 'reports n=' + m.removed.length, 'D-10'); else for (i = 0; i < m.removed.length; i++) R.op(prefix + '.delete', 'reports[' + m.removed[i].id + ']');
      for (i = 0; i < m.changed.length; i++) R.op(prefix + '.edit', 'reports[' + m.changed[i].id + ']');
      var ks = union(a, b); for (i = 0; i < ks.length; i++) if (ks[i] !== 'reports' && !deq(a[ks[i]], b[ks[i]])) R.res(ks[i], 'unknown-root-key');
    };
  }
  C['bassam_irshad_v1'] = recBulk('ir.rec'); C['bassam_seized_v1'] = recBulk('sz.rec');
  C['bassam_last_export_v1'] = function (R) { R.op('backup.create', 'stamp'); };
  /* ═══ الواجهة ═══ */
  function classify(resName, a, b, ctx) {
    var fn = C[resName]; if (!fn) return null;
    var R = new Res(); fn(R, a, b, ctx || {});
    if (ctx && ctx.restore) R.op('backup.restore', '*', 'restore-batch (marker/aud — F-13)');
    /* Phase 3 (F-10): علامةُ الاستيراد الصريحة من تدفق الاستيراد الحقيقي — لكل مفتاحٍ في حفظتها */
    if (ctx && ctx.op === 'import.run') R.op('import.run', '*', 'import-marker (Phase 3)');
    return R;
  }
  /* قرارُ v24.5 الظلّي لمفتاحٍ واحد (المنطقُ نفسُه منذ v24.3): مفاتيحُ «role:mgr + ورقة» تشترط الاثنين (usersRule/permsRule في المصدر) — وما سواه كما في KIVO_REGISTRY.can */
  function decide(key, ctx) {
    var e = R.byKey[key]; if (!e) return { ok: false, why: 'unknown' };
    if (ctx && ctx['super']) return { ok: true, why: 'super' };
    var v = R.can(key, ctx);
    if (v.ok && e.grant !== 'role' && e.grant !== 'self' && e.asisMap.indexOf('role:mgr') !== -1) {
      var hasLeaf = false, i; for (i = 0; i < e.asisMap.length; i++) if (e.asisMap[i].indexOf('role:') !== 0) hasLeaf = true;
      if (hasLeaf) { var T = (ctx && ctx.translated) || R.translate(ctx && ctx.sheet); if (!T.keys[key]) return { ok: false, why: 'mgr-without-sheet' }; }
    }
    return v;
  }
  var covers = Object.keys(C);
  return { version: B.version, phase: 4.1, mode: 'shadow', bindings: B.bindings, shadowOnly: B.shadowOnly, decisions: B.decisions, counts: B.counts, covers: covers, classify: classify, decide: decide,
           _h: { deq: deq, matchById: matchById, classifyMonthRec: classifyMonthRec, attKey: attKey, FIELD_KEYS: FIELD_KEYS, GEOM: GEOM } };
})(KIVO_GUARD_BINDINGS, KIVO_REGISTRY);

