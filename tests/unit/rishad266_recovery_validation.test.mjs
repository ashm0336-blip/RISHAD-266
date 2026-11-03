/* A verifier status string must never authorize recovery, reset, or current-PIN checks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { parse } from 'acorn';
import { D1Shim, ROOT } from './harness.mjs';

const KEY = 'bassam_auth_users_v1';
const PIN = String(500000 + 83927);
const NEW_PIN = String(300000 + 94827);
const RECOVERY_KEY = 'A'.repeat(20); // Synthetic data used only in the isolated in-memory database.
const UNSUPPORTED = 'p2$100001$' + 'a'.repeat(32) + '$' + 'b'.repeat(64);
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const item of node) walk(item, visit); return; }
  visit(node);
  for (const value of Object.values(node)) if (value && typeof value === 'object') walk(value, visit);
}
function declaration(source, name) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const node = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === name);
  assert.ok(node, 'Missing canonical function: ' + name);
  return source.slice(node.start, node.end);
}
function resetRoute(source) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  let found;
  walk(ast, node => {
    if (node.type !== 'IfStatement') return;
    let matches = false;
    walk(node.test, child => { if (child.type === 'Literal' && child.value === '/api/reset') matches = true; });
    if (matches) found = node;
  });
  assert.ok(found, 'Missing canonical reset route');
  return 'async function resetOnly(request,env,path,url,AX,superX){ var nowX=Date.now();\n' + source.slice(found.start, found.end) + '\nreturn null; }';
}
function world() {
  const DB = new D1Shim();
  DB.exec(read('migrations/0001_baseline.sql'));
  const context = vm.createContext({
    crypto: webcrypto, TextEncoder, Response, Uint8Array,
    PBKDF2_ITER: 100000, PBKDF2_MAX: 100000, PW_MIN: 6, CHUNK: 80000,
    K_USERS: KEY, K_PERM: 'test-permissions', K_DEPTS: 'test-departments',
    K_GDEPTS: 'test-general-departments', K_PLAT: 'test-platform', ERR_ITER: 'unsupported hash',
    bodyCheck: () => null, bodyRead: async request => ({ v: await request.json() }), tkRoutePath: () => false,
    guardLeft: async () => 0, guardFail: async () => {}, guardCount: async () => {}, guardReset: async () => {},
    reqMeta: () => ({ ip: 'unit-test', city: '', dev: '' }), secAr: String, secLog: async () => {},
    setCookie: () => ({}), clearCookie: () => ({}), redactPh: value => value, swallow: () => {},
  });
  const storage = read('workers/parts/054-image-contract.js');
  const identity = read('workers/parts/016-identity-preflight-2.js');
  vm.runInContext(read('workers/parts/052-aud-events.js') + '\n' +
    ['metaGet', 'revsAll', 'revGuard', 'isRevConflict', 'nextRev', 'usersList'].map(name => declaration(storage, name)).join('\n') + '\n' +
    declaration(identity, 'normKey') + '\n' + read('workers/parts/062a-auth-routes.js') + '\n' +
    /* schema 10: the /api/reset branch in 063 delegates to the canonical rsResetRoute (019e) — load it verbatim */
    declaration(read('workers/parts/019e-atomic-save.js'), 'rsResetRoute') + '\n' +
    resetRoute(read('workers/parts/063-enf-api-and-handler.js')), context);
  return { DB, env: { DB }, context };
}
async function seed(W, recoveryHash, accountHash) {
  const user = { id: 'fixture-super', un: '0501234567', role: 'super', name: 'TEST_ONLY owner', ph: accountHash || await W.context.hashPw(PIN) };
  await W.DB.batch(W.context.kvPutStmts(W.env, 'kv', KEY, JSON.stringify([user])));
  W.DB.db.prepare('INSERT INTO revs(k,rev) VALUES(?,?)').run(KEY, 1);
  W.DB.db.prepare('INSERT INTO meta(k,v) VALUES(?,?)').run('rev', '1');
  W.DB.db.prepare('INSERT INTO meta(k,v) VALUES(?,?)').run('rk', recoveryHash);
  W.DB.db.prepare('INSERT INTO meta(k,v) VALUES(?,?)').run('rk_uid', user.id);
  return user;
}
const usersText = W => W.DB.q('SELECT v FROM kv WHERE k=? ORDER BY seq', KEY).map(r => r.v).join('');
function request(route, body) {
  const url = new URL('https://example.invalid' + route);
  return { url, request: new Request(url, { method: 'POST', body: JSON.stringify(body) }) };
}

test('An unsupported recovery hash rejects an incorrect key without changing credentials or consuming the key', async () => {
  const W = world(); await seed(W, UNSUPPORTED);
  const before = usersText(W);
  const R = request('/api/recover', { key: RECOVERY_KEY, pw: NEW_PIN });
  const result = await W.context.authPublicRoutes(R.request, W.env, R.url.pathname, R.url);
  assert.equal((await result.json()).ok, 0);
  assert.equal(usersText(W), before);
  assert.equal(W.DB.q("SELECT v FROM meta WHERE k='rk'")[0].v, UNSUPPORTED);
  assert.equal(W.DB.q('SELECT COUNT(*) AS n FROM sess')[0].n, 0);
});

test('A verified recovery key still changes the PIN and invalidates the one-time recovery key', async () => {
  const W = world();
  await seed(W, await W.context.hashPw('rk:' + RECOVERY_KEY));
  const R = request('/api/recover', { key: RECOVERY_KEY, pw: NEW_PIN });
  const result = await W.context.authPublicRoutes(R.request, W.env, R.url.pathname, R.url);
  assert.equal((await result.json()).ok, 1);
  const account = JSON.parse(usersText(W))[0];
  assert.equal(await W.context.verifyPw(NEW_PIN, account.ph), true);
  assert.equal(await W.context.verifyPw(PIN, account.ph), false);
  assert.equal(W.DB.q("SELECT COUNT(*) AS n FROM meta WHERE k='rk'")[0].n, 0);
});

test('An unsupported account hash cannot authorize login or current-PIN confirmation', async () => {
  const W = world(); const user = await seed(W, UNSUPPORTED, UNSUPPORTED);
  const L = request('/api/login', { u: user.un, p: PIN });
  const response = await W.context.authPublicRoutes(L.request, W.env, L.url.pathname, L.url);
  assert.equal((await response.json()).ok, 0);
  assert.equal(response.headers.has('set-cookie'), false);
  const C = request('/api/checkpw', { p: PIN });
  const checked = await W.context.authSessionRoutes(C.request, W.env, C.url.pathname, { uid: user.id });
  assert.equal((await checked.json()).ok, 0);
  assert.equal(W.DB.q('SELECT COUNT(*) AS n FROM sess')[0].n, 0);
});

test('The authenticated reset route cannot accept an unsupported recovery-key hash as confirmation', async () => {
  const W = world(); const user = await seed(W, UNSUPPORTED);
  const before = usersText(W);
  const R = request('/api/reset', { pw: PIN, key: RECOVERY_KEY, confirm: 'تهيئة', admin: { un: user.un, name: 'TEST_ONLY replacement', pw: NEW_PIN } });
  const result = await W.context.resetOnly(R.request, W.env, R.url.pathname, R.url, { u: user, users: [user] }, true);
  assert.equal((await result.json()).ok, 0);
  assert.equal(usersText(W), before);
  assert.equal(W.DB.q("SELECT v FROM meta WHERE k='rk'")[0].v, UNSUPPORTED);
});
