/* V7 · د5-د2 — بقيةُ حسابات التقويم: موضعٌ واحد في الواجهة (src/i18n/385-calendar.js) وموضعٌ واحد في الخادم (workers/parts/016-base-shared.js)،
   ومخرجُ كلِّ دالةٍ موحَّدة مطابقٌ للنسخة التي حُذفت. المعيارُ معيارُ v7_d5_calendar.test.mjs نفسُه:
   المرجعُ أدناه (OLD) نصُّ النسخ القديمة كما كانت في مواضعها قبل الحذف — يُحفظ هنا ليُقارَن به لا ليُستعمل (TEST_ONLY). ما كان يبني مُنسِّقاً
   في كل نداء ثُبِّت مُنسِّقُه هنا مرةً (للسرعة وحدها — الخيارات هي هي).
   ① الواجهة: لكل يومٍ هجري في 21 سنة (1438–1458) ولِلحظاتٍ حول منتصف الليل المحلي: كلُّ نسخةٍ قديمة = دالتُها الموحَّدة.
   ② ما بقي دالتين فبدليل: hParts/hPartsRiyadh · hMonthDays/hMonthDaysNoon · hGregUTC/hGregNoon · hNow/hPartsSafe — وما دُمج فبدليل (dim = hMonthDaysNoon).
   ③ الخادم: dsToday · tkHij · tkHijMid · tkRecDayMid · tkRiyMid · tkDayNum القديمة = الجديدة (الأجزاءُ محمَّلةً في vm)، وكتلةُ PF-CORE تطابق الموضعين.
   ④ يُعاد كلُّ ذلك في أربع مناطق زمنية (الرياض · UTC · لوس أنجلوس · كيريتيماتي) عبر عملياتٍ فرعية بـTZ، ومعها منطقةُ الجهاز.
   ⑤ مسحُ المصدر: لا ملفَّ غير 385/380 (واجهة) و016 (خادم) — وكتلةِ PF-CORE المشتركة حرفاً — يذكر islamic-umalqura، ولا اسمَ قديماً باقٍ، والمنادياتُ سطرٌ واحد. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/* الخدمةُ في سياقٍ: جدولُ الاحتياط الحقيقي (380) ثم التقويم (385) — وIntl يُستبدل لاختبار غياب الدعم */
const client = (over) => { const W = Object.assign({ KIVO: {}, Intl, Date, Math, Object, JSON, Error }, over || {}); vm.createContext(W); if (!(over && over.noTable)) vm.runInContext(read('src/i18n/380-hijri-fallback.js'), W); vm.runInContext(read('src/i18n/385-calendar.js'), W); return W; };
const Y0 = 1438, Y1 = 1458, DAYS = (Y1 - Y0 + 1) * 12 * 30;
const J = (x) => JSON.parse(JSON.stringify(x));

