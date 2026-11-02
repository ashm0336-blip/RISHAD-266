/* RISHAD-266 · live privacy check on the TEST deployment only. Env (never the chat): KIVO_TEST_SUPER_UN/PW, KIVO_TEST_EMP_UN/PW,
   KIVO_TEST_EMP_EID (the employee's register eid), KIVO_TEST_DEPT (his unit id). Super grants the employee view of the monthly
   schedule and employee data, the employee reads the register: colleagues' nid/empno must be absent and working fields present,
   his own record full, boot without colleague nid, export refused, registry only his own entry. The grant is reverted in finally. */
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = (process.env.KIVO_TEST_BASE || 'https://test.kivo-d81.pages.dev').replace(/\/$/, ''); if (!/^(test|[0-9a-f]{8})\.kivo-d81\.pages\.dev$/.test(new URL(BASE).hostname)) { console.error('Test only'); process.exit(2); }
const C = { EMP: { un: process.env.KIVO_TEST_EMP_UN, pw: process.env.KIVO_TEST_EMP_PW }, eid: process.env.KIVO_TEST_EMP_EID }; const D = process.env.KIVO_TEST_DEPT, KP = 'bassam_perms_v1', KE = 'bsdept:' + D + ':bassam_employees_v1';
const out = (id, pass, d) => console.log(JSON.stringify({ id, pass: !!pass, d }));
async function sess(b, un, pw) { const p = await (await b.newContext()).newPage(); await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const api = (u, o) => p.evaluate(async ([u, o]) => { const r = await fetch(u, Object.assign({ headers: { 'Content-Type': 'application/json' } }, o || {})); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; }, [u, o || null]);
  const l = await api('/api/login', { method: 'POST', body: JSON.stringify({ u: un, p: pw }) }); return { p, api, l }; }
async function put(s, k, v) { const g = await s.api('/api/get?keys=' + k); const body = { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: g.j.keys[k].rev } }; if (g.j.pscope !== undefined) body.pscope = g.j.pscope; return s.api('/api/save', { method: 'POST', body: JSON.stringify(body) }); }
(async () => {
  const b = await chromium.launch();
  const su = await sess(b, process.env.KIVO_TEST_SUPER_UN, process.env.KIVO_TEST_SUPER_PW);
  const P0 = JSON.parse((await su.api('/api/get?keys=' + KP)).j.keys[KP].v);
  const colleague = (await su.api('/api/operations/read?keys=' + encodeURIComponent(KE))).j.resources[KE].find((e) => e.eid !== C.eid && e.nid);
  const P1 = JSON.parse(JSON.stringify(P0)); P1.caps = P1.caps || {}; const capsBefore = P1.caps[D];
  P1.caps[D] = Array.from(new Set([].concat(Array.isArray(capsBefore) ? capsBefore : [], ['staff', 'emps']))); P1.emps = P1.emps || {}; P1.emps[D] = P1.emps[D] || {}; P1.emps[D][C.eid] = { staff: ['view'], 'emps/data': ['view'] };
  const g1 = await put(su, KP, P1); out('SUPER:grant-employee-view', g1.j && g1.j.revs && g1.j.revs[KP], JSON.stringify(g1.j).slice(0, 160));
  try {
    const em = await sess(b, C.EMP.un, C.EMP.pw);
    const r = await em.api('/api/operations/read?keys=' + encodeURIComponent(KE) + ',' + encodeURIComponent('bsdept:' + D + ':bassam_staffing_v3'));
    const E = ((r.j || {}).resources || {})[KE] || []; const col = E.find((e) => e.eid === colleague.eid); const me = E.find((e) => e.eid === C.eid);
    const blob = JSON.stringify(r.j || {});
    out('EMP:reads-register', r.s === 200 && E.length >= 2, { status: r.s, n: E.length, denied: (r.j || {}).denied });
    out('EMP:colleague-nid-hidden', col && !col.nid && !blob.includes(colleague.nid), { hasNid: !!(col && col.nid) });
    out('EMP:colleague-empno-hidden', col && !col.empno && !blob.includes(colleague.empno), { hasEmpno: !!(col && col.empno) });
    out('EMP:colleague-working-fields-kept', col && col.name && col.eid, col && Object.keys(col));
    out('EMP:own-record-full', me && me.nid === C.EMP.un && me.empno === C.EMP.pw, me && { hasNid: !!me.nid });
    const boot = await em.p.evaluate(async () => (await (await fetch('/', { headers: { accept: 'text/html' } })).text()));
    out('EMP:boot-no-colleague-nid', !boot.includes(colleague.nid), {});
    const ex = await em.api('/api/operations/export?dept=' + D); out('EMP:export-refused', ex.s === 403 || (ex.j && ex.j.ok === 0), ex.s);
    const reg = await em.api('/api/get?keys=' + KP); const pv = reg.j.keys[KP] ? JSON.parse(reg.j.keys[KP].v) : {}; out('EMP:registry-only-own', Object.keys((pv.emps || {})[D] || {}).every((k) => k === C.eid), Object.keys((pv.emps || {})[D] || {}));
  } finally {
    const P2 = JSON.parse((await su.api('/api/get?keys=' + KP)).j.keys[KP].v); delete P2.emps[D][C.eid]; if (capsBefore === undefined) delete P2.caps[D]; else P2.caps[D] = capsBefore;
    const g2 = await put(su, KP, P2); const P3 = JSON.parse((await su.api('/api/get?keys=' + KP)).j.keys[KP].v);
    out('SUPER:grant-reverted', g2.j && g2.j.revs && JSON.stringify(P3.caps[D]) === JSON.stringify(capsBefore) && !(P3.emps[D] || {})[C.eid], {});
  }
  await b.close();
})();
