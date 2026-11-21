/* V7 · د5-هـ (x1 · الجلسات) — الواجهة الحقيقية داخل node:vm ببياناتٍ اصطناعية (TEST_ONLY):
   (أ) «ليس أنا» على تنبيه الجهاز الجديد (sc_dev) في التوست والجرس: يُنهي الجلسةَ التي يحملها التنبيه وحدها (POST /api/me/sess/kill-one {sid, why:'not-me'})
       ثم يعرض تغييرَ كلمة المرور (صفحتي ← الأمان) · تنبيهٌ آخر لا يحمل الزر
   (ب) الخروجُ في تبويبٍ آخر من المتصفح نفسِه يُقفل هذا التبويب فوراً — حدثُ storage لمسح علامة الجلسة أو رسالةُ BroadcastChannel — بلا طلب خادم */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { SRC } from './harness.mjs';
import { world as rootWorld } from './core01_root_world.mjs';

const SID = '0123456789abcdef';
const item = (o) => Object.assign({ id: 'd:tst_d1:TEST_ONLY_n1', type: 'sc_dev', k: 'sec', lvl: 'act', chan: 'toast', t: 'دخول من جهاز جديد', b: 'TEST_ONLY', at: Date.now(), go: 'الأمان', link: 'sess:' + SID, un: true }, o || {});
function nfWorld(items, reply) {
  const W = rootWorld({ user: { id: 'TEST_ONLY_u1', role: 'staff', deptId: 'TEST_ONLY_a', ekey: 'TEST_ONLY_e1' } });
  const calls = [], reads = [];
  W.ctx.fetch = async (url, init) => { calls.push({ url, body: init && init.body ? JSON.parse(init.body) : null }); return { ok: reply.ok === 1, status: reply.ok === 1 ? 200 : 404, json: async () => reply }; };
  W.KIVO.BassamNotif = { list: () => items.map((x) => Object.assign({}, x)), markRead: async (id) => { reads.push(id); return { ok: 1 }; }, status: () => ({ counters: { total: items.length, unread: items.length, actionable: 0, urgentUnread: 0, unreadAll: items.length, byKind: {} }, ready: true }),
    KC: {}, KI: { sys: '' }, KN: {}, LV: { info: {}, act: {}, urg: {} }, GO_NAV: { 'الأمان': 'profile' }, muteGet: () => false };
  return Object.assign(W, { calls, reads });
}
const flush = () => new Promise((r) => setTimeout(r, 0));

test('(أ) «ليس أنا» في التوست: يُنهي الجلسةَ المحمولة وحدها ثم يفتح تغييرَ كلمة المرور', async () => {
  const W = nfWorld([item()], { ok: 1 });
  W.c.state.nfToast = { id: item().id, t: 'x', b: 'y', go: 'الأمان', n: 1, notMe: W.c._nfSid(item()) ? 1 : 0 };
  const v = W.c._nfVals(); assert.equal(v.nfToastNotMeOn, true, 'الزرُّ ظاهرٌ على تنبيه الجهاز الجديد');
  v.nfToastNotMe(); for (let i = 0; i < 6; i++) await flush();
  assert.equal(W.calls.length, 1); assert.equal(W.calls[0].url, '/api/me/sess/kill-one');
  assert.deepEqual(W.calls[0].body, { sid: SID, why: 'not-me' }, 'المِقبضُ من التنبيه نفسِه');
  assert.equal(W.confirms.length, 1); assert.match(W.confirms[0].title, /أُنهيت تلك الجلسة/); assert.equal(W.confirms[0].ok, 'تغيير كلمة المرور');
  assert.equal(W.c.state.active, 'profile', 'إلى صفحتي'); assert.deepEqual(JSON.parse(JSON.stringify(W.KIVO.__BS_OPEN_TAB)), { page: 'profile', tab: 'acct' }, '← الأمان (تغيير كلمة المرور)');
  assert.deepEqual(W.reads, [item().id], 'التنبيهُ مقروء');
});

