/* RISHAD-266 · s1 — department-scoped reference snapshot (workers/parts/019d rsReferenceSnapshot{departments}).
   Actual generated Worker + SQLite, enforce mode. A single-department operation references only the
   platform-global kv rows, its department's kv/meta rows and the operational resources it reads; every
   one of them is still fenced inside the write transaction (same 409 'conflict'), cross-department rows it
   legitimately reads are loaded on first read and fenced the same way, and another department's rows are
   neither loaded nor able to make the operation conflict. TEST_ONLY data; no network. */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { world, WCUR, D, DAY, ME, KT, KE, stored, operationSaveBody } from './tasks_fx.mjs';
import { TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
const copy = value => JSON.parse(JSON.stringify(value));
const originalFetch = globalThis.fetch;
let outbound = 0;
globalThis.fetch = async () => { outbound++; throw Error('TEST_ONLY outbound fetch forbidden'); };
after(() => { globalThis.fetch = originalFetch; assert.equal(outbound, 0); });
const D2 = 'tst_d2', K2E = 'bsdept:' + D2 + ':bassam_employees_v1', K2P = 'bsdept:' + D2 + ':bassam_plan_v1';
let serial = 0;
async function setup() {
  const B = await world({ worker: WCUR, mode: 'enforce' });
  const login = await B.login('0000000101', '70101');
  const api = (path, body, ck = login.ck) => B.C.api(path, { cookie: ck, ...(body === undefined ? {} : { method: 'POST', body }) });
  const base = async () => {
    const result = await api('/api/operations/read?keys=' + encodeURIComponent(KT));
    assert.equal(result.status, 200, JSON.stringify(result.j));
    return { epoch: result.j.epoch, base: result.j.base[KT] };
  };
  const settings = async () => {
    const row = stored(B.env, KT)[DAY].find(r => r[13] === 1760000000101);
    return { dept: D, requestId: 'TEST_ONLY_scoped_reference_' + ++serial, ...await base(), k: DAY, id: row[13], ekey: row[14],
      edit: { k: DAY, t: 'TEST_ONLY scoped edit ' + serial, desc: row[1] || '', prio: row[2], s: row[15], e: row[16], ekey: String(row[14]), wt: row[19] || null } };
  };
  return { ...B, api, base, settings, mgr: login };
}
function state(B) {
  const tables = B.env.DB.q("SELECT name FROM sqlite_master WHERE type='table' AND (name GLOB 'ops_*' OR name IN('kv','revs','meta','aud','restore_operations','restore_preimage','restore_snapshot_manifest')) ORDER BY name");
  return Object.fromEntries(tables.map(({ name }) => [name, copy(B.env.DB.q('SELECT * FROM ' + name)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
}
/* the request's own atomic commit: its operational rows, its receipt and its fences in one batch (never a one-time storage migration batch) */
const isCommit = statements => statements.some(s => /INSERT INTO ops_/.test(s.sql)) && statements.some(s => /INSERT INTO restore_operations\(account_uid/.test(s.sql)) && statements.some(s => /KIVO_RESTORE_TARGET/.test(s.sql));
const isReadFence = statements => statements.length > 0 && statements.every(s => /^SELECT CASE/.test(s.sql)) && statements.some(s => /KIVO_RESTORE_TARGET/.test(s.sql));
/* Runs one request; `change` runs once right before the batch `when` selects (the commit / the read fence), as a concurrent writer would.
   Returns the response, whether the change ran, and every argument bound to any batched statement of the request. */
async function race(B, when, change, run) {
  const DB = B.env.DB, batch = DB.batch.bind(DB), args = []; let ran = false;
  DB.batch = async statements => {
    statements.forEach(s => (s.args || []).forEach(a => args.push(a)));
    if (!ran && change && when(statements)) { ran = true; change(B.env.DB.db); }
    return batch(statements);
  };
  try { return { result: await run(), ran, args }; } finally { DB.batch = batch; }
}
const bump = (db, k) => db.prepare("INSERT INTO revs(k,rev) VALUES(?,1000) ON CONFLICT(k) DO UPDATE SET rev=rev+1").run(k);
/* Rows of another department in a witness: kv piece keys, operational revision pairs, empty-resource pairs and per-resource witness arguments. */
const foreign = (args, d) => args.filter(a => a === d || (typeof a === 'string' && (a.includes('"k":"bsdept:' + d + ':') || a.includes('["bsdept:' + d + ':') || a.includes('["' + d + '",'))));

test('A task command still fences every row it depends on: its resource, its department rows and the global authority keys (409 conflict)', async () => {
  const B = await setup();
  try {
    const changes = {
      'task resource revision': db => bump(db, KT),
      'global permissions (kv)': db => db.prepare("UPDATE kv SET v=json_set(v,'$.tstOnlyScoped',1) WHERE k='bassam_perms_v1' AND seq=0").run(),
      'global accounts (kv)': db => db.prepare("UPDATE kv SET v=json_set(v,'$[0].tstOnlyScoped',1) WHERE k='bassam_auth_users_v1' AND seq=0").run(),
      'department kv row': db => db.prepare("INSERT INTO kv(k,seq,v) VALUES('bsdept:" + D + ":bassam_tst_only_v1',0,'{}')").run(),
      'department meta row': db => db.prepare("INSERT INTO meta(k,v) VALUES('irshad:" + D + ":presence','7') ON CONFLICT(k) DO UPDATE SET v=CAST(CAST(v AS INTEGER)+64 AS TEXT)").run(),
      'department employees read by the command': db => bump(db, KE),
    };
    for (const [name, change] of Object.entries(changes)) {
      const body = await B.settings();
      let external;
      const { result, ran } = await race(B, isCommit, db => { change(db); external = state(B); }, () => B.api('/api/tasks/settings', body));
      assert.equal(ran, true, name + ': the change ran before the commit');
      assert.equal(result.status, 409, name + ': ' + JSON.stringify(result.j));
      assert.equal(result.j.err, 'conflict', name);
      assert.deepEqual(state(B), external, name + ': nothing of the command was written');
      B.env.DB.db.prepare("DELETE FROM kv WHERE k='bsdept:" + D + ":bassam_tst_only_v1'").run();
    }
    const body = await B.settings(), done = await B.api('/api/tasks/settings', body);
    assert.equal(done.status, 200, JSON.stringify(done.j)); assert.equal(done.j.atomic, 1);
  } finally { B.env.DB.db.close(); }
});

test('Another department neither conflicts with nor is loaded by a task command, a task self action or an operations read', async () => {
  const B = await setup();
  try {
    const other = db => {
      db.prepare("UPDATE kv SET v=json_set(v,'$.tstOnlyScoped',1) WHERE k='bsdept:" + D2 + ":bassam_scope_v1' AND seq=0").run();
      db.prepare("INSERT INTO kv(k,seq,v) VALUES('bsdept:" + D2 + ":bassam_grants_v1',0,?) ON CONFLICT(k,seq) DO UPDATE SET v=excluded.v").run(JSON.stringify({ v: 1, emp: { tst_e_emp2: { plus: [], minus: ['task.view'] } } }));
      db.prepare("INSERT INTO meta(k,v) VALUES('irshad:" + D2 + ":presence','1') ON CONFLICT(k) DO UPDATE SET v=CAST(CAST(v AS INTEGER)+64 AS TEXT)").run();
      db.prepare("INSERT INTO meta(k,v) VALUES('tkg:rec:" + D2 + "','TEST_ONLY') ON CONFLICT(k) DO UPDATE SET v=v||'x'").run();
      bump(db, K2P); bump(db, K2E);
    };
    assert.ok(B.env.DB.q("SELECT COUNT(*) n FROM kv WHERE k=?", 'bsdept:' + D2 + ':bassam_scope_v1')[0].n > 0, 'fixture: tst_d2 has its own kv rows');
    const body = await B.settings(), command = await race(B, isCommit, other, () => B.api('/api/tasks/settings', body));
    assert.equal(command.ran, true); assert.equal(command.result.status, 200, JSON.stringify(command.result.j)); assert.equal(command.result.j.atomic, 1);
    assert.deepEqual(foreign(command.args, D2), [], 'no row of tst_d2 is loaded or fenced by a tst_d1 task command');
    assert.deepEqual(foreign(command.args, 'tst_d3'), []);
    assert.ok(foreign(command.args, D).length > 0, 'its own department is fenced');
    const me = await B.login(ME.un, ME.pw);
    const self = await race(B, isCommit, other, () => B.api('/api/me/tasks/act', { k: DAY, id: 1760000000101, act: 'start' }, me.ck));
    assert.equal(self.ran, true); assert.equal(self.result.status, 200, JSON.stringify(self.result.j));
    assert.deepEqual(foreign(self.args, D2), [], 'no row of tst_d2 is loaded or fenced by a tst_d1 self action');
    const read = await race(B, isReadFence, other, () => B.api('/api/operations/read?keys=' + encodeURIComponent(KT)));
    assert.equal(read.ran, true); assert.equal(read.result.status, 200, JSON.stringify(read.result.j)); assert.ok(read.result.j.resources[KT]);
    assert.deepEqual(foreign(read.args, D2), [], 'no row of tst_d2 is loaded or fenced by a tst_d1 operations read');
  } finally { B.env.DB.db.close(); }
});

test('An operations read still fails closed (409 conflict) when a row it depends on changes before its fence', async () => {
  const B = await setup();
  try {
    for (const [name, change] of Object.entries({
      'the read resource': db => bump(db, KT),
      'global permissions (kv)': db => db.prepare("UPDATE kv SET v=json_set(v,'$.tstOnlyScoped',1) WHERE k='bassam_perms_v1' AND seq=0").run(),
      'department employees it projects with': db => bump(db, KE),
    })) {
      const { result, ran } = await race(B, isReadFence, change, () => B.api('/api/operations/read?keys=' + encodeURIComponent(KT)));
      assert.equal(ran, true, name); assert.equal(result.status, 409, name + ': ' + JSON.stringify(result.j)); assert.equal(result.j.err, 'conflict', name);
    }
  } finally { B.env.DB.db.close(); }
});

test('Cross-department rows a request legitimately reads are loaded on first read and fenced: other units’ rosters and a sector manager’s grants', async () => {
  const B = await setup();
  try {
    const su = await B.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN);
    const roster = async () => {
      const r = await B.api('/api/operations/read?keys=' + encodeURIComponent(KE), undefined, su.ck);
      assert.equal(r.status, 200, JSON.stringify(r.j));
      const list = r.j.resources[KE];
      return operationSaveBody(B.env, '/api/save', { set: { [KE]: JSON.stringify([{ eid: 'tst_e_scoped_' + ++serial, name: 'TEST_ONLY scoped ' + serial, nid: String(2900000100 + serial), empno: String(990000 + serial), type: 'TEST_ONLY' }].concat(list)) }, del: [], base: { [KE]: r.j.base[KE] } });
    };
    // A new identity in tst_d1 is checked against every other unit's roster (054 emp-dup): those rosters are read, so they are fenced.
    const first = await roster(), raced = await race(B, isCommit, db => bump(db, K2E), () => B.api('/api/save', first, su.ck));
    assert.equal(raced.ran, true);
    assert.equal(raced.result.status, 409, JSON.stringify(raced.result.j));
    const second = await roster(), clean = await race(B, isCommit, null, () => B.api('/api/save', second, su.ck));
    assert.equal(clean.result.status, 200, JSON.stringify(clean.result.j)); assert.ok(clean.result.j.revs[KE]);
    assert.ok(clean.args.some(a => typeof a === 'string' && a.includes('["' + K2E + '",')), 'the other unit roster read by the duplicate check is fenced by revision');
    // A sector manager's authority includes the explicit grants of every unit of its branch, read with its actor and fenced.
    const gm = await B.login('0000000103', '70103');
    const grants = db => db.prepare("INSERT INTO kv(k,seq,v) VALUES('bsdept:" + D2 + ":bassam_grants_v1',0,?) ON CONFLICT(k,seq) DO UPDATE SET v=excluded.v").run(JSON.stringify({ v: 1, emp: {} }));
    const gmRead = await race(B, isReadFence, grants, () => B.api('/api/operations/read?keys=' + encodeURIComponent(KT), undefined, gm.ck));
    assert.equal(gmRead.ran, true); assert.equal(gmRead.result.status, 409, JSON.stringify(gmRead.result.j)); assert.equal(gmRead.result.j.err, 'conflict');
    B.env.DB.db.prepare("DELETE FROM kv WHERE k='bsdept:" + D2 + ":bassam_grants_v1'").run();
    const tmRead = await race(B, isReadFence, grants, () => B.api('/api/operations/read?keys=' + encodeURIComponent(KT)));
    assert.equal(tmRead.ran, true); assert.equal(tmRead.result.status, 200, 'the tst_d1 manager does not depend on tst_d2 grants: ' + JSON.stringify(tmRead.result.j));
  } finally { B.env.DB.db.close(); }
});
