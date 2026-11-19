/* برومت 43 · الجذر 4 — «سيناريوهات حقيقية»: جهازان · كمونٌ مصطنع (حفظ 600 · قراءة 500 · تغييرات 300) · مديرُ المنصة ومديرُ إدارة (TEST_ONLY).
   تُشغَّل قبل كل حزمة مع بقية المجموعة: npm run test:real
     ① رفعُ خريطة (موقعٌ جديد بصورته) وفي الإدارة جولاتُ يومٍ ماضٍ ويومِ اليوم — لمدير الإدارة ولمدير المنصة: يُحفظ بلا رفض ولا حدثٍ أمني؛
        جولةُ اليوم الماضي لا تُمسّ (الجذر 3)، وجولةُ اليوم تُهيَّأ للموقع الجديد.
     ② الانعكاسُ اللحظي (الجذر 2): جهازٌ يحرّك/يضيف/يحذف باباً، والآخر في أداة «وضع باب» ثم ونافذةُ بابٍ آخر مفتوحة ⇒ يظهر التغيير ≤ 2 ث بلا تحديث،
        والنافذةُ باقيةٌ بنصّها. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'real-'));
function png(name, w, h, rgb) {
  const crc = (b) => { let c, n, k, t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0).map((_, i) => rgb[i % 3])]), raw = Buffer.concat(Array.from({ length: h }, () => row));
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); return f;
}
import { replaceOperationalFixture } from '../unit/world_fx.mjs';
const A = 'TEST_ONLY_A', KP = 'bsdept:' + A + ':bassam_plan_v1', KR = 'bsdept:' + A + ':bassam_rounds_v1';
const H = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date()).forEach((p) => { if (p.type !== 'literal') o[p.type] = +p.value; }); return { y: o.year, m: o.month, d: o.day }; })();
const TODAY = H.y + '-' + H.m + '-' + H.d, PAST = (H.m > 1 ? H.y + '-' + (H.m - 1) : (H.y - 1) + '-12') + '-3';
const LAG = { '/api/save': 600, '/api/operations/read': 500, '/api/changes': 300 };
const REFUSED = /لم يُحفظ|لم يصل|لم يُلغَ|عدّل مستخدم|خارج الصلاحية|رُفض/;
const toasts = (s) => s.page.evaluate(() => { window.__toasts = []; new MutationObserver(() => { const t = document.getElementById('bs-toast'); if (t && t.textContent && window.__toasts[window.__toasts.length - 1] !== t.textContent) window.__toasts.push(t.textContent); }).observe(document.body, { childList: true, subtree: true, characterData: true }); });
const seen = (s) => s.page.evaluate(() => window.__toasts);
const pickFile = async (s, file, target) => { const [fc] = await Promise.all([s.page.waitForEvent('filechooser', { timeout: 15000 }), target.click()]); await fc.setFiles(file); await s.page.waitForTimeout(2500); };
const siteSave = (s) => s.page.evaluate(() => { const p = [...document.querySelectorAll('p')].find((x) => x.textContent.trim() === 'اسم الموقع وخريطته المرجعية'); let c = p; while (c && ![...c.querySelectorAll('button')].some((q) => q.textContent.trim() === 'إلغاء')) c = c.parentElement; const bs = [...c.querySelectorAll('button')], i = bs.findIndex((q) => q.textContent.trim() === 'إلغاء'); bs[i - 1].click(); });
const planOf = async (s) => { const r = await s.api('/api/operations/read?keys=' + encodeURIComponent(KP)); return (r.j && r.j.resources && r.j.resources[KP]) || null; };
async function newSite(s, img) {
  await s.go('#/plan', 5000);
  await s.page.getByText('إضافة خطة لشهر', { exact: false }).last().click(); await s.page.waitForTimeout(1200);
  await s.page.getByText('بدء خطة فارغة بالكامل', { exact: false }).last().click(); await s.page.waitForTimeout(600);
  await s.page.getByText('إنشاء الخطة', { exact: true }).last().click(); await s.page.waitForTimeout(4000);
  await s.page.getByText('أضف أول موقع', { exact: true }).last().click(); await s.page.waitForTimeout(900);
  await s.page.locator('input[placeholder^="مثال"]').last().fill('TEST_ONLY موقع');
  await pickFile(s, img, s.page.getByText('اسحب صورة الخريطة هنا', { exact: false }).last());
  await siteSave(s); await s.page.waitForTimeout(6000);
}

for (const [who, un, pw] of [['مدير الإدارة', LAB.mgrA, LAB.pw], ['مدير المنصة', LAB.superUn, LAB.superPw]]) {
  test('① ' + who + ': رفعُ خريطة موقعٍ جديد تحت الكمون وفي الإدارة جولاتُ يومٍ ماضٍ — يُحفظ بلا رفض ولا حدثٍ أمني، والماضي لا يُمسّ', { timeout: 300000 }, async () => {
    const img = png('map_' + un + '.png', 640, 480, [200, 220, 240]);
    const lab = await startLab(), b = await chromium.launch();
    try {
      await replaceOperationalFixture(lab.env, KR, { [PAST]: { d: [] }, [TODAY]: { d: [] } });
      const sec0 = lab.env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act='denied'")[0].n;
      const s = await openAs(b, lab, un, pw); await toasts(s);
      lab.delay = LAG;
      await newSite(s, img);
      lab.delay = null;
      const P = await planOf(s), f = P && P.floors && P.floors[0];
      assert.ok(f && f.iid && f.imgW === 640, who + ': الموقع حُفظ بصورته: ' + JSON.stringify(f && { iid: f.iid, w: f.imgW }) + ' · الرسائل: ' + JSON.stringify(await seen(s)));
      assert.deepEqual((await seen(s)).filter((t) => REFUSED.test(t)), [], who + ': بلا رسالة رفض');
      assert.equal(lab.env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act='denied'")[0].n, sec0, who + ': لا حدثَ أمنياً — ' + JSON.stringify(lab.env.DB.q("SELECT uid, target, detail FROM sec WHERE act='denied'")));
      const R = (await s.api('/api/operations/read?keys=' + encodeURIComponent(KR))).j.resources[KR];
      assert.deepEqual(R[PAST], { d: [] }, who + ': جولةُ اليوم الماضي لم تُمسّ');
      assert.equal(((R[TODAY] || {}).d || []).length, 1, who + ': جولةُ اليوم هُيّئت للموقع الجديد: ' + JSON.stringify(R[TODAY]));
    } finally { await b.close(); await lab.close(); }
  });
}

test('② الانعكاس اللحظي على مستوى العنصر: تحريك/إضافة/حذف من جهازٍ يظهر في الآخر ≤ 2 ث — وأداةُ «وضع باب» مفعّلة، ثم ونافذةُ بابٍ آخر مفتوحة بنصّها', { timeout: 400000 }, async () => {
  const img = png('map_live.png', 640, 480, [200, 220, 240]);
  const lab = await startLab(), b = await chromium.launch();
  try {
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    await newSite(su, img);
    const FIXED = 'main [style*="position:fixed"], main [style*="position: fixed"]';
    /* الجهاز الأول يكتب بخدمة العميل الحقيقية في صفحته */
    const other = (kind, uid, x, y) => su.page.evaluate(async ([kind, uid, x, y]) => { const O = KIVO.__BS_SRV.operations, N = 'bassam_plan_v1', K = 'bsdept:' + O.context().dept + ':' + N; for (let i = 0; i < 20; i++) { const rd = await O.read([K]); if (rd && rd.ok === 1) break; await new Promise((r) => setTimeout(r, 200)); } const doc = O.get(N); const lists = [doc.gates, doc.floors[0].gates].concat(Object.values(doc.months || {}).map((m) => m && m.d && m.d[0] && m.d[0].gates)).filter(Boolean); lists.forEach((a) => { const i = a.findIndex((g) => g.uid === uid); if (kind === 'add') a.push({ x, y, label: 'باب ' + uid, emp: [], hideLabel: true, uid }); else if (kind === 'move' && i >= 0) { a[i].x = x; a[i].y = y; } else if (kind === 'del' && i >= 0) a.splice(i, 1); }); const r = await O.commit({}, 'test:' + Math.random(), { t: Date.now() }, (d) => d.set(N, doc)); return r.ok; }, [kind, uid, x || 0, y || 0]);
    assert.equal(await other('add', 'TEST_ONLY_g1', 100, 100), 1); assert.equal(await other('add', 'TEST_ONLY_g2', 200, 150), 1);
    const b2 = await openAs(b, lab, LAB.superUn, LAB.superPw); await toasts(b2);
    b2.live = []; b2.page.on('console', (m) => { const t = m.text(); if (t.startsWith('[bs-live]')) b2.live.push(t); });
    await b2.go('#/planning', 5000); await b2.page.locator('.pt-tab.pt-plan').click(); await b2.page.waitForTimeout(4000);
    const at = (x, y) => b2.page.evaluate(([x, y]) => [...document.querySelectorAll('#bsPtPlan svg circle')].some((c) => +c.getAttribute('cx') === x && +c.getAttribute('cy') === y), [x, y]);
    const shows = async (x, y, want, what) => { const t0 = Date.now(); for (;;) { if ((await at(x, y)) === want) return Date.now() - t0; if (Date.now() - t0 > 8000) assert.fail(what + ': لم يظهر التغيير خلال 8 ث — السجل: ' + JSON.stringify(b2.live)); await b2.page.waitForTimeout(40); } };
    assert.ok(await at(100, 100) && await at(200, 150), 'البابان معروضان في الجهاز الثاني');
    const times = {};
    /* أداة «وضع باب» مفعّلة */
    await b2.page.locator('#bsPtPlan button', { hasText: /^الأبواب$/ }).first().click(); await b2.page.waitForTimeout(400);
    await b2.page.locator('button[title^="وضع باب جديد"], button[data-tip^="وضع باب جديد"]').first().click(); await b2.page.waitForTimeout(600);
    assert.equal(await other('move', 'TEST_ONLY_g1', 431, 277), 1); times['أداة مفعّلة · تحريك'] = await shows(431, 277, true, 'أداة مفعّلة · تحريك');
    /* نافذةُ بابٍ آخر مفتوحة وفيها نصّ */
    const box = await b2.page.evaluate(() => { const im = [...document.querySelectorAll('#bsPtPlan img, #bsPtPlan svg image, #bsPtPlan canvas')].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 300).sort((a, b) => b.width * b.height - a.width * a.height)[0]; return { x: im.x, y: im.y, w: im.width, h: im.height }; });
    await b2.page.mouse.click(box.x + box.w * 0.7, box.y + box.h * 0.7);
    const input = b2.page.locator(FIXED.split(', ').map((q) => q + ' input').join(', ')).first();
    await input.waitFor({ timeout: 15000 }); await input.fill('55'); await b2.page.waitForTimeout(2500);
    const dlg = () => b2.page.evaluate((F) => ({ open: [...document.querySelectorAll(F)].some((x) => x.offsetWidth > 300 && /باب جديد/.test(x.innerText)), val: (document.querySelector(F.split(', ').map((q) => q + ' input').join(', ')) || {}).value }), FIXED);
    assert.equal(await other('move', 'TEST_ONLY_g2', 333, 222), 1); times['نافذة مفتوحة · تحريك'] = await shows(333, 222, true, 'نافذة مفتوحة · تحريك');
    assert.equal(await other('add', 'TEST_ONLY_g3', 520, 90), 1); times['نافذة مفتوحة · إضافة'] = await shows(520, 90, true, 'نافذة مفتوحة · إضافة');
    assert.equal(await other('del', 'TEST_ONLY_g1'), 1); times['نافذة مفتوحة · حذف'] = await shows(431, 277, false, 'نافذة مفتوحة · حذف');
    assert.deepEqual(await dlg(), { open: true, val: '55' }, 'النافذة باقية بنصّها');
    console.log('LIVE_TIMES ' + JSON.stringify(times));
    for (const k of Object.keys(times)) assert.ok(times[k] <= 2000, k + ': ' + times[k] + ' م.ث (الهدف ≤ 2000)');
    /* ثم يحفظ الجهاز الثاني بيانات بابه: يُحفظ بلا رفض فوق أحدث نسخة */
    await b2.page.locator(FIXED.split(', ').map((q) => q + ' button').join(', ')).filter({ hasText: 'حفظ البيانات' }).first().click();
    let saved = null; for (let i = 0; i < 30 && !saved; i++) { const P = await planOf(su); saved = (P.floors[0].gates || []).find((g) => String(g.num) === '55') || null; if (!saved) await b2.page.waitForTimeout(500); }
    assert.ok(saved, 'بيانات باب الجهاز الثاني حُفظت');
    const P = await planOf(su);
    assert.deepEqual(P.floors[0].gates.map((g) => g.uid).filter((u) => /^TEST_ONLY_/.test(u)).sort(), ['TEST_ONLY_g2', 'TEST_ONLY_g3'], 'تعديلات الجهاز الأول باقية');
    assert.deepEqual((await seen(b2)).filter((t) => REFUSED.test(t)), [], 'بلا رسالة رفض: ' + JSON.stringify(b2.live));
  } finally { await b.close(); await lab.close(); fs.rmSync(TMP, { recursive: true, force: true }); }
});
