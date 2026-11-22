/* V7 · د6 (أ2 · ج1 · ج2 · ج9) — عُدّةُ «الجولة الكاملة»: عالَمُ المختبر (TEST_ONLY، بلا شبكة) · مِجسُّ الصفحة · اكتشافُ القائمة والتبويبات من الـDOM ·
   walkAccount / assertPage · بناءُ الحالات بحفظٍ حقيقي · مقارنةُ المصدر الواحد · الحكمُ على الموجودات بجدول KNOWN_D6.
   هذا الملف لا يعرف صفحةً بعينها: كلُّ معرفةٍ خاصة تأتيه من جدول SPECIAL في ملف الاختبار، وفهرسُ الأنظمة من KIVO.Perm44 / KIVO.BassamPerm وقتَ التشغيل. */
import fs from 'node:fs';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

export const UNITS = { G: 'TEST_ONLY_G', A: 'TEST_ONLY_A', B: 'TEST_ONLY_B', S1: 'TEST_ONLY_A_S1' };
export const ROLE = { id: 'TEST_ONLY_d6_role', name: 'TEST_ONLY دور الجولة' };
const UN = { gm: '1400000002', sec: '1100000011', empRole: '1200000002' };

/* ── الحسابات (مصفوفة أ2) — space: center = مركز الإدارة (خارج مساحة إدارة) · unit = داخل مساحة وحدة ── */
export const ACCOUNTS = [
  { key: 'super-center', who: 'مدير المنصة — خارج مساحة إدارة', un: LAB.superUn, pw: LAB.superPw, space: 'center', unit: UNITS.A },
  { key: 'super-in', who: 'مدير المنصة — داخل مساحة إدارة أ', un: LAB.superUn, pw: LAB.superPw, space: 'unit', unit: UNITS.A },
  { key: 'gm', who: 'مدير إدارة عامة (TEST_ONLY_G) — في مساحة إدارة أ', un: UN.gm, pw: LAB.pw, space: 'unit', unit: UNITS.A },
  { key: 'mgr', who: 'مدير إدارة أ', un: LAB.mgrA, pw: LAB.pw, space: 'unit', unit: UNITS.A },
  { key: 'sec', who: 'مدير قسم أ١', un: UN.sec, pw: LAB.pw, space: 'unit', unit: UNITS.S1 },
  { key: 'emp-role', who: 'موظف بدور مخصّص (إدارة أ)', un: UN.empRole, pw: LAB.pw, space: 'unit', unit: UNITS.A, ekey: 'TEST_ONLY_eA2' },
  { key: 'emp-none', who: 'موظف بلا دور (إدارة أ)', un: LAB.empA, pw: LAB.pw, space: 'unit', unit: UNITS.A, ekey: 'TEST_ONLY_eA1' },
];

const readK = (lab, k) => JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join('') || 'null');
async function putK(lab, k, v) {
  const DB = lab.env.DB;
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind(k), ...lab.W.kvPutStmts(lab.env, 'kv', k, JSON.stringify(v)), DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k)]);
}
export const dbKey = readK;

