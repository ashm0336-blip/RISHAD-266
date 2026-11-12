/* v7-C · Issue 2 — حارسُ الدخول: أربعُ ثغراتٍ يعيد كلُّ اختبارٍ إنتاجَ واحدةٍ منها على العامل الحقيقي، ثم «ب» (الإبطاء المطفأ افتراضياً).
   قرارُ المالك: أ (إنذارُ التخمين الموزَّع) + ج (النجاحُ لا يصفّر عدّادَ المصدر · العدّاداتُ تتناقص) + فرقُ التوقيت + ب (إبطاءٌ بلا قفل · مطفأ).
   (أ)  التخمينُ الموزَّع على حسابٍ واحد من عناوين مختلفة لم يكن يُنذِر إلا إن اجتمعت 5 إخفاقاتٍ في دفعة استطلاعٍ واحدة، ومتغيّرُ IP فارغ.
   (ج١) دخولٌ ناجح بأيِّ حسابٍ صالح كان يحذف عدّادَ المصدر ip: — فيرشّ المهاجمُ بلا حدّ ما دام يدخل بحسابه كلَّ أربع محاولات.
   (ج٢) العدّادُ لا يتناقص: إخفاقاتٌ قديمة تتراكم على عنوان مكتبٍ مشترك إلى الأبد.
   (ت)  الاسمُ المجهول كان يتخطّى PBKDF2 — فرقُ زمنٍ يكشف وجودَ الحساب.
   (ب)  إبطاءُ الحساب المستهدَف من عناوين متعددة: ثوانٍ معدودة لكل محاولة، بلا قفل، من سياسة الأمن، مطفأ افتراضياً. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLegacyTestEnv, makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { world, IDS } from './notifications_review_fx.mjs';

const BAD = /غير صحيحة/, MANY = /محاولات كثيرة/;
const ip = (x) => ({ 'CF-Connecting-IP': x });
const attempt = (C, u, p, from) => C.api('/api/login', { method: 'POST', body: { u, p }, headers: ip(from) });
/* ساعةٌ مثبَّتة تتقدّم 10 ms لكل نداء؛ jump يقفز بها */
function freezeClock() { const real = Date.now; let base = real(), k = 0; Date.now = () => base + (k++) * 10; return { release: () => { Date.now = real; }, jump: (ms) => { base += ms; } }; }

test('(أ) تخمينٌ موزَّع: 3 عناوين مختلفة تُخفق على حسابٍ واحد — إخفاقٌ في كل استطلاع — يُنذَر مديرُ النظام والعناوينُ والعددُ في النص', async () => {
  const W = await world();
  const fail = (un, from, ago) => W.DB.prepare('INSERT INTO sec(ts,uid,un,act,target,detail,ip) VALUES(?1,?2,?3,?4,?5,?6,?7)').bind(Date.now() - ago, '', un, 'login_fail', '', 'bad-pw', from).run();
  const poll = async () => { const r = await W.act('super', { op: 'security-poll' }); assert.equal(r.status, 200); };
  const msgs = () => W.DB.q("SELECT title, body FROM notification_messages WHERE type = 'sc_fail'");
  await fail('0555000111', '203.0.113.1', 3000); await poll();
  await fail('0555000111', '203.0.113.2', 2000); await poll();
  assert.equal(msgs().length, 0, 'عنوانان فقط: لا إنذار بعد');
  await fail('0555000111', '203.0.113.3', 1000); await poll();
  const m = msgs();
  assert.equal(m.length, 1, '★ ثلاثةُ عناوين على حسابٍ واحد ⇒ إنذارٌ واحد (كان: لا إنذار ما لم تجتمع 5 في دفعة): ' + JSON.stringify(m));
  const text = m[0].title + ' ' + m[0].body;
  for (const a of ['203.0.113.1', '203.0.113.2', '203.0.113.3']) assert.ok(text.includes(a), 'النصُّ يحمل العنوان ' + a + ': ' + text);
  assert.ok(text.includes('0555000111') && /3/.test(text), 'النصُّ يحمل الحسابَ والعدد: ' + text);
  await poll(); assert.equal(msgs().length, 1, 'استطلاعٌ بلا جديد لا يكرّر');
  assert.equal(W.DB.q("SELECT COUNT(*) n FROM guard WHERE gk NOT LIKE 'rl:%' AND until > ?", Date.now())[0].n, 0, 'الإنذارُ لا يحجب ولا يقفل شيئاً');
});

