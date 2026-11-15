/* V7 · د1-ب · «افتح لوحة المؤشرات» يفتح «مؤشرات الإدارة» على لوحة نظام التنبيه نفسه، لا على التبويب الأول.
   الحالتان: الاسترشاد (ir_day ⇒ لوحة مؤشرات الاسترشاد) والمضبوطات (bx_wk ⇒ لوحة مؤشرات المضبوطات).
   ثلاث حلقات على الكود الحقيقي في vm: 441/442 (goKpi) · root-logic (_nfOpenItem يترك KIVO.__KPI_OPEN ثم ينتقل إلى kpis) ·
   src/modules/kpis/logic.js (يلتقط التلميح مرّةً ويختار تبويبه إن كان مسموحاً). */
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
function kpis(allowed) {
  const KIVO = {}, ctx = { KIVO, console, Intl, Date, Math, JSON, Object, Array, String, Number, RegExp, Error, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  KIVO.BassamPerm = { can: () => true, kpiPanelOk: (pk, sk) => allowed.includes(pk + '/' + sk), canSub: () => true, on: () => true };
  KIVO.BassamDepts = { context: () => ({ state: 'ready' }) };
  ctx.DCLogic = class { constructor() { this.state = {}; } setState(p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); } };
  vm.runInContext(fs.readFileSync(path.join(SRC, 'modules', 'kpis', 'logic.js'), 'utf8') + '\n;globalThis.__C = Component;', ctx, { filename: 'kpis/logic.js' });
  return { KIVO, k: new ctx.__C() };
}
const ALL = ['planning/readiness', 'seized/dash', 'irshad/dash'];
const CASES = [
  { name: 'الاسترشاد', x: { id: 'nf:TEST_ONLY_irday', type: 'ir_day', k: 'irshad', go: 'افتح لوحة المؤشرات' }, want: ['irshad', 'dash'], tab: 'on_ir' },
  { name: 'المضبوطات', x: { id: 'nf:TEST_ONLY_bxwk', type: 'bx_wk', k: 'box', go: 'افتح لوحة المؤشرات' }, want: ['seized', 'dash'], tab: 'on_sz' },
];

test('441/442: goKpi يعطي لوحة نظام التنبيه نفسه', () => {
  const N = notif();
  assert.equal(typeof N.goKpi, 'function', 'BassamNotif.goKpi مكشوف');
  for (const c of CASES) assert.deepEqual([...N.goKpi(c.x)], c.want, c.name);
});

test('root-logic: الضغط على التنبيه يترك [الصفحة، اللوحة] ثم ينتقل إلى مؤشرات الإدارة', async () => {
  for (const c of CASES) {
    const w = world(); w.vals(); const navs = [];
    w.KIVO.BassamNav = { go: (k) => navs.push(k) };
    w.KIVO.BassamNotif = { GO_NAV: { 'افتح لوحة المؤشرات': 'kpis' }, goOk: () => true, goNav: () => 'kpis', goKpi: () => c.want,
      markRead: async () => ({ ok: 1, rev: 1, n: 1 }), list: () => [], status: () => ({}), refresh: async () => ({ ok: 1 }), unread: () => 0 };
    w.c._nfRefresh = () => {};
    await w.c._nfOpenItem(c.x);
    assert.deepEqual(navs, ['kpis'], c.name + ': الوجهة');
    assert.deepEqual([...w.KIVO.__KPI_OPEN], c.want, c.name + ': التلميح');
  }
});

test('src/modules/kpis: التبويبُ لوحةُ النظام نفسه — لا الأول — ثم يبقى؛ وبلا تلميح أو بلوحةٍ غير مسموحة: الأول', () => {
  for (const c of CASES) {
    const p = kpis(ALL); p.KIVO.__KPI_OPEN = c.want;
    const v = p.k.renderVals();
    assert.equal(v[c.tab], true, c.name + ': تبويبُ اللوحة مفتوح');
    assert.equal(v.on_read, false, c.name + ': لا التبويبُ الأول');
    assert.equal(p.KIVO.__KPI_OPEN, null, c.name + ': التلميحُ يُلتقط مرّةً');
    assert.equal(p.k.renderVals()[c.tab], true, c.name + ': ويبقى بعد إعادة الرسم');
  }
  const none = kpis(ALL); assert.equal(none.k.renderVals().on_read, true, 'بلا تلميح: التبويبُ الأول كما كان');
  const deny = kpis(['planning/readiness', 'seized/dash']); deny.KIVO.__KPI_OPEN = ['irshad', 'dash'];
  const dv = deny.k.renderVals(); assert.equal(dv.on_read, true, 'لوحةٌ غير مسموحة: الأول'); assert.ok(!dv.on_ir, 'ولا تُفتح');
});
