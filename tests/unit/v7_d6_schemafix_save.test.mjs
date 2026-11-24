/* V7 · د6 (schemafix) — العميلُ والخادم متفقان: ما تكتبه صفحتا «الجولات اليومية» و«التشغيل الميداني» بطرق كتابتها الحقيقية
   (منطقُ الصفحة نفسُه داخل node:vm — tests/unit/canvas_world.mjs) يمرّ في الخادم الحقيقي /api/save بـ200 ويعود كما كُتب حرفاً.
   ① «القراءةُ بالسعة»: العددُ مع السعة {n, cap} · النسبةُ بلا سعة {n: null, cap: 0, p} · النسبةُ مع السعة (تُحوَّل إلى عددٍ بالسعة كما في الصفحة)
   ② سحبُ المصلى في الجولات: كان يكتب نسخةَ العرض (nNow · capNow · count = نسبةُ الصلاة) فيُرفض الحفظ — الآن الشكلُ وحده على المصلى المخزَّن
   ③ «مسح السعة» في المخطط: كان يكتب share · shareName = null فيُرفض — الآن يُزالان
   ④ سطرُ التقرير اليومي في سجلّ التسكين (rm · src) كما تبنيه صفحةُ التقرير (src/systems/dreport/client/logic.js drSetSpot · drToggleSpot)
   بياناتٌ اصطناعية TEST_ONLY. DAILY_LOGIC / PLAN_LOGIC=<مسار> يبدّلان المنطق (لإثبات الإخفاق على السابق). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { world as canonical, D1, IDS, copy } from './canonical_fx.mjs';
import { installOperationalFixture, inspectOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { world as canvas, node, tp } from './canvas_world.mjs';
import { hasSystem } from './harness.mjs';

const DAILY = process.env.DAILY_LOGIC ? fs.readFileSync(process.env.DAILY_LOGIC, 'utf8') : undefined;
const PLAN = process.env.PLAN_LOGIC ? fs.readFileSync(process.env.PLAN_LOGIC, 'utf8') : undefined;
const need = hasSystem('plan', 'daily') ? {} : { skip: 'يحتاج نظامَي المخطط والجولات' };
const KR = 'bassam_rounds_v1', KP = 'bassam_plan_v1';
const D0 = 'M100 100 L400 100 L400 300 L100 300 Z', D1Z = 'M500 100 L700 100 L700 300 L500 300 Z';

async function server() {
  const B = await canonical();
  await installOperationalFixture(B.env, B.W);
  return B;
}
async function save(B, resource, value, requestId) {
  const key = 'bsdept:' + D1 + ':' + resource;
  const read = await B.api('super', '/api/operations/read?' + new URLSearchParams({ uid: IDS.super, keys: key }));
  assert.equal(read.status, 200); assert.equal(read.json.ok, 1);
  return B.api('super', '/api/save', { method: 'POST', body: { uid: IDS.super, requestId, epoch: read.json.epoch, base: read.json.base, set: { [key]: JSON.stringify(value) }, del: [] } });
}
async function roundTrip(B, resource, value, tag) {
  const r = await save(B, resource, value, 'TEST_ONLY_schemafix_' + tag);
  assert.equal(r.status, 200, tag + ': ' + JSON.stringify(r.json) + ' ' + JSON.stringify(value).slice(0, 300));
  assert.equal(r.json.ok, 1, tag);
  assert.equal(JSON.stringify(inspectOperationalFixture(B.env, 'bsdept:' + D1 + ':' + resource)), JSON.stringify(value), tag + ': يعود كما كُتب حرفاً');
}
/* صفحةُ الجولات على يومٍ حاليّ: مصلى بسعة (z1) ومصلى بلا سعة (z2) · المصلى المحدَّد · الصلاةُ المختارة */
function dailyPage(prayer, i) {
  /* V7 · 53 تقويم: يومُ الصفحة ميلاديٌّ ISO (gParts · YYYY-MM-DD) — كان hParts الهجري */
  const W = canvas(), c = W.logic('daily', DAILY), h = c.gParts(new Date()), RK = h.y + '-' + String(h.m).padStart(2, '0') + '-' + String(h.d).padStart(2, '0');
  const rounds = { [RK]: { t: 1, d: [{ sid: 'TEST_ONLY_S1', zones: [
    { uid: 'TEST_ONLY_z1', code: '1', d: D0, cx: 250, cy: 200, cap: 300, count: null, pc: {}, emp: [] },
    { uid: 'TEST_ONLY_z2', code: '2', d: D1Z, cx: 600, cy: 200, count: 35, emp: [] },
  ], paths: [], gates: [], marks: [] }] } };
  W.store.set(KR, JSON.stringify(rounds));
  c.state = Object.assign({}, c.state, { year: h.y, month: h.m, day: h.d, floor: 0, lens: 'zones', tool: 'select', prayer, dview: { x: 0, y: 0, w: 1000, h: 600 }, dsSel: { t: 'zone', i }, rounds: JSON.parse(JSON.stringify(rounds)) });
  return { W, c, RK, stored: () => JSON.parse(W.store.get(KR)) };
}