test('(أ) خمسُ إخفاقاتٍ من عنوانٍ واحد في دفعة: الإنذارُ القائم يحمل العنوانَ (كان متغيّرُ IP فارغاً)', async () => {
  const W = await world();
  for (let i = 0; i < 5; i++) await W.DB.prepare('INSERT INTO sec(ts,uid,un,act,target,detail,ip) VALUES(?1,?2,?3,?4,?5,?6,?7)').bind(Date.now() - 5000 + i, '', '0555000222', 'login_fail', '', 'bad-pw', '198.51.100.77').run();
  assert.equal((await W.act('super', { op: 'security-poll' })).status, 200);
  const m = W.DB.q("SELECT title, body FROM notification_messages WHERE type = 'sc_fail'");
  assert.equal(m.length, 1); assert.ok((m[0].title + ' ' + m[0].body).includes('198.51.100.77'), '★ العنوانُ في النص: ' + JSON.stringify(m[0]));
  void IDS;
});

test('(ج١) حيلةُ التصفير: دخولٌ ناجح بحسابٍ صالح لا يصفّر عدّادَ المصدر — الرشُّ على أسماءٍ مختلفة يُقفل عند الإخفاق الخامس', async () => {
  const env = makeLegacyTestEnv(); const C = client(env); const X = '192.0.2.50';
  for (let i = 0; i < 4; i++) assert.match((await attempt(C, 'victim' + i, '11111', X)).j.err || '', BAD);
  assert.equal((await attempt(C, 'admin', 'admin', X)).j.ok, 1, 'حسابُ المهاجم الصالح يدخل');
  assert.match((await attempt(C, 'victim4', '11111', X)).j.err || '', BAD, 'الإخفاقُ الخامس يبلغ التحقّق');
  const after = await attempt(C, 'victim5', '11111', X);
  assert.match(after.j.err || '', MANY, '★ المصدرُ مقفلٌ بعد خمسة إخفاقات رغم الدخول الناجح بينها (كان: العدّادُ صُفّر فلا قفل): ' + JSON.stringify(after.j));
  assert.ok(after.j.wait >= 1);
  assert.equal((await attempt(C, 'admin', 'admin', '192.0.2.51')).j.ok, 1, 'مصدرٌ سليم يدخل');
});

test('(ج١) النجاحُ يحذف عدّادَ الزوج ويردّ حجزَه على المصدر: دخولاتٌ صحيحة متتابعة من مكتبٍ واحد لا تتراكم ولا تُقفل', async () => {
  const env = makeLegacyTestEnv(); const C = client(env); const X = '192.0.2.60';
  for (let i = 0; i < 12; i++) assert.equal((await attempt(C, 'admin', 'admin', X)).j.ok, 1, 'الدخول ' + (i + 1));
  const g = env.DB.q("SELECT gk, n, until FROM guard WHERE gk LIKE '%192.0.2.60%'");
  assert.ok(g.every(x => x.n <= 0 || x.gk.indexOf('ip:') !== 0) && g.every(x => x.until <= Date.now()), 'لا عدَّ متراكماً ولا قفل: ' + JSON.stringify(g));
  assert.equal(g.filter(x => x.gk.indexOf('p:') === 0).length, 0, 'عدّادُ الزوج محذوف');
});

test('(ج٢) التناقص: إخفاقاتٌ قديمة تُغتفر بمرور الوقت (واحدٌ لكل lockMin) — مكتبٌ مشترك لا يُعاقَب إلى الأبد · والقريبةُ تُحتسب كما كانت', async () => {
  const clk = freezeClock(); try {
    const env = makeLegacyTestEnv(); const C = client(env); const X = '192.0.2.70';
    for (let i = 0; i < 4; i++) assert.match((await attempt(C, 'emp' + i, '11111', X)).j.err || '', BAD);
    clk.jump(2 * 3600000);   /* ساعتان بلا محاولة */
    for (let i = 4; i < 8; i++) { const r = await attempt(C, 'emp' + i, '11111', X); assert.match(r.j.err || '', BAD, '★ الإخفاق ' + (i + 1) + ' بعد ساعتين لا يُقفل (كان: الخامسُ يقفل المكتب): ' + JSON.stringify(r.j)); }
    assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM guard WHERE until > ?", Date.now())[0].n, 0, '★ لا قفلَ: الأربعةُ القديمة اغتُفرت');
    assert.equal((await attempt(C, 'admin', 'admin', X)).j.ok, 1, 'صاحبُ الكلمة الصحيحة يدخل من المكتب');
    /* القريبةُ لا تُغتفر: الخامسُ بعد دقيقةٍ يُقفل */
    clk.jump(60000);
    assert.match((await attempt(C, 'emp8', '11111', X)).j.err || '', BAD);
    assert.match((await attempt(C, 'emp9', '11111', X)).j.err || '', MANY, 'خمسةُ إخفاقاتٍ متقاربة تُقفل كما كانت');
    /* وبعد انقضاء القفل و lockMin واحدة: يُغتفر واحدٌ فقط — محاولةٌ واحدة ثم القفلُ من جديد (لا تصفيرَ كاملاً) */
    clk.jump(5 * 60000 + 6000);
    assert.match((await attempt(C, 'emp10', '11111', X)).j.err || '', BAD, 'بعد lockMin: محاولةٌ واحدة تمضي');
    assert.match((await attempt(C, 'emp11', '11111', X)).j.err || '', MANY, 'ثم القفلُ فوراً — التناقصُ تدريجيّ');
  } finally { clk.release(); }
});

