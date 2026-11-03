import { world, ok, seedMessage, mixed, custody, snap, TABLES } from './atomic_restore_review_fx.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { isDeepStrictEqual } from 'node:util';
import { parse } from '../../node_modules/acorn/dist/acorn.mjs';
import { ROOT, SRC } from './harness.mjs';
import { D1, D2, IDS, EKEYS, copy, identitySnapshot } from './notifications_review_fx.mjs';
import { canonicalDigest } from './custody_review_fx.mjs';
import { currentOperationResources } from './backup_review_fx.mjs';
import { inspectOperationalFixture } from './operational_legacy_seed_fx.mjs';
const OPTIONS = 'bsdept:' + D1 + ':bassam_last_export_v1';   /* schema 10: a plain-KV department key (options/gate_opts are typed operational resources) */
const KV_PROBE = (dept) => 'bsdept:' + dept + ':bassam_last_export_v1';   /* plain-KV probe for any department (schema 10) */
let rid = 0;

test('canonical parts execute their actual migration declarations without rewriting the checkout', async () => {
  const digest = canonicalDigest(),
    B = await world(),
    declarations = B.W.KIVO_MIGRATIONS.map((m) => m.name),
    actual = fs
      .readdirSync(path.join(ROOT, 'migrations'))
      .filter((n) => /^\d{4}_.+\.sql$/.test(n))
      .sort()
      .map((n) => n.slice(0, -4));
  assert.equal(canonicalDigest(), digest);
  assert.deepEqual(declarations, actual);
  assert.equal(new Set(declarations).size, declarations.length);
  assert.ok(B.W.KIVO_SCHEMA_VERSION >= 7);
  assert.equal(B.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(B.W.KIVO_SCHEMA_VERSION));
  assert.equal(B.DB.q('PRAGMA foreign_keys')[0].foreign_keys, 1);
});

test('single actual POST commits KV+daily stats+notifications, preserves protected documents, snapshots empty tables and deduplicates exact retries', async () => {
  const B = await world(),
    identity = identitySnapshot(B.DB),
    body = await mixed(B),
    before = snap(B.DB);
  B.DB.log = [];
  const ack = ok(await B.restore(body));
  assert.ok(ack.rev > 1);
  assert.equal(await B.W.rsEpoch(B.env), 1);
  assert.deepEqual(identitySnapshot(B.DB), identity);
  assert.equal(B.DB.q('SELECT v FROM kv WHERE k=?1', OPTIONS)[0].v, '{"TEST_ONLY":"restored"}');
  assert.equal(B.DB.q('SELECT title FROM notification_messages')[0].title, 'TEST_ONLY restored title');
  assert.equal(B.DB.q('SELECT legacy_boolean FROM daily_stats_month_locks')[0].legacy_boolean, 1);
  assert.equal(B.DB.q('SELECT row_count FROM restore_snapshot_manifest WHERE table_key=?1', 'daily_stats_day_locks')[0].row_count, 0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM aud WHERE k=?1', 'atomic_restore')[0].n, 1);
  assert.equal(
    B.DB.q('SELECT row_json FROM restore_preimage WHERE table_key=?1', 'notification_messages').map((r) => JSON.parse(r.row_json))[0].title,
    before.notification_messages[0].title,
  );
  const after = snap(B.DB);
  assert.equal(ok(await B.restore(body)).duplicate, 1);
  assert.deepEqual(snap(B.DB), after);
  assert.equal((await B.restore({ ...body, reason: 'TEST_ONLY changed content' })).json.err, 'restore-request-reused');
  assert.equal(B.DB.q("SELECT COUNT(*) n FROM kv WHERE k GLOB '*bassam_dstats_v1' OR k GLOB '*bassam_notif*'")[0].n, 0);
});

test('mid-batch failure rolls back data, snapshots, revisions, epoch, receipt, audit and account sessions', async () => {
  const B = await world(),
    body = await mixed(B),
    before = snap(B.DB),
    sessions = copy(B.DB.q('SELECT * FROM sess'));
  B.DB.failIf = (sql) => /^INSERT (?:OR REPLACE )?INTO notification_messages/.test(sql);
  const response = await B.restore(body);
  B.DB.failIf = null;
  assert.equal(response.status, 500);
  assert.equal(response.json.ok, 0);
  assert.deepEqual(snap(B.DB), before);
  assert.deepEqual(copy(B.DB.q('SELECT * FROM sess')), sessions);
  assert.equal(ok(await B.restore(body)).ok, 1);
});

test('all policy inputs are CAS guarded even when absent from the requested keys', async () => {
  const B = await world(),
    body = await B.body({ keys: { [OPTIONS]: '{"TEST_ONLY":1}' } });
  body.base.kv[OPTIONS] = 0;
  const A = await B.W.actorOf(B.env, IDS.super),
    plan = await B.W.rsPrepare(B.env, A, body, {});
  B.DB.exec("UPDATE kv SET v='{}' WHERE k='bassam_perms_v1'");
  const before = snap(B.DB);
  await assert.rejects(B.W.rsCommit(B.env, A, plan, {}), /KIVO_RESTORE_TARGET/);
  assert.deepEqual(snap(B.DB), before);
});

test('a late actual NF read-state writer captured before restore cannot commit after its epoch', async () => {
  const B = await world();
  await seedMessage(B);
  const feed = ok(await B.api('employee1', '/api/notifications?uid=' + IDS.employee1)),
    id = feed.items[0].id,
    body = await B.body({ keys: { [KV_PROBE(D2)]: '{"TEST_ONLY":"epoch change"}' } }),
    batch = B.DB.batch.bind(B.DB);
  body.base.kv[KV_PROBE(D2)] = 0;
  let entered, release;
  const gate = new Promise((r) => (entered = r)),
    resume = new Promise((r) => (release = r));
  let held = false;
  B.DB.batch = async (st) => {
    if (!held && st.some((s) => /^INSERT INTO notification_user_state/.test(s.sql))) {
      held = true;
      entered();
      await resume;
    }
    return batch(st);
  };
  const pending = B.api('employee1', '/api/notifications/act', { uid: IDS.employee1, op: 'state', action: 'read', id });
  await gate;
  ok(await B.restore(body));
  release();
  const result = await pending;
  assert.equal(result.status, 409, JSON.stringify(result.json));
  assert.equal(result.json.err, 'restore-epoch-changed');
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM notification_user_state')[0].n, 0);
});

test('wrong scope, unknown domain, retired keys and malformed NF relations fail without business writes', async () => {
  for (const variant of ['scope', 'domain', 'retired', 'relation']) {
    const B = await world(),
      body = await B.body();
    if (variant === 'scope') {
      body.scope = { kind: 'dept', departmentId: D2 };
      body.keys[OPTIONS] = '{}';
      body.base.kv[OPTIONS] = 0;
    }
    if (variant === 'domain') body.domains.TEST_ONLY_unknown = {};
    if (variant === 'retired') {
      body.keys.bassam_notif_sys_v1 = '[]';
      body.base.kv.bassam_notif_sys_v1 = 0;
    }
    if (variant === 'relation') {
      body.domains.notifications = await B.W.nfRead(B.env);
      body.domains.notifications.states = [
        {
          account_uid: IDS.employee1,
          message_scope: 'd:' + D1,
          message_id: 'TEST_ONLY_missing',
          read_at: 1,
          acknowledged_at: 0,
          dismissed_at: 0,
        },
      ];
      body.base.notifications = { rev: 0, configRev: 0, broadcastRev: 0 };
    }
    const before = snap(B.DB),
      response = await B.restore(body);
    assert.ok([400, 403].includes(response.status), JSON.stringify(response.json));
    assert.equal(response.json.ok, 0);
    assert.deepEqual(snap(B.DB), before);
  }
});

test('application restore preserves credentials, rejects password changes and still revokes sessions for an authorized account freeze', async () => {
  const B = await world(),
    users = copy(B.users);
  users.find((u) => u.id === IDS.employee1).name = 'TEST_ONLY renamed';
  const sessions = copy(B.DB.q('SELECT * FROM sess'));
  ok(await B.restore(await B.body({ keys: { bassam_auth_users_v1: JSON.stringify(users) } })));
  assert.deepEqual(copy(B.DB.q('SELECT * FROM sess')), sessions);
  const next = copy(users);
  next.find((u) => u.id === IDS.employee1).ph = 'p2$100000$' + 'c'.repeat(32) + '$' + 'd'.repeat(64);
  const before = snap(B.DB),
    denied = await B.restore(await B.body({ keys: { bassam_auth_users_v1: JSON.stringify(next) } }));
  assert.equal(denied.status, 409);
  assert.equal(denied.json.err, 'restore-credential-change');
  assert.deepEqual(snap(B.DB), before);
  users.find((u) => u.id === IDS.employee1).dis = 1;
  ok(await B.restore(await B.body({ keys: { bassam_auth_users_v1: JSON.stringify(users) } })));
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sess WHERE uid=?1', IDS.employee1)[0].n, 0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sess WHERE uid=?1', IDS.employee2)[0].n, 1);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sec WHERE act=?1', 'pw_change')[0].n, 0);
});

