/* عهد الموظفين: تفريغ moves وحدها (كما يفعل المساران) دون مساسٍ بالعهد نفسها */
function custodyCleanup(A, k, newVal, curVal, ctx) {
  if (resName(k) !== 'bassam_custody_v1') return false;
  if (newVal == null || curVal == null) return false;
  var nv = parseJson(newVal, null), ov = parseJson(curVal, null);
  if (!isObj(nv) || !isObj(ov)) return false;
  if (!(Array.isArray(nv.moves) && !nv.moves.length)) return false;
  if (!(Array.isArray(ov.moves) && ov.moves.length)) return false;
  var c1 = {}, c2 = {}, q;                                    /* وما سوى moves متطابقٌ حرفاً */
  for (q in ov) if (q !== 'moves') c1[q] = ov[q];
  for (q in nv) if (q !== 'moves') c2[q] = nv[q];
  if (!deq(c1, c2)) return false;
  return !!wipeAllowed(A, parseKey(k).dept, ctx);
}
