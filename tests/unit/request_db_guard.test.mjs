import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { world as fixture, IDS, D1, copy } from './notifications_review_fx.mjs';
import { guardWorker as candidateWorker, guardPart, SUPPORTED_SCHEMA } from './request_db_guard_fx.mjs';
const futureSchemaSql="UPDATE meta SET v='"+(SUPPORTED_SCHEMA+2)+"'WHERE k='schema_version'";
const request = (path = '/api/ping', who = 'super') =>
  new Request('http://x' + path, { headers: who ? { Cookie: 'bs_tok=TEST_ONLY_session_' + who } : {} });
async function world() {
  const f = await fixture(),
    W = await candidateWorker();
  await W.initDb(f.env);
  assert.deepEqual(f.DB.q("SELECT v FROM meta WHERE k='restore_epoch'").map(r=>r.v),['0'],'Canonical schema7 creates exactly one initial epoch');
  const attach = () => W.preAttach(f.env, request(), 'api');
  const api = async (path = '/api/ping', body) => {
    const headers = { Cookie: 'bs_tok=TEST_ONLY_session_super', Origin: 'http://x', 'Content-Type': 'application/json' };
    const response = await W.default.fetch(
      new Request('http://x' + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      f.env,
    );
    return { status: response.status, json: await response.json(), headers: response.headers };
  };
  return { ...f, W, attach, api };
}
function business(t) {
  return Object.fromEntries(
    ['kv', 'meta', 'revs', 'sess', 'aud', 'sec', 'daily_stats_days', 'notification_messages', 'notification_user_state'].map((n) => [
      n,
      copy(t.DB.q('SELECT * FROM ' + n)).map((r) => (n === 'sess' ? { ...r, la: 0 } : r)),
    ]),
  );
}

test('successful preload captures schema, migration names and own epoch in the existing single D1 batch', async () => {
  const t = await world();
  t.DB.db.prepare("UPDATE meta SET v='9' WHERE k='restore_epoch'").run();
  const trips = t.DB.trips,
    start = t.DB.log.length,
    env = await t.attach();
  assert.equal(t.DB.trips - trips, 1);
  assert.equal(env.__restoreEpoch, 9);
  assert.equal(env.__pre.guard.schema, String(SUPPORTED_SCHEMA));
  assert.equal(env.__pre.guard.count, t.W.KIVO_MIGRATIONS.length);
  assert.equal(env.__pre.sess.uid, IDS.super);
  assert.equal(t.DB.log.slice(start).filter((s) => /FROM d1_migrations/.test(s)).length, 1);
});
test('a warm isolate rejects a newer schema, malformed/missing stamps and unknown or missing migration records with HTTP503 before writes', async () => {
  for (const change of [
    (db) => db.exec(futureSchemaSql),
    (db) => db.exec("UPDATE meta SET v='05'WHERE k='schema_version'"),
    (db) => db.exec("DELETE FROM meta WHERE k='schema_version'"),
    (db) => db.exec("INSERT INTO d1_migrations(name)VALUES('0006_TEST_ONLY_unknown')"),
    (db) => db.exec("DELETE FROM d1_migrations WHERE name='0005_notifications'"),
  ]) {
    const t = await world();
    assert.equal((await t.api()).status, 200);
    change(t.DB);
    const before = business(t),
      start = t.DB.log.length,
      r = await t.api();
    assert.equal(r.status, 503);
    assert.equal(r.json.err, 'db-schema-unsupported');
    assert.deepEqual(business(t), before);
    assert.equal(
      t.DB.log.slice(start).some((s) => /^\s*(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(s)),
      false,
    );
  }
});
test('warm cross-database requests capture the actual database epoch and reject a different unsupported database', async () => {
  const first = await world();
  assert.equal((await first.api()).status, 200);
  const other = await fixture();
  other.DB.exec("UPDATE meta SET v='17' WHERE k='restore_epoch'");
  const own = await first.W.preAttach(other.env, request(), 'api');
  assert.equal(own.__restoreEpoch, 17);
  other.DB.exec(futureSchemaSql);
  await assert.rejects(first.W.preAttach(other.env, request(), 'api'), (e) => e.dbGuardStatus === 503);
  assert.deepEqual(first.DB.q("SELECT v FROM meta WHERE k='restore_epoch'").map(r=>r.v),['0'],'The other database cannot change this initial epoch');
});
test('a Cloudflare-shaped D1 session keeps its own bookmark methods without inventing withSession or a raw escape', async () => {
  const t = await world(),
    session = { prepare: (q) => t.DB.prepare(q), batch: (a) => t.DB.batch(a), getBookmark: () => 'TEST_ONLY_bookmark' },
    env = await t.W.preAttach({ ...t.env, DB: session }, request(), 'api');
  assert.equal(env.DB.withSession, undefined);
  assert.equal(env.DB.getBookmark(), 'TEST_ONLY_bookmark');
  assert.equal(env.__rawDB.withSession, undefined);
  assert.equal(env.DB.__raw, undefined);
  assert.equal(env.__rawDB.__raw, undefined);
  assert.equal(await env.DB.prepare("SELECT v FROM meta WHERE k='schema_version'").first('v'), String(SUPPORTED_SCHEMA));
});
test('snapshot fallback remains guarded and an unavailable or incompatible minimal capture fails closed', async () => {
  const t = await world(),
    batch = t.DB.batch.bind(t.DB);
  let fail = true;
  t.DB.batch = async (st) => {
    if (fail) {
      fail = false;
      throw Error('TEST_ONLY preload failed');
    }
    return batch(st);
  };
  const env = await t.attach();
  assert.equal(env.__pre.live, false);
  assert.equal(env.__restoreEpoch, 0);
  await env.DB.prepare("INSERT INTO kv(k,seq,v)VALUES('TEST_ONLY_fallback',0,'{}')").run();
  t.DB.exec("UPDATE meta SET v='1' WHERE k='restore_epoch'");
  await assert.rejects(env.DB.prepare("DELETE FROM kv WHERE k='TEST_ONLY_fallback'").run(), /KIVO_RESTORE_EPOCH/);
  assert.equal(t.DB.q("SELECT COUNT(*) n FROM kv WHERE k='TEST_ONLY_fallback'")[0].n, 1);
  const bad = await world(),
    run = bad.DB.batch.bind(bad.DB);
  let first = true;
  bad.DB.exec(futureSchemaSql);
  bad.DB.batch = async (st) => {
    if (first) {
      first = false;
      throw Error('TEST_ONLY preload failed');
    }
    return run(st);
  };
  await assert.rejects(bad.attach(), (e) => e.dbGuardStatus === 503);
  const down = await world();
  down.DB.batch = async () => {
    throw Error('TEST_ONLY unavailable');
  };
  await assert.rejects(down.attach(), (e) => e.dbGuardCode === 'db-guard-unavailable');
});
test('first/all/run and batch fence deferred writes, including RETURNING revision reservations, inside their write transaction', async () => {
  for (const method of ['first', 'all', 'run', 'batch']) {
    const t = await world(),
      env = await t.attach(),
      statement = env.DB.prepare("INSERT INTO kv(k,seq,v)VALUES('TEST_ONLY_late',0,'{}') RETURNING k,v");
    t.DB.exec("UPDATE meta SET v='1' WHERE k='restore_epoch'");
    const before = business(t),
      call = method === 'batch' ? () => env.DB.batch([statement]) : () => statement[method]();
    await assert.rejects(call(), /KIVO_RESTORE_EPOCH/);
    assert.deepEqual(business(t), before);
    const reserve = env.DB.prepare("UPDATE meta SET v=CAST(v AS INTEGER)+1 WHERE k='rev' RETURNING v");
    await assert.rejects(reserve.first('v'), /KIVO_RESTORE_EPOCH/);
    assert.deepEqual(business(t), before);
  }
});

test('a NULL migration name introduced between a guarded read and write rejects every dispatch method without writes', async () => {
  for (const method of ['first', 'all', 'run', 'batch']) {
    const t = await world(), env = await t.attach();
    assert.equal(await env.DB.prepare("SELECT v FROM meta WHERE k='schema_version'").first('v'), String(SUPPORTED_SCHEMA));
    t.DB.exec("UPDATE d1_migrations SET name=NULL WHERE name='0004_daily_stats'");
    const before = business(t), statement = env.DB.prepare("INSERT INTO kv(k,seq,v)VALUES('TEST_ONLY_null_ledger',0,'{}') RETURNING k");
    await assert.rejects(method === 'batch' ? () => env.DB.batch([statement]) : () => statement[method](), /KIVO_DB_SCHEMA/);
    assert.deepEqual(business(t), before);
    assert.equal(t.DB.q('SELECT COUNT(*) n FROM d1_migrations WHERE name IS NULL')[0].n, 1, 'No automatic ledger repair');
  }
});
test('guarded RETURNING results and first column lookup match the project caller contract in one trip', async () => {
  const t = await world(),
    env = await t.attach();
  let before = t.DB.trips;
  assert.equal(
    await env.DB.prepare("INSERT INTO kv(k,seq,v)VALUES('TEST_ONLY_returning',0,'{}') RETURNING k").first('k'),
    'TEST_ONLY_returning',
  );
  assert.equal(t.DB.trips - before, 1);
  before = t.DB.trips;
  const all = await env.DB.prepare("UPDATE kv SET v='[]'WHERE k='TEST_ONLY_returning' RETURNING k,v").all();
  assert.deepEqual(
    all.results.map((r) => ({ ...r })),
    [{ k: 'TEST_ONLY_returning', v: '[]' }],
  );
  assert.equal(t.DB.trips - before, 1);
  const change=await env.DB.prepare("UPDATE kv SET v='{}' WHERE k='TEST_ONLY_returning'").run();assert.equal(change.meta.changes,1);
  assert.equal(await env.DB.prepare("SELECT k FROM kv WHERE k='TEST_ONLY_missing'").first(), null);
  await assert.rejects(
    env.DB.prepare("SELECT k FROM kv WHERE k='TEST_ONLY_returning'").first('TEST_ONLY_missing_column'),
    /D1_COLUMN_NOTFOUND/,
  );
});
test('mutating raw and unfenced exec fail before dispatch while readonly raw preserves the original delegate options', async () => {
  const t = await world(),
    env = await t.attach(),
    before = business(t),
    trips = t.DB.trips;
  for (const opts of [undefined, { columnNames: true }])
    await assert.rejects(
      env.DB.prepare("INSERT INTO kv(k,seq,v)VALUES('TEST_ONLY_raw',0,'{}') RETURNING k").raw(opts),
      (e) => e.dbGuardCode === 'db-unfenced-raw',
    );
  assert.throws(
    () => env.DB.exec("INSERT INTO kv(k,seq,v)VALUES('TEST_ONLY_exec',0,'{}')"),
    (e) => e.dbGuardCode === 'db-unfenced-exec',
  );
  assert.equal(t.DB.trips, trips);
  assert.deepEqual(business(t), before);
  const p = env.__pre,
    delegated = [];
  const original = t.DB.prepare.bind(t.DB);
  t.DB.prepare = (sql) => {
    const st = original(sql);
    st.raw = async (options) => {
      delegated.push(options);
      return [['TEST_ONLY_column']];
    };
    return st;
  };
  const g = t.W.dbGuard(t.DB, p);
  assert.deepEqual(await g.prepare('SELECT 1 WHERE 0').raw({ columnNames: true }), [['TEST_ONLY_column']]);
  assert.deepEqual(delegated, [{ columnNames: true }]);
});
test('raw metadata callers retain the preload only for known session-heartbeat and task-gate statements, and remain epoch fenced', async () => {
  const t = await world(),
    env = await t.attach();
  await env.__rawDB.prepare('UPDATE sess SET la = ?2 WHERE tok = ?1').bind('TEST_ONLY_session_super', Date.now()).run();
  assert.equal(env.__pre.live, true);
  await env.__rawDB
    .prepare('INSERT INTO meta (k, v) VALUES (?2, ?1) ON CONFLICT(k) DO UPDATE SET v = excluded.v')
    .bind('1', 'tkg:rec:' + D1)
    .run();
  assert.equal(env.__pre.live, true);
  await env.__rawDB
    .prepare('INSERT INTO meta (k, v) VALUES (?2, ?1) ON CONFLICT(k) DO UPDATE SET v = excluded.v')
    .bind('{}', 'policy')
    .run();
  assert.equal(env.__pre.live, false);
  t.DB.exec("UPDATE meta SET v='1' WHERE k='restore_epoch'");
  const before = business(t);
  await assert.rejects(
    env.__rawDB
      .prepare('DELETE FROM meta WHERE k = ?1')
      .bind('tkg:rec:' + D1)
      .run(),
    /KIVO_RESTORE_EPOCH/,
  );
  assert.deepEqual(business(t), before);
});
test('unknown migration or changed schema appearing after capture blocks the transaction before its first mutation', async () => {
  for (const change of [
    (db) => db.exec("INSERT INTO d1_migrations(name)VALUES('0006_TEST_ONLY_future')"),
    (db) => db.exec(futureSchemaSql),
  ]) {
    const t = await world(),
      env = await t.attach();
    change(t.DB);
    const before = business(t);
    await assert.rejects(env.DB.batch([env.DB.prepare("DELETE FROM kv WHERE k='bassam_auth_users_v1'")]), /KIVO_DB_SCHEMA/);
    assert.deepEqual(business(t), before);
  }
});
test('deferred notification state cannot attach after a new epoch; a genuinely fresh request can write the current state', async () => {
  const t = await world();
  t.DB.exec(
    "INSERT INTO notification_messages(scope,id,kind,department,type,category,priority,channel,title,body,created_at)VALUES('d:" +
      D1 +
      "','TEST_ONLY_message','event','" +
      D1 +
      "','emp_add','emp','info','bell','TEST_ONLY','TEST_ONLY',1)",
  );
  const old = await t.attach(),
    queued = old.__rawDB
      .prepare('INSERT INTO notification_user_state(account_uid,message_scope,message_id,read_at)VALUES(?1,?2,?3,4)')
      .bind(IDS.super, 'd:' + D1, 'TEST_ONLY_message');
  t.DB.exec("UPDATE meta SET v='1' WHERE k='restore_epoch'");
  const before = business(t);
  await assert.rejects(queued.run(), /KIVO_RESTORE_EPOCH/);
  assert.deepEqual(business(t), before);
  const current = await t.attach();
  await assert.rejects(current.DB.batch([queued]), (e) => e.dbGuardCode === 'restore-epoch-changed');
  await current.DB.prepare('INSERT INTO notification_user_state(account_uid,message_scope,message_id,read_at)VALUES(?1,?2,?3,5)')
    .bind(IDS.super, 'd:' + D1, 'TEST_ONLY_message')
    .run();
  assert.equal(t.DB.q('SELECT read_at FROM notification_user_state')[0].read_at, 5);
});
test('malformed or unsafe epochs fail closed without deriving a replacement epoch', async () => {
  for (const value of ['-1', '01', 'TEST_ONLY_bad', '9007199254740992']) {
    const t = await world();
    t.DB.db.prepare("UPDATE meta SET v=? WHERE k='restore_epoch'").run(value);
    const before = business(t);
    await assert.rejects(t.attach(), (e) => e.dbGuardCode === 'db-restore-epoch-invalid');
    assert.deepEqual(business(t), before);
  }
});
/* RISHAD-266 · owner decision (h) 2026-11-03: the budget holds at ALL hours. The jobs behind the summary (Irshad daily
   23:30-24:00 Riyadh, Seized due 08:00/09:00-24:00 Riyadh) made this wall-clock dependent (11-15 trips from 06:00 to
   21:00 UTC on fa74283). The test now runs at fixed synthetic instants covering every window instead of wall time and
   measures three repeated reads after the priming read at each, with the seven-trip budget unchanged. */
const SUMMARY_CLOCKS = {
  night: '2026-10-28T00:00:00Z',            /* 03:00 Riyadh: no job window */
  morning: '2026-10-28T06:30:00Z',          /* 09:30 Riyadh: Seized due */
  saturdayEarly: '2026-10-31T05:30:00Z',    /* Saturday 08:30 Riyadh: weekly Seized summary only */
  noon: '2026-10-28T09:00:00Z',             /* 12:00 Riyadh */
  evening: '2026-10-28T17:00:00Z',          /* 20:00 Riyadh */
  lateEvening: '2026-10-28T20:45:00Z',      /* 23:45 Riyadh: Irshad daily and Seized due */
};
async function atClock(iso, fn) {
  const RealDate = globalThis.Date, now = RealDate.parse(iso);
  globalThis.Date = class extends RealDate {
    constructor(...a) { super(...(a.length ? a : [now])); }
    static now() { return now; }
  };
  try { return await fn(); } finally { globalThis.Date = RealDate; }
}
test('Super notification summary retains the canonical D1 trip budget after a successful preload', async (t) => {
  for (const [label, iso] of Object.entries(SUMMARY_CLOCKS))
    await atClock(iso, async () => {
      const before = await fixture(),
        after = await world(),
        path = '/api/notifications?dept=' + D1 + '&summary=1';
      await before.api('super', path);
      await after.api(path);
      for (let read = 1; read <= 3; read++) {
        const a = before.DB.trips,
          b = after.DB.trips;
        await before.api('super', path);
        await after.api(path);
        const baseline = before.DB.trips - a,
          candidate = after.DB.trips - b;
        t.diagnostic(JSON.stringify({ clock: label, read, baselineD1Trips: baseline, candidateD1Trips: candidate, cloudMeasured: false }));
        assert.ok(candidate <= 7, label + ' read ' + read + ': the accepted Super summary budget is seven D1 trips: ' + candidate);
        assert.ok(baseline <= 7, label + ' read ' + read + ': the canonical baseline also stays within seven D1 trips: ' + baseline);
      }
    });
});
test('a canceled/hung init does not become a shared promise and the original eight-second deadline remains intact', async () => {
  const part = guardPart(),
    start = part.indexOf('var _initOk = false'),
    end = part.indexOf('/* ═══ KIVO_255', start),
    timers = [],
    waiters = new Map(),
    context = {
      Promise,
      Error,
      setTimeout(fn, ms) {
        const t = { fn, ms, cleared: false };
        timers.push(t);
        return t;
      },
      clearTimeout(t) {
        t.cleared = true;
      },
      migrateDb(env) {
        return env.hang ? new Promise((resolve) => waiters.set(env.id, resolve)) : Promise.resolve();
      },
    };
  vm.createContext(context);
  vm.runInContext(part.slice(start, end), context);
  const hung = context.initDb({ hang: true, id: 'TEST_ONLY_A' });
  const success = context.initDb({});
  await success;
  assert.equal(timers[0].ms, 8000);
  assert.equal(timers[1].ms, 8000);
  assert.equal(timers[1].cleared, true);
  timers[0].fn();
  await assert.rejects(hung, /db-init-timeout 8000ms/);
  waiters.get('TEST_ONLY_A')();
  await context.initDb({});
});
async function resetWorld() {
  const t = await world(),
    pin = '583927',
    recovery = 'TESTONLYRECOVERY123456789',
    users = copy(t.keys.bassam_auth_users_v1);
  users.find((u) => u.id === IDS.super).ph = await t.W.hashPw(pin);
  await t.DB.batch([
    ...t.W.kvPutStmts(t.env, 'kv', 'bassam_auth_users_v1', JSON.stringify(users)),
    t.DB.prepare("INSERT INTO meta(k,v)VALUES('rk',?1)").bind(await t.W.hashPw('rk:' + recovery)),
    ...t.W.kvPutStmts(t.env, 'kv', 'bassam_platform_v1', '{"brand":{"title":"TEST_ONLY brand"}}'),
  ]);
  const input = {
    pw: pin,
    key: recovery,
    confirm: 'تهيئة',
    keepBrand: true,
    admin: { un: '0500000199', name: 'TEST_ONLY next administrator', pw: '583928' },
  };
  return { ...t, input };
}
test('actual local reset commits epoch, owner credentials, cleanup and both reset audit records once, then blocks a late old writer', async () => {
  const t = await resetWorld(),
    old = await t.attach(),
    response = await t.api('/api/reset', t.input);
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, 1, JSON.stringify(response.json));
  assert.equal(t.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0].v, '1');
  const users = JSON.parse(
    t.DB.q("SELECT v FROM kv WHERE k='bassam_auth_users_v1'ORDER BY seq")
      .map((r) => r.v)
      .join(''),
  );
  assert.equal(users.length, 1);
  assert.equal(users[0].un, t.input.admin.un);
  assert.equal(await t.W.verifyPw(t.input.admin.pw, users[0].ph), true);
  assert.equal(t.DB.q("SELECT COUNT(*)n FROM aud WHERE act='reset'")[0].n, 1);
  assert.equal(t.DB.q("SELECT COUNT(*)n FROM sec WHERE act='reset'")[0].n, 1);
  assert.equal(t.DB.q('SELECT COUNT(*)n FROM sess')[0].n, 0);
  const before = business(t);
  await assert.rejects(
    old.__rawDB.prepare("INSERT INTO kv(k,seq,v)VALUES('TEST_ONLY_late_resurrection',0,'{}')").run(),
    /KIVO_RESTORE_EPOCH/,
  );
  assert.deepEqual(business(t), before);
  const fresh = await t.W.preAttach(t.env, request('/api/ping', null), 'api');
  assert.equal(fresh.__restoreEpoch, 1);
});
test('a late reset audit failure rolls back the whole reset including epoch and original owner credentials', async () => {
  const t = await resetWorld(),
    before = business(t);
  t.DB.failIf = (sql) => /^INSERT OR IGNORE INTO aud\b/i.test(sql);
  const response = await t.api('/api/reset', t.input);
  t.DB.failIf = null;
  assert.equal(response.status, 500);
  assert.deepEqual(business(t), before);
  assert.deepEqual(t.DB.q("SELECT v FROM meta WHERE k='restore_epoch'").map(r=>r.v),['0'],'A failed reset preserves the schema7 initial epoch byte-for-byte');
  assert.equal((await t.api('/api/reset', t.input)).json.ok, 1);
});
