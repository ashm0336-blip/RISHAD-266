/* ═══ V7 · د5-هـ (44) — محرّكُ الأدوار (الخادم): مولَّدٌ بأداة tools/generate.py من permissions/registry/perm44-levels.json (جدولُ المستويات) و
   perm44-core.js (المحرّكُ المشترك — نصُّه في الواجهة والخادم حرفاً) وperm44-server.js وقائمةِ الأنظمة من manifests/pages.json — لا يُحرَّر يدوياً. ═══ */
var KIVO_PERM44_DATA = {"v":1,"levels":[{"key":"view","name":"مشاهدة فقط","types":["access","view"],"sensitive":false},{"key":"input","name":"إدخال","types":["access","view","create"],"sensitive":false},{"key":"edit","name":"تعديل","types":["access","view","create","edit"],"sensitive":false},{"key":"full","name":"كامل","types":"*","sensitive":false},{"key":"sensitive","name":"حسّاس","types":"*","sensitive":true},{"key":"custom","name":"مخصّص","custom":true}],"names":{"custom":"صلاحيات مخصّصة","none":"بلا صلاحيات","super":"صلاحية كاملة بلا أي قيد"},"systems":[{"key":"dstats","name":"الإحصائيات اليومية","leaves":["dstats","dstats/haram","dstats/nabawi","dstats/anHaram","dstats/anNabawi","dstats/anCmp","dstats/anTime"],"toggle":true,"plat":false},{"key":"emps","name":"موظفو الإدارة","leaves":["emps","emps/data"],"toggle":false,"plat":false},{"key":"custody","name":"عهد الموظفين","leaves":["emps/custody"],"toggle":true,"plat":false,"under":"emps"},{"key":"planning","name":"الخطة التشغيلية","leaves":["planning","planning/readiness"],"toggle":true,"plat":true},{"key":"staff","name":"الجدول الشهري","leaves":["staff"],"toggle":true,"plat":false,"under":"planning"},{"key":"plan","name":"التشغيل الميداني","leaves":["plan"],"toggle":true,"plat":false,"under":"planning"},{"key":"daily","name":"المتابعة اليومية","leaves":["daily","daily/kpiDaily","daily/kpiOcc","daily/kpiZones","daily/rounds","daily/field"],"toggle":true,"plat":true},{"key":"dreport","name":"التقرير اليومي","leaves":["dreport"],"toggle":true,"plat":false,"under":"daily"},{"key":"tasks","name":"المهام","leaves":["tasks"],"toggle":true,"plat":false,"under":"daily"},{"key":"irshad","name":"نظام الاسترشاد","leaves":["irshad","irshad/dash","irshad/records"],"toggle":true,"plat":true},{"key":"seized","name":"نظام المضبوطات","leaves":["seized","seized/dash","seized/records"],"toggle":true,"plat":true},{"key":"rasd","name":"نظام رصد الحالات","leaves":["rasd","rasd/dash","rasd/records"],"toggle":true,"plat":true},{"key":"award","name":"جائزة التميز","leaves":["award","award/new","award/res","award/doc"],"toggle":true,"plat":true},{"key":"links","name":"مواقع ذات صلة","leaves":["links"],"toggle":true,"plat":false},{"key":"help","name":"المساعدة","leaves":["help"],"toggle":true,"plat":false}]};
/* V7 · د5-هـ (44): المحرّكُ المشترك للأدوار — نصٌّ واحدٌ يُحقن حرفياً في الواجهة (345-perm44.js) والخادم (057b-perm44.js) بأداة tools/generate.py.
   دالّةٌ نقيّة: لا تقرأ مخزناً ولا جلسة — السجلُّ (R = KIVO_REGISTRY) والجدول (D = KIVO_PERM44_DATA) والسقفُ (دالّةٌ على المفتاح) تأتيها من المضيف. */
