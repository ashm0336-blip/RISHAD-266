import { attachTaskOperations } from './tasks_vm_operations_fx.mjs';
/* KIVO_265 · طلبُ المالك 2026-10-20 («قوائم منسدلة احترافية»): منتقي الوقت في نافذة «مهمة جديدة» قائمةٌ منسدلة — منطقُ الصفحة في vm بلا خادم:
     · حقلٌ لكل وقت يفتح أوقاتَ اليوم كلَّ ربع ساعة (96) والمختارُ معلَّم · وقتٌ خارج الشبكة (8:10) يُدرج في موضعه
     · قائمةُ النهاية تُظهر مدةَ كلِّ خيار من البداية و«قبل البداية» لما سبقها
     · تغييرُ البداية يُبقي المدة (تتحرّك النهاية معها · وتعبر منتصفَ الليل إلى اليوم التالي) ولا تخرج النهايةُ عن الشهر
     · الوقتُ المكتوب: 8:10 م · 20:10 · ٨:١٠ص · 12:30 (الظهر) — وغيرُ المفهوم ينبّه ولا يغيّر · Esc يغلق · النقرُ خارجها يغلقها (bsMenusPatch)
     · قائمةُ الأيام تحمل اسمَ اليوم
     · مراجعة: الوقتُ المكتوب كلماتٌ (مساءً · صباحاً · ظهراً · p.m.) وأيُّ كلمةٍ أخرى أو علامتان متعارضتان ⇒ تنبيه · المدةُ بالساعة الفعلية
       (التوقيت الصيفي) · البؤرةُ تعود إلى الزرّ · الأسهم وHome/End بين الخيارات (tabindex متنقّل) · خروجُ البؤرة أو تمريرُ الزرّ خارج النافذة يغلقها */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const LOGIC = moduleLogic('tasks');
async function page() {
  const store = new Map([['bassam_tasks_v1', '{}'], ['bassam_employees_v1', '[]']]);
  const KIVO = {}, toasts = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 0 }, fetch: () => Promise.reject(new Error('offline')) };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: 'tst_d1', name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }), users: () => [] };
  KIVO.BassamDepts = { active: () => 'tst_d1' }; KIVO.BassamSup = { isSup: () => false };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast(m, k) { toasts.push([m, k]); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const opsFixture = await attachTaskOperations(ctx, { store });
  const c = new ctx.__C(); c.state = Object.assign({}, c.state || {}, { locked: {} });
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  return { c, opsFixture, toasts, ctx, V: () => c.renderVals() };
}
const open = (P, o) => P.c.setState(Object.assign({ year: 1448, month: 5, newTaskOpen: true, editRef: null, newDay: 9, newEDay: 9, newSh: 8, newSm: 0, newSap: 'ص', newEh: 10, newEm: 0, newEap: 'ص', tkTp: null, tkTpQ: '' }, o || {}));
const st = (P) => { const s = P.c.state; return [s.newDay, s.newSh, s.newSm, s.newSap, s.newEDay, s.newEh, s.newEm, s.newEap].join(' '); };

