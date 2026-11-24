/* V7 · 53 (تقليصُ العامل — قرارُ المالك: يُصغَّر بلا تغيير سلوك، والسقفُ لا يُرفع):
   الوحداتُ المرجعية الأربع (006 · 008 · 010 · 014) كانت تشحن في العامل وثيقةَ تصميمها كاملة (نصوصٌ عربية طويلة وجداولُ لا يقرؤها أحد).
   workers/bindings/targets.json يسمّي في «omit» ما لا يقرؤه الخادم، و tools/generate.py (omit_paths) يحذفه من الجزء المولَّد وحده؛ data.json يبقى كما هو.
   البرهان (هنا):
     ① بايتاً: حرفيُّ كل جزء = JSON.stringify(المصدر بلا المسارات) — وكلُّ مسارٍ محذوفٍ موجودٌ في المصدر (لم يُحذف من الوثيقة شيء).
     ② لا قارئ: في شجرة العامل كلِّه، الحقلُ المحذوف لا يُقرأ إلا في كائن الواجهة الذي يردّه محرّكُه (عضوٌ مُعلَن)، وذلك العضو لا يُقرأ في أيّ موضع،
        والمحرّكُ نفسُه لا يُستعمل إلا بعضوٍ مسمّى (لا تسلسل ولا تعداد ولا وصول محسوب)، والبياناتُ لا تُمرَّر إلا لمحرّكها.
     ③ سلوكاً: المحرّكاتُ تُشغَّل مرتين في vm (البياناتُ كاملةً كما قبل · ومقلَّصةً كما الآن) ويتطابق كلُّ عضوٍ غيرِ محذوف ونتائجُ validate. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { ROOT } from './harness.mjs';
import { traceReads } from './trace_reads.mjs';

const isId = (n, name) => n && n.type === 'Identifier' && n.name === name;
const mem = (n, obj, prop) => n && n.type === 'MemberExpression' && !n.computed && n.property.name === prop && (typeof obj === 'function' ? obj(n.object) : isId(n.object, obj));
const idx = (n, obj) => n && n.type === 'MemberExpression' && n.computed && obj(n.object);
const fnOf = (all, engVar) => { const d = all.find((n) => n.type === 'VariableDeclarator' && n.id.name === engVar); return d.init.callee; };
function traces(ast, all) {
  const S = fnOf(all, 'KIVO_SCOPE'), P = S.params[0].name, out = { 'scope-bindings': {} }, T = out['scope-bindings'];
  const eq = (got, want, what) => assert.deepEqual(got, want, 'تتبّعُ القرّاء · ' + what);
  /* عناصرُ bindings (S.bindings[i] · BYKEY[k]) — الأسماء: bind (evaluate) · b (validate؛ يُستعمل أيضاً لعناصر byResource فالقراءاتُ اتحادُهما) */
  const tb = traceReads(S, (e) => idx(e, (o) => mem(o, P, 'bindings') || isId(o, 'BYKEY')));
  eq(tb.reads, ['dims', 'items', 'key', 'res'], 'bindings[]'); eq(tb.escapes, [], 'bindings[] لا يهرب'); T['bindings[]'] = tb;
  /* عناصرُ byResource (S.byResource[r] · __default__ · extractorFor) — extractorFor يُرجعها فتُتتبَّع نداءاتُها */
  const tr = traceReads(S, (e) => idx(e, (o) => mem(o, P, 'byResource')) || mem(e, (o) => mem(o, P, 'byResource'), '__default__'));
  eq(tr.reads, ['dims', 'items', 'res'], 'byResource.*'); eq(tr.fns, ['extractorFor'], 'byResource.* عبر extractorFor'); eq(tr.escapes.map((x) => x.split('@')[0]), ['ReturnStatement'], 'byResource.* يُرجَع من extractorFor وحده'); T['byResource.*'] = tr;
  /* عناصرُ migration (S.migration[d] → mg) */
  const tm = traceReads(S, (e) => idx(e, (o) => mem(o, P, 'migration'))); eq(tm.reads, ['confidence', 'status'], 'migration.*'); eq(tm.escapes, [], 'migration.*'); T['migration.*'] = tm;
  /* readBindings نفسُه: في المحرّك byResource وحده · وفي العامل byResource وspecial (permv4ReadBindingCheck) */
  const trb = traceReads(S, (e) => mem(e, P, 'readBindings')); 
  const twb = traceReads(ast, (e) => mem(e, 'KIVO_SCOPE', 'readBindings'));
  eq(twb.reads, ['byResource', 'special'], 'KIVO_SCOPE.readBindings في العامل'); eq(twb.escapes, [], 'KIVO_SCOPE.readBindings لا يهرب في العامل');
  T['readBindings'] = { reads: [...new Set(trb.reads.concat(twb.reads))].sort() };
  /* عناصرُ readBindings.byResource — المحرّك: RB (readKeysFor) · RBR[k] (validate) · العامل: RB[name] (permv4ReadBindingCheck) */
  const isRBmap = (o) => mem(o, (x) => mem(x, P, 'readBindings'), 'byResource') || isId(o, 'RBR');
  const tre = traceReads(S, (e) => idx(e, isRBmap));
  eq(tre.reads, ['cls', 'keys', 'routes', 'scope'], 'readBindings.byResource.* في المحرّك'); eq(tre.escapes, [], 'readBindings.byResource.* لا يهرب في المحرّك');
  const wmap = traceReads(ast, (e) => mem(e, (x) => mem(x, 'KIVO_SCOPE', 'readBindings'), 'byResource'));   /* العامل: RB = KIVO_SCOPE.readBindings.byResource */
  const twe = traceReads(ast, (e) => idx(e, (o) => isId(o, 'RB') && wmap.ids.includes('RB')));
  eq(twe.reads, ['keys', 'scope'], 'readBindings.byResource.* في العامل');
  T['readBindings.byResource.*'] = { reads: [...new Set(tre.reads.concat(twe.reads))].sort() };
  /* عناصرُ routes: RB.routes[i] في readKeysFor (.key · .source)؛ والمصفوفةُ كاملةً تُرجَع في ناتج readKeysFor (routes) — وناتجُه في العامل لا يُقرأ منه إلا keys · known */
  const tro = traceReads(S, (e) => idx(e, (o) => mem(o, (x) => isId(x, 'RB'), 'routes'))); eq(tro.reads, ['key', 'source'], 'routes[]');
  const tk = traceReads(ast, (e) => e.type === 'CallExpression' && mem(e.callee, 'KIVO_SCOPE', 'readKeysFor')); eq(tk.reads, ['keys', 'known'], 'ناتجُ readKeysFor في العامل'); eq(tk.escapes, [], 'ناتجُ readKeysFor لا يهرب');
  T['readBindings.byResource.*.routes[]'] = tro;
  /* V7 · 53 (الحالةُ الخاصة): cls · routes[].key · routes[].source تُقرأ في readKeysFor وحدها، ولا تصل إلا إلى حقول ناتجه cls · sources · routes —
     وناتجُه لا يُقرأ منه في العامل إلا keys · known (tk أعلاه)، ولا يُستدعى في المحرّك نفسِه. فهي «تُقرأ لتُرمى»: تُحذف بلا أثرٍ يُرى. */
  const rkf = all.find((n) => n.type === 'FunctionDeclaration' && n.id.name === 'readKeysFor' && n.start > S.start && n.end < S.end);
  assert.ok(rkf, 'readKeysFor في المحرّك');
  const inRkf = (n) => n.start >= rkf.start && n.end <= rkf.end;
  const sub = []; (function w(n) { if (!n || typeof n.type !== 'string') return; sub.push(n); for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(w); else if (v && typeof v.type === 'string') w(v); } })(S.body);
  const rbAlias = tre.isAlias, routesAlias = tro.isAlias;
  for (const n of sub) {
    if (n.type !== 'MemberExpression' || n.computed) continue;
    const onRB = rbAlias(n.object) || (n.object.type === 'MemberExpression' && n.object.computed && isRBmap(n.object.object));
    const onRoute = n.object.type === 'MemberExpression' && n.object.computed && mem(n.object.object, (x) => rbAlias(x), 'routes') || routesAlias(n.object);
    if ((onRB && ['cls', 'routes'].includes(n.property.name)) || (onRoute && ['key', 'source'].includes(n.property.name))) assert.ok(inRkf(n), 'قراءةُ ' + n.property.name + ' خارج readKeysFor');
  }
  /* داخل readKeysFor: sources محليٌّ لا يخرج إلا قيمةَ العضو sources في المردود؛ وRB.cls وRB.routes لا يخرجان إلا عضوَين cls وroutes */
  const rets = sub.filter((n) => n.type === 'ReturnStatement' && inRkf(n) && n.argument && n.argument.type === 'ObjectExpression');
  const fed = {}; rets.forEach((r) => r.argument.properties.forEach((p) => { const v = p.value; const src = isId(v, 'sources') ? 'sources' : (v.type === 'MemberExpression' && !v.computed && rbAlias(v.object) ? v.property.name : null); if (src) fed[p.key.name] = src; }));
  eq(fed, { cls: 'cls', scope: 'scope', sources: 'sources', routes: 'routes' }, 'ما تغذّيه cls · routes · sources في ناتج readKeysFor');
  const keyIds = new Set(sub.filter((n) => n.type === 'Property' && !n.computed).map((n) => n.key)), srcUses = sub.filter((n) => isId(n, 'sources') && inRkf(n) && !keyIds.has(n)).length, srcDecl = sub.filter((n) => n.type === 'VariableDeclarator' && isId(n.id, 'sources') && inRkf(n)).length;
  assert.equal(srcDecl, 1, 'sources معرَّفٌ مرةً');
  const srcUp = sub.filter((n) => n.type === 'MemberExpression' && n.computed && isId(n.object, 'sources') && inRkf(n)).length;
  assert.equal(srcUses, srcDecl + srcUp + 1, 'sources لا يُستعمل إلا مفهرَساً والعضوَ sources في المردود');
  assert.equal(sub.filter((n) => n.type === 'CallExpression' && isId(n.callee, 'readKeysFor')).length, 0, 'readKeysFor لا يُستدعى داخل المحرّك');
  T['readBindings.byResource.*'].readsToDiscard = ['cls'];
  T['readBindings.byResource.*.routes[]'] = Object.assign({}, tro, { readsToDiscard: ['key', 'source'] });
  /* حاوياتُ النطاق المعروضة في واجهة المحرّك لا تُقرأ في العامل (ولا عبر معامل محرّكٍ آخر يتلقّى KIVO_SCOPE) */
  const viaScope = new Set();
  for (const n of all) {
    if (mem(n, 'KIVO_SCOPE', n.property && n.property.name)) viaScope.add(n.property.name);
    if (n.type === 'CallExpression' && n.callee.type === 'FunctionExpression') n.arguments.forEach((a, i) => { if (isId(a, 'KIVO_SCOPE')) { const pn = n.callee.params[i].name; (function w(x) { if (!x || typeof x.type !== 'string') return; if (mem(x, pn, x.property && x.property.name)) viaScope.add(x.property.name); for (const k in x) { const v = x[k]; if (Array.isArray(v)) v.forEach(w); else if (v && typeof v.type === 'string') w(v); } })(n.callee.body); } });
  }
  for (const m of ['bindings', 'byKey', 'byResource', 'migration']) assert.ok(!viaScope.has(m), 'KIVO_SCOPE.' + m + ' يُقرأ في العامل');
  return out;
}


