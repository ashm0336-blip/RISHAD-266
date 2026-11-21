/* ══ إعادة تسمية الوردية — تبعتُها في الجدول الشهري ═══════════════════════════
   sfRename في الإعدادات تُعيد تسمية الوردية ثم تُجري sfRenameEverywhere:
   staffing_v3[<شهر>][<موظف>].shift من الاسم القديم إلى الجديد. هذه العملية —
   وهذا الحقلُ وحده — تُقبل بمفتاح ref.shift.edit (059 enfVia)، ولا تفتح الجدولَ لصاحبها.
   V7 · د5-ح (القفل): مشاركُ الوضع القديم shiftRenameOk (shifts.renamed@1 في الخادم — admin/shifts:edit) حُذف مع فرع canWrite القديم */
function shiftLeft(v, oldN) {
  if (!isObj(v)) return false;
  for (var m in v) {
    var mo = v[m]; if (!isObj(mo)) continue;
    for (var e in mo) { var rw = mo[e]; if (isObj(rw) && String(rw.shift) === oldN) return true; }
  }
  return false;
}
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
