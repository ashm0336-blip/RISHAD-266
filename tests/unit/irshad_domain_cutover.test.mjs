import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidateWorker, world, authorizeCandidateUpgrade } from './irshad_domain_fx.mjs';
import { D1, D2, identitySnapshot } from './custody_review_fx.mjs';

const doc = () => ({
  reports: {
    reports: [
      {
        id: 'TEST_ONLY_B',
        y: 1448,
        m: 1,
        d: 2,
        ts: 123,
        shift: 'TEST_ONLY_shift',
        eid: 'TEST_ONLY_removed_employee',
        name: 'ح'.repeat(5000),
        loc: null,
        actor: 'TEST_ONLY_actor',
        langs: [{ lang: 'TEST_ONLY_L', count: 0 }, { lang: 'TEST_ONLY_L', count: null }, { count: -1 }, {}],
        bro: 0,
        pros: null,
        pol: -2,
        editedTs: 0,
        editedBy: null,
        lang: 'TEST_ONLY legacy language',
        n: 5.5,
        by: null,
        test: 'TEST_ONLY',
      },
      { id: 'TEST_ONLY_A', langs: null },
      { id: 'TEST_ONLY_C', langs: [] },
      { id: 'TEST_ONLY_D' },
    ],
  },
  languages: ['TEST_ONLY_A', 'TEST_ONLY_A', ''],
  locations: [],
  retro: {
    v: 1,
    windows: [
      {
        id: 'TEST_ONLY_window',
        scope: { y: 1448, m: 1, d: null },
        at: 0,
        until: 20,
        hours: 0.01,
        reason: 'TEST_ONLY',
        reasonMissing: false,
        by: { id: 'TEST_ONLY_actor', un: 'TEST_ONLY', ekey: '', name: null },
        closedAt: null,
        closedBy: null,
      },
      { id: 'TEST_ONLY_window_2', scope: { y: 1448, m: 2 }, by: {}, closedBy: { id: 'TEST_ONLY' } },
    ],
  },
});
const copy = (x) => JSON.parse(JSON.stringify(x));
const counts = (f) =>
  Object.fromEntries(
    Object.values(f.W.IR_TABLES).map(([name]) => [name, f.DB.q('SELECT COUNT(*) AS n FROM ' + name)[0].n]),
  );
const rawSnapshot = (f) => ['kv', 'meta', 'revs', 'd1_migrations'].map((n) => [n, copy(f.DB.q('SELECT * FROM ' + n))]);

