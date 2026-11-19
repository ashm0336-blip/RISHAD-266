/* «لم يصل تأكيد الحفظ — بقيت المسودة» على الكانفس (بلاغ صاحب المنصة على Preview) — في متصفحٍ حقيقي على المختبر (TEST_ONLY) بكمونٍ مصطنع.
   السبب المؤكَّد: وضعُ الباب حفظٌ، و«حفظ البيانات» في نافذته حفظٌ ثانٍ؛ مع كمون الشبكة يصل الثاني والأول في الطريق فكان يُردّ
   review-required موسوماً «غير مؤكَّد» وتضيع كتابته (وعلى 572e803 قبل إصلاح 39 كذلك). وصدى حفظي في /api/changes كان يُسقط المفتاح ويعيد
   قراءته فيصطدم بالحفظ التالي. الإصلاح في خدمة الإيداع العامة (280): التالي ينتظر حسم السابق (بمهلة) · وصدى حفظي لا يُعاد قراءته.
   الكمون: lab.delay في tests/browser/local_server.mjs (يُطبَّق على الرد بعد أن يُنهي الخادم عمله). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-ack-'));
function png(name, w, h, rgb) {
  const crc = (b) => { let c, n, k, t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0).map((_, i) => rgb[i % 3])]), raw = Buffer.concat(Array.from({ length: h }, () => row));
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); return f;
}
const A = 'TEST_ONLY_A', KP = 'bsdept:' + A + ':bassam_plan_v1';
const REASON_DLG = 'هذا الإجراء يتطلب سبباً';

test('حفظان متتاليان على الكانفس مع كمون الشبكة: لا «لم يصل تأكيد الحفظ» ولا كتابة ضائعة — وضع الباب ثم حفظ بياناته، ثلاثاً في كل حالة', { timeout: 600000 }, async () => {
  const imgA = png('map_a.png', 640, 480, [200, 220, 240]), imgB = png('map_b.png', 800, 500, [240, 220, 200]), imgC = png('map_c.png', 700, 520, [210, 240, 210]);
  const lab = await startLab(), b = await chromium.launch();
  try {
    const plan = async (s) => { const r = await s.api('/api/operations/read?keys=' + encodeURIComponent(KP)); return (r.j && r.j.resources && r.j.resources[KP]) || null; };
    const floor0 = async (s) => { const P = await plan(s); const f = P && Array.isArray(P.floors) ? P.floors[0] : null; return f ? { iid: f.iid || null, w: f.imgW || 0, h: f.imgH || 0, name: f.name } : null; };
    const hook = (s) => { s.saves = []; s.page.on('response', async (r) => { if (r.request().method() === 'POST' && /\/api\/save\b/.test(r.url())) { let j = null; try { j = await r.json(); } catch (e) {} s.saves.push({ st: r.status(), ok: j && j.ok, denied: j && j.denied ? Object.values(j.denied).map((d) => d.why) : [], body: r.request().postData() || '' }); } }); };
    const bodyText = (s) => s.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    /* زرُّ الحفظ في نافذة الموقع: الزرُّ السابق لـ«إلغاء» في النافذة التي تحمل «اسم الموقع وخريطته المرجعية» */
    const siteSave = (s) => s.page.evaluate(() => { const p = [...document.querySelectorAll('p')].find((x) => x.textContent.trim() === 'اسم الموقع وخريطته المرجعية'); let c = p; while (c && ![...c.querySelectorAll('button')].some((x) => x.textContent.trim() === 'إلغاء')) c = c.parentElement; const cancel = [...c.querySelectorAll('button')].filter((x) => x.textContent.trim() === 'إلغاء').pop(); cancel.previousElementSibling.click(); });
    const pick = async (s, file, target) => { const [fc] = await Promise.all([s.page.waitForEvent('filechooser', { timeout: 15000 }), target.click()]); await fc.setFiles(file); await s.page.waitForTimeout(2500); };
    const openEdit = async (s) => { await s.page.locator('.bs-canvas-site-trigger').first().click(); await s.page.waitForTimeout(700); await s.page.locator('button[title="تعديل الموقع ورفع الخريطة"]').first().click(); await s.page.waitForTimeout(900); assert.match(await bodyText(s), /اسم الموقع وخريطته المرجعية/, 'نافذة تعديل الموقع مفتوحة'); };

    /* ── مدير المنصة ── */
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw); hook(su);
    await su.go('#/plan', 5000);
    await su.page.getByText('إضافة خطة لشهر', { exact: false }).last().click(); await su.page.waitForTimeout(1200);
    await su.page.getByText('بدء خطة فارغة بالكامل', { exact: false }).last().click(); await su.page.waitForTimeout(600);
    await su.page.getByText('إنشاء الخطة', { exact: true }).last().click(); await su.page.waitForTimeout(3500);
    await su.page.getByText('أضف أول موقع', { exact: true }).last().click(); await su.page.waitForTimeout(900);
    await su.page.locator('input[placeholder^="مثال"]').last().fill('TEST_ONLY موقع'); 
    await pick(su, imgA, su.page.getByText('اسحب صورة الخريطة هنا', { exact: false }).last());
    await siteSave(su); await su.page.waitForTimeout(4500);
    const f1 = await floor0(su); assert.ok(f1 && f1.iid, 'الموقع أُنشئ بصورته: ' + JSON.stringify(f1)); assert.equal(f1.w, 640);
    await su.page.waitForTimeout(2000);
    const FIXED = 'main [style*="position:fixed"], main [style*="position: fixed"]';
    su.live = []; su.page.on('console', (m) => { const t = m.text(); if (t.startsWith('[bs-live]')) su.live.push(t); });
    await su.page.evaluate(() => { window.__toasts = []; new MutationObserver(() => { const t = document.getElementById('bs-toast'); if (t && t.textContent && window.__toasts[window.__toasts.length - 1] !== t.textContent) window.__toasts.push(t.textContent); }).observe(document.body, { childList: true, subtree: true, characterData: true }); });
    const box = async () => su.page.evaluate(() => { const im = [...document.querySelectorAll('#bsPtPlan img, #bsPtPlan svg image, #bsPtPlan canvas')].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 300).sort((a, b) => b.width * b.height - a.width * a.height)[0]; return { x: im.x, y: im.y, w: im.width, h: im.height }; });
    const gate = async (fx, fy, num) => {
      const tool = su.page.locator('button[title^="وضع باب جديد"], button[data-tip^="وضع باب جديد"]').first();
      if (!(await tool.isVisible().catch(() => false))) { await su.page.locator('#bsPtPlan button', { hasText: /^الأبواب$/ }).first().click(); await su.page.waitForTimeout(300); }
      if (await tool.isVisible().catch(() => false)) { await tool.click(); await su.page.waitForTimeout(200); }
      const b0 = await box(); await su.page.mouse.click(b0.x + b0.w * fx, b0.y + b0.h * fy);
      await su.page.locator(FIXED.split(', ').map((q) => q + ' input').join(', ')).first().waitFor({ timeout: 15000 });
      await su.page.locator(FIXED.split(', ').map((q) => q + ' input').join(', ')).first().fill(String(num));
      await su.page.locator(FIXED.split(', ').map((q) => q + ' button').join(', ')).filter({ hasText: 'حفظ البيانات' }).first().click();
      await su.page.waitForFunction((F) => ![...document.querySelectorAll(F)].some((x) => x.offsetWidth > 300), FIXED, { timeout: 20000 }).catch(() => {});
    };
    await su.go('#/planning', 5000); await su.page.locator('.pt-tab.pt-plan').click(); await su.page.waitForTimeout(4000);
    const run = async (label, delay, n) => {
      lab.delay = delay; const t0 = (await su.page.evaluate(() => window.__toasts.length)), l0 = su.live.length;
      for (let i = 0; i < n; i++) await gate(0.2 + 0.1 * i, 0.3 + 0.05 * i, 10 + i);
      await su.page.waitForTimeout(5000); lab.delay = null;
      console.log('RUN ' + label + ' toasts=' + JSON.stringify((await su.page.evaluate(() => window.__toasts)).slice(t0)) + ' live=' + JSON.stringify(su.live.slice(l0)));
      await su.page.keyboard.press('Escape'); await su.page.waitForTimeout(3000);
    };
    const srv = async () => { const P = await plan(su); return ((P.floors[0] || {}).gates || []).map((g) => g.num || '∅'); };
    let base = 10;
    const row = async (label, delay, foreign) => {
      const before = (await srv()).length, t0 = await su.page.evaluate(() => window.__toasts.length), l0 = su.live.length, nums = [base, base + 1, base + 2]; base += 10;
      lab.delay = delay;
      let stop = false; const bg = foreign ? (async () => { while (!stop) { await foreign(); await new Promise((r) => setTimeout(r, 700)); } })() : null;
      for (let i = 0; i < 3; i++) await gate(0.15 + 0.07 * ((base / 10 + i) % 9), 0.2 + 0.06 * ((base / 10 + 2 * i) % 9), nums[i]);
      await su.page.waitForTimeout(6000); stop = true; if (bg) await bg; lab.delay = null;
      const all = await srv(), got = all.slice(before);
      const toasts = (await su.page.evaluate(() => window.__toasts)).slice(t0), numbered = got.filter((x) => nums.map(String).includes(String(x))).length, bad = su.live.slice(l0).filter((t) => /\] (uncertain|save-refused) /.test(t));
      assert.deepEqual(toasts.filter((t) => /لم يصل تأكيد الحفظ|لم يُحفظ/.test(t)), [], label + ': لا رسالة حفظٍ غير مؤكَّد أو مرفوض');
      assert.deepEqual([got.length, numbered], [3, 3], label + ': الأبواب الثلاثة وأرقامها ثبتت في الخادم — ' + JSON.stringify(got));
      assert.deepEqual(bad, [], label + ': السجل التشخيصي بلا uncertain ولا save-refused');
      await su.page.keyboard.press('Escape'); await su.page.waitForTimeout(4000);
    };
    const other = await openAs(b, lab, LAB.superUn, LAB.superPw);
    const plat = async () => { const r = await other.api('/api/get?keys=bassam_platform_v1'); const e = r.j.keys.bassam_platform_v1; const v = JSON.parse(e.v); v.TEST_ONLY_note = 'n' + Date.now(); await other.api('/api/save', { method: 'POST', body: JSON.stringify({ set: { bassam_platform_v1: JSON.stringify(v) }, del: [], base: { bassam_platform_v1: e.rev } }) }); };
    await row('كمون الحفظ 600', { '/api/save': 600 });
    await row('حفظ 500 · قراءة 700 · تغييرات 300', { '/api/save': 500, '/api/operations/read': 700, '/api/changes': 300 });
    await row('كمون الحفظ 600 + إشارة az من جهاز آخر', { '/api/save': 600 }, plat);
  } finally { await b.close(); await lab.close(); fs.rmSync(TMP, { recursive: true, force: true }); }
});
