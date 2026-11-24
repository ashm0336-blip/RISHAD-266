/* V7 · 53 — تجميعُ تنبيهات الأمان ونصوصُ الرسائل، على العامل الحقيقي (بيانات TEST_ONLY · SQLite بالذاكرة):
   (٥)  رفضُ الكتابة (sc_deny) المتكرّر من المصدر نفسه (الحساب · السجل · السبب) في نافذة ساعة = تنبيهٌ واحد، داخل الاستطلاع وعبر الاستطلاعات،
        وعددُه من السجل نفسه («(١٢ محاولة خلال ساعة)»). مصدرٌ آخر تنبيهُه. ما بعد النافذة تنبيهٌ جديد. سجلُّ الأمن يبقى بكل صفوفه.
   (S11) «دخول من جهاز جديد»: متصفحٌ لا يحفظ كعكةَ الجهاز يدخل 72 مرة في ساعة من العنوان نفسه ⇒ تنبيهٌ واحد؛ عنوانٌ آخر ⇒ تنبيهُه.
   (١٤) «()» فارغة في emp_add · شرطةٌ مكان القيمة في emp_type · «لا يرث أي صفحة» في نافذة إضافة مدير · «بيانات المنصة» لا تبقى اسماً لسجلٍّ يعرفه الخادم. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { D1Shim, WORKER, ROOT } from './harness.mjs';
import { installOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { world as stdWorld, workerUnderTest, notificationMessages, D as SD } from './world_fx.mjs';

const D = 'TEST_ONLY_D', NOW = Date.now();
async function load() {
  const src = fs.readFileSync(WORKER, 'utf8');
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'nfgrp-')), f = path.join(dir, 'w.mjs');
  fs.writeFileSync(f, src + '\nexport { initDb, kvPutStmts, opLegacyPrepare, opGuardRetired, NF_TYPES, nfFill, nfEmployeeEvents, nfDenyRecord, RES_REG };\n');
  try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
async function world(W) {
  const DB = new D1Shim();
  const env = { DB, KIVO_AUTHZ_MODE: 'enforce', ASSETS: { fetch: async () => new Response('<!doctype html><html><head><!--BS_BOOT--></head><body>TEST_ONLY</body></html>', { headers: { 'Content-Type': 'text/html' } }) } };
  await W.initDb(env); DB.exec('PRAGMA foreign_keys = ON');
  const ph = 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64);
  const users = [{ id: 'TEST_ONLY_super', un: '1000000001', name: 'TEST_ONLY مسؤول', role: 'super', ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_m', un: '1100000000', name: 'خالد الحربي', role: 'staff', deptId: D, ekey: 'mgr:' + D, mgr: 1, ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_u', un: '1200000000', name: 'سالم العتيبي', role: 'staff', deptId: D, ekey: 'TEST_ONLY_e', ph, mc: 0, dis: 0 }];
  const keys = { bassam_auth_users_v1: users, bassam_gdepts_v1: [], bassam_depts_v1: [{ id: D, name: 'إدارة الحشود' }],
    bassam_perms_v1: { caps: { [D]: ['staff', 'daily', 'emps'] }, emps: {} }, bassam_platform_v1: {}, ['bsdept:' + D + ':bassam_employees_v1']: [{ eid: 'TEST_ONLY_e', name: 'سالم العتيبي' }] };
  const st = [];
  for (const [k, v] of Object.entries(keys)) { st.push(...W.kvPutStmts(env, 'kv', k, JSON.stringify(v))); st.push(DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1)').bind(k)); }
  st.push(DB.prepare("INSERT INTO meta(k,v) VALUES('rev','1') ON CONFLICT(k) DO UPDATE SET v='1'"), DB.prepare("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'"));
  st.push(DB.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city) VALUES(?1,?2,?3,?3,?4,?5)').bind('TEST_ONLY_s_super', 'TEST_ONLY_super', NOW, 'TEST_ONLY', 'TEST_ONLY'));
  await DB.batch(st);
  await installOperationalFixture(env, W);
  return env;
}
const KR = 'bsdept:' + D + ':bassam_staffing_v3';
const put = (env, ts, o = {}) => { env.DB.exec("INSERT INTO sec(ts,uid,un,act,target,detail,ip,city,dev) VALUES(" + ts + "," + [o.uid || 'TEST_ONLY_m', '', 'denied', o.target || KR, o.detail || 'perm', '', '', ''].map((s) => "'" + s + "'").join(',') + ")"); return env.DB.q('SELECT MAX(id) AS id FROM sec')[0].id; };
async function poll(W, env) {
  const r = await W.default.fetch(new Request('http://x/api/notifications/act', { method: 'POST', headers: { Cookie: 'bs_tok=TEST_ONLY_s_super', 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: 'TEST_ONLY_super', op: 'security-poll' }) }), env, { waitUntil() {}, passThroughOnException() {} });
  const j = await r.json(); assert.equal(r.status, 200, JSON.stringify(j)); return j;
}
const deny = (env) => env.DB.q("SELECT m.body,d.once_key FROM notification_messages m LEFT JOIN notification_dedup d ON d.scope=m.scope AND d.message_id=m.id WHERE m.type='sc_deny' ORDER BY m.created_at,m.id");
const byRow = (env, id) => deny(env).find((m) => m.once_key === 'security:' + id);

test('53 · ٥: repeats from the same source within an hour are ONE notice — inside a poll and across polls — counted from the log; another source or a later hour is its own', { timeout: 300000 }, async () => {
  const W = await load(), env = await world(W);
  const T0 = NOW - 3 * 3600000;
  /* ١٢ رفضاً «قديماً» للسبب المحذوف، كلَّ ثلاث دقائق (٣٣ دقيقة) — دليلُ الفحص الحي — و١٢ رفضاً للصلاحية من المصدر نفسه كلَّ دقيقتين */
  const old = [], pm = [];
  for (let i = 0; i < 12; i++) old.push(put(env, T0 + i * 180000, { detail: 'reason' }));
  for (let i = 0; i < 12; i++) pm.push(put(env, T0 + i * 120000 + 7, { detail: 'view' }));
  await poll(W, env);
  assert.equal(deny(env).length, 2, 'twelve refusals of one source in 33 minutes: one notice (twice): ' + JSON.stringify(deny(env).map((m) => m.body)));
  assert.ok(byRow(env, old[0]).body.endsWith('— رُفض: هذه العملية تتطلب ذكر السبب.'), 'the approved wording of the «reason» notice is kept: ' + byRow(env, old[0]).body);
  assert.match(byRow(env, pm[0]).body, /\(١٢ محاولة خلال ساعة\)\.$/, byRow(env, pm[0]).body);
  /* استطلاعٌ ثانٍ: المصدرُ نفسُه ضمن الساعة ⇒ لا تنبيهَ جديد، والعددُ يُحدَّث من السجل */
  const more = [put(env, T0 + 40 * 60000, { detail: 'reason' }), put(env, T0 + 40 * 60000 + 1, { detail: 'view' }), put(env, T0 + 41 * 60000, { detail: 'view' })];
  const other = put(env, T0 + 41 * 60000 + 5, { uid: 'TEST_ONLY_u' });            /* مصدرٌ آخر ⇒ تنبيهُه */
  const p = put(env, T0 + 42 * 60000), p2 = put(env, T0 + 42 * 60000 + 30000);   /* سببٌ آخر للحساب نفسه ⇒ تنبيهُه، ومحاولتان خلال دقيقة */
  await poll(W, env);
  assert.equal(deny(env).length, 4, JSON.stringify(deny(env).map((m) => m.body)));
  for (const id of more) assert.equal(byRow(env, id), undefined, 'a repeat in a later poll opens no notice');
  assert.match(byRow(env, pm[0]).body, /\(١٤ محاولة خلال ساعة\)\.$/, 'recounted from the log: ' + byRow(env, pm[0]).body);
  assert.ok(byRow(env, other).body.startsWith('حاول سالم العتيبي (موظف — إدارة الحشود) تعديل «الجدول الشهري»'), byRow(env, other).body);
  assert.match(byRow(env, p).body, /\(محاولتان خلال دقيقة\)\.$/, byRow(env, p).body); assert.equal(byRow(env, p2), undefined);
  /* بعد النافذة (ساعة من أول صفّ) ⇒ تنبيهٌ جديد */
  const late = put(env, T0 + 3600000 + 1, { detail: 'reason' });
  await poll(W, env);
  assert.equal(deny(env).length, 5); assert.ok(byRow(env, late), 'a refusal after the window is a new notice');
  assert.doesNotMatch(byRow(env, late).body, /محاول(ة|تان|ات) خلال/, 'single attempt, no count');
  assert.equal((await poll(W, env)).n, 0, 'nothing is emitted twice');
  assert.equal(env.DB.q("SELECT COUNT(*) n FROM sec WHERE act='denied'")[0].n, 31, 'the security log keeps every row');
});

