/* V7 · د7 (أ) — العدساتُ في «الإدارات والصلاحيات» كالأنظمة (TEST_ONLY · العاملُ الحقيقي في وضع الإنفاذ · الواجهةُ الحقيقية في node:vm).
   ما يُثبته:
     ① الوراثة في الخادم: عدسةٌ أطفأها مديرُ المنصة لإدارةٍ مطفأةٌ في قسمها (لا سجلَّ عدساتٍ للقسم) — في عدسات الجلسة (/api/authz · boot)
        وفي سقف الأدوار؛ وإدارةٌ أخرى لا تتأثر. (كانت lensGate تقرأ سجلَّ الوحدة وحده.)
     ② المحرّكُ المشترك (الواجهة = الخادم): كلُّ عدسةٍ صفٌّ بمستويات الأنظمة (lensList · keysFor('lens.<L>', lvl)) — سقفُ مفتاحها: العدسةُ في سقف
        الوحدة وأصولها ∧ مضيفٌ مفعّل؛ وصفُّ النظام المضيف لا يحمل مفاتيحَ العدسات (فلا يتغيّر ما يمنحه دورٌ قائم).
     ③ دورٌ بعدسة «مشاهدة» يحمل عرضَها لا تعديلها؛ و«تعديل» يحمل تعديلَ بياناتها — في الخادم (المفاتيحُ المحمولة) و«اختبار الوصول».
     ④ النشرُ لا يطفئ شيئاً: وحدةٌ قائمة بلا سجلّ عدسات تبقى عدساتُها الستّ مفعّلة (لا ترحيل). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { holdersWorld, clientOf, applyState, A, B, A_S1, OP, E_ROLE, KP } from './v7_d6_holders_fx.mjs';
import { stored } from './world_fx.mjs';
import { needs, CURRENT_SCHEMA } from './harness.mjs';

const ALL = ['zones', 'paths', 'gates', 'marks', 'dist', 'dens'];
const lensOf = async (W, who, d) => { const b = (await W.C.boot(W.ck[who])).boot; return (((b.authz || {}).depts || {})[d] || {}).lens; };
const plusOf = async (W, who, d) => { const b = (await W.C.boot(W.ck[who])).boot; return (((b.authz || {}).depts || {})[d] || {}).p || []; };
const check = (W, who, q) => W.C.api('/api/perm44/check?' + new URLSearchParams(q).toString(), { cookie: W.ck[who] });

test('① a lens switched OFF for a department is OFF in its section on the SERVER (inherited like systems) — another department untouched', needs('plan', 'daily'), async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  deq6(await lensOf(W, 'sec', A_S1), 'before: the section has every lens');
  const c = await clientOf(W, 'su', A);
  try { assert.equal(c.P.setDeptLenses(A, ALL.filter((k) => k !== 'gates')).ok, true); await c.settle(); assert.equal(c.denied(), 0); } finally { c.dispose(); }
  const P = stored(W.env, KP);
  assert.ok(!Object.prototype.hasOwnProperty.call(P.lenses || {}, A_S1), 'the section has NO lens record of its own');
  assert.deepEqual(await lensOf(W, 'mgr', A), ALL.filter((k) => k !== 'gates'), 'the department manager: gates OFF');
  assert.deepEqual(await lensOf(W, 'sec', A_S1), ALL.filter((k) => k !== 'gates'), 'the section manager: gates OFF by inheritance (server)');
  /* the role ceiling (server) — «اختبار الوصول» in the section answers «ceiling» for a gates key, «ceiling» not for a zones key */
  const g = await check(W, 'su', { d: A_S1, ekey: 'mgr:' + A_S1, key: 'lens.gates.view' });
  assert.equal(g.j.ok, 1); assert.equal(g.j.why, 'ceiling', 'gates is outside the section ceiling');
  const z = await check(W, 'su', { d: A_S1, ekey: 'mgr:' + A_S1, key: 'lens.zones.view' });
  assert.notEqual(z.j.why, 'ceiling', 'zones is inside it: ' + z.j.why);
  /* the client (same engine): the same ceiling */
  const cs = await clientOf(W, 'su', A_S1);
  try { assert.equal(cs.ev('KIVO.Perm44.ceiling(' + JSON.stringify(A_S1) + ').key("lens.gates.view")'), false); assert.equal(cs.ev('KIVO.Perm44.ceiling(' + JSON.stringify(A_S1) + ').key("lens.zones.view")'), true); } finally { cs.dispose(); }
  /* switching it ON again brings it back as it was */
  const c2 = await clientOf(W, 'su', A);
  try { assert.equal(c2.P.setDeptLenses(A, ALL).ok, true); await c2.settle(); assert.equal(c2.denied(), 0); } finally { c2.dispose(); }
  deq6(await lensOf(W, 'sec', A_S1), 'after ON: the section has every lens again');
});

