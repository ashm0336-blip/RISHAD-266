/* V7 · 53 — M1 (REPLY_52_MERGE_53 §5): فشلُ وحدةٍ واحدة لا يُسقط صفحات مدير المنصة ولا «الإعدادات ← الصلاحيات» — متصفحٌ حقيقي على المختبر (TEST_ONLY).
   قراءةُ الوحدة TEST_ONLY_A تُجبر على 500 (`/api/operations/read` لمفاتيحها وحدها). كان «مركز إدارة رشاد» كلُّه «تعذّر التحميل» لأن قراءته المعلنة
   (operationsReadSets.Admin) كانت مواردَ الوحدة النشطة كلَّها. المطلوب:
     ① المركزُ يفتح كاملاً (نظرة عامة · الإدارات والصلاحيات) والانتقالُ بين أقسامه يعمل.   ② مبدّلُ الوحدة متاح، والوحدةُ الأخرى (TEST_ONLY_B) تعمل.
     ③ مديرُ الوحدة: «الإعدادات ← الصلاحيات» تفتح، وقسمُ «الورديات» وحده يعرض فشلَه بمكوّن حالات الصفحة و«أعد المحاولة» — ويعمل بعد زوال العطل. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B';
const failUnit = async (s, unit) => {
  const st = { on: true, hits: 0 };
  await s.page.route('**/api/operations/read*', (r) => {
    const keys = decodeURIComponent(new URL(r.request().url()).searchParams.get('keys') || '');
    if (st.on && keys.split(',').some((k) => k.startsWith('bsdept:' + unit + ':'))) { st.hits++; return r.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":0,"err":"worker-error","rid":"TEST_ONLY"}' }); }
    return r.continue();
  });
  return st;
};
const pageError = (s) => s.page.evaluate(() => [...document.querySelectorAll('[data-ps="error"]')].filter((e) => !e.classList.contains('ps-region')).map((e) => e.innerText.replace(/\s+/g, ' ')));

test('M1: one unit whose read fails does not stop the center, the unit switcher, the other unit, or the manager\'s «الإعدادات ← الصلاحيات»', { timeout: 900000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    /* ── مدير المنصة، والوحدةُ النشطة A قراءتُها 500 ── */
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    await su.page.evaluate((a) => { KIVO.BassamDepts.setActive(a); }, A);
    const st = await failUnit(su, A);
    await su.page.evaluate(() => { history.replaceState(null, '', location.pathname + '#/sysadmin/overview'); });
    await su.page.reload({ waitUntil: 'domcontentloaded' }); await su.page.waitForTimeout(8000);
    assert.equal(await su.page.evaluate(() => KIVO.BassamDepts.active()), A, 'the failing unit is the workspace');
    await su.page.waitForSelector('[data-sc-name="Admin"]', { timeout: 30000 });
    assert.deepEqual(await pageError(su), [], '① the center opens: no page-level failure card');
    /* ① الانتقال: «الإدارات والصلاحيات» */
    await su.go('#/sysadmin/org', 8000);
    await su.page.waitForSelector('[data-sc-name="Org"]', { timeout: 30000 });
    assert.deepEqual(await pageError(su), [], '① «الإدارات والصلاحيات» opens');
    await su.go('#/sysadmin/overview', 4000);
    assert.deepEqual(await pageError(su), []);
    /* ② مبدّلُ الوحدة متاح (في مساحة العمل التشغيلية — صفحتي): تفتح لوحتُه وتبدّل إلى B بالنقر */
    await su.go('#/profile', 4000);
    await su.page.locator('button.s-dept').first().click(); await su.page.waitForTimeout(800);
    const tryPick = () => su.page.evaluate((bName) => { const names = KIVO.BassamDepts.treeFlat().filter((d) => d.id === bName).map((d) => d.name); const el = [...document.querySelectorAll('[role="button"]')].find((e) => names.length && e.innerText.trim().indexOf(names[0]) === 0); if (!el) return [...document.querySelectorAll('[role="button"]')].map((e) => e.innerText.trim()).slice(0, 30); el.click(); return true; }, B);
    let picked = await tryPick();
    for (let i = 0; i < 3 && picked !== true; i++) { await su.page.evaluate(() => { const g = [...document.querySelectorAll('[role="button"]')].find((e) => /^TEST_ONLY/.test(e.innerText.trim()) && !e.__m1Tried); if (g) { g.__m1Tried = 1; g.click(); } }); await su.page.waitForTimeout(600); picked = await tryPick(); }
    assert.equal(picked, true, '② the switcher lists the other unit: ' + JSON.stringify(picked));
    await su.page.waitForTimeout(9000);
    assert.equal(await su.page.evaluate(() => KIVO.BassamDepts.active()), B);
    await su.go('#/employees', 8000);
    assert.deepEqual(await pageError(su), [], '② the other unit works');
    assert.match(await su.page.evaluate(() => document.querySelector('main').innerText), /TEST_ONLY/, '② its data is shown');
    assert.ok(st.hits > 0, 'the forced failure was really hit');
    assert.deepEqual(su.errs, []);

    /* ── مديرُ الوحدة A، وقراءةُ وحدته 500 ── */
    const mg = await openAs(b, lab, LAB.dmA, LAB.pw);
    const sm = await failUnit(mg, A);
    await mg.page.evaluate(() => { history.replaceState(null, '', location.pathname + '#/admin/perm'); });
    await mg.page.reload({ waitUntil: 'domcontentloaded' }); await mg.page.waitForTimeout(8000);
    await mg.page.waitForSelector('[data-sc-name="Admin"]', { timeout: 30000 });
    assert.deepEqual(await pageError(mg), [], '③ «الإعدادات» opens');
    await mg.page.waitForSelector('[data-sc-name="Org"]', { timeout: 30000 });
    assert.deepEqual(await pageError(mg), [], '③ «الإعدادات ← الصلاحيات» opens');
    /* ③ قسمُ «الورديات» يقرأ عند فتحه ويعرض فشلَه في موضعه */
    await mg.page.locator('[data-d-tab="shifts"]').first().click();
    await mg.page.waitForSelector('[data-sf="state"][data-ps="error"] button', { timeout: 40000 });
    assert.match(await mg.page.evaluate(() => document.querySelector('[data-sf="state"]').innerText), /أعد المحاولة/);
    assert.deepEqual(await pageError(mg), [], '③ the failure stays in its section');
    sm.on = false;
    await mg.page.locator('[data-sf="state"] button').first().click();
    await mg.page.waitForSelector('[data-sf="panel"]', { timeout: 30000 });
    assert.ok(sm.hits > 0);
    assert.deepEqual(mg.errs, []);
  } finally { await b.close(); await lab.close(); }
});
