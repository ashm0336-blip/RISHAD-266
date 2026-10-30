/* ══ العمليات المحمية ══════════════════════════════════════════════════════
   أربعٌ لا تحتمل تطبيقاً جزئياً: إعادةُ تسمية وردية وتبعتُها · حذفُ موظفٍ
   وتنظيفُ أثره · تبنّي الهوية · إعادةُ تسمية صنف عهدة. متى ظهرت إحداها في
   الطلب صار الطلبُ كلُّه ذرّياً: إمّا أن يمرّ تماماً أو لا يُكتب منه شيء. */
function prot9(E, k, PV, ctx) {
  var rn = resName(k);
  if (rn === 'bassam_shift_options_v1' && ctx && ctx.shRen) return 'shiftRename';
  if (!E || (!E.rename && !E.adopt)) return '';
  var a = PV ? PV.a() : null, b = PV ? PV.b() : null;
  if (a === undefined || b === undefined || a == null || b == null) return '';
  var info = {};
  alignOld(E, a, b, info);
  if (info.ren) return 'custodyRename';
  if (info.adopt) return 'adopt';
  return '';
}
function canWrite(A, k, newVal, curVal, ctx) {
  if (A && A.enf) return canWriteEnf(A, k, newVal, curVal, ctx);              /* KIVO_243: الكتابة من سجل v24.9 */
  var u = A.u;
  /* سجل الموارد يسبق كل شيء: ما لا سياسة له لا يُكتب — ولا يُستثنى منه دور */
  var R0 = resOf(k);
  if (!R0) return { ok: false, why: 'unknown' };
  if (R0.scope === 'device') return { ok: false, why: 'device' };
  /* مدير النظام: مطلقٌ في السجلات العامة وحدها. أمّا موارد الإدارات فيمرّ
     عليها كغيره عبر سجل الموارد وسقف الإدارة والوحدة المطفأة. */
  /* KIVO_264 · D14: عدا اسمَ دخوله هو — كلمةُ المرور الحالية (cur) وصيغةُ 10 أرقام كغيره (superSelfWhy) */
  if (u.role === 'super' && R0.scope === 'global') { var ssw = k === K_USERS && newVal != null ? superSelfWhy(A, newVal, curVal, ctx) : null; return ssw ? { ok: false, why: ssw } : { ok: true }; }
  var P = parseKey(k);
  if (!P.dept) {
    if (P.name === K_USERS) return newVal == null ? { ok: false, why: 'users' } : usersRule(A, newVal, curVal, ctx);
    if (P.name === K_PERM) return newVal == null ? { ok: false, why: 'super' } : permsRule(A, newVal, curVal);
    /* R180: الإحصائيات اليومية — أوراقُ المسجدين تحكم كتابتَها، وحذفُ المفتاح كلِّه لمدير النظام وحده */
    if (P.name === K_DSTATS) return newVal == null ? { ok: false, why: 'super' } : dstatsRule(A, newVal, curVal);
    return { ok: false, why: 'super' };
  }
  if (!deptInScope(A, P.dept)) return { ok: false, why: 'dept' };
  var nm = P.name;
  if (nm.indexOf('bassam_page_v1') === 0) return { ok: true };
  /* علامة «دخول من جهاز جديد» الشخصية: كل مستخدم يكتب علامته هو وحده — كانت تُرفض لمن صلاحيته عرضٌ فقط فيتكرر التنبيه ومعه خطأ */
  if (nm.indexOf('bassam_notif_dev_v1:') === 0) return nm === 'bassam_notif_dev_v1:' + u.id ? { ok: true } : { ok: false, why: 'view' };
  if (nm === K_NOTIF) return notifRule(A, P.dept, newVal, curVal);
  if (FLAG_KEYS[nm]) return isMgrOf(A, P.dept) ? { ok: true } : { ok: false, why: 'flag' };
  /* ═══ القرار من النواة وحدها ═══
     لا «مفتاح غير مسجّل = اسمح»: ما ليس في RES_REG يُرفض. ولا ضغطَ للورقة إلى
     صفحتها الأم: صاحب emps/custody لا يكتب emps، وصاحب daily/field لا يكتب
     الجولة، وصاحب staff لا يكتب admin/shifts. */
  var R9 = resOf(k);
  if (!R9) return { ok: false, why: 'unknown' };
  var rule9 = R9.rule || '';
  /* writePages تعيد null لمدير النظام بمعنى «بلا حدود» — وكان (null||[]).length = 0
     يُقرأ «لا يكتب شيئاً» فيُحرم من كل مفتاحٍ تقنيّ، فيتكرّر الرفض ومعه تنبيهُه.
     وهو جذرُ الكتابات الخلفية على bassam_notif_sys_v1. */
  if (rule9 === 'tech') { var wpT = writePages(A, P.dept); return (wpT === null || wpT.length) ? { ok: true } : { ok: false, why: 'view' }; }
  if (rule9) return { ok: false, why: rule9 };            /* users · perms · notif · flag · selfdev فُحصت أعلاه */
  /* العملية تُستنتج من القيمة نفسها ثم يُشترط امتلاك كل فعلٍ فيها */
  /* حذف المفتاح كله يُعرف من القيمة بلا مقارنةٍ أصلاً، ومَن يملك أفعال الكتابة
     كلها لا يحتاج تصنيفاً — فلا تُدفع كلفةُ مقارنةِ فرقٍ على القيم الكبيرة. */
  if (newVal == null) return allowKeyDelete(A, k, R9) ? { ok: true } : { ok: false, why: 'keydel' };
  var E9 = entOf(k), O9 = opsOf(k);
  /* تحليلٌ كسولٌ واحدٌ للقيمتين يُمرَّر على الطبقات كلها — لا يُحلَّل إلا عند
     الحاجة، ولا يُعاد تحليل حمولةٍ كبيرة مرّتين */
  var PV9 = (function () {
    var A, B, ha = 0, hb = 0;
    return {
      a: function () { if (!ha) { ha = 1; A = curVal == null ? undefined : parseJson(curVal, undefined); } return A; },
      b: function () { if (!hb) { hb = 1; B = parseJson(newVal, undefined); } return B; }
    };
  })();
  /* KIVO_265 · H-1: العمودُ 23 في مخزن المهام للخادم وحده (018 taskXWhy) — قبل كلّ صلاحيةٍ ومسارٍ مختصر (holdsAllWrites)؛
     والمراجعةُ الموحّدة: المكلَّفُ بعد نشاط الموظف (R-1 · R-7 taskAsgWhy) والحسابُ النشط (R-2 taskAcctWhy) — 018 taskRawWhy */
  if (nm === 'bassam_tasks_v1') { var xw9 = taskRawWhy(A, PV9.a(), PV9.b(), P.dept, ctx); if (xw9) return { ok: false, why: xw9 }; }
  if (nm === 'bassam_employees_v1') { var xd9 = empDupWhy(A, PV9.a(), PV9.b(), P.dept, ctx); if (xd9) return { ok: false, why: xd9 }; }   /* KIVO_265 · أمن: 018 empDupWhy */
  /* الثوابت أولاً: الشكل الجذري · المجموعات المعلَنة · الهوية وتفرّدها ·
     مشروعية عملية الاعتماد — قبل التنظيف وقبل holdsAllWrites وقبل كل صلاحية */
  if (E9 || O9) {
    var inv9 = invariantViolation(k, curVal, newVal, E9, O9, PV9, ctx);
    if (inv9) return { ok: false, why: inv9 };
  }
  if (dreportCleanup(A, k, newVal, curVal, ctx)) return { ok: true };
  if (custodyCleanup(A, k, newVal, curVal, ctx)) return { ok: true };
  if (awardCleanup(A, k, newVal, curVal, ctx)) return { ok: true };
  var cmv9 = custodyMoveOp(A, k, curVal, newVal, PV9);
  if (cmv9 === true) return { ok: true };
  if (cmv9 === false) return { ok: false, why: 'act' };
  if (empGoneCleanup(A, k, newVal, curVal, ctx, PV9)) return { ok: true, prot: 'empDelete' };
  if (shiftRenameOk(A, k, newVal, curVal, ctx)) return { ok: true, prot: 'shiftRename' };
  /* الإلحاق المحض يُفحص قبل الصلاحيات: لا يكسره صاحب add+edit+del */
  if (E9 && E9.append && curVal != null && appendViolation(E9, alignOld(E9, PV9.a() === undefined ? null : PV9.a(), PV9.b()), PV9.b() === undefined ? null : PV9.b()))
    return { ok: false, why: 'append' };
  if (holdsAllWrites(A, k, R9)) return { ok: true };
  var need9 = classifyMutation(R9, curVal, newVal, E9, O9, PV9);
  var acts9 = Object.keys(need9);
  if (!acts9.length) acts9 = ['edit'];                    /* حفظٌ لا يغيّر شيئاً: يُعامل تعديلاً */
  var v9 = authorizeActs(A, k, acts9);
  if (v9.ok) return { ok: true, prot: prot9(E9, k, PV9, ctx) };
  /* ═══ الاستثناءات المقيَّدة: منحٌ محدودٌ بحقولٍ بعينها لا يتحوّل إلى كتابة
     المورد كاملاً — كلٌّ منها يقارن القديم بالجديد ويقبل التغيير المسموح وحده ═══ */
  /* ═══ رصد الميدان: قدرةٌ تشغيلية مخصوصة لا كتابةٌ عامة ═══
     نصّ المنصة صريحٌ أن «عرض» يكفي للرصد (canField تعتمد tabOn('daily','field')).
     فتُستعاد الصفة كما هي، لكن محصورةً في عمليةٍ واحدة لا تتعدّاها:
       • الفاعل يملك daily/field:view في هذه الإدارة
       • و fieldObsOnly تُثبت أن كل موضعٍ تغيّر هو حقلُ رصدٍ من FIELD_KEYS
         داخل موقعٍ مسكَّنٍ للموظف نفسه (day.d.N.(gates|zones|marks).M.field)
       • فلا موقعٌ يُضاف ولا يُحذف، ولا تسكينُ غيره يُمسّ، ولا بقيةُ الجولة،
         ولا مفتاحٌ يُحذف — لأن شكل المسار نفسه يمنع ذلك.
     وهي لا تُعطي add ولا del ولا approve على المورد. */
  if (R9.field === 'daily' && newVal != null && !need9.keyDelete
      && (myPermsOf(A, P.dept)['daily/field'] || []).indexOf('view') !== -1
      && capOnDept(A, P.dept, 'daily/field')
      && fieldObsOnly(A, newVal, curVal)) return { ok: true };
  var via9 = R9.via || {}, diffs9 = null;
  for (var vp9 in via9) {
    if (newVal == null || !actsHeldOn(A, P.dept, vp9, acts9)) continue;
    var fn9 = VIA_FN[via9[vp9]]; if (!fn9) continue;
    if (!diffs9) diffs9 = walkDiff(curVal, newVal);
    if (diffs9.length && diffs9.every(fn9)) return { ok: true };
  }
  if (R9.self === 'email' && newVal != null && selfEmailOnly(A, newVal, curVal)) return { ok: true };
  if (R9.self === 'task' && newVal != null && selfTaskOnly(A, newVal, curVal)) return { ok: true };
  return { ok: false, why: v9.why };
}
