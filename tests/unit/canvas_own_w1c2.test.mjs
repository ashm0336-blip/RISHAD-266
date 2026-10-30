/* W1-C2 · الإصبعُ الثاني يُعيد ما كتبه الإصبعُ الأوّل وحدَه — لا ما وصل بين الإصبعين من غيره.
   منطقُ «التشغيل الميداني» و«الجولات اليومية» الحقيقيّان مع طبقة الإدخال الحقيقية (560) داخل node:vm وتوزيعِ أحداثٍ كالمتصفح (tests/unit/canvas_world.mjs):
   عناصرُ الخريطة هي عُقَدُ الصفحة نفسُها (zones · gateNodes · pathNodes · sectorNodes) ومعالجاتُ الخريطة mapDown/mapMove/mapUp كما تربطها. بياناتٌ اصطناعية (TEST_ONLY).
     (أ) كان undoLead يُعيد كلَّ مفتاحٍ هندسيٍّ تغيّر منذ النزول إلى قيمته لحظتَها: صورةُ الموقع التي وصلت من IndexedDB بين الإصبعين تختفي،
         وتحديثُ جهازٍ آخر طُبِّق بينهما يعود في الحالة والمخزنُ يحمله، فيكتب الحفظُ التالي القديمَ فوق تعديل الجهاز الآخر.
     (ب) R3-C2b-REVERT: التحديثُ الحيّ (_bsLiveReload) يُرجأ خلف سحب المسار ورأسِه والتدوير وحدَها كما قبل الجولة 2 — فما يصل بين الإصبعين
         كتابةٌ من غير الإيماءة لا يُعيدها undoLead (أ)، ولا حاجةَ لإرجائه. وإرجاؤه خلف كلِّ سحبٍ كان يُخسر تعديلَ الجهاز الآخر (حفظُ ضغطة منتصف
         النطاق عند الرفع يكتب الخطةَ القديمة فوقه ثمّ تنبيهٌ مضلّل) ويحبسه ما بقيت رايةُ سحبٍ عالقة (ضغطةٌ بالفأرة رُفعت خارج الخريطة).
     (ج) R3-REC: عنصرُ المصفوفة في سجلّ الإيماءة يُتبَع بهويته لا بفهرسه — كاتبٌ آخر يُدرج أو يحذف بين حركتين فلا يعود المسحوبُ إلى موضعٍ وسيط
         (فحصُ note/back العشوائي في canvas_recorder_r3).
   ضماناتُ الموجة 1 باقية: سحبٌ في أوّل 350ms يعود عند نزول الثاني · السحبُ المقصود يُحفظ مرةً · راحةُ الكفّ تُهمَل · الفأرةُ كما كانت.
   CANVAS_SRC / PLAN_LOGIC / DAILY_LOGIC=<مسار> تبدّل الطبقةَ والمنطق (لإثبات الإخفاق على السابق). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { world, node, tp } from './canvas_world.mjs';

const PLAN = process.env.PLAN_LOGIC ? fs.readFileSync(process.env.PLAN_LOGIC, 'utf8') : undefined;
const DAILY = process.env.DAILY_LOGIC ? fs.readFileSync(process.env.DAILY_LOGIC, 'utf8') : undefined;
const KP = 'bassam_plan_v1', IMG = 'data:image/png;base64,TEST_ONLY';
const D0 = 'M100 100 L400 100 L400 300 L100 300 Z';
const SP = [{ x: 500, y: 100 }, { x: 700, y: 100 }, { x: 700, y: 300 }, { x: 500, y: 300 }];
const gate = (uid, x, y, n) => ({ uid, x, y, label: 'باب ' + n, emp: [], hideLabel: true });
const site = (o = {}) => Object.assign({ sid: 's_TEST_ONLY_1', name: 'TEST_ONLY', num: 1, zones: [], gates: [], marks: [], paths: [], sectors: [], iid: 'img_TEST_ONLY' }, o);
const stored = (F) => JSON.stringify({ pMig: 3, zones: F[0].zones, gates: F[0].gates, marks: [], paths: F[0].paths, floors: F, months: { '1448-5': { c: 1, d: F } }, cfg: {}, delMonths: {} });

/* موقعٌ بمصلّى ونطاقٍ وبابين ومسار · صورتُه في IndexedDB تصل حين يشاء الاختبار (land) · كلُّ عقدةٍ من الصفحة في الخريطة (ومقابضُ المحدَّد) */
function plan(lens = 'plan', sel = null) {
  const W = world(), c = W.logic('plan', PLAN);
  let land = null; W.KIVO.BassamIDB = { get: () => new Promise((r) => { land = r; }), set: () => Promise.resolve() };
  const F = [site({ zones: [{ uid: 'TEST_ONLY_z1', name: 'TEST_ONLY', code: '01', ser: '01', cat: 'men', d: D0, cx: 250, cy: 200, emp: [] }],
    gates: [gate('TEST_ONLY_g1', 300, 450, 1), gate('TEST_ONLY_g2', 600, 450, 2)], paths: [{ uid: 'TEST_ONLY_p1', pts: [{ x: 100, y: 550 }, { x: 300, y: 550 }] }],
    sectors: [{ uid: 'TEST_ONLY_s1', name: 'TEST_ONLY', pts: SP }] })];
  W.store.set(KP, stored(F));
  const F1 = JSON.parse(JSON.stringify(F));
  c.state = Object.assign({}, c.state, { year: 1448, month: 5, floor: 0, floors: F1, zones: F1[0].zones.slice(), gates: F1[0].gates.slice(), marks: [], paths: F1[0].paths.slice(),
    planMonths: { '1448-5': { c: 1, d: F1 } }, sel, selMulti: [], tool: 'select', lens, view: { x: 0, y: 0, w: 1000, h: 600 } });
  const S = { saves: 0, toasts: [] };
  const save0 = c.savePlan; c.savePlan = function () { S.saves++; return save0.apply(this, arguments); };
  c.bsToast = (m) => S.toasts.push(m);
  c._loadFloorImages();
  const v = c.renderVals();
  const svg = node(W, 'svg', W.body, null, { onPointerDown: v.mapDown, onPointerMove: v.mapMove, onPointerUp: v.mapUp, onPointerCancel: v.mapUp }, { 'data-map-zoom': '1' });
  const el = {};
  const zg = node(W, 'g', svg, 'zg0', { onPointerDown: v.zones[0].click }); el.zone = node(W, 'path', zg, null, null, { d: D0 });   /* <g onPointerDown={{z.click}}><path d> */
  const sec = v.sectorNodes.ch[0][0], sp = sec.ch.flat(3).find((x) => x && x.t === 'path');
  el.sector = node(W, 'path', node(W, 'g', svg, 'sec0'), null, sp.p, { d: sp.p.d });
  for (const e of v.gateNodes || []) el[e.p.key] = node(W, 'circle', node(W, 'g', svg, e.p.key, e.p), null, null, { cx: '0', cy: '0' });
  for (const e of v.pathNodes || []) el[e.p.key] = node(W, 'polyline', node(W, 'g', svg, e.p.key, e.p), null, null, { points: '100,550 300,550' });
  for (const H of [v.handleNodes, v.pathHandleNodes, v.sectorHandleNodes]) {
    for (const x of [].concat(...((H && H.ch) || [H])).flat(6)) {
      if (!x || x.t !== 'circle' || !x.p || x.p.key == null) continue;
      const q = x.p; el[q.key] = node(W, 'circle', svg, q.key, q, { cx: String(q.cx), cy: String(q.cy) });
      el[q.key].rect = { left: q.cx - 3, top: q.cy - 3, width: 6, height: 6, right: q.cx + 3, bottom: q.cy + 3 };
    }
  }
  return { W, c, S, svg, el, land: (x) => land(x), tick: () => new Promise((r) => setImmediate(r)) };
}
const drag = (W, target, from, to, n, dt, ev = tp) => { for (let k = 1; k <= n; k++) { W.T.now += dt; W.dispatch(target, 'pointermove', ev(from[0] + (to[0] - from[0]) * k / n, from[1] + (to[1] - from[1]) * k / n, 1)); W.flushFrames(); } };
const pinchEnd = (X, target, at) => { const { W, svg } = X; W.dispatch(svg, 'pointerup', tp(700, 400, 2)); W.dispatch(target, 'pointerup', tp(at[0], at[1], 1)); W.flushTimers(); };

