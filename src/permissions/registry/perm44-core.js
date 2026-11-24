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
    else if (e.ownerKind === 'lens') { ix.hosts[k] = leaves.length ? leaves : ((LZ[e.owner] && LZ[e.owner].hosts) || []).slice(); own = ix.hosts[k]; }   /* V7 · د7 (أ): بلا ذرّة = مضيفو العدسة (= 057 enfIx) — كان [] فلا سقفَ لمفتاح العدسة */
    var ss = [];
    for (j = 0; j < own.length; j++) if (leafSys[own[j]] && ss.indexOf(leafSys[own[j]]) === -1) ss.push(leafSys[own[j]]);
    if (ss.length) ix.sys[k] = ss;
  }
  /* يُمنح بالدور؟ — قابلٌ للمنح (assignable) ولا بوابةَ عدسة (lens.<L>.enable: تفتحها عدساتُ الموظف لا المنح) */
  function grantable(k) { var e = R.byKey[k]; return !!e && e.status === 'active' && e.grant === 'assignable' && !/^lens\.[a-z]+\.enable$/.test(k); }
  function sysKeys(s) {
    if (sysKeysC[s]) return sysKeysC[s].slice();
    var out = [], n;
    /* V7 · د7 (أ): صفُّ العدسة = مفاتيحُها (مالكُها lens.<L>) · وصفُّ النظام المضيف بلا مفاتيح العدسات — فلا يتغيّر ما يمنحه دورٌ قائم */
    for (n = 0; n < R.keys.length; n++) { var q = R.keys[n]; if (!grantable(q)) continue; if (LZ[s] ? R.byKey[q].owner === s : (ix.sys[q] && ix.sys[q].indexOf(s) !== -1 && !LZ[R.byKey[q].owner])) out.push(q); }
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
  /* V7 · د7 (52 · الكامن): القاعدةُ الواحدة لمنحٍ يُعاد بناؤه من الدور — ما في مدخله المخزَّن (old) من مفاتيح plus/minus خارج السقف (keyOn كاذبة)
     يُحمل معه كما هو (فلا يرفضه حارسُ الكامن 021 latentLossWhy · capStaleBatch، ولا يُضاف مفتاحٌ جديد خارج السقف فلا يرفضه سقفُ المنح 059).
     قرارُ المالك (REPLY_52 §1 — الدورُ الحالي هو المرجع): full = فعليُّ الدور الحالي بلا قصّ (effective بلا دالّة سقف)؛ إن كان old مشتقاً من دور فما حُمل
     في plus خارج السقف ولا يمنحه الدورُ الحالي يُضاف إلى minus (يُحجب — التضييقُ مقبولٌ في كل الحرّاس)، فلا تعود مفاتيحُ دورٍ سابق متى وُسِّع السقف.
     المنحُ الصريح (old بلا src دور) لا يُحجب منه شيء. يكتب به العميلُ (345 recompile) ويحكم الخادمُ على plus بالقاعدة نفسِها (057b perm44GrantsWhy). */
  function derived(g) { return isObj(g) && /^(role:|p44:)/.test(String(g.src || '')); }
  function keepOff(nx, old, keyOn, full) {
    if (!isObj(nx) || !isObj(old)) return nx;
    var g = clone(nx), f, n, k, F = isObj(full) && Array.isArray(full.keys) ? full.keys : null;
    for (f in { plus: 1, minus: 1 }) {
      var a = Array.isArray(g[f]) ? g[f] : (g[f] = []), o = Array.isArray(old[f]) ? old[f] : [];
      for (n = 0; n < o.length; n++) { k = String(o[n]); if (!keyOn(k) && a.indexOf(k) === -1) a.push(k); }
    }
    if (F && /^(role:|p44:)/.test(String(old.src || ''))) for (n = 0; n < g.plus.length; n++) { k = String(g.plus[n]); if (!keyOn(k) && F.indexOf(k) === -1 && g.minus.indexOf(k) === -1) g.minus.push(k); }
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
           keyOn: keyOn, sysOn: sysOn, roleById: roleById, compileRole: compileRole, effective: effective, grantOf: grantOf, keepOff: keepOff, derived: derived, normRec: normRec, shapeWhy: shapeWhy,
           diff: diff, undo: undo, names: clone(D.names), data: D };
}
