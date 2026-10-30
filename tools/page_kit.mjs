#!/usr/bin/env node
/* KIVO_257 · AUD-012 (+ AUD-013 خطوة ١) — المناهجُ المنسوخة بين الصفحات تُجمع في مصدرٍ واحد: src/components/565-page-kit.js
   القاعدة: منهجٌ (method/get/set) بالاسم نفسِه والجسدِ نفسِه (شجرةُ AST بعد إهمال المواضع والنصّ الخام) في وحدتين فأكثر يصير «سمةً»
   (trait) واحدةً تُطبَّق على تلك الوحدات وحدها: class Component extends window.BassamPageKit.base(DCLogic, ["…"]) — والمنهجُ يُحذف من الوحدة.
   الأهلية (وإلا يبقى في مكانه): لا super · لا مرجعَ لاسمٍ معرَّفٍ في ملف الوحدة خارج الصنف (ولا Component نفسِه) · لا React/DCLogic/StreamableLogic.
   السمةُ = مجموعةُ الوحدات التي يتطابق فيها المنهج؛ فلكل وحدةٍ جسدٌ واحدٌ لكل اسم ⇒ لا تعارضَ بين السمات المطبَّقة على وحدة.
   البرهان (--check): لكل وحدة: مناهجُها الخاصة ∪ مناهجُ سماتها = مناهجُها في المصدر المرجعي (الاسم · النوع · بصمةُ AST) — لا زيادة ولا نقص ولا تغيير.
   والكودُ الميت (AUD-014 · ENG-06): أعضاءٌ معلنةٌ بأسمائها في المواصفة تُحذف من المرجع أولاً — بعد إثبات أنّ اسمَ كلٍّ منها لا يرد في أيّ ملفٍّ
   في src (عدا الصفحات المولَّدة) إلا موضعَ تعريفه (فلا نداءَ ولا وصولَ ديناميكيّ بنصّ الاسم).
     node tools/page_kit.mjs tools/page_kit.json [--write]   ← المواصفة: {"ref": وسمُ المصدر قبل الاستخراج, "dead": {وحدة: [أعضاء]}}؛ بلا --write: تقرير
     node tools/page_kit.mjs tools/page_kit.json --check      ← البرهانُ على الشجرة الحالية (KIVO_KIT_REF يبدّل المرجع) */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(ROOT + '/package.json'); const acorn = req('acorn'); const eslintScope = req('eslint-scope');
