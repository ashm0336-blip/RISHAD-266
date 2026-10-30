/* KIVO_265 · البند 18 من قائمة صفحة المهام — إثباتٌ بموقعٍ وختمٍ زمني على الصورة («ملفي ← التوثيق والتسليم»):
     (1) سطرا الختم نقيّان: هجري + ميلادي + الساعة بالرياض · الإحداثيات أو «بلا موقع» · اسمُ الموظف · عنوانُ المهمة
     (2) الختمُ يُرسم على اللوحة نفسِها قبل الترميز (شريطٌ سفلي + سطران من اليمين) — فالمرفوعُ يحمله مرئياً لا الواجهة
     (3) مسارُ الالتقاط كاملاً (FileReader ⇒ Image ⇒ canvas ⇒ ختم ⇒ JPEG) بموقعٍ مسموح — وبرفضه «بلا موقع» ولا يُمنع التوثيق
     (4) الخادمُ (بالوضعين): meta في جسم submit/doc ⇒ r21.meta بترتيب الصور · proof.meta في GET /api/me/tasks · الشكلُ الفاسد 400 bad-body at:meta ·
         حذفُ صورةٍ من المسودّة يُسقط وصفيّتَها · حفظُ المدير الخامّ لا يمسّها (tkKeepSelf) ولا يرفضه حارسُ 018 (taskOwnWhy)
   منطقُ الصفحة الحقيقي + 545 في vm على العامل الحقيقي (tests/unit/tasks_fx.mjs) كما profile_tasks_current265.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT } from './harness.mjs';
import { world, workerUnderTest, ME, KT, DAY, TAG, stored, rowsOf, putKV, HR, PNG } from './tasks_fx.mjs';

const WU = workerUnderTest();
const LOGIC = process.env.PROFILE_LOGIC || path.join(ROOT, 'src/modules/profile/logic.js');
const DM = ['0000000101', '70101'];
const NAME = TAG + ' موظف الختم';
/* لوحةٌ مزيّفة تسجّل ما رُسم عليها — toDataURL يعلن إن رُسم الختم (fillText) قبل الترميز */
function fakeCanvas() {
  const calls = [];
  const cv = { width: 0, height: 0, calls };
  const ctx = { fillStyle: '', font: '', textAlign: '', textBaseline: '', direction: '',
    save() { calls.push(['save']); }, restore() { calls.push(['restore']); },
    fillRect(x, y, w, h) { calls.push(['fillRect', x, y, w, h, this.fillStyle]); }, drawImage(im, x, y, w, h) { calls.push(['drawImage', w, h]); },
    fillText(t, x, y) { calls.push(['fillText', t, x, y, this.textAlign]); }, measureText(t) { return { width: 7 * String(t).length }; } };
  cv.getContext = () => ctx;
  cv.toDataURL = (mime, q) => 'data:image/jpeg;base64,' + (calls.some((c) => c[0] === 'fillText') ? 'STAMPED' : 'PLAIN') + '_q' + q;
  return cv;
}
function page(W, ck, o = {}) {
  const KIVO = {}, acts = [], canvases = [];
  const geo = o.geo;   /* {lat,lng,acc} ⇒ سُمح · 'deny' ⇒ رُفض · undefined ⇒ لا geolocation */
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, encodeURIComponent, decodeURIComponent,
    setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    document: { hidden: false, querySelector: () => null, createElement: (t) => { if (t !== 'canvas') return {}; const c = fakeCanvas(); canvases.push(c); return c; } },
    navigator: { userAgent: 'node', geolocation: geo === undefined ? null : { getCurrentPosition: (ok, bad) => (geo === 'deny' ? bad({ code: 1 }) : ok({ coords: { latitude: geo.lat, longitude: geo.lng, accuracy: geo.acc } })) } } };
  ctx.Image = class { set src(v) { this.width = 1200; this.height = 900; this.onload && this.onload(); } };
  ctx.FileReader = class { readAsDataURL() { this.result = 'data:image/jpeg;base64,xx'; this.onload && this.onload(); } };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.__BS_BOOT = { srv: 1, cf: 1 };
  ctx.CustomEvent = class { constructor(t, q) { this.type = t; this.detail = q && q.detail; } };
  ctx.addEventListener = () => {}; ctx.dispatchEvent = () => true;
  ctx.fetch = async (url, opt = {}) => { if (/\/api\/me\/tasks\/act$/.test(String(url)) && opt.body) acts.push(JSON.parse(opt.body)); const r = await W.C.req(url, { method: opt.method || 'GET', cookie: ck, headers: opt.headers, body: opt.body }); return { ok: r.status < 300, status: r.status, text: () => r.text(), json: () => r.json() }; };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/545-task-self.js'), 'utf8'), ctx);
  KIVO.BassamCount = (n, w) => n + ' ' + w;
  KIVO.BassamAuth = { user: () => ({ name: NAME, role: 'staff' }) };
  class DCLogic { constructor() { this.state = {}; } setState(p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); } }
  KIVO.BassamPageKit = { base: (Bc) => class extends Bc { bsOn() { return true; } bsToast(m) { (this.__toasts = this.__toasts || []).push(m); } bsAck() { return Promise.resolve(true); } MONTHS() { return '١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ١٠ ١١ ١٢'.split(' '); } } };
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(LOGIC, 'utf8') + '\n;globalThis.__C = Component;', ctx, { filename: 'profile/logic.js' });
  const c = new ctx.__C(); c.state = Object.assign({ pfPanel: '' }, c.state || {}); c._pfAlive = true;
  return { c, MT: KIVO.BassamMyTasks, acts, canvases };
}
const T = { y: +DAY.split('-')[0], m: +DAY.split('-')[1], d: +DAY.split('-')[2] };
const E = { isStaff: true, T, myKey: ME.eid, keyOfTok: (x) => x, myRec: { name: NAME } };
const Vf = (P) => P.c._tkVals({}, E, P.c.state);
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
const refOf = (P, id) => P.c._tkMine(E).find((x) => x.r.__x && String(x.r.__x.id) === String(id));
const srvRow = (W, id) => (rowsOf(stored(W.env, KT), ME.eid).find((x) => x.r[13] === id) || {}).r || [];
async function until(f, ms = 5000) { const t0 = Date.now(); for (;;) { let v = false; try { v = f(); } catch (e) { v = false; } if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 10)); } }
const mkTask = (W, ck, t, extra) => post(W, ck, '/api/tasks/create', Object.assign({ k: DAY, t: TAG + ' ' + t, s: Date.now() - 60e3, e: Date.now() + 2 * HR, asg: [ME.eid], rv: 'none' }, extra || {}));
function wipe(W, eid) { const S = stored(W.env, KT); for (const d in S) S[d] = S[d].filter((r) => !(Array.isArray(r) && r[14] === eid)); putKV(W.env, KT, S); }
async function raw(W, ck, mut) {
  const g = await get(W, ck, '/api/get?keys=' + encodeURIComponent(KT)), S = JSON.parse(g.j.keys[KT].v);
  mut(S); return post(W, ck, '/api/save', { set: { [KT]: JSON.stringify(S) }, base: { [KT]: g.j.keys[KT].rev } });
}
const GEO = { lat: 24.7136, lng: 46.6753, acc: 12 };

