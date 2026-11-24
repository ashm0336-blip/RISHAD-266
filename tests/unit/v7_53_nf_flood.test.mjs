/* V7 · 53 — سيلُ التنبيهات من الجدول الشهري (FIX_53_LIVEQA ١ · ٣ · ١٤ · FIX_53_SCALE S12)، على العامل الحقيقي والعميل الحقيقي (441 · 442):
   الفاعلُ يحفظ الجدول (حدث bassam:operations-commit كما يطلقه 280) ← مراقبُ 442 يستنتج الأحداث ← 441 يرسلها ← مسارُ /api/notifications/act في العامل.
   (١) إسنادٌ جماعي لـ500 موظف (365 منهم كانت لهم وردية — دليلُ الفحص الحي): مديرُ الوحدة يستلم تنبيهاً مجمّعاً واحداً (أو لا شيء إن كان هو الفاعل —
       استثناءُ الفاعل د7 (ج) ٨ في الخادم وفي 441 list()) · كلُّ موظفٍ أُسندت إليه ورديةٌ تنبيهٌ واحد هو ورديتُه · لا شيء لمن لم تُسند إليه.
   (٣) تغييرٌ مفرد: المديرُ تنبيهٌ باسم الموظف كما كان، والموظفُ ورديتُه — بلا «من —».
   (S12) ملءُ شهرٍ مضى (قبل سنتين): لا «نشر جدول شهر جديد» ولا شيء للموظفين — تنبيهٌ واحد «تحديث جدول شهر سابق» للمدير.
   بيانات TEST_ONLY في SQLite بالذاكرة (D1Shim) — بلا شبكة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { D1Shim, WORKER, ROOT } from './harness.mjs';
import { installOperationalFixture } from './operational_legacy_seed_fx.mjs';

const D = 'TEST_ONLY_D', N = 500, OLD = 365, NOW = Date.now() - 60000;
const SH1 = 'الوردية الأولى', SH2 = 'الوردية الثانية';
const ek = (i) => 'TEST_ONLY_e' + i;
const ST = /^st_/;

async function load() {
  const src = fs.readFileSync(WORKER, 'utf8');
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'nfflood-')), f = path.join(dir, 'w.mjs');
  fs.writeFileSync(f, src + '\nexport { initDb, kvPutStmts, opLegacyPrepare, opGuardRetired };\n');
  try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
async function world(W) {
  const DB = new D1Shim();
  const env = { DB, KIVO_AUTHZ_MODE: 'enforce', ASSETS: { fetch: async () => new Response('<!doctype html><html><head><!--BS_BOOT--></head><body>TEST_ONLY</body></html>', { headers: { 'Content-Type': 'text/html' } }) } };
  await W.initDb(env); DB.exec('PRAGMA foreign_keys = ON');
  const ph = 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64);
  const users = [{ id: 'TEST_ONLY_super', un: '1000000001', name: 'TEST_ONLY مسؤول', role: 'super', ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_m', un: '1100000000', name: 'TEST_ONLY مدير', role: 'staff', deptId: D, ekey: 'mgr:' + D, mgr: 1, ph, mc: 0, dis: 0 }];
  const emps = [];
  for (let i = 0; i <= N; i++) {   /* e0…e499 يُسند إليهم · e500 لا يُسند إليه */
    emps.push({ eid: ek(i), name: 'TEST_ONLY موظف ' + i, nid: String(1200000000 + i) });
    users.push({ id: 'TEST_ONLY_u' + i, un: String(1200000000 + i), name: 'TEST_ONLY موظف ' + i, role: 'staff', deptId: D, ekey: ek(i), ph, mc: 0, dis: 0 });
  }
  const cap = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan', 'planning', 'irshad', 'seized', 'award', 'links', 'help', 'rasd'];
  const keys = { bassam_auth_users_v1: users, bassam_gdepts_v1: [], bassam_depts_v1: [{ id: D, name: 'TEST_ONLY إدارة' }],
    bassam_perms_v1: { caps: { [D]: cap }, emps: {} }, bassam_platform_v1: {}, ['bsdept:' + D + ':bassam_employees_v1']: emps };
  const st = [];
  for (const [k, v] of Object.entries(keys)) { st.push(...W.kvPutStmts(env, 'kv', k, JSON.stringify(v))); st.push(DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1)').bind(k)); }
  st.push(DB.prepare("INSERT INTO meta(k,v) VALUES('rev','1') ON CONFLICT(k) DO UPDATE SET v='1'"), DB.prepare("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'"));
  const sess = { super: 'TEST_ONLY_super', m: 'TEST_ONLY_m' };
  for (const i of [0, 1, 364, 365, 499, 500]) sess['u' + i] = 'TEST_ONLY_u' + i;
  for (const [k, uid] of Object.entries(sess)) st.push(DB.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city) VALUES(?1,?2,?3,?3,?4,?5)').bind('TEST_ONLY_s_' + k, uid, NOW, 'TEST_ONLY', 'TEST_ONLY'));
  await DB.batch(st);
  await installOperationalFixture(env, W);
  return { env, users, emps };
}
const call = (W, env, who, url, init = {}) => W.default.fetch(new Request('http://x' + url, Object.assign({}, init, { headers: Object.assign({ Cookie: 'bs_tok=TEST_ONLY_s_' + who }, init.headers || {}) })), env, { waitUntil() {}, passThroughOnException() {} });
async function feed(W, env, who) {
  let items = [], cursor = '';
  for (;;) {
    const r = await call(W, env, who, '/api/notifications?limit=200' + (who === 'super' ? '&dept=' + D : '') + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    assert.equal(r.status, 200, who + ' feed'); const j = await r.json();
    items = items.concat(j.items); if (!j.next) return items; cursor = j.next;
  }
}
/* العميلُ الحقيقي في vm: الفاعلُ `actor` (super أو m) · fetch يصل العاملَ بجلسته */
function client(W, env, world, actor) {
  const u = world.users.find((x) => x.id === (actor === 'super' ? 'TEST_ONLY_super' : 'TEST_ONLY_m'));
  const user = Object.assign({}, u); delete user.ph;
  const ls = {};
  const KIVO = { BassamAuth: { user: () => user, users: () => [user] }, BassamDepts: { active: () => D, list: () => [{ id: D, name: 'TEST_ONLY إدارة' }], raw: { allKeys: () => [] } },
    BassamPerm: { can: () => true, on: () => true },
    __BS_SRV: { operations: { resources: ['bassam_staffing_v3', 'bassam_employees_v1'], reference: (k) => (/bassam_employees_v1$/.test(k) ? world.emps : null) } } };
  class Storage { constructor() { this.m = new Map(); } getItem(k) { return this.m.get(k) ?? null; } setItem(k, v) { this.m.set(k, String(v)); } }
  const ctx = { KIVO, Storage, localStorage: new Storage(), __BS_BOOT: { srv: 1, cf: 1, uid: user.id }, Response, Request, URL, URLSearchParams, AbortController, TextEncoder, TextDecoder, Intl, Date,
    console: { log() {}, warn() {}, error() {} }, navigator: { userAgent: 'TEST_ONLY' },
    setTimeout: (fn, ms) => (ms ? 0 : setImmediate(fn)), clearTimeout() {}, setInterval: () => 0,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    addEventListener(type, fn) { (ls[type] = ls[type] || []).push(fn); }, removeEventListener() {}, dispatchEvent: () => true, document: { addEventListener() {} } };
  ctx.window = ctx;
  ctx.fetch = async (url, init) => call(W, env, actor, String(url), init || {});
  vm.createContext(ctx);
  for (const file of ['src/services/440-count.js', 'src/i18n/385-calendar.js', 'src/services/441-notif-core.js', 'src/services/442-notif-observer.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
  let seq = 0;
  return {
    N: KIVO.BassamNotif, I: KIVO.__BS_I.notif, KIVO,
    async save(before, after) {
      const n0 = msgCount(env);
      for (const fn of ls['bassam:operations-commit'] || []) fn({ detail: { uid: user.id, dept: D, requestId: 'TEST_ONLY_rq' + (seq++), changes: [{ key: 'bsdept:' + D + ':bassam_staffing_v3', before: JSON.stringify(before), after: JSON.stringify(after) }] } });
      /* يُفرَّغ الطابور (100 حدث للدفعة) حتى يستقرّ عددُ الرسائل */
      let last = -1, still = 0;
      for (let i = 0; i < 400 && still < 25; i++) { await new Promise((r) => setImmediate(r)); const c = msgCount(env); still = c === last ? still + 1 : 0; last = c; }
      return env.DB.q('SELECT scope,id,type,body,author_key FROM notification_messages ORDER BY created_at,id').slice(n0);
    },
  };
}
const msgCount = (env) => env.DB.q('SELECT COUNT(*) n FROM notification_messages')[0].n;
const targets = (env, ids) => env.DB.q('SELECT message_id,kind,value FROM notification_targets').filter((t) => ids.includes(t.message_id));
/* شهرُ اليوم الهجري (أم القرى) كما يحسبه العميل، وشهرٌ قبل سنتين */
/* V7 · 53 تقويم: أشهرُ الجدول ميلاديةٌ «YYYY-MM» على يوم المراقب الميلادي (442 todayKey) */
function months(ctxKIVO) { const h = ctxKIVO.BassamCal.gAt(new Date()); return { cur: h.ym, past: ctxKIVO.BassamCal.gYm(h.y - 2, h.m) }; }
const row = (shift) => ({ shift, rest: [] });

async function bulkCase(actor) {
  const W = await load(), w = await world(W), C = client(W, w.env, w, actor), M = months(C.KIVO);
  /* 365 موظفاً لهم الوردية الثانية — والباقون (135) بلا صف بعد · الفعلُ: الوردية الأولى للـ500 */
  const before = { [M.cur]: {} }, after = { [M.cur]: {} };
  for (let i = 0; i < N; i++) { if (i < OLD) before[M.cur][ek(i)] = row(SH2); after[M.cur][ek(i)] = row(SH1); }
  const sent = await C.save(before, after);
  return { W, w, C, M, sent };
}

test('53 · ١ + ٣: bulk assignment of 500 by the platform administrator → the unit manager gets ONE grouped notice; every employee exactly one (his own shift); the unassigned employee nothing', { timeout: 600000 }, async () => {
  const { W, w, sent } = await bulkCase('super');
  const env = w.env;
  assert.ok(sent.length > 0, 'the watcher emitted');
  /* مدير الوحدة */
  const mi = (await feed(W, env, 'm')).filter((x) => ST.test(x.type));
  assert.equal(mi.length, 1, 'the unit manager gets one notice, not one per employee: ' + mi.length + ' ' + JSON.stringify(mi.slice(0, 3).map((x) => x.type + ' ' + x.b)));
  assert.equal(mi[0].type, 'st_shiftm');
  assert.match(mi[0].b, new RegExp('^أُسندت ' + SH1 + ' لـ500 موظف في جدول .+ — بواسطة TEST_ONLY مسؤول$'), mi[0].b);
  /* كلُّ موظف: تنبيهٌ واحد هو ورديتُه — من أهداف الرسائل المرسلة (الـ500 كلُّهم) ومن القائمة الفعلية (عيّنة) */
  const ids = sent.map((m) => m.id), tg = targets(env, ids), per = {};
  for (const t of tg.filter((t) => t.kind === 'employee')) per[t.value] = (per[t.value] || 0) + 1;
  for (let i = 0; i < N; i++) assert.equal(per[ek(i)], 1, ek(i) + ' is targeted exactly once');
  assert.equal(per[ek(500)], undefined, 'the employee outside the action is not targeted');
  for (const i of [0, 1, 364, 365, 499]) {
    const its = (await feed(W, env, 'u' + i)).filter((x) => ST.test(x.type));
    assert.equal(its.length, 1, 'u' + i + ': exactly one: ' + JSON.stringify(its.map((x) => x.type + ' ' + x.b)));
    assert.equal(its[0].type, 'st_myshift'); assert.match(its[0].b, new RegExp('^ورديتك في جدول .+: ' + SH1 + ' — بواسطة TEST_ONLY مسؤول$'), its[0].b);
  }
  assert.deepEqual((await feed(W, env, 'u500')).filter((x) => ST.test(x.type)), [], 'nothing to the employee it does not concern');
  /* لا رسالةَ تجمع الموظفَ والمديرَ: رسالةُ الموظف بلا هدف دور */
  for (const m of sent.filter((m) => m.type === 'st_myshift')) assert.deepEqual(tg.filter((t) => t.message_id === m.id && t.kind === 'role'), [], 'an own notice has no role target');
});

test('53 · ١ (د7 (ج) ٨ on this path): the unit manager himself does the bulk → he gets NOTHING (server feed and client 441 list()); each employee still exactly one', { timeout: 600000 }, async () => {
  const { W, w, C, sent } = await bulkCase('m');
  const env = w.env;
  assert.ok(sent.length > 0 && sent.length <= 10, 'a handful of messages, not one per employee: ' + sent.length);
  assert.deepEqual((await feed(W, env, 'm')).filter((x) => ST.test(x.type)).map((x) => x.type), [], 'the actor is not notified of his own action (server)');
  const r = await C.N.refresh(); assert.equal(r.ok, 1, JSON.stringify(r));
  assert.deepEqual(C.N.list().filter((x) => ST.test(x.type)).map((x) => x.type), [], 'the actor is not notified of his own action (client list)');
  for (const i of [0, 499]) assert.equal((await feed(W, env, 'u' + i)).filter((x) => x.type === 'st_myshift').length, 1, 'u' + i);
  const sup = (await feed(W, env, 'super')).filter((x) => ST.test(x.type));
  assert.ok(sup.length <= 1, 'the platform administrator at most one: ' + sup.length);
});

test('53 · ٣ + ١٤: a single change — the manager is told by name «من بلا وردية» (never «من —»), the employee his own shift', { timeout: 300000 }, async () => {
  const W = await load(), w = await world(W), C = client(W, w.env, w, 'super'), M = months(C.KIVO);
  const before = { [M.cur]: { [ek(0)]: { rest: ['الجمعة'] }, [ek(1)]: row(SH2) } }, after = { [M.cur]: { [ek(0)]: { rest: ['الجمعة'], shift: SH1 }, [ek(1)]: row(SH1) } };
  await C.save(before, after);
  const mi = (await feed(W, w.env, 'm')).filter((x) => x.type === 'st_shift').map((x) => x.b).sort();
  assert.equal(mi.length, 2, JSON.stringify(mi));
  for (const b of mi) assert.doesNotMatch(b, /من —|—\s*إلى|\(\s*\)/, b);
  assert.ok(mi.some((b) => b.includes('TEST_ONLY موظف 0') && b.includes('من بلا وردية إلى ' + SH1)), JSON.stringify(mi));
  assert.ok(mi.some((b) => b.includes('TEST_ONLY موظف 1') && b.includes('من ' + SH2 + ' إلى ' + SH1)), JSON.stringify(mi));
  for (const i of [0, 1]) assert.equal((await feed(W, w.env, 'u' + i)).filter((x) => x.type === 'st_myshift').length, 1, 'u' + i);
});

test('53 · S12: back-filling a month two years old → no «نشر جدول شهر جديد», nothing to employees, ONE «تحديث جدول شهر سابق» to the manager', { timeout: 600000 }, async () => {
  const W = await load(), w = await world(W), C = client(W, w.env, w, 'super'), M = months(C.KIVO);
  const after = { [M.past]: {} }; for (let i = 0; i < N; i++) after[M.past][ek(i)] = row(SH1);
  await C.save({}, after);                                   /* شهرٌ ماضٍ يُنشر */
  const edit = JSON.parse(JSON.stringify(after)); for (let i = 0; i < 400; i++) edit[M.past][ek(i)] = row(SH2);
  await C.save(after, edit);                                 /* ثم يُعدَّل بالجملة */
  const mi = (await feed(W, w.env, 'm')).filter((x) => ST.test(x.type));
  assert.equal(mi.filter((x) => x.type === 'st_pub').length, 0, 'a past month is not «a new month published»: ' + JSON.stringify(mi.map((x) => x.type + ' ' + x.b).slice(0, 3)));
  assert.deepEqual(mi.map((x) => x.type), ['st_past', 'st_past'], 'one notice per save to the manager');
  for (const x of mi) assert.match(x.b, /^حُدّث جدول شهر سابق: .+ — (500|400) موظف · بواسطة TEST_ONLY مسؤول$/, x.b);
  for (const i of [0, 499]) assert.deepEqual((await feed(W, w.env, 'u' + i)).filter((x) => ST.test(x.type)), [], 'no employee notice for a past month (u' + i + ')');
  /* شهرُ اليوم يُنشر: النشرُ للمدير كما كان، وكلُّ موظف ورديتُه */
  const now = { [M.cur]: {} }; for (let i = 0; i < 10; i++) now[M.cur][ek(i)] = row(SH1);
  await C.save({}, now);
  const m2 = (await feed(W, w.env, 'm')).filter((x) => x.type === 'st_pub'); assert.equal(m2.length, 1);
  assert.equal((await feed(W, w.env, 'u0')).filter((x) => x.type === 'st_myshift').length, 1, 'publishing the current month tells the employee his shift');
});

/* V7 · 53 (قرار المالك REPLY_53_1): إلغاءُ وردية الموظف يُبلَّغ به هو وحده «أُلغيت ورديتك …»؛ ومن خمسة إلغاءات في حفظٍ واحد للمدير تنبيهٌ مجمّعٌ واحد؛ والفاعلُ لا شيء */
test('53 · ٣ (removal): removing the shift of 500 → each employee exactly one «أُلغيت ورديتك …»; the manager ONE grouped notice (none when he is the actor); two removals → the two employees only', { timeout: 600000 }, async () => {
  for (const actor of ['super', 'm']) {
    const W = await load(), w = await world(W), C = client(W, w.env, w, actor), M = months(C.KIVO);
    const before = { [M.cur]: {} }, after = { [M.cur]: {} };
    for (let i = 0; i < N; i++) { before[M.cur][ek(i)] = row(SH1); after[M.cur][ek(i)] = { shift: '', rest: [] }; }
    before[M.cur][ek(500)] = { rest: [] }; after[M.cur][ek(500)] = { rest: [] };   /* بلا وردية من قبل: لا يعنيه شيء */
    const sent = await C.save(before, after);
    assert.ok(sent.length > 0 && sent.length <= 5, actor + ': a handful of messages: ' + sent.length);
    const mi = (await feed(W, w.env, 'm')).filter((x) => ST.test(x.type));
    if (actor === 'super') {
      assert.deepEqual(mi.map((x) => x.type), ['st_unshiftm'], 'the manager: one grouped notice');
      assert.match(mi[0].b, new RegExp('^أُلغيت ' + SH1 + ' لـ500 موظف في جدول .+ — بواسطة TEST_ONLY مسؤول$'), mi[0].b);
    } else assert.deepEqual(mi, [], 'the actor gets nothing');
    const ids = sent.map((m) => m.id), per = {};
    for (const t of targets(w.env, ids).filter((t) => t.kind === 'employee')) per[t.value] = (per[t.value] || 0) + 1;
    for (let i = 0; i < N; i++) assert.equal(per[ek(i)], 1, actor + ': ' + ek(i));
    assert.equal(per[ek(500)], undefined);
    for (const i of [0, 499]) {
      const its = (await feed(W, w.env, 'u' + i)).filter((x) => ST.test(x.type));
      assert.deepEqual(its.map((x) => x.type), ['st_unshift'], actor + ' u' + i);
      assert.match(its[0].b, new RegExp('^أُلغيت ورديتك في جدول .+ \\(' + SH1 + '\\) — بواسطة '), its[0].b);
    }
    assert.deepEqual((await feed(W, w.env, 'u500')).filter((x) => ST.test(x.type)), []);
  }
  /* إلغاءان: لصاحبيهما وحدهما، ولا شيء للمدير */
  const W = await load(), w = await world(W), C = client(W, w.env, w, 'super'), M = months(C.KIVO);
  await C.save({ [M.cur]: { [ek(0)]: row(SH1), [ek(1)]: row(SH2) } }, { [M.cur]: { [ek(0)]: { shift: '', rest: [] } } });
  assert.deepEqual((await feed(W, w.env, 'm')).filter((x) => ST.test(x.type)), [], 'below five: nothing to the manager');
  for (const i of [0, 1]) assert.equal((await feed(W, w.env, 'u' + i)).filter((x) => x.type === 'st_unshift').length, 1, 'u' + i);
});
