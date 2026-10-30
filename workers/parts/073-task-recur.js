/* ═══ KIVO_264 · KIVO-Tasks (المرحلة الثانية) — المهامُ المتكررة: قالبٌ + نسخةُ تنفيذٍ مستقلة لكل موعد، تُولَّد في الخادم بلا Cron (ق5) ═══
   القالبُ لا يُخزَّن موردٌ جديد ولا صفٌّ وهميّ: تعريفُ السلسلة x.rec يحمله كلُّ صفٍّ من نُسخها (أوّلُها نسخةُ يوم البدء الحقيقية)، والنموذجُ
   للتوليد هو أحدثُ نسخةٍ غيرِ منفصلة (det) بأعلى إصدار (ver) — فحذفُ نسخةٍ لا يقتل السلسلة، و«كلُّ التنفيذات القادمة» = إصدارٌ أعلى.
     x.rec = { id, ver, t: daily|days|weekly|monthly|every, wd:[0..6] (الأحد=0), md:1..30|'last', n:2..30 (every), from:'Y-M-D', to?:'Y-M-D' (غائبٌ = حتى الإيقاف), paused:0|1, stop?:1, by?:{u,e,n}, asg:[eid…] }
     KIVO_265 · البند 16: every = كل n يوماً من يوم البدء (from) بعدّ الأيام المدنية (tkHijMid) · md:'last' = آخرُ يومٍ في الشهر الهجري (29 أو 30) — لا يُتخطّى
     x.idem = 'r:<id>:<Y-M-D>:<eid>'  — مفتاحُ عدم التكرار: إعادةُ التشغيل أو تشغيلُه مرتين معاً لا تكرّر نسخة (يُعاد فحصُه على القيمة الطازجة داخل
                                         حارس النسخة CAS — فالكاتبُ الثاني يرى ما كتبه الأول ولا يضيف شيئاً).
   التوليد: لأفقٍ محدود (TK_REC_H = 30 يوماً قادمة — KIVO_265 · البند 15: كان 7؛ Cloudflare Pages لا يدعم مشغّلات Cron فالتوليدُ يبقى كسولاً والبديلُ أفقٌ أطول
   يرى الموظفُ والمسؤولُ مواعيدَ الشهر القادم) وبسقفٍ للصفوف في التشغيل الواحد (TK_REC_MAX = 600 · كان 200 — والباقي في التشغيل التالي بمفاتيح idem نفسِها) · لا خارجَ الإدارة · لا لموظفٍ غيرِ متاحٍ يومَها (§4) — يُتخطّى ويُبلَّغ صاحبُ القالب مرةً،
   ويُعاد الحكمُ في كل تشغيل (فإن تغيّر الجدول وصار متاحاً وُلّدت نسختُه) · يُكتب باسم صاحب القالب (x.by) عبر الحفظ المركزي — فلا صلاحيةَ
   تُستعار: صاحبُ قالبٍ فقد صلاحية الإنشاء تتوقف سلسلتُه (denied) ويُرى ذلك في التقرير.
   المحرّكات (بلا Cron): قراءةُ الموظف «مهامي» (GET /api/me/tasks — كسولاً ومرةً كل 10 دقائق لكل إدارة) · فتحُ صفحة المهام · الطلبُ الصريح:
     POST /api/tasks/recur/run[?dept=&day=<اليوم>]   (task.view)        ⇒ {created, skipped[], denied[]}
     POST /api/tasks/recur {id, op: pause|resume|stop|edit, rec?, k?, row?}  (task.edit)  ⇒ إيقافٌ مؤقت · استئناف · إنهاءُ السلسلة · تعديلُ قاعدتها
                                                     (stop {k, row}: نسخةُ السلسلة في اليوم k بالعمود 13 = row تبقى آخرَ موعدٍ لها — U1)
     POST /api/tasks/recur {op: start, k, id|grp, rec}  (task.create + task.edit + task.assign)  ⇒ تحويلُ مهمةٍ مسندةٍ لمرةٍ واحدة (أو مجموعتِها) إلى سلسلة
   KIVO_265 · قرارُ المالك 2026-10-16 (تكرارُ المهام — srvrec): مرةً واحدة أو متكررة يومياً/أسبوعياً/شهرياً · بدايةٌ ونهاية أو «حتى الإيقاف» ·
   الإنشاءُ والتعديلُ والإيقاف بصلاحيات المهام القائمة وفي الخادم · لا تُولَّد النسخةُ نفسُها مرتين · والنسخُ السابقةُ وسجلُّها وإثباتُها باقية:
     · rec.to غائب = «حتى الإيقاف» (rec.open:1 عند الإنشاء أو التعديل) — وكلُّ قارئٍ يعدّ غيابَه بلا نهاية (tkRecDue) · بلا to ولا open ⇒ سنةٌ هجرية كما كان ·
       والنهايةُ الصريحة ثلاثُ سنواتٍ هجرية على الأكثر · 'days' اسمٌ قديمٌ لـ'weekly' (يُقبل ويُعامَل مثلَه) · الشهريّ يومُ الشهر الهجريّ md: شهرٌ بلا يومِه (29 يوماً
       واليومُ 30) لا نسخةَ فيه — يُتخطّى كما كان (وmd:'last' آخرُ يومٍ في الشهر 29 أو 30 لا يُتخطّى — البند 16).
     · rec.stop:1 = سلسلةٌ أُنهيت (نهايتُها لا تتقدّم أبداً: to = أقربُهما من نهايتها واليوم) — لا استئنافَ ولا إيقافَ ولا تعديلَ بعدها (409 rec-ended) ولا بعد نهايتها.
     · الإيقافُ والاستئنافُ والإنهاءُ والتعديلُ تكتب القاعدةَ (بإصدارٍ أعلى) على نسخ اليوم وما بعده في الأشهر المفتوحة وحدها — والنسخُ السابقة وما في
       شهرٍ معتمدٍ ومقفل لا تُمسّ؛ ويحمل النموذجُ (tkSeries) القاعدةَ الجديدة دائماً (أحدثُ نسخةٍ في شهرٍ مفتوح إن لم تكن نسخةٌ قادمة) وإلا 409 month-locked.
     · rec.by: صاحبُ سلسلةٍ حُوِّلت من مهمةٍ قائمة (start) — من حوّلها، ويتحقّق منه سجلُّ الخادم بحدث rec_start كما يتحقّق من «أُنشئت» (F-2/R-21). */
