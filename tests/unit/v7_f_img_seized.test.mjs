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
  B.DB.exec("UPDATE imgown SET ts = ts - " + 29 * 864e5 + " WHERE img = '" + image + "'"); B.DB.exec("DELETE FROM guard WHERE gk = 'rl:img-sweep'");
  await createWithPhoto(C, 'szp_testonly_v7f2', 'TEST_ONLY_V7F_second');
  assert.deepEqual(own(B, image), { st: 'orphan', k: '', dept: D1 }, 'day 29: kept');
  B.DB.exec("UPDATE imgown SET ts = ts - " + 2 * 864e5 + " WHERE img = '" + image + "'"); B.DB.exec("DELETE FROM guard WHERE gk = 'rl:img-sweep'");   /* and the 10 minutes between two passes go by */
  await createWithPhoto(C, 'szp_testonly_v7f3', 'TEST_ONLY_V7F_third');
  assert.equal(own(B, image), null, 'day 31: owner row gone · ' + JSON.stringify(C.errors).slice(-300)); assert.equal(body(B, image), 0, 'body row gone'); assert.equal(B.objects.has('img/' + image), false, 'R2 object gone');
  /* what the browser gets for the swept image through the actual image transport (360): no bytes ⇒ the page shows no photo; the named reason is 404 «غير موجودة» */
  const F = mount(t, B);   /* a fresh page: the first one still holds the bytes it uploaded itself in page memory */
  assert.equal(await F.KIVO.BassamIDB.get(image), null);
  const info = await F.KIVO.BassamIDB.getInfo(image); assert.equal(info.ok, false); assert.equal(info.status, 404);
  assert.equal(await F.KIVO.BassamIDB.get('szp_testonly_v7f3'), PNG);
  assert.equal(own(B, 'szp_testonly_v7f3').st, 'bound', 'the write that triggered the sweep kept its own photo'); assert.equal(B.objects.get('img/szp_testonly_v7f3'), PNG);
});

/* ── the independent review ──────────────────────────────────────────────────────────────────────────────────────────────────── */
const sweepDue = (B) => B.DB.exec("DELETE FROM guard WHERE gk = 'rl:img-sweep'");
const agePhoto = (B, id, days) => { B.DB.exec("UPDATE imgown SET ts = ts - " + days * 864e5 + " WHERE img = '" + id + "'"); sweepDue(B); };

/* CLAIM TTL — owner rule «إن وُجدت أي شاشة تُبقي صورة مرفوعة في مسودة قبل الحفظ: مهلة غير المربوطة تصير 30 يوماً لا 7».
   The seized draft is such a screen: _szConfirmPhotos uploads the photo and marks it confirmed BEFORE the report is sent; if the report is then not
   saved (a conflict, a refusal, a lost connection) the draft stays — with its confirmed photo — for as long as the window lives (business-cloud
   _businessSessions), and the retry does not upload again. RUN here: the actual seized module and 360 transport against the worker. */
test('claim delay · a seized draft whose photo was uploaded but whose report was not saved: 8 and 29 days later the photo is still there and the retried save binds it', async (t) => {
  const B = await setup(t), image = 'szp_testonly_draft', key = B.W.szKey(D1);
  await install(B, D1, 'V7FD');
  const C = mount(t, B); await C.reads();
  /* the draft's photo reaches the server exactly as _szConfirmPhotos sends it; the report does not follow */
  assert.equal(await C.KIVO.BassamIDB.set(image, PNG), true);
  assert.deepEqual(own(B, image), { st: 'claim', k: '', dept: own(B, image).dept }, 'an unbound upload'); assert.equal(B.objects.get('img/' + image), PNG);
  for (const [days, n] of [[8, 'a'], [21, 'b']]) {
    agePhoto(B, image, days);
    await createWithPhoto(C, 'szp_testonly_draft' + n, 'TEST_ONLY_V7FD_' + n);   /* other work goes on: an accepted write, a pass of the sweep */
    assert.equal(own(B, 'szp_testonly_draft' + n).st, 'bound', JSON.stringify(C.errors).slice(-300));
    assert.equal((own(B, image) || {}).st, 'claim', 'day ' + (days === 8 ? 8 : 29) + ': the draft\'s photo is kept'); assert.equal(B.objects.get('img/' + image), PNG);
  }
  C.errors.length = 0;
  await createWithPhoto(C, image, 'TEST_ONLY_V7FD_retry', true);              /* the user returns to the draft: confirmed ⇒ no second upload */
  assert.deepEqual(own(B, image), { st: 'bound', k: key, dept: D1 }, 'the retried report binds the photo it was drafted with · ' + JSON.stringify(C.errors).slice(0, 400));
  assert.equal(B.objects.get('img/' + image), PNG); assert.deepEqual(refs(B, image), [key]);
  /* and an upload nobody comes back to goes after 30 days */
  const never = 'szp_testonly_never'; assert.equal(await C.KIVO.BassamIDB.set(never, PNG), true); agePhoto(B, never, 31);
  await createWithPhoto(C, 'szp_testonly_draftc', 'TEST_ONLY_V7FD_c');
  assert.equal(own(B, never), null, 'day 31: swept'); assert.equal(B.objects.has('img/' + never), false);
});

