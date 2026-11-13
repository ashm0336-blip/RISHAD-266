/* RISHAD V7 · owner-approved wording of the «sc_deny» bell notification (the refused-write notice of the platform administrator).

   Before: «محاولة كتابة مرفوضة من الخادم» · «رفض الخادم كتابة bsdept:<unit>:bassam_rounds_v1 من — السبب: perm» — a storage key, a reason
   code, and an EMPTY name: the notice printed sec.un, which most logging sites do not write (019e atomic save · 019a custody ·
   020 dstats · 019 notifications route) and which is the login number, never the person's name, where it is written (047 · 054 · 070).

   Now (binding wording):
     title «محاولة تعديل مرفوضة»
     body  «حاول {الاسم} ({الدور} — {الإدارة}) {الفعل} «{السجل}» في صفحة «{الصفحة}»، ورُفض الطلب: {السبب}.»
   • the actor is resolved from sec.uid at poll time (name · role · unit); unresolvable → «حساب غير معروف»; unit gone → «إدارة محذوفة»
   • Arabic only in the bell: no storage key, no reason code, no Latin identifier. The security log keeps both, byte for byte.
   • grouping: rows of the same actor (uid) + same record (target) + same reason (detail) whose timestamp is within 60 000 ms of the
     FIRST row of their group, inside one poll batch, are one notice «(٥ محاولات خلال دقيقة)». Its dedup key is security:<id of the
     first row> — the same key that row had before, so nothing already emitted is emitted again.

   Real worker, real routes, both authorization modes, synthetic data only (TEST_ONLY · tests/fixtures/gen_fixture.py + tasks_fx.mjs).
   The poll ignores accounts whose id starts with «tst_», so two accounts are cloned from the fixture under other ids. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as acorn from 'acorn';
import { world, stored, putKV, operationSaveBody, taskCommandBody, workerUnderTest, D, KE, KT, DAY, ME } from './tasks_fx.mjs';
import { TEST_SUPER_USERNAME, ROOT, SRC } from './harness.mjs';

const WU = workerUnderTest();
const KR = 'bsdept:' + D + ':bassam_rounds_v1', KRETRO = 'bsdept:' + D + ':bassam_irshad_retro_v1', KCU = 'bsdept:' + D + ':bassam_custody_v1';
const KNF = 'bassam_notifications_domain_v1', KDS = 'bassam_dstats_v1', KPLAT = 'bassam_platform_v1';
const UNIT = 'إدارة الحشود', EMP = 'خالد الحربي', MGR = 'سعد العتيبي';
const TITLE = 'محاولة تعديل مرفوضة', GENERIC = 'رفضه الخادم';
const TEMPLATE = 'حاول {الاسم} ({الدور} — {الإدارة}) {الفعل} «{السجل}» في صفحة «{الصفحة}»، ورُفض الطلب: {السبب}.';
const pbkdf2 = (pw, uid) => { const salt = crypto.createHash('sha256').update('v7-nf-deny|' + uid).digest().subarray(0, 16); return 'p2$100000$' + salt.toString('hex') + '$' + crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex'); };
/* no storage key, no reason code, no Latin identifier, no western digit, in what the bell shows */
const arabicOnly = (s, what) => { assert.doesNotMatch(s, /[A-Za-z0-9_]/, what + ' — Latin/identifier characters: ' + s); assert.doesNotMatch(s, /bsdept|bassam|:\S/, what + ': ' + s); assert.doesNotMatch(s, /\{|\}|«»|\(\s*—|—\s*\)|\s{2,}|\s،/, what + ' — unfilled template: ' + s); };

async function mk(mode) {
  const w = await world({ worker: WU.file, mode }), env = w.env;
  const U = stored(env, 'bassam_auth_users_v1');
  const clone = (from, id, un, pw, name) => { const u = JSON.parse(JSON.stringify(U.find((x) => x.id === from))); Object.assign(u, { id, un, name, ph: pbkdf2(pw, id) }); delete u.test; U.push(u); };
  clone('tst_emp1', 'nfd_emp', '0000000901', '70901', EMP);     /* staff of the unit: reads, may not write what is tried below */
  clone('tst_dm1', 'nfd_mgr', '0000000902', '70902', MGR);      /* the unit manager */
  putKV(env, 'bassam_auth_users_v1', U);
  const depts = stored(env, 'bassam_depts_v1'); depts.find((d) => d.id === D).name = UNIT; putKV(env, 'bassam_depts_v1', depts);
  const superId = U.find((u) => u.role === 'super' && u.un === TEST_SUPER_USERNAME).id;
  const ck = { emp: (await w.login('0000000901', '70901')).ck, mgr: (await w.login('0000000902', '70902')).ck, su: w.su.ck };
  const api = (who, p, o = {}) => w.C.api(p, Object.assign({}, o, { cookie: ck[who] }));
  const post = (who, p, body) => api(who, p, { method: 'POST', body });
  const rev = (k) => env.DB.q('SELECT rev FROM revs WHERE k=?', k)[0]?.rev ?? 0;
  /* a typed (Operations) save: read as the client reads, change, save with the Operations envelope → the atomic save (019e) */
  const opSave = async (who, uid, K, mutate) => {
    const g = await api(who, '/api/operations/read?' + new URLSearchParams({ uid, keys: K }));
    const v = JSON.parse(JSON.stringify(stored(env, K))); mutate(v);
    const base = g.j && g.j.base && g.j.base[K] != null ? g.j.base[K] : rev(K);
    return post(who, '/api/save', operationSaveBody(env, '/api/save', { uid, set: { [K]: JSON.stringify(v) }, del: [], base: { [K]: base } }));
  };
  const sec = () => env.DB.q("SELECT id,ts,uid,un,act,target,detail,ip,city,dev FROM sec WHERE act='denied' ORDER BY ts,id");
  const poll = async () => { const r = await post('su', '/api/notifications/act', { uid: superId, op: 'security-poll' }); assert.equal(r.status, 200, JSON.stringify(r.j)); return r.j; };
  /* every stored sc_deny notice with its dedup key */
  const bell = () => env.DB.q("SELECT m.id,m.scope,m.type,m.category,m.priority,m.channel,m.title,m.body,m.action_text,(SELECT d.once_key FROM notification_dedup d WHERE d.scope=m.scope AND d.message_id=m.id) AS once FROM notification_messages m WHERE m.type='sc_deny' ORDER BY m.created_at,m.id");
  const byRow = (id) => bell().find((m) => m.once === 'security:' + id);
  return { w, env, mode, api, post, opSave, rev, sec, poll, bell, byRow, superId, U };
}
const refused = (r, what) => assert.equal(r.status, 403, what + ': ' + JSON.stringify(r.j, (k, x) => (k === 'cur' ? undefined : x)).slice(0, 300));
const one = (x, target, uid = 'nfd_emp') => { const rows = x.sec().filter((r) => r.target === target && r.uid === uid); assert.ok(rows.length >= 1, 'a «denied» row for ' + target); return rows; };

/* ── the refusals: one per logging site that produces a refused write ── */
const SITES = {
  rounds: async (x) => refused(await x.opSave('emp', 'nfd_emp', KR, (v) => { const day = Object.keys(v).find((k) => /^\d+-\d+-\d+$/.test(k)); v[day].nfd = 1; }), 'rounds (atomic save 019e)'),
  employees: async (x) => refused(await x.opSave('emp', 'nfd_emp', KE, (v) => { v.pop(); }), 'employees (atomic save 019e)'),
  tasksRaw: async (x) => refused(await x.opSave('emp', 'nfd_emp', KT, (v) => { v[DAY] = (v[DAY] || []).slice(1); }), 'tasks raw save (atomic save 019e)'),
  /* the plain save answers 200 and names the refused key in «denied» (the other keys of a batch are still saved) */
  plain: async (x) => { const r = await x.post('emp', '/api/save', { uid: 'nfd_emp', set: { [KPLAT]: JSON.stringify({ name: 'TEST_ONLY' }) }, del: [], base: { [KPLAT]: x.rev(KPLAT) } }); assert.equal(r.j && r.j.denied && r.j.denied[KPLAT] && r.j.denied[KPLAT].why, 'super', 'plain /api/save (054): ' + JSON.stringify(r.j).slice(0, 200)); },
  custody: async (x) => refused(await x.post('emp', '/api/custody/act', { uid: 'nfd_emp', dept: D, base: 0, requestId: 'TEST_ONLY_nfd_cu', op: 'type-create', item: { name: 'TEST_ONLY', qty: 1, prefix: 'NF', color: '#123456' } }), 'custody (019a)'),
  dstats: async (x) => refused(await x.post('emp', '/api/dstats', { uid: 'nfd_emp', base: 0, data: { haram: {}, nabawi: {}, locks: {} } }), 'dstats (020)'),
  retro: async (x) => refused(await x.post('emp', '/api/retro', { res: 'irshad', dept: D, act: 'open', scope: { y: 1447, m: 1 }, hours: 1, reason: 'TEST_ONLY' }), 'retro (047)'),
  nfEmit: async (x) => refused(await x.post('emp', '/api/notifications/act', { uid: 'nfd_emp', op: 'emit', type: 'sc_deny', dept: D }), 'notifications route, POST (019)'),
};
/* 070 tkSave: in enforce «reopen» needs a reason — the manager sends none (tasks_fix265_reopen); in legacy the same call is accepted */
async function reopenNoReason(x) {
  const me = await x.w.login(ME.un, ME.pw);
  const f = await x.w.C.api('/api/me/tasks/act', { method: 'POST', cookie: me.ck, body: { k: DAY, id: 1760000000103, act: 'finish', note: 'TEST_ONLY' } });
  assert.equal(f.j && f.j.ok, 1, JSON.stringify(f.j));
  return x.post('mgr', '/api/tasks/reopen', taskCommandBody(x.env, '/api/tasks/reopen', { k: DAY, id: 1760000000103, ekey: ME.eid }));
}
/* what each refusal must read like: [record, page ('' = no page clause), verb] and the Arabic reason per stored code */
const TEXT = {
  [KR]: ['الجولات اليومية', 'المتابعة اليومية', 'تعديل'], [KE]: ['قائمة الموظفين', 'موظفو الإدارة', 'تعديل'], [KT]: ['المهام', 'المهام', 'تعديل'],
  [KPLAT]: ['إعدادات المنصة', '', 'تعديل'], [KCU]: ['عهد الموظفين', 'موظفو الإدارة', 'تعديل'], [KDS]: ['الإحصائيات اليومية', 'الإحصائيات اليومية', 'تعديل'],
  [KRETRO]: ['نافذة استدراك الاسترشاد', 'نظام الاسترشاد', 'فتح'], [KNF]: ['التنبيهات والتعاميم', '', 'الوصول إلى'],
};
const WHY = {
  page: 'صلاحيته على هذه الصفحة عرضٌ فقط', act: 'صلاحيته على هذه الصفحة لا تشمل هذا الإجراء', view: 'صلاحيته عرضٌ فقط', perm: 'صلاحيته لا تشمل هذا الإجراء',
  residual: 'تعديل غير مصنَّف رُفض احتياطاً', super: 'الإجراء لمسؤول المنصة وحده', reason: 'الإجراء يتطلب سبباً ولم يُذكر',
  'custody:type-create': 'صلاحيته لا تشمل هذا الإجراء في عهد الموظفين', 'retro.open:perm': 'لا يملك صلاحية فتح نافذة الاستدراك أو إغلاقها',
  dept: 'السجل يخصّ إدارة أخرى', 'notification-scope': 'خارج نطاقه في التنبيهات', 'notification-export-permission': 'لا يملك صلاحية تصدير التنبيهات',
};
const AR = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
const COUNT = (n) => (n === 2 ? 'محاولتان' : AR(n) + ' ' + (n % 100 >= 3 && n % 100 <= 10 ? 'محاولات' : 'محاولة'));
const sentence = (actor, row, n = 1) => {
  const t = TEXT[row.target]; assert.ok(t, 'test table knows ' + row.target); assert.ok(WHY[row.detail], 'test table knows the code ' + row.detail);
  return 'حاول ' + actor + ' ' + t[2] + ' «' + t[0] + '»' + (t[1] ? ' في صفحة «' + t[1] + '»' : '') + '، ورُفض الطلب: ' + WHY[row.detail] + (n > 1 ? ' (' + COUNT(n) + ' خلال دقيقة)' : '') + '.';
};
/* the grouping rule, written independently of the worker: rows in (ts,id) order; a row joins the open group of its
   (uid,target,detail) when its ts is within 60 000 ms of that group's FIRST row, else it opens a new group */
