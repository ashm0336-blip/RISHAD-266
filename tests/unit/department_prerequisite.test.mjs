import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadClient, until } from './k264_vm.mjs';

const read = file => fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
const UID = 'TEST_ONLY department owner';
const REG = 'bassam_depts_v1', ACT = 'bassam_active_dept_v1';
const response = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });

function element(tag) {
  const listeners = {}, node = { tagName: tag.toUpperCase(), children: [], childNodes: [], style: {}, dataset: {},
    setAttribute() {}, getAttribute() { return null; },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    insertBefore(child) { return this.appendChild(child); },
    remove() { this.removed = true; if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); },
    addEventListener(name, callback) { listeners[name] = callback; },
    querySelector() { return null; }, querySelectorAll() { return []; },
  };
  if (tag === 'template') node.content = { nodeType: 11, childNodes: [] };
  return node;
}

function world({ registry, preference = 'd1', user = { id: UID, role: 'super' }, readResponse = response } = {}) {
  const calls = [], constructors = [], rendered = [];
  const keys = registry === undefined ? {} : { [REG]: typeof registry === 'string' ? registry : JSON.stringify(registry) };
  const T = loadClient({ blocks: [], boot: { srv: 1, cf: 1, uid: UID, v: 1, keys, revs: {} }, C: { req: async route => {
    if (route.startsWith('/api/operations/read?')) {
      const query = new URL(route, 'http://x'), requested = query.searchParams.get('keys').split(',');
      calls.push(requested);
      return readResponse({ ok: 1, uid: UID, epoch: 3, v: 7, resources: {}, absent: requested, denied: [], base: Object.fromEntries(requested.map(key => [key, 0])) });
    }
    if (route === '/TEST_ONLY-page.dc.html') return new Response('<x-dc> </x-dc><script data-dc-script>TEST_ONLY precompiled</script>', { headers: { 'Content-Type': 'text/plain' } });
    throw Error('Unexpected local fixture request: ' + route);
  } } });
  // Each world has independent prototypes: the actual 280/320 wrappers cannot
  // leak between tests through the harness's shared FakeStorage constructor.
  vm.runInContext(`window.Storage = class { constructor(){this._m=new Map()} getItem(k){return this._m.has(String(k))?this._m.get(String(k)):null} setItem(k,v){this._m.set(String(k),String(v))} removeItem(k){this._m.delete(String(k))} clear(){this._m.clear()} key(i){return [...this._m.keys()][i]??null} get length(){return this._m.size} }; localStorage=new Storage(); sessionStorage=new Storage();`, T.ctx);
  if (preference) T.W.localStorage.setItem(ACT, preference);
  T.W.document.hidden = true;
  T.run(['280-server-storage.js', '320-dept-storage.js']);
  T.W.KIVO.BassamAuth = { user: () => user };
  T.W.KIVO.__BS_I = T.W.KIVO.__BS_I || {};
  T.W.KIVO.__BS_I.auth = { D: T.W.KIVO.BassamDepts, cur: () => user, u0: user, needsPwChange: () => false,
    gmDepts: () => [], gmEnsureActive() {}, touch() {} };
  T.run(['335-identity-gate.js']);

  function mount(name = 'Irshad') {
    const doc = T.W.document, body = element('body'), host = element('div'); body.appendChild(host);
    doc.body = body; doc.documentElement = element('html'); doc.head = element('head'); doc.defaultView = T.W;
    doc.createElement = element; doc.querySelector = selector => selector.includes('.sc-host') ? host : null; doc.querySelectorAll = () => [];
    T.W.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
    T.W.DOMParser = class { parseFromString() { return { querySelector: selector => selector.startsWith('script') ? { textContent: 'TEST_ONLY precompiled', getAttribute: () => null } : null }; } };
    T.W.React = { Component: class { constructor(props) { this.props = props; this.state = {}; } setState(value) { Object.assign(this.state, typeof value === 'function' ? value(this.state) : value); } forceUpdate() {} },
      createContext: value => ({ Provider: 'TEST_ONLY Provider', value }), createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
      useState: () => [0, () => {}], useEffect: callback => callback(), Fragment: 'TEST_ONLY Fragment' };
    const modules = ['employees', 'irshad', 'seized', 'award', 'admin', 'kpis', 'daily', 'dreport', 'plan', 'planning', 'staff', 'tasks', 'profile'];
    const sets = Object.fromEntries(modules.map(slug => { const meta = JSON.parse(read('src/modules/' + slug + '/meta.json')); return [meta.name, meta.charter.data]; }));
    const manifest = JSON.parse(read('src/manifests/pages.json'));
    T.W.KIVO.KIVO_MANIFEST = { keys: ['operationsReadSets', 'pages', 'containers'], clone: key => key === 'operationsReadSets' ? sets : manifest[key] };
    vm.runInContext(read('src/core/030-pages-loader.js').replace('@@KIVO_PAGES@@', '{}'), T.ctx, { filename: '030-pages-loader.js' });
    T.W.KIVO.__resources['./' + encodeURIComponent(name) + '.dc.html'] = '/TEST_ONLY-page.dc.html';
    T.W.KIVO.__dcLogicDefs = { [name]: Base => class extends Base {
      state = { draft: 'TEST_ONLY unsaved editor' };
      constructor(...args) { super(...args); constructors.push(name); }
      renderVals() { rendered.push(name); return {}; }
    } };
    const source = read('src/core/050-dc-runtime.js'), marker = '  hideRawTemplate();';
    assert.equal(source.split(marker).length, 2);
    vm.runInContext(source.replace(marker, '  KIVO.__TEST_runtime = createRuntime; return;\n' + marker), T.ctx, { filename: '050-dc-runtime.js' });
    const runtime = T.W.KIVO.__TEST_runtime(doc); delete T.W.KIVO.__TEST_runtime;
    const Dispatcher = runtime.getDC(name), tree = Dispatcher({}), component = new tree.type(tree.props);
    return { runtime, Dispatcher, component, name, body };
  }
  return { T, calls, constructors, rendered, mount, D: T.W.KIVO.BassamDepts };
}

