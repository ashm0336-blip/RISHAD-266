/* V7 · المرحلة 2 · الحزمة د1 — زرُّ «افتح» في تنبيهات الاسترشاد يتبع صفحةَ التنبيه لا نصَّ الزر (src/services/441-notif-core.js).
   كان «افتح السجلات» (ir_new · ir_edit) و«افتح لوحة المؤشرات» (ir_day) يفتحان صفحةَ المضبوطات ولوحتها، ويُحجبان بصلاحية المضبوطات —
   لأن الوجهة تُقرأ من النصّ وحده والنصُّ نفسُه في تنبيهات المضبوطات. الآن: الاسترشادُ إلى صفحة الاسترشاد ولوحته وبصلاحيته،
   والمضبوطاتُ كما كانت. على 441/442 الحقيقيين في vm. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SRC } from './harness.mjs';

function client({ can, panel }) {
  const KIVO = {
    BassamAuth: { user: () => ({ id: 'TEST_ONLY_uid', role: 'staff', deptId: 'TEST_ONLY_d1', mgr: true }), users: () => [] },
    BassamDepts: { active: () => 'TEST_ONLY_d1', list: () => [{ id: 'TEST_ONLY_d1', name: 'TEST_ONLY' }], raw: { allKeys: () => [] } },
    BassamPerm: { can: (k, a) => can.includes(k + ':' + a), on: () => true, kpiPanelOk: (p, t) => panel.includes(p + '/' + t) },
  };
  class Storage { getItem() { return null; } setItem() {} }
  const ctx = { KIVO, Storage, localStorage: new Storage(), __BS_BOOT: { srv: 1, cf: 1, uid: 'TEST_ONLY_uid' }, Response, URL, URLSearchParams, AbortController, TextEncoder, TextDecoder,
    console: { log() {}, warn() {}, error() {} }, navigator: { userAgent: 'TEST_ONLY' }, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
    CustomEvent: class { constructor(type) { this.type = type; } }, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true, document: { addEventListener() {} }, fetch: async () => new Response('{}') };
  ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['441-notif-core.js', '442-notif-observer.js']) vm.runInContext(fs.readFileSync(path.join(SRC, 'services', f), 'utf8'), ctx, { filename: f });
  return KIVO.BassamNotif;
}
const N = (type, k, go) => ({ id: 'nf:TEST_ONLY_' + type, type, k, go });
const IR = [N('ir_new', 'irshad', 'افتح السجلات'), N('ir_edit', 'irshad', 'افتح السجلات'), N('ir_day', 'irshad', 'افتح لوحة المؤشرات')];
const SZ = [N('bx_new', 'box', 'افتح السجلات'), N('bx_old', 'box', 'افتح السجلات'), N('bx_wk', 'box', 'افتح لوحة المؤشرات')];

test('الاسترشاد: الوجهةُ صفحةُ الاسترشاد ولوحتُه، وتُحجب بصلاحيته لا بصلاحية المضبوطات', () => {
  const onlyIrshad = client({ can: ['irshad:view'], panel: ['irshad/dash'] });
  assert.deepEqual(IR.map((x) => onlyIrshad.goNav(x)), ['irshad', 'irshad', 'kpis']);
  for (const x of IR) assert.equal(onlyIrshad.goOk(x), true, x.type + ': من يملك الاسترشاد وحده يفتحه');
  const onlySeized = client({ can: ['seized:view'], panel: ['seized/dash'] });
  for (const x of IR) assert.equal(onlySeized.goOk(x), false, x.type + ': صلاحيةُ المضبوطات لا تفتح زرَّ الاسترشاد');
});

test('المضبوطات كما كانت: صفحتُها ولوحتُها وصلاحيتُها', () => {
  const onlySeized = client({ can: ['seized:view'], panel: ['seized/dash'] });
  assert.deepEqual(SZ.map((x) => onlySeized.goNav(x)), ['seized', 'seized', 'kpis']);
  for (const x of SZ) assert.equal(onlySeized.goOk(x), true, x.type);
  const onlyIrshad = client({ can: ['irshad:view'], panel: ['irshad/dash'] });
  for (const x of SZ) assert.equal(onlyIrshad.goOk(x), false, x.type + ': صلاحيةُ الاسترشاد لا تفتح زرَّ المضبوطات');
  assert.equal(onlySeized.goNav(N('emp_add', 'emp', 'افتح الموظفين')), 'employees', 'نصٌّ غيرُ مشترك: الجدولُ القديم كما هو');
});
