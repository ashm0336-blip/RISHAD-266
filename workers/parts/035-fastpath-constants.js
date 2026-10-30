/* ══ الثوابت كلُّها قبل المسار السريع ══════════════════════════════════════
   لا يتخطّاها صاحب add+edit+del+approve، ولا مدير الإدارة، ولا مدير النظام.
   holdsAllWrites لا يوفّر بعدها إلا كلفةَ حساب الفرق — لا الفحصَ نفسه. */
/* الشكل الجذريّ يُقرأ من أول محرفٍ في النصّ — فمواردُ الخرائط الكبيرة (الجدول
   الشهري) لا تُحلَّل مرّتين لمجرّد التحقق من أنها كائن. */
function rootShapeStr(E, s) {
  if (!E || !E.empty) return '';
  var t = String(s), i = 0, c0;
  while (i < t.length) { c0 = t.charCodeAt(i); if (c0 !== 32 && c0 !== 9 && c0 !== 10 && c0 !== 13) break; i++; }
  var c = t.charAt(i), e0 = E.empty.charAt(0);
  if (e0 === '[') return c === '[' ? '' : 'shape';
  if (e0 === '{' || E.map) return c === '{' ? '' : 'shape';
  return '';
}
function invariantViolation(k, curVal, newVal, E, O, PV, ctx) {
  var FD = fieldsOf(k);
  /* موردٌ بلا مجموعاتٍ معلَنة ولا قوائمَ بدائية ولا عقدِ حقولٍ ولا عملية اعتماد */
  if (E && !E.cols && !E.prim && !E.primRoot && !O && !FD) return rootShapeStr(E, newVal);
  var b = PV ? PV.b() : parseJson(newVal, undefined);
  if (b === undefined) return 'shape';
  var a = curVal == null ? parseJson((E && E.empty) || 'null', null) : (PV ? PV.a() : parseJson(curVal, undefined));
  if (a === undefined) a = null;
  var v = shapeViolation(E, a, b, curVal == null); if (v) return v;
  var aln = E ? alignOld(E, a, b) : a;
  v = identityViolation(E, aln, b, !!(ctx && ctx.imp)); if (v) return v;
  v = fieldViolation(k, FD, aln, b); if (v) return v;
  if (O && O.shape && OP_SHAPE[O.shape]) { v = OP_SHAPE[O.shape](isObj(a) ? a : {}, isObj(b) ? b : {}); if (v) return v; }
  return '';
}
