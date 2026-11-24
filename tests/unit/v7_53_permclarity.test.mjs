/* V7 · 53 (وضوح الصلاحيات — docs/handoff/REVIEW.md بند 4 · معتمدٌ من المالك): عرضٌ وأسماءٌ فقط — منطقُ الصلاحيات ومفاتيحُ المستويات كما هي، ولا ترحيلَ بيانات.
   أ. أسماءُ المستويات وسطرُها الوصفي من مصدرٍ واحد (src/permissions/registry/perm44-levels.json): مشاهدة · إدخال · تعديل · تشغيل · إشراف · مخصّص.
   ب. تحت كلِّ مستوى مختار جدولُ أفعال النظام كلِّها (KIVO.Perm44.acts): الفعل · المكان (verb · place في السجلّ المولَّد من permissions.json لكل نظام) · الحالة.
   الاختبارات الستة (REVIEW 4.ج) — TEST_ONLY (tests/fixtures/gen_fixture.py):
     ① كلُّ صلاحيات الأنظمة الأحد عشر (العددُ من السجلّ = 164) في جدول نظامها، بالمستوى الصحيح، بفعلٍ ومكانٍ غير فارغين;
     ② لا حسّاسَ في مشاهدة/إدخال/تعديل/تشغيل، وكلُّ حذفٍ/اعتمادٍ/قفلٍ/إعادةِ فتح في «إشراف»;
     ③ الصلاحياتُ الفعلية لكل شخص في بياناتٍ بشكل Production قبل التغيير = بعده (العاملُ الحقيقي: الأساس c090be0 ⇄ الحالي);
     ④ الأربعُ «للمدير فقط» لا تُمنح من الواجهة ولا من الخادم;
     ⑤ لا اسمَ قديم لمستوى في أي نصٍّ بالمنصة (المبنيّ pk265 والعامل);
     ⑥ هامشُ صفحة الإدارة ≥ 4% (≤ 94,560 gz) وصفحة «الإدارات والصلاحيات» ≥ 2%. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, SRC, DIST, PYTHON, makeLegacyTestEnv as makeEnv, client, applySql } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';

const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const J = (x) => JSON.parse(JSON.stringify(x));
const LV = JSON.parse(rd('src/permissions/registry/perm44-levels.json')).levels;
const NAME = Object.fromEntries(LV.map((l) => [l.key, l.name]));
const ORDER = LV.filter((l) => !l.custom).map((l) => l.key);

function clientEngine() {
  const ctx = { KIVO: {}, console, localStorage: { getItem: () => null, setItem() {} } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(rd('src/permissions/340-registry-v24-9.js'), ctx);
  vm.runInContext(rd('src/permissions/345-perm44.js'), ctx);
  return { E: ctx.KIVO.Perm44, R: ctx.KIVO_REGISTRY || ctx.KIVO.KIVO_REGISTRY };
}
/* الأنظمةُ الأحد عشر = مجلداتُ src/systems ذاتُ system.json و permissions.json — ومفاتيحُها كما يصرّح بها كلٌّ في ملفه */
function systemKeys() {
  const d = path.join(SRC, 'systems'), out = {};
  for (const s of fs.readdirSync(d).sort()) {
    const f = path.join(d, s, 'permissions.json');
    if (!fs.existsSync(path.join(d, s, 'system.json')) || !fs.existsSync(f)) continue;
    out[s] = JSON.parse(fs.readFileSync(f, 'utf8')).docs.registry.filter((op) => op.path.length === 1 && op.path[0] === 'registry' && op.value && op.value.key).map((op) => op.value.key);
  }
  return out;
}

