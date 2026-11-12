/* RISHAD V7 · owner decision 1 — «مدير الإدارة في enforce يقرأ إشعارات الموظفين الموجّهة للمديرين».
   Real worker, real routes (/api/save with the Operations envelope, /api/notifications), legacy and enforce, synthetic data only
   (TEST_ONLY · tests/fixtures/gen_fixture.py + tasks_fx.mjs).

   Before: in enforce nfPage() looked for a registry atom of the container page «emps» (NF_CAP.emp), found none, and so no manager
   read emp_add / emp_del / emp_imp nor the manager side of emp_edit / emp_type — only the platform administrator and the employee
   himself. In legacy the unit manager and the general manager of the node read them.

   The rule (019 nfPage, enforce branch, READ of category «emp» only):
     manager role of the unit (isMgrOf) ∧ unit in scope ∧ «موظفو الإدارة» on the unit ceiling
     ∧ the legacy rule itself (the manager's effective sheet holds «view» on the container «emps»)
     ∧ the enforce key emp.view still held (an explicit minus drops it).
   So enforce == legacy for every probed account (READERS below is ONE table for both modes, measured in legacy on this fixture),
   narrowed only by an enforce «minus emp.view» on the manager himself (legacy has no grants).

   Three earlier attempts on this guard each opened a hole — the regressions a–f are mandatory in both modes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { world, stored, putKV, replaceOperationalFixture, D, KE } from './tasks_fx.mjs';
import { TEST_SUPER_USERNAME } from './harness.mjs';

const D2 = 'tst_d2', KG = 'bsdept:' + D + ':bassam_grants_v1';
const TYPES = ['emp_add', 'emp_edit', 'emp_type', 'emp_del', 'emp_imp', 'emp_wipe', 'emp_gap', 'emp_delm'];
const pbkdf2 = (pw, uid) => { const salt = crypto.createHash('sha256').update('v7-d1|' + uid).digest().subarray(0, 16); return 'p2$100000$' + salt.toString('hex') + '$' + crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex'); };
/* accounts added to the fixture: [id, username, password, role, unit, ekey, mgr, sheet (legacy pages), enforce grant] */
const EXTRA = [
  ['tst_da', '0000000140', '70140', 'dept', D, '', false, null, null],                                              /* the «dept» unit account */
  ['tst_cu', '0000000141', '70141', 'staff', D, 'tst_e_cu', false, { 'emps/custody': ['view', 'add', 'edit', 'del'] }, null],   /* (a) custody only */
  ['tst_fg', '0000000132', '70132', 'staff', D, 'tst_e_fg', false, { tasks: ['view'] }, { plus: ['ref.employment_type.delete'] }],   /* (b) */
  ['tst_m2', '0000000131', '70131', 'staff', D, 'tst_e_m2', true, { 'emps/data': ['view'] }, { minus: ['emp.view'] }],       /* (d) */
  ['tst_m5', '0000000143', '70143', 'staff', D, 'tst_e_m5', true, { 'emps/data': ['view'] }, null],                          /* as (d) with no minus: the legacy sheet rule alone keeps him out */
  ['tst_ev', '0000000142', '70142', 'staff', D, 'tst_e_ev', false, { emps: ['view'], 'emps/data': ['view', 'add', 'edit', 'del'] }, null],   /* staff, not a manager, full employees sheet */
];
const ACC = [['tst_dm1', '0000000101', '70101'], ['tst_dm2', '0000000102', '70102'], ['tst_dm3', '0000000104', '70104'], ['tst_gm1', '0000000103', '70103'],
  ['tst_sup1', '0000000111', '70111'], ['tst_emp1', '0000000113', '70113'], ['tst_imp', '0000000119', '70119']].concat(EXTRA.map((a) => a.slice(0, 3)));
const ALL = ['super'].concat(ACC.map((a) => a[0]));
/* MEASURED in legacy on this fixture (V7_D1_DUMP=1 prints the table of both modes); enforce must be identical.
   unit manager tst_dm1 (staff flagged mgr, key mgr:<unit>) · unit account tst_da (role dept) · general manager tst_gm1 (node holds the unit)
   · the employee tst_emp1 (his own emp_edit / emp_type only) · platform administrator (the «sys» targets). Nobody else. */
