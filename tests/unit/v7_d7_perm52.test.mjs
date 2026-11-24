/* V7 · د7 (52 · perm52): كتّابُ الأدوار والمنح والسقف يحملون ما خارج العرض كما هو مخزَّن (قاعدةُ المالك الواحدة) — TEST_ONLY:
   ① الجرد ٢: «إيقاف الكل» في محرّر الدور يطفئ الصفوفَ المعروضة وحدها (صفُّ نظامٍ مطفأ في السقف وصفُّ عدسةٍ يُحملان) — الصفحةُ الحقيقية فوق المحرّك الحقيقي
   ② الجرد ٧: normRec وsetRoles يحملان الحقلَ الأعلى المجهول في سجلّ الأدوار
   ③ الجرد ٦ · ٧ب · ٨ · ٤: العميلُ الحقيقي (331) فوق العامل الحقيقي — permStore يحمل الحقلَ الأعلى المجهول، setDeptSubs يحمل مفتاحَ القسم المجهول،
      p24SetGrant يحفظ src المخزَّن، وpruneOrphanEmpPerms لا يحذف بقائمة حساباتٍ مُرشَّحة */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orgWorld, J } from './org_world.mjs';
import { rolesKey } from './perm44_real.mjs';
import { world, stored, putKV } from './world_fx.mjs';
import { loadClient, until, sleep } from './k264_vm.mjs';

const A = 'TEST_ONLY_A', CAP = ['staff', 'plan', 'tasks'];

test('① «إيقاف الكل» turns off the shown rows only — an OFF system row and a lens row are carried as stored', () => {
  const role = { id: 'TEST_ONLY_r1', name: 'TEST_ONLY دور', desc: '', sys: { staff: { lvl: 'edit' }, tasks: { lvl: 'view' }, dstats: { lvl: 'view' }, 'lens.zones': { lvl: 'full' } } };
  const W = orgWorld({ caps: { [A]: CAP }, docs: { [A]: { roles: [role], people: { TEST_ONLY_e1: { role: role.id, ex: [] } } } }, hash: '#/sysadmin/org/' + A + '/roles' });
  let v = W.render();
  v.p44RoleList.find((r) => r.n === role.name).pick(); v = W.render();
  assert.deepEqual(v.p44SysEd.map((r) => r.k).sort(), ['plan', 'staff', 'tasks'], 'the editor shows the systems ON in the ceiling only');
  v.p44AllOff(); v = W.render();
  const d = W.page.state.p44.d.roles.find((r) => r.id === role.id);
  assert.deepEqual(J(d.sys), { dstats: { lvl: 'view' }, 'lens.zones': { lvl: 'full' } }, 'only the shown rows are removed: ' + JSON.stringify(d.sys));
  assert.equal(v.p44OnN, '0', 'every shown row is OFF');
  /* «تفعيل الكل» يضيف المعروضَ وحده ولا يمسّ المحمول */
  v.p44AllOn(); const d2 = W.page.state.p44.d.roles.find((r) => r.id === role.id);
  assert.deepEqual(J(d2.sys), { dstats: { lvl: 'view' }, 'lens.zones': { lvl: 'full' }, plan: { lvl: 'view' }, staff: { lvl: 'view' }, tasks: { lvl: 'view' } }, '«تفعيل الكل» adds the shown rows only');
});

test('② the roles record carries an unknown top-level field (normRec · setRoles)', () => {
  const role = { id: 'TEST_ONLY_r1', name: 'TEST_ONLY دور', desc: '', sys: { tasks: { lvl: 'view' } } };
  const W = orgWorld({ caps: { [A]: CAP }, docs: { [A]: { roles: [role], people: {} } } });
  const rec0 = { v: 1, roles: [role], people: {}, TEST_ONLY_future: { a: 1 } };
  W.store.setItem(rolesKey(A), JSON.stringify(rec0));
  const E = W.E;
  assert.equal(JSON.stringify(E.rolesOf(A).TEST_ONLY_future), '{"a":1}', 'rolesOf (normRec) keeps the unknown field');
  const dr = E.draft(A), nx = { v: 1, roles: [Object.assign(J(role), { name: 'TEST_ONLY دور ٢' })], people: {} };   /* what the editor sends: without the field */
  const w = E.setRoles(dr, A, nx);
  assert.equal(w.ok, true, JSON.stringify(w));
  assert.equal(JSON.stringify(w.rec.TEST_ONLY_future), '{"a":1}', 'setRoles carries the stored unknown field');
  assert.equal(w.rec.roles[0].name, 'TEST_ONLY دور ٢', 'the user\'s change is saved');
  const w2 = E.setRoles(E.draft(A), A, [J(role)]);
  assert.equal(JSON.stringify(w2.rec.TEST_ONLY_future), '{"a":1}', 'a roles list too');
});

