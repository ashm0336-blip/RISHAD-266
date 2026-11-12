/* ═══ KIVO_242 · المرحلة ٢ — حارسُ جلب الصفحات ═══
   dc-runtime يجلب ملفَّ الصفحة مرةً واحدة (ensureFetched) ولا يعيد المحاولة: إن تعثّر الجلبُ بقيت الوحدةُ فارغةً حتى إعادة التحميل.
   هنا — دون مسّ dc-runtime — يُراقَب جلبُ ملفات الصفحات وحدها (عناوينُها في window.__resources):
   · ردٌّ غيرُ ناجح أو خطأُ شبكة ⇒ تُعاد المحاولة حتى ٣ مرات (بعد ١ ثم ٢ ثم ٤ ثوانٍ) بإرجاع علامة «جُلبت» وإيقاظ الوحدة،
     وتتخطّى الإعادةُ ذاكرةَ المتصفح (cache: reload) كي لا يُعاد ردُّ ٤٠٤ مخزَّن
   · بعد المحاولات الثلاث: عند عودة الاتصال (online) تُعاد الدورةُ كاملة؛ وكل ٣٠ ثانية تُعاد محاولةٌ واحدة للوحدة الظاهرة،
     والوحدةُ غيرُ الظاهرة تُجلب عند فتحها التالي — فلا تبقى فارغةً حتى إعادة التحميل، ولا طلبَ متكرراً بلا حاجة
   · ردٌّ نوعُه HTML (وثيقةُ الغلاف من تراجع SPA إن غاب 404.html) يُعامَل فشلاً — فلا يُركَّب الغلافُ داخل الصفحة
   · كلُّ طلبٍ سوى ملفات الصفحات يمرّ كما هو حرفاً (الوعدُ نفسُه). */