test('53 · وضوح ① أ — أسماءُ المستويات وسطرُها من perm44-levels.json وحده (المفاتيح كما هي)، والصفحةُ بلا قائمة أسماء', () => {
  assert.deepEqual(LV.map((l) => [l.key, l.name, l.desc]), [
    ['view', 'مشاهدة', 'يشاهد فقط'], ['input', 'إدخال', '+ يضيف جديداً'], ['edit', 'تعديل', '+ يعدّل ويُسند ويُرفق'],
    ['full', 'تشغيل', '+ يقبل وينهي ويصدّر'], ['sensitive', 'إشراف', '+ يحذف ويعتمد ويقفل ويعيد الفتح'], ['custom', 'مخصّص', 'تختار الأفعال واحداً واحداً']]);
  const { E } = clientEngine();
  assert.deepEqual(J(E.levels()).map((l) => [l.key, l.name, l.desc]), LV.map((l) => [l.key, l.name, l.desc]), 'the engine (client) carries them');
  const org = rd('src/modules/org/logic-perm44.js');
  assert.doesNotMatch(org, /P44_LV|view: "مشاهدة|full: "|sensitive: "/, 'no second list of level names in the page');
  assert.match(org, /_p44Lvls\(\) \{\s*const raw = this\._p44Try\(\(\) => this\._p44E\(\)\.levels\(\), null\);/, 'the page reads the engine levels');
});

test('53 · وضوح ① ب — كلُّ صلاحيات الأنظمة الأحد عشر في جدول نظامها بالمستوى الصحيح، بفعلٍ ومكانٍ غير فارغين (العددُ من السجلّ)', () => {
  const { E, R } = clientEngine(), SK = systemKeys();
  const all = [].concat(...Object.values(SK));
  assert.equal(Object.keys(SK).length, 11, 'the eleven systems: ' + Object.keys(SK).join(' '));
  assert.equal(all.length, 164, 'the registry count of the eleven systems (REVIEW says 164): ' + all.length);
  const rows = ['system · keys · ✔ per level (view input edit full sensitive) · للمدير فقط · لكل موظف'];
  for (const [s, keys] of Object.entries(SK)) {
    const per = {};
    for (const L of ORDER.concat(['custom'])) {
      const T = J(E.acts(s, {}, L)), by = Object.fromEntries(T.map((x) => [x.k, x]));
      per[L] = T;
      for (const k of keys) {
        const x = by[k], e = R.byKey[k];
        assert.ok(x, s + ' · ' + L + ': ' + k + ' is in its system table');
        assert.ok(x.a.trim() && x.w.trim() && x.a === e.verb && x.w === e.place, k + ': action and place from the registry (verb · place), non-empty');
        const min = ORDER.find((l) => E.keysFor(s, l).includes(k)) || '';
        if (e.grant === 'none') { assert.equal(x.st, 'للمدير فقط', k); assert.equal(x.ck, false, k + ': no checkbox'); continue; }
        if (e.grant === 'self') { assert.equal(x.st, 'لكل موظف على ما يخصه', k); assert.equal(x.ck, false, k + ': no checkbox'); continue; }
        assert.equal(x.m, min, k + ': its lowest level');
        if (L === 'custom') { assert.equal(x.ck, true, k + ': a checkbox in «مخصّص»'); assert.equal(x.st, NAME[min], k + ': its level beside the box'); continue; }
        assert.equal(x.ck, false);
        assert.equal(x.st, E.keysFor(s, L).includes(k) ? '✔' : '✕ يحتاج ' + NAME[min], s + ' · ' + L + ' · ' + k);
      }
      /* وأفعالُ التصدير (أعلام ff) بنصّها من ذرّتها، في «تشغيل» و«إشراف» */
      for (const f of E.sysFlags(s)) { const x = by[f]; assert.ok(x && x.a.trim() && x.w.trim(), f + ' row'); if (L !== 'custom') assert.equal(x.st, ['full', 'sensitive'].includes(L) ? '✔' : '✕ يحتاج تشغيل', f + ' · ' + L); }
      /* لا صفَّ غيرَ ما يحكمه الصفّ: المفاتيحُ الممنوحة بالنظام (keysFor «إشراف») + ما لا يُمنح منه + أعلامُه */
      const want = R.keys.filter((k) => E.keysFor(s, 'sensitive').includes(k) || (keys.includes(k) && ['none', 'self'].includes(R.byKey[k].grant))).concat(E.sysFlags(s));
      assert.deepEqual(T.map((x) => x.k), J(want), s + ' · ' + L + ': exactly the row\'s actions, in registry order');
    }
    rows.push(s + ' · ' + keys.length + ' · ' + ORDER.map((L) => per[L].filter((x) => x.st === '✔').length).join(' ') + ' · ' + per.view.filter((x) => x.st === 'للمدير فقط').length + ' · ' + per.view.filter((x) => x.st === 'لكل موظف على ما يخصه').length);
  }
  console.log(rows.join('\n'));
  /* مفاتيحُ عدسةٍ لها صفٌّ في الدور يحكمها صفُّها (compileRole) — فتخرج من جدول مضيفها وتظهر في جدول العدسة */
  const lzAll = E.keysFor('lens.zones', 'sensitive'), lzk = lzAll.filter((k) => E.keysFor('plan', 'sensitive').includes(k));
  assert.ok(lzk.length && lzk.every((k) => J(E.acts('plan', {}, 'view')).some((x) => x.k === k)), 'no lens row: the host governs the lens keys');
  assert.ok(!J(E.acts('plan', { 'lens.zones': { lvl: 'view' } }, 'view')).some((x) => lzk.includes(x.k)), 'a lens row: its keys leave the host table');
  assert.deepEqual(J(E.acts('lens.zones', {}, 'edit')).map((x) => x.k), J(lzAll), 'the lens table = the lens keys');
});

test('53 · وضوح ② لا حسّاسَ في مشاهدة/إدخال/تعديل/تشغيل · وكلُّ حذفٍ/اعتمادٍ/قفلٍ/إعادةِ فتح في «إشراف» (التصنيفُ الحالي بلا تغيير)', () => {
  const { E, R } = clientEngine(), sys = J(E.sysList()).map((s) => s.key).concat(J(E.lensList()).map((x) => x.key)), bad = [];
  for (const s of sys) {
    for (const k of E.keysFor(s, 'sensitive')) {
      const e = R.byKey[k], min = ORDER.find((l) => E.keysFor(s, l).includes(k));
      if (e.sensitive && min !== 'sensitive') bad.push(s + ' · ' + k + ' sensitive at «' + NAME[min] + '»');
      const crit = e.type === 'delete' || e.type === 'decision' || /(^|\.)(delete|approve|lock|reopen|retro\.open)(\.|$)/.test(k);
      if (crit && min !== 'sensitive') bad.push(s + ' · ' + k + ' (' + e.type + ') at «' + NAME[min] + '»');
    }
  }
  assert.deepEqual(bad, [], 'owner question if not empty — the classification is not changed here');
});

test('53 · وضوح ④ الواجهة — الأربعُ «للمدير فقط» بلا مربع، ولا يحملها «مخصّص» ولا أيُّ مستوى', () => {
  const { E, R } = clientEngine(), FOUR = ['award.res.reopen', 'round.day.disable', 'ir.rec.status', 'rz.rec.status'];
  assert.deepEqual(J(R.keys.filter((k) => R.byKey[k].grant === 'none' && R.byKey[k].ownerKind === 'page')).sort(), FOUR.slice().sort(), 'the four grant:none keys of the systems');
  for (const k of FOUR) {
    const s = E.sysList().find((x) => x.leaves.includes(R.byKey[k].owner)).key, x = J(E.acts(s, {}, 'custom')).find((y) => y.k === k);
    assert.ok(x && x.st === 'للمدير فقط' && x.ck === false, k + ': shown «للمدير فقط» without a checkbox');
    for (const L of ORDER) assert.ok(!E.keysFor(s, L).includes(k), k + ' not in ' + L);
    assert.deepEqual(J(E.keysFor(s, 'custom', [k])), [], k + ': a forged custom list does not carry it');
    assert.deepEqual(J(E.compileRole({ id: 'TEST_ONLY_r', sys: { [s]: { lvl: 'custom', keys: [k] } } })), [], k + ': compiled to nothing');
  }
  const view = rd('src/modules/org/view.html');
  assert.equal((view.match(/<sc-if value="\{\{x\.ck\}\}"[^>]*><button type="button" class="og-ck" role="checkbox" aria-checked="\{\{x\.on\}\}"/g) || []).length, 2, 'the checkbox only when x.ck (system rows + lens rows)');
  assert.equal((view.match(/<th scope="col">الفعل<\/th><th scope="col">المكان<\/th><th scope="col">الحالة<\/th>/g) || []).length, 2, 'the table columns');
});

/* ── ③ و④ الخادم: العاملُ الحقيقي على بيانات gen_fixture (شكل Production: أوراقٌ ومنحٌ صريح وعدساتٌ ومديرون ومديرُ فرع) + أدوارٌ بكل المستويات ── */
const D = 'tst_d1', KR = 'bsdept:' + D + ':bassam_roles_v1', KG = 'bsdept:' + D + ':bassam_grants_v1';
const ACC = [['0000000101', '70101'], ['0000000102', '70102'], ['0000000103', '70103'], ['0000000104', '70104'], ['0000000111', '70111'], ['0000000112', '70112'], ['0000000113', '70113'], ['0000000114', '70114'],
  ['0000000115', '70115'], ['0000000116', '70116'], ['0000000117', '70117'], ['0000000118', '70118'], ['0000000119', '70119'], ['0000000120', '70120'], ['0000000121', '70121']];
let SEED = null;
function seedSql() {
  if (SEED) return SEED;
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_pc_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', '1447-6-1', '--out', out], { stdio: 'pipe' });
  return (SEED = fs.readFileSync(out + '/test_seed.sql', 'utf8'));
}
function serverEngine(src) {
  const ctx = { console }; vm.createContext(ctx);
  vm.runInContext(src + '\n;this.E = perm44E();', ctx);
  return ctx.E;
}
async function world(workerFile) {
  const env = makeEnv(); env.__worker = (await import(pathToFileURL(workerFile).href + '?pc=' + Math.random())).default;
  const C = client(env);
  assert.ok((await C.login('admin', 'admin')).ok);
  await applySql(env.DB, seedSql()); await installCurrentSchemaFixture(env);
  const sup = await C.login('admin', 'admin');
  const kv = (k) => { const r = env.DB.db.prepare('SELECT v FROM kv WHERE k=? ORDER BY seq').all(k); return r.length ? JSON.parse(r.map((x) => x.v).join('')) : null; };
  const save = async (set) => {
    const g = await C.api('/api/get?keys=' + Object.keys(set).map(encodeURIComponent).join(','), { cookie: sup.ck }), base = {};
    for (const k of Object.keys(set)) base[k] = (((g.j || {}).keys || {})[k] || {}).rev || 0;
    return C.api('/api/save', { method: 'POST', cookie: sup.ck, body: { set: Object.fromEntries(Object.entries(set).map(([k, v]) => [k, JSON.stringify(v)])), del: [], base, uid: sup.j.uid } });
  };
  /* سقفُ الإدارة في البيانات المولَّدة بلا «رصد الحالات» (PG_KEYS) — يُضاف بالمسار القائم (bassam_perms_v1.caps) ليقع كلُّ نظامٍ في السقف */
  const P = kv('bassam_perms_v1'); P.caps[D] = P.caps[D].concat(['rasd']); P.caps.tst_g1 = P.caps[D].slice();   /* optIn: وفي سقف الفرع الأعلى صراحةً */
  const rc = await save({ bassam_perms_v1: P }); assert.equal(rc.status, 200, 'cap +rasd'); assert.deepEqual((rc.j && rc.j.denied) || {}, {});
  return { env, C, sup, kv, save };
}
/* أدوارٌ بكل مستوى على كل الأنظمة، ودورٌ «مخصّص» بنصف الأفعال وأعلام التصدير — يُسند كلٌّ إلى موظفٍ من الإدارة (المنحُ من المحرّك نفسِه) */
function rolesFor(E) {
  const sys = J(E.sysList()).map((s) => s.key), roles = ORDER.map((L) => ({ id: 'TEST_ONLY_r_' + L, name: 'TEST_ONLY ' + L, sys: Object.fromEntries(sys.map((s) => [s, { lvl: L }])) }));
  roles.push({ id: 'TEST_ONLY_r_custom', name: 'TEST_ONLY custom', sys: Object.fromEntries(sys.map((s) => [s, { lvl: 'custom', keys: J(E.keysFor(s, 'sensitive')).filter((k, i) => i % 2 === 0).concat(J(E.sysFlags(s)).slice(0, 1)) }])) });
  roles.push({ id: 'TEST_ONLY_r_mix', name: 'TEST_ONLY mix', sys: { staff: { lvl: 'edit' }, tasks: { lvl: 'full' }, plan: { lvl: 'view' }, 'lens.zones': { lvl: 'sensitive' }, daily: { lvl: 'input' }, seized: { lvl: 'sensitive' } } });
  const eks = ['tst_e_sup1', 'tst_e_supB', 'tst_e_emp1', 'tst_e_lens_on', 'tst_e_lens_off', 'tst_e_pnos', 'tst_e_snop'];
  const people = Object.fromEntries(eks.map((e, i) => [e, { role: roles[i % roles.length].id, ex: [] }]));
  people.tst_e_field = { role: null, ex: [{ key: 'field.view', until: null }] };
  return { v: 1, roles, people };
}
async function effective(workerFile, coreSrc) {
  const W = await world(workerFile), E = serverEngine(coreSrc), rec = rolesFor(E), cur = W.kv(KG) || { v: 1, emp: {} }, emp = Object.assign({}, cur.emp);
  const C = (k) => true;
  for (const e of Object.keys(rec.people)) emp[e] = J(E.grantOf(rec.people[e], rec, C, Date.now(), null));
  const r = await W.save({ [KR]: rec, [KG]: Object.assign({}, cur, { emp }) });
  const out = { save: [r.status, J((r.j && r.j.denied) || {})], me: {} };
  for (const [u, p] of ACC) {
    const l = await W.C.login(u, p); if (!l.ok) { out.me[u] = 'login ' + l.status; continue; }
    const a = await W.C.api('/api/authz', { cookie: l.ck }); out.me[u] = [a.status, a.j && a.j.me];
  }
  return out;
}
const BASE = process.env.KIVO_PERMCLARITY_BASE || 'c090be0';
function baseWorker() {
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_pc_base_')), f = path.join(dir, 'worker_base.mjs');
    fs.writeFileSync(f, execFileSync('git', ['-C', ROOT, 'show', BASE + ':workers/_worker.js'], { maxBuffer: 64 << 20 }));
    const core = ['workers/parts/004-registry-2.js', 'workers/parts/057b-perm44.js'].map((p) => execFileSync('git', ['-C', ROOT, 'show', BASE + ':' + p], { maxBuffer: 64 << 20 }).toString()).join('\n');
    return { f, core };
  } catch (e) { return null; }
}
const B0 = baseWorker();

test('53 · وضوح ③ الصلاحياتُ الفعلية لكل شخص (العامل الحقيقي · بيانات بشكل Production) قبل التغيير = بعده — صفرُ فرق', { timeout: 600000, skip: B0 ? false : 'الأساس ' + BASE + ' غيرُ موجود في تاريخ git (KIVO_PERMCLARITY_BASE)' }, async () => {
  const before = await effective(B0.f, B0.core);
  const after = await effective(path.join(ROOT, 'workers', '_worker.js'), rd('workers/parts/004-registry-2.js') + '\n' + rd('workers/parts/057b-perm44.js'));
  assert.deepEqual(before.save, [200, {}], 'the roles + grants save (before)'); assert.deepEqual(after.save, [200, {}], 'the roles + grants save (after)');
  const n = Object.values(after.me).filter((x) => Array.isArray(x) && x[0] === 200 && x[1]).length;
  assert.equal(n, ACC.length, 'every person answered /api/authz: ' + JSON.stringify(Object.keys(after.me).filter((u) => !Array.isArray(after.me[u]) || after.me[u][0] !== 200)));
  const keysOf = (m) => Object.values((m && m[1] && m[1].depts) || {}).reduce((a, d) => a + ((d && d.p) || []).length, 0);
  console.log('persons ' + n + ' · effective keys per person: ' + Object.entries(after.me).map(([u, m]) => u.slice(-3) + '=' + keysOf(m)).join(' '));
  assert.ok(Object.values(after.me).filter((m) => keysOf(m) > 0).length >= 8, 'the comparison carries real permissions (the 7 role holders + the exception holder)');
  for (const u of Object.keys(after.me)) assert.deepEqual(after.me[u], before.me[u], u + ': effective permissions before = after');
});

test('53 · وضوح ④ الخادم — الأربعُ «للمدير فقط» لا تُمنح: لا بالمنح المترجَم من الدور، ولا بمنحٍ صريح، ولا يجيب «اختبار الوصول» بالسماح', { timeout: 300000 }, async () => {
  const W = await world(path.join(ROOT, 'workers', '_worker.js')), E = serverEngine(rd('workers/parts/004-registry-2.js') + '\n' + rd('workers/parts/057b-perm44.js'));
  const FOUR = { 'award.res.reopen': 'award', 'round.day.disable': 'daily', 'ir.rec.status': 'irshad', 'rz.rec.status': 'rasd' }, EK = 'tst_e_emp1', cur = W.kv(KG) || { v: 1, emp: {} };
  const rec = { v: 1, roles: [{ id: 'TEST_ONLY_r4', name: 'TEST_ONLY أربع', sys: Object.fromEntries(Object.entries(FOUR).map(([k, s]) => [s, { lvl: 'custom', keys: [k, s === 'award' ? 'award.res.view' : s === 'daily' ? 'round.view' : s === 'irshad' ? 'ir.rec.view' : 'rz.rec.view'] }])) }], people: { [EK]: { role: 'TEST_ONLY_r4', ex: [] } } };
  const want = J(E.grantOf(rec.people[EK], rec, () => true, Date.now(), null));
  assert.ok(!Object.keys(FOUR).some((k) => want.plus.includes(k)), 'the engine drops them from the role grant');
  /* (أ) منحٌ مترجَمٌ مزوَّر يحملها مع الدور ⇒ الخادم يرفض الحفظ */
  const forged = Object.assign({}, want, { plus: want.plus.concat(Object.keys(FOUR)) });
  const r1 = await W.save({ [KR]: rec, [KG]: Object.assign({}, cur, { emp: Object.assign({}, cur.emp, { [EK]: forged }) }) });
  assert.ok(r1.status !== 200 || Object.keys((r1.j && r1.j.denied) || {}).length, 'a forged role grant carrying them is refused: ' + JSON.stringify(r1.j).slice(0, 300));
  /* (ب) الدور كما هو (بمنحه الصحيح) يُحفظ — ثم منحٌ صريح بها وحدها (src غيرُ مشتقّ من دور) */
  const r2 = await W.save({ [KR]: rec, [KG]: Object.assign({}, cur, { emp: Object.assign({}, cur.emp, { [EK]: want }) }) });
  assert.equal(r2.status, 200); assert.deepEqual((r2.j && r2.j.denied) || {}, {}, 'the honest save goes through');
  const cur2 = W.kv(KG);
  const r3 = await W.save({ [KG]: Object.assign({}, cur2, { emp: Object.assign({}, cur2.emp, { tst_e_emp2: { plus: Object.keys(FOUR), src: 'TEST_ONLY' } }) }) });
  const l = await W.C.login('0000000113', '70113'), a = await W.C.api('/api/authz', { cookie: l.ck });
  const held = JSON.stringify(a.j.me || {});
  for (const k of Object.keys(FOUR)) assert.ok(!held.includes('"' + k + '"'), k + ' is not effective for the role holder');
  const l2 = await W.C.login('0000000121', '70121'), a2 = await W.C.api('/api/authz', { cookie: l2.ck }), held2 = JSON.stringify(a2.j.me || {});
  for (const k of Object.keys(FOUR)) assert.ok(!held2.includes('"' + k + '"'), k + ' is not effective by an explicit grant (save ' + r3.status + ' ' + JSON.stringify((r3.j && r3.j.denied) || {}).slice(0, 200) + ')');
  /* (ج) «اختبار الوصول» يجيب من قاعدة الخادم: محجوز */
  for (const k of Object.keys(FOUR)) {
    const q = await W.C.api('/api/perm44/check?d=' + D + '&role=TEST_ONLY_r4&key=' + encodeURIComponent(k), { cookie: W.sup.ck });
    assert.equal(q.status, 200); assert.equal(q.j.allow, false, k); assert.equal(q.j.why, 'reserved', k);
  }
});

/* ⑤ لا اسمَ قديمٌ لمستوى في نصوص المنصة المبنيّة (pk265 · العامل): «مشاهدة فقط» · «كامل» · «حسّاس» كلمةً مستقلّة — والباقي صفاتٌ عادية مسمّاة هنا بعبارتها */
const OLD = /(?<![\p{L}\p{M}])(مشاهدة فقط|كامل|حسّاس|حساس)(?![\p{L}\p{M}])/gu;
const NOT_LEVEL = ['شهر كامل', 'استبدال كامل', 'كامل الصلاحية', 'عجز كامل', 'إقرار كامل', 'تأكيد كامل', 'تأكيد حفظ كامل', 'حضور كامل', 'رصد كامل', 'بشكل كامل', 'تقرير كامل الورديات', 'إجراءٌ حسّاس'];
test('53 · وضوح ⑤ لا يظهر الاسمان القديمان (ولا «مشاهدة فقط») اسماً لمستوى في أي نصٍّ بالمنصة', () => {
  const hits = [], files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(js|html|txt|json)$/.test(f)) files.push(p); } };
  walk(DIST);
  for (const p of files) {
    const t = fs.readFileSync(p, 'utf8'); let m; OLD.lastIndex = 0;
    while ((m = OLD.exec(t))) { const ctx = t.slice(Math.max(0, m.index - 20), m.index + m[0].length + 24); if (!NOT_LEVEL.some((w) => ctx.includes(w))) hits.push(path.relative(DIST, p) + ': …' + ctx.replace(/\s+/g, ' ') + '…'); }
  }
  assert.ok(files.length > 50, 'the built platform: ' + DIST);
  assert.deepEqual(hits, [], 'an old level name in the platform text');
  /* وصفحةُ «الإدارات والصلاحيات» ومحرّكُ الأدوار بلا أيٍّ منها البتّة */
  for (const f of ['src/modules/org/view.html', 'src/permissions/registry/perm44-levels.json']) assert.doesNotMatch(rd(f), OLD, f);
});