var TK_REC_H = 30, TK_REC_MAX = 600, TK_REC_T = { daily: 1, days: 1, weekly: 1, monthly: 1, every: 1 }, TK_REC_LAST = nmap(), TK_REC_GAP = 10 * 6e4;
var TK_REC_Y = 30000;                                                        /* سقفُ النهاية الصريحة بفرق tkDayNum: ثلاثُ سنواتٍ هجرية */
/* keep (التعديل): بلا to ولا open ⇒ نهايةُ السلسلة كما هي ({to} أو {} لـ«حتى الإيقاف») — لا السنةُ الافتراضية */
function tkRecIn(v, k, keep) {
  if (v == null) return { rec: null };
  if (!isObj(v) || typeof v.t !== 'string' || !Object.prototype.hasOwnProperty.call(TK_REC_T, v.t)) return { bad: 'rec.t' };   /* srvrec: لا «toString» قاعدةً لا تولِّد */
  var o = { t: v.t };
  if (v.t === 'days' || v.t === 'weekly') {
    if (!Array.isArray(v.wd) || !v.wd.length || v.wd.length > 7 || !v.wd.every(function (x) { return x === Math.floor(x) && x >= 0 && x <= 6; })) return { bad: 'rec.wd', msg: 'اختر أيام الأسبوع' };
    o.wd = v.wd.filter(function (x, n) { return v.wd.indexOf(x) === n; }).sort();
  }
  /* KIVO_265 · البند 16: md:'last' آخرُ يومٍ في الشهر الهجري · every بعدد أيامٍ n من 2 إلى 30 */
  if (v.t === 'monthly') { if (v.md === 'last') o.md = 'last'; else if (!(v.md === Math.floor(v.md) && v.md >= 1 && v.md <= 30)) return { bad: 'rec.md', msg: 'اختر يوم الشهر' }; else o.md = v.md; }
  if (v.t === 'every') { if (!(typeof v.n === 'number' && v.n === Math.floor(v.n) && v.n >= 2 && v.n <= 30)) return { bad: 'rec.n', msg: 'عددُ الأيام بين موعدين من 2 إلى 30' }; o.n = v.n; }
  if (v.open != null && v.open !== 0 && v.open !== 1 && v.open !== !0 && v.open !== !1) return { bad: 'rec.open' };
  var open = v.open === 1 || v.open === !0;
  if (v.to != null && v.to !== '') {
    if (typeof v.to !== 'string') return { bad: 'rec.to' };                     /* S7: لا مصفوفةَ تصير تاريخاً بـString() — والمخطّطُ يرفضها قبل هذا */
    if (open) return { bad: 'rec.to', msg: 'اختر تاريخَ نهايةٍ أو «حتى الإيقاف» — لا كليهما' };
    var tp = String(v.to).split('-');
    if (!METK_DAY_RX.test(String(v.to)) || +tp[1] < 1 || +tp[1] > 12 || +tp[2] < 1 || +tp[2] > 30) return { bad: 'rec.to', msg: 'تاريخُ نهاية التكرار غيرُ صالح' };
    if (tkDayNum(v.to) < tkDayNum(k)) return { bad: 'rec.to', msg: 'نهايةُ التكرار قبل بدايته' };
    if (tkDayNum(v.to) - tkDayNum(k) > TK_REC_Y) return { bad: 'rec.to', msg: 'التكرارُ ثلاثُ سنواتٍ هجرية على الأكثر — أو اختر «حتى الإيقاف»' };
    o.to = String(v.to);
  } else if (!open) {                                                          /* «حتى الإيقاف» (open) ⇒ لا to */
    if (keep) { if (keep.to) o.to = String(keep.to); }
    else { var p = String(k).split('-'); o.to = (+p[0] + 1) + '-' + (+p[1]) + '-' + (+p[2]); }   /* بلا نهايةٍ ولا «حتى الإيقاف» ⇒ سنةٌ هجرية (كما كان) */
  }
  return { rec: o };
}
/* KIVO_265 · البند 16: منتصفُ ليل (الرياض) يومٍ هجريّ k قرب الوقت near — قفزةٌ تقريبية (الشهرُ الهجري ≈ 29.53 يوماً) ثم تصحيحٌ يوماً يوماً؛ لا تحويلَ هجريّ⇐ميلاديّ
   في العامل فيُشتقّ من tkHij وحده. النتيجةُ ثابتةٌ لليوم الواحد فتُحفظ (TK_HMID) */
var TK_HMID = nmap();
function tkHijMid(k, near) {
  var kN = String(k).replace(/-0(\d)/g, '-$1'); if (TK_HMID[kN]) return TK_HMID[kN];
  var p = kN.split('-').map(Number), m = tkRiyMid(near), H = tkHij(m + 12 * 36e5), q; if (!H || p.length !== 3) return 0;
  m += Math.round((p[0] - H.y) * 354.37 + (p[1] - H.m) * 29.53 + (p[2] - H.d)) * 864e5;
  for (q = 0; q < 40; q++) { H = tkHij(m + 12 * 36e5); if (!H) return 0; if (H.k === kN) { TK_HMID[kN] = m; return m; } m += (tkDayNum(kN) > tkDayNum(H.k) ? 1 : -1) * 864e5; }
  return 0;
}
/* dMid: منتصفُ ليل اليوم المدنيّ الذي يومُه الهجريّ H (لـevery وآخرِ الشهر — البند 16) */
function tkRecDue(rec, H, wdi, dMid) {
  var n = tkDayNum(H.k); if (n < tkDayNum(rec.from)) return false; if (rec.to && n > tkDayNum(rec.to)) return false;
  if (rec.t === 'daily') return true;
  if (rec.t === 'days' || rec.t === 'weekly') return Array.isArray(rec.wd) && rec.wd.indexOf(wdi) !== -1;
  if (rec.t === 'monthly') {
    if (rec.md !== 'last') return H.d === rec.md;
    if (H.d === 30) return true; if (H.d !== 29 || typeof dMid !== 'number') return false;
    var H2 = tkHij(dMid + 36 * 36e5); return !!H2 && H2.m !== H.m;                     /* 29 آخرُ الشهر إن كان الغدُ في شهرٍ آخر */
  }
  if (rec.t === 'every') {
    if (!(rec.n >= 2) || typeof dMid !== 'number') return false;
    var fm = tkHijMid(rec.from, dMid); if (!fm) return false;
    var df = Math.round((dMid - fm) / 864e5); return df >= 0 && df % rec.n === 0;
  }
  return false;
}
/* السلاسلُ في المخزن: النموذجُ = أحدثُ نسخةٍ غيرِ منفصلة بأعلى إصدار · ومفاتيحُ عدم التكرار كلُّها */
function tkSeries(S) {
  var ser = nmap(), idem = nmap(), dk;
  for (dk in S) { if (!METK_DAY_RX.test(dk) || !Array.isArray(S[dk])) continue;
    S[dk].forEach(function (r) {
      var x = tkX(r); if (!x) return;
      if (typeof x.idem === 'string') idem[x.idem] = 1;
      if (!isObj(x.rec) || !x.rec.id) return;
      var id = String(x.rec.id), s = ser[id] || (ser[id] = { id: id, proto: null, pv: -1, ps: 0, any: null, av: -1, n: 0, pk: '', ak: '' }), v = +x.rec.ver || 0;
      s.n++;
      if (v > s.av) { s.av = v; s.any = r; s.ak = dk; }
      if (!x.det && (v > s.pv || (v === s.pv && (r[15] || 0) > s.ps))) { s.proto = r; s.pv = v; s.ps = r[15] || 0; s.pk = dk; }   /* pk: يومُ النموذج (S6) */
    }); }
  for (var id in ser) { var s0 = ser[id]; if (!s0.proto) { s0.proto = s0.any; s0.pk = s0.ak; } s0.rec = tkX(s0.proto).rec; }
  return { ser: ser, idem: idem };
}
function tkRiyMid(t) { return Math.floor((t + 3 * 36e5) / 864e5) * 864e5 - 3 * 36e5; }
/* KIVO_265 · S6 (مراجعةُ الخادم): منتصفُ ليل اليوم المدنيّ الذي يومُه الهجريّ dk — قريباً من الوقت s: يومُ الصفّ = يومُ بدايته ± يوم (071 kOk: حدودُ منتصف
   الليل والوردية الليلية). اليومُ الهجريّ هنا (أم القرى بتوقيت الرياض) يتبدّل عند منتصف الليل المدنيّ فيقابله يومٌ مدنيٌّ واحد */
