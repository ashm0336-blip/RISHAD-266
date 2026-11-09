/* RISHAD V7 P1 — the organisation structure page and a page per node, in the isolated lab (TEST_ONLY data, no network).
   #/sysadmin/org is the structure page: the tree alone, searchable, expandable and collapsible. A row opens the node's own page
   #/sysadmin/org/<id> (the P0 address), whose tabs follow its nature:
     · a supervisory node («عقدة إشرافية»): نظرة عامة · حسابات الإدارة العامة · سقف الصفحات — no data tab (a node holds no data);
     · an operational unit («إدارة تشغيلية» / «قسم تشغيلي»): نظرة عامة · حسابات الإدارة · سقف الصفحات · البيانات.
   The overview gathers the node's place and actions, what sits under it (links to their pages) and the setup checklist (links to the tab
   that does each step). «العودة إلى الهيكل» and the browser Back return to the tree. Deleting a node that still has anything under it is
   refused BEFORE any confirmation (it used to ask, then refuse); the server keeps refusing it on its own (tests/unit/v7_p0_node_integrity).
   The old #/sysadmin/depts still opens the structure page. Phone (390×844) in light and dark: nothing scrolls sideways; the keyboard
   reaches and works the tabs and «العودة إلى الهيكل». Opening pages saves nothing; no page errors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const KG = 'bassam_gdepts_v1', KD = 'bassam_depts_v1';
const read = (lab, k) => lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join('');
const PHONE = { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } };

async function page(b, lab, view) {
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw, view || {}); s.page.setDefaultTimeout(15000);
  const p = s.page;
  const H = () => p.evaluate(() => location.hash);
  const SEL = () => p.evaluate(() => (document.getElementById('bsSelName') || {}).value ?? null);
  const tabs = () => p.evaluate(() => [...document.querySelectorAll('main [role=tablist][aria-label="أقسام صفحة العقدة"] [role=tab]')]
    .map((e) => [e.textContent.replace(/[\d٠-٩\u200e\u200f\u202a-\u202e\u2066-\u2069]+/g, '').replace(/\s+/g, ' ').trim(), e.getAttribute('aria-selected')]));
  const rows = () => p.evaluate(() => [...document.querySelectorAll('main .tr-rw')].filter((e) => e.getClientRects().length).map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  const toast = () => p.evaluate(() => [...document.querySelectorAll('#bs-toast,#bs-stoast,[role=status]')].map((e) => e.textContent).join(' '));
  const side = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  return { s, p, H, SEL, tabs, rows, toast, side };
}

test('V7 P1 · structure page, node pages by nature, overview links, delete refused before asking, back, old link', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  const before = [read(lab, KG), read(lab, KD)];
  try {
    const { s, p, H, SEL, tabs, rows, toast } = await page(b, lab);
    /* the structure page: the tree alone */
    await s.go('#/sysadmin/org', 3000);
    assert.equal(await H(), '#/sysadmin/org'); assert.equal(await SEL(), null, 'no node page on the structure page');
    assert.deepEqual(await tabs(), [], 'no node tabs on the structure page');
    const r0 = (await rows()).length; assert.ok(r0 >= 1, 'the tree is shown');
    await p.locator('main a:has-text("فرد الكل")').click(); await p.waitForTimeout(400);
    const all = await rows(); assert.ok(all.length > r0, 'expand all opens the tree (' + r0 + ' → ' + all.length + ')');
    assert.ok(['TEST_ONLY إدارة عامة', 'TEST_ONLY إدارة أ', 'TEST_ONLY إدارة ب', 'TEST_ONLY قسم أ١'].every((n) => all.some((r) => r.includes(n))), JSON.stringify(all));
    await p.locator('main a:has-text("طيّ الكل")').click(); await p.waitForTimeout(400);
    assert.ok((await rows()).length < all.length, 'collapse all folds it');
    await p.fill('main input[type=search][placeholder="ابحث في الهيكل…"]', 'إدارة ب'); await p.waitForTimeout(600);
    const found = await rows(); assert.ok(found.some((r) => r.includes('TEST_ONLY إدارة ب')) && !found.some((r) => r.includes('TEST_ONLY قسم أ١')), 'the search finds unit B and hides the rest: ' + JSON.stringify(found));
    await p.fill('main input[type=search][placeholder="ابحث في الهيكل…"]', ''); await p.waitForTimeout(400);

    /* a supervisory node: its own page, no data tab */
    await p.locator('main .tr-rw', { hasText: 'TEST_ONLY إدارة عامة' }).first().click(); await p.waitForTimeout(1500);
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_G', 'a row click opens the node page'); assert.equal(await SEL(), 'TEST_ONLY إدارة عامة');
    let t = await tabs(); assert.deepEqual(t.map((x) => x[0]).filter((x) => /نظرة عامة|سقف الصفحات|البيانات/.test(x)), ['نظرة عامة', 'سقف الصفحات'], 'node tabs: ' + JSON.stringify(t));
    assert.equal(t[0][1], 'true', 'the overview tab is selected'); assert.equal(await p.locator('main .dl-bk').count(), 1);
    assert.equal((await p.locator('main .nt').innerText()).trim(), 'عقدة إشرافية', 'the nature of a node');
    assert.equal(await p.locator('main .tr-rw').count(), 0, 'the tree is not shown on a node page');
    const kids = await p.locator('main section[aria-label="ما تحتها"] a').allInnerTexts();
    assert.deepEqual(kids.map((x) => x.trim()).sort(), ['TEST_ONLY إدارة أ', 'TEST_ONLY إدارة ب'], 'what sits under the node');
    /* delete with children: refused before any confirmation, nothing sent */
    await p.locator('main section[aria-label="حذف العقدة"] button.dz').click(); await p.waitForTimeout(800);
    assert.equal(await p.locator('#bsCfm').count(), 0, 'no confirmation is asked');
    assert.match(await toast(), /تحت «TEST_ONLY إدارة عامة».*انقلها أو احذفها أولاً/, 'the reason and what to do are said');
    await lab.idle(); assert.equal(read(lab, KG), before[0], 'the node registry is unchanged');

    /* a link under the node opens the unit's page: an operational unit with a data tab */
    await p.locator('main section[aria-label="ما تحتها"] a', { hasText: 'TEST_ONLY إدارة أ' }).click(); await p.waitForTimeout(1500);
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_A'); assert.equal(await SEL(), 'TEST_ONLY إدارة أ');
    t = await tabs(); assert.deepEqual(t.map((x) => x[0]).filter((x) => /نظرة عامة|سقف الصفحات|البيانات/.test(x)), ['نظرة عامة', 'سقف الصفحات', 'البيانات'], 'unit tabs: ' + JSON.stringify(t));
    assert.ok(t.some((x) => /^حسابات الإدارة/.test(x[0])), 'the accounts tab');
    assert.equal((await p.locator('main .nt').innerText()).trim(), 'إدارة تشغيلية');
    /* the setup checklist leads to the tab that does the step */
    await p.locator('main section[aria-label="قائمة التهيئة"] button', { hasText: 'فتح سقف الصفحات' }).click(); await p.waitForTimeout(900);
    assert.deepEqual((await tabs()).filter((x) => x[1] === 'true').map((x) => x[0]), ['سقف الصفحات'], 'the checklist opened the ceiling tab');
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_A', 'the address still names the unit');
    /* the data tab: the four unit data actions with their recorded titles */
    await p.locator('main [role=tab]', { hasText: 'البيانات' }).click(); await p.waitForTimeout(600);
    for (const ti of ['نسخة الإدارة — تصدير كل بيانات هذه الإدارة إلى ملف', 'استيراد نسخة احتياطية إلى هذه الإدارة — دمج أو استبدال', 'مسح البيانات — يفرّغ الإدارة من كل بياناتها ويبقيها في الهيكل'])
      assert.equal(await p.locator('main [title="' + ti + '"]').count(), 1, 'data tab: ' + ti);
    assert.equal(await p.locator('main section[aria-label="بيانات الإدارة"] button.dz').count(), 1, 'data tab: delete');
    /* a section: «قسم تشغيلي» */
    await s.go('#/sysadmin/org/TEST_ONLY_A_S1', 2000);
    assert.equal((await p.locator('main .nt').innerText()).trim(), 'قسم تشغيلي');

    /* Back (the browser) returns along the addresses; «العودة إلى الهيكل» opens the tree */
    await p.goBack(); await p.waitForTimeout(1500); assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_A', 'Back → the previous node page');
    await p.goBack(); await p.waitForTimeout(1500); assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_G');
    await p.locator('main .dl-bk').click(); await p.waitForTimeout(1200);
    assert.equal(await H(), '#/sysadmin/org'); assert.equal(await SEL(), null); assert.ok((await rows()).length >= 1, 'the tree is back');
    /* the old address */
    await s.go('#/sysadmin/overview', 1500); await s.go('#/sysadmin/depts', 2500);
    assert.equal(await H(), '#/sysadmin/org', 'the old #/sysadmin/depts opens the structure page'); assert.equal(await SEL(), null);

    await lab.idle();
    assert.deepEqual([read(lab, KG), read(lab, KD)], before, 'the structure is unchanged');
    assert.deepEqual(s.writes.filter((w) => !/\/api\/(login|save|notif)/.test(w)), [], 'no other write');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