function perm44Make(R, D) {
  var LEAF_RE = /^([A-Za-z]+(?:\/[A-Za-z]+)?):(view|add|edit|del|approve|export)$/;
  var LV = {}, SY = {}, sysKeysC = {}, ix = { leaf: {}, hosts: {}, sys: {} }, i, j;
  for (i = 0; i < D.levels.length; i++) LV[D.levels[i].key] = D.levels[i];
  for (i = 0; i < D.systems.length; i++) SY[D.systems[i].key] = D.systems[i];
  var leafSys = {};
  for (i = 0; i < D.systems.length; i++) for (j = 0; j < D.systems[i].leaves.length; j++) leafSys[D.systems[i].leaves[j]] = D.systems[i].key;
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function same(a, b) { return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b); }
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  /* فهرسُ المفاتيح: الورقةُ المالكة (صفحة · مرجع يُدار في ورقة) أو مضيفو العدسة (ذرّاتُ asisMap) — والنظامُ (أو الأنظمة) الذي يملكها */
  for (i = 0; i < R.keys.length; i++) {
    var k = R.keys[i], e = R.byKey[k];
    if (!e || e.status !== 'active') continue;
    var leaves = [], am = e.asisMap || [];
    for (j = 0; j < am.length; j++) { var m = LEAF_RE.exec(String(am[j])); if (m && leaves.indexOf(m[1]) === -1) leaves.push(m[1]); }
    var o = R.owners[e.owner], own = [];
    if (e.ownerKind === 'page') { ix.leaf[k] = e.owner; own = [e.owner]; }
    else if (e.ownerKind === 'reference') { ix.leaf[k] = (o && o.managedIn) || leaves[0] || ''; own = [ix.leaf[k]]; }
    else if (e.ownerKind === 'lens') { ix.hosts[k] = leaves; own = leaves; }
    var ss = [];
    for (j = 0; j < own.length; j++) if (leafSys[own[j]] && ss.indexOf(leafSys[own[j]]) === -1) ss.push(leafSys[own[j]]);
    if (ss.length) ix.sys[k] = ss;
  }
  /* يُمنح بالدور؟ — قابلٌ للمنح (assignable) ولا بوابةَ عدسة (lens.<L>.enable: تفتحها عدساتُ الموظف لا المنح) */
  function grantable(k) { var e = R.byKey[k]; return !!e && e.status === 'active' && e.grant === 'assignable' && !/^lens\.[a-z]+\.enable$/.test(k); }
  function sysKeys(s) {
    if (sysKeysC[s]) return sysKeysC[s].slice();
    var out = [], n;
    for (n = 0; n < R.keys.length; n++) { var q = R.keys[n]; if (grantable(q) && ix.sys[q] && ix.sys[q].indexOf(s) !== -1) out.push(q); }
    return (sysKeysC[s] = out).slice();
  }
  function levels() { return clone(D.levels); }
  function sysList() { return clone(D.systems); }
  /* مستوى → مفاتيح (بترتيب السجلّ): view {access, view} · input +create · edit +edit · full كلُّ غير الحسّاس · sensitive الكلّ · custom القائمةُ ∩ مفاتيحُ النظام */
  function keysFor(s, lvl, custom) {
    if (!SY[s]) return [];
    var L = LV[lvl], all = sysKeys(s), out = [], n;
    if (!L) return [];
    if (L.custom) { var want = {}; (Array.isArray(custom) ? custom : []).forEach(function (x) { want[String(x)] = 1; }); return all.filter(function (x) { return want[x]; }); }
    for (n = 0; n < all.length; n++) {
      var e = R.byKey[all[n]];
      if (e.sensitive && !L.sensitive) continue;
      if (L.types !== '*' && L.types.indexOf(e.type) === -1) continue;
      out.push(all[n]);
    }
    return out;
  }
  function order(map) { var out = [], n; for (n = 0; n < R.keys.length; n++) if (map[R.keys[n]]) out.push(R.keys[n]); return out; }
  /* سقفُ المفتاح (= enfKeyOnCeiling · p24KeyOn بلا استثناء الفاعل): leafOn(ورقة) وlensOn(عدسة) من المضيف */
  function keyOn(k, leafOn, lensOn) {
    var e = R.byKey[k]; if (!e || e.status !== 'active') return false;
    if (e.ownerKind === 'platform') return true;
    if (ix.hosts[k]) {
      var lm = /^lens\.([a-z]+)\./.exec(k); if (lm && lensOn && !lensOn(lm[1])) return false;
      for (var n = 0; n < ix.hosts[k].length; n++) if (leafOn(ix.hosts[k][n])) return true;
      return false;
    }
    return ix.leaf[k] ? !!leafOn(ix.leaf[k]) : true;
  }
  function sysOn(s, leafOn) { var S = SY[s]; if (!S) return false; for (var n = 0; n < S.leaves.length; n++) if (leafOn(S.leaves[n])) return true; return false; }
  function roleById(roles, id) { var L = isObj(roles) ? roles.roles : roles; if (!Array.isArray(L) || id == null) return null; for (var n = 0; n < L.length; n++) if (L[n] && L[n].id === id) return L[n]; return null; }
  /* الدور → مفاتيحُه داخل السقف (ceilingFn(مفتاح) → منطقي · غيابُها = بلا قصّ) */
  function compileRole(role, ceilingFn) {
    var map = {}, s, n;
    if (!isObj(role) || !isObj(role.sys)) return [];
    for (s in role.sys) {
      var x = role.sys[s]; if (!isObj(x)) continue;
      var ks = keysFor(s, x.lvl, x.keys);
      for (n = 0; n < ks.length; n++) if (!ceilingFn || ceilingFn(ks[n])) map[ks[n]] = 1;
    }
    return order(map);
  }
  function liveEx(rec, now) {
    var live = [], gone = [], L = isObj(rec) && Array.isArray(rec.ex) ? rec.ex : [], n;
    for (n = 0; n < L.length; n++) { var x = L[n]; if (!isObj(x) || typeof x.key !== 'string') continue; if (x.until != null && !(Number(x.until) > now)) gone.push(x); else live.push(x); }
    return { live: live, gone: gone };
  }
  /* الفعليُّ لشخص = (مفاتيحُ دوره ∪ استثناءاتُه الحيّة) ∩ السقف — { keys, role, name, live, expired, until } */
  function effective(rec, roles, ceilingFn, now) {
    now = now == null ? Date.now() : Number(now);
    var role = isObj(rec) ? roleById(roles, rec.role) : null, map = {}, until = {}, n;
    var base = role ? compileRole(role, ceilingFn) : [];
    for (n = 0; n < base.length; n++) map[base[n]] = 1;
    var X = liveEx(rec, now);
    for (n = 0; n < X.live.length; n++) {
      var q = X.live[n].key; if (!grantable(q) || (ceilingFn && !ceilingFn(q))) continue;
      if (!map[q]) { map[q] = 1; if (X.live[n].until != null) until[q] = Number(X.live[n].until); }
    }
    return { keys: order(map), role: role ? role.id : null, name: role ? String(role.name || '') : '', live: clone(X.live), expired: clone(X.gone), until: until };
  }
  /* سجلُّ المنح المترجَم لشخص (bassam_grants_v1.emp[ekey]) — plus = الفعلي · minus = ما تمنحه ورقتُه القديمة T خارج الفعلي (فيصير الفعليُّ في الإنفاذ = الدورَ وحده،
     والورقةُ القديمة لا تُمسّ فلا يتغيّر الوضعُ القديم) · until: انتهاءُ الاستثناء يحكم به الخادمُ وقتَ القرار (057 enfGrantOf) */
  function grantOf(rec, roles, ceilingFn, now, T) {
    var E = effective(rec, roles, ceilingFn, now), inE = {}, minus = [], n;
    for (n = 0; n < E.keys.length; n++) inE[E.keys[n]] = 1;
    if (isObj(T)) minus = order(T).filter(function (x) { return !inE[x] && grantable(x); });
    if (!E.keys.length && !minus.length && !E.role) return null;
    var g = { plus: E.keys, minus: minus, src: E.role ? 'role:' + E.role : 'p44:ex' };
    if (Object.keys(E.until).length) g.until = E.until;
    return g;
  }
  function normRec(rec) {
    var r = isObj(rec) ? clone(rec) : {};
    return { v: 1, roles: Array.isArray(r.roles) ? r.roles : [], people: isObj(r.people) ? r.people : {} };
  }
  /* شكلُ السجلّ: '' سليم · وإلا السبب */
  function shapeWhy(rec) {
    if (!isObj(rec) || rec.v !== 1 || !Array.isArray(rec.roles) || !isObj(rec.people)) return 'shape';
    var ids = {}, n, s, p;
    for (n = 0; n < rec.roles.length; n++) {
      var r = rec.roles[n];
      if (!isObj(r) || typeof r.id !== 'string' || !r.id || r.id.length > 64 || ids[r.id]) return 'role-id';
      ids[r.id] = 1;
      if (typeof r.name !== 'string' || !r.name.trim() || r.name.length > 80) return 'role-name';
      if (r.desc != null && (typeof r.desc !== 'string' || r.desc.length > 400)) return 'role-desc';
      if (r.sup != null && typeof r.sup !== 'boolean') return 'role-sup';
      if (!isObj(r.sys)) return 'role-sys';
      for (s in r.sys) { var x = r.sys[s]; if (!isObj(x) || !LV[x.lvl] || (x.keys != null && (!Array.isArray(x.keys) || x.keys.some(function (q) { return typeof q !== 'string'; })))) return 'role-lvl'; }
    }
    for (p in rec.people) {
      var P = rec.people[p];
      if (!isObj(P) || (P.role != null && (typeof P.role !== 'string' || !ids[P.role]))) return 'person-role';
      if (P.ex != null && (!Array.isArray(P.ex) || P.ex.some(function (x) { return !isObj(x) || typeof x.key !== 'string' || (x.until != null && typeof x.until !== 'number'); }))) return 'person-ex';
    }
    return '';
  }
  /* الفرقُ المنظَّم بين سجلَّي أدوار: changes[{what, role?, sys?, person?, key?, from, to}] · affected[ekey] */
  function diff(before, after) {
    var a = normRec(before), b = normRec(after), ch = [], aff = {}, n, s;
    var A = {}, B = {}; a.roles.forEach(function (r) { if (isObj(r)) A[r.id] = r; }); b.roles.forEach(function (r) { if (isObj(r)) B[r.id] = r; });
    function holders(id) { var p; for (p in a.people) if (a.people[p] && a.people[p].role === id) aff[p] = 1; for (p in b.people) if (b.people[p] && b.people[p].role === id) aff[p] = 1; }
    var ids = []; a.roles.concat(b.roles).forEach(function (r) { if (isObj(r) && ids.indexOf(r.id) === -1) ids.push(r.id); });
    for (n = 0; n < ids.length; n++) {
      var id = ids[n], ra = A[id], rb = B[id], before0 = ch.length;
      if (!ra || !rb) ch.push({ what: 'role', role: id, from: ra ? clone(ra) : null, to: rb ? clone(rb) : null });
      else {
        ['name', 'desc', 'sup'].forEach(function (f) { if (!same(ra[f], rb[f])) ch.push({ what: f, role: id, from: ra[f] === undefined ? null : ra[f], to: rb[f] === undefined ? null : rb[f] }); });
        var sa = isObj(ra.sys) ? ra.sys : {}, sb = isObj(rb.sys) ? rb.sys : {}, ks = Object.keys(sa).concat(Object.keys(sb).filter(function (x) { return !(x in sa); }));
        for (s = 0; s < ks.length; s++) if (!same(sa[ks[s]], sb[ks[s]])) ch.push({ what: 'sys', role: id, sys: ks[s], from: sa[ks[s]] ? clone(sa[ks[s]]) : null, to: sb[ks[s]] ? clone(sb[ks[s]]) : null });
      }
      if (ch.length > before0) holders(id);
    }
    var ps = Object.keys(a.people).concat(Object.keys(b.people).filter(function (x) { return !(x in a.people); }));
    for (n = 0; n < ps.length; n++) {
      var p = ps[n], pa = a.people[p] || {}, pb = b.people[p] || {};
      if (!same(pa.role, pb.role)) { ch.push({ what: 'person', person: p, from: pa.role == null ? null : pa.role, to: pb.role == null ? null : pb.role }); aff[p] = 1; }
      var xa = {}, xb = {}; (Array.isArray(pa.ex) ? pa.ex : []).forEach(function (x) { if (isObj(x)) xa[x.key] = x; }); (Array.isArray(pb.ex) ? pb.ex : []).forEach(function (x) { if (isObj(x)) xb[x.key] = x; });
      Object.keys(xa).concat(Object.keys(xb).filter(function (x) { return !(x in xa); })).forEach(function (q) { if (!same(xa[q], xb[q])) { ch.push({ what: 'ex', person: p, key: q, from: xa[q] ? clone(xa[q]) : null, to: xb[q] ? clone(xb[q]) : null }); aff[p] = 1; } });
    }
    return { changes: ch, affected: Object.keys(aff).sort() };
  }
  /* «تراجع»: يطبّق عكسَ التغييرات على السجلّ الحالي — كلُّ موضعٍ يجب أن يكون على قيمة «to» بعدُ، وإلا null (انجرف: غيّره غيرُه بعدها) */
  function undo(cur, changes) {
    var r = normRec(cur), L = Array.isArray(changes) ? changes.slice().reverse() : [], n;
    function role(id) { for (var q = 0; q < r.roles.length; q++) if (r.roles[q] && r.roles[q].id === id) return q; return -1; }
    for (n = 0; n < L.length; n++) {
      var c = L[n], at, P;
      if (!isObj(c)) return null;
      if (c.what === 'role') {
        at = role(c.role);
        if (!same(at === -1 ? null : r.roles[at], c.to)) return null;
        if (c.from == null) r.roles.splice(at, 1); else if (at === -1) r.roles.push(clone(c.from)); else r.roles[at] = clone(c.from);
      } else if (c.what === 'name' || c.what === 'desc' || c.what === 'sup') {
        at = role(c.role); if (at === -1 || !same(r.roles[at][c.what] === undefined ? null : r.roles[at][c.what], c.to)) return null;
        if (c.from == null) delete r.roles[at][c.what]; else r.roles[at][c.what] = c.from;
      } else if (c.what === 'sys') {
        at = role(c.role); if (at === -1) return null; var S = r.roles[at].sys = isObj(r.roles[at].sys) ? r.roles[at].sys : {};
        if (!same(S[c.sys] === undefined ? null : S[c.sys], c.to)) return null;
        if (c.from == null) delete S[c.sys]; else S[c.sys] = clone(c.from);
      } else if (c.what === 'person') {
        P = r.people[c.person] = isObj(r.people[c.person]) ? r.people[c.person] : {};
        if (!same(P.role == null ? null : P.role, c.to)) return null;
        P.role = c.from == null ? null : c.from;
      } else if (c.what === 'ex') {
        P = r.people[c.person] = isObj(r.people[c.person]) ? r.people[c.person] : {};
        var ex = Array.isArray(P.ex) ? P.ex : [], q, hit = -1;
        for (q = 0; q < ex.length; q++) if (ex[q] && ex[q].key === c.key) hit = q;
        if (!same(hit === -1 ? null : ex[hit], c.to)) return null;
        if (c.from == null) ex.splice(hit, 1); else if (hit === -1) ex.push(clone(c.from)); else ex[hit] = clone(c.from);
        P.ex = ex;
      } else return null;
    }
    return r;
  }
  return { levels: levels, sysList: sysList, sysKeys: sysKeys, sysOfKey: function (k) { return (ix.sys[k] || []).slice(); }, grantable: grantable, keysFor: keysFor,
           keyOn: keyOn, sysOn: sysOn, roleById: roleById, compileRole: compileRole, effective: effective, grantOf: grantOf, normRec: normRec, shapeWhy: shapeWhy,
           diff: diff, undo: undo, names: clone(D.names), data: D };
}
/* ══ V7 · د5-هـ (44): الأدوارُ في الخادم — سجلُّ الأدوار bsdept:<d>:bassam_roles_v1 (مصدرُ الحقيقة) ومنحُه المترجَم bsdept:<d>:bassam_grants_v1 يُكتبان معاً ══
   الكتابة: مديرُ الإدارة (perm.assign · داخل السقف · ما يحمله هو) أو مديرُ المنصة. الحفظةُ التي تحمل السجلَّ ذرّية (054: protOp 'perm44')،
   ومنحُ كلِّ شخصٍ مصدرُه دور (src role:* · p44:*) = ما يترجمه سجلُّ الأدوار حرفاً (perm44GrantsWhy) — وإلا رُفضت الحفظةُ كلُّها.
   انتهاءُ الاستثناء يحكم به الخادمُ وقتَ القرار: until في المنح (057 enfGrantOf) — فلا حاجةَ لإعادة ترجمةٍ يومية. */
