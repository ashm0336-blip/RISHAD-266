/* Independent API boundary tests against canonical source, with SQLite fixtures only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, D1, D2, IDS, EKEYS, identitySnapshot, notificationSnapshot } from './notifications_review_fx.mjs';

function ok(result, label = 'operation') {
  assert.equal(result.status, 200, label + ': status');
  assert.equal(result.json?.ok, 1, label + ': explicit server acknowledgement');
  assert.ok(Number.isSafeInteger(result.json.rev) && result.json.rev >= 0, label + ': numeric revision');
  return result.json;
}
const emit = (W, who, { own = [EKEYS.employee1], dept = D1, ...extra } = {}) => W.act(who, {
  op: 'emit', type: 'task_new', dept, own, vars: { 'المهمة': 'TEST_ONLY task', 'الوقت': 'TEST_ONLY' }, title: 'TEST_ONLY notification', ...extra
});
async function item(W, who, id, query = {}) {
  const read = ok(await W.get(who, query), 'read');
  assert.ok(Array.isArray(read.items));
  return read.items.find(record => record.id === id);
}

test('notification APIs require a live account and never allow exporting through a staff session', async () => {
  const W = await world(), identities = identitySnapshot(W.DB);
  assert.equal((await W.get(null)).status, 401);
  assert.equal((await W.get('frozen')).status, 401);
  assert.equal((await W.api('employee1', '/api/notifications/export')).status, 403);
  assert.deepEqual(identitySnapshot(W.DB), identities, 'Reads and rejected operations must not rewrite identity or permissions');
});

test('department and branch boundaries apply to notification reads and emissions', async () => {
  const W = await world();
  const sent = ok(await emit(W, 'manager2', { dept: D2, own: [EKEYS.employee2] }));
  assert.ok(await item(W, 'employee2', sent.id, { dept: D2 }));
  assert.equal((await W.get('employee1', { dept: D2 })).status, 403);
  assert.equal((await W.get('gm', { dept: D2 })).status, 403, 'A general manager cannot request a different branch');
  const before = notificationSnapshot(W.DB);
  assert.equal((await emit(W, 'employee1', { dept: D2, own: [EKEYS.employee2] })).status, 403);
  assert.equal((await emit(W, 'gm', { dept: D2, own: [EKEYS.employee2] })).status, 403);
  assert.deepEqual(notificationSnapshot(W.DB), before, 'Scope denial must leave notification business rows unchanged');
});

test('read and acknowledgement belong to the session actor, including under concurrent requests', async () => {
  const W = await world();
  const sent = ok(await emit(W, 'manager1', { own: [EKEYS.employee1, EKEYS.leader] }));
  assert.equal((await item(W, 'employee1', sent.id)).un, true);
  assert.equal((await item(W, 'leader', sent.id)).un, true);
  const forged = await W.act('employee1', { uid: IDS.leader, op: 'state', action: 'ack', id: sent.id });
  assert.equal(forged.status, 409, 'A tab cannot mutate state for another logged-in identity');
  assert.equal((await item(W, 'leader', sent.id)).acked, false);
  const [acknowledged, another] = await Promise.all([
    W.act('employee1', { op: 'state', action: 'ack', id: sent.id }),
    emit(W, 'manager1', { own: [EKEYS.employee1, EKEYS.leader], once: 'TEST_ONLY_parallel_append' })
  ]);
  ok(acknowledged); const appended = ok(another);
  const own = await item(W, 'employee1', sent.id), peer = await item(W, 'leader', sent.id);
  assert.equal(own.un, false); assert.equal(own.acked, true);
  assert.equal(peer.un, true); assert.equal(peer.acked, false, 'An acknowledgement must never mutate another recipient');
  assert.ok(await item(W, 'employee1', appended.id), 'A concurrent state update must not lose a new message');
});

test('an explicitly assigned notification remains visible without the target page grant', async () => {
  const W = await world();
  const sent = ok(await emit(W, 'manager1', { own: [EKEYS.noView] }));
  assert.ok(await item(W, 'noView', sent.id), 'The original own-recipient exception is preserved');
  assert.equal(await item(W, 'employee1', sent.id), undefined, 'Another ordinary employee is not an implicit recipient');
});

test('simultaneous once keys create one message and one dedup record rather than duplicate notifications', async () => {
  const W = await world();
  const results = await Promise.all([emit(W, 'manager1', { once: 'TEST_ONLY_same_event' }), emit(W, 'manager1', { once: 'TEST_ONLY_same_event' })]);
  const acks = results.map(result => ok(result));
  const read = ok(await W.get('employee1'));
  assert.equal(read.items.length, 1, 'The event is inserted once across concurrent requests');
  assert.equal(acks.filter(ack => ack.duplicate === true || ack.duplicate === 1).length, 1, 'The second request is explicitly acknowledged as a duplicate');
  assert.equal(W.DB.q('SELECT COUNT(*) AS n FROM notification_dedup')[0].n, 1);
});

test('a late relational insert failure rolls back the message, targets, dedup and notification revision', async () => {
  const W = await world(), before = notificationSnapshot(W.DB), base = ok(await W.get('super')).rev;
  W.DB.failIf = sql => /^INSERT(?: OR (?:IGNORE|REPLACE))? INTO notification_targets\b/.test(sql);
  const failed = await emit(W, 'manager1', { once: 'TEST_ONLY_rollback' });
  W.DB.failIf = null;
  assert.equal(failed.status, 500, 'The API cannot acknowledge an incomplete insertion');
  assert.deepEqual(notificationSnapshot(W.DB), before);
  assert.equal(ok(await W.get('super')).rev, base);
  const retried = ok(await emit(W, 'manager1', { once: 'TEST_ONLY_rollback' }));
  assert.ok(await item(W, 'employee1', retried.id), 'A failed insertion must not consume its once key');
});

test('caller-supplied author fields and updates to an invisible message never mutate notification rows', async () => {
  const W = await world();
  const hidden = ok(await emit(W, 'manager2', { dept: D2, own: [EKEYS.employee2] }));
  const before = notificationSnapshot(W.DB);
  const forgedAuthor = await emit(W, 'employee1', { by: IDS.super, byName: 'TEST_ONLY forged author' });
  assert.equal(forgedAuthor.status, 400, 'The author is chosen by the server rather than accepted from the request');
  for (const action of ['read', 'ack', 'dismiss']) {
    const denied = await W.act('employee1', { op: 'state', action, id: hidden.id });
    assert.ok(denied.status === 403 || denied.status === 404, action + ': invisible message is rejected');
  }
  assert.deepEqual(notificationSnapshot(W.DB), before);
});

test('all retired notification keys reject a mixed legacy save before its unrelated value is written', async () => {
  const W = await world(), before = identitySnapshot(W.DB);
  const retired = ['bsdept:' + D1 + ':bassam_notif_v1', 'bassam_notif_sys_v1', 'bassam_bc_v1', 'bassam_notif_cfg_v1'];
  const platformBefore = W.DB.q("SELECT seq,v FROM kv WHERE k='bassam_platform_v1' ORDER BY seq");
  for (const key of retired) {
    const result = await W.api('super', '/api/save', { method: 'POST', body: { uid: IDS.super, set: { [key]: '{"TEST_ONLY":"retired"}', bassam_platform_v1: '{"TEST_ONLY":"must not write"}' }, del: [], base: {} } });
    assert.equal(result.status, 200); assert.equal(result.json.atomic, 'domain-moved');
    assert.equal(result.json.denied?.[key]?.why, 'domain-moved');
    assert.deepEqual(W.DB.q("SELECT seq,v FROM kv WHERE k='bassam_platform_v1' ORDER BY seq"), platformBefore);
    assert.equal(W.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1', key)[0].n, 0);
  }
  assert.deepEqual(identitySnapshot(W.DB), before);
});

test('staff can emit their own security notice without gaining system or another account audience', async () => {
  const W = await world();
  const own = ok(await emit(W, 'employee1', { type: 'sc_dev', own: [EKEYS.employee1], vars: { 'الجهاز': 'TEST_ONLY browser' } }));
  assert.ok(await item(W, 'employee1', own.id));
  assert.equal(await item(W, 'leader', own.id), undefined);
  const before = notificationSnapshot(W.DB);
  assert.equal((await emit(W, 'employee1', { type: 'sc_dev', own: [EKEYS.leader] })).status, 403, 'The self-security exception must not authorize targeting another person');
  assert.equal((await emit(W, 'employee1', { type: 'sy_plat', own: [] })).status, 403, 'A self notice does not grant system notification authority');
  assert.deepEqual(notificationSnapshot(W.DB), before);
});

test('security polling processes every record when more than one page shares a timestamp', async () => {
  const W = await world(), timestamp = Date.now() - 1000;
  const inserts = Array.from({ length: 201 }, (_, i) => W.DB.prepare('INSERT INTO sec(ts,uid,un,act,target,detail,ip) VALUES(?1,?2,?3,?4,?5,?6,?7)')
    .bind(timestamp, IDS.manager1, 'TEST_ONLY', 'policy_change', 'TEST_ONLY policy', 'TEST_ONLY security event ' + i, 'TEST_ONLY'));
  await W.DB.batch(inserts);
  ok(await W.act('super', { op: 'security-poll' }));
  ok(await W.act('super', { op: 'security-poll' }));
  assert.equal(W.DB.q("SELECT COUNT(*) n FROM notification_messages WHERE type='sc_policy'")[0].n, 201, 'The final row of a shared timestamp must not be skipped by the checkpoint');
  assert.equal(W.DB.q("SELECT COUNT(*) n FROM notification_dedup WHERE once_key LIKE 'security:%'")[0].n, 201);
  ok(await W.act('super', { op: 'security-poll' }));
  assert.equal(W.DB.q("SELECT COUNT(*) n FROM notification_messages WHERE type='sc_policy'")[0].n, 201, 'Polling a completed checkpoint is idempotent');
});

test('a failed security-event insertion does not advance the shared checkpoint or consume its once key', async () => {
  const W = await world();
  await W.DB.prepare('INSERT INTO sec(ts,uid,un,act,target,detail,ip) VALUES(?1,?2,?3,?4,?5,?6,?7)')
    .bind(Date.now() - 1000, IDS.manager1, 'TEST_ONLY', 'policy_change', 'TEST_ONLY', 'TEST_ONLY retry security event', 'TEST_ONLY').run();
  const before = notificationSnapshot(W.DB);
  W.DB.failIf = sql => /^INSERT(?: OR (?:IGNORE|REPLACE))? INTO notification_targets\b/.test(sql);
  const failed = await W.act('super', { op: 'security-poll' }); W.DB.failIf = null;
  assert.equal(failed.status, 500); assert.deepEqual(notificationSnapshot(W.DB), before);
  ok(await W.act('super', { op: 'security-poll' }));
  assert.equal(W.DB.q("SELECT COUNT(*) n FROM notification_messages WHERE type='sc_policy'")[0].n, 1, 'The failed event remains eligible on the next poll');
});

test('mandatory broadcast acknowledgement and general-manager department targeting are enforced on the server', async () => {
  const W = await world(), base = ok(await W.get('super')).broadcastRev;
  const created = ok(await W.act('super', { op: 'broadcast', base, b: { title: 'TEST_ONLY mandatory notice', body: 'TEST_ONLY content', ack: true, pin: true, target: { mode: 'dept', sel: [D1] } } }));
  const find = async who => ok(await W.get(who, { all: '1' })).items.find(x => x.bcId === created.id);
  const target = await find('employee1'); assert.ok(target); assert.equal(target.ack, true);
  assert.ok(await find('gm'), 'The general manager of the selected department is a recipient');
  assert.equal(await find('employee2'), undefined, 'The department selector must not broadcast outside its scope');
  const another = ok(await W.act('super', { op: 'broadcast', base: ok(await W.get('super')).broadcastRev, b: { title: 'TEST_ONLY other branch', body: 'TEST_ONLY content', target: { mode: 'dept', sel: [D2] } } }));
  assert.equal(ok(await W.get('gm', { all: '1' })).items.some(x => x.bcId === another.id), false, 'A general manager does not receive every department broadcast');
  assert.equal((await W.act('employee1', { op: 'state', action: 'dismiss', id: target.id })).status, 403);
  ok(await W.act('employee1', { op: 'state', action: 'dismiss-all', all: true })); assert.ok(await find('employee1'), 'Bulk dismissal also leaves an unacknowledged mandatory notice visible');
  ok(await W.act('employee1', { op: 'state', action: 'ack', id: target.id }));
  ok(await W.act('employee1', { op: 'state', action: 'dismiss', id: target.id })); assert.equal(await find('employee1'), undefined);
  assert.ok(await find('leader'), 'Another recipient keeps an independent state');
});

test('configuration and broadcast CAS are separate from feed updates and from each other', async () => {
  const W = await world(), start = ok(await W.get('super'));
  const message = ok(await emit(W, 'manager1'));
  const configured = ok(await W.act('super', { op: 'config', base: start.configRev, patch: { task_new: { on: false } } }));
  assert.ok(configured.configRev > start.configRev);
  ok(await W.act('employee1', { op: 'state', action: 'read', id: message.id }));
  const created = ok(await W.act('super', { op: 'broadcast', base: start.broadcastRev, b: { title: 'TEST_ONLY independent resource', body: 'TEST_ONLY content' } }));
  assert.ok(created.broadcastRev > start.broadcastRev);
  assert.equal((await W.act('super', { op: 'config', base: start.configRev, patch: { task_new: { on: true } } })).status, 409);
  assert.equal((await W.act('super', { op: 'withdraw', base: start.broadcastRev, id: created.id })).status, 409);
  const read = ok(await W.get('super', { manage: '1' })); assert.equal(read.cfg.t.task_new.on, false); assert.equal(read.broadcasts.find(x => x.id === created.id).wd, 0);
});

test('scheduled, expired and withdrawn broadcasts follow the clock rather than a client-only filter', async t => {
  const timestamp = Date.now(); t.mock.timers.enable({ apis: ['Date'], now: timestamp });
  const W = await world(), created = ok(await W.act('super', { op: 'broadcast', base: ok(await W.get('super')).broadcastRev, b: { title: 'TEST_ONLY scheduled', body: 'TEST_ONLY content', at: timestamp + 60000, expDays: 1, target: { mode: 'dept', sel: [D1] } } }));
  const present = async () => ok(await W.get('employee1')).items.some(x => x.bcId === created.id);
  assert.equal(await present(), false); t.mock.timers.tick(60001); assert.equal(await present(), true);
  t.mock.timers.tick(86400000);
  await W.DB.prepare('UPDATE sess SET ts=?1,la=?1').bind(Date.now()).run();
  assert.equal(await present(), false, 'Expired messages are absent from the server response');
  const fresh = ok(await W.act('super', { op: 'broadcast', base: ok(await W.get('super')).broadcastRev, b: { title: 'TEST_ONLY withdrawn', body: 'TEST_ONLY content' } }));
  ok(await W.act('super', { op: 'withdraw', base: fresh.broadcastRev, id: fresh.id }));
  assert.equal(ok(await W.get('employee1')).items.some(x => x.bcId === fresh.id), false);
});

test('full notification export contains normalized rows and current-account state without identity credentials', async () => {
  const W = await world(), event = ok(await emit(W, 'manager1', { once: 'TEST_ONLY_export_once' }));
  ok(await W.act('employee1', { op: 'state', action: 'ack', id: event.id }));
  ok(await W.act('super', { op: 'config', base: ok(await W.get('super')).configRev, patch: { task_new: { lvl: 'urg', on: false } } }));
  const exported = ok(await W.api('super', '/api/notifications/export'));
  assert.equal(exported.domain.version, 1);
  const tables = { messages: 'notification_messages', targets: 'notification_targets', states: 'notification_user_state', dedup: 'notification_dedup', overrides: 'notification_type_overrides', checkpoints: 'notification_checkpoints' };
  const actual = notificationSnapshot(W.DB);
  for (const [key, table] of Object.entries(tables)) assert.deepEqual([...exported.domain[key]].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), actual[table], key + ': all typed rows are exported');
  const text = JSON.stringify(exported.domain); assert.equal(text.includes('p2$'), false); assert.equal(text.includes('bassam_auth_users_v1'), false);
});

test('a paginated employee feed does not materialize messages or thousands of states belonging to another department', async () => {
  const W = await world(), now = Date.now() - 1000;
  const message = W.DB.db.prepare("INSERT INTO notification_messages(scope,id,kind,department,type,category,priority,channel,title,body,created_at) VALUES(?,?,'event',?,'task_new','task','act','bell',?,? ,?)");
  const target = W.DB.db.prepare("INSERT INTO notification_targets(scope,message_id,kind,value) VALUES(?,?,'employee',?)");
  const state = W.DB.db.prepare('INSERT INTO notification_user_state(account_uid,message_scope,message_id,read_at) VALUES(?,?,?,?)');
  W.DB.exec('BEGIN');
  for (let i = 0; i < 400; i++) { const id = 'TEST_ONLY_other_' + i; message.run('d:' + D2, id, D2, 'TEST_ONLY other department', 'TEST_ONLY body', now - i); target.run('d:' + D2, id, EKEYS.employee2); for (let u = 0; u < 32; u++) state.run('TEST_ONLY_other_account_' + u, 'd:' + D2, id, now); }
  for (let i = 0; i < 3; i++) { const id = 'TEST_ONLY_own_' + i; message.run('d:' + D1, id, D1, 'TEST_ONLY own department', 'TEST_ONLY body', now + i); target.run('d:' + D1, id, EKEYS.employee1); }
  W.DB.exec('COMMIT');
  const prepare = W.DB.prepare.bind(W.DB), fetched = [];
  W.DB.prepare = sql => {
    const statement = prepare(sql);
    const capture = result => { if (/notification_(messages|targets|user_state)/.test(sql)) { const rows = result?.results || (result ? [result] : []); fetched.push({ sql, rows, args: statement.args.slice() }); } return result; };
    for (const name of ['first', 'all']) { const original = statement[name].bind(statement); statement[name] = async (...args) => capture(await original(...args)); }
    const original = statement._batchSync.bind(statement); statement._batchSync = () => capture(original());
    return statement;
  };
  const first = ok(await W.get('employee1', { limit: '1' }));
  assert.equal(first.items.length, 1); assert.ok(first.next);
  assert.ok(fetched.reduce((total, read) => total + read.rows.length, 0) <= 10, 'Only the requested page, its targets and scalar counts are materialized');
  assert.equal(fetched.some(read => read.rows.some(row => row.scope === 'd:' + D2 || row.message_scope === 'd:' + D2 || String(row.account_uid || '').startsWith('TEST_ONLY_other_account_'))), false);
  assert.equal(fetched.some(read => /^SELECT \* FROM notification_user_state\s*$/.test(read.sql)), false);
  const next = ok(await W.get('employee1', { limit: '1', cursor: first.next })), third = ok(await W.get('employee1', { limit: '1', cursor: next.next }));
  assert.equal(new Set([first.items[0].id, next.items[0].id, third.items[0].id]).size, 3); assert.equal(third.next, '');
  const rowQuery = fetched.find(read => /^SELECT m\.\*,/.test(read.sql)); assert.ok(rowQuery, 'The actual feed query is captured for inspection');
  const statement = prepare('EXPLAIN QUERY PLAN ' + rowQuery.sql).bind(...rowQuery.args), plan = W.DB.db.prepare(statement.sql).all(...statement._params());
  assert.ok(plan.some(row => /SEARCH s USING/.test(row.detail)), 'Per-account read state uses its keyed lookup');
});

test('twenty concurrent recipients can update their states without changing another recipient feed revision or configuration base', async () => {
  const W = await world(), users = W.users.slice(), now = Date.now(), keys = [];
  for (let i = 0; i < 20; i++) {
    const name = 'storm' + i, id = 'TEST_ONLY_storm_uid_' + i, ekey = 'TEST_ONLY_storm_key_' + i; keys.push({ name, ekey });
    users.push({ ...W.users.find(u => u.id === IDS.employee1), id, ekey, un: String(1000000900 + i), name: 'TEST_ONLY storm recipient' });
    await W.DB.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city) VALUES(?1,?2,?3,?3,?4,?5)').bind('TEST_ONLY_session_' + name, id, now, 'TEST_ONLY', 'TEST_ONLY').run();
  }
  await W.DB.prepare("UPDATE kv SET v=?1 WHERE k='bassam_auth_users_v1' AND seq=0").bind(JSON.stringify(users)).run();
  const sent = ok(await emit(W, 'manager1', { own: [EKEYS.employee1, ...keys.map(x => x.ekey)] })), before = ok(await W.get('employee1'));
  const results = await Promise.all(keys.map(({ name }) => W.act(name, { op: 'state', action: 'read', id: sent.id })));
  results.forEach(result => ok(result));
  assert.equal(W.DB.q('SELECT COUNT(*) n FROM notification_user_state')[0].n, 20);
  const after = ok(await W.get('employee1'));
  assert.equal(after.rev, before.rev, 'Other recipients do not invalidate this user feed');
  assert.equal(after.configRev, before.configRev); assert.equal(after.broadcastRev, before.broadcastRev);
  assert.equal(after.items.find(x => x.id === sent.id).un, true);
});

test('a writer between revision and row reads cannot produce new messages labelled with an old feed revision', async () => {
  const W = await world(), batch = W.DB.batch.bind(W.DB);
  let armed = true, inserted;
  const write = async () => { armed = false; inserted = ok(await emit(W, 'manager1', { once: 'TEST_ONLY_interleaved_feed' })); };
  W.DB.batch = async statements => {
    const value = await batch(statements);
    // Inject after the actual guarded revision read commits, before row reads.
    if (armed && statements.some(s => /AS feed_rev.*AS config_rev.*AS broadcast_rev/.test(s.sql) && s.args[0] === 'bassam_notifications_domain_v1')) await write();
    return value;
  };
  const read = ok(await W.get('employee1')); assert.ok(inserted, 'The concurrent writer was injected into the real read sequence');
  if (read.items.some(x => x.id === inserted.id)) assert.ok(read.rev >= inserted.rev, 'A response containing the new event must carry its committed revision');
});

test('reintroducing a retired notification document after cutover blocks feed, mutation and export without silently importing it', async () => {
  for (const key of ['bassam_notif_v1', 'bassam_notif_sys_v1', 'bassam_notif_cfg_v1', 'bassam_bc_v1', 'bsdept:' + D1 + ':bassam_notif_v1']) {
    const W = await world(), identities = identitySnapshot(W.DB), before = notificationSnapshot(W.DB);
    await W.DB.batch(W.W.kvPutStmts(W.env, 'kv', key, JSON.stringify({ v: 1, items: [{ id: 'TEST_ONLY_reintroduced' }] })));
    for (const result of [await W.get('super'), await W.act('super', { op: 'state', action: 'read-all', all: true }), await W.api('super', '/api/notifications/export')]) {
      assert.equal(result.status, 503, key); assert.equal(result.json.ok, 0);
    }
    assert.deepEqual(notificationSnapshot(W.DB), before); assert.deepEqual(identitySnapshot(W.DB), identities);
    assert.equal(W.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1', key)[0].n, 1, 'The guard cannot delete or import an unexplained legacy document');
    await W.DB.prepare('DELETE FROM kv WHERE k=?1').bind(key).run(); ok(await W.get('super'));
  }
});

test('summary counters preserve audience and read state while management history is paged explicitly', async () => {
  const W = await world(), first = ok(await emit(W, 'manager1')), second = ok(await emit(W, 'manager1'));
  ok(await W.act('employee1', { op: 'state', action: 'read', id: first.id }));
  const feed = ok(await W.get('employee1')), summary = ok(await W.get('employee1', { summary: '1' }));
  assert.equal(feed.items.length, 2); assert.equal(summary.items.length, 0); assert.deepEqual(summary.counters, feed.counters);
  assert.equal(summary.counters.total, 2); assert.equal(summary.counters.unread, 1); assert.equal(summary.counters.byKind.task, 2);
  assert.equal(feed.items.find(item => item.id === second.id).to, undefined, 'Feed DTOs do not disclose recipient lists');
  assert.equal(summary.broadcasts, undefined); assert.equal(summary.stats, undefined);
  const now = Date.now() - 1000;
  for (let i = 0; i < 31; i++) await W.DB.prepare("INSERT INTO notification_messages(scope,id,kind,type,category,priority,channel,title,body,created_at,target_mode) VALUES('bc',?1,'broadcast','bc','bc','info','bell','TEST_ONLY management','TEST_ONLY body',?2,'all')").bind('TEST_ONLY_history_' + i, now - i).run();
  assert.equal(ok(await W.get('super')).broadcasts, undefined, 'Ordinary polling cannot materialize management history');
  const page = ok(await W.get('super', { manage: '1', limit: '1' })); assert.equal(page.broadcasts.length, 25); assert.equal(page.bcTotal, 31); assert.ok(page.bcNext);
  assert.equal(Object.keys(page.stats).length, 25, 'Only the requested management page has aggregate statistics');
  const next = ok(await W.get('super', { manage: '1', limit: '1', bcCursor: page.bcNext })); assert.equal(next.broadcasts.length, 6); assert.equal(next.bcNext, '');
  assert.equal(new Set([...page.broadcasts, ...next.broadcasts].map(item => item.id)).size, 31);
  assert.equal(ok(await W.get('employee1', { manage: '1' })).broadcasts, undefined, 'A staff query cannot activate super management');
});

/* RISHAD-266 (قرار المالك على d7a0cbc): security-poll تشغيلُ نظامٍ محدَّد عند فتح صفحة مدير النظام — لا حفظُ أعمال.
   الدليلُ هنا: (1) غيرُ مدير النظام يُرفض 403 ولا يتغيّر شيء · (2) تشغيلُه لا يمسّ بياناتِ الأعمال (kv · ops_* · مراجعاتُ غير التنبيهات)،
   ويقتصر على جداول التنبيهات ونقطة تفتيشها · (3) إعادتُه لا تكرّر التنبيه (والتكرارُ عند التزامن يغطّيه الاختبار أعلاه) */
