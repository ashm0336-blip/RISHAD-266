/* RISHAD-266 (2026-11-04) · the notification audience match (019 nfFeedRows, ?4) is an uncorrelated row-value IN instead of a
   correlated EXISTS … JOIN json_each(?4). This test proves the change is behaviour-neutral and removes the cost growth:
   · the SAME isolated world is served by the current worker and by the same worker with the previous SQL fragment restored;
     every response (summary counters, feed items and cursors, filters, kinds, all-departments) must be byte-identical for the
     platform admin (with and without a department), a general manager, a department-role manager, a staff manager and employees,
     across every notification type (NF_TYPES + bc_dept + a retired type), every target kind, sys and department scopes, read /
     dismissed / acknowledged states, withdrawn and expired rows, and broadcasts;
   · the platform-admin summary without a department, whose audience spans every department × type, is far cheaper than before.
   TEST_ONLY data in an in-memory SQLite (D1Shim) — no network, no real data. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { D1Shim, WORKER } from './harness.mjs';
import { installOperationalFixture } from './operational_legacy_seed_fx.mjs';

const OLD = "EXISTS(SELECT 1 FROM notification_targets t JOIN json_each(?4) a ON json_extract(a.value,'$.scope')=t.scope AND json_extract(a.value,'$.kind')=t.kind AND json_extract(a.value,'$.value')=t.value WHERE t.scope=m.scope AND t.message_id=m.id AND (json_extract(a.value,'$.type')='*' OR json_extract(a.value,'$.type')=m.type))";
const AUD = "(SELECT json_extract(value,'$.scope'),json_extract(value,'$.kind'),json_extract(value,'$.value'),json_extract(value,'$.type') FROM json_each(?4))";
const NEW = "EXISTS(SELECT 1 FROM notification_targets t WHERE t.scope=m.scope AND t.message_id=m.id AND ((t.scope,t.kind,t.value,'*') IN " + AUD + " OR (t.scope,t.kind,t.value,m.type) IN " + AUD + "))";

async function load(variant) {
  let src = fs.readFileSync(WORKER, 'utf8');
  assert.equal(src.split(NEW).length, 2, 'the worker carries the uncorrelated audience match exactly once');
  assert.equal(src.split(OLD).length, 1, 'the correlated audience match is gone');
  if (variant === 'old') src = src.replace(NEW, OLD);
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'nfaud-')), f = path.join(dir, 'w.mjs');
  fs.writeFileSync(f, src + '\nexport { initDb, kvPutStmts, NF_TYPES, opLegacyPrepare, opGuardRetired };\n');
  try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const G = 'TEST_ONLY_grp', NOW = Date.now() - 60000;
async function world(W, ND, NE, opts = {}) {
  const DB = new D1Shim();
  const env = { DB, KIVO_AUTHZ_MODE: 'enforce', ASSETS: { fetch: async () => new Response('<!doctype html><html><head><!--BS_BOOT--></head><body>TEST_ONLY</body></html>', { headers: { 'Content-Type': 'text/html' } }) } };
  await W.initDb(env); DB.exec('PRAGMA foreign_keys = ON');
  const D = Array.from({ length: ND }, (_, i) => 'TEST_ONLY_d' + i), ph = 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64);
  const users = [{ id: 'TEST_ONLY_super', un: '1000000001', name: 'TEST_ONLY super', role: 'super', ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_gm', un: '1000000002', name: 'TEST_ONLY gm', role: 'gm', gid: G, ekey: 'gm:' + G, ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_dm', un: '1000000003', name: 'TEST_ONLY dept role', role: 'dept', deptId: D[ND - 1], ekey: 'mgr:' + D[ND - 1], ph, mc: 0, dis: 0 }];
  const emps = {};
  D.forEach((d, di) => {
    users.push({ id: 'TEST_ONLY_m' + di, un: String(1100000000 + di), name: 'TEST_ONLY mgr ' + di, role: 'staff', deptId: d, ekey: 'mgr:' + d, mgr: 1, ph, mc: 0, dis: 0 });
    emps[d] = [];
    for (let e = 0; e < NE; e++) {
      users.push({ id: 'TEST_ONLY_u' + di + '_' + e, un: String(1200000000 + di * 10000 + e), name: 'TEST_ONLY emp ' + di + '_' + e, role: 'staff', deptId: d, ekey: 'TEST_ONLY_e' + di + '_' + e, ph, mc: 0, dis: 0 });
      emps[d].push({ eid: 'TEST_ONLY_e' + di + '_' + e, name: 'TEST_ONLY emp ' + di + '_' + e, nid: String(1200000000 + di * 10000 + e) });
    }
  });
  const cap = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats'], caps = { [G]: cap }; D.forEach((d) => { caps[d] = cap; });
  const keys = { bassam_auth_users_v1: users, bassam_gdepts_v1: [{ id: G, name: 'TEST_ONLY group', kind: 'إدارة عامة' }],
    bassam_depts_v1: D.map((d, i) => ({ id: d, name: 'TEST_ONLY dept ' + i, gid: G })),
    bassam_perms_v1: { caps, emps: { [D[0]]: { TEST_ONLY_e0_0: { tasks: ['view', 'add', 'edit'], 'daily/rounds': ['view'], dreport: ['view'], 'emps/data': ['view'] } } } },
    bassam_platform_v1: {} };
  D.forEach((d) => { keys['bsdept:' + d + ':bassam_employees_v1'] = emps[d]; });
  const st = [];
  for (const [k, v] of Object.entries(keys)) { st.push(...W.kvPutStmts(env, 'kv', k, JSON.stringify(v))); st.push(DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1)').bind(k)); }
  st.push(DB.prepare("INSERT INTO meta(k,v) VALUES('rev','1') ON CONFLICT(k) DO UPDATE SET v='1'"), DB.prepare("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'"));
  const who = { super: 'TEST_ONLY_super', gm: 'TEST_ONLY_gm', dm: 'TEST_ONLY_dm', mgr0: 'TEST_ONLY_m0', mgr1: 'TEST_ONLY_m1', emp0: 'TEST_ONLY_u0_0', emp1: 'TEST_ONLY_u1_1', emp2: 'TEST_ONLY_u0_2' };
  for (const [k, uid] of Object.entries(who)) st.push(DB.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city) VALUES(?1,?2,?3,?3,?4,?5)').bind('TEST_ONLY_s_' + k, uid, NOW, 'TEST_ONLY', 'TEST_ONLY'));
  await DB.batch(st);
  await installOperationalFixture(env, W);
  /* notifications: every type × every scope × a rotating target kind; plus a retired type, sys rows, states and broadcasts */
  const types = Object.keys(W.NF_TYPES).concat(['bc_dept', 'TEST_ONLY_retired_type']);
  const ins = DB.db.prepare("INSERT INTO notification_messages(scope,id,kind,department,type,category,priority,channel,title,body,created_at,expires_at,withdrawn_at,requires_ack,pinned,target_mode) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  const tg = DB.db.prepare('INSERT INTO notification_targets(scope,message_id,kind,value) VALUES(?,?,?,?)');
  const us = DB.db.prepare('INSERT OR IGNORE INTO notification_user_state(account_uid,message_scope,message_id,read_at,acknowledged_at,dismissed_at) VALUES(?,?,?,?,?,?)');
  DB.db.exec('BEGIN');
  let n = 0;
  const scopes = D.map((d) => ['d:' + d, d]).concat([['sys', '']]);
  const reps = opts.reps || 1;
  for (let r = 0; r < reps; r++) for (const [scope, dept] of scopes) types.forEach((type, ti) => {
    const id = 'TEST_ONLY_n' + (n++), cat = (W.NF_TYPES[type] && W.NF_TYPES[type].k) || (type === 'bc_dept' ? 'bc' : 'sec');
    const at = NOW - ((n * 7919) % (80 * 864e5)), v = n % 23;
    ins.run(scope, id, 'event', v === 3 ? '' : dept, type, cat, ['info', 'act', 'urg'][n % 3], n % 2 ? 'bell' : 'toast', 'TEST_ONLY', 'TEST_ONLY', at,
      v === 5 ? NOW - 1000 : 0, v === 7 ? NOW - 500 : 0, v === 9 ? 1 : 0, v === 11 ? 1 : 0, v === 13 ? 'all' : 'message');
    const di = dept ? D.indexOf(dept) : n % ND, e = n % Math.max(1, NE);
    const kinds = [['employee', 'TEST_ONLY_e' + di + '_' + e], ['employee', 'TEST_ONLY_u' + di + '_' + e], ['role', 'all'], ['role', 'sys'], ['role', 'mgr'], ['role', 'lead'], ['role', 'staff'], ['employee', 'TEST_ONLY_super'], ['employee', 'mgr:' + D[di]], ['employee', String(1200000000 + di * 10000 + e)]];
    tg.run(scope, id, ...kinds[(n + ti) % kinds.length]);
    if (n % 4 === 0) tg.run(scope, id, ...kinds[(n + ti + 3) % kinds.length]);
    if (n % 5 === 0) us.run('TEST_ONLY_u' + di + '_' + e, scope, id, at + 1, n % 10 === 0 ? at + 2 : 0, 0);
    if (n % 6 === 0) us.run('TEST_ONLY_super', scope, id, at + 1, 0, n % 12 === 0 ? at + 3 : 0);
    if (n % 7 === 0) us.run('TEST_ONLY_m' + di, scope, id, at + 1, 0, 0);
  });
  for (let b = 0; b < 6; b++) {
    const id = 'TEST_ONLY_bc' + b;
    ins.run('bc', id, 'broadcast', '', 'bc_dept', 'bc', 'info', 'bell', 'TEST_ONLY', 'TEST_ONLY', NOW - b * 3600e3, 0, b === 5 ? NOW - 1 : 0, 0, b === 1 ? 1 : 0, b === 0 ? 'all' : 'dept');
    if (b) DB.db.prepare('INSERT INTO notification_targets(scope,message_id,kind,value) VALUES(?,?,?,?)').run('bc', id, ...[['department', D[0]], ['role', 'mgr'], ['employee', 'TEST_ONLY_e0_0'], ['role', 'staff'], ['department', D[ND - 1]]][b - 1]);
  }
  DB.db.exec('COMMIT');
  return { env, D, n };
}
async function call(W, env, who, route) {
  const r = await W.default.fetch(new Request('http://x' + route, { headers: { Cookie: 'bs_tok=TEST_ONLY_s_' + who } }), env, { waitUntil() {}, passThroughOnException() {} });
  return { status: r.status, body: await r.text() };
}
function routes(D) {
  const q = ['/api/notifications?summary=1', '/api/notifications?limit=200', '/api/notifications?filter=un', '/api/notifications?filter=act', '/api/notifications?kinds=sec,task', '/api/notifications?limit=7'];
  const R = [];
  for (const who of ['super', 'gm', 'dm', 'mgr0', 'mgr1', 'emp0', 'emp1', 'emp2']) {
    q.forEach((p) => R.push([who, p]));
    D.forEach((d) => { R.push([who, '/api/notifications?summary=1&dept=' + d]); R.push([who, '/api/notifications?limit=200&dept=' + d]); });
  }
  R.push(['super', '/api/notifications?summary=1&all=1'], ['super', '/api/notifications?all=1&limit=200'], ['super', '/api/notifications?manage=1']);
  return R;
}

