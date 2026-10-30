/* ══ قائمةٌ من قيمٍ بدائية ═══════════════════════════════════════════════
   • قيمةٌ ظهرت بلا زوالِ أخرى = add · قيمةٌ زالت بلا ظهورِ بديل = del
   • القيم نفسها بترتيبٍ آخر = edit
   • استبدالُ قيمةٍ واحدة في موضعٍ واحد مع تطابق بقية المواضع = edit (تسمية)
   • وما عدا ذلك — ظهورٌ وزوالٌ مع تحريك — لا يُضغط: الجديدُ add والزائلُ del */
function cmpPrim(a, b, n) {
  var ca = {}, cb = {}, i, q, addN = 0, delN = 0;
  for (i = 0; i < a.length; i++) { q = String(a[i]); ca[q] = (ca[q] || 0) + 1; }
  for (i = 0; i < b.length; i++) { q = String(b[i]); cb[q] = (cb[q] || 0) + 1; }
  for (q in cb) if ((cb[q] || 0) > (ca[q] || 0)) addN += cb[q] - (ca[q] || 0);
  for (q in ca) if ((ca[q] || 0) > (cb[q] || 0)) delN += ca[q] - (cb[q] || 0);
  if (!addN && !delN) { if (a.length !== b.length || a.join('\u0000') !== b.join('\u0000')) needEdit(n); return; }
  if (addN === 1 && delN === 1 && a.length === b.length) {
    var diff = 0;
    for (i = 0; i < a.length; i++) if (String(a[i]) !== String(b[i])) diff++;
    if (diff === 1) { needEdit(n); return; }                  /* استبدالٌ في موضعه: تسمية */
  }
  if (addN) needAdd(n);
  if (delN) needDel(n);
}
function cmpMap(a, b, n, sub) {
  var k;
  for (k in b) {
    if (!(k in a)) { if (!isEmptyVal(b[k])) needAdd(n); continue; }
    if (deq(a[k], b[k])) continue;
    if (sub === 'list' && Array.isArray(a[k]) && Array.isArray(b[k])) { cmpList(a[k], b[k], n); continue; }
    if (sub === 'map' && isObj(a[k]) && isObj(b[k])) { cmpMap(a[k], b[k], n, ''); continue; }
    needEdit(n);
  }
  for (k in a) if (!(k in b) && !isEmptyVal(a[k])) needDel(n);
}
function isEmptyVal(v) {
  if (v == null || v === '' || v === 0) return true;
  if (Array.isArray(v)) return !v.length;
  if (isObj(v)) return !Object.keys(v).length;
  return false;
}
/* نسخةٌ بلا المجموعات المعلَنة — لبقية المورد (الحقول المفردة) */
function stripCols(E, v) {
  if (!E || !E.cols || !isObj(v)) return v;
  var c = {}, k;
  for (k in v) c[k] = v[k];
  for (var i = 0; i < E.cols.length; i++) if (E.cols[i].at) delete c[E.cols[i].at];
  return c;
}