/* ══ النسخُ القديمة حرفاً (TEST_ONLY) ══ */
const F_NU = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' });
const F_Y = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' }), F_M = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric' });
const F_RIY = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
const OLD = {
  /* من v7_d5_calendar (نسختا hGreg ونسخةُ hParts) — تُبنى عليها نسخُ طول الشهر القديمة */
  hParts(t) { const e = F_NU.formatToParts(t), s = (t) => +e.find((e) => e.type === t).value; return { y: s('year'), m: s('month'), d: s('day') }; },
  plain(t, e, s) { let n = new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (s - 1))); try { for (let a = 0; a < 12; a++) { const a = this.hParts(n); if (a.y === t && a.m === e && a.d === s) return n; const i = 354.367 * (a.y - t) + 29.5306 * (a.m - e) + (a.d - s); n = new Date(n.getTime() - 864e5 * (Math.round(i) || (i > 0 ? 1 : -1))); } } catch (t) {} return n; },
  noon(t, e, s) { const n = (t) => new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12); let i = n(new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (s - 1)))); try { for (let o = 0; o < 12; o++) { const o = this.hParts(i); if (o.y === t && o.m === e && o.d === s) return i; const r = 354.367 * (o.y - t) + 29.5306 * (o.m - e) + (o.d - s); i = n(new Date(i.getTime() - 864e5 * (Math.round(r) || (r > 0 ? 1 : -1)))); } } catch (t) {} return i; },
  /* طولُ الشهر: نسخةُ الخطة/المضبوطات/المهام/الجدول/الاسترشاد · نسخةُ المتابعة اليومية/التقرير اليومي */
  monthDaysPlain(t, e) { let n = 30; try { const s = this.plain(t, e, 1), a = this.hParts(new Date(s.getTime() + 25056e5)); n = a.y === t && a.m === e ? 30 : 29; } catch (t) {} return n; },
  monthDaysNoon(t, e) { let n = 30; try { const s = this.noon(t, e, 1), i = this.hParts(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 29, 12)); n = i.y === t && i.m === e ? 30 : 29; } catch (t) {} return n; },
  /* صفحة الموظفين: مفتاحُ الساعة · مفتاحُ الشهر (مُنسِّقان بلا nu-latn) · أجزاءُ اليوم بـparseInt */
  empClock(t) { return F_NU.format(t); },
  empYm(t) { return parseInt(F_Y.format(t)) + '-' + parseInt(F_M.format(t)); },
  empDay(t) { const e = F_NU.formatToParts(t), r = (t) => parseInt((e.find((e) => e.type === t) || {}).value, 10); return r('year') + '-' + r('month') + '-' + r('day'); },
  /* عُدّة الصفحات (plan+staff) curHijri · استيراد الموظفين curHij/curHijriKey */
  curHijri(t) { return { y: parseInt(F_Y.format(t)), m: parseInt(F_M.format(t)) }; },
  /* مراقبُ الميدان 520 (بتراجعه) · مراقبُ الإشعارات 442 todayKey · المهام tkHParts · الإحصائيات hOfDate/STX · الخطة _olStx */
  fieldParts(K, I, dt) { try { var p = new I.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(dt || new Date()); var g = function (k) { return +p.filter(function (x) { return x.type === k; })[0].value; }; return { y: g('year'), m: g('month'), d: g('day') }; } catch (e) { try { return K.BassamHijri.now(dt); } catch (e2) { return { y: 1448, m: 1, d: 1 }; } } },
  nfToday(t) { var p = F_NU.formatToParts(t); var g = function (t) { return (p.filter(function (x) { return x.type === t; })[0] || {}).value; }; return { y: +g('year'), m: +g('month'), d: +g('day'), key: g('year') + '-' + g('month') + '-' + g('day') }; },
  tkHParts(t) { const e = F_NU.formatToParts(new Date(t)), n = (t) => { const n = e.find((e) => e.type === t); return n ? +n.value : 0; }; return { y: n('year'), m: n('month'), d: n('day') }; },
  hOfDate(dt) { const o = {}; F_NU.formatToParts(dt).forEach((p) => (o[p.type] = +p.value)); return o; },
  /* سنةُ الحقوق (260 yearH · صفحة المدير plRightsNow) */
  yearH(t) { var y = F_Y.format(t); var m = /\d{4}/.exec(y); return m ? m[0] : ''; },
  /* يومُ الرياض: الخطة _roundKeyNow · مؤشراتُ المهام _tkNow · ختمُ التوثيق _tkStampLines */
  riyadh(t) { const parts = F_RIY.formatToParts(t), part = (t) => +parts.find((p) => p.type === t).value; return { y: part('year'), m: part('month'), d: part('day') }; },
  stampH(t) { const q = {}; F_RIY.formatToParts(t).forEach((p) => (q[p.type] = p.value)); return q.day + '/' + q.month + '/' + q.year + 'هـ'; },
  /* النصوص الهجرية: الموظفون (4) · المدير (سجلّ البثّ) · المهام (ساعةُ الرياض) */
  txMonth(e) { return e.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { month: 'long' }); },
  txShort(e) { return e.toLocaleDateString('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }); },
  txChip(e) { return e.toLocaleDateString('ar-SA-u-ca-islamic-umalqura-nu-latn', { month: 'long', year: 'numeric' }); },
  txAdmin(t) { return new Date(t).toLocaleString('ar-SA-u-ca-islamic-umalqura-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); },
  txRiyadhClock(t) { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: !0 }).format(new Date(t)); },
  /* الطباعة 566: «الموافق» الميلادي بحثاً ±30 يوماً حول تقديرٍ على UTC */
  printGreg(t, e, n) { let r = ''; try { const s = Date.UTC(622, 6, 16), i = new Date(s + Math.round(864e5 * (354.36667 * (t - 1) + 29.53 * (e - 1) + (n - 1)))), o = F_NU; for (let s = -30; s <= 30; s++) { const a = new Date(i.getTime() + 864e5 * s), l = o.formatToParts(a), d = (t) => +l.find((e) => e.type === t).value; if (d('year') === t && d('month') === e && d('day') === n) { r = a.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }); break; } } } catch (t) {} return r; },
  /* مراقبُ الإشعارات 442: اسمُ يوم الأسبوع ليومٍ هجري بحثاً ±400 يوماً حول الآن */
  WD: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  wdName(day) { var WD = this.WD; try { var p = day.split('-').map(Number); var fmt = F_NU; var t = new Date(); for (var i = -400; i <= 400; i++) { var d = new Date(t.getTime() + i * 86400000); var parts = {}; fmt.formatToParts(d).forEach(function (x) { parts[x.type] = x.value; }); if (+parts.year === p[0] && +parts.month === p[1] && +parts.day === p[2]) return WD[d.getDay()]; } } catch (e) {} return ''; },
};
/* الإحصائيات اليومية: _hf · hOfDate · gOf · dim (بحثٌ ثنائي على منتصف ليل UTC) — I = Intl المستعمل (يُستبدل لاختبار غياب الدعم) */
const oldStats = (I) => ({
  _f: undefined,
  _hf() { if (this._f === undefined) { try { this._f = new I.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }); } catch (e) { this._f = null; } } return this._f; },
  hOfDate(dt) { const f = this._hf(); const o = {}; f.formatToParts(dt).forEach((p) => (o[p.type] = +p.value)); return o; },
  gOf(y, m, d) { const ck = this.__g || (this.__g = {}), key = y + '|' + m + '|' + d; if (key in ck) return ck[key];
    const f = this._hf(); if (!f) return (ck[key] = null); let lo = -40000, hi = 40000, k = y * 10000 + m * 100 + d;
    while (lo <= hi) { const mid = (lo + hi) >> 1, dt = new Date(Date.UTC(1970, 0, 1 + mid)), o = this.hOfDate(dt), kk = o.year * 10000 + o.month * 100 + o.day;
      if (kk === k) return (ck[key] = dt); kk < k ? lo = mid + 1 : hi = mid - 1; } return (ck[key] = null); },
  dim(y, m) { const ck = this.__dim || (this.__dim = {}), key = y + '|' + m; if (ck[key]) return ck[key];
    for (let d = 31; d >= 28; d--) { const g = this.gOf(y, m, d); if (g) { const o = this.hOfDate(g); if (o.year === y && o.month === m && o.day === d) return (ck[key] = d); } } return (ck[key] = 29); },
});
/* العهد: النسخةُ الكاملة التي كانت في شظيّة صفحة الموظفين */
const OLD_CU = {
  _cuFmt() { if (void 0 === this.__cuF) try { this.__cuF = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }); } catch (t) { this.__cuF = null; } return this.__cuF; },
  cuParts(t) { const e = this._cuFmt().formatToParts(t), r = (t) => +e.find((e) => e.type === t).value; return { y: r('year'), m: r('month'), d: r('day') }; },
  cuGreg(t, e, r) { let n = new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (r - 1))); try { for (let a = 0; a < 12; a++) { const a = this.cuParts(n); if (a.y === t && a.m === e && a.d === r) return n; const i = 354.367 * (a.y - t) + 29.5306 * (a.m - e) + (a.d - r); n = new Date(n.getTime() - 864e5 * (Math.round(i) || (i > 0 ? 1 : -1))); } } catch (t) {} return n; },
  cuGregMonthLabel(t, e) { let n = ''; try { n = this.cuGreg(t, e, 15).toLocaleDateString('ar-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' }); } catch (t) {} return n; },
  cuGregYearRange(t) { try { const e = this.cuGreg(t, 1, 1).getFullYear(), r = this.cuGreg(t, 12, 29).getFullYear(); return e === r ? e + ' م' : e + ' – ' + r + ' م'; } catch (t) { return ''; } },
};
/* ══ الخادم: النسخُ القديمة حرفاً (016 dsToday · 070 tkHij/tkDayNum · 073 tkHijMid/tkRiyMid/tkRecDayMid) ══ */
const OLD_SRV_SRC = `
var DS_GRACE = 3 * 3600 * 1000;
function dsToday(now) {
  try {
    var f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
    var o = {}; f.formatToParts(new Date(now - DS_GRACE)).forEach(function (p) { o[p.type] = +p.value; });
    if (o.year > 1300 && o.month >= 1 && o.month <= 12 && o.day >= 1 && o.day <= 30) return { y: o.year, m: o.month, d: o.day };
  } catch (e) { swallow('dstats', e); }
  return null;
}
var TK_HFMT = null;
function tkHij(ms) {
  try {
    if (!TK_HFMT) TK_HFMT = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
    var o = {}; TK_HFMT.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = +p.value; });
    if (o.year > 1300 && o.month >= 1 && o.month <= 12 && o.day >= 1 && o.day <= 30) return { y: o.year, m: o.month, d: o.day, k: o.year + '-' + o.month + '-' + o.day, ym: o.year + '-' + o.month };
  } catch (e) { swallow('tk-hij', e); }
  return null;
}
function tkToday(now) { return tkHij(now - 3 * 3600 * 1000); }
function tkDayNum(k) { var p = String(k).split('-'); return (+p[0]) * 10000 + (+p[1]) * 100 + (+p[2]); }
var TK_HMID = nmap();
function tkHijMid(k, near) {
  var kN = String(k).replace(/-0(\\d)/g, '-$1'); if (TK_HMID[kN]) return TK_HMID[kN];
  var p = kN.split('-').map(Number), m = tkRiyMid(near), H = tkHij(m + 12 * 36e5), q; if (!H || p.length !== 3) return 0;
  m += Math.round((p[0] - H.y) * 354.37 + (p[1] - H.m) * 29.53 + (p[2] - H.d)) * 864e5;
  for (q = 0; q < 40; q++) { H = tkHij(m + 12 * 36e5); if (!H) return 0; if (H.k === kN) { TK_HMID[kN] = m; return m; } m += (tkDayNum(kN) > tkDayNum(H.k) ? 1 : -1) * 864e5; }
  return 0;
}
function tkRiyMid(t) { return Math.floor((t + 3 * 36e5) / 864e5) * 864e5 - 3 * 36e5; }
function tkRecDayMid(dk, s) {
  var kN = String(dk).replace(/-0(\\d)/g, '-$1'), m = tkRiyMid(s), q, D, H;
  for (q = 0; q < 3; q++) { D = m + [0, -864e5, 864e5][q]; H = tkHij(D + 12 * 36e5); if (H && H.k === kN) return D; }
  return m;
}`;
const srvCtx = (I) => { const log = []; const ctx = { Intl: I || Intl, Date, Math, JSON, Object, Array, String, Number, isNaN, parseInt, console, log }; ctx.isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v); ctx.swallow = (tag) => { log.push(tag); }; ctx.nmap = () => Object.create(null); ctx.parseJson = (s, d) => { try { return JSON.parse(s); } catch (e) { return d; } }; ctx.METK_DAY_RX = /^\d{4}-\d{1,2}-\d{1,2}$/; vm.createContext(ctx); return ctx; };
const oldServer = (I) => { const c = srvCtx(I); vm.runInContext(OLD_SRV_SRC, c); return c; };
const newServer = (I) => { const c = srvCtx(I); for (const f of ['workers/parts/016-base-shared.js', 'src/systems/tasks/server/070-task-core.js', 'src/systems/tasks/server/073-task-recur.js']) vm.runInContext(read(f), c, { filename: path.basename(f) }); return c; };