test('account restore keeps current hash when backup omits it and rejects loss of final active super', async () => {
  const B = await world(),
    users = copy(B.users);
  users.forEach((u) => delete u.ph);
  ok(await B.restore(await B.body({ keys: { bassam_auth_users_v1: JSON.stringify(users) } })));
  const restored = JSON.parse(
    B.DB.q('SELECT v FROM kv WHERE k=?1', 'bassam_auth_users_v1')
      .map((r) => r.v)
      .join(''),
  );
  assert.deepEqual(
    restored.map((u) => u.ph),
    B.users.map((u) => u.ph),
  );
  const b = await B.body({ keys: { bassam_auth_users_v1: JSON.stringify(restored.filter((u) => u.role !== 'super')) } }),
    before = snap(B.DB);
  assert.equal((await B.restore(b)).status, 403);
  assert.deepEqual(snap(B.DB), before);
});

test('four domains commit together through the actual API; custody export preserves orphan/snapshots and native IDs', async () => {
  const B = await world(),
    cu = await custody(B),
    body = await mixed(B);
  body.domains.custody = body.domains.custody.map((d) => (d.scope.departmentId === D1 ? copy(cu.domain) : d));
  body.domains.custody[0].rows.items[0].name = 'TEST_ONLY restored radio';
  body.base.custody[D1] = await B.W.cuRev(B.env, D1);
  const identity = identitySnapshot(B.DB),
    acks = ok(await B.restore(body));
  assert.equal(acks.counts.custody, 2);
  const exported = ok(await B.api('super', '/api/custody/export?dept=' + D1)).domains[0];
  assert.deepEqual(exported.rows.issues, cu.domain.rows.issues);
  assert.deepEqual(exported.rows.moves, cu.domain.rows.moves);
  assert.equal(exported.rows.items[0].name, 'TEST_ONLY restored radio');
  assert.equal(B.DB.q('SELECT holder_key FROM custody_movements')[0].holder_key, 'TEST_ONLY orphan retained');
  assert.deepEqual(identitySnapshot(B.DB), identity);
  assert.equal(
    B.DB.q('SELECT COUNT(*) n FROM restore_preimage WHERE domain=?1', 'custody')[0].n,
    6,
    'Typed history plus internal old requests/output preimage, never client exports',
  );
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_requests')[0].n, 0);
});

test('failure in the final custody inserts rolls back all earlier KV/stats/NF/account writes and old custody receipts', async () => {
  const B = await world(),
    cu = await custody(B),
    body = await mixed(B);
  body.domains.custody = body.domains.custody.map((d) => (d.scope.departmentId === D1 ? cu.domain : d));
  body.base.custody[D1] = await B.W.cuRev(B.env, D1);
  const users = copy(B.users);
  users.find((u) => u.id === IDS.employee1).dis = 1;
  body.keys.bassam_auth_users_v1 = JSON.stringify(users);
  const before = snap(B.DB),
    sessions = copy(B.DB.q('SELECT * FROM sess'));
  B.DB.failIf = (sql) => /^INSERT.*INTO custody_movements/.test(sql);
  const r = await B.restore(body);
  B.DB.failIf = null;
  assert.equal(r.status, 500, JSON.stringify(r.json));
  assert.deepEqual(snap(B.DB), before);
  assert.deepEqual(copy(B.DB.q('SELECT * FROM sess')), sessions);
  ok(await B.restore(body));
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sess WHERE uid=?1', IDS.employee1)[0].n, 0);
});

test('employee list replacement without a custody domain preserves prior orphan history and inventory catalog', async () => {
  const B = await world();
  await custody(B);
  const key = 'bsdept:' + D1 + ':bassam_employees_v1',
    body = await B.body({ keys: { [key]: '[]' } });
  body.base.custody[D1] = await B.W.cuRev(B.env, D1);
  const identity = identitySnapshot(B.DB);
  const prior = inspectOperationalFixture(B.env, key);
  assert.ok(Array.isArray(prior) && prior.length > 0, 'the typed employee list is non-empty before the restore');
  ok(await B.restore(body));
  assert.deepEqual(inspectOperationalFixture(B.env, key), [], 'the typed employee list is replaced by the requested value');
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_movements')[0].n, 1);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_issues')[0].n, 1);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n, 1);
  assert.deepEqual(identitySnapshot(B.DB), identity);
});

