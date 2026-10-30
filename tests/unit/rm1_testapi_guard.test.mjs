/* RM-1 · ADR-004 · SOT-186 / AUD-002 — أداةُ الاختبار الداخلية: قيدُ المضيف · عمرُ جلسة الاختبار · الكنسُ الدفاعي */
import os from 'node:os';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, makeEnv, TEST_SUPER_USERNAME, TEST_SUPER_PIN, client, applySql, ROOT } from './harness.mjs';
const TMP = process.env.TMPDIR || os.tmpdir();
function fixture() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const today = o.year + '-' + o.month + '-' + o.day, out = TMP + '/kivo_fx_' + process.pid; fs.mkdirSync(out, { recursive: true });
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', today, '--out', out], { stdio: 'pipe' });
  return { seed: fs.readFileSync(out + '/test_seed.sql', 'utf8'), fx: JSON.parse(fs.readFileSync(out + '/fixture.json', 'utf8')) };
}
async function setup(extraEnv = {}) {
  const env = makeTestEnv(Object.assign({ KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' }, extraEnv)); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارةٌ قائمة', gid: '' }]) });
  await applySql(env.DB, fixture().seed);
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  return { env, C, su };
}
const call = (C, ck, base) => C.api('/api/authz-test', { method: 'POST', cookie: ck, base, body: { uid: 'tst_emp1', path: '/api/whoami' } });

test('قيدُ المضيف: Production مرفوض دائماً · مضيفُ Preview (test.*) ومضيفٌ محلي مسموحان · KIVO_TEST_HOST يحصر المضيف', async () => {
  const { C, su } = await setup();
  assert.equal((await call(C, su.ck, 'https://kivo-d81.pages.dev')).status, 404, 'مضيفُ Production ⇒ 404 (كأن المسار غيرُ موجود)');
  assert.equal((await call(C, su.ck, 'https://evil.example.com')).status, 404, 'مضيفٌ غريب ⇒ 404');
  const t = await call(C, su.ck, 'https://test.kivo-d81.pages.dev'); assert.equal(t.status, 200, 'مضيفُ Preview ⇒ يعمل'); assert.equal(t.j.ok, 1); assert.equal(t.j.uid, 'tst_emp1');
  const x = await call(C, su.ck, 'http://x'); assert.equal(x.status, 200, 'مضيفٌ محلي أحادي الاسم (Miniflare/localhost) ⇒ يعمل');
  const { C: C2, su: su2 } = await setup({ KIVO_TEST_HOST: 'test.kivo-d81.pages.dev' });
  assert.equal((await call(C2, su2.ck, 'https://test2.kivo-d81.pages.dev')).status, 404, 'مع KIVO_TEST_HOST: مضيفٌ آخر ⇒ 404 حتى لو بدأ بـtest');
  assert.equal((await call(C2, su2.ck, 'http://x')).status, 404, 'مع KIVO_TEST_HOST: المحلي ⇒ 404 (الحصرُ صريح)');
  assert.equal((await call(C2, su2.ck, 'https://test.kivo-d81.pages.dev')).status, 200, 'مع KIVO_TEST_HOST: المضيفُ المعلن ⇒ يعمل');
  const { C: C3, su: su3 } = await setup({ KIVO_PROD_HOST: 'kivo.example.org' });
  assert.equal((await call(C3, su3.ck, 'https://kivo.example.org')).status, 404, 'KIVO_PROD_HOST يُغلق مضيفَ Production البديل');
});

test('عمرُ جلسة الاختبار: جلسةُ test أقدم من 5 دقائق لا تُقبل وتُحذف، والكنسُ الدفاعي يزيل اليتيمات', async () => {
  const { env, C, su } = await setup();
  const old = Date.now() - 6 * 60 * 1000;
  env.DB.exec(`INSERT INTO sess (tok, uid, ts, la, dev, city) VALUES ('tstale', 'tst_emp1', ${old}, ${old}, 'test', 'TEST_ONLY')`);
  env.DB.exec(`INSERT INTO sess (tok, uid, ts, la, dev, city) VALUES ('tfresh', 'tst_emp1', ${Date.now()}, ${Date.now()}, 'test', 'TEST_ONLY')`);
  const w1 = await C.api('/api/whoami', { cookie: 'bs_tok=tstale' }); assert.equal(w1.status, 401, 'الجلسةُ القديمة الموسومة test مرفوضة');
  assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM sess WHERE tok='tstale'")[0].n, 0, 'وحُذفت عند أول استعمال');
  const w2 = await C.api('/api/whoami', { cookie: 'bs_tok=tfresh' }); assert.equal(w2.status, 200, 'الجلسةُ الحديثة الموسومة test تعمل داخل المهلة');
  env.DB.exec(`INSERT INTO sess (tok, uid, ts, la, dev, city) VALUES ('torphan', 'tst_emp1', ${old}, ${old}, 'test', 'TEST_ONLY')`);
  const r = await call(C, su.ck, 'http://x'); assert.equal(r.status, 200);
  assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM sess WHERE tok='torphan'")[0].n, 0, 'الكنسُ الدفاعي عند استدعاء الأداة يزيل اليتيمة القديمة');
  assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM sess WHERE dev='test'")[0].n, 1, 'ولا يمسّ الحديثة؛ وجلسةُ الأداة نفسِها حُذفت بعد الطلب (finally)');
  const normal = env.DB.q("SELECT COUNT(*) AS n FROM sess WHERE dev <> 'test' OR dev IS NULL")[0].n; assert.ok(normal >= 1, 'جلساتُ المستخدمين الحقيقيين لا تُمسّ');
});
