/* Canonical custody/atomic-domain fixture. Synthetic identities only.
   The worker is read from actual parts.json, never from a staged composer. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
import { D1Shim, ROOT, allowTestSchemaUpgrade } from './harness.mjs';
import { D1, D2, G1, G2, IDS, EKEYS, copy, identitySnapshot, notificationSnapshot } from './notifications_review_fx.mjs';
export { ROOT, D1, D2, G1, G2, IDS, EKEYS, copy, identitySnapshot, notificationSnapshot };

const NAMED = [
  'empTransitionContext',
  'empPrepareTransition',
  'cuPlanSaveTransition',
  'cuPlanCleanup',
  'cuPlanRestore',
  'cuExport',
  'cuValidateDomain',
  'cuSnapshotRows',
  'cuConvert',
  'cuLegacyPrepare',
  'cuAct',
  'cuRead',
  'cuRev',
  'cuClock',
  'actorOf',
  'enfModeOf',
  'revGuard',
  'migrateDb',
  'initDb',
  'kvPutStmts',
  'KIVO_MIGRATIONS',
  'KIVO_SCHEMA_VERSION',
  'MIG_TABLE',
  'rsConvertBackup',
  'rsPrepare',
  'rsCommit',
  'rsEpoch',
  'preAttach',
  'dsDomainRead',
  'nfRead',
  'hashPw',
];
function canonicalInput() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'workers/parts.json'), 'utf8'));
  assert.ok(Array.isArray(manifest.parts) && manifest.parts.length, 'Actual worker manifest is required');
  const names = new Set();
  let last = 0;
  const source = manifest.parts
    .map((part) => {
      assert.match(part.file, /^\d{3}[a-z]?-[A-Za-z0-9_-]+\.js$/, 'Part paths stay in the canonical parts directory');
      assert.equal(names.has(part.file), false, 'Unique part name');
      names.add(part.file);
      assert.ok(
        Array.isArray(part.lines) && part.lines[0] === last + 1 && part.lines[1] >= part.lines[0],
        'Actual manifest part order is contiguous',
      );
      last = part.lines[1];
      const text = fs.readFileSync(path.join(ROOT, 'workers/parts', part.file), 'utf8');
      assert.equal(
        createHash('sha256').update(text).digest('hex'),
        part.sha256,
        'Part digest must match the actual generated manifest: ' + part.file,
      );
      return text;
    })
    .join('');
  assert.equal(createHash('sha256').update(source).digest('hex'), manifest.sha256, 'Canonical source and actual manifest digest agree');
  return source;
}
export function canonicalDigest() {
  return createHash('sha256').update(canonicalInput()).digest('hex');
}
let instance = 0;
export async function canonicalWorker() {
  const source = canonicalInput(),
    declared = new Set();
  for (const node of parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body) {
    if (node.type === 'FunctionDeclaration' && node.id) declared.add(node.id.name);
    if (node.type === 'VariableDeclaration') for (const d of node.declarations) if (d.id.type === 'Identifier') declared.add(d.id.name);
  }
  const missing = NAMED.filter((name) => !declared.has(name));
  if (missing.length) throw Error('Canonical domain promotion is not present; missing named symbols: ' + missing.join(','));
  return import(
    'data:text/javascript;base64,' +
      Buffer.from(
        source + '\nexport {' + NAMED.join(',') + '};\n//# sourceURL=canonical-custody-review-worker.mjs\n// fixture isolate ' + ++instance,
      ).toString('base64')
  );
}
function fixtureKeys() {
  const users = Object.entries(IDS).map(([kind, id], i) => ({
    id,
    un: String(1000000800 + i),
    name: 'TEST_ONLY ' + kind,
    role: kind === 'super' ? 'super' : kind === 'gm' ? 'gm' : 'staff',
    ...(kind === 'gm' ? { gid: G1 } : kind === 'super' ? {} : { deptId: kind === 'employee2' || kind === 'manager2' ? D2 : D1 }),
    ...(EKEYS[kind] ? { ekey: EKEYS[kind] } : {}),
    ...(kind.startsWith('manager') ? { mgr: 1 } : {}),
    ph: 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64),
    mc: 0,
    dis: kind === 'frozen' ? 1 : 0,
  }));
  const cap = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats'],
    sheet = { tasks: ['view', 'add', 'edit'], 'daily/rounds': ['view'], dreport: ['view'], 'emps/data': ['view'] };
  const keys = {
    bassam_auth_users_v1: users,
    bassam_gdepts_v1: [
      { id: G1, name: 'TEST_ONLY group one', kind: 'إدارة عامة' },
      { id: G2, name: 'TEST_ONLY group two', kind: 'إدارة عامة' },
    ],
    bassam_depts_v1: [
      { id: D1, name: 'TEST_ONLY department one', gid: G1 },
      { id: D2, name: 'TEST_ONLY department two', gid: G2 },
    ],
    bassam_perms_v1: {
      caps: { [G1]: cap, [G2]: cap, [D1]: cap, [D2]: cap },
      emps: {
        [D1]: { [EKEYS.employee1]: sheet, [EKEYS.leader]: sheet, [EKEYS.noView]: {}, [EKEYS.frozen]: sheet },
        [D2]: { [EKEYS.employee2]: sheet },
      },
      tplOf: { [D1]: { [EKEYS.leader]: 'TEST_ONLY_supervisory_template' } },
    },
    bassam_platform_v1: {},
    ['bsdept:' + D1 + ':bassam_employees_v1']: users
      .filter((u) => u.deptId === D1 && !u.mgr)
      .map((u) => ({ eid: u.ekey, name: u.name, nid: u.un })),
    ['bsdept:' + D2 + ':bassam_employees_v1']: users
      .filter((u) => u.deptId === D2 && !u.mgr)
      .map((u) => ({ eid: u.ekey, name: u.name, nid: u.un })),
    ['bsdept:' + D1 + ':bassam_perm_tpls_v1']: [{ id: 'TEST_ONLY_supervisory_template', name: 'TEST_ONLY renamed template', sup: true }],
  };
  return { users, keys };
}
async function fixtureWorld({ mode = 'enforce', through = null } = {}) {
  const W = await canonicalWorker(),
    DB = new D1Shim(),
    env = {
      DB,
      ASSETS: {
        fetch: async () =>
          new Response('<!doctype html><html><head><!--BS_BOOT--></head><body>TEST_ONLY</body></html>', {
            headers: { 'Content-Type': 'text/html' },
          }),
      },
    };
  if (mode === 'enforce') env.KIVO_AUTHZ_MODE = 'enforce';
  const migrationNames = fs
    .readdirSync(path.join(ROOT, 'migrations'))
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort()
    .map((f) => f.slice(0, -4));
  assert.deepEqual(
    W.KIVO_MIGRATIONS.map((m) => m.name),
    migrationNames,
    'Actual canonical migration registration must match migration sources',
  );
  if (through) {
    const at = W.KIVO_MIGRATIONS.findIndex((m) => m.name === through);
    assert.ok(at >= 0, 'Explicit legacy baseline exists');
    DB.exec(W.MIG_TABLE);
    for (const m of W.KIVO_MIGRATIONS.slice(0, at + 1)) {
      for (const sql of m.sql) DB.exec(sql);
      DB.db.prepare('INSERT INTO d1_migrations(name)VALUES(?)').run(m.name);
    }
  } else await W.initDb(env);
  DB.exec('PRAGMA foreign_keys=ON');
  const { users, keys } = fixtureKeys(),
    statements = [];
  for (const [key, value] of Object.entries(keys)) {
    statements.push(...W.kvPutStmts(env, 'kv', key, JSON.stringify(value)));
    statements.push(DB.prepare('INSERT INTO revs(k,rev)VALUES(?1,1)').bind(key));
  }
  statements.push(DB.prepare("INSERT INTO meta(k,v)VALUES('rev','1') ON CONFLICT(k)DO UPDATE SET v='1'"));
  if (mode === 'enforce')
    statements.push(DB.prepare("INSERT INTO meta(k,v)VALUES('authz_mode','enforce') ON CONFLICT(k)DO UPDATE SET v='enforce'"));
  const now = Date.now();
  for (const [who, uid] of Object.entries(IDS))
    statements.push(
      DB.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city)VALUES(?1,?2,?3,?3,?4,?5)').bind(
        'TEST_ONLY_session_' + who,
        uid,
        now,
        'TEST_ONLY',
        'TEST_ONLY',
      ),
    );
  await DB.batch(statements);
  if (through) allowTestSchemaUpgrade(DB);
  const api = async (who, route, { method = 'GET', body } = {}) => {
    const headers = new Headers();
    if (who) headers.set('Cookie', 'bs_tok=TEST_ONLY_session_' + who);
    if (method !== 'GET') {
      headers.set('Origin', 'http://x');
      headers.set('Content-Type', 'application/json');
    }
    const response = await W.default.fetch(
      new Request('http://x' + route, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }),
      env,
    );
    let json;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    return { status: response.status, json, headers: response.headers };
  };
  const get = (who, query = {}) => api(who, '/api/notifications?' + new URLSearchParams({ ...(who ? { uid: IDS[who] } : {}), ...query }));
  const act = (who, body) => api(who, '/api/notifications/act', { method: 'POST', body: { ...(who ? { uid: IDS[who] } : {}), ...body } });
  return { W, env, DB, users, keys, api, get, act };
}
export function world(options = {}) {
  return fixtureWorld(options);
}
export function legacyWorld({ mode = 'enforce', through = '0005_notifications' } = {}) {
  return fixtureWorld({ mode, through });
}