(function () {
  var map = window.__resources || {}, byUrl = {}, tries = {}, bad = {}, gaveUp = {}, sweeper = null;
  for (var k in map) if (/^\.\/.+\.dc\.html$/.test(k)) byUrl[map[k]] = decodeURIComponent(k.slice(2, k.length - 8));
  var ofetch = window.fetch;
  if (typeof ofetch !== "function") return;
  function entry(name) {
    var r = window.__dcRegistry && window.__dcRegistry[name];
    return r && ((!r.html && !r.Logic) || r.dataError) ? r : null;
  }
  function wake(name) {
    try { var r = entry(name); if (r) { r.dataError = null; r.fetched = false; r.ver++; r.subs.forEach(function (fn) { fn(); }); } } catch (e) {}
  }
  function sweep() {
    var names = Object.keys(gaveUp);
    gaveUp = {};
    names.forEach(function (name) {
      var r = entry(name);
      if (!r) return;
      tries[name] = 3;                                   // محاولةٌ واحدة في كل دورة (إن تعثّرت عادت إلى القائمة)
      if (r.subs.size) wake(name);                       // الوحدةُ ظاهرة: الآن
      else r.fetched = false;                            // غيرُ ظاهرة: عند فتحها التالي
    });
    if (!Object.keys(gaveUp).length && sweeper) { clearInterval(sweeper); sweeper = null; }
  }
  /* KIVO_254 · البند ٣ من RM-3: بعد المحاولات الثلاث تُعرض بطاقةٌ داخل مكان الشاشة («تعذّر تحميل الشاشة») بزرّ إعادة محاولةٍ فوري —
     الدورةُ التلقائية (online · كل ٣٠ ث) تبقى كما هي؛ والبطاقةُ تزول عند أول جلبٍ ناجح. */
  var cards = {};
  function cardHost(name) {
    /* الوحدةُ الظاهرة وحدَها (لها مشتركون) تُرسم في مضيف الصفحة داخل main — dc-import يُصرَّف إلى div.sc-host */
    var r = entry(name); if (!r || !r.subs || !r.subs.size) return null;
    return document.querySelector('main.bs-main > .sc-host') || document.querySelector('main > .sc-host') || null;
  }
  /* V7 UX: بطاقةُ فشل التحميل يرسمها مكوّنُ حالات الصفحة الموحَّد داخل مكان الشاشة (KIVO.__dcStates · عبر loadFailed في السجل) —
     وبطاقةُ انتهاء الجلسة تبقى هنا كما كانت (خارج المكوّن). بلا مكوّنٍ مسجَّل يبقى كلُّ شيءٍ كما كان. */
  var failed = {};
  function unified() { return !!(window.KIVO && window.KIVO.__dcStates) && !gone(); }
  function mark(name, on) {
    var r = window.__dcRegistry && window.__dcRegistry[name];
    if (!r || !!r.loadFailed === on) return;
    r.loadFailed = on; if (r.subs) r.subs.forEach(function (fn) { fn(); });
  }
  function showCard(name) {
    try {
      failed[name] = 1;
      if (unified()) { mark(name, true); return; }
      var host = cardHost(name); if (!host || cards[name]) return;
      var c = document.createElement("div"); c.className = "bs-retry bs-retry-page"; c.setAttribute("role", "alert"); c.setAttribute("dir", "rtl");
      cardFill(c, name);
      host.parentNode.insertBefore(c, host); cards[name] = c;
    } catch (e) { /* البطاقةُ عرضٌ فقط */ }
  }
  /* RISHAD-266: بعد انتهاء الجلسة السببُ ليس الاتصال — تقول البطاقةُ ذلك وزرُّها يعيد الدخول */
  function gone() { try { var S = window.KIVO && window.KIVO.__BS_SRV; return !!(S && S.sesChanged && S.sesChanged()); } catch (e) { return false; } }
  function cardFill(c, name) {
    var g = gone();
    /* CORE-01: لغةٌ عادية — والبطاقةُ وحدها سطحُ الخطأ (نصُّ مكان الشاشة يُخفى تحتها بالـCSS) */
    c.innerHTML = g ? '<span class="m">انتهت الجلسة — سجّل الدخول</span><button type="button" class="b">تسجيل الدخول</button>'
      : '<span class="m">تعذّر عرض هذه الشاشة الآن — سنحاول مجددًا تلقائيًا</span><button type="button" class="b">↻ أعد المحاولة</button>';
    c.querySelector("button").addEventListener("click", function () { retry(name); });
  }
  function retry(name) { if (gone()) { location.reload(); return; } hideCard(name); delete gaveUp[name]; tries[name] = 0; wake(name); }
  if (window.KIVO) window.KIVO.__dcRetry = retry;          /* زرُّ «أعد المحاولة» في البطاقة الموحَّدة = زرُّ البطاقة القديمة نفسُه */
  window.addEventListener("bs:session-gone", function () {
    for (var n in cards) { try { cardFill(cards[n], n); } catch (e) { /* عرضٌ فقط */ } }
    for (var f in failed) { try { if (!cards[f]) { mark(f, false); showCard(f); } } catch (e) { /* عرضٌ فقط */ } }   /* البطاقةُ الموحَّدة تتنحّى لبطاقة الجلسة */
  });
  function hideCard(name) { try { delete failed[name]; mark(name, false); if (cards[name]) { cards[name].remove(); delete cards[name]; } } catch (e) { /* عرضٌ فقط */ } }
  window.addEventListener('dc:page-load-failed', function (event) { var name = event.detail && event.detail.name; if (!name) return; showCard(name); gaveUp[name] = 1; if (!sweeper) sweeper = setInterval(sweep, 30000); });   /* CORE-01: قراءةُ البيانات المتعثّرة تُعاد تلقائياً كما تقول البطاقة (كل ٣٠ ث وعند عودة الاتصال) */
  window.addEventListener('dc:page-load-ready', function (event) { var name = event.detail && event.detail.name; if (name) hideCard(name); });
  /* V7 UX: the card belongs to the screen that failed — leaving that screen takes the card with it (re-opening retries) */
  window.addEventListener('hashchange', function () { for (var n in cards) { var r = window.__dcRegistry && window.__dcRegistry[n]; if (!r || !r.subs || !r.subs.size) hideCard(n); } });
  function again(name) {
    var n = tries[name] = (tries[name] || 0) + 1;
    if (n > 3) { gaveUp[name] = 1; showCard(name); if (!sweeper) sweeper = setInterval(sweep, 30000); return; }
    setTimeout(function () { wake(name); }, 1000 * Math.pow(2, n - 1));
  }
  window.addEventListener("online", function () {
    for (var name in gaveUp) { delete gaveUp[name]; tries[name] = 0; wake(name); }
  });
  window.fetch = function (input, init) {
    var u = typeof input === "string" ? input : (input && input.url) || "";
    var name = byUrl[u];
    if (!name) return ofetch.apply(this, arguments);
    var p = bad[name] ? ofetch.call(this, u, { cache: "reload" }) : ofetch.apply(this, arguments);
    return p.then(function (res) {
      if (res.ok && !/text\/html/i.test(res.headers.get("content-type") || "")) { delete bad[name]; tries[name] = 0; hideCard(name); return res; }
      bad[name] = 1; again(name);
      return new Response("", { status: res.ok ? 502 : res.status, statusText: "page asset unavailable" });
    }, function (e) { bad[name] = 1; again(name); throw e; });
  };
})();
