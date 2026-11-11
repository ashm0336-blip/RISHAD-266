/* RISHAD V7 P3-sec — «المسنَد فقط» للراصد أياً كان مصدرُ المنح (real worker, TEST_ONLY fixture world, legacy and enforce).
   D-19: field.view gives its holder lens.zones/gates/marks.status.change on the elements ASSIGNED to him only. The confinement was
   computed from the stored sheet alone (018 dailyFieldOnly): a holder whose field.view came from an explicit grant (the key-level
   editor, no sheet) together with a view of «الجولات اليومية» or «التشغيل الميداني» was treated as an unrestricted supervisor and
   could write the status of elements NOT assigned to him (found in the V7 P3 live acceptance; reproduced here first, on 8b3b161).
   The rule: status keys derived from field.view stay confined to assigned elements whatever the source of the grant and whatever
   other VIEW keys are held; the confinement lifts only for an explicit, non-derived write on the rounds or their lenses, as for a
   supervisor today. A stored sheet, a supervisor and a unit manager behave exactly as before.
   Each cell compares what is actually stored before and after the attempt — not a key name. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { world, stored, replaceOperationalFixture, operationSaveBody } from './tasks_fx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const D = 'tst_d1', KR = 'bsdept:' + D + ':bassam_rounds_v1', KP = 'bassam_perms_v1', KG = 'bsdept:' + D + ':bassam_grants_v1', OBS = 'tst_e_field';
const isDay = (k) => /^\d+-\d+-\d+$/.test(k);
const put = (DB, k, v) => { DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k); DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, JSON.stringify(v)); DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET rev = rev + 1').run(k); };
const readKV = (DB, k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((r) => r.v).join('') || 'null');
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/permissions/registry/registry-v24.9.json'), 'utf8')).registry;
const DER = ['lens.zones.status.change', 'lens.gates.status.change', 'lens.marks.status.change'];
/* what «تحديد الكل» of the P3 editor grants: the first view key of every page and lens, plus the keys derived from field.view */
const VIEWS = (() => { const seen = {}, out = []; REG.forEach((e) => { if (e.status !== 'active' || e.grant !== 'assignable' || e.ownerKind === 'platform' || e.ownerKind === 'reference' || seen[e.owner]) return; if (e.type === 'access' || e.type === 'view') { seen[e.owner] = 1; out.push(e.key); } }); return out; })();
const ACC = { obs: ['0000000118', '70118', 'tst_fld'], sup: ['0000000111', '70111', 'tst_sup1'], mgr: ['0000000101', '70101', 'tst_dm1'] };
const COLS = ['zones', 'marks', 'gates'];

/* one world per case; in every site-0 collection: element 0 assigned to the observer, and one element assigned to nobody */
async function run(mode, who, setup) {
  const w = await world({ mode }), DB = w.env.DB;
  const raw = stored(w.env, KR), day = Object.keys(raw).find(isDay), f0 = raw[day].d[0];
  for (const c of COLS) {
    const L = f0[c] = Array.isArray(f0[c]) ? f0[c] : []; assert.ok(L.length, 'fixture has ' + c);
    L[0].emp = [OBS];
    const free = JSON.parse(JSON.stringify(L[0])); free.emp = []; for (const k of ['uid', 'id', 'code', 'ser', 'label', 'num', 'name']) if (free[k] != null) free[k] = String(free[k]) + '_TEST_ONLY_FREE'; if (free.gid != null) free.gid = String(free.gid) + '_F';
    for (const k of ['fst', 'closed', 'cWhy', 'fAt', 'fBy']) delete free[k];
    L.push(free);
  }
  await replaceOperationalFixture(w.env, KR, raw);
  const P = readKV(DB, KP); P.emps = P.emps || {}; P.emps[D] = P.emps[D] || {};
  await setup({ P, sheet: (s) => { if (s === null) delete P.emps[D][OBS]; else P.emps[D][OBS] = s; }, grant: (plus) => put(DB, KG, { v: 1, emp: { [OBS]: { plus, minus: [], at: 1, by: 'TEST_ONLY' } } }) });
  put(DB, KP, P);
  const [un, pw, uid] = ACC[who], ck = (await w.login(un, pw)).ck, out = {};
  const attempt = async (name, edit) => {
    const g = await w.C.api('/api/operations/read?' + new URLSearchParams({ uid, keys: KR }), { cookie: ck });
    const v = g.status === 200 && g.j.resources ? g.j.resources[KR] : null; if (!v || !v[day]) { out[name] = 'unreadable'; return; }
    const before = JSON.stringify(stored(w.env, KR)[day]); if (edit(v[day].d[0]) === false) { out[name] = 'hidden'; return; }
    await w.C.api('/api/save', { method: 'POST', cookie: ck, body: operationSaveBody(w.env, '/api/save', { uid, set: { [KR]: JSON.stringify(v) }, del: [], base: { [KR]: g.j.base[KR] } }) });
    out[name] = JSON.stringify(stored(w.env, KR)[day]) !== before ? 'W' : '-';
  };
  const last = (L) => L[L.length - 1];
  for (const c of COLS) {
    await attempt(c + '.assigned', (f) => { Object.assign(f[c][0], { fst: 'closed', closed: true, cWhy: 'TEST_ONLY a ' + c }); });
    await attempt(c + '.free', (f) => { const e = last(f[c]); if (!e) return false; Object.assign(e, { fst: 'closed', closed: true, cWhy: 'TEST_ONLY b ' + c }); });
  }
  await attempt('name', (f) => { f.zones[0].name = 'TEST_ONLY renamed'; });
  await attempt('assign', (f) => { f.zones[0].emp = (f.zones[0].emp || []).concat(['tst_e_emp1']); });
  return out;
}
const CONFINED = { 'zones.assigned': 'W', 'zones.free': '-', 'marks.assigned': 'W', 'marks.free': '-', 'gates.assigned': 'W', 'gates.free': '-', name: '-', assign: '-' };
const FREE = { 'zones.assigned': 'W', 'zones.free': 'W', 'marks.assigned': 'W', 'marks.free': 'W', 'gates.assigned': 'W', 'gates.free': 'W' };
const status = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => /\.(assigned|free)$/.test(k)));

