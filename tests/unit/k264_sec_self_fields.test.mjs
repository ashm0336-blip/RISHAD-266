/* KIVO_264 · D14 + OD-7 (ب) — الحقولُ الذاتية في سجلّ الحساب بحسب الدور، في الخادم (كانت ['ph','name','email','phone','un','alt'] لكل الأدوار —
   فيغيّر الموظفُ اسمَ دخوله (الهوية/الجوال) واسمَه بحفظٍ مصنوع والواجهةُ تمنعه):
     staff (الموظف · مديرُ الإدارة المعيَّن · الموظفُ بصفة مدير) ⇒ ph وحدها · gm ⇒ ph · email · phone · super ⇒ ph · name · email · phone · un · alt
     اسمُ الدخول (un/alt) لا يتغيّر إلا بكلمة المرور الحالية «cur» في جسم /api/save نفسِه (تُفحص في الخادم بحارس pw:<uid>) وبصيغة 10 أرقام —
     عدا الدخولَ الأوّل الإجباري (اسمٌ قديمٌ بصيغةٍ غير صالحة · حالةُ «يجب التغيير» · جلسةٌ حديثة · كلمةُ مرورٍ جديدة معه) وهو ما تعرضه شاشةُ الدخول.
   في الوضعين (legacy · enforce). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeLegacyTestEnv as makeEnv, client, applySql, ROOT, WORKER } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';
const K264 = fs.readFileSync(WORKER, 'utf8').includes('SELF_FIELDS_BY_ROLE') || process.env.KIVO_K264_STRICT ? {} : { skip: 'العاملُ المختبَر قبل KIVO_264' };
const K = 'bassam_auth_users_v1';
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {};
  f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_k264s_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
/* بصمةٌ حقيقية بصيغة الخادم (PBKDF2-SHA256 × 100,000) — ليُختبر الدخولُ بعدها */
const ph = (pw) => { const s = crypto.randomBytes(16); return 'p2$100000$' + s.toString('hex') + '$' + crypto.pbkdf2Sync(pw, s, 100000, 32, 'sha256').toString('hex'); };
const dbUsers = (env) => JSON.parse(env.DB.q('SELECT v FROM kv WHERE k = ?1 ORDER BY seq', K).map(r => r.v).join(''));
async function world(mode) {
  const env = makeEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {}); const C = client(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  await applySql(env.DB, seedSql());
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage (current_schema_fx) */
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  /* حفظُ سجلّي أنا بتعديلٍ — عبر /api/get (ما يراه الفاعل فعلاً) ثم /api/save كما يفعل العميل */
  const self = async (ck, uid, patch, extra) => {
    const g = await C.api('/api/get?keys=' + K, { cookie: ck }); const it = g.j.keys[K]; const list = JSON.parse(it.v);
    const before = JSON.stringify(dbUsers(env).find(u => u.id === uid));
    const body = Object.assign({ set: { [K]: JSON.stringify(list.map(u => u.id === uid ? Object.assign({}, u, patch) : u)) }, del: [], base: { [K]: it.rev } }, extra || {});
    const r = await C.api('/api/save', { method: 'POST', cookie: ck, body });
    const after = dbUsers(env).find(u => u.id === uid);
    return { r, denied: (r.j.denied || {})[K] || null, changed: JSON.stringify(after) !== before, after };
  };
  return { env, C, su, self };
}
for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] الموظفُ ومديرُ الإدارة المعيَّن: كلمةُ المرور وحدها — لا اسمَ دخولٍ ولا بديلَ ولا اسمَ ولا بريدَ ولا جوال (ولو بكلمة المرور الحالية)', K264, async () => {
    const { C, self } = await world(mode);
    for (const [who, un, pw, uid] of [['موظف', '0000000113', '70113', 'tst_emp1'], ['مدير إدارة معيَّن', '0000000101', '70101', 'tst_dm1']]) {
      const s = await C.login(un, pw); assert.ok(s.ok, who);
      for (const patch of [{ un: '0000009113' }, { alt: '0500009113' }, { name: 'اسمٌ يختاره' }, { email: 'x@example.test' }, { phone: '0500009113' }]) {
        const x = await self(s.ck, uid, patch, { cur: pw });
        assert.ok(x.denied && !x.changed, who + ' ⇐ ' + JSON.stringify(patch) + ' مرفوض: ' + JSON.stringify(x.r.j).slice(0, 200));
        assert.equal(x.denied.why, 'self', who + ': السبب self');
      }
      const ok = await self(s.ck, uid, { ph: ph('24680') });
      assert.ok(!ok.denied && ok.changed, who + ': تغييرُ كلمة المرور مقبول: ' + JSON.stringify(ok.r.j).slice(0, 200));
      assert.ok((await C.login(un, '24680')).ok, who + ': يدخل بكلمته الجديدة');
    }
  });
  test('[' + mode + '] مديرُ العقدة: كلمةُ المرور وبياناتُ الاتصال — لا الاسمُ ولا اسمُ الدخول', K264, async () => {
    const { C, self } = await world(mode);
    const gm = await C.login('0000000103', '70103'); assert.ok(gm.ok);
    const e1 = await self(gm.ck, 'tst_gm1', { email: 'gm1@example.test', phone: '0500000103' });
    assert.ok(!e1.denied && e1.changed, 'البريدُ والجوال مقبولان: ' + JSON.stringify(e1.r.j).slice(0, 200));
    assert.equal(e1.after.email, 'gm1@example.test');
    const big = await self(gm.ck, 'tst_gm1', { email: 'x'.repeat(300) + '@x' }); assert.ok(big.denied && !big.changed, 'بريدٌ أطولُ من 254 مرفوض (AUD-057)');
    for (const patch of [{ name: 'اسمٌ آخر' }, { un: '0000009103' }, { alt: '0500009103' }, { role: 'super' }, { gid: 'tst_g2' }]) {
      const x = await self(gm.ck, 'tst_gm1', patch, { cur: '70103' }); assert.ok(x.denied && !x.changed, JSON.stringify(patch) + ' مرفوض');
    }
  });
  test('[' + mode + '] مديرُ النظام: الاسمُ والاتصال بحرّية · اسمُ الدخول بكلمة المرور الحالية (cur) وبصيغة 10 أرقام · الخاطئةُ محاولةٌ محسوبة · cur لا يُخزَّن', K264, async () => {
    const { env, C, su, self } = await world(mode);
    /* الدخولُ الأوّل الإجباري (admin/admin): اسمٌ صالح + كلمةُ مرورٍ جديدة في الحفظة نفسِها بلا cur — كما تفعل شاشةُ الدخول */
    const f = await self(su.ck, 'su', { un: '0500000000', ph: ph('482917') });
    assert.ok(!f.denied && f.changed, 'الدخولُ الأوّل الإجباري يمرّ: ' + JSON.stringify(f.r.j).slice(0, 200));
    const s2 = await C.login('0500000000', '482917'); assert.ok(s2.ok, 'يدخل بالاسم والكلمة الجديدين');
    /* بعدها: الاسمُ والاتصال بلا cur */
    const n1 = await self(s2.ck, 'su', { name: 'مدير النظام · معدَّل', email: 'su@example.test' }); assert.ok(!n1.denied && n1.changed, 'الاسمُ والبريد');
    /* اسمُ الدخول: بلا cur ⇒ self-cur · cur خاطئة ⇒ self-cur · صيغةٌ غير صالحة ⇒ self-un · cur صحيحة ⇒ يُقبل */
    const a = await self(s2.ck, 'su', { un: '0511111111' }); assert.ok(a.denied && !a.changed); assert.equal(a.denied.why, 'self-cur');
    const b = await self(s2.ck, 'su', { un: '0511111111' }, { cur: '111111' }); assert.ok(b.denied && !b.changed); assert.equal(b.denied.why, 'self-cur');
    assert.ok((env.DB.q("SELECT n FROM guard WHERE gk = 'pw:su'")[0] || { n: 0 }).n >= 1, 'الخاطئةُ محاولةٌ في حارس pw:<uid>');
    const c = await self(s2.ck, 'su', { un: 'superman' }, { cur: '482917' }); assert.ok(c.denied && !c.changed); assert.equal(c.denied.why, 'self-un');
    const al = await self(s2.ck, 'su', { alt: '0533333333' }); assert.ok(al.denied && !al.changed, 'البديلُ كاسم الدخول'); assert.equal(al.denied.why, 'self-cur');
    /* KIVO_264 (المراجعة F6): الحارسُ المقفل يُسمّى 'self-lock' (لا 'self-cur' المضلِّلة) — ثم يُفكّ فتمرّ الصحيحة */
    env.DB.exec("INSERT INTO guard (gk, n, until) VALUES ('pw:su', 99, " + (Date.now() + 3600000) + ") ON CONFLICT(gk) DO UPDATE SET n = 99, until = excluded.until");
    const lk = await self(s2.ck, 'su', { un: '0511111111' }, { cur: '482917' }); assert.ok(lk.denied && !lk.changed, 'المقفلُ لا يُقبل ولو صحّت'); assert.equal(lk.denied.why, 'self-lock');
    env.DB.exec("DELETE FROM guard WHERE gk = 'pw:su'");
    const d = await self(s2.ck, 'su', { un: '0511111111' }, { cur: '482917' }); assert.ok(!d.denied && d.changed, 'cur صحيحة ⇒ يُقبل: ' + JSON.stringify(d.r.j).slice(0, 200));
    assert.ok((await C.login('0511111111', '482917')).ok, 'يدخل بالاسم الجديد'); assert.ok(!(await C.login('0500000000', '482917')).ok, 'والقديمُ لم يعد اسمَ دخول');
    /* cur نصٌّ أو null في المخطّط */
    const bt = await C.api('/api/save', { method: 'POST', cookie: s2.ck, body: { set: {}, del: [], base: {}, cur: 482917 } }); assert.equal(bt.status, 400); assert.equal(bt.j.at, 'cur');
    /* cur لا يُخزَّن ولا يُسجَّل في أيّ جدول */
    for (const t of ['kv', 'aud', 'sec', 'meta', 'guard']) { const rows = env.DB.q('SELECT * FROM ' + t); assert.ok(!JSON.stringify(rows).includes('482917'), 'لا أثرَ لكلمة المرور في ' + t); }
  });
  test('[' + mode + '] الدخولُ الأوّل الإجباري لا يُستعمل باباً خلفياً: جلسةٌ قديمة أو بلا كلمةٍ جديدة أو اسمٌ صالحٌ أصلاً ⇒ cur مطلوبة', K264, async () => {
    const { env, C, su, self } = await world(mode);
    /* بلا كلمة مرورٍ جديدة في الحفظة نفسِها */
    const a = await self(su.ck, 'su', { un: '0500000000' }); assert.ok(a.denied && !a.changed); assert.equal(a.denied.why, 'self-cur');
    /* جلسةٌ قديمة (أكثرُ من 15 دقيقة على الدخول) */
    env.DB.exec("UPDATE sess SET ts = ts - 3600000");
    const b = await self(su.ck, 'su', { un: '0500000000', ph: ph('482917') }); assert.ok(b.denied && !b.changed, 'جلسةٌ قديمة'); assert.equal(b.denied.why, 'self-cur');
    const c = await self(su.ck, 'su', { un: '0500000000', ph: ph('482917') }, { cur: 'admin' }); assert.ok(!c.denied && c.changed, 'وبكلمة المرور الحالية يمرّ');
    /* الموظفُ في حالة «يجب التغيير» (mc) واسمُه بصيغةٍ غير صالحة: يعيّن اسماً صالحاً مع كلمته الجديدة — وغيرُه لا */
    const us = dbUsers(env).map(u => u.id === 'tst_emp2' ? Object.assign({}, u, { un: '+966500000121', mc: 1 }) : u);
    const sv = await C.save(su.ck, { [K]: JSON.stringify(us) }); assert.ok(!(sv.j.denied || {})[K], JSON.stringify(sv.j).slice(0, 200));
    const e2 = await C.login('+966500000121', '70121'); assert.ok(e2.ok && e2.j.mustChange === 1, 'حالةُ يجب التغيير');
    const f1 = await self(e2.ck, 'tst_emp2', { un: '0500000121' }); assert.ok(f1.denied && !f1.changed, 'بلا كلمةٍ جديدة');
    const f2 = await self(e2.ck, 'tst_emp2', { un: '0500000121', name: 'اسمٌ آخر', ph: ph('13579') }); assert.ok(f2.denied && !f2.changed, 'ولا الاسم معه');
    const f3 = await self(e2.ck, 'tst_emp2', { un: '0500000121', ph: ph('13579') }); assert.ok(!f3.denied && f3.changed, 'الإجباريُّ يمرّ: ' + JSON.stringify(f3.r.j).slice(0, 200));
    assert.ok(!f3.after.mc, 'سقط علمُ «يجب التغيير» بتغيير كلمته');
    const f4 = await self(e2.ck, 'tst_emp2', { un: '0500000999' }, { cur: '13579' }); assert.ok(f4.denied && !f4.changed, 'بعدها: الموظفُ لا يغيّر اسمَ دخوله ولو بكلمته'); assert.equal(f4.denied.why, 'self');
    /* حسابٌ قديمٌ بالدور dept (أُلغي — التنظيف L-05 أ · F19) واسمٍ غير صالح: يدخل فيُطلب منه التغيير، لكنّ أيَّ تعديلٍ لصفّه يُرفض «shape» —
       دورٌ لا يُكتب بعد اليوم؛ وصفوفُه القائمة يحذفها المالك. (إفصاح — تعديلُ اختبار: كان هنا أنّ الإجباريَّ للحساب القديم يمرّ ويدخل بالجديدين —
       وهو تعديلُ صفّ dept نفسُه الذي يغلقه F19، كما في الخطّ القديم 5197c2e) */
    const us2 = dbUsers(env).concat([{ id: 'tst_mzz', un: 'mgrzz264', ph: ph('Mgr#Zz2026'), name: 'TEST_ONLY · مدير قديم', role: 'dept', deptId: 'tst_d2', test: 'TEST_ONLY' }]);
    /* حسابٌ قديمٌ في البيانات (لا يُنشأ اليوم بالحفظ — الدورُ dept لم يعد يُقبل) ⇒ يُزرع في القاعدة مباشرةً كما تركته إصداراتٌ سابقة */
    const q = (x) => "'" + String(x).replace(/'/g, "''") + "'";
    await applySql(env.DB, ['DELETE FROM kv WHERE k = ' + q(K) + ';', 'INSERT INTO kv (k, seq, v) VALUES (' + q(K) + ', 0, ' + q(JSON.stringify(us2)) + ');',
      "INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(meta.v AS INTEGER) + 1 AS TEXT);",
      'INSERT INTO revs (k, rev) VALUES (' + q(K) + ", (SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'rev')) ON CONFLICT(k) DO UPDATE SET rev = excluded.rev;"].join('\n'));
    assert.ok(dbUsers(env).some((u) => u.id === 'tst_mzz' && u.role === 'dept'), 'زُرع الحسابُ القديم');
    const m1 = await C.login('mgrzz264', 'Mgr#Zz2026'); assert.ok(m1.ok && m1.j.mustChange === 1, 'الاسمُ غيرُ الصالح ⇒ يجب التغيير: ' + JSON.stringify(m1.j).slice(0, 160));
    const g0 = await self(m1.ck, 'tst_mzz', { un: '0590000264' }); assert.ok(g0.denied && !g0.changed, 'بلا كلمةٍ جديدة ⇒ مرفوض');
    const g1 = await self(m1.ck, 'tst_mzz', { un: '0590000264', ph: ph('771144') }); assert.ok(g1.denied && !g1.changed, 'صفُّ الدور الملغى لا يُعدَّل'); assert.equal(g1.denied.why, 'dept-role');
  });
}
