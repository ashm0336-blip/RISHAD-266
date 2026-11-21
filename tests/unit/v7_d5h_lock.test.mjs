/* V7 · د5-ح (القفل) — لا وضعَ قديماً: الخادمُ يقرّر بمحرّك الإنفاذ وحده في كل بيئة، بلا متغيّر بيئة (العاملُ الحقيقي · بياناتٌ اصطناعية TEST_ONLY):
   ① القاعدةُ الجديدة تولد مقفلة (أداةُ المدير الأول تكتب authz_mode='enforce') — الوضعُ enforce بلا KIVO_AUTHZ_MODE
   ② قاعدةٌ لم تُختم enforce (سطرٌ غائب أو 'legacy') ⇒ «unmigrated» بحالةٍ معلنة: مديرُ المنصة يدخل ويعمل ويرى الحالة؛ غيرُه لا جلسةَ له
      (رسالةٌ صريحة) وجلستُه القائمة 503 authz_unmigrated، وغلافُه شاشةُ الدخول بالإشعار بلا بيانات — لا سماحَ صامتاً ولا قرارَ قديماً
   ③ «activate»: مديرُ المنصة وحده · يختم enforce · يُسجَّل · وبعده يعمل الجميع بالمحرّك
   ④ «tpls-retire»: تقاعدُ القوالب المخزّنة بعد ترحيلها إلى الأدوار (roles-pending قبلها) · لقطةٌ ورجوع
   ⑤ تقريرُ السجلّ القديم لمدير النظام حُذف (404) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';
import { makeSql } from '../../tools/provision_first_admin.mjs';

const D = 'tst_d1', KT = 'bsdept:' + D + ':bassam_perm_tpls_v1', KN = 'bsdept:' + D + ':bassam_perm_tpls_named_v1', KR = 'bsdept:' + D + ':bassam_roles_v1', KP = 'bassam_perms_v1';
const TPLS = [{ id: 'TEST_ONLY_t1', name: 'TEST_ONLY قالب', perms: { staff: ['view'] }, sup: true }];
function seedSql() {
  const T = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach((p) => { if (p.type !== 'literal') o[p.type] = +p.value; }); return o; })();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_lock_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', T.year + '-' + T.month + '-' + T.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const kvGet = (DB, k) => { const r = DB.q('SELECT v FROM kv WHERE k = ?1 ORDER BY seq', k); return r.length ? r.map((x) => x.v).join('') : null; };
const kvSet = (DB, k, v) => { DB.q('DELETE FROM kv WHERE k = ?1', k); DB.q('INSERT INTO kv (k, seq, v) VALUES (?1, 0, ?2)', k, v); DB.q('INSERT INTO revs (k, rev) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET rev = rev + 1', k, 1); };
const plan = async (W, parts, ck) => (await W.C.api('/api/authz-migrate?act=plan&parts=' + parts, { cookie: ck || W.su })).j.plan;
const apply = (W, p, ck) => W.C.api('/api/authz-migrate', { method: 'POST', cookie: ck || W.su, body: { act: 'apply', seed: p.seed, hash: p.hash, generated: p.generated, parts: p.parts } });
const modeRow = (DB) => (DB.q("SELECT v FROM meta WHERE k = 'authz_mode'")[0] || {}).v;
/* عالمٌ بلا متغيّر البيئة (كـProduction) · d1 = قيمةُ سطر الوضع (null = غائب) */
async function world(d1) {
  const env = makeTestEnv(), C = client(env);
  const su0 = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su0.ok, 'admin');
  await applySql(env.DB, seedSql()); await installCurrentSchemaFixture(env);
  const dm0 = await C.login('0000000101', '70101'); assert.ok(dm0.ok, 'مديرُ الإدارة يدخل والقاعدةُ مختومة: ' + JSON.stringify(dm0.j));
  if (d1 === null) env.DB.exec("DELETE FROM meta WHERE k = 'authz_mode'");
  else env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', '" + d1 + "') ON CONFLICT(k) DO UPDATE SET v = excluded.v");
  return { env, C, su: su0.ck, dm: dm0.ck };
}

