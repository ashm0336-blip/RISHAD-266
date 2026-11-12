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
  const ACC = W.users[1].un;   /* المراجعة المستقلة (L2): الإنذارُ الموزَّع لحسابٍ قائم فقط — كان الاختبارُ يستعمل اسماً غيرَ قائم */
  await fail(ACC, '203.0.113.1', 3000); await poll();
  await fail(ACC, '203.0.113.2', 2000); await poll();
  assert.equal(msgs().length, 0, 'عنوانان فقط: لا إنذار بعد');
  await fail(ACC, '203.0.113.3', 1000); await poll();
  const m = msgs();
  assert.equal(m.length, 1, '★ ثلاثةُ عناوين على حسابٍ واحد ⇒ إنذارٌ واحد (كان: لا إنذار ما لم تجتمع 5 في دفعة): ' + JSON.stringify(m));
  const text = m[0].title + ' ' + m[0].body;
  for (const a of ['203.0.113.1', '203.0.113.2', '203.0.113.3']) assert.ok(text.includes(a), 'النصُّ يحمل العنوان ' + a + ': ' + text);
  assert.ok(text.includes(ACC) && /3/.test(text), 'النصُّ يحمل الحسابَ والعدد: ' + text);
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

/* ════ المراجعةُ المستقلة للالتزام 9f64265 — M1 · L1 · L2 · L3 ════ */
/* حساباتٌ إضافية بتجزئةٍ قديمة (كحساب الاختبار التاريخي) — موظفو المكتب في المحاكاة */
function legacyPh(password) { const s = 'bs~' + password + '~gate'; let h = 5381, h2 = 52711; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; for (let i = s.length - 1; i >= 0; i--) h2 = ((h2 << 5) + h2 + s.charCodeAt(i)) | 0; return 'p1$' + (h >>> 0).toString(36) + '.' + (h2 >>> 0).toString(36); }
function addStaff(env, n) {
  const users = JSON.parse(env.DB.q("SELECT v FROM kv WHERE k = 'bassam_auth_users_v1' ORDER BY seq").map(r => r.v).join(''));
  for (let i = 0; i < n; i++) users.push({ id: 'emp' + i, un: 'emp' + i, name: 'TEST_ONLY employee ' + i, role: 'staff', ph: legacyPh('pw' + i) });
  env.DB.db.prepare("DELETE FROM kv WHERE k = 'bassam_auth_users_v1'").run();
  env.DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run('bassam_auth_users_v1', JSON.stringify(users));
}
const ipRow = (env, x) => env.DB.q('SELECT n, until FROM guard WHERE gk = ?', 'ip:' + x)[0] || null;

test('(M1) النجاحُ يغتفر على المصدر إخفاقاتِ الزوج نفسِه (أخطاءَ صاحبه قبل أن يصيب) وحجزَه — لا إخفاقاتِ حساباتٍ أخرى · ولا ينزل تحت الصفر', async () => {
  const env = makeLegacyTestEnv(); addStaff(env, 2); const C = client(env); const X = '192.0.2.90';
  for (let i = 0; i < 3; i++) assert.match((await attempt(C, 'emp0', 'typo', X)).j.err || '', BAD);
  assert.equal(ipRow(env, X).n, 3);
  assert.equal((await attempt(C, 'emp0', 'pw0', X)).j.ok, 1);
  assert.equal(ipRow(env, X), null, '★ أخطاءُ المستخدم الثلاثة قبل نجاحه لا تترك أثراً على عنوان المكتب (كان: تبقى 3): ' + JSON.stringify(ipRow(env, X)));
  /* إخفاقاتُ حسابٍ آخر من العنوان نفسِه لا يغتفرها نجاحُ غيره */
  for (let i = 0; i < 2; i++) assert.match((await attempt(C, 'victim', 'guess' + i, X)).j.err || '', BAD);
  for (let i = 0; i < 2; i++) assert.match((await attempt(C, 'emp1', 'typo', X)).j.err || '', BAD);
  assert.equal(ipRow(env, X).n, 4);
  assert.equal((await attempt(C, 'emp1', 'pw1', X)).j.ok, 1);
  assert.equal(ipRow(env, X).n, 2, '★ يبقى إخفاقا الحساب الآخر بالضبط');
  assert.equal((await attempt(C, 'emp0', 'pw0', X)).j.ok, 1); assert.equal((await attempt(C, 'admin', 'admin', X)).j.ok, 1);
  assert.equal(ipRow(env, X).n, 2, 'دخولاتٌ صحيحة لاحقة لا تغتفر إخفاقاتِ غيرها');
  assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM guard WHERE gk LIKE 'p:emp%'")[0].n, 0, 'أزواجُ الناجحين محذوفة');
  /* لا ينزل تحت الصفر: صفُّ المصدر فُكَّ إدارياً وبقي الزوج */
  for (let i = 0; i < 3; i++) await attempt(C, 'emp0', 'typo', X);
  env.DB.exec("DELETE FROM guard WHERE gk = 'ip:192.0.2.90'");
  assert.match((await attempt(C, 'victim', 'g', X)).j.err || '', BAD);
  assert.equal((await attempt(C, 'emp0', 'pw0', X)).j.ok, 1);
  const g = ipRow(env, X); assert.ok(g === null || g.n >= 0, 'لا عدَّ سالباً: ' + JSON.stringify(g));
});

