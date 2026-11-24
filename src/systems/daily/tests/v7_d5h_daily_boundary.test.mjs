/* V7 · د5-ح (rmall) — حدودُ «المتابعة اليومية»: تعمل وحدها وبغياب أيٍّ من شركائها (الجدول الشهري · التشغيل الميداني · التقرير اليومي · … — من عقدها).
   عاملٌ حقيقي ومتصفحٌ حقيقي على المختبر المعزول (مديرُ الإدارة أ · بيانات TEST_ONLY)، في الشجرة التي يُشغَّل فيها:
   الشجرةُ الكاملة، ونسخُ tools/removal_test.py التي غاب فيها شريك (staff · plan · dreport · seized · irshad · only:daily — ⑤ حدود).
     ① صفحتُها (#/daily وتبويبُ الجولات، وتبويبا التقرير والمهام بحضور نظاميهما) تُفتح وتُرسم بلا خطأ صفحة؛ وبغياب التقرير لا تبويبَ له.
     ② قراءاتُها وأوامرُها من الشركاء على الناقل: حاضرةٌ بحضور مالكها فقط؛ وبغيابه القراءةُ undefined والأمرُ { ok:0, absent:1 }.
     ③ حفظُها يعمل بطريق الصفحة نفسِه (KIVO.BassamRound ← مسودة Operations ← /api/save):
        بحضور الخطة: جولةُ اليوم تُنشأ من خطة الشهر (created) ويقبلها الخادم بمواقعها؛
        بغيابها (absent: «لا خطةَ — اليومُ الأول في الشهر لا يُنشأ (noplan)») لا يُرسل شيء — ثم على جولةٍ قائمة يُعتمد شوطُ ورديةٍ ويقبله الخادم.
        ولا يُكتب مفتاحٌ لشريكٍ غائب. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from '../../../../tests/browser/local_server.mjs';
import { chromium, openAs } from '../../../../tests/browser/lab_browser.mjs';
import { replaceOperationalFixture } from '../../../../tests/unit/operational_legacy_seed_fx.mjs';
import { partners, present, busFacts, assertBus, saves, savedCount, assertNoAbsentKeys, openRoute, today } from '../../../../tests/removal/boundary_fx.mjs';

const SYS = 'daily', P = partners(SYS), A = 'TEST_ONLY_A', KP = 'bsdept:' + A + ':bassam_plan_v1', KR = 'bsdept:' + A + ':bassam_rounds_v1';
const H = today(), TODAY = H.dk, SHIFT = 'TEST_ONLY_SHIFT';
const site = () => ({ sid: 's_TEST_ONLY_1', name: 'TEST_ONLY موقع 1', num: 1, gates: [], marks: [], paths: [], sectors: [],
  zones: [{ uid: 'TEST_ONLY_z1', name: 'TEST_ONLY', code: '01', ser: '01', cat: 'men', d: 'M100 100 L400 100 L400 250 L100 250 Z', cx: 250, cy: 175 }] });
const absentOwners = P.owners.filter((o) => !present(o));
const tabOn = (p, label) => p.evaluate((t) => [...(document.querySelector('main') || document.body).querySelectorAll('span,b')].some((x) => x.textContent.trim() === t), label);

test('V7 · د5-ح (rmall): «المتابعة اليومية» بغياب [' + (absentOwners.join(' · ') || 'لا شريك') + '] — صفحتُها · قراءاتُها من الغائب absent · حفظُها', { timeout: 600000 }, async () => {
  assert.ok(['plan', 'staff', 'dreport'].every((o) => P.owners.includes(o)), 'شركاؤها من عقدها: ' + P.owners.join(' · '));
  const lab = await startLab();
  if (present('plan')) await replaceOperationalFixture(lab.env, KP, { pMig: 3, zones: [], gates: [], marks: [], paths: [], floors: [site()], months: { [H.ym]: { c: 1, d: [site()] } }, cfg: {}, delMonths: {} });
  const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page; p.setDefaultTimeout(30000);
    const log = saves(p);
    /* ① */
    await openRoute(s, '#/daily/rounds');
    await p.waitForFunction(() => !!(window.KIVO && KIVO.BassamRound && KIVO.BassamRound.ensure), null, { timeout: 60000 });
    assert.equal(await tabOn(p, 'التقرير اليومي'), present('dreport'), 'تبويبُ «التقرير اليومي» بحضوره فقط');
    if (present('dreport')) await openRoute(s, '#/daily/dreport');
    if (present('tasks')) await openRoute(s, '#/daily/tasks');
    await openRoute(s, '#/daily/rounds');
    /* ② */
    assertBus(await busFacts(p, P.bus), SYS);
    /* ③ */
    const ensure = () => p.evaluate(([y, m, d]) => KIVO.BassamRound.ensure(y, m, d).then((x) => ({ status: x.status, err: x.err || '' })), [H.y, H.m, H.d]);
    const r = await ensure();
    if (present('plan')) {
      assert.equal(r.status, 'created', 'بحضور الخطة: جولةُ اليوم أُنشئت من خطة الشهر: ' + JSON.stringify(r));
      const s1 = await savedCount(p, log, 1); assert.ok(s1.status === 200 && s1.ok === 1 && s1.keys.includes('bassam_rounds_v1'), JSON.stringify(log));
      const R = (await s.api('/api/operations/read?keys=' + encodeURIComponent(KR))).j.resources[KR];
      assert.equal(R[TODAY].d.length, 1, 'الجولةُ بموقع الخطة: ' + JSON.stringify(R[TODAY]));
    } else {
      assert.equal(r.status, 'noplan', 'بغياب الخطة: «noplan» كما في العقد: ' + JSON.stringify(r));
      assert.equal(log.length, 0, 'ولا يُرسل شيء: ' + JSON.stringify(log));
      /* جولةٌ قائمة (كما تكون في إدارةٍ أُطفئت خطتُها): تُقرأ بعد إعادة تحميل الصفحة */
      await replaceOperationalFixture(lab.env, KR, { [TODAY]: { d: [] } });
      await p.reload(); await p.waitForFunction(() => !document.querySelector('input[type=password]') && !!(window.KIVO && KIVO.BassamRound && KIVO.bus), null, { timeout: 60000 });
      await openRoute(s, '#/daily/rounds');
      await p.waitForFunction((t) => { try { const v = KIVO.bus.read('daily.days@1'); return !!(v && v[t]); } catch (e) { return false; } }, TODAY, { timeout: 60000, polling: 250 });
    }
    const n0 = log.length;
    const r2 = await p.evaluate(([y, m, d, sh]) => KIVO.BassamRound.setShiftAp(y, m, d, sh, 1).then((x) => ({ status: x.status, err: x.err || '' })), [H.y, H.m, H.d, SHIFT]);
    assert.equal(r2.status, 'approved', 'اعتمادُ شوط الوردية: ' + JSON.stringify(r2));
    const s2 = await savedCount(p, log, n0 + 1); assert.ok(s2.status === 200 && s2.ok === 1, JSON.stringify(log));
    const R2 = (await s.api('/api/operations/read?keys=' + encodeURIComponent(KR))).j.resources[KR];
    assert.equal(R2[TODAY].shAp[SHIFT].ap, 1, 'الخادم حفظ الاعتماد');
    for (const x of log) assertNoAbsentKeys(x, P, SYS);
    assert.deepEqual(s.errs, [], 'بلا أخطاء صفحة');
  } finally { await b.close(); await lab.close(); }
});
