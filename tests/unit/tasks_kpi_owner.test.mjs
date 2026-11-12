/* RISHAD-266 · P9 — the tasks indicators are owned by the Tasks system (src/modules/tasks/logic-kpi.js) and shown in «مؤشرات الإدارة»
   through <dc-import name="Tasks" solo="kpi">. Same metrics as before the move (values pinned below were produced by the pre-move
   kpis code on this fixture and checked equal): on-time · late · documentation · average acceptance; cancelled and reassigned rows
   stay out of the count; month navigation wraps the Hijri year. The KPIs viewer no longer reads the tasks store. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.env.KIVO_SRC || path.resolve('src');
function load(now = { y: 1448, m: 5, d: 10 }, store = {}, scope = { state: 'ready' }) {
  function Component() { this.state = {}; this.props = { solo: 'kpi' }; }
  Component.prototype.setState = function (p) { Object.assign(this.state, p); };
  const KIVO = { BassamHijri: { now: () => now }, __BS_SRV: { operations: { get: (k) => (k === 'bassam_tasks_v1' ? store : null) } }, BassamDepts: { context: () => scope } };
  new Function('Component', 'KIVO', fs.readFileSync(path.join(SRC, 'modules/tasks/logic-kpi.js'), 'utf8'))(Component, KIVO);
  return new Component();
}
const row = (st, pf, o = {}) => { const r = new Array(24).fill(null); r[3] = st; r[6] = pf ? [pf, ''] : null; if (o.acc) { r[11] = o.acc[0]; r[15] = o.acc[1]; } if (o.proof) r[21] = o.proof; if (o.asg) r[23] = { asg: o.asg }; return r; };
const M = 6e4;
const STORE = {
  '1448-5-1': [row('done', 'on_time', { proof: { imgs: ['a'] }, acc: [100 * M, 90 * M] }), row('done', 'early', { proof: { imgs: [], note: 'تم' }, acc: [50 * M, 80 * M] })],
  '1448-5-2': [row('done', 'late', { acc: [200 * M, 60 * M] }), row('declined', ''), row('pending', '')],
  '1448-5-3': [row('done', 'on_time', { asg: 'cancelled' }), row('pending', '', { asg: 'reassigned' }), 'not-a-row'],
  '1448-6-1': [row('done', 'late')],
  'bad-key': [row('done', 'on_time')],
};

test('metrics: identical to the pre-move kpis implementation on a fixture covering every branch', () => {
  const c = load();
  assert.deepEqual(c._tkKpi(STORE, 1448, 5), { n: 5, done: 3, on: 2, late: 1, doc: 2, docImg: 1, acc: 3, accSum: 120 * M, dec: 1, open: 1, can: 1, onPct: 67, latePct: 33, docPct: 67, accAvg: 40 });
  assert.deepEqual(c._tkKpi(STORE, 1448, 6), { n: 1, done: 1, on: 0, late: 1, doc: 0, docImg: 0, acc: 0, accSum: 0, dec: 0, open: 0, can: 0, onPct: 0, latePct: 100, docPct: 0, accAvg: null });
  assert.equal(c._tkKpi({}, 1448, 5).onPct, null, 'no done task ⇒ no percentage');
});

test('cards, titles, tones and month navigation (solo view values)', () => {
  const c = load(undefined, STORE);
  const v = c._tkSoloVals();
  assert.equal(v.tkSolo, true); assert.equal(v.tkFull, false); assert.equal(v.tkKpiOn, true);
  assert.equal(v.tkKpiTitle, 'جمادى الأولى 1448 — الشهر الحالي');
  assert.equal(v.tkKpiSub, '5 مهمة · 3 منجزة · 1 مفتوحة · 1 معتذَر عنها · 1 ملغاة (خارج الحساب)');
  assert.deepEqual(v.tkKpiCards.map((k) => [k.t, k.v, k.c]), [
    ['الإنجاز في الوقت', '67٪', 'var(--warning-text)'],
    ['التأخر', '33٪', 'var(--danger-text)'],
    ['الالتزام بالتوثيق', '67٪', 'var(--danger-text)'],
    ['متوسط زمن القبول', '40 د', 'var(--warning-text)'],
  ]);
  v.tkKpiNext(); assert.deepEqual([c.state.tkY, c.state.tkM], [1448, 6]);
  const v6 = c._tkSoloVals(); assert.equal(v6.tkKpiTitle, 'جمادى الآخرة 1448');
  c.state.tkM = 1; c._tkSoloVals().tkKpiPrev(); assert.deepEqual([c.state.tkY, c.state.tkM], [1447, 12], 'previous from Muharram wraps the year');
  c.state.tkY = 1448; c.state.tkM = 12; c._tkSoloVals().tkKpiNext(); assert.deepEqual([c.state.tkY, c.state.tkM], [1449, 1], 'next from Dhu al-Hijjah wraps the year');
  const empty = load(undefined, {})._tkSoloVals(); assert.equal(empty.tkKpiEmpty, true);
  const early = load({ y: 1448, m: 5, d: 1 }, { '1448-5-1': [row('done', 'early', { acc: [10 * M, 70 * M] })] })._tkSoloVals();
  assert.equal(early.tkKpiCards[3].v, 'قبل الموعد بـ1 س', 'negative acceptance shows «before the start»');
});

test('scope not ready: notice only, no indicator values', () => {
  const v = load(undefined, STORE, { state: 'loading', message: 'TEST_ONLY' })._tkSoloVals();
  assert.equal(v.tkScopeNotice, 'TEST_ONLY'); assert.equal(v.tkKpiOn, undefined); assert.equal(v.tkKpiCards, undefined);
});

test('ownership: Tasks owns the code and the panel; the KPIs viewer imports it and reads no tasks data', () => {
  const r = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
  const meta = JSON.parse(r('modules/tasks/meta.json'));
  assert.ok(meta.logicParts.includes('logic-kpi.js'));
  assert.match(r('modules/tasks/logic.js'), /"kpi" === this\.props\.solo\) return this\._tkSoloVals\(\)/);
  assert.match(r('modules/tasks/view.html'), /<sc-if value="\{\{tkSolo\}\}"[\s\S]*مؤشرات المهام — \{\{tkKpiTitle\}\}[\s\S]*<sc-if value="\{\{tkFull\}\}"/);
  for (const f of ['logic.js', 'view.html', 'meta.json']) assert.equal((r('modules/kpis/' + f).match(/bassam_tasks_v1/g) || []).length, 0, 'kpis/' + f + ' reads no tasks store');
  assert.match(r('modules/kpis/view.html'), /<sc-if value="\{\{tkMount\}\}"[^>]*><div style="\{\{tkShow\}\}"><dc-import name="Tasks" solo="kpi"/, 'imported once opened, then kept mounted and hidden (month kept across tab switches)');
  /* V7 P4 · G6: the rule is the same right (tasks · view) but now lives with the other panels — the tasks panel is a ref of the
     «مؤشرات الإدارة» container (pages.json refs: "tasks") and kpiPanelOk answers a page-level ref with the page's view right, so the
     sidebar link, the route and the tab agree. The KPIs viewer keeps only a fallback for a missing engine. */
  assert.match(r('modules/kpis/logic.js'), /\{ k: "tk", pk: "tasks", sk: "" \}/, 'the tasks tab is drawn from the page-level ref');
  assert.match(r('modules/kpis/logic.js'), /if \(!t && !\(r && r\.kpiPanelOk\)\) return !r \|\| !r\.can \? !0 : !!r\.can\(n, "view"\);/, 'fallback without the engine: tasks · view');
  assert.match(r('permissions/334-perm-tree-tpl.js'), /if \(!sk\) return can\(pk, 'view'\);/, 'tab visibility rule: whoever can view «المهام»');
  assert.ok(JSON.parse(r('manifests/pages.json')).containers.find((c) => c.key === 'kpis').refs.includes('tasks'));
});
