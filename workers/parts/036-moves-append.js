/* ══ moves إلحاقية: سجل الحركات يُضاف إليه في الذيل ولا يُعدَّل ولا يُحذف ══
   سجل WATCH يقرأ الجديد بـ nm.slice(om.length) — أي أن الواجهة نفسها تعدّ
   الحركات إلحاقاً محضاً. فتُمنع هنا كلُّ مساسٍ بحركةٍ سابقة أو إعادة ترتيب. */
function appendViolation(E, a, b) {
  if (!E || !E.append) return '';
  for (var i = 0; i < E.append.length; i++) {
    var at = E.append[i], la = colList(a, at), lb = colList(b, at);
    if (!la) continue;                                        /* لا سجلّ قديم: لا إلحاق يُحرَس */
    if (!lb) return 'append';                                 /* أُسقط السجل أو قُلب نوعه */
    if (lb.length < la.length) return 'append';               /* حذفٌ من السجل */
    for (var j = 0; j < la.length; j++) if (!deq(la[j], lb[j])) return 'append';
  }
  return '';
}