test('missing and empty department registries never invent d1 or address a synthetic scope', () => {
  for (const registry of [undefined, []]) {
    const f = world({ registry });
    try {
      assert.equal(f.D.active(), null);
      assert.equal(f.D.context().state, 'empty');
      assert.equal(f.T.W.KIVO.__BS_SRV.operations.departmentContext().state, 'empty');
      assert.match(f.D.context().message, /لا توجد إدارة/);
      assert.throws(() => f.T.set('bassam_unmigrated_TEST_ONLY', '{}'), /department-required/);
      assert.equal(f.T.W.localStorage.length, 0);
      assert.equal(f.T.W.localStorage.key(0), null);
      f.T.W.localStorage.clear();
      assert.equal(f.T.nativeLS()[ACT], 'd1', 'A stale device preference is not a registered scope and is not destructive to clear');
      assert.equal(f.T.saves().length, 0);
      assert.equal(Object.keys(f.T.nativeLS()).some(key => /^bsdept:/.test(key)), false);
    } finally { f.T.dispose(); }
  }
  const fresh = world({ preference: null });
  try { assert.equal(fresh.D.active(), null); assert.deepEqual(fresh.T.nativeLS(), {}); }
  finally { fresh.T.dispose(); }
});

test('a valid staff department remains selected and cannot be switched to another registered department', () => {
  const f = world({ registry: [{ id: 'other', name: 'TEST_ONLY other' }, { id: 'own', name: 'TEST_ONLY own' }], preference: 'other', user: { id: UID, role: 'staff', deptId: 'own' } });
  try {
    assert.equal(f.D.active(), 'own'); assert.equal(f.D.context().state, 'ready');
    assert.equal(f.D.setActive('other'), false); assert.equal(f.D.active(), 'own'); assert.equal(f.T.saves().length, 0);
  } finally { f.T.dispose(); }
});

