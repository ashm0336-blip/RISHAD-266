/* «لم يُحفظ التعديل — تغيّرت نسخة البيانات» بعد حفظ جهازٍ آخر (برومت 41-ج) — متصفحٌ حقيقي على المختبر (TEST_ONLY).
   ① نافذةُ الباب مفتوحة · الجهاز الثاني يحفظ باباً آخر · الأول يضغط «حفظ البيانات» ⇒ يُحفظ بلا رسالة والبابان باقيان (مسودةٌ قديمة ⇒ إعادةُ بناء).
   ② الجهاز الثاني يحفظ ولم يصل خبرُه بعد (كمونٌ على /api/changes) · الأول يحرّك بابه ⇒ الخادم يردّ تعارضاً ⇒ يُعاد البناء ويُحفظ التحريك، وبابُ الثاني باقٍ.
   ③ الجهاز الثاني عدّل البابَ نفسَه ثم الأول يحفظ بياناته ⇒ لا كتابةَ صامتة: رسالةٌ وتظهر نسخةُ الثاني. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-rebase-'));
function png(name, w, h, rgb) {
  const crc = (b) => { let c, n, k, t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0).map((_, i) => rgb[i % 3])]), raw = Buffer.concat(Array.from({ length: h }, () => row));
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); return f;
}
const A = 'TEST_ONLY_A', KP = 'bsdept:' + A + ':bassam_plan_v1';
const REASON_DLG = 'هذا الإجراء يتطلب سبباً';

test('حفظٌ من الجهاز الأول بعد أن حفظ الجهاز الثاني في الخطة: «حفظ البيانات» وتحريك الباب يُحفظان بلا رفض، وتعديلُ الجهاز الآخر يبقى', { timeout: 600000 }, async () => {
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

    const save = async () => { await b2.page.locator(FIXED.split(', ').map((q) => q + ' button').join(', ')).filter({ hasText: 'حفظ البيانات' }).first().click(); };
    const fill = (v) => b2.page.locator(FIXED.split(', ').map((q) => q + ' input').join(', ')).first().fill(String(v));
    const gate = async (uid) => (await gates()).find((x) => x.uid === uid);
    const wait = async (fn, why) => { for (let i = 0; i < 40; i++) { if (await fn()) return; await b2.page.waitForTimeout(500); } assert.fail(why + ' — ' + JSON.stringify(await gates()) + ' ' + JSON.stringify(b2.live.filter((x) => x.startsWith('[bs-live]')))); };
    const REFUSED = /لم يُحفظ|لم يصل|لم يُلغَ|عدّل مستخدم/;

    /* ── ① «حفظ البيانات» بعد حفظ الجهاز الثاني والنافذةُ مفتوحة ── */
    let m = await mark(), before = await uids();
    await place(b2, 0.3, 0.3); const mine = await placed(before);
    assert.equal((await foreign('add', 'TEST_ONLY_o1')).ok, 1);
    await b2.page.waitForTimeout(3000); await fill(7); await save();
    await wait(async () => { const g = await gate(mine); return g && String(g.num) === '7'; }, '① رقم بابي حُفظ');
    assert.deepEqual(await uids(), ['TEST_ONLY_o1', mine].sort(), '① البابان باقيان');
    let r = await since(m);
    assert.deepEqual(r.toasts.filter((t) => REFUSED.test(t)), [], '① بلا رسالة رفض: ' + JSON.stringify(r));
    /* برومت 43: الواردُ يُدمج لحظياً والنافذةُ مفتوحة فتتقدّم المسودة ويمرّ الحفظُ المعتاد؛ وإن سبق الحفظُ الدمجَ فبإعادة البناء (save-rebased) — النتيجةُ واحدة */
    assert.ok(!r.live.some((t) => /save-refused|uncertain|save-kept/.test(t)), '① السجل: ' + JSON.stringify(r.live));
    await b2.page.waitForFunction(() => { const t = document.querySelector('#bsPtPlan').innerText.replace(/\s+/g, ' '), i = t.lastIndexOf('سجل الأبواب'); return i >= 0 && /بابان/.test(t.slice(i, i + 70)); }, null, { timeout: 20000 });   /* الصفحة أخذت أحدث نسخة */

    /* ── ② تحريك بابي والجهاز الثاني حفظ للتوّ (خبرُه لم يصل: كمون على /api/changes) ── */
    await b2.page.keyboard.press('Escape'); await b2.page.waitForTimeout(3000);
    const g0 = await gate(mine);
    const spot = await b2.page.evaluate(() => { const im = [...document.querySelectorAll('#bsPtPlan img, #bsPtPlan svg image, #bsPtPlan canvas')].map((x) => x.getBoundingClientRect()).filter((q) => q.width > 300).sort((a, b) => b.width * b.height - a.width * a.height)[0]; return { x: im.x + im.width * 0.3, y: im.y + im.height * 0.3 }; });
    m = await mark(); lab.delay = { '/api/changes': 6000 };
    await b2.page.waitForTimeout(500);
    assert.equal((await foreign('add', 'TEST_ONLY_o2')).ok, 1);
    await b2.page.mouse.move(spot.x, spot.y); await b2.page.mouse.down(); await b2.page.mouse.move(spot.x + 30, spot.y + 20, { steps: 6 }); await b2.page.mouse.move(spot.x + 70, spot.y + 45, { steps: 6 }); await b2.page.mouse.up();
    await wait(async () => { const g = await gate(mine); return g && (g.x !== g0.x || g.y !== g0.y); }, '② تحريك بابي حُفظ');
    lab.delay = null;
    const g1 = await gate(mine);
    assert.equal(String(g1.num), '7', '② بيانات بابي باقية'); assert.deepEqual(await uids(), ['TEST_ONLY_o1', 'TEST_ONLY_o2', mine].sort(), '② بابُ الجهاز الثاني باقٍ');
    r = await since(m);
    assert.deepEqual(r.toasts.filter((t) => REFUSED.test(t)), [], '② بلا رسالة رفض: ' + JSON.stringify(r));
    assert.ok(r.live.some((t) => t.includes('save-rebased')), '② السجل: ' + JSON.stringify(r.live));

    /* ── ③ الجهاز الثاني عدّل البابَ نفسَه ثم الأول يحفظ بياناته ⇒ لا كتابةَ صامتة ── */
    await b2.page.waitForTimeout(4000); m = await mark(); before = await uids();
    await place(b2, 0.6, 0.6); const mineC = await placed(before);
    assert.equal((await foreign('edit', mineC)).ok, 1);
    await b2.page.waitForTimeout(3000); await fill(8); await save();
    await b2.page.waitForFunction(() => window.__toasts.some((t) => /عدّل مستخدمٌ آخر هذا العنصر في الوقت نفسه/.test(t)), null, { timeout: 20000 });
    r = await since(m);
    assert.ok(r.live.some((t) => t.includes('save-kept')), '③ السجل: ' + JSON.stringify(r.live));
    assert.equal(String((await gate(mineC)).num), '99', '③ نسخةُ الجهاز الثاني باقية في الخادم');
  } finally { await b.close(); await lab.close(); fs.rmSync(TMP, { recursive: true, force: true }); }
});
