import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, ok, custody, snap, seedMessage, OPTIONS } from './atomic_restore_review_fx.mjs';
import { D1, D2, IDS, EKEYS, copy, identitySnapshot } from './notifications_review_fx.mjs';
import { inspectOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
const KV_PROBE = (dept) => 'bsdept:' + dept + ':bassam_last_export_v1';   /* schema 10: plain-KV department probe (options/employees are typed operational resources) */
let rid = 0;
const employeeKey = 'bsdept:' + D1 + ':bassam_employees_v1',
  cuKey = 'bsdept:' + D1 + ':bassam_custody_v1';
async function knownAndOrphan(B) {
  const cu = await custody(B);
  ok(
    await B.api('super', '/api/custody/act', {
      uid: IDS.super,
      dept: D1,
      base: await B.W.cuRev(B.env, D1),
      requestId: 'TEST_ONLY_known_transition_' + ++rid,
      op: 'issue',
      itemId: cu.type.itemId,
      holderKey: EKEYS.employee1,
    }),
  );
  return cu;
}
function saved(r) {
  ok(r);
  assert.deepEqual(r.json.denied, {});
  assert.deepEqual(r.json.conflicts, {});
  assert.ok(Number.isSafeInteger(r.json.v) && r.json.v > 0);
  return r.json;
}
test('actual ordinary employee delete commits KV and only matched custody cleanup atomically while retaining a prior orphan', async () => {
  const B = await world();
  await knownAndOrphan(B);
  const after = copy(B.keys[employeeKey]).filter((e) => e.eid !== EKEYS.employee1),
    base = { [employeeKey]: 1, [cuKey]: await B.W.cuRev(B.env, D1) },
    identities = identitySnapshot(B.DB);
  saved(await B.api('super', '/api/save', { set: { [employeeKey]: JSON.stringify(after) }, del: [], base }));
  assert.deepEqual(
    B.DB.q('SELECT holder_key FROM custody_movements').map((r) => r.holder_key),
    ['TEST_ONLY orphan retained'],
  );
  assert.deepEqual(identitySnapshot(B.DB), identities);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n, 1);
});
test('explicit import replace clears movement history including prior orphans, keeps catalog and checks its client custody revision', async () => {
  const B = await world();
  await knownAndOrphan(B);
  const base = { [employeeKey]: 1, [cuKey]: await B.W.cuRev(B.env, D1) },
    body = {
      set: { [employeeKey]: JSON.stringify(B.keys[employeeKey]) },
      del: [],
      base,
      ops: { [employeeKey]: { op: 'import.run', mode: 'replace', reason: 'TEST_ONLY controlled import' } },
    };
  const stale = copy(body);
  stale.base[cuKey] = 0;
  const before = snap(B.DB);
  assert.equal((await B.api('super', '/api/save', stale)).status, 409);
  assert.deepEqual(snap(B.DB), before);
  saved(await B.api('super', '/api/save', body));
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_movements')[0].n, 0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n, 1);
});
test('failure after employee rows are written rolls back matched custody, employee value, revisions, audit and snapshot', async () => {
  const B = await world();
  await knownAndOrphan(B);
  const after = copy(B.keys[employeeKey]).filter((e) => e.eid !== EKEYS.employee1),
    body = { set: { [employeeKey]: JSON.stringify(after) }, del: [], base: { [employeeKey]: 1, [cuKey]: await B.W.cuRev(B.env, D1) } },
    before = snap(B.DB);
  B.DB.failIf = (sql) => /^DELETE FROM custody_movements/.test(sql);
  const response = await B.api('super', '/api/save', body);
  B.DB.failIf = null;
  assert.equal(response.status, 500, JSON.stringify(response.json));
  assert.deepEqual(snap(B.DB), before);
  saved(await B.api('super', '/api/save', body));
});
test('closed department wipe inventory and ACK cover KV, custody and notification data while retaining department and all accounts', async () => {
  const B = await world();
  await knownAndOrphan(B);
  await seedMessage(B);
  const beforeIdentity = identitySnapshot(B.DB),
    depts = copy(B.DB.q('SELECT * FROM kv WHERE k=?1', 'bassam_depts_v1')),
    employeeRev = B.DB.q('SELECT rev FROM revs WHERE k=?1', employeeKey)[0].rev,
    inventory = ok(await B.api('super', '/api/admin/dept-wipe?dept=' + D1));
  assert.ok(inspectOperationalFixture(B.env, employeeKey).length > 0, 'The wiped department starts with a typed employee list');
  assert.ok(inventory.counts.notifications > 0);
  const ack = ok(
    await B.api('super', '/api/admin/dept-wipe', {
      uid: IDS.super,
      dept: D1,
      requestId: 'TEST_ONLY_wipe_' + ++rid,
      base: inventory.base,
      reason: 'TEST_ONLY user authorized department cleanup',
    }),
  );
  assert.equal(ack.dept, D1);
  assert.ok(ack.counts.notifications > 0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_items WHERE department_id=?1', D1)[0].n, 0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_movements WHERE department_id=?1', D1)[0].n, 0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM notification_messages WHERE scope=?1', 'd:' + D1)[0].n, 0);
  assert.deepEqual(identitySnapshot(B.DB), beforeIdentity);
  assert.deepEqual(copy(B.DB.q('SELECT * FROM kv WHERE k=?1', 'bassam_depts_v1')), depts);
  /* schema 10: the employee list is a typed operational resource; the wipe leaves it empty and never recreates a KV document */
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1', employeeKey)[0].n, 0);
  assert.equal(inspectOperationalFixture(B.env, employeeKey), null);
  const employeesRead = ok(await B.api('super', '/api/operations/read?uid=' + IDS.super + '&keys=' + encodeURIComponent(employeeKey)));
  assert.deepEqual(employeesRead.resources, {});
  assert.deepEqual(employeesRead.absent, [employeeKey]);
  assert.ok(employeesRead.base[employeeKey] > employeeRev, 'The wipe itself advanced the employee resource revision');
});
test('department wipe rejects non-super and a newly added scoped key after inventory without writing partial state', async () => {
  const B = await world();
  await custody(B);
  assert.equal((await B.api('manager1', '/api/admin/dept-wipe?dept=' + D1)).status, 403);
  const inventory = ok(await B.api('super', '/api/admin/dept-wipe?dept=' + D1));
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', OPTIONS, '{"TEST_ONLY":"arrived after inventory"}'));
  const before = snap(B.DB),
    response = await B.api('super', '/api/admin/dept-wipe', {
      uid: IDS.super,
      dept: D1,
      requestId: 'TEST_ONLY_wipe_' + ++rid,
      base: inventory.base,
      reason: 'TEST_ONLY user authorized department cleanup',
    });
  assert.equal(response.status, 409);
  assert.deepEqual(snap(B.DB), before);
});

