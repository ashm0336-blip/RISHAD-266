/* V7 · د5-هـ (44): محرّكُ الأدوار — مصدرٌ واحد في الواجهة والخادم.
   (1) الملفّان المولَّدان (src/permissions/345-perm44.js · workers/parts/057b-perm44.js) يحملان جدولَ المستويات ونصَّ المحرّك نفسَه حرفاً (perm44-core.js).
   (2) على السجلّ الحقيقي (340 في الواجهة · 004 في الخادم): لكل نظام × مستوى — مفاتيحُ الواجهة = مفاتيحُ الخادم؛ ويُطبع الجدول (نظام · مستوى · عدد).
   (3) قواعدُ المستويات: view ⊂ input ⊂ edit ⊂ full ⊂ sensitive · لا حسّاسَ قبل «حسّاس» · custom = القائمةُ ∩ مفاتيحُ النظام · لا بوابةَ عدسة ولا مفتاحَ غيرِ قابلٍ للمنح.
   (4) compile/effective: الدور ∪ الاستثناءاتُ الحيّة ∩ السقف · الاستثناءُ المنتهي لا يُحسب · diff/undo (والانجراف يرفض). TEST_ONLY. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './harness.mjs';

const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const CORE = rd('src/permissions/registry/perm44-core.js');
const LEVELS = JSON.parse(rd('src/permissions/registry/perm44-levels.json'));

function client() {
  const ctx = { KIVO: {}, console, localStorage: { getItem: () => null, setItem() {} } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(rd('src/permissions/340-registry-v24-9.js'), ctx);
  vm.runInContext(rd('src/permissions/345-perm44.js'), ctx);
  return ctx.KIVO.Perm44;
}
function server() {
  const ctx = { console }; vm.createContext(ctx);
  vm.runInContext(rd('workers/parts/004-registry-2.js') + '\n' + rd('workers/parts/057b-perm44.js') + '\n;this.__E = { keysFor: perm44KeysFor, compile: perm44Compile, effective: perm44Effective, eng: perm44E };', ctx);
  return ctx.__E;
}

test('perm44: one source — the level table and the engine text are the same in both generated files', () => {
  const c = rd('src/permissions/345-perm44.js'), s = rd('workers/parts/057b-perm44.js');
  assert.ok(c.includes(CORE) && s.includes(CORE), 'perm44-core.js verbatim in 345 and 057b');
  const dc = /var KIVO_PERM44_DATA = (.*);\n/.exec(c)[1], ds = /var KIVO_PERM44_DATA = (.*);\n/.exec(s)[1];
  assert.equal(dc, ds, 'KIVO_PERM44_DATA identical');
  assert.deepEqual(JSON.parse(dc).levels, LEVELS.levels, 'levels = perm44-levels.json');
});

test('perm44: client = server for every system × level on the real registry (table printed)', (t) => {
  const C = client(), S = server(), R = JSON.parse(rd('src/permissions/registry/registry-v24.9.json'));
  const byKey = Object.fromEntries(R.registry.map((e) => [e.key, e]));
  const sys = Array.from(C.sysList()), lv = Array.from(C.levels()).map((l) => l.key);
  assert.ok(sys.length >= 8, 'systems derived from pages.json: ' + sys.map((s) => s.key).join(' '));
  assert.deepEqual(lv, ['view', 'input', 'edit', 'full', 'sensitive', 'custom']);
  const rows = ['system · level · keys'];
  for (const s of sys) {
    const all = Array.from(C.sysKeys(s.key));
    const per = {};
    for (const l of lv) {
      const custom = l === 'custom' ? all.filter((k, i) => i % 2 === 0).concat(['no.such.key', 'perm.assign']) : undefined;
      const a = Array.from(C.keysFor(s.key, l, custom)), b = Array.from(S.keysFor(s.key, l, custom));
      assert.deepEqual(Array.from(a), Array.from(b), s.key + ' · ' + l + ': client = server');
      per[l] = a; rows.push(s.key + ' · ' + l + ' · ' + a.length);
      for (const k of a) {
        const e = byKey[k]; assert.ok(e && e.status === 'active' && e.grant === 'assignable' && !/^lens\.[a-z]+\.enable$/.test(k), k + ' grantable');
        if (l !== 'sensitive' && l !== 'custom') assert.ok(!e.sensitive, k + ' sensitive only at «حسّاس» (' + l + ')');
      }
    }
    const sub = (x, y) => x.every((k) => y.includes(k));
    assert.ok(sub(per.view, per.input) && sub(per.input, per.edit) && sub(per.edit, per.full) && sub(per.full, per.sensitive), s.key + ': nested levels');
    assert.deepEqual(per.sensitive, all, s.key + ': «حسّاس» = every key of the system');
    assert.ok(per.custom.every((k) => all.includes(k)) && !per.custom.includes('no.such.key'), s.key + ': custom ⊂ system keys');
    for (const k of per.view) assert.ok(['access', 'view'].includes(byKey[k].type), k + ' view type');
  }
  t.diagnostic(rows.join('\n'));
});

test('perm44: compile / effective — role ∪ live exceptions ∩ ceiling, expiry, identical in both', () => {
  const C = client(), S = server();
  const plan = C.sysKeys('plan'), staff = C.sysKeys('staff');
  assert.ok(plan.length && staff.length, 'plan/staff have keys');
  const role = { id: 'TEST_ONLY_r1', name: 'TEST_ONLY دور', sys: { plan: { lvl: 'edit' }, staff: { lvl: 'view' } } };
  const roles = { v: 1, roles: [role], people: {} };
  const ceil = (k) => !staff.includes(k);                     /* «الجدول الشهري» مطفأٌ في السقف */
  const comp = C.compileRole(role, ceil);
  assert.deepEqual(Array.from(comp), Array.from(S.compile(role, ceil)), 'compile client = server');
  assert.deepEqual(Array.from(comp), Array.from(C.keysFor('plan', 'edit')), 'compile = plan·edit (staff off)');
  const now = 1_800_000_000_000, extra = plan.find((k) => !comp.includes(k)), later = staff[0];
  const rec = { role: 'TEST_ONLY_r1', ex: [{ key: extra, until: now + 1000, by: 'TEST_ONLY', at: now, note: 'TEST_ONLY' }, { key: later, until: null }, { key: plan[0], until: now - 1 }] };
  const ce = C.effective(rec, roles, ceil, now), se = S.effective(rec, roles, ceil, now);
  assert.deepEqual(JSON.parse(JSON.stringify(ce)), JSON.parse(JSON.stringify(se)), 'effective client = server');
  if (extra) { assert.ok(ce.keys.includes(extra), 'live exception counted'); assert.equal(ce.until[extra], now + 1000); }
  assert.ok(!ce.keys.includes(later), 'exception outside the ceiling dropped');
  assert.equal(ce.expired.length, 1, 'expired exception reported, not counted');
  const after = C.effective(rec, roles, ceil, now + 5000);
  if (extra) assert.ok(!after.keys.includes(extra), 'exception expires');
  assert.equal(C.effective({ role: null, ex: [] }, roles, ceil, now).keys.length, 0, 'no role, no exception: nothing');
});

