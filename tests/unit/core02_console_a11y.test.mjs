/* RISHAD CORE-02 S10 — accessibility and keyboard of «مركز إدارة رشاد» (client only; permissions, routes and server unchanged).
     (1) the drawer (≤1024px, both modes): the burger states aria-expanded, opening it moves the focus to the current page in it, Escape
         closes it after any dialog and gives the focus back to the burger; the unit picker inside closes first; on a desktop the
         expanded operational sidebar is not a drawer and Escape leaves it alone; the collapse control states aria-expanded too;
     (2) the one dialog focus manager also owns .bs-dlg dialogs (the admin page's and the shell's confirmation, backup and broadcast
         dialogs): focus moves in, Tab stays in, focus returns to the opener — and every dialog in the shell and the admin page has a name;
     (3) the focus ring: the global ring (660, !important) reads --focus-ring, so the console sidebar sets --focus-ring to --con-accent —
         the light theme's #7E6530 is about 2.3:1 on the slate surface; the dead per-aside outline rule is gone;
     (4) contrast from the token source: every console text pair ≥4.5:1 and the ring ≥3:1, light and dark, idle, hover and current.
   The real root-logic.js runs in vm over core01_root_world (TEST_ONLY data). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, rd } from './core01_root_world.mjs';

const T = rd('layouts/index.template.html'), R = rd('layouts/root-logic.js'), G = rd('layouts/helmet-global.css');
const V = rd('modules/admin/view.html'), A11Y = rd('components/660-a11y-enhancer.js');
const esc = () => { const e = { key: 'Escape', defaultPrevented: false, isComposing: false, preventDefault() { e.defaultPrevented = true; }, stopPropagation() {} }; return e; };
const mounted = (o) => { const W = world(o); W.c.componentDidMount(); return W; };

test('(1) drawer: aria-expanded, focus into the drawer, Escape closes it and returns to the burger (both modes)', () => {
  assert.match(T, /<button class="bs-btn bs-btn--icon bs-burger" sc-camel-on-click="\{\{toggleSidebar\}\}" title="القائمة" aria-expanded="\{\{burgerExp\}\}">/);
  assert.match(T, /<div class="s-tog2" role="button" tabindex="0" aria-label="\{\{sbToggleTitle\}\}" aria-expanded="\{\{sbExp\}\}"/);
  for (const [hash, active] of [['#/sysadmin/users', 'sysadmin'], ['#/kpis', 'kpis']]) {
    const W = mounted({ hash }); W.ctx.innerWidth = 800; W.c.state.active = active;
    let v = W.vals();
    assert.equal(v.burgerExp, 'false', active + ': closed drawer');
    let focused = 0; W.c._drawerFocus = () => { focused++; };
    v.toggleSidebar();
    assert.equal(W.c.state.sidebarOpen, true); assert.equal(focused, 1, active + ': opening the drawer moves the focus into it');
    assert.equal(W.vals().burgerExp, 'true');
    const e = esc(); W.c._onKeyAny(e);
    assert.equal(W.c.state.sidebarOpen, false, active + ': Escape closes the drawer'); assert.equal(e.defaultPrevented, true);
    /* the unit picker open inside the drawer: Escape is the picker's first */
    W.c.state.sidebarOpen = true; W.c.state.deptOpen = true; W.c._onKeyAny(esc());
    assert.equal(W.c.state.sidebarOpen, true, active + ': the open unit picker closes before the drawer');
  }
  /* a desktop: the expanded operational sidebar is not a drawer */
  const D = mounted({ hash: '#/kpis' }); D.c.state.active = 'kpis'; D.c.state.sidebarOpen = true;
  D.c._onKeyAny(esc()); assert.equal(D.c.state.sidebarOpen, true, 'desktop: Escape leaves the sidebar as it is');
  let f = 0; D.c._drawerFocus = () => { f++; }; D.vals().toggleSidebar(); assert.equal(f, 0, 'desktop collapse moves no focus');
  /* the collapse control on the console states its own expansion */
  const C = mounted({ hash: '#/sysadmin/users' }); C.c.state.active = 'sysadmin';
  assert.equal(C.vals().sbExp, 'true'); C.vals().toggleSidebar(); assert.equal(C.vals().sbExp, 'false');
  assert.match(R, /if \(this\._escDismiss\(\) \|\| this\._drawerEsc\(\)\) ev\.preventDefault\(\); else this\._escMenus\(\);/, 'dialogs first, then the drawer, then menus');
  assert.match(R, /bg\.focus\(\{ preventScroll: true \}\)/, 'focus back to the burger');
});

