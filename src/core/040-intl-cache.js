
/* ═ ذاكرةُ مُنسِّقات Intl ═
   بناءُ Intl.DateTimeFormat (وخاصةً تقويمَ أمِّ القرى) مكلفٌ، والصفحاتُ تبنيه
   مئاتَ المرات في الرسم الواحد (cuHijri, hToday, hGregMonthLabel …). المُنسِّقُ
   عديمُ الحالة بعد بنائه، فيُشارَك بين النداءات بمفتاحِ (اللغة + الخيارات). */
(function () {
  function memo(Orig, max) {
    var cache = new Map();
    function key(l, o) { try { return JSON.stringify([l === undefined ? null : l, o === undefined ? null : o]); } catch (e) { return null; } }
    var W = function (l, o) {
      var k = key(l, o), c;
      if (k !== null && (c = cache.get(k))) return c;
      var f = new Orig(l, o);
      if (k !== null) { if (cache.size >= max) cache.delete(cache.keys().next().value); cache.set(k, f); }
      return f;
    };
    W.prototype = Orig.prototype;
    try { W.supportedLocalesOf = Orig.supportedLocalesOf.bind(Orig); } catch (e) {}
    try { Object.defineProperty(W, 'name', { value: Orig.name }); } catch (e) {}
    return W;
  }
  try { Intl.DateTimeFormat = memo(Intl.DateTimeFormat, 400); } catch (e) {}
  try { Intl.NumberFormat = memo(Intl.NumberFormat, 200); } catch (e) {}
})();
/* ═ ذاكرةُ toLocaleDateString / toLocaleTimeString / toLocaleString ═
   كلُّ نداءٍ يبني مُنسِّقاً كاملاً داخل المحرّك (لا يمرّ بذاكرة Intl أعلاه)،
   والجداولُ تناديه لكلِّ صفٍّ (fmtClock · fmtStampParts · tkClock …). النتيجةُ
   نصٌّ ثابتٌ لنفس (القيمة + اللغة + الخيارات) فيُحفظ بمفتاحها. */
(function () {
  function memoStr(Proto, name, max) {
    var orig = Proto[name]; if (typeof orig !== 'function') return;
    var cache = new Map();
    Proto[name] = function (l, o) {
      var v = +this, k = null;
      if (isFinite(v) && arguments.length <= 2) { try { k = v + '|' + JSON.stringify([l === undefined ? null : l, o === undefined ? null : o]); } catch (e) { k = null; } }
      if (k !== null) { var c = cache.get(k); if (c !== undefined) return c; }
      var r = orig.apply(this, arguments);
      if (k !== null && typeof r === 'string') { if (cache.size >= max) cache.delete(cache.keys().next().value); cache.set(k, r); }
      return r;
    };
    try { Object.defineProperty(Proto[name], 'name', { value: name }); } catch (e) {}
  }
  try { memoStr(Date.prototype, 'toLocaleDateString', 4000); memoStr(Date.prototype, 'toLocaleTimeString', 4000); memoStr(Date.prototype, 'toLocaleString', 2000); } catch (e) {}
  try { memoStr(Number.prototype, 'toLocaleString', 4000); } catch (e) {}
})();
/* ═ نطاقُ تحليل JSON داخل الرسم الواحد ═
   الصفحةُ تُحلّل النصَّ المخزَّنَ نفسَه (جولاتٌ بميغابايت، تقريرٌ يوميّ…) مراراً
   في الرسم الواحد. داخل نافذة الرسم (يفتحها الرنتايم حول renderVals + القالب)
   يُعاد الكائنُ نفسُه للنصّ نفسِه؛ وتُفرَغ النافذةُ عند انتهاء الرسم وعند أيِّ
   كتابةٍ في المخزن — فلا يعبر كائنٌ من رسمٍ إلى آخر. */
(function () {
  var depth = 0, cache = new Map(), oParse = JSON.parse, MIN = 1024, MAX = 32;
  /* ذاكرةُ قيمةٍ مشتقّةٍ بمفتاح اعتمادياتها: عند الإصابة تُعاد القيمةُ وتُعلَن مفاتيحُ
     المخزن التي قرأتها عند حسابها (فيبقى المكوّنُ مشتركاً في أجيالها) */
  KIVO.__bsMemo = function (store, name, key, compute) {
    var e = store && store.__bsM && store.__bsM[name];
    if (e && e.key === key) { if (KIVO.__bsReadHook) e.reads.forEach(function (k) { KIVO.__bsReadHook(k); }); return e.val; }
    var reads = [], prev = KIVO.__bsReadHook;
    KIVO.__bsReadHook = function (k) { if (reads.indexOf(k) === -1) reads.push(k); if (prev) prev(k); };
    var val;
    try { val = compute(); } finally { KIVO.__bsReadHook = prev; }
    if (store) { if (!store.__bsM) store.__bsM = Object.create(null); store.__bsM[name] = { key: key, val: val, reads: reads }; }
    return val;
  };
  /* تبقى الذاكرةُ بين رسمٍ ورسمٍ (قراءاتُ الرسم وحدها تمرّ بها؛ معالجاتُ الأحداث تُحلّل نسخةً
     طريّةً كما كانت) وتُفرَغ كاملةً عند أيِّ كتابةٍ في المخزن — فلا تعيش قيمةٌ بائدةٌ لحظةً */
  KIVO.__bsParseScope = {
    begin: function () { depth++; },
    end: function () { if (--depth <= 0) depth = 0; },
    clear: function () { cache.clear(); },
    depth: function () { return depth; },
    size: function () { return cache.size; }
  };
  /* نصوصُ المخزن التي قُرئت فعلاً — وحدَها تدخل ذاكرةَ التحليل (لا النُّسَخُ العابرة) */
  var recent = new Set(), RMAX = 96;
  KIVO.__bsFromStore = { note: function (v) { if (recent.has(v)) return; if (recent.size >= RMAX) recent.delete(recent.values().next().value); recent.add(v); }, has: function (v) { return recent.has(v); } };
  JSON.parse = function (text, reviver) {
    if (depth > 0 && reviver === undefined && typeof text === 'string' && text.length >= MIN && recent.has(text)) {
      var v = cache.get(text);
      if (v !== undefined) return v;
      v = oParse(text);
      if (cache.size >= MAX) cache.delete(cache.keys().next().value);
      cache.set(text, v);
      return v;
    }
    return oParse.apply(this, arguments);
  };
})();
