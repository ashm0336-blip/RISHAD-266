/* ══ هل جرت عملية اعتماد؟ ═══════════════════════════════════════════════════
   مقارنةٌ مزدوجة على البنية نفسها: موضعُ اعتمادٍ تبدّل على كيانٍ قائمٍ في
   الطرفين = اعتماد. أمّا كيانٌ وُلد أو زال كلُّه فذاك إضافةٌ أو حذف لا اعتماد —
   إلا ما أعلنه المورد في newAp (قفلُ شهرٍ يُنشئ سجلَّه، وفتحُ يومٍ يُنشئه).
   والمصفوفاتُ تُحاذى بهويّة عناصرها فلا يُحسب الإدراجُ في الرأس اعتماداً. */
function opsChanged(a, b, pats, nw, path) {
  var bothObj = isObj(a) && isObj(b), bothArr = Array.isArray(a) && Array.isArray(b);
  if (!bothObj && !bothArr) return false;
  var ks = {}, ma = a, mb = b, k;
  if (bothArr) {
    var fld = idFieldOf([a, b]);
    if (fld) {
      ma = {}; mb = {};
      a.forEach(function (e) { ma[String(e[fld])] = e; ks[String(e[fld])] = 1; });
      b.forEach(function (e) { mb[String(e[fld])] = e; ks[String(e[fld])] = 1; });
    } else for (k = 0; k < Math.max(a.length, b.length); k++) ks[String(k)] = 1;
  } else { Object.keys(a).forEach(function (q) { ks[q] = 1; }); Object.keys(b).forEach(function (q) { ks[q] = 1; }); }
  for (k in ks) {
    var p2 = path.concat([k]);
    var inA = Object.prototype.hasOwnProperty.call(ma, k), inB = Object.prototype.hasOwnProperty.call(mb, k);
    if (opMatch(pats, p2)) {
      if (!inA && !inB) continue;
      if (!inA || !inB) { if (!isEmptyVal(inA ? ma[k] : mb[k])) return true; continue; }
      if (!deq(ma[k], mb[k])) return true;
      continue;
    }
    if (!opPrefix(pats, p2)) continue;
    if (inA && inB) { if (opsChanged(ma[k], mb[k], pats, nw, p2)) return true; continue; }
    if (nw && nw.length && opsAny(inA ? ma[k] : mb[k], nw, p2)) return true;
  }
  return false;
}
