/* V7 · 53 تقويم (cal-rest) — عُدّةُ اختبارات الأنظمة العلائقية بالميلادي (TEST_ONLY).
   gregDdl(sql)   نصُّ DDL القانوني القديم (0004 · 0006) بالشكل الحالي بعد 0014: أعمدةُ greg_* واليومُ حتى 31 — لقواعد اختبارٍ تُبنى من DDL مباشرةً
                  (الشكلُ نفسُه الذي يُنتجه 0014 ويكتبه tests/fixtures/gen_fixture.py · cal_g).
   isoDay(y,m,d)  'YYYY-MM-DD' · isoMonth(y,m) 'YYYY-MM'.
   G_YEAR         سنةُ البيانات الثابتة في الاختبارات (2026)؛ وانتقالُ البيانات الهجرية القديمة إليها بنيويٌّ: السنة + 578 (1448 ← 2026)،
                  والشهرُ واليومُ كما هما — فيبقى كلُّ تجميعٍ وترتيبٍ وحدٍّ في الاختبار كما كان (لا إضعاف). المفاتيحُ الهجرية الحقيقية
                  (التحويلُ بأم القرى) من tests/unit/cal_fx.mjs (hToIso · isoKeys). */
export const G_YEAR = 2026;
export const gYear = (hy) => hy + 578;
export const isoDay = (y, m, d) => y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
export const isoMonth = (y, m) => y + '-' + String(m).padStart(2, '0');
export function gregDdl(sql) {
  return String(sql).replace(/hijri_(year|month|day|date)/g, 'greg_$1').replace(/BETWEEN 1 AND 30/g, 'BETWEEN 1 AND 31').replace(/BETWEEN 0 AND 30/g, 'BETWEEN 0 AND 31');
}
/* hYmdToG({y,m,d}) — نقلُ ترحيل 0014 الحقيقي (calHtoGScope بأم القرى) ليومٍ هجري في وثيقةٍ قديمة: يومٌ ⇐ يومُه الميلادي،
   ويومٌ 0 (غيرُ معروف · ق10) ⇐ الشهرُ الميلادي لأول يومٍ في شهره الهجري ويبقى 0. للمتوقَّع في اختبارات الترحيل والاستيراد. */
import { loadServerCal } from './cal_fx.mjs';
let S1 = null;
export function hYmdToG(o) {
  const S = S1 || (S1 = loadServerCal()), out = S.calHtoGScope({ y: o.y, m: o.m, d: o.d == null ? null : o.d });
  if (!out || !out.length) throw new Error('hYmdToG: unmapped ' + JSON.stringify(o));
  return { ...o, y: out[0].y, m: out[0].m, d: o.d == null ? o.d : out[0].d };
}
/* gMonthOfH(y, m, d=1) — {year, month} الميلاديان ليومٍ هجري (للاستعلام بالشهر الميلادي المقابل) */
export function gMonthOfH(y, m, d = 1) { const g = hYmdToG({ y, m, d }); return { year: g.y, month: g.m }; }
/* الإحصائياتُ القديمة بعد الترحيل (0004 ثم 0014) — متوقَّعٌ مستقلّ لا يعيد كتابةَ دالة الترحيل:
   dsDaysG(old)                 أيامُ المسجدين بمفاتيحها الميلادية (hToIso بأم القرى) وقيمُها كما هي حرفاً.
   dsLockDiff(oldLocks, newLocks, now)  «السلوكُ اليومي المطابق» (ق3): لكل يومٍ ميلادي في الأشهر التي تمسّها الأقفالُ القديمة، قفلُه بالقاعدة نفسِها
                                (calLockedIn · 010) قبل الترحيل (هجرياً) = بعده (ميلادياً)؛ يُرجع الأيامَ المختلفة (فارغةً إن طابق). */
export function dsDaysG(old) {
  const out = {};
  for (const s of Object.keys(old)) { if (s === 'locks') continue; out[s] = {}; for (const k of Object.keys(old[s])) out[s][hToIsoDay(k)] = old[s][k]; }
  return out;
}
function hToIsoDay(k) { const S = S1 || (S1 = loadServerCal()); return S.calHtoGDay(k) || k; }
export function dsLockDiff(oldLocks, newLocks, now = Date.now()) {
  const S = S1 || (S1 = loadServerCal()), Tg = S.calToday(now), Th = S.calHOf(Tg.k), bad = [];
  const months = new Set(), src = {};
  for (const k of Object.keys(oldLocks)) { const q = /^(\w+)\|(\d{4})-(\d{1,2})$/.exec(k); (src[q[1]] ||= {})[(+q[2]) + '-' + (+q[3])] = oldLocks[k]; for (const x of S.calGMonthsOfH(+q[2], +q[3])) months.add(q[1] + '|' + x.g); }
  for (const sk of months) {
    const [site, gm] = sk.split('|');
    for (const day of S.calGDays(gm)) {
      const g = S.calGParse(day), h = S.calHOf(day), before = S.calLockedIn(src[site][h.y + '-' + h.m], h.y, h.m, h.d, Th), after = S.calLockedIn(newLocks[sk], g.y, g.m, g.d, Tg);
      if (before !== after) bad.push(site + ' ' + day + ' ' + before + '→' + after);
    }
  }
  for (const k of Object.keys(newLocks)) if (!months.has(k)) bad.push('unexpected ' + k);
  return bad;
}
