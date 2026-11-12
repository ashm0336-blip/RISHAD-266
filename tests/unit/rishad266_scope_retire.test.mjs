/* RISHAD-266 · تقاعدُ «سقف النطاق القديم» (bsdept:<d>:bassam_scope_v1 — Site · Zone/Element · Shift) — بأمر المالك.
   على العامل الحقيقي (node:sqlite) بتثبيت gen_fixture.py ثم مخزن المخطط الحالي (installCurrentSchemaFixture):
   (١) الإنفاذ: موظفٌ ومديرٌ بلا سجلّ نطاق يكتبان ويقرآن عناصرَ موقعٍ/عنصرٍ/ورديةٍ داخل سقف صفحات وحدتهم (كانت تُرفض fail-closed «unmigrated-*»)
   (٢) سقفُ الوحدة (caps · capOwn) ما زال يضيّق · والإدارةُ الشقيقة/الأجنبية مرفوضة (deptInScope)
   (٣) كتابةُ bassam_scope_v1 مرفوضةٌ لكل دور «scope-retired» (الإنفاذ والقديم)
   (٤) Assigned · Source كما كانا · (٥) السلوكُ نفسُه بوجود سجلّات النطاق وبعد حذفها
   (٦) /api/authz-migrate parts=scope-retire: خطة ← تطبيق ← رجوع ← إعادة تطبيق · الانجراف · plan-changed · لا يمسّ مفتاحاً آخر.
   بياناتٌ اصطناعية موسومة TEST_ONLY. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';

const T = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; }); return o; })();
const DAY = T.year + '-' + T.month + '-' + T.day;
function seedSql() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_r266sr_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', T.year + '-' + T.month + '-' + T.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const SK = (d) => 'bsdept:' + d + ':bassam_scope_v1';
const PK = (d) => 'bsdept:' + d + ':bassam_plan_v1';
const KDR = 'bsdept:tst_d1:bassam_dreport_v1', KRD = 'bsdept:tst_d1:bassam_rounds_v1', KST = 'bsdept:tst_d1:bassam_staffing_v3';
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const kvOf = (env, k) => { const r = env.DB.q('SELECT v FROM kv WHERE k = ?1 ORDER BY seq', k); return r.length ? r.map(x => x.v).join('') : null; };
const revOf = (env, k) => { const r = env.DB.q('SELECT rev FROM revs WHERE k = ?1', k)[0]; return r ? r.rev : 0; };
const metaOf = (env, k) => { const r = env.DB.q('SELECT v FROM meta WHERE k = ?1', k)[0]; return r ? r.v : null; };
/* زرعُ قيمة kv بـSQL كما المُثبِّت (مراجعةٌ جديدة) — v === null ⇒ حذف */
async function putKv(env, k, v) {
  const s = ['DELETE FROM kv WHERE k = ' + q(k) + ';'];
  if (v !== null) s.push('INSERT INTO kv (k, seq, v) VALUES (' + q(k) + ', 0, ' + q(typeof v === 'string' ? v : JSON.stringify(v)) + ');');
  s.push("INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(meta.v AS INTEGER) + 1 AS TEXT);");
  s.push('INSERT INTO revs (k, rev) VALUES (' + q(k) + ", (SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'rev')) ON CONFLICT(k) DO UPDATE SET rev = excluded.rev;");
  await applySql(env.DB, s.join('\n'));
}
const ACC = { dm1: ['0000000101', '70101'], dm3: ['0000000104', '70104'], sup1: ['0000000111', '70111'], supB: ['0000000112', '70112'], pnos: ['0000000116', '70116'], fld: ['0000000118', '70118'], ds: ['0000000120', '70120'], emp2: ['0000000121', '70121'] };
async function world(enforce = true) {
  const env = makeTestEnv(enforce ? { KIVO_AUTHZ_MODE: 'enforce' } : {}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'admin');
  await applySql(env.DB, seedSql());
  await installCurrentSchemaFixture(env);
  if (enforce) env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const L = { su: su.ck }, U = {};
  for (const [w, [u, p]] of Object.entries(ACC)) { const l = await C.login(u, p); assert.ok(l.ok, w); L[w] = l.ck; }
  for (const w of Object.keys(L)) U[w] = (await C.api('/api/whoami', { cookie: L[w] })).j.uid;
  return { env, C, L, U };
}
/* الموارد التشغيلية (الخطة · الجولات · التقرير · الجدول) تُقرأ من /api/operations/read وتُحفظ بغلافها (uid · requestId · epoch · base) — وما سواها من /api/get */
const OPS = /:bassam_(plan|rounds|dreport|staffing_v3)_v1$|:bassam_staffing_v3$/;
const opRead = (W, who, keys) => W.C.api('/api/operations/read?' + new URLSearchParams({ uid: W.U[who], keys: keys.join(',') }), { cookie: W.L[who] });
async function getV(W, who, k) {
  if (OPS.test(k)) { const r = await opRead(W, who, [k]); const j = r.j || {}; return j.resources && j.resources[k] !== undefined ? j.resources[k] : null; }
  const r = await W.C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: W.L[who] }); const e = ((r.j || {}).keys || {})[k]; return e && e.v != null ? JSON.parse(e.v) : null;
}
let RQ = 0;
async function save(W, who, set, del = []) {
  const k = Object.keys(set).concat(del)[0]; let r;
  if (OPS.test(k)) {
    const cur = (await opRead(W, 'su', [k])).j;
    r = await W.C.api('/api/save', { method: 'POST', cookie: W.L[who], body: { uid: W.U[who], requestId: 'TEST_ONLY_r266_' + (++RQ), epoch: cur.epoch, set, del, base: cur.base } });
  } else r = await W.C.save(W.L[who], set, del);
  const j = r.j || {};
  return { ok: (j.ok === 1 || !!(j.revs && j.revs[k])) && !Object.keys(j.denied || {}).length, d: (j.denied || {})[k] || null, s: JSON.stringify(j.denied && Object.keys(j.denied).length ? j.denied : j).slice(0, 300) };
}
async function allowed(W, who, set, label) { const r = await save(W, who, set); assert.ok(r.ok, label + ' — رُفضت: ' + r.s); return r; }
async function denied(W, who, set, why, label, del) {   /* why: رمزٌ أو قائمةُ رموزٍ مقبولة */
  const k = Object.keys(set).concat(del || [])[0], val = async () => OPS.test(k) ? JSON.stringify(await getV(W, 'su', k)) : kvOf(W.env, k);
  const before = await val(), r = await save(W, who, set, del);
  assert.ok(!r.ok, label + ' — قُبلت'); assert.ok([].concat(why).includes(r.d && r.d.why), label + ' — ' + r.s);
  assert.equal(await val(), before, label + ' — القيمةُ المخزَّنة تغيّرت');
  return r;
}
/* تعديلُ اسم مصلى في موقعٍ من خطة الإدارة (بندُ Site + Zone/Element) */
async function renamePlanZone(W, who, d, tag) {
  const p = await getV(W, 'su', PK(d)); assert.ok(p && p.floors && p.floors[0], 'خطةُ ' + d);
  p.floors[0].zones[0].name = 'TEST_ONLY ' + tag;
  return { [PK(d)]: JSON.stringify(p) };
}
/* تعديلُ قسم ورديةٍ في التقرير اليومي (بندُ Shift) */
async function touchDreportShift(W, sh, tag) {
  const v = await getV(W, 'su', KDR); assert.ok(v && v[DAY] && v[DAY].shifts[sh], 'التقرير اليومي ' + sh);
  const R = v[DAY].shifts[sh].roster; assert.ok(Array.isArray(R) && R.length, 'roster ' + sh + ' ' + tag); R[0].st = R[0].st === 'pr' ? 'ab' : 'pr';
  return { [KDR]: JSON.stringify(v) };
}
/* العزل: الحكمُ (dept) أو رفضُ قراءة المرجع قبله في الحفظ التشغيلي (read-reference-denied) — كلاهما قبل أيّ كتابة */
const ISO = ['dept', 'read-reference-denied'];
const scopeRec = { v: 1, test: 'TEST_ONLY', ceiling: { 'Site': { mode: 'list', list: [] }, 'Zone/Element': { mode: 'list', list: [] } }, emp: {} };

