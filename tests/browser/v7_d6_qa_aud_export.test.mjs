/* V7 · د6 (QA) البند ١١ — «تصدير CSV» في سجل الحركة: معطّلٌ حتى يكتمل التحميل، وفي الفراغ رسالةُ «لا أحداث في النطاق المحدد» (لا خروجَ صامت). مديرُ إدارة · TEST_ONLY */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

test('(١١) سجلُّ الحركة: «تصدير CSV» معطّلٌ أثناء التحميل · وفي الفراغ يقول «لا أحداث في النطاق المحدد»', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw);
    lab.delayBefore = { '/api/aud': 5000 };
    await m.page.evaluate(() => { location.hash = '#/admin/oplog'; });
    const btn0 = m.page.locator('button:has-text("تصدير CSV")').first();
    await btn0.waitFor({ state: 'attached', timeout: 4500 });
    assert.equal(await btn0.isDisabled(), true, 'معطّلٌ قبل اكتمال التحميل');
    const btn = m.page.locator('button:visible:has-text("تصدير CSV")').first();
    lab.delayBefore = null;
    await m.page.waitForFunction(() => { const x = Array.from(document.querySelectorAll('button')).find((e) => e.textContent.includes('تصدير CSV')); return x && !x.disabled; }, null, { timeout: 20000 });
    /* نطاقٌ بلا أحداث: بحثٌ لا يطابق شيئاً */
    const q = m.page.locator('input[type=search], input[placeholder*="بحث"], input[placeholder*="ابحث"]').first();
    await q.fill('TEST_ONLY_لا_يطابق_شيئا_qz'); await q.dispatchEvent('input');
    await m.page.waitForTimeout(2500);
    await m.page.waitForFunction(() => { const x = Array.from(document.querySelectorAll('button')).find((e) => e.textContent.includes('تصدير CSV')); return x && !x.disabled; }, null, { timeout: 20000 });
    const downloads = []; m.page.on('download', (d) => downloads.push(d));
    await btn.click(); await m.page.waitForTimeout(800);
    assert.ok(await m.page.evaluate(() => document.body.innerText.includes('لا أحداث في النطاق المحدد')), 'رسالةُ الفراغ ظاهرة');
    assert.equal(downloads.length, 0, 'لا ملفَّ فارغ');
    assert.deepEqual(m.errs, []);
  } finally { await b.close(); await lab.close(); }
});
