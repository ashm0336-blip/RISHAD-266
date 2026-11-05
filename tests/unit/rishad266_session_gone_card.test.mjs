/* RISHAD-266 · live finding on Test (c70ab4b): after the server session ended, the screen-level loader card said
   «تعذّر تحميل الشاشة — تحقّق من الاتصال» while the real cause was the ended session (the global notice said so).
   Rule: no false messages. The card now names the real cause and its button signs in again; a connection failure
   keeps the original text and retry. Synthetic DOM, real source (src/core/030-pages-loader.lazy-guard.js). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'src/core/030-pages-loader.lazy-guard.js'), 'utf8');
const RUNTIME = fs.readFileSync(path.join(ROOT, 'src/core/050-dc-runtime.js'), 'utf8');

function el() {
  const kids = {}, attrs = {}, listeners = {};
  const e = {
    className: '', textContent: '', attrs, listeners,
    setAttribute(k, v) { attrs[k] = v; },
    set innerHTML(html) { kids.m = el(); kids.b = el(); kids.m.textContent = (/class="m">([^<]*)/.exec(html) || [])[1] || ''; kids.b.textContent = (/class="b">([^<]*)/.exec(html) || [])[1] || ''; },
    querySelector(sel) { return sel === '.m' ? kids.m : sel === '.b' || sel === 'button' ? kids.b : null; },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    remove() { e.removed = true; },
  };
  return e;
}
function world({ gone }) {
  const winListeners = {}, inserted = [];
  const host = { parentNode: { insertBefore(c) { inserted.push(c); } } };
  const state = { gone, reloaded: 0 };
  const win = {
    __resources: {}, fetch: async () => ({ ok: true }),
    __dcRegistry: { Profile: { html: '', Logic: null, dataError: 'x', subs: new Set([() => {}]), ver: 0 } },
    KIVO: { __BS_SRV: { sesChanged: () => state.gone } },
    addEventListener(t, fn) { (winListeners[t] = winListeners[t] || []).push(fn); },
    dispatch(t, detail) { (winListeners[t] || []).forEach((fn) => fn({ detail })); },
  };
  const context = {
    window: win, document: { createElement: () => el(), querySelector: (s) => (/sc-host/.test(s) ? host : null) },
    location: { reload() { state.reloaded++; } }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {}, Object, JSON, Math,
  };
  vm.createContext(context); vm.runInContext(SRC, context, { filename: '030-pages-loader.lazy-guard.js' });
  return { win, inserted, state };
}

test('connection failure: the card says so in plain words (CORE-01) and retries', () => {
  const W = world({ gone: false });
  W.win.dispatch('dc:page-load-failed', { name: 'Profile' });
  assert.equal(W.inserted.length, 1);
  const c = W.inserted[0];
  assert.equal(c.querySelector('.m').textContent, 'تعذّر عرض هذه الشاشة الآن — سنحاول مجددًا تلقائيًا');
  assert.doesNotMatch(c.querySelector('.m').textContent, /جلس/);
  assert.match(c.querySelector('.b').textContent, /أعد المحاولة/);
  c.querySelector('button').listeners.click[0]();
  assert.equal(W.state.reloaded, 0, 'retry does not reload the page');
});

test('session already ended: the card names the ended session and its button signs in again', () => {
  const W = world({ gone: true });
  W.win.dispatch('dc:page-load-failed', { name: 'Profile' });
  const c = W.inserted[0];
  assert.equal(c.querySelector('.m').textContent, 'انتهت الجلسة — سجّل الدخول');
  assert.doesNotMatch(c.querySelector('.m').textContent, /الاتصال|تعذّر/);
  assert.equal(c.querySelector('.b').textContent, 'تسجيل الدخول');
  c.querySelector('button').listeners.click[0]();
  assert.equal(W.state.reloaded, 1, 'sign-in again = reload to the sign-in gate');
});

test('session ends after the card is shown: the existing card is rewritten to the real cause', () => {
  const W = world({ gone: false });
  W.win.dispatch('dc:page-load-failed', { name: 'Profile' });
  const c = W.inserted[0];
  assert.match(c.querySelector('.m').textContent, /تعذّر عرض هذه الشاشة/);
  W.state.gone = true; W.win.dispatch('bs:session-gone');
  assert.equal(c.querySelector('.m').textContent, 'انتهت الجلسة — سجّل الدخول');
  assert.equal(c.querySelector('.b').textContent, 'تسجيل الدخول');
});

test('runtime placeholder and the storage layer use the same truthful cause', () => {
  assert.match(RUNTIME, /error: r\.dataError \? \(sessionGone\(\) \? "انتهت الجلسة — سجّل الدخول" : r\.dataError\)/);
  assert.match(RUNTIME, /if \(pageContextKey\(name\) !== key \|\| n >= DATA_RETRY_MS\.length \|\| sessionGone\(\)\) throw error;/, 'an ended session is not retried quietly');
  assert.match(RUNTIME, /addEventListener\("bs:session-gone"/);
  const storage = fs.readFileSync(path.join(ROOT, 'src/api/280-server-storage.js'), 'utf8');
  assert.match(storage, /dispatchEvent\(new CustomEvent\("bs:session-gone"\)\)/);
});
