/* جائزة التميز: تفريغ recs وحدها — العملية المسموحة حرفياً:
   oldAward ⇐ نفسُه تماماً مع recs: []. لا حذفَ مفتاح، ولا مساسَ بالمعايير ولا
   الإعدادات ولا أيّ حقلٍ آخر، ولا تفريغاً جزئياً، ولا تصير emps/data:del
   صلاحيةً عامة على award/res. */
function awardCleanup(A, k, newVal, curVal, ctx) {
  if (resName(k) !== 'bassam_award_v1') return false;
  if (newVal == null || curVal == null) return false;
  var nv = parseJson(newVal, null), ov = parseJson(curVal, null);
  if (!isObj(nv) || !isObj(ov)) return false;
  if (!(Array.isArray(nv.recs) && !nv.recs.length)) return false;   /* الجديد recs: [] */
  if (!(Array.isArray(ov.recs) && ov.recs.length)) return false;    /* والقديم ممتلئ */
  var a2 = {}, b2 = {}, q;                                          /* وما سواها متطابقٌ حرفاً */
  for (q in ov) if (q !== 'recs') a2[q] = ov[q];
  for (q in nv) if (q !== 'recs') b2[q] = nv[q];
  if (!deq(a2, b2)) return false;
  /* RISHAD-266 · قرار المالك (هـ) 2026-11-03: لا تفريغَ لسجلّات التكريم في إدارةٍ سقفُها بلا صفحة الجائزة — مبدأُ الإنفاذ نفسُه
     (السقفُ أولاً: resOnCeiling · 050). كان مديرُ إدارةٍ خارجَ سقفها يحذف سجلَّها الوحيد عبر /api/award/act بـ admin/import:del (200). */
  if (!resOnCeiling(A, parseKey(k).dept, resOf(k))) return false;
  return !!wipeAllowed(A, parseKey(k).dept, ctx);
}
