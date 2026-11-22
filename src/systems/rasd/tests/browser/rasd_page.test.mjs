/* V7 · د6 (رصد الحالات) — المتصفحُ الحقيقي على العامل المبنيّ في المختبر المعزول (TEST_ONLY · بلا شبكة):
   ① مديرُ الإدارة والنظامُ مفعّلٌ لوحدته: الرابطُ في القائمة · المحضرُ بحقوله وقوائمه المنسدلة (الجهةُ تظهر مع «إبلاغ جهة مختصة» وحدها ·
      الموقعُ مصفّىً بالمنطقة) · «إضافة» تحفظ السجلَّ في الخادم · الجدول والكروت · قائمةٌ تُدار من داخلها (إضافة · تعديلٌ يسري على السجل) ·
      التنبيهُ العاجل لمدير الإدارة · «سجل الحركة» · لوحتُه في «مؤشرات الإدارة» · نسخةُ الإدارة تحمله.
   ② النظامُ مطفأٌ للوحدة: لا رابط ولا صفحة ولا لوحة ولا تنبيه — والمخزَّنُ باقٍ.  ③ وحدةٌ مفتوحة بلا سجلّ سقف: النظامُ الجديد مطفأ وبقيةُ الأنظمة كما هي. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startLab, LAB } from '../../../../../tests/browser/local_server.mjs';
import { chromium, openAs } from '../../../../../tests/browser/lab_browser.mjs';
import { A, G, REC, OPT, key, readK, putK, rasdOn } from '../rasd_fx.mjs';

const T0 = (lab) => ({ DB: lab.env.DB, lab });
const click = (page, sel, text) => page.evaluate(([sel, text]) => { const el = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim() === text && x.getClientRects().length); if (!el) return false; el.click(); return true; }, [sel, text]);
const field = async (page, label) => { const ok = await page.evaluate((label) => { const w = [...document.querySelectorAll('main div')].find((d) => d.firstElementChild && d.firstElementChild.textContent.trim().startsWith(label) && d.querySelector(':scope > button')); if (!w) return false; w.querySelector(':scope > button').click(); return true; }, label); assert.ok(ok, 'field «' + label + '» not found'); await page.waitForTimeout(250); };
const pick = async (page, text) => { assert.ok(await click(page, '[role=listbox] div span', text), 'option «' + text + '» not found'); await page.waitForTimeout(250); };
/* نصُّ الصفحة بأرقامٍ لاتينية وبلا علامات الاتجاه (طبقةُ العرض تكتب الأرقام عربيةً) */
const text = (page) => page.evaluate(() => document.querySelector('main').innerText.replace(/[\u2066-\u2069\u202a-\u202e\u200e\u200f]/g, '').replace(/[٠-٩]/g, (x) => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)));

