/* RM-5 · SOT-137 (P0) — دورةُ حياة الجلسة على العامل الحقيقي (Node + D1 بديل): الانتهاءُ بالعمر والخمول · الخروج · تغييرُ الدور/الإدارة يسري
   في الطلب التالي (لا جلسةَ متقادمة — الفاعلُ يُقرأ من مصدره كلَّ طلب) · التجميدُ يُسقط الجلسة فوراً · إبطالُ الجلسات (ذاتي · إداري · الجميع)
   · سياسةُ العمر تسري على الجلسات القائمة · تغييرُ كلمة المرور (توثيقُ السلوك الحالي). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeLegacyTestEnv as makeEnv, client, applySql, ROOT, WORKER_N } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';
const FIXED = !WORKER_N || WORKER_N >= 152;   /* AUD-034/035 أُصلحا في KIVO_252؛ على العوامل الأقدم يُوثَّق السلوكُ القديم */
import { internals } from './internals.mjs';
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_sess_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
async function world() {
  const env = makeEnv(); const C = client(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, seedSql());
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  const emp = await C.login('0000000113', '70113'); assert.ok(emp.ok, 'tst_emp1');
  return { env, C, su, emp };
}
const tokOf = (ck) => ck.split('=')[1];
const who = async (C, ck) => C.api('/api/whoami', { cookie: ck });
const H = 3600 * 1000;
test('الانتهاءُ بالعمر: جلسةٌ أقدم من SESSION_MAX (12 س) تُرفض وتُحذف · الخمولُ أطول من IDLE_MAX (2 س) يُرفض · ضمن الحدود تعمل وتحدّث la', async () => {
  const { env, C, emp } = await world(); const tok = tokOf(emp.ck); const now = Date.now();
  env.DB.exec(`UPDATE sess SET ts = ${now - 13 * H}, la = ${now - 60000} WHERE tok = '${tok}'`);
  assert.equal((await who(C, emp.ck)).status, 401, 'أقدم من 12 ساعة'); assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM sess WHERE tok = ?", tok)[0].n, 0, 'حُذفت');
  const e2 = await C.login('0000000113', '70113'); const t2 = tokOf(e2.ck);
  env.DB.exec(`UPDATE sess SET ts = ${now - 1 * H}, la = ${now - 3 * H} WHERE tok = '${t2}'`);
  assert.equal((await who(C, e2.ck)).status, 401, 'خمولٌ 3 ساعات');
  const e3 = await C.login('0000000113', '70113'); const t3 = tokOf(e3.ck);
  env.DB.exec(`UPDATE sess SET ts = ${now - 11 * H}, la = ${now - 1.5 * H} WHERE tok = '${t3}'`);
  assert.equal((await who(C, e3.ck)).status, 200, 'ضمن الحدود'); assert.ok(env.DB.q("SELECT la FROM sess WHERE tok = ?", t3)[0].la >= now - 5000, 'la حُدّثت');
});
test('الخروجُ يبطل الرمز فوراً · الرمزُ المزوَّر/المجهول 401 · الجلسةُ لا تنتقل بتغيير قيمة الكوكي', async () => {
  const { C, emp } = await world();
  assert.equal((await who(C, emp.ck)).status, 200);
  const lo = await C.api('/api/logout', { method: 'POST', cookie: emp.ck, body: {} }); assert.equal(lo.status, 200);
  assert.equal((await who(C, emp.ck)).status, 401, 'بعد الخروج');
  assert.equal((await who(C, 'bs_tok=' + 'x'.repeat(40))).status, 401, 'رمزٌ مجهول');
  assert.equal((await who(C, '')).status, 401, 'بلا كوكي');
});
test('تغييرُ الدور والإدارة من مدير النظام يسري على جلسة الموظف في الطلب التالي (لا تقادم) — والتجميدُ يُسقط الجلسة ويحذفها (AUD-034)', async () => {
  const { env, C, su, emp } = await world();
  const users = () => C.api('/api/get?keys=bassam_auth_users_v1', { cookie: su.ck }).then(r => JSON.parse(r.j.keys.bassam_auth_users_v1.v));
  const setUsers = async (f) => { const u = await users(); const r = await C.save(su.ck, { bassam_auth_users_v1: JSON.stringify(u.map(f)) }); assert.equal(r.j.ok, 1, JSON.stringify(r.j).slice(0, 120)); };
  const me0 = (await C.api('/api/me', { cookie: emp.ck })).j; assert.equal(me0.ok, 1);
  /* الفاعلُ كما يراه الخادم في الطلب التالي: جدولُ الحسابات المحقون في الإقلاع (بلا بصمات) يحمل دورَه وإدارتَه المحدَّثين */
  const meBoot = async () => { const b = (await C.boot(emp.ck)).boot; assert.ok(b && b.srv && b.keys, 'إقلاعٌ بجلسة الخادم'); return JSON.parse(b.keys.bassam_auth_users_v1).find(x => x.id === 'tst_emp1'); };
  const m0 = await meBoot(); assert.equal(m0.role, 'staff'); assert.ok(!('ph' in m0), 'بلا بصمة');
  await setUsers(x => x.id === 'tst_emp1' ? Object.assign({}, x, { role: 'gm' }) : x);
  assert.equal((await meBoot()).role, 'gm', 'الدورُ الجديد في الطلب التالي');
  await setUsers(x => x.id === 'tst_emp1' ? Object.assign({}, x, { deptId: 'dR' }) : x);
  assert.equal((await meBoot()).deptId, 'dR', 'الإدارةُ الجديدة في الطلب التالي');
  await setUsers(x => x.id === 'tst_emp1' ? Object.assign({}, x, { dis: 1 }) : x);
  assert.equal((await who(C, emp.ck)).status, 401, 'التجميدُ يُسقط الجلسة فوراً');
  assert.equal((await C.login('0000000113', '70113')).ok, false, 'ولا دخولَ لحسابٍ مجمَّد');
  await setUsers(x => x.id === 'tst_emp1' ? Object.assign({}, x, { dis: 0 }) : x);
  /* KIVO_252 · AUD-034: التجميدُ يحذف صفوفَ الجلسة في دفعة الحفظ نفسِها — فإلغاءُ التجميد لا يُحيي رمزاً قديماً (على العوامل الأقدم: الفجوةُ الموثَّقة) */
  if (FIXED) { assert.equal((await who(C, emp.ck)).status, 401, 'الرمزُ القديم لا يعود بعد إلغاء التجميد (AUD-034)'); assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM sess WHERE uid = 'tst_emp1'")[0].n, 0, 'لا جلساتٍ للمستخدم'); }
  else assert.equal((await who(C, emp.ck)).status, 200, 'عاملٌ قبل 252: الرمزُ القديم يعود (الفجوة AUD-034 الموثَّقة)');
  assert.equal((await C.login('0000000113', '70113')).ok, true, 'والدخولُ يعود');
});
test('إبطالُ الجلسات: الذاتي (غيري) · الإداري على مستخدم · الجميع (عدا الطالب) — ويُسجَّل في sec', async () => {
  const { env, C, su, emp } = await world();
  const e2 = await C.login('0000000113', '70113'); const e3 = await C.login('0000000113', '70113');
  const r1 = await C.api('/api/me/sess/kill', { method: 'POST', cookie: e3.ck, body: {} }); assert.equal(r1.j.ok, 1);
  assert.equal((await who(C, e3.ck)).status, 200, 'الطالبُ يبقى'); assert.equal((await who(C, emp.ck)).status, 401); assert.equal((await who(C, e2.ck)).status, 401, 'الأخريان أُبطلتا');
  const e4 = await C.login('0000000113', '70113');
  const r2 = await C.api('/api/sess/kill', { method: 'POST', cookie: su.ck, body: { uid: 'tst_emp1' } }); assert.equal(r2.j.ok, 1, JSON.stringify(r2.j));
  assert.equal((await who(C, e3.ck)).status, 401); assert.equal((await who(C, e4.ck)).status, 401, 'إداريّاً: كلُّ جلسات المستخدم');
  const e5 = await C.login('0000000113', '70113'); const su2 = await C.login('admin', 'admin');
  const r3 = await C.api('/api/sess/kill', { method: 'POST', cookie: su.ck, body: { uid: 'tst_emp1', all: 1 } }); assert.equal(r3.j.ok, 1);
  assert.equal((await who(C, su.ck)).status, 200, 'الطالبُ يبقى'); assert.equal((await who(C, e5.ck)).status, 401); assert.equal((await who(C, su2.ck)).status, 401, 'الجميعُ عدا الطالب');
  assert.ok(env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act = 'sess_kill'")[0].n >= 3, 'ثلاثُ وقائع في sec');
  const r4 = await C.api('/api/sess/kill', { method: 'POST', cookie: (await C.login('0000000113', '70113')).ck, body: { uid: 'u_other' } }); assert.equal(r4.status, 403, 'الموظفُ لا يبطل جلسات غيره');
});
test('سياسةُ العمر تسري على الجلسات القائمة: sessH=1 ⇒ جلسةٌ عمرُها ساعتان تُرفض بعد تغيير السياسة · idleH=0.25', async () => {
  const { env, C, su, emp } = await world(); const tok = tokOf(emp.ck); const now = Date.now();
  env.DB.exec(`UPDATE sess SET ts = ${now - 2 * H}, la = ${now - 20 * 60000} WHERE tok = '${tok}'`);
  assert.equal((await who(C, emp.ck)).status, 200, 'بالسياسة الافتراضية (12 س / 2 س) تعمل');
  const p = await C.api('/api/policy', { method: 'POST', cookie: su.ck, body: { sessH: 1, idleH: 0.25 } }); assert.equal(p.j.ok, 1, JSON.stringify(p.j).slice(0, 100)); assert.equal(p.j.policy.sessH, 1);
  assert.equal((await who(C, emp.ck)).status, 401, 'بعد السياسة الجديدة: عمرٌ ساعتان > ساعة');
  const e2 = await C.login('0000000113', '70113'); env.DB.exec(`UPDATE sess SET la = ${now - 20 * 60000} WHERE tok = '${tokOf(e2.ck)}'`);
  assert.equal((await who(C, e2.ck)).status, 401, 'خمولٌ 20 دقيقة > ربع ساعة');
  assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act = 'policy_change'")[0].n, 1, 'تغييرُ السياسة في sec');
});
test('تغييرُ كلمة المرور: إعادةُ ضبطٍ إدارية تُسجَّل pw_change وتُبطل جلسات المستخدم (AUD-035) · التغييرُ الذاتي يُبقي جلسةَ الطالب ويُبطل الأخرى · استعادةُ مدير النظام بالمفتاح تُبطل جلساته', async () => {
  const { env, C, su, emp } = await world();
  /* الواجهةُ تحسب البصمة (PBKDF2) وترسلها في جدول الحسابات؛ هنا نحسبها بدالة الخادم نفسِها */
  const { hashPw } = await internals(['hashPw']);
  const users = JSON.parse((await C.api('/api/get?keys=bassam_auth_users_v1', { cookie: su.ck })).j.keys.bassam_auth_users_v1.v);
  assert.ok(users.every(x => !('ph' in x)), 'لا بصماتٍ في /api/get حتى لمدير النظام');
  const ph = await hashPw('70121');
  const r3 = await C.save(su.ck, { bassam_auth_users_v1: JSON.stringify(users.map(x => x.id === 'tst_emp1' ? Object.assign({}, x, { ph: ph }) : x)) }); assert.equal(r3.j.ok, 1, JSON.stringify(r3.j).slice(0, 120));
  assert.ok(env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act = 'pw_change' AND detail = 'reset'")[0].n >= 1, 'pw_change (reset) مسجَّل');
  assert.equal((await who(C, emp.ck)).status, FIXED ? 401 : 200, FIXED ? 'AUD-035: إعادةُ الضبط الإدارية تُبطل جلسات المستخدم' : 'عاملٌ قبل 252: الجلسةُ تبقى (الفجوة AUD-035 الموثَّقة)');
  assert.equal((await C.login('0000000113', '70121')).ok, true, 'كلمةُ المرور الجديدة تعمل'); assert.equal((await C.login('0000000113', '70113')).ok, false, 'والقديمةُ لا');
  /* تغييرٌ ذاتي: جلسةُ الطالب تبقى وجلساتُه الأخرى تُبطل */
  const s1 = await C.login('0000000113', '70121'), s2 = await C.login('0000000113', '70121'); assert.ok(s1.ok && s2.ok);
  const uNow = JSON.parse((await C.api('/api/get?keys=bassam_auth_users_v1', { cookie: su.ck })).j.keys.bassam_auth_users_v1.v);
  const ph2 = await hashPw('70131');
  const rs = await C.save(s1.ck, { bassam_auth_users_v1: JSON.stringify(uNow.map(x => x.id === 'tst_emp1' ? Object.assign({}, x, { ph: ph2 }) : x)) }); assert.equal(rs.j.ok, 1, 'تغييرٌ ذاتي لكلمة المرور (SELF_FIELDS): ' + JSON.stringify(rs.j).slice(0, 100)); assert.ok(!(rs.j.denied || {}).bassam_auth_users_v1, 'غيرُ مرفوض');
  assert.equal((await who(C, s1.ck)).status, 200, 'جلسةُ الطالب تبقى'); assert.equal((await who(C, s2.ck)).status, FIXED ? 401 : 200, FIXED ? 'جلستُه الأخرى أُبطلت (AUD-035)' : 'عاملٌ قبل 252: جلستُه الأخرى تبقى');
  assert.equal((await C.login('0000000113', '70131')).ok, true); assert.ok(env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act = 'pw_change' AND detail = 'self'")[0].n >= 1, 'pw_change (self) مسجَّل');
  const rk = await C.api('/api/recovery/new', { method: 'POST', cookie: su.ck, body: { pw: 'admin' } }); assert.equal(rk.j.ok, 1); assert.ok(rk.j.key || rk.j.rk, JSON.stringify(rk.j).slice(0, 120));
  const rec = await C.api('/api/recover', { method: 'POST', body: { key: rk.j.key || rk.j.rk, pw: '482917' } }); assert.equal(rec.j.ok, 1, JSON.stringify(rec.j).slice(0, 120));
  assert.equal((await who(C, su.ck)).status, 401, 'الاستعادةُ بالمفتاح تُبطل جلسات مدير النظام القائمة');
  assert.equal((await C.login('admin', '482917')).ok, true);
});
