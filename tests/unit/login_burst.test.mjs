/* KIVO_259 — قفلُ الدخول تحت التزامن (كشفه التقييمُ المستقل · SOT-168): كان الحارسُ يقرأ القفلَ ثم يتحقّق من كلمة المرور (PBKDF2 بطيء) ثم يقرأ
   العدّادَ ويكتبه — فيعبر دفعٌ متزامنٌ من مصدرٍ واحدٍ القفلَ كلُّه (كلُّ الطلبات تجد القفلَ مفتوحاً قبل أن يُكتب أيُّ إخفاق) وتضيع زياداتٌ.
   الآن تُحجز المحاولةُ ذرّياً قبل التحقق: من 20 محاولةً متزامنةً خاطئة من مصدرٍ واحد لا يبلغ التحقّقَ إلا LOCK_N (5) والباقي «محاولات كثيرة»
   — والسلوكُ المتتابع كما هو (rate_limits.test.mjs). العاملُ داخل Node: الطلباتُ المتزامنة تتشابك عند كل جولة D1 كما في isolate حقيقي. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLegacyTestEnv as makeEnv, client, since } from './harness.mjs';
const S260 = since(160);   /* KIVO_260: قفلُ الحجز المؤقّت · صيغةُ الثواني · wait */

const BAD = /غير صحيحة/, MANY = /محاولات كثيرة/;

test('20 محاولةً متزامنةً خاطئة من مصدرٍ واحد: لا يبلغ التحقّقَ إلا 5 والباقي مقفول · ثم المصدرُ مقفولٌ حتى بالكلمة الصحيحة', async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const H = { 'CF-Connecting-IP': '6.6.6.6' };
  const rs = await Promise.all(Array.from({ length: 20 }, (_, i) => C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'nope' + i }, headers: H })));
  const bad = rs.filter(r => BAD.test(r.j.err || '')).length, many = rs.filter(r => MANY.test(r.j.err || '')).length;
  assert.ok(rs.every(r => r.j.ok === 0), 'لا دخولَ بكلمةٍ خاطئة');
  assert.equal(bad, 5, 'بلغ التحقّقَ ' + bad + ' (المتوقَّع LOCK_N = 5) · مقفول ' + many);
  assert.equal(many, 15);
  const fails = env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act = 'login_fail' AND detail = 'bad-pw'")[0].n;
  assert.equal(fails, 5, 'سجلُّ الأمن: 5 إخفاقاتِ كلمة مرور فقط');
  const ok = await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' }, headers: H });
  assert.equal(ok.j.ok, 0, 'المصدرُ مقفولٌ حتى بالكلمة الصحيحة'); assert.match(ok.j.err || '', MANY);
  const other = await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' }, headers: { 'CF-Connecting-IP': '5.5.5.5' } });
  assert.equal(other.j.ok, 1, 'مصدرٌ سليم يدخل');
});

test('بعد انقضاء القفل: محاولةٌ واحدة تمضي — خاطئةً تُعيد القفلَ بمهلةٍ مضاعفة · صحيحةً تفتحه وتصفّر العدّاد', async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const H = { 'CF-Connecting-IP': '4.4.4.4' };
  for (let i = 0; i < 5; i++) assert.match((await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'x' + i }, headers: H })).j.err || '', BAD);
  env.DB.exec("UPDATE guard SET until = 1 WHERE gk LIKE 'ip:4.4.4.4' OR gk LIKE 'p:%|4.4.4.4'");   /* كأنّ المهلةَ انقضت */
  const t0 = Date.now(); const r6 = await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'x5' }, headers: H });
  assert.match(r6.j.err || '', BAD, 'السادسةُ بعد الانقضاء تبلغ التحقّق');
  const g = env.DB.q("SELECT n, until FROM guard WHERE gk = 'ip:4.4.4.4'")[0];
  assert.equal(g.n, 6); assert.ok(g.until - t0 >= 9000 && g.until - t0 <= 11500, 'المهلةُ تضاعفت (≈10 ث): ' + (g.until - t0));
  env.DB.exec("UPDATE guard SET until = 1 WHERE gk LIKE 'ip:4.4.4.4' OR gk LIKE 'p:%|4.4.4.4'");
  const r7 = await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' }, headers: H });
  assert.equal(r7.j.ok, 1, 'الصحيحةُ بعد الانقضاء تدخل');
  assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM guard WHERE gk = 'ip:4.4.4.4' OR gk LIKE 'p:%|4.4.4.4'")[0].n, 0, 'النجاحُ يصفّر العدّادين');
});