test('rasd · ① الصفحةُ والمحضرُ والقوائم والسجلُّ والكروت والتنبيه والسجلّ واللوحة ونسخةُ الإدارة — ② مطفأٌ لا يظهر منه شيء — ③ الوحدةُ المفتوحة', { timeout: 600000 }, async () => {
  const lab = await startLab(), T = T0(lab);
  await rasdOn(T, A, true);
  const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page;
    assert.equal(await p.locator('aside [data-key="rasd"]:visible').count(), 1, 'the side menu link is shown when rasd is ON');
    await s.go('#/rasd', 4500);
    let t = await text(p);
    assert.match(t, /محضر رصد — يوم/); assert.match(t, /سجل الحالات الشهري/); assert.match(t, /مستوى التأثير/);
    for (const c of ['مستوى التأثير', 'نوع الحالة', 'الإجراء المتخذ', 'الإبلاغ']) assert.ok(t.includes(c), 'KPI card ' + c);
    /* الحقول: الجهةُ مخفيّةٌ حتى «إبلاغ جهة مختصة» */
    assert.ok(!t.includes('الجهة التي تم إبلاغها'), 'party field shown before «إبلاغ جهة مختصة»');
    await field(p, 'المنطقة'); await pick(p, 'المسعى');
    await field(p, 'الدور / المستوى'); await pick(p, 'الأرضي');
    await p.locator('input[aria-label="الموقع التفصيلي"]').click(); await p.waitForTimeout(300);
    const spots = await p.evaluate(() => [...document.querySelectorAll('[role=listbox] div span:nth-child(2)')].map((x) => x.textContent.trim()));
    assert.ok(spots.length && spots.every((x) => /المسعى/.test(x)), 'spots are filtered by the zone: ' + spots.join(' | '));
    await pick(p, 'ممر الصفا');
    await field(p, 'نوع الحالة'); await pick(p, 'ازدحام');
    await field(p, 'الإجراء المتخذ'); await pick(p, 'إبلاغ جهة مختصة');
    assert.ok((await text(p)).includes('الجهة التي تم إبلاغها'), 'party field appears with «إبلاغ جهة مختصة»');
    await field(p, 'الجهة التي تم إبلاغها');
    const parties = await p.evaluate(() => [...document.querySelectorAll('[role=listbox] div span:first-of-type')].map((x) => x.textContent.trim()));
    assert.ok(!parties.includes('لم يتم الإبلاغ'), '«لم يتم الإبلاغ» offered as a party');
    await pick(p, 'العمليات المشتركة');
    assert.ok(await click(p, '[role=radio]', 'حرج'));
    await p.fill('textarea[aria-label="ملاحظات"]', 'TEST_ONLY ملاحظة المتصفح');
    const saved = p.waitForResponse((r) => /\/api\/save\b/.test(r.url()) && r.request().method() === 'POST' && /bassam_rasd_v1/.test(r.request().postData() || ''), { timeout: 15000 });
    assert.ok(await click(p, 'main button', 'إضافة'), 'the save button');
    const r = await saved; assert.equal(r.status(), 200);
    await p.waitForTimeout(1500);
    const doc = readK(T.DB, key(A, REC));
    assert.equal(doc.reports.length, 1);
    const rec = doc.reports[0];
    assert.deepEqual([rec.zone, rec.floor, rec.spot, rec.type, rec.act, rec.party, rec.impact, rec.notes], ['المسعى', 'الأرضي', 'ممر الصفا', 'ازدحام', 'إبلاغ جهة مختصة', 'العمليات المشتركة', 'حرج', 'TEST_ONLY ملاحظة المتصفح']);
    assert.ok(rec.t && rec.lt && rec.by && rec.byName && rec.dept, 'auto fields recorded');
    t = await text(p);
    assert.ok(t.includes('ممر الصفا') && t.includes('العمليات المشتركة'), 'the new case is in the records table');
    /* التنبيهُ العاجل وصل مدير الإدارة */
    await p.waitForTimeout(1500);
    const feed = await s.api('/api/notifications?uid=' + encodeURIComponent(await p.evaluate(() => window.__BS_BOOT.uid)));
    assert.match(JSON.stringify(feed.j || feed), /حرج — ازدحام/, 'urgent rz_hot not in the manager feed');
    /* فتحُ الشهر المقفل من الواجهة (نقرةٌ مزدوجة لحامل approve ← سببٌ ← نافذةُ استدراكٍ على الخادم) ثم تسجيلُ حالةٍ في يومٍ منه */
    const prev = await p.evaluate(() => { const t = KIVO.BassamCal.hToday(); return t.m > 1 ? { y: t.y, m: t.m - 1 } : { y: t.y - 1, m: 12 }; });
    const MN = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
    if (prev.m === 12) await click(p, 'main button[title="السنة السابقة"]', '');   /* محرم: الشهرُ السابق في السنة الماضية */
    assert.ok(await p.evaluate((name) => { const el = [...document.querySelectorAll('main [title*="انقضى"]')].find((d) => d.querySelector('p') && d.querySelector('p').textContent.trim() === name); if (!el) return false; el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); return true; }, MN[prev.m - 1]), 'the locked previous month card');
    await p.locator('textarea:visible').last().waitFor({ timeout: 10000 });
    await p.locator('textarea:visible').last().fill('TEST_ONLY استدراك من الواجهة');
    const opened = p.waitForResponse((r) => /\/api\/retro\b/.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 });
    assert.ok(await click(p, 'button', 'حفظ بالسبب'), 'the reason dialog');
    assert.equal((await opened).status(), 200);
    await p.waitForTimeout(1500);
    const st = readK(T.DB, key(A, 'bassam_rasd_retro_v1'));
    assert.ok(st && st.windows.some((w) => w.scope.y === prev.y && w.scope.m === prev.m && w.scope.d == null && !w.closedAt), 'no server window for the opened month');
    assert.ok(await p.evaluate(() => { const el = [...document.querySelectorAll('main .bs-daystrip > div')].find((d) => d.firstElementChild && d.firstElementChild.textContent.replace(/[^0-9٠-٩]/g, '').replace(/[٠-٩]/g, (x) => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)) === '1'); if (!el) return false; el.click(); return true; }), 'day 1 of the opened month');
    await p.waitForTimeout(500);
    assert.match(await text(p), /محضر رصد — يوم 1 /);
    await field(p, 'المنطقة'); await pick(p, 'الأبواب');
    await field(p, 'الدور / المستوى'); await pick(p, 'الأرضي');
    await p.locator('input[aria-label="الموقع التفصيلي"]').click(); await p.waitForTimeout(300); await pick(p, 'باب الملك فهد');
    await field(p, 'نوع الحالة'); await pick(p, 'ازدحام');
    await field(p, 'الإجراء المتخذ'); await pick(p, 'تنظيم حركة');
    assert.ok(await click(p, '[role=radio]', 'منخفض'));
    const saved2 = p.waitForResponse((r) => /\/api\/save\b/.test(r.url()) && r.request().method() === 'POST' && /bassam_rasd_v1/.test(r.request().postData() || ''), { timeout: 15000 });
    assert.ok(await click(p, 'main button', 'إضافة'));
    const r2 = await saved2; assert.equal(r2.status(), 200);
    await p.waitForTimeout(1200);
    assert.ok(readK(T.DB, key(A, REC)).reports.some((x) => x.y === prev.y && x.m === prev.m && x.d === 1), 'the case in the opened month was not stored');
    await s.go('#/rasd', 2500);
    /* «سجل الحركة» يحمل الحفظ */
    assert.ok(T.DB.q('SELECT COUNT(*) n FROM aud WHERE k=?1', key(A, REC))[0].n >= 1, 'no activity-log line for the save');
    /* قائمةٌ تُدار من داخلها: إضافةُ نوع ثم تعديلُ اسمه — يسري على السجل */
    await field(p, 'نوع الحالة');
    await p.locator('[role=listbox] input[placeholder^="إضافة"]').fill('TEST_ONLY نوع');
    await p.locator('[role=listbox] button[title="إضافة"]').click(); await p.waitForTimeout(1200);
    assert.ok(readK(T.DB, key(A, OPT)).type.some((x) => x.n === 'TEST_ONLY نوع'), 'the new list value is stored');
    await field(p, 'نوع الحالة');
    await p.evaluate(() => { const row = [...document.querySelectorAll('[role=listbox] > div')].find((d) => d.textContent.includes('ازدحام')); row.querySelector('button[title="تعديل الاسم"]').click(); });
    await p.waitForTimeout(250);
    await p.locator('[role=listbox] input[aria-label="الاسم الجديد"]').fill('TEST_ONLY ازدحام');
    await click(p, '[role=listbox] button', 'حفظ'); await p.waitForTimeout(1500);
    assert.equal(readK(T.DB, key(A, REC)).reports[0].type, 'TEST_ONLY ازدحام', 'renaming the list value did not reach the recorded case');
    /* لوحتُه في «مؤشرات الإدارة» */
    await s.go('#/kpis', 4500);
    assert.ok(await click(p, 'main span', 'لوحة مؤشرات رصد الحالات'), 'the rasd KPI tab');
    await p.waitForTimeout(2500);
    t = await text(p);
    assert.match(t, /إجمالي الحالات المرصودة/); assert.match(t, /عالية\/حرجة/); assert.match(t, /الملخص التفصيلي حسب المنطقة/);
    assert.deepEqual(s.errs, [], 'page errors: ' + s.errs.join(' | '));
    await s.ctx.close();

    /* نسخةُ الإدارة (من «الإدارات والصلاحيات» · «البيانات» — مديرُ المنصة) تحمل مفتاحَي النظام بنصّهما */
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    assert.equal(await su.page.evaluate((d) => KIVO.BassamDepts.setActive(d), A), true);   /* نسخةُ الإدارة النشطة (كما في اختبار الاستيراد) */
    await su.page.reload({ waitUntil: 'domcontentloaded' }); await su.page.waitForTimeout(3000);
    await su.go('#/sysadmin/overview', 1500); await su.go('#/sysadmin/org/' + A + '/data', 3500);   /* V7 · د6: تبويبُ «البيانات» من العنوان (صفحة «الإدارات والصلاحيات») */
    const [dl] = await Promise.all([su.page.waitForEvent('download', { timeout: 30000 }), su.page.locator('main [data-org-tab="data"] [title^="نسخة الإدارة"]').click()]);
    const file = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    assert.deepEqual(JSON.parse(file.data[REC]), readK(T.DB, key(A, REC)), 'the department copy lacks the rasd records');
    assert.ok(file.data[OPT] && JSON.parse(file.data[OPT]).type.some((x) => x.n === 'TEST_ONLY نوع'), 'the department copy lacks the rasd lists');
    assert.ok(file.manifest.keys.includes(REC) && file.manifest.keys.includes(OPT));
    /* الاستيرادُ من الواجهة (المسارُ المجزّأ نفسُه — «الإدارات والصلاحيات» ← «البيانات» ← استيراد · استبدالٌ كامل): تُغيَّر مفاتيحُ النظام الثلاثة في الإدارة
       ثم تُستعاد النسخةُ فوقها ⇒ السجلاتُ والقوائمُ ونوافذُ الاستدراك كما في النسخة نصّاً (النوافذُ srv: تعيدها الاستعادةُ الخادمية المتحقَّقة وحدها) */
    const ui = (t) => su.page.getByText(t, { exact: true }).last(), RK = key(A, 'bassam_rasd_retro_v1');
    const fpath = await dl.path() + '.json'; fs.copyFileSync(await dl.path(), fpath);
    assert.ok(file.data.bassam_rasd_retro_v1 && JSON.parse(file.data.bassam_rasd_retro_v1).windows.length, 'the department copy lacks the retro windows');
    await putK(T, key(A, REC), { reports: [] }); await putK(T, key(A, OPT), { zone: [], floor: [], type: [], act: [], party: [], spot: [] }); await putK(T, RK, { windows: [] });
    await su.go('#/sysadmin/overview', 1500); await su.go('#/sysadmin/org/' + A + '/data', 3500);
    const [fc] = await Promise.all([su.page.waitForEvent('filechooser', { timeout: 15000 }), su.page.locator('main [title^="استيراد نسخة احتياطية إلى هذه الإدارة"]').click()]);
    await fc.setFiles(fpath);
    await su.page.waitForSelector('[data-bkc="summary"]', { timeout: 20000 });
    await ui('استبدال كامل').click(); await ui('ارفع وتحقّق').click();
    await Promise.race([su.page.getByText('تأكيد الاستبدال').first().waitFor({ state: 'visible', timeout: 120000 }), su.page.waitForSelector('[data-bkc="fail"]', { timeout: 120000 })]);
    assert.equal(await su.page.locator('[data-bkc="fail"]').count(), 0, 'the import failed: ' + (await su.page.locator('[data-bkc="fail-msg"]').allInnerTexts()).join(' '));
    await ui('نعم، استبدل').click();
    await su.page.waitForSelector('[data-bkc="done"]', { timeout: 120000 });
    await ui('تم').click();
    assert.deepEqual(readK(T.DB, key(A, REC)), JSON.parse(file.data[REC]), 'the restored unit lacks the rasd records');
    assert.deepEqual(readK(T.DB, key(A, OPT)), JSON.parse(file.data[OPT]), 'the restored unit lacks the rasd lists');
    assert.deepEqual(readK(T.DB, RK), JSON.parse(file.data.bassam_rasd_retro_v1), 'the restored unit lacks the rasd retro windows');
    fs.unlinkSync(fpath);
    await su.ctx.close();

    /* ② مطفأٌ للوحدة: لا رابط ولا صفحة ولا لوحة ولا تنبيه — والمخزَّن باقٍ */
    await rasdOn(T, A, false);
    const s2 = await openAs(b, lab, LAB.mgrA, LAB.pw), p2 = s2.page;
    assert.equal(await p2.locator('aside [data-key="rasd"]:visible').count(), 0, 'the side link of a switched-off system is shown');
    await s2.go('#/rasd', 3500);
    assert.ok(!/محضر رصد|سجل الحالات الشهري/.test(await text(p2)), 'the rasd page opens while OFF');
    await s2.go('#/kpis', 3500);
    assert.ok(!/لوحة مؤشرات رصد الحالات/.test(await text(p2)), 'the rasd KPI tab is shown while OFF');
    const feed2 = await s2.api('/api/notifications?uid=' + encodeURIComponent(await p2.evaluate(() => window.__BS_BOOT.uid)));
    assert.ok(!/حرج — ازدحام/.test(JSON.stringify(feed2.j || feed2)), 'a notification of the switched-off system is shown');
    assert.ok(!/رصد الحالات/.test(await p2.evaluate(() => (document.querySelector('aside') || document.body).innerText)), 'the side menu names the switched-off system');
    assert.equal(readK(T.DB, key(A, REC)).reports.length, 2, 'switching off removed stored data');
    await s2.ctx.close();

    /* ③ وحدةٌ مفتوحة (لا سجلَّ سقفٍ فيها ولا في أصلها): النظامُ الجديد لا يُفتح ضمناً، وبقيةُ الأنظمة مفتوحة */
    const P = readK(T.DB, 'bassam_perms_v1'); delete P.caps[A]; delete P.caps[G]; await putK(T, 'bassam_perms_v1', P);
    const s3 = await openAs(b, lab, LAB.mgrA, LAB.pw), p3 = s3.page;
    const on = await p3.evaluate(() => ({ rasd: KIVO.BassamPerm.on('rasd'), irshad: KIVO.BassamPerm.on('irshad'), seized: KIVO.BassamPerm.on('seized'), state: KIVO.BassamPerm.capState ? KIVO.BassamPerm.capState().kind : '' }));
    assert.deepEqual(on, { rasd: false, irshad: true, seized: true, state: 'open' });
    assert.equal(await p3.locator('aside [data-key="rasd"]:visible').count(), 0);
    /* نظامٌ مصطنع يعلن optIn — «جائزة التميز» في قائمة الأنظمة التي يحملها غلافُ هذه الجلسة وحدها: القاعدةُ الواحدة في الواجهة تطفئه في الوحدة المفتوحة */
    let swapped = 0;
    const s4 = await openAs(b, lab, LAB.mgrA, LAB.pw, { onPage: (pg) => pg.route('**/*', async (route) => {
      if (/\/api\//.test(route.request().url())) return route.continue().catch(() => {});
      let r; try { r = await route.fetch(); } catch (e) { return route.abort().catch(() => {}); }
      const ct = r.headers()['content-type'] || '';
      if (!/html|javascript/.test(ct)) return route.fulfill({ response: r }).catch(() => {});
      let body = await r.text(); const n0 = body.length;
      body = body.replace('{"key":"award","name":"جائزة التميز"', '{"key":"award","optIn":true,"name":"جائزة التميز"'); if (body.length !== n0) swapped++;
      return route.fulfill({ response: r, body }).catch(() => {});
    }) });
    assert.ok(swapped > 0, 'the systems list was not found in the shell');
    const syn = await s4.page.evaluate(() => ({ list: KIVO.Perm44.sysList().filter((x) => x.optIn).map((x) => x.key).sort(), cap: KIVO.BassamPerm.deptCap(KIVO.BassamDepts.active()) }));
    assert.deepEqual(syn.list, ['award', 'rasd']);
    assert.ok(!syn.cap.includes('award') && !syn.cap.includes('rasd') && syn.cap.includes('irshad') && syn.cap.includes('seized') && syn.cap.includes('daily'), 'client open ceiling with a synthetic optIn system: ' + JSON.stringify(syn.cap));
    await s4.ctx.close();
    await s3.ctx.close();
  } finally { await b.close(); await lab.close(); }
});

