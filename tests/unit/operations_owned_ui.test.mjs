import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadClient, until } from './k264_vm.mjs';
import nodePath from 'node:path';
import { fileURLToPath as _f2p } from 'node:url';
import { moduleDir as _md } from '../../tools/systems_paths.mjs';
/* V7 · الحزمة ب: مسارُ وحدة الصفحة نسبةً إلى الجذر — src/modules/<slug> أو src/systems/<key>/client */
const modRel = (slug) => nodePath.relative(_f2p(new URL('../../', import.meta.url)), _md(_f2p(new URL('../../src', import.meta.url)), slug)).split(nodePath.sep).join('/');

const UID = 'TEST_ONLY operations manager', DEPT = 'TEST_ONLY_dA';
const key = name => 'bsdept:' + DEPT + ':' + name;
const clone = value => JSON.parse(JSON.stringify(value));
const response = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const source = path => fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

async function page(module, documents, save) {
  const docs = clone(documents), requests = [], messages = [], scope = { uid: UID, dept: DEPT };
  const C = { req: async (route, options = {}) => {
    if (route.startsWith('/api/operations/read?')) {
      const keys = new URL(route, 'http://x').searchParams.get('keys').split(','), resources = {}, absent = [], base = {};
      for (const k of keys) { const name = k.split(':').at(-1); base[k] = 1; if (Object.hasOwn(docs, name)) resources[k] = docs[name]; else absent.push(k); }
      return response({ ok: 1, uid: UID, epoch: 2, v: 4, resources, absent, denied: [], base });
    }
    if (route === '/api/save') {
      const body = JSON.parse(options.body); requests.push(options.body);
      for (const [k, value] of Object.entries(body.set)) docs[k.split(':').at(-1)] = JSON.parse(value);
      const ack = { ok: 1, requestId: body.requestId, epoch: body.epoch, atomic: 1, revs: Object.fromEntries([...Object.keys(body.set), ...body.del].map(k => [k, 2])) };
      return save ? save({ body, ack, requests, docs }) : response(ack);
    }
    return response({ v: 4, keys: [] });
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, uid: UID, v: 1, keys: {}, revs: {} } }); T.W.document.hidden = true;
  const K = T.W.KIVO;
  K.BassamAuth = { user: () => ({ id: scope.uid, role: 'dept', deptId: scope.dept, name: 'TEST_ONLY manager' }) };
  K.__BS_I = { auth: { cur: () => K.BassamAuth.user(), isMgrKey: value => String(value || '').startsWith('mgr:') } };
  K.BassamDepts = { active: () => scope.dept }; K.BassamCount = count => String(count);
  K.BassamPerm = { deptCap: () => ['daily', 'dreport'], on: () => true };
  K.BassamPageKit = { base: () => class { setState(patch, done) { const value = typeof patch === 'function' ? patch(this.state, {}) : patch; this.state = { ...this.state, ...value }; done?.(); } } };
  T.W.DCLogic = class {};
  vm.runInContext(source('src/services/332-find-day.js'), T.ctx);
  vm.runInContext(source('src/services/420-round-factory.js'), T.ctx);
  assert.equal(typeof K.BassamDayShift.prepareSet, 'function');
  assert.equal(typeof K.BassamRound.prepareShiftAp, 'function');
  vm.runInContext(source(modRel(module) + '/logic.js') + '\nglobalThis.TEST_ONLY_Page = Component;', T.ctx);
  const instance = Object.create(T.W.TEST_ONLY_Page.prototype);
  instance.state = {};
  instance.bsToast = (text, type) => messages.push({ text, type: type || 'err' });
  instance.bsAck = (text, type) => messages.push({ text, type }); instance.PC = () => true; instance.bsOn = () => true;
  instance.autoActivate = () => messages.push({ type: 'activate' });
  instance.curHijri = () => ({ y: 1448, m: 5, d: 19 }); instance.hMonthDays = () => 30;
  const ops = K.__BS_SRV.operations;
  assert.equal((await ops.read(ops.resources.map(key))).ok, 1);
  return { T, K, ops, instance, requests, messages, docs, scope };
}