/* ③ العميلُ الحقيقي فوق العامل الحقيقي (نمط caps_own_latent) */
const D = 'tst_d1', KP = 'bassam_perms_v1', GK = 'bsdept:' + D + ':bassam_grants_v1', EK = 'tst_e_emp1';
const BLOCKS = ['255-page-manifest.js', '260-bassam-plat.js', '280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '331-perm-model.js', '332-find-day.js', '333-platform-map.js', '334-perm-tree-tpl.js', '340-registry-v24-9.js', '440-count.js'];
const cp = (o) => JSON.parse(JSON.stringify(o));
async function clientOf(W, who) {
  const boot = (await W.C.boot(W.ck[who])).boot;
  const T = loadClient({ C: W.C, boot, jar: { cookie: W.ck[who] }, blocks: [] });
  T.W.atob = globalThis.atob; T.W.btoa = globalThis.btoa;
  T.W.localStorage._m.set('bassam_session_v1', JSON.stringify({ uid: boot.uid, ts: Date.now(), la: Date.now() }));
  T.W.localStorage._m.set('bassam_active_dept_v1', D);
  T.W.document.hidden = true;
  T.run(BLOCKS);
  if (!T.W.KIVO.KIVO_REGISTRY && T.W.KIVO_REGISTRY) T.W.KIVO.KIVO_REGISTRY = T.W.KIVO_REGISTRY;
  const K = T.W.KIVO, SV = K.__BS_SRV, I = K.__BS_I.auth;
  assert.ok(I && !I.dead && SV, 'client loaded');
  const settle = async () => { await sleep(30); assert.ok(await until(() => !SV.dirty() && !SV.inflight(), 8000), 'settled'); await sleep(30); };
  return { T, K, I, P: K.BassamPerm, SV, settle, dispose: () => T.dispose() };
}
async function scene() {
  const W = await world({ mode: 'enforce' });
  W.ck = { su: W.su.ck, dm1: (await W.login('0000000101', '70101')).ck };
  const P = stored(W.env, KP);
  P.subs = Object.assign({}, P.subs || {}, { [D]: { emps: ['data', 'custody', 'TEST_ONLY_newsub'] } });
  P.TEST_ONLY_future = { from: 'a newer build' };
  P.emps[D].tst_e_noacct = { tasks: ['view'] };   /* an employee sheet with no account in the list the client reads */
  putKV(W.env, KP, P);
  return W;
}

test('③ the real client: permStore carries unknown top-level fields; setDeptSubs carries unknown sub keys', async () => {
  const W = await scene();
  const c = await clientOf(W, 'su');
  try {
    await c.settle();
    assert.equal(c.P.setDeptSubs(D, 'emps', ['data']).ok, true);
    await c.settle(); assert.equal(c.SV.denied(), 0, 'saved');
  } finally { c.dispose(); }
  const P1 = stored(W.env, KP);
  assert.deepEqual(P1.subs[D].emps, ['data', 'TEST_ONLY_newsub'], 'setDeptSubs: the user\'s change (custody OFF) and the unknown sub key carried');
  assert.deepEqual(P1.TEST_ONLY_future, { from: 'a newer build' }, 'permStore: the unknown top-level field is carried as stored');
});

test('③ the real client: p24SetGrant keeps the stored src when none is passed', async () => {
  const W = await scene();
  putKV(W.env, GK, { v: 1, emp: { [EK]: { plus: ['task.view'], minus: [], src: 'role:TEST_ONLY_r', at: 1, by: 'su' } } });
  const c = await clientOf(W, 'su');
  try {
    await c.settle();
    const r = c.P.p24.setGrant(EK, D, { plus: ['task.view'], minus: ['task.add'] });
    assert.equal(r.ok, true, JSON.stringify(r));
    const g = JSON.parse(c.T.W.localStorage.getItem(GK)).emp[EK];
    assert.equal(g.src, 'role:TEST_ONLY_r', 'the stored src is kept (was: dropped ⇒ the role-derived grant silently explicit): ' + JSON.stringify(g));
    const r2 = c.P.p24.setGrant(EK, D, { plus: ['task.view'], minus: [] }, 'p44:ex');
    assert.equal(r2.ok, true); assert.equal(JSON.parse(c.T.W.localStorage.getItem(GK)).emp[EK].src, 'p44:ex', 'a passed src still wins');
  } finally { c.dispose(); }
});

test('③ the real client: pruneOrphanEmpPerms deletes nothing for a manager (his accounts list is filtered)', async () => {
  const W = await scene();
  const before = JSON.stringify(stored(W.env, KP).emps[D]);
  const m = await clientOf(W, 'dm1');
  try {
    await m.settle();
    const r = m.P.pruneOrphanEmpPerms(D);
    assert.equal((r && r.removed) || 0, 0, 'nothing removed: ' + JSON.stringify(r));
    await m.settle(); assert.equal(m.SV.denied(), 0, 'no refused write');
  } finally { m.dispose(); }
  assert.equal(JSON.stringify(stored(W.env, KP).emps[D]), before, 'the stored sheets are byte-identical');
});
