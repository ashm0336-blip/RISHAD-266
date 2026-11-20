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
     calHijriMid(k, near, hij)     منتصفُ ليل (الرياض) اليوم الهجري k: قفزةٌ تقريبية من near ثم تصحيحٌ يوماً يوماً (40 محاولة) — محفوظُ النتيجة؛ 0 إن لم يُعرف.
     calHijriDayMid(k, near, hij)  مثلُها لكن في جوار near وحده (اليومُ نفسُه ± يوم) وإلا منتصفُ ليل near — **دالتان لا واحدة**: الأولى تبحث بعيداً وتعيد 0 عند
                                   الفشل، والثانيةُ لا تبتعد عن near وتعيده عند الفشل؛ مستعملاهما يعتمدان على الفرق.
     hij = دالةُ المستعمل التي تعيد { k } ليومٍ أو null (تسجّل خطأها بوسمها هي) ══ */
var CAL_HFMT = null;
function calHijriAt(ms) {
  if (!CAL_HFMT) CAL_HFMT = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
  var o = {}; CAL_HFMT.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = +p.value; });
  return { y: o.year, m: o.month, d: o.day };
}
function calHijriOk(o) { return o.y > 1300 && o.m >= 1 && o.m <= 12 && o.d >= 1 && o.d <= 30; }
function calRiyadhMid(t) { return Math.floor((t + 3 * 36e5) / 864e5) * 864e5 - 3 * 36e5; }
function calDayNum(k) { var p = String(k).split('-'); return (+p[0]) * 10000 + (+p[1]) * 100 + (+p[2]); }
var CAL_HMID = Object.create(null);   /* المفتاحُ اليومُ وحده: الناتجُ منتصفُ ليل الرياض لذلك اليوم الهجري أياً كان المستعمل ما دامت hij تعيد يومَ الرياض (المستعملُ الوحيد اليوم: المهام) */
function calHijriMid(k, near, hij) {
  var kN = String(k).replace(/-0(\d)/g, '-$1'); if (CAL_HMID[kN]) return CAL_HMID[kN];
  var p = kN.split('-').map(Number), m = calRiyadhMid(near), H = hij(m + 12 * 36e5), q; if (!H || p.length !== 3) return 0;
  m += Math.round((p[0] - H.y) * 354.37 + (p[1] - H.m) * 29.53 + (p[2] - H.d)) * 864e5;
  for (q = 0; q < 40; q++) { H = hij(m + 12 * 36e5); if (!H) return 0; if (H.k === kN) { CAL_HMID[kN] = m; return m; } m += (calDayNum(kN) > calDayNum(H.k) ? 1 : -1) * 864e5; }
  return 0;
}
function calHijriDayMid(k, near, hij) {
  var kN = String(k).replace(/-0(\d)/g, '-$1'), m = calRiyadhMid(near), q, D, H;
  for (q = 0; q < 3; q++) { D = m + [0, -864e5, 864e5][q]; H = hij(D + 12 * 36e5); if (H && H.k === kN) return D; }
  return m;
}
function dsToday(now) {
  try {
    var o = calHijriAt(now - DS_GRACE);
    if (calHijriOk(o)) return o;
  } catch (e) { swallow('dstats', e); }
  return null;
}
/* ── إصلاح (مدير المنصة لا يُطلب منه سببٌ أبداً — قرارُ المالك): مدير المنصة (role=super) معفًى من كل بوابات السبب في الخادم؛ وإن لم يكتب سبباً
   يُسجَّل في سجلّ القرار والتدقيق «بلا سبب (مدير المنصة)». غيرُه: طلبُ السبب كما هو. reasonExempt = هل الفاعلُ معفًى · reasonLogged = ما يُكتب في السجل ── */
var REASON_NONE_SUPER = 'بلا سبب (مدير المنصة)';
function reasonExempt(A) { return !!(A && A.u && A.u.role === 'super'); }
function reasonLogged(A, r) { r = String(r == null ? '' : r).trim().slice(0, 300); return r || (reasonExempt(A) ? REASON_NONE_SUPER : ''); }
/* ── من 019a-custody.js: خطأٌ برمزٍ وحالة · ساعةُ اليوم الهجري · الصيغةُ القانونية · بصمةُ الطلب ── */
function cuError(code, status) {
  var e = new Error(code);
  e.cuCode = code;
  e.cuStatus = status || 400;
  return e;
}
function cuClock() {
  var x = pfHijriAt(Date.now());
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
