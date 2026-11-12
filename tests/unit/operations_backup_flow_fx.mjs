/* Browser host only: actual 280/547/548 and AST-extracted callers run against
   the canonical Worker/SQLite. No retired-resource adapter or business queue. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parse } from 'acorn';
import { SRC } from './harness.mjs';
import { loadClient, until } from './k264_vm.mjs';
import { world as canonicalWorld, D1, D2, IDS, copy } from './custody_review_fx.mjs';
import { installOperationalFixture } from './operational_legacy_seed_fx.mjs';
export { D1, D2, IDS, copy };
export const scoped = (name, dept = D1) => 'bsdept:' + dept + ':' + name;
export const OPTIONS = scoped('bassam_options_v1');
export const optionValue = name => ({ type: [name], work: [] });
export function sourcePart(file, type, name) {
  const source = fs.readFileSync(path.join(SRC, file), 'utf8');
  const tree = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  const found = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === type && (node.key?.name || node.id?.name) === name) found.push(node);
    Object.values(node).forEach(value => Array.isArray(value) ? value.forEach(visit) : visit(value));
  }
  visit(tree);
  assert.equal(found.length, 1, 'One actual source member: ' + name);
  return source.slice(found[0].start, found[0].end);
}
export async function world() {
  const B = await canonicalWorld();
  assert.equal(B.W.KIVO_SCHEMA_VERSION, 10);
  await installOperationalFixture(B.env, B.W);
  return B;
}
export function ok(response) {
  assert.equal(response.status, 200, JSON.stringify(response.json));
  assert.equal(response.json.ok, 1, JSON.stringify(response.json));
  return response.json;
}
export const identity = B => ({
  users: copy(B.DB.q("SELECT * FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq")),
  permissions: copy(B.DB.q("SELECT * FROM kv WHERE k='bassam_perms_v1' ORDER BY seq")),
  sessions: copy(B.DB.q('SELECT * FROM sess ORDER BY tok')),
});
export const snapshot = B => Object.fromEntries(B.DB.q("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .map(({ name }) => [name, copy(B.DB.q('SELECT * FROM "' + name + '"'))]));
export const epoch = B => +B.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0;
export function posts(C, phase) {
  return C.requests.filter(request => request.method === 'POST' && request.url.split('?')[0] === '/api/backup/restore' && JSON.parse(request.body).phase === phase);
}
/* opt.images (V7-F): the fixture carries images — /api/img requests are allowed and the actual 360 image transport is loaded */
export async function browser(B, t, opt = {}) {
  const keys = B.DB.q('SELECT DISTINCT k FROM kv ORDER BY k').map(row => row.k);
  const initial = ok(await B.api('super', '/api/get?keys=' + encodeURIComponent(keys.join(','))));
  const requests = [], localWrites = [], toasts = [];
  let intercept, blob;
  const T = loadClient({
    boot: { srv: 1, cf: 1, uid: IDS.super, v: initial.v,
      keys: Object.fromEntries(Object.entries(initial.keys).filter(([, row]) => row.v !== null).map(([key, row]) => [key, row.v])),
      revs: Object.fromEntries(Object.entries(initial.keys).map(([key, row]) => [key, row.rev])) },
    jar: { cookie: 'bs_tok=TEST_ONLY_session_super' },
    C: { req: async (url, { method = 'GET', cookie, body } = {}) => {
      const parsed = new URL(url, 'http://x');
      assert.equal(parsed.origin, 'http://x', 'Only isolated Worker requests');
      if (!opt.images) assert.equal(/(?:\/api\/img|r2)/i.test(parsed.pathname), false, 'No image/R2 request');
      const request = { url: parsed.pathname + parsed.search, method, body };
      requests.push(request);
      const headers = new Headers({ Cookie: cookie });
      if (method !== 'GET') { headers.set('Origin', 'http://x'); headers.set('Content-Type', 'application/json'); }
      const response = await B.W.default.fetch(new Request(parsed, { method, headers, ...(body ? { body } : {}) }), B.env);
      const data = opt.images ? await response.clone().json().catch(() => ({})) : await response.clone().json();
      request.status = response.status; request.err = data.err;
      return intercept ? intercept(request, response) : response;
    } },
  });
  t.after(() => {
    T.dispose();
    assert.deepEqual(Object.keys(T.nativeLS()).filter(key => T.W.KIVO.__BS_SRV.operations.resources.includes(key.replace(/^bsdept:[^:]+:/, ''))), [], 'No Operations document reaches native storage');
  });
  const W = T.W, K = W.KIVO;
  W.document.hidden = true;
  W.AbortController = AbortController; W.URLSearchParams = URLSearchParams;
  W.Uint8Array = Uint8Array;
  W.URL = class extends URL { static createObjectURL(value) { blob = value; return 'blob:TEST_ONLY'; } static revokeObjectURL() {} };
  W.FileReader = class { readAsText(file) { this.result = JSON.stringify(file); this.onload(); } };
  W.confirm = () => true;
  const createElement = W.document.createElement;
  W.document.createElement = tag => Object.assign(createElement(tag), { click() {} });
  K.BassamAuth = { user: () => B.users.find(user => user.id === IDS.super), isSuper: () => true };
  K.BassamDepts = {
    active: () => D1, activeName: () => 'TEST_ONLY department one', list: () => B.keys.bassam_depts_v1,
    allScopedKeys: () => keys.filter(key => key.startsWith('bsdept:')),
    keysOf: dept => keys.filter(key => key.startsWith('bsdept:' + dept + ':')),
    raw: { getItem: key => W.localStorage.getItem(key),
      setItem: (key, value) => { localWrites.push({ key, value }); throw Error('No native overlay'); },
      removeItem: key => { localWrites.push({ key }); throw Error('No native overlay'); } },
  };
  const preload = await K.__BS_SRV.operations.read(K.__BS_SRV.operations.resources.map(name => scoped(name)));
  assert.equal(preload.ok, 1, 'Actual Operations read precedes frontend use');
  K.__BS_SRV.askReason = (_key, _caps, callback) => callback('TEST_ONLY actual backup review reason');
  K.bsConfirm = async () => true;
  K.BassamCrypt = { ok: () => true };
  if (opt.images) vm.runInContext(fs.readFileSync(path.join(SRC, 'services', '360-bassam-idb.js'), 'utf8'), T.ctx, { filename: '360-bassam-idb.js' });
  else K.BassamIDB = { allForBackup: async () => ({}), get: async () => { assert.fail('No images in this fixture'); } };
  async function read(route) {
    const response = await W.fetch(route), data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data)); assert.equal(data.ok, 1, JSON.stringify(data)); return data;
  }
  // These providers delegate directly to canonical HTTP. Mutation/validation of
  // business-domain exports stays in the actual services and Worker.
  let dailyRevision = 0;
  K.DailyStats = { refresh: async () => { const value = await read('/api/dstats'); dailyRevision = value.rev; return value.data; }, revision: () => dailyRevision };
  K.BassamNotif = { exportDomain: dept => read('/api/notifications/export' + (dept ? '?dept=' + encodeURIComponent(dept) : '')), refresh: () => read('/api/notifications') };
  for (const source of ['547-custody-api.js', '548-atomic-backup.js'])
    vm.runInContext(fs.readFileSync(path.join(SRC, 'services', source), 'utf8'), T.ctx, { filename: source });
  const page = { state: {}, setState(patch) { Object.assign(this.state, patch); }, bkToast: (...args) => toasts.push(args) };
  function method(file, name) { return vm.runInContext('({' + sourcePart(file, 'MethodDefinition', name) + '}).' + name, T.ctx); }
  function property(file, name) { return vm.runInContext('(function(){const s=true;return {' + sourcePart(file, 'Property', name) + '};})', T.ctx).call(page)[name]; }
  for (const name of ['_wpActor', '_irBackupCapture', '_irBackupFence']) page[name] = method('modules/admin/logic.js', name);
  page.bkCapNote = method('layouts/root-logic.js', 'bkCapNote');
  return { T, K, page, requests, localWrites, toasts, method, property, blob: () => blob,
    intercept: callback => { intercept = callback; }, read };
}
export async function fullExport(C) {
  C.property('modules/admin/logic.js', 'exportBackup')();
  assert.ok(await until(() => C.page._encPend || C.page.state.backupMsg, 10000, 10));
  assert.ok(C.page._encPend, JSON.stringify({ state: C.page.state, requests: C.requests }));
  return JSON.parse(C.page._encPend.json);
}
export function assertManifest4(C, file, departments, kind) {
  assert.equal(file.version, 4); assert.equal(file.manifest.version, 4); assert.equal(file.manifest.scope, kind);
  assert.deepEqual(file.manifest.departments.slice().sort(), departments.slice().sort());
  assert.equal(file.manifest.domains.operations, 1);
  assert.equal(file.domains.operations.length, 21 * departments.length);
  for (const dept of departments) assert.equal(file.domains.operations.filter(domain => domain.scope.departmentId === dept).length, 21);
  assert.equal(Object.keys(file.data).some(key => C.K.__BS_SRV.operations.resources.includes(key.replace(/^bsdept:[^:]+:/, ''))), false);
  assert.deepEqual(file.idbImages, {});
  for (const route of ['irshad', 'seized', 'award', 'operations'])
    assert.ok(C.requests.some(request => request.url.startsWith('/api/' + route + '/export?') && request.status === 200), route + ' canonical HTTP export');
}
