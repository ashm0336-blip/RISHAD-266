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
   (S8) «الرئيسية»: a skeleton (never «٠») while /api/overview is held back, then the four status cards with the lab's real counts; each
       card link, «عرض الكل» and «إرسال تعميم» land on their page; a failed read shows a status row and no «تحديث» button; phone fits;
   (P) parity with develop@625dac6: an active lock beyond Home's first five failed-sign-in rows keeps «فكّ القفل»; the users row menu
       «تعديل الصلاحيات» opens «الإدارات» on the account's unit (Back returns); the security log search keeps the typed text and filters;
   (ACC) the collapsible accordion sidebar: each group header is a button (aria-expanded · aria-controls); a deep link opens the group of
       its page (one per group) and only that one; a header opens/closes a group without navigating (Enter, Space, a click), arrows move
       between the visible controls, a collapsed group holding the current page is marked; Back and an in-page link reopen the right
       group; nothing hidden takes the focus; the rail names its icons (aria-label + a tooltip on hover and on keyboard focus); 1366×768
       and 1280×720 show «الرئيسية», the four headers, the exit and the user card with the largest group open, no sideways scroll; the
       phone drawer (390×844) does the same; nothing is stored or saved;
   (FIX) review findings: a collapsed group shows and announces its security-events count or unsaved drafts (header and rail
       icon, which is also aria-current for the current group); the open console drawer keeps Tab inside it; the keyboard exit keeps
       the focus; neutral notification counts; policy fields keep each key and the save is confirmed at once; «كلمة مؤقتة» on setup
       shows its dialog there;
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
/* V7 P0: «الإدارات» عنوانُها #/sysadmin/org (والقديم #/sysadmin/depts يُقرأ ثم يُكتب الجديد) */
const addr = (d) => '#/sysadmin/' + (d[0] === 'depts' ? 'org' : d[0]) + (d[1] ? '/' + d[1] : '');
const sel = (d) => 'aside.bsb [data-con-tab="' + d[0] + '"]' + (d[1] ? '[data-con-sub="' + d[1] + '"]' : ':not([data-con-sub])');
/* the accordion sidebar (one group open at a time): an item of a collapsed group is reached by opening its group header first */
async function reach(page, d) {
  const l = page.locator(typeof d === 'string' ? d : sel(d)).first();
  if (!(await l.isVisible())) { await page.click('#' + await l.evaluate((e) => e.closest('.s-cg').querySelector('.s-cgh').id)); await page.waitForTimeout(200); }
  return l;
}
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
      await (await reach(page, d)).click(); await page.waitForTimeout(1100);
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
    for (const [h, want, title] of [...DEST.map((d) => [addr(d), addr(d), d[2]]), ['#/sysadmin/depts', '#/sysadmin/org', 'الإدارات'], ['#/sysadmin/plat', '#/sysadmin/plat/setup', 'التهيئة والاستعادة'], ['#/sysadmin/plat/zzz', '#/sysadmin/plat/id', 'هوية المنصة']]) {
      await page.goto('about:blank'); await page.goto(lab.base + '/' + h, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3500);   /* a real load, not a same-document hash change */
      st = await state(page);
      assert.equal(st.hash, want, h + ': cold load keeps / normalises the address');
      assert.equal(st.h2, title, h + ': opens «' + title + '»');
      assert.deepEqual(st.cur, [title], h + ': its item is current');
    }
    /* (B) a platform draft: marked, kept across a move inside the console, and leaving asks first */
    await (await reach(page, ['plat', 'id'])).click(); await page.waitForTimeout(1200);
    await page.locator('main input[data-k="name"]').fill('TEST_ONLY اسم مؤقت'); await page.waitForTimeout(800);
    assert.equal(await page.locator(sel(['plat', 'id']) + ' .s-dot').count(), 1, 'the unsaved section is marked in the sidebar');
    await (await reach(page, ['users', null])).click(); await page.waitForTimeout(1200);
    await (await reach(page, ['plat', 'id'])).click(); await page.waitForTimeout(1200);
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
        await (await reach(page, ['plat', 'notif'])).click(); await page.waitForTimeout(1500);
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

/* CORE-02 S8 — the home page. Lab seed (local_server.mjs): 5 active accounts and none frozen; 3 registered employees, 2 of them without an
   account; 2 departments and 1 section, the section with no manager; the super is the one live session. */
test('(S8) «الرئيسية»: skeleton before the read, real counts after it, links, actions, failed read, phone', { timeout: 600000 }, async () => {
  const b = await chromium.launch();
  /* the display layer writes digits as ٠-٩ inside bidi marks: compared here as plain digits */
  const cards = (page) => page.evaluate(() => { const N = (x) => String(x).replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim(); return Object.fromEntries([...document.querySelectorAll('main .adm-ov-stat')].map((c) => [c.querySelector('h3').textContent.trim(),
    { rows: Object.fromEntries([...c.querySelectorAll('.adm-ov-sr')].map((r) => [r.querySelector('.l').textContent.trim(), r.querySelector('.v') ? N(r.querySelector('.v').textContent) : (r.querySelector('.bs-skel') ? 'SKEL' : '')])),
      lnk: c.querySelector('.adm-ov-lnk').textContent.trim(), href: c.querySelector('.adm-ov-lnk').getAttribute('href') }])); });
  try {
    {
      const lab = await world(); const writes = []; let s = null, release = null;
      const held = new Promise((r) => { release = r; });
      try {
        s = await openAs(b, lab, LAB.superUn, LAB.superPw, { onPage: async (p) => { watchWrites(p, writes); await p.route('**/api/overview', async (r) => { await held; await r.continue(); }); } });
        s.page.setDefaultTimeout(15000); const page = s.page;
        await page.waitForTimeout(1000);
        assert.equal(await page.evaluate(() => location.hash), '#/sysadmin/overview');
        const c0 = await cards(page);
        assert.deepEqual(Object.keys(c0), ['حالة المنصة', 'الحسابات', 'الوحدات التنظيمية', 'الأمن اليوم']);
        assert.deepEqual(c0['الأمن اليوم'].rows, { 'محاولات دخول فاشلة': 'SKEL', 'أقفال نشطة': 'SKEL', 'كتابات مرفوضة': 'SKEL' }, 'held read: skeletons, no «٠»');
        assert.equal(c0['الحسابات'].rows['موظفون بلا حساب'], 'SKEL');
        assert.ok(await page.locator('main .adm-ov-hero .adm-ov-skl .bs-skel').count() > 0, 'the decision list shows a skeleton');
        assert.equal(await page.locator('main .adm-ov-ok').count(), 0, 'no «لا شيء يحتاج قرارك» before the read');
        assert.equal(await page.locator('main .adm-ov-stat[aria-busy="true"]').count(), 2);
        release(); await page.waitForTimeout(3500);
        const c1 = await cards(page);
        assert.deepEqual(c1['الحسابات'].rows, { 'نشطة': '5', 'مجمّدة': '0', 'موظفون بلا حساب': '2', 'متصلون الآن': '1' }, JSON.stringify(c1['الحسابات']));
        assert.deepEqual(c1['الوحدات التنظيمية'].rows, { 'الإدارات': '2', 'الأقسام': '1', 'بلا مدير': '1' });
        assert.deepEqual(c1['الأمن اليوم'].rows, { 'محاولات دخول فاشلة': '0', 'أقفال نشطة': '0', 'كتابات مرفوضة': '0' });
        assert.equal(c1['حالة المنصة'].rows['الاتصال'], '● متصل');
        assert.equal(c1['حالة المنصة'].rows['آخر نسخة شاملة'], 'لم تُؤخذ بعد');
        assert.match(await page.textContent('main .adm-ov-stat[data-k="acc"] small'), /^\W*[3٣]\W* موظفين في كل الإدارات$/);
        /* decisions: the lab has no backup yet and one unit without a manager; their actions exist (none is clicked: nothing is written) */
        const dec = await page.evaluate(() => [...document.querySelectorAll('main .adm-ov-al')].map((a) => [a.querySelector('.t').textContent.trim(), a.querySelector('button') ? a.querySelector('button').textContent.trim() : '']));
        assert.deepEqual(dec, [['لم تُؤخذ نسخة احتياطية شاملة بعد', 'أخذ نسخة الآن'], ['وحدة واحدة بلا مدير — لا يعتمد فيها أحدٌ الجدول أو التقرير اليومي', 'الإدارات']]);
        assert.match((await page.textContent('main #ov-h-dec')).trim(), /^يحتاج قرارك \(\W*[2٢]\W*\)$/);
        /* no shortcut tiles: the platform settings are sidebar items only */
        assert.equal(await page.locator('main a[href*="/plat/"], main [data-con-tab]').count(), 0);
        /* each card link opens its page (and Back returns home) */
        for (const [t, h] of [['حالة المنصة', '#/sysadmin/backup'], ['الحسابات', '#/sysadmin/users'], ['الوحدات التنظيمية', '#/sysadmin/depts'], ['الأمن اليوم', '#/sysadmin/sec']]) {
          assert.equal(c1[t].href, h);
          await page.locator('main .adm-ov-stat', { has: page.locator('h3', { hasText: t }) }).locator('.adm-ov-lnk').click(); await page.waitForTimeout(1500);
          assert.equal(await page.evaluate(() => location.hash), h, t + ' → ' + h);
          assert.equal(await page.locator('aside.bsb [aria-current="page"]').count(), 1);
          await page.goBack(); await page.waitForTimeout(1500);
          assert.equal(await page.evaluate(() => location.hash), '#/sysadmin/overview', 'Back returns home');
        }
        /* a filtered row: failed sign-ins today → the security log, filter «دخول» + «اليوم» */
        await page.locator('main .adm-ov-stat[data-k="sec"] button.adm-ov-sr', { hasText: 'محاولات دخول فاشلة' }).click(); await page.waitForTimeout(1500);
        assert.equal(await page.evaluate(() => location.hash), '#/sysadmin/sec');
        assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('main .adm-chip[aria-pressed="true"]')].map((e) => e.textContent.trim())), ['دخول', 'اليوم']);
        await page.goBack(); await page.waitForTimeout(1500);
        /* «عرض الكل» */
        for (const [t, h] of [['عرض الكل في سجل الأمن', '#/sysadmin/sec'], ['عرض الكل في مراقبة الحسابات', '#/sysadmin/users']]) {
          await page.locator('main .adm-ov-more', { hasText: t }).first().click(); await page.waitForTimeout(1500);
          assert.equal(await page.evaluate(() => location.hash), h, t);
          await page.goBack(); await page.waitForTimeout(1500);
        }
        const nf0 = await page.locator('[data-bs-nf]').count();   /* the bell button itself carries data-bs-nf; the open list adds its panel */
        await page.locator('main .adm-ov-more', { hasText: 'عرض الكل في التنبيهات' }).click(); await page.waitForTimeout(1200);
        assert.ok(await page.locator('[data-bs-nf]').count() > nf0, '«عرض الكل» of the platform events opens the bell');
        await page.keyboard.press('Escape'); await page.mouse.click(700, 140); await page.waitForTimeout(500);
        /* «إرسال تعميم» → the broadcast view of «التنبيهات والتعاميم» */
        await page.locator('main .con-ph-a button', { hasText: 'إرسال تعميم' }).click(); await page.waitForTimeout(2000);
        assert.equal(await page.evaluate(() => location.hash), '#/sysadmin/plat/notif');
        assert.equal(await page.locator('main textarea[data-nf-bc="body"]').count(), 1, 'opens on the broadcast form');
        await page.goBack(); await page.waitForTimeout(1500);
        await page.locator('main .con-ph-a button', { hasText: 'أخذ نسخة شاملة' }).click(); await page.waitForTimeout(1500);
        assert.equal(await page.evaluate(() => location.hash), '#/sysadmin/backup');
        assert.deepEqual(writes, []); assert.deepEqual(s.errs, []);
      } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); }
    }
    {
      /* /api/overview fails: a status row, the automatic retry, no «تحديث» button; and the phone layout fits */
      const lab = await world(); const writes = []; let s = null;
      try {
        s = await openAs(b, lab, LAB.superUn, LAB.superPw, { ...MOBILE, onPage: async (p) => { watchWrites(p, writes); await p.route('**/api/overview', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":0}' })); } });
        s.page.setDefaultTimeout(15000); const page = s.page;
        await page.waitForTimeout(1500);
        assert.equal(await page.locator('main .adm-ov-err[role="status"]').count(), 1);
        assert.match(await page.textContent('main .adm-ov-err'), /تعذّرت القراءة، نعيد المحاولة تلقائياً/);
        assert.equal(await page.locator('main button', { hasText: /^تحديث$/ }).count(), 0, 'no «تحديث» button');
        assert.equal(await page.locator('main .adm-ov-ok').count(), 0, 'no «nothing to decide» claim without data');
        assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, 'phone: no sideways scroll');
        await page.unroute('**/api/overview'); await page.waitForTimeout(9000);
        assert.equal(await page.locator('main .adm-ov-err').count(), 0, 'the automatic retry clears the error');
        assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, 'phone: no sideways scroll with data');
        assert.deepEqual(writes, []); assert.deepEqual(s.errs, []);
      } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); }
    }
  } finally { await b.close(); }
});

