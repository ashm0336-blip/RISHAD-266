/* Actual schema10 Worker + SQLite. No business-policy mocks or network. */
import './clock.mjs';   /* V7 P3: ساعةُ الاختبار المثبَّتة (1448-5-9) — كان يُخفق في أول الشهر الهجري وبعد تبدّل الشهر (يُستورد أولاً) */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { world, WCUR, D, DAY, YESTERDAY, ME, KT, KE, stored, putKV, replaceOperationalFixture, operationSaveBody } from './tasks_fx.mjs';
import { candidateWorker } from './irshad_domain_fx.mjs';
const copy = value => JSON.parse(JSON.stringify(value));
const originalFetch = globalThis.fetch;
let outboundAttempts = 0;
globalThis.fetch = async () => { outboundAttempts++; throw Error('TEST_ONLY outbound fetch forbidden'); };
after(() => { globalThis.fetch = originalFetch; assert.equal(outboundAttempts, 0, 'All task command requests stay inside the local Worker/SQLite fixture'); });
let serial = 0;
async function setup() {
  const B = await world({ worker: WCUR, mode: 'enforce' }), W = await candidateWorker(['tkCreate', 'tkSettings', 'tkSrvMark', 'canRead', 'enfHeld', 'rsReferenceSnapshot']);
  const login = await B.login('0000000101', '70101');
  const api = (path, body) => B.C.api(path, { cookie: login.ck, ...(body === undefined ? {} : { method: 'POST', body }) });
  const base = async () => {
    const result = await api('/api/operations/read?keys=' + encodeURIComponent(KT));
    assert.equal(result.status, 200, JSON.stringify(result.j));
    return { epoch: result.j.epoch, base: result.j.base[KT] };
  };
  const request = async (data = {}) => ({ dept: D, requestId: 'TEST_ONLY_task_command_' + ++serial, ...await base(), ...data });
  const create = () => ({ k: DAY, t: 'TEST_ONLY atomic create', desc: 'TEST_ONLY body', prio: 'normal', s: Date.now() - 60000, e: Date.now() + 3600000, asg: [ME.eid], rv: 'none', force: true });
  const actor = async () => W.tkSrvMark(await W.actorOf(B.env, 'tst_dm1'));
  return { ...B, W, api, base, request, create, actor };
}
function state(B) {
  const tables = B.env.DB.q("SELECT name FROM sqlite_master WHERE type='table' AND (name GLOB 'ops_*' OR name IN('revs','meta','aud','restore_operations','restore_preimage','restore_snapshot_manifest','imgs','imgown','imgref')) ORDER BY name");
  return Object.fromEntries(tables.map(({ name }) => [name, copy(B.env.DB.q('SELECT * FROM ' + name)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
}
function editOf(row, day, patch = {}) { return { k: day, t: 'TEST_ONLY edited atomically', desc: row[1] || '', prio: row[2], s: row[15], e: row[16], ekey: row[14] == null ? null : String(row[14]), wt: row[19] || null, ...patch }; }

test('A client-supplied tk audit CID cannot claim a server task event through a typed save or exact receipt replay', async () => {
  const B = await setup();
  try {
    const current = await B.api('/api/operations/read?keys=' + encodeURIComponent(KT)), value = current.j.resources[KT];
    value[DAY].find(row => row[13] === 1760000000901)[0] = 'TEST_ONLY client edited title';
    const forged = 'tkTEST_ONLY_forged_server_event';
    const body = operationSaveBody(B.env,'/api/save',{set:{[KT]:JSON.stringify(value)},del:[],base:{[KT]:current.j.base[KT]},why:{[KT]:'TEST_ONLY audit boundary'},
      aud:[{cid:forged,k:KT,etype:'task',act:'created',eid:'TEST_ONLY_forged_series',ename:'TEST_ONLY forged author',ctx:'{}'}]});
    const first = await B.api('/api/save',body);
    assert.equal(first.status,200,JSON.stringify(first.j)); assert.ok(first.j.revs[KT]);
    assert.deepEqual(B.env.DB.q('SELECT * FROM aud WHERE cid=?',forged),[]);
    const committed=state(B), replay=await B.api('/api/save',body);
    assert.equal(replay.status,200,JSON.stringify(replay.j));assert.equal(replay.j.duplicate,1);assert.deepEqual(state(B),committed);
    assert.deepEqual(B.env.DB.q("SELECT * FROM aud WHERE etype='task' AND eid='TEST_ONLY_forged_series'"),[]);
  } finally { B.env.DB.db.close(); }
});

test('An interactive task write guard conflict returns409 once and never reinterprets the sealed command base',async()=>{
  const B=await setup();
  try{
    const original=stored(B.env,KT)[DAY].find(r=>r[13]===1760000000101),body=await B.request({k:DAY,id:original[13],ekey:original[14],edit:editOf(original,DAY)}),batch=B.env.DB.batch.bind(B.env.DB);
    let writes=0,external;
    B.env.DB.batch=async statements=>{
      if(statements.some(s=>/KIVO_REV_CONFLICT/.test(s.sql))&&statements.some(s=>/INSERT INTO ops_/.test(s.sql))){
        writes++;if(writes===1){B.env.DB.db.prepare('UPDATE revs SET rev=rev+1 WHERE k=?').run(KT);external=state(B);}
      }
      return batch(statements);
    };
    const sealed=JSON.stringify(body),first=await B.api('/api/tasks/settings',body);
    assert.equal(first.status,409,JSON.stringify(first.j));assert.equal(first.j.err,'conflict');assert.equal(writes,1);assert.equal(JSON.stringify(body),sealed);assert.deepEqual(state(B),external);
    const retry=await B.api('/api/tasks/settings',body);assert.equal(retry.status,409);assert.equal(writes,1);assert.deepEqual(state(B),external);
  }finally{B.env.DB.db.close();}
});

test('A real provider or SQL failure in a self-task save remains500 and cannot masquerade as a revision conflict',async()=>{
  const B=await setup();
  try{
    const me=await B.login(ME.un,ME.pw),before=state(B),batch=B.env.DB.batch.bind(B.env.DB);let writes=0;
    B.env.DB.batch=async statements=>{
      if(statements.some(s=>/KIVO_REV_CONFLICT/.test(s.sql))&&statements.some(s=>/INSERT INTO ops_/.test(s.sql))){writes++;throw Error('TEST_ONLY provider unavailable');}
      return batch(statements);
    };
    const result=await B.C.api('/api/me/tasks/act',{method:'POST',cookie:me.ck,body:{k:DAY,id:1760000000101,act:'start'}});
    assert.equal(result.status,500,JSON.stringify(result.j));assert.equal(result.j.err,'worker-error');assert.equal(writes,1);assert.deepEqual(state(B),before);
  }finally{B.env.DB.db.close();}
});

test('Task create seals generated identities with the same receipt; exact replay changes no rows/revision and a changed body is rejected', async () => {
  const B = await setup();
  try {
    const body = await B.request(B.create()), first = await B.api('/api/tasks/create', body);
    assert.equal(first.status, 200, JSON.stringify(first.j)); assert.equal(first.j.ok, 1); assert.equal(first.j.requestId, body.requestId); assert.equal(first.j.atomic, 1);
    assert.ok(first.j.rows.length); assert.equal(first.j.commandActions, undefined);
    const before = state(B), replay = await B.api('/api/tasks/create', body);
    assert.equal(replay.status, 200, JSON.stringify(replay.j)); assert.equal(replay.j.duplicate, 1); assert.deepEqual(replay.j.rows, first.j.rows); assert.equal(replay.j.rev, first.j.rev);
    assert.deepEqual(state(B), before);
    const rejected = await B.api('/api/tasks/create', { ...body, t: 'TEST_ONLY different command' });
    assert.equal(rejected.status, 409); assert.equal(rejected.j.err, 'operations-request-reused'); assert.deepEqual(state(B), before);
  } finally { B.env.DB.db.close(); }
});

test('One task settings command commits edit + proof policy + recurrence together and preserves all existing tuple/history fields', async () => {
  const B = await setup();
  try {
    const original = stored(B.env, KT)[DAY].find(row => row[13] === 1760000000101), body = await B.request({ k: DAY, id: original[13], ekey: original[14],
      edit: editOf(original, DAY), pol: { m: 'note' }, rv: 'none', win: { early: 0, late: 2 },
      recur: { op: 'start', rec: { t: 'daily', n: 1 } } });
    const before = B.env.DB.q('SELECT COUNT(*)n FROM restore_operations')[0].n, result = await B.api('/api/tasks/settings', body);
    assert.equal(result.status, 200, JSON.stringify(result.j)); assert.equal(result.j.atomic, 1); assert.equal(result.j.n, 1);
    const actual = stored(B.env, KT)[DAY].find(row => row[13] === original[13]);
    assert.equal(actual[0], body.edit.t); assert.equal(actual[23].pol.m, 'note'); assert.equal(actual[23].rec.t, 'daily');
    for (const index of [3, 4, 5, 7, 8, 9, 11, 12, 13, 14, 20, 21]) assert.deepEqual(actual[index], original[index], 'Unchanged tuple slot ' + index);
    assert.equal(B.env.DB.q('SELECT COUNT(*)n FROM restore_operations')[0].n, before + 1);
    const saved = state(B), duplicate = await B.api('/api/tasks/settings', body);
    assert.equal(duplicate.j.duplicate, 1); assert.deepEqual(state(B), saved);
  } finally { B.env.DB.db.close(); }
});

test('An invalid recurrence/settings step prevents the preceding edit and all audit/receipt/revision writes', async () => {
  const B = await setup();
  try {
    const original = stored(B.env, KT)[DAY].find(row => row[13] === 1760000000101), body = await B.request({ k: DAY, id: original[13], ekey: original[14],
      edit: editOf(original, DAY), pol: { m: 'note' }, recur: { op: 'start', rec: { t: 'bogus' } } }), before = state(B);
    const result = await B.api('/api/tasks/settings', body);
    assert.equal(result.status, 400, JSON.stringify(result.j)); assert.equal(result.j.ok, 0); assert.equal(result.j.at, 'rec.t'); assert.deepEqual(state(B), before);
  } finally { B.env.DB.db.close(); }
});

test('Every actual command SQL position rolls back edit/settings/recurrence, revisions, receipts, preimages and audit as one batch', async t => {
  const B = await setup();
  try {
    const original = stored(B.env, KT)[DAY].find(row => row[13] === 1760000000101), body = await B.request({ k: DAY, id: original[13], ekey: original[14],
      edit: editOf(original, DAY), pol: { m: 'note' }, rv: 'none', recur: { op: 'start', rec: { t: 'daily', n: 1 } } });
    const before = state(B), DB = B.env.DB, batch = DB.batch.bind(DB); let target = 1, count = 0;
    DB.batch = async statements => {
      if (!statements.some(statement => statement.sql.includes('INSERT INTO restore_operations'))) return batch(statements);
      count = statements.length; let index = 0;
      for (const statement of statements) { assert.ok(statement.args.length <= 100); assert.ok(Buffer.byteLength(statement.sql) <= 100000); }
      DB.failIf = () => ++index === target;
      try { return await batch(statements); } finally { DB.failIf = null; }
    };
    try {
      for (target = 1; target <= (count || 1); target++) {
        await assert.rejects(B.W.tkSettings(B.env, new Request('http://x/api/tasks/settings'), await B.actor(), body), /injected failure/);
        assert.deepEqual(state(B), before, 'No command residue at actual SQL ' + target + '/' + count);
      }
    } finally { DB.batch = batch; DB.failIf = null; }
    assert.ok(count > 10); t.diagnostic('Actual task edit/settings/recurrence atomic SQL fault positions=' + count);
    const success = await B.W.tkSettings(B.env, new Request('http://x/api/tasks/settings'), await B.actor(), body);
    assert.equal(success.status, 200, await success.text());
  } finally { B.env.DB.db.close(); }
});

test('A receipt cannot bypass a newly revoked assign grant or a changed restore epoch', async () => {
  const B = await setup();
  try {
    const body = await B.request(B.create()), result = await B.api('/api/tasks/create', body);
    assert.equal(result.status, 200, JSON.stringify(result.j));
    putKV(B.env, 'bsdept:' + D + ':bassam_grants_v1', { v: 1, emp: { ['mgr:' + D]: { plus: [], minus: ['task.assign'] } } });
    const before = stored(B.env, KT), rejected = await B.api('/api/tasks/create', body);
    assert.equal(rejected.status, 403, JSON.stringify(rejected.j)); assert.deepEqual(stored(B.env, KT), before);
    putKV(B.env, 'bsdept:' + D + ':bassam_grants_v1', { v: 1, emp: {} });
    B.env.DB.db.prepare("UPDATE meta SET v=CAST(v AS INTEGER)+1 WHERE k='restore_epoch'").run();
    const epoch = await B.api('/api/tasks/create', body); assert.equal(epoch.status, 409); assert.equal(epoch.j.err, 'restore-epoch-changed');
  } finally { B.env.DB.db.close(); }
});

test('Editing a completed historical assignment preserves proof bytes and the original employee name after the employee roster changed', async () => {
  const B = await setup();
  try {
    const original = stored(B.env, KT)[YESTERDAY].find(row => row[13] === 1760000000106);
    await replaceOperationalFixture(B.env, KE, stored(B.env, KE).filter(employee => employee.eid !== ME.eid));
    const body = await B.request({ k: YESTERDAY, id: original[13], ekey: original[14], edit: editOf(original, YESTERDAY) });
    const result = await B.api('/api/tasks/settings', body);
    assert.equal(result.status, 200, JSON.stringify(result.j));
    const actual = stored(B.env, KT)[YESTERDAY].find(row => row[13] === original[13]);
    assert.equal(actual[0], body.edit.t); assert.equal(actual[8], original[8]); assert.deepEqual(actual[20], original[20]); assert.deepEqual(actual[21], original[21]);
    assert.deepEqual(B.env.DB.q('PRAGMA foreign_key_check'), []);
  } finally { B.env.DB.db.close(); }
});

test('An unchanged legacy priority remains lossless when only the title is edited; a newly invented priority is denied', async () => {
  const B = await setup();
  try {
    for (const priority of ['med', null]) {
      const tasks = stored(B.env, KT), original = tasks[DAY].find(row => row[13] === 1760000000101); original[2] = priority;
      await replaceOperationalFixture(B.env, KT, tasks);
      const body = await B.request({ k: DAY, id: original[13], ekey: original[14], edit: editOf(original, DAY, { t: 'TEST_ONLY title changed; original priority ' + priority }) });
      const result = await B.api('/api/tasks/settings', body);
      assert.equal(result.status, 200, JSON.stringify(result.j));
      const actual = stored(B.env, KT)[DAY].find(row => row[13] === original[13]); assert.equal(actual[2], priority); assert.equal(actual[0], body.edit.t);
      const invented = await B.request({ k: body.k, id: body.id, ekey: body.ekey, edit: { ...body.edit, prio: 'invented' } });
      const denied = await B.api('/api/tasks/settings', invented); assert.equal(denied.status, 400); assert.equal(stored(B.env, KT)[DAY].find(row => row[13] === original[13])[2], priority);
    }
  } finally { B.env.DB.db.close(); }
});

test('A raw authority change between the fresh reference and receipt SELECT cannot replay an old command authorization', async () => {
  const B = await setup();
  try {
    const body = await B.request(B.create()), created = await B.api('/api/tasks/create', body);
    assert.equal(created.status, 200, JSON.stringify(created.j));
    const DB = B.env.DB, before = stored(B.env, KT), batch = DB.batch.bind(DB); let injected = false;
    const key = 'bsdept:' + D + ':bassam_grants_v1', revoked = { v: 1, emp: { ['mgr:' + D]: { plus: [], minus: ['task.assign'] } } };
    DB.batch = async function (statements) {
      // The real dbGuard implements first() via a fenced native batch.
      if (!injected && statements.some(statement => statement.sql.startsWith('SELECT * FROM restore_operations WHERE account_uid='))) {
        injected = true;
        DB.db.prepare('INSERT INTO kv(k,seq,v)VALUES(?,0,?)ON CONFLICT(k,seq)DO UPDATE SET v=excluded.v').run(key, JSON.stringify(revoked));
      }
      return batch(statements);
    };
    let replay;
    try { replay = await B.api('/api/tasks/create', body); } finally { DB.batch = batch; }
    assert.equal(injected, true); assert.equal(replay.status, 409, JSON.stringify(replay.j));
    assert.deepEqual(stored(B.env, KT), before); assert.deepEqual(stored(B.env, key), revoked, 'The external authority change itself is retained');
  } finally { B.env.DB.db.close(); }
});

test('A create-only writer without task read can append safely without a client base; a supplied stale base cannot replace previous tasks', async () => {
  const B = await setup();
  try {
    putKV(B.env, 'bsdept:' + D + ':bassam_grants_v1', { v: 1, emp: { [ME.eid]: { plus: ['task.create', 'task.assign'], minus: [] } } });
    const actor = (await B.W.rsReferenceSnapshot(B.env, ME.uid)).A;
    assert.equal(B.W.canRead(actor, KT), false);
    assert.equal(B.W.enfHeld(actor, D, 'task.create'), true); assert.equal(B.W.enfHeld(actor, D, 'task.assign'), true);
    const logged = await B.login(ME.un, ME.pw), api = (path, body) => B.C.api(path, { cookie: logged.ck, ...(body === undefined ? {} : { method: 'POST', body }) });
    const read = await api('/api/operations/read?keys=' + encodeURIComponent(KT));
    assert.equal(read.status, 200, JSON.stringify(read.j)); assert.deepEqual(read.j.denied, [KT]); assert.equal(Object.hasOwn(read.j.base, KT), false); assert.equal(Object.hasOwn(read.j.resources, KT), false);
    const before = stored(B.env, KT), payload = { dept: D, epoch: read.j.epoch, ...B.create() };
    // Positive existing-policy control. Inspect only the revision header in the
    // isolated fixture; no read permission or business value is granted.
    const current = B.env.DB.q('SELECT rev FROM revs WHERE k=?', KT)[0].rev;
    const control = await api('/api/tasks/create', { ...payload, requestId: 'TEST_ONLY_writer_control_' + ++serial, base: current });
    assert.equal(control.status, 200, JSON.stringify(control.j));
    const append = await api('/api/tasks/create', { ...payload, requestId: 'TEST_ONLY_writer_append_' + ++serial });
    assert.equal(append.status, 200, JSON.stringify(append.j));
    const stale = await api('/api/tasks/create', { ...payload, requestId: 'TEST_ONLY_writer_stale_' + ++serial, base: 0 });
    assert.equal(stale.status, 200, JSON.stringify(stale.j));
    const after = stored(B.env, KT);
    for (const [day, rows] of Object.entries(before)) for (const old of rows)
      assert.deepEqual(after[day].find(row => String(row[13]) === String(old[13]) && String(row[14]) === String(old[14])), old);
    const ids = [control.j.rows[0].id, append.j.rows[0].id, stale.j.rows[0].id]; assert.equal(new Set(ids).size, 3);
    assert.equal((await api('/api/operations/read?keys=' + encodeURIComponent(KT))).j.resources[KT], undefined);
  } finally { B.env.DB.db.close(); }
});
