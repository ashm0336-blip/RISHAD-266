/* ══ R169-CC · READ-01: خريطةُ القراءة المرجعيّة ══════════════════════════
   الكتابةُ تُسأل عن ورقةِ المورد (cap)، والقراءةُ تُسأل عن الأوراق التي تقرؤه فعلاً — وهي تُستخرج من
   الصفحات نفسِها لا من الظنّ: دليلُ الموظفين وأسماءُ الورديات تقرؤها كلُّ صفحةٍ تشغيليّة لتكتب اسماً،
   وسجلّاتُ المضبوطات والإرشاد والجائزة والعهدة والمهام لا تقرؤها إلا صفحتُها. ومَن مُنح «النسخ
   الاحتياطية» يقرأ كلَّ مجموعات إدارته لأن النسخةَ لا تُصدَّر ناقصة. */
var RD_ANY = ['admin/backup'];            /* ورقةٌ تقرأ كلَّ مجموعات الإدارة */
var RD_OPS = ['emps/data',@@SYS:read.ops.staff@@@@SYS:read.ops.plan@@@@SYS:read.ops.daily|empty="...[]"@@@@SYS:read.ops.dreport@@@@SYS:read.ops.tasks@@@@SYS:read.ops@@,'planning','planning/readiness'];           /* كلُّ الأوراق التشغيلية — للمراجع المشتركة */
var RD_REG = {
  /* ── مراجعُ مشتركة: تُقرأ من كل صفحةٍ تشغيليّة لتعرض اسماً أو ورديّة ── */
  'bassam_employees_v1':       RD_OPS,
  'bassam_shift_options_v1':   RD_OPS.concat(['admin/shifts']),
@@SYS:read.map.roster.staff@@@@SYS:read.map.res.dreport@@  'bassam_options_v1':         ['emps/data'@@SYS:read.map.reader.staff.2@@@@SYS:read.map.reader.tasks.2@@, 'planning', 'planning/readiness'],
@@SYS:read.map.locks.staff@@  /* ── الموظفون ── */
@@SYS:readMap.custody@@@@SYS:read.map.staff@@  /* ── الخطة التشغيلية والمتابعة اليومية: بنيةُ الموقع تُقرأ من صفحتَيه ومن التقرير ── */
@@SYS:read.map.plan@@@@SYS:read.map.res.daily@@  'bassam_dayshift_v1':        [@@SYS:read.dayReaders.daily|empty="...[]"@@@@SYS:read.reader.dreport@@],
  'bassam_dayfocus_v1':        [@@SYS:read.dayReaders.daily|empty="...[]"@@@@SYS:read.reader.dreport@@],
@@SYS:read.map.reg.dreport@@@@SYS:read.map.tasks@@@@SYS:read.map.systems@@  /* ── الإعدادات ── */
  'bassam_last_export_v1':     ['admin/backup']
};
function canSee(A, k) { return canSeeEnf(A, k); }   /* KIVO_243 · V7 · د5-ح (القفل): المحرّكُ النافذ وحده */
/* أوراقُ قراءةِ المورد: خريطتُه إن كانت، وإلا ورقةُ كتابته — ومعها دائماً ورقةُ النسخ الاحتياطية */
function readCapsOf(name, R) {
  var rd = RD_REG[name];
  if (!rd) rd = Array.isArray(R.cap) ? R.cap : (R.cap ? [R.cap] : []);
  if (R.capAdd && rd.indexOf(R.capAdd) === -1) rd = rd.concat([R.capAdd]);
  return rd.concat(RD_ANY);
}
/* سقفُ الإدارة أولاً: صفحةُ المورد نفسِه (cap · capAdd) على سقف الإدارة d؟ — صفحةٌ خارجَ السقف (أو وحدةٌ مطفأةٌ على مستوى المنصة) لا يقرؤها
   أحدٌ في الإدارة، ولا صاحبُ «النسخ الاحتياطية» ولا قارئُ المراجع المشتركة، فالقراءةُ لا تتجاوز سقفَ إدارتها؛ وموردٌ بلا صفحة (قاعدةٌ خاصة) بلا سقف.
   KIVO_264 · QA-264-D1: القاعدةُ نفسُها للوضعين — canReadEnf (061 — V7 · د5-ح: وحده؛ حُذف حكمُ الوضع القديم canRead0) الذي كان يكتفي بأيّ مفتاح قراءةٍ محمول
   (backup.view …) فيقرأ مديرُ الإدارة ومديرُ الفرع قيمةَ صفحةٍ خارج سقف الإدارة أو وحدةٍ مطفأة. */
