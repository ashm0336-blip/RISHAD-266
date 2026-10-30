#!/usr/bin/env node
/* KIVO_258 · AUD-025 — قياسُ تغطية المحرّكات المحضة (بلا اعتماديةٍ جديدة: تغطيةُ V8 الأصلية عبر NODE_V8_COVERAGE).
   يشغّل اختباراتِ الوحدة (node --test) على عامل الحزمة ومصدرها، ثم يجمع تغطيةَ الكتل من كل العمليات ويحسبها لكل محرّكٍ مسمّى:
   • محرّكاتُ الخادم: دالةٌ عليا أو متغيّرٌ أعلى في _worker.js (تُحدَّد حدودُه بـAST) — نسخُ الاختبار (worker_internals_N.mjs · _worker.js?inst=N)
     تشترك مع العامل في إزاحات النصّ (النسخةُ = العامل + سطرُ export في آخره)، فتُدمج تغطيتُها على نصّ العامل.
   • محرّكاتُ الواجهة: كتلةٌ كاملة تُشغَّل في vm باسم ملفها (client_engines.test.mjs).
   المقياس: **العبارات** (Statement في AST: لكلٍّ عدُّ أعمق نطاقٍ يحويه في تغطية الكتل؛ مغطّاةٌ إن >0 في أيّ عملية) + الدوال.
   البوابة: كلُّ محرّكٍ ≥ العتبة (spec.threshold) في العبارات — وإلا خروجٌ غيرُ صفري مع أوّل العبارات غير المغطّاة.
     node tools/engine_coverage.mjs tools/engine_coverage.json <pkDir> [--json out.json] */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const acorn = createRequire(ROOT + '/package.json')('acorn');
