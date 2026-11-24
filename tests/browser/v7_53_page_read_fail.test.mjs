/* V7 · 53 — S7 (ملحق 2): «صفحتي» تبقى على هيكل التحميل حين تفشل القراءة — متصفحٌ حقيقي على المختبر (TEST_ONLY)، سطحُ المكتب وiPhone 13.
   على Preview كانت كلُّ قراءةٍ تأخذ ثوانيَ ثم تفشل (500)، فيبقى الهيكلُ أربعَ محاولاتٍ كاملة (≈ دقيقة) بلا رسالة ولا زر. هنا تُفرض القراءةُ
   بطيئةً فاشلة (6 ث ثم 500 worker-error): بطاقةُ الفشل بالمكوّن الموجود (data-ps="error") وزرُّ «أعد المحاولة» تظهر في أقلّ من 20 ث،
   والزرُّ يعيد القراءة فتُرسم الصفحة حين يزول العطل. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

for (const [label, viewport] of [['desktop', { width: 1366, height: 900 }], ['iPhone 13', { width: 390, height: 844 }]]) {
  test('S7 · ' + label + ': a slow failing read shows the error state with «أعد المحاولة» within 20 s, and retry draws «صفحتي»', { timeout: 600000 }, async () => {
    const lab = await startLab(), b = await chromium.launch();
    try {
      const s = await openAs(b, lab, LAB.mgrA, LAB.pw, { viewport });
      let failing = true;
      await s.page.route('**/api/operations/read*', async (r) => { if (!failing) return r.continue(); await new Promise((x) => setTimeout(x, 6000)); return r.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":0,"err":"worker-error","rid":"TEST_ONLY"}' }).catch(() => {}); });
      await s.page.evaluate(() => { history.replaceState(null, '', location.pathname + '#/profile'); });
      await s.page.reload({ waitUntil: 'domcontentloaded' });
      const t0 = Date.now();
      await s.page.waitForSelector('[data-ps="error"] button', { timeout: 20000 });
      const took = Date.now() - t0;
      const card = await s.page.evaluate(() => document.querySelector('[data-ps="error"]').innerText.replace(/\s+/g, ' '));
      assert.match(card, /تعذّر تحميل صفحتك/); assert.match(card, /أعد المحاولة/);
      assert.ok(took < 20000, 'error state after ' + took + ' ms');
      failing = false;
      await s.page.locator('[data-ps="error"] button').first().click();
      await s.page.waitForFunction(() => !document.querySelector('[data-ps="error"]') && !document.querySelector('[data-ps="loading"]'), null, { timeout: 30000 });
      assert.deepEqual(s.errs, []);
    } finally { await b.close(); await lab.close(); }
  });
}
