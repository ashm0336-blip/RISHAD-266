/* V7 · 53 (ملحق 6 · البند 11): صورُ خرائط الجولات من لقطة شهرها — نقلُ سلوك البرودكشن (0aadb9a · 1ea2359)، لا كودِه.
   كان _loadFloorImgs يأخذ الصورَ من طوابق الخطة الحالية بترتيبها، فجولةُ شهرٍ ماضٍ تغيّرت خريطتُه أو ترتيبُ مواقعه تُظهر صورةً خاطئة.
   الآن: الصورةُ من لقطة شهر الجولة المعروضة، مطابَقةً بمعرّف الموقع (sid). شهران بخريطتين مختلفتين (وترتيبٍ مختلف للمواقع).
   منطقُ «المتابعة اليومية» الحقيقيّ (node:vm · canvas_world) فوق نسخةٍ بشكل Production (oldFile({small:true}): طوابقُ بـsid وiid) · TEST_ONLY.
   DAILY_LOGIC=<مسار> يبدّل ملفَّ المنطق (لإثبات الإخفاق على السابق). */
import './clock.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { world } from './canvas_world.mjs';
import { operations } from './operational_ui_fx.mjs';
import { oldFile } from './v7_d6_import_fx.mjs';

const DAILY = process.env.DAILY_LOGIC ? fs.readFileSync(process.env.DAILY_LOGIC, 'utf8') : undefined;
const clone = (v) => JSON.parse(JSON.stringify(v));
const img = (k) => 'data:image/png;base64,TEST_ONLY_' + k;
const flush = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r)); };
const roundOf = (sites) => ({ t: 1, ap: 0, d: sites.map((f) => ({ sid: f.sid, name: f.name, zones: [], gates: [], marks: [], paths: [] })) });

let BASE = null;
/* النسخةُ بشكل Production: طابقان بمعرّفيهما وصورتيهما الحاليتين؛ لقطةُ شهر 4 بخريطتين أخريين وترتيبٍ معكوس، ولقطةُ شهر 5 بخريطتين ثالثتين */
async function shaped() {
  if (!BASE) { const f = await oldFile({ small: true }); BASE = JSON.parse(f.data.bassam_plan_v1); }
  const plan = clone(BASE), [A, B] = plan.floors;
  assert.ok(A.sid && B.sid && A.iid && B.iid, 'طابقا النسخة بمعرّفٍ وصورة');
  const snap = (f, iid) => ({ ...clone(f), iid });
  plan.months = { '1448-4': { c: 1, d: [snap(B, 'img_TEST_ONLY_B_m4'), snap(A, 'img_TEST_ONLY_A_m4')] }, '1448-5': { c: 1, d: [snap(A, 'img_TEST_ONLY_A_m5'), snap(B, 'img_TEST_ONLY_B_m5')] } };
  const rounds = { '1448-4-10': roundOf([B, A]), '1448-5-3': roundOf([A, B]), '1448-6-2': roundOf([A, B]) };
  return { plan, rounds, A, B };
}
function page(D, get) {
  const W = world(), c = W.logic('daily', DAILY), calls = [];
  const op = operations({ bassam_plan_v1: D.plan, bassam_rounds_v1: D.rounds, bassam_zone_opts_v1: {} });
  W.KIVO.__BS_SRV = { ...(W.KIVO.__BS_SRV || {}), operations: op.service, rev: () => 0 };
  W.KIVO.BassamIDB = { get: (k) => { calls.push(k); return get ? get(k) : Promise.resolve(img(k)); } };
  c.bsToast = () => {};
  const at = (y, m, d) => { c.state = { ...c.state, year: y, month: m, day: d, floor: 0, rounds: D.rounds, lens: 'zones', panelTab: 'zones', tool: 'select', dsTab: 'rounds', dview: { x: 0, y: 0, w: 1000, h: 600 } }; };
  const shown = () => { const n = c.renderVals().floorImgNode; return n ? n.ch.flat().find((x) => x && x.t === 'image').p.href : null; };
  return { W, c, op, calls, at, shown };
}

