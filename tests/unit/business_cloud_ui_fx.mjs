/* Actual module VM fixture shared by bounded UI and canonical HTTP tests. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { ROOT } from './harness.mjs';
import assert from 'node:assert/strict';
export { ROOT };
const json = (value, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => value });
const clock = { y: 1448, m: 5, d: 19, now: 1793318400000 };
const bases = {
  seized: { epoch: 2, reports: 3, catalog: 4, actions: 5, locations: 6, jew: 7, retro: 8 },
  award: { epoch: 2, records: 3, docsV1: 4, docsV2: 5 },
};
const item = () => ({ id: 1, n: 3, val: 0, act: 'sto', kind: '', kindTxt: '', photos: [] });
const catalogDto = () => ({ catalogs: {
  catalog: { present: true, value: { ver: 'TEST_ONLY', cats: [{ name: 'TEST_ONLY', color: '#000', def: 'sto', items: [{ id: 1, name: 'TEST_ONLY_item', unit: 'pc' }] }] } },
  actions: { present: true, value: [{ k: 'sto', name: 'TEST_ONLY_action' }] }, locations: { present: false, value: [] }, jew: { present: true, value: [] },
} });
const ack = (module, body, extra = {}) => {
  const affected = module === 'award' ? body.op === 'reference-replace' ? 'docsV2' : 'records' : body.op === 'catalog-replace' ? [body.kind] : ['reports'];
  const base = { ...body.base }, fields = Array.isArray(affected) ? affected : [affected], rev = Math.max(20, ...Object.values(base).map(value => value + 1)); fields.forEach(key => { base[key] = rev; });
  return json({ ok: 1, requestId: body.requestId, op: body.op, affected, id: body.id || 'TEST_ONLY_created', n: 1, rev, base, ...extra });
};
const waitFor = async predicate => {
  const deadline = Date.now() + 1500;
  while (!predicate()) { assert.ok(Date.now() < deadline, 'bounded local asynchronous operation completed'); await new Promise(resolve => setTimeout(resolve, 2)); }
};

function browser(module, handler, currentClock = clock) {
  let dept = 'TEST_ONLY_department', uid = 'TEST_ONLY_owner';
  const calls = [], storage = [], notices = [], timers = new Set(), events = new Map();
  const Count = (n, label) => String(n) + ' ' + label;
  Count.pair = (key, value) => ({ [key]: value }); Count.agr = () => '';
  class Base {
    MONTHS = Array.from({ length: 12 }, (_, i) => 'شهر' + (i + 1));
    WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    hToday() { return currentClock; }
    hParts() { return currentClock; }
    _hfmt() { return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' }); }
    setState(patch) { Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch); }
    bsOn() { return false; }
    bsLensOn() { return false; }
    _irCanWrite() { return true; }
    _irPermVals() { return {}; }
    loadEmployeesIr() { return []; }
    loadShiftOptsIr() { return []; }
    irActor() { return 'TEST_ONLY_actor'; }
  }
  const KIVO = { BassamPageKit: { base: () => Base }, BassamCount: Count,
    BassamAuth: { user: () => ({ id: uid, role: 'super' }), display: () => ({ name: 'TEST_ONLY_actor' }), isSuper: () => true },
    BassamDepts: { active: () => dept, has: value => value === dept && !!dept, activeName: () => 'TEST_ONLY_department' },
    BassamPerm: { can: () => true, subOn: () => true, key: () => true },
    __BS_SRV: { sesChanged: () => false }, BassamFind: { filter: (_, rows) => rows, match: () => true } };
  const W = { KIVO, DCLogic: Base, URLSearchParams, AbortController, Uint8Array, crypto: webcrypto, Intl, Date, console,
    __BS_BOOT: { srv: 1, cf: 1, uid },
    localStorage: { getItem(key) { storage.push(['get', key]); throw Error('TEST_ONLY device store forbidden'); }, setItem(key) { storage.push(['set', key]); throw Error('TEST_ONLY device store forbidden'); } },
    setTimeout(fn, delay) { const timer = setTimeout(fn, delay); timers.add(timer); return timer; }, clearTimeout,
    addEventListener(type, fn) { const set = events.get(type) || new Set(); set.add(fn); events.set(type, set); },
    removeEventListener(type, fn) { events.get(type)?.delete(fn); },
    dispatchEvent(event) { for (const fn of events.get(event.type) || []) fn(event); },
    document: { addEventListener() {}, removeEventListener() {}, getElementById() { return null; } },
    fetch: async (url, options = {}) => { calls.push({ url: String(url), options }); return handler(String(url), options); } };
  W.window = W; vm.createContext(W);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), W);
  const pageKitBase = W.KIVO.BassamPageKit.base;
  W.KIVO.BassamPageKit.base = (base, traits) => class extends pageKitBase(base, traits) { hToday() { return currentClock; } };
  const dir = path.join(ROOT, 'src/modules', module), meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const source = ['logic.js', ...(meta.logicParts || [])].map(file => fs.readFileSync(path.join(dir, file), 'utf8')).join('\n');
  vm.runInContext(source + '\nglobalThis.TestComponent = Component;', W);
  const page = new W.TestComponent(); page.bsToast = value => notices.push(value); page.bsAck = value => notices.push(value);
  page.awEmpList = () => [{ eid: 'TEST_ONLY_employee', name: 'TEST_ONLY_name', empno: 'TEST_ONLY_001' }];
  page.awKeyOf = employee => employee.eid;
  return { page, W, KIVO, calls, storage, notices, events, base: { ...bases[module] },
    seed(view, extra = {}) { const data = { ok: 1, dept, view, base: { ...bases[module] }, clock, _contextKey: uid + '\0' + dept, ...extra }; page.state[module === 'seized' ? 'sz' + view[0].toUpperCase() + view.slice(1) : 'aw' + view[0].toUpperCase() + view.slice(1)] = data; return data; },
    context() { return { uid, dept, key: uid + '\0' + dept }; },
    dept(value) { dept = value; }, user(value) { uid = value; }, cleanup() { for (const timer of timers) clearTimeout(timer); } };
}

function seedForm(B, module) {
  if (module === 'seized') {
    B.seed('catalogs', catalogDto());
    B.seed('calendar', { total: 0, yearTotal: 0, months: [], days: [], monthTotals: { reports: 0, qty: 0, sar: 0, actions: {} } });
    B.page.state.irDraft = { ...B.page.emptyDraft(), no: 'TEST_ONLY_record', items: [item()] };
  } else {
    B.seed('records', { recs: [], total: 0, filteredTotal: 0, page: 1, pageSize: 10, summary: { total: 0, eligible: 0, employeeScoreAverage: null, topScore: null, topRecord: null } });
    Object.assign(B.page.state, { ekey: 'TEST_ONLY_employee', cat: 'emp', comp: 'TEST_ONLY_001', fileOk: true, ans: B.page.QUESTIONS.map(() => true) });
  }
}
const save = (page, module) => module === 'seized' ? page.szSaveRec(page.state.irDraft) : page.awDoSave();


export { json, clock, bases, item, catalogDto, ack, waitFor, browser, seedForm, save };
