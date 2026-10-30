/* Old rollback snapshots cannot bypass domain cutover. Synthetic rows only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, D1, IDS, notificationSnapshot, copy } from './notifications_review_fx.mjs';

const ORDINARY = 'bsdept:' + D1 + ':bassam_options_v1';
const SID = 'migration_test_only';
async function snapshot({ kind = 'migration', retired, existed = 1 } = {}) {
  const W = await world();
  await W.DB.batch([
    ...W.W.kvPutStmts(W.env, 'kv', ORDINARY, '{"TEST_ONLY":"current"}'),
    W.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,17)').bind(ORDINARY),
    W.DB.prepare("UPDATE meta SET v='17' WHERE k='rev'"),
    W.DB.prepare('INSERT INTO authz_snaps(snap,ts,uid,kind,n,meta,restored) VALUES(?1,?2,?3,?4,?5,?6,0)').bind(SID, Date.now(), IDS.super, kind, retired ? 2 : 1, '{"rev":17}'),
    W.DB.prepare('INSERT INTO authz_snap(snap,k,seq,existed,rev,v) VALUES(?1,?2,0,1,17,?3)').bind(SID, ORDINARY, '{"TEST_ONLY":"old"}'),
    ...(retired ? [W.DB.prepare('INSERT INTO authz_snap(snap,k,seq,existed,rev,v) VALUES(?1,?2,0,?3,0,?4)').bind(SID, retired, existed, existed ? '{}' : null)] : []),
  ]);
  return W;
}
function state(W) {
  return Object.fromEntries(['kv', 'revs', 'meta', 'sess', 'aud', 'authz', 'authz_snap', 'authz_snaps'].map(table => [table, copy(W.DB.q('SELECT * FROM ' + table)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]).concat([['notifications', notificationSnapshot(W.DB)], ['days', copy(W.DB.q('SELECT * FROM daily_stats_days'))]]));
}
const rollback = (W, force = true) => W.api('super', '/api/authz-migrate', { method: 'POST', body: { act: 'rollback', snap: SID, force } });

test('mixed snapshots containing a retired daily-stats or notification key reject the entire rollback even with force', async () => {
  const retired = ['bassam_dstats_v1', 'bsdept:' + D1 + ':bassam_dstats_v1', 'bassam_notif_v1', 'bassam_notif_sys_v1', 'bassam_notif_cfg_v1', 'bassam_bc_v1', 'bsdept:' + D1 + ':bassam_notif_v1'];
  for (const key of retired) for (const existed of [0, 1]) {
    const W = await snapshot({ retired: key, existed }), before = state(W), start = W.DB.log.length;
    const response = await rollback(W);
    assert.equal(response.status, 400, key); assert.equal(response.json.ok, 0); assert.equal(response.json.err, 'domain-moved');
    assert.deepEqual(state(W), before, key + ': no key, revision, session, snapshot marker or audit changed');
    assert.equal(W.DB.log.slice(start).some(sql => /INSERT INTO meta \(k, v\) VALUES \('rev', '1'\)/.test(sql)), false, 'The refusal precedes nextRev');
  }
});

test('a typed or unknown snapshot kind cannot be interpreted as legacy KV rollback', async () => {
  for (const kind of ['restore-atomic-v1', 'daily-stats', 'notifications', 'TEST_ONLY_unknown']) {
    const W = await snapshot({ kind }), before = state(W), response = await rollback(W);
    assert.equal(response.status, 400); assert.equal(response.json.ok, 0); assert.equal(response.json.err, 'typed-kind-unsupported'); assert.deepEqual(state(W), before);
  }
});

test('existing KV-only migration, restore and replace snapshots keep their supported rollback behavior', async () => {
  for (const kind of ['migration', 'restore', 'replace']) {
    const W = await snapshot({ kind }), response = await rollback(W, false);
    assert.equal(response.status, 200); assert.equal(response.json.ok, 1); assert.equal(response.json.restored, 1); assert.ok(response.json.rev > 17);
    assert.equal(W.DB.q('SELECT v FROM kv WHERE k=?1', ORDINARY)[0].v, '{"TEST_ONLY":"old"}');
    assert.equal(W.DB.q('SELECT restored FROM authz_snaps WHERE snap=?1', SID)[0].restored, 1);
    assert.equal(W.DB.q("SELECT COUNT(*) n FROM aud WHERE act='rolled_back' AND k=?1", ORDINARY)[0].n, 1);
  }
});
