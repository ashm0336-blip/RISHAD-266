/* V7 · 53 (ملحق 6 · البند 6): التحديدُ المتعدد للمصليات في المتابعة اليومية وتغييرُ حالتها دفعةً واحدة بنافذة تأكيد —
   نقلُ سلوك البرودكشن (e5b8756 · 25c05b6 · 2c4c81d · 27b7c70)، لا كودِه: بالحفظ الذرّي (saveRounds ← _opCommit) وحرّاس الأقفال في هذه المنصة.
   منطقُ «المتابعة اليومية» الحقيقيّ (node:vm · canvas_world) فوق نسخةٍ بشكل Production (oldFile({small:true}): مواقعُ بـsid ومصلياتٌ بـuid بلا eid،
   وأيامٌ تاريخية: يومٌ معتمد ويومٌ مفتوحٌ بعناصر بلا معرّفات) · بياناتٌ TEST_ONLY. DAILY_LOGIC=<مسار> يبدّل ملفَّ المنطق (لإثبات الإخفاق على السابق).
   اختبارُ الخادم الحقيقي (الإنفاذ · القفل · الذرّية) في tests/browser/v7_d53_port_multisel.test.mjs. */
import './clock.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { world } from './canvas_world.mjs';
import { operations } from './operational_ui_fx.mjs';
import { oldFile } from './v7_d6_import_fx.mjs';

const DAILY = process.env.DAILY_LOGIC ? fs.readFileSync(process.env.DAILY_LOGIC, 'utf8') : undefined;
const clone = (v) => JSON.parse(JSON.stringify(v));
const DAY = '2026-10-20', OLD_AP = '2026-09-14', OLD_OPEN = '2026-09-16';   /* اليومُ الجاري (clock.mjs) · يومان تاريخيان — مفاتيحُ الصفحة الميلادية (BassamCal.gKey: YYYY-MM-DD) */
const flush = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setImmediate(r)); };

let BASE = null;
async function shaped() {
  if (!BASE) { const f = await oldFile({ small: true }); BASE = { plan: JSON.parse(f.data.bassam_plan_v1), rounds: JSON.parse(f.data.bassam_rounds_v1) }; }
  const plan = clone(BASE.plan), src = clone(BASE.rounds), k0 = Object.keys(src).find((k) => /^\d+-\d+-\d+$/.test(k) && src[k].d), live = src[k0];
  live.d.forEach((f) => {
    while (f.zones.length < 3) f.zones.push({ ...clone(f.zones[0]), uid: f.zones[0].uid + '_TEST_ONLY_' + f.zones.length, code: f.zones[0].code + 'x' + f.zones.length });
    f.zones = f.zones.slice(0, 3).map((z, i) => { const x = { ...z }; if (i === 1) x.off = true; else delete x.off; return x; }); delete f.ap;
  });
  /* التاريخ كما في Production: عناصرُ بلا uid ولا eid — لا يجوز أن يُختم أو يُعاد كتابته */
  const legacy = clone(live.d).map((f) => ({ ...f, zones: f.zones.map((z) => { const x = { ...z }; delete x.uid; delete x.eid; return x; }) }));
  const rounds = { __pMig: 2, 'm:2026-09': { ap: 0 }, 'm:2026-10': { ap: 0 }, [OLD_AP]: { t: 1, ap: 1, d: clone(legacy) }, [OLD_OPEN]: { t: 1, ap: 0, d: clone(legacy) }, [DAY]: { ...live, ap: 0 } };
  return { plan, rounds };
}
function page(D) {
  const W = world(), c = W.logic('daily', DAILY), toasts = [], asks = [];
  const op = operations({ bassam_plan_v1: D.plan, bassam_rounds_v1: D.rounds, bassam_zone_opts_v1: {} });
  W.KIVO.__BS_SRV = { ...(W.KIVO.__BS_SRV || {}), operations: op.service, rev: () => 0 };
  let answer = true; W.KIVO.bsConfirm = (o) => { asks.push(o); return Promise.resolve(answer); };
  c.bsToast = (m, k) => toasts.push([String(m), k || '']);
  c.state = { ...c.state, year: 2026, month: 10, day: 20, floor: 0, rounds: D.rounds, lens: 'zones', panelTab: 'zones', tool: 'select', dsTab: 'rounds', dsAsn: false, dview: { x: 0, y: 0, w: 1000, h: 600 }, dsSel: null, selMulti: [] };
  const ev = () => ({ ctrlKey: false, metaKey: false, stopPropagation() {}, preventDefault() {}, pointerType: 'touch', clientX: 10, clientY: 10, pointerId: 1, isPrimary: true, button: 0 });
  const tap = (i) => { const z = c.renderVals().mapZones[i]; z.down(ev()); z.click(ev()); };
  return { W, c, op, toasts, asks, tap, say: (v) => (answer = v) };
}
const noEid = (z) => { const x = { ...z }; delete x.eid; return JSON.stringify(x); };
const sent = (op) => JSON.parse(op.control.stages[op.control.stages.length - 1].body).bassam_rounds_v1;

