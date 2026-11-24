/* ملف مولَّد — لا يُحرَّر يدوياً، المصدر: src/slots/services/590-employees-import.js.tpl */
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
    { k: "muk",    t: "التكليف",           to: "sched", alt: ["مكلَّف", "مكلف", "التكليف الشهري"] }
  ];
  /* أعمدةٌ تُصدّرها المنصة ولا تُستورد: محسوبةٌ من غيرها أو من نظامٍ آخر.
     تُعرَّف هنا كي يُقال للمستعمل «وجدتُها وتجاهلتُها» بدل الصمت — وكي لا
     يلتقطها الاحتواء مكان عمودٍ حقيقي. */
  var DERIVED = [
    { t: "وقت الوردية",   why: "محسوب من تعريف الوردية" },
    { t: "مدة الوردية",   why: "محسوبة من تعريف الوردية" },
    { t: "الحالة",        why: "محسوبة من أيام الراحة" },
    { t: "حساب الدخول",   why: "يُفعَّل من صفحة الموظفين" },
    /* V7 · د5-ح: قوالبُ الصلاحيات حُذفت — عمودُ «الصلاحيات» لا يمنح شيئاً؛ الدورُ يُسنَد من «الإعدادات ← الصلاحيات ← الأشخاص» */
    { t: "الصلاحيات",     why: "تُسنَد الأدوار من «الإعدادات ← الصلاحيات ← الأشخاص»" }
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
      const h = KIVO.BassamCal.hParts(new Date()), y = h.y, m = h.m;   /* V7 · د5-د2 */
      if (y && m) return { y: y, m: m };
    } catch (e) {}
    return { y: 1448, m: 1 };
  }
  function schedY() { return ST.y || curHij().y; }
  function schedM() { return ST.m || curHij().m; }
  function curHijriKey() {
    try {
      const h = KIVO.BassamCal.hParts(new Date()), y = h.y, m = h.m;   /* V7 · د5-د2 */
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
        /* V7 · د1-د: رفضٌ سببُه تكرارُ الهوية أو الجوال أو الرقم الوظيفي (emp-dup — قد يكون مع موظفٍ في وحدةٍ أخرى) يُقال بسببه، لا «صلاحيتك لا تسمح» */
        if (response.status === 403 && denials.length && denials.every(function (pair) { return pair[1] && pair[1].why === 'emp-dup'; })) return fail('emp-dup', 403);
        /* V7 · د7: رفضُ التكرار المفصَّل من الانتقال (019c empDupList): الحقل · القيمة · أين — يُترجمه المستدعي إلى أرقام صفوف الملف */
        if (response.status === 403 && value && value.err === 'emp-dup') return Object.assign(fail('emp-dup', 403), { dup: Array.isArray(value.dup) ? value.dup.filter(function (x) { return x && typeof x.v === 'string' && typeof x.f === 'string'; }) : [] });
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
  function acctTouched(before, row, key) {
    var o = (before || []).filter(function (x) { return x && typeof x === 'object' && String(x.eid || x.nid || x.name || '') === key; })[0];
    if (!o) return true;
    return ['nid', 'phone', 'empno'].some(function (f) { return String(o[f] || '').trim() !== String(row[f] || '').trim(); });
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
          /* V7 · د6 (QA ١٣ · ١٢): لا حسابَ إلا لصفٍّ هو هدفُ الانتقال (جديد · أو تغيّرت بياناتُ دخوله) — قاعدةُ الخادم نفسُها (019c empAcctTouched).
             كان كلُّ معلّقٍ باقٍ يُقترح له حساب: الحذفُ يفعّل حساباتِ آخرين، ويفشل كلُّه «crypto» حين تغيب أداةُ البصمة */
          if (!acctTouched(snapshot.data.employees, row, key)) continue;
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
    if (ack.dept !== prepared.stamp.dept || ack.intent !== ticket.intent || ack.requestId !== ticket.requestId || !nonnegative(ack.rev) || !ack.revs || typeof ack.revs !== 'object' || Array.isArray(ack.revs) || !Object.keys(ack.revs).every(function (key) { return nonnegative(ack.revs[key]); }) || !ack.counts || typeof ack.counts !== 'object' || Array.isArray(ack.counts) || !['employees', 'removed', 'accountsCreated', 'accountsRemoved', 'schedule'].every(function (name) { return nonnegative(ack.counts[name]); })) return fail('invalid');
    try { if (KIVO.__BS_SRV && KIVO.__BS_SRV.mine) await KIVO.__BS_SRV.mine(ack.revs); } catch (e) { /* V7 · د6 (QA) · البند ٥: علامةٌ للشريط · V7 · د7: وتجديدُ حقبة طبقة الحفظ قبل إعلان النجاح (280 srvSettle9) */ }   /* نقلٌ · إنشاءُ حسابات · استيراد · حذف: من فعلي */
    return { ok: 1, receipt: deep(ack) };
  }
  var Transition = Object.freeze({ context: actor, read: transitionRead, prepare: transitionPrepare, send: transitionSend });
  function notify() { if (host.change) host.change(); }
  function importSummary(pend, employees) {
    var keys = new Set(); (employees || []).forEach(function (emp) { matchKeys(emp).forEach(function (key) { keys.add(key); }); });
    var duplicate = pend.cands.filter(function (c) { return matchKeys(c.emp).some(function (key) { return keys.has(key); }); }).length;
    /* V7 · د7: المعاينةُ تحذّر قبل الاختيار — الصفوفُ التي سيرفضها كلُّ خيار برقم صفّها وسببها (القاعدةُ نفسُها: prepareImport) */
    var cur = { employees: employees || [], options: { type: [], work: [] } }, R = {};
    ['update', 'add', 'replace'].forEach(function (mode) { R[mode] = prepareImport(pend, mode, cur).rejects; });
    var seen = {}, rejects = [];
    R.update.concat(R.add, R.replace).forEach(function (x) { var k = x.row + '|' + x.why; if (!seen[k]) { seen[k] = 1; rejects.push(x); } });
    rejects.sort(function (a, b) { return a.row - b.row; });
    return { file: pend.cands.length, cur: employees.length, dup: duplicate, fresh: pend.cands.length - duplicate, rejects: rejects, rej: { update: R.update.length, add: R.add.length, replace: R.replace.length } };
  }
  /* «الصف 5 — الاسم: السبب» — نصٌّ واحد للمعاينة والملخّص */
  function rejLine(x) { return 'الصف ' + x.row + (x.name ? ' (' + x.name + ')' : '') + ': ' + x.why; }
  function rejList(list, max) { max = max || 5; return list.slice(0, max).map(rejLine).join(' · ') + (list.length > max ? ' · و' + (list.length - max) + ' صفاً آخر' : ''); }
  var DUP_F = { nid: 'رقم الهوية', phone: 'رقم الجوال', empno: 'الرقم الوظيفي' }, DUP_W = { file: 'مكرر في الملف نفسه', other: 'مكرر — مسجّل لموظف في إدارة أخرى', account: 'مكرر — مسجّل اسمَ دخول لحساب خارج هذه الإدارة' };
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
    /* V7 · د1-د: الملفُ المطابق للقائمة لا يُقال عنه «حُدّث» — يُعدّ المتغيّرُ وحده، والمطابقُ يُسمّى */
    var changed = plan.updated - (plan.same || 0);
    if (changed > 0) parts.push('حُدّث ' + changed + ' موظف');
    if (plan.same) parts.push(changed > 0 || plan.added ? 'بلا تغيير: ' + plan.same : 'لا تغيير — بيانات الملف مطابقة للقائمة الحالية (' + plan.same + ')');
    if (plan.skipped) parts.push('تُخطي ' + plan.skipped + ' مكرر');
    if (plan.rejected) parts.push('رُفض ' + plan.rejected + ' صف ولم يُستورد — ' + rejList(plan.rejects || []));   /* V7 · د7: رقمُ الصف وسببه */
    if (pend.inFileDup) parts.push('تكرار داخل الملف: ' + pend.inFileDup);
    if (pend.noName) parts.push('صفوف بلا اسم: ' + pend.noName);
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
        ST.ticket = await transitionPrepare('import', { finalRows: ST.plan.finalRows, options: ST.plan.options, import: { mode: mode, year: schedY(), month: schedM(), schedule: ST.plan.schedule } }, ST.snapshot);
        if (ST.ticket.ok === 0) { ST.error = ST.ticket.message; toast(ST.error); ST.ticket = null; return; }
        ST.mode = mode; ST.ticketMonth = schedY() + '-' + schedM();
      }
      var result = await transitionSend(ST.ticket);
      if (result.ticket) ST.ticket = result.ticket;
      if (ST.pend !== pend) return;
      if (!result.ok) {
        if (result.err === 'emp-dup' && result.dup && result.dup.length) {
          /* V7 · د7: كلُّ قيمةٍ مكرّرة ← صفوفُها في الملف وسببُها */
          var dupRows = [];
          result.dup.forEach(function (x) { pend.cands.forEach(function (c) { if (String(c.emp[x.f] || '').trim() === x.v) dupRows.push({ row: c.row, name: c.emp.name, why: (DUP_F[x.f] || x.f) + ' ' + x.v + ' ' + (DUP_W[x.where] || 'مكرر') }); }); });
          dupRows.sort(function (a, b) { return a.row - b.row; });
          if (dupRows.length) result.message = 'رُفض الاستيراد ولم يُحفظ شيء — ' + rejList(dupRows, 8) + '. صحّح هذه الصفوف أو احذفها ثم ارفع الملف من جديد.';
          ST.ticket = null;
        }
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
        'account-login-unavailable': 'تعذر تفعيل حساب لعدم توفر اسم دخول فريد؛ بقي الموظف مسجلاً',
      };
      if (result.receipt.counts.accountsCreated) parts.push('فُعّل تلقائياً ' + result.receipt.counts.accountsCreated + ' حساب دخول');
      if (result.receipt.counts.schedule) parts.push('عولج ' + result.receipt.counts.schedule + ' سجل في جدول الشهر المختار');
      if (Array.isArray(warnings)) Array.from(new Set(warnings)).forEach(function (warning) { parts.push(warningText[warning] || 'اعتمد الخادم العملية مع تنبيه يحتاج مراجعة البيانات'); });
      if (!parts.length) parts.push('اعتمد الخادم الاستيراد');
      ST.pend = null; ST.snapshot = null; ST.ticket = null; ST.uncertain = false; ST.needsReview = false; host.close(); toast(parts.join(' · '), ST.plan.rejected || warnings.length ? 'warn' : 'ok');
      /* V7 · د1-د: المضيفُ يعرض القائمة نفسها (صفحة الموظفين) — يُعلَم عند الاعتماد وبعد إعادة القراءة ليحدّث جدوله */
      var jump9 = (ST.plan.jump || []).slice(0, 50);   /* V7 · 53 (البند 10): هويةُ المستورد (الاسم والهوية) لينتقل الجدولُ إلى صفحته */
      var done9 = function () { try { if (host.done) host.done(jump9); } catch (error) {} }; done9();
      try { var sync = KIVO.__BS_SRV; if (sync && sync.resync) Promise.resolve(sync.resync(false)).then(done9, done9); } catch (error) {}
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
    const schedRows = [];
    let added = 0, updated = 0, skipped = 0, rejected = 0, same = 0;   /* V7 · د1-د: same = مطابقٌ لسجله حرفاً (لا تغيير) */
    /* ═══ قواعد الأرقام تسري على الاستيراد أيضاً — وإلا صار باباً خلفياً للتكرار ═══
       الهوية والجوال: 10 أرقام أو فارغ؛ الرقم الوظيفي: 5 أو 6 أرقام أو فارغ؛ ولا
       تكرار داخل الملف نفسه ولا مع أي إدارة في الموقع. الصف المخالف يُرفض ويُعدّ. */
    /* V7 · د7: كلُّ رفضٍ بسببه ومكانه — rowWhy يعيد نصَّ السبب ('' = مقبول)، والمرفوضُ يُسجَّل برقم صفّه في الملف (rejects) */
    const seenN = {}, seenP = {}, seenO = {}, rejects = [];
    const at9 = (e) => "مع «" + ((e && e.name) || "موظف") + "» " + (e && e.__row ? "في الصف " + e.__row + " من الملف" : "في هذه الإدارة");
    (base || []).forEach(e => { if (e) { if (e.nid) seenN[String(e.nid).trim()] = e; if (e.phone) seenP[String(e.phone).trim()] = e; if (e.empno) seenO[String(e.empno).trim()] = e; } });
    const rowWhy = (emp, isUpdate, rowNo) => {
      const n = String(emp.nid || "").trim(), ph = String(emp.phone || "").trim(), no = String(emp.empno || "").trim();
      if (n && !/^\d{10}$/.test(n)) return "رقم الهوية «" + n + "» يجب أن يكون 10 أرقام";
      if (ph && !/^\d{10}$/.test(ph)) return "رقم الجوال «" + ph + "» يجب أن يكون 10 أرقام";
      if (no && !/^\d{5,6}$/.test(no)) return "الرقم الوظيفي «" + no + "» يجب أن يكون 5 أو 6 أرقام";
      if (!isUpdate) {
        if (n && seenN[n]) return "رقم الهوية " + n + " مكرر " + at9(seenN[n]);
        if (ph && seenP[ph]) return "رقم الجوال " + ph + " مكرر " + at9(seenP[ph]);
        if (no && seenO[no]) return "الرقم الوظيفي " + no + " مكرر " + at9(seenO[no]);
      }
      const src = { name: emp.name, __row: rowNo };
      if (n) seenN[n] = src; if (ph) seenP[ph] = src; if (no) seenO[no] = src;
      return "";
    };
    const rowOk = (emp, isUpdate, c) => { const why = rowWhy(emp, isUpdate, c && c.row); if (why) rejects.push({ row: (c && c.row) || 0, name: emp.name || "", why: why }); return !why; };
    cands.forEach(c => {
      const emp = c.emp;
      ["type","work"].forEach(k => { if (emp[k] && opts[k] && opts[k].indexOf(emp[k]) === -1) opts[k] = [...opts[k], emp[k]]; });
      const at = findAt(emp);
      if (at >= 0) {
        if (mode !== "update") { skipped++; return; }
        if (!rowOk(emp, true, c)) { rejected++; return; }
        const mg = { ...list[at] };
        // كان: الخلية الفارغة تُتجاهل فلا يمكن تفريغ حقل من الملف — نميّز غياب العمود عن الخلية الفارغة
        ["name","empno","phone","type","work","gender"].forEach(k => { if (!hasCol[k]) return; if (c.blank && c.blank[k]) return; if (k === "name" && !emp[k]) return; mg[k] = emp[k] || ""; });
        if (["name","empno","phone","type","work","gender"].every(k => String(mg[k] || "") === String(list[at][k] || ""))) same++;   /* الحقلُ الغائب والفارغ سواء */
        list[at] = mg; updated++;
        if (c.sh || c.rs || c.cs || c.muk) schedRows.push({ key: schedKey(mg), shift: c.sh, rest: c.rs, cs: c.cs, muk: c.muk });
      } else {
        if (!rowOk(emp, false, c)) { rejected++; return; }
        fresh.push(emp); added++;
        if (c.sh || c.rs || c.cs || c.muk) schedRows.push({ key: schedKey(emp), shift: c.sh, rest: c.rs, cs: c.cs, muk: c.muk });
      }
    });
    // كان: وضع الاستبدال يعكس ترتيب الملف رغم أن الملف هو القائمة كاملة — العكس للإضافة فقط (محاكاة unshift)
    const finalList = mode === "replace" ? fresh.concat(list) : fresh.slice().reverse().concat(list);
    const jump = (fresh.length ? fresh : []).map((e) => ({ name: e.name, nid: e.nid || "" }));   /* V7 · 53: المضافُ أولاً (والمحدَّثُ في مكانه) */
    return { finalRows: finalList, options: opts, schedule: schedRows, added: added, updated: updated, skipped: skipped, rejected: rejected, same: same, rejects: rejects, jump: jump };
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
              let inFileDup = 0, noName = 0;
              /* V7 · د1-د (قرار المراجع): تكرارُ الهوية أو الرقم الوظيفي أو الجوال داخل الملف نفسه يرفض الملفَّ كلَّه قبل نافذة التأكيد —
                 القيمةُ ← أرقامُ صفوفها في الملف. الصفوفُ المتطابقة حرفاً تكرارٌ كذلك. */
              const dupN = new Map(), dupO = new Map(), dupP = new Map();
              const dupAdd = (mp, v, rn) => { if (!v) return; const a = mp.get(v); if (a) a.push(rn); else mp.set(v, [rn]); };
              rows2.slice(hdrRow + 1).forEach((r, ri) => {
                const rowNo = r.__r || (hdrRow + ri + 2);
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
                // كان: الاستيراد يتجاوز فحص 10 أرقام فتنشأ سجلات يتعذّر حفظ أي تعديل عليها — ثم صارت القيمةُ تُفرَّغ صامتة.
                /* V7 · د7 (قرار المالك): الصفُّ ذو الهوية أو الجوال المخالف يُرفض برقم صفّه وسببه (prepareImport rowWhy) — لا يُستورد بحقلٍ مفرَّغ */
                const nid = g(ix.nid).replace(/\D/g, "");
                const phone = g(ix.phone).replace(/\D/g, "");
                const blank = {};
                const empno = g(ix.empno);
                const gRaw = g(ix.gender).trim();
                const gender = /^ذكر/.test(gRaw) ? "ذكر" : (/^(أنثى|انثى|أنثي|انثي)/.test(gRaw) ? "أنثى" : "");
                const emailV = g(ix.email).trim();
                const emp = { name, nid, empno, phone, email: emailOk(emailV) ? emailV : "", type: g(ix.type) || "", work: wkNorm9(g(ix.work)), gender, eid: "e" + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36), group: "بدون مجموعة", account: "بانتظار التفعيل", contact: "غير متوفر" };
                dupAdd(dupN, nid, rowNo); dupAdd(dupO, String(empno || "").trim(), rowNo); dupAdd(dupP, phone, rowNo);
                // كان: كشف التكرار داخل الملف يعتمد على الهوية وحدها فيتضاعف الكشف كله عند غيابها — مفتاح متدرّج
                const key = empKey(emp);
                if (key && fileSeen.has(key)) { inFileDup++; return; }
                if (key) fileSeen.add(key);
                cands.push({ emp, row: rowNo, sh: g(ix.shift), rs: ixRestAll.map(g).filter(Boolean).join(" - "), blank: blank,
                  cs: g(ix.cs), muk: g(ix.muk) });
              });
              const dups = [];
              [[dupN, "رقم الهوية"], [dupO, "الرقم الوظيفي"], [dupP, "رقم الجوال"]].forEach(pr => pr[0].forEach((rs, v) => { if (rs.length > 1) dups.push(pr[1] + " " + v + " في الصفوف " + rs.join(" و")); }));
              if (dups.length) { toast("رُفض الملف — فيه تكرار: " + dups.slice(0, 3).join(" · ") + (dups.length > 3 ? " · و" + (dups.length - 3) + " تكراراً آخر" : "") + ". صحّح الملف ثم ارفعه من جديد — لم يُحفظ شيء.", "err"); return; }
              // كان: عند سقوط كل الصفوف لا يُذكر سبب الإسقاط — نُظهر عدد الصفوف بلا اسم
              if (!cands.length) { toast("لا توجد صفوف صالحة في الملف" + (noName ? " · " + KIVO.BassamCount(noName,"صف") + " بلا اسم" : "")); return; }
              ST.pend = { cands: cands, inFileDup: inFileDup, noName: noName, cols: { name: ix.name !== -1, empno: ix.empno !== -1, phone: ix.phone !== -1, type: ix.type !== -1, work: ix.work !== -1, gender: ix.gender !== -1 },
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
    mount: function (o) { host = { ask: (o && o.ask) || function () {}, close: (o && o.close) || function () {}, change: (o && o.change) || function () {}, done: (o && o.done) || null }; toastFn = (o && o.toast) || null; },
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

/* ═══ V7 · د1-د: مهايئُ المضيف — قيمُ نافذة الاستيراد وأفعالُها لصفحةٍ تستضيف المحرّك (c = مكوّنُ الصفحة: state · setState · bsToast · PC · permDeny).
   كان هذا في «الإعدادات ← استيراد بيانات» (src/modules/admin)؛ نُقل مع الاستيراد إلى «بيانات الموظفين» ووُضع هنا بجوار المحرّك
   لا في منطق الصفحة. النصوصُ والقواعدُ كما كانت حرفاً. ═══ */
(function () {
  "use strict";
  if (!KIVO.BassamEmpImp) return;
  function impOn(t) {
    try {
      const e = KIVO.BassamPerm;
      return !e || !e.on || !!e.on(t);
    } catch (t) {
      return !0;
    }
  }
  /* V7 · د5-د2: هل برنامجُ الجدولة حاضرٌ ومفعَّل — يجيب مالكُه بالاسم؛ بغيابه لا */
  function impSched() {
    return !!KIVO.bus.read("staff.usable@1");
  }
  /* حالةُ النافذة هنا لا في حالة الصفحة: الملخّصُ المعروض والخطوة. الصفحةُ تُعاد رسماً بعدّادٍ واحد (impTick). */
  var HS = { conf: null, step: "pick" };
  function tick(c) { c.setState({ impTick: (c.state.impTick || 0) + 1 }); }
  function impMount(c) {
    const t = KIVO.BassamEmpImp;
    t &&
      !c._impMounted &&
      ((c._impMounted = !0),
      t.mount({
        ask: (t) => { HS.conf = t; HS.step = "pick"; tick(c); },
        close: () => { HS.conf = null; HS.step = "pick"; tick(c); },
        toast: (message, kind) => c.bsToast(message, kind || "warn"),
        change: () => tick(c),
        done: (jump) => c.setState(Object.assign({ employees: c.loadEmp(), selected: {} }, jump && jump.length ? { impJump: jump } : {})),   /* الجدولُ يُحدَّث فور الاعتماد — V7 · 53: ويُعرض أولُ صفٍّ مستورد */
      }));
  }
  function impVals(c) {
    const t = KIVO.BassamEmpImp || {
      curHij: () => ({ y: 0, m: 0 }),
      month: () => ({ y: 0, m: 0 }),
      pending: () => null,
      setMonth: () => {},
      commit: () => {},
      drop: () => {},
      pick: () => {},
    };
    impMount(c);
    const e = c.state,
      r = (() => {
        try {
          const t = KIVO.__BS_SRV.operations.get("bassam_employees_v1");
          return Array.isArray(t) ? t.length : 0;
        } catch (t) {
          return 0;
        }
      })();
    const V = {
      impBusy: !!(t.status && t.status().busy),
      impError: t.status ? t.status().error : "",
      impNeedsReview: !!(t.status && t.status().needsReview),
      impReviewDisabled: !!(t.status && (t.status().busy || t.status().uncertain)),
      impCommitDisabled: !!(t.status && (t.status().busy || t.status().needsReview)),
      impReview: () => t.review && t.review(),
      impCanAdd: (() => {
        try {
          const t = KIVO.BassamPerm;
          return !!(t && t.can && t.can("emps", "add"));
        } catch (t) {
          return !1;
        }
      })(),
      impDenyMsg: "الاستيراد يتطلّب صلاحية الإضافة على «موظفي الإدارة»",
      impCount: String(r),
      impCountTxt: r ? KIVO.BassamCount(r, "موظف") + " في الإدارة الآن" : "لا موظفين في الإدارة بعد",
      impPickDo: () => {
        if (!c.PC("add")) return void c.permDeny();
        (c.setState({ filesOpen: !1 }), HS.conf || t.pick());
      },
      impColsDo: () => (c.setState({ filesOpen: !1 }), impCols(c)),
      ...(() => {
        const s = HS.conf;
        if (!s)
          return {
            impConfOpen: !1,
            impStepPick: !0,
            impStepReplace: !1,
            impCurCount: 0,
            impFileCount: 0,
            impDupCount: 0,
            impNewCount: 0,
            impHasCur: !0,
            impConfTitle: "",
            impConfSub: "",
            impSchedOn: !1,
            impSchedYear: "",
            impSchedMonth: "",
            impYearOpts: [],
            impMonthOpts: [],
            impSetY: () => {},
            impSetM: () => {},
            impSchedLock: "",
            impSchedLockStyle: "",
            impSchedCols: "",
            impUpdateDesc: "",
            impAddDesc: "",
            impReplaceDesc: "",
            impReplaceWarn: "",
            stopClick: (t) => {
              t && t.stopPropagation && t.stopPropagation();
            },
            impConfCancel: () => {},
            impDoUpdate: () => {},
            impDoAdd: () => {},
            impAskReplace: () => {},
            impDoReplace: () => {},
            impBackToPick: () => {},
          };
        const a = t.curHij(),
          r = t.month().y,
          i = t.month().m,
          n = t.pending() || {},
          o = n.sched || {},
          p = !!(o.shift || o.rest || o.cs || o.muk);
        let l = !1;
        try {
          l = !!(KIVO.bus.read("staff.locks@1") || {})[r + "-" + i];
        } catch (t) {}
        const d = [o.shift ? "الوردية" : "", o.rest ? "أيام الراحة" : "", o.cs ? "رمز النداء" : "", o.muk ? "التكليف" : ""].filter(Boolean);
        return {
          impConfOpen: !0,
          impHasCur: s.cur > 0,
          impConfTitle: s.cur > 0 ? "يوجد موظفون مسجّلون بالفعل" : "تأكيد الاستيراد",
          impConfSub:
            s.cur > 0
              ? "اختر كيف تريد التعامل مع البيانات الحالية قبل إتمام الاستيراد."
              : "القائمة فارغة — سيُضاف من في الملف كما هو. راجع شهر الجدول الشهري أدناه أولاً.",
          impSchedOn: p,
          impSchedYear: String(r),
          impSchedMonth: String(i),
          impYearOpts: [a.y - 1, a.y, a.y + 1].map((t) => ({ v: String(t), lbl: t + " هـ" })),
          impMonthOpts: [
            "محرم",
            "صفر",
            "ربيع الأول",
            "ربيع الآخر",
            "جمادى الأولى",
            "جمادى الآخرة",
            "رجب",
            "شعبان",
            "رمضان",
            "شوال",
            "ذو القعدة",
            "ذو الحجة",
          ].map((t, e) => ({ v: String(e + 1), lbl: t + (a.m === e + 1 && a.y === r ? " (الجاري)" : "") })),
          impSetY: (e) => {
            (t.setMonth(parseInt(e.target.value, 10) || 0, t.month().m), tick(c));
          },
          impSetM: (e) => {
            (t.setMonth(t.month().y, parseInt(e.target.value, 10) || 0), tick(c));
          },
          impSchedLock: l ? "الشهر معتمد ومقفل — لن يُكتب فيه شيء" : r === a.y && i === a.m ? "الشهر الجاري" : "شهر غير الجاري",
          impSchedLockStyle:
            "font-size:10px;font-weight:700;border-radius:9999px;padding:4px 10px;white-space:nowrap;border:1px solid " +
            (l
              ? "rgba(220,38,38,0.35);background:var(--bg-a22038380p07);color:var(--fg-xb91c1c)"
              : "rgba(4,120,87,0.3);background:var(--bg-a4120870p07);color:var(--fg-x047857)"),
          impSchedCols:
            (impSched()
              ? "الأعمدة التي وجدها في ملفك وستذهب إلى هذا الشهر: " +
                (d.length ? d.join(" · ") : "لا شيء") +
                ". أما بقية الأعمدة فتذهب إلى سجل الموظف نفسه ولا يمسّها اختيار الشهر."
              : "أعمدة الجدول التي وجدها في ملفك (" +
                (d.length ? d.join(" · ") : "لا شيء") +
                ") لن تُكتب — الجدول الشهري غير مفعّل في هذه الإدارة. أما بقية الأعمدة فتذهب إلى سجل الموظف نفسه.") +
            ((n.derived || []).length ? " ولن تُستورد أعمدةٌ محسوبةٌ في المنصة: " + n.derived.map((t) => t.t).join(" · ") + "." : "") +
            ((n.unknown || []).length ? " وأعمدةٌ غير معروفة ستُتجاهل: " + n.unknown.join(" · ") + "." : ""),
          impStepPick: "replace" !== HS.step,
          impStepReplace: "replace" === HS.step,
          impCurCount: s.cur,
          impFileCount: s.file,
          impDupCount: s.dup,
          impNewCount: s.fresh,
          /* V7 · د7: تحذيرُ المعاينة قبل الاختيار — رقمُ الصف وسببه */
          impRejects: (s.rejects || []).slice(0, 30).map((x) => ({ row: x.row, name: x.name, why: x.why })),
          impRejMore: Math.max(0, (s.rejects || []).length - 30),
          impRejTitle: (s.rejects || []).length ? "صفوف لن تُستورد (" + KIVO.BassamCount((s.rejects || []).length, "صف") + ") — صحّحها في الملف إن أردت استيرادها:" : "",
          impUpdateDesc:
            "يُحدَّث " +
            KIVO.BassamCount(s.dup, "موظف|موجود") +
            " ببيانات الملف (المطابقة برقم الهوية، فإن غاب فبالرقم الوظيفي، فإن غاب فبالاسم مع الجوال)، ويُضاف " +
            KIVO.BassamCount(s.fresh, "موظف|جديد") +
            ". لا يُحذف أحد." + (s.rej && s.rej.update ? " ويُرفض " + KIVO.BassamCount(s.rej.update, "صف") + " مخالف." : ""),
          impAddDesc:
            "يُضاف " +
            KIVO.BassamCount(s.fresh, "موظف|جديد") +
            " فقط، ويُترك " +
            KIVO.BassamCount(s.dup, "موظف|موجود") +
            " " +
            KIVO.BassamCount.agr(s.dup, "كما هو", "كما هما", "كما هم") +
            " دون أي تعديل." + (s.rej && s.rej.add ? " ويُرفض " + KIVO.BassamCount(s.rej.add, "صف") + " مخالف." : ""),
          impReplaceDesc:
            "يُحذف " +
            KIVO.BassamCount(s.cur, "موظف") +
            " من القائمة الحالية ثم تُستورد بيانات الملف (" +
            KIVO.BassamCount(s.file, "موظف") +
            ") من جديد" +
            (impSched() ? "، ويُبنى الجدول الشهري " + KIVO.BassamCount.agr(s.file, "له", "لهما", "لهم") + " من الصفر." : ".") + (s.rej && s.rej.replace ? " ويُرفض " + KIVO.BassamCount(s.rej.replace, "صف") + " مخالف." : ""),
          impReplaceWarn:
            "سيُحذف " +
            KIVO.BassamCount(s.cur, "موظف") +
            " من هذه الإدارة نهائياً وتحل " +
            KIVO.BassamCount.agr(s.cur, "محله", "محلهما", "محلهم") +
            " بيانات الملف (" +
            KIVO.BassamCount(s.file, "موظف") +
            ")، وتُنظّف المنصة من كل " +
            KIVO.BassamCount.agr(s.cur, "أثره", "أثرهما", "أثرهم") +
            ": " +
            [
              impSched() ? "الجدول الشهري بكل أشهره" : "",
              impOn("dreport") ? "التقارير اليومية بكل أيامها ودفاتر استئذاناتها" : "",
              "تسكينات الخطة التشغيلية والجولات اليومية",
              "المهام المسندة",
              "حسابات الدخول والصلاحيات",
              impOn("emps/custody") ? "حركات العهد" : "",
              impOn("award") ? "ترشيحات التميز" : "",
            ]
              .filter(Boolean)
              .join("، و") +
            (impSched() ? " — ويُنشأ جدول الشهر من جديد مسودة مفتوحة غير معتمدة." : ".") +
            " لا يمكن التراجع.",
          stopClick: (t) => {
            t && t.stopPropagation && t.stopPropagation();
          },
          impConfCancel: () => {
            if (!t.pending()) { HS.conf = null; HS.step = "pick"; return void tick(c); }
            if (t.drop() !== false) { HS.conf = null; HS.step = "pick"; tick(c); c.bsToast("أُلغي الاستيراد — لم يتغيّر شيء"); }
          },
          impDoUpdate: () => t.commit("update"),
          impDoAdd: () => t.commit("add"),
          impAskReplace: () => { if (!(t.status && (t.status().busy || t.status().uncertain))) { HS.step = "replace"; tick(c); } },
          impBackToPick: () => { if (!(t.status && (t.status().busy || t.status().uncertain))) { HS.step = "pick"; tick(c); } },
          impDoReplace: () => t.commit("replace"),
        };
      })(),
    };
    impPaint(V, !!c.PC("add"));
    return null;
  }
  /* ═══ V7 · د1-د: نافذةُ التأكيد يرسمها هذا الملف في حاملٍ فارغ بالصفحة ([data-emp-imp-host]) — كان ترميزُها في view.html للصفحة فنُقل هنا
     (سقفُ حجم صفحة الموظفين). النصوصُ والأنماطُ كما كانت؛ البطاقاتُ الأربع شبكةٌ: أربعٌ في صفّ، واثنتان في صفّ على الجوال. ═══ */
  var IC = {
    warn: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path>',
    sync: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path>',
    plus: '<path d="M5 12h14"></path><path d="M12 5v14"></path>',
    bin: '<path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>'
  };
  function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function svg(k, n, join) { return '<svg width="' + n + '" height="' + n + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' + (join ? ' stroke-linejoin="round"' : "") + ">" + IC[k] + "</svg>"; }
  var CSS = ".ei-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:16px}@media (max-width:560px){.ei-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}" +
    ".ei-card{min-width:0;background:var(--bg-xf8fafc);border:1px solid var(--bd-xe2e8f0);border-radius:12px;padding:10px 12px}" +
    ".ei-opt{text-align:right;border-radius:14px;padding:13px 14px;cursor:pointer;background:var(--bg-xffffff);display:flex;align-items:flex-start;gap:11px;transition:all .15s}" +
    ".ei-u{border:1px solid var(--bd-xe1e1e1)}.ei-u:hover{border-color:var(--bd-xb99751);background:var(--bg-a185151810p05)}" +
    ".ei-a{border:1px solid var(--bd-xe1e1e1)}.ei-a:hover{border-color:var(--bd-x0891b2);background:var(--bg-a81451780p05)}" +
    ".ei-r{border:1px solid var(--bd-a23968680p35)}.ei-r:hover{border-color:var(--bd-xdc2626);background:var(--bg-a23968680p05)}" +
    ".ei-b{height:36px;padding:0 16px;border-radius:10px;font-size:12.5px;font-weight:400;background:var(--bg-xffffff);color:var(--fg-x141414);border:1px solid var(--bd-xe1e1e1);cursor:pointer;font-family:'Cairo',sans-serif}.ei-b:hover{background:var(--bg-xf5f5f5)}" +
    ".ei-sel{height:34px;border:1px solid var(--bd-xe1e1e1);border-radius:10px;padding:0 9px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:600;color:var(--fg-x141414);background:var(--bg-xffffff);cursor:pointer;outline:none}";
  function impHtml(V) {
    var card = function (lbl, val, col) { return '<div class="ei-card"><div style="font-size:9.5px;color:var(--fg-x94a3b8);font-weight:400;margin-bottom:3px">' + lbl + '</div><div style="font-size:17px;font-weight:600;color:var(--fg-' + col + ')">' + esc(val) + "</div></div>"; };
    var opt = function (key, cls, act, icoBg, icoFg, ico, title, desc) {
      return '<div data-imp="' + key + '" data-ei="' + act + '" class="ei-opt ' + cls + '"><div style="width:34px;height:34px;border-radius:10px;background:var(--bg-' + icoBg + ");color:var(--fg-" + icoFg + ');display:flex;align-items:center;justify-content:center;flex-shrink:0">' + svg(ico, 17, 1) +
        '</div><div style="flex:1;min-width:0">' + title + '<div style="font-size:11px;color:var(--fg-x53565a);line-height:1.7">' + esc(desc) + "</div></div></div>";
    };
    var sel = function (act, cur, list) { return '<select data-ei="' + act + '" class="ei-sel">' + list.map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(cur) ? " selected" : "") + ">" + esc(o.lbl) + "</option>"; }).join("") + "</select>"; };
    var h = "" +
      '<div data-ei="impConfCancel" data-ei-self="1" style="position:fixed;inset:0;z-index:70;background:var(--bg-a0000p5);display:flex;align-items:center;justify-content:center;padding:24px">' +
      '<div style="background:var(--bg-xffffff);border-radius:18px;box-shadow:var(--shadow-elevated);width:100%;max-width:520px;padding:24px;max-height:88vh;overflow-y:auto">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div style="width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:var(--bg-xfffbeb);border:1px solid var(--bd-xfde68a);color:var(--fg-xb45309);flex-shrink:0">' + svg("warn", 22, 1) +
      '</div><div style="flex:1;min-width:0"><h3 style="font-size:16px;font-weight:600;margin:0 0 3px">' + esc(V.impConfTitle) + '</h3><p style="font-size:11.5px;color:var(--fg-x53565a);margin:0;line-height:1.7">' + esc(V.impConfSub) + "</p></div></div>" +
      '<div class="ei-cards">' + card("الموجود حالياً", V.impCurCount, "x141414") + card("في الملف", V.impFileCount, "x141414") + card("مطابق لسجل موجود", V.impDupCount, "xb45309") + card("جديد كلياً", V.impNewCount, "x047857") + "</div>";
    if (V.impSchedOn) h += '<div style="border:1px solid var(--bd-a185151810p4);background:var(--bg-a185151810p05);border-radius:14px;padding:12px 14px;margin-bottom:14px"><div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">' +
      '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--fg-x8a6f35);white-space:nowrap">' + svg("cal", 15, 0) + " يُكتب الجدول الشهري في شهر</span>" +
      sel("impSetM", V.impSchedMonth, V.impMonthOpts) + sel("impSetY", V.impSchedYear, V.impYearOpts) + '<span style="' + esc(V.impSchedLockStyle) + '">' + esc(V.impSchedLock) + "</span></div>" +
      '<div style="font-size:10.5px;font-weight:400;color:var(--fg-x94a3b8);margin-top:8px;line-height:1.9">' + esc(V.impSchedCols) + "</div></div>";
    if ((V.impRejects || []).length) h += '<div data-emp-imp-rej role="alert" style="border:1px solid var(--bd-xfecaca);background:var(--bg-xfef2f2);border-radius:14px;padding:12px 14px;margin-bottom:14px"><div style="font-size:12px;font-weight:600;color:var(--fg-xb91c1c);margin-bottom:6px">' + esc(V.impRejTitle) + '</div><ul style="margin:0;padding:0 18px 0 0;font-size:11px;line-height:1.9;color:var(--fg-x53565a)">' +
      V.impRejects.map(function (x) { return '<li data-emp-imp-rej-row="' + esc(x.row) + '">الصف ' + esc(x.row) + (x.name ? " (" + esc(x.name) + ")" : "") + ": " + esc(x.why) + "</li>"; }).join("") + (V.impRejMore ? "<li>و" + esc(V.impRejMore) + " صفاً آخر</li>" : "") + "</ul></div>";
    if (V.impError) h += '<p role="alert" style="color:var(--danger-text);font-size:12px">' + esc(V.impError) + "</p>";
    if (V.impBusy) h += '<p role="status">جارٍ تأكيد العملية مع الخادم…</p>';
    if (V.impNeedsReview) h += '<button data-ei="impReview"' + (V.impReviewDisabled ? " disabled" : "") + ' class="ei-b" style="height:38px;background:var(--bg-surface);color:var(--text-secondary);border:1px solid var(--border-default)">مراجعة بيانات الإدارة الحالية</button>';
    if (V.impStepPick) h += '<div style="display:flex;flex-direction:column;gap:8px">' +
      (V.impHasCur ? opt("update", "ei-u", "impDoUpdate", "a185151810p12", "x9a7e40", "sync", '<div style="font-size:13px;font-weight:600;margin-bottom:3px">تحديث ودمج <span style="font-size:9.5px;font-weight:400;color:var(--fg-x9a7e40);background:var(--bg-a185151810p12);border-radius:6px;padding:2px 6px;margin-right:4px">موصى به</span></div>', V.impUpdateDesc) : "") +
      opt("add", "ei-a", "impDoAdd", "a81451780p12", "x0891b2", "plus", '<div style="font-size:13px;font-weight:600;margin-bottom:3px">إضافة الجديد فقط</div>', V.impAddDesc) +
      (V.impHasCur ? opt("askrep", "ei-r", "impAskReplace", "xfef2f2", "xdc2626", "bin", '<div style="font-size:13px;font-weight:600;margin-bottom:3px;color:var(--fg-xdc2626)">حذف الكل واستبدالهم بالملف</div>', V.impReplaceDesc) : "") +
      '</div><div style="display:flex;justify-content:flex-start;margin-top:14px"><button data-ei="impConfCancel" class="ei-b">إلغاء الاستيراد</button></div>';
    if (V.impStepReplace) h += '<div style="background:var(--bg-xfef2f2);border:1px solid var(--bd-xfecaca);border-radius:14px;padding:14px"><div style="font-size:13px;font-weight:600;color:var(--fg-xdc2626);margin-bottom:5px">تأكيد الحذف والاستبدال</div>' +
      '<p style="font-size:11.5px;color:var(--fg-x53565a);line-height:1.9;margin:0 0 12px">' + esc(V.impReplaceWarn) + '</p><div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button data-ei="impDoReplace"' + (V.impCommitDisabled ? " disabled" : "") + ' class="ei-b" style="background:var(--danger);color:var(--text-on-fill);border:0">نعم، احذف واستبدل</button><button data-ei="impBackToPick" class="ei-b">رجوع</button></div></div>';
    return h + "</div></div>";
  }
  IC.up = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M17 8l-5-5-5 5"></path><path d="M12 3v12"></path>';
  IC.down = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path>';
  /* بندا قائمة «ملفات» وزرُّ الحالة الفارغة — بشكل البنود والزرّ المجاورة حرفاً (كان ترميزُها في الصفحة) */
  function menuHtml() {
    var it = function (key, act, bg, ico, t, d) {
      return '<div data-ei="' + act + '" data-emp-imp="' + key + '" class="ei-mi" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:11px;font-weight:400;cursor:pointer;color:var(--fg-x141414);transition:background .15s">' +
        '<span style="display:inline-flex;width:24px;height:24px;border-radius:7px;align-items:center;justify-content:center;background:var(--bg-' + bg + ');color:var(--fg-x8a6f35);flex-shrink:0">' + svg(ico, 12, 1) + '</span>' +
        '<div style="flex:1"><div>' + t + '</div><div style="font-size:8px;color:var(--fg-x94a3b8);font-weight:400">' + d + "</div></div></div>";
    };
    return it("menu", "impPickDo", "a185151810p1", "up", "استيراد من Excel", "يعرض ما سيتغيّر قبل التنفيذ — دمج أو استبدال") +
      it("cols", "impColsDo", "a185151810p06", "down", "تنزيل قالب الاستيراد", "ملف Excel بالأعمدة الصحيحة — عبّئه ثم ارفعه");
  }
  function emptyHtml() {
    return '<button data-ei="impPickDo" data-emp-imp="empty" class="ei-mi" style="height:42px;padding:0 24px;border-radius:12px;font-size:13px;font-weight:400;background:var(--bg-xffffff);color:var(--fg-x8a6f35);border:1px solid var(--bd-a185151810p4);cursor:pointer;font-family:\'Cairo\',sans-serif;display:inline-flex;align-items:center;gap:8px">' + svg("up", 16, 1) + " استيراد من Excel</button>" +
      /* V7 · د6 (51ج · قرار المالك): في الحالة الفارغة لا قائمة «ملفات»، فقالبُ الاستيراد زرٌّ بجانب «استيراد من Excel» — المعالجُ نفسُه impColsDo */
      '<button data-ei="impColsDo" data-emp-imp="empty-tpl" class="ei-mi" style="height:42px;padding:0 24px;border-radius:12px;font-size:13px;font-weight:400;background:var(--bg-xffffff);color:var(--fg-x8a6f35);border:1px solid var(--bd-a185151810p4);cursor:pointer;font-family:\'Cairo\',sans-serif;display:inline-flex;align-items:center;gap:8px">' + svg("down", 16, 1) + " تنزيل قالب الاستيراد</button>";
  }
  function impPaint(V, canAdd) {
    var run = function () {
      if (!document.getElementById("ei-css")) { var st = document.createElement("style"); st.id = "ei-css"; st.textContent = CSS + ".ei-mi:hover{background:var(--bg-a185151810p06)!important}[data-ei-s]{display:contents;font-style:normal}"; document.head.appendChild(st); }
      var all = document.querySelectorAll("[data-ei-s]");
      for (var i = 0; i < all.length; i++) (function (el) {
        var k = el.getAttribute("data-ei-s");
        el.__v = V;
        if (!el.__on) {
          el.__on = 1;
          el.addEventListener("click", function (ev) {
            var t = ev.target && ev.target.closest ? ev.target.closest("[data-ei]") : null; if (!t || t.tagName === "SELECT" || t.disabled) return;
            if (t.getAttribute("data-ei-self") && ev.target !== t) return;   /* الخلفيةُ تُلغي بالنقر عليها هي لا على ما فوقها */
            var f = el.__v && el.__v[t.getAttribute("data-ei")]; if (f) f(ev);
          });
          el.addEventListener("change", function (ev) { var t = ev.target; if (!t || t.tagName !== "SELECT") return; var f = el.__v && el.__v[t.getAttribute("data-ei")]; if (f) f(ev); });
        }
        var h = k === "conf" ? (V.impConfOpen ? impHtml(V) : "") : !canAdd ? "" : k === "menu" ? menuHtml() : emptyHtml();
        if (el.__h !== h) { el.__h = h; el.innerHTML = h; }
      })(all[i]);
    };
    run(); (window.requestAnimationFrame || setTimeout)(run);
  }
  function impCols(c) {
    const t = KIVO.BassamEmpImp,
      e =
        t && t.colTitles
          ? t.colTitles()
          : [
              "اسم الموظف",
              "الجنس",
              "رقم الهوية",
              "الرقم الوظيفي",
              "رقم الجوال",
              "البريد الإلكتروني",
              "نوع التوظيف",
              "نوع العمل",
              "الوردية",
              "أيام الراحة",
              "رمز النداء",
              "التكليف",
            ],
      s = e.map(() => "");
    try {
      KIVO.BassamXLSX
        ? (KIVO.BassamXLSX.download([e, s.slice(), s.slice(), s.slice()], "أعمدة-استيراد-الموظفين.xlsx"),
          c.bsToast("نُزّل قالبُ الاستيراد — عبّئ صفوفه ثم ارفعه من «ملفات ← استيراد من Excel»", "ok"))
        : c.bsToast("تعذّر إنشاء ملف Excel في هذا المتصفح", "warn");
    } catch (t) {
      c.bsToast("تعذّر إنشاء ملف Excel", "warn");
    }
  }
  KIVO.BassamEmpImp.hostVals = impVals;
})();
