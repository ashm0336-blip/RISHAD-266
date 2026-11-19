/* «إلغاء» الباب الجديد يُبقي الباب على الخريطة (برومت 41 · رُصد في «للمراجع 39» البند 6) — متصفحٌ حقيقي على المختبر (TEST_ONLY).
   وضعُ الباب حفظٌ أول؛ والنافذةُ مفتوحة يحفظ جهازٌ آخر في الخطة نفسِها؛ «إلغاء» كان يُرفض محلياً (مسودةُ الصفحة قديمة:
   operations-draft-review-required) فيبقى الباب في الخادم. الإصلاح: الحذفُ يُعاد بناؤه على أحدث نسخة (operations.patch).
     (أ) الجهاز الآخر أضاف عنصراً آخر ⇒ بابي يُحذف، وعنصرُه يبقى، بلا رسالة.   (ب) نفسُها مع كمونٍ مصطنع (lab.delay).
     (ج) الجهاز الآخر عدّل بابي نفسَه ⇒ لا حذفَ صامت: رسالةٌ واضحة والباب يبقى بتعديله.
   الجهاز الآخر يكتب بخدمة العميل الحقيقية في صفحته (operations.read ثم commit). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-cancel-'));
function png(name, w, h, rgb) {
  const crc = (b) => { let c, n, k, t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0).map((_, i) => rgb[i % 3])]), raw = Buffer.concat(Array.from({ length: h }, () => row));
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); return f;
}
const A = 'TEST_ONLY_A', KP = 'bsdept:' + A + ':bassam_plan_v1';
const REASON_DLG = 'هذا الإجراء يتطلب سبباً';

test('«إلغاء» الباب الجديد بعد أن حفظ جهازٌ آخر في الخطة: يُحذف بابي ويبقى تعديلُ غيري — وإن عدّل غيري بابي نفسَه لا يُحذف بصمت', { timeout: 600000 }, async () => {
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
    const b2 = await openAs(b, lab, LAB.superUn, LAB.superPw);
    b2.live = []; b2.page.on('console', (m) => { const t = m.text(); if (t.startsWith('[bs-live]')) b2.live.push(t); });
    b2.page.on('response', async (r) => { if (/\/api\/save\b/.test(r.url())) { let t = ''; try { t = await r.text(); } catch (e) {} b2.live.push('[net] save ' + r.status() + ' ' + t.slice(0, 160)); } });
    await b2.page.evaluate(() => { window.__toasts = []; new MutationObserver(() => { const t = document.getElementById('bs-toast'); if (t && t.textContent && window.__toasts[window.__toasts.length - 1] !== t.textContent) window.__toasts.push(t.textContent); }).observe(document.body, { childList: true, subtree: true, characterData: true }); });
    await b2.go('#/planning', 5000); await b2.page.locator('.pt-tab.pt-plan').click(); await b2.page.waitForTimeout(4000);
    const place = async (s, fx, fy) => {
      const tool = s.page.locator('button[title^="وضع باب جديد"], button[data-tip^="وضع باب جديد"]').first();
      if (!(await tool.isVisible().catch(() => false))) { await s.page.locator('#bsPtPlan button', { hasText: /^الأبواب$/ }).first().click(); await s.page.waitForTimeout(300); }
      if (await tool.isVisible().catch(() => false)) { await tool.click(); await s.page.waitForTimeout(200); }
      const b0 = await s.page.evaluate(() => { const im = [...document.querySelectorAll('#bsPtPlan img, #bsPtPlan svg image, #bsPtPlan canvas')].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 300).sort((a, b) => b.width * b.height - a.width * a.height)[0]; return { x: im.x, y: im.y, w: im.width, h: im.height }; });
      await s.page.mouse.click(b0.x + b0.w * fx, b0.y + b0.h * fy);
      await s.page.locator(FIXED.split(', ').map((q) => q + ' input').join(', ')).first().waitFor({ timeout: 15000 });
    };
    /* the other device writes through the real client service of its own page */
    const foreign = (kind, uid) => su.page.evaluate(async ([kind, uid]) => { const O = KIVO.__BS_SRV.operations, N = 'bassam_plan_v1', K = 'bsdept:' + O.context().dept + ':' + N; await O.read([K]); const doc = O.get(N); const lists = [doc.gates, doc.floors[0].gates].concat(Object.values(doc.months || {}).map((m) => m && m.d && m.d[0] && m.d[0].gates)).filter(Boolean); if (kind === 'add') lists.forEach((a) => a.push({ x: 50, y: 60, label: 'باب 9', emp: [], hideLabel: true, uid })); else lists.forEach((a) => a.forEach((g) => { if (g.uid === uid) g.num = '99'; })); const r = await O.commit({}, 'test:' + Math.random(), { t: Date.now() }, (d) => d.set(N, doc)); return { ok: r.ok, err: r.err }; }, [kind, uid]);
    const gates = async () => { const P = await plan(su); return ((P.floors[0] || {}).gates || []); };
    const uids = async () => (await gates()).map((x) => x.uid).sort();
    const cancel = async () => { await b2.page.locator(FIXED.split(', ').map((q) => q + ' button').join(', ')).filter({ hasText: /^إلغاء$/ }).first().click(); };
    const settle = async (want) => { for (let i = 0; i < 40; i++) { if (JSON.stringify(await uids()) === JSON.stringify(want.slice().sort())) return true; await b2.page.waitForTimeout(500); } return false; };
    const mark = async () => ({ t: await b2.page.evaluate(() => window.__toasts.length), l: b2.live.length });
    const since = async (m) => ({ toasts: (await b2.page.evaluate(() => window.__toasts)).slice(m.t), live: b2.live.slice(m.l).filter((x) => x.startsWith('[bs-live]')) });
    const register = () => b2.page.evaluate(() => { const t = document.querySelector('#bsPtPlan').innerText.replace(/\s+/g, ' '), i = t.lastIndexOf('سجل الأبواب'); return i < 0 ? '' : t.slice(i, i + 70); });
    const placed = async (before) => { for (let i = 0; i < 30; i++) { const now = (await gates()).map((x) => x.uid).filter((u) => !before.includes(u)); if (now.length === 1) return now[0]; await b2.page.waitForTimeout(400); } throw Error('the placed gate did not reach the server'); };

    /* ── (أ) جهازٌ آخر أضاف باباً آخر والنافذةُ مفتوحة، ثم «إلغاء» ── */
    let m = await mark(), before = await uids();
    await place(b2, 0.3, 0.3); const mineA = await placed(before);
    assert.equal((await foreign('add', 'TEST_ONLY_o1')).ok, 1);
    await b2.page.waitForTimeout(3000); await cancel();
    assert.ok(await settle(['TEST_ONLY_o1']), '(أ) بابي حُذف من الخادم وبابُ الجهاز الآخر باقٍ: ' + JSON.stringify(await uids()));
    let r = await since(m);
    assert.deepEqual(r.toasts.filter((t) => /لم يُحفظ|لم يصل|لم يُلغَ|عدّل مستخدم/.test(t)), [], '(أ) بلا رسالة رفض: ' + JSON.stringify(r));
    assert.ok(r.live.some((t) => t.includes('cancel-rebase')) && r.live.some((t) => t.includes('cancel-done')) && !r.live.some((t) => /save-refused|uncertain/.test(t)), '(أ) السجل: ' + JSON.stringify(r.live));
    assert.ok(!(await uids()).includes(mineA));
    await b2.page.waitForFunction(() => { const t = document.querySelector('#bsPtPlan').innerText.replace(/\s+/g, ' '), i = t.lastIndexOf('سجل الأبواب'); return i >= 0 && /باب واحد/.test(t.slice(i, i + 70)); }, null, { timeout: 20000 });   /* الصفحة أخذت أحدث نسخة: بابُ الجهاز الآخر وحده */

    /* ── (ب) نفسُها مع كمون الشبكة ── */
    lab.delay = { '/api/save': 600, '/api/operations/read': 500, '/api/changes': 300 };
    m = await mark(); before = await uids();
    await place(b2, 0.45, 0.4); const mineB = await placed(before);
    assert.equal((await foreign('add', 'TEST_ONLY_o2')).ok, 1);
    await b2.page.waitForTimeout(3500); await cancel();
    assert.ok(await settle(['TEST_ONLY_o1', 'TEST_ONLY_o2']), '(ب) مع الكمون: بابي حُذف وبابا الجهاز الآخر باقيان: ' + JSON.stringify(await uids()));
    r = await since(m); lab.delay = null;
    assert.deepEqual(r.toasts.filter((t) => /لم يُحفظ|لم يصل|لم يُلغَ|عدّل مستخدم/.test(t)), [], '(ب) بلا رسالة رفض: ' + JSON.stringify(r));
    assert.ok(!(await uids()).includes(mineB));
    await b2.page.waitForTimeout(3000);

    /* ── (ج) الجهازُ الآخر عدّل بابي نفسَه ⇒ لا حذفَ صامت ── */
    m = await mark(); before = await uids();
    await place(b2, 0.6, 0.5); const mineC = await placed(before);
    assert.equal((await foreign('edit', mineC)).ok, 1);
    await b2.page.waitForTimeout(3000); await cancel();
    await b2.page.waitForFunction(() => window.__toasts.some((t) => /عدّل مستخدمٌ آخر هذا العنصر/.test(t)), null, { timeout: 20000 });
    r = await since(m);
    assert.ok(r.live.some((t) => t.includes('cancel-kept')), '(ج) السجل: ' + JSON.stringify(r.live));
    const kept = (await gates()).find((x) => x.uid === mineC);
    assert.ok(kept && kept.num === '99', '(ج) الباب باقٍ في الخادم بتعديل الجهاز الآخر: ' + JSON.stringify(kept));
    assert.deepEqual(await uids(), ['TEST_ONLY_o1', 'TEST_ONLY_o2', mineC].sort());
    await b2.page.waitForFunction(() => { const t = document.querySelector('#bsPtPlan').innerText.replace(/\s+/g, ' '), i = t.lastIndexOf('سجل الأبواب'); return i >= 0 && /[3٣]/.test(t.slice(i, i + 70)); }, null, { timeout: 20000 }).catch(async () => { throw Error('(ج) الصفحة لم تعرض الأبواب الثلاثة: ' + (await register())); });
  } finally { await b.close(); await lab.close(); fs.rmSync(TMP, { recursive: true, force: true }); }
});
