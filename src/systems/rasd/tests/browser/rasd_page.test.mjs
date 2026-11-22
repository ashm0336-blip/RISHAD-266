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
const text = (page) => page.evaluate(() => document.querySelector('main').innerText);

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

    /* نسخةُ الإدارة (من صفحة العقدة · «البيانات» — مديرُ المنصة) تحمل مفتاحَي النظام بنصّهما */
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    await su.go('#/sysadmin/org/' + A, 3500);
    await su.page.locator('main [aria-label="أقسام صفحة العقدة"] button', { hasText: 'البيانات' }).click(); await su.page.waitForTimeout(800);
    const [dl] = await Promise.all([su.page.waitForEvent('download', { timeout: 30000 }), su.page.locator('main [title^="نسخة الإدارة"]').click()]);
    const file = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    assert.deepEqual(JSON.parse(file.data[REC]), readK(T.DB, key(A, REC)), 'the department copy lacks the rasd records');
    assert.ok(file.data[OPT] && JSON.parse(file.data[OPT]).type.some((x) => x.n === 'TEST_ONLY نوع'), 'the department copy lacks the rasd lists');
    assert.ok(file.manifest.keys.includes(REC) && file.manifest.keys.includes(OPT));
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
    assert.equal(readK(T.DB, key(A, REC)).reports.length, 1, 'switching off removed stored data');
    await s2.ctx.close();

    /* ③ وحدةٌ مفتوحة (لا سجلَّ سقفٍ فيها ولا في أصلها): النظامُ الجديد لا يُفتح ضمناً، وبقيةُ الأنظمة مفتوحة */
    const P = readK(T.DB, 'bassam_perms_v1'); delete P.caps[A]; delete P.caps[G]; await putK(T, 'bassam_perms_v1', P);
    const s3 = await openAs(b, lab, LAB.mgrA, LAB.pw), p3 = s3.page;
    const on = await p3.evaluate(() => ({ rasd: KIVO.BassamPerm.on('rasd'), irshad: KIVO.BassamPerm.on('irshad'), seized: KIVO.BassamPerm.on('seized'), state: KIVO.BassamPerm.capState ? KIVO.BassamPerm.capState().kind : '' }));
    assert.deepEqual(on, { rasd: false, irshad: true, seized: true, state: 'open' });
    assert.equal(await p3.locator('aside [data-key="rasd"]:visible').count(), 0);
    await s3.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
