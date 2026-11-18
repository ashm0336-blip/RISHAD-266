/* ── KIVO_264 · KIVO-Tasks (المرحلة الثانية) — نموذجُ المهمة في الواجهة: مرآةٌ حرفية لنواة الخادم (workers/parts/070-task-core.js) ──
   الصفُّ القائم 0…21 كما هو · 22 طابعُ هوية الكيان (سجلّ الأنشطة) · 23 = x حقولُ الإدارة (سياسةُ الإثبات · المراجِع · التمديد · المراجعة ·
   الإلغاء · إعادةُ الإسناد · التكرار) — وحالةُ الموظف داخل أعمدته القائمة: r20 {ack · stall · why/at (اعتذار) · exp} · r21 {imgs · note · st · sub · h}.
   الحالاتُ منفصلة (TO_BE §2): الإسناد asg · التنفيذ exe · المراجعة rev · الوقت tim — مشتقّةٌ لا مخزَّنة. الخادمُ يحكم؛ هذه للعرض والفرز وحدهما.
   tests/unit/tasks_model_parity.test.mjs يثبت التطابقَ مع الخادم على صفوفٍ اصطناعية تغطي الحالات كلَّها. */
(function () {
  var NS = window.KIVO || window;
  var X = 23, POL_M = { any: 1, img: 1, note: 1, both: 1, none: 1 };
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function xOf(r) { return Array.isArray(r) && isObj(r[X]) ? r[X] : null; }
  function pol(r) {
    var x = xOf(r), p = x && isObj(x.pol) ? x.pol : null, m = p && POL_M[p.m] ? p.m : 'any';
    var n = p && typeof p.n === 'number' && p.n >= 1 && p.n <= 4 ? Math.floor(p.n) : 1;
    var steps = p && Array.isArray(p.steps) ? p.steps.filter(function (s) { return typeof s === 'string' && s.trim(); }).map(function (s) { return s.trim().slice(0, 120); }).slice(0, 12) : [];
    return { m: m, n: n, steps: steps };
  }
  function polTxt(P) {
    var t = { any: 'صورةٌ أو ملاحظة', img: (P.n > 1 ? P.n + ' صور على الأقل' : 'صورة'), note: 'ملاحظةُ إنجاز', both: (P.n > 1 ? P.n + ' صور' : 'صورة') + ' وملاحظة', none: 'بلا إثبات' }[P.m];
    return t + (P.steps.length ? ' · ' + P.steps.length + ' خطوات' : '');
  }
  function rv(r) { var x = xOf(r); return x && isObj(x.rv) && (x.rv.u || x.rv.e) ? x.rv : null; }
  /* KIVO_265 · نافذةُ التنفيذ (قرارُ المالك 2026-10-19) — مرآةُ 070 tkWinOf/tkWinFrom/tkWinTo/tkWinTxt/tkPerfOf حرفاً:
     x.win = { early: دقائقُ البدء قبل الموعد (0 = لا) · late: ساعاتُ التسليم بعد المهلة (0 = لا) } · الافتراضي early 0 · late 2 · الأداءُ من المهلة */
  var WIN_EARLY_MAX = 240, WIN_LATE_MAX = 24, WIN_DEF = { early: 0, late: 2 };
  function win(r) {
    var x = xOf(r), w = x && isObj(x.win) ? x.win : null, o = { early: WIN_DEF.early, late: WIN_DEF.late, set: 0 };
    if (w && typeof w.early === 'number' && isFinite(w.early) && w.early >= 0) { o.early = Math.min(WIN_EARLY_MAX, Math.floor(w.early)); o.set = 1; }
    if (w && typeof w.late === 'number' && isFinite(w.late) && w.late >= 0) { o.late = Math.min(WIN_LATE_MAX, Math.floor(w.late)); o.set = 1; }
    return o;
  }
  function winTxt(W) { return (W.early ? 'البدء قبل الموعد بـ' + W.early + ' د' : 'لا بدء قبل الموعد') + ' · ' + (W.late ? 'التسليم حتى ' + W.late + ' س بعد المهلة' : 'لا تسليم بعد المهلة'); }
  function winFrom(r, W) { return r[15] ? r[15] - (W || win(r)).early * 6e4 : 0; }
  function winTo(r, W) { return r[16] ? r[16] + (W || win(r)).late * 36e5 : 0; }
  function perf(r, fin) {
    if (!fin) return null;
    var e = r[16], s = r[15] || r[11] || 0;
    var f = function (t) { var m0 = Math.floor(Math.abs(t) / 6e4), h = Math.floor(m0 / 60), m = m0 % 60; return (h ? h + ' س' : '') + (h && m ? ' ' : '') + (m || !h ? m + ' د' : ''); };
    if (!e) { if (!r[11] || !r[10]) return null; var a0 = 6e4 * r[10], r0 = r[11] + a0 - fin; return r0 <= -6e4 ? ['late', 'متأخر ' + f(r0)] : r0 >= 0.1 * a0 ? ['early', 'مبكر بـ ' + f(r0)] : ['on_time', 'في الوقت']; }
    var span = Math.max(6e4, e - (s && s < e ? s : e - 36e5)), d = e - fin;
    return d <= -6e4 ? ['late', 'متأخر ' + f(d)] : d >= 0.1 * span ? ['early', 'مبكر بـ ' + f(d)] : ['on_time', 'في الوقت'];
  }
  function state(r, now) {
    now = now || Date.now();
    var x = xOf(r) || {}, r20 = isObj(r[20]) ? r[20] : {}, r21 = isObj(r[21]) ? r[21] : {}, R = rv(r);
    var sub = typeof r21.sub === 'number' ? r21.sub : 0, dec = isObj(x.rev) && sub && x.rev.sub === sub ? String(x.rev.st || '') : '';
    var asg = x.asg === 'cancelled' ? 'cancelled' : x.asg === 'reassigned' ? 'reassigned' : r[3] === 'declined' ? 'declined' : (r20.ack || r[11]) ? 'acknowledged' : 'assigned';
    var done = r[3] === 'done';
    /* KIVO_265: «بانتظار المراجِع» تسليمٌ لم يُقرَّر وله مراجِع — كالخادم (070 tkState) */
    var exe = done ? 'done' : !r[11] ? 'not_started' : (R && sub && !dec) ? 'submitted' : r20.stall ? 'stalled' : 'in_progress';
    var rev = !R ? 'none' : done ? 'approved' : (sub && !dec) ? 'pending' : dec === 'returned' ? 'returned' : 'none';
    var tim = '';
    if (done) tim = Array.isArray(r[6]) ? String(r[6][0] || '') : '';
    else if (!r[11]) tim = r[16] && now > r[16] ? 'overdue_ack' : '';
    else if (exe !== 'submitted' && r[16] && now > r[16]) tim = 'overdue_exec';
    var closed = done || r[3] === 'declined' || asg === 'cancelled' || asg === 'reassigned';
    return { asg: asg, exe: exe, rev: rev, tim: tim, closed: closed, sub: sub, dec: dec, rv: R };
  }
  function phase(r, now) {
    now = now || Date.now();
    var S = state(r, now);
    if (S.asg === 'cancelled') return 'cancelled';
    if (S.asg === 'reassigned') return 'reassigned';
    if (r[3] === 'declined') return 'declined';
    if (r[3] === 'done') return 'done';
    if (S.exe === 'submitted') return 'review';
    if (S.rev === 'returned') return 'returned';
    if (S.exe === 'stalled') return 'stalled';
    if (r[11]) return 'running';
    if (r[16] && now > winTo(r)) return 'expired';                 /* KIVO_265 · نافذةُ التنفيذ: كالخادم (070 tkPhase) */
    if (r[15] && now < r[15]) return 'upcoming';
    return 'new';
  }
  /* ربطُ الصفّ بسجلّ موظف (ق4 — للعرض: «غير مرتبطة» تُربط يدوياً) — مرآةُ tkLink في 070: المعرّفُ الثابت أو رقمُ الهوية يحمله سجلٌّ واحدٌ وحده،
     ومعرّفٌ يحمله سجلّان (خطأُ إدخال) «غيرُ مرتبطة» لا أوّلُ مطابِق (SR-2.2 · F-1 — ولا يراه أحدٌ في «مهامي») */
  /* KIVO_265 · M-2: التفرّدُ في الحقلين معاً (eid ∪ nid — كـtkTokN في 070) · L-2: مرشَّحُ الربط بالاسم إن تفرّد الاسمُ وحده — اقتراحٌ لا اختيار */
  function link(emps, tok) {
    if (tok == null || tok === '') return { by: 'none', emp: null };
    var t = String(tok), L = (emps || []).filter(isObj), i, n = 0, hit = null, e;
    for (i = 0; i < L.length; i++) { e = L[i]; if ((e.eid != null && e.eid !== '' && String(e.eid) === t) || (e.nid != null && e.nid !== '' && String(e.nid) === t)) { n++; if (!hit) hit = e; } }
    if (n === 1) return hit.eid != null && String(hit.eid) === t ? { by: 'eid', emp: hit } : { by: 'nid', emp: hit };
    if (n > 1) return { by: 'ambiguous', emp: null };
    hit = null;
    for (i = 0; i < L.length; i++) if (L[i].name && String(L[i].name) === t) { n++; if (!hit) hit = L[i]; }
    if (n) return { by: 'name', emp: null, cand: n === 1 ? hit : null };
    return { by: 'unknown', emp: null };
  }
  /* KIVO_265 · قرارُ المالك 15:13 (البند 4) — مرآةُ tkAcctOf/tkAcctTok في 070: حسابُ المستخدم «له» بقاعدة «ملفي» (حسابٌ في الإدارة نفسِها — لا مديرَ نظامٍ
     ولا عامّاً ولا مفتاحَ مدير — مفتاحُه يحمله سجلُّ هذا الموظف وحده) · «نشط» = غيرُ معطَّل ومفتاحُه المعرّفُ الثابت الذي يُسند به (المراجعةُ الموحّدة R-3:
     حسابٌ مفتاحُه رقمُ الهوية يرى المهمة ولا ينفّذها ⇒ 'nid') · الاتصالُ لا يُشترط ⇒ 'active' | 'disabled' | 'nid' | 'none'.
     للعرض وحده (منتقي المكلَّفين وقائمةُ «قبول نيابةً» يبيّنان السبب): الحكمُ في الخادم (409 acct · task-acct) */
  /* إعادةُ المراجعة (N-2 — متوسط · أداء): فهرسٌ واحد — رمز (eid ∪ nid بعدد السجلّات التي تحمله: tkTokN) ⇒ سجلّ، وحساباتُ الإدارة مجموعةً بسجلّاتها
     — O(E + U) لكل رسم. كان الحكمُ يمسح السجلَّ لكل حسابٍ ولكل موظف: O(E²·U) لكل رسمٍ للمنتقي (300 موظف ≈ 8.5 ث). مرآةُ 070 tkAcctIx/tkAcctTok حرفاً */
  function acctIx(users, emps, d) {
    var L = (emps || []).filter(isObj), U = users || [], tok = Object.create(null), acc = new Map(), i, j, e, vs, T, u, ek, r;
    for (i = 0; i < L.length; i++) {
      e = L[i]; vs = [];
      if (e.eid != null && e.eid !== '') vs.push(String(e.eid));
      if (e.nid != null && e.nid !== '' && String(e.nid) !== vs[0]) vs.push(String(e.nid));
      for (j = 0; j < vs.length; j++) { T = tok[vs[j]] || (tok[vs[j]] = { n: 0, c: null }); T.n++; if (!T.c) T.c = e; }
    }
    var rec = function (t) { var q = tok[t]; return q && q.n === 1 ? q.c : null; };
    for (i = 0; i < U.length; i++) {
      u = U[i]; if (!isObj(u) || !u.id || String(u.deptId || '') !== String(d)) continue;
      ek = String(u.ekey || ''); if (!ek || u.role === 'super' || u.role === 'gm' || ek.slice(0, 4) === 'mgr:' || ek.indexOf('gm:') === 0) continue;
      r = rec(ek); if (!r) continue;
      if (!acc.has(r)) acc.set(r, []); acc.get(r).push({ ek: ek, dis: !!u.dis });
    }
    return { rec: rec, acc: acc };
  }
  /* الرمزُ الذي يُكتب في العمود 14 ⇒ حالةُ حسابه (070 tkAcctTok) */
  function acctTok(IX, tok) {
    var t = tok == null ? '' : String(tok), r = t ? IX.rec(t) : null, L, i, dis = 0, oth = 0, othDis = 0;
    if (!r) return 'none';
    L = IX.acc.get(r) || [];
    for (i = 0; i < L.length; i++) { if (L[i].ek === t) { if (!L[i].dis) return 'active'; dis = 1; } else if (!L[i].dis) oth = 1; else othDis = 1; }
    return dis ? 'disabled' : oth ? 'nid' : othDis ? 'disabled' : 'none';
  }
  /* سجلُّ موظفٍ بمعرّفه الثابت (070 tkAcctOf) */
  function acct(users, emps, d, emp) {
    if (!emp || emp.eid == null || emp.eid === '') return 'none';
    var IX = acctIx(users, emps, d);
    return IX.rec(String(emp.eid)) === emp ? acctTok(IX, String(emp.eid)) : 'none';
  }
  /* لكل موظفٍ بالرمز الذي يُسند به (keyOf — BassamEmp.key: المعرّفُ الثابت وإلا رقمُ الهوية) غيرُ النشط وحده — فهرسٌ واحدٌ للقائمة كلِّها (N-2 · N-8 أ) */
  function acctMap(users, emps, d, keyOf) {
    var IX = acctIx(users, emps, d), L = (emps || []).filter(isObj), o = {}, i, k, st;
    for (i = 0; i < L.length; i++) { k = keyOf ? keyOf(L[i]) : L[i].eid; if (k == null || k === '') continue; st = acctTok(IX, k); if (st !== 'active') o[String(k)] = st; }
    return o;
  }
  var ACCT_TXT = { none: 'بلا حسابِ مستخدم', disabled: 'حسابُه معطَّل', nid: 'حسابُه برقم الهوية' };
  /* ما يُصلحه — لتنبيه المنتقي وقائمة «قبول نيابةً» */
  var ACCT_FIX = { none: 'أنشئ له حساباً مرتبطاً بسجلّه أولاً', disabled: 'فعِّل حسابه أولاً', nid: 'اربط حسابَ دخوله بمعرّفه الثابت أولاً' };
  var PH_TXT = { new: 'تنتظر الاستلام', upcoming: 'قادمة', running: 'جارية', stalled: 'متعثّرة', review: 'بانتظار المراجعة', returned: 'أُعيدت للاستكمال',
    expired: 'انقضت مهلتها', done: 'منجزة', declined: 'اعتذار', cancelled: 'ملغاة', reassigned: 'أُعيد إسنادها' };
  NS.BassamTaskModel = { X: X, x: xOf, pol: pol, polTxt: polTxt, rv: rv, win: win, winTxt: winTxt, winFrom: winFrom, winTo: winTo, perf: perf, WIN_DEF: WIN_DEF, state: state, phase: phase, link: link, acct: acct, acctIx: acctIx, acctTok: acctTok, acctMap: acctMap,
    ACCT_TXT: ACCT_TXT, ACCT_FIX: ACCT_FIX, PH_TXT: PH_TXT };
})();