function groups(rows) {
  const open = new Map(), out = [];
  for (const r of rows) {
    const k = [r.uid, r.target, r.detail].join('\u0001'), g = open.get(k);
    if (g && r.ts - g.first.ts <= 60000) { g.n++; continue; }
    const ng = { first: r, n: 1 }; open.set(k, ng); out.push(ng);
  }
  return out;
}
const ACTOR = { nfd_emp: EMP + ' (موظف — ' + UNIT + ')', nfd_mgr: MGR + ' (مدير الإدارة — ' + UNIT + ')' };

for (const mode of ['legacy', 'enforce']) {
  test('V7 nf-deny · ' + mode + ': every logging site of a refused write → the bell names the actor (name · role · unit), the record, the page and an Arabic reason — no key, no code, no Latin', async () => {
    const x = await mk(mode);
    for (const k of Object.keys(SITES)) await SITES[k](x);
    const re = await reopenNoReason(x);
    if (mode === 'enforce') refused(re, 'task reopen without a reason (070 tkSave)'); else assert.equal(re.status, 200, 'legacy accepts the reopen');
    const rows = x.sec(); await x.poll();
    const G = groups(rows), B = x.bell();
    if (process.env.V7_NFD_DUMP === '1') console.log(mode + ' bell\n' + B.map((m) => m.once + ' | ' + m.title + ' | ' + m.body).join('\n'));
    assert.equal(B.length, G.length, 'one notice per group: ' + JSON.stringify(B.map((m) => m.body)));
    const seen = new Set();
    for (const g of G) {
      const m = x.byRow(g.first.id); assert.ok(m, 'a notice keyed security:' + g.first.id + ' for ' + g.first.target + ' ' + g.first.detail);
      assert.equal(m.title, TITLE);
      assert.equal(m.body, sentence(ACTOR[g.first.uid], g.first, g.n), g.first.target + ' · ' + g.first.detail);
      arabicOnly(m.title + ' ' + m.body, g.first.target);
      assert.ok(!m.body.includes(g.first.target) && !m.body.includes(D), 'no storage key');
      /* routing unchanged */
      assert.deepEqual([m.scope, m.category, m.priority, m.channel, m.action_text], ['sys', 'sec', 'act', 'bell', 'سجل الأمن']);
      seen.add(g.first.target);
    }
    /* every site was really exercised */
    for (const k of [KR, KE, KT, KPLAT, KCU, KDS, KRETRO, KNF]) assert.ok(seen.has(k), mode + ': a notice for ' + k);
    if (mode === 'enforce') assert.ok(G.some((g) => g.first.uid === 'nfd_mgr' && g.first.target === KT && g.first.detail === 'reason'), 'the 070 tkSave refusal');
    /* the owner's own example, to the letter */
    const r = rows.find((q) => q.target === KR);
    /* only the platform administrator reads it */
    const feed = async (who, uid) => (await x.api(who, '/api/notifications?' + new URLSearchParams(who === 'su' ? { uid, all: '1' } : { uid }))).j;
    const mine = (await feed('su', x.superId)).items.filter((i) => i.type === 'sc_deny');
    assert.equal(mine.length, G.length, 'the platform administrator reads them in his feed');
    for (const i of mine) { assert.equal(i.t, TITLE); arabicOnly(i.t + ' ' + i.b, 'feed item'); assert.equal(i.go, 'سجل الأمن'); assert.equal(i.srv, 1); }
    for (const [who, uid] of [['emp', 'nfd_emp'], ['mgr', 'nfd_mgr']]) assert.ok(!((await feed(who, uid)).items || []).some((i) => i.type === 'sc_deny'), who + ' does not');
  });

  test('V7 nf-deny · ' + mode + ': the security log is untouched — same rows, same key and same reason CODE as on develop; /api/sec still serves them', async () => {
    const x = await mk(mode);
    for (const k of Object.keys(SITES)) await SITES[k](x);
    /* a refused READ of the notifications route is logged as «denied» as well (not approved to change — pinned as it is) */
    refused(await x.api('emp', '/api/notifications?' + new URLSearchParams({ uid: 'nfd_emp', dept: 'tst_d2' })), 'GET feed of another unit');
    refused(await x.api('emp', '/api/notifications/export?' + new URLSearchParams({ uid: 'nfd_emp', dept: D })), 'GET export');
    const re = await reopenNoReason(x);
    const got = x.sec().map((r) => [r.uid, r.un, r.target + '|' + r.detail, r.ip, r.city, r.dev].join(' ¦ ')).sort();
    const E = (uid, un, td, dev = '') => [uid, un, td, '', '', dev].join(' ¦ ');
    const want = (mode === 'legacy'
      ? [E('nfd_emp', '', KR + '|page'), E('nfd_emp', '', KE + '|page'), E('nfd_emp', '', KT + '|act'), E('nfd_emp', '', KCU + '|custody:type-create')]
      : [E('nfd_emp', '', KR + '|residual'), E('nfd_emp', '', KE + '|perm'), E('nfd_emp', '', KT + '|perm'), E('nfd_emp', '', KCU + '|custody:type-create'),
        E('nfd_mgr', '', KT + '|reason'), E('nfd_mgr', '0000000902', KT + '|reason', 'd')])
      .concat([E('nfd_emp', '0000000901', KPLAT + '|super', 'd'), E('nfd_emp', '', KDS + '|view', 'd'), E('nfd_emp', '0000000901', KRETRO + '|retro.open:perm', 'd'),
        E('nfd_emp', '', KNF + '|notification-scope'), E('nfd_emp', '', KNF + '|notification-export-permission'), E('nfd_emp', '', KNF + '|notification-scope')]).sort();
    if (process.env.V7_NFD_DUMP === '1') console.log(mode, JSON.stringify(got, null, 1));
    assert.deepEqual(got, want, 'sec rows exactly as develop writes them');
    assert.equal(re.status, mode === 'enforce' ? 403 : 200);
    const before = JSON.stringify(x.sec()); await x.poll(); await x.poll();
    assert.equal(JSON.stringify(x.sec()), before, 'the poll writes nothing to the security log');
    /* /api/sec: the administrator still sees the technical key and the code, with the name the server resolves by uid */
    const s = await x.api('su', '/api/sec?' + new URLSearchParams({ kind: 'denied', limit: '100' })); assert.equal(s.status, 200);
    const r = s.j.rows.find((q) => q.target === KR);
    assert.deepEqual([r.uid, r.un, r.act, r.target, r.detail, r.name, r.role, r.deptId], ['nfd_emp', '', 'denied', KR, mode === 'legacy' ? 'page' : 'residual', EMP, 'staff', D]);
    assert.deepEqual(Object.keys(r).sort(), ['act', 'city', 'deptId', 'detail', 'dev', 'id', 'ip', 'name', 'role', 'target', 'ts', 'uid', 'un']);
  });

  test('V7 nf-deny · ' + mode + ': the name is never empty — a deleted account reads «حساب غير معروف», a deleted unit «إدارة محذوفة», the platform administrator carries no unit', async () => {
    const x = await mk(mode);
    await SITES.rounds(x); await SITES.dstats(x);
    const [rr] = one(x, KR), [rd] = one(x, KDS);
    /* (1) the account still exists but its unit does not */
    const U1 = stored(x.env, 'bassam_auth_users_v1'); U1.find((u) => u.id === 'nfd_emp').deptId = 'nfd_unit_gone'; putKV(x.env, 'bassam_auth_users_v1', U1);
    /* the same refusals from other accounts, two minutes earlier (their own groups; never later than «now», the checkpoint is a timestamp) */
    x.env.DB.exec("INSERT INTO sec(ts,uid,un,act,target,detail,ip,city,dev) SELECT ts-120000,uid,un,act,target,detail,ip,city,dev FROM sec WHERE id=" + rd.id);
    x.env.DB.exec("INSERT INTO sec(ts,uid,un,act,target,detail,ip,city,dev) SELECT ts-120000,'nfd_never_existed','0000000999',act,target,detail,ip,city,dev FROM sec WHERE id=" + rr.id);
    x.env.DB.exec("INSERT INTO sec(ts,uid,un,act,target,detail,ip,city,dev) SELECT ts-120000," + JSON.stringify(x.superId).replace(/"/g, "'") + ",'',act,target,detail,ip,city,dev FROM sec WHERE id=" + rr.id);
    await x.poll();
    const why = WHY[rr.detail], bodies = x.bell().map((m) => m.body);
    assert.ok(bodies.includes('حاول ' + EMP + ' (موظف — إدارة محذوفة) تعديل «الجولات اليومية» في صفحة «المتابعة اليومية»، ورُفض الطلب: ' + why + '.'), 'deleted unit: ' + JSON.stringify(bodies));
    assert.ok(bodies.includes('حاول حساب غير معروف تعديل «الجولات اليومية» في صفحة «المتابعة اليومية»، ورُفض الطلب: ' + why + '.'), 'unknown account: ' + JSON.stringify(bodies));
    assert.ok(bodies.some((b) => /^حاول \S.* \(مسؤول المنصة\) تعديل «الجولات اليومية»/.test(b)), 'platform administrator, role only: ' + JSON.stringify(bodies));
    for (const b of bodies) { assert.doesNotMatch(b, /^حاول\s+(\(|تعديل|—)/, 'name never empty: ' + b); assert.doesNotMatch(b, /0000000999|nfd_/, 'no login number, no id: ' + b); }
    /* (2) the account itself is deleted before the administrator polls */
    const U2 = stored(x.env, 'bassam_auth_users_v1'); U2.find((u) => u.id === 'nfd_emp').deptId = D; putKV(x.env, 'bassam_auth_users_v1', U2);
    await SITES.employees(x);
    putKV(x.env, 'bassam_auth_users_v1', stored(x.env, 'bassam_auth_users_v1').filter((u) => u.id !== 'nfd_emp'));
    await x.poll();
    const [re] = one(x, KE);
    assert.equal(x.byRow(re.id).body, 'حاول حساب غير معروف تعديل «قائمة الموظفين» في صفحة «موظفو الإدارة»، ورُفض الطلب: ' + WHY[re.detail] + '.');
  });

  test('V7 nf-deny · ' + mode + ': repeated refusals collapse — same actor + same record + same reason within 60 s of the first → one notice «(٥ محاولات خلال دقيقة)»; old rows are never re-emitted', async () => {
    const x = await mk(mode);
    /* five REAL refused saves in a row */
    for (let i = 0; i < 5; i++) await SITES.rounds(x);
    const five = one(x, KR); assert.equal(five.length, 5);
    assert.ok(five[4].ts - five[0].ts <= 60000);
    const p1 = await x.poll(); assert.equal(p1.n, 1, 'one notice for five rows');
    const m1 = x.byRow(five[0].id); assert.ok(m1, 'keyed by the FIRST row of the group');
    assert.equal(m1.body, sentence(ACTOR.nfd_emp, five[0], 5)); assert.match(m1.body, /\(٥ محاولات خلال دقيقة\)\.$/); arabicOnly(m1.body, 'grouped');
    for (const r of five.slice(1)) assert.equal(x.byRow(r.id), undefined, 'the absorbed rows have no notice of their own');
    assert.equal((await x.poll()).n, 0, 'a second poll emits nothing'); assert.equal(x.bell().length, 1);
    /* controlled timestamps: copies of that real row at chosen offsets from a base well after it */
    const src = five[0], T0 = src.ts + 600000;
    const put = (dt, o = {}) => { x.env.DB.exec("INSERT INTO sec(ts,uid,un,act,target,detail,ip,city,dev) VALUES(" + (T0 + dt) + "," + [o.uid || src.uid, src.un, 'denied', o.target || src.target, o.detail || src.detail, '', '', ''].map((s) => "'" + s + "'").join(',') + ")"); return x.env.DB.q('SELECT MAX(id) AS id FROM sec')[0].id; };
    const a1 = put(0), a2 = put(60000);          /* exactly 60 000 ms after the first → same group: «محاولتان» */
    const b1 = put(60001);                       /* one millisecond later → a new group */
    const c1 = put(10, { detail: 'dept' });      /* another reason → its own notice */
    const d1 = put(20, { uid: 'nfd_mgr' });      /* another actor → its own notice */
    const e1 = put(30, { target: KE });          /* another record → its own notice */
    const o1 = put(40, { detail: 'perm' });      /* the owner's own example, to the letter */
    const elev = []; for (let i = 0; i < 11; i++) elev.push(put(200000 + i * 1000));   /* eleven in ten seconds: «١١ محاولة» */
    const p2 = await x.poll(); assert.equal(p2.n, 7, JSON.stringify(x.bell().map((m) => m.once + ' ' + m.body)));
    assert.match(x.byRow(a1).body, /\(محاولتان خلال دقيقة\)\.$/); assert.equal(x.byRow(a2), undefined);
    assert.doesNotMatch(x.byRow(b1).body, /خلال دقيقة/, 'a single attempt carries no count');
    assert.equal(x.byRow(c1).body, 'حاول ' + ACTOR.nfd_emp + ' تعديل «الجولات اليومية» في صفحة «المتابعة اليومية»، ورُفض الطلب: السجل يخصّ إدارة أخرى.');
    assert.equal(x.byRow(o1).body, 'حاول خالد الحربي (موظف — إدارة الحشود) تعديل «الجولات اليومية» في صفحة «المتابعة اليومية»، ورُفض الطلب: صلاحيته لا تشمل هذا الإجراء.');
    assert.ok(x.byRow(d1).body.startsWith('حاول ' + ACTOR.nfd_mgr + ' ')); assert.ok(x.byRow(e1).body.includes('«قائمة الموظفين»'));
    assert.match(x.byRow(elev[0]).body, /\(١١ محاولة خلال دقيقة\)\.$/); for (const id of elev.slice(1)) assert.equal(x.byRow(id), undefined);
    /* deterministic: the independent reference yields the same groups and counts from the same rows */
    const ref = groups(x.sec().filter((r) => r.id >= a1));
    assert.deepEqual(ref.map((g) => [g.first.id, g.n]).sort(), [[a1, 2], [b1, 1], [c1, 1], [d1, 1], [e1, 1], [o1, 1], [elev[0], 11]].sort());
    for (const g of ref) assert.equal(x.byRow(g.first.id).body, sentence(ACTOR[g.first.uid], g.first, g.n));
    /* nothing old is emitted again; a row arriving AFTER a poll is a new notice with its own key (groups do not span polls) */
    const all = x.bell().length; assert.equal((await x.poll()).n, 0); assert.equal(x.bell().length, all);
    const late = put(200000 + 11000); assert.equal((await x.poll()).n, 1); assert.doesNotMatch(x.byRow(late).body, /خلال دقيقة/);
    assert.deepEqual(x.env.DB.q("SELECT once_key FROM notification_dedup WHERE once_key GLOB 'security:*' ORDER BY once_key").map((r) => r.once_key).sort(),
      [five[0].id, a1, b1, c1, d1, e1, o1, elev[0], late].map((id) => 'security:' + id).sort(), 'dedup keys stay security:<row id>');
    /* an unknown reason code: a generic Arabic phrase, the code stays in the log */
    const u1 = put(900000, { detail: 'TEST_ONLY-new-code' }); await x.poll();
    assert.equal(x.byRow(u1).body, 'حاول ' + ACTOR.nfd_emp + ' تعديل «الجولات اليومية» في صفحة «المتابعة اليومية»، ورُفض الطلب: ' + GENERIC + '.');
    assert.equal(x.env.DB.q('SELECT detail FROM sec WHERE id=' + u1)[0].detail, 'TEST_ONLY-new-code');
    /* an unknown record: the generic label and no page clause — never the key */
    const u2 = put(990000, { target: 'bsdept:' + D + ':TEST_ONLY_unknown_v9' }); await x.poll();
    assert.equal(x.byRow(u2).body, 'حاول ' + ACTOR.nfd_emp + ' تعديل «بيانات المنصة»، ورُفض الطلب: ' + WHY[src.detail] + '.');
  });
}

/* ═══ the server's maps: in step with the client, and complete over the server's own reason codes ═══ */
async function internals() {
  const src = fs.readFileSync(WU.file, 'utf8'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-nf-deny-')), f = path.join(dir, 'worker.mjs');
  fs.writeFileSync(f, src + '\nexport { NF_TYPES, NF_DENY_RECS, NF_DENY_PAGES, NF_DENY_WHY, NF_DENY_GENERIC, nfDenyWhy, nfDenyRecord, nfDenyPage, nfDenyVerb, nfDenyCount, nfDenyVars, nfDenyBody, nfDenyClean, nfFill, RES_REG, RETRO };\n');
  try { return { W: await import(pathToFileURL(f).href), src }; } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const clientLabels = () => {
  const s = fs.readFileSync(path.join(SRC, 'api', '280-server-storage.js'), 'utf8'), a = s.indexOf('KIVO.BassamKeyLabels'), b = s.indexOf('function unscope', a);
  assert.ok(a > 0 && b > a, 'KIVO.BassamKeyLabels found in the client'); const M = {};
  for (const m of s.slice(a, b).matchAll(/(bassam_[a-z0-9_]+):\["([^"]+)"(?:,"(tech)")?\]/g)) M[m[1]] = { label: m[2], tech: !!m[3] };
  assert.ok(Object.keys(M).length > 50); const fb = /return e \? e\[0\] : "([^"]+)"/.exec(s.slice(b)); assert.ok(fb, 'client fallback label');
  return { M, fallback: fb[1] };
};

test('V7 nf-deny · the template is the approved one, on the server and in the client mirror', async () => {
  const { W } = await internals(), T = W.NF_TYPES.sc_deny;
  assert.deepEqual([T.name, T.txt, T.k, T.on, T.to, T.lvl, T.chan, T.go], [TITLE, TEMPLATE, 'sec', true, ['sys'], 'act', 'bell', 'سجل الأمن']);
  const client = fs.readFileSync(path.join(SRC, 'services', '441-notif-core.js'), 'utf8');
  assert.ok(client.includes("L('sc_deny','sec','" + TITLE + "','فور الرفض',true,['sys'],'act','bell','" + TEMPLATE + "','سجل الأمن')"), 'client mirror of sc_deny');
  assert.doesNotMatch(client, /رفض الخادم كتابة|\{المفتاح\}/);
});

test('V7 nf-deny · record labels and pages cannot drift from the client (KIVO.BassamKeyLabels · pages.json)', async () => {
  const { W } = await internals(), C = clientLabels();
  const pages = JSON.parse(fs.readFileSync(path.join(SRC, 'manifests', 'pages.json'), 'utf8')).pages;
  /* pages: exactly the registry's pages, by their displayed names */
  assert.deepEqual(W.NF_DENY_PAGES, Object.fromEntries(pages.map((p) => [p.key, p.name])));
  /* labels the server holds that the client does not: documented, and nothing else */
  const SERVER_ONLY = {
    bassam_dstats_v1: 'الإحصائيات اليومية',                       /* its own domain (/api/dstats) — never listed in the client's key labels */
    bassam_irshad_retro_v1: 'نافذة استدراك الاسترشاد', bassam_seized_retro_v1: 'نافذة استدراك المضبوطات',   /* server-side state of /api/retro */
    /* review L3: registered keys the client has no label for (retired notification stores · a device key · a one-time flag) */
    bassam_notif_cfg_v1: 'إعدادات التنبيهات (سجل قديم)', bassam_notif_sys_v1: 'تنبيهات المنصة (سجل قديم)', bassam_bc_v1: 'التعاميم (سجل قديم)',
    bassam_notif_v1: 'تنبيهات الإدارة (سجل قديم)', bslg_v1: 'عدّاد محاولات الدخول على الجهاز', bassam_perm_tpls_named_v1: 'راية إعادة تسمية قوالب الصلاحيات',
  };
  /* no registered key falls back to the generic label */
  assert.deepEqual(Object.keys(W.RES_REG).filter((k) => !Object.prototype.hasOwnProperty.call(W.NF_DENY_RECS, k)), [], 'registered keys without a record label');
  for (const [k, label] of Object.entries(W.NF_DENY_RECS)) {
    if (SERVER_ONLY[k]) { assert.equal(label, SERVER_ONLY[k]); assert.equal(C.M[k], undefined, k + ' is now labelled by the client — move it out of SERVER_ONLY'); continue; }
    assert.ok(C.M[k], k + ' is labelled by the client'); assert.equal(label, C.M[k].label, k);
  }
  assert.deepEqual(Object.keys(SERVER_ONLY).filter((k) => !W.NF_DENY_RECS[k]), []);
  /* every resource the server knows (RES_REG), plus the other targets a logging site writes: the client's label, or the client's own fallback */
  const targets = Object.keys(W.RES_REG).concat(Object.values(W.RETRO).map((r) => r.state), [KNF, KDS]);
  for (const name of new Set(targets)) for (const key of [name, 'bsdept:' + D + ':' + name, 'bsdept:' + D + ':' + name + ':sub']) {
    const want = SERVER_ONLY[name] || (C.M[name] ? C.M[name].label : C.fallback);
    assert.equal(W.nfDenyRecord(key), want, key); arabicOnly(W.nfDenyRecord(key), key);
  }
  assert.equal(W.nfDenyRecord('bsdept:' + D + ':TEST_ONLY_unknown'), C.fallback); assert.equal(W.nfDenyRecord(''), C.fallback);
  /* the page of a record is the page of its ceiling leaf in the server's own registry (RES_REG.cap) */
  const pageName = Object.fromEntries(pages.map((p) => [p.key, p.name]));
  for (const [name, R] of Object.entries(W.RES_REG)) {
    const cap = Array.isArray(R.cap) ? R.cap[0] : R.cap;
    assert.equal(W.nfDenyPage('bsdept:' + D + ':' + name), cap ? pageName[String(cap).split('/')[0]] : name === KDS ? pageName.dstats : '', name);
  }
  assert.equal(W.nfDenyPage(KR), 'المتابعة اليومية'); assert.equal(W.nfDenyPage(KRETRO), 'نظام الاسترشاد'); assert.equal(W.nfDenyPage(KNF), ''); assert.equal(W.nfDenyPage('x'), '');
});

/* ── the reason codes of the server, enumerated from its source (AST of the generated worker = the concatenated parts) ──
   A code is a string literal (or the literal prefix of a concatenation, written «prefix…») found in one of:
     (1) the «detail» of an object literal that also carries act:'denied'   — every logging site itself
     (2) the first argument of enfNo(…), and its default inside enfNo         — enforce verdicts
     (3) the «why» of an object literal whose «ok» is false / 0 / !x         — legacy verdicts (authorize · canWrite · images · guards)
     (4) a value returned by a function named …Why                           — reason helpers (deptShapeWhy · taskRawWhy · …)
     (5) «deny» / «sd» of an object literal that carries «cur»               — evaluation results of the save (054)
     (6) «why» of an object assigned to .batchDeny                           — restore / import policy
     (7) «rule» of a RES_REG entry                                           — a resource's special rule returned as its reason
     (8) the third argument of dsDomainDeny(…)                               — daily statistics
     (9) the first argument of nfErr(…, 403)                                 — the notifications route
    (10) round-2 review: a code that reaches «deny»/«sd» through a VARIABLE. Rules 1–9 read literals at the place they are used,
         so they missed 054's { deny: pvNo9[k], sd: pvNo9[k] }, whose values are assigned elsewhere (pvNo9[k] = privPermsStale(…) —
         a helper not named …Why — and pvNo9[k] = 'privacy-hidden'). Now: for every non-literal «deny»/«sd» (of an object with
         «cur») the root variable is taken, and every string literal assigned to it or to one of its members is a code, as is every
         string literal RETURNED by a function called in such an assignment.
         (Not followed: «x.why = '…'» patched onto an answer — tried and dropped: it only finds 'perms-scope-changed', which is a
         CONFLICT answer and is never logged, plus diagnostics and Arabic task texts that are not reason codes.)
   Ternaries and ||/&& are followed. WHITELIST: the …Why helpers below return a human DETAIL sentence (stored in the verdict's
   «detail», never in «why» and never in sec.detail) — verified at their call sites (018 · 059: enfNo('grant', { detail: … })). */
const DETAIL_HELPERS = ['latentLossWhy', 'usersGrantWhy', 'usersSheetWhy', 'enfPermsHeldWhy', 'enfMinusLiftWhy'];
function reasonCodes(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' }), out = new Map(), roots = new Set(), assigns = [], returns = new Map();
  /* the variable a non-literal expression hangs from: pvNo9[k] → pvNo9 · (a || b) → none */
  const rootOf = (e) => { while (e && e.type === 'MemberExpression') e = e.object; return e && e.type === 'Identifier' ? e.name : ''; };
  const add = (code, how) => { if (!out.has(code)) out.set(code, new Set()); out.get(code).add(how); };
  const lits = (n, acc = []) => {
    if (!n) return acc;
    if (n.type === 'Literal' && typeof n.value === 'string') acc.push(n.value);
    else if (n.type === 'ConditionalExpression') { lits(n.consequent, acc); lits(n.alternate, acc); }
    else if (n.type === 'LogicalExpression') { lits(n.left, acc); lits(n.right, acc); }
    else if (n.type === 'BinaryExpression' && n.operator === '+') { let l = n; while (l.type === 'BinaryExpression' && l.operator === '+') l = l.left; if (l.type === 'Literal' && typeof l.value === 'string') acc.push(l.value + '…'); }
    else if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'String') lits(n.arguments[0], acc);
    return acc;
  };
  const walk = (n, st) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'FunctionDeclaration' && n.id) st = { fn: n.id.name }; else if (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') st = { fn: '' };
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier') {
      if (n.callee.name === 'enfNo') lits(n.arguments[0]).forEach((c) => add(c, 'enfNo'));
      if (n.callee.name === 'dsDomainDeny') lits(n.arguments[2]).forEach((c) => add(c, 'dsDomainDeny'));
      if (n.callee.name === 'nfErr' && n.arguments[1] && n.arguments[1].value === 403) lits(n.arguments[0]).forEach((c) => add(c, 'nfErr 403'));
    }
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && n.left.property.name === 'batchDeny' && n.right.type === 'ObjectExpression')
      n.right.properties.forEach((p) => { if (p.key && (p.key.name || p.key.value) === 'why') lits(p.value).forEach((c) => add(c, 'batchDeny')); });
    if (n.type === 'ObjectExpression') {
      const P = {}; n.properties.forEach((p) => { if (p.type === 'Property') P[p.key.name || p.key.value] = p.value; });
      if (P.act && P.act.type === 'Literal' && P.act.value === 'denied') lits(P.detail).forEach((c) => add(c, 'sec detail'));
      if (P.ok && P.why && ((P.ok.type === 'Literal' && (P.ok.value === false || P.ok.value === 0)) || (P.ok.type === 'UnaryExpression' && P.ok.operator === '!'))) lits(P.why).forEach((c) => add(c, 'ok:false why'));
      if (P.deny && P.cur) { lits(P.deny).forEach((c) => add(c, 'deny')); lits(P.sd).forEach((c) => add(c, 'sd')); }
      if (P.rule && P.scope && ['global', 'dept', 'device'].includes(P.scope.value)) lits(P.rule).forEach((c) => add(c, 'RES_REG rule'));
    }
    if (n.type === 'ReturnStatement' && st && /Why\d*$/.test(st.fn) && !DETAIL_HELPERS.includes(st.fn)) lits(n.argument).forEach((c) => add(c, 'return of ' + st.fn));
    if (n.type === 'ReturnStatement' && st && st.fn) { if (!returns.has(st.fn)) returns.set(st.fn, []); lits(n.argument, returns.get(st.fn)); }
    if (n.type === 'ObjectExpression') for (const p of n.properties) if (p.type === 'Property' && ['deny', 'sd'].includes(p.key.name || p.key.value) && n.properties.some((q) => q.key && (q.key.name || q.key.value) === 'cur')) { const r = rootOf(p.value); if (r) roots.add(r); }
    if (n.type === 'AssignmentExpression') { assigns.push(n); }
    if (n.type === 'VariableDeclarator' && n.init && n.id.type === 'Identifier') assigns.push({ left: n.id, right: n.init });
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach((c) => walk(c, st)); else if (v && typeof v.type === 'string') walk(v, st); }
  };
  walk(ast, null);
  /* rule (10) */
  const calls = (e, acc = []) => { if (!e || typeof e.type !== 'string') return acc; if (e.type === 'CallExpression' && e.callee.type === 'Identifier') acc.push(e.callee.name); for (const k in e) { const v = e[k]; if (Array.isArray(v)) v.forEach((c) => calls(c, acc)); else if (v && typeof v.type === 'string') calls(v, acc); } return acc; };
  for (const a of assigns) { const r = rootOf(a.left); if (!r || !roots.has(r)) continue; lits(a.right).forEach((c) => add(c, 'assigned to ' + r));
    for (const fn of calls(a.right)) (returns.get(fn) || []).forEach((c) => add(c.replace(/…$/, '') === c ? c : c, 'return of ' + fn + ' → ' + r)); }
  out.delete('');   /* «no reason» of the helpers; an empty sec.detail reads as the generic phrase (asserted below) */
  return out;
}