test('W1-C2 (أ): صورةُ الموقع تصل من IndexedDB بين الإصبعين ⇒ تبقى — الإصبعُ الثاني يُلغي سحبَ المصلّى وحدَه', async () => {
  const X = plan(), { W, c, el } = X, D = W.dispatch;
  D(el.zone, 'pointerdown', tp(300, 200, 1));
  assert.ok(c.state.zdrag, 'ضغطةُ المصلّى بدأت سحبه');
  W.T.now += 40; X.land(IMG); await X.tick();
  assert.equal(c.state.floors[0].img, IMG, 'وصلت الصورة');
  W.T.now += 60; D(X.svg, 'pointerdown', tp(700, 400, 2));
  assert.equal(c.state.floors[0].img, IMG, 'الصورةُ باقية (كانت تُمحى حتى يُعاد تحميلُها)');
  assert.equal(c.state.zdrag, null, 'السحبُ أُلغي'); assert.equal(c.state.zones[0].d, D0);
  pinchEnd(X, el.zone, [300, 200]);
  assert.equal(X.S.saves, 0, 'لا حفظ');
});

test('W1-C2 (أ): سحبُ المصلّى في أوّل 350ms ثمّ إصبعٌ ثانٍ ⇒ يعود المصلّى وحدَه — والصورةُ وتعديلُ اسمه من غير الإيماءة باقيان', async () => {
  const X = plan(), { W, c, el } = X, D = W.dispatch;
  D(el.zone, 'pointerdown', tp(300, 200, 1));
  drag(W, el.zone, [300, 200], [332, 200], 4, 16);
  assert.notEqual(c.state.zones[0].d, D0, 'المصلّى تحرّك مع الإصبع الأوّل');
  X.land(IMG); await X.tick();
  c.setState((s) => ({ zones: s.zones.map((z, i) => (i === 0 ? Object.assign({}, z, { name: 'TEST_ONLY_remote' }) : z)) }));   /* كاتبٌ آخر: حقلٌ لم تكتبه الإيماءة */
  drag(W, el.zone, [332, 200], [340, 200], 1, 16);
  W.T.now += 40; D(X.svg, 'pointerdown', tp(700, 400, 2));
  assert.equal(c.state.zones[0].d, D0, 'المصلّى عاد إلى موضعه');
  assert.equal(c.state.zones[0].cx, 250, 'ومركزُه');
  assert.equal(c.state.zones[0].name, 'TEST_ONLY_remote', 'الحقلُ الذي كتبه غيرُها باقٍ');
  assert.equal(c.state.floors[0].img, IMG, 'الصورةُ باقية');
  pinchEnd(X, el.zone, [340, 200]);
  assert.equal(X.S.saves, 0, 'لا حفظ');
});

