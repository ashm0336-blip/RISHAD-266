/* CORE-01 · step 4 — the shared user-facing strings speak plainly.
   (1) No Arabic string literal in the shared shell / loading / storage / notification files names the server or an
       internal term (الخادم · R2 · D1 · IMG_ · claim · orphan · يتيم · file:line). Comments and code identifiers are not
       user text and are skipped. The notification catalogue rows L(...) in 441 are excluded: the Worker keeps the same
       catalogue (workers/parts/019-notifications.js), so its wording is a data contract outside this step.
   (2) The shell template's visible text has none of them, and no routine «تحديث القائمة» button.
   (3) 130-error-bar (real source in vm): an ordinary user sees one plain line that hides itself; the platform
       administrator (registered through KIVO.bsTechWho) sees the raw message and its place; an unhandled rejection
       goes to the console only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { rd } from './core01_root_world.mjs';

const TECH = /الخادم|\bR2\b|\bD1\b|IMG_|\bclaim|orphan|يتيم|@ ?[\w-]+\.js:/i;
const SHARED = ['core/030-pages-loader.js', 'core/030-pages-loader.lazy-guard.js', 'core/050-dc-runtime.js', 'core/130-error-bar.js',
  'components/240-bassam-link.js', 'components/450-pull-refresh.js', 'components/550-bassam-busy.js', 'layouts/260-bassam-plat.js',
  'layouts/root-logic.js', 'api/280-server-storage.js', 'services/320-dept-storage.js', 'services/441-notif-core.js'];

/* string literals outside comments, with their line */
function strings(src) {
  const out = []; let i = 0, line = 1; const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c, at = line; let s = ''; i++;
      while (i < n && src[i] !== q) { if (src[i] === '\\') { s += src[i] + src[i + 1]; i += 2; continue; } if (src[i] === '\n') line++; s += src[i]; i++; }
      i++; out.push({ line: at, s }); continue;
    }
    if (c === '/') {   /* a regex literal: skip it so its quotes are not read as strings */
      let j = i - 1; while (j >= 0 && /\s/.test(src[j])) j--;
      if (j < 0 || '(,=:[!&|?{};+-*%<>~^'.includes(src[j]) || /\b(return|typeof|case)$/.test(src.slice(Math.max(0, j - 6), j + 1))) {
        i++; let cls = false;
        while (i < n && src[i] !== '\n') { if (src[i] === '\\') { i += 2; continue; } if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; else if (src[i] === '/' && !cls) break; i++; }
        i++; continue;
      }
    }
    i++;
  }
  return out;
}

test('shared user-facing strings name no server or internal term', () => {
  const hits = [];
  let scanned = 0;
  for (const f of SHARED) {
    const src = rd(f), lines = src.split('\n');
    for (const x of strings(src)) {
      if (!/[؀-ۿ]/.test(x.s)) continue;
      if (f === 'services/441-notif-core.js' && /^\s*L\('/.test(lines[x.line - 1])) continue;
      scanned++;
      if (TECH.test(x.s)) hits.push(f + ':' + x.line + ' ' + x.s.slice(0, 90));
    }
  }
  assert.ok(scanned > 300, 'the scanner reads the shared strings (' + scanned + ')');
  assert.deepEqual(hits, []);
});

test('the scanner catches what it must (self-check)', () => {
  const found = strings('const a = "تعذّر الاتصال بالخادم"; /* "الخادم في تعليق" */ const b = x / 2; const c = /"/; const d = \'R2 IMG_x\';').map((x) => x.s);
  assert.deepEqual(found, ['تعذّر الاتصال بالخادم', 'R2 IMG_x']);
  assert.ok(TECH.test(found[0]) && TECH.test(found[1]));
});

test('the shell template shows no server term and no routine refresh button', () => {
  const T = rd('layouts/index.template.html');
  const visible = T.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, ' ').replace(/\{\{[^}]*\}\}/g, ' ');
  assert.doesNotMatch(visible, TECH);
  assert.doesNotMatch(T, /تحديث القائمة/, 'no «تحديث القائمة» button');
  assert.doesNotMatch(T, /toastMsg|toastOn/, 'the shell has one toast (KIVO.bsToast), not a second template toast');
  assert.match(T, /sc-camel-on-click="\{\{nfShowNew\}\}"/, '«عرض الجديد» only inside the open panel');
});

function errorBar({ superUser }) {
  const listeners = {}, timers = [], logs = [];
  let bar = null;
  const doc = { getElementById: (id) => (id === 'bsErrBar' && bar && !bar.removed ? bar : null),
    createElement: () => ({ style: {}, setAttribute() {}, remove() { this.removed = true; } }),
    body: { appendChild(n) { bar = n; } } };
  const W = { document: doc, location: { protocol: 'https:', hostname: 'TEST_ONLY.example' }, KIVO: {},
    console: { warn: (...a) => logs.push(a.map(String).join(' ')) },
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout() {},
    addEventListener: (t, f) => { listeners[t] = f; } };
  W.window = W;
  vm.createContext(W);
  vm.runInContext(fs.readFileSync(new URL('../../src/core/130-error-bar.js', import.meta.url), 'utf8'), W, { filename: '130-error-bar.js' });
  W.KIVO.bsTechWho(() => superUser);
  return { W, listeners, timers, logs, bar: () => bar };
}