test('wipe image metadata retires only unreferenced images atomically, keeps shared references and never calls R2', async () => {
  const B = await world(),
    id = 'img_testonly_unique',
    shared = 'img_testonly_shared',
    other = KV_PROBE(D2),
    calls = [];
  B.env.IMG_R2 = Object.fromEntries(
    ['put', 'get', 'delete', 'head', 'list'].map((method) => [
      method,
      async () => {
        calls.push(method);
        throw Error('TEST_ONLY no R2');
      },
    ]),
  );
  await B.DB.batch([
    ...B.W.kvPutStmts(B.env, 'kv', OPTIONS, JSON.stringify({ TEST_ONLY: [id, shared] })),
    ...B.W.kvPutStmts(B.env, 'kv', other, JSON.stringify({ TEST_ONLY: shared })),
    ...[
      [id, OPTIONS],
      [shared, OPTIONS],
      [shared, other],
    ].map(([img, k]) => B.DB.prepare('INSERT INTO imgref(img,k) VALUES(?1,?2)').bind(img, k)),
    ...[id, shared].map((img) =>
      B.DB.prepare('INSERT INTO imgown(img,st,k,uid,dept,ts) VALUES(?1,?2,?3,?4,?5,?6)').bind(img, 'bound', OPTIONS, IDS.super, D1, 1),
    ),
    ...[id, shared].map((img) => B.DB.prepare('INSERT INTO imgs(k,seq,v) VALUES(?1,0,?2)').bind(img, 'TEST_ONLY_PRIVATE_IMAGE_BYTES')),
  ]);
  const inventory = ok(await B.api('super', '/api/admin/dept-wipe?dept=' + D1)),
    body = {
      dept: D1,
      requestId: 'TEST_ONLY_images_' + ++rid,
      base: inventory.base,
      reason: 'TEST_ONLY user authorized department cleanup',
    },
    before = snap(B.DB);
  B.DB.failIf = (sql) => /^INSERT.*INTO imgown/.test(sql);
  const failed = await B.api('super', '/api/admin/dept-wipe', body);
  B.DB.failIf = null;
  assert.equal(failed.status, 500);
  assert.deepEqual(snap(B.DB), before);
  assert.deepEqual(calls, []);
  ok(await B.api('super', '/api/admin/dept-wipe', body));
  assert.equal(B.DB.q('SELECT st FROM imgown WHERE img=?1', id)[0].st, 'orphan');
  assert.equal(B.DB.q('SELECT st FROM imgown WHERE img=?1', shared)[0].st, 'bound');
  assert.deepEqual(
    B.DB.q('SELECT k FROM imgref WHERE img=?1', shared).map((r) => r.k),
    [other],
  );
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM imgs')[0].n, 2);
  assert.deepEqual(calls, []);
});