test('(ت) فرقُ التوقيت: الاسمُ المجهول يدفع كلفةَ PBKDF2 نفسَها (العددُ والتكرارات) والردُّ مطابق', async () => {
  const env = makeTestEnv({}); const C = client(env);
  assert.ok((await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN)).ok);
  const real = crypto.subtle.deriveBits; let calls = [];
  crypto.subtle.deriveBits = function (alg) { calls.push(alg && alg.iterations); return real.apply(this, arguments); };
  try {
    const known = await attempt(C, TEST_SUPER_USERNAME, '000001', '192.0.2.80'); const kc = calls; calls = [];
    const unknown = await attempt(C, '0599999999', '000001', '192.0.2.81'); const uc = calls;
    assert.equal(kc.length, 1, 'كلمةٌ خاطئة على حسابٍ قائم: اشتقاقٌ واحد');
    assert.deepEqual(uc, kc, '★ الاسمُ المجهول: الاشتقاقُ نفسُه بالتكرارات نفسِها (كان: لا اشتقاق) — ' + JSON.stringify(uc));
    assert.equal(unknown.status, known.status); assert.deepEqual(unknown.j, known.j, 'الردّان متطابقان');
  } finally { crypto.subtle.deriveBits = real; }
});

test('(ت) حسابٌ بتجزئةٍ قديمة (p1) وكلمةٌ خاطئة: الكلفةُ نفسُها أيضاً — لا يُكشف نوعُ التجزئة بالزمن', async () => {
  const env = makeLegacyTestEnv(); const C = client(env);
  const real = crypto.subtle.deriveBits; let n = 0;
  crypto.subtle.deriveBits = function () { n++; return real.apply(this, arguments); };
  try { assert.match((await attempt(C, 'admin', 'wrong', '192.0.2.82')).j.err || '', BAD); assert.equal(n, 1, '★ اشتقاقٌ واحد (كان: صفر)'); }
  finally { crypto.subtle.deriveBits = real; }
});

/* ── (ب) الإبطاء ── المهلةُ تُلتقط من setTimeout (لا ساعةَ حائط): المهلةُ المضبوطة (thrSec × 1000) تُسجَّل وتُنفَّذ فوراً؛ مؤقّتاتُ العامل الأخرى كما هي */
function catchDelays(want) { const real = globalThis.setTimeout, seen = []; globalThis.setTimeout = (fn, ms, ...a) => { if (ms === want) { seen.push(ms); return real(fn, 0, ...a); } return real(fn, ms, ...a); }; return { seen, take: () => seen.splice(0), release: () => { globalThis.setTimeout = real; } }; }

test('(ب) مطفأٌ افتراضياً: السياسةُ thrOn=0 · عشرةُ عناوين تُخفق على حسابٍ واحد ولا مهلةَ لأحد', async () => {
  const env = makeLegacyTestEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const pol = (await C.api('/api/policy', { cookie: su.ck })).j.policy;
  assert.equal(pol.thrOn, 0, '★ مطفأ افتراضياً'); assert.equal(pol.thrN, 10); assert.equal(pol.thrWin, 30); assert.equal(pol.thrSec, 3);
  assert.equal(pol.lockN, 5); assert.equal(pol.lockMin, 5); assert.equal(pol.sessH, 12); assert.equal(pol.idleH, 2); assert.equal(pol.wrMin, 1200);
  const d = catchDelays(3000); try {
    for (let i = 0; i < 10; i++) assert.match((await attempt(C, 'admin', 'no' + i, '198.18.0.' + i)).j.err || '', BAD);
    assert.equal((await attempt(C, 'admin', 'admin', '198.18.1.1')).j.ok, 1);
    assert.deepEqual(d.seen, [], 'لا مهلة والميزةُ مطفأة');
  } finally { d.release(); }
});

