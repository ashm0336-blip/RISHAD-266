/* Real canonical Worker/SQLite query tests. No staged composer or cloud. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { D1Shim, ROOT } from './harness.mjs';
import { installOperationalFixture } from './operational_legacy_seed_fx.mjs';

const D = 'TEST_ONLY_ir_department', OTHER = 'TEST_ONLY_ir_other';
const names = ['irRead', 'irQueryContext', 'irQueryScope', 'irRowRead', 'irConvert', 'irInstallStatements',
  'irRevs', 'irKey', 'irSnapshot', 'irInflate', 'initDb', 'kvPutStmts', 'enfViewCtx', 'ENF_PROJ', 'KIVO_FIND'];
let moduleNumber = 0;
async function worker() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'workers/parts.json'), 'utf8'));
  const source = manifest.parts.map(part => {
    const text = fs.readFileSync(path.join(ROOT, 'workers/parts', part.file), 'utf8');
    assert.equal(createHash('sha256').update(text).digest('hex'), part.sha256, 'Generate canonical manifest before query integration tests: ' + part.file);
    return text;
  }).join('');
  assert.equal(createHash('sha256').update(source).digest('hex'), manifest.sha256);
  assert.match(source, /function irRead\(/, 'Canonical query part must be generated into the real worker');
  return import('data:text/javascript;base64,' + Buffer.from(source + '\nexport {' + names.join(',') + '};\n// query fixture ' + ++moduleNumber).toString('base64'));
}
function oracleFind() {
  const source = fs.readFileSync(path.join(ROOT, 'src/services/332-find-day.js'), 'utf8');
  const start = source.indexOf('var AR_D ='), end = source.indexOf('\n  })();', start);
  assert.ok(start > 0 && end > start);
  const context = { KIVO: {} };
  vm.runInNewContext('(function(){' + source.slice(start, end) + '})();', context);
  return context.KIVO.BassamFind;
}
async function world(reports = []) {
  const W = await worker(), DB = new D1Shim(), env = { DB, KIVO_AUTHZ_MODE: 'enforce' };
  await W.initDb(env);
  DB.exec('PRAGMA foreign_keys=ON');
  const users = [
    { id: 'TEST_ONLY_super', un: '1000000900', role: 'super' },
    { id: 'TEST_ONLY_manager', un: '1000000901', role: 'staff', mgr: 1, deptId: D, ekey: 'mgr:' + D },
    { id: 'TEST_ONLY_staff', un: '1000000902', role: 'staff', deptId: D, ekey: 'TEST_ONLY_e1' },
    { id: 'TEST_ONLY_noview', un: '1000000903', role: 'staff', deptId: D, ekey: 'TEST_ONLY_no_view' },
  ];
  const keys = {
    bassam_auth_users_v1: users,
    bassam_depts_v1: [{ id: D, name: 'TEST_ONLY department' }, { id: OTHER, name: 'TEST_ONLY other' }],
    bassam_gdepts_v1: [],
    bassam_platform_v1: {},
    bassam_perms_v1: { caps: { [D]: ['irshad'], [OTHER]: ['irshad'] }, emps: { [D]: {
      TEST_ONLY_e1: { 'irshad/records': ['view'], 'irshad/dash': ['view'] }, TEST_ONLY_no_view: {},
    } } },
    ['bsdept:' + D + ':bassam_staffing_v3']: { '1448-1': { TEST_ONLY_e1: { shift: 'أ' } }, '1448-2': { TEST_ONLY_e1: { shift: 'ب' } } },
    ['bsdept:' + D + ':bassam_scope_v1']: { ceiling: { Site: { mode: 'ALL' }, 'Zone/Element': { mode: 'ALL' } }, emp: { TEST_ONLY_e1: { Shift: { mode: 'staffing-bound' } } } },
    ['bsdept:' + D + ':bassam_shift_options_v1']: [{ name: 'أ' }, { name: 'ب' }],
    ['bsdept:' + D + ':bassam_employees_v1']: [{ eid: 'TEST_ONLY_e1', name: 'TEST_ONLY current name must not replace history' }],
  };
  async function put(k, value, bump = false) {
    await DB.batch(W.kvPutStmts(env, 'kv', k, JSON.stringify(value)));
    if (bump) await DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k).run();
  }
  for (const [k, v] of Object.entries(keys)) await put(k, v, true);
  await installOperationalFixture(env);
  DB.exec("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  async function install(d, rows, catalogs = {}) {
    const docs = { reports: { reports: rows }, ...catalogs };
    await DB.batch(W.irInstallStatements(env, W.irConvert(d, docs)));
    for (let i = 0; i < 4; i++) await DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(W.irKey(d, i)).run();
  }
  await install(D, reports, { languages: [], locations: ['TEST_ONLY_location'] });
  await install(OTHER, [{ id: 'TEST_ONLY_foreign', y: 1448, m: 1, d: 1, shift: 'أ', bro: 9999 }]);
  const actor = id => ({ u: { id: 'TEST_ONLY_' + id } });
  const read = (who, q = {}) => W.irRead(env, actor(who), { dept: D, ...q });
  return { W, DB, env, users, keys, put, install, actor, read };
}
function report(id, patch = {}) {
  return { id, y: 1448, m: 1, d: 2, ts: 10, shift: 'أ', eid: 'TEST_ONLY_e1', name: 'أحمد عبد الله', loc: 'TEST_ONLY_location',
    langs: [{ lang: 'العربية', count: 3 }], bro: 2, pros: 1, pol: 0, ...patch };
}
const copy = value => JSON.parse(JSON.stringify(value));

test('The generated search engine matches actual client norm/tok/match/filter including tier and relevance', async () => {
  const W = await worker(), F = oracleFind();
  const fields = [['أَحـمد عبد الله', 'الغامدي', '١٢۳٤'], ['محمد عطاوي', 'وردية ثانية'], ['خالد لافي', 'عبدالله'], ['ابن محمد', 'اللهيبي'], ['بدر', 'بشرى']];
  const queries = ['', 'احمد', 'عبدالله', 'عبد الله', 'محمد ع', 'غامدي', 'الغا', '١٢', '۲۳', 'هيبي', 'دل', 'ب', 'ابن', 'محمد ثانية', 'ـ\u200fأَحمد'];
  for (const q of queries) {
    assert.equal(W.KIVO_FIND.norm(q), F.norm(q), q);
    assert.deepEqual(copy(W.KIVO_FIND.tok(q)), copy(F.tok(q)), q);
    for (const f of fields) assert.equal(W.KIVO_FIND.match(q, f), F.match(q, f), q + ':' + f);
    assert.deepEqual(copy(W.KIVO_FIND.filter(q, fields, r => r)), copy(F.filter(q, fields, r => r)), q);
  }
});

test('Records preserve lossless rows, canonical match, stable ordering and bounded numeric/cursor pages', async () => {
  const rows = [report('a'), report('b', { d: 3, ts: 1, name: 'عبدالله ١٢٣' }), report('c', { d: 3, ts: 1, name: 'عبد الله ۱۲۳', langs: null }), report('d', { m: 2, name: 'أحمد' })];
  const X = await world(rows), F = oracleFind();
  const first = await X.read('super', { view: 'records', year: 1448, month: 1, limit: 1 });
  assert.equal(first.total, 3); assert.equal(first.monthTotal, 3); assert.deepEqual(first.rows, [rows[1]]); assert.ok(first.next);
  const second = await X.read('super', { view: 'records', year: 1448, month: 1, limit: 1, cursor: first.next });
  assert.equal(second.page, 2); assert.deepEqual(second.rows, [rows[2]]); assert.ok(second.prev);
  const last = await X.read('super', { view: 'records', year: 1448, month: 1, limit: 1, page: 999999 });
  assert.equal(last.page, 3); assert.deepEqual(last.rows, [rows[0]]); assert.equal(last.next, '');
  for (const q of ['عبدالله', 'عبد الله', '۱۲', 'احمد', 'دل']) {
    const actual = await X.read('super', { view: 'records', year: 1448, month: 1, q, limit: 200 });
    const expected = [rows[1], rows[2], rows[0]].filter(r => F.match(q, [r.name, r.loc, r.shift, r.empno]));
    assert.deepEqual(actual.rows, expected, q);
  }
  await assert.rejects(() => X.read('super', { view: 'records', year: 1448, month: 1, limit: 0 }), /irshad-query/);
  for (const cursor of ['not@aCursor', Buffer.from('null').toString('base64url')])
    await assert.rejects(() => X.read('super', { view: 'records', year: 1448, month: 1, cursor }), /irshad-(cursor|shape)/);
});

test('SQL visible scope is differential to actual061 across months, null/blank identity, manager and Site', async () => {
  /* RISHAD-266 (commit 74554f6; workers/parts/061-enf-read.js:3; docs/architecture.md:114): the legacy scope ceiling (bassam_scope_v1 Shift/Site projection) is retired;
     staff with irshad/records view see the department month like the manager, and a user without view stays denied. */
  const rows = [report('a'), report('hidden', { shift: 'ب' }), report('later', { m: 2, shift: 'ب' }), report('later-hidden', { m: 2 }), report('blank', { shift: '' }), report('null-month', { m: null, shift: 'ب' })];
  const X = await world(rows), context = await X.W.irQueryContext(X.env, X.actor('staff'), D);
  const scope = X.W.irQueryScope(context, 'i'), stmt = X.DB.prepare('SELECT i.report_id FROM irshad_reports i WHERE ' + scope.sql + ' ORDER BY i.sequence');
  const actual = (await stmt.bind(...scope.args).all()).results.map(r => r.report_id);
  assert.deepEqual(actual, X.DB.q('SELECT report_id FROM irshad_reports WHERE department_id=? ORDER BY sequence', D).map(r => r.report_id));
  const staff = (await X.read('staff', { view: 'calendar', year: 1448, month: 1 })).monthTotals.reports, manager = (await X.read('manager', { view: 'calendar', year: 1448, month: 1 })).monthTotals.reports;
  assert.equal(manager, 3); assert.equal(staff, manager);
  await X.put('bsdept:' + D + ':bassam_scope_v1', { emp: { TEST_ONLY_e1: { Shift: { mode: 'n/a' }, Site: { mode: 'unknown' } } } });
  assert.equal((await X.read('staff', { view: 'calendar', year: 1448, month: 1 })).monthTotals.reports, staff, 'Retired scope documents do not affect reads');
  await assert.rejects(() => X.read('noview', { view: 'calendar', year: 1448, month: 1 }), /irshad-denied/);
});

