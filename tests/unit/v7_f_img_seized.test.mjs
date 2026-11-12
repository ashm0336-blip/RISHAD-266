/* V7-F · owner decision 2 (iii) and decision 1 for the seized-item photo (szp_…): never run before.
   Actual seized module source + actual 360 image transport + the canonical HTTP worker + SQLite + an in-memory object store.
   removal of the seized report ⇒ the photo is an orphan of its unit ⇒ another unit cannot attach it ⇒ past the grace the sweep deletes rows and object. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { world, D1, D2, IDS, EKEYS, seizedDocs, clone } from './business_atomic_fx.mjs';
import { browser, ROOT } from './business_cloud_ui_fx.mjs';
import { PNG } from './tasks_fx.mjs';

async function setup(t) {
  const B = await world({ schema: 10 }); t.after(() => B.DB.db.close());
  const perms = clone(B.keys.bassam_perms_v1);
  Object.values(perms.caps).forEach((caps) => caps.push('seized', 'award'));
  Object.assign(perms.emps[D1][EKEYS.employee1], { 'seized/records': ['view', 'add', 'edit', 'del'], 'seized/dash': ['view'] });
  await B.put('bassam_perms_v1', perms, true);
  const initial = await B.api('super', '/api/seized?' + new URLSearchParams({ uid: IDS.super, dept: D1, view: 'calendar' }));
  assert.equal(initial.status, 200, JSON.stringify(initial.json));
  const objects = new Map();
  B.env.IMG_R2 = { async put(k, v) { objects.set(k, v); }, async get(k) { return objects.has(k) ? { body: objects.get(k), text: async () => String(objects.get(k)) } : null; }, async delete(k) { objects.delete(k); } };
  return { ...B, clock: initial.json.clock, objects };
}
function mount(t, B, { who = 'super', dept = D1 } = {}) {
  const errors = [];
  const C = browser('seized', async (url, options) => {
    const headers = new Headers(options.headers); headers.set('Cookie', 'bs_tok=TEST_ONLY_session_' + who);
    if (options.method && options.method !== 'GET') headers.set('Origin', 'http://x');
    const response = await B.W.default.fetch(new Request('http://x' + url, { ...options, headers }), B.env);
    if (!response.ok) errors.push({ url, status: response.status, body: await response.clone().json().catch(() => null) });
    return response;
  }, B.clock); t.after(C.cleanup);
  C.dept(dept); C.user(IDS[who]); C.W.__BS_BOOT.uid = IDS[who];
  C.KIVO.BassamAuth.user = () => B.users.find((user) => user.id === IDS[who]);
  C.KIVO.__BS_SRV.askReason = (_, __, done) => done('TEST_ONLY v7f reason');
  C.page.awEmpList = () => B.keys['bsdept:' + dept + ':bassam_employees_v1'];
  C.page.loadShiftOptsIr = () => B.keys['bsdept:' + dept + ':bassam_shift_options_v1'] || [];
  C.page._bcEnsure = () => {}; C.page._szEnsureRetro = () => {};
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/360-bassam-idb.js'), 'utf8'), C.W);
  const read = async (view, query = {}) => { const result = await C.page._bcRead(view, query); assert.equal(result.ok, 1, JSON.stringify(result)); C.seed(view, result.data); return result.data; };
  const reads = async () => { for (const view of ['catalogs', 'calendar', 'context', 'records']) await read(view, view === 'catalogs' ? {} : { year: B.clock.y, month: B.clock.m, day: B.clock.d, limit: 10 }); };
  return { ...C, errors, reads };
}
async function install(B, dept, tag) {
  const data = seizedDocs(tag), old = data.reports.reports[0];
  Object.assign(old, { y: B.clock.y, m: B.clock.m, d: B.clock.d }); old.items[0].id = '23';
  data.actions.push({ k: 'sec', name: 'TEST_ONLY security', color: '#000' });
  await B.install('seized', dept, data);
}
async function createWithPhoto(C, image, no, confirmed = false) {
  await C.reads();
  C.page.state.irDraft = { ...C.page.emptyDraft(), no, loc: 'TEST_ONLY location', items: [{ id: 23, n: 51000, val: 0, act: 'sec', kind: '', kindTxt: '', photos: [image] }] };
  C.page._szUploads = new Map([[image, { url: PNG, confirmed }]]);
  await C.page._recordsCalVals().irSaveReport();
  if (C.page.state.irDraft && C.page.state.irDraft.items && C.page.state.irDraft.items.length) await C.page._recordsCalVals().irSaveReport();   /* the explicit-reason retry, when the policy asks */
}
const own = (B, id) => clone(B.DB.q('SELECT st,k,dept FROM imgown WHERE img=?1', id))[0] || null;
const refs = (B, id) => B.DB.q('SELECT k FROM imgref WHERE img=?1', id).map((r) => r.k);
const body = (B, id) => B.DB.q('SELECT COUNT(*) n FROM imgs WHERE k=?1', id)[0].n;

