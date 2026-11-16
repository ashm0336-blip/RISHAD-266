/* الجائزة: تُزال ترشيحات المحذوف وحدها، وما سواها حرفاً */
function awardGoneOk(a, b, ctx) {
  if (!isObj(a) || !isObj(b)) return false;
  var ra = Array.isArray(a.recs) ? a.recs : null, rb = Array.isArray(b.recs) ? b.recs : null;
  if (!ra || !rb) return false;
  if (!deq(stripKey(a, 'recs'), stripKey(b, 'recs'))) return false;
  var kept = [], i, hit = 0;
  for (i = 0; i < ra.length; i++) {
    var rc = ra[i];
    if (isObj(rc) && goneKey(ctx, rc.ekey)) { hit++; continue; }   /* بمفتاح الموظف وحده */
    kept.push(rc);
  }
  return hit > 0 && deq(kept, rb);
}
