/* العهد: تُزال حركات المحذوف وحدها، والعهد نفسها وبقية الحركات كما هي */
function custodyGoneOk(a, b, ctx) {
  if (!isObj(a) || !isObj(b)) return false;
  var ma = Array.isArray(a.moves) ? a.moves : null, mb = Array.isArray(b.moves) ? b.moves : null;
  if (!ma || !mb) return false;
  if (!deq(stripKey(a, 'moves'), stripKey(b, 'moves'))) return false;
  var kept = [], i, hit = 0;
  for (i = 0; i < ma.length; i++) {
    var mv = ma[i];
    if (isObj(mv) && goneKey(ctx, mv.eid)) { hit++; continue; }    /* بمفتاح الموظف وحده */
    kept.push(mv);
  }
  return hit > 0 && deq(kept, mb);
}
