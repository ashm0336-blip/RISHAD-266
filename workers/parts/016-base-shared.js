/* ════ دوالُّ عامّة تستعملها أجزاءُ القاعدة — كانت تسكن في أجزاء أنظمةٍ بعينها (V7 · المرحلة 2 · الحزمة أ: نقلٌ حرفيٌّ بلا تغيير سلوك) ════
   الأسماءُ كما هي (ds · cu · tk · ir) كي لا يتغيّر مستدعٍ ولا اختبار. تعتمد على: swallow (002) · parseJson · isObj (017) · hex (052) · pfHijriAt (062b). */
/* ── من 020-dstats.js: «اليوم التشغيلي» الهجري للخادم (مهلةُ ثلاث ساعات) ── */
var DS_GRACE = 3 * 3600 * 1000;
/* ══ V7 · د5-د2: تقويمُ الخادم — موضعٌ واحد. لا جزءَ غير هذا يبني مُنسِّقَ أم القرى أو يحوّل هجرياً⇐ميلادياً (الخادمُ بلا KIVO فلا يصله تقويمُ الواجهة 385).
   الاستثناءُ الوحيد: كتلةُ PF-CORE في 062b — نصٌّ واحدٌ حرفاً مع الواجهة (535) فلا تنادي غيرَها؛ ومطابقتُها لهذه الدوالّ مثبتةٌ في الاختبار.
     calHijriAt(ms)          أجزاءُ التاريخ الهجري (أم القرى) لِلحظةٍ بتوقيت الرياض { y, m, d } — ترمي إن غاب دعمُ التقويم.
     calHijriOk(o)           هل الأجزاءُ في مدى التقويم (سنة > 1300 · شهر 1–12 · يوم 1–30) — الفحصُ الذي كان منسوخاً عند كل مستعمل.
     calRiyadhMid(ms)        منتصفُ ليل الرياض (UTC+3 ثابتاً) لليوم المدنيّ الذي فيه اللحظة.
     calDayNum(k)            مفتاحُ يومٍ هجري «س-ش-ي» رقماً للمقارنة.
     (calHijriMid · calHijriDayMid أُزيلتا — V7 · 53 S3: لا مستعملَ لهما بعد تقويم المهام الميلادي) ══ */
var CAL_HFMT = null;
function calHijriAt(ms) {
  if (!CAL_HFMT) CAL_HFMT = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
  var o = {}; CAL_HFMT.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = +p.value; });
  return { y: o.year, m: o.month, d: o.day };
}
function calHijriOk(o) { return o.y > 1300 && o.m >= 1 && o.m <= 12 && o.d >= 1 && o.d <= 30; }
function calRiyadhMid(t) { return Math.floor((t + 3 * 36e5) / 864e5) * 864e5 - 3 * 36e5; }
function calDayNum(k) { var p = String(k).split('-'); return (+p[0]) * 10000 + (+p[1]) * 100 + (+p[2]); }
function dsToday(now) {
  try {
    var o = calHijriAt(now - DS_GRACE);
    if (calHijriOk(o)) return o;
  } catch (e) { swallow('dstats', e); }
  return null;
}
/* ══ V7 · 53 تقويم: الميلادي أساساً — تقويمُ الخادم الميلادي (cal_api.md §3 · التصميم §2 · ق1 · ق11). مرآةُ دوالّ الواجهة (385: g*) حرفاً في الناتج
   (tests/unit/v7_cal_base_agree.test.mjs). المفاتيح ISO مبطَّنة: يوم «YYYY-MM-DD» (وللجولات لاحقةٌ بعده) · شهر «YYYY-MM» · علامةُ شهر «m:YYYY-MM».
   السنةُ تميّز الصيغتين: 1300–1599 هجري · 1900–2199 ميلادي. التاريخُ المدنيّ تاريخُ الرياض (UTC+3 ثابتاً)، واليومُ التشغيلي = تاريخُ الرياض لِـ(الآن − 3 ساعات).
   الهجريُّ للعرض وحده محسوبٌ من المفتاح الميلادي بـcalHijriAt (لا يُخزَّن)، وجدولُ «هجري ⇐ ميلادي» يُبنى منه سنةً سنةً عند الطلب (calHDay). ══ */
