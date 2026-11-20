/* ══ تنظيف أثر موظفٍ حُذف — employeeDeleteCleanup ═══════════════════════════
   cleanupAssignments في الواجهة تُزيل أثر المحذوف من الجدول الشهري والمهام
   والعهد والجائزة والخطة والجولات. ليست هذه صلاحياتٍ عامة على تلك الموارد:
   لكلٍّ منها هنا عمليةٌ واحدة لا تتعدّاها، وشرطُها أن يملك الفاعل حذف الموظفين
   وأن يكون المفتاح المُزال غيرَ موجودٍ في سجل موظفي الإدارة بعد هذا الطلب. */
/* مفتاحٌ يشير إلى موظفٍ لم يعد في سجل الإدارة. ولقطةُ تعريفات الورديات
   (__shifts) بيانُ شهرٍ لا سجلُّ موظف، فلا تُعدّ مفتاحاً غائباً أبداً. */
function goneKey(ctx, v) {
  if (v == null || v === '') return false;
  var s = String(v);
  if (s === '__shifts') return false;
  return !!(ctx && ctx.emps && ctx.emps.live && !ctx.emps.live[s]);
}
function empCleanAllowed(A, dept, ctx) {
  if (!ctx || !ctx.emps || !ctx.emps.live) return false;
  return actsHeldOn(A, dept, 'emps/data', ['del']);
}
@@SYS:empGone.staff.fn@@@@SYS:empGone.tasks.fn@@@@SYS:empGone.custody.fn@@@@SYS:empGone.award.fn@@/* الخطة والجولات: تُزال إشاراتُ المحذوف من قوائم التسكين emp وحدها */
function refsGoneOk(curVal, newVal, ctx) {
  var ds = walkDiff(curVal, newVal), i, j, hit = 0;
  if (!ds.length) return false;
  for (i = 0; i < ds.length; i++) {
    var d = ds[i];
    if (!endsAny(d.p, ['emp'])) return false;
    var f = Array.isArray(d.f) ? d.f : null, t = Array.isArray(d.t) ? d.t : null;
    if (!f || !t) return false;
    var out = [];
    for (j = 0; j < f.length; j++) { if (goneKey(ctx, f[j])) { hit++; continue; } out.push(f[j]); }
    if (!deq(out, t)) return false;
  }
  return hit > 0;
}
function stripKey(v, k) { var o = {}, q; for (q in v) if (q !== k) o[q] = v[q]; return o; }
var GONE_FN = {
@@SYS:empGone.map.staff@@  @@SYS:empGone.map|sep=", "@@
};
function empGoneCleanup(A, k, newVal, curVal, ctx, PV) {
  if (newVal == null || curVal == null) return false;
  var rn = resName(k);
  var fn = GONE_FN[rn];
  if (!fn && @@SYS:empGone.refs.plan@@@@SYS:empGone.refs.daily|empty="true"@@) return false;
  if (!empCleanAllowed(A, parseKey(k).dept, ctx)) return false;
  if (fn) {
    var a = PV ? PV.a() : parseJson(curVal, null), b = PV ? PV.b() : parseJson(newVal, null);
    return fn(a === undefined ? null : a, b === undefined ? null : b, ctx);
  }
  return refsGoneOk(curVal, newVal, ctx);
}
