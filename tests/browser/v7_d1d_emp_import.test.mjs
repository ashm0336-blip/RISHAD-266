/* V7 · د1-د — استيراد الموظفين من Excel في صفحة «بيانات الموظفين» (كان في «الإعدادات ← استيراد بيانات»).
   قبولُ الحزمة في متصفحٍ حقيقي على المختبر (TEST_ONLY · بلا شبكة): القالب · التصدير · دمج خمسة · تعديل موجود · إعادة رفع بلا تعديل ·
   الاستبدال بتأكيد · الملفات الخاطئة · الطريقتان (القائمة والزر) · الجوال 390 · الحسابات الثلاثة. الملفات تُبنى وتُقرأ بقارئ المنصة نفسه
   (KIVO.BassamXLSX) داخل الصفحة، وتُرفع من نافذة اختيار الملف الحقيقية. اللقطات تُحفظ إن ضُبط KIVO_SHOTS. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', S1 = 'TEST_ONLY_A_S1', SHOTS = process.env.KIVO_SHOTS || '';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'd1d-'));
const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); } };
const HEAD = ['اسم الموظف', 'الجنس', 'رقم الهوية', 'الرقم الوظيفي', 'رقم الجوال', 'البريد الإلكتروني', 'نوع التوظيف', 'نوع العمل'];
const row = (name, nid, phone) => [name, 'ذكر', nid, '', phone || '', '', '', ''];

async function emps(s, d) { const k = 'bsdept:' + d + ':bassam_employees_v1'; const r = await s.api('/api/operations/read?keys=' + encodeURIComponent(k)); return (r.j && r.j.resources && r.j.resources[k]) || []; }
async function gotoEmps(s) {
  const p = s.page;
  if (!p.__trHook) { p.__trHook = 1; p.__tr = []; p.on('response', async (r) => { if (/\/api\/employees\/transition/.test(r.url())) { try { p.__tr.push({ s: r.status(), j: JSON.stringify(await r.json()).slice(0, 400) }); } catch (e) {} } }); }
  if (await p.evaluate(() => /^#\/sysadmin/.test(location.hash))) { await p.evaluate(() => { location.hash = '#/profile'; }); await p.waitForTimeout(2000); }
  await p.evaluate(() => { location.hash = '#/employees'; }); await p.waitForTimeout(3500);
  await p.evaluate(() => { if (!window.__toasts) { window.__toasts = []; const f = KIVO.bsToast; KIVO.bsToast = function (m) { try { window.__toasts.push(String(m)); } catch (e) {} return f.apply(this, arguments); };
    /* اسمُ الملف المقصود: خاصيةُ download على الرابط (المتصفحُ بلا واجهة يعطي اسماً بديلاً للأسماء العربية) */
    window.__dl = []; const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dl.push(this.download); return c.apply(this, arguments); }; } });
}
const toasts = (p) => p.evaluate(() => { const n = document.getElementById('bs-toast'); return (window.__toasts || []).concat(n && n.textContent ? [n.textContent.replace(/^[✓⚠✕]\s*/, '').trim()] : []); });   /* رسالةُ الصفحة (#bs-toast) ورسائلُ المنصة */
const clearToasts = (p) => p.evaluate(() => { window.__toasts = []; const n = document.getElementById('bs-toast'); if (n) n.textContent = ''; });
/* ملفُ xlsx من صفوف — بباني المنصة نفسه */
async function xlsx(p, rows, name) {
  const b64 = await p.evaluate(async (rows) => { const out = await KIVO.BassamXLSX.build(rows); const u = out instanceof Uint8Array ? out : new Uint8Array(out.buffer || out); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }, rows);
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return f;
}
async function parse(p, file) {
  const b64 = fs.readFileSync(file).toString('base64');
  return p.evaluate(async (b64) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return KIVO.BassamXLSX.parse(u.buffer); }, b64);
}
async function download(p, click, name) { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), click()]); const f = path.join(TMP, name); await d.saveAs(f); return { file: f, suggested: await p.evaluate(() => (window.__dl || []).slice(-1)[0] || '') }; }
const openMenu = async (p) => { await p.locator('main button', { hasText: 'ملفات' }).first().click(); await p.waitForTimeout(500); };
const menuItem = (p, key) => p.locator('[data-emp-imp="' + key + '"]').first();
/* رفعٌ من القائمة أو من زرّ الحالة الفارغة — نافذةُ اختيار الملف الحقيقية */
async function upload(p, file, via = 'menu') {
  if (via === 'menu') await openMenu(p);
  const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 20000 }), menuItem(p, via).click()]);
  await fc.setFiles(file); await p.waitForTimeout(2500);
}
const dialog = (p) => p.evaluate(() => {
  const h = [...document.querySelectorAll('h3')].find((x) => /يوجد موظفون مسجّلون بالفعل|تأكيد الاستيراد/.test(x.textContent)); if (!h) return null;
  const box = h.parentElement.parentElement.parentElement   /* العنوان ← رأسُ النافذة ← صندوقُها */;
  const lat = (t) => String(t).replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[^0-9]/g, '');
  const num = (label) => { const m = [...box.querySelectorAll('div')].find((x) => x.children.length === 0 && x.textContent.trim() === label); return m && m.nextElementSibling ? +lat(m.nextElementSibling.textContent) : null; };
  return { title: h.textContent.trim(), text: box.innerText, cur: num('الموجود حالياً'), file: num('في الملف'), dup: num('مطابق لسجل موجود'), fresh: num('جديد كلياً') };
});
const ar = (n) => n;
const act = async (p, k) => { await p.locator('[data-imp="' + k + '"]').click(); await p.waitForTimeout(3500); };   /* خياراتُ النافذة: update (تحديث ودمج) · add · askrep */
const clickBtn = async (p, re) => { await p.locator('button', { hasText: re }).first().click(); await p.waitForTimeout(3500); };
const within = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: innerWidth, h: innerHeight, ok: r.width > 0 && r.left >= 0 && r.right <= innerWidth + 1 }; }, sel);

