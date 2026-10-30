#!/usr/bin/env node
/* KIVO_257 · AUD-010 — تقسيمُ كتلةٍ عميلةٍ واحدة (IIFE) إلى ملفاتٍ بحسب المسؤولية، كلٌّ منها IIFE مستقلٌّ صالحٌ للتحليل وحده،
   والتبعياتُ بينها صريحةٌ في رأس كلّ ملف — بلا تغييرٍ في السلوك:
     · الأقسامُ تُقطع عند لافتاتٍ معلنة (spec) — كلُّ جملةٍ عُليا تقع كاملةً في جزءٍ واحد (وإلا تُرفض)؛
     · ما يعرّفه جزءٌ ويستعمله غيرُه يُصدَّر في آخر الجزء إلى مساحةٍ داخلية واحدة (window.__BS_I · غيرُ قابلةٍ للعدّ)؛
     · الاستيرادُ من جزءٍ سابق: «var X = I.X» (الدالةُ نفسُها والكائنُ نفسُه — الهويةُ محفوظة)؛
     · المرجعُ الأماميّ (إلى جزءٍ لاحق): دالةٌ وسيطة تستدعي الأصلَ وقتَ النداء — ويُرفض إن كان المرجعُ يُنفَّذ لحظةَ التحميل؛
     · المتغيّرُ الذي تُعاد كتابتُه ويُقرأ عبر الأجزاء: موصِّلٌ (get/set) على المساحة الداخلية، ومراجعُه في الأجزاء الأخرى تصير «I.X»؛
     · الخروجُ المبكّر للجزء الأول (تعذّرُ التخزين) يُعلَّم «I.dead» فتخرج الأجزاءُ التالية أيضاً — كما كانت تخرج الـIIFE الواحدة.
   الاستعمال:  node tools/split_iife.mjs <spec.json> [--check]
     spec: { "source": "src/auth/330-auth-perm.js", "ns": "auth", "parts": [ { "out": "src/auth/330-auth.js", "from": null, "title": "…" },
                                                             { "out": "…", "from": "<بدايةُ سطر اللافتة>", "title": "…" }, … ],
             "deadAt": "<نصُّ سطر الخروج المبكّر للجزء الأول>" }
   --check: يعيد التوليدَ في الذاكرة ويقارن بالملفات الموجودة (0 = مطابق). */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(ROOT + '/package.json');