test('security-poll: only the system administrator runs it; it touches notification tables and its checkpoint only; a repeat adds nothing', async () => {
  const W = await world();
  const all = () => Object.fromEntries(W.DB.q("SELECT name FROM sqlite_master WHERE type='table'").map(t => t.name)
    .filter(t => !t.startsWith('sqlite_') && !['sec', 'sess', 'guard'].includes(t)).map(t => [t, JSON.stringify(W.DB.q('SELECT * FROM "' + t + '"'))]));
  await W.DB.prepare('INSERT INTO sec(ts,uid,un,act,target,detail,ip) VALUES(?1,?2,?3,?4,?5,?6,?7)')
    .bind(Date.now() - 1000, IDS.manager1, 'TEST_ONLY', 'policy_change', 'TEST_ONLY', 'TEST_ONLY poll evidence', 'TEST_ONLY').run();
  const s0 = all();
  for (const who of ['employee1', 'manager1', 'gm']) {
    const r = await W.act(who, { op: 'security-poll' });
    assert.equal(r.status, 403, who + ' must not run the security poll');
  }
  assert.deepEqual(all(), s0, 'refused polls change nothing');
  ok(await W.act('super', { op: 'security-poll' }));
  const s1 = all(), changed = Object.keys(s1).filter(t => s1[t] !== s0[t]);
  assert.ok(changed.length > 0, 'the control poll does work (a new security event is pending)');
  const allowed = (t) => /^notification_/.test(t) || ['revs', 'meta', 'aud'].includes(t);
  assert.deepEqual(changed.filter(t => !allowed(t)), [], 'only notification tables and their bookkeeping change: ' + changed.join(','));
  const added = (t) => { const b = JSON.parse(s0[t]).map(x => JSON.stringify(x)); return JSON.parse(s1[t]).filter(x => !b.includes(JSON.stringify(x))); };
  assert.ok(added('revs').every(r => r.k === 'bassam_notifications_domain_v1'), 'only the notification-domain revision moves: ' + JSON.stringify(added('revs')));
  assert.ok(added('meta').every(r => r.k === 'rev'), 'meta: only the global revision counter: ' + JSON.stringify(added('meta')));
  assert.ok(added('aud').length > 0 && added('aud').every(r => r.k === 'bassam_notifications_domain_v1'), 'audit: only the notification-domain event: ' + JSON.stringify(added('aud')).slice(0, 300));
  ok(await W.act('super', { op: 'security-poll' }));
  assert.deepEqual(all(), s1, 'a repeated poll with nothing new changes nothing (no duplicate notification)');
});
