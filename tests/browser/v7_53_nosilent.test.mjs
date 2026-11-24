/* V7 · 53 (nosilent · REVIEW 26 — «لا شيء صامت»): متصفحٌ حقيقي على المختبر (TEST_ONLY) للسلوك المرئي من المرحلة 2.
   ① حفظٌ يطول (الطلبُ يُمسَك 1.6 ث في المتصفح): «يُحفظ…» في مؤشر الاتصال ثم «حُفظ» بعد الإقرار ثم يختفي — ولا «حُفظ» لحفظٍ رُفض.
   ② المغادرةُ أثناء عمليةٍ ظاهرة في المؤشر الموحّد تُسأل (نافذة beforeunload)، وبعد انتهائها لا تُسأل.
   ③ التوستُ الواحد بنبراته (نجاح · تنبيه · فشل).
   ④ ستارُ PDF في الخطة: «إلغاء» يوقف الصنع ولا يُنزَّل ملف، ويُقال ذلك؛ وتعذّرُ صنع الملف يُقال قبل نافذة الطباعة.
   لقطاتُ المراجع (فاتح وداكن) تُحفظ في NOSILENT_SHOTS إن ضُبط. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const SHOTS = process.env.NOSILENT_SHOTS || '';
async function shot(page, name, clip) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, name + '.png'), clip: clip || undefined });
}
const theme = (page, t) => page.evaluate((t) => { try { localStorage.setItem('bassam_theme', t); } catch (e) {} KIVO.__bsThemeSet(t); }, t);
const S1 = 'TEST_ONLY موقع المؤشر';

async function blankPlan(su) {
  await su.go('#/plan', 5000);
  await su.page.getByText('إضافة خطة لشهر', { exact: false }).last().click(); await su.page.waitForTimeout(1200);
  await su.page.getByText('بدء خطة فارغة بالكامل', { exact: false }).last().click(); await su.page.waitForTimeout(600);
  await su.page.getByText('إنشاء الخطة', { exact: true }).last().click(); await su.page.waitForTimeout(3500);
}
const siteSave = (su) => su.page.evaluate(() => { const p = [...document.querySelectorAll('p')].find((x) => x.textContent.trim() === 'اسم الموقع وخريطته المرجعية'); let c = p; while (c && ![...c.querySelectorAll('button')].some((x) => x.textContent.trim() === 'إلغاء')) c = c.parentElement; const cancel = [...c.querySelectorAll('button')].filter((x) => x.textContent.trim() === 'إلغاء').pop(); cancel.previousElementSibling.click(); });

test('nosilent ①–④: save indicator · leave guard · toast tones · PDF veil cancel and fallback', { timeout: 900000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    const P = su.page;
    await P.evaluate(() => { window.__lk = []; setInterval(() => { const l = document.querySelector('.bs-link'); const s = l ? l.getAttribute('data-st') : ''; if (window.__lk[window.__lk.length - 1] !== s) window.__lk.push(s); }, 30); });

    /* ── ① «يُحفظ…» ثم «حُفظ» ── */
    await blankPlan(su);
    let hold = 1600;
    await P.route('**/api/save', async (route) => { await new Promise((r) => setTimeout(r, hold)); return route.continue().catch(() => {}); });
    await P.getByText('أضف أول موقع', { exact: true }).last().click(); await P.waitForTimeout(900);
    await P.locator('input[placeholder^="مثال"]').last().fill(S1);
    await P.evaluate(() => { window.__lk = [document.querySelector('.bs-link')?.getAttribute('data-st') || '']; });
    await siteSave(su);
    await P.waitForSelector('.bs-link[data-st="saving"]', { timeout: 8000 });
    const savingText = await P.evaluate(() => { const l = document.querySelector('.bs-link'); return { text: l.querySelector('.l').textContent, shown: getComputedStyle(l).display !== 'none' }; });
    assert.deepEqual(savingText, { text: 'يُحفظ…', shown: true }, '«يُحفظ…» is on screen while the request waits');
    const box = await P.evaluate(() => { const r = document.querySelector('aside.bsb').getBoundingClientRect(); return { x: Math.max(0, r.x), y: 0, width: Math.min(r.width, 320), height: 260 }; });
    await shot(P, 'b1_saving_light', box);
    await P.waitForSelector('.bs-link[data-st="saved"]', { timeout: 15000 });
    assert.equal(await P.evaluate(() => document.querySelector('.bs-link .l').textContent), 'حُفظ');
    await shot(P, 'b1_saved_light', box);
    await P.waitForFunction(() => { const l = document.querySelector('.bs-link'); return l && getComputedStyle(l).display === 'none'; }, null, { timeout: 6000 });
    await P.waitForTimeout(200);   /* the 30 ms recorder catches the last state */
    const seq = await P.evaluate(() => window.__lk);
    assert.deepEqual(seq.filter((s, i) => s !== seq[i - 1]).slice(0, 4), ['on', 'saving', 'saved', 'on'], 'on → saving → saved → on');

    /* dark: the same states */
    await theme(P, 'dark');
    await P.unroute('**/api/save');
    await P.route('**/api/save', async (route) => { await new Promise((r) => setTimeout(r, hold)); return route.continue().catch(() => {}); });
    await P.evaluate(() => { const S = KIVO.__BS_SRV; window.__probe = S; });
    await P.locator('.bs-canvas-site-trigger').first().click(); await P.waitForTimeout(700);
    await P.getByText('إضافة موقع جديد', { exact: true }).first().click(); await P.waitForTimeout(900);
    await P.locator('input[placeholder^="مثال"]').last().fill(S1 + ' ٢');
    await siteSave(su);
    await P.waitForSelector('.bs-link[data-st="saving"]', { timeout: 8000 });
    await shot(P, 'b1_saving_dark', box);
    await P.waitForSelector('.bs-link[data-st="saved"]', { timeout: 15000 });
    await shot(P, 'b1_saved_dark', box);
    await P.waitForTimeout(2200);

    /* a refused save never says «حُفظ» */
    await P.unroute('**/api/save');
    await P.route('**/api/save', async (route) => { await new Promise((r) => setTimeout(r, 900)); return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: 0, err: 'save-failed' }) }).catch(() => {}); });
    await P.evaluate(() => { window.__lk = []; });
    await P.locator('.bs-canvas-site-trigger').first().click(); await P.waitForTimeout(700);
    await P.locator('button[title="حذف الموقع"]').last().click(); await P.waitForTimeout(600);
    const del = P.getByRole('button', { name: /حذف|نعم/ }).last(); if (await del.count()) await del.click();
    await P.waitForTimeout(6000);
    assert.equal((await P.evaluate(() => window.__lk)).includes('saved'), false, 'a failed save never shows «حُفظ»');
    await P.unroute('**/api/save');
    await theme(P, 'light');

    /* ── ③ التوستُ الواحد بنبراته ── */
    await P.evaluate(() => { KIVO.bsToast('TEST_ONLY حُفظ التقرير', { tone: 'ok', ms: 20000 }); KIVO.bsToast('TEST_ONLY حُفظ محلياً — بانتظار المزامنة', { tone: 'warn', ms: 20000 }); KIVO.bsToast('TEST_ONLY لم يُحفظ تعديلك — السبب', { tone: 'err', ms: 20000 }); });
    const tones = await P.evaluate(() => [...document.querySelectorAll('#bs-stoast > div')].map((d) => [d.getAttribute('data-tone'), d.textContent, getComputedStyle(d).color]));
    assert.deepEqual(tones.map((t) => t[0]), ['ok', 'warn', 'err']);
    assert.equal(new Set(tones.map((t) => t[2])).size, 3, 'three different tone colours');
    const tb = await P.evaluate(() => { const r = document.getElementById('bs-stoast').getBoundingClientRect(); return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.width + 16, height: r.height + 16 }; });
    await shot(P, 'b3_toasts_light', tb);
    await theme(P, 'dark'); await P.waitForTimeout(200);
    await shot(P, 'b3_toasts_dark', tb);
    await theme(P, 'light');

    /* ── ② المغادرةُ أثناء عمليةٍ ظاهرة تُسأل ── */
    await P.mouse.click(5, 5);   /* sticky user activation: Chrome shows beforeunload only after a gesture */
    await P.evaluate(() => { window.__tk = KIVO.BassamBusy.start('TEST_ONLY جارٍ تجهيز ملف…', { btn: null }); });
    let asked = null;
    P.once('dialog', async (d) => { asked = d.type(); await d.dismiss(); });
    await P.close({ runBeforeUnload: true });
    await new Promise((r) => setTimeout(r, 1500));
    assert.equal(asked, 'beforeunload', 'leaving while an operation runs asks first');
    assert.equal(P.isClosed(), false, 'dismissed: the page stays');
    await P.evaluate(() => window.__tk.done());
    await P.waitForTimeout(500);
    let asked2 = null; P.once('dialog', async (d) => { asked2 = d.type(); await d.dismiss(); });
    /* the page itself stays open for ④; a second probe page checks «no question when idle» */
    const P2 = await su.ctx.newPage(); await P2.goto(lab.base + '/', { waitUntil: 'domcontentloaded' }); await P2.waitForTimeout(3000); await P2.mouse.click(5, 5);
    let asked3 = null; P2.once('dialog', async (d) => { asked3 = d.type(); await d.accept(); });
    await P2.close({ runBeforeUnload: true }); await new Promise((r) => setTimeout(r, 1200));
    assert.equal(asked3, null, 'idle: no question');
    void asked2;

    /* ── ④ ستارُ PDF: «إلغاء» آمن ── */
    await P.route('**/*.jpg', async (route) => { await new Promise((r) => setTimeout(r, 3000)); return route.continue(); });
    let downloads = 0; P.on('download', () => { downloads++; });
    await P.evaluate(() => { window.__msgs = []; new MutationObserver(() => { const t = document.getElementById('bs-stoast'); if (t && !window.__msgs.includes(t.textContent)) window.__msgs.push(t.textContent); }).observe(document.body, { childList: true, subtree: true, characterData: true }); });
    await P.locator('button[title="طباعة الخريطة والمؤشرات — أو حفظها PDF"]').first().click();
    await P.waitForSelector('#bs-print-veil .bs-veil-stop', { timeout: 30000 });
    await shot(P, 'b4_veil_cancel_light');
    assert.equal(await P.evaluate(() => getComputedStyle(document.getElementById('bs-busy')).display), 'none', 'no second indicator over the veil');
    await P.locator('#bs-print-veil .bs-veil-stop').click();
    await P.waitForFunction(() => !document.getElementById('bs-print-veil'), null, { timeout: 60000 });
    await P.waitForTimeout(1500);
    assert.equal(downloads, 0, 'cancelled: no file');
    assert.ok((await P.evaluate(() => window.__msgs.join(' | '))).includes('أُلغي تجهيز ملف PDF — لم يُنزَّل شيء'), 'the cancel is said');
    await P.unroute('**/*.jpg');

    /* fallback: the browser refuses to read the canvas ⇒ the print dialog, announced */
    await P.evaluate(() => { const k = HTMLCanvasElement.prototype; k.__t = k.toDataURL; k.toDataURL = function () { const e = new Error('TEST_ONLY tainted'); e.name = 'SecurityError'; throw e; }; window.print = () => {}; });
    await P.reload({ waitUntil: 'domcontentloaded' }); await P.waitForTimeout(6000); await su.go('#/plan', 6000);
    await P.evaluate(() => { const k = HTMLCanvasElement.prototype; k.toDataURL = function () { const e = new Error('TEST_ONLY tainted'); e.name = 'SecurityError'; throw e; }; window.print = () => {}; });
    await P.evaluate(() => { window.__msgs = []; new MutationObserver(() => { const t = document.getElementById('bs-stoast'); if (t && !window.__msgs.includes(t.textContent)) window.__msgs.push(t.textContent); }).observe(document.body, { childList: true, subtree: true, characterData: true }); });
    await P.locator('button[title="طباعة الخريطة والمؤشرات — أو حفظها PDF"]').first().click();
    await P.waitForFunction(() => window.__msgs.join(' ').includes('تعذّر صنع ملف PDF في هذا المتصفح'), null, { timeout: 90000 });
    await shot(P, 'b4_fallback_light');
    assert.match(await P.evaluate(() => window.__msgs.join(' | ')), /تعذّر صنع ملف PDF في هذا المتصفح — فُتحت نافذة الطباعة بدلاً منه/);
    assert.deepEqual(su.errs.filter((e) => !/TEST_ONLY tainted/.test(e)), [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