function tkRecDayMid(dk, s) {
  var kN = String(dk).replace(/-0(\d)/g, '-$1'), m = tkRiyMid(s), q, D, H;
  for (q = 0; q < 3; q++) { D = m + [0, -864e5, 864e5][q]; H = tkHij(D + 12 * 36e5); if (H && H.k === kN) return D; }
  return m;
}
/* KIVO_265 · L-3: هويةُ المصدر لكتابات التكرار في التدقيق والأمن — توليدٌ آليّ (لا عنوانَ الموظف الذي فتح «ملفي» ولا جهازُه) */
var TK_REC_META = { ip: 'srv:recur', city: '', dev: 'srv:recur' };
var TK_REC_TOMB_D = 40;                                                      /* أيامُ سجل الخادم التي يُبحث فيها عن نُسخٍ وُلّدت ثم حُذفت (L-5) */
/* KIVO_265 · H-1 (ب): صاحبُ السلسلة من سجل الخادم لا من الصفّ وحده — حدثُ «أُنشئت» للسلسلة (rec بمعرّفها) أو لنموذجها (هويةُ كيانه) بهوية x.by.u نفسِها.
   سجلُّ التدقيق يكتب الخادمُ فيه هويةَ الفاعل من الجلسة (uid) — فلا يدّعي أحدٌ سلسلةً باسم غيره ولو حمل صفُّها اسمَه */
/* KIVO_265 · F-2/R-21 (RBAC_AUDIT_265): حدثُ «أُنشئت» للسلسلة بمعرّفها وحده — كان يكفي حدثُ «أُنشئت» لأيّ مهمةٍ للضحية بهوية كيان النموذج (tkEntId: العمودُ 22
   كما كتبه العميل · 070) فيُنسب نموذجٌ مزوَّر طابعُه طابعُ مهمةٍ لها إليها، ويكتب الخادمُ نُسخَه باسمها */
/* KIVO_265 · srvrec: وحدثُ «حُوِّلت إلى متكررة» (rec_start — tkRecurStart) للسلسلة بمعرّفها بهوية صاحبها كذلك: يكتبه الخادمُ بهوية الفاعل من الجلسة
   كـ«أُنشئت» حرفاً — فلا يُنسب إلى غير من حوّلها، وأحداثُ الإيقاف والتعديل (rec_pause · rec_edit …) لا تُثبت صاحباً */
/* KIVO_265 · S5 (مراجعةُ الخادم): ما كتبته مساراتُ الخادم وحدها (tkAud: المعرّفُ cid يبدأ بـ'tk') — حدثُ عميلٍ في حفظٍ خامّ (معرّفُه 'c…' — 290) لا يُثبت
   صاحباً ولا يُعدّ نسخةً محذوفة؛ والحفظُ الخامّ لا يكتب معرّفاً يبدأ بـ'tk' أصلاً (054 applySave يُسقطه) — فلا يُلغي أحدٌ موعداً بحدثٍ مزوَّر */
async function tkRecurAuthorOk(env, K, s0, au) {
  if (!/^[0-9a-z]{2,40}$/i.test(String(s0.id || ''))) return false;
  var r = await env.DB.prepare("SELECT 1 AS x FROM aud WHERE k = ?1 AND etype = 'task' AND act IN ('created', 'rec_start') AND uid = ?2 AND cid LIKE 'tk%' AND ctx LIKE ?3 LIMIT 1")
    .bind(K, au, '%"rec":"' + String(s0.id) + '"%').first();
  return !!r;
}
/* KIVO_265 · L-5: نسخةٌ وُلّدت ثم حذفها المسؤول لا تُولَّد من جديد — مفاتيحُ عدم التكرار من أحداث «أُنشئت» في سجل الخادم (idem) لا من الصفوف القائمة وحدها
   (srvrec: ونسخُ المهمة التي حُوِّلت إلى متكررة — rec_start بمفتاح نسختها) */
