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
@@SYS:empGone.custody.fn@@function stripKey(v, k) { var o = {}, q; for (q in v) if (q !== k) o[q] = v[q]; return o; }