test('W1-C2 (أ): سحبُ النطاق (المواقعُ نفسُها floors) والصورةُ تصل بين حركتين ⇒ يعود النطاقُ حقلاً بحقل وتبقى الصورة', async () => {
  const X = plan(), { W, c, el } = X, D = W.dispatch;
  D(el.sector, 'pointerdown', tp(600, 200, 1));
  assert.ok(c.state.sdrag, 'ضغطةُ النطاق بدأت سحبه');
  drag(W, el.sector, [600, 200], [630, 200], 3, 16);
  X.land(IMG); await X.tick();
  drag(W, el.sector, [630, 200], [640, 200], 1, 16);
  assert.equal(c.state.floors[0].sectors[0].pts[0].x, 540, 'النطاقُ تبع الإصبع'); assert.equal(c.state.floors[0].img, IMG);
  W.T.now += 40; D(X.svg, 'pointerdown', tp(200, 400, 2));
  assert.equal(JSON.stringify(c.state.floors[0].sectors[0].pts), JSON.stringify(SP), 'النطاقُ عاد');
  assert.equal(c.state.floors[0].img, IMG, 'الصورةُ باقية في الموقع نفسِه');
  pinchEnd(X, el.sector, [640, 200]);
});

test('W1-C2 (أ): تحديثٌ من جهازٍ آخر طُبِّق في الحالة بين الإصبعين (المصليات والمواقع) ⇒ لا يعود — والحفظُ التالي لا يكتب القديمَ فوقه', () => {
  const X = plan(), { W, c, el } = X, D = W.dispatch;
  D(el.zone, 'pointerdown', tp(300, 200, 1));
  W.T.now += 40;
  const RZ = [{ uid: 'TEST_ONLY_zR', d: 'M500 100 L600 100 L600 200 Z', cx: 550, cy: 150, emp: [] }, { uid: 'TEST_ONLY_z1', d: D0, cx: 250, cy: 200, emp: [] }];
  c.setState((s) => ({ zones: RZ, floors: s.floors.map((f) => Object.assign({}, f, { zones: RZ, name: 'TEST_ONLY_remote' })) }));
  W.T.now += 60; D(X.svg, 'pointerdown', tp(700, 400, 2));
  assert.equal(c.state.zones.map((z) => z.uid).join(' '), 'TEST_ONLY_zR TEST_ONLY_z1', 'مصليات الجهاز الآخر باقية (كانت تعود إلى ما قبله)');
  assert.equal(c.state.floors[0].name, 'TEST_ONLY_remote');
  pinchEnd(X, el.zone, [300, 200]);
  c.savePlan();
  const st = JSON.parse(W.store.get(KP));
  assert.equal(st.months['1448-5'].d[0].zones.map((z) => z.uid).join(' '), 'TEST_ONLY_zR TEST_ONLY_z1', 'الحفظُ يحمل نسخةَ الجهاز الآخر');
});

