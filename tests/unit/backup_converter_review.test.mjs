import {cuInflate} from './custody_legacy_oracle.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D1, D2, IDS, copy } from './notifications_review_fx.mjs';
import { world as custodyWorld } from './custody_review_fx.mjs';
async function world() {
  const f = await custodyWorld(),
    W = f.W;
  const mode = await W.enfModeOf(f.env),
    A = await W.actorOf({ ...f.env, __enf: mode }, IDS.super),
    reference = { inputKeys: Object.fromEntries(Object.entries(f.keys).map(([k, v]) => [k, JSON.stringify(v)])), inputRevs: {} };
  const convert = (file, opt = {}) =>
    W.rsConvertBackup(f.env, A, file, { scope: { kind: 'full' }, mode: 'replace', legacyConsent: true, reference, ...opt });
  return { ...f, W, A, reference, convert };
}
const emptyNF = () => ({ version: 1, messages: [], targets: [], states: [], dedup: [], overrides: [], checkpoints: [] });
const full = (t, extra = {}) => ({
  app: 'bassam-crowd',
  version: 3,
  kind: 'full',
  data: { bassam_depts_v1: JSON.stringify(t.keys.bassam_depts_v1), ...extra },
});
const doc = () => ({
  items: [{ name: 'TEST_ONLY radio', qty: 3, prefix: 'R' }],
  moves: [
    { t: 'out', eid: 'TEST_ONLY_orphan', item: 'TEST_ONLY radio', ser: 'R-1', y: 1448, m: 1, d: 1, cond: '', name: 'TEST_ONLY old holder' },
  ],
});
const snap = (t) =>
  Object.fromEntries(
    [
      'kv',
      'meta',
      'revs',
      'sess',
      'aud',
      'authz',
      'daily_stats_days',
      'notification_messages',
      'notification_user_state',
      'custody_items',
      'custody_issues',
      'custody_movements',
    ].map((n) => [n, copy(t.DB.q('SELECT * FROM ' + n))]),
  );
function typedCU(rows, d = D1) {
  return { version: 1, scope: { departmentId: d }, rows };
}
function modern(t) {
  const file = full(t);
  file.domains = {
    dailyStats: { version: 1, data: { haram: {}, nabawi: {}, locks: {} } },
    notifications: emptyNF(),
    custody: [D1, D2].map((d) => typedCU({ items: [], issues: [], moves: [] }, d)),
  };
  file.manifest = {
    version: 1,
    scope: 'full',
    domains: { kv: 1, dailyStats: 1, notifications: 1, custody: 1 },
    departments: [D1, D2],
    keys: Object.keys(file.data),
  };
  return file;
}