test('(أ) «ليس أنا» في الجرس · وتنبيهٌ آخر (أو مِقبضٌ مشوَّه) لا يحمل الزر', async () => {
  const items = [item(), item({ id: 'd:tst_d1:TEST_ONLY_n2', type: 'sc_fail', link: '' }), item({ id: 'd:tst_d1:TEST_ONLY_n3', link: 'sess:zz' })];
  const W = nfWorld(items, { ok: 0, err: 'not-found' });
  const rows = W.c._nfVals().nfRows.filter((r) => r.isItem);
  assert.equal(JSON.stringify(Array.from(rows, (r) => r.notMeOn)), '[true,false,false]');
  let stopped = 0; rows[0].notMe({ stopPropagation() { stopped++; } }); for (let i = 0; i < 6; i++) await flush();
  assert.equal(stopped, 1, 'لا يفتح التنبيهَ نفسَه'); assert.deepEqual(W.calls[0].body, { sid: SID, why: 'not-me' });
  assert.match(W.confirms[0].title, /انتهت تلك الجلسة من قبل/, 'جلسةٌ انتهت قبلُ: يُقال ذلك ويُعرض تغييرُ كلمة المرور');
});

function gate() {
  const W = { storage: [] }, appended = [], removed = [], channels = [];
  let sess = { uid: 'TEST_ONLY_u1' };
  const u0 = { id: 'TEST_ONLY_u1', role: 'staff', deptId: 'tst_d1', name: 'TEST_ONLY' };
  class BC { constructor(n) { this.name = n; channels.push(this); } postMessage() {} close() {} }
  const I = { D: { setScopeGuard() {}, active: () => 'tst_d1', setActive() {} }, u0, touch() {}, needsPwChange: () => false, cur: () => (sess ? u0 : null), curDept: () => 'tst_d1', K_SESS: 'bassam_session_v1',
    RAW: { removeItem: () => { sess = null; removed.push(1); } }, gmDepts: () => [], gmEnsureActive() {}, isMgrKey: () => false, rawUsers: () => [], permStore: () => ({ emps: {}, tplOf: {}, empLens: {} }) };
  const fetches = [];
  const win = { KIVO: { __BS_I: { auth: I } }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {}, localStorage: { getItem: () => null }, BroadcastChannel: BC, fetch: (u) => { fetches.push(u); return Promise.resolve({}); },
    addEventListener: (t, f) => { if (t === 'storage') W.storage.push(f); },
    document: { hidden: false, addEventListener() {}, getElementById: () => null, body: { appendChild: (d) => appended.push(d) }, createElement: () => ({ style: {}, setAttribute() {} }) } };
  win.window = win; vm.createContext(win);
  vm.runInContext(fs.readFileSync(path.join(SRC, 'auth', '335-identity-gate.js'), 'utf8'), win, { filename: '335-identity-gate.js' });
  return { W, appended, removed, channels, fetches, out: () => { sess = null; } };
}

test('(ب) خروجُ تبويبٍ آخر: مسحُ علامة الجلسة (storage) يُقفل هذا التبويب فوراً بلا طلب خادم', () => {
  const G = gate();
  G.W.storage.forEach((f) => f({ key: 'bassam_page_v1', newValue: 'x' })); assert.equal(G.appended.length, 0, 'مفتاحٌ آخر: لا شيء');
  G.out(); G.W.storage.forEach((f) => f({ key: 'bassam_session_v1', newValue: null }));
  assert.equal(G.appended.length, 1, 'أُقفلت الشاشة فوراً'); assert.match(G.appended[0].innerHTML, /انتهت الجلسة/);
  assert.equal(G.fetches.length, 0, 'بلا رحلة خادم');
});

