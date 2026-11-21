/* V7 · د5-ح (rmall) — حدودُ «التشغيل الميداني»: يعمل وحده وبغياب أيٍّ من شركائه (الجدول الشهري · المتابعة اليومية · التقرير اليومي — من عقده).
   عاملٌ حقيقي ومتصفحٌ حقيقي على المختبر المعزول (مديرُ الإدارة أ · بيانات TEST_ONLY)، في الشجرة التي يُشغَّل فيها:
   الشجرةُ الكاملة (الشركاءُ حاضرون)، ونسخُ tools/removal_test.py التي غاب فيها شريك (staff · daily · dreport · only:plan — ⑤ حدود).
     ① صفحتُه (#/plan) تُفتح وتُرسم بلا خطأ صفحة.
     ② قراءاتُه وأوامرُه من الشركاء على الناقل: حاضرةٌ بحضور مالكها فقط؛ وبغيابه القراءةُ undefined والأمرُ { ok:0, absent:1 } —
        وبه يُبنى سلوكُه المعلن في absent (contract.json).
     ③ حفظُه يعمل: «إضافة خطة لشهر» ثم موقعٌ بخريطته من الواجهة نفسِها — يقبلهما الخادم، ولا يُكتب مفتاحٌ لشريكٍ غائب؛
        وبحضور المتابعة اليومية يُكمَّل يومُ جولات اليوم بالموقع الجديد في الحفظ نفسِه (daily.sites.pad@1)،
        وبغيابها (absent: «الموقعُ الجديد يُضاف إلى الخطة وحدها») لا جولاتَ تُمسّ. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from '../../../../tests/browser/local_server.mjs';
import { chromium, openAs } from '../../../../tests/browser/lab_browser.mjs';
import { replaceOperationalFixture } from '../../../../tests/unit/operational_legacy_seed_fx.mjs';
import { partners, present, busFacts, assertBus, saves, savedCount, assertNoAbsentKeys, openRoute, today, png, watchToasts, toasts } from '../../../../tests/removal/boundary_fx.mjs';

const SYS = 'plan', P = partners(SYS), A = 'TEST_ONLY_A', KP = 'bsdept:' + A + ':bassam_plan_v1', KR = 'bsdept:' + A + ':bassam_rounds_v1';
const H = today(), TODAY = H.y + '-' + H.m + '-' + H.d;
const REFUSED = /لم يُحفظ|لم يصل|عدّل مستخدم|خارج الصلاحية|رُفض/;
const absentOwners = P.owners.filter((o) => !present(o));

test('V7 · د5-ح (rmall): «التشغيل الميداني» بغياب [' + (absentOwners.join(' · ') || 'لا شريك') + '] — صفحتُه · قراءاتُه من الغائب absent · حفظُه', { timeout: 600000 }, async () => {
  assert.ok(P.owners.includes('daily') && P.owners.includes('staff'), 'شركاؤه من عقده: ' + P.owners.join(' · '));
  const lab = await startLab();
  if (present('daily')) await replaceOperationalFixture(lab.env, KR, { [TODAY]: { d: [] } });   /* جولةُ اليوم بلا مواقع — يكمّلها حفظُ الموقع */
  const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page; p.setDefaultTimeout(30000);
    const log = saves(p); await watchToasts(p);
    /* ① */
    await openRoute(s, '#/plan');
    /* ② */
    assertBus(await busFacts(p, P.bus), SYS);
    /* ③ خطةُ الشهر من الواجهة */
    await p.getByText('إضافة خطة لشهر', { exact: false }).last().click();
    await p.getByText('بدء خطة فارغة بالكامل', { exact: false }).last().click();
    await p.getByText('إنشاء الخطة', { exact: true }).last().click();
    const s1 = await savedCount(p, log, 1);
    assert.ok(s1.status === 200 && s1.ok === 1 && s1.keys.includes('bassam_plan_v1'), 'خطةُ الشهر حُفظت: ' + JSON.stringify(log));
    assertNoAbsentKeys(s1, P, SYS);
    /* موقعٌ بخريطته */
    await p.getByText('أضف أول موقع', { exact: true }).last().click();
    await p.locator('input[placeholder^="مثال"]').last().fill('TEST_ONLY موقع');
    const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 15000 }), p.getByText('اسحب صورة الخريطة هنا', { exact: false }).last().click()]);
    await fc.setFiles(png('map_boundary.png', 320, 240, [200, 220, 240]));
    /* زرُّ الحفظ في نافذة الموقع: آخرُ زرٍّ قبل «إلغاء» — يُنتظر حتى تُقرأ الصورة فيُفعَّل */
    await p.waitForFunction(() => { const q = [...document.querySelectorAll('p')].find((x) => x.textContent.trim() === 'اسم الموقع وخريطته المرجعية'); let c = q; while (c && ![...c.querySelectorAll('button')].some((x) => x.textContent.trim() === 'إلغاء')) c = c.parentElement; if (!c) return false; const bs = [...c.querySelectorAll('button')], i = bs.findIndex((x) => x.textContent.trim() === 'إلغاء'), sv = bs[i + 1] || bs[i - 1]; return !!sv && !sv.disabled && (sv.click(), true); }, null, { timeout: 30000 });
    await p.waitForFunction(([kp]) => fetch('/api/operations/read?keys=' + encodeURIComponent(kp)).then((r) => r.json()).then((j) => { const f = j && j.resources && j.resources[kp] && j.resources[kp].floors; return Array.isArray(f) && f.length === 1 && !!f[0].iid; }), [KP], { timeout: 60000, polling: 500 });
    const last = log[log.length - 1];
    assert.ok(last.status === 200 && last.ok === 1, 'حفظُ الموقع قبله الخادم: ' + JSON.stringify(log));
    for (const x of log) assertNoAbsentKeys(x, P, SYS);
    assert.deepEqual((await toasts(p)).filter((t) => REFUSED.test(t)), [], 'بلا رسالة رفض');
    const R = (await s.api('/api/operations/read?keys=' + encodeURIComponent(KR))).j;
    if (present('daily')) {
      assert.equal(((R.resources[KR] || {})[TODAY] || {}).d.length, 1, 'بحضور المتابعة: جولةُ اليوم كُمّلت بالموقع (daily.sites.pad@1): ' + JSON.stringify(R.resources[KR]));
      assert.ok(log.some((x) => x.keys.includes('bassam_plan_v1') && x.keys.includes('bassam_rounds_v1')), 'في الحفظ نفسِه: ' + JSON.stringify(log));
    } else assert.ok(!log.some((x) => x.keys.includes('bassam_rounds_v1')), 'بغياب المتابعة: لا جولاتَ تُكتب');
    assert.deepEqual(s.errs, [], 'بلا أخطاء صفحة');
  } finally { await b.close(); await lab.close(); }
});
