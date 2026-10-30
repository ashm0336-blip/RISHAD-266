
/* ═══ R185: «استيرادُ البيانات التاريخية» — منطقُ خادم موقع الإحصائيات القديم (routes/historical_import.py) منقولٌ حرفاً ═══
   ملفُّ Excel موحّد: كلُّ صفٍّ يومٌ هجريٌّ واحد يحمل أعمدةَ الحرم والنبوي معاً، فيُنتج حتى سجلَّين (الحرم · النبوي) مفتاحُهما
   (الموقع + التاريخ). ثلاثُ خطوات (رفع ← معاينة ← تنفيذ) وثلاثةُ أوضاع (إضافة الجديد فقط · تحديث الموجود وإضافة الجديد ·
   استبدال الفترة المستوردة)، والخلايا الفارغة في التحديث: تُتجاهل أو تُمسح. الأسماءُ المرادفة للأعمدة، وتطبيعُ الرؤوس، وقراءةُ
   الأرقام والتواريخ، وحسابُ كلِّ رقمٍ في التقرير، ونصوصُ الأخطاء — كما في الخادم القديم بلا تغيير حرف.
   التنفيذُ يقرأ الإحصائيات من واجهة المجال، ثم يسلّم النتيجة إلى معاملة D1 علائقية بعد تفويض الخادم،
   فتظهر الأرقامُ في صفحتها وتحليلاتها، وكلُّ رقمٍ مستوردٍ يحمل بصمةَ من استورده (استيراد Excel)
   كما تفعل الصفحةُ عند الاستيراد، والرقمُ الذي لم يتغيّر يحتفظ ببصمته. والسجلُّ الموجود = يومٌ فيه رقمٌ واحدٌ على الأقل
   (قاعدةُ الصفحة والخادم). والنصوصُ nan/inf — وكان الخادمُ القديم يتعطّل عندها بخطأ 500 — تظهر خطأَ «قيمة غير رقمية». */
/* A domain client with an in-memory render snapshot only. No browser business store or
   background write queue: success means the relational server transaction acknowledged. */