test('(M1) محاولاتٌ مرفوضة والمصدرُ مقفل لا تنفخ عدّادَ الزوج — فلا يمحو نجاحُ المهاجم بحسابه إخفاقاتِه على غيره بعد انقضاء القفل', async () => {
  const clk = freezeClock(); try {
    const env = makeLegacyTestEnv(); const C = client(env); const X = '192.0.2.91';
    for (let i = 0; i < 5; i++) assert.match((await attempt(C, 'victim' + i, '11111', X)).j.err || '', BAD);
    for (let i = 0; i < 12; i++) assert.match((await attempt(C, 'admin', 'wrong' + i, X)).j.err || '', MANY, 'المصدرُ مقفل');
    clk.jump(6000);
    assert.equal((await attempt(C, 'admin', 'admin', X)).j.ok, 1);
    assert.equal(ipRow(env, X).n, 5, '★ إخفاقاتُ الضحايا الخمسة باقية كلُّها');
    assert.match((await attempt(C, 'victim5', '11111', X)).j.err || '', BAD);
    assert.match((await attempt(C, 'victim6', '11111', X)).j.err || '', MANY, 'والقفلُ يعود عند التالي');
  } finally { clk.release(); }
});

test('(M1) نجاحان متزامنان للزوج نفسِه لا يغتفران مرّتين: إخفاقاتُ الحسابات الأخرى باقيةٌ بعددها', async () => {
  const env = makeLegacyTestEnv(); addStaff(env, 1); const C = client(env); const X = '192.0.2.92';
  assert.equal((await attempt(C, 'emp0', 'pw0', '192.0.2.99')).j.ok, 1);   /* ترقيةُ التجزئة خارج السباق */
  for (let i = 0; i < 2; i++) assert.match((await attempt(C, 'victim' + i, '11111', X)).j.err || '', BAD);
  assert.match((await attempt(C, 'emp0', 'typo', X)).j.err || '', BAD);
  const rs = await Promise.all([attempt(C, 'emp0', 'pw0', X), attempt(C, 'emp0', 'pw0', X)]);
  assert.deepEqual(rs.map(r => r.j.ok), [1, 1]);
  assert.equal(ipRow(env, X).n, 2, '★ يبقى إخفاقا الضحيتين بالضبط — لا اغتفارَ مزدوجاً: ' + JSON.stringify(ipRow(env, X)));
});

