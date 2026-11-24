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

const acorn = createRequire(path.join(ROOT, 'package.json'))('acorn');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SPEC = JSON.parse(rd('workers/bindings/targets.json'));
const ENGINE = { 'guard-bindings': 'KIVO_GUARDS', 'build-bindings': 'KIVO_BUILD', 'scope-bindings': 'KIVO_SCOPE', 'identity-migration': 'KIVO_IDENTITY_MIGRATION' };
/* «أب[].ابن» = الحقلُ في كلِّ عنصرٍ من المصفوفة (كما في tools/generate.py omit_paths) */
const drop = (o, ks) => { const k = ks[0].replace(/\[\]$/, ''), arr = ks[0].endsWith('[]'); if (ks.length === 1) { delete o[k]; return; } if (arr) o[k].forEach((x) => drop(x, ks.slice(1))); else drop(o[k], ks.slice(1)); };
const omit = (data, paths) => { const o = JSON.parse(JSON.stringify(data)); for (const p of paths) drop(o, p.split('.')); return o; };
const has = (x, ks) => { if (!ks.length) return true; const k = ks[0].replace(/\[\]$/, ''), arr = ks[0].endsWith('[]'); if (!x || typeof x !== 'object' || !(k in x)) return false; if (ks.length === 1) return !arr; return arr ? Array.isArray(x[k]) && x[k].length > 0 && x[k].every((y) => has(y, ks.slice(1))) : has(x[k], ks.slice(1)); };
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
        /* الحاويةُ مقروءة (readBindings): الحقلُ المتداخل لا يُذكر اسمُه عضواً ولا نصّاً في أيّ موضع */
        const name = ks[ks.length - 1];
        const hits = all.filter((n) => !dataLits.some((d) => n.start >= d.start && n.end <= d.end) && ((n.type === 'MemberExpression' && !n.computed && n.property.name === name) || (n.type === 'Literal' && n.value === name) || (n.type === 'Property' && (n.key.name === name || n.key.value === name))));
        assert.deepEqual(hits.map(at), [], E + ': «' + p + '» يُقرأ');
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
    E.KIVO_SCOPE.readKeysFor('bassam_plan_v1'), E.KIVO_IDENTITY_MIGRATION.sha256Hex('nx|d|n|k'), E.KIVO_IDENTITY_MIGRATION.NEAR]);
  assert.equal(S(B), S(A));
});
