/* Actual 280 changes loop and canonical Worker/SQLite. Foreign Admin references
   are read explicitly; a later notification must evict them without fetching
   that department or invalidating the current department. No external network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, browser, D2, scoped, identity, copy } from './operations_backup_flow_fx.mjs';
import { inspectOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { until } from './k264_vm.mjs';

test('a foreign-only Operations poll invalidates an acknowledged Admin reference without fetching it or clearing current resources', async t => {
  const B = await world(), protectedBefore = identity(B), C = await browser(B, t);
  const operations = C.K.__BS_SRV.operations, currentKey = scoped('bassam_employees_v1'), foreignKey = scoped('bassam_employees_v1', D2);
  const current = copy(operations.reference(currentKey));
  assert.equal((await operations.read([foreignKey])).ok, 1);
  const foreign = copy(operations.reference(foreignKey));
  assert.ok(foreign.length > 0);
  const changed = copy(foreign); changed[0].name = 'TEST_ONLY foreign employee changed after explicit read';
  await replaceOperationalFixture(B.env, foreignKey, changed);
  const readCount = () => C.requests.filter(request => request.url.startsWith('/api/operations/read?')).length;
  const beforeReads = readCount(), cursor = C.T.W.__BS_BOOT.v, events = [];
  C.T.W.addEventListener('bassam:remote', event => events.push(Array.from(event.detail?.keys || [])));
  C.T.W.document.hidden = false;
  assert.equal(await until(() => C.T.W.__BS_BOOT.v > cursor, 3500, 10), true, 'The actual changes loop observes the foreign-only revision');
  assert.equal(readCount(), beforeReads, 'The foreign department is not fetched automatically');
  assert.equal(operations.state('bassam_employees_v1'), 'ready');
  assert.deepEqual(copy(operations.reference(currentKey)), current);
  assert.throws(() => operations.reference(foreignKey), /operations-read-required/, 'An old acknowledged cross-department reference must not survive its change event');
  assert.ok(events.some(keys => keys.includes(foreignKey)), 'Foreign logical changes remain observable');
  assert.equal((await operations.read([foreignKey])).ok, 1, 'The existing explicit read recovers the foreign reference');
  assert.deepEqual(copy(operations.reference(foreignKey)), changed);
  assert.deepEqual(inspectOperationalFixture(B.env, foreignKey), changed);
  assert.deepEqual(identity(B), protectedBefore);
  assert.equal(C.requests.some(request => request.method === 'POST' && request.url === '/api/save'), false);
});