test('الحقلُ والقائمة: مغلقةٌ بلا خيارات · مفتوحةٌ بـ96 وقتاً كلَّ ربع ساعة والمختارُ معلَّم · فتحُ الأخرى يغلقها · النقرُ خارجها يغلقها', async () => {
  const P = await page(); open(P);
  let V = P.V(); assert.equal(V.tkTpSV, '08:00'); assert.equal(V.tkTpSAp, 'ص'); assert.equal(V.tkTpEV, '10:00'); assert.equal(V.tkTpSOpen, false); assert.equal(V.tkTpSOpts.length, 0, 'لا تُبنى القائمة وهي مغلقة');
  V.tkTpSToggle(); V = P.V();
  assert.equal(V.tkTpSOpen, true); assert.equal(V.tkTpSOpenA, 'true'); assert.equal(V.tkTpSOpts.length, 96);
  assert.deepEqual(Array.from(V.tkTpSOpts.filter((o) => o.sel === 'true').map((o) => o.t)), ['08:00 ص']);
  assert.equal(V.tkTpSOpts[0].t, '12:00 ص'); assert.equal(V.tkTpSOpts[48].t, '12:00 م'); assert.equal(V.tkTpSOpts[95].t, '11:45 م');
  V.tkTpEToggle(); V = P.V(); assert.equal(V.tkTpSOpen, false); assert.equal(V.tkTpEOpen, true, 'قائمةٌ واحدة مفتوحة');
  assert.equal(P.c.bsMenusPatch().tkTp, null, 'النقرُ خارجها يغلقها كسائر القوائم');
  V.tkTpEToggle(); assert.equal(P.c.state.tkTp, null, 'النقرُ على الحقل نفسه يغلقها');
});

test('النهاية: مدةُ كلِّ خيارٍ من البداية · «قبل البداية» لما سبقها · والاختيارُ يحفظ ويغلق', async () => {
  const P = await page(); open(P);
  P.V().tkTpEToggle(); let V = P.V();
  const by = (t) => V.tkTpEOpts.find((o) => o.t === t);
  assert.equal(by('10:00 ص').sub, '2 س'); assert.equal(by('08:15 ص').sub, '15 د'); assert.equal(by('11:30 ص').sub, '3 س 30 د');
  assert.equal(by('08:00 ص').sub, 'قبل البداية'); assert.equal(by('07:00 ص').sub, 'قبل البداية'); assert.match(by('07:00 ص').style, /text-faint/);
  assert.equal(V.tkTpSOpts.length, 0); by('05:00 م').click();
  assert.equal(st(P), '9 8 0 ص 9 5 0 م'); assert.equal(P.c.state.tkTp, null); assert.equal(P.V().tkDurTxt, '9 س');
});

test('تغييرُ البداية يُبقي المدة — وتعبر النهايةُ منتصفَ الليل إلى اليوم التالي — ولا تخرج عن الشهر', async () => {
  const P = await page(); open(P);
  P.V().tkTpSToggle(); P.V().tkTpSOpts.find((o) => o.t === '02:00 م').click();
  assert.equal(st(P), '9 2 0 م 9 4 0 م', 'المدةُ ساعتان كما كانت');
  P.V().tkTpSToggle(); P.V().tkTpSOpts.find((o) => o.t === '11:00 م').click();
  assert.equal(st(P), '9 11 0 م 10 1 0 ص', 'النهايةُ في اليوم التالي'); assert.equal(P.V().tkDurTxt, '2 س');
  const P2 = await page(); open(P2); const last = P2.c.hMonthDays(1448, 5);
  open(P2, { newDay: last, newEDay: last, newSh: 8, newSap: 'م', newEh: 10, newEap: 'م' });
  P2.V().tkTpSToggle(); P2.V().tkTpSOpts.find((o) => o.t === '11:30 م').click();
  assert.equal(st(P2), [last, 11, 30, 'م', last, 10, 0, 'م'].join(' '), 'آخرُ يومٍ في الشهر: البدايةُ تتغيّر والنهايةُ لا تخرج عن الشهر');
  const P3 = await page(); open(P3, { newEh: 8, newEm: 0, newEap: 'ص' });   /* مدةٌ صفرية: لا تحريك */
  P3.V().tkTpSToggle(); P3.V().tkTpSOpts.find((o) => o.t === '09:00 ص').click(); assert.equal(st(P3), '9 9 0 ص 9 8 0 ص');
});

