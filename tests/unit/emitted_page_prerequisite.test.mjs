/* Actual emitted assets, maps, lazy page and Employees constructor in a VM.
   The DOM host is synthetic. Only automatic runtime boot is exposed as a test
   seam; readiness, loading, typed transport and all initializers stay actual. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import { ROOT } from './harness.mjs';
import { until } from './k264_vm.mjs';

assert.ok(process.env.KIVO_DIST, 'KIVO_DIST must select the current build explicitly');
const DIST = path.resolve(ROOT, process.env.KIVO_DIST), UID = 'TEST_ONLY emitted owner';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const response = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
function built() {
  const manifest = JSON.parse(fs.readFileSync(DIST + '.build.json', 'utf8'));
  assert.equal(manifest.mode, 'split'); assert.equal(manifest.pages, 'lazy');
  const retained = new Set(manifest.retainedFiles || []);
  function file(relative) {
    const entry = manifest.files[relative]; assert.ok(entry, 'Actual build registers ' + relative);
    const bytes = fs.readFileSync(path.join(DIST, relative));
    assert.equal(bytes.length, entry.bytes); assert.equal(sha(bytes), entry.sha256);
    return { path: '/' + relative, source: bytes.toString('utf8') };
  }
  function asset(stem) {
    const matches = Object.keys(manifest.files).filter(name => new RegExp('^assets/js/' + stem + '\\.[a-f0-9]{10}\\.js$').test(name) && !retained.has(name));
    assert.equal(matches.length, 1, 'One current emitted ' + stem); return file(matches[0]);
  }
  const index = file('index.html'), scripts = [...index.source.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map(match => match[1]);
  return { file, asset, scripts };
}

function element(tag, append) {
  const events = {}, attrs = {}, node = { tagName: tag.toUpperCase(), nodeType: 1, childNodes: [], children: [], style: {}, dataset: {},
    sheet: { cssRules: [], insertRule(rule) { this.cssRules.push(rule); } },
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(key, value) { attrs[key] = String(value); }, getAttribute(key) { return attrs[key] ?? null; },
    appendChild(child) { child.parentNode = this; this.children.push(child); append?.(child); return child; },
    prepend(child) { return this.appendChild(child); }, insertBefore(child) { return this.appendChild(child); },
    remove() { this.removed = true; if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); },
    addEventListener(name, callback) { events[name] = callback; }, removeEventListener() {}, click() { events.click?.(); },
    querySelector(selector) { return selector === 'button' ? this.button ||= element('button') : null; }, querySelectorAll() { return []; },
  };
  if (tag === 'template') node.content = { nodeType: 11, childNodes: [] };
  return node;
}

function world({ registered = false, readResponse = response } = {}) {
  const B = built(), calls = [], errors = [], constructors = [], timers = new Set(), events = new Map();
  const registry = [{ id: 'real', name: 'TEST_ONLY real emitted department' }], rows = [{ eid: 'TEST_ONLY_employee', name: 'TEST_ONLY SQL employee' }];
  const W = { console: { log() {}, warn() {}, error(...values) { errors.push(values.map(String).join(' ')); } }, Intl, Date, URL, URLSearchParams, Blob, TextEncoder, TextDecoder, AbortController, Uint8Array,
    crypto: webcrypto, Event, CustomEvent, Node: { ELEMENT_NODE: 1, TEXT_NODE: 3 }, navigator: { onLine: true, sendBeacon() { throw Error('No beacon in this fixture'); } },
    location: { href: 'http://x/', origin: 'http://x', protocol: 'http:', hostname: 'x', pathname: '/', search: '', hash: '' },
    setTimeout(fn, ms, ...args) { const timer = setTimeout(() => { timers.delete(timer); fn(...args); }, ms); timers.add(timer); return timer; },
    clearTimeout(timer) { timers.delete(timer); clearTimeout(timer); },
    setInterval(fn, ms) { const timer = setInterval(fn, ms); timers.add(timer); return timer; }, clearInterval(timer) { timers.delete(timer); clearInterval(timer); },
    addEventListener(name, callback) { const handlers = events.get(name) || new Set(); handlers.add(callback); events.set(name, handlers); },
    removeEventListener(name, callback) { events.get(name)?.delete(callback); }, dispatchEvent(event) { for (const callback of events.get(event.type) || []) callback(event); },
    __BS_BOOT: { srv: 1, cf: 1, uid: UID, v: 1, keys: registered ? { bassam_depts_v1: JSON.stringify(registry) } : {}, revs: {} },
  };
  class MemoryStorage {
    constructor() { this.values = new Map(); } getItem(key) { return this.values.get(String(key)) ?? null; }
    setItem(key, value) { this.values.set(String(key), String(value)); } removeItem(key) { this.values.delete(String(key)); }
    clear() { this.values.clear(); } key(index) { return [...this.values.keys()][index] ?? null; } get length() { return this.values.size; }
  }
  W.Storage = MemoryStorage; W.localStorage = new MemoryStorage(); W.sessionStorage = new MemoryStorage();
  W.StorageEvent = class extends Event { constructor(type, options) { super(type); this.key = options.key; } };
  W.window = W; W.self = W; W.globalThis = W;
  const ctx = vm.createContext(W);
  const body = element('body'), host = element('div'); body.appendChild(host);
  const doc = W.document = { hidden: true, readyState: 'complete', body, documentElement: element('html'),
    createElement: tag => element(tag), getElementById() { return null; }, querySelector: selector => selector.includes('.sc-host') ? host : null,
    querySelectorAll() { return []; }, addEventListener() {}, removeEventListener() {} };
  doc.defaultView = W;
  doc.head = element('head', script => {
    if (script.tagName !== 'SCRIPT') return;
    Promise.resolve().then(() => {
      const asset = B.file(script.src.replace(/^\//, '')); vm.runInContext(asset.source, ctx, { filename: asset.path });
      const factory = W.KIVO.__dcLogicDefs?.Employees;
      if (factory && !factory.__tracked) {
        const tracked = (...args) => {
          const Actual = factory(...args);
          return class extends Actual { constructor(...props) { super(...props); constructors.push({ employees: JSON.parse(JSON.stringify(this.state.employees)), calls: calls.length }); } };
        };
        tracked.__tracked = true; W.KIVO.__dcLogicDefs.Employees = tracked;
      }
      script.onload?.();
    }).catch(error => { errors.push(String(error)); script.onerror?.(); });
  });
  W.DOMParser = class { parseFromString(source) { const match = /<script\b[^>]*data-dc-script[^>]*>([\s\S]*?)<\/script>/.exec(source); return { querySelector: selector => selector.startsWith('script') && match ? { textContent: match[1], getAttribute: () => null } : null }; } };
  W.React = { Component: class { constructor(props) { this.props = props; this.state = {}; } setState(update) { Object.assign(this.state, typeof update === 'function' ? update(this.state) : update); } forceUpdate() {} },
    createContext: value => ({ Provider: 'TEST_ONLY Provider', value }), createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: () => [0, () => {}], useEffect: callback => callback(), Fragment: 'TEST_ONLY Fragment' };
  W.fetch = async route => {
    const url = new URL(route, 'http://x');
    if (url.pathname === '/api/operations/read') {
      const requested = url.searchParams.get('keys').split(','), key = requested.find(key => key.endsWith(':bassam_employees_v1'));
      calls.push(requested);
      return readResponse({ ok: 1, uid: UID, epoch: 3, v: 7, resources: key ? { [key]: rows } : {}, absent: requested.filter(item => item !== key), denied: [], base: Object.fromEntries(requested.map(item => [item, 0])) });
    }
    if (url.pathname.startsWith('/assets/pages/')) return new Response(B.file(url.pathname.slice(1)).source, { headers: { 'Content-Type': 'text/plain' } });
    throw Error('Unexpected fixture route: ' + route);
  };
  const stems = ['005-kivo-ns', '030-pages-loader', '050-dc-runtime', '255-page-manifest', '280-server-storage', '320-dept-storage', '565-page-kit'];
  const assets = new Map(stems.map(stem => { const asset = B.asset(stem); assert.equal(B.scripts.filter(src => src === asset.path).length, 1); return [asset.path, asset]; }));
  for (const src of B.scripts) {
    const asset = assets.get(src); if (!asset) continue;
    let source = asset.source;
    if (src.includes('/050-dc-runtime.')) {
      const marker = 'hideRawTemplate();'; assert.equal(source.split(marker).length, 2);
      source = source.replace(marker, 'KIVO.__TEST_runtime = createRuntime; return; ' + marker);
      /* CORE-01: the emitted runtime keeps the quiet 1/2/4 s data retry; shortened here so the same three retries fit the fixture */
      const retry = 'const DATA_RETRY_MS = [1000, 2000, 4000];'; assert.equal(source.split(retry).length, 2, 'emitted quiet-retry schedule');
      source = source.replace(retry, 'const DATA_RETRY_MS = [5, 10, 20];');
    }
    vm.runInContext(source, ctx, { filename: asset.path });
  }
  W.KIVO.BassamAuth = { user: () => ({ id: UID, role: 'super' }), isSuper: () => true };
  const runtime = W.KIVO.__TEST_runtime(doc); delete W.KIVO.__TEST_runtime;
  W.KIVO.__dcRegistry = runtime.registry.entries;
  function mount() {
    const Dispatcher = runtime.getDC('Employees'), tree = Dispatcher({}), component = new tree.type(tree.props);
    component.componentDidMount(); return component;
  }
  return { W, runtime, calls, errors, constructors, rows, registry, body, mount,
    dispose() { for (const timer of timers) { clearTimeout(timer); clearInterval(timer); } timers.clear(); } };
}

