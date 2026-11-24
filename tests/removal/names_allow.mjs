/* V7 · د4-أ — قائمةُ الاستثناء لاختبار الحذف (tests/removal/names.allow.json): الملفاتُ التي يُبحث فيها، وفحصُ أن كلَّ مدخلٍ ما زال له موضع.
   «له موضع» = في حالة حذفٍ ما (بلا أي نظام، أو بغياب نظامٍ وحده ومعه من يتطلبه) يبقى في ملفه سطرٌ يحمل المقطعَ، والمقطعُ يسمّي نظاماً غائباً
   في تلك الحالة — أي أن البحث النصي كان سيفشل لولا المدخل. مدخلٌ نُقل مقطعُه إلى فتحة، أو لم يعد في ملفه، أو لا يسمّي نظاماً: بلا موضع، ويُفشل الاختبار.
   نصُّ كل ملفٍ محقون في كل حالة من tools/systems.py --variants (لا يُكتب شيء)؛ فالنتيجةُ واحدة في المستودع وفي كل نسخة حذف (تُفحص على الشجرة الكاملة). */
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
/* ما يُبحث عنه لأنظمةٍ غائبة: مفتاحُ المجلد حيث ورد (بأي حالة أحرف) + الأسماءُ الأخرى التي يعلنها النظام في system.json ← names
   (تعابيرُ دقيقة ببداية الكلمة، حسّاسةٌ للحالة — مثل task. و tk متبوعةً بحرفٍ كبير). يعيد دالةً: أولُ مطابقةٍ في النص {index} أو null. */
export function finder(keys, names) {
  const rx = (keys.length ? [new RegExp('(?:' + keys.join('|') + ')', 'i')] : []).concat((names || []).map((n) => new RegExp(n)));
  return (text) => { let best = null; for (const r of rx) { const m = r.exec(text); if (m && (!best || m.index < best.index)) best = m; } return best; };
}
export const relOf = (root, f) => path.relative(root, f).split(path.sep).join('/');

/* مداخلُ بلا موضع: تُعاد قائمةً نصية (فارغةٌ = كلُّ مدخلٍ له موضع). root/src = الشجرةُ الكاملة. */
export function staleAllow(allow, root, src) {
  const run = spawnSync(process.env.KIVO_PYTHON || 'python3', [path.join(root, 'tools', 'systems.py'), '--src', src, '--variants'], { encoding: 'utf8', maxBuffer: 1 << 29 });
  if (run.status !== 0) return ['tools/systems.py --variants: ' + (run.stderr || run.stdout).slice(0, 300)];
  const cases = JSON.parse(run.stdout); if (!cases.length) return ['لا نظامَ في الشجرة الكاملة: لا يُعرف ما يُبحث عنه'];
  const scanned = scanFiles(root, src).map((f) => relOf(root, f));
  const base = scanned.filter((rel) => !rel.startsWith('src/systems/'));   /* أجزاءُ الأنظمة نفسُها ليست من القاعدة */
  /* د5-د2: أجزاءُ خادم البرامج الأخرى في ترتيب الضمّ يفحصها البحثُ أيضاً (مستهلكو نظامٍ غائب) — فمدخلٌ لملفٍ منها يُتحقَّق من موضعه كغيره ('*' يبقى للقاعدة وحدها) */
  const disk = new Map(scanned.map((rel) => [rel, noComments(fs.readFileSync(path.join(root, rel), 'utf8')).split('\n')]));
  /* V7 · 53: بياناتُ الروابط المولَّدة (workers/bindings/<وحدة>/data.json) يفحصها perms.test.mjs (د3) بقائمة الاستثناء نفسِها — ومنذ trim (15ae4c5) لا تُشحن
     وثائقُها في الأجزاء، فموضعُ مدخلٍ قد يكون فيها وحدها. تُضمّ إلى «أين» للمداخل العامة ('*') لا إلى البحث عن الأسماء */
  const DOCS = ['workers/bindings/scope-bindings/data.json', 'workers/bindings/guard-bindings/data.json', 'workers/bindings/build-bindings/data.json'].filter((rel) => fs.existsSync(path.join(root, rel)));
  DOCS.forEach((rel) => disk.set(rel, fs.readFileSync(path.join(root, rel), 'utf8').split('\n')));
  const noSub = new Set((allow.roles || []).filter((r) => r.substring === false).map((r) => r.name));   /* د5-هـ: كما في الاختبار */
  const views = cases.map((c) => ({ NAME: { test: ((f) => (t) => !!f(t))(finder(c.gone.filter((k) => !noSub.has(k)), c.names)) }, lines: (rel) => (c.files[rel] === undefined ? disk.get(rel) : noComments(c.files[rel]).split('\n')) }));
  const out = [], known = new Set(scanned);
  for (const s of allow.skipFiles) {
    if (!known.has(s.file)) out.push('skipFiles: ' + s.file + ' ليس من الملفات المبحوث فيها');
    else if (!views.some((v) => v.lines(s.file).some((l) => v.NAME.test(l)))) out.push('skipFiles: ' + s.file + ' لا يذكر اسمَ نظامٍ غائب في أي حالة حذف');
  }
  for (const p of allow.patterns) {
    const re = new RegExp(p.pattern, 'g');
    if (!views.some((v) => base.some((rel) => v.lines(rel).some((l) => (l.match(re) || []).some((m) => v.NAME.test(m)))))) out.push('patterns: ' + p.pattern + ' لا يطابق موضعاً يسمّي نظاماً غائباً في أي حالة حذف');
  }
  for (const e of allow.entries) {
    const where = e.file === '*' ? base.concat(DOCS) : [e.file];
    if (e.file !== '*' && !known.has(e.file)) { out.push('entries: ' + e.file + ' ليس من الملفات المبحوث فيها'); continue; }
    for (const m of e.match) if (!views.some((v) => v.NAME.test(m) && where.some((rel) => v.lines(rel).some((l) => l.includes(m))))) out.push('entries: ' + e.file + ' «' + m + '» لا موضعَ له في أي حالة حذف');
  }
  return out;
}
