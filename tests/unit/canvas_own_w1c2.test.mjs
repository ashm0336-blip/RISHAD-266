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
import './clock.mjs';   /* V7 P3: ساعةُ الاختبار المثبَّتة (1448-5-9) — كان يُخفق في أول الشهر الهجري وبعد تبدّل الشهر (يُستورد أولاً) */
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
function plan(lens = 'plan', sel = null, pathOptions = null) {
  const W = world(), c = W.logic('plan', PLAN);
  let land = null; W.KIVO.BassamIDB = { get: () => new Promise((r) => { land = r; }), set: () => Promise.resolve() };
  const F = [site({ zones: [{ uid: 'TEST_ONLY_z1', name: 'TEST_ONLY', code: '01', ser: '01', cat: 'men', d: D0, cx: 250, cy: 200, emp: [] }],
    gates: [gate('TEST_ONLY_g1', 300, 450, 1), gate('TEST_ONLY_g2', 600, 450, 2)], paths: [Object.assign({ uid: 'TEST_ONLY_p1', id: 'TEST_ONLY_path_id', pts: [{ x: 100, y: 550 }, { x: 300, y: 550 }] }, pathOptions || {})],
    sectors: [{ uid: 'TEST_ONLY_s1', name: 'TEST_ONLY', pts: SP }] })];
  W.store.set(KP, stored(F));
  const F1 = JSON.parse(JSON.stringify(F));
  c.state = Object.assign({}, c.state, { year: 1448, month: 5, floor: 0, floors: F1, zones: F1[0].zones.slice(), gates: F1[0].gates.slice(), marks: [], paths: F1[0].paths.slice(),
    planMonths: { '1448-5': { c: 1, d: F1 } }, sel, selMulti: pathOptions && sel ? [sel.i] : [], tool: 'select', lens, view: { x: 0, y: 0, w: 1000, h: 600 } });
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
  for (const e of v.pathNodes || []) {
    if (pathOptions) { const g = mountPathNode(W, svg, e); el[e.p.key] = g.querySelector('polyline'); }
    else el[e.p.key] = node(W, 'polyline', node(W, 'g', svg, e.p.key, e.p), null, null, { points: '100,550 300,550' });
  }
  for (const H of [v.handleNodes, v.pathHandleNodes, v.sectorHandleNodes]) {
    for (const x of [].concat(...((H && H.ch) || [H])).flat(6)) {
      if (!x || x.t !== 'circle' || !x.p || x.p.key == null) continue;
      const q = x.p; el[q.key] = node(W, 'circle', svg, q.key, q, { cx: String(q.cx), cy: String(q.cy) });
      el[q.key].rect = { left: q.cx - 3, top: q.cy - 3, width: 6, height: 6, right: q.cx + 3, bottom: q.cy + 3 };
    }
  }
  return { W, c, S, svg, el, v, land: (x) => land(x), tick: () => new Promise((r) => setImmediate(r)) };
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


/* One-axis contract mounts the actual shared-renderer nodes. Browser pixel acceptance
   supplements these source/interaction checks; fixtures remain TEST_ONLY. */
function mountPathNode(W, parent, value) {
  if (Array.isArray(value)) { value.forEach(v => mountPathNode(W, parent, v)); return null; }
  if (!value || typeof value !== 'object' || !value.t) return null;
  if (value.t === 'F') { value.ch.forEach(v => mountPathNode(W, parent, v)); return null; }
  const attrs = Object.fromEntries(Object.entries(value.p || {}).filter(([key, v]) => key !== 'key' && key !== 'style' && !key.startsWith('on') && v != null));
  const el = node(W, value.t, parent, value.p?.key, value.p, attrs);
  value.ch.forEach(v => mountPathNode(W, el, v));
  return el;
}
function renderNodes(value, out = []) {
  if (Array.isArray(value)) value.forEach(v => renderNodes(v, out));
  else if (value && typeof value === 'object' && value.t) { out.push(value); value.ch.forEach(v => renderNodes(v, out)); }
  return out;
}
const pathCase = (options = {}) => ({ type: 'in', dir: 'two', w: 'normal', line: 'solid', active: true, anim: true, name: 'TEST_ONLY_path', ...options });
const types = { in:{c:'#16a34a',label:'دخول'}, out:{c:'#dc2626',label:'خروج'}, emg:{c:'#ea580c',label:'طوارئ'}, svc:{c:'#9c3d6b',label:'خدمات'} };
const strokesOf = tree => renderNodes(tree).filter(n => n.t === 'polyline' && n.p?.['data-path-role'] === 'stroke');
const pointText = points => points.map(p => p.x + ',' + p.y).join(' ');
const numeric = value => (String(value).match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi) || []).map(Number);
function assertAxis(tree, points, count = 2) {
  const nodes = renderNodes(tree), strokes = strokesOf(tree), expected = pointText(points);
  assert.equal(strokes.length, count, 'one/two paint passes follow the chosen direction mode');
  for (const line of nodes.filter(n => n.t === 'polyline')) {
    assert.equal(line.p.points, expected, 'every visible paint, edge, selection and transparent hit uses the original axis');
    assert.equal(+line.p['data-path-offset'] || 0, 0, 'there is no side offset');
    assert.equal(+line.p['data-path-casing-gap'] || 0, 0, 'there is no polygonal corridor around parallel lanes');
    assert.equal(line.p.fill, 'none', 'the axis is a stroke, never an enclosing polygon');
  }
  assert.equal(nodes.filter(n => n.p?.['data-path-role'] === 'hit').length, 1, 'the original path has one interaction target');
  assert.equal(nodes.filter(n => n.p?.['data-path-role'] === 'casing' || n.p?.['data-path-role'] === 'lane' || n.p?.['data-path-role'] === 'legend').length, 0);
  assert.ok(nodes.every(n => !n.p?.transform), 'no transformed side copy is introduced');
  const canvasText = nodes.filter(n => n.t === 'text' || n.t === 'tspan').map(n => n.ch.filter(c => typeof c === 'string').join('')).join(' ');
  assert.doesNotMatch(canvasText, /دخول|خروج/, 'direction legend text is absent from the canvas');
  assert.ok(nodes.every(n => !/NaN|Infinity/.test(String(n.p?.points || '') + String(n.p?.d || ''))), 'SVG coordinates remain finite');
  return strokes;
}
function dashPattern(stroke) {
  const a = numeric(stroke.p.strokeDasharray);
  assert.ok(a.length >= 2 && a.every(n => Number.isFinite(n) && n >= 0) && a.some(n => n > 0), 'color alternation is a finite stroke pattern');
  return a.length % 2 ? a.concat(a) : a;
}
function painted(stroke, distance) {
  const a = dashPattern(stroke), period = a.reduce((s, n) => s + n, 0), offset = +stroke.p.strokeDashoffset || 0;
  let at = ((distance + offset) % period + period) % period;
  for (let i = 0; i < a.length; i++) { if (at < a[i] - 1e-9) return i % 2 === 0; at -= a[i]; }
  return false;
}
function paintIntervals(strokes, length) {
  const cuts = new Set([0, length]);
  for (const stroke of strokes) {
    const a = dashPattern(stroke), period = a.reduce((s, n) => s + n, 0), off = +stroke.p.strokeDashoffset || 0;
    for (let base = -off - period * 2; base < length + period; base += period) {
      let at = base;
      for (const n of a) { if (at > 0 && at < length) cuts.add(at); at += n; }
    }
  }
  const values = [...cuts].sort((a, b) => a - b), out = [];
  for (let i = 1; i < values.length; i++) if (values[i] - values[i-1] > 1e-7) {
    const at = (values[i-1] + values[i]) / 2;
    out.push(strokes.map(s => painted(s, at)));
  }
  return out;
}
function assertColorsAndArrows(tree, points, two = true, type = 'in') {
  const strokes = assertAxis(tree, points, two ? 2 : 1), nodes = renderNodes(tree);
  assert.deepEqual(strokes.map(n => n.p.stroke), two ? ['#16a34a', '#dc2626'] : [types[type].c]);
  const groups = nodes.filter(n => n.t === 'g' && n.p?.['data-path-direction']);
  assert.deepEqual(groups.map(n => n.p['data-path-direction']), two ? ['forward', 'reverse'] : ['forward']);
  for (const group of groups) {
    const forward = group.p['data-path-direction'] === 'forward', c = two ? (forward ? '#16a34a' : '#dc2626') : types[type].c;
    const arrows = renderNodes(group).filter(n => n.t === 'path' && (n.p.key === 'end' || /^a\d+$/.test(n.p.key)));
    assert.ok(arrows.length, 'each motion direction has a visible arrow');
    for (const arrow of arrows) {
      assert.equal(arrow.p.fill, c, 'arrows retain the same color as their direction');
      const xy = numeric(arrow.p.d), tip = {x:xy[0],y:xy[1]}, base = {x:(xy[2]+xy.at(-2))/2,y:(xy[3]+xy.at(-1))/2};
      assert.equal(tip.y, points[0].y, 'arrow tips remain on the original horizontal axis');
      assert.ok(forward ? tip.x > base.x : tip.x < base.x, 'green follows the first direction; red points in the opposite direction');
    }
    const motion = renderNodes(group).find(n => n.p?.key === 'motionPath');
    if (motion) {
      const expected = (forward ? points : [...points].reverse()).flatMap(p => [p.x,p.y]);
      assert.deepEqual(numeric(motion.p.d), expected, 'animation follows the same axis, reversing order only');
    }
  }
  return strokes;
}
function assertLiveAxis(group, points) {
  const lines = group.querySelectorAll('polyline'), expected = pointText(points);
  assert.equal(lines.filter(e => e.getAttribute('data-path-role') === 'stroke').length, 2);
  for (const line of lines) {
    assert.equal(line.getAttribute('points'), expected, 'every paint pass stays on the edited axis during live pointer movement');
    assert.equal(+line.getAttribute('data-path-offset') || 0, 0);
    assert.equal(+line.getAttribute('data-path-casing-gap') || 0, 0);
  }
}
function checkPathFixture(X) {
  const saved = st(X).paths;
  assert.equal(saved.length, 1, 'persisted fixture contains one path entity');
  assert.equal(saved[0].uid, 'TEST_ONLY_p1');
  assert.equal(X.v.pathNodes.length, 1, 'real page renders the persisted path before interaction');
  assert.ok(strokesOf(X.v.pathNodes).length, 'the actual shared renderer produces colored strokes');
}
test('Production paths: one original axis alternates green/red with opposite arrows and no canvas legend; one-way classes remain unchanged', () => {
  for (const type of ['in','out','emg','svc']) for (const dir of ['two','fwd']) {
    const points = [{x:100,y:550},{x:1300,y:550}], X = plan('plan',{t:'path',i:0},pathCase({type,dir,pts:points}));
    checkPathFixture(X);
    const before = X.W.store.get(KP), strokes = assertColorsAndArrows(X.v.pathNodes, points, dir === 'two', type);
    if (dir === 'two') {
      const intervals = paintIntervals(strokes, 1200);
      assert.ok(intervals.every(p => p.filter(Boolean).length === 1), 'solid alternation paints each interior position once on one axis');
      const colors = intervals.map(p => p[0] ? 'green' : 'red');
      assert.ok(colors.includes('green') && colors.includes('red'));
      assert.ok(colors.filter((c,i) => i && c !== colors[i-1]).length >= 4, 'colors alternate repeatedly rather than splitting the path into two halves');
    }
    assert.equal(X.W.store.get(KP), before, 'rendering never writes path entities or stored geometry');
  }
});

