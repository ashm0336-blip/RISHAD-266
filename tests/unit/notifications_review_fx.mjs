/* Independent notification-domain fixtures. No Cloudflare, imported data, or real credentials. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { D1Shim, ROOT } from './harness.mjs';
import { installOperationalFixture } from './operational_legacy_seed_fx.mjs';

export const D1 = 'TEST_ONLY_department_1', D2 = 'TEST_ONLY_department_2';
export const G1 = 'TEST_ONLY_group_1', G2 = 'TEST_ONLY_group_2';
export const IDS = { super: 'TEST_ONLY_super', gm: 'TEST_ONLY_gm', manager1: 'TEST_ONLY_manager_1', manager2: 'TEST_ONLY_manager_2', employee1: 'TEST_ONLY_employee_1', employee2: 'TEST_ONLY_employee_2', leader: 'TEST_ONLY_leader', noView: 'TEST_ONLY_no_view', frozen: 'TEST_ONLY_frozen' };
export const EKEYS = { gm: 'gm:' + G1, manager1: 'mgr:' + D1, manager2: 'mgr:' + D2, employee1: 'TEST_ONLY_e1', employee2: 'TEST_ONLY_e2', leader: 'TEST_ONLY_leader_key', noView: 'TEST_ONLY_no_view_key', frozen: 'TEST_ONLY_frozen_key' };
export const copy = value => JSON.parse(JSON.stringify(value));

export async function canonicalWorker() {
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'workers/parts.json'), 'utf8')).parts;
  const source = parts.map(part => fs.readFileSync(path.join(ROOT, 'workers/parts', part.file), 'utf8')).join('');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r266-notification-review-'));
  const file = path.join(tmp, 'worker.mjs');
  fs.writeFileSync(file, source + '\nexport { initDb, kvPutStmts, KIVO_SCHEMA_VERSION, KIVO_MIGRATIONS };\n');
  try { return await import(pathToFileURL(file).href); }
  finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

export async function world({ mode = 'enforce' } = {}) {
  const W = await canonicalWorker(), DB = new D1Shim();
  const env = { DB, ASSETS: { fetch: async () => new Response('<!doctype html><html><head><!--BS_BOOT--></head><body>TEST_ONLY</body></html>', { headers: { 'Content-Type': 'text/html' } }) } };
  if (mode === 'enforce') env.KIVO_AUTHZ_MODE = 'enforce';
  await W.initDb(env); DB.exec('PRAGMA foreign_keys = ON');
  const migrations = fs.readdirSync(path.join(ROOT, 'migrations')).filter(file => /^\d{4}_.+\.sql$/.test(file)).sort();
  assert.deepEqual(W.KIVO_MIGRATIONS.map(m => m.name), migrations.map(file => file.slice(0, -4)), 'The canonical migration declaration must be current; the fixture must not silently apply missing migrations');
  const users = Object.entries(IDS).map(([kind, id], i) => ({
    id, un: String(1000000800 + i), name: 'TEST_ONLY ' + kind,
    role: kind === 'super' ? 'super' : kind === 'gm' ? 'gm' : 'staff',
    ...(kind === 'gm' ? { gid: G1 } : kind === 'super' ? {} : { deptId: kind === 'employee2' || kind === 'manager2' ? D2 : D1 }),
    ...(EKEYS[kind] ? { ekey: EKEYS[kind] } : {}),
    ...(kind.startsWith('manager') ? { mgr: 1 } : {}),
    ph: 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64), mc: 0, dis: kind === 'frozen' ? 1 : 0
  }));
  const cap = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats'];
  const sheet = { tasks: ['view', 'add', 'edit'], 'daily/rounds': ['view'], dreport: ['view'], 'emps/data': ['view'] };
  const keys = {
    bassam_auth_users_v1: users,
    bassam_gdepts_v1: [{ id: G1, name: 'TEST_ONLY group one', kind: 'إدارة عامة' }, { id: G2, name: 'TEST_ONLY group two', kind: 'إدارة عامة' }],
    bassam_depts_v1: [{ id: D1, name: 'TEST_ONLY department one', gid: G1 }, { id: D2, name: 'TEST_ONLY department two', gid: G2 }],
    bassam_perms_v1: { caps: { [G1]: cap, [G2]: cap, [D1]: cap, [D2]: cap }, emps: { [D1]: { [EKEYS.employee1]: sheet, [EKEYS.leader]: sheet, [EKEYS.noView]: {}, [EKEYS.frozen]: sheet }, [D2]: { [EKEYS.employee2]: sheet } }, tplOf: { [D1]: { [EKEYS.leader]: 'TEST_ONLY_supervisory_template' } } },
    bassam_platform_v1: {},
    ['bsdept:' + D1 + ':bassam_employees_v1']: users.filter(u => u.deptId === D1 && !u.mgr).map(u => ({ eid: u.ekey, name: u.name, nid: u.un })),
    ['bsdept:' + D2 + ':bassam_employees_v1']: users.filter(u => u.deptId === D2 && !u.mgr).map(u => ({ eid: u.ekey, name: u.name, nid: u.un })),
    ['bsdept:' + D1 + ':bassam_perm_tpls_v1']: [{ id: 'TEST_ONLY_supervisory_template', name: 'TEST_ONLY renamed template', sup: true }]
  };
  const statements = [];
  for (const [key, value] of Object.entries(keys)) {
    statements.push(...W.kvPutStmts(env, 'kv', key, JSON.stringify(value)));
    statements.push(DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1)').bind(key));
  }
  statements.push(DB.prepare("INSERT INTO meta(k,v) VALUES('rev','1') ON CONFLICT(k) DO UPDATE SET v='1'"));
  if (mode === 'enforce') statements.push(DB.prepare("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'"));
  const now = Date.now();
  for (const [kind, uid] of Object.entries(IDS)) statements.push(DB.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city) VALUES(?1,?2,?3,?3,?4,?5)').bind('TEST_ONLY_session_' + kind, uid, now, 'TEST_ONLY', 'TEST_ONLY'));
  await DB.batch(statements);
  /* schema 10: employees are a typed Operations resource — convert the synthetic seed with the canonical cutover planner */
  await installOperationalFixture(env);
  const api = async (who, route, { method = 'GET', body } = {}) => {
    const headers = new Headers();
    if (who) headers.set('Cookie', 'bs_tok=TEST_ONLY_session_' + who);
    if (method !== 'GET') { headers.set('Origin', 'http://x'); headers.set('Content-Type', 'application/json'); }
    const response = await W.default.fetch(new Request('http://x' + route, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), env);
    let json; try { json = await response.json(); } catch { json = null; }
    return { status: response.status, json, headers: response.headers };
  };
  const get = (who, query = {}) => api(who, '/api/notifications?' + new URLSearchParams({ ...(who ? { uid: IDS[who] } : {}), ...query }));
  const act = (who, body) => api(who, '/api/notifications/act', { method: 'POST', body: { ...(who ? { uid: IDS[who] } : {}), ...body } });
  return { W, env, DB, users, keys, api, get, act };
}

export const identitySnapshot = DB => copy(DB.q("SELECT k,seq,v FROM kv WHERE k IN ('bassam_auth_users_v1','bassam_perms_v1') ORDER BY k,seq"));
export function notificationSnapshot(DB) {
  const tables = DB.q("SELECT name FROM sqlite_master WHERE type='table' AND name GLOB 'notification_*' ORDER BY name");
  return Object.fromEntries(tables.map(({ name }) => [name, copy(DB.q('SELECT * FROM ' + name)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
}
