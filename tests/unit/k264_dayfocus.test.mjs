/* KIVO_264 · D-5 (متوسط) — «اليوم المختار» محفوظٌ بياناتِ فريقٍ مشتركة للإدارة (دليلُ التدقيق t6 مُكيَّفاً).
   العيب: bassam_dayfocus_v1 يمرّ بطبقة الإدارات (bsdept:<d>:…) ثم يُعامل مفتاحَ فريق (TEAMK9) فيُحفظ في الخادم: A يفتح يوماً آخر للمراجعة
   ⇒ KIVO.BassamDayFocus.get() عند B يعيد يومَ A، وdaily/logic.js (componentDidUpdate → dsFocusApply) ينقل صفحةَ B المفتوحة إليه، وكلُّ تنقّلٍ
   كتابةٌ مدقَّقة ورفعُ مراجعةٍ للإدارة كلّها. الأدلة على أنه اختيارُ واجهةٍ لا قرارٌ تشغيليّ مشترك: تعليقُ 332 (غرضُه توحيدُ شاشتَي المتابعة
   لمستخدمٍ واحد)، وتصنيفُه «tech» في KIVO.BassamKeyLabels (مفتاحٌ تقنيّ للجهاز أو الجلسة)، وأن من لا يملك الكتابة كان يُبقيه في الذاكرة فتعمل
   الشاشتان كما هما، وسابقتا R187/R188 (تفضيلاتُ العرض صارت مفاتيحَ جهاز). المطلوب: لكل مستخدمٍ وتبويب، والمفتاحُ القديم افتراضٌ أوّليّ فقط. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, applySql, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { loadClient, shareNative, asWriter, sleep, fixture, TODAY } from './k264_vm.mjs';

const BLOCKS = ['280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '332-find-day.js'];
const KF = 'bsdept:tst_d1:bassam_dayfocus_v1';
/* تبويب: مخزنٌ أصليٌّ خاصّ به (نسخةٌ مستقلة — تُشارَك خريطتُها بين تبويبات الجهاز بـshareNative) ومخزنُ جلسةٍ اختياريّ (إعادةُ التحميل) */
function tab(C, login, boot, opt = {}) {
  const T = loadClient(Object.assign({ C, boot: undefined, jar: { cookie: login.ck }, blocks: [] }, opt));
  const now = Date.now();
  T.W.localStorage.setItem('bassam_session_v1', JSON.stringify({ uid: login.j.uid, ts: now, la: now, mc: 0 }));   /* كما يكتبها cfLogin9 */
  T.W.localStorage.setItem('bassam_active_dept_v1', 'tst_d1');
  T.W.__BS_BOOT = JSON.parse(JSON.stringify(boot));
  return T;
}
async function setup(mode) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : { KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, fixture().seed);
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  return { env, C };
}
const other = { y: TODAY.year, m: TODAY.month === 1 ? 2 : 1, d: 3 };
const today = { y: TODAY.year, m: TODAY.month, d: TODAY.day };
const plain = (x) => x ? { y: x.y, m: x.m, d: x.d } : x;

for (const mode of ['legacy', 'enforce']) test('[' + mode + '] D-5: «اليوم المختار» لكل مستخدم — تنقّلُ A لا يغيّر يومَ B ولا يُكتب في الخادم', async () => {
  const { env, C } = await setup(mode);
  const A = await C.login('0000000111', '70111'), B = await C.login('0000000114', '70114'); assert.ok(A.ok && B.ok, 'A = tst_sup1 · B = tst_lon');
  const tA = tab(C, A, (await C.boot(A.ck)).boot).run(BLOCKS), tB = tab(C, B, (await C.boot(B.ck)).boot).run(BLOCKS);
  const aud0 = env.DB.q('SELECT COUNT(*) AS n FROM aud WHERE k = ?', KF)[0].n;
  try {
    tB.W.KIVO.BassamDayFocus.set(today.y, today.m, today.d);
    await sleep(600);
    tA.W.KIVO.BassamDayFocus.set(other.y, other.m, other.d);
    await sleep(2600);
    assert.deepEqual(plain(tB.W.KIVO.BassamDayFocus.get()), today, 'يومُ B كما اختاره');
    assert.deepEqual(plain(tA.W.KIVO.BassamDayFocus.get()), other, 'ويومُ A كما اختاره');
    assert.ok(![...tA.saves(), ...tB.saves()].some(s => /dayfocus/.test(s.body || '')), 'لا حفظَ لليوم المختار في الخادم');
    assert.equal(env.DB.q('SELECT COUNT(*) AS n FROM aud WHERE k = ?', KF)[0].n, aud0, 'ولا حدثَ تدقيقٍ للإدارة');
  } finally { tA.dispose(); tB.dispose(); }
});

