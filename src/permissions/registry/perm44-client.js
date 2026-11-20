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
function curUser() { try { return KIVO.BassamAuth && KIVO.BassamAuth.user ? KIVO.BassamAuth.user() : null; } catch (e) { return null; } }
function isSup() { var u = curUser(); return !!(u && u.role === 'super'); }
/* السقفُ بالوراثة: سقفُ الوحدة ∩ سقفُ كلِّ سلف ∩ المطفأُ من المنصة (p24Ceil يُسقطه) — = perm44Ceiling في الخادم */
function chainOf(d) {
  var out = [d];
  try { var D = KIVO.BassamDepts; (D && D.ancestorsOf ? D.ancestorsOf(d) || [] : []).forEach(function (a) { if (a && out.indexOf(a) === -1) out.push(a); }); } catch (e) { /* بلا أسلاف معروفة: سقفُ الوحدة وحده */ }
  return out;
}
function ceiling(did) {
  var d = did || (KIVO.BassamDepts && KIVO.BassamDepts.active ? KIVO.BassamDepts.active() : ''), Pm = P(), E = eng();
  if (!Pm.p24Ceil || !Pm.p24LeafOn) return { on: E.sysList().map(function (s) { return s.key; }), key: function () { return true; } };
  var Cs = chainOf(d).map(function (x) { return Pm.p24Ceil(x); });
  var leafOn = function (leaf) { for (var i = 0; i < Cs.length; i++) if (!Pm.p24LeafOn(Cs[i], leaf)) return false; return true; };
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
  try { var Pm = P(); if (!Pm.p24Effective) return null; var inh = !!(Pm.hasOwnSheet && !Pm.hasOwnSheet(ekey, d) && String(ekey).slice(0, 4) === 'mgr:'); var x = Pm.p24Effective({ ekey: ekey, did: d, inherit: inh }); return x && x.T ? x.T : null; } catch (e) { return null; }
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
/* commit: يكتب مفاتيحَ المسودة في اللحظة نفسِها (طلبٌ واحد) ثم ينتظر حسمَه — {ok, denied?} */
function commit(dr) {
  if (!dr || !obj(dr.set)) return Promise.resolve({ ok: false, err: 'draft' });
  var ks = Object.keys(dr.set);
  try { ks.forEach(function (k) { localStorage.setItem(k, JSON.stringify(dr.set[k])); }); } catch (e) { return Promise.resolve({ ok: false, err: String(e && e.message || e) }); }
  var S = KIVO.__BS_SRV; return S && S.flushAsync ? Promise.resolve(S.flushAsync()).then(function () { return { ok: true, keys: ks }; }) : Promise.resolve({ ok: true, keys: ks });
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
    if (Pm.empTpl && Pm.empTpl(e, d)) return N.custom;
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
  sysKeys: function (s) { return eng().sysKeys(s); },
  ceiling: ceiling,
  rolesOf: rolesOf,
  draft: draft,
  setPerson: setPerson,
  setRoles: setRoles,
  commit: commit,
  isSuper: isSup,
  names: function () { return JSON.parse(JSON.stringify(eng().names)); },
  RES: RES
};
KIVO.Perm44 = Object.freeze(API);
