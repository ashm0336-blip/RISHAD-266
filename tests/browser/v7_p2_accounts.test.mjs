/* RISHAD V7 P2 — the node accounts table in each node page, in the isolated lab (TEST_ONLY data, no network).
   V7 · د5-ح (owner's decision): the node tab «المسؤولون والحسابات» was deleted; its content moved as is into the fixed card
   «مدير الوحدة» of «الصلاحيات ← الأدوار» — this file follows it there (same table, same menu, same handlers).
   The card reuses the «مراقبة الحسابات» table: the same row (account · username · role · unit · status · last sign-in · added)
   and ONE action menu (_acctMenu) built for both places, each action on its existing KIVO.BassamAuth handler:
     · تعديل بيانات المدير (general / unit managers) · تجميد الحساب / إعادة التفعيل (setDisById, acctFixedWhy first)
     · إعادة تعيين كلمة المرور (one confirmation → the temporary-password dialog) · تعديل الصلاحيات (V7 · د5-هـ 44: the people section of the «الصلاحيات» tab — the dialog was deleted)
     · إنهاء جلساته الآن (when signed in) · حذف حساب المدير / حذف حساب الدخول (by kind, one confirmation).
   Scope: a unit lists its own accounts (and its sections'), a supervisory node its general managers and its branch's accounts,
   managers first. From «مراقبة الحسابات», «تعديل بيانات المدير» opens the account's node page on this card (V7 · د5-ح: …/perm/roles)
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
  /* V7 · د5-هـ (أمن ٣): لا نومٌ ثابت — كلُّ خطوةٍ تنتظر شرطَها الحقيقي (التبويبُ الحالي · القائمةُ ظاهرة · الحوار · قيمةُ الخادم) */
  const until = async (fn, what, ms = 15000) => { const t0 = Date.now(); for (;;) { if (await fn()) return; if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 50)); } };
  /* V7 · د6: الشاشةُ الواحدة «الإدارات والصلاحيات» — تبويباتُ الوحدة (.og-tabs) وعنوانُها #/sysadmin/org/<الوحدة>/<التبويب> */
  const TABS = 'main .og-tabs .og-tab';
  const go = async (hash, ready) => { await p.evaluate((h) => { location.hash = h; }, hash); await p.waitForFunction((h) => location.hash === h, hash); await p.locator(ready).first().waitFor(); };
  const node = (id) => go('#/sysadmin/org/' + id + '/overview', TABS);
  const tab = async (t) => {
    await p.locator(TABS, { hasText: t }).first().click();
    await p.waitForFunction(([sel, t]) => [...document.querySelectorAll(sel)].some((x) => x.getAttribute('aria-selected') === 'true' && x.textContent.includes(t)), [TABS, t]);
    await p.locator(NODE).first().waitFor();
  };
  /* V7 · د5-ح · د6: تبويب «المسؤولون» (كان «الصلاحيات ← الأدوار ← مدير الوحدة»، وقبله تبويبَ العقدة للمسؤولين والحسابات) */
  const onCard = () => p.evaluate(() => [...document.querySelectorAll('main .og-tabs .og-tab')].some((x) => x.getAttribute('aria-selected') === 'true' && x.textContent.includes('المسؤولون')) && !!document.querySelector('main [data-org-tab="admins"] .mk.ac7'));
  const card = async () => {
    await p.locator(TABS, { hasText: 'المسؤولون' }).first().click();
    await p.waitForFunction(() => [...document.querySelectorAll('main .og-tabs .og-tab')].some((x) => x.getAttribute('aria-selected') === 'true' && x.textContent.includes('المسؤولون')));
    await p.locator(NODE).first().waitFor();
  };
  const cur = () => p.evaluate(() => { const e = [...document.querySelectorAll('main .og-tabs .og-tab')].find((x) => x.getAttribute('aria-selected') === 'true'); return e ? e.textContent.replace(/[\d٠-٩\u200e\u200f\u202a-\u202e\u2066-\u2069]+/g, '').replace(/\s+/g, ' ').trim() : ''; });
  const rows = (scope) => p.evaluate((sc) => [...document.querySelectorAll(sc + ' .adm-tr.g-us:not(.adm-th)')].map((r) => r.querySelector('.adm-b').textContent.trim()), scope);
  const row = (scope, name) => p.locator(scope + ' .adm-tr.g-us', { hasText: name }).filter({ has: p.locator('.adm-rmb') }).first();
  const open = async (r) => { await r.locator('.adm-rmb').click(); await r.locator('[data-bs-dd] [role=menuitem]').first().waitFor(); };
  const menu = async (scope, name) => { const r = row(scope, name); await open(r); return (await r.locator('[data-bs-dd] [role=menuitem]').allInnerTexts()).map((x) => x.trim()); };
  const pick = async (scope, name, item) => { const r = row(scope, name); await open(r); await r.locator('[data-bs-dd] [role=menuitem]', { hasText: item }).first().click(); };
  const confirmOpen = () => p.locator('#bsCfm').waitFor({ timeout: 5000 }).then(() => true, () => false);
  const answer = async (btn) => { await p.locator(btn).click(); await p.locator('#bsCfm').waitFor({ state: 'detached' }); await lab.idle(); };
  const closeDialog = async (rx, sel = '[role=dialog]') => { await p.keyboard.press('Escape'); if (!(await p.locator(sel).last().waitFor({ state: 'hidden', timeout: 1500 }).then(() => true, () => false))) { await p.locator('[role=dialog] button', { hasText: rx }).last().click().catch(() => {}); await p.locator(sel).last().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {}); } };
  return { lab, b, s, p, H, go, node, until, tab, card, onCard, cur, rows, row, menu, open, pick, confirmOpen, answer, closeDialog };
}
const TABS0 = 'main .og-tabs .og-tab';
const NODE = 'main .mk.ac7', ALL = 'main section[aria-label^="مراقبة الحسابات"]';
const MGR = ['تعديل بيانات المدير', 'تجميد الحساب', 'إعادة تعيين كلمة المرور', 'تعديل الصلاحيات', 'حذف حساب المدير'];
const EMP = ['تجميد الحساب', 'إعادة تعيين كلمة المرور', 'تعديل الصلاحيات', 'حذف حساب الدخول'];

