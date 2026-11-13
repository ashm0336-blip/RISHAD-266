/* V7 UX states · the ONE experience — every route of manifests/pages.json × three ways of arriving, in a real browser over the
   built package with a delayed server (lab: TEST_ONLY data, no network). This file is the judge of the rule; it knows nothing of
   how the shell implements it — it only looks at the screen, sampled every 15 ms, and at the requests in flight.
   Routes: enumerated from pages.json (routeNames + the tab addresses of tabAddr) — no hand list. A route the lab account cannot
   reach is named in EXCLUDED with its reason, and the test fails if that list and what really happens disagree.
   Cells, per route:
     first   — cold load of the address (full reload);
     entry   — first entry within the session: the session starts on another page, the route was never opened;
     return  — the route was opened before in this session; leave to another page and come back.
   The rule a cell must keep:
     · the header is there from the first sample: the page title, and the page's tabs where it has tabs;
     · first / entry: while a read is in flight the ONE skeleton shows beneath the header (nothing else: no page content), then the content;
     · return: the previous content shows at once, with the refresh line and badge for as long as a read is in flight; no skeleton;
     · never: a reading text («جارٍ قراءة…» — and its sisters «جارٍ القراءة» · «جارٍ تحميل…» · «جارٍ التحميل»), a skeleton of another shape, or content with neither skeleton nor line and badge while a read is in flight.
     A cell in which the page asks the server nothing has nothing to wait for: the content shows at once (reported as «no read»).
   «A read in flight» = an API GET (or the page's own file) started and not yet answered; the sync long-poll, presence beats and the
   notification bell (with its observer's start mark, /api/aud?first=1) are timer-driven, not page-driven, and are left out — and with
   the long-poll, the pull it triggers when a change arrives (/api/get?keys=…: the sync layer's own request, never a page's).
   The header the shell draws while loading must be the page's own: the same tabs with the same icons, in the same order, as the strip the
   page then draws (compared on every first / entry cell).
   Two more observations per route, with the page's reads FAILING (aborted at the network):
     return-fail — the route was opened before, and its re-read on return fails ⇒ the previous content stays, with the component strip
                   «تعذّر التحديث — المعروض قد لا يكون الأحدث» and its «أعد المحاولة»; no failure card, no skeleton, no reading text; the
                   button recovers the page. Only where the route re-reads on return (seen in its return cell).
     entry-fail  — first entry within the session and its reads fail ⇒ the full failure card (one, with its retry), no content, no strip; the
                   button recovers the page. Only where the route reads on entry. (A cold load cannot be failed this way: the same requests
                   carry the sign-in and the shell's own start.)
     secondary-fail — first entry within the session and ONE of the page's reads fails while its others answer, a read the page can do
                   without (SECONDARY below) ⇒ the page itself shows, with what succeeded, under the same strip; no failure card, no skeleton
                   left, no reading text; the button recovers. The full card is for a failed MAIN read with no content: the page drew its own
                   failure card, or every read of the entry failed (the shell gate's shared operations read apart).
   KIVO_UX_VIEWPORT=390x844 runs the matrix at that size (default 1366x900). KIVO_UX_DELAY (ms, default 1500) is the delay put on every server answer. KIVO_UX_MATRIX_OUT=<file.md> writes the table of what
   each cell showed (built from these same observations); KIVO_UX_ROUTES=a,b/c limits the run to some routes (a full run is the gate). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const SRC = process.env.KIVO_SRC || new URL('../../src', import.meta.url).pathname;
const M = JSON.parse(fs.readFileSync(SRC + '/manifests/pages.json', 'utf8'));
const DELAY = +(process.env.KIVO_UX_DELAY || 1500);
const VIEW = /^(\d+)x(\d+)$/.exec(process.env.KIVO_UX_VIEWPORT || '1366x900'), VIEWPORT = { width: +VIEW[1], height: +VIEW[2] };
const STALE = 'تعذّر التحديث — المعروض قد لا يكون الأحدث', RETRY = 'أعد المحاولة';
const AWAY = '#/links', AWAY2 = '#/staffing';             /* the «other page»: a page of the shell itself that reads nothing (and, for that page itself, the monthly schedule) */
const CAP = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan', 'planning', 'irshad', 'seized', 'award', 'links', 'help'];
/* routes the lab account cannot open, each with its reason (the test checks that they really do not open) */
const EXCLUDED = {
  help: 'the address opens no screen for the lab account: the shell falls back to another page (observed, and checked on every run)',
};

