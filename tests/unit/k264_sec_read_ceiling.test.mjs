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
/* العاملُ المختبَر قبل الإصلاح (حزمةٌ أقدم عبر KIVO_WORKER) ⇒ تخطٍّ معلن — KIVO_K264_STRICT=1 يفرض التشغيل (به ثبت الإخفاقُ قبل الإصلاح) */
const FIX = fs.readFileSync(WORKER, 'utf8').includes('QA-264-D1') || process.env.KIVO_K264_STRICT ? {} : { skip: 'العاملُ المختبَر قبل KIVO_264 (QA-264-D1)' };
const ACC = { gm: ['0000000103', '70103'], dm1: ['0000000101', '70101'], dm2: ['0000000102', '70102'], sup1: ['0000000111', '70111'], emp2: ['0000000121', '70121'] };
const dk = (d, r) => 'bsdept:' + d + ':bassam_' + r;
const K = { 'd1.seized': dk('tst_d1', 'seized_v1'), 'd2.seized': dk('tst_d2', 'seized_v1'), 'd1.award': dk('tst_d1', 'award_v1'), 'd2.award': dk('tst_d2', 'award_v1'), 'd2.irshad': dk('tst_d2', 'irshad_v1') };
const L = Object.keys(K);
let DAY = null;
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {};
  f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; }); DAY = o;
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_k264rc_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
async function world(mode) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await applySql(env.DB, seedSql());
  /* بياناتٌ من قبل إخراج الصفحتين من سقف tst_d2 — تُزرع في المصدر القديم قبل التحويل فتنقلها أداةُ التحويل الحقيقية إلى الجداول (schema 9/10) */
  for (const [k, v] of [[K['d2.seized'], JSON.stringify({ reports: [{ id: 'tstsz2', y: DAY.year, m: DAY.month, d: DAY.day, loc: 'TEST_ONLY', test: 'TEST_ONLY' }] })], [K['d2.award'], '{"recs":[{"id":"tstaw9","ekey":"tst_e_emp2","name":"TEST_ONLY","st":"TEST_ONLY"}]}']]) {
    env.DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?1, 0, ?2)').run({ '1': k, '2': v });
    env.DB.db.prepare('INSERT OR REPLACE INTO revs (k, rev) VALUES (?1, 1)').run({ '1': k });
  }
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const S = { su: su.ck };
  for (const w of Object.keys(ACC)) { const l = await C.login(ACC[w][0], ACC[w][1]); assert.ok(l.ok, 'login ' + w); S[w] = l.ck; }
  return { env, C, S };
}
/* schema 9/10: seized/award/irshad are typed domains. /api/get and BOOT never carry their legacy JSON (moved to the typed route);
   readability is decided per department by the typed records view — and a 200 must carry the converted rows themselves. */
const CONTENT = {
  'd1.seized': j => assert.deepEqual(j.rows.map(r => r.id), ['tstsz1']),
  'd2.seized': j => assert.deepEqual(j.rows.map(r => r.id), ['tstsz2']),
  'd1.award': j => assert.deepEqual(j.recs.map(r => r.id).sort(), ['tstaw1', 'tstaw2']),
  'd2.award': j => assert.deepEqual(j.recs.map(r => r.id), ['tstaw9']),
  'd2.irshad': j => assert.deepEqual(j.rows.map(r => r.id), ['tstir21'])
};
async function readable(C, ck, why) {
  const r = await C.api('/api/get?keys=' + encodeURIComponent(L.map(l => K[l]).join(',')), { cookie: ck }); assert.equal(r.status, 200, why);
  const bk = ((await C.boot(ck)).boot || {}).keys || {};
  for (const l of L) {
    const x = r.j.keys[K[l]], res = l.split('.')[1];
    if (x) { assert.equal(x.v, null, why + ': ' + l + ' لا JSON قديم في /api/get'); assert.equal(x.moved, '/api/' + res, why + ': ' + l + ' moved'); }
    assert.equal(bk[K[l]] == null, true, why + ': ' + l + ' لا قيمة في الإقلاع');
  }
  const got = [];
  for (const l of L) {
    const [dl, res] = l.split('.'), dept = dl === 'd1' ? 'tst_d1' : 'tst_d2';
    const t = await C.api('/api/' + res + '?dept=' + dept + '&view=records', { cookie: ck });
    assert.ok(t.status === 200 || t.status === 403, why + ': typed ' + l + ' ' + t.status + ' ' + JSON.stringify(t.j).slice(0, 160));
    if (t.status === 200) { assert.equal(t.j.ok, 1); CONTENT[l](t.j); got.push(l); }
    else assert.ok(!JSON.stringify(t.j).includes('TEST_ONLY') && !JSON.stringify(t.j).includes('tstsz') && !JSON.stringify(t.j).includes('tstaw') && !JSON.stringify(t.j).includes('tstir'), why + ': ' + l + ' ولا قيمةَ في الرفض');
  }
  return got;
}
/* المتوقَّعُ واحدٌ في الوضعين — سلوكُ القديم (Production) هو المرجع */
const EXP_CEIL = { su: L, gm: ['d1.seized', 'd1.award', 'd2.irshad'], dm1: ['d1.seized', 'd1.award'], dm2: ['d2.irshad'], sup1: ['d1.award'], emp2: ['d2.irshad'] };
const EXP_OFF = { su: L, gm: ['d1.award', 'd2.irshad'], dm1: ['d1.award'], dm2: ['d2.irshad'], sup1: ['d1.award'], emp2: ['d2.irshad'] };