test('a deleted account department and an empty manager scope do not fall through to another department', () => {
  for (const user of [{ id: UID, role: 'staff', deptId: 'removed' }, { id: UID, role: 'gm', gid: 'empty-group' }]) {
    const f = world({ registry: [{ id: 'real', name: 'TEST_ONLY real department' }], user });
    try { assert.equal(f.D.active(), null); assert.equal(f.D.context().state, 'unavailable'); assert.equal(f.D.setActive('real'), false); }
    finally { f.T.dispose(); }
  }
});

test('a corrupt registry remains an error rather than a confirmed empty department list', () => {
  const f = world({ registry: '{broken' });
  try { assert.equal(f.D.active(), null); assert.equal(f.D.context().state, 'error'); assert.match(f.D.context().message, /تعذّر/); }
  finally { f.T.dispose(); }
});

test('actual runtime withholds every declared department Component and performs no typed preload without a department', async () => {
  for (const name of ['Employees', 'Planning', 'Staffing', 'Operational Plan', 'Daily Sessions', 'Daily Report', 'Tasks', 'Irshad', 'Seized', 'Award']) {
    const f = world(), page = f.mount(name);
    try {
      await new Promise(resolve => setTimeout(resolve, 15));
      const tree = page.component.render(), placeholder = tree.props.children[0];
      assert.equal(f.constructors.length, 0, name);
      assert.equal(f.calls.length, 0, name + ' must not preload a fake department');
      assert.match(placeholder.props.error, /لا توجد إدارة/);
      assert.equal(!!page.runtime.registry.get(name).dataError, false, 'A prerequisite notice is not a failed request');
    } finally { f.T.dispose(); }
  }
});

test('global Admin and mixed KPIs can load without department preloads', async () => {
  for (const name of ['Admin', 'KPIs']) {
    const f = world(), page = f.mount(name);
    try {
      assert.equal(await until(() => !!page.runtime.registry.get(name).Logic, 500), true);
      page.component.render(); assert.equal(f.constructors.length, 1); assert.equal(f.calls.length, 0);
    } finally { f.T.dispose(); }
  }
});

test('creating a real department rechecks the existing placeholder and waits for typed read ACK', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const f = world({ readResponse: async data => { await gate; return response(data); } }), page = f.mount();
  try {
    await new Promise(resolve => setTimeout(resolve, 15)); page.component.render();
    assert.equal(f.calls.length, 0); assert.equal(f.constructors.length, 0);
    f.D.save([{ id: 'real', name: 'TEST_ONLY newly registered department' }]);
    assert.equal(f.D.active(), 'real'); page.component.render();
    assert.equal(await until(() => f.calls.length === 1, 500), true);
    assert.equal(f.constructors.length, 0);
    release(); assert.equal(await until(() => f.T.W.KIVO.__dcPageReady('Irshad'), 500), true);
    assert.equal(await until(() => !!page.runtime.registry.get('Irshad').Logic, 500), true);
    page.component.render(); assert.equal(f.constructors.length, 1);
    assert.equal(f.calls[0].every(key => key.startsWith('bsdept:real:')), true);
  } finally { release(); f.T.dispose(); }
});

test('a real department denied by HTTP remains a failed read, never a no-department notice or empty Component', async () => {
  const f = world({ registry: [{ id: 'real', name: 'TEST_ONLY department' }], readResponse: () => new Response(JSON.stringify({ ok: 0, err: 'irshad-denied' }), { status: 403 }) }), page = f.mount();
  try {
    assert.equal(await until(() => !!page.runtime.registry.get(page.name).dataError, 500), true);
    const tree = page.component.render();
    assert.equal(f.D.context().state, 'ready'); assert.equal(f.calls.length, 1); assert.equal(f.constructors.length, 0);
    assert.match(tree.props.children[0].props.error, /تعذّر تأكيد/);
    assert.doesNotMatch(tree.props.children[0].props.error, /لا توجد إدارة/);
  } finally { f.T.dispose(); }
});

