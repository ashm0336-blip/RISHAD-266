/* V7 · د6 (استيراد) — اختبارُ متصفحٍ للمسار كله على المختبر المحلي (TEST_ONLY — نسخةٌ مولَّدة بالشكل القديم، لا بياناتٍ حقيقية):
   (١) اختيارُ الملف ← الملخّص قبل التأكيد (المصدر · تاريخ التصدير · المفاتيح والصور · الحجم · ما لن يُنقل وسببُه) ← «استبدال كامل» ← «نعم، استبدل» ←
       شريطُ التقدّم (الجزء الحالي من الكل · الصور) ← اعتمادُ ملخّص الخادم ← ملخّصُ النجاح؛ ثم فتحُ الصفحات: المخطط بمصلياته وخرائطه (الصورُ تُحمَّل 200).
   (٢) فشلُ جزءٍ في منتصف الإرسال: رسالةٌ بالسبب ونافذةٌ تعرض «إعادة المحاولة» و«إغلاق» — لا زرَّ بلا أثر؛ «إعادة المحاولة» تكمل من الجزء الفاشل وحده وتنجح.
   (٣) «إغلاق» بعد الفشل يحذف المؤقت ولا يغيّر شيئاً · وإغلاقُ الصفحة أثناء الإرسال كذلك.
   موضعُ زرّ الاستيراد في الواجهة: «الإدارات والصلاحيات» ← الوحدة ← «البيانات» (المساعدُ chooseFile وحده يعرف الطريق — يُعدَّل هو إن نُقل الزر). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { hasSystem } from '../unit/harness.mjs';
import { oldFile, staged, snapshot, changed, NOT_TRANSFERRED, fieldDrops, remapOf, SRC_DEPT, OTHER_DEPT, dayKeys } from '../unit/v7_d6_import_fx.mjs';

const B = 'TEST_ONLY_B', need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport') ? {} : { skip: 'يحتاج أنظمة المخطط والجولات والمهام' };
const AR = (s) => String(s).replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660));
async function fileOnDisk(opts, change) {
  const f = await oldFile(opts); if (change) change(f);
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'd6-import-')), 'TEST_ONLY-old-copy.json');
  fs.writeFileSync(p, JSON.stringify(f));
  return { f, p };
}
/* الطريقُ إلى زرّ «استيراد نسخة» لمدير المنصة: «الإدارات والصلاحيات» ← الوحدة ← «البيانات» (#/sysadmin/org/<الوحدة>/data) */
async function chooseFile(s, unit, file) {
  await s.go('#/sysadmin/overview', 1500);
  await s.go('#/sysadmin/org/' + unit + '/data', 3500);   /* V7 · د6: شاشة «الإدارات والصلاحيات» — تبويبُ «البيانات» للوحدة بعنوانه */
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
    for (const k of ['bassam_grants_v1', 'bassam_dr_grp_v1', 'bassam_notif_dev_v1:TEST_ONLY_u8']) assert.ok(skip.includes(k), 'ما لن يُنقل يُذكر باسمه: ' + k);
    assert.ok(!skip.includes('bassam_perm_tpls_v1'), 'V7 · د7 (51ب): القوالبُ لا تُذكر فيما لن يُنقل — تصير أدواراً');
    /* V7 · د7 (51ب): القوالبُ صارت أدواراً فلا يُذكر «صلاحيات بنظام قديم» فيما لن يُنقل */
    assert.doesNotMatch(skip, /صلاحيات بنظام قديم أُلغي/); assert.match(skip, /لا تُنقل حتى لا تُفتح صلاحية/);
    assert.match(skip, /bassam_grants_v1[^¦]*العدد: 1/, 'المنحُ القديمة بعددها: ' + skip);
    assert.equal(staged(lab.env.DB), 0, 'الملخّصُ لا يودِع شيئاً في المؤقت');
    const before = snapshot(lab.env.DB);
    /* التأكيد ← التقدّم */
    await watchRun(s.page);
    await click(s.page, 'استبدال كامل');
    /* الخطوةُ قبل الرفع ليست تأكيداً: زرُّها «ارفع وتحقّق» ونصُّها يقول إن شيئاً لا يتغيّر حتى التأكيد — ولا «نعم، استبدل» قبل الرفع */
    const up = await text(s.page, '[data-bkc="upload"]');
    assert.match(up, /لا يتغيّر شيء في الإدارة حتى تؤكّد/, up); assert.equal(await s.page.getByText('نعم، استبدل', { exact: true }).count(), 0, 'لا تأكيدَ قبل الرفع');
    await click(s.page, 'ارفع وتحقّق');
    await s.page.getByText('تأكيد الاستبدال').first().waitFor({ state: 'visible', timeout: 60000 });
    const seen = (await s.page.evaluate(() => window.__d6run)).map(AR);
    /* عددُ الأجزاء: نصُّ الملف + كلُّ موردٍ في طلبه (المخطط · جدولُ الورديات) + الصورتان — 5 */
    assert.ok(seen.some((x) => /الجزء 1 من 5/.test(x)), 'التقدّم: الجزء الحالي من الكل — ' + JSON.stringify(seen.slice(0, 6)));
    assert.ok(seen.some((x) => /الجزء 5 من 5 .{1,3}الصور: 2 من 2/.test(x)), 'التقدّم: الصور — ' + JSON.stringify(seen.slice(-6)));
    assert.deepEqual(changed(snapshot(lab.env.DB), before), [], 'قبل الاعتماد لم يتغيّر شيء في القاعدة (الأجزاء في المؤقت وحده)');
    assert.ok(staged(lab.env.DB) > 0, 'الأجزاء في المنطقة المؤقتة');
    /* التأكيدُ الوحيد: بعد الرفع والتحقق، ومعه ملخّصُ الخادم (ما سيُنقل وما لن يُنقل) */
    const confirmText = AR(await s.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ')));
    /* V7 · د6 (QA ٦ — قرارُ المالك ب1/ب4): صحيفةُ صلاحيات مدير المصدر لا تنتقل وتُذكر بندًا (11 + 1) · والصلاحياتُ المنقولة بعددها، والسقفُ والمدير كما هما */
    assert.match(confirmText, new RegExp('لن يُنقل ' + (Object.keys(NOT_TRANSFERRED).length + 1) + ' '), 'ملخّصُ الخادم في التأكيد');
    assert.match(confirmText, /perms - mgr — صحيفة صلاحيات مدير المصدر — [^.]*العدد: 1/, 'صحيفةُ مدير المصدر تُذكر بعددها');
    /* V7 · 53 (basefix): قرار المالك 51ب — قوالبُ النسخة الثلاثة (v7_d6_import_fx: bassam_perm_tpls_v1 · TEST_ONLY_t1..t3) تصير أدواراً للوحدة الهدف
       بلا أشخاص (لا tplOf — كما v7_d7_tpls_roles ②) فتُعدّ في الملخّص: 3 أدوار · والإسنادُ الواحد ورقةُ الموظف كما كان */
    assert.match(confirmText, /الصلاحيات: 3 دور و1 إسناد تنتقل — ويبقى سقف الوحدة ومديرها كما هما/, 'الصلاحياتُ المنقولة بعددها');
    /* V7 · د6 (schemafix): وحقولُ الموارد التي لن تُنقل — كلُّها قبل التأكيد بمسارها وعددها (الملفُ يحملها كما يكتبها Production) */
    const fd = fieldDrops(f), plain = confirmText.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/ - /g, ' · '),   /* نافذةُ التأكيد تعرض الفاصل «·» شرطةً */ at = plain.indexOf('حقول لن تُنقل');
    assert.match(plain, /حقول لن تُنقل \(\d+\)/, 'حقولُ الموارد في التأكيد');
    assert.ok(plain.includes('bassam_plan_v1 · floors[].zones[].nNow — حقل عابر للعرض بلا قيمة في النسخة — العدد: ' + fd['bassam_plan_v1 · floors[].zones[].nNow|transient']), 'العابرُ الفارغ بعدده: ' + plain.slice(at, at + 700));
    assert.ok(plain.includes('bassam_plan_v1 · floors[].zones[].shareName — حقل لا مقابل له في المنصة — قيمته لن تُنقل — العدد: 1'), 'وذو القيمة يُذكر ولا يُسقط بصمت: ' + plain.slice(at, at + 700)); assert.match(confirmText, /bassam_grants_v1 — [^·]*العدد: 1/, 'والمنحُ بعددها'); assert.match(confirmText, /ستُكتب 2 صور|ستُكتب 2 صورة/, 'والصورُ التي ستُكتب');
    /* V7 · د6 (remap): التنبيهاتُ التي تُسقط وحدها بعددها ونوعها · وإعادةُ ربط معرّف الإدارة بعددها من المصدر إلى الهدف */
    const R = remapOf(f), nNf = Object.values(R.nfDrops).reduce((n, x) => n + x, 0);
    assert.ok(plain.includes('تنبيهات لن تُنقل (' + nNf + ')'), 'تنبيهاتٌ لن تُنقل بعددها: ' + plain.slice(plain.indexOf('تنبيهات لن'), plain.indexOf('تنبيهات لن') + 400));
    assert.ok(plain.includes('bassam_notif_v1 · pm_tpl — تنبيه بنوع لا يعرفه الإصدار الحالي — العدد: 4'), 'pm_tpl بعدده');
    assert.ok(plain.includes('أُعيد ربط ' + R.n + ' إشارة من «' + SRC_DEPT + '» إلى «' + B + '» (التنبيهات: ' + R.by['التنبيهات'] + ' · المهام: ' + R.by['المهام'] + ')'   /* د6 QA ٦ (ب1): صحيفةُ مدير المصدر لا تنتقل فلا يُعاد ربطها */), 'إعادةُ الربط في التأكيد: ' + plain.slice(plain.indexOf('أُعيد ربط'), plain.indexOf('أُعيد ربط') + 200));
    assert.ok(plain.includes('معرّفات إدارات أخرى في النسخة لم يُعَد ربطها: ' + OTHER_DEPT + ': 1'), 'والمعرّفُ الأجنبي يُذكر ولا يُربط');
    assert.equal(await s.page.getByText('نعم، استبدل', { exact: true }).count(), 1, 'تأكيدٌ واحد');
    await click(s.page, 'نعم، استبدل');
    /* ملخّص النجاح */
    await s.page.waitForSelector('[data-bkc="done"]', { timeout: 60000 });
    const done = await text(s.page, '[data-bkc="done-msg"]');
    assert.match(done, /الصور: 2 جديدة و0 موجودة/, done); assert.match(done, new RegExp('لم يُنقل ' + (Object.keys(NOT_TRANSFERRED).length + 1) + ':'), done); assert.match(done, /perms [·-] mgr/, done); assert.match(done, /مطابقة [·-] الصلاحيات: 3 دور و1 إسناد تنتقل/, done);   /* V7 · 53: القوالبُ الثلاثة أدوارٌ (51ب) */
    assert.ok(done.includes('أُعيد ربط ' + R.n + ' إشارة من «' + SRC_DEPT + '» إلى «' + B + '»'), 'وفي ملخّص النجاح: ' + done); assert.ok(done.includes('تنبيهات لم تُنقل: ' + nNf + ' ('), done); assert.match(done, /حقول لم تُنقل: \d+ في \d+ مساراً/, done); assert.match(done, /لقطة ما قبل الاستيراد/, done);
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
  /* نسخةٌ بلا شريحة صلاحيات: ملخّصُ النجاح يقول إن أنظمة الوحدة ما زالت مطفأة ويفتح تبويبها */
  const lab = await startLab(), b = await chromium.launch(), { p: file } = await fileOnDisk({ small: true }, (f) => { delete f.perms; });
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw), before = snapshot(lab.env.DB), sent = [];
    /* الجزءُ الثاني يُقطع اتصالُه (كلَّ محاولاته) حتى يُرفع القطع */
    let broken = true;
    await s.page.route('**/api/backup/import', async (route) => { const q = JSON.parse(route.request().postData() || '{}'); if (q.op === 'part') sent.push(q.items[0].k + '#' + q.items[0].s); if (broken && q.op === 'part' && /^img_/.test(q.items[0].k)) return route.abort('connectionreset'); return route.continue(); });
    await chooseFile(s, B, file);
    await click(s.page, 'استبدال كامل'); await click(s.page, 'ارفع وتحقّق');
    await s.page.waitForSelector('[data-bkc="fail"]', { timeout: 60000 });
    const msg = await text(s.page, '[data-bkc="fail-msg"]');
    assert.match(msg, /تعذّر تأكيد|لا اتصال|أعد المحاولة/, 'رسالةٌ بالسبب: ' + msg);
    assert.equal(await s.page.getByText('ارفع وتحقّق', { exact: true }).count(), 0, 'زرُّ الرفع لا يبقى ظاهراً بلا أثر'); assert.equal(await s.page.getByText('نعم، استبدل', { exact: true }).count(), 0, 'ولا تأكيدَ قبل اكتمال الرفع والتحقق');
    assert.equal(await s.page.getByText('إعادة المحاولة', { exact: true }).count(), 1); assert.equal(await s.page.getByText('إغلاق', { exact: true }).count() >= 1, true);
    assert.deepEqual(changed(snapshot(lab.env.DB), before), [], 'فشلُ جزءٍ: لم يتغيّر شيء');
    const firstTry = sent.slice();
    assert.equal(firstTry.filter((x) => x === '#0').length, 1, 'جزءُ النص أُرسل مرةً');
    assert.equal(firstTry.filter((x) => /^img_/.test(x)).length, 3, 'الجزءُ الفاشل أُعيد وحده ثلاثَ محاولات: ' + JSON.stringify(firstTry));
    /* إعادة المحاولة بعد عودة الاتصال: تكمل من الجزء الفاشل — جزءُ النص لا يُرسل ثانيةً */
    broken = false; sent.length = 0;
    await click(s.page, 'إعادة المحاولة');
    await s.page.getByText('تأكيد الاستبدال').first().waitFor({ state: 'visible', timeout: 60000 });
    assert.equal(sent.some((x) => !/^img_/.test(x)), false, 'ما نجح (نصُّ الملف والمخطط) لا يُعاد: ' + JSON.stringify(sent)); assert.equal(sent.length, 2, 'الصورتان وحدهما: ' + JSON.stringify(sent));
    await click(s.page, 'نعم، استبدل');
    await s.page.waitForSelector('[data-bkc="done"]', { timeout: 60000 });
    assert.equal(staged(lab.env.DB), 0);
    assert.match(await text(s.page, '[data-bkc="done-sys"]'), /أنظمة الوحدة ما زالت مطفأة/);
    assert.equal(await s.page.locator('[data-bkc="done-sys"] a').getAttribute('href'), '#/sysadmin/org/' + B + '/systems', 'رابطُ تبويب أنظمة الوحدة');
    await click(s.page, 'تم');
    /* فشلٌ ثم «إغلاق»: المؤقتُ يُحذف ولا يتغيّر شيء */
    const after1 = snapshot(lab.env.DB);
    broken = true;
    await chooseFile(s, B, file);
    await click(s.page, 'استبدال كامل'); await click(s.page, 'ارفع وتحقّق');
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
    await click(s.page, 'استبدال كامل'); await click(s.page, 'ارفع وتحقّق');
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

