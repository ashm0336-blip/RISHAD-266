/* KIVO_264 · QA-264-D1 — القراءةُ في الإنفاذ تتبع سقفَ الإدارة كما القديم (canRead0 · 050: «سقفُ الإدارة أولاً … ولا صاحبُ النسخ الاحتياطية»):
   موردٌ صفحتُه خارجَ سقف الإدارة (perms.caps) أو وحدتُه مطفأةٌ على مستوى المنصة (platform.mods.off) لا يقرأ قيمتَه أحدٌ في الإدارة — لا مديرُها
   ولا مديرُ الفرع ولا حاملُ مفتاح قراءةٍ عامّ (backup.view · emp.view للجائزة) — في /api/get وفي حقن الإقلاع. كان canReadEnf يكتفي بأيّ مفتاح قراءةٍ
   محمول ولا يسأل عن صفحة المورد نفسِه (والكتابةُ مرفوضةٌ أصلاً). المشهدُ منقولٌ من tests/unit/k264_api_authz_matrix.test.mjs (فرع k264-qa) ومُوسَّع:
   (أ) سقفُ الإدارة وحده: tst_d2 بلا «المضبوطات» و«الجائزة» (بياناتٌ قديمة مزروعةٌ في الجدول — الحفظُ يرفضها) · ضابط: tst_d1 بسقفٍ كامل يُقرأ كما كان
   (ب) الإطفاءُ على مستوى المنصة (mods.off = seized) يُسقط المضبوطاتِ في كلّ إدارة — ومديرُ النظام يقرأ كلَّ شيء كما كان */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, makeEnv, TEST_SUPER_USERNAME, TEST_SUPER_PIN, client, applySql, ROOT, WORKER } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';
import { installIrshadFixture } from './irshad_legacy_seed_fx.mjs';
/* العاملُ المختبَر قبل الإصلاح (حزمةٌ أقدم عبر KIVO_WORKER) ⇒ تخطٍّ معلن — KIVO_K264_STRICT=1 يفرض التشغيل (به ثبت الإخفاقُ قبل الإصلاح) */
const FIX = fs.readFileSync(WORKER, 'utf8').includes('QA-264-D1') || process.env.KIVO_K264_STRICT ? {} : { skip: 'العاملُ المختبَر قبل KIVO_264 (QA-264-D1)' };
const ACC = { gm: ['0000000103', '70103'], dm1: ['0000000101', '70101'], dm2: ['0000000102', '70102'], sup1: ['0000000111', '70111'], emp2: ['0000000121', '70121'] };
const dk = (d, r) => 'bsdept:' + d + ':bassam_' + r;
const K = { 'd1.seized': dk('tst_d1', 'seized_v1'), 'd2.seized': dk('tst_d2', 'seized_v1'), 'd1.award': dk('tst_d1', 'award_v1'), 'd2.award': dk('tst_d2', 'award_v1'), 'd2.irshad': dk('tst_d2', 'irshad_v1') };
const L = Object.keys(K);
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {};
  f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_k264rc_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