test('① القاعدةُ الجديدة تولد مقفلة: أداةُ المدير الأول تكتب authz_mode=enforce · والوضعُ enforce بلا متغيّر البيئة', async () => {
  assert.match(makeSql({ username: '0501234567', name: 'TEST_ONLY', password: '583927' }), /INSERT INTO meta \(k, v\) VALUES \('authz_mode', 'enforce'\) ON CONFLICT\(k\) DO NOTHING;/);
  const env = makeTestEnv(), C = client(env);
  assert.equal(env.KIVO_AUTHZ_MODE, undefined, 'لا متغيّرَ بيئة');
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  assert.equal(modeRow(env.DB), 'enforce');
  const a = await C.api('/api/authz', { cookie: su.ck }); assert.equal(a.status, 200); assert.equal(a.j.mode, 'enforce'); assert.equal(a.j.env, false);
  const b = await C.boot(su.ck); assert.equal(b.boot.authz && b.boot.authz.mode, 'enforce', 'الواجهةُ تُحقن بوصف المحرّك');
  const st = await C.api('/api/authz-migrate?act=status', { cookie: su.ck }); assert.equal(st.status, 200, 'مسارُ الترحيل في كل بيئة'); assert.equal(st.j.mode, 'enforce');
  assert.deepEqual(st.j.registry, { ok: true, validation: true, readBinding: true }, 'سلامةُ السجلّ في حالة الترحيل');
});

for (const d1 of [null, 'legacy']) test('② قاعدةٌ لم تُختم (' + (d1 === null ? 'سطرٌ غائب' : "'legacy'") + ') ⇒ unmigrated: مديرُ المنصة وحده يعمل · غيرُه مرفوضٌ برسالةٍ صريحة · لا قرارَ قديماً', async () => {
  const W = await world(d1), C = W.C;
  /* مديرُ المنصة: يدخل ويقرأ ويرى الحالة */
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'مديرُ المنصة يدخل');
  const st = await C.api('/api/authz-migrate?act=status', { cookie: su.ck }); assert.equal(st.status, 200); assert.equal(st.j.mode, 'unmigrated'); assert.equal(st.j.d1, d1);
  const g = await C.api('/api/get?keys=bassam_depts_v1', { cookie: su.ck }); assert.equal(g.status, 200, 'مديرُ المنصة يقرأ'); assert.ok(g.j.keys.bassam_depts_v1);
  const sb = await C.boot(su.ck); assert.ok(sb.boot.uid, 'غلافُه بجلسته'); assert.equal(sb.boot.authz && sb.boot.authz.mode, 'enforce', 'بوصف المحرّك نفسِه');
  /* غيرُه: جلستُه القائمة 503 بلا تنفيذ — والغلافُ شاشةُ الدخول بالإشعار بلا بيانات */
  const r = await C.api('/api/get?keys=bassam_depts_v1', { cookie: W.dm }); assert.equal(r.status, 503); assert.equal(r.j.err, 'authz_unmigrated'); assert.match(r.j.msg, /مدير المنصة الترحيل/);
  const w = await C.api('/api/me', { cookie: W.dm }); assert.equal(w.status, 503, 'ولا مسارَ جلسةٍ آخر');
  const b = await C.boot(W.dm); assert.equal(b.boot.auth, 'need'); assert.equal(b.boot.authz, 'unmigrated'); assert.match(b.boot.notice, /الترحيل/); assert.deepEqual(b.boot.keys, {}, 'لا بيانات');
  const pub = await C.boot(''); assert.equal(pub.boot.authz, 'unmigrated', 'والزائرُ يرى الإشعار');
  /* ولا جلسةَ جديدة لغيره — الرسالةُ نفسُها، ويُسجَّل في سجل الأمن */
  const dm2 = await C.login('0000000101', '70101'); assert.equal(dm2.ok, false); assert.match(String(dm2.j.err), /قيد النقل/); assert.equal(dm2.ck, '', 'بلا كوكي');
  assert.ok(W.env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act = 'authz_unmigrated'")[0].n >= 1, 'الرفضُ مسجَّل');
  assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act = 'login_fail' AND detail = 'authz-unmigrated'")[0].n, 1);
  /* ③ activate: لمدير المنصة وحده — ثم يعمل الجميع */
  const no = await C.api('/api/authz-migrate', { method: 'POST', cookie: W.dm, body: { act: 'activate' } }); assert.equal(no.status, 503, 'غيرُه لا يصل أصلاً');
  const pp = await plan(W, 'perm', su.ck);
  if (pp.writes.length) {   /* ترحيلُ الصلاحيات أولاً — التفعيلُ قبله مرفوض */
    const early = await C.api('/api/authz-migrate', { method: 'POST', cookie: su.ck, body: { act: 'activate' } }); assert.equal(early.status, 409); assert.equal(early.j.err, 'perm-pending');
    assert.equal((await apply(W, pp, su.ck)).status, 200);
  }
  const ac = await C.api('/api/authz-migrate', { method: 'POST', cookie: su.ck, body: { act: 'activate' } });
  assert.equal(ac.status, 200, JSON.stringify(ac.j)); assert.equal(ac.j.mode, 'enforce'); assert.equal(ac.j.was, d1);
  assert.equal(modeRow(W.env.DB), 'enforce');
  assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM authz WHERE why = 'activate' AND res = 'activate'")[0].n, 1, 'التفعيلُ في سجل القرارات');
  const again = await C.api('/api/authz-migrate', { method: 'POST', cookie: su.ck, body: { act: 'activate' } }); assert.equal(again.j.already, 1);
  const dm3 = await C.login('0000000101', '70101'); assert.ok(dm3.ok, 'بعد التفعيل يدخل');
  const r2 = await C.api('/api/get?keys=bassam_depts_v1', { cookie: dm3.ck }); assert.equal(r2.status, 200);
  const b2 = await C.boot(dm3.ck); assert.equal(b2.boot.authz && b2.boot.authz.mode, 'enforce', 'وغلافُه بوصف المحرّك');
});

