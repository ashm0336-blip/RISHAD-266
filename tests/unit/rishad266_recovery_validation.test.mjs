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
    guardLeft: async () => 0, guardFail: async () => {}, guardCount: async () => {}, guardReset: async () => {}, THR_ON: false, guardOk: async () => {},   /* v7-C issue 2: the login route reads these globals */
    reqMeta: () => ({ ip: 'unit-test', city: '', dev: '' }), secAr: String, secLog: async () => {},
    setCookie: () => ({}), clearCookie: () => ({}), redactPh: value => value, swallow: () => {},
  });
  const storage = read('workers/parts/054-image-contract.js');
  const identity = read('workers/parts/000-header-constants.js');   /* RISHAD-266 P5: normKey moved from 016 unchanged */
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

/* RISHAD-266 (2026-11-04) · /api/recover writes the account list under the approved revision guard (as login does). */
test('Recovery racing a concurrent account save writes nothing, keeps the one-time key, and answers 409', async () => {
  const W = world();
  await seed(W, await W.context.hashPw('rk:' + RECOVERY_KEY));
  const other = { id: 'TEST_ONLY_other', un: '0509999999', role: 'staff', name: 'TEST_ONLY saved concurrently', ph: 'x' };
  /* the competing save lands after the route read the list and before its batch commits */
  const batch = W.DB.batch.bind(W.DB); let raced = false;
  W.DB.batch = async (stmts) => {
    if (!raced && stmts.some(s => /DELETE FROM meta WHERE k IN/.test(s.sql))) {
      raced = true;
      const cur = JSON.parse(usersText(W)); cur.push(other);
      await batch(W.context.kvPutStmts(W.env, 'kv', KEY, JSON.stringify(cur)).concat([W.DB.prepare('UPDATE revs SET rev = rev + 1 WHERE k = ?1').bind(KEY)]));
    }
    return batch(stmts);
  };
  const R = request('/api/recover', { key: RECOVERY_KEY, pw: NEW_PIN });
  const result = await W.context.authPublicRoutes(R.request, W.env, R.url.pathname, R.url);
  assert.equal(result.status, 409);
  assert.equal((await result.json()).ok, 0);
  assert.ok(raced, 'the concurrent save was injected');
  const accounts = JSON.parse(usersText(W));
  assert.ok(accounts.some(a => a.id === other.id), 'the concurrent save is not lost');
  assert.equal(await W.context.verifyPw(PIN, accounts.find(a => a.id === 'fixture-super').ph), true, 'the PIN is unchanged');
  assert.equal(W.DB.q("SELECT COUNT(*) AS n FROM meta WHERE k='rk'")[0].n, 1, 'the one-time key is not consumed');
  /* the retry succeeds on the fresh list and keeps the concurrent account */
  W.DB.batch = batch;
  const R2 = request('/api/recover', { key: RECOVERY_KEY, pw: NEW_PIN });
  assert.equal((await (await W.context.authPublicRoutes(R2.request, W.env, R2.url.pathname, R2.url)).json()).ok, 1);
  const after = JSON.parse(usersText(W));
  assert.ok(after.some(a => a.id === other.id));
  assert.equal(await W.context.verifyPw(NEW_PIN, after.find(a => a.id === 'fixture-super').ph), true);
  assert.equal(W.DB.q("SELECT COUNT(*) AS n FROM meta WHERE k='rk'")[0].n, 0);
});

/* V7 · د5-هـ (أمن ٢): كان Promise.all يترك الترتيبَ للتوقيت — الآن يُفرض التداخل: الطلبان يتحقّقان من المفتاح كلاهما قبل أن يكتب أيٌّ منهما
   (حاجزٌ على verifyPw للمفتاح)، ثم يكتبان — فالدفعةُ الثانية ترى ما كتبته الأولى. */
