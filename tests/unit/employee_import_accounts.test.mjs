/* RISHAD-266 · employee import never deletes an existing employee or account unless a deletion was asked for.
   add / update: no account is removed — not even one with no employee record (the live note: an unlinked TEST_ONLY account vanished).
   delete «selected»: only the deleted employees' accounts go. Full replace / delete «all»: every account without an employee goes, as
   before (that is the explicit request). Stale base: 409 and nothing written; a fresh read then commits with exact counts.
   Actual generated Worker over SQLite, synthetic TEST_ONLY data only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world as fixture, D1, IDS, EKEYS, copy } from './custody_review_fx.mjs';
import { installOperationalFixture, isOperationalFixtureKey, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';

const USERS = 'bassam_auth_users_v1', key = (n) => 'bsdept:' + D1 + ':' + n, IMPORT = (mode) => ({ mode, year: 1448, month: 1, schedule: [], templates: [] });
const ORPHAN = { id: 'TEST_ONLY_orphan_acct', un: '1900000777', alt: '', role: 'staff', deptId: D1, ekey: 'TEST_ONLY_orphan_ekey', name: 'TEST_ONLY unlinked account', dis: 0 };
async function world() {
  const f = await fixture({ mode: 'enforce' }), W = f.W;
  await installOperationalFixture(f.env);
  const put = async (k, v) => { if (isOperationalFixtureKey(f.env, k)) return replaceOperationalFixture(f.env, k, v); await f.DB.batch(W.kvPutStmts(f.env, 'kv', k, JSON.stringify(v))); };
  const donor = f.keys[USERS].find((u) => u.role === 'staff' && u.ph);
  const users = copy(f.keys[USERS]).concat([{ ...ORPHAN, ph: donor.ph }]);
  await put(USERS, users);
  const actor = async (who = 'super') => W.actorOf({ ...f.env, __enf: await W.enfModeOf(f.env) }, IDS[who]);
  const context = async (intent) => W.empTransitionContext(f.env, await actor(), D1, intent);
  const prepare = async (c, over) => W.empPrepareTransition(f.env, await actor(), { uid: IDS.super, dept: D1, intent: c.intent, requestId: 'TEST_ONLY_import_' + (++RID), base: c.base, finalRows: c.employees, ...over });
  const usersAfter = (out) => (out.body.set[USERS] ? JSON.parse(out.body.set[USERS]) : users);
  return { ...f, W, put, users, context, prepare, usersAfter };
}
let RID = 0;
const ids = (list) => list.map((u) => u.id).sort();

for (const mode of ['add', 'update'])
  test('import ' + mode + ': keeps every employee and every account, including one with no employee record', async () => {
    const t = await world(), c = await t.context('import');
    const rows = mode === 'add' ? c.employees.concat([{ eid: 'TEST_ONLY_new_row', name: 'TEST_ONLY new row' }])
      : c.employees.map((e, i) => (i === 0 && typeof e === 'object' ? { ...e, name: e.name + ' TEST_ONLY edited' } : e));
    const out = await t.prepare(c, { finalRows: rows, import: IMPORT(mode) });
    assert.equal(out.result.counts.removed, 0, 'no employee removed');
    assert.equal(out.result.counts.accountsRemoved, 0, 'no account removed');
    assert.deepEqual(ids(t.usersAfter(out)), ids(t.users), 'every account kept');
    assert.ok(t.usersAfter(out).some((u) => u.id === ORPHAN.id), 'the unlinked account is kept');
    assert.equal(JSON.parse(out.body.set[key('bassam_employees_v1')]).length, c.employees.length + (mode === 'add' ? 1 : 0));
  });

test('delete selected: only the deleted employee loses the account; the unlinked account stays', async () => {
  const t = await world(), c = await t.context('delete');
  const gone = c.employees.find((e) => (e.eid || e) === EKEYS.employee1);
  assert.ok(gone, 'fixture employee1 present');
  const out = await t.prepare(c, { finalRows: c.employees.filter((e) => e !== gone), deleteMode: 'selected' });
  const after = t.usersAfter(out), lost = t.users.filter((u) => !after.some((a) => a.id === u.id));
  assert.equal(out.result.counts.removed, 1);
  assert.deepEqual(lost.map((u) => u.ekey), [EKEYS.employee1], 'exactly the deleted employee account');
  assert.ok(after.some((u) => u.id === ORPHAN.id), 'unlinked account kept');
});

test('full replace (explicit): accounts without a remaining employee are removed, managers are kept', async () => {
  const t = await world(), c = await t.context('import');
  const keep = c.employees.find((e) => (e.eid || e) === EKEYS.employee1);
  const out = await t.prepare(c, { finalRows: [keep], import: IMPORT('replace') });
  const after = t.usersAfter(out);
  assert.ok(!after.some((u) => u.id === ORPHAN.id), 'replace removes the unlinked account');
  assert.ok(after.some((u) => u.ekey === EKEYS.employee1), 'the kept employee keeps the account');
  assert.ok(after.filter((u) => u.role === 'staff' && u.deptId === D1).every((u) => u.ekey === EKEYS.employee1 || /^mgr:/.test(u.ekey) || u.mgr), 'only kept employee and managers remain');
  assert.ok(out.result.counts.accountsRemoved > 0);
});

test('HTTP: stale base is refused (409) with nothing written; a fresh read commits; counts exact on the server', async () => {
  const t = await world();
  const n = async () => ({ users: (await t.api('super', '/api/get?keys=' + USERS)).json.keys[USERS], emps: (await t.api('super', '/api/employees/transition?dept=' + D1 + '&intent=import')).json.employees.length });
  const read = async () => (await t.api('super', '/api/employees/transition?dept=' + D1 + '&intent=import')).json;
  const c0 = await read(), u0 = JSON.parse((await n()).users.v);
  /* a concurrent account change bumps the users revision after c0 was read */
  const g = (await t.api('super', '/api/get?keys=' + USERS)).json.keys[USERS];
  const bump = await t.api('super', '/api/save', { method: 'POST', body: { uid: IDS.super, set: { [USERS]: g.v }, del: [], base: { [USERS]: g.rev } } });
  assert.equal(bump.status, 200);
  const body = (c, rid) => ({ uid: IDS.super, dept: D1, intent: 'import', requestId: rid, base: c.base, finalRows: c.employees.concat([{ eid: 'TEST_ONLY_http_row', name: 'TEST_ONLY http row' }]), import: IMPORT('update'), reason: 'TEST_ONLY' });
  const stale = await t.api('super', '/api/employees/transition', { method: 'POST', body: body(c0, 'TEST_ONLY_stale') });
  if (stale.status !== 409) assert.fail('stale base must conflict: ' + stale.status + ' ' + JSON.stringify(stale.json));
  const mid = await n();
  assert.equal(mid.emps, c0.employees.length, 'nothing written by the refused request');
  const c1 = await read();
  const okr = await t.api('super', '/api/employees/transition', { method: 'POST', body: body(c1, 'TEST_ONLY_fresh') });
  assert.equal(okr.status, 200, JSON.stringify(okr.json));
  const end = await n(), u1 = JSON.parse(end.users.v);
  assert.equal(end.emps, c0.employees.length + 1, 'employees +1');
  assert.deepEqual(ids(u1), ids(u0), 'accounts unchanged (same ids), unlinked one included');
});
