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
    var pr = rec.people[e], old = g.emp[e], nx = pr ? E.keepOff(E.grantOf(pr, rec, C, now, legacyT(e, d)), old, C, E.effective(pr, rec, null, now)) : null;   /* V7 · د7 (52 · الكامن): المخفيُّ يُحمل، وما لا يمنحه الدورُ الحالي منه يُحجب (perm44-core keepOff) */
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
  /* V7 · د7 (52 · الجرد ٧): ما في السجلّ المخزَّن من حقلٍ أعلى لا يحمله ما أرسله المحرّر يُحمل كما هو */
  for (var f in before) if (Object.prototype.hasOwnProperty.call(before, f) && !Object.prototype.hasOwnProperty.call(rec, f)) rec[f] = before[f];
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
/* V7 · د7 (52 · الكامن — الخطوة الثانية بعد توسيع السقف): بعد أن يؤكّد الخادمُ حفظَ سقفٍ وُسِّع (المنادي: شاشةُ الوحدات بعد _p44CapSave / الحفظِ الجماعي)
   يُعاد حسابُ كلِّ منحٍ مشتقٍّ من دور (src role:/p44:) في الوحدات المعطاة وفروعها بالسقف الجديد — recompile/keepOff نفسُهما — فما في الدور الحالي ممّا كان
   خارج السقف يُكتب الآن وهو داخله، فيقبله الخادمُ بحرّاسه كما هي (السقف · الكامن · perm44GrantsWhy). المنحُ الصريح لا يُمسّ. مسودةٌ لكل وحدة تُثبَّت مرة؛
   ما لم يتغيّر لا يُرسل. ⇒ Promise {ok, n, failed: [{d, err}]} — والمنادي يُعلم الحافظَ بأي فشل */
function refreshUnits(units) {
  var E = eng(), D = KIVO.BassamDepts, ids = [], add = function (x) { x = typeof x === 'string' ? x : x && x.id; if (x && ids.indexOf(String(x)) === -1) ids.push(String(x)); };
  (Array.isArray(units) ? units : []).forEach(function (u) {
    if (u === '__plat') { try { (D && D.list ? D.list() : []).forEach(add); } catch (e) { /* بلا سجلّ وحدات: لا شيء */ } return; }
    add(u); try { (D && D.descendantsOf ? D.descendantsOf(u) || [] : []).forEach(add); } catch (e) { /* بلا فروع معروفة */ }
  });
  var n = 0, failed = [];
  return ids.reduce(function (p, d) {
    return p.then(function () {
      var rec = rolesOf(d), g = rd(kOf(d, GRANTS)), emp = obj(g) && obj(g.emp) ? g.emp : {};
      var ek = Object.keys(rec.people).filter(function (e) { return E.derived(emp[e]); });
      if (!ek.length) return null;
      var dr = draft(d); recompile(dr, d, rec, ek);
      if (JSON.stringify(dr.set[kOf(d, GRANTS)]) === JSON.stringify(g)) return null;
      return commit(dr).then(function (x) { if (x && x.ok) n++; else failed.push({ d: d, err: (x && x.err) || 'denied' }); }, function (e) { failed.push({ d: d, err: String(e && e.message || e) }); });
    });
  }, Promise.resolve()).then(function () { return { ok: !failed.length, n: n, failed: failed }; });
}
/* V7 · د7 (52 · الكامن): نصُّ رفض الحارس (021 latentLossWhy: «latent: grant|sheet|lens <ekey> <مفتاح> | …») بلغة المدير — اسمُ الموظف واسمُ النظام */
function latentText(detail, did) {
  var m = /^latent: (grant|sheet|lens) (\S+) (\S+) \|/.exec(String(detail || '')); if (!m) return '';
  var E = eng(), d = did || activeDept(), ek = m[2], x = m[3], who = '', sys = '';
  try { (rd(kOf(d, 'bassam_employees_v1')) || []).forEach(function (r) { if (r && String(r.eid) === ek && r.name) who = String(r.name); }); } catch (e) { who = ''; }
  if (!who) try { (rd('bassam_auth_users_v1') || []).forEach(function (u) { if (u && String(u.ekey || '') === ek && u.name) who = String(u.name); }); } catch (e) { who = ''; }
  var S = E.sysList(), nm = function (k) { for (var i = 0; i < S.length; i++) if (S[i].key === k) return S[i].name; return ''; };
  if (m[1] === 'grant') sys = E.sysOfKey(x).map(nm).filter(Boolean).join(' · ');
  else if (m[1] === 'lens') E.lensList().forEach(function (L) { if (L.lens === x) sys = L.name; });
  else S.forEach(function (s) { if (!sys && s.leaves.indexOf(x) !== -1) sys = s.name; });
  return 'لم يُحفظ شيء: الحفظُ كان سيحذف صلاحيةَ «' + (who || 'موظف') + '» في «' + (sys || 'نظامٍ مطفأ') + '» — النظامُ مطفأٌ في سقف الوحدة فصلاحيتُه فيه مخفيّة، وتعود كما كانت متى أُعيد تشغيلُه. أعد تحميل الصفحة ثم كرّر التعديل';
}
var API = {
  latentText: latentText,
  refreshUnits: refreshUnits,
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
  sysFlags: function (s) { return eng().sysFlags(s); },   /* V7 · 53: أعلامُ التصدير — أفعالُ «مخصّص» */
  flagsFor: function (s, lvl, custom) { return eng().flagsFor(s, lvl, custom); },
  flagsOf: function (rec, roles, leafOn) { return eng().flagsOf(rec, roles, leafOn); },
  flagLeaf: function (f) { return eng().flagLeaf(f); },
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
  narrowSheets: function (cur, inc, J) { return eng().narrowSheets(cur, inc, J); },   /* V7 · 53 (ملحق 5): معاينةُ تضييق أوراق الموظفين في استيراد نسخة الإدارة (548) */
  RES: RES
};
KIVO.Perm44 = Object.freeze(API);
