/* أحداثُ «aud» لصفّي في الجدول الشهري: الفاعلُ باسمه الظاهر (لا اسمَ دخوله) · من → إلى */
function meChanges(rows, users) {
  var by = nmap();
  (users || []).forEach(function (x) { if (x && x.id) by[x.id] = x; });
  return (rows || []).map(function (r) {
    var b = parseJson(r.bef, null), a = parseJson(r.aft, null), f = {};
    if (r.act === 'reassigned') f.shift = [b && b.shift != null ? b.shift : '', a && a.shift != null ? a.shift : ''];
    else if (r.act === 'edited' && a && isObj(a.f)) Object.keys(a.f).forEach(function (q) { if (q === 'rest' || q === 'muk' || q === 'cs' || q === 'shift') f[q] = a.f[q]; });
    else if (r.act === 'created' && isObj(a)) { if (a.shift != null) f.shift = ['', a.shift]; if (a.rest != null) f.rest = [null, a.rest]; if (a.muk != null) f.muk = [null, a.muk]; }
    else if (r.act === 'deleted' && isObj(b)) { if (b.shift != null) f.shift = [b.shift, '']; }
    var w = by[r.uid];
    return { ts: r.ts, by: w ? String(w.name || (w.role === 'super' ? 'مدير النظام' : 'مستخدم')) : 'مستخدم سابق', act: String(r.act || ''), f: f, ev: 'logged_change' };
  });
}
