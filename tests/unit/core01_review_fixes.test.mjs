/* RISHAD CORE-01 · independent-review fixes, each pinned on the real source:
   (1) a data read that failed after the quiet retries joins the automatic retry the card promises (every 30 s and on reconnect);
   (2) pull-to-refresh stays on the page only when edits are really unsaved — no false «لم تُحفظ تعديلاتك» after an ended session;
   (3) the shared toast has its own id (bs-stoast), so a page toast (id bs-toast) can never take it over;
   (4) the unit switcher shows its full-path tooltip again while its list is closed (never over the open list). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('(1) failed data read: the screen is retried automatically every 30 s and on reconnect', () => {
  const winL = {}, intervals = [];
  const reg = { Profile: { html: '<x>', Logic: function () {}, dataError: 'SCREEN', fetched: true, subs: new Set([() => { woke++; }]), ver: 0 } };
  let woke = 0;
  const el = () => ({ setAttribute() {}, set innerHTML(v) {}, querySelector: () => ({ addEventListener() {} }), remove() {} });
  const win = { __resources: {}, fetch: async () => ({ ok: true }), __dcRegistry: reg, KIVO: { __BS_SRV: { sesChanged: () => false } },
    addEventListener(t, fn) { (winL[t] = winL[t] || []).push(fn); }, dispatch(t, detail) { (winL[t] || []).forEach((fn) => fn({ detail })); } };
  const host = { parentNode: { insertBefore() {} } };
  const ctx = { window: win, document: { createElement: el, querySelector: (s) => (/sc-host/.test(s) ? host : null) }, location: { reload() {} },
    setTimeout: () => 0, setInterval: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; }, clearInterval() {}, Object, JSON, Math };
  vm.createContext(ctx); vm.runInContext(read('src/core/030-pages-loader.lazy-guard.js'), ctx);
  win.dispatch('dc:page-load-failed', { name: 'Profile' });
  assert.equal(intervals.length, 1, 'the 30 s sweep is armed'); assert.equal(intervals[0].ms, 30000);
  intervals[0].fn();
  assert.equal(reg.Profile.dataError, null, 'the failed read is cleared for a new attempt'); assert.equal(woke, 1, 'the visible screen renders again');
  reg.Profile.dataError = 'SCREEN'; win.dispatch('dc:page-load-failed', { name: 'Profile' }); win.dispatch('online');
  assert.equal(reg.Profile.dataError, null, 'reconnect retries at once'); assert.equal(woke, 2);
});

function pullWorld({ flush, dirty, inflight }) {
  const winL = {}, toasts = [], st = { reloaded: 0 };
  const node = () => ({ style: {}, setAttribute() {}, set innerHTML(v) {}, textContent: '' });
  const box = node();
  const win = { matchMedia: () => ({ matches: true }), navigator: {}, ontouchstart: null, scrollY: 0,
    addEventListener(t, fn) { (winL[t] = winL[t] || []).push(fn); } };
  const ctx = { window: win, location: { reload() { st.reloaded++; } }, Promise, setTimeout,
    KIVO: { bsToast: (m) => toasts.push(m), __BS_SRV: { flushAsync: () => Promise.resolve(flush), dirty: () => dirty, inflight: () => inflight } },
    document: { scrollingElement: { scrollTop: 0 }, documentElement: { style: {} }, querySelector: () => null, activeElement: null, body: { appendChild() {} },
      createElement: () => box, getElementById: () => ({ textContent: '', style: {} }) } };
  ctx.window.KIVO = ctx.KIVO; ctx.window.document = ctx.document;
  vm.createContext(ctx); vm.runInContext(read('src/components/450-pull-refresh.js'), ctx);
  const fire = (t, y) => (winL[t] || []).forEach((fn) => fn({ touches: [{ clientY: y }], target: null }));
  return { pull: async () => { fire('touchstart', 0); fire('touchmove', 300); fire('touchend', 300); await new Promise((r) => setTimeout(r, 10)); }, toasts, st };
}
test('(2) pull-to-refresh: reloads when nothing is unsaved (even if the flush says false); stays only for real unsaved edits', async () => {
  let w = pullWorld({ flush: true, dirty: false, inflight: false }); await w.pull();
  assert.equal(w.st.reloaded, 1, 'saved ⇒ reload'); assert.equal(w.toasts.length, 0);
  w = pullWorld({ flush: false, dirty: false, inflight: false }); await w.pull();
  assert.equal(w.st.reloaded, 1, 'ended session / stuck operation, no edits ⇒ reload, no false message'); assert.equal(w.toasts.length, 0);
  w = pullWorld({ flush: false, dirty: true, inflight: false }); await w.pull();
  assert.equal(w.st.reloaded, 0, 'unsaved edits ⇒ stay'); assert.match(w.toasts[0] || '', /لم تُحفظ تعديلاتك بعد/);
  w = pullWorld({ flush: false, dirty: false, inflight: true }); await w.pull();
  assert.equal(w.st.reloaded, 0, 'a save in flight ⇒ stay');
});

test('(3) the shared toast box has its own id; page toasts keep bs-toast', () => {
  const s = read('src/api/280-server-storage.js');
  assert.match(s, /toastBox9\.id = "bs-stoast"; toastBox9\.className = "bs-toast";/);
  assert.doesNotMatch(s, /\.id = "bs-toast"/);
  assert.match(read('src/components/565-page-kit.js'), /getElementById\("bs-toast"\)/, 'page toasts unchanged');
  assert.match(read('src/layouts/root-logic.js'), /el\.id === 'bs-toast' \|\| el\.id === 'bs-stoast'/, 'both toast boxes are excluded alike');
});

test('(4) unit switcher: full-path tooltip while the list is closed, none while it is open', () => {
  assert.match(read('src/layouts/index.template.html'), /class="s-dept"[^>]*aria-label="\{\{sbDeptTitle\}\}" title="\{\{sbDeptTip\}\}"/);
  const r = read('src/layouts/root-logic.js');
  assert.match(r, /get sbDeptTip\(\) \{ return open \? "" : this\.sbDeptTitle; \}/);
  assert.match(r, /deptOpen: false, deptOpenAria: "false", sbDeptTip: "",/, 'no «undefined» without the unit registry');
});