test('full replacement derives removed department account/session pruning and custody cleanup from final department IDs', async () => {
  const B = await world();
  await custody(B, D2);
  const body = await B.body({ keys: { bassam_depts_v1: JSON.stringify(B.keys.bassam_depts_v1.filter((d) => d.id !== D2)) } });
  body.base.custody[D2] = await B.W.cuRev(B.env, D2);
  for (const name of ['messages', 'targets', 'states', 'dedup'])
    body.domains.notifications[name] = body.domains.notifications[name].filter(
      (r) => (name === 'states' ? r.message_scope : r.scope) !== 'd:' + D2,
    );
  ok(await B.restore(body));
  const users = JSON.parse(
    B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_auth_users_v1')
      .map((r) => r.v)
      .join(''),
  );
  assert.ok(users.some((u) => u.id === IDS.super));
  assert.ok(users.some((u) => u.id === IDS.gm));
  assert.equal(
    users.some((u) => u.deptId === D2),
    false,
  );
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sess WHERE uid IN (?1,?2)', IDS.employee2, IDS.manager2)[0].n, 0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_items WHERE department_id=?1', D2)[0].n, 0);
  assert.equal(
    B.DB.q('SELECT COUNT(*) n FROM kv WHERE k LIKE ?1', 'bsdept:' + D2 + ':%')[0].n,
    0,
    'Closed full restore deletion leaves no orphan scoped KV',
  );
});

test('a backup cannot change the current actor credential/login or supply cur as proof of reauthentication', async () => {
  for (const variant of ['password', 'login', 'cur']) {
    const B = await world(),
      users = copy(B.users);
    if (variant === 'password') users.find((u) => u.id === IDS.super).ph = 'p2$100000$' + 'e'.repeat(32) + '$' + 'f'.repeat(64);
    if (variant === 'login') users.find((u) => u.id === IDS.super).un = '0509999976';
    const body = await B.body({ keys: { bassam_auth_users_v1: JSON.stringify(users) } });
    if (variant === 'cur') body.cur = 'TEST_ONLY_not_reauthentication';
    const before = snap(B.DB),
      sessions = copy(B.DB.q('SELECT * FROM sess')),
      r = await B.restore(body);
    assert.ok([400, 409].includes(r.status), JSON.stringify(r.json));
    assert.equal(r.json.ok, 0);
    assert.deepEqual(snap(B.DB), before);
    assert.deepEqual(copy(B.DB.q('SELECT * FROM sess')), sessions);
  }
});

test('actual AppBackup export from redacted GET cache restores existing credentials without exporting a hash or inventing a password', async () => {
  const B = await world(),
    protectedBefore = identitySnapshot(B.DB),
    sessions = copy(B.DB.q('SELECT * FROM sess')),
    keys = Object.keys(B.keys),
    response = ok(await B.api('super', '/api/get?keys=' + encodeURIComponent(keys.join(',')))),
    storage = new Map(Object.entries(response.keys).map(([k, r]) => [k, r.v]));
  assert.equal(/p[12]\$/.test(storage.get('bassam_auth_users_v1')), false);
  const source = fs.readFileSync(path.join(SRC, 'modules/admin/logic.js'), 'utf8'),
    tree = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  let node;
  function visit(o) {
    if (!o || typeof o !== 'object' || node) return;
    if (o.type === 'Property' && o.key.name === 'exportBackup') {
      node = o;
      return;
    }
    Object.values(o).forEach((v) => (Array.isArray(v) ? v.forEach(visit) : visit(v)));
  }
  visit(tree);
  assert.ok(node);
  const daily = await B.W.dsDomainRead(B.env),
    notificationExport = ok(await B.api('super', '/api/notifications/export')),
    KIVO = {
      BassamDepts: {
        allScopedKeys: () => keys.filter((k) => k.startsWith('bsdept:')),
        raw: { getItem: (k) => storage.get(k) ?? null },
        list: () => B.keys.bassam_depts_v1,
      },
      DailyStats: { refresh: async () => daily.data, revision: () => daily.rev },
      BassamNotif: { exportDomain: async () => notificationExport },
      Custody: { exportDomain: async () => ok(await B.api('super', '/api/custody/export')) },
      BassamCrypt: { ok: () => true },
      BassamIDB: { allForBackup: async () => ({}) },
      BassamAuth: { user: () => B.users.find(user => user.id === IDS.super), isSuper: () => true },
      __BS_SRV: { dirty: () => false, inflight: () => false, sesChanged: () => false, rev: key => response.keys[key]?.rev || 0, operations: { resources: currentOperationResources() } },
    },
    context = vm.createContext({ KIVO, window: { __BS_BOOT: { srv: 1, cf: 1, uid: IDS.super, v: response.v } }, localStorage: {}, setTimeout: () => 0, clearTimeout() {}, AbortController, URLSearchParams, Date,
      fetch: async url => { const actual = await B.api('super', url); return { ok: actual.status >= 200 && actual.status < 300, status: actual.status, json: async () => actual.json }; } }),
    page = {
      state: {},
      setState(v) {
        Object.assign(this.state, v);
      },
    },
    factory = vm.runInContext('(function(){const s=true;return ' + source.slice(node.value.start, node.value.end) + ';})', context);
  const cls = tree.body.find(n => n.type === 'ClassDeclaration' && n.id.name === 'Component');
  for (const name of ['_wpActor', '_irBackupCapture', '_irBackupFence']) {
    const method = cls.body.body.find(n => n.type === 'MethodDefinition' && n.key.name === name); assert.ok(method, name);
    page[name] = vm.runInContext('({' + source.slice(method.start, method.end) + '}).' + name, context);
  }
  vm.runInContext(fs.readFileSync(path.join(SRC,'services/548-atomic-backup.js'),'utf8'),context);
  factory.call(page)();
  for (let i = 0, end = Date.now() + 20000; (i < 50 || Date.now() < end) && !page._encPend; i++) await new Promise((r) => setImmediate(r));   /* time-bounded: real WebCrypto work */
  assert.ok(page._encPend, JSON.stringify(page.state));
  const file = JSON.parse(page._encPend.json);
  assert.equal(file.kind, 'full');
  assert.equal(file.manifest.version, 4);   /* schema 10: manifest v4 carries the typed operations domain */
  assert.equal(file.manifest.domains.custody, 1);
  assert.equal(file.manifest.domains.irshad, 1);
  assert.equal(file.manifest.domains.operations, 1);
  assert.deepEqual(file.domains.irshad.map(d => d.scope.departmentId).sort(), [D1, D2].sort());
  assert.deepEqual(file.domains.operations.map(d => d.scope.departmentId + ':' + d.resource).sort(), [D1, D2].flatMap(d => currentOperationResources().map(r => d + ':' + r)).sort());
  assert.equal(/p[12]\$/.test(file.data.bassam_auth_users_v1), false);
  const body = await B.body({
    keys: Object.fromEntries(Object.entries(file.data).filter(([k, v]) => typeof v === 'string' && k !== 'bassam_active_dept_v1')),
    domains: file.domains,
    manifest: file.manifest,
  });
  body.base.dailyStats = daily.rev;
  const targetNF = await B.W.nfRead(B.env);
  body.base.notifications = { rev: targetNF.rev, configRev: targetNF.configRev, broadcastRev: targetNF.broadcastRev };
  body.base.custody = { [D1]: 0, [D2]: 0 };
  ok(await B.restore(body));
  const protectedAfter = identitySnapshot(B.DB);
  for (const k of new Set(protectedBefore.map((r) => r.k)))
    assert.ok(
      isDeepStrictEqual(
        JSON.parse(
          protectedAfter
            .filter((r) => r.k === k)
            .map((r) => r.v)
            .join(''),
        ),
        JSON.parse(
          protectedBefore
            .filter((r) => r.k === k)
            .map((r) => r.v)
            .join(''),
        ),
      ),
      'Existing credential/permission object preserved: ' + k,
    );
  assert.deepEqual(copy(B.DB.q('SELECT * FROM sess')), sessions);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sec WHERE act=?1', 'pw_change')[0].n, 0);
});