test('ملحق 6 · 6 — أداةُ «تحديد متعدد»: لمسةٌ لكل مصلى تضيفه أو تُخرجه بلا Ctrl ولا سحب ولا محرّر', async () => {
  const P = page(await shaped()), { c } = P;
  const v = c.renderVals();
  assert.equal(v.dsMultiToolOn, true, 'الأداةُ في شريط أدوات المصليات لمن يحرّر الجولة');
  v.dsMultiToggle();
  assert.equal(c.state.dsMulti, true); assert.equal(c.renderVals().dsMultiPressed, 'true');
  P.tap(0); P.tap(2);
  assert.equal(JSON.stringify(c.state.selMulti), '[0,2]', 'لمستان بلا Ctrl ⇒ مصلّيان محدَّدان');
  assert.equal(c.state.zdrag == null, true, 'لا سحب');
  P.tap(0);
  assert.equal(JSON.stringify(c.state.selMulti), '[2]', 'لمسُ المحدَّد ثانيةً يُخرجه');
  P.tap(1);
  const r = c.renderVals();
  assert.equal(r.bulkOn, true, 'شريطُ الأفعال الجماعية ظاهر');
  r.dsDbl(); assert.ok(!c.state.zEdit, 'النقرةُ المزدوجة لا تفتح المحرّر في التحديد المتعدد');
  /* أداةٌ أخرى تُنهي التحديد المتعدد */
  r.dsToolSelect(); assert.equal(c.state.dsMulti, false);
  assert.equal(P.op.control.stages.length, 0, 'التحديدُ لا يكتب شيئاً');
});

