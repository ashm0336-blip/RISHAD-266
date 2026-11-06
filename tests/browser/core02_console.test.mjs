/* RISHAD CORE-02 S7 — «مركز إدارة رشاد» as its own space, in a real browser over the built package (lab: TEST_ONLY data, no network).
   (A) the platform administrator lands in the console; its sidebar holds the console navigation only (no operational pages, no unit
       picker, no «+ قسم», no help group); every one of the 17 destinations is one sidebar item: clicking it writes its own address,
       marks exactly that item current, shows its title as the page h2 and moves the focus there; every address opens cold
       (#/sysadmin/plat and an unknown section open «هوية المنصة»); Back moves between console pages;
   (B) an unsaved platform draft is marked in the sidebar, survives a move inside the console, and leaving asks first (cancel keeps it);
       the exit goes to the operational workspace with exactly the sidebar it had before CORE-01/02, and the return opens the last
       console page; the collapsed rail shows one icon per group and reopens a group on its last item, without touching the
       operational collapse state;
   (C) phone 390×844: the drawer holds the console tree, closes on a choice, nothing overflows;
   (D) a unit manager's #/admin is untouched (no console, its own settings strip); an employee is refused #/sysadmin;
   nothing is saved and no page error anywhere. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const BEFORE = JSON.parse(fs.readFileSync(new URL('./fixtures/core01_nav_before.json', import.meta.url), 'utf8')).roles;
const MOBILE = { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } };
const DEST = [['overview', null, 'الرئيسية'], ['depts', null, 'الإدارات'], ['users', null, 'مراقبة الحسابات'], ['perms', null, 'خريطة الصلاحيات'],
  ['plat', 'id', 'هوية المنصة'], ['plat', 'mods', 'الوحدات'], ['plat', 'notif', 'التنبيهات والتعاميم'], ['plat', 'login', 'شاشة تسجيل الدخول'],
  ['plat', 'side', 'القوائم'], ['plat', 'print', 'الطباعة والتقارير'], ['plat', 'app', 'تطبيق الجوال'], ['plat', 'about', 'حول المنصة'],
  ['sec', null, 'الأمن'], ['oplog', null, 'سجل الأنشطة والتغييرات'], ['backup', null, 'النسخة الاحتياطية'], ['plat', 'setup', 'التهيئة والاستعادة'],
  ['histimp', null, 'استيراد البيانات التاريخية']];
const addr = (d) => '#/sysadmin/' + d[0] + (d[1] ? '/' + d[1] : '');
const sel = (d) => 'aside.bsb [data-con-tab="' + d[0] + '"]' + (d[1] ? '[data-con-sub="' + d[1] + '"]' : ':not([data-con-sub])');
const links = (page) => page.evaluate(() => [...document.querySelectorAll('aside.bsb a, aside.bsb .n')].map((a) => (a.className || '') + '|' + (a.getAttribute('title') || '') + '|' + (a.textContent || '').replace(/\s+/g, ' ').trim()));
/* writes while only navigating: sign-in, an empty save flush and the notifications security-poll / recipient preview */
function watchWrites(page, out) {
  page.on('request', (r) => {
    if (['GET', 'HEAD'].includes(r.method())) return;
    const p = new URL(r.url()).pathname; let j = null; try { j = JSON.parse(r.postData() || 'null'); } catch (e) { j = {}; }
    if (p === '/api/login') return;
    if (p === '/api/save' && j && !Object.keys(j.set || {}).length && !(j.del || []).length) return;
    if (p === '/api/notifications/act' && j && (j.op === 'security-poll' || j.op === 'targets')) return;
    out.push(r.method() + ' ' + p + ' ' + JSON.stringify(j).slice(0, 160));
  });
}
async function world() {
  const lab = await startLab(); const { env, W } = lab, DB = env.DB;
  /* as on Test: the permission lens upgrade mark is already set (that read-time upgrade is not a console write) */
  const pm = JSON.parse(DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_perms_v1').map((r) => r.v).join(''));
  pm.lensZ = 1;
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind('bassam_perms_v1'), ...W.kvPutStmts(env, 'kv', 'bassam_perms_v1', JSON.stringify(pm)), DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind('bassam_perms_v1')]);
  return lab;
}
const state = (page) => page.evaluate(() => {
  const a = document.querySelector('aside.bsb'), cur = [...a.querySelectorAll('[aria-current="page"]')];
  const h2 = document.querySelector('main .con-ph h2');
  return { hash: location.hash, cls: a.className, cur: cur.map((e) => e.textContent.replace(/\s+/g, ' ').trim()), h2: h2 ? h2.textContent.trim() : null, focus: document.activeElement === h2,
    ov: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});

test('(A)(B) platform administrator: the console, its 17 destinations, deep links, Back, drafts, exit and return, the rail', { timeout: 900000 }, async () => {
  const b = await chromium.launch(); const lab = await world(); const writes = []; let s = null;
  try {
    s = await openAs(b, lab, LAB.superUn, LAB.superPw, { onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
    const page = s.page;
    await page.waitForTimeout(1500);
    /* (A) landing: the console, expanded, with the console navigation only */
    let st = await state(page);
    assert.equal(st.hash, '#/sysadmin/overview', 'lands on the console home');
    assert.match(st.cls, /\bbsb--console\b/); assert.doesNotMatch(st.cls, /\bcx\b/, 'expanded by default');
    assert.equal(await page.locator('header.bs-topbar.is-console').count(), 1, 'the top bar carries the console rail');
    assert.equal(await page.locator('aside.bsb .s-dept, aside.bsb .s-secadd, aside.bsb a[data-key], aside.bsb .bs-plat-helpgrp, aside.bsb .s-deptdd').count(), 0, 'no unit picker, no «+ قسم», no operational page, no help group');
    assert.equal((await page.textContent('aside.bsb .s-space .nlbl')).trim(), 'مركز إدارة رشاد');
    assert.equal(await page.getAttribute('aside.bsb nav.s-nav', 'aria-label'), 'مركز إدارة رشاد');
    assert.ok((await page.textContent('aside.bsb .s-ur')).includes('مسؤول المنصة'), 'the user card');
    assert.equal(await page.locator('aside.bsb [data-con-tab]').count(), 17, '17 destinations');
    assert.deepEqual(await page.$$eval('aside.bsb .s-cgh', (e) => e.map((x) => x.textContent.trim())), ['الإدارة المؤسسية', 'إعدادات المنصة', 'الأمن والرقابة', 'البيانات والاستمرارية'], 'the group headings');
    assert.equal(await page.locator('main [role=tablist], main .adm-tabbar').count(), 0, 'no tab strip in the page');
    /* every destination: one click → its address, one current item, its title, the focus on the title */
    for (const d of DEST) {
      await page.locator(sel(d)).click(); await page.waitForTimeout(1100);
      st = await state(page);
      assert.equal(st.hash, addr(d), d[2] + ': address');
      assert.deepEqual(st.cur, [d[2]], d[2] + ': exactly that item is current');
      assert.equal(st.h2, d[2], d[2] + ': the page title');
      assert.ok(st.focus, d[2] + ': focus moved to the page title');
      assert.ok(st.ov <= 1, d[2] + ': no sideways scroll');
    }
    /* Back moves between console pages */
    await page.goBack(); await page.waitForTimeout(1500);
    st = await state(page); assert.equal(st.hash, '#/sysadmin/plat/setup', 'Back returns to the previous console page'); assert.equal(st.h2, 'التهيئة والاستعادة');
    /* every address opens cold; #/sysadmin/plat alone reopens the last section (kept with the page view state), an unknown one opens «هوية المنصة» */
    for (const [h, want, title] of [...DEST.map((d) => [addr(d), addr(d), d[2]]), ['#/sysadmin/plat', '#/sysadmin/plat/setup', 'التهيئة والاستعادة'], ['#/sysadmin/plat/zzz', '#/sysadmin/plat/id', 'هوية المنصة']]) {
      await page.goto('about:blank'); await page.goto(lab.base + '/' + h, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3500);   /* a real load, not a same-document hash change */
      st = await state(page);
      assert.equal(st.hash, want, h + ': cold load keeps / normalises the address');
      assert.equal(st.h2, title, h + ': opens «' + title + '»');
      assert.deepEqual(st.cur, [title], h + ': its item is current');
    }
    /* (B) a platform draft: marked, kept across a move inside the console, and leaving asks first */
    await page.locator(sel(['plat', 'id'])).click(); await page.waitForTimeout(1200);
    await page.locator('main input[data-k="name"]').fill('TEST_ONLY اسم مؤقت'); await page.waitForTimeout(800);
    assert.equal(await page.locator(sel(['plat', 'id']) + ' .s-dot').count(), 1, 'the unsaved section is marked in the sidebar');
    await page.locator(sel(['users', null])).click(); await page.waitForTimeout(1200);
    await page.locator(sel(['plat', 'id'])).click(); await page.waitForTimeout(1200);
    assert.equal(await page.inputValue('main input[data-k="name"]'), 'TEST_ONLY اسم مؤقت', 'the draft survives a move inside the console');
    await page.locator('aside.bsb .s-exit').click();
    await page.waitForSelector('#bsCfm', { state: 'visible', timeout: 5000 });
    assert.match(await page.textContent('#bsCfmTitle'), /تغييرات غير محفوظة/);
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'bsCfmNo', 'the focus starts on «البقاء»');
    await page.click('#bsCfmNo'); await page.waitForTimeout(800);
    st = await state(page); assert.equal(st.hash, '#/sysadmin/plat/id', 'cancel stays');
    assert.equal(await page.inputValue('main input[data-k="name"]'), 'TEST_ONLY اسم مؤقت', 'cancel keeps the draft');
    await page.locator('aside.bsb .s-exit').click(); await page.waitForSelector('#bsCfm', { state: 'visible', timeout: 5000 });
    await page.click('#bsCfmOk'); await page.waitForTimeout(3000);
    st = await state(page);
    assert.equal(st.hash, '#/kpis', 'the exit opens the operational workspace (first page: no operational page visited yet)');
    assert.doesNotMatch(st.cls, /bsb--console/);
    assert.deepEqual(await links(page), BEFORE.super['#/kpis'], 'the operational sidebar is exactly what it was');
    await s.go('#/tasks', 2500);
    /* the return opens the last console page; the exit then returns to the last operational page */
    await page.locator('aside.bsb .s-togwrap a', { hasText: 'مركز إدارة رشاد' }).click(); await page.waitForTimeout(3000);
    st = await state(page); assert.equal(st.hash, '#/sysadmin/plat/id', 'the return opens the last console page');
    await page.locator('aside.bsb .s-exit').click(); await page.waitForTimeout(3000);
    assert.equal((await state(page)).hash, '#/tasks', 'no draft: no question, back to the last operational page');
    /* the rail: one icon per group, a group reopens on its last item, the operational collapse state untouched */
    await s.go('#/sysadmin/perms', 3000);
    await s.go('#/sysadmin/backup', 3000);
    await page.click('aside.bsb .s-tog2'); await page.waitForTimeout(600);
    st = await state(page); assert.match(st.cls, /\bcx\b/);
    assert.equal(await page.locator('aside.bsb .s-cgi').count(), 4, 'one icon per group (with Home: five)');
    assert.equal(await page.locator('aside.bsb .s-ci:visible').count(), 1, 'only Home stays as an icon');
    await page.locator('aside.bsb .s-cgi[aria-label="الإدارة المؤسسية"]').click(); await page.waitForTimeout(1200);
    assert.equal((await state(page)).hash, '#/sysadmin/perms', 'the group reopens on its last item');
    await page.mouse.move(700, 600);   /* the pointer rested on the rail icon, now over an operational link: the tooltip portal (600) holds a hovered link's title */
    await s.go('#/kpis', 2500);
    assert.deepEqual(await links(page), BEFORE.super['#/kpis'], 'the operational sidebar keeps its own collapse state');
    await s.go('#/sysadmin/users', 3000);
    await page.click('aside.bsb .s-tog2'); await page.waitForTimeout(600);
    assert.doesNotMatch((await state(page)).cls, /\bcx\b/, 'expanded again');
    assert.deepEqual(writes, [], 'navigating the console saves nothing (the draft was discarded, never sent)');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); await b.close(); }
});

test('(C)(D) phone drawer; a unit manager keeps #/admin; an employee is refused #/sysadmin', { timeout: 600000 }, async () => {
  const b = await chromium.launch();
  try {
    {
      const lab = await world(); const writes = []; let s = null;
      try {
        s = await openAs(b, lab, LAB.superUn, LAB.superPw, { ...MOBILE, onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
        const page = s.page; await page.waitForTimeout(1500);
        const c0 = (await state(page)).cls;
        assert.match(c0, /\bbsb--console\b/, 'the console on the phone too'); assert.match(c0, /\bcx\b/, 'the drawer starts closed');
        await page.click('.bs-burger'); await page.waitForTimeout(700);
        const open = await page.evaluate(() => { const r = document.querySelector('aside.bsb').getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.width > 200; });
        assert.ok(open, 'the drawer opens');
        assert.equal(await page.locator('aside.bsb [data-con-tab]').count(), 17, 'the drawer holds the console tree');
        assert.equal(await page.locator('aside.bsb .s-dept, aside.bsb a[data-key]').count(), 0);
        await page.locator(sel(['plat', 'notif'])).click(); await page.waitForTimeout(1500);
        const st = await state(page);
        assert.equal(st.hash, '#/sysadmin/plat/notif'); assert.match(st.cls, /\bcx\b/, 'the drawer closes on a choice'); assert.ok(st.ov <= 1, 'no sideways scroll');
        assert.equal(st.h2, 'التنبيهات والتعاميم');
        assert.deepEqual(writes, []); assert.deepEqual(s.errs, []);
      } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); }
    }
    {
      const lab = await world(); let s = null;
      try {
        s = await openAs(b, lab, LAB.mgrA, LAB.pw); s.page.setDefaultTimeout(15000);
        await s.go('#/admin', 3500);
        assert.equal(await s.page.locator('aside.bsb.bsb--console, header.is-console, aside.bsb [data-con-tab]').count(), 0, 'manager: no console');
        assert.equal(await s.page.locator('main .adm-tabbar--d').count(), 1, 'manager: the unit settings strip is unchanged');
        assert.equal(await s.page.locator('main .con-ph').count(), 0, 'manager: no console page header');
        await s.go('#/sysadmin/plat/id', 3000);
        assert.doesNotMatch(await s.page.evaluate(() => location.hash), /^#\/sysadmin/, 'manager: #/sysadmin refused');
        assert.deepEqual(s.errs, []);
      } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); }
    }
    {
      const lab = await world(); let s = null;
      try {
        s = await openAs(b, lab, LAB.empA, LAB.pw); s.page.setDefaultTimeout(15000);
        await s.page.goto(lab.base + '/#/sysadmin/overview', { waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(4000);
        assert.doesNotMatch(await s.page.evaluate(() => location.hash), /^#\/sysadmin/, 'employee: #/sysadmin refused');
        assert.equal(await s.page.locator('aside.bsb.bsb--console, aside.bsb [data-con-tab]').count(), 0, 'employee: no console');
        assert.deepEqual(s.errs, []);
      } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); }
    }
  } finally { await b.close(); }
});