var CAL_G_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
var CAL_KEY_RX = /^(m:)?(\d{4})-(\d{1,2})(?:-(\d{1,2})(?:-(.+))?)?$/;
function calPad(n) { n = +n; return (n < 10 ? '0' : '') + n; }
function calGKey(y, m, d) { return y + '-' + calPad(m) + '-' + calPad(d); }
function calGYm(y, m) { return y + '-' + calPad(m); }
function calYearCal(y) { return y >= 1300 && y <= 1599 ? 'h' : y >= 1900 && y <= 2199 ? 'g' : null; }
function calGMonthDays(y, m) {
  if (m == null) { var p = /^(?:m:)?(\d{4})-(\d{1,2})$/.exec(String(y)); if (!p) return 0; y = +p[1]; m = +p[2]; }
  return m >= 1 && m <= 12 ? new Date(Date.UTC(+y, +m, 0)).getUTCDate() : 0;
}
/* تاريخٌ ميلاديٌّ حقيقي بسنةٍ 1900–2199 (يرفض الهجري) · allowDay0: يقبل اليوم 0 «يومٌ غير معروف» (العهد ق10) */
function calGregOk(y, m, d, allowDay0) {
  y = +y; m = +m; d = +d;
  if (!(y >= 1900 && y <= 2199 && m >= 1 && m <= 12 && Math.floor(y) === y && Math.floor(m) === m && Math.floor(d) === d)) return false;
  return (allowDay0 && d === 0) || (d >= 1 && d <= calGMonthDays(y, m));
}
function calGParse(k) {
  var p = CAL_KEY_RX.exec(String(k == null ? '' : k)); if (!p) return null;
  var y = +p[2], m = +p[3], d = p[4] == null ? null : +p[4], cal = calYearCal(y);
  if (!cal || m < 1 || m > 12) return null;
  if (p[1] && d != null) return null;
  if (d != null && (d < 1 || d > (cal === 'g' ? calGMonthDays(y, m) : 30))) return null;
  return { cal: cal, kind: p[1] ? 'mctl' : d == null ? 'month' : 'day', y: y, m: m, d: d, suffix: p[5] || '' };
}
function calKeyCal(k) { var p = calGParse(k); return p ? p.cal : null; }
function calIsGKey(k, kind) {
  var p = calGParse(k); if (!p || p.cal !== 'g' || (kind && p.kind !== kind)) return false;
  var c = p.kind === 'day' ? calGKey(p.y, p.m, p.d) + (p.suffix ? '-' + p.suffix : '') : (p.kind === 'mctl' ? 'm:' : '') + calGYm(p.y, p.m);
  return c === String(k);
}
function calGMonthOf(k) { var p = calGParse(k); return p && p.cal === 'g' ? calGYm(p.y, p.m) : null; }
function calGDayNum(k) { var p = calGParse(k); return p ? p.y * 10000 + p.m * 100 + (p.d || 0) : 0; }
function calGCmp(a, b) { var x = calGDayNum(a), y = calGDayNum(b); return x < y ? -1 : x > y ? 1 : 0; }
function calGOfUTC(t) { var x = new Date(t), y = x.getUTCFullYear(), m = x.getUTCMonth() + 1, d = x.getUTCDate(); return { y: y, m: m, d: d, k: calGKey(y, m, d), key: calGKey(y, m, d), ym: calGYm(y, m), mk: 'm:' + calGYm(y, m), wd: x.getUTCDay() }; }
function calGAt(ms) { return calGOfUTC(+ms + 3 * 36e5); }
function calToday(now) { return calGAt((now == null ? Date.now() : +now) - DS_GRACE); }
function calGAddDays(k, n) { var p = calGParse(k); return p && p.kind === 'day' ? calGOfUTC(Date.UTC(p.y, p.m - 1, p.d + (+n || 0))).k : null; }
function calGDays(ym) { var p = calGParse(ym), out = [], n, i; if (!p || p.cal !== 'g') return out; n = calGMonthDays(p.y, p.m); for (i = 1; i <= n; i++) out.push(calGKey(p.y, p.m, i)); return out; }
function calGRange(from, to) { var out = [], k = calIsGKey(from, 'day') ? from : null; while (k && calGCmp(k, to) <= 0 && out.length < 4000) { out.push(k); k = calGAddDays(k, 1); } return out; }
/* الهجريُّ المقابل ليومٍ ميلادي (ظهرَ UTC = الثالثةُ عصراً بالرياض: اليومُ المدنيّ نفسُه) — null إن لم يُعرف */
function calHOf(k) {
  var p = calGParse(k); if (!p || p.cal !== 'g' || p.kind !== 'day') return null;
  try { var h = calHijriAt(Date.UTC(p.y, p.m - 1, p.d, 12)); return calHijriOk(h) ? h : null; } catch (e) { return null; }
}
var CAL_HY = Object.create(null);
function calHYear(y) {
  if (CAL_HY[y]) return CAL_HY[y];
  var t = {}, est = Date.UTC(2026, 5, 16, 12) + Math.round(354.367 * (y - 1448)) * 864e5, i, g, h;
  for (i = -25; i <= 390; i++) { g = calGOfUTC(est + i * 864e5); h = calHOf(g.k); if (h && h.y === y) t[h.m + '-' + h.d] = g.k; }
  return (CAL_HY[y] = t);
}
function calHDay(y, m, d) {
  y = +y; m = +m; d = +d;
  if (!(y >= 1300 && y <= 1599 && m >= 1 && m <= 12 && d >= 1 && d <= 30)) return null;
  return calHYear(y)[m + '-' + d] || null;
}
function calHMonthLen(y, m) { return calHDay(y, m, 30) ? 30 : calHDay(y, m, 29) ? 29 : 0; }
function calHMonthSpan(y, m) { var n = calHMonthLen(y, m); return n ? { from: calHDay(y, m, 1), to: calHDay(y, m, n), days: n } : null; }
function calHMonthsOf(ym) {
  var out = [], last = null;
  calGDays(ym).forEach(function (k) {
    var h = calHOf(k); if (!h) return;
    if (last && last.y === h.y && last.m === h.m) { last.days++; last.to = k; } else { last = { y: h.y, m: h.m, days: 1, from: k, to: k }; out.push(last); }
  });
  return out;
}
function calGMonthText(ym) { var p = calGParse(ym); return p && p.cal === 'g' ? CAL_G_MONTHS[p.m - 1] + ' ' + p.y : ''; }
/* ── إصلاح (مدير المنصة لا يُطلب منه سببٌ أبداً — قرارُ المالك): مدير المنصة (role=super) معفًى من كل بوابات السبب في الخادم؛ وإن لم يكتب سبباً
   يُسجَّل في سجلّ القرار والتدقيق «بلا سبب (مدير المنصة)». غيرُه: طلبُ السبب كما هو. reasonExempt = هل الفاعلُ معفًى · reasonLogged = ما يُكتب في السجل ── */