test('Context guards reject raw authority changes without revision and write-only context does not grant reads', async () => {
  const X = await world([report('a')]);
  await assert.rejects(() => X.read('noview', { view: 'records' }), /irshad-denied/);
  const writable = await X.W.irQueryContext(X.env, X.actor('noview'), D, { write: true });
  assert.equal(writable.A.u.id, 'TEST_ONLY_noview');
  await assert.rejects(() => X.W.irQueryContext(X.env, X.actor('super'), 'TEST_ONLY_missing', { write: true }), /irshad-denied/);
  const ctx = await X.W.irQueryContext(X.env, X.actor('super'), D, { write: true });
  await X.put('bsdept:' + D + ':bassam_employees_v1', [{ eid: 'TEST_ONLY_changed_without_rev' }]);
  await assert.rejects(() => X.DB.batch(ctx.guards.concat([X.DB.prepare("INSERT INTO meta(k,v) VALUES('TEST_ONLY_forbidden_write','1')")])), /KIVO_RESTORE_TARGET/);
  assert.equal(X.DB.q("SELECT COUNT(*) n FROM meta WHERE k='TEST_ONLY_forbidden_write'")[0].n, 0);
});

test('Cursor witnesses reject cross-principal, scope, raw permission and resource/epoch changes', async () => {
  const X = await world([report('a'), report('b')]);
  const q = { view: 'records', year: 1448, month: 1, limit: 1 };
  const page = await X.read('super', q);
  await assert.rejects(() => X.read('manager', { ...q, cursor: page.next }), /irshad-cursor-stale/);
  await assert.rejects(() => X.read('super', { ...q, dept: OTHER, cursor: page.next }), /irshad-cursor-stale/);
  await assert.rejects(() => X.read('super', { ...q, q: 'TEST_ONLY_other_query', cursor: page.next }), /irshad-cursor-stale/);
  const changed = copy(X.keys.bassam_perms_v1); changed.TEST_ONLY_noop_manual_change = 1;
  await X.put('bassam_perms_v1', changed);
  await assert.rejects(() => X.read('super', { ...q, cursor: page.next }), /irshad-cursor-stale/);
  /* RISHAD-266 (commit 74554f6; workers/parts/061-enf-read.js:3; docs/architecture.md:114): the legacy scope ceiling bassam_scope_v1 is retired and no longer part of the read witness;
     a retired scope document neither stales a cursor nor changes the next page. */
  const beforeScope = await X.read('super', q);
  await X.put('bsdept:' + D + ':bassam_scope_v1', { TEST_ONLY_manual_scope_change: true });
  const afterScope = await X.read('super', { ...q, cursor: beforeScope.next }), unchanged = await X.read('super', { ...q, cursor: (await X.read('super', q)).next });
  assert.equal(afterScope.rows.length, 1); assert.deepEqual(afterScope.rows, unchanged.rows); assert.notDeepEqual(afterScope.rows, beforeScope.rows);
  const beforeRevision = await X.read('super', q);
  await X.DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind(X.W.irKey(D)).run();
  await assert.rejects(() => X.read('super', { ...q, cursor: beforeRevision.next }), /irshad-cursor-stale/);
  const fresh = await X.read('super', q);
  X.DB.exec("UPDATE meta SET v=CAST(CAST(v AS INTEGER)+1 AS TEXT) WHERE k='restore_epoch'");
  await assert.rejects(() => X.read('super', { ...q, cursor: fresh.next }), /irshad-cursor-stale/);
});

