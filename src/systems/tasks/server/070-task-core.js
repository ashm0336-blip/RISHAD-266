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
/* ── يومُ المهمة ووقتُ اليوم بالدقائق — الرياضُ UTC+3 ثابتاً بلا توقيتٍ صيفي ──
   V7 · 53 تقويم (ق١ · ق١١): اليومُ الميلاديُّ المدنيّ للرياض (calGAt · 016) — k = 'YYYY-MM-DD' · ym = 'YYYY-MM' مبطَّنان؛ لا مُنسِّقَ هجريّ هنا */
function tkDay(ms) {
  if (typeof ms !== 'number' || !isFinite(ms)) return null;
  var o = calGAt(ms);
  return { y: o.y, m: o.m, d: o.d, k: o.k, ym: o.ym };
}
function tkToday(now) { return tkDay(now - 3 * 3600 * 1000); }                      /* اليومُ التشغيلي — مهلةُ الثلاث ساعات نفسُها (dsToday) */
function tkMinOfDay(ms) { return Math.floor(((ms / 60000) + 180) % 1440 + 1440) % 1440; }
function tkWdOf(ms) { return new Date(ms + 3 * 3600 * 1000).getUTCDay(); }           /* 0 = الأحد */
var TK_WD = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function tkHm(min) { min = ((min % 1440) + 1440) % 1440; var h = Math.floor(min / 60), m = min % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
function tkDayNum(k) { return calDayNum(k); }   /* V7 · د5-د2: في تقويم الخادم (016) */
/* ── الهوية (مشتركةٌ مع 062c) — الموظفون بالمعرّف الثابت eid، ورقمُ الهوية مقبولٌ فريداً فقط؛ لا اسمَ أبداً ── */
/* tkEmps → 016-base-shared.js (V7 · المرحلة 2 · الحزمة أ) */
/* SR-2.2 · F-1 (المراجعةُ المستقلة لحزمة 242 — والعيبُ نفسُه هنا): سجلٌّ يحمل هذا المعرّفَ في حقله وحده — والمكرَّرُ (خطأُ إدخالٍ أو استيراد) لا يُعيد أوّلَ مطابِق */
function tkEmpOne(emps, f, v) { if (v == null || v === '') return null; v = String(v); var n = 0, c = null; for (var i = 0; i < emps.length; i++) if (emps[i][f] != null && emps[i][f] !== '' && String(emps[i][f]) === v) { n++; if (!c) c = emps[i]; } return n === 1 ? c : null; }
/* tkTokN → 016-base-shared.js (V7 · المرحلة 2 · الحزمة أ) */
/* tkTokRec → 016-base-shared.js (V7 · المرحلة 2 · الحزمة أ) */
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