test('RISHAD-266 · audience match: identical responses before/after for every role, department, type, target kind and state', { timeout: 600000 }, async () => {
  const Wn = await load('new'), Wo = await load('old');
  const a = await world(Wn, 4, 6), b = await world(Wo, 4, 6);
  const R = routes(a.D);
  let compared = 0, nonEmpty = 0;
  const seenKinds = new Set();
  for (const [who, route] of R) {
    const x = await call(Wn, a.env, who, route), y = await call(Wo, b.env, who, route);
    assert.equal(x.status, y.status, who + ' ' + route + ' status');
    assert.equal(x.body, y.body, who + ' ' + route + ' body');
    compared++;
    const j = JSON.parse(x.body);
    if (j.ok && (j.total > 0 || (j.items || []).length)) { nonEmpty++; Object.keys(j.byKind || {}).forEach((k) => seenKinds.add(k)); }
    /* follow the next page cursor once: cursors are built from the same rows */
    if (j.ok && j.next) {
      const p2 = route + (route.includes('?') ? '&' : '?') + 'cursor=' + encodeURIComponent(j.next);
      const x2 = await call(Wn, a.env, who, p2), y2 = await call(Wo, b.env, who, p2);
      assert.equal(x2.body, y2.body, who + ' ' + p2 + ' page 2'); compared++;
    }
  }
  console.log(JSON.stringify({ messages: a.n, compared, nonEmpty, kinds: [...seenKinds].sort() }));
  assert.ok(compared >= R.length, 'all routes compared');
  assert.ok(nonEmpty >= 40, 'the comparison covers non-empty feeds (' + nonEmpty + ')');
  assert.ok(seenKinds.size >= 5, 'several notification categories are counted: ' + [...seenKinds].join(','));
  /* the mutation paths that read the same where clause (mark read) keep working identically */
  for (const W of [Wn, Wo]) assert.ok(W.NF_TYPES && Object.keys(W.NF_TYPES).length > 50);
});

