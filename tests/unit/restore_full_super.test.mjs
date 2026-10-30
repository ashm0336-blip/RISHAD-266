/* KIVO_263 · SOT-190 — قرارُ المالك (2026-10-12): «تبقى صلاحية استعادة النسخة الاحتياطية الشاملة لمدير النظام فقط».
   على العامل الحقيقي بوضع الإنفاذ:
   (أ) مديرُ إدارة يرسل حفظةَ استعادةٍ بعلامة نطاقٍ شامل (scope:full) ولو على مفتاح إدارته وحدها ⇒ مرفوضةٌ (full-super-only) ولا تتغيّر القيمة
   (ب) مديرُ النظام بالعلامة نفسها وسببٍ ⇒ مقبولة
   (ج) مفتاحٌ عامٌّ للمنصة في حفظة استعادةٍ من مدير إدارة ⇒ مرفوض (السياسةُ القائمة: not-mgr)
   (د) استعادةُ الإدارة (scope:dept) بلا مفتاح backup.restore ⇒ مرفوضة بسببها (mgr-no-key) — الترحيلُ لا يمنح المفتاح تلقائياً */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, since, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
function seed() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_rs_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
async function world() {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await applySql(env.DB, seed());
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const dm = await C.login('0000000101', '70101'); assert.ok(dm.ok, 'tst_dm1');
  return { env, C, su, dm };
}
const K = 'bsdept:tst_d1:bassam_options_v1';
const getv = async (C, ck, k) => ((await C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: ck })).j.keys || {})[k];
const restore = async (C, ck, set, scope, su) => { const base = {}; for (const k of Object.keys(set)) { const g = await getv(C, su || ck, k); if (g && g.rev != null) base[k] = g.rev; } return C.api('/api/save', { method: 'POST', cookie: ck, body: { set, del: [], base, ops: Object.fromEntries(Object.keys(set).map(k => [k, { op: 'backup.restore', scope, mode: 'replace', reason: 'اختبار SOT-190' }])) } }); };
const den = (r, k) => (r.j && r.j.denied || {})[k];
test('(أ)(ب) الاستعادةُ الشاملة لمدير النظام وحده', since(163), async () => {
  const { C, su, dm } = await world();
  assert.ok(!den(await C.save(su.ck, { [K]: JSON.stringify({ v: 'orig' }) }), K), 'زرعُ القيمة');
  const before = await getv(C, su.ck, K);
  const a = await restore(C, dm.ck, { [K]: JSON.stringify({ v: 'hacked' }) }, 'full', su.ck);
  const d = den(a, K); assert.ok(a.status === 403 || d, 'مرفوضة: ' + a.status + ' ' + JSON.stringify(a.j).slice(0, 160));
  if (d) assert.equal(d.detail, 'full-super-only', JSON.stringify(d));
  assert.deepEqual(await getv(C, su.ck, K), before, 'القيمةُ لم تتغيّر');
  const b = await restore(C, su.ck, { [K]: JSON.stringify({ v: 'restored' }) }, 'full');
  assert.equal(b.status, 200, JSON.stringify(b.j).slice(0, 160)); assert.ok(!den(b, K), 'مديرُ النظام مقبول: ' + JSON.stringify(b.j.denied || {}).slice(0, 160));
  assert.match(String((await getv(C, su.ck, K)).v), /restored/);
});
test('(ج)(د) مفتاحٌ عامّ ⇒ not-mgr · نطاقُ الإدارة: بالمفتاح الممنوح صراحةً مقبولة · بلا المفتاح mgr-no-key', since(163), async () => {
  const { C, su, dm } = await world();
  const c = await restore(C, dm.ck, { bassam_platform_v1: JSON.stringify({ brand: { name: 'x' } }) }, 'dept', su.ck);
  const dc = den(c, 'bassam_platform_v1'); assert.ok(c.status === 403 || dc, 'المفتاحُ العامّ مرفوض'); if (dc && dc.detail) assert.equal(dc.detail, 'not-mgr');
  /* المُثبِّت يمنح tst_dm1 المفتاحَ صراحةً (plus: backup.restore على tst_d1) ⇒ استعادةُ إدارته مقبولة؛ tst_dm2 بلا منحٍ ⇒ مرفوضة */
  const ok = await restore(C, dm.ck, { [K]: JSON.stringify({ v: 'dept-ok' }) }, 'dept', su.ck);
  assert.ok(!den(ok, K), 'بالمفتاح: ' + JSON.stringify(ok.j.denied || {}).slice(0, 160));
  const dm2 = await C.login('0000000102', '70102'); assert.ok(dm2.ok, 'tst_dm2');
  const K2 = 'bsdept:tst_d2:bassam_options_v1';
  const d = await restore(C, dm2.ck, { [K2]: JSON.stringify({ v: 'x' }) }, 'dept', su.ck);
  const dd = den(d, K2); assert.ok(d.status === 403 || dd, 'بلا مفتاح backup.restore مرفوضة: ' + JSON.stringify(d.j).slice(0, 160)); if (dd) assert.equal(dd.detail, 'mgr-no-key', JSON.stringify(dd));
});
