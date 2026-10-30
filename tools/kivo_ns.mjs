#!/usr/bin/env node
/* KIVO_258 · AUD-016 (ENG-07) — واجهةٌ عامة واحدة: window.KIVO بدل ~90 معرّفاً على window، مع توافقٍ خلفي كامل.
   (١) الطبقة: src/core/005-kivo-ns.js (أوّلُ كتلة) تعرّف window.KIVO (غيرَ قابلٍ للعدّ ولا للكتابة) وتجعل كلَّ اسمٍ قديم على window
       موصِّلاً غيرَ قابلٍ للعدّ إلى KIVO[الاسم] (قراءةً وكتابة) — بعد نقل أيّ قيمةٍ سبقتها إليه؛ فـwindow.X ≡ KIVO.X في كل وقتٍ ومن أيّ شيفرة
       (الاختبارات · الحزم المولَّدة عند البناء · الصفحاتُ الكسولة · وحدةُ التحكم).
   (٢) المصدر: كلُّ «window.X» (X من الأسماء) في كتل الواجهة ومنطق الوحدات ومنطق الغلاف يصير «KIVO.X» — بتحليل AST (window العامّ وحده،
       لا المظلَّل)؛ فلا يبقى في المصدر تعريفٌ عامّ إلا KIVO (والبيانُ المحقون من الخادم __BS_BOOT · وتجاوزا fetch/print للمتصفح).
   البرهان (--check): الطبقةُ = التوليدُ بايتاً · ولكل ملفٍّ في نطاق التحويل: (أ) الكتابةُ تامّةٌ ودقيقة — إعادةُ الكتابة فوق صورته القانونية
   (ردُّ «KIVO.X» و«<مستعار>.X» إلى «window.X») تعيده بايتاً، فلا «window.X» باقٍ لاسمٍ من الأسماء ولا «KIVO.X» زائد؛ (ب) صورتُه القانونية = صورةُ
   المرجع حرفاً (فالفرقُ الوحيد تهجئةُ الوصول، وهما متكافئان بحكم الطبقة) — إلا ملفاتٍ معلنةً في spec.after حُرّرت يدوياً بعد التحويل
   (يُثبت فرقُها القانونيّ عن الإصدار السابق ببصمةٍ مراجَعة في اختبار المصدر).
     node tools/kivo_ns.mjs tools/kivo_ns.json [--write|--check]   (KIVO_NS_REF يبدّل المرجع)
     node tools/kivo_ns.mjs tools/kivo_ns.json --canon <REV> <file…>   ⇒ JSON {file: {ref: قانونيُّ REV:file, cur: قانونيُّ الملف}}
     node tools/kivo_ns.mjs tools/kivo_ns.json --list   ⇒ JSON {ref, names, files (المعاد كتابتُها), after} */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(ROOT + '/package.json'); const acorn = req('acorn'); const eslintScope = req('eslint-scope');
const [SPEC, MODE] = [process.argv[2], process.argv[3] || ''];
const spec = JSON.parse(fs.readFileSync(path.resolve(ROOT, SPEC), 'utf8'));
const REF = process.env.KIVO_NS_REF || spec.ref;
const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
const refText = (f) => { try { return git(['show', REF + ':' + f]); } catch (e) { return null; } };
/* KIVO_259 · AUD-029: المستودعُ الرسمي وحده (تصديرٌ بلا تاريخ git) — المرجعُ غيرُ متاح: الأسماءُ من الطبقة نفسِها والملفاتُ من الشجرة الحالية،
   ويُفحص ما لا يحتاج التاريخ: الطبقة = التوليد · لا وصولَ window.X باقٍ في أيّ ملفٍّ لاسمٍ من الأسماء. برهانُ «الصورةُ القانونية = المرجع» تاريخيٌّ
   (تحويلُ 258) يُشغَّل في المستودع الانتقالي بتاريخه (k258src · k259src · البناء). */
let HAVE_REF = true; try { git(['rev-parse', '--verify', '--quiet', REF + '^{commit}']); } catch (e) { HAVE_REF = false; }
const curText = (f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return null; } };
const lsTree = (dir) => HAVE_REF ? git(['ls-tree', '-r', '--name-only', REF, dir]).split('\n') :
  (function walkd(d) { const out = []; for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const q = d + '/' + e.name; if (e.isDirectory()) out.push(...walkd(q)); else out.push(q); } return out; })(dir);