test('wipe COUNT guard rejects a scoped key inserted after preparation and before the mutation batch', async () => {
  const B = await world();
  await custody(B);
  const inventory = ok(await B.api('super', '/api/admin/dept-wipe?dept=' + D1)),
    batch = B.DB.batch.bind(B.DB),
    extra = OPTIONS;   /* a plain-KV scoped key absent at inventory time */
  let inserted = false;
  B.DB.batch = async (st) => {
    if (!inserted && st.some((s) => /^INSERT INTO restore_operations/.test(s.sql))) {
      inserted = true;
      await batch(B.W.kvPutStmts(B.env, 'kv', extra, '{"TEST_ONLY":"concurrent source"}'));
    }
    return batch(st);
  };
  const before = snap(B.DB),
    r = await B.api('super', '/api/admin/dept-wipe', {
      dept: D1,
      requestId: 'TEST_ONLY_count_' + ++rid,
      base: inventory.base,
      reason: 'TEST_ONLY user authorized department cleanup',
    });
  assert.equal(r.status, 409);
  const after = snap(B.DB);
  after.kv = after.kv.filter((row) => row.k !== extra);
  assert.deepEqual(after, before);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1', extra)[0].n, 1);
});

test('server-owned employee transition GET/POST allows employee-delete permission without custody-view and retains account management restrictions', async () => {
  const B = await world(),
    perms = copy(B.keys.bassam_perms_v1);
  perms.emps[D1][EKEYS.employee1]['emps/data'] = ['view', 'del'];
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_perms_v1', JSON.stringify(perms)));
  const cu = await custody(B);
  ok(
    await B.api('super', '/api/custody/act', {
      uid: IDS.super,
      dept: D1,
      base: await B.W.cuRev(B.env, D1),
      requestId: 'TEST_ONLY_victim_' + ++rid,
      op: 'issue',
      itemId: cu.type.itemId,
      holderKey: EKEYS.noView,
    }),
  );
  assert.equal((await B.api('employee1', '/api/custody?dept=' + D1)).status, 403);
  const context = ok(await B.api('employee1', '/api/employees/transition?dept=' + D1 + '&intent=delete'));
  assert.equal(JSON.stringify(context).includes('p2$'), false);
  assert.equal(context.custody, undefined);
  assert.equal(context.users, undefined);
  const input = {
      uid: IDS.employee1,
      dept: D1,
      intent: 'delete',
      deleteMode: 'selected',
      requestId: 'TEST_ONLY_employee_delete_' + ++rid,
      base: context.base,
      finalRows: context.employees.filter((e) => e.eid !== EKEYS.noView),
    },
    ack = ok(await B.api('employee1', '/api/employees/transition', input));
  assert.equal(ack.intent, 'delete');
  assert.equal(ack.dept, D1);
  assert.equal(ack.requestId, input.requestId);
  assert.equal(ack.counts.accountsRemoved, 0, 'Non-manager deletion retains account management policy');
  assert.equal(typeof ack.revs[employeeKey], 'number');
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sess WHERE uid=?1', IDS.noView)[0].n, 1);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sess WHERE uid=?1', IDS.employee1)[0].n, 1, 'actor session remains');
  assert.deepEqual(
    B.DB.q('SELECT holder_key FROM custody_movements').map((r) => r.holder_key),
    ['TEST_ONLY orphan retained'],
  );
  const before = snap(B.DB),
    retry = ok(await B.api('employee1', '/api/employees/transition', input));
  assert.equal(retry.duplicate, 1);
  assert.equal(retry.rev, ack.rev);
  assert.deepEqual(retry.revs, ack.revs);
  assert.deepEqual(snap(B.DB), before);
});

