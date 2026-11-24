/* V7 · 53 (REVIEW.md البند ٨ — قرارُ المراجع بتفويض المالك، الخيار أ وحده): في نسخة الخادم من سجلّ الصلاحيات (workers/parts/004-registry-2.js)
   يُستبدل كلُّ نصِّ guard.detail غيرِ فارغ بعلامةٍ قصيرة (src/permissions/registry/targets.json → guardDetailMarker)، ونسخةُ الواجهة (340) كاملة.
   ① فحصُ النسخة الحرفية: 340 = السجلُّ المجموع حرفاً، و004 = 340 بالفرق المعلن وحده (كلُّ detail غيرِ فارغ = العلامة · الفارغُ فارغ · لا شيءَ غيرُه).
   ② لا قارئَ لنصّ detail في الخادم إلا اختبارُ أنه غيرُ فارغ (شجرةُ acorn للعامل كلِّه · tests/unit/trace_reads.mjs):
      · كائنُ guard (‎<مدخل>.guard‎) لا يُقرأ منه إلا kind · resources · detail، ولا يُمرَّر كاملاً؛
      · كلُّ قراءةٍ لـ detail في موضعٍ منطقيٍّ وحده (‎!x.detail‎ · شرط) — لا تُطبع ولا تُقارن بنصّ ولا تُنسخ؛
      · مدخلُ السجلّ لا يُمرَّر كاملاً (إلا في فهرسه byKey)، وكائنُ KIVO_REGISTRY ومعاملاتُ المحرّكات التي تتلقّاه لا يُقرأ منها data (D بنصوصه).
   ③ السلوك: KIVO_REGISTRY.validate() و can/translate/atomOk على عيّنة — بالنصّ الكامل وبالعلامة — متطابقة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { ROOT, SRC } from './harness.mjs';
import { traceReads } from './trace_reads.mjs';

const acorn = createRequire(path.join(ROOT, 'package.json'))('acorn');
const rd = (p) => fs.readFileSync(p, 'utf8');
const SPEC = JSON.parse(rd(path.join(SRC, 'permissions', 'registry', 'targets.json')));
const SERVER = SPEC.targets.find((t) => /004-registry-2\.js$/.test(t.file)), CLIENT = SPEC.targets.find((t) => /340-registry-v24-9\.js$/.test(t.file));
const MARK = SERVER.guardDetailMarker;
const lit = (text) => { const a = text.indexOf('var KIVO_REGISTRY_DATA = ') + 'var KIVO_REGISTRY_DATA = '.length, b = text.indexOf(';\n', a); return text.slice(a, b); };
const P004 = path.join(ROOT, 'workers', 'parts', '004-registry-2.js'), P340 = path.join(SRC, 'permissions', '340-registry-v24-9.js');

test('V7 · 53 ①: نسخةُ الواجهة = السجلُّ حرفاً · نسخةُ الخادم = نسخةُ الواجهة بالفرق المعلن وحده (guard.detail → «' + MARK + '»)', () => {
  assert.ok(typeof MARK === 'string' && MARK.length > 0 && MARK.length <= 2, 'العلامةُ قصيرةٌ غيرُ فارغة');
  assert.equal(CLIENT.guardDetailMarker, undefined, 'نسخةُ الواجهة بلا علامة');
  const reg = JSON.parse(rd(path.join(SRC, 'permissions', 'registry', 'registry-v24.9.json')));
  const c = lit(rd(P340)), s = lit(rd(P004));
  assert.equal(c, JSON.stringify(reg), '340 = السجلُّ المجموع حرفاً (النصوصُ كاملة)');
  const want = JSON.parse(c); let n = 0;
  for (const e of want.registry) if (e.guard && e.guard.detail) { e.guard.detail = MARK; n++; }
  /* والفرقُ المعلن الآخر في الهدف نفسه (وضوح الصلاحيات: omitFields — نصّا العرض verb · place للواجهة وحدها) — يُطبَّق من targets.json نفسه، ولا فرقَ غيرُهما */
  const OMIT = SERVER.omitFields || [], cut = (x) => (x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).filter(([k]) => !OMIT.includes(k))) : x);
  if (OMIT.length) { want.registry = want.registry.map(cut); want.atoms = want.atoms.map(cut); }
  assert.deepEqual(Object.keys(SERVER).filter((k) => !['file', 'header', 'tail'].includes(k)).sort(), ['guardDetailMarker', 'omitFields'].filter((k) => k in SERVER).sort(), 'لا فرقَ معلنٌ ثالث');
  assert.equal(s, JSON.stringify(want), '004 = 340 والفرقُ المعلن وحده (guard.detail · omitFields)');
  assert.ok(n > 200, 'الفرقُ في ' + n + ' مدخلاً');
  /* والمحرّكُ (engine.js) والترويسةُ نفسُهما في النسختين */
  const engine = rd(path.join(SRC, 'permissions', 'registry', SPEC.engine));
  assert.ok(rd(P004).includes(engine) && rd(P340).includes(engine), 'المحرّكُ نفسُه في النسختين');
});

