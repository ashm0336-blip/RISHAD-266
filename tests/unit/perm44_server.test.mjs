/* V7 · د5-هـ (44): الأدوار في الخادم — بالوضعين (legacy · enforce) على العامل الحقيقي وعُدّة الاختبار (tests/fixtures/gen_fixture.py · TEST_ONLY).
   ① مديرُ المنصة يحفظ سجلَّ الأدوار ومنحَه المترجَم معاً · ويُكتب حدثُ «سجل الصلاحيات» المنظَّم (GET /api/perm44/log).
   ② المنحُ الذي لا يطابق الدورَ يُرفض · وسجلُّ أدوارٍ يغيّر فعليَّ شخصٍ بلا منحه في الحفظة نفسِها يُرفض — والحفظةُ ذرّية (لا يُكتب منها شيء).
   ③ موظفٌ ليس مديراً لا يكتب الأدوار · ومديرُ الوحدة لا يمنح نظاماً خارج سقفها (cap) ولا نفسَه.
   ④ «اختبار الوصول» GET /api/perm44/check: لمدير المنصة ومدير الوحدة · 403 لغيرهما · والجوابُ من القاعدة نفسِها.
   ⑤ الإنفاذ: الاستثناءُ المؤقّت ينتهي وقتَ القرار (until في المنح — enfGrantOf). */
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