test('Dashboard uses SQL totals, historical snapshots, distinct summary union, bounded top groups and configured charts', async () => {
  const rows = Array.from({ length: 9 }, (_, i) => report('g' + i, { d: i + 1, shift: i % 2 ? 'ب' : 'أ', loc: 'TEST_ONLY_loc_' + i, langs: [{ lang: 'TEST_ONLY_lang_' + i, count: 1 }], name: 'TEST_ONLY old ' + i }));
  rows.push(report('old', { m: 12, y: 1447, d: 1, bro: 4 }));
  rows.push(report('unconfigured', { shift: 'TEST_ONLY_unconfigured', bro: 10, langs: [] }));
  const X = await world(rows), reply = await X.read('super', { view: 'dashboard', mode: 'month', year: 1448, month: 1, heatYear: 1448, bucket: 'day' }), d = reply.dashboard;
  assert.equal(d.totals.reports, 10); assert.equal(d.totals.employees, 1);
  assert.equal(d.summary.totals.reports, 9); assert.equal(d.summary.totals.employees, 1, 'Union distinct, not sum of per-shift employee counts');
  assert.equal(d.languages.length, 7); assert.equal(d.languages[6].other, true); assert.equal(d.languages[6].value, 3);
  assert.equal(d.locations.length, 7); assert.equal(d.locations[6].other, true);
  assert.equal(d.employees[0].name, 'أحمد عبد الله', 'Last original selected sequence snapshot, not live employee lookup');
  assert.deepEqual(d.shifts.map(r => r.name), ['أ', 'ب']); assert.equal(d.shiftSeries.length, 2);
  assert.equal(d.locationSeries.length, 1); assert.equal(d.locationSeries[0].points.length, 1);
  assert.equal(d.available.total, 11); assert.deepEqual(d.available.first, { y: 1447, m: 12, d: 1 });
  assert.ok(!('rows' in d) && !('reports' in d), 'No report history in aggregate DTO');
  const narrowed = (await X.read('super', { view: 'dashboard', mode: 'month', year: 1448, month: 1, sumQ: 'أ', bucket: 'day' })).dashboard;
  assert.deepEqual(narrowed.summary.rows.map(r => r.name), ['أ']); assert.equal(narrowed.summary.totals.reports, 5);
});

