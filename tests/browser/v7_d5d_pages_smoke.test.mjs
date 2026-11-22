/* V7 · د5-د — فحصُ متصفحٍ للصفحات التي تغيّرت بايتاتُها (توحيد التقويم مسّ كلَّ صفحةٍ تعرض تاريخاً · نقلُ الجدول · تبويبُ الحاوية · الناقل).
   على المختبر المحلي (TEST_ONLY): مديرُ المنصة يفتح كلَّ صفحة ⇒ لا خطأَ صفحة (pageerror) ولا TypeError في السجل، والصفحةُ مرسومة لا هيكلَ تحميل؛
   وخدمةُ التقويم الواحدة وروابطُ الجدول على الناقل حاضرة، وتبويبُ الجدول في الحاوية مرسومٌ من قطعته. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const ROUTES = ['#/planning', '#/staffing', '#/plan', '#/daily', '#/dreport', '#/employees', '#/admin', '#/profile', '#/kpis', '#/tasks', '#/irshad', '#/seized', '#/award', '#/dstats'];

test('كلُّ صفحةٍ تغيّرت بايتاتُها تُفتح بلا خطأ، والتقويمُ الموحّد وروابطُ الجدول على الناقل حاضرة، وتبويبُ الجدول مرسومٌ في الحاوية', { timeout: 600000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw), errors = [];
    s.page.on('pageerror', (e) => errors.push('pageerror: ' + String(e && e.message)));
    s.page.on('console', (m) => { if (m.type() === 'error' && /TypeError|ReferenceError|is not a function|Cannot read|bus-/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
    const seen = {};
    for (const r of ROUTES) {
      await s.go(r, 3500);
      seen[r] = await s.page.evaluate(() => { const m = document.querySelector('main'); return { text: m ? m.innerText.replace(/\s+/g, ' ').length : 0, skeleton: !!document.querySelector('main [data-bs-skeleton], main .bs-skel-page') }; });
      assert.ok(seen[r].text > 40, r + ': الصفحة مرسومة (' + JSON.stringify(seen[r]) + ')');
    }
    assert.deepEqual(errors, [], 'أخطاء صفحة:\n' + errors.join('\n'));
    /* التقويمُ الواحد والناقل */
    const facts = await s.page.evaluate(() => {
      const C = window.KIVO.BassamCal, B = window.KIVO.bus, t = C.hToday(), g = C.hGreg(t.y, t.m, t.d), back = C.hParts(g);
      return { today: t, roundTrip: back.y === t.y && back.m === t.m && back.d === t.d, label: C.hGregMonthLabel(t.y, t.m), range: C.hGregYearRange(t.y),
        names: ['staff.dayFacts@1', 'staff.availText@1', 'staff.permLimit@1', 'staff.shiftUsage@1', 'staff.callsign.set@1', 'shifts.renamed@1'].map((n) => [n, B.has(n)]),
        usage: B.read('staff.shiftUsage@1', 'TEST_ONLY لا وردية'), limit: B.read('staff.permLimit@1') };
    });
    assert.equal(facts.roundTrip, true, JSON.stringify(facts.today)); assert.ok(facts.label && facts.range, 'تسميات التقويم');
    for (const [n, has] of facts.names) assert.equal(has, true, n);
    assert.deepEqual({ records: facts.usage.records, months: facts.usage.months }, { records: 0, months: 0 });
    assert.ok(facts.limit === undefined || (Number.isInteger(facts.limit) && facts.limit >= 0 && facts.limit <= 31), 'الحدّ: محفوظٌ أو غير محفوظ');
    /* تبويبُ الجدول في الحاوية من قطعته */
    await s.go('#/planning', 4000);
    assert.equal(await s.page.locator('.pt-tab.pt-sched').count(), 1, 'زرُّ تبويب الجدول'); assert.equal(await s.page.locator('#bsPtSched').count(), 1, 'محتوى تبويب الجدول');
    assert.match(await s.page.locator('.pt-tab.pt-sched').innerText(), /الجدول الشهري/);
    assert.deepEqual(errors, []);
  } finally { await b.close(); await lab.close(); }
});
