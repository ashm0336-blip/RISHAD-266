/* V7 · 53 (ملحق مؤشرات الكانفس: ك20 · ك25 · ك26 · ومعهما ك15 بالقاعدة نفسِها) — الخطة التشغيلية على منطق الصفحة الحقيقي
   (src/systems/plan/client/logic.js داخل node:vm · tests/unit/canvas_world.mjs) ببياناتٍ اصطناعية (TEST_ONLY).
   PLAN_LOGIC=<مسار> يبدّل ملفَّ المنطق (لإثبات الإخفاق على السابق). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { world } from './canvas_world.mjs';
import { texts } from './v7_53_kpi_world.mjs';

const SRC = process.env.PLAN_LOGIC ? fs.readFileSync(process.env.PLAN_LOGIC, 'utf8') : undefined;
const SH = ['الوردية الأولى', 'الوردية الثانية', 'الوردية الثالثة', 'الوردية الرابعة', 'الوردية الخامسة'];
const id = (x) => 'TEST_ONLY_' + x;
function plan({ people = [], zones = [], sup = [], st = {} } = {}) {
  const W = world(), c = W.logic('plan', SRC);
  W.store.set('bassam_employees_v1', JSON.stringify(people.map((p) => ({ eid: id(p.id), name: 'TEST_ONLY ' + p.id, work: 'ميداني' }))));
  W.store.set('bassam_shift_options_v1', JSON.stringify(SH.map((n) => ({ name: n, color: '#b99751' }))));
  const sched = {}; people.forEach((p) => { sched[id(p.id)] = { shift: p.shift || SH[1] }; });
  /* V7 · 53 تقويم: الخطةُ ميلادية — شهرُ الجدول والخطة مفتاحٌ ISO (YYYY-MM)؛ المفتاحُ الهجري 1448-5 لا تقرؤه الصفحة */
  W.store.set('bassam_staffing_v3', JSON.stringify({ '2026-10': sched }));
  W.KIVO.BassamSup = { supName: (k) => (sup.map(id).includes(k) ? 'TEST_ONLY مشرف' : ''), isSup: (k) => sup.map(id).includes(k) };
  const zs = zones.map((z, i) => Object.assign({ uid: id('z' + i), code: 'Z' + i, d: 'M100 100 L400 100 L400 300 L100 300 Z', cx: 250, cy: 200, emp: [] }, z));
  const site = { sid: 's_TEST_ONLY_1', name: 'TEST_ONLY', num: 1, zones: zs, gates: [], marks: [], paths: [], sectors: [] };
  c.state = Object.assign({}, c.state, { year: 2026, month: 10, floor: 0, floors: [site], zones: zs, gates: [], marks: [], paths: [], planMonths: { '2026-10': { c: 1, d: [site] } },
    sel: null, selMulti: [], tool: 'select', lens: 'plan', view: { x: 0, y: 0, w: 1000, h: 600 } }, st);
  c.savePlan = () => {};
  return { W, c };
}
/* لوحةُ التوزيع (_distPanel9) كما تبنيها الصفحة للمصليات */
function panel(c, zones, people) {
  const emps = people.map((p) => ({ eid: id(p.id), name: 'TEST_ONLY ' + p.id, work: 'ميداني' }));
  const node = c._distPanel9({ empList: emps, scheduledEmps: emps, shiftOpts: SH.map((n) => ({ name: n })), shiftByName: {}, zonesAll: zones, gatesAll: [], marksAll: [] },
    { key9: 'zdistp', arr: zones, selfWord: 'المصليات', secDims: [['region', 'المنطقة']], valsOf: (t, k) => [String(t[k] || 'غير محدّد')], unitOf: () => 'مصلى', catNoteOf: () => '' });
  return { text: texts(node).join(' ¦ '), json: JSON.stringify(node) };
}

