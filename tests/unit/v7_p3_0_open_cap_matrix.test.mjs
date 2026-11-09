/* RISHAD V7 P3-0 · step 2 — the unit-ceiling matrix for a unit manager WITHOUT a permission sheet (real worker, legacy and enforce,
   TEST_ONLY data). Three units under one general node: OPEN (no cap record anywhere in its chain), FULL (an explicit record of every
   page) and BASIC (an explicit «أساسي» record). The client treats OPEN exactly as FULL (331 deptCap = all pages; capAllPerms), so
   every case where the server answers OPEN differently from FULL is a client/server mismatch.
   Recorded before any change (V7 P3-0):
     · reads (KV · operational · scope routes) and writes (KV · operational): OPEN = FULL in both modes;
     · BASIC refuses what is outside it (plan · rounds · daily report · irshad · seized) — the ceiling is enforced by the server;
     · enforce: OPEN = FULL everywhere;
     · legacy — the ONLY divergence: the «tech» rule resources and a new image upload are refused in OPEN. They go through writePages /
       anyWriter (018), where «no implicit write without the unit's own record» (owner decision on aae024c); authorize0 (042) and the
       enforce engine do not apply that rule. Pinned here as current behaviour so that any change is deliberate; not changed in P3-0. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, TEST_SUPER_PIN } from './harness.mjs';
import { internals } from './internals.mjs';
const { PG_KEYS } = await internals(['PG_KEYS']);
const KG = 'bassam_gdepts_v1', KD = 'bassam_depts_v1', KU = 'bassam_auth_users_v1', KP = 'bassam_perms_v1';
const put = (DB, k, v) => { DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k); DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, JSON.stringify(v)); DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET rev = rev + 1').run(k); };
const read = (DB, k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((r) => r.v).join('') || 'null');
const BASIC = ['emps', 'tasks', 'planning', 'staff', 'links', 'help', 'admin'];
const UNITS = { OPEN: null, FULL: PG_KEYS.slice(), BASIC };
const KV = [['bassam_perm_tpls_named_v1', 'admin/ptpls', '[]'], ['bassam_last_export_v1', 'admin/backup', '{"t":1}'], ['bassam_profile_v1', 'tech rule', '{}'], ['bassam_first_boot_v1', 'tech rule', '{"t":1}']];
async function matrix(mode) {
  const out = {};
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}), DB = env.DB;
  if (mode === 'enforce') DB.exec("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  put(DB, KG, [{ id: 'TEST_ONLY_G', name: 'G', kind: 'إدارة عامة' }]);
  put(DB, KD, Object.keys(UNITS).map((u) => ({ id: 'TEST_ONLY_' + u, name: u, gid: 'TEST_ONLY_G' })));
  const P = read(DB, KP) || {}; P.caps = {}; for (const [u, c] of Object.entries(UNITS)) if (c) P.caps['TEST_ONLY_' + u] = c; put(DB, KP, P);
  const U = read(DB, KU), ph = U.find((x) => x.role === 'super').ph;
  Object.keys(UNITS).forEach((u, i) => U.push({ id: 'TEST_ONLY_m' + u, un: '10996000' + (10 + i), name: 'm' + u, role: 'staff', deptId: 'TEST_ONLY_' + u, ekey: 'mgr:TEST_ONLY_' + u, mgr: true, ph, mc: 0, dis: 0 }));
  put(DB, KU, U);
  for (const u of Object.keys(UNITS)) for (const [k, , v] of KV) put(DB, 'bsdept:TEST_ONLY_' + u + ':' + k, JSON.parse(v));
  const C = client(env);
  for (const [i, u] of Object.keys(UNITS).entries()) {
    const d = 'TEST_ONLY_' + u, L = await C.login('10996000' + (10 + i), TEST_SUPER_PIN); assert.ok(L.ok, 'manager of ' + u + ' signs in');
    const row = (name, v) => { (out[name] = out[name] || {})[u] = v; };
    for (const [k, page, v] of KV) {
      const key = 'bsdept:' + d + ':' + k;
      const g = await C.api('/api/get?keys=' + encodeURIComponent(key), { cookie: L.ck }); const e = g.j && g.j.keys && g.j.keys[key];
      row('read ' + k + ' (' + page + ')', g.status !== 200 ? 'HTTP ' + g.status : e && e.v != null ? 'yes' : e && e.moved ? 'moved' : 'no');
      const w = await C.save(L.ck, { [key]: v }); const dn = w.j && w.j.denied && w.j.denied[key];
      row('write ' + k + ' (' + page + ')', w.status !== 200 ? 'HTTP ' + w.status : dn ? 'no:' + dn.why : 'yes');
    }
    for (const [label, path] of [['ops read plan (plan)', '/api/operations/read?keys=' + encodeURIComponent('bsdept:' + d + ':bassam_plan_v1')], ['ops read tasks (tasks)', '/api/operations/read?keys=' + encodeURIComponent('bsdept:' + d + ':bassam_tasks_v1')],
      ['ops read rounds (daily/rounds)', '/api/operations/read?keys=' + encodeURIComponent('bsdept:' + d + ':bassam_rounds_v1')], ['ops read dreport (dreport)', '/api/operations/read?keys=' + encodeURIComponent('bsdept:' + d + ':bassam_dreport_v1')], ['ops read options (emps/data)', '/api/operations/read?keys=' + encodeURIComponent('bsdept:' + d + ':bassam_options_v1')], ['irshad read (irshad)', '/api/irshad?dept=' + d], ['seized read (seized)', '/api/seized?dept=' + d], ['custody read (emps/custody)', '/api/custody?dept=' + d], ['me/tasks', '/api/me/tasks']]) {
      const r = await C.api(path, { cookie: L.ck }); let v = 'HTTP ' + r.status;
      if (r.status === 200 && label.startsWith('ops')) { v = (r.j.denied || []).length ? 'no:denied' : (Object.keys(r.j.resources || {}).length || (r.j.absent || []).length) ? 'yes' : JSON.stringify(r.j).slice(0, 60); }
      else if (r.status === 200) v = r.j && (r.j.ok === 1 || r.j.ok === true) ? 'yes' : 'no:' + JSON.stringify(r.j).slice(0, 50);
      else v += ':' + ((r.j && (r.j.err || r.j.why)) || '');
      row(label, v);
    }
    for (const [k, page] of [['bassam_options_v1', 'emps/data'], ['bassam_zone_opts_v1', 'plan'], ['bassam_dayfocus_v1', 'daily/rounds|dreport']]) {
      const key = 'bsdept:' + d + ':' + k; let res = '';
      for (const val of ['{}', '[]']) {
        const rd = await C.api('/api/operations/read?keys=' + encodeURIComponent(key), { cookie: L.ck }); const base = (rd.j && rd.j.base && rd.j.base[key]) || 0;
        const w = await C.api('/api/save', { method: 'POST', cookie: L.ck, body: { requestId: 'TESTONLYreq' + Math.random().toString(36).slice(2, 12), epoch: (rd.j && rd.j.epoch) || 0, set: { [key]: val }, del: [], base: { [key]: base } } });
        const dn = w.j && w.j.denied && w.j.denied[key];
        res = w.status === 200 ? 'yes' : dn ? 'no:' + dn.why : 'HTTP ' + w.status + ':' + ((w.j && (w.j.err || JSON.stringify(w.j.denied || w.j.conflicts || '').slice(0, 40))) || '');
        if (!/container|type|shape|invalid/.test(res)) break;
      }
      row('ops write ' + k + ' (' + page + ')', res);
    }
    const ik = 'bsdept:' + d + ':img_TEST_ONLY_' + mode;
    const ir = await C.api('/api/img/' + encodeURIComponent(ik), { cookie: L.ck, method: 'PUT', body: 'data:image/png;base64,iVBORw0KGgo=', headers: { 'Content-Type': 'text/plain' } });
    row('image upload (new, dept)', ir.status === 200 ? 'yes' : 'HTTP ' + ir.status + ':' + ((ir.j && (ir.j.why || ir.j.err)) || ''));
  }
  return out;
}

const OUTSIDE_BASIC = ['ops read plan (plan)', 'ops read rounds (daily/rounds)', 'ops read dreport (dreport)', 'irshad read (irshad)', 'seized read (seized)', 'ops write bassam_zone_opts_v1 (plan)', 'ops write bassam_dayfocus_v1 (daily/rounds|dreport)'];
const LEGACY_GAP = ['write bassam_profile_v1 (tech rule)', 'write bassam_first_boot_v1 (tech rule)', 'image upload (new, dept)'];
for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] a manager without a sheet: OPEN (no cap record) is served like FULL (every page) — except the documented legacy gap', { timeout: 300000 }, async () => {
    const out = await matrix(mode);
    for (const [k, v] of Object.entries(out)) {
      if (mode === 'legacy' && LEGACY_GAP.includes(k)) {
        assert.equal(v.FULL, 'yes', k + ': FULL allows');
        assert.notEqual(v.OPEN, 'yes', k + ': OPEN is refused in legacy (writePages/anyWriter — no implicit write without the unit record)');
        continue;
      }
      assert.equal(v.OPEN, v.FULL, k + ': OPEN = FULL · ' + JSON.stringify(v));
      assert.equal(v.FULL, 'yes', k + ': FULL allows · ' + JSON.stringify(v));
      if (OUTSIDE_BASIC.includes(k)) assert.notEqual(v.BASIC, 'yes', k + ': refused outside «أساسي»');
      else assert.equal(v.BASIC, 'yes', k + ': allowed inside «أساسي» · ' + JSON.stringify(v));
    }
    assert.ok(Object.keys(out).length >= 20, 'the matrix covers ' + Object.keys(out).length + ' cases');
  });
}