test('ملحق 6 · 11 — جولةُ شهرٍ ماضٍ تعرض خريطةَ لقطة شهرها بمعرّف الموقع (لا خريطةَ الخطة الحالية ولا موضعَ الصف)', async () => {
  const D = await shaped(), P = page(D), before = JSON.stringify(P.op.data);
  P.at(1448, 4, 10); P.c._loadFloorImgs(); await flush();
  assert.equal(P.c.state.fimgs[0], img('img_TEST_ONLY_A_m4'), 'الموقعُ الأول (A) في شهر 4 بخريطة لقطته — وهو ثاني صفٍّ في اللقطة');
  assert.equal(P.c.state.fimgs[1], img('img_TEST_ONLY_B_m4'));
  assert.equal(P.shown(), img('img_TEST_ONLY_A_m4'), 'الخريطةُ المرسومة');
  /* شهرٌ آخر بخريطةٍ أخرى: يُعاد التحميل من لقطته (componentDidUpdate) */
  const prev = { ...P.c.state }; P.at(1448, 5, 3); P.c.componentDidUpdate({}, prev); await flush();
  assert.equal(P.c.state.fimgs[0], img('img_TEST_ONLY_A_m5'), 'شهر 5 بخريطة لقطته');
  assert.equal(P.c.state.fimgs[1], img('img_TEST_ONLY_B_m5'));
  assert.equal(P.shown(), img('img_TEST_ONLY_A_m5'));
  /* شهرٌ بلا لقطة: طوابقُ الخطة الحالية كما كان */
  const prev2 = { ...P.c.state }; P.at(1448, 6, 2); P.c.componentDidUpdate({}, prev2); await flush();
  assert.equal(P.c.state.fimgs[0], img(D.A.iid), 'بلا لقطة: الخطةُ الحالية');
  assert.equal(JSON.stringify(P.op.data), before, 'العرضُ لا يكتب شيئاً');
  assert.equal(P.op.control.stages.length, 0);
});

test('ملحق 6 · 11 — موقعٌ غائبٌ عن لقطة الشهر أو بلا صورةٍ فيها لا يستعير صورةَ غيره · والردُّ المتأخر من شهرٍ سابق لا يدخل', async () => {
  const D = await shaped();
  D.plan.months['1448-4'].d = [{ ...D.plan.months['1448-4'].d[0], iid: null }];   /* B بلا صورة · A غائب */
  const pend = new Map(), P = page(D, (k) => new Promise((r) => pend.set(k, r)));
  P.at(1448, 4, 10); P.c._loadFloorImgs(); await flush();
  assert.deepEqual(P.calls, [], 'لا طلبَ صورةٍ لموقعٍ بلا صورة في لقطة شهره');
  assert.equal(P.shown(), null);
  /* ردٌّ متأخر: يُطلب شهر 5 ثم يُنتقل إلى 6 قبل الرد */
  const p1 = { ...P.c.state }; P.at(1448, 5, 3); P.c.componentDidUpdate({}, p1); await flush();
  assert.ok(pend.has('img_TEST_ONLY_A_m5'));
  const p2 = { ...P.c.state }; P.at(1448, 6, 2); P.c.componentDidUpdate({}, p2); await flush();
  pend.get('img_TEST_ONLY_A_m5')(img('img_TEST_ONLY_A_m5')); await flush();
  assert.notEqual(P.c.state.fimgs[0], img('img_TEST_ONLY_A_m5'), 'ردُّ شهر 5 لا يدخل شهر 6');
  pend.get(D.A.iid)(img(D.A.iid)); await flush();
  assert.equal(P.shown(), img(D.A.iid));
});

/* V7 · 53 (ملحق 6 · ج — من المنسّق): نطاقاتُ الموقع (dsSectorNodes) كانت من لقطة الشهر بموضع الصف (n[f]) — الصنفُ نفسُه: بمعرّف الموقع */
test('ملحق 6 · ج — نطاقاتُ الموقع من لقطة شهرها بمعرّف الموقع لا بموضع الصف', async () => {
  const D = await shaped();
  const sec = (code, x) => [{ id: 'sec_TEST_ONLY_' + code, code, name: 'TEST_ONLY ' + code, pts: [{ x, y: 10 }, { x: x + 190, y: 10 }, { x: x + 190, y: 200 }] }];
  D.plan.months['1448-4'].d[0].sectors = sec('B4', 500); D.plan.months['1448-4'].d[1].sectors = sec('A4', 10);   /* اللقطة: B ثم A */
  D.plan.months['1448-4'].d.forEach((x) => (x.hideSectors = false));
  const P = page(D);
  P.at(1448, 4, 10);
  const node = P.c.renderVals().dsSectorNodes, txt = JSON.stringify(node);
  assert.ok(node, 'نطاقاتُ الموقع A مرسومة');
  assert.match(txt, /"M10 10 L200 10 L200 200 Z"/, 'الموقعُ الأول (A) بنطاقات A في لقطة شهره: ' + txt.slice(0, 200));
  assert.doesNotMatch(txt, /M500 10/, 'لا نطاقاتِ الموقع B الواقع في الصف الأول من اللقطة');
});