/* ── (١)+(٥) الكتابة بلا سجلّ نطاق وبوجوده ── */
test('[enforce] بلا سجلّ نطاق: مديرٌ وموظفٌ يكتبان الموقعَ/العنصر/الوردية داخل سقف وحدتهم — والنتيجةُ نفسُها بوجود سجلٍّ يضيّق ثم بعد حذفه', async () => {
  const W = await world();
  assert.equal(kvOf(W.env, SK('tst_d3')), null, 'tst_d3 بلا سجلّ نطاق (كانت كتاباتُها تُرفض unmigrated-department-ceiling)');
  await allowed(W, 'dm3', await renamePlanZone(W, 'dm3', 'tst_d3', 'dm3-a'), 'مديرُ tst_d3 يعدّل عنصراً في موقع خطته');
  assert.equal((await getV(W, 'su', PK('tst_d3'))).floors[0].zones[0].name, 'TEST_ONLY dm3-a', 'الخطةُ محفوظة');
  /* tst_pnos: صلاحيةُ الخطة بلا قيمة نطاق (كانت unmigrated-site-scope) */
  await allowed(W, 'pnos', await renamePlanZone(W, 'pnos', 'tst_d1', 'pnos-a'), 'موظفٌ بصلاحية الخطة ولا نطاقَ له');
  /* Shift: مشرف أ (staffing-bound TST-A) يعدّل قسمَ ورديته — ثم قسمَ الوردية الأخرى (كان shift-out-of-scope) */
  await allowed(W, 'sup1', await touchDreportShift(W, 'TST-A', 'own'), 'مشرفٌ يعدّل قسمَ ورديته');
  await allowed(W, 'sup1', await touchDreportShift(W, 'TST-B', 'other'), 'الوردية لم تعد بُعداً مقيِّداً');
  /* سجلٌّ يضيّق كلَّ شيء (سقفٌ «محدد» فارغ) — لا أثرَ له */
  await putKv(W.env, SK('tst_d3'), scopeRec);
  await allowed(W, 'dm3', await renamePlanZone(W, 'dm3', 'tst_d3', 'dm3-b'), 'بوجود سجلٍّ يضيّق: لا يُقرأ');
  await putKv(W.env, SK('tst_d1'), scopeRec);
  await allowed(W, 'pnos', await renamePlanZone(W, 'pnos', 'tst_d1', 'pnos-b'), 'بوجود سجلٍّ يضيّق (tst_d1)');
  await allowed(W, 'sup1', await touchDreportShift(W, 'TST-B', 'other-2'), 'الوردية بوجود السجل');
  /* بعد حذف السجلّات */
  await putKv(W.env, SK('tst_d3'), null); await putKv(W.env, SK('tst_d1'), null);
  await allowed(W, 'dm3', await renamePlanZone(W, 'dm3', 'tst_d3', 'dm3-c'), 'بعد الحذف');
  await allowed(W, 'pnos', await renamePlanZone(W, 'pnos', 'tst_d1', 'pnos-c'), 'بعد الحذف (tst_d1)');
  await allowed(W, 'sup1', await touchDreportShift(W, 'TST-A', 'own-3'), 'الوردية بعد الحذف');
});

