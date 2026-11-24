/* V7 · 53 (تقليصُ صفحة الإعدادات — مراجعةُ REVIEW.md البند ٢: هامشُ page:Admin ≥ 4٪ بلا رفع السقف وبلا تغيير سلوك):
   src/modules/admin/meta.json "minifyIdentifiers": true ⇒ tools/page_modules.py يضيف --minify-identifiers لـesbuild (إعادةُ تسمية الروابط المحلية).
   البرهان (هنا): منطقُ الصفحة المولَّد (src/pages/Admin.dc.html) يُقارن بالمنطق نفسِه مصغَّراً بلا إعادة التسمية، بشجرتَي acorn متوازيتين:
     · كلُّ عقدةٍ بنوعها وكلُّ قيمةٍ ثابتة (نصٌّ · عدد · قالب · تعبيرٌ نمطي · مشغّل) متطابقة؛
     · أسماءُ الخصائص (a.b · {b: …} · المختصر {b} · أسماءُ الدوال في الصنف) متطابقة — فلا يتغيّر ما يُقرأ بالاسم؛
     · المعرّفُ غيرُ المعرَّف في الملف (عامٌّ: KIVO · React · window · this.… · DCLogic) لا يُعاد تسميتُه؛
     · والأسماءُ العامة المستعملة في الملف هي نفسُها قبلُ وبعدُ (لا يلتقط اسمٌ محليٌّ جديد اسماً عامّاً). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { ROOT, SRC, PYTHON } from './harness.mjs';

const req = createRequire(path.join(ROOT, 'package.json')), acorn = req('acorn'), esbuild = req('esbuild');
const O = { ecmaVersion: 'latest', allowReturnOutsideFunction: true };

/* المنطقُ قبل التصغير كما يجمعه page_modules.join (logic.js + أجزاؤه + الأصولُ المضمَّنة) */
function sourceLogic() {
  const code = 'import sys, json, os; sys.path.insert(0, os.path.join(sys.argv[1], "tools")); import page_modules as P\n' +
    'd = os.path.join(sys.argv[2], "modules", "admin"); m = json.load(open(os.path.join(d, "meta.json"), encoding="utf-8"))\n' +
    'sys.stdout.reconfigure(encoding="utf-8"); sys.stdout.write(P.inline_assets(P.read_logic(d, m), os.path.join(sys.argv[2], "modules")))';
  const r = spawnSync(PYTHON, ['-c', code, ROOT, SRC], { encoding: 'utf8', maxBuffer: 1 << 26 });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}
function builtLogic() {
  const meta = JSON.parse(fs.readFileSync(path.join(SRC, 'modules', 'admin', 'meta.json'), 'utf8'));
  const page = fs.readFileSync(path.join(SRC, 'pages', 'Admin.dc.html'), 'utf8');
  const a = page.indexOf(meta.scriptTag) + meta.scriptTag.length, b = page.lastIndexOf(meta.post);
  return page.slice(a, b);
}
/* الأسماءُ المعرَّفة في الملف (أيُّ ربطٍ في أيّ نطاق) */
function declared(ast) {
  const out = new Set();
  const pat = (p) => { if (!p) return; if (p.type === 'Identifier') out.add(p.name); else if (p.type === 'ObjectPattern') p.properties.forEach((x) => pat(x.type === 'RestElement' ? x.argument : x.value)); else if (p.type === 'ArrayPattern') p.elements.forEach(pat); else if (p.type === 'RestElement') pat(p.argument); else if (p.type === 'AssignmentPattern') pat(p.left); };
  (function w(n) { if (!n || typeof n.type !== 'string') return;
    if (n.type === 'VariableDeclarator') pat(n.id);
    if (/Function/.test(n.type)) { if (n.id) out.add(n.id.name); n.params.forEach(pat); }
    if (n.type === 'ClassDeclaration' && n.id) out.add(n.id.name);
    if (n.type === 'CatchClause') pat(n.param);
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(w); else if (v && typeof v.type === 'string') w(v); } })(ast);
  return out;
}

