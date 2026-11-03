import {cuInflate} from './custody_legacy_oracle.mjs';
import { test } from 'node:test';
import { inspectOperationalFixture, replaceOperationalFixture, installOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { operationSaveBody } from './tasks_fx.mjs';
import assert from 'node:assert/strict';
import { world as canonicalWorld, legacyWorld, canonicalWorker, canonicalDigest, D1, D2, IDS, EKEYS, identitySnapshot } from './custody_review_fx.mjs';

const copy = (v) => JSON.parse(JSON.stringify(v));
let request = 0;
async function world(mode = 'enforce') {
  const B = await canonicalWorld({ mode }),
    perms = copy(B.keys.bassam_perms_v1);
  perms.emps[D1][EKEYS.employee1]['emps/custody'] = ['view', 'add'];
  perms.emps[D1][EKEYS.leader]['emps/custody'] = ['view', 'edit'];
  perms.emps[D1][EKEYS.noView]['emps/custody'] = ['view'];
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_perms_v1', JSON.stringify(perms)));
  const W = B.W;
  const api = async (who, url, body) => {
    const headers = { Cookie: 'bs_tok=TEST_ONLY_session_' + who };
    if (body !== undefined) {
      headers.Origin = 'http://x';
      headers['Content-Type'] = 'application/json';
    }
    const response = await W.default.fetch(
      new Request('http://x' + url, {
        method: body === undefined ? 'GET' : 'POST',
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      B.env,
    );
    return { status: response.status, json: await response.json() };
  };
  const get = (who = 'super', q = {}) => api(who, '/api/custody?' + new URLSearchParams({ dept: D1, uid: IDS[who], ...q }));
  const act = async (who, body) => {
    const base = body.base ?? (await W.cuRev(B.env, body.dept || D1));
    return api(who, '/api/custody/act', { uid: IDS[who], dept: D1, base, requestId: 'TEST_ONLY_request_' + ++request, ...body });
  };
  return { ...B, W, api, get, act };
}
function ok(r) {
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.ok, 1);
  assert.ok(Number.isSafeInteger(r.json.rev));
  return r.json;
}
async function item(W, qty = 3) {
  return ok(await W.act('super', { op: 'type-create', item: { name: 'TEST_ONLY radio', qty, prefix: 'RD', color: '#123456' } })).itemId;
}
const tables = ['custody_items', 'custody_issues', 'custody_movements', 'custody_requests', 'custody_request_outputs'];
const snapshot = (DB) => tables.map((table) => [table, copy(DB.q('SELECT * FROM ' + table))]);

test('legacy snapshot rollback rejects a mixed custody value or tombstone before any write, including force', async () => {
  for (const kind of ['migration', 'restore', 'replace'])
    for (const existed of [0, 1]) {
      const W = await world(),
        ordinary = 'bsdept:' + D1 + ':bassam_last_export_v1',   /* schema 10: options_v1 is typed; keep a plain KV probe */
        retired = 'bsdept:' + D1 + ':bassam_custody_v1',
        sid = 'migration_test_custody';
      await W.DB.batch([
        ...W.W.kvPutStmts(W.env, 'kv', ordinary, '{"TEST_ONLY":"current"}'),
        W.DB.prepare('INSERT INTO authz_snaps(snap,ts,uid,kind,n,meta,restored) VALUES(?1,1,?2,?3,2,?4,0)').bind(
          sid,
          IDS.super,
          kind,
          '{"rev":0}',
        ),
        W.DB.prepare('INSERT INTO authz_snap(snap,k,seq,existed,rev,v) VALUES(?1,?2,0,1,0,?3)').bind(sid, ordinary, '{"TEST_ONLY":"old"}'),
        W.DB.prepare('INSERT INTO authz_snap(snap,k,seq,existed,rev,v) VALUES(?1,?2,0,?3,0,?4)').bind(
          sid,
          retired,
          existed,
          existed ? '{"items":[],"moves":[]}' : null,
        ),
      ]);
      const names = ['kv', 'meta', 'revs', 'aud', 'authz', 'authz_snap', 'authz_snaps'],
        before = names.map((t) => [t, copy(W.DB.q('SELECT * FROM ' + t))]),
        start = W.DB.log.length;
      const response = await W.api('super', '/api/authz-migrate', { act: 'rollback', snap: sid, force: true });
      assert.equal(response.status, 400);
      assert.equal(response.json.err, 'domain-moved');
      assert.deepEqual(
        names.map((t) => [t, copy(W.DB.q('SELECT * FROM ' + t))]),
        before,
      );
      assert.equal(
        W.DB.log.slice(start).some((sql) => /INSERT INTO meta \(k, v\) VALUES \('rev', '1'\)/.test(sql)),
        false,
      );
    }
});

test('canonical parts initialize typed custody without editing source files', async () => {
  const before = canonicalDigest(),
    W = await world();
  assert.equal(canonicalDigest(), before);
  assert.equal(W.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(W.W.KIVO_SCHEMA_VERSION));
  for (const table of tables) {
    assert.ok(W.DB.q('PRAGMA table_info(' + table + ')').length);
    assert.equal(
      W.DB.q('PRAGMA foreign_key_list(' + table + ')').some((r) => r.table === 'employees' || r.table === 'kv'),
      false,
    );
  }
  assert.equal(W.DB.q("SELECT COUNT(*) n FROM kv WHERE k GLOB '*bassam_custody_v1'")[0].n, 0);
});

for (const mode of ['legacy', 'enforce'])
  test(mode + ': original add/edit/view and department rules govern explicit operations', async () => {
    const W = await world(mode),
      id = await item(W, 2),
      before = identitySnapshot(W.DB);
    const issued = ok(await W.act('employee1', { op: 'issue', itemId: id, holderKey: EKEYS.employee1 }));
    assert.equal(issued.outputs[0].serial, 'RD-001');
    assert.equal((await W.act('employee1', { op: 'close', issueId: issued.outputs[0].issueId, kind: 'in' })).status, 403);
    ok(await W.act('leader', { op: 'close', issueId: issued.outputs[0].issueId, kind: 'in' }));
    assert.equal((await W.act('noView', { op: 'issue', itemId: id, holderKey: EKEYS.noView })).status, 403);
    assert.equal((await W.get('employee2')).status, 403);
    assert.equal((await W.act('manager2', { op: 'issue', itemId: id, holderKey: EKEYS.employee2 })).status, 403);
    assert.deepEqual(identitySnapshot(W.DB), before);
  });

test('request id replay is exact, reuse differs is rejected and concurrent last-unit issue is atomic', async () => {
  const W = await world(),
    id = await item(W, 1),
    base = await W.W.cuRev(W.env, D1),
    body = { op: 'issue', itemId: id, holderKey: 'TEST_ONLY_orphan', base, requestId: 'TEST_ONLY_same' };
  const [a, b] = await Promise.all([W.act('super', body), W.act('super', body)]);
  assert.deepEqual(ok(a), ok(b));
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_movements')[0].n, 1);
  assert.equal((await W.act('super', { ...body, holderKey: 'TEST_ONLY_other' })).status, 409);
  const exhausted = await W.act('super', { op: 'issue', itemId: id, holderKey: 'TEST_ONLY_second' });
  assert.equal(exhausted.status, 409);
  assert.equal(exhausted.json.err, 'custody-quota');
  const feed = ok(await W.get());
  assert.equal(feed.summary.held, 1);
  assert.equal(feed.rows[0].orphan, true);
  assert.equal(feed.items[0].available, 0);
});

test('rename and prefix edits keep stable item/history identity and serial suffix does not reset', async () => {
  const W = await world(),
    id = await item(W, 2),
    out = ok(await W.act('super', { op: 'issue', itemId: id, holderKey: EKEYS.employee1 }));
  ok(await W.act('super', { op: 'close', issueId: out.outputs[0].issueId, kind: 'in' }));
  ok(await W.act('super', { op: 'type-edit', itemId: id, patch: { name: 'TEST_ONLY renamed', prefix: 'new' } }));
  const next = ok(await W.act('super', { op: 'issue', itemId: id, holderKey: EKEYS.employee1 }));
  assert.equal(next.outputs[0].serial, 'NEW-002');
  assert.equal((await W.act('super', { op: 'type-delete', itemId: id })).json.err, 'custody-history');
  assert.equal((await W.act('super', { op: 'type-edit', itemId: id, patch: { qty: 0 } })).json.err, 'custody-quota');
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n, 1);
  assert.ok(ok(await W.get('super', { view: 'moves' })).rows.every((r) => r.itemId === id && r.item === 'TEST_ONLY renamed'));
});

test('batch issue rollback covers every typed row, revision, request receipt and audit', async () => {
  const W = await world(),
    id = await item(W, 3),
    before = snapshot(W.DB),
    rev = await W.W.cuRev(W.env, D1),
    audit = copy(W.DB.q('SELECT * FROM aud ORDER BY id'));
  W.DB.failIf = (sql) => /^INSERT INTO custody_request_outputs/.test(sql);
  const failed = await W.act('super', {
    op: 'issue-batch',
    lines: [
      { itemId: id, holderKey: EKEYS.employee1 },
      { itemId: id, holderKey: 'TEST_ONLY_orphan' },
    ],
  });
  W.DB.failIf = null;
  assert.equal(failed.status, 500);
  assert.deepEqual(snapshot(W.DB), before);
  assert.equal(await W.W.cuRev(W.env, D1), rev);
  assert.deepEqual(copy(W.DB.q('SELECT * FROM aud ORDER BY id')), audit);
});

const legacyDoc = () => ({
  items: [{ name: 'TEST_ONLY radio', qty: 4, prefix: 'RD', color: '#123456' }, { name: 'TEST_ONLY legacy no-options' }],
  moves: [
    {
      t: 'out',
      eid: 'TEST_ONLY_old_holder',
      item: 'TEST_ONLY radio',
      ser: 'OLD-009',
      y: 1400,
      m: 1,
      d: 1,
      nid: 'TEST_ONLY_nid',
      empno: 'TEST_ONLY_no',
      name: 'TEST_ONLY name',
      by: 'TEST_ONLY actor',
      cond: 'جديد',
    },
    { t: 'in', eid: 'TEST_ONLY_old_holder', item: 'TEST_ONLY radio', ser: 'OLD-009', y: 1400, m: 2, d: 2 },
    { t: 'out', eid: 'TEST_ONLY_orphan', item: 'TEST_ONLY radio', ser: 'RD-010', y: 1400, m: 3, d: 0, color: '#123456' },
    { t: 'out', eid: 'TEST_ONLY_no_serial', item: 'TEST_ONLY radio', ser: '', y: 1400, m: 3, d: 0 },
  ],
});
async function legacy(doc = legacyDoc(), key = 'bsdept:' + D1 + ':bassam_custody_v1') {
  const B = await legacyWorld(),
    raw = JSON.stringify(doc);
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', key, raw));
  return { ...B, key, raw };
}
function custodyRows(DB, d = D1) {
  return {
    items: copy(DB.q('SELECT * FROM custody_items WHERE department_id=? ORDER BY item_id', d)),
    issues: copy(DB.q('SELECT * FROM custody_issues WHERE department_id=? ORDER BY issue_id', d)),
    moves: copy(DB.q('SELECT * FROM custody_movements WHERE department_id=? ORDER BY sequence', d)),
  };
}

test('real candidate migration preserves typed history, orphan keys, blank serials and absent optional fields', async () => {
  const W = await legacy(),
    before = identitySnapshot(W.DB);
  await W.W.initDb(W.env);
  assert.deepEqual(cuInflate(custodyRows(W.DB)), JSON.parse(W.raw));
  assert.deepEqual(identitySnapshot(W.DB), before);
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?', W.key)[0].n, 0);
  assert.equal(W.DB.q("SELECT COUNT(*) n FROM d1_migrations WHERE name='0006_custody'")[0].n, 1);
});

test('ambiguous cross-item serial, unknown fields, unscoped source and chunk gaps fail before custody DDL', async () => {
  const collision = legacyDoc();
  collision.moves.push({ ...collision.moves[0], item: 'TEST_ONLY legacy no-options' });
  const unknown = legacyDoc();
  unknown.moves[0].secret = 'TEST_ONLY_unaccepted';
  for (const [doc, key, gap] of [
    [collision, undefined, false],
    [unknown, undefined, false],
    [legacyDoc(), 'bassam_custody_v1', false],
    [legacyDoc(), undefined, true],
  ]) {
    const W = await legacy(doc, key);
    if (gap) W.DB.db.prepare('UPDATE kv SET seq=2 WHERE k=?').run(W.key);
    const before = copy(W.DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq'));
    await assert.rejects(W.W.initDb(W.env), /custody-/);
    assert.equal(W.DB.q("SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name GLOB 'custody_*'")[0].n, 0);
    assert.deepEqual(copy(W.DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq')), before);
    assert.equal(W.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, '5');
  }
});

test('legacy serial and item-holder fallback collisions are rejected rather than silently changing old projection semantics', async () => {
  const W = await canonicalWorker(),
    doc = {
      items: [{ name: 'TEST_ONLY x', qty: 3 }],
      moves: [
        { t: 'out', eid: 'a', item: 'TEST_ONLY x', ser: 'TEST_ONLY x#b', y: 1400, m: 1, d: 1 },
        { t: 'out', eid: 'b', item: 'TEST_ONLY x', ser: '', y: 1400, m: 1, d: 1 },
      ],
    };
  assert.throws(() => W.cuConvert(D1, doc), /custody-cutover-identity-ambiguous/);
});

test('source and target writers after legacy prepare abort migration without a partial stamp', async () => {
  for (const target of [false, true]) {
    const W = await legacy();
    if (target) {
      for (const sql of W.W.KIVO_MIGRATIONS.find((m) => m.name === '0006_custody').sql.filter((s) => /^CREATE /.test(s))) W.DB.exec(sql);
    }
    const original = W.DB.batch.bind(W.DB);
    let injected = false;
    W.DB.batch = async (stmts) => {
      if (!injected && stmts.some((s) => s.sql.includes('KIVO_CUSTODY_SOURCE_CHANGED'))) {
        injected = true;
        if (target) W.DB.exec("INSERT INTO custody_items VALUES('" + D1 + "','TEST_ONLY_concurrent','TEST_ONLY external',7,'R','#fff',7)");
        else W.DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,1,?)').run(W.key, ' ');
      }
      return original(stmts);
    };
    await assert.rejects(W.W.initDb(W.env), target ? /KIVO_CUSTODY_TARGET_CHANGED/ : /KIVO_CUSTODY_SOURCE_CHANGED/);
    assert.equal(injected, true);
    assert.equal(W.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, '5');
    assert.equal(W.DB.q("SELECT COUNT(*) n FROM d1_migrations WHERE name='0006_custody'")[0].n, 0);
    assert.equal(W.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?', W.key)[0].n, target ? 1 : 2);
    if (target) assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n, 1);
  }
});

test('late legacy insertion failure rolls back source retirement, typed DDL, revision and accounts', async () => {
  const W = await legacy(),
    source = copy(W.DB.q('SELECT * FROM kv ORDER BY k,seq')),
    revs = copy(W.DB.q('SELECT * FROM revs ORDER BY k'));
  W.DB.failIf = (sql) => /^INSERT INTO custody_movements/.test(sql);
  await assert.rejects(W.W.initDb(W.env), /injected failure/);
  W.DB.failIf = null;
  assert.deepEqual(copy(W.DB.q('SELECT * FROM kv ORDER BY k,seq')), source);
  assert.deepEqual(copy(W.DB.q('SELECT * FROM revs ORDER BY k')), revs);
  assert.equal(W.DB.q("SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name GLOB 'custody_*'")[0].n, 0);
  await W.W.initDb(W.env);
  assert.deepEqual(cuInflate(custodyRows(W.DB)), JSON.parse(W.raw));
});

test('month groups, holder pages, catalog totals and counters are server-wide rather than page counts', async () => {
  const W = await world(),
    id = await item(W, 5);
  ok(
    await W.act('super', {
      op: 'issue-batch',
      lines: [
        { itemId: id, holderKey: EKEYS.employee1 },
        { itemId: id, holderKey: EKEYS.employee1 },
        { itemId: id, holderKey: EKEYS.leader },
      ],
    }),
  );
  const first = ok(await W.get('super', { limit: 1 }));
  assert.equal(first.rows.length, 1);
  assert.equal(first.total, 2);
  assert.equal(first.summary.held, 3);
  assert.equal(first.summary.maxHeld, 2);
  assert.equal(first.summary.totalQty, 5);
  assert.equal(first.summary.available, 2);
  assert.equal(first.summary.catalogTotal, 1);
  assert.ok(first.next);
  const second = ok(await W.get('super', { limit: 1, cursor: first.next }));
  assert.notEqual(second.rows[0].holderKey, first.rows[0].holderKey);
  assert.equal(second.next, '');
  const holder = ok(await W.get('super', { view: 'holder', holderKey: EKEYS.employee1, limit: 1 }));
  assert.equal(holder.total, 2);
  assert.equal(holder.rows.length, 1);
  assert.ok(holder.next);
  const holder2 = ok(await W.get('super', { view: 'holder', holderKey: EKEYS.employee1, limit: 1, cursor: holder.next }));
  assert.notEqual(holder.rows[0].issueId, holder2.rows[0].issueId);
  const query = ok(await W.get('super', { view: 'moves', q: 'RD-002', limit: 1 }));
  assert.equal(query.total, 1);
  assert.equal(query.rows[0].ser, 'RD-002');
  const changed = ok(await W.act('super', { op: 'close', issueId: holder.rows[0].issueId, kind: 'dmg' }));
  assert.equal(changed.n, 1);
  assert.equal((await W.get('super', { limit: 1, cursor: first.next })).status, 409);
  const after = ok(await W.get());
  assert.equal(after.summary.dead, 1);
  assert.equal(after.summary.monthlyDmg, 1);
  assert.equal(after.items[0].dmg, 1);
});

test('retired generic save/get reject custody recreation and coupled employee writes cannot partially commit', async () => {
  const W = await world(),
    id = await item(W),
    out = ok(await W.act('super', { op: 'issue', itemId: id, holderKey: EKEYS.employee1 })),
    key = 'bsdept:' + D1 + ':bassam_custody_v1';
  const moved = await W.api('super', '/api/save', {
    uid: IDS.super,
    set: { [key]: '{"items":[],"moves":[]}', bassam_platform_v1: '{"TEST_ONLY":"must not write"}' },
    del: [],
    base: {},
  });
  assert.equal(moved.json.atomic, 'domain-moved');
  assert.equal(moved.json.denied[key].path, '/api/custody');
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?', key)[0].n, 0);
  const get = await W.api('super', '/api/get?keys=' + encodeURIComponent(key));
  assert.equal(get.json.keys[key].v, null);
  assert.equal(get.json.keys[key].moved, '/api/custody');
  const empKey = 'bsdept:' + D1 + ':bassam_employees_v1',
    emps = inspectOperationalFixture(W.env, empKey),
    before = copy(W.DB.q('SELECT * FROM kv ORDER BY k,seq')), beforeTyped=snapshot(W.DB);
  const removed = await W.api('super', '/api/save', operationSaveBody(W.env, '/api/save', {
    uid: IDS.super,
    set: { [empKey]: JSON.stringify(emps.filter((e) => e.eid !== EKEYS.employee1)), bassam_platform_v1: '{"TEST_ONLY":"must not write"}' },
    del: [],
    /* correct custody CAS + a stale platform base: the KV side of the coupled save fails, so the whole request is refused */
    base: { [empKey]: W.DB.q('SELECT rev FROM revs WHERE k=?', empKey)[0]?.rev || 0, [key]: await W.W.cuRev(W.env, D1), bassam_platform_v1: (W.DB.q('SELECT rev FROM revs WHERE k=?', 'bassam_platform_v1')[0]?.rev || 0) + 7 },
  }));
  /* schema 10: the typed roster save carries the operations envelope; a coupled save whose KV side fails is refused
     atomically (409 · atomic · conflict on the KV key) with nothing written */
  assert.equal(removed.status, 409, JSON.stringify(removed.json));
  assert.equal(removed.json.ok, 0, JSON.stringify(removed.json));
  assert.equal(removed.json.atomic, 1, JSON.stringify(removed.json));
  assert.ok(removed.json.conflicts && removed.json.conflicts.bassam_platform_v1, JSON.stringify(removed.json));
  assert.deepEqual(snapshot(W.DB),beforeTyped);
  assert.deepEqual(copy(W.DB.q('SELECT * FROM kv ORDER BY k,seq')), before);
  assert.ok(out.outputs[0].issueId);
});

test('server custody notifications are deduplicated after commit and do not require a browser observer', async () => {
  const W = await world(),
    id = await item(W, 1),
    body = { op: 'issue', itemId: id, holderKey: EKEYS.employee1, requestId: 'TEST_ONLY_notifications' };
  const first = ok(await W.act('super', body));
  const rows = copy(W.DB.q("SELECT scope,id,type FROM notification_messages WHERE type IN ('cu_out','cu_stock') ORDER BY type"));
  assert.equal(rows.length, 2);
  const replay = ok(await W.act('super', body));
  assert.deepEqual(replay, first);
  assert.deepEqual(copy(W.DB.q("SELECT scope,id,type FROM notification_messages WHERE type IN ('cu_out','cu_stock') ORDER BY type")), rows);
});

test('historical catalog and opening balances use the requested month while default catalog uses server month', async () => {
  const B = await legacy();
  await B.W.initDb(B.env);
  const A = await B.W.actorOf(B.env, IDS.super);
  const first = await B.W.cuRead(B.env, A, { dept: D1, year: 1400, month: 1 });
  assert.equal(first.summary.held, 1);
  assert.equal(first.summary.openingHeld, 0);
  assert.equal(first.items.find((i) => i.name === 'TEST_ONLY radio').held, 1);
  const next = await B.W.cuRead(B.env, A, { dept: D1, year: 1400, month: 2 });
  assert.equal(next.summary.held, 0);
  assert.equal(next.summary.openingHeld, 1);
  assert.equal(next.summary.in, 1);
  assert.equal(next.items.find((i) => i.name === 'TEST_ONLY radio').held, 0);
  const current = await B.W.cuRead(B.env, A, { dept: D1, view: 'catalog' });
  assert.equal(current.items.find((i) => i.name === 'TEST_ONLY radio').held, 2);
});

test('holder resolution follows a unique recreated employee and leaves ambiguous matches as explicit orphans', async () => {
  const B = await legacyWorld(),
    employees = copy(B.keys['bsdept:' + D1 + ':bassam_employees_v1']),
    found = employees.find((e) => e.eid === EKEYS.employee1),
    doc = legacyDoc();
  doc.moves = [{ ...doc.moves[0], nid: found.nid, empno: found.empno || '', name: 'TEST_ONLY saved snapshot' }];
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bsdept:' + D1 + ':bassam_custody_v1', JSON.stringify(doc)));
  const W = B.W;
  await W.initDb(B.env);
  const A = await W.actorOf(B.env, IDS.super);
  const linked = await W.cuRead(B.env, A, { dept: D1, year: 1400, month: 1 });
  assert.equal(linked.rows[0].holderKey, EKEYS.employee1);
  assert.equal(linked.rows[0].orphan, false);
  employees.push({ eid: 'TEST_ONLY_ambiguous_recreated', nid: found.nid, name: 'TEST_ONLY second matching identity' });
  { /* schema 10: initDb already cut the roster over to typed rows; mutate it through the canonical typed writer */
    const ek = 'bsdept:' + D1 + ':bassam_employees_v1', rev = B.DB.q('SELECT rev FROM revs WHERE k=?', ek)[0]?.rev || 0, plan = await W.opChangeStatements(B.env, ek, JSON.stringify(employees), { base: rev });
    await B.DB.batch(plan.guards.concat(plan.statements)); }
  const ambiguous = await W.cuRead(B.env, A, { dept: D1, year: 1400, month: 1 });
  assert.equal(ambiguous.rows[0].holderKey, 'TEST_ONLY_old_holder');
  assert.equal(ambiguous.rows[0].orphan, true);
  assert.equal(ambiguous.rows[0].ambiguous, true);
  assert.equal(
    B.DB.q('SELECT holder_key FROM custody_movements')[0].holder_key,
    'TEST_ONLY_old_holder',
    'Read-time resolution never reassigns stored history',
  );
});

test('bounded SQL returns no foreign-department ledger rows and uses the custody timeline index', async () => {
  const W = await world(),
    id = await item(W, 2);
  ok(await W.act('super', { op: 'issue', itemId: id, holderKey: EKEYS.employee1 }));
  W.DB.exec('BEGIN');
  W.DB.db
    .prepare('INSERT INTO custody_items VALUES(?,?,?,?,?,?,?)')
    .run(D2, 'TEST_ONLY_foreign_item', 'TEST_ONLY foreign', 500, 'F', '#fff', 7);
  const issue = W.DB.db.prepare('INSERT INTO custody_issues VALUES(?,?,?,?,?,NULL)'),
    move = W.DB.db.prepare(
      'INSERT INTO custody_movements(department_id,move_id,issue_id,item_id,sequence,kind,holder_key,hijri_year,hijri_month,hijri_day,presence_mask) VALUES(?,?,?,?,?,?,?,?,?,?,0)',
    ),
    clock = W.W.cuClock();
  for (let i = 0; i < 500; i++) {
    issue.run(D2, 'TEST_ONLY_foreign_' + i, 'TEST_ONLY_foreign_item', 'F-' + i, i);
    move.run(
      D2,
      'TEST_ONLY_foreign_move_' + i,
      'TEST_ONLY_foreign_' + i,
      'TEST_ONLY_foreign_item',
      i,
      'out',
      EKEYS.employee2,
      clock.y,
      clock.m,
      1,
    );
  }
  W.DB.exec('COMMIT');
  const prepare = W.DB.prepare.bind(W.DB),
    fetched = [];
  W.DB.prepare = (sql) => {
    const st = prepare(sql);
    if (/custody_(movements|items|issues)/.test(sql)) {
      for (const key of ['first', 'all', '_allSync', '_batchSync']) {
        const original = st[key].bind(st);
        st[key] = (...args) => {
          const capture = (r) => {
            fetched.push({ sql, args: st.args.slice(), rows: r?.results || r ? [...(r?.results || (Array.isArray(r) ? r : [r]))] : [] });
            return r;
          };
          const value = original(...args);
          return value && typeof value.then === 'function' ? value.then(capture) : capture(value);
        };
      }
    }
    return st;
  };
  const feed = ok(await W.get('employee1', { limit: 1 }));
  assert.equal(feed.total, 1);
  assert.equal(feed.summary.held, 1);
  assert.ok(fetched.reduce((n, r) => n + r.rows.length, 0) <= 15);
  assert.equal(
    fetched.some((r) => r.rows.some((row) => row.department_id === D2)),
    false,
  );
  const page = fetched.find((r) => r.sql.startsWith('SELECT * FROM (WITH employees') && r.sql.includes('LIMIT 2'));
  assert.ok(page);
  const st = prepare('EXPLAIN QUERY PLAN ' + page.sql).bind(...page.args),
    plan = W.DB.db.prepare(st.sql).all(...st._params());
  assert.ok(plan.some((r) => /custody_(issue|move)_timeline/.test(r.detail)));
});

test('a concurrent revision change between metadata and page reads is retried instead of mislabelling a snapshot', async () => {
  const W = await world(),
    id = await item(W, 2);
  ok(await W.act('super', { op: 'issue', itemId: id, holderKey: EKEYS.employee1 }));
  const originalBatch=W.DB.batch.bind(W.DB);
  let armed=true;
  W.DB.batch=async statements=>{
    const result=await originalBatch(statements);
    const query=statements.find(st=>st.sql==='SELECT rev FROM revs WHERE k=?1'&&st.args[0]==='bsdept:'+D1+':bassam_custody_v1');
    if(armed&&query){armed=false;W.DB.db.prepare('UPDATE revs SET rev=rev+1 WHERE k=?').run(query.args[0]);}
    return result;
  };
  const feed = ok(await W.get());
  assert.equal(armed, false);
  assert.equal(feed.rev, await W.W.cuRev(W.env, D1));
  assert.equal(feed.summary.held, 1);
});

test('two distinct concurrent requests cannot allocate the last unit or the same serial twice', async () => {
  const W = await world(),
    id = await item(W, 1),
    base = await W.W.cuRev(W.env, D1);
  const outcomes = await Promise.all([
    W.act('super', { op: 'issue', itemId: id, holderKey: EKEYS.employee1, base, requestId: 'TEST_ONLY_competing_A' }),
    W.act('super', { op: 'issue', itemId: id, holderKey: EKEYS.leader, base, requestId: 'TEST_ONLY_competing_B' }),
  ]);
  assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_issues')[0].n, 1);
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_movements')[0].n, 1);
  assert.equal(W.DB.q('SELECT MAX(serial_number) n FROM custody_issues')[0].n, 1);
  assert.equal(ok(await W.get()).summary.held, 1);
});

test('bounded authorization witnesses never read or serialize the retired custody document', async () => {
  const W = await world(),
    id = await item(W, 2),
    prepare = W.DB.prepare.bind(W.DB),
    reads = [];
  W.DB.prepare = (sql) => {
    const st = prepare(sql);
    if (/\bFROM kv\b/.test(sql)) {
      const bind = st.bind.bind(st);
      st.bind = (...args) => {
        reads.push({ sql, args });
        return bind(...args);
      };
    }
    return st;
  };
  ok(await W.act('employee1', { op: 'issue', itemId: id, holderKey: EKEYS.employee1 }));
  ok(await W.get('employee1'));
  const retired = 'bsdept:' + D1 + ':bassam_custody_v1';
  assert.equal(
    reads.some((r) => /SELECT[^;]*\bv\b/.test(r.sql) && r.args.some((v) => typeof v === 'string' && v.includes(retired))),
    false,
  );
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?', retired)[0].n, 0);
});

test('server clock and session guards reject forged dates, other identities, frozen accounts and malformed bodies', async () => {
  const W = await world(),
    id = await item(W),
    body = { op: 'issue', itemId: id, holderKey: EKEYS.employee1 };
  assert.equal((await W.act('super', { ...body, year: 1400 })).status, 400);
  assert.equal((await W.act('super', { ...body, uid: IDS.employee1 })).status, 409);
  assert.equal((await W.get('frozen')).status, 401);
  assert.equal((await W.api('super', '/api/custody/act', null)).status, 400);
  const out = ok(await W.act('super', body)),
    row = W.DB.q('SELECT hijri_year y,hijri_month m,hijri_day d FROM custody_movements WHERE move_id=?', out.outputs[0].moveId)[0];
  assert.deepEqual(copy(row), copy(W.W.cuClock()));
  W.DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,0,?)').run('bsdept:' + D1 + ':bassam_custody_v1', '{"items":[],"moves":[]}');
  assert.equal((await W.get()).status, 503);
  assert.equal((await W.act('super', body)).status, 503);
});

async function planActor(W, who = 'super') {
  const mode = W.env.KIVO_AUTHZ_MODE === 'enforce' ? await W.W.enfModeOf(W.env) : null;
  return W.W.actorOf({ ...W.env, ...(mode?.mode === 'enforce' ? { __enf: mode } : {}) }, IDS[who]);
}
const employeeKey = 'bsdept:' + D1 + ':bassam_employees_v1';
const employeesOf = (W) => inspectOperationalFixture(W.env, employeeKey);   /* RISHAD-266 · schema 10: typed roster */
async function cleanupPlan(W, intent, newEmployees, who = 'super') {
  return W.W.cuPlanCleanup(W.env, await planActor(W, who), {
    dept: D1,
    base: await W.W.cuRev(W.env, D1),
    intent,
    oldEmployees: employeesOf(W),
    newEmployees,
    reason: 'TEST_ONLY explicit workflow',
  });
}
async function commitPlanWithEmployees(W, plan, newEmployees, extra = []) {
  assert.equal(plan.checks.employeeGuardRequired, true);
  const employeeRev = W.DB.q('SELECT rev FROM revs WHERE k=?', employeeKey)[0]?.rev || 0;
  const op = await W.W.opChangeStatements(W.env, employeeKey, JSON.stringify(newEmployees), { base: employeeRev });   /* schema 10: typed rows */
  const guards = [W.W.revGuard(W.env, employeeKey, employeeRev), ...op.guards, ...plan.guards];
  const mutation = [...op.statements, ...plan.statements, ...extra];
  const finish = [W.DB.prepare("UPDATE meta SET v=CAST(CAST(v AS INTEGER)+1 AS TEXT) WHERE k='rev'")];
  for (const key of [employeeKey, ...plan.revisionKeys])
    finish.push(
      W.DB.prepare(
        "INSERT INTO revs(k,rev) VALUES(?1,CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER)) ON CONFLICT(k) DO UPDATE SET rev=excluded.rev",
      ).bind(key),
    );
  finish.push(
    W.DB.prepare(
      "INSERT INTO aud(cid,ts,uid,un,dept,k,rev,etype,eid,ename,act,ctx,bef,aft,ip,dev,city) VALUES(?1,1,'TEST_ONLY_super','',?2,?3,CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER),'dataset','custody','custody','cleanup','','','','','','')",
    ).bind('TEST_ONLY_atomic_' + ++request, D1, 'bsdept:' + D1 + ':bassam_custody_v1'),
  );
  return W.DB.batch([...guards, ...mutation, ...finish]);
}

for (const mode of ['legacy', 'enforce'])
  test(mode + ': employee cleanup uses the original delete grant, targets only removed holders and preserves prior orphans', async () => {
    const W = await world(mode),
      id = await item(W, 5);
    const outs = ok(
      await W.act('super', {
        op: 'issue-batch',
        lines: [
          { itemId: id, holderKey: EKEYS.employee1 },
          { itemId: id, holderKey: EKEYS.leader },
          { itemId: id, holderKey: 'TEST_ONLY_prior_orphan' },
        ],
      }),
    );
    const perms = JSON.parse(W.DB.q("SELECT v FROM kv WHERE k='bassam_perms_v1' AND seq=0")[0].v);
    perms.emps[D1][EKEYS.employee1]['emps/data'] = ['view', 'del'];
    perms.emps[D1][EKEYS.employee1]['emps/custody'] = ['view'];
    await W.DB.batch(W.W.kvPutStmts(W.env, 'kv', 'bassam_perms_v1', JSON.stringify(perms)));
    const next = employeesOf(W).filter((e) => e.eid !== EKEYS.employee1),
      before = snapshot(W.DB),
      plan = await cleanupPlan(W, 'employee-delete', next, 'employee1');
    assert.deepEqual(snapshot(W.DB), before, 'Planning has no domain writes');
    assert.equal(plan.checks.affectedMoves, 1);
    await commitPlanWithEmployees(W, plan, next);
    assert.deepEqual(
      W.DB.q('SELECT holder_key FROM custody_movements ORDER BY holder_key')
        .map((r) => r.holder_key)
        .sort(),
      [EKEYS.leader, 'TEST_ONLY_prior_orphan'].sort(),
    );
    assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n, 1);
    assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_issues')[0].n, 2);
    assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_issues WHERE issue_id=?', outs.outputs[0].issueId)[0].n, 0);
  });

test('cleanup rollback restores employee KV, movements, issues, revision and success audit together', async () => {
  const W = await world(),
    id = await item(W),
    out = ok(await W.act('super', { op: 'issue', itemId: id, holderKey: EKEYS.employee1 })),
    next = employeesOf(W).filter((e) => e.eid !== EKEYS.employee1),
    plan = await cleanupPlan(W, 'employee-delete', next);
  const before = {
    typed: snapshot(W.DB),
    kv: copy(W.DB.q('SELECT * FROM kv ORDER BY k,seq')),
    meta: copy(W.DB.q('SELECT * FROM meta ORDER BY k')),
    revs: copy(W.DB.q('SELECT * FROM revs ORDER BY k')),
    audit: copy(W.DB.q('SELECT * FROM aud ORDER BY id')),
  };
  W.DB.failIf = (sql) => /^INSERT INTO aud\(/.test(sql);
  await assert.rejects(commitPlanWithEmployees(W, plan, next), /injected failure/);
  W.DB.failIf = null;
  assert.deepEqual(snapshot(W.DB), before.typed);
  assert.deepEqual(copy(W.DB.q('SELECT * FROM kv ORDER BY k,seq')), before.kv);
  assert.deepEqual(copy(W.DB.q('SELECT * FROM meta ORDER BY k')), before.meta);
  assert.deepEqual(copy(W.DB.q('SELECT * FROM revs ORDER BY k')), before.revs);
  assert.deepEqual(copy(W.DB.q('SELECT * FROM aud ORDER BY id')), before.audit);
  assert.ok(out.outputs.length);
});

test('cleanup CAS rejects a new targeted movement even when an external writer did not bump the domain revision', async () => {
  const W = await world(),
    id = await item(W),
    out = ok(await W.act('super', { op: 'issue', itemId: id, holderKey: EKEYS.employee1 })),
    next = employeesOf(W).filter((e) => e.eid !== EKEYS.employee1),
    plan = await cleanupPlan(W, 'employee-delete', next);
  const old = W.DB.q('SELECT * FROM custody_movements WHERE move_id=?', out.outputs[0].moveId)[0],
    columns = Object.keys(old),
    row = { ...old, move_id: 'TEST_ONLY_external_append', sequence: old.sequence + 1, kind: 'in' };
  W.DB.db
    .prepare(
      'INSERT INTO custody_movements(' + columns.map((k) => '"' + k + '"').join(',') + ') VALUES(' + columns.map(() => '?').join(',') + ')',
    )
    .run(...columns.map((k) => row[k]));
  const before = copy(W.DB.q('SELECT * FROM kv ORDER BY k,seq'));
  await assert.rejects(commitPlanWithEmployees(W, plan, next), /KIVO_CUSTODY_TARGET_CHANGED/);
  assert.deepEqual(copy(W.DB.q('SELECT * FROM kv ORDER BY k,seq')), before);
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_movements')[0].n, 2);
});

test('replacement import clears all custody movements including old orphans but retains the catalog', async () => {
  const W = await world(),
    id = await item(W, 3);
  ok(
    await W.act('super', {
      op: 'issue-batch',
      lines: [
        { itemId: id, holderKey: EKEYS.employee1 },
        { itemId: id, holderKey: 'TEST_ONLY_prior_orphan' },
      ],
    }),
  );
  const next = employeesOf(W).map((e) => ({ ...e, eid: 'TEST_ONLY_replaced_' + e.eid })),
    plan = await cleanupPlan(W, 'import-replace', next);
  assert.equal(plan.checks.affectedMoves, 2);
  await commitPlanWithEmployees(W, plan, next);
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_movements')[0].n, 0);
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_issues')[0].n, 0);
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n, 1);
});

test('explicit department wipe clears only that department and must be approved by its original super-only workflow', async () => {
  const W = await world(),
    id = await item(W);
  ok(await W.act('super', { op: 'issue', itemId: id, holderKey: EKEYS.employee1 }));
  W.DB.db
    .prepare('INSERT INTO custody_items VALUES(?,?,?,?,?,?,?)')
    .run(D2, 'TEST_ONLY_foreign_keep', 'TEST_ONLY other', 1, 'X', '#fff', 7);
  await assert.rejects(cleanupPlan(W, 'dept-wipe', [], 'manager1'), /custody-denied/);
  const plan = await cleanupPlan(W, 'dept-wipe', []);
  await commitPlanWithEmployees(W, plan, []);
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_items WHERE department_id=?', D1)[0].n, 0);
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_movements WHERE department_id=?', D1)[0].n, 0);
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_items WHERE department_id=?', D2)[0].n, 1);
});

test('typed export returns complete full/scoped domains without credential or receipt tables', async () => {
  const W = await world(),
    id = await item(W);
  ok(await W.act('super', { op: 'issue', itemId: id, holderKey: EKEYS.employee1 }));
  const full = await W.api('super', '/api/custody/export');
  assert.equal(full.status, 200);
  assert.ok(full.json.domains.length >= 2);
  assert.equal(full.json.domains.find((d) => d.scope.departmentId === D1).rows.moves.length, 1);
  assert.equal(JSON.stringify(full.json).includes('fingerprint'), false);
  assert.equal(JSON.stringify(full.json).includes('account_uid'), false);
  assert.equal(JSON.stringify(full.json).includes('ph'), false);
  const scoped = await W.api('super', '/api/custody/export?dept=' + D1);
  assert.equal(scoped.status, 200);
  assert.equal(scoped.json.domains.length, 1);
  assert.equal(scoped.json.domains[0].scope.departmentId, D1);
  assert.equal((await W.api('employee1', '/api/custody/export')).status, 403);
  assert.equal((await W.api('employee1', '/api/custody/export?dept=' + D2)).status, 403);
});

test('validated scoped restore plans are read-only until one caller-owned transaction installs exact typed rows', async () => {
  const W = await world(),
    id = await item(W);
  ok(await W.act('super', { op: 'issue', itemId: id, holderKey: 'TEST_ONLY_orphan' }));
  const domain = (await W.api('super', '/api/custody/export?dept=' + D1)).json.domains[0],
    A = await planActor(W),
    base = await W.W.cuRev(W.env, D1),
    before = snapshot(W.DB),
    plan = await W.W.cuPlanRestore(W.env, A, domain, { dept: D1, base, scope: 'dept', mode: 'replace', reason: 'TEST_ONLY restore' });
  assert.deepEqual(snapshot(W.DB), before);
  assert.deepEqual(plan.revisionKeys, ['bsdept:' + D1 + ':bassam_custody_v1']);
  await W.DB.batch([...plan.guards, ...plan.statements]);
  assert.deepEqual(copy(await W.W.cuSnapshotRows(W.env, D1)), domain.rows);
  const invalid = copy(domain);
  invalid.rows.moves[0].item_id = 'TEST_ONLY_other_item';
  const current = snapshot(W.DB);
  await assert.rejects(
    W.W.cuPlanRestore(W.env, A, invalid, { dept: D1, base, scope: 'dept', mode: 'replace', reason: 'TEST_ONLY restore' }),
    /custody-domain-move-reference/,
  );
  assert.deepEqual(snapshot(W.DB), current);
});

test('legacy employee name records retain the original cleanupAssignments name-survivor behavior', async () => {
  const W = await world(),
    id = await item(W, 3),
    old = ['TEST_ONLY old employee name', 'TEST_ONLY retained name'];
  await replaceOperationalFixture(W.env, employeeKey, old);
  ok(
    await W.act('super', {
      op: 'issue-batch',
      lines: [
        { itemId: id, holderKey: old[0] },
        { itemId: id, holderKey: old[1] },
        { itemId: id, holderKey: 'TEST_ONLY prior orphan' },
      ],
    }),
  );
  const next = [{ eid: 'TEST_ONLY retained stable id', name: old[1] }],
    plan = await cleanupPlan(W, 'employee-delete', next);
  assert.equal(plan.checks.affectedMoves, 1);
  await commitPlanWithEmployees(W, plan, next);
  assert.deepEqual(
    W.DB.q('SELECT holder_key FROM custody_movements ORDER BY holder_key').map((r) => r.holder_key),
    ['TEST_ONLY prior orphan', 'TEST_ONLY retained name'],
  );
});

test('cleanup permission cannot be replaced with custody edit and known-holder cleanup does not consume an older snapshot-only orphan', async () => {
  const W = await world(),
    id = await item(W, 3),
    old = employeesOf(W),
    victim = old.find((e) => e.eid === EKEYS.employee1);
  const receipt = ok(
    await W.act('super', {
      op: 'issue-batch',
      lines: [
        { itemId: id, holderKey: EKEYS.employee1 },
        { itemId: id, holderKey: 'TEST_ONLY_older_orphan' },
      ],
    }),
  );
  W.DB.db.prepare('UPDATE custody_movements SET holder_nid_snapshot=? WHERE move_id=?').run(victim.nid, receipt.outputs[1].moveId);
  const next = old.filter((e) => e.eid !== EKEYS.employee1),
    before = snapshot(W.DB);
  await assert.rejects(cleanupPlan(W, 'employee-delete', next, 'leader'), /custody-cleanup-permission/);
  assert.deepEqual(snapshot(W.DB), before);
  const plan = await cleanupPlan(W, 'employee-delete', next);
  assert.equal(plan.checks.affectedMoves, 1);
  await commitPlanWithEmployees(W, plan, next);
  assert.deepEqual(
    W.DB.q('SELECT holder_key FROM custody_movements').map((r) => r.holder_key),
    ['TEST_ONLY_older_orphan'],
  );
});

test('malformed normalized restore rows fail completely before any target statement runs', async () => {
  const W = await world(),
    id = await item(W);
  ok(await W.act('super', { op: 'issue', itemId: id, holderKey: 'TEST_ONLY_orphan' }));
  const domain = (await W.api('super', '/api/custody/export?dept=' + D1)).json.domains[0],
    A = await planActor(W),
    opt = { dept: D1, base: await W.W.cuRev(W.env, D1), scope: 'full', mode: 'replace', reason: 'TEST_ONLY restore' };
  const changes = [
    (d) => d.rows.items.push(copy(d.rows.items[0])),
    (d) => {
      d.scope.departmentId = D2;
    },
    (d) => {
      d.rows.issues[0].serial_number = 0;
    },
    (d) => {
      d.rows.moves[0].presence_mask = 0;
    },
    (d) => d.rows.moves.push({ ...d.rows.moves[0], move_id: 'TEST_ONLY_duplicate_sequence' }),
    (d) => {
      d.rows.requests = [];
    },
    (d) => {
      d.rows.moves[0].actor_uid = { TEST_ONLY: true };
    },
  ];
  const before = snapshot(W.DB);
  for (const mutate of changes) {
    const bad = copy(domain);
    mutate(bad);
    await assert.rejects(W.W.cuPlanRestore(W.env, A, bad, opt), /custody-/);
    assert.deepEqual(snapshot(W.DB), before);
  }
  await assert.rejects(W.W.cuPlanRestore(W.env, await planActor(W, 'employee1'), domain, opt), /custody-restore-full-super-only/);
  await assert.rejects(W.W.cuPlanRestore(W.env, A, domain, { ...opt, mode: 'merge' }), /custody-restore-mode/);
});

test('scoped backup permission cannot turn a non-manager into a restore owner', async () => {
  const W = await world(),
    id = await item(W);
  ok(await W.act('super', { op: 'issue', itemId: id, holderKey: 'TEST_ONLY_orphan' }));
  const domain = (await W.api('super', '/api/custody/export?dept=' + D1)).json.domains[0],
    grantKey = 'bsdept:' + D1 + ':bassam_grants_v1';
  const grants = {
    v: 1,
    emp: { [EKEYS.employee1]: { plus: ['backup.restore'], minus: [] }, [EKEYS.manager1]: { plus: ['backup.restore'], minus: [] } },
  };
  await W.DB.batch(W.W.kvPutStmts(W.env, 'kv', grantKey, JSON.stringify(grants)));
  const opt = { dept: D1, base: await W.W.cuRev(W.env, D1), scope: 'dept', mode: 'replace', reason: 'TEST_ONLY scoped restore' };
  await assert.rejects(W.W.cuPlanRestore(W.env, await planActor(W, 'employee1'), domain, opt), /custody-restore-permission/);
  const plan = await W.W.cuPlanRestore(W.env, await planActor(W, 'manager1'), domain, opt);
  assert.equal(plan.metadata.departmentId, D1);
  assert.equal(plan.checks.finalDepartmentGuardRequired, true);
});

test('large UTF-8 batches split SQL parameters without splitting the transaction or losing restored movement text', async () => {
  const W = await world(),
    id = await item(W, 100),
    condition = 'ق'.repeat(4000),
    prepare = W.DB.prepare.bind(W.DB),
    payloads = [];
  W.DB.prepare = (sql) => {
    const st = prepare(sql);
    if (/^INSERT INTO custody_movements/.test(sql)) {
      const bind = st.bind.bind(st);
      st.bind = (...args) => {
        payloads.push(...args.filter((a) => typeof a === 'string'));
        return bind(...args);
      };
    }
    return st;
  };
  const ack = ok(
    await W.act('super', {
      op: 'issue-batch',
      lines: Array.from({ length: 100 }, () => ({ itemId: id, holderKey: 'TEST_ONLY_orphan', condition })),
    }),
  );
  assert.equal(ack.n, 100);
  assert.equal(ack.outputs.length, 100);
  assert.ok(payloads.length >= 2);
  assert.ok(payloads.every((text) => Buffer.byteLength(text) <= 600000));
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM custody_movements WHERE condition=?', condition)[0].n, 100);
  const domain = (await W.api('super', '/api/custody/export?dept=' + D1)).json.domains[0],
    plan = await W.W.cuPlanRestore(W.env, await planActor(W), domain, {
      dept: D1,
      base: ack.rev,
      scope: 'full',
      mode: 'replace',
      reason: 'TEST_ONLY large restore',
    });
  await W.DB.batch([...plan.guards, ...plan.statements]);
  assert.deepEqual(copy(await W.W.cuSnapshotRows(W.env, D1)), domain.rows);
});

async function transitionFixture(W, next, extra = {}) {
  const before = employeesOf(W),
    revs = Object.fromEntries(W.DB.q('SELECT k,rev FROM revs').map((r) => [r.k, r.rev]));
  const body = {
    set: { [employeeKey]: JSON.stringify(next) },
    del: [],
    base: {
      [employeeKey]: revs[employeeKey] || 0,
      ...(extra.cuBase === false ? {} : { ['bsdept:' + D1 + ':bassam_custody_v1']: await W.W.cuRev(W.env, D1) }),
    },
    ops: extra.ops || {},
  };
  const plan = {
    __plan: 1,
    ok: extra.ok !== false,
    pend: [{ k: employeeKey, act: 'set', cur: JSON.stringify(before), v: JSON.stringify(next), have: revs[employeeKey] || 0 }],
    revs,
    protectedOp: extra.protectedOp,
    ...(extra.serverDepartmentWipes ? { serverDepartmentWipes: extra.serverDepartmentWipes } : {}),
  };
  return { body, plan, A: await planActor(W) };
}

test('normal save transition keeps name edits and canonical identity adoption separate from cleanup', async () => {
  const W = await world(),
    next = copy(employeesOf(W));
  next[0].name = 'TEST_ONLY name-only edit';
  let fx = await transitionFixture(W, next, { cuBase: false }),
    result = await W.W.cuPlanSaveTransition(W.env, fx.A, fx.body, fx.plan);
  assert.equal(result.coupled, false);
  assert.equal(result.statements.length, 0);
  const old = [{ name: 'TEST_ONLY legacy adoption', empno: 'TEST_ONLY old number' }];
  await replaceOperationalFixture(W.env, employeeKey, old);
  fx = await transitionFixture(W, [{ ...old[0], eid: 'TEST_ONLY adopted stable key' }], { cuBase: false });
  result = await W.W.cuPlanSaveTransition(W.env, fx.A, fx.body, fx.plan);
  assert.equal(result.coupled, false);
  assert.equal(result.statements.length, 0);
});

test('normal save transition rejects coupled partial plans and requires the customer custody CAS for affected history', async () => {
  const W = await world(),
    id = await item(W);
  ok(await W.act('super', { op: 'issue', itemId: id, holderKey: EKEYS.employee1 }));
  const next = employeesOf(W).filter((e) => e.eid !== EKEYS.employee1);
  let fx = await transitionFixture(W, next, { cuBase: false });
  await assert.rejects(W.W.cuPlanSaveTransition(W.env, fx.A, fx.body, fx.plan), /custody-base-required/);
  fx = await transitionFixture(W, next, { ok: false, protectedOp: 'empDelete' });
  fx.plan.pend = [];
  const result = await W.W.cuPlanSaveTransition(W.env, fx.A, fx.body, fx.plan);
  assert.equal(result.coupled, true);
  assert.equal(result.blocked, true);
  assert.equal(result.statements.length, 0);
  fx = await transitionFixture(W, next);
  const accepted = await W.W.cuPlanSaveTransition(W.env, fx.A, fx.body, fx.plan);
  assert.equal(accepted.coupled, true);
  assert.equal(accepted.blocked, false);
  assert.equal(accepted.transitions[0].intent, 'employee-delete');
  assert.equal(accepted.transitions[0].checks.affectedMoves, 1);
});

test('explicit import replacement and private department wipe have separate server-only normal-save intents', async () => {
  const W = await world(),
    id = await item(W);
  ok(await W.act('super', { op: 'issue', itemId: id, holderKey: 'TEST_ONLY orphan' }));
  let fx = await transitionFixture(W, employeesOf(W), { ops: { [employeeKey]: { op: 'import.run', mode: 'replace' } } });
  fx.plan.pend = [];
  await assert.rejects(W.W.cuPlanSaveTransition(W.env, fx.A, fx.body, fx.plan), /custody-cleanup-permission/);
  fx.body.why = { [employeeKey]: 'TEST_ONLY human supplied import replacement reason' };
  let result = await W.W.cuPlanSaveTransition(W.env, fx.A, fx.body, fx.plan);
  assert.equal(result.transitions[0].intent, 'import-replace');
  assert.equal(result.transitions[0].checks.affectedMoves, 1);
  fx = await transitionFixture(W, [], { serverDepartmentWipes: [D1] });
  fx.body.why = { [employeeKey]: 'TEST_ONLY human supplied department wipe reason' };
  result = await W.W.cuPlanSaveTransition(W.env, fx.A, fx.body, fx.plan);
  assert.equal(result.transitions[0].intent, 'dept-wipe');
  fx = await transitionFixture(W, employeesOf(W));
  fx.body.serverDepartmentWipes = [D1];
  result = await W.W.cuPlanSaveTransition(W.env, fx.A, fx.body, fx.plan);
  assert.equal(result.coupled, false, 'A body field cannot mint a private wipe intent');
});

test('restore rowset guards and late insertion failure preserve every original domain row', async () => {
  const W = await world(),
    id = await item(W);
  ok(await W.act('super', { op: 'issue', itemId: id, holderKey: 'TEST_ONLY_orphan' }));
  const domain = (await W.api('super', '/api/custody/export?dept=' + D1)).json.domains[0],
    A = await planActor(W),
    opt = { dept: D1, base: await W.W.cuRev(W.env, D1), scope: 'full', mode: 'replace', reason: 'TEST_ONLY restore' };
  let plan = await W.W.cuPlanRestore(W.env, A, domain, opt);
  W.DB.db.prepare('UPDATE custody_items SET qty=qty+1 WHERE department_id=?').run(D1);
  const changed = snapshot(W.DB);
  await assert.rejects(W.DB.batch([...plan.guards, ...plan.statements]), /KIVO_CUSTODY_TARGET_CHANGED/);
  assert.deepEqual(snapshot(W.DB), changed);
  plan = await W.W.cuPlanRestore(W.env, A, domain, opt);
  W.DB.failIf = (sql) => /^INSERT INTO custody_movements/.test(sql);
  await assert.rejects(W.DB.batch([...plan.guards, ...plan.statements]), /injected failure/);
  W.DB.failIf = null;
  assert.deepEqual(snapshot(W.DB), changed);
});