const ENFORCE = [
  ['a stored sheet only — «رصد الميدان: عرض»', 'obs', (x) => x.sheet({ 'daily/field': ['view'] }), CONFINED],
  ['explicit grant: field.view alone', 'obs', (x) => { x.sheet(null); x.grant(['field.view'].concat(DER)); }, CONFINED],
  ['explicit grant: field.view + view of «الجولات اليومية»', 'obs', (x) => { x.sheet(null); x.grant(['field.view', 'round.view'].concat(DER)); }, CONFINED],
  ['explicit grant: field.view + view of «التشغيل الميداني»', 'obs', (x) => { x.sheet(null); x.grant(['field.view', 'plan.view'].concat(DER)); }, CONFINED],
  ['«تحديد الكل» of the editor — every view key', 'obs', (x) => { x.sheet(null); x.grant(VIEWS.concat(DER)); }, CONFINED],
];
for (const [label, who, setup, want] of ENFORCE) test('[enforce] ' + label + ': writes the status of assigned elements only', async () => {
  assert.deepEqual(await run('enforce', who, setup), want);
});
test('[enforce] an explicit, non-derived write lifts the confinement — as a supervisor today', async () => {
  /* a stored supervisor sheet (unchanged) */
  const s = await run('enforce', 'obs', (x) => x.sheet({ 'daily/field': ['view'], 'daily/rounds': ['view', 'edit'] }));
  assert.deepEqual(status(s), FREE, 'sheet with a write on «الجولات»'); assert.equal(s.name, 'W'); assert.equal(s.assign, 'W');
  /* the same by explicit grant: round.edit is an explicit write */
  const g = await run('enforce', 'obs', (x) => { x.sheet(null); x.grant(['field.view', 'round.view', 'round.edit'].concat(DER)); });
  assert.deepEqual(status(g), FREE, 'explicit grant with round.edit');
  /* a view of everything plus one explicit lens write */
  const l = await run('enforce', 'obs', (x) => { x.sheet(null); x.grant(VIEWS.concat(DER, ['lens.zones.data.edit'])); });
  assert.deepEqual(status(l), FREE, 'explicit grant with a lens write');
});
test('[enforce] the fixture supervisor and the unit manager: unchanged', async () => {
  const sup = await run('enforce', 'sup', () => {}), mgr = await run('enforce', 'mgr', () => {});
  assert.deepEqual(status(mgr), FREE, 'unit manager'); assert.equal(mgr.name, 'W'); assert.equal(mgr.assign, 'W');
  assert.deepEqual(sup, PIN.sup, 'supervisor (pinned as measured on 8b3b161)');
});
test('[legacy] the stored sheet decides, as before (explicit grants are not read in legacy)', async () => {
  assert.deepEqual(await run('legacy', 'obs', (x) => x.sheet({ 'daily/field': ['view'] })), CONFINED, 'observer');
  assert.deepEqual(await run('legacy', 'obs', (x) => x.sheet({ 'daily/field': ['view'], 'daily/rounds': ['view'] })), CONFINED, 'observer + view of the rounds');
  const s = await run('legacy', 'obs', (x) => x.sheet({ 'daily/field': ['view'], 'daily/rounds': ['view', 'edit'] }));
  assert.deepEqual(status(s), FREE, 'a write on the rounds lifts it');
  assert.deepEqual(status(await run('legacy', 'mgr', () => {})), FREE, 'unit manager');
  assert.deepEqual(await run('legacy', 'obs', (x) => { x.sheet(null); x.grant(VIEWS.concat(DER)); }), PIN.legacyGrant, 'a grant record alone gives nothing in legacy');
});
/* measured on 8b3b161 before the fix and unchanged by it */
const PIN = {
  sup: { 'zones.assigned': 'W', 'zones.free': 'W', 'marks.assigned': 'W', 'marks.free': 'W', 'gates.assigned': 'W', 'gates.free': 'W', name: 'W', assign: 'W' },
  legacyGrant: { 'zones.assigned': 'unreadable', 'zones.free': 'unreadable', 'marks.assigned': 'unreadable', 'marks.free': 'unreadable', 'gates.assigned': 'unreadable', 'gates.free': 'unreadable', name: 'unreadable', assign: 'unreadable' },
};