const recover = (W, pin) => { const R = request('/api/recover', { key: RECOVERY_KEY, pw: pin }); return W.context.authPublicRoutes(R.request, W.env, R.url.pathname, R.url); };
function keyBarrier(W, n) {   /* the first n recovery-key verifications wait for each other */
  const real = W.context.verifyPw; let seen = 0, open; const all = new Promise((r) => { open = r; });
  W.context.verifyPw = async (pw, ph) => { const v = await real(pw, ph); if (String(pw).startsWith('rk:') && seen < n) { if (++seen === n) open(); await all; } return v; };
  return () => { W.context.verifyPw = real; };
}
test('Two concurrent recoveries with the same key: exactly one succeeds and the stored PIN is the winner\'s', async () => {
  const W = world();
  await seed(W, await W.context.hashPw('rk:' + RECOVERY_KEY));
  const PIN_A = String(400000 + 61728), PIN_B = String(700000 + 15926);
  const done = keyBarrier(W, 2);
  const [ra, rb] = await Promise.all([recover(W, PIN_A), recover(W, PIN_B)]); done();
  const ja = await ra.json(), jb = await rb.json();
  assert.equal([ja.ok, jb.ok].filter(x => x === 1).length, 1, 'exactly one recovery succeeds: ' + JSON.stringify([ra.status, ja, rb.status, jb]));
  assert.equal((ja.ok === 1 ? rb : ra).status, 409, 'the other is a clear conflict');
  const winner = ja.ok === 1 ? PIN_A : PIN_B, loser = ja.ok === 1 ? PIN_B : PIN_A;
  const ph = JSON.parse(usersText(W)).find(a => a.id === 'fixture-super').ph;
  assert.equal(await W.context.verifyPw(winner, ph), true);
  assert.equal(await W.context.verifyPw(loser, ph), false);
  assert.equal(W.DB.q("SELECT COUNT(*) AS n FROM meta WHERE k='rk'")[0].n, 0);
});

/* V7 · د5-هـ (أمن ٢ · السباق ١): الاستعادةُ الأولى تكتمل (تستهلك المفتاح) بين تحقّق الثانية من المفتاح وقراءتها للحسابات — كانت الثانية
   تقرأ نسخةَ الحسابات الجديدة فيمرّ حارسُها وتنجح بمفتاحٍ مُستهلَك (استعمالان لمفتاحٍ واحد). الآن حارسُ المفتاح نفسِه في الدفعة. */
test('A recovery key is used exactly once: a recovery that finishes between another one\'s key check and its write wins alone', async () => {
  const W = world();
  await seed(W, await W.context.hashPw('rk:' + RECOVERY_KEY));
  const PIN_A = String(400000 + 61728), PIN_B = String(700000 + 15926);
  const real = W.context.verifyPw; let ra = null;
  W.context.verifyPw = async (pw, ph) => { const v = await real(pw, ph); if (String(pw).startsWith('rk:') && !ra) { ra = 'running'; ra = await recover(W, PIN_A); } return v; };
  const rb = await recover(W, PIN_B); W.context.verifyPw = real;
  const ja = await ra.json(), jb = await rb.json();
  assert.equal(ja.ok, 1, 'the recovery that finished first succeeds: ' + JSON.stringify(ja));
  assert.equal(jb.ok, 0, '★ the second use of the same key is refused: ' + JSON.stringify(jb)); assert.equal(rb.status, 409);
  const ph = JSON.parse(usersText(W)).find(a => a.id === 'fixture-super').ph;
  assert.equal(await W.context.verifyPw(PIN_A, ph), true, 'the stored PIN is the first recovery\'s');
  assert.equal(await W.context.verifyPw(PIN_B, ph), false);
});

/* V7 · د5-هـ (أمن ٢ · السباق ٢): مفتاحٌ جديد يصدر بين تحقّق الاستعادة من المفتاح القديم وكتابتها — كانت الاستعادةُ تنجح وتحذف المفتاحَ الجديد
   (يُعرض للمدير ثم لا يعمل). الآن: المفتاحُ الذي تحقّقت منه لم يعد المخزَّن ⇒ 409 لا يُكتب شيء، والمفتاحُ الجديد باقٍ. */
test('A recovery never deletes a key newer than the one it verified', async () => {
  const W = world();
  await seed(W, await W.context.hashPw('rk:' + RECOVERY_KEY));
  const NEWER = await W.context.hashPw('rk:' + 'B'.repeat(20));
  const real = W.context.verifyPw; let issued = false;
  W.context.verifyPw = async (pw, ph) => { const v = await real(pw, ph); if (String(pw).startsWith('rk:') && !issued) { issued = true; W.DB.db.prepare("UPDATE meta SET v = ? WHERE k = 'rk'").run(NEWER); } return v; };
  const before = usersText(W);
  const r = await recover(W, NEW_PIN); W.context.verifyPw = real;
  assert.equal(r.status, 409, 'the verified key is no longer the stored one'); assert.equal((await r.json()).ok, 0);
  assert.equal(W.DB.q("SELECT v FROM meta WHERE k='rk'")[0].v, NEWER, '★ the newer key is kept');
  assert.equal(usersText(W), before, 'nothing written');
});