test('V7 · 53: منطقُ Admin المولَّد = المنطقُ نفسُه بإعادة تسمية الروابط المحلية وحدها (خصائصُ · قيمٌ · أسماءٌ عامة كما هي)', () => {
  const meta = JSON.parse(fs.readFileSync(path.join(SRC, 'modules', 'admin', 'meta.json'), 'utf8'));
  assert.equal(meta.minifyIdentifiers, true, 'الصفحةُ تعلن إعادةَ تسمية المعرّفات');
  const ref = esbuild.transformSync(sourceLogic(), { minifyWhitespace: true, minifySyntax: true, target: 'es2020', charset: 'utf8' }).code;
  const got = builtLogic();
  assert.ok(got.length < ref.length, 'أصغر: ' + got.length + ' < ' + ref.length);
  const A = acorn.parse(ref, O), B = acorn.parse(got, O), declA = declared(A);
  let renamed = 0, nodes = 0;
  const fail = (a, why) => assert.fail(why + ' @' + a.start + ': ' + ref.slice(a.start, a.start + 80));
  function ident(a, b) {
    if (a.name === b.name) return;
    if (!declA.has(a.name)) fail(a, 'اسمٌ عامّ أُعيدت تسميتُه ' + a.name + ' → ' + b.name);
    renamed++;
  }
  (function w(a, b, ctx) {
    nodes++;
    if (a.type !== b.type) fail(a, 'نوعٌ مختلف ' + a.type + ' ≠ ' + b.type);
    for (const k of Object.keys(a)) {
      if (k === 'start' || k === 'end' || k === 'raw' || k === 'loc') continue;
      const x = a[k], y = b[k];
      if (Array.isArray(x)) { if (!Array.isArray(y) || x.length !== y.length) fail(a, 'طولٌ مختلف في ' + k); x.forEach((xi, i) => xi && typeof xi.type === 'string' ? w(xi, y[i], a.type + '.' + k) : assert.deepEqual(y[i], xi)); continue; }
      if (x && typeof x.type === 'string') {
        const isProp = (a.type === 'MemberExpression' && k === 'property' && !a.computed) || ((a.type === 'Property' || a.type === 'MethodDefinition' || a.type === 'PropertyDefinition') && k === 'key' && !a.computed);
        if (isProp && x.type === 'Identifier') { if (!(y && y.type === 'Identifier' && y.name === x.name)) fail(x, 'اسمُ خاصيةٍ تغيّر ' + x.name); continue; }
        if (a.type === 'Property' && a.shorthand && k === 'value' && x.type === 'Identifier') { ident(x, y); continue; }
        w(x, y, a.type + '.' + k); continue;
      }
      if (k === 'shorthand' && a.type === 'Property') continue;   /* {b} ⇒ {b: e} بعد إعادة التسمية — الاسمُ (key) مفحوصٌ أعلاه */
      if (k === 'name' && a.type === 'Identifier') { ident(a, b); continue; }
      if (x instanceof RegExp || y instanceof RegExp) { if (String(x) !== String(y)) fail(a, 'تعبيرٌ نمطيٌّ مختلف'); continue; }
      if (typeof x === 'object' && x !== null) { if (JSON.stringify(x) !== JSON.stringify(y)) fail(a, 'قيمةٌ مختلفة في ' + a.type + '.' + k); continue; }
      if (x !== y) fail(a, 'قيمةٌ مختلفة في ' + a.type + '.' + k + ': ' + JSON.stringify(x) + ' ≠ ' + JSON.stringify(y));
    }
  })(A, B, 'Program');
  /* لا يلتقط اسمٌ جديد اسماً عامّاً مستعملاً في الملف */
  const globalsA = new Set(), globalsB = new Set();
  const refs = (ast, set, decl) => (function w(n, parent, key) { if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Identifier' && !decl.has(n.name) && !((parent && parent.type === 'MemberExpression' && key === 'property' && !parent.computed) || (parent && /Property|MethodDefinition/.test(parent.type) && key === 'key' && !parent.computed))) set.add(n.name);
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach((x) => w(x, n, k)); else if (v && typeof v.type === 'string') w(v, n, k); } })(ast, null, '');
  refs(A, globalsA, declA); refs(B, globalsB, declared(B));
  assert.deepEqual([...globalsB].sort(), [...globalsA].sort(), 'الأسماءُ العامة نفسُها (لا التقاط)');
  assert.ok(renamed > 1000 && nodes > 30000, 'أُعيدت تسميةُ ' + renamed + ' موضعاً في ' + nodes + ' عقدة');
});
