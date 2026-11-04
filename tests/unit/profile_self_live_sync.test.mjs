/* Real canonical schema10 Worker/SQLite, synthetic accounts only. Personal
   refresh hints must not grant access to Operational resources or reveal keys. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { world, D1, D2, IDS, EKEYS, copy, identitySnapshot } from './custody_review_fx.mjs';
import { installOperationalFixture, inspectOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { candidateWorker } from './irshad_domain_fx.mjs';
import { ROOT } from './harness.mjs';
import { loadClient } from './k264_vm.mjs';

const STAFFING = 'bassam_staffing_v3', scoped = (name, dept = D1) => 'bsdept:' + dept + ':' + name;
let number = 0;
function ok(response) { assert.equal(response.status, 200, JSON.stringify(response.json)); assert.equal(response.json.ok, 1); return response.json; }
const cursor = B => +B.DB.q("SELECT v FROM meta WHERE k='rev'")[0].v;
const changes = (B, since, who = 'employee1') => B.api(who, '/api/changes?' + new URLSearchParams({ uid: IDS[who], since: String(since) }));
const today = B => B.api('employee1', '/api/me/today');

async function setup({ employeeManager = false } = {}) {
  const B = await world(); await installOperationalFixture(B.env, B.W);
  const permissions = copy(B.keys.bassam_perms_v1);
  // The generic fixture omits the monthly page. Both synthetic departments and
  // their branches declare the module, with the employee's grant sheet empty.
  for (const scope of Object.keys(permissions.caps)) permissions.caps[scope] = [...new Set([...permissions.caps[scope], 'staff'])];
  permissions.emps[D1][EKEYS.employee1] = {}; // Explicitly no operational grants.
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_perms_v1', JSON.stringify(permissions)));
  if (employeeManager) {
    const users = copy(B.users); users.find(user => user.id === IDS.employee1).mgr = 1;
    await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_auth_users_v1', JSON.stringify(users)));
  }
  const first = ok(await today(B)), month = first.day.ym;
  await replaceOperationalFixture(B.env, scoped(STAFFING), { [month]: { [EKEYS.employee1]: { shift: 'الوردية الأولى', rest: [] } } });
  await replaceOperationalFixture(B.env, scoped(STAFFING, D2), { [month]: { [EKEYS.employee2]: { shift: 'الوردية الأولى', rest: [] } } });
  const initial = ok(await today(B));
  assert.equal(initial.identity.linked, true); assert.deepEqual(initial.facts.rest.sched, []);
  return { ...B, month, initial, protectedBefore: identitySnapshot(B.DB) };
}
async function saveRest(B, days, dept = D1) {
  const key = scoped(STAFFING, dept), read = ok(await B.api('super', '/api/operations/read?' + new URLSearchParams({ uid: IDS.super, keys: key })));
  const value = copy(read.resources[key]), employee = dept === D1 ? EKEYS.employee1 : EKEYS.employee2;
  value[B.month][employee].rest = days;
  const requestId = 'TEST_ONLY_private_facts_' + ++number;
  const ack = ok(await B.api('super', '/api/save', { method: 'POST', body: {
    uid: IDS.super, requestId, epoch: read.epoch, base: read.base, set: { [key]: JSON.stringify(value) }, del: [],
  } }));
  assert.equal(ack.requestId, requestId); assert.equal(ack.atomic, 1);
  return ack;
}

test('canonical zero-grant staff receives only a personal invalidation hint after its department schedule changes', async () => {
  const B = await setup(), key = scoped(STAFFING);
  const restricted = ok(await B.api('employee1', '/api/operations/read?' + new URLSearchParams({ uid: IDS.employee1, keys: key })));
  assert.deepEqual(restricted.denied, [key]); assert.deepEqual(restricted.resources, {}); assert.deepEqual(restricted.base, {});
  const since = cursor(B); await saveRest(B, ['الأحد', 'الاثنين']);
  const response = await changes(B, since); assert.equal(response.status, 200);
  assert.deepEqual(response.json.keys, [], 'Restricted Operations names remain hidden');
  assert.equal(response.json.meChanged, 1, 'The already-authorized personal endpoint must be invalidated independently of operational grants');
  assert.ok(Object.keys(response.json).every(name => ['v', 'keys', 'am', 'az', 'more', 'meChanged'].includes(name)));
  assert.equal(JSON.stringify(response.json).includes(key), false);
  assert.equal(JSON.stringify(response.json).includes(EKEYS.employee1), false);
  assert.deepEqual(ok(await today(B)).facts.rest.sched, ['الأحد', 'الاثنين']);
  const stillDenied = ok(await B.api('employee1', '/api/operations/read?' + new URLSearchParams({ uid: IDS.employee1, keys: key })));
  assert.deepEqual(stillDenied.denied, [key]); assert.deepEqual(stillDenied.resources, {}); assert.deepEqual(stillDenied.base, {});
  assert.deepEqual(identitySnapshot(B.DB), B.protectedBefore);
});

test('canonical foreign-department changes do not invalidate or disclose another zero-grant staff personal snapshot', async () => {
  const B = await setup(), since = cursor(B); await saveRest(B, ['الثلاثاء'], D2);
  const response = await changes(B, since); assert.equal(response.status, 200);
  assert.deepEqual(response.json.keys, []); assert.equal(response.json.meChanged, undefined);
  assert.equal(JSON.stringify(response.json).includes(D2), false);
  assert.equal(JSON.stringify(response.json).includes(EKEYS.employee2), false);
  assert.deepEqual(ok(await today(B)).facts.rest.sched, []);
  assert.deepEqual(inspectOperationalFixture(B.env, scoped(STAFFING))[B.month][EKEYS.employee1].rest, []);
  assert.deepEqual(identitySnapshot(B.DB), B.protectedBefore);
});

test('canonical staff with a manager badge and an ordinary employee key retains existing personal-snapshot eligibility', async () => {
  const B = await setup({ employeeManager: true }), since = cursor(B); await saveRest(B, ['الأحد']);
  const response = await changes(B, since); assert.equal(response.status, 200);
  assert.equal(response.json.meChanged, 1, 'The personal route excludes synthetic mgr: keys, not an ordinary employee carrying mgr');
  assert.deepEqual(ok(await today(B)).facts.rest.sched, ['الأحد']);
  assert.deepEqual(identitySnapshot(B.DB), B.protectedBefore);
});

test('canonical private hint uses the personal route dependencies and complete cursor boundary without leaking other change classes', async () => {
  const W = await candidateWorker(['meSnapshotChanged', 'meStaffEligible', 'ME_KEYS']);
  const actor = { u: { id: IDS.employee1, role: 'staff', deptId: D1, ekey: EKEYS.employee1 } };
  for (const resource of W.ME_KEYS) {
    assert.equal(W.meSnapshotChanged(actor, [{ k: scoped(resource), rev: 12 }], 12), true);
    assert.equal(W.meSnapshotChanged(actor, [{ k: scoped(resource, D2), rev: 12 }], 12), false);
    assert.equal(W.meSnapshotChanged(actor, [{ k: scoped(resource), rev: 13 }], 12), false, 'No hint for a change beyond a cut response cursor');
    assert.equal(W.meSnapshotChanged(actor, [{ k: scoped(resource) + ':child', rev: 12 }], 12), false);
  }
  for (const key of ['bassam_auth_users_v1', 'bassam_depts_v1'])
    assert.equal(W.meSnapshotChanged(actor, [{ k: key, rev: 12 }], 12), true);
  for (const key of [scoped('bassam_tasks_v1'), 'bassam_notifications_domain_v1', 'bassam_staffing_v3'])
    assert.equal(W.meSnapshotChanged(actor, [{ k: key, rev: 12 }], 12), false);
  assert.equal(W.meStaffEligible({ ...actor.u, mgr: true }), true);
  assert.equal(W.meStaffEligible({ ...actor.u, ekey: '' }), true, 'The existing private route can resolve legacy identity without an ekey');
  assert.equal(W.meStaffEligible({ ...actor.u, ekey: 'mgr:' + D1 }), false);
  assert.equal(W.meStaffEligible({ ...actor.u, role: 'super' }), false);
});

const drain = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
function clock(W) {
  let now = Date.now(), serial = 0;
  const tasks = new Map(), errors = [];
  W.Date = class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  const add = (fn, ms, interval, args) => { const id = ++serial; tasks.set(id, { id, at: now + Math.max(0, ms || 0), fn, interval, args }); return id; };
  W.setTimeout = (fn, ms, ...args) => add(fn, ms, 0, args);
  W.setInterval = (fn, ms, ...args) => add(fn, ms, ms, args);
  W.clearTimeout = W.clearInterval = id => tasks.delete(id);
  return {
    errors,
    clear: () => tasks.clear(),
    async advance(ms) {
      const end = now + ms;
      for (let steps = 0; ; steps++) {
        assert.ok(steps < 10000, 'Bounded existing timer execution');
        const task = [...tasks.values()].filter(task => task.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0];
        if (!task) break;
        now = task.at; tasks.delete(task.id);
        if (task.interval) tasks.set(task.id, { ...task, at: now + task.interval });
        try { task.fn(...task.args); } catch (error) { errors.push(error); }
        await drain();
      }
      now = end; await drain(); assert.deepEqual(errors, []);
    },
  };
}
function emitted() {
  assert.ok(process.env.KIVO_DIST, 'Select the actual current build with KIVO_DIST');
  const dist = path.resolve(ROOT, process.env.KIVO_DIST), manifest = JSON.parse(fs.readFileSync(dist + '.build.json', 'utf8'));
  const retained = new Set(manifest.retainedFiles || []), used = {};
  function read(pattern) {
    const names = Object.keys(manifest.files).filter(name => pattern.test(name) && !retained.has(name));
    assert.equal(names.length, 1, String(pattern));
    const bytes = fs.readFileSync(path.join(dist, names[0])), entry = manifest.files[names[0]];
    assert.equal(bytes.length, entry.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    used[names[0]] = entry.sha256; return bytes.toString('utf8');
  }
  return { used, asset: name => read(new RegExp('^assets/js/' + name + '\\.[a-f0-9]{10}\\.js$')),
    profile: () => read(/^assets\/pages\/Profile\.logic\.[a-f0-9]{10}\.js$/) };
}
async function profile(t, { holdFirst = false, responseChange } = {}) {
  const B = await setup(), bundle = emitted(), requests = [], hints = [], errors = [], jar = { cookie: 'bs_tok=TEST_ONLY_session_employee1' };
  const initial = ok(await B.api('employee1', '/api/get?keys=bassam_auth_users_v1,bassam_depts_v1,bassam_perms_v1,bassam_gdepts_v1,bassam_platform_v1'));
  let release, held = false;
  const control = { user: { ...B.users.find(user => user.id === IDS.employee1) } };
  const T = loadClient({ blocks: [], jar, boot: { srv: 1, cf: 1, uid: IDS.employee1, v: initial.v,
    keys: Object.fromEntries(Object.entries(initial.keys).filter(([, row]) => row.v != null).map(([key, row]) => [key, row.v])),
    revs: Object.fromEntries(Object.entries(initial.keys).map(([key, row]) => [key, row.rev])) },
    C: { req: async (route, options = {}) => {
      const url = new URL(route, 'http://x'); assert.equal(url.origin, 'http://x');
      assert.doesNotMatch(url.pathname, /\/api\/img|r2/i);
      const headers = new Headers({ Cookie: options.cookie });
      if (options.method === 'POST') { headers.set('Origin', 'http://x'); headers.set('Content-Type', 'application/json'); }
      const response = await B.W.default.fetch(new Request(url, { method: options.method || 'GET', headers, ...(options.body ? { body: options.body } : {}) }), B.env);
      const record = { path: url.pathname, method: options.method || 'GET', status: response.status }; requests.push(record);
      if (url.pathname === '/api/me/today') {
        const data = await response.clone().json();
        if (holdFirst && !held) { held = true; await new Promise(resolve => { release = resolve; }); }
        if (responseChange) return new Response(JSON.stringify(responseChange(copy(data))), { headers: { 'Content-Type': 'application/json' } });
      }
      return response;
    } },
  });
  const W = T.W, K = W.KIVO, time = clock(W);
  W.document.hidden = false; W.URLSearchParams = URLSearchParams; W.AbortController = AbortController;
  K.BassamAuth = { user: () => control.user, isSuper: () => false, isMgrKey: key => String(key || '').startsWith('mgr:'),
    display: () => ({ name: 'TEST_ONLY employee', role: 'موظف' }), users: () => [], staffMap: () => ({}),
    deptManagers: () => [], groupManagers: () => [], deptManager: () => null, myTitle: () => '', permLabel: () => '' };
  K.BassamDepts = { active: () => control.user.deptId, activeName: () => 'TEST_ONLY A', list: () => B.keys.bassam_depts_v1,
    ancestorsOf: () => [], groupName: () => '' };
  K.BassamPerm = { on: () => true, can: () => false };
  W.DCLogic = class { setState(patch) { this.state = { ...this.state, ...(typeof patch === 'function' ? patch(this.state) : patch) }; } };
  for (const name of ['280-server-storage', '380-hijri-fallback', '490-emp-key', '530-emp-day-facts',
    '440-count', '400-shift-need', '410-gate-units', '535-profile-facts', '565-page-kit'])
    vm.runInContext(bundle.asset(name), T.ctx, { filename: 'emitted-' + name });
  W.addEventListener('bassam:me', event => hints.push(copy(event.detail)));
  const operations = K.__BS_SRV.operations;
  const preload = await operations.read(operations.resources.map(name => scoped(name)));
  assert.equal(preload.ok, 1); assert.equal(operations.state(STAFFING), 'denied');
  vm.runInContext(bundle.profile(), T.ctx, { filename: 'emitted-Profile.logic' });
  const factory = K.__dcLogicDefs?.Profile || W.__dcLogicDefs?.Profile;
  assert.equal(typeof factory, 'function'); const Component = factory(W.DCLogic, W.DCLogic, {}), page = new Component();
  page.bsToast = () => {}; page.componentDidMount(); await drain();
  t.after(() => { release?.(); page.componentWillUnmount(); time.clear(); T.dispose(); assert.deepEqual(errors, []); });
  const todayRequests = () => requests.filter(request => request.path === '/api/me/today');
  const facts = () => page.pfMine({ user: control.user, emps: [], staffing: {}, locks: {}, dreport: {}, plan: {}, rounds: {}, opts: [], readable: false }).M;
  return { B, T, W, K, time, page, control, requests, todayRequests, hints, operations, facts, release: () => release?.(), held: () => held, used: bundle.used };
}

test('actual emitted Profile and280 update zero-grant own rest through the existing changes feed without operational data access or extra polling', async t => {
  const f = await profile(t);
  assert.deepEqual(copy(f.facts().facts.rest.sched), []);
  assert.equal(f.todayRequests().length, 1);
  await f.time.advance(20000); // Existing personal fallback remains far away.
  await saveRest(f.B, ['الأحد', 'الاثنين']);
  await f.time.advance(2000);
  assert.deepEqual(copy(f.facts().facts.rest.sched), ['الأحد', 'الاثنين']);
  assert.equal(f.todayRequests().length, 2);
  assert.equal(f.operations.state(STAFFING), 'denied');
  assert.throws(() => f.operations.get(STAFFING), /operations-read-required/);
  assert.equal(f.hints.length, 1);
  assert.ok(Object.keys(f.hints[0]).every(key => ['uid', 'dept', 'ekey', 'v'].includes(key)));
  await f.time.advance(15000); assert.equal(f.todayRequests().length, 2, 'No new personal polling interval');
  assert.equal(f.requests.some(request => request.method === 'POST'), false);
  assert.deepEqual(f.T.nativeLS(), {});
});

test('actual emitted Profile coalesces an in-flight invalidation into one trailing GET and never promotes the obsolete response', async t => {
  const f = await profile(t, { holdFirst: true }); assert.equal(f.held(), true);
  await saveRest(f.B, ['الأحد']); await saveRest(f.B, ['الأحد', 'الاثنين']);
  await f.time.advance(1600);
  assert.equal(f.page.state.pfMe, null); assert.equal(f.todayRequests().length, 1);
  f.release(); await drain();
  assert.equal(f.page.state.pfMe, null, 'A response predating the invalidation is not the new confirmed snapshot');
  await f.time.advance(8500);
  assert.deepEqual(copy(f.facts().facts.rest.sched), ['الأحد', 'الاثنين']);
  assert.equal(f.todayRequests().length, 2, 'One trailing GET for the burst');
  await f.time.advance(20000); assert.equal(f.todayRequests().length, 2);
  assert.equal(f.operations.state(STAFFING), 'denied');
});

test('actual emitted Profile fences delayed personal responses by uid, department, employee key and role', async t => {
  for (const field of ['id', 'deptId', 'ekey', 'role']) {
    const f = await profile(t, { holdFirst: true }); assert.equal(f.held(), true);
    f.control.user = { ...f.control.user, [field]: field === 'deptId' ? D2 : field === 'role' ? 'gm' : 'TEST_ONLY other context' };
    f.release(); await drain();
    assert.equal(f.page.state.pfMe, null, field + ': old-context facts are not accepted');
    assert.equal(f.facts(), null);
  }
});

test('actual emitted Profile rejects a mismatched private response and ignores unscoped hint events', async t => {
  const invalid = await profile(t, { responseChange: data => ({ ...data, account: { ...data.account, id: 'TEST_ONLY other principal' } }) });
  assert.equal(invalid.page.state.pfMe, null); assert.equal(invalid.page.state.pfMeErr, 'fail');
  const f = await profile(t); const before = f.todayRequests().length;
  const own = { uid: IDS.employee1, dept: D1, ekey: EKEYS.employee1, v: cursor(f.B) };
  for (const field of ['uid', 'dept', 'ekey']) f.W.dispatchEvent(new f.W.CustomEvent('bassam:me', { detail: { ...own, [field]: 'TEST_ONLY wrong' } }));
  await f.time.advance(12000); assert.equal(f.todayRequests().length, before);
  f.page.componentWillUnmount();
  f.W.dispatchEvent(new f.W.CustomEvent('bassam:me', { detail: own }));
  await f.time.advance(12000); assert.equal(f.todayRequests().length, before, 'Unmounted personal view cannot schedule another GET');
});

test('actual emitted changes uid fence freezes a switched cookie session before a private refresh', async t => {
  const f = await profile(t), before = f.todayRequests().length;
  f.T.jar.cookie = 'bs_tok=TEST_ONLY_session_employee2';
  await saveRest(f.B, ['الأحد']); await f.time.advance(2000);
  assert.ok(f.requests.some(request => request.path === '/api/changes' && request.status === 409), 'The real existing UID mismatch contract is exercised');
  assert.equal(f.K.__BS_SRV.sesChanged(), true);
  assert.equal(f.todayRequests().length, before); assert.equal(f.facts(), null);
});
