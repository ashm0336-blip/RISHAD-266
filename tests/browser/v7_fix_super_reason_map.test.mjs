/* إصلاح «مدير المنصة لا يُطلب منه سببٌ أبداً» — استبدالُ صورة الكانفس (map.replace · audit.reason) في متصفحٍ حقيقي على المختبر (TEST_ONLY · وضع الإنفاذ):
     · مدير المنصة: ينشئ خطة الشهر وموقعاً بصورة، ثم يستبدل الصورة بلا سبب ⇒ يُحفظ (معرّفُ الصورة يتغيّر فعلاً) بلا نافذة سبب ولا رسالة «لم يُحفظ»
       ولا تنبيهِ رفضٍ في الجرس ولا صفِّ رفضٍ في سجل الأمن.
     · مدير الإدارة: يستبدل الصورة ⇒ تظهر نافذة السبب قبل الحفظ؛ «إلغاء» لا يحفظ شيئاً؛ وبالسبب يُحفظ والسببُ يصل الخادم (سجلّ القرار).
   الصورتان ملفّان PNG يُبنيان هنا ويُرفعان من نافذة اختيار الملف الحقيقية. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-reason-'));
function png(name, w, h, rgb) {
  const crc = (b) => { let c, n, k, t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0).map((_, i) => rgb[i % 3])]), raw = Buffer.concat(Array.from({ length: h }, () => row));
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); return f;
}
const A = 'TEST_ONLY_A', KP = 'bsdept:' + A + ':bassam_plan_v1';
const REASON_DLG = 'هذا الإجراء يتطلب سبباً';

test('إصلاح السبب · استبدال صورة الكانفس: مدير المنصة بلا سبب ينجح بلا رفض ولا تنبيه؛ مدير الإدارة تظهر له نافذة السبب ثم ينجح', { timeout: 420000 }, async () => {
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
    /* الاستبدال بلا سبب */
    const before = su.saves.length;
    await openEdit(su); await pick(su, imgB, su.page.locator('img[alt="خريطة الموقع"]').first());
    await siteSave(su); await su.page.waitForTimeout(4500);
    let t = await bodyText(su);
    assert.equal(t.includes(REASON_DLG), false, 'مدير المنصة: لا نافذة سبب');
    assert.equal(/لم يُحفظ التعديل/.test(t), false, 'مدير المنصة: لا رسالة «لم يُحفظ التعديل»');
    const f2 = await floor0(su); assert.ok(f2.iid && f2.iid !== f1.iid, 'معرّفُ صورة الخريطة تغيّر فعلاً: ' + JSON.stringify([f1, f2])); assert.equal(f2.w, 800); assert.equal(f2.h, 500);
    const sv = su.saves.slice(before); assert.ok(sv.length >= 1 && sv.every((x) => x.st === 200 && x.ok === 1), 'حفظُ الاستبدال قُبل: ' + JSON.stringify(sv.map((x) => [x.st, x.ok, x.denied])));
    assert.equal(sv.some((x) => /"why"\s*:/.test(x.body)), false, 'لم يُرسَل سبب');
    await lab.idle();
    const nf = await su.api('/api/notifications?all=1'); assert.ok(nf.j && Array.isArray(nf.j.items), 'جوابُ التنبيهات');
    assert.deepEqual((nf.j.items || []).filter((i) => i.type === 'sc_deny').map((i) => i.body), [], 'لا تنبيه رفضٍ في الجرس');
    const sec = lab.env.DB.db.prepare("SELECT act,detail FROM sec WHERE act='denied'").all(); assert.deepEqual(sec, [], 'لا صفَّ رفضٍ في سجل الأمن');
    const az = lab.env.DB.db.prepare("SELECT decision,why,reason,keys FROM authz WHERE keys LIKE '%map.replace%' ORDER BY ts DESC LIMIT 1").get();
    assert.ok(az, 'قرارُ map.replace مسجَّل'); assert.equal(az.decision, 'allow'); assert.equal(az.reason, 'بلا سبب (مدير المنصة)', 'السجل: «بلا سبب (مدير المنصة)»');
    assert.deepEqual(su.errs, [], 'مدير المنصة: لا أخطاء صفحة'); await su.ctx.close();

    /* ── مدير الإدارة ── */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); hook(m);
    await m.go('#/plan', 5500);
    await openEdit(m); await pick(m, imgC, m.page.locator('img[alt="خريطة الموقع"]').first());
    /* الإلغاء: لا حفظ */
    let n0 = m.saves.length; await siteSave(m); await m.page.waitForTimeout(1500);
    t = await bodyText(m); assert.ok(t.includes(REASON_DLG), 'مدير الإدارة: نافذة السبب ظهرت قبل الحفظ');
    await m.page.getByText('إلغاء التعديل', { exact: true }).last().click(); await m.page.waitForTimeout(1800);
    assert.equal(m.saves.length, n0, 'الإلغاء: لم يُرسَل حفظ'); assert.equal((await floor0(m)).iid, f2.iid, 'الإلغاء: الصورة كما هي');
    assert.match(await bodyText(m), /اسم الموقع وخريطته المرجعية/, 'الإلغاء: نافذة الموقع باقية');
    /* بالسبب */
    await siteSave(m); await m.page.waitForTimeout(1500);
    await m.page.locator('textarea[placeholder^="اكتب السبب"]').last().fill('TEST_ONLY خريطة محدَّثة');
    await m.page.getByText('حفظ بالسبب', { exact: true }).last().click(); await m.page.waitForTimeout(5000);
    t = await bodyText(m); assert.equal(/لم يُحفظ التعديل/.test(t), false, 'مدير الإدارة بالسبب: لا رسالة رفض');
    const f3 = await floor0(m); assert.ok(f3.iid && f3.iid !== f2.iid, 'مدير الإدارة بالسبب: الصورة استُبدلت: ' + JSON.stringify([f2, f3])); assert.equal(f3.w, 700);
    const mv = m.saves.slice(n0); assert.ok(mv.length >= 1 && mv.every((x) => x.st === 200 && x.ok === 1), 'حفظُ مدير الإدارة قُبل: ' + JSON.stringify(mv.map((x) => [x.st, x.ok, x.denied])));
    assert.ok(mv.some((x) => x.body.includes('TEST_ONLY خريطة محدَّثة')), 'السببُ أُرسل مع الحفظ');
    const az2 = lab.env.DB.db.prepare("SELECT decision,reason FROM authz WHERE keys LIKE '%map.replace%' ORDER BY ts DESC LIMIT 1").get();
    assert.equal(az2.decision, 'allow'); assert.equal(az2.reason, 'TEST_ONLY خريطة محدَّثة', 'السببُ في سجلّ القرار');
    assert.deepEqual(lab.env.DB.db.prepare("SELECT detail FROM sec WHERE act='denied'").all(), [], 'ولا رفضَ في سجل الأمن');
    assert.deepEqual(m.errs, [], 'مدير الإدارة: لا أخطاء صفحة'); await m.ctx.close();
  } finally { await b.close(); await lab.close(); fs.rmSync(TMP, { recursive: true, force: true }); }
});