const baseText = HAVE_REF ? refText : curText;
const blocks = JSON.parse(baseText('src/blocks.json'));
/* الملفاتُ المعاد كتابتُها: كتلُ js (عدا المورَّد ومحمِّل الصفحات الذي يُعاد بناؤه عند التركيب) · منطقُ الوحدات · منطقُ الغلاف */
const SKIP = new Set(spec.skip || []);
const files = blocks.blocks.filter(b => (b.kind === 'js' || b.kind === 'inline-js') && !SKIP.has(b.id)).map(b => 'src/' + b.id)
  .concat(lsTree('src/modules').filter(f => /\/logic\.js$/.test(f)));
/* الأسماء: كلُّ X يُسنَد إليه «window.X = …» في المصدر أو يولّده البناء (spec.extra) — عدا المستثنى (واجهاتُ المتصفح · بيانُ الخادم) */
const EXCL = new Set(spec.exclude || []);
const NAMES = new Set(spec.extra || []);
const astOf = (src) => acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', ranges: true, allowReturnOutsideFunction: true });
const walk = (n, f) => { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(x => walk(x, f)); f(n); for (const k of Object.keys(n)) if (k !== 'loc' && k !== 'range') walk(n[k], f); };
const isWin = (o) => o && o.type === 'Identifier' && o.name === 'window';
const allSrc = HAVE_REF ? git(['ls-tree', '-r', '--name-only', REF, 'src']).split('\n').filter(f => /\.js$/.test(f) && !f.startsWith('src/pages/')) : [];
/* أسماءٌ مستعارةٌ لـwindow (var W = window · لا تُعاد كتابتُها) — تُعامَل معاملتَه */
function aliasesOf(a) {
  const sm = eslintScope.analyze(a, { ecmaVersion: 2022 }); const out = new Set();
  for (const sc of sm.scopes) for (const v of sc.variables) { const d = v.defs[0]; if (!d || v.defs.length !== 1 || d.type !== 'Variable' || !d.node.init || d.node.init.type !== 'Identifier' || d.node.init.name !== 'window') continue;
    if (v.references.some(r => r.isWrite() && !r.init)) continue; for (const r of v.references) out.add(r.identifier.range[0]); }
  return out;
}
for (const f of allSrc) {
  const t = refText(f); if (t == null) continue; let a; try { a = astOf(t); } catch (e) { continue; }
  const al = aliasesOf(a);
  walk(a, (n) => {
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && !n.left.computed && n.left.object.type === 'Identifier' && al.has(n.left.object.range[0])) NAMES.add(n.left.property.name);
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && isWin(n.left.object) && !n.left.computed) NAMES.add(n.left.property.name);
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.object.name === 'Object' && n.callee.property.name === 'defineProperty' && isWin(n.arguments[0]) && n.arguments[1] && n.arguments[1].type === 'Literal') NAMES.add(n.arguments[1].value);
  });
}
for (const x of EXCL) NAMES.delete(x);
if (!HAVE_REF) { const m = /var N = (\[[^\]]*\]);/.exec(curText('src/core/005-kivo-ns.js') || ''); NAMES.clear(); for (const x of (m ? JSON.parse(m[1]) : [])) NAMES.add(x); }
/* Retired workflows must not regain global aliases from a historical reference
   or the previous generated layer. Their replacements have explicit APIs. */