test('perm44: diff → changes/affected · undo restores · drift refuses', () => {
  const C = client();
  const a = { v: 1, roles: [{ id: 'r1', name: 'TEST_ONLY أ', sys: { plan: { lvl: 'view' } } }], people: { e1: { role: 'r1', ex: [] }, e2: { role: null, ex: [] } } };
  const b = JSON.parse(JSON.stringify(a)); b.roles[0].sys.plan.lvl = 'full'; b.roles[0].name = 'TEST_ONLY ب'; b.people.e2.role = 'r1';
  b.roles.push({ id: 'r2', name: 'TEST_ONLY ج', sys: {} }); b.people.e1.ex.push({ key: 'plan.view', until: null });
  const D = C.diff(a, b);
  const what = Array.from(D.changes).map((c) => c.what).sort();
  assert.deepEqual(what, ['ex', 'name', 'person', 'role', 'sys']);
  assert.deepEqual(Array.from(D.affected), ['e1', 'e2']);
  const sysC = D.changes.find((c) => c.what === 'sys'); assert.deepEqual(JSON.parse(JSON.stringify([sysC.from, sysC.to])), [{ lvl: 'view' }, { lvl: 'full' }]);
  const back = C.undo(b, D.changes); assert.deepEqual(JSON.parse(JSON.stringify(back)), a, 'undo = before');
  const drift = JSON.parse(JSON.stringify(b)); drift.roles[0].sys.plan.lvl = 'edit';
  assert.equal(C.undo(drift, D.changes), null, 'drifted: refused');
  assert.equal(C.diff(a, a).changes.length, 0);
});

