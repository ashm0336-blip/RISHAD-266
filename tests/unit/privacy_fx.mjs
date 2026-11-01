/* PRIVACY batch (SV09 · IP07 · IP10 · IP39 · SV01) — shared synthetic world for tests/unit/privacy_*.test.mjs (TEST_ONLY data only).
   Built on tasks_fx.world({mode}) (gen_fixture + 17 employees + typed operational storage), in 'legacy' and 'enforce' modes.
   PII is synthetic: 199999920N national ids, 059999920N phones, @example.test e-mails; the P0 employees' empno is their initial password. */
import { world, stored, putKV, replaceOperationalFixture, operationSaveBody } from './tasks_fx.mjs';
import { isOperationalFixtureKey } from './operational_legacy_seed_fx.mjs';
export { stored };
export const D = 'tst_d1';
export const KE = 'bsdept:tst_d1:bassam_employees_v1', KDR = 'bsdept:tst_d1:bassam_dreport_v1', KP = 'bassam_perms_v1', KG1 = 'bsdept:tst_d1:bassam_grants_v1';
export const ACC = {
  dm1: ['0000000101', '70101'], gm1: ['0000000103', '70103'], sup1: ['0000000111', '70111'], emp1: ['0000000113', '70113'], emp2: ['0000000121', '70121'],
  p0e1: ['2000000201', '70201'], p0e3: ['2000000203', '70203'],
};
export const PII = (n) => ({ nid: '19999992' + String(n).padStart(2, '0'), phone: '05999992' + String(n).padStart(2, '0'), email: 'tst_p0_' + n + '@example.test', gender: 'ذكر' });
export const PERSONAL = ['nid', 'phone', 'email', 'empno'];
export async function put(w, k, v) { return isOperationalFixtureKey(w.env, k) ? replaceOperationalFixture(w.env, k, v) : putKV(w.env, k, v); }
/* the world + synthetic PII on tst_e_p0_3 and tst_e_p0_1 + an empno copy on one roster row of today's report */
export async function privWorld(mode) {
  const w = await world({ mode });
  const E = stored(w.env, KE);
  Object.assign(E.find(e => e.eid === 'tst_e_p0_3'), PII(3));
  Object.assign(E.find(e => e.eid === 'tst_e_p0_1'), PII(1));
  await put(w, KE, E);
  const R = stored(w.env, KDR);
  for (const dk of Object.keys(R)) {
    const day = R[dk]; if (!day || !day.shifts) continue;
    for (const sh of Object.keys(day.shifts)) {
      const ro = day.shifts[sh].roster; if (!Array.isArray(ro) || !ro.length) continue;
      const r0 = ro.find(r => r && r.ekey && !['tst_e_sup1', 'tst_e_emp1', 'tst_e_supB'].includes(r.ekey));   /* a colleague of every reader below */
      if (!w.drRow && r0) { r0.empno = '70999'; w.drRow = { dk, sh, ekey: r0.ekey }; }
    }
  }
  if (!w.drRow) throw new Error('fixture: no report roster row to seed');
  await put(w, KDR, R);
  return w;
}
/* give tst_emp1 (or another fixture employee) exactly one sheet, no explicit grants */
export function setSheet(w, ek, sheet, d = D) {
  const p = JSON.parse(JSON.stringify(stored(w.env, KP))); p.emps[d] = p.emps[d] || {}; p.emps[d][ek] = sheet; putKV(w.env, KP, p);
  const kg = 'bsdept:' + d + ':bassam_grants_v1', g = stored(w.env, kg); if (g && g.emp && g.emp[ek]) { delete g.emp[ek]; putKV(w.env, kg, g); }
}
export async function login(w, who) { return (await w.login(ACC[who][0], ACC[who][1])).ck; }
export async function suCk(w) { return w.su.ck || (await w.C.login('0501234567', '583927')).ck; }
export async function readOp(w, ck, keys) {
  const r = await w.C.api('/api/operations/read?keys=' + encodeURIComponent([].concat(keys).join(',')), { cookie: ck });
  return { status: r.status, j: r.j, res: (r.j && r.j.resources) || {}, base: (r.j && r.j.base) || {}, denied: (r.j && r.j.denied) || [] };
}
export async function getKV(w, ck, keys) {
  const r = await w.C.api('/api/get?keys=' + encodeURIComponent([].concat(keys).join(',')), { cookie: ck });
  return { status: r.status, j: r.j, keys: (r.j && r.j.keys) || {} };
}
export async function save(w, ck, set, base) {
  const body = operationSaveBody(w.env, '/api/save', { set, del: [], base });
  const r = await w.C.api('/api/save', { method: 'POST', cookie: ck, body });
  return { status: r.status, j: r.j };
}
export const rec = (list, eid) => (Array.isArray(list) ? list : []).find(e => e && e.eid === eid);
export const drRow = (doc, w) => ((((doc || {})[w.drRow.dk] || {}).shifts || {})[w.drRow.sh] || { roster: [] }).roster.find(r => r.ekey === w.drRow.ekey);
export const MODES = ['legacy', 'enforce'];
