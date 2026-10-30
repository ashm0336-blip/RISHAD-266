/* ═══ سياسات الأمن القابلة للضبط من شاشة مدير النظام — تُقرأ مرةً لكل طلب ═══ */
var POLICY_DEF = { sessH: 12, idleH: 2, lockN: 5, lockMin: 5, pwMin: 6, wrMin: 1200 };   /* KIVO_255 · SOT-139: wrMin = سقفُ الحفظ في الدقيقة لكل حساب (كان ثابتاً RL_SAVE = 1200 المقيس) — من شاشة السياسات؛ رفعُ الصور ربعُه */
async function loadPolicy(env) {
  var p = parseJson(await metaGet(env, 'policy'), null);
  var o = Object.assign({}, POLICY_DEF, isObj(p) ? p : {});
  SESSION_MAX = Math.max(1, +o.sessH || 12) * 3600000; IDLE_MAX = Math.max(0.25, +o.idleH || 2) * 3600000;
  LOCK_N = Math.max(3, +o.lockN || 5); LOCK_MS = Math.max(1, +o.lockMin || 5) * 60000; PW_MIN = 6; o.pwMin = 6;   /* KIVO_259 (إصلاح): ثابتٌ 6 حتى لو حُفظت قيمةٌ أكبر قبلُ — قاعدةُ المنصة (pwCheck) لا تقبل أكثر من 6 أرقام لمدير النظام */ RL_SAVE = Math.min(5000, Math.max(30, +o.wrMin || 1200));
  return o;
}