const READERS = {
  emp_add: ['tst_da', 'tst_dm1', 'tst_gm1'],
  emp_edit: ['tst_da', 'tst_dm1', 'tst_emp1', 'tst_gm1'],
  emp_type: ['tst_da', 'tst_dm1', 'tst_emp1', 'tst_gm1'],
  emp_del: ['super', 'tst_da', 'tst_dm1', 'tst_gm1'],
  emp_imp: ['super', 'tst_da', 'tst_dm1', 'tst_gm1'],
};

let seq = 0;
async function mk(mode) {
  const w = await world({ mode }), env = w.env;
  const U = stored(env, 'bassam_auth_users_v1'), P = stored(env, 'bassam_perms_v1'), E = stored(env, KE), G = mode === 'enforce' ? stored(env, KG) : null;
  for (const [id, un, pw, role, deptId, ekey, mgr, sheet, grant] of EXTRA) {
    const u = { id, un, ph: pbkdf2(pw, id), name: 'TEST_ONLY · ' + id, role, deptId, dis: 0, test: 'TEST_ONLY' };
    if (ekey) u.ekey = ekey; if (mgr) u.mgr = true; U.push(u);
    if (sheet) P.emps[deptId][ekey] = sheet;
    if (grant && G) G.emp[ekey] = Object.assign({ src: 'TEST_ONLY' }, grant);
    if (ekey) E.push({ eid: ekey, name: 'TEST_ONLY · ' + id, empno: pw, type: 'TEST_ONLY رسمي', work: 'TEST_ONLY مراقب' });
  }
  putKV(env, 'bassam_auth_users_v1', U); putKV(env, 'bassam_perms_v1', P); if (G) putKV(env, KG, G);
  await replaceOperationalFixture(env, KE, E);
  const superId = U.find((u) => u.role === 'super' && u.un === TEST_SUPER_USERNAME).id, cks = { super: w.su.ck }, ids = { super: superId };
  const ck = async (who) => { if (!cks[who]) { const a = ACC.find((x) => x[0] === who); cks[who] = (await w.login(a[1], a[2])).ck; ids[who] = who; } return cks[who]; };
  const api = async (who, path, o = {}) => w.C.api(path, Object.assign({}, o, { cookie: await ck(who) }));
  const read = async (who, key) => { const r = await api(who, '/api/operations/read?' + new URLSearchParams({ uid: ids[who] || who, keys: key })); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); return r.j; };
  const save = async (who, mutate, o = {}) => {
    await ck(who); const g = await read(who, KE), value = mutate(JSON.parse(JSON.stringify(g.resources[KE])));
    const body = { uid: ids[who], requestId: 'TEST_ONLY_d1_' + (++seq), epoch: g.epoch, set: { [KE]: JSON.stringify(value) }, del: [], base: { [KE]: g.base[KE] } };
    if (o.why) body.why = { [KE]: o.why };
    const r = await api(who, '/api/save', { method: 'POST', body }); return { status: r.status, j: r.j };
  };
  const emit = async (who, type) => { await ck(who); const r = await api(who, '/api/notifications/act', { method: 'POST', body: { uid: ids[who], op: 'emit', type, dept: D, own: ['tst_e_emp1'], vars: { 'الاسم': 'TEST_ONLY', 'المُعدّل': 'TEST_ONLY' } } }); return r.status; };
  const msgs = () => env.DB.q("SELECT * FROM notification_messages WHERE category='emp' ORDER BY created_at,id");
  const feedRaw = async (who, extra = {}) => { await ck(who); return api(who, '/api/notifications?' + new URLSearchParams(Object.assign(who === 'super' ? { uid: ids.super, all: '1' } : { uid: ids[who] || who }, extra))); };
  const feed = async (who) => { const r = await feedRaw(who); assert.equal(r.status, 200, who + ' feed ' + JSON.stringify(r.j).slice(0, 200)); return r.j.items.filter((m) => TYPES.includes(m.type)); };
  const readers = async (type, accounts) => { const out = []; for (const who of accounts || ALL) if ((await feed(who)).some((m) => m.type === type)) out.push(who); return out.sort(); };
  const denied = () => env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act='denied'")[0].n;
  return { w, env, mode, api, save, emit, msgs, feed, feedRaw, readers, denied };
}
const ok = (r, what) => { assert.equal(r.status, 200, what + ': ' + JSON.stringify(r.j).slice(0, 400)); assert.equal(r.j.ok, 1, what); };
const NEW = (n) => ({ eid: 'tst_e_new' + n, name: 'TEST_ONLY · جديد ' + n, empno: String(99000 + n), type: 'TEST_ONLY رسمي', work: 'TEST_ONLY مراقب' });
/* one of each manager-targeted event, by the unit manager, through the real save */
async function produce(x, who = 'tst_dm1') {
  ok(await x.save(who, (v) => v.concat([NEW(1)])), 'add one');
  ok(await x.save(who, (v) => { v.find((e) => e.eid === 'tst_e_emp1').phone = '0500000001'; return v; }), 'edit');
  ok(await x.save(who, (v) => { v.find((e) => e.eid === 'tst_e_emp1').type = 'TEST_ONLY متعاقد'; return v; }), 'type');
  ok(await x.save(who, (v) => v.concat([2, 3, 4, 5, 6].map(NEW))), 'add five');
  ok(await x.save(who, (v) => v.filter((e) => e.eid !== 'tst_e_new1'), { why: 'TEST_ONLY حذف' }), 'delete one');
  assert.deepEqual(x.msgs().map((m) => m.type).sort(), ['emp_add', 'emp_del', 'emp_edit', 'emp_imp', 'emp_type']);
}