test('seized photo: report removed ⇒ orphan of its unit ⇒ another unit cannot attach it ⇒ past 30 days the sweep deletes rows and object', async (t) => {
  const B = await setup(t), image = 'szp_testonly_v7f', key = B.W.szKey(D1);
  await install(B, D1, 'V7F');
  const C = mount(t, B); await C.reads();
  await createWithPhoto(C, image, 'TEST_ONLY_V7F_new');
  assert.deepEqual(own(B, image), { st: 'bound', k: key, dept: D1 }, 'the photo is bound to its unit\'s seized record · ' + JSON.stringify(C.errors).slice(0, 400));
  assert.equal(B.objects.get('img/' + image), PNG); assert.deepEqual(refs(B, image), [key]);
  /* the unit deletes the report */
  await C.reads();
  const rid = B.DB.q('SELECT report_id FROM seized_item_photos WHERE image_id=?1', image)[0].report_id;
  let del = await C.page._bcMutate('delete', { id: rid }, { stamp: C.page._bcStamp(C.page._bcData('records').base) });
  if (!del.ok) del = await C.page._bcMutate('delete', { id: rid }, { stamp: C.page._bcStamp(C.page._bcData('records').base) });   /* explicit-reason retry */
  assert.equal(del.ok, 1, JSON.stringify(del));
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM seized_item_photos WHERE image_id=?1', image)[0].n, 0, 'the report and its photo row are gone · ' + JSON.stringify(C.errors).slice(-400));
  assert.deepEqual(own(B, image), { st: 'orphan', k: '', dept: D1 }, 'the photo is now an orphan of its unit'); assert.deepEqual(refs(B, image), []);
  assert.equal(B.objects.get('img/' + image), PNG, 'bytes kept for the grace'); assert.ok(body(B, image) > 0);
  /* decision 1: another unit's seized record cannot take it */
  await install(B, D2, 'V7F2');
  const C2 = mount(t, B, { who: 'manager2', dept: D2 }); await C2.reads();
  const before = B.DB.q('SELECT COUNT(*) n FROM seized_reports WHERE department_id=?1', D2)[0].n;
  await createWithPhoto(C2, image, 'TEST_ONLY_V7F_adopt');   /* as the browser does it: the upload of an id that is not his is refused first — the unified answer */
  assert.ok(C2.errors.some((e) => /\/api\/img\//.test(e.url) && e.status === 403 && JSON.stringify(e.body) === '{"ok":0,"err":"forbidden"}'), 'upload refused · ' + JSON.stringify(C2.errors).slice(0, 400));
  C2.errors.length = 0;
  await createWithPhoto(C2, image, 'TEST_ONLY_V7F_adopt2', true);   /* a client that skips the upload and sends the id straight to the seized route */
  assert.ok(C2.errors.some((e) => /\/api\/seized\/act/.test(e.url) && e.status === 403 && e.body && e.body.err === 'seized-image-denied'), 'the seized route refuses it as a foreign image · ' + JSON.stringify(C2.errors).slice(0, 400));
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM seized_reports WHERE department_id=?1', D2)[0].n, before, 'the other unit\'s report with the orphan photo is not saved');
  assert.deepEqual(own(B, image), { st: 'orphan', k: '', dept: D1 }); assert.equal(B.objects.get('img/' + image), PNG);
  /* inside the grace nothing happens; past it the next accepted write sweeps it */
  B.DB.exec("UPDATE imgown SET ts = ts - " + 29 * 864e5 + " WHERE img = '" + image + "'");
  await createWithPhoto(C, 'szp_testonly_v7f2', 'TEST_ONLY_V7F_second');
  assert.deepEqual(own(B, image), { st: 'orphan', k: '', dept: D1 }, 'day 29: kept');
  B.DB.exec("UPDATE imgown SET ts = ts - " + 2 * 864e5 + " WHERE img = '" + image + "'");
  await createWithPhoto(C, 'szp_testonly_v7f3', 'TEST_ONLY_V7F_third');
  assert.equal(own(B, image), null, 'day 31: owner row gone · ' + JSON.stringify(C.errors).slice(-300)); assert.equal(body(B, image), 0, 'body row gone'); assert.equal(B.objects.has('img/' + image), false, 'R2 object gone');
  /* what the browser gets for the swept image through the actual image transport (360): no bytes ⇒ the page shows no photo; the named reason is 404 «غير موجودة» */
  const F = mount(t, B);   /* a fresh page: the first one still holds the bytes it uploaded itself in page memory */
  assert.equal(await F.KIVO.BassamIDB.get(image), null);
  const info = await F.KIVO.BassamIDB.getInfo(image); assert.equal(info.ok, false); assert.equal(info.status, 404);
  assert.equal(await F.KIVO.BassamIDB.get('szp_testonly_v7f3'), PNG);
  assert.equal(own(B, 'szp_testonly_v7f3').st, 'bound', 'the write that triggered the sweep kept its own photo'); assert.equal(B.objects.get('img/szp_testonly_v7f3'), PNG);
});
