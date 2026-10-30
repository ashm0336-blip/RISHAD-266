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
function effCapOf(A, d) {
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
function empPermsOf(A, ekey, d) {
  var p = ((A.perms.emps || {})[d] || {})[ekey];
  if (!(p && typeof p === 'object')) return {};
  var hasOld = Object.keys(p).some(function (k) { return pgIsContainer(k); });
  return hasOld ? expandPermsOf(A, d, p) : p;
}
function isMgrKey(k) { return String(k || '').slice(0, 4) === 'mgr:'; }
