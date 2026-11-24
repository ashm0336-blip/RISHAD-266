/* V7 · 53 (nosilent · REVIEW 26 — «لا شيء صامت»): المرحلة 2 — الملفاتُ المركزية والمساعداتُ الكاتبة.
   كلُّ حالةٍ هنا تفشل على الأساس e6de6b8 وتنجح بعد الإصلاح (الدليل في scratchpad/d7/nosilent_report.md).
   المكوّناتُ نفسُها تعمل في vm (k264_vm · core01_root_world)؛ بياناتٌ اصطناعية TEST_ONLY. لا مكوّن جديد:
   280 bsToast/beforeunload · 550 BassamBusy · 300 BassamAck · 360 BassamIDB · 240 BassamLink · root-logic · 566 · المساعداتُ الكاتبة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClient, sleep } from './k264_vm.mjs';
import { world, rd } from './core01_root_world.mjs';
import vm from 'node:vm';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
const BOOT = { srv: 1, cf: 1, uid: 'TEST_ONLY_u', v: 1, keys: {}, revs: {} };
/* الحفظُ يُمسك حتى يُفرج عنه الاختبار: release(kind) ⇒ 'ok' إقرارٌ كامل · 'deny' رفضٌ لكل مفتاح · 'down' 503 */
function heldSaves() {
  const held = [];
  const req = async (route, init) => {
    if (route.startsWith('/api/save')) {
      const body = JSON.parse(init.body || '{}'), keys = Object.keys(body.set || {}).concat(body.del || []);
      return new Promise((res) => held.push((kind) => {
        if (kind === 'deny') return res(json({ ok: 0, denied: Object.fromEntries(keys.map((k) => [k, { why: 'perm' }])) }, 403));
        if (kind === 'down') return res(json({ ok: 0, err: 'db-busy' }, 503));
        res(json({ ok: 1, revs: Object.fromEntries(keys.map((k) => [k, 1])) }));
      }));
    }
    if (route.startsWith('/api/img/')) return json({ ok: 0, err: 'img-too-big' }, 500);
    return json({ ok: 1 });
  };
  return { req, held, release: (kind = 'ok') => { const f = held.shift(); if (f) f(kind); } };
}
function shell(blocks, C) {
  const T = loadClient({ C: C || { req: async (r) => (r.startsWith('/api/save') ? new Promise(() => {}) : json({ ok: 1 })) }, boot: BOOT, blocks: [], staffLinks: false });
  T.W.requestAnimationFrame = (f) => T.W.setTimeout(f, 0);
  T.W.print = () => {};
  /* the vm DOM has no parsed children: BassamBusy builds its pill with innerHTML, so its nodes are given lazily */
  const ce = T.W.document.createElement;
  T.W.document.createElement = (t) => {
    const e = ce(t); let f = null, l = null;
    Object.defineProperty(e, 'firstChild', { get: () => f || (f = T.W.document.createElement('i')) });
    Object.defineProperty(e, 'lastChild', { get: () => l || (l = T.W.document.createElement('i')) });
    e.closest = () => e;
    return e;
  };
  T.run(blocks);
  return T;
}
const toastLines = (T) => {
  const box = T.W.document.body.children.find((n) => n.className === 'bs-toast');
  return box ? box.children.map((n) => ({ text: n.textContent, tone: n.getAttribute('data-tone') })) : [];
};
const leave = (T) => { const ev = { type: 'beforeunload', prevented: false, preventDefault() { this.prevented = true; } }; T.W.dispatchEvent(ev); return ev.prevented; };

/* ── G1 · التوستُ الواحد يحمل النبرة (كان بلا نبرة إلا «⚠» للخطأ) ── */
test('nosilent G1: KIVO.bsToast marks ok / warn / err lines (symbol + data-tone); a plain line stays plain', () => {
  const T = shell(['280-server-storage.js']);
  try {
    const K = T.W.KIVO;
    K.bsToast('TEST_ONLY حُفظ', { tone: 'ok' }); K.bsToast('TEST_ONLY انتبه', { tone: 'warn' }); K.bsToast('TEST_ONLY فشل', { tone: 'err' });
    assert.deepEqual(toastLines(T), [{ text: '✓ TEST_ONLY حُفظ', tone: 'ok' }, { text: '⚠ TEST_ONLY انتبه', tone: 'warn' }, { text: '⚠ TEST_ONLY فشل', tone: 'err' }]);
    K.bsToast('TEST_ONLY عادي');
    assert.deepEqual(toastLines(T).slice(-1), [{ text: 'TEST_ONLY عادي', tone: null }]);
    assert.match(rd('layouts/helmet-global.css'), /\.bs-toast>div\[data-tone="ok"\]\{color:var\(--toast-ok\)\}/, 'the tone has its look in the existing toast CSS');
  } finally { T.dispose(); }
});

