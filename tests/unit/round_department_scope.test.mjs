/* Actual canonical Worker/SQLite. RISHAD-266: the legacy scope ceiling (bsdept:<d>:bassam_scope_v1) is retired —
   an absent record no longer fails closed and a present record is ignored; the unit ceiling (bassam_perms_v1.caps) still refuses.
   Synthetic local fixture policy only. No authorization bypass or business KV fallback. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, D1, IDS, copy, identitySnapshot } from './custody_review_fx.mjs';
import { installOperationalFixture, inspectOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';

test('typed round geometry: no scope record and a narrowing legacy record both allow; the unit ceiling still refuses', async () => {
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
  /* بلا سجلّ نطاق: كان scope-unknown (unmigrated-department-ceiling) — الآن مقبول */
  const missing = await save(desired, 'TEST_ONLY_round_ceiling_missing');
  assert.equal(missing.status, 200, JSON.stringify(missing.json));
  assert.equal(missing.json.ok, 1); assert.equal(missing.json.atomic, 1);
  assert.deepEqual(inspectOperationalFixture(B.env, key), desired);
  /* سجلٌّ قديمٌ يضيّق على موقعٍ آخر: لا يُقرأ */
  const scopeKey = 'bsdept:' + D1 + ':bassam_scope_v1';
  const record = { v: 1, ceiling: { Site: { mode: 'list', list: ['f:TEST_ONLY_OTHER_SITE'] }, 'Zone/Element': { mode: 'list', list: [] } }, emp: {} };
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', scopeKey, JSON.stringify(record)).concat([
    B.DB.prepare('INSERT INTO revs(k,rev)VALUES(?1,1)ON CONFLICT(k)DO UPDATE SET rev=rev+1').bind(scopeKey),
  ]));
  const edit = copy(desired); edit[dk].d[0].zones[0].code = '99';
  const outside = await save(edit, 'TEST_ONLY_round_ceiling_outside');
  assert.equal(outside.status, 200, JSON.stringify(outside.json));
  assert.deepEqual(inspectOperationalFixture(B.env, key), edit);
  /* سقفُ الوحدة بلا «daily»: كان مرفوضاً حتى لمدير النظام — V7 · د1-ج (قرار صاحب المنصة): مدير المنصة بلا قيد صلاحية فيُكتب (السقفُ لغيره تغطّيه اختباراتُ الأدوار) */
  const perms = copy(B.keys.bassam_perms_v1); perms.caps[D1] = perms.caps[D1].filter((k) => k !== 'daily');
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_perms_v1', JSON.stringify(perms)).concat([
    B.DB.prepare("UPDATE revs SET rev=rev+1 WHERE k='bassam_perms_v1'"),
  ]));
  const protectedNow = identitySnapshot(B.DB);
  const edit2 = copy(edit); edit2[dk].d[0].zones[0].code = '77';
  const capped = await save(edit2, 'TEST_ONLY_round_unit_ceiling');
  assert.equal(capped.status, 200, JSON.stringify(capped.json));
  assert.deepEqual(inspectOperationalFixture(B.env, key), edit2);
  assert.deepEqual(identitySnapshot(B.DB), protectedNow);
  void protectedBefore;
});