async function tkRecurTombs(env, K, now) {
  var o = nmap(), rs = await env.DB.prepare("SELECT ctx FROM aud WHERE k = ?1 AND etype = 'task' AND act IN ('created', 'rec_start') AND cid LIKE 'tk%' AND ts >= ?2 AND ctx LIKE '%\"idem\":\"r:%'").bind(K, now - TK_REC_TOMB_D * 864e5).all();
  ((rs && rs.results) || []).forEach(function (q) { var c = parseJson(q.ctx, null); if (isObj(c) && typeof c.idem === 'string') o[c.idem] = 1; });
  return o;
}
async function tkRecurRun(env, request, d, opts) {
  var K = tkK(d), now = Date.now(), rep = { created: 0, skipped: [], denied: [], series: 0 };
  var S = parseJson(await kvGet(env, 'kv', K), {}); if (!isObj(S)) return rep;
  var Z = tkSeries(S), ids = Object.keys(Z.ser); rep.series = ids.length; if (!ids.length) return rep;
  /* KIVO_265 · M-1: لا تفصيلَ دائماً (كان C.detail = true) — التفصيلُ بقاعدة الأهلية نفسِها (072 tkEligCtx): لفاعلِ الطلب الصريح إن قرأ الجدولَ الشهري
     (tkRecurRoute يمرّره في opts.A) · والتوليدُ الكسول من «ملفي» بلا فاعل ⇒ مجرّد. والتنبيهُ المخزَّن (يقرؤه أعضاءُ الإدارة كلُّهم) بالحكم المجرّد (gen) دائماً */
  var C = await tkEligCtx(env, opts && opts.A ? opts.A : null, d);
  var tomb = await tkRecurTombs(env, K, now), tq; for (tq in tomb) Z.idem[tq] = 1;
  var mid0 = tkRiyMid(now - 3 * 36e5), plan = nmap(), n = 0, lockC = nmap();         /* plan[authorUid] = [{k, row, idem, author}] */
  var LK = parseJson(await kvGet(env, 'kv', 'bsdept:' + d + ':bassam_tasks_locks_v1'), {}); if (!isObj(LK)) LK = {};
  for (var q = 0; q < ids.length && n < TK_REC_MAX; q++) {
    var s0 = Z.ser[ids[q]], rec = s0.rec, P = s0.proto, x0 = tkX(P) || {};
    if (!rec || rec.paused || rec.stop || !Array.isArray(rec.asg) || !rec.asg.length || !P[15] || !P[16]) continue;   /* srvrec: المنتهيةُ (stop) لا تُولَّد */
    var by0 = isObj(rec.by) && rec.by.u ? rec.by : x0.by;                              /* srvrec: صاحبُ السلسلة المحوَّلة من حوّلها (rec.by) */
    var au = isObj(by0) ? String(by0.u || '') : '';
    if (!au) { rep.denied.push({ id: s0.id, why: 'بلا صاحبٍ معروف' }); continue; }
    if (!(await tkRecurAuthorOk(env, K, s0, au))) { rep.denied.push({ id: s0.id, why: 'صاحبُ السلسلة لا يطابق سجلَّ إنشائها في الخادم' }); logEv('warn', 'tk-recur-author', { rid: env.__rid, d: d, rec: String(s0.id).slice(0, 40) }); continue; }
    /* S6: موعدُ اليوم d = منتصفُ ليله + بُعدُ بداية النموذج عن منتصف ليل يومه (لا عن يوم بدايته): الصفُّ العاديّ كما كان (دقائقُ يومه) · والوردية الليلية
       (يومُ الصفّ k وبدايتُه فجرَ k+1 — 071 kOk) تبقى في يومها التالي لكل موعد — كانت نسخةُ k+1 تقع على بداية نسخة k نفسِها (نسختان في الوقت ذاته) */
    var off = Math.floor((P[15] - tkRecDayMid(s0.pk, P[15])) / 6e4) * 6e4, dur = Math.max(6e4, P[16] - P[15]);
    for (var i = 0; i < TK_REC_H && n < TK_REC_MAX; i++) {
      var D0 = mid0 + i * 864e5, H = tkHij(D0 + 12 * 36e5), wdi = tkWdOf(D0 + 12 * 36e5); if (!H) continue;
      if (!tkRecDue(rec, H, wdi, D0)) continue;
      if (LK[H.ym] === true || LK[H.ym] === 1) { if (!lockC[s0.id + H.ym]) { lockC[s0.id + H.ym] = 1; rep.skipped.push({ id: s0.id, k: H.k, ekey: '', why: 'شهرُ ' + H.ym + ' معتمدٌ ومقفل' }); } continue; }
      if (LK[H.k] === true) { rep.skipped.push({ id: s0.id, k: H.k, ekey: '', why: 'اليومُ ' + H.k + ' مُغلق' }); continue; }   /* KIVO_265 · قفلُ اليوم: المُغلق بيده لا تُولَّد فيه نسخ */
      var s = D0 + off, e = s + dur;
      if (e < now) continue;                                                           /* موعدٌ انقضى اليوم لا يُولَّد بأثرٍ رجعي */
      for (var j = 0; j < rec.asg.length && n < TK_REC_MAX; j++) {
        var ek = String(rec.asg[j]), idem = 'r:' + s0.id + ':' + H.k + ':' + ek;
        if (Z.idem[idem]) continue;
        var emp = tkEmpByEid(C.emps, ek); if (!emp) { rep.skipped.push({ id: s0.id, k: H.k, ekey: ek, why: tkEidShared(C.emps, ek) ? TK_EID_DUP : 'ليس في سجل الإدارة' }); continue; }
        var el = tkEligOne(C, ek, s, e, 'ok');
        /* gen: الحكمُ المجرّد للتنبيه المخزَّن (يقرؤه أعضاءُ الإدارة كلُّهم) ولمن لا يقرأ الجدول — M-1، والمراجعةُ الموحّدة (R-9): ولحالة الحساب كذلك
           (كان «بلا حسابِ مستخدمٍ نشط» يكشف حالةَ حساب الزميل) — والسببُ في why لمن يقرأ الجدول وفي «فحص الأهلية» للمسؤول */
        if (el.result === TK_EL_NO) { rep.skipped.push({ id: s0.id, k: H.k, ekey: ek, why: el.why, gen: 'غيرُ متاحٍ في موعد التنفيذ', code: el.code, author: au, t: String(P[0] || ''), name: String(emp.name || ''), idem: idem }); continue; }
        var grp = rec.asg.length > 1 ? 'g' + s0.id + '_' + H.k.replace(/-/g, '') : null;
        var x = { v: 2, by: by0, pol: x0.pol || { m: 'any' }, rv: Object.prototype.hasOwnProperty.call(x0, 'rv') ? x0.rv : null, dec: x0.dec === 0 ? 0 : 1, rec: rec, idem: idem, elig: { res: el.result, code: el.code, at: now } };
        if (x0.needs) x.needs = x0.needs; if (isObj(x0.win)) x.win = x0.win;   /* KIVO_265: نافذةُ التنفيذ مع كل نسخةٍ من السلسلة */
        var row = [P[0], P[1], P[2] || 'normal', 'pending', P[4] || 'normal', P[5] || 'مضافة', null, [String(emp.name || '؟').charAt(0)], String(emp.name || ''), P[9], Math.round(dur / 6e4),
          null, null, 0, ek, s, e, grp, grp ? (P[18] || (rec.asg.length + ' موظفين')) : null, null, null, null, null, x];
        (plan[au] = plan[au] || []).push({ k: H.k, row: row, idem: idem, id: s0.id, ver: +rec.ver || 0, H: H, wd: wdi, D0: D0 });
        Z.idem[idem] = 1; n++;
      }
    }
  }
  var authors = Object.keys(plan);
  for (var a = 0; a < authors.length; a++) {
    var Aa = tkSrvMark(await actorOf(env, authors[a]));                              /* KIVO_265 · H-1: كتابةُ الخادم (العمود 23) باسم صاحبٍ تحقّق منه سجلُّ الخادم */
    if (!Aa) { rep.denied.push({ author: authors[a], why: 'صاحبُ القالب لم يعد حساباً قائماً', n: plan[authors[a]].length }); continue; }
    /* KIVO_265 · S4 (مراجعةُ الخادم): النسخةُ المولَّدة مسندةٌ إلى موظف — فصلاحيتا الإنشاء والإسناد معاً كالإنشاء بمكلَّفين (071 tkCreate) والتحويل (start);
       كان الحفظُ المركزي يحكم الإنشاءَ وحده فيظلّ من فقد الإسنادَ يُسند عملاً كل يوم عبر سلسلته */
    if (!(tkHeld(Aa, d, 'task.create') && tkHeld(Aa, d, 'task.assign'))) { rep.denied.push({ author: authors[a], why: 'صاحبُ القالب لا يملك صلاحيةَ الإنشاء والإسناد الآن', n: plan[authors[a]].length }); continue; }
    var made = [];
    var R = await tkSave(env, request, Aa, K, function (Sx) {
      var Z2 = tkSeries(Sx), used = tkIdsUsed(Sx), S2 = Object.assign({}, Sx), aud = [], T2 = tkToday(Date.now()); made = [];
      plan[authors[a]].forEach(function (p) {
        if (Z2.idem[p.idem]) return;                                                   /* كتبه غيرُنا بين القراءة والكتابة — لا تكرار */
        /* KIVO_265 · S1 (مراجعةُ الخادم): الخطةُ بُنيت من قراءةٍ سبقت انتظاراتٍ كثيرة (الأهلية · السجلّ · الأقفال · صاحبُ كل سلسلة) — إيقافٌ أو إنهاءٌ أو تعديلٌ
           حُفظ بينها كان يُكتب بعده نُسخٌ بالقاعدة القديمة. الآن كلُّ موعدٍ يُعاد الحكمُ فيه على السلسلة الطازجة: هي نفسُها بالإصدار نفسِه · غيرُ موقوفة ولا
           منتهية · وما زال موعداً — وإلا لا يُكتب (والتشغيلُ التالي يبني بالقاعدة الجديدة) */
        var z = Z2.ser[p.id], q2 = z && isObj(z.rec) ? z.rec : null;
        if (!q2 || (+q2.ver || 0) !== p.ver || q2.paused || q2.stop || tkRecEnded(q2, T2) || !tkRecDue(q2, p.H, p.wd, p.D0)) return;
        var r = p.row.slice(); r[13] = tkNewId(used, now); r[TK_STAMP] = tkEntId(r);
        S2[p.k] = (Array.isArray(S2[p.k]) ? S2[p.k] : []).concat([r]); Z2.idem[p.idem] = 1; made.push({ k: p.k, r: r });
        /* KIVO_265 · L-3: «ولّدها الخادم» صراحةً (sys · السلسلة · مفتاحُ النسخة) — الفاعلُ صاحبُ السلسلة والمصدرُ هويةُ الخادم (TK_REC_META) لا جهازُ من فتح «ملفي» */
        aud.push(tkAud(K, r, 'created', { day: p.k, via: 'recur', sys: 1, rec: tkX(r).rec.id, idem: p.idem }, null, { asg: r[8], s: r[15], e: r[16] }));
      });
      if (!made.length) return { noop: 1 };
      return { S2: S2, aud: aud };
    }, TK_REC_META);
    if (R.err) { var st = R.err && typeof R.err.status === 'number' ? R.err.status : 0; rep.denied.push({ author: authors[a], why: st === 403 ? 'صاحبُ القالب لا يملك صلاحيةَ الإنشاء الآن' : 'تعذّر الحفظ', n: plan[authors[a]].length }); continue; }
    if (R.noop) continue;
    rep.created += made.length;
    await tkNotify(env, request, Aa, d, made.map(function (m) { return { type: 'task_new', own: [String(m.r[14])], vars: { 'المهمة': m.r[0], 'الوقت': tkClock(m.r[16]) } }; }), TK_REC_META);
  }
  /* «غير متاح» يومَ الموعد: يُبلَّغ صاحبُ القالب مرةً لكل نسخة (seen) — ويُعاد الحكمُ في التشغيل التالي.
     KIVO_265 · M-1: نصُّ التنبيه المخزَّن مجرّدٌ («غيرُ متاحٍ في موعد التنفيذ») — مخزنُ تنبيهات الإدارة يقرؤه أعضاؤها كلُّهم، والسببُ التفصيليّ
     (راحةٌ أسبوعية · نوعُ الإجازة · غيابٌ بتقرير اليوم) لمن يقرأ الجدولَ الشهري وحده: من «فحص الأهلية» في صفحة المهام أو ردِّ «التوليد» له (tkRecurRoute) */
  var byAu = nmap(); rep.skipped.forEach(function (s1) { if (s1.author && s1.idem) (byAu[s1.author] = byAu[s1.author] || []).push(s1); });
  for (var au2 in byAu) {
    var Ab = await actorOf(env, au2); if (!Ab) continue;
    await tkNotify(env, request, Ab, d, byAu[au2].slice(0, 20).map(function (s1) { return { type: 'task_chg', own: [String(Ab.u.ekey || Ab.u.id)], once: 'rsk:' + s1.idem, vars: { 'الفعل': 'لم تُولَّد', 'المهمة': s1.t, 'التفصيل': s1.name + ' — ' + s1.gen + ' يوم ' + s1.k } }; }), TK_REC_META);
  }
  rep.skipped = rep.skipped.map(function (s1) { return { id: s1.id, k: s1.k, ekey: s1.ekey, why: s1.why, gen: s1.gen || s1.why }; });
  return rep;
}
async function tkRecurLazy(env, request, d, seen) {
  if (!(await tkGateTake(env, 'rec', d, TK_REC_GAP, TK_REC_LAST, seen))) return null;   /* الفحصُ العميق · R8: الحارسُ المشترك بين العزلات (074) */
  return await tkRecurRun(env, request, d, null);
}
async function tkRecurRoute(env, request, A, url, b) {
  var D0 = tkDeptOf(A, url.searchParams.get('dept') || (b && b.dept)); if (D0.err) return D0.err; var d = D0.d;
  if (!(A.u.role === 'super' || canRead(A, tkK(d)))) return tkNo(403, 'forbidden').err;
  var day = String(url.searchParams.get('day') || ''), T = tkToday(Date.now());
  if (day && (!T || day.replace(/-0(\d)/g, '-$1') !== T.k)) return tkNo(400, 'bad-query', 'التوليدُ لليوم الجاري وما بعده وحده', { at: 'day' }).err;
  TK_REC_LAST[d] = Date.now();
  var rep = await tkRecurRun(env, request, d, { A: A });
  var due = null; if (typeof tkDueRun === 'function') { TK_DUE_LAST[d] = Date.now(); try { due = await tkDueRun(env, request, d); } catch (eD) { swallow('tk-due', eD); } }   /* KIVO_265 · البند 10 (074) */
  if (typeof tkGateStamp === 'function') await tkGateStamp(env, typeof tkDueRun === 'function' ? ['rec', 'due'] : ['rec'], d, Date.now());   /* الفحصُ العميق · R8: جرى الآن ⇒ لا يعيده «ملفي» في عزلةٍ أخرى قبل مهلته */
  /* KIVO_265 · M-1: السببُ التفصيليّ لمن يقرأ الجدولَ الشهري وحده (كتَفصيل الأهلية في 072 tkEligCtx) — ولغيره الحكمُ المجرّد (دفاعٌ ثانٍ فوق tkEligCtx) */
  var sched = A.u.role === 'super' || canRead(A, 'bsdept:' + d + ':bassam_staffing_v3');
  var sk = rep.skipped.map(function (s1) { return { id: s1.id, k: s1.k, ekey: s1.ekey, why: sched ? s1.why : s1.gen }; });
  return json({ ok: 1, created: rep.created, skipped: sk, denied: rep.denied, series: rep.series, due: due });
}
/* ── KIVO_265 · srvrec: إدارةُ السلسلة (POST /api/tasks/recur) ──
   سلسلةٌ منتهية: أُنهيت (stop) أو مضت نهايتُها — لا يُستأنف منها شيء */
