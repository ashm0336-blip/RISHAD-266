/* ══ مواءمة الطرف القديم قبل المقارنة ═══════════════════════════════════════
   عمليتان مجاليّتان تُعيدان الكيان إلى هويته الجديدة فتصيران تعديلاً لا
   «حذفاً وإضافة»:
     • rename — إعادة تسمية كيانٍ هويتُه اسمُه (صنف العهدة · الوردية)، ومعها
       تبعاتُها المعلَنة داخل المورد نفسه (item في حركات العهد).
     • adopt  — تبنّي هويةٍ قانونية لسجلٍّ قديم (eid للموظف) بلا مساسٍ بسواها. */
/* الاسم القانوني بعد التشذيب — هوية الكيان لا تكون فراغاً ولا مسافات */
function normId(v) { return String(v == null ? '' : v).trim(); }
function alignOld(E, a, b, info) {
  if (!E || !E.cols) return a;
  var out = a, c, j, q;
  if (E.rename) {
    var rc = null;
    for (c = 0; c < E.cols.length; c++) if (E.cols[c].at === E.rename.at) rc = E.cols[c];
    var la = rc ? colList(out, rc.at) : null, lb = rc ? colList(b, rc.at) : null;
    if (la && lb) {
      var fld = E.rename.field, ina = {}, inb = {}, gone = [], born = [];
      for (j = 0; j < la.length; j++) if (isObj(la[j]) && la[j][fld] != null) ina[String(la[j][fld])] = la[j];
      for (j = 0; j < lb.length; j++) if (isObj(lb[j]) && lb[j][fld] != null) inb[String(lb[j][fld])] = lb[j];
      for (q in ina) if (!(q in inb)) gone.push(q);
      for (q in inb) if (!(q in ina)) born.push(q);
      /* إعادةُ تسميةٍ واحدة لا غير، واسمُها الجديد قانونيٌّ ولا يصطدم بقائم —
         ولا تُطبَّق تبعتُها على السجل إلا بعد نجاح هذا التحقق كلِّه. */
      var renOk = gone.length === 1 && born.length === 1 && la.length === lb.length;
      if (renOk && !normId(born[0])) renOk = false;                    /* فارغٌ أو مسافات */
      if (renOk && Object.prototype.hasOwnProperty.call(ina, born[0])) renOk = false;  /* اسمٌ قائم */
      if (renOk) {
        var oldN = gone[0], newN = born[0], la2 = [];
        if (info) info.ren = 1;
        for (j = 0; j < la.length; j++) {
          var el = la[j];
          if (isObj(el) && String(el[fld]) === oldN) { var cp = {}; for (q in el) cp[q] = el[q]; cp[fld] = newN; la2.push(cp); }
          else la2.push(el);
        }
        out = withCol(out, rc.at, la2);
        var cas = E.rename.cascade || [];
        for (var x = 0; x < cas.length; x++) {
          var cl = colList(out, cas[x].at); if (!cl) continue;
          var nl = [], f2 = cas[x].field;
          for (j = 0; j < cl.length; j++) {
            var it = cl[j];
            if (isObj(it) && String(it[f2]) === oldN) { var c2 = {}; for (q in it) c2[q] = it[q]; c2[f2] = newN; nl.push(c2); }
            else nl.push(it);
          }
          out = withCol(out, cas[x].at, nl);
        }
      }
    }
  }
  if (E.adopt) {
    var ac = null;
    for (c = 0; c < E.cols.length; c++) if (E.cols[c].at === E.adopt.at) ac = E.cols[c];
    var pa = ac ? colList(out, ac.at) : null, pb = ac ? colList(b, ac.at) : null;
    if (pa && pb && ac.lock) {
      var has = {}, pa2 = pa.slice(), moved = 0;
      for (j = 0; j < pa.length; j++) if (isObj(pa[j])) { var oi = idOf(pa[j], ac.lock); if (oi) has[oi] = 1; }
      for (j = 0; j < pb.length; j++) {
        var ne = pb[j]; if (!isObj(ne)) continue;
        var ni = idOf(ne, ac.lock); if (!ni || has[ni]) continue;
        for (var z = 0; z < pa2.length; z++) {
          var ol = pa2[z];
          if (!isObj(ol) || idOf(ol, ac.lock)) continue;
          if (!adoptOk(E, ol, ne, ac)) continue;
          var cp2 = {}; for (q in ol) cp2[q] = ol[q];
          var dr = (E.adopt.drop || []); for (var y = 0; y < dr.length; y++) delete cp2[dr[y]];
          cp2[ac.lock[0]] = ni; pa2[z] = cp2; has[ni] = 1; moved = 1;
          if (info) info.adopt = 1;
          break;
        }
      }
      if (moved) out = withCol(out, ac.at, pa2);
    }
  }
  return out;
}
