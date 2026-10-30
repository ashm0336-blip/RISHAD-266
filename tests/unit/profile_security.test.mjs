/* KIVO_264 · «ملفي ← الأمان» وهويةُ الواجهة — src/auth/330-auth.js في سياق vm:
   (١) تغييرُ اسم الدخول يتطلب كلمةَ المرور الحالية — تُفحص قبل أي كتابة (محلياً · أو بالخادم /api/checkpw في وضع كلاود فلير)، وتُتاح لطبقة
       المزامنة لتُرسَل مع حفظ الحسابات نفسِه باسم «cur» (KIVO.__BS_I.auth.saveCur — لمفتاح الحسابات وحده ومدةً قصيرة). كانت تُطبَّق بلا تحقّق (D13).
   (٢) حقولُ حسابي لكل دور كما في الخادم: مديرُ العقدة لا يغيّر اسمَه · ورسائلُ الرفض الثلاث (self · self-cur · self-un) بنصٍّ واضح ·
       وفي وضع كلاود فلير لا «تمّ» قبل حكم الخادم: الرفضُ الذي تعيد طبقةُ المزامنة قيمتَه يُعرض سببُه لا نجاحاً زائفاً.
   (٣) D-3: في وضع كلاود فلير هويةُ الواجهة هويةُ الكوكي (BOOT.uid) — علامةُ جهازٍ لحسابٍ آخر لا تُعرض هويتُها.
   PROFILE_AUTH=<مسار> يبدّل ملفَّ المصادقة (لإثبات الإخفاق على KIVO_263). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { blockFile } from './harness.mjs';

const AUTH = process.env.PROFILE_AUTH || blockFile('330-auth.js');
const K_USERS = 'bassam_auth_users_v1', K_SESS = 'bassam_session_v1';
/* بصمةُ PBKDF2 بالصيغة التي يتحقق منها 330 (p2$<تكرار>$<ملح>$<ناتج>) */
const ph = (pw) => { const s = crypto.randomBytes(16); return 'p2$100000$' + s.toString('hex') + '$' + crypto.pbkdf2Sync(String(pw), s, 100000, 32, 'sha256').toString('hex'); };
const PW = '135792', PH = ph(PW);
function world(o) {
  const store = new Map(), clock = { t: Date.now() }, fetches = [];
  class D2 extends Date { static now() { return clock.t; } }
  const users = o.users.map((u) => Object.assign({ ph: PH }, u));
  store.set(K_USERS, JSON.stringify(users)); store.set(K_SESS, JSON.stringify({ uid: o.marker || o.uid, ts: clock.t, la: clock.t }));
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const RAW = { getItem: function (k) { return this.getItem(k); }, setItem: function (k, v) { return this.setItem(k, v); }, removeItem: function (k) { return this.removeItem(k); } };
  const KIVO = { __BS_RAWLS: RAW, BassamDepts: { has: () => true, list: () => [{ id: 'd1', name: 'إدارة', gid: 'g1' }], active: () => 'd1', setActive() {} } };
  const ctx = { KIVO, localStorage, console, JSON, Math, Object, Array, String, Number, RegExp, Promise, Error, Uint8Array, Uint32Array, TextEncoder, parseInt, isNaN, Date: D2,
    crypto: globalThis.crypto, document: { getElementById: () => null, addEventListener() {}, querySelector: () => null }, setTimeout, clearTimeout,
    fetch: (u, init) => { fetches.push({ u: String(u), body: init && init.body ? JSON.parse(init.body) : null }); if (o.net) return Promise.reject(new Error('net')); if (o.lock) return Promise.resolve({ json: () => Promise.resolve({ ok: 0, err: 'محاولات كثيرة — انتظر قليلاً' }) }); const ok = init && JSON.parse(init.body).p === PW; return Promise.resolve({ json: () => Promise.resolve({ ok: ok ? 1 : 0 }) }); } };
  ctx.window = ctx; ctx.__BS_BOOT = o.cf !== false ? Object.assign({ srv: 1, cf: 1 }, o.boot === undefined ? { uid: o.uid } : o.boot) : null;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(AUTH, 'utf8'), ctx, { filename: '330-auth.js' });
  const I = KIVO.__BS_I.auth;
  /* طبقةُ المزامنة تُركَّب بعد التهيئة (كما في الصفحة): ما في الخادم = ما زُرع قبل أي تعديل */
  KIVO.__BS_SRV = o.srv ? o.srv(store, store.get(K_USERS), I) : { flushAsync: async () => true };
  return { I, clock, fetches, store, me: () => JSON.parse(store.get(K_USERS)).find((u) => u.id === o.uid) };
}
const SU = { id: 'su', un: '1000000001', name: 'مدير النظام', role: 'super' };
const GM = { id: 'g1m', un: '1000000005', name: 'مدير العقدة', role: 'gm', gid: 'g1', email: 'a@b.sa' };
const ST = { id: 's1', un: '1000000009', name: 'موظف', role: 'staff', deptId: 'd1', ekey: 'e1' };
/* طبقةُ مزامنةٍ بديلة: الحفظُ يُرسل عند flushAsync — والرفضُ يعيد القيمةَ كما في الخادم ويُبطل نسخة الذاكرة ويزيد عدّادَ المرفوض (كما يفعل 280 مع 334) */
const srvStub = (deny) => (store, server, I) => { let n = 0; return { denied: () => n, flushAsync: () => { if (deny) { store.set(K_USERS, server); I._bustUsers(); n++; } return Promise.resolve(true); } }; };

