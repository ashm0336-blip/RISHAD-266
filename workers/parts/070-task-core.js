/* ═══ KIVO_264 · KIVO-Tasks (المرحلة الثانية) — نواةُ نموذج المهمة في الخادم: الحالاتُ المنفصلة · سياسةُ الإثبات · المراجِع · الهوية · التنبيه ═══
   الصفُّ القائم (0…21) لا يتغيّر معنى أيِّ عمودٍ فيه، والعمودُ 22 طابعُ هوية الكيان في سجل الأنشطة (290 stampTasks: 'T'+hash) — لا يُمسّ.
   الجديد في عمودين لا ثالثَ لهما، كلٌّ بحسب من يملك كتابته:
     • r[23] = x  — حقولُ الإدارة (كائن): لا يكتبها إلا كاتبُ المهام (task.create/edit/assign — الحفظُ المركزي يحكم)؛ الموظفُ لا يمسّها أبداً
       (ليست من أعمدة الذات TASK_SELF {3,6,11,12,20,21} فيرفضها selfTaskOnly وself.task.respond معاً).
         { v:2, by:{u,e,n} المنشئ · pol:{m:any|img|note|both|none, n, steps[]} سياسةُ الإثبات (الافتراضيّ any = «صورة أو ملاحظة» — ق2) ·
           rv:{u,e,n}|null المراجِع (الافتراضيّ المنشئ — ق3؛ null = بلا مراجعة) · dec:0|1 الاعتذارُ مسموح · needs[] صلاحياتٌ تشغيلية تحتاجها ·
           elig:{res,code,at} · ext[] تمديداتُ المهلة (ق6) · rev/revh قرارُ المراجعة وسجلُّه · asg:'cancelled'|'reassigned' + can/re · from ·
           rec:{id,ver,t,wd,md,from,to?,paused,stop?,by?,asg[]} التكرار (073) · idem مفتاحُ عدم التكرار · det: نُسخةٌ عُدِّلت وحدها }
     • أعمدةُ الذات القائمة نفسُها للموظف: r[20] = {at,why (اعتذار) · exp (انقضاء) · ack (تأكيدُ الاستلام) · stall:{at,why} (تعثّر)}
                                           r[21] = {imgs,note,at (التوثيق) · st:{خطوة:at} · sub (وقتُ التسليم) · draft · h:[{at,n,note}]}
       فلا تتّسع القاعدةُ الذاتية ولا تحتاج مفتاحاً جديداً: الحالةُ الجديدة كلُّها داخل أعمدةٍ يملكها الموظفُ أصلاً.
   الصفُّ القديم (بلا x) يبقى كما كان حرفاً: بلا مراجعة (التسليمُ إنجاز) وسياسةُ «صورة أو ملاحظة». */
