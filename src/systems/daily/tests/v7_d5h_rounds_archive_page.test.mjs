/* V7 · د5-ح (13) — أرشيفُ الجولات في المتصفح (المختبرُ المعزول · بياناتٌ اصطناعية TEST_ONLY · مديرُ الإدارة أ):
   الملفُّ الحيّ يحمل أيامَ شهرٍ مقفلٍ من قبل الحزمة (قبل الشهر الماضي) والأرشيفُ فارغ. صفحةُ المتابعة اليومية تُنشئ جولةَ اليوم بطريقها الحقيقي
   (KIVO.BassamRound.ensure ← مسودة Operations ← /api/save): الحفظةُ نفسُها تنقل الشهرَ المقفل إلى الأرشيف (كتابةٌ ثانية للخادم في الدفعة الذرّية)،
   والعميلُ يرى النجاح (الردُّ يسمّي الجولاتِ وحدها) بلا أخطاء صفحة؛ ثم تقرأ الصفحةُ الأيامَ المؤرشفة مع الحيّ (daily.days@1 · loadRounds)
   ولا ترسلها مرةً أخرى في حفظتها التالية. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from '../../../../tests/browser/local_server.mjs';
import { chromium, openAs } from '../../../../tests/browser/lab_browser.mjs';
import { replaceOperationalFixture } from '../../../../tests/unit/operational_legacy_seed_fx.mjs';

const A = 'TEST_ONLY_A', KP = 'bsdept:' + A + ':bassam_plan_v1', KR = 'bsdept:' + A + ':bassam_rounds_v1', KA = 'bsdept:' + A + ':bassam_rounds_arc_v1';
const site = () => ({ sid: 's_TEST_ONLY_1', name: 'TEST_ONLY موقع 1', num: 1, gates: [], marks: [], paths: [], sectors: [],
  zones: [{ uid: 'TEST_ONLY_z1', name: 'TEST_ONLY', code: '01', ser: '01', cat: 'men', d: 'M100 100 L400 100 L400 250 L100 250 Z', cx: 250, cy: 175 }] });

test('V7 · د5-ح (13): حفظةٌ حقيقية من صفحة الجولات تنقل الشهرَ المقفل إلى الأرشيف · العميلُ يرى النجاح · الصفحةُ تقرأ الأرشيف ولا ترسله', { timeout: 600000 }, async () => {
  const lab = await startLab(), { env } = lab;
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
  const num = (t) => +parts.find((x) => x.type === t).value, T = { y: num('year'), m: num('month'), d: num('day') };
  const x = T.y * 12 + (T.m - 1) - 2, Y = Math.floor(x / 12), M = (x % 12) + 1, OLD = Y + '-' + M;   /* الشهرُ قبل الماضي — مقفلٌ للأرشفة */
  await replaceOperationalFixture(env, KP, { pMig: 3, zones: [], gates: [], marks: [], paths: [], floors: [site()], months: { [T.y + '-' + T.m]: { c: 1, d: [site()] } }, cfg: {}, delMonths: {} });
  const old = {}; for (let d = 1; d <= 10; d++) old[OLD + '-' + d] = { ap: 1, t: 1000 + d, d: [site()] };
  await replaceOperationalFixture(env, KR, old);
  const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page; p.setDefaultTimeout(20000);
    const saves = [];
    p.on('request', (r) => { if (r.method() === 'POST' && /\/api\/save\b/.test(r.url())) try { saves.push(JSON.parse(r.postData() || '{}')); } catch (e) {} });
    await s.go('#/daily/rounds', 5000);
    assert.equal(await p.evaluate(() => KIVO.BassamHijri.now().d), T.d, 'الصفحةُ والمُثبِّتُ على يومٍ واحد');
    /* جولةُ اليوم بطريق الصفحة نفسِه (التقريرُ اليومي والجولاتُ ينشئانها هكذا) */
    const r = await p.evaluate(([y, m, d]) => KIVO.BassamRound.ensure(y, m, d).then((x) => ({ status: x.status, err: x.err || '' })), [T.y, T.m, T.d]);
    assert.equal(r.status, 'created', JSON.stringify(r));
    assert.equal(saves.length, 1, 'حفظةٌ واحدة');
    assert.deepEqual(Object.keys(saves[0].set), [KR], 'العميلُ لا يكتب الأرشيف');
    const R = (await s.api('/api/operations/read?keys=' + encodeURIComponent(KR + ',' + KA))).j.resources;
    assert.ok(R[KR][T.y + '-' + T.m + '-' + T.d], 'جولةُ اليوم في الحيّ');
    assert.ok(!Object.keys(R[KR]).some((k) => k.startsWith(OLD + '-')), 'لا يومَ من الشهر المقفل في الحيّ');
    for (let d = 1; d <= 10; d++) assert.deepEqual(R[KA][OLD + '-' + d], old[OLD + '-' + d], 'اليوم ' + d + ' في الأرشيف كما هو');
    /* الصفحةُ تقرأ الأرشيف بعد أن يبلغها التغيير (/api/changes) — أو بقراءة الخدمة نفسِها؛ أيامُه مع الحيّ في قراءة المالك المعلنة */
    await p.evaluate((ka) => KIVO.__BS_SRV.operations.read([ka]), KA);
    await p.waitForFunction((old) => { try { const v = KIVO.__BS_SRV.operations.get('bassam_rounds_arc_v1'); return !!(v && v[old + '-1']); } catch (e) { return false; } }, OLD, { timeout: 60000 });
    const seen = await p.evaluate((old) => { const v = KIVO.bus.read('daily.days@1') || {}; return Object.keys(v).filter((k) => k.startsWith(old + '-')).length; }, OLD);
    assert.equal(seen, 10, 'daily.days@1 يرى الأيامَ المؤرشفة');
    /* حفظةٌ ثانية من الصفحة (اعتمادُ جولة ورديةٍ اليوم): لا ترسل الأيامَ المؤرشفة */
    const r2 = await p.evaluate(([y, m, d]) => KIVO.BassamRound.setShiftAp(y, m, d, 'TEST_ONLY_SHIFT', 1).then((x) => ({ status: x.status, err: x.err || '' })), [T.y, T.m, T.d]);
    assert.equal(r2.status, 'approved', JSON.stringify(r2));
    assert.equal(saves.length, 2);
    const sent = JSON.parse(saves[1].set[KR]);
    assert.ok(!Object.keys(sent).some((k) => k.startsWith(OLD + '-')), 'الأيامُ المؤرشفة لا تُرسل');
    const R2 = (await s.api('/api/operations/read?keys=' + encodeURIComponent(KR + ',' + KA))).j.resources;
    assert.deepEqual(R2[KA], R[KA], 'الأرشيفُ كما هو');
    assert.equal(R2[KR][T.y + '-' + T.m + '-' + T.d].shAp.TEST_ONLY_SHIFT.ap, 1);
    assert.deepEqual(s.errs, [], 'بلا أخطاء صفحة');
  } finally { await b.close(); await lab.close(); }
});