const spec = JSON.parse(fs.readFileSync(path.resolve(ROOT, process.argv[2]), 'utf8'));
const PK = path.resolve(ROOT, process.argv[3] || 'pk258');
const OUTJ = process.argv.includes('--json') ? path.resolve(process.argv[process.argv.indexOf('--json') + 1]) : null;
const WORKER = path.join(PK, '_worker.js');
const COV = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_cov_'));
/* الاختبارات: مساراتٌ أو أنماطُ «*» في اسم الملف (tests/unit/*.test.mjs) */
const files = spec.tests.flatMap(f => { if (f.indexOf('*') === -1) return [path.join(ROOT, f)]; const dir = path.join(ROOT, path.dirname(f)), re = new RegExp('^' + path.basename(f).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'); return fs.readdirSync(dir).filter(x => re.test(x)).sort().map(x => path.join(dir, x)); });
const r = spawnSync(process.execPath, ['--no-warnings', '--test', ...files], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 << 20,
  env: Object.assign({}, process.env, { NODE_V8_COVERAGE: COV, KIVO_WORKER: WORKER, KIVO_DIST: PK, KIVO_SRC: path.join(ROOT, 'src') }) });
const tp = /# pass (\d+)/.exec(r.stdout), tf = /# fail (\d+)/.exec(r.stdout);
if (!tp || !tf || +tf[1] !== 0) { console.log('✘ الاختباراتُ نفسُها لم تنجح: ' + (r.stdout.split('\n').filter(l => /^# (pass|fail)/.test(l)).join(' · ') || r.stderr.slice(-400))); process.exit(2); }
/* التغطية: لكل نصٍّ (العامل · كلُّ كتلة) مصفوفةُ «مغطّى» على مستوى الحرف — اتحادُ العمليات والنسخ */
const wsrc = fs.readFileSync(WORKER, 'utf8');
const texts = { worker: wsrc }; const covered = { worker: new Uint8Array(wsrc.length) }; const seen = { worker: 0 };
const blockText = (name) => { const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const q = path.join(d, e.name); if (e.isDirectory()) { if (e.name === 'modules' || e.name === 'pages') continue; const x = walk(q); if (x) return x; } else if (e.name === name) return q; } return null; }; const f = walk(path.join(ROOT, 'src')); return f ? fs.readFileSync(f, 'utf8') : null; };
for (const b of spec.client || []) { const t = blockText(b.file); if (t == null) { console.log('✘ كتلةٌ غيرُ موجودة: ' + b.file); process.exit(2); } texts[b.file] = t; covered[b.file] = new Uint8Array(t.length); seen[b.file] = 0; }
const keyOf = (url) => { if (/worker_internals_\d+\.mjs$/.test(url) || url.split('?')[0] === 'file://' + WORKER) return 'worker'; const base = url.split('/').pop(); return texts[base] != null && !/^file:/.test(url) ? base : null; };
function paint(key, fns) {
  const len = texts[key].length; const ranges = [];
  for (const fn of fns) for (const rg of fn.ranges) if (rg.startOffset < len) ranges.push(rg);
  ranges.sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset);
  const cnt = new Int32Array(len).fill(-1);
  for (const rg of ranges) cnt.fill(rg.count, rg.startOffset, Math.min(rg.endOffset, len));
  const c = covered[key]; for (let i = 0; i < len; i++) if (cnt[i] > 0) c[i] = 1;
  seen[key]++;
}
for (const f of fs.readdirSync(COV)) {
  if (!f.endsWith('.json')) continue; let j; try { j = JSON.parse(fs.readFileSync(path.join(COV, f), 'utf8')); } catch (e) { continue; }
  for (const s of j.result || []) { const k = keyOf(s.url); if (k) paint(k, s.functions); }
}
fs.rmSync(COV, { recursive: true, force: true });
/* العباراتُ والدوالُّ لكل محرّك */
const walk = (n, f, parent) => { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(x => walk(x, f, parent)); if (typeof n.type === 'string') f(n, parent); for (const k of Object.keys(n)) if (k !== 'loc' && k !== 'start' && k !== 'end' && typeof n[k] === 'object') walk(n[k], f, typeof n.type === 'string' ? n : parent); };
const astW = acorn.parse(wsrc, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
const rangeOfTop = (name) => { for (const n of astW.body) { if (n.type === 'FunctionDeclaration' && n.id && n.id.name === name) return n; if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id && d.id.name === name) return d; } return null; };
const STMT = /Statement$|Declaration$/;
function measure(key, node) {
  const c = covered[key], t = texts[key]; let st = 0, sc = 0, fn = 0, fc = 0; const miss = [], missLines = [];
  walk(node, (n) => {
    if (STMT.test(n.type) && n.type !== 'BlockStatement' && n.type !== 'EmptyStatement' && !(n.type === 'FunctionDeclaration' && n === node)) { st++; if (c[n.start]) sc++; else { if (n.loc) missLines.push(n.loc.start.line); } if (!c[n.start] && miss.length < 6) miss.push((n.loc ? 'L' + n.loc.start.line + ' ' : '@' + n.start + ' ') + t.slice(n.start, n.start + 70).replace(/\s+/g, ' ')); }
    if (/Function/.test(n.type) && n.body) { fn++; if (c[n.body.start]) fc++; }
  });
  return { statements: st, covered: sc, pct: st ? sc / st : 1, functions: fn, fnCovered: fc, miss, missLines: [...new Set(missLines)] };
}
const rows = []; let bad = 0;
/* محرّكُ الخادم مجموعةُ دوالٍّ/متغيّراتٍ عليا (names) تُجمع عباراتُها */
for (const e of spec.worker || []) {
  const nodes = e.names.map(n => [n, rangeOfTop(n)]); const missing = nodes.filter(x => !x[1]).map(x => x[0]);
  if (missing.length) { console.log('✘ غيرُ موجودٍ في العامل: ' + missing.join(', ')); bad++; continue; }
  const agg = { statements: 0, covered: 0, functions: 0, fnCovered: 0, miss: [], missLines: [] };
  for (const [, node] of nodes) { const m = measure('worker', node); agg.statements += m.statements; agg.covered += m.covered; agg.functions += m.functions; agg.fnCovered += m.fnCovered; for (const x of m.miss) if (agg.miss.length < 6) agg.miss.push(x); agg.missLines.push(...m.missLines); }
  agg.pct = agg.statements ? agg.covered / agg.statements : 1;
  rows.push(Object.assign({ engine: e.id, where: '_worker.js (' + e.names.length + ')', label: e.label || '', names: e.names }, agg));
}
for (const b of spec.client || []) {
  const a = acorn.parse(texts[b.file], { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowReturnOutsideFunction: true });
  rows.push(Object.assign({ engine: b.id || b.file, where: b.file, label: b.label || '' }, measure(b.file, a)));
}
const TH = spec.threshold || 0.8; let sumS = 0, sumC = 0;
console.log('╔═ تغطيةُ المحرّكات المحضة (العبارات · الدوال) — ' + (tp ? tp[1] : '?') + ' اختباراً · العتبة ' + Math.round(TH * 100) + '٪ ═╗');
for (const x of rows) {
  sumS += x.statements; sumC += x.covered; const okx = x.pct >= TH; if (!okx) bad++;
  console.log('  ' + (okx ? '✔' : '✘') + ' ' + x.engine.padEnd(26) + ' ' + (Math.round(x.pct * 1000) / 10 + '٪').padStart(7) + '  ' + (x.covered + '/' + x.statements).padStart(11) + ' عبارة · ' + x.fnCovered + '/' + x.functions + ' دالة   ' + x.label + (okx ? '' : '   ← غيرُ مغطّى: ' + x.miss.join(' | ')));
}
const tot = sumS ? sumC / sumS : 1;
console.log('  ' + (tot >= TH ? '✔' : '✘') + ' المجموع' + ' '.repeat(20) + (Math.round(tot * 1000) / 10 + '٪').padStart(7) + '  ' + (sumC + '/' + sumS).padStart(11) + ' عبارة · نُسخُ العامل المدموجة: ' + seen.worker);
if (OUTJ) fs.writeFileSync(OUTJ, JSON.stringify({ threshold: TH, tests: +(tp ? tp[1] : 0), total: { statements: sumS, covered: sumC, pct: tot }, engines: rows.map(x => Object.assign({}, x, { miss: x.miss })) }, null, 1));
console.log('\n══ النتيجة: نجح ' + (rows.length - bad + (tot >= TH ? 1 : 0)) + ' | أخفق ' + (bad + (tot >= TH ? 0 : 1)) + ' ══');
process.exit(bad || tot < TH ? 1 : 0);