test('V7 · 53 ②: لا قارئَ لنصّ guard.detail في الخادم إلا أنه غيرُ فارغ (العاملُ كلُّه)', () => {
  const W0 = rd(path.join(ROOT, 'workers', '_worker.js')), a = W0.indexOf('var KIVO_REGISTRY_DATA = '), b = W0.indexOf(';\n', a);
  const W = W0.slice(0, a) + 'var KIVO_REGISTRY_DATA = {};' + W0.slice(b + 1);   /* البياناتُ نفسُها ليست قارئاً */
  const ast = acorn.parse(W, { ecmaVersion: 'latest', sourceType: 'module', allowReturnOutsideFunction: true });
  const parents = new Map(), all = [];
  (function walk(n, p) { if (!n || typeof n.type !== 'string') return; parents.set(n, p); all.push(n); for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === 'string' && walk(x, n)); else if (v && typeof v.type === 'string') walk(v, n); } })(ast, null);
  const at = (n) => W.slice(n.start - 40, n.end + 30).replace(/\s+/g, ' ');
  const mem = (n, p) => n && n.type === 'MemberExpression' && !n.computed && n.property.name === p;
  /* كائناتُ guard: ‎<x>.guard‎ — عدا ‎pre.guard‎ (لقطةُ حارس قاعدة البيانات في 054 · epoch/names/schema: كائنٌ آخر بالاسم نفسِه) */
  const isGuard = (e) => mem(e, 'guard') && !(e.object.type === 'Identifier' && e.object.name === 'pre');
  const G = traceReads(ast, isGuard);
  assert.deepEqual(G.reads, ['detail', 'kind', 'resources'], 'ما يُقرأ من guard');
  assert.deepEqual(G.escapes, [], 'guard لا يُمرَّر كاملاً');
  /* كلُّ قراءةٍ لـ detail: موضعٌ منطقيٌّ وحده */
  const reads = all.filter((n) => mem(n, 'detail') && (isGuard(n.object) || (n.object.type === 'Identifier' && G.isAlias(n.object))));
  assert.ok(reads.length >= 1, 'يُقرأ (validate · noGuard)');
  for (const r of reads) {
    let up = parents.get(r), x = r;
    while (up.type === 'LogicalExpression' && (up.operator === '||' || up.operator === '&&')) { x = up; up = parents.get(up); }
    const boolean = (up.type === 'UnaryExpression' && up.operator === '!') || (up.type === 'IfStatement' && up.test === x) || (up.type === 'ConditionalExpression' && up.test === x);
    assert.ok(boolean || parents.get(r).type === 'UnaryExpression', 'detail يُقرأ في غير موضعٍ منطقي: ' + at(r));
    assert.ok(parents.get(r).type === 'UnaryExpression' && parents.get(r).operator === '!', 'detail يُقرأ نفياً (‎!x.detail‎): ' + at(r));
  }
  /* مداخلُ السجلّ: ‎<x>.byKey[k]‎ · ‎<x>.registry[i]‎ · وما يُسنَد منها (ومن أسماء byKey: ‎R = KIVO_REGISTRY.byKey‎) — لا تُمرَّر كاملةً إلا إلى فهرسها */
  const isCont = (o) => mem(o, 'byKey') || mem(o, 'registry') || (o.type === 'Identifier' && o.name === 'byKey');
  const C = traceReads(ast, isCont);
  const E = traceReads(ast, (e) => e.type === 'MemberExpression' && e.computed && (isCont(e.object) || C.isAlias(e.object)));
  assert.ok(E.reads.includes('guard'), 'المداخلُ تُقرأ guard');
  const esc = E.escapes.map((x) => W.slice(+x.split('@')[1] - 30, +x.split('@')[1] + 1));
  assert.deepEqual(esc.filter((s) => !/byKey\[e\.key\] = e$/.test(s)), [], 'مدخلُ السجلّ لا يُمرَّر كاملاً (إلا byKey[e.key] = e في المحرّك)');
  /* KIVO_REGISTRY وأسماؤه ومعاملاتُ المحرّكات التي تتلقّاه (والمحرّكُ نفسُه: D) — لا قراءةَ لـ data */
  const R = traceReads(ast, (e) => e.type === 'Identifier' && e.name === 'KIVO_REGISTRY');
  const paramReads = new Set();
  for (const n of all) {
    if (n.type !== 'CallExpression') continue;
    const fn = n.callee.type === 'FunctionExpression' ? n.callee : (n.callee.type === 'Identifier' ? all.find((f) => f.type === 'FunctionDeclaration' && f.id && f.id.name === n.callee.name) : null);
    if (!fn) continue;
    n.arguments.forEach((arg, i) => { if (arg.type === 'Identifier' && arg.name === 'KIVO_REGISTRY' && fn.params[i]) { const pn = fn.params[i].name; traceReads(fn.body, (e) => e.type === 'Identifier' && e.name === pn).reads.forEach((x) => paramReads.add(x)); } });
  }
  assert.ok(R.reads.length && paramReads.size, 'تتبّعٌ فعلي');
  assert.ok(!R.reads.includes('data') && !paramReads.has('data'), 'KIVO_REGISTRY.data لا يُقرأ: ' + [...R.reads, ...paramReads].join(' · '));
  /* المحرّكُ نفسُه: D (البيانات) لا يُقرأ منه registry إلا في الفهرسة وvalidate — ولا يُعرض D إلا عضوَ data (غيرِ المقروء أعلاه) */
});