test('W1-C2 (أ): كاتبٌ آخر زحزح المصليات (مصلّى جديدٌ في أوّلها) أثناء سحبٍ قصير ⇒ يعود المصلّى المسحوب بهويته لا بفهرسه · والجديدُ باقٍ', () => {
  const X = plan(), { W, c, el } = X, D = W.dispatch;
  D(el.zone, 'pointerdown', tp(300, 200, 1));
  drag(W, el.zone, [300, 200], [332, 200], 4, 16);
  const ZR = { uid: 'TEST_ONLY_zR', d: 'M500 100 L600 100 L600 200 Z', cx: 550, cy: 150, emp: [] };
  c.setState((s) => ({ zones: [ZR].concat(s.zones) }));
  W.T.now += 40; D(X.svg, 'pointerdown', tp(700, 400, 2));
  assert.equal(c.state.zones.map((z) => z.uid).join(' '), 'TEST_ONLY_zR TEST_ONLY_z1', 'المصلّى الجديد باقٍ');
  assert.equal(c.state.zones[1].d, D0, 'المسحوبُ عاد إلى موضعه في موضعه الجديد من القائمة');
  assert.equal(c.state.zones[0].d, ZR.d, 'والجديدُ لم يُمسّ');
  pinchEnd(X, el.zone, [332, 200]);
});