test('(1) سطرا الختم: هجري وميلادي وساعةُ الرياض · الإحداثياتُ بدقّتها أو «بلا موقع» · الاسمُ وعنوانُ المهمة', () => {
  const P = page({ C: { req: async () => ({ status: 500, text: async () => '', json: async () => null }) } }, '');
  const at = Date.UTC(2026, 9, 19, 11, 35);   /* 14:35 بالرياض */
  const L = P.c._tkStampLines(at, GEO, NAME, TAG + ' مهمة الختم');
  assert.equal(L.length, 2);
  assert.match(L[0], /^\d{1,2}\/\d{1,2}\/14\d\dهـ · 19\/10\/2026م · 14:35 · 24\.71360, 46\.67530 \(±12 م\)$/, L[0]);
  assert.equal(L[1], NAME + ' · ' + TAG + ' مهمة الختم');
  assert.match(P.c._tkStampLines(at, null, NAME, 'م')[0], / · بلا موقع$/);
  assert.equal(P.c._tkStampLines(at, null, '', '')[1], 'توثيق مهمة');
  assert.equal(P.c._tkStampLines(at, { lat: 'x' }, 'أ', 'ب')[0].endsWith('بلا موقع'), true, 'إحداثياتٌ غيرُ رقمية = بلا موقع');
});

