/* W1-C1 · منتصفُ المسار (pm#) في «الجولات اليومية» — منطقُ المتابعة اليومية الحقيقي (src/modules/daily/logic.js) مع طبقة الإدخال
   الحقيقية (560) داخل node:vm، وتوزيعُ الأحداث كالمتصفح (tests/unit/canvas_world.mjs). المقابضُ هي عناصرُ الصفحة نفسُها (dsPathHandleNodes · dsHandleNodes)
   ومعالجاتُ الخريطة dsDown/dsMove/dsUp كما تربطها الصفحة. بياناتٌ اصطناعية (TEST_ONLY).
     كانت ضغطةُ المنتصف تكتب الرأسَ المُضاف في الجولة فوراً (_updRound ← saveRounds: المخزن + الحالة + خطوةُ تراجع)؛ فإن نزل إصبعٌ ثانٍ خلال
     350ms (تكبيرٌ عادي) ألغت طبقةُ الإدخال السحبَ ولم تبلغ تلك الكتابة، ولم يرَ dsUp سحباً يُعيده — فيبقى رأسٌ شارد يُحفظ ويُزامَن.
     الآن الرأسُ المُضاف في الحالة المؤقّتة (dsPathTmp) ويعتمده الرفع؛ والنقرُ والسحبُ المقصود كما كانا.
   R3-DAILY-M · منتصفُ المصلّى (m#) كما قبل الجولة 2: الضغطةُ تكتب الرأسَ في الجولة فوراً. جعلُه حالةً مؤقّتةً (dsZoneTmp) يعتمدها الرفعُ بالفهرس
     كان يكتب نسخةَ لحظة الضغط فوق تحديثٍ وصل أثناء النقرة: يُمحى تعديلُ الجهاز الآخر للمصلّى، أو يُكتب على مصلٍّ آخر إن تزحزحت الفهارس.
   DAILY_LOGIC=<مسار> يبدّل ملفَّ المنطق · CANVAS_SRC=<مسار> يبدّل الطبقة (لإثبات الإخفاق على السابق). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { world, node, tp } from './canvas_world.mjs';

const SRC = process.env.DAILY_LOGIC ? fs.readFileSync(process.env.DAILY_LOGIC, 'utf8') : undefined;
const KR = 'bassam_rounds_v1';
const D0 = 'M100 100 L400 100 L400 300 L100 300 Z';

/* جولةُ اليوم (تاريخٌ هجريٌّ حاليّ فلا قفلَ ماضٍ) بمسارٍ ذي رأسين ومصلّى مربّع (ومصلياتٌ بعده إن مُرِّرت) · عدسةُ المصليات · أداةُ التحديد · العرضُ كاملاً (1px = وحدة) */
function page(sel, more = []) {
  const W = world(), c = W.logic('daily', SRC);
  const h = c.hParts(new Date()), RK = h.y + '-' + h.m + '-' + h.d;
  const rounds = { [RK]: { d: [{ zones: [{ uid: 'TEST_ONLY_z1', d: D0, cx: 250, cy: 200 }].concat(more), paths: [{ uid: 'TEST_ONLY_p1', pts: [{ x: 100, y: 100 }, { x: 300, y: 100 }] }], gates: [], marks: [] }] } };
  W.store.set(KR, JSON.stringify(rounds));
  c.state = Object.assign({}, c.state, { year: h.y, month: h.m, day: h.d, floor: 0, lens: 'zones', tool: 'select', dview: { x: 0, y: 0, w: 1000, h: 600 }, dsSel: sel, rounds: JSON.parse(JSON.stringify(rounds)) });
  let writes = 0; const set0 = W.store.set.bind(W.store); W.store.set = (k, v) => { if (k === KR) writes++; return set0(k, v); };
  const v = c.renderVals();
  const svg = node(W, 'svg', W.body, null, { onPointerDown: v.dsDown, onPointerMove: v.dsMove, onPointerUp: v.dsUp, onPointerCancel: v.dsUp }, { 'data-ds-zoom': '1' });
  if (sel.t === 'path') { const g = node(W, 'g', svg, 'pa0_0'); node(W, 'polyline', g, null, null, { points: '100,100 300,100' }); }
  else node(W, 'path', svg, null, null, { d: D0 });
  const H = sel.t === 'path' ? v.dsPathHandleNodes : v.dsHandleNodes, hs = {};
  for (const el of [].concat(...(H.ch || [])).flat(3)) {
    if (!el || el.t !== 'circle' || !el.p || el.p.key == null) continue;
    const p = el.p, ci = node(W, 'circle', svg, p.key, p, { cx: String(p.cx), cy: String(p.cy) });
    ci.rect = { left: p.cx - 3, top: p.cy - 3, width: 6, height: 6, right: p.cx + 3, bottom: p.cy + 3 };
    hs[p.key] = ci;
  }
  const site = () => JSON.parse(W.store.get(KR))[RK].d[0];
  const undo = () => (c._dsUndo || []).length;
  return { W, c, svg, hs, site, undo, writes: () => writes, RK, set0, get: () => W.store.get(KR) };
}
/* إصبعٌ على المقبض ثمّ إصبعٌ ثانٍ بعد 60ms على الخريطة الفارغة · قرصةٌ قصيرة · رفعُ الإصبعين */
function pinchFrom(X, el, x, y) {
  const { W, svg } = X, D = W.dispatch;
  D(el, 'pointerdown', tp(x, y, 1));
  W.T.now += 60; D(svg, 'pointerdown', tp(600, 400, 2));
  for (let k = 1; k <= 5; k++) { D(svg, 'pointermove', tp(600 + 10 * k, 400, 2)); W.flushFrames(); }
  D(svg, 'pointerup', tp(650, 400, 2)); D(el, 'pointerup', tp(x, y, 1)); W.flushTimers();
}