/* ── (ج) R3-REC: كاتبٌ آخر يزحزح المصليات بين حركتين للإيماءة (ويُبقي التحديدَ على المسحوب) ── */
const ZR = { uid: 'TEST_ONLY_zR', d: 'M500 100 L600 100 L600 200 Z', cx: 550, cy: 150, emp: [] };
test('R3-REC: مصلّى جديدٌ أُدرج في أوّل القائمة بين حركتين للإيماءة ثمّ إصبعٌ ثانٍ ⇒ يعود المسحوبُ إلى موضعه لحظةَ الضغط (لا إلى موضعٍ وسيط)', () => {
  const X = plan(), { W, c, el } = X, D = W.dispatch;
  D(el.zone, 'pointerdown', tp(300, 200, 1));
  drag(W, el.zone, [300, 200], [320, 200], 2, 16);
  const mid = c.state.zones[0].d; assert.notEqual(mid, D0);
  c.setState((s) => ({ zones: [ZR].concat(s.zones), sel: { t: 'zone', i: 1 }, selMulti: [1] }));
  drag(W, el.zone, [320, 200], [340, 200], 2, 16);
  assert.notEqual(c.state.zones[1].d, mid, 'المسحوبُ تبع الإصبع في موضعه الجديد');
  W.T.now += 30; D(X.svg, 'pointerdown', tp(700, 400, 2));
  assert.equal(c.state.zones.map((z) => z.uid).join(' '), 'TEST_ONLY_zR TEST_ONLY_z1');
  assert.equal(c.state.zones[1].d, D0, 'عاد إلى موضعه لحظةَ الضغط (كان يعود إلى الموضع الوسيط ' + mid + ')');
  assert.equal(c.state.zones[1].cx, 250);
  assert.equal(c.state.zones[0], ZR, 'والمُدرَجُ لم يُمسّ');
  pinchEnd(X, el.zone, [340, 200]);
  assert.equal(X.S.saves, 0, 'لا حفظ');
});

test('R3-REC: مصلّى أُدرج ثمّ حُذف بين حركات الإيماءة (الفهرسُ يتبدّل ذهاباً وإياباً) ⇒ يعود المسحوبُ إلى موضعه لحظةَ الضغط', () => {
  const X = plan(), { W, c, el } = X, D = W.dispatch;
  D(el.zone, 'pointerdown', tp(300, 200, 1));
  drag(W, el.zone, [300, 200], [310, 200], 1, 16);
  c.setState((s) => ({ zones: [ZR].concat(s.zones), sel: { t: 'zone', i: 1 }, selMulti: [1] }));
  drag(W, el.zone, [310, 200], [320, 200], 1, 16);
  c.setState((s) => ({ zones: s.zones.filter((z) => z.uid !== ZR.uid), sel: { t: 'zone', i: 0 }, selMulti: [0] }));
  drag(W, el.zone, [320, 200], [330, 200], 1, 16);
  assert.notEqual(c.state.zones[0].d, D0);
  W.T.now += 30; D(X.svg, 'pointerdown', tp(700, 400, 2));
  assert.equal(c.state.zones.map((z) => z.uid).join(' '), 'TEST_ONLY_z1');
  assert.equal(c.state.zones[0].d, D0, 'عاد إلى موضعه لحظةَ الضغط');
  pinchEnd(X, el.zone, [330, 200]);
});

test('W1: سحبٌ مقصود (> 350ms) ثمّ إصبعٌ ثانٍ ⇒ يُحفظ مرةً واحدة حيث وقف · وبالفأرة يُحفظ مرةً كما كان · وراحةُ الكفّ على سحبة القلم تُهمَل', () => {
  let X = plan(), { W, c, el } = X, D = W.dispatch;
  D(el.zone, 'pointerdown', tp(300, 200, 1));
  drag(W, el.zone, [300, 200], [340, 200], 4, 100);
  const moved = c.state.zones[0].d; assert.notEqual(moved, D0);
  D(X.svg, 'pointerdown', tp(700, 400, 2));
  assert.equal(c.state.zones[0].d, moved, 'لم يعد'); assert.equal(X.S.saves, 1, 'حُفظ عند نزول الثاني');
  pinchEnd(X, el.zone, [340, 200]); assert.equal(X.S.saves, 1, 'مرةً واحدة');

  X = plan(); ({ W, c, el } = X); const m = (x, y) => tp(x, y, 1, { pointerType: 'mouse' });
  W.dispatch(el.zone, 'pointerdown', m(300, 200)); drag(W, el.zone, [300, 200], [340, 200], 4, 16, m); W.dispatch(el.zone, 'pointerup', m(340, 200)); W.flushTimers();
  assert.notEqual(c.state.zones[0].d, D0, 'الفأرة: المصلّى حيث تُرك'); assert.equal(X.S.saves, 1, 'الفأرة: حفظٌ واحد');

  X = plan(); ({ W, c, el } = X); const pen = (x, y) => tp(x, y, 9, { pointerType: 'pen' });
  W.dispatch(el.zone, 'pointerdown', pen(300, 200));
  W.dispatch(el.zone, 'pointerdown', tp(200, 300, 3, { isPrimary: false }));
  for (let k = 1; k <= 4; k++) { W.T.now += 16; W.dispatch(el.zone, 'pointermove', pen(300 + 10 * k, 200)); W.dispatch(el.zone, 'pointermove', tp(200 + 5 * k, 300, 3, { isPrimary: false })); W.flushFrames(); }
  W.dispatch(el.zone, 'pointerup', pen(340, 200)); W.dispatch(el.zone, 'pointerup', tp(220, 300, 3, { isPrimary: false })); W.flushTimers();
  assert.equal(c.state.zones[0].d, 'M140 100 L440 100 L440 300 L140 300 Z', 'المصلّى تبع القلمَ وحدَه'); assert.equal(X.S.saves, 1);
});

