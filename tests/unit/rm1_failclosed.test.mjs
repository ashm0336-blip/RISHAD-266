/* RM-1 · ADR-003 · SOT-172 / AUD-001 — fail-closed عند تعذّر قراءة وضع الإنفاذ من D1 (مع إبقاء مفتاح الإيقاف المقصود) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client } from './harness.mjs';
/* KIVO_255 (إفصاح — عُدّة · AUD-037): وضعُ الإنفاذ يُقرأ من لقطة المقدّمة (دفعةٌ واحدة: FROM meta WHERE k IN (?1…)) أو — عند تعذّرها — من استعلامه المباشر؛
   حقنُ العطل يصيب الصورتين معاً كي يبقى المعنى: «تعذّرُ قراءة الوضع» لا «تعذّرُ عبارةٍ بعينها». الحكمُ fail-closed نفسُه بلا تغيير. */
const META_Q = (sql) => /FROM meta WHERE k IN \('authz_mode', 'authz_perm_mig'/.test(sql) || /\/\* pre:authz \*\//.test(sql);
const setMode = (env, v) => env.DB.exec(v == null ? "DELETE FROM meta WHERE k='authz_mode'" : `INSERT INTO meta (k, v) VALUES ('authz_mode', '${v}') ON CONFLICT(k) DO UPDATE SET v='${v}'`);

test('fail-closed: عطلُ قراءة meta في بيئة الإنفاذ ⇒ 503 بلا تنفيذ، ثم يعود كلُّ شيء عند زوال العطل', async () => {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce' }); const C = client(env);
  const su = await C.login('0501234567', '583927'); assert.ok(su.ok, 'دخول مسؤول اختبار مزروع صراحةً');
  env.DB.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)"); setMode(env, 'enforce');
  const az0 = await C.api('/api/authz', { cookie: su.ck }); assert.equal(az0.j.mode, 'enforce', 'الوضع enforce قبل العطل');
  const s0 = await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dA', name: 'إدارة', gid: '' }]) }); assert.equal(s0.status, 200); assert.equal(s0.j.ok, 1);
  const rev0 = s0.j.revs.bassam_depts_v1;
  /* ── حقنُ العطل في استعلام الوضع وحده ── */
  env.DB.failIf = META_Q;
  const s1 = await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dA', name: 'تغييرٌ يجب ألا يمرّ', gid: '' }]) });
  assert.equal(s1.status, 503, 'الكتابة تُرفض 503'); assert.equal(s1.j.err, 'authz_unavailable'); assert.ok(s1.j.msg && s1.j.msg.includes('وضع الحماية'));
  const g1 = await C.api('/api/get?keys=bassam_depts_v1', { cookie: su.ck }); assert.equal(g1.status, 503, 'القراءة تُرفض 503 كذلك (لا تسريبَ خارج النطاق)');
  const ch = await C.api('/api/changes?since=0', { cookie: su.ck }); assert.equal(ch.status, 503, '/api/changes 503');
  const az1 = await C.api('/api/authz', { cookie: su.ck }); assert.equal(az1.status, 503, '/api/authz 503');
  const br = await C.api('/api/brand'); assert.equal(br.status, 200, '/api/brand يبقى (هوية عامة بلا بيانات)');
  /* KIVO_261 (إفصاح — تعديلُ اختبارٍ مقصود · SOT-145): النبضُ في وضع الحماية يُعلن الجاهزيةَ (ready:0 · mode:'protect') — كان المفتاحان الأربعة وحدها */
  const pg = await C.api('/api/ping'); assert.equal(pg.status, 200); assert.deepEqual(Object.keys(pg.j).sort(), ['cf', 'commit', 'fresh', 'mode', 'ok', 'ready', 'ver'], '/api/ping نبضٌ مختصر بلا أعداد');
  assert.equal(pg.j.ready, 0, 'الخادمُ حيٌّ غيرُ جاهز'); assert.equal(pg.j.mode, 'protect', 'وضعُ الحماية معلَن للمراقِب');
  const bt = await C.boot(su.ck); assert.equal(bt.status, 200); assert.equal(bt.boot.auth, 'need', 'صفحةُ الدخول لا البيانات'); assert.equal(bt.boot.authz, 'unavailable'); assert.deepEqual(bt.boot.keys, {}, 'لا مفاتيحَ تُحقن');
  assert.ok(bt.boot.notice && bt.boot.notice.includes('وضع الحماية'), 'إشعارٌ لشاشة الدخول');
  const lo = await C.api('/api/logout', { cookie: su.ck }); assert.ok(lo.status < 400, '/api/logout يبقى متاحاً (' + lo.status + ')');
  const sec = env.DB.q("SELECT act, detail FROM sec WHERE act = 'authz_unavailable'"); assert.ok(sec.length >= 4, 'تسجيلٌ في sec لكل طلبٍ مرفوض: ' + sec.length);
  assert.ok(sec.some(r => r.detail === 'POST /api/save') && sec.some(r => r.detail === 'GET /'), 'التفاصيل تحمل المسار');
  /* ── زوالُ العطل: كلُّ شيء يعود ── */
  env.DB.failIf = null;
  const su2 = await C.login('0501234567', '583927'); assert.ok(su2.ok);
  const g2 = await C.api('/api/get?keys=bassam_depts_v1', { cookie: su2.ck }); assert.equal(g2.status, 200);
  assert.equal(g2.j.keys.bassam_depts_v1.rev, rev0, 'القيمة لم تتغيّر أثناء العطل (الطلبُ المرفوض لم يُنفَّذ)');
  assert.equal(JSON.parse(g2.j.keys.bassam_depts_v1.v)[0].name, 'إدارة');
  const az2 = await C.api('/api/authz', { cookie: su2.ck }); assert.equal(az2.j.mode, 'enforce', 'الوضع enforce بعد زوال العطل');
  const pg2 = await C.api('/api/ping', { cookie: su2.ck }); assert.equal(pg2.j.ready, 1, 'بعد زوال العطل: جاهز (ready:1) والمخطّطُ مطابق'); assert.equal(pg2.j.schemaOk, 1); assert.ok(!('mode' in pg2.j));
});

