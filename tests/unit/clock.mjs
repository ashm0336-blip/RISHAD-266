/* KIVO_265 · البند 19 (الدَّين التقني — تثبيتُ الاختبارات الحساسة للساعة):
   ساعةُ اختبارٍ مثبَّتة: Date.now() و«new Date()» بلا وسيطٍ تبدآن من لحظةٍ ثابتة (10:00 بتوقيت الرياض · 1448-5-9 = 2026-10-20) وتتقدّمان
   بتقدّم الساعة الحقيقية (فالمُهَلُ والانتظاراتُ وحلقاتُ until تعمل كما هي) — فيتطابق يومُ الجهاز (UTC أو الرياض) مع اليوم التشغيلي
   (الآن − 3 ساعات · 070 tkToday) ولا يعود الاختبارُ يُخفق بين 00:00 و03:00 بالرياض حين يختلف يومُ الجهاز عن اليوم التشغيلي أو
   يومُ الرياض المدنيُّ عن يوم UTC. لماذا على مستوى الملف لا الاختبار: ثوابتُ العُدّة (tasks_fx: T · DAY · NOW · صفوفُ المخزن) تُحسب عند
   التحميل، فيجب أن يُستورد هذا الملفُ أولَ الاستيرادات (import './clock.mjs') قبل tasks_fx.mjs وprofile_world.mjs.
   العاملُ (يُحمَّل في العملية نفسها) وسياقاتُ vm (تمرَّر إليها Date العامة) يريان الساعةَ نفسَها.
   KIVO_CLOCK=real يعطّل التثبيت (لإثبات العلة القديمة) · KIVO_CLOCK=<ISO أو ms> يختار لحظةً أخرى (مسحُ الحساسية: node --import). */
const Real = Date;
export const PIN_DEFAULT = Date.UTC(2026, 9, 20, 7, 0, 0);   /* 2026-10-20 10:00 الرياض (UTC+3) = 1448-5-9 (أم القرى) */
const want = process.env.KIVO_CLOCK;
export const PIN_AT = want === 'real' ? null : want ? (/^\d+$/.test(want) ? +want : Real.parse(want)) : PIN_DEFAULT;
if (PIN_AT != null && Number.isNaN(PIN_AT)) throw new Error('KIVO_CLOCK غير مفهوم: ' + want);
export const realNow = () => Real.now();
/* الفرقُ ثابت: الساعةُ المثبَّتة = الحقيقية + off (تتقدّم طبيعياً) */
const off = PIN_AT == null ? 0 : PIN_AT - Real.now();
class PinnedDate extends Real {
  constructor(...a) { if (a.length) super(...a); else super(Real.now() + off); }
  static now() { return Real.now() + off; }
}
Object.defineProperty(PinnedDate, 'name', { value: 'Date' });
if (PIN_AT != null && !globalThis.__KIVO_CLOCK_PINNED) { globalThis.Date = PinnedDate; globalThis.__KIVO_CLOCK_PINNED = PIN_AT; }
export const pinned = () => globalThis.__KIVO_CLOCK_PINNED || null;