test('existing field contract preserves timestamps, original order, absent/null/zero and duplicate catalog/language values exactly', async () => {
  const W = await candidateWorker(),
    legacy = doc(),
    rows = W.irConvert(D1, legacy);
  assert.deepEqual(W.irInflate(rows), legacy);
  assert.deepEqual(W.irValidateDomain(rows, D1), rows);
  assert.equal(rows.rows.reports[0].employee_key, 'TEST_ONLY_removed_employee');
  assert.equal(rows.rows.reports[0].employee_name.length, 5000);
  assert.equal(rows.rows.languages.length, 4);
  assert.equal(rows.rows.catalogs.length, 3);
});
test('missing resources remain distinct from explicit empty resources and language defaults are presentation only', async () => {
  const W = await candidateWorker();
  for (const d of [
    {},
    { languages: [] },
    { locations: [] },
    { reports: { reports: [] } },
    { retro: {} },
    { retro: { v: null, windows: [] } },
  ])
    assert.deepEqual(W.irInflate(W.irConvert(D1, d)), d);
});
test('ambiguous IDs, unknown fields and unrepresentable types refuse conversion without record-value errors', async () => {
  const W = await candidateWorker();
  for (const d of [
    { reports: { reports: [{ id: 'TEST_ONLY' }, { id: 'TEST_ONLY' }] } },
    { reports: { reports: [{ id: 'TEST_ONLY', unknown: 'DO_NOT_PRINT' }] } },
    { reports: { reports: [{ id: 'TEST_ONLY', langs: [{ lang: 'TEST_ONLY', extra: 1 }] }] } },
    { reports: { reports: [{ id: 'TEST_ONLY', ts: '123' }] } },
    { retro: { windows: [{ id: 'TEST_ONLY', scope: { y: 1448, m: 1 }, by: { role: 'super' } }] } },
  ])
    assert.throws(
      () => W.irConvert(D1, d),
      (e) => e.irCode && !e.message.includes('DO_NOT_PRINT'),
    );
});
test('normalized domains cannot forge scope, orphan children, masks, resources or catalog kinds', async () => {
  const W = await candidateWorker(),
    original = W.irConvert(D1, doc());
  for (const mutate of [
    (x) => (x.scope.departmentId = D2),
    (x) => (x.rows.languages[0].report_id = 'TEST_ONLY_no_parent'),
    (x) => (x.rows.reports[0].presence_mask = 0),
    (x) => (x.resources.languages = false),
    (x) => (x.rows.catalogs[0].kind = 'not-known'),
  ]) {
    const bad = copy(original);
    mutate(bad);
    assert.throws(() => W.irValidateDomain(bad, D1));
  }
});
test('actual migration8 startup under canonical schema9 backfills four resources without changing identities/revisions and removes every old KV chunk', async () => {
  const f = await world({ legacy: true }),
    legacy = doc(),
    before = identitySnapshot(f.DB),
    revBefore = f.DB.q('SELECT * FROM revs');
  for (const [key, value] of Object.entries(legacy)) {
    const idx = ['reports', 'languages', 'locations', 'retro'].indexOf(key);
    await f.DB.batch(f.W.kvPutStmts(f.env, 'kv', f.W.irKey(D1, idx), JSON.stringify(value)));
  }
  await f.W.initDb(f.env);
  assert.equal(f.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(f.W.KIVO_SCHEMA_VERSION));
  assert.deepEqual(f.W.irInflate(await f.W.irSnapshot(f.env, D1)), legacy);
  assert.deepEqual(identitySnapshot(f.DB), before);
  assert.deepEqual(f.DB.q('SELECT * FROM revs'), revBefore);
  assert.equal(await f.W.irLegacyPresent(f.env), false);
  assert.equal(counts(f).irshad_reports, 4);
  for (const [name] of Object.values(f.W.IR_TABLES))
    assert.equal(
      f.DB.q('PRAGMA foreign_key_list(' + name + ')').some((r) => r.table === 'kv' || r.table === 'employees'),
      false,
    );
});
test('validated startup has one atomic cutover and does not silently accept unscoped, malformed or gapped sources', async () => {
  for (const row of [
    { k: 'bassam_irshad_v1', seq: 0, v: '{"reports":[]}' },
    { k: 'bsdept:' + D1 + ':bassam_irshad_v1', seq: 1, v: '{"reports":[]}' },
    { k: 'bsdept:' + D1 + ':bassam_irshad_v1', seq: 0, v: 'INVALID' },
    { k: 'bsdept:' + D1 + ':bassam_irshad_v1', seq: 0, v: '{"reports":[{"id":"TEST_ONLY","unknown":1}]}' },
  ]) {
    const f = await world({ legacy: true });
    f.DB.db.prepare('INSERT INTO kv(k,seq,v)VALUES(?,?,?)').run(row.k, row.seq, row.v);
    const before = rawSnapshot(f);
    await assert.rejects(f.W.initDb(f.env));
    assert.deepEqual(rawSnapshot(f), before);
    assert.equal(f.DB.q("SELECT 1 FROM sqlite_master WHERE name='irshad_reports'").length, 0);
  }
});
test('a source append after planning fails inside the same DDL/DML transaction', async () => {
  const f = await world({ legacy: true }),
    key = f.W.irKey(D1);
  await f.DB.batch(f.W.kvPutStmts(f.env, 'kv', key, JSON.stringify(doc().reports)));
  const plan = await f.W.irLegacyPrepare(f.env);
  f.DB.db.prepare('INSERT INTO kv(k,seq,v)VALUES(?,?,?)').run(key, 1, 'TEST_ONLY_late');
  const before = rawSnapshot(f),
    migration = f.W.KIVO_MIGRATIONS.find(m=>m.name==='0008_irshad');
  await assert.rejects(f.DB.batch([...plan.before, ...migration.sql.map((s) => f.DB.prepare(s)), ...plan.after]),/KIVO_RESTORE_TARGET/);
  assert.deepEqual(rawSnapshot(f), before);
  assert.equal(f.DB.q("SELECT 1 FROM sqlite_master WHERE name='irshad_reports'").length, 0);
});
test('a target writer after planning survives the failed cutover without being overwritten', async () => {
  const f = await world({ legacy: true }),
    key = f.W.irKey(D1);
  await f.DB.batch(f.W.kvPutStmts(f.env, 'kv', key, JSON.stringify(doc().reports)));
  const plan = await f.W.irLegacyPrepare(f.env),
    migration = f.W.KIVO_MIGRATIONS.find(m=>m.name==='0008_irshad');
  // Explicit out-of-band target state between read-only prepare and commit.
  for (const s of migration.sql.filter((s) => /^CREATE /.test(s))) f.DB.exec(s);
  f.DB.db
    .prepare('INSERT INTO irshad_catalog_entries(department_id,kind,position,value)VALUES(?,?,?,?)')
    .run(D1, 'languages', 0, 'TEST_ONLY_target');
  const before = rawSnapshot(f);
  await assert.rejects(f.DB.batch([...plan.before, ...migration.sql.map((s) => f.DB.prepare(s)), ...plan.after]),/KIVO_IRSHAD_TARGET_CHANGED/);
  assert.deepEqual(rawSnapshot(f), before);
  assert.equal(f.DB.q('SELECT value FROM irshad_catalog_entries')[0].value, 'TEST_ONLY_target');
});
test('late insertion failure rolls back DDL, source deletion, metadata, audit-independent revisions and accounts', async () => {
  const f = await world({ legacy: true });
  await f.DB.batch(f.W.kvPutStmts(f.env, 'kv', f.W.irKey(D1), JSON.stringify(doc().reports)));
  const before = rawSnapshot(f),
    ident = identitySnapshot(f.DB),
    old = f.DB.batch.bind(f.DB);
  f.DB.batch = async (st) => {
    if (st.some((s) => /INSERT .*INTO irshad_reports /.test(s.sql)))
      st = st.concat(f.DB.prepare("SELECT json_extract('{}','TEST_ONLY_FAIL')"));
    return old(st);
  };
  await assert.rejects(f.W.initDb(f.env));
  assert.deepEqual(rawSnapshot(f), before);
  assert.deepEqual(identitySnapshot(f.DB), ident);
  assert.equal(f.DB.q("SELECT 1 FROM sqlite_master WHERE name='irshad_reports'").length, 0);
});
test('typed SQL storage roundtrip retains historic employee snapshots without an account/employee FK or legacy copy', async () => {
  const f = await world(),
    before = identitySnapshot(f.DB),
    data = f.W.irConvert(D1, doc());
  await f.DB.batch(f.W.irInstallStatements(f.env, data));
  const exported = await f.W.irSnapshot(f.env, D1);
  assert.deepEqual(f.W.irInflate(exported), doc());
  assert.deepEqual(f.W.irInflate(f.W.irValidateDomain(exported, D1)), doc());
  assert.deepEqual(identitySnapshot(f.DB), before);
  assert.equal(await f.W.irLegacyPresent(f.env), false);
});

