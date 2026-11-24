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
import { holdersWorld, clientOf, permViews, applyState, A, B, A_S1, OP, E_ROLE, KP, T } from './v7_d6_holders_fx.mjs';
import { stored, DAY } from './world_fx.mjs';
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
    /* existing roles unchanged: the host row still carries its lenses' keys (as before); a lens row, when present, governs that lens alone */
    const lensOfPlanView = c.ev('KIVO.Perm44.keysFor("plan", "view")').filter((k) => /^lens\./.test(k));
    for (const L of ALL) assert.ok(lensOfPlanView.includes('lens.' + L + '.view'), 'plan@view still grants lens.' + L + '.view');
    const comp = (sys) => c.ev('KIVO.Perm44.compileRole(' + JSON.stringify({ id: 'x', name: 'x', sys }) + ', null)');
    const base = comp({ plan: { lvl: 'edit' } }), over = comp({ plan: { lvl: 'edit' }, 'lens.zones': { lvl: 'view' } });
    assert.ok(base.includes('lens.zones.data.edit') && base.includes('lens.gates.edit'));
    assert.ok(over.includes('lens.zones.view') && !over.includes('lens.zones.data.edit') && !over.includes('lens.zones.create'), 'the lens row governs zones');
    assert.ok(over.includes('lens.gates.edit'), 'the other lenses follow the host level as before');
    assert.deepEqual(base.filter((k) => !/^lens\.zones\.|^ref\.zone\./.test(k)), over.filter((k) => !/^lens\.zones\.|^ref\.zone\./.test(k)), 'nothing else moves');
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
      const dr = c.K.Perm44.draft(A), role = { id: 'TEST_ONLY_rl', name: 'TEST_ONLY دور عدسة', desc: '', sys: { plan: { lvl: 'edit' }, 'lens.zones': { lvl } } };
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

const uiOf = (c) => { const x = permViews(c).ui; x.setState = function (p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); }; x.bsToast = () => {}; x._ogPendEnd = () => {}; return x; };
const J = (x) => JSON.parse(JSON.stringify(x));
const flat = (L) => [].concat(...L.map((r) => [r].concat(r.lz || [])));
const rowsOf = (x, u) => J(flat(x._p44SysVals(u, false).p44SysRows).map((r) => ({ k: r.k, on: r.isOn, locked: r.locked, lockTxt: r.lockTxt, kind: r.kind })));
const lzOf = (v, k) => flat(v.p44SysRows).find((r) => r.k === k);
const LK = ALL.map((L) => 'lens.' + L);