test('(ب) مفعَّل: بعد العتبة من عناوين مختلفة كلُّ محاولةٍ على الحساب تُمهَل thrSec ثوانٍ بالضبط — وصاحبُ الكلمة الصحيحة يدخل بعدها · لا قفل · حسابٌ آخر لا يتأثر · النافذةُ تنقضي', async () => {
  const clk = freezeClock(); const d = catchDelays(2000); try {
    const env = makeLegacyTestEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
    const on = await C.api('/api/policy', { method: 'POST', cookie: su.ck, body: { thrOn: 1, thrN: 5, thrWin: 10, thrSec: 2 } });
    assert.equal(on.status, 200, JSON.stringify(on.j)); assert.equal(on.j.policy.thrOn, 1); assert.equal(on.j.policy.thrN, 5); assert.equal(on.j.policy.thrSec, 2);
    assert.equal(on.j.policy.lockN, 5, 'المفاتيحُ الأخرى كما هي'); assert.equal(on.j.policy.lockMin, 5);
    for (let i = 0; i < 4; i++) assert.match((await attempt(C, 'admin', 'no' + i, '198.18.2.' + i)).j.err || '', BAD);
    assert.equal((await attempt(C, 'admin', 'no', '198.18.2.1')).j.ok, 0);   /* عنوانٌ مكرَّر: ما زالت 4 عناوين */
    assert.deepEqual(d.take(), [], 'دون العتبة (4 عناوين مختلفة): لا مهلة');
    assert.match((await attempt(C, 'admin', 'no4', '198.18.2.4')).j.err || '', BAD);   /* الخامس: بلغت العتبة */
    assert.deepEqual(d.take(), [], 'المحاولةُ التي تبلغ العتبة نفسُها لا تُمهَل');
    const bad = await attempt(C, 'admin', 'no5', '198.18.2.5');
    assert.match(bad.j.err || '', BAD, 'الردُّ نفسُه'); assert.deepEqual(d.take(), [2000], '★ المحاولةُ التالية مُمهَلة ثانيتين بالضبط');
    const other = await attempt(C, 'someone-else', 'x', '198.18.2.6'); assert.match(other.j.err || '', BAD); assert.deepEqual(d.take(), [], 'حسابٌ آخر لا يُمهَل');
    /* مئةُ محاولةٍ أخرى لا تطيل المهلة: السقفُ ثابت */
    for (let i = 0; i < 30; i++) await attempt(C, 'admin', 'zz' + i, '198.19.0.' + i);
    assert.ok(d.take().every(ms => ms === 2000), 'المهلةُ لا تتراكم ولا تطول');
    const owner = await attempt(C, 'admin', 'admin', '198.18.9.9');
    assert.equal(owner.j.ok, 1, '★ صاحبُ الكلمة الصحيحة يدخل — بعد المهلة القصيرة فقط'); assert.deepEqual(d.take(), [2000]);
    assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM guard WHERE gk = 'u:admin' AND until > ?", Date.now())[0].n, 0, 'لا قفلَ على الحساب');
    clk.jump(11 * 60000);   /* انقضت النافذة (10 د) */
    assert.equal((await attempt(C, 'admin', 'admin', '198.18.9.10')).j.ok, 1); assert.deepEqual(d.take(), [], 'بعد النافذة: لا مهلة');
    /* الإطفاءُ يُحفظ (القيمة 0) والنطاقاتُ تُرفض باسمها */
    const off = await C.api('/api/policy', { method: 'POST', cookie: su.ck, body: { thrOn: 0 } }); assert.equal(off.j.policy.thrOn, 0, 'الإطفاءُ يُحفظ'); assert.equal(off.j.policy.thrN, 5, 'والعتبةُ تبقى');
    for (const [k, v] of [['thrSec', 11], ['thrSec', 0], ['thrN', 4], ['thrN', 101], ['thrWin', 4], ['thrWin', 121], ['thrOn', 2], ['thrOn', 0.5]]) {
      const r = await C.api('/api/policy', { method: 'POST', cookie: su.ck, body: { [k]: v } });
      assert.equal(r.status, 400, k + '=' + v); assert.equal(r.j.err, 'policy-invalid'); assert.equal(r.j.field, k);
    }
  } finally { d.release(); clk.release(); }
});