for (const [label, resource, raw, suffix] of [
  ['repeated report namespace', 'bassam_irshad_v1', '{"reports":[]}', ':extra:bassam_irshad_v1'],
  ['repeated catalog namespace', 'bassam_irshad_langs_v1', '["TEST_ONLY"]', ':extra:bassam_irshad_langs_v1'],
  ['suffixed resource', 'bassam_irshad_locs_v1', '["TEST_ONLY"]', ':suffix'],
  ['suffixed unscoped resource', 'bassam_irshad_retro_v1', '{"windows":[]}', ':suffix'],
]) test('malformed namespace is refused without DDL or source removal: ' + label, async () => {
  const f = await world({ legacy: true }), key = (label === 'suffixed unscoped resource' ? '' : 'bsdept:' + D1 + ':') + resource + suffix;
  f.DB.db.prepare('INSERT INTO kv(k,seq,v)VALUES(?,?,?)').run(key, 0, raw); const before = rawSnapshot(f);
  await assert.rejects(f.W.irLegacyPrepare(f.env), error => error.irCode === 'irshad-cutover-scope-unknown');
  assert.deepEqual(rawSnapshot(f), before); assert.equal(f.DB.q('SELECT v FROM kv WHERE k=?', key)[0].v, raw);
  assert.equal(f.DB.q("SELECT name FROM sqlite_master WHERE name GLOB 'irshad_*'").length, 0);
});

