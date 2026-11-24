/* V7 · 53: عالمُ «حالة التغطية» والمؤشرات للاختبار — منطقُ المتابعة اليومية الحقيقي (src/systems/daily/client/logic.js) داخل node:vm
   فوق tests/unit/canvas_world.mjs، مع جدولٍ شهري ووردياتٍ وموظفين وجولةِ يومٍ اصطناعية (TEST_ONLY). يعيد عقدةَ الكرت (covNode) ونصوصَها.
   DAILY_LOGIC=<مسار> يبدّل ملفَّ المنطق (لإثبات الإخفاق على السابق). */
import fs from 'node:fs';
import { world } from './canvas_world.mjs';

export const SRC = process.env.DAILY_LOGIC ? fs.readFileSync(process.env.DAILY_LOGIC, 'utf8') : undefined;
export const SH = ['الوردية الأولى', 'الوردية الثانية'];
export const sq = (x, y) => 'M' + x + ' ' + y + ' L' + (x + 40) + ' ' + y + ' L' + (x + 40) + ' ' + (y + 40) + ' L' + x + ' ' + (y + 40) + ' Z';
/* people: [{ id, shift, sup? }] · zones: [{ emp:[ids], needN, needS?, off?, region? }] · st: حالةٌ إضافية · sup: معرّفاتٌ إشرافية · muk: معرّفاتٌ مكلّفة */
export function covWorld({ people = [], zones = [], st = {}, sup = [], muk = [], rest = [], extra, past = false, rec = {} } = {}) {
  const W = world(), c = W.logic('daily', SRC);
  /* V7 · 53 تقويم: الصفحةُ ميلادية — اليومُ ومفتاحا الجولة (YYYY-MM-DD) والجدول (YYYY-MM) من الخدمة الواحدة (كانت هجريةً بلا بطانة).
     «اليوم» هو يومُ الصفحة نفسِها (c.gTodayOf: يومُ الرياض المدني، بلا مهلة) لا gToday (اليوم التشغيلي بمهلة 3 ساعات): يختلفان بين 00:00 و03:00 بالرياض،
     والفرقُ بين العميل والخادم قائمٌ ومُبقى بقرار ق11 (أ) (التصميم §«اليوم التشغيلي» · الخطر 6) — فالعالمُ يتبع الصفحةَ في كل ساعة */
  const Cal = W.KIVO.BassamCal, h0 = c.gTodayOf(), h = past ? { y: h0.m > 1 ? h0.y : h0.y - 1, m: h0.m > 1 ? h0.m - 1 : 12, d: 1 } : { y: h0.y, m: h0.m, d: h0.d }, RK = Cal.gKey(h.y, h.m, h.d), YM = Cal.gYm(h.y, h.m);
  W.store.set('bassam_employees_v1', JSON.stringify(people.map((p) => ({ eid: p.id, name: 'TEST_ONLY ' + p.id }))));
  W.store.set('bassam_shift_options_v1', JSON.stringify(SH.map((n, i) => ({ name: n, color: i ? '#2f8f86' : '#b99751' }))));
  const sched = {}; people.forEach((p) => { sched[p.id] = { shift: p.shift || '' }; if (muk.includes(p.id)) sched[p.id].muk = true; if (rest.includes(p.id)) sched[p.id].rest = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']; });
  W.store.set('bassam_staffing_v3', JSON.stringify({ [YM]: sched }));
  const zs = zones.map((z, i) => Object.assign({ uid: 'TEST_ONLY_z' + i, d: sq(50 + 60 * i, 50), cx: 70 + 60 * i, cy: 70, code: 'Z' + i }, z));
  const rounds = { [RK]: Object.assign({ d: [{ zones: zs, paths: [], gates: [], marks: [] }] }, rec) };
  W.store.set('bassam_rounds_v1', JSON.stringify(rounds));
  W.KIVO.BassamSup = { supName: (k) => (sup.includes(k) ? 'TEST_ONLY مشرف' : ''), isSup: (k) => sup.includes(k) };
  if (extra) extra(W, c);
  c.state = Object.assign({}, c.state, { year: h.y, month: h.m, day: h.d, floor: 0, lens: 'zones', dsAsn: true, distFilterShift: SH[1], panelTab: 'zones', brkDim: 'cov', tool: 'select', dview: { x: 0, y: 0, w: 1000, h: 600 }, rounds: JSON.parse(JSON.stringify(rounds)) }, st);
  return { W, c, RK, h };
}
/* نصوصُ عقدة React ({t,p,ch}) مسطّحة · وكلُّ عقدةٍ بنصّها */
export function texts(n, out = []) {
  if (n == null || n === false || n === true) return out;
  if (Array.isArray(n)) { n.forEach((x) => texts(x, out)); return out; }
  if (typeof n !== 'object') { out.push(String(n)); return out; }
  texts(n.ch, out);
  return out;
}
export function nodes(n, out = []) {
  if (n == null || typeof n !== 'object') return out;
  if (Array.isArray(n)) { n.forEach((x) => nodes(x, out)); return out; }
  out.push(n); nodes(n.ch, out); return out;
}
/* تبليطةُ رقم ← تسمية في الكرت: { n: الرقم, label } */
export function tile(node, label) {
  for (const x of nodes(node)) {
    const kids = (x.ch || []).flat(5).filter((k) => k && typeof k === 'object');
    if (kids.length >= 2 && texts(kids[1]).join('') === label) return { n: texts(kids[0]).join(''), node: x, all: texts(x).join(' | ') };
  }
  return null;
}
export function cov(c) { const v = c.renderVals(); return { v, node: v.covNode, text: texts(v.covNode).join(' ¦ ') }; }