/* ── (ب) R3-C2b-REVERT: التحديثُ الحيّ أثناء السحب كما قبل الجولة 2 ── */
/* جهازٌ آخر حفظ الخطة: بابٌ جديدٌ في أوّل القائمة ومصلّى جديد — 280 كتبه في المخزن (وصار أساسَ المزامنة) ثمّ أبلغ الشاشة */
function remote(X) {
  const F = JSON.parse(X.W.store.get(KP)).months['1448-5'].d;
  F[0].gates = [gate('TEST_ONLY_gR', 50, 50, 9)].concat(F[0].gates);
  F[0].zones = F[0].zones.concat([{ uid: 'TEST_ONLY_zR', d: 'M10 10 L60 10 L60 60 Z', cx: 30, cy: 30, emp: [] }]);
  X.W.store.set(KP, stored(F));
  return X.c._bsLiveReload([KP]);
}
const st = (X) => JSON.parse(X.W.store.get(KP)).months['1448-5'].d[0];
const mouse = (x, y) => tp(x, y, 1, { pointerType: 'mouse' });

test('R3-C2b-REVERT: تحديثٌ حيّ يصل أثناء ضغطة المصلّى باللمس يُطبَّق في الحال ثمّ إصبعٌ ثانٍ ⇒ لا يعيده undoLead ولا يكتب حفظٌ قديمٌ فوقه', () => {
  const X = plan(), { W, c, el } = X, D = W.dispatch;
  D(el.zone, 'pointerdown', tp(300, 200, 1));
  assert.ok(c.state.zdrag, 'ضغطةُ المصلّى بدأت سحبه');
  W.T.now += 40; const r = remote(X);
  W.T.now += 60; D(X.svg, 'pointerdown', tp(700, 400, 2));
  assert.equal(c.state.zdrag, null, 'السحبُ أُلغي');
  assert.equal(c.state.zones.map((z) => z.uid).join(' '), 'TEST_ONLY_z1 TEST_ONLY_zR', 'مصلّى الجهاز الآخر باقٍ في الحالة (كان undoLead يُعيد ما قبله)');
  assert.equal(c.state.gates.map((g) => g.uid).join(' '), 'TEST_ONLY_gR TEST_ONLY_g1 TEST_ONLY_g2', 'وبابُه');
  assert.equal(c.state.floors[0].gates.length, 3, 'والموقعُ يحمله');
  pinchEnd(X, el.zone, [300, 200]);
  assert.equal(X.S.saves, 0, 'لا حفظَ عند الرفع');
  assert.equal(st(X).gates.length, 3); assert.equal(st(X).zones.length, 2, 'المخزنُ يحمل تعديلَ الجهاز الآخر');
  c.savePlan();
  assert.equal(st(X).gates.length, 3, 'والحفظُ التالي لا يكتب القديمَ فوقه'); assert.equal(st(X).zones.length, 2);
  assert.equal(r, true, 'طُبِّق في الحال (كان يُرجأ خلف سحب المصلّى)');
});

