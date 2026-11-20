/* ══ R169-CC · READ-01: خريطةُ القراءة المرجعيّة ══════════════════════════
   الكتابةُ تُسأل عن ورقةِ المورد (cap)، والقراءةُ تُسأل عن الأوراق التي تقرؤه فعلاً — وهي تُستخرج من
   الصفحات نفسِها لا من الظنّ: دليلُ الموظفين وأسماءُ الورديات تقرؤها كلُّ صفحةٍ تشغيليّة لتكتب اسماً،
   وسجلّاتُ المضبوطات والإرشاد والجائزة والعهدة والمهام لا تقرؤها إلا صفحتُها. ومَن مُنح «النسخ
   الاحتياطية» يقرأ كلَّ مجموعات إدارته لأن النسخةَ لا تُصدَّر ناقصة. */
var RD_ANY = ['admin/backup'];            /* ورقةٌ تقرأ كلَّ مجموعات الإدارة */
var RD_OPS = ['emps/data',@@SYS:read.ops.staff@@@@SYS:read.ops.plan@@'daily/rounds','daily/field'@@SYS:read.ops.dreport@@@@SYS:read.ops.tasks@@@@SYS:read.ops@@,'planning','planning/readiness'];           /* كلُّ الأوراق التشغيلية — للمراجع المشتركة */
var RD_REG = {
  /* ── مراجعُ مشتركة: تُقرأ من كل صفحةٍ تشغيليّة لتعرض اسماً أو ورديّة ── */
  'bassam_employees_v1':       RD_OPS,
  'bassam_shift_options_v1':   RD_OPS.concat(['admin/shifts']),
@@SYS:read.map.roster.staff@@@@SYS:read.map.res.dreport@@  'bassam_options_v1':         ['emps/data'@@SYS:read.map.reader.staff.2@@@@SYS:read.map.reader.tasks.2@@, 'planning', 'planning/readiness'],
  'bassam_perm_tpls_v1':       ['admin/ptpls'@@SYS:read.reader.dreport@@, 'emps/data'@@SYS:read.map.reader.plan.1@@@@SYS:read.map.reader.staff.3@@@@SYS:read.map.reader.tasks.3@@, 'planning', 'planning/readiness'],
  'bassam_perm_tpls_named_v1': ['admin/ptpls'@@SYS:read.map.reader.staff.4@@],
@@SYS:read.map.locks.staff@@  /* ── الموظفون ── */
@@SYS:readMap.custody@@@@SYS:read.map.staff@@  /* ── الخطة التشغيلية والمتابعة اليومية: بنيةُ الموقع تُقرأ من صفحتَيه ومن التقرير ── */
@@SYS:read.map.plan@@  'bassam_rounds_v1':          ['daily/rounds', 'daily/field'@@SYS:read.reader.dreport@@, 'emps/data'@@SYS:read.map.reader.plan.3@@@@SYS:read.map.rounds@@],
  'bassam_dayshift_v1':        ['daily/rounds', 'daily/field'@@SYS:read.reader.dreport@@],
  'bassam_dayfocus_v1':        ['daily/rounds', 'daily/field'@@SYS:read.reader.dreport@@],
@@SYS:read.map.reg.dreport@@@@SYS:read.map.tasks@@@@SYS:read.map.systems@@  /* ── الإعدادات ── */
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
@@SYS:authz.read.dstats@@  if (!P.dept) return P.name !== K_NSYS;                     /* السجلات العامة (الإدارات، الحسابات بلا بصمات، الصلاحيات) — عدا تنبيهات مدير النظام */
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

