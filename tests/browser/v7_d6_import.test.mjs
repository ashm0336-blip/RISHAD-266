/* V7 · د6 (استيراد) — اختبارُ متصفحٍ للمسار كله على المختبر المحلي (TEST_ONLY — نسخةٌ مولَّدة بالشكل القديم، لا بياناتٍ حقيقية):
   (١) اختيارُ الملف ← الملخّص قبل التأكيد (المصدر · تاريخ التصدير · المفاتيح والصور · الحجم · ما لن يُنقل وسببُه) ← «استبدال كامل» ← «نعم، استبدل» ←
       شريطُ التقدّم (الجزء الحالي من الكل · الصور) ← اعتمادُ ملخّص الخادم ← ملخّصُ النجاح؛ ثم فتحُ الصفحات: المخطط بمصلياته وخرائطه (الصورُ تُحمَّل 200).
   (٢) فشلُ جزءٍ في منتصف الإرسال: رسالةٌ بالسبب ونافذةٌ تعرض «إعادة المحاولة» و«إغلاق» — لا زرَّ بلا أثر؛ «إعادة المحاولة» تكمل من الجزء الفاشل وحده وتنجح.
   (٣) «إغلاق» بعد الفشل يحذف المؤقت ولا يغيّر شيئاً · وإغلاقُ الصفحة أثناء الإرسال كذلك.
   موضعُ زرّ الاستيراد في الواجهة: صفحةُ الوحدة ← «البيانات» (المساعدُ chooseFile وحده يعرف الطريق — يُعدَّل هو إن نُقل الزر). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { hasSystem } from '../unit/harness.mjs';
import { oldFile, staged, snapshot, changed, NOT_TRANSFERRED } from '../unit/v7_d6_import_fx.mjs';

const B = 'TEST_ONLY_B', need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport') ? {} : { skip: 'يحتاج أنظمة المخطط والجولات والمهام' };
const AR = (s) => String(s).replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660));
async function fileOnDisk(opts) {
  const f = await oldFile(opts), p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'd6-import-')), 'TEST_ONLY-old-copy.json');
  fs.writeFileSync(p, JSON.stringify(f));
  return { f, p };
}
/* الطريقُ إلى زرّ «استيراد نسخة» لمدير المنصة: صفحةُ الوحدة ← «البيانات» */
async function chooseFile(s, unit, file) {
  await s.go('#/sysadmin/overview', 1500);
  await s.go('#/sysadmin/org/' + unit, 3500);
  await s.page.locator('main [aria-label="أقسام صفحة العقدة"] button', { hasText: 'البيانات' }).click();
  await s.page.waitForTimeout(700);
  const [fc] = await Promise.all([s.page.waitForEvent('filechooser', { timeout: 15000 }), s.page.locator('main [title^="استيراد نسخة احتياطية إلى هذه الإدارة"]').click()]);
  await fc.setFiles(file);
  await s.page.waitForSelector('[data-bkc="summary"]', { timeout: 20000 });
}
const click = async (p, t) => { const el = p.getByText(t, { exact: true }).last(); await el.waitFor({ state: 'visible', timeout: 20000 }); await el.click(); };
const text = (p, sel) => p.locator(sel).first().innerText().then((t) => AR(t.replace(/\s+/g, ' ')));
/* يسجّل نصوصَ شريط التقدّم كلَّها (المرحلةُ قصيرة — تُلتقط بمراقبٍ في الصفحة) */
const watchRun = (p) => p.evaluate(() => { window.__d6run = []; new MutationObserver(() => { const el = document.querySelector('[data-bkc="run-text"]'), bar = document.querySelector('[role="progressbar"][aria-label="تقدّم الاستيراد"]'); if (el) window.__d6run.push(el.textContent + ' |' + (bar ? bar.getAttribute('aria-valuenow') : '')); }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true }); });

