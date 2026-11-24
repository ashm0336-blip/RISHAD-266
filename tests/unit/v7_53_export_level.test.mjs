/* V7 · 53 (قرار المالك — التصدير «أ»: $S/DECISION_53_EXPORT.md): التصديرُ ضمن «كامل» و«حسّاس»، وفي «مخصّص» فعلٌ يُختار، ولا يُعطى لـ«مشاهدة» ولا «إدخال» ولا «تعديل».
   أعلامُ التصدير ff.<نظام>.export ذرّاتٌ converted_to_feature — ليست مفاتيحَ سجلّ (لا مفتاحَ جديد) ولا تحملها بتّاتُ الخادم؛ يحملها المحرّكُ المشترك (perm44-core flagsOf)
   ويُرسلها الخادمُ في وصف الإنفاذ (063 enfMe: depts[d].f) فتضيف الواجهةُ «تصدير» لورقةٍ يحملها الشخص (331 heldPerms). TEST_ONLY (tests/fixtures/gen_fixture.py).
   ① المحرّك: المستويات · «مخصّص» · لا مفتاحَ جديد ولا تغيّرَ في مفاتيح أيّ مستوى · ② الخادم: /api/authz لموظفٍ بدور {staff: full} يحمل ff.staff.export و{staff: edit} لا. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeLegacyTestEnv as makeEnv, client, applySql, ROOT } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';

const D = 'tst_d1', KR = 'bsdept:' + D + ':bassam_roles_v1', KG = 'bsdept:' + D + ':bassam_grants_v1', EMP = 'tst_e_emp1';
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {};
  f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach((p) => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_p44_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
/* المحرّكُ نفسُه (الخادم) خارج العامل — لحساب المنح المتوقَّع */
function engine() {
  const ctx = { console }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'workers/parts/004-registry-2.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'workers/parts/057b-perm44.js'), 'utf8') + '\n;this.E = perm44E();', ctx);
  const J = (x) => JSON.parse(JSON.stringify(x));
  return { grantOf: (...a) => J(ctx.E.grantOf(...a)), keysFor: (...a) => J(ctx.E.keysFor(...a)) };
}
async function world(mode) {
  const env = makeEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}); const C = client(env);
  assert.ok((await C.login('admin', 'admin')).ok);
  await applySql(env.DB, seedSql()); await installCurrentSchemaFixture(env);
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const as = async (u, p) => { const l = await C.login(u, p); assert.ok(l.ok, 'login ' + u + ' ' + JSON.stringify(l.j)); return { ck: l.ck, uid: l.j.uid }; };
  const S = { env, C, sup: await as('admin', 'admin'), dm1: await as('0000000101', '70101'), emp1: await as('0000000113', '70113') };
  S.get = (who, u) => C.api(u, { cookie: who.ck });
  S.revs = async (who, keys) => { const g = await S.get(who, '/api/get?keys=' + keys.map(encodeURIComponent).join(',')); const b = {}; for (const k of keys) b[k] = (((g.j || {}).keys || {})[k] || {}).rev || 0; return b; };
  S.save = async (who, set) => { const base = await S.revs(S.sup, Object.keys(set)); return C.api('/api/save', { method: 'POST', cookie: who.ck, body: { set: Object.fromEntries(Object.entries(set).map(([k, v]) => [k, JSON.stringify(v)])), del: [], base, uid: who.uid } }); };
  S.kv = (k) => { const r = env.DB.db.prepare('SELECT v FROM kv WHERE k=? ORDER BY seq').all(k); return r.length ? JSON.parse(r.map((x) => x.v).join('')) : null; };
  return S;
}
const denied = (r) => (r.j && r.j.denied && typeof r.j.denied === 'object') ? r.j.denied : {};

function eng() {
  const ctx = { console }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'workers/parts/004-registry-2.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'workers/parts/057b-perm44.js'), 'utf8') + '\n;this.E = perm44E(); this.R = KIVO_REGISTRY;', ctx);
  return ctx;
}
const J = (x) => JSON.parse(JSON.stringify(x));