var TK_X = 23, TK_STAMP = 22, TK_ROW_MIN = 22;
var TK_POL_M = { any: 1, img: 1, note: 1, both: 1, none: 1 };
var TK_IMG_TOTAL = 12, TK_HIST_MAX = 10, TK_STEPS_MAX = 12, TK_STEP_LEN = 120;
var TK_PRIO = { low: 1, normal: 1, high: 1, urgent: 1 };
function tkObj(v) { return isObj(v) ? v : null; }
function tkX(r) { return Array.isArray(r) ? tkObj(r[TK_X]) : null; }
function tkPad(r) { var o = r.slice(); while (o.length < TK_ROW_MIN) o.push(null); return o; }
function tkWho(A) { return { u: String(A.u.id || ''), e: String(A.u.ekey || ''), n: String(A.u.name || A.u.un || '').slice(0, 120) }; }
function tkWhoN(w) { return { u: String((w && w.u) || ''), n: String((w && w.n) || '').slice(0, 120) }; }
/* ── هويةُ الكيان في سجل الأنشطة — حرفُ 290-activity-log (fnv/hash/taskId) فتلتقي أحداثُ الخادم وأحداثُ الواجهة على المعرّف نفسِه ── */
function tkFnv(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function tkHash(s) { s = String(s); return tkFnv(s).toString(36) + tkFnv('\u0001' + s.length + '\u0002' + s).toString(36); }
function tkEntId(r) {
  if (!Array.isArray(r)) return '';
  if (typeof r[TK_STAMP] === 'string' && r[TK_STAMP]) return r[TK_STAMP].slice(0, 80);
  return 'T' + tkHash(String(r[13] || '') + '|' + String(r[14] || '') + '|' + String(r[8] || '') + '|' + (Array.isArray(r[7]) ? r[7].join(',') : ''));
}
/* ── سياسةُ الإثبات (ق2: لكل مهمة · الافتراضيّ «صورة أو ملاحظة») ── */
function tkPolOf(r) {
  var x = tkX(r), p = x && isObj(x.pol) ? x.pol : null, m = p && TK_POL_M[p.m] ? p.m : 'any';
  var n = p && typeof p.n === 'number' && p.n >= 1 && p.n <= 4 ? Math.floor(p.n) : 1;
  var steps = p && Array.isArray(p.steps) ? p.steps.filter(function (s) { return typeof s === 'string' && s.trim(); }).map(function (s) { return s.trim().slice(0, TK_STEP_LEN); }).slice(0, TK_STEPS_MAX) : [];
  return { m: m, n: n, steps: steps };
}
function tkPolTxt(P) {
  var t = { any: 'صورةٌ أو ملاحظة', img: (P.n > 1 ? P.n + ' صور على الأقل' : 'صورة'), note: 'ملاحظةُ إنجاز', both: (P.n > 1 ? P.n + ' صور' : 'صورة') + ' وملاحظة', none: 'بلا إثبات' }[P.m];
  return t + (P.steps.length ? ' · ' + P.steps.length + ' خطوات' : '');
}
/* proof = {imgs[], note, st{}} ⇒ '' أو سببُ النقص بالعربية */
function tkPolCheck(P, proof) {
  var n = (proof.imgs || []).length, note = String(proof.note || '').trim(), st = isObj(proof.st) ? proof.st : {};
  if (P.m === 'any' && !n && !note) return 'أرفق صورة التوثيق أو اكتب ملاحظة الإنجاز';
  if ((P.m === 'img' || P.m === 'both') && n < P.n) return P.n > 1 ? 'المهمة تتطلب ' + P.n + ' صور توثيقٍ على الأقل' : 'المهمة تتطلب صورة توثيق';
  if ((P.m === 'note' || P.m === 'both') && !note) return 'المهمة تتطلب ملاحظةَ إنجاز';
  for (var i = 0; i < P.steps.length; i++) if (!st[P.steps[i]]) return 'أكمل خطوات العمل: «' + P.steps[i] + '»';
  return '';
}
/* ── KIVO_265 · سياسةُ نافذة التنفيذ (قرارُ المالك 2026-10-19 — «تصحيحٌ لمنطقٍ قائم»): x.win = { early, late } في العمود 23 يكتبه المسؤول
   من «إعدادات متقدمة» (إنشاءً أو تعديلاً) · early = دقائقُ البدء المسموحة قبل الموعد (0 = لا بدءَ قبل الموعد بالضبط) · late = ساعاتُ التسليم
   المسموحة بعد المهلة (0 = لا تسليمَ بعدها) — والافتراضيُّ للصفّ بلا win: early 0 · late 2. القبولُ (ack) في أيّ وقت؛ البدءُ والتسليمُ وحدهما محكومان
   (062c meTkAct) · والمهمةُ غيرُ المبدوءة «منقضية» بعد المهلة + late لا بعد المهلة وحدها (tkPhase) · والأداءُ (العمود 6) يُقاس من المهلة لا من
   القبول (tkPerfOf) — فالمقياسُ واحدٌ في المنصة كلِّها ولا يختلف بإدارة. الحدود: early ≤ 240 د · late ≤ 24 س. */
var TK_WIN_EARLY_MAX = 240, TK_WIN_LATE_MAX = 24, TK_WIN_DEF = { early: 0, late: 2 };
function tkWinIn(w) {
  if (w === null) return { win: null };
  if (!isObj(w)) return { bad: 'win' };
  var o = {};
  if (w.early != null) { if (!(typeof w.early === 'number' && isFinite(w.early) && w.early >= 0 && w.early <= TK_WIN_EARLY_MAX)) return { bad: 'win.early' }; o.early = Math.floor(w.early); }
  if (w.late != null) { if (!(typeof w.late === 'number' && isFinite(w.late) && w.late >= 0 && w.late <= TK_WIN_LATE_MAX)) return { bad: 'win.late' }; o.late = Math.floor(w.late); }
  return { win: o };
}
function tkWinOf(r) {
  var x = tkX(r), w = x && isObj(x.win) ? x.win : null, o = { early: TK_WIN_DEF.early, late: TK_WIN_DEF.late, set: 0 };
  if (w && typeof w.early === 'number' && isFinite(w.early) && w.early >= 0) { o.early = Math.min(TK_WIN_EARLY_MAX, Math.floor(w.early)); o.set = 1; }
  if (w && typeof w.late === 'number' && isFinite(w.late) && w.late >= 0) { o.late = Math.min(TK_WIN_LATE_MAX, Math.floor(w.late)); o.set = 1; }
  return o;
}
function tkWinTxt(W) { return (W.early ? 'البدء قبل الموعد بـ' + W.early + ' د' : 'لا بدء قبل الموعد') + ' · ' + (W.late ? 'التسليم حتى ' + W.late + ' س بعد المهلة' : 'لا تسليم بعد المهلة'); }
function tkWinFrom(r, W) { return r[15] ? r[15] - (W || tkWinOf(r)).early * 6e4 : 0; }      /* أبكرُ لحظةٍ للبدء (0 = بلا موعد) */
function tkWinTo(r, W) { return r[16] ? r[16] + (W || tkWinOf(r)).late * 36e5 : 0; }         /* آخرُ لحظةٍ للبدء والتسليم (0 = بلا مهلة) */
/* الأداءُ من المهلة: متأخر = بعد المهلة بدقيقة فأكثر · مبكر = قبلها بعُشر نافذة المهمة (البداية ⇒ المهلة) فأكثر · وإلا «في الوقت».
   صفٌّ بلا مهلة: القاعدةُ القديمة (القبول + المدة) */
function tkPerfOf(r, fin) {
  if (!fin) return null;
  var e = r[16], s = r[15] || r[11] || 0;
  var f = function (t) { var m0 = Math.floor(Math.abs(t) / 6e4), h = Math.floor(m0 / 60), m = m0 % 60; return (h ? h + ' س' : '') + (h && m ? ' ' : '') + (m || !h ? m + ' د' : ''); };
  if (!e) { if (!r[11] || !r[10]) return null; var a0 = 6e4 * r[10], r0 = r[11] + a0 - fin; return r0 <= -6e4 ? ['late', 'متأخر ' + f(r0)] : r0 >= 0.1 * a0 ? ['early', 'مبكر بـ ' + f(r0)] : ['on_time', 'في الوقت']; }
  var span = Math.max(6e4, e - (s && s < e ? s : e - 36e5)), d = e - fin;
  return d <= -6e4 ? ['late', 'متأخر ' + f(d)] : d >= 0.1 * span ? ['early', 'مبكر بـ ' + f(d)] : ['on_time', 'في الوقت'];
}
/* ── المراجِع (ق3: الافتراضيّ منشئُ المهمة — والصفُّ القديم بلا x: بلا مراجعة كما كان) ── */
function tkRv(r) { var x = tkX(r); return x && isObj(x.rv) && (x.rv.u || x.rv.e) ? x.rv : null; }
/* ── الحالاتُ المنفصلة: الإسناد · التنفيذ · المراجعة · الوقت (مشتقٌّ لا مخزَّن) ── */
function tkState(r, now) {
  var x = tkX(r) || {}, r20 = tkObj(r[20]) || {}, r21 = tkObj(r[21]) || {}, rv = tkRv(r);
  var sub = typeof r21.sub === 'number' ? r21.sub : 0, dec = isObj(x.rev) && sub && x.rev.sub === sub ? String(x.rev.st || '') : '';
  var asg = x.asg === 'cancelled' ? 'cancelled' : x.asg === 'reassigned' ? 'reassigned' : r[3] === 'declined' ? 'declined' : (r20.ack || r[11]) ? 'acknowledged' : 'assigned';
  var done = r[3] === 'done';
  /* KIVO_265 (كشفه نقلُ F-10 · الاختبار (و)): «بانتظار المراجِع» تسليمٌ لم يُقرَّر وله مراجِع — لا أثرُ تسليمٍ قديم: مهمةٌ بلا مراجِع أُنجزت ثم أُعيد فتحُها
     (تحمل sub من إنجازها) أو اعتُمدت ثم أُعيدت بحفظٍ خامّ (قرارُها «اعتُمدت» لنفس التسليم) كانت تعلق «بانتظار قرار المراجِع» ولا أحدَ يقرّر */
  var exe = done ? 'done' : !r[11] ? 'not_started' : (rv && sub && !dec) ? 'submitted' : r20.stall ? 'stalled' : 'in_progress';
  var rev = !rv ? 'none' : done ? 'approved' : (sub && !dec) ? 'pending' : dec === 'returned' ? 'returned' : 'none';
  var tim = '';
  if (done) tim = Array.isArray(r[6]) ? String(r[6][0] || '') : '';
  else if (!r[11]) tim = r[16] && now > r[16] ? 'overdue_ack' : '';
  else if (exe !== 'submitted' && r[16] && now > r[16]) tim = 'overdue_exec';
  var closed = done || r[3] === 'declined' || asg === 'cancelled' || asg === 'reassigned';
  return { asg: asg, exe: exe, rev: rev, tim: tim, closed: closed, sub: sub, dec: dec, rv: rv };
}
/* حالةُ العرض للموظف («مهامي») — وصفٌ لا إخفاء: كلُّ صفٍّ يظهر بحالته */
function tkPhase(r, now) {
  var S = tkState(r, now);
  if (S.asg === 'cancelled') return 'cancelled';
  if (S.asg === 'reassigned') return 'reassigned';
  if (r[3] === 'declined') return 'declined';
  if (r[3] === 'done') return 'done';
  if (S.exe === 'submitted') return 'review';
  if (S.rev === 'returned') return 'returned';
  if (S.exe === 'stalled') return 'stalled';
  if (r[11]) return 'running';
  if (r[16] && now > tkWinTo(r)) return 'expired';                 /* KIVO_265 · نافذةُ التنفيذ: الانقضاءُ بعد المهلة + سماحُ التسليم المتأخر */
  if (r[15] && now < r[15]) return 'upcoming';
  return 'new';
}
/* ── اليومُ الهجريّ (أم القرى · الرياض) ووقتُ اليوم بالدقائق — الرياضُ UTC+3 ثابتاً بلا توقيتٍ صيفي ── */
var TK_HFMT = null;
function tkHij(ms) {
  try {
    if (!TK_HFMT) TK_HFMT = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
    var o = {}; TK_HFMT.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = +p.value; });
    if (o.year > 1300 && o.month >= 1 && o.month <= 12 && o.day >= 1 && o.day <= 30) return { y: o.year, m: o.month, d: o.day, k: o.year + '-' + o.month + '-' + o.day, ym: o.year + '-' + o.month };
  } catch (e) { swallow('tk-hij', e); }
  return null;
}
function tkToday(now) { return tkHij(now - 3 * 3600 * 1000); }                      /* اليومُ التشغيلي — مهلةُ الثلاث ساعات نفسُها (dsToday) */
function tkMinOfDay(ms) { return Math.floor(((ms / 60000) + 180) % 1440 + 1440) % 1440; }
function tkWdOf(ms) { return new Date(ms + 3 * 3600 * 1000).getUTCDay(); }           /* 0 = الأحد */
var TK_WD = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function tkHm(min) { min = ((min % 1440) + 1440) % 1440; var h = Math.floor(min / 60), m = min % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
function tkDayNum(k) { var p = String(k).split('-'); return (+p[0]) * 10000 + (+p[1]) * 100 + (+p[2]); }
/* ── الهوية (مشتركةٌ مع 062c) — الموظفون بالمعرّف الثابت eid، ورقمُ الهوية مقبولٌ فريداً فقط؛ لا اسمَ أبداً ── */
function tkEmps(raw) { var L = parseJson(raw, []); return Array.isArray(L) ? L.filter(isObj) : []; }
/* SR-2.2 · F-1 (المراجعةُ المستقلة لحزمة 242 — والعيبُ نفسُه هنا): سجلٌّ يحمل هذا المعرّفَ في حقله وحده — والمكرَّرُ (خطأُ إدخالٍ أو استيراد) لا يُعيد أوّلَ مطابِق */
function tkEmpOne(emps, f, v) { if (v == null || v === '') return null; v = String(v); var n = 0, c = null; for (var i = 0; i < emps.length; i++) if (emps[i][f] != null && emps[i][f] !== '' && String(emps[i][f]) === v) { n++; if (!c) c = emps[i]; } return n === 1 ? c : null; }
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
/* SR-2.2 · F-1 + KIVO_265 · M-2 في جهة المسؤول: السجلُّ بمعرّفه الثابت إن لم يحمله غيرُه في الحقلين — المعرّفُ المكرَّر لا يُسنَد إليه ولا يُعدّ «مرتبطاً» (ولا يراه أحدٌ في «مهامي») */
function tkEmpByEid(emps, ek) { var e = tkTokRec(emps, ek); return e && e.eid != null && String(e.eid) === String(ek) ? e : null; }
function tkEidShared(emps, ek) { return tkTokN(emps, ek).n > 1; }
var TK_EID_DUP = 'معرّفٌ يحمله أكثرُ من سجلٍّ في «موظفو الإدارة» (معرّفاً ثابتاً أو رقمَ هوية) — صحّح السجلَّ أولاً';
/* KIVO_265 · قرارُ المالك (2026-10-14 15:13 · البند 4): «اجعل وجود حساب مستخدم نشط شرطًا لإسناد مهمة إلكترونية جديدة للموظف. يُمنع الإسناد لمن لا يمتلك
   حسابًا أو حسابه معطّل، مع بيان السبب في الواجهة وتطبيق المنع في الخادم. أما الموظف الذي يمتلك حسابًا نشطًا لكنه غير متصل حاليًا، فيمكن إسناد المهمة
   له إذا كان متاحًا للعمل وفق خطته.» — الحسابُ «له» بقاعدة «ملفي» نفسِها (062c meTkIdent): حسابٌ في الإدارة نفسِها (لا مديرَ نظامٍ ولا عامّاً ولا مفتاحَ مدير)
   مفتاحُه يحمله سجلُّ هذا الموظف وحده (M-2) — و«نشط» = غيرُ معطَّل (u.dis — لا فاعلَ له: 017) ومفتاحُه هو المعرّفُ الذي يُسند به (R-3 أدناه: ما ينفّذه
   المسارُ الذاتي حرفاً). الاتصالُ لا يُشترط (لا جلسة). */
var TK_ACCT_WHY = { none: 'لا يملك حسابَ مستخدمٍ مرتبطاً بسجلّه — لا تُسند إليه مهمةٌ إلكترونية (أنشئ له حساباً واربطه بسجلّه أولاً)',
  disabled: 'حسابُه معطَّل — لا تُسند إليه مهمةٌ إلكترونية حتى يُفعَّل حسابُه',
  nid: 'حسابُ دخوله مربوطٌ بسجلّه برقم الهوية لا بمعرّفه الثابت فلن يستطيع تنفيذَ المهمة من «ملفي» — لا تُسند إليه مهمةٌ إلكترونية حتى يُربط حسابُه بمعرّفه الثابت' };
/* KIVO_265 · المراجعةُ الموحّدة (R-3 — متوسط): «نشطٌ» لمن يستطيع التنفيذ فعلاً — المسارُ الذاتي (062c meTkAct) يكتب صفّاً عمودُه 14 = مفتاحُ الحساب حرفاً،
   فكان الحسابُ الذي مفتاحُه رقمُ الهوية «نشطاً» يُسند إليه بالمعرّف الثابت ثم يرى المهمةَ للقراءة وحدها (409 identity) ولا يعيدها المديرُ إليه.
   tok = الرمزُ الذي يُكتب في العمود 14 (المعرّفُ الثابت في مسارات الخادم) ⇒ 'active' حسابٌ مفتاحُه tok حرفاً غيرُ معطَّل · 'disabled' معطَّل ·
   'nid' حسابُ السجلّ نفسِه بمفتاحٍ آخر (رقمُ الهوية — يرى ولا ينفّذ) · 'none' لا حساب، أو رمزٌ لا يحمله سجلٌّ واحدٌ وحده (M-2).
   الحسابُ «له» بقاعدة «ملفي» (meTkIdent): في الإدارة نفسِها · لا مديرَ نظامٍ ولا عامّاً ولا مفتاحَ مدير · مفتاحُه يحمله هذا السجلُّ وحده */
/* إعادةُ المراجعة (N-3 — rereview_265_unified.md): فهرسٌ واحدٌ للحكم — رمز (eid ∪ nid بعدد السجلّات التي تحمله: tkTokN حرفاً) ⇒ سجلّ، وحساباتُ الإدارة
   مجموعةً بسجلّاتها — O(E + U) مرةً لكل طلب. كان tkTokRec لكل حسابٍ ولكل رمز: O(U · E) لكل رمز (≈ 2 ث لحفظةٍ تُسند 600 صفّ · 45 ث في مجسّ المراجِع) */
function tkAcctIx(users, emps, d) {
  var tok = nmap(), E = Array.isArray(emps) ? emps : [], L = Array.isArray(users) ? users : [], i, j, e, vs, T;
  for (i = 0; i < E.length; i++) {
    e = E[i]; if (!isObj(e)) continue; vs = [];
    if (e.eid != null && e.eid !== '') vs.push(String(e.eid));
    if (e.nid != null && e.nid !== '' && String(e.nid) !== vs[0]) vs.push(String(e.nid));   /* السجلُّ بالحقلين يُعدّ مرةً (tkTokN) */
    for (j = 0; j < vs.length; j++) { T = tok[vs[j]] || (tok[vs[j]] = { n: 0, c: null }); T.n++; if (!T.c) T.c = e; }
  }
  var rec = function (t) { var q = tok[t]; return q && q.n === 1 ? q.c : null; }, acc = new Map();
  for (i = 0; i < L.length; i++) {
    var u = L[i]; if (!u || !u.id || String(u.deptId || '') !== String(d)) continue;
    var ek = String(u.ekey || ''); if (!ek || u.role === 'super' || u.role === 'gm' || isMgrKey(ek) || ek.indexOf('gm:') === 0) continue;
    var r = rec(ek); if (!r) continue;
    if (!acc.has(r)) acc.set(r, []); acc.get(r).push({ ek: ek, dis: !!u.dis });
  }
  return { rec: rec, acc: acc };
}
function tkAcctTok(users, emps, d, tok, IX) {
  var X = IX || tkAcctIx(users, emps, d), t = tok == null ? '' : String(tok), rec = t ? X.rec(t) : null;
  if (!rec) return { st: 'none' };
  var L = X.acc.get(rec) || [], dis = 0, oth = 0, othDis = 0;
  for (var i = 0; i < L.length; i++) {
    if (L[i].ek === t) { if (!L[i].dis) return { st: 'active' }; dis = 1; }
    else if (!L[i].dis) oth = 1; else othDis = 1;
  }
  return { st: dis ? 'disabled' : oth ? 'nid' : othDis ? 'disabled' : 'none' };
}
/* KIVO_265 · F-1/R-24 (المراجعةُ المستقلة — ثغرةُ رقم الهوية · fail-closed): سجلُّ الموظف rec «له» حسابٌ نشطٌ آخرُ غيرُ selfId في الإدارة d يحلّ إليه
   (tkTokRec: eid ∪ nid · أو ربطُ «ملفي» pfLink — 062b) ⇒ لا يُعدّ أيٌّ منهما مرتبطاً به (062c meTkIdent · 062b meIdent): لا مهامَه ولا صورَه ولا جدولَه.
   يغلق كلَّ طريقٍ إلى حسابين لسجلٍّ واحد — ومنه تعديلُ سجلّ الموظفين بعد إنشاء الحساب (والكتابةُ تمنع الحاملَ الجديد: 054 usersDupEkey) */
function tkRecShared(users, emps, d, rec, selfId) {
  if (!rec) return false;
  var E = (Array.isArray(emps) ? emps : []).filter(isObj), L = Array.isArray(users) ? users : [], i, u, ek;
  for (i = 0; i < L.length; i++) {
    u = L[i]; if (!u || !u.id || String(u.id) === String(selfId) || u.dis || String(u.deptId || '') !== String(d)) continue;
    ek = String(u.ekey || ''); if (!ek || u.role === 'super' || u.role === 'gm' || isMgrKey(ek) || ek.indexOf('gm:') === 0) continue;
    if (tkTokRec(E, ek) === rec || pfLink(u, E).rec === rec) return true;
  }
  return false;
}
/* سجلُّ موظفٍ بمعرّفه الثابت الفريد — ما تكتبه مساراتُ الخادم في العمود 14 (IX اختياريّ: فهرسُ tkAcctIx المبنيّ للطلب) */
function tkAcctOf(users, emps, d, emp, IX) {
  if (!emp || emp.eid == null || emp.eid === '') return { st: 'none' };
  var X = IX || tkAcctIx(users, emps, d);
  if (X.rec(String(emp.eid)) !== emp) return { st: 'none' };
  return tkAcctTok(users, emps, d, String(emp.eid), X);
}
/* KIVO_265 · المراجعةُ الموحّدة (R-1): نشاطُ الموظف في الصفّ — مرآةُ _tkHasActivity في صفحة «المهام» (RC-13) — أو صفٌّ أغلقه الخادم (أُلغي · أُعيد إسنادُه) */
function tkRowActive(r) {
  if (!Array.isArray(r)) return false;
  if (r[11] || r[12] || r[20] || r[21] || (r[3] && r[3] !== 'pending')) return true;
  var x = r.length > 23 && isObj(r[23]) ? r[23] : null;
  return !!(x && (x.asg === 'cancelled' || x.asg === 'reassigned'));
}
/* ربطُ صفٍّ بسجلّ موظف (للمدير — ق4: لا إعادةَ كتابةٍ تلقائية): eid ⇒ مرتبطة · nid فريد ⇒ مرتبطةٌ وقتَ القراءة · اسمٌ أو غيرُه ⇒ «غير مرتبطة»
   KIVO_265 · L-2: الاسمُ لا يربط أبداً — ومرشَّحُ الربط اليدوي (cand) يُعطى إن تفرّد الاسمُ في السجل (لا أوّلُ مطابِق)، والواجهةُ تعرضه اقتراحاً لا اختياراً */
function tkLink(emps, tok) {
  if (tok == null || tok === '') return { by: 'none', emp: null };
  var t = String(tok), T = tkTokN(emps, t);
  if (T.n === 1) return T.c.eid != null && String(T.c.eid) === t ? { by: 'eid', emp: T.c } : { by: 'nid', emp: T.c };
  if (T.n > 1) return { by: 'ambiguous', emp: null };
  var nm = 0, cand = null;
  for (var i = 0; i < emps.length; i++) if (emps[i].name && String(emps[i].name) === t) { nm++; if (!cand) cand = emps[i]; }
  if (nm) return { by: 'name', emp: null, cand: nm === 1 ? cand : null };
  return { by: 'unknown', emp: null };
}
/* KIVO_265 · H-1: وسمُ الخادم — الفاعلُ في مسارات المسؤول (071) والتكرار (073) يكتب العمود 23 (018 taskXWhy). يُبنى في الخادم من الجلسة ولا يصل إليه
   مدخلٌ من الطلب (كوسم الذات __tkSelf في 062c) — والحفظُ المركزي يحكم صلاحيتَه كما كان (canWrite · enfDecide) */
function tkSrvMark(A) { if (A) { try { Object.defineProperty(A, '__tkSrv', { value: 1, enumerable: false, configurable: true }); } catch (e) { A.__tkSrv = 1; } } return A; }
/* ── صلاحيةُ مفتاحٍ بعينه للفاعل في إدارة — بالوضعين: الإنفاذُ من السجل (enfHeld) · والقديمُ بترجمة ورقته (permv2Ctx ⇒ KIVO_REGISTRY.can) ── */
function tkHeld(A, d, key) {
  if (!A || !A.u) return false;
  if (A.u.role === 'super') return true;
  if (!d) return false;
  if (A.enf) return enfHeld(A, d, key);
  try { return !!KIVO_REGISTRY.can(key, permv2Ctx(A, d)).ok; } catch (e) { return false; }
}
/* ── مفاتيحُ المخازن ── */
function tkK(d) { return 'bsdept:' + d + ':bassam_tasks_v1'; }
async function tkRev(env, k) { var r = await env.DB.prepare('SELECT rev FROM revs WHERE k = ?1').bind(k).first(); return (r && r.rev) || 0; }
/* قفلُ الشهر في الخادم = الاعتمادُ الصريح وحده (true) — {mo:1} شهرٌ منقضٍ فُتح فهو مفتوح (lockState في 010) */
async function tkLocked(env, d, ym) {
  var L = parseJson(await opResourceGet(env, 'bsdept:' + d + ':bassam_tasks_locks_v1'), {});
  var v = isObj(L) ? L[ym] : undefined; return v === true || v === 1;
}
function tkYm(k) { var p = String(k).split('-'); return (+p[0]) + '-' + (+p[1]); }
/* KIVO_265 · قفلُ اليوم: اليومُ المُغلق بيده (true على مفتاح «y-m-d» في مخزن الأقفال) لا تُضاف إليه مهامٌ جديدة — الإنشاءُ يُرفض والتكرارُ يتخطّاه */
async function tkDayShut(env, d, k) {
  var p = String(k).split('-'), L = parseJson(await opResourceGet(env, 'bsdept:' + d + ':bassam_tasks_locks_v1'), {});
  return isObj(L) && L[(+p[0]) + '-' + (+p[1]) + '-' + (+p[2])] === true;
}
/* ── حدثُ تدقيقٍ للمهمة (etype=task · eid = هويةُ الكيان) ── */
function tkAud(K, r, act, ctx, bef, aft) {
  var now = Date.now();
  return { cid: 'tk' + now.toString(36) + '_' + Math.floor(Math.random() * 1e9).toString(36), k: K, etype: 'task', act: act, eid: tkEntId(r),
    ename: String(r[0] || 'مهمة').slice(0, 160), ctx: JSON.stringify(ctx || {}), before: bef == null ? null : JSON.stringify(bef), after: aft == null ? null : JSON.stringify(aft) };
}
/* ── الحفظُ عبر الحفظ المركزي نفسِه — بحارس النسخة (CAS): fn(S) تعيد {S2, aud, out} أو {err:Response} ──
   meta (KIVO_265 · L-3): هويةُ المصدر في التدقيق والأمن — الافتراضيُّ عنوانُ الطلب وجهازُه؛ والتكرارُ (073) يمرّر هويةَ الخادم الثابتة
   فلا يُنسب عنوانُ الموظف الذي فتح «ملفي» وجهازُه إلى كتابةٍ باسم صاحب القالب.
   F-10 (من SR-2.3 · KIVO_242 — بقرار المالك: «ضمّن الإصلاح في خط التطوير المستقبلي حتى لا يعود العطل»): ما سبقه حفظٌ متزامن يُعاد بقراءةٍ جديدة
   حتى TK_TRIES مرة بمهلةٍ بقدر زمن القاعدة (لا «تم» إلا بعد ثبوت الكتابة) · والرفضُ على نسخةٍ تحرّكت (الحكمُ في الحفظ المركزي يسبق فحصَ النسخة —
   صفٌّ أضافه المديرُ بين القراءة والكتابة) يُعاد كذلك ولا يُسجَّل «رفضاً» أمنياً؛ والرفضُ على نسخةٍ لم تتحرّك صريحٌ: حدثٌ أمنيٌّ واحد ويُردّ كما هو.
   opt.srv: مسارُ مهامٍ في الخادم يبني من القيمة الحالية — فلا يمسّه حفظُ أفعال الموظف (tkKeepSelf) المخصّصُ للحفظ الخامّ من الواجهة. */
var TK_TRIES = 8;
function tkPause(n, ms) { return Math.min(1500, Math.max(5, ms || 0) * (0.5 + Math.random()) + 15 * n); }
async function tkSave(env, request, A, K, fn, meta, command) {
  var mq = meta || (request ? reqMeta(request) : {}), last = 0;
  for (var attempt = 0; attempt < (command ? 1 : TK_TRIES); attempt++) {
    if (attempt) await new Promise(function (r) { setTimeout(r, tkPause(attempt, last)); });
    var t0 = Date.now();
    var rev = await tkRev(env, K), S = parseJson(await opResourceGet(env, K), {}); if (!isObj(S)) S = {};
    var R = await fn(S, rev, attempt);
    if (!R || R.err) return R || { err: json({ ok: 0, err: 'state' }, 409) };
    if (R.noop) return R;
    var B = { set: {}, base: {}, aud: R.aud || [] }; B.set[K] = JSON.stringify(R.S2); B.base[K] = rev;
    if (R.why) { B.why = {}; B.why[K] = String(R.why).slice(0, 300); }               /* KIVO_265: سببُ الفعل للإنفاذ حين يلزمه سجلُّه (task.reopen — §12 audit.reason) */
    if (command) { B.requestId = command.body.requestId; B.epoch = command.body.epoch; }
    var options = { srv: 1, quiet: 1 };
    if (command) {
      var classification = KIVO_GUARDS.classify('bassam_tasks_v1', S, R.S2, {});
      R.result = Object.assign({}, R.result || {}, { commandActions: Array.from(new Set(command.actions.concat(classification ? classification.keys() : []))) });
    }
    if (command) Object.assign(options, { __reference: command.reference, __operationRequestId: command.body.requestId,
      __operationFingerprint: command.fingerprint, __operationResult: R.result || {} });
    var res;
    try { res = await applySave(env, B, A, mq, options); }
    catch (error) {
      var epochChanged = /KIVO_RESTORE_EPOCH/.test(String(error));
      if (!epochChanged && !/KIVO_REV_CONFLICT|KIVO_RESTORE_TARGET/.test(String(error)) && !(error.rs === 'conflict' && error.status === 409)) throw error;
      last = Date.now() - t0;
      // Interactive commands retain their original base/ticket. Existing
      // server/self intents may retry against current data, never across restore.
      if (command) return { err: json({ ok: 0, err: 'conflict' }, 409) };
      if (epochChanged) return { err: json({ ok: 0, err: 'busy', msg: 'تغيّرت نسخة البيانات — راجع المهمة وأعد المحاولة' }, 409) };
      continue;
    }
    last = Date.now() - t0;
    if ((!command || res.ok === 1) && res.revs && Object.prototype.hasOwnProperty.call(res.revs, K) && Number.isSafeInteger(res.revs[K]) && res.revs[K] >= 0) {
      R.rev = res.revs[K]; if (command) R.receipt = res; return R;
    }
    if (res.denied && res.denied[K]) {
      if ((await tkRev(env, K)) !== rev) continue;                                 /* رفضٌ على نسخةٍ تجاوزها حفظٌ متزامن ⇒ قراءةٌ جديدة */
      await secLog(env, { ts: Date.now(), uid: A.u.id, un: String(A.u.un || ''), act: 'denied', target: K, detail: String(res.denied[K].why || ''), ip: mq.ip, city: mq.city, dev: mq.dev });
      return { err: json({ ok: 0, err: 'denied', why: String(res.denied[K].why || ''), reasonKeys: Array.isArray(res.denied[K].reasonKeys) ? res.denied[K].reasonKeys : undefined }, 403) };   /* k265-fix: مفاتيحُ السبب لنافذة 280 (askReason) */
    }
    if (!(res.conflicts && res.conflicts[K])) break;
  }
  return { err: json({ ok: 0, err: 'busy', msg: 'تعذّر الحفظ لتعديلٍ متزامن — أعد المحاولة' }, 409) };
}
/* ── F-10 (من SR-2.3 · KIVO_242): أفعالُ الموظف لا يمحوها حفظٌ خامٌّ لمخزن المهام مبنيٌّ على نسخةٍ لم ترها ──
   يُنادى من applySave (054) للحفظ الخامّ وحده (صفحةُ «المهام»: تعديلٌ · قبولٌ أو إنهاءٌ نيابةً · إعادةُ فتح) — لا للمسار الذاتي (A.__tkSelf) ولا لمسارات
   المهام في الخادم (opt.srv: تبني من القيمة الحالية) ولا للاستعادة والاستيراد. الحالة: المديرُ يحفظ المخزنَ كلَّه من نسخةٍ قديمة فيردّ الخادمُ تعارضاً،
   ودمجُ الواجهة يرجّح نسختَه للصفّ نفسِه ثم يعيد الحفظ ⇒ يضيع ما فعله الموظفُ بينهما وقد قيل له «تم». الآن صفٌّ باقٍ في الحفظة وفي الخادم بالهوية
   نفسِها (اليوم · 13 · 14 — أو 13·14 إن تفرّدا) يأخذ من القيمة الحالية:
     · العمودين 20 و21 كما هما: ملكُ الموظف (المسارُ الذاتي يكتبهما · ومساراتُ الخادم تمدّد وتلغي وتعيد الإسناد) وصفحةُ «المهام» لا تؤلّف فيهما شيئاً —
       تنسخهما مع الصف — فما تحمله الحفظةُ منهما نسخةٌ قد تكون أقدم: الاستلامُ · التعثّرُ ورفعُه · الانقضاء · الاعتذار · التوثيقُ ومسوّدتُه والتسليم.
     · وفي المشتركة (3 · 6 · 11 · 12) ما لم تره الحفظةُ من تقدّمه: الإنجازُ بتوثيقٍ أحدث · التسليمُ للمراجعة (12 · 6) · وقتُ البدء وحالةُ «جارية» · الاعتذار.
   ويمضي المقصود: إعادةُ الفتح والإنجازُ والقبولُ نيابةً تحمل التوثيقَ نفسَه (لا أحدث) فتمضي · الإسنادُ لغيره والحذفُ يغيّران الهوية فلا يُمسّان.
   صفٌّ هويتُه مكرّرةٌ في أحد الطرفين لا يُخمَّن له. */
function tkDocTs(o) {
  if (!isObj(o)) return 0;
  var t = Math.max(+o.at || 0, +o.sub || 0);
  if (Array.isArray(o.h) && o.h.length && isObj(o.h[o.h.length - 1])) t = Math.max(t, +o.h[o.h.length - 1].at || 0);
  return t;
}
/* o.x (KIVO_265 · H-1 مع F-10): حفظةٌ مبنيّةٌ على نسخةٍ تجاوزها الخادم (base قديم) تأخذ العمودَ 23 (x — للخادم وحده) من القيمة الحالية لصفوفها
   المطابَقة — فلا يُحكم عليها بـ«task-x» لعمودٍ لم تكن لتعرفه (مسارُ خادمٍ كتبه بعد قراءتها) فتصير تعارضاً يدمجه العميل ثم يعيد الإرسال؛
   والحفظةُ على النسخة الحالية تُحكَم بـx كما أرسلتها (تغييرُها رفضٌ صريح · H-1). لا كتابةَ على base قديم أصلاً (فحصُ النسخة بعد الحكم). */
function tkKeepSelf(incJson, curJson, o) {
  var b = parseJson(incJson, null), a = parseJson(curJson, null);
  if (!isObj(a) || !isObj(b)) return { v: incJson, n: 0 };
  var idOf = function (r) { return String(r[13]) + '|' + String(r[14] == null ? '' : r[14]); };
  var I3 = Object.create(null), I2 = Object.create(null), J3 = Object.create(null), J2 = Object.create(null), d, i, r, k3, k2;
  for (d in a) {
    if (!Array.isArray(a[d])) continue;
    for (i = 0; i < a[d].length; i++) { r = a[d][i]; if (!Array.isArray(r) || r[13] == null) continue; k3 = d + '#' + idOf(r); k2 = idOf(r); I3[k3] = k3 in I3 ? -1 : r; I2[k2] = k2 in I2 ? -1 : r; }
  }
  for (d in b) {
    if (!Array.isArray(b[d])) continue;
    for (i = 0; i < b[d].length; i++) { r = b[d][i]; if (!Array.isArray(r) || r[13] == null) continue; k3 = d + '#' + idOf(r); k2 = idOf(r); J3[k3] = (J3[k3] || 0) + 1; J2[k2] = (J2[k2] || 0) + 1; }
  }
  var n = 0, s = function (q) { return q == null ? '' : String(q); }, js = function (q) { return JSON.stringify(q === undefined ? null : q); };
  for (d in b) {
    if (!Array.isArray(b[d])) continue;
    for (i = 0; i < b[d].length; i++) {
      r = b[d][i]; if (!Array.isArray(r) || r[13] == null) continue;
      k3 = d + '#' + idOf(r); k2 = idOf(r);
      var c = J3[k3] === 1 && Array.isArray(I3[k3]) ? I3[k3] : (J2[k2] === 1 && Array.isArray(I2[k2]) ? I2[k2] : null);
      if (!c) continue;
      var x = r.slice(), ch = 0;
      var put = function (j, v) { while (x.length <= j) x.push(null); x[j] = v; ch++; };
      /* التوثيقُ أو التسليمُ في الخادم أحدثُ ممّا تحمله الحفظة (لم ترَه) — يُقاس قبل استبدال 21 */
      var nw = isObj(c[21]) && tkDocTs(c[21]) > tkDocTs(x[21]);
      if (c[3] === 'done' && c[12] && nw && s(x[3]) !== 'done') {                                  /* لم ترَ الإنجاز: يعود بتوثيقه */
        put(3, 'done'); put(12, c[12]); if (c[6] != null && x[6] == null) put(6, c[6]);
      } else if (c[12] && !x[12] && nw && s(x[3]) !== 'done') {                                  /* لم ترَ التسليمَ للمراجعة */
        put(12, c[12]); if (c[6] != null && x[6] == null) put(6, c[6]);
      }
      if (c[11] && !x[11]) put(11, c[11]);                                                         /* وقتُ البدء */
      if (x[11] && (s(x[3]) === '' || s(x[3]) === 'pending') && (c[3] === 'in_progress' || c[3] === 'done')) put(3, 'in_progress');
      if (c[3] === 'declined' && isObj(c[20]) && c[20].at && !(isObj(x[20]) && x[20].at) && s(x[3]) !== 'declined' && !x[11]) put(3, 'declined');   /* الاعتذار */
      if (js(x[20]) !== js(c[20])) put(20, c[20] == null ? null : c[20]);                          /* ملكُ الموظف — كما في الخادم */
      if (js(x[21]) !== js(c[21])) put(21, c[21] == null ? null : c[21]);
      if (o && o.x && js(x.length > 23 ? x[23] : null) !== js(c.length > 23 ? c[23] : null)) put(23, c.length > 23 && c[23] != null ? c[23] : null);   /* H-1: للخادم */
      if (ch) { b[d][i] = x; n++; }
    }
  }
  return n ? { v: JSON.stringify(b), n: n } : { v: incJson, n: 0 };
}
/* Notification templates and targeting have one owner: the relational domain. */
var TK_NOTIFICATION_TYPES = ['task_new', 'task_done', 'task_chg', 'task_soon', 'task_late'];
var TK_TFMT = null;
function tkClock(ms) { try { if (!TK_TFMT) TK_TFMT = new Intl.DateTimeFormat('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' }); return TK_TFMT.format(new Date(ms)); } catch (e) { return tkHm(tkMinOfDay(ms)); } }
/* items: [{type, own:[ekeys/uids], vars:{}, once?}] — يُكتب بعد نجاح الفعل؛ إخفاقُه لا يُبطل الفعل (best effort مع إعادةٍ عند التعارض) */
async function tkNotify(env, request, A, d, items, meta) {
  if (!items || !items.length || !d) return 0;
  try {
    var events = items.filter(function(it){ return TK_NOTIFICATION_TYPES.indexOf(it.type) !== -1; }).map(function(it){ var e={type:it.type,dept:d,own:it.own||[],vars:it.vars||{}}; if(it.once)e.once=it.once; return e; });
    if (!events.length) return 0;
    return (await nfEmitEvents(env,A,events,true)).n || 0;
  } catch(e) { swallow('tk-notify',e,env.__rid); return 0; }
}
/* ── قراءةُ الجسم بسقفٍ وحارسِ شكل ── */
async function tkBody(request, path, lim) {
  var raw = await request.arrayBuffer();
  if (raw.byteLength > (lim || 8192)) return { err: json({ ok: 0, err: 'too-large' }, 413) };
  /* KIVO_264 · SOT-101/E5 (عقدُ 051b bodyRead): JSON غيرُ مفهوم ⇒ 400 bad-body at:'$' كسائر المسارات المغيِّرة */
  var b; try { b = JSON.parse(new TextDecoder().decode(raw)); } catch (e) { return { err: json({ ok: 0, err: 'bad-body', at: '$' }, 400) }; }
  var bad = typeof bodyCheck === 'function' ? bodyCheck(path, b) : null; if (bad) return { err: json({ ok: 0, err: 'bad-body', at: bad }, 400) };
  if (!isObj(b)) return { err: json({ ok: 0, err: 'bad-body', at: 'body' }, 400) };
  return { b: b };
}
/* KIVO_264 · C1 (عقدُ 063 لـ/api/save نفسُه — التدقيقُ المعماري D-3): uid في الجسم = هويةُ التبويب الذي بُني لها (BOOT.uid)؛ إن خالف صاحبَ الجلسة
   ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة — فلا يُنفَّذ فعلُ تبويبٍ بُني لحسابٍ باسم حسابٍ آخر دخل في المتصفح نفسِه. الغائبُ وnull = كما كان.
   والقراءةُ (GET) بـ?uid= عبر sessUidMismatch في 063. */