test('legacy conversion requires explicit consent and never writes or accepts an undeclared modern fallback', async () => {
  const t = await world(),
    before = snap(t);
  await assert.rejects(t.convert(full(t), { legacyConsent: false }), (e) => e.rs === 'backup-legacy-consent-required');
  const file = modern(t);
  delete file.domains.custody;
  await assert.rejects(t.convert(file), (e) => e.rs === 'backup-incomplete-manifest');
  assert.deepEqual(snap(t), before);
});
test('legacy full conversion declares explicit empty scoped domains and preserves only unprovided global domains', async () => {
  const t = await world();
  await t.DB.batch([
    t.DB.prepare(
      "INSERT INTO notification_messages(scope,id,kind,type,category,priority,channel,title,body,created_at) VALUES('sys','TEST_ONLY_sys','event','sc_deny','sec','info','bell','TEST_ONLY','TEST_ONLY',1)",
    ),
    t.DB.prepare(
      "INSERT INTO notification_messages(scope,id,kind,type,category,priority,channel,title,body,created_at) VALUES('bc','TEST_ONLY_bc','broadcast','broadcast','bc','info','bell','TEST_ONLY','TEST_ONLY',1)",
    ),
    t.DB.prepare("INSERT INTO notification_type_overrides(type_id,enabled) VALUES('sc_deny',0)"),
  ]);
  const before = snap(t),
    out = await t.convert(full(t));
  assert.deepEqual(out.domains.notifications.messages.map((m) => m.scope).sort(), ['bc', 'sys']);
  assert.equal(out.domains.notifications.overrides.length, 1);
  assert.equal(out.domains.custody.length, 2);
  assert.ok(out.summary.emptyDomains.includes('custody:' + D1));
  assert.ok(out.summary.preservedGlobals.includes('dailyStats'));
  assert.ok(out.summary.preservedGlobals.includes('notifications:sys'));
  assert.deepEqual(snap(t), before);
  const supplied = await t.convert(full(t, { bassam_notif_sys_v1: '{"items":[],"read":{},"ack":{},"del":{},"seen":{},"v":1}' }));
  assert.deepEqual(
    supplied.domains.notifications.messages.map((m) => m.scope),
    ['bc'],
  );
  assert.equal(supplied.domains.notifications.overrides.length, 1);
  assert.equal(supplied.summary.preservedGlobals.includes('notifications:sys'), false);
});
test('legacy custody uses the validated converter and preserves optional empty fields and orphan snapshots', async () => {
  const t = await world(),
    legacy = doc(),
    out = await t.convert(full(t, { ['bsdept:' + D1 + ':bassam_custody_v1']: JSON.stringify(legacy) })),
    domain = out.domains.custody.find((d) => d.scope.departmentId === D1);
  assert.deepEqual(cuInflate(domain.rows), legacy);
  assert.equal(out.keys['bsdept:' + D1 + ':bassam_custody_v1'], undefined);
  assert.equal(domain.rows.moves[0].holder_key, 'TEST_ONLY_orphan');
});