const acorn = createRequire(path.join(ROOT, 'package.json'))('acorn');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SPEC = JSON.parse(rd('workers/bindings/targets.json'));
const ENGINE = { 'guard-bindings': 'KIVO_GUARDS', 'build-bindings': 'KIVO_BUILD', 'scope-bindings': 'KIVO_SCOPE', 'identity-migration': 'KIVO_IDENTITY_MIGRATION' };
/* «أب[].ابن» = الحقلُ في كلِّ عنصرٍ من المصفوفة · «أب.*.ابن» = في كلِّ قيمةٍ من الكائن (كما في tools/generate.py omit_paths) */
const kids = (o, k) => (k === '*' ? Object.values(o) : null);
const drop = (o, ks) => { const k0 = ks[0]; if (k0 === '*') return Object.values(o).forEach((v) => drop(v, ks.slice(1))); const k = k0.replace(/\[\]$/, ''), arr = k0.endsWith('[]'); if (ks.length === 1) { delete o[k]; return; } if (arr) o[k].forEach((x) => drop(x, ks.slice(1))); else drop(o[k], ks.slice(1)); };
const omit = (data, paths) => { const o = JSON.parse(JSON.stringify(data)); for (const p of paths) drop(o, p.split('.')); return o; };
/* المسارُ قائمٌ في كلِّ عنصرٍ وقيمةٍ يمرّ بها، ويُطابَق مرّةً على الأقل */
const count = (x, ks) => { if (!x || typeof x !== 'object') return -1; const k0 = ks[0];
  if (k0 === '*') { let n = 0; for (const v of Object.values(x)) { const c = count(v, ks.slice(1)); if (c < 0) return -1; n += c; } return n; }
  const k = k0.replace(/\[\]$/, ''), arr = k0.endsWith('[]'); if (!(k in x)) return -1; if (ks.length === 1) return arr ? -1 : 1;
  if (arr) { if (!Array.isArray(x[k])) return -1; let n = 0; for (const v of x[k]) { const c = count(v, ks.slice(1)); if (c < 0) return -1; n += c; } return n; }
  return count(x[k], ks.slice(1)); };
