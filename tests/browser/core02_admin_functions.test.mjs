/* RISHAD CORE-02 · step 0 — function-presence regression guard for the admin center (lab: TEST_ONLY data, no network).
   The fixture tests/browser/fixtures/core02_admin_before.json was captured in this lab on develop@625dac6 BEFORE CORE-02:
   for the platform administrator, every #/sysadmin/<tab> (and every sub-tab / row menu the tab offers), and for a department
   manager every #/admin/<tab>: the visible headings, the action labels, and the form fields and toggles (normalised text).
   This test asserts, on the current code:
     (1) every recorded heading / action / field is still reachable from the same route (a documented rename only through RENAMES);
     (2) each deep link #/sysadmin/<tab> (fresh load) opens that same tab, and the hash stays on it; since CORE-02 step 1 the tab
         shows as its group (and, in a group of several, its second-level tab) selected, and every tab is reachable in-app by group → tab;
     (3) a department manager (and a unit account) never reaches #/sysadmin content;
     (4) opening the tabs saves nothing (only POST /api/login, an empty /api/save flush and the notifications security-poll);
     (5) zero page errors.
   Capture mode (writes the fixture and the BEFORE screenshots; not part of the normal run):
     KIVO_CORE02_CAPTURE=<screenshot dir> node --test tests/browser/core02_admin_functions.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const FIX = new URL('./fixtures/core02_admin_before.json', import.meta.url);
const CAPTURE = process.env.KIVO_CORE02_CAPTURE || '';
const SYS_TABS = ['overview', 'sec', 'users', 'perms', 'plat', 'depts', 'oplog', 'backup', 'histimp'];
const DEPT_TABS = ['backup', 'oplog', 'shifts', 'ptpls', 'import'];
/* The ONLY place a recorded label may change: old normalised text → new normalised text (CORE-02 display names).
   A rename applies to whole items and to the words inside an item. Add an entry only for an approved rename, never to hide a loss. */
const RENAMES = {
  'مدير النظام': 'مسؤول المنصة',
};
/* CORE-02 step 2: old display names of the top role / the admin interface that must no longer be shown on any admin tab */
const OLD_NAMES = ['مدير النظام', 'المشرف العام', 'مشرف المنصة', 'مدير المنصة'];
/* CORE-02 step 1: the nine tabs sit in five groups (two-level navigation inside .adm-tabbar). Each recorded tab must show its group
   selected, and, where the group holds more than one tab, the tab itself selected on the second level (the recorded tab label).
   A single-tab group (الرئيسية = نظرة عامة · إعدادات المنصة = المنصة) is selected by its group alone. */