test('130 error bar: plain self-hiding line for users, raw detail for the platform administrator, rejections to the console', () => {
  const err = { message: 'TEST_ONLY boom', filename: 'https://x/assets/js/280-server-storage.js', lineno: 42 };
  const U = errorBar({ superUser: false });
  U.listeners.error(err);
  assert.equal(U.bar().textContent, 'حدث خلل غير متوقع — أعد فتح الشاشة');
  assert.doesNotMatch(U.bar().textContent, TECH); assert.doesNotMatch(U.bar().textContent, /TEST_ONLY|انقلها/);
  assert.equal(U.timers.length, 1, 'it hides itself'); U.timers[0].f(); assert.equal(U.bar().removed, true);
  U.listeners.unhandledrejection({ reason: new Error('TEST_ONLY rejected') });
  assert.equal(U.bar().removed, true, 'no bar for an unhandled rejection'); assert.match(U.logs.join('\n'), /TEST_ONLY rejected/);
  const S = errorBar({ superUser: true });
  S.listeners.error(err);
  assert.match(S.bar().textContent, /TEST_ONLY boom @ 280-server-storage\.js:42/); assert.match(S.bar().textContent, /انقلها لي/);
  assert.equal(S.timers.filter((t) => t.ms).length, 0, 'the administrator keeps it until dismissed');
  assert.equal(S.W.KIVO.bsTechView(), true); assert.equal(U.W.KIVO.bsTechView(), false);
});

/* ── the one toast (280 KIVO.bsToast), the one leave prompt, and the quiet notification refresh ── */
import { loadClient } from './k264_vm.mjs';
import { world } from './core01_root_world.mjs';

function client() {
  const C = { req: async (route) => (route.startsWith('/api/save') ? new Promise(() => {}) : new Response('{"ok":1}', { headers: { 'Content-Type': 'application/json' } })) };
  return loadClient({ C, boot: { srv: 1, cf: 1, uid: 'TEST_ONLY_u', v: 1, keys: {}, revs: {} } });
}

test('KIVO.bsToast: one toast element, up to three lines, a repeated text is not duplicated, an error is marked', () => {
  const T = client();
  try {
    const K = T.W.KIVO, body = T.W.document.body;
    K.bsToast('TEST_ONLY a'); K.bsToast('TEST_ONLY b', { tone: 'err' }); K.bsToast('TEST_ONLY a');
    const boxes = body.children.filter((n) => n.attrs && n.className === 'bs-toast');
    assert.equal(boxes.length, 1, 'one toast surface'); assert.equal(boxes[0].attrs['aria-live'], 'polite');
    assert.deepEqual(boxes[0].children.map((n) => n.textContent), ['TEST_ONLY a', '⚠ TEST_ONLY b']);
    K.bsToast('TEST_ONLY c'); K.bsToast('TEST_ONLY d');
    assert.deepEqual(boxes[0].children.map((n) => n.textContent), ['TEST_ONLY a', 'TEST_ONLY c', 'TEST_ONLY d'], 'the least recently shown line leaves first (a was repeated, so b is the oldest)');
    assert.equal(rd('api/280-server-storage.js').includes('bs-syncnote'), false, 'the inline-styled duplicate toast is gone');
    assert.match(rd('components/550-bassam-busy.js'), /function flash\(label, s, tone\)\{\n    try \{ KIVO\.bsToast\(/, 'BassamBusy.flash goes through the same toast');
  } finally { T.dispose(); }
});

test('one beforeunload prompt: only while edits are unsaved or in flight', async () => {
  const T = client();
  try {
    const leave = () => { const ev = { type: 'beforeunload', prevented: false, preventDefault() { this.prevented = true; } }; T.W.dispatchEvent(ev); return ev; };
    assert.equal(leave().prevented, false, 'nothing pending: no question');
    T.set('bassam_core01_probe_v1', '"TEST_ONLY"');
    assert.equal(T.W.KIVO.__BS_SRV.dirty() || T.W.KIVO.__BS_SRV.inflight(), true);
    const ev = leave(); assert.equal(ev.prevented, true); assert.equal(ev.returnValue, '');
    const R = rd('layouts/root-logic.js') + rd('api/280-server-storage.js');
    assert.equal((R.match(/addEventListener\("beforeunload", function \(e\)/g) || []).length, 1, 'exactly one prompting handler');
  } finally { T.dispose(); }
});

test('notifications: new items are fetched quietly while the panel is closed; «عرض الجديد» only while it is open', () => {
  const calls = [];
  const W = world();
  W.KIVO.BassamNotif = { status: () => ({ hasUpdates: true }), refresh: (q) => { calls.push(q); return Promise.resolve({ ok: 1 }); } };
  W.c.state.nfOpen = true; W.c._nfAutoNew();
  assert.equal(calls.length, 0, 'open panel: the user decides (عرض الجديد)');
  W.c.state.nfOpen = false; W.c._nfAutoNew();
  assert.equal(calls.length, 1); assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { all: false, filter: 'all', kinds: [] });
  W.KIVO.BassamNotif.status = () => ({ hasUpdates: false }); W.c._nfAutoNew();
  assert.equal(calls.length, 1, 'nothing new: no request');
  assert.doesNotMatch(rd('layouts/root-logic.js'), /bassam:notif-error/, 'background poll errors raise no toast');
});
