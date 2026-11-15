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
/* مَن يملك أفعال الكتابة كلها على هذا المورد لا يحتاج تصنيفاً: أيّاً كانت
   العملية فهي في يده. يوفّر هذا مقارنةَ فرقٍ كاملة على القيم الكبيرة في
   المسار الأكثر شيوعاً (المدير يحفظ جدولاً أو خطة) فلا تُزاد كلفة CPU. */
function holdsAllWrites(A, key, R) {
  var need = ['add', 'edit', 'del'], O = opsOf(key);
  if (O && O.approve) need.push('approve');
  for (var i = 0; i < need.length; i++) if (!authorize(A, key, need[i]).ok) return false;
  return true;
}
/* هل يملك الفاعل هذه الأفعال كلها على ورقةٍ بعينها؟ */
function actsHeldOn(A, d, cap, acts) {
  if (A && A.u && A.u.role === 'super') return true;   /* V7 · د1-ج (قرار صاحب المنصة): مدير المنصة بلا قيد صلاحية — قبل السقف والوحدات المطفأة والعدسة والأوراق */
  if (!capOnDept(A, d, cap)) return false;
  var have = myPermsOf(A, d)[cap] || [];
  for (var i = 0; i < acts.length; i++) if (have.indexOf(acts[i]) === -1) return false;
  return true;
}

