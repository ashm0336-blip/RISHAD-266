/* ═══ فرق التدقيق: ما الذي تغيّر بالضبط — مضغوطاً ═══ */
var IDF = ['id', 'eid', 'key', 'k', 'nid', 'tok'];
function idFieldOf(arrs) {
  for (var f = 0; f < IDF.length; f++) {
    var fld = IDF[f], okAll = true, any = false;
    for (var a = 0; a < arrs.length && okAll; a++) for (var i = 0; i < arrs[a].length; i++) { any = true; var e = arrs[a][i]; if (!isObj(e) || e[fld] == null || e[fld] === '') { okAll = false; break; } }
    if (okAll && any) return fld;
  }
  return null;
}
/* الفرق بين قيمتين كقائمة مواضع {p, f, t}: الكائنات مفتاحاً مفتاحاً، والمصفوفات
   عنصراً عنصراً بالفهرس (أو بالمعرّف إن اختلف الطول وكانت عناصرها معرّفة) */
function walkDiff(a, b, cap) {
  var out = [], n = 0, LIM = cap || 400;
  function walk(x, y, path) {
    if (n > LIM) return;
    if (deq(x, y)) return;
    if (isObj(x) && isObj(y)) {
      var ks = {}; Object.keys(x).concat(Object.keys(y)).forEach(function (q) { ks[q] = 1; });
      for (var q in ks) walk(x[q], y[q], path.concat([q]));
      return;
    }
    if (Array.isArray(x) && Array.isArray(y)) {
      var prim = function (v) { return v == null || typeof v !== 'object'; };
      if (x.every(prim) && y.every(prim)) { n++; out.push({ p: path.join('.'), f: x, t: y }); return; }   /* قائمة قيم بسيطة: وحدة واحدة */
      if (x.length === y.length) { for (var i = 0; i < x.length; i++) walk(x[i], y[i], path.concat([String(i)])); return; }
      var fld = idFieldOf([x, y]);
      if (fld) {
        var mx = {}, my = {}, ids = {};
        x.forEach(function (e) { mx[String(e[fld])] = e; ids[String(e[fld])] = 1; });
        y.forEach(function (e) { my[String(e[fld])] = e; ids[String(e[fld])] = 1; });
        for (var id in ids) walk(mx[id], my[id], path.concat(['[' + id + ']']));
        return;
      }
    }
    n++; out.push({ p: path.join('.'), f: x, t: y });
  }
  var pa = parseJson(a, undefined), pb = parseJson(b, undefined);
  if (pa === undefined && a != null) pa = String(a).slice(0, 200);
  if (pb === undefined && b != null) pb = String(b).slice(0, 200);
  walk(pa, pb, []);
  return out;
}
function jsonDiff(a, b) {
  var out = walkDiff(a, b, 60).map(function (d) { return { p: d.p, f: d.f, t: d.t }; });
  var s = JSON.stringify(out);
  if (s.length > AUDIT_MAX) s = JSON.stringify(out.map(function (d) { return { p: d.p, big: 1 }; }).slice(0, 60));
  return s;
}
/* KIVO_252 · AUD-034/035 (SOT-137): تغييراتُ جدول الحسابات التي تُبطل الجلسات — التجميدُ أو الحذفُ يحذف جلساتِ المستخدم كلَّها،
   وتغييرُ كلمة المرور يحذفها عدا جلسةَ الطالب إن كان هو صاحبَها (غيّر كلمته بنفسه فيبقى داخلاً). تُنفَّذ في دفعة الحفظ نفسِها (ذرّيّة). */
function usersSessStmts(env, a, b, actorUid, actorTok) {
  var out = [], ma = {}, mb = {}, ids = {};
  (Array.isArray(a) ? a : []).forEach(function (x) { if (x && x.id) { ma[x.id] = x; ids[x.id] = 1; } });
  (Array.isArray(b) ? b : []).forEach(function (x) { if (x && x.id) { mb[x.id] = x; ids[x.id] = 1; } });
  Object.keys(ids).forEach(function (id) {
    var x = ma[id], y = mb[id];
    if (x && (!y || (!!y.dis && !x.dis))) { out.push(env.DB.prepare('DELETE FROM sess WHERE uid = ?1').bind(id)); return; }
    if (x && y && y.ph && x.ph && y.ph !== x.ph) out.push(id === actorUid && actorTok ? env.DB.prepare('DELETE FROM sess WHERE uid = ?1 AND tok <> ?2').bind(id, actorTok) : env.DB.prepare('DELETE FROM sess WHERE uid = ?1').bind(id));
  });
  return out;
}
/* تغييرات جدول الحسابات → أحداث أمن مفهومة: إضافة · حذف · تجميد · إعادة تفعيل · تغيير كلمة مرور */
function usersSecEvents(a, b, ident, now) {
  var out = [], ma = {}, mb = {}, ids = {};
  (Array.isArray(a) ? a : []).forEach(function (x) { if (x && x.id) { ma[x.id] = x; ids[x.id] = 1; } });
  (Array.isArray(b) ? b : []).forEach(function (x) { if (x && x.id) { mb[x.id] = x; ids[x.id] = 1; } });
  var base = { ts: now, uid: ident.uid, un: ident.un, ip: ident.ip, city: ident.city, dev: ident.dev };
  Object.keys(ids).forEach(function (id) {
    var x = ma[id], y = mb[id], nm = (y && (y.name || y.un)) || (x && (x.name || x.un)) || id;
    var tg = JSON.stringify({ id: id, name: nm, role: (y || x || {}).role || '', deptId: (y || x || {}).deptId || '', un: (y || x || {}).un || '' });
    if (!x && y) out.push(Object.assign({}, base, { act: 'acct_add', target: tg }));
    else if (x && !y) out.push(Object.assign({}, base, { act: 'acct_del', target: tg }));
    else {
      if (!!x.dis !== !!y.dis) out.push(Object.assign({}, base, { act: y.dis ? 'acct_freeze' : 'acct_unfreeze', target: tg }));
      if (y.ph && x.ph && y.ph !== x.ph) out.push(Object.assign({}, base, { act: 'pw_change', target: tg, detail: id === ident.uid ? 'self' : 'reset' }));
      if (!!x.mgr !== !!y.mgr) out.push(Object.assign({}, base, { act: 'admin', target: tg, detail: y.mgr ? 'mgr_on' : 'mgr_off' }));
    }
  });
  return out;
}
function permChangeDetail(o, n) {
  var parts = [];
  if (!deq(o.caps || {}, n.caps || {})) parts.push('caps');
  if (!deq(o.lenses || {}, n.lenses || {})) parts.push('lenses');
  var eo = o.emps || {}, en = n.emps || {}, ds = {};
  Object.keys(eo).concat(Object.keys(en)).forEach(function (d) { ds[d] = 1; });
  var who = [];
  Object.keys(ds).forEach(function (d) { var a = eo[d] || {}, b = en[d] || {}, ks = {}; Object.keys(a).concat(Object.keys(b)).forEach(function (k) { ks[k] = 1; }); Object.keys(ks).forEach(function (k) { if (!deq(a[k], b[k])) who.push(d + ':' + k + ':' + Object.keys(b[k] || {}).join('|')); }); });
  if (who.length) parts.push('emps=' + who.slice(0, 6).join(','));
  return parts.join(';');
}