test('[enforce] القراءة: لا إسقاطَ بالوردية ولا بالموقع/العنصر — والنتيجةُ نفسُها بوجود السجل وبعد حذفه', async () => {
  const W = await world();
  const ir = async () => { const r = await W.C.api('/api/irshad?dept=tst_d1&view=records', { cookie: W.L.supB }); assert.equal(r.status, 200, JSON.stringify(r.j)); return r.j.rows.map(x => x.id).sort(); };
  const shiftsOf = async (who) => { const v = await getV(W, who, KDR); return Object.keys((v && v[DAY] && v[DAY].shifts) || {}).sort(); };
  const staffRows = async (who) => { const v = await getV(W, who, KST); const mk = T.year + '-' + T.month; return Object.keys((v && v[mk]) || {}).filter(k => k !== '__shifts').sort(); };
  const withRec = { ir: await ir(), dr: await shiftsOf('supB'), st: await staffRows('supB') };
  assert.ok(withRec.ir.includes('tstir1') && withRec.ir.includes('tstir2'), 'مشرف ب يرى محاضرَ الورديتين (كان TST-B وحدها): ' + withRec.ir);
  assert.deepEqual(withRec.dr, ['TST-A', 'TST-B'], 'التقرير اليومي بالورديتين');
  assert.ok(withRec.st.includes('tst_e_sup1') && withRec.st.includes('tst_e_supB'), 'الجدولُ الشهري بصفوف الورديتين');
  await putKv(W.env, SK('tst_d1'), null);
  assert.deepEqual({ ir: await ir(), dr: await shiftsOf('supB'), st: await staffRows('supB') }, withRec, 'بلا سجلّ: القراءةُ نفسُها (كانت تُحجب كلُّها fail-closed)');
  /* السجلُّ نفسُه لا يُسلَّم لغير مدير النظام (ولا لمدير الإدارة) */
  await putKv(W.env, SK('tst_d1'), scopeRec);
  assert.equal(await getV(W, 'dm1', SK('tst_d1')), null, 'مديرُ الإدارة لا يقرأ السجلَّ المتقاعد');
  const me = await W.C.api('/api/authz', { cookie: W.L.supB });
  assert.equal(me.status, 200); const dd = me.j.me.depts.tst_d1;
  assert.ok(dd && dd.h && !('ceil' in dd) && !('me' in dd) && !('sb' in dd), 'وصفُ الصلاحيات بلا ceil/me/sb: ' + JSON.stringify(dd).slice(0, 120));
});

