/* Real frontend backup callers → actual 547/548 → canonical Worker/D1Shim.
   These are bounded integration cases, not the expanded platform audit. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { inspectOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { world, browser, fullExport, assertManifest4, D1, D2, OPTIONS, optionValue, scoped, identity, snapshot, epoch, posts, sourcePart, copy } from './operations_backup_flow_fx.mjs';
import { until } from './k264_vm.mjs';

const workerSha = createHash('sha256').update(fs.readFileSync('workers/_worker.js')).digest('hex');
console.log('Actual Operations backup frontend Worker SHA256 before ' + workerSha);
test.after(() => {
  const after = createHash('sha256').update(fs.readFileSync('workers/_worker.js')).digest('hex');
  console.log('Actual Operations backup frontend Worker SHA256 after ' + after);
  assert.equal(after, workerSha, 'Canonical Worker stays frozen during the run');
});
const receiptCount = B => B.DB.q('SELECT COUNT(*)n FROM restore_operations')[0].n;
function assertProtected(B, before) {
  assert.deepEqual(identity(B), before);
  assert.deepEqual(B.DB.q('PRAGMA foreign_key_check'), []);
  assert.equal(B.DB.q('SELECT COUNT(*)n FROM kv WHERE k=?', OPTIONS)[0].n, 0);
}

test('Admin actual exportBackup → Manifest4 → importBackup/fbkCommit restores normalized Operations with one atomic receipt', async t => {
  const B = await world(), original = optionValue('TEST_ONLY archived full option');
  await replaceOperationalFixture(B.env, OPTIONS, original);
  const protectedBefore = identity(B), C = await browser(B, t), file = await fullExport(C);
  assertManifest4(C, file, [D1, D2], 'full');
  assert.equal(receiptCount(B), 0);
  await replaceOperationalFixture(B.env, OPTIONS, optionValue('TEST_ONLY newer target'));
  assert.equal((await C.K.__BS_SRV.operations.read([OPTIONS])).ok, 1);
  C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [file], value: 'TEST_ONLY file' } });
  assert.ok(C.page._fbkPend);
  C.K.bsConfirm = async () => { assert.equal(receiptCount(B), 0); assert.deepEqual(inspectOperationalFixture(B.env, OPTIONS), optionValue('TEST_ONLY newer target')); return true; };
  const beforeEpoch = epoch(B);
  await C.method('modules/admin/logic.js', 'fbkCommit').call(C.page, 'replace');
  assert.equal(C.page._fbkPend, null, JSON.stringify(C.page.state));
  assert.deepEqual(inspectOperationalFixture(B.env, OPTIONS), original);
  assert.deepEqual(copy(C.K.__BS_SRV.operations.get('bassam_options_v1')), original, 'Actual resync refreshes confirmed typed cache');
  assert.equal(receiptCount(B), 1); assert.equal(epoch(B), beforeEpoch + 1);
  assert.equal(posts(C, 'inspect').length, 1); assert.equal(posts(C, 'commit').length, 1);
  assert.deepEqual(C.localWrites, []); assertProtected(B, protectedBefore);
  assert.ok(C.requests.some(request => request.url.startsWith('/api/changes?since=0')), 'Actual280 refresh completes a real read-set request');
});

test('lost full restore ACK retains ticket/file and exact retry, with no partial or duplicate business writes', async t => {
  const B = await world(), original = optionValue('TEST_ONLY archived retry option');
  await replaceOperationalFixture(B.env, OPTIONS, original);
  const C = await browser(B, t), file = await fullExport(C), protectedBefore = identity(B);
  await replaceOperationalFixture(B.env, OPTIONS, optionValue('TEST_ONLY later retry target'));
  assert.equal((await C.K.__BS_SRV.operations.read([OPTIONS])).ok, 1);
  C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [file] } });
  let lost = false;
  C.intercept((request, response) => {
    if (!lost && request.method === 'POST' && request.url === '/api/backup/restore' && JSON.parse(request.body).phase === 'commit') {
      assert.equal(response.status, 200, request.err); lost = true; throw Error('TEST_ONLY ACK lost after canonical commit');
    }
    return response;
  });
  const commit = C.method('modules/admin/logic.js', 'fbkCommit'), beforeEpoch = epoch(B);
  await commit.call(C.page, 'replace');
  const pending = C.page._fbkPend, ticket = pending?.ticket;
  assert.ok(ticket, JSON.stringify(C.page.state)); assert.equal(pending.uncertain, true);
  assert.deepEqual(copy(pending.file), file); assert.deepEqual(inspectOperationalFixture(B.env, OPTIONS), original);
  assert.deepEqual(copy(C.K.__BS_SRV.operations.get('bassam_options_v1')), optionValue('TEST_ONLY later retry target'), 'Lost ACK does not publish an optimistic local restore');
  assert.equal(receiptCount(B), 1); assert.equal(epoch(B), beforeEpoch + 1);
  assert.doesNotMatch(C.page.state.backupMsg, /اكتملت/);
  const count = C.requests.length;
  await commit.call(C.page, 'merge');
  C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [{ kind: 'full', data: {} }] } });
  assert.equal(C.requests.length, count); assert.equal(C.page._fbkPend, pending); assert.equal(pending.ticket, ticket);
  const committed = snapshot(B);
  await commit.call(C.page, 'replace');
  assert.equal(C.page._fbkPend, null, JSON.stringify(C.page.state));
  assert.deepEqual(copy(C.K.__BS_SRV.operations.get('bassam_options_v1')), original);
  assert.equal(posts(C, 'inspect').length, 1); assert.equal(posts(C, 'commit').length, 2);
  assert.equal(posts(C, 'commit')[0].body, posts(C, 'commit')[1].body);
  assert.equal(receiptCount(B), 1); assert.equal(epoch(B), beforeEpoch + 1);
  // Reads may update the rate-limit counter only. Every business/audit/receipt
  // table must stay identical after the duplicate receipt is acknowledged.
  const after = snapshot(B); delete committed.guard; delete after.guard;
  assert.deepEqual(after, committed); assert.deepEqual(C.localWrites, []); assertProtected(B, protectedBefore);
});

test('Root actual department export → bkImportFile/bkCommit restores D1 and preserves foreign D2 rows/revisions', async t => {
  const B = await world(), original = optionValue('TEST_ONLY archived department option'), foreign = scoped('bassam_options_v1', D2);
  await replaceOperationalFixture(B.env, OPTIONS, original);
  await replaceOperationalFixture(B.env, foreign, optionValue('TEST_ONLY foreign original'));
  const C = await browser(B, t), protectedBefore = identity(B);
  let done = false;
  C.method('layouts/root-logic.js', 'bkExportRun').call(C.page, { preImport: true, cb() { done = true; } });
  assert.ok(await until(() => done || C.toasts.length, 10000, 10));
  assert.equal(done, true, JSON.stringify({ toasts: C.toasts, requests: C.requests }));
  const file = JSON.parse(await C.blob().text()); assertManifest4(C, file, [D1], 'dept');
  await replaceOperationalFixture(B.env, OPTIONS, optionValue('TEST_ONLY department newer'));
  const foreignValue = optionValue('TEST_ONLY concurrent foreign edit');
  await replaceOperationalFixture(B.env, foreign, foreignValue);
  const foreignRevisions = () => copy(B.DB.q('SELECT * FROM revs WHERE k GLOB ? ORDER BY k', 'bsdept:' + D2 + ':*'));
  const foreignBefore = foreignRevisions();
  const foreignRows = () => Object.fromEntries(Object.entries(snapshot(B))
    .filter(([table]) => table.startsWith('ops_'))
    .map(([table, rows]) => [table, rows.filter(row => row.department_id === D2)]));
  const foreignRowsBefore = foreignRows();
  assert.ok(Object.values(foreignRowsBefore).some(rows => rows.length), 'Foreign normalized rows exist before scoped restore');
  C.method('layouts/root-logic.js', 'bkImportFile').call(C.page, file, D1);
  assert.ok(C.page._bkPend);
  await C.method('layouts/root-logic.js', 'bkCommit').call(C.page, 'replace');
  assert.equal(C.page._bkPend, null, JSON.stringify(C.toasts));
  assert.deepEqual(inspectOperationalFixture(B.env, OPTIONS), original);
  assert.deepEqual(inspectOperationalFixture(B.env, foreign), foreignValue);
  assert.deepEqual(foreignRevisions(), foreignBefore);
  assert.deepEqual(foreignRows(), foreignRowsBefore);
  assert.equal(receiptCount(B), 1); assert.deepEqual(C.localWrites, []); assertProtected(B, protectedBefore);
});

test('335 authenticated doRestore uses actual548; a signed-out restore attempts no HTTP or local mutation', async t => {
  const B = await world(), original = optionValue('TEST_ONLY identity-gate archive');
  await replaceOperationalFixture(B.env, OPTIONS, original);
  const C = await browser(B, t), file = await fullExport(C), protectedBefore = identity(B);
  await replaceOperationalFixture(B.env, OPTIONS, optionValue('TEST_ONLY gate target'));
  const restore = vm.runInContext('(' + sourcePart('auth/335-identity-gate.js', 'FunctionDeclaration', 'doRestore') + ')', C.T.ctx);
  const messages = [], attributes = [];
  await restore(file, message => messages.push(message), { setAttribute: (...args) => attributes.push(args) });
  assert.match(messages.at(-1), /اكتملت/, JSON.stringify({ messages, requests: C.requests }));
  assert.deepEqual(inspectOperationalFixture(B.env, OPTIONS), original); assert.equal(receiptCount(B), 1);
  assert.deepEqual(attributes[0], ['aria-busy', 'true']);
  assert.deepEqual(attributes.at(-1), ['aria-busy', 'false']);
  C.K.BassamAuth.user = () => null;
  const before = snapshot(B), count = C.requests.length;
  await restore(file, message => messages.push(message), { setAttribute() {} });
  assert.match(messages.at(-1), /سجّل الدخول/); assert.equal(C.requests.length, count);
  assert.deepEqual(snapshot(B), before); assert.deepEqual(C.localWrites, []); assertProtected(B, protectedBefore);
});