for (const mode of ['legacy', 'enforce']) {
  /* ── the reproduction (fails on 09a5fe8 in enforce: the manager's feed is empty) ── */
  test('V7 D1 · ' + mode + ': the unit manager adds an employee through the real save → his own feed contains «emp_add»', async () => {
    const x = await mk(mode), before = x.denied();
    ok(await x.save('tst_dm1', (v) => v.concat([NEW(1)])), 'the save');
    const mine = await x.feed('tst_dm1');
    assert.deepEqual(mine.map((m) => m.type), ['emp_add'], 'GET /api/notifications?uid=<manager> holds the notice of his own unit');
    assert.equal(mine[0].srv, 1, 'issued by the server');
    assert.equal(x.denied(), before, 'no «denied» row');
  });

  /* ── who reads: one table for both modes ── */
  test('V7 D1 · ' + mode + ': manager-targeted employee notices reach the unit manager, the unit account and the general manager of the node — and nobody else (enforce == legacy)', async () => {
    const x = await mk(mode); await produce(x);
    if (process.env.V7_D1_DUMP === '1') { const t = {}; for (const type of Object.keys(READERS)) t[type] = await x.readers(type); console.log(mode, JSON.stringify(t)); }
    for (const type of Object.keys(READERS)) assert.deepEqual(await x.readers(type), READERS[type], mode + ' ' + type + ' readers');
    /* (a) staff holder of emps/custody only · (b) tasks:view + plus ref.employment_type.delete · (c) managers of other units ·
       (d) manager-flagged account whose own sheet is emps/data:view only (enforce: minus emp.view) · a non-manager with the whole
       employees sheet · the supervisor and the importer who hold emps/data */
    for (const who of ['tst_cu', 'tst_fg', 'tst_dm2', 'tst_dm3', 'tst_m2', 'tst_m5', 'tst_ev', 'tst_sup1', 'tst_imp'])
      assert.deepEqual(await x.feed(who), [], who + ' reads no employee notice of this unit');
    /* the employee reads his own two and no manager-only one */
    assert.deepEqual((await x.feed('tst_emp1')).map((m) => m.type).sort(), ['emp_edit', 'emp_type']);
    /* a foreign manager asking for this unit by name gets nothing either */
    const r = await x.feedRaw('tst_dm2', { dept: D });
    assert.ok(r.status !== 200 || !r.j.items.some((m) => TYPES.includes(m.type)), 'dept=<other unit> does not open it');
  });

  /* ── (b) + (e): nobody causes one from the client, and the stray-key holder cannot cause one through the save ── */
  test('V7 D1 · ' + mode + ': client emit of emp_* stays dropped for every account, and the stray-key staff cannot cause one through the save', async () => {
    const x = await mk(mode);
    for (const who of ['tst_fg', 'tst_cu', 'tst_m2', 'tst_ev', 'tst_da', 'tst_dm1', 'tst_gm1', 'super']) for (const type of ['emp_add', 'emp_edit', 'emp_type', 'emp_del', 'emp_imp', 'emp_wipe']) {
      const before = x.denied(); assert.equal(await x.emit(who, type), 200, who + ' ' + type + ' dropped, not refused');
      assert.equal(x.denied(), before); assert.deepEqual(x.msgs(), [], who + ' ' + type + ' produced nothing');
    }
    const all = stored(x.env, KE);
    for (const who of ['tst_fg', 'tst_cu']) {
      const r = await x.api(who, '/api/save', { method: 'POST', body: { uid: who, requestId: 'TEST_ONLY_d1_x_' + (++seq), epoch: Number(x.env.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0),
        set: { [KE]: JSON.stringify(all.filter((e) => e.eid !== 'tst_e_emp1')) }, del: [], base: { [KE]: x.env.DB.q('SELECT rev FROM revs WHERE k=?', KE)[0]?.rev ?? 0 }, why: { [KE]: 'TEST_ONLY محاولة' } } });
      assert.equal(r.status, 403, who + ' save refused: ' + JSON.stringify(r.j).slice(0, 200));
    }
    assert.equal(stored(x.env, KE).length, all.length); assert.deepEqual(x.msgs(), []);
    for (const who of ['super', 'tst_dm1', 'tst_da', 'tst_gm1']) assert.deepEqual(await x.feed(who), [], who + ' received nothing');
  });

  /* ── (f) the unit ceiling switches «موظفو الإدارة» off ── */
  test('V7 D1 · ' + mode + ': «موظفو الإدارة» off on the unit ceiling → only the platform administrator (and the employee, his own) still read', async () => {
    const x = await mk(mode); await produce(x);
    const P = stored(x.env, 'bassam_perms_v1'); P.caps[D] = P.caps[D].filter((k) => k !== 'emps'); putKV(x.env, 'bassam_perms_v1', P);
    for (const who of ['tst_dm1', 'tst_da', 'tst_gm1', 'tst_m2', 'tst_ev', 'tst_cu', 'tst_fg', 'tst_dm2', 'tst_sup1', 'tst_imp'])
      assert.deepEqual(await x.feed(who), [], who + ' reads nothing once the ceiling is off');
    assert.deepEqual((await x.feed('super')).map((m) => m.type).sort(), ['emp_del', 'emp_imp'], 'the platform administrator keeps his «sys» targets');
    assert.deepEqual((await x.feed('tst_emp1')).map((m) => m.type).sort(), ['emp_edit', 'emp_type'], 'the employee keeps the notices addressed to himself (as on 09a5fe8)');
  });
}

/* ── the enforce narrowing: an explicit minus on the manager himself ── */
test('V7 D1 · enforce: a «minus emp.view» on the unit manager drops the employee notices from his feed, and only his', async () => {
  const x = await mk('enforce'); await produce(x);
  assert.equal((await x.feed('tst_dm1')).length, 5);
  const G = stored(x.env, KG); G.emp['mgr:' + D] = Object.assign({}, G.emp['mgr:' + D], { minus: ['emp.view'] }); putKV(x.env, KG, G);
  assert.deepEqual(await x.feed('tst_dm1'), [], 'the manager whose emp.view is dropped reads none');
  assert.equal((await x.feed('tst_gm1')).length, 5, 'the general manager is untouched');
});
