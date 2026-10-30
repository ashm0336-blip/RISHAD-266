/* ── حقائق يومٍ لموظف: المصدر الواحد ────────────────────────────────────────
   القاعدة (المتفق عليها ومكتوبة في staffsnap.js): اليومُ الذي لا تقرير مسحوباً
   له تُقرأ حقائقه من الجدول الشهري الحي، واليومُ المسحوب تقريره مكتفٍ بتقريره
   (نُسخت إليه الوردية والراحة والتكليف لحظة السحب). كانت هذه القاعدة مكتوبة
   بأربع نسخ في أربع صفحات، فاختلفت الشاشات في اليوم الواحد: صفحة الموظف تقرأ
   من التقرير بينما التشغيل الميداني والجولات يقرآن من الجدول وحده — فمن عُدّلت
   راحته في التقرير يظهر «في راحة» هنا و«على رأس العمل» هناك. صارت النسخة
   واحدة هنا، وكل شاشة تسأل هذا المصدر.
   الاستعمال: var D = BassamDay.of(y, m, d);  D.restToday(tok) · D.shiftOf(tok)
              · D.mukOf(tok) · D.rowOf(tok) · D.repToday                       */
(function () {
  var WD = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  function J(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function wdName(dt) { try { return new Date(dt).toLocaleDateString('ar-SA', { weekday: 'long' }); } catch (e) { return WD[new Date(dt).getDay()] || ''; } }
  /* اسم يوم الأسبوع لتاريخ هجري — بلا تحويل: اليومُ المطلوب هو اليوم الجاري في
     الغالب، وما عداه يُحسب بفارق الأيام عن اليوم الجاري في تقويم أم القرى */
  function wdOf(y, m, d) {
    try {
      var H = KIVO.BassamHijri, T = H && H.now ? H.now(new Date()) : null;
      if (T && +T.y === +y && +T.m === +m) { var dt = new Date(); dt.setDate(dt.getDate() + (+d - +T.d)); return wdName(dt); }
    } catch (e) {}
    return wdName(new Date());
  }
  function of(y, m, d) {
    var YM = y + '-' + m, DK = y + '-' + m + '-' + d;
    var E = KIVO.BassamEmp;
    var emps = J('bassam_employees_v1', []); if (!Array.isArray(emps)) emps = [];
    var staffing = J('bassam_staffing_v3', {}) || {};
    var bucket = staffing[YM] || {};
    var rep = J('bassam_dreport_v1', {}) || {};
    var rec = rep[DK] || null;
    var pulled = (rec && rec.shifts) ? Object.keys(rec.shifts).filter(function (sn) { return rec.shifts[sn] && rec.shifts[sn].pulled; }) : [];
    var repToday = pulled.length > 0;
    var keyOf = function (e) { return E && E.entryKey ? E.entryKey(bucket, e) : ((e && (e.eid || e.nid || e.name)) || ''); };
    var byTok = {}; emps.forEach(function (e) { if (!e) return; (E && E.tokens ? E.tokens(e) : [e.eid, e.nid, e.name]).forEach(function (t) { if (t) byTok[t] = e; }); if (e.name && !byTok[e.name]) byTok[e.name] = e; });
    var keyOfTok = function (t) { var e = byTok[t]; return e ? keyOf(e) : t; };
    var K = function (x) { return (x && typeof x === 'object') ? keyOf(x) : keyOfTok(x); };
    var entryOf = function (k) { return (bucket[k] && typeof bucket[k] === 'object') ? bucket[k] : {}; };
    var wd = wdOf(y, m, d);
    var isRestOn = function (rest) { return (rest || []).some(function (r) { return r === wd || ('ال' + r) === wd || r === ('ال' + wd); }); };
    /* صفّ الموظف في تقرير اليوم: ورديةٌ فيها اسمه، وإلا وردية حُوّل منها */
    /* إعادة السحب إلى ورديةٍ أخرى تُبقي اسمه في روستر ورديته السابقة، فلو أخذنا
       أول تطابقٍ لأخذنا الوردية الملغاة — الأخيرُ هو القائم (كما في صفحة الموظف) */
    /* فهرسُ الصفوف يُبنى مرةً لكلِّ لقطة — بنفس ترتيب الغلبة الذي كان: آخرُ تطابقٍ في
       الورديات المسحوبة يغلب، ثم صفُّ المحوَّل إليه (tin) يغلب، ثم المحوَّلُ منه (tout) إن لم يوجد */
    var _rowIdx = null;
    var buildRowIdx = function () {
      var idx = Object.create(null), tin = Object.create(null), tout = Object.create(null);
      pulled.forEach(function (sn) { (rec.shifts[sn].roster || []).forEach(function (r) { if (!r || !r.ekey) return; idx[keyOfTok(r.ekey)] = { st: r.st || 'pr', sh: sn }; }); });
      /* المحوَّل إلى وردية لم يُسحب تقريرها بعد: قرارُ رئيس الوردية نافذٌ اليوم،
         فيُقرأ صفّه من وجهته (tin) لا من ورديته القديمة — وإلا بقيت صفحته على
         الوردية التي حُوّل منها حتى يسحب رئيس الوردية الأخرى تقريره. */
      Object.keys((rec && rec.shifts) || {}).forEach(function (sn) { var s0 = rec.shifts[sn]; if (!s0) return;
        (s0.roster || []).forEach(function (r) { if (!r || !r.ekey || !r.tin) return; tin[keyOfTok(r.ekey)] = { st: r.st || 'pr', sh: sn, tin: 1, tfrom: r.tfrom || '' }; }); });
      pulled.forEach(function (sn) { var to = rec.shifts[sn].tout || {}; Object.keys(to).forEach(function (k0) { tout[keyOfTok(k0)] = { st: 'tout', sh: sn, to: to[k0] }; }); });
      return { idx: idx, tin: tin, tout: tout };
    };
    var rowOf = function (x) {
      if (!repToday) return null; var k = K(x);
      if (!_rowIdx) _rowIdx = buildRowIdx();
      var out = _rowIdx.idx[k] || null;
      if (_rowIdx.tin[k]) out = _rowIdx.tin[k];
      if (!out && _rowIdx.tout[k]) out = _rowIdx.tout[k];
      if (!out) return null; var c = {}; for (var q in out) c[q] = out[q]; return c;
    };
    /* خريطةٌ داخل تقرير الوردية مفاتيحها رموز الموظفين (الراحة أو التكليف) */
    var fromRepMap = function (k, field, row) {
      if (!repToday) return null; var out = null;
      /* ورديةُ صفّه أولاً: مَن نُقل من وردية إلى أخرى تبقى في وردية الأمس نسخةٌ
         قديمة من راحته وتكليفه — فلو قُرئت بترتيب الورديات لأخذنا الملغى */
      var mine = row && row.sh;
      var order = mine ? [mine] : pulled.slice();          /* ورديةُ صفّه وحدها إن عُرفت */
      order.forEach(function (sn) { if (out !== null) return; var s0 = rec.shifts[sn]; if (!s0) return; var m0 = (s0[field] && typeof s0[field] === 'object') ? s0[field] : {};
        Object.keys(m0).forEach(function (k0) { if (out !== null) return; if (keyOfTok(k0) === k) out = m0[k0]; }); });
      return out;
    };
    var restOf = function (x) { var k = K(x); if (repToday) { var r = fromRepMap(k, 'rest', rowOf(x)); return Array.isArray(r) ? r : []; } var e = entryOf(k); return Array.isArray(e.rest) ? e.rest : []; };
    var shiftOf = function (x) { var r = rowOf(x); if (r) return r.sh || ''; return entryOf(K(x)).shift || ''; };
    var mukOf = function (x) { var k = K(x); var v = fromRepMap(k, 'muk', rowOf(x)); if (v != null) return v === true; return entryOf(k).muk === true; };
    /* «في راحته اليوم»: المؤشَّر غائباً أو مجازاً أو محوَّلاً ليس في راحة — حالته أولى */
    var restToday = function (x) { var r = rowOf(x); if (r && r.st && r.st !== 'pr') return false; return isRestOn(restOf(x)); };
    var known = function (x) { var k = K(x); return !!(rowOf(x) || (bucket[k] && typeof bucket[k] === 'object')); };
    return { y: +y, m: +m, d: +d, ym: YM, dk: DK, wd: wd, src: repToday ? 'rep' : 'sched', repToday: repToday, pulled: pulled,
      rec: rec, bucket: bucket, emps: emps, keyOf: keyOf, keyOfTok: keyOfTok, entryOf: entryOf, isRestOn: isRestOn,
      rowOf: rowOf, restOf: restOf, restToday: restToday, shiftOf: shiftOf, mukOf: mukOf, known: known };
  }
  function today() { try { var T = KIVO.BassamHijri.now(new Date()); return of(T.y, T.m, T.d); } catch (e) { return of(0, 0, 0); } }
  /* ── «متاح» و«غير متاح»: حالةٌ تُحسب ولا تُخزَّن ─────────────────────────────
     من لم يُؤشَّر له حضورٌ ولا غياب، وليس في راحةٍ ولا إجازة، فهو «متاح» داخل
     وقت ورديته المسندة و«غير متاح» خارجه — قبل أن تبدأ أو بعد أن تنتهي.

     ولا تُكتب في سجلّ: هي دالّةُ الساعة، تتغيّر في الدقيقة الواحدة. فتُحسب في
     موضعٍ واحدٍ هنا وتسأله كل شاشة، فلا تختلف بطاقةٌ عن عمود.

     وتُطبَّق على اليوم الجاري وحده: يومٌ ماضٍ لا معنى لقياسه بساعة الآن، فيبقى
     «متاح» كما كان. ووردية بلا وقتٍ محدَّد لا نافذة لها فلا يُحكم بخروجٍ منها. */
  function shiftWindow(shiftName) {
    try {
      var L = JSON.parse(localStorage.getItem('bassam_shift_options_v1')) || [];
      var sd = L.filter(function (x) { return x && x.name === shiftName; })[0];
      if (!sd || !sd.tStart || !sd.tEnd) return null;
      var p1 = String(sd.tStart).split(':'), p2 = String(sd.tEnd).split(':');
      var a = (+p1[0]) * 60 + (+p1[1] || 0), b = (+p2[0]) * 60 + (+p2[1] || 0);
      return { a: a, b: b, over: b <= a };            /* over = تمتدّ بعد منتصف الليل */
    } catch (e) { return null; }
  }
  function onShiftNow(shiftName, when) {
    var w = shiftWindow(shiftName); if (!w) return null;   /* بلا وقتٍ: لا حكم */
    var t = when || new Date(), n = t.getHours() * 60 + t.getMinutes();
    return w.over ? (n >= w.a || n <= w.b) : (n >= w.a && n <= w.b);
  }
  /* isToday: هل السجلّ لليوم الجاري؟ فبه وحده يُحكم بالساعة */
  function availTxt(shiftName, isToday) {
    if (!isToday) return 'متاح';
    var on = onShiftNow(shiftName);
    if (on === null) return 'متاح';
    return on ? 'متاح' : 'غير متاح';
  }
  KIVO.BassamDay = { of: of, today: today, shiftWindow: shiftWindow, onShiftNow: onShiftNow, availTxt: availTxt };
})();
