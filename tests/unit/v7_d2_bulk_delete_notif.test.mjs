/* RISHAD V7 · owner decision 2 — «الحذف بالجملة: إشعار واحد مجمّع».
   Real worker, real routes (/api/save with the Operations envelope, /api/employees/transition, /api/notifications), legacy and
   enforce, synthetic data only (TEST_ONLY · tests/fixtures/gen_fixture.py + tasks_fx.mjs).

   Before: the server issued one emp_del per removed record with no cap — 450 deletions left 400 emp_del in the unit feed and
   evicted everything else (400-row retention). Additions already collapsed (five or more added → one emp_imp).
   Now: one accepted save that removes FIVE OR MORE records (and is not a full wipe — that stays the single emp_wipe) issues ONE
   emp_delm: recipients and level of emp_del (mgr + sys · act · bell), the count and the actor, no names. Fewer than five keep
   one emp_del per record exactly as before. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { world, stored, D, KE } from './tasks_fx.mjs';
import { TEST_SUPER_USERNAME } from './harness.mjs';

const D2 = 'tst_d2', KE2 = 'bsdept:' + D2 + ':bassam_employees_v1', DM2 = 'TEST_ONLY · مدير الإدارة ٢';
const ACC = [['tst_dm1', '0000000101', '70101'], ['tst_dm2', '0000000102', '70102'], ['tst_gm1', '0000000103', '70103'], ['tst_sup1', '0000000111', '70111'], ['tst_emp1', '0000000113', '70113'], ['tst_imp', '0000000119', '70119']];
const DM1 = 'TEST_ONLY · مدير الإدارة ١';
let seq = 0;
async function mk(mode) {
  const w = await world({ mode }), env = w.env;
  const superId = stored(env, 'bassam_auth_users_v1').find((u) => u.role === 'super' && u.un === TEST_SUPER_USERNAME).id, cks = { super: w.su.ck }, ids = { super: superId };
  const ck = async (who) => { if (!cks[who]) { const a = ACC.find((x) => x[0] === who); cks[who] = (await w.login(a[1], a[2])).ck; ids[who] = who; } return cks[who]; };
  const api = async (who, p, o = {}) => w.C.api(p, Object.assign({}, o, { cookie: await ck(who) }));
  const read = async (who, key = KE) => { const r = await api(who, '/api/operations/read?' + new URLSearchParams({ uid: ids[who] || who, keys: key })); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); return r.j; };
  const save = async (who, mutate, o = {}) => {
    const key = o.key || KE; await ck(who); const g = o.read || await read(who, key), value = mutate(JSON.parse(JSON.stringify(g.resources[key])));
    const body = { uid: ids[who], requestId: 'TEST_ONLY_d2_' + (++seq), epoch: g.epoch, set: { [key]: JSON.stringify(value) }, del: [], base: { [key]: g.base[key] }, why: { [key]: 'TEST_ONLY حذف' } };
    const r = await api(who, '/api/save', { method: 'POST', body }); return { status: r.status, j: r.j, body };
  };
  const context = async (who, dept, intent) => { await ck(who); const c = await api(who, '/api/employees/transition?' + new URLSearchParams({ uid: ids[who], dept, intent })); assert.equal(c.status, 200, JSON.stringify(c.j).slice(0, 300)); return c.j; };
  const post = async (who, body) => { const r = await api(who, '/api/employees/transition', { method: 'POST', body }); return { status: r.status, j: r.j, body }; };
  const del = async (who, dept, deleteMode, keep) => { const c = await context(who, dept, 'delete');
    return post(who, { uid: ids[who], dept, intent: 'delete', deleteMode, requestId: 'TEST_ONLY_d2_tr_' + (++seq), base: c.base, finalRows: c.employees.filter(keep), reason: 'TEST_ONLY ' + deleteMode }); };
  const replace = async (who, dept, rows) => { const c = await context(who, dept, 'import');
    return post(who, { uid: ids[who], dept, intent: 'import', requestId: 'TEST_ONLY_d2_imp_' + (++seq), base: c.base, finalRows: rows(c.employees), options: c.options,
      import: { mode: 'replace', year: c.clock.y, month: c.clock.m, schedule: [], templates: [] }, reason: 'TEST_ONLY replace' }); };
  const msgs = () => { const t = env.DB.q('SELECT scope,message_id,kind,value FROM notification_targets'); return env.DB.q("SELECT * FROM notification_messages WHERE category='emp' ORDER BY created_at,id").map((m) => Object.assign({}, m, {
    own: t.filter((x) => x.scope === m.scope && x.message_id === m.id && x.kind === 'employee').map((x) => x.value).sort(), roles: t.filter((x) => x.scope === m.scope && x.message_id === m.id && x.kind === 'role').map((x) => x.value).sort() })); };
  const of = (type) => msgs().filter((m) => m.type === type);
  const feed = async (who) => { await ck(who); const r = await api(who, '/api/notifications?' + new URLSearchParams(who === 'super' ? { uid: ids.super, all: '1' } : { uid: ids[who] || who })); assert.equal(r.status, 200, who + ' feed'); return r.j.items; };
  const readers = async (type) => { const out = []; for (const who of ['super'].concat(ACC.map((a) => a[0]))) if ((await feed(who)).some((m) => m.type === type)) out.push(who); return out.sort(); };
  return { w, env, mode, api, read, save, del, replace, msgs, of, feed, readers };
}
const ok = (r, what) => { assert.equal(r.status, 200, what + ': ' + JSON.stringify(r.j).slice(0, 400)); assert.equal(r.j.ok, 1, what); };
const NEW = (n) => ({ eid: 'tst_e_new' + n, name: 'TEST_ONLY · جديد ' + n, empno: String(90000 + n), type: 'TEST_ONLY رسمي', work: 'TEST_ONLY مراقب' });
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const isNew = (e, a, b) => { const m = /^tst_e_new(\d+)$/.exec(e.eid || ''); return !!m && +m[1] >= a && +m[1] <= b; };

for (const mode of ['legacy', 'enforce']) {
  /* ── the reproduction (fails on 09a5fe8: six emp_del) ── */
  test('V7 D2 · ' + mode + ': one save removing six employees yields exactly one aggregated notice and no emp_del; removing four yields four emp_del', async () => {
    const x = await mk(mode);
    ok(await x.save('tst_dm1', (v) => v.concat(range(1, 10).map(NEW))), 'add ten');
    ok(await x.save('tst_dm1', (v) => v.filter((e) => !isNew(e, 1, 6))), 'remove six');
    let m = x.of('emp_delm');
    assert.equal(m.length, 1, 'one aggregated notice: ' + JSON.stringify(x.msgs().map((i) => i.type)));
    assert.equal(x.of('emp_del').length, 0, 'and no per-record emp_del');
    assert.equal(m[0].body, 'حُذف 6 موظفاً من الإدارة بواسطة ' + DM1, 'the count and the actor');
    assert.ok(!/جديد/.test(m[0].body + ' ' + (m[0].title || '')), 'no employee name');
    assert.deepEqual(m[0].roles, ['mgr', 'sys']); assert.deepEqual(m[0].own, []); assert.equal(m[0].priority, 'act'); assert.equal(m[0].channel, 'bell');
    assert.equal(m[0].scope, 'd:' + D); assert.equal(m[0].department, D); assert.equal(m[0].server_origin, 1);
    /* fewer than five: per record, exactly as before */
    ok(await x.save('tst_dm1', (v) => v.filter((e) => !isNew(e, 7, 10))), 'remove four');
    const d = x.of('emp_del');
    assert.equal(d.length, 4); assert.equal(x.of('emp_delm').length, 1, 'no second aggregated notice');
    assert.deepEqual(d.map((i) => i.body).sort(), range(7, 10).map((n) => 'حُذف TEST_ONLY · جديد ' + n + ' من الإدارة بواسطة ' + DM1).sort());
    /* same recipients and level as emp_del */
    assert.deepEqual(d[0].roles, m[0].roles); assert.equal(d[0].priority, m[0].priority); assert.equal(d[0].channel, m[0].channel); assert.equal(d[0].scope, m[0].scope);
    const who = await x.readers('emp_delm');
    assert.deepEqual(who, await x.readers('emp_del'), 'the readers of the aggregated notice are those of emp_del');
    assert.deepEqual(who, ['super', 'tst_dm1', 'tst_gm1']);
    const item = (await x.feed('tst_dm1')).find((i) => i.type === 'emp_delm');
    assert.ok(item && item.srv === 1 && item.k === 'emp', 'it is served in the manager\'s feed in the «emp» category: ' + JSON.stringify(item).slice(0, 200));
  });

  /* ── the boundary and the mix with the other events of the same save ── */
  test('V7 D2 · ' + mode + ': exactly five removed is aggregated; additions and edits of the same save are announced as before', async () => {
    const x = await mk(mode);
    ok(await x.save('tst_dm1', (v) => v.concat(range(1, 5).map(NEW))), 'add five');
    assert.equal(x.of('emp_imp').length, 1);
    ok(await x.save('tst_dm1', (v) => { v.find((e) => e.eid === 'tst_e_emp1').phone = '0500000001'; return v.filter((e) => !isNew(e, 1, 5)).concat([NEW(20)]); }), 'remove five, add one, edit one');
    assert.equal(x.of('emp_delm').length, 1); assert.equal(x.of('emp_del').length, 0);
    assert.equal(x.of('emp_delm')[0].body, 'حُذف 5 موظفاً من الإدارة بواسطة ' + DM1);
    assert.equal(x.of('emp_add').length, 1); assert.equal(x.of('emp_edit').length, 1); assert.equal(x.of('emp_imp').length, 1);
  });

  /* ── the flood: hundreds removed leave one notice and evict nothing ── */
  test('V7 D2 · ' + mode + ': 450 removed by one save leave one notice in the unit feed and the earlier notices stay', async () => {
    const x = await mk(mode);
    ok(await x.save('tst_dm1', (v) => v.concat([NEW(1000)])), 'an earlier notice');
    ok(await x.save('tst_dm1', (v) => v.concat(range(1, 450).map(NEW))), 'add 450');
    ok(await x.save('tst_dm1', (v) => v.filter((e) => !isNew(e, 1, 450))), 'remove 450');
    assert.deepEqual(x.msgs().map((m) => m.type).sort(), ['emp_add', 'emp_delm', 'emp_imp'], 'three notices in all');
    assert.equal(x.of('emp_delm')[0].body, 'حُذف 450 موظفاً من الإدارة بواسطة ' + DM1);
    assert.deepEqual((await x.feed('tst_dm1')).map((m) => m.type).filter((t) => /^emp_/.test(t)).sort(), ['emp_add', 'emp_delm', 'emp_imp'], 'the earlier ones are still in the manager\'s feed');
  });

  /* ── the transition route: selected delete, replace-import, full wipe ── */
  test('V7 D2 · ' + mode + ': /api/employees/transition — many selected or replaced away are one aggregated notice; a full wipe is still the single emp_wipe', async () => {
    const x = await mk(mode);
    ok(await x.save('tst_dm1', (v) => v.concat(range(1, 8).map(NEW))), 'add eight');
    const tr = await x.del('tst_dm1', D, 'selected', (e) => !isNew(e, 1, 7)); ok(tr, 'delete seven selected');
    assert.equal(x.of('emp_delm').length, 1); assert.equal(x.of('emp_del').length, 0);
    assert.equal(x.of('emp_delm')[0].body, 'حُذف 7 موظفاً من الإدارة بواسطة ' + DM1);
    /* replay of the same transition: nothing more */
    const again = await x.api('tst_dm1', '/api/employees/transition', { method: 'POST', body: tr.body });
    assert.equal(again.status, 200, JSON.stringify(again.j).slice(0, 300)); assert.equal(again.j.duplicate, 1); assert.equal(x.of('emp_delm').length, 1, 'a replayed transition announces nothing more');
    /* replace-import (another unit, by its manager): the file replaces the register — the eight added by hand are not in it, six
       new are. (Unit tst_d2 because in enforce a replace that has to rewrite the related records of tst_d1 — schedule, tasks,
       reports — is refused «denied · scope» on this fixture, for its manager and the platform administrator alike; that is not a
       notification matter and is not changed here.) */
    ok(await x.save('tst_dm2', (v) => v.concat(range(41, 48).map(NEW)), { key: KE2 }), 'eight by hand in the other unit');
    const n0 = stored(x.env, KE2).length, imp0 = x.of('emp_imp').length;
    const rp = await x.replace('tst_dm2', D2, (rows) => rows.filter((e) => !isNew(e, 1, 999)).concat(range(31, 36).map(NEW))); ok(rp, 'replace import');
    assert.equal(stored(x.env, KE2).length, n0 - 8 + 6);
    const m = x.of('emp_delm');
    assert.equal(m.length, 2, 'one more aggregated notice: ' + JSON.stringify(x.msgs().map((i) => i.type))); assert.equal(x.of('emp_del').length, 0);
    assert.equal(m[1].body, 'حُذف 8 موظفاً من الإدارة بواسطة ' + DM2); assert.equal(m[1].department, D2); assert.equal(m[1].scope, 'd:' + D2);
    assert.equal(x.of('emp_imp').length, imp0 + 1, 'and the import itself is announced as before');
    /* full wipe of another unit: one emp_wipe, nothing else */
    const n = x.msgs().length; ok(await x.del('super', D2, 'all', () => false), 'wipe');
    assert.equal(x.of('emp_wipe').length, 1); assert.equal(x.msgs().length, n + 1, 'nothing but the one emp_wipe'); assert.deepEqual(x.of('emp_wipe')[0].roles, ['sys']);
    assert.equal(x.of('emp_delm').length, 2, 'and no aggregated delete for the wipe');
  });

  /* ── once per accepted save ── */
  test('V7 D2 · ' + mode + ': a replayed save and a conflict retry announce the aggregated notice once', async () => {
    const x = await mk(mode);
    ok(await x.save('tst_dm1', (v) => v.concat(range(1, 12).map(NEW))), 'add twelve');
    const first = await x.save('tst_dm1', (v) => v.filter((e) => !isNew(e, 1, 6))); ok(first, 'remove six');
    assert.equal(x.of('emp_delm').length, 1);
    const again = await x.api('tst_dm1', '/api/save', { method: 'POST', body: first.body });
    assert.equal(again.status, 200, JSON.stringify(again.j).slice(0, 300)); assert.equal(again.j.duplicate, 1, 'the receipt is replayed');
    assert.equal(x.of('emp_delm').length, 1, 'a replayed save announces nothing more');
    const stale = await x.read('tst_dm1');
    ok(await x.save('tst_dm1', (v) => { v.find((e) => e.eid === 'tst_e_emp1').phone = '0500000009'; return v; }), 'concurrent edit');
    const lost = await x.save('tst_dm1', (v) => v.filter((e) => !isNew(e, 7, 12)), { read: stale });
    assert.equal(lost.status, 409, 'stale base: ' + JSON.stringify(lost.j).slice(0, 200)); assert.equal(x.of('emp_delm').length, 1, 'a conflicting save announces nothing');
    ok(await x.save('tst_dm1', (v) => v.filter((e) => !isNew(e, 7, 12))), 'retry on fresh data');
    assert.equal(x.of('emp_delm').length, 2, 'the retry announces exactly once'); assert.equal(x.of('emp_del').length, 0);
    const keys = x.env.DB.q("SELECT once_key FROM notification_dedup WHERE once_key LIKE 'emp:%'").map((r) => r.once_key);
    assert.equal(keys.length, x.msgs().length); assert.equal(new Set(keys).size, keys.length);
  });

  /* ── no client may emit it either (issue #1 behaviour) ── */
  test('V7 D2 · ' + mode + ': the aggregated type is server-only like every employee notification — a client emit is dropped', async () => {
    const x = await mk(mode);
    for (const who of ['tst_dm1', 'tst_gm1', 'super', 'tst_emp1']) {
      await x.feed(who);
      const r = await x.api(who, '/api/notifications/act', { method: 'POST', body: { uid: who === 'super' ? undefined : who, op: 'emit', type: 'emp_delm', dept: D, vars: { 'العدد': 9, 'المُعدّل': 'TEST_ONLY' } } });
      assert.equal(r.status, 200, who + ' dropped, not refused: ' + JSON.stringify(r.j).slice(0, 200)); assert.deepEqual(x.msgs(), [], who + ' produced nothing');
    }
  });
}

