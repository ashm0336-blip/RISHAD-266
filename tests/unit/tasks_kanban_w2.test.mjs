/* الموجة 2 · DG-03 — «عرض بطاقات» في المهام: ستةُ أعمدةٍ بلا عنوانٍ ولا عدّ في شبكةٍ من أربعة أعمدة (فيلتفّ اثنان إلى صفٍّ ثانٍ
   ويُمدَّد كلُّ عمودٍ إلى طول أطولها)، وعلى الجوال يبدأ الشريطُ بعمودٍ فارغ فوق نحو 2400px من الفراغ والبطاقاتُ في العمود السادس.
   الآن: كلُّ عمودٍ يحمل اسمَ حالته وعدَّه، والشبكةُ ستةُ أعمدةٍ في صفٍّ واحد كلٌّ بارتفاعه، وعلى الجوال تُرصّ الأعمدةُ ويُطوى الفارغُ منها
   ما دام في غيره مهامّ (kHide).
   · DG-12 — الحالةُ الفارغة كانت رمزاً تعبيرياً (📅 يُرسم «July 17» بالإنجليزية) — الآن أيقونةُ المنصة (SVG) في المربّع الذهبي.
   منطقُ الصفحة الحقيقي في vm بساعةٍ ثابتة (w1_pages.mjs: الثلاثاء 9 جمادى الأولى 1448 هـ) — بياناتٌ اصطناعية (TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { page, NOW } from './w1_pages.mjs';
import { row, ME, MATE } from './tasks_fx.mjs';
import { SRC } from './harness.mjs';

const H = 36e5, Y = 1448, M = 5, K = (d, m = M) => Y + '-' + m + '-' + d;
const EMPS = [{ eid: ME.eid, name: ME.name, work: 'TEST_ONLY مراقب' }, { eid: MATE.eid, name: MATE.name, work: 'TEST_ONLY مراقب' }];
const CAN = { v: 1, asg: 'cancelled', can: { why: 'TEST_ONLY أُنهي التكرار' } };
let SEQ = 0;
const id = () => NOW - 40 * 24 * H + (++SEQ) * 6e4;
const done = (eid, d) => row({ id: id(), title: 'TEST_ONLY منجزة ' + d, eid, st: 'done', perf: ['on_time', 'في الوقت'], acc: NOW - (60 - d) * H, fin: NOW - (59 - d) * H, dur: 60, s: NOW - (60 - d) * H, e: NOW - (58 - d) * H });
const cancelled = (eid, d) => { const r = row({ id: id(), title: 'TEST_ONLY ملغاة ' + d, eid, s: NOW - (50 - d) * H, e: NOW - (49 - d) * H }); r[22] = null; r[23] = CAN; return r; };
/* سيناريو التدقيق: منجزتان (يوم 3) و12 ملغاة (الأيام 3–8) — كلُّ البطاقات في عمودين من ستة */
function month() {
  const S = {}; S[K(3)] = [done(ME.eid, 3), done(MATE.eid, 3)];
  for (let d = 3; d <= 8; d++) (S[K(d)] = S[K(d)] || []).push(cancelled(ME.eid, d), cancelled(ME.eid, d));
  return S;
}
/* RISHAD-266: الصفحةُ تقرأ مواردَها التشغيلية عبر خدمة العمليات (_tkOps) — خدمةٌ بلا موارد هنا فيُقرأ المخزنُ المحلّيّ الاصطناعيّ كما هو */
const OPS = { resources: [], status: () => ({ state: 'idle', epoch: 0 }), context: () => null, state: () => 'ready', begin: () => ({ ok: true }), draft: () => null };
const tasks = (S, st) => { const P = page('tasks', { store: { bassam_tasks_v1: S, bassam_employees_v1: EMPS }, srv: { operations: OPS, rev: () => 0 } }); P.c.setState(Object.assign({ perPage: 0, tkDaySel: { k: Y + '-' + M, d: 0 } }, st || {})); return P; };
const J = (o) => JSON.parse(JSON.stringify(o));
const LABELS = ['انتظار', 'جارية', 'منجزة', 'متأخرة', 'لم تُقبل', 'اعتذار'];

