/* RISHAD V7 P1 — the organisation structure and a page per node, in the isolated lab (TEST_ONLY data, no network).
   V7 · د6 (ب1): the standalone structure page (#/sysadmin/org: the tree alone) and the node page with its three tabs (#/sysadmin/org/<id>) were merged
   into ONE screen «الإدارات والصلاحيات» — the tree stays beside the selected unit, whose tabs are: نظرة عامة · الأنظمة · المسؤولون · الأدوار · الأشخاص ·
   السجل · البيانات. What this file pinned for the two old pages is pinned here on the one screen (the old addresses are redirected to the new ones):
     · a supervisory node («قطاع» / «إدارة عامة») and an operational unit («إدارة» / «قسم») carry the seven tabs; a node's «البيانات» points to the
       units under it (a node holds no data); the root row «المنصة كلها» carries four;
     · the overview gathers the unit's place and actions, what sits under it (links to those units) and the setup checklist (each step opens the
       tab that does it); the data tab keeps the unit data actions with their recorded titles (delete moved to the overview's actions card);
     · deleting a node that still has anything under it is refused BEFORE any confirmation, with the reason (it used to be a toast; now the delete
       dialog states it); the server keeps refusing it on its own (tests/unit/v7_p0_node_integrity);
     · the browser Back returns along the addresses (unit and tab); «العودة إلى الهيكل» is gone with the structure page (the tree is always there);
     · the old #/sysadmin/depts and #/sysadmin/org still open the screen.
   Phone (390×844) in light and dark: nothing scrolls sideways on any tab; the keyboard reaches and works the tabs and the unit button.
   Opening pages saves nothing; no page errors. (The frame itself — tree columns, dialogs, deep links — is in v7_d6_frame.test.mjs.) */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const KG = 'bassam_gdepts_v1', KD = 'bassam_depts_v1';
const read = (lab, k) => lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join('');
const PHONE = { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } };
const TABS7 = ['نظرة عامة', 'الأنظمة', 'المسؤولون', 'الأدوار', 'الأشخاص', 'السجل', 'البيانات'];
const clean = (t) => String(t).replace(/[\d٠-٩‎‏‪-‮⁦-⁩]+/g, '').replace(/\s+/g, ' ').trim();

async function page(b, lab, view) {
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw, view || {}); s.page.setDefaultTimeout(15000);
  const p = s.page;
  const H = () => p.evaluate(() => location.hash);
  const NAME = () => p.evaluate(() => { const e = document.querySelector('main .og-hd [data-og="name"]'); return e ? e.textContent.trim() : null; });
  const tabs = () => p.evaluate(() => [...document.querySelectorAll('main .og-tabs .og-tab')].map((e) => [e.textContent.replace(/\s+/g, ' ').trim(), e.getAttribute('aria-selected')]));
  const rows = () => p.evaluate(() => [...document.querySelectorAll('main .og-rw')].filter((e) => e.getClientRects().length).map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  const side = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  return { s, p, H, NAME, tabs, rows, side };
}