test('② the shared engine: each lens is a row with the systems\' levels; its ceiling = the lens in the unit chain ∧ a host ON; host rows keep their keys', needs('plan', 'daily'), async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  const c = await clientOf(W, 'su', A);
  try {
    const L = c.ev('KIVO.Perm44.lensList()');
    assert.deepEqual(L.map((x) => x.lens), ALL, 'the six existing lenses, in their order');
    for (const x of L) { assert.equal(x.key, 'lens.' + x.lens); assert.deepEqual(x.sys.slice().sort(), ['daily', 'plan'], x.key + ' hosts: التشغيل الميداني · المتابعة اليومية'); }
    assert.deepEqual(c.ev('KIVO.Perm44.keysFor("lens.zones", "view")'), ['lens.zones.view', 'lens.zones.indicators.view', 'ref.zone.type.view'], 'its own keys (owner lens.zones in the registry) at the view types');
    const ed = c.ev('KIVO.Perm44.keysFor("lens.zones", "edit")');
    assert.ok(ed.includes('lens.zones.create') && ed.includes('lens.zones.data.edit') && !ed.includes('lens.zones.delete') && !ed.includes('lens.zones.geometry.edit'), JSON.stringify(ed));
    assert.ok(c.ev('KIVO.Perm44.keysFor("lens.zones", "sensitive")').includes('lens.zones.delete'));
    assert.ok(!c.ev('KIVO.Perm44.keysFor("lens.zones", "sensitive")').includes('lens.zones.enable'), 'the enable gate is not granted by a role');
    for (const s of ['plan', 'daily']) assert.deepEqual(c.ev('KIVO.Perm44.sysKeys(' + JSON.stringify(s) + ')').filter((k) => /^lens\./.test(k)), [], s + ': the host row grants no lens key (existing roles unchanged)');
    assert.equal(c.ev('KIVO.Perm44.ceiling(' + JSON.stringify(A) + ').key("lens.dens.view")'), true);
    /* host OFF (both hosts) ⇒ the lens keys are off the ceiling */
    const ALLP = c.ev('KIVO.BassamPerm.PAGE_KEYS');
    assert.equal(c.I.setDeptCap(B, ALLP.filter((k) => k !== 'plan' && k !== 'daily')).ok, true); await c.settle(); assert.equal(c.denied(), 0);
  } finally { c.dispose(); }
  const cb = await clientOf(W, 'su', B);
  try { assert.equal(cb.ev('KIVO.Perm44.ceiling(' + JSON.stringify(B) + ').key("lens.dens.view")'), false, 'both hosts OFF ⇒ the lens is OFF'); } finally { cb.dispose(); }
  const r = await check(W, 'su', { d: B, ekey: 'mgr:' + B, key: 'lens.dens.view' });
  assert.equal(r.j.why, 'ceiling', 'the server agrees (host OFF)');
});