test('① «القراءةُ بالسعة» من الصفحة نفسِها تُحفظ في الخادم الحقيقي وتعود كما هي — عددٌ بالسعة · نسبةٌ بلا سعة · نسبةٌ بالسعة · ومسحُ القراءة', need, async () => {
  const B = await server();
  /* عددُ المصلين في مصلى بسعة 300 (الفجر) */
  let X = dailyPage('fajr', 0); X.c.renderVals(); X.c._occApply.n(120);
  let doc = X.stored();
  assert.deepEqual(doc[X.RK].d[0].zones[0].pc, { fajr: { n: 120, cap: 300 } }, 'الصفحةُ تكتب {n, cap}');
  await roundTrip(B, KR, doc, 'count-with-capacity');
  /* نسبةٌ في مصلى بلا سعة (الظهر): {n: null, cap: 0, p} — ومعها count القديمة تنتقل إلى fajr كما تفعل الصفحة */
  X = dailyPage('dhuhr', 1); X.c.renderVals(); X.c._occApply.p(40);
  doc = X.stored();
  assert.deepEqual(doc[X.RK].d[0].zones[1].pc, { fajr: 35, dhuhr: { n: null, cap: 0, p: 40 } }, 'الصفحةُ تكتب {n: null, cap: 0, p} وتنقل count إلى fajr');
  assert.equal(doc[X.RK].d[0].zones[1].count, null);
  await roundTrip(B, KR, doc, 'percent-without-capacity');
  /* نسبةٌ في مصلى بسعة (العصر): تصير عدداً بالسعة */
  X = dailyPage('asr', 0); X.c.renderVals(); X.c._occApply.p(50);
  doc = X.stored();
  assert.deepEqual(doc[X.RK].d[0].zones[0].pc, { asr: { n: 150, cap: 300 } });
  await roundTrip(B, KR, doc, 'percent-with-capacity');
  /* مسحُ القراءة */
  X = dailyPage('fajr', 0); X.c.renderVals(); X.c._occApply.n(null);
  doc = X.stored();
  assert.deepEqual(doc[X.RK].d[0].zones[0].pc, { fajr: null });
  await roundTrip(B, KR, doc, 'reading-cleared');
  /* والأرشيفُ بالشكل نفسِه: يومٌ من شهرٍ منقضٍ يُحفظ في الجولات فينقله الخادمُ إلى أرشيفها (الأرشيفُ لا يكتبه العميل) */
  const past = copy(doc[X.RK]); past.d[0].zones[0].pc = { fajr: { n: 1086, cap: 3094 }, isha: { n: null, cap: 0, p: 12 } };
  const withPast = { ...copy(doc), '2018-06-01': past }, moved = await save(B, KR, withPast, 'TEST_ONLY_schemafix_archive');
  assert.equal(moved.status, 200, 'archive: ' + JSON.stringify(moved.json));
  assert.deepEqual(inspectOperationalFixture(B.env, 'bsdept:' + D1 + ':bassam_rounds_arc_v1')['2018-06-01'], past, 'الأرشيفُ يحمل القراءةَ بالسعة كما كُتبت');
  assert.equal(JSON.stringify(inspectOperationalFixture(B.env, 'bsdept:' + D1 + ':' + KR)), JSON.stringify(doc), 'والحيُّ بلا اليوم المنقضي');
  /* المخطّطُ مغلقٌ كما كان: حقلٌ غيرُ n · cap · p يُرفض */
  const bad = copy(doc); bad[X.RK].d[0].zones[0].pc = { fajr: { n: 1, cap: 2, nNow: 1 } };
  const no = await save(B, KR, bad, 'TEST_ONLY_schemafix_bad_reading');
  assert.equal(no.status, 400); assert.equal(no.json.err, 'operations-unknown-field-nNow');
});

