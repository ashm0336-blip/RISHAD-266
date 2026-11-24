/* RISHAD 266 — واجهة سحابية فقط.
   لا يوجد خادم محلي ولا وضع عرض يعمل بقاعدة بيانات المتصفح.
   غياب تهيئة الخادم يعني فشلًا مغلقًا، دون فتح مخزن أعمال محلي أو اعتراض واجهة Storage. */
(function () {
  var BOOT = window.__BS_BOOT;
  if (!BOOT || typeof BOOT !== 'object' || BOOT.srv !== 1 || BOOT.cf !== 1) {
    KIVO.__BS_STORAGE_FAIL = 'cloud-boot-required';
    KIVO.__BS_NOSRV = 1;
    return;
  }

  /* ── وجه كلاود فلير ──
     cf: الخادم على الإنترنت — البيانات للفريق كله. مفاتيح الجهاز (الجلسة،
     حارس المحاولات، السمة، الإدارة النشطة، بشارة الدخول) تبقى في مخزن
     المتصفح الأصلي: لكل جهاز حاله — والخادم من جهته يرفضها لو وصلته.
     auth === "need": زائر لم يسجّل بعد — رملٌ مؤقت يعمل في الذاكرة وحدها. */
  /* KIVO_243 · الإنفاذ: المفاتيحُ المحمولة من الخادم (__BS_BOOT.authz) — لا يحقنها الخادمُ إلا في وضع الإنفاذ (ENV ∧ D1)،
     فغيابُها (النظامُ القديم · Production) يُبقي كلَّ ما يلي على سلوك KIVO_242 حرفاً بحرف */
  KIVO.__BS_AUTHZ = (BOOT.authz && typeof BOOT.authz === "object") ? BOOT.authz : null;
  var ANON9 = BOOT.auth === "need";
  /* Relational domains have their own acknowledged APIs. A stale caller must not
     recreate a KV document or fall through to persistent device storage. */
  function relationalKey9(k) { return /^(?:bsdept:[^:\s]+:)?bassam_(?:@@SYS:store.relational.dstats@@@@SYS:store.relational.systems|post="notif(?:_cfg|_sys)?|bc)_v1$/"|empty="notif(?:_cfg|_sys)?|bc)_v1$/"@@.test(k)@@SYS:store.relational.awardDocs@@; }
  var operationResources9 = Object.freeze([
    'bassam_employees_v1', 'bassam_options_v1',@@SYS:store.opResources.staff@@
    'bassam_shift_options_v1',@@SYS:store.opResources.plan@@@@SYS:store.opResources.daily@@ 'bassam_dayshift_v1', 'bassam_dayfocus_v1'@@SYS:store.opResources.dreport@@@@SYS:store.opResources.tasks@@
  ]);
  /* V7 · 53: الموارد المخزّنة بالفترة (عقد الخادم) — الحقلُ الحاوي للفترات ('' = أعضاءُ الجذر) · والمواردُ التي تُقرأ بالأيام افتراضاً.
     يعلنها كلُّ نظامٍ في قطعته (store.period · store.periodDay · store.periodMonthly) — القاعدةُ لا تسمّي مواردَ الأنظمة */
  var PERIOD_RES9 = Object.freeze({@@SYS:store.period.plan@@@@SYS:store.period.staff@@@@SYS:store.period.daily@@@@SYS:store.period.dreport@@@@SYS:store.period.tasks@@ });
  var PERIOD_DAY9 = Object.freeze({@@SYS:store.periodDay.dreport@@ }), PERIOD_MONTHLY9 = Object.freeze({@@SYS:store.periodMonthly.plan@@@@SYS:store.periodMonthly.staff@@ });   /* شهرُها فترةٌ واحدة */
  function operationResource9(k) { return operationResources9.indexOf(String(k).replace(/^bsdept:[^:]+:/, '').replace(/@[^@]*$/, '')) !== -1; }   /* V7 · 53: K@p مورد عمليات كذلك */
  function operationKey9(k) { return typeof k === 'string' && (/^bsdept:[^:\s,]+:bassam_[A-Za-z0-9_]+$/.test(k) && operationResource9(k) || !!periodParse9(k)); }
  var DEVK9 = { bassam_session_v1: 1, bassam_theme: 1,
                bassam_active_dept_v1: 1, bassam_fresh_login_v1: 1, bassam_notif_mute_v1: 1,
                bassam_con_cx_v1: 1 };   /* CORE-02 S7: طيُّ شريط «مركز إدارة رشاد» تفضيلُ جهازٍ كالسمة — لا يُرسل للخادم */
  /* «آخر صفحة مفتوحة» تفضيلُ جهازٍ لا بيانات فريق: كانت تُرسل للخادم — وعند الخروج
     تُرسل بعد إنهاء الجلسة فتُرفض (401) ويومض شريط «انتهت جلستك» قبل إعادة التحميل */
  /* R187 · R188: تفضيلُ عرضٍ لكل إدارة («مجموعات | قائمة» في صفحات الأنظمة) تفضيلُ جهازٍ كذلك — لا يُرسل للخادم، فلا يُرفض لمن صلاحيتُه
     عرضٌ فقط ولا يُفرض على الزملاء. V7 · د5-ح: مفاتيحُها يعلنها كلُّ نظامٍ في قطعته (store.devGroups) — القاعدةُ لا تسمّيها */
  var DEVG9 = [@@SYS:store.devGroups|sep=", "@@];
  /* KIVO_264 · D-5: «اليوم المختار» لكل مستخدمٍ على جهازه (bassam_dayfocus_v1:<الحساب>) — لا يُرسل للخادم ولا يُفرض على الزملاء */
  function devKey9(k) { return !!DEVK9[k] || /(^|:)bassam_page_v1:/.test(k) || DEVG9.indexOf(String(k).split(":").pop()) !== -1 || /(^|:)bassam_dayfocus_v1:/.test(k); }
  /* KIVO_244 · AUD-003: قائمةُ المفاتيح التي يجوز أن تُزامَن مع الخادم — مفاتيحُ الفريق وحدها (bassam_* أو bsdept:<إدارة>:bassam_*).
     أيُّ مفتاحٍ آخر (أداةٌ · امتدادُ متصفح · سكربتُ مراقبة) يبقى في مخزن هذا الجهاز ولا يُرسل أصلاً — فلا يُنتج قرارَ authz ولا تنبيهَ رفض
     (الحادثةُ المسجَّلة على Preview: k243_rows_* ⇒ 363 رفضاً و400 تنبيه). الخادمُ يبقى حَكَماً ثانياً يرفض المجهول لو وصله. */
  var TEAMK9 = /^(bsdept:[^:\s]+:)?bassam_[A-Za-z0-9_]+$/;
  function invalidScope9(k) { return k.indexOf('bsdept:') === 0 && !TEAMK9.test(k); }
  var foreign9 = Object.create(null);
  function teamKey9(k) {
    if (TEAMK9.test(k)) return true;
    if (!foreign9[k]) { foreign9[k] = 1; try { console.warn('[KIVO] مفتاحٌ خارج قائمة المزامنة — يبقى محلياً:', k); } catch (e) {} }
    return false;
  }
  var bye9 = false;                                  /* بعد طلب الخروج لا يُرسل شيء */
  /* KIVO_264 · D-3: هويةُ الجلسة التي بُنيت عليها هذه الصفحة (من الإقلاع، لا من علامة الجهاز) — تُرسل مع كلّ حفظ (العقد C1)،
     فلا يُكتب تعديلٌ أنتجته هويةٌ باسم هويةٍ أخرى دخلت المتصفحَ بعدها. sx9: تبدّلت الجلسة ⇒ لا إرسالَ بعد الآن حتى إعادة التحميل */
  var UID9 = (typeof BOOT.uid === "string" && BOOT.uid) ? BOOT.uid : "";
  /* مراجعةُ التكامل W1-R1: بصمةُ العدسة التي أُسقطت بها قائمةُ الحسابات في هذه الصفحة (الخادم: 054 usersLensFp) — تُرسل مع حفظها (payload) فإن تغيّرت
     عدستي بعدها (نُقلت إدارةٌ إلى عقدتي · تغيّرت صلاحياتي) ردّ الخادمُ تعارضاً بالإسقاط الحالي بدل أن يُحسب ما لم يصلني حذفاً، فيُدمج تعديلي عليه ويُعاد.
     تتجدّد مع كلّ قائمةٍ تصل من الخادم (/api/get · قيمةُ الرفض والتعارض) — ومديرُ النظام بلا إسقاطٍ ولا بصمة */
  var KU9 = "bassam_auth_users_v1", uscope9 = (typeof BOOT.uscope === "string") ? BOOT.uscope : "";
  /* PRIVACY batch (019u): the same for the permissions registry projected by units/targets (pscope) — a save on an older projection is a conflict */
  var KP9 = "bassam_perms_v1", pscope9 = (typeof BOOT.pscope === "string") ? BOOT.pscope : "";
  var dupR9 = Object.create(null), DUPMAX9 = 3;       /* مراجعةُ التكامل R2-LOOP: دوراتُ إسقاط الصفوف المخالفة المتتالية لكل مفتاح (usersDupFix9) وسقفُها */
  var sx9 = false, orphan9 = null;
  var readSetHook9 = null;                           /* KIVO_264 · D-4: إعادةُ مزامنة مجموعة القراءة (تُضبط مع المستمع الدائم) */

  /* ── الذاكرة: صورة المخزن التي تُقرأ منها كل القراءات ─────────────────── */
  var mem = Object.create(null);
  var seed = BOOT.keys || {};
  for (var k0 in seed) if (!relationalKey9(k0) && !operationResource9(k0) && !invalidScope9(k0)) mem[k0] = String(seed[k0]);
  try { BOOT.keys = null; } catch (e0) {}       /* لا داعي لنسختين في الذاكرة */
  /* ── نسخ المفاتيح: رقم النسخة التي بُني عليها كل مفتاح، وقيمتها كما جاءت
     من الخادم (الأساس). بهما يكتشف الخادم أن زميلاً سبقك على المفتاح نفسه،
     وبهما يُدمج تعديلك على تعديله بدل أن يمحو أحدهما الآخر. ── */
  var krev = Object.create(null), baseVal = Object.create(null);
  (function () { var r0 = BOOT.revs || {}; for (var k in r0) if (!relationalKey9(k) && !operationResource9(k) && !invalidScope9(k)) krev[k] = r0[k]; for (var k2 in mem) baseVal[k2] = mem[k2]; try { BOOT.revs = null; } catch (e) {} })();
  function unscoped(k) { var m = /^bsdept:[^:]+:(.+)$/.exec(String(k)); return m ? m[1] : String(k); }
  function notify(k) {
    /* أولاً حدث storage بالمفتاح المبادَأ: يُبطل ذاكرة القراءة في طبقة فصل الإدارات — ثم بثّ المنظومة بالمفتاح المجرّد للشاشات المستمعة */
    try { window.dispatchEvent(new StorageEvent("storage", { key: String(k) })); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("bassam:store", { detail: { key: unscoped(k), remote: true } })); } catch (e) {}
  }
  /* ── CORE-01: التوستُ الواحد للمنصة — KIVO.bsToast(msg, { tone: "err", ms }) ──
     رسائلُ الحفظ هنا ورسائلُ الإطار (root-logic) وBassamBusy.flash كلُّها تمرّ به؛ وشكلُه .bs-toast في الغلاف (بلا أنماطٍ مضمَّنة).
     يعيش في طبقة التخزين لأنها أولُ كتلةٍ مشتركةٍ حاضرةٍ دائماً تخاطب المستخدم. حتى ثلاثةِ أسطرٍ معاً (الأحدثُ أسفل) —
     فلا تمحو رسالةٌ لاحقةٌ سببَ رفضٍ سبقها — والنصُّ المكرَّر يجدّد مدّتَه ولا يتكرّر. لا يحجب شيئاً (pointer-events:none). */
  var toastBox9 = null, toastLines9 = [];
  function toastDrop9(line) {
    clearTimeout(line.t);
    var i = toastLines9.indexOf(line); if (i >= 0) toastLines9.splice(i, 1);
    try { line.el.parentNode.removeChild(line.el); } catch (e) { /* أُزيل */ }
    if (!toastLines9.length && toastBox9) { try { toastBox9.parentNode.removeChild(toastBox9); } catch (e) { /* أُزيل */ } toastBox9 = null; }
  }
  function bsToast(msg, o) {
    try {
      o = o || {};
      var text = String(msg == null ? "" : msg); if (!text) return;
      if (o.tone === "err" && text.charAt(0) !== "⚠") text = "⚠ " + text;
      if (o.tone === "err" || o.tone === "warn") saveErrAt53 = Date.now();   /* V7 · 53: الصفحةُ قالت الفشل — لا رسالةَ مركزيةَ مكرَّرة */
      var host = document.body || document.documentElement; if (!host) return;
      if (!toastBox9 || !toastBox9.parentNode) {
        toastBox9 = document.createElement("div"); toastBox9.id = "bs-stoast"; toastBox9.className = "bs-toast";
        toastBox9.setAttribute("role", "status"); toastBox9.setAttribute("aria-live", "polite"); toastBox9.setAttribute("dir", "rtl");
        host.appendChild(toastBox9); toastLines9 = [];
      }
      var line = null;
      for (var i = 0; i < toastLines9.length; i++) if (toastLines9[i].text === text) { line = toastLines9.splice(i, 1)[0]; break; }
      if (!line) { line = { text: text, el: document.createElement("div") }; line.el.textContent = text; toastBox9.appendChild(line.el); }
      toastLines9.push(line);
      while (toastLines9.length > 3) toastDrop9(toastLines9[0]);
      clearTimeout(line.t); line.t = setTimeout(function () { toastDrop9(line); }, o.ms || 6500);
    } catch (e) { /* عرضٌ فقط */ }
  }
  KIVO.bsToast = bsToast;
  /* ── شريط التعارض: ثابت أعلى الصفحة تحت الرأس، باسم مَن سبقك ووقته وعدد الخانات — يبقى حتى تغلقه ── */
  var bannerT = null;
  function esc9(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]; }); }
  function ago(ts) {
    if (!ts) return ""; var d = Math.max(0, Date.now() - ts), m = Math.round(d / 60000);
    if (d < 45000) return "قبل لحظات"; if (m < 2) return "قبل دقيقة"; if (m < 60) return "قبل " + KIVO.BassamCount(m,"دقيقة","g") + "";
    var h = Math.round(m / 60); if (h < 2) return "قبل ساعة"; if (h < 24) return "قبل " + KIVO.BassamCount(h,"ساعة","g") + ""; return "قبل أكثر من يوم";
  }
  function conflictBanner(list) {
    try {
      var host = document.body || document.documentElement; if (!host) return;
      var d = document.getElementById("bs-conflict");
      if (!d) { d = document.createElement("div"); d.id = "bs-conflict"; d.setAttribute("dir", "rtl"); d.setAttribute("role", "status"); host.appendChild(d); }
      var top = 0; try { var hb = document.querySelector(".bs-topbar"); if (hb) top = Math.round(hb.getBoundingClientRect().bottom); } catch (e) {}
      d.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);top:" + (top + 10) + "px;z-index:2147483540;background:var(--bg-xfff7e6);color:var(--fg-x7c4a03);border:1px solid var(--bd-xf1d9a8);"
        + "font:600 12.5px/1.7 Cairo,Tahoma,Arial;padding:9px 14px 9px 10px;border-radius:12px;box-shadow:var(--shadow-elevated);width:min(92vw,720px);display:flex;align-items:center;gap:10px";
      var html = "";
      /* KIVO_264 · D-6: سطران محتملان لكل سجل — «اعتُمدت قيمتك» (الخانةُ نفسُها) و«لم يُطبَّق تعديلك» (التباسٌ بقيت فيه قيمةُ زميلك المحفوظة)؛
         واسمُ الزميل وعنوانُ السجل نصٌّ مهرَّب (كانا يُحقنان HTML كما وصلا من الخادم) */
      /* KIVO_264 · المراجعةُ المستقلة: (A3b) تبويبٌ آخر لحسابك طرفٌ آخر — يُسمّى ولا يُكتم؛ (A3a) ومَن كُتب فوق تعديله بعد حفظه يُبلَّغ (over) */
      list.forEach(function (b) {
        var who = b.self ? "عُدِّل" : b.by ? ("عدّل " + esc9(b.by)) : "عُدِّل", when = ago(b.at);
        var head = who + " «" + esc9(b.lbl) + "» " + (b.self ? "من نافذةٍ أخرى لحسابك " : "") + (when ? when + " " : "") + "وأنت تعمل عليه — ";
        if (b.n) html += "<div>" + head + (b.self ? "اختلفت النافذتان في " : "اختلفتما في ") + KIVO.BassamCount(b.n, "خانة", "g") + (b.self ? " واعتُمدت قيمةُ هذه النافذة" : " واعتُمدت قيمتك") + "؛ راجعها إن لزم.</div>";
        if (b.lost) html += "<div>" + head + "تعذّر دمجُ تعديلك في " + KIVO.BassamCount(b.lost, "خانة", "g") + (b.self ? " فبقيت قيمةُ النافذة الأخرى" : " فبقيت قيمتُه كما حفظها") + " — أعد تعديلك إن لزم.</div>";
        if (b.over) html += "<div>عُدِّل «" + esc9(b.lbl) + "» بعد حفظك وحلّت قيمةٌ أخرى محلَّ تعديلك في " + KIVO.BassamCount(b.over, "خانة", "g") + " — راجعها إن لزم.</div>";
      });
      d.innerHTML = "<span style=\"flex:none;width:8px;height:8px;border-radius:50%;background:var(--bg-xd97706)\"></span><div style=\"flex:1;min-width:0\">" + html + "</div>"
        + "<button type=\"button\" aria-label=\"إغلاق\" style=\"flex:none;width:28px;height:28px;border:0;background:transparent;color:var(--fg-xa16207);font:700 16px Cairo;cursor:pointer;border-radius:8px\">×</button>";
      d.querySelector("button").onclick = function () { try { d.parentNode.removeChild(d); } catch (e) {} };
      clearTimeout(bannerT); bannerT = setTimeout(function () { try { d.parentNode.removeChild(d); } catch (e) {} }, 45000);
    } catch (e) {}
  }
  var WHY = { super: "هذا الإعداد لمسؤول المنصة وحده", "plat-name": "اسم المنصة مطلوب — لا يُحفظ فارغاً",   /* CORE-02 (B1) */
              "node-has-children": "للعقدة عُقدٌ أو إدارات تابعة — انقلها أولاً ثم احذف العقدة", "node-has-manager": "للعقدة حساب مدير عام — احذفه أولاً ثم احذف العقدة",   /* V7 P0 */
              "node-cascade": "لا تُحذف عقدةٌ مع ما تحتها في خطوةٍ واحدة — احذف التوابع أو انقلها أولاً",
              dept: "هذا السجل يخصّ إدارة أخرى", cap: "الصفحة خارج سقف إدارتك",
              page: "صلاحيتك على هذه الصفحة عرضٌ فقط", view: "صلاحيتك عرضٌ فقط", mgr: "إدارة الحسابات لمدير الإدارة",
              self: "لا يُعدَّل في حسابك سوى كلمة مرورك", users: "جدول الحسابات لم يُقبل", perms: "الصلاحيات لم تُقبل",
              dslock: "اليومُ أو الشهرُ مقفل — افتحه من كرته أوّلاً", shape: "قيمةٌ خارج الحدود المسموحة طولاً أو شكلاً", ph: "كلمةُ المرور لم تُحفظ: صيغةُ تشفيرها قديمة — حدّث الصفحة ثم أعد المحاولة",
              "scope-retired": "سقفُ النطاق القديم أُلغي ولا يُحفظ بعد الآن — الوصولُ يحدّده سقفُ الوحدة في صفحة الصلاحيات؛ عدّل سقفَ الوحدة هناك إن احتجت",   /* RISHAD-266 */
              "self-cur": "تغييرُ اسم الدخول يتطلب كلمةَ مرورك الحالية — أدخلها ثم احفظ", "self-un": "اسمُ الدخول يجب أن يكون 10 أرقام", "self-lock": "محاولاتٌ كثيرة بكلمة مرورٍ خاطئة — انتظر قليلاً ثم أعد المحاولة",   /* KIVO_262 */   /* KIVO_261 · AUD-057 */   /* KIVO_264 · D14 */
              /* KIVO_265 · مخزنُ المهام (018 taskRawWhy · المراجعةُ الموحّدة): أسبابُ رفض الحفظ الخامّ بأسمائها — كانت «صلاحيتك لا تشمله» */
              /* F01 · الأقسام وAD-7: شكلُ سجلّ الوحدات (018 deptShapeWhy) · تصادمُ المعرّفات · والكتابةُ في ما ليس وحدةَ بيانات */
              "dept-shape": "موضعٌ غير مسموح في الهيكل: القسم تحت إدارةٍ مباشرةً، ولا شيءَ تحت قسم، ولا تُحذف إدارةٌ لها أقسام",
              "dept-has-sections": "لا تُحذف إدارةٌ فيها أقسام — احذف أقسامها أو انقلها أولاً، ثم احذف الإدارة من «الهيكل» (لمسؤول المنصة)",
              "unit-delete-route": "حذفُ إدارةٍ أو قسمٍ يتمّ من «الهيكل» بزرّ الحذف لمسؤول المنصة وحده (يحذف حساباتها ومفاتيحها معاً) — لا بالحفظ العادي",
              "id-clash": "المعرّف مستخدم لوحدة أو عقدة أخرى", unit: "هذا المعرّف ليس وحدةَ بيانات (إدارة أو قسم)",
@@SYS:store.refuse.tasks.1@@              "emp-dup": "رقم الهوية أو رقم الجوال أو الرقم الوظيفي مسجّل بالفعل لموظف في إدارة أخرى أو لحساب دخول آخر — لا يُقبل التكرار في المنصة كلها؛ صحّح البيانات ثم احفظ"@@SYS:store.refuse.tasks.2@@ };
  /* KIVO_243: أسبابُ رفض الإنفاذ (تُستعمل حين __BS_AUTHZ وحده — رسائلُ النظام القديم كما هي) */
  /* RISHAD-266: سقفُ النطاق القديم أُلغي — فلا «الموقع · العنصر · الوردية» في سبب scope، ولا unmigrated-department-ceiling */
  var WHY_ENF = { perm: "صلاحيتك لا تشمل هذا الإجراء", scope: "خارج نطاقك (المسنَد إليك · المصدر · الفترة) — راجع مدير الإدارة إن كنت تحتاج هذا التعديل",
              "scope-unknown": "تعذّر التحقق من قفل الفترة لهذا التعديل — أعد المحاولة بعد قليل، وإن تكرر فأبلغ مسؤول المنصة",
              "scope-retired": WHY["scope-retired"], reason: "هذه العملية تتطلب ذكر السبب",
              "restore-policy": "الاستعادةُ لمسؤول المنصة أو لمدير الإدارة الممنوح مفتاحها", "import-allowlist": "هذا السجلّ خارج قائمة الاستيراد المسموحة",
              grant: "لا تملك منح هذا المفتاح", "p44-grants": "يُحفظ الدورُ ومنحُ حامليه معاً — رُفض جزءٌ من الحفظة نفسِها فلم يُحفظ هذا أيضاً",   /* V7 · د7 (52) */ unmapped: "تعديلٌ غيرُ مصنَّف — رُفض احتياطاً", residual: "تعديلٌ غيرُ مصنَّف — رُفض احتياطاً",
              unbound: "تعديلٌ غيرُ مصنَّف — رُفض احتياطاً", keydel: "حذفُ السجل كاملاً غيرُ مسموح", shape: "صيغةُ البيانات لم تُقبل", ph: "كلمةُ المرور لم تُحفظ: صيغةُ تشفيرها قديمة — حدّث الصفحة ثم أعد المحاولة" };   /* KIVO_262 */
  /* «فحص الصلاحيات العميق (2026-10-21)» — المرحلة 0 (منقولٌ من الخطّ القديم 0ab9fa7 · 70279e7): أسبابُ رفض قاعدة المانح وحسابات المديرين بأسمائها
     (018 permsGrantWhy · usersEkeyWhy · usersA1Why · 059) — بالوضعين */
  WHY.target = "صلاحياتُ المديرين ومديري العقد يعدّلها مسؤول المنصة أو مديرُ الفرع الأعلى — وتعدّل أنت صلاحياتِ موظفي إدارتك وحدهم";
  WHY.ekey = "مفتاحُ هذا الحساب مفتاحُ مدير («mgr:» أو «gm:» أو مفتاحُ حسابِ مديرٍ قائم) — يُنشئه ويعدّله مسؤول المنصة وحده؛ يمكنك تجميد الحساب أو حذفه فقط — إعادة تفعيله لمسؤول المنصة";
  WHY["img-escape"] = "السجل أكبر من الحد المسموح للحفظ — قسّمه إلى سجلات أصغر أو اختصر نصوصه ثم أعد الحفظ";
  WHY["img-limit"] = "في السجل أكثر من ٥٠٠٠ صورة مختلفة — احذف صوراً أو قسّم السجل ثم أعد الحفظ";
  WHY["mgr-key"] = "حساب مدير الإدارة لا تُنزع عنه الإدارة — احذف الحساب أو أبقه مديراً";
  WHY.grant = "لا تمنح موظفاً صفحةً أو إجراءً أو عدسةً لا تملكها أنت في هذه الإدارة";
  WHY["dept-role"] = "«حسابات الإدارة» أُلغيت: لا يُنشأ حسابٌ بهذا النوع ولا يُعدَّل — للدخول باسم الإدارة أنشئ حسابَ موظفٍ بشارة «مدير» في الإدارة، ويمكن حذفُ الحساب القديم";
  function monthLockedText9(day) {
    var u = null; try { u = KIVO.BassamAuth && KIVO.BassamAuth.user && KIVO.BassamAuth.user(); } catch (e) {}
    var mgr = !!(u && (u.role === "super" || u.role === "gm" || u.role === "dept" || (u.role === "staff" && u.mgr)));
    return (day ? "اليوم مقفل" : "الشهر مقفل") + (mgr ? " — افتحه للاستدراك أولاً" : " — راجع مدير الإدارة");
  }
  WHY["day-needs-month"] = "لم يُحفظ — اليومُ في شهرٍ مقفل لا يُفتح وحده؛ افتح الشهرَ للاستدراك معه ثم أعد المحاولة";   /* V7 · 53 (S13) */
  function whyText9(w) { return (KIVO.__BS_AUTHZ && WHY_ENF[w]) || WHY[w] || "صلاحيتك لا تشمله"; }
  /* ═══ أسماء مفاتيح التخزين كما تُعرض للمستخدم — مصدر واحد للسجلات والمراقبة والأمن ═══
     كانت ثلاث خرائط ناقصة في ثلاثة مواضع، وما نقص منها ظهر للمستخدم بالاسم الداخلي («dayfocus» · «notif_sys»).
     kind: data = محتوى يعمل عليه المستخدم · tech = مفتاح تقني للجهاز أو الجلسة (يُسمّى بالعربية ولا يُعدّ «تعديلاً») */
  KIVO.BassamKeyLabels = (function(){
    var M = {
      bassam_employees_v1:["قائمة الموظفين"],@@SYS:store.keyLabels.staff@@@@SYS:store.keyLabels.daily@@@@SYS:store.keyLabels.dreport@@
@@SYS:store.keyLabels.plan@@      @@SYS:store.keyLabels.tasks@@@@SYS:store.keyLabels.custody@@
@@SYS:store.keyLabels@@      bassam_options_v1:["خيارات الموظفين"], bassam_shift_options_v1:["الورديات"],@@SYS:store.keyLabels.dreport.lk@@@@SYS:store.keyLabels.staff.callsigns@@
      bassam_auth_users_v1:["حسابات الدخول"], bassam_perms_v1:["الصلاحيات"], bassam_roles_v1:["أدوار الصلاحيات"], bassam_grants_v1:["منح الصلاحيات"],
      bassam_depts_v1:["الإدارات"], bassam_gdepts_v1:["الهيكل التنظيمي"], bassam_platform_v1:["إعدادات المنصة"], bassam_profile_v1:["الملف الشخصي"],
      bassam_media:["الصور والملفات"], bassam_notifications_domain_v1:["التنبيهات والتعاميم"],
      bassam_last_export_v1:["آخر تصدير"], bassam_last_full_export_v1:["آخر نسخة شاملة"],
      /* تقنية */
      bassam_session_v1:["الجلسة","tech"], bassam_active_dept_v1:["الإدارة النشطة","tech"], bassam_page_v1:["الصفحة المحفوظة","tech"],@@SYS:store.keyLabels.staff.tech@@ bassam_theme:["المظهر","tech"],
      bassam_dayfocus_v1:["اليوم المختار","tech"], bassam_dayshift_v1:["الوردية المختارة","tech"], bassam_notif_dev_v1:["جهاز التنبيهات","tech"], bassam_notif_mute_v1:["كتم التنبيهات","tech"],
      bassam_fresh_login_v1:["راية أول دخول","tech"], bassam_first_boot_v1:["أول تشغيل","tech"], bassam_demo_purged_v1:["تنظيف البيانات التجريبية","tech"], bassam_struct_seed_v1:["تهيئة الهيكل التنظيمي","tech"],
      bassam_perm_admsubs_v2:["ترقية الصلاحيات","tech"], bassam_perm_help_v1:["ترقية الصلاحيات","tech"], bassam_perm_irshad_cap_v1:["ترقية الصلاحيات","tech"], bassam_perm_leaf_v1:["ترقية الصلاحيات","tech"],@@SYS:store.keyLabels.staff.limit@@ bassam_perm_mgr_explicit_v1:["ترقية الصلاحيات","tech"], bassam_perm_seized_cap_v1:["ترقية الصلاحيات","tech"]
    };
    function unscope(k){ var m = /^bsdept:([^:]+):(.+)$/.exec(String(k || "")); return m ? m[2] : String(k || ""); }
    function base(k){ return unscope(k).replace(/:.*$/, ""); }   /* bassam_page_v1:d1 → bassam_page_v1 */
    return {
      label: function(k){ var e = M[base(k)]; return e ? e[0] : "بيانات المنصة"; },
      kind:  function(k){ var e = M[base(k)]; return e ? (e[1] || "data") : "data"; },
      isTech: function(k){ var e = M[base(k)]; return !!(e && e[1] === "tech"); },
      deptOf: function(k){ var m = /^bsdept:([^:]+):/.exec(String(k || "")); return m ? m[1] : ""; },
      all: M
    };
  })();
  function lbl(k) { return KIVO.BassamKeyLabels.label(k); }

  /* ═══ الدمج الثلاثي: الأساس (ما قرأتَه) · نسختك · نسخة زميلك ═══
     ما غيّرتَه أنت وحدك يبقى، وما غيّره هو وحده يؤخذ، وما غيّرتماه معاً
     تُرجَّح نسختك ويُحصى تعارضاً. المصفوفات ذات المعرّفات (id/eid) تُدمج
     عنصراً عنصراً كذلك — فإضافة موظفٍ عند زميلك لا تضيع بحفظك. */
  function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  function deq(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (!deq(a[i], b[i])) return false; return true; }
    var ka = Object.keys(a), kb = Object.keys(b); if (ka.length !== kb.length) return false;
    for (var j = 0; j < ka.length; j++) if (!Object.prototype.hasOwnProperty.call(b, ka[j]) || !deq(a[ka[j]], b[ka[j]])) return false;
    return true;
  }
  /* KIVO_264 · D-6 (عالٍ · فقدُ تعديل الزميل): كانت هويةُ العنصر id·eid·key·k·nid·tok وحدها — لا تعرف uid (المصلى والباب والمعلم
     والمسار) ولا sid (الموقع) ولا ekey (صفُّ التقرير اليومي) ولا معرّفَ المهمة (الخانة 13 من صفّها) — فالقائمةُ بلا هويةٍ معروفة كانت
     تُحسم «نسختي تغلب» كاملةً: زميلٌ أغلق مصلى في موقعٍ وأنا في موقعٍ آخر ⇒ يضيع إغلاقُه بلا علمه. والهويةُ لم تكن تُشترط فريدة
     (eid المكرَّر في سجل حركات العهد كان يدمج حركتين في واحدة). الآن: (١) الهويةُ الثابتة أولاً — حقلٌ موجودٌ وفريدٌ في النسخ الثلاث؛
     (٢) بلا هوية: الصفُّ الموضعيّ (أنواعٌ مختلطة) يُدمج خانةً خانة، والقائمةُ تُحاذى بالأساس (diff3) فتبقى إضافاتُ الطرفين وحذفُهما؛
     (٣) وما يلتبس (كلانا بدّل العنصرَ نفسَه) لا يُسقط بصمت: تبقى القيمةُ المحفوظة عند الخادم ويُحصى «لم يُطبَّق تعديلك» (l) ويظهر في
     الشريط القائم — و c يبقى «اختلفتما في الخانة نفسِها واعتُمدت قيمتك» كما كان. */
  /* KIVO_264 · المراجعةُ المستقلة (A3c · A4): لا ترتيبَ عامّاً لحقولٍ مرشَّحة — مفتاحٌ أجنبيٌّ فريدٌ صدفةً (eid في حركات العهد) كان يصير هوية
     فتندمج حركتا تسليمٍ متزامنتان لموظفٍ جديد في واحدة، والخانةُ 13 كانت هويةَ كلّ مصفوفةٍ بأربعة عشر عموداً. الهويةُ الآن صريحةٌ لكل موردٍ
     وموضعٍ معروف في قيمته (المسار: «*» أيُّ مفتاحٍ أو عنصر)، وتُشترط موجودةً وفريدةً في النسخ الثلاث؛ وما سواها (قائمةٌ مجهولة أو هويةٌ
     ناقصة) يُدمج بالمحاذاة الآمنة ويُبلَّغ ما يلتبس. والخانةُ 13 هويةُ صفوف المهام وحدها (يعتمد عليها نظامُ المهام). */
  var IDMAP9 = (function () {
    var M = {
@@SYS:store.identity.daily@@@@SYS:store.identity.plan@@@@SYS:store.identity.dreport@@@@SYS:store.identity.tasks@@      bassam_employees_v1: { "": "eid" },
     @@SYS:store.identity@@
      bassam_auth_users_v1: { "": "id" }, bassam_depts_v1: { "": "id" }, bassam_gdepts_v1: { "": "id" }
    };
    /* عناصرُ الخريطة التشغيلية تحت كلّ موقع (المصلى · الباب · المعلم · المسار): uid الثابت (500-element-uid) — ومرآتُها في رأس الخطة */
    [@@SYS:store.identity.uid.daily@@@@SYS:store.identity.uid.plan@@].forEach(function (x) {
      ["zones", "gates", "marks", "paths"].forEach(function (e) { M[x[0]][x[1] + e] = "uid"; });
    });
    var out = {}, r, q;
    for (r in M) { out[r] = []; for (q in M[r]) out[r].push({ p: q === "" ? [] : q.split("."), f: M[r][q] }); }
    return out;
  })();
  function idFor9(X, path) {
    var L = X && X.spec; if (!L) return null;
    for (var i = 0; i < L.length; i++) {
      var p = L[i].p, ok = p.length === path.length;
      for (var j = 0; ok && j < p.length; j++) if (p[j] !== "*" && p[j] !== path[j]) ok = false;
      if (ok) return L[i].f;
    }
    return null;
  }
  function nmap9() { return Object.create(null); }
  function idOf9(e, f) {
    var v;
    if (typeof f === "function") return f(e);          /* F10-fix: هويةٌ محسوبةٌ للقائمة (gid9) */
    if (typeof f === "number") {
      if (!Array.isArray(e) || e.length <= f) return null; v = e[f];
      return ((typeof v === "number" && isFinite(v)) || (typeof v === "string" && v !== "")) ? String(v) : null;
    }
    if (!isObj(e)) return null; v = e[f];
    return (v == null || v === "" || typeof v === "object") ? null : String(v);
  }
  function idUnique9(arrs, f) {
    var any = false;
    for (var a = 0; a < arrs.length; a++) {
      var arr = arrs[a], seen = nmap9();
      for (var i = 0; i < arr.length; i++) { var id = idOf9(arr[i], f); if (id === null || seen[id]) return false; seen[id] = 1; any = true; }
    }
    return any;
  }
  function toMap(arr, fld) { var m = nmap9(), order = []; for (var i = 0; i < arr.length; i++) { var id = idOf9(arr[i], fld); order.push(id); m[id] = arr[i]; } return { m: m, order: order }; }
  /* الترتيبُ بعد الدمج: من أعاد الترتيبَ وحده يُتّبع ترتيبُه، وكلُّ عنصرٍ جديد يُدرج بعد سابقه — والإضافتان المتزامنتان في الموضع نفسه
     كلتاهما، الأسبقُ حفظاً أولاً. وإعادةُ ترتيبٍ مختلفة عند الطرفين: ترتيبي ويُحصى تعارضاً. */
  function reordered9(ordB, ordX) {
    var at = nmap9(), last = -1, i;
    for (i = 0; i < ordX.length; i++) at[ordX[i]] = i;
    for (i = 0; i < ordB.length; i++) { var p = at[ordB[i]]; if (p === undefined) continue; if (p < last) return true; last = p; }
    return false;
  }
  function mergeOrder9(ordB, ordM, ordT, has) {
    var rm = reordered9(ordB, ordM), rt = reordered9(ordB, ordT), P = ordM, S = ordT, c = 0, out = [], pos = nmap9(), i, j;
    if (!rm && rt) { P = ordT; S = ordM; } else if (rm && rt && reordered9(ordM, ordT)) c = 1;
    for (i = 0; i < P.length; i++) if (has(P[i]) && !pos[P[i]]) { pos[P[i]] = 1; out.push(P[i]); }
    for (i = 0; i < S.length; i++) {
      var id = S[i]; if (!has(id) || pos[id]) continue;
      var at = -1; for (j = i - 1; j >= 0; j--) if (pos[S[j]]) { at = out.indexOf(S[j]); break; }
      out.splice(at + 1, 0, id); pos[id] = 1;
    }
    return { o: out, c: c };
  }
  function m3ids9(b, m, t, fld, X, path) {
    var B = toMap(b, fld), M = toMap(m, fld), T = toMap(t, fld), r = m3obj(B.m, M.m, T.m, X, path.concat("*"), true);
    var od = mergeOrder9(B.order, M.order, T.order, function (id) { return Object.prototype.hasOwnProperty.call(r.v, id); });
    return { v: od.o.map(function (id) { return r.v[id]; }), c: r.c + od.c, l: r.l };
  }
  /* بلا هوية — صفٌّ موضعيّ (أنواعٌ مختلطة كصفّ المهمة، أو إحداثيٌّ رقميٌّ من خانتين أو ثلاث) يُدمج خانةً خانة.
     KIVO_264 (A5): كانت حتى أربع خانات — فمجموعةُ أيام الراحة الأربعة تُدمج موضعاً ويضيع تبديلُ الزميل؛ صارت المجموعاتُ بالمحاذاة. */
  function kind9(x) { return x === null ? "n" : Array.isArray(x) ? "a" : typeof x; }
  function hetero9(a) { for (var i = 1; i < a.length; i++) if (kind9(a[i]) !== kind9(a[0])) return true; return false; }
  function numShort9(a) { if (a.length < 2 || a.length > 3) return false; for (var i = 0; i < a.length; i++) if (typeof a[i] !== "number") return false; return true; }
  function tuple9(b, m, t) {
    return b.length === m.length && m.length === t.length && (hetero9(b) || hetero9(m) || hetero9(t) || (numShort9(b) && numShort9(m) && numShort9(t)));
  }
  function m3pos9(b, m, t, X, path) {
    var out = [], c = 0, l = 0, pe = path.concat("*");
    for (var i = 0; i < m.length; i++) {
      var r;
      if (deq(m[i], t[i]) || deq(b[i], t[i])) r = { v: m[i], c: 0, l: 0 };
      else if (deq(b[i], m[i])) r = { v: t[i], c: 0, l: 0 };
      else if ((Array.isArray(m[i]) && Array.isArray(t[i])) || (isObj(m[i]) && isObj(t[i]))) r = m3(b[i], m[i], t[i], X, pe);
      else r = { v: m[i], c: 1, l: 0 };                /* الخانةُ نفسُها بقيمتين — قيمتي، ويُحصى */
      out.push(r.v); c += r.c; l += r.l;
    }
    return { v: out, c: c, l: l };
  }
  /* بلا هوية — قائمة: محاذاةٌ بالأساس (أطولُ تتابعٍ مشترك) كدمج الملفات النصّية: ما بقي عند الطرفين مرساة، وبين كلّ مرساتين يُطبَّق
     تغييرُ من غيّر وحده، وتُجمع إضافاتُ الطرفين بمواضعها (الأسبقُ حفظاً أولاً) ويُحذف ما حذفه أحدهما. */
  function cj9(x) {
    if (x === null || typeof x !== "object") return JSON.stringify(x);
    if (Array.isArray(x)) return "[" + x.map(cj9).join(",") + "]";
    return "{" + Object.keys(x).sort().map(function (k) { return JSON.stringify(k) + ":" + cj9(x[k]); }).join(",") + "}";
  }
  var LCS_MAX9 = 1000000;                            /* سقفُ خلايا المحاذاة — ما فوقه يعود إلى الحالة الآمنة (قيمةُ الخادم + إبلاغ) */
  function lcs9(A, B) {
    var n = A.length, m = B.length, s = 0, e = 0, out = [], i, j;
    while (s < n && s < m && A[s] === B[s]) { out.push([s, s]); s++; }
    while (e < n - s && e < m - s && A[n - 1 - e] === B[m - 1 - e]) e++;
    var N = n - s - e, M = m - s - e;
    if (N && M) {
      if (N * M > LCS_MAX9) return null;
      var W = M + 1, L = new Uint32Array((N + 1) * W);
      for (i = N - 1; i >= 0; i--) for (j = M - 1; j >= 0; j--)
        L[i * W + j] = A[s + i] === B[s + j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
      i = 0; j = 0;
      while (i < N && j < M) {
        if (A[s + i] === B[s + j]) { out.push([s + i, s + j]); i++; j++; }
        else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) i++; else j++;
      }
    }
    for (i = 0; i < e; i++) out.push([n - e + i, m - e + i]);
    return out;
  }
  function same9(ha, a0, a1, hb, b0, b1) { if (a1 - a0 !== b1 - b0) return false; for (var i = 0; i < a1 - a0; i++) if (ha[a0 + i] !== hb[b0 + i]) return false; return true; }
  /* KIVO_264 · المراجعة (A3c · الاحتياط الآمن): الموضعُ الذي غيّره الطرفان يُدمج خانةً خانة إن كان العنصرُ نفسَه — خانةُ هويةٍ لم تتغيّر عند
     أحد، أو نصفُ خاناته على الأقل باقٍ عند الثلاثة — وإلا فهو استبدالٌ أو نقل (أعاد كلانا الترتيب): لا يُركَّب عنصرٌ من عنصرين، والقطعةُ ملتبسة */
  var IDLIKE9 = /^(id|uid|sid|eid|ekey|key|k|nid|tok|code)$/;
  function sameEl9(b, m, t) {
    var n = 0, s = 0, f, ks;
    if (isObj(b) && isObj(m) && isObj(t)) {
      ks = nmap9(); [b, m, t].forEach(function (o) { Object.keys(o).forEach(function (q) { ks[q] = 1; }); });
      for (f in ks) {
        n++;
        if (!deq(b[f], m[f]) || !deq(b[f], t[f])) continue;
        s++; if (IDLIKE9.test(f) && ((typeof b[f] === "string" && b[f] !== "") || (typeof b[f] === "number" && isFinite(b[f])))) return true;
      }
      return 2 * s >= n;
    }
    if (Array.isArray(b) && Array.isArray(m) && Array.isArray(t)) {
      n = Math.max(b.length, m.length, t.length);
      for (f = 0; f < n; f++) if (deq(b[f], m[f]) && deq(b[f], t[f])) s++;
      return n > 0 && 2 * s >= n;
    }
    return true;                                     /* قيمٌ مفردة: الخانةُ نفسُها بقيمتين — قيمتي وتُحصى (الدلالةُ القائمة) */
  }
  function chunk9(S, b0, b1, m0, m1, t0, t1) {
    var b = S.b, m = S.m, t = S.t, i, s;
    if (same9(S.hm, m0, m1, S.hb, b0, b1)) return { v: t.slice(t0, t1), c: 0, l: 0 };   /* لم يغيّر هنا إلا زميلي */
    if (same9(S.ht, t0, t1, S.hb, b0, b1) || same9(S.hm, m0, m1, S.ht, t0, t1)) return { v: m.slice(m0, m1), c: 0, l: 0 };
    if (b1 - b0 === m1 - m0 && m1 - m0 === t1 - t0) {   /* تعديلٌ في المكان */
      for (i = 0; i < b1 - b0; i++) {
        var hb = S.hb[b0 + i], hm = S.hm[m0 + i], ht = S.ht[t0 + i];
        if (hm !== hb && ht !== hb && hm !== ht && !sameEl9(b[b0 + i], m[m0 + i], t[t0 + i])) return { v: t.slice(t0, t1), c: 0, l: 1 };
      }
      return m3pos9(b.slice(b0, b1), m.slice(m0, m1), t.slice(t0, t1), S.X, S.path);
    }
    var both = false;                                /* عنصرٌ من الأساس حذفه الطرفان (أو بدّلاه) */
    for (i = b0; i < b1; i++) if (S.om[i] < 0 && S.ot[i] < 0) both = true;
    var ins = function (arr, h, x0, x1, back) { var o = [], sl = 0; for (var q = x0; q < x1; q++) { if (back[q] >= 0) sl = back[q] - b0 + 1; else o.push({ s: sl, v: arr[q], h: h[q] }); } return o; };
    var iM = ins(m, S.hm, m0, m1, S.mm), iT = ins(t, S.ht, t0, t1, S.mt);
    if (both && iM.length && iT.length) return { v: t.slice(t0, t1), c: 0, l: 1 };    /* التباس: القيمةُ المحفوظة تبقى، وتعديلي لم يُطبَّق — يُبلَّغ */
    var out = [], seen;
    for (s = 0; s <= b1 - b0; s++) {
      seen = nmap9();
      for (i = 0; i < iT.length; i++) if (iT[i].s === s) { out.push(iT[i].v); seen[iT[i].h] = 1; }
      for (i = 0; i < iM.length; i++) if (iM[i].s === s && !seen[iM[i].h]) out.push(iM[i].v);
    }
    return { v: out, c: both && iM.length ? 1 : 0, l: both && iT.length ? 1 : 0 };
  }
  function m3seq9(b, m, t, X, path) {
    var S = { b: b, m: m, t: t, X: X, path: path, hb: b.map(cj9), hm: m.map(cj9), ht: t.map(cj9), om: [], ot: [], mm: [], mt: [] }, i;
    var pm = lcs9(S.hb, S.hm), pt = lcs9(S.hb, S.ht);
    if (!pm || !pt) return null;
    for (i = 0; i < b.length; i++) { S.om.push(-1); S.ot.push(-1); }
    for (i = 0; i < m.length; i++) S.mm.push(-1);
    for (i = 0; i < t.length; i++) S.mt.push(-1);
    pm.forEach(function (p) { S.om[p[0]] = p[1]; S.mm[p[1]] = p[0]; });
    pt.forEach(function (p) { S.ot[p[0]] = p[1]; S.mt[p[1]] = p[0]; });
    var out = [], c = 0, l = 0, ib = 0, im = 0, it = 0;
    for (i = 0; i <= b.length; i++) {
      if (i < b.length && !(S.om[i] >= 0 && S.ot[i] >= 0)) continue;   /* المرساة: عنصرٌ بقي كما هو عند الطرفين */
      var r = chunk9(S, ib, i, im, i < b.length ? S.om[i] : m.length, it, i < b.length ? S.ot[i] : t.length);
      for (var q = 0; q < r.v.length; q++) out.push(r.v[q]);
      c += r.c; l += r.l;
      if (i < b.length) { out.push(m[S.om[i]]); ib = i + 1; im = S.om[i] + 1; it = S.ot[i] + 1; }
    }
    /* العنصرُ نفسُه نقله كلٌّ منّا إلى موضع ⇒ يخرج مرتين من المحاذاة. نسخةٌ لا يملكها أيٌّ من الطرفين التباسٌ: القيمةُ المحفوظة وتُبلَّغ */
    var nm = nmap9(), nt = nmap9(), no = nmap9(), h;
    S.hm.forEach(function (x) { nm[x] = (nm[x] || 0) + 1; }); S.ht.forEach(function (x) { nt[x] = (nt[x] || 0) + 1; });
    for (i = 0; i < out.length; i++) {
      h = cj9(out[i]); if (!(h in nm) && !(h in nt)) continue;   /* عنصرٌ مدموج — ليس نسخةً من أحدهما */
      no[h] = (no[h] || 0) + 1;
      if (no[h] > Math.max(nm[h] || 0, nt[h] || 0)) return { v: t, c: 0, l: Math.max(1, l) };
    }
    return { v: out, c: c, l: l };
  }
  /* F10-fix: { key, grp } — الهويةُ key، وما تكرّر منها في أيٍّ من النسخ الثلاث (صفوفُ مهمةٍ جماعية: صفٌّ لكل مكلَّف) يُميَّز بـgrp في النسخ كلِّها —
     فتبقى الهويةُ واحدةً للصفّ في الأطراف الثلاثة. كانت 13 وحدها تتكرّر في يومٍ فيه مهمةٌ جماعية فيُدمج اليومُ كلُّه بالمحاذاة (m3seq9)، وصفٌّ غيّره
     الطرفان مع إضافةٍ في القطعة نفسِها (مهمةٌ جديدة) يجعل القطعةَ «ملتبسة» فتُسقط إضافةُ المدير وتعديلاتُه (tasks_k265_f10 · (أ)) */
  function gid9(arrs, f) {
    var sh = nmap9(), a, i, id;
    for (a = 0; a < arrs.length; a++) { var seen = nmap9(); for (i = 0; i < arrs[a].length; i++) { id = idOf9(arrs[a][i], f.key); if (id === null) continue; if (seen[id]) sh[id] = 1; seen[id] = 1; } }
    return function (e) {
      var v = idOf9(e, f.key); if (v === null || !sh[v]) return v;
      var g = Array.isArray(e) && e.length > f.grp ? e[f.grp] : null;
      return v + "|" + (g == null ? "" : typeof g === "object" ? JSON.stringify(g) : String(g));
    };
  }
  function m3arr9(b, m, t, X, path) {
    var B = b || [], fld = idFor9(X, path);
    if (fld !== null && isObj(fld) && fld.key != null) fld = gid9([B, m, t], fld);
    if (fld !== null && idUnique9([B, m, t], fld)) return m3ids9(B, m, t, fld, X, path);
    if (b && tuple9(b, m, t)) return m3pos9(b, m, t, X, path);
    return m3seq9(B, m, t, X, path) || { v: t, c: 0, l: 1 };   /* أكبر من أن تُحاذى: القيمةُ المحفوظة تبقى ويُبلَّغ — لا محوَ صامتاً لأحد */
  }
  function m3(b, m, t, X, path) {
    path = path || [];
    if (deq(m, t)) return { v: m, c: 0, l: 0 };
    if (deq(b, t)) return { v: m, c: 0, l: 0 };           /* لم يغيّره إلا أنا */
    if (deq(b, m)) return { v: t, c: 0, l: 0 };           /* لم يغيّره إلا هو */
    if (isObj(m) && isObj(t) && (b === undefined || isObj(b))) return m3obj(b === undefined ? nmap9() : b, m, t, X, path, false);   /* بلا أساس: أنشأه الطرفان معاً */
    if (Array.isArray(m) && Array.isArray(t)) return m3arr9(Array.isArray(b) ? b : null, m, t, X, path);
    return { v: m, c: 1, l: 0 };                          /* الخانةُ نفسُها بقيمتين — نسختك تُرجَّح ويُحصى تعارضاً */
  }
  /* elem: مفاتيحُ m/t معرّفاتُ عناصر قائمة (لا أسماءُ حقول) — فمسارُ ما تحتها «*» واحدٌ لكل عنصر */
  function m3obj(b, m, t, X, path, elem) {
    var out = nmap9(), c = 0, l = 0, ks = nmap9(), k, H = Object.prototype.hasOwnProperty;
    path = path || [];
    Object.keys(m).concat(Object.keys(t)).forEach(function (q) { ks[q] = 1; });
    for (k in ks) {
      var inM = H.call(m, k), inT = H.call(t, k), inB = H.call(b, k);
      if (inM && inT) { var r = m3(inB ? b[k] : undefined, m[k], t[k], X, elem ? path : path.concat(k)); out[k] = r.v; c += r.c; l += r.l; }
      else if (inM) { if (inB) { if (!deq(b[k], m[k])) { out[k] = m[k]; c++; } } else out[k] = m[k]; }   /* حذفه هو وعدّلتُه أنا — أُبقيه ويُحصى */
      else { if (inB) { if (!deq(b[k], t[k])) { out[k] = t[k]; l++; } } else out[k] = t[k]; }            /* حذفتُه أنا وعدّله هو — يعود، وحذفي لم يُطبَّق */
    }
    return { v: out, c: c, l: l };
  }
  /* k: مفتاحُ التخزين — منه تُعرف خريطةُ هويات المورد (بلا مفتاح: لا هويةَ تُستنتج، والدمجُ بالمحاذاة الآمنة) */
  function merge3(baseS, mineS, theirsS, k) {
    var b, m, th;
    try { b = baseS == null ? undefined : JSON.parse(baseS); m = JSON.parse(mineS); th = theirsS == null ? undefined : JSON.parse(theirsS); }
    catch (e) { return { v: mineS, c: 1, l: 0 }; }
    if (th === undefined) return { v: mineS, c: 0, l: 0 };
    var r = m3(b, m, th, { spec: k ? (IDMAP9[unscoped(k)] || null) : null }, []);
    return { v: JSON.stringify(r.v), c: r.c, l: r.l };
  }
  /* عددُ الخانات المختلفة بين قيمتين (للشريط وحده) */
  function dn9(a, b) {
    if (deq(a, b)) return 0;
    var n = 0, q, ks;
    if (isObj(a) && isObj(b)) { ks = nmap9(); Object.keys(a).concat(Object.keys(b)).forEach(function (x) { ks[x] = 1; }); for (q in ks) n += dn9(a[q], b[q]); return n; }
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) { for (q = 0; q < a.length; q++) n += dn9(a[q], b[q]); return n; }
    return 1;
  }
  /* KIVO_264 · المراجعة (A3a): «نسختي تغلب» كانت تُعلَم الحافظَ اللاحق وحده («اعتُمدت قيمتك») والأسبقُ الذي كُتب فوق تعديله لا يعلم شيئاً.
     لكل مفتاحٍ حفظتُه في آخر WIN9 يُحفظ أساسُ تعديلي وقيمتُه المحفوظة؛ فإذا وصلت للخادم قيمةٌ أخرى (سحبٌ حيّ · جوابُ تعارضٍ أو رفض)
     ودمجُ تعديلي عليها يغيّرها — أي لم يعد تعديلي فيها — يُقال لي في الشريط نفسِه «بعد حفظك». ويُستهلك السجلُّ عند أوّل قيمةٍ تصل
     (صارت هي أساسي)، فلا يُبلَّغ عن تعديلٍ واحدٍ مرتين. */
  var mine9 = Object.create(null), overQ9 = [], WIN9 = 300000;
  /* KIVO_265 · فحص القبول: مخزنُ الحسابات يعيده الخادمُ مُطبَّعاً (بصمةُ كلمة المرور بدل نصّها · تفعيلُ الحساب تلقائياً) — فالفرقُ بين ما حفظتُه وما عاد
     ليس كاتباً آخر فوق تعديلي؛ كان الشريطُ يعلن «عُدِّل حسابات الدخول بعد حفظك» بعد كلّ إضافة موظفٍ أو تغيير كلمة مرور */
  var NORM9 = { bassam_auth_users_v1: 1 };
  function overCheck9(k, nv) {
    var x = mine9[k]; if (!x) return; delete mine9[k];
    if (NORM9[unscoped(k)]) return;
    if (Date.now() - x.at > WIN9 || x.m === nv) return;
    var n = 1;
    if (nv != null) {
      try {
        var t = JSON.parse(nv), r = m3(x.b == null ? undefined : JSON.parse(x.b), JSON.parse(x.m), t, { spec: IDMAP9[unscoped(k)] || null }, []);
        if (deq(r.v, t)) return;                     /* تعديلي قائمٌ فيها — لا شيء يُبلَّغ */
        n = Math.max(1, dn9(r.v, t));
      } catch (e) { n = 1; }                         /* قيمةٌ ليست JSON: تغيّرت بعد حفظي ⇒ خانةٌ واحدة */
    }
    overQ9.push({ k: k, lbl: lbl(k), over: n });
  }
  function overFlush9(list) { var L = (list || []).concat(overQ9.splice(0)); if (L.length) conflictBanner(L); }
  /* V7 · د6 (QA) · البند ٥: مسارُ خادمٍ نفّذ طلبَ المستخدم نفسِه (حذفُ إدارة · مسحُها · نقلُ الموظفين وإنشاءُ حساباتهم واستيرادُهم · استيرادُ النسخة واستعادتُها)
     يكتب مفاتيحَ حفظتُها أنا قبل قليل — فقيمتُه الجديدة «من فعلي» لا كاتبٌ آخر. own9[k] = آخرُ مراجعةٍ كتبها فعلي؛ ما يصل بمراجعةٍ ≤ منها لا يُفحص،
     وسجلُّ mine9 لحفظي السابق يُستهلك (فعلُ الخادم أحدثُ منه وبُني على قيمة الخادم). ما يصل بمراجعةٍ أعلى (جهازٌ آخر بعد فعلي) يُفحص كالمعتاد */
  var own9 = Object.create(null);
  function srvMine9(revs) {
    if (!revs || typeof revs !== "object") return;
    var k; for (k in revs) { delete mine9[k]; var r = Number(revs[k]) || 0; if (r > (own9[k] || 0)) own9[k] = r; }
    overQ9 = overQ9.filter(function (x) { return !(x.k in revs); });
    return srvSettle9(revs);
  }
  /* V7 · د7 (409 restore-epoch-changed بعد حذف موظف): السببُ الجذري — مسارُ الخادم (نقلُ الموظفين وحذفُهم · مسحُ إدارة · الاستيراد والاستعادة)
     يرفع حقبةَ الاستعادة (019e bumpEpoch)، وطبقةُ الحفظ كانت تعلّم مفاتيحَه «من فعلي» وتبقي حقبتَها القديمة (operationEpoch9) ومراجعاتِها حتى
     يصل إشعارُ التغييرات؛ فالمحرِّرُ الذي يُفتح قبله (إضافةُ موظف) يرسل الحقبةَ القديمة فيردّه الخادم 409. الآن: إيصالُ مسار الخادم يُعيد قراءةَ
     ما تعرفه الطبقةُ من موارد التشغيل ومفاتيحِ الإيصال في الإدارة الحالية (operationRead9 — يجدّد الحقبةَ ويُسقط ما سواها كما في أي تغيّرٍ للحقبة)،
     ونقلُ الموظفين (590) ينتظر الوعدَ قبل إعلان النجاح؛ حذفُ الإدارة والاستعادةُ يستفيدان منه دون انتظار. */
  function srvSettle9(revs) {
    var stamp = operationContext9();
    if (!stamp) return Promise.resolve({ ok: 0, err: 'session' });
    var keys = Object.keys(operationKnown9).filter(function (key) {
      var known = operationKnown9[key];
      return known && known.stamp && operationSame9(known.stamp) && ['ready', 'absent'].includes(known.state);
    }).concat(Object.keys(revs || {}).filter(function (key) { return operationKey9(key) && key.split(':')[1] === stamp.dept; }));
    keys = Array.from(new Set(keys)).slice(0, 80);
    if (!keys.length) return Promise.resolve({ ok: 1 });   /* لا موردَ معروف ⇒ لا مسودةَ ممكنة؛ أولُ قراءةٍ تجلب الحقبةَ الجديدة */
    return operationRead9(keys).then(function (r) { return r && r.ok === 1 ? { ok: 1 } : { ok: 0, err: (r && r.err) || 'read' }; }, function () { return { ok: 0, err: 'read' }; });
  }

  /* ── الطابور والإرسال ───────────────────────────────────────────────────── */
  var pSet = Object.create(null), pDel = Object.create(null), dirty = false, deniedN9 = 0, deniedK9 = Object.create(null);   /* KIVO_264 (المراجعة R2): عدّادٌ لكل مفتاح أيضاً */
  /* KIVO_264 · المراجعة (A3b): ما أرسلته هذه الصفحةُ لكل مفتاح منذ آخر إقرار — طلبٌ حُفظ وضاع جوابُه ثم أُعيد (ولو بقيمةٍ أحدث) يعود
     «تعارضاً مع حسابك» قيمتُه إحدى هذه: هي أنا لا نافذةٌ أخرى */
  var sent9 = Object.create(null);

  /* why9: سببٌ اختياريّ تكتبه الواجهةُ بنفسها (why) فيُرسل بياناً للسجل — لا يُسأل عنه أحد (V7 · 53 noreason) · hold9: مفاتيحُ معلّقةٌ على تأكيد نافذة الاستدراك */
  var why9 = Object.create(null), hold9 = Object.create(null);
  function payload() {
    var dl = [], k, base = {};
    for (k in pDel) { dl.push(k); base[k] = krev[k] || 0; }
    for (k in pSet) base[k] = krev[k] || 0;
    var o9 = { set: pSet, del: dl, base: base, aud: audEvents9(pSet) }, w9 = null;
    if (UID9) o9.uid = UID9;                         /* KIVO_264 · D-3 (C1): الخادمُ يردّ 409 session-changed إن لم تعد هويةَ الكوكي */
    o9.ack = 2;                                      /* V7 · د5-هـ (أمن ١): يفهم ok:0 لحفظٍ لم يُكتب منه مفتاح (saveAck9) */
    var A9 = KIVO.__BS_I && KIVO.__BS_I.auth, c9 = (A9 && typeof A9.saveCur === "function" && ("bassam_auth_users_v1" in pSet)) ? A9.saveCur("bassam_auth_users_v1") : null;
    if (c9) o9.cur = c9;                             /* KIVO_264 · D14: كلمةُ المرور الحالية لتغيير اسم دخول صاحب الحساب (330 saveCur — في الذاكرة ≤ 120 ث · لا تُخزَّن) */
    if (uscope9 && (KU9 in pSet)) o9.uscope = uscope9;
    if (pscope9 && (KP9 in pSet)) o9.pscope = pscope9;   /* مراجعةُ التكامل W1-R1: عدسةُ القائمة التي بُني عليها التعديل */
    for (k in pSet) if (why9[k]) (w9 = w9 || {})[k] = why9[k];
    for (k = 0; k < dl.length; k++) if (why9[dl[k]]) (w9 = w9 || {})[dl[k]] = why9[dl[k]];
    if (w9) o9.why = w9;
    return JSON.stringify(o9);
  }
  function recount() { dirty = !!(Object.keys(pSet).length || Object.keys(pDel).length); }
  /* A2: سببُ المفتاح يخصّ الكتابةَ المعلّقة وحدها، ويُمحى إن لم يبق ما يُرسل
     (دمجٌ ناتجُه قيمةُ الخادم · حذفٌ لم يُطبَّق · رفضٌ · إلغاء). عملياتُ الاستيراد والاستعادة تملكها واجهاتها الخادمية. */
  function unmark9(k) { delete why9[k]; }
  /* مراجعةُ التكامل W1-R2 (متوسط — تفعيلُ الدفعة يتعطّل): اسمُ دخولٍ (هويةٌ/جوال) يصادم حساباً لا يراه هذا المدير — الإسقاطُ (الخادم: 054 usersScopeOut) لا يحمل
     أسماءَ دخول غير من يديره فلا يكشفه taken في 330 — فيرفض الخادمُ مفتاحَ الحسابات كلَّه ويسمّي صفوفي المخالفة (d.dup). فلا يُعاد المفتاحُ كلُّه: يُسقَط
     الجديدُ المخالف (ليس في الأساس) ويعود المعدَّلُ المخالفُ إلى نسخة الأساس فوق آخر ما في الطابور. يعيد { v: الباقي · hit: صفوفي المخالفة } أو null (السلوكُ السابق) */
  /* مراجعةُ التكامل R2-LOOP (متوسط — حلقةُ حفظٍ لا تنتهي): صفٌّ مخالفٌ نسختُه في الأساس هي ما أُرسل حرفاً (أساسٌ قديمٌ يحمل حساباً نُقل اسمُ دخوله بعده
     إلى حسابٍ محجوب) كان «يُعاد» إلى نفسه فيُرسل الجسمُ نفسُه ويُرفض بلا نهاية (سطرٌ في السجلّ الأمنيّ ورسالةٌ كلَّ دورة). الآن لا تُعاد المحاولة إلا بتقدّم:
     صفٌّ أُسقط أو عاد إلى نسخةٍ غيرِ المُرسَلة، وناتجٌ غيرُ ما أُرسل في هذه اللقطة — وإلا null (الإعادةُ الكاملة إلى قيمة الخادم ورسالتُها كما قبل).
     والخادمُ (054) يردّ على الأساس القديم تعارضاً لا رفضاً، فيُدمج التعديلُ على القيمة الحديثة */
  function usersDupFix9(k, d, snap) {
    var mineS = (k in pSet) ? pSet[k] : snap.set[k], mine, base, bad = Object.create(null), byB = Object.create(null), out = [], hit = [], act = true, moved = false, i, x, id, v;
    try { mine = JSON.parse(mineS); base = baseVal[k] == null ? [] : JSON.parse(baseVal[k]); } catch (e) { return null; }
    if (!Array.isArray(mine) || !Array.isArray(base)) return null;
    d.dup.forEach(function (q) { bad[String(q)] = 1; });
    base.forEach(function (b) { if (b && b.id != null && !(String(b.id) in byB)) byB[String(b.id)] = b; });
    for (i = 0; i < mine.length; i++) {
      x = mine[i]; id = x && x.id != null ? String(x.id) : null;
      if (id === null || !bad[id]) { out.push(x); continue; }
      hit.push(x);
      if (id in byB) { out.push(byB[id]); if (!deq(byB[id], x)) moved = true; if (!byB[id].dis || (x && x.dis)) act = false; }   /* تفعيلٌ: جديدٌ أو مجمَّدٌ يُعاد — وإلا تعديلُ حسابٍ قائم */
      else moved = true;                                                       /* جديدٌ يُسقط */
    }
    if (!hit.length || !moved) return null;                                    /* R2-LOOP: لا تقدّم */
    v = JSON.stringify(out);
    return v === snap.set[k] ? null : { v: v, hit: hit, act: act };           /* R2-LOOP: هو ما رُفض في هذه اللقطة */
  }
  /* رسالةٌ واحدةٌ تسمّيهم بسببهم — ويُذكرون في 330 لهذه الجلسة (dupNote) فلا يعيد التفعيلُ التلقائيُّ المحاولة */
  function usersDupMsg9(fx) {
    try { var A9n = KIVO.__BS_I && KIVO.__BS_I.auth; if (A9n && typeof A9n.dupNote === "function") A9n.dupNote(fx.hit); } catch (eN9) { /* الذاكرةُ تحسينٌ — يعيد الخادمُ رفضَه إن غابت */ }
    var nm = fx.hit.map(function (x) { return "«" + String((x && (x.name || x.un)) || "موظف") + "»"; }), n = nm.length, C9 = KIVO.BassamCount;
    var agr = function (a, b, c) { return C9 && C9.agr ? C9.agr(n, a, b, c) : a; };
    var more = n > 5 ? " (و" + (C9 ? C9(n - 5, "موظف", "g") : String(n - 5)) + " غيرُهم)" : "";
    var tail = fx.act ? agr("لم يُفعَّل حسابه", "لم يُفعَّل حساباهما", "لم تُفعَّل حساباتهم") : agr("أُعيد حسابُه كما كان محفوظاً", "أُعيد حساباهما كما كانا محفوظَين", "أُعيدت حساباتهم كما كانت محفوظة");
    return nm.slice(0, 5).join("، ") + more + ": رقم الهوية أو الجوال مستخدمٌ في حسابٍ آخر — " + tail;
  }
  /* جوابُ الخادم يُطبَّق على اللقطة المُرسَلة لا على الطابور الحالي: ما كُتب
     بعد الإرسال جيلٌ أحدث، فلا يمسحه ردٌّ قديم أبداً. */
  function settle(j, snap) {
    snap = snap || { set: pSet, del: pDel };
    var k, again = false, conf = 0, keys = [];
    var ap = j.revs || {};
    for (k in ap) {
      krev[k] = ap[k]; delete sent9[k]; delete dupR9[k];   /* مراجعةُ التكامل R2-LOOP: حُسم المفتاح */
      /* KIVO_264 · المراجعة (A3a): أساسُ تعديلي وقيمتُه المحفوظة — يبقى الأساسُ الأقدم لحفظاتي المتتالية ما لم تصل قيمةٌ من غيري */
      var o9 = mine9[k];
      if (k in snap.set) mine9[k] = { b: (o9 && Date.now() - o9.at <= WIN9) ? o9.b : baseVal[k], m: snap.set[k], at: Date.now() }; else delete mine9[k];
      if (k in snap.set) baseVal[k] = snap.set[k]; else delete baseVal[k];
      if (!(k in pSet) && !(k in pDel)) delete why9[k];
      /* لا يُحذف من الطابور شيء: ما فيه الآن كُتب بعد الإرسال فيلزم إرساله */
    }
    var dn = j.denied || {}, rt9 = [];
    /* KIVO_264 (المراجعة R1): حُسم حفظُ مفتاح الحسابات المُرسَل (قُبل أو رُفض) ⇒ تُمحى «cur» — لا قبل ذلك (إعادةُ الإرسال تحملها) */
    if (("bassam_auth_users_v1" in snap.set) && (("bassam_auth_users_v1" in ap) || ("bassam_auth_users_v1" in dn))) {
      try { var A9d = KIVO.__BS_I && KIVO.__BS_I.auth; if (A9d && typeof A9d.dropCur === "function") A9d.dropCur(); } catch (eD9) {}
    }
    for (k in dn) {
      var d = dn[k];
      /* KIVO_243: فترةٌ مغلقة في الاسترشاد/المضبوطات بلا نافذة استدراك ⇒ يُعرض فتحُ نافذةٍ بسبب (D3-07) ثم يُعاد الإرسال */
      if (d.why === "scope" && KIVO.__BS_AUTHZ && retroSys9(k) && /closed-period|retro-window-expired/.test(String(d.detail || "")) && ((k in snap.set) || (k in snap.del))) { rt9.push({ k: k, d: d, v: (k in snap.set) ? snap.set[k] : null }); continue; }
      deniedN9++; deniedK9[k] = (deniedK9[k] || 0) + 1;
      /* مراجعةُ التكامل W1-R2: رفضُ الحسابات بصفوفٍ مسمّاة (dup) ⇒ تسقط وحدها ويُعاد إرسالُ الباقي برقم النسخة نفسِه (تعارضٌ إن سبقني أحدٌ فيُدمج) */
      /* مراجعةُ التكامل R2-LOOP: سقفٌ أخيرٌ لدورات الإسقاط المتتالية على المفتاح (DUPMAX9) — بعده الإعادةُ الكاملة؛ يُصفَّر بأيّ حسمٍ آخر له */
      var fx9 = (k === KU9 && d.why === "users" && Array.isArray(d.dup) && d.dup.length && (k in snap.set) && (dupR9[k] || 0) < DUPMAX9) ? usersDupFix9(k, d, snap) : null;
      if (fx9 && fx9.v !== baseVal[k]) { dupR9[k] = (dupR9[k] || 0) + 1; mem[k] = fx9.v; pSet[k] = fx9.v; delete pDel[k]; again = true; notify(k); }
      else {
        delete dupR9[k];
        overCheck9(k, d.cur == null ? null : String(d.cur));
        if (d.cur != null) { mem[k] = String(d.cur); baseVal[k] = mem[k]; krev[k] = d.rev || krev[k] || 0; }
        else { delete mem[k]; delete baseVal[k]; }
        if (k === KU9 && d.cur != null && typeof d.uscope === "string") uscope9 = d.uscope;
        if (k === KP9 && d.cur != null && typeof d.pscope === "string") pscope9 = d.pscope;   /* مراجعةُ التكامل W1-R1: القيمةُ المُعادة إسقاطُ هذه العدسة */
        delete pSet[k]; delete pDel[k]; unmark9(k); notify(k);    /* الممنوعُ ممنوعٌ ولو كُتب بعده */
      }
      /* caps-own: a refusal that protects latent permissions carries its own text (021 latentLossWhy · capStaleBatch) */
      var lm9 = /^stale-client: (.+)$/.exec(String(d.detail || "")) || /^latent: .*? \| (.+)$/.exec(String(d.detail || ""));
      try { var lt9 = KIVO.Perm44 && KIVO.Perm44.latentText ? KIVO.Perm44.latentText(d.detail, (/^bsdept:([^:]+):/.exec(k) || [])[1]) : ""; if (lt9) lm9 = [0, lt9]; } catch (eL9) { /* V7 · د7 (52): بلا المحرّك يبقى نصُّ الخادم */ }
      if (d.why !== "flag") bsToast(fx9 ? usersDupMsg9(fx9) : "لم يُحفظ تعديلك على «" + lbl(k) + "» — " + (lm9 ? lm9[1] : whyText9(d.why)) + ". أُعيدت القيمة المحفوظة", { tone: "err" });
    }
    var cf = j.conflicts || {}, banners = [];
    for (k in cf) {
      var c = cf[k], theirs = c.cur == null ? null : String(c.cur);
      if (k === KU9 && typeof c.uscope === "string") uscope9 = c.uscope;
      if (k === KP9 && typeof c.pscope === "string") pscope9 = c.pscope;   /* مراجعةُ التكامل W1-R1: يُدمج تعديلي على إسقاط العدسة الحالية ويُعاد ببصمتها */
      /* «نسختي» هي الأحدث: ما في الطابور إن وُجد، وإلا ما أُرسل في اللقطة */
      var mineS = (k in pSet) ? pSet[k] : snap.set[k];
      overCheck9(k, theirs);                          /* KIVO_264 · المراجعة (A3a): هل بقي فيها ما حفظتُه قبل هذه اللقطة؟ */
      /* KIVO_264 · المراجعة (A3b): قيمةُ الخادم ممّا أرسلته هذه الصفحة (حُفظ وضاع جوابُه فأُعيد) ⇒ ليست طرفاً آخر: هي أساسي — لا تعارضَ ولا شريط */
      if (c.self && theirs != null && sent9[k] && sent9[k].indexOf(theirs) !== -1) baseVal[k] = theirs;
      delete sent9[k];
      if (mineS == null && ((k in pDel) || (k in snap.del))) {   /* حذفتُ ما غيّره زميلي — نسخته تبقى، ويُبلَّغ أن حذفي لم يُطبَّق (KIVO_264) */
        delete pDel[k]; unmark9(k); if (theirs != null) mem[k] = theirs; else delete mem[k];
        if (theirs != null) banners.push({ k: k, lbl: lbl(k), n: 0, lost: 1, by: c.by || "", at: c.at || 0, self: !!c.self });
      }
      else {
        var r = merge3(baseVal[k], mineS, theirs, k); mem[k] = r.v; delete pDel[k]; conf += r.c; keys.push(lbl(k)); again = true;
        /* KIVO_264 · D-6: الناتجُ قيمةُ الخادم نفسُها (تعديلي لم يُطبَّق أو سبقني إليه) ⇒ لا كتابةَ تُعاد بلا تغيير — ولا تبقى علاماتُها (A2) */
        if (r.v !== theirs) pSet[k] = r.v; else { delete pSet[k]; unmark9(k); }
        /* الدمج بلا تعارض صامت (كما لو كتبتما في ملف واحد)؛ لا يُخبَر المستخدم إلا بتعارضٍ حقيقيّ على الخانة نفسها — باسم مَن سبقه ووقته،
           وما لم يُطبَّق من تعديله يُخبَر به دائماً. KIVO_264 · المراجعة (A3b): وتبويبٌ آخر لحسابك (c.self) طرفٌ آخر كذلك — كان يُكتم فيمحو
           التبويبان أحدُهما الآخر بصمت (الحالةُ الأساسية لتعدّد التبويبات في D-7)؛ يُعلَن ويُسمّى «نافذةً أخرى لحسابك» */
        if (r.c || r.l) banners.push({ k: k, lbl: lbl(k), n: r.c, lost: r.l, by: c.by || "", at: c.at || 0, self: !!c.self });
      }
      if (theirs != null) baseVal[k] = theirs; else delete baseVal[k];
      krev[k] = c.rev || 0; notify(k);
    }
    overFlush9(banners);
    if (rt9.length) retroAsk9(rt9);
    /* دفعةٌ محميّةٌ رُدّت كاملة (atomic): الخادمُ لم يكتب منها شيئاً — ما لم يُرفض ولم يتعارض يُعاد إرسالُه بلا المرفوض،
       فلا تبقى الذاكرةُ «محفوظةً» وهماً بينما الخادمُ على القديم */
    if (j.atomic) {
      var rest = { set: Object.create(null), del: Object.create(null) }, nRest = 0;
      for (k in snap.set) if (!(k in ap) && !(k in dn) && !(k in cf)) { rest.set[k] = snap.set[k]; nRest++; }
      for (k in snap.del) if (!(k in ap) && !(k in dn) && !(k in cf)) { rest.del[k] = 1; nRest++; }
      if (nRest) { requeue(rest); again = true; }
    }
    recount();
    return again;
  }
  function clearQueue() { pSet = Object.create(null); pDel = Object.create(null); dirty = false; }

  /* Operations use the existing queue and /api/save transport. Only confirmed
     SQL projections live in mem; sealed request tickets never enter Storage. */
  var operationsTickets9 = new WeakMap(), operationActive9 = null, operationEpoch9 = null, operationSnapshot9 = null;
  var operationReads9 = Object.create(null), operationKnown9 = Object.create(null), operationReadId9 = 0, operationGeneration9 = 0;
  function operationObject9(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function operationInteger9(value) { return Number.isSafeInteger(value) && value >= 0; }
  function operationClone9(value) { return JSON.parse(JSON.stringify(value)); }
  function operationDepartmentContext9() {
    var depts = KIVO.BassamDepts;
    return depts && typeof depts.context === 'function' ? depts.context() : { state: 'error', dept: null, message: 'تعذّر عرض الإدارات الآن' };
  }
  function operationContext9() {
    var user = KIVO.BassamAuth && KIVO.BassamAuth.user && KIVO.BassamAuth.user();
    var dept = KIVO.BassamDepts && KIVO.BassamDepts.active && KIVO.BassamDepts.active();
    return !sx9 && !bye9 && !ANON9 && UID9 && BOOT.uid === UID9 && user && String(user.id) === UID9 && dept
      ? { uid: UID9, dept: String(dept), generation: operationGeneration9 } : null;
  }
  function operationSame9(stamp) {
    var now = operationContext9();
    return !!now && now.uid === stamp.uid && now.dept === stamp.dept && now.generation === stamp.generation;
  }
  function operationFailure9(err, status, uncertain) { return { ok: 0, err: err, status: status || 0, uncertain: !!uncertain }; }
  /* ═══ V7 · 53 (فشلُ الحفظ · البند 2 · S8 · ملحق 4): فشلٌ عابر (5xx · db-busy · انقطاعُ الشبكة) يُعاد بالطلب نفسِه — المعرّفُ والجسمُ نفسُهما،
     والخادمُ يحسم المكرَّرَ من إيصاله (restore_operations · duplicate) فلا يتكرّر الفعل. ما لم يُحسم بعدها يُقرأ المورد من الخادم قبل أيّ حكم:
     لم تتغيّر نسختُه ⇒ فشلٌ مؤكَّد (تُعاد الواجهةُ إلى المحفوظ ويُقال للمستخدم) · نسختُه تقدّمت بقيمة طلبي نفسِها ⇒ حُفظ · غيرُ ذلك ⇒ «غير مؤكَّد» كما كان.
     وكلُّ فشلٍ يُقال صراحةً في التوست الواحد (KIVO.bsToast) — لا صمت. ═══ */
  var SAVE_RETRY53 = 3, SAVE_WAIT53 = 60000, SAVE_FATAL53 = { 'db-schema-unsupported': 1, 'db-migration-permit-invalid': 1, 'db-restore-epoch-invalid': 1 };
  function saveTransient53(status, data) {
    if (!status || status < 500 || status > 599) return false;
    return !(data && typeof data.err === 'string' && SAVE_FATAL53[data.err]);   /* انقطاعُ الشبكة لا يُعاد آلياً: «غير مؤكَّد» كما كان (الإعادةُ بالطلب نفسِه للمستخدم) */
  }
  function saveRetry53(operation, status, data) {
    if (operationActive9 !== operation || !saveTransient53(status, data) || (operation.transient53 || 0) >= SAVE_RETRY53) return false;
    operation.transient53 = (operation.transient53 || 0) + 1; operation.lastStatus53 = status || 0; operation.lastErr53 = (data && data.err) || 'http-' + status;
    operationUncertainLog9('transient-retry-' + operation.transient53 + ' · ' + operation.lastErr53, operation.keys);
    if (inflight === operation.snap) inflight = null;
    operation.state = 'queued';
    operation.keys.forEach(function (key) { if (key in operation.snap.set) pSet[key] = operation.snap.set[key]; else pDel[key] = 1; });
    recount(); link9("off", "تعذّر الحفظ مؤقتاً — يُعاد الطلبُ نفسُه تلقائياً");
    setTimeout(function () { if (operationActive9 === operation && operation.state === 'queued') sendNow(); }, 400 * Math.pow(2, operation.transient53 - 1));
    return true;
  }
  function saveText53(err, status) {
    if (err === 'db-busy' || status === 503) return 'المنصة مشغولة الآن فلم يُحفظ تعديلك — أُعيدت المحاولة تلقائياً دون جدوى. أعد الإجراء بعد لحظات؛ لن يتكرّر.';
    if (err === 'network' || !status) return 'انقطع الاتصال قبل تأكيد الحفظ — لم يُعتمد تعديلك بعد. تحقّق من الاتصال ثم أعد الإجراء نفسه؛ لن يتكرّر.';
    if (err === 'pending') return 'لم يصل تأكيد الحفظ بعد، وتعذّر التحقق منه — لم يُعتمد تعديلك بعد. أعد الإجراء نفسه للتحقق؛ لن يتكرّر.';
    return 'تعذّر الحفظ (رمز ' + status + ') — لم يُحفظ تعديلك. أعد الإجراء؛ لن يتكرّر.';
  }
  /* رسالةُ الفشل المركزية: تُعرض ما لم تعرض الصفحةُ نفسُها رسالةَ فشلٍ في الأثناء (توستُ الصفحة #bs-toast أو KIVO.bsToast بنبرة خطأ) */
  var saveErrAt53 = 0;
  function saveNotice53(text, still) {
    var at = Date.now(), pageText = function () { try { var t = document.getElementById && document.getElementById('bs-toast'); return t ? String(t.textContent || '') : ''; } catch (e) { return ''; } }, before = pageText();
    setTimeout(function () {
      try {
        if (saveErrAt53 > at || pageText() !== before || (still && !still())) return;
        bsToast(text, { tone: 'err', ms: 9000 });
      } catch (e) { /* عرضٌ فقط */ }
    }, 700);
  }
  function saveCanon53(text) {
    try { return JSON.stringify(JSON.parse(text), function (k, v) { if (!v || typeof v !== 'object' || Array.isArray(v)) return v; var o = {}; Object.keys(v).sort().forEach(function (x) { o[x] = v[x]; }); return o; }); } catch (e) { return null; }
  }
  /* قراءةُ التحقق: الخادمُ وحده يحسم ما جرى لطلبٍ لم يصل إيصالُه */
  async function saveVerify53(operation, inFlight) {
    if (operationActive9 !== operation || (!inFlight && ['sending', 'queued'].includes(operation.state))) return null;
    var base = {}; try { base = JSON.parse(operation.body).base || {}; } catch (e) { return null; }
    var read = await operationRead9(operation.keys.slice());
    if (!read || read.ok !== 1 || operationActive9 !== operation) return null;
    var same = operation.keys.every(function (key) { return operationInteger9(base[key]) && read.base[key] === base[key]; });
    if (same && !inFlight) {
      /* لم يُكتب شيء: فشلٌ مؤكَّد — تُطلق العملية، والمعروضُ هو المحفوظُ فعلاً (قرأته القراءةُ أعلاه) */
      if (inflight === operation.snap) inflight = null;
      operation.state = 'failed'; operation.result = { ok: 0, err: 'save-failed', status: operation.lastStatus53 || 0, uncertain: false, failed: 1, verified: 1 };
      operationActive9 = null; operation.keys.forEach(notify); warn(false); settleWaiters(false);
      return operation.result;
    }
    var mine = operation.keys.every(function (key) {
      var has = Object.prototype.hasOwnProperty.call(read.resources, key);
      if (!operationInteger9(read.base[key]) || !(read.base[key] > (base[key] || 0))) return false;
      return key in operation.snap.set ? has && saveCanon53(JSON.stringify(read.resources[key])) === saveCanon53(operation.snap.set[key]) : !has;
    });
    if (!mine) return null;
    if (inFlight) return { ok: 1, verified: 1, inFlight: 1 };   /* الطلبُ ما زال في الطريق وقد كُتب: إيصالُه حين يصل يحسم الحالة كما هي */
    var revs = {}; operation.keys.forEach(function (key) { revs[key] = read.base[key]; });
    operation.state = 'sending';
    await operationSettle9(operation, 200, { ok: 1, requestId: operation.ticket.requestId, epoch: operation.epoch, atomic: 1, revs: revs, verified: 1 });
    return operation.state === 'confirmed' ? Object.assign({}, operation.result, { verified: 1 }) : null;
  }
  /* V7 · 53 (S7): قراءةٌ معلّقة لا تُبقي الصفحةَ على الهيكل للأبد — تُقطع بعد 30 ث فتصير فشلاً تعرضه بطاقةُ «أعد المحاولة» */
  function saveReadSignal53() { try { return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(30000) : undefined; } catch (e) { return undefined; } }
  /* انتظارُ إيصالٍ ما زال في الطريق (حفظٌ يطول أكثر من مهلة الإفراغ · إعادةٌ مجدولة) — بحدّ، ثم قراءةُ التحقق */
  async function saveAwait53(operation) {
    for (var tick = 0; tick < SAVE_WAIT53 / 250 && !operation.result && ['sending', 'queued'].includes(operation.state) && operationActive9 === operation; tick++)
      await new Promise(function (resume) { setTimeout(resume, 250); });
  }
  function operationForget9(key, state, quiet) {
    delete mem[key]; delete baseVal[key]; delete krev[key];
    operationKnown9[key] = { state: state || 'unloaded' };
    periodForget9(key, quiet);   /* V7 · 53 */
    if (!quiet) notify(key);
  }
  function operationInvalidate9(keys, quiet) {
    if (!Array.isArray(keys) || operationSnapshot9 && operationSnapshot9.keys.some(function (key) { return keys.indexOf(key) !== -1 || keys.indexOf(unscoped(key)) !== -1; })) operationSnapshot9 = null;
    var selected = Array.isArray(keys) ? Array.from(new Set(Object.keys(operationKnown9).concat(Object.keys(operationReads9), keys.filter(operationKey9))))
      .filter(function (key) { return keys.indexOf(key) !== -1 || keys.indexOf(unscoped(key)) !== -1; }) : Object.keys(operationKnown9);
    if (!Array.isArray(keys)) operationGeneration9++;
    if (selected.length && !quiet) { try { if (KIVO.__bsLiveLog) KIVO.__bsLiveLog('drop', 'operations', Array.isArray(keys) ? 'إسقاطُ مفاتيح' : 'إسقاطُ كلِّ القراءات', selected); } catch (e) { /* تشخيصٌ فقط */ } }
    selected.forEach(function (key) { delete operationReads9[key]; operationForget9(key, undefined, quiet); });
    if (selected.length && !quiet) setTimeout(function () { try { if (KIVO.__dcRevalidate) KIVO.__dcRevalidate(); } catch (e) { /* إعادةُ القراءة يطلبها الرسمُ التالي كذلك */ } }, 0);
  }
  async function operationRead9(keys) {
    if (Array.isArray(keys) && keys.some(periodAny9)) return periodRead9(periodCollapse9(keys));   /* V7 · 53: مورد مقسَّم ⇒ بالفترة */
    var stamp = operationContext9();
    if (!stamp) return operationFailure9('session', 401);
    if (!Array.isArray(keys) || !keys.length || keys.length > 80 || new Set(keys).size !== keys.length || !keys.every(operationKey9)) return operationFailure9('keys', 400);
    keys = keys.slice();
    var readId = ++operationReadId9;
    keys.forEach(function (key) { operationReads9[key] = readId; });
    try {
      var response = await fetch('/api/operations/read?keys=' + encodeURIComponent(keys.join(',')) + '&uid=' + encodeURIComponent(stamp.uid), { credentials: 'same-origin', cache: 'no-store', signal: saveReadSignal53() });
      if (response.status === 401) { sessGone9(); operationInvalidate9(); return operationFailure9('session', 401); }
      var data = await response.json();
      if (response.status === 409 && data && data.err === 'session-changed') { sesChanged9(null, '409'); operationInvalidate9(); return operationFailure9('session', 409); }
      if (!operationSame9(stamp) || keys.some(function (key) { return operationReads9[key] !== readId; })) return operationFailure9('stale', 409);
      if (!response.ok || !operationObject9(data) || data.ok !== 1 || data.uid !== stamp.uid || !operationInteger9(data.epoch) || !operationInteger9(data.v)
          || !operationObject9(data.resources) || !Array.isArray(data.absent) || !Array.isArray(data.denied) || !operationObject9(data.base)) throw Error('operations-read-invalid');
      var covered = Object.keys(data.resources).concat(data.absent, data.denied);
      var readable = Object.keys(data.resources).concat(data.absent);
      if (covered.length !== keys.length || new Set(covered).size !== covered.length || covered.some(function (key) { return keys.indexOf(key) === -1; })
          || Object.keys(data.base).length !== readable.length || readable.some(function (key) { return !operationInteger9(data.base[key]); })
          || Object.keys(data.base).some(function (key) { return readable.indexOf(key) === -1; })) throw Error('operations-read-invalid');
      if (operationEpoch9 !== null && operationEpoch9 !== data.epoch) { operationInvalidate9(); stamp = operationContext9(); }
      operationEpoch9 = data.epoch;
      operationSnapshot9 = { uid: stamp.uid, dept: stamp.dept, generation: stamp.generation, epoch: data.epoch, v: data.v, keys: keys.slice(), base: operationClone9(data.base) };
      keys.forEach(function (key) {
        if (data.denied.indexOf(key) !== -1) { operationForget9(key, 'denied'); operationKnown9[key].stamp = stamp; return; }
        var present = Object.prototype.hasOwnProperty.call(data.resources, key);
        if (present) { mem[key] = JSON.stringify(data.resources[key]); baseVal[key] = mem[key]; }
        else { delete mem[key]; delete baseVal[key]; }
        krev[key] = data.base[key];
        operationKnown9[key] = { state: present ? 'ready' : 'absent', epoch: data.epoch, rev: data.base[key], stamp: stamp };
      });
      keys.forEach(notify);
      return operationClone9(data);
    } catch (error) {
      if (operationSnapshot9 && operationSnapshot9.keys.some(function (key) { return keys.indexOf(key) !== -1; })) operationSnapshot9 = null;
      if (operationSame9(stamp)) keys.forEach(function (key) { if (operationReads9[key] === readId) operationForget9(key, 'error'); });
      return operationFailure9('read', response && response.status);
    }
  }
  function operationValue9(key) {
    var stamp = operationContext9();
    if (!stamp || !operationKey9(key) || key.split(':')[1] !== stamp.dept) throw Error('operations-scope-required');
    return operationReference9(key);
  }
  function operationReference9(key) {
    if (!operationContext9() || !operationKey9(key)) throw Error('operations-scope-required');
    if (KIVO.__bsReadHook) KIVO.__bsReadHook(key);
    if (periodLogical9(key)) periodGetSeq9[key] = periodSeq9;   /* V7 · 53: ما رأته الصفحةُ من الفترات (يجوز حذفُه بغيابه من حفظها) */
    var known = operationKnown9[key];
    if (!known || !known.stamp || !operationSame9(known.stamp) || (known.state !== 'ready' && known.state !== 'absent')) throw Error('operations-read-required');
    return known.state === 'absent' ? null : JSON.parse(mem[key]);
  }
  function operationText9(key) {
    var stamp = operationContext9();
    if (!stamp || !operationKey9(key) || key.split(':')[1] !== stamp.dept) throw Error('operations-scope-required');
    if (KIVO.__bsReadHook) KIVO.__bsReadHook(key);
    if (periodLogical9(key)) periodGetSeq9[key] = periodSeq9;
    var known = operationKnown9[key];
    if (!known || !known.stamp || !operationSame9(known.stamp) || (known.state !== 'ready' && known.state !== 'absent')) throw Error('operations-read-required');
    return known.state === 'absent' || mem[key] === undefined ? null : mem[key];
  }
  function operationScoped9(name) {
    var stamp = operationContext9();
    if (!stamp || operationResources9.indexOf(name) === -1) throw Error('operations-scope-required');
    return 'bsdept:' + stamp.dept + ':' + name;
  }
  function operationDraft9() {
    var stamp = operationContext9(), epoch = operationEpoch9;
    if (!stamp || !operationInteger9(epoch)) throw Error('operations-read-required');
    var bases = Object.create(null), used = Object.create(null), set = Object.create(null), removed = Object.create(null);
    Object.keys(operationKnown9).forEach(function (key) { var known = operationKnown9[key]; if (known.epoch === epoch && ['ready', 'absent'].includes(known.state)) bases[key] = known.rev; });
    function keyOf(name) {
      if (!operationSame9(stamp) || operationEpoch9 !== epoch) throw Error('operations-draft-context-changed');
      var key = operationScoped9(name), known = operationKnown9[key];
      if (!Object.prototype.hasOwnProperty.call(bases, key) || !known || !known.stamp || !operationSame9(known.stamp) || !['ready', 'absent'].includes(known.state) || known.rev !== bases[key]) throw Error('operations-draft-review-required');
      used[key] = bases[key];
      return key;
    }
    return Object.freeze({
      context: Object.freeze({ uid: stamp.uid, dept: stamp.dept, epoch: epoch }),
      get: function (name) { var key = keyOf(name); return key in removed ? null : key in set ? operationClone9(set[key]) : operationValue9(key); },
      set: function (name, value) { var key = keyOf(name); set[key] = operationClone9(value); delete removed[key]; },
      remove: function (name) { var key = keyOf(name); removed[key] = 1; delete set[key]; },
      stage: function () {
        try {
          Object.keys(used).forEach(function (key) { keyOf(unscoped(key)); });
          return operationStage9({ set: set, del: Object.keys(removed), readBase: used });
        } catch (error) { return operationFailure9('review-required', 409); }
      }
    });
  }
  /* Editor drafts use the same queue and receipt as every Operations write.
     A retry never runs the edit callback again or adopts a newer base. */
  var operationEditors9 = new WeakMap();
  /* RISHAD-266 · decision (d): a refused concurrent save names the conflict truthfully. The settled refusal stays cached for that
     page draft (never re-sent blindly), so the way forward is a page reload, then redoing the change on the fresh data. */
  var OPERATION_CONFLICT9 = 'حفظ غيرُك هذا السجلَّ قبلك فلم تُحفظ مسودتك — أعد تحميل الصفحة ثم أعد تعديلك على البيانات الجديدة';
  function operationEditor9(owner, action) {
    if (!owner || (typeof owner !== 'object' && typeof owner !== 'function') || typeof action !== 'string' || !action) throw Error('operations-editor-required');
    var editors = operationEditors9.get(owner);
    if (!editors) { editors = Object.create(null); operationEditors9.set(owner, editors); }
    return editors;
  }
  var OP_CHAIN_WAIT9 = 5000;   /* أقصى انتظارٍ لحسم حفظٍ سابقٍ في الطريق قبل إرسال التالي (م.ث) */
  function operationBegin9(owner, action) {
    var editors = operationEditor9(owner, action), prior = editors[action], priorState = prior && prior.ticket ? operationStatus9(prior.ticket).state : '';
    /* حفظٌ سابقٌ ما زال في الطريق: المحرِّرُ يبقى كما هو، والحفظُ التالي ينتظره في operationCommit9 (لا «معلّق» يُسقط عملَ المستخدم) */
    if (prior && prior.promise && ['staged', 'queued', 'sending'].includes(priorState)) return { ok: 1, chained: 1 };
    if (prior && prior.ticket && ['staged', 'queued', 'sending', 'uncertain'].includes(priorState)) return operationFailure9('pending', 409);
    try { editors[action] = { draft: operationDraft9(), ticket: null, intent: null, prepared: false, error: null, promise: null }; return { ok: 1 }; }
    catch (error) { return operationFailure9('read-required', 409); }
  }
  async function operationCommit9(owner, action, intent, edit) {
    var editors = operationEditor9(owner, action), entry = editors[action], signature;
    try { signature = JSON.stringify(intent); if (typeof signature !== 'string') throw Error('intent'); }
    catch (error) { return operationFailure9('intent', 400); }
    if (!entry) {
      var begun = operationBegin9(owner, action); if (!begun.ok) return begun;
      entry = editors[action];
    }
    if (entry.ticket) {
      var state = operationStatus9(entry.ticket).state;
      if (entry.intent !== signature) {
        if ((state === 'denied' || state === 'conflict') && entry.result) return entry.result;
        /* حفظٌ تالٍ للمحرِّر نفسِه والسابقُ ما زال في الطريق (وضعُ عنصرٍ ثم حفظُ بياناته · تعديلان متتاليان مع كمون الشبكة):
           لا يُرفض ولا يُعرض «غير مؤكَّد» — ينتظر حسمَ السابق؛ فإن ثبّته الخادمُ ومراجعةُ كلِّ مفتاحٍ عندي هي مراجعةُ إيصاله نفسُها
           (لم يدخل بينهما تعديلُ غيري) أُرسل التالي بمسودةٍ جديدة على تلك المراجعة. وإن لم يثبت السابق أو تغيّرت المراجعة فالمراجعةُ كما كانت. */
        if (entry.promise && ['staged', 'queued', 'sending'].includes(state)) {
          var waited = entry;
          /* الانتظارُ محدود (OP_CHAIN_WAIT9): إيصالٌ لم يصل (شبكةٌ انقطعت · ردٌّ ضائع) يبقى على سلوكه — «راجِع» بتذكرة السابق نفسِها */
          return Promise.race([entry.promise, new Promise(function (resolve) { setTimeout(function () { resolve(null); }, OP_CHAIN_WAIT9); })]).then(function (first) {
            var revs = first && first.ok === 1 && first.receipt && first.receipt.revs;
            var follows = operationObject9(revs) && editors[action] !== waited && Object.keys(revs).every(function (key) {
              var known = operationKnown9[key];
              return known && known.stamp && operationSame9(known.stamp) && ['ready', 'absent'].includes(known.state) && known.rev === revs[key];
            });
            if (!follows) { operationUncertainLog9('review-required', waited.ticket && operationsTickets9.get(waited.ticket) ? operationsTickets9.get(waited.ticket).keys : []); return Object.assign(operationFailure9('review-required', 409, true), { ticket: waited.ticket }); }
            return operationCommit9(owner, action, intent, edit);
          });
        }
        operationUncertainLog9('review-required', operationsTickets9.get(entry.ticket) ? operationsTickets9.get(entry.ticket).keys : []);
        return Object.assign(operationFailure9('review-required', 409, true), { ticket: entry.ticket });
      }
      if (entry.promise) return entry.promise;
      if (state !== 'uncertain') return entry.result || Object.assign(operationFailure9('pending', 409), { ticket: entry.ticket });
    } else {
      if (entry.prepared && entry.intent !== signature) return operationFailure9('review-required', 409);
      if (entry.error) return entry.error;
      if (!entry.prepared) {
        entry.prepared = true; entry.intent = signature;
        try { if (typeof edit !== 'function') throw Error('edit'); edit(entry.draft); }
        catch (error) { entry.error = operationFailure9('review-required', 409); return entry.error; }
      }
      var ticket = entry.draft.stage(); if (!ticket || !ticket.requestId) return ticket || operationFailure9('changes', 400);
      entry.ticket = ticket; entry.intent = signature;
    }
    entry.promise = operationFlush9(entry.ticket, operationStatus9(entry.ticket).state === 'uncertain').then(function (result) {
      entry.result = Object.assign({}, result, { ticket: entry.ticket });
      if (result && (result.ok === 1 || result.failed) && editors[action] === entry) delete editors[action];   /* V7 · 53: فشلٌ مؤكَّد يُطلق المحرِّر — الإجراءُ التالي طلبٌ جديد */
      return entry.result;
    }).finally(function () { entry.promise = null; });
    return entry.promise;
  }
  /* ═══ إعادةُ بناء تعديلٍ على أحدث نسخة (برومت 41) ═══
     لتعديلٍ صغيرٍ مقصودٍ بذاته (حذفُ عنصرٍ وضعه المستخدمُ للتوّ) حين تكون مسودةُ الصفحة قديمةً لأن جهازاً آخر عدّل الوثيقةَ نفسَها:
     تُقرأ الوثيقةُ من الخادم، ثم تُسلَّم نسخةٌ منها لـpatch فيعيد الوثيقةَ بعد تعديله · أو null (لا شيء يُفعل) · أو undefined (ما أراد تعديلَه غيّره غيرُه
     ⇒ لا كتابةَ صامتة: err 'changed'). الحفظُ مسودةٌ جديدةٌ على المراجعة المقروءة نفسِها، فتعديلُ الجهاز الآخر في بقية الوثيقة يبقى كما هو؛
     وإن كُتبت الوثيقةُ بين القراءة والحفظ (تعارض) أُعيد البناءُ من جديد، ثلاثَ مراتٍ على الأكثر. خاصيةُ المسودات باقية: لا مسودةٌ قديمةٌ تُرسل. */
  /* ترقيعٌ جاهز لـoperationPatch9: حذفُ عنصرٍ وضعه المستخدمُ للتوّ من كلِّ موضعٍ له في الوثيقة (القوائمُ التي مفتاحُها listKey، في أي عمق)،
     بمعرّفه idKey — بشرط أن تكون كلُّ نسخةٍ له مطابقةً حرفاً لما وضعه (mine). لا نسخةَ ⇒ null · نسخةٌ مختلفة (عدّله غيرُه) ⇒ undefined. */
  function operationRemoval9(listKey, idKey, mine) {
    var id = mine && mine[idKey], text = JSON.stringify(mine);
    return function (doc) {
      if (!doc || typeof doc !== 'object' || id == null || id === '') return null;
      var lists = [];
      (function walk(node) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        Object.keys(node).forEach(function (k) {
          var v = node[k];
          if (k === listKey && Array.isArray(v) && v.some(function (x) { return x && x[idKey] === id; })) lists.push(v);
          walk(v);
        });
      })(doc);
      if (!lists.length) return null;
      if (lists.some(function (list) { return list.some(function (x) { return x && x[idKey] === id && JSON.stringify(x) !== text; }); })) return undefined;
      lists.forEach(function (list) { for (var i = list.length - 1; i >= 0; i--) if (list[i] && list[i][idKey] === id) list.splice(i, 1); });
      return doc;
    };
  }
  /* ترقيعٌ جاهز لـoperationPatch9 (برومت 41-ج): دمجٌ ثلاثيّ عام — base ما كانت عليه الصفحة · mine ما تريد حفظَه · والوثيقةُ الأحدث من الخادم.
     ما لم أغيّره يؤخذ من الأحدث، وما لم يغيّره غيري يؤخذ مني. الكائناتُ تُدمج مفتاحاً مفتاحاً؛ والقوائمُ التي لكلِّ عنصرٍ فيها معرّفٌ فريد
     (sid · uid · id · eid) تُدمج عنصراً عنصراً: إضافتي تُضاف، حذفي يُحذف، وتعديلي يحلّ محلَّ العنصر — بشرط ألّا يكون غيري غيّر العنصرَ نفسَه؛
     العنصرُ ذرّيّ (لا دمجَ داخله) إلا «الموقع» (ذو sid) فيُدمج داخله. أيُّ موضعٍ غيّره الطرفان باختلاف ⇒ undefined (err 'changed' — لا كتابةَ صامتة).
     prepare يُطبَّق على نُسخ الثلاثة قبل الدمج، وfinish على الناتج (للصفحة أن تُسقط حقولاً مشتقّة ثم تعيد اشتقاقها). لا فرقَ عن الأحدث ⇒ null. */
  function operationMerge9(base, mine, prepare, finish) {
    var CONFLICT = {};
    var same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
    var plain = function (x) { return !!x && typeof x === 'object' && !Array.isArray(x); };
    var canon = function (x) { return JSON.stringify(x, function (k, v) { if (!plain(v)) return v; var o = {}; Object.keys(v).sort().forEach(function (key) { o[key] = v[key]; }); return o; }); };
    var idOf = function (x) { return !plain(x) ? null : x.sid != null ? 's:' + x.sid : x.uid != null ? 'u:' + x.uid : x.id != null ? 'i:' + x.id : x.eid != null ? 'e:' + x.eid : null; };
    var listed = function (a) { if (!Array.isArray(a)) return false; var seen = Object.create(null); return a.every(function (x) { var id = idOf(x); if (id === null || seen[id]) return false; seen[id] = 1; return true; }); };
    var index = function (a) { var m = Object.create(null); a.forEach(function (x) { m[idOf(x)] = x; }); return m; };
    function merge(b, m, t) {
      if (same(m, b)) return t;
      if (same(t, b) || same(m, t)) return m;
      if (plain(b) && plain(m) && plain(t)) {
        var out = {}, keys = Object.create(null);
        [t, m, b].forEach(function (o) { Object.keys(o).forEach(function (k) { keys[k] = 1; }); });
        Object.keys(keys).forEach(function (k) { var r = merge(b[k], m[k], t[k]); if (r !== undefined) out[k] = r; });
        return out;
      }
      if (listed(b) && listed(m) && listed(t)) {
        var B = index(b), M = index(m), T = index(t), list = [];
        t.forEach(function (tv) {
          var id = idOf(tv), bv = B[id], mv = M[id];
          if (mv === undefined) { if (bv === undefined) list.push(tv); else if (!same(tv, bv)) throw CONFLICT; return; }   /* أضافه غيري · أو حذفتُه أنا وهو لم يُمسّ */
          if (bv === undefined) { if (!same(mv, tv)) throw CONFLICT; list.push(tv); return; }
          if (tv.sid != null) { list.push(merge(bv, mv, tv)); return; }
          if (same(mv, bv)) list.push(tv); else if (same(tv, bv) || same(mv, tv)) list.push(mv); else throw CONFLICT;
        });
        m.forEach(function (mv) {
          var id = idOf(mv); if (T[id] !== undefined) return;
          if (B[id] === undefined) list.push(mv); else if (!same(mv, B[id])) throw CONFLICT;   /* إضافتي · أو حذفه غيري وأنا غيّرتُه */
        });
        return list;
      }
      throw CONFLICT;
    }
    return function (theirs) {
      try {
        var cut = typeof prepare === 'function' ? prepare : function (x) { return x; };
        var out = merge(cut(operationClone9(base)), cut(operationClone9(mine)), cut(operationClone9(theirs)));
        if (typeof finish === 'function') out = finish(out, theirs) || out;
        return canon(out) === canon(theirs) ? null : out;   /* مطابقٌ للأحدث (ولو اختلف ترتيبُ المفاتيح) ⇒ لا كتابة */
      } catch (error) { if (error === CONFLICT) return undefined; throw error; }
    };
  }
  async function operationPatch9(owner, action, name, patch) {
    var editors, key, last = operationFailure9('read', 0);
    try { editors = operationEditor9(owner, action); key = operationScoped9(name); if (typeof patch !== 'function') throw Error('patch'); }
    catch (error) { return operationFailure9('patch', 400); }
    for (var attempt = 0; attempt < 3; attempt++) {
      if (operationActive9 || dirty || inflight) await flushAsync(OP_CHAIN_WAIT9);   /* حفظٌ سابقٌ في الطريق (وضعُ العنصر نفسِه) يُحسم أولاً */
      if (operationActive9) return operationFailure9('pending', 409, true);
      var read = await operationRead9([key]);
      if (!read || read.ok !== 1) { last = operationFailure9(read && read.err === 'stale' ? 'stale' : 'read', read && read.status); if (read && read.err === 'stale') continue; return last; }
      var current, next;
      try { current = operationValue9(key); } catch (error) { return operationFailure9('read-required', 409); }
      try { next = patch(current == null ? null : operationClone9(current)); } catch (error) { return operationFailure9('patch', 400); }
      if (next === undefined) return Object.assign(operationFailure9('changed', 409), { rev: krev[key] });
      if (next === null) return { ok: 1, noop: 1, rev: krev[key] };
      delete editors[action];
      last = await operationCommit9(owner, action, { patch: attempt, rev: krev[key] }, (function (value) { return function (draft) { draft.set(name, value); }; })(next));
      if (last && last.ok === 1) return last;
      if (!last || last.err !== 'conflict') return last;
      try { if (KIVO.__bsLiveLog) KIVO.__bsLiveLog('patch-retry', 'operations', 'كُتبت الوثيقةُ بين القراءة والحفظ — يُعاد البناء', [key]); } catch (e) { /* تشخيصٌ فقط */ }
    }
    return last;
  }
  function operationStage9(changes) {
    var stamp = operationContext9();
    if (!stamp) return operationFailure9('session', 401);
    if (operationActive9 || dirty || inflight) return operationFailure9('pending', 409);
    if (!operationObject9(changes) || !operationObject9(changes.set || {}) || !Array.isArray(changes.del || [])) return operationFailure9('changes', 400);
    var period9 = periodStage9(changes, stamp);   /* V7 · 53: الوثيقة ⇒ الفتراتُ التي تغيّرت */
    if (period9 && period9.ok === 0) return period9;
    if (period9 && period9.noop) return period9.noop;
    if (period9) changes = period9.changes;
    var set = changes.set || {}, del = changes.del || [], keys = Object.keys(set).concat(del);
    if (!keys.length || keys.length > 80 || new Set(keys).size !== keys.length || keys.some(function (key) { return !operationKey9(key) || key.split(':')[1] !== stamp.dept; })) return operationFailure9('keys', 400);
    if (!operationInteger9(operationEpoch9) || keys.some(function (key) { var known = operationKnown9[key]; return !known || !known.stamp || !operationSame9(known.stamp) || !['ready', 'absent'].includes(known.state) || known.epoch !== operationEpoch9; })) return operationFailure9('read-required', 409);
    var readBase = changes.readBase || {};
    if (!operationObject9(readBase) || Object.keys(readBase).length > 80 || Object.keys(readBase).some(function (key) {
      var known = operationKnown9[key];
      return !operationKey9(key) || key.split(':')[1] !== stamp.dept || !operationInteger9(readBase[key]) || !known || !known.stamp || !operationSame9(known.stamp) || !['ready', 'absent'].includes(known.state) || known.rev !== readBase[key];
    })) return operationFailure9('read-required', 409);
    if (!window.crypto || typeof window.crypto.randomUUID !== 'function') return operationFailure9('crypto', 0);
    var snap = { set: Object.create(null), del: Object.create(null) };
    try {
      Object.keys(set).forEach(function (key) { var value = JSON.stringify(set[key]); if (typeof value !== 'string') throw Error('invalid'); snap.set[key] = value; });
      del.forEach(function (key) { snap.del[key] = 1; });
    } catch (error) { return operationFailure9('changes', 400); }
    var requestId = window.crypto.randomUUID(), ticket = Object.freeze({ requestId: requestId });
    keys.forEach(function (key) { if (key in snap.set) pSet[key] = snap.set[key]; else pDel[key] = 1; });
    recount();
    var body = JSON.parse(payload()); body.requestId = requestId; body.epoch = operationEpoch9;
    Object.keys(readBase).forEach(function (key) { body.base[key] = readBase[key]; });
    var before = Object.create(null);
    keys.forEach(function (key) { before[key] = baseVal[key] == null ? null : baseVal[key]; });
    operationActive9 = { ticket: ticket, stamp: stamp, keys: keys, snap: snap, before: before, body: JSON.stringify(body), epoch: operationEpoch9, state: 'staged', result: null, period: period9 ? period9.meta : null };
    operationsTickets9.set(ticket, operationActive9);
    return ticket;
  }
  async function operationFlush9(ticket, retry) {
    var operation = operationsTickets9.get(ticket);
    if (operation && !operationSame9(operation.stamp)) return operationFailure9('session', 401, true);
    if (operation && operation.state === 'confirmed') { operationCommitted9(operation); return operation.result; }
    if (!operation || operationActive9 !== operation) return operationFailure9('ticket', 409);
    if (!operationSame9(operation.stamp)) return operationFailure9('session', 401, true);
    if (operationEpoch9 !== operation.epoch) return operationFailure9('epoch', 409);
    if (operation.state === 'sending') return operationFailure9('pending', 409);
    if (operation.state !== 'staged' && !(retry && operation.state === 'uncertain')) return operation.result || operationFailure9('review-required', 409);
    operation.state = 'queued'; operation.result = null;
    operation.keys.forEach(function (key) { if (key in operation.snap.set) pSet[key] = operation.snap.set[key]; else pDel[key] = 1; });
    recount();
    await flushAsync();
    if (!operation.result) await saveAwait53(operation);   /* V7 · 53 (S8): المهلةُ لا تعلن فشلاً والطلبُ في الطريق */
    if (!operation.result && operation.state === 'sending') { var flying53 = await saveVerify53(operation, true); if (flying53) return flying53; }
    if (operation.result && operation.result.uncertain && operation.state === 'uncertain' && operation.transient53) { var checked53 = await saveVerify53(operation); if (checked53) return checked53; }
    if (!operation.result) operationUncertainLog9('pending', operation.keys);
    return operation.result || operationFailure9('pending', 0, true);
  }
  /* سجلٌّ تشخيصي (console فقط): حفظٌ لم يُحسم — المسارُ والمفاتيحُ وحالةُ كلِّ مفتاحٍ ورقمُ مراجعته المعروف */
  function operationUncertainLog9(err, keys) {
    try { if (KIVO.__bsLiveLog) KIVO.__bsLiveLog('uncertain', 'operations', err, (keys || []).map(function (key) { var known = operationKnown9[key] || {}; return key + ' [' + (known.state || '-') + ' rev ' + (known.rev == null ? '-' : known.rev) + ']'; })); } catch (e) { /* تشخيصٌ فقط */ }
  }
  function operationUncertain9(operation, err, status) {
    if (inflight === operation.snap) inflight = null;
    operation.state = 'uncertain'; operation.result = operationFailure9(err, status, true);
    operationUncertainLog9(err, operation.keys);
    if (err !== 'session') saveNotice53(saveText53(operation.lastErr53 === 'db-busy' ? 'db-busy' : err, status != null ? status : operation.lastStatus53), function () { return operation.state === 'uncertain' || operation.state === 'failed'; });   /* V7 · 53: لا فشلَ صامت */
    warn(true);
    settleWaiters(false);
  }
  function operationCommitted9(operation) {
    if (!operationSame9(operation.stamp)) return;
    try { window.dispatchEvent(new CustomEvent('bassam:operations-commit', { detail: {
      uid: operation.stamp.uid, dept: operation.stamp.dept, requestId: operation.ticket.requestId,
      changes: periodCommitChanges9(operation, operation.keys.map(function (key) { return { key: key, before: operation.before[key], after: key in operation.snap.set ? operation.snap.set[key] : null }; }))
    } })); } catch (error) {}
  }
  async function operationSettle9(operation, status, data) {
    if (!operationSame9(operation.stamp)) { operationUncertain9(operation, 'session', status); return; }
    if (status === 401 || (status === 409 && data && data.err === 'session-changed')) {
      operationUncertain9(operation, 'session', status); sessGone9(operation.snap); return;
    }
    /* سباقُ نسخةٍ في الخادم: حفظان وصلا في اللحظة نفسها (حفظي وحفظُ أي مستخدم) فأُلغيت معاملتي كلُّها وعاد 409 {ok:0, err:'conflict'}
       بلا هويةِ الطلب ولا خريطةِ تعارض — لم يُكتب شيء. كان يُعرض «لم يصل تأكيد الحفظ». الآن يُعاد الطلبُ نفسُه (المعرّفُ والجسمُ نفسُهما —
       وهو ما كان يُطلب من المستخدم يدوياً) مرتين على الأكثر؛ تعارضٌ حقيقي في مفتاحي يعود بهويته وخريطته فيُحسم كما كان. */
    if (status === 409 && operationObject9(data) && data.ok === 0 && data.err === 'conflict' && data.requestId === undefined && data.conflicts === undefined && data.denied === undefined
        && (operation.raceRetries || 0) < 2 && operationActive9 === operation) {
      operation.raceRetries = (operation.raceRetries || 0) + 1;
      operationUncertainLog9('race-retry-' + operation.raceRetries, operation.keys);
      if (inflight === operation.snap) inflight = null;
      operation.state = 'queued';
      operation.keys.forEach(function (key) { if (key in operation.snap.set) pSet[key] = operation.snap.set[key]; else pDel[key] = 1; });
      recount();
      setTimeout(function () { if (operationActive9 === operation && operation.state === 'queued') sendNow(); }, 150 * operation.raceRetries);
      return;
    }
    if (saveRetry53(operation, status, data)) return;   /* V7 · 53: 5xx · db-busy ⇒ الطلبُ نفسُه بعد مهلة */
    var identity = operationObject9(data) && data.requestId === operation.ticket.requestId && data.epoch === operation.epoch && data.atomic === 1;
    var revs = data && data.revs;
    var success = status >= 200 && status < 300 && identity && data.ok === 1 && operationObject9(revs)
      && Object.keys(revs).length === operation.keys.length && Object.keys(revs).every(function (key) { return operation.keys.indexOf(key) !== -1 && operationInteger9(revs[key]); })
      && (!data.denied || (operationObject9(data.denied) && !Object.keys(data.denied).length))
      && (!data.conflicts || (operationObject9(data.conflicts) && !Object.keys(data.conflicts).length));
    if (success) {
      var refresh = [];
      if (operationSnapshot9 && operationSnapshot9.keys.some(function (key) { return operation.keys.indexOf(key) !== -1; })) operationSnapshot9 = null;
      operation.keys.forEach(function (key) {
        delete operationReads9[key];
        var known = operationKnown9[key];
        if (!known || !['ready', 'absent'].includes(known.state)) { refresh.push(key); return; }
        if (known && known.stamp && operationSame9(known.stamp) && operationInteger9(known.rev) && known.rev > revs[key]) {
          delete sent9[key]; delete why9[key]; return;
        }
        var present = key in operation.snap.set;
        if (present) { mem[key] = operation.snap.set[key]; baseVal[key] = mem[key]; } else { delete mem[key]; delete baseVal[key]; }
        krev[key] = revs[key]; operationKnown9[key] = { state: present ? 'ready' : 'absent', epoch: operation.epoch, rev: revs[key], stamp: operation.stamp };
        delete sent9[key]; delete why9[key]; notify(key);
      });
      if (refresh.length) {
        await operationRead9(refresh);
        if (!operationSame9(operation.stamp) || refresh.some(function (key) {
          var known = operationKnown9[key];
          return !known || !known.stamp || !operationSame9(known.stamp) || !['ready', 'absent'].includes(known.state) || known.rev < revs[key];
        })) {
          operationUncertain9(operation, 'confirmation-read', status); operation.result.committed = 1; return;
        }
      }
      if (operation.period) periodSettled9(operation);   /* V7 · 53 */
      inflight = null; operation.state = 'confirmed'; operation.result = { ok: 1, receipt: operationClone9(data) }; operationActive9 = null;
      operationCommitted9(operation);
      warn(false); settleWaiters(!dirty); kickIfDirty(); return;
    }
    var blocked = identity && data.ok === 0 && (status === 403 || status === 409);
    var barriers = [];
    ['denied', 'conflicts'].forEach(function (kind) {
      if (!blocked || data[kind] === undefined) return;
      if (!operationObject9(data[kind])) { blocked = false; return; }
      Object.keys(data[kind]).forEach(function (key) { if (operation.keys.indexOf(key) === -1 || !operationObject9(data[kind][key])) blocked = false; else barriers.push(key); });
    });
    if (blocked && barriers.length) {
      inflight = null; operation.state = status === 409 ? 'conflict' : 'denied';
      operation.result = { ok: 0, err: operation.state, status: status, uncertain: false, details: operation.period ? periodDetails9(data) : operationClone9(data) };
      operationActive9 = null; operationInvalidate9(operation.keys); settleWaiters(false); return;
    }
    operationUncertain9(operation, 'ack', status);
  }
  function operationRelease9(ticket) {
    var operation = operationsTickets9.get(ticket);
    if (!operation || operationActive9 !== operation || operation.state !== 'staged') return false;
    operation.keys.forEach(function (key) { delete pSet[key]; delete pDel[key]; });
    operation.state = 'released'; operationActive9 = null; recount(); return true;
  }
  function operationStatus9(ticket) {
    var operation = ticket && operationsTickets9.get(ticket);
    return operation ? { state: operation.state, requestId: operation.ticket.requestId, uncertain: operation.state === 'uncertain' }
      : { state: operationActive9 ? operationActive9.state : 'idle', epoch: operationEpoch9 };
  }
  function operationReady9(keys) {
    return !!operationContext9() && Array.isArray(keys) && keys.every(function (key) {
      var known = operationKnown9[key];
      return operationKey9(key) && known && known.stamp && operationSame9(known.stamp) && (known.state === 'denied' || ((known.state === 'ready' || known.state === 'absent') && known.epoch === operationEpoch9));
    });
  }
  /* تغيّرُ صلاحياتي الفعلي يُسقط قراءات العمليات كما كان (المسوداتُ لا تتبنّى صلاحيةً جديدة بصمت · جيلٌ جديد). الجديد: الحدثُ لا يُطلَق
     إلا إن تغيّر وصفُ صلاحياتي فعلاً (authzSync9)، والصفحةُ المعروضة لا تُهدم بالإسقاط — تبقى شجرتُها حتى تصل القراءةُ الجديدة (050). */
  /* ═══ V7 · 53: التخزين بالفترة — طبقةُ العميل (عقد الخادم: /api/operations/read بمفاتيح K@p و range=، والحفظُ بـK@p) ═══
     المورد المقسَّم (PERIOD_RES9) يُقرأ رأساً (K@) وفتراتٍ (K@p) ويُحفظ بالفترة التي تغيّرت وحدها. الصفحاتُ ترى «الوثيقة» نفسها كما كانت
     (get · draft · patch): الرأسُ + الفتراتُ المحمَّلة. ما لم يُحمَّل لا يظهر، ولا يُرسل، ولا يُحذف — يبقى في الخادم كما خُزِّن (قاعدةُ د6/52:
     الحفظُ يغيّر ما غيّره المستخدم وحده). اسمُ الفترة نصُّ المفتاح القائم كما هو، ولا تحليلَ تاريخٍ في هذه الطبقة: «الشهرُ الحالي واليوم»
     يسمّيهما التقويمُ في periodNow9 وحدها، والصفحةُ تطلب ما تعرضه بـoperations.want. */
  var periodWant9 = Object.create(null), periodGroups9 = Object.create(null), periodOrder9 = Object.create(null);
  var periodWantP9 = Object.create(null), periodLogicalRev9 = Object.create(null), periodGrpOf9 = Object.create(null), periodViewRev9 = Object.create(null), periodTextRev9 = Object.create(null), periodSeq9 = 0, periodLoadSeq9 = Object.create(null), periodGetSeq9 = Object.create(null), periodPk9 = null;
  function periodName9(name) { return Object.prototype.hasOwnProperty.call(PERIOD_RES9, name) && operationResources9.indexOf(name) !== -1; }
  function periodParse9(k) { var m = /^(bsdept:[^:\s,@]+:(bassam_[A-Za-z0-9_]+))@([^,@*;\u0000-\u001f]{0,64})$/.exec(String(k)); return m && periodName9(m[2]) ? { K: m[1], name: m[2], p: m[3] } : null; }
  function periodLogical9(k) { var m = /^bsdept:[^:\s,@]+:(bassam_[A-Za-z0-9_]+)$/.exec(String(k)); return !!m && periodName9(m[1]); }
  function periodAny9(k) { return periodLogical9(k) || !!periodParse9(k); }
  function periodOwn9(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  /* الرأسُ والفترات (مطابقٌ لـopSplit في الخادم): للخطة أعضاءُ months فترات، وفي الرأس months:{}؛ ولغيرها أعضاءُ الجذر فترات إلا الحقولَ الثابتة (__…) */
  function periodSplit9(name, doc) {
    if (!isObj(doc)) return null;
    var field = PERIOD_RES9[name], head = {}, periods = {}, order = [];
    Object.keys(doc).forEach(function (k) {
      if (field) { head[k] = k === field ? {} : doc[k]; return; }
      if (k.indexOf('__') === 0) head[k] = doc[k]; else { periods[k] = doc[k]; order.push(k); }
    });
    if (field) {
      if (!periodOwn9(head, field)) head[field] = {};
      var M = isObj(doc[field]) ? doc[field] : {};
      Object.keys(M).forEach(function (p) { periods[p] = M[p]; order.push(p); });
    }
    return { head: head, periods: periods, order: order };
  }
  function periodJoin9(name, head, periods, order) {
    var field = PERIOD_RES9[name], out = {}, P = {};
    (order || []).forEach(function (p) { if (periodOwn9(periods, p) && !periodOwn9(P, p)) P[p] = periods[p]; });
    Object.keys(periods).forEach(function (p) { if (!periodOwn9(P, p)) P[p] = periods[p]; });
    Object.keys(head || {}).forEach(function (k) { out[k] = field && k === field ? P : head[k]; });
    if (field) { if (!periodOwn9(out, field)) out[field] = P; return out; }
    Object.keys(P).forEach(function (p) { out[p] = P[p]; });
    return out;
  }
  function periodHeadNorm9(name, head) { var field = PERIOD_RES9[name], h = isObj(head) ? head : {}; if (field && !isObj(h[field])) { h = Object.assign({}, h); h[field] = {}; } return h; }
  /* «الآن» بأسماء المفاتيح القائمة: الشهرُ واليومُ اليوم وأمس (اليومُ التشغيلي يمتد بعد منتصف الليل) — من التقويم، لا من هذه الطبقة */
  function periodNow9() {
    var C = KIVO.BassamCal, out = { groups: [], days: [] };
    [0, 864e5].forEach(function (back) {
      var h = null;
      try { h = C && C.hNow ? C.hNow(new Date(Date.now() - back), null) : null; } catch (e) { h = null; }
      if (!h || !h.y || !h.m || !h.d) return;
      var g = h.y + '-' + h.m, d = g + '-' + h.d;
      if (out.groups.indexOf(g) === -1) out.groups.push(g);
      if (out.days.indexOf(d) === -1) out.days.push(d);
    });
    return out;
  }
  /* ما تحتاجه الصفحةُ من المورد: الافتراضيُّ (الشهرُ الحالي كلُّه، أو لتقرير اليوم: اليومُ وأمسُ وعلامةُ الشهر) + ما طلبته الصفحة */
  function periodWanted9(K) {
    var name = unscoped(K), now = periodNow9(), w = periodWant9[K] || { groups: [], periods: [], day: !!PERIOD_DAY9[name] };
    var groups = w.day ? [] : now.groups.slice(), periods = w.day ? now.days.concat(now.groups.map(function (g) { return 'm:' + g; })) : [];
    w.groups.forEach(function (g) { if (groups.indexOf(g) === -1) groups.push(g); });
    w.periods.forEach(function (p) { if (periods.indexOf(p) === -1) periods.push(p); });
    return { groups: groups, periods: periods };
  }
  function periodLoaded9(K) {
    var pre = K + '@', out = [];
    Object.keys(operationKnown9).forEach(function (key) {
      if (key.length <= pre.length || key.indexOf(pre) !== 0) return;
      var known = operationKnown9[key];
      if (known && known.stamp && operationSame9(known.stamp) && known.state === 'ready') out.push(key.slice(pre.length));
    });
    return out;
  }
  function periodForgetAll9(K) {
    var pre = K + '@';
    Object.keys(operationKnown9).forEach(function (key) { if (key.indexOf(pre) === 0) { delete mem[key]; delete baseVal[key]; delete krev[key]; operationKnown9[key] = { state: 'unloaded' }; } });
    delete periodGroups9[K]; delete periodLogicalRev9[K];
  }
  /* «الوثيقة» المعروضة للصفحة: الرأس + الفتراتُ المحمَّلة. known.rev (أساسُ المسودة) يتقدّم حين يتغيّر ما سبق تحميلُه فقط —
     فتحميلُ شهرٍ آخر بالتنقّل لا يُبطل مسودةً مفتوحة؛ krev يتقدّم مع كل تغيّرٍ في النص (بصمةُ الرسم في الصفحات). */
  function periodView9(K, bump) {
    var name = unscoped(K), hk = K + '@', head = operationKnown9[hk];
    if (!head || !head.stamp || !operationSame9(head.stamp) || (head.state !== 'ready' && head.state !== 'absent')) {
      delete mem[K]; delete baseVal[K];
      operationKnown9[K] = { state: head && (head.state === 'denied' || head.state === 'error') ? head.state : 'unloaded', stamp: head && head.stamp, split: 1 };
      return;
    }
    var loaded = periodLoaded9(K), periods = {};
    loaded.forEach(function (p) { periods[p] = JSON.parse(mem[K + '@' + p]); });
    var present = head.state === 'ready' || loaded.length > 0, before = mem[K];
    if (bump || !periodOwn9(periodViewRev9, K)) periodViewRev9[K] = (periodViewRev9[K] || 0) + 1;
    if (present) { mem[K] = JSON.stringify(periodJoin9(name, head.state === 'ready' ? JSON.parse(mem[hk]) : periodHeadNorm9(name, {}), periods, periodOrder9[K])); baseVal[K] = mem[K]; }
    else { delete mem[K]; delete baseVal[K]; }
    if (before !== mem[K] || !periodOwn9(periodTextRev9, K)) periodTextRev9[K] = (periodTextRev9[K] || 0) + 1;
    krev[K] = periodOwn9(periodLogicalRev9, K) ? periodLogicalRev9[K] : periodTextRev9[K];   /* مراجعةُ K في الخادم إن أرسلها (أوامرُ المهام تحملها) */
    operationKnown9[K] = { state: present ? 'ready' : 'absent', epoch: head.epoch, rev: periodViewRev9[K], stamp: head.stamp, split: 1 };
  }
  function periodQuery9(q, stamp) {
    return '/api/operations/read?keys=' + encodeURIComponent(q.keys.join(',')) + (q.range.length ? '&range=' + encodeURIComponent(q.range.join(',')) : '') + '&uid=' + encodeURIComponent(stamp.uid);
  }
  function periodValid9(q, data, stamp) {
    if (!operationObject9(data) || data.ok !== 1 || data.uid !== stamp.uid || !operationInteger9(data.epoch) || !operationInteger9(data.v)
        || !operationObject9(data.resources) || !Array.isArray(data.absent) || !Array.isArray(data.denied) || !operationObject9(data.base)) return false;
    var failed = data.failed === undefined ? {} : data.failed, ranges = data.ranges === undefined ? {} : data.ranges;
    if (data.logical !== undefined && (!operationObject9(data.logical) || Object.keys(data.logical).some(function (k) { return q.Ks.indexOf(k) === -1 || !operationInteger9(data.logical[k]); }))) return false;
    if (!operationObject9(failed) || !operationObject9(ranges) || Object.keys(ranges).some(function (r) { return q.range.indexOf(r) === -1; })) return false;
    var expect = q.keys.slice();
    for (var i = 0; i < q.range.length; i++) {
      var list = ranges[q.range[i]], rK = q.range[i].slice(0, q.range[i].lastIndexOf('@'));
      if (list === undefined && data.denied.indexOf(rK + '@') !== -1) list = [];   /* المورد محجوب: لا مدى في الجواب */
      if (!Array.isArray(list) || list.some(function (key) { var x = periodParse9(key); return !x || x.K !== rK; })) return false;
      list.forEach(function (key) { if (expect.indexOf(key) === -1) expect.push(key); });
    }
    var covered = Object.keys(data.resources).concat(data.absent, data.denied, Object.keys(failed)), readable = Object.keys(data.resources).concat(data.absent);
    return covered.length === expect.length && new Set(covered).size === covered.length && covered.every(function (key) { return expect.indexOf(key) !== -1; })
      && Object.keys(data.base).length === readable.length && readable.every(function (key) { return operationInteger9(data.base[key]); })
      && Object.keys(data.base).every(function (key) { return readable.indexOf(key) !== -1; });
  }
  async function periodFetch9(q, stamp) {
    var response = await fetch(periodQuery9(q, stamp), { credentials: 'same-origin', cache: 'no-store' }), data = null;
    try { data = await response.json(); } catch (e) { data = null; }
    /* شهرُ موردٍ يوميٍّ تجاوز حدَّ القراءة (تقريرُ إدارةٍ كبيرة · S6): يُطلب اليومان وعلامةُ الشهر وحدها، ويبقى المورد بالأيام في هذه الصفحة */
    if (response.status === 413 && data && data.err === 'read-too-large' && q.K && q.logical && q.range.length && !q.retried) {
      var now = periodNow9(), w = periodWant9[q.K] || (periodWant9[q.K] = { groups: [], periods: [], day: false });
      w.day = true; w.groups = w.groups.filter(function (g) { return q.range.indexOf(q.K + '@' + g) === -1; });
      var ks = q.keys.slice();
      now.days.concat(now.groups.map(function (g) { return 'm:' + g; })).forEach(function (p) { if (ks.indexOf(q.K + '@' + p) === -1) ks.push(q.K + '@' + p); });
      return periodFetch9({ K: q.K, Ks: [q.K], keys: ks, range: [], retried: 1 }, stamp);
    }
    return { q: q, response: response, data: data };
  }
  /* قراءةٌ فيها مفتاحُ موردٍ مقسَّم (منطقيٌّ K أو فترة K@p): طلبٌ لكل مورد مقسَّم (≤ 40 فترة لكلٍّ في العقد) وطلبٌ للبقية، معاً.
     الجوابُ للمستدعي بشكله القديم (resources/base بالمفاتيح المنطقية)، والفتراتُ في الذاكرة بمفاتيحها ومراجعاتها. */
  async function periodRead9(keys, extra, quiet) {
    var stamp = operationContext9(), response = null;
    if (!stamp) return operationFailure9('session', 401);
    if (!Array.isArray(keys) || !keys.length || keys.length > 80 || new Set(keys).size !== keys.length || !keys.every(operationKey9)) return operationFailure9('keys', 400);
    keys = keys.slice();
    var plain = [], split = Object.create(null), add = function (K) { return split[K] || (split[K] = { keys: [], logical: false }); };
    keys.forEach(function (key) {
      var x = periodParse9(key);
      if (x) { if (add(x.K).keys.indexOf(key) === -1) split[x.K].keys.push(key); return; }
      if (periodLogical9(key)) { add(key).logical = true; return; }
      plain.push(key);
    });
    var reqs = plain.length ? [{ K: null, Ks: [], keys: plain, range: [], small: true, cost: 0 }] : [];
    Object.keys(split).forEach(function (K) {
      var s = split[K], want = s.logical ? periodWanted9(K) : { groups: [], periods: [] }, more = (extra && extra[K]) || { groups: [], periods: [] }, ks = [K + '@'], range = [];
      (s.logical ? [] : s.keys).concat(want.periods.concat(more.periods || []).map(function (p) { return K + '@' + p; })).forEach(function (k) { if (ks.indexOf(k) === -1) ks.push(k); });
      want.groups.concat(more.groups || []).forEach(function (g) { if (range.indexOf(K + '@' + g) === -1) range.push(K + '@' + g); });
      /* مواردُ شهرُها فترةٌ واحدة أو تُقرأ بالأيام (عددُ فتراتها معروف) تُضمّ إلى طلبٍ واحد ما دام ≤ 40 فترة — طلباتٌ أقل (كلفةُ كلِّ طلبٍ في D1) */
      /* أشهرُ موردٍ يومي كثيرة (بطاقاتُ السنة): طلبٌ لكل شهر (≤ 40 فترة لكلٍّ)، في القراءة الواحدة نفسِها */
      if (more.chunk && range.length > 1) { range.forEach(function (r, i) { reqs.push({ K: K, Ks: [K], logical: s.logical, keys: i ? [K + '@'] : ks, range: [r], small: false, cost: 0 }); }); return; }
      var known = PERIOD_MONTHLY9[unscoped(K)] || !range.length, cost = ks.length - 1 + range.length, into = known && reqs.filter(function (q) { return q.small && q.cost + cost <= 40; })[0];
      if (into) { into.Ks.push(K); into.keys = into.keys.concat(ks); into.range = into.range.concat(range); into.cost += cost; into.K = null; return; }
      reqs.push({ K: K, Ks: [K], logical: s.logical, keys: ks, range: range, small: known, cost: cost });
    });
    var readId = ++operationReadId9;
    keys.forEach(function (key) { operationReads9[key] = readId; });
    try {
      var answers = await Promise.all(reqs.map(function (q) { return periodFetch9(q, stamp); }));
      for (var a = 0; a < answers.length; a++) {
        response = answers[a].response;
        if (response.status === 401) { sessGone9(); operationInvalidate9(); return operationFailure9('session', 401); }
        if (response.status === 409 && answers[a].data && answers[a].data.err === 'session-changed') { sesChanged9(null, '409'); operationInvalidate9(); return operationFailure9('session', 409); }
      }
      if (!operationSame9(stamp) || keys.some(function (key) { return operationReads9[key] !== readId; })) return operationFailure9('stale', 409);
      var refused = answers.filter(function (x) { return !x.response.ok; })[0];
      if (refused) {
        var rd = refused.data || {};
        keys.forEach(function (key) { if (operationReads9[key] === readId) operationForget9(key, 'error'); });
        return Object.assign(operationFailure9(typeof rd.err === 'string' ? rd.err : 'read', refused.response.status), typeof rd.msg === 'string' ? { msg: rd.msg } : {});
      }
      /* جوابٌ كلُّه محجوب لا يحمل حقبةً (0): لا يدخل في اتّساق الحقبة */
      var dated = answers.filter(function (x) { return x.data && operationObject9(x.data.resources) && (Object.keys(x.data.resources).length || (Array.isArray(x.data.absent) && x.data.absent.length)); });
      if (answers.some(function (x) { return !periodValid9(x.q, x.data, stamp); }) || new Set(dated.map(function (x) { return x.data.epoch; })).size > 1) throw Error('operations-read-invalid');
      var epoch = dated.length ? dated[0].data.epoch : (operationEpoch9 !== null ? operationEpoch9 : answers[0].data.epoch), v = Math.max.apply(null, answers.map(function (x) { return x.data.v; }));
      if (operationEpoch9 !== null && operationEpoch9 !== epoch) { operationInvalidate9(); stamp = operationContext9(); }
      operationEpoch9 = epoch;
      var out = { ok: 1, uid: stamp.uid, epoch: epoch, v: v, resources: {}, absent: [], denied: [], base: {} }, failedAll = {}, bump = Object.create(null);
      answers.forEach(function (x) {
        var data = x.data, failed = data.failed || {};
        if (data.logical) x.q.Ks.forEach(function (K) { if (periodOwn9(data.logical, K)) periodLogicalRev9[K] = data.logical[K]; });
        Object.keys(data.ranges || {}).forEach(function (r) {
          var K = r.slice(0, r.lastIndexOf('@')), g = r.slice(K.length + 1), order = (periodOrder9[K] || []).slice(), list = data.ranges[r];
          /* فترةٌ كانت في هذا الشهر عندي ولم تعد في جوابه: حُذفت في الخادم ⇒ تُنسى (لا تبقى قيمةً قديمة) */
          Object.keys(periodGrpOf9).forEach(function (key) { if (periodGrpOf9[key] === g && key.indexOf(K + '@') === 0 && list.indexOf(key) === -1) { delete periodGrpOf9[key]; delete mem[key]; delete baseVal[key]; delete krev[key]; operationKnown9[key] = { state: 'unloaded' }; bump[K] = 1; } });
          list.forEach(function (key) { var p = periodParse9(key).p; periodGrpOf9[key] = g; if (order.indexOf(p) === -1) order.push(p); });
          periodOrder9[K] = order; (periodGroups9[K] || (periodGroups9[K] = Object.create(null)))[g] = 1;
        });
        Object.keys(data.resources).concat(data.absent, data.denied, Object.keys(failed)).forEach(function (key) {
          var x2 = periodParse9(key), prior = operationKnown9[key], had = prior && prior.stamp && operationSame9(prior.stamp) && (prior.state === 'ready' || prior.state === 'absent'), priorText = mem[key];
          if (data.denied.indexOf(key) !== -1) { operationForget9(key, 'denied', !!x2); operationKnown9[key].stamp = stamp; if (x2) bump[x2.K] = 1; else out.denied.push(key); return; }
          if (periodOwn9(failed, key)) { operationForget9(key, 'error', !!x2); operationKnown9[key].stamp = stamp; failedAll[key] = String(failed[key]); if (x2) bump[x2.K] = 1; return; }
          var present = periodOwn9(data.resources, key);
          if (present) { mem[key] = JSON.stringify(data.resources[key]); baseVal[key] = mem[key]; } else { delete mem[key]; delete baseVal[key]; }
          krev[key] = data.base[key];
          if (x2 && keys.indexOf(key) !== -1) { if (present) out.resources[key] = data.resources[key]; else out.absent.push(key); out.base[key] = data.base[key]; }   /* فترةٌ طُلبت بعينها (قراءةُ التحقق) */
          if (x2) {
            if (had && (prior.state !== (present ? 'ready' : 'absent') || (present && priorText !== mem[key]))) bump[x2.K] = 1;   /* المحتوى تغيّر (لا مجرّدُ المراجعة) ⇒ المسودةُ المبنيّةُ عليه تُراجَع */
            if (!had || prior.state !== 'ready') periodLoadSeq9[key] = ++periodSeq9;
            if (x2.p && present && (periodOrder9[x2.K] || []).indexOf(x2.p) === -1) (periodOrder9[x2.K] || (periodOrder9[x2.K] = [])).push(x2.p);
          } else { out.resources[key] = data.resources[key]; if (!present) { delete out.resources[key]; out.absent.push(key); } out.base[key] = data.base[key]; }
          operationKnown9[key] = { state: present ? 'ready' : 'absent', epoch: epoch, rev: data.base[key], stamp: stamp };
        });
      });
      Object.keys(split).forEach(function (K) {
        periodView9(K, !!bump[K]);
        var known = operationKnown9[K];
        if (known.state === 'ready') { out.resources[K] = JSON.parse(mem[K]); out.base[K] = known.rev; }
        else if (known.state === 'absent') { out.absent.push(K); out.base[K] = known.rev; }
        else if (known.state === 'denied') out.denied.push(K);
      });
      operationSnapshot9 = { uid: stamp.uid, dept: stamp.dept, generation: stamp.generation, epoch: epoch, v: v, keys: keys.slice(), base: operationClone9(out.base) };
      plain.concat(Object.keys(split)).forEach(function (key) { if (!quiet || !periodOwn9(split, key)) notify(key); });   /* quiet: الصفحةُ الطالبة تضمّ الفترةَ بنفسها */
      var codes = Object.keys(failedAll);
      if (codes.length) return Object.assign(operationFailure9(failedAll[codes[0]], failedAll[codes[0]] === 'db-busy' ? 503 : 413), { failed: failedAll });
      return out;
    } catch (error) {
      if (operationSnapshot9 && operationSnapshot9.keys.some(function (key) { return keys.indexOf(key) !== -1; })) operationSnapshot9 = null;
      if (operationSame9(stamp)) keys.forEach(function (key) { if (operationReads9[key] === readId) operationForget9(key, 'error'); });
      return operationFailure9('read', response && response.status);
    }
  }
  /* مفاتيحُ فتراتٍ مع مفتاحها المنطقي (إعادةُ قراءة ما في الذاكرة: تغيّرُ الصلاحيات · خبرُ التغييرات) ⇒ المنطقيُّ وحده: يعيد الرأسَ وما تطلبه الصفحة */
  function periodCollapse9(keys) {
    var many = keys.length > 80, out = [];
    keys.forEach(function (key) { var x = periodParse9(key), k = x && (many || keys.indexOf(x.K) !== -1) ? x.K : key; if (out.indexOf(k) === -1) out.push(k); });
    return out;
  }
  /* الصفحةُ تطلب ما تعرضه (التنقّلُ إلى شهرٍ أو يوم): groups أشهرٌ كاملة (range)، وperiods فتراتٌ بعينها. ما حُمِّل لا يُعاد طلبه.
     يُحفظ في «المطلوب» فتعيده كلُّ إعادة قراءةٍ للمورد (تغيّرُ الصلاحيات · خبرُ التغييرات). */
  function periodWant9Read(name, spec) {
    var K;
    try { K = operationScoped9(name); } catch (error) { return Promise.resolve(operationFailure9('scope', 400)); }
    if (!periodName9(name)) return Promise.resolve(operationFailure9('not-split', 400));
    var ok = function (x) { return typeof x === 'string' && x.length >= 1 && x.length <= 64 && !/[,@*;\u0000-\u001f]/.test(x); };
    var groups = (spec && Array.isArray(spec.groups) ? spec.groups : []).filter(ok), periods = (spec && Array.isArray(spec.periods) ? spec.periods : []).filter(ok);
    var w = periodWant9[K] || (periodWant9[K] = { groups: [], periods: [], day: !!PERIOD_DAY9[name] });
    groups.forEach(function (g) { if (w.groups.indexOf(g) === -1) w.groups.push(g); });
    periods.forEach(function (p) { if (w.periods.indexOf(p) === -1) w.periods.push(p); });
    var head = operationKnown9[K + '@'], fresh = !!(head && head.stamp && operationSame9(head.stamp) && head.epoch === operationEpoch9 && (head.state === 'ready' || head.state === 'absent'));
    var needG = groups.filter(function (g) { return !fresh || !(periodGroups9[K] && periodGroups9[K][g]); }), needP = periods.filter(function (p) {
      var known = operationKnown9[K + '@' + p]; return !fresh || !known || !known.stamp || !operationSame9(known.stamp) || known.epoch !== operationEpoch9 || (known.state !== 'ready' && known.state !== 'absent');
    });
    if (!needG.length && !needP.length) return Promise.resolve({ ok: 1, cached: 1 });
    var quiet = !!(spec && spec.quiet), extra = {};
    extra[K] = { groups: needG, periods: needP, chunk: !PERIOD_MONTHLY9[name] };   /* شهرُ أيامٍ لكل طلب (≤ 40 فترة) */
    /* طلبان للمورد نفسِه في الوقت نفسِه يُسقط أحدُهما الآخر («stale»): الثاني ينتظر الأول */
    var run = (periodWantP9[K] || Promise.resolve()).then(function () { return periodRead9([K + '@'], extra, quiet); });
    periodWantP9[K] = run.then(function () {}, function () {});
    return run.then(function (r) {
      var all = [r], bad = all.filter(function (x) { return !x || x.ok !== 1; })[0];
      /* الصفحاتُ تعيد قراءة حالتها بخبر «bassam:remote» (root-logic _bsLiveReload) — خبرٌ مؤكَّد (لا يُسقط ما قُرئ للتوّ) وليس من جهازٍ آخر */
      if (!bad && !quiet) { try { operationDispatchRemote9([K], BOOT.v, [K], []); } catch (e) { /* إبلاغٌ للشاشات فقط */ } }
      return bad || all[all.length - 1];
    });
  }
  /* شهرُ الصفحة لكل موردٍ مقسَّم في مجموعة قراءتها المعلنة (KIVO_MANIFEST.operationsReadSets) — فلا تسمّي الصفحةُ مواردَ الأنظمة الأخرى.
     spec: { groups: [شهر] · periods: [أيام] (للموارد التي تُقرأ بالأيام) · except: [أسماءٌ تطلبها الصفحةُ بنفسها] } */
  function periodWantPage9(page, spec) {
    var M = KIVO.KIVO_MANIFEST, sets = M && M.keys && M.keys.indexOf('operationsReadSets') !== -1 ? M.clone('operationsReadSets') : {};
    var names = (sets[page] || []).filter(function (n) { return periodName9(n) && !((spec && spec.except) || []).some(function (x) { return x === n; }); });
    return Promise.all(names.map(function (n) {
      var day = !!PERIOD_DAY9[n], want = day ? { periods: (spec && spec.periods) || [] } : { groups: (spec && spec.groups) || [] };
      return (want.periods || want.groups).length ? periodWant9Read(n, want) : Promise.resolve({ ok: 1 });
    }));
  }
  /* فهرسُ فترات المورد بلا محتوى ({ p, grp, seq, rev, bytes } بترتيب seq) — لما يسرد الأشهرَ كلها (نسخُ خطة شهرٍ آخر) */
  async function periodIndex9(name) {
    var stamp = operationContext9(), K;
    if (!stamp) return operationFailure9('session', 401);
    try { K = operationScoped9(name); } catch (error) { return operationFailure9('scope', 400); }
    if (!periodName9(name)) return operationFailure9('not-split', 400);
    try {
      var response = await fetch('/api/operations/read?keys=' + encodeURIComponent(K + '@') + '&index=' + encodeURIComponent(K) + '&uid=' + encodeURIComponent(stamp.uid), { credentials: 'same-origin', cache: 'no-store' }), data = await response.json();
      if (!operationSame9(stamp)) return operationFailure9('stale', 409);
      if (!response.ok || !operationObject9(data) || data.ok !== 1 || !operationObject9(data.index) || !Array.isArray(data.index[K])) return operationFailure9((data && data.err) || 'index', response.status);
      return { ok: 1, key: K, index: data.index[K].filter(function (x) { return x && typeof x.p === 'string' && x.p; }) };
    } catch (error) { return operationFailure9('index', 0); }
  }
  /* الحفظ: الوثيقةُ التي تكتبها الصفحة ⇒ الرأسُ إن تغيّر + كلُّ فترةٍ تغيّرت (أو جديدة) + حذفُ فترةٍ محمَّلةٍ رأتها الصفحةُ ثم أزالتها.
     فترةٌ لم تُقرأ قط تُكتب على المراجعة 0 (الخادمُ يردّها تعارضاً إن وُجدت). بلا فرقٍ أصلاً ⇒ إيصالٌ محلّي بلا طلب. */
  function periodStage9(changes, stamp) {
    var set = changes.set || {}, del = changes.del || [], rb = changes.readBase || {};
    var touched = Object.keys(set).concat(del).filter(periodLogical9);
    if (!touched.length) return null;
    var out = { set: {}, del: [], readBase: {} }, meta = { Ks: touched, docs: {}, before: {} }, fail = null;
    Object.keys(set).forEach(function (k) { if (!periodLogical9(k)) out.set[k] = set[k]; });
    del.forEach(function (k) { if (!periodLogical9(k)) out.del.push(k); });
    Object.keys(rb).forEach(function (k) { if (!periodLogical9(k)) out.readBase[k] = rb[k]; });
    touched.forEach(function (K) {
      if (fail) return;
      var known = operationKnown9[K], hk = K + '@', head = operationKnown9[hk], name = unscoped(K);
      if (Object.keys(out.set).concat(out.del).some(function (k) { var x = periodParse9(k); return x && x.K === K; })) { fail = operationFailure9('operations-period-mixed', 400); return; }
      if (!known || !known.split || !known.stamp || !operationSame9(known.stamp) || (known.state !== 'ready' && known.state !== 'absent') || known.epoch !== operationEpoch9
          || !head || (head.state !== 'ready' && head.state !== 'absent') || (periodOwn9(rb, K) && rb[K] !== known.rev)) { fail = operationFailure9('read-required', 409); return; }
      var loaded = periodLoaded9(K), seen = periodGetSeq9[K] || 0, sp = null;
      meta.before[K] = periodOwn9(mem, K) ? mem[K] : null;
      if (periodOwn9(set, K) && set[K] !== null) {
        sp = periodSplit9(name, set[K]);
        if (!sp) { fail = operationFailure9('changes', 400); return; }
        meta.docs[K] = JSON.stringify(set[K]);
        if (cj9(periodHeadNorm9(name, head.state === 'ready' ? JSON.parse(mem[hk]) : {})) !== cj9(sp.head)) out.set[hk] = sp.head;
        sp.order.forEach(function (p) {
          var pk = K + '@' + p, pn = operationKnown9[pk], v = sp.periods[p];
          var live = pn && pn.stamp && operationSame9(pn.stamp) && pn.epoch === operationEpoch9;
          if (live && pn.state === 'ready') { if (cj9(JSON.parse(mem[pk])) !== cj9(v)) out.set[pk] = v; return; }
          if (!(live && pn.state === 'absent')) { operationKnown9[pk] = { state: 'absent', epoch: operationEpoch9, rev: 0, stamp: stamp, blind: 1 }; krev[pk] = 0; delete mem[pk]; delete baseVal[pk]; }
          out.set[pk] = v;
        });
      }
      loaded.forEach(function (p) { if ((!sp || !periodOwn9(sp.periods, p)) && (periodLoadSeq9[K + '@' + p] || 0) <= seen) out.del.push(K + '@' + p); });
    });
    if (fail) return fail;
    if (!Object.keys(out.set).length && !out.del.length) {
      var ticket = Object.freeze({ requestId: 'period-noop-' + (++periodSeq9) });
      operationsTickets9.set(ticket, { ticket: ticket, stamp: stamp, keys: [], snap: { set: Object.create(null), del: Object.create(null) }, before: Object.create(null), epoch: operationEpoch9, state: 'confirmed', result: { ok: 1, noop: 1, receipt: { ok: 1, revs: {} } }, period: meta });
      return { noop: ticket };
    }
    return { changes: out, meta: meta };
  }
  /* بعد إيصال الحفظ: تُبنى «الوثيقة» من جديد (ونصُّها نصُّ ما كتبته الصفحةُ إن طابقه، فمقارنةُ الصفحة لحفظها تصدق) */
  function periodSettled9(operation) {
    (operation.period.Ks || []).forEach(function (K) {
      periodView9(K, true);
      var doc = operation.period.docs[K];
      if (doc !== null && doc !== undefined && periodOwn9(mem, K) && cj9(JSON.parse(doc)) === cj9(JSON.parse(mem[K]))) { mem[K] = doc; baseVal[K] = doc; }
      notify(K);
    });
  }
  /* الإيصالُ والرفضُ والتعارضُ بمفاتيح الفترات ⇒ بالمفتاح المنطقي للصفحات (تعرف مواردها بأسمائها لا بفتراتها) */
  function periodDetails9(details) {
    if (!operationObject9(details)) return details;
    var out = operationClone9(details);
    ['denied', 'conflicts'].forEach(function (kind) {
      if (!operationObject9(out[kind])) return;
      var m = {};
      Object.keys(out[kind]).forEach(function (key) { var x = periodParse9(key), L = x ? x.K : key; if (!periodOwn9(m, L)) m[L] = out[kind][key]; });
      out[kind] = m;
    });
    return out;
  }
  function periodCommitChanges9(operation, list) {
    if (!operation.period) return list;
    var out = list.filter(function (c) { return !periodParse9(c.key); });
    (operation.period.Ks || []).forEach(function (K) { out.push({ key: K, before: operation.period.before[K], after: periodOwn9(mem, K) ? mem[K] : null }); });
    return out;
  }
  /* خبرُ التغييرات: K تغيّر لأن فترةً منه تغيّرت (pk). إن كانت كلُّ فتراته المتغيّرة خارج ما حمّلته الصفحة، أو صدى حفظي (مراجعتُها عندي ≥ v)، فلا إسقاط */
  function periodEcho9(K, v) {
    if (!periodLogical9(K) || !Array.isArray(periodPk9)) return false;
    var mine = periodPk9.filter(function (key) { var x = periodParse9(key); return x && x.K === K; });
    if (!mine.length) return false;
    return mine.every(function (key) {
      var known = operationKnown9[key];
      if (!known || !known.stamp || !operationSame9(known.stamp) || (known.state !== 'ready' && known.state !== 'absent')) return key !== K + '@' && !periodWanted9(K).periods.some(function (p) { return K + '@' + p === key; });
      return known.epoch === operationEpoch9 && operationInteger9(known.rev) && operationInteger9(v) && known.rev >= v;
    });
  }
  /* الملخّصات (المؤشرات والأرشيف): صفٌّ لكل فترة من الخادم بدل تحميل التاريخ — { ok, key, rows:[{p, grp, seq, rev, v}] } */
  async function periodSummary9(name, q) {
    var stamp = operationContext9(), K;
    if (!stamp) return operationFailure9('session', 401);
    try { K = operationScoped9(name); } catch (error) { return operationFailure9('scope', 400); }
    if (!periodName9(name) || !q || !(Array.isArray(q.groups) && q.groups.length || (typeof q.from === 'string' && typeof q.to === 'string'))) return operationFailure9('summary', 400);
    var url = '/api/operations/summary?key=' + encodeURIComponent(K) + (Array.isArray(q.groups) && q.groups.length ? '&grp=' + encodeURIComponent(q.groups.join(',')) : '&from=' + encodeURIComponent(q.from) + '&to=' + encodeURIComponent(q.to)) + '&uid=' + encodeURIComponent(stamp.uid);
    try {
      var response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' }), data = await response.json();
      if (!operationSame9(stamp)) return operationFailure9('stale', 409);
      if (!response.ok || !operationObject9(data) || data.ok !== 1 || !Array.isArray(data.rows)) return Object.assign(operationFailure9((data && data.err) || 'summary', response.status), data && typeof data.msg === 'string' ? { msg: data.msg } : {});
      return { ok: 1, key: K, rows: data.rows };
    } catch (error) { return operationFailure9('summary', 0); }
  }
  function periodForget9(key, quiet) {
    if (periodLogical9(key)) { periodForgetAll9(key); return; }
    var x = periodParse9(key);
    if (x && operationKnown9[x.K] && operationKnown9[x.K].split && operationKnown9[x.K].state !== 'unloaded') { delete mem[x.K]; delete baseVal[x.K]; operationKnown9[x.K] = { state: 'unloaded' }; if (!quiet) notify(x.K); }
  }
  window.addEventListener('bassam:authz', function () { operationInvalidate9(); });
  function liveLog9(kind, why, keys) { try { if (KIVO.__bsLiveLog) KIVO.__bsLiveLog(kind, 'operations', why, keys); } catch (e) { /* تشخيصٌ فقط */ } }
  // Only this closure can prove that a dispatched change event already has a
  // confirmed typed read. Arbitrary/custom remote events still invalidate.
  var operationRemoteProof9 = new WeakMap();
  function operationDispatchRemote9(keys, v, confirmed, foreign) {
    /* foreign: مفاتيحُ العمليات التي تغيّرت مراجعتُها فعلاً عمّا في هذا التبويب (تعديلُ جهازٍ آخر) — صدى حفظي أنا ليس منها */
    var event = new CustomEvent('bassam:remote', { detail: { keys: keys, v: v, foreign: foreign || [] } });
    operationRemoteProof9.set(event, new Set(confirmed || []));
    try { window.dispatchEvent(event); } finally { operationRemoteProof9.delete(event); }
  }
  window.addEventListener('bassam:remote', function (event) {
    var confirmed = operationRemoteProof9.get(event), keys = (event.detail && event.detail.keys) || [];
    operationInvalidate9(Array.isArray(keys) ? keys.filter(function (key) { return !confirmed || !confirmed.has(key); }) : undefined);
  });
  /* KIVO_243 · نافذةُ تأكيد الاستدراك: تُعلَّق المفاتيحُ (hold9) فلا تُرسل ولا تُعدّ محفوظة؛ «تأكيد» يُرسلها · «إلغاء» يعيدها إلى قيمة الخادم. */
  function holdKeys9(items) { for (var i = 0; i < items.length; i++) { var it = items[i]; if (!(it.k in pSet) && !(it.k in pDel)) { if (it.v != null) pSet[it.k] = it.v; else pDel[it.k] = 1; } hold9[it.k] = 1; } recount(); }
  function releaseKeys9(items, ok, msg) {
    for (var q = 0; q < items.length; q++) {
      var x = items[q]; delete hold9[x.k];
      if (ok) continue;
      deniedN9++; deniedK9[x.k] = (deniedK9[x.k] || 0) + 1;
      overCheck9(x.k, x.d.cur == null ? null : String(x.d.cur));
      if (x.d.cur != null) { mem[x.k] = String(x.d.cur); baseVal[x.k] = mem[x.k]; krev[x.k] = x.d.rev || krev[x.k] || 0; } else { delete mem[x.k]; delete baseVal[x.k]; }
      if (x.k === KU9 && x.d.cur != null && typeof x.d.uscope === "string") uscope9 = x.d.uscope;
      if (x.k === KP9 && x.d.cur != null && typeof x.d.pscope === "string") pscope9 = x.d.pscope;   /* مراجعةُ التكامل W1-R1 */
      delete pSet[x.k]; delete pDel[x.k]; unmark9(x.k); notify(x.k);   /* KIVO_264 · المراجعة (A2): أُلغي ⇒ لا علامةَ تبقى للكتابة التالية */
    }
    if (!ok) overFlush9(null);
    recount();
    if (ok) kick(); else { bsToast(msg || "أُلغي التعديل — أُعيدت القيمة المحفوظة", { tone: "err" }); settleWaiters(false); }
  }
  function dlg9(o, cb) {
    try {
      var host = document.body || document.documentElement, ov = document.createElement("div");
      ov.setAttribute("dir", "rtl"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
      ov.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px";
      ov.innerHTML = "<div style=\"background:var(--bg-xffffff,#fff);color:var(--fg-x25343f,#25343f);border-radius:14px;max-width:440px;width:100%;padding:18px 18px 14px;box-shadow:var(--shadow-elevated);font:400 13px/1.9 Cairo,Tahoma,Arial\">"
        + "<div data-t style=\"font-weight:700;font-size:14px;margin-bottom:4px\"></div><div data-d style=\"font-size:12px;color:var(--fg-x64748b,#64748b);margin-bottom:8px\"></div>"
        + "<div style=\"display:flex;gap:8px;justify-content:flex-start;margin-top:8px\"><button type=\"button\" data-ok style=\"border:0;border-radius:10px;padding:7px 16px;background:var(--bg-x25343f,#25343f);color:#fff;font:600 13px Cairo,Tahoma,Arial;cursor:pointer\"></button>"
        + "<button type=\"button\" data-no style=\"border:1px solid var(--bd-xcbd5e1,#cbd5e1);border-radius:10px;padding:7px 16px;background:transparent;color:inherit;font:600 13px Cairo,Tahoma,Arial;cursor:pointer\">إلغاء التعديل</button></div></div>";
      ov.querySelector("[data-t]").textContent = o.title; ov.querySelector("[data-d]").textContent = o.desc; ov.querySelector("[data-ok]").textContent = o.ok;
      var fin = false, close9 = function (r) { if (fin) return; fin = true; try { ov.parentNode.removeChild(ov); } catch (e) {} cb(r); };
      /* V7 · 53 (noreason): نافذةُ تأكيدٍ وحدها — لا حقلَ سبب ولا «تذكّر» («تأكيد» يمضي · «إلغاء» يعيد القيمة) */
      ov.querySelector("[data-ok]").onclick = function () { close9("ok"); };
      ov.querySelector("[data-no]").onclick = function () { close9(""); };
      ov.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); close9(""); } });
      host.appendChild(ov); setTimeout(function () { try { ov.querySelector("[data-ok]").focus(); } catch (e) {} }, 30);
    } catch (e) { cb(""); }
  }
  function namesOf9(items) { return items.map(function (x) { return "«" + lbl(x.k) + "»"; }).filter(function (v, n, a) { return a.indexOf(v) === n; }).join("، "); }
  /* V7 · 53 (noreason · REVIEW.md البند ٣ — قرارُ المالك 23 نوفمبر): لا يُطلب سببٌ لأيّ فعلٍ من أيّ مستخدم، ورسالةُ التأكيد تكفي.
     أُزيلت نوافذُ السبب كلُّها من طبقة التخزين: reasonAsk9 (رفضُ why:reason) · askReason9 (مسارات الخادم) · askFirst9/rsnNeed9 (التنبّؤ قبل الإرسال)
     ومعها «تذكّر السبب للجلسة». ما بقي للتوافق مع المستدعين القدامى لا يفتح نافذةً ولا يشترط سبباً: reasonExempt() = true دائماً ·
     reasonFirst ⇒ { go:true } فوراً · reasonRule بلا أثر. والسببُ الذي ترسله الواجهةُ بنفسها (why) يبقى بياناً اختيارياً في السجل. */
  function exempt9() { return true; }
  function reasonFirst9(k, keys, cb) { setTimeout(function () { cb({ go: true, reason: "" }); }, 0); }
  /* نافذةُ الاستدراك (D3-07): الفترةُ المغلقة تُفتح بسببٍ لمدةٍ افتراضية (24 ساعة) لإدارتك — ثم يُعاد إرسالُ التعديل كما هو */
  function retroSys9(k) { var n = String(k).replace(/^bsdept:[^:]+:/, ""); return @@SYS:store.retroSys@@""; }
  function retroAsk9(items) {
    holdKeys9(items);
    var PMr = KIVO.BassamPerm, per = {}, it, m, re = /(?:closed-period[^(]*|retro-window-expired )\((?:old|new):(\d{4})-(\d{1,2})(?:-\d{1,2})?\)/g;
    for (var i = 0; i < items.length; i++) { it = items[i]; var sys = retroSys9(it.k), dept = (String(it.k).match(/^bsdept:([^:]+):/) || [])[1] || "";
      while ((m = re.exec(String(it.d.detail || "")))) per[sys + "|" + dept + "|" + m[1] + "-" + m[2]] = { res: sys, dept: dept, y: +m[1], m: +m[2] }; re.lastIndex = 0; }
    var ws = Object.keys(per).map(function (q) { return per[q]; });
    var keyOf = function (w) { return @@SYS:store.retroKey|empty="\"\""@@; };
    if (!ws.length || ws.some(function (w) { return !(PMr && PMr.key && PMr.key(keyOf(w), w.dept)); })) { releaseKeys9(items, false, "الفترةُ مغلقة — تعديلُها يتطلب نافذة استدراك يفتحها من يملك مفتاحها (" + (ws.length ? keyOf(ws[0]) : "retro.open") + ")"); return; }
    var lblP = ws.map(function (w) { return w.y + "/" + w.m; }).join("، ");
    dlg9({ title: "الفترة مغلقة — فتحُ نافذة استدراك", desc: "التعديل على " + namesOf9(items) + " يقع في فترةٍ مغلقة (" + lblP + "). تُفتح نافذةُ استدراكٍ لإدارتك 24 ساعة وتُسجَّل باسمك، ثم يُعاد الحفظ.", ok: "فتح النافذة والحفظ" }, function (r) {
      if (!r) { releaseKeys9(items, false, "أُلغي التعديل — الفترةُ مغلقة"); return; }
      var go = function (n) {
        if (n >= ws.length) { releaseKeys9(items, true); return; }
        var w = ws[n];
        fetch("/api/retro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ res: w.res, dept: w.dept, act: "open", scope: { y: w.y, m: w.m } }) })
          .then(function (x) { return x.json().catch(function () { return null; }); })
          .then(function (j) { if (j && j.ok === 1) go(n + 1); else releaseKeys9(items, false, "تعذّر فتحُ نافذة الاستدراك" + (j && j.err ? " (" + j.err + ")" : "")); })
          .catch(function () { releaseKeys9(items, false, "تعذّر فتحُ نافذة الاستدراك — لا اتصال، حاول مجددًا عند العودة"); });
      };
      go(0);
    });
  }

  /* ══ الإرسالُ غيرُ المتزامن ═════════════════════════════════════════════
     كان الإرسالُ XHR متزامناً: كلُّ تحريرٍ يجمّد خيطَ الواجهة حتى يجيب الخادم،
     فتبدو المنصّةُ ثقيلةً في كلِّ ضغطة. الآن: التحريرُ يظهر فوراً محليّاً،
     والكتابةُ تُرسَل خلفَه في طابورٍ متسلسل — طلبُ حفظٍ واحدٌ في الهواء لا أكثر،
     ونافذةُ تجميعٍ قصيرة تجمع الكتابات المتلاحقة في طلبٍ واحد.
     والدلالاتُ محفوظة: اللقطةُ المُرسَلة ثابتة، وما يُكتب بعدها جيلٌ جديد،
     فلا يمحو ردٌّ قديمٌ كتابةً أحدث، ولا تُفقد كتابةٌ عند إخفاقٍ أو انقطاع. */
  var COALESCE_MS = 90;
  var sendT = null, inflight = null, flushWaiters = [];
  function settleWaiters(ok) {
    var w = flushWaiters; flushWaiters = [];
    for (var i = 0; i < w.length; i++) { try { w[i](ok); } catch (e) {} }
  }
  function kick() {
    if (sx9) { orphanize9(); return; }               /* KIVO_264 · D-3: تبدّلت الجلسة — ما يُكتب بعدها لا يُرسل باسم الهوية الجديدة */
    if (ANON9 || bye9) { clearQueue(); return; }
    if (operationActive9 && operationActive9.state !== 'queued') return;
    if (sendT || inflight) return;
    sendT = setTimeout(function () { sendT = null; sendNow(); }, COALESCE_MS);
  }
  /* إقرارُ الحفظ يُحاسب كل مفتاح أُرسل، حتى لو كانت الكتابة مطابقةً للمخزَّن
     (يعيد الخادم مراجعته الحالية، وقد تكون صفراً). الردّ الناقص ليس نجاحاً. */
  function saveAck9(j, snap) {
    var obj = function (v) { return !!v && typeof v === "object" && !Array.isArray(v); };
    var rev = function (v) { return Number.isSafeInteger(v) && v >= 0; };
    /* V7 · د5-هـ (أمن ١): ok:0 = لم يُحفظ مفتاح (رُفض كلُّ ما طُلب أو تعارض) — إقرارٌ صالح إن لم يحمل مفتاحاً محفوظاً وحمل مانعاً */
    var none9 = !!obj(j) && j.ok === 0;
    if (!obj(j) || (j.ok !== undefined && j.ok !== 1 && j.ok !== true && !none9)) return false;
    if (none9 && obj(j.revs) && Object.keys(j.revs).length) return false;
    var seen = Object.create(null), kinds = ["revs", "denied", "conflicts"], count = 0, stopped = 0, i, k, value;
    for (i = 0; i < kinds.length; i++) {
      var kind = kinds[i], map = j[kind];
      if (map === undefined) continue;
      if (!obj(map)) return false;
      for (k in map) {
        if (!(k in snap.set) && !(k in snap.del)) return false;
        if (seen[k]) return false;
        value = map[k];
        if (kind === "revs") { if (!rev(value)) return false; }
        else {
          if (!obj(value) || (value.rev !== undefined && !rev(value.rev))) return false;
          if (kind === "denied" && (typeof value.why !== "string" || !value.why)) return false;
          if (kind === "conflicts" && !("cur" in value)) return false;
          if (value.cur != null && typeof value.cur !== "string") return false;
          stopped++;
        }
        seen[k] = 1; count++;
      }
    }
    if (!count || (none9 && !stopped)) return false;
    /* رفضُ عملية ذرّية يعيد فقط الموانع؛ settle يعيد بقية اللقطة إلى الطابور. */
    if (j.atomic && stopped) return true;
    for (k in snap.set) if (!seen[k]) return false;
    for (k in snap.del) if (!seen[k]) return false;
    return true;
  }
  function sendNow() {
    if (sx9) { orphanize9(); settleWaiters(false); return; }
    if (ANON9 || bye9) { clearQueue(); settleWaiters(true); return; }
    if (inflight) return;
    if (operationActive9 && operationActive9.state !== 'queued') return;
    if (!dirty) { settleWaiters(true); return; }
    /* لقطةٌ ثابتة، والطابورُ يبدأ جيلاً جديداً فارغاً — KIVO_243: ما ينتظر تأكيدَ الاستدراك (hold9) يبقى في الطابور ولا يُرسل */
    var snap, body, k9, operation = operationActive9;
    if (operation) {
      snap = operation.snap; body = operation.body; operation.state = 'sending';
      operation.keys.forEach(function (key) { delete pSet[key]; delete pDel[key]; });
      recount();
    } else if (Object.keys(hold9).length) {
      var keep9 = { set: Object.create(null), del: Object.create(null) }; snap = { set: Object.create(null), del: Object.create(null) };
      for (k9 in pSet) (hold9[k9] ? keep9.set : snap.set)[k9] = pSet[k9];
      for (k9 in pDel) (hold9[k9] ? keep9.del : snap.del)[k9] = 1;
      if (!Object.keys(snap.set).length && !Object.keys(snap.del).length) return;
      pSet = snap.set; pDel = snap.del; body = payload(); pSet = keep9.set; pDel = keep9.del; recount();
    } else { snap = { set: pSet, del: pDel }; body = payload(); pSet = Object.create(null); pDel = Object.create(null); recount(); }
    inflight = snap;
    for (k9 in snap.set) { var L9 = sent9[k9] || (sent9[k9] = []); if (L9[L9.length - 1] !== snap.set[k9]) { L9.push(snap.set[k9]); if (L9.length > 4) L9.shift(); } }
    fetch("/api/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: body })
      .then(function (r) {
        if (operation) return r.json().then(function (data) { return { status: r.status, data: data }; });
        if (sx9) return;
        if (r.status === 401) { sessGone9(snap); return; }
        /* KIVO_264 · D-3 (C1): الكوكي صار لهويةٍ غير هوية هذه الصفحة ⇒ لا إعادةَ إرسال: يُعزل الطابور ويُبلَّغ المستخدم ثم يُعاد التحميل */
        if (r.status === 409) {
          return r.json().catch(function () { return null; }).then(function (j9) {
            if (j9 && j9.err === "session-changed") { sesChanged9(snap, "409"); return; }
            throw new Error("HTTP 409");
          });
        }
        if (r.status === 429) {
          return r.json().catch(function () { return null; }).then(function (j9) {
            inflight = null;
            requeue(snap);
            var sec = (j9 && +j9.retry) || 1;
            warn(true, "طلباتٌ كثيرة — إعادةٌ بعد " + KIVO.BassamCount(sec, "ثانية", "g"));   /* KIVO_260: صيغةُ العدد (R183) */
            retryLater(Math.max(1000, sec * 1000));
            settleWaiters(false);
            return;
          });
        }
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (j) {
        if (operation) return operationSettle9(operation, j.status, j.data);
        if (j === undefined || sx9) return;           /* عولج أعلاه أو عُزلت الجلسة أثناء الطلب */
        if (!saveAck9(j, snap)) throw new Error("invalid-save-acknowledgement");
        inflight = null;
        var again = settle(j, snap), dn9n = Object.keys(j.denied || {}).length;
        warn(false); fails = 0;
        if (again) { kick(); settleWaiters(false); return; }
        settleWaiters(!dirty && !dn9n);   /* V7 · د5-هـ (أمن ١): مفتاحٌ رُفض ليس حفظاً — خرج من الطابور لكنه لم يُحفظ */
        kickIfDirty();
      })
      .catch(function (e) {
        if (operation) { operationUncertain9(operation, 'network'); return; }
        if (sx9) return;
        if (inflight === snap) { inflight = null; requeue(snap); }
        warn(true, (e && e.message) || "");
        if (!fails) saveNotice53("لم يُحفظ تعديلك بعد (" + ((e && e.message) || "تعذّر الاتصال") + ") — نحاول تلقائياً؛ لا تغلق الصفحة حتى يظهر الحفظ.");   /* V7 · 53: لا فشلَ صامت */
        retryLater();
        settleWaiters(false);
      });
  }
  /* إعادةُ اللقطةِ المخفقة إلى الطابور — والأحدثُ يُرجَّح دائماً */
  function requeue(snap) {
    var k;
    for (k in snap.set) if (!(k in pSet) && !(k in pDel)) pSet[k] = snap.set[k];
    for (k in snap.del) if (!(k in pSet) && !(k in pDel)) pDel[k] = 1;
    recount();
  }
  function kickIfDirty() { if (dirty) kick(); }

  /* إفراغٌ مضمونٌ بوعد: لعملياتٍ لا تكتمل إلا بوصول الكتابة (تغييرُ كلمة المرور،
     الخروج، التحديثُ بالسحب) — بديلُ الإرسال المتزامن القديم. */
  function flushAsync(ms) {
    if (sx9) { orphanize9(); return Promise.resolve(false); }   /* KIVO_264 · D-3: لم يُحفظ — ولن يُحفظ باسم هويةٍ أخرى */
    if (ANON9 || bye9) { clearQueue(); return Promise.resolve(true); }
    if (operationActive9 && operationActive9.state !== 'queued' && operationActive9.state !== 'sending') return Promise.resolve(false);
    if (!dirty && !inflight) return Promise.resolve(true);
    return new Promise(function (res) {
      var done = false;
      var fin = function (ok) { if (done) return; done = true; res(!!ok && !dirty); };
      flushWaiters.push(fin);
      if (sendT) { clearTimeout(sendT); sendT = null; }
      if (!inflight) sendNow();
      setTimeout(function () { fin(false); }, ms || 8000);
    });
  }

  /* إن فشل الإرسال، تُعاد المحاولة في الخلفية حتى ينجح */
  var retryT = null, fails = 0;
  function retryLater(ms) {
    if (operationActive9) return;
    fails++;
    if (retryT) return;
    retryT = setTimeout(function () { retryT = null; sendNow(); },
                        ms || Math.min(800 * fails, 6000));
  }

  /* ── انقطاع جلسة الخادم (401): تصريحٌ لا مواربة — الحفظ متوقف حتى دخول جديد ── */
  var sgBar9 = null;
  /* ذاكرةُ الصور لا تعبر جلسةً إلى أخرى — محتواها محميٌّ بالصلاحيات */
  function imcClear9() { try { if (KIVO.BassamImgCache) KIVO.BassamImgCache.clear(); } catch (e) {} }

  /* ── KIVO_264 · D-3: تبدّلت الجلسة في هذا المتصفح (409 session-changed من الخادم، أو علامةُ جلسةٍ لحسابٍ آخر كتبها تبويبٌ آخر) ──
     ما في الطابور وما كان في الهواء أنتجته هويةُ هذه الصفحة: لا يُرسل باسم الهوية الجديدة أبداً — يُعزل (orphan9، للتشخيص وحده ولا يُحفظ
     على الجهاز)، ويقف الإرسالُ والاستماع، ويُقال للمستخدم ما لم يُحفظ، ثم تُعاد الصفحةُ على الحساب الحالي. */
  function orphanize9(s) {
    var k, put = function (q) { if (!q) return; for (k in q.set) { orphan9.set[k] = q.set[k]; delete orphan9.del[k]; } for (k in q.del) { orphan9.del[k] = 1; delete orphan9.set[k]; } };
    orphan9 = orphan9 || { set: Object.create(null), del: Object.create(null) };
    put(s); put({ set: pSet, del: pDel });
    clearQueue(); hold9 = Object.create(null);
  }
  function stopSession9(snap) {
    if (sx9) return false; sx9 = true;
    orphanize9(snap || inflight); inflight = null;
    if (sendT) { clearTimeout(sendT); sendT = null; }
    if (retryT) { clearTimeout(retryT); retryT = null; }
    imcClear9(); warn(false); settleWaiters(false);
    return true;
  }
  function sesChanged9(snap, how) {
    if (!stopSession9(snap)) return;
    link9("off", "تغيّرت الجلسة في هذا المتصفح");
    var names = Object.keys(orphan9.set).concat(Object.keys(orphan9.del)).map(lbl).filter(function (v, n, a) { return a.indexOf(v) === n; });
    var go = function () { try { location.reload(); } catch (e) { /* بيئةٌ بلا إعادة تحميل */ } };
    try {
      var host = document.body || document.documentElement;
      if (host) {
        var d = document.createElement("div");
        d.setAttribute("dir", "rtl"); d.setAttribute("role", "alert");
        d.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:2147483647;background:var(--danger);color:var(--text-on-fill);"
          + "font:600 12.5px/1.9 Cairo,Tahoma,Arial;padding:11px 18px;border-radius:11px;box-shadow:var(--shadow-elevated);cursor:pointer;max-width:86vw;text-align:center";
        d.textContent = "⚠ تغيّر الحسابُ المسجَّل في هذا المتصفح" + (how === "switched" ? " من نافذةٍ أخرى" : "")
          + (names.length ? " — لم تُرسَل تعديلاتُك غيرُ المحفوظة على «" + names.join("» و«") + "» باسم الحساب الجديد" : "")
          + ". يُعاد تحميلُ الصفحة على الحساب الحالي…";
        d.addEventListener("click", go);
        host.appendChild(d);
      }
    } catch (e) { /* الشريطُ عرضٌ فقط — العزلُ تمّ قبله */ }
    setTimeout(go, 3500);
  }
  function sessGone9(snap) {
    /* لا إعادةَ إرسال بعد انتهاء الهوية: ما كان طائراً أو منتظراً يبقى معزولاً
       في ذاكرة الصفحة، ولا يُكتب على الجهاز ولا يُرسل ببيانات حسابٍ يدخل لاحقاً. */
    if (!stopSession9(snap)) return;
    link9("off", "انتهت الجلسة — سجّل الدخول");
    var host = document.body || document.documentElement;
    if (!host) return;
    sgBar9 = document.createElement("div");
    sgBar9.setAttribute("dir", "rtl");
    sgBar9.title = "انتهت الجلسة فتوقف الحفظ — الدخول من جديد يعيد كل شيء للعمل";
    sgBar9.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:2147483647;"
      + "background:var(--bg-x7f1d1d);color:var(--fg-xffffff);font:600 12.5px/1.9 Cairo,Tahoma,Arial;padding:11px 18px;"
      + "border-radius:11px;box-shadow:var(--shadow-elevated);cursor:pointer;max-width:86vw;text-align:center";
    sgBar9.textContent = "⚠ انتهت الجلسة — سجّل الدخول. تعديلاتك الأخيرة لم تُحفظ؛ اضغط هنا لتسجيل الدخول من جديد";
    sgBar9.addEventListener("click", function () { location.reload(); });
    host.appendChild(sgBar9);
    try { window.dispatchEvent(new CustomEvent("bs:session-gone")); } catch (e) { /* إعلامٌ فقط */ }   /* RISHAD-266: بطاقاتُ تعذّر الشاشة تقول السببَ الحقيقي */
  }

  /* ── تنبيه صريح حين يتعذّر الحفظ ───────────────────────────────────────── */
  function warn(bad) {
    link9(bad ? "off" : "on", bad ? (operationActive9 ? "لم يتأكد الحفظ — أعد المحاولة بالطلب نفسه" : "لم يُحفظ بعد — نحاول تلقائيًا") : presN9);
  }

  /* شبكة أمان أخيرة: لو بقي في الطابور شيء عند الإغلاق، يُرسَل بنبضة لا
     تنتظر جواباً — الوسيلة الوحيدة التي لا يقطعها المتصفّح عند الإغلاق */
  window.addEventListener("pagehide", function () {
    if (bye9 || sx9 || operationActive9) return;
    /* ما كان طائراً لحظةَ الإغلاق قد يُقطَع طلبُه — يُعاد ضمُّه إلى النبضة الأخيرة */
    try { if (inflight) { requeue(inflight); inflight = null; } } catch (e0) {}
    if (!dirty) return;
    try { navigator.sendBeacon("/api/save", new Blob([payload()], { type: "application/json" })); } catch (e) {}
  });

  /* CORE-01: تنبيهُ المغادرة الواحد — لا يُسأل المستخدم إلا وفي الطابور ما لم يُحفظ، أو طلبٌ في الطريق، أو عمليةٌ جارية؛
     ولا بعد الخروج أو تبدّل الجلسة (ما بقي حينها معزولٌ لا يُرسل). الإعادةُ المقصودة (تبديلُ الوحدة · السحبُ للتحديث) تحفظ قبلها فلا تسأل. */
  window.addEventListener("beforeunload", function (e) {
    if (ANON9 || bye9 || sx9 || !(dirty || inflight || operationActive9)) return;
    try { e.preventDefault(); e.returnValue = ""; } catch (eB) { /* متصفحٌ قديم */ }
    return "";
  });

  /* ── استبدال مخزن المتصفّح ───────────────────────────────────────────────
     sessionStorage يبقى على حاله تماماً — الشرط this===localStorage يمرّره
     إلى الدوالّ الأصلية بلا مساس. */
  var P = Storage.prototype;
  var oGet = P.getItem, oSet = P.setItem, oDel = P.removeItem, oClear = P.clear, oKey = P.key;
  var oLen = Object.getOwnPropertyDescriptor(P, "length");
  function isLS(st) { return st === window.localStorage; }
  function legacyMemoryKeys9() { return Object.keys(mem).filter(function (key) { return !operationResource9(key) && !relationalKey9(key); }); }

  P.getItem = function (k) {
    if (!isLS(this)) return oGet.call(this, k);
    k = String(k);
    if (invalidScope9(k)) return null;
    if (devKey9(k)) return oGet.call(this, k);
    if (relationalKey9(k) || operationResource9(k)) return null;
    if (KIVO.__bsReadHook) KIVO.__bsReadHook(k);
    if (devKey9(k) || !teamKey9(k)) return oGet.call(this, k);  /* مفتاح جهاز أو مفتاحٌ خارج قائمة المزامنة: من المخزن الأصلي */
    var v9 = (k in mem) ? mem[k] : null;
    if (v9 !== null && v9.length >= 1024 && KIVO.__bsFromStore) KIVO.__bsFromStore.note(v9);
    return v9;
  };
  /* تدقيقُ التعديلات العادية فقط؛ العملياتُ المغلقة لا تمرّ بعلامات متصفح عامة. */
  function audEvents9(setMap) {
    var out = [], A = KIVO.BassamAudit; if (!A || !A.events) return out;
    for (var k in setMap) {
      try { var ev = A.events(k, baseVal[k] == null ? null : baseVal[k], setMap[k], krev[k] || 0, ""); for (var i = 0; i < ev.length && out.length < 380; i++) out.push(ev[i]); } catch (e) {}
    }
    return out;
  }
  P.setItem = function (k, v) {
    if (!isLS(this)) return oSet.call(this, k, v);
    k = String(k); v = String(v);
    if (devKey9(k)) return oSet.call(this, k, v);
    if (relationalKey9(k) || operationResource9(k)) throw new Error('relational-domain-api-required');
    if (invalidScope9(k)) throw new Error('department-scope-required');
    if (devKey9(k) || !teamKey9(k)) return oSet.call(this, k, v);
    if (mem[k] === v) return;                     /* لا كتابة بلا تغيير */
    mem[k] = v; pSet[k] = v; delete pDel[k]; dirty = true;
    kick();
  };
  P.removeItem = function (k) {
    if (!isLS(this)) return oDel.call(this, k);
    k = String(k);
    if (devKey9(k)) return oDel.call(this, k);
    if (relationalKey9(k) || operationResource9(k)) throw new Error('relational-domain-api-required');
    if (invalidScope9(k)) throw new Error('department-scope-required');
    if (devKey9(k) || !teamKey9(k)) return oDel.call(this, k);
    if (!(k in mem)) return;
    delete mem[k]; pDel[k] = 1; delete pSet[k]; dirty = true;
    kick();
  };
  P.clear = function () {
    if (!isLS(this)) return oClear.call(this);
    if (operationActive9) throw Error('relational-domain-api-required');
    legacyMemoryKeys9().forEach(function (key) { pDel[key] = 1; delete pSet[key]; delete mem[key]; dirty = true; });
    kick();
  };
  P.key = function (i) {
    if (!isLS(this)) return oKey.call(this, i);
    var ks = legacyMemoryKeys9(); i = +i;
    return (i >= 0 && i < ks.length) ? ks[i] : null;
  };
  try {
    Object.defineProperty(P, "length", {
      configurable: true,
      get: function () {
        return isLS(this) ? legacyMemoryKeys9().length : (oLen && oLen.get ? oLen.get.call(this) : 0);
      }
    });
  } catch (eL) {}

  /* ── حالة الاتصال تُبلَّغ لمؤشر القائمة الجانبية (BassamLink) لا لإشعارٍ عابر ── */
  /* KIVO_254 (تصحيح — اكتُشف في بوابة 254): ردٌّ كان في الطريق لحظةَ الانقطاع قد ينجح بعد حدث offline فيقلب المؤشرَ «متصلاً» واللافتةَ «عاد الاتصال»
     والمتصفحُ بلا شبكة (ثم يعود «منقطعاً» عند أوّل طلب) — لا «متصل» ما دام navigator.onLine = false؛ حدثُ online وحده يعيده */
  function link9(state, extra) { try { if (state === "on" && typeof navigator !== "undefined" && navigator.onLine === false) return; if (KIVO.BassamLink) KIVO.BassamLink.set(state, extra); } catch (e) { /* المؤشرُ عرضٌ فقط */ } }
  if (!ANON9) link9("on", "");
  /* عدد المتصلين الآن — لمدير النظام مع دورة السحب */
  var presN9 = "";
  function presence9() {
    try {
      if (ANON9) return;
      var sup = KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper(); if (!sup) return;
      fetch("/api/presence?count=1").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (!j) return; var n = j.active || 0;
        presN9 = n === 1 ? "متصل واحد الآن" : n === 2 ? "متصلان الآن" : (n + " متصلون الآن");
        if (KIVO.BassamLink && KIVO.BassamLink.get() === "on") link9("on", presN9);
      }).catch(function () {});
    } catch (e) {}
  }
  window.addEventListener("load", function () { setTimeout(presence9, 1500); });

  /* ── KIVO_253 (SOT-157 · حالةُ «بلا اتصال»): انقطاعُ الإنترنت يُبلَّغ لمؤشر الاتصال لحظةَ وقوعه (قبل أن يفشل أول حفظ)،
     وعودتُه تُطلق الطابورَ المؤجَّل فوراً بدل انتظار دورة إعادة المحاولة. لا تُعطَّل الأزرار: التعديلاتُ تبقى في ذاكرة الصفحة وتُرسل عند العودة. ── */
  if (!ANON9) (function () {
    var net9 = !(typeof navigator !== "undefined" && navigator.onLine === false);
    function down9() { if (!net9) return; net9 = false; link9("off", "لا اتصال — تُحفظ تعديلاتك عند العودة"); }
    function up9() {
      if (net9) return; net9 = true; fails = 0;
      if (retryT) { clearTimeout(retryT); retryT = null; }
      if (dirty && !inflight) sendNow(); else link9("on", presN9);
      setTimeout(presence9, 800);
    }
    window.addEventListener("offline", down9); window.addEventListener("online", up9);
    if (!net9) down9();
  })();

  /* The changes cursor advances only after the whole returned change set is
     applied. A save ACK or subset read cannot skip another resource's update. */
  if (!ANON9) (function () {
    var busy9 = false;
    /* سحب المفاتيح المتغيّرة وتطبيقها في الذاكرة — الشاشات المستمعة تتحدّث فوراً */
    /* مفتاحٌ مشغول: معلّقٌ في الطابور أو في الهواء (لقطةٌ أُرسلت ولم يُجَب عنها) — لا يُطبَّق له جلبٌ ولا يُرفَع رقمُ نسخته،
       وإلا صار أساسُ الدمج الثلاثيّ عند التعارض هو نسخةَ الزميل نفسَها فتُعدّ نسختي القديمةُ إضافاتٍ (يعود المحذوفُ ويُستبدَل تعديلُه) */
    function busyKey9(k) { return (k in pSet) || (k in pDel) || !!(inflight && ((k in inflight.set) || (k in inflight.del))); }
    /* KIVO_264 · D-1: كان السحبُ يقتطع أولَ 80 مفتاحاً (وسقفُ /api/get 80) ثم يرفع BOOT.v إلى أحدث مراجعة — فالمفتاحُ الحادي والثمانون
       وما بعده لا يصل التبويبَ المفتوح أبداً (استعادةٌ · استيراد · تبويبٌ مخفيٌّ ساعات · مديرُ نظامٍ على 15 إدارة). الآن: دفعاتٌ ≤ 80 متتابعة،
       والمؤشّر لا يتقدّم إلا بعد آخر دفعة؛ وجوابُ /api/changes المبتور عند سقف الخادم (more: 1 · العقد C2) يُتبَع فوراً من آخر مراجعةٍ
       وصلت حتى يكتمل (بسقف 50 دورة). */
    var GET_MAX9 = 80, MORE_MAX9 = 50;
    function apply9(want, got, evict, changed, us, ps) {
      for (var i = 0; i < want.length; i++) {
        var k = want[i], it = got[k];   /* evict: ما لا يراه الخادمُ لهذا المستخدم أصلاً (ليس في /api/changes?since=0) — غيابُه في الجواب يعني سحبَه */
        if (relationalKey9(k) || invalidScope9(k)) continue;
        /* سباق: طُلب المفتاح ثم حفظته هذه الشاشة قبل وصول الجواب — فالجواب أقدم من نسختها.
           كان يُطبَّق فيرتدّ المفتاح إلى قيمة قديمة وينزل رقمُ نسخته، فيتعارض الحفظُ التالي
           «مع زميل» هو المستخدم نفسه. القديم والمشغول يُتجاهلان، ورقم النسخة لا ينزل أبداً. */
        if (busyKey9(k)) continue;
        if (!it) { if (evict && evict[k] && (k in mem)) { delete mem[k]; delete baseVal[k]; delete krev[k]; delete mine9[k]; changed.push(k); notify(k); } continue; }   /* لم يعد يُرى */
        var rv = it.rev || 0;
        if (rv && krev[k] && rv < krev[k]) continue;
        if (own9[k] && (!rv || rv <= own9[k])) delete mine9[k];   /* V7 · د6 (QA) · البند ٥: قيمةٌ كتبها مسارُ خادمٍ بطلبي — ليست كاتباً آخر */
        /* KIVO_264 · المراجعة (A3a): قيمةٌ من غيري تحلّ محلّ ما حفظتُه قريباً ⇒ هل بقي تعديلي فيها؟ */
        if (it.v == null) { if (k in mem) { overCheck9(k, null); delete mem[k]; delete baseVal[k]; changed.push(k); notify(k); } }
        else if (mem[k] !== String(it.v)) { overCheck9(k, String(it.v)); mem[k] = String(it.v); baseVal[k] = mem[k]; changed.push(k); notify(k); }
        if (rv >= (krev[k] || 0)) krev[k] = rv;
        if (k === KU9 && it.v != null && typeof us === "string") uscope9 = us;
        if (k === KP9 && it.v != null && typeof ps === "string") pscope9 = ps;   /* مراجعةُ التكامل W1-R1: القائمةُ في الذاكرة الآن إسقاطُ هذه العدسة (والمشغولُ لا يصل هنا) */
      }
    }
    /* جلبُ قائمة مفاتيح بدفعاتٍ ≤ 80 — يعيد ما تغيّر فعلاً؛ وأيُّ دفعةٍ تخفق ترفض الكلّ (فلا يتقدّم مؤشّرٌ على نقص) */
    function getAll9(keys, evict) {
      var want = keys.filter(function (k) { return !relationalKey9(k) && !operationResource9(k) && !invalidScope9(k) && !busyKey9(k); }), changed = [];
      var step = function (i) {
        if (i >= want.length) { overFlush9(null); return changed; }
        var part = want.slice(i, i + GET_MAX9);
        return fetch("/api/get?keys=" + encodeURIComponent(part.join(",")))
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) {
            if (!j || !j.keys || sx9) throw new Error("get");
            apply9(part, j.keys, evict, changed, j.uscope, j.pscope);
            return step(i + GET_MAX9);
          });
      };
      return Promise.resolve(0).then(function () { return step(0); });
    }
    function pull9(keys, v) {
      var stamp = operationContext9(), logicalOperationKeys = keys.filter(operationKey9), operationKeys = logicalOperationKeys.filter(function (key) {
        return stamp && key.split(':')[1] === stamp.dept;
      }), irKeys = keys.filter(function (key) {
        return /^(?:bsdept:[^:]+:)?bassam_(?:@@SYS:store.pull.systemKeys|sep="|"@@)_v[12]$/.test(key);
      });
      // Keep the cursor behind a queued/uncertain command. The normal polling
      // backoff retries after that exact ticket is settled; never rebase it.
      if (operationKeys.some(function (key) { return busyKey9(key) || !!(operationActive9 && operationActive9.keys.some(function (k) { return k === key || k.indexOf(key + '@') === 0; })); }))   /* V7 · 53: وفتراتُه */
        return Promise.reject(Error('operations-sync-pending'));
      // Do not render a transient empty value between invalidation and ACK.
      // A failed read still publishes its normal fail-closed error state.
      var priorRev9 = Object.create(null); operationKeys.forEach(function (key) { priorRev9[key] = krev[key]; });
      /* صدى حفظي أنا: مراجعةُ المفتاح هي النسخةُ العامة لحظةَ كتابته، فمفتاحٌ مراجعتُه عندي ≥ نسخةِ هذا الإشعار (v) لا جديدَ له في الخادم.
         يُقرأ مع غيره كما كان، لكن **في مكانه** بلا إسقاطٍ مسبق (كانت نافذةُ قراءته تردّ الحفظَ التالي بـ«تغيّرت نسخة البيانات»)؛
         وإن فشلت القراءةُ أُسقط كما كان يُسقط — فالنتيجةُ عند الفشل والمنع واحدة. ما عداه يُسقط قبل القراءة كما كان. */
      var echoKeys9 = operationKeys.filter(function (key) {
        var known = operationKnown9[key];
        if (periodLogical9(key)) return periodEcho9(key, v);   /* V7 · 53 */
        return !!(known && known.stamp && operationSame9(known.stamp) && ['ready', 'absent'].includes(known.state) && known.epoch === operationEpoch9 && operationInteger9(known.rev) && operationInteger9(v) && known.rev >= v);
      });
      var dropKeys9 = operationKeys.filter(function (key) { return echoKeys9.indexOf(key) === -1; });
      if (dropKeys9.length) operationInvalidate9(dropKeys9, true);
      return Promise.all([getAll9(keys, null), operationKeys.length ? operationRead9(operationKeys) : { ok: 1 }]).then(function (result) {
        if ((!result[1] || result[1].ok !== 1) && echoKeys9.length && !(result[1] && result[1].err === 'stale')) operationInvalidate9(echoKeys9, true);
        if (!result[1] || result[1].ok !== 1) throw Error('operations-sync-read');
        BOOT.v = v; irKeys.forEach(notify);
        return { changed: Array.from(new Set(result[0].concat(irKeys, logicalOperationKeys))), confirmed: operationKeys,
          foreign: operationKeys.filter(function (key) { return priorRev9[key] !== undefined && krev[key] !== priorRev9[key]; }) };
      });
    }

    /* ═══ KIVO_264 · D-4: مجموعةُ القراءة تتبع الصلاحيات بلا إعادة تحميل ═══
       /api/changes لا يبلّغ إلا عمّا تغيّرت مراجعتُه: منحُ صفحةٍ لا يغيّر مراجعةَ بياناتها فلا تصل (صفحةٌ فارغة حتى التحديث اليدوي)،
       وسحبُها لا يُخرج بياناتها من الذاكرة (تبقى معروضةً بعد أن صار الخادمُ لا يقدّمها). فإذا تغيّر ما يحكم القراءة — الصلاحيات ·
       الإدارات · الهيكل · المنصة · نطاقُ الإدارة ومنحُها، أو سجلُّ حسابي أنا، أو وصفُ صلاحياتي في الإنفاذ — يُسأل الخادم عمّا يراه
       هذا المستخدم الآن (/api/changes?since=0: أسماءٌ بلا قيم) ثم يُجلب ما صار مقروءاً ويُزال ما لم يعد مقروءاً (حكمُ /api/get نفسِه)،
       وفي الإنفاذ تُجدَّد كذلك الموارد المُسقَطة بالنطاق؛ ثم تُبلَّغ الشاشات (bassam:remote). */
    /* KIVO_264 · المراجعة (A7): كان أيُّ تغييرٍ في الصلاحيات أو الإدارات أو الهيكل أو المنصة يدفع كلَّ تبويبٍ متصل إلى إعادة سرد كلّ ما يراه
       (/api/changes?since=0 حتى 50 صفحة) — ولو كان التغييرُ لموظفٍ في إدارةٍ أخرى. الآن يُقارن «نصيبي» منها قبل السحب وبعده، ولا يُعاد السردُ
       إلا إن تغيّر: سجلُّ حسابي (الدور · الإدارة · العقدة · الرقم · الإدارة المُدارة · التجميد) · إداراتُ نطاقي وسلسلةُ أسلافها · سقوفُها وفروعُها
       وعدساتُها · ورقتي فيها · الوحداتُ المطفأة. مديرُ النظام يقرأ كلَّ شيءٍ فنصيبُه ثابت. والنطاقُ والمنحُ في الإنفاذ يحكمها وصفُ صلاحياتي
       (authzSync9 · az) لا هذا المفتاح. PROJ9 نسخةٌ من ENF_PROJ في الخادم (061-enf-read.js) — يُضاف إليها موردُ أيِّ نظامٍ يُسقطه الخادم بقطعته (store.proj). */
    var SLICEK9 = /^bassam_(perms|auth_users|depts|gdepts|platform)_v1$/;
    var PROJ9 = { @@SYS:store.proj.staff@@@@SYS:store.proj.dreport@@@@SYS:store.proj.plan@@@@SYS:store.proj.daily@@ };
    function pj9(k, dflt) { try { var v = JSON.parse(mem[k] || "null"); return v == null ? dflt : v; } catch (e) { return dflt; } }   /* قيمةٌ تالفة ⇒ الافتراض */
    function slice9() {
      var U = pj9("bassam_auth_users_v1", []), me = null, i;
      if (Array.isArray(U)) for (i = 0; i < U.length; i++) if (U[i] && U[i].id === UID9) { me = U[i]; break; }
      if (!me) return "?" + (++sliceN9);              /* هويتي غيرُ معروفة هنا ⇒ احتياطاً: كلُّ تغييرٍ يُعيد السرد (السلوكُ السابق) */
      if (me.role === "super") return "super" + (me.dis ? ":dis" : "");
      var D = pj9("bassam_depts_v1", []), N = pj9("bassam_gdepts_v1", []), P = pj9("bassam_perms_v1", {}), pl = pj9("bassam_platform_v1", {}), up = Object.create(null);
      if (Array.isArray(D)) D.forEach(function (x) { if (x && x.id) up["d:" + x.id] = x.gid || ""; });
      if (Array.isArray(N)) N.forEach(function (x) { if (x && x.id) up["n:" + x.id] = x.pid || ""; });
      var chain = function (d) { var out = [], seen = Object.create(null), c = up["d:" + d] || ""; while (c && !seen[c] && out.length < 64) { seen[c] = 1; out.push(c); c = up["n:" + c] || ""; } return out; };
      var ds = me.role === "gm" ? (Array.isArray(D) ? D.map(function (x) { return x && x.id; }).filter(function (d) { return d && me.gid && chain(d).indexOf(me.gid) !== -1; }) : []) : (me.deptId ? [me.deptId] : []);
      var g = function (o, a, b) { var v = o && typeof o === "object" ? o[a] : undefined; if (b !== undefined) v = v && typeof v === "object" ? v[b] : undefined; return v === undefined ? null : v; };
      P = P && typeof P === "object" ? P : {};
      return JSON.stringify([me.role, me.deptId || "", me.gid || "", me.ekey || "", me.mgr === undefined ? null : me.mgr, !!me.dis, g(g(pl, "mods"), "off"), ds.map(function (d) {
        var ch = chain(d);
        return [d, ch, g(P.caps, d), ch.map(function (a) { return g(P.caps, a); }), g(P.subs, d), g(P.emps, d, me.ekey || ""), g(P.lenses, d), g(P.empLens, d, me.ekey || "")];
      })]);
    }
    var sliceN9 = 0, slice0 = slice9();              /* نصيبي كما بُنيت عليه الصفحة */
    var rsT9 = null, rsBusy9 = false, rsAgain9 = false, rsProj9 = false, rsWait9 = [], rsActiveWait9 = [];
    function readSet9(proj) {
      if (proj) rsProj9 = true;
      if (sx9 || bye9) return Promise.resolve({ ok: 0, err: 'session' });
      var promise = new Promise(function (resolve) { rsWait9.push(resolve); });
      if (rsBusy9) { rsAgain9 = true; return promise; }
      clearTimeout(rsT9); rsT9 = setTimeout(rsRun9, 400);
      return promise;
    }
    readSetHook9 = readSet9;
    function seen9() {
      var S = Object.create(null), pages = 0;
      var ask = function (since) {
        return fetch("/api/changes?since=" + since).then(function (r) { if (r.status === 401) { sessGone9(); return null; } return r.ok ? r.json() : null; }).then(function (j) {
          if (!j || !Array.isArray(j.keys)) throw new Error("seen");
          for (var i = 0; i < j.keys.length; i++) S[j.keys[i]] = 1;
          if (j.more) { if (++pages >= MORE_MAX9 || !(j.v > since)) throw new Error("seen-more"); return ask(j.v); }
          return S;
        });
      };
      return ask(0);
    }
    function rsDone9(changed, ok) {
      rsBusy9 = false;
      var waiters = rsActiveWait9; rsActiveWait9 = [];
      waiters.forEach(function (resolve) { resolve({ ok: ok ? 1 : 0, changed: changed || [] }); });
      if (changed && changed.length) { try { window.dispatchEvent(new CustomEvent("bassam:remote", { detail: { keys: changed, v: BOOT.v } })); } catch (e) { /* إبلاغٌ للشاشات فقط */ } }
      if (rsAgain9 || rsWait9.length) { rsAgain9 = false; clearTimeout(rsT9); rsT9 = setTimeout(rsRun9, 400); }
    }
    function rsRun9() {
      if (sx9 || bye9) { var stopped = rsWait9; rsWait9 = []; stopped.forEach(function (resolve) { resolve({ ok: 0, err: 'session' }); }); return; }
      rsActiveWait9 = rsWait9; rsWait9 = [];
      rsBusy9 = true; var proj = rsProj9 && !!KIVO.__BS_AUTHZ; rsProj9 = false;
      seen9().then(function (S) {
        var cand = [], k;
        var drop = Object.create(null);
        for (k in mem) if (TEAMK9.test(k) && !devKey9(k)) { if (!S[k]) { cand.push(k); drop[k] = 1; } else if (proj && PROJ9[unscoped(k)]) cand.push(k); }
        for (k in S) if (!(k in mem)) cand.push(k);
        /* مراجعةُ التكامل W1-R1: تغيّر نصيبي (الإدارات · الهيكل · الصلاحيات) يغيّر عدسةَ قائمة الحسابات المُسقَطة ومراجعتُها لم تتغيّر — تُجدَّد معه
           (ما صار يُرى يظهر بلا إعادة تحميل · والحفظُ يمضي بلا تعارض). مديرُ النظام بلا إسقاطٍ (uscope9 فارغ) فلا تُعاد قائمتُه الكاملة */
        if (uscope9 && S[KU9] && (KU9 in mem) && cand.indexOf(KU9) < 0) cand.push(KU9);
        var current = operationContext9();
        var operationKeys = current ? Object.keys(operationKnown9).filter(function (key) { return key.split(':')[1] === current.dept; }) : [];
        return Promise.all([cand.length ? getAll9(cand, drop) : [], operationKeys.length ? operationRead9(operationKeys) : { ok: 1 }]).then(function (result) {
          if (!result[1] || result[1].ok !== 1) throw Error('operations-resync-read');
          return result[0];
        });
      }).then(function (changed) { rsDone9(changed, true); }, function () { rsDone9(null, false); });
    }
    /* مستمع دائم: طلب ينتظر عند الخادم حتى يقع تغيير، ثم يُفتح غيره فوراً — فتصل تعديلات الزملاء خلال ثانية.
       عند فشل الشبكة يُعاد بتباطؤ متدرّج، وعند إخفاء التبويب يتوقف ويستأنف عند العودة. */
    var backoff9 = 0, loopT9 = null;
    /* KIVO_243: تبدّلُ وضع الصلاحيات في الخادم (مفتاحُ الطوارئ) ⇒ تُحفظ التعديلات ثم يُعاد تحميل الصفحة (البياناتُ المحمّلة بُنيت على الوضع السابق)؛
       وتغيّرُ الصلاحيات/المنح/النطاق ⇒ تُجدَّد المفاتيحُ المحمولة بصمت وتُعاد رسمُ الشاشات */
    var azBusy9 = false, azReload9 = false;
    function authzSync9(j) {
      var cur = KIVO.__BS_AUTHZ ? "enforce" : "legacy";
      if (j.am !== undefined && j.am !== cur) {
        if (azReload9) return;
        /* إعادةُ تحميلٍ واحدة في الدقيقة على الأكثر — لا حلقةَ إعادة لو تعذّر حقنُ المفاتيح بعد التحميل؛ والدورةُ التالية تعيد المحاولة */
        try { var last9 = +(sessionStorage.getItem("bs_az_reload") || 0); if (Date.now() - last9 < 60000) return; sessionStorage.setItem("bs_az_reload", String(Date.now())); } catch (eS9) {}
        azReload9 = true;
        bsToast("تغيّر وضعُ الصلاحيات — تُحفظ تعديلاتك ثم يُعاد تحميل الصفحة");
        setTimeout(function () { flushAsync(6000).then(function () { location.reload(); }, function () { location.reload(); }); }, 2500);
        return;
      }
      if (!j.az || !KIVO.__BS_AUTHZ || azBusy9) return;
      azBusy9 = true;
      fetch("/api/authz").then(function (r) { return r.ok ? r.json() : null; }).then(function (z) {
        azBusy9 = false;
        if (!z || z.mode !== "enforce" || !z.me) return;
        var was9 = KIVO.__BS_AUTHZ, same9 = false;
        try { same9 = JSON.stringify(was9) === JSON.stringify(z.me); } catch (e) { /* مقارنةٌ فقط */ }
        KIVO.__BS_AUTHZ = z.me;
        /* إشارةُ az تصل عند أي تغييرٍ في الحسابات/الهيكل/المنصة من أي مستخدم؛ إن لم يتغيّر وصفُ صلاحياتي فلا شيء يُعاد ولا يُبلَّغ */
        if (same9) {
          liveLog9('az-unchanged', 'إشارةُ صلاحياتٍ بلا تغييرٍ في وصفي — لا إسقاط');
          /* الرسمُ الخفيف الذي كان يتبع كلَّ إشارة يبقى (قوائمُ الحسابات والهيكل تتحدّث به) — بلا إسقاطٍ ولا رسالة «تحدّثت صلاحياتك» */
          try { window.dispatchEvent(new CustomEvent("bassam:remote", { detail: { keys: ["bassam_perms_v1"], v: BOOT.v, azSame: true } })); } catch (e) {}
          return;
        }
        try { window.dispatchEvent(new CustomEvent("bassam:authz", { detail: z.me })); } catch (e) {}
        try { window.dispatchEvent(new CustomEvent("bassam:remote", { detail: { keys: ["bassam_perms_v1"], v: BOOT.v } })); } catch (e) {}
        liveLog9('az-changed', 'تغيّر وصفُ صلاحياتي — تُعاد قراءةُ مفاتيحي والصفحةُ معروضة');
        readSet9(true);   /* KIVO_264 · D-4: تغيّر وصفُ صلاحياتي ⇒ تُجدَّد بياناتي */
      }).catch(function () { azBusy9 = false; });
    }
    function look9() {
      if (busy9 || document.hidden || sx9) return;
      busy9 = true;
      var t0 = Date.now(), pages = 0;
      var ask = function (wait) {
        var since = BOOT.v || 0, meStamp = operationContext9(), meUser = KIVO.BassamAuth && KIVO.BassamAuth.user && KIVO.BassamAuth.user();
        var meIdentity = meUser ? [meUser.id, meUser.role, meUser.deptId || '', meUser.ekey || ''] : null;
        return fetch("/api/changes?since=" + since + (wait ? "&wait=1" : "") + "&uid=" + encodeURIComponent(UID9))
          .then(function (r) {
            if (r.status === 401) { sessGone9(); return null; }
            if (r.status === 409) return r.json().catch(function () { return null; }).then(function (data) {
              if (data && data.err === 'session-changed') sesChanged9(null, '409');
              return null;
            });
            return r.ok ? r.json() : null;
          })
          .then(function (j) {
            if (!j) throw new Error("no");
            backoff9 = 0; warn(false);
            try { if (j.am !== undefined || j.az) authzSync9(j); } catch (eA9) {}   /* KIVO_243: الخادمُ في بيئة الإنفاذ وحده يرسل am/az */
            if (!(j.v != null && j.v > since)) return;
            var ks = j.keys || [];
            periodPk9 = Array.isArray(j.pk) ? j.pk : null;   /* V7 · 53: فتراتُ ما تغيّر */
            return pull9(ks, j.v).then(function (result) {
              var meNow = KIVO.BassamAuth && KIVO.BassamAuth.user && KIVO.BassamAuth.user(), meContext = operationContext9();
              if ((j.meChanged === 1@@SYS:store.changed.tasks.cond@@) && meStamp && meContext && meContext.uid === meStamp.uid && meContext.dept === meStamp.dept && meNow && meIdentity &&
                  JSON.stringify([meNow.id, meNow.role, meNow.deptId || '', meNow.ekey || '']) === JSON.stringify(meIdentity)) {
                var privateDetail = { uid: UID9, dept: meIdentity[2], ekey: meIdentity[3], v: j.v };
                if (j.meChanged === 1) try { window.dispatchEvent(new CustomEvent('bassam:me', { detail: privateDetail })); } catch (eM) {}
@@SYS:store.changed.tasks.event@@              }
              if (result.changed.length) { try { operationDispatchRemote9(ks, j.v, result.confirmed, result.foreign); } catch (e) { /* إبلاغٌ للشاشات فقط */ } }
              if (ks.some(function (k) { return SLICEK9.test(k); })) { var s9 = slice9(); if (s9 !== slice0) { slice0 = s9; readSet9(false); } }
              if (j.more && BOOT.v === j.v && ++pages < MORE_MAX9 && !sx9) return ask(false);   /* C2: البقيةُ فوراً من آخر مراجعةٍ وصلت */
            });
          });
      };
      try {
        ask(true)
          .catch(function () { backoff9 = Math.min(10000, (backoff9 || 1000) * 2); })
          .then(function () {
            busy9 = false;
            if (sx9) return;
            /* يُعاد فوراً بعد جواب طبيعي؛ وبعد فشل يُنتظر؛ وإن رجع الخادم بسرعة غير طبيعية يُخفَّف الإيقاع */
            var quick = Date.now() - t0 < 800;
            clearTimeout(loopT9); loopT9 = setTimeout(look9, backoff9 ? backoff9 : (quick ? 1500 : 250));
          });
      } catch (e9) { busy9 = false; clearTimeout(loopT9); loopT9 = setTimeout(look9, 3000); }
    }
    setTimeout(look9, 1200);
    setInterval(presence9, 25000);
    try { document.addEventListener("visibilitychange", function () { if (!document.hidden) { clearTimeout(loopT9); setTimeout(look9, 300); } }); } catch (e9) {}
  })();

  /* KIVO_264 · D-3 (دفاعٌ في العمق بلا خادم): علامةُ الجلسة على الجهاز كتبها تبويبٌ آخر لحسابٍ غير حساب هذه الصفحة (خروجٌ ثم دخولٌ
     في المتصفح نفسِه) ⇒ الطابورُ يُعزل قبل أيّ إرسال، فلا يصل تعديلُ هذه الصفحة باسم الحساب الجديد ولو كان الخادمُ لا يعرف العقد C1 */
  if (!ANON9 && UID9) window.addEventListener("storage", function (e) {
    try {
      if (!e || e.key !== "bassam_session_v1" || sx9 || bye9) return;
      var s = JSON.parse(oGet.call(window.localStorage, "bassam_session_v1") || "null");
      if (s && s.uid && String(s.uid) !== UID9) sesChanged9(null, "switched");
    } catch (eX) { /* علامةٌ تالفة — لا حكمَ عليها */ }
  });

  KIVO.__BS_SRV = {
    dirty: function () { return dirty || !!operationActive9; },
    denied: function (k) { return k == null ? deniedN9 : (deniedK9[k] || 0); },   /* KIVO_264 (المراجعة R2): denied(k) لمفتاحٍ بعينه */
    fails: function () { return fails; },
    flush: function () { return flushAsync(); },
    flushAsync: flushAsync,
    inflight: function () { return !!inflight; },
    count: function () { return legacyMemoryKeys9().length; },
    rev: function (k) { return krev[k] || 0; },
    merge3: merge3,
    /* KIVO_243: سببٌ آليّ لكتابةٍ تجريها الواجهةُ بنفسها (مثل تنقية الحالات القديمة) — في وضع الإنفاذ وحده */
    why: function (k, text) { if (KIVO.__BS_AUTHZ && k && text) why9[String(k)] = String(text).slice(0, 300); },
    /* V7 · 53 (noreason): للتوافق — كلُّ حسابٍ معفًى، فلا نافذةَ سبب في أيّ صفحة */
    reasonExempt: exempt9,
    /* V7 · د6 (QA) · البند ٥: إيصالُ مسار خادمٍ بطلب المستخدم ⇒ مفاتيحُه «من فعلي» (revs: { مفتاح: مراجعة }) */
    mine: srvMine9,
    /* V7 · 53 (noreason): للتوافق — reasonFirst يمضي فوراً { go:true } بلا نافذة · reasonRule بلا أثر (لا تنبّؤَ بسبب) */
    reasonFirst: reasonFirst9,
    reasonRule: function () {},
    /* يُفرغ ما في الطابور ثم يغلق الباب — قبل إنهاء الجلسة. الوعدُ يُنتظر. */
    bye: function () { var p = flushAsync(5000); bye9 = true; try { imcClear9(); } catch (e) {} return p; },
    /* R169: للاختبار والتشخيص — أحداثُ ما في الطابور الآن */
    audPreview: function () { return audEvents9(pSet); },
    /* KIVO_264 · D-3: تبدّلت الجلسةُ في هذا المتصفح؟ وما عُزل من تعديلاتٍ لم تُرسل (أسماءُ المفاتيح وحدها) */
    sesChanged: function () { return sx9; },
    orphaned: function () { return orphan9 ? { set: Object.keys(orphan9.set), del: Object.keys(orphan9.del) } : null; },
    /* KIVO_264 · D-4: إعادةُ مزامنة ما يقرؤه هذا المستخدم الآن (بعد تغيّر صلاحياته) — بلا إعادة تحميل */
    resync: function (proj) { return readSetHook9 ? readSetHook9(!!proj) : Promise.resolve({ ok: 0, err: 'read-unavailable' }); },
    operations: Object.freeze({
      resources: operationResources9,
      device: devKey9,   /* V7 · د5-ح: مفتاحُ جهازٍ لا يُطلب من الخادم (030 pageData) — بدل أن تعرف القاعدةُ مفاتيحَ الأنظمة */
      context: operationContext9,
      departmentContext: operationDepartmentContext9,
      snapshot: function () { return operationSnapshot9 && operationSame9(operationSnapshot9) ? operationClone9(operationSnapshot9) : null; },
      read: operationRead9,
      value: operationValue9,
      reference: operationReference9,
      key: operationScoped9,
      get: function (name) { return operationValue9(operationScoped9(name)); },
      /* V7 · 53 (S2 في العميل): النصُّ المخزَّن نفسُه — كان يُفكّ ثم يُرمَّز في كل نداء (الصفحاتُ تسأل عنه لكل موظفٍ وعنصر: 16 ث من 20 في فتح الخطة بـ500 موظف).
         mem يحمل دائماً ناتجَ JSON.stringify، فهو هو JSON.stringify(JSON.parse(mem)) حرفاً؛ والفحوصُ فحوصُ value نفسُها */
      text: function (name) { var key = operationScoped9(name); return operationText9(key); },
      state: function (name) { var key = operationScoped9(name), known = operationKnown9[key]; if (KIVO.__bsReadHook) KIVO.__bsReadHook(key); return known && known.stamp && operationSame9(known.stamp) ? known.state : 'unloaded'; },
      draft: operationDraft9,
      begin: operationBegin9,
      commit: operationCommit9,
      patch: operationPatch9,
      removal: operationRemoval9,
      merge: operationMerge9,
      stage: operationStage9,
      flush: function (ticket) { return operationFlush9(ticket, false); },
      retry: function (ticket) { return operationFlush9(ticket, true); },
      release: operationRelease9,
      status: operationStatus9,
      explain: function (result) {
        var details = result && result.details, denied = details && details.denied, conflicts = details && details.conflicts;
        var parts = operationObject9(denied) ? Object.keys(denied).map(function (key) {
          var value = denied[key];
          /* V7 · 53 (قرار المالك ٨): رفضُ الشهر المقفل يُقال بحسب قارئه — مديرُ الإدارة يفتحه للاستدراك، والموظفُ يراجع مديرَ الإدارة */
          if (operationObject9(value) && value.why === 'scope' && /locked-period: (month|day)-/.test(String(value.detail || ''))) return monthLockedText9(/locked-period: day-/.test(String(value.detail || '')));
          return operationObject9(value) && typeof value.why === 'string' ? whyText9(value.why) : '';
        }) : [];
        if (operationObject9(conflicts) && Object.keys(conflicts).length) parts.push(OPERATION_CONFLICT9);
        return Array.from(new Set(parts.filter(Boolean))).join(' · ');
      },
      ready: operationReady9,
      invalidate: operationInvalidate9,
      /* V7 · 53: التخزين بالفترة — split(اسم) · want(اسم, {groups, periods}) · loaded(اسم) · period(اسم, فترة) · summary(اسم, {groups} | {from, to}) */
      split: periodName9,
      want: periodWant9Read,
      loaded: function (name) { var K = operationScoped9(name); return { groups: Object.keys(periodGroups9[K] || {}), periods: periodLoaded9(K) }; },
      period: function (name, p) {
        var K = operationScoped9(name), known = operationKnown9[K + '@' + p];
        if (!known || !known.stamp || !operationSame9(known.stamp)) return undefined;
        return known.state === 'ready' ? JSON.parse(mem[K + '@' + p]) : known.state === 'absent' ? null : undefined;
      },
      summary: periodSummary9,
      index: periodIndex9,
      wantPage: periodWantPage9
    })
  };
})();
