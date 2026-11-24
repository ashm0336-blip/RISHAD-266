/* V7 · د7 (ج ١٥ — تصديرُ الملفات · CSV): «الإعدادات ← سجل الحركة» ← «تصدير CSV» في متصفحٍ حقيقي على المختبر المعزول (العاملُ الحقيقي · الإنفاذ · TEST_ONLY).
   مديرُ الإدارة: بعد حدثٍ حقيقي في إدارته (دورٌ يحفظه مديرُ المنصة) يُنزَّل ‎.csv‎ (BOM + العناوين + صفٌّ على الأقل).
   موظفٌ بدور (المهام «كامل» — لا ورقةَ للإعدادات في محرّر الأدوار): «سجل الحركة» غيرُ متاح له، والخادمُ يرفض /api/aud — لا ملفّ.
   (تصديرُ Excel وPDF في صفحاته: المضبوطات ③ · المهام ③ · الجدول الشهري ③ — كلٌّ في نظامه) */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, grant, LAB, openAs, launchUtf8, downloaded, fileOk, until, mainText } from './d7_cov_lib.mjs';

test('CSV: مديرُ الإدارة يصدّر «سجل الحركة» ملفَّ ‎.csv‎ غيرَ فارغ — والموظفُ بدورٍ لا يصل إلى السجل ولا يُصدَّر له شيء', { timeout: 300000 }, async () => {
  const lab = await world(), b = await launchUtf8();
  try {
    await grant(b, lab, { tasks: 'full' });   /* حدثٌ في سجل الإدارة أ */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw, { context: { acceptDownloads: true } }), p = m.page;
    await m.go('#/admin/oplog', 3000);
    await p.waitForFunction(() => { const x = [...document.querySelectorAll('main button')].find((e) => e.textContent.includes('تصدير CSV') && e.getBoundingClientRect().width > 0); return x && !x.disabled; }, null, { timeout: 30000 });
    const f = await downloaded(p, () => p.locator('main button:visible', { hasText: 'تصدير CSV' }).first().click());
    assert.deepEqual(fileOk(f, 'csv'), [], f.name + ' · ' + f.bytes.length + ' بايت');
    assert.deepEqual(m.errs, []); await m.ctx.close();
    const e = await openAs(b, lab, LAB.empA, LAB.pw), q = e.page, dls = []; q.on('download', (d) => dls.push(d));
    await e.go('#/admin/oplog', 4000);
    assert.equal(await q.locator('main button:visible', { hasText: 'تصدير CSV' }).count(), 0, 'لا «تصدير CSV» للموظف');
    await until(async () => !/^#\/admin/.test(await q.evaluate(() => location.hash)) || /غير متاحة لك|لا تملك/.test(await mainText(q)), 'تحويلُ الموظف أو رسالةُ عدم الإتاحة');
    const r = await e.api('/api/aud?dept=TEST_ONLY_A');
    assert.ok(r.status === 403 || r.status === 401, 'الخادمُ يرفض السجلَّ للموظف: ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 200));
    assert.equal(dls.length, 0, 'لا ملفّ');
    await e.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