test('⑤ «الأنظمة»: under the host system its six lenses with switches like systems — «إطفاء الكل»/«تشغيل الكل», «أثر الحفظ», the review, save by setDeptLenses (one key); inheritance lock in the section; host OFF switches them OFF; the manager reads the ON ones only; the role editor rows', needs('plan', 'daily'), async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  const c = await clientOf(W, 'su', A), x = uiOf(c);
  try {
    let R = rowsOf(x, A);
    const iPlan = R.findIndex((r) => r.k === 'plan');
    assert.deepEqual(R.slice(iPlan + 1, iPlan + 7).map((r) => r.k), LK, 'the lens rows right under «التشغيل الميداني»');
    assert.ok(R.filter((r) => r.kind === 'lens').every((r) => r.on && !r.locked), 'all ON (no lens record = all)');
    assert.equal(R.filter((r) => LK.includes(r.k)).length, 6, 'each lens once (one record for both hosts)');
    assert.equal(x._p44SysVals(A, false).p44SysRows.filter((r) => r.kind === 'lens').length, 0, 'p44SysRows = the systems (the counter = the tree column)');
    let v = x._p44SysVals(A, false);
    lzOf(v, 'lens.gates').flip();
    v = x._p44SysVals(A, false);
    assert.equal(v.p44SysDirty, true); assert.equal(v.p44SysEffOff, 'عدسة البوابات', '«أثر الحفظ» names the lens');
    v.p44SysReview(); v = x._p44SysVals(A, false);
    assert.equal(v.p44RevOn, true); assert.deepEqual(J(v.p44RevRows.map((r) => [r.from, r.to])), [['مفعّل', 'مطفأ']]); assert.match(v.p44RevRows[0].what, /عدسة البوابات/);
    /* «تراجع» */
    v.p44SysUndo(); assert.equal(x._p44SysVals(A, false).p44SysDirty, false);
    /* «إطفاء الكل» covers the lenses, «تشغيل الكل» brings them back */
    x._p44SysVals(A, false).p44SysAllOff(); assert.ok(LK.every((k) => !(k in x.state.p44.cap.on)), 'all-off: the lenses go OFF with their host (their record stays)');
    assert.ok(flat(x._p44SysVals(A, false).p44SysRows).filter((r) => r.kind === 'lens').every((r) => !r.isOn), 'all-off: every lens OFF');
    x._p44SysVals(A, false).p44SysAllOn(); assert.ok(flat(x._p44SysVals(A, false).p44SysRows).filter((r) => r.kind === 'lens').every((r) => r.isOn), 'all-on: every lens ON');
    x._p44SysVals(A, false).p44SysUndo();
    /* host OFF in the draft (both hosts) ⇒ the lenses are OFF and locked, and «يُطفأ معها» names them */
    v = x._p44SysVals(A, false); v.p44SysRows.find((r) => r.k === 'plan').flip(); x._p44SysVals(A, false).p44SysRows.find((r) => r.k === 'daily').flip();
    v = x._p44SysVals(A, false);
    const lr = flat(v.p44SysRows).filter((r) => r.kind === 'lens');
    assert.ok(lr.every((r) => !r.isOn && r.locked), 'host OFF ⇒ lenses OFF + locked');
    for (const L of ['المصليات', 'الكثافة']) assert.ok(v.p44SysEffWith.includes('عدسة ' + L), '«يُطفأ معها»: ' + v.p44SysEffWith);
    v.p44SysUndo();
    /* the real save: gates OFF for A → one key bassam_perms_v1, lenses[A] without gates */
    lzOf(x._p44SysVals(A, false), 'lens.gates').flip();
    const dr = J(x.state.p44.cap.on);
    assert.equal(await x._p44CapSave(A, dr), true, 'the server kept it');
    assert.deepEqual(stored(W.env, KP).lenses[A], ALL.filter((k) => k !== 'gates'));
    assert.deepEqual(stored(W.env, KP).caps[A], J(c.P.rawCap(A)), 'the systems ceiling untouched');
    /* the section: inherited lock «مطفأ من: <A>» */
    const sr = rowsOf(x, A_S1).find((r) => r.k === 'lens.gates');
    assert.equal(sr.locked, true); assert.equal(sr.on, false); assert.equal(sr.lockTxt, 'مطفأ من: ' + T + 'إدارة أ');
    /* the role editor rows for A: the ON lenses only, under the host */
    const ed = J(x._p44RoleSys(A, x._p44Sys().filter((s) => x._p44Ceil(A)(s.k))).map((s) => s.k));
    assert.deepEqual(ed.filter((k) => /^lens\./.test(k)), LK.filter((k) => k !== 'lens.gates'));
    assert.equal(ed.indexOf('lens.zones'), ed.indexOf('plan') + 1);
  } finally { c.dispose(); }
  /* the unit manager (الإعدادات ← الصلاحيات — read-only «الأنظمة»): the ON lenses only, gates not even named */
  const m = await clientOf(W, 'mgr', A), y = uiOf(m);
  try {
    const ro = J(flat(y._p44SysRO(A).p44SysRows).map((r) => r.k));
    assert.deepEqual(ro.filter((k) => /^lens\./.test(k)), LK.filter((k) => k !== 'lens.gates'));
    assert.ok(!JSON.stringify(J(y._p44SysRO(A))).includes('البوابات'), 'the OFF lens is not named');
    assert.equal(m.ev('KIVO.BassamPerm.lensOn("gates", ' + JSON.stringify(A) + ')'), false, 'map buttons · panels: lensOn false');
    assert.equal(m.ev('KIVO.BassamPerm.lensOn("zones", ' + JSON.stringify(A) + ')'), true);
  } finally { m.dispose(); }
});