test('الوقتُ المكتوب: 8:10 م · 20:10 · ٨:١٠ص · 12:30 = الظهر · وغيرُ المفهوم ينبّه ولا يغيّر · Enter يطبّق · Esc يغلق · والوقتُ الحرّ يظهر في القائمة', async () => {
  const P = await page(); open(P);
  const type = (w, q) => { P.c.setState({ tkTp: w, tkTpQ: q }); P.V().tkTpApply(); };
  type('e', '8:10 م'); assert.equal(st(P), '9 8 0 ص 9 8 10 م');
  type('e', '20:40'); assert.equal(st(P), '9 8 0 ص 9 8 40 م');
  type('s', '٨:١٠ص'); assert.equal(st(P).split(' ').slice(0, 4).join(' '), '9 8 10 ص');
  type('e', '12:30'); assert.equal(st(P).split(' ').slice(4).join(' '), '9 12 30 م', '«12:30» بلا ص/م = الظهر');
  const before = st(P); type('e', 'abc'); assert.equal(st(P), before, 'لا تغيير'); assert.match(P.toasts.at(-1)[0], /اكتب الوقت/); assert.equal(P.c.state.tkTp, 'e', 'تبقى مفتوحةً للتصحيح');
  P.c.setState({ tkTp: 's', tkTpQ: '7' }); let prevented = false; P.V().onTkTpKey({ key: 'Enter', preventDefault: () => { prevented = true; } });
  assert.ok(prevented); assert.equal(st(P).split(' ').slice(0, 4).join(' '), '9 7 0 ص'); assert.equal(P.c.state.tkTp, null);
  P.c.setState({ tkTp: 's' }); P.V().onTkTpKey({ key: 'Escape', stopPropagation() {} }); assert.equal(P.c.state.tkTp, null, 'Esc يغلق');
  P.c.setState({ newSh: 8, newSm: 10, newSap: 'ص' }); P.V().tkTpSToggle(); const V = P.V();
  assert.equal(V.tkTpSOpts.length, 97, 'الوقتُ الحرّ يُدرج'); assert.deepEqual(Array.from(V.tkTpSOpts.filter((o) => o.sel === 'true').map((o) => o.t)), ['08:10 ص']);
  assert.equal(V.tkTpSOpts.findIndex((o) => o.t === '08:10 ص'), 33, 'في موضعه بين 08:00 و08:15');
});

test('النهايةُ قبل البداية تُعلَّم في الحقل · وقائمةُ الأيام تحمل اسمَ اليوم', async () => {
  const P = await page(); open(P, { newEh: 7, newEap: 'ص' });
  const V = P.V(); assert.match(V.tkTpEBtn, /danger-border/); assert.doesNotMatch(V.tkTpSBtn, /danger-border/); assert.equal(V.tkDurTxt, 'النهاية قبل البداية');
  const WD = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const g = P.c.hGreg(1448, 5, 9), lbl = V.tkStartDays.find((d) => d.v === '9').label;
  assert.ok(lbl.startsWith(WD[g.getDay()] + ' 9 '), lbl); assert.match(lbl, /١٤٤٨|1448/);
  const L = V.tkStartDays.map((d) => WD.indexOf(d.label.split(' ')[0])); assert.ok(L.every((w, i) => i === 0 || w === (L[i - 1] + 1) % 7), 'أيامٌ متتالية');
});

test('Escape وقائمةُ الوقت مفتوحة: يُلتقط على window قبل الغلاف فيغلقها وحدها (لا النافذةَ كلَّها) · ومغلقةً لا يمسّه', async () => {
  const P = await page();
  const src = fs.readFileSync(path.join(ROOT, 'src/modules/tasks/logic.js'), 'utf8');
  assert.match(src, /window\.addEventListener\("keydown", this\._tkTpEsc, !0\)/, 'على window · capture');
  assert.match(src, /window\.removeEventListener\("keydown", this\._tkTpEsc, !0\)/, 'ويُزال عند الخروج');
  open(P, { tkTp: 's', tkTpQ: 'x' });
  let prevented = 0; const ev = (k) => ({ key: k, isComposing: false, preventDefault: () => { prevented++; } });
  P.c.componentDidMount.call(Object.assign(P.c, { _tkSrv: () => false }));
  P.c._tkTpEsc(ev('Escape')); assert.equal(P.c.state.tkTp, null); assert.equal(P.c.state.tkTpQ, ''); assert.equal(prevented, 1, 'preventDefault ⇒ الغلافُ لا يُغلق الحوار');
  P.c._tkTpEsc(ev('Escape')); assert.equal(prevented, 1, 'والقائمةُ مغلقة: لا يمسّ Escape (يمضي إلى الغلاف فيُغلق الحوار كما كان)');
  P.c.setState({ tkTp: 'e' }); P.c._tkTpEsc(ev('Enter')); assert.equal(P.c.state.tkTp, 'e', 'غيرُ Escape لا يغلق');
});

