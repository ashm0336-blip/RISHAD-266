/* V7 · د4-أ — قائمةُ الاستثناء لاختبار الحذف (tests/removal/names.allow.json): الملفاتُ التي يُبحث فيها، وفحصُ أن كلَّ مدخلٍ ما زال له موضع.
   مدخلٌ زال موضعُه (المقطعُ لم يعد في ملفه، أو لم يعد يحمل اسمَ نظام) يُفشل الاختبار — فلا تبقى القائمةُ تستثني ما ليس موجوداً.
   يُفحص دائماً على الشجرة الكاملة (الأنظمةُ كلُّها حاضرة): نتيجتُه واحدة في المستودع وفي كل نسخة حذف. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const noComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

/* أجزاءُ الخادم بترتيب parts.json + كتلُ الواجهة (‎.js تحت src عدا مجلدات الأنظمة والقوالب والصفحات المولَّدة) */
export function scanFiles(root, src) {
  const parts = JSON.parse(fs.readFileSync(path.join(root, 'workers', 'parts.json'), 'utf8')).parts.map((p) => path.join(root, 'workers', 'parts', p.file));
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (['systems', 'slots', 'pages'].includes(e.name) ? [] : walk(path.join(d, e.name))) : (/\.js$/.test(e.name) ? [path.join(d, e.name)] : [])));
  return parts.concat(walk(src));
}
export const relOf = (root, f) => path.relative(root, f).split(path.sep).join('/');

/* مداخلُ بلا موضع: تُعاد قائمةً نصية (فارغةٌ = كلُّ مدخلٍ له موضع). names = مفاتيحُ الأنظمة كلِّها (مجلداتُ الشجرة الكاملة). */
export function staleAllow(allow, root, src, names) {
  const NAME = new RegExp('(?:' + names.join('|') + ')', 'i'), out = [];
  if (!names.length) return ['لا نظامَ في الشجرة الكاملة: لا يُعرف ما يُبحث عنه'];
  const files = scanFiles(root, src).filter((f) => !/[\\/]src[\\/]systems[\\/]/.test(path.resolve(f))).map((f) => ({ rel: relOf(root, f), lines: noComments(fs.readFileSync(f, 'utf8')).split('\n') }));
  const byRel = new Map(files.map((f) => [f.rel, f]));
  /* مقطعٌ لا يظهر إلا بغياب نظام (النصُّ المحايد لفتحة): موضعُه في الملف كما يُحقن بلا أنظمة، أو بغياب نظامٍ وحده (tools/systems.py --variants) */
  const named = [...new Set(allow.entries.map((e) => e.file).filter((f) => f !== '*'))];
  const run = spawnSync(process.env.KIVO_PYTHON || 'python3', [path.join(root, 'tools', 'systems.py'), '--src', src, '--variants', named.join(',')], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (run.status !== 0) return ['tools/systems.py --variants: ' + (run.stderr || run.stdout).slice(0, 300)];
  const variants = JSON.parse(run.stdout), absentLines = (rel) => (variants[rel] || []).flatMap((t) => noComments(t).split('\n'));
  for (const s of allow.skipFiles) {
    const f = byRel.get(s.file);
    if (!f) out.push('skipFiles: ' + s.file + ' ليس من الملفات المبحوث فيها');
    else if (!f.lines.some((l) => NAME.test(l))) out.push('skipFiles: ' + s.file + ' لم يعد يذكر اسمَ نظام');
  }
  for (const p of allow.patterns) {
    const re = new RegExp(p.pattern, 'g');
    if (!files.some((f) => f.lines.some((l) => (l.match(re) || []).some((m) => NAME.test(m))))) out.push('patterns: ' + p.pattern + ' لا يطابق موضعاً يحمل اسمَ نظام');
  }
  for (const e of allow.entries) {
    const where = e.file === '*' ? files : [byRel.get(e.file)].filter(Boolean);
    if (e.file !== '*' && !where.length) { out.push('entries: ' + e.file + ' ليس من الملفات المبحوث فيها'); continue; }
    for (const m of e.match) {
      if (!NAME.test(m)) { out.push('entries: ' + e.file + ' «' + m + '» لا يحمل اسمَ نظام'); continue; }
      if (!where.some((f) => f.lines.some((l) => l.includes(m))) && !(e.file !== '*' && absentLines(e.file).some((l) => l.includes(m)))) out.push('entries: ' + e.file + ' «' + m + '» لا موضعَ له');
    }
  }
  return out;
}
