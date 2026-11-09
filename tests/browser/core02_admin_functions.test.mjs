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
     (5) zero page errors;
     (6) since CORE-02 step 6, on a phone (390×844, touch) in light and dark and on the desktop in dark, every tab and every probed view
         (sub-tabs, row menu, panels): nothing scrolls the page sideways, no content is cut off at the screen edge outside its own scroll
         area, no readable text falls under 3:1 contrast against its background, every recorded function is still reachable, and no
         page error, no save.
   CORE-02 S7 (intended navigation change): the five groups and their pages left the in-page strip for the sidebar of the console
   («مركز إدارة رشاد» as its own space). The selected place is read from the sidebar (aria-current="page" and its group heading), the
   platform sections are reached as sidebar items (#/sysadmin/plat/<sub>), and a recorded in-page link that is now a sidebar item is
   checked there (MOVED → 'aside'). The fixture is not edited.
   Capture mode (writes the fixture and the BEFORE screenshots; not part of the normal run):
     KIVO_CORE02_CAPTURE=<screenshot dir> node --test tests/browser/core02_admin_functions.test.mjs
   Screenshots only (the same screens, the fixture is read and never rewritten — the AFTER set):
     KIVO_CORE02_CAPTURE=<screenshot dir> KIVO_CORE02_SHOTS_ONLY=1 node --test tests/browser/core02_admin_functions.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const FIX = new URL('./fixtures/core02_admin_before.json', import.meta.url);
const CAPTURE = process.env.KIVO_CORE02_CAPTURE || '';
const SHOTS_ONLY = !!process.env.KIVO_CORE02_SHOTS_ONLY;
const SYS_TABS = ['overview', 'sec', 'users', 'perms', 'plat', 'depts', 'oplog', 'backup', 'histimp'];
const DEPT_TABS = ['backup', 'oplog', 'shifts', 'ptpls', 'import'];
/* The ONLY place a recorded label may change: old normalised text → new normalised text (CORE-02 display names).
   A rename applies to whole items and to the words inside an item. Add an entry only for an approved rename, never to hide a loss. */
const RENAMES = {
  'مدير النظام': 'مسؤول المنصة',
};
/* CORE-02 step 5: the overview's quick-links strip repeated the tab bar and was removed. Each of its six links must still be reachable
   at its destination: the platform sub-tab (a recorded action of #/sysadmin/plat) or the admin tab itself (its place in NAV, whose
   group → tab reachability is asserted below). The ONLY place a recorded item may leave its route; never add an entry to hide a loss. */
const MOVED = {
  overview: { 'هوية المنصة': 'plat', 'الوحدات': 'plat', 'التنبيهات والتعاميم': 'plat', 'الإدارات': 'depts', 'سجل الأنشطة والتغييرات': 'oplog', 'النسخة الاحتياطية': 'backup',
    /* CORE-02 S8: the six KPI tiles became four status cards on the same page ('=' + the action that now does the same thing there):
       the accounts tile (→ مراقبة الحسابات) is the «الحسابات» card's link; the online / failed-sign-in / denied-write tiles are rows of their
       cards with the same action (scroll to the live sessions · the security log filtered to today's sign-ins / denied writes); the backup tile
       is the «آخر نسخة شاملة» row of «حالة المنصة» (→ النسخة الاحتياطية); the connection tile is that card's «الاتصال» row (a heading, still
       recorded as «● متصل»); the «اليوم» footnote is the «الأمن اليوم» card's subtitle */
    '# / # / #الحسابات: نشط / مجمّد / بلا حساب# موظفين في كل الإدارات': '=إلى مراقبة الحسابات',
    'حسابات الدخول عبر كل الإدارات — افتح مراقبة الحسابات': '=إلى مراقبة الحسابات',
    '#متصلون الآن# خامل': '=متصلون الآن#',
    '#محاولات دخول فاشلة اليوملا أقفال نشطة': '=محاولات دخول فاشلة#',
    '#كتابات مرفوضة اليوممحاولات تعديل خارج الصلاحية': '=كتابات مرفوضة#',
    'رُفضت وأُعيدت القيم كما هي': '=رُفضت وأُعيدت القيم كما هي — محاولات تعديل خارج الصلاحية',
    '—آخر نسخة احتياطية شاملةلم تُؤخذ نسخة بعد': '=آخر نسخة شاملةلم تُؤخذ بعد' },
  /* CORE-02 S7: the nine platform sections were in-page tabs; each is now a named item of the console sidebar (#/sysadmin/plat/<sub>) —
     «التهيئة والاستعادة» under البيانات والاستمرارية, the other eight under إعدادات المنصة */
  plat: { 'هوية المنصة': 'aside', 'شاشة تسجيل الدخول': 'aside', 'تطبيق الجوال': 'aside', 'القوائم': 'aside', 'الطباعة والتقارير': 'aside', 'الوحدات': 'aside', 'التهيئة والاستعادة': 'aside', 'التنبيهات والتعاميم': 'aside', 'حول المنصة': 'aside' },
};
/* CORE-02 review of S10 (intended): a card title that only repeated the page title (h2) was dropped; the recorded heading is the h2
   named here, which must be shown. The ONLY place a recorded heading may merge into the page title; never add an entry to hide a loss. */
const MERGED = {
  users: { 'مراقبة الحسابات — كل الإدارات': 'مراقبة الحسابات' },
};
const merged = (t, x, now) => !!(MERGED[t] && MERGED[t][x] && now.headings.has(MERGED[t][x]));
/* CORE-02 step 2: old display names of the top role / the admin interface that must no longer be shown on any admin tab */
const OLD_NAMES = ['مدير النظام', 'المشرف العام', 'مشرف المنصة', 'مدير المنصة'];
/* CORE-02 step 1 / S7: the nine tabs sit in five groups — since S7 in the console sidebar. Each recorded tab must show its group
   heading and its own item selected (aria-current="page"); الرئيسية is a single item with no heading, and إعدادات المنصة is selected
   with one of its sections. */
const NAV = {
  overview: ['الرئيسية'], depts: ['الإدارة المؤسسية', 'الإدارات'], users: ['الإدارة المؤسسية', 'مراقبة الحسابات'], perms: ['الإدارة المؤسسية', 'خريطة الصلاحيات'],
  plat: ['إعدادات المنصة'], sec: ['الأمن والرقابة', 'الأمن'], oplog: ['الأمن والرقابة', 'سجل الأنشطة والتغييرات'],
  backup: ['البيانات والاستمرارية', 'النسخة الاحتياطية'], histimp: ['البيانات والاستمرارية', 'استيراد البيانات التاريخية'],
};
/* the selected nav labels without a count badge («الأمن #») */
const selNow = (r) => r.selected.map((x) => x.replace(/ #$/, ''));
/* CORE-02 S7: the platform settings open on their last section — «التهيئة والاستعادة» is selected under البيانات والاستمرارية */
const opened = (t, r) => NAV[t].every((v) => selNow(r).includes(v)) || (t === 'plat' && ['البيانات والاستمرارية', 'التهيئة والاستعادة'].every((v) => selNow(r).includes(v)));
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
  /* CORE-02 S7: the console sidebar — the current item and its group heading are the selected place; every item label is reachable */
  const side = [...document.querySelectorAll('aside.bsb [data-con-tab]')].map((e) => norm(e.querySelector('.nlbl') ? e.querySelector('.nlbl').textContent : e.textContent));
  const cur = document.querySelector('aside.bsb [data-con-tab][aria-current="page"]');
  if (cur) { const g = cur.closest('.s-cg'), h = g && g.querySelector('.s-cgh'); if (h) out.selected.push(norm(h.textContent)); out.selected.push(norm(cur.querySelector('.nlbl').textContent)); }
  return { headings: [...out.headings], actions: [...out.actions], fields: [...out.fields], selected: out.selected, nav: out.nav, side, text: norm(root.innerText) };
}

/* CORE-02 step 6: what a phone or the dark theme can break (runs in the page). Returns
   ov: how far the page scrolls sideways · cut: visible content past the screen edge that no scroll area of its own holds and no ellipsis
   truncates (it is simply cut off) · low: readable text under 3:1 against the colour behind it (gradients, disabled and faded controls,
   and symbol-only text such as emoji are not measured). */
function audit() {
  const vw = document.documentElement.clientWidth, root = document.querySelector('main.bs-main') || document.body;
  const vis = (e) => { if (!e.getClientRects().length) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const held = (e) => { for (let a = e; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (a !== e && (cs.overflowX === 'auto' || cs.overflowX === 'scroll')) return true; if (cs.textOverflow === 'ellipsis') return true; } return false; };
  const name = (e) => e.tagName.toLowerCase() + ' «' + (e.textContent || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40) + '»';
  const out = { ov: document.documentElement.scrollWidth - vw, cut: [], low: [] };
  const all = [...root.querySelectorAll('*')].filter((e) => vis(e) && !e.closest('.bs-sr-only'));
  for (const e of all) {
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    if ((r.right > vw + 1 || r.left < -1) && !held(e)) { const p = e.parentElement, q = p && p.getBoundingClientRect(); if (!(q && (q.right > vw + 1 || q.left < -1) && !held(p))) out.cut.push(name(e) + ' [' + Math.round(r.left) + ',' + Math.round(r.right) + ']'); }
  }
  const rgb = (x) => { const m = String(x).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const behind = (e) => { for (let a = e; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.backgroundImage.includes('gradient')) return null; const c = rgb(cs.backgroundColor); if (c && c.a >= 0.6) return c; } return rgb(getComputedStyle(document.body).backgroundColor); };
  const faded = (e) => { let o = 1; for (let a = e; a; a = a.parentElement) o *= +getComputedStyle(a).opacity; return o < 0.9; };
  for (const e of all) {
    if (![...e.childNodes].some((x) => x.nodeType === 3 && /[A-Za-z؀-ۿ]/.test(x.textContent))) continue;
    if (e.closest(':disabled,[aria-disabled="true"]') || faded(e)) continue;
    const c = rgb(getComputedStyle(e).color), b = behind(e); if (!c || c.a < 0.5 || !b) continue;
    const l1 = lum(c), l2 = lum(b), cr = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    if (cr < 3) out.low.push(name(e) + ' ' + cr.toFixed(2) + ':1');
  }
  return out;
}

/* CORE-02 S7: open a console sidebar item as a user would — on a phone or tablet the sidebar is a drawer, opened by the burger first;
   the accordion sidebar (one group open at a time) opens the item's group by its header first */
async function asideGo(page, sel) {
  const closed = await page.evaluate(() => innerWidth <= 1024 && document.querySelector('aside.bsb').classList.contains('cx'));
  if (closed) { await page.click('.bs-burger'); await page.waitForTimeout(500); }
  const l = page.locator('aside.bsb ' + sel).first();
  if (!(await l.isVisible())) { await page.click('#' + await l.evaluate((e) => e.closest('.s-cg').querySelector('.s-cgh').id), { timeout: 10000 }); await page.waitForTimeout(200); }
  await l.click({ timeout: 10000 });
}
/* Probes: the in-tab navigation a user takes to reach the rest of a tab (sub-tabs, a row's action menu, a details panel).
   Each only opens/switches views — none of them saves. */
async function probes(page, scope, tab, each) {
  const states = [];
  const snap = async (name) => { const r = await page.evaluate(collect); states.push({ name, ...r }); if (each) await each(name); };
  await snap('base');
  if (scope === 'sys' && tab === 'plat') {
    /* CORE-02 S7: the platform sections are sidebar items (8 under إعدادات المنصة, setup under البيانات والاستمرارية) */
    const subs = await page.evaluate(() => [...document.querySelectorAll('aside.bsb [data-con-tab="plat"][data-con-sub]')].map((e) => [e.getAttribute('data-con-sub'), e.textContent.replace(/\s+/g, ' ').trim()]));
    for (const [k, t] of subs) {
      await asideGo(page, '[data-con-tab="plat"][data-con-sub="' + k + '"]');
      await page.waitForTimeout(900); await snap('sub:' + t);
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
  /* CORE-02 S7: one primary navigation — the console sidebar. Every tab is one item; the platform settings tab opens on a section */
  const hash = () => page.evaluate(() => location.hash);
  await page.evaluate(() => { location.hash = '#/sysadmin/overview'; }); await page.waitForTimeout(2500);
  for (const t of SYS_TABS) {
    await asideGo(page, t === 'plat' ? '[data-con-tab="plat"][data-con-sub="id"]' : '[data-con-tab="' + t + '"]:not([data-con-sub])'); await page.waitForTimeout(900);
    const seg = t === 'depts' ? 'org' : t;   /* V7 P0: «الإدارات» = #/sysadmin/org */
    assert.equal(await hash(), '#/sysadmin/' + seg + (t === 'plat' ? '/id' : ''), vn + ': the sidebar item writes #/sysadmin/' + seg);
    const r = await page.evaluate(collect); assert.ok(opened(t, r), vn + ': ' + t + ' selected as ' + JSON.stringify(NAV[t]) + ' (now ' + JSON.stringify(r.selected) + ')');
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(ov <= 1, vn + ': ' + t + ': no horizontal page scroll (' + ov + 'px)');
    assert.equal(await page.locator('main .adm-tabbar:not(.adm-tabbar--d), main .adm-l2, main .adm-subtabs').count(), 0, vn + ': ' + t + ': no in-page strip and no second row of tabs');
    assert.equal(await page.locator('main [role=tablist]').count(), 0, vn + ': ' + t + ': no tab row in the page (the sidebar is the one navigation)');
  }
  /* «التهيئة والاستعادة» is one item, under البيانات والاستمرارية, and opens the platform settings on its own section */
  assert.equal(await page.locator('aside.bsb [data-con-sub="setup"]').count(), 1, vn + ': one entry for «التهيئة والاستعادة»');
  await asideGo(page, '[data-con-sub="setup"]'); await page.waitForTimeout(1200);
  assert.equal(await hash(), '#/sysadmin/plat/setup', vn + ': «التهيئة والاستعادة» opens #/sysadmin/plat/setup');
  const r = await page.evaluate(collect);
  assert.deepEqual(r.selected, ['البيانات والاستمرارية', 'التهيئة والاستعادة'], vn + ': … selected under its group');
  /* a deep link to an item at the far end of the sidebar: the current item is fully inside the sidebar's scroll area */
  await page.goto(new URL(page.url()).origin + '/#/sysadmin/histimp', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4500);
  if (await page.evaluate(() => innerWidth <= 1024)) { await page.click('.bs-burger'); await page.waitForTimeout(700); }
  const clip = await page.evaluate(() => { const e = document.querySelector('aside.bsb .s-ci.on'), n = e && e.closest('.s-nav'); if (!e) return null; const a = e.getBoundingClientRect(), b = n.getBoundingClientRect(); return [e.textContent.trim(), a.top >= b.top - 1 && a.bottom <= b.bottom + 1]; });
  assert.deepEqual(clip, ['استيراد البيانات التاريخية', true], vn + ': the selected item is fully in view after a deep link');
}
const sess = async (b, lab, who, view, writes) => openAs(b, lab, ...(who === 'super' ? [LAB.superUn, LAB.superPw] : [LAB[who], LAB.pw]), { ...view, onPage: (p) => watchWrites(p, writes) });
const shot = async (page, dir, name) => { fs.mkdirSync(dir, { recursive: true }); await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: true }); };
const theme = async (page, t) => { await page.evaluate((x) => KIVO.__bsThemeSet(x), t); await page.waitForTimeout(350); };

if (CAPTURE) {
  test('CAPTURE: fixture and BEFORE screenshots', { timeout: 1800000 }, async () => {
    const b = await chromium.launch(); const fx = SHOTS_ONLY ? JSON.parse(fs.readFileSync(FIX, 'utf8')) : { _note: 'RISHAD CORE-02 step 0: function inventory captured in the lab on develop@625dac6 BEFORE CORE-02 (synthetic TEST_ONLY data). Normalised text: digits → #, bidi marks removed, data rows (TEST_ONLY / account names) dropped. Checked by core02_admin_functions.test.mjs.', sys: {}, dept: {}, nav: {} };
    try {
      for (const [scope, who, base, tabs] of SHOTS_ONLY ? [] : [['sys', 'super', '#/sysadmin/', SYS_TABS], ['dept', 'mgrA', '#/admin/', DEPT_TABS]]) {
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
      if (!SHOTS_ONLY) fs.writeFileSync(FIX, JSON.stringify(fx, null, 1) + '\n');
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
                    await asideGo(s.page, '[data-con-tab="plat"][title="' + sub + '"]').catch(() => {});
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
  /* CORE-02 step 6: a filter or segmented choice that became a real toggle button (aria-pressed) is recorded as the same label under
     fields «toggle:», and an unlabelled switch («control:<its row>») that became a named role=switch as «toggle:<its row>» — the same
     function on the same route, now announced with its name and its on/off state */
  const missing = (rec, now, kind) => rec.filter((x) => !variants(x).some((v) => kind === 'headings' ? (now.headings.has(v) || now.text.includes(v.replace(/^[a-z]+:/, ''))) : (now[kind].has(v) || (kind === 'actions' && now.fields.has('toggle:' + v)) || (kind === 'fields' && v.startsWith('control:') && now.fields.has('toggle:' + v.slice(8))))));

  test('platform administrator: every recorded heading, action and field of every #/sysadmin tab is still reachable; deep links; no save; no errors', { timeout: 900000 }, async () => {
    const b = await chromium.launch(); const lab = await world(); const writes = []; let s = null;
    try {
      s = await sess(b, lab, 'super', DESKTOP, writes); s.page.setDefaultTimeout(15000);
      const rev0 = lab.revs();
      assert.deepEqual(Object.keys(FX.sys), SYS_TABS, 'the fixture covers all nine admin tabs');
      assert.deepEqual(Object.keys(NAV).sort(), [...SYS_TABS].sort(), 'every admin tab has its place in the two-level navigation');
      const nowBy = {}, moved = [];
      for (const t of SYS_TABS) {
        await s.go('#/sysadmin/' + t, 4000);
        const states = await probes(s.page, 'sys', t), now = union(states), rec = FX.sys[t];
        nowBy[t] = now;
        assert.ok(opened(t, states[0]), t + ': the tab opened (recorded «' + rec.selected + '») shows ' + JSON.stringify(NAV[t]) + ' selected (now ' + JSON.stringify(states[0].selected) + ')');
        for (const kind of ['headings', 'actions', 'fields']) {
          const miss = missing(rec[kind], now, kind).filter((x) => !(kind === 'actions' && MOVED[t] && MOVED[t][x] && moved.push([t, x, MOVED[t][x]]))).filter((x) => !(kind === 'headings' && merged(t, x, now)));
          assert.deepEqual(miss, [], t + ': every recorded ' + kind + ' still reachable');
        }
        /* CORE-02 step 2: the display names — no old name for the top role or the admin interface is shown anywhere on the page */
        const txt = await s.page.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('[title],[aria-label],[placeholder]')]
          .map((e) => [e.getAttribute('title'), e.getAttribute('aria-label'), e.getAttribute('placeholder')].join(' ')).join(' '));
        assert.deepEqual(OLD_NAMES.filter((o) => txt.includes(o)), [], t + ': no old display name is shown');
      }
      /* CORE-02 step 5: every link of the removed quick-links strip is still reachable at its destination */
      const side = (await s.page.evaluate(collect)).side;
      assert.equal(side.length, 17, 'the console sidebar holds 17 destinations (' + JSON.stringify(side) + ')');
      for (const [from, x, to] of moved) assert.ok(to.startsWith('=') ? nowBy[from].actions.has(to.slice(1)) : to === 'aside' ? side.includes(x) : (NAV[to].includes(x) || side.includes(x) || variants(x).some((v) => nowBy[to].actions.has(v))), from + ': «' + x + '» (moved) is still reachable ' + (to === 'aside' ? 'in the console sidebar' : 'on ' + to));
      /* CORE-02 step 2: the page is titled «المنصة / مركز إدارة رشاد», the sidebar link reads «مركز إدارة رشاد», the user card reads «مسؤول المنصة» */
      assert.equal((await s.page.textContent('.bs-crumb')).replace(/\s+/g, ' ').trim(), 'المنصة / مركز إدارة رشاد', 'crumb names the admin interface');
      assert.ok((await s.page.$$eval('.nlbl', (els) => els.map((e) => e.textContent.trim()))).includes('مركز إدارة رشاد'), 'sidebar link «مركز إدارة رشاد»');
      assert.ok((await s.page.evaluate(() => document.body.innerText)).includes('مسؤول المنصة'), 'the top role is shown as «مسؤول المنصة»');
      /* deep links: a fresh load of #/sysadmin/<tab> opens that tab and keeps the address */
      for (const t of SYS_TABS) {
        await s.page.goto(lab.base + '/#/sysadmin/' + t, { waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(4500);
        const r = await s.page.evaluate(collect), h = await s.page.evaluate(() => location.hash);
        if (t === 'plat') assert.match(h, /^#\/sysadmin\/plat\/(id|mods|notif|login|side|print|app|about|setup)$/, t + ': the deep link opens the platform settings on a section (the last one opened) and names it in the address');
        else assert.equal(h, '#/sysadmin/' + (t === 'depts' ? 'org' : t), t + ': the deep link stays on its address (V7 P0: the recorded #/sysadmin/depts opens and is written as #/sysadmin/org)');
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

  test('CORE-02 step 6: phone (390×844) light and dark, desktop dark — every tab and probed view: no sideways scroll, nothing cut off, readable contrast, every function reachable, no save, no errors', { timeout: 1500000 }, async () => {
    const b = await chromium.launch(); const lab = await world(); const writes = [];
    /* the department pages once, on the phone in dark — last, since a manager's sign-in reorders the accounts list (by last sign-in)
       and the probes open the first row's menu */
    const RUNS = [['phone-light', MOBILE, 'light', 'sys'], ['phone-dark', MOBILE, 'dark', 'sys'], ['desktop-dark', DESKTOP, 'dark', 'sys'], ['phone-dark', MOBILE, 'dark', 'dept']];
    const bad = [], rev0 = lab.revs();
    try {
      for (const [vn, view, th, sc] of RUNS) {
        for (const [scope, who, base, rec] of [['sys', 'super', '#/sysadmin/', FX.sys], ['dept', 'mgrA', '#/admin/', FX.dept]].filter((x) => x[0] === sc)) {
          const s = await sess(b, lab, who, view, writes); s.page.setDefaultTimeout(15000);
          try {
            await theme(s.page, th);
            for (const t of Object.keys(rec)) {
              await s.go(base + t, 3500);
              const each = async (st) => {
                const a = await s.page.evaluate(audit), at = vn + ' ' + scope + '/' + t + (st === 'base' ? '' : ' › ' + st);
                if (a.ov > 1) bad.push(at + ': the page scrolls sideways by ' + a.ov + 'px');
                if (a.cut.length) bad.push(at + ': cut off at the screen edge: ' + a.cut.slice(0, 4).join(' · '));
                if (a.low.length) bad.push(at + ': text under 3:1: ' + a.low.slice(0, 4).join(' · '));
              };
              const states = await probes(s.page, scope, t, each), now = union(states);
              for (const kind of ['headings', 'actions', 'fields']) {
                const miss = missing(rec[t][kind], now, kind).filter((x) => !(kind === 'actions' && MOVED[t] && MOVED[t][x])).filter((x) => !(kind === 'headings' && scope === 'sys' && merged(t, x, now)));
                if (miss.length) bad.push(vn + ' ' + scope + '/' + t + ': not reachable (' + kind + '): ' + miss.join(' · '));
              }
            }
            if (s.errs.length) bad.push(vn + ' ' + who + ': page errors: ' + s.errs.join(' · '));
          } finally { try { await s.ctx.close(); } catch (e) { /* closed */ } }
        }
      }
      assert.deepEqual(bad, [], 'phone and dark: every admin tab is laid out, readable and complete');
      assert.deepEqual(writes, [], 'opening the tabs on the phone and in dark saves nothing');
      await lab.idle(); assert.equal(lab.revs(), rev0, 'no stored record changed on the server');
    } finally { await lab.close(); await b.close(); }
  });
}