test('② سحبُ المصلى في الجولات بطبقة الإدخال الحقيقية: لا تُكتب حقولُ العرض (nNow · capNow) ولا تُستبدل count المخزَّنة — والحفظُ 200', need, async () => {
  const B = await server(), X = dailyPage('dhuhr', 1), { W, c } = X;
  /* قراءةٌ على المصلى قبل السحب: نسخةُ العرض تحمل nNow/capNow */
  c.renderVals(); c._occApply.p(40);
  c.state = Object.assign({}, c.state, { rounds: X.stored(), dsSel: { t: 'zone', i: 1 } });
  const v = c.renderVals(), zone = v.mapZones[1];
  const svg = node(W, 'svg', W.body, null, { onPointerDown: v.dsDown, onPointerMove: v.dsMove, onPointerUp: v.dsUp, onPointerCancel: v.dsUp }, { 'data-ds-zoom': '1' });
  const el = node(W, 'path', svg, 'z1', { onPointerDown: zone.down }, { d: D1Z });
  el.rect = { left: 500, top: 100, width: 200, height: 200, right: 700, bottom: 300 };
  W.dispatch(el, 'pointerdown', tp(600, 200, 1, { pointerType: 'mouse' }));
  for (let k = 1; k <= 6; k++) { W.T.now += 40; W.dispatch(svg, 'pointermove', tp(600 + 10 * k, 200, 1, { pointerType: 'mouse' })); W.flushFrames(); }
  W.dispatch(svg, 'pointerup', tp(660, 200, 1, { pointerType: 'mouse' })); W.flushTimers();
  const doc = X.stored(), z = doc[X.RK].d[0].zones[1];
  assert.notEqual(z.d, D1Z, 'المصلى تحرّك');
  for (const f of ['nNow', 'capNow']) assert.equal(f in z, false, f + ' (نسخةُ العرض) لم يُكتب');
  assert.equal(z.count, null, 'count المخزَّنة كما هي (لا نسبةُ الصلاة المعروضة)');
  assert.deepEqual(z.pc, { fajr: 35, dhuhr: { n: null, cap: 0, p: 40 } }, 'القراءاتُ كما هي');
  await roundTrip(B, KR, doc, 'zone-drag');
});

test('③ «مسحُ السعة» في المخطط من الصفحة نفسِها: share · shareName يُزالان (لا null) — والحفظُ 200 ويعود كما كُتب', need, async () => {
  const B = await server(), W = canvas(), c = W.logic('plan', PLAN);
  const zone = (uid, n) => ({ uid, code: String(n), d: D0, cx: 250, cy: 200, area: 120, cap: 300, share: 0.5, shareName: 'TEST_ONLY', emp: [] });
  const site = { sid: 's_TEST_ONLY_1', name: 'TEST_ONLY', num: 1, mpu: 2, zones: [zone('TEST_ONLY_pz1', 1), zone('TEST_ONLY_pz2', 2)], gates: [], marks: [], paths: [], sectors: [] };
  const F = [site];
  W.store.set(KP, JSON.stringify({ pMig: 3, zones: site.zones, gates: [], marks: [], paths: [], floors: F, months: { '2026-10': { c: 1, d: F } }, cfg: {}, delMonths: {} }));
  const F1 = JSON.parse(JSON.stringify(F));
  c.state = Object.assign({}, c.state, { year: 2026, month: 10, floor: 0, floors: F1, zones: F1[0].zones.slice(), gates: [], marks: [], paths: [], planMonths: { '2026-10': { c: 1, d: F1 } }, sel: null, selMulti: [], tool: 'select', lens: 'plan', clearAsk: { kind: 'cap' } });
  c.renderVals().clearAskDo();
  await new Promise((go) => setTimeout(go, 0)); W.flushTimers();
  const doc = JSON.parse(W.store.get(KP)), zones = doc.months['2026-10'].d[0].zones;
  assert.equal(zones.length, 2);
  for (const z of zones) {
    assert.equal('share' in z, false, 'share لم يُكتب'); assert.equal('shareName' in z, false, 'shareName لم يُكتب');
    assert.equal(z.area, null); assert.equal(z.cap, null, 'السعةُ مُسحت كما كانت');
  }
  await roundTrip(B, KP, doc, 'plan-clear-capacity');
  /* المخطّطُ لا يعرف share: ما كانت الصفحةُ تكتبه يُرفض — فالصفحةُ لا تكتبه */
  const old = copy(doc); old.months['2026-10'].d[0].zones[0].share = null;
  const no = await save(B, KP, old, 'TEST_ONLY_schemafix_share_null');
  assert.equal(no.status, 400); assert.equal(no.json.err, 'operations-unknown-field-share');
});

test('④ سطرُ التقرير اليومي في سجلّ التسكين (rm · src كما تبنيه صفحةُ التقرير) يُحفظ ويعود كما كُتب', need, async () => {
  const B = await server(), X = dailyPage('fajr', 0), doc = X.stored();
  doc[X.RK].mvLog = [
    { t: '07:00', kind: 'gates', key: 'TEST_ONLY_e1', tok: 'TEST_ONLY_e1', fromI: -1, toI: 0, rm: false, fromLbl: '', toLbl: 'TEST_ONLY', by: 'TEST_ONLY', name: 'TEST_ONLY', src: 'dr' },
    { t: '07:05', kind: 'gates', key: 'TEST_ONLY_e1', tok: 'TEST_ONLY_e1', fromI: -1, toI: -1, rm: true, fromLbl: 'كل المواقع', toLbl: '', by: 'TEST_ONLY', name: 'TEST_ONLY', src: 'dr' },
  ];
  await roundTrip(B, KR, doc, 'daily-report-move-line');
});