const has = (x, ks) => count(x, ks) > 0;
const literal = (part, v) => { const t = rd('workers/parts/' + part), a = t.indexOf('var ' + v + ' = '), b = t.indexOf(';\n', a); assert.ok(a >= 0 && b > a, part + ': حرفيُّ ' + v); return t.slice(a + ('var ' + v + ' = ').length, b); };

test('V7 · 53 ①: حرفيُّ كل وحدةٍ مرجعية = مصدرُها بلا مسارات omit (بايتاً) — والمسارات موجودةٌ في المصدر', () => {
  let dropped = 0;
  for (const t of SPEC.targets) {
    assert.ok(Array.isArray(t.omit) && t.omit.length, t.source + ': omit مُعلَن');
    const src = JSON.parse(rd('workers/bindings/' + t.source + '/data.json'));
    for (const p of t.omit) assert.ok(has(src, p.split('.')), t.source + ': «' + p + '» في المصدر');
    const lit = literal(t.part, t.var), want = JSON.stringify(omit(src, t.omit));
    assert.equal(lit, want, t.part + ' = المصدرُ بلا omit');
    dropped += JSON.stringify(src).length - want.length;
  }
  assert.ok(dropped > 60000, 'المحذوفُ من العامل خاماً ' + dropped);
});

test('V7 · 53 ②: لا قارئَ في العامل لأيّ حقلٍ محذوف (شجرةُ acorn للعامل كلِّه)', () => {
  const W = rd('workers/_worker.js');
  const ast = acorn.parse(W, { ecmaVersion: 'latest', sourceType: 'module', allowReturnOutsideFunction: true, locations: true });
  const parents = new Map(), all = [];
  (function walk(n, p) { if (!n || typeof n.type !== 'string') return; parents.set(n, p); all.push(n); for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === 'string' && walk(x, n)); else if (v && typeof v.type === 'string' && k !== 'loc') walk(v, n); } })(ast, null);
  const at = (n) => 'سطر ' + n.loc.start.line;
  const isMem = (n, objName) => n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && (!objName || n.object.name === objName);
  const dataLits = SPEC.targets.map((t) => all.find((n) => n.type === 'VariableDeclarator' && n.id.name === t.var).init);   /* حرفيّاتُ البيانات نفسُها ليست قارئاً */
  /* V7 · 53 (المرحلة الثانية): تتبّعُ القرّاء لكل حاويةٍ مقروءة فيها حقلٌ محذوف — المحرّكُ والعاملُ كلُّه (tests/unit/trace_reads.mjs).
     لكل حاوية: ما يُقرأ من عناصرها مُعلنٌ هنا حرفاً (يتغيّر ⇒ يفشل الاختبار فيُراجَع)، ولا هروبَ لعنصرٍ كامل إلا ما سُمّي بسببه. */
  const TRACE = traces(ast, all, parents);
  /* المحرّكات: var <ENGINE> = (function (<P>, …) { … return {…}; })(<DATA>, …) */
  for (const t of SPEC.targets) {
    const E = ENGINE[t.source];
    const decl = all.find((n) => n.type === 'VariableDeclarator' && n.id.name === E);
    assert.ok(decl && decl.init.type === 'CallExpression', E + ': IIFE');
    const fn = decl.init.callee, P = fn.params[0].name;
    assert.equal(decl.init.arguments[0].name, t.var, E + ': بياناتُه أوّلُ وسيط');
    /* البياناتُ لا تُذكر إلا في تعريفها ووسيطِ محرّكها */
    const dataRefs = all.filter((n) => n.type === 'Identifier' && n.name === t.var);
    assert.equal(dataRefs.length, 2, t.var + ': يُذكر مرتين فقط (التعريف · وسيطُ المحرّك) — ' + dataRefs.map(at).join('، '));
    /* داخل المحرّك: P لا يُستعمل إلا بعضوٍ مسمّى */
    const inFn = all.filter((n) => n.start >= fn.start && n.end <= fn.end);
    const bare = inFn.filter((n) => n.type === 'Identifier' && n.name === P && parents.get(n) !== fn && !(parents.get(n).type === 'MemberExpression' && parents.get(n).object === n && !parents.get(n).computed));
    assert.deepEqual(bare.map(at), [], E + ': ' + P + ' لا يُمرَّر كاملاً ولا يُعدَّد');
    const exposed = new Set();
    /* قراءاتُ P.<أعلى> في المحرّك: «عرضٌ» = قيمةُ عضوٍ في كائن الواجهة المردود (P.x أو P.x || null) — ويُجمع اسمُ العضو */
    const exposure = (top) => inFn.filter((n) => isMem(n, P) && n.property.name === top).map((r) => {
      let v = r, up = parents.get(r); if (up.type === 'LogicalExpression' && up.left === r) { v = up; up = parents.get(up); }
      return up.type === 'Property' && up.value === v && parents.get(up).type === 'ObjectExpression' && parents.get(parents.get(up)).type === 'ReturnStatement' ? (up.key.name || up.key.value) : null;
    });
    for (const p of t.omit) {
      const ks = p.split('.'), top = ks[0].replace(/\[\]$/, ''), ex = exposure(top);
      if (ks.length === 1 || ex.every(Boolean)) {
        /* الحقلُ (أو حاويتُه) لا يُقرأ في المحرّك إلا عرضاً في كائن الواجهة — والعضوُ المعروض يُفحص أدناه ألّا يُقرأ */
        assert.ok(ex.every(Boolean), E + ': ' + P + '.' + top + ' يُقرأ خارج كائن الواجهة');
        ex.forEach((m) => exposed.add(m));
      } else {
        /* الحاويةُ مقروءة في المحرّك: تتبّعُ القرّاء (TRACE أدناه) يغطّي حاويةَ الحقل، والحقلُ ليس فيما يُقرأ منها */
        const cont = ks.slice(0, -1).join('.'), leaf = ks[ks.length - 1], tr = (TRACE[t.source] || {})[cont];
        assert.ok(tr, E + ': «' + p + '» بلا تتبّعٍ لقرّاء حاويته ' + cont);
        assert.ok((!tr.reads.includes(leaf) || (tr.readsToDiscard || []).includes(leaf)) && !tr.reads.includes('[computed]'), E + ': «' + p + '» يُقرأ (' + tr.reads.join(' · ') + ')');
      }
    }
    /* عضوُ الواجهة الذي يحمل حقلاً محذوفاً لا يُقرأ؛ والمحرّكُ لا يُستعمل إلا بعضوٍ مسمّى (أو وسيطاً لمحرّكٍ آخر نفحص معامله بالقاعدة نفسها) */
    const users = [];
    for (const n of all) if (n.type === 'Identifier' && n.name === E && n !== decl.id) users.push(n);
    const aliases = [];
    for (const u of users) {
      const up = parents.get(u);
      if (up.type === 'MemberExpression' && up.object === u && !up.computed) { assert.ok(!exposed.has(up.property.name), E + '.' + up.property.name + ' (حقلٌ محذوف) يُقرأ — ' + at(u)); continue; }
      if (up.type === 'CallExpression' && up.arguments.includes(u) && up.callee.type === 'FunctionExpression') { aliases.push(up.callee.params[up.arguments.indexOf(u)].name + '@' + up.callee.start); continue; }
      assert.fail(E + ' يُستعمل كاملاً — ' + at(u));
    }
    for (const a of aliases) {
      const [name, start] = a.split('@'), f = all.find((n) => n.start === +start && n.type === 'FunctionExpression');
      for (const n of all) if (n.start >= f.start && n.end <= f.end && n.type === 'Identifier' && n.name === name && !f.params.includes(n)) {
        const up = parents.get(n);
        assert.ok(up.type === 'MemberExpression' && up.object === n && !up.computed && !exposed.has(up.property.name), E + ' (باسم ' + name + ') يُستعمل كاملاً أو بعضوٍ محذوف — ' + at(n));
      }
    }
  }
});

