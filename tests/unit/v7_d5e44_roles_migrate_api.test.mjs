/* V7 · د5-هـ (44) — ترحيلُ قوالب الصلاحيات إلى الأدوار «perm44-roles» عبر المسار المحمي القائم /api/authz-migrate، على العامل الحقيقي وبياناتٍ اصطناعية TEST_ONLY:
   ① مديرُ النظام وحده · لا يُخلط بجزءٍ آخر (parts-mixed) · الخطةُ حتمية (البذرةُ نفسُها ⇒ البصمةُ نفسُها)
   ② التطبيق: كلُّ قالبٍ دورٌ بمعرّفه واسمه، مستوياتُه «مخصّص» بمفاتيح القالب (keys24 أو ترجمةُ ورقته) مقسومةً على الأنظمة، وsup من tp.sup أو الاسم؛
      وكلُّ إسنادٍ tplOf لقالبٍ موجود صار دورَ الشخص — قبل/بعد صفاً صفاً — ولا يمسّ القوالبَ ولا bassam_perms_v1 ولا المنح
   ③ الثانيةُ لا تكتب شيئاً (applied:0) · ④ الرجوعُ يعيد الحال حرفاً (لا سجلَّ أدوار)، والثاني «already-restored» · ⑤ plan-changed إن تغيّرت القوالبُ بعد الخطة. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, SRC, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';

const D = 'tst_d1', KT = 'bsdept:' + D + ':bassam_perm_tpls_v1', KR = 'bsdept:' + D + ':bassam_roles_v1', KP = 'bassam_perms_v1', KG = 'bsdept:' + D + ':bassam_grants_v1';
const REG = JSON.parse(fs.readFileSync(path.join(SRC, 'permissions', 'registry', 'registry-v24.9.json'), 'utf8')).registry;
const OWN = (k) => (REG.find((e) => e.key === k) || {}).owner || '';
const STAFF = REG.filter((e) => e.status === 'active' && e.owner === 'staff').slice(0, 2).map((e) => e.key);
const HARAM = REG.filter((e) => e.status === 'active' && e.owner === 'dstats/haram').slice(0, 1).map((e) => e.key);
const TPLS = [
  { id: 'TEST_ONLY_t_lead', name: 'رئيسـ / ـة الوردية TEST_ONLY', perms: { staff: ['view', 'edit'] } },             /* sup بالاسم (القاعدة القديمة) */
  { id: 'TEST_ONLY_t_k24', name: 'TEST_ONLY مشاهد', keys24: STAFF.concat(HARAM), sup: false, lens: ['zones'] },    /* keys24 · لا إشراف صراحةً · عدسةٌ تُبلَّغ */
  { id: 'TEST_ONLY_t_flag', name: 'TEST_ONLY ميداني', sup: true, perms: {} },                                     /* sup صراحةً · بلا مفاتيح */
];
const TPLOF = { TEST_ONLY_e1: 'TEST_ONLY_t_lead', TEST_ONLY_e2: 'TEST_ONLY_t_k24', TEST_ONLY_e3: 'TEST_ONLY_t_flag', TEST_ONLY_e4: 'TEST_ONLY_gone' };

function seedSql() {
  const T = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach((p) => { if (p.type !== 'literal') o[p.type] = +p.value; }); return o; })();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_roles_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', T.year + '-' + T.month + '-' + T.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const kvGet = (DB, k) => { const r = DB.q('SELECT v FROM kv WHERE k = ?1 ORDER BY seq', k); return r.length ? r.map((x) => x.v).join('') : null; };
const kvSet = (DB, k, v) => { DB.q('DELETE FROM kv WHERE k = ?1', k); DB.q('INSERT INTO kv (k, seq, v) VALUES (?1, 0, ?2)', k, v); DB.q('INSERT INTO revs (k, rev) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET rev = rev + 1', k, 1); };
async function world() {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce' }), C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'admin');
  await applySql(env.DB, seedSql()); await installCurrentSchemaFixture(env);
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const dm = await C.login('0000000101', '70101'); assert.ok(dm.ok, 'dm1');
  /* بياناتُ القوالب القديمة (TEST_ONLY) تُكتب في المخزن مباشرةً — كما تركها المحرّرُ المحذوف */
  kvSet(env.DB, KT, JSON.stringify(TPLS));
  const P = JSON.parse(kvGet(env.DB, KP) || '{}'); P.tplOf = Object.assign({}, P.tplOf || {}, { [D]: TPLOF }); kvSet(env.DB, KP, JSON.stringify(P));
  env.DB.q('DELETE FROM kv WHERE k = ?1', KR);
  return { env, C, su: su.ck, dm: dm.ck };
}
const migrate = (W, body, ck) => W.C.api('/api/authz-migrate', { method: 'POST', cookie: ck || W.su, body });
const plan = (W, extra = '', ck) => W.C.api('/api/authz-migrate?act=plan&parts=perm44-roles' + extra, { cookie: ck || W.su });
const apply = (W, P) => migrate(W, { act: 'apply', seed: P.seed, hash: P.hash, generated: P.generated, parts: ['perm44-roles'] });

