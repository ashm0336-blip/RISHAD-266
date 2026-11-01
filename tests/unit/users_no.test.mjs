/* KIVO_259 — المراجعةُ الأمنية المستقلة (reports/k259/secreview_259.md):
   SR-1 (عالية): الرقمُ الوظيفي «no» في حسابات مديري الإدارات ومديري الإدارة العامة هو كلمةُ مرورهم الأولى (ph = hash(no) بلا إلزامٍ بالتغيير)،
        وكانت قائمةُ الحسابات العامة تُرسل إلى كل جلسةٍ بلا البصمة فقط — فيقرأ أيُّ موظفٍ «no» و«un» لكل مدير ويدخل بحسابه (عبر الإدارات).
        الآن: لا يغادر «no» الخادمَ إلا لمدير النظام ولصاحب الحساب (في الإقلاع · /api/get · قيمةِ الرفض/التعارض)، وكتابةُ غيرِ مدير النظام
        لقائمةٍ بلا «no» ترثه من القيمة الحالية فلا يُمحى ولا تُحسب الكتابةُ تعديلاً لحساب مدير.
   SR-8: اسمُ الدخول (un/alt) فريدٌ في الخادم — الدخولُ يأخذ أوّلَ مطابق، فحسابٌ جديدٌ يحمل اسمَ دخول غيره (ولو مدير النظام) يحجبه.
   كلُّها في الوضعين (legacy · enforce). تُخفق (أ) و(ب) و(ج) على عامل 255 (الرقمُ الوظيفي يصل لكل جلسة · التكرارُ يُقبل). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';

const K = 'bassam_auth_users_v1';
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {};
  f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_no_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const dbUsers = async (env) => { const r = await env.DB.prepare('SELECT v FROM kv WHERE k = ?1 ORDER BY seq').bind(K).all(); return JSON.parse(r.results.map(x => x.v).join('')); };
/* البذرةُ كالواقع: حساباتُ المديرين ومدير العموم تحمل no = الرقم الوظيفي = كلمةُ المرور (tst_dm1: 0000000101 / 70101 …) */
const ROLES = [['gm', 'tst_gm1', '0000000103', '70103'], ['dm', 'tst_dm1', '0000000101', '70101'], ['sup', 'tst_sup1', '0000000111', '70111'], ['emp', 'tst_emp1', '0000000113', '70113'], ['ds', 'tst_ds', '0000000120', '70120']];
async function world(EX) {
  const env = makeTestEnv(EX); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, seedSql());
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  if (EX.KIVO_AUTHZ_MODE === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const S = { super: Object.assign(su, { id: 'su' }) };
  for (const [name, id, un, pw] of ROLES) { const l = await C.login(un, pw); assert.ok(l.ok, 'دخول ' + name); S[name] = Object.assign(l, { id }); }
  const withNo = (await dbUsers(env)).filter(u => Object.prototype.hasOwnProperty.call(u, 'no'));
  assert.ok(withNo.length >= 4 && withNo.some(u => u.role === 'gm'), 'البذرة: حساباتُ مديرين ومدير عموم تحمل الرقمَ الوظيفي');
  return { env, C, S, withNo };
}
const leaked = (list, me) => (list || []).filter(u => u && u.id !== me && Object.prototype.hasOwnProperty.call(u, 'no')).map(u => u.id + '=' + u.no);

