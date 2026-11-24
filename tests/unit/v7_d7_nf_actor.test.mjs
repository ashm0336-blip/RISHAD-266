/* V7 · د7 (البند ٨) — لا يُنبَّه أحدٌ بفعلٍ قام به هو، في كل الأنواع، في الخادم والعميل.
   · الحكمُ من السجلّ (NF_TYPES.when): نوعٌ «فور …» غيرُ أمني ⇒ يُحجب عن فاعله؛ الأمانُ (sc_*) والشرطيُّ والزمنيّ
     (sy_nobk · sy_sync · task_late · st_gap · bx_old …) يبقيان لأن author_key فيهما من صادف الطلب.
   · الخادم: القائمةُ والعدّاداتُ (nfFeedRows) وعدُّ المستلمين (nfTargetHit) — لكل نوعٍ في السجلّ + bc_dept.
   · العميل: 441 list() (ومنه التوست والشارة) بالقاعدة نفسها، على نسخةٍ محفوظة فيها رسائلُ الفاعل.
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

async function load() {
  const src = fs.readFileSync(WORKER, 'utf8');
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'nfact-')), f = path.join(dir, 'w.mjs');
  fs.writeFileSync(f, src + '\nexport { initDb, kvPutStmts, NF_TYPES, nfTargetHit, nfActorType, nfSelfAct, opLegacyPrepare, opGuardRetired };\n');
  try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const D = 'TEST_ONLY_D', NOW = Date.now() - 60000;
const EXEMPT = ['sc_dev', 'sc_fail', 'sc_pw', 'sc_kill', 'sc_deny', 'sc_guard', 'sc_policy', 'sc_rk', 'sy_nobk', 'sy_sync', 'task_late', 'st_gap', 'bx_old', 'cu_late', 'task_soon', 'bc_rem'];
const ACTOR = ['emp_add', 'emp_edit', 'emp_del', 'emp_imp', 'acct_on', 'acct_pw', 'task_new', 'task_done', 'cu_out', 'st_shift', 'pl_place', 'rep_pull', 'rn_close', 'bx_new', 'aw_new', 'pm_chg', 'sy_dept', 'sy_bk', 'bc_new', 'bc_dept'];

async function world(W) {
  const DB = new D1Shim();
  const env = { DB, KIVO_AUTHZ_MODE: 'enforce', ASSETS: { fetch: async () => new Response('<!doctype html><html><head><!--BS_BOOT--></head><body>TEST_ONLY</body></html>', { headers: { 'Content-Type': 'text/html' } }) } };
  await W.initDb(env); DB.exec('PRAGMA foreign_keys = ON');
  const ph = 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64);
  const users = [{ id: 'TEST_ONLY_super', un: '1000000001', name: 'TEST_ONLY super', role: 'super', ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_m', un: '1100000000', name: 'TEST_ONLY mgr', role: 'staff', deptId: D, ekey: 'mgr:' + D, mgr: 1, ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_u', un: '1200000000', name: 'TEST_ONLY emp', role: 'staff', deptId: D, ekey: 'TEST_ONLY_e', ph, mc: 0, dis: 0 }];
  const cap = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan', 'planning', 'irshad', 'seized', 'award', 'links', 'help', 'rasd'];
  const keys = { bassam_auth_users_v1: users, bassam_gdepts_v1: [], bassam_depts_v1: [{ id: D, name: 'TEST_ONLY dept' }],
    bassam_perms_v1: { caps: { [D]: cap }, emps: {} }, bassam_platform_v1: {}, ['bsdept:' + D + ':bassam_employees_v1']: [{ eid: 'TEST_ONLY_e', name: 'TEST_ONLY emp', nid: '1200000000' }] };
  const st = [];
  for (const [k, v] of Object.entries(keys)) { st.push(...W.kvPutStmts(env, 'kv', k, JSON.stringify(v))); st.push(DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1)').bind(k)); }
  st.push(DB.prepare("INSERT INTO meta(k,v) VALUES('rev','1') ON CONFLICT(k) DO UPDATE SET v='1'"), DB.prepare("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'"));
  for (const [k, uid] of Object.entries({ super: 'TEST_ONLY_super', m: 'TEST_ONLY_m', u: 'TEST_ONLY_u' })) st.push(DB.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city) VALUES(?1,?2,?3,?3,?4,?5)').bind('TEST_ONLY_s_' + k, uid, NOW, 'TEST_ONLY', 'TEST_ONLY'));
  await DB.batch(st);
  await installOperationalFixture(env, W);
  const types = Object.keys(W.NF_TYPES).concat(['bc_dept']);
  const ins = DB.db.prepare("INSERT INTO notification_messages(scope,id,kind,department,type,category,priority,channel,title,body,created_at,author_key,preview,target_mode) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  const tg = DB.db.prepare('INSERT INTO notification_targets(scope,message_id,kind,value) VALUES(?,?,?,?)');
  DB.db.exec('BEGIN');
  let n = 0;
  /* لكل نوع: رسالةٌ كتبها المديرُ (بمفتاحه ekey)، وأخرى الموظفُ (بمعرّف حسابه id)، وثالثةٌ مسؤولُ المنصة، ورابعةٌ لغيرهم — كلٌّ إلى الجميع */
  for (const type of types) for (const by of ['mgr:' + D, 'TEST_ONLY_u', 'TEST_ONLY_super', 'TEST_ONLY_other']) {
    const id = 'TEST_ONLY_n' + (n++), cat = (W.NF_TYPES[type] && W.NF_TYPES[type].k) || 'bc';
    ins.run('d:' + D, id, 'event', D, type, cat, 'info', 'bell', 'TEST_ONLY ' + type + ' ' + by, 'TEST_ONLY', NOW - n * 1000, by, 0, 'message');
    tg.run('d:' + D, id, 'role', 'all'); tg.run('d:' + D, id, 'employee', 'TEST_ONLY_e'); tg.run('d:' + D, id, 'employee', 'mgr:' + D);
  }
  /* معاينةُ التعميم لنفسك مقصودةٌ له */
  ins.run('d:' + D, 'TEST_ONLY_prev', 'event', D, 'bc_dept', 'bc', 'info', 'toast', 'TEST_ONLY preview', 'TEST_ONLY', NOW, 'mgr:' + D, 1, 'message');
  tg.run('d:' + D, 'TEST_ONLY_prev', 'employee', 'mgr:' + D);
  DB.db.exec('COMMIT');
  return { env, types };
}
async function feed(W, env, who, q = '') {
  const get = async (extra) => {
    const r = await W.default.fetch(new Request('http://x/api/notifications?limit=200' + q + extra, { headers: { Cookie: 'bs_tok=TEST_ONLY_s_' + who } }), env, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(r.status, 200, who + ' feed');
    return await r.json();
  };
  const j = await get('');
  let next = j.next;
  while (next) { const p = await get('&cursor=' + encodeURIComponent(next)); j.items = j.items.concat(p.items); next = p.next; }
  return j;
}

test('د7 ٨ · registry rule: «فور …» non-security types are actor-suppressed; security, conditional and timed events are exempt', async () => {
  const W = await load();
  for (const t of EXEMPT) assert.equal(W.nfActorType(t), false, t + ' is exempt (automatic / security)');
  for (const t of ACTOR) assert.equal(W.nfActorType(t), true, t + ' happens upon someone\'s action');
  for (const [t, T] of Object.entries(W.NF_TYPES)) assert.equal(W.nfActorType(t), T.k !== 'sec' && /^فور/.test(T.when), t + ' follows its registry «when»');
});

test('د7 ٨ · server feed + counters: for EVERY type the actor does not get his own notification, others still do', { timeout: 300000 }, async () => {
  const W = await load(), { env, types } = await world(W);
  /* ثلاثة قرّاء: المدير (كتب بمفتاحه ekey) · الموظف (كتب بمعرّف حسابه id) · مسؤول المنصة (كتب بمعرّفه) */
  const V = { m: ['mgr:' + D, ''], u: ['TEST_ONLY_u', ''], super: ['TEST_ONLY_super', '&dept=' + D] };
  const covered = new Set();
  const has = (j, type, by) => j.items.some((x) => x.type === type && x.by === by && !x.test);
  for (const [who, [self, q]] of Object.entries(V)) {
    const j = await feed(W, env, who, q);
    for (const type of types) {
      if (!has(j, type, 'TEST_ONLY_other')) continue;   /* نوعٌ لا يراه هذا القارئ أصلاً */
      covered.add(type);
      const actor = W.nfActorType(type);
      assert.equal(has(j, type, self), !actor, who + ' · ' + type + ': ' + (actor ? 'does not see' : 'still sees') + ' his own event');
      for (const other of Object.values(V).map((x) => x[0]).filter((x) => x !== self))
        if (who !== 'u' || other !== 'TEST_ONLY_super') assert.equal(has(j, type, other), true, who + ' · ' + type + ': sees ' + other + '\'s event');
    }
    /* العدّاد = القائمة (الشرطُ نفسُه) */
    const sm = await feed(W, env, who, q + '&summary=1');
    assert.equal(sm.total, j.items.length, who + ': counters exclude the same rows as the list');
    if (who === 'm') assert.ok(j.items.some((x) => x.test), 'the self-preview broadcast still reaches its author');
  }
  assert.deepEqual(types.filter((t) => !covered.has(t)), [], 'every type is checked by at least one reader');
});

test('د7 ٨ · recipient counting (nfTargetHit) skips the actor for actor types only', async () => {
  const W = await load();
  const A = { u: { id: 'TEST_ONLY_super', role: 'super' }, users: [], depts: [{ id: D }], gdepts: [], nodes: [], perms: { caps: {}, emps: {} } };
  const me = { id: 'TEST_ONLY_m', ekey: 'mgr:' + D, role: 'staff', deptId: D, mgr: 1 };
  const bc = (type, by) => ({ kind: 'broadcast', target_mode: 'all', type, author_key: by, preview: 0 });
  assert.equal(W.nfTargetHit(A, bc('bc_new', 'mgr:' + D), [], me, {}), false, 'the author of a broadcast is not its recipient');
  assert.equal(W.nfTargetHit(A, bc('bc_new', 'TEST_ONLY_super'), [], me, {}), true, 'another person\'s broadcast is counted');
  assert.equal(W.nfTargetHit(A, bc('bc_new', 'TEST_ONLY_m'), [], me, {}), false, 'matched by account id too');
  for (const t of Object.keys(W.NF_TYPES)) assert.equal(W.nfSelfAct({ type: t, author_key: 'mgr:' + D, preview: 0 }, me), W.nfActorType(t), t);
  assert.equal(W.nfSelfAct({ type: 'bc_dept', author_key: 'mgr:' + D, preview: 1 }, me), false, 'a self preview is kept');
});

test('د7 ٨ · client 441 list(): the actor\'s own items are not shown (and so not toasted), for every type', async () => {
  const W = await load();
  const user = { id: 'TEST_ONLY_uid', ekey: 'TEST_ONLY_ekey', role: 'staff', deptId: 'TEST_ONLY_department', name: 'TEST_ONLY actor' };
  const types = Object.keys(W.NF_TYPES).concat(['bc_dept']);
  const items = [];
  types.forEach((t, i) => ['TEST_ONLY_ekey', 'TEST_ONLY_uid', 'TEST_ONLY_other'].forEach((by, j) =>
    items.push({ id: 'nf:TEST_ONLY_' + i + '_' + j, type: t, k: (W.NF_TYPES[t] || { k: 'bc' }).k, t: 'TEST_ONLY', b: 'TEST_ONLY', at: Date.now() - 1000 - i, un: true, acked: false, by, dept: 'TEST_ONLY_department' })));
  items.push({ id: 'nf:TEST_ONLY_prev', type: 'bc_dept', k: 'bc', t: 'TEST_ONLY', b: 'TEST_ONLY', at: Date.now() - 5, un: true, by: 'TEST_ONLY_ekey', test: 1, dept: 'TEST_ONLY_department' });
  const body = { ok: 1, rev: 1, configRev: 1, broadcastRev: 1, items, counters: { total: items.length, unread: items.length, actionable: 0, urgentUnread: 0, pendingAck: 0, unreadAll: items.length, byKind: {} }, next: '', cfg: { t: {} } };
  const KIVO = { BassamAuth: { user: () => user, users: () => [user] }, BassamDepts: { active: () => user.deptId, list: () => [{ id: user.deptId, name: 'TEST_ONLY' }], raw: { allKeys: () => [] } }, BassamPerm: { can: () => true, on: () => true } };
  class Storage { constructor() { this.m = new Map(); } getItem(k) { return this.m.get(k) ?? null; } setItem(k, v) { this.m.set(k, String(v)); } }
  const ctx = { KIVO, Storage, localStorage: new Storage(), __BS_BOOT: { srv: 1, cf: 1, uid: user.id }, Response, Request, URL, URLSearchParams, AbortController, TextEncoder, TextDecoder,
    console: { log() {}, warn() {}, error() {} }, navigator: { userAgent: 'TEST_ONLY' }, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } }, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true, document: { addEventListener() {} } };
  ctx.window = ctx;
  ctx.fetch = async (url) => { const more = String(url).includes('cursor='); const page = Object.assign({}, body, { items: more ? items.slice(200) : items.slice(0, 200), next: more ? '' : 'TEST_ONLY_cursor' });
    return new Response(JSON.stringify(page), { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  vm.createContext(ctx);
  for (const file of ['441-notif-core.js', '442-notif-observer.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services', file), 'utf8'), ctx, { filename: file });
  const N = KIVO.BassamNotif, I = KIVO.__BS_I.notif;
  const r0 = await N.refresh(); assert.equal(r0.ok, 1, JSON.stringify(r0));
  const r1 = await N.loadMore(); assert.equal(r1.ok, 1, JSON.stringify(r1));
  const shown = N.list();
  for (const t of types) {
    const actor = W.nfActorType(t);
    assert.equal(I.actorType(t), actor, t + ': the client rule equals the server rule');
    for (const by of ['TEST_ONLY_ekey', 'TEST_ONLY_uid']) assert.equal(shown.some((x) => x.type === t && x.by === by && !x.test), !actor, t + ' by ' + by);
    assert.ok(shown.some((x) => x.type === t && x.by === 'TEST_ONLY_other'), t + ': another person\'s item stays');
  }
  assert.ok(shown.some((x) => x.test), 'the self preview stays');
  assert.equal(N.unread(), shown.length, 'the unread badge follows the same rule');
});
