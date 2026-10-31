/* Actual canonical Worker/SQLite: an absent security ceiling stays unknown.
   The explicit ceiling below is synthetic local fixture policy, not a UI or
   Cloud permission change. No authorization bypass or business KV fallback. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, D1, IDS, copy, identitySnapshot } from './custody_review_fx.mjs';
import { installOperationalFixture, inspectOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';

test('typed round geometry preserves unknown-ceiling denial and honors an explicit exact site/element ceiling', async () => {
  const B = await world();
  await installOperationalFixture(B.env, B.W);
  const date = await B.api('employee1', '/api/me/today');
  assert.equal(date.status, 200);
  const { ym, dk } = date.json.day, sid = 'TEST_ONLY_SCOPE_SITE', uid = 'TEST_ONLY_SCOPE_ZONE';
  const planKey = 'bsdept:' + D1 + ':bassam_plan_v1', key = 'bsdept:' + D1 + ':bassam_rounds_v1';
  const floor = { sid, name: 'TEST_ONLY empty site', num: 0, approved: false, zones: [], gates: [], marks: [], paths: [], sectors: [] };
  await replaceOperationalFixture(B.env, planKey, { pMig: 3, floors: [floor], months: { [ym]: { c: 1, d: [copy(floor)] } }, cfg: {}, delMonths: {} });
  const before = { [dk]: { t: 1, ap: 0, auto: 1, d: [{ sid, zones: [], gates: [], marks: [], paths: [] }] } };
  await replaceOperationalFixture(B.env, key, before);
  const protectedBefore = identitySnapshot(B.DB);
  const desired = copy(before);
  desired[dk].d[0].zones.push({ uid, d: 'M1 1 L11 1 L11 11 L1 11 Z', code: '01', ser: '01', cat: 'men', rawA: 100, cx: 6, cy: 6, count: null, pc: {}, emp: [], kind: null, hideLabel: true });
  async function save(value, requestId) {
    const read = await B.api('super', '/api/operations/read?' + new URLSearchParams({ uid: IDS.super, keys: key }));
    assert.equal(read.status, 200); assert.equal(read.json.ok, 1);
    return B.api('super', '/api/save', { method: 'POST', body: {
      uid: IDS.super, requestId, epoch: read.json.epoch, base: read.json.base,
      set: { [key]: JSON.stringify(value) }, del: [],
    } });
  }
  const missing = await save(desired, 'TEST_ONLY_round_ceiling_missing');
  assert.equal(missing.status, 403);
  assert.equal(missing.json.ok, 0); assert.equal(missing.json.atomic, 1);
  assert.equal(missing.json.denied[key].why, 'scope-unknown');
  assert.deepEqual(missing.json.denied[key].dims, ['Site', 'Zone/Element']);
  assert.match(missing.json.denied[key].detail, /unmigrated-department-ceiling/);
  assert.deepEqual(inspectOperationalFixture(B.env, key), before);
  assert.deepEqual(identitySnapshot(B.DB), protectedBefore);

  async function explicitCeiling(site) {
    const scopeKey = 'bsdept:' + D1 + ':bassam_scope_v1';
    const record = { v: 1, ceiling: { Site: { mode: 'list', list: ['f:' + site] }, 'Zone/Element': { mode: 'list', list: ['u:' + uid] } }, emp: {} };
    await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', scopeKey, JSON.stringify(record)).concat([
      B.DB.prepare('INSERT INTO revs(k,rev)VALUES(?1,1)ON CONFLICT(k)DO UPDATE SET rev=rev+1').bind(scopeKey),
    ]));
  }
  await explicitCeiling(sid);
  const allowed = await save(desired, 'TEST_ONLY_round_ceiling_exact');
  assert.equal(allowed.status, 200, JSON.stringify(allowed.json));
  assert.equal(allowed.json.ok, 1); assert.equal(allowed.json.atomic, 1);
  assert.deepEqual(inspectOperationalFixture(B.env, key), desired);

  await explicitCeiling('TEST_ONLY_OTHER_SITE');
  const edit = copy(desired); edit[dk].d[0].zones[0].code = '99';
  const foreign = await save(edit, 'TEST_ONLY_round_ceiling_outside');
  assert.equal(foreign.status, 403);
  assert.equal(foreign.json.denied[key].why, 'scope');
  assert.ok(foreign.json.denied[key].dims.includes('Site'));
  assert.deepEqual(inspectOperationalFixture(B.env, key), desired);
  assert.deepEqual(identitySnapshot(B.DB), protectedBefore);
});
