import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import nodePath from 'node:path';
import { fileURLToPath as _f2p } from 'node:url';
import { moduleDir as _md } from '../../tools/systems_paths.mjs';
/* V7 · الحزمة ب: مسارُ وحدة الصفحة نسبةً إلى الجذر — src/modules/<slug> أو src/systems/<key>/client */
const modRel = (slug) => nodePath.relative(_f2p(new URL('../../', import.meta.url)), _md(_f2p(new URL('../../src', import.meta.url)), slug)).split(nodePath.sep).join('/');

const source = path => fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

test('authenticated identity boot never rewrites legacy account keys, permission sheets, templates or lenses', () => {
  const writes = [], timers = [], manager = { id: 'TEST_ONLY manager', role: 'dept', deptId: 'TEST_ONLY dept' };
  const users = [{ id: 'TEST_ONLY staff', role: 'staff', deptId: manager.deptId, ekey: 'TEST_ONLY legacy name' }];
  const perms = { emps: { [manager.deptId]: { 'TEST_ONLY legacy name': { 'emps/data': ['view'] } } }, tplOf: { [manager.deptId]: { 'TEST_ONLY legacy name': 'TEST_ONLY template' } }, empLens: { [manager.deptId]: { 'TEST_ONLY legacy name': { 'TEST_ONLY lens': true } } } };
  const before = JSON.stringify({ users, perms });
  const I = {
    D: { setScopeGuard() {}, active: () => manager.deptId }, cur: () => manager, curDept: () => manager.deptId,
    isMgrKey: () => false, rawUsers: () => users, writeUsers: value => writes.push(['users', value]),
    permStore: () => perms, permSave: value => writes.push(['perms', value]), u0: manager, needsPwChange: () => false,
  };
  const context = { KIVO: { __BS_I: { auth: I }, BassamEmp: {} },
    localStorage: { getItem: () => JSON.stringify([{ eid: 'TEST_ONLY stable id', name: 'TEST_ONLY legacy name' }]) },
    setTimeout: (fn, ms) => timers.push({ fn, ms }), setInterval() {},
    window: { addEventListener() {} }, document: { addEventListener() {} },
  };
  vm.runInNewContext(source('src/auth/335-identity-gate.js'), context);
  timers.filter(timer => timer.ms === 1500).forEach(timer => timer.fn());
  assert.deepEqual(writes, []);
  assert.equal(JSON.stringify({ users, perms }), before);
});

function page(module, documents) {
  const values = new Map(Object.entries(documents).map(([key, value]) => [key, JSON.stringify(value)]));
  const writes = [];
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { writes.push({ key, value }); values.set(key, value); },
    removeItem: key => { writes.push({ key }); values.delete(key); },
  };
  const operations = {
    get: key => values.has(key) ? JSON.parse(values.get(key)) : null,
    text: key => values.get(key) ?? null,
  };
  const context = { KIVO: { __BS_SRV: { operations }, BassamPageKit: { base: () => class {} } }, DCLogic: class {}, window: {}, localStorage };
  vm.runInNewContext(source(modRel(module) + '/logic.js') + '\nglobalThis.Page = Component;', context);
  const instance = Object.create(context.Page.prototype);
  instance.curHijri = () => ({ y: 1448, m: 5, d: 19 });
  instance.state = {};
  return { instance, writes, values };
}

for (const module of ['employees', 'staff']) {
  test(module + ' employee reads preserve historical identity and fields without creating IDs or saving', () => {
    const rows = [{ name: 'TEST_ONLY legacy', nid: 'TEST_ONLY nid', job: 'TEST_ONLY historical field' }, { eid: 'TEST_ONLY e2', name: 'TEST_ONLY existing' }];
    const f = page(module, { bassam_employees_v1: rows });
    assert.deepEqual(plain(f.instance.loadEmp()), rows);
    assert.deepEqual(f.writes, []);
    assert.deepEqual(JSON.parse(f.values.get('bassam_employees_v1')), rows);
  });
}

test('monthly staffing reads preserve V3 source keys and do not rewrite name aliases', () => {
  const staffing = { '1448-5': { 'TEST_ONLY legacy': { shift: 'TEST_ONLY old shift', rest: ['الجمعة'] } } };
  const f = page('staff', { bassam_employees_v1: [{ eid: 'TEST_ONLY e1', name: 'TEST_ONLY legacy' }], bassam_staffing_v3: staffing });
  assert.deepEqual(plain(f.instance.loadStaffing()), staffing);
  assert.deepEqual(f.writes, []);
});

test('absent V3 does not revive V2 under the current month or create a cloud write', () => {
  const f = page('staff', { bassam_staffing_v2: { 'TEST_ONLY e1': { shift: 'TEST_ONLY shift' } } });
  assert.deepEqual(plain(f.instance.loadStaffing()), {});
  assert.deepEqual(f.writes, []);
});