test('د6: اختيار الملف ← الملخّص ← التقدّم ← النجاح، ثم المخطط والمصليات والخرائط ظاهرة', { timeout: 600000, ...need }, async (t) => {
  const lab = await startLab(), b = await chromium.launch(), { f, p: file } = await fileOnDisk({ small: true });
  lab.delay = (pth) => (pth === '/api/backup/import' ? 120 : 0);
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw), posts = [];
    s.page.on('response', async (r) => { if (/\/api\/backup\/import/.test(r.url())) { let j = null, q = null; try { j = await r.json(); q = JSON.parse(r.request().postData() || '{}'); } catch (e) { /* ردٌّ بلا جسم */ } posts.push({ s: r.status(), op: q && (q.op || q.phase), dry: !!(q && q.dry), ok: j && j.ok, err: j && j.err }); } });
    await chooseFile(s, B, file);
    /* الملخّص قبل التأكيد */
    const sum = await text(s.page, '[data-bkc="sum-line"]');
    assert.match(sum, /TEST_ONLY إدارة قديمة/, 'الإدارةُ المصدر: ' + sum);
    assert.match(sum, /صُدّرت/, 'تاريخُ التصدير: ' + sum);
    assert.match(sum, new RegExp(Object.keys(f.data).length + ' مجموع'), 'عددُ المفاتيح: ' + sum);
    assert.match(sum, /2 صور|صورتان|صورتين/, 'عددُ الصور: ' + sum);
    assert.match(sum, /الحجم: \d/, 'الحجم: ' + sum);
    assert.match(sum, /الشكل القديم/, 'نسخةٌ قديمة: ' + sum);
    const skipHead = await text(s.page, '[data-bkc="skip-head"]'), skip = await text(s.page, '[data-bkc="skip"]');
    assert.match(skipHead, new RegExp('لن يُنقل \\(' + Object.keys(NOT_TRANSFERRED).length + '\\)'), skipHead);
    for (const k of ['bassam_grants_v1', 'bassam_perm_tpls_v1', 'bassam_dr_grp_v1', 'bassam_notif_dev_v1:TEST_ONLY_u8']) assert.ok(skip.includes(k), 'ما لن يُنقل يُذكر باسمه: ' + k);
    assert.match(skip, /صلاحيات بنظام قديم أُلغي/); assert.match(skip, /لا تُنقل حتى لا تُفتح صلاحية/);
    assert.equal(staged(lab.env.DB), 0, 'الملخّصُ لا يودِع شيئاً في المؤقت');
    const before = snapshot(lab.env.DB);
    /* التأكيد ← التقدّم */
    await watchRun(s.page);
    await click(s.page, 'استبدال كامل'); await click(s.page, 'نعم، استبدل');
    await s.page.getByText('اعتماد استعادة النسخة').first().waitFor({ state: 'visible', timeout: 60000 });
    const seen = (await s.page.evaluate(() => window.__d6run)).map(AR);
    assert.ok(seen.some((x) => /الجزء 1 من 3/.test(x)), 'التقدّم: الجزء الحالي من الكل — ' + JSON.stringify(seen.slice(0, 6)));
    assert.ok(seen.some((x) => /الجزء 3 من 3 .{1,3}الصور: 2 من 2/.test(x)), 'التقدّم: الصور — ' + JSON.stringify(seen.slice(-6)));
    assert.deepEqual(changed(snapshot(lab.env.DB), before), [], 'قبل الاعتماد لم يتغيّر شيء في القاعدة (الأجزاء في المؤقت وحده)');
    assert.ok(staged(lab.env.DB) > 0, 'الأجزاء في المنطقة المؤقتة');
    await click(s.page, 'استعادة النسخة');
    /* ملخّص النجاح */
    await s.page.waitForSelector('[data-bkc="done"]', { timeout: 60000 });
    const done = await text(s.page, '[data-bkc="done-msg"]');
    assert.match(done, /الصور: 2 جديدة و0 موجودة/, done); assert.match(done, /لم يُنقل 11/, done); assert.match(done, /لقطة ما قبل الاستيراد/, done);
    assert.equal(staged(lab.env.DB), 0, 'المؤقتُ حُذف مع الاعتماد');
    assert.equal(posts.filter((x) => x.op === 'commit' && x.s === 200 && x.ok === 1).length, 1, 'اعتمادٌ واحد: ' + JSON.stringify(posts));
    assert.equal(lab.env.DB.q("SELECT COUNT(*) n FROM aud WHERE k='atomic_restore'")[0].n, 1, 'سُجّل الاستيراد مرةً واحدة');
    await click(s.page, 'تم');
    assert.equal(await s.page.locator('[data-bkc="done"]').count(), 0, 'النافذةُ أُغلقت');
    /* فتحُ الصفحات: المخطط بمصلياته وخرائطه */
    const imgs = [];
    s.page.on('response', (r) => { const m = /\/api\/img\/(img_[a-z0-9_]+)/.exec(r.url()); if (m && r.request().method() === 'GET') imgs.push(m[1] + ':' + r.status()); });
    assert.equal(await s.page.evaluate((d) => KIVO.BassamDepts.setActive(d), B), true);
    await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(3000);
    await s.go('#/plan', 3000);
    const seenPlan = () => s.page.evaluate(() => { const m = document.querySelector('main') || document.body; return (m.innerText + ' ¦ ' + [...m.querySelectorAll('[aria-label],[title]')].map((x) => (x.getAttribute('aria-label') || '') + ' ' + (x.getAttribute('title') || '')).join(' ¦ ')).replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' '); });
    let plan = '';
    for (let i = 0; i < 40 && !/سجل المصليات — TEST_ONLY . طابق د6 1 3 مصليات/.test(plan); i++) { await s.page.waitForTimeout(500); plan = AR(await seenPlan()); }
    assert.match(plan, /الموقع النشط: TEST_ONLY . طابق د6 1/, 'المخطط: طوابقُ النسخة ظاهرة — ' + plan.slice(0, 300));
    assert.match(plan, /سجل المصليات — TEST_ONLY . طابق د6 1 3 مصليات/, 'المصلياتُ ظاهرة على المخطط — ' + plan.slice(-600));
    const planData = await s.page.evaluate(async (d) => { const r = await fetch('/api/operations/read?keys=' + encodeURIComponent('bsdept:' + d + ':bassam_plan_v1,bsdept:' + d + ':bassam_rounds_v1')); const j = await r.json(); return { floors: j.resources['bsdept:' + d + ':bassam_plan_v1'].floors.map((x) => ({ name: x.name, iid: x.iid, zones: x.zones.length })), days: Object.keys(j.resources['bsdept:' + d + ':bassam_rounds_v1'] || {}).length }; }, B);
    assert.deepEqual(planData.floors.map((x) => x.iid), Object.keys(f.idbImages), 'الطوابقُ بخرائطها');
    assert.ok(planData.floors.every((x) => x.zones === 3), 'المصليات');
    for (const id of Object.keys(f.idbImages)) {
      const got = await s.page.evaluate(async (i) => { const r = await fetch('/api/img/' + i); return { s: r.status, t: await r.text() }; }, id);
      assert.equal(got.s, 200, 'الخريطة ' + id + ' تُقرأ'); assert.equal(got.t, f.idbImages[id], 'بايتاتُ الخريطة كما في النسخة');
    }
    await s.page.waitForTimeout(1500);
    assert.ok(imgs.some((x) => /:200$/.test(x)), 'الصفحةُ حمّلت خريطةً من الخادم: ' + JSON.stringify(imgs.slice(0, 6)));
    assert.equal(imgs.some((x) => !/:200$/.test(x)), false, 'لا خريطةَ مفقودة: ' + JSON.stringify(imgs));
    await s.go('#/daily', 4000);
    assert.deepEqual(s.errs, [], 'لا أخطاء صفحة');
    t.diagnostic('progress texts: ' + JSON.stringify([...new Set(seen)].slice(0, 8)));
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});

