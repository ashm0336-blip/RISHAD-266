/* ═══ KIVO_264 · KIVO-Tasks — «ملفي ← مهامي»: قراءةُ الموظف لمهامه هو وحده، ودورةُ حياتها من جهته، من الخادم ═══
   العطلُ الإنتاجي P0 (مثبتٌ على عامل 242 القديم وعلى 263 بالوضعين — tests/unit/tasks_p0_selfread.test.mjs):
     مخزنُ المهام bsdept:<d>:bassam_tasks_v1 لا يُقرأ إلا بورقة tasks:view (= task.view) — 050 RD_REG · 061 readBindings — فالموظفُ العاديّ
     (بلا ورقةٍ أو بورقةٍ لا تحوي المهام) لا يصله المخزنُ في الإقلاع ولا في /api/get، بينما تنبيهُ «أُسندت إليك» يصله لأن مخزن التنبيهات
     bassam_notif_v1 قاعدةٌ (rule) يقرؤها كلُّ منتسبي الإدارة. فيصل التنبيهُ ولا تظهر المهمة في «ملفي ← مهامي».
     والالتفافُ الوحيد اليوم («امنحه task.view») يكشف له مهامَ زملائه كلَّها وصورَ توثيقهم — ممنوعٌ بقرار المالك.
   هنا مسارٌ ذاتيّ لا يمنح أيَّ صلاحيةٍ إدارية ولا يفتح المخزن:
     GET  /api/me/tasks[?ym=Y-M][&since=<rev>]  صفوفي أنا فقط (العمود 14 = مفتاحي الثابت) في إدارتي — القديمةُ والجديدة، المنقضيةُ والقادمة؛
                                                ولا شيءَ من صفوف غيري (ولا أسماؤهم ولا مفاتيحُهم ولا صورُهم)
     POST /api/me/tasks/act {k,id,i?,act,why?,note?,imgs?,rm?,steps?,meta?,idem?}   على صفّي أنا — تُبنى القيمةُ الجديدة في الخادم ثم تمرّ بالحفظ المركزي
                                                applySave نفسِه: canWrite ⇒ selfTaskOnly (الوضع القديم) · enfDecide ⇒ self.task.respond بنطاق Own
                                                (الإنفاذ) — فلا قاعدةَ موازية ولا تجاوزَ لثابتٍ أو تدقيقٍ أو حارسِ نسخة (CAS) أو ربطِ الصور.
         المرحلةُ الثانية (TO_BE §2 — الحالاتُ منفصلة · نواتُها 070-task-core.js):
           ack     تأكيدُ الاستلام — لا يبدأ عدّادَ التنفيذ (r20.ack)          start (= accept)  بدءُ التنفيذ — ممنوعٌ بعد انقضاء المهلة (ق6)
           decline اعتذارٌ مسبَّب إن سمحت سياسةُ المهمة (x.dec)               stall/resume      تعثّرٌ بسبب ثم استئناف (r20.stall)
           doc     توثيقٌ يُحفظ مسودّةً (صور · ملاحظة · خطوات) بلا تسليم       submit (= finish) تسليمٌ بسياسة الإثبات (ق2) — للمراجِع إن وُجد (ق3)،
           expire  انقضاءُ مهلة القبول بلا ردّ (يُسجَّل مرةً)                                     وإلا فهو إنجاز (الصفُّ القديم كما كان)
     GET  /api/me/tasks/img?id=<id>             صورةُ توثيقٍ مذكورةٌ في صفٍّ مسنَدٍ إليّ، ومالكُها رفعي (claim) أو مخزنُ مهام إدارتي (bound)
     GET  /api/me/tasks/log?k=<Y-M-D>&id=<13>   سجلُّ مهمتي (الإنشاء · الإسناد · أفعالي · المراجعة) — أحداثُ صفّي وحده، بأسماء الفاعلين لا بحساباتهم
   الهوية: الحساب ⇒ ekey ⇒ سجلُّ موظفٍ في إدارة الحساب (deptId) بالمعرّف الثابت eid (وبرقم الهوية nid للحسابات القديمة — قراءةً فقط · OD-9 · ق4).
   لا مطابقةَ بالاسم ولا باسم الدخول أبداً. والكتابةُ على صفٍّ عمودُه 14 = ekey الحساب حرفياً (شرطُ selfTaskOnly ونطاقِ Own). */
var METK_MAX = 400;                                                   /* سقفُ الصفوف في الردّ الواحد (الأحدث أولاً) — والشهرُ بـ?ym */
var METK_ACTS = { ack: 1, accept: 1, start: 1, decline: 1, stall: 1, resume: 1, doc: 1, submit: 1, finish: 1, expire: 1 };
var METK_IMG_RX = /^img_tsk[a-z0-9]+_[a-z0-9]+$/, METK_DAY_RX = /^\d{4}-\d{1,2}-\d{1,2}$/, METK_YM_RX = /^\d{4}-\d{1,2}$/;
var METK_WHY_MAX = 200, METK_NOTE_MAX = 1000, METK_IMG_N = 4;
var METK_IDEM_RX = /^[A-Za-z0-9_-]{6,40}$/, METK_IDEM_KEEP = 8;   /* KIVO_265 · البند 9: مفتاحُ عدم التكرار للفعل الذاتي — آخرُ 8 مفاتيح في r20.q */
/* SR-2.2 · F-3 (المراجعةُ المستقلة لحزمة 242 — والعيبُ نفسُه هنا بعد الترقية من بيانات 242): «انقضاءُ المهلة» يُسجَّل لما انتهت مهلتُه خلال 48 ساعة وحده —
   الأقدمُ noop بلا كتابةٍ ولا تدقيقٍ ولا تنبيه، فلا تُغرق أوّلُ زيارةٍ لـ«ملفي» المخزنَ والمسؤولين بمتأخراتٍ قديمة (دفاعٌ في العمق مع مرشِّح الواجهة) */
