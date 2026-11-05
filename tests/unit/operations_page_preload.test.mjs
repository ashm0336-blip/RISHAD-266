import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadClient, until } from './k264_vm.mjs';

const read = path => fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const E = 'bsdept:dA:bassam_employees_v1';
const UID = 'TEST_ONLY owner';
const response = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });

function element(tag) {
  const listeners = {};
  const node = { tagName: tag.toUpperCase(), childNodes: [], children: [], style: {}, dataset: {},
    setAttribute() {}, getAttribute() { return null; },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    insertBefore(child) { return this.appendChild(child); },
    remove() { this.removed = true; if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); },
    addEventListener(name, callback) { listeners[name] = callback; },
    click() { listeners.click?.(); },
    querySelector(selector) { if (selector === 'button') return this.button ||= element('button'); return null; },
    querySelectorAll() { return []; },
  };
  if (tag === 'template') node.content = { nodeType: 11, childNodes: [] };
  return node;
}

function runtimeWorld(readResponse) {
  const calls = [], constructors = [], rendered = [], values = [{ eid: 'TEST_ONLY SQL employee' }], scope = { dept: 'dA' };
  const C = { req: async route => {
    if (route.startsWith('/api/operations/read?')) {
      const keys = new URL(route, 'http://x').searchParams.get('keys').split(',');
      const employeeKey = keys.find(key => key.endsWith(':bassam_employees_v1'));
      const data = { ok: 1, uid: UID, epoch: 3, v: 7, resources: employeeKey ? { [employeeKey]: values } : {}, absent: keys.filter(key => key !== employeeKey), denied: [], base: Object.fromEntries(keys.map(key => [key, 4])) };
      calls.push(keys);
      return readResponse(data);
    }
    if (route === '/TEST_ONLY-page.dc.html') return new Response('<x-dc> </x-dc><script data-dc-script>TEST_ONLY precompiled</script>', { headers: { 'Content-Type': 'text/plain' } });
    throw Error('Unexpected local fixture request: ' + route);
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, uid: UID, v: 1, keys: {}, revs: {} } });
  T.W.document.hidden = true;
  T.W.KIVO.BassamAuth = { user: () => ({ id: UID, role: 'dept', deptId: 'dA' }) };
  T.W.KIVO.BassamDepts = { active: () => scope.dept };
  const doc = T.W.document, body = element('body'), host = element('div'); body.appendChild(host);
  doc.body = body; doc.documentElement = element('html'); doc.head = element('head'); doc.defaultView = T.W;
  doc.createElement = element;
  doc.querySelector = selector => selector.includes('.sc-host') ? host : null;
  doc.querySelectorAll = () => [];
  T.W.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
  T.W.DOMParser = class { parseFromString() { return { querySelector: selector => selector.startsWith('script') ? { textContent: 'TEST_ONLY precompiled', getAttribute: () => null } : null }; } };
  T.W.React = {
    Component: class { constructor(props) { this.props = props; this.state = {}; } setState(value) { Object.assign(this.state, typeof value === 'function' ? value(this.state) : value); } forceUpdate() {} },
    createContext: value => ({ Provider: 'TEST_ONLY Provider', value }),
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: () => [0, () => {}], useEffect: callback => callback(), Fragment: 'TEST_ONLY Fragment',
  };
  const metadata = JSON.parse(read('src/modules/employees/meta.json'));
  T.W.KIVO.KIVO_MANIFEST = { keys: ['operationsReadSets'], clone: key => {
    assert.equal(key, 'operationsReadSets'); return { [metadata.name]: metadata.charter.data };
  } };
  vm.runInContext(read('src/core/030-pages-loader.js').replace('@@KIVO_PAGES@@', '{}'), T.ctx, { filename: '030-pages-loader.js' });
  T.W.KIVO.__resources['./' + metadata.name + '.dc.html'] = '/TEST_ONLY-page.dc.html';
  T.W.KIVO.__dcLogicDefs = { [metadata.name]: Base => class extends Base {
    state = { rows: T.W.KIVO.__BS_SRV.operations.get('bassam_employees_v1'), draft: 'TEST_ONLY unsaved editor' };
    constructor(...args) { super(...args); constructors.push(this.state.rows); }
    renderVals() {
      const API = T.W.KIVO.__BS_SRV.operations, state = API.state('bassam_employees_v1');
      const records = state === 'denied' ? null : API.get('bassam_employees_v1');
      rendered.push({ state, records }); return { records };
    }
  } };
  const source0 = read('src/core/050-dc-runtime.js'), marker = '  hideRawTemplate();', RETRY = 'const DATA_RETRY_MS = [1000, 2000, 4000];';
  assert.equal(source0.split(marker).length, 2);
  /* CORE-01: the real quiet-retry schedule (1 s, 2 s, 4 s) is pinned here, then shortened for the test so the
     same three retries (and the card only after them) run within the fixture's timeouts */
  assert.equal(source0.split(RETRY).length, 2, 'The quiet data retry keeps its 1/2/4 s schedule');
  const source = source0.replace(RETRY, 'const DATA_RETRY_MS = [5, 10, 20];');
  // Expose the actual factory and skip automatic DOM boot only; no runtime
  // method or prefetch/constructor ordering is replaced by this seam.
  vm.runInContext(source.replace(marker, '  KIVO.__TEST_runtime = createRuntime; return;\n' + marker), T.ctx, { filename: '050-dc-runtime.js' });
  const runtime = T.W.KIVO.__TEST_runtime(doc); delete T.W.KIVO.__TEST_runtime;
  T.W.KIVO.__dcRegistry = runtime.registry.entries;
  vm.runInContext(read('src/core/030-pages-loader.lazy-guard.js'), T.ctx, { filename: '030-pages-loader.lazy-guard.js' });
  const Dispatcher = runtime.getDC(metadata.name), tree = Dispatcher({}), component = new tree.type(tree.props);
  return { T, runtime, Dispatcher, component, calls, constructors, rendered, values, scope, name: metadata.name, body, host };
}