test('(2) one dialog focus manager owns .bs-dlg; every dialog has a name', () => {
  const W = mounted({ hash: '#/sysadmin/depts' });
  const el = (cls, style = {}) => ({ className: cls, style });
  assert.equal(W.c._ovCand(el('bs-dlg')), true, '.bs-dlg overlay');
  assert.equal(W.c._ovCand(el('bs-dlg bs-dlg--modal')), true);
  assert.equal(W.c._ovCand(el('bs-dlg-box adm-dlg')), false, 'the box itself is not the overlay');
  assert.equal(W.c._ovCand(el('pf-ov')), true, 'the existing overlays still count');
  assert.equal(W.c._ovScope, 'main *, body > *, [data-screen-label="إطار التطبيق"] > .bs-dlg', 'the shell dialogs are in scope');
  assert.equal((R.match(/document\.querySelectorAll\(this\._ovScope\)/g) || []).length, 2, 'Escape and the focus manager search the same scope');
  assert.match(T, /<div dir="rtl" data-screen-label="إطار التطبيق"/, 'the shell root the scope names');
  for (const [nm, src] of [['shell', T], ['admin', V]]) {
    const tags = [...src.matchAll(/<[a-z]+\b[^>]*role="(alert)?dialog"[^>]*>/g)].map((m) => m[0]);
    assert.ok(tags.length > 0, nm + ' has dialogs');
    for (const t of tags) assert.match(t, /aria-label(ledby)?="[^"]+"/, nm + ': named dialog ' + t.slice(0, 90));
    for (const t of tags) { const id = /aria-labelledby="([^"]+)"/.exec(t); if (id) assert.ok(src.includes('id="' + id[1] + '"'), nm + ': ' + id[1] + ' exists'); }
  }
});

test('(3) focus ring on the console surface: --focus-ring is --con-accent there; the global ring reads it', () => {
  assert.match(A11Y, /:focus-visible\{outline:2px solid var\(--focus-ring\)!important/, 'the one global ring');
  assert.match(G, /\.bsb--console\{--focus-ring:var\(--con-accent\)\}/);
  assert.doesNotMatch(G, /\.bsb--console :focus-visible\{outline/, 'no rule the global !important would override');
});

test('(4) contrast of the console pairs from tokens.json (light and dark)', () => {
  const TK = JSON.parse(rd('styles/tokens/tokens.json'));
  const P = Object.fromEntries(TK.primitives.map((x) => [x.name, x.value]));
  const S = Object.fromEntries(TK.semantic.map((x) => [x.name, x.value])), D = Object.fromEntries(TK.dark.map((x) => [x.name, x.value]));
  const res = (v) => { const m = /^var\(--([a-z0-9-]+)\)$/.exec(v); return m ? res(P[m[1]] || S[m[1]]) : v; };
  const rgba = (v) => { v = res(v); let m = /^#([0-9a-f]{6})$/i.exec(v); if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
    m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(v); assert.ok(m, 'colour ' + v); return [+m[1], +m[2], +m[3], +m[4]]; };
  const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
  const lum = (c) => { const l = c.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  for (const th of ['light', 'dark']) {
    const tok = (n) => rgba(th === 'dark' && D[n] ? D[n] : S[n]);
    const bg = tok('con-bg'), hov = over(tok('con-hover'), bg), on = over(tok('con-on'), bg);
    for (const [fg, sur, nm, min] of [['con-fg-muted', bg, 'idle item / heading / exit', 4.5], ['con-fg', hov, 'hover / space label', 4.5], ['con-fg-muted', hov, 'space small line', 4.5],
      ['con-fg', on, 'current item', 4.5], ['con-accent', bg, 'focus ring / rail', 3], ['con-accent', on, 'ring on the current item', 3]]) {
      const r = cr(tok(fg), sur);
      assert.ok(r >= min, th + ': ' + nm + ' ' + r.toFixed(2) + ':1 ≥ ' + min);
    }
    if (th === 'light') assert.ok(cr(rgba(S['focus-ring']), bg) < 3, 'why the override exists: the light theme ring is under 3:1 on slate');
  }
});