test('④ tpls-retire: القوالبُ المخزّنة تُتقاعد بعد ترحيلها إلى الأدوار (roles-pending قبلها) · لقطةٌ ورجوع · لا تُحقن في الغلاف', async () => {
  const W = await world('enforce'), C = W.C, DB = W.env.DB;
  kvSet(DB, KT, JSON.stringify(TPLS)); kvSet(DB, KN, '{}');
  const P = JSON.parse(kvGet(DB, KP) || '{}'); P.tplOf = Object.assign({}, P.tplOf || {}, { [D]: { TEST_ONLY_e1: 'TEST_ONLY_t1' } }); kvSet(DB, KP, JSON.stringify(P));
  DB.q('DELETE FROM kv WHERE k = ?1', KR);
  const sb = await C.boot(W.su); assert.ok(!(KT in sb.boot.keys) && !(KN in sb.boot.keys), 'موردٌ حُذف: لا يُحقن ولو لمدير المنصة');
  const p0 = await plan(W, 'tpls-retire'); assert.equal(p0.rolesPending, 1, 'الأدوارُ لم تُرحَّل بعد'); assert.deepEqual(p0.writes, []);
  const r0 = await apply(W, p0); assert.equal(r0.status, 409); assert.equal(r0.j.err, 'roles-pending'); assert.ok(kvGet(DB, KT), 'لا حذفَ قبل الترحيل');
  const mixed = await C.api('/api/authz-migrate?act=plan&parts=tpls-retire,perm', { cookie: W.su }); assert.equal(mixed.j.err, 'parts-mixed');
  const pr = await plan(W, 'perm44-roles'); assert.equal((await apply(W, pr)).j.applied, 1, 'الترحيلُ يقرأ القوالبَ خاماً من D1 بعد حذف موردها');
  assert.equal(JSON.parse(kvGet(DB, KR)).people.TEST_ONLY_e1.role, 'TEST_ONLY_t1');
  const p1 = await plan(W, 'tpls-retire'); assert.equal(p1.rolesPending, 0); assert.deepEqual(p1.writes.map((w) => w.k).sort(), [KN, KT].sort());
  const a1 = await apply(W, p1); assert.equal(a1.status, 200, JSON.stringify(a1.j)); assert.equal(a1.j.applied, 2);
  assert.equal(kvGet(DB, KT), null); assert.equal(kvGet(DB, KN), null);
  assert.equal(DB.q("SELECT v FROM meta WHERE k = 'authz_perm_mig'").length, 0, 'لا علامةَ ترحيل صلاحيات');
  const p2 = await plan(W, 'tpls-retire'); assert.deepEqual(p2.writes, [], 'الثانيةُ بلا كتابة');
  const rb = await C.api('/api/authz-migrate', { method: 'POST', cookie: W.su, body: { act: 'rollback', snap: a1.j.snap } });
  assert.equal(rb.status, 200, JSON.stringify(rb.j)); assert.equal(JSON.parse(kvGet(DB, KT))[0].id, 'TEST_ONLY_t1', 'الرجوعُ يعيدها حرفاً'); assert.equal(kvGet(DB, KN), '{}');
});

test('⑤ تقريرُ السجلّ القديم (permv2) حُذف — 404 كأيّ مسارٍ مجهول، ولا عقدَ له', async () => {
  const env = makeTestEnv(), C = client(env); const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN);
  const r = await C.api('/api/permv2', { cookie: su.ck }); assert.equal(r.status, 404);
  const contracts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'api', 'contracts.json'), 'utf8'));
  assert.ok(!JSON.stringify(contracts).includes('/api/permv2'));
});