const UA = 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';
const DM = ['0000000101', '70101'];
test('53 · S11: 72 logins in an hour from the same IP and browser that keeps no device cookie → ONE «دخول من جهاز جديد»; another IP is its own notice', { timeout: 300000 }, async () => {
  const WU = workerUnderTest(), Wd = await stdWorld({ worker: WU.file });
  const scDev = () => notificationMessages(Wd.env, SD).filter((m) => m.type === 'sc_dev');
  const login = async (ip) => { const r = await Wd.C.req('/api/login', { method: 'POST', body: { u: DM[0], p: DM[1] }, headers: { 'User-Agent': UA, 'CF-Connecting-IP': ip } }); assert.equal((await r.json()).ok, 1); };
  await login('198.51.100.7');                                   /* أولُ دخولٍ مسجَّل: صامت */
  const n0 = scDev().length;
  for (let i = 0; i < 72; i++) await login('198.51.100.7');
  assert.equal(scDev().length, n0 + 1, 'one notice for the same device, not ' + (scDev().length - n0));
  await login('203.0.113.9');
  assert.equal(scDev().length, n0 + 2, 'another address is another device');
});

test('53 · ١٤: no empty «()» in emp_add, no dash for the employment type, the add-manager hint in plain words, «بيانات المنصة» is never the name of a record the server knows', async () => {
  const W = await load();
  const A = { u: { id: 'TEST_ONLY_m', name: 'خالد الحربي' }, depts: [{ id: D, name: 'إدارة الحشود' }] };
  const body = (e) => W.nfFill(W.NF_TYPES[e.type].txt, e.vars);
  const add = W.nfEmployeeEvents(A, D, [{ eid: 'a', name: 'سالم' }], [{ eid: 'a', name: 'سالم' }, { eid: 'b', name: 'فهد' }, { eid: 'c', name: 'نايف', type: 'رسمي' }]);
  const bodies = add.filter((e) => e.type === 'emp_add').map(body).sort();
  assert.deepEqual(bodies, ['أُضيف فهد (بلا نوع توظيف) إلى موظفي الإدارة', 'أُضيف نايف (رسمي) إلى موظفي الإدارة'].sort());
  for (const b of bodies) assert.doesNotMatch(b, /\(\s*\)/, b);
  const ty = W.nfEmployeeEvents(A, D, [{ eid: 'a', name: 'سالم', type: 'رسمي' }], [{ eid: 'a', name: 'سالم' }]).filter((e) => e.type === 'emp_type').map(body);
  assert.deepEqual(ty, ['تغيّر نوع التوظيف إلى «غير محدّد»']);
  /* نافذةُ إضافة مدير (العميل المولَّد) */
  const admin = fs.readFileSync(path.join(ROOT, 'src/modules/admin/logic.js'), 'utf8');
  assert.ok(!admin.includes('لا يرث أي صفحة'), 'the add-manager hint no longer says «لا يرث أي صفحة»');
  assert.ok(admin.includes('ولا تُفتح له أي صفحة تلقائياً. بعد الحفظ افتح «الصلاحيات» من جدول المستخدمين واختر الصفحات التي يعمل عليها.'));
  /* «بيانات المنصة»: لكل سجلٍّ يعرفه الخادم (RES_REG وحالةُ نوافذ الاستدراك) اسمٌ في تنبيه الرفض (019) وفي العميل —
     KIVO.BassamKeyLabels (280) أو خريطةُ سجل الأمن والنشاط في الإعدادات (admin adKeyLbl) التي تسقط إلى «بيانات المنصة» */
  const c = fs.readFileSync(path.join(ROOT, 'src/api/280-server-storage.js'), 'utf8'), i = c.indexOf('KIVO.BassamKeyLabels'), M = c.slice(i, c.indexOf('function unscope', i));
  const j = admin.indexOf('adKeyLbl(t) {'), AM = admin.slice(j, admin.indexOf('"بيانات المنصة"', j));
  const keys = Object.keys(W.RES_REG).concat(['bassam_irshad_retro_v1', 'bassam_seized_retro_v1', 'bassam_rasd_retro_v1']);
  for (const k of keys) {
    assert.notEqual(W.nfDenyRecord(k), 'بيانات المنصة', k + ' is named in the refused-write notice');
    assert.ok(new RegExp('\\b' + k + ':\\[').test(M) || new RegExp('\\b' + k + ': "').test(AM), k + ' is named in the client (key labels or the security/activity log)');
  }
});
