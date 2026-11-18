function cuRemovedHolderKeys(before, after) {
  var aligned = alignOld(entOf('bassam_employees_v1'), before, after, {});
  var liveKeys = new Set(
      after.map(function (e) {
        return typeof e === 'string' ? e : e && (e.eid || e.name);
      }),
    ),
    survivorNames = new Set(
      after
        .map(function (e) {
          return typeof e === 'string' ? e : e && e.name;
        })
        .filter(Boolean),
    ),
    keys = new Set();
  before.forEach(function (e, index) {
    if (typeof e === 'string' && e) {
      if (!survivorNames.has(e)) keys.add(e);
      return;
    }
    if (!isObj(e)) throw cuError('custody-employees-shape');
    var previous = Array.isArray(aligned) ? aligned[index] : e;
    if (liveKeys.has(previous && (previous.eid || previous.name))) return;
    if (e.eid) keys.add(String(e.eid));
    if (e.nid) keys.add(String(e.nid));
    if (e.name && !survivorNames.has(String(e.name))) keys.add(String(e.name));
  });
  return Array.from(keys);
}
