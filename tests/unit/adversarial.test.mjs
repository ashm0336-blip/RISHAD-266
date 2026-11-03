/* RM-5 · SOT-136 (P0) — اختباراتُ تصعيد الصلاحيات العدائية على العامل الحقيقي (Node + D1 بديل): تعديلُ الحمولة · الجلسة · المسار · الحالة
   النظامان: القديم (legacy) والإنفاذ (enforce). المعيار: لا كتابةَ تُقبل خارج صلاحية الفاعل ونطاقه، ولا تسريبَ عبر القراءة، والردُّ موثَّقٌ (401/403/413/400 أو denied). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';
import { operationSaveBody } from './tasks_fx.mjs';
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_adv_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
async function world(extra = {}) {
  const env = makeTestEnv(extra); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, seedSql());
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  if (extra.KIVO_AUTHZ_MODE === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const emp = await C.login('0000000113', '70113'); assert.ok(emp.ok, 'tst_emp1');
  const emp2 = await C.login('0000000121', '70121'); assert.ok(emp2.ok, 'tst_emp2 (tst_d2)');
  return { env, C, su, emp, emp2 };
}
/* RISHAD-266 · schema 10: bassam_options_v1 مورد تشغيلي مُنمَّط — الكتابةُ بغلاف العمليات (requestId/epoch/base) والقراءةُ من /api/operations/read */
const opSave = async (C, env, ck, set, base) => { const keys = Object.keys(set); let b = base; if (!b) { const g = (await C.api('/api/operations/read?keys=' + encodeURIComponent(keys.filter(k => /^bsdept:/.test(k)).join(',')), { cookie: ck })).j; b = {}; for (const k of keys) b[k] = ((g.base || {})[k]) || 0; } return C.api('/api/save', { method: 'POST', cookie: ck, body: operationSaveBody(env, '/api/save', { set, del: [], base: b }) }); };
const opGet = async (C, ck, k) => { const j = (await C.api('/api/operations/read?keys=' + encodeURIComponent(k), { cookie: ck })).j; return { v: (j.resources || {})[k] ?? null, rev: (j.base || {})[k] ?? 0, j }; };
const getv = async (C, ck, k) => ((await C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: ck })).j.keys || {})[k];
for (const mode of ['legacy', 'enforce']) {
  const EX = mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {};
  test('[' + mode + '] الموظف لا يرفع صلاحياته: كتابة جدول الحسابات والصلاحيات والإدارات تُرفض ولا تُغيَّر القيم', async () => {
    const { C, su, emp } = await world(EX);
    const before = { users: await getv(C, su.ck, 'bassam_auth_users_v1'), perms: await getv(C, su.ck, 'bassam_perms_v1'), depts: await getv(C, su.ck, 'bassam_depts_v1') };
    const r = await C.save(emp.ck, { bassam_auth_users_v1: JSON.stringify([{ id: 'tst_emp1', un: '0000000113', role: 'super', ph: 'x' }]), bassam_perms_v1: JSON.stringify({ caps: { tst_d1: ['admin', 'emps'] }, emps: {} }), bassam_depts_v1: JSON.stringify([{ id: 'tst_d1', name: 'مخترَقة', gid: '' }]) });
    assert.ok(r.status === 200 || r.status === 403, 'الرد موثَّق: ' + r.status);
    const den = (r.j && r.j.denied) || {}; assert.ok(r.status === 403 || (den.bassam_auth_users_v1 && den.bassam_perms_v1 && den.bassam_depts_v1), 'المفاتيحُ الثلاثة مرفوضة: ' + JSON.stringify(Object.keys(den)));
    const after = { users: await getv(C, su.ck, 'bassam_auth_users_v1'), perms: await getv(C, su.ck, 'bassam_perms_v1'), depts: await getv(C, su.ck, 'bassam_depts_v1') };
    assert.deepEqual(after, before, 'لا قيمةَ تغيّرت');
    assert.equal((await C.api('/api/whoami', { cookie: emp.ck })).j.uid, 'tst_emp1');
    assert.ok([401, 403].includes((await C.api('/api/sec', { cookie: emp.ck })).status), 'دورُه لم يتغيّر (sec لمدير النظام وحده)');
    const cur = den.bassam_auth_users_v1 && den.bassam_auth_users_v1.cur; assert.ok(cur == null || !/"ph":/.test(String(cur)), '★ AUD-033: denied.cur لجدول الحسابات بلا بصمات كلمات المرور (ph)');
    const r2 = await C.api('/api/save', { method: 'POST', cookie: emp.ck, body: { set: { bassam_auth_users_v1: '[]' }, del: [], base: { bassam_auth_users_v1: 1 } } });
    const cc = r2.j && ((r2.j.conflicts || {}).bassam_auth_users_v1 || (r2.j.denied || {}).bassam_auth_users_v1); assert.ok(!cc || cc.cur == null || !/"ph":/.test(String(cc.cur)), '★ AUD-033: conflicts/denied.cur بلا ph أيضاً');
  });
  test('[' + mode + '] النطاق: موظف tst_d1 لا يكتب مفاتيح tst_d2 ولا يقرأها عبر /api/get، ولا يكتب مفتاح منصة عاماً', async () => {
    const { env, C, su, emp } = await world(EX);
    const k2 = 'bsdept:tst_d2:bassam_options_v1';
    const w2 = await opSave(C, env, su.ck, { [k2]: JSON.stringify({ type: ['d2'], work: ['d2'] }) }); assert.equal(w2.status, 200, 'مدير النظام يزرع مفتاح الإدارة الأخرى: ' + JSON.stringify(w2.j).slice(0, 120));
    const before = await opGet(C, su.ck, k2); assert.ok(before && before.v, 'المفتاح موجود');
    const r = await opSave(C, env, emp.ck, { [k2]: JSON.stringify({ type: ['hacked'], work: [] }) }, { [k2]: before.rev });
    assert.equal(r.status, 403, 'كتابةُ الإدارة الأخرى مرفوضة بحارس القراءة: ' + JSON.stringify(r.j).slice(0, 160));
    assert.ok(r.j.denied && r.j.denied[k2] && r.j.atomic === 1, 'الرفض على مفتاح الإدارة الأخرى وكلّي: ' + JSON.stringify(r.j).slice(0, 160));
    assert.deepEqual((await opGet(C, su.ck, k2)).v, before.v, 'قيمةُ الإدارة الأخرى لم تتغيّر (المورد المنمَّط)');
    const er = await opGet(C, emp.ck, k2); assert.ok(er.v == null, 'لا تسريبَ عبر /api/operations/read: ' + JSON.stringify(er.j).slice(0, 120));
    const r0 = await C.save(emp.ck, { bassam_platform_v1: JSON.stringify({ brand: { name: 'x' } }) });
    const den = (r0.j && r0.j.denied) || {}, denO = (r.j && r.j.denied) || {};
    assert.ok(r0.status === 403 || den.bassam_platform_v1, 'مفتاحُ المنصة مرفوض: ' + JSON.stringify(Object.keys(den)) + ' status=' + r0.status);
    assert.equal(denO[k2].cur, undefined, 'لا تسريبَ لقيمة الإدارة الأخرى عبر denied.cur');
    assert.ok(!/hacked|"d2"/.test(JSON.stringify(r.j)), 'ردُّ الرفض لا يحمل القيمة');
    const g = (await C.api('/api/get?keys=' + encodeURIComponent(k2), { cookie: emp.ck })).j;
    assert.ok(!(g.keys && g.keys[k2] && g.keys[k2].v != null), 'لا تسريبَ عبر /api/get: ' + JSON.stringify(g.keys).slice(0, 80));
  });
  test('[' + mode + '] الجلسة والحمولة: كوكي مزوَّر/معدَّل 401 · uid في الجسم يُهمَل · base/rev مزيّف لا يتجاوز التعارض', async () => {
    const { env, C, su, emp } = await world(EX);
    for (const ck of ['bs_tok=' + 'a'.repeat(40), 'bs_tok=' + emp.ck.split('=')[1].slice(0, -2) + 'zz', 'bs_tok=', 'bs_tok=su', 'bs_tok=' + encodeURIComponent("' OR 1=1 --")])
      assert.equal((await C.api('/api/whoami', { cookie: ck })).status, 401, 'كوكي: ' + ck.slice(0, 30));
    /* KIVO_264 · C1 (إفصاح — تعديلُ اختبار): uid في الجسم لم يعد «يُهمَل» — مخالفتُه صاحبَ الجلسة ⇒ 409 session-changed بلا أيّ كتابة (عقدُ الطابور · D-3)،
       وهو أشدُّ من الإهمال؛ والدورُ في الجسم ما زال مهمَلاً (الحالةُ الثانية) — فالاختبارُ يبقى شاهداً على «الجسمُ لا يرفع الصلاحية» */
    const r = await C.api('/api/save', { method: 'POST', cookie: emp.ck, body: { uid: 'su', role: 'super', set: { bassam_depts_v1: '[]' }, del: [], base: {} } });
    assert.equal(r.status, 409, 'uid في الجسم لا يرفع الصلاحية — يُرفض الطلبُ كلُّه'); assert.equal(r.j.err, 'session-changed');
    const r2 = await C.api('/api/save', { method: 'POST', cookie: emp.ck, body: { role: 'super', set: { bassam_depts_v1: '[]' }, del: [], base: {} } });
    assert.ok(r2.status === 200 || r2.status === 403); assert.ok(r2.status === 403 || ((r2.j.denied || {}).bassam_depts_v1), 'role في الجسم لا يرفع الصلاحية');
    assert.ok(((await C.api('/api/get?keys=bassam_depts_v1', { cookie: su.ck })).j.keys.bassam_depts_v1.v || '').indexOf('dR') >= 0, 'الإدارات كما هي');
    const k = 'bsdept:dR:bassam_options_v1';
    const w1 = await opSave(C, env, su.ck, { [k]: JSON.stringify({ type: ['v1'], work: [] }) }); assert.equal(w1.status, 200, JSON.stringify(w1.j).slice(0, 160));
    const first = await opGet(C, su.ck, k);
    const w2 = await opSave(C, env, su.ck, { [k]: JSON.stringify({ type: ['v2'], work: [] }) }); assert.equal(w2.status, 200, JSON.stringify(w2.j).slice(0, 160));
    const cur = await opGet(C, su.ck, k);
    const stale = await opSave(C, env, su.ck, { [k]: JSON.stringify({ type: ['stale'], work: [] }) }, { [k]: first.rev });
    assert.ok(stale.status === 409 && stale.j.conflicts && stale.j.conflicts[k], 'نسخةٌ قديمة ⇒ تعارض لا كتابة: ' + JSON.stringify(stale.j).slice(0, 160));
    assert.deepEqual((await opGet(C, su.ck, k)).v.type, ['v2'], 'القيمةُ الأحدث باقية');
    const huge = await opSave(C, env, su.ck, { [k]: JSON.stringify({ type: ['x'.repeat(999999)], work: [] }) }, { [k]: cur.rev });
    assert.ok(huge.status === 413 || huge.status === 200, 'حمولة < 8MB تُعالج أو تُرفض بوضوح: ' + huge.status);
  });
  test('[' + mode + '] المسار: مفاتيحُ شكلٍ خاطئ (اجتياز · طويلة · فارغة) تُرفض · طرقٌ غيرُ مسموحة · جسمٌ أكبر من الحد 413', async () => {
    const { C, su, emp } = await world(EX);
    const bad = ['bsdept:tst_d1:../bassam_auth_users_v1', 'bsdept:tst_d1:bassam_' + 'x'.repeat(300), '', 'bsdept::bassam_x', 'bassam_auth_users_v1\u0000', '../../meta'];
    const r = await C.save(emp.ck, Object.fromEntries(bad.map(k => [k, '{}'])));
    assert.ok(r.status === 200 || r.status === 400 || r.status === 403, 'الرد موثَّق: ' + r.status);
    if (r.status === 200) { const acc = Object.keys(r.j.revs || {}); assert.deepEqual(acc, [], 'لا مفتاحَ قُبل: ' + JSON.stringify(acc)); }
    assert.equal((await C.api('/api/save', { cookie: su.ck })).status, 404, 'GET على /api/save ليس كتابة (404)');
    const bigBody = JSON.stringify({ u: 'x'.repeat(70000), p: 'y' });
    const big = await C.api('/api/login', { method: 'POST', body: bigBody, headers: { 'content-length': String(bigBody.length) } });   /* المنصة ترسل Content-Length دائماً؛ العُدّة تضعه صراحةً */
    assert.equal(big.status, 413, 'جسمُ الدخول > 64KB ⇒ 413');
    const bigImg = await C.api('/api/img/im_adv', { method: 'PUT', cookie: su.ck, headers: { 'content-type': 'text/plain' }, body: 'A'.repeat(600 * 1024) });
    assert.ok([403, 413].includes(bigImg.status), 'صورة > 512KB ⇒ 413 (أو 403 قبلها): ' + bigImg.status);
  });
  test('[' + mode + '] الصور: موظفٌ لا يحذف/يستبدل صورةً تملكها إدارةٌ أخرى', async () => {
    const { C, su, emp, emp2 } = await world(EX);
    const put = await C.api('/api/img/im_d2x', { method: 'PUT', cookie: emp2.ck, headers: { 'content-type': 'text/plain' }, body: 'data:image/png;base64,iVBORw0KGgo=' });
    if (put.status !== 200) { assert.ok([403].includes(put.status), 'رفعُ emp2: ' + put.status); return; }
    const del = await C.api('/api/img/im_d2x', { method: 'DELETE', cookie: emp.ck }); assert.equal(del.status, 403, 'حذفُ صورة إدارةٍ أخرى 403');
    const over = await C.api('/api/img/im_d2x', { method: 'PUT', cookie: emp.ck, headers: { 'content-type': 'text/plain' }, body: 'data:image/png;base64,AAAA' }); assert.equal(over.status, 403, 'استبدالُها 403');
    const rd = await C.api('/api/img/im_d2x', { cookie: emp2.ck }); assert.equal(rd.status, 200, 'المالكُ يقرؤها');
    assert.equal((await C.api('/api/img/im_d2x', { cookie: emp.ck })).status, 403, 'غيرُ المالك خارج النطاق لا يقرؤها');
  });
}
test('[enforce] /api/changes يعلن وضع الإنفاذ (am) ولا يعيد مفاتيح خارج نطاق الموظف', async () => {
  const { C, su, emp } = await world({ KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' });
  await C.save(su.ck, { 'bsdept:dR:bassam_options_v1': JSON.stringify({ secret: 'dR' }) });
  const ch = (await C.api('/api/changes?since=0', { cookie: emp.ck })).j;
  assert.equal(ch.am, 'enforce', 'am=enforce: ' + JSON.stringify(ch).slice(0, 100));
  const keys = Array.isArray(ch.keys) ? ch.keys : Object.keys(ch.keys || {}); assert.ok(!keys.some(k => k.startsWith('bsdept:dR:')), 'لا مفاتيحَ إدارةٍ أخرى: ' + keys.filter(k => k.startsWith('bsdept:dR:')).join(','));
});