const [SPEC, MODE] = [process.argv[2], process.argv[3] || ''];
if (!SPEC) { console.error('usage: node tools/page_kit.mjs <spec.json> [--write|--check]'); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(path.resolve(ROOT, SPEC), 'utf8'));
const REF = process.env.KIVO_KIT_REF || spec.ref, DEAD = spec.dead || {};
const MOD = 'src/modules', KIT = 'src/components/565-page-kit.js';
const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 << 20 });
/* الكودُ الميت: الاسمُ لا يرد في src عند المرجع إلا موضعَ تعريفه */
const refFiles = git(['ls-tree', '-r', '--name-only', REF, 'src']).split('\n').filter(f => f && !f.startsWith('src/pages/') && /\.(js|html|json|mjs)$/.test(f));
const refText = refFiles.map(f => git(['show', REF + ':' + f])).join('\n');
for (const [m, names] of Object.entries(DEAD)) for (const n of names) { const c = (refText.match(new RegExp('(?<![A-Za-z0-9_$])' + n.replace(/\$/g, '\\$') + '(?![A-Za-z0-9_$])', 'g')) || []).length; if (c !== 1) { console.error('✘ الكودُ الميت: «' + m + '.' + n + '» يرد ' + c + ' مرّة في src عند ' + REF + ' (المطلوب 1 — موضعُ تعريفه)'); process.exit(1); } }
function refSrc(m) {
  let s = git(['show', REF + ':' + MOD + '/' + m + '/logic.js']); const names = DEAD[m] || []; if (!names.length) return s;
  const ast = acorn.parse(s, { ecmaVersion: 'latest' }); const cls = ast.body.find(x => x.type === 'ClassDeclaration');
  const hits = cls.body.body.filter(x => x.key && names.includes(x.key.name || x.key.value));
  if (hits.length !== names.length) { console.error('✘ ' + m + ': الأعضاءُ الميتة الموجودة ' + hits.length + ' من ' + names.length); process.exit(1); }
  for (const x of hits.sort((a, b) => b.start - a.start)) { let a = x.start; while (a > 0 && s[a - 1] === ' ') a--; if (s[a - 1] === '\n') a--; s = s.slice(0, a) + s.slice(x.end); }
  return s;
}
const mods = git(['ls-tree', '--name-only', REF + ':' + MOD]).split('\n').filter(Boolean).filter(m => { try { git(['cat-file', '-e', REF + ':' + MOD + '/' + m + '/logic.js']); return true; } catch (e) { return false; } }).sort();
const strip = (n) => Array.isArray(n) ? n.map(strip) : (n && typeof n === 'object') ? Object.fromEntries(Object.keys(n).sort().filter(k => !['start', 'end', 'loc', 'range', 'raw'].includes(k)).map(k => [k, strip(n[k])])) : n;
const hash = (n) => crypto.createHash('sha256').update(JSON.stringify(strip(n))).digest('hex').slice(0, 16);
const BAD_FREE = new Set(['React', 'DCLogic', 'StreamableLogic']);
function analyze(src, name) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', ranges: true, locations: true });
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2022 });
  const top = sm.globalScope;
  const cls = ast.body.find(s => s.type === 'ClassDeclaration' && s.id && s.id.name === 'Component');
  if (!cls) throw new Error(name + ': لا class Component');
  const fileVars = new Set(top.variables.filter(v => v.defs.length).map(v => v.name));
  const out = [];
  for (const m of cls.body.body) {
    /* المناهج · والحقولُ: دالةٌ سهمية/عادية (إنشاءُ الإغلاق لا يقيّم شيئاً فلا أثرَ لترتيب التهيئة) أو ثابتٌ حرفيّ بلا أيّ معرّف (لا this ولا نداء) */
    const isField = m.type === 'PropertyDefinition';
    if ((m.type !== 'MethodDefinition' && !isField) || m.static || m.computed || m.kind === 'constructor' || (isField && !m.value)) continue;
    if (isField && !/Function/.test(m.value.type)) { let lit = true; (function w(n) { if (!n || typeof n !== 'object' || !lit) return; if (Array.isArray(n)) return n.forEach(w); if (['Identifier', 'ThisExpression', 'CallExpression', 'NewExpression', 'TemplateLiteral', 'TaggedTemplateExpression', 'MemberExpression', 'FunctionExpression', 'ArrowFunctionExpression', 'UpdateExpression', 'AssignmentExpression', 'AwaitExpression', 'YieldExpression', 'SpreadElement', 'ImportExpression'].includes(n.type) && !(n.type === 'Identifier' && false)) { if (n.type === 'Identifier') { lit = false; return; } lit = false; return; } for (const k of Object.keys(n)) if (k !== 'loc' && k !== 'key') w(n[k]); })(m.value); if (!lit) continue; }
    const key = m.key.name || m.key.value;
    let ok = true, why = '';
    (function w(n) { if (!n || typeof n !== 'object' || !ok) return; if (Array.isArray(n)) return n.forEach(w); if (n.type === 'Super') { ok = false; why = 'super'; } for (const k of Object.keys(n)) if (k !== 'loc') w(n[k]); })(m.value);
    if (ok) {
      const fsc = sm.acquire(m.value, true) || null;
      const refs = []; (function walk(sc) { if (!sc) return; for (const r of sc.through) refs.push(r); })(fsc);
      for (const r of refs) { const nm = r.identifier.name; if (fileVars.has(nm) || nm === 'Component') { ok = false; why = 'file-scope:' + nm; break; } if (BAD_FREE.has(nm)) { ok = false; why = 'wrapper:' + nm; break; } }
    }
    out.push({ key, kind: isField ? 'field' : m.kind, h: hash(m.value), start: m.start, end: m.end, ok, why, text: src.slice(m.start, m.end) });
  }
  return { cls, methods: out, ast };
}
/* ① المرجع: المناهجُ لكل وحدة */
const REFM = {};
for (const m of mods) REFM[m] = analyze(refSrc(m), m);
const groups = new Map();
for (const m of mods) for (const x of REFM[m].methods) { const k = x.kind + ' ' + x.key + '#' + x.h; if (!groups.has(k)) groups.set(k, { key: x.key, kind: x.kind, h: x.h, mods: [], ok: true, text: x.text, why: [] }); const g = groups.get(k); g.mods.push(m); if (!x.ok) { g.ok = false; g.why.push(m + ':' + x.why); } }
/* زوجُ get/set لاسمٍ واحد يُنقل معاً أو يبقى معاً (وإلا حجب الواصفُ الناقص في الوحدة نصفَه في السمة) */
for (const m of mods) { const ks = {}; for (const x of REFM[m].methods) if (x.kind !== 'method') (ks[x.key] = ks[x.key] || []).push(x);
  for (const k of Object.keys(ks)) { if (ks[k].length < 2) continue; const gs = ks[k].map(x => groups.get(x.kind + ' ' + x.key + '#' + x.h)); const same = gs.every(g => g.mods.length > 1 && g.ok && g.mods.join() === gs[0].mods.join()); if (!same) gs.forEach(g => { g.ok = false; g.why.push(m + ':accessor-pair'); }); } }