test('V7 P1 · د6 · one screen: the tree beside the unit, units by nature, overview links, delete refused before asking, back, old links', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  const before = [read(lab, KG), read(lab, KD)];
  try {
    const { s, p, H, NAME, tabs, rows } = await page(b, lab);
    /* the old structure address opens the screen: the tree, and the root row selected */
    await s.go('#/sysadmin/org', 3000);
    assert.equal(await H(), '#/sysadmin/org/platform/overview'); assert.equal(await NAME(), 'المنصة كلها');
    assert.deepEqual((await tabs()).map((x) => x[0]), ['نظرة عامة', 'الأنظمة', 'المسؤولون', 'السجل'], 'the root row: four tabs');
    const all = await rows(); assert.ok(all.length >= 5, 'the tree is shown, expanded');
    assert.ok(['المنصة كلها', 'TEST_ONLY إدارة عامة', 'TEST_ONLY إدارة أ', 'TEST_ONLY إدارة ب', 'TEST_ONLY قسم أ١'].every((n) => all.some((r) => r.includes(n))), JSON.stringify(all));
    await p.locator('main [data-og-act="collapse"]').click(); await p.waitForTimeout(400);
    const r0 = (await rows()).length; assert.ok(r0 < all.length, 'collapse all folds it');
    await p.locator('main [data-og-act="expand"]').click(); await p.waitForTimeout(400);
    assert.equal((await rows()).length, all.length, 'expand all opens the tree (' + r0 + ' → ' + all.length + ')');
    await p.fill('main input[type=search][placeholder="ابحث في الهيكل…"]', 'إدارة ب'); await p.waitForTimeout(600);
    const found = await rows(); assert.ok(found.some((r) => r.includes('TEST_ONLY إدارة ب')) && !found.some((r) => r.includes('TEST_ONLY قسم أ١')), 'the search finds unit B and hides the rest: ' + JSON.stringify(found));
    await p.fill('main input[type=search][placeholder="ابحث في الهيكل…"]', ''); await p.waitForTimeout(400);

    /* a supervisory node: selected from the tree — the tree stays, the seven tabs */
    await p.locator('main .og-rw[data-og-id="TEST_ONLY_G"] .og-nm').click(); await p.waitForTimeout(1500);
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_G/overview', 'a row click selects the node'); assert.equal(await NAME(), 'TEST_ONLY إدارة عامة');
    let t = await tabs(); assert.deepEqual(t.map((x) => x[0]), TABS7, 'node tabs: ' + JSON.stringify(t));
    assert.equal(t[0][1], 'true', 'the overview tab is selected');
    assert.ok((await rows()).length >= 5, 'V7 · د6: the tree stays beside the unit'); assert.equal(await p.locator('main .dl-bk').count(), 0, '«العودة إلى الهيكل» is gone with the structure page');
    assert.equal(clean(await p.locator('main .og-hd [data-og="kind"]').innerText()), 'إدارة عامة', 'the kind of a node');
    /* V7 · د5-ح ①: the supervisory node carries the sections — its «المسؤولون» is the «مدير الوحدة» card, its people its branch */
    await s.go('#/sysadmin/org/TEST_ONLY_G/perm/roles', 2000);
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_G/roles', 'the old «الصلاحيات ← الأدوار» address is redirected');
    assert.equal(await p.locator('main .p44 .p44-role').count(), 0, 'V7 · د6: no fixed cards in the roles list (they are «المسؤولون»)');
    assert.ok((await p.locator('main [data-org-tab="roles"] .p44-nodes a').count()) >= 2, 'a node\'s roles: links to the units under it');
    await s.go('#/sysadmin/org/TEST_ONLY_G/admins', 2000);
    assert.equal(await p.locator('main [data-org-tab="admins"] .mk.ac7').count(), 1, 'its «مدير الوحدة» card holds the accounts table');
    await s.go('#/sysadmin/org/TEST_ONLY_G/perm/people', 1500);
    assert.ok((await p.locator('main .p44 section[aria-label="أشخاص الفرع"] tbody tr').count()) >= 1, 'its branch\'s people');
    await s.go('#/sysadmin/org/TEST_ONLY_G/perm/log', 1500);
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_G/log'); assert.equal(await p.locator('main .p44 .bs-retry').count(), 0, 'its log loads');
    await s.go('#/sysadmin/org/TEST_ONLY_G/data', 1500);
    assert.deepEqual((await p.locator('main [data-org-tab="data"] section[aria-label="بيانات الفرع"] a').allInnerTexts()).map((x) => x.trim()).sort(), ['TEST_ONLY إدارة أ', 'TEST_ONLY إدارة ب', 'TEST_ONLY قسم أ١'], 'a node holds no data: its «البيانات» points to its units');
    assert.equal(await p.locator('main [data-org-tab="data"] [title^="مسح البيانات"]').count(), 0);
    await s.go('#/sysadmin/org/TEST_ONLY_G', 1500);
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_G/overview', 'the old node address');
    const kids = await p.locator('main section[aria-label="ما تحتها"] a').allInnerTexts();
    assert.deepEqual(kids.map((x) => x.trim()).sort(), ['TEST_ONLY إدارة أ', 'TEST_ONLY إدارة ب'], 'what sits under the node');
    /* delete with children: refused before any confirmation, the reason stated, nothing sent */
    await p.locator('main section[aria-label="الموضع وأفعال الوحدة"] [data-og-act="delete"]').click(); await p.waitForTimeout(800);
    assert.equal(await p.locator('#bsCfm, #bsCfmOk').count(), 0, 'no confirmation is asked');
    assert.match(await p.locator('[data-og-dlg="delete"] [data-og="del-why"]').innerText(), /تحت «TEST_ONLY إدارة عامة».*انقلها أو احذفها أولاً/, 'the reason and what to do are said');
    await p.locator('[data-og-dlg="delete"] .ft button').click(); await p.waitForTimeout(400);
    await lab.idle(); assert.equal(read(lab, KG), before[0], 'the node registry is unchanged');

    /* a link under the node opens the unit: an operational unit */
    await p.locator('main section[aria-label="ما تحتها"] a', { hasText: 'TEST_ONLY إدارة أ' }).click(); await p.waitForTimeout(1500);
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_A/overview'); assert.equal(await NAME(), 'TEST_ONLY إدارة أ');
    t = await tabs(); assert.deepEqual(t.map((x) => x[0]), TABS7, 'unit tabs: ' + JSON.stringify(t));
    assert.ok(!t.some((x) => /المسؤولون والحسابات|^الصلاحيات$/.test(x[0])), 'no «المسؤولون والحسابات» (د5-ح) and no «الصلاحيات» tab over the four sections (د6)');
    assert.equal(clean(await p.locator('main .og-hd [data-og="kind"]').innerText()), 'إدارة');
    /* the checklist's manager step opens «المسؤولون» (was «الصلاحيات ← الأدوار ← مدير الوحدة») */
    await p.locator('main section[aria-label="قائمة التهيئة"] li[data-og-step="admins"] button').click(); await p.waitForTimeout(900);
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_A/admins');
    assert.equal(await p.locator('main [data-org-tab="admins"] .mk.ac7').count(), 1, 'the card with the accounts table');
    await p.locator('main .og-tabs .og-tab', { hasText: 'نظرة عامة' }).click(); await p.waitForTimeout(600);
    /* the setup checklist leads to the tab that does the step */
    await p.locator('main section[aria-label="قائمة التهيئة"] li[data-og-step="systems"] button').click(); await p.waitForTimeout(900);
    assert.deepEqual((await tabs()).filter((x) => x[1] === 'true').map((x) => x[0]), ['الأنظمة'], 'the checklist opened the systems tab (the ceiling)');
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_A/systems', 'the address names the unit and the tab');
    /* the data tab: the unit data actions with their recorded titles — delete lives in the overview's actions card (ب3) */
    await p.locator('main .og-tabs .og-tab', { hasText: 'البيانات' }).click(); await p.waitForTimeout(900);
    for (const ti of ['نسخة الإدارة — تصدير كل بيانات هذه الإدارة إلى ملف', 'استيراد نسخة احتياطية إلى هذه الإدارة — دمج أو استبدال', 'مسح البيانات — يفرّغ الإدارة من كل بياناتها ويبقيها في الهيكل'])
      assert.equal(await p.locator('main [data-org-tab="data"] [title="' + ti + '"]').count(), 1, 'data tab: ' + ti);
    assert.equal(await p.locator('main [data-org-tab="data"] button.dz').count(), 0, 'data tab: no delete here');
    await p.locator('main .og-tabs .og-tab', { hasText: 'نظرة عامة' }).click(); await p.waitForTimeout(600);
    assert.equal((await p.locator('main section[aria-label="الموضع وأفعال الوحدة"] [data-og-act="delete"]').innerText()).trim(), 'حذف الإدارة', 'delete is in the overview');
    /* a section: «قسم» */
    await s.go('#/sysadmin/org/TEST_ONLY_A_S1', 2000);
    assert.equal(clean(await p.locator('main .og-hd [data-og="kind"]').innerText()), 'قسم'); assert.deepEqual((await tabs()).map((x) => x[0]), TABS7);

    /* Back (the browser) returns along the addresses */
    await s.go('#/sysadmin/org/TEST_ONLY_A/roles', 1500); await s.go('#/sysadmin/org/TEST_ONLY_G/roles', 1500);
    await p.goBack(); await p.waitForTimeout(1500); assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_A/roles', 'Back → the previous unit, the same tab'); assert.equal(await NAME(), 'TEST_ONLY إدارة أ');
    await p.goForward(); await p.waitForTimeout(1500); assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_G/roles');
    /* the oldest address */
    await s.go('#/sysadmin/overview', 1500); await s.go('#/sysadmin/depts', 2500);
    assert.equal(await H(), '#/sysadmin/org/platform/overview', 'the old #/sysadmin/depts opens the screen'); assert.ok((await rows()).length >= 5, 'with the tree');

    await lab.idle();
    assert.deepEqual([read(lab, KG), read(lab, KD)], before, 'the structure is unchanged');
    assert.deepEqual(s.writes.filter((w) => !/\/api\/(login|save|notif)/.test(w)), [], 'no other write');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

test('V7 P1 · د6 · phone (390×844) light and dark: every tab of the root, a node and a unit fits; the keyboard works the tabs and the unit button', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const { s, p, H, tabs, side } = await page(b, lab, PHONE);
    const bad = [];
    for (const th of ['light', 'dark']) {
      await p.evaluate((x) => KIVO.__bsThemeSet(x), th); await p.waitForTimeout(350);
      for (const id of ['platform', 'TEST_ONLY_G', 'TEST_ONLY_A']) {
        await s.go('#/sysadmin/org/' + id, 2000);
        const names = (await tabs()).map((x) => x[0]);
        for (const [i, name] of names.entries()) {
          const tb = p.locator('main .og-tabs .og-tab').nth(i); await tb.scrollIntoViewIfNeeded(); await tb.click(); await p.waitForTimeout(700);
          const ov = await side(); if (ov > 1) bad.push(th + ' ' + id + ' › ' + name + ': scrolls sideways by ' + ov);
          /* ما ليس داخل منطقة تمريرٍ خاصة به (شريطُ التبويبات · جدول) لا يخرج عن الشاشة */
          const out = await p.evaluate(() => { const vw = document.documentElement.clientWidth;
            const held = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
            return [...document.querySelectorAll('main .og-ub, main .og-hd, main .og-card, main .p44-card, main .og select, main .og .og-b')].filter((e) => { const r = e.getBoundingClientRect(); return e.getClientRects().length && (r.right > vw + 1 || r.left < -1) && !held(e); }).map((e) => e.className + ' ' + (e.textContent || '').trim().slice(0, 20)); });
          if (out.length) bad.push(th + ' ' + id + ' › ' + name + ': off screen: ' + out.join(' · '));
        }
      }
    }
    assert.deepEqual(bad, [], 'phone light and dark');
    /* keyboard: a tab is a focusable link, Enter selects it; the unit button opens the tree with Enter and Escape closes it */
    await s.go('#/sysadmin/org/TEST_ONLY_A', 2000);
    const cap = p.locator('main .og-tabs .og-tab', { hasText: 'الأنظمة' }).first();
    await cap.focus(); assert.ok(await cap.evaluate((e) => e === document.activeElement), 'a tab takes the focus');
    await p.keyboard.press('Enter'); await p.waitForTimeout(900);
    assert.deepEqual((await tabs()).filter((x) => x[1] === 'true').map((x) => x[0]), ['الأنظمة'], 'Enter selects the tab'); assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_A/systems');
    const ub = p.locator('main .og-ub'); await ub.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
    assert.equal(await p.locator('main .og').getAttribute('data-og-sheet'), 'true', 'Enter on the unit button opens the tree');
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    assert.equal(await p.locator('main .og').getAttribute('data-og-sheet'), 'false', 'Escape closes it');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
