/* V7 · د7 (52 · الكامن): القاعدةُ الواحدة perm44-core keepOff مقابل حارس الخادم (021 latentLossWhy) وحكمِ المنح المترجَم (057b perm44GrantsWhy) —
   على العامل الحقيقي وعُدّة الاختبار (gen_fixture.py · TEST_ONLY)، بالوضع النافذ، بمدير المنصة (المشكلة تتكرّر به في Preview):
   ① منحُ دورٍ بنظامٍ أُطفئ بعدُ: إعادةُ بنائه من الدور بلا keepOff تُرفض (الحارسُ كما هو، 'latent: grant …') وبه تُقبل، والمخزَّنُ يحمل المفتاحَ المخفيّ؛
   ② مفتاحٌ خارج السقف لم يكن في مدخله المخزَّن يُرفض (p44-grants) — لا تليينَ لحكم المنح؛ ③ المنحُ الصريح (بلا src دور) يبقى محمياً كما كان؛
   ④ keepOff = ما يطلبه latentLossWhy حرفاً: لكل مدخلٍ ومجموعةِ مفاتيح مولَّدة، ناتجُه لا يرفضه الحارس ولا يحمل مفتاحاً داخل السقف لم يكن في الجديد. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeLegacyTestEnv as makeEnv, client, applySql, ROOT, WORKER } from './harness.mjs';
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


const ENG = () => { const ctx = { console }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'workers/parts/004-registry-2.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'workers/parts/057b-perm44.js'), 'utf8') + '\n;this.E = perm44E();', ctx); return ctx.E; };
const J = (x) => JSON.parse(JSON.stringify(x));

test('V7 · د7 (52 · الكامن): role-derived grant under a narrowed ceiling — keepOff saves, without it the guard refuses; nothing new outside the ceiling; explicit grants stay guarded', async () => {
  const S = await world('enforce'), E = ENG(), all = () => true;
  const role = { id: 'TEST_ONLY_r_lat', name: 'TEST_ONLY تجربة مشاهد', sys: { tasks: { lvl: 'view' }, award: { lvl: 'view' } } };
  const rec = { v: 1, roles: [role], people: { [EMP]: { role: role.id, ex: [] } } };
  const g0 = J(E.grantOf(rec.people[EMP], rec, all, Date.now(), null)), off = g0.plus.filter((k) => E.sysOfKey(k).includes('award'));
  assert.ok(off.length && g0.plus.length > off.length, 'the role grants award and tasks keys: ' + JSON.stringify(g0));
  const G0 = S.kv(KG) || { v: 1, emp: {} }, G = (e) => ({ ...G0, emp: { ...G0.emp, ...e } });
  assert.deepEqual(denied(await S.save(S.sup, { [KR]: rec, [KG]: G({ [EMP]: g0 }) })), {}, 'granted by role while award is ON');
  const P = S.kv('bassam_perms_v1'); P.caps[D] = P.caps[D].filter((k) => k !== 'award');
  assert.deepEqual(denied(await S.save(S.sup, { bassam_perms_v1: P })), {}, 'award turned OFF for the unit');
  const C = (k) => !E.sysOfKey(k).includes('award');
  /* the role's level changes (tasks view → full) */
  const rec2 = J(S.kv(KR)); rec2.roles[0].sys.tasks = { lvl: 'full' };
  const nx = J(E.grantOf(rec2.people[EMP], rec2, C, Date.now(), null)), old = S.kv(KG).emp[EMP];
  /* before the fix (the client wrote nx as is): the guard refuses, nothing written */
  const r0 = await S.save(S.sup, { [KR]: rec2, [KG]: G({ [EMP]: nx }) });
  assert.match(String((denied(r0)[KG] || {}).detail || ''), /^latent: grant /, 'without keepOff: the latent guard refuses (unchanged): ' + JSON.stringify(r0.j).slice(0, 300));
  assert.deepEqual(S.kv(KR).roles[0].sys.tasks, { lvl: 'view' }, 'atomic: nothing written');
  /* ② a key outside the ceiling that his stored entry did not hold is refused */
  const extra = E.keysFor('award', 'full').find((k) => !old.plus.includes(k));
  assert.ok(extra, 'an award key beyond view');
  const bad = J(E.keepOff(nx, old, C)); bad.plus.push(extra);
  const r1 = await S.save(S.sup, { [KR]: rec2, [KG]: G({ [EMP]: bad }) });
  assert.ok(denied(r1)[KG] || denied(r1)[KR], 'a new out-of-ceiling key is refused: ' + JSON.stringify(r1.j).slice(0, 300));
  /* ① with keepOff: saved, and the hidden keys stay with his grant */
  const good = J(E.keepOff(nx, old, C));
  const r2 = await S.save(S.sup, { [KR]: rec2, [KG]: G({ [EMP]: good }) });
  assert.deepEqual(denied(r2), {}, 'keepOff: saved: ' + JSON.stringify(r2.j).slice(0, 300));
  assert.deepEqual(off.filter((k) => !S.kv(KG).emp[EMP].plus.includes(k)), [], 'the hidden award keys are kept');
  assert.deepEqual(S.kv(KR).roles[0].sys.tasks, { lvl: 'full' });
  /* ON again: the server holds his award view right as before (decision-time cut lifted) */
  P.caps[D] = P.caps[D].concat(['award']); assert.deepEqual(denied(await S.save(S.sup, { bassam_perms_v1: P })), {}, 'award ON again');
  const ck = await S.get(S.sup, '/api/perm44/check?d=' + D + '&ekey=' + EMP + '&key=' + encodeURIComponent(off[0]));
  assert.equal(ck.status, 200); assert.ok(S.kv(KG).emp[EMP].plus.includes(off[0]), 'ON again ⇒ his award key is held as before');
  /* ③ an explicit grant (no role source) keeps the guard: dropping its hidden key is refused */
  const X = 'TEST_ONLY_e_explicit';
  assert.deepEqual(denied(await S.save(S.sup, { [KG]: { ...S.kv(KG), emp: { ...S.kv(KG).emp, [X]: { plus: [off[0]], minus: [] } } } })), {}, 'an explicit grant while award is ON');
  const P2 = S.kv('bassam_perms_v1'); P2.caps[D] = P2.caps[D].filter((k) => k !== 'award'); assert.deepEqual(denied(await S.save(S.sup, { bassam_perms_v1: P2 })), {});
  const r3 = await S.save(S.sup, { [KG]: { ...S.kv(KG), emp: { ...S.kv(KG).emp, [X]: { plus: [], minus: [] } } } });
  assert.match(String((denied(r3)[KG] || {}).detail || ''), /^latent: grant /, 'explicit grant: dropping a hidden key is still refused');
});