test('W1-C1: إصبعٌ على منتصف المسار ثمّ إصبعٌ ثانٍ خلال 350ms (تكبير) ⇒ لا رأسَ شارد — الجولةُ في المخزن والحالة كما كانت ولا خطوةَ تراجع', () => {
  const X = page({ t: 'path', i: 0 }), { c } = X;
  assert.ok(X.hs.pm0, 'مقبضُ المنتصف مرسومٌ من الصفحة');
  pinchFrom(X, X.hs.pm0, 201, 101);
  assert.equal(X.site().paths[0].pts.length, 2, 'المخزَّن: رأسان كما كان (كان 3 — رأسٌ شارد يُزامَن)');
  assert.equal(c._curFloorPaths()[0].pts.length, 2, 'الحالة: رأسان');
  assert.equal(X.writes(), 0, 'لا كتابةَ في الجولة');
  assert.equal(X.undo(), 0, 'لا خطوةَ تراجع');
  assert.equal(c.state.dspvdrag, null); assert.ok(!c.state.dsPathTmp, 'لا حالةَ مؤقّتة معلّقة');
});

test('W1-C1: ضغطةُ المنتصف ثمّ سحبٌ مقصود ⇒ يُضاف رأسٌ واحد حيث وقف الإصبع — كتابةٌ واحدة وخطوةُ تراجعٍ واحدة (باللمس والفأرة)', () => {
  for (const type of ['touch', 'mouse']) {
    const X = page({ t: 'path', i: 0 }), { W } = X, D = W.dispatch, ev = (x, y) => tp(x, y, 1, { pointerType: type });
    D(X.hs.pm0, 'pointerdown', ev(201, 101));
    assert.equal(X.writes(), 0, type + ': لا كتابةَ عند الضغط');
    for (let k = 1; k <= 8; k++) { W.T.now += 60; D(X.hs.pm0, 'pointermove', ev(200, 100 + 10 * k)); W.flushFrames(); }
    D(X.hs.pm0, 'pointerup', ev(200, 180)); W.flushTimers();
    assert.deepEqual(X.site().paths[0].pts, [{ x: 100, y: 100 }, { x: 200, y: 180 }, { x: 300, y: 100 }], type + ': الرأسُ المُضاف حيث تُرك');
    assert.equal(X.writes(), 1, type + ': كتابةٌ واحدة'); assert.equal(X.undo(), 1, type + ': خطوةُ تراجعٍ واحدة');
    assert.equal(X.c.state.dspvdrag, null); assert.equal(X.c.state.dsPathTmp, null);
  }
});

test('W1-C1: نقرةٌ على المنتصف بلا تحريك تنتهي كما قبل الموجة 1 — المسارُ بلا رأسٍ جديد (وبلا كتابةٍ ولا تراجعٍ يُعيد الرأسَ الشارد)', () => {
  const X = page({ t: 'path', i: 0 }), { W } = X, D = W.dispatch;
  D(X.hs.pm0, 'pointerdown', tp(201, 101, 1)); W.T.now += 80;
  assert.equal(((X.c.state.dsPathTmp || {}).pts || []).length, 3, 'الرأسُ المُضاف ظاهرٌ أثناء الضغط (حالةٌ مؤقّتة)');
  D(X.hs.pm0, 'pointerup', tp(201, 101, 1)); W.flushTimers();
  assert.deepEqual(X.site().paths[0].pts, [{ x: 100, y: 100 }, { x: 300, y: 100 }]);
  assert.equal(X.c._curFloorPaths()[0].pts.length, 2);
  assert.equal(X.writes(), 0); assert.equal(X.undo(), 0, 'كانت خطوتان: الأعلى منهما يُعيد الرأسَ الشارد');
  assert.equal(X.c.state.dspvdrag, null); assert.equal(X.c.state.dsPathTmp, null);
});

