/* KIVO_261 — تصويباتُ المراجعة الأمنية المستقلة (reports/k261/secreview_261.md) — كلُّ اختبارٍ يُخفق على عامل 260:
   AUD-055 lenses بلا إكراه · AUD-057 حقولُ الحساب وأشجارُ المدير بشكلٍ وحدّ · AUD-050 مقاعدُ الانتظار محدودةُ العمر · SOT-068 base64 كاملاً
   والجزءُ الأوّل شرطٌ للتالي · حصّةُ رفع الصور اليومية · AUD-052 فكُّ اسمٍ لا يرفع قفلَ مصدرٍ يخمّن على غيره · AUD-056 بادئةُ tst_ محجوزة · معرّفٌ خبيثٌ __proto__ مرفوض — في الوضعين حيث يلزم. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeLegacyTestEnv as makeEnv, client, applySql, ROOT } from './harness.mjs';
import { internals } from './internals.mjs';
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_h261_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
async function world(mode) {
  const EX = mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {};
  const env = makeEnv(EX); const C = client(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, seedSql());
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const emp = await C.login('0000000113', '70113'); const mgr = await C.login('0000000101', '70101'); assert.ok(emp.ok && mgr.ok);
  const val = (k) => { const r = env.DB.q('SELECT v FROM kv WHERE k = ?1', k)[0]; return r ? r.v : null; };
  const put = async (ck, k, obj) => { const before = val(k); const r = await C.save(ck, { [k]: typeof obj === 'string' ? obj : JSON.stringify(obj) }); const denied = !!(r.j.denied || {})[k] || r.status >= 400; return { r, denied, changed: val(k) !== before }; };
  return { env, C, su, emp, mgr, val, put };
}
for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] AUD-055: lenses في bassam_perms_v1 — نصٌّ أو مصفوفةٌ أو رقم من غير مدير النظام مرفوضٌ ولو كانت المخزَّنةُ {} أو غائبة · ترقيةُ «المناطق» تبقى', async () => {
    const W = await world(mode); const K = 'bassam_perms_v1';
    const P = () => JSON.parse(W.val(K));
    /* الحالُ الافتراضية: lenses فارغة */
    const s0 = await W.C.save(W.su.ck, { [K]: JSON.stringify(Object.assign({}, P(), { lenses: {} })) }); assert.equal(s0.j.ok, 1);
    for (const [nm, v] of [['string', 'L'.repeat(300000)], ['array', ['<img src=x onerror=1>', { a: 1 }]], ['number', 12345]]) {
      const r = await W.put(W.emp.ck, K, Object.assign({}, P(), { lenses: v }));
      assert.ok(r.denied && !r.changed, 'من {}: ' + nm + ' مرفوض (' + r.r.status + ')');
    }
    const p1 = P(); delete p1.lenses; const s1 = await W.C.save(W.su.ck, { [K]: JSON.stringify(p1) }); assert.equal(s1.j.ok, 1);
    const r2 = await W.put(W.emp.ck, K, Object.assign({}, P(), { lenses: 'x'.repeat(1000) })); assert.ok(r2.denied && !r2.changed, 'من الغياب: نصٌّ مرفوض');
    /* الترقيةُ الأصلية (331: إضافةُ zones لمصفوفة إدارة) ما زالت تمرّ */
    const s3 = await W.C.save(W.su.ck, { [K]: JSON.stringify(Object.assign({}, P(), { lenses: { tst_d1: ['gates'] } })) }); assert.equal(s3.j.ok, 1);
    const r3 = await W.put(W.emp.ck, K, Object.assign({}, P(), { lenses: { tst_d1: ['gates', 'zones'] } }));
    assert.ok(!r3.denied && r3.changed, 'ترقيةُ zones مقبولةٌ من أيّ مستخدم كما كانت: ' + JSON.stringify(r3.r.j).slice(0, 160));
  });
  test('[' + mode + '] AUD-057: حقولُ الحساب الذاتية محدودة (اسمٌ ضخم مرفوض · تعديلٌ عادي مقبول) · ومديرُ الإدارة لا يكتب أشجاراً عبثية في bassam_perms_v1', async () => {
    const W = await world(mode); const KU = 'bassam_auth_users_v1', K = 'bassam_perms_v1';
    const users = () => JSON.parse(W.val(KU));
    const withSelf = (patch) => users().map(u => u.id === 'tst_emp1' ? Object.assign({}, u, patch) : u);
    const big = await W.put(W.emp.ck, KU, withSelf({ name: 'N'.repeat(200000) })); assert.ok(big.denied && !big.changed, 'اسمٌ بمئتي ألف حرف مرفوض');
    /* KIVO_264 · D14 · OD-7 (إفصاح — تعديلُ اختبار): الموظفُ لم يعد يغيّر اسمَه (حقولُه الذاتية كلمةُ المرور وحدها — SELF_FIELDS_BY_ROLE)، فالاسمُ العادي مرفوضٌ الآن؛
       وحدودُ الشكل (AUD-057) تُثبَت بدورٍ ما زال يكتب بياناتِ اتصاله: مديرُ العقدة (البريدُ العادي مقبول · الأطولُ من 254 مرفوض) */
    const ok1 = await W.put(W.emp.ck, KU, withSelf({ name: 'TEST_ONLY · اسمٌ معدَّل' })); assert.ok(ok1.denied && !ok1.changed, 'الموظفُ لا يغيّر اسمَه (D14): ' + JSON.stringify(ok1.r.j).slice(0, 160));
    const em = await W.put(W.emp.ck, KU, withSelf({ email: 'x'.repeat(300) + '@x' })); assert.ok(em.denied && !em.changed, 'بريدٌ أطولُ من 254 مرفوض');
    const gm = await W.C.login('0000000103', '70103'); assert.ok(gm.ok);
    const withGm = (patch) => users().map(u => u.id === 'tst_gm1' ? Object.assign({}, u, patch) : u);
    const gok = await W.put(gm.ck, KU, withGm({ email: 'TEST_ONLY.gm1@example.test' })); assert.ok(!gok.denied && gok.changed, 'تعديلُ البريد العادي مقبول (مدير العقدة): ' + JSON.stringify(gok.r.j).slice(0, 160));
    const gbig = await W.put(gm.ck, KU, withGm({ email: 'x'.repeat(300) + '@x' })); assert.ok(gbig.denied && !gbig.changed, 'بريدٌ أطولُ من 254 مرفوض (مدير العقدة)');
    /* مديرُ الإدارة: أشكالٌ عبثية مرفوضة · منحٌ سليم مقبول */
    const P = () => JSON.parse(W.val(K));
    const deep = (o) => JSON.parse(JSON.stringify(o));
    const cases = [
      ['tplOf نصٌّ ضخم', (p) => { p.tplOf = p.tplOf || {}; p.tplOf.tst_d1 = Object.assign({}, p.tplOf.tst_d1 || {}, { tst_e_emp1: 'T'.repeat(300000) }); }],
      ['empLens عبث', (p) => { p.empLens = p.empLens || {}; p.empLens.tst_d1 = Object.assign({}, p.empLens.tst_d1 || {}, { tst_e_emp1: ['<b>x</b>'.repeat(5000)] }); }],
      ['ورقةٌ بمفتاحٍ ضخم', (p) => { p.emps.tst_d1.tst_e_emp1 = Object.assign({}, p.emps.tst_d1.tst_e_emp1, { ['daily/' + 'k'.repeat(5000)]: ['view'] }); }],
      ['فعلٌ مجهول', (p) => { p.emps.tst_d1.tst_e_emp1 = Object.assign({}, p.emps.tst_d1.tst_e_emp1, { tasks: ['view', 'z'.repeat(50000)] }); }],
      ['ورقةٌ غيرُ كائن', (p) => { p.emps.tst_d1.num = 42; }],
    ];
    for (const [nm, f] of cases) { const p = deep(P()); f(p); const r = await W.put(W.mgr.ck, K, p); assert.ok(r.denied && !r.changed, 'المدير: ' + nm + ' مرفوض (' + r.r.status + ' ' + JSON.stringify(r.r.j.denied || r.r.j).slice(0, 120) + ')'); }
    const p2 = deep(P()); p2.emps.tst_d1.tst_e_emp1 = Object.assign({}, p2.emps.tst_d1.tst_e_emp1, { 'irshad/records': ['view', 'add'] });
    const g = await W.put(W.mgr.ck, K, p2); assert.ok(!g.denied && g.changed, 'منحٌ سليمٌ داخل السقف مقبول: ' + JSON.stringify(g.r.j).slice(0, 200));
  });
}
for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] AUD-057/أمن (الجولة الثانية): معرّفُ حسابٍ خبيث (__proto__/constructor/prototype) يُرفض — لا تخطّي فحصٍ ولا تصعيدُ صلاحية', async () => {
    const W = await world(mode); const K = 'bassam_auth_users_v1';
    const g = await W.C.api('/api/get?keys=' + K, { cookie: W.emp.ck }); const list = JSON.parse(g.j.keys[K].v), rev = g.j.keys[K].rev;
    /* موظفٌ عاديٌّ يضيف حساباً معرّفُه «__proto__» بدورٍ super — كان يتخطّى حلقةَ الفحص (for..in على كائنٍ عاديّ لا يرى __proto__) */
    for (const bad of ['__proto__', 'constructor', 'prototype']) {
      const raw = JSON.stringify(list).slice(0, -1) + ',{"id":"' + bad + '","un":"evil_' + bad + '","ph":"p2$1$00$x","name":"x","role":"super","dis":0}]';
      const r = await W.C.api('/api/save', { method: 'POST', cookie: W.emp.ck, body: { set: { [K]: raw }, del: [], base: { [K]: rev } } });
      assert.ok((r.j.denied || {})[K], 'معرّفٌ ' + bad + ' مرفوض: ' + JSON.stringify(r.j).slice(0, 160));
      assert.ok(!(W.env.DB.q('SELECT v FROM kv WHERE k = ?1', K).map(x => x.v).join('').includes('evil_' + bad)), bad + ' لم يُخزَّن');
    }
    /* حقلٌ ذاتيٌّ اسمُه «__proto__» في سجلّي لا يتخطّى userRecOk (eqExcept صار null-prototype) */
    const big = 'N'.repeat(9000);
    const forged = list.map(u => u.id === 'tst_emp1' ? Object.assign({}, u, { '__proto__': big }) : u);
    /* Object.assign لا ينسخ __proto__ كخاصيّة؛ نبنيه نصّاً لضمان وجوده مفتاحاً في JSON */
    const self = list.find(u => u.id === 'tst_emp1'); const selfRaw = JSON.stringify(self).slice(0, -1) + ',"__proto__":"' + big + '"}';
    const raw2 = JSON.stringify(list.map(u => u.id === 'tst_emp1' ? '@@SELF@@' : u)).replace('"@@SELF@@"', selfRaw);
    const r2 = await W.C.api('/api/save', { method: 'POST', cookie: W.emp.ck, body: { set: { [K]: raw2 }, del: [], base: { [K]: rev } } });
    const storedBig = W.env.DB.q('SELECT v FROM kv WHERE k = ?1', K).map(x => x.v).join('').includes(big);
    assert.ok(!storedBig, 'حقلٌ ذاتيٌّ __proto__ بحجمٍ يتجاوز 4 KB لا يُخزَّن (مرفوضٌ أو مُسقَط): ' + JSON.stringify(r2.j).slice(0, 160));
  });
}
test('AUD-056: بادئةُ المعرّف tst_ محجوزة — حسابٌ جديدٌ بها مرفوضٌ بلا أداة الاختبار (legacy) · مقبولٌ حيث هي مفعَّلة (enforce + allow)', async () => {
  for (const mode of ['legacy', 'enforce']) {
    const W = await world(mode); const KU = 'bassam_auth_users_v1';
    const u0 = JSON.parse(W.val(KU));
    const nu = { id: 'tst_evil', un: '0000000999', name: 'حسابٌ بمعرّفٍ محجوز', role: 'staff', deptId: 'tst_d1', ekey: 'tst_e_aud056', dis: 0 };   /* KIVO_265 · F-1/R-24: مفتاحٌ لا يحمله حسابٌ نشط (كان tst_e_emp1 — له حسابُه النشط tst_emp1) */
    const r = await W.C.save(W.su.ck, { [KU]: JSON.stringify(u0.concat([nu])) });
    const made = JSON.parse(W.val(KU)).some(u => u.id === 'tst_evil');
    if (mode === 'legacy') assert.ok(!made && (r.j.denied || {})[KU], 'legacy (Production): مرفوضٌ حتى لمدير النظام');
    else assert.ok(made, 'enforce + KIVO_TEST_FIXTURE=allow (Preview): مقبول');
    /* حسابٌ عاديّ يبقى ممكناً */
    const r2 = await W.C.save(W.su.ck, { [KU]: JSON.stringify(JSON.parse(W.val(KU)).concat([Object.assign({}, nu, { id: 'u_real_1', un: '0000000998', ekey: 'tst_e_aud056b' })])) });
    assert.ok(JSON.parse(W.val(KU)).some(u => u.id === 'u_real_1'), mode + ': المعرّفُ العادي مقبول ' + JSON.stringify(r2.j).slice(0, 120));
  }
});
test('AUD-050: مقاعدُ الانتظار محدودةُ العمر — مقعدٌ لم يُحرَّر (إلغاءُ الطلب) يُكنس بعد 35 ث', async () => {
  const W = await internals(['lpEnter', 'lpLeave', 'LP_ACT']);
  const real = Date.now; let now = real();
  Date.now = () => now;
  try {
    const t1 = W.lpEnter('u1'), t2 = W.lpEnter('u1'), t3 = W.lpEnter('u1');
    assert.ok(t1 && t2 && t3, 'ثلاثةُ مقاعد'); assert.equal(W.lpEnter('u1'), 0, 'الرابعُ مرفوض');
    now += 20000; assert.equal(W.lpEnter('u1'), 0, 'بعد 20 ث ما زالت محجوزة');
    now += 16000; const t4 = W.lpEnter('u1'); assert.ok(t4, 'بعد 36 ث كُنست المقاعدُ التي لم تُحرَّر'); W.lpLeave('u1', t4);
    assert.equal(W.lpEnter('__proto__') > 0, true, '«__proto__» معرّفٌ عاديّ في Map'); assert.ok(W.LP_ACT instanceof Map);
  } finally { Date.now = real; }
});
test('SOT-068: base64 كاملاً — «data:image/png,<html>» و«;base64,<html>» مرفوضان · الجزءُ التالي بلا جزءٍ أوّل 409 · وبغير base64 415', async () => {
  const env = makeEnv({}); const C = client(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const put = (k, body, q = '') => C.api('/api/img/' + k + q, { method: 'PUT', cookie: su.ck, headers: { 'content-type': 'text/plain; charset=utf-8' }, body });
  assert.equal((await put('im_h1', 'data:image/png,<html><script>alert(1)</script></html>')).status, 415, 'بلا base64');
  assert.equal((await put('im_h2', 'DATA:IMAGE/SVG+XML,<svg onload="alert(1)"/>')).status, 415, 'SVG نصّاً');
  assert.equal((await put('im_h3', 'data:image/png;base64,<html>')).status, 415, 'أبجديةٌ غيرُ base64');
  assert.equal((await put('im_h4', 'data:image/png;base64,iVBORw0KGgo=')).status, 200, 'base64 سليم');
  assert.equal((await put('im_h5', 'QUJD', '?p=1&n=2')).status, 409, 'جزءٌ تالٍ بلا جزءٍ أوّل ⇒ 409 بلا تخزين');
  assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM imgs WHERE k LIKE '~stg~im_h5~%'")[0].n, 0);
  assert.equal((await put('im_h6', 'data:image/png;base64,QUJD', '?p=0&n=2')).status, 200);
  assert.equal((await put('im_h6', '<html>not base64</html>', '?p=1&n=2')).status, 415, 'جزءٌ تالٍ بغير base64 ⇒ 415');
  assert.equal((await put('im_h6', 'REVG', '?p=1&n=2')).status, 200, 'والسليمُ يُجمَّع');
});
test('حصّةُ رفع الصور اليومية (المراجعةُ المستقلة · البند 5): حسابٌ عادي تجاوز 256 MB في يومه ⇒ 429 بلا كتابة · مديرُ النظام مستثنى · العدّادُ لا يُحتسب قفلاً', async () => {
  const W = await world('legacy');
  const put = (ck, k, body) => W.C.api('/api/img/' + k, { method: 'PUT', cookie: ck, headers: { 'content-type': 'text/plain; charset=utf-8' }, body });
  const B = 'data:image/png;base64,' + 'QUJD'.repeat(256);
  assert.equal((await put(W.emp.ck, 'img_q1_a1', B)).status, 200, 'رفعٌ عاديّ تحت الحصّة');
  const day = Math.floor(Date.now() / 86400000), gk = 'rl:iq:tst_emp1:' + day;
  const n0 = W.env.DB.q('SELECT n FROM guard WHERE gk = ?1', gk)[0]; assert.ok(n0 && n0.n === B.length, 'العدّادُ = البايتاتُ المرفوعة: ' + JSON.stringify(n0));
  W.env.DB.exec('UPDATE guard SET n = ' + (256 * 1024 * 1024 - 10) + " WHERE gk = '" + gk + "'");
  const r = await put(W.emp.ck, 'img_q2_a2', B);
  assert.equal(r.status, 429, 'تجاوزُ الحصّة ⇒ 429'); assert.ok(/حصّةَ رفع الصور/.test(r.j.err) && r.j.retry > 0, JSON.stringify(r.j));
  assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM imgs WHERE k = 'img_q2_a2'")[0].n, 0, 'لا كتابة');
  assert.equal((await put(W.su.ck, 'img_q3_a3', B)).status, 200, 'مديرُ النظام مستثنى (الاستعادةُ الشاملة)');
  const ov = (await W.C.api('/api/overview', { cookie: W.su.ck })).j;
  assert.equal(ov.lockedNow, 0, 'صفُّ الحصّة لا يُعدّ قفلاً في «نظرة عامة»');
});
test('AUD-052: فكُّ اسمٍ لا يرفع قفلَ مصدرٍ يخمّن على حساباتٍ أخرى · gk ببادئةٍ معروفة · «فكُّ الكلّ» صريحٌ وحده', async () => {
  const env = makeEnv({}); const C = client(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const A = { 'CF-Connecting-IP': '203.0.113.66' };
  for (let i = 0; i < 6; i++) await C.login('admin', 'bad' + i, { headers: A });
  /* المصدرُ نفسُه يخمّن على اسمٍ آخر حتى يُقفل زوجُه */
  const until = Date.now() + 120000;
  env.DB.exec("INSERT INTO guard (gk, n, until) VALUES ('p:someoneelse|203.0.113.66', 5, " + until + ") ON CONFLICT(gk) DO UPDATE SET n=5, until=" + until);
  env.DB.exec("UPDATE guard SET until = " + until + " WHERE gk IN ('ip:203.0.113.66', 'p:admin|203.0.113.66')");
  const ov = (await C.api('/api/overview', { cookie: su.ck })).j; const row = (ov.fails || []).find(f => String(f.un).toLowerCase() === 'admin');
  assert.ok(row && row.gks.includes('p:admin|203.0.113.66') && !row.gks.includes('ip:203.0.113.66'), '★ المصدرُ يخمّن على غير admin ⇒ قفلُه لا يُعرض للرفع مع admin: ' + JSON.stringify(row && row.gks));
  await C.api('/api/guard/unlock', { method: 'POST', cookie: su.ck, body: { gk: 'u:admin', gks: row.gks } });
  const g = env.DB.q("SELECT gk FROM guard WHERE until > 0").map(x => x.gk);
  assert.ok(g.includes('ip:203.0.113.66') && g.includes('p:someoneelse|203.0.113.66') && !g.includes('p:admin|203.0.113.66'), 'قفلُ المصدر وزوجُ الاسم الآخر باقيان: ' + JSON.stringify(g));
  assert.equal((await C.api('/api/guard/unlock', { method: 'POST', cookie: su.ck, body: { gk: 'rl:x' } })).status, 400, 'gk ببادئةٍ مجهولة ⇒ 400');
  assert.equal((await C.api('/api/guard/unlock', { method: 'POST', cookie: su.ck, body: {} })).status, 400, 'جسمٌ فارغ لا يفكّ الكلّ');
  assert.equal((await C.api('/api/guard/unlock', { method: 'POST', cookie: su.ck, body: null })).status, 400, 'null ⇒ 400 لا 500');
  assert.equal((await C.api('/api/guard/unlock', { method: 'POST', cookie: su.ck, body: { all: 1 } })).j.ok, 1);
  assert.equal(env.DB.q("SELECT COUNT(*) AS n FROM guard")[0].n, 0, '{all:1} يفكّ الكلّ صراحةً');
});