test('employee save cannot update the confirmed list or activate accounts before the cloud ACK', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const old = [{ eid: 'TEST_ONLY e1', name: 'TEST_ONLY old' }], next = [{ ...old[0], name: 'TEST_ONLY new' }];
  const f = await page('employees', { bassam_employees_v1: old }, async ({ ack }) => { await gate; return response(ack); });
  try {
    f.instance.state = { employees: old, addOpen: false }; f.instance.setState({ addOpen: true });
    const pending = f.instance.setEmp(next, { index: 0, name: next[0].name });
    await until(() => f.requests.length === 1, 300);
    assert.deepEqual(clone(f.instance.state.employees), old); assert.equal(f.messages.length, 0);
    release(); assert.equal(await pending, true);
    assert.deepEqual(clone(f.instance.state.employees), next); assert.equal(f.messages.at(-1).type, 'activate');
    assert.deepEqual(f.T.nativeLS(), {});
  } finally { release(); f.T.dispose(); }
});

test('employee lost ACK retains the editor and retries the exact created row rather than minting another ID', async () => {
  const old = [], first = [{ eid: 'TEST_ONLY generated once', name: 'TEST_ONLY employee' }];
  const f = await page('employees', { bassam_employees_v1: old }, ({ ack, requests }) => {
    if (requests.length === 1) throw Error('TEST_ONLY response lost after commit'); return response(ack);
  });
  try {
    f.instance.state = { employees: old, addOpen: false }; f.instance.setState({ addOpen: true });
    const intent = { index: null, form: { name: first[0].name } };
    assert.equal(await f.instance.setEmp(first, intent), false); assert.equal(f.instance.state.addOpen, true);
    assert.deepEqual(clone(f.instance.state.employees), old);
    assert.equal(await f.instance.setEmp([{ ...first[0], eid: 'TEST_ONLY regenerated UI candidate' }], intent), true);
    assert.equal(f.requests[0], f.requests[1]); assert.equal(f.instance.state.employees[0].eid, first[0].eid);
  } finally { f.T.dispose(); }
});

test('monthly callsign rename saves its catalog and employee assignments in one acknowledged transaction', async () => {
  const f = await page('staff', { bassam_callsigns_v1: ['TEST_ONLY old'], bassam_staffing_v3: { '1448-5': { 'TEST_ONLY e1': { cs: 'TEST_ONLY old', shift: 'TEST_ONLY shift' } } } });
  try {
    f.instance.state = { year: 1448, month: 5, staffing: f.ops.get('bassam_staffing_v3'), csEdit: null };
    f.instance.setState({ csEdit: { old: 'TEST_ONLY old', val: 'TEST_ONLY new' } });
    await f.instance.csRename('TEST_ONLY old', 'TEST_ONLY new');
    assert.equal(f.requests.length, 1);
    assert.deepEqual(Object.keys(JSON.parse(f.requests[0]).set).sort(), [key('bassam_callsigns_v1'), key('bassam_staffing_v3')].sort());
    assert.equal(f.instance.state.staffing['1448-5']['TEST_ONLY e1'].cs, 'TEST_ONLY new'); assert.equal(f.instance.state.csEdit, null);
  } finally { f.T.dispose(); }
});

test('a monthly cell draft cannot adopt refreshed staffing revisions after it was opened', async () => {
  const f = await page('staff', { bassam_staffing_v3: { '1448-5': { 'TEST_ONLY e1': { shift: 'TEST_ONLY old' } } } });
  try {
    f.instance.state = { year: 1448, month: 5, staffing: f.ops.get('bassam_staffing_v3'), sdOpen: null };
    f.instance.setState({ sdOpen: 'TEST_ONLY e1' }); f.ops.invalidate([key('bassam_staffing_v3')]);
    assert.equal(await f.instance.setEntry('TEST_ONLY e1', { shift: 'TEST_ONLY edited' }), false);
    assert.equal(f.instance.state.sdOpen, 'TEST_ONLY e1'); assert.equal(f.requests.length, 0);
  } finally { f.T.dispose(); }
});