test('V7 · 53 ③: المحرّكاتُ بالبيانات الكاملة (قبل) = بالمقلَّصة (الآن) في كل عضوٍ باقٍ ونتائجِ validate', () => {
  const parts = ['004-registry-2.js', '006-guard-bindings-2.js', '008-kivo-build-2.js', '010-kivo-scope-2.js', '014-identity-migration-2.js'];
  const run = (full) => {
    let code = parts.map((p) => rd('workers/parts/' + p)).join('\n');
    if (full) for (const t of SPEC.targets) code = code.replace('var ' + t.var + ' = ' + literal(t.part, t.var) + ';', () => 'var ' + t.var + ' = ' + JSON.stringify(JSON.parse(rd('workers/bindings/' + t.source + '/data.json'))) + ';');
    const ctx = { console }; vm.createContext(ctx);
    vm.runInContext(code + '\n;this.__E = { KIVO_GUARDS, KIVO_BUILD, KIVO_SCOPE, KIVO_IDENTITY_MIGRATION, sv: KIVO_SCOPE.validate(), iv: KIVO_IDENTITY_MIGRATION.validate(), rv: KIVO_REGISTRY.validate() };', ctx);
    return ctx.__E;
  };
  const A = run(true), B = run(false), plain = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
  assert.notEqual(rd('workers/parts/006-guard-bindings-2.js').length, 0);
  for (const k of ['sv', 'iv', 'rv']) assert.deepEqual(plain(B[k]), plain(A[k]), 'validate ' + k);
  assert.equal(B.sv.ok && B.iv.ok && B.rv.ok, true, 'validate ok');
  for (const t of SPEC.targets) {
    const E = ENGINE[t.source], a = A[E], b = B[E];
    assert.deepEqual(Object.keys(b), Object.keys(a), E + ': أعضاءُ الواجهة نفسُها');
    const gone = [], src0 = JSON.parse(rd('workers/bindings/' + t.source + '/data.json'));
    for (const m of Object.keys(a)) {
      if (typeof a[m] === 'function') continue;
      if (m === 'byKey' && t.source === 'scope-bindings') {   /* BYKEY = عناصرُ bindings بمفاتيحها — نفسُ العناصر بعد omit */
        const ob = omit(src0, t.omit.filter((p) => p.startsWith('bindings[].'))).bindings; assert.deepEqual(plain(b[m]), plain(Object.fromEntries(ob.map((x) => [x.key, x]))), E + '.byKey'); continue;
      }
      const nested = t.omit.filter((p) => p.includes('.') && p.split('.')[0].replace(/\[\]$/, '') === m && JSON.stringify(plain(a[m])) === JSON.stringify(src0[m]));
      if (nested.length) { assert.deepEqual(plain(b[m]), omit({ [m]: plain(a[m]) }, nested.map((p) => p.replace(/^[^.\[]+/, m)))[m], E + '.' + m + ' = الأصلُ بلا ' + nested.join(' · ')); continue; }
      if (b[m] === undefined && a[m] !== undefined) { gone.push(m); continue; }
      if (b[m] === null && a[m] !== null && t.omit.length) { gone.push(m); continue; }
      assert.deepEqual(plain(b[m]), plain(a[m]), E + '.' + m);
    }
    /* ما غاب هو بالضبط أعضاءُ الحقول المحذوفة (لا عضوَ آخر) */
    const src = JSON.parse(rd('workers/bindings/' + t.source + '/data.json'));
    for (const m of gone) assert.ok(t.omit.some((p) => !p.includes('.') && JSON.stringify(plain(a[m])) === JSON.stringify(src[p])), E + '.' + m + ' غاب وليس حقلاً محذوفاً');
  }
  /* عيّنةُ سلوك: الحكمُ والمصنِّفُ والعلامات وسياسةُ الاستعادة وبصمةُ الهوية */
  const S = (E) => JSON.stringify([E.KIVO_GUARDS.covers, E.KIVO_GUARDS.decide('dstats.haram.entry', { super: false, sheet: { 'dstats/haram': ['view', 'add'] } }),
    E.KIVO_BUILD.markers({ x: { op: 'backup.restore', reason: 'r' } }, { x: 1 }), E.KIVO_BUILD.restorePolicy(false, true, true, 'سبب'), E.KIVO_BUILD.LENSES,
    (({ known, keys }) => ({ known, keys }))(E.KIVO_SCOPE.readKeysFor('bassam_plan_v1')),   /* ما يقرؤه العاملُ من الناتج (تتبّعُ ②) */ E.KIVO_IDENTITY_MIGRATION.sha256Hex('nx|d|n|k'), E.KIVO_IDENTITY_MIGRATION.NEAR]);
  assert.equal(S(B), S(A));
});
