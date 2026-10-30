/* KIVO_263 · SOT-173 — أداةُ الاختبار محميةٌ على Preview ومستبعَدةٌ من حزمة الإنتاج:
   (أ) العاملُ المرشّح: الأداةُ تعمل بشروطها كلّها فقط (ENV الإنفاذ ∧ KIVO_TEST_FIXTURE=allow ∧ مضيفُ الاختبار ∧ مديرُ النظام ∧ حسابُ TEST_ONLY) — وبغير المضيف 404
   (ب) عاملُ الإنتاج (tools/prod_strip.py): 404 not-found حتى مع المتغيّرات كلّها والمضيف — الكودُ غيرُ موجود */
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeLegacyTestEnv as makeEnv, client, applySql, ROOT, WORKER, since } from './harness.mjs';
function seed() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_ps_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', '1448-5-12', '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
async function tryTool(workerPath, host) {
  const W = (await import(pathToFileURL(workerPath).href + '?ps=' + Math.random())).default;
  const env = makeEnv({ KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' });
  const base = 'http://' + host;
  const C = client(env, base); C.req = async (p, o = {}) => { const h = Object.assign({ 'Content-Type': 'application/json', origin: base }, o.headers || {}); if (o.cookie) h.cookie = o.cookie; return W.fetch(new Request(base + p, { method: o.method || 'GET', headers: h, body: o.body === undefined ? undefined : JSON.stringify(o.body) }), env); };
  const jr = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { __t: t.slice(0, 100) }; } };
  const lr = await C.req('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' } }); const ck = (lr.headers.get('set-cookie') || '').split(';')[0];
  await applySql(env.DB, seed()); env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const r = await C.req('/api/authz-test', { method: 'POST', cookie: ck, body: { uid: 'tst_emp1', path: '/api/whoami', method: 'GET' } });
  return { status: r.status, j: await jr(r) };
}
test('(أ) المرشّح: الأداةُ على مضيف الاختبار تعمل · وعلى غيره 404', since(163), async () => {
  const a = await tryTool(WORKER, 'test.kivo-d81.pages.dev'); assert.equal(a.status, 200, JSON.stringify(a.j)); assert.equal(a.j.ok, 1); assert.equal(a.j.uid, 'tst_emp1');
  const b = await tryTool(WORKER, 'kivo-d81.pages.dev'); assert.equal(b.status, 404, 'مضيفُ الإنتاج ⇒ 404'); assert.equal(b.j.err, 'not-found');
});
test('(ب) حزمةُ الإنتاج: 404 حتى بكل الشروط · الكودُ مستبعَد', since(163), async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_ps_')); fs.copyFileSync(WORKER, path.join(d, '_worker.js'));
  execFileSync(PYTHON, [path.join(ROOT, 'tools', 'prod_strip.py'), d], { stdio: 'pipe' });
  const pw = path.join(d + '.prod', '_worker.js'); const txt = fs.readFileSync(pw, 'utf8');
  assert.ok(!txt.includes('enfIsTestUser(tu)') && !txt.includes('@@KIVO_TEST_TOOL'), 'الكودُ غائب');
  const p = path.join(d + '.prod', '_worker.mjs'); fs.copyFileSync(pw, p);
  const a = await tryTool(p, 'test.kivo-d81.pages.dev'); assert.equal(a.status, 404, JSON.stringify(a.j)); assert.equal(a.j.err, 'not-found');
});