var TK_REC_OPS = ['pause', 'resume', 'stop', 'edit', 'start'];
function tkRecEnded(rec, T) { return !!(rec && (rec.stop || (rec.to && T && tkDayNum(rec.to) < tkDayNum(T.k)))); }
function tkRecLk(LK, dk) { var v = LK[tkYm(dk)]; return v === true || v === 1; }
/* القاعدةُ للتدقيق (قبل · بعد) — بلا معرّفاتِ المكلَّفين */
function tkRecSum(rec) { var o = { t: String(rec.t || '') }; if (rec.wd) o.wd = rec.wd; if (rec.md) o.md = rec.md; if (rec.n) o.n = rec.n; o.to = rec.to ? String(rec.to) : ''; if (rec.paused) o.paused = 1; if (rec.stop) o.stop = 1; return o; }
/* نسخةٌ قائمة يومُها dk: أهي موعدٌ بالقاعدة rec؟ — بيومها الهجريّ ويوم أسبوعه كما يولّدها tkRecurRun (بلا وقتٍ ⇒ تُعدّ موعداً فلا تُلغى).
   S6: يومُ الصفّ dk لا يومُ بدايته (الوردية الليلية تبدأ فجرَ اليوم التالي) — والصفُّ العاديّ يومُه يومُ بدايته فالحكمُ كما كان */
