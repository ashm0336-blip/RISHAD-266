/* RISHAD-266 · live check on the TEST deployment only: independent ceilings (narrow hides, widen restores, latent loss refused)
   and sections (department manager creates a TEST_ONLY section under his department; isolation from the department's staff).
   Env (never the chat): KIVO_TEST_SUPER_UN/PW, KIVO_TEST_MGR_UN/PW, KIVO_TEST_EMP_UN/PW, KIVO_TEST_EMP_EID, KIVO_TEST_DEPT.
   Leaves behind only the TEST_ONLY section (no deletion is performed); every permission change is reverted in finally. */
const { chromium } = require('playwright');
const BASE = (process.env.KIVO_TEST_BASE || 'https://test.kivo-d81.pages.dev').replace(/\/$/, '');
if (!/^(test|[0-9a-f]{8})\.kivo-d81\.pages\.dev$/.test(new URL(BASE).hostname)) { console.error('Test only'); process.exit(2); }
const E = process.env, D = E.KIVO_TEST_DEPT, EID = E.KIVO_TEST_EMP_EID, KP = 'bassam_perms_v1', KD = 'bassam_depts_v1';
const res = []; const out = (id, pass, d) => { res.push(!!pass); console.log(JSON.stringify({ id, pass: !!pass, d })); };
async function sess(b, un, pw) { const p = await (await b.newContext()).newPage(); await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const api = (u, o) => p.evaluate(async ([u, o]) => { const r = await fetch(u, Object.assign({ headers: { 'Content-Type': 'application/json' } }, o || {})); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; }, [u, o || null]);
  await api('/api/login', { method: 'POST', body: JSON.stringify({ u: un, p: pw }) }); return { p, api }; }
const getv = async (s, k) => { const g = await s.api('/api/get?keys=' + k); return { g, v: g.j.keys[k] ? JSON.parse(g.j.keys[k].v) : null }; };
async function put(s, k, v) { const { g } = await getv(s, k); const body = { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: (g.j.keys[k] || {}).rev || 0 } }; if (g.j.pscope !== undefined) body.pscope = g.j.pscope; if (g.j.uscope !== undefined) body.uscope = g.j.uscope;
  const r = await s.api('/api/save', { method: 'POST', body: JSON.stringify(body) }); const d = ((r.j || {}).denied || {})[k] || ((r.j || {}).conflicts || {})[k]; return { ok: !!(r.j && r.j.revs && r.j.revs[k]), why: d ? d.why : '', detail: d ? String(d.detail || '').slice(0, 160) : '' }; }
const authz = async (s) => JSON.stringify((await s.api('/api/authz')).j || {});
(async () => {
  const b = await chromium.launch();
  const su = await sess(b, E.KIVO_TEST_SUPER_UN, E.KIVO_TEST_SUPER_PW), mg = await sess(b, E.KIVO_TEST_MGR_UN, E.KIVO_TEST_MGR_PW), em = await sess(b, E.KIVO_TEST_EMP_UN, E.KIVO_TEST_EMP_PW);
  const P0 = (await getv(su, KP)).v, caps0 = (P0.caps || {})[D];
  try {
    /* ── ceilings ── */
    const P1 = JSON.parse(JSON.stringify(P0)); P1.caps = P1.caps || {}; P1.caps[D] = Array.from(new Set([].concat(Array.isArray(caps0) ? caps0 : [], ['staff', 'emps', 'emps/data'])));
    P1.emps = P1.emps || {}; P1.emps[D] = P1.emps[D] || {}; P1.emps[D][EID] = { staff: ['view'], 'emps/data': ['view'] };
    out('SUPER:grant', (await put(su, KP, P1)).ok, {});
    const a1 = await authz(em);
    const P2 = (await getv(su, KP)).v; P2.caps[D] = P2.caps[D].filter((x) => x !== 'emps/data' && x !== 'emps');
    out('SUPER:narrow-ceiling', (await put(su, KP, P2)).ok, {});
    const P3 = (await getv(su, KP)).v;
    out('narrow:sheet-kept-stored', JSON.stringify(P3.emps[D][EID]) === JSON.stringify({ staff: ['view'], 'emps/data': ['view'] }), P3.emps[D][EID]);
    const a2 = await authz(em);
    out('narrow:employee-access-changed', a1 !== a2, { before: a1.length, after: a2.length });
    const PM = (await getv(mg, KP)).v; if (PM && PM.emps && PM.emps[D] && PM.emps[D][EID]) { PM.emps[D][EID] = { staff: ['view'] };
      const r = await put(mg, KP, PM); out('MGR:latent-loss-refused', !r.ok, r); } else out('MGR:latent-loss-refused', false, 'manager did not receive the sheet');
    out('latent:still-stored', JSON.stringify((await getv(su, KP)).v.emps[D][EID]) === JSON.stringify({ staff: ['view'], 'emps/data': ['view'] }), {});
    const P4 = (await getv(su, KP)).v; P4.caps[D] = Array.from(new Set(P4.caps[D].concat(['emps', 'emps/data'])));
    out('SUPER:widen-ceiling', (await put(su, KP, P4)).ok, {});
    out('widen:employee-access-restored', (await authz(em)) === a1, {});
    /* ── sections ── */
    const DR = (await getv(mg, KD)).v; const name = 'TEST_ONLY_CLAUDE_SEC_' + Date.now().toString(36);
    const sec = { id: 's' + Date.now().toString(36) + 'q', name, gid: D, kind: 'قسم' };
    const rs = await put(mg, KD, DR.concat([sec])); out('MGR:create-section', rs.ok, rs);
    if (rs.ok) {
      out('MGR:section-in-scope', (await authz(mg)).includes(sec.id), {});
      const ro = await em.api('/api/operations/read?keys=' + encodeURIComponent('bsdept:' + sec.id + ':bassam_employees_v1'));
      out('EMP:section-data-isolated', ro.s !== 200 || ((ro.j || {}).denied || []).length === 1, { s: ro.s, denied: (ro.j || {}).denied });
      const bad = (await getv(mg, KD)).v.concat([{ id: 'sx' + Date.now().toString(36), name: name + '_child', gid: sec.id, kind: 'قسم' }]);
      const rb = await put(mg, KD, bad); out('MGR:no-section-under-section', !rb.ok, rb);
    }
  } catch (e) { out('run', false, String(e && e.stack || e).slice(0, 300)); }
  finally {
    const P9 = (await getv(su, KP)).v; if (P9.emps && P9.emps[D]) delete P9.emps[D][EID]; if (caps0 === undefined) delete P9.caps[D]; else P9.caps[D] = caps0;
    const r9 = await put(su, KP, P9); const PZ = (await getv(su, KP)).v;
    out('SUPER:reverted', r9.ok && JSON.stringify(PZ.caps[D]) === JSON.stringify(caps0) && !((PZ.emps || {})[D] || {})[EID], r9);
  }
  await b.close(); const f = res.filter((x) => !x).length; console.log(JSON.stringify({ summary: { total: res.length, failed: f } })); process.exit(f ? 1 : 0);
})();