test('emitted lazy loader retains the exact authoritative runtime tail and exposes all readiness hooks', () => {
  const B = built(), source = fs.readFileSync(path.join(ROOT, 'src/core/030-pages-loader.js'), 'utf8');
  const start = source.indexOf('\n(function () {\n  var pages = @@KIVO_PAGES@@;'), end = source.indexOf('\n})();', start) + '\n})();'.length;
  assert.ok(start >= 0 && end > start);
  assert.equal(B.asset('030-pages-loader').source.includes(source.slice(end)), true, 'The entire actual source tail must survive the lazy build');
  const f = world();
  try { for (const name of ['__dcPageContext', '__dcPageReady', '__dcBeforePage']) assert.equal(typeof f.W.KIVO[name], 'function', name); }
  finally { f.dispose(); }
});

test('actual emitted runtime blocks a missing department then waits for typed ACK before the real Employees initializer', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const f = world({ readResponse: async data => { await gate; return response(data); } });
  try {
    assert.equal(typeof f.W.KIVO.__dcPageContext, 'function');
    const component = f.mount(); await new Promise(resolve => setTimeout(resolve, 20));
    const blocked = component.render(); assert.match(blocked.props.children[0].props.error, /لا توجد إدارة/);
    assert.equal(f.constructors.length, 0); assert.equal(f.calls.length, 0);
    f.W.KIVO.BassamDepts.save(f.registry); component.render();
    assert.equal(await until(() => f.calls.length === 1, 1000, 10), true);
    assert.equal(f.constructors.length, 0, 'No real field initializer before typed ACK');
    release(); assert.equal(await until(() => f.W.KIVO.__dcPageReady('Employees'), 1000, 10), true);
    component.render();
    assert.equal(f.constructors.length, 1); assert.deepEqual(f.constructors[0].employees, f.rows);
    assert.equal(f.calls[0].every(key => key.startsWith('bsdept:real:')), true);
    assert.equal(f.errors.some(error => /operations-read-required|initializer|construct/.test(error)), false);
  } finally { release(); f.dispose(); }
});

