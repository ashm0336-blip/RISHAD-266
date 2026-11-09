/* RISHAD V7 P2 — «المسؤولون والحسابات» in each node page, in the isolated lab (TEST_ONLY data, no network).
   The node page tab reuses the «مراقبة الحسابات» table: the same row (account · username · role · unit · status · last sign-in · added)
   and ONE action menu (_acctMenu) built for both places, each action on its existing KIVO.BassamAuth handler:
     · تعديل بيانات المدير (general / unit managers) · تجميد الحساب / إعادة التفعيل (setDisById, acctFixedWhy first)
     · إعادة تعيين كلمة المرور (one confirmation → the temporary-password dialog) · تعديل الصلاحيات (the permissions dialog)
     · إنهاء جلساته الآن (when signed in) · حذف حساب المدير / حذف حساب الدخول (by kind, one confirmation).
   Scope: a unit lists its own accounts (and its sections'), a supervisory node its general managers and its branch's accounts,
   managers first. From «مراقبة الحسابات», «تعديل بيانات المدير» and «تعديل الصلاحيات» open the account's node page on this tab
   (the dialogs live there). Phone (390×844) in light and dark: no sideways scroll, the row menu is not clipped; keyboard opens it. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const KU = 'bassam_auth_users_v1';
const users = (lab) => JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', KU).map((r) => r.v).join(''));
const PHONE = { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } };

async function world(view) {
  const lab = await startLab(); const b = await chromium.launch();
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw, view || {}); s.page.setDefaultTimeout(15000);
  const p = s.page;
  const H = () => p.evaluate(() => location.hash);
  const tab = async (t) => { await p.locator('main [aria-label="أقسام صفحة العقدة"] button', { hasText: t }).first().click(); await p.waitForTimeout(800); };
  const cur = () => p.evaluate(() => { const e = [...document.querySelectorAll('main [aria-label="أقسام صفحة العقدة"] button')].find((x) => x.getAttribute('aria-current') === 'true'); return e ? e.textContent.replace(/[\d٠-٩\u200e\u200f\u202a-\u202e\u2066-\u2069]+/g, '').replace(/\s+/g, ' ').trim() : ''; });
  const rows = (scope) => p.evaluate((sc) => [...document.querySelectorAll(sc + ' .adm-tr.g-us:not(.adm-th)')].map((r) => r.querySelector('.adm-b').textContent.trim()), scope);
  const row = (scope, name) => p.locator(scope + ' .adm-tr.g-us', { hasText: name }).filter({ has: p.locator('.adm-rmb') }).first();
  const menu = async (scope, name) => { const r = row(scope, name); await r.locator('.adm-rmb').click(); await p.waitForTimeout(400); return (await r.locator('[data-bs-dd] [role=menuitem]').allInnerTexts()).map((x) => x.trim()); };
  const pick = async (scope, name, item) => { const r = row(scope, name); await r.locator('.adm-rmb').click(); await p.waitForTimeout(400); await r.locator('[data-bs-dd] [role=menuitem]', { hasText: item }).first().click(); await p.waitForTimeout(700); };
  const confirmOpen = () => p.evaluate(() => !!document.getElementById('bsCfm'));
  return { lab, b, s, p, H, tab, cur, rows, row, menu, pick, confirmOpen };
}
const NODE = 'main .mk.ac7', ALL = 'main section[aria-label^="مراقبة الحسابات"]';
const MGR = ['تعديل بيانات المدير', 'تجميد الحساب', 'إعادة تعيين كلمة المرور', 'تعديل الصلاحيات', 'حذف حساب المدير'];
const EMP = ['تجميد الحساب', 'إعادة تعيين كلمة المرور', 'تعديل الصلاحيات', 'حذف حساب الدخول'];

test('V7 P2 · node tab lists its scope with the central row; one action menu in both places; actions work through their handlers', { timeout: 600000 }, async () => {
  const { lab, b, s, p, H, tab, cur, rows, menu, pick, confirmOpen } = await world();
  try {
    /* scope by nature: unit A (its manager, its employee, its legacy account), section S1 (none), node G (its whole branch) */
    await s.go('#/sysadmin/org/TEST_ONLY_A', 3000); await tab('المسؤولون والحسابات');
    assert.equal(await cur(), 'المسؤولون والحسابات', 'the tab is «المسؤولون والحسابات»');
    assert.deepEqual(await rows(NODE), ['TEST_ONLY مدير أ', 'TEST_ONLY موظف أ', 'TEST_ONLY حساب إدارة أ'], 'unit A: managers first, then its accounts');
    assert.equal(await p.locator(NODE + ' .adm-th.g-us').count(), 1, 'the central table header');
    await s.go('#/sysadmin/org/TEST_ONLY_A_S1', 3000); await tab('المسؤولون والحسابات');
    assert.deepEqual(await rows(NODE), [], 'section S1: no accounts');
    const s1 = await p.locator(NODE).innerText();
    assert.match(s1, /لا مدير لهذا القسم بعد/, 'one empty state, worded for a section'); assert.doesNotMatch(s1, /لا حسابات دخول في هذا النطاق بعد/, 'not a second empty message');
    await s.go('#/sysadmin/org/TEST_ONLY_G', 3000); await tab('المسؤولون والحسابات');
    const g = await rows(NODE);
    assert.deepEqual(g.slice(0, 2).sort(), ['TEST_ONLY مدير أ', 'TEST_ONLY مدير ب'], 'node G: the unit managers of its branch first'); assert.equal(g.length, 4, JSON.stringify(g));
    assert.ok(!g.includes('Test Administrator'), 'the platform administrator is not in a node scope');
    /* search inside the scope */
    await p.fill(NODE + ' input.adm-q', 'موظف'); await p.waitForTimeout(500);
    assert.deepEqual(await rows(NODE), ['TEST_ONLY موظف أ'], 'search narrows the scope');
    /* the search belongs to one node page: opening another node starts unfiltered (independent review, V7 P2) */
    await p.evaluate(() => { location.hash = '#/sysadmin/org/TEST_ONLY_A'; }); await p.waitForTimeout(1800); await tab('المسؤولون والحسابات');
    assert.equal(await p.inputValue(NODE + ' input.adm-q'), '', 'another node: the search is empty');
    assert.equal((await rows(NODE)).length, 3, 'another node: its whole scope');

    /* one menu, both places */
    await s.go('#/sysadmin/users', 3500);
    const cMgr = await menu(ALL, 'TEST_ONLY مدير أ'); await p.keyboard.press('Escape');
    const cEmp = await menu(ALL, 'TEST_ONLY موظف أ'); await p.keyboard.press('Escape');
    await s.go('#/sysadmin/org/TEST_ONLY_A', 3000); await tab('المسؤولون والحسابات');
    const nMgr = await menu(NODE, 'TEST_ONLY مدير أ'); await p.keyboard.press('Escape');
    const nEmp = await menu(NODE, 'TEST_ONLY موظف أ'); await p.keyboard.press('Escape');
    assert.deepEqual(cMgr, MGR); assert.deepEqual(nMgr, MGR, 'manager: the same menu in the node tab');
    assert.deepEqual(cEmp, EMP); assert.deepEqual(nEmp, EMP, 'employee: the same menu in the node tab');
    assert.deepEqual(await menu(NODE, 'TEST_ONLY حساب إدارة أ'), ['تجميد الحساب — غير متاح', 'إعادة تعيين كلمة المرور'], 'legacy account: what the server refuses is marked');
    await p.keyboard.press('Escape');

    /* node tab: the dialogs open in place */
    await pick(NODE, 'TEST_ONLY مدير أ', 'تعديل الصلاحيات');
    assert.match(await p.locator('[role=dialog]').last().innerText(), /صلاحيات/, 'permissions dialog'); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    if (await p.locator('[role=dialog]').count()) { await p.locator('[role=dialog] button', { hasText: /إغلاق|إلغاء/ }).last().click().catch(() => {}); await p.waitForTimeout(400); }
    await pick(NODE, 'TEST_ONLY موظف أ', 'تعديل الصلاحيات');
    assert.match(await p.locator('[role=dialog]').last().innerText(), /صلاحيات/, 'an employee\'s permissions open in the same dialog');
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    if (await p.locator('[role=dialog]').count()) { await p.locator('[role=dialog] button', { hasText: /إغلاق|إلغاء/ }).last().click().catch(() => {}); await p.waitForTimeout(400); }
    await pick(NODE, 'TEST_ONLY مدير أ', 'تعديل بيانات المدير');
    assert.equal(await p.locator('[role=dialog] input[placeholder="1XXXXXXXXX"]').count(), 1, 'the manager dialog'); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    if (await p.locator('[role=dialog] input[placeholder="1XXXXXXXXX"]').count()) { await p.locator('[role=dialog] button', { hasText: /إلغاء|إغلاق/ }).last().click(); await p.waitForTimeout(400); }

    /* freeze → one confirmation → frozen (setDisById); cancel changes nothing; re-enable */
    const id = users(lab).find((u) => u.name === 'TEST_ONLY مدير أ').id;
    await pick(NODE, 'TEST_ONLY مدير أ', 'تجميد الحساب'); assert.ok(await confirmOpen(), 'asks first');
    await p.locator('#bsCfmNo').click(); await p.waitForTimeout(800); await lab.idle();
    assert.ok(!users(lab).find((u) => u.id === id).dis, 'cancel: not frozen');
    await pick(NODE, 'TEST_ONLY مدير أ', 'تجميد الحساب'); await p.locator('#bsCfmOk').click(); await p.waitForTimeout(2500); await lab.idle();
    assert.equal(users(lab).find((u) => u.id === id).dis, 1, 'frozen on the server');
    await pick(NODE, 'TEST_ONLY مدير أ', 'إعادة التفعيل'); await p.locator('#bsCfmOk').click(); await p.waitForTimeout(2500); await lab.idle();
    assert.equal(users(lab).find((u) => u.id === id).dis, 0, 're-enabled on the server');
    /* temporary password: one confirmation, then the shared dialog shows it once */
    const ph0 = users(lab).find((u) => u.id === id).ph;
    await pick(NODE, 'TEST_ONLY مدير أ', 'إعادة تعيين كلمة المرور'); assert.ok(await confirmOpen(), 'asks first');
    await p.locator('#bsCfmOk').click(); await p.waitForTimeout(2500); await lab.idle();
    const tmp = await p.locator('[role=dialog]').last().innerText();
    assert.match(tmp, /Tmp\d{8}/, 'the temporary password dialog'); assert.notEqual(users(lab).find((u) => u.id === id).ph, ph0, 'the password changed on the server');
    assert.equal(users(lab).find((u) => u.id === id).mc, 1, 'must change it at first sign-in');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    if (await p.locator('[role=dialog]').count()) { await p.locator('[role=dialog] button', { hasText: /إغلاق|تم/ }).last().click().catch(() => {}); await p.waitForTimeout(400); }
    /* delete: one confirmation; cancel keeps the account */
    await pick(NODE, 'TEST_ONLY مدير أ', 'حذف حساب المدير'); assert.ok(await confirmOpen());
    await p.locator('#bsCfmNo').click(); await p.waitForTimeout(800); await lab.idle();
    assert.ok(users(lab).some((u) => u.id === id), 'cancel: the manager account stays');
    await pick(NODE, 'TEST_ONLY موظف أ', 'حذف حساب الدخول'); await p.locator('#bsCfmOk').click(); await p.waitForTimeout(2500); await lab.idle();
    assert.ok(!users(lab).some((u) => u.name === 'TEST_ONLY موظف أ'), 'the employee login is deleted (removeStaffAccount)');
    assert.deepEqual(await rows(NODE), ['TEST_ONLY مدير أ', 'TEST_ONLY حساب إدارة أ'], 'the table follows');

    /* from «مراقبة الحسابات»: edit and permissions open the account's node page on this tab */
    for (const item of ['تعديل بيانات المدير', 'تعديل الصلاحيات']) {
      await s.go('#/sysadmin/users', 3500);
      await pick(ALL, 'TEST_ONLY مدير ب', item); await p.waitForTimeout(1500);
      assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_B', item + ' → unit B'); assert.equal(await cur(), 'المسؤولون والحسابات');
      await p.goBack(); await p.waitForTimeout(1500); assert.equal(await H(), '#/sysadmin/users', 'Back returns');
    }
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

