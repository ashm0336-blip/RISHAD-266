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
        /* keyboard only: the collapse control, then the 17 items in their visual order, then the exit and the user card */
        await page.focus('aside.bsb .s-tog2');
        const order = [];
        for (let i = 0; i < 19; i++) {
          await page.keyboard.press('Tab');
          order.push(await page.evaluate(() => { const a = document.activeElement, cs = getComputedStyle(a);
            return { t: a.classList.contains('s-exit') ? 'exit' : a.classList.contains('s-user') ? 'user' : (a.getAttribute('data-con-tab') ? (a.querySelector('.nlbl') || a).textContent.trim() : a.className),
              ring: cs.outlineStyle === 'solid' && parseFloat(cs.outlineWidth) >= 2 ? window.__cr(a, 'outlineColor') : 0 }; }));
        }
        assert.deepEqual(order.map((o) => o.t), [...DEST.map((d) => d[2]), 'exit', 'user'], 'Tab order = the sidebar order: items, the exit, the user card');
        for (const o of order) assert.ok(o.ring >= 3, 'light: the focus ring on «' + o.t + '» is ' + o.ring + ':1 (≥3)');
        /* Enter on an item opens it and puts the focus on the page title; Shift+Tab goes back into the sidebar */
        await page.focus(sel(['users', null])); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
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
    await s.go('#/sysadmin/overview', 3500);
    const fit = await page.evaluate(() => {
      const n = document.querySelector('aside.bsb .s-nav'), it = [...document.querySelectorAll('aside.bsb [data-con-tab]')], nb = n.getBoundingClientRect(), last = it[it.length - 1].getBoundingClientRect();
      return { n: it.length, lastBot: Math.round(last.bottom), navBot: Math.round(nb.bottom), sh: n.scrollHeight, ch: n.clientHeight, shadow: getComputedStyle(document.querySelector('aside.bsb')).boxShadow };
    });
    assert.equal(fit.n, 17);
    assert.ok(fit.lastBot <= fit.navBot, '1366×900: the last console item (bottom ' + fit.lastBot + ') is inside the sidebar (bottom ' + fit.navBot + ')');
    assert.ok(fit.sh <= fit.ch + 1, '1366×900: the console navigation does not scroll (' + fit.sh + ' / ' + fit.ch + ')');
    assert.match(fit.shadow, /2px 0px 0px 0px inset|inset 2px 0px 0px/, 'gold edge on the page-facing edge (' + fit.shadow + ')');
    assert.doesNotMatch(fit.shadow, /-2px 0px 0px/, 'not on the outer screen edge');
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
      assert.equal(st1.hash, '#/sysadmin/depts', who + ': «تعديل الصلاحيات» opens «الإدارات»');
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