/* V7 · د6 (QA) · البند ١ (قرارُ المالك): لا يُطلب سببٌ في أيّ فعلٍ لأيّ مستخدم — رسالةُ التأكيد في الواجهة تكفي، وسجلُّ الحركة يسجّل الفاعلَ والوقتَ وما تغيّر.
   أُزيلت بواباتُ السبب كلُّها (059 enfNo('reason') · 062 missingReason · 047 الاستدراك · 019d الاستعادة · العهد) ومعها reasonExempt و«بلا سبب (مدير المنصة)».
   reasonLogged = نصُّ السبب إن أرسله عميلٌ قديم (يُحفظ كما كان، والسجلاتُ القديمة تُعرض كما هي) وإلا فارغ — لا يُفرض ولا يُكتب بديل */
function reasonLogged(A, r) { return String(r == null ? '' : r).trim().slice(0, 300); }
/* ── من 019a-custody.js: خطأٌ برمزٍ وحالة · ساعةُ اليوم الهجري · الصيغةُ القانونية · بصمةُ الطلب ── */
function cuError(code, status) {
  var e = new Error(code);
  e.cuCode = code;
  e.cuStatus = status || 400;
  return e;
}
/* V7 · 53 تقويم (cal-rest · ق1 · ق2): ساعةُ الأنظمة العلائقية (العهد · الاسترشاد · المضبوطات · نقلُ الموظف) ميلاديةٌ — تاريخُ الرياض المدنيّ بلا مهلة
   كما كانت (pfHijriAt)، وكلُّ مستهلكيها يكتبون أو يقرؤون أعمدةَ greg_* */
