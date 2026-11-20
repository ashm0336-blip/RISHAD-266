  var r = refs[d] || {},
    st = r.staffing_v3 || {},
    months = Object.keys(st)
      .filter(function (k) {
        return /^\d+-\d+$/.test(k);
      })
      .sort(function (a, b) {
        var x = a.split("-").map(Number),
          y = b.split("-").map(Number);
        return y[0] - x[0] || y[1] - x[1];
      }),
    m = months[0];
  if (!m) return "";
  var e = (Array.isArray(r.employees_v1) ? r.employees_v1 : []).filter(function (x) {
      return x && (x.eid || x.name) === u.ekey;
    })[0],
    keys = e ? [e.nid, e.eid, u.ekey] : [u.ekey];
  for (var i = 0; i < keys.length; i++) {
    var v = keys[i] && st[m][keys[i]];
    if (v && v.shift) return String(v.shift);
  }
  return "";
}