var METK_EXP_WIN = 48 * 3600 * 1000;
function meTkStr(v, n) { return v == null ? '' : String(v).slice(0, n || 400); }
function meTkNum(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
/* الأداءُ عند الإنهاء — حرفياً كـperfOf في صفحة المهام و_tkPerf في «ملفي» */
/* KIVO_265 · نافذةُ التنفيذ: الأداءُ من المهلة — tkPerfOf في 070 (كان meTkPerf من القبول + المدة) */
/* من أنا؟ — حسابٌ ⇒ سجلُّ موظفٍ بمعرّفٍ ثابت في إدارته. مديرُ النظام ومديرُ العقدة ومديرُ الإدارة المعيَّن (mgr:/gm:) بلا سجلّ: غيرُ مرتبط.
   (ق7: الموظفُ بصفة مدير — حسابُ staff بـmgr ومفتاحُه eid سجلّه — مرتبطٌ فيرى «مهامك») */
async function meTkIdent(env, A) {
  var u = A.u, d = String(u.deptId || ''), ek = String(u.ekey || '');
  var out = { linked: false, by: 'none', dept: d, ekey: ek, toks: nmap() };
  if (!d || !ek || u.role === 'super' || u.role === 'gm' || isMgrKey(ek) || ek.indexOf('gm:') === 0) return out;
  /* SR-2.2 · F-1 (المراجعةُ المستقلة — عالٍ): معرّفٌ يربط الحسابَ أو يصير رمزاً له إن حمله سجلٌّ واحدٌ بالضبط في الإدارة (tkEmpOne). كان الربطُ برقم الهوية
     بأوّل سجلٍّ مطابِق ويُضاف معرّفُه الثابت بلا فحصِ تفرّد — فحسابٌ مفتاحُه رقمُ هويةٍ مكرَّر يقرأ مهامَ زميلٍ وصورَ توثيقه. والمكرَّرُ اليوم «غيرُ مرتبط» */
  /* KIVO_265 · M-2 (المراجعةُ المستقلة لدمج 265): التفرّدُ في الحقلين معاً (070 tkTokRec — eid ∪ nid): مفتاحُ الحساب يحمله سجلٌّ واحدٌ بالضبط
     معرّفاً ثابتاً أو رقمَ هوية · ورمزا السجلّ (eid · nid) لا يُضافان إلا إن لم يحملهما سجلٌّ آخر في أيٍّ من الحقلين — كان رقمُ هويةِ سجلّي المساوي
     لمعرّف زميلٍ ثابت يُعطيني صفوفَه وصورَ توثيقه (القراءةُ وحدها: الكتابةُ تشترط العمود 14 = مفتاحي حرفاً). والمعرّفُ المشترك «غيرُ مرتبط» للطرفين */
  var emps = tkEmps(await opResourceGet(env, 'bsdept:' + d + ':bassam_employees_v1')), rec = tkTokRec(emps, ek);
  if (!rec) return out;
  /* KIVO_265 · F-1/R-24 (المراجعةُ المستقلة · fail-closed): سجلٌّ يحلّ إليه حسابٌ نشطٌ آخر في الإدارة (رقمُ هويته مفتاحُ حسابٍ ثانٍ مثلاً) ⇒ غيرُ مرتبطٍ لكليهما (070 tkRecShared) */
  if (tkRecShared(Array.isArray(A.users) ? A.users : parseJson(await kvGet(env, 'kv', K_USERS), []), emps, d, rec, u.id)) return out;
  out.by = rec.eid != null && String(rec.eid) === ek ? 'eid' : 'nid';
  out.linked = true; out.toks[ek] = 1; out.name = String(rec.name || '');
  if (rec.eid != null && rec.eid !== '' && tkTokRec(emps, rec.eid) === rec) out.toks[String(rec.eid)] = 1;
  /* رقمُ الهوية ثابتٌ للشخص (الاسمُ ليس كذلك ولا يُستعمل) — ويُقبل رمزاً فقط إن لم يحمله سجلٌّ آخر: رقمٌ مكرَّرٌ أو مساوٍ لمعرّف زميل (خطأُ إدخال) لا يُسند صفوفَ غيري إليّ.
     ق4: الربطُ بالهوية وقتَ القراءة وحده — لا يُعاد كتابةُ الصفّ */
  if (rec.nid != null && rec.nid !== '' && tkTokRec(emps, rec.nid) === rec) out.toks[String(rec.nid)] = 1;
  return out;
}
function meTkMine(r, I) { return Array.isArray(r) && r[14] != null && r[14] !== '' && !!I.toks[String(r[14])]; }
/* الصفُّ كما يراه صاحبُه — حقولُه هو وحده (لا اسمَ ولا مفتاحَ لغيره · المجموعةُ بوسمها لا بأفرادها · المراجِعُ باسمه) */
function meTkView(day, i, r, I, now) {
  var p = day.split('-'), r20 = tkObj(r[20]), r21 = tkObj(r[21]), x = tkX(r) || {}, S = tkState(r, now), P = tkPolOf(r);
  var imgsOf = function (a) { return (Array.isArray(a) ? a : []).filter(function (q) { return METK_IMG_RX.test(String(q)); }); };
  var revd = isObj(x.rev) && S.sub && x.rev.sub === S.sub ? { st: meTkStr(x.rev.st, 12), at: meTkNum(x.rev.at), why: meTkStr(x.rev.why, METK_WHY_MAX), by: meTkStr(x.rev.by && x.rev.by.n, 120) } : null;
  var ext = Array.isArray(x.ext) && x.ext.length ? x.ext[x.ext.length - 1] : null;
  return { k: day, y: +p[0], m: +p[1], d: +p[2], i: i, id: r[13] == null ? null : r[13],
    t: meTkStr(r[0], 300), desc: meTkStr(r[1], 4000), prio: meTkStr(r[2], 20) || 'normal', st: meTkStr(r[3], 20) || 'pending', ph: tkPhase(r, now),
    asg: S.asg, exe: S.exe, review: S.rev, tim: S.tim,
    s: meTkNum(r[15]), e: meTkNum(r[16]), dur: meTkNum(r[10]), acc: meTkNum(r[11]), fin: meTkNum(r[12]), at: meTkNum(r[13]),
    ack: r20 ? meTkNum(r20.ack) : null,
    stall: r20 && isObj(r20.stall) ? { at: meTkNum(r20.stall.at), why: meTkStr(r20.stall.why, METK_WHY_MAX) } : null,
    by: meTkStr(r[9], 160), grp: r[17] ? { id: meTkStr(r[17], 60), label: meTkStr(r[18], 120) } : null,
    perf: Array.isArray(r[6]) ? [meTkStr(r[6][0], 20), meTkStr(r[6][1], 60)] : null,
    dec: r20 && (r20.why || r20.exp) ? { at: meTkNum(r20.at), why: meTkStr(r20.why, METK_WHY_MAX), exp: meTkNum(r20.exp) } : null,
    proof: r21 ? { imgs: imgsOf(r21.imgs).slice(0, TK_IMG_TOTAL), note: meTkStr(r21.note, METK_NOTE_MAX), at: meTkNum(r21.at), sub: meTkNum(r21.sub), draft: r21.draft ? 1 : 0,
                   st: isObj(r21.st) ? Object.keys(r21.st).filter(function (k) { return P.steps.indexOf(k) !== -1; }) : [],
                   meta: (Array.isArray(r21.meta) ? r21.meta : []).filter(isObj).slice(0, TK_IMG_TOTAL).map(function (m) { return { img: meTkStr(m.img, 80), at: meTkNum(m.at), lat: meTkNum(m.lat), lng: meTkNum(m.lng), acc: meTkNum(m.acc) }; }),   /* KIVO_265 · البند 18 */
                   h: (Array.isArray(r21.h) ? r21.h : []).slice(-TK_HIST_MAX).map(function (h) { return { at: meTkNum(h && h.at), n: imgsOf(h && h.imgs).length, note: meTkStr(h && h.note, METK_NOTE_MAX) }; }) } : null,
    pol: { m: P.m, n: P.n, steps: P.steps, txt: tkPolTxt(P) }, decOk: x.dec === 0 ? 0 : 1,
    win: (function (W) { return { early: W.early, late: W.late, set: W.set, from: meTkNum(tkWinFrom(r, W)), to: meTkNum(tkWinTo(r, W)), txt: tkWinTxt(W) }; })(tkWinOf(r)),   /* KIVO_265 · نافذةُ التنفيذ (070 tkWinOf) */
    rv: S.rv ? meTkStr(S.rv.n, 120) || 'المسؤول' : '', revd: revd,
    ext: ext ? { at: meTkNum(ext.at), to: meTkNum(ext.to), why: meTkStr(ext.why, METK_WHY_MAX) } : null,
    can: x.asg === 'cancelled' && isObj(x.can) ? { at: meTkNum(x.can.at), why: meTkStr(x.can.why, METK_WHY_MAX) } : null,
    re: x.asg === 'reassigned' && isObj(x.re) ? { at: meTkNum(x.re.at), why: meTkStr(x.re.why, METK_WHY_MAX) } : null,
    rec: isObj(x.rec) ? 1 : 0,
    rid: isObj(x.rec) ? meTkStr(x.rec.id, 40) : '',   /* KIVO_265 · «ملفي»: معرّفُ السلسلة وحده (لا تعريفُها ولا مكلَّفوها) — أقربُ نسخةٍ قادمةٍ منها في «الحالية» */
    w: String(r[14]) === I.ekey ? 1 : 0 };
}
function meTkKey(I) { return tkK(I.dept); }
/* ── GET /api/me/tasks ── */
/* SR-2.2 · F-7 (سياسةُ المالك «الصفحةُ غيرُ المفعّلة لا تُظهر أيَّ بياناتٍ تخصّها»): صفحةُ المهام في سقف إدارة الحساب وغيرُ مطفأةٍ على مستوى المنصة —
   deptCapOf (سقفُ الإدارة بتقاطع أسلافها · غيابُ السجل = مفتوح · وتسقط منه الوحدةُ المطفأة A.off) كما writePages؛ وإلا فلا قراءةَ ولا فعلَ ذاتيّ */
function meTkPageOn(A) { var d = String(A.u.deptId || ''); return !!d && deptCapOf(A, d).indexOf('tasks') !== -1; }
async function meTkList(env, A, url, request) {
  if (!meTkPageOn(A)) return json({ ok: 1, now: Date.now(), me: { linked: false, by: 'off', dept: String(A.u.deptId || ''), off: 1 }, rev: 0, n: 0, more: 0, months: [], rows: [] });   /* SR-2.2 · F-7 */
  var I = await meTkIdent(env, A), now = Date.now();
  var me = { linked: I.linked, by: I.by, dept: I.dept };
  if (!I.linked) return json({ ok: 1, now: now, me: me, rev: 0, n: 0, more: 0, months: [], rows: [] });
  var K = meTkKey(I), since = parseInt(url.searchParams.get('since') || '', 10);
  /* ق5: التكرارُ يُولَّد في الخادم كسولاً عند القراءة (بلا Cron) — متساوي القوى، باسم صاحب القالب لا باسمي (073) · والمسحُ (074 · البند 10) مع كل قراءةٍ واستطلاع.
     الفحصُ العميق 2026-10-21 · R8: بحارسٍ مشتركٍ بين العزلات (074 tkLazyJobs) — كانا يجريان في كلّ طلبٍ تقريباً (عزلةٌ جديدة ⇒ ذاكرةٌ فارغة) */
  if (typeof tkLazyJobs === 'function') await tkLazyJobs(env, request, I.dept, !since);
  else {
    if (!since && typeof tkRecurLazy === 'function') { try { await tkRecurLazy(env, request, I.dept); } catch (eR) { swallow('tk-recur-lazy', eR); } }
    if (typeof tkDueLazy === 'function') await tkDueLazy(env, request, I.dept);
  }
  var rev = await tkRev(env, K);
  if (since && since === rev) return json({ ok: 1, now: now, me: me, rev: rev, same: 1 });   /* لا تغيّر في المخزن منذ آخر قراءة — ردٌّ رخيص للاستطلاع الدوري */
  var ym = String(url.searchParams.get('ym') || ''); if (ym && !METK_YM_RX.test(ym)) return json({ ok: 0, err: 'bad-ym' }, 400);
  var S = parseJson(await opResourceGet(env, K), {}); if (!isObj(S)) S = {};
  var all = [], months = {}, dk;
  for (dk in S) {
    if (!METK_DAY_RX.test(dk) || !Array.isArray(S[dk])) continue;
    var L = S[dk], p = dk.split('-'), ymk = (+p[0]) + '-' + (+p[1]);
    for (var i = 0; i < L.length; i++) {
      if (!meTkMine(L[i], I)) continue;
      months[ymk] = (months[ymk] || 0) + 1;
      if (ym && ymk !== ym.replace(/-0(\d)$/, '-$1')) continue;
      all.push(meTkView(dk, i, L[i], I, now));
    }
  }
  all.sort(function (a, b) { return (b.y - a.y) || (b.m - a.m) || (b.d - a.d) || ((a.s || a.at || 0) - (b.s || b.at || 0)); });
  var more = all.length > METK_MAX ? 1 : 0;
  return json({ ok: 1, now: now, me: me, rev: rev, n: all.length, more: more, months: Object.keys(months).map(function (x) { return { ym: x, n: months[x] }; }), rows: more ? all.slice(0, METK_MAX) : all });
}
/* ── POST /api/me/tasks/act ── */
function meTkImgs(a, n) { return a == null || (Array.isArray(a) && a.length <= n && a.every(function (x) { return typeof x === 'string' && METK_IMG_RX.test(x); })); }
function meTkBad(b) {
  if (!isObj(b)) return 'body';
  if (!METK_DAY_RX.test(String(b.k || ''))) return 'k';
  if (!(typeof b.id === 'number' && isFinite(b.id)) && !(typeof b.id === 'string' && b.id.length > 0 && b.id.length <= 40)) return 'id';
  if (b.i != null && !(typeof b.i === 'number' && b.i >= 0 && b.i < 5000 && Math.floor(b.i) === b.i)) return 'i';
  if (!Object.prototype.hasOwnProperty.call(METK_ACTS, String(b.act))) return 'act';
  if (b.why != null && (typeof b.why !== 'string' || b.why.length > METK_WHY_MAX)) return 'why';
  if (b.note != null && (typeof b.note !== 'string' || b.note.length > METK_NOTE_MAX)) return 'note';
  if (!meTkImgs(b.imgs, METK_IMG_N)) return 'imgs';
  if (!meTkImgs(b.rm, TK_IMG_TOTAL)) return 'rm';
  if (meTkMetaBad(b.meta)) return 'meta';
  if (b.idem != null && !(typeof b.idem === 'string' && METK_IDEM_RX.test(b.idem))) return 'idem';
  if (b.steps != null) {
    if (!isObj(b.steps)) return 'steps';
    var ks = Object.keys(b.steps); if (ks.length > TK_STEPS_MAX) return 'steps';
    for (var q = 0; q < ks.length; q++) if (ks[q].length > TK_STEP_LEN || typeof b.steps[ks[q]] !== 'boolean') return 'steps';
  }
  return '';
}
/* KIVO_265 · البند 18 — ختمُ الإثبات: البياناتُ الوصفية لكل صورةٍ جديدة {img, at, lat, lng, acc} كما ختمتها الواجهةُ على الصورة (الموقعُ null = «بلا موقع»
   — شاهدٌ لا شرط). تُحفظ في r21.meta بترتيب الصور ليقرأها المسؤول؛ وما حُذفت صورتُه من المسودّة يسقط معها. الشكلُ وحده يُفحص هنا (الحدودُ الجغرافية) */
function meTkMetaBad(a) {
  if (a == null) return '';
  if (!Array.isArray(a) || a.length > METK_IMG_N) return 'meta';
  var num = function (v, lim) { return v == null || (typeof v === 'number' && isFinite(v) && Math.abs(v) <= lim); };
  for (var i = 0; i < a.length; i++) {
    var m = a[i];
    if (!isObj(m) || !(typeof m.at === 'number' && isFinite(m.at) && m.at > 0)) return 'meta';
    if (m.img != null && !(typeof m.img === 'string' && METK_IMG_RX.test(m.img))) return 'meta';
    if (!num(m.lat, 90) || !num(m.lng, 180) || !num(m.acc, 1e6)) return 'meta';
  }
  return '';
}
function meTkMeta(q, m) {
  var f = function (v, d) { return v == null ? null : d ? +(+v).toFixed(d) : Math.round(+v); };
  return { img: q, at: m.at, lat: f(m.lat, 5), lng: f(m.lng, 5), acc: f(m.acc, 0) };
}
/* التوثيقُ المدموج (doc · submit): الصورُ تُضاف ولا تُستبدل (إعادةُ المهمة لا تمحو الإثبات السابق) · الحذفُ لمسودّة الجولة الحالية وحدها ·
   الصورةُ الجديدة يجب أن تكون رفعي أنا (claim) — والمربوطةُ بالمخزن مقبولةٌ ما دامت في صفّي هذا */
async function meTkProof(env, A, K, r0, b, now) {
  var cur = tkObj(r0[21]) || {}, P = tkPolOf(r0);
  var had = (Array.isArray(cur.imgs) ? cur.imgs : []).filter(function (q) { return METK_IMG_RX.test(String(q)); });
  var lockd = nmap(); (Array.isArray(cur.h) ? cur.h : []).forEach(function (h) { (h && Array.isArray(h.imgs) ? h.imgs : []).forEach(function (q) { lockd[q] = 1; }); });
  if (cur.sub && !Array.isArray(cur.h)) had.forEach(function (q) { lockd[q] = 1; });             /* تسليمٌ قديمُ الشكل: صورُه كلُّها مسلَّمة */
  var rm = Array.isArray(b.rm) ? b.rm : [], j;
  for (j = 0; j < rm.length; j++) if (lockd[rm[j]]) return { err: json({ ok: 0, err: 'img-locked', at: rm[j], msg: 'صورةُ تسليمٍ سابق جزءٌ من سجلّ المهمة ولا تُحذف' }, 409) };
  had = had.filter(function (q) { return rm.indexOf(q) === -1; });
  var add = (Array.isArray(b.imgs) ? b.imgs : []).filter(function (q, n, a) { return had.indexOf(q) === -1 && a.indexOf(q) === n; });
  for (j = 0; j < add.length; j++) {
    var o = await imgOwnOf(env, add[j]);
    if (!(o && o.st === 'claim' && o.uid === A.u.id)) return { err: json({ ok: 0, err: 'img', at: add[j], msg: 'صورةُ التوثيق لم تُرفع بعد أو ليست لك — أعد الرفع' }, 409) };
  }
  var imgs = had.concat(add);
  if (imgs.length > TK_IMG_TOTAL) return { err: json({ ok: 0, err: 'imgs', msg: 'بلغت المهمةُ حدَّ صور التوثيق (' + TK_IMG_TOTAL + ')' }, 400) };
  var st = isObj(cur.st) ? Object.assign({}, cur.st) : {};
  if (isObj(b.steps)) Object.keys(b.steps).forEach(function (k) { if (P.steps.indexOf(k) === -1) return; if (b.steps[k]) st[k] = st[k] || now; else delete st[k]; });
  var p = Object.assign({}, cur, { imgs: imgs, note: b.note != null ? String(b.note).trim() : String(cur.note || ''), st: st, at: now });
  if (!Object.keys(st).length) delete p.st;
  /* KIVO_265 · البند 18: الوصفيةُ المحفوظة لما بقي من الصور + الجديدةُ بمعرّفها (أو بموضعها في imgs حين يغيب img) */
  var metaIn = Array.isArray(b.meta) ? b.meta : [], meta = (Array.isArray(cur.meta) ? cur.meta : []).filter(function (m) { return isObj(m) && imgs.indexOf(m.img) !== -1; });
  metaIn.forEach(function (m, n) { var q = m.img != null ? m.img : (Array.isArray(b.imgs) ? b.imgs[n] : null); if (q && add.indexOf(q) !== -1 && !meta.some(function (z) { return z.img === q; })) meta.push(meTkMeta(q, m)); });
  if (meta.length) p.meta = meta.slice(0, TK_IMG_TOTAL); else delete p.meta;
  return { p: p, round: imgs.filter(function (q) { return !lockd[q]; }), P: P };
}
var METK_AUD = { ack: 'acknowledged', start: 'accepted', decline: 'declined', stall: 'stalled', resume: 'resumed', doc: 'documented', expire: 'expired' };
async function meTkAct(env, request, A, b) {
  if (!meTkPageOn(A)) return json({ ok: 0, err: 'off', msg: 'صفحةُ المهام غيرُ مفعّلةٍ لإدارتك' }, 403);   /* SR-2.2 · F-7 */
  var bad = meTkBad(b); if (bad) return json({ ok: 0, err: 'bad-body', at: bad }, 400);
  var I = await meTkIdent(env, A); if (!I.linked) return json({ ok: 0, err: 'not-linked' }, 403);
  var K = meTkKey(I), act = String(b.act), dk = String(b.k);
  if (act === 'accept') act = 'start'; else if (act === 'finish') act = 'submit';                  /* أسماءُ المرحلة الأولى (والحزمةُ 242 SR-2) باقية */
  if ((act === 'decline' || act === 'stall') && !String(b.why || '').trim()) return json({ ok: 0, err: 'bad-body', at: 'why' }, 400);
  if (await tkLocked(env, I.dept, tkYm(dk))) return json({ ok: 0, err: 'locked', msg: 'شهرُ المهمة معتمدٌ ومقفل' }, 409);
  /* وسمُ الخادم: كتابةُ الذات على مخزن المهام تأتي من هذا المسار وحده (الرقعة 06: selfTaskOnly وself.task.respond يشترطانه — فلا تُصنع
     حالةٌ أو أداءٌ أو تجاوزٌ للمراجعة بحفظٍ خام /api/save ممّن يقرأ المخزن). لا يصل إليه مدخلٌ من الطلب: الفاعلُ يُبنى في الخادم من الجلسة */
  try { Object.defineProperty(A, '__tkSelf', { value: 1, enumerable: false, configurable: true }); } catch (eM) { A.__tkSelf = 1; }
  var R = await tkSave(env, request, A, K, async function (S) {
    var L = Array.isArray(S[dk]) ? S[dk] : null, idx = -1, j;
    /* الصفُّ بهويته (العمود 13) ومسنَدٌ إليّ — والموضعُ i تلميحٌ فقط (تُزاح الصفوف بإضافةٍ أو حذف). صفٌّ ليس لي = «غير موجود» (لا كشفَ لوجوده) */
    if (L) {
      if (b.i != null && meTkMine(L[b.i], I) && String(L[b.i][13]) === String(b.id)) idx = b.i;
      for (j = 0; j < L.length && idx < 0; j++) if (meTkMine(L[j], I) && String(L[j][13]) === String(b.id)) idx = j;
    }
    if (idx < 0) return { err: json({ ok: 0, err: 'not-found' }, 404) };
    var r0 = L[idx];
    if (String(r0[14]) !== I.ekey) return { err: json({ ok: 0, err: 'identity', msg: 'المهمة مسندةٌ بمعرّفٍ قديم لا يطابق حسابك — يعيد المدير إسنادها' }, 409) };
    var now = Date.now(), S0 = tkState(r0, now), ph = tkPhase(r0, now), x = tkX(r0) || {}, r1 = tkPad(r0);
    var r20 = Object.assign({}, tkObj(r0[20]) || {}), closed = r0[3] === 'done' || r0[3] === 'declined';
    var no = function (err, msg) { return { err: json({ ok: 0, err: err || 'state', ph: ph, msg: msg || '' }, 409) }; };
    /* KIVO_265 · البند 9 (العملُ بلا اتصال): فعلٌ وصل وضاع ردُّه فأعاده الطابورُ بمفتاحه ⇒ noop (نجاحٌ بلا كتابةٍ ولا تنبيهٍ ولا تدقيقٍ ثانٍ) — قبل أحكام الحالة
       التي كانت ستردّه 409 state. المفتاحُ محفوظٌ في r20.q (آخرُ 8) مع الفعل المكتوب وحده */
    var q0 = Array.isArray(r20.q) ? r20.q : [];
    if (b.idem && q0.indexOf(String(b.idem)) !== -1) return { noop: 1, row: meTkView(dk, idx, r0, I, now), idem: 1 };
    if (S0.asg === 'cancelled') return no('state', 'أُلغيت المهمة');
    if (S0.asg === 'reassigned') return no('state', 'أُعيد إسنادُ المهمة لغيرك');
    var audAct = METK_AUD[act], extra = {}, out = {};
    if (act === 'ack') {
      if (closed) return no();
      if (r20.ack || r0[11]) return { noop: 1, row: meTkView(dk, idx, r0, I, now) };
      r20.ack = now; r1[20] = r20;
    } else if (act === 'start') {
      if (closed || r0[11]) return no();
      if (ph === 'expired') return no('expired', 'انقضت مهلةُ المهمة — يمدّدها المسؤول أو يعيد إسنادها');      /* ق6 */
      /* KIVO_265 · نافذةُ التنفيذ (قرارُ المالك): لا بدءَ قبل الموعد إلا بما سمحت به إعداداتُ المهمة (x.win.early) — والقبولُ (ack) حرٌّ في أيّ وقت */
      var W0 = tkWinOf(r0), fromW = tkWinFrom(r0, W0);
      if (fromW && now < fromW) return no('early', (W0.early ? 'لا يمكن البدء قبل الموعد بأكثر من ' + W0.early + ' دقيقة' : 'لا يمكن البدء قبل موعد المهمة') + ' — تبدأ في ' + tkClock(r0[15]));
      r1[11] = now; r1[3] = 'in_progress'; if (!r20.ack) r20.ack = now; r1[20] = r20;
    } else if (act === 'decline') {
      if (closed || r0[11]) return no();
      if (x.dec === 0) return no('policy', 'سياسةُ هذه المهمة لا تسمح بالاعتذار — تواصل مع المسؤول');
      r1[3] = 'declined'; r20.at = now; r20.why = String(b.why).trim(); r1[20] = r20;
    } else if (act === 'stall') {
      if (closed || !r0[11] || S0.exe === 'submitted' || S0.exe === 'stalled') return no();
      r20.stall = { at: now, why: String(b.why).trim() }; r1[20] = r20;
    } else if (act === 'resume') {
      if (closed || S0.exe !== 'stalled') return no();
      delete r20.stall; r1[20] = Object.keys(r20).length ? r20 : null;
    } else if (act === 'doc' || act === 'submit') {
      if (closed || !r0[11]) return no();
      if (S0.exe === 'submitted') return no('state', 'المهمة بانتظار قرار المراجِع');
      var M = await meTkProof(env, A, K, r0, b, now); if (M.err) return M;
      if (act === 'doc') { M.p.draft = 1; r1[21] = M.p; }
      else {
        var why = tkPolCheck(M.P, M.p); if (why) return { err: json({ ok: 0, err: 'proof', msg: why }, 400) };
        /* KIVO_265 · نافذةُ التنفيذ: لا تسليمَ بعد المهلة + سماحِ التأخر (x.win.late) — المسودّةُ (doc) تبقى ممكنةً حتى لا يضيع التوثيق */
        var W1 = tkWinOf(r0), toW = tkWinTo(r0, W1);
        if (toW && now > toW) return no('late', W1.late ? 'انقضت مهلةُ التسليم (' + W1.late + ' س بعد المهلة) — يمدّدها المسؤول أو يعيد إسنادها' : 'انقضت مهلةُ المهمة ولا يُقبل تسليمٌ بعدها — يمدّدها المسؤول أو يعيد إسنادها');
        delete M.p.draft; M.p.sub = now;
        var h = (Array.isArray(M.p.h) ? M.p.h.slice() : []); h.push({ at: now, imgs: M.round.slice(0, TK_IMG_TOTAL), note: M.p.note }); M.p.h = h.slice(-TK_HIST_MAX);
        r1[21] = M.p; r1[12] = now; r1[6] = tkPerfOf(r0, now);                                           /* KIVO_265: الأداءُ من المهلة (070 tkPerfOf) */
        if (r20.stall) { delete r20.stall; r1[20] = Object.keys(r20).length ? r20 : null; }
        if (!S0.rv) r1[3] = 'done';                                                    /* ق3: بلا مراجِع (الصفُّ القديم أو «بلا مراجعة») ⇒ إنجاز */
        audAct = S0.rv ? 'submitted' : 'finished';
        extra.round = M.round.length;
      }
    } else {                                                                      /* expire: انقضاءُ مهلة القبول بلا ردّ — يُسجَّل مرةً واحدة فيصل المسؤولَ تنبيهُه */
      if (closed || r0[11] || ph !== 'expired') return no();
      if (r20.exp) return { noop: 1, row: meTkView(dk, idx, r0, I, now) };
      if (now - r0[16] > METK_EXP_WIN) return { noop: 1, row: meTkView(dk, idx, r0, I, now) };   /* SR-2.2 · F-3: قديمٌ ⇒ بلا كتابةٍ ولا تنبيه */
      r20.exp = now; r1[20] = r20;
    }
    if (b.idem) { var rq = isObj(r1[20]) ? r1[20] : r20; rq.q = q0.concat([String(b.idem)]).slice(-METK_IDEM_KEEP); r1[20] = rq; }   /* KIVO_265 · البند 9 */
    var S2 = Object.assign({}, S); S2[dk] = L.map(function (q, n) { return n === idx ? r1 : q; });
    var bef = { st: r0[3] || null, acc: r0[11] || null, asg: S0.asg, exe: S0.exe, rev: S0.rev }, S1 = tkState(r1, now);
    var aft = { st: r1[3], acc: r1[11] || null, fin: r1[12] || null, asg: S1.asg, exe: S1.exe, rev: S1.rev, imgs: isObj(r1[21]) && Array.isArray(r1[21].imgs) ? r1[21].imgs.length : 0, why: act === 'decline' || act === 'stall' ? String(b.why).trim().slice(0, METK_WHY_MAX) : undefined };
    out.r0 = r0; out.r1 = r1; out.idx = idx; out.audAct = audAct; out.extra = extra; out.S1 = S1;
    return { S2: S2, aud: [tkAud(K, r0, audAct, { day: dk, i: idx, via: 'self' }, bef, aft)], out: out };
  });
  if (R.err) return R.err;
  var now2 = Date.now();
  if (R.noop) return json({ ok: 1, rev: await tkRev(env, K), row: R.row, noop: 1 });
  var o = R.out, r1 = o.r1, title = String(r1[0] || 'مهمة'), x1 = tkX(r1) || {}, nm = String(r1[8] || I.name || '');
  var boss = []; [x1.rv, x1.by].forEach(function (w) { if (isObj(w) && (w.e || w.u) && boss.indexOf(String(w.e || w.u)) === -1) boss.push(String(w.e || w.u)); });
  if (!boss.length) boss.push('mgr:' + I.dept);                                   /* صفٌّ قديمٌ بلا منشئٍ معروف (r9 اسمٌ لا حساب) ⇒ مديرُ الإدارة */
  var N = [];
  if (o.audAct === 'declined') N.push({ type: 'task_chg', own: boss, vars: { 'الفعل': 'اعتُذر عن', 'المهمة': title, 'التفصيل': nm + ' — ' + String(b.why || '').trim() + ' · أعِد إسنادها' } });
  else if (o.audAct === 'expired') N.push({ type: 'task_chg', own: boss, vars: { 'الفعل': 'لم تُقبل', 'المهمة': title, 'التفصيل': 'انقضت مهلة قبول ' + nm + ' بلا ردّ · مدّدها أو أعِد إسنادها' } });
  else if (o.audAct === 'accepted') N.push({ type: 'task_chg', own: [], vars: { 'الفعل': 'قُبلت', 'المهمة': title, 'التفصيل': nm + ' بدأ العمل عليها' } });
  else if (o.audAct === 'stalled') N.push({ type: 'task_chg', own: boss, vars: { 'الفعل': 'تعثّرت', 'المهمة': title, 'التفصيل': nm + ' — ' + String(b.why || '').trim() } });
  else if (o.audAct === 'submitted') N.push({ type: 'task_chg', own: boss.slice(0, 1), vars: { 'الفعل': 'سُلّمت للمراجعة', 'المهمة': title, 'التفصيل': 'من ' + nm + (o.extra.round ? ' — بـ' + o.extra.round + ' صورة' : '') } });
  else if (o.audAct === 'finished') { var pf = isObj(r1[21]) && Array.isArray(r1[21].imgs) ? r1[21].imgs.length : 0; N.push({ type: 'task_done', own: [], vars: { 'الاسم': nm || '—', 'المهمة': title + (pf ? ' — موثّقة بـ' + pf + ' صورة' : '') + (r1[6] && r1[6][1] ? ' · ' + r1[6][1] : '') } }); }
  if (N.length) await tkNotify(env, request, A, I.dept, N);
  return json({ ok: 1, rev: R.rev, row: meTkView(dk, o.idx, r1, I, now2) });
}
/* ── GET /api/me/tasks/img?id=<id> ── */
async function meTkImg(env, A, id) {
  if (!meTkPageOn(A)) return json({ ok: 0, err: 'off' }, 403);   /* SR-2.2 · F-7 */
  if (!METK_IMG_RX.test(id)) return json({ ok: 0, err: 'bad-id' }, 400);
  var I = await meTkIdent(env, A); if (!I.linked) return json({ ok: 0, err: 'forbidden' }, 403);
  var K = meTkKey(I), S = parseJson(await opResourceGet(env, K), {}), found = false, dk, i;
  if (isObj(S)) for (dk in S) { if (found || !METK_DAY_RX.test(dk) || !Array.isArray(S[dk])) continue;
    for (i = 0; i < S[dk].length && !found; i++) { var r = S[dk][i]; if (meTkMine(r, I) && isObj(r[21]) && Array.isArray(r[21].imgs) && r[21].imgs.indexOf(id) !== -1) found = true; } }
  if (!found) return json({ ok: 0, err: 'forbidden' }, 403);
  /* imgResolve لا imgOwnOf: صورةُ توثيقٍ قديمة (قبل سجلّ الملكية) يذكرها مخزنُ المهام وحده تُحسم له هنا مرّةً — كما يفعل /api/img */
  var o = await imgResolve(env, id);
  if (!o || !((o.st === 'bound' && o.k === K) || (o.st === 'claim' && o.uid === A.u.id))) return json({ ok: 0, err: 'forbidden' }, 403);
  var iv = await imgLoad(env, id);
  if (iv == null) return new Response('', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(iv, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
/* ── GET /api/me/tasks/log?k&id — سجلُّ مهمتي: أحداثُ صفّي وحده (هويةُ الكيان · وصيغةُ المرحلة الأولى) بأسماء الفاعلين ── */
var METK_LOG_ACT = { created: 'أُنشئت', accepted: 'قُبلت', finished: 'أُنجزت', completed: 'أُنجزت', declined: 'اعتُذر عنها', expired: 'انقضت مهلتها', acknowledged: 'أُكّد استلامُها',
  stalled: 'تعثّرت', resumed: 'استُؤنفت', documented: 'وُثّقت', submitted: 'سُلّمت للمراجعة', approved: 'اعتُمدت', returned: 'أُعيدت للاستكمال', extended: 'مُدّدت مهلتها',
  reassigned: 'أُعيد إسنادُها', cancelled: 'أُلغيت', edited: 'عُدّلت', status_changed: 'تغيّرت حالتُها', deleted: 'حُذفت', assigned: 'أُسندت',
  rec_start: 'صارت متكررة', rec_edit: 'عُدّل تكرارُها', rec_pause: 'أُوقف تكرارُها مؤقتاً', rec_resume: 'استُؤنف تكرارُها', rec_stop: 'أُنهي تكرارُها' };
async function meTkLog(env, A, url) {
  if (!meTkPageOn(A)) return json({ ok: 0, err: 'off' }, 403);   /* SR-2.2 · F-7 */
  var dk = String(url.searchParams.get('k') || ''), id = String(url.searchParams.get('id') || '');
  if (!METK_DAY_RX.test(dk) || !id || id.length > 40) return json({ ok: 0, err: 'bad-query' }, 400);
  var I = await meTkIdent(env, A); if (!I.linked) return json({ ok: 0, err: 'not-linked' }, 403);
  var K = meTkKey(I), S = parseJson(await opResourceGet(env, K), {}), L = isObj(S) && Array.isArray(S[dk]) ? S[dk] : [], r = null;
  for (var j = 0; j < L.length && !r; j++) if (meTkMine(L[j], I) && String(L[j][13]) === id) r = L[j];
  if (!r) return json({ ok: 0, err: 'not-found' }, 404);
  var e1 = tkEntId(r), e2 = (String(r[13]) + '_' + String(r[14])).slice(0, 80);
  var rs = await env.DB.prepare("SELECT ts, uid, act, ctx, aft FROM aud WHERE k = ?1 AND etype = 'task' AND (eid = ?2 OR eid = ?3) ORDER BY ts, id LIMIT 200").bind(K, e1, e2).all();
  var byId = nmap(); (A.users || []).forEach(function (u) { if (u && u.id) byId[u.id] = u; });
  var ev = ((rs && rs.results) || []).map(function (q) {
    var u = byId[q.uid], a = parseJson(q.aft, {}), why = isObj(a) && typeof a.why === 'string' ? a.why.slice(0, METK_WHY_MAX) : '';
    return { at: q.ts, act: q.act, txt: METK_LOG_ACT[q.act] || q.act, by: q.uid === A.u.id ? 'أنت' : (u ? String(u.name || 'المسؤول') : 'المسؤول'), why: why };
  });
  /* ما قبل سجلّ الأحداث (صفوفٌ قديمة): الإنشاءُ والقبولُ والإنهاءُ من طوابع الصفّ نفسِه — موسومةٌ «من بيانات المهمة» لا أحداثاً محفوظة */
  var have = nmap(); ev.forEach(function (q) { have[q.act] = 1; });
  var stamp = [];
  if (!have.created && typeof r[13] === 'number' && r[13] > 1e12) stamp.push({ at: r[13], act: 'created', txt: 'أُنشئت', by: String(r[9] || 'المسؤول'), why: '', src: 'row' });
  if (!have.accepted && r[11]) stamp.push({ at: r[11], act: 'accepted', txt: 'قُبلت', by: 'أنت', why: '', src: 'row' });
  if (!have.finished && !have.submitted && r[12]) stamp.push({ at: r[12], act: 'finished', txt: 'أُنجزت', by: 'أنت', why: '', src: 'row' });
  var all = stamp.concat(ev).sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
  return json({ ok: 1, k: dk, id: r[13], events: all });
}
/* ── الموزِّع: يُستدعى من authSessionRoutes (062a) بجلسةٍ صالحة وحسابٍ قائم ── */
async function meTasksRoutes(request, env, path, ss) {
  if (path !== '/api/me/tasks' && path !== '/api/me/tasks/act' && path !== '/api/me/tasks/img' && path !== '/api/me/tasks/log') return typeof tasksMgmtRoutes === 'function' ? await tasksMgmtRoutes(request, env, path, ss) : null;
  var A = await actorOf(env, ss.uid);
  if (!A) return json({ ok: 0, err: 'session' }, 401);
  var sxU = sessUidMismatch(env, new URL(request.url), ss, path); if (sxU) return sxU;   /* KIVO_264 · C1 للقراءة: ?uid= = هويةُ التبويب (BOOT.uid) */
  /* KIVO_265 · L-1: القراءاتُ الذاتية (القائمة · الصورة · السجلّ) بسقف القراءة الذاتية نفسِه في «ملفي» (ME_RL = 120 طلباً في الدقيقة لكل حساب — 062b)،
     في دلوٍ خاصٍّ بها ('mt') فلا يُحرم استطلاعُ المهام وصورُها «ملفي» حقائقَ اليوم والسجلّ. القائمةُ تحلّل مخزنَ الإدارة كلَّه، والصورةُ تبثّ بياناتها */
  if (request.method === 'GET' && path !== '/api/me/tasks/act') { var rlM = await rlHit(env, 'mt', A.u.id, ME_RL); if (rlM) return tooMany(rlM); }
  if (path === '/api/me/tasks') {
    if (request.method !== 'GET') return json({ ok: 0, err: 'method' }, 405);
    return await meTkList(env, A, new URL(request.url), request);
  }
  if (path === '/api/me/tasks/act') {
    if (request.method !== 'POST') return json({ ok: 0, err: 'method' }, 405);
    var rl = await rlHit(env, 'sv', A.u.id, RL_SAVE); if (rl) return tooMany(rl);
    var raw = await request.arrayBuffer();
    if (raw.byteLength > 8192) return json({ ok: 0, err: 'too-large' }, 413);
    var b; try { b = JSON.parse(new TextDecoder().decode(raw)); } catch (e) { return json({ ok: 0, err: 'bad-body', at: '$' }, 400); }   /* SOT-101/E5: كسائر المسارات المغيِّرة */
    var badB = bodyCheck('/api/me/tasks/act', b); if (badB) return json({ ok: 0, err: 'bad-body', at: badB }, 400);   /* SOT-101: المخطّطُ الموحّد (src/schemas/api) — ثم الفحصُ الدلاليّ meTkBad */
    var sxB = tkSessBody(env, b, ss, path); if (sxB) return sxB;   /* KIVO_264 · C1: uid في الجسم = هويةُ التبويب — قبل أيّ قراءةٍ أو كتابة */
    return await meTkAct(env, request, A, b);
  }
  if (request.method !== 'GET') return json({ ok: 0, err: 'method' }, 405);
  if (path === '/api/me/tasks/log') return await meTkLog(env, A, new URL(request.url));
  if (path === '/api/me/tasks/img') return await meTkImg(env, A, String(new URL(request.url).searchParams.get('id') || ''));
  return null;
}