test('emitted real-scope read failure stays an error and the existing retry loads the real constructor only after a fresh ACK', async () => {
  let valid = false;
  const f = world({ registered: true, readResponse: data => valid ? response(data) : new Response('{}', { status: 403 }) });
  try {
    assert.equal(typeof f.W.KIVO.__dcBeforePage, 'function');
    const component = f.mount();
    assert.equal(await until(() => !!f.runtime.registry.get('Employees').dataError, 1000, 10), true);
    assert.equal(f.calls.length, 4, 'one read and three quiet retries before the error');
    const failed = component.render(); assert.equal(failed.props.children[0].props.error, 'تعذّر عرض هذه الشاشة الآن'); assert.equal(f.constructors.length, 0);
    const card = f.body.children.find(node => node.className === 'bs-retry bs-retry-page'); assert.ok(card, 'Actual emitted lazy guard provides the retry');
    valid = true; card.button.click(); component.render();
    assert.equal(await until(() => f.calls.length === 5 && f.W.KIVO.__dcPageReady('Employees'), 1000, 10), true);
    assert.equal(await until(() => !!f.runtime.registry.get('Employees').Logic, 1000, 10), true);
    component.render(); assert.equal(f.constructors.length, 1); assert.deepEqual(f.constructors[0].employees, f.rows); assert.equal(card.removed, true);
  } finally { f.dispose(); }
});
