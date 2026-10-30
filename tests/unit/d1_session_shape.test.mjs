/* KIVO_255 (تصحيحٌ اكتُشف في KIVO_256) · AUD-037 — شكلُ D1 الحقيقي: الارتباطُ (D1Database) يملك withSession، وجلسته (D1DatabaseSession) لا تملكه.
   كان dbGuard (لقطةُ المقدّمة) يعرض withSession دائماً، فيظنّه handle() المتداخلُ (أداةُ الاختبار الداخلية /api/authz-test) متاحاً على ارتباطٍ مغلَّفٍ
   فوق جلسة ⇒ «DB.withSession is not a function» لكل طلبٍ متداخل (على Preview وMiniflare معاً) — ولم يكشفه D1 البديل لأنه كان يعيد نفسَه.
   هنا: ارتباطٌ بشكل Cloudflare تماماً (الجلسةُ بلا withSession/exec/dump) ⇒ الطلبُ المتداخل يعمل ويعيد المفاتيحَ المحمولة. */
import os from 'node:os';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
const TMP = process.env.TMPDIR || os.tmpdir();
function fixtureSeed() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {};
  f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = TMP + '/kivo_fx_s_' + process.pid; fs.mkdirSync(out, { recursive: true });
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
/* ارتباطٌ بشكل Cloudflare: withSession يعيد جلسةً لها prepare/batch/getBookmark فقط */
function cfShaped(shim) {
  const session = () => ({ prepare: (q) => shim.prepare(q), batch: (a) => shim.batch(a), getBookmark: () => null });
  return { prepare: (q) => shim.prepare(q), batch: (a) => shim.batch(a), exec: (q) => shim.exec(q), dump: async () => new ArrayBuffer(0), withSession: () => session(), q: (...a) => shim.q(...a) };
}
test('طلبٌ متداخل (/api/authz-test) فوق جلسة D1 حقيقية الشكل يعمل — لا «withSession is not a function»', async () => {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await applySql(env.DB, fixtureSeed());
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  env.DB = cfShaped(env.DB);
  const who = await C.api('/api/authz-test', { method: 'POST', cookie: su.ck, body: { uid: 'tst_emp1', path: '/api/whoami' } });
  assert.equal(who.status, 200); assert.equal(who.j.ok, 1, JSON.stringify(who.j).slice(0, 300));
  const az = await C.api('/api/authz-test', { method: 'POST', cookie: su.ck, body: { uid: 'tst_dm1', path: '/api/authz' } });
  assert.equal(az.j.ok, 1, JSON.stringify(az.j).slice(0, 300));
  assert.ok(az.j.json && az.j.json.me && az.j.json.me.depts && typeof az.j.json.me.depts.tst_d1.h === 'string', 'المفاتيحُ المحمولة لمدير الإدارة تعود من الطلب المتداخل');
  const g = await C.api('/api/authz-test', { method: 'POST', cookie: su.ck, body: { uid: 'tst_sa', path: '/api/get?keys=bsdept%3Atst_d1%3Abassam_grants_v1' } });
  assert.equal(g.j.ok, 1); assert.ok(g.j.json.keys['bsdept:tst_d1:bassam_grants_v1'].v, 'وقراءةُ المفاتيح من الطلب المتداخل');
});
test('والطلبُ العادي فوق الشكل نفسِه: الغلافُ يُثبَّت على الجلسة الأولى (first-primary) ويقرأ ويكتب كما كان', async () => {
  const env = makeTestEnv(); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  let sessions = 0; const shim = env.DB; env.DB = cfShaped(shim); const ws = env.DB.withSession; env.DB.withSession = (x) => { sessions++; assert.equal(x, 'first-primary'); return ws(x); };
  const s = await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dS', name: 'إدارة', gid: '' }]) });
  assert.equal(s.j.ok, 1, JSON.stringify(s.j).slice(0, 300));
  const b = await C.boot(su.ck); assert.equal(b.status, 200); assert.ok(b.boot && b.boot.keys && b.boot.keys.bassam_depts_v1);
  assert.ok(sessions >= 2, 'كلُّ طلبٍ يُثبَّت على الجلسة (' + sessions + ')');
});