test('[enforce] perm44-roles: خطة ← تطبيق (صفاً صفاً) ← لا شيءَ بعد ← رجوع · مديرُ النظام وحده · لا خلط · plan-changed', async () => {
  assert.ok(STAFF.length === 2 && HARAM.length === 1, 'مفاتيحُ السجلّ للاختبار');
  const W = await world(), DB = W.env.DB;
  const T0 = kvGet(DB, KT), P0 = kvGet(DB, KP), G0 = kvGet(DB, KG);
  /* ① */
  assert.equal((await plan(W, '', W.dm)).status, 403, 'مديرُ الإدارة لا يخطّط');
  const mixed = await plan(W, ',perm'); assert.equal(mixed.status, 400); assert.equal(mixed.j.err, 'parts-mixed');
  const p1 = await plan(W); assert.equal(p1.status, 200, JSON.stringify(p1.j).slice(0, 300)); const P1 = p1.j.plan;
  assert.deepEqual(P1.parts, ['perm44-roles']); assert.deepEqual(P1.writes.map((w) => w.k), [KR], 'سجلُّ أدوار الإدارة وحده');
  assert.equal((await plan(W, '&seed=' + P1.seed)).j.plan.hash, P1.hash, 'حتمية');
  assert.deepEqual(P1.counts, { writes: 1, roles: 3, people: 3, lensDropped: 1, unknownTpl: 1 });
  /* ⑤ plan-changed: تغيّر القالبُ بعد الخطة */
  kvSet(DB, KT, JSON.stringify(TPLS.map((t, i) => (i === 2 ? { ...t, name: 'TEST_ONLY ميداني ٢' } : t))));
  const pc = await apply(W, P1); assert.equal(pc.status, 409); assert.equal(pc.j.err, 'plan-changed');
  assert.equal(kvGet(DB, KR), null, 'لا كتابةَ بخطةٍ قديمة');
  kvSet(DB, KT, T0);
  /* ② التطبيق */
  const P2 = (await plan(W)).j.plan, ap = await apply(W, P2);
  assert.equal(ap.status, 200, JSON.stringify(ap.j)); assert.equal(ap.j.applied, 1); assert.match(ap.j.snap, /^migration_/);
  const R = JSON.parse(kvGet(DB, KR)), rows = [];
  assert.equal(R.v, 1);
  TPLS.forEach((tp) => {
    const r = R.roles.find((x) => x.id === tp.id); assert.ok(r, 'دورٌ لكل قالب: ' + tp.id);
    const keys = Object.values(r.sys).flatMap((s) => s.keys);
    rows.push(['template', tp.id, tp.name, tp.sup === undefined ? '—' : String(tp.sup), Array.isArray(tp.keys24) ? 'keys24:' + tp.keys24.length : 'perms:' + Object.keys(tp.perms || {}).join('+'),
      '→ role', r.name, String(r.sup), Object.entries(r.sys).map(([s, v]) => s + '=' + v.lvl + '(' + v.keys.length + ')').join(' ') || '—'].join(' | '));
    assert.equal(r.name, tp.name); assert.equal(r.desc, '');
    Object.entries(r.sys).forEach(([s, v]) => { assert.equal(v.lvl, 'custom'); v.keys.forEach((k) => assert.equal(OWN(k).split('/')[0], s, k + ' في نظام مالكه')); });
    if (Array.isArray(tp.keys24)) assert.deepEqual(keys.slice().sort(), tp.keys24.slice().sort(), 'keys24 كما هي');
  });
  assert.equal(R.roles.find((x) => x.id === 'TEST_ONLY_t_lead').sup, true, 'الاسمُ «رئيس…» ⇒ إشرافيّ (لمرّةٍ واحدة)');
  assert.equal(R.roles.find((x) => x.id === 'TEST_ONLY_t_k24').sup, false, 'sup:false صراحةً يغلب الاسم');
  assert.equal(R.roles.find((x) => x.id === 'TEST_ONLY_t_flag').sup, true, 'sup:true صراحةً');
  assert.ok(Object.keys(R.roles.find((x) => x.id === 'TEST_ONLY_t_lead').sys.staff.keys).length > 0, 'ورقةُ القالب تُرجمت إلى مفاتيح');
  assert.deepEqual(Object.keys(R.roles.find((x) => x.id === 'TEST_ONLY_t_k24').sys).sort(), ['dstats', 'staff']);
  assert.deepEqual(R.roles.find((x) => x.id === 'TEST_ONLY_t_flag').sys, {});
  Object.entries(TPLOF).forEach(([ek, tid]) => {
    rows.push(['tplOf', ek, tid, '→ person.role', R.people[ek] ? R.people[ek].role : '(none)'].join(' | '));
    if (tid === 'TEST_ONLY_gone') assert.equal(R.people[ek], undefined, 'قالبٌ مفقود لا يصنع دوراً');
    else assert.deepEqual(R.people[ek], { role: tid, ex: [] });
  });
  console.log('kind | id | name | sup | source | → | role.name | role.sup | role.sys\n' + rows.join('\n'));
  assert.equal(kvGet(DB, KT), T0, 'القوالبُ لا تُمسّ'); assert.equal(kvGet(DB, KP), P0, 'bassam_perms_v1 لا يُمسّ'); assert.equal(kvGet(DB, KG), G0, 'المنحُ لا يُمسّ');
  assert.equal(DB.q("SELECT v FROM meta WHERE k = 'authz_perm_mig'").length, 0, 'لا علامةَ ترحيل صلاحيات (الجزءُ لا يمسّ القرار)');
  /* ③ الثانية بلا كتابة */
  const P3 = (await plan(W)).j.plan; assert.equal(P3.counts.writes, 0, JSON.stringify(P3.counts));
  const ap0 = await apply(W, P3); assert.equal(ap0.status, 200); assert.equal(ap0.j.applied, 0);
  /* ④ الرجوع */
  const rb = await migrate(W, { act: 'rollback', snap: ap.j.snap });
  assert.equal(rb.status, 200, JSON.stringify(rb.j));
  assert.equal(kvGet(DB, KR), null, 'الأدوارُ كما كانت (لا سجلّ)');
  assert.equal(kvGet(DB, KT), T0); assert.equal(kvGet(DB, KP), P0);
  assert.equal((await migrate(W, { act: 'rollback', snap: ap.j.snap })).j.err, 'already-restored');
});