for (const mode of ['legacy', 'enforce']) {
  test('perm44 server (' + mode + '): roles + compiled grants saved together · mismatch refused atomically · log · check', async () => {
    const S = await world(mode), E = engine();
    const role = { id: 'TEST_ONLY_r_view', name: 'TEST_ONLY مشاهد الخطة', sys: { plan: { lvl: 'view' } } };
    const rec = { v: 1, roles: [role], people: { [EMP]: { role: role.id, ex: [] } } };
    const all = () => true, want = E.grantOf(rec.people[EMP], rec, all, Date.now(), null);
    assert.ok(want.plus.length > 0, 'plan·view has keys');
    const G0 = S.kv(KG) || { v: 1, emp: {} }, G = (e) => Object.assign({}, G0, { emp: Object.assign({}, G0.emp, e) });
    /* ② mismatch: the grants in the request are wider than the role */
    const bad = await S.save(S.sup, { [KR]: rec, [KG]: G({ [EMP]: { plus: want.plus.concat(E.keysFor('plan', 'full')), minus: [], src: want.src } }) });
    assert.ok(denied(bad)[KR] || denied(bad)[KG], 'mismatched grants refused: ' + JSON.stringify(bad.j).slice(0, 300));
    assert.equal(S.kv(KR), null, 'atomic: roles not written'); assert.deepEqual(S.kv(KG), G0.emp ? (S.kv(KG) && G0) : null, 'atomic: grants not written');
    /* roles alone (effective changes, no grants in the save) */
    const alone = await S.save(S.sup, { [KR]: rec });
    assert.ok(denied(alone)[KR], 'roles without their grants refused: ' + JSON.stringify(alone.j).slice(0, 300));
    /* ① together */
    const ok = await S.save(S.sup, { [KR]: rec, [KG]: G({ [EMP]: want }) });
    assert.equal(ok.status, 200); assert.deepEqual(denied(ok), {}, 'saved: ' + JSON.stringify(ok.j).slice(0, 300));
    assert.deepEqual(S.kv(KR), rec); assert.deepEqual(S.kv(KG).emp[EMP].plus, want.plus);
    const log = await S.get(S.sup, '/api/perm44/log?d=' + D);
    assert.equal(log.status, 200); const row = log.j.rows[0];
    assert.ok(row && row.unit === D && row.affected.includes(EMP) && row.changes.some((c) => c.what === 'role' && c.role === role.id) && row.changes.some((c) => c.what === 'person' && c.person === EMP && c.to === role.id), 'structured log row: ' + JSON.stringify(log.j).slice(0, 400));
    assert.ok(row.who && row.who.uid === S.sup.uid && row.id && row.at, 'who · id · at');
    /* ③ staff: not a manager */
    const rec2 = JSON.parse(JSON.stringify(rec)); rec2.roles[0].name = 'TEST_ONLY اسمٌ آخر';
    const st = await S.save(S.emp1, { [KR]: rec2 });
    assert.ok(denied(st)[KR] || st.status === 403, 'staff refused: ' + JSON.stringify(st.j).slice(0, 200));
    /* ③ the unit manager: a renamed role (no effective change) passes */
    const mg = await S.save(S.dm1, { [KR]: rec2 });
    assert.deepEqual(denied(mg), {}, 'manager renames a role: ' + JSON.stringify(mg.j).slice(0, 300));
    /* ③ the unit manager cannot grant himself */
    const self = JSON.parse(JSON.stringify(rec2)); self.people['mgr:' + D] = { role: role.id, ex: [] };
    const sg = E.grantOf(self.people['mgr:' + D], self, all, Date.now(), null);
    const sr = await S.save(S.dm1, { [KR]: self, [KG]: { v: 1, emp: Object.assign({}, S.kv(KG).emp, { ['mgr:' + D]: sg }) } });
    assert.ok(denied(sr)[KR] || denied(sr)[KG], 'self-grant refused: ' + JSON.stringify(sr.j).slice(0, 200));
    /* ③ a system outside the unit ceiling: switch «award» off for tst_d1, then the manager adds it to a role */
    const P = S.kv('bassam_perms_v1'); P.caps[D] = P.caps[D].filter((k) => k !== 'award');
    const keepR = S.kv(KR), keepG = S.kv(KG);
    const pc = await S.save(S.sup, { bassam_perms_v1: P }); assert.deepEqual(denied(pc), {}, 'ceiling narrowed');
    assert.deepEqual([S.kv(KR), S.kv(KG)], [keepR, keepG], 'switching a system off deletes no roles or grants');
    const off = JSON.parse(JSON.stringify(S.kv(KR))); off.roles[0].sys.award = { lvl: 'view' };
    const or = await S.save(S.dm1, { [KR]: off });
    assert.ok(denied(or)[KR], 'system outside the ceiling refused: ' + JSON.stringify(or.j).slice(0, 200));
    assert.equal(denied(or)[KR].why, 'cap');
    const lg2 = await S.get(S.sup, '/api/perm44/log?d=' + D);
    assert.ok(lg2.j.rows.some((r) => r.changes.some((c) => c.what === 'ceil.caps' && c.unit === D)), 'ceiling change logged for the unit');
    /* ④ access test */
    const k0 = want.plus[0], kFull = E.keysFor('plan', 'full').find((k) => !want.plus.includes(k));
    for (const who of [S.sup, S.dm1]) {
      let r = await S.get(who, '/api/perm44/check?d=' + D + '&role=' + role.id + '&key=' + encodeURIComponent(k0));
      assert.deepEqual([r.status, r.j.allow, r.j.why], [200, true, 'role']);
      r = await S.get(who, '/api/perm44/check?d=' + D + '&ekey=' + EMP + '&key=' + encodeURIComponent(kFull));
      assert.deepEqual([r.status, r.j.allow, r.j.why], [200, false, 'level']);
    }
    let r = await S.get(S.sup, '/api/perm44/check?d=' + D + '&ekey=' + EMP + '&key=award.view');
    assert.equal(r.j.allow, false); assert.ok(['ceiling', 'unknown-key', 'not-grantable'].includes(r.j.why), r.j.why);
    r = await S.get(S.emp1, '/api/perm44/check?d=' + D + '&role=' + role.id + '&key=' + encodeURIComponent(k0)); assert.equal(r.status, 403, 'staff: 403');
    r = await S.get(S.emp1, '/api/perm44/log?d=' + D); assert.equal(r.status, 403, 'staff: 403 (log)');
    r = await S.C.api('/api/perm44/check?d=' + D + '&role=x&key=y', { method: 'POST', cookie: S.sup.ck, body: {} }); assert.equal(r.status, 405, 'read-only');
  });
}

test('perm44 server (enforce): a temporary exception expires at decision time (until in the grant)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p44w-')), f = path.join(dir, 'w.mjs');
  fs.writeFileSync(f, fs.readFileSync(WORKER, 'utf8') + '\nexport { enfGrantOf };\n');
  const M = await import('file://' + f); fs.rmSync(dir, { recursive: true, force: true });
  const now = Date.now(), A = { u: { ekey: EMP }, __grants: { [D]: { emp: { [EMP]: { plus: ['plan.view', 'site.edit'], until: { 'plan.view': now - 1, 'site.edit': now + 60000 } } } } } };
  const g = M.enfGrantOf(A, D);
  assert.equal(g.plus['plan.view'], undefined, 'expired: not held');
  assert.equal(g.plus['site.edit'], 1, 'live: held');
});
