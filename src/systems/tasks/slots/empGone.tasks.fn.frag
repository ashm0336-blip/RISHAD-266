/* المهام: تُفرَّغ خانات الإسناد للمحذوف وحدها (٧ · ٨ · ١٤) كما تكتبها الواجهة */
function tasksGoneOk(a, b, ctx) {
  if (!isObj(a) || !isObj(b)) return false;
  var k, i, j, hit = 0;
  for (k in b) if (!(k in a)) return false;
  for (k in a) {
    if (deq(a[k], b[k])) continue;
    var ra = a[k], rb = b[k];
    if (!Array.isArray(ra) || !Array.isArray(rb) || ra.length !== rb.length) return false;
    for (i = 0; i < ra.length; i++) {
      if (deq(ra[i], rb[i])) continue;
      var r0 = ra[i], r1 = rb[i];
      if (!Array.isArray(r0) || !Array.isArray(r1)) return false;
      if (!goneKey(ctx, r0[14])) return false;                     /* بمعرّف المسنَد إليه وحده */
      if (!(Array.isArray(r1[7]) && !r1[7].length) || r1[8] !== '' || r1[14] !== '') return false;
      for (j = 0; j < Math.max(r0.length, r1.length); j++) {
        if (j === 7 || j === 8 || j === 14) continue;
        if (!deq(r0[j] === undefined ? null : r0[j], r1[j] === undefined ? null : r1[j])) return false;
      }
      hit++;
    }
  }
  return hit > 0;
}
