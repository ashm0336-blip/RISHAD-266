/* Source event regression: the full Staff renderVals supplies the callback,
   actual 280 owns the draft/ACK, and the canonical schema10 Worker writes SQL.
   This is a VM host, not proof of emitted DOM/runtime click binding. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
import { world, D1, D2, G1, IDS, ROOT, identitySnapshot } from './custody_review_fx.mjs';
import { installOperationalFixture, inspectOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { loadClient, until } from './k264_vm.mjs';

const EMPLOYEE = { eid: 'TEST_ONLY_UI_REST_EMP', name: 'TEST_ONLY_UI_EMP_A_EDITED' };
const SHIFT = 'الوردية الأولى';
const scoped = (name, department = D1) => 'bsdept:' + department + ':' + name;
const emittedDirectory = process.env.KIVO_STAFF_REST_DIST ? path.resolve(process.env.KIVO_STAFF_REST_DIST) : null;
const emittedManifest = emittedDirectory ? JSON.parse(fs.readFileSync(emittedDirectory + '.build.json', 'utf8')) : null;

function frontSource(relative) {
  if (!emittedDirectory) return fs.readFileSync(path.join(ROOT, relative), 'utf8');
  const stem = path.basename(relative, '.js');
  const pattern = relative === 'src/modules/staff/logic.js' ? /^assets\/pages\/Staffing\.logic\.[a-f0-9]{10}\.js$/
    : relative === 'src/modules/staff/view.html' ? /^assets\/pages\/Staffing\.[a-f0-9]{10}\.dc\.txt$/
      : new RegExp('^assets/js/' + stem + '\\.[a-f0-9]{10}\\.js$');
  const names = Object.keys(emittedManifest.files).filter(name => pattern.test(name));
  assert.equal(names.length, 1, 'One exact emitted asset for ' + relative);
  const bytes = fs.readFileSync(path.join(emittedDirectory, names[0]));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), emittedManifest.files[names[0]].sha256,
    'Verify emitted bytes before executing ' + names[0]);
  return bytes.toString('utf8');
}

function actualPick() {
  const source = frontSource('src/permissions/334-perm-tree-tpl.js');
  const found = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && node.left.object.name === 'KIVO' &&
      node.left.property.name === 'BassamPick') found.push(node);
    for (const value of Object.values(node)) Array.isArray(value) ? value.forEach(visit) : visit(value);
  }
  visit(parse(source, { ecmaVersion: 'latest', sourceType: 'script' }));
  assert.equal(found.length, 1, 'One actual shared picker definition');
  return source.slice(found[0].start, found[0].end) + ';';
}

async function page(t, { visiblePolling = false } = {}) {
  const B = await world();
  assert.equal(B.W.KIVO_SCHEMA_VERSION, 10);
  await installOperationalFixture(B.env, B.W);
  // The general custody fixture omits the monthly-staff page. Declare this
  // synthetic test department's ceiling explicitly; keep real guards enabled.
  const permissions = JSON.parse(JSON.stringify(B.keys.bassam_perms_v1));
  for (const scope of [D1, G1]) permissions.caps[scope] = [...new Set([...permissions.caps[scope], 'staff'])];
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_perms_v1', JSON.stringify(permissions)));
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
    year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Riyadh',
  }).formatToParts(new Date());
  const now = Object.fromEntries(['year', 'month', 'day'].map(name => [name, +parts.find(part => part.type === name).value]));
  const month = now.year + '-' + now.month;
  await replaceOperationalFixture(B.env, scoped('bassam_employees_v1'), [EMPLOYEE]);
  await replaceOperationalFixture(B.env, scoped('bassam_shift_options_v1'), [{ name: SHIFT, color: '#b99751' }]);
  await replaceOperationalFixture(B.env, scoped('bassam_staffing_v3'), {
    [month]: { [EMPLOYEE.eid]: { shift: SHIFT, rest: [] } },
  });
  await replaceOperationalFixture(B.env, scoped('bassam_staffing_locks_v1'), {});
  const identityBefore = identitySnapshot(B.DB);
  const foreignBefore = inspectOperationalFixture(B.env, scoped('bassam_staffing_v3', D2));
  const requests = [], messages = [], log = [];
  const control = { operationsReadFault: null, loseSaveAcks: 0 };
  const initial = await B.api('super', '/api/get?keys=' + encodeURIComponent('bassam_perms_v1,bassam_depts_v1,bassam_perm_tpls_v1'));
  assert.equal(initial.status, 200);
  const authz = visiblePolling ? await B.api('super', '/api/authz') : null;
  if (authz) { assert.equal(authz.status, 200); assert.equal(authz.json.mode, 'enforce'); }
  const T = loadClient({
    blocks: emittedDirectory ? [] : ['280-server-storage.js'],
    jar: { cookie: 'bs_tok=TEST_ONLY_session_super' }, log,
    boot: { srv: 1, cf: 1, uid: IDS.super, v: initial.json.v, ...(authz ? { authz: authz.json.me } : {}),
      keys: Object.fromEntries(Object.entries(initial.json.keys).filter(([, row]) => row.v !== null).map(([key, row]) => [key, row.v])),
      revs: Object.fromEntries(Object.entries(initial.json.keys).map(([key, row]) => [key, row.rev])) },
    C: { req: async (route, { method = 'GET', cookie, body } = {}) => {
      const url = new URL(route, 'http://x');
      assert.equal(url.origin, 'http://x', 'Only isolated in-memory Worker requests');
      assert.equal(/(?:\/api\/img|r2)/i.test(url.pathname), false, 'No image or R2 access');
      const request = { route: url.pathname, method, body, since: url.searchParams.get('since'),
        requestedKeys: url.pathname === '/api/operations/read' ? url.searchParams.get('keys').split(',') : [] };
      requests.push(request);
      const headers = new Headers({ Cookie: cookie });
      if (method !== 'GET') {
        headers.set('Origin', 'http://x'); headers.set('Content-Type', 'application/json');
      }
      const response = await B.W.default.fetch(new Request(url, {
        method, headers, ...(body === undefined ? {} : { body }),
      }), B.env);
      request.status = response.status;
      request.json = await response.clone().json();
      if (url.pathname === '/api/operations/read' && control.operationsReadFault) {
        request.status = control.operationsReadFault === 'denied' ? 200 : 503;
        request.json = control.operationsReadFault === 'denied'
          ? { ok: 1, uid: IDS.super, epoch: request.json.epoch, v: request.json.v,
            resources: {}, absent: [], denied: request.requestedKeys, base: {} }
          : { ok: 0, err: 'TEST_ONLY_READ_FAILURE' };
        return new Response(JSON.stringify(request.json), { status: request.status, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.pathname === '/api/save' && method === 'POST' && control.loseSaveAcks > 0) {
        control.loseSaveAcks--;
        throw TypeError('TEST_ONLY response lost after actual local commit');
      }
      return response;
    } },
  });
  t.after(() => T.dispose());
  const W = T.W, K = W.KIVO;
  if (emittedDirectory) vm.runInContext(frontSource('src/api/280-server-storage.js'), T.ctx, { filename: 'emitted-280' });
  W.document.hidden = true;
  W.URLSearchParams = URLSearchParams;
  W.AbortController = AbortController;
  K.BassamAuth = {
    user: () => B.users.find(user => user.id === IDS.super),
    staffMap: () => ({}), isSuper: () => true,
  };
  K.BassamDepts = { active: () => D1, activeName: () => 'TEST_ONLY department A' };
  // The presentation host represents the actual synthetic super session. The
  // canonical Worker still authorizes every read/write; no backend guard stub.
  K.BassamPerm = { can: () => true, on: () => true, deptCap: () => ['staff', 'emps'], empPerms: () => ({}) };
  K.BassamEmp = { key: row => row.eid };
  W.DCLogic = class {
    setState(patch, done) {
      const next = typeof patch === 'function' ? patch(this.state, {}) : patch;
      this.state = { ...this.state, ...next }; done?.();
    }
  };
  for (const relative of ['src/i18n/380-hijri-fallback.js', 'src/services/332-find-day.js', 'src/services/440-count.js', 'src/components/565-page-kit.js']) {
    vm.runInContext(frontSource(relative), T.ctx, { filename: relative });
  }
  vm.runInContext(actualPick(), T.ctx, { filename: '334-perm-tree-tpl.js:actual-BassamPick' });
  const operations = K.__BS_SRV.operations;
  assert.equal((await operations.read(operations.resources.map(name => scoped(name)))).ok, 1);
  if (emittedDirectory) {
    assert.match(frontSource('src/modules/staff/view.html'), /e\.weekDays/);
    assert.match(frontSource('src/modules/staff/view.html'), /w\.toggle/);
    vm.runInContext(frontSource('src/modules/staff/logic.js'), T.ctx, { filename: 'emitted-Staffing.logic' });
    const factory = (W.__dcLogicDefs || K.__dcLogicDefs).Staffing;
    assert.equal(typeof factory, 'function');
    W.TEST_ONLY_Staff = factory(W.DCLogic, W.DCLogic, {});
  } else vm.runInContext(frontSource('src/modules/staff/logic.js') +
    '\nglobalThis.TEST_ONLY_Staff = Component;', T.ctx, { filename: 'src/modules/staff/logic.js' });
  const instance = new W.TEST_ONLY_Staff();
  instance.bsToast = (text, type) => messages.push({ text, type: type || 'err' });
  assert.equal(instance.monthKey(), month, 'The page and server fixture use the current Hijri month');
  const row = () => {
    const result = instance.renderVals().rows.find(value => value.eid === EMPLOYEE.eid);
    assert.ok(result, 'Actual renderVals returns the name/eid-only employee row');
    return result;
  };
  const saves = () => requests.filter(request => request.method === 'POST' && request.route === '/api/save');
  return { B, T, instance, operations, row, saves, requests, messages, log, month, identityBefore, foreignBefore, control };
}

test('Staff renderVals weekly-rest Sunday callback writes the name/eid-only employee through actual 280/schema10', async t => {
  const f = await page(t);
  const before = f.row();
  assert.equal(before.restChips.length, 0);
  assert.equal(before.weekDays.length, 7);
  assert.equal(before.restCanEdit, true);
  before.restToggle();
  const opened = f.row();
  assert.equal(opened.restOpen, true);
  const sunday = opened.weekDays.find(day => day.tip.startsWith('الأحد:'));
  assert.ok(sunday);
  assert.match(sunday.name, /\(0\)/);
  sunday.toggle();
  assert.ok(await until(() => f.saves().length === 1 || f.messages.length, 2500, 10),
    'The callback must reach transport or an explicit pre-POST failure');
  assert.equal(f.saves().length, 1, JSON.stringify({ messages: f.messages, status: f.operations.status(), log: f.log }));
  assert.ok(await until(() => f.row().restChips.length === 1 || f.messages.length, 2500, 10));
  const request = f.saves()[0];
  assert.equal(request.status, 200, JSON.stringify(request.json));
  assert.equal(request.json.ok, 1);
  assert.equal(request.json.atomic, 1);
  const body = JSON.parse(request.body);
  assert.deepEqual(Object.keys(body.set), [scoped('bassam_staffing_v3')]);
  assert.deepEqual(JSON.parse(body.set[scoped('bassam_staffing_v3')])[f.month][EMPLOYEE.eid].rest, ['الأحد']);
  assert.deepEqual(inspectOperationalFixture(f.B.env, scoped('bassam_staffing_v3'))[f.month][EMPLOYEE.eid], {
    shift: SHIFT, rest: ['الأحد'],
  });
  const after = f.row();
  assert.equal(after.restChips[0].name, 'الأحد');
  assert.match(after.weekDays.find(day => day.tip.startsWith('الأحد:')).name, /\(1\)/);
  assert.equal(after.restOpen, true, 'A confirmed weekly choice does not close this popup');
  // The popup stayed open. A new render must start the next command on the
  // first acknowledged revision, rather than replaying its completed ticket.
  const monday = after.weekDays.find(day => day.tip.startsWith('الاثنين:'));
  assert.ok(monday);
  monday.toggle();
  assert.ok(await until(() => f.saves().length === 2 || f.messages.length, 2500, 10));
  assert.equal(f.saves().length, 2, JSON.stringify({ messages: f.messages, status: f.operations.status() }));
  assert.ok(await until(() => f.row().restChips.length === 2 || f.messages.length, 2500, 10));
  const second = f.saves()[1], secondBody = JSON.parse(second.body);
  assert.equal(second.status, 200, JSON.stringify(second.json));
  assert.equal(second.json.ok, 1);
  assert.equal(second.json.atomic, 1);
  assert.notEqual(secondBody.requestId, body.requestId, 'A different intent gets a new request ID');
  assert.equal(secondBody.base[scoped('bassam_staffing_v3')], request.json.revs[scoped('bassam_staffing_v3')],
    'The second command uses the first acknowledged resource revision');
  assert.deepEqual(JSON.parse(secondBody.set[scoped('bassam_staffing_v3')])[f.month][EMPLOYEE.eid].rest, ['الأحد', 'الاثنين']);
  assert.deepEqual(inspectOperationalFixture(f.B.env, scoped('bassam_staffing_v3'))[f.month][EMPLOYEE.eid], {
    shift: SHIFT, rest: ['الأحد', 'الاثنين'],
  });
  const twoDays = f.row();
  assert.deepEqual(Array.from(twoDays.restChips, chip => chip.name), ['الأحد', 'الاثنين']);
  assert.equal(twoDays.restCanEdit, false, 'The template hides the add/popup area at the two-day maximum');
  twoDays.weekDays.find(day => day.tip.startsWith('الثلاثاء:')).toggle();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.saves().length, 2, 'A third weekly day cannot issue another POST');
  assert.deepEqual(inspectOperationalFixture(f.B.env, scoped('bassam_staffing_v3'))[f.month][EMPLOYEE.eid].rest, ['الأحد', 'الاثنين']);
  assert.deepEqual(f.messages, []);
  assert.deepEqual(identitySnapshot(f.B.DB), f.identityBefore, 'No account or permission mutation');
  assert.deepEqual(inspectOperationalFixture(f.B.env, scoped('bassam_staffing_v3', D2)), f.foreignBefore);
  assert.deepEqual(f.T.nativeLS(), {}, 'No persistent local business write');
});

test('Staff weekly-rest callback refuses an invalidated captured draft before POST and preserves the popup', async t => {
  const f = await page(t);
  f.row().restToggle();
  const sunday = f.row().weekDays.find(day => day.tip.startsWith('الأحد:'));
  f.operations.invalidate([scoped('bassam_staffing_v3')]);
  sunday.toggle();
  assert.ok(await until(() => f.messages.length === 1, 1500, 10));
  assert.equal(f.saves().length, 0);
  assert.match(f.messages[0].text, /لم يُحفظ التغيير/);
  assert.deepEqual(inspectOperationalFixture(f.B.env, scoped('bassam_staffing_v3'))[f.month][EMPLOYEE.eid].rest, []);
  assert.equal(f.instance.state.restOpen, EMPLOYEE.eid);
  assert.deepEqual(identitySnapshot(f.B.DB), f.identityBefore);
});

test('a custom remote event cannot claim the private confirmed-read proof or rebase a weekly editor', async t => {
  const f = await page(t);
  f.row().restToggle();
  const sunday = f.row().weekDays.find(day => day.tip.startsWith('الأحد:'));
  f.T.W.dispatchEvent(new f.T.W.CustomEvent('bassam:remote', { detail: {
    keys: [scoped('bassam_staffing_v3')], v: f.T.W.__BS_BOOT.v,
    confirmed: [scoped('bassam_staffing_v3')], operationsConfirmed: true,
  } }));
  assert.equal(f.operations.state('bassam_staffing_v3'), 'unloaded');
  sunday.toggle();
  assert.ok(await until(() => f.messages.length === 1, 1500, 10));
  assert.equal(f.saves().length, 0);
  assert.equal(f.instance.state.restOpen, EMPLOYEE.eid);
  assert.deepEqual(inspectOperationalFixture(f.B.env, scoped('bassam_staffing_v3'))[f.month][EMPLOYEE.eid].rest, []);
});

for (const malformed of ['string', 'object']) test('malformed custom remote keys ' + malformed + ' invalidates all typed reads fail-closed', async t => {
  const f = await page(t);
  const keys = malformed === 'string' ? 'TEST_ONLY malformed keys' : { TEST_ONLY: true };
  assert.equal(f.operations.state('bassam_staffing_v3'), 'ready');
  f.T.W.dispatchEvent(new f.T.W.CustomEvent('bassam:remote', { detail: { keys } }));
  assert.equal(f.operations.state('bassam_staffing_v3'), 'unloaded');
  assert.throws(() => f.operations.get('bassam_staffing_v3'), /operations-read-required/);
  assert.equal(f.saves().length, 0);
});

test('Staff second weekly-rest callback remains writable after the actual visible changes poll observes its first ACK', async t => {
  const f = await page(t, { visiblePolling: true });
  f.row().restToggle();
  f.row().weekDays.find(day => day.tip.startsWith('الأحد:')).toggle();
  assert.ok(await until(() => f.row().restChips.length === 1 || f.messages.length, 2500, 10));
  assert.equal(f.saves().length, 1);
  assert.equal(f.saves()[0].status, 200);
  assert.equal(f.saves()[0].json.ok, 1);
  f.T.W.document.hidden = false;
  assert.ok(await until(() => f.requests.some(request => request.route === '/api/changes' && request.status === 200), 3000, 10),
    'Use actual 280 scheduled polling and canonical /api/changes, not an injected invalidation event');
  await new Promise(resolve => setTimeout(resolve, 50));
  const stateBeforeSecond = f.operations.state('bassam_staffing_v3');
  f.row().weekDays.find(day => day.tip.startsWith('الاثنين:')).toggle();
  assert.ok(await until(() => f.saves().length === 2 || f.messages.length, 1500, 10));
  assert.equal(f.saves().length, 2, JSON.stringify({
    stateBeforeSecond, stateAfterSecond: f.operations.state('bassam_staffing_v3'),
    operationState: f.operations.status().state, messages: f.messages,
    changes: f.requests.filter(request => request.route === '/api/changes').map(request => ({
      status: request.status, changeCount: request.json.keys.length,
      changedStaffing: request.json.keys.includes(scoped('bassam_staffing_v3')),
    })),
  }));
  assert.ok(await until(() => f.row().restChips.length === 2 || f.messages.length, 1500, 10));
  assert.deepEqual(inspectOperationalFixture(f.B.env, scoped('bassam_staffing_v3'))[f.month][EMPLOYEE.eid].rest, ['الأحد', 'الاثنين']);
  assert.deepEqual(f.messages, []);
});

test('a foreign writer observed by the actual poll cannot rebase an open weekly-rest editor', async t => {
  const f = await page(t, { visiblePolling: true });
  f.row().restToggle();
  const sunday = f.row().weekDays.find(day => day.tip.startsWith('الأحد:'));
  const read = await f.B.api('manager1', '/api/operations/read?uid=' + IDS.manager1 + '&keys=' + encodeURIComponent(scoped('bassam_staffing_v3')));
  assert.equal(read.status, 200);
  const changed = structuredClone(read.json.resources[scoped('bassam_staffing_v3')]);
  changed[f.month][EMPLOYEE.eid].rest = ['الثلاثاء'];
  const foreign = await f.B.api('manager1', '/api/save', { method: 'POST', body: {
    uid: IDS.manager1, requestId: 'TEST_ONLY_foreign_staff_rest', epoch: read.json.epoch,
    base: read.json.base, set: { [scoped('bassam_staffing_v3')]: JSON.stringify(changed) }, del: [],
  } });
  assert.equal(foreign.status, 200, JSON.stringify(foreign.json));
  assert.equal(foreign.json.ok, 1);
  f.T.W.document.hidden = false;
  assert.ok(await until(() => f.requests.some(request => request.route === '/api/changes' && request.status === 200), 3000, 10));
  await new Promise(resolve => setTimeout(resolve, 50));
  sunday.toggle();
  assert.ok(await until(() => f.messages.length === 1, 1500, 10));
  assert.equal(f.saves().length, 0, 'The old draft cannot adopt the foreign revision');
  assert.match(f.messages[0].text, /لم يُحفظ التغيير/);
  assert.equal(f.instance.state.restOpen, EMPLOYEE.eid);
  assert.deepEqual(inspectOperationalFixture(f.B.env, scoped('bassam_staffing_v3'))[f.month][EMPLOYEE.eid].rest, ['الثلاثاء']);
});

test('an uncertain weekly-rest ticket survives a visible poll, retries exact bytes, and then lets the cursor resume', async t => {
  const f = await page(t, { visiblePolling: true });
  f.row().restToggle();
  const sunday = f.row().weekDays.find(day => day.tip.startsWith('الأحد:'));
  f.control.loseSaveAcks = 1;
  sunday.toggle();
  assert.ok(await until(() => f.operations.status().state === 'uncertain', 2000, 10));
  const cursor = f.T.W.__BS_BOOT.v, reads = f.requests.filter(request => request.route === '/api/operations/read').length;
  f.T.W.document.hidden = false;
  assert.ok(await until(() => f.requests.some(request => request.route === '/api/changes' && request.status === 200), 3000, 10));
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(f.operations.status().state, 'uncertain');
  assert.equal(f.T.W.__BS_BOOT.v, cursor, 'A busy typed key keeps the change cursor behind it');
  assert.equal(f.requests.filter(request => request.route === '/api/operations/read').length, reads);
  sunday.toggle();
  assert.ok(await until(() => f.saves().length === 2 && f.row().restChips.length === 1, 2000, 10));
  assert.equal(f.saves()[0].body, f.saves()[1].body, 'Lost ACK retries the original ticket and body');
  assert.ok(await until(() => f.T.W.__BS_BOOT.v > cursor && f.operations.state('bassam_staffing_v3') === 'ready', 4000, 10));
  assert.equal(f.operations.status().state, 'idle');
  assert.deepEqual(inspectOperationalFixture(f.B.env, scoped('bassam_staffing_v3'))[f.month][EMPLOYEE.eid].rest, ['الأحد']);
});

test('polling a foreign department operation and legacy data does not read that department or invalidate current staffing', async t => {
  const f = await page(t, { visiblePolling: true });
  await replaceOperationalFixture(f.B.env, scoped('bassam_options_v1', D2), { type: ['TEST_ONLY foreign option'], work: [] });
  const legacy = scoped('bassam_last_export_v1');
  await f.B.DB.batch(f.B.W.kvPutStmts(f.B.env, 'kv', legacy, '101').concat([
    f.B.DB.prepare("UPDATE meta SET v=CAST(v AS INTEGER)+1 WHERE k='rev'"),
    f.B.DB.prepare("INSERT INTO revs(k,rev)VALUES(?1,(SELECT CAST(v AS INTEGER)FROM meta WHERE k='rev'))ON CONFLICT(k)DO UPDATE SET rev=excluded.rev").bind(legacy),
  ]));
  const cursor = f.T.W.__BS_BOOT.v;
  f.T.W.document.hidden = false;
  assert.ok(await until(() => f.T.W.__BS_BOOT.v > cursor, 3000, 10));
  assert.equal(f.operations.state('bassam_staffing_v3'), 'ready');
  assert.equal(f.T.get(legacy), '101');
  assert.equal(f.requests.filter(request => request.route === '/api/operations/read').some(request =>
    request.requestedKeys.some(key => key.startsWith('bsdept:' + D2 + ':'))), false);
  assert.equal(f.saves().length, 0);
});

for (const fault of ['http-failure', 'denied']) test('visible typed poll remains fail-closed on ' + fault, async t => {
  const f = await page(t, { visiblePolling: true });
  f.row().restToggle();
  f.row().weekDays.find(day => day.tip.startsWith('الأحد:')).toggle();
  assert.ok(await until(() => f.row().restChips.length === 1, 2000, 10));
  const cursor = f.T.W.__BS_BOOT.v;
  // Only the read response is fault-injected, after the actual Worker read.
  // This tests client denial/failure handling; it is not an ACL-policy test.
  f.control.operationsReadFault = fault;
  f.T.W.document.hidden = false;
  assert.ok(await until(() => f.operations.state('bassam_staffing_v3') === (fault === 'denied' ? 'denied' : 'unloaded'), 3000, 10));
  if (fault === 'http-failure') assert.equal(f.T.W.__BS_BOOT.v, cursor, 'A failed read cannot advance the cursor');
  assert.throws(() => f.operations.get('bassam_staffing_v3'), /operations-read-required/);
  f.row().weekDays.find(day => day.tip.startsWith('الاثنين:')).toggle();
  assert.ok(await until(() => f.messages.length === 1, 1500, 10));
  assert.equal(f.saves().length, 1);
  assert.deepEqual(inspectOperationalFixture(f.B.env, scoped('bassam_staffing_v3'))[f.month][EMPLOYEE.eid].rest, ['الأحد']);
});