test('V7 · د1-د: استيراد الموظفين من Excel في صفحة الموظفين — القبول 1 إلى 10', { timeout: 900000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    /* ══ مدير الإدارة (يملك الإضافة) ══ */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw, { context: { acceptDownloads: true } }), p = m.page;
    await gotoEmps(m);
    const start = await emps(m, A); assert.equal(start.length, 2, 'عالمُ المختبر: موظفان');
    await openMenu(p);
    /* الشكل: «استيراد من Excel» أولُ بنود «ملفات» بوصفه */
    const items = await p.evaluate(() => [...document.querySelectorAll('[data-bs-dd] > div')].map((x) => x.innerText.replace(/\s*\n\s*/g, ' | ')));
    assert.equal(items[0], 'استيراد من Excel | يعرض ما سيتغيّر قبل التنفيذ — دمج أو استبدال', 'أولُ بنود «ملفات»: ' + JSON.stringify(items));
    await shot(p, '00_menu_desktop');
    /* 1) قالبُ الاستيراد: ملف Excel بالأعمدة الصحيحة يُفتح بلا خطأ */
    const tpl = await download(p, () => menuItem(p, 'cols').click(), 'template.xlsx');
    assert.match(tpl.suggested, /\.xlsx$/);
    const tplRows = await parse(p, tpl.file), cols = await p.evaluate(() => KIVO.BassamEmpImp.colTitles());
    assert.deepEqual(tplRows[0].slice(0, cols.length), cols, 'القالب: صفُّ العناوين = أعمدةُ المحرّك');
    assert.ok(cols.includes('اسم الموظف') && cols.includes('رقم الهوية'));
    await shot(p, '01_template_downloaded');
    /* 2) تصديرُ الحاليين: كلُّ الموظفين ببياناتهم */
    await openMenu(p);
    const ex = await download(p, () => p.locator('[data-bs-dd] > div', { hasText: 'تصدير Excel' }).first().click(), 'export0.xlsx');
    const exRows = await parse(p, ex.file), flat = JSON.stringify(exRows);
    for (const e of start) { assert.ok(flat.includes(e.name), 'التصدير يحمل ' + e.name); assert.ok(flat.includes(e.nid), 'وهويته ' + e.nid); }
    await shot(p, '02_export');
    /* 3) خمسةٌ جدد بخيار «دمج»: يظهر ما سيُضاف قبل التنفيذ، ثم يزيد العدد 5 */
    const five = [1, 2, 3, 4, 5].map((i) => row('TEST_ONLY مستورد ' + i, '130000000' + i, '050000000' + i));
    await upload(p, await xlsx(p, [HEAD].concat(five), 'five.xlsx'));
    let d = await dialog(p); assert.ok(d, 'نافذةُ التأكيد ظهرت قبل أي حفظ');
    assert.deepEqual([d.cur, d.file, d.dup, d.fresh], [ar(2), ar(5), ar(0), ar(5)], 'قبل التنفيذ: ' + JSON.stringify(d));
    assert.equal((await emps(m, A)).length, 2, 'لم يُحفظ شيء قبل التأكيد');
    await shot(p, '03a_merge_preview');
    await act(p, 'update');
    let now = await emps(m, A); assert.equal(now.length, 7, 'زاد العدد 5');
    for (const r of five) assert.ok(now.some((e) => e.name === r[0] && e.nid === r[2]), 'ظهر ' + r[0]);
    const shown = await p.evaluate(() => (document.querySelector('main').innerText.match(/TEST_ONLY مستورد/g) || []).length);
    assert.equal(shown, 5, 'الخمسة في الجدول (ظهر ' + shown + ')');
    await shot(p, '03b_merge_done');
    /* 4) تعديلُ موجود: يتعدّل ولا يتكرر */
    await upload(p, await xlsx(p, [HEAD, row('TEST_ONLY موظف أ٢', '1200000002', '0555555555')], 'edit.xlsx'));
    d = await dialog(p); assert.deepEqual([d.file, d.dup, d.fresh], [ar(1), ar(1), ar(0)], 'تعديل: ' + JSON.stringify(d));
    await shot(p, '04a_edit_preview');
    await act(p, 'update');
    now = await emps(m, A); assert.equal(now.length, 7, 'لا تكرار');
    assert.equal(now.filter((e) => e.nid === '1200000002').length, 1); assert.equal(now.find((e) => e.nid === '1200000002').phone, '0555555555', 'تعدّل الجوال');
    await shot(p, '04b_edit_done');
    /* 5) تصديرٌ ثم رفعُ الملف نفسه بلا تعديل: لا تغيير ولا تكرار */
    await openMenu(p);
    const ex2 = await download(p, () => p.locator('[data-bs-dd] > div', { hasText: 'تصدير Excel' }).first().click(), 'export1.xlsx');
    const before5 = JSON.stringify((await emps(m, A)).map((e) => [e.eid, e.name, e.nid, e.phone || '', e.empno || '']));
    await clearToasts(p); await upload(p, ex2.file);
    d = await dialog(p); assert.deepEqual([d.cur, d.file, d.dup, d.fresh], [ar(7), ar(7), ar(7), ar(0)], 'الملف نفسه: ' + JSON.stringify(d));
    await shot(p, '05a_same_file_preview');
    await act(p, 'update');
    const same = JSON.stringify((await emps(m, A)).map((e) => [e.eid, e.name, e.nid, e.phone || '', e.empno || '']));
    assert.equal(same, before5, 'لا تغيير ولا تكرار');
    const t5 = await toasts(p); await shot(p, '05b_same_file_done');
    assert.ok(t5.some((x) => /لا تغيير/.test(x)) && !t5.some((x) => /حُدّث/.test(x)), 'الرسالة «لا تغيير»: ' + JSON.stringify(t5));
    /* 7) ملفاتٌ خاطئة: رسالةٌ عربية بالسبب، ولا يُحفظ شيء */
    const bad = [
      ['أعمدة ناقصة', await xlsx(p, [['س', 'ص'], ['١', '٢']], 'bad_cols.xlsx'), /الأعمدة غير معروفة|لم يتم العثور على عمود/],
      ['ملف فارغ', await xlsx(p, [HEAD], 'bad_empty.xlsx'), /الملف فارغ أو بدون بيانات/],
      ['ليس Excel', (() => { const f = path.join(TMP, 'bad.txt'); fs.writeFileSync(f, 'TEST_ONLY نص'); return f; })(), /الرجاء اختيار ملف Excel بصيغة xlsx/],
      ['xlsx تالف', (() => { const f = path.join(TMP, 'bad_broken.xlsx'); fs.writeFileSync(f, 'TEST_ONLY ليس ملفاً مضغوطاً'); return f; })(), /تعذّ?ر قراءة (الملف|ملف Excel)/],
    ];
    const msgs = {};
    for (const [name, file, re] of bad) {
      await clearToasts(p); await upload(p, file); const t = await toasts(p);
      assert.equal(await dialog(p), null, name + ': لا نافذة تأكيد');
      assert.ok(t.some((x) => re.test(x)), name + ': رسالةٌ بالسبب — ' + JSON.stringify(t)); msgs[name] = t.find((x) => re.test(x));
      assert.equal(JSON.stringify((await emps(m, A)).map((e) => [e.eid, e.name, e.nid, e.phone || '', e.empno || ''])), before5, name + ': لم يُحفظ شيء');
    }
    await shot(p, '07_bad_files_last_message');
    /* هويةٌ مكررة داخل الملف: المحرّك يتخطّى الصفَّ المكرر ويعدّه (سلوكُه القائم) — يُثبَّت هنا كما هو، والقرارُ في ملف المراجع */
    await clearToasts(p); await upload(p, await xlsx(p, [HEAD, row('TEST_ONLY مكرر أ', '1399999991'), row('TEST_ONLY مكرر ب', '1399999991')], 'dup.xlsx'));
    d = await dialog(p); assert.ok(d, 'المكرر: النافذة تظهر بصفٍّ واحد'); assert.deepEqual([d.file, d.fresh], [ar(1), ar(1)], 'المكرر يُحسب صفاً واحداً: ' + JSON.stringify(d));
    await shot(p, '07b_duplicate_id_preview');
    await clickBtn(p, /إلغاء الاستيراد/);
    assert.equal(JSON.stringify((await emps(m, A)).map((e) => [e.eid, e.name, e.nid, e.phone || '', e.empno || ''])), before5, 'المكرر بعد الإلغاء: لم يُحفظ شيء');
    /* ══ 10) موظفٌ بلا صلاحية إضافة: لا يرى الاستيراد (قبل الاستبدال — الاستبدالُ يحذف سجلَّه وحسابَه) ══ */
    const e = await openAs(b, lab, LAB.empA, LAB.pw); await e.page.evaluate(() => { location.hash = '#/employees'; }); await e.page.waitForTimeout(3000);
    assert.equal(await e.page.evaluate(() => !!KIVO.BassamPerm.can('emps', 'add')), false, 'الموظف بلا إضافة');
    assert.equal(await e.page.locator('[data-emp-imp]').count(), 0, 'لا بند ولا زرّ استيراد');
    const filesBtn = e.page.locator('main button', { hasText: 'ملفات' }); if (await filesBtn.count()) { await filesBtn.first().click(); await e.page.waitForTimeout(500); assert.equal(await e.page.locator('[data-emp-imp]').count(), 0, 'ولا داخل «ملفات»'); }
    await shot(e.page, '10_employee_no_import');

    /* 6) استبدال: يحلّ الملف محلّ القائمة بعد تأكيدٍ واضح */
    const three = [1, 2, 3].map((i) => row('TEST_ONLY بديل ' + i, '140000000' + i));
    await upload(p, await xlsx(p, [HEAD].concat(three), 'replace.xlsx'));
    await p.locator('[data-imp="askrep"]').click(); await p.waitForTimeout(800);
    const warn = await p.evaluate(() => document.body.innerText);
    assert.match(warn, /سيُحذف .* من هذه الإدارة نهائياً/, 'تحذيرُ الاستبدال واضح'); assert.match(warn, /لا يمكن التراجع/);
    assert.equal((await emps(m, A)).length, 7, 'لا حذف قبل التأكيد');
    await shot(p, '06a_replace_confirm');
    await p.locator('button', { hasText: /نعم، احذف واستبدل/ }).first().click(); await p.waitForTimeout(2000);
    /* الخادم يشترط سبباً مكتوباً لحذف القائمة (يُسجَّل في سجل التدقيق) — نافذةُ السبب قبل التنفيذ */
    const needsReason = await p.getByText('هذا الإجراء يتطلب سبباً').count();
    if (needsReason) { assert.equal((await emps(m, A)).length, 7, 'لا حذف قبل إدخال السبب'); await shot(p, '06a2_replace_reason');
      await p.locator('textarea, input[type="text"]').last().fill('TEST_ONLY سبب الاستبدال'); await p.locator('button', { hasText: 'حفظ بالسبب' }).first().click(); await p.waitForTimeout(4000); }
    const t6 = await toasts(p);
    now = await emps(m, A); assert.deepEqual(now.map((e) => e.name).sort(), three.map((r) => r[0]).sort(), 'القائمةُ صارت ملفَّ الاستبدال — الرسالة: ' + JSON.stringify(t6) + ' · الخادم: ' + JSON.stringify(p.__tr.slice(-1)));
    await shot(p, '06b_replace_done');
    assert.deepEqual(m.errs, [], 'لا أخطاء صفحة (مدير الإدارة)');

    /* ══ 9) الجوال 390 — الحالةُ الفارغة: الزرّان داخل الشاشة (قبل أن يُملأ القسم في البند 8) ══ */
    const ms = await openAs(b, lab, LAB.superUn, LAB.superPw, { viewport: { width: 390, height: 844 } });
    assert.equal(await ms.page.evaluate((d) => KIVO.BassamDepts.setActive(d), S1), true); await ms.page.reload({ waitUntil: 'domcontentloaded' }); await ms.page.waitForTimeout(3000);
    await gotoEmps(ms);
    const mb = await within(ms.page, '[data-emp-imp="empty"]'); assert.ok(mb && mb.ok, '390: زرّ الاستيراد في الحالة الفارغة داخل الشاشة ' + JSON.stringify(mb));
    await shot(ms.page, '09c_mobile_empty_button'); assert.deepEqual(ms.errs, []); await ms.page.context().close();
    /* ══ 8 و10) مدير المنصة — الزرّ في الحالة الفارغة يعطي نتيجةَ القائمة نفسها ══ */
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw, { context: { acceptDownloads: true } });
    assert.equal(await s.page.evaluate((d) => KIVO.BassamDepts.setActive(d), S1), true); await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(3000);
    await gotoEmps(s);
    assert.equal((await emps(s, S1)).length, 0, 'القسم فارغ');
    const eb = s.page.locator('[data-emp-imp="empty"]'), ab = s.page.locator('main button', { hasText: 'إضافة أول موظف' }).first();
    assert.equal(await eb.count(), 1, 'زرّ «استيراد من Excel» في الحالة الفارغة');
    const [bb, ba] = [await eb.boundingBox(), await ab.boundingBox()];
    assert.equal(Math.round(bb.height), Math.round(ba.height), 'بحجم «إضافة أول موظف»'); assert.ok(Math.abs(bb.y - ba.y) < 2, 'بجانبه');
    await shot(s.page, '08a_empty_state_button');
    const two = [row('TEST_ONLY طريق أ', '1500000001', '0511111111'), row('TEST_ONLY طريق ب', '1500000002', '0522222222')];
    const fTwo = await xlsx(s.page, [HEAD].concat(two), 'two.xlsx');
    await upload(s.page, fTwo, 'empty');
    d = await dialog(s.page); assert.equal(d.title, 'تأكيد الاستيراد'); await shot(s.page, '08b_empty_state_preview');
    await act(s.page, 'add');   /* القائمةُ فارغة: الخيارُ الوحيد «إضافة الجديد فقط» */
    const shape = (L) => L.map((e) => [e.name, (e.nid || '').length, (e.phone || '').length, e.gender || '', e.account || '', e.group || '']).sort();
    const viaButton = shape(await emps(s, S1));
    assert.deepEqual((await emps(s, S1)).map((e) => [e.name, e.nid]).sort(), two.map((r) => [r[0], r[2]]).sort(), 'الزرّ: استُورد الاثنان');
    /* الملفُ نفسه من القائمة في إدارةٍ أخرى: الخادمُ يرفضه لتكرار الهوية والجوال على المنصة — والرسالةُ بالسبب لا «صلاحيتك لا تسمح» */
    assert.equal(await s.page.evaluate((d) => KIVO.BassamDepts.setActive(d), 'TEST_ONLY_B'), true); await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(3000);
    await gotoEmps(s); const bBefore = JSON.stringify(await emps(s, 'TEST_ONLY_B'));
    await clearToasts(s.page); await upload(s.page, fTwo, 'menu'); await act(s.page, 'update');
    const dupMsg = await toasts(s.page); assert.ok(dupMsg.some((x) => /مكرر/.test(x)) && !dupMsg.some((x) => /صلاحيتك/.test(x)), 'تكرارٌ مع وحدةٍ أخرى: رسالةٌ بالسبب — ' + JSON.stringify(dupMsg));
    assert.equal(JSON.stringify(await emps(s, 'TEST_ONLY_B')), bBefore, 'ولم يُحفظ شيء'); await shot(s.page, '07c_duplicate_other_unit');
    if (await dialog(s.page)) { await s.page.locator('button', { hasText: /إلغاء الاستيراد/ }).first().click(); await s.page.waitForTimeout(800); }
    /* البياناتُ نفسها من القائمة (بهويتين وجوالين آخرين) ⇒ السجلاتُ نفسُها شكلاً */
    const fTwoB = await xlsx(s.page, [HEAD, row('TEST_ONLY طريق أ', '1500000011', '0533333333'), row('TEST_ONLY طريق ب', '1500000012', '0544444444')], 'two_b.xlsx');
    await upload(s.page, fTwoB, 'menu'); d = await dialog(s.page); assert.deepEqual([d.file, d.fresh], [ar(2), ar(2)]);
    await act(s.page, 'update');
    const viaMenu = shape((await emps(s, 'TEST_ONLY_B')).filter((e) => /طريق/.test(e.name)));
    assert.deepEqual(viaMenu, viaButton, 'الطريقتان تعطيان النتيجة نفسها — الخادم: ' + JSON.stringify(s.page.__tr.slice(-1)) + ' · ' + JSON.stringify(await toasts(s.page)));
    await shot(s.page, '08c_menu_same_result');
    assert.deepEqual(s.errs, [], 'لا أخطاء صفحة (مدير المنصة)');

    /* ══ 9) الجوال 390: القائمة والنافذة والزرّ كاملةٌ داخل الشاشة ══ */
    const mm = await openAs(b, lab, LAB.mgrA, LAB.pw, { viewport: { width: 390, height: 844 } }), q = mm.page;
    await gotoEmps(mm); await openMenu(q);
    for (const k of ['menu', 'cols']) { const r = await within(q, '[data-emp-imp="' + k + '"]'); assert.ok(r && r.ok, '390: بند ' + k + ' داخل الشاشة ' + JSON.stringify(r)); }
    await shot(q, '09a_mobile_menu');
    const [fc] = await Promise.all([q.waitForEvent('filechooser'), menuItem(q, 'menu').click()]); await fc.setFiles(await xlsx(q, [HEAD, row('TEST_ONLY جوال', '1600000001')], 'mobile.xlsx')); await q.waitForTimeout(2500);
    const dm = await q.evaluate(() => { const h = [...document.querySelectorAll('h3')].find((x) => /يوجد موظفون مسجّلون بالفعل|تأكيد الاستيراد/.test(x.textContent)); const box = h.parentElement.parentElement.parentElement   /* العنوان ← رأسُ النافذة ← صندوقُها */; const r = box.getBoundingClientRect();
      const btns = [...box.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().height).map((x) => { const c = x.getBoundingClientRect(); return [x.textContent.trim().slice(0, 18), Math.round(c.left), Math.round(c.right)]; });
      return { l: Math.round(r.left), r: Math.round(r.right), w: innerWidth, btns, scrollX: document.documentElement.scrollWidth > innerWidth + 1 }; });
    assert.ok(dm.l >= 0 && dm.r <= dm.w + 1, '390: النافذة داخل الشاشة ' + JSON.stringify(dm));
    for (const x of dm.btns) assert.ok(x[1] >= 0 && x[2] <= dm.w + 1, '390: زرّ «' + x[0] + '» داخل الشاشة');
    await shot(q, '09b_mobile_dialog');
    await q.locator('button', { hasText: /إلغاء الاستيراد/ }).first().click(); await q.waitForTimeout(800);
    assert.deepEqual(mm.errs, []);
    console.log(JSON.stringify({ d1d: { template: tpl.suggested, cols, sameFileToasts: t5, badMessages: msgs } }));
  } finally { await b.close(); await lab.close(); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {} }
});
