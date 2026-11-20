/* الجدول الشهري: تُحذف سلال المحذوف وحدها من أشهره، ولا يُمسّ سواه */
function staffGoneOk(a, b, ctx) {
  if (!isObj(a) || !isObj(b)) return false;
  var k, q, hit = 0;
  for (k in a) {
    if (deq(a[k], b[k])) continue;
    if (isObj(a[k]) && (a[k].shift !== undefined || a[k].rest !== undefined)) {   /* صيغةٌ مسطّحة */
      if (b[k] !== undefined || !goneKey(ctx, k)) return false; hit++; continue;
    }
    if (!isObj(a[k]) || !isObj(b[k])) return false;
    for (q in a[k]) {
      if (deq(a[k][q], b[k][q])) continue;
      if (b[k][q] !== undefined || !goneKey(ctx, q)) return false;
      hit++;
    }
    for (q in b[k]) if (!(q in a[k])) return false;
  }
  for (k in b) if (!(k in a)) return false;
  return hit > 0;
}