test('Production paths: disabled, muted, no animation, selection and zoom preserve one-axis rendering', () => {
  const X = plan('plan',{t:'path',i:0},pathCase({active:false,anim:false})); checkPathFixture(X);
  const points = st(X).paths[0].pts, nodes = renderNodes(X.v.pathNodes);
  assert.ok(assertAxis(X.v.pathNodes,points).every(n => n.p.stroke === 'var(--fg-x94a3b8)'));
  assert.equal(nodes.filter(n => n.t === 'animateMotion').length,0);
  assert.ok(nodes.some(n => n.p?.key === 'selection'),'selection remains visible behind the original axis');
  X.c.state.paths[0].active = true;
  const first = strokesOf(X.c.renderVals().pathNodes)[0];
  X.c.state.view = {x:0,y:0,w:500,h:300};
  const second = assertAxis(X.c.renderVals().pathNodes,points)[0];
  assert.equal(second.p.strokeWidth*2,first.p.strokeWidth,'stroke size follows view scale without lateral separation');
  assert.deepEqual(numeric(second.p.strokeDasharray).map(n => n*2),numeric(first.p.strokeDasharray),'alternation scales with the displayed stroke');
  const muted = X.c.bsPathVisual(st(X).paths[0],{types,scale:1,muted:true});
  assert.ok(assertAxis(muted,points).every(n => n.p.stroke === 'var(--fg-x94a3b8)'));
  assert.equal(renderNodes(muted).filter(n => n.t === 'animateMotion').length,0);
  assert.match(JSON.stringify(nodes),/var\(--bg-xffffff/,'edge uses the existing theme background token');
});

test('Production paths: touch/mouse vertex edit keeps one colored axis while painting, saves one entity, then reloads', () => {
  for (const pointerType of ['touch','mouse']) {
    const X = plan('plan',{t:'path',i:0},pathCase()), {W,c,el} = X; checkPathFixture(X);
    assert.ok(el.pv1,'the existing real page edit handle rendered before input');
    const ev = (x,y) => tp(x,y,1,{pointerType});
    W.dispatch(el.pv1,'pointerdown',ev(300,550)); assert.ok(c.state.pvdrag,'existing edit handler accepts the pointer');
    W.T.now += 400; drag(W,el.pv1,[300,550],[330,520],3,20,ev);
    assertLiveAxis(el.pa0_0.parentNode,[{x:100,y:550},{x:330,y:520}]);
    W.dispatch(el.pv1,'pointerup',ev(330,520)); W.flushTimers();
    assert.equal(X.S.saves,1,'existing save path commits once');
    const saved = c.loadPlan().months['1448-5'].d[0].paths;
    assert.equal(saved.length,1); assert.equal(saved[0].uid,'TEST_ONLY_p1'); assert.equal(saved[0].id,'TEST_ONLY_path_id');
    assert.equal(saved[0].pts[1].x,330); assert.equal(saved[0].pts[1].y,520);
    c.state.paths = JSON.parse(JSON.stringify(saved)); assertAxis(c.renderVals().pathNodes,saved[0].pts);
  }
});

test('Production paths: second touch zoom cancels lead drag without changing or saving path geometry', () => {
  const X = plan('plan',{t:'path',i:0},pathCase()), {W,c,el,svg} = X; checkPathFixture(X);
  const before = JSON.stringify(c.state.paths);
  W.dispatch(el.pa0_0,'pointerdown',tp(200,550,1));
  W.T.now += 30; W.dispatch(svg,'pointerdown',tp(700,400,2));
  W.dispatch(svg,'pointermove',tp(800,350,2)); W.flushFrames();
  W.dispatch(svg,'pointerup',tp(800,350,2)); W.dispatch(el.pa0_0,'pointerup',tp(200,550,1)); W.flushTimers();
  assert.ok(c.state.view.w<1000,'pinch remains a viewport gesture');
  assert.equal(JSON.stringify(c.state.paths),before); assert.equal(X.S.saves,0);
});

function dailyPath(options = {}, approved = false) {
  const W = world(), c = W.logic('daily',DAILY), h = c.hParts(new Date()), key = h.y+'-'+h.m+'-'+h.d;
  const path = {uid:'TEST_ONLY_p1',id:'TEST_ONLY_path_id',pts:[{x:100,y:550},{x:300,y:550}],...pathCase(options)};
  const rounds = {[key]:{ap:approved,t:12345,d:[site({paths:[path]})]}};
  W.store.set('bassam_rounds_v1',JSON.stringify(rounds));
  c.state = {...c.state,year:h.y,month:h.m,day:h.d,floor:0,rounds:c.loadRounds(),dsTab:'rounds',lens:'zones',tool:'select',dsSel:{t:'path',i:0},dview:{x:0,y:0,w:1000,h:600}};
  const v = c.renderVals();
  assert.equal(JSON.parse(W.store.get('bassam_rounds_v1'))[key].d[0].paths[0].uid,'TEST_ONLY_p1','daily fixture persisted and readable');
  assert.equal(v.mapPathNodes.length,1,'real daily canvas renders the stored fixture before input');
  const svg = node(W,'svg',W.body,null,{onPointerDown:v.dsDown,onPointerMove:v.dsMove,onPointerUp:v.dsUp,onPointerCancel:v.dsUp},{'data-ds-zoom':'1'});
  const group = mountPathNode(W,svg,v.mapPathNodes[0]), handles = {};
  for (const n of renderNodes(v.dsPathHandleNodes).filter(n => n.t === 'circle')) {
    const p = n.p, el = mountPathNode(W,svg,n); handles[p.key] = el;
    el.rect = {left:p.cx-3,top:p.cy-3,width:6,height:6};
  }
  return {W,c,key,v,svg,group,handles};
}

test('Production paths: daily and field render the same original axis and colors, including locked round read-only rendering', () => {
  for (const type of ['in','out','emg','svc']) for (const approved of [false,true]) {
    const X = dailyPath({type},approved), P = plan('plan',null,pathCase({type})); checkPathFixture(P);
    const points = st(P).paths[0].pts;
    const pick = tree => assertAxis(tree,points).map(n => ({points:n.p.points,stroke:n.p.stroke,dash:n.p.strokeDasharray,offset:n.p.strokeDashoffset}));
    assert.equal(JSON.stringify(pick(X.v.mapPathNodes)),JSON.stringify(pick(P.v.pathNodes)),'both pages invoke the same shared renderer');
    if (approved) {
      assert.equal(X.v.mapPathNodes[0].p.style.pointerEvents,'none');
      assert.equal(Object.keys(X.handles).length,0,'locked round exposes no edit handles');
    }
  }
});

test('Production paths: daily touch/mouse vertex painting preserves one axis and commits only the existing path geometry', async () => {
  for (const pointerType of ['touch','mouse']) {
    const X = dailyPath(), {W,c,handles} = X, before = JSON.parse(W.store.get('bassam_rounds_v1'));
    assertAxis(X.v.mapPathNodes,before[X.key].d[0].paths[0].pts); assert.ok(handles.pv1,'daily edit handle exists before input');
    const ev = (x,y) => tp(x,y,1,{pointerType});
    W.dispatch(handles.pv1,'pointerdown',ev(300,550)); assert.ok(c.state.dspvdrag);
    W.T.now += 400; drag(W,handles.pv1,[300,550],[330,520],3,20,ev);
    assertLiveAxis(X.group,[{x:100,y:550},{x:330,y:520}]);
    W.dispatch(handles.pv1,'pointerup',ev(330,520)); W.flushTimers(); await new Promise(r => setImmediate(r));
    const paths = c.loadRounds()[X.key].d[0].paths;
    assert.equal(paths.length,1); assert.equal(paths[0].uid,'TEST_ONLY_p1'); assert.equal(paths[0].id,'TEST_ONLY_path_id');
    assert.equal(paths[0].pts[1].x,330); assert.equal(paths[0].pts[1].y,520);
    const expected = before[X.key].d[0].paths[0]; expected.pts = paths[0].pts;
    assert.equal(JSON.stringify(paths[0]),JSON.stringify(expected),'only geometry changed through the existing editor');
    c.state.rounds = c.loadRounds(); assertAxis(c.renderVals().mapPathNodes,paths[0].pts);
  }
});

test('Production paths: line styles, widths and view scale alternate colors along one unshifted axis', () => {
  const points = [{x:100,y:550},{x:1300,y:550}], X = plan('plan',null,pathCase({pts:points})); checkPathFixture(X);
  const before = X.W.store.get(KP);
  for (const type of ['in','out','emg','svc']) for (const w of ['thin','normal','bold']) for (const line of ['solid','dash','dot']) for (const scale of [.5,1,2]) {
    const path = {...st(X).paths[0],...pathCase({type,w,line})}, nodes = renderNodes(X.c.bsPathVisual(path,{types,scale,key:'TEST_ONLY_axis'}));
    const strokes = assertColorsAndArrows(nodes,points), hits = nodes.filter(n => n.p?.['data-path-role'] === 'hit');
    assert.ok(hits[0].p.strokeWidth>=17.9*scale-1e-8,'the previous generous minimum touch target remains');
    const intervals = paintIntervals(strokes,1200);
    assert.ok(intervals.every(p => p.filter(Boolean).length<=1),'two-way paint intervals do not create competing parallel color tracks');
    assert.ok(intervals.some(p => p[0]) && intervals.some(p => p[1]),'each line style exposes both colors');
    assert.equal(intervals.some(p => !p.some(Boolean)),line!=='solid','chosen dash/dot gaps remain visible while solid stays continuous');
    if (line!=='solid') assert.ok(strokes.every(n => n.p.strokeLinecap==='round'),'dash/dot endpoints retain rounded rendering');
  }
  assert.equal(X.W.store.get(KP),before,'all display choices preserve the stored path');
});

test('Production paths: curved, duplicate, short, reversed and sharp stored vertices retain the exact original axis', () => {
  const shapes = [
    [{x:100,y:100},{x:200,y:100},{x:200,y:200},{x:400,y:200}],
    [{x:0,y:0},{x:0,y:0},{x:10,y:0},{x:0,y:0}],
    [{x:0,y:0},{x:1,y:0}],
    [{x:10,y:10},{x:10,y:10}],
  ];
  for (const angle of [135,170,179]) for (const sign of [-1,1]) {
    const r = angle*Math.PI/180;
    shapes.push([{x:0,y:0},{x:100,y:0},{x:100+100*Math.cos(r),y:sign*100*Math.sin(r)}]);
  }
  const X = plan('plan',null,pathCase()); checkPathFixture(X);
  const before = X.W.store.get(KP);
  for (const points of shapes) for (const scale of [.5,1,2]) {
    const path = {...st(X).paths[0],pts:points}, original = JSON.stringify(path);
    const nodes = X.c.bsPathVisual(path,{types,scale,key:'TEST_ONLY_shapes'});
    assertAxis(nodes,points);
    assert.equal(JSON.stringify(path),original,'rendering does not alter UID, class, points or short/duplicate geometry');
  }
  assert.equal(X.c.bsPathVisual({...st(X).paths[0],pts:[]},{types,scale:1}).length,0);
  assert.equal(X.c.bsPathVisual({...st(X).paths[0],pts:[{x:0,y:0}]},{types,scale:1}).length,0);
  assert.equal(X.W.store.get(KP),before);
});

test('Production paths: original field and daily editors toggle, save and cancel one named entity without changing identity, class or geometry', async () => {
  for (const slug of ['plan','daily']) for (const type of ['in','out','emg','svc']) {
    const X = slug==='plan'?plan('plan',null,pathCase({type,dir:'fwd'})):dailyPath({type,dir:'fwd'}), {W,c} = X;
    const getSaved = () => slug==='plan'?st(X).paths:c.loadRounds()[X.key].d[0].paths;
    const before = JSON.parse(JSON.stringify(getSaved()[0])), key = slug==='plan'?KP:'bassam_rounds_v1', persisted = W.store.get(key);
    const open = () => slug==='plan'?c.openPathEditor(0,false):c._dsOpenPathEditor(0,false);
    open(); c.renderVals().peToggleDir();
    const preview = c.renderVals();
    assert.equal(c.state.pEdit.dir,'two'); assert.equal(preview.peName,before.name,'one existing name serves both directions');
    assert.equal(W.store.get(key),persisted,'direction preview alone does not write data');
    const previewHit = renderNodes(preview.pePreview).find(n => n.p?.['data-path-role'] === 'hit');
    const previewPoints = previewHit.p.points.split(' ').map(p => { const [x,y] = p.split(',').map(Number); return {x,y}; });
    assertAxis(preview.pePreview,previewPoints);
    assert.equal(preview.peTypeLabel,type==='in'||type==='out'?'دخول وخروج':types[type].label,'classification labels remain intact');
    assert.match(preview.peDirHint,/مسار واحد.*الأخضر.*الأحمر/,'the two-way hint describes the actual alternating colors');
    preview.peSave(); W.flushTimers(); await new Promise(r => setImmediate(r));
    let saved = getSaved();
    assert.equal(saved.length,1); assert.equal(saved[0].uid,before.uid); assert.equal(saved[0].id,before.id);
    assert.equal(JSON.stringify(saved[0].pts),JSON.stringify(before.pts)); assert.equal(saved[0].type,type); assert.equal(saved[0].dir,'two');
    open(); c.renderVals().peToggleDir(); c.renderVals().peCancel(); W.flushTimers(); await new Promise(r => setImmediate(r));
    saved = getSaved();
    assert.equal(saved.length,1); assert.equal(saved[0].uid,before.uid); assert.equal(saved[0].dir,'two','cancel preserves the saved direction');
    assert.equal(JSON.stringify(saved[0].pts),JSON.stringify(before.pts)); assert.equal(saved[0].type,type);
  }
});

/* RISHAD-266 port (V7 b4): the sibling proved the centred band with a browser pixel test. Without a rasteriser the same
   contract is asserted on the SVG itself: a stroke is centred on its `points` by definition, so one visible band centred on
   the stored axis ⇔ every paint pass has the stored points, no offset/transform, the two colour passes have equal width and
   complementary dashes, and the screen thickness (stroke width × pixels per map unit) is the same at every zoom. */
test('Production paths: the colour band stays centred on the stored axis with a constant screen thickness at several zoom levels (plan and daily)', () => {
  const points = [{ x: 140, y: 300 }, { x: 620, y: 300 }, { x: 780, y: 430 }, { x: 900, y: 430 }], length = 480 + Math.hypot(160, 130) + 120;
  const P = plan('plan', null, pathCase({ pts: points, w: 'bold', anim: false })), D = dailyPath({ pts: points, w: 'bold', anim: false });
  const seen = { plan: new Set(), daily: new Set() };
  for (const w of [1000, 800, 500, 250, 2000]) {
    P.c.state.view = { x: 0, y: 0, w, h: w * .6 }; D.c.state.dview = { x: 0, y: 0, w, h: w * .6 };
    const trees = { plan: P.c.renderVals().pathNodes, daily: D.c.renderVals().mapPathNodes }, picked = {};
    for (const [page, tree] of Object.entries(trees)) {
      const strokes = assertAxis(tree, points), px = 1000 / w;
      assert.equal(strokes[0].p.strokeWidth, strokes[1].p.strokeWidth, page + ': both colours have one width, so one band');
      seen[page].add((strokes[0].p.strokeWidth * px).toFixed(6));
      const intervals = paintIntervals(strokes, length);
      assert.ok(intervals.every(p => p.filter(Boolean).length === 1), page + ' @' + w + ': each cross-section of the axis shows exactly one colour');
      assert.ok(intervals.filter((p, i) => i && p[0] !== intervals[i - 1][0]).length >= 6, page + ' @' + w + ': the colours alternate repeatedly along the axis');
      const edge = renderNodes(tree).find(n => n.p?.key === 'edge');
      assert.ok(edge.p.strokeWidth > strokes[0].p.strokeWidth && edge.p.points === strokes[0].p.points, page + ': the light edge is the same axis, symmetric around the band');
      picked[page] = strokes.map(n => [n.p.points, n.p.stroke, n.p.strokeWidth, n.p.strokeDasharray, n.p.strokeDashoffset]);
    }
    assert.deepEqual(picked.daily, picked.plan, 'plan and daily draw identical geometry at zoom ' + w);
  }
  assert.equal(seen.plan.size, 1, 'plan: the band is the same number of screen pixels at every zoom');
  assert.equal(seen.daily.size, 1, 'daily: the band is the same number of screen pixels at every zoom');
});

test('Production paths: two-way arrowheads are full-size, interleaved along the axis and never overlap or meet tip-to-tip', () => {
  const X = plan('plan', null, pathCase()); checkPathFixture(X);
  for (const scale of [.5, 1, 2]) for (const len of [8, 30, 59, 60, 61, 119, 120, 500, 1200]) {
    const points = [{ x: 100, y: 550 }, { x: 100 + len * scale, y: 550 }], nodes = renderNodes(X.c.bsPathVisual({ ...st(X).paths[0], pts: points, anim: false }, { types, scale, key: 'TEST_ONLY_arrows' }));
    const heads = [];
    for (const group of nodes.filter(n => n.t === 'g' && n.p?.['data-path-direction'])) {
      const forward = group.p['data-path-direction'] === 'forward', arrows = renderNodes(group).filter(n => n.t === 'path');
      assert.ok(arrows.length >= 1, 'each direction keeps at least one arrowhead (' + len + ')');
      assert.ok(arrows.every(a => a.p.key !== 'end'), 'a two-way path has no terminal arrowhead that would face the opposite direction at a vertex');
      for (const a of arrows) {
        const n = numeric(a.p.d), tip = n[0], base = (n[2] + n.at(-2)) / 2, half = Math.abs(n[3] - n.at(-1)) / 2;
        assert.ok(Math.abs(Math.abs(tip - base) - 11 * scale) < 1e-6 && Math.abs(half - 4.62 * scale) < 1e-6, 'the normal (non-compact) arrowhead is used for both directions');
        assert.ok(forward ? tip > base : tip < base);
        heads.push({ forward, tip, from: Math.min(tip, base), to: Math.max(tip, base) });
      }
    }
    heads.sort((a, b) => a.tip - b.tip);
    for (let i = 1; i < heads.length; i++) {
      assert.notEqual(heads[i].forward, heads[i - 1].forward, 'directions alternate along the axis (' + len + ' @' + scale + ')');
      assert.ok(heads[i].from >= heads[i - 1].to - 1e-6, 'neighbouring arrowheads do not overlap (' + len + ' @' + scale + ')');
      assert.ok(heads[i].tip - heads[i - 1].tip > 1e-6, 'opposing tips never coincide');
    }
  }
});
