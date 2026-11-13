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
  [KPLAT]: ['إعدادات المنصة', '', 'تعديل'], [KCU]: ['عهد الموظفين', 'موظفو الإدارة', 'إضافة'], [KDS]: ['الإحصائيات اليومية', 'الإحصائيات اليومية', 'تعديل'],
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
  fs.writeFileSync(f, src + '\nexport { NF_TYPES, NF_DENY_RECS, NF_DENY_PAGES, NF_DENY_WHY, NF_DENY_GENERIC, nfDenyWhy, nfDenyRecord, nfDenyPage, nfDenyVerb, nfDenyCount, RES_REG, RETRO };\n');
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
  };
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
   Ternaries and ||/&& are followed. WHITELIST: the …Why helpers below return a human DETAIL sentence (stored in the verdict's
   «detail», never in «why» and never in sec.detail) — verified at their call sites (018 · 059: enfNo('grant', { detail: … })). */
const DETAIL_HELPERS = ['latentLossWhy', 'usersGrantWhy', 'usersSheetWhy', 'enfPermsHeldWhy', 'enfMinusLiftWhy'];
function reasonCodes(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' }), out = new Map();
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
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach((c) => walk(c, st)); else if (v && typeof v.type === 'string') walk(v, st); }
  };
  walk(ast, null);
  out.delete('');   /* «no reason» of the helpers; an empty sec.detail reads as the generic phrase (asserted below) */
  return out;
}

test('V7 nf-deny · every reason code that exists in the server source has an Arabic phrase (and only Arabic)', async () => {
  const { W, src } = await internals(), codes = reasonCodes(src);
  assert.ok(codes.size >= 80, 'the enumeration found the codes: ' + codes.size);
  for (const must of ['perm', 'reason', 'page', 'view', 'super', 'scope', 'custody:…', 'retro.…', 'custody-transition', 'notification-scope', 'restore-policy', 'import-allowlist', 'task-x', 'users · dup-id …'])
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
