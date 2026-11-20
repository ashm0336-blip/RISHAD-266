function dreportCleanup(A, k, newVal, curVal, ctx) {
  if (resName(k) !== 'bassam_dreport_v1') return false;
  if (newVal == null || curVal == null) return false;
  var nv = parseJson(newVal, null);
  if (!isObj(nv) || Object.keys(nv).length) return false;     /* الجديد {} حرفاً ودلالة */
  return !!wipeAllowed(A, parseKey(k).dept, ctx);
}