for (const mode of ['legacy', 'enforce']) {
  const EX = mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {};

  test('[' + mode + '] SR-1 (أ) الإقلاعُ و/api/get: لا رقمَ وظيفيَّ لحساب غيرك — إلا لمدير النظام · وصاحبُ الحساب يرى رقمَه', async () => {
    const { C, S, withNo } = await world(EX);
    for (const [role, s] of Object.entries(S)) {
      const g = await C.api('/api/get?keys=' + K, { cookie: s.ck }); const lg = JSON.parse(g.j.keys[K].v);
      const b = (await C.boot(s.ck)).boot; assert.ok(b && b.keys && b.keys[K], role + ": الإقلاعُ يحمل الحسابات"); const lb = JSON.parse(b.keys[K]);
      if (role === 'super') {
        for (const w of withNo) { assert.equal(lg.find(u => u.id === w.id).no, w.no, 'مديرُ النظام يرى ' + w.id); assert.equal(lb.find(u => u.id === w.id).no, w.no); }
        continue;
      }
      assert.deepEqual(leaked(lg, s.id), [], role + ': /api/get يحمل أرقامَ غيره');
      assert.deepEqual(leaked(lb, s.id), [], role + ': الإقلاعُ يحمل أرقامَ غيره');
      const mine = withNo.find(u => u.id === s.id);
      if (mine) { assert.equal(lg.find(u => u.id === s.id).no, mine.no, role + ': رقمُه في /api/get'); assert.equal(lb.find(u => u.id === s.id).no, mine.no, role + ': رقمُه في الإقلاع'); }
      assert.ok(lg.every(u => !u.ph) && lb.every(u => !u.ph), 'ولا بصمة (AUD-033)');
    }
    /* ما كان ممكناً: موظفٌ في إدارة tst_d1 يقرأ رقمَ مدير الإدارة ٢ فيدخل بحسابه */
    const lg = JSON.parse((await C.api('/api/get?keys=' + K, { cookie: S.emp.ck })).j.keys[K].v); const dm2 = lg.find(u => u.id === 'tst_dm2');
    /* الفحصُ العميق 2026-10-21 · R4 (إفصاح — تعديلُ اختبار): كان الشرطُ «يظهر باسم دخوله (dm2.un) بلا رقمه» — واسمُ الدخول رقمُ هويةٍ أو جوال،
       وحساباتُ الإدارات الأخرى (موظفوها ومديروها) لا تصل بعد اليوم من ليست في نطاقه أصلاً (054 usersScopeOut · tests/unit/users_scope_w1.test.mjs) */
    assert.ok(!dm2, 'حسابُ مدير إدارةٍ أخرى لا يصله أصلاً (ولا رقمُه): ' + JSON.stringify(dm2));
  });

  test('[' + mode + '] SR-1 (ب) الرفضُ والتعارض لا يكشفان الرقم — والكتابةُ بلا «no» ترثه (لا يُمحى ولا تُعدّ تعديلاً لحساب مدير)', async () => {
    const { env, C, S, withNo } = await world(EX);
    /* الموظف: يغيّر كلمةَ مروره في قائمةٍ تلقّاها بلا أرقام غيره ⇒ يُقبل وتبقى الأرقامُ في القاعدة
       KIVO_264 · D14 (إفصاح — تعديلُ اختبار): كان التعديلُ الذاتيُّ هنا اسمَه — والموظفُ لم يعد يغيّر اسمَه (حقولُه الذاتية كلمةُ المرور وحدها)،
       فصار كلمةَ مروره (بصمةٌ حديثة p2$) ليبقى الاختبارُ شاهداً على «الكتابةُ بلا no ترثه» بتعديلٍ ذاتيٍّ مقبول */
    const P2A = 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64), P2B = 'p2$100000$' + 'c'.repeat(32) + '$' + 'd'.repeat(64);
    const g = await C.api('/api/get?keys=' + K, { cookie: S.emp.ck }); const list = JSON.parse(g.j.keys[K].v), rev = g.j.keys[K].rev;
    const mineEdit = list.map(u => u.id === 'tst_emp1' ? Object.assign({}, u, { ph: P2A }) : u);
    const s1 = await C.api('/api/save', { method: 'POST', cookie: S.emp.ck, body: { set: { [K]: JSON.stringify(mineEdit) }, del: [], base: { [K]: rev } } });
    assert.equal(s1.j.ok, 1); assert.ok(s1.j.revs && s1.j.revs[K], 'قُبل تغييرُ كلمة المرور: ' + JSON.stringify(s1.j).slice(0, 300));
    const db1 = await dbUsers(env);
    for (const w of withNo) assert.equal(db1.find(u => u.id === w.id).no, w.no, 'بقي رقمُ ' + w.id + ' في القاعدة');
    assert.equal(db1.find(u => u.id === 'tst_emp1').ph, P2A);
    /* الرفض: الموظف يعدّل حسابَ مديرٍ (يضع رقماً يعرفه) ⇒ رفضٌ وقيمةُ الخادم المرفقة بلا أرقام غيره */
    const g2 = await C.api('/api/get?keys=' + K, { cookie: S.emp.ck }); const l2 = JSON.parse(g2.j.keys[K].v);
    /* الفحصُ العميق · R4 (إفصاح — تعديلُ اختبار): حسابُ المدير لم يعد في قائمته (usersScopeOut) — فالتزويرُ سجلٌّ بمعرّفه يُلحق بها */
    const forged = l2.some(u => u.id === 'tst_dm2') ? l2.map(u => u.id === 'tst_dm2' ? Object.assign({}, u, { no: '12345', name: 'x' }) : u)
      : l2.concat([{ id: 'tst_dm2', role: 'staff', deptId: 'tst_d2', ekey: 'mgr:tst_d2', mgr: true, no: '12345', name: 'x' }]);
    const s2 = await C.api('/api/save', { method: 'POST', cookie: S.emp.ck, body: { set: { [K]: JSON.stringify(forged) }, del: [], base: { [K]: g2.j.keys[K].rev } } });
    const d2 = (s2.j.denied || {})[K]; assert.ok(d2, 'رُفض: ' + JSON.stringify(s2.j).slice(0, 300));
    if (d2.cur) assert.deepEqual(leaked(JSON.parse(d2.cur), 'tst_emp1'), [], 'قيمةُ الرفض بلا أرقام غيره');
    assert.equal((await dbUsers(env)).find(u => u.id === 'tst_dm2').no, '70102', 'لم يتغيّر رقمُ المدير');
    /* التعارض: نسخةٌ متجاوَزة ⇒ قيمةُ الخادم المرفقة بلا أرقام غيره */
    const s3 = await C.api('/api/save', { method: 'POST', cookie: S.emp.ck, body: { set: { [K]: JSON.stringify(mineEdit.map(u => u.id === 'tst_emp1' ? Object.assign({}, u, { ph: P2B }) : u)) }, del: [], base: { [K]: rev } } });
    const c3 = (s3.j.conflicts || {})[K]; assert.ok(c3 && c3.cur, 'تعارض: ' + JSON.stringify(s3.j).slice(0, 300));
    assert.deepEqual(leaked(JSON.parse(c3.cur), 'tst_emp1'), [], 'قيمةُ التعارض بلا أرقام غيره');
    /* مدير الإدارة: يعدّل حسابَ موظفٍ في إدارته (التجميد) في قائمةٍ بلا أرقام زملائه المديرين ⇒ يُقبل والأرقامُ باقية */
    const g4 = await C.api('/api/get?keys=' + K, { cookie: S.dm.ck }); const l4 = JSON.parse(g4.j.keys[K].v);
    assert.equal(l4.find(u => u.id === 'tst_dm1').no, '70101', 'المديرُ يرى رقمَه');
    const dm2b = l4.find(u => u.id === 'tst_dm2'); assert.ok(!dm2b || !('no' in dm2b), 'ولا رقمَ مدير الإدارة الأخرى (الفحصُ العميق · R4: ولا حسابَه أصلاً)');
    const fr = l4.map(u => u.id === 'tst_snop' ? Object.assign({}, u, { dis: 1 }) : u);
    const s4 = await C.api('/api/save', { method: 'POST', cookie: S.dm.ck, body: { set: { [K]: JSON.stringify(fr) }, del: [], base: { [K]: g4.j.keys[K].rev } } });
    assert.ok(s4.j.revs && s4.j.revs[K], 'قُبل تجميدُ موظفه: ' + JSON.stringify(s4.j).slice(0, 300));
    const db4 = await dbUsers(env);
    for (const w of withNo) assert.equal(db4.find(u => u.id === w.id).no, w.no, 'بقي رقمُ ' + w.id);
    assert.equal(db4.find(u => u.id === 'tst_snop').dis, 1);
  });

  test('[' + mode + '] SR-8 (ج) اسمُ دخولٍ يصادم حساباً آخر يُرفض في الخادم (ولو قبله في الترتيب · ولو من مدير النظام) — والتكرارُ القديم لا يعطّل الحفظ', async () => {
    const { env, C, S } = await world(EX);
    const g = await C.api('/api/get?keys=' + K, { cookie: S.dm.ck }); const l = JSON.parse(g.j.keys[K].v);
    /* KIVO_261 · AUD-056 (إفصاح — تعديلُ اختبار): المعرّفُ «tst_new» صار في نطاقٍ محجوز (حسابٌ جديدٌ بمعرّفٍ يبدأ بـtst_ يُرفض بلا أداة الاختبار)،
       فكان الرفضُ في (s1 · s1b) سيُنسب إلى الحجز لا إلى تصادم الاسم — المعرّفُ الآن عاديٌّ ليبقى الاختبارُ شاهداً على SR-8 وحده. */
    const mk = (un) => ({ id: 'u_sr8_new', un, ph: '', role: 'staff', deptId: 'tst_d1', ekey: 'tst_e_new', name: 'TEST_ONLY · جديد', dis: 0 });
    /* مديرُ الإدارة يضيف حساباً اسمُه اسمُ دخول مدير النظام في أوّل القائمة ⇒ رفض */
    const s1 = await C.api('/api/save', { method: 'POST', cookie: S.dm.ck, body: { set: { [K]: JSON.stringify([mk(TEST_SUPER_USERNAME)].concat(l)) }, del: [], base: { [K]: g.j.keys[K].rev } } });
    assert.ok((s1.j.denied || {})[K], 'رُفض التصادمُ مع مدير النظام: ' + JSON.stringify(s1.j).slice(0, 300));
    const s1b = await C.api('/api/save', { method: 'POST', cookie: S.dm.ck, body: { set: { [K]: JSON.stringify([Object.assign(mk('0000000999'), { alt: '0000000113' })].concat(l)) }, del: [], base: { [K]: g.j.keys[K].rev } } });
    assert.ok((s1b.j.denied || {})[K], 'رُفض التصادمُ بالاسم البديل');
    assert.ok((await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN)).ok, 'مدير النظام يدخل كما كان');
    /* اسمٌ جديد غيرُ مستعمل ⇒ يُقبل (الضابط) */
    const s2 = await C.api('/api/save', { method: 'POST', cookie: S.dm.ck, body: { set: { [K]: JSON.stringify(l.concat([mk('0000000998')])) }, del: [], base: { [K]: g.j.keys[K].rev } } });
    assert.ok(s2.j.revs && s2.j.revs[K], 'اسمٌ فريدٌ يُقبل: ' + JSON.stringify(s2.j).slice(0, 300));
    /* مديرُ النظام كذلك */
    const gs = await C.api('/api/get?keys=' + K, { cookie: S.super.ck }); const ls = JSON.parse(gs.j.keys[K].v);
    const s3 = await C.api('/api/save', { method: 'POST', cookie: S.super.ck, body: { set: { [K]: JSON.stringify(ls.map(u => u.id === 'tst_dm2' ? Object.assign({}, u, { un: '0000000101' }) : u)) }, del: [], base: { [K]: gs.j.keys[K].rev } } });
    assert.ok((s3.j.denied || {})[K], 'مديرُ النظام لا يعيد تسميةَ حسابٍ إلى اسم غيره');
    /* تكرارٌ قديمٌ في القاعدة (قبل الإصلاح) لا يمنع حفظاً لا يمسّه */
    const raw = await dbUsers(env); raw.push(Object.assign({}, raw.find(u => u.id === 'tst_emp2'), { id: 'tst_old_dup' }));
    env.DB.exec("DELETE FROM kv WHERE k = '" + K + "'"); await env.DB.prepare('INSERT INTO kv (k, seq, v) VALUES (?1, 0, ?2)').bind(K, JSON.stringify(raw)).run();
    const g5 = await C.api('/api/get?keys=' + K, { cookie: S.super.ck }); const l5 = JSON.parse(g5.j.keys[K].v);
    const s5 = await C.api('/api/save', { method: 'POST', cookie: S.super.ck, body: { set: { [K]: JSON.stringify(l5.map(u => u.id === 'tst_emp1' ? Object.assign({}, u, { name: 'بلا مساس' }) : u)) }, del: [], base: { [K]: g5.j.keys[K].rev } } });
    assert.ok(s5.j.revs && s5.j.revs[K], 'التكرارُ القديم لا يعطّل: ' + JSON.stringify(s5.j).slice(0, 300));
  });
}