/* د6 — الجولةُ الكاملة بالحجم المقيس: استيرادُ النسخة القديمة ≈31MB من واجهة المتصفح نفسِها ← تصديرُ نسخة الإدارة من الكود الحالي (ملفٌّ يسلّمه المتصفح) ←
   مسحُ بيانات الإدارة ← استيرادُ الملف المصدَّر ← المطابقة مورداً مورداً وصورةً صورة. [ثقيل ≈ دقيقة إلى دقيقتين] */
test('د6: عضوٌ واحد أكبر مما يُرسل في دفعة ⇒ رفضٌ عند البدء يسمّيه (المورد › اليوم) — قبل أي رفع، ولا يتغيّر شيء', { timeout: 600000, ...need }, async () => {
  /* يومٌ واحد ≈2.7M حرف (لا ينقسم) ونسخةٌ فوق حدّ الطلب القديم (صورتان) */
  const lab = await startLab(), b = await chromium.launch(), { p: file } = await fileOnDisk({ small: true }, (f) => {
    const r = JSON.parse(f.data.bassam_rounds_v1), day = dayKeys(r)[1];   /* V7 · د6 (posfix): يومٌ — لا __pMig ولا m: */ r[day].d[0].zones[0].d = 'M0 0 ' + 'L1 1 '.repeat(540000) + 'Z'; f.data.bassam_rounds_v1 = JSON.stringify(r);
    const ids = Object.keys(f.idbImages); ids.forEach((id) => { f.idbImages[id] = 'data:image/png;base64,' + 'VEVTVF9PTkxZ'.repeat(250000); });
    f.__day = day;
  });
  try {
    const day = JSON.parse(fs.readFileSync(file, 'utf8')).__day, s = await openAs(b, lab, LAB.superUn, LAB.superPw), before = snapshot(lab.env.DB), sent = [];
    await s.page.route('**/api/backup/import', async (route) => { const q = JSON.parse(route.request().postData() || '{}'); sent.push(q.op || q.phase); return route.continue(); });
    await chooseFile(s, B, file);
    await click(s.page, 'استبدال كامل'); await click(s.page, 'ارفع وتحقّق');
    await s.page.waitForSelector('[data-bkc="fail"]', { timeout: 60000 });
    const msg = await text(s.page, '[data-bkc="fail-msg"]');
    assert.ok(msg.replace(/[\u202a-\u202e\u2066-\u2069]/g, '').includes('bassam_rounds_v1 › ' + day), 'الرفضُ يسمّي العضو: ' + msg); assert.match(msg, /لم يتغيّر شيء/);
    assert.equal(sent.includes('part'), false, 'لم يُرفع جزء: ' + JSON.stringify(sent));
    assert.deepEqual(changed(snapshot(lab.env.DB), before), []); assert.equal(staged(lab.env.DB), 0);
  } finally { await b.close(); await lab.close(); try { fs.rmSync(path.dirname(file), { recursive: true, force: true }); } catch (e) { /* مؤقت */ } }
});

