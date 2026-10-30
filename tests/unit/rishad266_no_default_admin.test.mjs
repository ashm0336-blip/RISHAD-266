/* RISHAD 266 — regression gate: a fresh cloud database never provisions a user through public login. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');

test('blank database denies default credentials without any DB write', async () => {
  const source = read('workers/parts/062a-auth-routes.js');
  let writes = 0, guards = 0;
  const DB = { prepare: () => { writes++; throw new Error('unexpected database access'); }, batch: () => { writes++; throw new Error('unexpected database mutation'); } };
  const context = {
    json: (body, status = 200) => new Response(JSON.stringify(body), {status}),
    bodyCheck: () => null, usersList: async () => null,
    guardLeft: async () => 0, guardFail: async () => {guards++;},
    guardCount: async () => {}, reqMeta: () => ({ip: 'test', city:'', dev:''}),
    secAr: String, revsAll: async () => ({}), K_USERS: 'bassam_auth_users_v1',
  };
  const fn = vm.runInNewContext(source + '\nauthPublicRoutes;', context);
  const uri = new URL('https://example.invalid/api/login');
  for (const creds of [{u: 'admin', p: 'admin'}, {u:'any-user',p:'any-secret'}]) {
    const req = new Request(uri, {method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify(creds)});
    const res = await fn(req, {DB}, '/api/login', uri);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, 0);
    assert.match(data.err, /غير صحيحة/);
  }
  assert.equal(writes, 0, 'blank database login MUST NOT mutate any table');
  assert.equal(guards, 4, 'failed attempts are counted');
});

test('no default account seeding in browser or Worker and no offline storage fallback', () => {
  const authClient = read('src/auth/330-auth.js');
  const authWorker = read('workers/parts/062a-auth-routes.js');
  const storage = read('src/api/280-server-storage.js');
  const gate = read('src/auth/335-identity-gate.js');
  assert.doesNotMatch(authClient, /if\s*\(!rawUsers\(\)\)\s*writeUsers/);
  assert.doesNotMatch(authWorker, /legacyHash\(['"]admin['"]\)|un\s*===\s*['"]admin['"]\s*&&\s*pw/);
  assert.doesNotMatch(gate, /admin\s*\/\s*admin/);
  assert.doesNotMatch(storage, /function\s+(demoMode|cloudOrigin9|noServer9)\s*\(/);
  assert.match(storage, /BOOT\.srv !== 1 \|\| BOOT\.cf !== 1/);
  assert.match(storage, /__BS_STORAGE_FAIL\s*=\s*'cloud-boot-required'/);
});

test('checked-in Worker is exactly the concatenation of canonical parts', () => {
  const list = JSON.parse(read('workers/parts.json')).parts;
  const compiled = list.map(({file}) => read('workers/parts/' + file)).join('');
  assert.equal(read('workers/_worker.js'), compiled);
});
