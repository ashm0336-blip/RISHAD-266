/* Actual backup callbacks, with in-memory transport/files only. No R2 or cloud. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parse } from 'acorn';
import { ROOT } from './harness.mjs';

const adminSource = fs.readFileSync(path.join(ROOT, 'src/modules/admin/logic.js'), 'utf8');
const rootSource = fs.readFileSync(path.join(ROOT, 'src/layouts/root-logic.js'), 'utf8');
const klass = source => parse(source, { ecmaVersion: 'latest' }).body.find(n => n.type === 'ClassDeclaration' && n.id.name === 'Component');
const admin = klass(adminSource), root = klass(rootSource);
const method = (source, ast, name, context) => {
  const node = ast.body.body.find(n => n.type === 'MethodDefinition' && n.key.name === name);
  assert.ok(node, name); return vm.runInContext('({' + source.slice(node.start, node.end) + '}).' + name, context);
};
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) { for (const child of value) { const found = find(child, predicate); if (found) return found; } }
    else if (value && typeof value === 'object') { const found = find(value, predicate); if (found) return found; }
  }
  return null;
}
const exportNode = find(admin, node => node.type === 'Property' && node.key?.name === 'exportBackup');
assert.ok(exportNode);
const D1 = 'TEST_ONLY_department_1', D2 = 'TEST_ONLY_department_2';
const domain = d => ({ version: 1, scope: { departmentId: d }, resources: { reports: false, languages: false, locations: false, retro: false,
  retroVersionPresent: false, retroVersion: null, retroWindowsPresent: false }, rows: { reports: [], languages: [], catalogs: [], windows: [] } });
const businessDomain = (kind, d) => ({ version: 1, scope: d === '' ? { kind: 'global' } : { departmentId: d },
  resources: Object.fromEntries((kind === 'seized' ? ['reports', 'catalog', 'actions', 'locations', 'jew', 'retro'] : ['records', 'docsV1', 'docsV2']).map(key => [key, false])),
  rows: Object.fromEntries((kind === 'seized' ? ['resources', 'reports', 'items', 'photos', 'history', 'categories', 'catalogItems', 'actions', 'lists', 'windows'] : ['resources', 'records', 'caseTexts', 'answers', 'scoreRows', 'scores', 'documents', 'sections', 'items']).map(key => [key, []])) });
const json = body => ({ ok: true, status: 200, json: async () => body });
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };

function browser(kind, failure = '') {
  const calls = [], files = [], writes = [], messages = [];
  let active = D1, dirty = failure === 'dirty';
  const keys = ['bsdept:' + D1 + ':bassam_options_v1', 'bsdept:' + D1 + ':bassam_irshad_v1'];
  const memory = { [keys[0]]: '{"TEST_ONLY":1}', [keys[1]]: '{"reports":[]}', bassam_depts_v1: JSON.stringify([{ id: D1 }, { id: D2 }]),
    bassam_auth_users_v1: '[]', bassam_perms_v1: '{}', bassam_gdepts_v1: '[]', bassam_platform_v1: '{}', bassam_active_dept_v1: D1 };
  const KIVO = { BassamAuth: { user: () => ({ id: 'TEST_ONLY_owner', role: kind === 'full' ? 'super' : 'staff' }), isSuper: () => kind === 'full' },
    BassamDepts: { active: () => active, activeName: () => 'TEST_ONLY Department', allScopedKeys: () => keys, keysOf: () => keys,
      list: () => [{ id: D1 }, { id: D2 }], raw: { getItem: key => memory[key] ?? null, setItem: (key, value) => writes.push([key, value]) } },
    __BS_SRV: { dirty: () => dirty, inflight: () => false, sesChanged: () => false, rev: () => 4 },
    DailyStats: { refresh: async () => ({}), revision: () => 3 },
    BassamNotif: { exportDomain: async () => ({ ok: 1, domain: { version: 1 } }) },
    Custody: { exportDomain: async dept => ({ ok: 1, domains: (dept ? [dept] : [D1, D2]).map(d => ({ version: 1, scope: { departmentId: d }, rows: { items: [], issues: [], moves: [] } })) }) },
    BassamIDB: { allForBackup: async () => ({}) }, BassamImgRefs: { collect: () => [] }, BassamCrypt: { ok: () => true },
    BassamCount: (n, label) => n + ' ' + label };
  let fences = 0;
  const C = { KIVO, __BS_BOOT: { srv: 1, cf: 1, uid: 'TEST_ONLY_owner', v: 17 }, s: true, AbortController, URLSearchParams,
    localStorage: {}, setTimeout: () => 1, clearTimeout() {},
    Blob: class { constructor(parts) { this.text = parts.join(''); } },
    URL: { createObjectURL(blob) { files.push(JSON.parse(blob.text)); return 'blob:TEST_ONLY'; }, revokeObjectURL() {} },
    document: { body: { appendChild() {} }, createElement: () => ({ click() {}, remove() {} }) },
    fetch: async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).startsWith('/api/get?')) { fences++; return json({ ok: 1, v: failure === 'stale' || failure === 'concurrent' && fences === 2 ? 18 : 17, keys: {} }); }
      const resource = /^\/api\/(irshad|seized|award)\/export\?/.exec(String(url))?.[1]; assert.ok(resource, String(url));
      if (failure === 'department' && resource === 'irshad') active = D2;
      const departments = kind === 'full' ? [D1, D2] : [D1], scopes = departments.concat(resource === 'award' && kind === 'full' ? [''] : []);
      const result = { ok: 1, rev: 4, globalRev: 17, domains: scopes.map(d => resource === 'irshad' ? domain(d) : businessDomain(resource, d)) };
      if (resource === 'irshad') {
        if (failure === 'missing') result.domains = [];
        if (failure === 'scope') result.domains[0].scope.departmentId = 'TEST_ONLY_foreign';
        if (failure === 'rows') result.domains[0].rows.windows = null;
      }
      if (resource === 'seized' && failure === 'seized-missing') result.domains = [];
      if (resource === 'award' && failure === 'award-scope') result.domains[0].scope.departmentId = 'TEST_ONLY_foreign';
      if (resource === 'award' && failure === 'award-rows') result.domains[0].rows.answers = null;
      if (resource === 'award' && failure === 'award-global-missing') result.domains = result.domains.filter(d => d.scope.kind !== 'global');
      return json(result);
    } };
  C.window = C; vm.createContext(C);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/548-atomic-backup.js'), 'utf8'), C);
  const page = { state: {}, setState(value) { Object.assign(this.state, value); }, bkToast: message => messages.push(message) };
  if (kind === 'full') {
    page._fullStamp = () => null;
    for (const name of ['_wpActor', '_irBackupCapture', '_irBackupFence']) page[name] = method(adminSource, admin, name, C);
    page.exportBackup = vm.runInContext('(function(){return (' + adminSource.slice(exportNode.value.start, exportNode.value.end) + ');})', C).call(page);
  } else {
    page.bkCapNote = () => '';
    page.exportBackup = method(rootSource, root, 'bkExportRun', C);
  }
  return { page, C, calls, files, writes, messages, memory, setDirty(value) { dirty = value; } };
}

test('full backup includes manifest v3, explicit typed empty business domains for every department and a separate global Award scope, removing retired JSON', async () => {
  const B = browser('full'); B.page.exportBackup(); await settle();
  assert.ok(B.page._encPend, B.page.state.backupMsg);
  const file = JSON.parse(B.page._encPend.json);
  assert.equal(file.manifest.version, 3); assert.equal(file.manifest.domains.irshad, 1); assert.equal(file.manifest.domains.seized, 1); assert.equal(file.manifest.domains.awards, 1);
  assert.deepEqual(file.domains.irshad.map(d => d.scope.departmentId), [D1, D2]);
  assert.deepEqual(file.domains.seized.map(d => d.scope.departmentId), [D1, D2]);
  assert.deepEqual(file.domains.awards.map(d => d.scope.kind === 'global' ? '' : d.scope.departmentId), [D1, D2, '']);
  assert.equal(file.data['bsdept:' + D1 + ':bassam_irshad_v1'], undefined);
  assert.equal(B.calls.filter(c => c.url.startsWith('/api/get?')).length, 2); assert.equal(B.calls.filter(c => /\/export\?/.test(c.url)).length, 3); assert.deepEqual(B.writes, []);
});

test('full backup refuses stale memory, concurrent server writes, pending local writes and incomplete/foreign typed domains', async () => {
  for (const failure of ['stale', 'concurrent', 'dirty', 'missing', 'scope', 'rows', 'seized-missing', 'award-scope', 'award-rows', 'award-global-missing']) {
    const B = browser('full', failure); B.page.exportBackup(); await settle();
    assert.equal(B.page._encPend, null, failure); assert.equal(B.files.length, 0); assert.deepEqual(B.writes, []);
  }
});

test('department export uses the actual 548 service and captured identity, with explicit empty business domains in manifest v3', async () => {
  const B = browser('dept'); B.page.exportBackup(); await settle();
  assert.equal(B.files.length, 1, B.messages.join(';'));
  const file = B.files[0]; assert.equal(file.manifest.version, 3); assert.equal(file.manifest.domains.irshad, 1); assert.equal(file.manifest.domains.seized, 1); assert.equal(file.manifest.domains.awards, 1);
  assert.deepEqual(file.domains.irshad.map(d => d.scope.departmentId), [D1]); assert.equal(file.data.bassam_irshad_v1, undefined);
  assert.deepEqual(file.domains.seized.map(d => d.scope.departmentId), [D1]); assert.deepEqual(file.domains.awards.map(d => d.scope.departmentId), [D1]);
  assert.ok(B.calls.find(c => c.url.includes('dept=' + D1))); assert.equal(B.writes.length, 1); assert.ok(B.writes[0][0].endsWith(':bassam_last_export_v1'));
});

test('department export never downloads a partial or mismatched snapshot or continues after active department changed', async () => {
  for (const failure of ['stale', 'concurrent', 'dirty', 'missing', 'scope', 'rows', 'department', 'seized-missing', 'award-scope', 'award-rows']) {
    const B = browser('dept', failure); B.page.exportBackup(); await settle();
    assert.equal(B.files.length, 0, failure); assert.deepEqual(B.writes, [], failure);
  }
});
