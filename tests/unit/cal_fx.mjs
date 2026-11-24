/* V7 · 53 تقويم — عُدّةُ اختبارات التقويم الميلادي المشتركة (cal_api.md §5) — TEST_ONLY.
   loadServerCal()  سياقُ vm فيه تقويمُ الخادم (016) والدالةُ النقية (019v) — الدوالُّ عامّةٌ فيه (S.calHDay …).
   loadClientCal()  KIVO.BassamCal من 380 + 385 الحقيقيين.
   hToIso(k, mode)  مفتاحٌ هجري في بيانات اختبار قديمة ⇐ ISO: يوم ⇐ يومه (اللاحقةُ باقية) · شهر/علامةُ شهر ⇐ شهرُ الأغلبية (mode 'major'، الافتراض)
                    أو الأول ('first') أو كلُّها مصفوفةً ('all'). المفتاحُ الميلادي يعود كما هو، وغيرُ المفتاح كما هو.
   isoKeys(v, mode) نسخةٌ عميقة يُحوَّل فيها كلُّ اسم عضوٍ هجري (وكلُّ نصٍّ هو مفتاحُ يومٍ هجري) بـhToIso. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

export function loadServerCal() {
  const S = { swallow() {}, Intl, Date, Math, Object, JSON, Error, String, Number, Array, console };
  vm.createContext(S);
  vm.runInContext(read('workers/parts/016-base-shared.js'), S, { filename: '016-base-shared.js' });
  vm.runInContext(read('workers/parts/019v-calendar-convert.js'), S, { filename: '019v-calendar-convert.js' });
  return S;
}
export function loadClientCal(over) {
  const W = Object.assign({ KIVO: {}, Intl, Date, Math, Object, JSON, Error }, over || {});
  vm.createContext(W);
  vm.runInContext(read('src/i18n/380-hijri-fallback.js'), W);
  vm.runInContext(read('src/i18n/385-calendar.js'), W);
  return W.KIVO.BassamCal;
}
let S0 = null;
const srv = () => (S0 || (S0 = loadServerCal()));
export function hToIso(k, mode) {
  const S = srv(), p = S.calGParse(k);
  if (!p || p.cal !== 'h') return k;
  if (p.kind === 'day') return S.calHtoGDay(k) || k;
  const all = S.calHtoGMonth(k); if (!all) return k;
  if (mode === 'all') return all;
  if (mode === 'first') return all[0];
  const pre = p.kind === 'mctl' ? 'm:' : '', L = S.calGMonthsOfH(p.y, p.m);
  let best = L[0]; for (const x of L) if (x.days > best.days) best = x;
  return pre + best.g;
}
export function isoKeys(v, mode) {
  if (Array.isArray(v)) return v.map((x) => isoKeys(x, mode));
  if (typeof v === 'string') { const p = srv().calGParse(v); return p && p.cal === 'h' && p.kind === 'day' ? hToIso(v) : v; }
  if (!v || typeof v !== 'object') return v;
  const o = {};
  for (const k of Object.keys(v)) { const n = hToIso(k, mode === 'all' ? 'major' : mode); o[typeof n === 'string' ? n : k] = isoKeys(v[k], mode); }
  return o;
}
