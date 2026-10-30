/* KIVO_261 · AUD-052 (كشفه k261sys — سيناريو مدير النظام من الواجهة): «فكّ القفل» في «محاولات الدخول الفاشلة» لم يكن يظهر أبداً —
   القفلُ على المصدر والزوج (ip: · p:<un>|<ip>) منذ ما قبل 242، و/api/overview يقرأ قفلَ الاسم من u: (عدّادُ إنذارٍ لا يُقفل)، والزرُّ يفكّ u: وحده.
   الآن: الصفُّ يحمل أقفالَ الاسم الفعلية (until · gks) والفكُّ يحذفها كلَّها — فيدخل صاحبُ الكلمة الصحيحة من المصدر نفسِه فوراً، ويُسجَّل guard_unlock. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

test('«فكّ القفل»: الصفُّ يُظهر قفلَ الزوج والمصدر الفعليَّين · الفكُّ يحذفهما · الدخولُ ينجح فوراً · السجلّ', async () => {
  const env = makeTestEnv({}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  /* خمسُ كلماتٍ خاطئة من مصدرٍ واحد على حسابٍ حقيقي (حساب الاختبار الصريح) */
  const IP = '198.51.100.23', H = { 'CF-Connecting-IP': IP };
  const r0 = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN, { headers: H }); assert.ok(r0.ok, 'دخولٌ سليم من المصدر قبل الأخطاء');
  for (let i = 0; i < 5; i++) await C.login(TEST_SUPER_USERNAME, 'wrong-' + i, { headers: H });
  const lk = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN, { headers: H });
  assert.equal(lk.ok, false, 'المصدرُ مقفلٌ حتى للكلمة الصحيحة'); assert.ok(lk.j.wait >= 1, 'wait في الردّ');
  const ov = (await C.api('/api/overview', { cookie: su.ck })).j;
  const row = (ov.fails || []).find(f => String(f.un).toLowerCase() === TEST_SUPER_USERNAME);
  assert.ok(row, 'صفُّ «مدير الاختبار» في محاولات اليوم الفاشلة');
  assert.ok(row.until > ov.now, '★ الصفُّ مقفلٌ فعلاً (until من قفل الزوج/المصدر لا من u:) — ' + JSON.stringify(row));
  assert.ok(row.gks.includes('p:' + TEST_SUPER_USERNAME + '|' + IP) && row.gks.includes('ip:' + IP), '★ gks تحمل الزوجَ والمصدر: ' + JSON.stringify(row.gks));
  const un = await C.api('/api/guard/unlock', { method: 'POST', cookie: su.ck, body: { gk: 'u:' + TEST_SUPER_USERNAME, gks: row.gks } });
  assert.equal(un.status, 200); assert.equal(un.j.ok, 1);
  const ok2 = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN, { headers: H });
  assert.ok(ok2.ok, '★ بعد الفكّ: الكلمةُ الصحيحة من المصدر نفسِه تدخل فوراً — ' + JSON.stringify(ok2.j));
  const ov2 = (await C.api('/api/overview', { cookie: su.ck })).j; const row2 = (ov2.fails || []).find(f => String(f.un).toLowerCase() === TEST_SUPER_USERNAME);
  assert.ok(!row2 || !(row2.until > ov2.now), 'الصفُّ لم يعد مقفلاً');
  const sec = env.DB.q("SELECT act, target FROM sec WHERE act = 'guard_unlock' ORDER BY ts DESC LIMIT 1")[0];
  assert.ok(sec && sec.target.includes('p:' + TEST_SUPER_USERNAME + '|' + IP) && sec.target.includes('ip:' + IP), 'guard_unlock في سجلّ الأمن بالمفاتيح: ' + JSON.stringify(sec));
  /* مدخلاتٌ عدائية: قائمةٌ بلا مفتاحٍ صالح لا تُحذف شيئاً (لا «فكَّ الكلّ» بالخطأ) */
  for (let i = 0; i < 5; i++) await C.login(TEST_SUPER_USERNAME, 'wrong2-' + i, { headers: H });
  const nG = env.DB.q("SELECT COUNT(*) AS n FROM guard WHERE until > 0")[0].n; assert.ok(nG >= 2, 'أقفالٌ قائمة قبل المحاولة العدائية: ' + nG);
  const bad = await C.api('/api/guard/unlock', { method: 'POST', cookie: su.ck, body: { gks: ['sess:x', 'kv:bassam_users_v1', 'rl:1'] } });
  assert.equal(bad.j.ok, 1); assert.equal(bad.j.n, 0, 'لا شيءَ حُذف');
  assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM guard WHERE until > 0")[0].n, nG, 'الأقفالُ كما هي');
});
