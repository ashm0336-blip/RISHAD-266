/* V7 · د6: الدمجُ اللحظي في «التشغيل الميداني» لا يجري على مفتاحٍ أُسقط ولم تصل قراءتُه بعد.
   خبرُ /api/changes يُسقط مفتاحَ الخطة (operationInvalidate9) ثم يعيد قراءتَه؛ إن جاء الدمجُ (_bsLiveReload) بين الإسقاط ووصول القراءة
   كان يبني الخطةَ من لا شيء (loadPlan ⇒ null) فيُعلن البابَ المفتوح أمام المستخدم «عدّله غيرُك أو حذفه» وهو باقٍ في الخادم، ويُمنع حفظُه
   (رُصد متقطّعاً في tests/browser/v7_fix_cancel_placed.test.mjs (ب) بكمونٍ على القراءة). الآن: يُرجأ (false) كحفظٍ في الطريق،
   ووصولُ القراءة يدمج كالمعتاد. منطقُ الصفحة الحقيقي داخل node:vm (canvas_world) · بياناتٌ اصطناعية (TEST_ONLY).
   PLAN_LOGIC=<مسار> يبدّل المنطق (لإثبات الإخفاق على السابق). */
import './clock.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { world } from './canvas_world.mjs';

const PLAN = process.env.PLAN_LOGIC ? fs.readFileSync(process.env.PLAN_LOGIC, 'utf8') : undefined;
const KP = 'bassam_plan_v1';
const gate = (uid, x, y, n) => ({ uid, x, y, label: 'باب ' + n, emp: [], hideLabel: true, eid: 'e_' + uid });   /* معرّفُ العنصر محفوظٌ كما يكتبه الخادم */
const site = (gates) => ({ sid: 's_TEST_ONLY_1', name: 'TEST_ONLY', num: 1, zones: [], gates, marks: [], paths: [], sectors: [], iid: 'img_TEST_ONLY' });
const stored = (F) => JSON.stringify({ pMig: 3, zones: [], gates: F[0].gates, marks: [], paths: [], floors: F, months: { '2026-10': { c: 1, d: F } }, cfg: {}, delMonths: {} });

function openGate() {
  const W = world(), c = W.logic('plan', PLAN), O = W.KIVO.__BS_SRV.operations;
  const F = [site([gate('TEST_ONLY_g1', 300, 200, 1), gate('TEST_ONLY_g2', 500, 200, 2)])];
  W.store.set(KP, stored(F));
  const F1 = JSON.parse(JSON.stringify(F));
  c.state = Object.assign({}, c.state, { year: 2026, month: 10, floor: 0, floors: F1, zones: [], gates: F1[0].gates.slice(), marks: [], paths: [],
    planMonths: { '2026-10': { c: 1, d: F1 } }, sel: { t: 'gate', i: 1 }, selMulti: [], tool: 'select', lens: 'plan', gEdit: { i: 1 } });
  const toasts = [], live = [];
  c.bsToast = (m) => toasts.push(m);
  W.KIVO.__bsLiveLog = (kind) => live.push(kind);
  /* المفتاحُ أُسقط: الخدمةُ تقول «unloaded» والقراءةُ تُطلب (كما في 280 بعد operationInvalidate9) */
  let dropped = false;
  const get0 = O.get, state0 = O.state, draft0 = O.draft;
  O.draft = () => { const d = draft0(); const g = d.get; d.get = (name) => { if (dropped && name === KP) throw Error('operations-read-required'); return g(name); }; return d; };
  O.state = (name) => (dropped && name === KP ? 'unloaded' : state0(name));
  O.get = (name) => { if (dropped && name === KP) throw Error('operations-read-required'); return get0(name); };
  return { W, c, toasts, live, drop: (v) => { dropped = v; } };
}

test('V7 · د6: مفتاحُ الخطة أُسقط ولم تصل قراءتُه ⇒ الدمجُ يُرجأ — لا «عدّله غيرُك أو حذفه» على البابِ المفتوح ولا حجزَ لحفظه', () => {
  const X = openGate(), { c } = X;
  X.drop(true);
  assert.equal(c._bsLiveReload([KP]), false, 'يُرجأ ما دامت القراءةُ لم تصل');
  assert.equal(c._planClash || null, null, 'لا تعارضَ مسجَّل');
  assert.deepEqual([...X.live.filter((k) => k === 'element-clash')], [], 'لا element-clash');
  assert.deepEqual([...X.toasts.filter((t) => /عدّل مستخدمٌ آخر/.test(t))], [], 'لا تنبيهَ مضلّل');
  assert.deepEqual([...c.state.gates.map((g) => g.uid)], ['TEST_ONLY_g1', 'TEST_ONLY_g2'], 'الخطةُ المعروضة باقية');
  assert.equal(c.state.gEdit && c.state.gEdit.i, 1, 'نافذةُ البابِ مفتوحةٌ عليه');
});

test('V7 · د6: وصلت القراءةُ (جهازٌ آخر أضاف باباً) ⇒ يُدمج في مكانه والبابُ المفتوح بلا تعارض', () => {
  const X = openGate(), { W, c } = X;
  X.drop(true); c._bsLiveReload([KP]);
  const F = JSON.parse(W.store.get(KP)).months['2026-10'].d;
  F[0].gates = [gate('TEST_ONLY_gR', 50, 50, 9)].concat(F[0].gates);
  W.store.set(KP, stored(F)); X.drop(false);
  assert.equal(c._bsLiveReload([KP]), true, 'دُمج');
  assert.deepEqual([...c.state.gates.map((g) => g.uid)], ['TEST_ONLY_gR', 'TEST_ONLY_g1', 'TEST_ONLY_g2'], 'بابُ الجهاز الآخر وصل');
  assert.equal(c.state.gEdit && c.state.gEdit.i, 2, 'النافذةُ تبعت البابَ نفسَه بمعرّفه');
  assert.equal(c._planClash || null, null, 'لا تعارض');
  assert.deepEqual([...X.live.filter((k) => k === 'element-clash')], []);
});

test('V7 · د6: الحمايةُ الأصلية باقية — جهازٌ آخر حذف البابَ المفتوح فعلاً (والقراءةُ وصلت) ⇒ تعارضٌ وتنبيه', () => {
  const X = openGate(), { W, c } = X;
  const F = JSON.parse(W.store.get(KP)).months['2026-10'].d;
  F[0].gates = F[0].gates.filter((g) => g.uid !== 'TEST_ONLY_g2');
  W.store.set(KP, stored(F));
  c._bsLiveReload([KP]);
  assert.ok(c._planClash && c._planClash['gates:TEST_ONLY_g2'], 'التعارضُ مسجَّل');
  assert.deepEqual([...X.live.filter((k) => k === 'element-clash')], ['element-clash']);
});
