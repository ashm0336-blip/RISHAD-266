/* RISHAD-266 · isolated browser lab: the real built worker (pk265/_worker.js or KIVO_WORKER) over an in-memory SQLite D1 shim,
   assets served from the built package (KIVO_DIST), TEST_ONLY accounts and departments only. No network, no Test/Production.
   Usage (module): const lab = await startLab({ port }); … lab.env.DB.q(sql) for server-side verification; await lab.close();
   Accounts: super (TEST_SUPER_USERNAME / TEST_SUPER_PIN from the harness), mgrA / mgrB (department managers), empA (employee),
   all with password LAB_PW. Departments: TEST_ONLY_A, TEST_ONLY_B under group TEST_ONLY_G; section TEST_ONLY_A_S1 under A. */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeTestEnv, WORKER, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from '../unit/harness.mjs';
import { installOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';
import { makeSql } from '../../tools/provision_first_admin.mjs';

export const LAB_PW = '246813';
export const LAB = { superUn: TEST_SUPER_USERNAME, superPw: TEST_SUPER_PIN, pw: LAB_PW, mgrA: '1100000001', mgrB: '1100000002', empA: '1200000001', dmA: '1300000001' };
const hashOf = (pw) => { const m = /"ph":"(p2\$[^"]+)"/.exec(makeSql({ username: '1999999999', name: 'x', password: pw })); if (!m) throw Error('hash'); return m[1]; };

async function loadWorker() {
  const src = fs.readFileSync(process.env.KIVO_WORKER || WORKER, 'utf8');
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'lab-')), f = path.join(dir, 'w.mjs');
  fs.writeFileSync(f, src + '\nexport { initDb, kvPutStmts, opLegacyPrepare, opGuardRetired };\n');
  try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

export async function startLab({ port = 0 } = {}) {
  const W = await loadWorker();
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce' });
  await W.initDb(env);
  const DB = env.DB;
  const usersRow = DB.q("SELECT v FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq").map((r) => r.v).join('');
  const users = JSON.parse(usersRow || '[]');
  const ph = hashOf(LAB_PW), G = 'TEST_ONLY_G', A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', S1 = 'TEST_ONLY_A_S1';
  users.push(
    { id: 'TEST_ONLY_mgrA', un: LAB.mgrA, name: 'TEST_ONLY مدير أ', role: 'staff', deptId: A, ekey: 'mgr:' + A, mgr: 1, ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_mgrB', un: LAB.mgrB, name: 'TEST_ONLY مدير ب', role: 'staff', deptId: B, ekey: 'mgr:' + B, mgr: 1, ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_dmA', un: LAB.dmA, name: 'TEST_ONLY حساب إدارة أ', role: 'dept', deptId: A, ekey: 'mgr:' + A, ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_empA', un: LAB.empA, name: 'TEST_ONLY موظف أ', role: 'staff', deptId: A, ekey: 'TEST_ONLY_eA1', ph, mc: 0, dis: 0 },
  );
  const cap = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan'];
  const keys = {
    bassam_auth_users_v1: users,
    bassam_gdepts_v1: [{ id: G, name: 'TEST_ONLY إدارة عامة', kind: 'إدارة عامة' }],
    bassam_depts_v1: [{ id: A, name: 'TEST_ONLY إدارة أ', gid: G }, { id: B, name: 'TEST_ONLY إدارة ب', gid: G }, { id: S1, name: 'TEST_ONLY قسم أ١', gid: A, kind: 'قسم' }],
    bassam_perms_v1: { caps: { [G]: cap, [A]: cap, [B]: cap, [S1]: cap }, emps: {} },
    bassam_platform_v1: {},
    ['bsdept:' + A + ':bassam_employees_v1']: [{ eid: 'TEST_ONLY_eA1', name: 'TEST_ONLY موظف أ', nid: LAB.empA }, { eid: 'TEST_ONLY_eA2', name: 'TEST_ONLY موظف أ٢', nid: '1200000002' }],
    ['bsdept:' + B + ':bassam_employees_v1']: [{ eid: 'TEST_ONLY_eB1', name: 'TEST_ONLY موظف ب', nid: '1200000101' }],
  };
  const st = [];
  for (const [k, v] of Object.entries(keys)) {
    st.push(DB.prepare('DELETE FROM kv WHERE k=?1').bind(k));
    st.push(...W.kvPutStmts(env, 'kv', k, JSON.stringify(v)));
    st.push(DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k));
  }
  st.push(DB.prepare("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'"));
  await DB.batch(st);
  await installOperationalFixture(env, W);
  const pending = new Set();
  const ctx = { waitUntil(p) { const q = Promise.resolve(p).catch(() => {}); pending.add(q); q.finally(() => pending.delete(q)); }, passThroughOnException() {} };
  const server = http.createServer(async (req, res) => {
    try {
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const url = 'https://lab.local' + req.url;   /* the worker builds same-origin checks from the URL */
      const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
      headers.set('origin', headers.get('origin') ? 'https://lab.local' : '');
      if (!headers.get('origin')) headers.delete('origin');
      headers.set('host', 'lab.local');
      const r = await W.default.fetch(new Request(url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }), env, ctx);
      const out = Buffer.from(await r.arrayBuffer());
      const h = {}; r.headers.forEach((v, k) => { if (k !== 'set-cookie') h[k] = v; });
      const cookies = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
      if (cookies.length) h['set-cookie'] = cookies.map((c) => c.replace(/;\s*Secure/ig, '').replace(/;\s*Domain=[^;]*/ig, ''));
      delete h['content-length']; delete h['content-encoding'];
      /* the harness asset stub serves octet-stream; real Pages serves by extension — mirror that for the browser */
      const ext = (/\.([a-z0-9]+)$/i.exec(new URL(url).pathname) || [])[1];
      const MIME = { js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/manifest+json', html: 'text/html; charset=utf-8', txt: 'text/plain; charset=utf-8', ico: 'image/x-icon' };
      if (ext && MIME[ext.toLowerCase()] && (!h['content-type'] || /octet-stream/.test(h['content-type']))) h['content-type'] = MIME[ext.toLowerCase()];
      res.writeHead(r.status, h); res.end(out);
    } catch (e) { res.writeHead(500, { 'content-type': 'text/plain' }); res.end('lab error ' + (e && e.stack || e)); }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  const addr = server.address();
  return { env, W, base: 'http://127.0.0.1:' + addr.port, idle: async () => { while (pending.size) await Promise.all([...pending]); }, close: () => new Promise((r) => server.close(r)) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const lab = await startLab({ port: +(process.env.PORT || 8788) });
  console.log('lab ready', lab.base);
}