test('server-owned selected-last delete retains orphan history, while explicit all-delete wipes it and both keep catalog', async () => {
  for (const deleteMode of ['selected', 'all']) {
    const B = await world();
    await custody(B);
    await replaceOperationalFixture(B.env, employeeKey, [B.keys[employeeKey][0]]);
    const context = ok(await B.api('super', '/api/employees/transition?dept=' + D1 + '&intent=delete'));
    ok(
      await B.api('super', '/api/employees/transition', {
        uid: IDS.super,
        dept: D1,
        intent: 'delete',
        deleteMode,
        requestId: 'TEST_ONLY_last_' + ++rid,
        base: context.base,
        reason: 'TEST_ONLY user authorized employee removal',
        finalRows: [],
      }),
    );
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_movements')[0].n, deleteMode === 'selected' ? 1 : 0);
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n, 1);
  }
});

test('server-owned employee transition rolls back account removals and sessions together with assignments on a late failure', async () => {
  const B = await world();
  await knownAndOrphan(B);
  const context = ok(await B.api('super', '/api/employees/transition?dept=' + D1 + '&intent=delete')),
    input = {
      uid: IDS.super,
      dept: D1,
      intent: 'delete',
      deleteMode: 'selected',
      requestId: 'TEST_ONLY_employee_rollback_' + ++rid,
      base: context.base,
      finalRows: context.employees.filter((e) => e.eid !== EKEYS.employee1),
    },
    before = snap(B.DB),
    sessions = copy(B.DB.q('SELECT * FROM sess'));
  B.DB.failIf = (sql) => /^DELETE FROM custody_movements/.test(sql);
  const response = await B.api('super', '/api/employees/transition', input);
  B.DB.failIf = null;
  assert.equal(response.status, 500, JSON.stringify(response.json));
  assert.deepEqual(snap(B.DB), before);
  assert.deepEqual(copy(B.DB.q('SELECT * FROM sess')), sessions);
  ok(await B.api('super', '/api/employees/transition', input));
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sess WHERE uid=?1', IDS.employee1)[0].n, 0);
});

test('closed department deletion reuses inventory/atomic compiler, removes only its dept/staff accounts and preserves GM/Super/other departments', async () => {
  const B = await world();
  await custody(B);
  await seedMessage(B);
  const inventory = ok(await B.api('super', '/api/admin/dept-delete?dept=' + D1));
  assert.equal(inventory.kind, 'delete');
  assert.ok(inventory.counts.accounts > 0);
  const body = {
      uid: IDS.super,
      dept: D1,
      requestId: 'TEST_ONLY_department_delete_' + ++rid,
      base: inventory.base,
      reason: 'TEST_ONLY user reason to delete department',
    },
    before = snap(B.DB),
    sessions = copy(B.DB.q('SELECT * FROM sess'));
  B.DB.failIf = (sql) => /^DELETE FROM custody_items/.test(sql);
  const failure = await B.api('super', '/api/admin/dept-delete', body);
  B.DB.failIf = null;
  assert.equal(failure.status, 500);
  assert.deepEqual(snap(B.DB), before);
  assert.deepEqual(copy(B.DB.q('SELECT * FROM sess')), sessions);
  const ack = ok(await B.api('super', '/api/admin/dept-delete', body));
  assert.equal(ack.mode, 'dept-delete');
  assert.equal(
    B.DB.q('SELECT COUNT(*) n FROM kv WHERE k LIKE ?1', 'bsdept:' + D1 + ':%')[0].n,
    0,
    'All scoped KV is removed for definition deletion',
  );
  const users = JSON.parse(
      B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_auth_users_v1')
        .map((r) => r.v)
        .join(''),
    ),
    depts = JSON.parse(
      B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_depts_v1')
        .map((r) => r.v)
        .join(''),
    );
  assert.equal(
    users.some((u) => (u.role === 'staff' || u.role === 'dept') && u.deptId === D1),
    false,
  );
  assert.equal(
    users.some((u) => u.id === IDS.super),
    true,
  );
  assert.equal(
    users.some((u) => u.id === IDS.gm),
    true,
  );
  assert.equal(
    users.some((u) => u.id === IDS.employee2),
    true,
  );
  assert.equal(
    depts.some((d) => d.id === D1),
    false,
  );
  assert.equal(
    depts.some((d) => d.id === D2),
    true,
  );
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sess WHERE uid=?1', IDS.employee1)[0].n, 0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM sess WHERE uid=?1', IDS.employee2)[0].n, 1);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM notification_messages WHERE scope=?1', 'd:' + D1)[0].n, 0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_items WHERE department_id=?1', D1)[0].n, 0);
  const retry = ok(await B.api('super', '/api/admin/dept-delete', body));
  assert.equal(retry.duplicate, 1);
  assert.equal(retry.rev, ack.rev);
  assert.equal((await B.api('super', '/api/admin/dept-wipe', body)).status, 409, 'Request ID cannot replay a delete as a wipe');
});