test('د6 [ثقيل]: تصدير ← مسح ← استيراد ← مطابقة — بنسخةٍ ≈31MB من واجهة المتصفح', { timeout: 900000, ...need }, async (t) => {
  const lab = await startLab(), b = await chromium.launch(), t0 = Date.now(), { f, p: file } = await fileOnDisk({ scale: 1 });
  const stamp = (m) => t.diagnostic(m + ' @' + Math.round((Date.now() - t0) / 1000) + 's');
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw), p = s.page, sizes = [];
    let slices = 0;
    const refused = [];
    p.on('response', async (r) => { if (/\/api\/backup\/import/.test(r.url()) && r.status() !== 200) { let t = ''; try { t = (await r.text()).slice(0, 300); } catch (e) { /* بلا جسم */ } refused.push(r.status() + ' ' + t + ' ← ' + String(r.request().postData() || '').slice(0, 160)); } });
    p.on('request', (r) => { if (/\/api\/backup\/(import|restore)/.test(r.url()) && r.method() === 'POST') { const body = r.postData() || ''; sizes.push(Buffer.byteLength(body)); if (body.length < 400 && /"phase":"slice"/.test(body)) slices++; } });
    const importVia = async (path0, expectDone) => {
      await chooseFile(s, B, path0);
      await click(p, 'استبدال كامل'); await click(p, 'ارفع وتحقّق');
      /* التأكيدُ أو لوحةُ الفشل — أيُّهما ظهر أولاً (الفشلُ يُعرض بسببه بدل انتظار المهلة) */
      await Promise.race([p.getByText('تأكيد الاستبدال').first().waitFor({ state: 'visible', timeout: 300000 }), p.waitForSelector('[data-bkc="fail"]', { timeout: 300000 })]);
      if (await p.locator('[data-bkc="fail"]').count()) assert.fail('فشل الاستيراد: ' + (await text(p, '[data-bkc="fail-msg"]')) + ' · ' + JSON.stringify(refused));
      await click(p, 'نعم، استبدل');
      await p.waitForSelector('[data-bkc="done"]', { timeout: 300000 });
      const done = await text(p, '[data-bkc="done-msg"]');
      assert.match(done, expectDone, done);
      await click(p, 'تم');
    };
    stamp('file ' + fs.statSync(file).size + ' bytes');
    assert.ok(fs.statSync(file).size > 31e6);
    await importVia(file, /الصور: 10 جديدة و0 موجودة/);
    stamp('old copy imported · ' + slices + ' slices');
    assert.ok(slices >= 12, 'المفتاحُ الكبير (الجولات ≈8.4MB) أُرسل دفعاتٍ: ' + slices);
    assert.ok(Math.max(...sizes) < 8 * 1024 * 1024, 'كلُّ طلبٍ دون 8MB (أكبرُها ' + Math.max(...sizes) + ')');
    /* ما في الإدارة الآن — المرجعُ للمطابقة بعد الجولة */
    const names = ['bassam_plan_v1', 'bassam_rounds_v1', 'bassam_rounds_arc_v1', 'bassam_tasks_v1', 'bassam_employees_v1', 'bassam_staffing_v3', 'bassam_dreport_v1', 'bassam_shift_options_v1', 'bassam_options_v1'];
    const readAll = () => p.evaluate(async ([d, names]) => { const r = await fetch('/api/operations/read?keys=' + encodeURIComponent(names.map((n) => 'bsdept:' + d + ':' + n).join(','))); const j = await r.json(); return Object.fromEntries(names.map((n) => [n, JSON.stringify(j.resources['bsdept:' + d + ':' + n] ?? null)])); }, [B, names]);
    const before = await readAll();
    assert.ok(before.bassam_rounds_arc_v1.length + before.bassam_rounds_v1.length > 8e6, 'الجولاتُ بحجمها في الإدارة');
    /* التصدير من الكود الحالي: نسخةُ الإدارة النشطة */
    assert.equal(await p.evaluate((d) => KIVO.BassamDepts.setActive(d), B), true);
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000);
    await s.go('#/sysadmin/overview', 1500); await s.go('#/sysadmin/org/' + B + '/data', 3500);   /* V7 · د6: تبويبُ «البيانات» بعنوانه في الشاشة الجديدة */
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 300000 }), p.locator('main [title^="نسخة الإدارة"]').click()]);
    const exported = path.join(path.dirname(file), 'TEST_ONLY-exported.json'); await dl.saveAs(exported);
    const bk = JSON.parse(fs.readFileSync(exported, 'utf8'));
    stamp('exported ' + fs.statSync(exported).size + ' bytes');
    assert.equal(bk.kind, 'dept'); assert.equal(bk.version, 4); assert.equal(bk.manifest.version, 4); assert.ok(Array.isArray(bk.domains.operations));
    assert.deepEqual(Object.keys(bk.idbImages).sort(), Object.keys(f.idbImages).sort(), 'النسخةُ المصدَّرة تحمل الصورَ العشر');
    for (const id of Object.keys(f.idbImages)) assert.equal(bk.idbImages[id] === f.idbImages[id], true, 'بايتاتُ ' + id);
    assert.ok(fs.statSync(exported).size > 30e6, 'تصديرُ نسخةٍ بهذا الحجم يعمل');
    /* المسح */
    const wiped = await p.evaluate(async ([d, uid]) => { const inv = await (await fetch('/api/admin/dept-wipe?dept=' + d)).json(); const r = await fetch('/api/admin/dept-wipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, dept: d, requestId: 'TEST_ONLY_d6_wipe_1', base: inv.base, reason: 'TEST_ONLY جولة د6' }) }); return { s: r.status, j: await r.json() }; }, [B, lab.env.DB.q("SELECT uid FROM sess ORDER BY rowid DESC LIMIT 1")[0].uid]);
    assert.equal(wiped.s, 200, JSON.stringify(wiped.j).slice(0, 300));
    const empty = await readAll();
    assert.equal(JSON.parse(empty.bassam_plan_v1) === null || (JSON.parse(empty.bassam_plan_v1).floors || []).length === 0, true, 'المخططُ مُسح');
    assert.equal(Object.keys(JSON.parse(empty.bassam_rounds_arc_v1) || {}).length + Object.keys(JSON.parse(empty.bassam_rounds_v1) || {}).length, 0, 'الجولاتُ مُسحت');
    stamp('wiped');
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000);
    /* استيرادُ ما صُدِّر (نسخةٌ حديثة — لا «شكل قديم» ولا ما لا يُنقل) */
    sizes.length = 0; slices = 0;
    await chooseFile(s, B, exported);
    const sum = await text(p, '[data-bkc="sum-line"]');
    assert.doesNotMatch(sum, /الشكل القديم/); assert.equal(await p.locator('[data-bkc="skip"]').count(), 0, 'لا شيءَ خارج النقل في نسخةٍ حديثة');
    await click(p, 'استبدال كامل'); await click(p, 'ارفع وتحقّق');
    await p.getByText('تأكيد الاستبدال').first().waitFor({ state: 'visible', timeout: 300000 });
    await click(p, 'نعم، استبدل');
    await p.waitForSelector('[data-bkc="done"]', { timeout: 300000 });
    const done = await text(p, '[data-bkc="done-msg"]');
    assert.match(done, /الصور: (10 جديدة و0|0 جديدة و10) موجودة/, done);
    await click(p, 'تم');
    stamp('exported copy imported · ' + slices + ' slices · ' + done.slice(0, 120));
    assert.ok(slices >= 12, 'والنسخةُ الحديثة المصدَّرة كذلك (صفوفُ مجالها التشغيلي على دفعات): ' + slices);
    assert.ok(Math.max(...sizes) < 8 * 1024 * 1024, 'كلُّ طلبٍ دون 8MB');
    /* المطابقة */
    const after = await readAll();
    for (const n of names) assert.equal(after[n] === before[n], true, n + ' بعد الجولة كما قبلها (' + before[n].length + ' حرفاً)');
    for (const id of Object.keys(f.idbImages)) { const got = await p.evaluate(async (i) => { const r = await fetch('/api/img/' + i); return { s: r.status, t: await r.text() }; }, id); assert.equal(got.s, 200, id); assert.equal(got.t === f.idbImages[id], true, 'الصورة ' + id + ' بعد الجولة'); }
    assert.equal(staged(lab.env.DB), 0);
    assert.deepEqual(s.errs, [], 'لا أخطاء صفحة');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});