test('R3-C2b-REVERT: سحبُ منتصف النطاق (sm#) وتعديلُ جهازٍ آخر يصل أثناءه ⇒ يبقى تعديلُه في المخزن بلا تنبيهٍ مضلّل — بالفأرة واللمس والقلم', () => {
  for (const type of ['mouse', 'touch', 'pen']) {
    const X = plan('plan', { t: 'sector', i: 0 }), { W, c, el } = X, D = W.dispatch, ev = (x, y) => tp(x, y, 1, { pointerType: type });
    assert.ok(el.sm0, 'مقبضُ منتصف النطاق مرسومٌ من الصفحة');
    D(el.sm0, 'pointerdown', ev(600, 100));
    assert.ok(c.state.svdrag, type + ': ضغطةُ المنتصف بدأت سحبَ الرأس المُضاف');
    drag(W, el.sm0, [600, 100], [600, 70], 3, 120, ev);
    const r = remote(X);
    drag(W, el.sm0, [600, 70], [600, 50], 2, 120, ev);
    D(el.sm0, 'pointerup', ev(600, 50)); W.flushTimers();
    assert.equal(st(X).gates.map((g) => g.uid).join(' '), 'TEST_ONLY_gR TEST_ONLY_g1 TEST_ONLY_g2',
      type + ': بابُ الجهاز الآخر باقٍ في المخزن (كان حفظُ ضغطة المنتصف المؤجَّلُ إلى الرفع يكتب الخطةَ القديمة فوقه)');
    assert.equal(st(X).zones.length, 2, type + ': ومصلّاه');
    assert.equal(X.S.toasts.length, 0, type + ': لا تنبيهَ «لم يُحفظ السحب»');
    assert.equal(r, true, type + ': طُبِّق في الحال (كان يُرجأ خلف svdrag)');
  }
});

test('R3-C2b-REVERT: ضغطةُ المصلّى بالفأرة رُفعت خارج الخريطة (رايةُ السحب لا تُمسح) ⇒ لا تحبس التحديثَ الحيّ — يُطبَّق والحفظُ التالي يحمله', () => {
  const X = plan(), { W, c, el } = X, D = W.dispatch;
  D(el.zone, 'pointerdown', mouse(300, 200));
  W.T.now += 50; D(W.body, 'pointermove', mouse(300, 700)); W.flushFrames();
  D(W.body, 'pointerup', mouse(300, 700)); W.flushTimers();                    /* الرفعُ على الصفحة خارج الخريطة: لا يبلغ mapUp */
  const r = remote(X);
  c.savePlan();
  assert.equal(st(X).gates.length, 3, 'حفظٌ لاحق يحمل تعديلَ الجهاز الآخر'); assert.equal(st(X).zones.length, 2);
  assert.equal(c.state.gates.length, 3);
  assert.equal(r, true, 'طُبِّق (كان يُرجأ ما بقيت الرايةُ حتى يُسقطه _liveTry بعد محاولاته)');
});

test('W1: بلا تحديثٍ حيّ يُحفظ سحبُ المسار عند الرفع مرةً كما كان · والحاجزُ كما قبل الجولة 2: يُرجأ التحديثُ خلف سحب المسار وحدَه لا خلف سحب المصلّى', () => {
  let X = plan('plan'), { W, c, el } = X;
  W.dispatch(el.pa0_0, 'pointerdown', mouse(200, 550)); drag(W, el.pa0_0, [200, 550], [200, 580], 3, 100, mouse); W.dispatch(el.pa0_0, 'pointerup', mouse(200, 580)); W.flushTimers();
  assert.equal(X.S.saves, 1); assert.equal(X.S.toasts.length, 0);
  assert.equal(st(X).paths[0].pts[0].y, 580, 'المسارُ حيث تُرك');

  X = plan('plan'); ({ W, c, el } = X);
  W.dispatch(el.pa0_0, 'pointerdown', mouse(200, 550)); drag(W, el.pa0_0, [200, 550], [200, 570], 2, 100, mouse);
  assert.equal(remote(X), false, 'مُرجأ خلف سحب المسار');
  W.dispatch(el.pa0_0, 'pointerup', mouse(200, 570)); W.flushTimers();

  X = plan('plan'); ({ W, c, el } = X);
  W.dispatch(el.zone, 'pointerdown', mouse(300, 200)); drag(W, el.zone, [300, 200], [320, 200], 2, 100, mouse);
  assert.equal(remote(X), true, 'يُطبَّق أثناء سحب المصلّى');
  W.dispatch(el.zone, 'pointerup', mouse(320, 200)); W.flushTimers();
  assert.equal(st(X).gates.length, 3); assert.equal(X.S.toasts.length, 0);
});

