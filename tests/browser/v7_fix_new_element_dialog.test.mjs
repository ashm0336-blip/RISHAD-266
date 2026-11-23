/* V7 · د6 (51ج): نافذةُ العنصر الجديد (مصلى · معلم · نطاق) لا تُعلن «مستخدماً آخر» بسبب حفظها الآليّ نفسِه — متصفحٌ حقيقي على المختبر (TEST_ONLY · مدير إدارة).
   الرسمُ يحفظ العنصرَ فوراً، والحفظُ يضيف إليه ما تحسبه الصفحة (cap · eid)، فيصل خبرُه والنافذةُ مفتوحة. كانت المقارنةُ بنسخة الحالة القديمة
   تعدّه «كاتباً آخر»: تحذيرٌ أثناء النافذة، ورفضُ «حفظ البيانات» («لم يُحفظ تعديلك»)، فيُخزَّن المصلى بحقول الرسم وحدها.
   الإصلاح: إيصالُ حفظ الصفحة نفسِها (_planOwn) أساسُ النافذة المفتوحة؛ ويبقى تعديلُ سياقٍ ثانٍ على العنصر نفسِه تعارضاً حقيقياً يُعلَن ولا يُحفظ فوقه بصمت. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-newdlg-'));
function png(name, w, h, rgb) {
  const crc = (b) => { let c, n, k, t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0).map((_, i) => rgb[i % 3])]), raw = Buffer.concat(Array.from({ length: h }, () => row));
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); return f;
}
const A = 'TEST_ONLY_A', KP = 'bsdept:' + A + ':bassam_plan_v1';
const CLASH = /عدّل مستخدم|لم يُحفظ/;

test('عنصرٌ جديد بنافذته (مصلى · معلم · نطاق) بحساب مدير الإدارة: «حفظ البيانات» يحفظ الحقول بلا رسالة تعارض — وتعديلُ سياقٍ ثانٍ على العنصر نفسِه يُعلَن ولا يُكتب فوقه', { timeout: 600000 }, async () => {
  const imgA = png('map_a.png', 640, 480, [200, 220, 240]);
  const lab = await startLab(), b = await chromium.launch();
  try {
    const plan = async (s) => { const r = await s.api('/api/operations/read?keys=' + encodeURIComponent(KP)); return (r.j && r.j.resources && r.j.resources[KP]) || null; };
    const floor0 = async (s) => ((await plan(s)) || { floors: [] }).floors[0] || {};
    const siteSave = (s) => s.page.evaluate(() => { const p = [...document.querySelectorAll('p')].find((x) => x.textContent.trim() === 'اسم الموقع وخريطته المرجعية'); let c = p; while (c && ![...c.querySelectorAll('button')].some((x) => x.textContent.trim() === 'إلغاء')) c = c.parentElement; const cancel = [...c.querySelectorAll('button')].filter((x) => x.textContent.trim() === 'إلغاء').pop(); cancel.previousElementSibling.click(); });
    const pick = async (s, file, target) => { const [fc] = await Promise.all([s.page.waitForEvent('filechooser', { timeout: 15000 }), target.click()]); await fc.setFiles(file); await s.page.waitForTimeout(2500); };
    /* ── مدير المنصة يُنشئ خطةَ الشهر وموقعاً بخريطة (التهيئة وحدها) ── */
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    await su.go('#/plan', 5000);
    await su.page.getByText('إضافة خطة لشهر', { exact: false }).last().click(); await su.page.waitForTimeout(1200);
    await su.page.getByText('بدء خطة فارغة بالكامل', { exact: false }).last().click(); await su.page.waitForTimeout(600);
    await su.page.getByText('إنشاء الخطة', { exact: true }).last().click(); await su.page.waitForTimeout(3500);
    await su.page.getByText('أضف أول موقع', { exact: true }).last().click(); await su.page.waitForTimeout(900);
    await su.page.locator('input[placeholder^="مثال"]').last().fill('TEST_ONLY موقع');
    await pick(su, imgA, su.page.getByText('اسحب صورة الخريطة هنا', { exact: false }).last());
    await siteSave(su); await su.page.waitForTimeout(4500);
    assert.ok((await floor0(su)).iid, 'الموقع أُنشئ بصورته');

    /* ── مدير الإدارة في التشغيل الميداني ── */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw);
    m.live = []; m.page.on('console', (x) => { const t = x.text(); if (t.startsWith('[bs-live]')) m.live.push(t); });
    await m.page.evaluate(() => { window.__toasts = []; new MutationObserver(() => { const t = document.getElementById('bs-toast'); if (t && t.textContent && window.__toasts[window.__toasts.length - 1] !== t.textContent) window.__toasts.push(t.textContent); }).observe(document.body, { childList: true, subtree: true, characterData: true }); });
    const toField = async () => { await m.go('#/planning', 5000); await m.page.locator('.pt-tab.pt-plan').click(); await m.page.waitForTimeout(4000); };
    await toField();
    const box = () => m.page.waitForFunction(() => { const im = [...document.querySelectorAll('#bsPtPlan img, #bsPtPlan svg image, #bsPtPlan canvas')].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 300).sort((a, b) => b.width * b.height - a.width * a.height)[0]; return im ? { x: im.x, y: im.y, w: im.width, h: im.height } : null; }, null, { timeout: 15000 }).then((h) => h.jsonValue());
    const mark0 = async () => ({ t: await m.page.evaluate(() => window.__toasts.length), l: m.live.length });
    const since = async (k) => ({ toasts: (await m.page.evaluate(() => window.__toasts)).slice(k.t), live: m.live.slice(k.l) });
    /* النافذةُ التي تحمل العنوان: أقربُ حاويةٍ فيها زرُّ الحفظ («حفظ البيانات»، وفي المعلم «حفظ») */
    const SAVE = (title) => (title.startsWith('معلم') ? 'حفظ' : 'حفظ البيانات');
    const dlg = (title) => m.page.locator('div').filter({ has: m.page.getByText(title, { exact: true }) }).filter({ has: m.page.getByRole('button', { name: SAVE(title), exact: true }) }).last();
    const save = async (title) => { await dlg(title).getByRole('button', { name: SAVE(title), exact: true }).first().click(); await m.page.waitForTimeout(300); };
    const until = async (fn, what) => { let v; for (let i = 0; i < 40; i++) { v = await fn(); if (v) return v; await m.page.waitForTimeout(500); } throw Error(what); };
    /* عدسةُ التصميم (أداةُ رسم المصلى في شريطها) — زرُّها يظهر خارج عدستها */
    const lensPlan = async () => { const L = m.page.locator('button[title^="عدسة التصميم"]').first(); if (await L.isVisible().catch(() => false)) { await L.click(); await m.page.waitForTimeout(600); } };
    const drawZone = async (fx, fy) => {
      await m.page.keyboard.press('Escape'); await m.page.waitForTimeout(300);
      await lensPlan();
      await m.page.locator('#bsPtPlan button[title*="والمثلث يفتح بقية الأشكال"]').first().click(); await m.page.waitForTimeout(300);
      await m.page.locator('button[title="رسم مصلى مستطيل"]').first().click(); await m.page.waitForTimeout(300);
      const b0 = await box();
      await m.page.mouse.move(b0.x + b0.w * fx, b0.y + b0.h * fy); await m.page.mouse.down();
      await m.page.mouse.move(b0.x + b0.w * (fx + 0.15), b0.y + b0.h * (fy + 0.15), { steps: 8 }); await m.page.mouse.up();
      await m.page.getByText('مصلى جديد', { exact: true }).first().waitFor({ timeout: 15000 });
    };
    const fillZone = async (ser, need) => {
      const d = dlg('مصلى جديد');
      await d.locator('#bsZeName').fill(ser);
      await d.locator('input[placeholder^="مثال: 6"]').fill(need);
      await d.getByRole('button', { name: 'أ', exact: true }).first().click();
      await m.page.waitForTimeout(300);
    };
    const zonesNow = async () => (await floor0(su)).zones || [];

    /* ── ① مصلى جديد: الاحتياج · الأولوية «أ» · الرقم التسلسلي ── */
    let k = await mark0();
    const z0 = (await zonesNow()).length;
    await drawZone(0.3, 0.3);
    await until(async () => (await zonesNow()).length === z0 + 1, 'الرسمُ لم يُحفظ آلياً');
    await m.page.waitForTimeout(3500);   /* خبرُ الحفظ الآلي يصل والنافذةُ مفتوحة */
    await fillZone('07', '6');
    await save('مصلى جديد');
    const zA = await until(async () => (await zonesNow()).find((z) => z.ser === '07' && z.pri === 'أ' && z.needN === 6), '① المصلى لم يُحفظ بحقول نافذته: ' + JSON.stringify(await zonesNow()) + ' ' + JSON.stringify(await since(k)));
    let r = await since(k);
    assert.deepEqual(r.toasts.filter((t) => CLASH.test(t)), [], '① بلا رسالة تعارض: ' + JSON.stringify(r));
    assert.ok(!r.live.some((t) => /element-clash|save-kept|save-refused/.test(t)), '① السجل: ' + JSON.stringify(r.live));
    /* بعد إعادة التحميل: الحقول في مكانها */
    await m.page.reload({ waitUntil: 'domcontentloaded' }); await m.page.waitForTimeout(3000);
    await m.page.evaluate(() => { window.__toasts = []; new MutationObserver(() => { const t = document.getElementById('bs-toast'); if (t && t.textContent && window.__toasts[window.__toasts.length - 1] !== t.textContent) window.__toasts.push(t.textContent); }).observe(document.body, { childList: true, subtree: true, characterData: true }); });
    const mp = await plan(m), zR = ((mp.floors[0] || {}).zones || []).find((z) => z.uid === zA.uid);
    assert.ok(zR && zR.pri === 'أ' && zR.needN === 6 && zR.ser === '07', '① بعد إعادة التحميل: ' + JSON.stringify(zR));
    await toField();

    /* ── ② معلم جديد: الاسم · الأولوية · الاحتياج ── */
    k = await mark0();
    await m.page.locator('#bsPtPlan button[title^="عدسة المعالم"], #bsPtPlan button[data-tip^="عدسة المعالم"]').first().click(); await m.page.waitForTimeout(600);
    await m.page.locator('button[title^="وضع معلم جديد"]').first().click(); await m.page.waitForTimeout(300);
    let b0 = await box(); await m.page.mouse.click(b0.x + b0.w * 0.7, b0.y + b0.h * 0.7);
    const MT = 'معلم جديد — «إلغاء» يلغي وضعه';
    await m.page.getByText(MT, { exact: true }).first().waitFor({ timeout: 15000 });
    await until(async () => ((await floor0(su)).marks || []).length === 1, 'المعلم لم يُحفظ آلياً');
    await m.page.waitForTimeout(3500);
    await dlg(MT).locator('input[placeholder^="مثال: دورات"]').fill('TEST_ONLY معلم');
    await dlg(MT).locator('input[placeholder^="مثال: 2"]').fill('4');
    await dlg(MT).getByRole('button', { name: 'أ', exact: true }).first().click(); await m.page.waitForTimeout(300);
    await save(MT);
    await until(async () => ((await floor0(su)).marks || []).find((x) => x.label === 'TEST_ONLY معلم' && x.pri === 'أ' && x.needN === 4), '② المعلم لم يُحفظ بحقوله: ' + JSON.stringify((await floor0(su)).marks) + ' ' + JSON.stringify(await since(k)));
    r = await since(k);
    assert.deepEqual(r.toasts.filter((t) => CLASH.test(t)), [], '② بلا رسالة تعارض: ' + JSON.stringify(r));
    assert.ok(!r.live.some((t) => /element-clash|save-kept|save-refused/.test(t)), '② السجل: ' + JSON.stringify(r.live));
    await m.page.keyboard.press('Escape'); await m.page.waitForTimeout(400);

    /* ── ③ نطاق جديد: الرمز والاسم ── */
    k = await mark0();
    await lensPlan();
    await m.page.locator('button[title^="رسم نطاق"]').first().click(); await m.page.waitForTimeout(300);
    b0 = await box();
    for (const [x, y] of [[0.55, 0.1], [0.95, 0.1], [0.95, 0.4], [0.55, 0.1]]) { await m.page.mouse.click(b0.x + b0.w * x, b0.y + b0.h * y); await m.page.waitForTimeout(300); }
    await m.page.getByText('نطاق جديد', { exact: true }).first().waitFor({ timeout: 15000 });
    await until(async () => ((await floor0(su)).sectors || []).length === 1, 'النطاق لم يُحفظ آلياً');
    await m.page.waitForTimeout(3500);
    await dlg('نطاق جديد').locator('#bsSeCode').fill('T9');
    await dlg('نطاق جديد').locator('input').nth(1).fill('TEST_ONLY نطاق');
    await save('نطاق جديد');
    await until(async () => ((await floor0(su)).sectors || []).find((x) => x.code === 'T9' && x.name === 'TEST_ONLY نطاق'), '③ النطاق لم يُحفظ بحقوله: ' + JSON.stringify((await floor0(su)).sectors) + ' ' + JSON.stringify(await since(k)));
    r = await since(k);
    assert.deepEqual(r.toasts.filter((t) => CLASH.test(t)), [], '③ بلا رسالة تعارض: ' + JSON.stringify(r));
    assert.ok(!r.live.some((t) => /element-clash|save-kept|save-refused/.test(t)), '③ السجل: ' + JSON.stringify(r.live));
    await m.page.keyboard.press('Escape'); await m.page.waitForTimeout(400);

    /* ── ④ الحالة السلبية: سياقٌ ثانٍ يعدّل المصلى الجديد نفسَه والنافذةُ مفتوحة ⇒ التحذيرُ الحقيقي، ولا يُكتب فوق نسخته بصمت ── */
    await toField();
    k = await mark0();
    const before = (await zonesNow()).map((z) => z.uid);
    await drawZone(0.1, 0.6);
    const uidN = await until(async () => { const n = (await zonesNow()).find((z) => !before.includes(z.uid)); return n && n.uid; }, '④ الرسمُ لم يُحفظ آلياً');
    await m.page.waitForTimeout(3500);
    const foreign = await su.page.evaluate(async (uid) => { const O = KIVO.__BS_SRV.operations, N = 'bassam_plan_v1', K = 'bsdept:' + O.context().dept + ':' + N; let rd = null; for (let i = 0; i < 20 && (!rd || rd.err === 'stale'); i++) rd = await O.read([K]); if (!rd || rd.ok !== 1) return { ok: 0, err: 'read:' + (rd && rd.err) }; const doc = O.get(N); const lists = [doc.zones, doc.floors[0].zones].concat(Object.values(doc.months || {}).map((x) => x && x.d && x.d[0] && x.d[0].zones)).filter(Boolean); lists.forEach((a) => a.forEach((z) => { if (z.uid === uid) z.ser = '55'; })); const res = await O.commit({}, 'test:' + Math.random(), { t: Date.now() }, (d) => d.set(N, doc)); return { ok: res.ok, err: res.err }; }, uidN);
    assert.equal(foreign.ok, 1, '④ السياقُ الثاني حفظ: ' + JSON.stringify(foreign));
    await m.page.waitForFunction(() => window.__toasts.some((t) => /عدّل مستخدمٌ آخر العنصرَ المفتوح/.test(t)), null, { timeout: 20000 }).catch(async () => { throw Error('④ لم يظهر التحذيرُ الحقيقي: ' + JSON.stringify(await since(k))); });
    await fillZone('08', '3');
    await save('مصلى جديد');
    await m.page.waitForFunction(() => window.__toasts.some((t) => /عدّل مستخدمٌ آخر هذا العنصر في الوقت نفسه/.test(t)), null, { timeout: 20000 }).catch(async () => { throw Error('④ لم يُرفض الحفظ فوق نسخة غيري: ' + JSON.stringify(await since(k))); });
    await m.page.waitForTimeout(2500);
    const kept = (await zonesNow()).find((z) => z.uid === uidN);
    assert.ok(kept && kept.ser === '55' && kept.needN == null, '④ نسخةُ السياق الثاني باقية بلا كتابةٍ صامتة فوقها: ' + JSON.stringify(kept));
  } finally { await b.close(); await lab.close(); fs.rmSync(TMP, { recursive: true, force: true }); }
});