test('actual page runtime cannot construct its business Component before the typed read ACK', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const f = runtimeWorld(async data => { await gate; return response(data); });
  try {
    assert.equal(await until(() => f.calls.length === 1, 500), true);
    f.component.render();
    assert.equal(f.constructors.length, 0);
    assert.equal(f.runtime.registry.get(f.name).Logic, null);
    release();
    assert.equal(await until(() => !!f.runtime.registry.get(f.name).Logic, 500), true);
    f.component.render();
    assert.equal(f.constructors.length, 1);
    assert.equal(f.component.__reads.has(E), true, 'The actual runtime tracks its typed resource dependency for remote re-rendering');
    assert.deepEqual(JSON.parse(JSON.stringify(f.constructors[0])), f.values);
    assert.equal(f.T.saves().length, 0);
    assert.deepEqual(f.T.nativeLS(), {});
  } finally { release(); f.T.dispose(); }
});

test('a failed typed read retries quietly, leaves no empty business Component and uses the existing retry card before a fresh read', async () => {
  let valid = false, cardAt = -1;
  let f = null; f = runtimeWorld(data => { if (f && f.body.children.some(node => node.className === 'bs-retry bs-retry-page') && cardAt < 0) cardAt = f.calls.length; return response(valid ? data : { ...data, base: {} }); });
  try {
    assert.equal(await until(() => f.body.children.some(node => node.className === 'bs-retry bs-retry-page'), 500), true);
    assert.equal(f.calls.length, 4, 'one read and three quiet retries before the card');
    assert.equal(cardAt, -1, 'no card while the quiet retries run');
    assert.equal(f.runtime.registry.get(f.name).dataError, 'تعذّر عرض هذه الشاشة الآن');
    f.component.render();
    assert.equal(f.constructors.length, 0);
    assert.equal(f.runtime.registry.get(f.name).Logic, null);
    const card = f.body.children.find(node => node.className === 'bs-retry bs-retry-page');
    valid = true; card.button.click(); f.Dispatcher({});
    assert.equal(await until(() => !!f.runtime.registry.get(f.name).Logic, 500), true);
    f.component.render();
    assert.equal(f.constructors.length, 1);
    assert.equal(f.calls.length, 5);
    assert.equal(card.removed, true);
    assert.deepEqual(JSON.parse(JSON.stringify(f.constructors[0])), f.values);
    assert.equal(f.T.saves().length, 0);
  } finally { f.T.dispose(); }
});