test('report approval uses the actual round and dayshift helpers in one transaction, including lost ACK retry', async () => {
  const day = '1448-5-19', shift = 'TEST_ONLY shift';
  const floor = { sid: 'TEST_ONLY site', zones: [{ uid: 'TEST_ONLY zone', emp: ['TEST_ONLY e1'], count: 5, pc: { fajr: 5 } }], gates: [], marks: [], paths: [] };
  const f = await page('dreport', {
    bassam_dreport_v1: { [day]: { created: 1, shifts: { [shift]: { pulled: true, roster: [{ ekey: 'TEST_ONLY e1', st: 'pr' }] } } } },
    bassam_rounds_v1: {}, bassam_plan_v1: { floors: [floor], months: { '1448-5': { c: 1, d: [floor] } } }, bassam_dayshift_v1: {},
  }, ({ ack, requests }) => { if (requests.length === 1) throw Error('TEST_ONLY response lost after commit'); return response(ack); });
  try {
    f.instance.state = { rpY: 1448, rpM: 5, rpD: 19, drLk: null };
    f.instance.DK = () => day; f.instance.drCurShift = () => shift; f.instance.dayPastDS = () => false;
    f.instance.setState({ drLk: { shift } });
    assert.equal(await f.instance.drSetAp(true), false); assert.equal(f.messages.filter(message => message.type === 'ok').length, 0);
    assert.equal(f.ops.get('bassam_dreport_v1')[day].shifts[shift].ap, undefined);
    assert.equal(await f.instance.drSetAp(true), true);
    assert.equal(f.requests.length, 2); assert.equal(f.requests[0], f.requests[1]);
    const set = JSON.parse(f.requests[0]).set;
    assert.deepEqual(Object.keys(set).sort(), ['bassam_dreport_v1', 'bassam_rounds_v1', 'bassam_dayshift_v1'].map(key).sort());
    assert.equal(f.ops.get('bassam_dreport_v1')[day].shifts[shift].ap, 1);
    assert.equal(f.ops.get('bassam_rounds_v1')[day].shAp[shift].ap, 1);
    assert.equal(f.ops.get('bassam_rounds_v1')[day].d[0].zones[0].count, null);
    assert.equal(f.ops.get('bassam_dayshift_v1')[day], shift);
    assert.deepEqual(f.T.nativeLS(), {});
  } finally { f.T.dispose(); }
});

test('report readers and permission-map derivation never write or migrate the typed source while reading', async () => {
  const f = await page('dreport', { bassam_dreport_v1: { '1448-5-19': { created: 1, shifts: {} } } });
  try {
    f.instance.state = { rpY: 1448, rpM: 5, rpD: 19 };
    const report = f.instance.rpLoad(); assert.deepEqual(clone(f.instance.drRepPerm(report)), {});
    assert.equal(f.ops.get('bassam_dreport_v1')['m:1448-5'], undefined);
    assert.equal(f.requests.length, 0); assert.equal(f.K.__BS_SRV.dirty(), false);
  } finally { f.T.dispose(); }
});

test('report leadership and its monthly callsign reassignment share one receipt', async () => {
  const day = '1448-5-19', shift = 'TEST_ONLY shift', roleCs = 'TEST_ONLY chief symbol';
  const f = await page('dreport', {
    bassam_dreport_v1: { __ldcs: { chief: roleCs }, [day]: { created: 1, shifts: { [shift]: { leaders: { chief: 'TEST_ONLY old', deputy: '' } } } } },
    bassam_staffing_v3: { '1448-5': { 'TEST_ONLY old': { cs: roleCs }, 'TEST_ONLY next': { cs: '' } } },
  });
  try {
    f.instance.state = { rpY: 1448, rpM: 5, rpD: 19, drLdOpen: null };
    f.instance.DK = () => day; f.instance.drCurShift = () => shift; f.instance.dayPastDS = () => false;
    f.instance.setState({ drLdOpen: 'chief' });
    assert.equal(await f.instance.rpSetLeader('chief', 'TEST_ONLY next'), true);
    assert.equal(f.requests.length, 1);
    assert.deepEqual(Object.keys(JSON.parse(f.requests[0]).set).sort(), ['bassam_dreport_v1', 'bassam_staffing_v3'].map(key).sort());
    const staffing = f.ops.get('bassam_staffing_v3')['1448-5'];
    assert.equal(staffing['TEST_ONLY old'].cs, ''); assert.equal(staffing['TEST_ONLY next'].cs, roleCs);
    assert.equal(f.ops.get('bassam_dreport_v1')[day].shifts[shift].leaders.chief, 'TEST_ONLY next');
  } finally { f.T.dispose(); }
});

test('editing a callsign draft after invalidation cannot reset its captured base', async () => {
  const f = await page('staff', { bassam_callsigns_v1: ['TEST_ONLY old'] });
  try {
    f.instance.state = { csEdit: null };
    f.instance.setState({ csEdit: { old: 'TEST_ONLY old', val: 'TEST_ONLY a' } });
    f.ops.invalidate([key('bassam_callsigns_v1')]);
    f.instance.setState({ csEdit: { old: 'TEST_ONLY old', val: 'TEST_ONLY b' } });
    assert.equal(await f.instance.saveCsList(['TEST_ONLY b']), false); assert.equal(f.requests.length, 0);
    assert.equal(f.instance.state.csEdit.val, 'TEST_ONLY b');
  } finally { f.T.dispose(); }
});