test('V7 P2 · node tab lists its scope with the central row; one action menu in both places; actions work through their handlers', { timeout: 600000 }, async () => {
  const { lab, b, s, p, H, go, node, until, card, onCard, cur, rows, menu, pick, confirmOpen, answer, closeDialog } = await world();
  try {
    /* scope by nature: unit A (its manager, its employee, its legacy account), section S1 (none), node G (its whole branch) */
    await node('TEST_ONLY_A');
    assert.ok(!(await p.locator(TABS0).allInnerTexts()).some((x) => /المسؤولون والحسابات/.test(x)), 'V7 · د5-ح: the node tab is deleted');
    await card();
    assert.equal(await cur(), 'المسؤولون', 'V7 · د6: the accounts live in the «المسؤولون» tab'); assert.ok(await onCard(), '… with the accounts card');
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_A/admins');
    assert.deepEqual(await rows(NODE), ['TEST_ONLY مدير أ', 'TEST_ONLY موظف أ', 'TEST_ONLY حساب إدارة أ'], 'unit A: managers first, then its accounts');
    assert.equal(await p.locator(NODE + ' .adm-th.g-us').count(), 1, 'the central table header');
    await node('TEST_ONLY_A_S1'); await card();
    assert.deepEqual(await rows(NODE), [], 'section S1: no accounts');
    const s1 = await p.locator(NODE).innerText();
    assert.match(s1, /لا مدير لهذا القسم بعد/, 'one empty state, worded for a section'); assert.doesNotMatch(s1, /لا حسابات دخول في هذا النطاق بعد/, 'not a second empty message');
    await node('TEST_ONLY_G'); await card();
    const g = await rows(NODE);
    assert.deepEqual(g.slice(0, 2).sort(), ['TEST_ONLY مدير أ', 'TEST_ONLY مدير ب'], 'node G: the unit managers of its branch first'); assert.equal(g.length, 4, JSON.stringify(g));
    assert.ok(!g.includes('Test Administrator'), 'the platform administrator is not in a node scope');
    /* search inside the scope */
    await p.fill(NODE + ' input.adm-q', 'موظف'); await until(async () => (await rows(NODE)).length === 1, 'the search');
    assert.deepEqual(await rows(NODE), ['TEST_ONLY موظف أ'], 'search narrows the scope');
    /* the search belongs to one node page: opening another node starts unfiltered (independent review, V7 P2) */
    await node('TEST_ONLY_A'); await card(); await until(async () => (await rows(NODE)).length > 1, 'the unfiltered scope').catch(() => {});
    assert.equal(await p.inputValue(NODE + ' input.adm-q'), '', 'another node: the search is empty');
    assert.equal((await rows(NODE)).length, 3, 'another node: its whole scope');

    /* one menu, both places */
    await go('#/sysadmin/users', ALL + ' .adm-tr.g-us .adm-rmb');
    const cMgr = await menu(ALL, 'TEST_ONLY مدير أ'); await p.keyboard.press('Escape');
    const cEmp = await menu(ALL, 'TEST_ONLY موظف أ'); await p.keyboard.press('Escape');
    await node('TEST_ONLY_A'); await card();
    const nMgr = await menu(NODE, 'TEST_ONLY مدير أ'); await p.keyboard.press('Escape');
    const nEmp = await menu(NODE, 'TEST_ONLY موظف أ'); await p.keyboard.press('Escape');
    assert.deepEqual(cMgr, MGR); assert.deepEqual(nMgr, MGR, 'manager: the same menu in the node tab');
    assert.deepEqual(cEmp, EMP); assert.deepEqual(nEmp, EMP, 'employee: the same menu in the node tab');
    assert.deepEqual(await menu(NODE, 'TEST_ONLY حساب إدارة أ'), ['تجميد الحساب — غير متاح', 'إعادة تعيين كلمة المرور'], 'legacy account: what the server refuses is marked');
    await p.keyboard.press('Escape');

    /* node tab: the dialogs open in place */
    /* V7 · د5-هـ (44): نافذةُ صلاحيات الموظف حُذفت — «تعديل الصلاحيات» يفتح قسم «الأشخاص» في تبويب «الصلاحيات» لوحدة الحساب (مجموعة v2) */
    for (const who of ['TEST_ONLY مدير أ', 'TEST_ONLY موظف أ']) {
      await p.evaluate(() => { window.__h44 = []; addEventListener('hashchange', (e) => window.__h44.push(new URL(e.newURL).hash)); });
      await pick(NODE, who, 'تعديل الصلاحيات'); await p.waitForTimeout(1200);
      /* the address the menu writes (the tab itself is group v2's: until it is merged the page settles on the unit's page) */
      assert.ok((await p.evaluate(() => window.__h44)).includes('#/sysadmin/org/TEST_ONLY_A/people'), who + ': → the people section of the unit\'s «الصلاحيات» tab');
      assert.equal(await p.locator('[role=dialog]').count(), 0, who + ': no permissions dialog');
      await s.go('#/sysadmin/org/TEST_ONLY_A', 3000); await card();
    }
    await pick(NODE, 'TEST_ONLY مدير أ', 'تعديل بيانات المدير');
    await p.locator('[role=dialog] input[placeholder="1XXXXXXXXX"]').first().waitFor();
    assert.equal(await p.locator('[role=dialog] input[placeholder="1XXXXXXXXX"]').count(), 1, 'the manager dialog'); await closeDialog(/إلغاء|إغلاق/, '[role=dialog] input[placeholder="1XXXXXXXXX"]');

    /* freeze → one confirmation → frozen (setDisById); cancel changes nothing; re-enable */
    const id = users(lab).find((u) => u.name === 'TEST_ONLY مدير أ').id;
    await pick(NODE, 'TEST_ONLY مدير أ', 'تجميد الحساب'); assert.ok(await confirmOpen(), 'asks first');
    await answer('#bsCfmNo');
    assert.ok(!users(lab).find((u) => u.id === id).dis, 'cancel: not frozen');
    await pick(NODE, 'TEST_ONLY مدير أ', 'تجميد الحساب'); await answer('#bsCfmOk'); await until(() => users(lab).find((u) => u.id === id).dis === 1, 'the freeze on the server').catch(() => {});
    assert.equal(users(lab).find((u) => u.id === id).dis, 1, 'frozen on the server');
    await pick(NODE, 'TEST_ONLY مدير أ', 'إعادة التفعيل'); await answer('#bsCfmOk'); await until(() => users(lab).find((u) => u.id === id).dis === 0, 'the re-enable on the server').catch(() => {});
    assert.equal(users(lab).find((u) => u.id === id).dis, 0, 're-enabled on the server');
    /* temporary password: one confirmation, then the shared dialog shows it once */
    const ph0 = users(lab).find((u) => u.id === id).ph;
    await pick(NODE, 'TEST_ONLY مدير أ', 'إعادة تعيين كلمة المرور'); assert.ok(await confirmOpen(), 'asks first');
    await answer('#bsCfmOk'); await p.locator('[role=dialog]', { hasText: /Tmp\d{8}/ }).last().waitFor().catch(() => {});
    const tmp = await p.locator('[role=dialog]').last().innerText();
    assert.match(tmp, /Tmp\d{8}/, 'the temporary password dialog'); assert.notEqual(users(lab).find((u) => u.id === id).ph, ph0, 'the password changed on the server');
    assert.equal(users(lab).find((u) => u.id === id).mc, 1, 'must change it at first sign-in');
    await closeDialog(/إغلاق|تم/);
    /* delete: one confirmation; cancel keeps the account */
    await pick(NODE, 'TEST_ONLY مدير أ', 'حذف حساب المدير'); assert.ok(await confirmOpen());
    await answer('#bsCfmNo');
    assert.ok(users(lab).some((u) => u.id === id), 'cancel: the manager account stays');
    await pick(NODE, 'TEST_ONLY موظف أ', 'حذف حساب الدخول'); await answer('#bsCfmOk'); await until(() => !users(lab).some((u) => u.name === 'TEST_ONLY موظف أ'), 'the delete on the server').catch(() => {});
    assert.ok(!users(lab).some((u) => u.name === 'TEST_ONLY موظف أ'), 'the employee login is deleted (removeStaffAccount)');
    await until(async () => (await rows(NODE)).length === 2, 'the table to follow').catch(() => {});
    assert.deepEqual(await rows(NODE), ['TEST_ONLY مدير أ', 'TEST_ONLY حساب إدارة أ'], 'the table follows');

    /* from «مراقبة الحسابات»: edit and permissions open the account's node page on this tab */
    for (const item of ['تعديل بيانات المدير', 'تعديل الصلاحيات']) {
      await go('#/sysadmin/users', ALL + ' .adm-tr.g-us .adm-rmb');
      await p.evaluate(() => { window.__h44 = []; addEventListener('hashchange', (e) => window.__h44.push(new URL(e.newURL).hash)); });
      await pick(ALL, 'TEST_ONLY مدير ب', item);
      if (item === 'تعديل الصلاحيات') {
        await p.waitForFunction(() => (window.__h44 || []).includes('#/sysadmin/org/TEST_ONLY_B/people')).catch(() => {});
        assert.ok((await p.evaluate(() => window.__h44)).includes('#/sysadmin/org/TEST_ONLY_B/people'), item + ' → unit B, people section (V7 · د5-هـ 44)');
      } else {
        await p.waitForFunction(() => location.hash === '#/sysadmin/org/TEST_ONLY_B/admins').catch(() => {});
        await until(onCard, 'the «المسؤولون» tab').catch(() => {});
        assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_B/admins', item + ' → unit B, «المسؤولون» (V7 · د6)'); assert.ok(await onCard(), '… with the accounts card');
      }
      await p.goBack(); await p.waitForFunction(() => location.hash === '#/sysadmin/users').catch(() => {}); assert.equal(await H(), '#/sysadmin/users', 'Back returns');
    }
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

test('V7 P2 · phone light and dark: the node accounts table fits, its menu is not clipped, the keyboard opens it', { timeout: 600000 }, async () => {
  const { lab, b, s, p, node, card, row, open } = await world(PHONE);
  try {
    const bad = [];
    for (const th of ['light', 'dark']) {
      await p.evaluate((x) => KIVO.__bsThemeSet(x), th); await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));   /* a synchronous attribute; two frames to paint */
      for (const id of ['TEST_ONLY_A', 'TEST_ONLY_G']) {
        await node(id); await card();
        const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 1) bad.push(th + ' ' + id + ': scrolls sideways ' + ov);
        /* the last row's menu: every item reachable at its point (not clipped by the card) */
        const last = p.locator(NODE + ' .adm-tr.g-us').filter({ has: p.locator('.adm-rmb') }).last();
        await open(last);
        const hit = await p.evaluate(() => [...document.querySelectorAll('main .mk.ac7 [data-bs-dd] [role=menuitem]')].map((e) => { e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!at && (at === e || e.contains(at)); }));
        if (!hit.length || hit.includes(false)) bad.push(th + ' ' + id + ': menu items hidden ' + JSON.stringify(hit));
        await p.keyboard.press('Escape'); await last.locator('[data-bs-dd] [role=menuitem]').first().waitFor({ state: 'hidden' });
      }
    }
    assert.deepEqual(bad, [], 'phone light and dark');
    /* keyboard: the row button takes focus and Enter opens the menu */
    await node('TEST_ONLY_A'); await card();
    const btn = row(NODE, 'TEST_ONLY مدير أ').locator('.adm-rmb'); await btn.focus(); await p.keyboard.press('Enter'); await p.waitForFunction((b) => b.getAttribute('aria-expanded') === 'true', await btn.elementHandle()).catch(() => {});
    assert.equal(await btn.getAttribute('aria-expanded'), 'true', 'Enter opens the row menu');
    assert.ok(await p.locator(NODE + ' [data-bs-dd] [role=menuitem]').count() >= 4);
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