/* ── (٢) سقفُ الوحدة والعزل ── */
test('[enforce] سقفُ الوحدة (caps · capOwn) ما زال يضيّق · والإدارةُ الشقيقة والأجنبية مرفوضتان', async () => {
  const W = await world();
  const perms = () => JSON.parse(kvOf(W.env, 'bassam_perms_v1'));
  const setPerms = async (fn) => { const p = perms(); fn(p); await putKv(W.env, 'bassam_perms_v1', p); };
  const ALL = perms().caps.tst_d1.slice();
  /* سقفُ الوحدة نفسِها بلا «plan» */
  await setPerms(p => { p.caps.tst_d1 = ALL.filter(k => k !== 'plan'); });
  const r1 = await save(W, 'pnos', await renamePlanZone(W, 'pnos', 'tst_d1', 'cap-1'));
  assert.ok(!r1.ok, 'خارج سقف الوحدة — قُبلت: ' + r1.s);
  /* سقفُ الأصل (tst_g1) بلا «plan» يضيّق الوحدةَ ما لم تكن مستقلة (capOwn) */
  await setPerms(p => { p.caps.tst_d1 = ALL.slice(); p.caps.tst_g1 = ALL.filter(k => k !== 'plan'); });
  const r2 = await save(W, 'pnos', await renamePlanZone(W, 'pnos', 'tst_d1', 'cap-2'));
  assert.ok(!r2.ok, 'سقفُ الأصل يضيّق — قُبلت: ' + r2.s);
  await setPerms(p => { p.capOwn = { tst_d1: true }; });
  await allowed(W, 'pnos', await renamePlanZone(W, 'pnos', 'tst_d1', 'cap-3'), 'capOwn: سقفُ الوحدة وحده');
  await setPerms(p => { p.caps.tst_d1 = ALL.filter(k => k !== 'plan'); });
  const r4 = await save(W, 'pnos', await renamePlanZone(W, 'pnos', 'tst_d1', 'cap-4'));
  assert.ok(!r4.ok, 'capOwn لا يوسّع ما ليس في سقف الوحدة — قُبلت: ' + r4.s);
  /* خارج سقف الوحدة لا تُقرأ الخطةُ أصلاً (resOnCeiling) فيُرفض الحفظُ التشغيلي قبل الحكم — والقراءةُ مرفوضةٌ كذلك */
  for (const r of [r1, r2, r4]) assert.equal(r.d && r.d.why, 'read-reference-denied', r.s);
  assert.deepEqual((await opRead(W, 'pnos', [PK('tst_d1')])).j.denied, [PK('tst_d1')], 'القراءةُ خارج السقف مرفوضة');
  await setPerms(p => { p.caps.tst_d1 = ALL.slice(); delete p.caps.tst_g1; });
  /* العزل */
  await denied(W, 'dm3', await renamePlanZone(W, 'dm3', 'tst_d1', 'x1'), ISO, 'مديرُ tst_d3 على خطة tst_d1');
  await denied(W, 'pnos', await renamePlanZone(W, 'pnos', 'tst_d2', 'x2'), ISO, 'موظفُ tst_d1 على خطة tst_d2 (الشقيقة)');
  await denied(W, 'pnos', await renamePlanZone(W, 'pnos', 'tst_d3', 'x3'), ISO, 'موظفُ tst_d1 على خطة tst_d3 (الأجنبية)');
  assert.equal(await getV(W, 'pnos', PK('tst_d2')), null, 'ولا يقرأ خطةَ الشقيقة');
  assert.equal(await getV(W, 'dm3', PK('tst_d1')), null, 'ولا مديرُ الأجنبية');
});

