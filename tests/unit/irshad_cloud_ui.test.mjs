/* Module-only cloud transport and presentation proofs. Synthetic data; no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { ROOT } from './harness.mjs';

const source = fs.readFileSync(path.join(ROOT, 'src/modules/irshad/logic.js'), 'utf8');
const base = { epoch: 2, reports: 3, languages: 4, locations: 5, retro: 6 };
const clock = { y: 1448, m: 5, d: 19, now: 1793318400000 };
const json = (value, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => value });
const ack = (body, extra = {}) => json({ ok: 1, requestId: body.requestId, op: body.op, rev: 8, n: 1, id: 'TEST_ONLY_report', base: { ...base, reports: 8 }, ...extra });
const draft = () => ({ shift: 'TEST_ONLY_shift', eid: 'TEST_ONLY_employee', loc: 'TEST_ONLY_location', langs: [{ lang: 'العربية', count: 9 }], bro: '2', pros: '1', pol: '0', langSel: '', langN: '' });

test('Irshad uses the existing page-kit toast with the same warning/success presentation and hide lifecycle', () => {
  const attributes = {}, timers = [], node = { style: {}, setAttribute(key, value) { attributes[key] = value; } };
  const W = { KIVO: {}, DCLogic: class {}, Intl, Date,
    document: { getElementById: () => node }, requestAnimationFrame: fn => fn(),
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; }, clearTimeout() {} };
  W.window = W; vm.createContext(W);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), W);
  vm.runInContext(source + '\nglobalThis.TestComponent = Component;', W);
  const page = new W.TestComponent();
  page.bsToast('TEST_ONLY warning', 'warn');
  assert.equal(node.textContent, '⚠  TEST_ONLY warning'); assert.match(attributes.style, /var\(--toast-warn\)/);
  assert.equal(node.style.opacity, '1'); assert.equal(timers[0].delay, 4200);
  timers[0].fn(); assert.equal(node.style.opacity, '0');
  page.bsToast('TEST_ONLY saved', 'ok'); assert.equal(node.textContent, '✓  TEST_ONLY saved'); assert.match(attributes.style, /var\(--toast-ok\)/);
});

function browser(handler = async () => json({ ok: 0 }, 500)) {
  const calls = [], storage = [], notices = [], timers = [], events = new Map();
  let dept = 'TEST_ONLY_department', user = 'TEST_ONLY_user';
  const Count = (n, label) => String(n) + ' ' + label;
  Count.pair = (prefix, value) => ({ [prefix]: value }); Count.agr = () => 'فيها';
  class Base {
    hToday() { return { y: 1448, m: 5, d: 19 }; }
    _hfmt() { return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' }); }
    setState(patch) { Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch); }
    MONTHS = Array.from({ length: 12 }, (_, n) => 'شهر' + (n + 1));
    WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    bsOn() { return false; }
    _rowMenu() { return {}; }
    _irPermVals() { return { irPmNoteStyle: '', irPmReadOnly: false }; }
    _irCanWrite() { return true; }
    loadEmployeesIr() { return [{ eid: 'TEST_ONLY_employee', name: 'TEST_ONLY_employee_snapshot' }]; }
    loadShiftOptsIr() { return [{ name: 'TEST_ONLY_shift' }]; }
  }
  const KIVO = { BassamPageKit: { base: () => Base }, BassamCount: Count, BassamAuth: { user: () => ({ id: user }) },
    BassamDepts: { active: () => dept }, BassamPerm: { can: () => true, subOn: () => true }, __BS_SRV: { sesChanged: () => false }, bsPct: Math.round };
  const W = { KIVO, DCLogic: Base, URLSearchParams, AbortController, Uint8Array, crypto: webcrypto, Intl, Date, console,
    __BS_BOOT: { srv: 1, cf: 1, uid: user },
    localStorage: { getItem(k) { storage.push(['get', k]); throw Error('Device storage forbidden'); }, setItem(k) { storage.push(['set', k]); throw Error('Device storage forbidden'); } },
    setTimeout(fn, ms) { const timer = setTimeout(fn, ms); timers.push(timer); return timer; }, clearTimeout,
    addEventListener(type, fn) { const list = events.get(type) || new Set(); list.add(fn); events.set(type, list); },
    removeEventListener(type, fn) { events.get(type)?.delete(fn); },
    dispatchEvent(event) { for (const fn of events.get(event.type) || []) fn(event); },
    fetch: async (url, options = {}) => { calls.push({ url: String(url), options }); return handler(String(url), options); }, print() { notices.push('print'); } };
  W.window = W; vm.createContext(W); vm.runInContext(source + '\nglobalThis.TestComponent = Component;', W);
  const page = new W.TestComponent();
  page.bsToast = message => notices.push(message); page.bsAck = message => notices.push(message);
  page.state.irTab = 'records'; page.state.irYear = 1448; page.state.irMonth = 5; page.state.irDay = 19;
  const context = { dept, _contextKey: user + '\0' + dept };
  page.state.irCalendar = { ...context, base: { ...base }, total: 20, yearTotal: 20, months: [{ m: 5, n: 20 }], days: [{ d: 19, n: 20 }], monthTotals: { reports: 20, ben: 260, trans: 180, bro: 40, pros: 20, pol: 20 } };
  page.state.irRecords = { ...context, base: { ...base }, rows: [], total: 20, monthTotal: 20, page: 1, pageSize: 10 };
  page.state.irCatalogs = { ...context, base: { ...base }, catalogs: { languages: { present: true, values: ['العربية'] }, locations: { present: true, values: ['TEST_ONLY_location'] } } };
  const cleanup = () => timers.forEach(clearTimeout);
  return { page, W, calls, storage, notices, cleanup, dept(value) { dept = value; }, user(value) { user = value; } };
}

test('lost save ACK retains the exact draft and explicit retry sends the identical ticket, with no storage', async t => {
  let first = true;
  const B = browser(async (_, options) => { if (first) { first = false; throw Error('TEST_ONLY lost response'); } return ack(JSON.parse(options.body)); }); t.after(B.cleanup);
  B.page.state.irDraft = draft();
  await B.page._recordsCalVals().irSaveReport();
  assert.equal(B.page.state.irDraft.langs[0].count, 9);
  const body = B.calls[0].options.body;
  await Promise.resolve(); assert.equal(B.calls.length, 1, 'No automatic mutation replay');
  await B.page._recordsCalVals().irSaveReport();
  assert.equal(B.calls[1].options.body, body);
  assert.equal(B.page.state.irDraft.langs.length, 0);
  assert.equal(JSON.parse(body).data.actor, undefined); assert.equal(JSON.parse(body).data.ts, undefined);
  assert.deepEqual(B.storage, []);
});

test('malformed and mismatched ACKs never clear a draft or manufacture a saved row', async t => {
  for (const invalid of [{ base: undefined }, { requestId: 'TEST_ONLY_wrong' }, { op: 'delete' }, { n: 0 }, { rev: '8' }, { id: null }]) {
    const B = browser(async (_, options) => ack(JSON.parse(options.body), invalid)); t.after(B.cleanup);
    B.page.state.irDraft = draft();
    await B.page._recordsCalVals().irSaveReport();
    assert.equal(B.page.state.irDraft.langs[0].count, 9);
    assert.equal(B.page.state.irRecords.rows.length, 0);
    assert.match(B.page.state.irSaveErrMsg, /تأكيد/);
    assert.deepEqual(B.storage, []);
  }
});

test('a delayed confirmed save cannot clear a newer draft', async t => {
  let release;
  const B = browser(async (_, options) => new Promise(resolve => { release = () => resolve(ack(JSON.parse(options.body))); })); t.after(B.cleanup);
  B.page.state.irDraft = draft(); const pending = B.page._recordsCalVals().irSaveReport();
  B.page.state.irDraft = { ...draft(), bro: '99' }; release(); await pending;
  assert.equal(B.page.state.irDraft.bro, '99'); assert.equal(B.page.state.irEditId, 'TEST_ONLY_report'); assert.deepEqual(B.storage, []);
});

test('editing an uncertain create draft still confirms its original request before updating the created record', async t => {
  let first = true;
  const B = browser(async (_, options) => { if (first) { first = false; throw Error('TEST_ONLY lost ACK'); } return ack(JSON.parse(options.body)); }); t.after(B.cleanup);
  B.page.state.irDraft = draft();
  await B.page._recordsCalVals().irSaveReport();
  B.page.state.irDraft = { ...draft(), bro: '77' };
  await B.page._recordsCalVals().irSaveReport();
  assert.equal(B.calls[1].options.body, B.calls[0].options.body, 'An uncertain committed create must not be duplicated under a new request ID');
  assert.equal(B.page.state.irDraft.bro, '77'); assert.equal(B.page.state.irEditId, 'TEST_ONLY_report');
});

test('an uncertain ticket is retried even when employee shift references changed after its possible commit', async t => {
  let first = true;
  const B = browser(async (_, options) => { if (first) { first = false; throw Error('TEST_ONLY lost ACK'); } return ack(JSON.parse(options.body)); }); t.after(B.cleanup);
  B.page.state.irDraft = draft(); await B.page._recordsCalVals().irSaveReport();
  B.page.loadEmployeesIr = () => [];
  await B.page._recordsCalVals().irSaveReport();
  assert.equal(B.calls.length, 2); assert.equal(B.calls[1].options.body, B.calls[0].options.body);
  assert.equal(B.page.state.irDraft.langs.length, 0);
});

test('a definite reason refusal opens the existing reason dialog before making a fresh reasoned ticket', async t => {
  const B = browser(async (_, options) => {
    const body = JSON.parse(options.body);
    return body.reason ? ack(body) : json({ ok: 0, err: 'irshad-denied', why: 'reason', keys: ['ir.rec.edit'] }, 403);
  }); t.after(B.cleanup);
  const reasons = [];
  B.W.KIVO.__BS_SRV.askReason = (key, keys, cb) => { reasons.push({ key, keys: [...keys] }); cb('TEST_ONLY reviewed reason'); };
  B.page.state.irDraft = draft();
  await B.page._recordsCalVals().irSaveReport();
  assert.equal(B.calls.length, 1); assert.equal(B.page.state.irDraft.langs.length, 1);
  await B.page._recordsCalVals().irSaveReport();
  const first = JSON.parse(B.calls[0].options.body), second = JSON.parse(B.calls[1].options.body);
  assert.notEqual(first.requestId, second.requestId); assert.equal(second.reason, 'TEST_ONLY reviewed reason');
  assert.equal(reasons.length, 1); assert.equal(reasons[0].keys[0], 'ir.rec.edit');
  assert.equal(B.page.state.irDraft.langs.length, 0);
});

test('catalog edits and month deletion retain their editor/confirmation until a matching ACK', async t => {
  const B = browser(async () => json({ ok: 0, err: 'forbidden' }, 403)); t.after(B.cleanup);
  B.page.state.irLangEditIdx = 0; B.page.state.irLangEditVal = 'TEST_ONLY_new_language';
  await B.page._recordsCalVals().irLangRows[0].saveEdit();
  assert.equal(B.page.state.irLangEditVal, 'TEST_ONLY_new_language');
  assert.equal(B.page.state.irCatalogs.catalogs.languages.values[0], 'العربية');
  B.page.state.irLgClearAllConfirm = true;
  await B.page._recordsCalVals().irLgClearAllDo();
  assert.equal(B.page.state.irLgClearAllConfirm, true); assert.equal(B.notices.some(n => /تم حذف/.test(n)), false);
  assert.deepEqual(B.storage, []);
});

test('a catalog editor retains its original revision across a remote refresh, preventing a blind overwrite', async t => {
  const B = browser(async () => json({ ok: 0, err: 'conflict' }, 409)); t.after(B.cleanup);
  B.page._recordsCalVals().irLangRows[0].startEdit();
  B.page.state.irLangEditVal = 'TEST_ONLY_operator_name';
  B.page.state.irCatalogs = { ...B.page.state.irCatalogs, base: { ...base, languages: 99 }, catalogs: { ...B.page.state.irCatalogs.catalogs, languages: { present: true, values: ['TEST_ONLY_remote_name'] } } };
  await B.page._recordsCalVals().irLangRows[0].saveEdit();
  assert.equal(JSON.parse(B.calls[0].options.body).base.languages, 4);
  assert.equal(B.page.state.irLangEditVal, 'TEST_ONLY_operator_name'); assert.equal(B.page._irConflict, true);
});

test('draft context and epoch cannot silently move to a different department or fresh base', async t => {
  const B = browser(async (_, options) => ack(JSON.parse(options.body))); t.after(B.cleanup);
  B.page.state.irDraft = draft(); B.page._irStampDraft();
  B.page.state.irCalendar.base = { ...base, epoch: 99, reports: 99 };
  B.dept('TEST_ONLY_other_department');
  assert.equal((await B.page._irMutate('create', { data: {} }, 1)).ok, 0); assert.equal(B.calls.length, 0);
  B.dept('TEST_ONLY_department');
  await B.page._recordsCalVals().irSaveReport();
  assert.deepEqual(JSON.parse(B.calls[0].options.body).base, base, 'Original draft epoch/revision is retained');
});

test('401 and server session-changed freeze all old-context writes without storage fallback', async t => {
  for (const status of [401, 409]) {
    const B = browser(async () => json({ ok: 0, err: status === 401 ? 'session' : 'session-changed' }, status)); t.after(B.cleanup);
    const input = { data: {} };
    assert.equal((await B.page._irMutate('create', input, 1)).ok, 0);
    assert.equal((await B.page._irMutate('create', input, 1)).ok, 0);
    assert.equal(B.calls.length, 1); assert.deepEqual(B.storage, []);
  }
});

test('record counts and KPIs use complete server totals while only a bounded page is rendered', t => {
  const B = browser(); t.after(B.cleanup);
  B.page.state.irRecords = { ...B.page.state.irRecords, total: 13, page: 2, rows: [{ id: 'TEST_ONLY_page2', y: 1448, m: 5, d: 19, shift: 'TEST_ONLY_shift', langs: [], bro: 1 }] };
  B.page.state.irLedgerPage = 2;
  const values = B.page._recordsCalVals();
  assert.equal(values.irLedgerRows.length, 1); assert.equal(values.irLgShownCount, '13');
  assert.equal(values.irKpiCount, '20'); assert.equal(values.irKpiBen, '260');
  assert.equal(values.irLedgerPgRange, '11–13'); assert.equal(values.irLgTotalCount, '20');
});

test('filtered collection follows bounded cursors and refuses changed base, loops and truncated totals', async t => {
  for (const failure of ['', 'base', 'loop', 'truncated']) {
    let page = 0;
    const B = browser(async () => {
      page++;
      return json({ ok: 1, dept: 'TEST_ONLY_department', view: 'records', base: failure === 'base' && page === 2 ? { ...base, reports: 4 } : base, clock,
        year: 1448, month: 5, rows: [{ id: 'TEST_ONLY_' + page }], total: failure === 'truncated' ? 3 : 2, monthTotal: 20, page, pageSize: 200,
        next: page === 1 || failure === 'loop' ? 'TEST_ONLY_cursor' : null, prev: null });
    }); t.after(B.cleanup);
    const result = await B.page._irCollect({ year: 1448, month: 5, shift: 'TEST_ONLY_shift', q: 'أحمد ١٢' });
    assert.equal(result.ok, failure ? 0 : 1, failure);
    if (!failure) { assert.equal(result.rows.length, 2); assert.equal(new URL(B.calls[1].url, 'https://example.invalid').searchParams.get('q'), 'أحمد ١٢'); }
    assert.equal(B.calls.length, 2); assert.deepEqual(B.storage, []);
  }
});

test('aggregate dashboard renders SQL metrics, distinct summary employees and historical employee snapshots without report history', t => {
  const B = browser(); t.after(B.cleanup);
  const metrics = { reports: 3, employees: 2, trans: 18, bro: 4, pros: 2, pol: 1, ben: 25 };
  B.page.state.irDashYear = 1448; B.page.state.irDashMonth = '5';
  B.page.state.irDashboard = { base, dashboard: { available: { total: 3, years: [1448], months: [{ y: 1448, m: 5 }], first: { y: 1448, m: 5, d: 1 } },
    totals: metrics, previous: { reports: 1, trans: 4, bro: 1, pros: 0, pol: 0, ben: 5 },
    series: [{ y: 1448, m: 5, d: 1, ...metrics }], previousSeries: [{ y: 1448, m: 4, d: 1, ben: 5 }], heat: [{ m: 5, d: 1, ben: 25 }],
    languages: [{ name: 'العربية', value: 18 }], locations: [{ name: 'TEST_ONLY_location', value: 25, previous: 5 }],
    shifts: [{ name: 'TEST_ONLY_shift', ...metrics }], shiftSeries: [], locationSeries: [],
    employees: [{ key: 'TEST_ONLY_employee', name: 'TEST_ONLY_historical_name', shift: 'TEST_ONLY_shift', reports: 2, ben: 25, previous: 5 }],
    summary: { rows: [{ name: 'TEST_ONLY_shift', ...metrics }], totals: metrics, all: 1, matched: 1 } } };
  const values = B.page._dashVals();
  assert.equal(values.irDashHeroNum, '٢٥'); assert.equal(values.irDashSumTotal.emps, '2');
  assert.equal(values.irDashTopEmployees[0].name, 'TEST_ONLY_historical_name');
  assert.equal(values.irDashLangRows[0].val, '18'); assert.equal(values.irDashLocRows[0].val, '25');
  assert.equal(values.irDashGapVal, '18'); assert.equal(values.irEmptyShow, false); assert.deepEqual(B.storage, []);
});

test('print keeps the current DOM and never fetches extra records', t => {
  const B = browser(); t.after(B.cleanup);
  B.page._recordsCalVals().irLgPrintTable();
  assert.equal(B.calls.length, 0);
});

test('remote invalidation clears confirmed views for current department/authority while retaining uncertain tickets and drafts', async t => {
  const B = browser(async () => { throw Error('TEST_ONLY uncertain'); }); t.after(B.cleanup);
  B.page.componentDidMount(); B.page.state.irDraft = draft();
  await B.page._irMutate('create', { data: {} }, 1);
  const held = B.page.state.irDraft, tickets = B.page._irTickets;
  B.W.dispatchEvent({ type: 'bassam:remote', detail: { keys: ['bsdept:TEST_ONLY_other:bassam_irshad_v1'] } });
  assert.ok(B.page.state.irCalendar, 'Another department does not invalidate the current one');
  B.W.dispatchEvent({ type: 'bassam:remote', detail: { keys: ['bsdept:TEST_ONLY_department:bassam_irshad_v1'] } });
  assert.equal(B.page.state.irCalendar, null); assert.equal(B.page.state.irRecords, null);
  assert.equal(B.page.state.irDraft, held); assert.equal(B.page._irTickets, tickets); assert.equal(tickets.size, 1);
  await Promise.resolve(); assert.equal(B.calls.length, 1, 'Remote events must not replay mutations');
  B.page.state.irCalendar = { base }; B.W.dispatchEvent({ type: 'bassam:authz', detail: {} });
  assert.equal(B.page.state.irCalendar, null); assert.equal(B.page.state.irDraft, held);
  B.page.componentWillUnmount(); B.page.state.irCalendar = { base };
  B.W.dispatchEvent({ type: 'bassam:authz', detail: {} }); assert.ok(B.page.state.irCalendar, 'Listeners are removed on unmount');
  assert.equal((await B.page._irMutate('create', { data: {} }, 1)).ok, 0); assert.equal(B.calls.length, 1);
});

test('module remount restores an uncertain draft/ticket only in the same session context, without automatic replay', async t => {
  let uncertain = true;
  const B = browser(async (_, options) => { if (uncertain) throw Error('TEST_ONLY lost ACK'); return ack(JSON.parse(options.body)); }); t.after(B.cleanup);
  B.page.componentDidMount(); B.page.state.irDraft = draft(); B.page._irStampDraft();
  await B.page._recordsCalVals().irSaveReport(); const original = B.calls[0].options.body;
  B.page.componentWillUnmount();
  const other = new B.W.TestComponent(); other.bsToast = () => {}; other.componentDidMount();
  assert.equal(other.state.irDraft.langs[0].count, 9);
  await Promise.resolve(); assert.equal(B.calls.length, 1, 'Mount is not a mutation retry');
  uncertain = false;
  await other._recordsCalVals().irSaveReport();
  assert.equal(B.calls[1].options.body, original); assert.equal(other.state.irDraft.langs.length, 0);
  other.componentWillUnmount();
  B.user('TEST_ONLY_other_user'); B.W.__BS_BOOT.uid = 'TEST_ONLY_other_user';
  const different = new B.W.TestComponent(); different.componentDidMount(); assert.equal(different.state.irDraft.langs.length, 0);
  different.componentWillUnmount();
});

test('lost retro ACK refreshes windows using GET only and a later explicit click closes the confirmed active window', async t => {
  let active = { id: 'TEST_ONLY_window', scope: { y: 1448, m: 4, d: null }, until: Date.now() + 3600000 };
  const B = browser(async (url, options) => {
    if (options.method === 'GET') return json({ ok: 1, windows: [active], now: Date.now() });
    const body = JSON.parse(options.body);
    assert.equal(new URL(url, 'https://example.invalid').searchParams.get('uid'), 'TEST_ONLY_user');
    assert.equal(body.uid, undefined, 'Existing retro body contract remains intact');
    if (body.act === 'open') throw Error('TEST_ONLY response lost after window commit');
    assert.equal(body.act, 'close'); assert.equal(body.id, active.id); active = { ...active, closedAt: Date.now() };
    return json({ ok: 1, window: active });
  }); t.after(B.cleanup);
  B.W.KIVO.__BS_SRV.askReason = (key, keys, cb) => cb('TEST_ONLY retro reason');
  B.page.state.irRetro = { windows: [] };
  await B.page._irRetroToggle(active.scope);
  assert.equal(B.page.state.irRetro, null, 'Old empty window state cannot trigger another open');
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(B.calls.filter(c => c.options.method === 'POST').length, 1);
  assert.equal(B.page.state.irRetro.windows[0].id, active.id);
  await B.page._irRetroToggle(active.scope);
  assert.equal(B.calls.filter(c => c.options.method === 'POST').length, 2);
  assert.deepEqual(B.storage, []);
});