var PERM44 = null, PERM44_RES = 'bassam_roles_v1';
function perm44E() { return PERM44 || (PERM44 = perm44Make(KIVO_REGISTRY, KIVO_PERM44_DATA)); }
function perm44Key(d) { return 'bsdept:' + d + ':' + PERM44_RES; }
function perm44KeysFor(s, lvl, custom) { return perm44E().keysFor(s, lvl, custom); }
function perm44Compile(role, ceilingFn) { return perm44E().compileRole(role, ceilingFn); }
function perm44Effective(rec, roles, ceilingFn, now) { return perm44E().effective(rec, roles, ceilingFn, now); }
/* سقفُ الوحدة بالوراثة: سقفُها ∩ سقفُ كلِّ سلف (ولو كانت مستقلّة capOwn) ∩ المطفأُ من المنصة (A.off في deptCapOf) — ومنه مفتاحُ السقف */
function perm44Chain(A, d) { var out = [d]; try { ancChain(A, d).forEach(function (a) { if (a && out.indexOf(a) === -1) out.push(a); }); } catch (e) { swallow('perm44-chain', e); } return out; }
function perm44LeafOn(A, d) { var ch = perm44Chain(A, d); return function (leaf) { for (var i = 0; i < ch.length; i++) if (!capOnDept(A, ch[i], leaf)) return false; return true; }; }
function perm44LensOn(A, d) { var ch = perm44Chain(A, d); return function (L) { for (var i = 0; i < ch.length; i++) if (!enfLensDeptOn(A, ch[i], L)) return false; return true; }; }
function perm44CeilingFn(A, d) {
  var E = perm44E(), lf = perm44LeafOn(A, d), ln = perm44LensOn(A, d), memo = {};
  return function (k) { if (memo[k] === undefined) memo[k] = E.keyOn(k, lf, ln); return memo[k]; };
}
function perm44Ceiling(A, d) {
  var E = perm44E(), lf = perm44LeafOn(A, d);
  return { on: E.sysList().filter(function (s) { return E.sysOn(s.key, lf); }).map(function (s) { return s.key; }), key: perm44CeilingFn(A, d) };
}
/* هل يحمل الفاعلُ المفتاحَ في الوحدة؟ — الإنفاذُ enfHeld (V7 · د5-ح: وحده؛ حُذفت ترجمةُ الورقة للوضع القديم) */
function perm44Held(A, d, k) {
  if (!A || !A.u) return false;
  if (A.u.role === 'super') return true;
  if (!d) return false;
  return enfHeld(A, d, k);   /* V7 · د5-ح (القفل): المحرّكُ النافذ وحده */
}
function perm44Rec(v) { var o = typeof v === 'string' ? parseJson(v, null) : v; return isObj(o) ? o : null; }
/* قيمتا السجلّين كما ستُكتبان في هذه الحفظة (054 يملأ A.__p44 قبل الحكم: من الطلب، وإلا المخزَّن) */
function perm44Pair(A, d) { var P = A && A.__p44 && A.__p44[d]; return P || null; }
/* حكمُ كتابة سجلّ الأدوار: '' = مقبول · وإلا السبب (رفضٌ بالوضعين) */
function perm44RolesWhy(A, k, newVal, curVal) {
  var d = parseKey(k).dept, u = A.u, sup = u.role === 'super', E = perm44E();
  if (!d) return 'scope';
  if (!sup && !deptInScope(A, d)) return 'dept';
  if (newVal == null) return sup ? '' : 'super';
  var n = perm44Rec(newVal), o = curVal == null ? null : perm44Rec(curVal);
  if (!n) return 'shape';
  var sw = E.shapeWhy(n); if (sw) return 'shape';
  if (!sup) {
    if (!isMgrOf(A, d)) return 'mgr';
    if (!perm44Held(A, d, 'perm.assign')) return 'grant';
    /* ما يضيفه المديرُ أو يغيّره في دورٍ: داخل سقف وحدته · ويحمله هو — والمحفوظُ خارج السقف (نظامٌ أُطفئ بعدُ) يبقى كما هو بلا مساس */
    var C = perm44CeilingFn(A, d), D0 = E.diff(o, n), i, j;
    for (i = 0; i < D0.changes.length; i++) {
      var c = D0.changes[i], sysEntries = [];
      if (c.what === 'sys' && c.to) sysEntries.push([c.sys, c.to]);
      if (c.what === 'role' && c.to && isObj(c.to.sys)) for (var s in c.to.sys) sysEntries.push([s, c.to.sys[s]]);
      for (j = 0; j < sysEntries.length; j++) {
        var ks = perm44KeysFor(sysEntries[j][0], sysEntries[j][1].lvl, sysEntries[j][1].keys);
        for (var q = 0; q < ks.length; q++) { if (!C(ks[q])) return 'cap'; if (!perm44Held(A, d, ks[q])) return 'grant'; }
      }
      if (c.what === 'ex' && c.to) { if (!E.grantable(c.to.key) || !C(c.to.key)) return 'cap'; if (!perm44Held(A, d, c.to.key)) return 'grant'; }
      if ((c.what === 'person' || c.what === 'ex') && c.person === String(u.ekey || '')) return 'self';   /* لا يمنح المرءُ نفسَه */
    }
  }
  return perm44GrantsWhy(A, d);
}
/* المنحُ المترجَم = سجلُّ الأدوار: لكلِّ شخصٍ مسّته الحفظة (فرقُ الأدوار · أو مدخلُ منحٍ مصدرُه دور تغيّر فيها) plus = الفعليُّ حرفاً.
   من لم تمسّه يبقى منحُه كما كُتب (تضييقُ السقف بعده يقصّه وقتَ القرار — enfKeyOnCeiling — فلا يُرفض حفظُ غيره بسببه) */
