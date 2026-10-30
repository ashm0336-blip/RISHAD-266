import assert from 'node:assert/strict';
import { D1, D2, IDS, EKEYS, copy, identitySnapshot } from './notifications_review_fx.mjs';
import { world as custodyWorld } from './custody_review_fx.mjs';
const OPTIONS = 'bsdept:' + D1 + ':bassam_options_v1';
let rid = 0;
async function world() {
  const B = await custodyWorld(),
    W = B.W;
  const api = async (who, url, body) => {
    const headers = { Cookie: 'bs_tok=TEST_ONLY_session_' + who };
    if (body !== undefined) {
      headers.Origin = 'http://x';
      headers['Content-Type'] = 'application/json';
    }
    const response = await W.default.fetch(
      new Request('http://x' + url, {
        method: body === undefined ? 'GET' : 'POST',
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      B.env,
    );
    return { status: response.status, json: await response.json() };
  };
  const body = async (extra = {}) => {
    const sourceKeys = Object.create(null);
    for (const row of B.DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq'))
      if (!/(?:^|:)bassam_(?:dstats|custody|notif(?:_cfg|_sys)?|bc)_v1$/.test(row.k)) sourceKeys[row.k] = (sourceKeys[row.k] || '') + row.v;
    const nf = await W.nfRead(B.env),
      ds = await W.dsDomainRead(B.env),
      scoped = (await api('super', '/api/custody/export')).json.domains || [];
    const scope = extra.scope || { kind: 'full' },
      keys = scope.kind === 'full' ? Object.assign(sourceKeys, extra.keys || {}) : Object.assign({}, extra.keys || {}),
      declared = scope.kind === 'full' ? JSON.parse(keys.bassam_depts_v1).map((d) => d.id) : [scope.departmentId];
    if (scope.kind === 'full' && extra.keys && extra.keys.bassam_depts_v1)
      for (const k of Object.keys(keys)) {
        const m = /^bsdept:([^:]+):/.exec(k);
        if (m && !declared.includes(m[1]) && !Object.prototype.hasOwnProperty.call(extra.keys, k)) delete keys[k];
      }
    const cu = (extra.domains && extra.domains.custody) || [];
    const custodyDomains = declared
      .map(
        (dept) =>
          cu.find((c) => c.scope.departmentId === dept) ||
          scoped.find((c) => c.scope.departmentId === dept) || {
            version: 1,
            scope: { departmentId: dept },
            rows: { items: [], issues: [], moves: [] },
          },
      )
      .concat(cu.filter((c) => !declared.includes(c.scope.departmentId)));
    const deptNF = { version: 1 };
    for (const n of ['messages', 'targets', 'states', 'dedup', 'overrides', 'checkpoints'])
      deptNF[n] = ['overrides', 'checkpoints'].includes(n)
        ? []
        : nf[n].filter((r) => (n === 'states' ? r.message_scope : r.scope) === 'd:' + scope.departmentId);
    const domains =
      scope.kind === 'full'
        ? { dailyStats: { version: 1, data: ds.data }, notifications: nf, ...(extra.domains || {}), custody: custodyDomains }
        : { notifications: deptNF, custody: custodyDomains, ...(extra.domains || {}) };
    const request = {
      version: 1,
      requestId: 'TEST_ONLY_restore_' + ++rid,
      scope,
      mode: 'replace',
      reason: 'TEST_ONLY isolated rollback proof',
      base: {
        epoch: await W.rsEpoch(B.env),
        kv: Object.fromEntries(B.DB.q('SELECT k,rev FROM revs').map((r) => [r.k, r.rev])),
        dailyStats: ds.rev,
        notifications: { rev: nf.rev, configRev: nf.configRev, broadcastRev: nf.broadcastRev },
        custody: Object.fromEntries(await Promise.all(declared.map(async (d) => [d, await W.cuRev(B.env, d)]))),
      },
      keys,
      delete: [],
      ...extra,
      keys,
      domains,
    };
    if (scope.kind === 'full')
      request.manifest = extra.manifest || {
        version: 1,
        scope: 'full',
        domains: { kv: 1, dailyStats: 1, notifications: 1, custody: 1 },
        departments: declared,
        keys: Object.keys(keys),
      };
    else
      request.manifest = extra.manifest || {
        version: 1,
        scope: 'dept',
        domains: { kv: 1, notifications: 1, custody: 1 },
        departments: declared,
        keys: Object.keys(keys)
          .filter((k) => k !== 'bassam_perms_v1')
          .map((k) => k.slice(('bsdept:' + scope.departmentId + ':').length)),
      };
    return request;
  };
  const restore = (p, who = 'super') => api(who, '/api/backup/restore', { uid: IDS[who], ...p });
  return { ...B, canonicalW: W, W, api, body, restore };
}
function ok(r) {
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.ok, 1, JSON.stringify(r.json));
  return r.json;
}
const TABLES = [
  'kv',
  'imgs',
  'imgown',
  'imgref',
  'revs',
  'meta',
  'aud',
  'sec',
  'authz',
  'restore_operations',
  'restore_preimage',
  'restore_snapshot_manifest',
  'daily_stats_days',
  'daily_stats_month_locks',
  'daily_stats_day_locks',
  'notification_messages',
  'notification_targets',
  'notification_user_state',
  'notification_dedup',
  'notification_type_overrides',
  'notification_checkpoints',
  'custody_items',
  'custody_issues',
  'custody_movements',
  'custody_requests',
  'custody_request_outputs',
];
const snap = (DB) =>
  Object.fromEntries(
    TABLES.map((t) => [t, copy(DB.q('SELECT * FROM ' + t)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]),
  );
async function seedMessage(B) {
  return ok(
    await B.api('super', '/api/notifications/act', {
      uid: IDS.super,
      op: 'emit',
      type: 'task_new',
      dept: D1,
      own: [EKEYS.employee1],
      vars: { المهمة: 'TEST_ONLY task' },
      once: 'TEST_ONLY_restore_seed',
    }),
  );
}
async function mixed(B) {
  await seedMessage(B);
  const n = copy(await B.W.nfRead(B.env));
  n.messages[0].title = 'TEST_ONLY restored title';
  let b = await B.body({
    keys: { [OPTIONS]: '{"TEST_ONLY":"restored"}' },
    domains: {
      dailyStats: {
        version: 1,
        data: { haram: { '1448-01-02': { worshippers: 0, umrah: null } }, nabawi: {}, locks: { 'haram|1448-1': true } },
      },
      notifications: n,
    },
  });
  b.base.kv[OPTIONS] = 0;
  b.base.dailyStats = 0;
  b.base.notifications = { rev: n.rev, configRev: n.configRev, broadcastRev: n.broadcastRev };
  return b;
}
async function custody(B, dept = D1) {
  let base = await B.W.cuRev(B.env, dept);
  const type = ok(
    await B.api('super', '/api/custody/act', {
      uid: IDS.super,
      dept,
      base,
      requestId: 'TEST_ONLY_type_' + ++rid,
      op: 'type-create',
      item: { name: 'TEST_ONLY radio', qty: 3, prefix: 'RD' },
    }),
  );
  base = type.rev;
  const issued = ok(
    await B.api('super', '/api/custody/act', {
      uid: IDS.super,
      dept,
      base,
      requestId: 'TEST_ONLY_issue_' + ++rid,
      op: 'issue',
      itemId: type.itemId,
      holderKey: 'TEST_ONLY orphan retained',
    }),
  );
  return { type, issued, domain: ok(await B.api('super', '/api/custody/export?dept=' + dept)).domains[0] };
}
export { world, ok, seedMessage, mixed, custody, snap, TABLES, OPTIONS };

/* A historical FILE envelope, not a retained Worker/export implementation.
   Phase5 AppBackup carried native DS/NF plus raw scoped values, without a
   manifest or native custody domain. Current UI export remains tested separately. */
function phase5AppBackup(file) {
  assert.equal(file.kind, 'full');
  assert.ok(file.domains.dailyStats);
  assert.ok(file.domains.notifications);
  return {
    app: 'bassam-crowd',
    version: 3,
    kind: 'full',
    exportedAt: file.exportedAt,
    data: copy(file.data),
    domains: { dailyStats: copy(file.domains.dailyStats), notifications: copy(file.domains.notifications) },
    idbImages: copy(file.idbImages || {}),
  };
}
export { phase5AppBackup };