/* V7 · د6 (posfix · FIX_IMPORT3_D6): بعد استيراد نسخةٍ بشكل ملف Production (جذرُ الجولات: __pMig أولاً ثم علاماتُ الأشهر ثم الأيام · ≈31MB على دفعات ·
   وأيامٌ حيّة في الشهر الجاري حتى يوم الصفحة) — «المتابعة اليومية» و«التقرير اليومي» تفتحان ببياناتهما بلا قراءةٍ فاشلة، والحفظُ في كلٍّ منهما 200.
   كان مع الخلل: كلُّ قراءةٍ تشمل الجولات 400 operations-member-position ⇒ الصفحتان فارغتان، والتحميلُ 24–36 ث بإعادة المحاولات، وكلُّ حفظٍ 400.
   تُقاس أزمنةُ تحميل «المتابعة اليومية» و«الخطة التشغيلية» بعد الاستيراد وتُذكر (t.diagnostic). */
test('د6 [ثقيل · posfix]: بعد استيراد نسخةٍ جذرُ جولاتها __pMig أولاً — «المتابعة اليومية» و«التقرير اليومي» ببياناتهما والحفظُ فيهما 200 · وأزمنةُ التحميل', { timeout: 900000, ...need }, async (t) => {
  const lab = await startLab(), b = await chromium.launch(), t0 = Date.now(), stamp = (m) => t.diagnostic(m + ' @' + Math.round((Date.now() - t0) / 1000) + 's');
  let dir = null;
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw), p = s.page, reads = [], saves = [];
    p.on('response', async (r) => {
      const u = new URL(r.url());
      if (u.pathname === '/api/operations/read') reads.push({ at: Date.now(), s: r.status(), keys: u.searchParams.get('keys') || '' });
      if (u.pathname === '/api/save' && r.request().method() === 'POST') { let j = null; try { j = await r.json(); } catch (e) { /* بلا جسم */ } saves.push({ at: Date.now(), s: r.status(), ok: j && j.ok, err: j && j.err, keys: Object.keys(JSON.parse(r.request().postData() || '{}').set || {}) }); }
    });
    /* يومُ الصفحة نفسُه (التقويمُ الذي تعرض به الصفحةُ يومَها) ⇒ أيامٌ حيّة في شهره: اليومُ ويومان قبله */
    const T = await p.evaluate(() => KIVO.BassamCal.hNow(new Date(), null));
    assert.ok(T && T.y > 1400 && T.m >= 1 && T.d >= 1, JSON.stringify(T));
    const today = T.y + '-' + T.m + '-' + T.d, open = { y: T.y, m: T.m, days: [T.d - 2, T.d - 1, T.d].filter((d) => d >= 1) };
    const { f, p: file } = await fileOnDisk({ open });
    dir = path.dirname(file);
    const R0 = JSON.parse(f.data.bassam_rounds_v1);
    assert.deepEqual(Object.keys(R0).slice(0, 2), ['__pMig', 'm:1448-5'], 'جذرُ الجولات كملف Production: __pMig أولاً'); assert.ok(today in R0, 'يومُ الصفحة في النسخة');
    stamp('file ' + fs.statSync(file).size + ' bytes · today ' + today);
    /* الاستيرادُ من الواجهة: استبدالٌ كامل */
    let slices = 0;
    p.on('request', (r) => { if (/\/api\/backup\/import/.test(r.url()) && r.method() === 'POST' && /"phase":"slice"/.test((r.postData() || '').slice(0, 400))) slices++; });
    await chooseFile(s, B, file);
    await click(p, 'استبدال كامل'); await click(p, 'ارفع وتحقّق');
    await Promise.race([p.getByText('تأكيد الاستبدال').first().waitFor({ state: 'visible', timeout: 300000 }), p.waitForSelector('[data-bkc="fail"]', { timeout: 300000 })]);
    if (await p.locator('[data-bkc="fail"]').count()) assert.fail('فشل الاستيراد: ' + (await text(p, '[data-bkc="fail-msg"]')));
    await click(p, 'نعم، استبدل');
    await p.waitForSelector('[data-bkc="done"]', { timeout: 300000 });
    await click(p, 'تم');
    stamp('imported · ' + slices + ' slices');
    assert.ok(slices >= 12, 'الجولاتُ أُرسلت دفعاتٍ: ' + slices);
    /* كلُّ موردٍ تشغيليٍّ للإدارة يُقرأ وحده بـ200 */
    const res = lab.env.DB.q('SELECT DISTINCT resource r FROM ops_nodes WHERE department_id=?1 ORDER BY resource', B).map((x) => x.r);
    const st = await p.evaluate(async ([d, res]) => { const o = {}; for (const r of res) o[r] = (await fetch('/api/operations/read?keys=' + encodeURIComponent('bsdept:' + d + ':' + r))).status; return o; }, [B, res]);
    assert.deepEqual(st, Object.fromEntries(res.map((r) => [r, 200])), 'كلُّ موردٍ يُقرأ بعد الاستيراد');
    assert.equal(await p.evaluate((d) => KIVO.BassamDepts.setActive(d), B), true);
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
    /* مكوّنُ الصفحة المفتوحة (الصنفُ الذي يحمل الدالة) — من شجرة React */
    const find = (fn) => p.evaluate((fn) => {
      for (const el of document.querySelectorAll('main *')) {
        const fk = Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0); let f = fk ? el[fk] : null;
        while (f) { const n = f.stateNode; for (const c of [n, n && n.logic]) if (c && typeof c[fn] === 'function') { window.__posfix = c; return true; } f = f.return; }
      }
      return false;
    }, fn);
    const timed = async (hash, ready, arg = null) => {
      const at = Date.now(), r0 = reads.length;
      await p.evaluate((h) => { location.hash = h; }, hash);
      try { await p.waitForFunction(ready, arg, { timeout: 120000, polling: 200 }); } catch (e) { throw new Error(hash + ': ' + e.message + ' · ' + AR(await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))).slice(0, 1500)); }
      return { ms: Date.now() - at, reads: reads.slice(r0) };
    };
    /* «المتابعة اليومية»: يومُ الصفحة بجولته (طوابقُه ومصلياتُه) */
    const daily = await timed('#/daily', ([day]) => { const m = document.querySelector('main'); if (!m) return false; for (const el of m.querySelectorAll('*')) { const fk = Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0); let f = fk ? el[fk] : null; while (f) { const n = f.stateNode; for (const c of [n, n && n.logic]) if (c && typeof c.saveRounds === 'function' && c.state && c.state.rounds && c.state.rounds[day] && c.state.rounds[day].d && c.state.rounds[day].d.length) return true; f = f.return; } } return false; }, [today]);
    stamp('«المتابعة اليومية» ' + daily.ms + ' ms · ' + daily.reads.length + ' قراءة (' + daily.reads.map((x) => x.s).join(',') + ')');
    t.diagnostic('POSFIX_TIMING daily_ms=' + daily.ms);
    assert.equal(daily.reads.filter((x) => x.s !== 200).length, 0, 'لا قراءةَ فاشلة: ' + JSON.stringify(daily.reads.map((x) => x.s)));
    assert.ok(await find('saveRounds'));
    const dayIn = await p.evaluate(([day]) => { const r = window.__posfix.state.rounds; return { pMig: r.__pMig, day: JSON.stringify(r[day].d.map((x) => x.zones.length)), n: Object.keys(r).filter((k) => /^\d{4}-\d+-\d+/.test(k)).length }; }, [today]);
    assert.equal(dayIn.pMig, 2); assert.equal(dayIn.n, 26 + open.days.length, 'كلُّ أيام النسخة (الحيّةُ والمؤرشفة) في الصفحة'); assert.equal(dayIn.day, JSON.stringify(R0[today].d.map((x) => x.zones.length)));
    /* والصفحةُ تعرض جولةَ اليوم: تبويبُ «الجولات اليومية» — الموقعُ النشط طابقُ النسخة ومصلياتُها برموزها */
    const code = R0[today].d[0].zones[0].code;
    await p.getByText('الجولات اليومية', { exact: true }).first().click();
    let shown = '';
    for (let i = 0; i < 40 && !(shown.includes(code) && /الموقع النشط: TEST_ONLY . طابق د6 1/.test(shown)); i++) { await p.waitForTimeout(250); shown = AR(await p.evaluate(() => document.body.innerText.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' '))); }
    assert.match(shown, /الموقع النشط: TEST_ONLY . طابق د6 1/, 'الجولات اليومية: طابقُ النسخة');
    assert.ok(shown.includes('مصلى ' + code + ' '), 'ومصلياتُها برموزها (' + code + '): ' + shown.slice(shown.indexOf('الموقع النشط'), shown.indexOf('الموقع النشط') + 300));
    /* الحفظُ من الصفحة (دالّتُها saveRounds — طريقُ الواجهة نفسُه إلى /api/save) */
    let n0 = saves.length;
    const sv = await p.evaluate(async ([day]) => { const c = window.__posfix, live = JSON.parse(JSON.stringify(c._opRead('bassam_rounds_v1'))); live[day].d[0].zones[0].name += ' (حُفظ بعد الاستيراد)'; const r = await c.saveRounds(live); return r && r.ok; }, [today]);
    await p.waitForTimeout(800);
    const dailySaves = saves.slice(n0);
    assert.ok(dailySaves.length >= 1 && dailySaves.every((x) => x.s === 200 && x.ok === 1), 'الحفظُ في «المتابعة اليومية» 200: ' + JSON.stringify(dailySaves) + ' · ' + sv);
    assert.ok(dailySaves.some((x) => x.keys.includes('bsdept:' + B + ':bassam_rounds_v1')), JSON.stringify(dailySaves));
    const after = await p.evaluate(async ([d, day]) => (await (await fetch('/api/operations/read?keys=' + encodeURIComponent('bsdept:' + d + ':bassam_rounds_v1'))).json()).resources['bsdept:' + d + ':bassam_rounds_v1'][day].d[0].zones[0].name, [B, today]);
    assert.match(after, /حُفظ بعد الاستيراد/);
    /* «التقرير اليومي»: يفتح بتقريره ويقرأ الجولات بلا فشل */
    const dr = await timed('#/dreport', () => { const m = document.querySelector('main'); if (!m) return false; for (const el of m.querySelectorAll('*')) { const fk = Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0); let f = fk ? el[fk] : null; while (f) { const n = f.stateNode; for (const c of [n, n && n.logic]) if (c && typeof c.rpSave === 'function') { const v = c.rpLoad(); return !!v && Object.keys(v).length > 0; } f = f.return; } } return false; });
    stamp('«التقرير اليومي» ' + dr.ms + ' ms · ' + dr.reads.length + ' قراءة (' + dr.reads.map((x) => x.s).join(',') + ')');
    t.diagnostic('POSFIX_TIMING dreport_ms=' + dr.ms);
    assert.equal(dr.reads.filter((x) => x.s !== 200).length, 0, 'لا قراءةَ فاشلة: ' + JSON.stringify(dr.reads.map((x) => x.s)));
    assert.ok(await find('rpSave'));
    const want = JSON.parse(f.data.bassam_dreport_v1);
    const drKeys = await p.evaluate(() => Object.keys(window.__posfix.rpLoad()));
    assert.deepEqual(drKeys.sort(), Object.keys(want).sort(), 'التقريرُ اليومي بأيامه كما في النسخة');
    n0 = saves.length;
    await p.evaluate(async () => { const c = window.__posfix, v = c.rpLoad(), k = Object.keys(v).filter((x) => x.indexOf('m:') !== 0)[0]; v[k] = { ...v[k], created: (v[k].created || 1795000000000) + 1 }; return await c.rpSave(v); });   /* تعديلٌ حقيقي في يومٍ من التقرير */
    await p.waitForTimeout(800);
    const drSaves = saves.slice(n0);
    assert.ok(drSaves.length >= 1 && drSaves.every((x) => x.s === 200 && x.ok === 1), 'الحفظُ في «التقرير اليومي» 200: ' + JSON.stringify(drSaves));
    /* «الخطة التشغيلية» بعد الاستيراد: زمنُ التحميل */
    const plan = await timed('#/plan', () => /الموقع النشط:\s*TEST_ONLY/.test(((document.querySelector('main') || document.body).innerText || '').replace(/[‎‏‪-‮⁦-⁩]/g, '')));
    stamp('«الخطة التشغيلية» ' + plan.ms + ' ms · ' + plan.reads.length + ' قراءة (' + plan.reads.map((x) => x.s).join(',') + ')');
    t.diagnostic('POSFIX_TIMING plan_ms=' + plan.ms);
    assert.equal(plan.reads.filter((x) => x.s !== 200).length, 0, 'لا قراءةَ فاشلة في الخطة: ' + JSON.stringify(plan.reads.map((x) => x.s)));
    assert.deepEqual(s.errs, [], 'لا أخطاء صفحة');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); if (dir) try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* مؤقت */ } }
});
