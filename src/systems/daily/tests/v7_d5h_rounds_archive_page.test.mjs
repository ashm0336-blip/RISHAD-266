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
  const parts = new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
  const num = (t) => +parts.find((x) => x.type === t).value, T = { y: num('year'), m: num('month'), d: num('day') };
  const x = T.y * 12 + (T.m - 1) - 2, Y = Math.floor(x / 12), M = (x % 12) + 1, OLD = Y + '-' + String(M).padStart(2, '0');   /* الشهرُ قبل الماضي — مقفلٌ للأرشفة */
  await replaceOperationalFixture(env, KP, { pMig: 3, zones: [], gates: [], marks: [], paths: [], floors: [site()], months: { [T.y + '-' + String(T.m).padStart(2, '0')]: { c: 1, d: [site()] } }, cfg: {}, delMonths: {} });
  const old = {}; for (let d = 1; d <= 10; d++) old[OLD + '-' + String(d).padStart(2, '0')] = { ap: 1, t: 1000 + d, d: [site()] };
  await replaceOperationalFixture(env, KR, old);
  const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page; p.setDefaultTimeout(20000);
    const saves = [];
    p.on('request', (r) => { if (r.method() === 'POST' && /\/api\/save\b/.test(r.url())) try { saves.push(JSON.parse(r.postData() || '{}')); } catch (e) {} });
    await s.go('#/daily/rounds', 5000);
    assert.equal(await p.evaluate(() => KIVO.BassamCal.gAt(new Date()).d), T.d, 'الصفحةُ والمُثبِّتُ على يومٍ واحد');   /* V7 · 53 تقويم: يومُ الصفحة الميلادي */
    /* جولةُ اليوم بطريق الصفحة نفسِه (التقريرُ اليومي والجولاتُ ينشئانها هكذا) */
    const r = await p.evaluate(([y, m, d]) => KIVO.BassamRound.ensure(y, m, d).then((x) => ({ status: x.status, err: x.err || '' })), [T.y, T.m, T.d]);
    assert.equal(r.status, 'created', JSON.stringify(r));
    assert.equal(saves.length, 1, 'حفظةٌ واحدة');
    /* V7 · 53: الجولاتُ مخزّنةٌ باليوم — الحفظةُ تكتب يومَ الجولة وحده (K@<اليوم>)، ولا شيءَ من الأرشيف ولا من غيره من أيام الجولات */
    assert.deepEqual(Object.keys(saves[0].set), [KR + '@' + T.y + '-' + String(T.m).padStart(2, '0') + '-' + String(T.d).padStart(2, '0')], 'العميلُ لا يكتب الأرشيف');
    const R = (await s.api('/api/operations/read?keys=' + encodeURIComponent(KR + ',' + KA))).j.resources;
    assert.ok(R[KR][T.y + '-' + String(T.m).padStart(2, '0') + '-' + String(T.d).padStart(2, '0')], 'جولةُ اليوم في الحيّ');
    assert.ok(!Object.keys(R[KR]).some((k) => k.startsWith(OLD + '-')), 'لا يومَ من الشهر المقفل في الحيّ');
    for (let d = 1; d <= 10; d++) assert.deepEqual(R[KA][OLD + '-' + String(d).padStart(2, '0')], old[OLD + '-' + String(d).padStart(2, '0')], 'اليوم ' + d + ' في الأرشيف كما هو');
    /* الصفحةُ تقرأ الأرشيف بعد أن يبلغها التغيير (/api/changes) — أو بقراءة الخدمة نفسِها؛ أيامُه مع الحيّ في قراءة المالك المعلنة */
    await p.evaluate((ka) => KIVO.__BS_SRV.operations.read([ka]), KA);
    /* V7 · 53: الأرشيفُ مخزَّنٌ باليوم — الصفحةُ تطلب شهرَه حين تعرضه (القراءةُ المنطقية تجلب الشهرَ الجاري وحده) */
    await p.evaluate((old) => KIVO.__BS_SRV.operations.want('bassam_rounds_arc_v1', { groups: [old] }), OLD);
    await p.waitForFunction((old) => { try { const v = KIVO.__BS_SRV.operations.get('bassam_rounds_arc_v1'); return !!(v && v[old + '-01']); } catch (e) { return false; } }, OLD, { timeout: 60000 });
    const seen = await p.evaluate((old) => { const v = KIVO.bus.read('daily.days@1') || {}; return Object.keys(v).filter((k) => k.startsWith(old + '-')).length; }, OLD);
    assert.equal(seen, 10, 'daily.days@1 يرى الأيامَ المؤرشفة');
    /* حفظةٌ ثانية من الصفحة (اعتمادُ جولة ورديةٍ اليوم): لا ترسل الأيامَ المؤرشفة */
    const r2 = await p.evaluate(([y, m, d]) => KIVO.BassamRound.setShiftAp(y, m, d, 'TEST_ONLY_SHIFT', 1).then((x) => ({ status: x.status, err: x.err || '' })), [T.y, T.m, T.d]);
    assert.equal(r2.status, 'approved', JSON.stringify(r2));
    assert.equal(saves.length, 2);
    /* V7 · 53: الحفظةُ بالفترة — لا مفتاحَ ليومٍ مؤرشف (ولا الأرشيفُ نفسُه) فيها، ويومُ اليوم وحده من الجولات */
    const sent = Object.keys(saves[1].set);
    assert.ok(!sent.some((k) => k.startsWith(KR + '@' + OLD + '-') || k.startsWith(KA)), 'الأيامُ المؤرشفة لا تُرسل: ' + JSON.stringify(sent));
    assert.ok(sent.includes(KR + '@' + T.y + '-' + String(T.m).padStart(2, '0') + '-' + String(T.d).padStart(2, '0')), 'يومُ اليوم في الحفظة: ' + JSON.stringify(sent));
    const R2 = (await s.api('/api/operations/read?keys=' + encodeURIComponent(KR + ',' + KA))).j.resources;
    assert.deepEqual(R2[KA], R[KA], 'الأرشيفُ كما هو');
    assert.equal(R2[KR][T.y + '-' + String(T.m).padStart(2, '0') + '-' + String(T.d).padStart(2, '0')].shAp.TEST_ONLY_SHIFT.ap, 1);
    assert.deepEqual(s.errs, [], 'بلا أخطاء صفحة');
  } finally { await b.close(); await lab.close(); }
});