/* finding 4 — records stored OUTSIDE kv. The sweep's proof reads them directly: a seized photo row (seized_item_photos) and an award record's picture /
   signature columns (award_records) protect their image even when the bookkeeping (imgown/imgref) is stale — «a candidate that cannot be PROVEN
   unreferenced is not deleted». */
test('finding 4 · a photo a live seized report shows, and a picture an award record shows, survive the sweep even with stale bookkeeping (no imgref, owner row says orphan)', async (t) => {
  const B = await setup(t), photo = 'szp_testonly_stale', pic = 'img_testonly_awpic';
  await install(B, D1, 'V7FS');
  const C = mount(t, B); await C.reads();
  await createWithPhoto(C, photo, 'TEST_ONLY_V7FS_new');
  assert.equal(own(B, photo).st, 'bound', JSON.stringify(C.errors).slice(0, 300));
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM seized_item_photos WHERE image_id=?1', photo)[0].n, 1, 'the report shows the photo');
  /* an award record whose picture column is an image id (award saves keep no imgref) */
  assert.equal(await C.KIVO.BassamIDB.set(pic, PNG), true);
  const cols = B.DB.q("PRAGMA table_info('award_records')"), names = [], vals = [];
  for (const c of cols) { const v = c.name === 'department_id' ? D1 : c.name === 'record_id' ? 'TEST_ONLY_v7f_aw' : c.name === 'picture' ? pic : c.name === 'sequence' ? 900001 : (c.notnull && c.dflt_value == null) ? (/INT|REAL/i.test(c.type) ? 0 : '') : undefined;
    if (v !== undefined) { names.push(c.name); vals.push(v); } }
  B.DB.db.prepare('INSERT INTO award_records (' + names.join(',') + ') VALUES (' + names.map(() => '?').join(',') + ')').run(...vals);
  /* the bookkeeping goes stale: what a truncated index or an older tool leaves */
  B.DB.exec("DELETE FROM imgref WHERE img IN ('" + photo + "','" + pic + "')");
  B.DB.exec("UPDATE imgown SET st = 'orphan', k = '' WHERE img = '" + photo + "'");
  const control = 'img_testonly_awctl'; assert.equal(await C.KIVO.BassamIDB.set(control, PNG), true);
  agePhoto(B, photo, 31); agePhoto(B, pic, 31); agePhoto(B, control, 31);
  /* a pass of the sweep that no seized save precedes (a seized save of the unit would itself re-index the unit's photos): the admin's overview */
  const ov = await B.api('super', '/api/overview?' + new URLSearchParams({ uid: IDS.super })); assert.equal(ov.status, 200, JSON.stringify(ov.json).slice(0, 200));
  assert.equal(own(B, control), null, 'the pass ran: the unreferenced control upload of the same age is swept'); assert.equal(B.objects.has('img/' + control), false);
  assert.equal(B.objects.get('img/' + photo), PNG, 'the seized photo\'s bytes are intact'); assert.ok(body(B, photo) > 0); assert.equal(own(B, photo).st, 'amb', 'referenced orphan ⇒ the platform admin\'s, not deleted');
  assert.equal(B.objects.get('img/' + pic), PNG, 'the award picture\'s bytes are intact'); assert.ok(body(B, pic) > 0); assert.equal(own(B, pic).st, 'claim');
});
