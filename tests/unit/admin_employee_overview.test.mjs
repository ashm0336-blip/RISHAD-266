/* Actual immutable generated Worker + schema10 SQL and actual Admin adVals.
   Synthetic data only; no real browser, Cloudflare, R2 or credential reads. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { candidateWorker } from './irshad_domain_fx.mjs';
import { D1Shim, ROOT } from './harness.mjs';

const A = 'TEST_ONLY_OV_A', B = 'TEST_ONLY_OV_B', GHOST = 'TEST_ONLY_OV_UNREGISTERED';
const RESOURCE = 'bassam_employees_v1';
const OWNER = 'TEST_ONLY_OV_OWNER', STAFF = 'TEST_ONLY_OV_STAFF';
const LEGACY_EMPLOYEE = 'TEST_ONLY legacy union employee';

async function fixture({ empty = false, mode = 'enforce', legacyString = false, legacyAccount = false } = {}) {
  const W = await candidateWorker(['opPrepared', 'opBulkInstall', 'ocConvert']);
  assert.equal(W.KIVO_SCHEMA_VERSION, 10);
  const DB = new D1Shim(), env = { DB, ...(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}), ASSETS: { fetch: async () => new Response('TEST_ONLY') } };
  await W.initDb(env); DB.exec('PRAGMA foreign_keys=ON');
  const hash = 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64);
  const users = [
    { id: OWNER, role: 'super', un: '9000001010', name: 'TEST_ONLY owner', ph: hash, dis: 0 },
    { id: STAFF, role: 'staff', deptId: A, ekey: 'TEST_ONLY_OV_LINKED', un: '9000001011', name: 'TEST_ONLY linked staff', ph: hash, dis: 0 },
    { id: 'TEST_ONLY_OV_MANAGER', role: 'staff', deptId: A, ekey: 'mgr:' + A, mgr: true, un: '9000001012', name: 'TEST_ONLY manager without employee', ph: hash, dis: 0 },
    { id: 'TEST_ONLY_OV_GM', role: 'gm', gid: 'TEST_ONLY_OV_GROUP', ekey: 'gm:TEST_ONLY_OV_GROUP', un: '9000001013', name: 'TEST_ONLY branch manager', ph: hash, dis: 0 },
    { id: 'TEST_ONLY_OV_FALLBACK', role: 'staff', deptId: B, ekey: 'TEST_ONLY_OV_FALLBACK_NID', un: '9000001014', name: 'TEST_ONLY fallback staff', ph: hash, dis: 0 },
  ];
  if (legacyAccount) users.push({ id: 'TEST_ONLY_OV_LEGACY', role: 'staff', deptId: A, ekey: LEGACY_EMPLOYEE,
    un: '9000001015', name: LEGACY_EMPLOYEE, ph: hash, dis: 0 });
  const departments = empty ? [] : [{ id: A, name: 'TEST_ONLY A' }, { id: B, name: 'TEST_ONLY B' }];
  const keys = { bassam_auth_users_v1: users, bassam_depts_v1: departments, bassam_perms_v1: { caps: {}, emps: {} } };
  const statements = [];
  for (const [key, value] of Object.entries(keys)) {
    statements.push(...W.kvPutStmts(env, 'kv', key, JSON.stringify(value)));
    statements.push(DB.prepare('INSERT INTO revs(k,rev)VALUES(?1,1)').bind(key));
  }
  statements.push(DB.prepare("INSERT INTO meta(k,v)VALUES('rev','1')ON CONFLICT(k)DO UPDATE SET v='1'"));
  statements.push(DB.prepare("INSERT INTO meta(k,v)VALUES('authz_mode',?1)ON CONFLICT(k)DO UPDATE SET v=excluded.v").bind(mode));
  for (const uid of [OWNER, STAFF]) statements.push(DB.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city)VALUES(?1,?2,?3,?3,?4,?4)')
    .bind('TEST_ONLY_OV_SESSION_' + uid, uid, Date.now(), 'TEST_ONLY'));
  await DB.batch(statements);
  async function employees(dept, value) {
    const domain = W.ocConvert(W.opPrepared(RESOURCE), dept, RESOURCE, value, true);
    await DB.batch(W.opBulkInstall(env, RESOURCE, domain));
  }
  if (!empty) {
    await employees(A, [{ eid: 'TEST_ONLY_OV_LINKED', name: 'TEST_ONLY linked' }, { eid: 'TEST_ONLY_OV_UNLINKED', name: 'TEST_ONLY no account' },
      ...(legacyString ? [LEGACY_EMPLOYEE] : [])]);
    await employees(B, [{ eid: 'TEST_ONLY_OV_LINKED', name: 'TEST_ONLY same key other department' },
      { eid: '', nid: 'TEST_ONLY_OV_FALLBACK_NID', name: 'TEST_ONLY fallback employee' }]);
  }
  await employees(GHOST, [{ eid: 'TEST_ONLY_OV_GHOST', name: 'TEST_ONLY excluded orphan' }]);
  const api = async (uid = OWNER) => {
    const headers = new Headers(); if (uid) headers.set('Cookie', 'bs_tok=TEST_ONLY_OV_SESSION_' + uid);
    const response = await W.default.fetch(new Request('http://x/api/overview', { headers }), env);
    return { status: response.status, json: await response.json() };
  };
  return { DB, W, env, users, departments, api };
}

function admin(overview, { failed = false } = {}) {
  const reads = [], owner = { id: OWNER, role: 'super' }, users = [owner, { id: STAFF, role: 'staff', deptId: A, ekey: 'TEST_ONLY_OV_LINKED' },
    { id: 'TEST_ONLY_MANAGER', role: 'staff', ekey: 'mgr:' + A, mgr: true }, { id: 'TEST_ONLY_GM', role: 'gm' }];
  const KIVO = {
    BassamPageKit: { base: () => class {} },
    BassamAuth: { user: () => owner, users: () => users, usersVer: () => 1, isSuper: () => true },
    BassamDepts: { active: () => A, list: () => [{ id: A }, { id: B }], raw: { getItem: key => { reads.push(key); throw Error('Retired employee KV read'); } } },
    BassamLink: { get: () => 'on' },
  };
  const context = { KIVO, DCLogic: class {}, Date, console, setTimeout, clearTimeout,
    __BS_BOOT: { cf: 1, srv: 1 }, localStorage: { getItem: () => null }, document: {}, location: { hash: '#/sysadmin/overview' } };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/440-count.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/modules/admin/logic.js'), 'utf8') + '\nglobalThis.TEST_ONLY_Admin=Component;', context);
  const page = Object.create(context.TEST_ONLY_Admin.prototype);
  page.state = { admTab: 'overview', adOv: overview, adErr: failed };
  page._fullStamp = () => '';
  page._expInfo = () => ({});
  page.adUsersVals = () => ({});
  return { page, reads, card: () => page.adVals().ovCards.find(card => card.l === 'الحسابات: نشط / مجمّد / بلا حساب') };
}

test('overview counts only registered typed employee records and matches staff accounts instead of subtracting managers', async () => {
  const f = await fixture(), batches = [], batch = f.DB.batch.bind(f.DB);
  f.DB.batch = statements => { batches.push(...statements); return batch(statements); };
  const response = await f.api();
  assert.equal(response.status, 200);
  assert.equal(response.json.employeeCount, 4, 'Registered A2+B2; unregistered typed row is excluded');
  assert.equal(response.json.employeeNoAccountCount, 2, 'Exact department/key match and nid fallback; manager/gm accounts do not subtract unrelated records');
  const aggregate = batches.filter(statement => /LEFT JOIN ops_employee_record/.test(statement.sql));
  assert.equal(aggregate.length, 1, 'One aggregate in the existing overview batch');
  assert.match(aggregate[0].sql, /^SELECT/i);
  const explain = f.DB.q('EXPLAIN QUERY PLAN ' + aggregate[0].sql, ...aggregate[0].args).map(row => row.detail).join('\n');
  assert.doesNotMatch(explain, /CORRELATED/i, 'Both membership lists are materialized once, not scanned per employee');
  assert.match(explain, /LIST SUBQUERY/i);
});

test('confirmed Admin overview uses server employee counts without any retired per-department Storage reads', () => {
  const f = admin({ ok: 1, employeeCount: 3, employeeNoAccountCount: 2 });
  assert.equal(f.card().sub, '3 موظفين في كل الإدارات');
  assert.equal(f.card().v, '4 / 0 / 2');
  assert.deepEqual(f.reads, []);
});

test('overview loading and failed reads do not masquerade as zero employees or zero missing accounts', () => {
  for (const [overview, failed] of [[undefined, false], [{ ok: 1, employeeCount: 3, employeeNoAccountCount: 2 }, true]]) {
    const f = admin(overview, { failed }), card = f.card();
    assert.match(card.sub, failed ? /تعذّر/ : /جارٍ/);
    assert.match(card.v, /—$/);
    assert.doesNotMatch(card.sub, /^0 /);
    assert.deepEqual(f.reads, []);
  }
});

test('a failed overview refresh invalidates the cached employee card even when the prior DTO object is retained', () => {
  const f = admin({ ok: 1, employeeCount: 3, employeeNoAccountCount: 2 });
  assert.match(f.card().sub, /^3 /);
  // adLoad retains the previous DTO when a refresh fails and sets adErr.
  f.page.state = { ...f.page.state, adErr: true, adTick: 1 };
  assert.match(f.card().sub, /تعذّر/);
  assert.match(f.card().v, /—$/);
});

test('a genuinely empty registered-department set returns confirmed zero counts despite orphan typed rows', async () => {
  const f = await fixture({ empty: true }), response = await f.api();
  assert.equal(response.status, 200);
  assert.equal(response.json.employeeCount, 0);
  assert.equal(response.json.employeeNoAccountCount, 0);
});

test('ordinary staff cannot retrieve cross-department employee overview aggregates', async () => {
  const f = await fixture();
  const response = await f.api(STAFF);
  assert.equal(response.status, 403);
  assert.equal(response.json.employeeCount, undefined);
  assert.equal((await f.api(null)).status, 401);
});

test('legacy non-super overview preserves the existing super-only guard without querying employee counts', async () => {
  const f = await fixture({ mode: 'legacy' }), batches = [], original = f.DB.batch.bind(f.DB);
  f.DB.batch = statements => { batches.push(...statements); return original(statements); };
  const response = await f.api(STAFF);
  // The unconditional guard before /api/overview also applies in legacy mode.
  // The same fixture against the prior HEAD Worker returned 403 before this fix.
  assert.equal(response.status, 403);
  assert.equal(response.json.err, 'forbidden');
  assert.equal(response.json.employeeCount, undefined);
  assert.equal(response.json.employeeNoAccountCount, undefined);
  const aggregate = batches.filter(statement => /LEFT JOIN ops_employee_record/.test(statement.sql));
  assert.equal(aggregate.length, 0, 'The existing role guard runs before the employee aggregate');
});

test('registered legacy string employee entries remain counted alongside typed employee objects', async () => {
  for (const legacyAccount of [false, true]) {
    const f = await fixture({ legacyString: true, legacyAccount }), response = await f.api();
    assert.equal(response.status, 200);
    assert.equal(response.json.employeeCount, 5, 'Preserve the old array-entry total including the accepted string union branch');
    assert.equal(response.json.employeeNoAccountCount, legacyAccount ? 2 : 3, 'String identity matches its own-department staff account');
  }
});