test('53 · وضوح ⑥ الهامش: page:Admin ≤ 94,560 gz (≥ 4%) · page:Org ≥ 2% — بلا رفع سقف', () => {
  const B = JSON.parse(rd('tools/perf_budget.json')).budget;
  const out = execFileSync(PYTHON, [ROOT + '/tools/perf_budget.py', DIST], { encoding: 'utf8' });
  const got = (g) => { const m = new RegExp(g.replace(':', '\\:') + '\\s+gz\\s+(\\d+)\\s+/\\s+(\\d+)').exec(out); assert.ok(m, g + ' measured'); return [+m[1], +m[2]]; };
  const [a, ac] = got('page:Admin'), [o, oc] = got('page:Org');
  console.log('page:Admin ' + a + ' / ' + ac + ' (' + (100 * (ac - a) / ac).toFixed(2) + '%) · page:Org ' + o + ' / ' + oc + ' (' + (100 * (oc - o) / oc).toFixed(2) + '%)');
  assert.equal(ac, B['page:Admin']); assert.equal(ac, 98500, 'the Admin cap is not raised'); assert.equal(oc, 43600, 'the Org cap is not raised');
  assert.ok(a <= 94560, 'page:Admin ≤ 94,560 gz: ' + a);
  assert.ok(o <= Math.floor(oc * 0.98), 'page:Org keeps ≥ 2%: ' + o + ' / ' + oc);
});

test('53 · وضوح — نصّا الفعل والمكان في الواجهة وحدها: جزءُ الخادم 004 = السجلُّ بلا verb · place (targets.json omitFields)، ولا قارئَ لهما في العامل', () => {
  const R = JSON.parse(rd('src/permissions/registry/registry-v24.9.json')), drop = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'verb' && k !== 'place'));
  const dataOf = (f) => JSON.parse(/var KIVO_REGISTRY_DATA = (.*);\n/.exec(rd(f))[1]);
  assert.deepEqual(dataOf('src/permissions/340-registry-v24-9.js'), R, 'the client carries the registry as generated (with the texts)');
  assert.deepEqual(dataOf('workers/parts/004-registry-2.js'), Object.assign({}, R, { registry: R.registry.map(drop), atoms: R.atoms.map(drop) }), 'the server: the same registry without verb · place');
  assert.ok(R.registry.filter((e) => e.verb).length >= 164 && R.atoms.filter((a) => a.verb).length >= 25, 'the texts are in the generated registry');
  assert.doesNotMatch(rd('workers/_worker.js'), /\.verb\b|\.place\b|"verb"|"place"|'verb'|'place'/, 'nothing in the worker reads them');
});
