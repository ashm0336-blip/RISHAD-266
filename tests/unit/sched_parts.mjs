/* V7 · د5-د — أجزاءُ خادم الجدولة (019p…) بترتيب الضمّ الفعلي من workers/parts.json.
   الأجزاءُ تتوزّع بين القاعدة وبرامجها (الجدول الشهري في مجلد نظامه)، فلا يسردها اختبارٌ بأسمائها: يقرأ الترتيبَ من سجلّه.
   كلُّ مسارٍ نسبيٌّ إلى workers/parts (كما في السجل). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SCHED_PARTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'workers', 'parts.json'), 'utf8')).parts.map((p) => p.file).filter((f) => /^019(o1|p)/.test(path.basename(f)))   /* د5-د2: ومعها خريطةُ أسماء الجداول (019o1) — التخزينُ يحضّر بها */;
