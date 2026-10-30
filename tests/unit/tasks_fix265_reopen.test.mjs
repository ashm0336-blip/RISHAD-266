/* KIVO_265 · k265-fix (بوابة 265 — cfbench/k259journeys.mjs بالإنفاذ): «إعادة فتح المهمة» في الإنفاذ تطلب سبباً يكتبه المسؤول (§12 audit.reason · task.reopen) كما في
   263/264 — كان 071 tkReopen يمرّر للحفظ المركزي نصّاً افتراضياً («أعاد المسؤولُ فتحَ المهمة») فيُستوفى الشرطُ بلا سبب ولا تظهر نافذةُ السبب.
   الآن سببُ العميل وحده يصل الحفظَ المركزي، والافتراضيُّ للعرض (التنبيه · قرارُ المراجعة · التدقيق):
     [الإنفاذ] بلا سبب ⇒ رفضُ «يتطلب سبباً» (403 · why: reason) ولا يُكتب شيء
     [الإنفاذ] بالسبب ⇒ تُعاد فتحاً والسببُ في سجل التدقيق
     [القديم] بلا سبب ⇒ تُعاد فتحاً كما كان
     [الإنفاذ · الصفحة] _doReopen الحقيقيّ (src/modules/tasks/logic.js في vm): الرفضُ ⇒ نافذةُ السبب من 280 (__BS_SRV.askReason) ثم إعادةُ الطلب به ·
                        والإلغاءُ لا يعيد الفتح ويُعلَم بتنبيه
   بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { world, workerUnderTest, ME, KT, KE, D, DAY, TAG, stored } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'], ID = 1760000000103;                       /* مهمةُ ME اليوم — جارية، يُنهيها ثم يعيد المديرُ فتحَها */
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body });
const row = (W) => stored(W.env, KT)[DAY].find((r) => Array.isArray(r) && r[13] === ID && r[14] === ME.eid);
const reopened = (W) => W.env.DB.q("SELECT aft FROM aud WHERE k = ? AND act = 'reopened'", KT);
async function done(mode) {
  const W = await world({ worker: WU.file, mode }), me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
  const f = await post(W, me.ck, '/api/me/tasks/act', { k: DAY, id: ID, act: 'finish', note: TAG + ' أُنجزت' });
  assert.equal(f.j && f.j.ok, 1, 'أنهاها الموظف: ' + JSON.stringify(f.j)); assert.equal(row(W)[3], 'done');
  return { W, dm };
}

test('[enforce] إعادةُ الفتح بلا سبب ⇒ رفضُ «يتطلب سبباً» ولا يُكتب شيء', async () => {
  const { W, dm } = await done('enforce');
  const r = await post(W, dm.ck, '/api/tasks/reopen', { k: DAY, id: ID, ekey: ME.eid });
  assert.equal(r.status, 403, JSON.stringify(r.j)); assert.equal(r.j.err, 'denied'); assert.equal(r.j.why, 'reason', JSON.stringify(r.j));
  assert.equal(row(W)[3], 'done', 'ما زالت منجزة'); assert.equal(reopened(W).length, 0, 'ولا حدثَ «أُعيد فتحُها»');
});

test('[enforce] إعادةُ الفتح بالسبب ⇒ تمضي والسببُ في سجل التدقيق', async () => {
  const { W, dm } = await done('enforce');
  const WHY = TAG + ' سببُ إعادة الفتح';
  const r = await post(W, dm.ck, '/api/tasks/reopen', { k: DAY, id: ID, ekey: ME.eid, why: WHY });
  assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(row(W)[3], 'in_progress');
  const a = reopened(W); assert.equal(a.length, 1); assert.equal(JSON.parse(a[0].aft).why, WHY, 'السببُ في حدث التدقيق');
});

