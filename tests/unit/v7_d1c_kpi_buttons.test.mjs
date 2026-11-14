/* V7 · د1-ج · كلُّ زرٍّ في التنبيهات يذهب إلى «مؤشرات الإدارة» يفتح لوحتَه من GO_KPI، لا التبويبَ الأول.
   لكلِّ نوعِ تنبيهٍ في السجل الحقيقي (441 LEAVES) زرُّه وجهتُه kpis: الحلقاتُ الثلاث على الكود الحقيقي في vm —
   441/442 (goNav · goKpi) ⇒ root-logic (_nfOpenItem يترك KIVO.__KPI_OPEN) ⇒ src/modules/kpis (يفتح تبويبَ اللوحة). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SRC } from './harness.mjs';
import { world } from './core01_root_world.mjs';

function notif() {
  const KIVO = {
    BassamAuth: { user: () => ({ id: 'TEST_ONLY_uid', role: 'staff', deptId: 'TEST_ONLY_d1', mgr: true }), users: () => [] },
    BassamDepts: { active: () => 'TEST_ONLY_d1', list: () => [{ id: 'TEST_ONLY_d1', name: 'TEST_ONLY' }], raw: { allKeys: () => [] } },
    BassamPerm: { can: () => true, on: () => true, kpiPanelOk: () => true },
  };
  class Storage { getItem() { return null; } setItem() {} }
  const ctx = { KIVO, Storage, localStorage: new Storage(), __BS_BOOT: { srv: 1, cf: 1, uid: 'TEST_ONLY_uid' }, Response, URL, URLSearchParams, AbortController, TextEncoder, TextDecoder,
    console: { log() {}, warn() {}, error() {} }, navigator: { userAgent: 'TEST_ONLY' }, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
    CustomEvent: class { constructor(type) { this.type = type; } }, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true, document: { addEventListener() {} }, fetch: async () => new Response('{}') };
  ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['441-notif-core.js', '442-notif-observer.js']) vm.runInContext(fs.readFileSync(path.join(SRC, 'services', f), 'utf8'), ctx, { filename: f });
  return KIVO.BassamNotif;
}
function kpis() {
  const KIVO = {}, ctx = { KIVO, console, Intl, Date, Math, JSON, Object, Array, String, Number, RegExp, Error, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  KIVO.BassamPerm = { can: () => true, kpiPanelOk: () => true, canSub: () => true, on: () => true };
  KIVO.BassamDepts = { context: () => ({ state: 'ready' }) };
  ctx.DCLogic = class { constructor() { this.state = {}; } setState(p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); } };
  vm.runInContext(fs.readFileSync(path.join(SRC, 'modules', 'kpis', 'logic.js'), 'utf8') + '\n;globalThis.__C = Component;', ctx, { filename: 'kpis/logic.js' });
  return { KIVO, k: new ctx.__C() };
}
/* تبويبُ الصفحة لكل لوحة (src/modules/kpis/logic.js) */
const TAB = { 'planning/readiness': 'on_read', 'daily/kpiDaily': 'on_dy', 'daily/kpiOcc': 'on_occ', 'daily/kpiZones': 'on_zn', 'seized/dash': 'on_sz', 'irshad/dash': 'on_ir' };
const TABS = Object.values(TAB);

test('كلُّ زرٍّ إلى مؤشرات الإدارة: الوجهة kpis ولوحتُه من GO_KPI ويُفتح تبويبُها', async () => {
  const N = notif(), leaves = N.LEAVES.filter((l) => N.goNav({ type: l.id, go: l.go }) === 'kpis');
  const buttons = new Set(leaves.map((l) => l.go));
  assert.ok(leaves.length >= 5, 'أنواعُ تنبيهٍ إلى المؤشرات: ' + leaves.map((l) => l.id).join(','));
  for (const b of ['افتح مؤشرات الجاهزية', 'افتح المؤشرات', 'افتح الإشغال', 'افتح لوحة المؤشرات']) assert.ok(buttons.has(b), 'الزرّ مغطّى: ' + b);
  const seen = [];
  for (const l of leaves) {
    const x = { id: 'nf:TEST_ONLY_' + l.id, type: l.id, go: l.go }, want = N.goKpi(x);
    assert.ok(Array.isArray(want) && want.length === 2, l.id + ': لوحةٌ في GO_KPI');
    const tab = TAB[want.join('/')]; assert.ok(tab, l.id + ': اللوحةُ تبويبٌ في المؤشرات ' + want.join('/'));
    /* root-logic */
    const w = world(); w.vals(); const navs = [];
    w.KIVO.BassamNav = { go: (k) => navs.push(k) };
    w.KIVO.BassamNotif = { GO_NAV: N.GO_NAV, goOk: () => true, goNav: N.goNav, goKpi: N.goKpi, markRead: async () => ({ ok: 1, rev: 1, n: 1 }), list: () => [], status: () => ({}), refresh: async () => ({ ok: 1 }), unread: () => 0 };
    w.c._nfRefresh = () => {};
    await w.c._nfOpenItem(x);
    assert.deepEqual(navs, ['kpis'], l.id + ': الوجهة');
    assert.deepEqual([...w.KIVO.__KPI_OPEN], [...want], l.id + ' (' + l.go + '): التلميح');
    /* صفحةُ المؤشرات */
    const p = kpis(); p.KIVO.__KPI_OPEN = w.KIVO.__KPI_OPEN; const v = p.k.renderVals();
    assert.equal(v[tab], true, l.id + ' (' + l.go + '): يُفتح تبويبُ ' + want.join('/'));
    for (const o of TABS) if (o !== tab) assert.ok(!v[o], l.id + ': ولا تبويبٌ آخر ' + o);
    seen.push(l.id + '→' + want.join('/'));
  }
  assert.ok(seen.some((s) => s.endsWith('daily/kpiDaily')) && seen.some((s) => s.endsWith('daily/kpiOcc')) && seen.some((s) => s.endsWith('planning/readiness')) && seen.some((s) => s.endsWith('irshad/dash')) && seen.some((s) => s.endsWith('seized/dash')), seen.join(' · '));
});