/* ══ KIVO_260 (كشفته البطاقةُ المستقلة النهائية — scorecard_final §٤ بنود 10 و12) ══
   (ج) قفلُ الحجز مؤقّتٌ قصير (≤ 1.5 ث) لا قفلٌ كامل: دخولاتٌ صحيحةٌ متزامنة من عنوانٍ واحد (مكتبٌ خلف موجِّه) فوق lockN تُردّ مؤقتاً بـwait ≤ 2
       ثم تدخل كلُّها عند الإعادة — ولا قفلَ كاملاً بلا إخفاقٍ مؤكَّد · (د) القفلُ الكامل بعد الإخفاق الخامس 5 ث «انتظر 5 ثوانٍ» وwait = 5 —
       وصيغةُ الثواني على قاعدة العدد والمعدود (١ · ٢ · ٣–١٠ · ١١+) */
test('(ج) 12 دخولاً صحيحاً متزامناً من عنوانٍ واحد: لا يبلغ التحقّقَ إلا lockN · المردودُ مؤقّتٌ (wait ≤ 2) · ثم يدخل الكلُّ — بلا قفلٍ كامل', S260, async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const H = { 'CF-Connecting-IP': '7.7.7.7' }, MANY = /محاولات كثيرة/;
  const rs = await Promise.all(Array.from({ length: 12 }, () => C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' }, headers: H })));
  const okN = rs.filter(r => r.j.ok === 1).length, many = rs.filter(r => MANY.test(r.j.err || ''));
  assert.ok(okN >= 1 && okN <= 5, 'بلغ التحقّقَ ونجح ' + okN + ' (≤ lockN = 5)');
  assert.equal(okN + many.length, 12, 'الباقي «محاولات كثيرة» فقط');
  assert.ok(many.every(r => r.j.wait >= 1 && r.j.wait <= 2), 'المردودُ مؤقّت: wait ≤ 2 ث (لا 5 ث فما فوق) — ' + JSON.stringify(many.map(r => r.j.wait)));
  const g = env.DB.q("SELECT gk, n, until FROM guard WHERE gk LIKE '%7.7.7.7%'");
  assert.ok(g.every(x => x.until - Date.now() <= 1600), 'لا قفلَ كاملاً بلا إخفاق — الباقي قفلُ حجزٍ مؤقّت أو لا شيء: ' + JSON.stringify(g));
  await new Promise(r => setTimeout(r, 1600));   /* ما يفعله المستخدم: ينتظر العدَّ القصير ثم يعيد */
  const again = await Promise.all(many.map(() => C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' }, headers: H })));
  const okAgain = again.filter(r => r.j.ok === 1).length;
  let left = again.filter(r => r.j.ok !== 1).length;
  for (let t = 0; t < 5 && left; t++) { await new Promise(r => setTimeout(r, 1600)); left = 0; for (let i = 0; i < again.length; i++) if (again[i].j.ok !== 1) { again[i] = await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' }, headers: H }); if (again[i].j.ok !== 1) left++; } }
  assert.equal(left, 0, 'كلُّ المردودين دخلوا بالإعادة (أوّلَ مرة: ' + okAgain + ' من ' + many.length + ')');
});
test('(د) بعد الإخفاق الخامس: قفلٌ كامل 5 ث «انتظر 5 ثوانٍ» وwait = 5 · صيغُ الثواني على قاعدة العدد والمعدود', S260, async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const H = { 'CF-Connecting-IP': '8.8.4.4' };
  for (let i = 0; i < 5; i++) assert.match((await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'bad' + i }, headers: H })).j.err || '', BAD);
  const r6 = await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' }, headers: H });
  assert.equal(r6.j.ok, 0); assert.ok(r6.j.wait >= 4 && r6.j.wait <= 5, 'wait = ' + r6.j.wait);
  assert.match(r6.j.err || '', /^محاولات كثيرة — انتظر (?:5|4) ثوانٍ$/, 'النصّ: ' + r6.j.err);
  const fx = (sec) => { env.DB.exec("UPDATE guard SET until = " + (Date.now() + sec * 1000 - 1) + " WHERE gk = 'ip:8.8.4.4' OR gk LIKE 'p:%|8.8.4.4'"); return C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' }, headers: H }); };
  assert.match((await fx(1)).j.err || '', /انتظر ثانية واحدة$/);
  assert.match((await fx(2)).j.err || '', /انتظر ثانيتين$/);
  assert.match((await fx(10)).j.err || '', /انتظر 10 ثوانٍ$/);
  assert.match((await fx(11)).j.err || '', /انتظر 11 ثانية$/);
  assert.match((await fx(103)).j.err || '', /انتظر 103 ثوانٍ$/);
  assert.match((await fx(300)).j.err || '', /انتظر 300 ثانية$/);
});
