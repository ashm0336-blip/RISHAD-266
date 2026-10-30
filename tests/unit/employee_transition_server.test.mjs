import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world as fixture, D1, D2, IDS, EKEYS, copy } from './custody_review_fx.mjs';
const key = (n) => 'bsdept:' + D1 + ':' + n;
async function world(mode = 'enforce') {
  const f = await fixture({ mode }),
    W = f.W;
  async function put(k, v) {
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
  return { ...f, W, put, actor, context, prepare };
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
    await t.put(key('bassam_dreport_v1'), { TEST_ONLY_old_day: { x: 1 } });
    await t.put(key('bassam_award_v1'), aw);
    let p = copy(t.keys.bassam_perms_v1);
    p.caps[D1].push('staff', 'award');
    p.caps.TEST_ONLY_group_1.push('staff', 'award');
    await t.put('bassam_perms_v1', p);
    const c = await t.context(),
      selected = await t.prepare(c, { finalRows: [], deleteMode: 'selected' }),
      all = await t.prepare(c, { finalRows: [], deleteMode: 'all' });
    assert.equal(selected.body.set[key('bassam_dreport_v1')], undefined);
    assert.equal(selected.body.set[key('bassam_award_v1')], undefined);
    assert.deepEqual(JSON.parse(selected.body.set[key('bassam_staffing_v3')]), {
      '1448-1': { TEST_ONLY_old_orphan: { shift: 'TEST_ONLY' }, __shifts: [] },
    });
    assert.equal(selected.context.serverEmployeeIntent.kind, 'employee-delete');
    assert.equal(all.context.serverEmployeeIntent.kind, 'employee-wipe');
    assert.deepEqual(JSON.parse(all.body.set[key('bassam_dreport_v1')]), {});
    assert.deepEqual(JSON.parse(all.body.set[key('bassam_staffing_v3')]), {});
    assert.deepEqual(JSON.parse(all.body.set[key('bassam_award_v1')]), { recs: [] });
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
  await t.put(key('bassam_employees_v1'), [{ eid: 'TEST_ONLY', name: 'TEST_ONLY', ph: 'TEST_ONLY_never_return' }]);
  await assert.rejects(t.context(), (e) => e.cuCode === 'employee-transition-sensitive-source' && !e.message.includes('never_return'));
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
  const refs = [target.eid, target.nid, target.name, 'TEST_ONLY_prior_orphan'],
    task = Array(15).fill('');
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
  await t.put(key('bassam_rounds_v1'), { TEST_ONLY_day: { d: [{ gates: [{ emp: refs }] }] } });
  await t.put(key('bassam_tasks_v1'), { TEST_ONLY_day: [task, orphan] });
  await t.put(key('bassam_award_v1'), {
    recs: [
      { ekey: target.eid, name: target.name },
      { ekey: 'TEST_ONLY_prior_orphan', name: target.name },
    ],
  });
  const c = await t.context(),
    out = await t.prepare(c, { finalRows: c.employees.filter((e) => e.eid !== target.eid) }),
    read = (n) => JSON.parse(out.body.set[key(n)]);
  assert.deepEqual(read('bassam_staffing_v2'), { '1448-1': { __shifts: ['TEST_ONLY'], TEST_ONLY_prior_orphan: { shift: 'TEST_ONLY' } } });
  assert.deepEqual(read('bassam_plan_v1').floors[0].zones[0].emp, [target.name, 'TEST_ONLY_prior_orphan']);
  assert.deepEqual(read('bassam_rounds_v1').TEST_ONLY_day.d[0].gates[0].emp, [target.name, 'TEST_ONLY_prior_orphan']);
  const tasks = read('bassam_tasks_v1').TEST_ONLY_day;
  assert.deepEqual(tasks[0].slice(7, 9), [[], '']);
  assert.equal(tasks[0][14], '');
  assert.deepEqual(tasks[1], orphan);
  assert.deepEqual(read('bassam_award_v1').recs, [{ ekey: 'TEST_ONLY_prior_orphan', name: target.name }]);
});