/* محاكاةُ المراجع (rev5/p2_office.mjs): مكتبٌ خلف عنوانٍ واحد — دخولٌ صحيح كلَّ 20 ث وخطأُ كتابةٍ كلَّ typoGap. followed: الخطأ يتبعه نجاحُ صاحبه */
async function office(typoGapMs, hours, followed) {
  const real = Date.now; let T = real(); Date.now = () => T++;
  try {
    const env = makeLegacyTestEnv(); addStaff(env, 6); const C = client(env); const X = '10.1.1.1'; const t0 = T; let nextTypo = T, refused = 0, okN = 0, maxW = 0, i = 0, empRefused = 0;
    while (T - t0 < hours * 3600000) {
      if (T >= nextTypo) {
        const e = i++ % 6;
        if (followed) { await attempt(C, 'emp' + e, 'typo', X); const s = await attempt(C, 'emp' + e, 'pw' + e, X); if (s.j.ok !== 1) empRefused++; }
        else await attempt(C, 'ghost' + i, 'typo', X);
        nextTypo += typoGapMs;
      }
      const r = await attempt(C, 'admin', 'admin', X); if (r.j.ok === 1) okN++; else { refused++; maxW = Math.max(maxW, r.j.wait || 0); }
      T += 20000;
    }
    return { ok: okN, refused, empRefused, maxW, ip: ipRow(env, X) };
  } finally { Date.now = real; }
}

test('(M1) محاكاةُ المكتب المشترك (3 ساعات · دخولٌ كلَّ 20 ث): خطأٌ كلَّ 4 د وكلَّ 2 د يتبعه نجاحُ صاحبه ⇒ لا دخولَ صحيحاً مرفوض', async () => {
  for (const gap of [240000, 120000]) {
    const r = await office(gap, 3, true);
    console.log('office followed gap=' + gap / 60000 + 'min', JSON.stringify(r));
    assert.equal(r.refused + r.empRefused, 0, '★ خطأٌ كلَّ ' + gap / 60000 + ' د: دخولاتٌ صحيحة مرفوضة (كان 224 من 540 عند 4 د): ' + JSON.stringify(r));
    assert.equal(r.ok, 540);
  }
  /* للتقرير فقط: أخطاءٌ لا يتبعها نجاح (أسماءٌ لا يصيب صاحبُها) — قد تُقفل، وهو الصحيح */
  for (const gap of [240000, 120000]) console.log('office never-followed gap=' + gap / 60000 + 'min', JSON.stringify(await office(gap, 3, false)));
});

/* محاكاةُ المراجع (rev5/p1_rate.mjs): مهاجمٌ يرشّ أسماءً من عنوانٍ واحد ويدخل بحسابه الصالح كلَّ أربع محاولات — own: يُخفق بحسابه عمداً قبل نجاحه */
async function sprayOwned(hours, own) {
  const real = Date.now; let T = real(); Date.now = () => T++;
  try {
    const env = makeLegacyTestEnv(); const C = client(env); const X = '9.9.9.9'; const t0 = T; const perHour = Array(hours).fill(0); let i = 0;
    while (T - t0 < hours * 3600000) {
      if (i % 4 === 3) { for (let k = 0; k < own; k++) { const f = await attempt(C, 'admin', 'bad', X); if (f.j.wait) T += f.j.wait * 1000 + 1; } const s = await attempt(C, 'admin', 'admin', X); if (s.j.ok !== 1 && s.j.wait) T += s.j.wait * 1000 + 1; }
      const r = await attempt(C, 'v' + i, 'bad' + i, X);
      if (r.j.wait) { T += r.j.wait * 1000 + 1; continue; }
      const h = Math.floor((T - t0) / 3600000); if (h < hours) perHour[h]++; i++;
      if (i > 3000) break;
    }
    return perHour;
  } finally { Date.now = real; }
}

test('(M1) حيلةُ الحساب المملوك تبقى مغلقة: التخمينُ على الضحايا ≤ 21 في الساعة الأولى ثم ≤ 12/ساعة — ولو أخفق المهاجمُ بحسابه قبل كل نجاح', async () => {
  for (const own of [0, 1, 3]) {
    const ph = await sprayOwned(3, own);
    console.log('spray + owned account every 4 (own fails before success=' + own + ') guesses/h:', ph.join(','));
    assert.ok(ph[0] <= 21, 'الساعة الأولى: ' + ph); assert.ok(ph[1] <= 12 && ph[2] <= 12, 'ثم 12/ساعة: ' + ph);
  }
});