test('remote and authority changes hide unconfirmed records, preserve the same editor and retry after read failure', async () => {
  let mode = 'ok', release;
  const gate = new Promise(resolve => { release = resolve; });
  const f = runtimeWorld(async data => {
    if (mode === 'wait') { await gate; return response({ ...data, base: {} }); }
    if (mode === 'denied') { delete data.resources[E]; delete data.base[E]; data.denied.push(E); }
    return response(data);
  });
  try {
    assert.equal(await until(() => !!f.runtime.registry.get(f.name).Logic, 500), true);
    f.component.render(); const editor = f.component.logic;
    const prior = f.rendered.length;
    mode = 'wait'; f.values[0].eid = 'TEST_ONLY newer SQL employee';
    f.T.W.dispatchEvent(new f.T.W.CustomEvent('bassam:remote', { detail: { keys: [E] } }));
    f.component.render();
    assert.equal(await until(() => f.calls.length === 2, 500), true);
    assert.equal(f.rendered.length, prior, 'The old record render is not called while SQL is unconfirmed');
    assert.equal(f.component.logic, editor);
    assert.equal(editor.state.draft, 'TEST_ONLY unsaved editor');
    release();
    assert.equal(await until(() => !!f.runtime.registry.get(f.name).dataError, 500), true);
    assert.equal(f.calls.length, 5, 'the failed re-read was retried quietly three times before the error');
    f.component.render(); assert.equal(f.rendered.length, prior);
    const card = f.body.children.find(node => node.className === 'bs-retry bs-retry-page');
    assert.ok(card);
    mode = 'ok'; card.button.click(); f.Dispatcher({});
    assert.equal(await until(() => f.calls.length === 6 && f.T.W.KIVO.__BS_SRV.operations.ready([E]), 500), true);
    f.component.render();
    assert.equal(f.component.logic, editor); assert.equal(f.constructors.length, 1);
    assert.equal(editor.state.draft, 'TEST_ONLY unsaved editor');
    assert.equal(f.rendered.at(-1).records[0].eid, 'TEST_ONLY newer SQL employee');
    const draft = f.T.W.KIVO.__BS_SRV.operations.draft(); draft.set('bassam_employees_v1', []);
    mode = 'denied'; f.T.W.dispatchEvent(new f.T.W.CustomEvent('bassam:authz', { detail: {} }));
    const beforeAuthority = f.rendered.length; f.component.render();
    assert.equal(f.rendered.length, beforeAuthority);
    assert.equal(await until(() => f.T.W.KIVO.__BS_SRV.operations.state('bassam_employees_v1') === 'denied', 500), true);
    f.component.render();
    assert.equal(f.rendered.at(-1).state, 'denied'); assert.equal(f.rendered.at(-1).records, null);
    assert.equal(f.component.logic, editor); assert.equal(editor.state.draft, 'TEST_ONLY unsaved editor');
    assert.equal(draft.stage().err, 'review-required'); assert.equal(f.T.saves().length, 0);
  } finally { release(); f.T.dispose(); }
});

test('department change cannot construct or render the old department from a cached page definition', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const f = runtimeWorld(async data => { if (Object.keys(data.base).some(key => key.startsWith('bsdept:dB:'))) await gate; return response(data); });
  try {
    assert.equal(await until(() => !!f.runtime.registry.get(f.name).Logic, 500), true);
    f.component.render(); const editor = f.component.logic, prior = f.rendered.length;
    f.scope.dept = 'dB'; f.values[0].eid = 'TEST_ONLY department B';
    f.component.render(); assert.equal(f.rendered.length, prior);
    const next = f.Dispatcher({}), sibling = new next.type(next.props); sibling.render();
    assert.equal(f.constructors.length, 1, 'Cached Logic is withheld from a new host until its new department is ready');
    release();
    assert.equal(await until(() => f.T.W.KIVO.__BS_SRV.operations.ready(['bsdept:dB:bassam_employees_v1']), 500), true);
    f.component.render(); sibling.render();
    assert.equal(f.component.logic, editor); assert.equal(editor.state.draft, 'TEST_ONLY unsaved editor');
    assert.equal(f.rendered.at(-1).records[0].eid, 'TEST_ONLY department B');
    assert.equal(f.constructors.length, 2); assert.equal(f.T.saves().length, 0);
  } finally { release(); f.T.dispose(); }
});