const NAV = {
  overview: ['الرئيسية'], depts: ['الإدارة المؤسسية', 'الإدارات'], users: ['الإدارة المؤسسية', 'مراقبة الحسابات'], perms: ['الإدارة المؤسسية', 'خريطة الصلاحيات'],
  plat: ['إعدادات المنصة'], sec: ['الأمن والرقابة', 'الأمن'], oplog: ['الأمن والرقابة', 'سجل الأنشطة والتغييرات'],
  backup: ['البيانات والاستمرارية', 'النسخة الاحتياطية'], histimp: ['البيانات والاستمرارية', 'استيراد البيانات التاريخية'],
};
/* the selected nav labels without a count badge («الأمن #») */
const selNow = (r) => r.selected.map((x) => x.replace(/ #$/, ''));
const opened = (t, r) => NAV[t].every((v) => selNow(r).includes(v));
const MOBILE = { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } };
const DESKTOP = { viewport: { width: 1366, height: 900 }, context: { deviceScaleFactor: 1 } };

/* one normaliser, used both in capture and in the check (runs in the page) */
function collect() {
  const root = document.querySelector('main.bs-main') || document.body;
  const norm = (x) => String(x || '').replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/[0-9٠-٩۰-۹]+/g, '#').replace(/\s+/g, ' ').trim();
  const keep = (t) => t && t.length <= 80 && /[A-Za-z؀-ۿ]/.test(t) && !/TEST_ONLY|Test Administrator/.test(t);
  const vis = (e) => { if (!e.getClientRects().length) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const nav = (e) => !!e.closest('.adm-tabbar');
  const own = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
  const out = { headings: new Set(), actions: new Set(), fields: new Set(), selected: [], nav: [] };
  const SEM = 'button,a[href],[role=button],[role=tab],[role=menuitem],[role=switch],[role=option],[onclick],summary';
  /* a semantic control, or the outermost element that shows a pointer (a clickable div); cursor is inherited, so its children are not counted again */
  const isAct = (e) => e.matches(SEM) || (getComputedStyle(e).cursor === 'pointer' && !(e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer') && !e.closest(SEM));
  for (const e of root.querySelectorAll('*')) {
    if (!vis(e) || e.closest('.bs-sr-only')) continue;
    if (e.matches('input,select,textarea')) {
      if (e.type === 'hidden') continue;
      const lab = e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].textContent) || e.placeholder || e.title || '';
      const kind = e.matches('select') ? 'select' : e.matches('textarea') ? 'textarea' : (e.type === 'checkbox' || e.type === 'radio') ? 'toggle' : 'input';
      const t = norm(lab); if (keep(t)) out.fields.add(kind + ':' + t);
      continue;
    }
    if (isAct(e)) {
      const t = norm(e.getAttribute('aria-label') || e.textContent) || norm(e.title);
      if (nav(e)) { if (e.matches('[role=tab]')) { out.nav.push(t); if (e.getAttribute('aria-selected') === 'true') out.selected.push(t); } continue; }
      if (e.matches('[role=tab]') && e.getAttribute('aria-selected') === 'true') out.selected.push(t);
      if (e.matches('[role=switch]') || e.getAttribute('aria-pressed') != null) { if (keep(t)) out.fields.add('toggle:' + t); continue; }
      if (!t) {   /* an unlabeled control (a switch drawn as an empty span): named by the title of the row it sits in */
        let a = e.parentElement, name = '';
        for (let i = 0; a && i < 4 && !name; i++, a = a.parentElement) { const h = a.querySelector('b,strong,h1,h2,h3,h4,h5,h6,label'); name = h ? norm(h.textContent) : ''; }
        if (keep(name)) out.fields.add('control:' + name);
        continue;
      }
      if (keep(t)) out.actions.add(t);
      const ti = norm(e.title); if (ti && ti !== t && keep(ti)) out.actions.add(ti);
      continue;
    }
    if (e.closest('button,a[href],[role=button],[role=tab],[role=menuitem]') || nav(e)) continue;
    const cs = getComputedStyle(e), w = parseInt(cs.fontWeight, 10) || 400, fs = parseFloat(cs.fontSize) || 0;
    const head = e.matches('h1,h2,h3,h4,h5,h6,[role=heading],legend') || (w >= 700 && fs >= 13);
    if (!head) continue;
    const t = norm(e.matches('h1,h2,h3,h4,h5,h6,[role=heading],legend') ? e.textContent : own(e));
    if (keep(t) && t.length >= 3) out.headings.add(t);
  }
  /* section labels given as aria-label on a region */
  for (const e of root.querySelectorAll('section[aria-label],[role=region][aria-label],[role=dialog][aria-label],[role=tablist][aria-label]')) if (vis(e) && !e.closest('.adm-tabbar')) { const t = norm(e.getAttribute('aria-label')); if (keep(t)) out.headings.add(t); }
  return { headings: [...out.headings], actions: [...out.actions], fields: [...out.fields], selected: out.selected, nav: out.nav, text: norm(root.innerText) };
}

/* Probes: the in-tab navigation a user takes to reach the rest of a tab (sub-tabs, a row's action menu, a details panel).
   Each only opens/switches views — none of them saves. */
async function probes(page, scope, tab) {
  const states = [];
  const snap = async (name) => { const r = await page.evaluate(collect); states.push({ name, ...r }); };
  await snap('base');
  if (scope === 'sys' && tab === 'plat') {
    const subs = await page.evaluate(() => [...document.querySelectorAll('main.bs-main [role=tablist] [role=tab]')].filter((e) => !e.closest('.adm-tabbar') && e.getClientRects().length).map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
    for (const s of subs) {
      await page.locator('main.bs-main [role=tablist]:not(.adm-tabs) [role=tab]', { hasText: s }).first().click({ timeout: 10000 });
      await page.waitForTimeout(900); await snap('sub:' + s);
    }
  }
  if (scope === 'sys' && tab === 'users') {
    const m = page.locator('main.bs-main button[title="أفعال هذا الحساب"]').first();
    if (await m.count()) { await m.click({ timeout: 10000 }); await page.waitForTimeout(500); await snap('row-menu'); await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  }
  if (scope === 'sys' && tab === 'depts') {
    for (const label of ['سقف الصفحات', 'حسابات الإدارة']) {
      const b = page.locator('main.bs-main button', { hasText: label }).first();
      if (await b.count()) { await b.click({ timeout: 10000 }); await page.waitForTimeout(700); await snap('panel:' + label); }
    }
    const d = page.locator('main.bs-main [aria-label^="بيانات الإدارة"]').first();
    if (await d.count()) { await d.click({ timeout: 10000 }); await page.waitForTimeout(500); await snap('data-menu'); await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  }
  return states;
}
const union = (states) => {
  const u = { headings: new Set(), actions: new Set(), fields: new Set(), text: '' };
  for (const s of states) { s.headings.forEach((x) => u.headings.add(x)); s.actions.forEach((x) => u.actions.add(x)); s.fields.forEach((x) => u.fields.add(x)); u.text += ' ' + s.text; }
  return u;
};
const rename = (t) => { if (RENAMES[t]) return RENAMES[t]; let o = t; for (const [a, b] of Object.entries(RENAMES)) o = o.split(a).join(b); return o; };
const variants = (t) => [...new Set([t, rename(t)])];

/* writes while only opening tabs: sign-in, an empty save flush and the notifications security-poll are the only allowed ones */
function watchWrites(page, out) {
  page.on('request', (r) => {
    if (['GET', 'HEAD'].includes(r.method())) return;
    const p = new URL(r.url()).pathname; let j = null; try { j = JSON.parse(r.postData() || 'null'); } catch (e) { j = { unparsable: 1 }; }
    if (p === '/api/login') return;
    if (p === '/api/save' && j && !Object.keys(j.set || {}).length && !(j.del || []).length) return;
    if (p === '/api/notifications/act' && j && j.op === 'security-poll') return;
    if (p === '/api/notifications/act' && j && j.op === 'targets') return;   /* the recipient-count preview of «التنبيهات والتعاميم»: a read over POST (019-notifications: op targets returns counts, writes nothing) */
    out.push(r.method() + ' ' + p + ' ' + JSON.stringify(j).slice(0, 160));
  });
}
/* the lab world as on Test: the permission lens upgrade mark is already set (that read-time upgrade is not an admin-center write) */
async function world() {
  const lab = await startLab(); const { env, W } = lab, DB = env.DB;
  const pm = JSON.parse(DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_perms_v1').map((r) => r.v).join(''));
  pm.lensZ = 1;
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind('bassam_perms_v1'), ...W.kvPutStmts(env, 'kv', 'bassam_perms_v1', JSON.stringify(pm)), DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind('bassam_perms_v1')]);
  /* every stored record's revision, except the notifications domain: the allowed security-poll turns new security events into notifications (019 nfSecurityPoll) */
  lab.revs = () => JSON.stringify(DB.q("SELECT k,rev FROM revs WHERE k<>'bassam_notifications_domain_v1' ORDER BY k"));
  return lab;
}
const GRP = { overview: 'home', depts: 'org', users: 'org', perms: 'org', plat: 'plat', sec: 'sec', oplog: 'sec', backup: 'data', histimp: 'data' };
async function nav2(page, vn) {
  const hash = () => page.evaluate(() => location.hash);
  await page.evaluate(() => { location.hash = '#/sysadmin/overview'; }); await page.waitForTimeout(2500);
  for (const t of SYS_TABS) {
    await page.locator('.adm-tabbar [data-adm-grp="' + GRP[t] + '"]').click(); await page.waitForTimeout(700);
    if (NAV[t].length > 1) { await page.locator('.adm-tabbar .adm-l2 [role=tab][data-adm-tab="' + t + '"]').click(); await page.waitForTimeout(900); }
    assert.equal(await hash(), '#/sysadmin/' + t, vn + ': group «' + NAV[t][0] + '» then its tab writes #/sysadmin/' + t);
    const r = await page.evaluate(collect); assert.ok(opened(t, r), vn + ': ' + t + ' selected as ' + JSON.stringify(NAV[t]) + ' (now ' + JSON.stringify(r.selected) + ')');
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(ov <= 1, vn + ': ' + t + ': no horizontal page scroll (' + ov + 'px)');
    const two = await page.locator('.adm-tabbar .adm-l2').count();
    assert.equal(two > 0, NAV[t].length > 1 || GRP[t] === 'data', vn + ': ' + t + ': the second level shows only for a group of more than one entry');
  }
  /* a group remembers its last tab: org → perms, away, back to org → perms */
  await page.locator('.adm-tabbar [data-adm-grp="org"]').click(); await page.waitForTimeout(700);
  await page.locator('.adm-tabbar .adm-l2 [role=tab][data-adm-tab="perms"]').click(); await page.waitForTimeout(900);
  await page.locator('.adm-tabbar [data-adm-grp="home"]').click(); await page.waitForTimeout(700);
  await page.locator('.adm-tabbar [data-adm-grp="org"]').click(); await page.waitForTimeout(900);
  assert.equal(await hash(), '#/sysadmin/perms', vn + ': a group reopens on the tab last used in it');
  await page.locator('.adm-tabbar [data-adm-grp="data"]').click(); await page.waitForTimeout(700);
  await page.locator('.adm-tabbar .adm-l2-lnk').click(); await page.waitForTimeout(1200);
  assert.equal(await hash(), '#/sysadmin/plat', vn + ': «التهيئة والاستعادة» opens the platform settings tab');
  const sel = await page.evaluate(() => [...document.querySelectorAll('main.bs-main [role=tablist]:not(.adm-tabs) [role=tab][aria-selected=true]')].filter((e) => !e.closest('.adm-tabbar')).map((e) => e.textContent.trim()));
  assert.deepEqual(sel, ['التهيئة والاستعادة'], vn + ': … on its own «التهيئة والاستعادة» section');
  /* a deep link to a tab at the far end of the strips: its group and tab are scrolled into view (not clipped) */
  await page.goto(new URL(page.url()).origin + '/#/sysadmin/histimp', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4500);
  const clip = await page.evaluate(() => [...document.querySelectorAll('.adm-tabbar [role=tab][aria-selected=true]')].map((e) => { const a = e.getBoundingClientRect(), b = e.parentElement.getBoundingClientRect(); return [e.textContent.trim(), a.left >= b.left - 1 && a.right <= b.right + 1]; }));
  assert.deepEqual(clip, [['البيانات والاستمرارية', true], ['استيراد البيانات التاريخية', true]], vn + ': the selected group and tab are fully in view after a deep link');
}
const sess = async (b, lab, who, view, writes) => openAs(b, lab, ...(who === 'super' ? [LAB.superUn, LAB.superPw] : [LAB[who], LAB.pw]), { ...view, onPage: (p) => watchWrites(p, writes) });
const shot = async (page, dir, name) => { fs.mkdirSync(dir, { recursive: true }); await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: true }); };
const theme = async (page, t) => { await page.evaluate((x) => KIVO.__bsThemeSet(x), t); await page.waitForTimeout(350); };

if (CAPTURE) {
  test('CAPTURE: fixture and BEFORE screenshots', { timeout: 1800000 }, async () => {
    const b = await chromium.launch(); const fx = { _note: 'RISHAD CORE-02 step 0: function inventory captured in the lab on develop@625dac6 BEFORE CORE-02 (synthetic TEST_ONLY data). Normalised text: digits → #, bidi marks removed, data rows (TEST_ONLY / account names) dropped. Checked by core02_admin_functions.test.mjs.', sys: {}, dept: {}, nav: {} };
    try {
      for (const [scope, who, base, tabs] of [['sys', 'super', '#/sysadmin/', SYS_TABS], ['dept', 'mgrA', '#/admin/', DEPT_TABS]]) {
        const lab = await world(); const writes = []; let s = null;
        try {
          s = await sess(b, lab, who, DESKTOP, writes); s.page.setDefaultTimeout(15000);
          for (const t of tabs) {
            await s.go(base + t, 4000);
            const states = await probes(s.page, scope, t);
            if (!states[0].selected.length && scope === 'dept') continue;   /* tab not offered to this account */
            const u = union(states);
            fx[scope][t] = { selected: states[0].selected[0] || '', hash: await s.page.evaluate(() => location.hash), probes: states.map((x) => x.name), headings: [...u.headings].sort(), actions: [...u.actions].sort(), fields: [...u.fields].sort() };
            fx.nav[scope] = states[0].nav;
          }
          assert.deepEqual(s.errs, []); assert.deepEqual(writes, []);
        } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); }
      }
      fs.writeFileSync(FIX, JSON.stringify(fx, null, 1) + '\n');
      /* screenshots: desktop and mobile, light and dark */
      for (const [vn, view] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
        for (const [scope, who, base] of [['sys', 'super', '#/sysadmin/'], ['dept', 'mgrA', '#/admin/']]) {
          const lab = await world(); const writes = []; let s = null;
          try {
            s = await sess(b, lab, who, view, writes); s.page.setDefaultTimeout(15000);
            for (const th of ['light', 'dark']) {
              await theme(s.page, th);
              for (const t of Object.keys(fx[scope])) {
                await s.go(base + t, 3500);
                await shot(s.page, CAPTURE, `${scope}-${t}-${vn}-${th}`);
                if (scope === 'sys' && t === 'plat') {
                  for (const sub of fx.sys.plat.probes.filter((x) => x.startsWith('sub:')).map((x) => x.slice(4))) {
                    await s.page.locator('main.bs-main [role=tablist]:not(.adm-tabs) [role=tab]', { hasText: sub }).first().click({ timeout: 10000 }).catch(() => {});
                    await s.page.waitForTimeout(800); await shot(s.page, CAPTURE, `sys-plat-${sub.replace(/[\s/«»]+/g, '_')}-${vn}-${th}`);
                  }
                }
              }
            }
          } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); }
        }
      }
    } finally { await b.close(); }
  });
} else {
  const FX = JSON.parse(fs.readFileSync(FIX, 'utf8'));
  const missing = (rec, now, kind) => rec.filter((x) => !variants(x).some((v) => kind === 'headings' ? (now.headings.has(v) || now.text.includes(v.replace(/^[a-z]+:/, ''))) : now[kind].has(v)));

  test('platform administrator: every recorded heading, action and field of every #/sysadmin tab is still reachable; deep links; no save; no errors', { timeout: 900000 }, async () => {
    const b = await chromium.launch(); const lab = await world(); const writes = []; let s = null;
    try {
      s = await sess(b, lab, 'super', DESKTOP, writes); s.page.setDefaultTimeout(15000);
      const rev0 = lab.revs();
      assert.deepEqual(Object.keys(FX.sys), SYS_TABS, 'the fixture covers all nine admin tabs');
      assert.deepEqual(Object.keys(NAV).sort(), [...SYS_TABS].sort(), 'every admin tab has its place in the two-level navigation');
      for (const t of SYS_TABS) {
        await s.go('#/sysadmin/' + t, 4000);
        const states = await probes(s.page, 'sys', t), now = union(states), rec = FX.sys[t];
        assert.ok(opened(t, states[0]), t + ': the tab opened (recorded «' + rec.selected + '») shows ' + JSON.stringify(NAV[t]) + ' selected (now ' + JSON.stringify(states[0].selected) + ')');
        for (const kind of ['headings', 'actions', 'fields']) assert.deepEqual(missing(rec[kind], now, kind), [], t + ': every recorded ' + kind + ' still reachable');
        /* CORE-02 step 2: the display names — no old name for the top role or the admin interface is shown anywhere on the page */
        const txt = await s.page.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('[title],[aria-label],[placeholder]')]
          .map((e) => [e.getAttribute('title'), e.getAttribute('aria-label'), e.getAttribute('placeholder')].join(' ')).join(' '));
        assert.deepEqual(OLD_NAMES.filter((o) => txt.includes(o)), [], t + ': no old display name is shown');
      }
      /* CORE-02 step 2: the page is titled «المنصة / مركز إدارة رشاد», the sidebar link reads «مركز إدارة رشاد», the user card reads «مسؤول المنصة» */
      assert.equal((await s.page.textContent('.bs-crumb')).replace(/\s+/g, ' ').trim(), 'المنصة / مركز إدارة رشاد', 'crumb names the admin interface');
      assert.ok((await s.page.$$eval('.nlbl', (els) => els.map((e) => e.textContent.trim()))).includes('مركز إدارة رشاد'), 'sidebar link «مركز إدارة رشاد»');
      assert.ok((await s.page.evaluate(() => document.body.innerText)).includes('مسؤول المنصة'), 'the top role is shown as «مسؤول المنصة»');
      /* deep links: a fresh load of #/sysadmin/<tab> opens that tab and keeps the address */
      for (const t of SYS_TABS) {
        await s.page.goto(lab.base + '/#/sysadmin/' + t, { waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(4500);
        const r = await s.page.evaluate(collect), h = await s.page.evaluate(() => location.hash);
        assert.equal(h, '#/sysadmin/' + t, t + ': the deep link stays on its address');
        assert.ok(opened(t, r), t + ': the deep link opens ' + JSON.stringify(NAV[t]) + ' (recorded «' + FX.sys[t].selected + '»; now ' + JSON.stringify(r.selected) + ')');
      }
      /* CORE-02 step 1: in-app two-level navigation — a group then its tab reaches every tab and writes its address; the data group links to
         «التهيئة والاستعادة» inside the platform settings (the existing section, not a copy); on a phone both levels fit without a page scroll */
      await nav2(s.page, 'desktop');
      const m = await sess(b, lab, 'super', MOBILE, writes); m.page.setDefaultTimeout(15000);
      try {
        await nav2(m.page, 'mobile');
        assert.deepEqual(m.errs, [], 'mobile: no page errors');
      } finally { try { await m.ctx.close(); } catch (e) { /* closed */ } }
      assert.deepEqual(writes, [], 'opening the admin tabs saves nothing');
      await lab.idle(); assert.equal(lab.revs(), rev0, 'no stored record changed on the server');
      assert.deepEqual(s.errs, [], 'no page errors');
    } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); await b.close(); }
  });

  test('department manager: #/admin keeps its tabs and functions; #/sysadmin content is never reachable; no save; no errors', { timeout: 600000 }, async () => {
    const b = await chromium.launch();
    const sysOnly = ['سياسات الأمن', 'الجلسات النشطة', 'النسخة الشاملة — كل الإدارات', 'يحتاج قرارك'];
    try {
      {
        const lab = await world(); const writes = []; let s = null;
        try {
          s = await sess(b, lab, 'mgrA', DESKTOP, writes); s.page.setDefaultTimeout(15000);
          const rev0 = lab.revs();
          for (const t of Object.keys(FX.dept)) {
            await s.go('#/admin/' + t, 4000);
            const states = await probes(s.page, 'dept', t), now = union(states), rec = FX.dept[t];
            assert.ok(variants(rec.selected).some((v) => states[0].selected.includes(v)), 'admin/' + t + ': opens «' + rec.selected + '» (now ' + JSON.stringify(states[0].selected) + ')');
            for (const kind of ['headings', 'actions', 'fields']) assert.deepEqual(missing(rec[kind], now, kind), [], 'admin/' + t + ': every recorded ' + kind + ' still reachable');
          }
          for (const t of SYS_TABS) {
            await s.go('#/sysadmin/' + t, 2500);
            const r = await s.page.evaluate(() => ({ h: location.hash, t: document.body.innerText }));
            assert.doesNotMatch(r.h, /^#\/sysadmin/, 'manager: #/sysadmin/' + t + ' is refused (address falls back)');
            for (const x of sysOnly) assert.ok(!r.t.includes(x), 'manager: no «' + x + '» via #/sysadmin/' + t);
          }
          await s.page.goto(lab.base + '/#/sysadmin/sec', { waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(4500);
          assert.doesNotMatch(await s.page.evaluate(() => location.hash), /^#\/sysadmin/, 'manager: a fresh deep link to #/sysadmin is refused');
          assert.ok(!(await s.page.evaluate(() => document.body.innerText)).includes('سياسات الأمن'), 'manager: no admin-center content on a fresh deep link');
          assert.deepEqual(writes, [], 'manager: opening the settings tabs saves nothing');
          await lab.idle(); assert.equal(lab.revs(), rev0, 'manager: no stored record changed on the server');
          assert.deepEqual(s.errs, [], 'manager: no page errors');
        } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); }
      }
      for (const who of ['dmA', 'empA']) {
        const lab = await world(); const writes = []; let s = null;
        try {
          s = await sess(b, lab, who, DESKTOP, writes); s.page.setDefaultTimeout(15000);
          await s.page.goto(lab.base + '/#/sysadmin/overview', { waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(4500);
          const r = await s.page.evaluate(() => ({ h: location.hash, t: document.body.innerText }));
          assert.doesNotMatch(r.h, /^#\/sysadmin/, who + ': #/sysadmin refused');
          for (const x of sysOnly) assert.ok(!r.t.includes(x), who + ': no «' + x + '»');
          assert.deepEqual(writes, [], who + ': no save'); assert.deepEqual(s.errs, [], who + ': no page errors');
        } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); }
      }
    } finally { await b.close(); }
  });
}
