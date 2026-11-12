/* RISHAD V7 · issue #1 — employee notifications are issued by the SERVER when it accepts the save (owner decision), as the
   irshad / seized / award domains already do; the browser no longer emits them and the server refuses them from any client.
   Real worker, real routes (/api/save with the Operations envelope, /api/employees/transition, /api/notifications), legacy and
   enforce, synthetic data only (TEST_ONLY · tests/fixtures/gen_fixture.py + tasks_fx.mjs).

   Why: the browser diffed the employee register and POSTed /api/notifications/act {op:'emit'}; in enforce mode the server could
   not authorise the sender («emps» is a container with no registry atom), so a legitimate unit manager got 403 notification-scope
   and a false «denied» security row. Three attempts to patch that guard each opened a forgery hole.

   RECIPIENTS ARE PINNED FROM e34fa23. The table RECIPIENTS below was MEASURED on the e34fa23 worker (develop, before this change)
   by letting an authorised actor emit each type from the client — the unit manager in legacy, the platform administrator in
   enforce (the only sender e34fa23 accepted there) — and then reading /api/notifications as every probed account. The same
   measurement can be repeated at any time against that worker:
     V7_ISSUE1_BASELINE=1 KIVO_WORKER=<e34fa23 _worker.js> node --test tests/unit/v7_issue1_srv_emp_notif.test.mjs
   (in that mode only the «recipients» tests run, driven by the client emit instead of the save).

   OWNER DECISION 1 (after issue #1) changed who READS in enforce, deliberately: on e34fa23 nobody but the platform administrator
   and the employee himself read these there; now the unit manager and the general manager of the node read the manager-targeted
   ones exactly as in legacy (tests/unit/v7_d1_enforce_mgr_emp_notif.test.mjs). RECIPIENTS.enforce is therefore the legacy row —
   the e34fa23 enforce measurement is kept as RECIPIENTS.enforce_e34fa23 and is what the BASELINE mode compares against. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { world, stored, putKV, replaceOperationalFixture, P0, D, KE } from './tasks_fx.mjs';
import { TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

const BASELINE = process.env.V7_ISSUE1_BASELINE === '1';
const D2 = 'tst_d2', KE2 = 'bsdept:' + D2 + ':bassam_employees_v1', KG = 'bsdept:' + D + ':bassam_grants_v1';
const TYPES = ['emp_add', 'emp_edit', 'emp_type', 'emp_del', 'emp_imp', 'emp_wipe', 'emp_gap'];
const pbkdf2 = (pw, uid) => { const salt = crypto.createHash('sha256').update('v7-issue1|' + uid).digest().subarray(0, 16); return 'p2$100000$' + salt.toString('hex') + '$' + crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex'); };
/* probed accounts: [name, username, password] — «super» is the platform administrator (reads with all=1, as his page does) */
const ACC = [['tst_dm1', '0000000101', '70101'], ['tst_dm2', '0000000102', '70102'], ['tst_gm1', '0000000103', '70103'], ['tst_sup1', '0000000111', '70111'],
  ['tst_emp1', '0000000113', '70113'], ['tst_imp', '0000000119', '70119'], ['tst_m2', '0000000131', '70131'], ['tst_fg', '0000000132', '70132'], ['tst_p0e1', P0[0].un, P0[0].pw]];
/* MEASURED on e34fa23 (see header). tst_m2 = manager-flagged account whose own sheet holds only emps/data:view (enforce: minus
   emp.view) · tst_fg = staff with tasks:view (enforce: plus ref.employment_type.delete) · tst_sup1 / tst_imp hold emps/data. */
const RECIPIENTS = {
  legacy: { emp_add: ['tst_dm1', 'tst_gm1'], emp_edit: ['tst_dm1', 'tst_emp1', 'tst_gm1'], emp_type: ['tst_dm1', 'tst_emp1', 'tst_gm1'],
    emp_del: ['super', 'tst_dm1', 'tst_gm1'], emp_imp: ['super', 'tst_dm1', 'tst_gm1'], emp_wipe: ['super'] },
  enforce_e34fa23: { emp_add: [], emp_edit: ['tst_emp1'], emp_type: ['tst_emp1'], emp_del: ['super'], emp_imp: ['super'], emp_wipe: ['super'] },
};
RECIPIENTS.enforce = BASELINE ? RECIPIENTS.enforce_e34fa23 : RECIPIENTS.legacy;   /* owner decision 1: enforce reads as legacy */

