/* V7 · د5-د — التقويم الموحّد (src/i18n/385-calendar.js) للحاضنات التي تبني سياقَها بنفسها.
   الصفحاتُ لم تعد تحمل نسخاً من دوالّ التقويم: ترثها من عُدّة الصفحات (565) منادياتٍ لـKIVO.BassamCal.
   فحاضنةٌ تستبدل العُدّة ببديلٍ تحتاج الشيئين: الخدمةَ في سياقها، والمنادياتِ على صنفها البديل. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CAL_FILE = path.join(ROOT, 'src/i18n/385-calendar.js');
const NAMES = ['hParts', 'hGreg', 'hGregMonthLabel', 'hGregYearRange', 'hToday', 'hMonthDays'];   /* د5-د2: وعددُ أيام الشهر (العُدّة ترثه منادياً) */

/* يحمّل الخدمة في سياقٍ جاهز (vm.createContext) فيه KIVO */
export function calendar(ctx) { vm.runInContext(fs.readFileSync(CAL_FILE, 'utf8'), ctx, { filename: '385-calendar.js' }); return ctx; }

/* المنادياتُ الخمسة كما تعطيها العُدّة — ولا تطغى على ما عرّفه الصنفُ البديل نفسُه (ساعةٌ مثبَّتة في اختبار مثلاً).
   kivo: كائنُ KIVO أو دالةٌ تعيده (حين يُبنى بعد الصنف). */
export function callers(Base, kivo) {
  const K = () => (typeof kivo === 'function' ? kivo() : kivo);
  const C = class extends Base {};
  for (const n of NAMES) if (!(n in Base.prototype)) C.prototype[n] = function (...a) { return K().BassamCal[n](...a); };
  return C;
}