test('[legacy] D-5: لكل تبويب يومُه · التبويبُ الجديد يفتح على اليوم (KIVO_265 · فحص القبول: لا افتراضَ من الجهاز) · إعادةُ التحميل تُبقيه · المفتاحُ القديم لا يُقرأ', async () => {
  const { env, C } = await setup('legacy');
  const A = await C.login('0000000111', '70111'); assert.ok(A.ok);
  /* قيمةٌ مشتركة قديمة في الخادم (كتبتها نسخةٌ سابقة) */
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN);
  const g = await C.api('/api/get?keys=' + encodeURIComponent(KF), { cookie: su.ck }); const base = {}; base[KF] = ((g.j.keys || {})[KF] || {}).rev || 0;
  const old = { y: TODAY.year, m: TODAY.month, d: 1 };
  assert.ok((await C.save(su.ck, { [KF]: JSON.stringify(old) }, [], base)).j.revs, 'زُرعت قيمةٌ مشتركة قديمة');
  const boot = (await C.boot(A.ck)).boot;
  const t1 = tab(C, A, boot), t2 = tab(C, A, boot);
  const shared = shareNative([t1, t2]); t1.run(BLOCKS); t2.run(BLOCKS);
  const tabs = [t1, t2];
  try {
    assert.equal(t1.W.KIVO.BassamDayFocus.get(), null, 'بلا اختيارٍ سابق: لا افتراضَ من المفتاح القديم ولا من الجهاز — الشاشةُ تفتح على اليوم (KIVO_265)');
    asWriter(shared, t1, () => t1.W.KIVO.BassamDayFocus.set(today.y, today.m, today.d));
    asWriter(shared, t2, () => t2.W.KIVO.BassamDayFocus.set(other.y, other.m, other.d));
    assert.deepEqual(plain(t1.W.KIVO.BassamDayFocus.get()), today, 'التبويب ١ على يومه');
    assert.deepEqual(plain(t2.W.KIVO.BassamDayFocus.get()), other, 'التبويب ٢ على يومه');
    const t3 = tab(C, A, boot); tabs.push(t3); shareNative(tabs); t3.run(BLOCKS);
    assert.equal(t3.W.KIVO.BassamDayFocus.get(), null, 'التبويبُ الجديد لا يرث يومَ تبويبٍ آخر ولا آخرَ يومٍ على الجهاز — يفتح على اليوم (KIVO_265)');
    const t1r = tab(C, A, boot, { session: t1.W.sessionStorage }); tabs.push(t1r); shareNative(tabs); t1r.run(BLOCKS);
    assert.deepEqual(plain(t1r.W.KIVO.BassamDayFocus.get()), today, 'إعادةُ التحميل تُبقي يومَ التبويب');
    /* القيمةُ المشتركة القديمة لا تُكتب بعد الآن ولا تحرّك تبويباً له يومُه */
    const srv = env.DB.q('SELECT v FROM kv WHERE k = ?', KF)[0].v;
    assert.deepEqual(JSON.parse(srv), old, 'لم تُمسّ في الخادم');
    assert.ok(!Object.keys(t1.nativeLS()).some(k => k === KF), 'ولا تُنسخ قيمةُ الفريق إلى الجهاز');
  } finally { tabs.forEach(t => t.dispose()); }
});