test('53 · التصدير ① المحرّك: «كامل» و«حسّاس» يحملان علمَ التصدير · «مخصّص» يُختار فيه · ولا يُعطى لمشاهدة/إدخال/تعديل — بلا مفتاحٍ جديد', () => {
  const { E, R } = eng();
  const sys = J(E.sysList()).map((s) => s.key).filter((s) => E.sysFlags(s).length);
  assert.ok(['staff', 'tasks', 'seized', 'plan', 'dreport'].every((s) => sys.includes(s)), 'every system with an export atom has its flag: ' + sys);
  assert.deepEqual(J(E.sysFlags('staff')), ['ff.staff.export']);
  for (const s of sys) {
    for (const lv of ['view', 'input', 'edit']) assert.deepEqual(J(E.flagsFor(s, lv)), [], s + '·' + lv + ': no export');
    for (const lv of ['full', 'sensitive']) assert.deepEqual(J(E.flagsFor(s, lv)), J(E.sysFlags(s)), s + '·' + lv + ': export');
    assert.deepEqual(J(E.flagsFor(s, 'custom', [])), [], s + ': custom without the action');
    assert.deepEqual(J(E.flagsFor(s, 'custom', E.sysFlags(s).slice(0, 1))), J(E.sysFlags(s).slice(0, 1)), s + ': custom with the action');
    for (const f of E.sysFlags(s)) {
      assert.equal(R.byKey[f], undefined, f + ' is not a registry key (no new key)');
      for (const lv of ['view', 'input', 'edit', 'full', 'sensitive']) assert.ok(!E.keysFor(s, lv).includes(f), s + '·' + lv + ': the level keys are unchanged (no flag among them)');
      assert.ok(!E.keysFor(s, 'custom', [f]).includes(f), 'custom keys stay registry keys');
    }
  }
  const roles = (lvl) => ({ v: 1, roles: [{ id: 'TEST_ONLY_r', name: 'TEST_ONLY دور', sys: { staff: { lvl } } }], people: { e1: { role: 'TEST_ONLY_r', ex: [] } } });
  assert.deepEqual(J(E.flagsOf({ role: 'TEST_ONLY_r' }, roles('full'))), ['ff.staff.export'], '{staff: full} → export');
  assert.deepEqual(J(E.flagsOf({ role: 'TEST_ONLY_r' }, roles('sensitive'))), ['ff.staff.export'], '{staff: sensitive} → export');
  for (const lv of ['view', 'input', 'edit']) assert.deepEqual(J(E.flagsOf({ role: 'TEST_ONLY_r' }, roles(lv))), [], '{staff: ' + lv + '} → no export');
  assert.deepEqual(J(E.flagsOf({ role: 'TEST_ONLY_r' }, roles('full'), (leaf) => leaf !== 'staff')), [], 'outside the unit ceiling: no export');
  assert.equal(E.flagLeaf('ff.staff.export'), 'staff');
});

test('53 · التصدير ② الخادم (الإنفاذ): /api/authz لموظفٍ بدور {staff: full} يحمل ff.staff.export · وبـ{staff: edit} لا يحمله', async () => {
  const S = await world('enforce'), { E } = eng();
  const G0 = S.kv(KG) || { v: 1, emp: {} };
  const put = async (lvl) => {
    const rec = { v: 1, roles: [{ id: 'TEST_ONLY_r_x', name: 'TEST_ONLY دور التصدير', sys: { staff: { lvl } } }], people: { [EMP]: { role: 'TEST_ONLY_r_x', ex: [] } } };
    const cur = S.kv(KG) || G0, want = J(E.grantOf(rec.people[EMP], rec, () => true, Date.now(), null));
    const r = await S.save(S.sup, { [KR]: rec, [KG]: Object.assign({}, cur, { emp: Object.assign({}, cur.emp, { [EMP]: want }) }) });
    assert.equal(r.status, 200); assert.deepEqual(denied(r), {}, lvl + ': saved ' + JSON.stringify(r.j).slice(0, 300));
    const a = await S.get(S.emp1, '/api/authz'); assert.equal(a.status, 200);
    return ((a.j.me || {}).depts || {})[D] || {};
  };
  const full = await put('full');
  assert.ok(Array.isArray(full.f) && full.f.includes('ff.staff.export'), 'full: ' + JSON.stringify(full.f));
  const edit = await put('edit');
  assert.deepEqual(edit.f, [], 'edit: ' + JSON.stringify(edit.f));
});