test('V7 · 53 ③: المحرّكُ بالنصّ الكامل = بالعلامة (validate · can · translate · atomOk)', () => {
  const engine = rd(path.join(SRC, 'permissions', 'registry', SPEC.engine));
  const run = (dataLit) => { const ctx = {}; vm.createContext(ctx); vm.runInContext('var KIVO_REGISTRY_DATA = ' + dataLit + ';\n' + engine + '\n;this.R = KIVO_REGISTRY;', ctx); return ctx.R; };
  const F = run(lit(rd(P340))), M = run(lit(rd(P004)));
  const J = (x) => JSON.stringify(x);
  assert.equal(J(M.validate()), J(F.validate()), 'validate');
  assert.equal(M.validate().ok, true);
  const sheet = { 'dstats/haram': ['view', 'add'], tasks: ['view', 'edit'], 'daily/rounds': ['view'] };
  assert.equal(J(M.translate(sheet)), J(F.translate(sheet)), 'translate');
  for (const k of F.keys) { assert.equal(J(M.can(k, { sheet, mgr: true })), J(F.can(k, { sheet, mgr: true })), 'can ' + k); assert.equal(J(M.can(k, { sheet })), J(F.can(k, { sheet })), 'can ' + k); }
  for (const a of Object.keys(F.atoms)) { const [leaf, act] = a.split(':'); assert.equal(J(M.atomOk(leaf, act, { sheet })), J(F.atomOk(leaf, act, { sheet })), 'atomOk ' + a); }
});