for (const x of spec.retired || []) NAMES.delete(x);
const LIST = [...NAMES].sort();
/* إعادةُ الكتابة: window (العامُّ غيرُ المظلَّل) . X ⇒ KIVO . X */
function rewrite(src, f) {
  const a = astOf(src); const sm = eslintScope.analyze(a, { ecmaVersion: 2022 });
  const shadowed = new Set();
  for (const sc of sm.scopes) for (const r of sc.references) if (r.identifier.name === 'window' && r.resolved) shadowed.add(r.identifier.range[0]);
  const hits = [];
  const al = aliasesOf(a);
  walk(a, (n) => { if (n.type === 'MemberExpression' && !n.computed && ((isWin(n.object) && !shadowed.has(n.object.range[0])) || (n.object.type === 'Identifier' && al.has(n.object.range[0]))) && NAMES.has(n.property.name)) hits.push(n.object.range);
    /* Object.defineProperty(window, "X", …) لاسمٍ من الأسماء ⇒ على KIVO (وإلا استبدل الخاصيةُ الجديدة موصِّلَ الطبقة فانفصل window.X عن KIVO.X) */
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.object.name === 'Object' && n.callee.property.name === 'defineProperty' && isWin(n.arguments[0]) && !shadowed.has(n.arguments[0].range[0]) && n.arguments[1] && n.arguments[1].type === 'Literal' && NAMES.has(n.arguments[1].value)) hits.push(n.arguments[0].range); });
  let s = src; for (const [x, y] of hits.sort((p, q) => q[0] - p[0])) s = s.slice(0, x) + 'KIVO' + s.slice(y);
  return { text: s, n: hits.length };
}
/* الصورةُ القانونية: KIVO.X و<مستعار>.X وwindow.X (X من الأسماء) كلُّها window.X — والطبقةُ تجعلها متكافئةً قراءةً وكتابة */
function canonical(src) {
  const a = astOf(src); const al = aliasesOf(a); const hits = [];
  const objOk = (o) => o && o.type === 'Identifier' && (o.name === 'KIVO' || o.name === 'window' || al.has(o.range[0]));
  walk(a, (n) => { if (n.type === 'MemberExpression' && !n.computed && objOk(n.object) && NAMES.has(n.property.name)) hits.push(n.object.range);
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.object.name === 'Object' && n.callee.property.name === 'defineProperty' && objOk(n.arguments[0]) && n.arguments[1] && n.arguments[1].type === 'Literal' && NAMES.has(n.arguments[1].value)) hits.push(n.arguments[0].range); });
  let s = src; for (const [x, y] of hits.sort((q, r) => r[0] - q[0])) s = s.slice(0, x) + 'window' + s.slice(y); return s;
}
function shim() {
  const L = [];
  L.push('/* ═══ KIVO — الواجهةُ العامة الواحدة (KIVO_258 · AUD-016 · ENG-07) ═══');
  L.push('   كلُّ ما تعرّفه المنصةُ للتشارك بين كتلها ووحداتها يعيش في window.KIVO (غيرِ قابلٍ للعدّ ولا للكتابة). الأسماءُ القديمة على window');
  L.push('   (' + LIST.length + ' اسماً) باقيةٌ توافقاً خلفياً: موصِّلاتٌ غيرُ قابلةٍ للعدّ إلى KIVO[الاسم] قراءةً وكتابة — فـwindow.X ≡ KIVO.X دائماً.');
  L.push('   تُحمَّل أوّلاً، وتنقل أيَّ قيمةٍ سبقتها (سكربتٌ مضمَّن · تهيئةُ اختبار) قبل تركيب الموصِّل. مولَّدةٌ بـtools/kivo_ns.mjs — لا تُحرَّر يدوياً. */');
  L.push('(function () {');
  L.push('  "use strict";');
  L.push('  var K = {};');
  /* KIVO_263 · AUD-007: القائمةُ ثمانيةَ أسماءٍ في السطر (كانت سطراً واحداً 1,570 بايتاً) — المحتوى نفسُه، JSON صالحٌ متعدّدُ الأسطر */
  const rows = []; for (let i = 0; i < LIST.length; i += 8) rows.push('    ' + LIST.slice(i, i + 8).map(x => JSON.stringify(x)).join(', '));
  L.push('  var N = [\n' + rows.join(',\n') + '\n  ];');
  L.push('  for (var i = 0; i < N.length; i++) {');
  L.push('    (function (n) {');
  L.push('      if (Object.prototype.hasOwnProperty.call(window, n)) { try { K[n] = window[n]; } catch (e) { /* موصِّلٌ سابقٌ رمى — تبدأ القيمةُ فارغة */ } }');
  L.push('      try { Object.defineProperty(window, n, { configurable: true, enumerable: false, get: function () { return K[n]; }, set: function (v) { K[n] = v; } }); }');
  L.push('      catch (e) { /* خاصيةٌ غيرُ قابلةٍ للضبط — يبقى الاسمُ القديمُ كما هو، وKIVO يقرؤه */ Object.defineProperty(K, n, { enumerable: true, get: function () { return window[n]; }, set: function (v) { window[n] = v; } }); }');
  L.push('    })(N[i]);');
  L.push('  }');
  L.push('  Object.defineProperty(window, "KIVO", { value: K, enumerable: false, configurable: false, writable: false });');
  L.push('})();');
  return L.join('\n') + '\n';
}
const OUT = 'src/core/005-kivo-ns.js';
const plan = files.map(f => { const t = HAVE_REF ? refText(f) : canonical(curText(f) || ''); return t == null ? null : { f, ...rewrite(t, f) }; }).filter(Boolean);
/* الإخراجُ إلى أنبوب غيرُ متزامن في Node: الخروجُ بعد تمام الكتابة لا قبله (وإلا اقتُطع JSON الكبير) */
const emit = (o) => process.stdout.write(JSON.stringify(o), () => process.exit(0));
if (MODE === '--list') emit({ ref: REF, names: LIST, files: plan.filter(p => p.n).map(p => p.f), after: spec.after || [] });
else if (MODE === '--canon') {
  const rev = process.argv[4]; const out = {};
  for (const f of process.argv.slice(5)) { let t = null; try { t = git(['show', rev + ':' + f]); } catch (e) { t = null; }
    const c = fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : null;
    out[f] = { ref: t == null ? null : canonical(t), cur: c == null ? null : canonical(c) }; }
  emit(out);
}
else if (MODE === '--check') {
  const errs = []; const AFTER = new Set(spec.after || []); const after = [];
  if (!fs.existsSync(path.join(ROOT, OUT)) || fs.readFileSync(path.join(ROOT, OUT), 'utf8') !== shim()) errs.push(OUT + ' ≠ التوليد');
  for (const p of plan) {
    const cur = fs.readFileSync(path.join(ROOT, p.f), 'utf8'); const cc = canonical(cur);
    if (rewrite(cc, p.f).text !== cur) errs.push(p.f + ': إعادةُ الكتابة فوق صورته القانونية لا تعيده (وصولٌ window.X باقٍ أو KIVO.X زائد)');
    if (HAVE_REF && cc !== canonical(refText(p.f))) { if (AFTER.has(p.f)) after.push(p.f); else errs.push(p.f + ': صورتُه القانونية ≠ ' + REF + ' (تغييرٌ غيرُ معلن في spec.after)'); }
  }
  const unused = HAVE_REF ? [...AFTER].filter(f => !after.includes(f)) : []; if (unused.length) errs.push('spec.after بلا فرق: ' + unused.join(','));
  console.log((errs.length ? '✘ ' : '✔ ') + 'الطبقة (' + LIST.length + ' اسماً) و' + plan.filter(p => p.n).length + ' ملفاً معاد كتابتُه (' + plan.reduce((a, p) => a + p.n, 0) + ' وصولاً): الكتابةُ تامّةٌ ودقيقة · ' + (HAVE_REF ? 'والصورةُ القانونية = ' + REF.slice(0, 12) + ' حرفاً' : 'المرجعُ ' + REF.slice(0, 12) + ' غيرُ متاح (بلا تاريخ git) — برهانُ المطابقة في المستودع الانتقالي') + (after.length ? ' عدا المعلن يدوياً بعد التحويل (' + after.join(', ') + ')' : '') + (errs.length ? ' · ' + errs.slice(0, 5).join(' | ') : ''));
  process.exit(errs.length ? 1 : 0);
}
else {
  if (process.env.KIVO_NS_LIST) console.log(LIST.join(" "));
  console.log("الأسماء: " + LIST.length + ' · ملفاتٌ تتغيّر: ' + plan.filter(p => p.n).length + ' · وصولاتٌ تُعاد كتابتُها: ' + plan.reduce((a, p) => a + p.n, 0));
  if (MODE === '--layer') { fs.writeFileSync(path.join(ROOT, OUT), shim()); console.log('✎ ' + OUT + ' (الطبقةُ وحدها — الملفاتُ المعاد كتابتُها لا تُمسّ: بعضُها حُرّر بعد التحويل · spec.after)'); }
  if (MODE === '--write') {
    fs.writeFileSync(path.join(ROOT, OUT), shim());
    for (const p of plan) if (p.n) fs.writeFileSync(path.join(ROOT, p.f), p.text);
    console.log('✎ ' + OUT + ' + ' + plan.filter(p => p.n).length + ' ملفاً');
  }
}