function tkSessBody(env, b, ss, path) {
  if (!b || b.uid == null || String(b.uid) === String(ss.uid)) return null;
  logEv('warn', 'session-changed', { rid: env.__rid, p: path, st: 409 });
  return json({ ok: 0, err: 'session-changed' }, 409);
}
/* هويةٌ جديدة فريدة للعمود 13 (ق: الهويةُ تبقى في 13 — والدمجُ في العميل يعتمد عليها): طابعُ الآن مزاحاً حتى لا يتكرّر في المخزن كلّه */
function tkIdsUsed(S) { var u = nmap(); for (var dk in S) if (Array.isArray(S[dk])) S[dk].forEach(function (r) { if (Array.isArray(r) && r[13] != null) u[String(r[13])] = 1; }); return u; }
function tkNewId(used, base) { var id = Math.max(base || 0, Date.now()); while (used[String(id)]) id++; used[String(id)] = 1; return id; }
/* البحثُ عن صفٍّ بهويته (13) ومكلَّفه (14) — والموضعُ تلميحٌ لا مرجع */
function tkFind(L, id, ekey, hint) {
  if (!Array.isArray(L)) return -1;
  var ok = function (r) { return Array.isArray(r) && r[13] != null && String(r[13]) === String(id) && (ekey == null || String(r[14] == null ? '' : r[14]) === String(ekey)); };
  if (typeof hint === 'number' && ok(L[hint])) return hint;
  for (var j = 0; j < L.length; j++) if (ok(L[j])) return j;
  return -1;
}