test('Account edits fail before writing when the cloud adapter is missing or the page session has expired', async () => {
  for (const storage of [null, { flushAsync: async () => true, sesChanged: () => true }]) {
    const W = world({ users: [SU], uid: 'su', srv: () => storage });
    const before = W.store.get(K_USERS);
    const result = await W.I.changeOwnAccount({ name: 'TEST_ONLY changed name' });
    assert.equal(result.ok, false);
    assert.equal(W.store.get(K_USERS), before);
    assert.equal(W.fetches.length, 0);
  }
});

test('Optimistic account edits are not reported saved when cloud flush fails, times out, or rejects', async () => {
  const cases = [
    ['false result', () => Promise.resolve(false)],
    ['timeout', () => new Promise(resolve => setTimeout(() => resolve(false), 0))],
    ['offline rejection', () => Promise.reject(new Error('TEST_ONLY offline'))],
    ['synchronous transport error', () => { throw new Error('TEST_ONLY transport error'); }],
  ];
  for (const [name, fail] of cases) {
    let requestedTimeout = null;
    const W = world({ users: [SU], uid: 'su', srv: () => ({ flushAsync: ms => { requestedTimeout = ms; return fail(); } }) });
    const result = await W.I.changeOwnAccount({ name: 'TEST_ONLY pending account edit' });
    assert.equal(result.ok, false, name + ': an in-memory value is not a cloud acknowledgement');
    assert.match(result.err, /لم يتأكّد حفظُ حسابك على الخادم/);
    assert.equal(requestedTimeout, 8000);
    assert.equal(W.me().name, 'TEST_ONLY pending account edit', 'Pending changes remain available for retry');
  }
});

test('Account-save confirmation requires the acknowledged patch and an unchanged page identity', async () => {
  let acknowledged = null;
  const W = world({ users: [SU], uid: 'su', srv: store => ({ flushAsync: async () => { acknowledged = store.get(K_USERS); return true; } }) });
  const accepted = await W.I.changeOwnAccount({ name: 'TEST_ONLY acknowledged account edit' });
  assert.equal(accepted.ok, true);
  assert.equal(JSON.parse(acknowledged).find(u => u.id === SU.id).name, 'TEST_ONLY acknowledged account edit');

  const replaced = world({ users: [SU], uid: 'su', srv: (store, before, I) => ({ flushAsync: async () => { store.set(K_USERS, before); I._bustUsers(); return true; } }) });
  assert.equal((await replaced.I.changeOwnAccount({ name: 'TEST_ONLY superseded edit' })).ok, false, 'A flush for a patch replaced by the server is not success');

  let identityExpired = false;
  const expired = world({ users: [SU], uid: 'su', srv: () => ({ sesChanged: () => identityExpired, flushAsync: async () => { identityExpired = true; return true; } }) });
  assert.equal((await expired.I.changeOwnAccount({ name: 'TEST_ONLY expired page edit' })).ok, false, 'An acknowledgement cannot authenticate a page whose identity changed');
});