test('a warm current isolate refuses save and notification APIs after the DB advances to an unsupported future schema', async () => {
  const B = await world(),
    current = B.W.KIVO_SCHEMA_VERSION;
  assert.ok(current >= 7);
  assert.equal(B.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(current));
  assert.equal((await B.api('super', '/api/ping')).status, 200, 'Warm the same current isolate before the stamp advances');
  B.DB.db.prepare("UPDATE meta SET v=? WHERE k='schema_version'").run(String(current + 1));
  const before = snap(B.DB);
  for (const [route, body] of [
    ['/api/save', { set: { [OPTIONS]: '{}' }, del: [], base: { [OPTIONS]: 0 } }],
    ['/api/notifications', undefined],
    ['/api/notifications/act', { op: 'emit', uid: IDS.super, type: 'task_new', dept: D1, vars: { المهمة: 'TEST_ONLY late old writer' } }],
  ]) {
    const headers = { Cookie: 'bs_tok=TEST_ONLY_session_super' };
    if (body) {
      headers.Origin = 'http://x';
      headers['Content-Type'] = 'application/json';
    }
    const response = await B.canonicalW.default.fetch(
      new Request('http://x' + route, { method: body ? 'POST' : 'GET', headers, ...(body ? { body: JSON.stringify(body) } : {}) }),
      B.env,
    );
    assert.equal(response.status, 503, route);
    const data = await response.json();
    assert.equal(data.ok, 0);
    assert.equal(data.err, 'db-schema-unsupported');
    assert.deepEqual(snap(B.DB), before);
  }
});

