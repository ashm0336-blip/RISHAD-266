/* ══ R169-CC · READ-01: خريطةُ القراءة المرجعيّة ══════════════════════════
   الكتابةُ تُسأل عن ورقةِ المورد (cap)، والقراءةُ تُسأل عن الأوراق التي تقرؤه فعلاً — وهي تُستخرج من
   الصفحات نفسِها لا من الظنّ: دليلُ الموظفين وأسماءُ الورديات تقرؤها كلُّ صفحةٍ تشغيليّة لتكتب اسماً،
   وسجلّاتُ المضبوطات والإرشاد والجائزة والعهدة والمهام لا تقرؤها إلا صفحتُها. ومَن مُنح «النسخ
   الاحتياطية» يقرأ كلَّ مجموعات إدارته لأن النسخةَ لا تُصدَّر ناقصة. */
var RD_ANY = ['admin/backup'];            /* ورقةٌ تقرأ كلَّ مجموعات الإدارة */
var RD_OPS = ['emps/data','staff','plan','daily/rounds','daily/field','dreport','tasks','irshad/records','seized/records','award/res','award/new','award/doc','planning','planning/readiness'];           /* كلُّ الأوراق التشغيلية — للمراجع المشتركة */
var RD_REG = {
  /* ── مراجعُ مشتركة: تُقرأ من كل صفحةٍ تشغيليّة لتعرض اسماً أو ورديّة ── */
  'bassam_employees_v1':       RD_OPS,
  'bassam_shift_options_v1':   RD_OPS.concat(['admin/shifts']),
  'bassam_staffing_v3':        RD_OPS,
  'bassam_dreport_v1':         ['dreport', 'daily/rounds', 'daily/field', 'emps/data', 'irshad/records', 'seized/records', 'staff', 'tasks', 'planning', 'planning/readiness'],
  'bassam_options_v1':         ['emps/data', 'staff', 'tasks', 'planning', 'planning/readiness'],
  'bassam_perm_tpls_v1':       ['admin/ptpls', 'dreport', 'emps/data', 'plan', 'staff', 'tasks', 'planning', 'planning/readiness'],
  'bassam_perm_tpls_named_v1': ['admin/ptpls', 'staff'],
  'bassam_staffing_locks_v1':  ['staff', 'dreport', 'emps/data', 'plan', 'planning', 'planning/readiness'],
  'bassam_perm_limit_v1':      ['staff', 'dreport', 'planning', 'planning/readiness'],
  /* ── الموظفون ── */
  'bassam_custody_v1':         ['emps/custody'],
  /* ── التوزيع ── */
  'bassam_staffing_v2':        ['staff', 'planning', 'planning/readiness'],
  'bassam_staffing_snap_v1':   ['staff'],
  'bassam_callsigns_v1':       ['staff', 'dreport'],
  /* ── الخطة التشغيلية والمتابعة اليومية: بنيةُ الموقع تُقرأ من صفحتَيه ومن التقرير ── */
  'bassam_plan_v1':            ['plan', 'daily/rounds', 'daily/field', 'dreport', 'emps/data'],
  'bassam_zone_opts_v1':       ['plan', 'daily/rounds', 'daily/field'],
  'bassam_gate_opts_v1':       ['plan', 'daily/rounds', 'daily/field'],
  'bassam_mark_kinds_v1':      ['plan', 'daily/rounds', 'daily/field'],
  'bassam_rounds_v1':          ['daily/rounds', 'daily/field', 'dreport', 'emps/data', 'plan', 'seized/records'],
  'bassam_dayshift_v1':        ['daily/rounds', 'daily/field', 'dreport'],
  'bassam_dayfocus_v1':        ['daily/rounds', 'daily/field', 'dreport'],
  /* ── التقرير اليومي ── */
  'bassam_dr_grp_v1':          ['dreport'],
  'bassam_leave_kinds_v1':     ['dreport', 'staff'],
  /* ── المهام ── */
  'bassam_tasks_v1':           ['tasks'],
  'bassam_tasks_locks_v1':     ['tasks'],
  /* ── الاسترشاد ── */
  'bassam_irshad_v1':          ['irshad/records', 'irshad/dash'],
  'bassam_irshad_langs_v1':    ['irshad/records', 'irshad/dash'],
  'bassam_irshad_locs_v1':     ['irshad/records', 'irshad/dash'],
  /* ── المضبوطات ── */
  'bassam_seized_v1':          ['seized/records', 'seized/dash'],
  'bassam_seized_cat_v1':      ['seized/records', 'seized/dash'],
  'bassam_seized_acts_v1':     ['seized/records', 'seized/dash'],
  'bassam_seized_locs_v1':     ['seized/records', 'seized/dash'],
  'bassam_seized_jew_v1':      ['seized/records', 'seized/dash'],
  /* ── جائزة التميز ── */
  'bassam_award_v1':           ['award/res', 'award/new', 'emps/data'],
  'bassam_award_docs_v1':      ['award/doc', 'award/res', 'award/new'],
  'bassam_award_docs_v2':      ['award/doc', 'award/res', 'award/new'],
  /* ── الإعدادات ── */
  'bassam_last_export_v1':     ['admin/backup']
};
/* ما يُرى دون أن يُقرأ: رقمُ المراجعة وحدَه ═══════════════════════════════
   مَن يملك كتابةً في موردٍ لا يقرؤه (مسارا التنظيف الشاملان: «حذف الكل واستيراد» و«حذف جميع الموظفين»
   يكتبان الشكلَ الفارغ في موارد صفحاتٍ أخرى) يحتاج رقمَ مراجعته ليُحترم عقدُ التعارض R167 — لا قيمتَه.
   فيُعطى الرقمَ عارياً والقيمةُ لا تُرسل أبداً. */
