/* ══════════════════════════════════════════════════════════════════════════
   ║  نواة التفويض — مصدر الحقيقة الوحيد على الخادم                        ║
   ══════════════════════════════════════════════════════════════════════════
   السلسلة الكاملة لكل قرار:
     الفاعل ← جلسة صالحة ← حساب قائم ← نطاق الإدارة ← سقف الدور ← سقف الإدارة
     ← الورقة بالضبط ← سياسة المورد ← القيد الحقلي إن وُجد ← الفعل المطلوب
   الدور سقفٌ لا تفويض: لا يُسأل عن الدور وحده في أيّ قرار.
   ومورد لا سياسة له = رفض. لا قاعدة «من يكتب في مكانٍ ما يكتب هنا».

   نموذج الصلاحيات منقولٌ من الواجهة حرفاً بحرف (PAGE_REG · deptCap · effCap ·
   deptSubs/deptTabs · capAllPerms · expandPerms · derivePages · hasOwnSheet ·
   myPerms) فلا يفترق حكمُ الخادم عن حكم الشاشة في حالةٍ واحدة.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── سجل الصفحات: مرآة PAGE_REG في الواجهة (البنية وحدها، بلا أسماء العرض) ── */
var PG_REG = [
  { key: 'dstats', subs: ['haram', 'nabawi'], tabs: ['anHaram', 'anNabawi', 'anCmp', 'anTime'], off: ['anHaram', 'anNabawi', 'anCmp', 'anTime'] },
  { key: 'emps', subs: ['data', 'custody'] },
  { key: 'planning', subs: ['readiness'], off: ['readiness'] },
  { key: 'staff', under: 'planning' },
  { key: 'plan', under: 'planning' },
  { key: 'daily', tabs: ['kpiDaily', 'kpiOcc', 'kpiZones', 'rounds', 'field'], off: ['kpiDaily', 'kpiOcc', 'kpiZones', 'field'] },
  { key: 'dreport', under: 'daily' },
  { key: 'tasks', under: 'daily' },
  { key: 'irshad', subs: ['dash', 'records'], off: ['dash'] },
  { key: 'seized', subs: ['dash', 'records'], off: ['dash'] },
  { key: 'award', subs: ['new', 'res', 'doc'] },
  { key: 'links' },
  { key: 'help' },
  { key: 'admin', subs: ['backup', 'oplog', 'shifts', 'ptpls', 'import'] }
];
var PG_OF = {}, PG_KEYS = [];
PG_REG.forEach(function (p) { PG_OF[p.key] = p; PG_KEYS.push(p.key); });
var ACTS_ALL = ['view', 'add', 'edit', 'del', 'approve', 'export'];
function pgIsContainer(pk) { var p = PG_OF[pk]; return !!(p && ((p.subs && p.subs.length) || (p.tabs && p.tabs.length))); }
function pgLeaves(pk) {
  var p = PG_OF[pk]; if (!p) return [];
  return (p.subs || []).concat(p.tabs || []).map(function (x) { return pk + '/' + x; });
}
function pgSplit(k) { var i = String(k).indexOf('/'); return i === -1 ? { page: k, sub: '' } : { page: k.slice(0, i), sub: k.slice(i + 1) }; }
function pgOffPage(pk, sk) { var p = PG_OF[pk]; return !!(p && p.off && p.off.indexOf(sk) !== -1); }

/* ── سقف الإدارة: نفس effCap/capSetAnywhere في الواجهة، بتقاطع الأسلاف ── */
function rawCapOf(A, d) { var c = (A.perms.caps || {})[d]; return Array.isArray(c) ? c.filter(function (k) { return PG_KEYS.indexOf(k) !== -1; }) : null; }
function hasCapOf(A, d) { return rawCapOf(A, d) !== null; }
/* Independent unit ceilings (caps-own): a unit whose own-mode flag is set (bassam_perms_v1.capOwn[d] === true — written by the system
   administrator through the normal protected save; or capMode 'own' for every unit) reads its ceiling from its own record alone,
   without the ancestors' intersection. Without a record of its own it keeps the old reading (never wider than before). */
function capOwnOf(A, d) { var P = A.perms || {}; return P.capMode === 'own' || (isObj(P.capOwn) && P.capOwn[d] === true); }
/* the mode is the system administrator's: a value other than 'own' / true, or dropping a stored mode (an older client rebuilds the
   registry without it), is refused for every role — a narrowing never silently returns to the old reading */
