/* V7 · د5-هـ — قاعدةُ «اسمِ الناقل المعلن» (قرار المراجع 4 على د5-د2: قراءاتٌ معلنة بسلوك غيابٍ في عقد كل مستهلك · لا استثناءَ بلا قاعدةٍ مكتوبة).
   المستهلكُ يسأل مالكَ البيانات باسمٍ على الناقل «مالك.شيء@إصدار» — والاسمُ يحمل اسمَ المالك، فيبقى في القاعدة حين يغيب المالك. وهذا هو المقصود:
   القراءةُ تعيد undefined والأمرُ { ok:0, absent:1 }، والمستهلكُ كتب ما يفعله حينها. فلا يُعدّ ذكراً لنظامٍ غائب **بشرطين معاً**:
     ① الاسمُ معلنٌ في عقد المالك الغائب (الشجرة الكاملة: systems/<المالك>/contract.json ← provides: read · commands · events · participants).
     ② والمستهلكُ أعلنه بسلوك غيابه:
          · ملفُّ برنامجٍ (مجلدُ نظامٍ · أو ملفٌّ يدّعيه عقدٌ في src/contracts) — في عقده ← consumes، ويفحصه tools/contracts.py (اختبار العزل).
          · ملفُّ قاعدة — في src/contracts/_base.json ← consumes: { "<الاسم>": { absent, files: [ملفاتُه] } } ويفحصه baseBusProblems أدناه.
   ولا يُمحى إلا الاسمُ المقتبس وحده ("…" أو '…' أو رمزُ السقف "@…")؛ بقيةُ السطر تُفحص كما هي. اسمٌ لم يعلنه المالك (أو اختُرع) يبقى ويُكشف. */
import fs from 'node:fs';
import path from 'node:path';

export const BUS_QUOTED = /(["'])@?([a-z][A-Za-z]*\.[A-Za-z.]+@\d+)\1/g;
const KINDS = ['read', 'commands', 'events', 'participants'];

/* أسماءُ ما يقدّمه النظام k في الشجرة الكاملة */
export function providedBy(full, k) {
  const p = path.join(full, 'systems', k, 'contract.json');
  if (!fs.existsSync(p)) return new Set();
  const pr = JSON.parse(fs.readFileSync(p, 'utf8')).provides || {};
  return new Set(KINDS.flatMap((x) => Object.keys(pr[x] || {})));
}

/* يعيد دالةً تمحو من السطر أسماءَ الناقل التي أعلنها مالكٌ غائب (الشرط ①؛ والشرط ② يفحصه baseBusProblems واختبارُ العزل) */
export function busCleaner(full, gone) {
  const names = new Set(gone.flatMap((k) => [...providedBy(full, k)]));
  if (!names.size) return (line) => line;
  return (line) => line.replace(BUS_QUOTED, (m, q, n) => (names.has(n) ? '""' : m));
}

/* ملفاتُ البرامج (ما يفحص tools/contracts.py إعلانَه): مجلداتُ الأنظمة + ما تدّعيه عقودُ src/contracts بحقل files أو مجلدُ وحدتها */
const PENDING_DIRS = { rounds: 'modules/daily', dreport: 'modules/dreport' };
export function programFile(src, rel) {
  if (rel.startsWith('src/systems/')) return true;
  const cdir = path.join(src, 'contracts');
  for (const f of fs.readdirSync(cdir)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    const k = f.slice(0, -5), d = JSON.parse(fs.readFileSync(path.join(cdir, f), 'utf8'));
    if (PENDING_DIRS[k] && rel.startsWith('src/' + PENDING_DIRS[k] + '/')) return true;
    for (const x of d.files || []) if (path.posix.normalize('src/' + x) === rel) return true;
  }
  return false;
}

/* الشرط ② لملفات القاعدة، على الشجرة الكاملة: كلُّ اسمٍ مقتبس لمالكٍ نظامٍ في ملف قاعدة معلنٌ في _base.json ← consumes بسببٍ وغيابٍ وملفه،
   وكلُّ إعلانٍ له موضع (لا إعلانَ بائت). files = [[rel, text]] (بلا تعليقات). */
export function baseBusProblems(src, files) {
  const systems = fs.readdirSync(path.join(src, 'systems')).filter((k) => fs.existsSync(path.join(src, 'systems', k, 'contract.json')));
  const owners = new Map(systems.flatMap((k) => [...providedBy(src, k)].map((n) => [n, k])));
  const decl = JSON.parse(fs.readFileSync(path.join(src, 'contracts', '_base.json'), 'utf8')).consumes || {};
  const out = [], seen = new Set();
  for (const [n, d] of Object.entries(decl)) {
    if (!owners.has(n)) out.push('_base.consumes: «' + n + '» لا يقدّمه نظام');
    if (!d || typeof d.absent !== 'string' || d.absent.length < 15) out.push('_base.consumes: «' + n + '» بلا سلوك غياب');
    if (!Array.isArray(d && d.files) || !d.files.length) out.push('_base.consumes: «' + n + '» بلا ملفات');
  }
  for (const [rel, text] of files) {
    if (programFile(src, rel)) continue;
    for (const m of text.matchAll(BUS_QUOTED)) {
      const n = m[2]; if (!owners.has(n)) continue;
      seen.add(n + '|' + rel);
      if (!decl[n] || !(decl[n].files || []).includes(rel)) out.push(rel + ': «' + n + '» (مالكه ' + owners.get(n) + ') غيرُ معلن في _base.json ← consumes');
    }
  }
  for (const [n, d] of Object.entries(decl)) for (const f of (d && d.files) || []) if (!seen.has(n + '|' + f)) out.push('_base.consumes: «' + n + '» في ' + f + ' بلا موضع');
  return out;
}