var WR_ACTS = ['add', 'edit', 'del', 'approve'];
function canSee(A, k) {
  if (A && A.enf) return canSeeEnf(A, k);                                     /* KIVO_243 */
  if (canRead(A, k)) return true;
  var P = parseKey(k); if (!P.dept || !deptInScope(A, P.dept)) return false;
  var R = resOf(k); if (!R || R.scope !== 'dept') return false;
  if (R.rule) return true;
  for (var i = 0; i < WR_ACTS.length; i++) if (authorize(A, k, WR_ACTS[i]).ok) return true;
  /* الأوراقُ الثلاث التي تكتب عملياتُها المحميّةُ في موارد صفحاتٍ أخرى بحكم التبعة:
     «حذف الكل واستيراد» · «حذف جميع الموظفين» (تنظيفُ أثره في العهد والمهام والجائزة والخطة والتوزيع) ·
     «الورديات» (إعادةُ التسمية وتبعتُها في الجدول الشهري). حاملُها يرى رقمَ المراجعة لا القيمة. */
  return actsHeldOn(A, P.dept, 'admin/import', ['del']) || actsHeldOn(A, P.dept, 'emps/data', ['del'])
      || actsHeldOn(A, P.dept, 'admin/shifts', ['edit']);
}
/* أوراقُ قراءةِ المورد: خريطتُه إن كانت، وإلا ورقةُ كتابته — ومعها دائماً ورقةُ النسخ الاحتياطية */
function readCapsOf(name, R) {
  var rd = RD_REG[name];
  if (!rd) rd = Array.isArray(R.cap) ? R.cap : (R.cap ? [R.cap] : []);
  if (R.capAdd && rd.indexOf(R.capAdd) === -1) rd = rd.concat([R.capAdd]);
  return rd.concat(RD_ANY);
}
/* سقفُ الإدارة أولاً: صفحةُ المورد نفسِه (cap · capAdd) على سقف الإدارة d؟ — صفحةٌ خارجَ السقف (أو وحدةٌ مطفأةٌ على مستوى المنصة) لا يقرؤها
   أحدٌ في الإدارة، ولا صاحبُ «النسخ الاحتياطية» ولا قارئُ المراجع المشتركة، فالقراءةُ لا تتجاوز سقفَ إدارتها؛ وموردٌ بلا صفحة (قاعدةٌ خاصة) بلا سقف.
   KIVO_264 · QA-264-D1: القاعدةُ نفسُها للوضعين — canRead0 (أدناه، بلا تغيير سلوك) وcanReadEnf (061) الذي كان يكتفي بأيّ مفتاح قراءةٍ محمول
   (backup.view …) فيقرأ مديرُ الإدارة ومديرُ الفرع قيمةَ صفحةٍ خارج سقف الإدارة أو وحدةٍ مطفأة. */
