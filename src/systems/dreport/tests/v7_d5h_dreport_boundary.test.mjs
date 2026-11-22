/* V7 · د5-ح (rmall) — حدودُ «التقرير اليومي»: يعمل وحده وبغياب أيٍّ من شركائه (الجدول الشهري · التشغيل الميداني · المتابعة اليومية · … — من عقده).
   عاملٌ حقيقي ومتصفحٌ حقيقي على المختبر المعزول (مديرُ الإدارة أ · بيانات TEST_ONLY)، في الشجرة التي يُشغَّل فيها:
   الشجرةُ الكاملة، ونسخُ tools/removal_test.py التي غاب فيها شريك (staff · plan · daily · tasks · award · … · only:dreport — ⑤ حدود).
     ① صفحتُه تُفتح وتُرسم بلا خطأ صفحة: تبويبٌ تحت «المتابعة اليومية» بحضورها، وصفحةٌ عليا (#/dreport) بغيابها.
     ② قراءاتُه وأوامرُه من الشركاء على الناقل: حاضرةٌ بحضور مالكها فقط؛ وبغيابه القراءةُ undefined والأمرُ { ok:0, absent:1 }.
     ③ حفظُه يعمل بمنطق الصفحة نفسِه: نوعُ إجازةٍ جديد (bassam_leave_kinds_v1) يقبله الخادم؛
        وإنشاءُ تقرير اليوم: بحضور الجدول الشهري (تسكينُ الشهر) يُحفظ؛ وبغيابه (absent: «لا تسكينَ لأي شهر») يُبلغ «لا يوجد تسكين» ولا يُرسل شيء؛
        وبغياب المتابعة (absent: «تسكينُ موظفٍ على موقعٍ يُبلغ لا توجد جولة لهذا اليوم ولا يُحفظ شيء») كذلك.
        ولا يُكتب مفتاحٌ لشريكٍ غائب. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from '../../../../tests/browser/local_server.mjs';
import { chromium, openAs } from '../../../../tests/browser/lab_browser.mjs';
import { replaceOperationalFixture } from '../../../../tests/unit/operational_legacy_seed_fx.mjs';
import { partners, present, busFacts, assertBus, saves, savedCount, assertNoAbsentKeys, openRoute, today, logicOf, callLogic, watchToasts, waitToast } from '../../../../tests/removal/boundary_fx.mjs';

const SYS = 'dreport', P = partners(SYS), A = 'TEST_ONLY_A', KS = 'bsdept:' + A + ':bassam_staffing_v3', KD = 'bsdept:' + A + ':bassam_dreport_v1', KL = 'bsdept:' + A + ':bassam_leave_kinds_v1';
const H = today(), YM = H.y + '-' + H.m, SHIFT = 'TEST_ONLY_S', KIND = 'TEST_ONLY إجازة';
const absentOwners = P.owners.filter((o) => !present(o));

test('V7 · د5-ح (rmall): «التقرير اليومي» بغياب [' + (absentOwners.join(' · ') || 'لا شريك') + '] — صفحتُه · قراءاتُه من الغائب absent · حفظُه', { timeout: 600000 }, async () => {
  assert.ok(['staff', 'plan', 'daily'].every((o) => P.owners.includes(o)), 'شركاؤه من عقده: ' + P.owners.join(' · '));
  const lab = await startLab();
  if (present('staff')) await replaceOperationalFixture(lab.env, KS, { [YM]: { __shifts: [{ name: SHIFT, color: '#b99751', tStart: '07:00', tEnd: '15:00' }], TEST_ONLY_eA1: { shift: SHIFT } } });
  const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page; p.setDefaultTimeout(30000);
    const log = saves(p); await watchToasts(p);
    /* ① */
    await openRoute(s, present('daily') ? '#/daily/dreport' : '#/dreport');
    await logicOf(p, 'drAddLeaveKind');
    /* ② */
    assertBus(await busFacts(p, P.bus), SYS);
    /* ③ نوعُ إجازة */
    assert.equal(await callLogic(p, 'drAddLeaveKind', [KIND]), true, 'نوعُ الإجازة حُفظ بمنطق الصفحة');
    const s1 = await savedCount(p, log, 1);
    assert.ok(s1.status === 200 && s1.ok === 1 && s1.keys.includes('bassam_leave_kinds_v1'), JSON.stringify(log));
    assert.ok(((await s.api('/api/operations/read?keys=' + encodeURIComponent(KL))).j.resources[KL] || []).includes(KIND), 'الخادم يحمل النوعَ الجديد');
    /* إنشاءُ تقرير اليوم */
    if (present('staff')) {
      await p.waitForFunction(([ym, sh]) => { try { const v = KIVO.bus.read('staff.schedule@1'); return !!(v && v[ym] && v[ym].TEST_ONLY_eA1 && v[ym].TEST_ONLY_eA1.shift === sh); } catch (e) { return false; } }, [YM, SHIFT], { timeout: 60000, polling: 250 });
      await callLogic(p, 'rpCreate');
      const s2 = await savedCount(p, log, 2);
      assert.ok(s2.status === 200 && s2.ok === 1 && s2.keys.includes('bassam_dreport_v1'), 'تقريرُ اليوم حُفظ: ' + JSON.stringify(log));
      const D = (await s.api('/api/operations/read?keys=' + encodeURIComponent(KD))).j.resources[KD] || {};
      assert.ok(Object.values(D).some((x) => x && x.created === 1), 'الخادم يحمل تقريرَ اليوم: ' + JSON.stringify(D).slice(0, 300));
    } else {
      await callLogic(p, 'rpCreate');
      await waitToast(p, /لا يوجد تسكينٌ لهذا الشهر/);
      assert.equal(log.length, 1, 'بغياب الجدول الشهري: لا تقريرَ يُرسل: ' + JSON.stringify(log));
    }
    if (!present('daily')) {
      const n0 = log.length;
      await callLogic(p, 'drSetSpot', ['TEST_ONLY_eA1', '0:zones:0', 'TEST_ONLY موظف']);
      await waitToast(p, /لا توجد جولة لهذا اليوم/);
      assert.equal(log.length, n0, 'بغياب المتابعة: التسكينُ لا يُرسل شيئاً: ' + JSON.stringify(log));
    }
    for (const x of log) assertNoAbsentKeys(x, P, SYS);
    assert.deepEqual(s.errs, [], 'بلا أخطاء صفحة');
  } finally { await b.close(); await lab.close(); }
});