test('nosilent G1: BassamBusy.flash keeps its tone (ok / warn) instead of dropping it', () => {
  const T = shell(['280-server-storage.js', '550-bassam-busy.js']);
  try {
    T.W.KIVO.BassamBusy.flash('TEST_ONLY تم تنزيل الملف', 'TEST_ONLY تجده في التنزيلات', 'ok');
    T.W.KIVO.BassamBusy.flash('TEST_ONLY أُلغي', '', 'warn');
    assert.deepEqual(toastLines(T), [{ text: '✓ TEST_ONLY تم تنزيل الملف — TEST_ONLY تجده في التنزيلات', tone: 'ok' }, { text: '⚠ TEST_ONLY أُلغي', tone: 'warn' }]);
  } finally { T.dispose(); }
});

/* ── G2 · سؤالُ المغادرة يشمل كلَّ عملية ظاهرة في المؤشر الموحّد وكلَّ صورة في الطريق ── */
test('nosilent G2: beforeunload asks while a BassamBusy operation or an image upload is running, and not after', async () => {
  const T = shell(['280-server-storage.js', '550-bassam-busy.js']);
  try {
    const B = T.W.KIVO.BassamBusy;
    assert.equal(leave(T), false, 'nothing running: no question');
    const tk = B.start('TEST_ONLY جارٍ تجهيز ملف…', { btn: null });
    assert.equal(leave(T), true, 'a running operation (export · PDF · compress · pending command) is protected');
    tk.done();
    assert.equal(leave(T), false, 'after it ends: no question');
    T.W.KIVO.__BS_IMG_INFLIGHT = [Promise.resolve()];
    assert.equal(leave(T), true, 'an image on its way is protected');
    T.W.KIVO.__BS_IMG_INFLIGHT = [];
    assert.equal(leave(T), false);
    const R = rd('layouts/root-logic.js') + rd('api/280-server-storage.js');
    assert.equal((R.match(/addEventListener\("beforeunload", function \(e\)/g) || []).length, 1, 'still exactly one prompting handler');
  } finally { T.dispose(); }
});

test('nosilent G2: the in-app guard (unit switch) and logout ask before cutting a running operation', async () => {
  const W = world({ confirm: false, srv: { dirty: () => false, inflight: () => false, flushAsync: async () => true, denied: () => 0 } });
  W.KIVO.BassamBusy = { active: () => 1, start: () => ({ done() {} }) };
  assert.equal(await W.c._unsavedGuard(), false, 'stayed: the user kept the operation');
  assert.equal(W.confirms.length, 1); assert.equal(W.confirms[0].title, 'عملية جارية'); assert.equal(W.confirms[0].danger, true);
  let out = 0; W.KIVO.BassamAuth.logout = () => { out++; };
  W.vals().doLogout({});
  await sleep(0); await sleep(0);
  assert.equal(out, 0, 'logout waited for the answer and the user stayed');
  assert.equal(W.confirms[1].title, 'عملية جارية');
});

test('nosilent G2/ب4: logout saves what is queued first, and never drops an unsaved edit silently', async () => {
  let flushed = 0;
  const W = world({ confirm: false, srv: { dirty: () => true, inflight: () => false, flushAsync: async () => { flushed++; return false; }, denied: () => 0 } });
  W.KIVO.BassamBusy = { active: () => 0, start: () => ({ done() {} }) };
  let out = 0; W.KIVO.BassamAuth.logout = () => { out++; };
  W.vals().doLogout({});
  for (let i = 0; i < 4; i++) await sleep(0);
  assert.equal(flushed, 1, 'the queue was flushed before leaving');
  assert.equal(W.confirms.length, 1); assert.equal(W.confirms[0].title, 'تعديلات لم تُحفظ'); assert.equal(W.confirms[0].ok, 'اخرج دون حفظها');
  assert.equal(out, 0, 'refused: still logged in');
  const W2 = world({ confirm: false, srv: { dirty: () => true, inflight: () => false, flushAsync: async () => true, denied: () => 0 } });
  W2.KIVO.BassamBusy = { active: () => 0, start: () => ({ done() {} }) };
  let out2 = 0; W2.KIVO.BassamAuth.logout = () => { out2++; };
  W2.vals().doLogout({});
  for (let i = 0; i < 4; i++) await sleep(0);
  assert.equal(out2, 1, 'saved: logs out without a question'); assert.equal(W2.confirms.length, 0);
});

test('nosilent G1: shell failures carry the error tone (unit switch · bell)', async () => {
  const W = world({ srv: { dirty: () => false, inflight: () => false, flushAsync: async () => true, denied: () => 0 } });
  W.KIVO.BassamDepts.setActive = () => false;
  await W.c._switchUnit('TEST_ONLY_b', 'TEST_ONLY إدارة ب');
  assert.equal(W.toasts.at(-1).opt.tone, 'err');
  await W.c._nfWork(async () => ({ ok: 0, err: 'TEST_ONLY رُفض' }));
  assert.deepEqual([W.toasts.at(-1).m, W.toasts.at(-1).opt.tone], ['TEST_ONLY رُفض', 'err']);
});

/* ── G9 · لا «تم» قبل الخادم: الرسالةُ تُنادى ثم يُحفظ في الإطار نفسه ── */
test('nosilent G9: BassamAck does not say «تم» when the save is queued right after the call (same frame)', async () => {
  const T = shell(['280-server-storage.js', '300-bassam-ack.js']);
  try {
    const shown = [], inst = { bsToast: (m, k) => shown.push([m, k]) };
    const p = T.W.KIVO.BassamAck.toast(inst, 'TEST_ONLY تم', 'ok', { ms: 400 });
    T.set('bassam_core01_probe_v1', '"TEST_ONLY"');          /* setState(…, () => savePlan()) — the write lands after bsAck in the same frame */
    const r = await p;
    assert.equal(r, false, 'not acknowledged');
    assert.deepEqual(shown, [['حُفظ محلياً — بانتظار المزامنة', 'warn']], 'no success text before the server');
  } finally { T.dispose(); }
});

/* ── G3 · إخفاقُ رفع الصورة لا يُبلع ── */
test('nosilent G3: a failed image upload that the page did not wait for is said, with its reason; a page that waits speaks alone', async () => {
  const H = heldSaves();
  const T = shell(['280-server-storage.js', '550-bassam-busy.js', '360-bassam-idb.js'], { req: H.req });
  try {
    const I = T.W.KIVO.BassamIDB;
    I.set('img_rzdTEST_ONLY1', 'data:image/jpeg;base64,AAAA');          /* rasd: fire and forget */
    await sleep(60);
    const t = toastLines(T);
    assert.equal(t.length, 1, 'one line'); assert.equal(t[0].tone, 'err');
    assert.match(t[0].text, /^⚠ لم تُرفع الصورة — رُفضت \(رمز 500\) · أعد إرفاقها$/);
    let caught = null;
    try { await I.set('img_rzdTEST_ONLY2', 'data:image/jpeg;base64,AAAA'); } catch (e) { caught = e; }   /* seized / plan / daily: they await and speak */
    await sleep(60);
    assert.ok(caught, 'the rejection still reaches the page');
    assert.equal(toastLines(T).length, 1, 'no second message when the page handles it');
  } finally { T.dispose(); }
});

/* ── G5 · BassamLink: «يُحفظ…» بعد 300 م.ث، و«حُفظ» بعد الإقرار وحده ── */
async function until(f, ms = 2500) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await sleep(20); } return f(); }
test('nosilent G5: a save pending over 300 ms shows «يُحفظ…», then «حُفظ» only after the server acknowledges, then hides', async () => {
  const H = heldSaves();
  const T = shell(['240-bassam-link.js', '280-server-storage.js'], { req: H.req });
  try {
    const L = T.W.KIVO.BassamLink;
    assert.equal(L.view(), 'on');
    T.set('bassam_core01_probe_v1', '"TEST_ONLY 1"');
    await sleep(150);
    assert.equal(L.view(), 'on', 'not before 300 ms');
    assert.ok(await until(() => L.view() === 'saving'), '«يُحفظ…» while the request waits');
    await sleep(300);
    assert.equal(L.view(), 'saving', 'no «حُفظ» while unacknowledged');
    H.release('ok');
    assert.ok(await until(() => L.view() === 'saved'), '«حُفظ» after the acknowledgement');
    assert.ok(await until(() => L.view() === 'on', 2600), 'then it hides');
  } finally { T.dispose(); }
});