test('(١) تغييرُ اسم الدخول يتطلب كلمةَ المرور الحالية من الخادم السحابي', async () => {
  const cf = true;
  const W = world({ users: [SU], uid: 'su', cf, boot: { uid: 'su' } });
  let r = await W.I.changeOwnAccount({ un: '1000000002', currentPw: '000000' });
  assert.equal(r.ok, false, 'كلمةُ مرورٍ خاطئة ⇒ رفض'); assert.match(r.err, /كلمة المرور الحالية غير صحيحة/);
  assert.equal(W.me().un, '1000000001', 'لا كتابةَ قبل التحقق');
  r = await W.I.changeOwnAccount({ un: '1000000002' });
  assert.equal(r.ok, false, 'بلا كلمة مرور ⇒ رفض'); assert.equal(W.me().un, '1000000001');
  assert.equal(typeof W.I.saveCur, 'function'); assert.equal(W.I.saveCur(K_USERS), null, 'لا «cur» قبل نجاح التحقق');
  if (cf) assert.deepEqual(W.fetches.map((f) => [f.u, f.body.p]), [['/api/checkpw', '000000']], 'الفحصُ على الخادم (البصماتُ لا تغادره)');
  r = await W.I.changeOwnAccount({ un: '1000000002', currentPw: PW });
  assert.equal(r.ok, true); assert.equal(W.me().un, '1000000002');
  assert.equal(W.I.saveCur(K_USERS), PW, '«cur» يُرسل مع حفظ الحسابات');
  assert.equal(W.I.saveCur('bassam_staffing_v3'), null, 'لمفتاح الحسابات وحده');
  W.clock.t += 121000; assert.equal(W.I.saveCur(K_USERS), null, 'ولمدةٍ قصيرة');
});

test('(١ب) المراجعة R1/R4: «cur» تبقى لإعادة الإرسال حتى يُحسم حفظُ الحسابات (dropCur) · وسببُ رفض الخادم يُعرض كما هو (القفل · الشبكة)', async () => {
  const W = world({ users: [SU], uid: 'su', cf: true, boot: { uid: 'su' } });
  assert.equal((await W.I.changeOwnAccount({ un: '1000000002', currentPw: PW })).ok, true);
  assert.equal(W.I.saveCur(K_USERS), PW, 'الإرسالُ الأوّل'); assert.equal(W.I.saveCur(K_USERS), PW, 'وإعادتُه بعد خطأ شبكة أو 429 أو دمج — لا تُستهلك عند بناء الجسم');
  assert.equal(typeof W.I.dropCur, 'function'); W.I.dropCur(); assert.equal(W.I.saveCur(K_USERS), null, 'حُسم الحفظ (قُبل أو رُفض) ⇒ تُمحى');
  const L = world({ users: [SU], uid: 'su', cf: true, boot: { uid: 'su' }, lock: true });
  let r = await L.I.changeOwnAccount({ un: '1000000002', currentPw: PW });
  assert.equal(r.ok, false); assert.match(r.err, /محاولات كثيرة/, 'الحارسُ المقفل: سببُه لا «غير صحيحة»'); assert.equal(L.me().un, '1000000001'); assert.equal(L.I.saveCur(K_USERS), null);
  const N = world({ users: [SU], uid: 'su', cf: true, boot: { uid: 'su' }, net: true });
  r = await N.I.changeOwnAccount({ un: '1000000002', currentPw: PW });
  assert.equal(r.ok, false); assert.match(r.err, /تعذّر التحقق/, 'انقطاعُ الشبكة ليس «كلمةً خاطئة»'); assert.equal(N.me().un, '1000000001');
});

test('(١) ما لا يمسّ اسمَ الدخول كما كان: الاسمُ والبريد بلا كلمة مرور · وكلمةُ المرور الجديدة بالحالية · والموظفُ لا يغيّر اسمَ دخوله', async () => {
  const W = world({ users: [SU], uid: 'su' });
  let r = await W.I.changeOwnAccount({ name: 'اسمٌ جديد', email: 'a@b.sa' });
  assert.equal(r.ok, true); assert.equal(W.me().name, 'اسمٌ جديد'); assert.equal(W.I.saveCur(K_USERS), null);
  r = await W.I.changeOwnAccount({ newPw: '246813', confirmPw: '246813', currentPw: '000000' });
  assert.equal(r.ok, false); assert.equal(W.me().ph, PH);
  r = await W.I.changeOwnAccount({ newPw: '246813', confirmPw: '246813', currentPw: PW });
  assert.equal(r.ok, true); assert.notEqual(W.me().ph, PH); assert.equal(W.I.saveCur(K_USERS), null, 'كلمةُ المرور وحدها لا تحتاج «cur»');
  const S = world({ users: [ST], uid: 's1' });
  r = await S.I.changeOwnAccount({ un: '1000000010', currentPw: PW });
  assert.equal(r.ok, false); assert.match(r.err, /من موظفي الإدارة/); assert.equal(S.me().un, '1000000009');
});

