/* تبويبات لوحة الكانفس بلا مسميات — متغيّر الامتلاء كان يحمل اسم متغيّر التلاشي المسجَّل بـ@property (inherits:false · 0px)
   فيأخذ الزرّ حجم خط صفراً. الاختبار في متصفح حقيقي على المختبر (TEST_ONLY): مدير المنصة ينشئ خطة وموقعاً بصورة، ثم:
     · تبويبات «عناصر الخريطة» (المصليات · المعالم · الأبواب) وتبويبات المؤشرات: حجم خط كل زر > 8px ونصّه ظاهر في مربّعه. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-tabs-'));
function png(name, w, h, rgb) {
  const crc = (b) => { let c, n, k, t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0).map((_, i) => rgb[i % 3])]), raw = Buffer.concat(Array.from({ length: h }, () => row));
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); return f;
}
const A = 'TEST_ONLY_A', KP = 'bsdept:' + A + ':bassam_plan_v1';
const REASON_DLG = 'هذا الإجراء يتطلب سبباً';

test('تبويبات لوحة الكانفس: عناصر الخريطة والمؤشرات — حجم خط كل زر أكبر من 8px ونصّه ظاهر', { timeout: 240000 }, async () => {
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
    const groups = await su.page.evaluate(() => [...document.querySelectorAll('.bs-subseg.bs-fill')].map((g) => ({
      vis: !!g.offsetParent,
      btns: [...g.querySelectorAll('.bs-subbtn')].map((x) => {
        const sp = x.querySelector('span') || x, r = sp.getBoundingClientRect(), cs = getComputedStyle(x);
        return { t: x.textContent.trim(), fs: parseFloat(cs.fontSize), w: r.width, h: r.height, shown: cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0 };
      }),
    })));
    const has = (names) => groups.find((g) => g.vis && names.every((n) => g.btns.some((x) => x.t === n)));
    const items = has(['المصليات', 'المعالم', 'الأبواب']), kpis = has(['مؤشرات المصليات', 'مؤشرات المسارات', 'مؤشرات التوزيع', 'مؤشرات الكثافة']);
    assert.ok(items, 'تبويبات «عناصر الخريطة» حاضرة: ' + JSON.stringify(groups));
    assert.ok(kpis, 'تبويبات المؤشرات حاضرة: ' + JSON.stringify(groups));
    for (const g of [items, kpis]) for (const x of g.btns) {
      assert.ok(x.fs > 8, 'حجم خط «' + x.t + '» أكبر من 8px: ' + x.fs);
      assert.ok(x.shown && x.w > 4 && x.h > 4, 'نصّ «' + x.t + '» ظاهر: ' + JSON.stringify(x));
    }
  } finally { await b.close(); await lab.close(); fs.rmSync(TMP, { recursive: true, force: true }); }
});