/* ── (٣) كتابةُ السجل المتقاعد ── */
for (const enforce of [true, false]) test('[' + (enforce ? 'enforce' : 'legacy') + '] كتابةُ bassam_scope_v1 مرفوضةٌ لكل دور «scope-retired» — إنشاءً وتعديلاً وحذفاً', async () => {
  const W = await world(enforce);
  const val = JSON.stringify(Object.assign({}, scopeRec, { ceiling: { 'Site': { mode: 'ALL' }, 'Zone/Element': { mode: 'ALL' } } }));
  for (const who of ['su', 'dm1', 'pnos']) {
    const r = await denied(W, who, { [SK('tst_d1')]: val }, 'scope-retired', who + ' يعدّل سجلَّ tst_d1');
    assert.match(String(r.d.detail || ''), /retired/, 'التفصيل يذكر التقاعد');
  }
  await denied(W, 'su', { [SK('tst_d3')]: val }, 'scope-retired', 'مديرُ النظام ينشئ سجلّاً لـ tst_d3');
  await denied(W, 'dm3', { [SK('tst_d3')]: val }, 'scope-retired', 'مديرُ tst_d3 ينشئ سجلَّ إدارته');
  await denied(W, 'su', {}, 'scope-retired', 'مديرُ النظام يحذفه بالحفظ العادي (الحذفُ بخطوة scope-retire وحدها)', [SK('tst_d1')]);
  assert.ok(kvOf(W.env, SK('tst_d1')), 'السجلّ باقٍ');
});

/* ── (٤) Assigned · Source ── */
test('[enforce] Assigned (راصد الميدان) وSource (الإحصائيات) كما كانا — بوجود السجل وبعد حذفه', async () => {
  const W = await world();
  const fieldView = async () => {
    const v = await getV(W, 'fld', KRD); assert.ok(v && v[DAY], 'الجولات');
    const out = {}; v[DAY].d.forEach((fl) => fl.zones.forEach(z => { out[z.uid] = 'fst' in z; }));
    return out;
  };
  const a = await fieldView();
  assert.equal(a.tstz1a, true, 'المصلى المسنَد إليه: حالتُه ظاهرة');
  assert.equal(a.tstz1b, false, 'غيرُ المسنَد: حالتُه محجوبة (Assigned)');
  assert.equal(a.tstz2b, false);
  const src = async () => { const r = await W.C.api('/api/dstats', { cookie: W.L.ds }); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 200)); return JSON.stringify(r.j); };
  const s0 = await src(), d0 = JSON.parse(s0).data, all = (await W.C.api('/api/dstats', { cookie: W.L.su })).j.data;
  assert.ok(d0.haram && !d0.nabawi && all.nabawi, 'Source: مفتاحُ الحرم وحده ⇒ لا يرى بياناتِ المسجد النبوي (ومديرُ النظام يراها)');
  assert.ok(Object.keys(d0.locks || {}).every(k => k.startsWith('haram|')), 'ولا أقفالَه');
  await putKv(W.env, SK('tst_d1'), null);
  assert.deepEqual(await fieldView(), a, 'Assigned بعد حذف السجل');
  assert.equal(await src(), s0, 'Source بعد حذف السجل');
});