function tkRecRowDue(rec, dk, r) {
  if (typeof r[15] !== 'number') return true;
  var D = tkRecDayMid(dk, r[15]) + 12 * 36e5, H = tkHij(D); if (!H) return true;
  return tkRecDue(rec, { k: dk, d: H.d, m: H.m }, tkWdOf(D), D - 12 * 36e5);
}
/* KIVO_265 · S8 (مراجعةُ الخادم): سلسلةٌ أنهاها الإصدارُ السابق (to = يومُ الإنهاء بلا rec.stop) — يدلّ عليها حدثُ rec_stop كتبه الخادم (cid 'tk…' · S5)
   فتُعدّ منتهيةً كـrec.stop: كان تعديلُها يومَ إنهائها يُحييها «حتى الإيقاف» ونُسخُها القادمة ملغاةٌ بالإنهاء */
async function tkRecStopEv(env, K, id) {
  if (!/^[0-9a-z]{2,40}$/i.test(String(id || ''))) return false;
  var r = await env.DB.prepare("SELECT 1 AS x FROM aud WHERE k = ?1 AND etype = 'task' AND act = 'rec_stop' AND cid LIKE 'tk%' AND ctx LIKE ?2 LIMIT 1").bind(K, '%"rec":"' + String(id) + '"%').first();
  return !!r;
}
var TK_REC_LKMSG = 'كلُّ مواعيد هذه السلسلة في شهرٍ معتمد مقفل — يمكن إيقافها أو تعديلها عند ظهور موعدها القادم (قبل استحقاقه بشهر)، أو بعد فتح الشهر';   /* البند 15: الأفقُ 30 يوماً */
async function tkRecurOp(env, request, A, b) {
  var D0 = tkDeptOf(A, b.dept); if (D0.err) return D0.err; var d = D0.d, K = tkK(d);
  if (TK_REC_OPS.indexOf(b.op) === -1) return tkNo(400, 'bad-body', '', { at: 'op' }).err;
  if (b.op === 'start') return await tkRecurStart(env, request, A, b, d, K);
  if (!tkStrOk(b.id, 40, true)) return tkNo(400, 'bad-body', '', { at: 'id' }).err;
  /* KIVO_265 · U1: stop {k, row} — نسخةُ هذا اليوم من السلسلة (العمود 13) تبقى آخرَ موعدٍ لها فلا تُلغى بالإنهاء (نموذجُ «المهام»: «لمرة واحدة» لنسخةٍ قادمة) */
  if (b.row != null) {
    if (b.op !== 'stop' || !tkStrOk(b.row, 40, true)) return tkNo(400, 'bad-body', '', { at: 'row' }).err;
    if (!METK_DAY_RX.test(String(b.k || ''))) return tkNo(400, 'bad-body', '', { at: 'k' }).err;
  }
  var T = tkToday(Date.now()); if (!T) return tkNo(409, 'state', 'تعذّر حسابُ اليوم').err;
  if (b.op === 'edit') {                                                             /* الشكلُ قبل الصلاحية (كالإنشاء) — والحدودُ ببداية السلسلة داخل الحفظ */
    if (!isObj(b.rec)) return tkNo(400, 'bad-body', 'حدّد قاعدةَ التكرار', { at: 'rec' }).err;
    var RC0 = tkRecIn(b.rec, T.k, {}); if (RC0.bad) return tkNo(400, 'bad-body', RC0.msg || '', { at: RC0.bad }).err;
  } else if (b.rec != null) return tkNo(400, 'bad-body', '', { at: 'rec' }).err;
  if (!tkHeld(A, d, 'task.edit')) return tkNo(403, 'denied', 'إدارةُ التكرار تحتاج صلاحية تعديل المهام').err;
  var LK = parseJson(await kvGet(env, 'kv', 'bsdept:' + d + ':bassam_tasks_locks_v1'), {}); if (!isObj(LK)) LK = {};
  var out = { n: 0, cancelled: 0, ver: 0, restored: 0, kept: 0 }, id = String(b.id), n0 = tkDayNum(T.k), stopEv = await tkRecStopEv(env, K, id);
  var keepK = b.row != null ? String(b.k).replace(/-0(\d)/g, '-$1') : '', keepR = b.row != null ? String(b.row) : '';
  var R = await tkSave(env, request, A, K, function (S) {
    var Z = tkSeries(S), s0 = Z.ser[id]; out = { n: 0, cancelled: 0, ver: 0, restored: 0, kept: 0 };
    if (!s0) return tkNo(404, 'not-found');
    var rec0 = isObj(s0.rec) ? s0.rec : {}, now = Date.now(), ver = Math.max(+s0.av || 0, +rec0.ver || 0) + 1, stp = !!rec0.stop || stopEv;
    if ((stp || tkRecEnded(rec0, T)) && !(b.op === 'stop' && !stp)) return tkNo(409, 'rec-ended', 'انتهت سلسلةُ التكرار — لا تُستأنف ولا تُعدَّل (أنشئ سلسلةً جديدة)');
    var nr = Object.assign({}, rec0, { ver: ver });
    if (b.op === 'pause') nr.paused = 1;
    else if (b.op === 'resume') nr.paused = 0;
    else if (b.op === 'stop') { nr.stop = 1; if (!(rec0.to && tkDayNum(rec0.to) < n0)) nr.to = T.k; }   /* النهايةُ لا تتقدّم: أقربُهما */
    else {
      var kk = rec0.from && tkDayNum(rec0.from) > n0 ? String(rec0.from) : T.k, RC = tkRecIn(b.rec, kk, rec0.to ? { to: rec0.to } : {});
      if (RC.bad) return tkNo(400, 'bad-body', RC.msg || '', { at: RC.bad });
      delete nr.wd; delete nr.md; delete nr.n; delete nr.to; nr.t = RC.rec.t;          /* البدايةُ والمكلَّفون والإيقافُ المؤقت كما هي */
      if (RC.rec.wd) nr.wd = RC.rec.wd; if (RC.rec.md) nr.md = RC.rec.md; if (RC.rec.n) nr.n = RC.rec.n; if (RC.rec.to) nr.to = RC.rec.to;
    }
    var S2 = Object.assign({}, S), aud = [], hit = null, who = tkWhoN(tkWho(A)), why = b.op === 'stop' ? 'أُنهي التكرار' : 'عُدّل التكرار';
    /* m: 0 القاعدةُ وحدها · 1 إلغاء · 2 إعادةُ نسخةٍ ألغاها تعديلٌ سابق (S2)
       KIVO_265 · S9 (مراجعةُ الخادم): لكل نسخةٍ أُلغيت حدثُها «أُلغيت» بسببه على هويتها (كإلغاء المسؤول 071 tkCancel) — فيراه صاحبُها في «سجل المهمة»؛
       كان حدثٌ مجمَّعٌ واحد على أوّل صفٍّ مكتوب لا يراه غيرُ صاحبه. ولا تنبيهَ (كما كان) */
    var put = function (dk, i, m) {
      if (S2[dk] === S[dk]) S2[dk] = S[dk].slice();
      var r = S[dk][i], r1 = tkRowCols(tkPad(r)), x0 = tkX(r) || {}, x1 = Object.assign({}, x0); x1.rec = nr;
      if (m === 1) {
        var S0 = tkState(r, now);
        x1.asg = 'cancelled'; x1.can = { at: now, by: who, why: why }; if (b.op === 'edit') x1.can.rec = 1;   /* S2: إلغاءٌ بتعديل القاعدة — وسمُ الخادم (العمود 23) */
        out.cancelled++;
        aud.push(tkAud(K, r, 'cancelled', { day: dk, via: 'srv', rec: id, why: why }, { asg: S0.asg, exe: S0.exe }, { asg: 'cancelled', why: why }));
      } else if (m === 2) {
        tkXPush(x1, 'canh', x0.can); delete x1.asg; delete x1.can; out.restored++;     /* الإلغاءُ السابق في سجلّ الصفّ (canh) لا يُمحى */
        aud.push(tkAud(K, r, 'rec_edit', { day: dk, via: 'srv', rec: id, ver: ver, restored: 1 }, { asg: 'cancelled' }, { asg: 'assigned', why: 'أُعيدت بتعديل التكرار' }));
      }
      r1[TK_X] = x1; S2[dk][i] = r1; out.n++; hit = hit || r1;
    };
    /* اليومُ وما بعده في الأشهر المفتوحة وحدها — والسابقةُ وما في شهرٍ مقفل كما هي (سجلُّها وإثباتُها). المرشَّحُ للنموذج إن لم تُكتب نسخةٌ قادمة:
       أحدثُ نسخةٍ سابقة في شهرٍ مفتوح بترتيب tkSeries (غيرُ المنفصلة أولاً) */
    var dk, i, anyN = false, wN = 0, wD = 0, cN = null, cD = null, keepG = '';
    /* «لمرة واحدة» لمهمةٍ جماعية: يبقى صفُّ كلِّ عضوٍ في مجموعة الصفّ المعدَّل يومَها (r[17]) — لا صفُّ المرساة وحده */
    if (keepK) for (dk in S) { if (!Array.isArray(S[dk]) || dk.replace(/-0(\d)/g, '-$1') !== keepK) continue;
      S[dk].forEach(function (r) { var x = tkX(r); if (!keepG && x && isObj(x.rec) && String(x.rec.id) === id && String(r[13]) === keepR && r[17]) keepG = String(r[17]); }); }
    for (dk in S) { if (!METK_DAY_RX.test(dk) || !Array.isArray(S[dk])) continue;
      var lk = tkRecLk(LK, dk), dn = tkDayNum(dk), keepD = keepK && dk.replace(/-0(\d)/g, '-$1') === keepK;
      for (i = 0; i < S[dk].length; i++) {
        var r = S[dk][i], x = tkX(r); if (!x || !isObj(x.rec) || String(x.rec.id) !== id) continue;
        var kp = keepD && (String(r[13]) === keepR || (!!keepG && String(r[17] || '') === keepG)); if (kp) out.kept = 1;
        if (!x.det) anyN = true;
        if (lk) continue;
        if (dn >= n0) {
          var open = dn > n0 && r[3] === 'pending' && !r[11];
          var cancel = open && !x.asg && !kp && (b.op === 'stop' || (b.op === 'edit' && !tkRecRowDue(nr, dk, r)));
          /* KIVO_265 · S2 (مراجعةُ الخادم): تضييقٌ ثم توسيع — النسخةُ القادمة المعلّقة غيرُ المبدوءة التي ألغاها تعديلٌ سابقٌ لهذه السلسلة (can.rec) وصارت
             موعداً بالقاعدة الجديدة تعود (مفتاحُها idem باقٍ فلا يولِّد لها التوليدُ نسخةً ثانية — وكانت تبقى ملغاةً فلا نسخةَ حيّةً ليومها). إلغاءُ الإنهاء
             وإلغاءُ المسؤول لا يعودان أبداً */
          var back = b.op === 'edit' && open && x.asg === 'cancelled' && isObj(x.can) && x.can.rec === 1 && tkRecRowDue(nr, dk, r);
          put(dk, i, cancel ? 1 : back ? 2 : 0); if (x.det) wD++; else wN++;
        } else {
          var c = { dk: dk, i: i, v: +x.rec.ver || 0, s: r[15] || 0 }, cur = x.det ? cD : cN;
          if (!cur || c.v > cur.v || (c.v === cur.v && c.s > cur.s)) { if (x.det) cD = c; else cN = c; }
        }
      }
    }
    /* KIVO_265 · S3 (قرارُ المالك: لا تجاوزَ لقفل الشهر): لا نسخةَ في شهرٍ مفتوح تحمل القاعدة ⇒ 409 month-locked برسالةٍ تقول ما العمل */
    if (anyN ? !wN : !wD) { var cc = anyN ? cN : cD; if (!cc) return tkNo(409, 'month-locked', TK_REC_LKMSG); put(cc.dk, cc.i, 0); }
    var Z2 = tkSeries(S2); if (!Z2.ser[id] || (+Z2.ser[id].rec.ver || 0) !== ver) return tkNo(409, 'month-locked', TK_REC_LKMSG);
    out.ver = ver;
    var ctx = { via: 'srv', rec: id, ver: ver };
    if (b.op === 'edit' || b.op === 'stop') { ctx.before = tkRecSum(rec0); ctx.after = tkRecSum(nr); }
    if (out.kept) ctx.keep = { k: keepK, row: keepR };
    var agg = Object.assign(b.op === 'edit' ? tkRecSum(nr) : {}, { n: out.n, cancelled: out.cancelled }); if (out.restored) agg.restored = out.restored;
    aud.unshift(tkAud(K, hit, 'rec_' + b.op, ctx, b.op === 'edit' ? tkRecSum(rec0) : null, agg));   /* الحدثُ المجمَّع أولاً (سقفُ 052 audClean) */
    return { S2: S2, aud: aud };
  });
  if (R.err) return R.err;
  if (typeof tkGateReset === 'function') await tkGateReset(env, 'rec', d);   /* الفحصُ العميق · R8: تغيّرت السلسلة ⇒ القراءةُ التالية في «ملفي» تولّد (لا تنتظر مهلة الحارس) */
  return json({ ok: 1, rev: R.rev, n: out.n, cancelled: out.cancelled, ver: out.ver, restored: out.restored, kept: out.kept });
}
/* ── KIVO_265 · srvrec: POST /api/tasks/recur {op:'start', k, id | grp, rec} — مهمةٌ مسندةٌ لمرةٍ واحدة (أو مهمةٌ جماعية بصفوفها في يومها) تصير
   نسخةَ يوم البدء الحقيقية لسلسلة: x.rec (معرّفٌ جديد · ver 1 · from = k · asg = مكلَّفوها · by = من حوّلها) وx.idem لكل صفّ بصيغة الإنشاء نفسِها ·
   وحدثُ rec_start لكل صفّ (rec · idem — يثبت به صاحبَها tkRecurAuthorOk ولا يُعيد tkRecurTombs نسخةً حُذفت). الصلاحيات: إنشاءُ المهام وتعديلُها وإسنادُها ·
   لا لملغاةٍ ولا لمُعاد إسنادها ولا لنسخةٍ منفصلة ولا لما في سلسلةٍ أصلاً ولا في شهرٍ معتمد — وما سواها من الصفّ (الحالة · 20 · 21) كما هو */
