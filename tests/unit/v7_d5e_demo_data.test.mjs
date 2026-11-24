/* V7 · د5-هـ (م6) — بياناتُ العرض التجريبية TEST_ONLY بأمرٍ واحد (POST /api/demo-data) على العامل الحقيقي (قاعدةٌ في الذاكرة · الإنفاذ · أداةُ الاختبار):
   (أ) لقطةُ كلِّ جدول (عددُ الصفوف + بصمةُ المحتوى — عدا السجلات المسمّاة) ← زرع ← كلُّ نظامٍ حاضر له محتوى يُقرأ من مسارات القراءة الحقيقية ← حذف ← كلُّ جدولٍ = اللقطة
       وما كان في القاعدة قبل الزرع (إدارةٌ وموظفون ويومُ إحصاءٍ حقيقي) لا يُمسّ
   (ب) الزرعُ مرتين ⇒ الثاني يُرفض برسالة · الحذفُ مرتين ⇒ الثاني بلا أثر · حسابُ العرض يدخل بكلمته المكشوفة مرةً واحدة · وغيرُ مدير المنصة 403
   (ج) بلا KIVO_TEST_FIXTURE=allow · مضيفُ الإنتاج أو غيرُ مضيف الاختبار · بلا الإنفاذ ⇒ 404 · وانحرافُ سجلٍّ مشترك بعد الزرع ⇒ رفضٌ إلا بـforce
   (د) حزمةُ الإنتاج (tools/prod_strip.py على نسخة): المسارُ 404 وكودُ الأداة غائب */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { makeTestEnv, client, hasSystem, PYTHON, ROOT, WORKER, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

/* السجلاتُ والأدلةُ والجلساتُ والعدّاداتُ الذاتية: قد تبقى بعد الحذف (سجلُّ من زرع ومن حذف) — كلُّ ما سواها يعود بايتاً */
const LOG_TABLES = ['aud', 'audit', 'sec', 'authz', 'authz_snap', 'authz_snaps', 'sess', 'guard', 'sqlite_sequence', 'restore_operations', 'restore_preimage', 'restore_snapshot_manifest'];
const ENF = { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' };
const R1 = 'TEST_ONLY_real_d1', G1 = 'TEST_ONLY_real_g';

function snapshot(DB) {
  const out = {};
  for (const { name } of DB.q("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")) {
    if (LOG_TABLES.includes(name)) continue;
    const rows = DB.q('SELECT * FROM ' + name), lines = rows.map((r) => JSON.stringify(Object.values(r))).sort();
    out[name] = { n: rows.length, sha: crypto.createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16) };
  }
  return out;
}
const diffOf = (a, b) => Object.keys(Object.assign({}, a, b)).filter((t) => JSON.stringify(a[t]) !== JSON.stringify(b[t])).map((t) => t + ' ' + JSON.stringify(a[t]) + ' → ' + JSON.stringify(b[t]));

/* عالمٌ صغير فيه بياناتٌ «حقيقية» (غيرُ العرض) تسبق الزرع: إدارةٌ عامة وإدارة وصلاحياتها وموظفوها ويومُ إحصاءٍ اليوم */
async function world(extra = ENF, base = 'http://x') {
  const env = makeTestEnv(extra), C = client(env, base);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, JSON.stringify(su.j));
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const post = (p, body, ck = su.ck) => C.api(p, { method: 'POST', cookie: ck, body });
  const demo = (body, ck) => post('/api/demo-data', body, ck);
  return { env, C, su, post, demo };
}
async function seedReal(W) {
  const { C, su } = W;
  const J = JSON.stringify, s1 = await C.save(su.ck, { bassam_gdepts_v1: J([{ id: G1, name: 'TEST_ONLY real group', kind: 'إدارة عامة' }]), bassam_depts_v1: J([{ id: R1, name: 'TEST_ONLY real dept', gid: G1 }]) });
  assert.equal(s1.j.ok, 1, JSON.stringify(s1));
  const p0 = await C.api('/api/get?keys=bassam_perms_v1', { cookie: su.ck }), perms = JSON.parse((p0.j.keys.bassam_perms_v1 || {}).v || '{}');
  perms.caps = Object.assign({}, perms.caps, { [R1]: ['emps', 'admin'] });
  const s2 = await C.save(su.ck, { bassam_perms_v1: J(perms) }); assert.equal(s2.j.ok, 1, JSON.stringify(s2));
  const KE = 'bsdept:' + R1 + ':bassam_employees_v1';   /* موردٌ تشغيلي: مغلّفُ الحفظ الذرّي (requestId · epoch · base) */
  const s3 = await W.post('/api/save', { set: { [KE]: J([{ eid: 'TEST_ONLY_real_e1', name: 'TEST_ONLY real employee', empno: '5550001' }]) }, base: { [KE]: 0 }, requestId: 'TEST_ONLY_real_emp_1', epoch: 0 });
  assert.equal(s3.j.ok, 1, JSON.stringify(s3));
  if (hasSystem('dstats')) {
    const v = await C.api('/api/dstats?uid=' + encodeURIComponent(su.j.u?.id || su.j.uid || ''), { cookie: su.ck });
    const t = new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(Date.now() - 3 * 3600e3)).reduce((o, p) => (o[p.type] = +p.value, o), {});
    W.realDay = t.year + '-' + String(t.month).padStart(2, '0') + '-' + String(t.day).padStart(2, '0');
    const r = await W.post('/api/dstats', { base: v.j.rev, data: { haram: { [W.realDay]: { worshippers: 4242 } }, nabawi: {}, locks: {} } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
  }
}
/* V7 · 53 تقويم: اليومُ التشغيلي (الرياض بمهلة ثلاث ساعات) ميلادي — الإحصائياتُ والاسترشادُ والمضبوطات بمفاتيح ISO ميلادية (كان هجرياً) */
const today = () => new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(Date.now() - 3 * 3600e3)).reduce((o, p) => (o[p.type] = +p.value, o), {});

