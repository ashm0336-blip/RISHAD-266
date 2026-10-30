/* KIVO_256 · AUD-007 — برهانُ تساوي الشيفرة بعد إعادة التنسيق: node tools/ast_equal.mjs <أ.js> <ب.js> (الخروج 0 = متساويان) */
/* مقارنةُ AST بين نصّين: تُهمل المواضعُ والنصُّ الخام (raw)، وتُسطَّح سلاسلُ المنطق المتماثلة (a && (b && c) ≡ (a && b) && c —
   التجميعيةُ لعاملٍ واحد لا تغيّر ترتيبَ التقييم ولا قصرَه ولا القيمة). أيُّ فرقٍ آخر = مختلف. */
import fs from 'fs';
import * as acorn from '../node_modules/acorn/dist/acorn.mjs';
const [a, b] = process.argv.slice(2).map(f => fs.readFileSync(f, 'utf8'));
const opts = { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true };
const flat = (n, op, out) => { if (n && n.type === 'LogicalExpression' && n.operator === op) { flat(n.left, op, out); flat(n.right, op, out); } else out.push(n); return out; };
const strip = (n) => {
  if (Array.isArray(n)) return n.map(strip);
  if (n && typeof n === 'object') {
    if (n.type === 'LogicalExpression') return { type: 'LogicalChain', op: n.operator, items: flat(n, n.operator, []).map(strip) };
    if (n.type === 'ParenthesizedExpression') return strip(n.expression);
    const o = {}; for (const k of Object.keys(n).sort()) { if (k === 'start' || k === 'end' || k === 'loc' || k === 'range' || k === 'raw') continue; if (k === 'value' && n.type === 'TemplateElement') { o[k] = { cooked: n.value.cooked }; continue; } o[k] = strip(n[k]); } return o; }
  return n; };
const A = JSON.stringify(strip(acorn.parse(a, opts))), B = JSON.stringify(strip(acorn.parse(b, opts)));
console.log(A === B ? 'AST-EQUAL' : 'AST-DIFFERENT', A.length, B.length);
if (A !== B) { let i = 0; while (A[i] === B[i]) i++; console.log(A.slice(Math.max(0, i - 300), i + 200)); console.log('---'); console.log(B.slice(Math.max(0, i - 300), i + 200)); }
process.exit(A === B ? 0 : 1);
