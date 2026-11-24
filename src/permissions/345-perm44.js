/* ═══ V7 · د5-هـ (44) — محرّكُ الأدوار (الواجهة): مولَّدٌ بأداة tools/generate.py من permissions/registry/perm44-levels.json (جدولُ المستويات) و
   perm44-core.js (المحرّكُ المشترك — نصُّه في الواجهة والخادم حرفاً) وperm44-client.js وقائمةِ الأنظمة من manifests/pages.json — لا يُحرَّر يدوياً. ═══ */
(function () {
  'use strict';
var KIVO_PERM44_DATA = {"v":1,"levels":[{"key":"view","name":"مشاهدة فقط","types":["access","view"],"sensitive":false},{"key":"input","name":"إدخال","types":["access","view","create"],"sensitive":false},{"key":"edit","name":"تعديل","types":["access","view","create","edit"],"sensitive":false},{"key":"full","name":"كامل","types":"*","sensitive":false},{"key":"sensitive","name":"حسّاس","types":"*","sensitive":true},{"key":"custom","name":"مخصّص","custom":true}],"names":{"custom":"صلاحيات مخصّصة","none":"بلا صلاحيات","super":"صلاحية كاملة بلا أي قيد"},"systems":[{"key":"dstats","name":"الإحصائيات اليومية","leaves":["dstats","dstats/haram","dstats/nabawi","dstats/anHaram","dstats/anNabawi","dstats/anCmp","dstats/anTime"],"toggle":true,"plat":false},{"key":"emps","name":"موظفو الإدارة","leaves":["emps","emps/data"],"toggle":false,"plat":false},{"key":"custody","name":"عهد الموظفين","leaves":["emps/custody"],"toggle":true,"plat":false,"under":"emps"},{"key":"planning","name":"الخطة التشغيلية","leaves":["planning","planning/readiness"],"toggle":true,"plat":true},{"key":"staff","name":"الجدول الشهري","leaves":["staff"],"toggle":true,"plat":false,"under":"planning"},{"key":"plan","name":"التشغيل الميداني","leaves":["plan"],"toggle":true,"plat":false,"under":"planning"},{"key":"daily","name":"المتابعة اليومية","leaves":["daily","daily/kpiDaily","daily/kpiOcc","daily/kpiZones","daily/rounds","daily/field"],"toggle":true,"plat":true},{"key":"dreport","name":"التقرير اليومي","leaves":["dreport"],"toggle":true,"plat":false,"under":"daily"},{"key":"tasks","name":"المهام","leaves":["tasks"],"toggle":true,"plat":false,"under":"daily"},{"key":"irshad","name":"نظام الاسترشاد","leaves":["irshad","irshad/dash","irshad/records"],"toggle":true,"plat":true},{"key":"seized","name":"نظام المضبوطات","leaves":["seized","seized/dash","seized/records"],"toggle":true,"plat":true},{"key":"rasd","name":"نظام رصد الحالات","leaves":["rasd","rasd/dash","rasd/records"],"toggle":true,"plat":true,"optIn":true},{"key":"award","name":"جائزة التميز","leaves":["award","award/new","award/res","award/doc"],"toggle":true,"plat":true},{"key":"links","name":"مواقع ذات صلة","leaves":["links"],"toggle":true,"plat":false},{"key":"help","name":"المساعدة","leaves":["help"],"toggle":true,"plat":false}],"lenses":[{"key":"zones","name":"المصليات","hosts":["plan","daily/rounds"]},{"key":"paths","name":"المسارات","hosts":["plan","daily/rounds"]},{"key":"gates","name":"البوابات","hosts":["plan","daily/rounds"]},{"key":"marks","name":"العلامات","hosts":["plan","daily/rounds"]},{"key":"dist","name":"التوزيع","hosts":["plan","daily/rounds"]},{"key":"dens","name":"الكثافة","hosts":["plan","daily/rounds"]}]};
/* V7 · د5-هـ (44): المحرّكُ المشترك للأدوار — نصٌّ واحدٌ يُحقن حرفياً في الواجهة (345-perm44.js) والخادم (057b-perm44.js) بأداة tools/generate.py.
   دالّةٌ نقيّة: لا تقرأ مخزناً ولا جلسة — السجلُّ (R = KIVO_REGISTRY) والجدول (D = KIVO_PERM44_DATA) والسقفُ (دالّةٌ على المفتاح) تأتيها من المضيف. */
function perm44Make(R, D) {
  var LEAF_RE = /^([A-Za-z]+(?:\/[A-Za-z]+)?):(view|add|edit|del|approve|export)$/;
  var LV = {}, SY = {}, sysKeysC = {}, ix = { leaf: {}, hosts: {}, sys: {} }, i, j;
  for (i = 0; i < D.levels.length; i++) LV[D.levels[i].key] = D.levels[i];
  for (i = 0; i < D.systems.length; i++) SY[D.systems[i].key] = D.systems[i];
  /* V7 · د7 (أ): العدساتُ صفوفٌ في الدور بمفتاح مالكها في السجلّ (lens.<L>) ومستوياتِ الأنظمة نفسِها — LZ[lens.<L>] = { key, name, hosts } */
  var LZ = {}, LENS = Array.isArray(D.lenses) ? D.lenses : [];
  for (i = 0; i < LENS.length; i++) LZ['lens.' + LENS[i].key] = LENS[i];
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
    else if (e.ownerKind === 'lens') { ix.hosts[k] = leaves.length ? leaves : ((LZ[e.owner] && LZ[e.owner].hosts) || []).slice(); own = ix.hosts[k]; }   /* V7 · د7 (أ): مفتاحُ عدسةٍ بلا ذرّة (احتياطاً) = مضيفو العدسة من ملفّها — كما 057 enfIx */
    var ss = [];
    for (j = 0; j < own.length; j++) if (leafSys[own[j]] && ss.indexOf(leafSys[own[j]]) === -1) ss.push(leafSys[own[j]]);
    if (ss.length) ix.sys[k] = ss;
  }
  /* يُمنح بالدور؟ — قابلٌ للمنح (assignable) ولا بوابةَ عدسة (lens.<L>.enable: تفتحها عدساتُ الموظف لا المنح) */
  function grantable(k) { var e = R.byKey[k]; return !!e && e.status === 'active' && e.grant === 'assignable' && !/^lens\.[a-z]+\.enable$/.test(k); }
  function sysKeys(s) {
    if (sysKeysC[s]) return sysKeysC[s].slice();
    var out = [], n;
    /* V7 · د7 (أ): صفُّ العدسة = مفاتيحُها (مالكُها lens.<L>) · وصفُّ النظام المضيف كما كان (يحمل مفاتيحَ عدساته — فلا يتغيّر ما يمنحه دورٌ قائم) */
    for (n = 0; n < R.keys.length; n++) { var q = R.keys[n]; if (!grantable(q)) continue; if (LZ[s] ? R.byKey[q].owner === s : (ix.sys[q] && ix.sys[q].indexOf(s) !== -1)) out.push(q); }
    return (sysKeysC[s] = out).slice();
  }
  function levels() { return clone(D.levels); }
  function sysList() { return clone(D.systems); }
  /* V7 · د7 (أ): العدساتُ { key: lens.<L>, name, hosts, lens: L } — وsys: الأنظمةُ المضيفة (مالكو أوراق مضيفيها) */
  function lensList() { return LENS.map(function (x) { var ss = []; x.hosts.forEach(function (h) { if (leafSys[h] && ss.indexOf(leafSys[h]) === -1) ss.push(leafSys[h]); }); return { key: 'lens.' + x.key, name: x.name, hosts: x.hosts.slice(), lens: x.key, sys: ss }; }); }
  /* مستوى → مفاتيح (بترتيب السجلّ): view {access, view} · input +create · edit +edit · full كلُّ غير الحسّاس · sensitive الكلّ · custom القائمةُ ∩ مفاتيحُ النظام */
  function keysFor(s, lvl, custom) {
    if (!SY[s] && !LZ[s]) return [];
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
      for (n = 0; n < ks.length; n++) if (!ceilingFn || ceilingFn(ks[n])) {
        /* V7 · د7 (أ): صفُّ العدسة في الدور يحكم مفاتيحَها وحده — فلا يمنحها صفُّ مضيفها؛ وبلا صفٍّ لها تتبع مستوى المضيف كما كانت */
        var ow = R.byKey[ks[n]] && R.byKey[ks[n]].owner;
        if (!LZ[s] && LZ[ow] && isObj(role.sys[ow])) continue;
        map[ks[n]] = 1;
      }
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
  /* V7 · د6: الإغلاق — ما يسكن حاويةً مطفأة يُطفأ معها (under في جدول الأنظمة)، كما يفعل مفتاحُ الإدارة حين يُسقط صفحاتِ الحاوية معها.
     القاعدةُ الواحدة لإطفاء المنصة (mods.off) في الواجهة (331 platOff) والخادم (017 platOffOf) — موضعُها الوحيد هنا:
     للرجوع عنها (إن قرّر المالك أن الساكنَ لا يتبع حاويتَه على المنصة) تُعاد القائمةُ كما هي: return base; */
  function offClosure(list) {
    var base = (Array.isArray(list) ? list : []).slice(), out = base.slice(), grew = true, n;
    while (grew) { grew = false; for (n = 0; n < D.systems.length; n++) { var s = D.systems[n]; if (s.under && out.indexOf(s.under) !== -1 && out.indexOf(s.key) === -1) { out.push(s.key); grew = true; } } }
    return out;
  }
  /* V7 · د6 (قرار المالك ٤): ما يُطفأ مع تغييرٍ معلَّق — الأنظمةُ التي تسكن ما سيُطفأ (keys) ولم تُذكر فيه، من الإغلاق نفسِه؛ ليسمّيها «أثر الحفظ» قبل الحفظ
     (على المنصة وفي الوحدة). onFn (اختياري): يُبقي المفعَّلَ الآن وحده — فما كان مطفأً من قبل لا يُعدّ أثراً */
  function offWith(keys, onFn) {
    var base = Array.isArray(keys) ? keys : [];
    return offClosure(base).filter(function (k) { return base.indexOf(k) === -1 && (typeof onFn !== 'function' || !!onFn(k)); });
  }
  return { offClosure: offClosure, offWith: offWith, levels: levels, sysList: sysList, lensList: lensList, sysKeys: sysKeys, sysOfKey: function (k) { return (ix.sys[k] || []).slice(); }, grantable: grantable, keysFor: keysFor,
           keyOn: keyOn, sysOn: sysOn, roleById: roleById, compileRole: compileRole, effective: effective, grantOf: grantOf, normRec: normRec, shapeWhy: shapeWhy,
           diff: diff, undo: undo, names: clone(D.names), data: D };
}
/* V7 · د5-هـ (44): KIVO.Perm44 — واجهةُ المحرّك في المتصفح. القراءةُ والكتابة عبر المخزن الذي تستعمله 331/334 (localStorage المعترَض في 280 ⇒ ذاكرةُ
   الخادم و/api/save) — لا تخزينَ محلّياً لبيانات العمل. المسودة: كائنٌ تجمع فيه setRoles/setPerson السجلَّين (الأدوار + المنح المترجَم) ثم commit
   يكتبهما في اللحظة نفسِها فيذهبان في طلبٍ واحد يحكمه الخادمُ ذرّياً (054 protOp 'perm44'). وتُقبل مسودةُ العمليات (KIVO.__BS_SRV.operations.draft — set/get بالاسم). */
var E44 = null;
function eng() {
  if (E44) return E44;
  var R = (typeof KIVO_REGISTRY !== 'undefined' && KIVO_REGISTRY) || KIVO.KIVO_REGISTRY;
  if (!R || !R.byKey) throw new Error('perm44-registry');
  return (E44 = perm44Make(R, KIVO_PERM44_DATA));
}
var RES = 'bassam_roles_v1', GRANTS = 'bassam_grants_v1';
function kOf(d, name) { return 'bsdept:' + d + ':' + name; }
function rd(k) { try { var v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } }
function obj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
function P() { return KIVO.BassamPerm || {}; }
/* محرّكُ السقف والترجمة في 331 (BassamPerm.p24: ceil · leafOn · effective) */
function P24() { var Pm = P(); return Pm.p24 || {}; }
function curUser() { try { return KIVO.BassamAuth && KIVO.BassamAuth.user ? KIVO.BassamAuth.user() : null; } catch (e) { return null; } }
function isSup() { var u = curUser(); return !!(u && u.role === 'super'); }
/* السقفُ بالوراثة: سقفُ الوحدة ∩ سقفُ كلِّ سلف ∩ المطفأُ من المنصة (p24Ceil يُسقطه) — = perm44Ceiling في الخادم */
function chainOf(d) {
  var out = [d];
  try { var D = KIVO.BassamDepts; (D && D.ancestorsOf ? D.ancestorsOf(d) || [] : []).forEach(function (a) { if (a && out.indexOf(a) === -1) out.push(a); }); } catch (e) { /* بلا أسلاف معروفة: سقفُ الوحدة وحده */ }
  return out;
}
function ceiling(did) {
  var d = did || (KIVO.BassamDepts && KIVO.BassamDepts.active ? KIVO.BassamDepts.active() : ''), Pm = P24(), E = eng();
  if (!Pm.ceil || !Pm.leafOn) return { on: E.sysList().map(function (s) { return s.key; }), key: function () { return true; } };
  var Cs = chainOf(d).map(function (x) { return Pm.ceil(x); });
  var leafOn = function (leaf) { for (var i = 0; i < Cs.length; i++) if (!Pm.leafOn(Cs[i], leaf)) return false; return true; };
  var lensOn = function (L) { for (var i = 0; i < Cs.length; i++) if (!Cs[i].lens(L)) return false; return true; };
  var memo = {}, key = function (k) { if (memo[k] === undefined) memo[k] = E.keyOn(k, leafOn, lensOn); return memo[k]; };
  return { on: E.sysList().filter(function (s) { return E.sysOn(s.key, leafOn); }).map(function (s) { return s.key; }), key: key };
}
function rolesOf(did) { return eng().normRec(rd(kOf(did, RES))); }
/* المسودة: { did, set: {مفتاح: قيمة} } — أو مسودةُ العمليات */
function draft(did) { return { did: String(did), set: {} }; }
function dget(dr, d, name) {
  if (dr && typeof dr.get === 'function') return dr.get(name);
  var k = kOf(d, name); return dr && dr.set && Object.prototype.hasOwnProperty.call(dr.set, k) ? JSON.parse(JSON.stringify(dr.set[k])) : rd(k);
}
function dset(dr, d, name, v) {
  if (dr && typeof dr.set === 'function') return dr.set(name, v);
  if (!dr || !dr.set || String(dr.did) !== String(d)) throw new Error('perm44-draft-unit');
  dr.set[kOf(d, name)] = v;
}
/* T: ما تترجمه ورقتُه القديمة (أو وراثةُ المدير) — يُسقط في minus فيصير الفعليُّ في الإنفاذ = الدورَ وحده؛ والورقةُ القديمة لا تُمسّ */
function legacyT(ekey, d) {
  try { var Pm = P(), Q = P24(); if (!Q.effective) return null; var inh = !!(Pm.hasOwnSheet && !Pm.hasOwnSheet(ekey, d) && String(ekey).slice(0, 4) === 'mgr:'); var x = Q.effective({ ekey: ekey, did: d, inherit: inh }); return x && x.T ? x.T : null; } catch (e) { return null; }
}
function recompile(dr, d, rec, ekeys) {
  var E = eng(), C = ceiling(d).key, g = dget(dr, d, GRANTS), u = curUser(), now = Date.now();
  g = obj(g) && obj(g.emp) ? g : { v: 1, emp: {} };
  ekeys.forEach(function (e) {
    var pr = rec.people[e], old = g.emp[e], nx = pr ? E.grantOf(pr, rec, C, now, legacyT(e, d)) : null;
    if (!nx) { if (old && /^(role:|p44:)/.test(String(old.src || ''))) delete g.emp[e]; return; }
    var same = old && JSON.stringify((old.plus || []).slice().sort()) === JSON.stringify(nx.plus.slice().sort()) && JSON.stringify((old.minus || []).slice().sort()) === JSON.stringify(nx.minus.slice().sort()) && old.src === nx.src && JSON.stringify(old.until || null) === JSON.stringify(nx.until || null);
    if (!same) { nx.at = now; nx.by = u ? String(u.id) : ''; g.emp[e] = nx; }
  });
  dset(dr, d, GRANTS, g);
}
/* setRoles: الأدوارُ (قائمة) أو السجلُّ كلُّه {roles, people} — ثم يُترجَم منحُ كلِّ من مسّه الفرق */
function setRoles(dr, did, roles) {
  var E = eng(), d = String(did), before = E.normRec(dget(dr, d, RES)), rec = E.normRec(before);
  if (Array.isArray(roles)) rec.roles = JSON.parse(JSON.stringify(roles)); else if (obj(roles)) rec = E.normRec(roles);
  var w = E.shapeWhy(rec); if (w) return { ok: false, err: w };
  dset(dr, d, RES, rec);
  recompile(dr, d, rec, E.diff(before, rec).affected);
  return { ok: true, rec: rec };
}
/* setPerson: سجلُّ شخصٍ واحد {role, ex} (null = بلا دور ولا استثناء) */
function setPerson(dr, did, ekey, prec) {
  var E = eng(), d = String(did), rec = E.normRec(dget(dr, d, RES)), e = String(ekey);
  if (prec == null) delete rec.people[e]; else rec.people[e] = { role: prec.role == null ? null : String(prec.role), ex: Array.isArray(prec.ex) ? JSON.parse(JSON.stringify(prec.ex)) : [] };
  var w = E.shapeWhy(rec); if (w) return { ok: false, err: w };
  dset(dr, d, RES, rec);
  recompile(dr, d, rec, [e]);
  return { ok: true, rec: rec };
}
/* commit: يكتب مفاتيحَ المسودة في اللحظة نفسِها (طلبٌ واحد) ثم ينتظر حسمَه — {ok, keys, denied?}.
   الرفضُ يعيد 280 فيه القيمةَ المحفوظة: فما لم يبقَ كما كُتب بعد الحسم مرفوض (denied) — لا نجاحَ كاذب */
function commit(dr) {
  if (!dr || !obj(dr.set)) return Promise.resolve({ ok: false, err: 'draft' });
  var ks = Object.keys(dr.set), want = {}, S = KIVO.__BS_SRV, d0 = {};
  ks.forEach(function (k) { d0[k] = S && S.denied ? S.denied(k) : 0; });
  try { ks.forEach(function (k) { want[k] = JSON.stringify(dr.set[k]); localStorage.setItem(k, want[k]); }); } catch (e) { return Promise.resolve({ ok: false, err: String(e && e.message || e) }); }
  return Promise.resolve(S && S.flushAsync ? S.flushAsync(15000) : true).then(function (sent) {
    var denied = ks.filter(function (k) { var v = null; try { v = localStorage.getItem(k); } catch (e) { v = null; } return v !== want[k] || (S && S.denied ? S.denied(k) : 0) > d0[k]; });
    if (denied.length) return { ok: false, keys: ks, denied: denied, err: 'denied' };
    return sent === false ? { ok: false, keys: ks, err: 'unsent' } : { ok: true, keys: ks };
  });
}
/* V7 · د5-هـ (44): مساعدان للمستهلكين (الجدول الشهري · التقرير اليومي · الخطة · المهام · صفحتي · BassamSup):
   roleOf — كائنُ دور الشخص في وحدته أو null · assign — إسنادُ أدوارٍ لأشخاص {ekey: roleId|null} بمسودةٍ واحدة تُثبَّت مرةً (الأدوار + المنحُ المترجَم) */
/* V7 · د5-ح: «مديرُ الوحدة» قاعدةٌ واحدة — تقرؤها صفحةُ الإعدادات (تبويبُ «الصلاحيات») والرأسُ الثابت (KIVO.PageStates) فلا يختلفان */
function mgrOf(u, did) {
  if (!u || !did) return false;
  if (u.role === 'super') return true;
  var D = KIVO.BassamDepts, par = '', anc = [];
  try { par = (D && D.parentDeptOf ? D.parentDeptOf(did) : '') || ''; } catch (e) { par = ''; }
  var mine = !!u.deptId && (u.deptId === did || par === u.deptId);
  if (u.role === 'dept') return mine;
  if (u.role === 'staff') return !!u.mgr && mine;
  if (u.role === 'gm') { try { anc = (D && D.ancestorsOf ? D.ancestorsOf(did) : []) || []; } catch (e) { anc = []; } return !!u.gid && anc.indexOf(u.gid) !== -1; }
  return false;
}
function activeDept() { try { return KIVO.BassamDepts && KIVO.BassamDepts.active ? KIVO.BassamDepts.active() || '' : ''; } catch (e) { return ''; } }
function roleOf(ekey, did) {
  var d = did || activeDept(); if (!ekey || !d) return null;
  var rec = rolesOf(d), pr = rec.people[String(ekey)];
  return pr ? eng().roleById(rec, pr.role) : null;
}
function assign(did, map) {
  var d = String(did || activeDept()), dr = draft(d), rec = rolesOf(d), n = 0, e, r;
  if (!d || !obj(map)) return Promise.resolve({ ok: false, err: 'args' });
  for (e in map) {
    var id = map[e] == null || map[e] === '' ? null : String(map[e]), pr = rec.people[e];
    if (id && !eng().roleById(rec, id)) return Promise.resolve({ ok: false, err: 'no-role' });
    if ((pr ? pr.role || null : null) === id) continue;
    var ex = pr && Array.isArray(pr.ex) ? pr.ex : [];
    r = setPerson(dr, d, e, id || ex.length ? { role: id, ex: ex } : null);   /* بلا دور ولا استثناء: يُحذف سجلُّه */
    if (!r.ok) return Promise.resolve(r);
    n++;
  }
  if (!n) return Promise.resolve({ ok: true, n: 0, keys: [] });
  return commit(dr).then(function (x) { x.n = n; return x; });
}
/* اسمُ الصلاحية في كل مكان = اسمُ الدور الممنوح · «صلاحيات مخصّصة» لمن له منحٌ أو ورقةٌ بلا دور · «بلا صلاحيات» */
function roleNameOf(ekey, did) {
  var E = eng(), N = E.names, d = did || (KIVO.BassamDepts && KIVO.BassamDepts.active ? KIVO.BassamDepts.active() : ''), e = String(ekey || '');
  if (!e || !d) return N.none;
  var rec = rolesOf(d), pr = rec.people[e], role = pr ? E.roleById(rec, pr.role) : null;
  if (role) return String(role.name || '');
  try {
    var g = rd(kOf(d, GRANTS)), ge = g && obj(g.emp) ? g.emp[e] : null; if (ge && Array.isArray(ge.plus) && ge.plus.length) return N.custom;
    if (pr && Array.isArray(pr.ex) && pr.ex.length) return N.custom;
    var Pm = P();
    if (Pm.hasOwnSheet && Pm.hasOwnSheet(e, d)) { var sh = Pm.empPerms ? Pm.empPerms(e, d) : {}; for (var k in sh) if (sh[k] && sh[k].length) return N.custom; return N.none; }
    if (e.slice(0, 4) === 'mgr:') return N.custom;   /* مديرٌ يرث سقفَ وحدته بلا دور */
  } catch (e0) { /* تعذّرت القراءة: بلا صلاحيات */ }
  return N.none;
}
var API = {
  levels: function () { return eng().levels(); },
  keysFor: function (s, l, c) { return eng().keysFor(s, l, c); },
  compileRole: function (r, f) { return eng().compileRole(r, f); },
  effective: function (rec, roles, f, now) { return eng().effective(rec, roles, f, now); },
  grantOf: function (rec, roles, f, now, T) { return eng().grantOf(rec, roles, f, now, T); },
  roleNameOf: roleNameOf,
  diff: function (a, b) { return eng().diff(a, b); },
  undo: function (cur, ch) { return eng().undo(cur, ch); },
  sysList: function () { return eng().sysList(); },
  lensList: function () { return eng().lensList(); },   /* V7 · د7 (أ): صفوفُ العدسات في محرّر الأدوار */
  offClosure: function (list) { return eng().offClosure(list); },
  offWith: function (keys, onFn) { return eng().offWith(keys, onFn); },   /* V7 · د6: ما يُطفأ مع تغييرٍ معلَّق (لـ«أثر الحفظ») */   /* V7 · د6: إغلاقُ المطفأ على المنصة (المحرّكُ المشترك) */
  sysKeys: function (s) { return eng().sysKeys(s); },
  sysOfKey: function (k) { return eng().sysOfKey(k); },
  ceiling: ceiling,
  rolesOf: rolesOf,
  roleOf: roleOf,
  assign: assign,
  draft: draft,
  setPerson: setPerson,
  setRoles: setRoles,
  commit: commit,
  isSuper: isSup,
  mgrOf: mgrOf, unitMgr: function () { return mgrOf(curUser(), activeDept()); },
  names: function () { return JSON.parse(JSON.stringify(eng().names)); },
  RES: RES
};
KIVO.Perm44 = Object.freeze(API);
})();