test('shift reads keep stored names and derive orphan presentation without saving definitions', () => {
  const shifts = ['الصباحية', 'المسائية', 'الليلية'].map(name => ({ name, color: '#b99751' }));
  const f = page('staff', {
    bassam_shift_options_v1: shifts,
    bassam_staffing_v3: { '1448-5': { 'TEST_ONLY e1': { shift: 'TEST_ONLY orphan shift' } } },
  });
  const result = plain(f.instance.loadShiftOpts());
  assert.deepEqual(result.slice(0, 3), shifts);
  assert.equal(result.at(-1).name, 'TEST_ONLY orphan shift');
  assert.deepEqual(f.writes, []);
  assert.deepEqual(JSON.parse(f.values.get('bassam_shift_options_v1')), shifts);
});

const NOW = Date.UTC(2026, 9, 30, 17);
class Clock extends Date {
  constructor(...args) { super(...(args.length ? args : [NOW])); }
  static now() { return NOW; }
  getHours() { return 17; }
  getMinutes() { return 0; }
}
const HIJRI = { year: '1448', month: '5', day: '19' };
function observer(live, snapshot) {
  const dept = 'TEST_ONLY dept', scoped = key => 'bsdept:' + dept + ':' + key;
  const values = new Map([
    [scoped('bassam_staffing_v3'), JSON.stringify(live)],
    [scoped('bassam_staffing_snap_v1'), JSON.stringify(snapshot)],
    [scoped('bassam_dreport_v1'), '{}'],
  ]);
  const reads = [], events = [], listeners = new Map(), writes = [];
  const I = {
    D: () => ({ raw: { allKeys: () => [...values.keys()] } }),
    J: (text, fallback) => { try { return text == null ? fallback : JSON.parse(text); } catch { return fallback; } },
    rawGet: key => { reads.push(key); return values.get(key) ?? null; },
    rawSet: (key, value) => { writes.push({ key, value }); values.set(key, value); },
    myDept: () => dept, me: () => ({ id: 'TEST_ONLY owner', role: 'dept', name: 'TEST_ONLY manager' }),
    isMgr: () => true, isSuper: () => false, P: () => ({}),
    emit: (type, detail) => events.push({ type, detail }),
    refresh() {}, flushEvents() {}, monLbl: key => key,
  };
  const context = {
    KIVO: { __BS_I: { notif: I }, __BS_SRV: { operations: {
      resources: ['bassam_staffing_v3', 'bassam_staffing_snap_v1', 'bassam_dreport_v1', 'bassam_employees_v1', 'bassam_shift_options_v1'],
      reference: key => { reads.push(key); return values.has(key) ? JSON.parse(values.get(key)) : null; },
    } } },
    window: { addEventListener: (name, fn) => listeners.set(name, fn) },
    setTimeout() {}, setInterval() {}, Date: Clock,
    Intl: { DateTimeFormat: class { formatToParts() { return Object.entries(HIJRI).map(([type, value]) => ({ type, value })); } } },
    fetch() { throw Error('No network in observer source regression'); },
  };
  vm.runInNewContext(source('src/services/442-notif-observer.js'), context);
  reads.length = 0;
  return { context, reads, events, writes, values, scoped, listeners };
}

test('notification gap uses live V3 and never reads a retired snapshot bucket', () => {
  const rows = Object.fromEntries(Array.from({ length: 6 }, (_, i) => ['TEST_ONLY e' + i, { shift: i === 5 ? 'TEST_ONLY thin' : 'TEST_ONLY full' }]));
  const stale = Object.fromEntries(Array.from({ length: 6 }, (_, i) => ['TEST_ONLY e' + i, { shift: i < 3 ? 'TEST_ONLY thin' : 'TEST_ONLY full' }]));
  const f = observer({ '1448-5': rows }, { '1448-5': { bucket: stale } });
  f.context.KIVO.BassamNotif.tick();
  assert.deepEqual(f.events.filter(e => e.type === 'st_gap').map(e => e.detail.vars['الوردية']), ['TEST_ONLY thin']);
  assert.equal(f.reads.some(key => key.endsWith('bassam_staffing_snap_v1')), false);
  assert.deepEqual(f.writes, []);
});

test('report notification fallback uses live rest, while an explicit pulled-report rest map wins', () => {
  for (const frozen of [false, true]) {
    const everyDay = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const f = observer({ '1448-5': { 'TEST_ONLY e1': { rest: [] } } }, { '1448-5': { bucket: { 'TEST_ONLY e1': { rest: everyDay } } } });
    const key = f.scoped('bassam_dreport_v1');
    f.values.set(key, JSON.stringify({ '1448-5-19': { shifts: { 'TEST_ONLY shift': { pulled: true, roster: [{ ekey: 'TEST_ONLY e1', st: 'pr' }], ...(frozen ? { rest: { 'TEST_ONLY e1': everyDay } } : {}) } } } }));
    f.listeners.get('bassam:operations-commit')({ detail: { uid: f.context.KIVO.__BS_I.notif.me().id, dept: 'TEST_ONLY dept', requestId: 'TEST_ONLY confirmed report', changes: [{ key, before: '{}', after: f.values.get(key) }] } });
    assert.equal(f.events.some(e => e.type === (frozen ? 'rep_restday' : 'rep_today')), true);
    assert.equal(f.events.some(e => e.type === (frozen ? 'rep_today' : 'rep_restday')), false);
    assert.equal(f.reads.some(name => name.endsWith('bassam_staffing_snap_v1')), false);
  }
});