/* ── الجولاتُ اليومية: الآليةُ نفسُها — سحبُ رأس المصلّى في أوّل 350ms يعود، وجولةُ الجهاز الآخر التي وصلت بينهما تبقى ── */
test('W1-C2 (الجولات اليومية): رأسُ المصلّى سُحب لحظةً ووصلت جولةُ جهازٍ آخر ثمّ إصبعٌ ثانٍ ⇒ يعود السحبُ وحدَه وتبقى الجولةُ الواردة', () => {
  const W = world(), c = W.logic('daily', DAILY);
  const h = c.hParts(new Date()), RK = h.y + '-' + h.m + '-' + h.d;
  const R0 = { [RK]: { d: [{ zones: [{ uid: 'TEST_ONLY_z1', d: D0, cx: 250, cy: 200 }], paths: [], gates: [], marks: [] }] } };
  W.store.set('bassam_rounds_v1', JSON.stringify(R0));
  c.state = Object.assign({}, c.state, { year: h.y, month: h.m, day: h.d, floor: 0, lens: 'zones', tool: 'select', dview: { x: 0, y: 0, w: 1000, h: 600 }, dsSel: { t: 'zone', i: 0 }, rounds: JSON.parse(JSON.stringify(R0)) });
  const v = c.renderVals();
  const svg = node(W, 'svg', W.body, null, { onPointerDown: v.dsDown, onPointerMove: v.dsMove, onPointerUp: v.dsUp, onPointerCancel: v.dsUp }, { 'data-ds-zoom': '1' });
  node(W, 'path', svg, null, null, { d: D0 });
  const hp = [].concat(...(v.dsHandleNodes.ch || [])).flat(3).find((e) => e && e.p && e.p.key === 'h1').p;
  const h1 = node(W, 'circle', svg, 'h1', hp, { cx: String(hp.cx), cy: String(hp.cy) }); h1.rect = { left: hp.cx - 3, top: hp.cy - 3, width: 6, height: 6 };
  W.dispatch(h1, 'pointerdown', tp(400, 100, 1));
  assert.ok(c.state.vdrag, 'ضغطةُ الرأس بدأت سحبه');
  drag(W, h1, [400, 100], [440, 100], 4, 16);
  assert.ok(c.state.dsZoneTmp, 'الرأسُ تبع الإصبع');
  const R1 = JSON.parse(JSON.stringify(R0)); R1[RK].d[0].zones.push({ uid: 'TEST_ONLY_zR', d: 'M10 10 L60 10 L60 60 Z', cx: 30, cy: 30 });
  W.store.set('bassam_rounds_v1', JSON.stringify(R1)); c.setState({ rounds: c.loadRounds() });   /* مستمعُ المخزن في الصفحة */
  W.T.now += 40; W.dispatch(svg, 'pointerdown', tp(700, 400, 2));
  assert.equal(c.state.vdrag, null); assert.ok(!c.state.dsZoneTmp, 'سحبُ الرأس أُلغي');
  assert.equal(c._curFloorZones().length, 2, 'جولةُ الجهاز الآخر باقية');
  W.dispatch(svg, 'pointerup', tp(700, 400, 2)); W.dispatch(h1, 'pointerup', tp(440, 100, 1)); W.flushTimers();
  assert.equal(JSON.parse(W.store.get('bassam_rounds_v1'))[RK].d[0].zones[0].d, D0, 'الرأسُ في موضعه');
  assert.equal(JSON.parse(W.store.get('bassam_rounds_v1'))[RK].d[0].zones.length, 2);
});