function cuClock() {
  var x = pfDayAt(Date.now());
  if (!x || !x.y || !x.m || !x.d) throw cuError('custody-clock-unavailable', 503);
  return { y: x.y, m: x.m, d: x.d };
}
function cuCanonical(v) {
  if (Array.isArray(v)) return v.map(cuCanonical);
  if (isObj(v)) {
    var o = {};
    Object.keys(v)
      .sort()
      .forEach(function (k) {
        o[k] = cuCanonical(v[k]);
      });
    return o;
  }
  return v;
}
async function cuFingerprint(b) {
  var x = Object.assign({}, b);
  delete x.base;
  delete x.uid;
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(cuCanonical(x)))));
}
/* ── من 070-task-core.js: قائمةُ الموظفين وسجلُّ الموظف برمزه الفريد (eid ∪ nid) ── */
function tkEmps(raw) { var L = parseJson(raw, []); return Array.isArray(L) ? L.filter(isObj) : []; }
/* KIVO_265 · M-2 (المراجعةُ المستقلة لدمج 265 — الصنفُ نفسُه بعد F-1): التفرّدُ في الحقلين معاً (eid ∪ nid) لا في حقلٍ واحد — رقمُ هويةِ سجلٍّ
   = معرّفُ زميلٍ ثابت (خطأُ إدخالٍ أو استيراد) كان يجعل صفوفَ الزميل وصورَه لصاحب السجل. الرمزُ يُستعمل إن حمله سجلٌّ واحدٌ بالضبط في أيٍّ من
   حقليه (السجلُّ نفسُه بالحقلين يُعدّ مرةً) — وإلا فلا يدلّ على أحد: لا ربط · لا إسناد · لا قراءة (مهامي · تقريرُ الربط · الأهلية · التكرار) */
function tkTokN(emps, v) {
  if (v == null || v === '') return { n: 0, c: null };
  v = String(v); var n = 0, c = null;
  for (var i = 0; i < emps.length; i++) { var e = emps[i]; if ((e.eid != null && e.eid !== '' && String(e.eid) === v) || (e.nid != null && e.nid !== '' && String(e.nid) === v)) { n++; if (!c) c = e; } }
  return { n: n, c: c };
}
function tkTokRec(emps, v) { var o = tkTokN(emps, v); return o.n === 1 ? o.c : null; }
/* ── من 074-task-due.js: انحرافُ ساعة العزلة المسموح لطوابع المهام المؤجّلة ── */
var TK_GATE_SKEW = 6e4;                                                     /* طابعٌ «من المستقبل» أبعدُ من دقيقة (ساعةُ عزلةٍ منحرفة) لا يحجب شيئاً */
/* ── من 019j-irshad-daily.js: مَن يُعدّ مديراً لمهام التذكير اليومية ── */
function irDailyManager(A) {
  var u = A && A.u;
  return !!(u && (u.role === 'super' || u.role === 'dept' || u.role === 'gm' || (u.role === 'staff' && u.mgr)));
}
/* ── من src/systems/dstats/server/020-dstats.js (V7 · د1): ترقيةُ قائمة العدسات وحدها — تستعملها قاعدةُ الصلاحيات (018 permsGrantWhy) ── */
/* ترحيل «المناطق» إلى قائمة العدسات — كتابةٌ آلية يجريها أي متصفح عند أول فتح */
function lensesUpgradeOnly(a, b) {
  /* KIVO_261 (إصلاح · AUD-055 — كشفه المراجعُ الأمنيّ المستقل): كان غيرُ الكائن يُعدّ {} فتمرّ قيمةٌ نصيةٌ أو مصفوفةٌ أو رقمٌ بأيّ حجم حين تكون المخزَّنةُ
     {} أو غائبة (الحالُ الافتراضية) — الآن: الجديدةُ كائنٌ أو غائبة، والمخزَّنةُ كذلك، وإلا فليست ترقية */
  if ((b !== undefined && !isObj(b)) || (a !== undefined && a !== null && !isObj(a))) return false;
  a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
  var ks = {}; Object.keys(a).concat(Object.keys(b)).forEach(function (d) { ks[d] = 1; });
  for (var d in ks) {
    var x = Array.isArray(a[d]) ? a[d] : null, y = Array.isArray(b[d]) ? b[d] : null;
    if (!x || !y) return false;
    var x2 = x.indexOf('zones') === -1 ? x.concat(['zones']) : x;
    if (!deq(x2, y) && !deq(x, y)) return false;
  }
  return true;
}