test('(٢) حقولُ حسابي لكل دور (مرآةُ الخادم): مديرُ العقدة يغيّر بريدَه وجوالَه لا اسمَه · والموظفُ كلمةَ مروره وحدها · ورسائلُ الرفض الثلاث', async () => {
  const G = world({ users: [GM], uid: 'g1m' });
  let r = await G.I.changeOwnAccount({ name: 'اسمٌ آخر', email: 'a@b.sa', phone: '0500000000' });
  assert.deepEqual([r.ok, r.why], [false, 'self']); assert.match(r.err, /الاسمُ يعدّله مدير النظام/); assert.equal(G.me().name, 'مدير العقدة');
  r = await G.I.changeOwnAccount({ name: 'مدير العقدة', email: 'n@b.sa', phone: '0500000000' });
  assert.equal(r.ok, true, 'الاسمُ كما هو ⇒ لا يُعدّ تعديلاً'); assert.deepEqual([G.me().email, G.me().phone, G.me().name], ['n@b.sa', '0500000000', 'مدير العقدة']);
  const S = world({ users: [ST], uid: 's1' });
  r = await S.I.changeOwnAccount({ email: 'x@y.sa' });
  assert.deepEqual([r.ok, r.why], [false, 'self']); assert.match(r.err, /سوى كلمة المرور/);
  assert.match(S.I.selfWhyText('self-cur'), /كلمة مرورك الحالية/); assert.match(S.I.selfWhyText('self-un'), /10 أرقام/); assert.equal(S.I.selfWhyText('perm'), '');
});

test('(٢) كلاود فلير: لا «تمّ» قبل حكم الخادم — الرفضُ يعود بسببه الواضح لا نجاحاً زائفاً', async () => {
  const A = world({ users: [SU], uid: 'su', cf: true, boot: { uid: 'su' }, srv: srvStub(true) });
  let r = await A.I.changeOwnAccount({ un: '1000000003', currentPw: PW });
  assert.deepEqual([r.ok, r.why], [false, 'self-cur'], JSON.stringify(r)); assert.match(r.err, /كلمة مرورك الحالية/);
  assert.equal(A.me().un, '1000000001', 'القيمةُ كما في الخادم');
  r = await A.I.changeOwnAccount({ name: 'آخر' });
  assert.deepEqual([r.ok, r.why], [false, 'self']);
  const B = world({ users: [SU], uid: 'su', cf: true, boot: { uid: 'su' }, srv: srvStub(false) });
  r = await B.I.changeOwnAccount({ un: '1000000003', currentPw: PW });
  assert.equal(r.ok, true); assert.equal(B.me().un, '1000000003');
});

test('(٣) D-3: هويةُ الواجهة تتبع BOOT.uid في وضع كلاود فلير — علامةُ جهازٍ لحسابٍ آخر لا تُعرض هويتُها', () => {
  const OT = { id: 'ot', un: '1000000020', name: 'حسابٌ آخر', role: 'super' };
  const A = world({ users: [SU, OT], uid: 'su', cf: true, boot: { uid: 'su' } });
  assert.equal(A.I.cur().id, 'su', 'العلامةُ = الكوكي');
  const B = world({ users: [SU, OT], uid: 'su', marker: 'ot', cf: true, boot: { uid: 'su' } });
  assert.equal(B.I.cur(), null, 'علامةُ «ot» والكوكي «su» ⇒ لا هويةَ في الواجهة');
  assert.ok(B.store.has(K_SESS), 'العلامةُ لا تُمسّ (قد يملكها تبويبٌ آخر)');
  const C = world({ users: [SU, OT], uid: 'ot', marker: 'ot', cf: false });
  assert.equal(C.I.cur(), null, 'No account authority from a local session without cloud bootstrap');
  const D = world({ users: [SU, OT], uid: 'ot', marker: 'ot', cf: true, boot: {} });
  assert.equal(D.I.cur(), null, 'A pre-login bootstrap cannot authenticate a stale device marker');
});
