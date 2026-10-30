/* A bounded feed must also avoid needless edge-to-D1 network round trips. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, D1, EKEYS } from './notifications_review_fx.mjs';

test('super inbox avoids business reference reads while recipient statistics still resolve them', async () => {
  const W = await world(), prepare = W.DB.prepare.bind(W.DB);
  const base = (await W.get('super')).json.broadcastRev;
  const sent = await W.act('super', { op: 'broadcast', base, b: { title: 'TEST_ONLY reference-free inbox', body: 'TEST_ONLY', target: { mode: 'dept', sel: [D1] } } });
  assert.equal(sent.status, 200);
  let referenceReads = 0;
  W.DB.prepare = sql => {
    const statement = prepare(sql), bind = statement.bind.bind(statement);
    statement.bind = (...args) => {
      if (/SELECT.*\bkv\b/i.test(sql) && args.some(value => typeof value === 'string' && /^bsdept:[^:]+:bassam_(employees_v1|staffing_v3|dreport_v1|perm_tpls_v1)$/.test(value))) referenceReads++;
      return bind(...args);
    };
    return statement;
  };
  const before = W.DB.trips;
  const inbox = await W.get('super', { all: '1' });
  assert.equal(inbox.status, 200);
  assert.ok(inbox.json.items.some(item => item.bcId === sent.json.id));
  assert.equal(referenceReads, 0, 'Super audience does not depend on employee, schedule, report or supervisory-template documents');
  assert.ok(W.DB.trips - before <= 7);
  const staff = await W.get('employee1');
  assert.equal(staff.status, 200);
  assert.ok(referenceReads > 0, 'Staff leadership, identity aliases and shift policy must retain their existing reference reads');
  referenceReads = 0;
  const managed = await W.get('super', { all: '1', manage: '1' });
  assert.equal(managed.status, 200);
  assert.ok(referenceReads > 0, 'Super recipient statistics still need staff reference data; nfRefs itself is not bypassed');
});

test('super summary preserves counters while using at most eight D1 round trips', async () => {
  const W = await world();
  const sent = await W.act('manager1', { op: 'emit', type: 'task_new', dept: D1, own: [EKEYS.employee1], vars: { المهمة: 'TEST_ONLY' } });
  assert.equal(sent.status, 200);
  const before = W.DB.trips, start = W.DB.log.length;
  const result = await W.get('super', { summary: '1' });
  assert.equal(result.status, 200); assert.equal(result.json.ok, 1);
  assert.equal(result.json.items.length, 0); assert.equal(result.json.counters.unread, 0);
  assert.ok(W.DB.trips - before <= 8, 'The previous implementation required eleven trips for the same request');
  assert.ok(W.DB.log.slice(start).some(sql => /AS feed_rev.*AS config_rev.*AS broadcast_rev/.test(sql)));
});

test('a configuration writer between row and revision reads forces a consistent retry', async () => {
  const W = await world(), batch = W.DB.batch.bind(W.DB);
  const initial = (await W.get('super')).json;
  let armed = true, changed;
  W.DB.batch = async statements => {
    const rows = await batch(statements);
    // The guarded read is now a D1 batch. Interleave only after that read
    // transaction commits, before the feed checks its final revisions.
    if (armed && statements.some(statement => statement.sql === 'SELECT * FROM notification_type_overrides')) {
      armed = false;
      changed = await W.act('super', { op: 'config', base: initial.configRev, patch: { task_new: { on: false } } });
    }
    return rows;
  };
  const result = await W.get('super', { summary: '1' });
  assert.equal(changed.status, 200); assert.equal(result.status, 200);
  assert.equal(result.json.cfg.t.task_new.on, false);
  assert.equal(result.json.configRev, changed.json.configRev);
  assert.ok(result.json.rev >= changed.json.rev);
});