async function tkRecurStart(env, request, A, b, d, K) {
  if (!METK_DAY_RX.test(String(b.k || ''))) return tkNo(400, 'bad-body', '', { at: 'k' }).err;
  if (b.grp != null ? !tkStrOk(b.grp, 60, true) : !tkIdOk(b.id)) return tkNo(400, 'bad-body', '', { at: b.grp != null ? 'grp' : 'id' }).err;
  if (!isObj(b.rec)) return tkNo(400, 'bad-body', 'حدّد قاعدةَ التكرار', { at: 'rec' }).err;
  var RC = tkRecIn(b.rec, b.k); if (RC.bad) return tkNo(400, 'bad-body', RC.msg || '', { at: RC.bad }).err;
  if (!(tkHeld(A, d, 'task.create') && tkHeld(A, d, 'task.edit') && tkHeld(A, d, 'task.assign'))) return tkNo(403, 'denied', 'تحويلُ المهمة إلى متكررة يحتاج صلاحياتِ إنشاء المهام وتعديلها وإسنادها').err;
  if (await tkLocked(env, d, tkYm(b.k))) return tkNo(409, 'locked', 'شهرُ المهمة معتمدٌ ومقفل').err;
  var emps = tkEmps(await kvGet(env, 'kv', 'bsdept:' + d + ':bassam_employees_v1')), kN = String(b.k).replace(/-0(\d)/g, '-$1');
  var pick = function (L) {
    if (b.grp != null) { var o = []; for (var q = 0; q < L.length; q++) if (Array.isArray(L[q]) && String(L[q][17] || '') === String(b.grp)) o.push(q); return o; }
    var P0 = tkPick({ x: L }, 'x', b.id, null); return P0 ? [P0.idx] : [];
  };
  var out = null;
  var R = await tkSave(env, request, A, K, function (S) {
    var L = Array.isArray(S[b.k]) ? S[b.k] : [], ix = pick(L), now = Date.now(), rows = [], asg = [], q;
    if (!ix.length) return tkNo(404, 'not-found');
    for (q = 0; q < ix.length; q++) {
      var r0 = L[ix[q]], S0 = tkState(r0, now), x0 = tkX(r0) || {}, ek = r0[14] == null ? '' : String(r0[14]);
      if (S0.asg === 'cancelled' || S0.asg === 'reassigned') { if (b.grp == null) return tkNo(409, 'state', 'المهمة ملغاةٌ أو أُعيد إسنادُها', { asg: S0.asg }); continue; }
      if (x0.det || isObj(x0.rec)) return tkNo(409, 'state', 'المهمة ضمن سلسلة تكرارٍ أصلاً');
      if (b.grp == null && r0[17]) return tkNo(409, 'state', 'مهمةٌ جماعية — حوِّلها كلَّها بمعرّف مجموعتها (grp)');
      if (!ek) return tkNo(409, 'state', 'المهمة غيرُ مسندة — التكرارُ لمهمةٍ مسندةٍ إلى موظف');
      if (!tkEmpByEid(emps, ek)) return tkNo(400, 'asg', tkEidShared(emps, ek) ? TK_EID_DUP : 'المكلَّفُ غيرُ معروفٍ بمعرّفه الثابت في سجل الإدارة — اربط الصفَّ أولاً', { at: ek });
      if (!(typeof r0[15] === 'number' && typeof r0[16] === 'number' && r0[16] > r0[15])) return tkNo(409, 'state', 'المهمة بلا وقتِ بدايةٍ ونهاية');
      if (asg.indexOf(ek) !== -1) return tkNo(409, 'dup', 'المكلَّفُ نفسُه في صفّين من المجموعة');
      rows.push(ix[q]); asg.push(ek);
    }
    if (!rows.length) return tkNo(409, 'state', 'صفوفُ المجموعة ملغاةٌ أو أُعيد إسنادُها', {});
    var recId = 'r' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36), who = tkWho(A), aud = [], L2 = L.slice();
    var rec = Object.assign({}, RC.rec, { id: recId, ver: 1, from: kN, paused: 0, asg: asg.slice(), by: who });
    rows.forEach(function (i) {
      var r1 = tkRowCols(tkPad(L[i])), x = Object.assign({ v: 2 }, tkX(L[i]) || {});
      if (!x.by) x.by = who;                                                          /* صفٌّ قديمٌ بلا x: صاحبُ التحويل منشئُ إعداداتها */
      x.rec = rec; x.idem = 'r:' + recId + ':' + kN + ':' + String(L[i][14]);
      r1[TK_X] = x; if (!(typeof r1[TK_STAMP] === 'string' && r1[TK_STAMP])) r1[TK_STAMP] = tkEntId(L[i]);
      L2[i] = r1;
      aud.push(tkAud(K, r1, 'rec_start', { day: b.k, via: 'srv', rec: recId, idem: x.idem }, null, Object.assign(tkRecSum(rec), { asg: String(r1[8] || '') })));
    });
    var S2 = Object.assign({}, S); S2[b.k] = L2;
    out = { rec: rec, n: rows.length };
    return { S2: S2, aud: aud };
  });
  if (R.err) return R.err;
  if (typeof tkGateReset === 'function') await tkGateReset(env, 'rec', d);   /* الفحصُ العميق · R8: سلسلةٌ جديدة ⇒ القراءةُ التالية تولّد */
  var rc = out.rec, o = { id: rc.id, ver: rc.ver, t: rc.t, from: rc.from, paused: 0, asg: rc.asg };
  if (rc.wd) o.wd = rc.wd; if (rc.md) o.md = rc.md; if (rc.n) o.n = rc.n; if (rc.to) o.to = rc.to;
  return json({ ok: 1, rev: R.rev, n: out.n, rec: o });
}