test('a new backup account without a credential remains unable to authenticate and is reported without generating a default PIN', async () => {
  const B = await world(),
    users = B.users.map(({ ph, ...u }) => u),
    id = 'TEST_ONLY_imported_no_password',
    username = '0509999988';
  users.push({
    id,
    un: username,
    name: 'TEST_ONLY missing credential',
    role: 'staff',
    deptId: D1,
    ekey: 'TEST_ONLY_imported_ekey',
    mc: 0,
    dis: 0,
  });
  const ack = ok(await B.restore(await B.body({ keys: { bassam_auth_users_v1: JSON.stringify(users) } })));
  assert.equal(ack.counts.accountsWithoutCredential, 1);
  const stored = JSON.parse(
    B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_auth_users_v1')
      .map((r) => r.v)
      .join(''),
  ).find((u) => u.id === id);
  assert.equal(stored.ph, undefined);
  assert.equal((await B.api(null, '/api/login', { u: username, p: '123456' })).json.ok, 0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sess WHERE uid=?1', id)[0].n, 0);
});

test('full merge adds only missing departments and their typed custody; existing data, accounts and global stats are retained', async () => {
  const B = await world(),
    cu = await custody(B),
    D3 = 'TEST_ONLY_department_new',
    domain = copy(cu.domain);
  domain.scope.departmentId = D3;
  Object.values(domain.rows).forEach((rows) => rows.forEach((r) => (r.department_id = D3)));
  const existingOptions = OPTIONS,
    newOptions = KV_PROBE(D3);
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', existingOptions, '{"TEST_ONLY":"keep"}'));
  await B.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1)').bind(existingOptions).run();
  const before = copy(B.DB.q('SELECT * FROM custody_movements WHERE department_id=?1', D1)),
    identity = identitySnapshot(B.DB),
    body = await B.body({
      mode: 'merge',
      keys: {
        bassam_depts_v1: JSON.stringify([
          B.keys.bassam_depts_v1[0],
          { id: D3, name: 'TEST_ONLY new department', gid: B.keys.bassam_depts_v1[0].gid },
        ]),
        [existingOptions]: '{"TEST_ONLY":"overwrite forbidden"}',
        [newOptions]: '{"TEST_ONLY":"new"}',
        bassam_auth_users_v1: '[]',
      },
      domains: {
        custody: [domain],
        dailyStats: { version: 1, data: { haram: { '1448-01-02': { worshippers: 999 } }, nabawi: {}, locks: {} } },
      },
    });
  body.base.kv[newOptions] = 0;
  body.base.custody = { [D3]: 0 };
  ok(await B.restore(body));
  assert.equal(B.DB.q('SELECT v FROM kv WHERE k=?1', existingOptions)[0].v, '{"TEST_ONLY":"keep"}');
  assert.equal(B.DB.q('SELECT v FROM kv WHERE k=?1', newOptions)[0].v, '{"TEST_ONLY":"new"}');
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM daily_stats_days')[0].n, 0);
  assert.deepEqual(copy(B.DB.q('SELECT * FROM custody_movements WHERE department_id=?1', D1)), before);
  assert.deepEqual(identitySnapshot(B.DB), identity);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_movements WHERE department_id=?1', D3)[0].n, 1);
});

test('department merge fills missing documents and preserves existing typed domains as whole units', async () => {
  const B = await world(),
    cu = await custody(B),
    key = OPTIONS,
    before = snap(B.DB),
    body = await B.body({
      scope: { kind: 'dept', departmentId: D1 },
      mode: 'merge',
      keys: { [key]: '{}' },
      domains: { custody: [{ version: 1, scope: { departmentId: D1 }, rows: { items: [], issues: [], moves: [] } }] },
    });
  body.base.kv[key] = 0;
  ok(await B.restore(body));
  assert.deepEqual(copy(B.DB.q('SELECT * FROM custody_movements')), before.custody_movements);
  assert.deepEqual(copy(B.DB.q('SELECT * FROM custody_items')), before.custody_items);
  assert.equal(B.DB.q('SELECT v FROM kv WHERE k=?1', key)[0].v, '{}');
});

test('R2 is never touched; a new image payload refuses the whole restore before any business mutation', async () => {
  const B = await world(),
    calls = [];
  B.env.IMG_R2 = Object.fromEntries(
    ['put', 'get', 'delete', 'head', 'list'].map((k) => [
      k,
      async () => {
        calls.push(k);
        throw Error('TEST_ONLY R2 must not be used');
      },
    ]),
  );
  const body = await B.body({ keys: { [OPTIONS]: '{"TEST_ONLY":"img_testonly_testonly"}' } });
  body.base.kv[OPTIONS] = 0;
  const before = snap(B.DB),
    response = await B.restore(body);
  assert.equal(response.json.err, 'restore-image-body-missing');
  assert.deepEqual(snap(B.DB), before);
  assert.deepEqual(calls, []);
  const good = await B.body({ keys: { [OPTIONS]: '{"TEST_ONLY":"no image"}' } });
  good.base.kv[OPTIONS] = 0;
  ok(await B.restore(good));
  assert.deepEqual(calls, []);
});

test('a late actual generic KV save is fenced after restore and cannot recreate the old value', async () => {
  const B = await world(),
    body = await B.body({ keys: { [KV_PROBE(D2)]: '{"TEST_ONLY":"epoch change"}' } }),
    batch = B.DB.batch.bind(B.DB);
  body.base.kv[KV_PROBE(D2)] = 0;
  let entered, release;
  const gate = new Promise((r) => (entered = r)),
    resume = new Promise((r) => (release = r));
  let held = false;
  B.DB.batch = async (st) => {
    if (!held && st.some((s) => /^DELETE FROM kv WHERE k =/.test(s.sql))) {
      held = true;
      entered();
      await resume;
    }
    return batch(st);
  };
  const pending = B.api('super', '/api/save', { set: { [OPTIONS]: '{"TEST_ONLY":"late old save"}' }, del: [], base: { [OPTIONS]: 0 } });
  await gate;
  ok(await B.restore(body));
  release();
  const response = await pending;
  assert.equal(response.status, 409, JSON.stringify(response.json));
  assert.equal(response.json.err, 'restore-epoch-changed');
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1', OPTIONS)[0].n, 0);
});