let seq = 0;
async function mk(mode) {
  const w = await world({ mode }), env = w.env;
  const U = stored(env, 'bassam_auth_users_v1');
  U.push({ id: 'tst_m2', un: '0000000131', ph: pbkdf2('70131', 'tst_m2'), name: 'TEST_ONLY · مدير بورقة عرض', role: 'staff', deptId: D, ekey: 'tst_e_m2', mgr: true, dis: 0, test: 'TEST_ONLY' },
         { id: 'tst_fg', un: '0000000132', ph: pbkdf2('70132', 'tst_fg'), name: 'TEST_ONLY · موظف مهام', role: 'staff', deptId: D, ekey: 'tst_e_fg', dis: 0, test: 'TEST_ONLY' });
  putKV(env, 'bassam_auth_users_v1', U);
  const P = stored(env, 'bassam_perms_v1'); P.emps[D].tst_e_m2 = { 'emps/data': ['view'] }; P.emps[D].tst_e_fg = { tasks: ['view'] }; putKV(env, 'bassam_perms_v1', P);
  if (mode === 'enforce') { const G = stored(env, KG); G.emp.tst_e_m2 = { minus: ['emp.view'], src: 'TEST_ONLY' }; G.emp.tst_e_fg = { plus: ['ref.employment_type.delete'], src: 'TEST_ONLY' }; putKV(env, KG, G); }
  const E = stored(env, KE); E.push({ eid: 'tst_e_m2', name: 'TEST_ONLY · مدير بورقة عرض', empno: '70131', type: 'TEST_ONLY رسمي', work: 'TEST_ONLY مراقب' }, { eid: 'tst_e_fg', name: 'TEST_ONLY · موظف مهام', empno: '70132', type: 'TEST_ONLY رسمي', work: 'TEST_ONLY مراقب' });
  await replaceOperationalFixture(env, KE, E);
  const superId = U.find((u) => u.role === 'super' && u.un === TEST_SUPER_USERNAME).id, cks = { super: w.su.ck }, ids = { super: superId };
  const ck = async (who) => { if (!cks[who]) { const a = ACC.find((x) => x[0] === who); cks[who] = (await w.login(a[1], a[2])).ck; ids[who] = who; } return cks[who]; };
  const api = async (who, path, o = {}) => w.C.api(path, Object.assign({}, o, { cookie: await ck(who) }));
  const read = async (who, key) => { const r = await api(who, '/api/operations/read?' + new URLSearchParams({ uid: ids[who] || who, keys: key })); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); return r.j; };
  /* a save exactly as any HTTP caller sends it: read → edit what was read → Operations envelope */
  const save = async (who, mutate, o = {}) => {
    const key = o.key || KE; await ck(who); const g = o.read || await read(who, key), value = mutate(JSON.parse(JSON.stringify(g.resources[key])));
    const body = { uid: ids[who], requestId: o.requestId || 'TEST_ONLY_issue1_' + (++seq), epoch: g.epoch, set: { [key]: JSON.stringify(value) }, del: [], base: { [key]: g.base[key] } };
    if (o.why) body.why = { [key]: o.why };
    const r = await api(who, '/api/save', { method: 'POST', body }); return { status: r.status, j: r.j, body, read: g };
  };
  const transition = async (who, dept, deleteMode, keep, requestId) => {
    await ck(who); const c = await api(who, '/api/employees/transition?' + new URLSearchParams({ uid: ids[who], dept, intent: 'delete' })); assert.equal(c.status, 200, JSON.stringify(c.j).slice(0, 300));
    const body = { uid: ids[who], dept, intent: 'delete', deleteMode, requestId: requestId || 'TEST_ONLY_issue1_tr_' + (++seq), base: c.j.base, finalRows: c.j.employees.filter(keep), reason: 'TEST_ONLY ' + deleteMode };
    const r = await api(who, '/api/employees/transition', { method: 'POST', body }); return { status: r.status, j: r.j, body };
  };
  const emit = async (who, type, extra = {}) => { await ck(who); const r = await api(who, '/api/notifications/act', { method: 'POST', body: Object.assign({ uid: ids[who], op: 'emit', type, dept: D, vars: { 'الاسم': 'TEST_ONLY', 'المُعدّل': 'TEST_ONLY' } }, extra) }); return { status: r.status, err: r.j && r.j.err }; };
  const msgs = () => { const t = env.DB.q('SELECT scope,message_id,kind,value FROM notification_targets'); return env.DB.q("SELECT * FROM notification_messages WHERE category='emp' ORDER BY created_at,id").map((m) => Object.assign({}, m, {
    own: t.filter((x) => x.scope === m.scope && x.message_id === m.id && x.kind === 'employee').map((x) => x.value).sort(), roles: t.filter((x) => x.scope === m.scope && x.message_id === m.id && x.kind === 'role').map((x) => x.value).sort() })); };
  const of = (type) => msgs().filter((m) => m.type === type);
  const denied = () => env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act='denied'")[0].n;
  const feed = async (who) => { const r = await api(who, '/api/notifications?' + new URLSearchParams(who === 'super' ? { uid: ids.super, all: '1' } : { uid: ids[who] || who })); assert.equal(r.status, 200, who + ' feed ' + JSON.stringify(r.j).slice(0, 200)); return r.j.items; };
  const readers = async (type, accounts) => { const out = []; for (const who of accounts || ['super'].concat(ACC.map((a) => a[0]))) { await ck(who); if ((await feed(who)).some((m) => m.type === type)) out.push(who); } return out.sort(); };
  return { w, env, mode, api, read, save, transition, emit, msgs, of, denied, feed, readers, superId };
}
const ok = (r, what) => { assert.equal(r.status, 200, what + ': ' + JSON.stringify(r.j).slice(0, 400)); assert.equal(r.j.ok, 1, what); };
const NEW = (n) => ({ eid: 'tst_e_new' + n, name: 'TEST_ONLY · جديد ' + n, empno: String(99000 + n), type: 'TEST_ONLY رسمي', work: 'TEST_ONLY مراقب' });
const addOne = (v) => v.concat([NEW(1)]);
const DM1 = 'TEST_ONLY · مدير الإدارة ١';

