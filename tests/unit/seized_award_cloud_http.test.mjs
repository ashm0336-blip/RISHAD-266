/* Actual lazy-module source + actual 360 + canonical HTTP Worker + SQLite.
   Synthetic identities and an in-memory image object fixture only; no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { world, D1, D2, IDS, EKEYS, identitySnapshot, awardDocs, seizedDocs, clone } from './business_atomic_fx.mjs';
import { browser, ROOT } from './business_cloud_ui_fx.mjs';
import { PNG } from './tasks_fx.mjs';
import { candidateWorker } from './irshad_domain_fx.mjs';

async function setup(t) {
  const B = await world(); t.after(() => B.DB.db.close());
  const perms = clone(B.keys.bassam_perms_v1);
  Object.values(perms.caps).forEach(caps => caps.push('seized', 'award'));
  Object.assign(perms.emps[D1][EKEYS.employee1], { 'seized/records': ['view', 'add', 'edit', 'del'], 'seized/dash': ['view'],
    'award/new': ['view', 'add'], 'award/res': ['view', 'edit', 'approve', 'del'], 'award/doc': ['view', 'add', 'edit', 'del'] });
  await B.put('bassam_perms_v1', perms, true);
  const initial = await B.api('super', '/api/seized?' + new URLSearchParams({ uid: IDS.super, dept: D1, view: 'calendar' }));
  assert.equal(initial.status, 200, JSON.stringify(initial.json));
  return { ...B, clock: initial.json.clock };
}

function mount(t, B, module, { who = 'super', loseCreate = false, images = false } = {}) {
  const effects = [], errors = [], objects = new Map(); let lose = loseCreate;
  if (images) B.env.IMG_R2 = { async put(key, value) { effects.push(['object-put', key]); objects.set(key, value); }, async get(key) {
    return objects.has(key) ? { body: objects.get(key), text: async () => String(objects.get(key)) } : null;
  }, async delete() { throw Error('No object body deletion in this test'); } };
  const C = browser(module, async (url, options) => {
    const headers = new Headers(options.headers); headers.set('Cookie', 'bs_tok=TEST_ONLY_session_' + who);
    if (options.method && options.method !== 'GET') headers.set('Origin', 'http://x');
    const response = await B.W.default.fetch(new Request('http://x' + url, { ...options, headers }), B.env);
    if (!response.ok) errors.push(await response.clone().json());
    effects.push([options.method || 'GET', url, response.status]);
    if (lose && options.method === 'POST' && JSON.parse(options.body).op === 'create' && response.ok) { lose = false; throw Error('TEST_ONLY lost response after commit'); }
    return response;
  }, B.clock); t.after(C.cleanup);
  C.dept(D1); C.user(IDS[who]); C.W.__BS_BOOT.uid = IDS[who];
  C.KIVO.BassamAuth.user = () => B.users.find(user => user.id === IDS[who]);
  C.KIVO.__BS_SRV.askReason = (_, __, done) => done('TEST_ONLY explicit reviewed reason');
  C.page.awEmpList = () => B.keys['bsdept:' + D1 + ':bassam_employees_v1'];
  // Shift configuration and employee identities remain external cloud-seeded
  // references; the module's business records/catalogs never use this facade.
  C.page.loadShiftOptsIr = () => B.keys['bsdept:' + D1 + ':bassam_shift_options_v1'] || [];
  C.page._bcEnsure = () => {}; C.page._szEnsureRetro = () => {};
  C.W.indexedDB = { open() { C.storage.push(['indexedDB']); throw Error('No device database'); } };
  if (images) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/360-bassam-idb.js'), 'utf8'), C.W);
  async function read(view, query = {}) {
    const result = await C.page._bcRead(view, query); assert.equal(result.ok, 1, JSON.stringify(result)); C.seed(view, result.data); return result.data;
  }
  return { ...C, effects, errors, objects, read, lost: () => !lose };
}

async function seizedReads(C, clock) {
  for (const view of ['catalogs', 'calendar', 'context', 'records']) await C.read(view, ['calendar', 'records', 'context'].includes(view) ? { year: clock.y, month: clock.m, day: clock.d, limit: 10 } : {});
}

test('canonical Seized HTTP preserves one image/receipt/audit after lost ACK and exports every filtered row while legacy history keeps its raw item id', async t => {
  const B = await setup(t), data = seizedDocs('HTTP');
  const old = data.reports.reports[0]; Object.assign(old, { y: B.clock.y, m: B.clock.m, d: B.clock.d, actorKey: EKEYS.employee1 }); old.items[0].id = '23';
  data.actions.push({ k: 'sec', name: 'TEST_ONLY security', color: '#000' });
  data.reports.reports = Array.from({ length: 205 }, (_, i) => ({ ...clone(old), id: 'TEST_ONLY_seed_' + i, ts: i + 1 }));
  await B.install('seized', D1, data);
  const protectedBefore = identitySnapshot(B.DB), C = mount(t, B, 'seized', { loseCreate: true, images: true });
  await seizedReads(C, B.clock);
  const image = 'szp_testonly_http', draft = { ...C.page.emptyDraft(), no: 'TEST_ONLY_HTTP_new', loc: 'TEST_ONLY location', items: [{ id: 23, n: 51000, val: 0, act: 'sec', kind: '', kindTxt: '', photos: [image] }] };
  C.page.state.irDraft = draft; C.page._szUploads = new Map([[image, { url: PNG, confirmed: false }]]);
  await C.page._recordsCalVals().irSaveReport();
  if (!C.lost()) await C.page._recordsCalVals().irSaveReport(); // explicit reason retry when the existing policy asks for one
  assert.equal(C.lost(), true, C.page.state.irSaveErrMsg); assert.equal(C.page.state.irDraft.items.length, 1);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM seized_reports WHERE department_id=?', D1)[0].n, 206);
  const snapshot = () => ({ aud: clone(B.DB.q('SELECT * FROM aud ORDER BY cid')), requests: clone(B.DB.q('SELECT * FROM seized_requests')),
    refs: clone(B.DB.q('SELECT * FROM imgref WHERE img=?', image)), own: clone(B.DB.q('SELECT * FROM imgown WHERE img=?', image)),
    notifications: clone(B.DB.q('SELECT * FROM notification_messages ORDER BY id')) });
  const beforeRetry = snapshot(); assert.equal(beforeRetry.requests.length, 1); assert.equal(beforeRetry.refs.length, 1); assert.ok(beforeRetry.notifications.length > 0);
  const beforeCalls = C.calls.length; C.W.dispatchEvent({ type: 'online' }); await new Promise(resolve => setTimeout(resolve, 3)); assert.equal(C.calls.length, beforeCalls);
  await C.page._recordsCalVals().irSaveReport();
  const creates = C.calls.filter(call => call.options.method === 'POST' && JSON.parse(call.options.body).op === 'create');
  assert.ok(creates.length >= 2); assert.equal(creates.at(-1).options.body, creates.at(-2).options.body);
  assert.equal(C.page.state.irDraft.items.length, 0); assert.deepEqual(snapshot(), beforeRetry);
  assert.equal(C.effects.filter(e => e[0] === 'object-put').length, 1); assert.equal(C.calls.filter(call => call.options.method === 'PUT').length, 1);
  await seizedReads(C, B.clock);
  const collected = await C.page._bcCollect({ year: B.clock.y, month: B.clock.m, day: B.clock.d }); assert.equal(collected.ok, 1, JSON.stringify(collected)); assert.equal(collected.data.rows.length, 206);
  let downloaded; C.KIVO.BassamXLSX = { download(rows) { downloaded = rows; } };
  await C.page._recordsCalVals().irLgExportCsv(); assert.equal(downloaded.length, 207);
  const report = collected.data.rows.find(row => row.id === 'TEST_ONLY_seed_0'); C.seed('records', { ...C.page._bcData('records'), rows: [report] });
  const menu = C.page._recordsCalVals().irLedgerRows[0];
  const action = menu.rmItems.find(item => /تعديل المحضر/.test(item.name)); assert.ok(action); action.run();
  assert.equal(C.page.state.irEditId, report.id); assert.equal(C.page.state.irDraft.item, '23');
  C.page.state.irDraft.note = 'TEST_ONLY edited'; const history = clone(report.items[0].hist);
  assert.equal(await C.page.szSaveRec(C.page.state.irDraft), true, C.page.state.irSaveErrMsg);
  const reread = await C.page._bcCollect({ year: B.clock.y, month: B.clock.m, day: B.clock.d }); assert.equal(reread.ok, 1, JSON.stringify(reread));
  const actual = reread.data.rows.find(row => row.id === report.id); assert.equal(actual.note, 'TEST_ONLY edited'); assert.equal(actual.items[0].id, '23'); assert.deepEqual(actual.items[0].hist, history);
  const dashboard = await C.read('dashboard', { mode: 'month', year: B.clock.y, month: B.clock.m, heatYear: B.clock.y, bucket: 'day' });
  assert.equal(dashboard.dashboard.totals.reports, 206); Object.assign(C.page.state, { irDashYear: B.clock.y, irDashMonth: String(B.clock.m) }); assert.ok(C.page._dashVals().irDashHeroNum);
  assert.equal((await B.api('noView', '/api/seized?' + new URLSearchParams({ uid: IDS.noView, dept: D1, view: 'records' }))).status, 403);
  assert.deepEqual(identitySnapshot(B.DB), protectedBefore); assert.equal(B.DB.q('SELECT COUNT(*) n FROM seized_reports WHERE department_id=?', D2)[0].n, 0);
  assert.equal(B.DB.q("SELECT COUNT(*) n FROM kv WHERE k GLOB '*bassam_seized*'")[0].n, 0); assert.deepEqual(B.DB.q('PRAGMA foreign_key_check'), []); assert.deepEqual(C.storage, []);
});

test('canonical Award HTTP opens a missing-id legacy detail, preserves existing approval invariants, deletes by transport identity and isolates department reference edits', async t => {
  const B = await setup(t), data = awardDocs('HTTP'), legacy = { ekey: EKEYS.employee1, name: 'TEST_ONLY legacy', cat: 'emp', hij: '1448-5-19', st: 'قيد التحكيم', score: 85, ok: true, ans: [true, null], scores: [[], [1]], pic: PNG };
  data.records.recs.unshift(legacy); await B.install('awards', D1, data); await B.install('awards', '', { docsV2: awardDocs('GLOBAL').docsV2 });
  const protectedBefore = identitySnapshot(B.DB), C = mount(t, B, 'award', { who: 'manager1' });
  const listed = await C.read('records', { limit: 10 }), row = listed.recs.find(row => row.recordKey && row.id === row.recordKey); assert.ok(row);
  const detail = await C.read('record', { id: row.recordKey }); assert.equal(Object.hasOwn(detail.record, 'id'), false); assert.equal(detail.record.pic, PNG);
  const policy = await candidateWorker(['canWrite']), actor = await policy.actorOf(B.env, IDS.manager1), before = B.W.awInflate(await B.W.awExportDomain(B.env, D1)).records,
    after = clone(before); after.recs.find(record => record.name === legacy.name).st = 'معتمد';
  const originalDecision = policy.canWrite(actor, B.W.awKey(D1), JSON.stringify(after), JSON.stringify(before), {});
  assert.equal(originalDecision.ok, false); assert.equal(originalDecision.why, 'approve', 'The pre-existing canWrite policy also rejects this legacy approval');
  await C.page.awSetStatus(row.recordKey, 'معتمد');
  assert.equal(C.errors.at(-1).denied.why, originalDecision.why); assert.equal(C.errors.at(-1).denied.invariant, 1); assert.equal((await C.read('record', { id: row.recordKey })).record.st, 'قيد التحكيم');
  assert.deepEqual(B.W.awInflate(await B.W.awExportDomain(B.env, D1)).records, before); assert.equal(C.page._bcTickets.size, 0);
  assert.equal(Object.hasOwn(B.W.awInflate(await B.W.awExportDomain(B.env, D1)).records.recs.find(record => record.name === legacy.name), 'id'), false);
  C.page.state.awArm = { id: row.recordKey, ts: Date.now() }; await C.page.awDel(row.recordKey, 'TEST_ONLY legacy');
  if (C.page._bcReasons?.size) { C.page.state.awArm = { id: row.recordKey, ts: Date.now() }; await C.page.awDel(row.recordKey, 'TEST_ONLY legacy'); }
  assert.equal((await C.read('records', { limit: 10 })).total, 1);
  const owner = mount(t, B, 'award'), refs = await owner.read('references'); assert.equal(refs.references.document.A.title, 'AHTTP');
  const next = clone(refs.references.document); next.A.secs[0].body = '<p>TEST_ONLY department edit</p>';
  assert.equal(await owner.page.awDocsPut(next), true); assert.equal((await owner.read('references')).references.document.A.secs[0].body, next.A.secs[0].body);
  const global = await B.api('super', '/api/award?' + new URLSearchParams({ uid: IDS.super, dept: D1, scope: 'global', view: 'references' })); assert.equal(global.status, 200); assert.equal(global.json.references.document.A.title, 'AGLOBAL');
  assert.equal((await B.api('noView', '/api/award?' + new URLSearchParams({ uid: IDS.noView, dept: D1, view: 'records' }))).status, 403);
  assert.deepEqual(identitySnapshot(B.DB), protectedBefore); assert.deepEqual(C.storage, []); assert.deepEqual(owner.storage, []); assert.deepEqual(B.DB.q('PRAGMA foreign_key_check'), []);
});

test('canonical Award HTTP create retains an unacknowledged wizard and retries its committed request without a duplicate nomination', async t => {
  const B = await setup(t), C = mount(t, B, 'award', { who: 'employee1', loseCreate: true });
  await C.read('records', { limit: 10 }); Object.assign(C.page.state, { ekey: EKEYS.employee1, cat: 'emp', comp: 'TEST_ONLY_001', fileOk: true, ans: C.page.QUESTIONS.map(() => true) });
  await C.page.awDoSave(); if (!C.lost()) await C.page.awDoSave(); assert.equal(C.lost(), true, String(C.notices));
  assert.equal(C.page.state.ekey, EKEYS.employee1); const rows = clone(B.DB.q('SELECT * FROM award_records')), aud = clone(B.DB.q('SELECT * FROM aud ORDER BY cid'));
  await C.page.awDoSave(); const creates = C.calls.filter(call => call.options.method === 'POST'); assert.equal(creates.at(-1).options.body, creates.at(-2).options.body);
  assert.equal(C.page.state.ekey, ''); assert.deepEqual(clone(B.DB.q('SELECT * FROM award_records')), rows); assert.deepEqual(clone(B.DB.q('SELECT * FROM aud ORDER BY cid')), aud);
  assert.equal(rows.length, 1); assert.equal(B.DB.q('SELECT COUNT(*) n FROM award_requests')[0].n, 1); assert.deepEqual(C.storage, []);
});
