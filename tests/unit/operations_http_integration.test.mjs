/* Actual generated canonical Worker and isolated SQLite only. No cloud, R2,
   private composer, compatibility adapter or replacement authorization. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { world as canonicalWorld, D1, D2, IDS, copy } from './custody_review_fx.mjs';
import { candidateWorker } from './irshad_domain_fx.mjs';
import { installOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { inspectOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';

const workerSha = createHash('sha256').update(fs.readFileSync('workers/_worker.js')).digest('hex');
console.log('Actual Operations HTTP Worker SHA256 ' + workerSha);
async function world() {
  const B = await canonicalWorld();
  assert.equal(B.W.KIVO_SCHEMA_VERSION, 10);
  await installOperationalFixture(B.env, B.W);
  const W = await candidateWorker(['rsReferenceSnapshot', 'opDefinitions', 'opInfo']);
  return { ...B, W };
}
const scoped = (name, dept = D1) => 'bsdept:' + dept + ':' + name;
const E = scoped('bassam_employees_v1'), O = scoped('bassam_options_v1'), S = scoped('bassam_staffing_v3'), L = scoped('bassam_staffing_locks_v1');
let requestNumber = 0;
function ok(response) { assert.equal(response.status, 200, JSON.stringify(response.json)); assert.equal(response.json.ok, 1, JSON.stringify(response.json)); return response.json; }
const read = (B, keys, who = 'super') => B.api(who, '/api/operations/read?' + new URLSearchParams({ uid: IDS[who], keys: keys.join(',') }));
const save = (B, body, who = 'super') => B.api(who, '/api/save', { method: 'POST', body });
async function envelope(B, set, { dependencies = [], who = 'super' } = {}) {
  const current = ok(await read(B, [...new Set(Object.keys(set).concat(dependencies))], who));
  return { uid: IDS[who], requestId: 'TEST_ONLY_Operations_HTTP_' + ++requestNumber, epoch: current.epoch,
    set: Object.fromEntries(Object.entries(set).map(([key, value]) => [key, JSON.stringify(value)])), del: [], base: current.base };
}
const transactionalSnapshot = B => Object.fromEntries(Object.entries(snapshot(B)).filter(([table]) => table !== 'guard'));
const identity = B => ({ users: copy(B.DB.q("SELECT * FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq")), permissions: copy(B.DB.q("SELECT * FROM kv WHERE k='bassam_perms_v1' ORDER BY seq")), sessions: copy(B.DB.q('SELECT * FROM sess ORDER BY tok')) });
const snapshot = B => Object.fromEntries(B.DB.q("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").map(({ name }) => [name, copy(B.DB.q('SELECT * FROM "' + name + '"'))]));
function legacyFile(B, kind, key, value = '{}') {
  return { app: 'bassam-crowd', version: 1, kind, data: {
    ...(kind === 'full' ? { bassam_depts_v1: JSON.stringify(B.keys.bassam_depts_v1) } : {}), [key]: value,
  } };
}

for (const kind of ['full', 'dept']) {
  test('legacy ' + kind + ' conversion rejects a suffixed Operations namespace without discarding its source', async () => {
    const B = await world(), before = snapshot(B);
    const key = 'bsdept:' + D1 + ':bassam_rounds_v1:child', file = legacyFile(B, kind, key), original = copy(file);
    const reference = await B.W.rsReferenceSnapshot(B.env, IDS.super);
    await assert.rejects(B.W.rsConvertBackup(B.env, reference.A, file, {
      scope: kind === 'full' ? { kind } : { kind, departmentId: D1 }, mode: 'replace', legacyConsent: true, reference,
    }), error => String(error.rs || error.ocCode || '') === 'operations-resource-scope');
    assert.deepEqual(file, original); assert.deepEqual(snapshot(B), before);
  });
}

test('legacy full conversion rejects an undeclared Operations department without writing or losing source bytes', async () => {
  const B = await world(), before = snapshot(B), file = legacyFile(B, 'full', 'bsdept:TEST_ONLY_undeclared:bassam_rounds_v1'), original = copy(file);
  const reference = await B.W.rsReferenceSnapshot(B.env, IDS.super);
  await assert.rejects(B.W.rsConvertBackup(B.env, reference.A, file, { scope: { kind: 'full' }, mode: 'replace', legacyConsent: true, reference }),
    error => String(error.rs || '') === 'backup-unknown-department');
  assert.deepEqual(file, original); assert.deepEqual(snapshot(B), before);
});

test('HTTP typed reads cover allowed, absent and denied resources, fence uid, and keep retired data out of get and bootstrap', async () => {
  const B = await world(), foreign = scoped('bassam_employees_v1', D2), before = identity(B);
  const data = ok(await read(B, [E, O, foreign], 'employee1'));
  assert.equal(data.uid, IDS.employee1); assert.ok(Number.isSafeInteger(data.v)); assert.equal(data.epoch, 0);
  assert.ok(Array.isArray(data.resources[E])); assert.ok(data.absent.includes(O)); assert.deepEqual(data.denied, [foreign]);
  assert.equal(Object.hasOwn(data.resources, foreign), false); assert.equal(Object.hasOwn(data.base, foreign), false);
  assert.deepEqual(Object.keys(data.base).sort(), [E, O].sort());
  const mismatch = await B.api('super', '/api/operations/read?' + new URLSearchParams({ uid: IDS.employee1, keys: E }));
  assert.equal(mismatch.status, 409); assert.equal(mismatch.json.err, 'session-changed');
  const unscoped = await B.api('super', '/api/operations/read?' + new URLSearchParams({ uid: IDS.super, keys: 'bassam_employees_v1' }));
  assert.equal(unscoped.status, 400); assert.equal(unscoped.json.err, 'operations-resource-scope');
  const moved = ok(await B.api('super', '/api/get?keys=' + encodeURIComponent(E)));
  assert.equal(moved.keys[E].v, null); assert.equal(moved.keys[E].moved, '/api/operations/read');
  const shell = await B.W.default.fetch(new Request('http://x/', { headers: { Cookie: 'bs_tok=TEST_ONLY_session_super', Accept: 'text/html' } }), B.env);
  const match = /window\.__BS_BOOT=(\{[\s\S]*?\});<\/script>/.exec(await shell.text()); assert.ok(match);
  assert.equal(Object.hasOwn(JSON.parse(match[1]).keys || {}, E), false);
  assert.equal(B.DB.q('SELECT COUNT(*)n FROM kv WHERE k=?1', E)[0].n, 0); assert.deepEqual(identity(B), before);
});

test('HTTP generic Operations save commits a cross-resource edit once and returns the same strict receipt on exact retry', async () => {
  const B = await world(), protectedBefore = identity(B), employees = inspectOperationalFixture(B.env, E);
  employees[0].name = 'TEST_ONLY HTTP employee edit';
  const options = { type: ['دائم'], work: ['ميدانيـ / ـة', 'إداريـ / ـة'] }, body = await envelope(B, { [E]: employees, [O]: options });
  const ack = ok(await save(B, body));
  assert.equal(ack.requestId, body.requestId); assert.equal(ack.epoch, body.epoch); assert.equal(ack.atomic, 1);
  assert.deepEqual(Object.keys(ack.revs).sort(), [E, O].sort());
  assert.deepEqual(inspectOperationalFixture(B.env, E), employees); assert.deepEqual(inspectOperationalFixture(B.env, O), options);
  assert.equal(B.DB.q('SELECT COUNT(*)n FROM kv WHERE k IN(?1,?2)', E, O)[0].n, 0);
  const after = transactionalSnapshot(B), replay = ok(await save(B, body));
  assert.equal(replay.duplicate, 1); assert.equal(replay.requestId, ack.requestId); assert.deepEqual(replay.revs, ack.revs);
  assert.deepEqual(transactionalSnapshot(B), after); assert.deepEqual(identity(B), protectedBefore);
  const reused = await save(B, { ...body, set: { ...body.set, [O]: JSON.stringify({ ...options, type: ['TEST_ONLY changed retry'] }) } });
  assert.equal(reused.status, 409); assert.equal(reused.json.err, 'operations-request-reused');
});

test('HTTP read-only revision dependencies reject a month lock changed after the editor read', async () => {
  const B = await world(), before = identity(B), employee = inspectOperationalFixture(B.env, E)[0].eid;
  const staffing = { '9999-12': { [employee]: { shift: 'TEST_ONLY future shift', rest: [], muk: false } } };
  const body = await envelope(B, { [S]: staffing }, { dependencies: [L] });
  await replaceOperationalFixture(B.env, L, { '9999-12': true });
  const result = await save(B, body);
  assert.equal(result.status, 409); assert.equal(result.json.ok, 0); assert.equal(result.json.atomic, 1); assert.equal(result.json.requestId, body.requestId);
  assert.equal(result.json.conflicts[S].why, 'read-reference-changed'); assert.equal(Object.hasOwn(result.json.conflicts, L), false);
  assert.equal(inspectOperationalFixture(B.env, S), null); assert.equal(inspectOperationalFixture(B.env, L)['9999-12'], true);
  assert.equal(B.DB.q('SELECT COUNT(*)n FROM restore_operations WHERE request_id=?1', body.requestId)[0].n, 0); assert.deepEqual(identity(B), before);
});

test('a late SQL fault in HTTP Operations save rolls back typed rows, revisions, receipt, preimages, audit and sessions', async () => {
  const B = await world(), employees = inspectOperationalFixture(B.env, E); employees[0].name = 'TEST_ONLY rollback candidate';
  const body = await envelope(B, { [E]: employees, [O]: { type: ['TEST_ONLY rollback option'], work: [] } }), before = transactionalSnapshot(B);
  let reached = false; B.DB.log = [];
  B.DB.failIf = sql => { if (/^INSERT INTO restore_operations/.test(sql)) { reached = true; return true; } return false; };
  const failed = await save(B, body); B.DB.failIf = null;
  assert.equal(reached, true, 'Failure must occur in the real receipt write after business statements'); assert.equal(failed.status, 500);
  const receiptAt = B.DB.log.findIndex(sql => /^INSERT INTO restore_operations/.test(sql));
  assert.ok(B.DB.log.slice(0, receiptAt).some(sql => /^INSERT INTO ops_/.test(sql)), 'Typed writes were attempted before the injected failure');
  assert.deepEqual(transactionalSnapshot(B), before); assert.deepEqual(B.DB.q('PRAGMA foreign_key_check'), []);
  assert.equal(ok(await save(B, body)).ok, 1);
});

test('metadata user saves commit normally and reject an employee SQL reference changed after their snapshot', async () => {
  for (const race of [false, true]) {
    const B = await world(), before = identity(B), users = copy(B.keys.bassam_auth_users_v1), key = 'bassam_auth_users_v1';
    users.find(user => user.id === IDS.employee1).name = 'TEST_ONLY metadata edit';
    const body = { uid: IDS.super, set: { [key]: JSON.stringify(users) }, del: [], base: { [key]: B.DB.q('SELECT rev FROM revs WHERE k=?1', key)[0].rev } };
    let injected = false; const original = B.DB.batch.bind(B.DB);
    if (race) B.DB.batch = async statements => {
      if (!injected && statements.some(statement => /^INSERT OR REPLACE INTO kv \(/.test(statement.sql) &&
        typeof statement.args[0] === 'string' && JSON.parse(statement.args[0]).some(row => row.k === key))) {
        injected = true; const employees = inspectOperationalFixture(B.env, E); employees[0].phone = 'TEST_ONLY concurrent contact';
        await replaceOperationalFixture(B.env, E, employees);
      }
      return original(statements);
    };
    const result = await save(B, body);
    if (race) {
      assert.equal(injected, true); assert.equal(result.status, 409); assert.equal(result.json.err, 'conflict');
      assert.deepEqual(identity(B), before); assert.equal(inspectOperationalFixture(B.env, E)[0].phone, 'TEST_ONLY concurrent contact');
    } else {
      assert.equal(result.status, 200); assert.equal(result.json.ok, 1); assert.ok(result.json.revs[key] > body.base[key]);
      const stored = JSON.parse(B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', key).map(row => row.v).join(''));
      assert.deepEqual(stored, users); assert.deepEqual(copy(B.DB.q('SELECT * FROM sess ORDER BY tok')), before.sessions);
    }
  }
});

test('receipt replay rechecks the current resource ceiling instead of returning private data after withdrawal', async () => {
  const B = await world(), options = { type: ['TEST_ONLY manager option'], work: [] }, body = await envelope(B, { [O]: options }, { who: 'manager1' });
  const first = ok(await save(B, body, 'manager1'));
  const perms = copy(B.keys.bassam_perms_v1); perms.caps[D1] = [];
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_perms_v1', JSON.stringify(perms)));
  const before = inspectOperationalFixture(B.env, O), receiptCount = B.DB.q('SELECT COUNT(*)n FROM restore_operations')[0].n;
  const replay = await save(B, body, 'manager1');
  assert.equal(replay.status, 403); assert.equal(replay.json.err, 'operations-denied');
  assert.deepEqual(inspectOperationalFixture(B.env, O), before); assert.equal(B.DB.q('SELECT COUNT(*)n FROM restore_operations')[0].n, receiptCount);
  assert.equal(B.DB.q('SELECT rev FROM revs WHERE k=?1', O)[0].rev, first.revs[O]);
});

async function exportFile(B) {
  const domains = {}, routes = { notifications: '/api/notifications/export', custody: '/api/custody/export', irshad: '/api/irshad/export', seized: '/api/seized/export', awards: '/api/award/export', operations: '/api/operations/export' };
  for (const [name, route] of Object.entries(routes)) { const data = ok(await B.api('super', route + '?uid=' + IDS.super)); domains[name] = name === 'notifications' ? data.domain : data.domains; }
  domains.dailyStats = { version: 1, data: ok(await B.api('super', '/api/dstats?uid=' + IDS.super)).data };
  const data = {}; for (const row of B.DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq')) data[row.k] = (data[row.k] || '') + row.v;
  const departments = B.keys.bassam_depts_v1.map(dept => dept.id);
  return { app: 'bassam-crowd', version: 4, kind: 'full', data, domains,
    manifest: { version: 4, scope: 'full', domains: Object.fromEntries(['kv', 'dailyStats', 'notifications', 'custody', 'irshad', 'seized', 'awards', 'operations'].map(name => [name, 1])), departments, keys: Object.keys(data) } };
}

test('Manifest4 exports every Operations resource including absent domains and restores through the real atomic HTTP path', async () => {
  const B = await world(), protectedBefore = identity(B), file = await exportFile(B), original = copy(file), definitions = B.W.opDefinitions();
  assert.equal(definitions.length, 21); assert.equal(file.domains.operations.length, definitions.length * file.manifest.departments.length);
  const actual = new Set(file.domains.operations.map(domain => scoped(domain.resource, domain.scope.departmentId)));
  assert.equal(actual.size, file.domains.operations.length);
  for (const dept of file.manifest.departments) for (const def of definitions) assert.ok(actual.has(scoped(def.resource, dept)));
  assert.equal(Object.keys(file.data).some(key => B.W.opInfo(key)), false);
  const reference = await B.W.rsReferenceSnapshot(B.env, IDS.super), incomplete = copy(file); incomplete.domains.operations.pop();
  await assert.rejects(B.W.rsConvertBackup(B.env, reference.A, incomplete, { scope: { kind: 'full' }, mode: 'replace', reference }), error => error.rs === 'restore-incomplete-operations');
  const converted = await B.W.rsConvertBackup(B.env, reference.A, file, { scope: { kind: 'full' }, mode: 'replace', reference });
  assert.equal(converted.manifest.version, 4); assert.deepEqual(file, original);
  // Restoring a confirmed absence over a newly present resource must preserve
  // ordinary write policy and physically restore absence in the same batch.
  ok(await save(B, await envelope(B, { [O]: { type: ['TEST_ONLY after backup'], work: [] } })));
  assert.notEqual(inspectOperationalFixture(B.env, O), null);
  const inventory = ok(await B.api('super', '/api/backup/restore?kind=full&departments=' + encodeURIComponent(JSON.stringify(file.manifest.departments))));
  const body = { version: 1, uid: IDS.super, requestId: 'TEST_ONLY_Manifest4_HTTP_' + ++requestNumber, scope: { kind: 'full' }, mode: 'replace', reason: 'TEST_ONLY full typed restore', base: inventory.base, backup: file };
  const beforeInspect = transactionalSnapshot(B);
  const inspected = ok(await B.api('super', '/api/backup/restore', { method: 'POST', body: { ...body, phase: 'inspect' } }));
  assert.equal(inspected.inspection.scope.kind, 'full'); assert.deepEqual(transactionalSnapshot(B), beforeInspect);
  const committed = ok(await B.api('super', '/api/backup/restore', { method: 'POST', body: { ...body, phase: 'commit' } }));
  assert.equal(committed.requestId, body.requestId); assert.equal(await B.W.rsEpoch(B.env), body.base.epoch + 1);
  assert.equal(inspectOperationalFixture(B.env, O), null);
  assert.deepEqual(identity(B), protectedBefore); assert.deepEqual(B.DB.q('PRAGMA foreign_key_check'), []);
  const after = transactionalSnapshot(B), replay = ok(await B.api('super', '/api/backup/restore', { method: 'POST', body: { ...body, phase: 'commit' } }));
  assert.equal(replay.duplicate, 1); assert.deepEqual(transactionalSnapshot(B), after);
  const exportedAgain = await exportFile(B); assert.deepEqual(exportedAgain.domains.operations, file.domains.operations);
});