test('nosilent G5: a refused or failing save never shows «حُفظ»', async () => {
  const H = heldSaves();
  const T = shell(['240-bassam-link.js', '280-server-storage.js'], { req: H.req });
  try {
    const L = T.W.KIVO.BassamLink, seen = new Set();
    const watch = T.W.setInterval(() => seen.add(L.view()), 15);
    T.set('bassam_core01_probe_v1', '"TEST_ONLY deny"');
    assert.ok(await until(() => L.view() === 'saving'));
    H.release('deny');
    await sleep(700);
    assert.equal(seen.has('saved'), false, 'refused: no «حُفظ»');
    assert.notEqual(L.view(), 'saving', 'and no endless «يُحفظ…»');
    T.W.clearInterval(watch);
  } finally { T.dispose(); }
});

test('nosilent G5: a quick save (< 300 ms) shows nothing at all', async () => {
  const T = shell(['240-bassam-link.js', '280-server-storage.js'], { req: async (r, init) => {
    if (!r.startsWith('/api/save')) return json({ ok: 1 });
    const b = JSON.parse(init.body); return json({ ok: 1, revs: Object.fromEntries(Object.keys(b.set || {}).map((k) => [k, 1])) });
  } });
  try {
    const L = T.W.KIVO.BassamLink, seen = new Set(), w = T.W.setInterval(() => seen.add(L.view()), 10);
    T.set('bassam_core01_probe_v1', '"TEST_ONLY quick"');
    await sleep(900);
    T.W.clearInterval(w);
    assert.deepEqual([...seen], ['on']);
  } finally { T.dispose(); }
});