test('(L1) الإبطاءُ بعد فحص القفل: عميلٌ مقفلُ المصدر لا يُمهَل ولا يُشغّل استعلامَ العناوين', async () => {
  const d = catchDelays(2000); try {
    const env = makeLegacyTestEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
    assert.equal((await C.api('/api/policy', { method: 'POST', cookie: su.ck, body: { thrOn: 1, thrN: 5, thrWin: 10, thrSec: 2 } })).status, 200);
    for (let i = 0; i < 6; i++) await attempt(C, 'admin', 'no' + i, '198.18.5.' + i);
    d.take();
    assert.match((await attempt(C, 'admin', 'no', '198.18.5.50')).j.err || '', BAD); assert.deepEqual(d.take(), [2000], 'الحسابُ مُبطَّأ');
    const Z = '198.18.6.6'; for (let i = 0; i < 5; i++) await attempt(C, 'other' + i, 'x', Z);
    const prep = env.DB.prepare.bind(env.DB); let counted = 0; env.DB.prepare = (sql) => { if (/COUNT\(DISTINCT ip\)/.test(sql)) counted++; return prep(sql); };
    const r = await attempt(C, 'admin', 'no', Z);
    env.DB.prepare = prep;
    assert.match(r.j.err || '', MANY, 'المصدرُ مقفل');
    assert.deepEqual(d.take(), [], '★ المقفلُ لا يُمهَل (كان: يُمهَل ثم يُرفض)'); assert.equal(counted, 0, '★ ولا يُشغّل الاستعلام');
  } finally { d.release(); }
});

test('(L2) أسماءٌ غيرُ قائمة من عناوين قليلة لا تولّد إنذاراً لكل اسم (كان: 30 إنذاراً عاجلاً لـ30 اسماً من 3 عناوين)', async () => {
  const W = await world();
  const fail = (un, from, ago) => W.DB.prepare('INSERT INTO sec(ts,uid,un,act,target,detail,ip) VALUES(?1,?2,?3,?4,?5,?6,?7)').bind(Date.now() - ago, '', un, 'login_fail', '', 'no-user', from).run();
  for (let n = 0; n < 30; n++) for (let a = 1; a <= 3; a++) await fail('05990000' + (10 + n), '203.0.113.' + a, 5000 - n * 10 - a);
  assert.equal((await W.act('super', { op: 'security-poll' })).status, 200);
  assert.equal(W.DB.q("SELECT COUNT(*) n FROM notification_messages WHERE type = 'sc_fail'")[0].n, 0, '★ لا إنذارَ لاسمٍ غير قائم');
  /* وحسابٌ قائم بين الرشّ يُنذَر له وحده */
  for (let a = 1; a <= 3; a++) await fail(W.users[2].un, '203.0.113.' + a, 100 - a);
  assert.equal((await W.act('super', { op: 'security-poll' })).status, 200);
  const m = W.DB.q("SELECT title, body FROM notification_messages WHERE type = 'sc_fail'");
  assert.equal(m.length, 1); assert.ok((m[0].title + ' ' + m[0].body).includes(W.users[2].un));
});