/* جهازٌ آخر: المخزنُ يحمل جولتَه ثمّ يُبلغ الصفحةَ (مستمعُ المخزن) — لا تُحسب كتابةً من الصفحة */
function remote(X, mut) { const R = JSON.parse(X.get()); mut(R[X.RK].d[0]); X.set0(KR, JSON.stringify(R)); X.c.setState({ rounds: X.c.loadRounds() }); }
const mouse = (x, y) => tp(x, y, 1, { pointerType: 'mouse' });

test('R3-DAILY-M: نقرةُ منتصف المصلّى (m#) ووصل أثناءها تعديلُ جهازٍ آخر للمصلّى نفسِه ⇒ يبقى تعديلُه والرأسُ مُضاف — كما قبل الجولة 2', () => {
  const X = page({ t: 'zone', i: 0 }), { W } = X, D = W.dispatch;
  assert.ok(X.hs.m0, 'مقبضُ منتصف المصلّى مرسومٌ من الصفحة');
  D(X.hs.m0, 'pointerdown', mouse(250, 101)); W.T.now += 60;
  remote(X, (s) => { s.zones[0].name = 'TEST_ONLY_remote'; });
  W.T.now += 40; D(X.hs.m0, 'pointerup', mouse(250, 101)); W.flushTimers();
  assert.equal(X.site().zones[0].name, 'TEST_ONLY_remote', 'تعديلُ الجهاز الآخر باقٍ (كان الرفعُ يكتب نسخةَ لحظة الضغط فوقه)');
  assert.equal(X.site().zones[0].d, 'M100 100 L250 100 L400 100 L400 300 L100 300 Z', 'والنقرةُ أضافت الرأسَ كما كانت');
});

test('R3-DAILY-M: نقرةُ منتصف المصلّى ووصل أثناءها مصلّى جديدٌ في أوّل الجولة (تتزحزح الفهارس) ⇒ لا يُكتب على مصلٍّ آخر', () => {
  const X = page({ t: 'zone', i: 0 }, [{ uid: 'TEST_ONLY_z2', d: 'M600 100 L700 100 L700 200 Z', cx: 650, cy: 130 }]), { W } = X, D = W.dispatch;
  D(X.hs.m0, 'pointerdown', mouse(250, 101)); W.T.now += 60;
  remote(X, (s) => { s.zones.unshift({ uid: 'TEST_ONLY_zR', d: 'M10 10 L60 10 L60 60 Z', cx: 30, cy: 30 }); });
  W.T.now += 40; D(X.hs.m0, 'pointerup', mouse(250, 101)); W.flushTimers();
  const z = X.site().zones;
  assert.equal(z.map((q) => q.uid).join(' '), 'TEST_ONLY_zR TEST_ONLY_z1 TEST_ONLY_z2', 'كلُّ مصلٍّ في موضعه (كان z1 يُكتب مكانَ المصلّى الجديد فيتكرّر)');
  assert.equal(z[0].d, 'M10 10 L60 10 L60 60 Z', 'مصلّى الجهاز الآخر لم يُمسّ');
  assert.equal(z[1].d, 'M100 100 L250 100 L400 100 L400 300 L100 300 Z', 'والرأسُ في المصلّى المضغوط');
});

test('R3-DAILY-M: منتصفُ المصلّى بلا تحديث — النقرةُ تُضيف الرأس · والسحبُ يضعه حيث تُرك (كما قبل الجولة 2)', () => {
  let X = page({ t: 'zone', i: 0 });
  X.W.dispatch(X.hs.m0, 'pointerdown', tp(250, 101, 1)); X.W.T.now += 80; X.W.dispatch(X.hs.m0, 'pointerup', tp(250, 101, 1)); X.W.flushTimers();
  assert.equal(X.site().zones[0].d, 'M100 100 L250 100 L400 100 L400 300 L100 300 Z', 'النقرةُ تُضيف الرأس');
  assert.equal(X.c.state.vdrag, null); assert.ok(!X.c.state.dsZoneTmp);

  X = page({ t: 'zone', i: 0 });
  X.W.dispatch(X.hs.m0, 'pointerdown', tp(250, 101, 1));
  for (let k = 1; k <= 8; k++) { X.W.T.now += 60; X.W.dispatch(X.hs.m0, 'pointermove', tp(250, 100 - 5 * k, 1)); X.W.flushFrames(); }
  X.W.dispatch(X.hs.m0, 'pointerup', tp(250, 60, 1)); X.W.flushTimers();
  assert.equal(X.site().zones[0].d, 'M100 100 L250 60 L400 100 L400 300 L100 300 Z', 'السحبُ يضع الرأسَ حيث تُرك');
  assert.equal(X.c.state.vdrag, null); assert.ok(!X.c.state.dsZoneTmp);
});