test('DayShift does not publish a shared choice before its ACK or after the principal changes', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const f = await page('dreport', { bassam_dayshift_v1: {} }, async ({ ack }) => { await gate; return response(ack); });
  const events = []; f.T.W.addEventListener('bs-dayshift', event => events.push(event.detail));
  try {
    const pending = f.K.BassamDayShift.set(1448, 5, 19, 'TEST_ONLY shift');
    assert.equal(await until(() => f.requests.length === 1, 300), true);
    assert.equal(f.K.BassamDayShift.get(1448, 5, 19), ''); assert.equal(events.length, 0);
    f.scope.uid = 'TEST_ONLY other principal'; release();
    const result = await pending; assert.equal(result.ok, 0); assert.equal(result.uncertain, true);
    assert.equal(events.length, 0); assert.deepEqual(f.T.nativeLS(), {});
  } finally { release(); f.T.dispose(); }
});

/* RISHAD-266 · issue #1 (owner decision): employee notifications are issued by the server on the accepted save, never by the
   browser. This test used to pin the browser's «emp_edit» emit; it now pins the same once-key contract on a watcher that is still
   the browser's (the month lock → st_lock), and that a confirmed employee-register commit makes the browser emit nothing.
   The server side is tests/unit/v7_issue1_srv_emp_notif.test.mjs. */
test('the actual notification observer consumes confirmed Operations only and uses the same once key on receipt replay', async () => {
  const old = [{ eid: 'TEST_ONLY e1', name: 'TEST_ONLY old' }], next = [{ ...old[0], name: 'TEST_ONLY new' }], events = [], rawReads = [];
  const f = await page('employees', { bassam_employees_v1: old, bassam_staffing_locks_v1: {} }, ({ ack, requests }) => {
    if (requests.length === 1) throw Error('TEST_ONLY response lost after commit'); return response(ack);
  });
  try {
    const I = { D: () => ({ raw: { allKeys: () => [] } }),
      J: (text, fallback) => { try { return text == null ? fallback : JSON.parse(text); } catch { return fallback; } },
      rawGet: k => { rawReads.push(k); throw Error('No retired business KV reads'); },
      myDept: () => DEPT, me: () => ({ id: UID, name: 'TEST_ONLY manager', role: 'dept' }),
      isMgr: () => true, isSuper: () => false, P: () => ({}),
      emit: (type, detail) => { events.push({ type, detail: clone(detail) }); return Promise.resolve({ ok: 1 }); },
      flushEvents() {}, refresh() {}, deptName: () => 'TEST_ONLY department', depts: () => [], monLbl: month => 'TEST_ONLY ' + month,
    };
    f.K.__BS_I.notif = I; vm.runInContext(source('src/services/442-notif-observer.js'), f.T.ctx);
    const ticket = f.ops.stage({ set: { [key('bassam_staffing_locks_v1')]: { '1448-5': true } } });
    assert.equal((await f.ops.flush(ticket)).uncertain, true); assert.equal(events.length, 0);
    assert.equal((await f.ops.retry(ticket)).ok, 1); assert.equal(events.length, 1);
    assert.equal(events[0].type, 'st_lock'); assert.equal(events[0].detail.once, 'operations:' + ticket.requestId + ':0:st_lock:0');
    assert.equal((await f.ops.flush(ticket)).ok, 1); assert.equal(events.length, 2);
    assert.equal(events[1].detail.once, events[0].detail.once, 'The existing D1 notification dedup receives the same once token');
    assert.equal(f.requests.length, 2, 'Receipt replay does not create another business write');
    const employees = f.ops.stage({ set: { [key('bassam_employees_v1')]: next } });
    assert.equal((await f.ops.flush(employees)).ok, 1); assert.equal(f.requests.length, 3);
    assert.equal(events.length, 2, 'A confirmed employee-register commit emits nothing from the browser: the server issues those');
    f.T.W.dispatchEvent(new f.T.W.CustomEvent('bassam:remote', { detail: { keys: [key('bassam_employees_v1')] } }));
    f.T.W.dispatchEvent(new f.T.W.CustomEvent('bassam:store', { detail: { key: 'bassam_employees_v1' } }));
    assert.equal(events.length, 2); assert.deepEqual(rawReads, []);
  } finally { f.T.dispose(); }
});