test('د6: فشلُ جزءٍ ⇒ رسالةٌ بالسبب و«إعادة المحاولة» تكمل من الجزء الفاشل · «إغلاق» وإغلاقُ الصفحة يحذفان المؤقت ولا يتغيّر شيء', { timeout: 600000, ...need }, async () => {
  const lab = await startLab(), b = await chromium.launch(), { p: file } = await fileOnDisk({ small: true });
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw), before = snapshot(lab.env.DB), sent = [];
    /* الجزءُ الثاني يُقطع اتصالُه (كلَّ محاولاته) حتى يُرفع القطع */
    let broken = true;
    await s.page.route('**/api/backup/import', async (route) => { const q = JSON.parse(route.request().postData() || '{}'); if (q.op === 'part') sent.push(q.items[0].k + '#' + q.items[0].s); if (broken && q.op === 'part' && q.items[0].k) return route.abort('connectionreset'); return route.continue(); });
    await chooseFile(s, B, file);
    await click(s.page, 'استبدال كامل'); await click(s.page, 'نعم، استبدل');
    await s.page.waitForSelector('[data-bkc="fail"]', { timeout: 60000 });
    const msg = await text(s.page, '[data-bkc="fail-msg"]');
    assert.match(msg, /تعذّر تأكيد|لا اتصال|أعد المحاولة/, 'رسالةٌ بالسبب: ' + msg);
    assert.equal(await s.page.getByText('نعم، استبدل', { exact: true }).count(), 0, 'زرُّ التأكيد لا يبقى ظاهراً بلا أثر');
    assert.equal(await s.page.getByText('إعادة المحاولة', { exact: true }).count(), 1); assert.equal(await s.page.getByText('إغلاق', { exact: true }).count() >= 1, true);
    assert.deepEqual(changed(snapshot(lab.env.DB), before), [], 'فشلُ جزءٍ: لم يتغيّر شيء');
    const firstTry = sent.slice();
    assert.equal(firstTry.filter((x) => x === '#0').length, 1, 'جزءُ النص أُرسل مرةً');
    assert.equal(firstTry.filter((x) => /^img_/.test(x)).length, 3, 'الجزءُ الفاشل أُعيد وحده ثلاثَ محاولات: ' + JSON.stringify(firstTry));
    /* إعادة المحاولة بعد عودة الاتصال: تكمل من الجزء الفاشل — جزءُ النص لا يُرسل ثانيةً */
    broken = false; sent.length = 0;
    await click(s.page, 'إعادة المحاولة');
    await s.page.getByText('اعتماد استعادة النسخة').first().waitFor({ state: 'visible', timeout: 60000 });
    assert.equal(sent.includes('#0'), false, 'ما نجح لا يُعاد: ' + JSON.stringify(sent)); assert.equal(sent.length, 2, 'الصورتان وحدهما: ' + JSON.stringify(sent));
    await click(s.page, 'استعادة النسخة');
    await s.page.waitForSelector('[data-bkc="done"]', { timeout: 60000 });
    assert.equal(staged(lab.env.DB), 0);
    await click(s.page, 'تم');
    /* فشلٌ ثم «إغلاق»: المؤقتُ يُحذف ولا يتغيّر شيء */
    const after1 = snapshot(lab.env.DB);
    broken = true;
    await chooseFile(s, B, file);
    await click(s.page, 'استبدال كامل'); await click(s.page, 'نعم، استبدل');
    await s.page.waitForSelector('[data-bkc="fail"]', { timeout: 60000 });
    assert.ok(staged(lab.env.DB) > 0, 'جزءُ النص في المؤقت');
    await click(s.page, 'إغلاق');
    await s.page.waitForFunction(() => !document.querySelector('[data-bkc="fail"]'), null, { timeout: 10000 });
    for (let i = 0; i < 50 && staged(lab.env.DB); i++) await s.page.waitForTimeout(100);
    assert.equal(staged(lab.env.DB), 0, '«إغلاق» حذف المؤقت'); assert.deepEqual(changed(snapshot(lab.env.DB), after1), [], 'ولم يتغيّر شيء');
    /* إغلاقُ الصفحة أثناء الإرسال: طلبُ الإلغاء يخرج عند الإغلاق */
    await s.page.unroute('**/api/backup/import');
    lab.delay = (pth) => (pth === '/api/backup/import' ? 700 : 0);
    await chooseFile(s, B, file);
    await click(s.page, 'استبدال كامل'); await click(s.page, 'نعم، استبدل');
    await s.page.waitForSelector('[data-bkc="run"]', { timeout: 20000 });
    for (let i = 0; i < 80 && !staged(lab.env.DB); i++) await s.page.waitForTimeout(100);
    assert.ok(staged(lab.env.DB) > 0, 'بدأ الإيداع');
    await s.page.close({ runBeforeUnload: true });
    for (let i = 0; i < 100 && staged(lab.env.DB); i++) await new Promise((r) => setTimeout(r, 100));
    await lab.idle();
    assert.equal(staged(lab.env.DB), 0, 'إغلاقُ الصفحة حذف المؤقت'); assert.deepEqual(changed(snapshot(lab.env.DB), after1), [], 'ولم يتغيّر شيء');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