test('legacy daily stats retain absent versus null versus zero and normalize only the documented legacy lock key', async () => {
  const t = await world(),
    data = {
      haram: { '1448-01-01': { worshippers: 0, umrah: null } },
      nabawi: { '1448-01-01': { worshippers: null, rawdah_men_reserved: 0 } },
      locks: { 'haram|1448-01': true },
    },
    out = await t.convert(full(t, { bassam_dstats_v1: JSON.stringify(data) }));
  assert.deepEqual(out.domains.dailyStats.data, { ...data, locks: { 'haram|1448-1': true } });
  assert.equal(Object.hasOwn(out.domains.dailyStats.data.haram['1448-01-01'], 'carts'), false);
  assert.equal(out.keys.bassam_dstats_v1, undefined);
  assert.equal(out.summary.preservedGlobals.includes('dailyStats'), false);
});
test('ambiguous old custody serials fail without business, account, audit or revision mutations', async () => {
  const t = await world(),
    legacy = doc();
  legacy.items.push({ name: 'TEST_ONLY second', qty: 2, prefix: 'R' });
  legacy.moves.push({ ...legacy.moves[0], item: 'TEST_ONLY second' });
  const before = snap(t);
  await assert.rejects(
    t.convert(full(t, { ['bsdept:' + D1 + ':bassam_custody_v1']: JSON.stringify(legacy) })),
    (e) => e.cuCode === 'custody-cutover-serial-ambiguous',
  );
  assert.deepEqual(snap(t), before);
});
test('normalized plus legacy sources of the same domain are rejected, while phase5 typed DS/NF plus old custody is valid', async () => {
  const t = await world();
  for (const [key, domain, raw] of [
    ['bsdept:' + D1 + ':bassam_custody_v1', 'custody', JSON.stringify(doc())],
    ['bassam_notif_sys_v1', 'notifications', '{}'],
    ['bassam_dstats_v1', 'dailyStats', '{}'],
  ]) {
    const file = modern(t);
    delete file.manifest;
    file.data[key] = raw;
    await assert.rejects(t.convert(file), (e) => e.rs === 'backup-duplicate-domain-source', domain);
  }
  const file = modern(t);
  delete file.manifest;
  delete file.domains.custody;
  file.data['bsdept:' + D1 + ':bassam_custody_v1'] = JSON.stringify(doc());
  const out = await t.convert(file);
  assert.equal(out.domains.custody[0].rows.moves.length, 1);
});
test('modern manifest requires its exact declared key/dept/domain coverage and preserves account JSON byte-for-byte', async () => {
  const t = await world(),
    file = modern(t),
    raw = JSON.stringify(t.keys.bassam_auth_users_v1);
  file.data.bassam_auth_users_v1 = raw;
  file.manifest.keys.push('bassam_auth_users_v1');
  const out = await t.convert(file);
  assert.equal(out.keys.bassam_auth_users_v1, raw);
  assert.equal(out.summary.legacy, false);
  assert.deepEqual(out.summary.emptyDomains, []);
  for (const mutate of [
    (f) => f.manifest.keys.pop(),
    (f) => f.manifest.departments.pop(),
    (f) => f.domains.custody.pop(),
    (f) => delete f.domains.notifications,
    (f) => (f.data['bsdept:' + D1 + ':bassam_custody_v1'] = '{"items":[],"moves":[]}'),
  ]) {
    const broken = copy(file);
    mutate(broken);
    await assert.rejects(t.convert(broken));
  }
});
test('legacy full flat requires an explicit department scope and never guesses a display name or an active department', async () => {
  const t = await world(),
    file = {
      kind: 'full',
      dept: 'TEST_ONLY display name, not an ID',
      data: { bassam_employees_v1: '[]', bassam_custody_v1: JSON.stringify(doc()) },
    };
  await assert.rejects(t.convert(file), (e) => e.rs === 'backup-flat-requires-explicit-department');
  const out = await t.convert(file, { scope: { kind: 'dept', departmentId: D2 } });
  assert.equal(out.domains.custody[0].scope.departmentId, D2);
  assert.ok(Object.hasOwn(out.keys, 'bsdept:' + D2 + ':bassam_employees_v1'));
  assert.deepEqual(out.manifest.keys, ['bassam_employees_v1']);
  assert.equal(out.summary.remapped, false);
});
test('explicit scoped backup remap changes only department columns and retains historical account/holder identities', async () => {
  const t = await world(),
    cu = t.W.cuConvert(D1, doc()),
    file = {
      app: 'bassam-crowd',
      version: 3,
      kind: 'dept',
      data: { bassam_employees_v1: '[]' },
      domains: { custody: [typedCU(cu)], notifications: emptyNF() },
      manifest: {
        version: 1,
        scope: 'dept',
        domains: { kv: 1, notifications: 1, custody: 1 },
        departments: [D1],
        keys: ['bassam_employees_v1'],
      },
      perms: { capSet: false, emps: {} },
    };
  const out = await t.convert(file, { scope: { kind: 'dept', departmentId: D2 } });
  assert.equal(out.domains.custody[0].rows.moves[0].department_id, D2);
  assert.equal(out.domains.custody[0].rows.moves[0].holder_key, cu.moves[0].holder_key);
  assert.equal(out.domains.custody[0].rows.moves[0].actor_uid, cu.moves[0].actor_uid);
  assert.deepEqual(out.permissionSlice, file.perms);
  assert.deepEqual(out.manifest.departments, [D2]);
  assert.equal(out.summary.remapped, true);
});
test('scoped legacy notification conversion uses known source identities and remaps no account IDs', async () => {
  const t = await world(),
    store = {
      v: 1,
      items: [
        {
          id: 'TEST_ONLY_message',
          type: 'emp_add',
          k: 'emp',
          dept: D1,
          lvl: 'info',
          chan: 'bell',
          t: 'TEST_ONLY',
          b: 'TEST_ONLY',
          at: 1,
          to: { r: ['mgr'] },
        },
      ],
      read: { [IDS.manager1]: { TEST_ONLY_message: 2 } },
      ack: {},
      del: {},
      seen: {},
    },
    file = { kind: 'dept', data: { ['bsdept:' + D1 + ':bassam_notif_v1']: JSON.stringify(store) } };
  const out = await t.convert(file, { scope: { kind: 'dept', departmentId: D2 } });
  assert.equal(out.domains.notifications.messages[0].scope, 'd:' + D2);
  assert.equal(out.domains.notifications.messages[0].department, D2);
  assert.equal(out.domains.notifications.states[0].account_uid, IDS.manager1);
  assert.equal(out.domains.notifications.states[0].message_scope, 'd:' + D2);
});
test('scope ambiguity, global DS in department files, recovery/device keys, malformed JSON and image bodies fail explicitly', async () => {
  const t = await world(),
    before = snap(t);
  const cases = [
    { ...full(t), data: { bassam_session_v1: '{}' } },
    { ...full(t), data: { bassam_auth_recovery_v1: '{}' } },
    full(t, { ['bsdept:' + D1 + ':bassam_employees_v1']: 'TEST_ONLY_invalid_secret_never_echo' }),
    { ...full(t), idbImages: { TEST_ONLY: 'TEST_ONLY_IMAGE_BYTES' } },
  ];
  for (const file of cases)
    await assert.rejects(t.convert(file), (e) => !e.message.includes('never_echo') && !e.message.includes('IMAGE_BYTES'));
  await assert.rejects(
    t.convert({ kind: 'dept', data: { bassam_dstats_v1: '{}' } }, { scope: { kind: 'dept', departmentId: D1 } }),
    (e) => e.rs === 'backup-global-domain-in-department',
  );
  await assert.rejects(
    t.convert(
      { kind: 'dept', data: { ['bsdept:' + D1 + ':bassam_employees_v1']: '[]', ['bsdept:' + D2 + ':bassam_options_v1']: '{}' } },
      { scope: { kind: 'dept', departmentId: D1 } },
    ),
    (e) => e.rs === 'backup-ambiguous-department',
  );
  assert.deepEqual(snap(t), before);
});
test('active-department preference is explicitly ignored without returning its value or silently skipping malformed business entries', async () => {
  const t = await world(),
    out = await t.convert(full(t, { bassam_active_dept_v1: 'TEST_ONLY_PRIVATE_PREFERENCE' }));
  assert.equal(out.keys.bassam_active_dept_v1, undefined);
  assert.deepEqual(out.summary.ignoredDevicePreferences, ['bassam_active_dept_v1']);
  assert.equal(JSON.stringify(out.summary).includes('PRIVATE_PREFERENCE'), false);
  const absent = await t.convert(full(t, { bassam_active_dept_v1: null }));
  assert.deepEqual(absent.summary.ignoredDevicePreferences, ['bassam_active_dept_v1']);
});