test('(2) الرسمُ على اللوحة: شريطٌ سفليٌّ بعرض الصورة وسطران من اليمين — والنصُّ الطويل يُقصّ بعلامة', () => {
  const P = page({ C: { req: async () => ({ status: 500, text: async () => '', json: async () => null }) } }, '');
  const cv = fakeCanvas(); cv.width = 1600; cv.height = 1200;
  P.c._tkStampDraw(cv, ['سطر ١', 'سطر ٢']);
  const bar = cv.calls.find((c) => c[0] === 'fillRect'), txt = cv.calls.filter((c) => c[0] === 'fillText');
  assert.ok(bar, 'شريط'); assert.equal(bar[1], 0); assert.equal(bar[3], 1600, 'بعرض الصورة'); assert.equal(bar[2] + bar[4], 1200, 'ملتصقٌ بأسفلها'); assert.match(bar[5], /rgba/);
  assert.equal(txt.length, 2); assert.equal(txt[0][1], 'سطر ١'); assert.equal(txt[1][1], 'سطر ٢');
  assert.equal(txt[0][4], 'right', 'من اليمين'); assert.ok(txt[0][2] > 1500 && txt[0][3] > bar[2], 'داخل الشريط');
  assert.ok(txt[1][3] > txt[0][3], 'السطرُ الثاني تحت الأول');
  const cv2 = fakeCanvas(); cv2.width = 100; cv2.height = 100;
  P.c._tkStampDraw(cv2, ['نصٌّ طويلٌ جداً يتجاوز عرضَ الصورة الصغيرة بكثير']);
  const t2 = cv2.calls.find((c) => c[0] === 'fillText')[1];
  assert.ok(t2.endsWith('…') && t2.length < 30, 'قُصّ: ' + t2);
  assert.match(cv.toDataURL('image/jpeg', 0.82), /STAMPED/, 'المرمَّزُ بعد الرسم يحمل الختم');
});

