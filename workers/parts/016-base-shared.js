/* ════ دوالُّ عامّة تستعملها أجزاءُ القاعدة — كانت تسكن في أجزاء أنظمةٍ بعينها (V7 · المرحلة 2 · الحزمة أ: نقلٌ حرفيٌّ بلا تغيير سلوك) ════
   الأسماءُ كما هي (ds · cu · tk · ir) كي لا يتغيّر مستدعٍ ولا اختبار. تعتمد على: swallow (002) · parseJson · isObj (017) · hex (052) · pfHijriAt (062b). */
/* ── من 020-dstats.js: «اليوم التشغيلي» الهجري للخادم (مهلةُ ثلاث ساعات) ── */
var DS_GRACE = 3 * 3600 * 1000;
function dsToday(now) {
  try {
    var f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
    var o = {}; f.formatToParts(new Date(now - DS_GRACE)).forEach(function (p) { o[p.type] = +p.value; });
    if (o.year > 1300 && o.month >= 1 && o.month <= 12 && o.day >= 1 && o.day <= 30) return { y: o.year, m: o.month, d: o.day };
  } catch (e) { swallow('dstats', e); }
  return null;
}
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
