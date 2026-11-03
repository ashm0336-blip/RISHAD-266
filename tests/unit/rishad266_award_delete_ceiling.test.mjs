/* RISHAD-266 · قرار المالك (هـ) 2026-11-03 — حذفُ التكريم في الوضع القديم (legacy) يتبع مبدأ الإنفاذ نفسَه: صفحةُ الجائزة على سقف الإدارة
   وصلاحيةُ الحذف معاً. لا صلاحيةَ أوسع للوضع القديم.
   الثغرةُ المرصودة (Test حيّاً · 200): مديرُ إدارةٍ سقفُها بلا «الجائزة» يحذف سجلَّها الوحيد عبر POST /api/award/act {op:'delete'} —
   حذفُ السجلّ الوحيد يُصنَّف تفريغاً (recs ⇒ []) فيمرّ في canWrite بتنظيف awardCleanup (038) لحامل admin/import:del دون سؤال السقف.
   (أ) خارجَ السقف ⇒ 403 والصفوفُ award_* كما هي (الوضعان) — والإنفاذُ يرفضه أصلاً
   (ب) داخلَ السقف بلا صلاحية حذف الجائزة (حاملُ admin/import:del وحده) ⇒ 403 والصفوفُ كما هي (الوضعان)
   (ج) داخلَ السقف بصلاحية الحذف (مديرٌ مأذون · super) ⇒ الحذفُ يعمل: سجلٌّ من اثنين ثم السجلُّ الأخير (الوضعان — r3: الإنفاذُ لا يعدّ الأخيرَ تفريغاً)
   (د) تنظيفُ الموظف المحذوف لسجلّات التكريم (awPlanEmployeeCleanup) لا يمرّ بهذا المسار — تغطيه award_domain وemployee_transition_server.
   ومراجعةُ التنظيفين الآخرين في 038: dreportCleanup — حفظُ التقرير اليومي {} من مديرٍ خارج سقف «التقرير» يُرفض قبل الحكم
   (read-reference-denied) في الوضعين، فلا ثغرةَ سقفٍ مماثلة (هـ أدناه)؛ custodyCleanup — لا طريقَ مستخدمٍ يفرّغ moves (أوامرُ /api/custody/act
   شاهدُها moves:[] قبلاً، ومسارُ التنظيف نيّةٌ خادمية موثوقة: cuCleanupPermission) فلا يُشدَّد. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, TEST_SUPER_USERNAME, TEST_SUPER_PIN, client, applySql, ROOT } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';

const ACC = { dm1: ['0000000101', '70101'], dm2: ['0000000102', '70102'], sup1: ['0000000111', '70111'] };
const AW2 = 'bsdept:tst_d2:bassam_award_v1';
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {};
  f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_r266aw_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
async function world(mode, opts = {}) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await applySql(env.DB, seedSql());
  const P = JSON.parse(env.DB.db.prepare("SELECT v FROM kv WHERE k='bassam_perms_v1'").get().v);
  /* (ب): مشرفُ tst_d1 يحمل admin/import:del (وعرضَ الجائزة) ولا يحمل حذفَها */
  P.emps.tst_d1.tst_e_sup1 = Object.assign({}, P.emps.tst_d1.tst_e_sup1, { 'admin/import': ['view', 'del'], 'award/res': ['view'] });
  if (opts.dreportOff) P.caps.tst_d1 = P.caps.tst_d1.filter(x => x !== 'dreport');
  env.DB.db.prepare("UPDATE kv SET v=?1 WHERE k='bassam_perms_v1'").run({ 1: JSON.stringify(P) });
  /* tst_d2 سقفُها بلا «الجائزة» (المولّد) — سجلٌّ وحيدٌ مزروعٌ في المصدر القديم قبل التحويل */
  env.DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?1, 0, ?2)').run({ 1: AW2, 2: '{"recs":[{"id":"tstaw9","ekey":"tst_e_emp2","name":"TEST_ONLY","st":"TEST_ONLY"}]}' });
  env.DB.db.prepare('INSERT OR REPLACE INTO revs (k, rev) VALUES (?1, 1)').run({ 1: AW2 });
  await installCurrentSchemaFixture(env);
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const S = { su: su.ck };
  for (const w of Object.keys(ACC)) { const l = await C.login(ACC[w][0], ACC[w][1]); assert.ok(l.ok, 'login ' + w); S[w] = l.ck; }
  let rq = 0;
  const awardRows = () => JSON.stringify(env.DB.q("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'award%' AND name NOT LIKE '%request%' ORDER BY name").map(t => [t.name, env.DB.q('SELECT * FROM ' + t.name + ' ORDER BY 1,2')]));
  const ids = dept => env.DB.q('SELECT business_id FROM award_records WHERE department_id=?1 ORDER BY business_id', dept).map(r => r.business_id);
  const del = async (who, dept, id) => {
    const g = await C.api('/api/award?dept=' + dept + '&view=records', { cookie: S.su }); assert.equal(g.status, 200);
    return C.api('/api/award/act', { method: 'POST', cookie: S[who], body: { dept, requestId: 'TEST_ONLY_r266aw_' + mode + '_' + (++rq), base: g.j.base, op: 'delete', id } });
  };
  return { env, C, S, awardRows, ids, del };
}