function proof() {
  const W = client(), C = W.KIVO.BassamCal, S = oldStats(Intl), R = { days: 0, instants: 0, riyadhDiffers: 0, monthPlainVsNoon: 0, monthStatsVsNoon: 0, utcDayDiffers: 0, utcInstantDiffers: 0, printShown: 0, wdChecked: 0, wdBand: 0, srvInstants: 0, srvMid: 0 };
  const now = new Date(), noonOf = (t) => new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12), today = noonOf(now).getTime();
  const sameParts = (a, b, why) => assert.deepEqual({ y: a.y, m: a.m, d: a.d }, { y: b.y, m: b.m, d: b.d }, why);
  for (let y = Y0; y <= Y1; y++) for (let m = 1; m <= 12; m++) {
    /* طولُ الشهر: كلُّ نسخةٍ قديمة = دالتُها · ونسخةُ الإحصائيات = نسخةَ الظهر (فدُمجت) · والنسختان الأوليان لا تتطابقان في كل منطقة (فبقيتا) */
    const lp = OLD.monthDaysPlain(y, m), ln = OLD.monthDaysNoon(y, m), ls = S.dim(y, m);
    assert.equal(C.hMonthDays(y, m), lp, 'hMonthDays ' + [y, m]); assert.equal(C.hMonthDaysNoon(y, m), ln, 'hMonthDaysNoon ' + [y, m]); assert.equal(C.hMonthDaysNoon(y, m, 29), ls, 'dim ' + [y, m]);
    if (lp !== ln) R.monthPlainVsNoon++; if (ls !== ln) R.monthStatsVsNoon++;
    assert.equal(C.hGregMonthLabel(y, m), OLD_CU.cuGregMonthLabel(y, m), 'cuGregMonthLabel ' + [y, m]);
    for (let d = 1; d <= 31; d++) {
      /* الإحصائيات: gOf = hGregUTC لحظةً بلحظة (ومنها اليومُ غيرُ الموجود ⇒ null) */
      const g = S.gOf(y, m, d), u = C.hGregUTC(y, m, d);
      assert.equal(u === null ? null : u.getTime(), g === null ? null : g.getTime(), 'gOf ' + [y, m, d]);
      if (d === 31) { assert.equal(g, null); continue; }
      R.days++;
      const n = C.hGregNoon(y, m, d), exists = d <= ln;
      if (exists) { assert.ok(g, 'يومٌ موجود له لحظةُ UTC'); if (g.getUTCDate() !== n.getDate()) R.utcDayDiffers++; if (g.getTime() !== n.getTime()) R.utcInstantDiffers++; }
      /* العهد: cuGreg = hGreg لحظةً بلحظة */
      assert.equal(C.hGreg(y, m, d).getTime(), OLD_CU.cuGreg(y, m, d).getTime(), 'cuGreg ' + [y, m, d]);
      /* الطباعة: «الموافق» القديم = hGregExact (وغيرُ الموجود بلا موافق في الاثنين) */
      const x = C.hGregExact(y, m, d), shown = x ? x.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      assert.equal(shown, OLD.printGreg(y, m, d), 'print ' + [y, m, d]); assert.equal(!!x, exists, 'hGregExact ' + [y, m, d]); if (shown) R.printShown++;
      /* اسمُ يوم الأسبوع (442): كلُّ يومٍ في جوار اليوم (±420) وأولُ كل شهرٍ ومنتصفُه؛ الاختلافُ لا يُقبل إلا على حافة النافذة (±400 ± 4) */
      const delta = Math.round((n.getTime() - today) / 864e5);
      if (exists && (Math.abs(delta) <= 420 || d === 1 || d === 15)) {
        const was = OLD.wdName(y + '-' + m + '-' + d), is = OLD.WD[C.hWeekdayIndex(y, m, d, 400)] || '';
        if (was !== is) { assert.ok(Math.abs(Math.abs(delta) - 400) <= 4, 'wdName ' + [y, m, d, was, is, delta]); R.wdBand++; } else if (Math.abs(delta) < 396) assert.equal(is, OLD.WD[n.getDay()], 'اسمُ اليوم هو يومُ التاريخ الميلادي');
        R.wdChecked++;
      }
      /* لحظاتُ ذلك اليوم: ظهرُه · آخرُ لحظةٍ قبل منتصف ليله · منتصفُ ليله · آخرُ لحظةٍ فيه */
      const mid = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0).getTime();
      for (const ms of [n.getTime(), mid - 1, mid, new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59, 999).getTime()]) {
        const t = new Date(ms), h = C.hParts(t); R.instants++;
        assert.equal(h.m + '/' + h.d + '/' + h.y + ' AH', OLD.empClock(t), 'مفتاحُ الساعة');
        assert.equal(h.y + '-' + h.m, OLD.empYm(t)); assert.equal(h.y + '-' + h.m + '-' + h.d, OLD.empDay(t));
        assert.deepEqual({ y: h.y, m: h.m }, OLD.curHijri(t));
        if (ms !== mid) sameParts(C.hPartsSafe(t), OLD.fieldParts(W.KIVO, Intl, t), 'field');   /* تبني مُنسِّقاً في كل نداء: ثلاثُ لحظاتٍ من الأربع */
        sameParts(h, OLD.tkHParts(ms), 'tkHParts');
        assert.deepEqual({ y: h.y, m: h.m, d: h.d, key: h.y + '-' + h.m + '-' + h.d }, OLD.nfToday(t));
        const o = OLD.hOfDate(t); assert.deepEqual([h.y, h.m, h.d], [o.year, o.month, o.day]);
        assert.equal((/\d{4}/.exec(String(h.y)) || [''])[0], OLD.yearH(t));
        const r = C.hPartsRiyadh(t); sameParts(r, OLD.riyadh(t), 'riyadh'); assert.equal(r.d + '/' + r.m + '/' + r.y + 'هـ', OLD.stampH(t));
        if (r.y !== h.y || r.m !== h.m || r.d !== h.d) R.riyadhDiffers++;
        /* «اليوم» من جدول الاحتياط = الجدولُ نفسُه، ويطابق hPartsSafe حيث يوجد الدعم */
        sameParts(C.hNow(t), W.KIVO.BassamHijri.now(t), 'hNow'); sameParts(C.hNow(t), C.hPartsSafe(t), 'hNow = hPartsSafe بوجود الدعم');
        /* النصوص: ظهرُ كل يوم، واللحظاتُ الأربع على حدود الشهر (النسخُ القديمة تبني مُنسِّقاً في كل نداء) */
        if (ms === n.getTime() || d === 1 || d >= 29) {
          assert.equal(C.hText(t, { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: !0 }), OLD.txRiyadhClock(ms));
          assert.equal(C.hText(t, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }), OLD.txAdmin(ms));
          assert.equal(C.hText(t, { month: 'long' }), OLD.txMonth(t)); assert.equal(C.hText(t, { day: 'numeric', month: 'long', year: 'numeric' }), OLD.txShort(t)); assert.equal(C.hText(t, { month: 'long', year: 'numeric' }), OLD.txChip(t));
        }
      }
    }
  }
  for (let y = Y0; y <= Y1; y++) assert.equal(C.hGregYearRange(y), OLD_CU.cuGregYearRange(y));
  /* الآن: المنادياتُ التي لا تأخذ تاريخاً */
  const t0 = new Date(), cur = C.hToday(); assert.deepEqual({ y: cur.y, m: cur.m }, OLD.curHijri(t0)); sameParts(cur, OLD.hParts(t0), 'hToday');
  /* ── الخادم: لكل يومٍ مدنيّ في المدى ولِلحظاتٍ حول منتصف ليل الرياض وحول مهلة الثلاث ساعات ── */
  const A = oldServer(), B = newServer(), first = C.hGregNoon(Y0, 1, 1).getTime(), last = C.hGregNoon(Y1, 12, 29).getTime();
  const P = srvCtx(); vm.runInContext(read('workers/parts/062b-me-history.js').split('/* ══ PF-CORE:END ══ */')[0], P);
  const PC = { KIVO: {}, Intl, Date, Math, JSON, console }; vm.createContext(PC); vm.runInContext(read('src/services/535-profile-facts.js'), PC);
  for (let day = A.tkRiyMid(first); day <= last; day += 864e5) {
    assert.equal(B.tkRiyMid(day + 5e6), A.tkRiyMid(day + 5e6)); assert.equal(B.calRiyadhMid(day + 5e6), day);
    for (const ms of [day - 1, day, day + 3 * 36e5 - 1, day + 3 * 36e5, day + 12 * 36e5]) {
      R.srvInstants++;
      const a = A.tkHij(ms), b = B.tkHij(ms); assert.deepEqual(J(b), J(a), 'tkHij'); assert.deepEqual(J(B.dsToday(ms)), J(A.dsToday(ms)), 'dsToday'); assert.deepEqual(J(B.tkToday(ms)), J(A.tkToday(ms)));
      assert.equal(B.tkDayNum(b.k), A.tkDayNum(a.k));
      /* كتلةُ PF-CORE (خادماً وواجهةً) تعطي اليومَ نفسَه الذي يعطيه الموضعان الموحَّدان */
      const pf = P.pfHijriAt(ms), c = B.calHijriAt(ms); assert.deepEqual([pf.y, pf.m, pf.d], [c.y, c.m, c.d], 'PF-CORE = calHijriAt');
      const pc = PC.KIVO.BassamProfileFacts.hijriAt(ms), r = C.hPartsRiyadh(new Date(ms)); assert.deepEqual([pc.y, pc.m, pc.d], [r.y, r.m, r.d], 'PF-CORE = hPartsRiyadh'); assert.deepEqual([c.y, c.m, c.d], [r.y, r.m, r.d], 'الخادم = الواجهة');
    }
    const k = A.tkHij(day + 12 * 36e5).k, k0 = k.replace(/-(\d)$/, '-0$1');
    /* من اليوم نفسِه ومن بعيدٍ أمامه لكل يوم؛ ومن بعيدٍ خلفه ومن جواره على حدود الشهر ومنتصفه */
    const edge = /-(1|15|29|30)$/.test(k);
    for (const near of edge ? [day, day + 40 * 864e5, day + 7e6, day - 400 * 864e5, day + 3 * 864e5] : [day, day + 40 * 864e5]) {
      R.srvMid++;
      /* الحفظُ يُفرَّغ قبل كل مقارنة (فتُحسب من near فعلاً) — والمحفوظةُ تُقارَن بعد الحلقة */
      A.TK_HMID = Object.create(null); B.CAL_HMID = Object.create(null);
      assert.equal(B.tkHijMid(k, near), A.tkHijMid(k, near), 'tkHijMid ' + [k, near - day]); assert.equal(B.tkHijMid(k, near), day);
      assert.equal(B.tkRecDayMid(k, near), A.tkRecDayMid(k, near), 'tkRecDayMid ' + [k, near - day]); assert.equal(B.tkRecDayMid(k0, near), A.tkRecDayMid(k0, near));
    }
    assert.equal(B.tkHijMid(k0, day), A.tkHijMid(k0, day)); assert.equal(B.tkHijMid('TEST_ONLY', day), A.tkHijMid('TEST_ONLY', day)); assert.equal(B.tkHijMid('1448-13-40', day), A.tkHijMid('1448-13-40', day));
  }
  for (let y = Y0; y <= Y1; y++) for (let m = 1; m <= 12; m++) assert.equal(P.pfMonthDays(y, m).length, C.hMonthDaysNoon(y, m), 'PF-CORE: طولُ الشهر');
  return R;
}

