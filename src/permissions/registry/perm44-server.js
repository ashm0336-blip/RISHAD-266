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
      var rl = E.roleById(n, c.role), rs = rl && isObj(rl.sys) ? rl.sys : {};
      for (j = 0; j < sysEntries.length; j++) {
        var ks = perm44KeysFor(sysEntries[j][0], sysEntries[j][1].lvl, sysEntries[j][1].keys), hostRow = !/^lens\./.test(sysEntries[j][0]);
        for (var q = 0; q < ks.length; q++) {
          /* V7 · د7 (أ): في صفِّ النظام المضيف مفتاحُ عدسةٍ لها صفُّها في الدور لا يمنحه المضيف (compileRole)، ومفتاحُ عدسةٍ مطفأةٍ للوحدة يُقصّ بالسقف كما يُقصّ وقتَ القرار
             — لا يُرفض به حفظُ صفِّ المضيف؛ وصفُّ العدسة المطفأة نفسُه يبقى مرفوضاً ('cap') */
          var ow = (KIVO_REGISTRY.byKey[ks[q]] || {}).owner || '';
          if (hostRow && /^lens\./.test(ow) && (isObj(rs[ow]) || !C(ks[q]))) continue;
          if (!C(ks[q])) return 'cap'; if (!perm44Held(A, d, ks[q])) return 'grant';
        }
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
    /* V7 · د7 (52 · الكامن): المتوقَّعُ = الدورُ داخل السقف + ما كان في مدخله المخزَّن خارجَه (perm44-core keepOff — القاعدةُ نفسُها التي يكتب بها العميل) */
    var wk = E.keepOff({ plus: want.keys }, emp0[e], C).plus.map(String).slice().sort();
    if (!isObj(g) || JSON.stringify(has) !== JSON.stringify(wk)) return 'p44-grants';
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