function resOnCeiling(A, d, R) {
  if (A && A.u && A.u.role === 'super') return true;   /* V7 · د1-ج (قرار صاحب المنصة): مدير المنصة بلا قيد صلاحية — قبل السقف والوحدات المطفأة والعدسة والأوراق */
  var own = Array.isArray(R.cap) ? R.cap : (R.cap ? [R.cap] : []);
  if (R.capAdd) own = own.concat([R.capAdd]);
  if (!own.length) return true;
  for (var i = 0; i < own.length; i++) if (capOnDept(A, d, own[i])) return true;
  return false;
}
/* V7 · د6 (قرار المالك — قاعدةٌ واحدة لكل من في الوحدة عدا مدير المنصة): النظامُ المطفأ لوحدته (بالوراثة) أو على المنصة لا يُخدم ولا يُكتب.
   هذا موضعُها الواحد في الخادم. المحرّكُ العام يطبّقها بالسؤال نفسِه (capOnDept: resOnCeiling أعلاه · 057 enfKeyOnCeiling) لكل دورٍ سوى مدير المنصة،
   والمساراتُ الخاصة تسأل هذه الدوالّ: «مهامي» (062c) · «ملفي» اليوم والسجل (062b) · سطورُ السجل (052 audSysOff).
     sysOfLeaf(leaf)        النظامُ القابلُ للإطفاء الذي يملك الورقة (perm44 sysList · toggle) — أو ''
     sysOffAt(A, d, key)    النظامُ مطفأٌ على المنصة (A.off مع ما يسكن الحاوية) أو في سقف الوحدة d وأصولها — بلا استثناء دور
     acctUnitOf(A)          وحدةُ الحساب: إدارتُه، أو عقدتُه لمدير العقدة (gm) — أو '' (المنصةُ وحدها تحكم)
     sysServed(A, d, key)   يُخدم للفاعل: مديرُ المنصة دائماً، وغيرُه ما لم يكن مطفأً
     resLeafOffAt(A, d, k)  ورقةُ المورد (RES_REG.cap) لنظامٍ قابلٍ للإطفاء وهي مطفأةٌ في d (صفحةً أو تبويباً، أو على المنصة) — موردٌ بلا ورقة نظام لا يتأثر */
function sysOfLeaf(leaf) {
  leaf = String(leaf || ''); if (!leaf) return '';
  var s = perm44E().sysList().filter(function (x) { return x && x.toggle !== false && Array.isArray(x.leaves) && x.leaves.indexOf(leaf) !== -1; })[0];
  return s ? String(s.key) : '';
}
function sysOffAt(A, d, key) {
  if (!key) return false;
  if (Array.isArray(A && A.off) && A.off.indexOf(key) !== -1) return true;
  d = String(d || ''); return d ? !perm44E().sysOn(key, perm44LeafOn(A, d)) : false;
}
function acctUnitOf(A) { var u = (A && A.u) || {}; return String(u.deptId || (u.role === 'gm' ? u.gid || '' : '')); }
function sysServed(A, d, key) { return !!(A && A.u) && (A.u.role === 'super' || !sysOffAt(A, d, key)); }
function resLeafOffAt(A, d, k) {
  var R = resOf(k), leaf = R && typeof R.cap === 'string' ? R.cap : '', sys = sysOfLeaf(leaf);
  if (!sys) return false;
  if (Array.isArray(A && A.off) && A.off.indexOf(sys) !== -1) return true;
  return d ? !perm44LeafOn(A, String(d))(leaf) : false;
}