/* a tab the page shows and pages.json lists as display-only (shellTabs: it has no permission leaf of its own); the page owns its address */
const EXTRA = { employees: ['store'] };
/* routes held to two more checks (reviewer, 13 Nov): no refresh button of the page's own, and — on a phone-wide screen — nothing to press
   outside the screen and no sideways scroll, while loading and after */
const STRICT = /^(?:employees|award)(?:\/|$)/, PHONE = VIEWPORT.width <= 480;
/* bars that slide sideways on a phone by the platform's older rule (.bs-hbar: one line, swiped) — there before this work, listed for the
   reviewer to class, each named by a word it holds. What they hold is reached by that swipe; nothing else may lie outside the screen. */
const SWIPE = [[/^employees(?:\/data)?$/, 'نوع التوظيف', 'the employee filters bar'], [/^employees\/custody$/, 'انقضى', 'the months strip of custody']];
const LAYOUT = (swipe) => {
  const main = document.querySelector('main.bs-main'), W = document.documentElement.clientWidth;
  const vis = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 4 && r.height > 4 && c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > 0.05; };
  /* a wide table scrolls sideways inside its own box: what it holds is reached by that scroll */
  const inTable = (e) => { for (let p = e.parentElement; p && p !== main; p = p.parentElement) { const c = getComputedStyle(p); if (/auto|scroll/.test(c.overflowX) && p.scrollWidth > p.clientWidth + 1 && p.querySelector('table')) return true; } return false; };
  const name = (e) => e.tagName.toLowerCase() + '«' + (e.textContent || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 30) + '»';
  const inSwipe = (e) => { for (let p = e.parentElement; p && p !== main; p = p.parentElement) { const c = getComputedStyle(p); if (/auto|scroll/.test(c.overflowX) && p.scrollWidth > p.clientWidth + 1) return swipe.some((w) => p.outerHTML.includes(w)); } return false; };
  const press = [...main.querySelectorAll('button, a[href], input, select, textarea, [role=tab], [role=button], .bs-tabstrip > *')].filter((e) => vis(e) && !inTable(e) && !inSwipe(e));
  const off = press.map((e) => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > W + 1 ? name(e) + ' ' + Math.round(r.left) + '…' + Math.round(r.right) : null; }).filter(Boolean);
  const refresh = [...main.querySelectorAll('button')].filter((e) => vis(e) && !e.closest('.ps') && /^تحديث/.test(e.textContent.trim())).map(name);
  return { off, refresh, wider: document.documentElement.scrollWidth - W };
};

/* routes that have a secondary read on entry, and the request treated as secondary (found by failing each entry request of each route
   alone and seeing that the page still draws its content and no failure card). The test fails if the request is no longer made.
   Routes not listed have one page read (or only the shell gate's operations read): nothing there is secondary. */
const RETRO = /^\/api\/retro\b/, OVERVIEW = /^\/api\/overview\b/;
const SECONDARY = { irshad: RETRO, 'irshad/records': RETRO, seized: RETRO, 'seized/records': RETRO, admin: OVERVIEW, 'admin/backup': OVERVIEW, 'admin/oplog': OVERVIEW, 'admin/shifts': OVERVIEW,
  'admin/ptpls': OVERVIEW, 'admin/import': OVERVIEW, sysadmin: OVERVIEW, profile: /^\/api\/me\/today\b/ };

/* ── the routes and their expected header, from pages.json alone ── */
function routes() {
  const byKey = Object.fromEntries(M.pages.map((p) => [p.key, p])), out = [];
  const leaves = (p) => (p.seq ? p.seq.map((s) => { const [kind, k] = s.split(':'); return kind === 'page' ? { key: k, name: byKey[k].name } : (p.subs || []).concat(p.tabs || []).find((x) => x.key === k); })
    : (p.subs || []).concat(p.tabs || [])).filter((x) => x && !x.offPage);
  const tabsOf = (nav) => {
    const box = M.containers.find((c) => c.nav === nav); if (box) return box.refs.map((r) => box.names[r]);
    const p = M.pages.find((x) => x.nav === nav); if (!p) return [];
    const l = leaves(p); return l.length > 1 ? l.map((x) => x.name) : [];
  };
  for (const nav of Object.keys(M.routeNames)) {
    out.push({ route: nav, nav, title: M.routeNames[nav], tabs: tabsOf(nav) });
    const p = M.pages.find((x) => x.nav === nav), addr = p && M.tabAddr[p.key]; if (!addr) continue;
    const keys = addr === 1 ? (p.subs || []).filter((s) => !s.offPage).map((s) => s.key) : Object.keys(addr);
    for (const k of keys.concat(EXTRA[nav] || [])) out.push({ route: nav + '/' + k, nav, title: M.routeNames[nav], tabs: tabsOf(nav) });
  }
  return out;
}