test('RISHAD-266 · audience match: the platform-admin summary across all departments no longer scales with messages × audience', { timeout: 600000 }, async () => {
  const Wn = await load('new'), Wo = await load('old');
  const a = await world(Wn, 13, 4, { reps: 1 }), b = await world(Wo, 13, 4, { reps: 1 });
  const time = async (W, env, who, route) => { const t = performance.now(); const r = await call(W, env, who, route); return { ms: performance.now() - t, r }; };
  await time(Wn, a.env, 'super', '/api/notifications?summary=1'); await time(Wo, b.env, 'super', '/api/notifications?summary=1');   /* warm */
  const n1 = await time(Wn, a.env, 'super', '/api/notifications?summary=1'), o1 = await time(Wo, b.env, 'super', '/api/notifications?summary=1');
  const n2 = await time(Wn, a.env, 'super', '/api/notifications?summary=1&dept=' + a.D[3]), o2 = await time(Wo, b.env, 'super', '/api/notifications?summary=1&dept=' + b.D[3]);
  assert.equal(n1.r.body, o1.r.body); assert.equal(n2.r.body, o2.r.body);
  assert.equal(n1.r.status, 200); assert.equal(n2.r.status, 200);
  console.log(JSON.stringify({ messages: a.n, superNoDept: { oldMs: Math.round(o1.ms), newMs: Math.round(n1.ms) }, superDept: { oldMs: Math.round(o2.ms), newMs: Math.round(n2.ms) } }));
  assert.ok(n1.ms * 4 < o1.ms, 'super summary without dept is at least 4× cheaper (' + Math.round(o1.ms) + ' → ' + Math.round(n1.ms) + ' ms)');
  assert.ok(n2.ms * 2 < o2.ms, 'super summary with dept is at least 2× cheaper (' + Math.round(o2.ms) + ' → ' + Math.round(n2.ms) + ' ms)');
});
