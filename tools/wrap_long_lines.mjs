#!/usr/bin/env node
/* KIVO_257 · AUD-007 (الختام) — لا سطرَ مصدرٍ يتجاوز 1,500 بايت (عدا المولَّد والمورَّد): لفُّ الأسطر الطويلة بلا أيّ أثرٍ في المعنى.
     · القوالب (view.html): يُكسر السطرُ عند مسافةٍ داخل وسمٍ (بين سمتين) فقط — لا داخل قيمة سمة ولا {{ }} ولا بين وسمين (فلا عقدةَ نصٍّ جديدة)؛
       والمسافاتُ بين السمات لا معنى لها في HTML (وdc-runtime يحلّل القالب بـ<template> القياسي · ترميزُ السمات الحدبية يقبل أيَّ \s قبلها).
     · JavaScript: يُكسر بعد رمز «,» (من مُرمِّز acorn — لا داخل نصٍّ ولا تعبيرٍ نمطي)؛ الفاصلةُ لا تُنهي جملةً فلا أثرَ للإدراج التلقائي.
   البرهان (لكل ملف): حذفُ ما أُدرج (فاصلُ السطر + المسافةُ البادئة المضافة) يعيد الأصلَ بايتاً؛ ولـJS أيضاً: شجرةُ AST متطابقة.
     node tools/wrap_long_lines.mjs [--max 1400] <ملفات…>             ← يلفّ في المكان
     node tools/wrap_long_lines.mjs --report [--limit 1500] <ملفات…>   ← الأسطرُ التي تتجاوز الحدّ (0 = لا شيء)
     node tools/wrap_long_lines.mjs --from-ref <وسم> <ملفات…>         ← البرهان: لفُّ نسخة الوسم = الملفُّ الحالي بايتاً */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const acorn = createRequire(ROOT + '/package.json')('acorn');
const blen = (s) => Buffer.byteLength(s);
/* مواضعُ الكسر الممكنة في سطر HTML: مسافةٌ داخل وسم، خارج الاقتباس و{{ }} */
function htmlBreaks(line) {
  const out = []; let inTag = false, q = null, must = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (must) { if (c === '}' && line[i + 1] === '}') { must--; i++; } continue; }
    if (c === '{' && line[i + 1] === '{') { must++; i++; continue; }
    if (q) { if (c === q) q = null; continue; }
    if (!inTag) { if (c === '<' && /[A-Za-z]/.test(line[i + 1] || '')) inTag = true; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '>') { inTag = false; continue; }
    if (c === ' ' && line[i + 1] && line[i + 1] !== ' ' && line[i + 1] !== '>' && line[i + 1] !== '/') out.push(i);
  }
  return out;
}
/* مواضعُ الكسر في سطر JS: بعد رمز «,» (الفهرسُ داخل السطر) */
function jsBreaks(src, lineStart, lineEnd) {
  const out = [];
  for (const t of acorn.tokenizer(src, { ecmaVersion: 'latest', allowReturnOutsideFunction: true, allowHashBang: true })) {
    if (t.type === acorn.tokTypes.eof || t.start >= lineEnd) break;
    if (t.type === acorn.tokTypes.comma && t.start >= lineStart && t.end < lineEnd) out.push(t.end - lineStart);
  }
  return out;
}
function wrapLine(line, cands, isHtml, MAX) {
  const ind = (/^\s*/.exec(line) || [''])[0] + '    ';
  const pieces = []; let start = 0, last = -1;
  for (const p of cands) {
    if (blen(line.slice(start, p)) > MAX && last > start) { pieces.push(line.slice(start, last)); start = last + (isHtml || line[last] === ' ' ? 1 : 0); }
    last = p;
  }
  if (blen(line.slice(start)) > MAX && last > start) { pieces.push(line.slice(start, last)); start = last + (isHtml || line[last] === ' ' ? 1 : 0); }
  pieces.push(line.slice(start));
  return pieces.map((s, i) => i ? ind + s : s);
}
/* اللفُّ مع برهانه — يرمي إن فشل البرهان */
export function wrapText(src, kind, MAX = 1400) {
  const isHtml = kind === 'html', isJs = kind === 'js';
  const lines = src.split('\n'); const out = []; let pos = 0, did = 0; const undo = [];
  for (const l of lines) {
    if (blen(l) > MAX && (isHtml || isJs)) {
      const w = wrapLine(l, isHtml ? htmlBreaks(l) : jsBreaks(src, pos, pos + l.length), isHtml, MAX);
      if (w.length > 1) { did++; undo.push([out.length, w.length, l]); out.push(...w); pos += l.length + 1; continue; }
    }
    out.push(l); pos += l.length + 1;
  }
  if (!did) return { text: src, did: 0 };
  const res = out.join('\n');
  const back = res.split('\n');
  for (const [at, n, orig] of undo.slice().reverse()) { const seg = back.slice(at, at + n); const ind = (/^\s*/.exec(orig) || [''])[0] + '    ';
    const re = seg.map((s, k) => k ? s.slice(ind.length) : s).reduce((a, s, k) => { if (!k) return s; const brk = a.length; return a + (isHtml || orig[brk] === ' ' ? ' ' : '') + s; }, '');
    if (re !== orig) throw new Error('العكسُ لا يعيد السطرَ الأصلي'); back.splice(at, n, orig); }
  if (back.join('\n') !== src) throw new Error('العكسُ لا يعيد الملفَّ الأصلي');
  if (isJs) { const strip = (n) => Array.isArray(n) ? n.map(strip) : (n && typeof n === 'object') ? Object.fromEntries(Object.keys(n).sort().filter(k => !['start', 'end', 'loc', 'range', 'raw'].includes(k)).map(k => [k, strip(n[k])])) : n;
    const o = { ecmaVersion: 'latest', allowReturnOutsideFunction: true };
    if (JSON.stringify(strip(acorn.parse(src, o))) !== JSON.stringify(strip(acorn.parse(res, o)))) throw new Error('AST مختلف'); }
  return { text: res, did };
}
export const kindOf = (f) => /\.html?$/.test(f) ? 'html' : /\.m?js$/.test(f) ? 'js' : '';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
  const REPORT = args.includes('--report'); if (REPORT) args.splice(args.indexOf('--report'), 1);
  const REF = opt('--from-ref', null), MAX = +opt('--max', 1400), LIMIT = +opt('--limit', 1500);
  let changed = 0, over = 0, bad = 0;
  for (const f of args) {
    if (REPORT) { fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (blen(l) > LIMIT) { over++; console.log(f + ':' + (i + 1) + ' ' + blen(l)); } }); continue; }
    if (REF) { const old = execFileSync('git', ['show', REF + ':' + f], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }); const same = wrapText(old, kindOf(f), MAX).text === fs.readFileSync(f, 'utf8'); if (!same) bad++; console.log((same ? '✔ ' : '✘ ') + f + (same ? ' = لفُّ ' : ' ≠ لفُّ ') + REF); continue; }
    const src = fs.readFileSync(f, 'utf8'); let r; try { r = wrapText(src, kindOf(f), MAX); } catch (e) { console.error('✘ ' + f + ': ' + e.message); process.exit(1); }
    if (r.did) { fs.writeFileSync(f, r.text); changed++; console.log('✎ ' + f + ': ' + r.did + ' سطراً لُفّ'); }
  }
  if (REPORT) { console.log(over ? '✘ ' + over + ' سطراً > ' + LIMIT : '✔ لا سطرَ > ' + LIMIT); process.exit(over ? 1 : 0); }
  if (REF) process.exit(bad ? 1 : 0);
  console.log('✔ ' + changed + ' ملفاً');
}