test('الوقتُ المكتوب كلمات: مساءً · صباحاً · ظهراً · عصراً · p.m. · «الساعة» — وكلمةٌ أخرى أو علامتان متعارضتان أو 20:10 ص ⇒ null', async () => {
  const P = await page(), p = (q, ap0) => P.c._tkParseTime(q, ap0 || 'ص');
  const hm = (v) => (v == null ? null : Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0'));
  const ok = { '8 مساءً': '20:00', '8:10 صباحاً': '8:10', '٣ عصراً': '15:00', '12 ظهراً': '12:00', '8:10 pm': '20:10', '8.10 p.m.': '20:10', '8:10م': '20:10',
    '8 10 م': '20:10', 'الساعة 9 م': '21:00', '7 المغرب': '19:00', '9 العشاء': '21:00', '5 فجراً': '5:00', '12 ص': '0:00', '0:30': '0:30', '20:10': '20:10', '2010': '20:10', '830': '8:30', '8:10 مـساءً': '20:10' };
  for (const [q, v] of Object.entries(ok)) assert.equal(hm(p(q)), v, q);
  assert.equal(hm(p('8', 'م')), '20:00', 'بلا علامة: فترةُ الحقل الحالية');
  for (const q of ['abc', '8 ص مساءً', '20:10 ص', '0:30 م', '8 و 10', 'غداً 8', 'مساءً', '1 2 3', '8:10 x', '25:00', '8:75', '', '8::10'])
    assert.equal(p(q), null, JSON.stringify(q));
  /* أوقاتُ الصلاة بنافذة ساعات: «11 الظهر» قبيلَ الظهر لا 11 ليلاً · وخارجَ النافذة ⇒ null */
  const win = { '11 ظهراً': '11:00', '10 الظهر': '10:00', '1 الظهر': '13:00', '13 الظهر': '13:00', '4 العصر': '16:00', '6 المغرب': '18:00', '11 العشاء': '23:00',
    '20:00 العشاء': '20:00', '12 الفجر': '0:00', '4:30 فجراً': '4:30' };
  for (const [q, v] of Object.entries(win)) assert.equal(hm(p(q)), v, q);
  for (const q of ['8 ظهراً', '0 الظهر', '7 العصر', '10 المغرب', '2 العشاء', '9 الفجر', '11 ظهراً مساءً', '15 الفجر'])
    assert.equal(p(q), null, JSON.stringify(q));
  const before = (open(P), st(P)); P.c.setState({ tkTp: 's', tkTpQ: '8 ص مساءً' }); P.V().tkTpApply();
  assert.equal(st(P), before, 'لا تغيير'); assert.match(P.toasts.at(-1)[0], /اكتب الوقت/);
});

test('التوقيت الصيفي: المدةُ بالساعة الفعلية (ms) — خياراتُ النهاية وتحريكُ النهاية مع البداية في جهازٍ خارج المملكة', async () => {
  if (!process.env.TK_TP_DST) {
    const env = Object.assign({}, process.env, { TZ: 'America/New_York', TK_TP_DST: '1' });
    delete env.NODE_TEST_CONTEXT;                                              /* عمليةٌ مستقلة تكتب TAP لا رسائلَ المشغّل الأب */
    const out = execFileSync(process.execPath, ['--no-warnings', '--test', '--test-reporter=tap', '--test-name-pattern=التوقيت الصيفي', fileURLToPath(import.meta.url)], { env, encoding: 'utf8' });
    assert.match(out, /# pass 1/); assert.match(out, /# fail 0/);
    return;
  }
  /* 2027-03-14 = 6 شوال 1448: في نيويورك تقفز الساعة من 2:00 إلى 3:00 ص ⇒ من 1:00 إلى 4:00 ص ساعتان فعليتان لا ثلاث */
  const P = await page(); open(P, { year: 1448, month: 10, newDay: 6, newEDay: 6, newSh: 1, newSm: 0, newSap: 'ص', newEh: 4, newEm: 0, newEap: 'ص' });
  const g = P.c.hGreg(1448, 10, 6); assert.equal([g.getFullYear(), g.getMonth() + 1, g.getDate()].join('-'), '2027-3-14');
  assert.equal(P.V().tkDurTxt, '2 س');
  P.V().tkTpEToggle(); assert.equal(P.V().tkTpEOpts.find((o) => o.t === '04:00 ص').sub, '2 س', 'مدةُ الخيار كما يحسبها الخادم');
  P.c.setState({ tkTp: null }); P.V().tkTpSToggle(); P.V().tkTpSOpts.find((o) => o.t === '05:00 ص').click();
  assert.equal(st(P), '6 5 0 ص 6 7 0 ص', 'تبقى المدةُ ساعتين فعليتين'); assert.equal(P.V().tkDurTxt, '2 س');
  /* 2026-11-01 = 21 جمادى الأولى 1448: تتكرّر 1:00–1:59 ص — وقتُها الثاني يُختم كأوّلها فتُقدَّم النهايةُ إلى أقرب وقتٍ يُختم كما هو (لا تسبق البداية ولا تقصر المدة) */
  const Q = await page(); open(Q, { year: 1448, month: 5, newDay: 21, newEDay: 21, newSh: 12, newSm: 30, newSap: 'ص', newEh: 1, newEm: 30, newEap: 'ص' });
  const g2 = Q.c.hGreg(1448, 5, 21); assert.equal([g2.getFullYear(), g2.getMonth() + 1, g2.getDate()].join('-'), '2026-11-1');
  assert.equal(Q.V().tkDurTxt, '1 س');
  Q.V().tkTpSToggle(); Q.V().tkTpSOpts.find((o) => o.t === '01:00 ص').click();
  assert.equal(st(Q), '21 1 0 ص 21 2 0 ص', 'لا «النهاية قبل البداية»'); assert.equal(Q.V().tkDurTxt, '2 س');
  open(Q, { year: 1448, month: 5, newDay: 21, newEDay: 21, newSh: 12, newSm: 0, newSap: 'ص', newEh: 1, newEm: 30, newEap: 'ص' });
  Q.V().tkTpSToggle(); Q.V().tkTpSOpts.find((o) => o.t === '12:30 ص').click();
  assert.equal(st(Q), '21 12 30 ص 21 2 0 ص', 'لا تقصر المدةُ بصمت');
  /* مسحٌ شامل ليومي التحويل: كلُّ بدايةٍ ونهايةٍ ونقلٍ للبداية بين 00:00 و04:00 ⇒ النهايةُ بعد البداية دائماً */
  for (const [M, D] of [[5, 21], [10, 6]]) {
    let bad = 0;
    for (let s0 = 0; s0 <= 240; s0 += 15) for (let e0 = s0 + 15; e0 <= s0 + 180; e0 += 15) for (let s1 = 0; s1 <= 240; s1 += 15) {
      const a = Q.c._tkHMA(s0), b = Q.c._tkHMA(e0);
      open(Q, { year: 1448, month: M, newDay: D, newEDay: D, newSh: a.h, newSm: a.m, newSap: a.ap, newEh: b.h, newEm: b.m, newEap: b.ap });
      const r0 = Q.c.tkStamp(1448, M, D, a.h, a.m, a.ap), o0 = Q.c.tkStamp(1448, M, D, b.h, b.m, b.ap);
      if (!(o0 > r0)) continue;
      Q.c._tkSetT('s', s1, { y: 1448, m: M, sd: D, days: Q.c.hMonthDays(1448, M), dur: Math.round((o0 - r0) / 6e4) });
      const S = Q.c.state, r1 = Q.c.tkStamp(1448, M, S.newDay, S.newSh, S.newSm, S.newSap), o1 = Q.c.tkStamp(1448, M, S.newEDay, S.newEh, S.newEm, S.newEap);
      if (!(o1 > r1) || o1 - r1 < o0 - r0) bad++;
    }
    assert.equal(bad, 0, '1448-' + M + '-' + D);
  }
});

function dom(P) {
  const body = { tag: 'body' }, D = { body, activeElement: body, hidden: false, addEventListener() {}, removeEventListener() {} };
  const el = (a) => ({ a: Object.assign({}, a), getAttribute(k) { return k in this.a ? this.a[k] : null; }, setAttribute(k, v) { this.a[k] = String(v); },
    focus() { D.activeElement = this; }, offsetTop: 0, offsetHeight: 38, style: { p: {}, setProperty(k, v) { this.p[k] = v; } } });
  const opts = Array.from({ length: 5 }, (_, i) => Object.assign(el({ role: 'option', 'aria-selected': i === 2 ? 'true' : 'false', tabindex: i === 2 ? '0' : '-1' }), { offsetTop: i * 40 }));
  const L = Object.assign(el({}), { scrollTop: 0, clientHeight: 80, querySelectorAll: () => opts, querySelector: () => opts.find((o) => o.a['aria-selected'] === 'true') });
  const pop = el({}), trig = Object.assign(el({}), { rect: { width: 300.4, top: 100, bottom: 146, height: 46 }, getBoundingClientRect() { return this.rect; } }), other = el({});
  L.parentElement = pop;
  const root = { contains: (x) => x === trig || x === L || opts.includes(x) };
  D.querySelector = (q) => (/data-tp-list/.test(q) ? L : /data-tp-trig/.test(q) ? trig : /data-tp-root/.test(q) ? root : null);
  P.ctx.document = D;
  return { D, L, pop, trig, opts, other, body };
}

test('البؤرةُ ولوحةُ المفاتيح: الفتحُ يضبط العرضَ ويُبئّر المختار ويمرّر إليه قبل الرسم · الأسهم وHome/End بـtabindex متنقّل · الاختيار وEscape يعيدانها إلى الزرّ', async () => {
  const P = await page(); open(P); const X = dom(P);
  let V = P.V(); assert.doesNotMatch(V.tkTpSBtn, /z-index/);
  V.tkTpSToggle(); V = P.V();
  assert.equal(X.pop.style.p.width, '300px', 'عرضُ القائمة = عرضُ الحقل'); assert.equal(X.D.activeElement, X.opts[2], 'البؤرةُ على المختار');
  assert.equal(X.L.scrollTop, 59, 'المختارُ في وسط القائمة'); assert.match(V.tkTpSBtn, /position:relative;z-index:61/, 'الزرُّ فوق قائمته إن قُلبت فوقه');
  assert.deepEqual(Array.from(V.tkTpSOpts.map((o) => o.ti)).filter((t) => t === '0').length, 1); assert.equal(V.tkTpSOpts.find((o) => o.sel === 'true').ti, '0');
  const key = (k) => { let pd = 0; V.tkTpSListKey({ key: k, preventDefault: () => pd++ }); return pd; };
  assert.equal(key('ArrowDown'), 1); assert.equal(X.D.activeElement, X.opts[3]); assert.equal(X.opts[3].a.tabindex, '0'); assert.equal(X.opts[2].a.tabindex, '-1');
  assert.equal(X.L.scrollTop, 78, 'يُمرَّر الخيارُ إلى المنطقة المرئية');
  key('End'); assert.equal(X.D.activeElement, X.opts[4]); key('ArrowDown'); assert.equal(X.D.activeElement, X.opts[4], 'لا يتجاوز الأخير');
  key('Home'); assert.equal(X.D.activeElement, X.opts[0]); assert.equal(X.L.scrollTop, 0); key('ArrowUp'); assert.equal(X.D.activeElement, X.opts[0]);
  assert.equal(key('a'), 0, 'غيرُها لا يُمنع');
  X.D.activeElement = X.body; V.tkTpSOpts.find((o) => o.t === '09:00 ص').click();
  assert.equal(P.c.state.tkTp, null); assert.equal(X.D.activeElement, X.trig, 'الاختيارُ يعيد البؤرةَ إلى الزرّ');
  P.c.setState({ tkTp: 's', tkTpQ: '' }); P.V().onTkTpKey({ key: 'ArrowDown', preventDefault() {} }); assert.equal(X.D.activeElement, X.opts[2], 'السهمُ من خانة الكتابة إلى المختار');
  P.c.componentDidMount.call(Object.assign(P.c, { _tkSrv: () => false }));
  X.D.activeElement = X.body; P.c._tkTpEsc({ key: 'Escape', isComposing: false, preventDefault() {} });
  assert.equal(P.c.state.tkTp, null); assert.equal(X.D.activeElement, X.trig, 'Escape يعيدها إلى الزرّ');
  P.c.setState({ tkTp: 's' }); X.D.activeElement = X.other; P.c._tkTpClose('s'); assert.equal(X.D.activeElement, X.other, 'لا تُنتزع البؤرةُ من عنصرٍ آخر');
});

test('خروجُ البؤرة إلى عنصرٍ آخر يغلقها (لا إلى body ولا داخلها) · وتمريرُ النافذة حتى يختفي نصفُ الزرّ يغلقها', async () => {
  const P = await page(); open(P); const X = dom(P), wait = () => new Promise((r) => setTimeout(r, 5));
  P.c.setState({ tkTp: 's' });
  X.D.activeElement = X.opts[1]; P.V().tkTpSBlur(); await wait(); assert.equal(P.c.state.tkTp, 's', 'داخلها: تبقى');
  X.D.activeElement = X.body; P.V().tkTpSBlur(); await wait(); assert.equal(P.c.state.tkTp, 's', 'body (نقرُ Safari): تبقى');
  P.c.setState({ tkTp: 'e' }); X.D.activeElement = X.other; P.V().tkTpSBlur(); await wait(); assert.equal(P.c.state.tkTp, 'e', 'بؤرةُ حقلٍ مغلق لا تغلق الأخرى');
  P.c.setState({ tkTp: 's' }); X.D.activeElement = X.other; P.V().tkTpSBlur(); await wait(); assert.equal(P.c.state.tkTp, null, 'Tab إلى خارجها: تُغلق');
  const bd = { R: { top: 0, bottom: 400 }, getBoundingClientRect() { return this.R; }, querySelector: () => X.trig };
  P.c.setState({ tkTp: 's' }); P.V().tkBdScroll({ currentTarget: bd }); assert.equal(P.c.state.tkTp, 's', 'الزرُّ ظاهر');
  bd.R = { top: 120, bottom: 400 }; P.V().tkBdScroll({ currentTarget: bd }); assert.equal(P.c.state.tkTp, 's', 'ظهر أكثرُ من نصفه');
  bd.R = { top: 130, bottom: 400 }; X.D.activeElement = X.body; P.V().tkBdScroll({ currentTarget: bd }); assert.equal(P.c.state.tkTp, null, 'اختفى أكثرُ من نصفه: تُغلق');
  assert.equal(X.D.activeElement, X.trig, 'والبؤرةُ إلى زرّها (بلا تمرير)');
  P.V().tkBdScroll({ currentTarget: bd }); assert.equal(P.c.state.tkTp, null, 'مغلقةً: لا شيء');
});

test('القالبُ والأنماط: data-tp-trig/root · onBlur · onKeyDown للقائمة · tabIndex · onScroll لجسم النافذة · قائمةٌ موضعُها relative وارتفاعُها يتبع الشاشة', async () => {
  const V = fs.readFileSync(path.join(ROOT, 'src/modules/tasks/view.html'), 'utf8'), C = fs.readFileSync(path.join(ROOT, 'src/modules/tasks/helmet.css'), 'utf8');
  assert.match(V, /<div class="tkf-bd" onScroll="\{\{tkBdScroll\}\}">/);
  for (const [w, P] of [['s', 'S'], ['e', 'E']]) {
    assert.match(V, new RegExp(`<div class="tkf-tp" data-tp-root="${w}" onBlur="\\{\\{tkTp${P}Blur\\}\\}">\\s*<button type="button" data-tp-trig="${w}" onClick="\\{\\{tkTp${P}Toggle\\}\\}"`));
    assert.match(V, new RegExp(`data-tp-list="${w}" onKeyDown="\\{\\{tkTp${P}ListKey\\}\\}"`));
    assert.match(V, new RegExp(`<sc-for list="\\{\\{tkTp${P}Opts\\}\\}"[^>]*><button type="button" role="option" aria-selected="\\{\\{o.sel\\}\\}" tabIndex="\\{\\{o.ti\\}\\}"`));
  }
  assert.match(C, /\.tkf-tpl\{position:relative;max-height:236px;max-height:max\(110px,min\(236px,calc\(55vh - 120px\)\)\);max-height:max\(110px,min\(236px,calc\(55dvh - 120px\)\)\)/);
});

test('الضغطُ داخل القائمة والإفلاتُ خارجها (سحبُ تحديد النص) لا يغلقها · ونقرُ لوحة المفاتيح بعدها لا يرث الضغطة', async () => {
  const P = await page(); open(P, { tkTp: 's', tkTpQ: '8:10 م' });
  const body = { tag: 'body' }; P.ctx.document = Object.assign({}, P.ctx.document, { body, addEventListener() {}, removeEventListener() {} });
  const bd = { style: {}, parentElement: body }, pop = { style: { position: 'absolute' }, parentElement: bd }, input = { style: {}, parentElement: pop };
  P.c.componentDidMount.call(Object.assign(P.c, { _tkSrv: () => false }));
  const wait = () => new Promise((r) => setTimeout(r, 5));
  P.c._bsDownM({ target: input }); P.c._bsOutsideMenus({ target: bd }); await wait();
  assert.equal(P.c.state.tkTp, 's', 'بدأت الضغطةُ داخل القائمة'); assert.equal(P.c.state.tkTpQ, '8:10 م', 'والمكتوبُ باقٍ');
  P.c._bsOutsideMenus({ target: bd }); await wait(); assert.equal(P.c.state.tkTp, null, 'click بلا ضغطة داخلها (لوحة المفاتيح) ⇒ خارجها');
  P.c.setState({ tkTp: 'e' }); P.c._bsDownM({ target: bd }); P.c._bsOutsideMenus({ target: bd }); await wait(); assert.equal(P.c.state.tkTp, null, 'ضغطةٌ ونقرٌ خارجها ⇒ تُغلق');
  P.c.setState({ tkTp: 'e' }); P.c._bsDownM({ target: bd }); P.c._bsOutsideMenus({ target: input }); await wait(); assert.equal(P.c.state.tkTp, 'e', 'النقرُ داخلها ⇒ تبقى');
});