const moved = [...groups.values()].filter(g => g.mods.length > 1 && g.ok);
const kept = [...groups.values()].filter(g => g.mods.length > 1 && !g.ok);
const traitName = (ms) => ms.join('+');
const traits = new Map(); for (const g of moved) { const t = traitName(g.mods); if (!traits.has(t)) traits.set(t, []); traits.get(t).push(g); }
const order = [...traits.keys()].sort((a, b) => b.split('+').length - a.split('+').length || (a < b ? -1 : 1));
for (const t of order) traits.get(t).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.kind < b.kind ? -1 : 1));
const modTraits = (m) => order.filter(t => t.split('+').includes(m));
/* ② النصّ المولَّد */
const indent = (txt, pad) => pad + txt;   /* النصُّ حرفياً (لا إعادةَ إزاحةٍ قد تمسّ قالباً نصّياً متعدّد الأسطر) */
function kitText() {
  const L = [];
  L.push('/* ═══ مناهجُ الصفحات المشتركة — مصدرٌ واحد (KIVO_257 · AUD-012 · AUD-013 خطوة ١) ═══');
  L.push('   كلُّ منهجٍ كان منسوخاً بالاسم والجسد نفسَيهما في وحدتين فأكثر صار هنا مرّةً واحدة، مجمَّعاً بـ«سمة» = مجموعةُ الوحدات التي يخصّها؛');
  L.push('   الوحدةُ تعلن سماتها: class Component extends window.BassamPageKit.base(DCLogic, ["…"]) — وتبقى مناهجُها الخاصة فوقها.');
  L.push('   مولَّدٌ ومُبرهَنٌ بـtools/page_kit.mjs (المناهجُ الخاصة ∪ مناهجُ السمات = مناهجُ الوحدة الأصلية: الاسم · النوع · شجرةُ AST). لا يُحرَّر يدوياً');
  L.push('   إلا بتعديل المنهج نفسِه — وحينها يسري على كل وحداته معاً (وهو الغرض). */');
  L.push('(function () {');
  L.push('  var T = {};');
  for (const t of order) {
    L.push('  /* ── ' + t.split('+').join(' · ') + ' (' + traits.get(t).length + ') ── */');
    L.push('  T["' + t + '"] = function (B) { return class extends B {');
    for (const g of traits.get(t)) L.push(indent(g.text, '    '));
    L.push('  }; };');
  }
  L.push('  var memo = new Map();');
  L.push('  /* base(DCLogic, سمات) ⇒ صنفٌ أساس: DCLogic ثم السماتُ بترتيبها (لا اسمَ يتكرّر بين سمات وحدةٍ واحدة — مُثبَتٌ عند التوليد) */');
  L.push('  function base(DCLogic, names) {');
  L.push('    var k = names.join("|"), hit = memo.get(DCLogic); if (!hit) { hit = new Map(); memo.set(DCLogic, hit); }');
  L.push('    if (hit.has(k)) return hit.get(k);');
  L.push('    var C = DCLogic; for (var i = 0; i < names.length; i++) { var f = T[names[i]]; if (!f) throw new Error("BassamPageKit: سمةٌ مجهولة " + names[i]); C = f(C); }');
  L.push('    hit.set(k, C); return C;');
  L.push('  }');
  L.push('  window.BassamPageKit = { base: base, traits: function () { return Object.keys(T); } };');
  L.push('})();');
  return L.join('\n') + '\n';
}
function rewrite(m) {
  const src = refSrc(m); const A = REFM[m];
  const drop = A.methods.filter(x => moved.some(g => g.kind === x.kind && g.key === x.key && g.h === x.h && g.mods.includes(m)));
  let s = src;
  for (const x of drop.slice().sort((a, b) => b.start - a.start)) {
    let a = x.start, b = x.end; while (a > 0 && (s[a - 1] === ' ' || s[a - 1] === '\t')) a--; if (s[a - 1] === '\n') a--;   /* السطرُ كاملاً */
    s = s.slice(0, a) + s.slice(b);
  }
  const tr = modTraits(m);
  if (tr.length) { const head = 'class Component extends DCLogic {'; if (s.split(head).length !== 2) throw new Error(m + ': رأسُ الصنف غيرُ متوقّع'); s = s.replace(head, 'class Component extends window.BassamPageKit.base(DCLogic, ' + JSON.stringify(tr) + ') {'); }
  return { text: s, dropped: drop.length, traits: tr };
}
/* ③ البرهان على شجرةٍ (نصوصٌ معطاة) */
function prove(getMod, kitSrc) {
  const kast = acorn.parse(kitSrc, { ecmaVersion: 'latest', sourceType: 'script' });
  const traitM = {};   /* اسمُ السمة ← [{key,kind,h}] من نصّ الأداة نفسِه */
  (function w(n) { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(w);
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && n.left.object.name === 'T' && n.left.property.type === 'Literal') {
      const cls = n.right.body.body[0].argument; traitM[n.left.property.value] = cls.body.body.map(x => ({ key: x.key.name || x.key.value, kind: x.type === 'PropertyDefinition' ? 'field' : x.kind, h: hash(x.value) })); }
    for (const k of Object.keys(n)) if (k !== 'loc') w(n[k]); })(kast);
  const errs = [];
  for (const m of mods) {
    const cur = analyze(getMod(m), m); const hd = /class Component extends (?:window\.BassamPageKit\.base\(DCLogic, (\[[^\]]*\])\)|DCLogic) \{/.exec(getMod(m));
    const tr = hd && hd[1] ? JSON.parse(hd[1]) : [];
    const eff = new Map(); for (const t of tr) { if (!traitM[t]) { errs.push(m + ': سمةٌ مجهولة ' + t); continue; } for (const x of traitM[t]) { const k = x.kind + ' ' + x.key; if (eff.has(k)) errs.push(m + ': اسمٌ مكرّر بين السمات ' + k); eff.set(k, x.h); } }
    for (const x of cur.methods) eff.set(x.kind + ' ' + x.key, x.h);   /* الخاصّ يعلو */
    const want = new Map(REFM[m].methods.map(x => [x.kind + ' ' + x.key, x.h]));
    for (const [k, h] of want) if (eff.get(k) !== h) errs.push(m + ': ' + k + (eff.has(k) ? ' تغيّر' : ' غائب'));
    for (const k of eff.keys()) if (!want.has(k)) errs.push(m + ': ' + k + ' زائد');
    /* ما سوى المناهج في الوحدة كما هو: نصُّ الملف بعد حذف المناهج المنقولة من المرجع = النصُّ الحالي (عدا رأس الصنف) */
  }
  return errs;
}
const plan = mods.map(m => ({ m, ...rewrite(m) }));
/* ملفُّ السمات منسَّقٌ بـprettier (التنسيقُ وحده — البرهانُ على شجرة AST لا يتأثّر) */
const prettier = await import(path.join(ROOT, 'node_modules', 'prettier', 'index.mjs'));
const kit = await prettier.format(kitText(), { parser: 'babel', printWidth: 150, singleQuote: false });
if (MODE === '--check') {
  const curKit = fs.existsSync(path.join(ROOT, KIT)) ? fs.readFileSync(path.join(ROOT, KIT), 'utf8') : '';
  const errs = prove((m) => fs.readFileSync(path.join(ROOT, MOD, m, 'logic.js'), 'utf8'), curKit);
  const regen = curKit === kit && plan.every(p => fs.readFileSync(path.join(ROOT, MOD, p.m, 'logic.js'), 'utf8') === p.text);
  console.log((errs.length ? '✘ ' : '✔ ') + 'البرهان: ' + mods.length + ' وحدة — مناهجُها الفعلية (الخاصة ∪ السمات) = المرجع ' + REF + (errs.length ? ' · ' + errs.slice(0, 6).join(' | ') : ''));
  console.log((regen ? '✔ ' : '✘ ') + 'الوحداتُ وملفُّ السمات = إعادةُ التوليد من المرجع بايتاً');
  process.exit(errs.length || !regen ? 1 : 0);
}
const nMoved = moved.reduce((a, g) => a + g.mods.length, 0), bytesSaved = moved.reduce((a, g) => a + (g.mods.length - 1) * g.text.length, 0);
console.log('سمات: ' + order.length + ' · مناهجُ منقولة: ' + moved.length + ' (' + nMoved + ' نسخة · يُوفَّر ≈ ' + bytesSaved + ' حرفاً) · مكرّرةٌ غيرُ مؤهّلة: ' + kept.length);
for (const g of kept) console.log('   ⋯ يبقى: ' + g.key + ' [' + g.mods.join(',') + '] ' + g.why.slice(0, 2).join(' '));
if (MODE === '--write') {
  fs.writeFileSync(path.join(ROOT, KIT), kit);
  for (const p of plan) fs.writeFileSync(path.join(ROOT, MOD, p.m, 'logic.js'), p.text);
  const errs = prove((m) => fs.readFileSync(path.join(ROOT, MOD, m, 'logic.js'), 'utf8'), kit);
  if (errs.length) { console.error('✘ البرهان: ' + errs.slice(0, 10).join(' | ')); process.exit(1); }
  console.log('✎ ' + KIT + ' (' + (Buffer.byteLength(kit) / 1024).toFixed(1) + ' KB) · ' + plan.filter(p => p.dropped).map(p => p.m + '−' + p.dropped).join(' ') + ' · البرهان ✔');
}
