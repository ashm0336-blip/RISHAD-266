/* ══ إعادة تسمية الوردية — تبعتُها في الجدول الشهري ═══════════════════════════
   sfRename في الإعدادات تُعيد تسمية الوردية ثم تُجري sfRenameEverywhere:
   staffing_v3[<شهر>][<موظف>].shift من الاسم القديم إلى الجديد. هذه العملية —
   وهذا الحقلُ وحده — تُقبل بـadmin/shifts:edit، ولا تفتح الجدولَ لصاحبها. */
function shiftRenameOk(A, k, newVal, curVal, ctx) {
  var rn = resName(k);
  if (rn !== 'bassam_staffing_v3' && rn !== 'bassam_staffing_v2') return false;
  if (!ctx || !ctx.shRen || newVal == null || curVal == null) return false;
  if (!actsHeldOn(A, parseKey(k).dept, 'admin/shifts', ['edit'])) return false;
  var ds = walkDiff(curVal, newVal), i;
  if (!ds.length) return false;
  for (i = 0; i < ds.length; i++) {
    var d = ds[i];
    if (!/(^|\.)shift$/.test(d.p)) return false;
    if (String(d.f) !== ctx.shRen.o || String(d.t) !== ctx.shRen.n) return false;
  }
  /* تبعةٌ تامّة: لا يبقى بعد الطلب صفٌّ يشير إلى الاسم القديم — ولا تُقبل جزئية */
  if (shiftLeft(parseJson(newVal, null), ctx.shRen.o)) return false;
  return true;
}
function shiftLeft(v, oldN) {
  if (!isObj(v)) return false;
  for (var m in v) {
    var mo = v[m]; if (!isObj(mo)) continue;
    for (var e in mo) { var rw = mo[e]; if (isObj(rw) && String(rw.shift) === oldN) return true; }
  }
  return false;
}
/* V7 · د5-د: الجدولُ يسجّل قبولَه لتبعة إعادة التسمية على ناقل الخادم — القاعدةُ تسأل بالاسم ولا تعرف مَن يجيب (016b-server-bus.js) */
srvBusParticipant('shifts.renamed@1', shiftRenameOk);
/* وضعُ الإنفاذ: هل هذه الكتابةُ تبعةٌ تامّة لإعادة التسمية؟ — حقلُ shift وحده من الاسم القديم إلى الجديد، ولا يبقى صفٌّ على القديم.
   (كان هذا الفحصُ مكتوباً في جزء القاعدة 059 بأسماء مفاتيح الجدول؛ المفتاحُ المطلوب ref.shift.edit يبقى قرارَ القاعدة.) */
function shiftRenameCascade(rn, diffs, newVal, ctx) {
  if (rn !== 'bassam_staffing_v3' && rn !== 'bassam_staffing_v2') return false;
  if (!ctx || !ctx.shRen) return false;
  var sd = diffs(), i; if (!sd.length) return false;
  for (i = 0; i < sd.length; i++) { if (!/(^|\.)shift$/.test(sd[i].p) || String(sd[i].f) !== ctx.shRen.o || String(sd[i].t) !== ctx.shRen.n) return false; }
  return !shiftLeft(parseJson(newVal, null), ctx.shRen.o);
}
srvBusParticipant('shifts.renamed.cascade@1', shiftRenameCascade);
