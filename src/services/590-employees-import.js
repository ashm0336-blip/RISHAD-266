/* ═══ محرّك استيراد الموظفين — وحدةٌ مستقلّة ═══

   كان هذا المنطق ساكناً في صفحة «موظفي الإدارة» وملحوماً بحالتها، وقد نُقل
   الاستيراد إلى «الإعدادات ← استيراد بيانات». يحافظ التحضير على قواعد
   المطابقة والأعمدة وترتيب الملف، ويُراجع القائمة الحالية من الخادم قبل
   التأكيد. الواجهة تُمرّر من مضيفها، والملف يبقى مسودة حتى نجاح المعاملة.
   إعداد الاستيراد محلي فقط؛ الحفظ وتنظيف الحسابات والموارد المرتبطة
   ينفّذهما الخادم في معاملة واحدة ولا تعتمدهما الواجهة قبل إيصال الحفظ. */
/* KIVO_265 · قرارُ المالك (2026-10-19): نوعُ العمل قائمةٌ مغلقة — ما ليس «إداري» أو «ميداني» (مع تسامحٍ في الهمزة والياء) يُستورد فارغاً ليختاره المدير */
function wkNorm9(v){ var s = String(v == null ? "" : v).trim().replace(/\s*ـ?\s*\/\s*ـة\s*$/, "").replace(/ـ+$/, "").replace(/[\u064a\u0649]$/, "ي").replace(/^[\u0623\u0625\u0627]د/, "إد"); if (s === "إداري") return "إداريـ / ـة"; if (s === "ميداني") return "ميدانيـ / ـة"; return ""; }

