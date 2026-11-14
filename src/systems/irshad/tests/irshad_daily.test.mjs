/* Lazy SQL ir_day replacement on the real canonical Worker/SQLite. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { world, seed, ROOT, D1, D2, IDS } from '../../../../tests/unit/irshad_domain_fx.mjs';

const DUE = Date.parse('2026-10-30T20:31:00Z'); // Riyadh23:31.
const clone = x => JSON.parse(JSON.stringify(x));
async function clockTest(fn) {
  const RealDate = globalThis.Date, box = { now: DUE };
  globalThis.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [box.now])); }
    static now() { return box.now; }
  };
  try { await fn(now => { box.now = typeof now === 'number' ? now : RealDate.parse(now); }); }
  finally { globalThis.Date = RealDate; }
}
async function fixture({ rows = true } = {}) {
  const B = await world({ extraExports: ['nfIrshadDaily', 'pfHijriAt', 'NF_REV', 'nfFeed'] });
  const perms = clone(B.keys.bassam_perms_v1);
  Object.keys(perms.caps).forEach(d => { if (!perms.caps[d].includes('irshad')) perms.caps[d].push('irshad'); });
  B.DB.db.prepare('UPDATE kv SET v=? WHERE k=? AND seq=0').run(JSON.stringify(perms), 'bassam_perms_v1');
  const day = B.W.pfHijriAt(DUE), reports = rows ? [
    { id: 'TEST_ONLY_daily_first', y: day.y, m: day.m, d: day.d, shift: 'TEST_ONLY_shift', loc: 'TEST_ONLY_first_location', langs: [{ lang: 'TEST_ONLY', count: 99 }], bro: 88, n: 77 },
    { id: 'TEST_ONLY_daily_second', y: day.y, m: day.m, d: day.d, shift: 'TEST_ONLY_shift', loc: 'TEST_ONLY_second_location', langs: [{ lang: 'TEST_ONLY', count: 20 }] },
  ] : [];
  await seed(B, { reports: { reports } });
  await seed(B, { reports: { reports: [{ id: 'TEST_ONLY_foreign_daily', y: day.y, m: day.m, d: day.d, loc: 'TEST_ONLY_FOREIGN' }] } }, D2);
  const actor = who => B.W.actorOf(B.env, IDS[who]);
  const poll = async (who = 'super', dept = D1, A) => B.W.nfIrshadDaily(B.env, A || await actor(who), new URL('http://x/api/notifications?dept=' + encodeURIComponent(dept)));
  return Object.assign(B, { day, perms, actor, poll });
}
const messages = B => B.DB.q("SELECT * FROM notification_messages WHERE type='ir_day' ORDER BY scope,id");
function state(B) {
  return Object.fromEntries(['meta', 'revs', 'aud', 'notification_messages', 'notification_targets', 'notification_dedup'].map(t => [t, clone(B.DB.q('SELECT * FROM ' + t))]));
}
function raceBeforeCommit(B, change) {
  const prepare = B.DB.prepare.bind(B.DB); let fired = false;
  B.DB.prepare = sql => {
    if (!fired && sql.includes('KIVO_IRSHAD_DAILY_SEEN')) { fired = true; change(); }
    return prepare(sql);
  };
  return () => fired;
}

test('Daily uses the old unpadded Hijri once key and only the23:30 Riyadh window', async () => clockTest(async set => {
  const B = await fixture(), source = fs.readFileSync(path.join(ROOT, 'src/services/442-notif-observer.js'), 'utf8');
  const start = source.indexOf('function todayKey()'), end = source.indexOf('  function tick()', start);
  const context = { Date: globalThis.Date, Intl: { DateTimeFormat: function (locale, opts) { return new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'Asia/Riyadh' }); } } };
  vm.runInNewContext(source.slice(start, end) + '\nthis.result=todayKey();', context);
  assert.equal(B.day.dk, context.result.key, 'Actual old observer function, with its browser timezone set to Riyadh');
  set('2026-10-30T20:29:59Z'); assert.equal((await B.poll()).emitted, 0); assert.equal(messages(B).length, 0);
  set('2026-10-30T21:00:00Z'); assert.equal((await B.poll()).emitted, 0); assert.equal(messages(B).length, 0);
  set(DUE); assert.equal((await B.poll()).emitted, 1);
  const message = messages(B)[0], once = B.DB.q('SELECT once_key FROM notification_dedup WHERE scope=? AND message_id=?', message.scope, message.id);
  assert.deepEqual(once.map(r => r.once_key), ['ir_day:' + B.day.dk]);
}));

test('The current reports summary preserves items/n count0 and first-sequence location ties, active department only', async () => clockTest(async () => {
  const B = await fixture(), irBefore = await B.W.irRevs(B.env, D1);
  const ack = await B.poll(); assert.equal(ack.emitted, 1);
  const rows = messages(B); assert.equal(rows.length, 1); const row = rows[0];
  assert.equal(row.department, D1); assert.equal(row.scope, 'd:' + D1); assert.equal(row.server_origin, 1);
  assert.match(row.body, /2 محضراً/); assert.match(row.body, /0 مستفيداً/); assert.ok(row.body.includes('TEST_ONLY_first_location'));
  assert.equal(row.body.includes('TEST_ONLY_FOREIGN'), false);
  assert.deepEqual(await B.W.irRevs(B.env, D1), irBefore, 'No IR resource revision is advanced by a daily notification');
  assert.ok(B.DB.q('SELECT rev FROM revs WHERE k=?', B.W.NF_REV)[0].rev > 0);
  const targets = B.DB.q('SELECT * FROM notification_targets WHERE scope=? AND message_id=?', row.scope, row.id);
  assert.ok(targets.some(t => t.value === 'mgr'));
}));

test('Repeated and concurrent polls emit exactly one message and advance no second NF revision', async () => clockTest(async () => {
  const B = await fixture(), globalBefore = Math.max(Number(B.DB.q("SELECT v FROM meta WHERE k='rev'")[0]?.v || 0), ...B.DB.q('SELECT rev FROM revs').map(r => r.rev)),
    pair = await Promise.all([B.poll(), B.poll()]);
  assert.equal(pair.reduce((n, x) => n + x.emitted, 0), 1); assert.equal(messages(B).length, 1);
  assert.equal(Number(B.DB.q("SELECT v FROM meta WHERE k='rev'")[0].v), globalBefore + 1, 'The concurrent loser cannot allocate a revision before its dedup guard');
  assert.equal(B.DB.q("SELECT COUNT(*) n FROM notification_dedup WHERE scope=? AND once_key=?", 'd:' + D1, 'ir_day:' + B.day.dk)[0].n, 1);
  const before = state(B); assert.equal((await B.poll()).emitted, 0); assert.deepEqual(state(B), before);
}));

test('Ordinary staff, foreign/unknown active departments and missing IR caps do not block the remaining feed', async () => clockTest(async () => {
  const B = await fixture();
  assert.equal((await B.poll('employee1')).emitted, 0);
  assert.equal((await B.poll('manager2', D1)).emitted, 0);
  assert.equal((await B.poll('super', 'TEST_ONLY_unknown_department')).emitted, 0);
  const oldManager = await B.actor('manager1'), users = clone(B.users); users.find(x => x.id === IDS.manager1).mgr = 0;
  B.DB.db.prepare('UPDATE kv SET v=? WHERE k=? AND seq=0').run(JSON.stringify(users), 'bassam_auth_users_v1');
  assert.equal((await B.poll('manager1', D1, oldManager)).emitted, 0, 'Fresh role is checked after coherent capture');
  B.DB.db.prepare('UPDATE kv SET v=? WHERE k=? AND seq=0').run(JSON.stringify(B.users), 'bassam_auth_users_v1');
  const perms = clone(B.perms); Object.keys(perms.caps).forEach(d => { perms.caps[d] = perms.caps[d].filter(x => x !== 'irshad'); });
  B.DB.db.prepare('UPDATE kv SET v=? WHERE k=? AND seq=0').run(JSON.stringify(perms), 'bassam_perms_v1');
  assert.equal((await B.poll('manager1')).emitted, 0); assert.equal(messages(B).length, 0);
  const feed = await B.W.nfFeed(B.env, await B.actor('employee1'), new URL('http://x/api/notifications?dept=' + D1));
  assert.equal(feed.ok, 1, 'A staff notification feed is independent of manager-only daily generation');
}));

test('No reports or disabled configuration create no once row or revision', async () => clockTest(async () => {
  const empty = await fixture({ rows: false }), beforeEmpty = state(empty);
  assert.equal((await empty.poll()).emitted, 0); assert.deepEqual(state(empty), beforeEmpty);
  const B = await fixture(); B.DB.db.prepare("INSERT INTO notification_type_overrides(type_id,enabled)VALUES('ir_day',0)").run();
  const before = state(B); assert.equal((await B.poll()).emitted, 0); assert.deepEqual(state(B), before);
}));

test('A raw authority change without a revision aborts all daily writes and maps to NF conflict', async () => clockTest(async () => {
  const B = await fixture(), before = state(B), fired = raceBeforeCommit(B, () => {
    const p = clone(B.perms); p.TEST_ONLY_manual_authority_change = true;
    B.DB.db.prepare('UPDATE kv SET v=? WHERE k=? AND seq=0').run(JSON.stringify(p), 'bassam_perms_v1');
  });
  await assert.rejects(B.poll(), e => e.nf === 'conflict' && e.status === 409);
  assert.equal(fired(), true); assert.deepEqual(state(B), before); assert.equal(messages(B).length, 0);
}));

test('Config and restore-epoch races roll back message, targets, dedup and NF/global revisions', async () => clockTest(async () => {
  for (const kind of ['config', 'epoch']) {
    const B = await fixture(), before = state(B), fired = raceBeforeCommit(B, () => {
      if (kind === 'config') B.DB.db.prepare("INSERT INTO notification_type_overrides(type_id,enabled)VALUES('ir_day',0)").run();
      else B.DB.db.prepare("UPDATE meta SET v=CAST(CAST(v AS INTEGER)+1 AS TEXT) WHERE k='restore_epoch'").run();
    });
    await assert.rejects(B.poll(), e => e.nf === 'conflict' && e.status === 409); assert.equal(fired(), true);
    const after = state(B);
    if (kind === 'epoch') before.meta = before.meta.map(r => r.k === 'restore_epoch' ? { ...r, v: String(Number(r.v) + 1) } : r);
    assert.deepEqual(after, before, kind + ': only the concurrent external change survives');
  }
}));

test('A late SQL failure leaves no partial daily state, and retired NF sources return NF503', async () => clockTest(async () => {
  const B = await fixture(), before = state(B);
  B.DB.failIf = sql => sql.includes('INSERT INTO notification_messages(');
  await assert.rejects(B.poll(), /injected failure/); B.DB.failIf = null;
  assert.deepEqual(state(B), before);
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_notif_cfg_v1', '{}'));
  await assert.rejects(B.poll(), e => e.nf === 'notification-legacy-source-present' && e.status === 503);
  assert.deepEqual(state(B), before);
}));