function capOwnWhy(nv, cv) {
  var n = parseJson(nv, null), o = cv == null ? null : parseJson(cv, null), a = isObj(o) ? o.capOwn : undefined, b = isObj(n) ? n.capOwn : undefined;
  if (b !== undefined && !(isObj(b) && Object.keys(b).every(function (k) { return b[k] === true; }))) return 'capmode';
  if (isObj(a) && Object.keys(a).length && b === undefined) return 'capmode';
  var m = isObj(n) ? n.capMode : undefined;
  return (m !== undefined && m !== 'own') || (isObj(o) && o.capMode === 'own' && m !== 'own') ? 'capmode' : '';
}
/* caps-own · stale clients: a page built before read-time narrowing narrows a ceiling AND, in the same save, deletes what the narrowing put
   outside it (trimEmps · pruneEmpLeaves · the empLens filter · p24TrimGrants). The current client writes the ceiling alone, so a request
   that removes an item which was inside the ceiling before this save and is outside it after (a leaf or action of a sheet that stays, a lens
   of a list that stays, a plus/minus key of an explicit grant) is that old page: the whole request is refused and nothing is written (054).
   Deliberate removals are untouched: anything inside the new ceiling, anything already outside the old one, a whole sheet or lens list. */
var CAP_STALE_MSG = 'هذه الصفحة نسخةٌ أقدم من النظام — لم يُحفظ شيء. أعد تحميل الصفحة ثم كرّر التعديل';
function capLeafKnown(k) { var sp = pgSplit(k); return sp.sub ? pgLeaves(sp.page).indexOf(k) !== -1 : !!PG_OF[k] && !pgIsContainer(k); }
function capStaleBatch(A, todo, evald) {
  var i, k, O = A.perms || {}, N = O, G = [], at = function (P) { var B = {}, q; for (q in A) if (q.slice(0, 2) !== '__') B[q] = A[q]; B.perms = P; B.off = []; return B; };
  for (i = 0; i < todo.length; i++) {
    if (!evald[i] || todo[i].act !== 'set') continue;
    if (todo[i].k === K_PERM) { if (evald[i].conflict) return false; O = parseJson(evald[i].cur, {}); N = parseJson(todo[i].v, null); if (!isObj(O)) O = {}; if (!isObj(N)) return false; }
    else if (resName(todo[i].k) === ENF_GRANTS_RES && parseKey(todo[i].k).dept) G.push(i);
  }
  if (O === N) return false;
  var Bo = at(O), Bn = at(N), gone = function (d, f, x) { return !f(Bn, d, x) && f(Bo, d, x); };
  var lens = function (B, d, L) { var dl = (B.perms.lenses || {})[d]; return !Array.isArray(dl) || dl.indexOf(L) !== -1; };
  for (var d in (O.emps || {})) for (var ek in O.emps[d]) {
    var s0 = O.emps[d][ek], s1 = ((N.emps || {})[d] || {})[ek];
    if (isObj(s0) && isObj(s1)) for (k in s0) if (capLeafKnown(k) && Array.isArray(s0[k]) && s0[k].some(function (a) { return !(Array.isArray(s1[k]) && s1[k].indexOf(a) !== -1); }) && gone(d, capOnDept, k)) return true;
  }
  for (d in (O.empLens || {})) for (ek in O.empLens[d]) {
    var l0 = O.empLens[d][ek], l1 = ((N.empLens || {})[d] || {})[ek];
    if (Array.isArray(l0) && Array.isArray(l1)) for (k = 0; k < l0.length; k++) if (l1.indexOf(l0[k]) === -1 && gone(d, lens, l0[k])) return true;
  }
  for (i = 0; i < G.length; i++) {
    var g0 = parseJson(evald[G[i]].cur, {}), g1 = parseJson(todo[G[i]].v, {}); d = parseKey(todo[G[i]].k).dept;
    g0 = isObj(g0) && isObj(g0.emp) ? g0.emp : {}; g1 = isObj(g1) && isObj(g1.emp) ? g1.emp : {};
    for (ek in g0) for (var f in { plus: 1, minus: 1 }) {
      var a0 = isObj(g0[ek]) && Array.isArray(g0[ek][f]) ? g0[ek][f] : [], a1 = isObj(g1[ek]) && Array.isArray(g1[ek][f]) ? g1[ek][f] : [];
      for (k = 0; k < a0.length; k++) if (a1.indexOf(a0[k]) === -1 && gone(d, enfKeyOnCeiling, String(a0[k]))) return true;
    }
  }
  return false;
}
function effCapOf(A, d) {
  if (hasCapOf(A, d) && capOwnOf(A, d)) return rawCapOf(A, d);
  var own = rawCapOf(A, d) || [], anc = ancChain(A, d).filter(function (a) { return hasCapOf(A, a); });
  var out = own;
  for (var i = 0; i < anc.length; i++) {
    var c = rawCapOf(A, anc[i]) || [];
    out = out.filter(function (k) { return c.indexOf(k) !== -1; });
    if (!out.length) break;
  }
  return out;
}
function capSetAnywhereOf(A, d) { return hasCapOf(A, d) || ancChain(A, d).some(function (a) { return hasCapOf(A, a); }); }
/* غياب السجل في الإدارة وأسلافها = السقف مفتوح — نصُّ شاشة الصلاحيات نفسه.
   والوحدة المطفأة على مستوى المنصة تسقط من السقف مهما كان الدور. */
