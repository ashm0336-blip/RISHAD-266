/* ═══ سياسات الأمن القابلة للضبط من شاشة مدير النظام — تُقرأ مرةً لكل طلب ═══ */
var POLICY_DEF = { sessH: 12, idleH: 2, lockN: 5, lockMin: 5, pwMin: 6, wrMin: 1200, thrOn: 0, thrN: 10, thrWin: 30, thrSec: 3 };   /* KIVO_255 · SOT-139: wrMin = سقفُ الحفظ في الدقيقة لكل حساب (كان ثابتاً RL_SAVE = 1200 المقيس) — من شاشة السياسات؛ رفعُ الصور ربعُه */
async function loadPolicy(env) {
  var p = parseJson(await metaGet(env, 'policy'), null);
  var o = Object.assign({}, POLICY_DEF, isObj(p) ? p : {});
  SESSION_MAX = Math.max(1, +o.sessH || 12) * 3600000; IDLE_MAX = Math.max(0.25, +o.idleH || 2) * 3600000;
  LOCK_N = Math.max(3, +o.lockN || 5); LOCK_MS = Math.max(1, +o.lockMin || 5) * 60000; PW_MIN = 6; o.pwMin = 6;   /* KIVO_259 (إصلاح): ثابتٌ 6 حتى لو حُفظت قيمةٌ أكبر قبلُ — قاعدةُ المنصة (pwCheck) لا تقبل أكثر من 6 أرقام لمدير النظام */ RL_SAVE = Math.min(5000, Math.max(30, +o.wrMin || 1200));
  /* v7-C · Issue 2 (ب): مطفأٌ ما لم تكن القيمةُ المخزَّنة 1 بالضبط؛ والقيمُ تُحصر في نطاقها عند القراءة كذلك (السقفُ 10 ث مهما خُزّن) */
  o.thrOn = +o.thrOn === 1 ? 1 : 0; THR_ON = o.thrOn === 1;
  THR_N = Math.min(100, Math.max(5, Math.floor(+o.thrN) || 10)); THR_WIN_MS = Math.min(120, Math.max(5, Math.floor(+o.thrWin) || 30)) * 60000; THR_MS = Math.min(10, Math.max(1, Math.floor(+o.thrSec) || 3)) * 1000;
  return o;
}
/* CORE-02 (B2): the editable ranges of the policy form (the same limits the handler applied by clamping) — [min, max, whole number].
   policyBad(body) names the first field outside its range, or returns null. A field left out (or null) is not judged: it keeps its value.
   pwMin is not judged here: KIVO_259 (approved password policy) stores 6 whatever is sent — unchanged; the form keeps it at 6 itself. */
var POLICY_RANGE = { sessH: [1, 72, 1], idleH: [0.25, 24, 0], lockN: [3, 20, 1], lockMin: [1, 60, 1], pwMin: [6, 6, 1], wrMin: [30, 5000, 1], thrOn: [0, 1, 1], thrN: [5, 100, 1], thrWin: [5, 120, 1], thrSec: [1, 10, 1] };
var POLICY_LABEL = { sessH: 'مدة الجلسة القصوى', idleH: 'الخمول قبل الخروج', lockN: 'محاولات قبل القفل', lockMin: 'مدة القفل القصوى', pwMin: 'الحد الأدنى لكلمة المرور', wrMin: 'سقف الحفظ في الدقيقة', thrOn: 'إبطاء الحساب المستهدف (0 مطفأ · 1 مفعّل)', thrN: 'عناوين مختلفة قبل الإبطاء', thrWin: 'نافذة احتساب العناوين', thrSec: 'مهلة الإبطاء' };
function policyBad(b) {
  var ks = Object.keys(POLICY_RANGE);
  for (var i = 0; i < ks.length; i++) {
    var k = ks[i], r = POLICY_RANGE[k], x = b ? b[k] : undefined;
    if (k === 'pwMin' || x === undefined || x === null) continue;
    var s = typeof x === 'string' ? x.trim() : x, v = s === '' || typeof s === 'boolean' ? NaN : +s;
    if (!isFinite(v) || v < r[0] || v > r[1] || (r[2] && Math.floor(v) !== v))
      return { field: k, min: r[0], max: r[1], msg: POLICY_LABEL[k] + (r[0] === r[1] ? ' ثابت: ' + r[0] : ': أدخل ' + (r[2] ? 'عدداً صحيحاً' : 'رقماً') + ' من ' + r[0] + ' إلى ' + r[1]) };
  }
  return null;
}