test('(أ) لقطة ← زرع (كلُّ نظامٍ حاضر له محتوى من مسارات القراءة) ← حذف ⇒ كلُّ جدولٍ غيرِ سجلٍّ = اللقطة، والحقيقيُّ لم يُمسّ', async (t) => {
  const W = await world(), { env, C, su, demo } = W;
  await seedReal(W);
  const before = snapshot(env.DB);
  const pre = await demo({ act: 'preview' }); assert.equal(pre.status, 200, JSON.stringify(pre.j)); assert.equal(pre.j.seeded, false); assert.ok(pre.j.statements > 0);
  assert.deepEqual(snapshot(env.DB), before, 'المعاينةُ لا تكتب شيئاً');
  const s = await demo({ act: 'seed' }); assert.equal(s.status, 200, JSON.stringify(s.j)); assert.equal(s.j.ok, 1);
  assert.equal(s.j.secrets, undefined, 'بلا reveal لا كلمةَ مرور في الرد');
  assert.equal(s.j.foreign, 0, 'لا كتابةَ متزامنة');
  const c = s.j.counts, D1 = 'tst_demo_d1', D2 = 'tst_demo_d2';
  assert.deepEqual(s.j.depts, ['tst_demo_g', D1, D2, 'tst_demo_s1']);
  assert.ok(c.base.accounts === 5 && c.base.employees >= 6 && c.base.notifications > 0, JSON.stringify(c.base));
  /* كلُّ نظامٍ حاضر قدّم محتوى، والغائبُ لا يظهر */
  for (const sys of ['staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'custody', 'dstats']) {
    if (!hasSystem(sys)) { assert.equal(c[sys], undefined, sys + ' غائب ⇒ لا محتوى'); continue; }
    assert.ok(c[sys] && Object.values(c[sys]).some((n) => n > 0), sys + ': ' + JSON.stringify(c[sys]));
  }
  const uid = encodeURIComponent((await C.api('/api/whoami', { cookie: su.ck })).j.uid || '');
  const T = today(), N = (x) => (Array.isArray(x) ? x.length : x && typeof x === 'object' ? Object.keys(x).length : 0);
  /* القراءةُ الحقيقية: الإدارات والحسابات */
  const g = await C.api('/api/get?keys=bassam_depts_v1,bassam_auth_users_v1', { cookie: su.ck });
  const depts = JSON.parse(g.j.keys.bassam_depts_v1.v), users = JSON.parse(g.j.keys.bassam_auth_users_v1.v);
  assert.deepEqual(depts.filter((d) => /^tst_demo_/.test(d.id)).map((d) => d.id), [D1, D2, 'tst_demo_s1']);
  const demoUsers = users.filter((u) => /^tst_demo_/.test(u.id));
  assert.equal(demoUsers.length, 5); assert.ok(demoUsers.every((u) => u.test === 'TEST_ONLY' && /^TEST_ONLY · /.test(u.name) && u.ph === undefined), 'موسومةٌ وبلا بصمة في القراءة');
  /* الموارد التشغيلية لكل نظامٍ حاضر */
  const opKeys = [['base', 'bassam_employees_v1'], ['staff', 'bassam_staffing_v3'], ['plan', 'bassam_plan_v1'], ['daily', 'bassam_rounds_v1'], ['dreport', 'bassam_dreport_v1'], ['tasks', 'bassam_tasks_v1']]
    .filter(([sys]) => sys === 'base' || hasSystem(sys)).map(([sys, r]) => [sys, 'bsdept:' + D1 + ':' + r]);
  const op = await C.api('/api/operations/read?uid=' + uid + '&keys=' + encodeURIComponent(opKeys.map((x) => x[1]).join(',')), { cookie: su.ck });
  assert.equal(op.status, 200, JSON.stringify(op.j).slice(0, 300));
  const seen = {};
  for (const [sys, k] of opKeys) { const v = op.j.resources[k]; seen[sys] = sys === 'plan' ? N(v && v.floors) : N(v); assert.ok(seen[sys] > 0, sys + ' يُقرأ: ' + JSON.stringify(v).slice(0, 200)); }
  if (hasSystem('plan')) assert.ok(op.j.resources['bsdept:' + D1 + ':bassam_plan_v1'].floors.every((f) => f.sid && f.zones.length), 'مواقعُ بمعرّفٍ ومصليات');
  const q = (p, o) => C.api(p + '?' + new URLSearchParams(Object.assign({ uid: decodeURIComponent(uid), dept: D1 }, o)), { cookie: su.ck });
  if (hasSystem('irshad')) { const r = await q('/api/irshad', { view: 'records', year: T.year, month: T.month }); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); seen.irshad = N(r.j.reports || r.j.rows || r.j.records); assert.ok(seen.irshad > 0, JSON.stringify(r.j).slice(0, 300)); }
  if (hasSystem('seized')) { const r = await q('/api/seized', { view: 'records', year: T.year, month: T.month }); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); seen.seized = N(r.j.reports || r.j.rows || r.j.records); assert.ok(seen.seized > 0, JSON.stringify(r.j).slice(0, 300)); }
  if (hasSystem('award')) { const r = await q('/api/award', { view: 'records' }); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); seen.award = N(r.j.recs || r.j.records || r.j.rows || (r.j.data && r.j.data.recs)); assert.ok(seen.award > 0, JSON.stringify(r.j).slice(0, 300)); }
  if (hasSystem('custody')) { const r = await q('/api/custody', { view: 'month' }); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); seen.custody = JSON.stringify(r.j).split('TEST_ONLY · ').length - 1; assert.ok(seen.custody > 0, JSON.stringify(r.j).slice(0, 300)); }
  if (hasSystem('dstats')) {
    const r = await C.api('/api/dstats?uid=' + uid, { cookie: su.ck }); assert.equal(r.status, 200);
    seen.dstats = Object.values(r.j.data.haram).concat(Object.values(r.j.data.nabawi)).filter((v) => v.__m && /TEST_ONLY/.test(v.__m.n) && typeof v.__m.t === 'number')   /* V7 · د6 (QA): بصمةٌ بشكل الصفحة — الوسمُ في n والوقتُ رقمي */.length; assert.ok(seen.dstats > 0);
    assert.equal(r.j.data.haram[W.realDay].worshippers, 4242, 'يومُ الإحصاء الحقيقي لم يُستبدل'); assert.equal(r.j.data.haram[W.realDay].__m, undefined);
  }
  /* إشعاراتُ مدير الإدارة التجريبية تُقرأ بهويته عبر جلسة الاختبار الداخلية (حسابُ العرض tst_* موسومٌ TEST_ONLY) */
  const nf = await W.post('/api/authz-test', { uid: 'tst_demo_u_m1', path: '/api/notifications?uid=tst_demo_u_m1', method: 'GET' });
  assert.equal(nf.status, 200, JSON.stringify(nf.j)); assert.equal(nf.j.status, 200, JSON.stringify(nf.j).slice(0, 300));
  seen.notifications = (nf.j.json.items || []).filter((x) => /TEST_ONLY/.test(JSON.stringify(x))).length; assert.ok(seen.notifications > 0, JSON.stringify(nf.j).slice(0, 300));
  const st = await demo({ act: 'status' }); assert.equal(st.j.seeded, true); assert.equal(st.j.state, 'seeded'); assert.ok(Object.keys(st.j.demoRows).length > 5);
  t.diagnostic('counts: ' + JSON.stringify(c) + ' · read back: ' + JSON.stringify(seen));
  /* الحذف */
  const r = await demo({ act: 'remove' }); assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.ok, 1);
  assert.ok(Object.values(r.j.shared).every((x) => x === 'exact'), JSON.stringify(r.j.shared)); assert.deepEqual(r.j.keptCounters, []);
  assert.deepEqual(diffOf(before, snapshot(env.DB)), [], 'كلُّ جدولٍ غيرِ سجلٍّ يعود كما كان');
  /* السجلاتُ تبقى (من زرع ومن حذف): قراراتُ الأداة في authz/sec إن كُتبت — لا تُحذف */
});

