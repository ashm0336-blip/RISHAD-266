import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { world, ok, OPTIONS, TABLES } from './atomic_restore_review_fx.mjs';
import { IDS, copy } from './custody_review_fx.mjs';
const USERS = 'bassam_auth_users_v1',
  PIN = '583927',
  KEY = 'TESTONLYRECOVERY123456789';
const digest = (DB) =>
  Object.fromEntries(
    [...TABLES, 'sess', 'audit', 'authz_snap', 'authz_snaps'].map((table) => [
      table,
      createHash('sha256')
        .update(
          JSON.stringify(
            DB.q('SELECT * FROM ' + table)
              .map((r) => JSON.stringify(r))
              .sort(),
          ),
        )
        .digest('hex'),
    ]),
  );
async function setup() {
  const B = await world(),
    users = copy(B.users),
    owner = users.find((u) => u.id === IDS.super);
  owner.id = 'su';
  owner.ph = await B.W.hashPw(PIN);
  owner.mc = 0;
  await B.DB.batch([
    ...B.W.kvPutStmts(B.env, 'kv', USERS, JSON.stringify(users)),
    B.DB.prepare('UPDATE sess SET uid=?1 WHERE uid=?2').bind('su', IDS.super),
    B.DB.prepare("INSERT INTO meta(k,v)VALUES('rk',?1)").bind(await B.W.hashPw('rk:' + KEY)),
    B.DB.prepare(
      "INSERT INTO aud(cid,ts,uid,un,dept,k,rev,etype,eid,act)VALUES('TEST_ONLY_retained_audit',1,'su','','','TEST_ONLY',1,'dataset','TEST_ONLY','changed')",
    ),
    B.DB.prepare("INSERT INTO authz_snaps(snap,ts,uid,kind,n,meta)VALUES('TEST_ONLY_retained_snapshot',1,'su','restore',1,'{}')"),
    B.DB.prepare("INSERT INTO authz_snap(snap,k,seq,existed,rev,v)VALUES('TEST_ONLY_retained_snapshot','TEST_ONLY_history',0,1,1,'{}')"),
  ]);
  const body = await B.body({ keys: { [OPTIONS]: '{"TEST_ONLY":"before reset accepted restore"}' } });
  body.uid = 'su';
  body.base.kv[OPTIONS] = 0;
  const changed = JSON.parse(body.keys[USERS]);
  changed.find((u) => u.id === IDS.employee1).name = 'TEST_ONLY restored display name';
  body.keys[USERS] = JSON.stringify(changed);
  const ack = ok(await B.api('super', '/api/backup/restore', body));
  assert.ok(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n > 0);
  const privateCredentialWitness = B.DB.q("SELECT row_json FROM restore_preimage WHERE domain='kv' AND table_key=?1", USERS).some((row) => {
    const item = JSON.parse(row.row_json);
    return typeof item.v === 'string' && JSON.parse(item.v).some((u) => typeof u.ph === 'string');
  });
  assert.equal(privateCredentialWitness, true, 'The actual operation has a private credential preimage; do not print its value');
  const reset = {
    pw: PIN,
    key: KEY,
    confirm: 'تهيئة',
    keepBrand: true,
    admin: { un: '0500000199', name: 'TEST_ONLY reset owner', pw: '583928' },
  };
  async function http(path, body, cookie) {
    const headers = { 'Content-Type': 'application/json', Origin: 'http://x' };
    if (cookie) headers.Cookie = cookie;
    const response = await B.W.default.fetch(
      new Request('http://x' + path, { method: 'POST', headers, body: JSON.stringify(body) }),
      B.env,
    );
    return { status: response.status, json: await response.json(), headers: response.headers };
  }
  return { ...B, body, ack, reset, http };
}

test('reset must retire restore receipts/private preimages so a new su lifecycle cannot replay an old successful ACK', async () => {
  const B = await setup(),
    beforeEpoch = await B.W.rsEpoch(B.env);
  ok(await B.api('super', '/api/reset', B.reset));
  assert.equal(await B.W.rsEpoch(B.env), beforeEpoch + 1);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1', OPTIONS)[0].n, 0);
  const login = await B.http('/api/login', { u: B.reset.admin.un, p: B.reset.admin.pw });
  assert.equal(login.status, 200);
  assert.equal(login.json.ok, 1);
  assert.equal(login.json.uid, 'su');
  const cookie = String(login.headers.get('set-cookie') || '').split(';')[0];
  assert.ok(cookie);
  const replay = await B.http('/api/backup/restore', B.body, cookie),
    observed = {
      receiptRows: B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n,
      preimageRows: B.DB.q('SELECT COUNT(*) n FROM restore_preimage')[0].n,
      manifestRows: B.DB.q('SELECT COUNT(*) n FROM restore_snapshot_manifest')[0].n,
      replayStatus: replay.status,
      replayOk: replay.json.ok === 1,
      duplicate: replay.json.duplicate === 1,
      sameOldSnapshot: replay.json.snapshot === B.ack.snapshot,
      dataRecreated: B.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1', OPTIONS)[0].n > 0,
    };
  assert.deepEqual(observed, {
    receiptRows: 0,
    preimageRows: 0,
    manifestRows: 0,
    replayStatus: 409,
    replayOk: false,
    duplicate: false,
    sameOldSnapshot: false,
    dataRecreated: false,
  });
});

test('a late reset audit failure rolls back business state, epoch, all operation cache rows and private preimages together', async () => {
  const B = await setup(),
    before = digest(B.DB);
  B.DB.failIf = (sql) => /^INSERT OR IGNORE INTO aud\b/i.test(sql);
  const failed = await B.api('super', '/api/reset', B.reset);
  B.DB.failIf = null;
  assert.equal(failed.status, 500);
  assert.equal(failed.json.ok, 0);
  assert.deepEqual(digest(B.DB), before);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
});

test('reset preserves the existing aud/authz snapshot policy rather than treating its retained history as operation receipts', async () => {
  const B = await setup(),
    history = copy(B.DB.q("SELECT * FROM authz_snap WHERE snap='TEST_ONLY_retained_snapshot'")),
    headers = copy(B.DB.q("SELECT * FROM authz_snaps WHERE snap='TEST_ONLY_retained_snapshot'")),
    audit = copy(B.DB.q("SELECT * FROM aud WHERE cid='TEST_ONLY_retained_audit'"));
  ok(await B.api('super', '/api/reset', B.reset));
  assert.deepEqual(copy(B.DB.q("SELECT * FROM authz_snap WHERE snap='TEST_ONLY_retained_snapshot'")), history);
  assert.deepEqual(copy(B.DB.q("SELECT * FROM authz_snaps WHERE snap='TEST_ONLY_retained_snapshot'")), headers);
  assert.deepEqual(copy(B.DB.q("SELECT * FROM aud WHERE cid='TEST_ONLY_retained_audit'")), audit);
  assert.equal(B.DB.q("SELECT COUNT(*) n FROM aud WHERE act='reset'")[0].n, 1);
  assert.equal(B.DB.q("SELECT COUNT(*) n FROM sec WHERE act='reset'")[0].n, 1);
});
