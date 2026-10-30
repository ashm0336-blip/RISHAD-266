/* KIVO · RM-5 — الوصولُ إلى دوال الخادم الداخلية النقيّة لاختبار الوحدة (بلا طلبات ولا D1):
   _worker.js وحدةُ ES ذاتُ تصديرٍ افتراضيّ واحد؛ هنا تُنسخ نسخةٌ اختبارية مؤقتة تُلحَق بها `export { … }` للدوال العليا المطلوبة
   (إعلاناتُ function في نطاق الوحدة) ثم تُستورد. لا يمسّ هذا الخادمَ الحقيقي ولا حزمتَه؛ الدوالُ المصدَّرة هي نفسُها التي تعمل في الإنتاج. */
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WORKER } from './harness.mjs';
let inst = 0;
export async function internals(names, workerPath = WORKER) {
  const src = fs.readFileSync(workerPath, 'utf8');
  /* KIVO_258 · AUD-025: والمتغيّراتُ العليا أيضاً (var NAME = …) — سجلّاتُ المحرّكات (FIELDS · ENT · OPS · OP_SHAPE · KIVO_SCOPE …) تُختبر بأعيانها */
  const missing = names.filter(n => !new RegExp('^(?:async )?function ' + n.replace('$', '\\$') + '\\(', 'm').test(src) && !new RegExp('^var ' + n.replace('$', '\\$') + '\\b', 'm').test(src) && !new RegExp('^var [^\\n;]*,\\s*' + n + '\\s*=', 'm').test(src));
  if (missing.length) throw new Error('not top-level functions/vars in worker: ' + missing.join(', '));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_int_'));
  const f = path.join(dir, 'worker_internals_' + (++inst) + '.mjs');
  fs.writeFileSync(f, src + '\nexport { ' + names.join(', ') + ' };\n');
  const m = await import(pathToFileURL(f).href);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  return m;
}