test('DG-03 · أعمدةُ اللوحة الستة معنونةٌ بحالتها وعدِّها (بترتيب الحالات) — ومجموعُ الأعداد = عددُ المعروض', () => {
  const V = tasks(month(), { sub: 'kanban' }).V();
  assert.equal(V.showKanban, true);
  const C = V.kanbanCols;
  assert.deepEqual(J(C.map((c) => c.key)), ['pending', 'in_progress', 'done', 'overdue', 'expired', 'declined']);
  assert.deepEqual(J(C.map((c) => c.label)), LABELS);
  assert.deepEqual(J(C.map((c) => c.count)), ['0', '0', '2', '0', '0', '12'], 'الملغاةُ في «اعتذار» كما كانت');
  assert.deepEqual(J(C.map((c) => c.count)), J(C.map((c) => String(c.tasks.length))));
  assert.equal(C.reduce((a, c) => a + +c.count, 0), +V.shownCount);
  for (const c of C) assert.match(c.dot, /^background:\S+$/, 'نقطةُ الحالة بلونها');
});

test('DG-03 · الجوال: العمودُ الفارغ يُطوى (kHide) ما دام في غيره مهامّ — فتبدأ اللوحةُ ببطاقات · وإن فرغت كلُّها لا يُطوى شيء', () => {
  const C = tasks(month(), { sub: 'kanban' }).V().kanbanCols;
  assert.deepEqual(J(C.map((c) => c.kHide)), ['1', '1', '0', '1', '1', '0']);
  assert.deepEqual(J(C.map((c) => c.empty)), [true, true, false, true, true, false]);
  /* شهرٌ بلا مهامّ — لا تُعلَّم الأعمدةُ كلُّها للطيّ */
  const E = tasks({}, { sub: 'kanban' }).V();
  assert.deepEqual(J(E.kanbanCols.map((c) => c.kHide)), ['0', '0', '0', '0', '0', '0']);
  assert.ok(E.kanbanCols.every((c) => c.empty && c.count === '0'));
});

test('DG-03 · القالب: ستةُ أعمدةٍ في صفٍّ واحد (لا repeat(4,1fr)) كلٌّ بارتفاعه (align-items:start) بعنوانٍ وعدّ · وقاعدةُ الجوال تطوي الفارغ وترصّ الأعمدة', () => {
  const v = fs.readFileSync(path.join(SRC, 'modules/tasks/view.html'), 'utf8'), css = fs.readFileSync(path.join(SRC, 'modules/tasks/helmet.css'), 'utf8');
  const i = v.indexOf('<sc-if value="{{showKanban}}"'), blk = v.slice(i, v.indexOf('<sc-for list="{{col.tasks}}"', i));
  assert.ok(i > 0);
  assert.match(blk, /class="bs-cardgrid tk-kanban" style="display:grid;grid-template-columns:repeat\(6,minmax\(180px,1fr\)\);gap:12px;align-items:start;overflow-x:auto/);
  assert.doesNotMatch(blk, /repeat\(4,1fr\)|bs-cardrow/);
  assert.match(blk, /data-khide="\{\{col\.kHide\}\}"/);
  assert.match(blk, /\{\{col\.label\}\}/); assert.match(blk, /\{\{col\.count\}\}/);
  assert.match(css, /@media \(max-width:760px\)\{\s*\.bs-cardgrid\.tk-kanban\{flex-direction:column;align-items:stretch!important;overflow:visible!important;[^}]*\}\s*\.bs-cardgrid\.tk-kanban > \*\{width:auto;flex:0 0 auto;align-self:stretch\}\s*\.bs-cardgrid\.tk-kanban > \[data-khide="1"\]\{display:none!important\}\s*\}/);
});