test('canonical 7-to-9 upgrade fences migration8 and consumes one exact explicit synthetic permit at the final migration', async () => {
  const f = await world({ legacy: true, authorize: false }), before = rawSnapshot(f);
  await assert.rejects(f.W.initDb(f.env), /db-migration-permit-required/); assert.deepEqual(rawSnapshot(f), before);
  assert.equal(f.DB.q("SELECT name FROM sqlite_master WHERE name GLOB 'irshad_*'").length, 0);
  const permit = authorizeCandidateUpgrade(f.DB, f.W), names = f.W.KIVO_MIGRATIONS.map(m => m.name);
  assert.equal(names.length, f.W.KIVO_SCHEMA_VERSION); assert.deepEqual(permit.migrations, names.slice(7)); assert.equal(permit.from, 7); assert.equal(permit.to, f.W.KIVO_SCHEMA_VERSION);
  await f.W.initDb(f.env); assert.equal(f.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(f.W.KIVO_SCHEMA_VERSION));
  assert.deepEqual(f.DB.q('SELECT name FROM d1_migrations ORDER BY name').map(row => row.name), names);
  assert.equal(f.DB.q("SELECT v FROM meta WHERE k='schema_upgrade_permit_v1'").length, 0);
});

test('the real migration fence rejects a permit removed between its read and canonical batch without partial cutover', async () => {
  const f = await world({ legacy: true }), key = f.W.irKey(D1);
  await f.DB.batch(f.W.kvPutStmts(f.env, 'kv', key, JSON.stringify(doc().reports)));
  const batch = f.DB.batch.bind(f.DB); let changed = false, before;
  f.DB.batch = async statements => {
    if (!changed && statements.some(statement => statement.sql.includes('KIVO_DB_MIGRATION_PERMIT'))) {
      changed = true; f.DB.exec("DELETE FROM meta WHERE k='schema_upgrade_permit_v1'"); before = rawSnapshot(f);
    }
    return batch(statements);
  };
  await assert.rejects(f.W.initDb(f.env), /KIVO_DB_MIGRATION_PERMIT/); assert.equal(changed, true); assert.deepEqual(rawSnapshot(f), before);
  assert.equal(f.DB.q("SELECT name FROM sqlite_master WHERE name GLOB 'irshad_*'").length, 0);
});

test('the real migration guard rejects an expired or wrong-target synthetic permit without touching legacy source rows', async () => {
  for (const mutate of [permit => permit.expiresAt = 1, permit => permit.to = 7]) {
    const f = await world({ legacy: true }), key = f.W.irKey(D1);
    await f.DB.batch(f.W.kvPutStmts(f.env, 'kv', key, JSON.stringify(doc().reports)));
    const permit = JSON.parse(f.DB.q("SELECT v FROM meta WHERE k='schema_upgrade_permit_v1'")[0].v); mutate(permit);
    f.DB.db.prepare("UPDATE meta SET v=? WHERE k='schema_upgrade_permit_v1'").run(JSON.stringify(permit)); const before = rawSnapshot(f);
    await assert.rejects(f.W.initDb(f.env), /db-migration-permit-invalid/); assert.deepEqual(rawSnapshot(f), before);
  }
});

test('registered department is required before any schema8 DDL or source removal', async () => {
  const f = await world({legacy:true}), key=f.W.irKey('TEST_ONLY_unregistered');
  await f.DB.batch(f.W.kvPutStmts(f.env,'kv',key,JSON.stringify(doc().reports)));
  const before=rawSnapshot(f);
  await assert.rejects(f.W.initDb(f.env),error=>error.irCode==='irshad-cutover-department-unregistered');
  assert.deepEqual(rawSnapshot(f),before);
  assert.equal(f.DB.q("SELECT name FROM sqlite_master WHERE name GLOB 'irshad_*'").length,0);
});

test('department removal after cutover planning is rejected inside the pre-DDL fence', async () => {
  const f=await world({legacy:true}), key=f.W.irKey(D1);
  await f.DB.batch(f.W.kvPutStmts(f.env,'kv',key,JSON.stringify(doc().reports)));
  const plan=await f.W.irLegacyPrepare(f.env), migration=f.W.KIVO_MIGRATIONS.find(m=>m.name==='0008_irshad');
  f.DB.db.prepare('UPDATE kv SET v=? WHERE k=? AND seq=0').run(JSON.stringify(f.keys.bassam_depts_v1.filter(d=>d.id!==D1)),'bassam_depts_v1');
  const before=rawSnapshot(f);
  await assert.rejects(f.DB.batch([...plan.before,...migration.sql.map(sql=>f.DB.prepare(sql)),...plan.after]),/KIVO_RESTORE_TARGET/);
  assert.deepEqual(rawSnapshot(f),before);
  assert.equal(f.DB.q("SELECT name FROM sqlite_master WHERE name GLOB 'irshad_*'").length,0);
});