/* ══ المِجسّ: يعمل في الصفحة قبل أول سطرٍ منها — عدُّ القراءات الجارية · مراقبُ التحوّلات منذ أول رسم · اكتشافُ القائمة والتبويبات ══ */
const PROBE = (C) => {
  if (window.__d6) return;
  const TIMER = new RegExp(C.timer), X = (window.__d6 = { fly: 0, what: [], last: performance.now(), cold: { on: true, side: {}, tab: {}, screen: {} }, off: [], dyn: {} });
  try { X.dyn = JSON.parse(sessionStorage.getItem('__d6') || '{}'); } catch (e) { X.dyn = {}; }
  const track = (url, done) => { try { const u = new URL(url, location.href); if (u.origin !== location.origin || TIMER.test(u.pathname + u.search)) return; X.fly++; X.what.push(u.pathname); done(() => { X.fly--; X.what.splice(X.what.indexOf(u.pathname), 1); X.last = performance.now(); }); } catch (e) { /* ليس طلباً لنا */ } };
  const of = window.fetch;
  window.fetch = function (input) { const p = of.apply(this, arguments); track(typeof input === 'string' ? input : (input && input.url) || '', (end) => p.then(end, end)); return p; };
  const xo = XMLHttpRequest.prototype.open, xs = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__d6u = u; return xo.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () { track(this.__d6u || '', (end) => this.addEventListener('loadend', end)); return xs.apply(this, arguments); };
  const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  const vis = (e) => { if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const shown = (e) => { for (let p = e; p && p !== document.documentElement; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden') return false; } return !!e && e.isConnected; };
  const lit = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05 && c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== 'transparent'; };
  const mainEl = () => document.querySelector(C.main);
  const labelOf = (e) => norm((e.querySelector && e.querySelector(C.sideLabel) ? e.querySelector(C.sideLabel).textContent : '') || e.getAttribute('aria-label') || e.textContent || e.getAttribute('title'));
  /* ── القائمة الجانبية كما تُرسم: كلُّ رابطٍ ظاهر (والمجموعاتُ المطويّة تُفتح أولاً) ── */
  X.heads = () => [...document.querySelectorAll(C.side + ' ' + C.sideExpand)].filter(shown).map((b) => ({ label: norm(b.textContent), open: b.getAttribute('aria-expanded') === 'true' }));
  X.side = () => {
    const out = [], seen = {};
    document.querySelectorAll(C.side + ' ' + C.sideItem.split(',').join(', ' + C.side + ' ')).forEach((a) => {
      if (a.matches(C.sideSkip) || !shown(a)) return;
      const label = labelOf(a); if (!label) return;
      const id = label + (seen[label] ? '#' + seen[label] : ''); seen[label] = (seen[label] || 0) + 1;
      out.push({ id, label, key: a.dataset.key || '', href: a.getAttribute('href') || '', on: a.classList.contains('on') || a.getAttribute('aria-current') === 'page' || a.getAttribute('aria-current') === 'true', sw: a.matches(C.spaceSwitch), self: a.matches(C.selfItem) });
      a.__d6id = id;
    });
    return out;
  };
  /* ── أشرطةُ التبويبات داخل الصفحة: كلُّ عنصرٍ يحمل role=tab / aria-selected / aria-current أو يسكن شريطاً معروفاً — مجموعاً بحاويته ── */
  const isSel = (e) => e.getAttribute('aria-selected') === 'true' || e.getAttribute('data-on') === 'true' || e.getAttribute('data-on') === '1' || ['page', 'true', 'step', 'location'].includes(e.getAttribute('aria-current')) || e.getAttribute('aria-pressed') === 'true' && e.matches(C.tabPressed) || !!(C.tabOnMark && [...e.querySelectorAll(C.tabOnMark)].some(lit));
  X.strips = () => {
    const m = mainEl(); if (!m) return [];
    const groups = new Map();
    m.querySelectorAll(C.tab).forEach((e) => {
      if (e.matches(C.tabSkip) || e.closest(C.tabSkipIn) || !vis(e)) return;
      const label = norm(e.getAttribute('aria-label') || e.textContent); if (!label || label.length > 60) return;
      const box = e.closest(C.tabBox) || e.parentElement;
      if (!groups.has(box)) groups.set(box, []);
      groups.get(box).push({ e, label });
    });
    const out = [];
    groups.forEach((items, box) => {
      const marked = items.some((x) => x.e.hasAttribute('aria-selected') || x.e.hasAttribute('aria-current') || x.e.hasAttribute('aria-pressed') || x.e.hasAttribute('data-on')) || items.some((x) => isSel(x.e));
      const st = { id: items.map((x) => x.label).join(' | '), seg: !!(C.tabNoAddr && box.matches(C.tabNoAddr)), name: norm(box.getAttribute('aria-label') || ''), marked, items: items.map((x, i) => { x.e.__d6tab = i; return { label: x.label, sel: isSel(x.e), dis: x.e.disabled === true || x.e.getAttribute('aria-disabled') === 'true' }; }) };
      box.__d6strip = st.id; out.push(st);
    });
    return out;
  };
  /* كلُّ فعلٍ (نقرٌ أو عنوان) يضع علامة: الاستقرارُ بعده ينتظر أولَ تحوّلٍ في الصفحة (أو مهلةً قصيرة إن لم يغيّر الفعلُ شيئاً) */
  X.act = () => { X.mark = performance.now(); X.moved = false; };
  X.go = (h) => { X.act(); if (location.hash === h) return false; location.hash = h; return true; };
  X.click = (kind, a, b) => {
    X.act();
    if (kind === 'head') { const b = [...document.querySelectorAll(C.side + ' ' + C.sideExpand)].find((e) => shown(e) && norm(e.textContent) === a); if (!b) return false; if (b.getAttribute('aria-expanded') !== 'true') b.click(); return true; }
    if (kind === 'side') { X.side(); const el = [...document.querySelectorAll(C.side + ' *')].find((e) => e.__d6id === a && shown(e)); if (!el) return false; el.click(); return true; }
    if (kind === 'tab') { X.strips(); const m = mainEl(), box = m && [...m.querySelectorAll('*')].find((e) => e.__d6strip === a); if (!box) return false; const el = [...box.querySelectorAll('*')].find((e) => e.__d6tab != null && norm(e.getAttribute('aria-label') || e.textContent) === b && vis(e)); if (!el) return false; el.click(); return true; }
    return false;
  };
  /* ── ما لا يجوز ظهورُه (من نظامٍ مطفأ): رابطٌ جانبي · تبويب · عنوانُ الصفحة — يُفحص مع كل تحوّل ── */
  const scan = () => {
    X.last = performance.now(); X.moved = true;
    const D = X.dyn, offK = D.offKeys || [], offL = D.offLabels || [], hit = (kind, what) => { const k = kind + '|' + what + '|' + location.hash; if (X.off.length < 60 && !X.off.some((o) => o.k === k)) X.off.push({ k, kind, what, hash: location.hash, t: Math.round(performance.now()) }); };
    const sideNow = [];
    document.querySelectorAll(C.side + ' ' + C.sideItem.split(',').join(', ' + C.side + ' ')).forEach((a) => {
      if (a.matches(C.sideSkip) || !vis(a)) return;
      const l = labelOf(a); if (!l) return; sideNow.push(l);
      if ((a.dataset.key && offK.includes(a.dataset.key)) || offL.includes(l)) hit('side', l);
    });
    const m = mainEl(), tabsNow = [], scrNow = [];
    if (m) {
      m.querySelectorAll(C.tab).forEach((e) => { if (e.matches(C.tabSkip) || e.closest(C.tabSkipIn) || !vis(e)) return; const l = norm(e.getAttribute('aria-label') || e.textContent); if (!l || l.length > 60) return; tabsNow.push(l); if (offL.includes(l) && !(D.offAllowed || []).some((r) => new RegExp(r).test(location.hash))) hit('tab', l); });
      m.querySelectorAll(C.screen).forEach((e) => { if (vis(e)) scrNow.push(e.getAttribute('data-screen-label') || e.id || e.className); });
    }
    if (X.cold.on) { const t = Math.round(performance.now()); sideNow.forEach((l) => { X.cold.side[l] = X.cold.side[l] || t; }); tabsNow.forEach((l) => { X.cold.tab[l] = X.cold.tab[l] || t; }); scrNow.forEach((l) => { X.cold.screen[l] = X.cold.screen[l] || t; }); }
  };
  const start = () => { new MutationObserver(scan).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-selected', 'aria-current'], characterData: true }); scan(); };
  start();
  /* ── استقرار: لا قراءةَ جارية · لا هيكلَ تحميل · هدأ الـDOM ── */
  X.loading = () => { const m = mainEl(); if (!m) return ['no-main']; const out = []; m.querySelectorAll(C.loading).forEach((e) => { if (vis(e) && !e.querySelector(C.failed) && !e.matches(C.failed)) out.push(norm(e.className || e.tagName).slice(0, 40)); }); [...m.querySelectorAll('[role=status], .p44-empty, span, p, div, b')].forEach((e) => { if (e.childElementCount === 0 && new RegExp(C.loadingText).test(e.textContent) && vis(e)) out.push('«' + norm(e.textContent).slice(0, 40) + '»'); }); return out; };
  X.settled = (quiet) => (X.mark == null || X.moved || performance.now() - X.mark > C.idleMs) && !!mainEl() && !!document.querySelector(C.side) && X.fly === 0 && performance.now() - X.last >= quiet && X.loading().length === 0;
  /* ── لقطةُ الصفحة المعروضة ── */
  X.snap = () => {
    const m = mainEl(), strips = X.strips(), D = X.dyn, offL = D.offLabels || [];
    let text = '', stripText = 0, media = 0, leftovers = [], fails = [], alerts = [], screens = [];
    if (m) {
      text = norm(m.innerText);
      m.querySelectorAll(C.tabBox).forEach((b) => { if (vis(b)) stripText += norm(b.innerText).length; });
      media = [...m.querySelectorAll('canvas, table, img, input, select, textarea, video, svg')].filter((e) => { if (!vis(e)) return false; const r = e.getBoundingClientRect(); return e.tagName.toLowerCase() !== 'svg' || (r.width >= 120 && r.height >= 60); }).length;
      m.querySelectorAll(C.failed).forEach((e) => { if (vis(e)) fails.push(norm(e.innerText).slice(0, 140)); });
      m.querySelectorAll('[role=alert]').forEach((e) => { if (vis(e) && !e.matches(C.failed)) alerts.push(norm(e.innerText).slice(0, 140)); });
      m.querySelectorAll(C.screen).forEach((e) => { if (vis(e)) screens.push(e.getAttribute('data-screen-label') || ''); });
      if (offL.length && !(D.offAllowed || []).some((r) => new RegExp(r).test(location.hash))) {
        m.querySelectorAll(C.leftover).forEach((e) => { const own = norm([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')) || (e.childElementCount <= 2 ? norm(e.textContent) : ''); if (own && offL.includes(own) && (e.tagName === 'OPTION' ? shown(e.parentElement) : vis(e)) && !e.matches(C.tab)) leftovers.push(e.tagName.toLowerCase() + '«' + own + '»'); });
      }
    }
    const crumbs = [...document.querySelectorAll(C.crumb)].filter(vis).map((e) => norm(e.textContent)).filter(Boolean);
    const dialogs = [...document.querySelectorAll(C.dialog)].filter(vis).map((e) => norm(e.getAttribute('aria-label') || e.innerText).slice(0, 80));
    return { hash: location.hash, side: X.side(), strips, textLen: text.length, contentLen: Math.max(0, text.length - stripText), media, head: text.slice(0, 120), fails, alerts, screens, crumbs, leftovers: [...new Set(leftovers)], dialogs, loading: X.loading(), flying: X.what.slice(), off: X.off.splice(0), wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  };
  X.closeDialogs = () => { let n = 0; document.querySelectorAll(C.dialog).forEach((d) => { if (!vis(d)) return; const b = [...d.querySelectorAll('button, [role=button]')].find((e) => new RegExp(C.dialogClose).test(norm(e.getAttribute('aria-label') || e.textContent)) && vis(e)); if (b) { b.click(); n++; } }); return n; };
  X.setDyn = (d) => { X.dyn = d || {}; try { sessionStorage.setItem('__d6', JSON.stringify(X.dyn)); } catch (e) { /* خاص */ } };
};

/* ══ العالَم: خادمٌ واحد ومتصفحٌ واحد لكل الحالات — الحساباتُ تُبذَر مرة (TEST_ONLY) وتدخل مرة ══ */
export async function makeWorld(SPECIAL) {
  const lab = await startLab();
  const U = readK(lab, 'bassam_auth_users_v1'), ph = U.find((x) => x.id === 'TEST_ONLY_mgrA').ph;
  U.push(
    { id: 'TEST_ONLY_d6_gm', un: UN.gm, name: 'TEST_ONLY مدير عام', role: 'gm', gid: UNITS.G, ekey: 'gm:' + UNITS.G, ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_d6_sec', un: UN.sec, name: 'TEST_ONLY مدير قسم أ١', role: 'staff', deptId: UNITS.S1, ekey: 'mgr:' + UNITS.S1, mgr: 1, ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_d6_emp2', un: UN.empRole, name: 'TEST_ONLY موظف أ٢', role: 'staff', deptId: UNITS.A, ekey: 'TEST_ONLY_eA2', ph, mc: 0, dis: 0 });
  await putK(lab, 'bassam_auth_users_v1', U);
  const browser = await chromium.launch();
  const W = { lab, browser, SPECIAL, sessions: new Map(), cat: null, nfMap: nfMapOf(), timing: [], notes: [] };
  return W;
}
export async function closeWorld(W) { try { await W.browser.close(); } finally { await W.lab.close(); } }

/* خريطةُ «نوع/فئة التنبيه ← ورقةُ نظامه» من الخادم المبني نفسِه (NF_CAP · NF_CAP_ID) — القاعدةُ التي يحكم بها الخادم (nfSysOf) */
function nfMapOf() {
  const src = fs.readFileSync(process.env.KIVO_WORKER || new URL('../../workers/_worker.js', import.meta.url).pathname, 'utf8');
  const lit = (name) => { const m = new RegExp('var ' + name + ' = (\\{[^}]*\\});').exec(src); if (!m) throw new Error('d6: ' + name + ' not found in the built worker'); return Function('return ' + m[1])(); };
  return { cat: lit('NF_CAP'), id: lit('NF_CAP_ID') };
}

export async function session(W, acc, viewport) {
  let s = W.sessions.get(acc.key);
  if (!s) {
    const log = [], C = W.SPECIAL.dom;
    s = await openAs(W.browser, W.lab, acc.un, acc.pw, { viewport: viewport || { width: 1366, height: 900 }, onPage: async (page) => {
      await page.addInitScript(PROBE, C);
      page.on('pageerror', (e) => log.push({ kind: 'pageerror', text: String(e.message).slice(0, 300) }));
      page.on('console', (m) => { if (m.type() === 'error') log.push({ kind: 'console', text: m.text().slice(0, 300) }); });
      page.on('response', (r) => { try { const u = new URL(r.url()); if (r.status() >= 400 && u.origin === new URL(W.lab.base).origin) log.push({ kind: 'http', status: r.status(), text: r.request().method() + ' ' + u.pathname + u.search.slice(0, 160) + ' → ' + r.status() }); } catch (e) { /* ليس لنا */ } });
      page.on('request', (r) => { try { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) log.push({ kind: 'req', text: r.method() + ' ' + u.pathname + u.search.slice(0, 400) }); } catch (e) { /* ليس لنا */ } });
    } });
    s.log = log; s.acc = acc; s.page.setDefaultTimeout(15000);
    W.sessions.set(acc.key, s);
  }
  if (viewport) { const v = s.page.viewportSize(); if (!v || v.width !== viewport.width || v.height !== viewport.height) await s.page.setViewportSize(viewport); }
  return s;
}
const QUIET = +(process.env.KIVO_D6_QUIET || 140), SETTLE = +(process.env.KIVO_D6_SETTLE || 12000);
export async function settle(page, ms, quiet) {
  try { await page.waitForFunction((q) => window.__d6 && window.__d6.settled(q), quiet || QUIET, { timeout: ms || SETTLE, polling: 40 }); return true; } catch (e) { return false; }
}
/* بعد إعادة تحميل: الصفحةُ اكتملت · الصلاحيةُ حُسمت · وهدوءٌ أطول (ملفاتُ الصفحة تُحمَّل بلا fetch) */
export async function settleCold(page) {
  try { await page.waitForFunction(() => document.readyState === 'complete' && window.KIVO && KIVO.BassamPerm && KIVO.BassamPerm.ready() && window.__d6 && window.__d6.settled(450), null, { timeout: 30000, polling: 50 }); return true; } catch (e) { return false; }
}

/* ══ فهرسُ الأنظمة من السجلّ وقتَ التشغيل (KIVO.Perm44.sysList · BassamPerm.PAGE_REG · NAV_REG) — لا قائمةَ مكتوبةً باليد ══ */
export async function catalogue(W) {
  if (W.cat) return W.cat;
  const s = await session(W, ACCOUNTS[0]);
  W.cat = await s.page.evaluate(() => {
    const P = KIVO.BassamPerm, sys = KIVO.Perm44.sysList(), leafSys = {};
    sys.forEach((x) => x.leaves.forEach((l) => { leafSys[l] = x.key; }));
    const names = {};   /* اسمٌ معروض ← الأنظمةُ التي تملكه (اسمُ النظام · صفحتُه · تبويباتُه · لوحاتُ مؤشراته) */
    const add = (n, k) => { if (!n || !k) return; (names[n] = names[n] || []).includes(k) || names[n].push(k); };
    sys.forEach((x) => add(x.name, x.key));
    P.PAGE_REG.forEach((p) => { add(p.name, leafSys[p.key]); (p.subs || []).concat(p.tabs || []).forEach((t) => add(t.name, leafSys[p.key + '/' + t.key])); });
    P.NAV_REG.forEach((g) => (g.refs || []).forEach((r) => add((g.names || {})[r], leafSys[r])));
    const nav = {}; sys.forEach((x) => { const n = P.PERM2NAV[x.key]; if (n) nav[x.key] = n; });
    return { sys, leafSys, names, nav, toggle: sys.filter((x) => x.toggle !== false).map((x) => x.key), containers: P.NAV_REG.map((g) => ({ key: g.key, name: g.name, refs: g.refs || [] })), pages: P.PAGE_REG.map((p) => ({ key: p.key, name: p.name, under: p.under || '', nav: p.nav || '' })) };
  });
  return W.cat;
}
/* الإغلاق: نظامٌ مطفأ يطفئ ما يسكنه (under) */
export function closure(cat, keys) {
  const out = new Set(keys); let grew = true;
  while (grew) { grew = false; cat.sys.forEach((x) => { if (x.under && out.has(x.under) && !out.has(x.key)) { out.add(x.key); grew = true; } }); }
  return [...out];
}
/* ما لا يجوز ظهورُه لحسابٍ في حالة: مفاتيحُ الروابط · الأسماءُ التي كلُّ مالكيها مطفأون */
export function forbiddenFor(W, acc, st) {
  const cat = W.cat, off = closure(cat, acc.space === 'center' ? st.plat : st.plat.concat(st.unitOff)), set = new Set(off);
  const labels = Object.keys(cat.names).filter((n) => cat.names[n].every((k) => set.has(k)));
  const keys = off.slice();
  cat.containers.forEach((g) => { if (g.refs.length && g.refs.every((r) => set.has(cat.leafSys[r]))) { keys.push(g.key); labels.push(g.name); } });
  return { off, offKeys: keys, offLabels: [...new Set(labels)], offAllowed: acc.key.startsWith('super') ? W.SPECIAL.offNameAllowed.map((r) => r.source) : [] };
}

/* ══ assertPage — الأحكامُ الخمسة على صفحةٍ معروضة (لقطةٌ واحدة + ما جرى منذ فتحها) ⇒ قائمةُ موجودات (لا ترمي: الحكمُ النهائي لجدول KNOWN_D6) ══ */
export function assertPage({ snap, events, settled, where, benign }) {
  const F = [], add = (rule, detail) => F.push(Object.assign({ rule, detail }, where));
  /* (1) لا صفحة فارغة — ولا تحميلَ لا ينتهي */
  if (!settled) add('loading', 'التحميل لم ينتهِ: ' + (snap.loading.concat(snap.flying).join(' · ') || 'الصفحة لم تهدأ'));
  else if (snap.contentLen < 25 && !snap.media && !snap.fails.length && !snap.alerts.length) add('blank', 'صفحة فارغة: ' + snap.contentLen + ' حرفاً تحت الترويسة' + (snap.head ? ' («' + snap.head.slice(0, 60) + '»)' : ''));
  /* (2) لا شيء من نظامٍ مطفأ: رابط · تبويب · بقيّةٌ في الصفحة */
  snap.off.forEach((o) => add('off', (o.kind === 'side' ? 'رابطٌ جانبي' : 'تبويب') + ' من نظامٍ مطفأ: «' + o.what + '»'));
  snap.leftovers.forEach((l) => add('off', 'بقيّةٌ من نظامٍ مطفأ في الصفحة: ' + l));
  /* (3) لا خطأ في الصفحة ولا طلبٌ مرفوض من فتحها */
  const res = events.filter((e) => e.kind === 'http');
  res.forEach((e) => add('http', e.text));
  events.filter((e) => e.kind === 'pageerror' || (e.kind === 'console' && !/Failed to load resource/.test(e.text))).filter((e) => !benign.some((r) => r.test(e.text))).forEach((e) => add('error', e.kind + ': ' + e.text));
  snap.fails.forEach((t) => add('error', 'بطاقة فشل في الصفحة: «' + t + '»'));
  return F;
}

/* ══ walkAccount — يفتح كلَّ بندٍ في القائمة الجانبية وكلَّ تبويبٍ داخل كل صفحة (مكتشَفةً من الـDOM) ويحكم على كلٍّ بـassertPage ══ */
export async function walkAccount(W, acc, st, viewport, opts = {}) {
  const S = W.SPECIAL, t0 = Date.now(), s = await session(W, acc, viewport), p = s.page, F = [], views = [], uncheck = [];
  const where0 = { account: acc.key, state: st.key, viewport: viewport.width };
  const forb = forbiddenFor(W, acc, st);
  /* الموجودةُ تُسجَّل مرةً لكل صفحة وتبويب — وما كان من نظامٍ مطفأ فمرةً لكل صفحة (يُنسب إلى أول عرضٍ ظهر فيه) */
  const push = (list, page, tab) => list.forEach((f) => { const g = Object.assign({}, f, { page, tab: tab || '' }); if (!F.some((x) => x.rule === g.rule && x.page === g.page && (g.rule === 'off' || x.tab === g.tab) && x.detail === g.detail)) F.push(g); });
  /* ── الدخول: المساحةُ المطلوبة ثم إعادةُ تحميلٍ على عنوانٍ يستفزّ الوميض (نظامٌ مطفأ إن وُجد، وإلا تبويبٌ من الإعدادات) ── */
  const active = await p.evaluate(() => KIVO.BassamDepts.active());
  if (active !== acc.unit) { const ok = await p.evaluate((d) => KIVO.BassamDepts.setActive(d), acc.unit); if (ok === false) throw new Error('d6: ' + acc.key + ' cannot enter unit ' + acc.unit); }
  const home = acc.space === 'center' ? S.centerHome : S.unitHome;
  const provoke = acc.space === 'center' ? home : forb.off.map((k) => W.cat.nav[k]).filter(Boolean).map((n) => '#/' + n)[0] || S.flashProbe;
  await p.evaluate(([d, h]) => { window.__d6.setDyn(d); location.hash = h; }, [forb, provoke]);
  let mark = s.log.length;
  await p.reload({ waitUntil: 'domcontentloaded' });
  let ok = await settleCold(p);
  const cold = await p.evaluate(() => { const X = window.__d6; X.cold.on = false; return { cold: X.cold, snap: X.snap(), ready: KIVO.BassamPerm.ready(), active: KIVO.BassamDepts.active() }; });
  if (cold.active !== acc.unit) throw new Error('d6: ' + acc.key + ' is in unit ' + cold.active + ' after reload, wanted ' + acc.unit);
  const ev0 = s.log.slice(mark).filter((e) => e.kind !== 'req');
  push(assertPage({ snap: cold.snap, events: ev0, settled: ok, where: where0, benign: S.benign }), 'إعادة التحميل على ' + provoke);
  /* (4) لا وميض: ما ظهر قبل وصول الصلاحية يبقى بعدها (رابطٌ أو تبويبٌ أو صفحةٌ رُسمت ثم أُزيلت = وميض) */
  const sideEnd = cold.snap.side.map((x) => x.label), tabEnd = cold.snap.strips.flatMap((x) => x.items.map((i) => i.label));
  const flash = [];
  Object.keys(cold.cold.side).forEach((l) => { if (!sideEnd.includes(l)) flash.push('رابطٌ جانبي «' + l + '» ظهر ثم اختفى'); });
  Object.keys(cold.cold.tab).forEach((l) => { if (!tabEnd.includes(l)) flash.push('تبويب «' + l + '» ظهر ثم اختفى'); });
  Object.keys(cold.cold.screen).forEach((l) => { if (!cold.snap.screens.includes(l)) flash.push('صفحة «' + l + '» رُسمت ثم أُزيلت'); });
  push(flash.map((d) => Object.assign({ rule: 'flash', detail: d }, where0)), 'إعادة التحميل على ' + provoke);
  if (provoke !== home && forb.off.length && cold.snap.hash === provoke) push([Object.assign({ rule: 'off', detail: 'عنوانُ نظامٍ مطفأ يُفتح: ' + provoke }, where0)], 'إعادة التحميل على ' + provoke);
  /* ── فتحُ عرض: نقرٌ (أو عنوان) ⇒ استقرار ⇒ لقطة ⇒ assertPage ── */
  const view = async (how, page, tab) => {
    mark = s.log.length;
    const did = how.hash ? await p.evaluate((h) => { window.__d6.go(h); return true; }, how.hash) : await p.evaluate(([k, a, b]) => window.__d6.click(k, a, b), [how.kind, how.a, how.b || '']);
    if (!did) { push([Object.assign({ rule: 'walk', detail: 'تعذّر النقر: ' + JSON.stringify(how) }, where0)], page, tab); return null; }
    const done = await settle(p);
    const snap = await p.evaluate(() => window.__d6.snap());
    const ev = s.log.slice(mark).filter((e) => e.kind !== 'req');
    push(assertPage({ snap, events: ev, settled: done, where: where0, benign: S.benign }), page, tab);
    if (snap.dialogs.length) {   /* نافذةٌ فتحها البند (المساعدة مثلاً): تُغلق قبل المتابعة — Esc ثم زرُّ إغلاقها */
      await p.evaluate(() => window.__d6.act()); await p.keyboard.press('Escape'); await settle(p, 3000);
      if ((await p.evaluate(() => window.__d6.snap().dialogs.length)) && (await p.evaluate(() => { window.__d6.act(); return window.__d6.closeDialogs(); }))) await settle(p, 3000);
      if (await p.evaluate(() => window.__d6.snap().dialogs.length)) push([Object.assign({ rule: 'walk', detail: 'نافذةٌ لم تُغلق: ' + snap.dialogs.join(' · ') }, where0)], page, tab);
    }
    views.push({ page, tab: tab || '', hash: snap.hash, sel: snap.strips.filter((x) => x.marked).map((x) => (x.items.find((i) => i.sel) || {}).label || '').filter(Boolean), ms: 0 });
    if (views.length > S.maxViews) throw new Error('d6: ' + acc.key + ' walk exceeds ' + S.maxViews + ' views — tighten SPECIAL.dom.tabSkip');
    return snap;
  };
  const seenStrips = new Set();
  const walkStrips = async (page, path, snap, depth) => {
    /* أشرطةُ هذا العرض الجديدة تُحجز كلُّها أولاً (فلا يمشيها عرضٌ أعمق) ثم تُمشى الأعمقُ أولاً: شريطٌ يسكن التبويبَ المعروض قبل أن يُغادَر تبويبُه */
    const mine = snap.strips.filter((x) => !seenStrips.has(page + '§' + x.id)); mine.forEach((x) => seenStrips.add(page + '§' + x.id));
    for (const strip of mine.reverse()) {
      if (!strip.marked) uncheck.push(page + ' › ' + strip.id);
      const cur = strip.items.find((i) => i.sel), byHash = new Map(cur ? [[snap.hash, cur.label]] : []);
      for (const item of strip.items) {
        if (item.sel || item.dis) continue;
        const tab = (path ? path + ' › ' : '') + item.label;
        const v = await view({ kind: 'tab', a: strip.id, b: item.label }, page, tab); if (!v) continue;
        /* (5) العنوانُ يطابق التبويب المعروض: التبويبُ المنقور هو المعروض · ولا تبويبان بعنوانٍ واحد */
        const now = v.strips.find((x) => x.id === strip.id);
        if (strip.marked && now && !(now.items.find((i) => i.label === item.label) || {}).sel && !forb.offLabels.includes(item.label)) push([Object.assign({ rule: 'addr', detail: 'نقرُ التبويب «' + item.label + '» لا يعرضه (المعروض: «' + ((now.items.find((i) => i.sel) || {}).label || '—') + '» · العنوان ' + v.hash + ')' }, where0)], page, tab);
        else if (!strip.seg && byHash.has(v.hash) && byHash.get(v.hash) !== item.label) push([Object.assign({ rule: 'addr', detail: 'التبويب «' + item.label + '» معروضٌ بعنوان التبويب «' + byHash.get(v.hash) + '» نفسِه (' + v.hash + ')' }, where0)], page, tab);
        else byHash.set(v.hash, item.label);
        if (depth < S.maxDepth) await walkStrips(page, tab, v, depth + 1);
      }
    }
  };
  /* ── القائمة الجانبية: البنودُ الظاهرة ثم بنودُ كل مجموعةٍ مطويّة (تُفتح مجموعتُها أولاً) — يُنقر كلُّ بند ── */
  const side = [], heads = await p.evaluate(() => window.__d6.heads());
  (await p.evaluate(() => window.__d6.side())).forEach((x) => side.push(Object.assign(x, { head: '' })));
  for (const h of heads) {
    if (!(await p.evaluate((l) => window.__d6.click('head', l), h.label))) continue;
    await settle(p, 3000);
    (await p.evaluate(() => window.__d6.side())).forEach((x) => { if (!side.some((y) => y.id === x.id)) side.push(Object.assign(x, { head: h.label })); });
  }
  const walkSide = side.filter((x) => !x.sw && !x.self).concat(side.filter((x) => !x.sw && x.self));   /* «صفحتي» آخراً: فتحُها من المركز يغادره */
  if (!walkSide.length) push([Object.assign({ rule: 'walk', detail: 'لا بنودَ في القائمة الجانبية' }, where0)], '(القائمة الجانبية)');
  for (const item of walkSide) {
    if (opts.only && !opts.only.test(item.label)) continue;
    if (item.head && !(await p.evaluate((id) => window.__d6.side().some((x) => x.id === id), item.id))) { await p.evaluate((l) => window.__d6.click('head', l), item.head); await settle(p, 3000); }
    const snap = await view({ kind: 'side', a: item.id }, item.label); if (!snap) continue;
    /* (5) البندُ المنقور هو المعلَّم في القائمة (حيث تعلّم القائمةُ بندَها) */
    const onNow = snap.side.filter((x) => x.on).map((x) => x.label);
    if (!item.self && !snap.dialogs.length && onNow.length && !onNow.includes(item.label)) push([Object.assign({ rule: 'addr', detail: 'البندُ المنقور «' + item.label + '» ليس المعلَّم في القائمة (المعلَّم: «' + onNow.join('، ') + '» · العنوان ' + snap.hash + ')' }, where0)], item.label);
    await walkStrips(item.label, '', snap, 0);
  }
  /* ── عناوينُ لا يصلها بندٌ ولا تبويب (جدول SPECIAL.extraPages) ── */
  for (const x of (S.extraPages[acc.key] || [])) {
    if (opts.only && !opts.only.test(x)) continue;
    const snap = await view({ hash: x }, x); if (snap) await walkStrips(x, '', snap, 0);
  }
  /* ── (5) الرابطُ العميق: كلُّ عنوانِ تبويبٍ سُجّل يُفتح من جديد فيعرض التبويبَ نفسَه ── */
  if (opts.deep) {
    const uniq = new Map(); views.forEach((v) => { if (v.sel.length && !uniq.has(v.hash)) uniq.set(v.hash, v); });
    const list = [...uniq.values()].reverse();
    for (const v of list) {
      mark = s.log.length;
      await p.evaluate((h) => { window.__d6.go(h); }, v.hash); const done = await settle(p);
      const snap = await p.evaluate(() => window.__d6.snap());
      const sel = snap.strips.filter((x) => x.marked).map((x) => (x.items.find((i) => i.sel) || {}).label || '').filter(Boolean);
      if (!done) push([Object.assign({ rule: 'loading', detail: 'الرابط العميق ' + v.hash + ' لم يستقرّ' }, where0)], v.page, v.tab);
      else if (snap.hash !== v.hash || JSON.stringify(sel) !== JSON.stringify(v.sel)) push([Object.assign({ rule: 'addr', detail: 'الرابط العميق ' + v.hash + ' يعرض ' + JSON.stringify(sel) + ' بعنوان ' + snap.hash + ' — والمسجَّل ' + JSON.stringify(v.sel) }, where0)], v.page, v.tab);
    }
  }
  /* ── (2) التنبيهاتُ والعدّاد: لا تنبيهَ من نظامٍ مطفأ في القائمة ولا في الجرس، والعدّادُ لا يحسبه ── */
  const nf = await notifOf(W, s, acc, forb);
  push(nf.findings.map((d) => Object.assign({ rule: 'off', detail: d }, where0)), '(التنبيهات)');
  /* ما جرى على الخادم من قراءاتٍ لمورد نظامٍ مطفأ (قطعةٌ محقونةٌ حيّة) */
  const offRes = offReads(W, s.log, forb);
  push(offRes.map((d) => Object.assign({ rule: 'off', detail: d }, where0)), '(الطلبات)');
  s.log.length = 0;
  const ms = Date.now() - t0;
  return { account: acc.key, state: st.key, viewport: viewport.width, views, findings: F, ms, side: walkSide.map((x) => x.label), unmarked: [...new Set(uncheck)], notif: nf.seen };
}

/* التنبيهات: قائمةُ الخادم والجرسُ في الصفحة — نظامُ كلِّ تنبيهٍ من خريطة الخادم نفسِها */
async function notifOf(W, s, acc, forb) {
  const cat = W.cat, sysOf = (type, c) => { const leaf = W.nfMap.id[type] || W.nfMap.cat[c]; const k = leaf && cat.leafSys[leaf]; return k && cat.toggle.includes(k) ? k : ''; };
  const r = await s.api('/api/notifications' + (acc.key.startsWith('super') ? '?dept=' + acc.unit : ''));
  const rows = (r.j && (r.j.items || r.j.rows)) || [], out = [];
  if (r.status !== 200) out.push('قائمة التنبيهات: ' + r.status);
  const bad = rows.filter((x) => forb.off.includes(sysOf(x.type, x.category || x.cat || x.k)));
  bad.forEach((x) => out.push('تنبيهٌ من نظامٍ مطفأ في القائمة: ' + x.type));
  const bell = await s.page.evaluate(() => { try { return KIVO.BassamNotif.list().map((x) => ({ type: x.type, k: x.k || x.cat || x.category || '' })); } catch (e) { return null; } });
  (bell || []).filter((x) => forb.off.includes(sysOf(x.type, x.k))).forEach((x) => out.push('تنبيهٌ من نظامٍ مطفأ في الجرس: ' + x.type));
  return { findings: [...new Set(out)], seen: { list: rows.length, bell: bell ? bell.length : -1, types: [...new Set(rows.map((x) => x.type))] } };
}
/* طلبٌ لمورد يملكه نظامٌ مطفأ (من عقده contract.json: owns) — دليلُ قطعةٍ محقونةٍ ما زالت حيّة */
let OWNS = null;
function ownsMap() {
  if (OWNS) return OWNS; OWNS = {};
  const root = (process.env.KIVO_SRC || new URL('../../src', import.meta.url).pathname) + '/systems';
  for (const d of fs.readdirSync(root)) { const f = root + '/' + d + '/contract.json'; if (!fs.existsSync(f)) continue; try { (JSON.parse(fs.readFileSync(f, 'utf8')).owns || []).forEach((k) => { OWNS[k] = d; }); } catch (e) { /* عقدٌ لا يُقرأ: يتولاه فحصُ العزل */ } }
  return OWNS;
}
function offReads(W, log, forb) {
  const owns = ownsMap(), out = new Set();
  log.filter((e) => e.kind === 'req' && /^GET \/api\/get\?/.test(e.text)).forEach((e) => { let q = ''; try { q = decodeURIComponent(e.text); } catch (x) { q = e.text; } Object.keys(owns).forEach((k) => { if (forb.off.includes(owns[k]) && new RegExp('[:=,]' + k + '(?:[,&:]|$)').test(q)) out.add('قراءةُ مورد نظامٍ مطفأ: ' + k + ' (' + owns[k] + ')'); }); });
  return [...out];
}

/* ══ بناءُ الحالة بحفظٍ حقيقي: مديرُ المنصة يضبط مفاتيحَ الأنظمة في شاشتها ثم «مراجعة وحفظ» — والهدفُ معلنٌ (أيُّ وحدةٍ ما المطفأ فيها) فيُبلَغ من أي حالةٍ سابقة ══ */
export async function buildState(W, st) {
  const S = W.SPECIAL, t0 = Date.now(), cat = await catalogue(W), s = await session(W, ACCOUNTS[0], { width: 1366, height: 900 }), p = s.page;
  const targets = [['__plat', st.plat], [UNITS.G, []], [UNITS.B, []], [UNITS.A, st.unitOff], [UNITS.S1, []]];
  let saves = 0;
  for (const [unit, off] of targets) {
    if (process.env.KIVO_D6_SAVE === 'model') { saves += await saveByModel(p, unit, off, cat); continue; }
    await p.evaluate((h) => { window.__d6.go(h); }, S.save.addr(unit === '__plat' ? UNITS.A : unit)); await settle(p);
    /* الوحدةُ المقصودة تُختار صراحةً (الشاشةُ تتذكّر آخرَ وحدةٍ اختيرت) */
    const chip = S.save.unitPick(p, unit === '__plat' ? S.save.platName : unitName(W, unit));
    if (await chip.count()) { await p.evaluate(() => window.__d6.act()); await chip.first().click(); await settle(p, 4000); }
    else if (unit === '__plat') throw new Error('d6: the platform row was not found in the systems screen — update SPECIAL.save.unitPick');
    const want = await p.evaluate(([sel, off, names]) => {
      const out = []; document.querySelectorAll(sel).forEach((b) => { const n = b.getAttribute('aria-label') || ''; const k = Object.keys(names).find((x) => names[x] === n); if (!k) return; const on = b.getAttribute('aria-checked') === 'true', goal = !off.includes(k); if (on !== goal && !b.disabled) out.push(n); });
      return out;
    }, [S.save.sw, off, Object.fromEntries(cat.sys.map((x) => [x.key, x.name]))]);
    if (!want.length) continue;
    for (const n of want) await p.locator(S.save.sw + '[aria-label="' + n + '"]').click();
    await p.locator(S.save.review).first().click();
    await p.locator(S.save.dialog).first().waitFor();
    const sent = p.waitForResponse((r) => /\/api\/save\b/.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 });
    await p.locator(S.save.confirm).first().click();
    const r = await sent; if (r.status() !== 200) throw new Error('d6: saving the systems of ' + unit + ' was refused: ' + r.status());
    await p.locator(S.save.dialog).first().waitFor({ state: 'detached' }); await settle(p, 5000); saves++;
  }
  await W.lab.idle();
  /* التحقّق من المخزَّن في الخادم: المطفأ على المنصة · وسقفُ الوحدة كما يحسبه المحرّك بعد إعادة تحميل */
  const plat = (readK(W.lab, 'bassam_platform_v1') || {}).mods || {};
  const gotPlat = (plat.off || []).slice().sort(), wantPlat = st.plat.slice().sort();
  if (JSON.stringify(gotPlat) !== JSON.stringify(wantPlat)) throw new Error('d6: state ' + st.key + ': platform OFF stored ' + JSON.stringify(gotPlat) + ', wanted ' + JSON.stringify(wantPlat));
  await p.evaluate((h) => { location.hash = h; }, S.centerHome); await p.reload({ waitUntil: 'domcontentloaded' }); await settleCold(p);
  const eff = await p.evaluate((U) => Object.fromEntries(U.map((u) => [u, KIVO.Perm44.ceiling(u).on])), [UNITS.G, UNITS.A, UNITS.B, UNITS.S1]);
  const tog = cat.toggle, offNow = (u) => tog.filter((k) => !eff[u].includes(k)).sort();
  /* المطلوبُ إطفاؤه مطفأٌ فعلاً، ولا يُطفأ غيرُ ما يتبعه (under): explicit ⊆ المطفأ ⊆ closure */
  const within = (u, explicit) => { const now = offNow(u), max = closure(cat, explicit); return explicit.filter((k) => tog.includes(k)).every((k) => now.includes(k)) && now.every((k) => max.includes(k)); };
  for (const [u, w] of [[UNITS.A, st.unitOff.concat(st.plat)], [UNITS.S1, st.unitOff.concat(st.plat)], [UNITS.B, st.plat], [UNITS.G, st.plat]]) if (!within(u, w)) throw new Error('d6: state ' + st.key + ': unit ' + u + ' has OFF ' + JSON.stringify(offNow(u)) + ', wanted ' + JSON.stringify(w) + ' (and what lives under them)');
  s.log.length = 0;
  return { saves, ms: Date.now() - t0 };
}
function unitName(W, id) { const n = (readK(W.lab, 'bassam_depts_v1') || []).concat(readK(W.lab, 'bassam_gdepts_v1') || []).find((x) => x.id === id); return n ? n.name : id; }
/* بديلٌ صريح (KIVO_D6_SAVE=model): كاتبُ السقف القائم نفسُه من جلسة مدير المنصة — حفظٌ حقيقي عبر الخادم بلا شاشة */
async function saveByModel(p, unit, off, cat) {
  const n = await p.evaluate(([unit, off, sys]) => {
    const P = KIVO.BassamPerm;
    if (unit === '__plat') { const pl = KIVO.BassamPlat.get(), cur = ((pl.mods || {}).off || []).slice().sort(); if (JSON.stringify(cur) === JSON.stringify(off.slice().sort())) return 0; KIVO.BassamPlat.set(Object.assign({}, pl, { mods: Object.assign({}, pl.mods, { off }) })); return 1; }
    const tog = sys.filter((x) => x.toggle !== false), pages = tog.filter((x) => x.leaves[0].indexOf('/') === -1).map((x) => x.key), cap = ['admin', 'emps'].concat(pages.filter((k) => !off.includes(k) && !off.includes((sys.find((x) => x.key === k) || {}).under)));
    P.setDeptCap(unit, cap); P.PAGE_REG.forEach((pg) => { if ((pg.subs || []).length) P.setDeptSubs(unit, pg.key, pg.subs.map((x) => x.key).filter((k) => !(pg.key === 'emps' && k === 'custody' && off.includes('custody')))); if ((pg.tabs || []).length && P.setDeptTabs) P.setDeptTabs(unit, pg.key, pg.tabs.map((x) => x.key)); });
    return 1;
  }, [unit, off, cat.sys]);
  await p.evaluate(() => (KIVO.__BS_SRV && KIVO.__BS_SRV.flushAsync ? KIVO.__BS_SRV.flushAsync(15000) : null));
  return n;
}

/* دورُ الموظف المخصّص (كلُّ نظامٍ يُشغَّل بمستوى «مشاهدة») وتنبيهاتُ الأنظمة — بحفظٍ حقيقي من جلسة مدير المنصة، مرةً واحدة والأنظمةُ كلُّها مفعّلة */
export async function seedRoleAndNotifications(W) {
  const cat = await catalogue(W), s = await session(W, ACCOUNTS[0]), p = s.page;
  const role = await p.evaluate(async ([d, role, keys, ekey]) => {
    const E = KIVO.Perm44, dr = E.draft(d), rec = E.rolesOf(d);
    const sys = {}; keys.forEach((k) => { sys[k] = { lvl: 'view' }; });
    rec.roles = rec.roles.filter((r) => r.id !== role.id).concat([{ id: role.id, name: role.name, sys }]);
    rec.people[ekey] = { role: role.id, ex: [] };
    const r = E.setRoles(dr, d, rec); if (!r.ok) return r;
    return E.commit(dr);
  }, [UNITS.A, ROLE, cat.sys.filter((x) => x.toggle !== false || x.key === 'emps').map((x) => x.key), 'TEST_ONLY_eA2']);
  if (!role || !role.ok) throw new Error('d6: the custom role was not saved: ' + JSON.stringify(role));
  await W.lab.idle();
  const stored = readK(W.lab, 'bsdept:' + UNITS.A + ':bassam_roles_v1');
  if (!stored || !stored.people || (stored.people.TEST_ONLY_eA2 || {}).role !== ROLE.id) throw new Error('d6: the custom role is not stored on the server');
  /* تنبيهٌ من كل نوعٍ يعلنه نظام — للإدارة أ (صاحبُه الموظفان) — عبر نقطة التوليد الواحدة في الخادم */
  const types = await p.evaluate(() => { try { const N = KIVO.BassamNotif, T = (N.types && N.types()) || N.TYPES || N.REG || {}; return (Array.isArray(T) ? T : Object.values(T)).map((x) => ({ id: x.id, k: x.k })); } catch (e) { return []; } });
  const sysOf = (t) => { const leaf = W.nfMap.id[t.id] || W.nfMap.cat[t.k]; const k = leaf && cat.leafSys[leaf]; return k && cat.toggle.includes(k) ? k : ''; };
  const mine = types.filter((t) => sysOf(t));
  const vars = W.SPECIAL.notifVars, sent = { ok: 0, types: [] };
  for (let i = 0; i < mine.length; i += 20) {
    const r = await s.api('/api/notifications/act', { method: 'POST', body: JSON.stringify({ op: 'emit-batch', events: mine.slice(i, i + 20).map((t) => ({ type: t.id, dept: UNITS.A, own: ['TEST_ONLY_eA1', 'TEST_ONLY_eA2'], vars })) }) });
    if (r.status === 200) sent.ok++;
  }
  await W.lab.idle();
  const rows = W.lab.env.DB.q('SELECT type, category, COUNT(*) AS n FROM notification_messages GROUP BY type, category');
  const bySys = {}; rows.forEach((r) => { const k = sysOf({ id: r.type, k: r.category }); if (k) bySys[k] = (bySys[k] || 0) + r.n; });
  W.notifSeed = { declared: mine.length, stored: rows.length, bySys };
  s.log.length = 0;
  return W.notifSeed;
}

/* ══ ج2 · المصدرُ الواحد (أ1): القائمةُ الجانبية الفعلية لكل حساب مقابلَ مصدرها والبطاقات التي تصف الحاملَ نفسَه ══
   (أ) القائمة الفعلية · (ب) «ما يراه المدير» · (ج) «ماذا يرى حامل الدور» · (د) «ما يراه الآن» — ما وُجد منها اليوم (SPECIAL.cards).
   المقارنةُ بالمفاتيح (data-key / data-k، وما لا مفتاحَ له فباسمه عبر أسماء المصدر) ثم بالأسماء المعروضة */
export async function singleSource(W, st, accounts) {
  const S = W.SPECIAL, where0 = { state: st.key, viewport: 1366 }, F = [], rows = [], vp = { width: 1366, height: 900 };
  const menus = {};
  for (const acc of accounts.filter((a) => a.space === 'unit')) {
    const s = await session(W, acc, vp), p = s.page;
    if ((await p.evaluate(() => KIVO.BassamDepts.active())) !== acc.unit) await p.evaluate((d) => KIVO.BassamDepts.setActive(d), acc.unit);
    await p.evaluate((h) => { location.hash = h; }, S.unitHome); await p.reload({ waitUntil: 'domcontentloaded' }); await settleCold(p);
    menus[acc.key] = await p.evaluate(() => { const all = KIVO.BassamPerm.menuFor(); return { side: window.__d6.side().filter((x) => !x.sw && !x.self).map((x) => ({ k: x.key, n: x.label })), model: all.filter((x) => x.on && !x.hid).map((x) => ({ k: x.k, n: x.n })), names: Object.fromEntries(all.map((x) => [x.n, x.k])) }; });
    s.log.length = 0;
  }
  const canon = (L, names) => L.map((x) => x.k || names[x.n] || x.n);
  const cmp = (holder, card, viewer, real, shown, names) => {
    const a = canon(real, names).filter((k) => !S.cards.sideOnly.includes(k)), b = canon(shown, names).filter((k) => !S.cards.cardOnly.includes(k));
    const an = real.map((x) => x.n).filter((n) => !S.cards.sideOnly.includes(n)), bn = shown.map((x) => x.n).filter((n) => !S.cards.cardOnly.includes(n));
    const keys = JSON.stringify(a) === JSON.stringify(b), same = keys && JSON.stringify(an) === JSON.stringify(bn);
    rows.push({ holder, card, viewer, same, keys, real: an, shown: bn });
    if (!keys) F.push(Object.assign({ rule: 'source', account: holder, page: card, tab: 'يعرضها ' + viewer, detail: 'المحتوى يختلف: ' + JSON.stringify(bn) + ' ≠ القائمة الفعلية ' + JSON.stringify(an) }, where0));
    else if (!same) F.push(Object.assign({ rule: 'source', account: holder, page: card, tab: 'يعرضها ' + viewer, detail: 'الأسماء تختلف (المفاتيح متطابقة): ' + JSON.stringify(bn.filter((n, i) => n !== an[i])) + ' ≠ ' + JSON.stringify(an.filter((n, i) => n !== bn[i])) }, where0));
  };
  /* القائمةُ المرسومة = مصدرُها (BassamPerm.menuFor) لكل حساب */
  for (const k of Object.keys(menus)) cmp(k, 'BassamPerm.menuFor()', k, menus[k].side, menus[k].model, menus[k].names);
  for (const c of S.cards.list) {
    for (const v of c.viewers) {
      const acc = ACCOUNTS.find((a) => a.key === v.account); if (!acc || !accounts.includes(acc) || !menus[c.holder]) continue;
      const s = await session(W, acc, vp), p = s.page, miss = (why) => { F.push(Object.assign({ rule: 'source', account: c.holder, page: c.name, tab: 'يعرضها ' + v.account, detail: why + ' (' + v.addr + ') — حدّث SPECIAL.cards إن تغيّرت الشاشة' }, where0)); rows.push({ holder: c.holder, card: c.name, viewer: v.account, same: false, keys: false, real: [], shown: null }); };
      const tg = Date.now(); await p.evaluate((h) => { window.__d6.go(h); }, v.addr); const okg = await settle(p); if (process.env.KIVO_D6_TRACE) console.log('d6 trace go', v.addr, Date.now() - tg, okg);
      if (c.pick) {
        const el = p.locator(S.dom.main).locator(c.pickIn || 'button, [role=option], [role=row], li, a').filter({ has: p.getByText(c.pick, { exact: true }) }).first();
        if (!(await el.count())) { miss('لم يوجد «' + c.pick + '» ليُختار'); s.log.length = 0; continue; }
        const tq = Date.now(); await p.evaluate(() => window.__d6.act()); await el.click(); const okq = await settle(p, 5000); if (process.env.KIVO_D6_TRACE) console.log('d6 trace pick', c.name, v.account, Date.now() - tq, okq, okq ? '' : JSON.stringify(await p.evaluate(() => ({ l: window.__d6.loading(), f: window.__d6.what, moved: window.__d6.moved, q: performance.now() - window.__d6.last }))));
      }
      const got = await p.evaluate(([main, heads, item, pick, verify]) => {
        const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim(), m = document.querySelector(main); if (!m) return { err: 'لا صفحة' };
        const h = [...m.querySelectorAll('h1, h2, h3, h4, h5, .p44-cap, legend, [role=heading]')].find((e) => e.getBoundingClientRect().width > 2 && heads.some((t) => norm(e.textContent).indexOf(t) !== -1)); if (!h) return { err: 'البطاقة غير موجودة' };
        let box = h.parentElement, list = null; for (let i = 0; i < 3 && box && !(list = box.querySelector('ul, ol, [role=list]')); i++) box = box.parentElement; if (!list) return { err: 'البطاقة بلا قائمة' };
        if (pick && verify) { const v = m.querySelector(verify); if (!v || norm(v.textContent).indexOf(pick) === -1) return { err: 'البطاقة ليست لـ«' + pick + '»' }; }
        return { items: [...list.querySelectorAll(item)].map((li) => ({ k: li.getAttribute('data-k') || li.getAttribute('data-key') || '', n: norm((li.querySelector('span') || li).textContent) })) };
      }, [S.dom.main, [].concat(c.heading), S.cards.item, c.pick || '', c.verify || '']);
      if (got.err) miss(got.err); else cmp(c.holder, c.name, v.account, menus[c.holder].side, got.items, menus[c.holder].names);
      s.log.length = 0;
    }
  }
  return { findings: F, rows };
}

/* ══ الحكم: كلُّ موجودةٍ إمّا في جدول KNOWN_D6 أو تُسقط الاختبار — وكلُّ مدخلٍ في الجدول لم يتكرر في خانةٍ من نطاقه يُسقطه أيضاً (مدخلٌ بائد) ══ */
const inList = (v, list) => list == null || list === '*' || (Array.isArray(list) ? list.includes(v) : list === v);
const re = (r, v) => r == null || r.test(String(v || ''));
export function matchKnown(f, K) { return inList(f.rule, K.rule) && inList(f.account, K.accounts) && inList(f.state, K.states) && inList(f.viewport, K.viewports) && re(K.page, f.page) && re(K.tab, f.tab) && re(K.detail, f.detail); }
export function judge(findings, KNOWN, cells) {
  const unknown = [], hits = new Map(KNOWN.map((k) => [k.id, new Set()]));
  for (const f of findings) { const ks = KNOWN.filter((k) => matchKnown(f, k)); if (!ks.length) unknown.push(f); ks.forEach((k) => hits.get(k.id).add(f.account + '|' + f.state + '|' + f.viewport)); f.known = ks.map((k) => k.id); }
  const stale = [];
  for (const k of KNOWN) {
    const part = [].concat(k.rule).every((r) => r === 'source') ? 'source' : 'walk';
    const scope = cells.filter((c) => c.part === part && inList(c.account, k.accounts) && inList(c.state, k.states) && inList(c.viewport, k.viewports));
    const miss = scope.filter((c) => !hits.get(k.id).has(c.account + '|' + c.state + '|' + c.viewport));
    if (scope.length && miss.length && !k.some) stale.push({ id: k.id, miss: miss.map((c) => c.account + '·' + c.state + '·' + c.viewport) });
    if (scope.length && k.some && miss.length === scope.length) stale.push({ id: k.id, miss: ['(لا خانة)'] });
  }
  return { unknown, stale };
}
export const fmt = (f) => '[' + f.rule + '] ' + f.account + ' · ' + f.state + ' · ' + f.viewport + ' · ' + f.page + (f.tab ? ' › ' + f.tab : '') + ' — ' + f.detail;

/* ══ المِجسُّ يعضّ: خللٌ مزروعٌ من كل نوع (في صفحة الاختبار وحدها) يجب أن يلتقطه assertPage — فلا يكون حكمٌ فارغاً ══ */
export async function selfCheck(W, acc) {
  const S = W.SPECIAL, s = await session(W, acc, { width: 1366, height: 900 }), p = s.page, got = {}, where = { account: acc.key, state: 'self', viewport: 1366 };
  const judgeNow = async (mark, settled = true) => assertPage({ snap: await p.evaluate(() => window.__d6.snap()), events: s.log.slice(mark).filter((e) => e.kind !== 'req'), settled, where, benign: S.benign });
  await p.evaluate((h) => { window.__d6.setDyn({}); window.__d6.go(h); }, S.unitHome); await settle(p);
  /* (4) وميض: رابطٌ يُزرع في القائمة لحظةَ رسمها ثم يُزال */
  await p.evaluate((side) => sessionStorage.setItem('__d6_plant', side), S.dom.side);
  await p.addInitScript(() => { let side = ''; try { side = sessionStorage.getItem('__d6_plant') || ''; sessionStorage.removeItem('__d6_plant'); } catch (e) { side = ''; } if (!side) return; const mo = new MutationObserver(() => { const nav = document.querySelector(side + ' nav'); if (!nav || !nav.querySelector('a')) return; mo.disconnect(); const a = document.createElement('a'); a.className = 'n'; a.setAttribute('role', 'link'); a.textContent = 'TEST_ONLY وميض'; nav.appendChild(a); setTimeout(() => a.remove(), 120); }); mo.observe(document, { childList: true, subtree: true }); });
  await p.reload({ waitUntil: 'domcontentloaded' }); await settleCold(p);
  const cold = await p.evaluate(() => { const X = window.__d6; X.cold.on = false; return { seen: Object.keys(X.cold.side), end: X.side().map((x) => x.label) }; });
  got.flash = cold.seen.includes('TEST_ONLY وميض') && !cold.end.includes('TEST_ONLY وميض');
  /* (2) مطفأ: أولُ رابطٍ في القائمة يُعلَن ممنوعاً */
  let mark = s.log.length;
  const first = await p.evaluate(() => { const X = window.__d6, it = X.side().find((x) => x.key); if (!it) return ''; X.setDyn({ offKeys: [it.key], offLabels: [it.label] }); document.body.setAttribute('data-d6', '1'); document.body.classList.toggle('d6-self'); return it.label; });
  await p.waitForTimeout(60);
  got.off = !!first && (await judgeNow(mark)).some((f) => f.rule === 'off' && f.detail.includes(first));
  await p.evaluate(() => window.__d6.setDyn({}));
  /* (3) طلبٌ مرفوض وخطأُ صفحة */
  mark = s.log.length;
  await p.evaluate(async () => { await fetch('/api/TEST_ONLY_d6_missing').catch(() => null); setTimeout(() => { throw new Error('TEST_ONLY d6 probe'); }, 0); });
  await p.waitForTimeout(150);
  const f3 = await judgeNow(mark); got.http = f3.some((f) => f.rule === 'http' && /TEST_ONLY_d6_missing/.test(f.detail)); got.error = f3.some((f) => f.rule === 'error' && /TEST_ONLY d6 probe/.test(f.detail));
  /* (1) تحميلٌ لا ينتهي · صفحةٌ فارغة */
  mark = s.log.length;
  got.loading = (await judgeNow(mark, false)).some((f) => f.rule === 'loading');
  await p.addStyleTag({ content: S.dom.main + ' > * { display: none !important; }' });
  got.blank = (await judgeNow(mark)).some((f) => f.rule === 'blank');
  await p.reload({ waitUntil: 'domcontentloaded' }); await settleCold(p); s.log.length = 0;
  return got;
}