test('V7 nf-deny · every reason code that exists in the server source has an Arabic phrase (and only Arabic)', async () => {
  const { W, src } = await internals(), codes = reasonCodes(src);
  assert.ok(codes.size >= 80, 'the enumeration found the codes: ' + codes.size);
  for (const must of ['perm', 'reason', 'page', 'view', 'super', 'scope', 'custody:…', 'retro.…', 'custody-transition', 'notification-scope', 'restore-policy', 'import-allowlist', 'task-x', 'users · dup-id …', 'perms-stale-client', 'privacy-hidden'])
    assert.ok(codes.has(must), 'enumeration sanity: ' + must);
  const missing = [], table = [];
  for (const [code, how] of [...codes].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const sample = code.endsWith('…') ? code.slice(0, -1) + 'x' : code, phrase = W.nfDenyWhy(sample);
    if (!phrase || phrase === W.NF_DENY_GENERIC) { missing.push(code + '  ← ' + [...how].join(' · ')); continue; }
    arabicOnly(phrase, 'phrase of ' + code); assert.doesNotMatch(phrase, /[.؟!]$/, 'the template closes the sentence: ' + code);
    table.push([code, phrase, [...how].join(' · ')]);
  }
  assert.deepEqual(missing, [], 'reason codes in the server source without an Arabic phrase');
  /* no phrase for a code the server no longer has (the table cannot rot the other way) */
  const known = new Set([...codes.keys()].map((c) => (c.endsWith('…') ? c.slice(0, -1) : c)));
  assert.deepEqual(Object.keys(W.NF_DENY_WHY).filter((k) => !known.has(k)), [], 'phrases without a code in the source');
  assert.equal(W.nfDenyWhy(''), W.NF_DENY_GENERIC); assert.equal(W.nfDenyWhy(null), W.NF_DENY_GENERIC); assert.equal(W.nfDenyWhy('TEST_ONLY'), W.NF_DENY_GENERIC); assert.equal(W.NF_DENY_GENERIC, GENERIC);
  /* the verb: not stored in the sec row — neutral «تعديل» unless the row itself says otherwise */
  assert.deepEqual([[KR, 'perm'], [KR, 'keydel'], [KCU, 'custody:type-delete'], [KRETRO, 'retro.open:perm'], [KRETRO, 'retro.close:perm'], [KNF, 'notification-scope'], [KNF, 'super'],
    [KNF, 'notification-export-permission'], [KNF, 'notification-ack-required'], [KNF, 'notification-broadcast-permission'],
    /* review L3: «الوصول إلى» only for what the notifications ROUTE writes (bare key + one of its own 403 codes); a refused SAVE of that key is «تعديل» */
    [KNF, 'unknown'], [KNF, 'domain-moved'], [KNF, 'perm'], [KNF, ''], ['bsdept:' + D + ':' + KNF, 'notification-scope'], [KNF + ':x', 'super']].map((a) => W.nfDenyVerb(a[0], a[1])),
    ['تعديل', 'حذف', 'تعديل', 'فتح', 'إغلاق', 'الوصول إلى', 'الوصول إلى', 'الوصول إلى', 'الوصول إلى', 'الوصول إلى', 'تعديل', 'تعديل', 'تعديل', 'تعديل', 'تعديل', 'تعديل']);
  assert.equal(W.nfDenyWhy('toString'), W.NF_DENY_GENERIC); assert.equal(W.nfDenyWhy('__proto__'), W.NF_DENY_GENERIC);
  for (const [code, phrase] of Object.entries(WHY)) assert.equal(W.nfDenyWhy(code), phrase, code);
  /* count forms */
  assert.deepEqual([2, 3, 5, 10, 11, 12, 99, 100, 102, 103, 110, 111, 200].map(W.nfDenyCount),
    ['محاولتان', '٣ محاولات', '٥ محاولات', '١٠ محاولات', '١١ محاولة', '١٢ محاولة', '٩٩ محاولة', '١٠٠ محاولة', '١٠٢ محاولة', '١٠٣ محاولات', '١١٠ محاولات', '١١١ محاولة', '٢٠٠ محاولة']);
  /* the table of the owner's report */
  if (process.env.V7_NFD_TABLE) fs.writeFileSync(process.env.V7_NFD_TABLE, '# Reason codes of the server → the Arabic phrase shown in the bell (' + table.length + ')\n\n' +
    'Generated by tests/unit/v7_nf_deny_text.test.mjs (V7_NFD_TABLE=<path>) from workers/_worker.js. «…» = the literal prefix of a composed code.\n' +
    'Any other / empty code → «' + W.NF_DENY_GENERIC + '». The code itself stays in the security log.\n\n| # | code (sec.detail) | bell phrase | produced by |\n|---|---|---|---|\n' +
    table.map((r, i) => '| ' + (i + 1) + ' | `' + r[0] + '` | ' + r[1] + ' | ' + r[2] + ' |').join('\n') + '\n');
});