test('[legacy] إعادةُ الفتح بلا سبب ⇒ تمضي كما كان (لا سببَ مطلوب)', async () => {
  const { W, dm } = await done('legacy');
  const r = await post(W, dm.ck, '/api/tasks/reopen', { k: DAY, id: ID, ekey: ME.eid });
  assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(row(W)[3], 'in_progress');
  assert.equal(reopened(W).length, 1, 'بحدث تدقيق');
});

/* الصفحةُ لمدير الإدارة في vm (كما في tasks_page_review265) — وطبقةُ التخزين بنافذة سببٍ محاكاة: askReason(k, keys, cb) يردّ answer */
const LOGIC = moduleLogic('tasks');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 5000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(25); } return false; }
async function page(W, ck, answer) {
  const g = await W.C.api('/api/get?keys=' + encodeURIComponent(KT + ',' + KE), { cookie: ck });
  const store = new Map([['bassam_tasks_v1', g.j.keys[KT].v], ['bassam_employees_v1', g.j.keys[KE].v]]), KIVO = {}, toasts = [], asked = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1 },
    fetch: (u, o) => W.C.req(u, { method: (o && o.method) || 'GET', body: o && o.body, cookie: ck, headers: (o && o.headers) || {} }) };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:' + D, deptId: D, name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }), users: () => [] };
  KIVO.BassamDepts = { active: () => D };
  KIVO.BassamSup = { isSup: () => false };
  KIVO.__BS_SRV = { flushAsync: async () => true, askReason: (k, keys, cb) => { asked.push({ k, keys }); setTimeout(() => cb(answer), 0); } };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast(m, k) { toasts.push([m, k]); } bsAck(m, k) { toasts.push([m, k || 'ok']); return Promise.resolve(true); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const c = new ctx.__C(); c.state = Object.assign({}, c.state || {}, { locked: {} });
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  const [y, m, d] = DAY.split('-').map(Number); c.setState({ year: y, month: m, tasksAll: JSON.parse(store.get('bassam_tasks_v1')) });
  return { c, d, i: JSON.parse(store.get('bassam_tasks_v1'))[DAY].findIndex((r) => r[13] === ID && r[14] === ME.eid), toasts, asked };
}

for (const [label, answer] of [['الإلغاء', ''], ['السبب', TAG + ' سببٌ من نافذة الصفحة']]) {
  test('[enforce · الصفحة] _doReopen: الرفضُ ⇒ نافذةُ السبب من 280 · ' + label + (answer ? ' ⇒ يُعاد الطلبُ به وتُعاد فتحاً' : ' ⇒ لا إعادةَ فتح وتنبيه'), async () => {
    const { W, dm } = await done('enforce');
    const P = await page(W, dm.ck, answer);
    P.c._doReopen(P.d, P.i);
    assert.ok(await until(() => P.asked.length === 1), 'عُرضت نافذةُ السبب: ' + JSON.stringify(P.toasts));
    assert.ok(/bassam_tasks_v1$/.test(P.asked[0].k) && Array.isArray(P.asked[0].keys) && P.asked[0].keys.length, 'بمفتاح المهام ومفاتيح السبب: ' + JSON.stringify(P.asked[0]));
    if (answer) {
      assert.ok(await until(() => row(W)[3] === 'in_progress'), 'أُعيد فتحُها: ' + JSON.stringify(P.toasts));
      assert.equal(JSON.parse(reopened(W)[0].aft).why, answer, 'بالسبب المكتوب');
      assert.ok(await until(() => P.toasts.some(([t, k]) => k === 'ok')), 'وتنبيهُ النجاح');
    } else {
      assert.ok(await until(() => P.toasts.some(([t]) => /أُلغيت إعادةُ الفتح/.test(t))), 'تنبيهُ الإلغاء: ' + JSON.stringify(P.toasts));
      await sleep(200); assert.equal(row(W)[3], 'done', 'لم تُعَد فتحاً'); assert.equal(reopened(W).length, 0);
    }
  });
}