test('concurrent restore plans on one epoch produce one complete ACK and one conflict, with one receipt/preimage set', async () => {
  const B = await world(),
    a = await B.body({ keys: { [OPTIONS]: '{"TEST_ONLY":"one"}' } }),
    b = await B.body({ keys: { [OPTIONS]: '{"TEST_ONLY":"two"}' } });
  a.base.kv[OPTIONS] = b.base.kv[OPTIONS] = 0;
  const responses = await Promise.all([B.restore(a), B.restore(b)]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal(responses.filter((r) => r.json.ok === 1).length, 1);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
  assert.equal(await B.W.rsEpoch(B.env), 1);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM aud WHERE k=?1', 'atomic_restore')[0].n, 1);
});

test('13,006 synthetic existing accounts restore in one bounded batch with inherited hashes and no per-account SQL/session loss', async (t) => {
  const B = await world(),
    all = copy(B.users);
  for (let i = all.length; i < 13006; i++)
    all.push({
      id: 'TEST_ONLY_bulk_' + i,
      un: String(2000000000 + i),
      name: 'TEST_ONLY synthetic ' + i,
      role: 'staff',
      deptId: D1,
      ekey: 'TEST_ONLY_bulk_key_' + i,
      ph: B.users[0].ph,
      mc: 0,
      dis: 0,
    });
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_auth_users_v1', JSON.stringify(all)));
  const exported = all.map(({ ph, ...u }) => u);
  exported.at(-1).name = 'TEST_ONLY renamed final row';
  const b = await B.body({ keys: { bassam_auth_users_v1: JSON.stringify(exported) } }),
    batch = B.DB.batch.bind(B.DB),
    mutations = [],
    sessions = copy(B.DB.q('SELECT * FROM sess'));
  B.DB.batch = async (st) => {
    if (st.some((s) => /^(?:INSERT.*INTO kv|DELETE FROM kv)/.test(s.sql))) mutations.push(st);
    return batch(st);
  };
  ok(await B.restore(b));
  t.diagnostic(
    'TEST_ONLY account_count=13006 request_utf8_bytes=' +
      new TextEncoder().encode(JSON.stringify(b)).byteLength +
      ' mutation_batches=' +
      mutations.length +
      ' batch_statements=' +
      mutations[0].length,
  );
  assert.equal(mutations.length, 1);
  assert.ok(
    mutations[0].length <= 100,
    'One restore must remain below the 100-statement transaction budget; actual=' + mutations[0].length,
  );
  const restored = JSON.parse(
    B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_auth_users_v1')
      .map((r) => r.v)
      .join(''),
  );
  const saved = B.DB.q(
      'SELECT row_json FROM restore_preimage WHERE domain=?1 AND table_key=?2 ORDER BY row_number',
      'kv',
      'bassam_auth_users_v1',
    ).map((r) => JSON.parse(r.row_json)),
    native = [];
  let parts = [];
  for (const row of saved) {
    if (row.__restore_fragment === 1) {
      if (row.index === 0) parts = [];
      parts.push(row.text);
      if (row.index === row.count - 1) native.push(JSON.parse(parts.join('')));
    } else native.push(row);
  }
  assert.equal(
    native
      .sort((a, b) => a.seq - b.seq)
      .map((r) => r.v)
      .join('') === JSON.stringify(all),
    true,
    'Fragmented private preimage reconstructs original KV chunk bytes exactly',
  );
  assert.equal(restored.length, 13006);
  assert.equal(
    restored.every((u, i) => u.ph === all[i].ph),
    true,
    'All inherited credential bytes preserved',
  );
  assert.deepEqual(copy(B.DB.q('SELECT * FROM sess')), sessions);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sec WHERE act=?1', 'pw_change')[0].n, 0);
});

test('independent scope review regression: unknown final departments are rejected in typed custody, NF and ordinary KV', async () => {
  for (const kind of ['custody', 'notifications', 'kv']) {
    const B = await world(),
      unknown = 'TEST_ONLY_unknown_department',
      body = await B.body();
    if (kind === 'custody')
      body.domains.custody = [{ version: 1, scope: { departmentId: unknown }, rows: { items: [], issues: [], moves: [] } }];
    if (kind === 'notifications') {
      await seedMessage(B);
      body.domains.notifications = copy(await B.W.nfRead(B.env));
      for (const m of body.domains.notifications.messages) {
        m.scope = 'd:' + unknown;
        m.department = unknown;
      }
      for (const t of body.domains.notifications.targets) t.scope = 'd:' + unknown;
      body.base.notifications = { rev: body.domains.notifications.rev, configRev: 0, broadcastRev: 0 };
    }
    if (kind === 'kv') {
      const k = KV_PROBE(unknown);
      body.keys[k] = '{}';
      body.base.kv[k] = 0;
    }
    const before = snap(B.DB),
      r = await B.restore(body);
    assert.ok([400, 403].includes(r.status), JSON.stringify(r.json));
    assert.equal(r.json.ok, 0);
    assert.deepEqual(snap(B.DB), before);
  }
});

test('8 MiB request boundary is enforced on UTF-8 encoded bytes before parsing or writing', async () => {
  const B = await world(),
    body = await B.body({ reason: 'TEST_ONLY size probe' });
  body.keys[OPTIONS] = JSON.stringify({ TEST_ONLY: 'س'.repeat(4 * 1024 * 1024) });
  body.base.kv[OPTIONS] = 0;
  assert.ok(new TextEncoder().encode(JSON.stringify(body)).byteLength > 8 * 1024 * 1024);
  const before = snap(B.DB),
    r = await B.restore(body);
  assert.equal(r.status, 413);
  assert.equal(r.json.err, 'body-large');
  assert.deepEqual(snap(B.DB), before);
});

test('an existing-departments-only full merge leaves business revisions and restore epoch unchanged', async () => {
  const B = await world(),
    before = identitySnapshot(B.DB),
    body = await B.body({ mode: 'merge', keys: { bassam_depts_v1: JSON.stringify(B.keys.bassam_depts_v1), bassam_auth_users_v1: '[]' } }),
    revs = copy(B.DB.q('SELECT * FROM revs')),
    clock = B.DB.q("SELECT v FROM meta WHERE k='rev'")[0].v;
  const ack = ok(await B.restore(body));
  assert.equal(ack.counts.kv, 0);
  assert.equal(await B.W.rsEpoch(B.env), 0);
  assert.equal(B.DB.q("SELECT v FROM meta WHERE k='rev'")[0].v, clock);
  assert.deepEqual(copy(B.DB.q('SELECT * FROM revs')), revs);
  assert.deepEqual(identitySnapshot(B.DB), before);
});

test('lost completed transaction result is an explicit failure, and an exact transport retry returns the stored receipt without a second write', async () => {
  const B = await world(),
    body = await B.body({ keys: { [OPTIONS]: '{"TEST_ONLY":"committed once"}' } });
  body.base.kv[OPTIONS] = 0;
  const batch = B.DB.batch.bind(B.DB);
  let failed = false;
  B.DB.batch = async (st) => {
    const result = await batch(st);
    if (!failed && st.some((s) => /^INSERT INTO restore_operations/.test(s.sql))) {
      failed = true;
      throw Error('TEST_ONLY completed transaction result lost');
    }
    return result;
  };
  const first = await B.restore(body);
  B.DB.batch = batch;
  assert.equal(first.status, 500);
  assert.equal(first.json.ok, 0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
  const before = snap(B.DB),
    retry = ok(await B.restore(body));
  assert.equal(retry.duplicate, 1);
  assert.equal(retry.requestId, body.requestId);
  assert.deepEqual(snap(B.DB), before);
});

test('retired source documents prevent restore without importing or retiring them silently', async () => {
  for (const key of ['bassam_notif_sys_v1', 'bassam_dstats_v1', 'bsdept:' + D1 + ':bassam_custody_v1']) {
    const B = await world();
    await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', key, '{}'));
    const body = await B.body({ keys: { [OPTIONS]: '{}' } });
    body.base.kv[OPTIONS] = 0;
    const before = snap(B.DB),
      response = await B.restore(body);
    assert.equal(response.status, 503, JSON.stringify(response.json));
    assert.equal(response.json.ok, 0);
    assert.deepEqual(snap(B.DB), before);
  }
});

test('independent cleanup review regression: metadata-only employee restore does not wipe custody or need its revision', async () => {
  const B = await world();
  await custody(B);
  const key = 'bsdept:' + D1 + ':bassam_employees_v1',
    employees = copy(B.keys[key]);
  employees[0].name = 'TEST_ONLY metadata-only rename';
  const before = Object.fromEntries(
    ['custody_items', 'custody_issues', 'custody_movements', 'custody_requests', 'custody_request_outputs'].map((t) => [
      t,
      copy(B.DB.q('SELECT * FROM ' + t)),
    ]),
  );
  ok(await B.api('super', '/api/save', { set: { [key]: JSON.stringify(employees) }, del: [], base: { [key]: 1 } }));
  for (const [table, rows] of Object.entries(before))
    assert.deepEqual(copy(B.DB.q('SELECT * FROM ' + table)), rows, table + ' remains unchanged');
});

test('a sparse department backup is rejected instead of silently interpreting employee replacement as custody cleanup', async () => {
  const B = await world(),
    cu = await custody(B),
    key = 'bsdept:' + D1 + ':bassam_employees_v1',
    employees = copy(B.keys[key]).filter((e) => e.eid !== EKEYS.employee1),
    body = await B.body({ scope: { kind: 'dept', departmentId: D1 }, keys: { [key]: JSON.stringify(employees) } });
  delete body.manifest;
  body.domains = {};
  const before = snap(B.DB),
    response = await B.restore(body);
  assert.equal(response.status, 400);
  assert.equal(response.json.err, 'restore-incomplete-manifest');
  assert.deepEqual(snap(B.DB), before);
});

test('full requests missing the declared manifest, a domain, a custody scope or the exact key list reject before writes', async () => {
  for (const variant of ['manifest', 'notifications', 'custody', 'keys', 'sparse']) {
    const B = await world(),
      body = await B.body();
    if (variant === 'manifest') delete body.manifest;
    if (variant === 'notifications') delete body.domains.notifications;
    if (variant === 'custody') body.domains.custody = [];
    if (variant === 'keys') body.manifest.keys = [];
    if (variant === 'sparse') {
      body.keys = { ['bsdept:' + D1 + ':bassam_employees_v1']: '[]' };
      body.domains = {};
      delete body.manifest;
    }
    const before = snap(B.DB),
      r = await B.restore(body);
    assert.equal(r.status, 400, JSON.stringify(r.json));
    assert.match(r.json.err, /^restore-incomplete-/);
    assert.deepEqual(snap(B.DB), before);
  }
});

test('actual staged department export includes a manifest and normalized domains, and restores through the same POST compiler', async () => {
  const B = await world();
  await custody(B);
  await seedMessage(B);
  const keys = Object.keys(B.keys),
    read = ok(await B.api('super', '/api/get?keys=' + encodeURIComponent(keys.join(',')))),
    storage = new Map(Object.entries(read.keys).map(([k, r]) => [k, r.v])),
    source = fs.readFileSync(path.join(SRC, 'layouts/root-logic.js'), 'utf8'),
    tree = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  let node;
  function visit(o) {
    if (!o || typeof o !== 'object' || node) return;
    if (o.type === 'MethodDefinition' && o.key.name === 'bkExportRun') {
      node = o;
      return;
    }
    Object.values(o).forEach((v) => (Array.isArray(v) ? v.forEach(visit) : visit(v)));
  }
  visit(tree);
  assert.ok(node);
  const blobs = [],
    KIVO = {
      BassamDepts: {
        active: () => D1,
        activeName: () => 'TEST_ONLY department',
        keysOf: () => keys.filter((k) => k.startsWith('bsdept:' + D1 + ':')),
        raw: { getItem: (_k) => storage.get(_k) ?? null },
      },
      BassamNotif: { exportDomain: async (dept) => ok(await B.api('super', '/api/notifications/export?dept=' + dept)) },
      Custody: { exportDomain: async (dept) => ok(await B.api('super', '/api/custody/export?dept=' + dept)) },
      BassamImgRefs: { collect: () => [] },
      BassamAuth: { user: () => B.users.find(user => user.id === IDS.super), isSuper: () => true },
      __BS_SRV: { dirty: () => false, inflight: () => false, sesChanged: () => false, rev: key => read.keys[key]?.rev || 0, operations: { resources: currentOperationResources() } },
    },
    context = vm.createContext({
      KIVO,
      window: { __BS_BOOT: { srv: 1, cf: 1, uid: IDS.super, v: read.v } },
      fetch: async url => { const actual = await B.api('super', url); return { ok: actual.status >= 200 && actual.status < 300, status: actual.status, json: async () => actual.json }; },
      AbortController, URLSearchParams, clearTimeout() {},
      localStorage: {},
      Blob,
      Date,
      URL: {
        createObjectURL: (blob) => {
          blobs.push(blob);
          return 'blob:TEST_ONLY';
        },
        revokeObjectURL() {},
      },
      document: { body: { appendChild() {} }, createElement: () => ({ click() {}, remove() {} }) },
      setTimeout: () => 0,
    }),
    messages = [],
    page = { bkToast: (...v) => messages.push(v) };
  vm.runInContext(fs.readFileSync(path.join(SRC,'services/548-atomic-backup.js'),'utf8'),context);
  vm.runInContext('({' + source.slice(node.start, node.end) + '}).bkExportRun', context).call(page);
  for (let i = 0, end = Date.now() + 20000; (i < 100 || Date.now() < end) && !blobs.length; i++) await new Promise((r) => setImmediate(r));   /* time-bounded: real WebCrypto work */
  assert.equal(blobs.length, 1, JSON.stringify(messages));
  const file = JSON.parse(await blobs[0].text());
  assert.equal(file.manifest.version, 4);   /* schema 10: manifest v4 carries the typed operations domain */
  assert.equal(file.manifest.scope, 'dept');
  assert.deepEqual(file.manifest.departments, [D1]);
  assert.equal(file.manifest.domains.custody, 1);
  assert.equal(file.manifest.domains.irshad, 1);
  assert.equal(file.manifest.domains.operations, 1);
  assert.deepEqual(file.domains.irshad.map(d => d.scope.departmentId), [D1]);
  assert.deepEqual(file.domains.operations.map(d => d.scope.departmentId + ':' + d.resource).sort(), currentOperationResources().map(r => D1 + ':' + r).sort());
  const input = Object.fromEntries(Object.entries(file.data).map(([k, v]) => ['bsdept:' + D1 + ':' + k, v])),
    body = await B.body({ scope: { kind: 'dept', departmentId: D1 }, keys: input, domains: file.domains, manifest: file.manifest }),
    before = copy(B.DB.q('SELECT * FROM custody_movements'));
  ok(await B.restore(body));
  assert.deepEqual(copy(B.DB.q('SELECT * FROM custody_movements')), before);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM kv WHERE k GLOB ?1', '*bassam_custody_v1')[0].n, 0);
});

test('actual preload guard exposes withSession only when supported, forwards bookmarks and preserves the captured epoch', async () => {
  const B = await world(),
    bookmarks = [],
    native = B.DB,
    session = { prepare: native.prepare.bind(native), batch: native.batch.bind(native) },
    options = { columnNames: true };
  let forwarded;
  const prepare = session.prepare;
  session.prepare = (sql) => {
    const statement = prepare(sql),
      raw = statement.raw;
    statement.raw = function (o) {
      forwarded = o;
      return raw.call(statement, o);
    };
    return statement;
  };
  native.withSession = (bookmark) => {
    bookmarks.push(bookmark);
    return session;
  };
  const captured = await B.W.preAttach(
      B.env,
      new Request('http://x/api/ping', { headers: { Cookie: 'bs_tok=TEST_ONLY_session_super' } }),
      'api',
    ),
    body = await B.body({ keys: { [OPTIONS]: '{"TEST_ONLY":"epoch"}' } });
  body.base.kv[OPTIONS] = 0;
  ok(await B.restore(body));
  const wrappedSession = captured.DB.withSession('TEST_ONLY_bookmark');
  assert.equal(bookmarks.at(-1), 'TEST_ONLY_bookmark');
  assert.equal(typeof wrappedSession.withSession, 'undefined');
  await wrappedSession.prepare('SELECT 1 AS TEST_ONLY').raw(options);
  assert.equal(forwarded, options);
  await assert.rejects(wrappedSession.prepare('DELETE FROM kv WHERE k=?1').bind(OPTIONS).run(), /KIVO_RESTORE_EPOCH/);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1', OPTIONS)[0].n, 1);
});

test('actual nested authz-test works when the underlying D1 session has no withSession method', async () => {
  const B = await world(),
    id = 'tst_TEST_ONLY_nested',
    users = copy(B.users);
  users.push({
    id,
    un: '0509999977',
    name: 'TEST_ONLY nested actor',
    role: 'staff',
    deptId: D1,
    ekey: 'TEST_ONLY_nested_key',
    test: 'TEST_ONLY',
    dis: 0,
    ph: B.users[0].ph,
  });
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_auth_users_v1', JSON.stringify(users)));
  B.env.KIVO_TEST_FIXTURE = 'allow';
  B.env.KIVO_TEST_HOST = 'x';
  const bookmarks = [],
    native = B.DB,
    session = { prepare: native.prepare.bind(native), batch: native.batch.bind(native) };
  native.withSession = (bookmark) => {
    bookmarks.push(bookmark);
    return session;
  };
  const response = ok(await B.api('super', '/api/authz-test', { uid: id, path: '/api/notifications', method: 'GET' }));
  assert.equal(response.status, 200);
  assert.deepEqual(bookmarks, ['first-primary'], 'Nested handle must not invent withSession on a session');
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sess WHERE dev=?1', 'test')[0].n, 0);
});

function actualPermSlice() {
  const source = fs.readFileSync(path.join(SRC, 'services/320-dept-storage.js'), 'utf8'),
    tree = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  let node;
  function visit(o) {
    if (!o || typeof o !== 'object' || node) return;
    if (o.type === 'Property' && o.key.name === 'permSlice') {
      node = o.value;
      return;
    }
    Object.values(o).forEach((v) => (Array.isArray(v) ? v.forEach(visit) : visit(v)));
  }
  visit(tree);
  assert.ok(node);
  return vm.runInNewContext('(' + source.slice(node.start, node.end) + ')');
}
test('actual permSlice replacement removes absent/default cap and lenses instead of resurrecting old branches', async () => {
  const B = await world(),
    pm = copy(B.keys.bassam_perms_v1);
  pm.lenses = { [D1]: ['zones', 'paths'], [D2]: ['gates'] };
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_perms_v1', JSON.stringify(pm)));
  const slice = { capSet: false, emps: {} },
    pageManifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifests/pages.json'), 'utf8')),
    expected = actualPermSlice()(
      copy(pm),
      D1,
      copy(slice),
      'replace',
      pageManifest.pages.map((p) => p.key),
      fs
        .readdirSync(path.join(SRC, 'plugins/lenses'))
        .map((d) => JSON.parse(fs.readFileSync(path.join(SRC, 'plugins/lenses', d, 'manifest.json'), 'utf8')).key),
    );
  ok(await B.restore(await B.body({ scope: { kind: 'dept', departmentId: D1 }, permissionSlice: slice })));
  const value = JSON.parse(
    B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_perms_v1')
      .map((r) => r.v)
      .join(''),
  );
  assert.ok(isDeepStrictEqual(value, copy(expected)));
  assert.equal(Object.prototype.hasOwnProperty.call(value.caps, D1), false);
  assert.equal(Object.prototype.hasOwnProperty.call(value.lenses, D1), false);
  assert.deepEqual(value.lenses[D2], ['gates']);
});
test('actual permSlice merge is one joint no-op when current employee grants exist, even if current cap/lenses are absent', async () => {
  const B = await world(),
    pm = copy(B.keys.bassam_perms_v1);
  delete pm.caps[D1];
  pm.lenses = { [D2]: ['zones'] };
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_perms_v1', JSON.stringify(pm)));
  const before = copy(B.DB.q('SELECT * FROM kv WHERE k=?1', 'bassam_perms_v1')),
    slice = { capSet: true, cap: ['emps'], emps: {}, lenses: ['paths'] };
  assert.equal(actualPermSlice()(copy(pm), D1, slice, 'merge', ['emps'], ['paths']), null);
  ok(await B.restore(await B.body({ scope: { kind: 'dept', departmentId: D1 }, mode: 'merge', permissionSlice: slice })));
  assert.deepEqual(copy(B.DB.q('SELECT * FROM kv WHERE k=?1', 'bassam_perms_v1')), before);
});
test('permission slice filters against current page/lens registries including added planning and zones keys', async () => {
  const B = await world(),
    slice = {
      capSet: true,
      cap: ['emps', 'planning', 'help', 'TEST_ONLY_unknown'],
      emps: {},
      lenses: ['zones', 'paths', 'TEST_ONLY_unknown'],
    };
  ok(await B.restore(await B.body({ scope: { kind: 'dept', departmentId: D1 }, permissionSlice: slice })));
  const value = JSON.parse(
    B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_perms_v1')
      .map((r) => r.v)
      .join(''),
  );
  assert.deepEqual(value.caps[D1], ['emps', 'planning', 'help']);
  assert.deepEqual(value.lenses[D1], ['zones', 'paths']);
});

test('restoring a known image reference changes ownership metadata atomically while retaining its existing body and never touching R2', async () => {
  const B = await world(),
    image = 'img_testonly_restore',
    calls = [];
  B.env.IMG_R2 = Object.fromEntries(
    ['put', 'get', 'delete', 'head', 'list'].map((k) => [
      k,
      async () => {
        calls.push(k);
        throw Error('TEST_ONLY no R2');
      },
    ]),
  );
  await B.DB.batch([
    B.DB.prepare('INSERT INTO imgs(k,seq,v) VALUES(?1,0,?2)').bind(image, 'TEST_ONLY_EXISTING_IMAGE_BYTES'),
    B.DB.prepare('INSERT INTO imgown(img,st,k,uid,dept,ts) VALUES(?1,?2,?3,?4,?5,1)').bind(image, 'orphan', '', IDS.super, D1),
  ]);
  const body = await B.body({ keys: { [OPTIONS]: JSON.stringify({ TEST_ONLY: image }) } });
  body.base.kv[OPTIONS] = 0;
  const before = snap(B.DB);
  B.DB.failIf = (sql) => /^INSERT.*INTO imgref/.test(sql);
  const failed = await B.restore(body);
  B.DB.failIf = null;
  assert.equal(failed.status, 500, JSON.stringify(failed.json));
  assert.deepEqual(snap(B.DB), before);
  assert.deepEqual(calls, []);
  ok(await B.restore(body));
  assert.equal(B.DB.q('SELECT v FROM imgs WHERE k=?1', image)[0].v, 'TEST_ONLY_EXISTING_IMAGE_BYTES');
  assert.equal(B.DB.q('SELECT st FROM imgown WHERE img=?1', image)[0].st, 'bound');
  assert.deepEqual(
    B.DB.q('SELECT k FROM imgref WHERE img=?1', image).map((r) => r.k),
    [OPTIONS],
  );
  assert.deepEqual(calls, []);
});

test('restore envelopes keep absent/null/empty department keys equivalent under the original atomic semantics', async () => {
  let expected;
  for (const variant of ['absent', 'null', 'empty']) {
    const B = await world(),
      body = await B.body({ scope: { kind: 'dept', departmentId: D1 }, keys: {} }),
      usersBefore = copy(B.DB.q("SELECT * FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq"));
    if (variant === 'absent') delete body.keys;
    if (variant === 'null') body.keys = null;
    const ack = ok(await B.restore(body));
    assert.ok(Number.isSafeInteger(ack.rev));
    assert.deepEqual(copy(B.DB.q("SELECT * FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq")), usersBefore);
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
    const current = copy(B.DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq'));
    if (expected) assert.deepEqual(current, expected);
    else expected = current;
  }
});

test('restore envelopes keep absent/null/empty delete lists equivalent for a complete full restore', async () => {
  let expected;
  for (const variant of ['absent', 'null', 'empty']) {
    const B = await world(),
      body = await B.body({ keys: { [OPTIONS]: '{"TEST_ONLY":"nullable delete transport"}' } });
    body.base.kv[OPTIONS] = 0;
    if (variant === 'absent') delete body.delete;
    if (variant === 'null') body.delete = null;
    const ack = ok(await B.restore(body));
    assert.ok(ack.revs[OPTIONS] > 0);
    assert.equal(B.DB.q('SELECT v FROM kv WHERE k=?1', OPTIONS)[0].v, '{"TEST_ONLY":"nullable delete transport"}');
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
    const current = copy(B.DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq'));
    if (expected) assert.deepEqual(current, expected);
    else expected = current;
  }
});

test('restore envelopes reject malformed optional containers and incomplete full-null keys before any business write', async () => {
  for (const [field, value] of [
    ['keys', []],
    ['keys', '{}'],
    ['keys', 1],
    ['keys', false],
    ['delete', {}],
    ['delete', '[]'],
    ['delete', 1],
    ['delete', false],
    ['keys', null],
  ]) {
    const B = await world(),
      body = await B.body(),
      before = snap(B.DB);
    body[field] = value;
    const response = await B.restore(body);
    assert.equal(response.status, 400, field + ':' + JSON.stringify(response.json));
    assert.equal(response.json.ok, 0);
    if (value !== null) {
      assert.equal(response.json.err, 'bad-body');
      assert.equal(response.json.at, field);
    }
    assert.deepEqual(snap(B.DB), before);
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 0);
  }
});

test('employee transition still rejects accountProposals:null before writes rather than treating it as an empty proposal list', async () => {
  const B = await world(),
    context = ok(await B.api('super', '/api/employees/transition?dept=' + D1 + '&intent=delete')),
    body = {
      uid: IDS.super,
      dept: D1,
      intent: 'delete',
      deleteMode: 'selected',
      requestId: 'TEST_ONLY_nullable_proposals_regression',
      base: context.base,
      finalRows: context.employees,
      accountProposals: null,
      reason: 'TEST_ONLY explicit user reason',
    },
    before = snap(B.DB),
    response = await B.api('super', '/api/employees/transition', body);
  assert.equal(response.status, 400);
  assert.equal(response.json.err, 'bad-body');
  assert.equal(response.json.at, 'accountProposals');
  assert.deepEqual(snap(B.DB), before);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 0);
});