for (const mode of ['legacy', 'enforce']) {
  /* ── b · recipients unchanged (runs on e34fa23 too, see header) ── */
  test('V7 #1 srv · ' + mode + ': each employee notification reaches exactly the accounts that received it on e34fa23', async () => {
    const x = await mk(mode), want = RECIPIENTS[mode];
    if (BASELINE) {
      const actor = mode === 'enforce' ? 'super' : 'tst_dm1';
      for (const type of ['emp_add', 'emp_edit', 'emp_type', 'emp_del', 'emp_imp']) assert.equal((await x.emit(actor, type, { own: ['tst_e_emp1'] })).status, 200, 'baseline client emit ' + type);
    } else {
      ok(await x.save('tst_dm1', addOne), 'add one');
      ok(await x.save('tst_dm1', (v) => { v.find((e) => e.eid === 'tst_e_emp1').phone = '0500000001'; return v; }), 'edit');
      ok(await x.save('tst_dm1', (v) => { v.find((e) => e.eid === 'tst_e_emp1').type = 'TEST_ONLY متعاقد'; return v; }), 'type');
      ok(await x.save('tst_dm1', (v) => v.concat([2, 3, 4, 5, 6].map(NEW))), 'add five');
      ok(await x.save('tst_dm1', (v) => v.filter((e) => e.eid !== 'tst_e_new1'), { why: 'TEST_ONLY حذف' }), 'delete one');
    }
    for (const type of ['emp_add', 'emp_edit', 'emp_type', 'emp_del', 'emp_imp']) {
      assert.equal(x.of(type).length, 1, 'exactly one ' + type + ' message: ' + JSON.stringify(x.msgs().map((m) => m.type)));
      assert.deepEqual(await x.readers(type), want[type], type + ' recipients are those measured on e34fa23 (enforce: the legacy row — owner decision 1)');
    }
    /* mandatory test 2: the manager-flagged account with a view-only sheet reads none of the manager-targeted ones (as on e34fa23) */
    assert.deepEqual((await x.feed('tst_m2')).filter((m) => TYPES.includes(m.type)), [], 'tst_m2 reads no emp_* (identical to e34fa23)');
    assert.deepEqual((await x.feed('tst_fg')).filter((m) => TYPES.includes(m.type)), [], 'tst_fg reads no emp_*');
    /* the wipe: another unit (its accounts are removed with it), by the platform administrator */
    if (BASELINE) assert.equal((await x.emit(mode === 'enforce' ? 'super' : 'tst_dm2', 'emp_wipe', { dept: D2 })).status, 200, 'baseline client emit emp_wipe');
    else ok(await x.transition('super', D2, 'all', () => false), 'wipe by the platform administrator');
    assert.equal(x.of('emp_wipe').length, 1, 'exactly one emp_wipe message');
    assert.deepEqual(await x.readers('emp_wipe', ['super', 'tst_dm1', 'tst_dm2', 'tst_gm1', 'tst_m2']), want.emp_wipe, 'emp_wipe recipients are those measured on e34fa23');
  });
  if (BASELINE) continue;

  /* ── a · reproduction ── */
  test('V7 #1 srv · ' + mode + ': the unit manager adds an employee through the real save → the server issues «emp_add» itself, with no «denied» row', async () => {
    const x = await mk(mode), before = x.denied();
    ok(await x.save('tst_dm1', addOne), 'the save');
    const m = x.of('emp_add');
    assert.equal(m.length, 1, 'the save alone produced the notification (e34fa23: none without the browser emit)');
    assert.equal(m[0].scope, 'd:' + D); assert.equal(m[0].department, D); assert.equal(m[0].server_origin, 1, 'issued by the server');
    assert.deepEqual(m[0].roles, ['mgr']); assert.deepEqual(m[0].own, []);
    assert.equal(m[0].body, 'أُضيف TEST_ONLY · جديد 1 (TEST_ONLY رسمي) إلى موظفي الإدارة', 'wording as the browser emitted it');
    assert.equal(m[0].author_key, 'mgr:' + D); assert.equal(m[0].author_name, DM1);
    assert.equal(x.denied(), before, 'no false security alert');
    assert.ok((await x.feed('tst_dm1')).some((i) => i.type === 'emp_add' && i.srv === 1), 'and it is in the manager\'s feed');
    /* the retired browser emit is refused — it is no longer how the event is produced (e34fa23 enforce: 403 notification-scope for the legitimate manager) */
    const r = await x.emit('tst_dm1', 'emp_add');
    assert.equal(r.status, 200, 'dropped, not refused'); assert.equal(x.msgs().length, m.length, 'and it produced nothing');
    assert.equal(x.of('emp_add').length, 1, 'and adds nothing');
  });

  /* ── wording, variables and conditions of every type, as the browser watcher had them ── */
  test('V7 #1 srv · ' + mode + ': wording, targets and conditions of every type are those of the retired browser watcher', async () => {
    const x = await mk(mode);
    /* edit: several fields, the e-mail is never announced; type + another field give both events, each to the employee and the managers */
    ok(await x.save('tst_dm1', (v) => { Object.assign(v.find((e) => e.eid === 'tst_e_emp1'), { phone: '0500000001', email: 'test_only@example.invalid', type: 'TEST_ONLY متعاقد', name: 'TEST_ONLY · موظف معدَّل' }); return v; }), 'edit');
    let m = x.msgs().sort((a, b) => (a.type < b.type ? 1 : -1));
    assert.deepEqual(m.map((i) => i.type), ['emp_type', 'emp_edit']);
    assert.equal(m[0].body, 'تغيّر نوع التوظيف إلى «TEST_ONLY متعاقد»'); assert.deepEqual(m[0].own, ['tst_e_emp1']); assert.deepEqual(m[0].roles, ['mgr']);
    assert.equal(m[1].body, 'عُدّلت بياناتك: الاسم، الجوال — بواسطة ' + DM1); assert.deepEqual(m[1].own, ['tst_e_emp1']); assert.deepEqual(m[1].roles, ['mgr']);
    /* e-mail alone, or a field outside the announced nine: nothing */
    ok(await x.save('tst_dm1', (v) => { Object.assign(v.find((e) => e.eid === 'tst_e_emp1'), { email: 'test_only2@example.invalid' }); return v; }), 'e-mail only');
    assert.equal(x.msgs().length, 2, 'an e-mail-only change announces nothing');
    /* four added: four emp_add · five added: one emp_imp (with the count of changed records) and no emp_add */
    ok(await x.save('tst_dm1', (v) => v.concat([1, 2, 3, 4].map(NEW))), 'add four');
    assert.equal(x.of('emp_add').length, 4); assert.equal(x.of('emp_imp').length, 0);
    ok(await x.save('tst_dm1', (v) => { v.find((e) => e.eid === 'tst_e_sup1').phone = '0500000002'; return v.concat([5, 6, 7, 8, 9].map(NEW)); }), 'add five and change one');
    assert.equal(x.of('emp_add').length, 4, 'five or more added are one import event, not five additions');
    m = x.of('emp_imp'); assert.equal(m.length, 1); assert.equal(m[0].body, 'استُورد 5 موظفاً جديداً وحُدّث 1 — بواسطة ' + DM1); assert.deepEqual(m[0].roles, ['mgr', 'sys']);
    assert.equal(x.of('emp_edit').length, 2, 'the changed record of that save is still announced to its employee');
    /* delete two: one emp_del each, to managers and the platform administrator */
    ok(await x.save('tst_dm1', (v) => v.filter((e) => !['tst_e_new1', 'tst_e_new2'].includes(e.eid)), { why: 'TEST_ONLY حذف' }), 'delete two');
    m = x.of('emp_del'); assert.equal(m.length, 2);
    assert.deepEqual(m.map((i) => i.body).sort(), ['حُذف TEST_ONLY · جديد 1 من الإدارة بواسطة ' + DM1, 'حُذف TEST_ONLY · جديد 2 من الإدارة بواسطة ' + DM1]);
    assert.deepEqual(m[0].roles, ['mgr', 'sys']); assert.equal(m[0].priority, 'act');
    assert.ok(x.msgs().every((i) => i.server_origin === 1 && i.scope === 'd:' + D), 'all issued by the server in the unit scope');
    /* wipe (the employee transition route — not the browser client): one urgent emp_wipe to the platform administrator, no emp_del flood */
    const n = x.msgs().length; ok(await x.transition('super', D2, 'all', () => false), 'wipe');
    m = x.of('emp_wipe'); assert.equal(m.length, 1); assert.equal(x.msgs().length, n + 1, 'nothing but the one emp_wipe');
    assert.equal(m[0].body, 'حُذف كل موظفي إدارة TEST_ONLY · إدارة اختبار ٢ ونُظّفت بياناتها — بواسطة Test Administrator');
    assert.deepEqual(m[0].roles, ['sys']); assert.equal(m[0].priority, 'urg'); assert.equal(m[0].channel, 'toast'); assert.equal(m[0].department, D2); assert.equal(m[0].scope, 'sys');
    assert.deepEqual(stored(x.env, KE2), [], 'the unit is empty');
  });

  /* ── c · mandatory test 1 (the third reviewer's hole) ── */
  test('V7 #1 srv · ' + mode + ': nobody can make the server announce an employee event from the client — not a staff holder of a stray key, not a manager, not the platform administrator', async () => {
    const x = await mk(mode);
    for (const who of ['tst_fg', 'tst_m2', 'tst_imp', 'tst_dm1', 'tst_gm1', 'super']) for (const type of TYPES) {
      const before = x.denied(), r = await x.emit(who, type, { own: ['tst_e_emp1'] });
      assert.equal(r.status, 200, who + ' ' + type + ' is dropped silently (a stale tab must not lose its batch nor raise a false alert)');
      assert.equal(x.denied(), before, 'no «denied» row'); assert.deepEqual(x.msgs(), [], who + ' ' + type + ' produced no notification');
    }
    const batch = await x.api('tst_fg', '/api/notifications/act', { method: 'POST', body: { uid: 'tst_fg', op: 'emit-batch', events: [{ type: 'emp_wipe', dept: D, vars: {} }, { type: 'emp_del', dept: D, vars: {} }] } });
    assert.equal(batch.status, 200, 'nor in a batch: dropped');
    assert.deepEqual(x.msgs(), [], 'no employee notification exists');
    /* and the staff account cannot cause one through the save either: it holds no write on the register */
    const g = await x.api('tst_fg', '/api/operations/read?' + new URLSearchParams({ uid: 'tst_fg', keys: KE })), all = stored(x.env, KE);
    for (const [label, value] of [['delete one', all.filter((e) => e.eid !== 'tst_e_emp1')], ['empty the register', []]]) {
      const r = await x.api('tst_fg', '/api/save', { method: 'POST', body: { uid: 'tst_fg', requestId: 'TEST_ONLY_issue1_fg_' + (++seq), epoch: (g.j && g.j.epoch) || Number(x.env.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0),
        set: { [KE]: JSON.stringify(value) }, del: [], base: { [KE]: x.env.DB.q('SELECT rev FROM revs WHERE k=?', KE)[0]?.rev ?? 0 }, why: { [KE]: 'TEST_ONLY محاولة' } } });
      assert.equal(r.status, 403, label + ' is refused: ' + JSON.stringify(r.j).slice(0, 200));
    }
    const t = await x.api('tst_fg', '/api/employees/transition?' + new URLSearchParams({ uid: 'tst_fg', dept: D, intent: 'delete' }));
    assert.equal(t.status, 403, 'nor may he open the delete transition');
    assert.equal(stored(x.env, KE).length, all.length, 'the register is untouched');
    assert.deepEqual(x.msgs(), [], 'and still no emp_del / emp_wipe');
    for (const who of ['super', 'tst_dm1', 'tst_gm1']) assert.deepEqual((await x.feed(who)).filter((m) => TYPES.includes(m.type)), [], who + ' received nothing');
  });

  /* ── e · once per accepted save ── */
  test('V7 #1 srv · ' + mode + ': a replayed save and a conflict retry announce once; a refused save announces nothing; the transition route announces its own deletes', async () => {
    const x = await mk(mode);
    /* refused save: an employee with no write on the register */
    const refused = await x.save('tst_emp1', (v) => (Array.isArray(v) ? v : stored(x.env, KE)).concat([NEW(7)]), { read: { epoch: Number(x.env.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0), base: { [KE]: x.env.DB.q('SELECT rev FROM revs WHERE k=?', KE)[0].rev }, resources: { [KE]: stored(x.env, KE) } } });
    assert.equal(refused.status, 403, 'refused: ' + JSON.stringify(refused.j).slice(0, 200)); assert.deepEqual(x.msgs(), [], 'a refused save announces nothing');
    /* accepted, then the very same request again (lost response → the client re-sends it) */
    const first = await x.save('tst_dm1', addOne); ok(first, 'first');
    assert.equal(x.of('emp_add').length, 1);
    const again = await x.api('tst_dm1', '/api/save', { method: 'POST', body: first.body });
    assert.equal(again.status, 200, JSON.stringify(again.j).slice(0, 300)); assert.equal(again.j.duplicate, 1, 'the receipt is replayed');
    assert.equal(x.of('emp_add').length, 1, 'a replayed save announces nothing more');
    /* conflict: a save built on a stale read is refused and announces nothing; the retry on fresh data announces once */
    const stale = await x.read('tst_dm1', KE);
    ok(await x.save('tst_dm1', (v) => { v.find((e) => e.eid === 'tst_e_emp1').phone = '0500000009'; return v; }), 'concurrent edit');
    assert.equal(x.of('emp_edit').length, 1);
    const lost = await x.save('tst_dm1', (v) => v.concat([NEW(2)]), { read: stale });
    assert.equal(lost.status, 409, 'stale base: ' + JSON.stringify(lost.j).slice(0, 200)); assert.equal(x.of('emp_add').length, 1, 'a conflicting save announces nothing');
    ok(await x.save('tst_dm1', (v) => v.concat([NEW(2)])), 'retry on fresh data');
    assert.equal(x.of('emp_add').length, 2, 'the retry announces exactly once'); assert.equal(x.of('emp_edit').length, 1, 'and re-announces nothing of the earlier save');
    /* a caller that is not the browser's Operations client: the employee transition route */
    const tr = await x.transition('tst_dm1', D, 'selected', (e) => e.eid !== 'tst_e_new2'); ok(tr, 'transition delete');
    let m = x.of('emp_del'); assert.equal(m.length, 1); assert.equal(m[0].body, 'حُذف TEST_ONLY · جديد 2 من الإدارة بواسطة ' + DM1); assert.equal(m[0].server_origin, 1);
    const trAgain = await x.api('tst_dm1', '/api/employees/transition', { method: 'POST', body: tr.body });
    assert.equal(trAgain.status, 200, JSON.stringify(trAgain.j).slice(0, 300)); assert.equal(trAgain.j.duplicate, 1);
    assert.equal(x.of('emp_del').length, 1, 'a replayed transition announces nothing more');
    /* every message has its own idempotency key, and none was written twice */
    const keys = x.env.DB.q("SELECT once_key FROM notification_dedup WHERE once_key LIKE 'emp:%'").map((r) => r.once_key);
    assert.equal(keys.length, x.msgs().length); assert.equal(new Set(keys).size, keys.length);
    assert.equal(x.denied(), x.env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act='denied' AND uid='tst_emp1'")[0].n, 'the only «denied» rows are the refused save\'s own');
  });
}

/* ── the browser no longer emits them ── */
test('V7 #1 srv: the browser observer has no employee-register watcher and emits no emp_* type', { skip: BASELINE }, async () => {
  const fs = await import('node:fs'), path = await import('node:path');
  const src = fs.readFileSync(path.join(process.env.KIVO_SRC || path.resolve('src'), 'services', '442-notif-observer.js'), 'utf8');
  assert.ok(!/WATCH\['bassam_employees_v1'\]\s*=/.test(src), 'no watcher on the employee register');
  assert.ok(!/emit\(\s*'emp_/.test(src), 'no emp_* emit');
  for (const k of ['bassam_auth_users_v1', 'bassam_staffing_v3', 'bassam_tasks_v1', 'bassam_dreport_v1', 'bassam_rounds_v1', 'bassam_plan_v1']) assert.ok(src.includes("WATCH['" + k + "'] ="), 'the watcher of ' + k + ' is untouched');
});

/* ── second independent review of 9a37718 ── */
for (const mode of ['legacy', 'enforce']) {
  test('V7 #1 srv · ' + mode + ': a stale tab\'s batch [st_lock, emp_edit] keeps its st_lock and raises no «denied»; a very long employee name is bounded in the notice', async () => {
    const x = await mk(mode), before = x.denied();
    const r = await x.api('tst_dm1', '/api/notifications/act', { method: 'POST', body: { uid: 'tst_dm1', op: 'emit-batch', events: [{ type: 'st_lock', dept: D, vars: { 'الشهر': 'TEST_ONLY' } }, { type: 'emp_edit', dept: D, own: ['tst_e_emp1'], vars: {} }] } });
    assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 200));
    assert.equal(x.env.DB.q("SELECT COUNT(*) AS n FROM notification_messages WHERE type='st_lock'")[0].n, 1, 'the unrelated event of the batch is stored'); assert.equal(x.of('emp_edit').length, 0, 'the employee event is dropped');
    assert.equal(x.denied(), before, 'no false security row');
    const evil = 'TEST_ONLY ' + 'عاجل: اتصل بالرقم 0500000000 '.repeat(120);
    const a = await x.save('tst_dm1', (v) => v.concat([{ eid: 'tst_e_evil', name: evil, empno: '99123', type: 'T'.repeat(3000), work: 'TEST_ONLY مراقب' }]));
    assert.equal(a.status, 200, JSON.stringify(a.j).slice(0, 200));
    const m = x.of('emp_add'); assert.equal(m.length, 1); assert.ok(m[0].body.length < 320, 'bounded body: ' + m[0].body.length);
  });
}