test('removing a department during preload ignores the old ACK, retains draft, and recovers on a new valid scope', async () => {
  let release, delay = false; const gate = new Promise(resolve => { release = resolve; });
  const f = world({ registry: [{ id: 'first', name: 'TEST_ONLY first' }], readResponse: async data => { if (delay) await gate; return response(data); } }), page = f.mount();
  try {
    assert.equal(await until(() => !!page.runtime.registry.get(page.name).Logic, 500), true);
    page.component.render(); const editor = page.component.logic, rendered = f.rendered.length;
    delay = true; f.D.save([{ id: 'second', name: 'TEST_ONLY second' }]); page.component.render();
    assert.equal(await until(() => f.calls.length === 2, 500), true);
    f.D.save([]); page.component.render(); release();
    await new Promise(resolve => setTimeout(resolve, 20)); page.component.render();
    assert.equal(f.rendered.length, rendered); assert.equal(page.component.logic, editor); assert.equal(editor.state.draft, 'TEST_ONLY unsaved editor');
    assert.equal(page.runtime.registry.get(page.name).dataError, null);
    delay = false; f.D.save([{ id: 'third', name: 'TEST_ONLY third' }]); page.component.render();
    assert.equal(await until(() => f.T.W.KIVO.__dcPageReady(page.name), 500), true);
    page.component.render(); assert.equal(page.component.logic, editor); assert.equal(f.constructors.length, 1);
    assert.equal(f.T.saves().every(call => Object.keys(JSON.parse(call.body).set || {}).every(key => key === REG)), true, 'Only intentional department metadata changes may be saved; no domain save exists');
  } finally { release(); f.T.dispose(); }
});

test('actual KPIs guards inline task metrics without hiding global daily-statistics panels', () => {
  const f = world();
  try {
    f.T.W.DCLogic = class {};
    f.T.W.KIVO.BassamPerm = { kpiPanelOk: () => true, can: () => true };
    vm.runInContext(read('src/modules/kpis/logic.js') + '\nwindow.__TEST_KPIs = Component;', f.T.ctx);
    const component = new f.T.W.__TEST_KPIs(); let metrics = 0;
    component._tkKpiVals = () => { metrics++; };
    component.state.ktab = 'tk'; const blocked = component.renderVals();
    assert.equal(metrics, 0); assert.equal(blocked.on_tk, false); assert.match(blocked.tkScopeNotice, /لا توجد إدارة/);
    component.state.ktab = 'dsh'; assert.equal(component.renderVals().on_dsh, true);
    f.D.save([{ id: 'real', name: 'TEST_ONLY real' }]); component.state.ktab = 'tk';
    assert.equal(component.renderVals().on_tk, true); assert.equal(metrics, 1);
  } finally { f.T.dispose(); }
});

test('leaving a failed department context and selecting it again performs a fresh acknowledged read', async () => {
  let denied = true;
  const f = world({ registry: [{ id: 'real', name: 'TEST_ONLY real' }], readResponse: data => denied ? new Response('{}', { status: 403 }) : response(data) }), page = f.mount();
  try {
    assert.equal(await until(() => !!page.runtime.registry.get(page.name).dataError, 500), true);
    f.D.save([]); page.component.render();
    denied = false; f.D.save([{ id: 'real', name: 'TEST_ONLY real' }]); page.component.render();
    assert.equal(await until(() => f.calls.length === 2 && f.T.W.KIVO.__dcPageReady(page.name), 500), true);
    page.component.render(); assert.equal(f.constructors.length, 1);
  } finally { f.T.dispose(); }
});