test('(L2) نافذةُ «مرّةً في الساعة» متدحرجة: دفعةٌ تعبر رأسَ الساعة لا تُنذِر مرّتين — وبعد ساعةٍ كاملة يُنذَر من جديد', async () => {
  const real = Date.now; let T = (Math.floor(real() / 3600000) + 1) * 3600000 - 60000; Date.now = () => T; try {   /* قبل رأس الساعة بدقيقة */
    const W = await world(); const ACC = W.users[1].un;
    const fail = (from) => W.DB.prepare('INSERT INTO sec(ts,uid,un,act,target,detail,ip) VALUES(?1,?2,?3,?4,?5,?6,?7)').bind(T - 1, '', ACC, 'login_fail', '', 'bad-pw', from).run();
    const poll = async () => { T += 5; const r = await W.act('super', { op: 'security-poll' }); assert.equal(r.status, 200); };
    const count = () => W.DB.q("SELECT COUNT(*) n FROM notification_messages WHERE type = 'sc_fail'")[0].n;
    for (let a = 1; a <= 3; a++) { T += 1000; await fail('203.0.113.' + a); } await poll();
    assert.equal(count(), 1);
    T += 120000;   /* عبرنا رأسَ الساعة */
    for (let a = 4; a <= 6; a++) { T += 1000; await fail('203.0.113.' + a); await poll(); }
    assert.equal(count(), 1, '★ الدفعةُ نفسُها بعد رأس الساعة لا تُنذِر ثانيةً (كان: إنذاران)');
    T += 3600000;   /* مضت ساعةٌ كاملة على الإنذار */
    for (let a = 7; a <= 9; a++) { T += 1000; await fail('203.0.113.' + a); } await poll();
    assert.equal(count(), 2, 'بعد ساعةٍ متدحرجة يُنذَر من جديد');
  } finally { Date.now = real; }
});

test('(L3) GET /api/policy يعيد القيمَ الفعلية (المحصورة) لمفاتيح الإبطاء — و thrOn مفعَّلٌ للعدد 1 بالضبط لا لغيره', async () => {
  const d = catchDelays(10000); try {
    const env = makeLegacyTestEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
    const store = (p) => env.DB.db.prepare("INSERT INTO meta (k, v) VALUES ('policy', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(JSON.stringify(p));
    const get = async () => (await C.api('/api/policy', { cookie: su.ck })).j.policy;
    store({ thrOn: 1, thrN: 1000, thrWin: 1, thrSec: 99 });
    assert.deepEqual((({ thrOn, thrN, thrWin, thrSec }) => ({ thrOn, thrN, thrWin, thrSec }))(await get()), { thrOn: 1, thrN: 100, thrWin: 5, thrSec: 10 }, '★ القيمُ المحصورة التي يعمل بها الخادم');
    store({ thrOn: 1, thrN: 7.9, thrWin: 'x', thrSec: 2.5 });
    assert.deepEqual((({ thrN, thrWin, thrSec }) => ({ thrN, thrWin, thrSec }))(await get()), { thrN: 7, thrWin: 30, thrSec: 2 });
    for (const v of ['1', true, 2, 1.5, [1]]) {
      store({ thrOn: v, thrN: 5, thrWin: 10, thrSec: 10 });
      assert.equal((await get()).thrOn, 0, '★ thrOn=' + JSON.stringify(v) + ' ليس العددَ 1 ⇒ مطفأ');
      for (let i = 0; i < 6; i++) await attempt(C, 'tgt', 'no', '198.18.7.' + i);
      await attempt(C, 'tgt', 'no', '198.18.7.77'); assert.deepEqual(d.take(), [], 'ولا مهلة');
    }
    for (const v of [true, 2, '01', 'on']) { const r = await C.api('/api/policy', { method: 'POST', cookie: su.ck, body: { thrOn: v } }); assert.ok(r.status === 400 || r.j.policy.thrOn === 0, 'POST thrOn=' + JSON.stringify(v) + ' لا يفعّل: ' + JSON.stringify(r.j)); }
    /* the admin form posts text (admin/logic.js adPol ← e.target.value): '1' must enable and '0' disable, and the stored value is the number */
    assert.equal((await C.api('/api/policy', { method: 'POST', cookie: su.ck, body: { thrOn: '1' } })).j.policy.thrOn, 1, 'the form\'s "1" enables');
    assert.equal((await get()).thrOn, 1); assert.strictEqual(JSON.parse(env.DB.q("SELECT v FROM meta WHERE k='policy'")[0].v).thrOn, 1, 'stored as a number');
    assert.equal((await C.api('/api/policy', { method: 'POST', cookie: su.ck, body: { thrOn: '0' } })).j.policy.thrOn, 0, 'the form\'s "0" disables');
    assert.equal((await C.api('/api/policy', { method: 'POST', cookie: su.ck, body: { thrOn: 1 } })).j.policy.thrOn, 1);
    assert.equal((await get()).thrOn, 1);
  } finally { d.release(); }
});