for (const mode of ['legacy', 'enforce']) {
  test(`[${mode}] (أ) خارجَ السقف: حذفُ السجلّ الوحيد في إدارةٍ سقفُها بلا «الجائزة» ⇒ 403 والصفوفُ كما هي`, async () => {
    const W = await world(mode);
    assert.deepEqual(W.ids('tst_d2'), ['tstaw9']);
    const before = W.awardRows();
    const s = await W.del('dm2', 'tst_d2', 'tstaw9');
    assert.equal(s.status, 403, mode + ' dm2 ' + JSON.stringify(s.j));
    assert.equal(s.j.ok, 0); assert.equal(s.j.err, 'award-denied');
    assert.ok(!JSON.stringify(s.j).includes('TEST_ONLY'), 'ولا قيمةَ في الرفض');
    assert.equal(W.awardRows(), before, mode + ': award_* لم تتغيّر');
    assert.deepEqual(W.ids('tst_d2'), ['tstaw9']);
    /* ضبطٌ بمدير النظام: السقفُ يحكم الجميع — super خارجَ سقف «الجائزة» يُرفض كذلك ولا يُكتب شيء (الوضعان) */
    const su = await W.del('su', 'tst_d2', 'tstaw9');
    assert.equal(su.status, 403, mode + ' super ' + JSON.stringify(su.j));
    assert.equal(su.j.ok, 0); assert.equal(su.j.err, 'award-denied');
    assert.ok(!JSON.stringify(su.j).includes('TEST_ONLY'), 'ولا قيمةَ في الرفض');
    assert.equal(W.awardRows(), before, mode + ' super: award_* لم تتغيّر');
    assert.deepEqual(W.ids('tst_d2'), ['tstaw9']);
  });
  test(`[${mode}] (ب) داخلَ السقف بلا صلاحية حذف الجائزة (admin/import:del وحده) ⇒ 403 — حتى للسجلّ الأخير`, async () => {
    const W = await world(mode);
    assert.deepEqual(W.ids('tst_d1'), ['tstaw1', 'tstaw2']);
    const before = W.awardRows();
    for (const id of ['tstaw2', 'tstaw1']) {
      const s = await W.del('sup1', 'tst_d1', id);
      assert.equal(s.status, 403, mode + ' sup1 ' + id + ' ' + JSON.stringify(s.j));
      assert.equal(s.j.err, 'award-denied');
      assert.equal(W.awardRows(), before, mode + ' ' + id + ': award_* لم تتغيّر');
    }
    /* والسجلُّ الأخير: المديرُ يحذف أحدَهما فيبقى واحد — ثم يحاول المشرفُ (تفريغٌ بالتصنيف) */
    const m = await W.del('dm1', 'tst_d1', 'tstaw2'); assert.equal(m.status, 200, JSON.stringify(m.j));
    const mid = W.awardRows();
    const s = await W.del('sup1', 'tst_d1', 'tstaw1');
    assert.equal(s.status, 403, mode + ' sup1 last ' + JSON.stringify(s.j)); assert.equal(s.j.err, 'award-denied');
    assert.equal(W.awardRows(), mid, mode + ' last: award_* لم تتغيّر');
    assert.deepEqual(W.ids('tst_d1'), ['tstaw1']);
  });
  for (const who of ['dm1', 'su']) test(`[${mode}] (ج) داخلَ السقف بصلاحية الحذف (${who}): الحذفُ يعمل — سجلٌّ من اثنين ثم السجلُّ الأخير`, async () => {
    const W = await world(mode);
    const checks = rq => W.env.DB.q('SELECT check_kind, permission_key FROM award_request_checks WHERE request_id=?1 ORDER BY position', rq).map(r => r.check_kind + ':' + r.permission_key);
    /* إثباتُ الصلاحية المحفوظ: حذفُ سجلٍّ واحد — لا تفريغٌ ولا استيرادٌ ولا حذفُ موظفين */
    const want = mode === 'enforce' ? ['enforce:award.res.delete'] : ['legacy:del'];
    const a = await W.del(who, 'tst_d1', 'tstaw2');
    assert.equal(a.status, 200, mode + ' ' + JSON.stringify(a.j)); assert.equal(a.j.ok, 1); assert.equal(a.j.n, 1); assert.equal(a.j.id, 'tstaw2');
    assert.deepEqual(W.ids('tst_d1'), ['tstaw1']);
    assert.deepEqual(checks(a.j.requestId), want, mode + ' ' + who + ' first');
    /* السجلُّ الأخير (RISHAD-266 r3): كان الإنفاذُ يصنّفه تفريغاً «__unmapped:award.recs.wipe» فيرفضه حتى لـ super —
       الآن يُحكم حذفَ سجلٍّ واحد (السقف + صلاحيةُ الحذف) في الوضعين */
    const b = await W.del(who, 'tst_d1', 'tstaw1');
    assert.equal(b.status, 200, mode + ' last ' + JSON.stringify(b.j)); assert.equal(b.j.ok, 1); assert.equal(b.j.n, 1); assert.equal(b.j.id, 'tstaw1');
    assert.deepEqual(W.ids('tst_d1'), []);
    assert.deepEqual(checks(b.j.requestId), want, mode + ' ' + who + ' last');
    /* لا أثرَ للمرساة التصنيفية في المخزن */
    assert.ok(!W.awardRows().includes('kivo:award-delete-anchor'), 'المرساةُ لا تُكتب');
    /* وإدارةٌ أخرى لم تُمسّ */
    assert.deepEqual(W.ids('tst_d2'), ['tstaw9']);
  });
  test(`[${mode}] (هـ) dreportCleanup: تفريغُ التقرير اليومي من مديرٍ خارج سقف «التقرير» يُرفض ولا يُكتب (لا ثغرةَ مماثلة)`, async () => {
    const W = await world(mode, { dreportOff: true });
    const k = 'bsdept:tst_d1:bassam_dreport_v1';
    const g = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(k), { cookie: W.S.su }); assert.equal(g.status, 200);
    const before = JSON.stringify(g.j.resources[k]); assert.ok(Object.keys(g.j.resources[k]).length > 0);
    const s = await W.C.api('/api/save', { method: 'POST', cookie: W.S.dm1, body: { requestId: 'TEST_ONLY_r266dr_' + mode, epoch: g.j.epoch, set: { [k]: '{}' }, del: [], base: { [k]: (g.j.base || {})[k] || 0 } } });
    assert.equal(s.status, 403, mode + ' ' + JSON.stringify(s.j));
    assert.ok(s.j.denied && s.j.denied[k], 'حكمٌ صريح');
    /* السببُ نفسُه لا أيُّ رفض: سقفُ «التقرير» يرفض قبل الحكم (لا مرورَ بـ dreportCleanup) */
    assert.equal(s.j.denied[k].why, 'read-reference-denied', mode + ' ' + JSON.stringify(s.j.denied[k]));
    const g2 = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(k), { cookie: W.S.su });
    assert.equal(JSON.stringify(g2.j.resources[k]), before, mode + ': التقرير كما هو');
  });
}
