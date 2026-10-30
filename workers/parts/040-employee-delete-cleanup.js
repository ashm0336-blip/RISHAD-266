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
/* الجدول الشهري: تُحذف سلال المحذوف وحدها من أشهره، ولا يُمسّ سواه */
function staffGoneOk(a, b, ctx) {
  if (!isObj(a) || !isObj(b)) return false;
  var k, q, hit = 0;
  for (k in a) {
    if (deq(a[k], b[k])) continue;
    if (isObj(a[k]) && (a[k].shift !== undefined || a[k].rest !== undefined)) {   /* صيغةٌ مسطّحة */
      if (b[k] !== undefined || !goneKey(ctx, k)) return false; hit++; continue;
    }
    if (!isObj(a[k]) || !isObj(b[k])) return false;
    for (q in a[k]) {
      if (deq(a[k][q], b[k][q])) continue;
      if (b[k][q] !== undefined || !goneKey(ctx, q)) return false;
      hit++;
    }
    for (q in b[k]) if (!(q in a[k])) return false;
  }
  for (k in b) if (!(k in a)) return false;
  return hit > 0;
}
/* المهام: تُفرَّغ خانات الإسناد للمحذوف وحدها (٧ · ٨ · ١٤) كما تكتبها الواجهة */
function tasksGoneOk(a, b, ctx) {
  if (!isObj(a) || !isObj(b)) return false;
  var k, i, j, hit = 0;
  for (k in b) if (!(k in a)) return false;
  for (k in a) {
    if (deq(a[k], b[k])) continue;
    var ra = a[k], rb = b[k];
    if (!Array.isArray(ra) || !Array.isArray(rb) || ra.length !== rb.length) return false;
    for (i = 0; i < ra.length; i++) {
      if (deq(ra[i], rb[i])) continue;
      var r0 = ra[i], r1 = rb[i];
      if (!Array.isArray(r0) || !Array.isArray(r1)) return false;
      if (!goneKey(ctx, r0[14])) return false;                     /* بمعرّف المسنَد إليه وحده */
      if (!(Array.isArray(r1[7]) && !r1[7].length) || r1[8] !== '' || r1[14] !== '') return false;
      for (j = 0; j < Math.max(r0.length, r1.length); j++) {
        if (j === 7 || j === 8 || j === 14) continue;
        if (!deq(r0[j] === undefined ? null : r0[j], r1[j] === undefined ? null : r1[j])) return false;
      }
      hit++;
    }
  }
  return hit > 0;
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
/* الجائزة: تُزال ترشيحات المحذوف وحدها، وما سواها حرفاً */
function awardGoneOk(a, b, ctx) {
  if (!isObj(a) || !isObj(b)) return false;
  var ra = Array.isArray(a.recs) ? a.recs : null, rb = Array.isArray(b.recs) ? b.recs : null;
  if (!ra || !rb) return false;
  if (!deq(stripKey(a, 'recs'), stripKey(b, 'recs'))) return false;
  var kept = [], i, hit = 0;
  for (i = 0; i < ra.length; i++) {
    var rc = ra[i];
    if (isObj(rc) && goneKey(ctx, rc.ekey)) { hit++; continue; }   /* بمفتاح الموظف وحده */
    kept.push(rc);
  }
  return hit > 0 && deq(kept, rb);
}
/* الخطة والجولات: تُزال إشاراتُ المحذوف من قوائم التسكين emp وحدها */
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
  'bassam_staffing_v3': staffGoneOk, 'bassam_staffing_v2': staffGoneOk,
  'bassam_tasks_v1': tasksGoneOk, 'bassam_custody_v1': custodyGoneOk, 'bassam_award_v1': awardGoneOk
};
function empGoneCleanup(A, k, newVal, curVal, ctx, PV) {
  if (newVal == null || curVal == null) return false;
  var rn = resName(k);
  var fn = GONE_FN[rn];
  if (!fn && rn !== 'bassam_plan_v1' && rn !== 'bassam_rounds_v1') return false;
  if (!empCleanAllowed(A, parseKey(k).dept, ctx)) return false;
  if (fn) {
    var a = PV ? PV.a() : parseJson(curVal, null), b = PV ? PV.b() : parseJson(newVal, null);
    return fn(a === undefined ? null : a, b === undefined ? null : b, ctx);
  }
  return refsGoneOk(curVal, newVal, ctx);
}
