import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadClient, until } from './k264_vm.mjs';

const UID = 'TEST_ONLY task owner', DEPT = 'dA', TASK = 'bsdept:dA:bassam_tasks_v1', LOCK = 'bsdept:dA:bassam_tasks_locks_v1';
const read = name => fs.readFileSync(new URL('../../' + name, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const response = (value, status = 200) => new Response(JSON.stringify(value), { status });
function row() { return ['TEST_ONLY title', '', 'normal', 'pending', 'normal', 'added', null, [], '', 'TEST_ONLY creator', 30, null, null, 101, null, 1000, 2000, null, null, null, null, null]; }
async function world({ save, command, deniedTask = false } = {}) {
  const docs = { [TASK]: { '1448-5-1': [row()], '1448-6-1': [row()] }, [LOCK]: { '1448-5': true, '1448-5-1': { mo: 1 }, '1448-6': true } }, calls = [], actor = { uid: UID, dept: DEPT };
  let rev = 4;
  const C = { req: async (url, options = {}) => {
    if (url.startsWith('/api/operations/read?')) {
      const keys = new URL(url, 'http://x').searchParams.get('keys').split(',');
      const denied = deniedTask ? keys.filter(key => key === TASK) : [], readable = keys.filter(key => !denied.includes(key));
      return response({ ok: 1, uid: actor.uid, epoch: 3, v: rev, resources: Object.fromEntries(readable.filter(k => k in docs).map(k => [k, docs[k]])), absent: readable.filter(k => !(k in docs)), denied, base: Object.fromEntries(readable.map(k => [k, rev])) });
    }
    if (url === '/api/save') {
      calls.push({ url, body: options.body });
      const body = JSON.parse(options.body), ack = () => {
        for (const [key, value] of Object.entries(body.set)) docs[key] = JSON.parse(value);
        for (const key of body.del) delete docs[key];
        rev++;
        return response({ ok: 1, requestId: body.requestId, epoch: body.epoch, atomic: 1, revs: Object.fromEntries(Object.keys(body.set).concat(body.del).map(k => [k, rev])) });
      };
      return save ? save(body, ack, calls) : ack();
    }
    if (url.startsWith('/api/tasks/')) {
      calls.push({ url, body: options.body });
      const body = JSON.parse(options.body), ack = () => response({ ok: 1, requestId: body.requestId, epoch: body.epoch, atomic: 1, rev: 5, revs: { [TASK]: 5 }, n: 1, rows: [{ k: body.k, id: 101, ekey: null }] });
      return command ? command(body, ack, calls) : ack();
    }
    return response({ v: 1, keys: [] });
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, uid: UID, v: 1, keys: {}, revs: {} } });
  T.W.document.hidden = true;
  const KIVO = T.W.KIVO;
  KIVO.BassamAuth = { user: () => ({ id: actor.uid, role: 'dept', deptId: actor.dept }) };
  KIVO.BassamDepts = { active: () => actor.dept };
  KIVO.BassamPageKit = { base: () => class {} }; T.W.DCLogic = class {};
  vm.runInContext('(()=>{' + read('src/modules/tasks/logic.js') + read('src/modules/tasks/logic-filters.js') + read('src/modules/tasks/logic-actions.js') + ';globalThis.__Tasks = Component;})()', T.ctx);
  const c = Object.create(T.W.__Tasks.prototype), toasts = [];
  Object.assign(c, { state: { year: 1448, month: 5, locked: plain(docs[LOCK]), tasksAll: deniedTask ? {} : plain(docs[TASK]) },
    setState(value, done) { Object.assign(this.state, typeof value === 'function' ? value(this.state) : value); done?.(); },
    bsToast(message, kind) { toasts.push({ message, kind }); }, _tkCanWrite: () => true, PC: () => true, _tkIdx: (_list, index) => index, _tkShut: () => false });
  await KIVO.__BS_SRV.operations.read([TASK, LOCK]);
  return { T, c, docs, calls, actor, toasts, ops: KIVO.__BS_SRV.operations };
}

test('Tasks accepts only after the actual sealed queue ACK; the dialog and confirmed view stay unchanged while sending', async () => {
  let finish;
  const W = await world({ save: (_body, ack) => new Promise(resolve => { finish = () => resolve(ack()); }) });
  try {
    W.c._tkOpen({ acceptRef: { d: 1, i: 0, k: 'TEST_ONLY identity' } });
    const pending = W.c._doAccept('TEST_ONLY employee', 'TEST_ONLY eid');
    await until(() => finish);
    assert.ok(W.c.state.acceptRef); assert.equal(W.c.loadAllTasks()['1448-5-1'][0][3], 'pending');
    finish(); await pending;
    assert.equal(W.c.state.acceptRef, null); assert.equal(W.c.loadAllTasks()['1448-5-1'][0][3], 'in_progress');
    assert.deepEqual(W.T.nativeLS(), {});
  } finally { W.T.dispose(); }
});

test('Lost task ACK keeps the dialog; retry sends the exact same ticket/body without rerunning the mutation', async () => {
  let first = true, receipt;
  const W = await world({ save: async (_body, ack) => {
    if (first) { first = false; receipt = await ack().json(); throw Error('TEST_ONLY lost receipt after commit'); }
    return response(receipt);
  } });
  try {
    W.c._tkOpen({ acceptRef: { d: 1, i: 0, k: 'TEST_ONLY identity' } });
    await W.c._doAccept('TEST_ONLY employee', 'TEST_ONLY eid');
    assert.ok(W.c.state.acceptRef); assert.equal(W.c.loadAllTasks()['1448-5-1'][0][3], 'pending');
    await W.c._tkClose('acceptRef', { acceptRef: null }); assert.ok(W.c.state.acceptRef);
    await W.c._doAccept('TEST_ONLY employee', 'TEST_ONLY eid');
    assert.equal(W.calls.length, 2); assert.equal(W.calls[0].body, W.calls[1].body);
    assert.equal(W.c.state.acceptRef, null); assert.equal(W.c.loadAllTasks()['1448-5-1'][0][14], 'TEST_ONLY eid');
  } finally { W.T.dispose(); }
});

test('Deleting a task month and its month/day locks uses one atomic ticket and preserves the next month', async () => {
  const W = await world();
  try {
    W.c._tkOpen({ delMonth: { n: 5 } });
    assert.equal(await W.c._tkDeleteMonth(1448, 5), true);
    assert.equal(W.calls.length, 1);
    assert.deepEqual(Object.keys(JSON.parse(W.calls[0].body).set).sort(), [LOCK, TASK].sort());
    assert.deepEqual(Object.keys(W.docs[TASK]), ['1448-6-1']); assert.deepEqual(W.docs[LOCK], { '1448-6': true });
  } finally { W.T.dispose(); }
});

test('An editor opened before another confirmed revision is rejected; no stale whole-document save or principal switch is sent', async () => {
  const W = await world();
  try {
    W.c._tkOpen({ confirmFinish: { d: 1, i: 0 } });
    // Confirm a distinct write through the same real queue, then try the old editor.
    const d = W.ops.draft(); d.set('bassam_tasks_locks_v1', {}); await W.ops.flush(d.stage());
    await W.ops.read([TASK, LOCK]);
    assert.equal(await W.c._doFinish(1, 0), false);
    assert.equal(W.calls.length, 1);
    W.actor.uid = 'TEST_ONLY different account';
    assert.equal(await W.c._doFinish(1, 0), false); assert.equal(W.calls.length, 1);
  } finally { W.T.dispose(); }
});

test('Task create command retries its original body and requestId after a lost ACK; changed intent cannot close or replace it', async () => {
  let count = 0;
  const W = await world({ command: (_body, ack) => { count++; if (count === 1) throw Error('TEST_ONLY lost ACK'); return ack(); } });
  try {
    W.c._tkOpen({ newTaskOpen: true });
    const body = { k: '1448-5-1', t: 'TEST_ONLY command', s: 1000, e: 2000 };
    const first = await W.c._tkCommandApi('/api/tasks/create', body);
    assert.equal(first.j.ok, 0); assert.ok(W.c._tkCommands.newTaskOpen);
    await W.c._tkClose('newTaskOpen', { newTaskOpen: false }); assert.equal(W.c.state.newTaskOpen, true);
    const changed = await W.c._tkCommandApi('/api/tasks/create', { ...body, t: 'TEST_ONLY changed' });
    assert.equal(changed.j.ok, 0); assert.equal(W.calls.length, 1);
    const result = await W.c._tkCommandApi('/api/tasks/create', body);
    assert.equal(result.j.ok, 1); assert.equal(W.calls.length, 2); assert.equal(W.calls[0].body, W.calls[1].body);
    assert.equal(W.c._tkCommands.newTaskOpen, undefined);
  } finally { W.T.dispose(); }
});

test('A successful-looking command with an incomplete ACK remains uncertain; a principal change during its response cannot confirm it', async () => {
  for (const mode of ['partial', 'principal']) {
    let release;
    const W = await world({ command: (_body, ack) => new Promise(resolve => { release = async () => {
      const data = await ack().json();
      if (mode === 'partial') delete data.atomic;
      else W.actor.uid = 'TEST_ONLY changed principal';
      resolve(response(data));
    }; }) });
    try {
      W.c._tkOpen({ newTaskOpen: true });
      const pending = W.c._tkCommandApi('/api/tasks/create', { k: '1448-5-1', t: 'TEST_ONLY create', s: 1000, e: 2000 });
      await until(() => release); await release();
      assert.equal((await pending).j.ok, 0); assert.equal(W.c.state.newTaskOpen, true);
      assert.equal(W.c._tkCommands.newTaskOpen.state, 'uncertain');
      assert.deepEqual(W.T.nativeLS(), {});
    } finally { W.T.dispose(); }
  }
});

test('Profile keeps its existing self-task API and fails closed when that service is absent; operational fallback never touches native storage', async () => {
  const W = await world();
  try {
    vm.runInContext('(()=>{' + read('src/modules/profile/logic.js') + ';globalThis.__Profile = Component;})()', W.T.ctx);
    const c = Object.create(W.T.W.__Profile.prototype); c.state = {}; c.setState = () => {}; c.bsToast = () => {};
    assert.deepEqual(plain(c._tkAll()), {});
    const result = await c._tkAct('1448-5-1', 0, 'start'); assert.equal(result.ok, false);
    assert.deepEqual(W.T.nativeLS(), {}); assert.equal(W.calls.length, 0);
    assert.equal(c._tkSave, undefined); assert.equal(c._tkMut, undefined); assert.equal(c.pfTaskSet, undefined);
  } finally { W.T.dispose(); }
});

test('Profile field observation awaits its existing service ACK and passes the original spot witness; uncertain cleanup retains the dialog', async () => {
  const W = await world();
  try {
    vm.runInContext('(()=>{' + read('src/modules/profile/logic.js') + ';globalThis.__Profile = Component;})()', W.T.ctx);
    const c = Object.create(W.T.W.__Profile.prototype), spot = { uid: 'TEST_ONLY gate', st: 'open' }, seen = [], success = [];
    Object.assign(c, { state: { pfTick: 0, fdDlg: { fi: 0, gi: 0, kind: 'gates', name: 'TEST_ONLY gate', why: 'TEST_ONLY reason', txt: '', g: spot } },
      setState(value) { Object.assign(this.state, value); }, bsToast() {}, bsAck(message) { success.push(message); } });
    let finish;
    W.T.W.KIVO.BassamField = { KINDS: ['gates'], KIND_AL: { gates: 'TEST_ONLY gate' }, KIND_T: {}, FLOWS: {}, FLOW_ORDER: [], REASONS: ['TEST_ONLY reason'],
      canField: () => true, flowOn: () => false, stateOf: () => 'open', label: () => 'TEST_ONLY gate', clock: () => '00:00',
      observe: (...args) => { seen.push(args); return new Promise(resolve => { finish = resolve; }); } };
    const dto = {}, input = { isStaff: true, DK: '1448-5-1', mySpots: [{ fi: 0, i: 0, kind: 'gates' }], rnd: { d: [{ gates: [spot] }] } };
    c._pfField(dto, input, c.state);
    const pending = dto.fdDlgOk(); assert.ok(c.state.fdDlg); assert.equal(success.length, 0);
    assert.equal(seen[0][3].expected, spot);
    finish({ ok: false, status: 'uncertain', ticket: {} }); await pending;
    dto.fdDlgNo(); assert.ok(c.state.fdDlg); assert.equal(success.length, 0);
    const retry = dto.fdDlgOk(); finish({ ok: true, g: spot }); await retry;
    assert.equal(c.state.fdDlg, null); assert.equal(success.length, 1);
  } finally { W.T.dispose(); }
});

test('Employee day facts never turn an unloaded or failed cloud shift read into an available-employee claim', async () => {
  const W = await world();
  try {
    vm.runInContext(read('src/services/530-emp-day-facts.js'), W.T.ctx);
    assert.throws(() => W.T.W.KIVO.BassamDay.shiftWindow('TEST_ONLY unloaded shift'), /operations-read-required/);
    await W.ops.read([W.ops.key('bassam_shift_options_v1')]);
    assert.equal(W.T.W.KIVO.BassamDay.shiftWindow('TEST_ONLY absent shift'), null, 'Only confirmed absence keeps the established unknown-window behavior');
  } finally { W.T.dispose(); }
});

test('Task projection memoization follows confirmed revisions and never returns a previous principal cache', async () => {
  const W = await world();
  try {
    const first = W.c.loadAllTasks(); assert.equal(W.c.loadAllTasks(), first);
    const draft = W.ops.draft(), changed = draft.get('bassam_tasks_v1'); changed['1448-5-1'][0][0] = 'TEST_ONLY confirmed newer'; draft.set('bassam_tasks_v1', changed);
    assert.equal((await W.ops.flush(draft.stage())).ok, 1);
    const next = W.c.loadAllTasks(); assert.notEqual(next, first); assert.equal(next['1448-5-1'][0][0], 'TEST_ONLY confirmed newer');
    W.actor.uid = 'TEST_ONLY different account';
    assert.throws(() => W.c.loadAllTasks(), /operations-scope-required|operations-read-required/);
  } finally { W.T.dispose(); }
});

test('Profile cannot close or replace a self-task draft while its existing command is in flight or uncertain', async () => {
  const W = await world();
  try {
    vm.runInContext('(()=>{' + read('src/modules/profile/logic.js') + ';globalThis.__Profile = Component;})()', W.T.ctx);
    const c = Object.create(W.T.W.__Profile.prototype), dto = { k: '1448-5-1', id: 101, i: 0, t: 'TEST_ONLY self task' };
    Object.assign(c, { state: { pfPanel: 'tkfin', tkRef: { day: dto.k, idx: 0 }, tkImgs: ['TEST_ONLY in-memory image'] },
      setState(value) { Object.assign(this.state, value); }, bsToast() {} });
    let settle;
    W.T.W.KIVO.BassamMyTasks = { state: () => ({ rows: [dto] }), act: () => new Promise(resolve => { settle = resolve; }) };
    const pending = c._tkAct(dto.k, 0, 'submit');
    c.pfClose(); assert.equal(c.state.pfPanel, 'tkfin');
    settle({ ok: false, uncertain: true, msg: 'TEST_ONLY lost ACK' }); await pending;
    c.tkFinishOpen(dto.k, 0); c.pfClose(); assert.equal(c.state.pfPanel, 'tkfin'); assert.deepEqual(c.state.tkImgs, ['TEST_ONLY in-memory image']);
    const retry = c._tkAct(dto.k, 0, 'submit'); settle({ ok: true }); await retry;
    c.pfClose(); assert.equal(c.state.pfPanel, '');
  } finally { W.T.dispose(); }
});

test('The create-only task editor uses confirmed epoch/context without reading or fabricating a denied task document/base', async () => {
  const W = await world({ deniedTask: true });
  try {
    assert.equal(W.ops.state('bassam_tasks_v1'), 'denied'); assert.throws(() => W.ops.get('bassam_tasks_v1'), /operations-read-required/);
    W.c._tkOpen({ newTaskOpen: true }); assert.equal(W.c.state.newTaskOpen, true);
    const result = await W.c._tkCommandApi('/api/tasks/create', { k: '1448-5-1', t: 'TEST_ONLY create without view', s: 1000, e: 2000 });
    assert.equal(result.j.ok, 1); assert.equal(W.calls.length, 1);
    const body = JSON.parse(W.calls[0].body); assert.equal(Object.hasOwn(body, 'base'), false); assert.equal(body.epoch, 3); assert.equal(body.uid, UID);
    assert.deepEqual(plain(W.c.loadAllTasks()), {}); assert.equal(W.ops.state('bassam_tasks_v1'), 'denied'); assert.deepEqual(W.T.nativeLS(), {});
  } finally { W.T.dispose(); }
});