KIVO.DailyStats = (function () {
  var boot = window.__BS_BOOT || {}, uid = String(boot.uid || ''), cache = {}, rev = null, busy = false, seq = 0, error = '';
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function read() { var v = clone(cache); Object.defineProperty(v, '__dsbase', { value: rev, enumerable: false }); return v; }
  function fail(code) { error = code || 'network'; return false; }
  function message() {
    if (error === 'conflict' || error === 'stale') return 'تغيّرت البيانات منذ فتحها — حدّث الصفحة ثم راجع مسودتك وأعد الحفظ';
    if (error === 'session' || error === 'session-changed') return 'تغيّرت جلسة الدخول — أعد تحميل الصفحة قبل الحفظ';
    if (error === 'denied') return 'رفض الخادم الحفظ — راجع الصلاحية ونطاق البيانات والأقفال';
    if (error === 'busy') return 'انتظر اكتمال الحفظ الجاري';
    if (error === 'not-ready') return 'لم تكتمل قراءة الإحصائيات من الخادم';
    return 'تعذّر الاتصال بالخادم — بقيت مسودتك دون اعتماد';
  }
  function valid(v) { return v && v.ok === 1 && Number.isSafeInteger(v.rev) && v.rev >= 0 && v.data && typeof v.data === 'object' && !Array.isArray(v.data); }
  async function refresh() {
    if (!uid || boot.srv !== 1 || boot.cf !== 1) { fail('session'); throw new Error(message()); }
    var id = ++seq; error = '';
    try {
      var r = await fetch('/api/dstats?uid=' + encodeURIComponent(uid), { credentials: 'same-origin', cache: 'no-store' }), v = await r.json();
      if (!r.ok || !valid(v)) { fail(v && v.err || 'network'); throw new Error(message()); }
      if (id === seq && !busy && (rev === null || v.rev >= rev)) { cache = clone(v.data); rev = v.rev; error = ''; }
      return read();
    } catch (e) { if (!error) fail('network'); throw e; }
  }
  async function save(data, opts) {
    opts = opts || {}; error = '';
    if (!uid || boot.srv !== 1 || boot.cf !== 1) return fail('session');
    if (busy) return fail('busy');
    if (rev === null) return fail('not-ready');
    var base = opts.base === undefined ? data.__dsbase : opts.base;
    if (!Number.isSafeInteger(base) || base !== rev) return fail('stale');
    busy = true; ++seq;
    try {
      var body = { uid: uid, base: base, data: data };
      if (opts.operation) body.operation = opts.operation;
      if (opts.reason) body.reason = String(opts.reason).trim();
      var r, v;
      for (var attempt = 0; attempt < 2; attempt++) {
        r = await fetch('/api/dstats', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); v = await r.json();
        if (attempt === 0 && r.status === 403 && v && v.why === 'reason' && KIVO.__BS_SRV && KIVO.__BS_SRV.askReason) {
          var reason = await new Promise(function (resolve) { KIVO.__BS_SRV.askReason('bassam_dstats_v1', v.reasonKeys || [], resolve); });
          if (!reason) return fail('denied'); body.reason = reason; continue;
        }
        break;
      }
      if (!r.ok || !valid(v) || v.rev < base) return fail(v && v.err || 'network');
      cache = clone(v.data); rev = v.rev; error = ''; return true;
    } catch (e) { return fail('network'); } finally { busy = false; }
  }
  return { read: read, refresh: refresh, save: save, ready: function () { return rev !== null; }, revision: function () { return rev; }, error: function () { return error; }, message: message };
})();
KIVO.BassamHistImport = (function () {
  var KEY = 'bassam_dstats_v1';
  var DATE_COL = 'التاريخ';
  var HARAM_COLUMNS = [['الحرم - المصلين', 'haram', 'worshippers'], ['الحرم - المعتمرين', 'haram', 'umrah'], ['الحرم - حجر إسماعيل', 'haram', 'hijr_ismail'], ['الحرم - العربات', 'haram', 'carts']];
  var NABAWI_COLUMNS = [['النبوي - المصلين', 'nabawi', 'worshippers'], ['النبوي - ممر السلام', 'nabawi', 'salam_corridor'],
    ['النبوي - الروضة رجال - منشور', 'nabawi', 'rawdah_men_published'], ['النبوي - الروضة رجال - محجوز', 'nabawi', 'rawdah_men_reserved'], ['النبوي - الروضة رجال - فعلي', 'nabawi', 'rawdah_men_actual'],
    ['النبوي - الروضة نساء - منشور', 'nabawi', 'rawdah_women_published'], ['النبوي - الروضة نساء - محجوز', 'nabawi', 'rawdah_women_reserved'], ['النبوي - الروضة نساء - فعلي', 'nabawi', 'rawdah_women_actual']];
  /* حقولُ كلِّ موقع في مخزن الصفحة — «إدراجُ سجلٍّ جديد» يهيّئها كلَّها (الغائبُ في الملف = فارغ) كما يفعل الخادم القديم */
  var FIELDS = { haram: ['worshippers', 'umrah', 'hijr_ismail', 'carts'],
    nabawi: ['worshippers', 'salam_corridor', 'rawdah_men_published', 'rawdah_men_reserved', 'rawdah_men_actual', 'rawdah_women_published', 'rawdah_women_reserved', 'rawdah_women_actual'] };
  var FIELD_LABELS = { worshippers: 'المصلين', umrah: 'المعتمرين', hijr_ismail: 'حجر إسماعيل', carts: 'العربات', salam_corridor: 'ممر السلام',
    rawdah_men_published: 'الروضة رجال - منشور', rawdah_men_reserved: 'الروضة رجال - محجوز', rawdah_men_actual: 'الروضة رجال - فعلي',
    rawdah_women_published: 'الروضة نساء - منشور', rawdah_women_reserved: 'الروضة نساء - محجوز', rawdah_women_actual: 'الروضة نساء - فعلي' };
  var SITE_LABELS = { haram: 'المسجد الحرام', nabawi: 'المسجد النبوي' };

  /* ── مطابقةُ بايثون: المسافاتُ (str.isspace) وأرقامُ Unicode العشرية ── */
  var WSC = '\\t\\n\\x0b\\x0c\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000';
  var RX_STRIP = new RegExp('^[' + WSC + ']+|[' + WSC + ']+$', 'g'), RX_WS = new RegExp('[' + WSC + ']+', 'g');
  function strip(s) { return String(s).replace(RX_STRIP, ''); }
  var ND0 = [0x660, 0x6F0, 0x7C0, 0x966, 0x9E6, 0xA66, 0xAE6, 0xB66, 0xBE6, 0xC66, 0xCE6, 0xD66, 0xDE6, 0xE50, 0xED0, 0xF20, 0x1040, 0x1090, 0x17E0, 0x1810,
    0x1946, 0x19D0, 0x1A80, 0x1A90, 0x1B50, 0x1BB0, 0x1C40, 0x1C50, 0xA620, 0xA8D0, 0xA900, 0xA9D0, 0xA9F0, 0xAA50, 0xABF0, 0xFF10];
  function ndFold(s) { return String(s).replace(/[^\x00-\x7f]/g, function (ch) { var c = ch.charCodeAt(0); for (var i = 0; i < ND0.length; i++) if (c >= ND0[i] && c <= ND0[i] + 9) return String(c - ND0[i]); return ch; }); }
  function arDigits(s) { return String(s).replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x660); }); }
  /* str(v) في بايثون لقيمة خليةٍ كما قرأها openpyxl */
  function pyStr(v) { if (v == null) return 'None'; if (typeof v === 'string') return v; return String(v.s); }
  function truthy(v) { if (v == null) return false; if (typeof v === 'string') return v.length > 0; if (v.k === 'i' || v.k === 'f' || v.k === 'b') return v.n !== 0; if (v.k === 'td') return !v.z; return true; }
  function isNum(v) { return v != null && typeof v === 'object' && (v.k === 'i' || v.k === 'f' || v.k === 'b'); }

  /* ── _normalize_header ── */
  var TASHKEEL = /[\u0610-\u061a\u064b-\u0652\u0670\u06d6-\u06ed]/g, DASH = /[\u2010-\u2015\u2212_\u00ad]/g, SYMBOL = /[()[\]{}.:،,؛;"'`]/g;
  function normHeader(s) {
    if (s == null) return '';
    s = strip(pyStr(s)); if (!s) return '';
    s = arDigits(s).replace(TASHKEEL, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(DASH, '-').replace(SYMBOL, ' ');
    s = s.replace(/\u00a0/g, ' ').replace(/\u200f/g, '').replace(/\u200e/g, '');
    return strip(s.replace(RX_WS, ' ')).toLowerCase();
  }
  var INDEX = (function () {
    var m = new Map();
    HARAM_COLUMNS.concat(NABAWI_COLUMNS).forEach(function (c) { m.set(normHeader(c[0]), [c[1], c[2]]); });
    [DATE_COL, 'التاريخ الهجري', 'اليوم الهجري', 'تاريخ', 'التاريخ ه', 'Date', 'Hijri Date', 'date_hijri'].forEach(function (d) { m.set(normHeader(d), 'DATE'); });
    [['الحرم المصلين', 'haram', 'worshippers'], ['حرم المصلين', 'haram', 'worshippers'], ['المسجد الحرام المصلين', 'haram', 'worshippers'], ['الحرم - مصلين', 'haram', 'worshippers'],
     ['الحرم المعتمرين', 'haram', 'umrah'], ['حرم المعتمرين', 'haram', 'umrah'], ['المعتمرين', 'haram', 'umrah'],
     ['الحرم حجر اسماعيل', 'haram', 'hijr_ismail'], ['حجر اسماعيل', 'haram', 'hijr_ismail'],
     ['الحرم العربات', 'haram', 'carts'], ['حرم العربات', 'haram', 'carts'], ['العربات', 'haram', 'carts'], ['عربات المعاقين', 'haram', 'carts'],
     ['النبوي المصلين', 'nabawi', 'worshippers'], ['نبوي المصلين', 'nabawi', 'worshippers'], ['المسجد النبوي المصلين', 'nabawi', 'worshippers'],
     ['النبوي ممر السلام', 'nabawi', 'salam_corridor'], ['ممر السلام', 'nabawi', 'salam_corridor'],
     ['النبوي الروضه رجال منشور', 'nabawi', 'rawdah_men_published'], ['الروضه رجال منشور', 'nabawi', 'rawdah_men_published'], ['روضه رجال منشور', 'nabawi', 'rawdah_men_published'],
     ['النبوي الروضه رجال محجوز', 'nabawi', 'rawdah_men_reserved'], ['الروضه رجال محجوز', 'nabawi', 'rawdah_men_reserved'], ['روضه رجال محجوز', 'nabawi', 'rawdah_men_reserved'],
     ['النبوي الروضه رجال فعلي', 'nabawi', 'rawdah_men_actual'], ['الروضه رجال فعلي', 'nabawi', 'rawdah_men_actual'], ['روضه رجال فعلي', 'nabawi', 'rawdah_men_actual'],
     ['النبوي الروضه نساء منشور', 'nabawi', 'rawdah_women_published'], ['الروضه نساء منشور', 'nabawi', 'rawdah_women_published'], ['روضه نساء منشور', 'nabawi', 'rawdah_women_published'],
     ['النبوي الروضه نساء محجوز', 'nabawi', 'rawdah_women_reserved'], ['الروضه نساء محجوز', 'nabawi', 'rawdah_women_reserved'], ['روضه نساء محجوز', 'nabawi', 'rawdah_women_reserved'],
     ['النبوي الروضه نساء فعلي', 'nabawi', 'rawdah_women_actual'], ['الروضه نساء فعلي', 'nabawi', 'rawdah_women_actual'], ['روضه نساء فعلي', 'nabawi', 'rawdah_women_actual']
    ].forEach(function (x) { m.set(normHeader(x[0]), [x[1], x[2]]); });
    return m;
  })();
  function mapped(v) { var k = normHeader(v); return k && INDEX.has(k) ? INDEX.get(k) : null; }

  /* ── _parse_number: فارغ/«-»/«—»/None/null ← لا قيمة · «0» ← صفرٌ حقيقي · «1,500,000» و«١٬٥٠٠٬٠٠٠» ← 1500000 ── */
  function ValErr(msg) { var e = new Error(msg); e.pyType = 'ValueError'; e.pyMsg = msg; return e; }
  function parseNumber(val) {
    if (val == null) return null;
    if (isNum(val)) return val.n;
    if (typeof val === 'object') throw ValErr("قيمة غير رقمية: '" + pyStr(val) + "'");
    var s = strip(val);
    if (!s || s === '-' || s === '—' || s === 'None' || s === 'null') return null;
    s = arDigits(s).split(',').join('').split('٬').join('').split('،').join('').split(' ').join('');
    if (!s) return null;
    var f = KIVO.BassamXLSX.py.floatText(ndFold(s));
    if (f == null || !isFinite(f)) throw ValErr("قيمة غير رقمية: '" + val + "'");
    return f;
  }
  /* ── _normalize_hijri: 1446-09-01 · 1446/09/01 · 01-09-1446 · 01/09/1446 (والأرقامُ العربية، ولاحقةُ «هـ») — التاريخُ الميلاديّ مرفوض ── */
  function normHijri(raw) {
    if (raw == null) return null;
    if (typeof raw === 'object' && (raw.k === 'dt' || raw.k === 'd')) return null;
    var s = strip(pyStr(raw)); if (!s) return null;
    s = arDigits(s).split('\u00a0').join('').split('\u200f').join('').split('\u200e').join('');
    s = strip(s.split('هـ').join('').split('ه\u200d').join(''));
    s = ndFold(s);
    var m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s), y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else { m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(s); if (!m) return null; d = +m[1]; mo = +m[2]; y = +m[3]; }
    if (!(y >= 1300 && y <= 1600 && mo >= 1 && mo <= 12 && d >= 1 && d <= 30)) return null;
    return (y < 1000 ? ('000' + y).slice(-4) : String(y)) + '-' + (mo < 10 ? '0' : '') + mo + '-' + (d < 10 ? '0' : '') + d;
  }

  /* ── خطأ الخادم: { status, detail } كما كان يُرجعه (HTTPException) ── */
  function HttpErr(status, detail) { var e = new Error(detail); e.status = status; e.detail = detail; return e; }
  function techOf(e) { if (e && e.pyType) return e.pyType + ': ' + String(e.pyMsg == null ? '' : e.pyMsg); return String((e && e.name) || 'Error') + ': ' + String((e && e.message) || e); }

  /* ── _parse_workbook ── */
  async function parseWorkbook(buf) {
    var wb;
    try { wb = await KIVO.BassamXLSX.parseBook(buf); }
    catch (e) { if (e && e.rowPhase) throw e; throw HttpErr(400, 'تعذّرت قراءة ملف Excel — قد يكون الملف تالفًا أو محميًا بكلمة مرور أو بصيغة غير مدعومة. السبب التقني: ' + techOf(e).slice(0, 160 + (e && e.pyType ? e.pyType.length + 2 : 0))); }
    var sheetNames = wb.sheets || [];
    var debug = { sheet_count: sheetNames.length, sheet_names: sheetNames, active_sheet: wb.active };
    if (wb.active == null) throw HttpErr(400, 'الملف لا يحتوي ورقة عمل نشطة. الأوراق الموجودة: ' + (sheetNames.join(', ') || '(لا توجد)'));
    if (wb.chart) { var ce = new Error("'Chartsheet' object has no attribute 'iter_rows'"); ce.pyType = 'AttributeError'; ce.pyMsg = "'Chartsheet' object has no attribute 'iter_rows'"; throw ce; }
    var rows = wb.rows, title = wb.active;
    if (rows.length < 2) throw HttpErr(400, 'الورقة «' + title + '» تحتوي ' + rows.length + ' صف فقط — يجب أن يحتوي الملف صف عناوين + صف بيانات على الأقل.');
    var bestIdx = -1, bestScore = 0, i, j;
    for (i = 0; i < Math.min(5, rows.length); i++) {
      var score = 0; for (j = 0; j < rows[i].length; j++) if (mapped(rows[i][j])) score++;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestScore === 0 || bestIdx < 0) {
      var sample = []; (rows[0] || []).forEach(function (v) { if (v != null && strip(pyStr(v))) sample.push(strip(pyStr(v))); });
      throw HttpErr(400, 'لم يتم التعرّف على أي عمود معروف في الورقة «' + title + '». الرؤوس المقروءة: ' + (sample.slice(0, 13).join('، ') || '(لا توجد رؤوس)') + '. ' +
        'عدد الأوراق في الملف: ' + sheetNames.length + ' (' + sheetNames.join(', ') + '). الرجاء تنزيل القالب الموحّد من نفس الشاشة واستخدامه.');
    }
    var headers = rows[bestIdx], colMap = [], unknown = [], dateIdx = null;
    headers.forEach(function (val, ci) {
      var norm = normHeader(val); if (!norm) return;
      var mp = INDEX.has(norm) ? INDEX.get(norm) : null;
      if (mp === 'DATE') dateIdx = ci;
      else if (mp) { var at = -1; colMap.forEach(function (x, q) { if (x.ci === ci) at = q; }); if (at >= 0) colMap[at].map = mp; else colMap.push({ ci: ci, map: mp }); }
      else unknown.push([ci, strip(pyStr(val))]);
    });
    if (dateIdx == null) throw HttpErr(400, 'عمود «التاريخ» غير موجود في الملف (تم البحث عن أي اسم مكافئ)');
    var data = [];
    for (i = bestIdx + 1; i < rows.length; i++) {
      var row = rows[i];
      if (row.every(function (c) { return c == null || (typeof c === 'string' && !strip(c)); })) continue;
      var rec = { _row: i + 1, _date_raw: dateIdx < row.length ? row[dateIdx] : null, _per_field: [] };
      colMap.forEach(function (x) {
        var raw = x.ci < row.length ? row[x.ci] : null;
        var cn = (x.ci < headers.length && truthy(headers[x.ci])) ? strip(pyStr(headers[x.ci])) : '';
        rec._per_field.push([cn, raw, x.map[0], x.map[1]]);
      });
      data.push(rec);
    }
    return { colMap: colMap, data: data, unknown: unknown, debug: debug };
  }
  /* ── _split_record: أخطاءُ الخلايا تُجمع، والموقعُ يدخل إن كان فيه رقمٌ واحدٌ على الأقل ── */
  function splitRecord(raw, errors, ri) {
    var per = { haram: {}, nabawi: {} }, has = { haram: false, nabawi: false }, keys = { haram: [], nabawi: [] };
    raw._per_field.forEach(function (p) {
      var cn = p[0], rv = p[1], site = p[2], field = p[3], v;
      try { v = parseNumber(rv); }
      catch (e) { errors.push({ row: ri, column: cn, value: pyStr(rv), reason: e.pyMsg || String(e.message), kind: 'invalid_number' }); return; }
      if (!Object.prototype.hasOwnProperty.call(per[site], field)) keys[site].push(field);
      per[site][field] = v;
      if (v != null) has[site] = true;
    });
    var out = [];
    if (has.haram) out.push(['haram', per.haram, keys.haram]);
    if (has.nabawi) out.push(['nabawi', per.nabawi, keys.nabawi]);
    return out;
  }
  async function loadStore() { if (!KIVO.DailyStats) throw HttpErr(503, 'خدمة الإحصائيات غير متاحة'); return await KIVO.DailyStats.refresh(); }
  /* السجلُّ الموجود: يومٌ فيه رقمٌ واحدٌ على الأقل (قاعدةُ الصفحة والخادم) */
  function hasNum(r) { if (!r || typeof r !== 'object') return false; for (var f in r) if (f !== '__m' && f !== '__f' && r[f] != null && r[f] !== '') return true; return false; }
  function sortStr(a) { return a.slice().sort(function (x, y) { return x < y ? -1 : x > y ? 1 : 0; }); }
  function uniq(a) { var o = {}, out = []; a.forEach(function (x) { if (!o[x]) { o[x] = 1; out.push(x); } }); return out; }

  /* ═══ المعاينة (_run_preview_logic) — meta: { filename, size_bytes, content_type } ═══ */
  async function preview(buf, meta) {
    var P;
    try { P = await parseWorkbook(buf); }
    catch (e) {
      if (e && e.status) throw HttpErr(e.status, e.detail + ' | الملف: ' + meta.filename + ' (' + meta.size_bytes + ' بايت، نوع: ' + meta.content_type + ')');
      throw HttpErr(500, 'خطأ غير متوقع أثناء تحليل الملف. الملف: ' + meta.filename + ' (' + meta.size_bytes + ' بايت). السبب: ' + techOf(e).slice(0, 200 + (e && e.pyType ? e.pyType.length + 2 : 0)));
    }
    var data = P.data, store = await loadStore();
    var total = data.length, haramN = 0, nabawiN = 0, newN = 0, updN = 0, errs = [], dups = [], blank = 0, seen = {}, years = {}, months = {}, sample = [], match = [], ignored = 0;
    data.forEach(function (raw) {
      var ri = raw._row, dh = normHijri(raw._date_raw);
      if (!dh) { errs.push({ row: ri, column: DATE_COL, value: raw._date_raw != null ? pyStr(raw._date_raw) : '', reason: 'تاريخ هجري غير صالح (الصيغ المقبولة: 1446-09-01 أو 01/09/1446)', kind: 'invalid_date' }); return; }
      var rowErr = [], split = splitRecord(raw, rowErr, ri);
      if (rowErr.length) errs.push.apply(errs, rowErr);
      if (!split.length) { ignored++; return; }
      var y = dh.slice(0, 4), mo = dh.slice(5, 7); years[y] = 1; months[y + '-' + mo] = 1;
      split.forEach(function (sp) {
        var site = sp[0], fields = sp[1], fk = sp[2], key = site + '|' + dh;
        if (seen[key]) { dups.push({ row: ri, site: site, date_hijri: dh, kind: 'duplicate_in_file' }); return; }
        seen[key] = 1;
        fk.forEach(function (f) { if (fields[f] == null) blank++; });
        if (site === 'haram') haramN++; else nabawiN++;
        var ex = (store[site] && typeof store[site] === 'object') ? store[site][dh] : null, exists = hasNum(ex);
        if (exists) {
          updN++;
          fk.forEach(function (f) { var cur = ex[f] == null || ex[f] === '' ? null : Number(ex[f]), nv = fields[f];
            match.push({ row: ri, site: site, site_label: SITE_LABELS[site], date_hijri: dh, field: f, field_label: FIELD_LABELS[f] || f, current_value: cur, excel_value: nv, changes: cur !== nv }); });
        } else newN++;
        if (sample.length < 12) { var vals = {}; fk.forEach(function (f) { if (fields[f] != null) vals[f] = fields[f]; }); sample.push({ site: site, date_hijri: dh, is_new: !exists, values: vals }); }
      });
    });
    var badDateRows = uniq(errs.filter(function (e) { return e.kind === 'invalid_date'; }).map(function (e) { return e.row; })).length;
    return {
      total_rows: total, valid_rows: total - ignored - badDateRows, ignored_empty_rows: ignored,
      total_haram_records: haramN, total_nabawi_records: nabawiN, new_records: newN, existing_records: updN, blank_cells_count: blank,
      errors: errs.slice(0, 30), errors_total: errs.length, duplicates_in_file: dups.slice(0, 30), duplicates_total: dups.length,
      years: sortStr(Object.keys(years)), months: sortStr(Object.keys(months)), sample_changes: sample,
      matching_existing: match.slice(0, 50), matching_existing_total: match.length,
      columns_detected: P.colMap.map(function (x) { return x.map[1]; }), unknown_headers: P.unknown.map(function (u) { return u[1]; }).slice(0, 20),
      file_meta: meta, workbook_meta: P.debug
    };
  }

  /* ── بصمةُ المُدخِل (الصفحةُ نفسُها: الإحصائيات اليومية) — الرقمُ الذي لم يتغيّر يحتفظ ببصمته ── */
  function actor() { var n = '—', u = ''; try { var d = KIVO.BassamAuth && KIVO.BassamAuth.display && KIVO.BassamAuth.display(); if (d && d.name) n = d.name; } catch (e) {}
    try { var us = KIVO.BassamAuth && KIVO.BassamAuth.user && KIVO.BassamAuth.user(); if (us) u = String(us.ekey || us.id || us.un || ''); } catch (e) {} return { n: n, u: u, t: Date.now(), x: 1 }; }
  function STOF(r, k) { if (!r || r[k] == null || r[k] === '') return null; var f = r.__f;
    if (f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, k)) return (f[k] && f[k].t) ? f[k] : null;
    return (r.__m && r.__m.t) ? r.__m : null; }
  function STEQ(a, b) { return a === b || (!!a && !!b && a.n === b.n && a.u === b.u && a.t === b.t && (a.x || 0) === (b.x || 0)); }
  function stamp(prev, next, st, keys) {
    prev = prev || {}; var per = {};
    keys.forEach(function (k) { if (next[k] == null) return; per[k] = (prev[k] == null || prev[k] === '' || Number(prev[k]) !== Number(next[k])) ? st : STOF(prev, k); });
    delete next.__m; delete next.__f;
    var ks = Object.keys(per); if (!ks.length) return next;
    var groups = []; ks.forEach(function (k) { var v = per[k], g = null; for (var i = 0; i < groups.length; i++) if (STEQ(groups[i].s, v)) { g = groups[i]; break; } if (!g) { g = { s: v, n: 0 }; groups.push(g); } g.n++; });
    groups.sort(function (a, b) { return (b.n - a.n) || (((b.s && b.s.t) || 0) - ((a.s && a.s.t) || 0)); });
    var base = groups[0].s; if (base) next.__m = base;
    var ov = {}; ks.forEach(function (k) { if (!STEQ(per[k], base)) ov[k] = per[k] || 0; });
    if (Object.keys(ov).length) next.__f = ov;
    return next;
  }

  /* ═══ التنفيذ (historical_import) — يُعيد { res, store } والحفظُ على المستدعي ═══ */
  async function execute(buf, mode, blankHandling, meta) {
    if (['add', 'update', 'replace'].indexOf(mode) < 0) throw HttpErr(400, 'وضع الاستيراد غير صالح');
    if (['ignore', 'clear'].indexOf(blankHandling) < 0) throw HttpErr(400, 'معالجة الخلايا الفارغة غير صالحة');
    if (meta && meta.filename && !/\.(xlsx|xls)$/i.test(meta.filename)) throw HttpErr(400, 'يرجى رفع ملف Excel (.xlsx)');
    var P = await parseWorkbook(buf), data = P.data, store = await loadStore(), st = actor();
    var inserted = 0, updated = 0, skipped = 0, deleted = 0, errors = [], seen = {}, aSites = {}, aMonths = {}, aYears = {};
    var SITE = function (s) { if (!store[s] || typeof store[s] !== 'object') store[s] = {}; return store[s]; };
    if (mode === 'replace') {
      data.forEach(function (raw) {
        var dh = normHijri(raw._date_raw); if (!dh) return;
        var split = splitRecord(raw, [], raw._row); if (!split.length) return;
        var y = dh.slice(0, 4), mo = dh.slice(5, 7);
        split.forEach(function (sp) { aSites[sp[0]] = 1; aMonths[sp[0] + '|' + y + '|' + mo] = 1; aYears[y] = 1; });
      });
      Object.keys(aMonths).forEach(function (k) {
        var q = k.split('|'), site = q[0], pre = q[1] + '-' + q[2] + '-', S = store[site];
        if (!S || typeof S !== 'object') return;
        Object.keys(S).forEach(function (d) { if (d.indexOf(pre) === 0) { if (hasNum(S[d])) deleted++; delete S[d]; } });
      });
    }
    data.forEach(function (raw) {
      var ri = raw._row, dh = normHijri(raw._date_raw);
      if (!dh) { errors.push({ row: ri, column: DATE_COL, value: truthy(raw._date_raw) ? pyStr(raw._date_raw) : '', reason: 'تاريخ غير صالح', kind: 'invalid_date' }); return; }
      var rowErr = [], split = splitRecord(raw, rowErr, ri);
      errors.push.apply(errors, rowErr);
      if (!split.length) return;
      var y = dh.slice(0, 4), mo = dh.slice(5, 7);
      split.forEach(function (sp) {
        var site = sp[0], fields = sp[1], fk = sp[2], key = site + '|' + dh;
        if (seen[key]) { skipped++; return; }
        seen[key] = 1; aSites[site] = 1; aMonths[site + '|' + y + '|' + mo] = 1; aYears[y] = 1;
        var S = SITE(site), prev = S[dh], existing = mode === 'replace' ? false : hasNum(prev);
        if (mode === 'add' && existing) { skipped++; return; }
        if (existing) {
          var next = Object.assign({}, prev);
          fk.forEach(function (f) { var v = fields[f]; if (v == null && blankHandling === 'ignore') return; next[f] = v == null ? null : v; });
          S[dh] = stamp(prev, next, st, FIELDS[site]);
          updated++;
        } else {
          var doc = {}; FIELDS[site].forEach(function (f) { doc[f] = Object.prototype.hasOwnProperty.call(fields, f) && fields[f] != null ? fields[f] : null; });
          S[dh] = stamp(null, doc, st, FIELDS[site]);
          inserted++;
        }
      });
    });
    var months = Object.keys(aMonths).map(function (k) { var q = k.split('|'); return q[0] + '/' + q[1] + '-' + q[2]; });
    var res = { mode: mode, inserted: inserted, updated: updated, skipped: skipped, deleted: deleted, errors: errors.slice(0, 30), errors_total: errors.length,
      affected_sites: sortStr(Object.keys(aSites)), affected_years: sortStr(Object.keys(aYears)), affected_months: sortStr(months) };
    /* سطرُ سجل الأنشطة — نصُّ الخادم القديم: «استيراد بيانات تاريخية (Excel)» وتفاصيلُه */
    res.activity = { act: 'import', ename: 'استيراد بيانات تاريخية (Excel)',
      after: { 'وضع': mode, 'مواقع': sortStr(Object.keys(aSites)).join(','), 'إدراج': inserted, 'تحديث': updated, 'حذف': deleted, 'تخطي': skipped } };
    return { res: res, store: store };
  }

  /* ═══ القالبُ الموحّد (historical_template.xlsx): ورقةُ «البيانات التاريخية» من اليمين، ترويسةٌ ذهبية، وصفُّ مثال ═══ */
  function templateBytes() {
    var headers = [DATE_COL].concat(HARAM_COLUMNS.map(function (c) { return c[0]; }), NABAWI_COLUMNS.map(function (c) { return c[0]; }));
    var sampleRow = ['1446-09-01']; for (var i = 1; i < headers.length; i++) sampleRow.push('');
    return KIVO.BassamXLSX.buildStyled({ sheet: 'البيانات التاريخية', rtl: true, widths: headers.map(function () { return 18; }), rows: [headers, sampleRow],
      head: { fill: 'B99751', color: 'FFFFFF', bold: true, font: 'Calibri', height: 38 } });
  }
  return { KEY: KEY, preview: preview, execute: execute, templateBytes: templateBytes, hasNum: hasNum,
    _t: { normHeader: normHeader, normHijri: normHijri, parseNumber: parseNumber, pyStr: pyStr } };
})();