test('ك20: الطاقمُ الإشرافي لا يُسكَّن آلياً في الخطة — القاعدةُ نفسُها في الجولات', () => {
  const people = [{ id: 's' }, { id: 'a' }];
  const { c } = plan({ people, zones: [{ needN: 1 }], sup: ['s'] });
  c.renderVals().adZonesGo();
  assert.ok(c.state.adZAsk, 'نافذةُ التوزيع الآلي');
  assert.equal(c.state.adZAsk.surplus, 0, 'الإشرافيُّ ليس «غير مسكَّن» ينتظر التسكين');
  c.renderVals().adZAskDo();
  assert.deepEqual(c.state.zones[0].emp, [id('a')], 'سُكِّن غيرُ الإشرافي (كان الإشرافيُّ أوّلَ المسكَّنين)');
});

test('ك20: لوحةُ التوزيع في الخطة — الإشرافيُّ ليس مسكَّناً ولا متاحاً ويُذكر «منهم إشرافي» · ك15: عجزُ كل موقع وزائدُه بلا صافٍ · المعطّل خارج الاحتياج', () => {
  const people = [{ id: 's' }, { id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const one = { needN: 0, needS: { [SH[1]]: 1 } };   /* احتياجٌ لوردية واحدة: 1 */
  const zones = [Object.assign({ emp: [id('s'), id('a'), id('b')], region: 'TEST_ONLY_R' }, one), Object.assign({ emp: [], region: 'TEST_ONLY_R' }, one), { needN: 0, needS: { [SH[1]]: 4 }, off: true, emp: [], region: 'TEST_ONLY_R' }];
  const { c } = plan({ people, zones, sup: ['s'] });
  const r = panel(c, zones, people);
  assert.match(r.text, /^5 ¦ القوة الميدانية · منهم إشرافي 1 ¦ مسكّنون ¦ 2 ¦/, 'القوة 5 منهم إشرافي 1 · مسكّنون 2 (لا الإشرافي)');
  assert.match(r.text, /متاح للتسكين ¦ 2 ¦/, 'متاح 2 (c وd)');
  const row = (r.json.match(/"title":"TEST_ONLY_R — [^"]*"/) || [''])[0];
  assert.match(row, /الاحتياج 2 /, 'احتياجُ المعطّل (4) خارجه');
  assert.match(row, /مسكّن 2 /, 'الإشرافيُّ ليس مسكَّناً');
  assert.match(row, /المتبقي 1 · فائض 1/, 'عجزُ Z1 لا يُخفيه فائضُ Z0 (كان صافياً)');
});

test('ك25: «مجموع الورديات» من إعداد الإدارة لا «الأربع» الثابتة', () => {
  const people = [{ id: 'a' }];
  const zones = [{ needN: 1, emp: [], region: 'TEST_ONLY_R' }];
  const { c } = plan({ people, zones });
  const r = panel(c, zones, people);
  assert.ok(!r.json.includes('الورديات الأربع'), 'لا «الأربع» للإدارة ذات الخمس ورديات');
  assert.match(r.json, /مجموع ورديات الإدارة \(5\)/);
});

test('ك26: التوزيع الآلي في الخطة يقول «غير مسكَّنين (احتياط)» لا «فائض غير مسكَّن»', () => {
  const { c } = plan({ st: { adZAsk: { placed: 1, deficit: 0, surplus: 2, n: 1, offSkip: 0 }, adMAsk: { placed: 1, deficit: 0, surplus: 3, n: 1, offSkip: 0 }, adAsk: { kind: 'gates', placed: 1, deficit: 0, surplus: 1, gatesN: 1, closedSkip: 0 } } });
  const v = c.renderVals(), all = JSON.stringify(v);
  assert.ok(!all.includes('فائض غير مسكَّن'), 'لا «فائض» بمعنى غير المسكَّن');
  assert.match(v.adZAskMsg, /موظفان غير مسكَّنَين \(احتياط\)/);
  const src = SRC || fs.readFileSync(new URL('../../src/systems/plan/client/logic.js', import.meta.url), 'utf8');
  assert.equal((src.match(/فائض غير مسكَّن/g) || []).length, 0, 'ولا في رسائل الإتمام الثلاث');
});