/* ═══ independent review of add1582 — M1 · L1 · L3 · L4 ═══ */
const ZW = '\u200b\u200c\u200d\ufeff', BIDI = '\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069\u200e\u200f\u061c';
/* the sanitiser (round-2 review: an ALLOWLIST), written independently of the worker:
   lone surrogates dropped · format characters, default-ignorable code points, U+2800 and tatweel removed · only letters, combining
   marks, digits, space and . - ' are kept, anything else is a space · at most 3 combining marks per base · collapsed · cut at 40 (+ «…») */
const IGNORABLE = /[\p{Cf}\u034f\u115f\u1160\u17b4\u17b5\u180b-\u180f\u2060-\u206f\u3164\ufe00-\ufe0f\uffa0\u2800\u0640\u{E0000}-\u{E0FFF}]/gu;
function clean(v, max = 40) {
  let t = '';
  for (const ch of String(v == null ? '' : v)) { const cp = ch.codePointAt(0); if (cp >= 0xd800 && cp <= 0xdfff) continue; t += ch; }
  t = t.replace(IGNORABLE, '');
  let o = '', marks = 0;
  for (const ch of t) { if (/\p{M}/u.test(ch)) { if (++marks <= 3) o += ch; continue; } marks = 0; o += /[\p{L}\p{N} .'\-]/u.test(ch) ? ch : ' '; }
  o = o.replace(/\s+/g, ' ').trim();
  const c = Array.from(o); if (c.length > max) o = c.slice(0, max).join('').trim() + '…';
  return /[\p{L}\p{N}]/u.test(o) ? o : '';
}
const SPOOF = 'أحمد» في صفحة «الإعدادات»، ورُفض الطلب: لا شيء. حاول سعد العتيبي (مدير الإدارة — إدارة الحشود) تعديل «الصلاحيات';
const T0 = Date.now() - 86400000;
/* crafted accounts + crafted sec rows (a refused write of the rounds, as the atomic save logs it) */
function craft(x) {
  let t = T0;
  const addUsers = (list) => { const U = stored(x.env, 'bassam_auth_users_v1'), base = U.find((u) => u.id === 'nfd_emp'); for (const o of list) U.push(Object.assign(JSON.parse(JSON.stringify(base)), { un: String(1000000000 + U.length) }, o)); putKV(x.env, 'bassam_auth_users_v1', U); };
  const ins = (o = {}) => { const r = Object.assign({ ts: t++, uid: 'nfd_emp', un: '', act: 'denied', target: KR, detail: 'perm' }, o);
    x.env.DB.exec('INSERT INTO sec(ts,uid,un,act,target,detail,ip,city,dev) VALUES(' + r.ts + ',' + [r.uid, r.un, r.act, r.target, r.detail, '', '', ''].map((q) => "'" + String(q).replace(/'/g, "''") + "'").join(',') + ')'); return x.env.DB.q('SELECT MAX(id) AS id FROM sec')[0].id; };
  const once = (id) => x.env.DB.q("SELECT m.type,m.title,m.body FROM notification_messages m JOIN notification_dedup d ON d.scope=m.scope AND d.message_id=m.id WHERE d.once_key='security:" + id + "'")[0];
  const pollRaw = () => x.post('su', '/api/notifications/act', { uid: x.superId, op: 'security-poll' });
  return { addUsers, ins, once, pollRaw };
}
const RBODY = (actor) => 'حاول ' + actor + ' تعديل «الجولات اليومية» في صفحة «المتابعة اليومية»، ورُفض الطلب: صلاحيته لا تشمل هذا الإجراء.';

for (const mode of ['legacy', 'enforce']) {
  test('V7 nf-deny · review M1 · ' + mode + ': a unit manager renames a staff account through the real save — the bell cannot be made to read as a second attempt by someone else', async () => {
    const x = await mk(mode);
    const g = await x.api('mgr', '/api/get?keys=bassam_auth_users_v1'), ent = g.j.keys.bassam_auth_users_v1, U = JSON.parse(ent.v ?? ent.val);
    U.find((u) => u.id === 'nfd_emp').name = SPOOF;
    const sv = await x.post('mgr', '/api/save', { uid: 'nfd_mgr', set: { bassam_auth_users_v1: JSON.stringify(U) }, del: [], base: { bassam_auth_users_v1: ent.rev } });
    assert.equal(stored(x.env, 'bassam_auth_users_v1').find((u) => u.id === 'nfd_emp').name, SPOOF, 'the server accepts the rename (not changed here): ' + JSON.stringify(sv.j).slice(0, 200));
    await SITES.plain(x); await x.poll();
    const b = x.byRow(one(x, KPLAT)[0].id).body, name = clean(SPOOF);
    assert.equal(b, 'حاول ' + name + ' (موظف — ' + UNIT + ') تعديل «إعدادات المنصة»، ورُفض الطلب: الإجراء لمسؤول المنصة وحده.');
    assert.equal(b.split('«').length - 1, 1, 'one quoted thing: the record'); assert.equal(b.split('»').length - 1, 1);
    assert.ok(Array.from(name).length <= 41 && name.endsWith('…'), 'cut at 40 characters, marked: ' + name);
    assert.equal(name, 'أحمد في صفحة الإعدادات ورُفض الطلب لا شي…'); assert.doesNotMatch(b.slice(0, b.indexOf(' (موظف')), /[،:()«»—]/, 'no sentence punctuation inside the name');
  });

  test('V7 nf-deny · review M1 + L1 · ' + mode + ': names and unit names are sanitised (quotes · braces · control · bidi · zero-width · newlines · 40 chars); a 4001-character name no longer stops the poll', async () => {
    const x = await mk(mode), c = craft(x);
    const depts = stored(x.env, 'bassam_depts_v1');
    const units = { u_quote: 'س» في صفحة «ص', u_tpl: 'شؤون {السبب} {الصفحة}', u_zw: ZW + ' ' + BIDI, u_long: 'ع'.repeat(4001), u_same: 'إدارة محذوفة', u_bidi: 'إدارة\u202e الأمن\n\tالعام' };
    for (const k of Object.keys(units)) depts.push({ id: k, name: units[k], gid: 'tst_g1' }); putKV(x.env, 'bassam_depts_v1', depts);
    const names = { a_tpl: 'زيد {السبب} {الصفحة} {الدور} {الاسم}', a_zw: ZW, a_zw2: ' \u200b\u200f ', a_bidi: 'عمر\u202e الفاروق\u2066\u061c', a_nl: 'علي\nحاول\r\n\tسعد', a_ctl: 'نور\u0000\u0007\u009f الدين',
      a_same: 'حساب غير معروف', a_same2: '«حسابٌ غير\u200b  معروف»', a_same3: 'إدارة محذوفة', a_punct: '— ( ) . ،', a_long: 'ط'.repeat(4001), a_num: 7, a_ok: '  خالد   الحربي  ' };
    c.addUsers(Object.keys(names).map((k) => ({ id: k, name: names[k] })).concat([{ id: 'a_sameLatin', name: 'حساب غير معروف', un: 'abc' }], Object.keys(units).map((k) => ({ id: 'b_' + k, name: 'ناصر', deptId: k }))));
    const id = {}; for (const k of Object.keys(names).concat(['a_sameLatin'], Object.keys(units).map((q) => 'b_' + q))) id[k] = c.ins({ uid: k });
    const lock = c.ins({ uid: 'nfd_mgr', act: 'lock', target: 'u:0000000902', detail: '5' });
    const p = await c.pollRaw();
    assert.equal(p.status, 200, 'the poll is not stopped by a long name (was 400 notification-vars): ' + JSON.stringify(p.j).slice(0, 120));
    assert.equal(c.once(lock).type, 'sc_guard', 'the guard notice of the same batch arrives');
    const UNITP = ' (موظف — ' + UNIT + ')', body = (k) => { const m = c.once(id[k]); assert.ok(m, 'a notice for ' + k); return m.body; };
    assert.equal(body('a_tpl'), RBODY('زيد السبب الصفحة الدور الاسم' + UNITP), 'braces removed, nothing expanded');
    for (const k of ['a_zw', 'a_zw2', 'a_punct']) assert.equal(body(k), RBODY('حساب غير معروف' + UNITP), k + ': nothing readable left → the fallback, never empty');
    assert.equal(body('a_bidi'), RBODY('عمر الفاروق' + UNITP)); assert.equal(body('a_nl'), RBODY('علي حاول سعد' + UNITP)); assert.equal(body('a_ctl'), RBODY('نور الدين' + UNITP));
    assert.equal(body('a_num'), RBODY('7' + UNITP)); assert.equal(body('a_ok'), RBODY('خالد الحربي' + UNITP));
    assert.equal(body('a_long'), RBODY('ط'.repeat(40) + '…' + UNITP));
    /* an account NAMED like a fallback phrase is not mistaken for it: its login number, in Arabic-Indic digits */
    const un = (k) => AR(stored(x.env, 'bassam_auth_users_v1').find((u) => u.id === k).un);
    for (const k of ['a_same', 'a_same2', 'a_same3']) { assert.equal(body(k), RBODY('الحساب رقم ' + un(k) + UNITP), k); assert.match(un(k), /^[٠-٩]{10}$/); }
    assert.equal(body('a_sameLatin'), RBODY('حساب باسم ملتبس' + UNITP), 'no numeric login number to show → an unambiguous phrase, never Latin');
    /* units */
    const UB = (unit) => RBODY('ناصر (موظف — ' + unit + ')');
    assert.equal(body('b_u_quote'), UB('س في صفحة ص')); assert.equal(body('b_u_tpl'), UB('شؤون السبب الصفحة')); assert.equal(body('b_u_bidi'), UB('إدارة الأمن العام'));
    assert.equal(body('b_u_zw'), UB('إدارة محذوفة'), 'a unit with no readable name reads as the fallback'); assert.equal(body('b_u_long'), UB('ع'.repeat(40) + '…'));
    assert.equal(body('b_u_same'), UB('وحدة باسم ملتبس'), 'an existing unit NAMED «إدارة محذوفة» is not mistaken for a deleted one');
    for (const k of Object.keys(id)) { const b = body(k); assert.doesNotMatch(b, /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\u061c\ufeff\u2028\u2029{}]/, k + ' control/bidi/zero-width/brace: ' + JSON.stringify(b)); assert.equal(b.split('«').length - 1, 2, k + ': only the record and the page are quoted'); assert.doesNotMatch(b, /^حاول\s+(\(|تعديل)/, k + ': name never empty'); assert.ok(b.length < 400, k); }
  });

  test('V7 nf-deny · review L3 · ' + mode + ': «مدير القسم» for a section manager; a general manager by the kind of his node; a deleted node is «عقدة محذوفة»; a refused SAVE of the notifications key is «تعديل»', async () => {
    const x = await mk(mode), c = craft(x);
    const depts = stored(x.env, 'bassam_depts_v1'); depts.push({ id: 'nfd_sec', name: 'قسم التنظيم', gid: D, kind: 'قسم' }); putKV(x.env, 'bassam_depts_v1', depts);
    const nodes = stored(x.env, 'bassam_gdepts_v1') || []; nodes.push({ id: 'n_gen', name: 'الإدارة العامة للحشود', kind: 'إدارة عامة' }, { id: 'n_sector', name: 'قطاع الحرم', kind: 'قطاع' }, { id: 'n_top', name: 'الإدارة العليا للمنصة', kind: 'إدارة عليا' }, { id: 'n_other', name: 'وكالة الشؤون', kind: 'وكالة' }, { id: 'n_nokind', name: 'عقدة بلا نوع' }); putKV(x.env, 'bassam_gdepts_v1', nodes);
    const gm = (id, gid) => ({ id, name: 'ماجد', role: 'gm', gid, ekey: 'gm:' + gid, deptId: undefined, mgr: undefined });
    c.addUsers([{ id: 's_mgr', name: 'هند', deptId: 'nfd_sec', mgr: true }, { id: 's_emp', name: 'هند', deptId: 'nfd_sec', mgr: undefined }, { id: 's_dept', name: 'هند', role: 'dept', deptId: 'nfd_sec' }, { id: 'd_dept', name: 'هند', role: 'dept' },
      gm('g_gen', 'n_gen'), gm('g_sector', 'n_sector'), gm('g_top', 'n_top'), gm('g_other', 'n_other'), gm('g_nokind', 'n_nokind'), gm('g_gone', 'n_deleted'), { id: 's_gone', name: 'هند', deptId: 'nfd_unit_gone', mgr: true }]);
    const want = { s_mgr: 'هند (مدير القسم — قسم التنظيم)', s_emp: 'هند (موظف — قسم التنظيم)', s_dept: 'هند (مدير القسم — قسم التنظيم)', d_dept: 'هند (مدير الإدارة — ' + UNIT + ')', nfd_mgr: MGR + ' (مدير الإدارة — ' + UNIT + ')',
      g_gen: 'ماجد (مدير إدارة عامة — الإدارة العامة للحشود)', g_sector: 'ماجد (مدير القطاع — قطاع الحرم)', g_top: 'ماجد (الإدارة العليا — الإدارة العليا للمنصة)', g_other: 'ماجد (مدير وكالة — وكالة الشؤون)',
      g_nokind: 'ماجد (مدير إدارة عامة — عقدة بلا نوع)', g_gone: 'ماجد (مدير إدارة عامة — عقدة محذوفة)', s_gone: 'هند (مدير الإدارة — إدارة محذوفة)' };
    const id = {}; for (const k of Object.keys(want)) id[k] = c.ins({ uid: k });
    /* a refused plain SAVE of the notifications key (real request) next to a refused notifications ROUTE call */
    const sv = await x.post('emp', '/api/save', { uid: 'nfd_emp', set: { [KNF]: '{}' }, del: [], base: { [KNF]: x.rev(KNF) } });
    const saved = x.sec().filter((r) => r.target === KNF); assert.equal(saved.length, 1, 'the plain save of the notifications key is refused and logged: ' + JSON.stringify(sv.j).slice(0, 200));
    await SITES.nfEmit(x); const route = x.sec().filter((r) => r.target === KNF && r.id !== saved[0].id); assert.equal(route.length, 1);
    await x.poll();
    for (const k of Object.keys(want)) assert.equal(c.once(id[k]).body, RBODY(want[k]), k);
    if (process.env.V7_NFD_DUMP === '1') console.log(mode + ' save of the notifications key: ' + saved[0].detail + ' | ' + c.once(saved[0].id).body);
    assert.match(c.once(saved[0].id).body, /^حاول خالد الحربي \(موظف — إدارة الحشود\) تعديل «التنبيهات والتعاميم»، ورُفض الطلب: /, 'SAVE (' + saved[0].detail + ') → «تعديل»: ' + c.once(saved[0].id).body);
    assert.match(c.once(route[0].id).body, /^حاول خالد الحربي \(موظف — إدارة الحشود\) الوصول إلى «التنبيهات والتعاميم»، ورُفض الطلب: /);
    arabicOnly(c.once(saved[0].id).body, 'save of the notifications key');
  });
}

test('V7 nf-deny · review L3: the role labels are the client\'s own (330 gmRoleLabel · profile · admin adRole)', async () => {
  const { W } = await internals();
  const auth = fs.readFileSync(path.join(SRC, 'auth', '330-auth.js'), 'utf8'), prof = fs.readFileSync(path.join(SRC, 'modules', 'profile', 'logic.js'), 'utf8'), adm = fs.readFileSync(path.join(SRC, 'modules', 'admin', 'logic.js'), 'utf8');
  /* the client source, literally */
  const gmFn = auth.slice(auth.indexOf('function gmRoleLabel(gid){'), auth.indexOf('function gmDepts(gid){'));
  const G = { none: /if \(!k \|\| k === '([^']+)'\) return '([^']+)';/.exec(gmFn), sector: /if \(k === '([^']+)'\) return '(مدير القطاع)';/.exec(gmFn), top: /if \(k === '([^']+)'\) return '(الإدارة العليا)';/.exec(gmFn), other: /return '([^']+)' \+ k;/.exec(gmFn) };
  for (const k of Object.keys(G)) assert.ok(G[k], 'client gmRoleLabel · ' + k);
  const sec = /this\.deptIsSec\(e && e\.deptId\) \? "([^"]+)" : "([^"]+)"/.exec(prof); assert.ok(sec, 'client profile: section/unit manager');
  const ad = /super: "([^"]+)",\s*dept: "([^"]+)",[\s\S]{0,200}?staff: t && t\.mgr \? "([^"]+)" : "([^"]+)"/.exec(adm); assert.ok(ad, 'client admin adRole');
  const secKind = /NODE_KIND_SEC: '([^']+)'/.exec(fs.readFileSync(path.join(SRC, 'services', '320-dept-storage.js'), 'utf8'))[1];
  const A = { depts: [{ id: 'd', name: 'إدارة' }, { id: 's', name: 'قسم', gid: 'd', kind: secKind }], nodes: [{ id: 'n0', name: 'ع' }, { id: 'n1', name: 'ع', kind: G.none[1] }, { id: 'n2', name: 'ع', kind: G.sector[1] }, { id: 'n3', name: 'ع', kind: G.top[1] }, { id: 'n4', name: 'ع', kind: 'وكالة' }] };
  const role = (u) => { A.users = [Object.assign({ id: 'u', name: 'س', un: '1' }, u)]; return W.nfDenyVars(A, { uid: 'u', target: KR, detail: 'perm' })['الدور']; };
  assert.deepEqual([role({ role: 'super' }), role({ role: 'dept', deptId: 'd' }), role({ role: 'staff', mgr: true, deptId: 'd' }), role({ role: 'staff', deptId: 'd' })], [ad[1], ad[2], ad[3], ad[4]]);
  assert.deepEqual([role({ role: 'staff', mgr: 1, deptId: 's' }), role({ role: 'staff', mgr: 1, deptId: 'd' }), role({ role: 'staff', deptId: 's' })], [sec[1], sec[2], ad[4]]);
  assert.equal(sec[1], 'مدير القسم'); assert.equal(sec[2], ad[3]);
  assert.deepEqual(['n0', 'n1', 'n2', 'n3', 'n4', 'n_gone'].map((gid) => role({ role: 'gm', gid })), [G.none[2], G.none[2], G.sector[2], G.top[2], G.other[1] + 'وكالة', G.none[2]]);
});

/* the original nfFill (develop 5add483), frozen here: every type but sc_deny must still be filled exactly so */
function fillRef(txt, vars) {
  let s = String(txt || '');
  Object.keys(vars || {}).forEach((k) => { s = s.split(k.charAt(0) === '{' ? k : '{' + k + '}').join(String(vars[k] == null ? '' : vars[k])); });
  return s.replace(/\{[^}]+\}/g, '').replace(/\s{2,}/g, ' ').trim();
}
const TRICKY = ['أ ( — ) ب', '— )', '( — س', 'في صفحة «» ص', 'س   ص', '«»', '(—)', 'عادي', '{السبب}', '{الاسم} {الفعل}', 'x{y}z', '', 7, ZW + 'ن' + BIDI];

test('V7 nf-deny · review M1/L4: sc_deny is filled in ONE pass and tidied only under the default template — every other type is filled exactly as before', async () => {
  const { W } = await internals(), DEF = W.NF_TYPES.sc_deny.txt;
  /* single pass: a value is never re-scanned for {var} */
  const V = { 'الاسم': 'زيد {السبب} {الصفحة}', 'الدور': '{الاسم}', 'الإدارة': '{الفعل}', 'الفعل': 'تعديل', 'السجل': 'س', 'الصفحة': 'ص', 'السبب': 'سبب {الاسم}' };
  assert.equal(W.nfDenyBody(DEF, V), 'حاول زيد {السبب} {الصفحة} ({الاسم} — {الفعل}) تعديل «س» في صفحة «ص»، ورُفض الطلب: سبب {الاسم}.');
  assert.notEqual(fillRef(DEF, V), W.nfDenyBody(DEF, V), 'the sequential fill did expand them');
  /* the default template: empty clauses are dropped structurally — a VALUE that looks like an empty clause is left alone */
  const B = (o) => W.nfDenyBody(DEF, Object.assign({ 'الاسم': 'ن', 'الدور': 'موظف', 'الإدارة': 'إدارة', 'الفعل': 'تعديل', 'السجل': 'س', 'الصفحة': 'ص', 'السبب': 'ع' }, o));
  assert.equal(B({}), 'حاول ن (موظف — إدارة) تعديل «س» في صفحة «ص»، ورُفض الطلب: ع.');
  assert.equal(B({ 'الصفحة': '' }), 'حاول ن (موظف — إدارة) تعديل «س»، ورُفض الطلب: ع.');
  assert.equal(B({ 'الإدارة': '' }), 'حاول ن (موظف) تعديل «س» في صفحة «ص»، ورُفض الطلب: ع.'); assert.equal(B({ 'الدور': '' }), 'حاول ن (إدارة) تعديل «س» في صفحة «ص»، ورُفض الطلب: ع.');
  assert.equal(B({ 'الدور': '', 'الإدارة': '', 'الصفحة': '' }), 'حاول ن تعديل «س»، ورُفض الطلب: ع.');
  assert.equal(B({ 'الاسم': 'أ ( — ) ب — )', 'السبب': 'ع ( — ) ( — س' }), 'حاول أ ( — ) ب — ) (موظف — إدارة) تعديل «س» في صفحة «ص»، ورُفض الطلب: ع ( — ) ( — س.');
  /* an administrator's own text is filled, not rewritten */
  const CUSTOM = 'تنبيه ( — ) {الاسم} — ) في صفحة «» {السبب} ({الدور} — {الإدارة}) في صفحة «{الصفحة}» {المفتاح}';
  assert.equal(W.nfDenyBody(CUSTOM, { 'الاسم': 'ن', 'السبب': 'ع', 'الدور': '', 'الإدارة': '', 'الصفحة': '' }), 'تنبيه ( — ) ن — ) في صفحة «» ع ( — ) في صفحة «»');
  assert.equal(W.nfDenyBody('', V), ''); assert.equal(W.nfDenyBody(DEF, undefined), W.nfDenyBody(DEF, {}));
  /* every other type: nfFill is the frozen original, for ordinary and hostile values */
  let n = 0;
  for (const id of Object.keys(W.NF_TYPES)) { if (id === 'sc_deny') continue; const T = W.NF_TYPES[id], names = [...new Set([...String(T.txt).matchAll(/\{([^}]+)\}/g)].map((m) => m[1]))];
    for (let sh = 0; sh < TRICKY.length; sh++) { const vars = {}; names.forEach((k, i) => { vars[sh % 2 ? '{' + k + '}' : k] = TRICKY[(i + sh) % TRICKY.length]; }); if (sh === 3) vars['غير موجود'] = 'x';
      assert.equal(W.nfFill(T.txt, vars), fillRef(T.txt, vars), id + ' #' + sh); n++; } }
  assert.ok(n > 700, 'types × value sets: ' + n);
  assert.doesNotMatch(String(W.nfFill), /sc_deny|nfDeny/, 'nfFill itself knows nothing of sc_deny');
});

test('V7 nf-deny · review L4 + M1 (real routes): a customised sc_deny text is not rewritten; the other «sys» types emitted through the route read exactly as before', async () => {
  const x = await mk('enforce'), c = craft(x), { W } = await internals();
  const CUSTOM = 'تنبيه ( — ) {الاسم} — ) في صفحة «» {السبب}';
  let r = null; for (const base of [0].concat(x.env.DB.q('SELECT rev FROM revs').map((q) => q.rev))) { r = await x.post('su', '/api/notifications/act', { uid: x.superId, op: 'config', base, patch: { sc_deny: { txt: CUSTOM } } }); if (r.status === 200) break; }
  assert.equal(r.status, 200, 'config saved: ' + JSON.stringify(r.j));
  const a = c.ins({}); await x.poll();
  assert.equal(c.once(a).body, 'تنبيه ( — ) خالد الحربي — ) في صفحة «» صلاحيته لا تشمل هذا الإجراء', 'the administrator\'s text, filled and untouched');
  /* other types through the real emit route, hostile values */
  let n = 0;
  for (const id of Object.keys(W.NF_TYPES)) { const T = W.NF_TYPES[id]; if (id === 'sc_deny' || !T.on || T.to.length !== 1 || T.to[0] !== 'sys' || !['sys', 'sec'].includes(T.k)) continue;   /* employee types are never accepted from a client */
    const names = [...new Set([...String(T.txt).matchAll(/\{([^}]+)\}/g)].map((m) => m[1]))], vars = {}; names.forEach((k, i) => { vars[k] = TRICKY[(i * 3 + n) % TRICKY.length]; });
    const e = await x.post('su', '/api/notifications/act', { uid: x.superId, op: 'emit', type: id, vars, once: 'TEST_ONLY:' + id }); assert.equal(e.status, 200, id + ' ' + JSON.stringify(e.j));
    const m = x.env.DB.q("SELECT m.body FROM notification_messages m JOIN notification_dedup d ON d.scope=m.scope AND d.message_id=m.id WHERE d.once_key='TEST_ONLY:" + id + "'")[0];
    assert.ok(m, id + ' stored'); assert.equal(m.body, fillRef(T.txt, vars), id); n++; }
  assert.ok(n >= 5, 'sys-only types emitted: ' + n);
});

/* ═══ round-2 review of 3c09809 — allowlist sanitiser · invisible names · ambiguity · stale-client codes · node kind ═══ */
const SAFE = String.raw`[\p{L}\p{M}\p{N} .'\-…]+`;
const FRAME = new RegExp('^حاول ' + SAFE + String.raw` \(` + SAFE + ' — ' + SAFE + String.raw`\) تعديل «الجولات اليومية» في صفحة «المتابعة اليومية»، ورُفض الطلب: صلاحيته لا تشمل هذا الإجراء\.$`, 'u');
const FORGE = {
  noquote: 'س، ورُفض الطلب: تم. حاول سعد العتيبي (مسؤول المنصة) تعديل ‹الصلاحيات›',
  dq: 'س" في صفحة "الإعدادات"، ورُفض الطلب: تم. حاول سعد (مسؤول المنصة) حذف "الصلاحيات',
  cjk: 'س》 في صفحة 《الإعدادات》، ورُفض الطلب: تم. حاول سعد (مسؤول المنصة) حذف 《الصلاحيات',
  role: 'سعد العتيبي (مسؤول المنصة) بالنيابة عن خالد',
  look: 'أحمد ‹› ❝❞ „“ ‟ ＜＞ ｛السبب｝ ﹛الصفحة﹜ ⦃x⦄',
  dash: 'عمر ( — ) — ) ( —',
};
const UFORGE = 'س) تعديل ‹الصلاحيات› — (مسؤول المنصة';

for (const mode of ['legacy', 'enforce']) test('V7 nf-deny · review-2 (1)(5) · ' + mode + ': no punctuation survives in a name, a unit name or a node kind — the sentence frame cannot be forged', async () => {
  const x = await mk(mode), c = craft(x);
  const depts = stored(x.env, 'bassam_depts_v1'); depts.push({ id: 'u_forge', name: UFORGE, gid: 'tst_g1' }, { id: 'u_long', name: 'ع'.repeat(4001), gid: 'tst_g1' }); putKV(x.env, 'bassam_depts_v1', depts);
  const nodes = stored(x.env, 'bassam_gdepts_v1') || []; nodes.push({ id: 'n_k1', name: 'الفرع', kind: '{السبب}«x») — (حاول، سعد: تعديل' }, { id: 'n_k2', name: 'الفرع', kind: 'ع'.repeat(300) }, { id: 'n_k3', name: UFORGE, kind: 'وكالة' }); putKV(x.env, 'bassam_gdepts_v1', nodes);
  c.addUsers(Object.keys(FORGE).map((k) => ({ id: 'f_' + k, name: FORGE[k] })).concat([{ id: 'f_long', name: 'ط'.repeat(4001) }, { id: 'f_unit', name: 'ناصر', deptId: 'u_forge' }, { id: 'f_ulong', name: 'ناصر', deptId: 'u_long' }],
    ['n_k1', 'n_k2', 'n_k3'].map((g) => ({ id: 'f_' + g, name: 'ماجد', role: 'gm', gid: g, deptId: undefined, mgr: undefined }))));
  const ids = {}; for (const k of Object.keys(FORGE).map((q) => 'f_' + q).concat(['f_long', 'f_unit', 'f_ulong', 'f_n_k1', 'f_n_k2', 'f_n_k3'])) ids[k] = c.ins({ uid: k });
  const lock = c.ins({ uid: 'nfd_mgr', act: 'lock', target: 'u:0000000902', detail: '5' });
  const p = await c.pollRaw(); assert.equal(p.status, 200, JSON.stringify(p.j).slice(0, 120)); assert.equal(c.once(lock).type, 'sc_guard', '4001-character names do not stop the poll');
  const U1 = ' (موظف — ' + UNIT + ')', body = (k) => c.once(ids[k]).body;
  assert.equal(body('f_noquote'), RBODY('س ورُفض الطلب تم. حاول سعد العتيبي مسؤول…' + U1));
  assert.equal(body('f_dq'), RBODY(clean(FORGE.dq) + U1)); assert.match(clean(FORGE.dq), /^س في صفحة الإعدادات ورُفض الطلب تم. حاول/); assert.equal(body('f_cjk'), body('f_dq'));
  assert.equal(body('f_role'), RBODY('سعد العتيبي مسؤول المنصة بالنيابة عن خال…' + U1)); assert.equal(body('f_look'), RBODY('أحمد السبب الصفحة x' + U1)); assert.equal(body('f_dash'), RBODY('عمر' + U1));
  assert.equal(body('f_long'), RBODY('ط'.repeat(40) + '…' + U1));
  assert.equal(body('f_unit'), RBODY('ناصر (موظف — س تعديل الصلاحيات مسؤول المنصة)')); assert.equal(body('f_ulong'), RBODY('ناصر (موظف — ' + 'ع'.repeat(40) + '…)'));
  assert.equal(body('f_n_k1'), RBODY('ماجد (مدير السبب x حاول سعد تعد… — الفرع)')); assert.equal(body('f_n_k2'), RBODY('ماجد (مدير ' + 'ع'.repeat(20) + '… — الفرع)'), 'the node kind is cut at 20');
  assert.equal(body('f_n_k3'), RBODY('ماجد (مدير وكالة — س تعديل الصلاحيات مسؤول المنصة)'));
  for (const k of Object.keys(ids)) { const b = body(k); assert.match(b, FRAME, k + ': ' + b); assert.equal(b.split('حاول ').length - 1 <= 2, true); assert.equal((b.match(/[()«»،:—]/g) || []).join(''), '(—)«»«»،:', k + ': the only sentence punctuation is the template\'s own: ' + b); assert.ok(b.length < 260, k); }
});

test('V7 nf-deny · review-2 (1)(2)(3): the sanitiser is an allowlist; invisible names are empty; names that read like a generated phrase are never shown as such', async () => {
  const { W } = await internals();
  const A = { depts: [{ id: 'd', name: 'إدارة الحشود' }], nodes: [] };
  const vars = (u, dn) => { A.users = [Object.assign({ id: 'u', role: 'staff', deptId: 'd', un: '0000000901' }, u)]; A.depts[0].name = dn === undefined ? 'إدارة الحشود' : dn; return W.nfDenyVars(A, { uid: 'u', target: KR, detail: 'perm' }); };
  const name = (n, u) => vars(Object.assign({ name: n }, u))['الاسم'], unit = (n) => vars({ name: 'ناصر' }, n)['الإدارة'];
  /* (1) the worker's sanitiser == the independent one, over hostile input; and the output alphabet is closed */
  const HOSTILE = Object.values(FORGE).concat([UFORGE, SPOOF, 'O\'Brien-Smith jr.', 'عبد الله بن عبد العزيز آل سعود', 'ع' + '\u0300'.repeat(60) + 'ب', 'عَ' + '\u064e\u0651'.repeat(40) + 'ب', 'ع' + 'ـ'.repeat(70), 'ـ'.repeat(50), '😀'.repeat(80) + '𝒜', '😀🇸🇦👨‍👩‍👧', 'ع'.repeat(39) + '😀😀ب',
    'ع\ud83d', 'ع'.repeat(39) + '\ud83d' + 'ب', '\udc00\ud800', 'علي\u034f\u115f\u3164\u2800\ufe0f', '\u034f\u115f\u1160\u3164\u2800\uffa0\u17b4\u17b5\u180b\u180e\u2060\u2061\u206f', '\u3164', 'ع\u{E0001}\u{E0041}\u{E0100}', 'ع\ufe0f\u180e\u2060\u2061',
    '<img src=x onerror=alert(1)>', 'a&b;c|d/e^f', '٣ ③ ½ 7', '…', '. - \' .', 'ط'.repeat(5000), '  خالد   الحربي  ', 'أ\nب\r\n\tج', 5, true, null, undefined, {}, ['س', 'ص']]);
  for (const h of HOSTILE) { const got = W.nfDenyClean(h); assert.equal(got, clean(h), JSON.stringify(String(h).slice(0, 40))); assert.match(got, /^[\p{L}\p{M}\p{N} .'\-…]*$/u); assert.ok(Array.from(got).length <= 41); assert.doesNotMatch(got, /\p{M}{4}/u, 'at most 3 marks per base'); assert.doesNotMatch(got, /[\ud800-\udfff]/u, 'no lone surrogate'); assert.doesNotMatch(got, /\p{Cf}|ـ/u); }
  assert.equal(W.nfDenyClean('ع'.repeat(30), 20), 'ع'.repeat(20) + '…'); assert.equal(W.nfDenyClean("O'Brien-Smith jr."), "O'Brien-Smith jr.");
  /* (2) nothing visible → the fallback */
  for (const inv of ['\u034f\u115f\u3164\u2800', '\u3164', '\u2800\u2800', '\uffa0', '\u{E0001}\u{E0041}', '\ufe0f\u180e\u2060', '\ud83d', 'ـ'.repeat(50), '😀😀', '…', '( — )', '', '   ']) {
    assert.equal(name(inv), 'حساب غير معروف', 'invisible name ' + JSON.stringify(inv)); assert.equal(unit(inv), 'إدارة محذوفة', 'invisible unit ' + JSON.stringify(inv)); }
  assert.equal(name('علي\u034f\u115f\u3164\u2800\ufe0f'), 'علي');
  /* (3) ambiguity: letters only on both sides; the generated phrases are reserved too */
  const AMB = ['حساب غير معروف', 'حساب غير معروف.', '(حساب غير معروف)', 'حساب غير معروف\u0300', 'حسابٌ  غيرُ - معروف', 'حـسـاب غير معروف', 'حساب.غير.معروف', 'إدارة محذوفة', "إدارة 'محذوفة'", 'عقدة محذوفة', 'حساب باسم ملتبس', 'وحدة باسم ملتبس', 'وحدة باسم ملتبس.',
    'الحساب رقم ٠٥٠١٢٣٤٥٦٧', 'الحساب رقم 1', 'الحساب رقم', 'الحسابُ رقمٌ ٧٧٧ بالنيابة'];
  for (const n of AMB) { assert.equal(name(n), 'الحساب رقم ٠٠٠٠٠٠٠٩٠١', 'account named ' + JSON.stringify(n)); assert.equal(unit(n), 'وحدة باسم ملتبس', 'unit named ' + JSON.stringify(n)); }
  for (const n of ['حساب غير معروف لدينا', 'خالد', 'إدارة الحشود', 'رقم الحساب']) { assert.equal(name(n), n); assert.equal(unit(n), n); }
  /* the login number shown by that path: digits only, at most 15 — otherwise the unambiguous phrase */
  assert.equal(name('حساب غير معروف', { un: '123456789012345' }), 'الحساب رقم ١٢٣٤٥٦٧٨٩٠١٢٣٤٥');
  for (const un of ['1234567890123456', '9'.repeat(6000), 'abc', '12 34', '١٢٣', '', null, undefined, '1e5', '-5']) assert.equal(name('حساب غير معروف', { un }), 'حساب باسم ملتبس', 'un ' + JSON.stringify(String(un).slice(0, 20)));
  /* (5) the kind of a general manager's node */
  const role = (kind) => { A.users = [{ id: 'u', name: 'م', role: 'gm', gid: 'n', un: '1' }]; A.nodes = [{ id: 'n', name: 'الفرع', kind }]; return W.nfDenyVars(A, { uid: 'u', target: KR, detail: 'perm' })['الدور']; };
  assert.deepEqual(['وكالة', '{السبب}«x»', 'ع'.repeat(300), '…', '\u3164', 5, '(إدارة عامة)', 'قطاع.'].map(role), ['مدير وكالة', 'مدير السبب x', 'مدير ' + 'ع'.repeat(20) + '…', 'مدير إدارة عامة', 'مدير إدارة عامة', 'مدير 5', 'مدير إدارة عامة', 'مدير قطاع.']);
});

test('V7 nf-deny · review-2 (4) · enforce: a stale permissions page refused by the privacy guard reads in Arabic (code «perms-stale-client»)', async () => {
  const x = await mk('enforce');
  const sv = await x.post('mgr', '/api/save', { uid: 'nfd_mgr', set: { bassam_perms_v1: JSON.stringify({ name: 'Z' }) }, del: [], base: { bassam_perms_v1: x.rev('bassam_perms_v1') } });
  const rows = x.sec().filter((r) => r.target === 'bassam_perms_v1' && r.uid === 'nfd_mgr'); assert.equal(rows.length, 1, JSON.stringify(sv.j).slice(0, 200)); assert.equal(rows[0].detail, 'perms-stale-client');
  await x.poll();
  assert.equal(x.byRow(rows[0].id).body, 'حاول ' + MGR + ' (مدير الإدارة — ' + UNIT + ') تعديل «الصلاحيات»، ورُفض الطلب: الصلاحيات لم تُقبل لأن نسخة الصفحة قديمة.');
});