test('(ب) رسالةُ BroadcastChannel «out» تُقفل التبويب (ولو لم يصل حدثُ storage)', () => {
  const G = gate(); const ch = G.channels.find((c) => c.name === 'bassam-session'); assert.ok(ch && typeof ch.onmessage === 'function');
  ch.onmessage({ data: { t: 'other' } }); assert.equal(G.appended.length, 0);
  ch.onmessage({ data: { t: 'out' } }); assert.equal(G.removed.length, 1, 'علامةُ الجلسة مُسحت هنا أيضاً'); assert.equal(G.appended.length, 1, 'أُقفلت'); assert.equal(G.fetches.length, 0);
});

test('(ب) الخروجُ نفسُه يبثّ «out» قبل التنقّل (334) — والواجهةُ تعرض ستارةً ثم /api/logout', () => {
  const src = fs.readFileSync(path.join(SRC, 'permissions', '334-perm-tree-tpl.js'), 'utf8');
  const i = src.indexOf('logout: function(){'), body = src.slice(i, src.indexOf('needsPwChange: needsPwChange', i));
  assert.ok(i > 0 && /new BroadcastChannel\('bassam-session'\)/.test(body) && /postMessage\(\{ t: 'out' \}\)/.test(body), 'البثُّ في مسار الخروج');
  assert.ok(body.indexOf("postMessage({ t: 'out' })") < body.indexOf("location.replace('/api/logout"), 'قبل التنقّل');
});

test('(ج) «الجلسات والنشاط»: الجهاز والمتصفح · المدينة · البدء · آخرُ نشاط · «الحالية» · «إنهاء» لكلِّ جلسةٍ عدا الحالية', async () => {
  const { world: pWorld } = await import('./profile_world.mjs');
  const now = Date.now(), S2 = 'fedcba9876543210';
  const me = { ok: 1, now, events: [], sess: [
    { sid: SID, mine: true, ts: now - 3600e3, la: now, dev: 'd', br: 'Chrome', city: 'TEST_ONLY_مدينة', active: true },
    { sid: S2, mine: false, ts: now - 7200e3, la: now - 1800e3, dev: 'm', br: 'Safari', city: '', active: false }] };
  const posts = [];
  const W = pWorld({ cf: true, user: { id: 's9', role: 'staff', ekey: 'e9', un: '1000000009', deptId: 'd1', name: 'TEST_ONLY' }, emps: [], fetch: (u) => (u === '/api/me' ? { body: me } : u === '/api/me/sess/kill-one' ? { body: { ok: 1 } } : null) });
  W.ctx.fetch = ((f) => (u, init) => { if (init && init.method === 'POST') posts.push({ u: String(u), body: JSON.parse(init.body) }); return f(u, init); })(W.ctx.fetch);
  W.c.state.pfSrv = me;
  const v = JSON.parse(JSON.stringify(W.c.pfSecVals(W.c.state))), live = W.c.pfSecVals(W.c.state);
  assert.equal(v.sess.length, 2);
  assert.equal(v.sess[0].dev, 'حاسوب · Chrome'); assert.ok(v.sess[0].mine && !v.sess[0].canKill, 'الحالية بلا «إنهاء»'); assert.match(v.sess[0].where, /هذا الجهاز · TEST_ONLY_مدينة/);
  assert.equal(v.sess[1].dev, 'جوال · Safari'); assert.ok(v.sess[1].canKill, '«إنهاء» للأخرى'); assert.match(v.sess[1].since, /^بدأت /); assert.match(v.sess[1].last, /^آخر نشاط /);
  assert.ok(v.sessHasOthers && /إنهاء الجلسات الأخرى \(1\)/.test(v.sessKillTxt), '«إنهاء الجلسات الأخرى» باقٍ');
  live.sess[1].kill(); for (let i = 0; i < 6; i++) await flush();
  assert.equal(posts.length, 1); assert.equal(posts[0].u, '/api/me/sess/kill-one'); assert.equal(posts[0].body.sid, S2);
});