test('(ب) الزرعُ مرتين يُرفض · الحذفُ مرتين بلا أثر · حسابُ العرض يدخل بكلمته المكشوفة مرةً واحدة · غيرُ مدير المنصة 403', async () => {
  const W = await world(), { env, C, demo } = W;
  const before = snapshot(env.DB);
  const s = await demo({ act: 'seed', reveal: true }); assert.equal(s.status, 200, JSON.stringify(s.j));
  assert.equal(s.j.secrets.length, 5); assert.ok(s.j.secrets.every((x) => /^tst_demo_u_/.test(x.id) && /^\d{6}$/.test(x.pw)));
  const stored = env.DB.q("SELECT group_concat(v,'') v FROM (SELECT v FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq)")[0].v + JSON.stringify(env.DB.q('SELECT * FROM meta'));
  assert.ok(s.j.secrets.every((x) => !stored.includes(x.pw)), 'كلمةُ المرور لا تُكتب — بصمتُها وحدها');
  const mid = snapshot(env.DB);
  const s2 = await demo({ act: 'seed' }); assert.equal(s2.status, 409); assert.equal(s2.j.err, 'demo-already-seeded'); assert.ok(s2.j.msg);
  assert.deepEqual(snapshot(env.DB), mid, 'الزرعُ الثاني لا يكتب');
  /* حسابُ موظفٍ تجريبي يدخل ثم يُرفض على الأداة */
  const e = s.j.secrets.find((x) => x.id === 'tst_demo_u_e11'), m = s.j.secrets.find((x) => x.id === 'tst_demo_u_m1');
  const el = await C.login(e.un, e.pw); assert.ok(el.ok, JSON.stringify(el.j));
  const ml = await C.login(m.un, m.pw); assert.ok(ml.ok, JSON.stringify(ml.j));
  for (const ck of [el.ck, ml.ck]) { const x = await demo({ act: 'status' }, ck); assert.equal(x.status, 403, JSON.stringify(x.j)); }
  const x = await demo({ act: 'remove' }, ml.ck); assert.equal(x.status, 403);
  const bad = await demo({ act: 'seed', extra: 1 }); assert.equal(bad.status, 400); assert.equal(bad.j.err, 'bad-body');
  const badAct = await demo({ act: 'wipe' }); assert.equal(badAct.status, 400); assert.equal(badAct.j.err, 'act');
  const r1 = await demo({ act: 'remove' }); assert.equal(r1.status, 200, JSON.stringify(r1.j)); assert.ok(!r1.j.noop);
  assert.equal(env.DB.q("SELECT COUNT(*) n FROM sess WHERE uid GLOB 'tst_demo_*'")[0].n, 0, 'جلساتُ حسابات العرض انتهت');
  const after1 = snapshot(env.DB); assert.deepEqual(diffOf(before, after1), []);
  const r2 = await demo({ act: 'remove' }); assert.equal(r2.status, 200); assert.equal(r2.j.noop, 1);
  assert.deepEqual(snapshot(env.DB), after1, 'الحذفُ الثاني بلا أثر');
  assert.equal((await C.login(e.un, e.pw)).ok, false, 'حسابُ العرض زال');
});