if (process.env.V7_CAL2_CHILD) { process.stdout.write(JSON.stringify(proof())); process.exit(0); }

const ZONES = ['Asia/Riyadh', 'UTC', 'America/Los_Angeles', 'Pacific/Kiritimati'];
const child = (TZ) => new Promise((ok, no) => execFile(process.execPath, ['--no-warnings', fileURLToPath(import.meta.url)], { env: { ...process.env, TZ, V7_CAL2_CHILD: '1' }, encoding: 'utf8', maxBuffer: 1 << 26 }, (e, out, err) => (e ? no(new Error(TZ + ': ' + String(err || e).slice(0, 4000))) : ok(JSON.parse(out)))));

test('①③ every replaced computation equals its removed copy for every Hijri day of 21 years (this machine\'s zone)', () => {
  const r = proof();
  assert.equal(r.days, DAYS); assert.equal(r.instants, DAYS * 4); assert.ok(r.srvInstants > 7000 * 5); assert.ok(r.srvMid > 7000 * 2); assert.ok(r.wdChecked > 800); assert.ok(r.printShown > 7400);
  assert.equal(r.monthStatsVsNoon, 0);
  console.log('CAL2 here ' + JSON.stringify(r));
});

test('②④ the same proof in four time zones — and the evidence for each pair kept as two functions or merged into one', async () => {
  const seen = {}, got = await Promise.all(ZONES.map(child));   /* العملياتُ الأربع معاً */
  for (const [i, TZ] of ZONES.entries()) { const r = got[i]; assert.equal(r.days, DAYS, TZ); assert.equal(r.instants, DAYS * 4, TZ); console.log('CAL2 ' + TZ + ' ' + JSON.stringify(r)); seen[TZ] = r; }
  const all = Object.values(seen);
  /* دُمجت: نسخةُ الإحصائيات لطول الشهر = نسخةَ الظهر في كل شهرٍ وكل منطقة */
  assert.ok(all.every((r) => r.monthStatsVsNoon === 0), 'dim ≡ hMonthDaysNoon');
  /* بقيتا دالتين: نسخةُ +29 يوماً بالساعات تخالف نسخةَ الظهر حيث يوجد توقيتٌ صيفي */
  assert.ok(seen['America/Los_Angeles'].monthPlainVsNoon > 0, 'hMonthDays ≠ hMonthDaysNoon في لوس أنجلوس'); assert.equal(seen['Asia/Riyadh'].monthPlainVsNoon, 0);
  /* بقيتا دالتين: يومُ الرياض غيرُ يوم الجهاز خارج الرياض */
  assert.equal(seen['Asia/Riyadh'].riyadhDiffers, 0); for (const TZ of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) assert.ok(seen[TZ].riyadhDiffers > 0, 'hParts ≠ hPartsRiyadh في ' + TZ);
  /* دالةٌ ثالثة: لحظةُ الإحصائيات (منتصف ليل UTC) غيرُ لحظة hGregNoon دائماً، ويومُها بـUTC غيرُ اليوم المحلي غربَ غرينتش */
  assert.ok(all.every((r) => r.utcInstantDiffers > 0)); assert.ok(seen['America/Los_Angeles'].utcDayDiffers > 0); assert.equal(seen['Asia/Riyadh'].utcDayDiffers, 0);
});