function resOnCeiling(A, d, R) {
  if (A && A.u && A.u.role === 'super') return true;   /* V7 · د1-ج (قرار صاحب المنصة): مدير المنصة بلا قيد صلاحية — قبل السقف والوحدات المطفأة والعدسة والأوراق */
  var own = Array.isArray(R.cap) ? R.cap : (R.cap ? [R.cap] : []);
  if (R.capAdd) own = own.concat([R.capAdd]);
  if (!own.length) return true;
  for (var i = 0; i < own.length; i++) if (capOnDept(A, d, own[i])) return true;
  return false;
}
function canRead0(A, k) {
  if (A.u.role === 'super') return true;
  var P = parseKey(k);
  /* R181: الإحصائياتُ اليومية عامّةٌ للحرمين لكنها لا تُقرأ إلا بورقةٍ منها — كانت تُعطى لكلِّ من دخل المنصة */
  if (!P.dept && P.name === K_DSTATS) return dsHeld(A, DS_READ, ['view']);
  if (!P.dept) return P.name !== K_NSYS;                     /* السجلات العامة (الإدارات، الحسابات بلا بصمات، الصلاحيات) — عدا تنبيهات مدير النظام */
  if (!deptInScope(A, P.dept)) return false;                 /* إدارةٌ أخرى: لا شيء */
  /* READ-01: النطاقُ وحدَه لا يكفي — الورقةُ تُسأل هنا كما تُسأل في الكتابة */
  var R = resOf(k);
  if (!R) return false;                                      /* مورد مجهول = رفض */
  if (R.scope !== 'dept') return false;                      /* مفتاحٌ عامٌّ أو جهازيٌّ بادئتُه إدارة: لا */
  if (R.rule) return true;                                   /* تنبيهاتٌ وملفٌّ شخصيّ: سياستُها الخاصة تحرسها */
  /* سقفُ الإدارة أولاً: صفحةٌ خارجَ سقف الإدارة (أو وحدةٌ مطفأةٌ على مستوى المنصة) لا يقرؤها أحدٌ فيها —
     ولا صاحبُ «النسخ الاحتياطية»، فالنسخةُ لا تتجاوز سقفَ إدارتها. (KIVO_264: الفحصُ نفسُه حرفاً في resOnCeiling — مشتركٌ مع الإنفاذ) */
  if (!resOnCeiling(A, P.dept, R)) return false;
  var caps = readCapsOf(P.name, R), perms = myPermsOf(A, P.dept);
  for (var i = 0; i < caps.length; i++) {
    var c = caps[i];
    if (!capOnDept(A, P.dept, c)) continue;                  /* خارجَ سقف الإدارة أو وحدةٌ مطفأة */
    if (RD_ANY.indexOf(c) !== -1 && !bkReadAnyOk(A, P.dept, P.name)) continue;   /* IP39 (019u): «النسخ الاحتياطية» عرضاً وحده لا يفتح مجموعات الإدارة — لمن يصدّرها */
    if ((perms[c] || []).indexOf('view') !== -1) return true;
  }
  return false;
}