test('⑥ the unit manager grants within his ceiling with a lens OFF for his unit: a host row and an ON lens row are accepted; the OFF lens is refused (ceiling)', needs('plan', 'daily'), async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  const c = await clientOf(W, 'su', A);
  try { assert.equal(c.P.setDeptLenses(A, ALL.filter((k) => k !== 'gates')).ok, true); await c.settle(); } finally { c.dispose(); }
  const save = async (sys) => {
    const m = await clientOf(W, 'mgr', A);
    try {
      const dr = m.K.Perm44.draft(A), role = { id: 'TEST_ONLY_rm', name: 'TEST_ONLY دور المدير', desc: '', sys };
      assert.equal(m.K.Perm44.setRoles(dr, A, { v: 1, roles: [role], people: { [E_ROLE]: { role: role.id, ex: [] } } }).ok, true);
      return await m.K.Perm44.commit(dr);
    } finally { m.dispose(); }
  };
  const ok = await save({ plan: { lvl: 'edit' }, 'lens.zones': { lvl: 'view' } });
  assert.equal(ok.ok, true, 'host row + ON lens row accepted: ' + JSON.stringify(ok));
  const p = await plusOf(W, 'role', A);
  assert.ok(p.includes('lens.zones.view') && !p.includes('lens.zones.data.edit') && !p.some((k) => /^lens\.gates\./.test(k)), JSON.stringify(p));
  const no = await save({ plan: { lvl: 'edit' }, 'lens.gates': { lvl: 'view' } });
  assert.equal(no.ok, false, 'the OFF lens row is refused');
});

test('⑦ the server refuses a lens action for everyone in the unit when the lens is OFF (department manager · section manager by inheritance) — accepted again when ON; the platform admin as before', needs('plan', 'daily'), async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  const setL = async (d, L) => { const c = await clientOf(W, 'su', A); try { assert.equal(c.P.setDeptLenses(d, L).ok, true); await c.settle(); assert.equal(c.denied(), 0); } finally { c.dispose(); } };
  /* a gate added to today's round by the account who — the real write path (operations read → /api/save) */
  let n = 0;
  const addGate = async (who, d) => {
    const key = 'bsdept:' + d + ':bassam_rounds_v1';
    const rd = await W.C.api('/api/operations/read?' + new URLSearchParams({ keys: key }), { cookie: W.ck[who] });
    assert.equal(rd.status, 200, JSON.stringify(rd.j)); const cur = (rd.j.values || {})[key];
    const v = cur ? (typeof cur === 'string' ? JSON.parse(cur) : cur) : {};
    const day = v[DAY] || { t: 1, d: [{ sid: 'TEST_ONLY_S1', zones: [], paths: [], gates: [], marks: [] }] };
    day.d[0].gates = (day.d[0].gates || []).concat([{ uid: 'TEST_ONLY_g' + (++n), id: 'TEST_ONLY_g' + n, num: String(n), label: 'TEST_ONLY بوابة', x: 10, y: 10 }]);
    v[DAY] = day;
    const r = await W.C.api('/api/save', { method: 'POST', cookie: W.ck[who], body: { requestId: 'TEST_ONLY_lens_' + n, epoch: rd.j.epoch, base: rd.j.base, set: { [key]: JSON.stringify(v) }, del: [], why: { [key]: 'TEST_ONLY' } } });
    const kept = (((stored(W.env, key) || {})[DAY] || {}).d || [{}])[0].gates || [];
    const ok = r.status === 200 && r.j.ok === 1 && kept.some((g) => g.uid === 'TEST_ONLY_g' + n);
    /* refused = not applied: the write is answered, and the lens column is kept as stored (061 enfFloorProj / merge — the existing rule for a lens OFF) */
    return ok;
  };
  assert.equal(await addGate('mgr', A), true, 'control: gates ON — the department manager adds a gate');
  assert.equal(await addGate('sec', A_S1), true, 'control: the section manager too');
  await setL(A, ALL.filter((k) => k !== 'gates'));
  assert.equal(await addGate('mgr', A), false, 'gates OFF for A ⇒ the server refuses the department manager');
  assert.equal(await addGate('sec', A_S1), false, 'and the section manager (inherited from A)');
  assert.equal(await addGate('su', A), true, 'the platform administrator as before (no restriction)');
  await setL(A, ALL);
  assert.equal(await addGate('mgr', A), true, 'ON again ⇒ accepted as before');
  assert.equal(await addGate('sec', A_S1), true);
});

function deq6(L, m) { assert.deepEqual(L, ALL, m); }