test('V7 P1 · phone (390×844) light and dark: the structure page and every node tab fit; keyboard works the tabs and the way back', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const { s, p, H, tabs, side } = await page(b, lab, PHONE);
    const bad = [];
    for (const th of ['light', 'dark']) {
      await p.evaluate((x) => KIVO.__bsThemeSet(x), th); await p.waitForTimeout(350);
      await s.go('#/sysadmin/org', 2000); if ((await side()) > 1) bad.push(th + ' structure: scrolls sideways by ' + (await side()));
      for (const id of ['TEST_ONLY_G', 'TEST_ONLY_A']) {
        await s.go('#/sysadmin/org/' + id, 2000);
        const names = (await tabs()).map((x) => x[0]);
        for (const [i, name] of names.entries()) {
          await p.locator('main [role=tablist][aria-label="أقسام صفحة العقدة"] [role=tab]').nth(i).click(); await p.waitForTimeout(500);
          const ov = await side(); if (ov > 1) bad.push(th + ' ' + id + ' › ' + name + ': scrolls sideways by ' + ov);
          const out = await p.evaluate(() => { const vw = document.documentElement.clientWidth; return [...document.querySelectorAll('main [role=tab], main .dl-bk, main .ov7-s, main select')].filter((e) => { const r = e.getBoundingClientRect(); return e.getClientRects().length && (r.right > vw + 1 || r.left < -1); }).map((e) => e.className + ' ' + (e.textContent || '').trim().slice(0, 20)); });
          if (out.length) bad.push(th + ' ' + id + ' › ' + name + ': off screen: ' + out.join(' · '));
        }
      }
    }
    assert.deepEqual(bad, [], 'phone light and dark');
    /* keyboard: a tab is a focusable button, Enter selects it; «العودة إلى الهيكل» works with Enter */
    await s.go('#/sysadmin/org/TEST_ONLY_A', 2000);
    const cap = p.locator('main [role=tab]', { hasText: 'سقف الصفحات' }).first();
    await cap.focus(); assert.ok(await cap.evaluate((e) => e === document.activeElement), 'a tab takes the focus');
    await p.keyboard.press('Enter'); await p.waitForTimeout(600);
    assert.deepEqual((await tabs()).filter((x) => x[1] === 'true').map((x) => x[0]), ['سقف الصفحات'], 'Enter selects the tab');
    await p.locator('main .dl-bk').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
    assert.equal(await H(), '#/sysadmin/org', 'Enter on «العودة إلى الهيكل» opens the structure page');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