for (const mode of ['legacy', 'enforce']) test('QA-264-D1 [' + mode + '] صفحةٌ خارج سقف الإدارة ووحدةٌ مطفأةٌ على مستوى المنصة: لا قيمةَ لأحدٍ في الإدارة (ولا عبر backup.view) — والضابطُ داخل السقف يُقرأ كما كان', FIX, async () => {
  const { env, C, S } = await world(mode);
  /* (أ) سقفُ الإدارة وحده */
  for (const who of Object.keys(EXP_CEIL)) assert.deepEqual(await readable(C, S[who], mode + ' ' + who), EXP_CEIL[who], mode + ' (أ) ' + who + ': المقروء');
  /* الكتابةُ مرفوضةٌ كما كانت (الوضعان) — عبر واجهتي الكتابة المنمّطتين (/api/seized/act · /api/award/act) منذ schema 9 — ولا تُغيّر المخزَّن.
     الضابط: مديرُ tst_d1 (داخل سقفه) يمرّ بالأمر نفسِه شكلاً — فالرفضُ رفضُ السقف لا رفضُ الشكل. */
  const typedRows = () => JSON.stringify(env.DB.q("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'seized%' OR name LIKE 'award%') AND name NOT LIKE '%request%' ORDER BY name").map(t => [t.name, env.DB.q('SELECT * FROM ' + t.name)]));
  let rq = 0;
  const act = async (who, res, dept, extra) => {
    const g = await C.api('/api/' + res + '?dept=' + dept + '&view=records', { cookie: S.su }); assert.equal(g.status, 200);
    return C.api('/api/' + res + '/act', { method: 'POST', cookie: S[who], body: Object.assign({ dept, requestId: 'TEST_ONLY_k264rc_' + mode + '_' + (++rq), base: g.j.base }, extra) });
  };
  const SZ = id => ({ op: 'delete', id }), AW = id => ({ op: 'edit', id, data: { name: 'TEST_ONLY_K264' } }), AWD = id => ({ op: 'delete', id });
  /* RISHAD-266 · قرار المالك (هـ) 2026-11-03: حذفُ التكريم في الوضع القديم يتبع مبدأ الإنفاذ نفسَه — سقفُ الإدارة وصلاحيةُ الحذف معاً.
     tstaw9 هو السجلُّ الوحيد في tst_d2 (سقفُها بلا «الجائزة») فحذفُه يُصنَّف تفريغاً — وكان القديم يمرّره (200) عبر تنظيف awardCleanup بـ admin/import:del. */
  for (const [who, res, cmd] of [['dm2', 'seized', SZ('tstsz2')], ['gm', 'seized', SZ('tstsz2')], ['dm2', 'award', AW('tstaw9')], ['gm', 'award', AW('tstaw9')], ['dm2', 'award', AWD('tstaw9')], ['gm', 'award', AWD('tstaw9')]]) {
    const before = typedRows();
    const s = await act(who, res, 'tst_d2', cmd);
    assert.equal(s.status, 403, mode + ' ' + who + ': الكتابةُ مرفوضة ' + res + ' ' + JSON.stringify(s.j));
    assert.equal(s.j.ok, 0); assert.equal(s.j.err, (res === 'seized' ? 'seized' : 'award') + '-denied', mode + ' ' + who + ' ' + res);
    assert.ok(!JSON.stringify(s.j).includes('TEST_ONLY'), mode + ' ' + who + ': ولا قيمةَ في الرفض');
    assert.equal(typedRows(), before, mode + ' ' + who + ' ' + res + ': لم يُكتب');
  }
  /* الضابط داخل السقف: الأمرُ نفسُه شكلاً يتجاوز السلطة (المضبوطات: معرّفٌ غائب ⇒ 404 بعد السلطة · الجائزة: تعديلٌ مقبول) */
  const c1 = await act('dm1', 'seized', 'tst_d1', SZ('TEST_ONLY_absent'));
  assert.equal(c1.status, 404, mode + ' ضابط المضبوطات ' + JSON.stringify(c1.j)); assert.equal(c1.j.err, 'seized-report-missing');
  const c2 = await act('dm1', 'award', 'tst_d1', AW('tstaw1'));
  assert.equal(c2.status, 200, mode + ' ضابط الجائزة ' + JSON.stringify(c2.j)); assert.equal(c2.j.n, 1);
  /* (ب) مديرُ النظام يطفئ «المضبوطات» على مستوى المنصة */
  const pv0 = (await C.api('/api/get?keys=bassam_platform_v1', { cookie: S.su })).j.keys.bassam_platform_v1;
  const pv = pv0 && pv0.v ? JSON.parse(pv0.v) : {}; pv.mods = Object.assign({}, pv.mods, { off: ['seized'] });
  assert.deepEqual((await C.save(S.su, { bassam_platform_v1: JSON.stringify(pv) })).j.denied, {}, 'إطفاءُ المضبوطات');
  for (const w of Object.keys(ACC)) { const l = await C.login(ACC[w][0], ACC[w][1]); assert.ok(l.ok); S[w] = l.ck; }
  for (const who of Object.keys(EXP_OFF)) assert.deepEqual(await readable(C, S[who], mode + ' ' + who), EXP_OFF[who], mode + ' (ب) ' + who + ': المقروء');
});