test('DG-03 · تذييلُ بطاقة اللوحة يلتفّ: «بواسطة …» ينزل تحت الأسماء في العمود الضيّق ولا يحشر سطرَ السياسة/النافذة في ≈60px', () => {
  const v = fs.readFileSync(path.join(SRC, 'modules/tasks/view.html'), 'utf8');
  const i = v.indexOf('<sc-if value="{{showKanban}}"'), blk = v.slice(i, v.indexOf('<sc-if value="{{showList}}"', i));
  const f = blk.indexOf('title="مُدخِل المهمة"'), foot = blk.slice(blk.lastIndexOf('<div style="display:flex;align-items:center;justify-content:space-between', f), f + 60);
  assert.match(foot, /^<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px 8px;/);
  assert.match(foot, /^[^\n]*\n\s*<div style="display:flex;flex-direction:column;gap:1px;flex:1 1 auto;min-width:0">/);
  assert.match(foot, /<span style="font-size:9px;color:var\(--fg-x53565a\);flex:0 1 auto;min-width:0" title="مُدخِل المهمة">/);
  assert.doesNotMatch(foot, /flex-shrink:0" title="مُدخِل المهمة"/, 'لا ينكمش ⇐ يحشر الأسماء');
  /* سطرُ الشارات يلتفّ داخل عرضه ولا يفيض خارج البطاقة (كان nowrap) */
  assert.match(foot, /<span style="font-size:9px;color:var\(--text-muted\);min-width:0;overflow-wrap:anywhere">\{\{t\.p2Chips\}\}<\/span>/);
});

test('DG-12 · الحالةُ الفارغة: أيقونةُ SVG للمنصة في المربّع الذهبي لا رمزٌ تعبيري — تقويمٌ لليوم الفارغ · بحثٌ للفلاتر · قائمةٌ للشهر الفارغ', () => {
  /* يومٌ بلا مهام (20) */
  let V = tasks(month(), { tkDaySel: { k: Y + '-' + M, d: 20 } }).V();
  assert.equal(V.isEmptyDay, true); assert.equal(V.emptyTitle, 'لا توجد مهام في هذا اليوم');
  assert.deepEqual([V.emptyIcQ, V.emptyIcCal, V.emptyIcList], [false, true, false]);
  assert.equal(V.emptyEmoji, undefined, 'لا رمزَ تعبيرياً');
  /* بحثٌ لا يطابق */
  V = tasks(month(), { search: 'TEST_ONLY_لا_يطابق' }).V();
  assert.equal(V.isEmptyDay, true); assert.equal(V.emptyTitle, 'لا نتائج مطابقة للفلاتر');
  assert.deepEqual([V.emptyIcQ, V.emptyIcCal, V.emptyIcList], [true, false, false]);
  /* شهرٌ بلا مهام */
  V = tasks({}, {}).V();
  assert.equal(V.isEmptyDay, true);
  assert.equal([V.emptyIcQ, V.emptyIcCal, V.emptyIcList].filter(Boolean).length, 1, 'أيقونةٌ واحدة بالضبط');
  assert.equal(V.emptyIcCal, /اليوم|مخططة/.test(V.emptyTitle));
  /* القالب */
  const v = fs.readFileSync(path.join(SRC, 'modules/tasks/view.html'), 'utf8');
  assert.doesNotMatch(v, /\{\{emptyEmoji\}\}|📅|🔍|📂/u);
  for (const [k, ic] of [['emptyIcQ', 'i-7133b944'], ['emptyIcCal', 'i-cc4be5d2'], ['emptyIcList', 'i-97e013f3']])
    assert.match(v, new RegExp('<sc-if value="\\{\\{' + k + '\\}\\}"[^>]*><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"[^>]*data-i="' + ic + '"></svg></sc-if>'));
});