test('(3) الالتقاط كاملاً: بموقعٍ مسموح ⇒ الصورةُ المرمَّزة مختومةٌ بالإحداثيات وtkMeta تحملها · برفضه ⇒ «بلا موقع» ولا يُمنع · وبلا geolocation كذلك · والحذفُ يُزيل وصفيّتَها', async () => {
  const noSrv = { C: { req: async () => ({ status: 500, text: async () => '', json: async () => null }) } };
  for (const [geo, want] of [[GEO, /24\.71360, 46\.67530/], ['deny', /بلا موقع/], [undefined, /بلا موقع/]]) {
    const P = page(noSrv, '', { geo });
    P.c.setState({ tkRef: null, tkImgs: [], tkMeta: [] });
    P.c._tkReadImg({ type: 'image/jpeg', name: 'a.jpg', size: 1000 });
    assert.ok(await until(() => (P.c.state.tkImgs || []).length === 1), 'صورةٌ واحدة جُهّزت (' + String(geo) + ')');
    const cv = P.canvases[0]; assert.ok(cv, 'لوحةٌ رُسم عليها');
    const txt = cv.calls.filter((c) => c[0] === 'fillText').map((c) => c[1]);
    assert.equal(txt.length, 2, 'سطرا الختم'); assert.match(txt[0], want, txt[0]); assert.match(txt[0], /هـ · \d\d\/\d\d\/20\d\dم · \d\d:\d\d/, 'التاريخان والساعة');
    assert.equal(txt[1], NAME, 'اسمُ الموظف (بلا مهمةٍ مفتوحة ⇒ بلا عنوان)');
    assert.match(P.c.state.tkImgs[0], /^data:image\/jpeg;base64,STAMPED/, 'المرمَّزُ بعد الختم — لا صورةٌ خام');
    const m = P.c.state.tkMeta[0]; assert.ok(m && m.at > 0, 'وقتُ الالتقاط');
    if (geo === GEO) { assert.equal(m.lat, 24.7136); assert.equal(m.lng, 46.6753); assert.equal(m.acc, 12); } else { assert.equal(m.lat, null); assert.equal(m.lng, null); }
    assert.equal(P.c.state.tkImgErr, '', 'لا خطأ: الموقعُ لا يمنع التوثيق');
    P.c.tkRmImg(0); assert.equal(P.c.state.tkImgs.length, 0); assert.equal(P.c.state.tkMeta.length, 0, 'الوصفيةُ تُحذف مع صورتها');
  }
  /* الموقعُ يُطلب مرةً واحدة لصورتين */
  let n = 0; const P2 = page(noSrv, '', { geo: GEO }); P2.c.setState({ tkRef: null, tkImgs: [], tkMeta: [] });
  const G = P2.c._tkGeo; P2.c._tkGeo = function () { n++; return G.call(this); };
  P2.c._tkReadImg({ type: 'image/jpeg', name: 'a.jpg', size: 1 }); P2.c._tkReadImg({ type: 'image/jpeg', name: 'b.jpg', size: 1 });
  assert.ok(await until(() => (P2.c.state.tkImgs || []).length === 2)); assert.equal(n, 2); assert.equal(P2.c._tkGeoC.v.lat, 24.7136, 'قيمةٌ واحدةٌ مذكورة');
});

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] (4) الخادم: meta مع submit ⇒ r21.meta بترتيب الصور · proof.meta في القراءة · فاسدٌ ⇒ 400 at:meta · حذفُ المسودّة يُسقطها · حفظُ المدير لا يمسّها', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
    wipe(W, ME.eid);
    const P = page(W, me.ck, { geo: GEO }); await P.MT.load(true);
    const c = await mkTask(W, dm.ck, 'مهمة الختم'); assert.equal(c.status, 200, JSON.stringify(c.j));
    const id = c.j.rows[0].id; await P.MT.load(true);
    let R = refOf(P, id); P.c.tkAccept(R.day, R.i); await until(() => srvRow(W, id)[11]);
    R = refOf(P, id); P.c.tkFinishOpen(R.day, R.i);
    assert.equal(P.c.state.tkMeta.length, 0, 'النافذةُ تبدأ بلا وصفية');
    /* صورتان بترتيبٍ معلوم (كما يملؤهما _tkReadImg) */
    const at1 = Date.now() - 5000, at2 = Date.now() - 1000;
    P.c.setState({ tkNote: TAG + ' تم', tkImgs: [PNG, PNG], tkMeta: [{ at: at1, lat: 24.7136, lng: 46.6753, acc: 12 }, { at: at2, lat: null, lng: null, acc: null }] });
    Vf(P).tkFinGo(); await until(() => srvRow(W, id)[3] === 'done' && !P.c.state.tkBusy);
    assert.equal(srvRow(W, id)[3], 'done');
    const sent = P.acts.find((b) => b.act === 'submit'); assert.ok(sent, 'جسمُ التسليم');
    assert.equal(sent.meta.length, 2); assert.equal(sent.meta[0].img, sent.imgs[0]); assert.equal(sent.meta[1].img, sent.imgs[1]); assert.equal(sent.meta[0].lat, 24.7136);
    const r = srvRow(W, id); assert.equal(r[21].imgs.length, 2);
    assert.deepEqual(r[21].meta, [{ img: r[21].imgs[0], at: at1, lat: 24.7136, lng: 46.6753, acc: 12 }, { img: r[21].imgs[1], at: at2, lat: null, lng: null, acc: null }], 'r21.meta بترتيب الصور');
    assert.equal(P.c.state.tkMeta.length, 0, 'تُمسح بعد التسليم');
    const g = await get(W, me.ck, '/api/me/tasks'); const row = g.j.rows.find((q) => String(q.id) === String(id));
    assert.deepEqual(row.proof.meta, r[21].meta, 'proof.meta للواجهة');
    /* حفظُ المدير الخامّ (تعديلُ العنوان) لا يمسّ الوصفية ولا يرفضه الحارس */
    const sv = await raw(W, dm.ck, (S) => { for (const d in S) S[d].forEach((q) => { if (q[13] === id) q[0] = TAG + ' مهمة الختم (معدَّلة)'; }); });
    assert.ok(sv.j && sv.j.revs && sv.j.revs[KT], 'حفظُ المدير يمرّ: ' + JSON.stringify(sv.j).slice(0, 200));
    assert.deepEqual(srvRow(W, id)[21].meta, r[21].meta, 'الوصفيةُ باقية');
    /* فاسد: خطُّ عرضٍ خارج المدى · عنصرٌ بلا at · أكثرُ من 4 */
    const c2 = await mkTask(W, dm.ck, 'ختم ٢'); const id2 = c2.j.rows[0].id;
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: DAY, id: id2, act: 'start' })).status, 200);
    const up = async (k) => { const u = await W.C.api('/api/img/' + k, { method: 'PUT', cookie: me.ck, body: PNG, headers: { 'Content-Type': 'text/plain' } }); assert.equal(u.status, 200); return k; };
    const A = await up('img_tskstamp_a1'), B = await up('img_tskstamp_b2');
    for (const bad of [[{ img: A, at: Date.now(), lat: 999, lng: 1 }], [{ img: A, lat: 1, lng: 1 }], [{ img: A, at: Date.now() }, { at: 1 }, { at: 1 }, { at: 1 }, { at: 1 }], 'x']) {
      const x = await post(W, me.ck, '/api/me/tasks/act', { k: DAY, id: id2, act: 'doc', imgs: [A], meta: bad });
      assert.equal(x.status, 400, JSON.stringify(bad)); assert.equal(x.j.err, 'bad-body'); assert.match(String(x.j.at), /meta/);
    }
    /* مسودّةٌ بصورتين ووصفيتهما ثم حذفُ الأولى ⇒ تبقى وصفيةُ الثانية وحدها؛ وصورةٌ ليست في الجسم لا تُقبل وصفيتُها */
    let x = await post(W, me.ck, '/api/me/tasks/act', { k: DAY, id: id2, act: 'doc', imgs: [A, B], meta: [{ img: A, at: at1, lat: 1.123456789, lng: 2, acc: 3.7 }, { img: B, at: at2 }, { img: 'img_tskghost_z9', at: at2 }].slice(0, 2).concat([]) });
    assert.equal(x.status, 200, JSON.stringify(x.j));
    assert.deepEqual(srvRow(W, id2)[21].meta, [{ img: A, at: at1, lat: 1.12346, lng: 2, acc: 4 }, { img: B, at: at2, lat: null, lng: null, acc: null }], 'تقريبُ الإحداثيات إلى 5 منازل والدقّةُ عدداً صحيحاً');
    x = await post(W, me.ck, '/api/me/tasks/act', { k: DAY, id: id2, act: 'doc', rm: [A], meta: [{ img: 'img_tskghost_z9', at: at2 }] });
    assert.equal(x.status, 200, JSON.stringify(x.j));
    assert.deepEqual(srvRow(W, id2)[21].meta, [{ img: B, at: at2, lat: null, lng: null, acc: null }], 'سقطت وصفيةُ المحذوفة ولم تدخل وصفيةُ صورةٍ ليست في الصفّ');
    x = await post(W, me.ck, '/api/me/tasks/act', { k: DAY, id: id2, act: 'doc', rm: [B] });
    assert.equal(x.status, 200); assert.equal(srvRow(W, id2)[21].meta, undefined, 'بلا صور ⇒ بلا meta');
  });
}