/* الواجهة: السقفُ بالوراثة (الوحدة ∩ كلُّ سلف) · setRoles/setPerson يكتبان السجلَّين في المسودة نفسِها · commit يكتبهما في لحظةٍ واحدة · roleNameOf */
function clientWith(state) {
  const store = new Map(Object.entries(state.store || {}).map(([k, v]) => [k, JSON.stringify(v)])), writes = [];
  const ctx = { console, localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { writes.push(k); store.set(k, String(v)); } } };
  const on = state.on;   /* {unit: [pages on]} */
  ctx.KIVO = {
    BassamDepts: { active: () => 'TEST_ONLY_d1', ancestorsOf: (d) => (state.anc[d] || []) },
    BassamAuth: { user: () => ({ id: 'TEST_ONLY_u', role: state.role || 'staff' }) },
    BassamPerm: {
      p24Ceil: (d) => ({ page: (p) => (on[d] || []).includes(p), sub: (p) => (on[d] || []).includes(p), lens: () => true }),
      p24LeafOn: (C, leaf) => C.page(leaf.split('/')[0]),
      p24Effective: () => ({ T: state.T || {} }), hasOwnSheet: () => !!state.sheet, empPerms: () => state.sheet || {}, empTpl: () => null,
    },
    __BS_SRV: { flushAsync: async () => { ctx.flushed = writes.slice(); } },
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(rd('src/permissions/340-registry-v24-9.js'), ctx);
  vm.runInContext(rd('src/permissions/345-perm44.js'), ctx);
  return { P: ctx.KIVO.Perm44, store, writes, ctx };
}
test('perm44 client: inherited ceiling · setRoles/setPerson fill one draft (roles + compiled grants) · commit · roleNameOf', async () => {
  const D = 'TEST_ONLY_d1', KR = 'bsdept:' + D + ':bassam_roles_v1', KG = 'bsdept:' + D + ':bassam_grants_v1';
  const all = ['dstats', 'emps', 'planning', 'staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'links', 'help'];
  const W = clientWith({ on: { [D]: all, TEST_ONLY_g1: all.filter((p) => p !== 'staff') }, anc: { [D]: ['TEST_ONLY_g1'] }, T: { 'plan.view': true, 'staff.view': true },
    store: { [KG]: { v: 1, emp: { TEST_ONLY_other: { plus: ['plan.view'], minus: [], src: 'tpl:x' } } } } });
  const P = W.P, S = server();
  const C = P.ceiling(D);
  assert.ok(!Array.from(C.on).includes('staff') && Array.from(C.on).includes('plan'), 'an ancestor switched «staff» off: off for the unit');
  assert.equal(C.key(Array.from(P.keysFor('staff', 'view'))[0]), false);
  const role = { id: 'TEST_ONLY_r', name: 'TEST_ONLY مراقب', sys: { plan: { lvl: 'input' }, staff: { lvl: 'full' } } };
  const dr = P.draft(D);
  assert.equal(P.setRoles(dr, D, [role]).ok, true);
  assert.equal(P.setPerson(dr, D, 'TEST_ONLY_e1', { role: role.id, ex: [] }).ok, true);
  const rec = dr.set[KR], g = dr.set[KG];
  assert.ok(rec && g, 'both records in the same draft');
  const want = Array.from(S.keysFor('plan', 'input'));
  assert.deepEqual(Array.from(g.emp.TEST_ONLY_e1.plus), want, 'compiled = plan·input (staff is off by inheritance)');
  assert.equal(g.emp.TEST_ONLY_e1.src, 'role:' + role.id);
  assert.deepEqual(Array.from(g.emp.TEST_ONLY_e1.minus), want.includes('staff.view') ? [] : ['staff.view'], 'the legacy sheet beyond the role → minus');
  assert.deepEqual(JSON.parse(JSON.stringify(g.emp.TEST_ONLY_other)), { plus: ['plan.view'], minus: [], src: 'tpl:x' }, 'other entries untouched');
  assert.equal(W.store.get(KR), undefined, 'nothing written before commit');
  const r = await P.commit(dr);
  assert.equal(r.ok, true); assert.deepEqual(Array.from(W.ctx.flushed).sort(), [KG, KR].sort(), 'both keys written in the same tick, then flushed');
  assert.equal(P.roleNameOf('TEST_ONLY_e1', D), 'TEST_ONLY مراقب');
  assert.equal(P.roleNameOf('TEST_ONLY_other', D), 'صلاحيات مخصّصة');
  assert.equal(P.roleNameOf('TEST_ONLY_nobody', D), 'بلا صلاحيات');
  /* removing the person: the role-sourced entry goes with him */
  const d2 = P.draft(D); P.setPerson(d2, D, 'TEST_ONLY_e1', null);
  assert.equal(d2.set[KG].emp.TEST_ONLY_e1, undefined);
  assert.equal(P.setRoles(P.draft(D), D, [{ id: '', name: 'x', sys: {} }]).ok, false, 'shape refused before anything is written');
});
