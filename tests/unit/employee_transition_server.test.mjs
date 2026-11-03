import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world as fixture, D1, D2, IDS, EKEYS, copy } from './custody_review_fx.mjs';
import { installOperationalFixture, inspectOperationalFixture, isOperationalFixtureKey, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { candidateWorker } from './irshad_domain_fx.mjs';
/* Typed award domain and the pure context projection, from the same actual generated Worker (no staged copy). */
const X = await candidateWorker(['awConvert', 'awInstallStatements', 'awExportDomain', 'awInflate', 'empTransitionContextOf']);
const key = (n) => 'bsdept:' + D1 + ':' + n;
async function world(mode = 'enforce') {
  const f = await fixture({ mode }),
    W = f.W;
  await installOperationalFixture(f.env);
  async function put(k, v) {
    if (isOperationalFixtureKey(f.env, k)) return replaceOperationalFixture(f.env, k, v);
    await f.DB.batch(W.kvPutStmts(f.env, 'kv', k, JSON.stringify(v)));
  }
  async function actor(who = 'super') {
    const m = mode === 'enforce' ? await W.enfModeOf(f.env) : null;
    return W.actorOf({ ...f.env, ...(m?.mode === 'enforce' ? { __enf: m } : {}) }, IDS[who]);
  }
  async function context(who = 'super', intent = 'delete') {
    return W.empTransitionContext(f.env, await actor(who), D1, intent);
  }
  async function prepare(c, over = {}, who = 'super') {
    return W.empPrepareTransition(f.env, await actor(who), {
      uid: IDS[who],
      dept: D1,
      intent: c.intent,
      requestId: 'TEST_ONLY_transition_1',
      base: c.base,
      finalRows: c.employees,
      deleteMode: 'selected',
      ...over,
    });
  }
  async function awards(d, records) {
    await f.DB.batch(X.awInstallStatements(f.env, X.awConvert(d, { records })));
  }
  const awardRecs = async (d) => X.awInflate(await X.awExportDomain(f.env, d)).records?.recs ?? [];
  const awardRows = (d) => JSON.stringify(['award_resources', 'award_records'].map((n) => f.DB.q('SELECT * FROM ' + n + ' WHERE department_id=?', d)));
  /* Commit through the real employee route so the typed award cleanup (019n:155 -> 019m) actually runs. */
  async function commit(mode, deleteMode, requestId, rows = () => []) {
    const ctx = await f.api('super', '/api/employees/transition?dept=' + D1 + '&intent=delete');
    assert.equal(ctx.status, 200, JSON.stringify(ctx.json));
    return f.api('super', '/api/employees/transition', { method: 'POST', body: { uid: IDS.super, dept: D1, intent: 'delete', deleteMode, requestId, base: ctx.json.base, finalRows: rows(ctx.json.employees), reason: 'TEST_ONLY ' + mode + ' ' + deleteMode } });
  }
  return { ...f, W, put, actor, context, prepare, awards, awardRecs, awardRows, commit };
}
test('context requires original employee action and exposes revisions without custody data or credentials', async () => {
  const t = await world(),
    p = copy(t.keys.bassam_perms_v1);
  p.emps[D1][EKEYS.employee1]['emps/data'] = ['view', 'del'];
  await t.put('bassam_perms_v1', p);
  const c = await t.context('employee1');
  assert.equal(c.base.custody, 0);
  assert.ok(Array.isArray(c.employees));
  assert.equal(c.base.kv.bassam_auth_users_v1, 1);
  for (const forbidden of ['users', 'ph', 'items', 'issues', 'moves']) assert.equal(Object.hasOwn(c, forbidden), false);
  await assert.rejects(t.context('employee2'), (e) => e.cuStatus === 403);
  await assert.rejects(t.context('frozen'), (e) => e.cuStatus === 403);
});
for (const mode of ['legacy', 'enforce'])
  test(mode + ': selected last delete retains unrelated ledgers; all delete explicitly empties the full history', async () => {
    const t = await world(mode),
      emp = { eid: 'TEST_ONLY_last', name: 'TEST_ONLY last', nid: '1900000001' },
      staff = { '1448-1': { TEST_ONLY_last: { shift: 'TEST_ONLY' }, TEST_ONLY_old_orphan: { shift: 'TEST_ONLY' }, __shifts: [] } },
      aw = { recs: [{ ekey: 'TEST_ONLY_old_orphan', name: 'TEST_ONLY old orphan' }] };
    await t.put(key('bassam_employees_v1'), [emp]);
    await t.put(key('bassam_staffing_v3'), staff);
    /* Schema 10: the daily report is a typed map keyed by a Hijri day; the wipe must clear a real day record. */
    await t.put(key('bassam_dreport_v1'), { '1448-1-2': { created: 1, shifts: {} } });
    /* Schema 9: Award records are the typed awards domain (award_* tables), seeded through the real installer. */
    await t.awards(D1, aw);
    let p = copy(t.keys.bassam_perms_v1);
    p.caps[D1].push('staff', 'award');
    p.caps.TEST_ONLY_group_1.push('staff', 'award');
    await t.put('bassam_perms_v1', p);
    const c = await t.context(),
      selected = await t.prepare(c, { finalRows: [], deleteMode: 'selected' }),
      all = await t.prepare(c, { finalRows: [], deleteMode: 'all' });
    assert.equal(selected.body.set[key('bassam_dreport_v1')], undefined);
    assert.deepEqual(JSON.parse(selected.body.set[key('bassam_staffing_v3')]), {
      '1448-1': { TEST_ONLY_old_orphan: { shift: 'TEST_ONLY' }, __shifts: [] },
    });
    assert.equal(selected.context.serverEmployeeIntent.kind, 'employee-delete');
    assert.equal(all.context.serverEmployeeIntent.kind, 'employee-wipe');
    assert.deepEqual(JSON.parse(all.body.set[key('bassam_dreport_v1')]), {});
    assert.deepEqual(JSON.parse(all.body.set[key('bassam_staffing_v3')]), {});
    /* Awards are not KV: the transition never plans them as a KV write; the typed award cleanup runs at commit
       (019n bdEmployeeCleanupPlan -> 019m awPlanEmployeeCleanup, intent employee-delete / employee-wipe). */
    for (const out of [selected, all]) assert.equal(out.body.set[key('bassam_award_v1')], undefined);
    const neighbour = { recs: [{ ekey: EKEYS.employee2, name: 'TEST_ONLY neighbour' }] };
    await t.awards(D2, neighbour);
    const d2Rows = t.awardRows(D2);
    const kept = await t.commit(mode, 'selected', 'TEST_ONLY_selected_award_1');
    assert.equal(kept.status, 200, JSON.stringify(kept.json));
    assert.deepEqual(await t.awardRecs(D1), aw.recs, 'Selected employee delete leaves unrelated award records untouched');
    assert.deepEqual(t.awardRows(D2), d2Rows);
    const w = await world(mode);
    await w.put(key('bassam_employees_v1'), [emp]);
    await w.awards(D1, aw);
    await w.awards(D2, neighbour);
    await w.put('bassam_perms_v1', p);
    assert.deepEqual(await w.awardRecs(D1), aw.recs, 'The wipe world holds the department award records before the commit');
    const wiped = await w.commit(mode, 'all', 'TEST_ONLY_all_award_1');
    assert.equal(wiped.status, 200, JSON.stringify(wiped.json));
    assert.deepEqual(await w.awardRecs(D1), [], 'Employee wipe clears the department award records');
    assert.deepEqual(w.DB.q('SELECT employee_key FROM award_records WHERE department_id=?', D1), []);
    assert.deepEqual(w.awardRows(D2), d2Rows, 'Employee wipe never reaches another department');
  });
test('nonmanager employee delete does not acquire account administration', async () => {
  const t = await world(),
    p = copy(t.keys.bassam_perms_v1);
  p.emps[D1][EKEYS.employee1]['emps/data'] = ['view', 'del'];
  await t.put('bassam_perms_v1', p);
  const c = await t.context('employee1'),
    out = await t.prepare(c, { finalRows: c.employees.filter((e) => e.eid !== EKEYS.frozen) }, 'employee1');
  assert.equal(out.body.set.bassam_auth_users_v1, undefined);
  assert.equal(out.body.set.bassam_perms_v1, undefined);
});
test('autoactivation preserves existing frozen credentials and manager accounts and uses only eligible opaque proposals', async () => {
  const t = await world(),
    c = await t.context('super', 'import'),
    extra = { eid: 'TEST_ONLY_new', name: 'TEST_ONLY new', nid: '1900000002', empno: '12345' };
  const out = await t.prepare(c, {
      intent: 'import',
      deleteMode: undefined,
      finalRows: c.employees.concat([extra]),
      import: { mode: 'add', year: 1448, month: 1, schedule: [], templates: [] },
      accountProposals: [{ ekey: extra.eid, ph: 'p2$100000$' + 'c'.repeat(32) + '$' + 'd'.repeat(64) }],
    }),
    users = JSON.parse(out.body.set.bassam_auth_users_v1);
  for (const stored of t.keys.bassam_auth_users_v1) {
    const u = users.find((u) => u.id === stored.id);
    assert.ok(u, stored.id);
    assert.deepEqual(u, stored);
  }
  const created = users.find((u) => u.ekey === extra.eid);
  assert.ok(/^p2\$100000\$/.test(created.ph));
  assert.equal(out.result.counts.accountsCreated, 1);
  assert.equal(created.dis, 0);
  assert.equal(created.role, 'staff');
  assert.equal(created.un, extra.nid);
  assert.equal(created.ph, 'p2$100000$' + 'c'.repeat(32) + '$' + 'd'.repeat(64));
  assert.equal(out.body.uscope !== undefined, true);
});

test('account proposal cannot change an existing frozen account, target another scope, inject roles, or supply a weak hash', async () => {
  const t = await world(),
    c = await t.context('super', 'import'),
    ph = 'p2$100000$' + 'c'.repeat(32) + '$' + 'd'.repeat(64),
    body = { intent: 'import', deleteMode: undefined, import: { mode: 'update', year: 1448, month: 1, schedule: [], templates: [] } };
  for (const proposal of [
    { ekey: EKEYS.frozen, ph },
    { ekey: EKEYS.employee2, ph },
    { ekey: 'TEST_ONLY_unknown', ph },
    { ekey: 'TEST_ONLY_unknown', ph, role: 'super' },
    { ekey: 'TEST_ONLY_unknown', ph: 'p1$TEST_ONLY' },
  ])
    await assert.rejects(t.prepare(c, { ...body, accountProposals: [proposal] }), (e) => e.cuStatus === 400);
});

test('import context and commit retain the original add AND mode-action policy; update may also add new records', async () => {
  const t = await world(),
    p = copy(t.keys.bassam_perms_v1);
  p.emps[D1][EKEYS.employee1]['emps/data'] = ['view', 'edit'];
  await t.put('bassam_perms_v1', p);
  await assert.rejects(t.context('employee1', 'import'), (e) => e.cuStatus === 403);
  p.emps[D1][EKEYS.employee1]['emps/data'] = ['view', 'add', 'edit'];
  await t.put('bassam_perms_v1', p);
  const c = await t.context('employee1', 'import'),
    out = await t.prepare(
      c,
      {
        intent: 'import',
        deleteMode: undefined,
        finalRows: c.employees.concat([{ eid: 'TEST_ONLY_no_account_new', name: 'TEST_ONLY no account' }]),
        import: { mode: 'update', year: 1448, month: 1, schedule: [], templates: [] },
      },
      'employee1',
    );
  assert.equal(JSON.parse(out.body.set[key('bassam_employees_v1')]).length, c.employees.length + 1);
  p.emps[D1][EKEYS.employee1]['emps/data'] = ['view', 'add'];
  await t.put('bassam_perms_v1', p);
  const add = await t.context('employee1', 'import');
  await assert.rejects(
    t.prepare(
      add,
      { intent: 'import', deleteMode: undefined, import: { mode: 'update', year: 1448, month: 1, schedule: [], templates: [] } },
      'employee1',
    ),
    (e) => e.cuStatus === 403,
  );
});

test('context normalizes original option defaults and fails closed on misplaced secrets without returning their value', async () => {
  const t = await world();
  await t.put(key('bassam_options_v1'), {});
  const c = await t.context();
  assert.ok(Array.isArray(c.options.type));
  assert.ok(Array.isArray(c.options.work));
  assert.equal(Object.hasOwn(c, 'users'), false);
  assert.ok(c.staffAccountKeys.includes(EKEYS.frozen));
  /* Schema 10: the employee roster is a closed typed operational record, so a misplaced secret is refused fail-closed at
     storage (the typed writer and the real /api/save route) before any transition context could read it. The value is never echoed. */
  const K = key('bassam_employees_v1'), roster = copy(inspectOperationalFixture(t.env, K)), snap = () => JSON.stringify(['kv', 'revs', 'meta', 'aud'].map((n) => t.DB.q('SELECT * FROM ' + n)).concat([roster]));
  const before = snap(), leak = (e) => JSON.stringify({ message: e?.message, stack: e?.stack, own: Object.fromEntries(Object.getOwnPropertyNames(e || {}).map((n) => [n, String(e[n])])) });
  await assert.rejects(t.put(K, [{ eid: 'TEST_ONLY', name: 'TEST_ONLY', ph: 'TEST_ONLY_never_return' }]), (e) => e.message === 'operations-unknown-field-ph' && !leak(e).includes('never_return'));
  assert.equal(snap(), before); assert.deepEqual(inspectOperationalFixture(t.env, K), roster);
  const read = await t.api('super', '/api/operations/read?uid=' + IDS.super + '&keys=' + encodeURIComponent(K));
  assert.equal(read.status, 200, JSON.stringify(read.json));
  const saved = await t.api('super', '/api/save', { method: 'POST', body: { uid: IDS.super, requestId: 'TEST_ONLY_secret_save', epoch: read.json.epoch, base: { [K]: read.json.base[K] }, del: [],
    set: { [K]: JSON.stringify(roster.concat([{ eid: 'TEST_ONLY_secret', name: 'TEST_ONLY', ph: 'TEST_ONLY_never_return' }])) } } });
  assert.notEqual(saved.status, 200, JSON.stringify(saved.json)); assert.equal(saved.json?.revs?.[K], undefined);
  assert.equal(JSON.stringify(saved.json).includes('never_return'), false); assert.match(JSON.stringify(saved.json), /operations-unknown-field-ph/);
  assert.equal(snap(), before);
  const after = await t.context();
  assert.equal(JSON.stringify(after).includes('never_return'), false); assert.deepEqual(after.employees.map((e) => e.eid), roster.map((e) => e.eid));
  /* The context guard itself (019c empTransitionContextOf: employees and options cuError('employee-transition-sensitive-source'))
     stays fail-closed for any source that reaches it. Storage cannot hold such a roster, so feed the already-captured
     reference (env.__employeeReference, as rsEmployeeRoute sets it) without a department list to re-read from SQL. */
  const A = await t.actor(), opts = { type: ['TEST_ONLY'], work: ['TEST_ONLY'] },
    secret = [{ eid: 'TEST_ONLY', name: 'TEST_ONLY', ph: 'TEST_ONLY_never_return' }],
    ref = (employees, options) => ({ ...t.env, __employeeReference: { revs: {}, keys: { bassam_depts_v1: '[]', [K]: JSON.stringify(employees), [key('bassam_options_v1')]: JSON.stringify(options) } } }),
    sensitive = (e) => e.cuCode === 'employee-transition-sensitive-source' && !leak(e).includes('never_return');
  const control = await t.W.empTransitionContext(ref(roster, opts), A, D1, 'delete');
  assert.deepEqual(control.employees, roster, 'The stubbed reference really is the context source');
  assert.deepEqual(control.options, opts);
  await assert.rejects(t.W.empTransitionContext(ref(secret, opts), A, D1, 'delete'), sensitive);
  await assert.rejects(t.W.empTransitionContext(ref(roster, { type: [{ token: 'TEST_ONLY_never_return' }], work: [] }), A, D1, 'delete'), sensitive);
  await assert.rejects(t.W.empTransitionContext(ref([{ eid: 'TEST_ONLY', name: 'TEST_ONLY', nested: { Password: 'TEST_ONLY_never_return' } }], opts), A, D1, 'delete'), sensitive);
  for (const [employees, options] of [[secret, opts], [roster, { type: [{ secret: 'TEST_ONLY_never_return' }], work: ['TEST_ONLY'] }]])
    assert.throws(() => X.empTransitionContextOf(A, D1, 'delete', { keys: { [K]: JSON.stringify(employees), [key('bassam_options_v1')]: JSON.stringify(options) }, revs: {} }, 0), sensitive);
  assert.equal(snap(), before);
});
test('closed input rejects credential injection, invalid survivor edits and stale reference revisions without writes', async () => {
  const t = await world(),
    c = await t.context(),
    before = t.DB.q('SELECT * FROM kv');
  await assert.rejects(
    t.prepare(c, { finalRows: c.employees.map((e, i) => (i ? e : { ...e, name: 'TEST_ONLY changed' })) }),
    /delete-shape/,
  );
  await assert.rejects(t.prepare(c, { finalRows: c.employees.map((e, i) => (i ? e : { ...e, ph: 'TEST_ONLY' })) }), /account-fields/);
  await assert.rejects(t.prepare(c, { base: { ...c.base, kv: { ...c.base.kv, bassam_auth_users_v1: 0 } } }), (e) => e.cuStatus === 409);
  assert.deepEqual(t.DB.q('SELECT * FROM kv'), before);
});

test('unchanged tolerated legacy employee metadata survives while a new account-role field remains rejected', async () => {
  const t = await world(),
    employees = copy(t.keys[key('bassam_employees_v1')]);
  employees[0].role = 'TEST_ONLY legacy business metadata';
  await t.put(key('bassam_employees_v1'), employees);
  const c = await t.context();
  const kept = await t.prepare(c, { finalRows: c.employees.slice(0, -1) });
  assert.equal(JSON.parse(kept.body.set[key('bassam_employees_v1')])[0].role, employees[0].role);
  await assert.rejects(t.prepare(c, { finalRows: c.employees.map((e, i) => (i ? e : { ...e, role: 'super' })) }), /account-fields/);
});
test('legacy import schedule mapping and template policy use the server scope and reject foreign employee keys', async () => {
  const t = await world(),
    p = copy(t.keys.bassam_perms_v1);
  p.caps[D1].push('staff');
  p.caps.TEST_ONLY_group_1.push('staff');
  await t.put('bassam_perms_v1', p);
  const c = await t.context('super', 'import'),
    imp = {
      mode: 'update',
      year: 1448,
      month: 3,
      schedule: [{ key: c.employees[0].eid, shift: 'TEST_ONLY shift', rest: 'الجمعة والسبت', cs: 'TEST_ONLY', muk: 'نعم' }],
      templates: [],
    };
  const out = await t.prepare(c, { intent: 'import', deleteMode: undefined, import: imp }),
    row = JSON.parse(out.body.set[key('bassam_staffing_v3')])['1448-3'][c.employees[0].eid];
  assert.equal(row.shift, 'TEST_ONLY shift');
  assert.deepEqual(row.rest, ['الجمعة', 'السبت']);
  assert.equal(row.muk, true);
  await assert.rejects(
    t.prepare(c, {
      intent: 'import',
      deleteMode: undefined,
      import: { ...imp, schedule: [{ key: 'TEST_ONLY_other_department', shift: 'TEST_ONLY' }] },
    }),
    /schedule-key/,
  );
});

test('cleanup does not create absent ledgers or invent a required human reason', async () => {
  const t = await world(),
    c = await t.context(),
    out = await t.prepare(c, { finalRows: [], deleteMode: 'all' });
  for (const n of ['bassam_staffing_v3', 'bassam_staffing_locks_v1', 'bassam_dreport_v1']) assert.equal(out.body.set[key(n)], undefined);
  assert.equal(out.body.why, undefined);
  const reason = 'TEST_ONLY human reason',
    explained = await t.prepare(c, { finalRows: [], deleteMode: 'all', reason });
  assert.deepEqual(
    Object.values(explained.body.why),
    Object.keys(explained.body.set).map(() => reason),
  );
});

test('original cross-resource cleanup removes known identities and keeps a surviving shared name and prior orphans', async () => {
  const t = await world(),
    employees = copy(t.keys[key('bassam_employees_v1')]),
    target = employees[0];
  employees[1].name = target.name;
  await t.put(key('bassam_employees_v1'), employees);
  /* Schema 10: rounds and tasks are typed operational maps keyed by a Hijri date, and the task tuple keeps its typed
     slots (6 performance list, 10-12 numbers). Award records are the typed awards domain (schema 9), cleaned at commit. */
  const awardSeed = { recs: [{ ekey: target.eid, name: target.name }, { ekey: 'TEST_ONLY_prior_orphan', name: target.name }] };
  await t.awards(D1, awardSeed);
  const DAY = '1448-1-2',
    refs = [target.eid, target.nid, target.name, 'TEST_ONLY_prior_orphan'],
    task = Array(15).fill('');
  task[6] = [];
  task[10] = 0;
  task[11] = 0;
  task[12] = 0;
  task[7] = ['TEST_ONLY'];
  task[8] = target.name;
  task[14] = target.eid;
  const orphan = copy(task);
  orphan[14] = 'TEST_ONLY_prior_orphan';
  await t.put(key('bassam_staffing_v2'), {
    [target.eid]: { shift: 'TEST_ONLY' },
    '1448-1': { [target.nid]: { rest: [] }, __shifts: ['TEST_ONLY'], TEST_ONLY_prior_orphan: { shift: 'TEST_ONLY' } },
  });
  await t.put(key('bassam_plan_v1'), { floors: [{ zones: [{ emp: refs }] }] });
  await t.put(key('bassam_rounds_v1'), { [DAY]: { d: [{ gates: [{ emp: refs }] }] } });
  await t.put(key('bassam_tasks_v1'), { [DAY]: [task, orphan] });
  const c = await t.context(),
    out = await t.prepare(c, { finalRows: c.employees.filter((e) => e.eid !== target.eid) }),
    read = (n) => JSON.parse(out.body.set[key(n)]);
  assert.deepEqual(read('bassam_staffing_v2'), { '1448-1': { __shifts: ['TEST_ONLY'], TEST_ONLY_prior_orphan: { shift: 'TEST_ONLY' } } });
  assert.deepEqual(read('bassam_plan_v1').floors[0].zones[0].emp, [target.name, 'TEST_ONLY_prior_orphan']);
  assert.deepEqual(read('bassam_rounds_v1')[DAY].d[0].gates[0].emp, [target.name, 'TEST_ONLY_prior_orphan']);
  const tasks = read('bassam_tasks_v1')[DAY];
  assert.deepEqual(tasks[0].slice(7, 9), [[], '']);
  assert.equal(tasks[0][14], '');
  assert.deepEqual(tasks[1], orphan);
  assert.deepEqual(tasks[0].slice(0, 7).concat(tasks[0].slice(9, 14)), task.slice(0, 7).concat(task.slice(9, 14)));
  assert.equal(out.body.set[key('bassam_award_v1')], undefined);
  /* The typed award cleanup runs only at commit. A fresh world with the same shared-name roster and award records,
     without the past-period ledgers above (those are refused at commit by the locked-period lens, unrelated to awards). */
  const w = await world();
  await w.put(key('bassam_employees_v1'), employees);
  await w.awards(D1, awardSeed);
  const committed = await w.commit('enforce', 'selected', 'TEST_ONLY_cross_award_1', (rows) => rows.filter((e) => e.eid !== target.eid));
  assert.equal(committed.status, 200, JSON.stringify(committed.json));
  assert.deepEqual(await w.awardRecs(D1), [{ ekey: 'TEST_ONLY_prior_orphan', name: target.name }], 'Removed identity award goes; prior orphan with a surviving shared name stays');
  assert.deepEqual(copy(w.DB.q('SELECT employee_key FROM award_records WHERE department_id=?', D1)), [{ employee_key: 'TEST_ONLY_prior_orphan' }]);
});