test('(ج) بلا أداة الاختبار · مضيفٌ غيرُ الاختبار · بلا الإنفاذ ⇒ 404 — وانحرافُ سجلٍّ مشترك ⇒ رفضٌ إلا بـforce', async () => {
  const noFixture = await world({ KIVO_AUTHZ_MODE: 'enforce' });
  const a = await noFixture.demo({ act: 'seed' }); assert.equal(a.status, 404); assert.equal(a.j.err, 'not-found');
  for (const host of ['https://kivo-d81.pages.dev', 'https://other.example.com']) {
    const w = await world(ENF, host); const b = await w.demo({ act: 'seed' }); assert.equal(b.status, 404, host); assert.equal(b.j.err, 'not-found');
    assert.equal(w.env.DB.q("SELECT COUNT(*) n FROM meta WHERE k='tst_demo_manifest'")[0].n, 0);
  }
  const pinned = await world(Object.assign({ KIVO_TEST_HOST: 'test.kivo-d81.pages.dev' }, ENF), 'https://x.kivo-d81.pages.dev');
  assert.equal((await pinned.demo({ act: 'status' })).status, 404, 'مضيفُ الاختبار المعلن وحده');
  const legacy = await world({ KIVO_TEST_FIXTURE: 'allow' }); const c = await legacy.demo({ act: 'seed' }); assert.equal(c.status, 404);
  /* الانحراف: سجلُّ الإدارات تغيّر بعد الزرع (إدارةٌ حقيقية جديدة) */
  const W = await world(), { env, C, su, demo } = W;
  assert.equal((await demo({ act: 'seed' })).status, 200);
  const g = await C.api('/api/get?keys=bassam_depts_v1', { cookie: su.ck }), depts = JSON.parse(g.j.keys.bassam_depts_v1.v);
  const sv = await C.save(su.ck, { bassam_depts_v1: JSON.stringify(depts.concat([{ id: 'TEST_ONLY_late', name: 'TEST_ONLY late dept' }])) }); assert.equal(sv.j.ok, 1, JSON.stringify(sv));
  const r = await demo({ act: 'remove' }); assert.equal(r.status, 409); assert.equal(r.j.err, 'demo-drift'); assert.ok(r.j.drift.some((d) => d.key === 'bassam_depts_v1'));
  assert.equal(env.DB.q("SELECT COUNT(*) n FROM meta WHERE k='tst_demo_manifest'")[0].n, 1, 'لم يُحذف شيء');
  const f = await demo({ act: 'remove', force: true }); assert.equal(f.status, 200, JSON.stringify(f.j)); assert.equal(f.j.shared.bassam_depts_v1, 'stripped');
  const left = JSON.parse((await C.api('/api/get?keys=bassam_depts_v1', { cookie: su.ck })).j.keys.bassam_depts_v1.v);
  assert.deepEqual(left.map((d) => d.id), ['TEST_ONLY_late'], 'force يُبقي التغييرَ اللاحق وينزع العرضَ وحده');
  assert.equal(env.DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE department_id GLOB 'tst_demo_*'")[0].n, 0);
});

test('(د) حزمةُ الإنتاج: tools/prod_strip.py ينزع الأداة ⇒ /api/demo-data 404 بكل الشروط والكودُ غائب', async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_d5e_ps_')); fs.copyFileSync(WORKER, path.join(d, '_worker.js'));
  assert.ok(fs.readFileSync(WORKER, 'utf8').includes('async function enfDemoApi('), 'المرشّحُ يحمل الأداة');
  execFileSync(PYTHON, [path.join(ROOT, 'tools', 'prod_strip.py'), d], { stdio: 'pipe' });
  const txt = fs.readFileSync(path.join(d + '.prod', '_worker.js'), 'utf8');
  for (const s of ['enfDemoApi', 'demoProvide', 'DEMO_PROVIDERS', 'tst_demo_manifest', 'demoSeed']) assert.ok(!txt.includes(s), 'غائبٌ من الإنتاج: ' + s);
  const p = path.join(d + '.prod', '_worker.mjs'); fs.copyFileSync(path.join(d + '.prod', '_worker.js'), p);
  const env = makeTestEnv(ENF); env.__worker = (await import(pathToFileURL(p).href + '?d5e=' + Math.random())).default;
  const C = client(env); const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const r = await C.api('/api/demo-data', { method: 'POST', cookie: su.ck, body: { act: 'seed' } }); assert.equal(r.status, 404); assert.equal(r.j.err, 'not-found');
  fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(d + '.prod', { recursive: true, force: true }); fs.rmSync(d + '.prod.MANIFEST.sha256', { force: true });
});