test('Custom ranges, prior range and missing/empty catalogs preserve the explicit DTO contract', async () => {
  const X = await world([report('one', { d: 1 }), report('two', { d: 2 }), report('previous', { y: 1447, m: 12, d: 30 })]);
  const catalogs = await X.read('super', { view: 'catalogs' });
  assert.deepEqual(catalogs.catalogs.languages, { present: true, values: [] });
  const d = (await X.read('super', { view: 'dashboard', mode: 'custom', year: 1448, month: 1, from: '1448-1-1', to: '1448-1-2', previousFrom: '1447-12-29', previousTo: '1447-12-30', bucket: 'day' })).dashboard;
  assert.equal(d.totals.reports, 2); assert.equal(d.previous.reports, 1);
  assert.equal(d.series.length, 2); assert.equal(d.previousSeries.length, 1); assert.equal(d.selection.bucket, 'day');
  await assert.rejects(() => X.read('super', { view: 'dashboard', mode: 'custom', from: 'bad', to: '1448-1-1' }), /irshad-range/);
});

test('A manual permission change after capture rejects the in-flight read before returning any data', async () => {
  const X = await world([report('one')]), prepare = X.DB.prepare.bind(X.DB);
  let raced = false;
  X.DB.prepare = sql => {
    if (!raced && sql.includes('SELECT COUNT(*) total')) {
      raced = true;
      const perms = copy(X.keys.bassam_perms_v1); perms.TEST_ONLY_concurrent_marker = 1;
      X.DB.db.prepare('UPDATE kv SET v=? WHERE k=? AND seq=0').run(JSON.stringify(perms), 'bassam_perms_v1');
    }
    return prepare(sql);
  };
  await assert.rejects(() => X.read('super', { view: 'calendar', year: 1448, month: 1 }), /irshad-read-race/);
  assert.equal(raced, true);
});