test('new employee transition accepts a valid original-workflow payload above 64KiB and rejects UTF-8 bytes beyond 8MiB before planning', async () => {
  const B = await world(),
    context = ok(await B.api('super', '/api/employees/transition?dept=' + D1 + '&intent=import')),
    fresh = Array.from({ length: 900 }, (_, n) => ({
      eid: 'TEST_ONLY_volume_' + n,
      name: 'اختبار موظف اصطناعي بلا بيانات دخول ' + n,
      type: 'دائم',
      work: 'ميداني',
    })),
    body = {
      uid: IDS.super,
      dept: D1,
      intent: 'import',
      requestId: 'TEST_ONLY_import_volume_' + ++rid,
      base: context.base,
      finalRows: context.employees.concat(fresh),
      options: context.options,
      import: { mode: 'add', year: context.clock.y, month: context.clock.m, schedule: [], templates: [] },
      reason: 'TEST_ONLY user import reason',
    };
  assert.ok(Buffer.byteLength(JSON.stringify(body)) > 65536);
  const ack = ok(await B.api('super', '/api/employees/transition', body));
  assert.equal(ack.counts.employees, context.employees.length + fresh.length);
  assert.equal(ack.counts.accountsCreated, 0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
  const before = snap(B.DB),
    oversize = JSON.stringify({ ...body, reason: 'ع'.repeat(4200000) });
  assert.ok(oversize.length < 8 * 1024 * 1024);
  assert.ok(Buffer.byteLength(oversize) > 8 * 1024 * 1024);
  const response = await B.W.default.fetch(
    new Request('http://x/api/employees/transition', {
      method: 'POST',
      headers: { Cookie: 'bs_tok=TEST_ONLY_session_super', Origin: 'http://x', 'Content-Type': 'application/json' },
      body: oversize,
    }),
    B.env,
  );
  assert.equal(response.status, 413);
  assert.deepEqual(snap(B.DB), before);
});

test('closed department payload allows a large server-derived key revision inventory and enforces 1MiB in UTF-8 bytes', async () => {
  const B = await world();
  const rows = [];
  for (let n = 0; n < 800; n++) {
    const key = 'bsdept:' + D1 + ':TEST_ONLY_' + n + '_' + 'x'.repeat(70);
    rows.push(B.DB.prepare("INSERT INTO kv(k,seq,v) VALUES(?1,0,'{}')").bind(key));
  }
  await B.DB.batch(rows);
  const inventory = ok(await B.api('super', '/api/admin/dept-delete?dept=' + D1)),
    body = { uid: IDS.super, dept: D1, requestId: 'TEST_ONLY_dept_volume_' + ++rid, base: inventory.base, reason: 'TEST_ONLY reason' };
  assert.ok(Buffer.byteLength(JSON.stringify(body)) > 65536);
  const before = snap(B.DB),
    response = await B.api('super', '/api/admin/dept-delete', body);
  assert.notEqual(response.status, 413);
  assert.equal(response.status, 403, 'Unknown resource permission remains enforced after the larger transport limit');
  /* Owner decision (b), 2026-11-03: keys a unit holds that are not classified as known unit data are never deleted
     silently. The whole department delete is refused as a data-integrity problem, every unknown key is named, and the
     department, its keys and its accounts all stay exactly as they were (no widening of the delete list). */
  assert.equal(response.json.ok, 0);
  assert.equal(response.json.err, 'unit-unknown-data');
  const unknownDenied = Object.keys(response.json.denied || {}).filter((k) => k.startsWith('bsdept:' + D1 + ':TEST_ONLY_'));
  assert.equal(unknownDenied.length, 800, 'Every unknown key is named in the refusal');
  assert.ok(unknownDenied.every((k) => response.json.denied[k].why === 'unknown'));
  assert.equal(B.DB.q("SELECT COUNT(*) n FROM kv WHERE k LIKE ?1", 'bsdept:' + D1 + ':TEST_ONLY_%')[0].n, 800, 'No unknown key is deleted');
  assert.ok(JSON.parse(B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_depts_v1').map((r) => r.v).join('')).some((d) => d.id === D1), 'The department is not removed');
  const deniedState = snap(B.DB);
  assert.ok(deniedState.sec.length > before.sec.length);
  assert.ok(deniedState.authz.length > before.authz.length);
  assert.deepEqual({ ...deniedState, sec: before.sec, authz: before.authz }, before);
  const oversized = JSON.stringify({ ...body, reason: 'ع'.repeat(530000) });
  assert.ok(oversized.length < 1024 * 1024);
  assert.ok(Buffer.byteLength(oversized) > 1024 * 1024);
  const r = await B.W.default.fetch(
    new Request('http://x/api/admin/dept-delete', {
      method: 'POST',
      headers: { Cookie: 'bs_tok=TEST_ONLY_session_super', Origin: 'http://x', 'Content-Type': 'application/json' },
      body: oversized,
    }),
    B.env,
  );
  assert.equal(r.status, 413);
  assert.deepEqual(snap(B.DB), deniedState);
});

test('closed department delete with a large server-derived inventory of known unit data still commits atomically', async () => {
  /* Control for owner decision (b): the refusal above is about unknown keys only. A department whose (large) key
     inventory is entirely classified unit data (here 800 per-account notification-device marks, RES_REG
     bassam_notif_dev_v1) is deleted in one atomic batch above the 64KiB transport limit, keys and accounts together. */
  const B = await world();
  const rows = [];
  for (let n = 0; n < 800; n++) rows.push(B.DB.prepare("INSERT INTO kv(k,seq,v) VALUES(?1,0,'1')").bind('bsdept:' + D1 + ':bassam_notif_dev_v1:TEST_ONLY_' + n + '_' + 'x'.repeat(70)));
  await B.DB.batch(rows);
  const inventory = ok(await B.api('super', '/api/admin/dept-delete?dept=' + D1)),
    body = { uid: IDS.super, dept: D1, requestId: 'TEST_ONLY_dept_known_volume_' + ++rid, base: inventory.base, reason: 'TEST_ONLY reason' };
  assert.ok(Buffer.byteLength(JSON.stringify(body)) > 65536);
  assert.ok(Object.keys(inventory.base.kv).filter((k) => k.includes(':bassam_notif_dev_v1:TEST_ONLY_')).length === 800, 'The inventory names every known key');
  const ack = ok(await B.api('super', '/api/admin/dept-delete', body));
  assert.equal(ack.mode, 'dept-delete');
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM kv WHERE k LIKE ?1', 'bsdept:' + D1 + ':%')[0].n, 0, 'All known unit data is removed');
  assert.equal(JSON.parse(B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_depts_v1').map((r) => r.v).join('')).some((d) => d.id === D1), false);
  assert.ok(JSON.parse(B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_depts_v1').map((r) => r.v).join('')).some((d) => d.id === D2));
});