test('② without calendar support: each caller keeps the fallback it had (30 for pages, 29 for daily stats; the table then the constant)', () => {
  /* Intl يرمي: كما كانت النسخُ تتوقّع */
  const Thrower = { DateTimeFormat: function () { throw new RangeError('TEST_ONLY no calendar'); } };
  const W = client({ Intl: Thrower }), C = W.KIVO.BassamCal, S = oldStats(Thrower);
  for (const [y, m] of [[1448, 1], [1448, 9], [1450, 12]]) {
    assert.equal(C.hMonthDays(y, m), 30); assert.equal(C.hMonthDaysNoon(y, m), 30);          /* الصفحات: try/catch ⇒ 30 */
    assert.equal(S.dim(y, m), 29); assert.equal(C.hMonthDaysNoon(y, m, 29), 29);             /* الإحصائيات: 29 */
    assert.equal(S.gOf(y, m, 1), null); assert.equal(C.hGregUTC(y, m, 1), null);
    assert.equal(C.hWeekdayIndex(y, m, 1, 400), -1); assert.throws(() => C.hGregExact(y, m, 1)); assert.throws(() => C.hPartsRiyadh(new Date())); assert.throws(() => C.hText(new Date(), { month: 'long' }));
  }
  assert.throws(() => S.hOfDate(new Date())); assert.throws(() => C.hParts(new Date()));
  /* مراقبُ الميدان: الجدولُ ثم الثابت */
  const t = new Date(Date.UTC(2026, 10, 20, 9));
  assert.deepEqual(J(C.hPartsSafe(t)), J(OLD.fieldParts(W.KIVO, Thrower, t)));
  const W2 = client({ Intl: Thrower, noTable: true });
  assert.deepEqual(J(W2.KIVO.BassamCal.hPartsSafe(t)), { y: 1448, m: 1, d: 1 }); assert.deepEqual(OLD.fieldParts(W2.KIVO, Thrower, t), { y: 1448, m: 1, d: 1 });
  /* hNow: بغياب الجدول ترجع ما أُعطيت (من كان يحرس بـ«KIVO.BassamHijri ?») أو ترمي (من كان ينادي الجدولَ بلا حراسة) */
  const fb = { y: 1448, m: 2, d: 1 }; assert.equal(W2.KIVO.BassamCal.hNow(void 0, fb), fb); assert.equal(W2.KIVO.BassamCal.hNow(t, null), null); assert.throws(() => W2.KIVO.BassamCal.hNow());
  /* وبوجوده: هو نفسُه — الكائنُ الذي يعيده الجدول والتاريخُ الذي أُعطي */
  const got = { y: 1447, m: 7, d: 7 }, calls = []; const W3 = client({ noTable: true }); W3.KIVO.BassamHijri = { now: (d) => (calls.push(d), got) };
  assert.equal(W3.KIVO.BassamCal.hNow(t), got); assert.equal(W3.KIVO.BassamCal.hNow(void 0, fb), got); assert.deepEqual(calls, [t, undefined]);
  /* دالتان لا واحدة (hNow/hPartsSafe): متصفحٌ يعيد التقويمَ الميلادي صامتاً — الجدولُ يتحقّق من المدى فيتراجع للحساب الجدولي، وhPartsSafe تعيد ما أعطاه Intl */
  const Silent = { DateTimeFormat: function (loc, o) { return new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', o); } };
  const W4 = client({ Intl: Silent }), a = W4.KIVO.BassamCal.hNow(t), b = W4.KIVO.BassamCal.hPartsSafe(t);
  assert.ok(a.y > 1300 && a.y < 1600, 'hNow هجريٌّ دائماً'); assert.equal(b.y, 2026, 'hPartsSafe تعيد ما أعطاه Intl');
  /* الخادم بلا دعم: null وخطأٌ مسجَّل بوسم صاحبه كما كان */
  const A = oldServer(Thrower), B = newServer(Thrower);
  assert.equal(B.dsToday(Date.now()), null); assert.equal(A.dsToday(Date.now()), null); assert.equal(B.tkHij(Date.now()), null); assert.equal(A.tkHij(Date.now()), null);
  assert.deepEqual(B.log, A.log); assert.deepEqual(B.log, ['dstats', 'tk-hij']);
  assert.equal(B.tkHijMid('1448-1-1', Date.now()), 0); assert.equal(A.tkHijMid('1448-1-1', Date.now()), 0);
  const s = Date.UTC(2026, 10, 20, 9); assert.equal(B.tkRecDayMid('1448-1-1', s), A.tkRecDayMid('1448-1-1', s));
});

test('⑤ no other place computes the calendar: one client service, one server part, one-line callers', () => {
  const files = []; const walk = (dir, skip) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (!skip.test(e.name)) walk(p, skip); } else if (/\.(js|tpl|frag|json|html|css)$/.test(e.name)) files.push(p); } };
  walk(path.join(ROOT, 'src'), /^(pages|tests)$/); walk(path.join(ROOT, 'workers/parts'), /^$/);
  assert.ok(files.length > 300);
  const CLIENT = ['src/i18n/385-calendar.js', 'src/i18n/380-hijri-fallback.js'], SERVER = ['workers/parts/016-base-shared.js'];
  /* كتلةُ PF-CORE («ملفي»): نصٌّ واحدٌ حرفاً في الواجهة (535) والخادم (062b) فلا تنادي KIVO ولا 016 — مستثناةٌ بحدودها وحدها، ومطابقتُها مثبتةٌ أعلاه */
  const CORE = ['src/services/535-profile-facts.js', 'workers/parts/062b-me-history.js', 'src/slots/workers/parts/062b-me-history.js.tpl'];
  const strip = (rel, s) => { if (!CORE.includes(rel)) return s; const a = s.indexOf('/* ══ PF-CORE:BEGIN'), b = s.indexOf('/* ══ PF-CORE:END ══ */'); assert.ok(a >= 0 && b > a, rel + ': علامتا PF-CORE'); return s.slice(0, a) + s.slice(b); };
  const GONE = /\b(_cuFmt|cuParts|__cuF|__olHF|__stf|_hf|TK_HFMT|TK_HMID|PF_HF)\b/, bad = [], names = [], table = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f).split(path.sep).join('/'), s = strip(rel, fs.readFileSync(f, 'utf8'));
    if (/islamic-umalqura/.test(s) && !CLIENT.includes(rel) && !SERVER.includes(rel)) bad.push(rel);
    if (GONE.test(s)) names.push(rel + ' :: ' + GONE.exec(s)[1]);
    if (/BassamHijri\s*\.\s*now|BassamHijri\s*;/.test(s) && !CLIENT.includes(rel)) table.push(rel);
  }
  assert.deepEqual(bad, [], 'ملفٌّ يبني تقويمَ أم القرى خارج الموضعين');
  assert.deepEqual(names, [], 'اسمٌ قديم باقٍ');
  assert.deepEqual(table, [], 'جدولُ الاحتياط يُسأل من الخدمة وحدها (hNow)');
  /* المنادياتُ الباقية بأسمائها القديمة سطرٌ واحد إلى الموضع الموحَّد */
  const ONE = [
    ['src/components/565-page-kit.js', 'hMonthDays', /^return KIVO\.BassamCal\.hMonthDays\(t, e\);$/],
    ['src/components/565-page-kit.js', 'curHijri', /^const t = KIVO\.BassamCal\.hToday\(\); return \{ y: t\.y, m: t\.m \};$/],
    ['src/systems/daily/client/logic.js.tpl', 'hMonthDays', /^return KIVO\.BassamCal\.hMonthDaysNoon\(t, e\);$/],
    ['src/systems/dreport/client/logic.js', 'hMonthDays', /^return KIVO\.BassamCal\.hMonthDaysNoon\(t, r\);$/],
    ['src/systems/dstats/client/logic.js', 'hOfDate', /^const h=KIVO\.BassamCal\.hParts\(dt\); return \{ year:h\.y, month:h\.m, day:h\.d \};$/],
    ['src/systems/dstats/client/logic.js', 'gOf', /^return KIVO\.BassamCal\.hGregUTC\(y,m,d\);$/],
    ['src/systems/dstats/client/logic.js', 'dim', /^return KIVO\.BassamCal\.hMonthDaysNoon\(y,m,29\);$/],
    ['src/systems/custody/slots/emp.logic.custody.frag', 'cuGreg', /^return KIVO\.BassamCal\.hGreg\(t, e, r\);$/],
    ['src/systems/custody/slots/emp.logic.custody.frag', 'cuGregMonthLabel', /^return KIVO\.BassamCal\.hGregMonthLabel\(t, e\);$/],
    ['src/systems/custody/slots/emp.logic.custody.frag', 'cuGregYearRange', /^return KIVO\.BassamCal\.hGregYearRange\(t\);$/],
    ['src/systems/daily/client/520-field-monitor.js', 'function hParts', /^return KIVO\.BassamCal\.hPartsSafe\(dt\);$/],
    ['src/systems/tasks/server/070-task-core.js', 'function tkDayNum', /^return calDayNum\(k\);$/],
    ['src/systems/tasks/server/073-task-recur.js', 'function tkHijMid', /^return calHijriMid\(k, near, tkHij\);$/],
    ['src/systems/tasks/server/073-task-recur.js', 'function tkRiyMid', /^return calRiyadhMid\(t\);$/],
    ['src/systems/tasks/server/073-task-recur.js', 'function tkRecDayMid', /^return calHijriDayMid\(dk, s, tkHij\);$/],
  ];
  for (const [f, name, want] of ONE) {
    const src = read(f), re = new RegExp('(?:^|\\n)[ \\t]*' + name.replace(/ /g, '\\s+') + '\\s*\\(([^)]*)\\)\\s*\\{', 'g'), m = re.exec(src);
    assert.ok(m, f + ' :: ' + name);
    let i = re.lastIndex, depth = 1; while (depth && i < src.length) { const c = src[i++]; if (c === '{') depth++; else if (c === '}') depth--; }
    assert.match(src.slice(re.lastIndex, i - 1).replace(/\/\*[\s\S]*?\*\//g, '').trim(), want, f + ' :: ' + name);
    assert.equal(re.exec(src), null, f + ' :: ' + name + ' معرَّفٌ مرةً واحدة');
  }
  /* لا صفحةَ ولا نظامَ يعرّف hMonthDays غير العُدّة وصفحتَي الظهر */
  const defs = files.filter((f) => /(?:^|\n)[ \t]*hMonthDays\s*\([^)]*\)\s*\{/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f).split(path.sep).join('/')).sort();
  assert.deepEqual(defs, ['src/components/565-page-kit.js', 'src/systems/daily/client/logic.js', 'src/systems/daily/client/logic.js.tpl', 'src/systems/dreport/client/logic.js']);   /* د5-هـ: مرتَّبة — التقريرُ في مجلده  */
  const service = read('src/i18n/385-calendar.js'), part = read('workers/parts/016-base-shared.js');
  for (const n of ['hPartsRiyadh', 'hNow', 'hText', 'hGregExact', 'hGregUTC', 'hMonthDays', 'hMonthDaysNoon', 'hWeekdayIndex']) { assert.match(service, new RegExp('function ' + n + '\\('), n); assert.match(service, new RegExp('\\b' + n + ': ' + n + '\\b'), n + ' مُصدَّرة'); }
  for (const n of ['calHijriAt', 'calHijriOk', 'calRiyadhMid', 'calDayNum', 'calHijriMid', 'calHijriDayMid', 'dsToday']) assert.match(part, new RegExp('function ' + n + '\\('), n);
  /* 016 يسبق كلَّ مستعملٍ في ترتيب أجزاء العامل */
  const order = JSON.parse(read('workers/parts.json')).parts.map((p) => p.file), at = (re) => order.findIndex((f) => re.test(f));
  assert.ok(at(/016-base-shared\.js$/) >= 0 && at(/016-base-shared\.js$/) < at(/062b-me-history\.js$/) && at(/016-base-shared\.js$/) < at(/070-task-core\.js$/) && at(/070-task-core\.js$/) < at(/073-task-recur\.js$/));
});