var PERM44_SRC = /^(role:|p44:)/;
function perm44GrantsWhy(A, d) {
  var P = perm44Pair(A, d); if (!P) return '';
  var E = perm44E(), R = perm44Rec(P.roles) || { v: 1, roles: [], people: {} }, G = perm44Rec(P.grants), G0 = perm44Rec(P.grantsCur);
  var emp = G && isObj(G.emp) ? G.emp : {}, emp0 = G0 && isObj(G0.emp) ? G0.emp : {}, people = isObj(R.people) ? R.people : {}, C = perm44CeilingFn(A, d), now = Date.now(), e, all = {};
  E.diff(perm44Rec(P.rolesCur), R).affected.forEach(function (x) { all[x] = 1; });
  for (e in emp) if (!deq(emp[e], emp0[e]) && isObj(emp[e]) && PERM44_SRC.test(String(emp[e].src || ''))) all[e] = 1;
  for (e in emp0) if (!deq(emp[e], emp0[e]) && isObj(emp0[e]) && PERM44_SRC.test(String(emp0[e].src || ''))) all[e] = 1;
  for (e in all) {
    var want = people[e] ? perm44Effective(people[e], R, C, now) : { keys: [], role: null, live: [] }, g = emp[e];
    var has = isObj(g) && Array.isArray(g.plus) ? g.plus.map(String).slice().sort() : [];
    if (!want.role && !want.live.length) { if (isObj(g) && PERM44_SRC.test(String(g.src || '')) && has.length) return 'p44-grants'; continue; }
    if (!isObj(g) || JSON.stringify(has) !== JSON.stringify(want.keys.slice().sort())) return 'p44-grants';
  }
  return '';
}
/* «اختبار الوصول»: القرارُ نفسُه الذي تُحكم به الكتابة — {allow, why} */
function perm44Decide(A, d, q) {
  var E = perm44E(), R = perm44Rec(q.rolesRec) || { v: 1, roles: [], people: {} }, key = String(q.key || ''), e = KIVO_REGISTRY.byKey[key];
  if (!e) return { allow: false, why: 'unknown-key' };
  if (e.status !== 'active') return { allow: false, why: 'reserved' };
  if (q.target && q.target.role === 'super') return { allow: true, why: 'super' };
  var C = perm44CeilingFn(A, d);
  if (e.grant === 'self') return { allow: true, why: 'self' };
  if (e.grant === 'role') return { allow: false, why: 'role-only' };
  if (!E.grantable(key)) return { allow: false, why: 'not-grantable' };
  if (!C(key)) return { allow: false, why: 'ceiling' };
  var needMgr = (e.asisMap || []).indexOf('role:mgr') !== -1;
  if (q.role != null) {
    var role = E.roleById(R, String(q.role)); if (!role) return { allow: false, why: 'no-role' };
    return perm44Compile(role, C).indexOf(key) !== -1 ? { allow: true, why: 'role' } : { allow: false, why: 'level' };
  }
  var rec = isObj(R.people) ? R.people[String(q.ekey || '')] : null;
  if (needMgr && !(q.target && q.target.mgr)) return { allow: false, why: 'mgr' };
  if (!rec) return { allow: false, why: 'no-role' };
  var F = E.effective(rec, R, C, Date.now());
  if (F.keys.indexOf(key) === -1) return { allow: false, why: F.role ? 'level' : 'no-role' };
  return { allow: true, why: F.role && E.compileRole(E.roleById(R, F.role), C).indexOf(key) !== -1 ? 'role' : 'exception' };
}
/* حدثُ السجلّ «④ السجل»: يكتبه الخادمُ مع الحفظة (054) — {who, unit, changes, affected} في aft (JSON) */
function perm44AudEv(k, cur, val, rev) {
  var d = parseKey(k).dept || '', D0;
  if (resName(k) === PERM44_RES) D0 = perm44E().diff(perm44Rec(cur), perm44Rec(val));
  else if (k === K_PERM) D0 = perm44CeilDiff(perm44Rec(cur) || {}, perm44Rec(val) || {});
  else return null;
  if (!D0.changes.length) return null;
  var units = d ? [d] : D0.changes.map(function (c) { return c.unit; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
  var body = { unit: d || null, units: units, changes: D0.changes, affected: D0.affected };
  var s = JSON.stringify(body); if (s.length > AUD_STR) { body = { unit: d || null, units: units, changes: D0.changes.slice(0, 40), affected: D0.affected.slice(0, 200), truncated: D0.changes.length }; s = JSON.stringify(body); }
  return { cid: 'p44' + rev + '_' + String(k).replace(/[^A-Za-z0-9_-]/g, '').slice(-40), k: k, etype: 'perm44', act: 'change', eid: d || 'platform', ename: 'الصلاحيات', ctx: units.join(','), bef: '', aft: s.length > AUD_STR ? s.slice(0, AUD_STR) : s };
}
/* فرقُ السقف (bassam_perms_v1: caps · subs · lenses لكل وحدة) */
function perm44CeilDiff(a, b) {
  var ch = [], f, d;
  ['caps', 'subs', 'lenses'].forEach(function (fld) {
    var A0 = isObj(a[fld]) ? a[fld] : {}, B0 = isObj(b[fld]) ? b[fld] : {};
    var ds = {}; for (d in A0) ds[d] = 1; for (d in B0) ds[d] = 1;
    for (d in ds) if (!deq(A0[d], B0[d])) ch.push({ what: 'ceil.' + fld, unit: d, from: A0[d] === undefined ? null : A0[d], to: B0[d] === undefined ? null : B0[d] });
  });
  f = ch; return { changes: f, affected: [] };
}
/* GET /api/perm44/check?d=&role=|ekey=&key= · GET /api/perm44/log?d=&limit= — للقراءة فقط: مديرُ المنصة أو مديرُ الوحدة */
async function perm44Route(env, request, url, A, path) {
  if (request.method !== 'GET') return json({ ok: 0, err: 'read-only (GET)' }, 405);
  var d = String(url.searchParams.get('d') || ''), sup = A.u.role === 'super';
  if (!d || !(isUnitId(A, d) || isNodeId(A, d))) return json({ ok: 0, err: 'unit' }, 400);
  if (!sup && !(deptInScope(A, d) && isMgrOf(A, d))) return json({ ok: 0, err: 'forbidden' }, 403);
  if (path === '/api/perm44/check') {
    var role = url.searchParams.get('role'), ekey = url.searchParams.get('ekey'), key = String(url.searchParams.get('key') || '');
    if ((role == null) === (ekey == null) || !key) return json({ ok: 0, err: 'args' }, 400);
    var rec = await opResourceGet(env, perm44Key(d)), target = null;
    if (ekey != null) { var tu = (A.users || []).filter(function (x) { return x && !x.dis && String(x.ekey || '') === String(ekey); })[0]; target = tu ? { role: tu.role, mgr: isMgrKey(tu.ekey) || !!tu.mgr } : { role: 'staff', mgr: isMgrKey(ekey) }; }
    var v = perm44Decide(A, d, { rolesRec: rec, role: role, ekey: ekey, key: key, target: target });
    return json({ ok: 1, allow: !!v.allow, why: v.why, on: perm44Ceiling(A, d).on });   /* on: الأنظمةُ المشغَّلة في سقف الوحدة بالوراثة */
  }
  if (path === '/api/perm44/log') {
    var lim = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
    var r = await env.DB.prepare("SELECT cid, ts, uid, un, dept, k, aft FROM aud WHERE etype = 'perm44' AND (dept = ?1 OR (dept = '' AND (',' || ctx || ',') LIKE ('%,' || ?1 || ',%'))) ORDER BY ts DESC LIMIT ?2").bind(d, lim).all();
    var names = {}; (A.users || []).forEach(function (x) { if (x && x.id) names[x.id] = x.name || x.un || ''; });
    var rows = ((r && r.results) || []).map(function (x) {
      var b = parseJson(x.aft, null) || {}, ch = Array.isArray(b.changes) ? b.changes : [];
      if (!x.dept) ch = ch.filter(function (c) { return c && c.unit === d; });
      return { id: x.cid, at: x.ts, who: { uid: x.uid, name: names[x.uid] || x.un || '' }, unit: x.dept || d, k: x.k, changes: ch, affected: Array.isArray(b.affected) ? b.affected : [], truncated: b.truncated || 0 };
    });
    return json({ ok: 1, rows: rows });
  }
  return json({ ok: 0, err: 'not-found' }, 404);
}