const espree = require('espree'); const eslintScope = require('eslint-scope');
const specPath = process.argv[2]; const CHECK = process.argv.includes('--check');
if (!specPath) { console.error('usage: node tools/split_iife.mjs <spec.json> [--check]'); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(path.resolve(ROOT, specPath), 'utf8'));
if (!/^[a-z]+$/.test(spec.ns || '')) { console.error('✘ spec.ns مطلوب (اسمُ المساحة الداخلية: أحرفٌ لاتينية صغيرة)'); process.exit(2); }
/* المصدر: ملفٌّ أو «git:<المرجع>:<المسار>» (المرجعُ يُبدَّل بـKIVO_SPLIT_REF) — وlines: [من، إلى] يقتطع IIFE واحدةً من ملفٍّ فيه أكثرُ من واحدة */
import { execFileSync } from 'child_process';
let src0;
if (spec.source.startsWith('git:')) { const [, ref, ...rest] = spec.source.split(':'); src0 = execFileSync('git', ['show', (process.env.KIVO_SPLIT_REF || ref) + ':' + rest.join(':')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }); }
else src0 = fs.readFileSync(path.resolve(ROOT, spec.source), 'utf8');
const src = spec.lines ? src0.split('\n').slice(spec.lines[0] - 1, spec.lines[1]).join('\n') + '\n' : src0;
const die = (m) => { console.error('✘ ' + m); process.exit(1); };
const ast = espree.parse(src, { ecmaVersion: 2022, range: true, loc: true });
if (ast.body.length !== 1 || ast.body[0].type !== 'ExpressionStatement') die('المصدرُ ليس IIFE واحدة');
const call = ast.body[0].expression;
const fn = call.type === 'CallExpression' ? (call.callee.type === 'FunctionExpression' ? call.callee : null) : null;
if (!fn || call.arguments.length) die('المصدرُ ليس (function(){ … })() بلا وسائط');
const sm = eslintScope.analyze(ast, { ecmaVersion: 2022 });
const fscope = sm.acquire(fn);
const lines = src.split('\n');
/* حدودُ الأجزاء بالأسطر */
const starts = spec.parts.map((p, i) => {
  if (i === 0) return fn.body.loc.start.line + 1;
  const hits = []; lines.forEach((l, j) => { if (l.startsWith(p.from)) hits.push(j + 1); });
  if (hits.length !== 1) die('اللافتة «' + p.from + '» وُجدت ' + hits.length + ' مرّة (المطلوب مرّةٌ واحدة)');
  return hits[0];
});
for (let i = 1; i < starts.length; i++) if (starts[i] <= starts[i - 1]) die('ترتيبُ اللافتات غيرُ تصاعدي عند الجزء ' + i);
const lastLine = fn.body.loc.end.line;   // سطرُ «})();»
const partOf = (line) => { let p = 0; for (let i = 0; i < starts.length; i++) if (starts[i] <= line) p = i; return p; };
/* كلُّ جملةٍ عُليا في جزءٍ واحد */
for (const st of fn.body.body) { const a = partOf(st.loc.start.line), b = partOf(st.loc.end.line); if (a !== b) die('جملةٌ عُليا تعبر حدَّ جزء: الأسطر ' + st.loc.start.line + '–' + st.loc.end.line); }
/* المتغيّراتُ العُليا: أين عُرّفت · هل تُعاد كتابتُها · من يقرؤها */
const parent = new Map(); (function w(n, p) { if (!n || typeof n.type !== 'string') return; parent.set(n, p); for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => w(c, n)); else if (v && typeof v.type === 'string') w(v, n); } })(ast, null);
const immediate = (sc) => { const b = sc.block, p = parent.get(b); return p && p.type === 'CallExpression' && p.callee === b; };
const atLoad = (sc) => { while (sc && sc !== fscope) { if (sc.type === 'function' && !immediate(sc)) return false; sc = sc.upper; } return true; };
const V = {};
for (const v of fscope.variables) {
  if (!v.defs.length || v.name === 'arguments') continue;
  const d = v.defs[0];
  V[v.name] = { name: v.name, part: partOf(d.name.loc.start.line), fn: d.type === 'FunctionName', mut: v.references.some(r => r.isWrite() && !r.init), refs: [] };
}
const walk = (sc) => { for (const r of sc.references) { const v = r.resolved; if (!v || v.scope !== fscope || !V[v.name]) continue; V[v.name].refs.push({ part: partOf(r.identifier.loc.start.line), id: r.identifier, load: atLoad(r.from), write: r.isWrite() }); } sc.childScopes.forEach(walk); };
walk(fscope);
const N = spec.parts.length;
const imp = Array.from({ length: N }, () => new Set()), fwd = Array.from({ length: N }, () => new Set()), exp = Array.from({ length: N }, () => new Set()), acc = Array.from({ length: N }, () => new Set());
const rewrites = [];   // [start, end, text] — مراجعُ المتغيّرات المتبدّلة خارج جزئها
for (const v of Object.values(V)) {
  const others = v.refs.filter(r => r.part !== v.part);
  if (!others.length) continue;
  if (v.mut) { /* (ودالةٌ يُعاد إسنادُها — كتغليف الإنفاذ لـlensOn — تُقرأ قيمتُها الحالية وقتَ التقييم كما في الأصل) */ acc[v.part].add(v.name); for (const r of others) rewrites.push([r.id.range[0], r.id.range[1], 'I.' + v.name]); continue; }
  exp[v.part].add(v.name);
  for (const r of others) {
    if (r.part > v.part) imp[r.part].add(v.name);
    else { if (!v.fn) die('مرجعٌ أماميّ إلى غيرِ دالة: ' + v.name + ' (السطر ' + r.id.loc.start.line + ')'); if (r.load) die('مرجعٌ أماميّ يُنفَّذ لحظةَ التحميل: ' + v.name + ' (السطر ' + r.id.loc.start.line + ')'); fwd[r.part].add(v.name); }
  }
}
/* الخروجُ المبكّر للجزء الأول */
let deadLine = -1;
if (spec.deadAt) { const h = []; lines.forEach((l, j) => { if (l.includes(spec.deadAt)) h.push(j + 1); }); if (h.length !== 1 || partOf(h[0]) !== 0) die('سطرُ الخروج المبكّر «' + spec.deadAt + '» يجب أن يوجد مرّةً واحدة في الجزء الأول'); deadLine = h[0]; }
/* تطبيقُ إعادة الكتابة على النصّ ثم القطعُ بالأسطر */
let text = src; rewrites.sort((a, b) => b[0] - a[0]); for (const [s, e, t] of rewrites) text = text.slice(0, s) + t + text.slice(e);
const tl = text.split('\n');
if (deadLine > 0) { const l = tl[deadLine - 1]; const k = l.lastIndexOf('return;'); if (k < 0) die('لا «return;» في سطر الخروج المبكّر'); tl[deadLine - 1] = l.slice(0, k) + 'I.dead = 1; ' + l.slice(k); }
const sorted = (s) => [...s].sort();
/* سطورٌ ملفوفة ≤ 150 حرفاً: «var A = I.A, B = I.B;» و«I.A = A; I.B = B;» */
const wrap = (first, cont, items, sep, end) => { const out = []; let line = first; items.forEach((it, k) => { const s2 = k === items.length - 1 ? end : sep; if (line.length + it.length + s2.length > 150 && line !== first) { out.push(line.replace(/\s+$/, '')); line = cont; } line += it + s2; }); out.push(line.replace(/\s+$/, '')); return out; };
const rets = []; (function w(n, inFn) { if (!n || typeof n.type !== 'string') return; if (n.type === 'ReturnStatement' && inFn === fn) rets.push(n.loc.start.line); const f = /Function/.test(n.type); for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => w(c, f ? n : inFn)); else if (v && typeof v.type === 'string') w(v, f ? n : inFn); } })(fn.body, fn);
const files = [];
for (let i = 0; i < N; i++) {
  const p = spec.parts[i], a = starts[i], b = i + 1 < N ? starts[i + 1] - 1 : lastLine - 1;
  const body = tl.slice(a - 1, b);
  while (body.length && body[body.length - 1].trim() === '') body.pop();
  const label = spec.sourceLabel || spec.source, NS = spec.ns;
  const head = ['/* ═══ ' + p.title + ' ═══', '   KIVO_257 · AUD-010: جزءٌ ' + (i + 1) + '/' + N + ' من «' + label + '» السابقة — مقسومةً بالمسؤولية بـtools/split_iife.mjs (tools/split/' + path.basename(specPath) + ')؛', '   التبعياتُ بين الأجزاء صريحةٌ هنا وعبر المساحة الداخلية window.__BS_I.' + NS + ' وحدها. */', '(function(){'];
  if (p.leadLines) head.splice(3, 0, ...src0.split('\n').slice(p.leadLines[0] - 1, p.leadLines[1]));   /* تعليقٌ من رأس الملف الأصلي يخصّ هذا الجزء */
  if (i === 0) head.push('  var I0 = window.__BS_I; if (!I0) { I0 = {}; try { Object.defineProperty(window, "__BS_I", { value: I0 }); } catch (e) { window.__BS_I = I0; } }', '  var I = I0.' + NS + ' = {};');
  else head.push('  var I = window.__BS_I && window.__BS_I.' + NS + '; if (!I || I.dead) return;   /* الجزءُ الأول لم يُحمَّل أو خرج مبكّراً ⇒ لا شيءَ بعده — كالـIIFE الواحدة */');
  const im = sorted(imp[i]); if (im.length) { head.push('  /* ← من الأجزاء السابقة */'); head.push(...wrap('  var ', '      ', im.map(n => n + ' = I.' + n), ', ', ';')); }
  const fw = sorted(fwd[i]); if (fw.length) { head.push('  /* → من أجزاءٍ لاحقة (تُستدعى وقتَ النداء لا التحميل) */'); for (const n of fw) head.push('  function ' + n + '() { return I.' + n + '.apply(this, arguments); }'); }
  const tail = [];
  const ex = sorted(exp[i]), ac = sorted(acc[i]);
  if (ex.length || ac.length) {
    tail.push('  /* → للأجزاء الأخرى */');
    if (ex.length) tail.push(...wrap('  ', '  ', ex.map(n => 'I.' + n + ' = ' + n), '; ', ';'));
    for (const n of ac) tail.push('  Object.defineProperty(I, "' + n + '", { get: function () { return ' + n + '; }, set: function (v) { ' + n + ' = v; }, configurable: true });');
  }
  /* جزءٌ فيه خروجٌ مبكّرٌ عُلويّ (غيرُ خروج التخزين): الصادراتُ قبل الجملة التي تحويه — والثوابتُ المصدَّرة يجب أن تُعرَّف قبلها */
  const myRets = rets.filter(l => partOf(l) === i && l !== deadLine);
  let out;
  if (myRets.length && tail.length) {
    const firstRet = Math.min(...myRets); const st = fn.body.body.find(s => s.loc.start.line <= firstRet && s.loc.end.line >= firstRet);
    for (const n of ex.concat(ac)) { const v = V[n]; if (!v.fn) { const dl = fscope.set.get(n).defs[0].name.loc.start.line; if (dl >= st.loc.start.line) die('ثابتٌ مصدَّر يُعرَّف بعد الخروج المبكّر: ' + n); } }
    const cut = st.loc.start.line - a;
    out = head.concat(body.slice(0, cut), tail, body.slice(cut), ['})();', '']);
  } else out = head.concat(body, tail, ['})();', '']);
  files.push({ out: p.out, text: out.join('\n') });
}
/* spec.wrap: الأسطرُ > 1,400 بايت في الأجزاء تُلفّ بأداة AUD-007 نفسِها (wrap_long_lines.mjs · ببرهانها) — فيبقى --check قابلاً للإعادة */
if (spec.wrap) { const { wrapText } = await import(path.join(ROOT, 'tools', 'wrap_long_lines.mjs')); for (const f of files) f.text = wrapText(f.text, 'js').text; }
/* كلُّ جزءٍ يُحلَّل وحده */
for (const f of files) { try { espree.parse(f.text, { ecmaVersion: 2022 }); } catch (e) { die(f.out + ': لا يُحلَّل — ' + e.message); } }
let bad = 0;
for (const f of files) {
  const p = path.resolve(ROOT, f.out), kb = Buffer.byteLength(f.text) / 1024;
  if (CHECK) { const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; if (cur !== f.text) { bad++; console.log('✘ ' + f.out + ' ≠ التوليد'); } else console.log('✔ ' + f.out + ' (' + kb.toFixed(1) + ' KB)'); }
  else { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, f.text); console.log('✎ ' + f.out + ' (' + kb.toFixed(1) + ' KB)'); }
}
const stat = { parts: N, exported: exp.reduce((a, s) => a + s.size, 0), accessors: acc.reduce((a, s) => a + s.size, 0), forward: fwd.reduce((a, s) => a + s.size, 0), rewritten: rewrites.length };
console.log((bad ? '✘ ' : '✔ ') + JSON.stringify(stat));
process.exit(bad ? 1 : 0);