test('V7 · د7 (52 · الكامن): keepOff = what latentLossWhy requires (generated cases on the real worker rule)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p44lat-')), f = path.join(dir, 'w.mjs');
  fs.writeFileSync(f, fs.readFileSync(WORKER, 'utf8') + '\nexport { latentLossWhy, perm44E, enfKeyOnCeiling };\n');
  const M = await import('file://' + f); fs.rmSync(dir, { recursive: true, force: true });
  const E = M.perm44E(), R = E.sysList().filter((s) => s.toggle !== false);
  let seed = 7; const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const keysOf = (s) => E.sysKeys(s.key);
  for (let t = 0; t < 60; t++) {
    const offS = R.filter(() => rnd(3) === 0).map((s) => s.key), d = 'tst_d1';
    const caps = { [d]: R.map((s) => s.leaves[0].split('/')[0]).filter((p, i, a) => a.indexOf(p) === i).concat(['emps']).filter((p) => !offS.includes(p)) };
    const A = { u: { role: 'super', ekey: '' }, perms: { caps, emps: {} }, off: [] };
    const on = (k) => M.enfKeyOnCeiling({ ...A, perms: A.perms }, d, k);
    const pick = () => { const s = R[rnd(R.length)], ks = keysOf(s); return ks.length ? ks[rnd(ks.length)] : null; };
    const mk = (n) => Array.from({ length: n }, pick).filter(Boolean).filter((k, i, a) => a.indexOf(k) === i);
    const old = { plus: mk(1 + rnd(6)), minus: mk(rnd(3)), src: 'role:x' }, nx = { plus: mk(rnd(6)).filter(on), minus: mk(rnd(2)).filter(on), src: 'role:y' };
    const out = E.keepOff(nx, old, on);
    const cur = JSON.stringify({ v: 1, emp: { e1: old } }), nv = JSON.stringify({ v: 1, emp: { e1: out } });
    assert.equal(M.latentLossWhy(A, 'bsdept:' + d + ':bassam_grants_v1', nv, cur, {}), '', 'keepOff satisfies the guard: ' + JSON.stringify({ offS, old, nx, out }));
    for (const f2 of ['plus', 'minus']) for (const k of out[f2]) assert.ok(nx[f2].includes(k) || (!on(k) && old[f2].includes(k)), 'only hidden keys of the stored entry are added: ' + k);
    const without = M.latentLossWhy(A, 'bsdept:' + d + ':bassam_grants_v1', JSON.stringify({ v: 1, emp: { e1: nx } }), cur, {});
    const lost = ['plus', 'minus'].some((f2) => old[f2].some((k) => !on(k) && !nx[f2].includes(k)));
    assert.equal(!!without, lost, 'the guard refuses exactly when a hidden key would be dropped');
  }
});