test('An explicit empty location or shift filter differs from an omitted filter and its cursor', async () => {
  const X = await world([report('normal'), report('empty', { loc: '', shift: '' }), report('null', { loc: null })]);
  const q = { view: 'records', year: 1448, month: 1, limit: 1 };
  const unfiltered = await X.read('super', q);
  assert.equal(unfiltered.total, 3);
  const emptyLocation = await X.read('super', { ...q, loc: '', limit: 200 });
  assert.equal(emptyLocation.total, 2, 'Empty string is a location choice, not the all-locations sentinel');
  assert.deepEqual(emptyLocation.rows.map(r => r.id), ['empty', 'null']);
  const emptyShift = await X.read('super', { ...q, shift: '', limit: 200 });
  assert.equal(emptyShift.total, 1);
  assert.equal(emptyShift.rows[0].id, 'empty');
  await assert.rejects(() => X.read('super', { ...q, loc: '', cursor: unfiltered.next }), /irshad-cursor-stale/);
  await assert.rejects(() => X.read('super', { ...q, shift: '', cursor: unfiltered.next }), /irshad-cursor-stale/);
});

test('Invalid presence metadata refuses reads and write contexts without repairing the database', async () => {
  const X = await world([report('one')]), key = 'irshad:' + D + ':presence';
  for (const value of ['-1', '64', 'not-a-number', '1.5']) {
    X.DB.db.prepare('UPDATE meta SET v=? WHERE k=?').run(value, key);
    await assert.rejects(() => X.read('super', { view: 'catalogs' }), e => e.irCode === 'irshad-presence-invalid' && e.irStatus === 503);
    await assert.rejects(() => X.W.irQueryContext(X.env, X.actor('super'), D, { write: true }), e => e.irCode === 'irshad-presence-invalid' && e.irStatus === 503);
    assert.equal(X.DB.db.prepare('SELECT v FROM meta WHERE k=?').get(key).v, value, 'Never hide corrupt metadata by repairing it during a read');
  }
});