test('preserved notification states are guarded across conversion and planning even when NF_REV does not advance', async () => {
  const t = await world();
  await t.DB.batch([
    t.DB.prepare(
      "INSERT INTO notification_messages(scope,id,kind,type,category,priority,channel,title,body,created_at) VALUES('sys','TEST_ONLY_sys','event','sc_deny','sec','info','bell','TEST_ONLY','TEST_ONLY',1)",
    ),
  ]);
  const out = await t.convert(full(t)),
    revision = copy(t.DB.q("SELECT * FROM revs WHERE k='nf_messages'"));
  assert.ok(out.readGuards.length);
  await t.DB.batch([
    t.DB.prepare(
      "INSERT INTO notification_user_state(account_uid,message_scope,message_id,read_at) VALUES(?1,'sys','TEST_ONLY_sys',2)",
    ).bind(IDS.super),
  ]);
  const afterConcurrent = snap(t);
  await assert.rejects(
    t.DB.batch([...out.readGuards, t.DB.prepare("INSERT INTO kv(k,seq,v) VALUES('TEST_ONLY_should_not_write',0,'{}')")]),
  );
  assert.deepEqual(snap(t), afterConcurrent);
  assert.deepEqual(t.DB.q("SELECT * FROM revs WHERE k='nf_messages'"), revision);
});
test('preserved daily-stat rows use exact read witnesses against a raw writer that leaves the revision untouched', async () => {
  const t = await world(),
    out = await t.convert(full(t));
  await t.DB.batch([t.DB.prepare("INSERT INTO daily_stats_days(site,hijri_date,field_mask,worshippers) VALUES('haram','1448-01-01',1,0)")]);
  const afterConcurrent = snap(t);
  await assert.rejects(
    t.DB.batch([...out.readGuards, t.DB.prepare("INSERT INTO kv(k,seq,v) VALUES('TEST_ONLY_should_not_write',0,'{}')")]),
  );
  assert.deepEqual(snap(t), afterConcurrent);
});