/* ── ب2/ب3 · المساعداتُ الكاتبة الواحدة تمرّ بالمؤشر الموحّد (الزرُّ يتجمّد · المغادرةُ تُسأل) — والقراءةُ لا ── */
test('nosilent step 2: every one-place write helper runs inside BassamBusy and ends it in finally', () => {
  const H = [
    ['systems/tasks/client/logic.js', /_tkApi\(p, b\) \{[\s\S]{0,900}?const B = void 0 !== b && KIVO\.BassamBusy, busy = B \? B\.start\("جارٍ الحفظ…"\) : null;\n\s*return fetch\(p, o\)\.finally\(\(\) => busy && busy\.done\(\)\)/],
    ['systems/tasks/client/545-task-self.js', /function req\(url, opt\) \{[\s\S]{0,300}?opt\.method === 'POST' && KIVO\.BassamBusy[\s\S]{0,300}?done\(\); return r; \}, function \(e\) \{ done\(\); throw e; \}/],
    ['systems/custody/client/547-custody-api.js', /options\.method !== 'GET' && KIVO\.BassamBusy[\s\S]{0,1600}?finally \{ clearTimeout\(timer\); if \(busy\) busy\.done\(\); \}/],
    ['modules/admin/logic.js', /adFetch\(t, e, keepErr\) \{[\s\S]{0,300}?const B = e && KIVO\.BassamBusy[\s\S]{0,400}?\.finally\(\(\) => busy && busy\.done\(\)\);/],
    ['systems/irshad/client/logic.js', /_irRequest\(path, options, context\) \{[\s\S]{0,500}?options\.method !== "GET" && KIVO\.BassamBusy[\s\S]{0,1800}?finally \{ clearTimeout\(timer\); if \(busy\) busy\.done\(\); \}/],
    ['systems/plan/client/404-plan-p4.js', /plan\.optRef@1[\s\S]{0,900}?B\.start\('جارٍ تعديل الخيار في كل الأشهر والجولات…'\)[\s\S]{0,700}?if \(busy\) busy\.done\(\); return j;/],
    ['systems/_shared/business/business-cloud.js', /const busy = KIVO\.BassamBusy \? KIVO\.BassamBusy\.start\("جارٍ تأكيد العملية…"\) : null;\n\s*ticket\.pending = run\(\);[\s\S]{0,400}?finally \{ if \(busy\) busy\.done\(\);/],
  ];
  const miss = H.filter(([f, re]) => !re.test(rd(f))).map(([f]) => f);
  assert.deepEqual(miss, []);
});

test('nosilent step 2: the business-cloud mutation freezes the clicked control and ends the token (behaviour)', async () => {
  const T = shell(['280-server-storage.js', '550-bassam-busy.js']);
  try {
    const B = T.W.KIVO.BassamBusy, src = rd('systems/_shared/business/business-cloud.js');
    /* the real _bcMutate on a minimal host: one in-flight request ⇒ one active token; done ⇒ none */
    const ctx = T.W;
    ctx.Component = function () {}; ctx.Component.prototype.setState = function () {};
    vm.runInContext(src, T.ctx, { filename: 'business-cloud.js' });
    const c = new ctx.Component(); c.state = {};
    let release; const gate = new Promise((r) => { release = r; });
    c._bcContext = () => ({ uid: 'u', dept: 'd', key: 'k' }); c._bcSame = () => true; c._bcStamp = () => ({ context: { key: 'k' }, base: { epoch: 1 } });
    c._bcBase = () => true; c._businessSpec = () => ({ prefix: 'aw', path: '/api/aw', resources: [] }); c._bcInvalidate = () => {};
    c._bcRequest = async () => { await gate; return { ok: 0, err: 'invalid', status: 400 }; };
    const btn = T.W.document.createElement('button'); T.W.document.activeElement = btn;   /* the control the user pressed */
    const p = c._bcMutate('create', { data: {} });
    await sleep(0);
    assert.equal(B.active(), 1, 'the pending request is in the unified indicator');
    assert.equal(btn.classList.contains('bsb-frozen'), true, 'the pressed control is frozen (no repeat)');
    assert.equal(leave(T), true, 'and leaving asks');
    release(); await p;
    assert.equal(B.active(), 0, 'ended with the request');
    assert.equal(btn.classList.contains('bsb-frozen'), false, 'and released');
  } finally { T.dispose(); }
});

/* ── G7 · ستارُ PDF: «إلغاء» آمن، والرجوعُ إلى نافذة الطباعة يقول سببَه ── */
test('nosilent G7: the PDF veil offers a safe cancel, the build stops between pages, and the fallback says why', () => {
  const s = rd('systems/_shared/print/566-print-core.js');
  assert.match(s, /b\.textContent = "إلغاء"/, 'a cancel button on the existing veil');
  assert.match(s, /if \(run\.stop\) throw PDF_STOP53; return \(say\(k\), one\(pg, k\)\);/, 'checked before every page');
  assert.match(s, /if \(e === PDF_STOP53\) return end\("cancel"\);/, 'a cancelled build downloads nothing');
  assert.match(s, /flash\("أُلغي تجهيز ملف PDF — لم يُنزَّل شيء", "", "warn"\)/);
  assert.match(s, /flash\("تعذّر صنع ملف PDF في هذا المتصفح", "فُتحت نافذة الطباعة بدلاً منه — اختر «حفظ بصيغة PDF»", "warn"\);\n\s*\} catch \(e\) \{\}\n\s*return void dialog\(\);/, 'the fallback is announced');
  assert.match(s, /tk = B \? B\.start\("جاري تحميل الملف…", \{ btn: null \}\) : null;/, 'leaving asks while the file is built');
  assert.match(rd('styles/540-busy.css'), /body:has\(#bs-print-veil\) #bs-busy\{display:none\}/, 'no second indicator over the veil');
});

/* ══ REVIEW 37 (موعد التسليم) — البنود الثلاثة الأخرى ══ */

/* ب1 · رصد: الحالةُ لا تُحفظ قبل أن يصل مرفقُها (كانت «أُضيفت الحالة» والصورةُ لم تصل) */
function rasdPage() {
  const store = new Map(), toasts = [], acks = [];
  const KIVO = {
    BassamPerm: { can: () => true, subOn: () => true }, BassamAuth: { user: () => ({ id: 'TEST_ONLY_u1', un: 'TEST_ONLY' }), display: () => ({ name: 'TEST_ONLY راصد' }) },
    BassamDepts: { activeName: () => 'TEST_ONLY إدارة أ' }, bus: { read: () => undefined }, BassamAck: { toast: (c, t) => (acks.push(t), Promise.resolve(true)) },
  };
  const C = { KIVO, DCLogic: class { constructor(p) { this.props = p || {}; } setState(s) { this.state = { ...this.state, ...(typeof s === 'function' ? s(this.state) : s) }; } },
    console, Date, Intl, Math, JSON, setTimeout, clearTimeout, location: { hash: '#/rasd', pathname: '/', search: '' }, history: {}, document: { getElementById: () => null },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) } };
  C.window = C; C.globalThis = C; vm.createContext(C);
  for (const f of ['i18n/380-hijri-fallback.js', 'i18n/385-calendar.js', 'services/440-count.js', 'components/565-page-kit.js']) vm.runInContext(rd(f), C, { filename: f });
  vm.runInContext(rd('systems/rasd/client/logic.js') + '\n' + rd('systems/_shared/kpiring/kpi-ring.js') + '\nglobalThis.TEST_ONLY_Rasd = Component;', C, { filename: 'rasd/logic.js' });
  const page = new C.TEST_ONLY_Rasd({}); page.bsToast = (t, k) => toasts.push([t, k]);
  const saved = []; page.saveRasd = (d) => (saved.push(d), true); page.loadRasd = () => ({ reports: [] });
  page.rzValidate = () => ({ ok: true, rec: { t: '09:00', zone: 'الأبواب', floor: '', spot: '', type: 'ازدحام', impact: 'منخفض', act: 'تنظيم حركة', party: '', notes: '' } });
  return { page, toasts, acks, saved };
}
test('nosilent REVIEW 37 ب1: rasd does not save a case whose attachment did not reach the server, and says why', async () => {
  const { page, toasts, acks, saved } = rasdPage();
  page.state = { ...(page.state || {}), rzDraft: { ...page.emptyDraft(), att: { iid: 'img_rzdTEST_ONLY', url: 'data:image/jpeg;base64,AAAA', name: 'TEST_ONLY.jpg' } } };
  page._rzUp = { img_rzdTEST_ONLY: Promise.reject(new Error('img-too-big (HTTP 500)')) }; page._rzUp.img_rzdTEST_ONLY.catch(() => {});
  await page.rzSaveCase({ Y: 1447, M: 5, D: 3, isToday: false, canEnter: true });
  assert.equal(saved.length, 0, 'nothing unsaved is shown as saved: the case is not stored');
  assert.deepEqual(acks, [], 'no «أُضيفت الحالة»');
  assert.equal(toasts.at(-1)[1], 'err'); assert.match(toasts.at(-1)[0], /^لم تُحفظ الحالة — لم يصل المرفق/);
  assert.ok(page.state.rzDraft.att, 'the draft and its attachment stay for a retry');
  /* the upload is confirmed ⇒ the case is stored and acknowledged */
  page._rzUp = { img_rzdTEST_ONLY: Promise.resolve(true) };
  await page.rzSaveCase({ Y: 1447, M: 5, D: 3, isToday: false, canEnter: true });
  assert.equal(saved.length, 1); assert.equal(acks.length, 1); assert.match(acks[0], /^أُضيفت الحالة/);
});

/* ب2 · التصدير: نهايةٌ حقيقية بعد بناء الملف — لا «صُدِّر» قبلها، وسببُ الإخفاق يُقال */
test('nosilent REVIEW 37 ب2: XLSX download ends for real — «نُزّل» after the file is built, the reason on failure', async () => {
  const T = shell(['280-server-storage.js', '440-count.js', '550-bassam-busy.js', '570-bassam-xlsx.js']);
  try {
    const ce = T.W.document.createElement; T.W.document.createElement = (t) => { const e = ce(t); e.click = () => {}; return e; };
    T.W.URL = { createObjectURL: () => 'blob:TEST_ONLY', revokeObjectURL() {} };
    const X = T.W.KIVO.BassamXLSX, aoa = [['TEST_ONLY الاسم'], ['TEST_ONLY أ'], ['TEST_ONLY ب']];
    const ok = await X.download(aoa, 'TEST_ONLY.xlsx');
    assert.equal(ok, true, 'the promise ends after the file is handed to the browser');
    assert.deepEqual(toastLines(T).at(-1), { text: '✓ نُزّل «TEST_ONLY.xlsx» — صفّان', tone: 'ok' });
    T.W.URL = { createObjectURL: () => { throw new Error('TEST_ONLY blocked'); }, revokeObjectURL() {} };
    const bad = await X.download(aoa, 'TEST_ONLY2.xlsx');
    assert.equal(bad, false, 'a failure resolves false (callers can no longer miss it)');
    assert.deepEqual(toastLines(T).at(-1), { text: '⚠ تعذّر إنشاء ملف Excel — TEST_ONLY blocked — لم يُنزَّل شيء؛ أعد المحاولة', tone: 'err' });
    T.W.URL = { createObjectURL: () => 'blob:TEST_ONLY', revokeObjectURL() {} };
    const n0 = toastLines(T).length;
    assert.equal(await X.download(aoa, 'TEST_ONLY3.xlsx', { quiet: true }), true);
    assert.equal(toastLines(T).length, n0, 'quiet: the page says its own success after the promise');
  } finally { T.dispose(); }
  /* the two pages that said «صُدِّر» before the file existed now say it inside the promise */
  assert.match(rd('systems/plan/client/logic.js'), /\{ quiet: !0 \},\n\s*\);\n\s*\} catch \(e\) \{\n\s*return void this\.bsToast\("تعذّر تجهيز ملف Excel", "err"\);\n\s*\}\n\s*Promise\.resolve\(done\)\.then\(\(ok\) => ok !== !1 && this\.bsToast\(\n\s*"صُدِّر "/);
  assert.match(rd('systems/dstats/client/logic.js'), /return Promise\.resolve\(done\)\.then\(ok=>\{ if\(ok!==false\) this\.bsToast\("صُدِّر "/);
});

/* ب3 · الجدول الشهري: الاعتمادُ والفتحُ والحذفُ لا تمرّ بصمت — رسالةٌ بعد إقرار العملية وحده */
test('nosilent REVIEW 37 ب3: staff month approve / reopen / delete say what happened, after the operation is acknowledged', () => {
  const s = rd('systems/staff/client/logic.js');
  assert.match(s, /op: "month-approval"[\s\S]{0,400}?\}\)\) \{\n\s*this\.setState\(\{ lockConfirm: null[\s\S]{0,200}?\n\s*\/\*[^\n]*\*\/\n\s*this\.bsAck\(t\.locked \? "فُتح جدول " \+ this\._stMonthName\(t\.n\) \+ " للتعديل" : "اعتُمد جدول " \+ this\._stMonthName\(t\.n\) \+ " وأُقفل", "ok"\);/);
  assert.match(s, /op: "delete-month"[\s\S]{0,300}?\}\)\) \{\n\s*this\.setState\(\{ delMonth: null[\s\S]{0,120}?\n\s*\/\*[^\n]*\*\/\n\s*this\.bsAck\("حُذف جدول " \+ this\._stMonthName\(t\.n\) \+ " — لم يبقَ فيه توزيع", "ok"\);/);
  /* the message is inside the success branch: a refused _opsSave (false) says its reason in _opsSave and nothing else */
  /* V7 · 53 تقويم (REVIEW 22 · عيب 3): الشهرُ ميلادي — «نوفمبر 2026» بلا «هـ» (v7_cal_r22_defects ③) */
  assert.match(s, /_stMonthName\(n\) \{ return "«" \+ \(\(this\.MONTHS && this\.MONTHS\[n - 1\]\) \|\| n\) \+ " " \+ this\.state\.year \+ "»"; \}/);
});