test('مفتاحُ الإيقاف المقصود يبقى: سطرُ legacy يُقرأ بنجاح ⇒ النظام القديم لا وضعُ الحماية', async () => {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce' }); const C = client(env);
  const su = await C.login('0501234567', '583927'); env.DB.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)"); setMode(env, 'legacy');
  const az = await C.api('/api/authz', { cookie: su.ck }); assert.equal(az.status, 200); assert.equal(az.j.mode, 'legacy'); assert.equal(az.j.unavailable, undefined);
  const s = await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dB', name: 'ب', gid: '' }]) }); assert.equal(s.status, 200, 'الكتابة تعمل في النظام القديم');
  setMode(env, null);
  const az2 = await C.api('/api/authz', { cookie: su.ck }); assert.equal(az2.j.mode, 'legacy', 'غيابُ السطر = legacy (ليس عطلاً)');
});

test('Production (بلا ENV): استعلامُ الوضع لا يُنفَّذ أصلاً، ولا أثرَ لحقن العطل', async () => {
  const env = makeTestEnv({}); const C = client(env);
  env.DB.failIf = META_Q;
  const su = await C.login('0501234567', '583927'); assert.ok(su.ok);
  const s = await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dC', name: 'ج', gid: '' }]) }); assert.equal(s.status, 200);
  const g = await C.api('/api/get?keys=bassam_depts_v1', { cookie: su.ck }); assert.equal(g.status, 200);
  assert.ok(!env.DB.log.some(META_Q), 'استعلامُ authz_mode لم يُرسل إلى D1 قط');
  const az = await C.api('/api/authz', { cookie: su.ck }); assert.equal(az.status, 404, 'واجهةُ الإنفاذ غيرُ موجودة بلا ENV');
});