test('ملحق 6 · 6 — «تفعيل المحدَّد»: نافذةُ تأكيد، ثم طلبٌ ذرّيٌّ واحد يغيّر المتوقفَ المحدَّد وحده، والأيامُ التاريخية حرفاً كما هي', async () => {
  const D = await shaped(), P = page(D), { c, op } = P, before = clone(D.rounds);
  c.renderVals().dsMultiToggle(); P.tap(0); P.tap(1);   /* 0 مفعّل · 1 متوقف */
  /* الإلغاءُ لا يكتب */
  P.say(false); await c.renderVals().bulkOn2(); await flush();
  assert.equal(P.asks.length, 1, 'نافذةُ التأكيد');
  assert.match(P.asks[0].msg, /مصلَّيان|مصليان|مصلى/); assert.match(P.asks[0].msg, /أصلًا ولن تتغيّر/, 'المجموعةُ المختلطة معلنة: ' + P.asks[0].msg);
  assert.equal(op.control.stages.length, 0, 'إلغاءُ التأكيد لا يكتب شيئاً');
  /* التأكيد */
  P.say(true); c.renderVals().bulkOn2(); await flush();
  assert.equal(op.control.stages.length, 1, 'طلبٌ واحد للمجموعة: ' + JSON.stringify(P.toasts));
  const out = sent(op), z = out[DAY].d[0].zones, z0 = before[DAY].d[0].zones;
  assert.equal(!!z[1].off, false, 'المتوقفُ المحدَّد فُعِّل');
  assert.ok(Array.isArray(z[1].fLog) && z[1].fLog.length && z[1].fAt, 'بختم الميدان (من ومتى) كالتبديل المفرد');
  assert.equal(noEid(z[0]), noEid(z0[0]), 'المفعّلُ أصلاً كما هو (سوى ختم الهوية eid الذي يضعه كلُّ حفظٍ لليوم الحيّ)');
  assert.equal(noEid(z[2]), noEid(z0[2]), 'غيرُ المحدَّد كما هو');
  for (const k of [OLD_AP, OLD_OPEN]) assert.ok(!(k in out) || JSON.stringify(out[k]) === JSON.stringify(before[k]), 'اليومُ التاريخي لا يُختم ولا يتغيّر: ' + k);
  assert.ok(!/"eid"/.test(JSON.stringify([out[OLD_AP], out[OLD_OPEN]])), 'لا معرّفاتٍ مختومة في التاريخ');
  assert.equal(JSON.stringify(op.data.bassam_rounds_v1[OLD_AP]), JSON.stringify(before[OLD_AP]));
  assert.equal(JSON.stringify(c.state.selMulti), '[]', 'التحديدُ يُمسح بعد الإقرار');
  assert.ok(P.toasts.some(([m, k]) => /تم تفعيل مصلى واحد/.test(m) && k === 'ok'), JSON.stringify(P.toasts));
});

test('ملحق 6 · 6 — القفلُ والسياق: يومٌ مقفل لا يُسأل عنه ولا يُكتب · تغيّرُ الموقع بين التحديد والتأكيد يُلغي · رفضُ الخادم لا يكتب شيئاً', async () => {
  /* شهرٌ معتمد */
  {
    const D = await shaped(); D.rounds['m:2026-10'] = { ap: 1 };
    const P = page(D), { c } = P;
    c.setState({ dsMulti: true, dsSel: { t: 'zone', i: 0 }, selMulti: [0, 1] });
    assert.equal(c.renderVals().dsMultiToolOn, false, 'الأداةُ لا تظهر في جولةٍ مقفلة');
    await c._dsBulkStatus(true); await flush();
    assert.equal(P.asks.length, 0, 'لا تأكيدَ لما لا يُكتب'); assert.equal(P.op.control.stages.length, 0);
    assert.ok(P.toasts.some(([m]) => /معتمد ومقفل/.test(m)), JSON.stringify(P.toasts));
  }
  /* الموقعُ تغيّر بعد فتح نافذة التأكيد */
  {
    const P = page(await shaped()), { c } = P;
    c.renderVals().dsMultiToggle(); P.tap(0); P.tap(1);
    P.W.KIVO.bsConfirm = (o) => { P.asks.push(o); c.state = { ...c.state, floor: 1 }; return Promise.resolve(true); };
    await c._dsBulkStatus(true); await flush();
    assert.equal(P.op.control.stages.length, 0, 'لا كتابة بعد تغيّر السياق');
    assert.ok(P.toasts.some(([m]) => /تغيّر سياق الجولة/.test(m)), JSON.stringify(P.toasts));
  }
  /* رفضُ الخادم (تعارض): لا شيءَ مكتوب ولا رسالةُ نجاح */
  {
    const D = await shaped(), P = page(D), { c, op } = P, before = JSON.stringify(D.rounds);
    op.control.mode = 'conflict';
    c.renderVals().dsMultiToggle(); P.tap(0); P.tap(2);
    assert.equal(await c._dsBulkStatus(true), false);
    assert.equal(JSON.stringify(op.data.bassam_rounds_v1), before, 'المجموعةُ لم يُكتب منها شيء');
    assert.ok(!P.toasts.some(([, k]) => k === 'ok'), JSON.stringify(P.toasts));
  }
});