test('V7 P2 · phone light and dark: the node accounts table fits, its menu is not clipped, the keyboard opens it', { timeout: 600000 }, async () => {
  const { lab, b, s, p, tab, row } = await world(PHONE);
  try {
    const bad = [];
    for (const th of ['light', 'dark']) {
      await p.evaluate((x) => KIVO.__bsThemeSet(x), th); await p.waitForTimeout(300);
      for (const id of ['TEST_ONLY_A', 'TEST_ONLY_G']) {
        await s.go('#/sysadmin/org/' + id, 3000); await tab('المسؤولون والحسابات');
        const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 1) bad.push(th + ' ' + id + ': scrolls sideways ' + ov);
        /* the last row's menu: every item reachable at its point (not clipped by the card) */
        const last = p.locator(NODE + ' .adm-tr.g-us').filter({ has: p.locator('.adm-rmb') }).last();
        await last.locator('.adm-rmb').click(); await p.waitForTimeout(400);
        const hit = await p.evaluate(() => [...document.querySelectorAll('main .mk.ac7 [data-bs-dd] [role=menuitem]')].map((e) => { e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!at && (at === e || e.contains(at)); }));
        if (!hit.length || hit.includes(false)) bad.push(th + ' ' + id + ': menu items hidden ' + JSON.stringify(hit));
        await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      }
    }
    assert.deepEqual(bad, [], 'phone light and dark');
    /* keyboard: the row button takes focus and Enter opens the menu */
    await s.go('#/sysadmin/org/TEST_ONLY_A', 3000); await tab('المسؤولون والحسابات');
    const btn = row(NODE, 'TEST_ONLY مدير أ').locator('.adm-rmb'); await btn.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    assert.equal(await btn.getAttribute('aria-expanded'), 'true', 'Enter opens the row menu');
    assert.ok(await p.locator(NODE + ' [data-bs-dd] [role=menuitem]').count() >= 4);
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