/* ── the type is declared on both sides, identically (the client renders it from its own registry) ── */
test('V7 D2: emp_delm is declared in the client registry exactly as in the server table, beside emp_del', () => {
  const root = process.env.KIVO_SRC ? path.resolve(process.env.KIVO_SRC, '..') : path.resolve('.');
  const client = fs.readFileSync(path.join(process.env.KIVO_SRC || path.join(root, 'src'), 'services', '441-notif-core.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'workers', 'parts', '019-notifications.js'), 'utf8');
  const leaf = (id) => { const m = new RegExp("L\\('" + id + "','(\\w+)','([^']*)','([^']*)',(true|false),\\[([^\\]]*)\\],'(\\w+)','(\\w+)','([^']*)','([^']*)'\\)").exec(client); assert.ok(m, 'client declares ' + id);
    return { k: m[1], name: m[2], when: m[3], on: m[4] === 'true', to: m[5].split(',').map((s) => s.replace(/'/g, '').trim()), lvl: m[6], chan: m[7], txt: m[8], go: m[9] }; };
  const tpl = (id) => { const m = new RegExp('\\n  ' + id + ': \\{\\r?\\n([\\s\\S]*?)\\r?\\n  \\},').exec(server); assert.ok(m, 'server declares ' + id);
    const o = {}; for (const line of m[1].split(/\r?\n/)) { const f = /^\s*(\w+): (.*),$/.exec(line); assert.ok(f, 'field line: ' + line); o[f[1]] = JSON.parse(f[2]); } delete o.id; return o; };
  for (const id of ['emp_del', 'emp_delm', 'emp_imp']) assert.deepEqual(leaf(id), tpl(id), id + ' client == server');
  const a = leaf('emp_del'), b = leaf('emp_delm');
  assert.deepEqual([b.k, b.to, b.lvl, b.chan, b.on], [a.k, a.to, a.lvl, a.chan, a.on], 'recipients, level and channel of emp_del');
  assert.ok(b.txt.includes('{العدد}') && b.txt.includes('{المُعدّل}') && !b.txt.includes('{الاسم}'), 'count and actor, no name');
});
