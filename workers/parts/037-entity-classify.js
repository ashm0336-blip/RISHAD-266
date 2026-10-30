/* ══ التصنيف: على الكيان بحسب ENT ═══════════════════════════════════════ */
function classifyMutation(R, curVal, newVal, E, O, PV) {
  var n = {};
  if (newVal == null) { n.keyDelete = 1; return n; }
  E = E || null;
  var b = PV ? PV.b() : parseJson(newVal, null);
  if (b === undefined) b = null;
  /* أول إنشاءٍ للمورد: يُقارَن بالشكل الفارغ القانوني لا بـ«كل الحمولة إضافة» */
  var a = curVal == null ? parseJson((E && E.empty) || (Array.isArray(b) ? '[]' : '{}'), null)
                         : (PV ? PV.a() : parseJson(curVal, null));
  if (a === undefined) a = null;
  if (a == null || b == null) { needEdit(n); return n; }
  /* عملية الدومين تُفصل أولاً: ما طابق مسارَ اعتمادٍ معلَناً فهو approve، وما
     بقي يُصنَّف على الكيان — فلا يُبتلع الاعتماد في «تعديل» ولا العكس. */
  if (O && O.approve) {
    if (opAll(O)) { if (!deq(a, b)) n.approve = 1; return n; }
    if (opsChanged(a, b, O.approve, O.newAp || [], [])) n.approve = 1;
    a = splitOps(a, O.approve, []).c; b = splitOps(b, O.approve, []).c;
  }
  /* المواءمة نفسها تسبق التصنيف: إعادة التسمية والتبنّي تعديلٌ لا حذفٌ وإضافة */
  if (E && E.cols) a = alignOld(E, a, b);
  /* قوائمُ القيم البدائية: الظهور إضافة والزوال حذف — ما لم تسمّ الواجهة الفعل */
  if (E && (E.primRoot || E.prim)) {
    var pn = {};
    if (E.primRoot && Array.isArray(a) && Array.isArray(b)) cmpPrim(a, b, pn);
    if (E.prim && isObj(a) && isObj(b)) {
      for (var pf = 0; pf < E.prim.length; pf++) {
        var fa = a[E.prim[pf]], fb2 = b[E.prim[pf]];
        if (Array.isArray(fa) && Array.isArray(fb2)) cmpPrim(fa, fb2, pn);
        else if (!deq(fa, fb2)) needEdit(pn);
      }
      var ca = {}, cb = {}, qq;
      for (qq in a) if (E.prim.indexOf(qq) === -1) ca[qq] = a[qq];
      for (qq in b) if (E.prim.indexOf(qq) === -1) cb[qq] = b[qq];
      if (!deq(ca, cb)) needEdit(pn);
    }
    if (E.primAct) { var pk2 = Object.keys(pn); if (pk2.length) { var p3 = {}; p3[E.primAct] = 1; return p3; } return pn; }
    for (var pq in pn) n[pq] = 1;
    return n;
  }
  if (E && E.cols) {
    for (var c = 0; c < E.cols.length; c++) {
      var at = E.cols[c].at, la = colList(a, at), lb = colList(b, at);
      if (la && lb) cmpCol(la, lb, E.cols[c].idf, n);
      else if (lb && !la) { if (lb.length) needAdd(n); }
      else if (la && !lb) { if (la.length) needDel(n); }
    }
    /* مجموعةٌ في الجذر: القيمة كلها هي المجموعة — فلا بقيةَ تُقارَن */
    var rootCol = false;
    for (var c9 = 0; c9 < E.cols.length; c9++) if (!E.cols[c9].at) rootCol = true;
    if (rootCol) return n;
    var ra = stripCols(E, a), rb = stripCols(E, b);
    if (E.mapAt && isObj(ra) && isObj(rb) && (isObj(ra[E.mapAt]) || isObj(rb[E.mapAt]))) {
      cmpMap(isObj(ra[E.mapAt]) ? ra[E.mapAt] : {}, isObj(rb[E.mapAt]) ? rb[E.mapAt] : {}, n, '');
      var r2 = {}, r3 = {}, q2;
      for (q2 in ra) if (q2 !== E.mapAt) r2[q2] = ra[q2];
      for (q2 in rb) if (q2 !== E.mapAt) r3[q2] = rb[q2];
      ra = r2; rb = r3;
    }
    if (!deq(ra, rb)) needEdit(n);
    return n;
  }
  if (E && E.map && isObj(a) && isObj(b)) { cmpMap(a, b, n, E.sub || ''); return n; }
  if (Array.isArray(a) && Array.isArray(b)) { cmpCol(a, b, IDF_ANY, n); return n; }
  if (!deq(a, b)) needEdit(n);
  return n;
}
/* الورقة المطلوبة لهذا الفعل: مورد يشترك فيه ورقتان يفصل بينهما هنا.
   جائزة التميز نموذجُه: award/new تُنشئ ترشيحاً، وما سواه (تعديل · حذف ·
   اعتماد النتيجة) لا يكون إلا بورقة award/res. */
function capForAct(R, act) {
  if (act === 'add' && R.capAdd) return [R.capAdd];
  return Array.isArray(R.cap) ? R.cap : (R.cap ? [R.cap] : []);
}
/* حذف المفتاح كله ليس حذف سجلّ: عمليةٌ مستقلّة لا تُفتح لكل صاحب del.
   الافتراضي رفض؛ ولا تُسمح إلا لمن يملك الورقة المعلَنة في keyDelete. */
/* حذف المفتاح كله عمليةٌ تدميرية مستقلّة: صريحٌ يعني صريح — بلا سياسةٍ معلَنة
   يُرفض للجميع، ومدير النظام منهم. ولا مورد إدارةٍ يعلنها اليوم: مسارا «حذف
   جميع الموظفين» و«حذف الكل واستيراد» صارا يكتبان الشكل الفارغ القانوني بدل
   حذف المفتاح، واستعادةُ النسخة الاحتياطية مؤجّلةٌ إلى معاملة المرحلة الثانية. */
function allowKeyDelete(A, key, R) {
  if (!R || !R.keyDelete) return false;
  var P = parseKey(key);
  return actsHeldOn(A, P.dept, R.keyDelete, ['del']);
}
