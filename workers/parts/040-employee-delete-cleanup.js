/* ملف مولَّد — لا يُحرَّر يدوياً، المصدر: src/slots/workers/parts/040-employee-delete-cleanup.js.tpl */
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
/* العهد: تُزال حركات المحذوف وحدها، والعهد نفسها وبقية الحركات كما هي */
function custodyGoneOk(a, b, ctx) {
  if (!isObj(a) || !isObj(b)) return false;
  var ma = Array.isArray(a.moves) ? a.moves : null, mb = Array.isArray(b.moves) ? b.moves : null;
  if (!ma || !mb) return false;
  if (!deq(stripKey(a, 'moves'), stripKey(b, 'moves'))) return false;
  var kept = [], i, hit = 0;
  for (i = 0; i < ma.length; i++) {
    var mv = ma[i];
    if (isObj(mv) && goneKey(ctx, mv.eid)) { hit++; continue; }    /* بمفتاح الموظف وحده */
    kept.push(mv);
  }
  return hit > 0 && deq(kept, mb);
}
function stripKey(v, k) { var o = {}, q; for (q in v) if (q !== k) o[q] = v[q]; return o; }
