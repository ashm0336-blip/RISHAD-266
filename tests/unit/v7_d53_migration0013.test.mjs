/* V7 · 53 · الترحيل 0013 (التخزين بالفترة) على قاعدةٍ بالمخطط 12 يبنيها العاملُ القديم نفسُه (3486e01 — قاعدةُ الحزمة 53) بطريق كتابته الحقيقية
   (/api/save)، ببياناتٍ اصطناعية TEST_ONLY بشكلين: وثائقُ العرض كما يصدّرها Preview (legacyDocs) · وعالمُ إدارةٍ بشكل الإنتاج (s1_world: __pMig أولاً ·
   علاماتُ الأشهر · أيامٌ كثيرة · إجازةٌ تعبر الشهر · مهام).
   ① بلا تصريح: يرفض ولا يكتب · ② بالتصريح 12 ← 13: الجدولُ الجديد · الإداراتُ معلَّقة · كلُّ وثيقةٍ تُقرأ حرفاً كما كُتبت · القراءةُ بالفترة تطابق
   شرائحها · ③ الكتابةُ التشغيلية مرفوضةٌ 503 ops-layout-pending برسالة عربية · العاملُ القديم يرفض قاعدة 13 (503) · ④ المرحلةُ ٢ لكل إدارة:
   الملخّصاتُ تطابق ما يُحسب من الوثائق القديمة صفّاً بصفّ · الإدارةُ تخرج من القائمة · الحفظُ يعمل · إعادتُها لا تغيّر شيئاً ·
   ⑤ الرجوع: نقطةُ استرجاعٍ قبل التصريح + الحزمةُ القديمة ⇒ القاعدةُ والبياناتُ كما كانت · ⑥ فشلُ دفعة الترحيل: لا أثرَ جزئي. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { D1Shim, ROOT, WORKER, CURRENT_SCHEMA, allowTestSchemaUpgrade, hasSystem } from './harness.mjs';
import { build } from '../load/s1_world.mjs';
import { legacyDocs } from './v7_d6_import_fx.mjs';

const OLD_REV = process.env.KIVO_UPGRADE13_REV || '3486e01';
const D1 = 'TEST_ONLY_m13_preview', D2 = 'TEST_ONLY_m13_prod', G = 'TEST_ONLY_m13_group', SUPER = 'TEST_ONLY_m13_super', TOK = 'TEST_ONLY_m13_session';
let oldSource = null, why = '';
try { oldSource = execFileSync('git', ['-C', ROOT, 'show', OLD_REV + ':workers/_worker.js'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); }
catch (e) { why = 'يحتاج تاريخ git للمرجع ' + OLD_REV; }
const need = !oldSource ? { skip: why } : hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport') ? {} : { skip: 'يحتاج أنظمة المخطط والجولات والمهام والجدول والتقرير' };
let inst = 0;
async function load(source, tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_m13_')), file = path.join(dir, tag + '.mjs');
  fs.writeFileSync(file, source + (tag === 'new' ? '\nexport { opInfo, osSumRounds, osSumReport, osSumTasks, osSumStaffing, osSumPlan, opSplit };\n' : ''));
  try { return await import(pathToFileURL(file).href + '?inst=' + ++inst); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function env(DB) {
  return { DB: DB || new D1Shim(), KIVO_AUTHZ_MODE: 'enforce', ASSETS: { fetch: async () => new Response('<!doctype html><html><head><!--BS_BOOT--></head><body>TEST_ONLY</body></html>', { headers: { 'Content-Type': 'text/html' } }) } };
}
function api(W, E) {
  return async (route, { method = 'GET', body } = {}) => {
    const headers = new Headers({ Cookie: 'bs_tok=' + TOK });
    if (method !== 'GET') { headers.set('Origin', 'http://x'); headers.set('Content-Type', 'application/json'); }
    const r = await W.default.fetch(new Request('http://x' + route, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), E);
    let json = null; try { json = await r.json(); } catch (e) { /* ليس JSON */ }
    return { status: r.status, json };
  };
}
const key = (d, r) => 'bsdept:' + d + ':' + r;
const SPLIT = ['bassam_plan_v1', 'bassam_staffing_v3', 'bassam_rounds_v1', 'bassam_dreport_v1', 'bassam_tasks_v1'];
const ALL = SPLIT.concat(['bassam_employees_v1', 'bassam_shift_options_v1']);
async function readAll(call, d) {
  const r = await call('/api/operations/read?' + new URLSearchParams({ uid: SUPER, keys: ALL.map((x) => key(d, x)).join(',') }));
  assert.equal(r.status, 200, JSON.stringify(r.json).slice(0, 300));
  return r.json;
}
let rq = 0;
async function saveDoc(call, d, r, v) {
  const r0 = await call('/api/operations/read?' + new URLSearchParams({ uid: SUPER, keys: key(d, r) }));
  return call('/api/save', { method: 'POST', body: { uid: SUPER, requestId: 'TEST_ONLY_m13_' + ++rq, epoch: r0.json.epoch, base: r0.json.base, set: { [key(d, r)]: JSON.stringify(v) }, del: [] } });
}
function seedIdentity(E) {
  const caps = ['plan', 'daily', 'dreport', 'tasks', 'staff', 'emps', 'admin'];
  const kv = {
    bassam_auth_users_v1: [{ id: SUPER, un: '1000000977', name: 'TEST_ONLY مدير المنصة', role: 'super', ph: 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64), mc: 0, dis: 0 }],
    bassam_gdepts_v1: [{ id: G, name: 'TEST_ONLY إدارة عامة', kind: 'إدارة عامة' }],
    bassam_depts_v1: [{ id: D1, name: 'TEST_ONLY إدارة بشكل Preview', gid: G }, { id: D2, name: 'TEST_ONLY إدارة بشكل الإنتاج', gid: G }],
    bassam_perms_v1: { caps: { [G]: caps, [D1]: caps, [D2]: caps }, emps: { [D1]: {}, [D2]: {} } },
    bassam_platform_v1: {},
  };
  for (const [k, v] of Object.entries(kv)) { E.DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,0,?) ON CONFLICT DO NOTHING').run(k, JSON.stringify(v)); E.DB.db.prepare('INSERT INTO revs(k,rev) VALUES(?,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').run(k); }
  E.DB.exec("INSERT INTO meta(k,v) VALUES('rev','1') ON CONFLICT(k) DO UPDATE SET v='1'; INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  E.DB.db.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city) VALUES(?,?,?,?,?,?)').run(TOK, SUPER, Date.now(), Date.now(), 'TEST_ONLY', 'TEST_ONLY');
}
function snapshot(DB) { const f = path.join(os.tmpdir(), 'kivo_m13_bookmark_' + process.pid + '_' + ++inst + '.db'); DB.db.exec("VACUUM INTO '" + f + "'"); return f; }
function restore(file) { const S = new D1Shim(); S.db = new DatabaseSync(file); return S; }

test('53 · 0013 على قاعدةٍ بالمخطط 12 بناها العاملُ القديم: التصريح · التعليق · المرحلة ٢ · المطابقةُ صفّاً بصف · الرجوع', { ...need, timeout: 900000 }, async () => {
  const OLD = await load(oldSource, 'old'), E = env(), call0 = api(OLD, E);
  assert.equal((await call0('/api/ping')).status, 200);
  assert.equal(E.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA - 1), 'العاملُ القديم بالمخطط السابق');
  seedIdentity(E);
  /* البياناتُ بطريق كتابة العامل القديم */
  const demo = await legacyDocs(), cur = (await call0('/api/me?uid=' + SUPER)).json?.day?.ym || '1448-6';
  const world = build({ EMP: 40, PLAN_M: 3, STF_M: 3, DAYS: 45, ZONES: 3, TASKS: 2 }, cur).docs;
  const setD1 = { bassam_plan_v1: demo.bassam_plan_v1, bassam_rounds_v1: demo.bassam_rounds_v1, bassam_dreport_v1: demo.bassam_dreport_v1, bassam_staffing_v3: demo.bassam_staffing_v3, bassam_employees_v1: demo.bassam_employees_v1, bassam_shift_options_v1: demo.bassam_shift_options_v1 };
  for (const [d, docs] of [[D1, setD1], [D2, world]]) for (const r of ['bassam_employees_v1', 'bassam_shift_options_v1'].concat(SPLIT)) {
    if (docs[r] === undefined || r === 'bassam_tasks_v1') continue;   /* المهامُ بالأوامر وحسابات الموظفين — خاصيتُها في v7_d53_periods */
    const s = await saveDoc(call0, d, r, docs[r]);
    assert.equal(s.status, 200, d + ' ' + r + ': ' + JSON.stringify(s.json).slice(0, 300));
  }
  const before = { [D1]: (await readAll(call0, D1)).resources, [D2]: (await readAll(call0, D2)).resources };
  /* ① بلا تصريح: يرفض ولا يكتب */
  const NEW = await load(fs.readFileSync(WORKER, 'utf8'), 'new'), call = api(NEW, E);
  assert.ok((await call('/api/ping')).status >= 500, 'بلا تصريح لا ترقية');
  assert.equal(E.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA - 1));
  const bookmark = snapshot(E.DB);   /* نقطةُ الاسترجاع قبل التصريح (Time Travel bookmark) */
  /* ⑥ فشلُ الدفعة الذرّية: لا جدولَ ولا تسجيلَ ولا تعليقَ جزئي، والطلبُ التالي يكمل */
  allowTestSchemaUpgrade(E.DB);
  E.DB.failIf = (sql) => /ops_layout_pending/.test(sql) && /^INSERT/.test(sql);
  assert.ok((await api(await load(fs.readFileSync(WORKER, 'utf8'), 'new'), E)('/api/ping')).status >= 500);
  E.DB.failIf = null;
  assert.equal(E.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA - 1));
  assert.equal(E.DB.q("SELECT COUNT(*) n FROM sqlite_master WHERE name='ops_period_summary'")[0].n, 0);
  /* ② بالتصريح: 12 ← 13 في أول طلب */
  const permit = JSON.parse(allowTestSchemaUpgrade(E.DB));
  assert.deepEqual(permit.migrations, ['0013_period_storage']);
  const call2 = api(await load(fs.readFileSync(WORKER, 'utf8'), 'new'), E);
  assert.equal((await call2('/api/ping')).status, 200);
  assert.equal(E.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA));
  assert.equal(E.DB.q("SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 1")[0].name, '0013_period_storage');
  assert.equal(E.DB.q("SELECT COUNT(*) n FROM meta WHERE k='schema_upgrade_permit_v1'")[0].n, 0, 'التصريحُ استُهلك');
  assert.deepEqual(JSON.parse(E.DB.q("SELECT v FROM meta WHERE k='ops_layout_pending'")[0].v), [D1, D2].sort());
  assert.deepEqual(E.DB.q('PRAGMA foreign_key_check'), []);
  for (const d of [D1, D2]) {
    const after = (await readAll(call2, d)).resources;
    for (const r of ALL) assert.equal(JSON.stringify(after[key(d, r)]), JSON.stringify(before[d][key(d, r)]), d + ' ' + r + ' كما كُتب');
  }
  /* القراءةُ بالفترة تطابق شرائحَ الوثيقة القديمة */
  const RK = key(D2, 'bassam_rounds_v1'), days = Object.keys(before[D2][RK]).filter((k) => /^\d/.test(k)), pick = [days[0], days[days.length - 1], 'm:' + cur];
  const pr = await call2('/api/operations/read?' + new URLSearchParams({ uid: SUPER, keys: pick.map((p) => RK + '@' + p).concat([RK + '@']).join(',') }));
  assert.equal(pr.status, 200, JSON.stringify(pr.json).slice(0, 300));
  pick.forEach((p) => assert.deepEqual(pr.json.resources[RK + '@' + p], before[D2][RK][p], p));
  assert.deepEqual(pr.json.resources[RK + '@'], { __pMig: before[D2][RK].__pMig });
  /* ③ الكتابةُ التشغيلية مرفوضةٌ حتى المرحلة ٢ — برسالة · والعاملُ القديم يرفض القاعدةَ الجديدة */
  const refused = await saveDoc(call2, D2, 'bassam_rounds_v1', { ...before[D2][RK], __pMig: 3 });
  assert.equal(refused.status, 503, JSON.stringify(refused.json)); assert.equal(refused.json.err, 'ops-layout-pending'); assert.match(refused.json.msg, /تحويل تخزين/);
  assert.equal((await api(await load(oldSource, 'old'), E)('/api/ping')).status, 503, 'الحزمةُ القديمة لا تعمل على 13');
  /* ④ المرحلة ٢ لكل إدارة: الملخّصاتُ صفّاً بصف مع ما يُحسب من الوثائق القديمة */
  const mig = await call2('/api/operations/periods-migrate', { method: 'POST', body: { dept: 'all' } });
  assert.equal(mig.status, 200, JSON.stringify(mig.json).slice(0, 600)); assert.equal(mig.json.ok, 1, JSON.stringify(mig.json).slice(0, 600));
  assert.deepEqual(mig.json.pending, []);
  const N = await load(fs.readFileSync(WORKER, 'utf8'), 'new');
  let compared = 0;
  for (const d of [D1, D2]) for (const r of SPLIT) {
    const doc = before[d][key(d, r)]; if (doc == null) continue;
    const info = N.opInfo(key(d, r)), parts = N.opSplit(info, doc), rows = Object.fromEntries(E.DB.q('SELECT period,v_json FROM ops_period_summary WHERE department_id=?1 AND resource=?2', d, r).map((x) => [x.period, JSON.parse(x.v_json)]));
    for (const p of Object.keys(parts.periods)) { const want = info.definition.period.summary(p, parts.periods[p]); if (want && typeof info.definition.period.kpi === 'function') want.kpi = info.definition.period.kpi(p, parts.periods[p]); assert.deepEqual(rows[p], JSON.parse(JSON.stringify(want)), d + ' ' + r + ' ' + p); compared++; }
    assert.equal(Object.keys(rows).length, Object.keys(parts.periods).length, d + ' ' + r + ': صفٌّ لكل فترة');
  }
  assert.ok(compared > 60, 'مطابقةُ ' + compared + ' فترة');
  const again = await call2('/api/operations/periods-migrate', { method: 'POST', body: { dept: 'all' } });
  assert.deepEqual([again.status, again.json.departments.length], [200, 0], 'إعادتُها لا تفعل شيئاً');
  const ok = await saveDoc(call2, D2, 'bassam_rounds_v1', { ...before[D2][RK], __pMig: 3 });
  assert.equal(ok.status, 200, JSON.stringify(ok.json).slice(0, 300));
  /* ⑤ الرجوع: نقطةُ الاسترجاع + الحزمةُ القديمة ⇒ المخطط 12 والبياناتُ كما كانت (تضيع كتابات ما بعد الترقية) */
  const E0 = env(restore(bookmark)), back = api(await load(oldSource, 'old'), E0);
  assert.equal((await back('/api/ping')).status, 200);
  assert.equal(E0.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA - 1));
  for (const d of [D1, D2]) { const rb = (await readAll(back, d)).resources; for (const r of ALL) assert.equal(JSON.stringify(rb[key(d, r)]), JSON.stringify(before[d][key(d, r)]), 'بعد الرجوع: ' + d + ' ' + r); }
  fs.rmSync(bookmark, { force: true });
});
