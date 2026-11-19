/* الصفحة تُهدم وتُبنى فجأة أثناء العمل (التحديث التلقائي) — في متصفحٍ حقيقي على المختبر (TEST_ONLY · وضع الإنفاذ).
   السبب المؤكَّد: إشارة az في /api/changes (أي تغيير في الحسابات/الهيكل/المنصة من أي مستخدم) كانت تُسقط كل قراءات العمليات،
   فيستبدل المحرّك شجرة الصفحة بهيكل التحميل ثم يعيد بناءها. الإصلاح في الآلية العامة: صفحةٌ رُسمت لا تعود للهيكل.
     ① الخطة · نافذة «باب جديد» مفتوحة وفيها نصّ، ثم من سياقٍ آخر: دخول مستخدم · حفظ إعداد منصة · تعديل حساب · إنهاء جلسة ·
        حفظ باب في الإدارة نفسها ⇒ جذر الصفحة هو العنصر نفسه، لا هيكل تحميل، النافذة ونصّها باقيان، وبعد إغلاقها يظهر الباب الجديد.
     ② تغييرٌ حقيقي في صلاحيات مدير الإدارة يُطبَّق (وصف صلاحياته يتغيّر) وصفحته لا تُفكّ.
     ③ الآلية العامة على صفحتين أخريين (الجدول الشهري · الموظفون): إسقاطُ كل القراءات قسراً ⇒ لا هيكل، والجذر نفسه، ثم تعود البيانات. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-live-'));
function png(name, w, h, rgb) {
  const crc = (b) => { let c, n, k, t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0).map((_, i) => rgb[i % 3])]), raw = Buffer.concat(Array.from({ length: h }, () => row));
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); return f;
}
const A = 'TEST_ONLY_A', KP = 'bsdept:' + A + ':bassam_plan_v1';
const REASON_DLG = 'هذا الإجراء يتطلب سبباً';

test('التحديث التلقائي لا يهدم الصفحة: نافذة «باب جديد» مفتوحة وتقع تغييرات من سياقات أخرى — الصفحة لا تُفكّ والنافذة تبقى بما كُتب فيها', { timeout: 600000 }, async () => {
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
    const toField = async (s) => { await s.go('#/planning', 5000); await s.page.locator('.pt-tab.pt-plan').click(); await s.page.waitForTimeout(4000); };
    const gateDlg = async (s) => {
      await s.page.locator('#bsPtPlan button', { hasText: /^الأبواب$/ }).first().click(); await s.page.waitForTimeout(800);
      await s.page.locator('button[title^="وضع باب جديد"]').first().click(); await s.page.waitForTimeout(500);
      const box = await s.page.evaluate(() => { const im = [...document.querySelectorAll('#bsPtPlan img, #bsPtPlan svg image, #bsPtPlan canvas')].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 300).sort((a, b) => b.width * b.height - a.width * a.height)[0]; return im ? { x: im.x, y: im.y, w: im.width, h: im.height } : null; });
      assert.ok(box, 'خريطة الموقع معروضة');
      await s.page.mouse.click(box.x + box.w * 0.4, box.y + box.h * 0.4); await s.page.waitForTimeout(1200);
    };
    /* مراقبة الصفحة: هوية عنصر الجذر · أي هيكل تحميل يُضاف · سطور السجل التشخيصي */
    const watch = (s, sel) => s.page.evaluate((sel) => {
      const W = (window.__w = { ph: 0, gone: 0 }); W.root = document.querySelector(sel); if (!W.root) throw Error('no root ' + sel);
      new MutationObserver((ms) => { for (const m of ms) { for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches('.sc-placeholder') || n.querySelector('.sc-placeholder'))) W.ph++; for (const n of m.removedNodes) if (n === W.root || (n.nodeType === 1 && n.contains(W.root))) W.gone++; } }).observe(document.body, { childList: true, subtree: true });
    }, sel);
    const read = (s) => s.page.evaluate((FIXED) => ({ ph: window.__w.ph, gone: window.__w.gone, connected: window.__w.root.isConnected, dlg: [...document.querySelectorAll(FIXED)].some((x) => x.offsetWidth > 300 && /باب جديد/.test(x.innerText)), val: (document.querySelector(FIXED.split(', ').map((q) => q + ' input').join(', ')) || {}).value }), FIXED);
    const logs = (s) => { s.live = []; s.page.on('console', (m) => { const t = m.text(); if (t.startsWith('[bs-live]')) s.live.push(t); }); };
    const saveKey = async (s, k, mut) => { const r = await s.api('/api/get?keys=' + k); const e = r.j.keys[k]; const v = JSON.parse(e.v); mut(v); const w = await s.api('/api/save', { method: 'POST', body: JSON.stringify({ set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: e.rev } }) }); assert.ok(w.status === 200 && w.j.ok === 1 && w.j.revs && w.j.revs[k], 'حُفظ ' + k + ': ' + JSON.stringify(w.j).slice(0, 200)); };

    /* ── ① الخطة والنافذة مفتوحة ── */
    const b2 = await openAs(b, lab, LAB.superUn, LAB.superPw, { onPage: (p) => { p.__az = 0; p.on('response', async (r) => { if (/\/api\/changes/.test(r.url())) { try { const j = await r.json(); if (j && j.az) p.__az++; } catch (e) {} } }); } }); logs(b2);
    await toField(b2); await gateDlg(b2);
    await b2.page.locator(FIXED.split(', ').map((q) => q + ' input').join(', ')).first().fill('77');
    await watch(b2, '#bsPtPlan [data-screen-label]');
    const still = async (name) => { const r = await read(b2); assert.deepEqual([r.gone, r.ph, r.connected, r.dlg, r.val], [0, 0, true, true, '77'], name + ': الصفحة لم تُفكّ والنافذة باقية بنصّها — ' + JSON.stringify(r) + ' ' + JSON.stringify(b2.live)); };
    const step = async (name, fn, wantAz) => { const z0 = b2.page.__az; await fn(); await b2.page.waitForTimeout(8000); if (wantAz) assert.ok(b2.page.__az > z0, name + ': وصلت إشارة az فعلاً'); await still(name); };
    let mg;
    await step('دخول مستخدم آخر', async () => { mg = await openAs(b, lab, LAB.mgrA, LAB.pw); });
    await step('حفظ إعداد منصة', () => saveKey(su, 'bassam_platform_v1', (v) => { v.TEST_ONLY_note = 'n' + Date.now(); }), true);
    await step('تعديل حساب', () => saveKey(su, 'bassam_auth_users_v1', (v) => { const u = v.find((x) => String(x.un) === LAB.empA); assert.ok(u, 'حساب الموظف التجريبي'); u.name = 'TEST_ONLY معدَّل'; }), true);
    await step('إنهاء جلسة', async () => { const r = await mg.api('/api/logout', { method: 'POST', body: '{}' }); assert.equal(r.status, 200); await mg.ctx.close(); });
    assert.ok(b2.live.some((t) => t.includes('az-unchanged')), 'السجل التشخيصي كتب إشارة az بلا تغيير: ' + JSON.stringify(b2.live));
    assert.equal(b2.live.some((t) => /\] (drop|placeholder|remount) /.test(t)), false, 'لا إسقاط ولا هيكل ولا إعادة تركيب: ' + JSON.stringify(b2.live));
    /* حفظٌ في الإدارة نفسها: الأول يضيف باباً من واجهته */
    const gatesOf = async (s) => { const P = await plan(s); return ((P && P.floors && P.floors[0] && P.floors[0].gates) || []).length; };
    const g0 = await gatesOf(su);   /* وضعُ الباب على الخريطة يُنشئه قبل تسميته («إلغاء» يلغي وضعه) */
    const poll = setInterval(async () => { try { if (await b2.page.evaluate(() => document.body.innerText.includes('حُدّثت البيانات من جهاز آخر'))) b2.sawNotice = true; } catch (e) {} }, 400);
    await step('حفظ باب في الإدارة نفسها', async () => { await toField(su); await gateDlg(su); await su.page.locator(FIXED.split(', ').map((q) => q + ' input').join(', ')).first().fill('5'); await su.page.locator(FIXED.split(', ').map((q) => q + ' button').join(', ')).filter({ hasText: 'حفظ البيانات' }).first().click(); await su.page.waitForTimeout(3500); assert.equal(await gatesOf(su), g0 + 1, 'باب الجهاز الأول حُفظ في الخادم'); });
    clearInterval(poll);
    assert.ok(b2.sawNotice, 'تنبيه صغير «حُدّثت البيانات من جهاز آخر» ظهر والنافذة مفتوحة');
    /* إغلاق النافذة وترك أداة الرسم ⇒ تظهر البيانات الجديدة في مكانها */
    const register = () => b2.page.evaluate(() => { const t = document.querySelector('#bsPtPlan').innerText.replace(/\s+/g, ' '), i = t.lastIndexOf('سجل الأبواب'); return i < 0 ? '' : t.slice(i, i + 60); });
    const reg0 = await register();
    await b2.page.locator(FIXED.split(', ').map((q) => q + ' button').join(', ')).filter({ hasText: /^إلغاء$/ }).first().click();
    await b2.page.waitForTimeout(800); await b2.page.keyboard.press('Escape');
    /* باب الجهاز الأول يظهر. و«إلغاء» هنا يحاول حذف الباب الموضوع على نسخةٍ تغيّرت، فيرفضه الخادم برسالته المعتادة ويبقى البابان (سلوك التعارض القائم، لم يُمسّ) */
    await b2.page.waitForFunction(() => { const t = document.querySelector('#bsPtPlan').innerText.replace(/\s+/g, ' '), i = t.lastIndexOf('سجل الأبواب'); return i >= 0 && /بابان/.test(t.slice(i, i + 60)); }, null, { timeout: 30000 });
    const after = await b2.page.evaluate(() => ({ gone: window.__w.gone, ph: window.__w.ph, connected: window.__w.root.isConnected }));
    assert.deepEqual([after.gone, after.ph, after.connected], [0, 0, true], 'بعد الإغلاق: التطبيق في مكانه بلا فكّ');
    assert.notEqual(await register(), reg0, 'سجل الأبواب تحدّث بعد إغلاق النافذة');
    assert.equal(await gatesOf(b2), g0 + 1);
    assert.equal(b2.live.some((t) => /\] (drop|placeholder|remount) /.test(t)), false, 'لا إسقاط ولا هيكل ولا إعادة تركيب: ' + JSON.stringify(b2.live));

    /* ── ② تغييرٌ حقيقي في صلاحيات مدير الإدارة يُطبَّق بلا هدم صفحته ── */
    const m2 = await openAs(b, lab, LAB.mgrA, LAB.pw); logs(m2);
    await toField(m2); await watch(m2, '#bsPtPlan [data-screen-label]');
    const az0 = await m2.page.evaluate(() => JSON.stringify(KIVO.__BS_AUTHZ));
    await saveKey(su, 'bassam_perms_v1', (v) => { const c = v.caps.TEST_ONLY_A; assert.ok(Array.isArray(c) && c.length > 2, 'سقف الإدارة أ'); const drop = c.find((x) => !/^(plan|planning|staff)/.test(x)); v.caps.TEST_ONLY_A = c.filter((x) => x !== drop); });
    await m2.page.waitForFunction((z) => JSON.stringify(KIVO.__BS_AUTHZ) !== z, az0, { timeout: 30000 });
    await m2.page.waitForTimeout(5000);
    const mr = await m2.page.evaluate(() => ({ gone: window.__w.gone, ph: window.__w.ph, connected: window.__w.root.isConnected }));
    assert.deepEqual([mr.gone, mr.ph, mr.connected], [0, 0, true], 'مدير الإدارة: وصف صلاحياته تغيّر وصفحته لم تُفكّ — ' + JSON.stringify(m2.live));
    assert.ok(m2.live.some((t) => t.includes('az-changed')), 'السجل التشخيصي كتب تغيّر الصلاحيات: ' + JSON.stringify(m2.live));

    /* ── ③ الآلية العامة على صفحتين أخريين: إسقاطُ كل القراءات قسراً لا يعرض هيكلاً ── */
    for (const [hash, name, comp] of [['#/staffing', 'الجدول الشهري', 'Staffing'], ['#/employees', 'الموظفون', 'Employees'], ['#/plan', 'التشغيل الميداني', 'Operational Plan']]) {
      const s = await openAs(b, lab, LAB.superUn, LAB.superPw); logs(s);
      await s.go(hash, 7000); await watch(s, 'main [data-screen-label]');
      const ready0 = await s.page.evaluate(() => Object.keys(KIVO.KIVO_MANIFEST.clone('operationsReadSets')).length);
      assert.ok(ready0 > 5, 'سجل مجموعات القراءة');
      await s.page.evaluate((c) => { window.__pg = c; KIVO.__BS_SRV.operations.invalidate(); }, comp);
      await s.page.waitForFunction(() => true, null, { timeout: 1000 }); await s.page.waitForTimeout(6000);
      const r = await s.page.evaluate(() => ({ gone: window.__w.gone, ph: window.__w.ph, connected: window.__w.root.isConnected, len: document.querySelector('main').innerText.length }));
      assert.deepEqual([r.gone, r.ph, r.connected], [0, 0, true], name + ': إسقاط القراءات لم يهدم الصفحة — ' + JSON.stringify(r) + ' ' + JSON.stringify(s.live));
      assert.ok(s.live.some((t) => /\] drop /.test(t)), name + ': السجل كتب الإسقاط: ' + JSON.stringify(s.live));
      assert.equal(await s.page.evaluate(() => { const R = KIVO.KIVO_MANIFEST.clone('operationsReadSets'), O = KIVO.__BS_SRV.operations, c = O.context(); return O.ready(R[window.__pg].filter((k) => O.resources.indexOf(k) !== -1).map((k) => 'bsdept:' + c.dept + ':' + k)); }), true, name + ': أُعيدت قراءة بيانات الصفحة في الخلفية بلا نقرة');
      assert.ok(r.len > 200, name + ': الصفحة معروضة بمحتواها');
      await s.ctx.close();
    }
  } finally { await b.close(); await lab.close(); fs.rmSync(TMP, { recursive: true, force: true }); }
});
