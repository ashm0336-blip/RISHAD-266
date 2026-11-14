#!/usr/bin/env node
/* KIVO_263 · AUD-012 / SOT-051 — الدوالُّ المتداخلة المكرّرة بين وحدات الصفحات (الاسمُ والجسدُ نفسُهما في وحدتين فأكثر) وما يصلح منها للاستخراج آلياً.
   node tools/dup_nested.mjs [--json out.json] [--min 120]
   «يصلح للاستخراج» = لا this ولا arguments ولا super، وكلُّ معرّفٍ حرٍّ فيها اسمٌ عامٌّ معروف (KIVO · Math · String …) — فنقلُها إلى مكانٍ واحد لا يغيّر
   معناها في أيّ موضع (لا إغلاقَ على متغيّرٍ محلي). مناهجُ الأصناف المكرّرة وُحِّدت في 257 (src/components/565-page-kit.js · tools/page_kit.mjs). */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import * as espree from 'espree'; import * as escope from 'eslint-scope';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = process.argv.slice(2); const MIN = A.includes('--min') ? +A[A.indexOf('--min') + 1] : 120;
const GLOBALS = new Set(['KIVO', 'Math', 'Number', 'String', 'Array', 'Object', 'JSON', 'Date', 'isNaN', 'parseInt', 'parseFloat', 'isFinite', 'Intl', 'RegExp', 'Set', 'Map', 'Symbol', 'Promise', 'Boolean', 'Error', 'encodeURIComponent', 'decodeURIComponent', 'Infinity', 'NaN', 'undefined', 'console', 'window', 'document', 'navigator', 'location', 'localStorage', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'getComputedStyle', 'React', 'Uint8Array', 'TextEncoder', 'TextDecoder', 'Blob', 'URL', 'atob', 'btoa']);
const modulesRoot=A.includes('--modules')?path.resolve(A[A.indexOf('--modules')+1]):path.join(ROOT,'src/modules');
/* V7 · الحزمة ب: وحداتُ src/systems/<key>/client تُضمّ إلى src/modules بالترتيب نفسِه (الأبجدي) — dirOf يعطي مجلدَ كلٍّ */
const sysRoot = path.join(path.dirname(modulesRoot), 'systems'), dirOf = {};
for (const d of fs.readdirSync(modulesRoot)) if (fs.existsSync(path.join(modulesRoot,d,'logic.js'))) dirOf[d] = path.join(modulesRoot,d);
if (fs.existsSync(sysRoot)) for (const k of fs.readdirSync(sysRoot)) { const c = path.join(sysRoot,k,'client'); if (fs.existsSync(path.join(c,'logic.js'))) dirOf[JSON.parse(fs.readFileSync(path.join(c,'meta.json'),'utf8')).slug] = c; }
const mods = Object.keys(dirOf).sort();
let sharedSourceOccurrencesSkipped=0;
const groups = new Map();
for (const m of mods) {
  const parts = (() => { try { return JSON.parse(fs.readFileSync(path.join(dirOf[m],'meta.json'), 'utf8')).logicParts || []; } catch (e) { return []; } })();   /* KIVO_265 · البند 19 */
  // Measure duplicate code consistently on Windows and Unix. CRLF is one JS
  // line terminator, not extra duplicated logic; the checked-in cap is unchanged.
  const chunks=[];let offset=0;
  const code = ['logic.js'].concat(parts).map(f=>{const file=fs.realpathSync(path.join(dirOf[m],f)),text=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');chunks.push({file,start:offset,end:offset+text.length});offset+=text.length+1;return text;}).join('\n');
  let ast; try { ast = espree.parse(code, { ecmaVersion: 'latest', sourceType: 'script', range: true }); } catch (e) { console.log('✘ تعذّر تحليل', m, e.message); continue; }
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' });
  /* أسماءُ الدوال المجهولة من موضعها: const f = () => … · { f: function … } · x.f = function … */
  const nameAt = new Map();
  (function walk(n) { if (!n || typeof n.type !== 'string') return;
    if (n.type === 'VariableDeclarator' && n.init && /Function/.test(n.init.type) && n.id.type === 'Identifier') nameAt.set(n.init.range[0], n.id.name);
    if (n.type === 'Property' && n.value && /Function/.test(n.value.type) && n.key && (n.key.name || n.key.value)) nameAt.set(n.value.range[0], String(n.key.name || n.key.value));
    if (n.type === 'AssignmentExpression' && n.right && /Function/.test(n.right.type) && n.left.type === 'MemberExpression' && n.left.property && n.left.property.name) nameAt.set(n.right.range[0], n.left.property.name);
    for (const k in n) { if (k === 'range' || k === 'parent') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); }
  })(ast);
  for (const sc of sm.scopes) {
    if (sc.type !== 'function') continue;
    const n = sc.block; if (!n.range || n.range[1] - n.range[0] < MIN) continue;
    // Parse each complete module for scope, then retain all consuming modules
    // while counting physical implementations only once. A shared source and
    // an independent copy in its first consumer must still form a duplicate.
    const origin=chunks.find(c=>n.range[0]>=c.start&&n.range[1]<=c.end);
    const site=origin?origin.file+':'+(n.range[0]-origin.start)+':'+(n.range[1]-origin.start):m+':'+n.range.join(':');
    const parentIsMethod = n.parent && n.parent.type === 'MethodDefinition';
    let name = (n.id && n.id.name) || nameAt.get(n.range[0]);
    if (!name) continue;   // الدوالُّ المسمّاة وحدها (إعلانٌ أو تعبيرٌ مسمّى) — المجهولةُ لا تُستخرج باسم
    const src = code.slice(n.range[0], n.range[1]);
    const h = crypto.createHash('sha256').update(src.replace(/\s+/g, ' ')).digest('hex').slice(0, 16);
    let usesThis = /\bthis\b|\barguments\b|\bsuper\b/.test(src);
    const free = [...new Set(sc.through.map(r => r.identifier.name))];
    const ok = !usesThis && free.every(f => GLOBALS.has(f));
    const k = name + '#' + h;
    if (!groups.has(k)) groups.set(k, { name, hash: h, len: src.length, ok, free, where: [], origins: new Map(), modules: new Set() });
    const group=groups.get(k);group.modules.add(m);
    if(group.origins.has(site)){sharedSourceOccurrencesSkipped++;continue;}
    group.origins.set(site,{file:origin?path.relative(ROOT,origin.file).split(path.sep).join('/'):m,range:origin?[n.range[0]-origin.start,n.range[1]-origin.start]:n.range.slice()});
    group.where.push(m + ':' + (code.slice(0, n.range[0]).split('\n').length));
  }
}
const dup = [...groups.values()].filter(g => g.origins.size >= 2 && g.modules.size >= 2)
  .map(({origins,modules,...group})=>({...group,origins:[...origins.values()],modules:[...modules].sort()}))
  .sort((a, b) => b.len * b.where.length - a.len * a.where.length);
const extra = dup.reduce((s, g) => s + g.len * (g.where.length - 1), 0), okG = dup.filter(g => g.ok), okB = okG.reduce((s, g) => s + g.len * (g.where.length - 1), 0);
for (const g of dup.slice(0, 40)) console.log((g.ok ? '  ◆ ' : '  · ') + g.name.padEnd(22) + String(g.len).padStart(6) + ' × ' + g.where.length + '  ' + g.where.join(' ') + (g.ok ? '' : '   حرّة: ' + g.free.filter(f => !GLOBALS.has(f)).slice(0, 6).join(',')));
if (A.includes('--json')) fs.writeFileSync(A[A.indexOf('--json') + 1], JSON.stringify({ groups: dup.length, extraBytes: extra, extractable: okG.length, extractableBytes: okB, sharedSourceOccurrencesSkipped, list: dup }, null, 1));
/* السقّاطة (--check): لا تزيد المجموعاتُ ولا البايتاتُ الزائدة على الخط الأساسي المسجَّل (tools/dup_nested.json) — تُخفَّض ولا تُرفع */
const BL = path.join(ROOT, 'tools', 'dup_nested.json');
if (A.includes('--write-baseline')) fs.writeFileSync(BL, JSON.stringify({ note: 'KIVO_263 · AUD-012/SOT-051: خطُّ أساسٍ للدوال المتداخلة المكرّرة بين الوحدات — يُخفَّض ولا يُرفع', groups: dup.length, extraBytes: extra }, null, 1) + '\n');
let worse = false;
if (A.includes('--check')) { const b = JSON.parse(fs.readFileSync(BL, 'utf8')); worse = dup.length > b.groups || extra > b.extraBytes; if (worse) console.log('  ✘ التكرارُ زاد على الخط الأساسي: ' + dup.length + '/' + b.groups + ' مجموعة · ' + extra + '/' + b.extraBytes + ' بايت'); }
console.log('النتيجة: ' + dup.length + ' مجموعةً مكرّرة (≈' + Math.round(extra / 1024) + ' KB زائدة) · تصلح للاستخراج آلياً ' + okG.length + ' (≈' + Math.round(okB / 1024) + ' KB) · ◆ = يصلح' + (worse ? ' · 1 مخالفة' : ''));
process.exit(worse ? 1 : 0);