/* ④ صفحةُ «الإدارات والصلاحيات» (src/modules/org): رصدُ الحالات في «الأنظمة» (مفتاحُ المنصة ومفتاحُ الوحدة يُحفظ ويسري) · في محرّر الدور بمستوياته وأفعاله الحسّاسة
      وفي «اختبار الوصول» · وفي عدّاد أنظمة الشجرة — كلُّه من قائمة الأنظمة الواحدة (لا اسمَ نظامٍ في الصفحة) */
const digits = (x) => String(x).replace(/[\u2066-\u2069\u202a-\u202e\u200e\u200f]/g, '').replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
test('rasd · ④ «الإدارات والصلاحيات»: الأنظمة (المنصة · الوحدة) · محرّرُ الدور بمستوياته وحسّاسه · عدّادُ الشجرة', { timeout: 600000 }, async () => {
  const lab = await startLab(), T = T0(lab);
  await rasdOn(T, A, true);
  const b = await chromium.launch();
  try {
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw), p = su.page;
    const sw = (n) => p.locator('main [role=switch][aria-label="' + n + '"]');
    /* المنصة: مفتاحُه حاضرٌ ومتاح، وعدّادُ الشجرة يعدّه */
    await su.go('#/sysadmin/org/platform/systems', 3500);
    assert.equal(await sw('نظام رصد الحالات').count(), 1, 'no platform switch for rasd');
    assert.equal(await sw('نظام رصد الحالات').isDisabled(), false, 'the platform switch is locked');
    const rows = await p.locator('main [data-org-tab="systems"] [role=switch]').count();
    const all = await p.evaluate(() => KIVO.Perm44.sysList().filter((x) => x.toggle !== false).length);
    assert.ok(all >= rows && rows > 0);
    const plat = digits((await p.locator('main [data-og-col="systems"]').first().innerText()).trim());
    assert.equal(plat.split('/')[1], String(all), 'the tree systems count (' + plat + ') does not count every switchable system');
    assert.ok(await p.evaluate(() => KIVO.Perm44.sysList().some((x) => x.key === 'rasd' && x.toggle !== false)));
    /* الوحدة: مفعّلٌ (سجلُّها يحمله) ⇒ إطفاؤه من المفتاح ← مراجعة ← حفظ يسري على السقف وعلى عدّاد الشجرة */
    await su.go('#/sysadmin/org/' + A + '/systems', 3500);
    const ua = sw('نظام رصد الحالات');
    assert.equal(await ua.getAttribute('aria-checked'), 'true', 'the unit switch does not show rasd ON');
    const before = Number(digits(await p.locator('main [data-og-col="systems"]').nth(2).innerText()).split('/')[0]);
    await ua.click(); await p.waitForTimeout(400);
    await p.locator('main [aria-label="حفظ الأنظمة"] button', { hasText: 'مراجعة وحفظ' }).click(); await p.waitForTimeout(600);
    assert.match(await p.locator('[role=dialog]').last().innerText(), /نظام رصد الحالات/, 'the review does not name rasd');
    await p.locator('[role=dialog] button', { hasText: /^حفظ$/ }).last().click(); await p.waitForTimeout(800);
    if (await p.locator('textarea:visible').count()) { await p.locator('textarea:visible').last().fill('TEST_ONLY إطفاء'); await click(p, 'button', 'حفظ بالسبب'); }
    await p.waitForTimeout(2500);
    assert.ok(!readK(T.DB, 'bassam_perms_v1').caps[A].includes('rasd'), 'switching rasd OFF for the unit was not saved');
    await su.go('#/sysadmin/org/' + A + '/systems', 3000);
    assert.equal(await sw('نظام رصد الحالات').getAttribute('aria-checked'), 'false');
    assert.equal(Number(digits(await p.locator('main [data-og-col="systems"]').nth(2).innerText()).split('/')[0]), before - 1, 'the tree count did not drop by rasd');
    await rasdOn(T, A, true); await p.reload(); await p.waitForTimeout(2500);   /* السقفُ يُقرأ عند الإقلاع */
    /* محرّرُ الدور: دورٌ جديد ⇒ رصدُ الحالات بين أنظمته · المستويات · «مخصّص» يُظهر أفعاله والحسّاسُ معلَّم · وفي «اختبار الوصول» */
    await su.go('#/sysadmin/org/' + A + '/roles', 3500);
    await p.getByText('+ دور جديد', { exact: true }).first().click(); await p.waitForTimeout(1000);
    const rs = p.locator('main [role=switch][aria-label="تفعيل نظام رصد الحالات لهذا الدور"]');
    assert.equal(await rs.count(), 1, 'rasd is not in the role editor');
    await rs.click(); await p.waitForTimeout(600);
    const lv = p.locator('main select[aria-label="مستوى نظام رصد الحالات"]');
    const lvs = await lv.locator('option').allInnerTexts();
    for (const x of ['مشاهدة فقط', 'إدخال', 'تعديل', 'كامل', 'مخصّص']) assert.ok(lvs.includes(x), 'level ' + x + ' missing: ' + lvs.join(','));
    await lv.selectOption({ label: 'مخصّص' }); await p.waitForTimeout(800);
    const keys = await p.locator('main [role=group][aria-label="أفعال نظام رصد الحالات"] button').evaluateAll((bs) => bs.map((x) => ({ t: x.firstChild.textContent.trim(), s: !!x.querySelector('.p44-sens') })));
    const has = (t, s) => keys.some((k) => k.t.includes(t) && k.s === s);
    assert.ok(has('إضافة سجل', false) && has('عرض السجلات', false), 'rasd actions in custom: ' + JSON.stringify(keys));
    assert.ok(has('حذف سجل', true) && has('فتح شهر/يوم مقفل للاستدراك', true) && has('حذف جميع تقارير رصد الحالات للشهر', true), 'rasd sensitive actions are not marked: ' + JSON.stringify(keys));
    assert.ok(!keys.some((k) => k.t.includes('تغيير الحالة')), 'the reserved rz.rec.status is assignable');
    const chk = await p.locator('main [aria-label="اختبار الوصول"] select option').evaluateAll((os) => os.map((o) => o.value));
    for (const k of ['rz.rec.view', 'rz.rec.create', 'rz.rec.retro.open', 'ref.rasd.list.edit']) assert.ok(chk.includes(k), 'rasd action ' + k + ' is not in the access check');
    assert.deepEqual(su.errs, [], 'page errors: ' + su.errs.join(' | '));
    await su.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