function deptCapOf(A, d) {
  var c = capSetAnywhereOf(A, d) ? effCapOf(A, d) : PG_KEYS.slice();
  if (A.off && A.off.length) c = c.filter(function (k) { return A.off.indexOf(k) === -1; });
  return c;
}
function deptSubsOf(A, d, pk) {
  var all = (PG_OF[pk] && PG_OF[pk].subs) || []; if (!all.length) return [];
  var L = ((A.perms.subs || {})[d] || {})[pk];
  return Array.isArray(L) ? L.filter(function (k) { return all.indexOf(k) !== -1; }) : all.slice();
}
function deptTabsOf(A, d, pk) {
  var all = (PG_OF[pk] && PG_OF[pk].tabs) || []; if (!all.length) return [];
  var L = ((A.perms.subs || {})[d] || {})[pk + ':tabs'];
  return Array.isArray(L) ? L.filter(function (k) { return all.indexOf(k) !== -1; }) : all.slice();
}
/* onCap في الواجهة: هل هذه القدرة مفعّلة لهذه الإدارة أصلاً؟ */
function capOnDept(A, d, key) {
  key = String(key || ''); if (!key) return true;
  var i = key.indexOf('/');
  if (i > 0) {
    var pk = key.slice(0, i), sk = key.slice(i + 1);
    if (!capOnDept(A, d, pk)) return false;
    var q = PG_OF[sk];
    if (q && q.under === pk) return capOnDept(A, d, sk);
    return deptSubsOf(A, d, pk).concat(deptTabsOf(A, d, pk)).indexOf(sk) !== -1;
  }
  if (PG_KEYS.indexOf(key) === -1) return true;
  return deptCapOf(A, d).indexOf(key) !== -1;
}
/* التوريث: كل أوراق سقف الإدارة بأفعالها كاملة — نسخة capAllPerms */
function capAllPermsOf(A, d) {
  var out = {};
  deptCapOf(A, d).forEach(function (k) {
    out[k] = ACTS_ALL.slice();
    var live = deptSubsOf(A, d, k).concat(deptTabsOf(A, d, k));
    pgLeaves(k).forEach(function (l) {
      var sp = pgSplit(l);
      if (sp.sub && live.indexOf(sp.sub) === -1) return;
      out[l] = ACTS_ALL.slice();
    });
  });
  PG_REG.forEach(function (p) { if (p.under && out[p.key] && out[p.key].length && !out[p.under]) out[p.under] = ['view']; });
  return out;
}
function expandPermsOf(A, d, obj) {
  var out = {};
  Object.keys(obj || {}).forEach(function (k) {
    var acts = (obj[k] || []).slice(); if (!acts.length) return;
    if (pgIsContainer(k)) {
      deptSubsOf(A, d, k).concat(deptTabsOf(A, d, k)).forEach(function (sk) { out[k + '/' + sk] = acts.slice(); });
    } else out[k] = acts;
  });
  return out;
}
function derivePagesOf(leaf) {
  var out = {};
  Object.keys(leaf || {}).forEach(function (k) {
    var acts = leaf[k] || []; if (!acts.length) return;
    var sp = pgSplit(k);
    out[k] = acts.slice();
    if (sp.sub && !pgOffPage(sp.page, sp.sub)) {
      var c = out[sp.page] || [];
      acts.forEach(function (a) { if (c.indexOf(a) === -1) c.push(a); });
      out[sp.page] = c;
    }
  });
  PG_REG.forEach(function (p) {
    if (p.under && out[p.key] && out[p.key].length) {
      var c = out[p.under] || [];
      out[p.key].forEach(function (a) { if (c.indexOf(a) === -1) c.push(a); });
      out[p.under] = c;
    }
  });
  return out;
}
/* الفرق بين «لا ورقة» و«ورقة خُزِّنت فارغة» — عليه يقوم التوريث */
function hasOwnSheetOf(A, ekey, d) {
  var p = ((A.perms.emps || {})[d] || {})[ekey];
  return !!(p && typeof p === 'object');
}
/* Read-time narrowing: narrowing a ceiling (pages, tabs, lenses) no longer deletes anything stored; a stored sheet is read cut to its
   unit's ceiling (capOnDept), so an out-of-ceiling ("latent") leaf grants nothing and is not held by a grantor, and comes back exactly
   when the ceiling is widened again. */
function empPermsOf(A, ekey, d) {
  var p = ((A.perms.emps || {})[d] || {})[ekey];
  if (!(p && typeof p === 'object')) return {};
  var hasOld = Object.keys(p).some(function (k) { return pgIsContainer(k); }), s = hasOld ? expandPermsOf(A, d, p) : p, out = {}, k;
  for (k in s) if (capOnDept(A, d, k)) out[k] = s[k];
  return out;
}
function isMgrKey(k) { return String(k || '').slice(0, 4) === 'mgr:'; }