/* ── the sampler: runs in the page from before its first script; one record per 15 ms, and one as each read starts ── */
const SAMPLER = () => {
  const TIMER = /^\/api\/(?:changes|presence|notifications|get)\b|^\/api\/aud\?first=1/, of = window.fetch, what = []; let flying = 0;
  window.fetch = function (input, init) {
    const p = of.apply(this, arguments);
    try {
      const u = new URL(typeof input === 'string' ? input : input.url, location.href), m = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if (m === 'GET' && (u.pathname.startsWith('/api/') && !TIMER.test(u.pathname + u.search) || /\.dc\.html$|\/assets\/pages\//.test(u.pathname))) { flying++; what.push(u.pathname); const end = () => { flying--; what.splice(what.indexOf(u.pathname), 1); }; p.then(end, end);
        Promise.resolve().then(() => scan());   /* and one record at the very instant a read starts: the mark must already be there, not a frame later */ }
    } catch (e) { /* not ours */ }
    return p;
  };
  const vis = (e, min = 4) => { if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 4 && r.height > min && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const shape = (sk) => [...sk.children].map((c) => c.className.replace(/\s+/g, '.') + '(' + [...c.children].map((b) => b.className.replace(/bs-skel\s*/, '').replace(/\s+/g, '.')).join(',') + ')').join(' ');
  window.__ux = { log: [], t0: performance.now(), mark() { this.log = []; this.t0 = performance.now(); } };
  const scan = () => {
    const main = document.querySelector('main.bs-main'); if (!main) return;
    const X = window.__ux, crumbs = document.querySelectorAll('.bs-crumb span'), crumb = crumbs[crumbs.length - 1];
    if (!crumb || /\{\{/.test(crumb.textContent)) return;   /* the shell has not drawn yet (the static document still shows its template) */
    const skels = [...main.querySelectorAll('.ps-skel')].filter(vis);
    const snap = [...main.querySelectorAll('.ps-snap')].filter(vis);
    /* live content: what the page itself drew — outside the shell's own state area, not a load placeholder, not a state host */
    const live = [...main.querySelectorAll(':scope > .sc-host, :scope > [data-screen-label]')].filter((h) => vis(h) && [...h.querySelectorAll(':scope > *, :scope > .sc-host > *')]
      .some((c) => !c.matches('.sc-placeholder, .ps, style, .sc-host') && vis(c) && c.getBoundingClientRect().height > 40));
    const strips = [...main.querySelectorAll('.bs-tabstrip')].filter(vis).map((s) => [...s.querySelectorAll('span')].filter((c) => c.childElementCount === 0 && c.getBoundingClientRect().width > 4).map((c) => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean));
    /* each visible strip as [label, icon markup] pairs, and whether the shell drew it */
    const icons = [...main.querySelectorAll('.bs-tabstrip')].filter(vis).map((st) => ({ shell: !!st.closest('.ps-shell > .ps-tabbox'), tabs: [...st.querySelectorAll('svg')].map((g) => { const tab = g.parentElement.parentElement, lab = tab && tab.querySelector('span'); return [lab ? lab.textContent.replace(/\s+/g, ' ').trim() : '', g.innerHTML.replace(/ data-dc-tpl="\d+"/g, '').replace(/ xmlns="[^"]*"/g, '').replace(/\s+/g, ' ').replace(/> </g, '><').trim()]; }).filter((x) => x[0]) }));
    const staleBar = [...main.querySelectorAll('.ps-stale')].filter(vis)[0], cards = [...main.querySelectorAll('.ps-card.ps-fail')].filter(vis);
    const txt = [...main.querySelectorAll('span, p, div, b')].some((e) => e.childElementCount === 0 && /جارٍ (?:ال)?(?:قراءة|تحميل)/.test(e.textContent) && vis(e));
    const gate = [...main.querySelectorAll('.sc-placeholder')].some((p) => !p.querySelector('.ps-fail, .sc-placeholder-error'));
    X.log.push({ t: Math.round(performance.now() - X.t0), read: flying > 0 || gate, what: gate ? 'page gate' : what.join(' '), title: crumb ? crumb.textContent.trim() : '', tabs: strips, skel: skels.length, shape: skels.map(shape),
      live: live.length > 0, snap: snap.length > 0, line: [...main.querySelectorAll('.ps-line')].some((e) => vis(e, 2)), badge: [...main.querySelectorAll('.ps-badge')].some(vis), text: txt,
      fail: [...main.querySelectorAll('.ps-fail, .bs-retry')].some(vis), icons, wider: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      stale: staleBar ? staleBar.textContent.replace(/\s+/g, ' ').trim() : '', cards: cards.length, cardButtons: cards[0] ? [...cards[0].querySelectorAll('button')].map((x) => x.textContent) : [] });
  };
  setInterval(scan, 15);
};

/* ── judging one cell from its samples ── */
const GRACE = 450;                                        /* the skeleton may wait 300 ms (a load that ends sooner draws none) */
function judge(kind, r, all) {
  const from = all.length ? all[0].t : 0, log = all.map((s) => ({ ...s, t: s.t - from }));   /* a cold load is timed from the shell's first drawing */
  const bad = [], add = (m, s) => { if (bad.length < 4) bad.push(m + (s ? ' @' + s.t + 'ms' + (s.what ? ' [' + s.what + ']' : '') : '')); };
  const reads = log.filter((s) => s.read), noRead = reads.length === 0, shapes = new Set(log.flatMap((s) => s.shape));
  const hasTabs = (s) => !r.tabs.length || s.tabs.some((l) => r.tabs.filter((n) => l.includes(n)).length >= Math.min(2, r.tabs.length));
  const cell = { read: !noRead, header: true, skeleton: log.some((s) => s.skel > 0), cached: false, lineBadge: false, forbidden: false, shapes: [...shapes], bad };
  if (!log.length) { add('no sample'); return cell; }
  for (const s of log) {
    if (s.text) { cell.forbidden = true; add('a reading text («جارٍ قراءة/تحميل…») shows', s); }
    if (s.title !== r.title) { cell.header = false; add('title «' + s.title + '» instead of «' + r.title + '»', s); }
    if (!hasTabs(s)) { cell.header = false; add('the tabs are not shown (' + JSON.stringify(s.tabs) + ')', s); }
    if (s.skel > 1) add('two skeletons at once', s);
    if (s.fail) add('a failure card shows', s);
    const content = s.live || s.snap, mark = s.line && s.badge;
    if (s.read && content && !mark) add('content with neither skeleton nor line and badge while a read is in flight', s);
    if (kind === 'return') {
      if (s.skel) add('a skeleton on a return', s);
      if (!content && s.t > 120) add('no content on a return', s);
      if (content && mark) cell.lineBadge = true;
      if (s.snap || s.live) cell.cached = cell.cached || s.read;
    } else {
      if (s.read && content) add('page content shows while its first read is in flight', s);
      if (s.read && !s.skel && s.t > GRACE) add('no skeleton while a read is in flight', s);
    }
  }
  const end = log[log.length - 1];
  if (kind !== 'return' && r.tabs.length) {
    /* the shell's header against the page's own strip: same tabs, same icons, same order */
    const drawn = log.map((s) => s.icons.find((x) => x.shell)).filter(Boolean).pop(), own = (end.icons.find((x) => !x.shell) || {}).tabs;
    cell.icons = !!drawn && !!own && JSON.stringify(drawn.tabs) === JSON.stringify(own) && drawn.tabs.every((t) => t[1].length > 10);
    if (!cell.icons) add('the shell header is not the page\'s strip: ' + JSON.stringify((drawn || {}).tabs || null).slice(0, 160) + ' ≠ ' + JSON.stringify(own || null).slice(0, 160));
  }
  if (!end.live) add('the content never arrived', end);
  if (end.skel || end.badge || end.snap) add('a loading state is left on screen at the end', end);
  if (kind !== 'return' && !noRead && reads[reads.length - 1].t > GRACE + 150 && !cell.skeleton) add('a read was in flight and no skeleton was ever shown');
  if (kind === 'return' && !noRead && reads[reads.length - 1].t > 400 && !cell.lineBadge) add('a read was in flight on a return and the line and badge never showed');
  return cell;
}

/* the two failing observations: what is on screen once the failure has shown, and across the samples before it */
function judgeFail(kind, r, log, recovered) {
  const bad = [], add = (m, s) => { if (bad.length < 4) bad.push(m + (s ? ' @' + s.t + 'ms' : '')); }, end = log[log.length - 1] || {};
  const cell = { read: true, header: true, skeleton: log.some((s) => s.skel > 0), cached: !!end.snap, lineBadge: log.some((s) => s.line && s.badge), forbidden: log.some((s) => s.text), shapes: [], bad,
    shows: end.stale ? 'strip' : end.cards ? 'card' : 'neither' };
  for (const s of log) { if (s.text) add('a reading text shows', s); if (s.title !== r.title) { cell.header = false; add('title «' + s.title + '»', s); } }
  if (kind === 'secondary-fail') {
    for (const s of log) if (s.cards) add('a failure card for a secondary read', s);
    if (!end.live) add('the page itself is not shown');
    if (end.snap) add('cached content on a first entry');
    if (end.skel) add('a skeleton is left');
    if (!end.stale.startsWith(STALE) || !end.stale.endsWith(RETRY)) add('the strip is not shown («' + end.stale + '»)');
    cell.shows = end.stale && end.live ? 'page + strip' : cell.shows;
  } else if (kind === 'return-fail') {
    for (const s of log) { if (s.skel) add('a skeleton on a failing return', s); if (s.cards) add('a failure card while content exists', s); if (!s.snap && !s.live && s.t > 120) add('no content on a failing return', s); }
    if (!end.snap && !end.live) add('the content did not stay');
    if (!end.stale.startsWith(STALE) || !end.stale.endsWith(RETRY)) add('the strip is not shown («' + end.stale + '»)');
    if (end.badge) add('the refresh badge is left with the strip');
  } else {
    if (end.cards !== 1) add(end.cards + ' failure cards instead of one');
    if (JSON.stringify(end.cardButtons) !== JSON.stringify([RETRY])) add('the card buttons are ' + JSON.stringify(end.cardButtons));
    if (end.stale) add('a stale strip with no content');
    if (end.snap) add('cached content on a first entry');
    for (const s of log) if (s.stale) add('a stale strip before the card', s);
  }
  if (!recovered) add('«أعد المحاولة» did not bring the page back');
  return cell;
}

test('every pages.json route × first open · first entry within the session · return keeps the one loading experience', { timeout: 3600000 }, async () => {
  const all = routes(), only = (process.env.KIVO_UX_ROUTES || '').split(',').filter(Boolean);
  const list = all.filter((r) => !only.length || only.includes(r.route));
  assert.ok(all.length >= 30, 'the routes come from pages.json (' + all.length + ')');
  const lab = await startLab();
  const P = JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_perms_v1').map((x) => x.v).join(''));
  for (const d of Object.keys(P.caps)) P.caps[d] = CAP;   /* the lab departments get every page in their ceiling (TEST_ONLY data) */
  await lab.env.DB.batch([lab.env.DB.prepare('DELETE FROM kv WHERE k=?1').bind('bassam_perms_v1'), ...lab.W.kvPutStmts(lab.env, 'kv', 'bassam_perms_v1', JSON.stringify(P)),
    lab.env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, 1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind('bassam_perms_v1')]);
  const b = await chromium.launch(); const rows = [], failures = [], skipped = [], shapes = new Set();
  try {
    /* the platform administrator: the one lab account that owns every page (the administration centre included) */
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw, { viewport: VIEWPORT, onPage: (p) => p.addInitScript(SAMPLER) }); const page = s.page; page.setDefaultTimeout(60000);
    let slow = false, broken = false, only = null, onlyHits = 0;
    await page.route(/\/api\/|\/assets\/pages\//, async (route) => {
      const q = route.request(), u = new URL(q.url());
      /* broken: the page-driven reads fail at the network (the timer-driven ones and the page files go on) */
      if (only && q.method() === 'GET' && only.test(u.pathname + u.search)) { onlyHits++; return route.abort('failed').catch(() => {}); }
      if (broken && q.method() === 'GET' && u.pathname.startsWith('/api/') && !/^\/api\/(?:changes|presence|notifications|get)\b|^\/api\/aud\?first=1/.test(u.pathname + u.search)) return route.abort('failed').catch(() => {});
      if (slow && q.method() === 'GET' && !/\/api\/(?:changes|presence)\b/.test(q.url())) await new Promise((r) => setTimeout(r, DELAY));
      return route.continue().catch(() => {});
    });
    /* a failing observation ends when the strip or the card has been on screen for a second (at most 60 s) */
    const failed = async () => { await page.waitForFunction(() => { const L = window.__ux && window.__ux.log; if (!L || L.length < 70) return false; const tail = L.slice(-60); return tail.every((x) => x.stale || x.cards); }, null, { timeout: 60000, polling: 100 }).catch(() => {}); };
    const retryAndSettle = async (sel) => { broken = false; only = null; const btn = page.locator(sel).first(); if (!(await btn.count())) return false; await page.evaluate(() => window.__ux.mark()); await btn.click(); await settle(); const L = await take(), e = L[L.length - 1] || {}; return !!e.live && !e.stale && !e.cards && !e.skel; };
    /* a cell ends when the content is on screen and nothing has been in flight for 1.2 s (at most 60 s) */
    const settle = async () => { await page.waitForFunction(() => { const L = window.__ux && window.__ux.log; if (!L || L.length < 20) return false; const tail = L.slice(-80); return tail.length === 80 && tail.every((x) => !x.read && !x.skel && !x.badge); }, null, { timeout: 60000, polling: 100 }).catch(() => {}); };
    const take = () => page.evaluate(() => window.__ux.log);
    const coldAt = async (hash) => { await page.evaluate((h) => { history.replaceState(null, '', location.pathname + h); }, hash); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('main.bs-main', { timeout: 60000 }); };
    /* the samples of a cell start when the address change is handled (the event), not when it is asked for — a sample taken in between would still be the page being left */
    const goto = async (hash) => { await page.evaluate((h) => { window.__ux.mark(); if (location.hash === h) return; window.addEventListener('hashchange', () => window.__ux.mark(), { once: true }); location.hash = h; }, hash); };
    for (const r of list) {
      const away = '#/' + r.route === AWAY ? AWAY2 : AWAY;
      slow = false; await coldAt(away); await settle();
      if (EXCLUDED[r.route]) {
        await goto('#/' + r.route); await page.waitForTimeout(1500);
        const at = await page.evaluate(() => location.hash);
        assert.ok(!at.startsWith('#/' + r.nav), r.route + ' is listed as unreachable and yet opens (' + at + ')');
        skipped.push(r.route + ' — ' + EXCLUDED[r.route]); continue;
      }
      slow = true;
      const cells = {};
      const lay = {}, look = async (k) => { if (STRICT.test(r.route)) lay[k] = await page.evaluate(LAYOUT, SWIPE.filter((w) => w[0].test(r.route)).map((w) => w[1])); };
      await goto('#/' + r.route); await settle(); cells.entry = await take(); await look('entry');
      const at = await page.evaluate(() => location.hash);
      assert.ok(at.startsWith('#/' + r.nav), r.route + ' does not open for the lab account (lands on ' + at + ') and is not in EXCLUDED');
      await goto(away); await settle();
      await goto('#/' + r.route); await settle(); cells.return = await take(); await look('return');
      await coldAt('#/' + r.route); await settle(); cells.first = await take(); await look('first');
      for (const kind of ['first', 'entry', 'return']) {
        const c = judge(kind, r, cells[kind]); c.shapes.forEach((x) => shapes.add(x));
        if (lay[kind]) {
          if (lay[kind].refresh.length) c.bad.push('a refresh button of the page\'s own: ' + lay[kind].refresh.join(' '));
          if (PHONE && lay[kind].off.length) c.bad.push('outside the screen: ' + lay[kind].off.slice(0, 3).join(' · '));
          const w = PHONE ? cells[kind].reduce((m, x) => Math.max(m, x.wider || 0), lay[kind].wider) : 0;
          if (w > 1) c.bad.push('the page is wider than the screen by ' + w + ' px (it scrolls sideways)');
        }
        rows.push({ route: r.route, kind, ...c });
        if (c.bad.length) failures.push(r.route + ' · ' + kind + ': ' + c.bad.join(' | '));
      }
      /* return-fail: the route is open (cold load above); leave, break the reads, come back */
      if (cells.return.some((x) => x.read)) {
        slow = false; await goto(away); await settle();
        broken = true; await goto('#/' + r.route); await failed();
        const L = await take(), ok = await retryAndSettle('main .ps-stale button'), c = judgeFail('return-fail', r, L, ok);
        rows.push({ route: r.route, kind: 'return-fail', ...c }); if (c.bad.length) failures.push(r.route + ' · return-fail: ' + c.bad.join(' | '));
      } else rows.push({ route: r.route, kind: 'return-fail', skip: 'no re-read on return' });
      /* entry-fail: a fresh session on the other page, the reads broken, first entry */
      if (cells.entry.some((x) => x.read)) {
        broken = false; slow = false; await coldAt(away); await settle();
        broken = true; await goto('#/' + r.route); await failed();
        const L = await take(), ok = await retryAndSettle('main .ps-card.ps-fail button'), c = judgeFail('entry-fail', r, L, ok);
        rows.push({ route: r.route, kind: 'entry-fail', ...c }); if (c.bad.length) failures.push(r.route + ' · entry-fail: ' + c.bad.join(' | '));
      } else rows.push({ route: r.route, kind: 'entry-fail', skip: 'no read on entry' });
      broken = false;
      /* secondary-fail: a fresh session, one read the page can do without fails, first entry */
      if (SECONDARY[r.route]) {
        slow = false; await coldAt(away); await settle();
        only = SECONDARY[r.route]; onlyHits = 0; await goto('#/' + r.route); await failed();
        const hits = onlyHits, L = await take(), ok = await retryAndSettle('main .ps-stale button'), c = judgeFail('secondary-fail', r, L, ok);
        if (!hits) c.bad.push('the request listed as secondary (' + SECONDARY[r.route] + ') was not made on entry');
        rows.push({ route: r.route, kind: 'secondary-fail', ...c }); if (c.bad.length) failures.push(r.route + ' · secondary-fail: ' + c.bad.join(' | '));
      } else rows.push({ route: r.route, kind: 'secondary-fail', skip: 'no secondary read on entry' });
    }
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally {
    await b.close(); await lab.close();
    if (process.env.KIVO_UX_MATRIX_OUT) {
      const y = (v) => v ? 'yes' : 'no';
      const md = ['| route | cell | read in flight | header (title + tabs) | header icons = page | skeleton | cached content | line + badge | failure shown as | forbidden text | verdict |', '|---|---|---|---|---|---|---|---|---|---|---|']
        .concat(rows.map((c) => c.skip ? '| ' + [c.route, c.kind, '—', '—', '—', '—', '—', '—', '—', '—', 'not applicable: ' + c.skip].join(' | ') + ' |'
          : '| ' + [c.route, c.kind, c.read ? 'yes' : 'no read', y(c.header), c.icons === undefined ? '—' : y(c.icons), y(c.skeleton), /^return/.test(c.kind) ? y(c.cached || !c.read) : c.kind === 'entry-fail' ? y(c.cached) : '—', y(c.lineBadge), c.shows || '—', y(c.forbidden), c.bad.length ? 'FAIL: ' + c.bad[0] : 'ok'].join(' | ') + ' |'));
      fs.writeFileSync(process.env.KIVO_UX_MATRIX_OUT, '# Route × state matrix (server delayed ' + DELAY + ' ms, viewport ' + VIEWPORT.width + '×' + VIEWPORT.height + ')\n\n' + md.join('\n') + '\n\nSkeleton shapes seen: ' + shapes.size + '\n\nExcluded routes:\n' + skipped.map((x) => '- ' + x).join('\n') + '\n');
    }
  }
  assert.ok(shapes.size <= 1, 'one skeleton shape in every cell (seen ' + shapes.size + ': ' + [...shapes].join(' ‖ ') + ')');
  assert.equal(failures.length, 0, failures.length + ' cell(s) break the rule:\n' + failures.join('\n'));
});