/* Interactive commands carry the original request fingerprint into the existing
   operational receipt. The fresh reference also fences every derived input. */
async function tkCommandContext(env, A, body, command, actions) {
  var append = command === 'tasks.create';
  if (!Number.isSafeInteger(body.epoch) || body.epoch < 0 ||
      ((!append || body.base !== undefined) && (!Number.isSafeInteger(body.base) || body.base < 0)))
    return tkNo(400, 'bad-body', '', { at: 'base' });
  var reference = await rsReferenceSnapshot(env, A.u.id), actor = reference.A;
  if (!actor || !actor.u) return tkNo(401, 'session');
  ['tok', 'sessTs', '__tkSrv', '__tkSelf'].forEach(function (key) { if (A[key] !== undefined) actor[key] = A[key]; });
  env = reference.env; A = actor;
  var D = tkDeptOf(A, body.dept); if (D.err) return D;
  if (!(A.depts || []).some(function (row) { return row && row.id === D.d; })) return tkNo(403, 'forbidden');
  if (!(actions || []).every(function (action) { return tkHeld(A, D.d, action); })) return tkNo(403, 'denied');
  if (body.epoch !== Number(reference.inputMeta.restore_epoch || 0)) return tkNo(409, 'restore-epoch-changed');
  var receipt = await opCommandReceipt(env, A, command, body.requestId, body), key = tkK(D.d);
  if (receipt.receipt && (!Array.isArray(receipt.receipt.commandActions) || !receipt.receipt.commandActions.every(function (action) { return tkHeld(A, D.d, action); }))) return tkNo(403, 'denied');
  if (receipt.receipt) {
    try { await env.DB.batch(rsReferenceGuards(env, reference)); }
    catch (error) {
      if (/KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT|KIVO_RESTORE_EPOCH/.test(String(error))) throw rsError('conflict', 409);
      throw error;
    }
  }
  // Create appends to this freshly captured source; it never replaces a client
  // document. Its server-side CAS remains in tkSave/the atomic compiler.
  if (!append && !receipt.receipt && body.base !== Number(reference.inputRevs[key] || 0)) return tkNo(409, 'busy');
  return { actions: actions || [], env: env, A: A, d: D.d, key: key, reference: reference, fingerprint: receipt.fingerprint, receipt: receipt.receipt, body: body };
}
function tkCommandReply(command, receipt) {
  var reply = Object.assign({}, receipt, { rev: receipt.revs && receipt.revs[command.key] || receipt.v || 0 });
  delete reply.commandActions;
  return reply;
}
async function tkPreparedCommand(env, request, A, body, name, prepare, recurrence) {
  var actions = recurrence && body.op === 'start' ? ['task.edit', 'task.create', 'task.assign'] : ['task.edit'];
  var command = await tkCommandContext(env, A, body, name, actions);
  if (command.err) return command.err;
  if (command.receipt) return json(tkCommandReply(command, command.receipt));
  var R = await tkSave(command.env, request, command.A, command.key, async function (S) {
    var plan = await prepare(command.env, command.A, body, command.d, command.key, S);
    return plan instanceof Response ? { err: plan } : plan;
  }, null, command);
  if (R.err) return R.err;
  if (recurrence && !R.receipt.duplicate && typeof tkGateReset === 'function') await tkGateReset(command.env, 'rec', command.d);
  return json(tkCommandReply(command, R.receipt));
}