/* CORE-02 S9 — one visual system on every console page, at three sizes and in both themes: no sideways scroll, the page title (h2)
   whole and inside the screen, the content starting under the header (no overlap), and the platform save actions where the thumb is:
   in the header on desktop and tablet, a bar at the bottom of the screen on a phone. Nothing is saved; no page error. */
test('(S9) every destination × phone / tablet / desktop × light / dark: no overflow, whole title, content under the header; plat save bar', { timeout: 900000 }, async () => {
  const b = await chromium.launch();
  const SIZES = [['phone', MOBILE], ['tablet', { viewport: { width: 768, height: 1024 }, context: { isMobile: true, hasTouch: true } }], ['desktop', { viewport: { width: 1440, height: 900 } }]];
  try {
    for (const [sz, opt] of SIZES) {
      const lab = await world(); const writes = []; let s = null;
      try {
        s = await openAs(b, lab, LAB.superUn, LAB.superPw, { ...opt, onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
        const page = s.page; await page.waitForTimeout(1500);
        for (const th of ['light', 'dark']) {
          await page.evaluate((x) => KIVO.__bsThemeSet(x), th); await page.waitForTimeout(300);
          for (const d of DEST) {
            await s.go(addr(d), 900);
            const m = await page.evaluate(() => {
              const h = document.querySelector('main .con-ph h2'), ph = document.querySelector('main .con-ph');
              const r = h && h.getBoundingClientRect(), pr = ph && ph.getBoundingClientRect();
              let nx = ph && ph.nextElementSibling; while (nx && (!nx.getBoundingClientRect().height || getComputedStyle(nx).position === 'fixed')) nx = nx.nextElementSibling;
              return { ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, h2: h ? h.textContent.trim() : null,
                inside: !!r && r.left >= -1 && r.right <= innerWidth + 1 && r.height > 0, clip: !!h && h.scrollWidth > h.clientWidth + 1,
                under: !nx || nx.getBoundingClientRect().top >= pr.bottom - 1, theme: document.documentElement.getAttribute('data-theme') };
            });
            const at = sz + ' ' + th + ' ' + addr(d);
            assert.ok(m.ov <= 1, at + ': no sideways scroll (' + m.ov + ')');
            assert.equal(m.h2, d[2], at + ': the page title');
            assert.ok(m.inside && !m.clip, at + ': the title is whole and inside the screen');
            assert.ok(m.under, at + ': the content starts under the header');
          }
        }
        /* the platform save actions: a draft (typed, never saved) shows them; on a phone they are a bar at the bottom of the screen */
        await s.go('#/sysadmin/plat/id', 1500);
        const inp = page.locator('main input[data-k="name"]'); await inp.fill('منصة تجريبية'); await inp.blur(); await page.waitForTimeout(700);
        const bar = await page.evaluate(() => {
          const e = document.querySelector('main .adm-pl-bar'), sv = [...document.querySelectorAll('main .con-ph button')].find((x) => /حفظ ونشر/.test(x.textContent));
          const r = sv && sv.getBoundingClientRect(), cs = e && getComputedStyle(e);
          return { on: !!e, pos: cs && cs.position, save: !!r && r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 1, bottom: !!r && r.bottom > innerHeight - 70, primary: !!sv && sv.classList.contains('bs-btn--primary'),
            ov: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        });
        assert.ok(bar.on && bar.save && bar.primary, sz + ': «حفظ ونشر للجميع» is visible and is the primary button');
        assert.equal(bar.pos === 'fixed', sz === 'phone', sz + ': the save bar is fixed at the bottom on a phone only');
        if (sz === 'phone') assert.ok(bar.bottom, 'phone: the save actions sit at the bottom of the screen');
        assert.ok(bar.ov <= 1, sz + ': no sideways scroll with the save bar');
        await page.locator('main .con-ph button', { hasText: 'تجاهل' }).click(); await page.waitForTimeout(600);
        assert.equal(await page.locator('main .adm-pl-bar').count(), 0, sz + ': discarding the draft removes the bar');
        assert.deepEqual(writes, [], sz + ': nothing was saved');
        assert.deepEqual(s.errs, [], sz + ': no page error');
      } finally { if (s) await s.ctx.close().catch(() => {}); await lab.close(); }
    }
  } finally { await b.close(); }
});

/* CORE-02 S10 — accessibility and keyboard. A keyboard-only walk (Tab order = the sidebar's visual order, Enter opens the page and puts the
   focus on its h2, Shift+Tab returns to the sidebar); the focus ring on the dark sidebar and every sidebar text pair measured in the page
   (light and dark); one h1, one h2 and no skipped heading level on all 17 pages, one current item and no aria-selected in the sidebar;
   dialogs: named, focus inside, Tab stays inside, Escape closes and the focus returns to the opener (a manager dialog and the exit
   confirmation); reduced motion stops the collapse slide; the phone drawer in both modes: the burger states aria-expanded, opening moves
   the focus to the current page, Escape closes it and returns to the burger. Nothing is saved. */
const CONTRAST = `(() => {
  const P = (s) => { const m = /rgba?\\(([^)]+)\\)/.exec(s || ''); if (!m) return null; const v = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
  const lum = (c) => { const l = c.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
  const bgOf = (el) => { const st = []; for (let n = el; n; n = n.parentElement) { st.push(P(getComputedStyle(n).backgroundColor)); if (n.matches('aside.bsb')) break; }
    let c = [255, 255, 255, 1]; for (let i = st.length - 1; i >= 0; i--) if (st[i] && st[i][3] > 0) c = over(st[i], c); return c; };
  window.__cr = (el, prop) => { const f = P(getComputedStyle(el)[prop || 'color']), b = bgOf(el); return cr(f[3] < 1 ? over(f, b) : f, b); };
  window.__crBg = (el) => bgOf(el);
})()`;
test('(S10) keyboard walk, focus ring and contrast, headings, dialogs, reduced motion, the phone drawer', { timeout: 900000 }, async () => {
  const b = await chromium.launch();
  try {
    {
      const lab = await world(); const writes = []; let s = null;
      try {
        s = await openAs(b, lab, LAB.superUn, LAB.superPw, { context: { reducedMotion: 'reduce' }, onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
        const page = s.page; await page.waitForTimeout(1500); await page.evaluate(CONTRAST);
        await s.go('#/sysadmin/overview', 2000);
        /* keyboard only (accordion since the console sidebar became collapsible — intended change of this order): the collapse control,
           «الرئيسية», the four group headers (all collapsed on Home), the exit and the user card; an open group's items follow its header */
        const walk = async (n) => {
          await page.focus('aside.bsb .s-tog2');
          const order = [];
          for (let i = 0; i < n; i++) {
            await page.keyboard.press('Tab');
            order.push(await page.evaluate(() => { const a = document.activeElement, cs = getComputedStyle(a);
              return { t: a.classList.contains('s-exit') ? 'exit' : a.classList.contains('s-user') ? 'user' : a.classList.contains('s-cgh') ? 'H:' + a.textContent.trim() : (a.getAttribute('data-con-tab') ? (a.querySelector('.nlbl') || a).textContent.trim() : a.className),
                ring: cs.outlineStyle === 'solid' && parseFloat(cs.outlineWidth) >= 2 ? window.__cr(a, 'outlineColor') : 0 }; }));
          }
          return order;
        };
        const H = ['الإدارة المؤسسية', 'إعدادات المنصة', 'الأمن والرقابة', 'البيانات والاستمرارية'].map((x) => 'H:' + x);
        let order = await walk(7);
        assert.deepEqual(order.map((o) => o.t), ['الرئيسية', ...H, 'exit', 'user'], 'Tab order on Home: «الرئيسية», the four headers, the exit, the user card');
        for (const o of order) assert.ok(o.ring >= 3, 'light: the focus ring on «' + o.t + '» is ' + o.ring + ':1 (≥3)');
        await page.click('#con-gh-plat'); await page.waitForTimeout(300);
        order = await walk(15);
        assert.deepEqual(order.map((o) => o.t), ['الرئيسية', H[0], H[1], ...DEST.filter((d) => d[0] === 'plat' && d[1] !== 'setup').map((d) => d[2]), H[2], H[3], 'exit', 'user'], 'an open group: its items, in order, right after its header');
        for (const o of order) assert.ok(o.ring >= 3, 'light: the focus ring on «' + o.t + '» is ' + o.ring + ':1 (≥3)');
        /* Enter on an item opens it and puts the focus on the page title; Shift+Tab goes back into the sidebar */
        await (await reach(page, ['users', null])).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
        let st = await state(page);
        assert.equal(st.hash, '#/sysadmin/users'); assert.equal(st.h2, 'مراقبة الحسابات'); assert.ok(st.focus, 'Enter: the focus is on the page h2');
        await page.keyboard.press('Shift+Tab');
        assert.ok(await page.evaluate(() => !!document.activeElement.closest('aside.bsb')), 'Shift+Tab from the title returns to the sidebar');
        /* contrast of the sidebar text, light and dark */
        for (const th of ['light', 'dark']) {
          await page.evaluate((x) => KIVO.__bsThemeSet(x), th); await page.waitForTimeout(400);
          const m = await page.evaluate(() => {
            const q = (s) => document.querySelector('aside.bsb ' + s), out = {};
            for (const [k, s] of [['item', '.s-ci:not(.on) .nlbl'], ['current', '.s-ci.on .nlbl'], ['heading', '.s-cgh .nlbl'], ['space', '.s-space .s-spt > span.nlbl'],   /* review of S10: the «مسؤول المنصة» line left the space row (the user card names the role) */
              ['exit', '.s-exit .nlbl'], ['exit-small', '.s-exit small'], ['brand', '.s-co'], ['version', '.s-ver'], ['user', '.s-un'], ['role', '.s-ur']]) { const e = q(s); out[k] = e ? window.__cr(e) : -1; }
            const a = q('.s-ci.on'); a.focus(); out.ringCur = window.__cr(a, 'outlineColor'); return out;
          });
          for (const [k, r] of Object.entries(m)) assert.ok(r >= (k.startsWith('ring') ? 3 : 4.5), th + ': ' + k + ' ' + r + ':1');
        }
        await page.evaluate(() => KIVO.__bsThemeSet('light')); await page.waitForTimeout(300);
        /* every page: one h1, one h2, no skipped level; one current item; no tab semantics in the sidebar */
        for (const d of DEST) {
          await s.go(addr(d), 900);
          const h = await page.evaluate(() => {
            const vis = (e) => e.classList.contains('bs-sr-only') || (e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0);
            const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')].filter(vis).map((e) => +(e.getAttribute('aria-level') || e.tagName[1]));
            let prev = 0, skip = ''; for (const l of hs) { if (l > prev + 1 && !skip) skip = prev + '→' + l; prev = l; }
            return { h1: hs.filter((l) => l === 1).length, h2: hs.filter((l) => l === 2).length, first: hs[0], skip, cur: document.querySelectorAll('aside.bsb [aria-current="page"]').length,
              sel: document.querySelectorAll('aside.bsb [aria-selected], aside.bsb [role=tab]').length };
          });
          const at = addr(d);
          assert.equal(h.h1, 1, at + ': one h1'); assert.equal(h.first, 1, at + ': the h1 comes first'); assert.equal(h.h2, 1, at + ': one h2'); assert.equal(h.skip, '', at + ': no skipped heading level');
          assert.equal(h.cur, 1, at + ': one current item'); assert.equal(h.sel, 0, at + ': no tab semantics in the sidebar');
        }
        /* a dialog: named, focus inside, Tab stays inside, Escape closes, focus back on the opener */
        await s.go('#/sysadmin/depts', 1500);
        const op = page.locator('main button.add').first(); await op.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
        const dlg = () => page.evaluate(() => { const d = document.querySelector('main [role=dialog]'); return d ? { name: d.getAttribute('aria-label') || '', inside: d.contains(document.activeElement) } : null; });
        let dl = await dlg(); assert.ok(dl && dl.name.length > 0, 'the manager dialog is named'); assert.ok(dl.inside, 'the focus moves into the dialog');
        for (let i = 0; i < 14; i++) await page.keyboard.press('Tab');
        assert.ok((await dlg()).inside, 'Tab stays inside the dialog');
        for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+Tab');
        assert.ok((await dlg()).inside, 'Shift+Tab stays inside the dialog');
        await page.keyboard.press('Escape'); await page.waitForTimeout(500);
        assert.equal(await dlg(), null, 'Escape closes the dialog');
        assert.ok(await op.evaluate((e) => e === document.activeElement), 'the focus returns to the button that opened it');
        /* the exit confirmation (an unsaved platform draft): named, starts on «البقاء», Escape keeps the console and returns to the exit */
        await s.go('#/sysadmin/plat/id', 1500);
        const inp = page.locator('main input[data-k="name"]'); await inp.fill('منصة تجريبية'); await inp.blur(); await page.waitForTimeout(700);
        await page.focus('aside.bsb .s-exit'); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
        const cf = await page.evaluate(() => { const d = document.querySelector('[role=alertdialog]'), id = d && d.getAttribute('aria-labelledby'), t = id && document.getElementById(id);
          return d ? { name: t ? t.textContent.trim() : '', start: document.activeElement.textContent.trim() } : null; });
        assert.ok(cf, 'leaving with a draft asks first'); assert.equal(cf.name, 'تغييرات غير محفوظة', 'the confirmation is named'); assert.equal(cf.start, 'البقاء', 'the focus starts on «البقاء»');
        await page.keyboard.press('Escape'); await page.waitForTimeout(600);
        assert.equal(await page.locator('[role=alertdialog]').count(), 0, 'Escape answers «البقاء»');
        assert.match(await page.evaluate(() => location.hash), /^#\/sysadmin\/plat\/id/, 'still in the console');
        assert.ok(await page.evaluate(() => document.activeElement.classList.contains('s-exit')), 'the focus returns to the exit');
        await page.locator('main .con-ph button', { hasText: 'تجاهل' }).click(); await page.waitForTimeout(500);
        /* reduced motion: the collapse does not slide */
        await page.click('aside.bsb .s-tog2'); await page.waitForTimeout(150);
        const dur = await page.evaluate(() => getComputedStyle(document.querySelector('main.bs-main')).animationDuration);
        assert.ok(parseFloat(dur) < 0.01, 'reduced motion: no slide (' + dur + ')');
        await page.click('aside.bsb .s-tog2'); await page.waitForTimeout(400);
        assert.deepEqual(writes, [], 'nothing was saved'); assert.deepEqual(s.errs, [], 'no page error');
      } finally { if (s) await s.ctx.close().catch(() => {}); await lab.close(); }
    }
    {
      const lab = await world(); const writes = []; let s = null;
      try {
        s = await openAs(b, lab, LAB.superUn, LAB.superPw, { ...MOBILE, onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
        const page = s.page; await page.waitForTimeout(1500);
        for (const [hash, cur] of [['#/sysadmin/sec', '.s-ci.on'], ['#/kpis', 'a.n.on[data-key="kpis"]']]) {
          await s.go(hash, 2000);
          const dw = () => page.evaluate((c) => { const a = document.querySelector('aside.bsb'), r = a.getBoundingClientRect(), bg = document.querySelector('.bs-burger');
            return { open: r.right > 0 && r.left < innerWidth && !a.classList.contains('cx'), exp: bg.getAttribute('aria-expanded'), onCur: !!document.activeElement.closest('aside.bsb') && document.activeElement.matches(c), onBurger: document.activeElement === bg }; }, cur);
          assert.equal((await dw()).exp, 'false', hash + ': the burger states a closed drawer');
          await page.focus('.bs-burger'); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
          let d = await dw(); assert.ok(d.open, hash + ': the drawer opens'); assert.equal(d.exp, 'true'); assert.ok(d.onCur, hash + ': the focus is on the current page in the drawer');
          await page.keyboard.press('Escape'); await page.waitForTimeout(700);
          d = await dw(); assert.ok(!d.open, hash + ': Escape closes the drawer'); assert.equal(d.exp, 'false'); assert.ok(d.onBurger, hash + ': the focus returns to the burger');
        }
        assert.deepEqual(writes, [], 'phone: nothing was saved'); assert.deepEqual(s.errs, [], 'phone: no page error');
      } finally { if (s) await s.ctx.close().catch(() => {}); await lab.close(); }
    }
  } finally { await b.close(); }
});

/* review of S10: at 1366×900 the whole console sidebar is in view; the gold edge faces the page; every in-console link adds a history
   entry (Back returns to the page it was clicked on); leaving with an unsaved platform draft by Back or a typed address asks first;
   no page title repeated as its first card title; Home's empty lists have no column header; the tablet login preview has no empty
   frame; the activity log shows no raw server code or storage key. */
test('(R) review of S10: sidebar fits 1366×900, gold edge, Back after in-page links, draft on Back, titles, empty lists, tablet preview, Arabic log', { timeout: 600000 }, async () => {
  const b = await chromium.launch(); const lab = await world(); const writes = []; let s = null, t = null;
  try {
    s = await openAs(b, lab, LAB.superUn, LAB.superPw, { viewport: { width: 1366, height: 900 }, onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
    const page = s.page;
    await s.go('#/sysadmin/plat/id', 3500);   /* the accordion: the largest group (إعدادات المنصة, 8 items) open — the longest the sidebar gets */
    const fit = await page.evaluate(() => {
      const n = document.querySelector('aside.bsb .s-nav'), all = [...document.querySelectorAll('aside.bsb [data-con-tab]')], it = [...document.querySelectorAll('aside.bsb [data-con-tab], aside.bsb .s-cgh')].filter((e) => e.getClientRects().length), nb = n.getBoundingClientRect(), last = it[it.length - 1].getBoundingClientRect();
      return { n: all.length, lastBot: Math.round(last.bottom), navBot: Math.round(nb.bottom), sh: n.scrollHeight, ch: n.clientHeight, shadow: getComputedStyle(document.querySelector('aside.bsb')).boxShadow };
    });
    assert.equal(fit.n, 17);
    assert.ok(fit.lastBot <= fit.navBot, '1366×900: the last visible console control (bottom ' + fit.lastBot + ') is inside the sidebar (bottom ' + fit.navBot + ')');
    assert.ok(fit.sh <= fit.ch + 1, '1366×900: the console navigation does not scroll (' + fit.sh + ' / ' + fit.ch + ')');
    assert.match(fit.shadow, /2px 0px 0px 0px inset|inset 2px 0px 0px/, 'gold edge on the page-facing edge (' + fit.shadow + ')');
    assert.doesNotMatch(fit.shadow, /-2px 0px 0px/, 'not on the outer screen edge');
    await s.go('#/sysadmin/overview', 3000);
    /* Home's empty lists: the empty line only, no column header */
    const th = await page.evaluate(() => [...document.querySelectorAll('main .adm-ov-none')].filter((e) => e.offsetParent).map((e) => { const c = e.closest('section, .bs-card'); return [e.textContent.trim(), c ? c.querySelectorAll('.adm-ov-th').length : -1]; }));
    assert.ok(th.length > 0, 'the lab has at least one empty Home list');
    for (const [txt, n] of th) assert.equal(n, 0, '«' + txt + '»: no column header over an empty list');
    /* in-page links add a history entry: Back returns to the page they were clicked on */
    await page.locator('main .con-ph-a button', { hasText: 'أخذ نسخة شاملة' }).click(); await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(() => location.hash), '#/sysadmin/backup');
    await page.goBack(); await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(() => location.hash), '#/sysadmin/overview', '«أخذ نسخة شاملة» then Back: Home');
    await s.go('#/sysadmin/plat/setup', 3000);
    await page.locator('main button', { hasText: 'إلى النسخة الاحتياطية' }).first().click(); await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(() => location.hash), '#/sysadmin/backup');
    await page.goBack(); await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(() => location.hash), '#/sysadmin/plat/setup', 'setup → «إلى النسخة الاحتياطية» → Back: setup');
    /* no page title repeated as the first card title */
    for (const [h, title] of [['#/sysadmin/users', 'مراقبة الحسابات'], ['#/sysadmin/oplog', 'سجل الأنشطة والتغييرات'], ['#/sysadmin/histimp', 'استيراد البيانات التاريخية']]) {
      await s.go(h, 3000);
      const n = await page.evaluate((x) => document.querySelector('main').innerText.split(x).length - 1, title);
      assert.equal(n, 1, h + ': «' + title + '» once (the page h2)');
    }
    /* the activity log reads as Arabic: no server act code and no storage key */
    const logTxt = await page.evaluate(() => { location.hash = '#/sysadmin/oplog'; return new Promise((r) => setTimeout(() => r(document.querySelector('main').innerText), 3000)); });
    assert.doesNotMatch(logTxt, /\b(emitted|changed|updated|migrated|rolled_back)\b|bassam_[a-z_]+/, 'no raw code or key in the activity log');
    /* an unsaved draft: Back out of the console asks first; cancel keeps the console and the draft; a typed address asks too */
    await s.go('#/kpis', 2500); await s.go('#/sysadmin/plat/id', 3500);
    await page.locator('main input[data-k="name"]').fill('TEST_ONLY اسم مؤقت'); await page.waitForTimeout(800);
    await page.goBack(); await page.waitForSelector('#bsCfm', { state: 'visible', timeout: 5000 });
    assert.match(await page.textContent('#bsCfmTitle'), /تغييرات غير محفوظة/, 'Back with a draft asks first');
    await page.click('#bsCfmNo'); await page.waitForTimeout(1200);
    let st = await state(page);
    assert.equal(st.hash, '#/sysadmin/plat/id', 'cancel: the address stays on the console page'); assert.match(st.cls, /bsb--console/);
    assert.equal(await page.inputValue('main input[data-k="name"]'), 'TEST_ONLY اسم مؤقت', 'cancel keeps the draft');
    await page.evaluate(() => { location.hash = '#/tasks'; }); await page.waitForSelector('#bsCfm', { state: 'visible', timeout: 5000 });
    await page.click('#bsCfmOk'); await page.waitForTimeout(3000);
    st = await state(page); assert.equal(st.hash, '#/tasks', 'confirm: the typed address opens'); assert.doesNotMatch(st.cls, /bsb--console/);
    assert.deepEqual(writes, [], 'nothing saved'); assert.deepEqual(s.errs, [], 'no page errors');
    /* tablet: the stacked login preview frame is the picture's width, centred — no empty dark area */
    t = await openAs(b, lab, LAB.superUn, LAB.superPw, { viewport: { width: 820, height: 1180 } }); t.page.setDefaultTimeout(15000);
    await t.go('#/sysadmin/plat/id', 4000);
    const pv = await t.page.evaluate(() => { const f = document.querySelector('main .adm-pv-d'), i = f && f.querySelector('iframe'); if (!f) return null; const a = f.getBoundingClientRect(), c = f.parentElement.getBoundingClientRect(), r = i.getBoundingClientRect(); return { fw: Math.round(a.width), iw: Math.round(r.width), mid: Math.abs((a.left + a.right) / 2 - (c.left + c.right) / 2) }; });
    assert.ok(pv, 'the desktop login preview is shown');
    assert.ok(pv.fw - pv.iw <= 4, 'the frame is the picture\'s width (' + pv.fw + ' vs ' + pv.iw + ')');
    assert.ok(pv.mid <= 2, 'centred in its column');
    assert.deepEqual(t.errs, []);
  } finally { for (const x of [s, t]) { try { if (x) await x.ctx.close(); } catch (e) { /* closed */ } } await lab.close(); await b.close(); }
});

test('(P) parity with 625dac6: a late active lock keeps «فكّ القفل» on Home; «تعديل الصلاحيات» opens the unit; the security log search filters', { timeout: 600000 }, async () => {
  const b = await chromium.launch(); const lab = await world(); const writes = []; let s = null;
  try {
    const DB = lab.env.DB, NOW = Date.now();
    const sec = (ts, un, ip) => DB.prepare('INSERT INTO sec(ts,uid,un,act,target,detail,ip,city,dev) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)').bind(ts, '', un, 'login_fail', '', '', ip, '', 'd');
    const st = [];
    /* six names with four failures each fill Home's five rows; late_lock has one failure (no «يحتاج قرارك» alert) and an active lock */
    for (let k = 1; k <= 6; k++) for (let i = 0; i < 4; i++) st.push(sec(NOW - 90000 - k * 1000 - i, 'TEST_ONLY_ghost_' + k, '5.5.5.' + k));
    st.push(sec(NOW - 30000, 'TEST_ONLY_late_lock', '6.6.6.6'));
    st.push(DB.prepare('INSERT INTO guard(gk,n,until) VALUES(?1,?2,?3)').bind('p:test_only_late_lock|6.6.6.6', 5, NOW + 3600000));
    await DB.batch(st);
    s = await openAs(b, lab, LAB.superUn, LAB.superPw, { onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
    const page = s.page;
    /* H36 · Home: the locked row is listed with its «فكّ القفل», and the button lifts the lock */
    await s.go('#/sysadmin/overview', 4000);
    const late = page.locator('main .adm-ov-row.c-fail', { hasText: 'TEST_ONLY_late_lock' });
    assert.equal(await late.count(), 1, 'Home lists the locked name beyond the first five rows');
    const btn = late.locator('button', { hasText: 'فكّ القفل' });
    assert.equal(await btn.count(), 1, 'the locked row keeps «فكّ القفل»');
    assert.equal(await page.locator('main .adm-ov-row.c-fail:not(.adm-ov-th)', { hasNotText: 'فكّ القفل' }).filter({ hasText: 'TEST_ONLY_ghost' }).count(), 5, 'unlocked names stay capped at five');
    await btn.click(); await page.waitForTimeout(3000);
    assert.ok(writes.some((w) => /^POST \/api\/guard\/unlock .*u:test_only_late_lock/.test(w)), '«فكّ القفل» asks the server to lift that lock: ' + writes.join(' ; '));
    assert.equal(DB.q('SELECT gk FROM guard WHERE gk=?1 AND until>?2', 'p:test_only_late_lock|6.6.6.6', Date.now()).length, 0, 'the lock is lifted');
    writes.length = 0;
    /* U14 · users row menu «تعديل الصلاحيات»: «الإدارات» on the account's unit; Back returns to the accounts */
    for (const [who, unit] of [['TEST_ONLY موظف أ', 'TEST_ONLY إدارة أ'], ['TEST_ONLY مدير ب', 'TEST_ONLY إدارة ب']]) {
      await s.go('#/sysadmin/users', 4000);
      const row = page.locator('main .adm-tr.g-us', { hasText: who }).filter({ has: page.locator('.adm-rmb') }).last();
      await row.locator('.adm-rmb').first().click(); await page.waitForTimeout(600);
      await row.locator('[data-bs-dd]').getByText('تعديل الصلاحيات', { exact: true }).click(); await page.waitForTimeout(2500);
      const st1 = await state(page);
      assert.match(st1.hash, /^#\/sysadmin\/org\/TEST_ONLY_[AB]$/, who + ': «تعديل الصلاحيات» opens «الإدارات» on the unit (V7 P0: its address names it)');
      assert.deepEqual(st1.cur, ['الإدارات']);
      assert.equal(await page.evaluate(() => (document.getElementById('bsSelName') || {}).value ?? null), unit, who + ': the account\'s unit is selected');
      await page.goBack(); await page.waitForTimeout(1500);
      assert.equal(await page.evaluate(() => location.hash), '#/sysadmin/users', who + ': Back returns to the accounts');
    }
    /* security log search: the typed text stays and only the matching rows are listed, right away */
    await DB.batch(['TEST_ONLY_alpha', 'TEST_ONLY_beta'].map((u, i) => sec(Date.now() - 6e4 - i * 1e4, u, '7.7.7.' + i)));
    await s.go('#/sysadmin/sec', 4500);
    const names = () => page.evaluate(() => [...new Set(document.querySelector('main').innerText.match(/TEST_ONLY_(alpha|beta)\b/g) || [])].sort().join(','));
    assert.equal(await names(), 'TEST_ONLY_alpha,TEST_ONLY_beta');
    const q = page.locator('main input[placeholder="بحث بالاسم أو اسم المستخدم…"]');
    assert.equal(await q.count(), 1);
    await q.pressSequentially('alpha', { delay: 80 }); await page.waitForTimeout(1000);
    assert.equal(await q.inputValue(), 'alpha', 'typing keeps the text');
    assert.equal(await names(), 'TEST_ONLY_alpha', 'the log lists the matching name only');
    await q.fill(''); await page.waitForTimeout(1000);
    assert.equal(await names(), 'TEST_ONLY_alpha,TEST_ONLY_beta', 'clearing the search lists every row again');
    assert.deepEqual(writes, [], 'nothing saved'); assert.deepEqual(s.errs, [], 'no page errors');
  } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); await b.close(); }
});

test('(ACC) accordion sidebar: deep links per group, toggle without navigation, keyboard, Back, rail names, 1366×768 · 1280×720 fit, phone drawer', { timeout: 900000 }, async () => {
  const b = await chromium.launch();
  const acc = (page) => page.evaluate(() => {
    const a = document.querySelector('aside.bsb'), vis = (e) => e.getClientRects().length > 0;
    return { hash: location.hash,
      hdr: Object.fromEntries([...a.querySelectorAll('.s-cgh')].map((h) => { const l = document.getElementById(h.getAttribute('aria-controls'));
        return [h.id.slice(7), { exp: h.getAttribute('aria-expanded'), tag: h.tagName, list: !!l, hidden: l ? l.hidden : null, cur: h.classList.contains('is-cur'), desc: h.getAttribute('aria-describedby') || '' }]; })),
      vis: [...a.querySelectorAll('[data-con-tab]')].filter(vis).map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
      cur: [...a.querySelectorAll('[aria-current="page"]')].map((e) => [e.textContent.replace(/\s+/g, ' ').trim(), vis(e)]),
      act: document.activeElement ? (document.activeElement.id || (document.activeElement.textContent || '').trim()) : '',
      ov: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  const openOf = (st) => Object.entries(st.hdr).filter(([, h]) => h.exp === 'true').map(([g]) => g);
  const lsKeys = (page) => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  try {
    for (const [w, h] of [[1366, 768], [1280, 720]]) {
      const lab = await world(); const writes = []; let s = null;
      try {
        s = await openAs(b, lab, LAB.superUn, LAB.superPw, { viewport: { width: w, height: h }, onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
        const page = s.page; await page.waitForTimeout(1500);
        const vp = w + '×' + h;
        if (w === 1366) {
          /* structure: four header buttons, each controlling its own list; Home has no header */
          let st = await acc(page);
          assert.deepEqual(Object.keys(st.hdr), ['org', 'plat', 'sec', 'data']);
          for (const [g, x] of Object.entries(st.hdr)) { assert.equal(x.tag, 'BUTTON', g + ': a real button'); assert.ok(x.list, g + ': aria-controls names its list'); assert.equal(x.hidden, x.exp === 'false', g + ': the list is hidden exactly when collapsed'); }
          assert.deepEqual(openOf(st), [], 'Home: every group collapsed');
          assert.deepEqual(st.vis, ['الرئيسية'], 'Home: only «الرئيسية» among the items');
          /* deep link (a real load) per group: that group alone opens, its current item is visible */
          for (const [hash, g, t] of [['#/sysadmin/perms', 'org', 'خريطة الصلاحيات'], ['#/sysadmin/plat/print', 'plat', 'الطباعة والتقارير'], ['#/sysadmin/oplog', 'sec', 'سجل الأنشطة والتغييرات'], ['#/sysadmin/plat/setup', 'data', 'التهيئة والاستعادة']]) {
            await page.goto('about:blank'); await page.goto(lab.base + '/' + hash, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3500);
            st = await acc(page);
            assert.deepEqual(openOf(st), [g], hash + ': its group opens, and only it');
            assert.ok(st.hdr[g].cur, hash + ': its header is marked'); assert.deepEqual(st.cur, [[t, true]], hash + ': the current item is visible and current');
          }
          /* toggle without navigation: a click opens another group (single-open), the collapsed current group stays marked */
          const ls0 = await lsKeys(page);
          await page.click('#con-gh-org'); await page.waitForTimeout(300);
          st = await acc(page);
          assert.equal(st.hash, '#/sysadmin/plat/setup', 'a header click does not navigate');
          assert.deepEqual(openOf(st), ['org']); assert.deepEqual(st.vis, ['الرئيسية', 'الإدارات', 'مراقبة الحسابات', 'خريطة الصلاحيات']);
          assert.ok(st.hdr.data.cur && st.hdr.data.desc === 'con-gh-cur', 'the collapsed group of the current page is marked and described');
          assert.equal(await page.evaluate(() => document.getElementById('con-gh-cur').textContent), 'الصفحة الحالية ضمن هذه المجموعة');
          assert.deepEqual(st.cur, [['التهيئة والاستعادة', false]], 'still exactly one current item (inside the collapsed group)');
          /* keyboard: Enter and Space toggle the focused header; arrows move between the visible controls */
          await page.focus('#con-gh-sec'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
          assert.deepEqual(openOf(await acc(page)), ['sec'], 'Enter opens');
          await page.keyboard.press('Space'); await page.waitForTimeout(250);
          st = await acc(page); assert.deepEqual(openOf(st), [], 'Space closes'); assert.equal(st.act, 'con-gh-sec', 'the focus stays on the header');
          await page.keyboard.press('Space'); await page.waitForTimeout(250);
          await page.keyboard.press('ArrowDown'); assert.equal((await acc(page)).act, 'الأمن', 'ArrowDown: the first item of the open group');
          await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); assert.equal((await acc(page)).act, 'con-gh-data', 'ArrowDown: on to the next header');
          await page.keyboard.press('ArrowUp'); assert.equal((await acc(page)).act, 'سجل الأنشطة والتغييرات');
          await page.keyboard.press('Home'); assert.equal((await acc(page)).act, 'الرئيسية', 'Home: the first control');
          await page.keyboard.press('End'); assert.equal((await acc(page)).act, 'con-gh-data', 'End: the last visible control');
          assert.equal((await acc(page)).hash, '#/sysadmin/plat/setup', 'the keyboard toggles never navigated');
          assert.deepEqual(await lsKeys(page), ls0, 'opening and closing groups stores nothing (device or server)');
          /* nothing hidden takes the focus: a Tab walk through the whole sidebar meets only visible controls */
          await page.focus('aside.bsb .s-tog2');
          for (let i = 0; i < 30; i++) {
            await page.keyboard.press('Tab');
            const f = await page.evaluate(() => { const a = document.activeElement; return { inAside: !!a.closest('aside.bsb'), rects: a.getClientRects().length, op: getComputedStyle(a).visibility, t: (a.textContent || '').trim().slice(0, 30) }; });
            if (!f.inAside) break;
            assert.ok(f.rects > 0 && f.op === 'visible', 'focusable and visible: «' + f.t + '»');
          }
          /* an item of the open group navigates; Back reopens the group of the previous page; an in-page link opens its group */
          await page.click('#con-gh-org'); await page.waitForTimeout(250);
          await page.click('aside.bsb [data-con-tab="users"]'); await page.waitForTimeout(1500);
          st = await acc(page); assert.equal(st.hash, '#/sysadmin/users'); assert.deepEqual(openOf(st), ['org']);
          await page.goBack(); await page.waitForTimeout(1500);
          st = await acc(page); assert.equal(st.hash, '#/sysadmin/plat/setup'); assert.deepEqual(openOf(st), ['data'], 'Back: the group of the page returned to');
          await (await reach(page, ['overview', null])).click(); await page.waitForTimeout(1500);
          assert.deepEqual(openOf(await acc(page)), ['data'], '«الرئيسية» keeps the open group');
          await page.click('#con-gh-data'); await page.waitForTimeout(250);
          await page.locator('main .con-ph-a button', { hasText: 'أخذ نسخة شاملة' }).click(); await page.waitForTimeout(1500);
          st = await acc(page); assert.equal(st.hash, '#/sysadmin/backup'); assert.deepEqual(openOf(st), ['data'], 'an in-page link opens the group of its page');
          /* the rail: accessible names, a tooltip on hover and on keyboard focus, a group icon reaches its last item, no hidden header */
          await page.click('aside.bsb .s-tog2'); await page.waitForTimeout(600);
          const rail = await page.evaluate(() => [...document.querySelectorAll('aside.bsb .s-cgi, aside.bsb .s-ci--top')].map((e) => [e.getAttribute('aria-label') || e.textContent.trim(), e.getClientRects().length > 0]));
          assert.deepEqual(rail, [['الرئيسية', true], ['الإدارة المؤسسية', true], ['إعدادات المنصة', true], ['الأمن والرقابة', true], ['البيانات والاستمرارية', true]], 'rail: five named icons');
          assert.equal(await page.locator('aside.bsb .s-cgh:visible, aside.bsb [data-con-tab]:not(.s-ci--top):visible').count(), 0, 'rail: no header and no item shown');
          const tip = () => page.evaluate(() => { const p = document.getElementById('bs-tip-portal'); return p && p.style.display !== 'none' ? { t: p.textContent, pos: p.getAttribute('data-pos'), r: Math.round(p.getBoundingClientRect().right), aside: Math.round(document.querySelector('aside.bsb').getBoundingClientRect().left) } : null; });
          await page.focus('aside.bsb .s-tog2'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(300);
          let tp = await tip();
          assert.ok(tp && tp.t.startsWith('الإدارة المؤسسية'), 'keyboard focus on a rail icon shows its name: ' + JSON.stringify(tp));
          assert.equal(tp.pos, 'side'); assert.ok(tp.r <= tp.aside, 'the tooltip sits beside the rail, over the page');
          await page.keyboard.press('Tab'); await page.waitForTimeout(300);
          tp = await tip(); assert.ok(tp && tp.t.startsWith('إعدادات المنصة'), 'the next icon, its own name');
          await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
          assert.equal((await acc(page)).hash, '#/sysadmin/users', 'Enter on a group icon reaches the group\'s last item');
          await page.mouse.move(700, 500); await page.locator('aside.bsb .s-cgi[aria-label="الأمن والرقابة"]').hover(); await page.waitForTimeout(400);
          tp = await tip(); assert.ok(tp && tp.t.startsWith('الأمن والرقابة'), 'hover shows the name too');
          await page.mouse.move(700, 500);
          await page.click('aside.bsb .s-tog2'); await page.waitForTimeout(600);
        }
        /* short screens: with the largest group open, «الرئيسية», the four headers, the exit and the user card are all in view */
        await s.go('#/sysadmin/plat/id', 3000);
        const fit = await page.evaluate(() => {
          const r = (q) => { const e = document.querySelector(q); const x = e.getBoundingClientRect(); return [Math.round(x.top), Math.round(x.bottom)]; };
          const n = document.querySelector('aside.bsb .s-nav'), nb = n.getBoundingClientRect();
          const hs = [...document.querySelectorAll('aside.bsb .s-cgh, aside.bsb .s-ci--top')].map((e) => e.getBoundingClientRect());
          return { ih: innerHeight, navTop: Math.round(nb.top), navBot: Math.round(nb.bottom), hMax: Math.round(Math.max(...hs.map((x) => x.bottom))), hMin: Math.round(Math.min(...hs.map((x) => x.top))),
            exit: r('aside.bsb .s-exit'), user: r('aside.bsb .s-user'), sw: n.scrollWidth - n.clientWidth, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        });
        assert.ok(fit.hMin >= fit.navTop && fit.hMax <= fit.navBot, vp + ': «الرئيسية» and the four headers in view (' + JSON.stringify(fit) + ')');
        assert.ok(fit.exit[1] <= fit.ih && fit.user[1] <= fit.ih, vp + ': the exit and the user card in view');
        assert.ok(fit.sw <= 0 && fit.ov <= 1, vp + ': no sideways scroll');
        assert.deepEqual(writes, [], vp + ': nothing saved'); assert.deepEqual(s.errs, [], vp + ': no page error');
      } finally { if (s) await s.ctx.close().catch(() => {}); await lab.close(); }
    }
    /* phone 390×844: the drawer holds the accordion; the exit and the user card stay reachable; a choice closes the drawer */
    {
      const lab = await world(); const writes = []; let s = null;
      try {
        s = await openAs(b, lab, LAB.superUn, LAB.superPw, { ...MOBILE, onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
        const page = s.page; await page.waitForTimeout(1500);
        await s.go('#/sysadmin/plat/notif', 2500);
        await page.click('.bs-burger'); await page.waitForTimeout(700);
        let st = await acc(page);
        assert.deepEqual(openOf(st), ['plat'], 'drawer: the group of the current page is open');
        assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'التنبيهات والتعاميم', 'drawer: the focus is on the current page');
        await page.click('#con-gh-data'); await page.waitForTimeout(300);
        st = await acc(page);
        assert.deepEqual(openOf(st), ['data']); assert.equal(st.hash, '#/sysadmin/plat/notif', 'drawer: a header does not navigate or close the drawer');
        const dr = await page.evaluate(() => { const a = document.querySelector('aside.bsb'), r = (q) => a.querySelector(q).getBoundingClientRect(), n = a.querySelector('.s-nav');
          return { open: !a.classList.contains('cx'), exit: Math.round(r('.s-exit').bottom), user: Math.round(r('.s-user').bottom), ih: innerHeight, sw: n.scrollWidth - n.clientWidth }; });
        assert.ok(dr.open && dr.exit <= dr.ih && dr.user <= dr.ih && dr.sw <= 0, 'drawer: exit and user card in view, no sideways scroll ' + JSON.stringify(dr));
        await page.click('aside.bsb [data-con-tab="histimp"]'); await page.waitForTimeout(1500);
        st = await acc(page);
        assert.equal(st.hash, '#/sysadmin/histimp'); assert.ok(st.ov <= 1, 'phone: no sideways scroll');
        assert.match(await page.evaluate(() => document.querySelector('aside.bsb').className), /\bcx\b/, 'the drawer closes on a choice');
        assert.deepEqual(writes, [], 'phone: nothing saved'); assert.deepEqual(s.errs, [], 'phone: no page error');
      } finally { if (s) await s.ctx.close().catch(() => {}); await lab.close(); }
    }
  } finally { await b.close(); }
});

/* (CON) consistency pass over the console (owner request): counts follow one tone rule (Home «الحسابات» card = the accounts tiles: an
   ordinary count is neutral, a warning only when non-zero) and one count tile (.adm-ov-kpi: the number above its label, 20px/800) on
   «التنبيهات والتعاميم»; the three readiness states of «التهيئة والاستعادة» share one status style; a list with no rows shows no column
   header; the activity log's filters are four labelled groups on the shared chip (desktop: wrapping rows; phone: each group scrolls
   sideways, the page does not), «من» stays beside its date; a unit manager's #/admin log keeps its own filters. */
test('(CON) consistency: tone rule for counts, one count tile, one status style, empty lists, labelled activity-log filters', { timeout: 600000 }, async () => {
  const b = await chromium.launch(); const lab = await world(); const writes = []; let s = null, m = null, g = null;
  try {
    s = await openAs(b, lab, LAB.superUn, LAB.superPw, { viewport: { width: 1366, height: 900 }, onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
    const page = s.page;
    const tiles = (q) => page.evaluate((q) => [...document.querySelectorAll(q)].map((e) => { const v = e.querySelector('.v'), cs = getComputedStyle(v); return { l: e.querySelector('.l').textContent.trim(), v: v.textContent.trim(), c: cs.color, fs: cs.fontSize, fw: cs.fontWeight, vFirst: v === e.firstElementChild }; }), q);
    await s.go('#/sysadmin/users', 3500);
    const us = await tiles('main .adm-stat'), U = Object.fromEntries(us.map((x) => [x.l, x]));
    const zero = (v) => /^[0٠]$/.test(v);
    assert.equal(U['نشط'].c, U['إجمالي الحسابات'].c, 'an ordinary count is neutral («نشط» like «إجمالي الحسابات», as on Home)');
    for (const l of ['مجمّد', 'بصيغة كلمة مرور قديمة']) if (U[l] && zero(U[l].v)) assert.equal(U[l].c, U['إجمالي الحسابات'].c, '«' + l + '» at zero is not a warning');
    await s.go('#/sysadmin/plat/notif', 3500);
    const nf = await tiles('main [data-bs="notif-adm"] .adm-ov-kpi');
    assert.equal(nf.length, 4, 'four count tiles on the shared tile');
    for (const x of nf) { assert.ok(x.vFirst, x.l + ': the number above its label'); assert.equal(x.fs, us[0].fs, x.l + ': same number size as the accounts tiles'); assert.equal(x.fw, us[0].fw); }
    for (const x of nf) if (zero(x.v)) assert.equal(x.c, nf[0].c, x.l + ' at zero is neutral');
    await s.go('#/sysadmin/plat/setup', 3500);
    const stl = await page.evaluate(() => [...document.querySelectorAll('main .adm-st3 > .adm-pl-box')].map((bx) => { const e = bx.querySelector('.adm-pl-cap + *'); return [e.className, getComputedStyle(e).color, getComputedStyle(e).fontSize]; }));
    assert.equal(stl.length, 3);
    for (const x of stl) { assert.equal(x[0], 'adm-pl-stl', 'every readiness state uses the status line'); assert.deepEqual(x.slice(1), stl[0].slice(1), 'same colour and size'); }
    await s.go('#/sysadmin/perms', 3500);
    const emp = await page.evaluate(() => [...document.querySelectorAll('main .adm-none')].filter((e) => e.offsetParent).map((e) => [e.textContent.trim(), e.closest('section').querySelectorAll('.adm-th').length]));
    assert.ok(emp.some((x) => x[0] === 'لا قوالب بعد'), 'the lab has no templates');
    for (const [t, n] of emp) assert.equal(n, 0, '«' + t + '»: no column header over an empty list');
    /* activity log, desktop */
    await s.go('#/sysadmin/oplog', 3500);
    const fl = () => page.evaluate(() => [...document.querySelectorAll('main .adm-flt > .adm-flt-r')].map((r) => { const l = r.querySelector('.adm-flt-l'), gp = r.querySelector('[role="group"]'), lr = l.getBoundingClientRect(), gr = gp.getBoundingClientRect();
      return { l: l.textContent.trim(), by: gp.getAttribute('aria-labelledby') === l.id, chips: gp.querySelectorAll('.adm-chip[aria-pressed]').length, lTop: lr.top, lBottom: lr.bottom, lRight: lr.right, gTop: gr.top, gRight: gr.right, sw: gp.scrollWidth, cw: gp.clientWidth }; }));
    let F = await fl();
    assert.deepEqual(F.map((x) => x.l), ['الكيان', 'الفعل', 'البحث', 'الفترة'], 'four labelled filter groups');
    for (const x of F) assert.ok(x.by, x.l + ': the group is named by its label');
    assert.ok(F[0].chips > 10 && F[1].chips > 10, 'entity and action filters are the shared pressed chips');
    for (const x of F) assert.ok(x.lRight > x.gRight, x.l + ': desktop label beside its group (RTL)');
    const rng = await page.evaluate(() => { const r = (e) => e.getBoundingClientRect().top, sp = [...document.querySelectorAll('main .adm-flt-rng > span')]; return [r(sp[0]), r(document.querySelector('main input[aria-label="من تاريخ"]')), r(sp[1]), r(document.querySelector('main input[aria-label="إلى تاريخ"]'))]; });
    assert.ok(Math.max(...rng) - Math.min(...rng) < 12, '«من» date «إلى» date on one line: ' + rng);
    const press = (t) => page.locator('main .adm-flt .adm-chip', { hasText: new RegExp('^' + t + '$') });
    await press('إنشاء').click(); await page.waitForTimeout(800);
    assert.equal(await press('إنشاء').getAttribute('aria-pressed'), 'true'); assert.equal(await press('كل الأفعال').getAttribute('aria-pressed'), 'false');
    await press('كل الأفعال').click(); await page.waitForTimeout(800);
    assert.equal(await press('كل الأفعال').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(writes, [], 'nothing saved'); assert.deepEqual(s.errs, [], 'no page errors');
    /* phone */
    m = await openAs(b, lab, LAB.superUn, LAB.superPw, { ...MOBILE, onPage: (p) => watchWrites(p, writes) }); m.page.setDefaultTimeout(15000);
    await m.go('#/sysadmin/oplog', 3500);
    F = await m.page.evaluate(() => [...document.querySelectorAll('main .adm-flt > .adm-flt-r')].map((r) => { const l = r.querySelector('.adm-flt-l'), gp = r.querySelector('[role="group"]'); return { l: l.textContent.trim(), lBottom: l.getBoundingClientRect().bottom, gTop: gp.getBoundingClientRect().top, sw: gp.scrollWidth, cw: gp.clientWidth, ox: getComputedStyle(gp).overflowX }; }));
    for (const x of F) assert.ok(x.lBottom <= x.gTop + 1, x.l + ': phone label above its group');
    for (const x of F.slice(0, 2)) { assert.equal(x.ox, 'auto', x.l + ': one sideways-scrolling row'); assert.ok(x.sw > x.cw, x.l + ': more chips than fit, reached by scrolling the row'); }
    const ph = await m.page.evaluate(() => ({ sx: document.documentElement.scrollWidth - document.documentElement.clientWidth, h: document.querySelector('main .adm-flt').getBoundingClientRect().height }));
    assert.ok(ph.sx <= 0, 'the page does not scroll sideways');
    assert.ok(ph.h < 420, 'the phone filter block is compact (' + ph.h + 'px)');
    assert.deepEqual(writes, [], 'phone: nothing saved'); assert.deepEqual(m.errs, [], 'phone: no page errors');
    /* a unit manager's #/admin activity log is unchanged */
    g = await openAs(b, lab, LAB.mgrA, LAB.pw); g.page.setDefaultTimeout(15000);
    await g.go('#/admin/oplog', 3500);
    const own = await g.page.evaluate(() => ({ flt: document.querySelectorAll('main .adm-flt').length, chip: [...document.querySelectorAll('main button')].some((e) => e.textContent.trim() === 'كل الأفعال') }));
    assert.deepEqual(own, { flt: 0, chip: true }, '#/admin keeps its own activity-log filters');
    assert.deepEqual(g.errs, []);
  } finally { for (const x of [s, m, g]) { try { if (x) await x.ctx.close(); } catch (e) { /* closed */ } } await lab.close(); await b.close(); }
});

/* (FIX) review findings at e405b70: a collapsed group shows and announces what it holds (the security-events count, unsaved drafts) —
   on its header in the expanded sidebar and on its rail icon (aria-label · aria-current for the current group); the open console
   drawer (≤1024) keeps Tab inside it; leaving with «مساحة العمل التشغيلية» by keyboard keeps the focus off <body>; «مفعّل» and
   «عاجل» on «التنبيهات والتعاميم» are neutral counts; the security policies keep each typed key and confirm the save at once;
   «كلمة مؤقتة» of the backup administrator shows the new password on «التهيئة والاستعادة» itself. */
test('(FIX) collapsed-group marks, rail names, drawer Tab trap, exit focus, notif tone, policy typing and save, backup temp password', { timeout: 900000 }, async () => {
  const b = await chromium.launch(); const lab = await world(); const writes = []; let s = null, t = null;
  try {
    const DB = lab.env.DB, NOW = Date.now();
    await DB.batch([1, 2, 3].map((i) => DB.prepare('INSERT INTO sec(ts,uid,un,act,target,detail,ip,city,dev) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)').bind(NOW - i * 7000, '', 'TEST_ONLY_fix_' + i, 'login_fail', '', '', '8.8.1.' + i, '', 'd')));
    s = await openAs(b, lab, LAB.superUn, LAB.superPw, { viewport: { width: 1366, height: 900 }, onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
    const page = s.page;
    await s.go('#/sysadmin/overview', 4000);
    const hdr = (g) => page.evaluate((g) => { const h = document.getElementById('con-gh-' + g), ids = (h.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      return { exp: h.getAttribute('aria-expanded'), bdg: (h.querySelector('.bdg') || {}).textContent || '', bdgVis: !!(h.querySelector('.bdg') && h.querySelector('.bdg').getClientRects().length), dot: !!h.querySelector('.s-dot'),
        desc: ids.map((i) => (document.getElementById(i) || {}).textContent || '').join(' | ') }; }, g);
    /* the shell shows digits in Arabic-Indic with direction marks: compare the plain number */
    const N = (x) => String(x || '').replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    let H = await hdr('sec');
    assert.equal(H.exp, 'false', 'Home: «الأمن والرقابة» is collapsed');
    assert.ok(H.bdgVis && N(H.bdg) === '3', 'the collapsed header shows the security-events count: ' + JSON.stringify(H));
    assert.match(N(H.desc), /أحداث أمنية اليوم: 3/, 'and describes it to assistive technology');
    assert.deepEqual(await hdr('org'), { exp: 'false', bdg: '', bdgVis: false, dot: false, desc: '' }, 'a group with nothing pending shows no mark');
    await page.click('#con-gh-sec'); await page.waitForTimeout(300);
    H = await hdr('sec'); assert.equal(H.exp, 'true'); assert.ok(!H.bdg && !H.desc, 'open: the badge is on the item itself, not on the header');
    assert.equal(N(await page.locator('aside.bsb [data-con-tab="sec"]').getAttribute('aria-label')), 'الأمن، أحداث أمنية اليوم: 3');
    /* the rail: the current group is aria-current, the security icon names the count */
    await s.go('#/sysadmin/plat/notif', 3500);
    await page.click('aside.bsb .s-tog2'); await page.waitForTimeout(600);
    const rail = await page.evaluate(() => [...document.querySelectorAll('aside.bsb .s-cgi')].map((e) => [e.getAttribute('aria-label'), e.getAttribute('aria-current')])).then((r) => r.map(([l, c]) => [N(l), c]));
    assert.deepEqual(rail, [['الإدارة المؤسسية', null], ['إعدادات المنصة', 'true'], ['الأمن والرقابة، أحداث أمنية اليوم: 3', null], ['البيانات والاستمرارية', null]], 'rail: current group and the count are exposed');
    await page.click('aside.bsb .s-tog2'); await page.waitForTimeout(600);
    /* notif counts are neutral */
    const tones = await page.evaluate(() => [...document.querySelectorAll('main [data-bs="notif-adm"] .adm-ov-kpi')].map((e) => e.getAttribute('data-tone') || ''));
    assert.equal(tones.length, 4); assert.ok(tones.every((x) => x !== 'bad' && x !== 'ok'), '«مفعّل» and «عاجل» are not green/red: ' + tones);
    /* a draft in a collapsed «إعدادات المنصة» is marked on its header */
    await s.go('#/sysadmin/plat/id', 3500);
    const nm = page.locator('main [data-k="name"]'); await nm.fill((await nm.inputValue()) + ' TEST_ONLY'); await nm.dispatchEvent('change'); await page.waitForTimeout(800);
    await page.click('#con-gh-plat'); await page.waitForTimeout(300);
    H = await hdr('plat');
    assert.equal(H.exp, 'false'); assert.ok(H.dot, 'collapsed «إعدادات المنصة» with a draft: the unsaved dot on its header');
    assert.match(H.desc, /الصفحة الحالية ضمن هذه المجموعة \| تغييرات غير محفوظة/, 'described as current and unsaved');
    await page.locator('main .con-ph-a button', { hasText: 'تجاهل' }).click(); await page.waitForTimeout(800);
    /* the keyboard exit: the focus lands on the operational sidebar, not on <body> */
    await page.focus('aside.bsb a.s-exit'); await page.keyboard.press('Enter'); await page.waitForTimeout(3000);
    const ex = await page.evaluate(() => { const a = document.activeElement; return { hash: location.hash, tag: a.tagName, inAside: !!a.closest('aside.bsb'), on: a.classList.contains('on'), console: !!document.querySelector('aside.bsb.bsb--console') }; });
    assert.ok(!ex.console && ex.hash !== '' && !/sysadmin/.test(ex.hash), 'left the console: ' + JSON.stringify(ex));
    assert.ok(ex.tag !== 'BODY' && ex.inAside && ex.on, 'the focus is on the current operational page in the sidebar: ' + JSON.stringify(ex));
    /* security policies: each typed key stays; the save is confirmed at once and stores the typed value */
    await s.go('#/sysadmin/sec', 4500);
    const posts = []; page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/policy/.test(r.url())) posts.push(r.postData()); });
    const inp = page.locator('main input[type=number][aria-label="محاولات قبل القفل"]');
    await inp.click({ clickCount: 3 }); await page.keyboard.press('Backspace'); await page.waitForTimeout(250);
    assert.equal(await inp.inputValue(), '', 'Backspace clears the field');
    await page.keyboard.type('10', { delay: 150 }); await page.waitForTimeout(300);
    assert.equal(await inp.inputValue(), '10', 'typing «10» key by key shows 10');
    await page.locator('main').getByRole('button', { name: 'حفظ السياسات' }).click();
    await page.waitForSelector('#bsCfmOk', { state: 'visible', timeout: 8000 }); await page.locator('#bsCfmOk').click();
    const st = page.locator('main section[aria-label="سياسات الأمن"] [role=status]');
    await page.waitForFunction(() => /حُفظت/.test((document.querySelector('main section[aria-label="سياسات الأمن"] [role=status]') || {}).textContent || ''), null, { timeout: 2500 });
    assert.match(await st.innerText(), /حُفظت — تسري من الدخول التالي/, 'the save is confirmed right away');
    assert.equal(JSON.parse(posts.slice(-1)[0]).lockN, '10', 'the typed value is sent');
    assert.equal(String((await s.api('/api/overview')).j.policy.lockN), '10', 'and stored');
    assert.equal(await inp.inputValue(), '10');
    /* backup administrator: «كلمة مؤقتة» shows the dialog on «التهيئة والاستعادة» itself */
    await s.go('#/sysadmin/plat/setup', 4000);
    const F = (k) => page.locator('main [data-k="' + k + '"]');
    const setv = async (k, v) => { await F(k).fill(v); await F(k).dispatchEvent('change'); await page.waitForTimeout(200); };
    await setv('bk.un', '1400000077'); await setv('bk.name', 'TEST_ONLY احتياطي'); await setv('bk.pw', String(100000 + Math.floor(Math.random() * 899999)));
    await page.locator('main').getByRole('button', { name: 'إنشاء الحساب' }).click(); await page.waitForTimeout(2500);
    const ack = page.locator('#bsCfmOk'); if (await ack.isVisible().catch(() => false)) { await ack.click(); await page.waitForTimeout(600); }
    const tmp = page.locator('main').getByRole('button', { name: 'كلمة مؤقتة' });
    assert.equal(await tmp.count(), 1, 'the backup administrator exists');
    await tmp.click(); await page.waitForTimeout(800);
    if (await ack.isVisible().catch(() => false)) { await ack.click(); }
    const dlg = page.locator('[role=dialog][aria-label="كلمة مرور مؤقتة"]');
    await dlg.waitFor({ state: 'visible', timeout: 6000 });
    assert.equal(await page.evaluate(() => location.hash), '#/sysadmin/plat/setup', 'shown on the page where it was asked');
    assert.match(await dlg.innerText(), /كلمة مرور مؤقتة لـ TEST_ONLY احتياطي/);
    assert.match(await dlg.locator('.key').innerText(), /\S{4,}/, 'the new password is shown (not printed here)');
    await dlg.getByRole('button', { name: 'تم' }).click(); await page.waitForTimeout(400);
    assert.equal(await dlg.count(), 0, '«تم» closes it');
    assert.deepEqual(s.errs, [], 'no page errors');
    /* the open console drawer keeps Tab inside it (phone and tablet) */
    for (const vp of [MOBILE, { viewport: { width: 820, height: 1180 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } }]) {
      t = await openAs(b, lab, LAB.superUn, LAB.superPw, vp); t.page.setDefaultTimeout(15000);
      await t.go('#/sysadmin/plat/notif', 3000);
      await t.page.click('.bs-burger'); await t.page.waitForTimeout(700);
      const seen = new Set();
      for (let i = 0; i < 40; i++) {
        await t.page.keyboard.press(i % 7 === 6 ? 'Shift+Tab' : 'Tab');
        const f = await t.page.evaluate(() => { const a = document.activeElement; return { inAside: !!a.closest('aside.bsb'), t: (a.getAttribute('aria-label') || a.textContent || a.title || '').trim().slice(0, 30) }; });
        assert.ok(f.inAside, vp.viewport.width + ': Tab ' + i + ' stays in the open drawer («' + f.t + '»)');
        seen.add(f.t);
      }
      assert.ok(seen.size >= 5, 'the walk wraps through the drawer controls');
      await t.page.keyboard.press('Escape'); await t.page.waitForTimeout(500);
      assert.match(await t.page.evaluate(() => document.querySelector('aside.bsb').className), /\bcx\b/, 'Escape still closes the drawer');
      assert.ok(await t.page.evaluate(() => document.activeElement.classList.contains('bs-burger')), 'and returns the focus to the burger');
      await t.page.keyboard.press('Tab');
      assert.ok(!(await t.page.evaluate(() => !!document.activeElement.closest('aside.bsb'))), 'closed: Tab moves on to the page');
      assert.deepEqual(t.errs, []); await t.ctx.close(); t = null;
    }
  } finally { for (const x of [s, t]) { try { if (x) await x.ctx.close(); } catch (e) { /* closed */ } } await lab.close(); await b.close(); }
});

test('(ACC-FIX) acceptance audit B1–B4: blank platform name, out-of-range policy, the lock entry text, the temporary-password dialog', { timeout: 600000 }, async () => {
  const b = await chromium.launch(); const lab = await world(); const writes = []; let s = null;
  try {
    const DB = lab.env.DB, NOW = Date.now(), plat = () => DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_platform_v1').map((r) => r.v).join('');
    /* B3: a pre-fix entry (detail «attempts», account counter) and a source lock with its count */
    await DB.batch([['u:TEST_ONLY_lk', 'attempts', 1000], ['p:TEST_ONLY_lk|10.0.0.9', '6', 2000]].map(([tg, d, ago]) => DB.prepare('INSERT INTO sec(ts,uid,un,act,target,detail,ip,city,dev) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)').bind(NOW - ago, '', 'TEST_ONLY_lk', 'lock', tg, d, '', '', '')));
    s = await openAs(b, lab, LAB.superUn, LAB.superPw, { viewport: { width: 1366, height: 900 }, onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
    const page = s.page, toast = () => page.evaluate(() => [...document.querySelectorAll('#bs-toast,#bs-stoast,[role=status],[aria-live]')].map((e) => e.textContent.trim()).filter(Boolean).join(' | '));
    /* B1: a blank name is refused before any save; the field is marked; the stored name stays */
    await s.go('#/sysadmin/plat/id', 3500);
    const before = plat(), nm = page.locator('main [data-k="name"]');
    for (const v of ['', '   ']) {
      await nm.fill(v); await nm.dispatchEvent('change'); await page.waitForTimeout(400);
      assert.equal(await nm.getAttribute('aria-invalid'), 'true', JSON.stringify(v) + ': the field is marked invalid');
      const w0 = writes.length; await page.locator('main').getByRole('button', { name: '✓ حفظ ونشر للجميع' }).click(); await page.waitForTimeout(1500);
      assert.deepEqual(writes.slice(w0), [], JSON.stringify(v) + ': nothing is sent');
      assert.match(await toast(), /اسم المنصة مطلوب/, 'the reason is shown'); assert.doesNotMatch(await toast(), /محفوظ ومنشور/);
      assert.equal(plat(), before, 'the stored value is unchanged'); assert.notEqual((await page.title()).trim(), '', 'the tab keeps a title');
    }
    await page.locator('main .con-ph-a button', { hasText: 'تجاهل' }).click(); await page.waitForTimeout(800);
    assert.equal(await nm.getAttribute('aria-invalid'), 'false');
    /* B2: an out-of-range value is refused by name — no question, no request, no «حُفظت»; the stored policy stays */
    await s.go('#/sysadmin/sec', 4500);
    const pol0 = JSON.stringify((await s.api('/api/policy')).j.policy), st = page.locator('main section[aria-label="سياسات الأمن"] [role=status]');
    const inp = page.locator('main input[type=number][aria-label="محاولات قبل القفل"]');
    assert.equal(await inp.getAttribute('min'), '3'); assert.equal(await inp.getAttribute('max'), '20');
    await inp.fill('0'); await inp.dispatchEvent('change'); await page.waitForTimeout(400);
    assert.equal(await inp.getAttribute('aria-invalid'), 'true');
    const w1 = writes.length; await page.locator('main').getByRole('button', { name: 'حفظ السياسات' }).click(); await page.waitForTimeout(1200);
    assert.equal(await page.locator('#bsCfmOk').isVisible().catch(() => false), false, 'no confirmation for an invalid value');
    assert.deepEqual(writes.slice(w1), [], 'nothing is sent');
    const N = (x) => String(x || '').replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    assert.equal(N(await st.innerText()), 'لم تُحفظ — محاولات قبل القفل: أدخل عدداً صحيحاً من 3 إلى 20', 'the field and its range are named');
    assert.equal(JSON.stringify((await s.api('/api/policy')).j.policy), pol0, 'the policy is unchanged');
    /* the server refuses on its own too (a form that skipped the check): 400 with the reason */
    const raw = await s.api('/api/policy', { method: 'POST', body: JSON.stringify({ lockN: 0 }) });
    assert.equal(raw.status, 400); assert.equal(raw.j.err, 'policy-invalid'); assert.equal(raw.j.field, 'lockN');
    await inp.fill('8'); await inp.dispatchEvent('change'); await page.waitForTimeout(300);
    await page.locator('main').getByRole('button', { name: 'حفظ السياسات' }).click();
    await page.waitForSelector('#bsCfmOk', { state: 'visible', timeout: 8000 }); await page.locator('#bsCfmOk').click();
    await page.waitForFunction(() => /حُفظت/.test((document.querySelector('main section[aria-label="سياسات الأمن"] [role=status]') || {}).textContent || ''), null, { timeout: 4000 });
    assert.equal((await s.api('/api/policy')).j.policy.lockN, 8, 'a valid value is saved');
    /* B3: the lock entries read as Arabic sentences with a count or none */
    const log = await page.evaluate(() => [...document.querySelectorAll('main .adm-tr.g-sec')].map((r) => r.textContent.replace(/\s+/g, ' ')).filter((t) => /TEST_ONLY_lk/.test(t)).join(' || '));
    assert.doesNotMatch(log, /attempts/); assert.match(log, /تنبيه: محاولات فاشلة متتالية باسم TEST_ONLY_lk — لا يُقفل الحساب نفسه/); assert.match(log, /قُفل الدخول مؤقتاً بعد/);
    /* B4: «إعادة تعيين كلمة المرور» → the temporary password stays after a click outside and Escape; «تم» closes it */
    await s.go('#/sysadmin/users', 4000);
    const row = page.locator('main .adm-tr:not(.adm-th)', { hasText: 'مدير ب' });
    await row.getByRole('button', { name: /⋯|الإجراءات/ }).first().click(); await page.waitForTimeout(500);
    await page.locator('[role=menu] >> text=إعادة تعيين كلمة المرور').click();
    await page.waitForSelector('#bsCfmOk', { state: 'visible', timeout: 8000 }); await page.locator('#bsCfmOk').click();
    const dlg = page.locator('[role=dialog][aria-label="كلمة مرور مؤقتة"]'); await dlg.waitFor({ state: 'visible', timeout: 6000 });
    const pw = await dlg.locator('.key').innerText();
    await page.mouse.click(8, 450); await page.waitForTimeout(400);
    assert.equal(await dlg.count(), 1, 'a click outside keeps it'); assert.match(await dlg.locator('[role=alert]').innerText(), /لا تظهر مرة أخرى/);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    assert.equal(await dlg.count(), 1, 'Escape keeps it'); assert.equal(await dlg.locator('.key').innerText(), pw, 'the same password is still shown');
    await dlg.getByRole('button', { name: 'تم' }).click(); await page.waitForTimeout(400);
    assert.equal(await dlg.count(), 0, '«تم» closes it');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); await b.close(); }
});

test('(V7-P0) node addresses: #/sysadmin/org/<id> opens that node or unit, survives a reload, follows a click; unknown or unsafe ids fall back; only the platform administrator', { timeout: 600000 }, async () => {
  const b = await chromium.launch(); const lab = await world(); const writes = []; let s = null, m = null;
  try {
    s = await openAs(b, lab, LAB.superUn, LAB.superPw, { viewport: { width: 1366, height: 900 }, onPage: (p) => watchWrites(p, writes) }); s.page.setDefaultTimeout(15000);
    const page = s.page, H = () => page.evaluate(() => location.hash), SEL = () => page.evaluate(() => (document.getElementById('bsSelName') || {}).value ?? null);
    const cold = async (h) => { await page.goto('about:blank'); await page.goto(lab.base + '/' + h, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000); };
    /* a data unit and a node, cold */
    await cold('#/sysadmin/org/TEST_ONLY_A');
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_A', 'the unit address stays'); assert.equal(await SEL(), 'TEST_ONLY إدارة أ', 'unit A is selected');
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_A'); assert.equal(await SEL(), 'TEST_ONLY إدارة أ', 'still selected after a reload');
    await cold('#/sysadmin/org/TEST_ONLY_G');
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_G'); assert.equal(await SEL(), 'TEST_ONLY إدارة عامة', 'the node is selected');
    /* a click in the tree writes the address of what it selects */
    await page.locator('main a:has-text("فرد الكل")').click(); await page.waitForTimeout(500);
    await page.locator('main .tr-rw', { hasText: 'TEST_ONLY إدارة ب' }).first().click(); await page.waitForTimeout(1500);
    assert.equal(await H(), '#/sysadmin/org/TEST_ONLY_B', 'clicking unit B writes its address'); assert.equal(await SEL(), 'TEST_ONLY إدارة ب');
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
    assert.equal(await SEL(), 'TEST_ONLY إدارة ب', 'the clicked selection survives a reload');
    /* a typed address while on the page */
    await page.evaluate(() => { location.hash = '#/sysadmin/org/TEST_ONLY_A_S1'; }); await page.waitForTimeout(2500);
    assert.equal(await SEL(), 'TEST_ONLY قسم أ١', 'a typed section address selects the section');
    /* unknown and unsafe ids fall back to the structure, said once, no error */
    for (const h of ['#/sysadmin/org/TEST_ONLY_NOPE', '#/sysadmin/org/%3Cimg%20src%3Dx%3E', '#/sysadmin/org/a/b']) {
      await cold(h);
      assert.equal(await H(), '#/sysadmin/org', h + ': falls back to #/sysadmin/org');
    }
    await cold('#/sysadmin/org/TEST_ONLY_NOPE');
    assert.match(await page.evaluate(() => [...document.querySelectorAll('#bs-toast,#bs-stoast,[role=status]')].map((e) => e.textContent).join(' ')), /غير موجودة في الهيكل/, 'the unknown node is named as missing');
    assert.deepEqual(s.errs, [], 'no page errors'); assert.deepEqual(writes, [], 'opening addresses saves nothing');
    /* a unit manager cannot reach it by address */
    m = await openAs(b, lab, LAB.mgrA, LAB.pw, { viewport: { width: 1366, height: 900 } });
    for (const h of ['#/sysadmin/org/TEST_ONLY_A', '#/sysadmin/org/TEST_ONLY_G', '#/sysadmin/depts']) {
      await m.page.goto(lab.base + '/' + h, { waitUntil: 'domcontentloaded' }); await m.page.waitForTimeout(3500);
      const r = await m.page.evaluate(() => ({ h: location.hash, con: !!document.querySelector('aside.bsb--console') }));
      assert.ok(!/^#\/sysadmin/.test(r.h) && !r.con, 'manager: ' + h + ' refused (now ' + r.h + ')');
    }
  } finally { for (const x of [s, m]) { try { if (x) await x.ctx.close(); } catch (e) { /* closed */ } } await lab.close(); await b.close(); }
});