test('[enforce] perm44-roles: ما في سجلّ الأدوار من قبل يبقى — دورٌ بالمعرّف نفسه لا يُستبدل · شخصٌ له دور لا يُبدَّل', async () => {
  const W = await world(), DB = W.env.DB;
  const pre = { v: 1, roles: [{ id: 'TEST_ONLY_t_lead', name: 'TEST_ONLY معدَّل يدوياً', desc: 'x', sup: false, sys: {} }], people: { TEST_ONLY_e2: { role: 'TEST_ONLY_t_lead', ex: [] } } };
  kvSet(DB, KR, JSON.stringify(pre));
  const P = (await plan(W)).j.plan; assert.equal(P.counts.writes, 1); assert.equal(P.counts.roles, 2, 'القالبان الآخران وحدهما');
  const ap = await apply(W, P); assert.equal(ap.status, 200, JSON.stringify(ap.j));
  const R = JSON.parse(kvGet(DB, KR));
  assert.deepEqual(R.roles[0], pre.roles[0], 'الدورُ القائم كما هو');
  assert.deepEqual(R.people.TEST_ONLY_e2, pre.people.TEST_ONLY_e2, 'إسنادٌ قائم لا يُبدَّل');
  assert.deepEqual(R.people.TEST_ONLY_e1, { role: 'TEST_ONLY_t_lead', ex: [] });
  const rb = await migrate(W, { act: 'rollback', snap: ap.j.snap }); assert.equal(rb.status, 200, JSON.stringify(rb.j));
  assert.deepEqual(JSON.parse(kvGet(DB, KR)), pre, 'الرجوعُ يعيد السجلَّ القائم حرفاً');
});
