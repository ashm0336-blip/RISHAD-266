/* Actual Irshad module -> actual canonical HTTP Worker -> SQLite.
 * 205 existing synthetic rows are needed to cross the 200-row export boundary.
 * No cloud, browser persistence or R2 operation is permitted by the fixture.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { candidateWorker, seed, D1, D2, IDS, identitySnapshot, ROOT } from './irshad_domain_fx.mjs';
import { world } from './custody_review_fx.mjs';
import { installOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { EKEYS } from './notifications_review_fx.mjs';

test('real module saves with a lost committed ACK, retries once, edits, aggregates and exports every filtered page without duplicate effects', async t => {
  const B = await world(); B.W = await candidateWorker();
  await installOperationalFixture(B.env);
  const { W, DB, env } = B;
  const perms = structuredClone(B.keys.bassam_perms_v1);
  Object.values(perms.caps).forEach(cap => { if (!cap.includes('irshad')) cap.push('irshad'); });
  perms.emps[D1][EKEYS.employee1]['irshad/records'] = ['view'];
  await DB.batch(W.kvPutStmts(env, 'kv', 'bassam_perms_v1', JSON.stringify(perms)));
  // ir_new is disabled by default; enable it only in this synthetic world to
  // verify that a replay does not duplicate the event's persisted effects.
  DB.db.prepare('INSERT INTO notification_type_overrides(type_id,enabled)VALUES(?,1)').run('ir_new');
  let r2Calls = 0;
  env.IMG_R2 = new Proxy({}, { get() { r2Calls++; throw Error('No R2 calls in Irshad'); } });
  const initial = await B.api('super', '/api/irshad?' + new URLSearchParams({ uid: IDS.super, dept: D1, view: 'calendar' }));
  assert.equal(initial.status, 200, JSON.stringify(initial.json));
  const clock = initial.json.clock, shift = 'الوردية الأولى';
  await seed(B, { reports: { reports: Array.from({ length: 205 }, (_, i) => ({
    id: 'TEST_ONLY_seed_' + i, y: clock.y, m: clock.m, d: clock.d, ts: i + 1, shift,
    eid: EKEYS.employee1, name: 'TEST_ONLY historical ' + i, loc: 'TEST_ONLY_location',
    langs: [{ lang: 'TEST_ONLY_seed_language', count: 1 }], bro: 0, pros: 0, pol: 0,
  })) }, languages: ['العربية'], locations: ['TEST_ONLY_location'] });
  const protectedBefore = identitySnapshot(DB), calls = [], storage = [], timers = [];
  let loseFirstCommittedCreate = true;
  const Count = (n, label) => n + ' ' + label;
  Count.pair = (key, n) => ({ [key]: n }); Count.agr = () => 'فيها';
  class Base {
    hToday() { return { y: clock.y, m: clock.m, d: clock.d }; }
    _hfmt() { return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' }); }
    setState(value) { Object.assign(this.state, typeof value === 'function' ? value(this.state) : value); }
    MONTHS = Array.from({ length: 12 }, (_, i) => 'شهر' + (i + 1));
    WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    bsOn() { return false; }
    _irCanWrite() { return true; }
    _rowMenu() { return {}; }
    loadEmployeesIr() { return B.keys['bsdept:' + D1 + ':bassam_employees_v1']; }
    loadShiftOptsIr() { return [{ name: shift }]; }
  }
  const C = { DCLogic: Base, KIVO: { BassamPageKit: { base: () => Base }, BassamCount: Count, BassamAuth: { user: () => B.users.find(u => u.id === IDS.super) },
    BassamDepts: { active: () => D1, has: value => value === D1 }, BassamPerm: { can: () => true }, __BS_SRV: { sesChanged: () => false, askReason: (key, keys, done) => done('TEST_ONLY explicit operator reason') } },
    __BS_BOOT: { srv: 1, cf: 1, uid: IDS.super }, URLSearchParams, AbortController, Uint8Array, Intl, Date, crypto: webcrypto,
    setTimeout(fn, ms) { const timer = setTimeout(fn, ms); timers.push(timer); return timer; }, clearTimeout,
    localStorage: { getItem(key) { storage.push(key); throw Error('No device data'); }, setItem(key) { storage.push(key); throw Error('No device writes'); } },
    indexedDB: { open() { throw Error('No browser database'); } },
    fetch: async (url, options = {}) => {
      const headers = new Headers(options.headers); headers.set('Cookie', 'bs_tok=TEST_ONLY_session_super');
      if (options.method === 'POST') headers.set('Origin', 'http://x');
      const response = await W.default.fetch(new Request('http://x' + url, { ...options, headers }), env);
      calls.push({ url: String(url), body: options.body, status: response.status });
      if (options.method === 'POST' && JSON.parse(options.body).op === 'create' && response.ok && loseFirstCommittedCreate) {
        loseFirstCommittedCreate = false; throw Error('TEST_ONLY lost response after commit');
      }
      return response;
    } };
  C.window = C; vm.createContext(C);
  const source = fs.readFileSync(path.join(ROOT, 'src/modules/irshad/logic.js'), 'utf8');
  vm.runInContext(source + '\nglobalThis.TestComponent = Component;', C);
  const page = new C.TestComponent(); page.bsToast = () => {}; page.bsAck = () => {};
  t.after(() => timers.forEach(clearTimeout));
  async function reads() {
    for (const [view, options] of [['calendar', { year: clock.y, month: clock.m }], ['records', { year: clock.y, month: clock.m, limit: 10, page: 1 }], ['catalogs', {}]]) {
      const result = await page._irRead(view, options); assert.equal(result.ok, 1, JSON.stringify(result));
      page.state['ir' + view[0].toUpperCase() + view.slice(1)] = { ...result.data, _contextKey: result.contextKey };
    }
  }
  await reads();
  page.state.irDraft = { shift, eid: EKEYS.employee1, loc: 'TEST_ONLY_location', langs: [{ lang: 'العربية', count: 9 }], bro: '2', pros: '1', pol: '0', langSel: '', langN: '' };
  page._irStampDraft();
  await page._recordsCalVals().irSaveReport();
  if (loseFirstCommittedCreate) await page._recordsCalVals().irSaveReport(); // Explicit reason retry, if policy requires one.
  assert.equal(loseFirstCommittedCreate, false, page.state.irSaveErrMsg);
  assert.equal(DB.q('SELECT COUNT(*) n FROM irshad_reports WHERE department_id=?1', D1)[0].n, 206);
  assert.equal(page.state.irDraft.langs.length, 1, 'A committed but unacknowledged draft remains visible');
  const beforeRetry = { aud: DB.q("SELECT COUNT(*) n FROM aud WHERE k=?1 AND act='create'", W.irKey(D1))[0].n,
    receipts: DB.q('SELECT COUNT(*) n FROM irshad_requests')[0].n, notifications: DB.q("SELECT COUNT(*) n FROM notification_messages WHERE type='ir_new'")[0].n };
  assert.equal(beforeRetry.aud, 1); assert.equal(beforeRetry.receipts, 1); assert.ok(beforeRetry.notifications > 0);
  const requestCount = calls.filter(c => c.body).length;
  await Promise.resolve(); assert.equal(calls.filter(c => c.body).length, requestCount, 'No automatic resubmission');
  await page._recordsCalVals().irSaveReport();
  const committed = calls.filter(c => c.body && JSON.parse(c.body).op === 'create' && c.status === 200);
  assert.equal(committed.length, 2); assert.equal(committed[0].body, committed[1].body);
  assert.equal(page.state.irDraft.langs.length, 0);
  assert.deepEqual({ aud: DB.q("SELECT COUNT(*) n FROM aud WHERE k=?1 AND act='create'", W.irKey(D1))[0].n,
    receipts: DB.q('SELECT COUNT(*) n FROM irshad_requests')[0].n, notifications: DB.q("SELECT COUNT(*) n FROM notification_messages WHERE type='ir_new'")[0].n }, beforeRetry);
  await reads();
  const ledger = page._recordsCalVals(); assert.equal(ledger.irLedgerRows.length, 10); assert.equal(ledger.irLgShownCount, '206'); assert.equal(ledger.irKpiBen, '217');
  const collected = await page._irCollect({ year: clock.y, month: clock.m }); assert.equal(collected.ok, 1, JSON.stringify(collected)); assert.equal(collected.rows.length, 206);
  assert.equal(new Set(collected.rows.map(r => r.id)).size, 206);
  const newRecord = page.state.irRecords.rows.find(r => !r.id.startsWith('TEST_ONLY_seed_')); assert.ok(newRecord);
  ledger.irLedgerRows[0].edit(); page.state.irDraft = { ...page.state.irDraft, bro: '7' };
  await page._recordsCalVals().irSaveReport();
  if (page.state.irEditId) await page._recordsCalVals().irSaveReport();
  assert.equal(page.state.irEditId, null, page.state.irSaveErrMsg);
  assert.equal(DB.q('SELECT brochures FROM irshad_reports WHERE department_id=?1 AND report_id=?2', D1, newRecord.id)[0].brochures, 7);
  const dashboard = await page._irRead('dashboard', { mode: 'month', year: clock.y, month: clock.m, heatYear: clock.y, bucket: 'day', sumQ: '' });
  assert.equal(dashboard.ok, 1, JSON.stringify(dashboard)); page.state.irDashboard = dashboard.data; page.state.irDashYear = clock.y; page.state.irDashMonth = String(clock.m);
  assert.equal(page._dashVals().irDashHeroNum, '٢٢٢');
  const denied = await B.api('noView', '/api/irshad?' + new URLSearchParams({ dept: D1, view: 'records', uid: IDS.noView })); assert.equal(denied.status, 403);
  assert.deepEqual(identitySnapshot(DB), protectedBefore); assert.deepEqual(storage, []); assert.equal(r2Calls, 0);
  assert.equal(DB.q('SELECT COUNT(*) n FROM irshad_reports WHERE department_id=?1', D2)[0].n, 0);
  assert.equal(DB.q("SELECT COUNT(*) n FROM kv WHERE k GLOB '*bassam_irshad*'")[0].n, 0);
});
