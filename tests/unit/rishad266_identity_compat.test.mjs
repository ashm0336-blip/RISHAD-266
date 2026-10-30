/* Phase 4 merge regression: preserve existing identities without restoring default users. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { pbkdf2Sync, webcrypto } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { D1Shim } from './harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const KEY = 'bassam_auth_users_v1';
const FIXTURE_PIN = '583927';

function declaration(source, name) {
  const rx = new RegExp('^(?:async )?function ' + name + '\\([^\\n]*\\) \\{(?:[^\\n]*\\} *$|[\\s\\S]*?^\\})', 'm');
  const found = rx.exec(source);
  assert.ok(found, 'missing canonical declaration: ' + name);
  return found[0];
}

function world() {
  const DB = new D1Shim();
  DB.exec(read('migrations/0001_baseline.sql'));
  const context = vm.createContext({
    crypto: webcrypto, TextEncoder, Response, Uint8Array,
    PBKDF2_ITER: 100000, PBKDF2_MAX: 100000, PW_MIN: 6, CHUNK: 80000,
    K_USERS: KEY, K_PERM: 'test-permissions', K_DEPTS: 'test-departments', K_GDEPTS: 'test-general-departments', K_PLAT: 'test-platform',
    ERR_ITER: 'unsupported password hash iterations',
    bodyCheck: () => null, guardLeft: async () => 0,
    guardFail: async () => {}, guardCount: async () => {}, guardReset: async () => {},
    reqMeta: () => ({ ip: 'unit-test', city: '', dev: '' }),
    secAr: String, secLog: async () => {}, setCookie: (token) => ({ 'Set-Cookie': 'fixture=' + token }),
    redactPh: (value) => value, swallow: () => {},
  });
  const storage = read('workers/parts/054-image-contract.js');
  vm.runInContext(read('workers/parts/052-aud-events.js') + '\n' +
    ['revsAll', 'revGuard', 'isRevConflict', 'nextRev', 'usersList'].map((name) => declaration(storage, name)).join('\n') + '\n' +
    read('workers/parts/062a-auth-routes.js'), context);
  return { DB, env: { DB }, context };
}

async function seed(W, list, revision = 7) {
  await W.DB.batch(W.context.kvPutStmts(W.env, 'kv', KEY, JSON.stringify(list)));
  W.DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?, ?)').run(KEY, revision);
  W.DB.db.prepare("INSERT INTO meta (k, v) VALUES ('rev', ?)").run(String(revision));
}

async function login(W, username, password) {
  const url = new URL('https://example.invalid/api/login');
  const request = new Request(url, { method: 'POST', body: JSON.stringify({ u: username, p: password }) });
  const response = await W.context.authPublicRoutes(request, W.env, url.pathname, url);
  const result = await response.json();
  Object.defineProperty(result, 'cookiePresent', { value: response.headers.has('set-cookie') });
  return result;
}

test('existing prefixed/unprefixed legacy hashes and lower-iteration PBKDF2 remain readable', async () => {
  const W = world();
  const old = W.context.legacyHash(FIXTURE_PIN);
  assert.equal(await W.context.verifyPw(FIXTURE_PIN, old), true);
  assert.equal(await W.context.verifyPw(FIXTURE_PIN, 'p1$' + old), true);
  assert.equal(await W.context.verifyPw('wrong-fixture', old), false);
  const salt = Buffer.alloc(16, 9);
  const lowerIterationHash = 'p2$1000$' + salt.toString('hex') + '$' +
    pbkdf2Sync(FIXTURE_PIN, salt, 1000, 32, 'sha256').toString('hex');
  assert.equal(await W.context.verifyPw(FIXTURE_PIN, lowerIterationHash), true);
  assert.equal(await W.context.verifyPw(FIXTURE_PIN, lowerIterationHash.replace('$1000$', '$100001$')), 'unsupported');
  assert.equal(await W.context.verifyPw(FIXTURE_PIN, 'p2$100000'), false);
});

for (const role of ['staff', 'dept', 'gm', 'super']) {
  test('legacy login upgrades the hash while preserving existing identity and role: ' + role, async () => {
    const W = world();
    const user = { id: 'existing-' + role, un: '0501234567', role, name: 'Fixture User', deptId: 'D1', gid: 'G1', ekey: 'employee-1', ph: 'p1$' + W.context.legacyHash(FIXTURE_PIN) };
    await seed(W, [user]);
    const result = await login(W, user.un, FIXTURE_PIN);
    assert.equal(result.ok, 1);
    assert.equal(result.role, role);
    const stored = (await W.context.usersList(W.env))[0];
    const { ph: storedHash, ...storedIdentity } = JSON.parse(JSON.stringify(stored));
    const { ph: oldHash, ...originalIdentity } = user;
    assert.deepEqual(storedIdentity, originalIdentity);
    assert.match(stored.ph, /^p2\$100000\$/);
    assert.equal(await W.context.verifyPw(FIXTURE_PIN, stored.ph), true);
    assert.ok(W.DB.q('SELECT rev FROM revs WHERE k=?', KEY)[0].rev > 7);
  });
}

test('a concurrent identity edit wins over the login-time legacy hash upgrade', async () => {
  const W = world();
  const user = { id: 'existing-user', un: '0501234567', role: 'staff', deptId: 'D1', name: 'Before', ph: 'p1$' + W.context.legacyHash(FIXTURE_PIN) };
  await seed(W, [user]);
  const edited = { ...user, name: 'Concurrent account edit', deptId: 'D2' };
  const batch = W.DB.batch.bind(W.DB);
  let raced = false;
  W.DB.batch = async (statements) => {
    if (!raced && statements.some((statement) => statement.sql.includes('KIVO_REV_CONFLICT'))) {
      raced = true;
      await batch(W.context.kvPutStmts(W.env, 'kv', KEY, JSON.stringify([edited])));
      W.DB.db.prepare('UPDATE revs SET rev=9 WHERE k=?').run(KEY);
    }
    return batch(statements);
  };
  const result = await login(W, user.un, FIXTURE_PIN);
  assert.equal(result.ok, 1);
  assert.equal(raced, true);
  assert.equal(result.deptId, edited.deptId);
  const saved = JSON.parse(JSON.stringify(await W.context.usersList(W.env)))[0];
  assert.deepEqual({ ...saved, ph: undefined }, { ...edited, ph: undefined });
  assert.match(saved.ph, /^p2\$100000\$/);
  assert.equal(W.DB.q('SELECT rev FROM revs WHERE k=?', KEY)[0].rev, 9);
});

function initialUser(W, ph) {
  return { id: 'existing-user', un: '0501234567', role: 'staff', deptId: 'D1', name: 'Fixture User', ph: ph || 'p1$' + W.context.legacyHash(FIXTURE_PIN) };
}

function raceBeforeAuthenticationCommit(W, edit, repeat = false) {
  const batch = W.DB.batch.bind(W.DB);
  let edits = 0;
  W.DB.batch = async (statements) => {
    if ((!edits || repeat) && statements.some((s) => s.sql.includes('KIVO_REV_CONFLICT')) && statements.some((s) => /INSERT INTO sess/.test(s.sql))) {
      assert.match(statements[0].sql, /KIVO_REV_CONFLICT/, 'authentication snapshot guard must precede session creation in the same batch');
      edits++;
      const current = JSON.parse(JSON.stringify(await W.context.usersList({ DB: W.DB })));
      const changed = await edit(current, edits);
      await batch(W.context.kvPutStmts(W.env, 'kv', KEY, JSON.stringify(changed)));
      const revision = W.DB.q('SELECT rev FROM revs WHERE k=?', KEY)[0].rev + 1;
      W.DB.db.prepare('UPDATE revs SET rev=? WHERE k=?').run(revision, KEY);
    }
    return batch(statements);
  };
  return () => edits;
}

for (const mutation of ['password-reset', 'disable', 'delete']) {
  test('concurrent ' + mutation + ' prevents issuing a session from a verified legacy snapshot', async () => {
    const W = world(), user = initialUser(W);
    await seed(W, [user]);
    // Exercise a real cached request snapshot too: retries must not reread its stale identities.
    W.env.__pre = { live: true, kv: { [KEY]: JSON.stringify([user]) }, revs: { [KEY]: 7 } };
    const newHash = await W.context.hashPw('394827');
    raceBeforeAuthenticationCommit(W, (list) => mutation === 'delete' ? [] : list.map((u) =>
      mutation === 'disable' ? { ...u, dis: 1 } : { ...u, ph: newHash }));
    const result = await login(W, user.un, FIXTURE_PIN);
    assert.equal(result.ok, 0);
    assert.equal(result.cookiePresent, false);
    assert.equal(W.DB.q('SELECT count(*) AS n FROM sess')[0].n, 0);
    const actual = JSON.parse(JSON.stringify(await W.context.usersList({ DB: W.DB })));
    if (mutation === 'delete') assert.equal(actual, null);
    else if (mutation === 'disable') assert.equal(actual[0].dis, 1);
    else {
      assert.equal(actual[0].ph, newHash);
      assert.equal((await login(W, user.un, '394827')).ok, 1, 'the replacement credentials remain usable');
    }
  });
}

test('concurrent role and department changes are rechecked before the session response', async () => {
  const W = world(), user = initialUser(W);
  await seed(W, [user]);
  raceBeforeAuthenticationCommit(W, (list) => list.map((u) => ({ ...u, role: 'dept', deptId: 'D2', mc: 1 })));
  const result = await login(W, user.un, FIXTURE_PIN);
  assert.equal(result.ok, 1);
  assert.equal(result.role, 'dept');
  assert.equal(result.deptId, 'D2');
  assert.equal(result.mustChange, 1);
  assert.equal(W.DB.q('SELECT count(*) AS n FROM sess')[0].n, 1);
  const stored = (await W.context.usersList(W.env))[0];
  assert.equal(stored.role, 'dept');
  assert.equal(stored.deptId, 'D2');
  assert.equal(stored.mc, 1);
});

test('password reset during modern-hash login is guarded with session creation too', async () => {
  const W = world();
  const user = initialUser(W, await W.context.hashPw(FIXTURE_PIN));
  await seed(W, [user]);
  const replacement = await W.context.hashPw('394827');
  raceBeforeAuthenticationCommit(W, (list) => list.map((u) => ({ ...u, ph: replacement })));
  const result = await login(W, user.un, FIXTURE_PIN);
  assert.equal(result.ok, 0);
  assert.equal(result.cookiePresent, false);
  assert.equal(W.DB.q('SELECT count(*) AS n FROM sess')[0].n, 0);
});

test('two concurrent legacy logins preserve the account and each create a guarded session', async () => {
  const W = world(), user = initialUser(W);
  await seed(W, [user]);
  const results = await Promise.all([login(W, user.un, FIXTURE_PIN), login(W, user.un, FIXTURE_PIN)]);
  assert.ok(results.every((result) => result.ok === 1 && result.cookiePresent));
  assert.equal(W.DB.q('SELECT count(*) AS n FROM sess')[0].n, 2);
  const stored = (await W.context.usersList(W.env))[0];
  assert.deepEqual({ ...JSON.parse(JSON.stringify(stored)), ph: undefined }, { ...user, ph: undefined });
  assert.match(stored.ph, /^p2\$100000\$/);
  assert.equal(await W.context.verifyPw(FIXTURE_PIN, stored.ph), true);
});

test('continuous account edits exhaust a bounded retry without issuing a session', async () => {
  const W = world(), user = initialUser(W);
  await seed(W, [user]);
  const edits = raceBeforeAuthenticationCommit(W, (list, n) => list.map((u) => ({ ...u, name: 'Concurrent fixture edit ' + n })), true);
  const result = await login(W, user.un, FIXTURE_PIN);
  assert.equal(result.ok, 0);
  assert.equal(result.cookiePresent, false);
  assert.equal(edits(), 3);
  assert.equal(W.DB.q('SELECT count(*) AS n FROM sess')[0].n, 0);
  assert.equal((await W.context.usersList(W.env))[0].name, 'Concurrent fixture edit 3');
});

test('forced password-change screen renders the original role-specific policy', () => {
  const source = read('src/auth/335-identity-gate.js');
  const client = read('src/auth/330-auth.js');
  const policy = client.slice(client.indexOf('function pinRole('), client.indexOf('/* ── المستخدمون'));
  const aliases = source.slice(source.indexOf('  var D = I.D'), source.indexOf('  /* ═══ توحيد'));
  const render = source.slice(source.indexOf('  function gate(){'), source.indexOf('    document.body.appendChild(w);')) + '\nreturn w.innerHTML;\n}';
  for (const role of ['staff', 'dept', 'gm', 'super']) {
    const context = vm.createContext({
      PW_MIN: 6, KIVO: {},
      document: { head: { appendChild() {} }, getElementById: () => null, createElement: () => ({ setAttribute() {} }) },
    });
    const html = vm.runInContext(policy + '\nvar I={u0:{role:' + JSON.stringify(role) + ',un:"0501234567"},unCheck,pwCheck,pwRuleText};\n' + aliases + '\n' + render + '\ngate();', context);
    assert.ok(html.includes(role === 'staff' || role === 'gm' ? '5 أو 6 أرقام' : '6 أرقام'));
  }
});

test('first-administrator CLI actually runs on Windows and reports missing arguments', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'tools/provision_first_admin.mjs')], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
  assert.equal(result.stdout, '');
});