/* ── (٦) خطوةُ التقاعد في /api/authz-migrate ── */
const migrate = (W, who, body) => W.C.api('/api/authz-migrate', { method: 'POST', cookie: W.L[who], body });
const plan = async (W, parts = 'scope-retire') => { const r = await W.C.api('/api/authz-migrate?act=plan&parts=' + parts, { cookie: W.L.su }); return r; };
function others(env) {
  return {
    kv: env.DB.q("SELECT k, seq, v FROM kv WHERE k NOT LIKE 'bsdept:%:bassam_scope_v1' ORDER BY k, seq"),
    revs: env.DB.q("SELECT k, rev FROM revs WHERE k NOT LIKE 'bsdept:%:bassam_scope_v1' ORDER BY k"),
    meta: env.DB.q("SELECT k, v FROM meta WHERE k NOT IN ('rev', 'authz_scope_mig') ORDER BY k"),
    ops: env.DB.q("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").map(t => [t.name, env.DB.q('SELECT COUNT(*) n FROM "' + t.name + '"' + (t.name === 'guard' ? " WHERE gk NOT LIKE 'rl:%'" : ''))[0].n])   /* guard: the locks — rate-limit windows (rl:, the image sweep's among them) follow any accepted write */.filter(([n]) => !/^(kv|revs|meta|authz|authz_snap|authz_snaps|aud|sess|sec|rl|sqlite_.*)$/.test(n)),
  };
}
test('[enforce] scope-retire: خطة ← تطبيق ← رجوع ← إعادة تطبيق · الانجراف · plan-changed · لا يمسّ غيرَه', async () => {
  const W = await world();
  const FLAG = JSON.stringify({ applied: true, at: 1760000000000, by: 'tst_sa', snap: 'migration_TEST_ONLY_old', hash: 'TEST_ONLY' });
  W.env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_scope_mig', " + q(FLAG) + ") ON CONFLICT(k) DO UPDATE SET v = excluded.v");
  const v1 = kvOf(W.env, SK('tst_d1')), v2 = kvOf(W.env, SK('tst_d2'));
  assert.ok(v1 && v2, 'سجلّا tst_d1 وtst_d2 من المُثبِّت');
  const base = others(W.env);
  /* غيرُ مدير النظام · الخلط */
  assert.equal((await W.C.api('/api/authz-migrate?act=plan&parts=scope-retire', { cookie: W.L.dm1 })).status, 403);
  const mixed = await plan(W, 'scope-retire,perm'); assert.equal(mixed.status, 400); assert.equal(mixed.j.err, 'parts-mixed'); assert.ok(mixed.j.msg);
  /* الخطة */
  const p1 = await plan(W); assert.equal(p1.status, 200, JSON.stringify(p1.j).slice(0, 200));
  const P1 = p1.j.plan;
  assert.deepEqual(P1.writes.map(w => w.k), [SK('tst_d1'), SK('tst_d2')]); assert.ok(P1.writes.every(w => w.op === 'delete' && w.kind === 'scope-retire'));
  assert.deepEqual(P1.counts, { writes: 2, scopeRecords: 2, metaFlag: 1 }); assert.match(P1.hash, /^[0-9a-f]{64}$/);
  const again = (await W.C.api('/api/authz-migrate?act=plan&parts=scope-retire&seed=' + P1.seed, { cookie: W.L.su })).j.plan;
  assert.equal(again.hash, P1.hash, 'حتمية: البذرةُ نفسُها والبيانات نفسُها ⇒ البصمةُ نفسُها');
  /* plan-changed: تغيّر سجلٌّ بعد الخطة */
  await putKv(W.env, SK('tst_d2'), JSON.parse(v2)); const v2b = kvOf(W.env, SK('tst_d2'));
  const pc = await migrate(W, 'su', { act: 'apply', seed: P1.seed, hash: P1.hash, generated: P1.generated, parts: ['scope-retire'] });
  assert.equal(pc.status, 409); assert.equal(pc.j.err, 'plan-changed');
  assert.equal(kvOf(W.env, SK('tst_d1')), v1, 'لم يُحذف شيء'); assert.equal(metaOf(W.env, 'authz_scope_mig'), FLAG);
  /* التطبيق */
  const P2 = (await plan(W)).j.plan, revBefore = { d1: revOf(W.env, SK('tst_d1')), d2: revOf(W.env, SK('tst_d2')) };
  const ap = await migrate(W, 'su', { act: 'apply', seed: P2.seed, hash: P2.hash, generated: P2.generated, parts: ['scope-retire'] });
  assert.equal(ap.status, 200, JSON.stringify(ap.j)); assert.equal(ap.j.applied, 2); assert.match(ap.j.snap, /^migration_/);
  assert.equal(kvOf(W.env, SK('tst_d1')), null); assert.equal(kvOf(W.env, SK('tst_d2')), null); assert.equal(metaOf(W.env, 'authz_scope_mig'), null);
  assert.equal(revOf(W.env, SK('tst_d1')), ap.j.rev); assert.equal(revOf(W.env, SK('tst_d2')), ap.j.rev); assert.ok(ap.j.rev > Math.max(revBefore.d1, revBefore.d2));
  assert.deepEqual(others(W.env), base, 'التطبيقُ لا يمسّ مفتاحاً أو صفاً آخر');
  const snapRow = W.env.DB.q('SELECT kind, n, meta FROM authz_snaps WHERE snap = ?1', ap.j.snap)[0];
  assert.equal(snapRow.kind, 'migration'); assert.equal(snapRow.n, 2); assert.equal(JSON.parse(snapRow.meta).retire.v, FLAG);
  /* السلوكُ بعد الحذف: الكتابةُ نفسُها */
  await allowed(W, 'pnos', await renamePlanZone(W, 'pnos', 'tst_d1', 'after-apply'), 'بعد التطبيق');
  const baseAfterWrite = others(W.env);
  /* لا شيءَ بعد */
  const P3 = (await plan(W)).j.plan; assert.deepEqual(P3.counts, { writes: 0, scopeRecords: 0, metaFlag: 0 });
  const ap0 = await migrate(W, 'su', { act: 'apply', seed: P3.seed, hash: P3.hash, generated: P3.generated, parts: ['scope-retire'] });
  assert.equal(ap0.status, 200); assert.equal(ap0.j.applied, 0);
  /* الرجوع */
  const rb = await migrate(W, 'su', { act: 'rollback', snap: ap.j.snap });
  assert.equal(rb.status, 200, JSON.stringify(rb.j)); assert.equal(rb.j.restored, 2);
  assert.equal(kvOf(W.env, SK('tst_d1')), v1, 'القيمةُ كما كانت حرفاً'); assert.equal(kvOf(W.env, SK('tst_d2')), v2b);
  assert.equal(metaOf(W.env, 'authz_scope_mig'), FLAG, 'والعلامةُ كما كانت');
  assert.deepEqual(others(W.env), baseAfterWrite, 'الرجوعُ لا يمسّ مفتاحاً آخر');
  const rb2 = await migrate(W, 'su', { act: 'rollback', snap: ap.j.snap }); assert.equal(rb2.status, 409); assert.equal(rb2.j.err, 'already-restored');
  /* إعادة التطبيق */
  const P4 = (await plan(W)).j.plan; assert.equal(P4.counts.writes, 2); assert.notEqual(P4.hash, P2.hash);
  const ap2 = await migrate(W, 'su', { act: 'apply', seed: P4.seed, hash: P4.hash, generated: P4.generated, parts: ['scope-retire'] });
  assert.equal(ap2.status, 200, JSON.stringify(ap2.j)); assert.equal(ap2.j.applied, 2);
  assert.equal(kvOf(W.env, SK('tst_d1')), null); assert.equal(metaOf(W.env, 'authz_scope_mig'), null);
  /* الانجراف: مفتاحٌ تغيّر بعد العملية ⇒ لا رجوعَ بلا force */
  await putKv(W.env, SK('tst_d1'), { v: 1, test: 'TEST_ONLY', later: true });
  const dr = await migrate(W, 'su', { act: 'rollback', snap: ap2.j.snap });
  assert.equal(dr.status, 409); assert.equal(dr.j.err, 'drift'); assert.deepEqual(dr.j.drift.map(x => x.k), [SK('tst_d1')]);
  assert.equal(kvOf(W.env, SK('tst_d2')), null, 'الانجرافُ يمنع الرجوعَ كلَّه');
  const fr = await migrate(W, 'su', { act: 'rollback', snap: ap2.j.snap, force: true });
  assert.equal(fr.status, 200); assert.equal(kvOf(W.env, SK('tst_d1')), v1); assert.equal(kvOf(W.env, SK('tst_d2')), v2b); assert.equal(metaOf(W.env, 'authz_scope_mig'), FLAG);
});
