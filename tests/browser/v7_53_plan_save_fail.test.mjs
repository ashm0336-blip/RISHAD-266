/* V7 · 53 — ملحق (4) البند 4 والملاحظة الثانية: حذفُ موقعٍ بصورته وحفظُه يرجع 500 `save-failed` — متصفحٌ حقيقي على المختبر (TEST_ONLY).
   كان: لا رسالة، والصفحةُ تبقى على «حُذف الموقع» حتى التحديث (فيعود الموقع). المطلوب:
     ① رسالةٌ واضحة بالفشل.   ② الصفحةُ تعرض المحفوظ فعلاً (الموقعُ باقٍ) والخادمُ لم يتغيّر.   ③ بعد إعادة التحميل تظهر خطةُ الشهر بموقعيها
     (لا «لا توجد خطة لشهر …»).   ④ الإجراءُ التالي يعمل: الحذفُ نفسُه بعد زوال العطل يُحفظ.
   الـ500 يُفرض على الطلب نفسِه في المتصفح (page.route) فلا يصل الخادم — كما في السجل الحيّ (لم يُكتب شيء). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-53-plan-'));
function png(name, w, h, rgb) {
  const crc = (b) => { let c, n, k, t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0).map((_, i) => rgb[i % 3])]), raw = Buffer.concat(Array.from({ length: h }, () => row));
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); return f;
}
const A = 'TEST_ONLY_A', KP = 'bsdept:' + A + ':bassam_plan_v1';
const S1 = 'TEST_ONLY موقع بصورة', S2 = 'TEST_ONLY موقع ثان';

test('حذفُ موقعٍ بصورته يرجع 500: رسالةٌ واضحة · الصفحةُ على المحفوظ · الخطةُ بشهرها بعد التحميل · والحذفُ يعمل بعد زوال العطل', { timeout: 600000 }, async () => {
  const img = png('map_1920.png', 1920, 1080, [200, 220, 240]);
  const lab = await startLab(), b = await chromium.launch();
  try {
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    const plan = async () => { const r = await su.api('/api/operations/read?keys=' + encodeURIComponent(KP)); return (r.j && r.j.resources && r.j.resources[KP]) || null; };
    const names = async () => ((await plan()) || {}).floors?.map((f) => f.name) || [];
    const bodyText = () => su.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const siteSave = () => su.page.evaluate(() => { const p = [...document.querySelectorAll('p')].find((x) => x.textContent.trim() === 'اسم الموقع وخريطته المرجعية'); let c = p; while (c && ![...c.querySelectorAll('button')].some((x) => x.textContent.trim() === 'إلغاء')) c = c.parentElement; const cancel = [...c.querySelectorAll('button')].filter((x) => x.textContent.trim() === 'إلغاء').pop(); cancel.previousElementSibling.click(); });
    const pick = async (file, target) => { const [fc] = await Promise.all([su.page.waitForEvent('filechooser', { timeout: 15000 }), target.click()]); await fc.setFiles(file); await su.page.waitForTimeout(2500); };
    const listed = () => su.page.evaluate(() => [...document.querySelectorAll('button[title="حذف الموقع"]')].length);
    await su.page.evaluate(() => { window.__msgs = []; new MutationObserver(() => { for (const id of ['bs-toast', 'bs-stoast']) { const t = document.getElementById(id); if (t && t.textContent && !window.__msgs.includes(t.textContent)) window.__msgs.push(t.textContent); } }).observe(document.body, { childList: true, subtree: true, characterData: true }); });

    await su.go('#/plan', 5000);
    await su.page.getByText('إضافة خطة لشهر', { exact: false }).last().click(); await su.page.waitForTimeout(1200);
    await su.page.getByText('بدء خطة فارغة بالكامل', { exact: false }).last().click(); await su.page.waitForTimeout(600);
    await su.page.getByText('إنشاء الخطة', { exact: true }).last().click(); await su.page.waitForTimeout(3500);
    await su.page.getByText('أضف أول موقع', { exact: true }).last().click(); await su.page.waitForTimeout(900);
    await su.page.locator('input[placeholder^="مثال"]').last().fill(S1);
    await pick(img, su.page.getByText('اسحب صورة الخريطة هنا', { exact: false }).last());
    await siteSave(); await su.page.waitForTimeout(4500);
    await su.page.locator('.bs-canvas-site-trigger').first().click(); await su.page.waitForTimeout(700);
    await su.page.getByText('إضافة موقع جديد', { exact: true }).first().click(); await su.page.waitForTimeout(900);
    await su.page.locator('input[placeholder^="مثال"]').last().fill(S2);
    await siteSave(); await su.page.waitForTimeout(4500);
    const P0 = await plan();
    assert.deepEqual(P0.floors.map((f) => f.name), [S1, S2], 'two sites stored');
    assert.ok(P0.floors[0].iid, 'the first site carries its stored image');

    /* ── the save is forced to 500 (nothing reaches the server) ── */
    let forced = 0;
    await su.page.route('**/api/save', (route) => { forced++; return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: 0, err: 'save-failed', rid: 'TEST_ONLY_rid' }) }); });
    await su.page.locator('.bs-canvas-site-trigger').first().click(); await su.page.waitForTimeout(700);
    assert.equal(await listed(), 2);
    await su.page.locator('button[title="حذف الموقع"]').first().click(); await su.page.waitForTimeout(600);
    await su.page.getByText('حذف نهائي', { exact: true }).last().click();
    let msgs = [];
    for (let i = 0; i < 60 && !msgs.some((m) => /تعذّر الحفظ/.test(m)); i++) { await su.page.waitForTimeout(500); msgs = await su.page.evaluate(() => window.__msgs); }
    assert.ok(msgs.some((m) => /تعذّر الحفظ/.test(m)), '① a clear failure message: ' + JSON.stringify(msgs));
    assert.ok(forced >= 2, 'the failed request was retried with the same request (' + forced + ')');
    assert.deepEqual(await names(), [S1, S2], 'the server did not change');
    await su.page.waitForTimeout(1500);
    await su.page.locator('.bs-canvas-site-trigger').first().click().catch(() => {}); await su.page.waitForTimeout(700);
    assert.equal(await listed(), 2, '② the page shows the stored state — the deleted site is back in place');
    assert.match(await bodyText(), new RegExp(S1), '② the site with its image is shown');

    /* ── ③ reload: the month plan shows ── */
    await su.page.unroute('**/api/save');
    await su.page.reload({ waitUntil: 'domcontentloaded' }); await su.page.waitForTimeout(6000);
    await su.go('#/plan', 5000);
    const after = await bodyText();
    assert.doesNotMatch(after, /لا توجد خطة لشهر/, '③ the month plan is shown after reload');
    await su.page.locator('.bs-canvas-site-trigger').first().click(); await su.page.waitForTimeout(700);
    assert.equal(await listed(), 2, '③ both sites after reload');

    /* ── ④ the same action works once the fault is gone ── */
    await su.page.locator('button[title="حذف الموقع"]').first().click(); await su.page.waitForTimeout(600);
    await su.page.getByText('حذف نهائي', { exact: true }).last().click();
    let done = false; for (let i = 0; i < 30 && !done; i++) { await su.page.waitForTimeout(500); done = JSON.stringify(await names()) === JSON.stringify([S2]); }
    assert.ok(done, '④ the delete is saved: ' + JSON.stringify(await names()));
    assert.deepEqual(su.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