async function world(mode) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await applySql(env.DB, seedSql());
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  await installIrshadFixture(env);
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  /* بياناتٌ من قبل إخراج الصفحتين من سقف tst_d2 (الحفظُ يرفضها حتى لمدير النظام — فتُزرع في الجدول مباشرةً كما في مصفوفة QA) */
  for (const [k, v] of [[K['d2.seized'], '{"reports":[{"id":"tstsz2","loc":"TEST_ONLY","test":"TEST_ONLY"}]}'], [K['d2.award'], '{"recs":[{"id":"tstaw9","ekey":"tst_e_emp2","name":"TEST_ONLY","st":"TEST_ONLY"}]}']]) {
    env.DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?1, 0, ?2)').run({ '1': k, '2': v });
    env.DB.db.prepare('INSERT OR REPLACE INTO revs (k, rev) VALUES (?1, 1)').run({ '1': k });
  }
  const S = { su: su.ck };
  for (const w of Object.keys(ACC)) { const l = await C.login(ACC[w][0], ACC[w][1]); assert.ok(l.ok, 'login ' + w); S[w] = l.ck; }
  return { env, C, S };
}
/* الموارد القديمة تتطابق في get/BOOT؛ الإرشاد يقرأ من واجهته العلائقية فقط. */
async function readable(C, ck, why) {
  const r = await C.api('/api/get?keys=' + encodeURIComponent(L.map(l => K[l]).join(',')), { cookie: ck }); assert.equal(r.status, 200, why);
  const got = L.filter(l => r.j.keys[K[l]] && r.j.keys[K[l]].v != null);
  const bk = ((await C.boot(ck)).boot || {}).keys || {}, inBoot = L.filter(l => bk[K[l]] != null);
  assert.deepEqual(inBoot, got, why + ': حقنُ الإقلاع = /api/get');
  const retired = r.j.keys[K['d2.irshad']];
  if (retired) { assert.equal(retired.v, null, why + ': لا JSON إرشاد تشغيلي قديم'); assert.equal(retired.moved, '/api/irshad'); }
  const ir = await C.api('/api/irshad?dept=tst_d2&view=records', { cookie: ck });
  assert.ok(ir.status === 200 || ir.status === 403, why + ': typed Irshad ' + JSON.stringify(ir.j));
  if (ir.status === 200) { assert.equal(ir.j.ok, 1); assert.deepEqual(ir.j.rows.map(row => row.id), ['tstir21']); got.push('d2.irshad'); }
  return got;
}
/* المتوقَّعُ واحدٌ في الوضعين — سلوكُ القديم (Production) هو المرجع */
const EXP_CEIL = { su: L, gm: ['d1.seized', 'd1.award', 'd2.irshad'], dm1: ['d1.seized', 'd1.award'], dm2: ['d2.irshad'], sup1: ['d1.award'], emp2: ['d2.irshad'] };
const EXP_OFF = { su: L, gm: ['d1.award', 'd2.irshad'], dm1: ['d1.award'], dm2: ['d2.irshad'], sup1: ['d1.award'], emp2: ['d2.irshad'] };

for (const mode of ['legacy', 'enforce']) test('QA-264-D1 [' + mode + '] صفحةٌ خارج سقف الإدارة ووحدةٌ مطفأةٌ على مستوى المنصة: لا قيمةَ لأحدٍ في الإدارة (ولا عبر backup.view) — والضابطُ داخل السقف يُقرأ كما كان', FIX, async () => {
  const { env, C, S } = await world(mode);
  /* (أ) سقفُ الإدارة وحده */
  for (const who of Object.keys(EXP_CEIL)) assert.deepEqual(await readable(C, S[who], mode + ' ' + who), EXP_CEIL[who], mode + ' (أ) ' + who + ': المقروء');
  /* الكتابةُ مرفوضةٌ كما كانت (الوضعان) — ولا تُغيّر المخزَّن */
  for (const [who, k] of [['dm2', K['d2.seized']], ['gm', K['d2.seized']], ['dm2', K['d2.award']]]) {
    const before = env.DB.q('SELECT v FROM kv WHERE k = ?1', k)[0].v;
    const s = await C.save(S[who], { [k]: before.replace('TEST_ONLY"', 'TEST_ONLY_K264"') }, [], { [k]: 1 });
    assert.equal(s.status, 200); assert.ok(s.j.denied && s.j.denied[k], mode + ' ' + who + ': الكتابةُ مرفوضة ' + k);
    assert.ok(!('cur' in s.j.denied[k]) || s.j.denied[k].cur == null, mode + ' ' + who + ': ولا قيمةَ في الرفض');
    assert.equal(env.DB.q('SELECT v FROM kv WHERE k = ?1', k)[0].v, before, 'لم يُكتب');
  }
  /* (ب) مديرُ النظام يطفئ «المضبوطات» على مستوى المنصة */
  const pv0 = (await C.api('/api/get?keys=bassam_platform_v1', { cookie: S.su })).j.keys.bassam_platform_v1;
  const pv = pv0 && pv0.v ? JSON.parse(pv0.v) : {}; pv.mods = Object.assign({}, pv.mods, { off: ['seized'] });
  assert.deepEqual((await C.save(S.su, { bassam_platform_v1: JSON.stringify(pv) })).j.denied, {}, 'إطفاءُ المضبوطات');
  for (const w of Object.keys(ACC)) { const l = await C.login(ACC[w][0], ACC[w][1]); assert.ok(l.ok); S[w] = l.ck; }
  for (const who of Object.keys(EXP_OFF)) assert.deepEqual(await readable(C, S[who], mode + ' ' + who), EXP_OFF[who], mode + ' (ب) ' + who + ': المقروء');
});