test('③ a role with a lens at «مشاهدة» carries its view keys only; at «تعديل» it carries its data edit — server keys and «اختبار الوصول»', needs('plan', 'daily'), async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  const save = async (lvl) => {
    const c = await clientOf(W, 'su', A);
    try {
      const dr = c.K.Perm44.draft(A), role = { id: 'TEST_ONLY_rl', name: 'TEST_ONLY دور عدسة', desc: '', sys: { plan: { lvl: 'view' }, 'lens.zones': { lvl } } };
      assert.equal(c.K.Perm44.setRoles(dr, A, { v: 1, roles: [role], people: { [E_ROLE]: { role: role.id, ex: [] } } }).ok, true);
      const x = await c.K.Perm44.commit(dr); assert.equal(x.ok, true, 'saved by the worker: ' + JSON.stringify(x));
    } finally { c.dispose(); }
  };
  await save('view');
  let p = await plusOf(W, 'role', A);
  assert.ok(p.includes('lens.zones.view'), 'view: the lens view key is held — ' + JSON.stringify(p));
  assert.ok(!p.includes('lens.zones.data.edit') && !p.includes('lens.zones.create'), 'view: no edit key');
  assert.equal((await check(W, 'su', { d: A, role: 'TEST_ONLY_rl', key: 'lens.zones.data.edit' })).j.why, 'level');
  await save('edit');
  p = await plusOf(W, 'role', A);
  assert.ok(p.includes('lens.zones.data.edit') && p.includes('lens.zones.create'), 'edit: the data edit is held — ' + JSON.stringify(p));
  assert.equal((await check(W, 'su', { d: A, role: 'TEST_ONLY_rl', key: 'lens.zones.data.edit' })).j.allow, true);
  /* the lens OFF for the unit ⇒ the grant is cut at decision time (and returns when ON) */
  const c = await clientOf(W, 'su', A);
  try { assert.equal(c.P.setDeptLenses(A, ALL.filter((k) => k !== 'zones')).ok, true); await c.settle(); } finally { c.dispose(); }
  p = await plusOf(W, 'role', A);
  assert.ok(!p.includes('lens.zones.data.edit') && !p.includes('lens.zones.view'), 'OFF for the unit ⇒ not held');
  const c2 = await clientOf(W, 'su', A);
  try { assert.equal(c2.P.setDeptLenses(A, ALL).ok, true); await c2.settle(); } finally { c2.dispose(); }
  assert.ok((await plusOf(W, 'role', A)).includes('lens.zones.data.edit'), 'ON again ⇒ held again as it was');
});

test('④ deploy switches nothing OFF: on a schema-' + CURRENT_SCHEMA + ' world with existing ceilings, a unit without a lens record keeps all six lenses; an explicit record stays as stored', needs('plan', 'daily'), async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  const sch = W.env.DB.q("SELECT v FROM meta WHERE k = 'schema'")[0];
  if (sch) assert.equal(+sch.v, CURRENT_SCHEMA);
  const P = stored(W.env, KP);
  assert.ok(Object.keys(P.caps || {}).length > 0, 'existing ceilings');
  for (const d of [A, A_S1, OP]) assert.ok(!Object.prototype.hasOwnProperty.call(P.lenses || {}, d), d + ' has no lens record');
  deq6(await lensOf(W, 'open', OP), 'a unit under an open node, no record: every lens');
  deq6(await lensOf(W, 'mgr', A), 'a department with a ceiling, no lens record: every lens');
  deq6(await lensOf(W, 'sec', A_S1), 'a section, no lens record: every lens');
  const c = await clientOf(W, 'su', A);
  try { for (const d of [A, A_S1, OP]) assert.deepEqual(c.ev('KIVO.BassamPerm.deptLenses(' + JSON.stringify(d) + ')'), ALL, d + ': the systems tab draws every lens ON'); } finally { c.dispose(); }
  assert.deepEqual(stored(W.env, KP), P, 'reading wrote nothing (no migration)');
});

function deq6(L, m) { assert.deepEqual(L, ALL, m); }