(function () {
  "use strict";
  var host = { ask: function () {}, close: function () {} }, toastFn = null;
  var ST = { pend: null, y: 0, m: 0, busy: false, uncertain: false, needsReview: false, error: "", snapshot: null, ticket: null };

  /* ── مساعداتٌ صغيرة نُقلت معها: نفس تعريفها في صفحة الموظفين حرفاً بحرف ── */
  function normAr(v) {
    return String(v == null ? "" : v).toLowerCase().replace(/ـ/g, "").replace(/[\u064B-\u0652]/g, "").replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627").replace(/\u0649/g, "\u064A").replace(/\u0629/g, "\u0647").replace(/[\u0624\u0626]/g, "\u0621").trim();
  }
  function empKey(e) {
    if (!e) return "";
    var nid = String(e.nid || "").trim();
    if (nid) return nid;
    var empno = String(e.empno || "").trim();
    if (empno) return "E:" + empno;
    var nm = normAr(e.name);
    if (!nm) return "";
    return "N:" + nm + "|" + String(e.phone || "").trim();
  }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim()); }
  /* ═══════════════════════════════════════════════════════════════════════════
     جدول الأعمدة — المصدر الواحد لكل ما يُنزَّل ويُقرأ
     ─────────────────────────────────────────────────────────────────────────
     لكل عمود: مفتاحه (k)، وعنوانه المعتمد (t) وهو ما ينزل في «ملف الأعمدة»،
     ووجهته (to): سجلُّ الموظف أم سلّةُ الشهر، وأسماؤه البديلة (alt) وهي ما
     يقبله القارئ من كشوف الموارد البشرية ومن تصدير المنصة نفسها.

     ولماذا المطابقة صريحةٌ على هذه القائمة لا بالاحتواء كما كانت؟ لأن الاحتواء
     كان يُصيب بالصدفة ويُخطئ بالصدفة: «التكليف» لا تحتوي «مكلف» فكان العمود
     يسقط صامتاً عند إعادة رفع تصدير الجدول الشهري؛ و«الوردية» كانت تنجو لأن
     «الوردية المسندة» تسبق «وقت الوردية» في ترتيب التصدير لا لأن أحداً قصد
     ذلك — ولو انعكس الترتيب لالتُقط وقتُ الوردية مكان الوردية.
     فصارت المطابقة على ثلاث مراحل: تطابقٌ تامّ مع العنوان المعتمد، ثم مع أحد
     البدائل، ثم احتواءٌ للعنوان المعتمد وحده — وكلُّ خليةِ عنوانٍ تُحجَز لعمودٍ
     واحد فلا يتنازعها عمودان.
     ═══════════════════════════════════════════════════════════════════════════ */
  var COLS = [
    { k: "name",   t: "اسم الموظف",        to: "emp",   alt: ["الاسم", "اسم الموظفة", "الاسم الرباعي"] },
    { k: "gender", t: "الجنس",             to: "emp",   alt: [] },
    { k: "nid",    t: "رقم الهوية",        to: "emp",   alt: ["الهوية", "رقم الهوية الوطنية"] },
    { k: "empno",  t: "الرقم الوظيفي",     to: "emp",   alt: ["الرقم الوظيفى"] },
    { k: "phone",  t: "رقم الجوال",        to: "emp",   alt: ["الجوال", "رقم الجوّال"] },
    { k: "email",  t: "البريد الإلكتروني", to: "emp",   alt: ["البريد", "الايميل"] },
    { k: "type",   t: "نوع التوظيف",       to: "emp",   alt: ["التوظيف", "المسمى الوظيفي"] },
    { k: "work",   t: "نوع العمل",         to: "emp",   alt: ["طبيعة العمل"] },
    { k: "shift",  t: "الوردية",           to: "sched", alt: ["الوردية المسندة", "الوردية المسنده"] },
    { k: "rest",   t: "أيام الراحة",       to: "sched", alt: ["الراحة", "الراحة الأولى", "الراحة الثانية"] },
    { k: "cs",     t: "رمز النداء",        to: "sched", alt: ["رمز النداء الآلي"] },
    { k: "muk",    t: "التكليف",           to: "sched", alt: ["مكلَّف", "مكلف", "التكليف الشهري"] },
    { k: "tpl",    t: "الصلاحيات",         to: "sched", alt: ["القالب", "قالب الصلاحيات", "الصلاحية"] }
  ];
  /* أعمدةٌ تُصدّرها المنصة ولا تُستورد: محسوبةٌ من غيرها أو من نظامٍ آخر.
     تُعرَّف هنا كي يُقال للمستعمل «وجدتُها وتجاهلتُها» بدل الصمت — وكي لا
     يلتقطها الاحتواء مكان عمودٍ حقيقي. */
  var DERIVED = [
    { t: "وقت الوردية",   why: "محسوب من تعريف الوردية" },
    { t: "مدة الوردية",   why: "محسوبة من تعريف الوردية" },
    { t: "الحالة",        why: "محسوبة من أيام الراحة" },
    { t: "حساب الدخول",   why: "يُفعَّل من صفحة الموظفين" }
  ];
  /* تطبيع عنوانٍ للمقارنة: نفس normAr مع طيّ المسافات — فـ«الرقم  الوظيفى» و«الرقم الوظيفي» سواء */
  function hnorm(v) { return normAr(v).replace(/\s+/g, " "); }
  /* خريطة العناوين: تُعيد ix لكل مفتاح، وأعمدة الراحة كلها، والمعروفَ المتجاهَل، والمجهول */
  function mapHeader(hdr) {
    var N = hdr.map(hnorm), taken = {}, ix = {}, i, j;
    COLS.forEach(function (c) { ix[c.k] = -1; });
    var claim = function (c, test) {
      if (ix[c.k] !== -1) return;
      for (j = 0; j < N.length; j++) { if (!taken[j] && N[j] && test(N[j])) { ix[c.k] = j; taken[j] = c.k; return; } }
    };
    /* ① العنوان المعتمد تطابقاً · ② أحد البدائل تطابقاً · ③ احتواء العنوان المعتمد */
    COLS.forEach(function (c) { var t = hnorm(c.t); claim(c, function (h) { return h === t; }); });
    COLS.forEach(function (c) { var a = c.alt.map(hnorm); claim(c, function (h) { return a.indexOf(h) !== -1; }); });
    /* المحسوبة تُحجَز قبل مرحلة الاحتواء كي لا تُلتقط مكان عمودٍ حقيقي */
    var derived = [];
    DERIVED.forEach(function (d) { var t = hnorm(d.t);
      for (j = 0; j < N.length; j++) { if (!taken[j] && N[j] === t) { taken[j] = "~"; derived.push(d); break; } } });
    COLS.forEach(function (c) { var t = hnorm(c.t); claim(c, function (h) { return h.indexOf(t) !== -1; }); });
    /* الراحة قد تأتي في عمودين («الراحة الأولى» و«الراحة الثانية») — تُجمع كلها */
    var restAll = [];
    for (j = 0; j < N.length; j++) {
      if (!N[j]) continue;
      if (taken[j] === "rest") { restAll.push(j); continue; }
      if (!taken[j] && N[j].indexOf("راحه") !== -1) { taken[j] = "rest"; restAll.push(j); }
    }
    /* ما بقي بلا صاحبٍ وفيه نصّ: مجهولٌ يُعلَن */
    var unknown = [];
    for (j = 0; j < N.length; j++) if (!taken[j] && N[j]) unknown.push(String(hdr[j]).trim());
    return { ix: ix, restAll: restAll, derived: derived, unknown: unknown };
  }
  /* عناوين «ملف الأعمدة» — تُقرأ من الجدول نفسه فلا يفترقان أبداً */
  function colTitles() { return COLS.map(function (c) { return c.t; }); }
  /* مفتاح سلّة الشهر: المفتاح الرسمي للموظف (eid) لا رقم الهوية.
     كان الاستيراد يكتب «nid || eid» — أي عكس ترتيب BassamEmp.key بالضبط، وهو
     نفس المرض الذي كُتبت تلك الوحدة لعلاجه: تسكينٌ مربوطٌ برقم الهوية ينفصل عن
     صاحبه متى صُحّحت هويته أو مُلئت بعد فراغ، فيظهر الموظف «بدون تسكين».
     القراءة متسامحة (BassamEmp.entry تجرّب eid ثم nid) فما كُتب قديماً يبقى
     مقروءاً — لكن لا تُكتب سجلاتٌ جديدة بالمفتاح القديم بعد اليوم. */
  function schedKey(e) {
    try { if (KIVO.BassamEmp && KIVO.BassamEmp.key) return KIVO.BassamEmp.key(e); } catch (x) {}
    return (e && (e.eid || e.nid || e.name)) || "";
  }
  function PC(a) { try { return !!(KIVO.BassamPerm && KIVO.BassamPerm.can && KIVO.BassamPerm.can("emps", a)); } catch (e) { return false; } }
  function permDeny() { toast("\u0635\u0644\u0627\u062D\u064A\u062A\u0643 \u0639\u0644\u0649 \u0645\u0648\u0638\u0641\u064A \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0644\u0627 \u062A\u0633\u0645\u062D \u0628\u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621"); }
  function toast(m, kind) { if (toastFn) toastFn(m, kind || "warn"); }
  /* الشهر الهجري الجاري — أساسُ المنتقي حين لا يختار المستعمل شهراً */
  function curHij() {
    try {
      const n = new Date();
      const y = parseInt(new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { year: "numeric" }).format(n));
      const m = parseInt(new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric" }).format(n));
      if (y && m) return { y: y, m: m };
    } catch (e) {}
    return { y: 1448, m: 1 };
  }
  function schedY() { return ST.y || curHij().y; }
  function schedM() { return ST.m || curHij().m; }
  function curHijriKey() {
    try {
      const n = new Date();
      const y = parseInt(new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { year: "numeric" }).format(n));
      const m = parseInt(new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric" }).format(n));
      if (y && m) return y + "-" + m;
    } catch (e) {}
    return "";
  }
  /* Employee intents share one server-owned transaction. The browser neither
     removes accounts nor writes related KV/CU documents before its receipt. */
  var transitionTickets = new WeakMap();
  function deep(value) { return JSON.parse(JSON.stringify(value)); }
  function nonnegative(value) { return Number.isSafeInteger(value) && value >= 0; }
  function actor() {
    var boot = window.__BS_BOOT || {}, auth = KIVO.BassamAuth, user = auth && auth.user && auth.user();
    var dept = KIVO.BassamDepts && KIVO.BassamDepts.active && KIVO.BassamDepts.active();
    if (boot.srv !== 1 || boot.cf !== 1 || !boot.uid || !user || String(user.id) !== String(boot.uid) || !dept) return null;
    return { uid: String(boot.uid), dept: String(dept), key: String(boot.uid) + '\u0000' + String(dept) };
  }
  function sameActor(stamp) { var now = actor(); return !!now && now.key === stamp.key; }
  function fail(code, status) {
    var messages = {
      session: 'تغيّرت الجلسة أو الإدارة؛ أعد تحميل الصفحة قبل المتابعة',
      crypto: 'تعذّر إعداد بصمة كلمة المرور بأداة الحسابات الأصلية؛ لم يُرسل أي طلب حفظ',
      pending: 'توجد تغييرات محلية لم يؤكدها الخادم؛ انتظر اكتمال حفظها ثم أعد المراجعة',
      conflict: 'تغيّرت بيانات الإدارة على الخادم؛ المسودة محفوظة، راجع البيانات الحالية ثم أعد التأكيد',
      forbidden: 'صلاحيتك لا تسمح بهذه العملية؛ لم يُعتمد أي تغيير',
      network: 'تعذّر تأكيد الحفظ؛ المسودة محفوظة، أعد المحاولة بنفس الطلب',
      invalid: 'لم يصل تأكيد حفظ كامل؛ المسودة محفوظة، أعد المحاولة بنفس الطلب',
      uncertain: 'توجد عملية لم يُحسم تأكيدها؛ أعد محاولة العملية نفسها قبل تغيير المسودة',
      reason: 'يشترط الخادم سبباً لهذا الإجراء؛ المسودة محفوظة حتى تأكيده',
      'reason-cancelled': 'أُلغي إدخال السبب؛ لم يُعتمد التغيير والمسودة محفوظة',
      'emp-dup': 'توجد هوية أو جوال أو رقم وظيفي مكرر؛ راجع البيانات، لم يُعتمد الاستيراد',
    };
    return { ok: 0, err: code, status: status || 0, message: messages[code] || 'رفض الخادم العملية؛ راجع البيانات والصلاحية ثم أعد المحاولة' };
  }
  function localPending() {
    try { var srv = KIVO.__BS_SRV; return !!(srv && ((srv.dirty && srv.dirty()) || (srv.inflight && srv.inflight()))); }
    catch (error) { return true; }
  }
  async function transitionRequest(url, options, stamp) {
    if (!stamp || !sameActor(stamp)) return fail('session', 401);
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var response = await fetch(url, Object.assign({ credentials: 'same-origin', cache: 'no-store', signal: controller.signal }, options));
      if (!sameActor(stamp)) return fail('session', 401);
      var value; try { value = await response.json(); } catch (error) { return fail('invalid', response.status); }
      if (!sameActor(stamp)) return fail('session', 401);
      if (!response.ok || !value || value.ok !== 1) {
        var denials = Object.entries(value && value.denied || {}), reasonOnly = denials.length && denials.every(function (pair) { return pair[1] && pair[1].why === 'reason'; });
        if (response.status === 403 && value && (value.why === 'reason' || reasonOnly)) {
          var reasonKeys = Array.isArray(value.reasonKeys) ? value.reasonKeys.slice() : [];
          denials.forEach(function (pair) { if (Array.isArray(pair[1].reasonKeys)) reasonKeys.push.apply(reasonKeys, pair[1].reasonKeys); });
          return Object.assign(fail('reason', 403), { reasonKey: denials.length ? denials[0][0] : 'bsdept:' + stamp.dept + ':bassam_employees_v1', reasonKeys: Array.from(new Set(reasonKeys.filter(function (key) { return typeof key === 'string'; }))) });
        }
        var code = response.status === 401 ? 'session' : response.status === 403 ? 'forbidden' : response.status === 409 ? 'conflict' : String(value && value.err || 'invalid');
        return fail(code, response.status);
      }
      return { ok: 1, data: value };
    } catch (error) { return fail(sameActor(stamp) ? 'network' : 'session'); }
    finally { clearTimeout(timer); }
  }
  function validBase(base, dept) {
    return !!base && nonnegative(base.epoch) && nonnegative(base.custody) && !!base.kv && typeof base.kv === 'object' && !Array.isArray(base.kv)
      && Object.keys(base.kv).every(function (key) { return nonnegative(base.kv[key]); })
      && nonnegative(base.kv['bsdept:' + dept + ':bassam_employees_v1']);
  }
  async function transitionRead(intent) {
    var stamp = actor(); if (!stamp) return fail('session', 401);
    if (localPending()) return fail('pending');
    if (intent !== 'delete' && intent !== 'import') return fail('invalid');
    var result = await transitionRequest('/api/employees/transition?' + new URLSearchParams({ dept: stamp.dept, intent: intent }), { method: 'GET' }, stamp);
    if (!result.ok) return result;
    var data = result.data;
    if (data.dept !== stamp.dept || data.intent !== intent || !validBase(data.base, stamp.dept) || !Array.isArray(data.employees) || !Array.isArray(data.staffAccountKeys) || data.staffAccountKeys.some(function (key) { return typeof key !== 'string'; }) || !data.options || !Array.isArray(data.options.type) || !Array.isArray(data.options.work) || !data.clock || !Number.isSafeInteger(data.clock.y) || !Number.isSafeInteger(data.clock.m)) return fail('invalid');
    return { ok: 1, data: deep(data), contextKey: stamp.key };
  }
  async function transitionPrepare(intent, input, snapshot) {
    var stamp = actor(); if (!stamp) return fail('session', 401);
    if (localPending()) return fail('pending');
    if (!snapshot || snapshot.contextKey !== stamp.key || !snapshot.data || snapshot.data.intent !== intent || !validBase(snapshot.data.base, stamp.dept) || !input || !Array.isArray(input.finalRows) || !window.crypto || !window.crypto.getRandomValues) return fail('invalid');
    var bytes = new Uint8Array(20); window.crypto.getRandomValues(bytes);
    var requestId = 'emp-' + Array.from(bytes, function (n) { return n.toString(16).padStart(2, '0'); }).join('');
    var body = Object.assign({}, deep(input), { uid: stamp.uid, dept: stamp.dept, intent: intent, requestId: requestId, base: deep(snapshot.data.base) });
    var auth = KIVO.BassamAuth, user = auth && auth.user && auth.user(), known = new Set(snapshot.data.staffAccountKeys || []), proposals = [];
    /* Same initial PIN as 330 autoActivate: the employee number. Only its p2
       hash leaves this in-memory preparation. Existing/frozen accounts are
       excluded by the server context, and the server still decides eligibility. */
    if (!(user && user.role === 'staff' && !user.mgr)) {
      try {
        for (var row of body.finalRows) {
          if (!row || typeof row !== 'object') continue;
          var key = String(row.eid || row.nid || row.name || ''), number = String(row.empno || '').trim();
          if (!key || known.has(key) || !(String(row.nid || '').trim() || String(row.phone || '').trim()) || !number) continue;
          if (!auth || typeof auth.hashPw !== 'function') return fail('crypto');
          var ph = await auth.hashPw(number);
          if (!sameActor(stamp)) return fail('session', 401);
          if (typeof ph !== 'string' || !/^p2\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/i.test(ph)) return fail('crypto');
          proposals.push({ ekey: key, ph: ph }); known.add(key);
        }
      } catch (error) { return fail('crypto'); }
    }
    if (!sameActor(stamp)) return fail("session", 401);
    if (localPending()) return fail("pending");
    body.accountProposals = proposals;
    var ticket = Object.freeze({ requestId: requestId, intent: intent });
    transitionTickets.set(ticket, { stamp: stamp, body: JSON.stringify(body) }); return ticket;
  }
  async function transitionSend(ticket, asked) {
    var prepared = transitionTickets.get(ticket); if (!prepared || !sameActor(prepared.stamp)) return fail('session', 401);
    var result = await transitionRequest('/api/employees/transition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: prepared.body }, prepared.stamp);
    if (!result.ok) {
      var srv = KIVO.__BS_SRV;
      if (result.err !== 'reason' || asked || !srv || typeof srv.askReason !== 'function') return result;
      var reason = await new Promise(function (resolve) { srv.askReason(result.reasonKey, result.reasonKeys, resolve); });
      if (!sameActor(prepared.stamp)) return fail('session', 401);
      if (typeof reason !== 'string' || !reason.trim()) return fail('reason-cancelled');
      var body = JSON.parse(prepared.body), bytes = new Uint8Array(20); window.crypto.getRandomValues(bytes);
      body.requestId = 'emp-' + Array.from(bytes, function (n) { return n.toString(16).padStart(2, '0'); }).join(''); body.reason = reason.trim();
      var next = Object.freeze({ requestId: body.requestId, intent: ticket.intent });
      transitionTickets.set(next, { stamp: prepared.stamp, body: JSON.stringify(body) });
      var retried = await transitionSend(next, true); retried.ticket = next; return retried;
    }
    var ack = result.data;
    if (ack.dept !== prepared.stamp.dept || ack.intent !== ticket.intent || ack.requestId !== ticket.requestId || !nonnegative(ack.rev) || !ack.revs || typeof ack.revs !== 'object' || Array.isArray(ack.revs) || !Object.keys(ack.revs).every(function (key) { return nonnegative(ack.revs[key]); }) || !ack.counts || typeof ack.counts !== 'object' || Array.isArray(ack.counts) || !['employees', 'removed', 'accountsCreated', 'accountsRemoved', 'schedule', 'templates'].every(function (name) { return nonnegative(ack.counts[name]); })) return fail('invalid');
    return { ok: 1, receipt: deep(ack) };
  }
  var Transition = Object.freeze({ context: actor, read: transitionRead, prepare: transitionPrepare, send: transitionSend });
  function notify() { if (host.change) host.change(); }
  function importSummary(pend, employees) {
    var keys = new Set(); (employees || []).forEach(function (emp) { matchKeys(emp).forEach(function (key) { keys.add(key); }); });
    var duplicate = pend.cands.filter(function (c) { return matchKeys(c.emp).some(function (key) { return keys.has(key); }); }).length;
    return { file: pend.cands.length, cur: employees.length, dup: duplicate, fresh: pend.cands.length - duplicate };
  }
  function matchKeys(emp) {
    var keys = [], nid = String(emp && emp.nid || '').trim(), no = String(emp && emp.empno || '').trim(), name = normAr(emp && emp.name);
    if (nid) keys.push(nid); if (no) keys.push('E:' + no); if (name) keys.push('N:' + name + '|' + String(emp && emp.phone || '').trim()); return keys;
  }
  async function reviewImport() {
    var pend = ST.pend; if (!pend || ST.busy) return fail('invalid');
    if (ST.uncertain) { var uncertain = fail('uncertain'); toast(uncertain.message); return uncertain; }
    ST.busy = true; notify();
    try {
      var result = await transitionRead('import'); if (ST.pend !== pend) return fail('invalid');
      if (!result.ok) { ST.error = result.message; toast(result.message); return result; }
      ST.snapshot = result; ST.ticket = null; ST.needsReview = false; ST.error = ''; ST.mode = '';
      if (!ST.y || !ST.m) { ST.y = result.data.clock.y; ST.m = result.data.clock.m; }
      host.ask(importSummary(pend, result.data.employees)); return { ok: 1 };
    } finally { ST.busy = false; notify(); }
  }
  function summaryParts(plan, pend) {
    var parts = [];
    if (plan.added) parts.push('أُضيف ' + plan.added + ' موظف');
    if (plan.updated) parts.push('حُدّث ' + plan.updated + ' موظف');
    if (plan.skipped) parts.push('تُخطي ' + plan.skipped + ' مكرر');
    if (plan.rejected) parts.push('رُفض ' + plan.rejected + ' صف مخالف لقواعد الأرقام أو التكرار');
    if (pend.inFileDup) parts.push('تكرار داخل الملف: ' + pend.inFileDup);
    if (pend.noName) parts.push('صفوف بلا اسم: ' + pend.noName);
    if (pend.badLen) parts.push('أُفرغت قيم الهوية/الجوال غير الصالحة في ' + pend.badLen + ' صف');
    if ((pend.derived || []).length) parts.push('أعمدة محسوبة لم تُستورد: ' + pend.derived.map(function (d) { return d.t; }).join('، '));
    if ((pend.unknown || []).length) parts.push('أعمدة غير معروفة تُجوهلت: ' + pend.unknown.join('، '));
    return parts;
  }
  async function commit(mode) {
    var pend = ST.pend; if (!pend || ST.busy) return;
    if (['add', 'update', 'replace'].indexOf(mode) < 0) return;
    var need = mode === 'replace' ? 'del' : mode === 'update' ? 'edit' : 'add';
    if (!PC('add') || !PC(need)) { permDeny(); return; }
    if (mode === 'replace' && !(KIVO.BassamPerm && KIVO.BassamPerm.can && KIVO.BassamPerm.can('admin/import', 'del'))) { toast('الاستبدال الكامل يتطلب صلاحية النسخ والاستيراد: حذف'); return; }
    if (ST.needsReview || !ST.snapshot) { toast('راجع بيانات الإدارة الحالية قبل تأكيد الاستيراد؛ الملف والمسودة محفوظان'); return; }
    if (ST.ticket && (ST.mode !== mode || ST.ticketMonth !== schedY() + '-' + schedM())) { toast(fail('uncertain').message); return; }
    var stamp = actor(); if (!stamp || stamp.key !== ST.snapshot.contextKey) { toast(fail('session').message); return; }
    ST.busy = true; ST.error = ''; notify();
    try {
      if (!ST.ticket) {
        ST.plan = prepareImport(pend, mode, ST.snapshot.data);
        ST.ticket = await transitionPrepare('import', { finalRows: ST.plan.finalRows, options: ST.plan.options, import: { mode: mode, year: schedY(), month: schedM(), schedule: ST.plan.schedule, templates: ST.plan.templates } }, ST.snapshot);
        if (ST.ticket.ok === 0) { ST.error = ST.ticket.message; toast(ST.error); ST.ticket = null; return; }
        ST.mode = mode; ST.ticketMonth = schedY() + '-' + schedM();
      }
      var result = await transitionSend(ST.ticket);
      if (result.ticket) ST.ticket = result.ticket;
      if (ST.pend !== pend) return;
      if (!result.ok) {
        ST.error = result.message; ST.needsReview = result.err === 'conflict';
        ST.uncertain = result.err === 'network' || result.err === 'invalid' || result.err === 'session';
        if (!ST.uncertain && !ST.needsReview && result.err !== 'reason' && result.err !== 'reason-cancelled') ST.ticket = null;
        toast(result.message); return;
      }
      var parts = summaryParts(ST.plan, pend), warnings = result.receipt.warnings || [];
      var warningText = {
        'schedule-disabled': 'لم تُكتب أعمدة الجدول الشهري لأن الصفحة غير مفعلة في الإدارة',
        'schedule-locked': 'الجدول الشهري معتمد ومقفل؛ لم تُطبق أعمدته',
        'schedule-shift-unknown': 'تجاهل الخادم اسم وردية غير صالح',
        'templates-disabled': 'لم تُمنح قوالب الصلاحيات لأنها غير مفعلة في الإدارة',
        'templates-manager-required': 'لم تُمنح القوالب لأن إدارة الصلاحيات تتطلب دور المدير',
        'template-unknown': 'تجاهل الخادم قالب صلاحيات غير معروف في الإدارة',
        'template-empty': 'يوجد قالب بلا صلاحيات داخل سقف الإدارة؛ لم يُمنح',
        'template-self-grant-unchanged': 'لم تُغيّر صلاحيات المستورد الشخصية عن طريق الملف',
        'template-unheld-key-omitted': 'استُبعدت صلاحيات لا يملكها المستورد من القالب',
        'account-login-unavailable': 'تعذر تفعيل حساب لعدم توفر اسم دخول فريد؛ بقي الموظف مسجلاً',
      };
      if (result.receipt.counts.accountsCreated) parts.push('فُعّل تلقائياً ' + result.receipt.counts.accountsCreated + ' حساب دخول');
      if (result.receipt.counts.schedule) parts.push('عولج ' + result.receipt.counts.schedule + ' سجل في جدول الشهر المختار');
      if (result.receipt.counts.templates) parts.push('مُنح ' + result.receipt.counts.templates + ' قالب صلاحيات');
      if (Array.isArray(warnings)) Array.from(new Set(warnings)).forEach(function (warning) { parts.push(warningText[warning] || 'اعتمد الخادم العملية مع تنبيه يحتاج مراجعة البيانات'); });
      if (!parts.length) parts.push('اعتمد الخادم الاستيراد');
      ST.pend = null; ST.snapshot = null; ST.ticket = null; ST.uncertain = false; ST.needsReview = false; host.close(); toast(parts.join(' · '), ST.plan.rejected || warnings.length ? 'warn' : 'ok');
      try { var sync = KIVO.__BS_SRV; if (sync && sync.resync) sync.resync(false); } catch (error) {}
    } finally { ST.busy = false; notify(); }
  }

  function prepareImport(pend, mode, current) {
    const cands = deep(pend.cands), opts = deep(current.options);
    const base = mode === "replace" ? [] : deep(current.employees);
    const idxOf = {};
    // كان: المطابقة بالهوية وحدها فيتكرر الملف كله عند غيابها — نستخدم المفتاح المتدرّج نفسه
    /* ولا يكفي المفتاح الأعلى وحده من الطرفين: كان الموجود يُفهرَس بهويته
       والوارد يُطلَب بهويته، فملفٌ بلا عمود هوية — وتصدير «الجدول الشهري» منه،
       إذ ليس فيه هوية ولا بريد — يُخفق في المطابقة فيُضاف الجميع من جديد
       ويتضاعف الكشف كله. فصار كلُّ موظفٍ يُفهرَس بمفاتيحه الثلاثة معاً،
       ويُطلَب الوارد بأيٍّ منها بالترتيب: الهوية ثم الرقم الوظيفي ثم الاسم+الجوال. */
    const keysOf = (e) => {
      const out = [];
      const nid = String((e && e.nid) || "").trim(); if (nid) out.push(nid);
      const empno = String((e && e.empno) || "").trim(); if (empno) out.push("E:" + empno);
      const nm = normAr(e && e.name); if (nm) out.push("N:" + nm + "|" + String((e && e.phone) || "").trim());
      return out;
    };
    base.forEach((e, i) => { keysOf(e).forEach(k => { if (idxOf[k] === undefined) idxOf[k] = i; }); });
    const findAt = (e) => { const ks = keysOf(e); for (let i2 = 0; i2 < ks.length; i2++) if (idxOf[ks[i2]] !== undefined) return idxOf[ks[i2]]; return -1; };
    const hasCol = pend.cols || { name: 1, empno: 1, phone: 1, type: 1, work: 1, gender: 1 };
    const list = [...base];
    const fresh = [];
    const schedRows = [], tplRows = [];
    let added = 0, updated = 0, skipped = 0, rejected = 0;
    /* ═══ قواعد الأرقام تسري على الاستيراد أيضاً — وإلا صار باباً خلفياً للتكرار ═══
       الهوية والجوال: 10 أرقام أو فارغ؛ الرقم الوظيفي: 5 أو 6 أرقام أو فارغ؛ ولا
       تكرار داخل الملف نفسه ولا مع أي إدارة في الموقع. الصف المخالف يُرفض ويُعدّ. */
    const seenN = {}, seenP = {}, seenO = {};
    (base || []).forEach(e => { if (e) { if (e.nid) seenN[String(e.nid).trim()] = 1; if (e.phone) seenP[String(e.phone).trim()] = 1; if (e.empno) seenO[String(e.empno).trim()] = 1; } });
    const rowOk = (emp, isUpdate) => {
      const n = String(emp.nid || "").trim(), ph = String(emp.phone || "").trim(), no = String(emp.empno || "").trim();
      if (n && !/^\d{10}$/.test(n)) return false;
      if (ph && !/^\d{10}$/.test(ph)) return false;
      if (no && !/^\d{5,6}$/.test(no)) return false;
      if (!isUpdate) {
        if (n && seenN[n]) return false;
        if (ph && seenP[ph]) return false;
        if (no && seenO[no]) return false;
      }
      if (n) seenN[n] = 1; if (ph) seenP[ph] = 1; if (no) seenO[no] = 1;
      return true;
    };
    cands.forEach(c => {
      const emp = c.emp;
      ["type","work"].forEach(k => { if (emp[k] && opts[k] && opts[k].indexOf(emp[k]) === -1) opts[k] = [...opts[k], emp[k]]; });
      const at = findAt(emp);
      if (at >= 0) {
        if (mode !== "update") { skipped++; return; }
        if (!rowOk(emp, true)) { rejected++; return; }
        const mg = { ...list[at] };
        // كان: الخلية الفارغة تُتجاهل فلا يمكن تفريغ حقل من الملف — نميّز غياب العمود عن الخلية الفارغة
        ["name","empno","phone","type","work","gender"].forEach(k => { if (!hasCol[k]) return; if (c.blank && c.blank[k]) return; if (k === "name" && !emp[k]) return; mg[k] = emp[k] || ""; });
        list[at] = mg; updated++;
        if (c.sh || c.rs || c.cs || c.muk) schedRows.push({ key: schedKey(mg), shift: c.sh, rest: c.rs, cs: c.cs, muk: c.muk });
        if (c.tpl && c.tpl !== "—") tplRows.push({ key: schedKey(mg), name: c.tpl });
      } else {
        if (!rowOk(emp, false)) { rejected++; return; }
        fresh.push(emp); added++;
        if (c.sh || c.rs || c.cs || c.muk) schedRows.push({ key: schedKey(emp), shift: c.sh, rest: c.rs, cs: c.cs, muk: c.muk });
        if (c.tpl && c.tpl !== "—") tplRows.push({ key: schedKey(emp), name: c.tpl });
      }
    });
    // كان: وضع الاستبدال يعكس ترتيب الملف رغم أن الملف هو القائمة كاملة — العكس للإضافة فقط (محاكاة unshift)
    const finalList = mode === "replace" ? fresh.concat(list) : fresh.slice().reverse().concat(list);
    return { finalRows: finalList, options: opts, schedule: schedRows, templates: tplRows, added: added, updated: updated, skipped: skipped, rejected: rejected };
  }
  /* الملتقِط: يفتح مربّع الملفات ثم يقرأ ويحضّر المرشّحين — كما كان حرفاً بحرف */
  function pickFile() {
    if (ST.pend || ST.busy) { toast("توجد مسودة استيراد؛ أكملها أو ألغها أولاً"); return; }
        const inp = document.createElement("input");
        inp.type = "file"; inp.accept = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        inp.onchange = () => {
          const file = inp.files && inp.files[0]; if (!file) return;
          const isXlsx = /\.xlsx$/i.test(file.name || "");
                    const process = async (rows2) => {
            try {
              if (rows2.length < 2) { toast("الملف فارغ أو بدون بيانات"); return; }
              let hdrRow = -1;
              // كان: يُشترط عمود «الهوية» رغم أنه اختياري فتُرفض كشوف الموارد البشرية العادية — يكفي الاسم مع أي عمود معروف آخر
              /* والتعرّف صار بجدول الأعمدة نفسه لا بقائمةٍ ثانية تُنسى: كانت القائمة
                 تخلو من «التكليف» و«رمز النداء»، فملفٌ عمودُه الاسم والتكليف لا
                 يُعرَف صفُّ عناوينه أصلاً. */
              for (let hi = 0; hi < Math.min(rows2.length, 15); hi++) {
                const hm0 = mapHeader(rows2[hi].map(h => String(h == null ? "" : h).trim()));
                let other = hm0.restAll.length > 0;
                COLS.forEach(c => { if (c.k !== "name" && hm0.ix[c.k] !== -1) other = true; });
                if (hm0.ix.name !== -1 && other) { hdrRow = hi; break; }
              }
              if (hdrRow === -1) { toast("الأعمدة غير معروفة — استخدم نفس أعمدة ملف التصدير"); return; }
              const hdr = rows2[hdrRow].map(h => String(h == null ? "" : h).trim());
              /* الخريطة من جدول الأعمدة الواحد — لا مطابقة بالاحتواء العَرَضي */
              const HM = mapHeader(hdr);
              const ix = HM.ix;
              const ixRestAll = HM.restAll;
              if (ix.name === -1) { toast("لم يتم العثور على عمود «اسم الموظف» — تأكد من صف العناوين"); return; }
              const fileSeen = new Set();
              const cands = [];
              let inFileDup = 0, noName = 0, badLen = 0;
              rows2.slice(hdrRow + 1).forEach(r => {
                /* «—» في ملفٍ صدّرته المنصة = خلية فارغة لا قيمة */
                const g = (i) => { if (i === -1) return ""; const v = String(r[i] || "").trim(); return (v === "—" || v === "-" || v === "–") ? "" : v; };
                const name = g(ix.name);
                /* كان كل صفٍّ بلا اسم يُعدّ «صفاً بلا اسم» — والنموذج المهيَّأ سلفاً
                   فيه مئات الصفوف الفارغة تماماً، فتقول الرسالة «تُخطي 795 صف بلا
                   اسم» فيظنّ القارئ أن ملفه ضاع. الصف الخالي من كل شيء ليس نقصاً
                   بل فراغ — ولا يُعدّ إلا صفٌّ فيه بيانات واسمه ناقص. */
                if (!name) {
                  var anyVal = false;
                  for (var ci = 0; ci < r.length; ci++) { if (String(r[ci] == null ? "" : r[ci]).trim() !== "") { anyVal = true; break; } }
                  if (anyVal) noName++;
                  return;
                }
                // كان: صف المثال في النموذج الفارغ يُستورد كموظف حقيقي ويحجز الهوية 1010101010 — نتخطاه
                if (/^مثال/.test(name) || name.indexOf("احذف هذا الصف") !== -1) return;
                // كان: الاستيراد يتجاوز فحص 10 أرقام فتنشأ سجلات يتعذّر حفظ أي تعديل عليها — نُفرّغ القيمة غير الصالحة ونعدّ الصف
                let nid = g(ix.nid).replace(/\D/g, "");
                let phone = g(ix.phone).replace(/\D/g, "");
                const blank = {};
                let badRow = false;
                if (nid && nid.length !== 10) { nid = ""; badRow = true; }
                if (phone && phone.length !== 10) { phone = ""; blank.phone = 1; badRow = true; }
                if (badRow) badLen++;
                const empno = g(ix.empno);
                const gRaw = g(ix.gender).trim();
                const gender = /^ذكر/.test(gRaw) ? "ذكر" : (/^(أنثى|انثى|أنثي|انثي)/.test(gRaw) ? "أنثى" : "");
                const emailV = g(ix.email).trim();
                const emp = { name, nid, empno, phone, email: emailOk(emailV) ? emailV : "", type: g(ix.type) || "", work: wkNorm9(g(ix.work)), gender, eid: "e" + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36), group: "بدون مجموعة", account: "بانتظار التفعيل", contact: "غير متوفر" };
                // كان: كشف التكرار داخل الملف يعتمد على الهوية وحدها فيتضاعف الكشف كله عند غيابها — مفتاح متدرّج
                const key = empKey(emp);
                if (key && fileSeen.has(key)) { inFileDup++; return; }
                if (key) fileSeen.add(key);
                cands.push({ emp, sh: g(ix.shift), rs: ixRestAll.map(g).filter(Boolean).join(" - "), blank: blank,
                  cs: g(ix.cs), muk: g(ix.muk), tpl: ix.tpl !== -1 ? g(ix.tpl) : "" });
              });
              // كان: عند سقوط كل الصفوف لا يُذكر سبب الإسقاط — نُظهر عدد الصفوف بلا اسم
              if (!cands.length) { toast("لا توجد صفوف صالحة في الملف" + (noName ? " · " + KIVO.BassamCount(noName,"صف") + " بلا اسم" : "")); return; }
              ST.pend = { cands: cands, inFileDup: inFileDup, noName: noName, badLen: badLen, cols: { name: ix.name !== -1, empno: ix.empno !== -1, phone: ix.phone !== -1, type: ix.type !== -1, work: ix.work !== -1, gender: ix.gender !== -1, tpl: ix.tpl !== -1 },
                sched: { shift: ix.shift !== -1, rest: ixRestAll.length > 0, cs: ix.cs !== -1, muk: ix.muk !== -1 },
                /* ما وُجد في الملف ولا يُستورد — يُصارَح به المستعمل بدل التجاهل الصامت */
                derived: HM.derived, unknown: HM.unknown };
              ST.snapshot = null; ST.ticket = null; ST.uncertain = false; ST.needsReview = false; ST.error = "";
              host.ask(importSummary(ST.pend, []));
              await reviewImport();
            } catch (err) { toast("تعذر قراءة الملف — تأكد أنه ملف Excel صحيح"); }
          };
          if (!isXlsx) { toast("الرجاء اختيار ملف Excel بصيغة xlsx"); return; }
          if (!KIVO.BassamXLSX) { toast("تعذّر قراءة ملف Excel في هذا المتصفح"); return; }
          file.arrayBuffer().then(buf => KIVO.BassamXLSX.parse(buf)).then(function(rows){ var B = KIVO.BassamBusy; return B ? B.run(function(){ process(rows); }, "جارٍ معالجة صفوف الملف…", { sub: KIVO.BassamCount((rows || []).length,"صف") + "" }) : process(rows); }).catch(() => toast("تعذّر قراءة ملف Excel — تأكد أنه ملف xlsx صحيح"));
        };
        inp.click();
  }
  KIVO.BassamEmpImp = {
    /* الواجهة يملكها المضيف: ask تفتح نافذة التأكيد، و close تغلقها */
    mount: function (o) { host = { ask: (o && o.ask) || function () {}, close: (o && o.close) || function () {}, change: (o && o.change) || function () {} }; toastFn = (o && o.toast) || null; },
    pick: function () { pickFile(); },
    commit: commit,
    pending: function () { return ST.pend; },
    drop: function () {
      if (ST.busy || ST.uncertain) { toast(fail("uncertain").message); return false; }
      ST.pend = null; ST.snapshot = null; ST.ticket = null; ST.error = ""; ST.needsReview = false; return true;
    },
    review: reviewImport,
    status: function () { return { busy: ST.busy, uncertain: ST.uncertain, needsReview: ST.needsReview || !ST.snapshot, error: ST.error }; },
    transition: Transition,
    month: function () { return { y: schedY(), m: schedM() }; },
    setMonth: function (y, m) {
      if (ST.busy || ST.ticket) { toast(fail("uncertain").message); return; }
      ST.y = y; ST.m = m;
    },
    /* جدول الأعمدة للواجهة: «نزّل ملف الأعمدة» يقرأ منه — فالنموذج والقارئ
       لا يفترقان أبداً، وزيادةُ عمودٍ هنا تنزل في الملف وتُقرأ منه بسطرٍ واحد */
    colTitles: colTitles,
    cols: function () { return COLS.map(function (c) { return { k: c.k, t: c.t, to: c.to }; }); },
    curHij: curHij,
    curHijriKey: curHijriKey
  };
})();
