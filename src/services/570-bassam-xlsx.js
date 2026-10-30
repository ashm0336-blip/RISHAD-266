
/* BassamXLSX — self-contained xlsx read/write (no external libraries).
   Writing: builds a minimal STORED (uncompressed) .xlsx zip with inlineStr cells.
   Reading: parses the zip central directory and inflates entries via the
   browser's built-in DecompressionStream('deflate-raw'); handles shared &
   inline strings. Everything is wrapped defensively so a bad file cannot crash. */
KIVO.BassamXLSX = (function () {
  var enc = new TextEncoder();
  var crcTable = (function () {
    var c, t = [], n, k;
    for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { var c = 0xFFFFFFFF, i; for (i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function u8(s) { return enc.encode(s); }
  function num(n, len) { var a = new Uint8Array(len), i; for (i = 0; i < len; i++) { a[i] = n & 0xFF; n = Math.floor(n / 256); } return a; }
  function cat(arrs) { var t = 0, i, o, p = 0; for (i = 0; i < arrs.length; i++) t += arrs[i].length; o = new Uint8Array(t); for (i = 0; i < arrs.length; i++) { o.set(arrs[i], p); p += arrs[i].length; } return o; }

  function zipStored(files) { // files: [{name, data:Uint8Array}]
    var local = [], central = [], offset = 0, i;
    for (i = 0; i < files.length; i++) {
      var f = files[i], nb = u8(f.name), crc = crc32(f.data), sz = f.data.length, lo = offset;
      var lh = cat([num(0x04034b50, 4), num(20, 2), num(0, 2), num(0, 2), num(0, 2), num(0, 2),
        num(crc, 4), num(sz, 4), num(sz, 4), num(nb.length, 2), num(0, 2), nb, f.data]);
      local.push(lh); offset += lh.length;
      central.push(cat([num(0x02014b50, 4), num(20, 2), num(20, 2), num(0, 2), num(0, 2), num(0, 2), num(0, 2),
        num(crc, 4), num(sz, 4), num(sz, 4), num(nb.length, 2), num(0, 2), num(0, 2), num(0, 2), num(0, 2),
        num(0, 4), num(lo, 4), nb]));
    }
    var cd = cat(central), cdOff = offset, cdSize = cd.length;
    var eocd = cat([num(0x06054b50, 4), num(0, 2), num(0, 2), num(files.length, 2), num(files.length, 2),
      num(cdSize, 4), num(cdOff, 4), num(0, 2)]);
    return cat([cat(local), cd, eocd]);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function colName(n) { var s = ""; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

  function build(aoa) { // aoa: array of rows, each an array of cell values
    var rowsXml = "", r, cIdx;
    for (r = 0; r < aoa.length; r++) {
      var row = aoa[r] || [], cells = "";
      for (cIdx = 0; cIdx < row.length; cIdx++) {
        var v = row[cIdx];
        if (v === "" || v == null) continue;
        var ref = colName(cIdx) + (r + 1);
        if (typeof v === "number" && isFinite(v)) {
          cells += '<c r="' + ref + '"><v>' + v + '</v></c>';
        } else {
          cells += '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
        }
      }
      rowsXml += '<row r="' + (r + 1) + '">' + cells + '</row>';
    }
    var sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetData>' + rowsXml + '</sheetData></worksheet>';
    var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '</Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>';
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>';
    var wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '</Relationships>';
    return zipStored([
      { name: "[Content_Types].xml", data: u8(contentTypes) },
      { name: "_rels/.rels", data: u8(rels) },
      { name: "xl/workbook.xml", data: u8(wb) },
      { name: "xl/_rels/workbook.xml.rels", data: u8(wbRels) },
      { name: "xl/worksheets/sheet1.xml", data: u8(sheet) }
    ]);
  }

  // ---- reading ----
  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === "undefined") throw new Error("no DecompressionStream");
    var ds = new DecompressionStream("deflate-raw");
    var w = ds.writable.getWriter(); w.write(bytes); w.close();
    var reader = ds.readable.getReader(), chunks = [], total = 0;
    while (true) { var res = await reader.read(); if (res.done) break; chunks.push(res.value); total += res.value.length; }
    var out = new Uint8Array(total), p = 0, i;
    for (i = 0; i < chunks.length; i++) { out.set(chunks[i], p); p += chunks[i].length; }
    return out;
  }
  async function readEntries(buf) {
    var bytes = new Uint8Array(buf), dv = new DataView(buf), entries = {}, i;
    // locate End Of Central Directory (scan backwards for 0x06054b50)
    var eocd = -1;
    for (i = bytes.length - 22; i >= 0; i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error("not a zip");
    var cdOff = dv.getUint32(eocd + 16, true), cdCount = dv.getUint16(eocd + 10, true);
    var p = cdOff, td = new TextDecoder("utf-8");
    for (i = 0; i < cdCount; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var method = dv.getUint16(p + 10, true);
      var compSize = dv.getUint32(p + 20, true);
      var nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), cmtLen = dv.getUint16(p + 32, true);
      var lho = dv.getUint32(p + 42, true);
      var name = td.decode(bytes.subarray(p + 46, p + 46 + nameLen));
      // read local header at lho to find true data start
      var lNameLen = dv.getUint16(lho + 26, true), lExtraLen = dv.getUint16(lho + 28, true);
      var dataStart = lho + 30 + lNameLen + lExtraLen;
      entries[name] = { method: method, start: dataStart, compSize: compSize };
      p += 46 + nameLen + extraLen + cmtLen;
    }
    return { bytes: bytes, entries: entries };
  }
  async function entryText(z, name) {
    var e = z.entries[name]; if (!e) return null;
    var slice = z.bytes.subarray(e.start, e.start + e.compSize);
    var data = e.method === 0 ? slice : await inflateRaw(slice);
    return new TextDecoder("utf-8").decode(data);
  }
  function parseShared(xml) {
    if (!xml) return [];
    var doc = new DOMParser().parseFromString(xml, "application/xml");
    var sis = doc.getElementsByTagName("si"), out = [], i, j;
    for (i = 0; i < sis.length; i++) {
      var ts = sis[i].getElementsByTagName("t"), s = "";
      for (j = 0; j < ts.length; j++) s += ts[j].textContent;
      out.push(s);
    }
    return out;
  }
  function colIndex(ref, fallback) {
    /* السمة r اختيارية في المواصفة، وكان غيابها يُرجع صفراً فتنهار خلايا الصف
       كلها على العمود الأول ويطمس بعضها بعضاً بلا أي خطأ. الآن يُستعمل
       العدّاد المتسلسل للصف عند غيابها، كما تفعل قارئات xlsx القياسية. */
    var m = /^([A-Za-z]+)/.exec(ref || "");
    if (!m) return (fallback == null ? 0 : fallback);
    var s = m[1].toUpperCase(), n = 0, i;
    for (i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  }

  async function parse(buf) {
    var z = await readEntries(buf);
    var shared = parseShared(await entryText(z, "xl/sharedStrings.xml"));
    // first worksheet
    var sheetName = null, k;
    for (k in z.entries) { if (/^xl\/worksheets\/sheet.*\.xml$/i.test(k)) { sheetName = k; break; } }
    if (!sheetName) throw new Error("no worksheet");
    var xml = await entryText(z, sheetName);
    var doc = new DOMParser().parseFromString(xml, "application/xml");
    var rowEls = doc.getElementsByTagName("row"), rows = [], i, j;
    for (i = 0; i < rowEls.length; i++) {
      var cs = rowEls[i].getElementsByTagName("c"), row = [], nextCol = 0;
      for (j = 0; j < cs.length; j++) {
        var c = cs[j], ref = c.getAttribute("r") || "", t = c.getAttribute("t"), idx = colIndex(ref, nextCol), val = "";
        if (t === "inlineStr") { var isT = c.getElementsByTagName("t"); val = isT.length ? isT[0].textContent : ""; }
        else if (t === "s") { var vv = c.getElementsByTagName("v"); var si = vv.length ? parseInt(vv[0].textContent, 10) : -1; val = (si >= 0 && si < shared.length) ? shared[si] : ""; }
        else if (t === "str") { var vs = c.getElementsByTagName("v"); val = vs.length ? vs[0].textContent : ""; }
        else { var vn = c.getElementsByTagName("v"); val = vn.length ? vn[0].textContent : ""; }
        row[idx] = val; nextCol = idx + 1;
      }
      var r2 = []; for (j = 0; j < row.length; j++) r2.push(row[j] == null ? "" : row[j]);
      rows.push(r2);
    }
    return rows;
  }

  function download(aoa, filename) {
    var B = KIVO.BassamBusy;
    if (B && !download._in) { var n = (aoa || []).length; return B.run(function(){ download._in = 1; try { download(aoa, filename); } finally { download._in = 0; } }, 'جارٍ تجهيز ملف Excel…', { sub: n ? KIVO.BassamCount(n - 1, "صف") : '' }); }
    var data = build(aoa);
    var blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }


  /* ═══ R185: قراءةُ المصنَّف كما يقرؤه الخادمُ القديم (openpyxl 3.1.5 · read_only · data_only) حرفاً ═══
     parse() أعلاه تقرأ أولَ ورقةٍ تجدها في الملف وتُسقط الصفوفَ الفارغة؛ أمّا «استيرادُ البيانات التاريخية» فمنقولٌ من موقع
     الإحصائيات القديم، وخادمُه يقرأ الورقةَ النشطة وأرقامَ الصفوف الحقيقية وأنواعَ الخلايا (رقم/نص/منطقي/تاريخ/خطأ) — فتُقرأ هنا
     كما قرأها: مسارُ المصنَّف من [Content_Types] ثم علاقاتُه، والنصوصُ المشتركة والمنسّقة، وتنسيقاتُ التاريخ من styles.xml،
     ونطاقُ الورقة المعلَن (dimension). والأخطاءُ تحمل اسمَ خطأ بايثون ونصَّه كما كان يظهر في رسالة الخادم. */
  function PyErr(type, msg) { var e = new Error(type + ': ' + msg); e.pyType = type; e.pyMsg = msg; return e; }
  function xKids(el, name) { var o = [], c; if (!el) return o; for (c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && c.localName === name) o.push(c); return o; }
  function xKid(el, name) { var c; if (!el) return null; for (c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && c.localName === name) return c; return null; }
  function xAttr(el, name) { if (!el || !el.attributes) return null; for (var i = 0; i < el.attributes.length; i++) { var a = el.attributes[i]; if (a.localName === name) return a.value; } return null; }
  function xDoc(txt, part) {
    var d = null; try { d = new DOMParser().parseFromString(String(txt), 'application/xml'); } catch (e) { d = null; }
    if (!d || !d.documentElement || d.getElementsByTagName('parsererror').length) throw PyErr('ParseError', 'not well-formed (invalid token): ' + part);
    return d;
  }
  /* نصُّ عقدةٍ منسّقة (Text.content): <t> المباشر ثم <t> كلِّ <r> — والقراءةُ الصوتية <rPh> لا تدخل */
  function xRich(el) { var s = '', t = xKid(el, 't'); if (t) s += t.textContent; xKids(el, 'r').forEach(function (r) { var q = xKid(r, 't'); if (q) s += q.textContent; }); return s; }
  function bookPath(base, target) {
    if (target.charAt(0) === '/') return target.slice(1);
    var parts = (base ? base.split('/') : []).concat(target.split('/')), out = [];
    parts.forEach(function (p) { if (p === '' || p === '.') return; if (p === '..') { if (out.length) out.pop(); return; } out.push(p); });
    return out.join('/');
  }
  /* تنسيقاتُ الأرقام المدمجة في openpyxl (BUILTIN_FORMATS) — وما يعدّه تاريخاً أو مدّة */
  var BUILTIN_NF = { 0: 'General', 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 5: '"$"#,##0_);("$"#,##0)', 6: '"$"#,##0_);[Red]("$"#,##0)', 7: '"$"#,##0.00_);("$"#,##0.00)',
    8: '"$"#,##0.00_);[Red]("$"#,##0.00)', 9: '0%', 10: '0.00%', 11: '0.00E+00', 12: '# ?/?', 13: '# ??/??', 14: 'mm-dd-yy', 15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy',
    18: 'h:mm AM/PM', 19: 'h:mm:ss AM/PM', 20: 'h:mm', 21: 'h:mm:ss', 22: 'm/d/yy h:mm', 37: '#,##0_);(#,##0)', 38: '#,##0_);[Red](#,##0)', 39: '#,##0.00_);(#,##0.00)',
    40: '#,##0.00_);[Red](#,##0.00)', 41: '_(* #,##0_);_(* \\(#,##0\\);_(* "-"_);_(@_)', 42: '_("$"* #,##0_);_("$"* \\(#,##0\\);_("$"* "-"_);_(@_)',
    43: '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)', 44: '_("$"* #,##0.00_)_("$"* \\(#,##0.00\\)_("$"* "-"??_)_(@_)', 45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mmss.0', 48: '##0.0E+0', 49: '@' };
  var NF_STRIP = /".*?"|\[(?!hh?\]|mm?\]|ss?\])[^\]]*\]/g, NF_TD = /\[hh?\](:mm(:ss(\.0*)?)?)?|\[mm?\](:ss(\.0*)?)?|\[ss?\](\.0*)?/i;
  function nfIsDate(f) { if (f == null) return false; f = String(f).split(';')[0].replace(NF_STRIP, ''); return /(^|[^_\\])[dmhysDMHYS]/.test(f); }
  function nfIsTd(f) { if (f == null) return false; return NF_TD.test(String(f).split(';')[0]); }
  /* ── قيمُ الخلايا بأنواع بايثون: نصٌّ خام · {k:'i'|'f'|'b', n, s} رقم/منطقي · {k:'dt'|'d'|'tm'|'td', s} تاريخٌ ووقتٌ ومدّة ── */
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function p4(n) { n = String(n); while (n.length < 4) n = '0' + n; return n; }
  function p6(n) { n = String(n); while (n.length < 6) n = '0' + n; return n; }
  function rHalfEven(x) { var f = Math.floor(x), d = x - f; if (d > 0.5) return f + 1; if (d < 0.5) return f; return (f % 2 === 0) ? f : f + 1; }
  /* repr(float) في بايثون: أقصرُ تمثيل، وفاصلةٌ عشرية دائماً، والأسُّ حين decpt ≤ -4 أو > 16 */
  function pyFloatStr(x) {
    if (x !== x) return 'nan'; if (x === Infinity) return 'inf'; if (x === -Infinity) return '-inf';
    if (x === 0) return (1 / x < 0) ? '-0.0' : '0.0';
    var neg = x < 0, e = Math.abs(x).toExponential(), m = /^(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(e);
    var dg = m[1] + (m[2] || ''), ex = +m[3], dp = ex + 1, s;
    if (dp > 16 || dp <= -4) { s = dg.charAt(0) + (dg.length > 1 ? '.' + dg.slice(1) : '') + 'e' + (ex < 0 ? '-' : '+') + p2(Math.abs(ex)); }
    else if (dp <= 0) s = '0.' + new Array(1 - dp).join('0') + dg;
    else if (dp >= dg.length) s = dg + new Array(dp - dg.length + 1).join('0') + '.0';
    else s = dg.slice(0, dp) + '.' + dg.slice(dp);
    return (neg ? '-' : '') + s;
  }
  var EPOCH_WIN = Date.UTC(1899, 11, 30), EPOCH_MAC = Date.UTC(1904, 0, 1), DAY_MS = 86400000;
  function dtStr(ms, us) { var d = new Date(ms); return p4(d.getUTCFullYear()) + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()) + ' ' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ':' + p2(d.getUTCSeconds()) + (us ? '.' + p6(us) : ''); }
  /* from_excel: الرقمُ التسلسليّ ← تاريخ/وقت/مدّة بايثون (وخارج مدى السنوات ١–٩٩٩٩ ⇒ #VALUE! كما يفعل openpyxl) */
  function fromExcel(v, mac, td) {
    if (td) {
      var tus = rHalfEven(v * 864e8), days = Math.floor(tus / 864e8), rem = tus - days * 864e8, sec = Math.floor(rem / 1e6), mic = rem - sec * 1e6;
      if (mic) { var tot = days * 86400 + sec + mic / 1e6, fl = Math.floor(tot); mic = rHalfEven(mic / 1000) * 1000; if (mic >= 1e6) { fl += 1; mic -= 1e6; } days = Math.floor(fl / 86400); sec = fl - days * 86400; }
      var hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60, s = hh + ':' + p2(mm) + ':' + p2(ss);
      if (days) s = days + ' day' + (Math.abs(days) !== 1 ? 's' : '') + ', ' + s;
      if (mic) s += '.' + p6(mic);
      return { k: 'td', s: s, z: !days && !sec && !mic };
    }
    var day = Math.floor(v), frac = v - day, dms = rHalfEven(frac * DAY_MS), ddays = Math.floor(dms / DAY_MS), rms = dms - ddays * DAY_MS;
    if (v >= 0 && v < 1 && ddays === 0) {
      var t = Math.floor(rms / 1000), us0 = (rms - t * 1000) * 1000;
      return { k: 'tm', s: p2(Math.floor(t / 3600)) + ':' + p2(Math.floor((t % 3600) / 60)) + ':' + p2(t % 60) + (us0 ? '.' + p6(us0) : '') };
    }
    if (v > 0 && v < 60 && !mac) day += 1;
    var ms = (mac ? EPOCH_MAC : EPOCH_WIN) + (day + ddays) * DAY_MS + rms, y = new Date(ms).getUTCFullYear();
    if (!isFinite(ms) || y < 1 || y > 9999) return '#VALUE!';
    var us = (ms % 1000 + 1000) % 1000 * 1000;
    return { k: 'dt', s: dtStr(ms - us / 1000, us) };
  }
  var ISO_RX = /^(?:(\d{4})-(\d{2})-(\d{2}))?T?(?:(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?)?Z?/;
  function fromIso(s) {
    if (!s) return null; var m = ISO_RX.exec(s); if (!m || !m.slice(1).some(function (x) { return x != null; })) return null;
    var us = m[7] ? Math.floor(parseFloat(m[7]) * 1e6) : 0, tm = m[4] != null;
    if (m[1] == null) return { k: 'tm', s: m[4] + ':' + m[5] + ':' + p2(+(m[6] || 0)) + (us ? '.' + p6(us) : '') };
    if (!tm) return { k: 'd', s: m[1] + '-' + m[2] + '-' + m[3] };
    return { k: 'dt', s: m[1] + '-' + m[2] + '-' + m[3] + ' ' + m[4] + ':' + m[5] + ':' + p2(+(m[6] || 0)) + (us ? '.' + p6(us) : '') };
  }
  function castNum(t) {
    if (t.indexOf('.') >= 0 || t.indexOf('E') >= 0 || t.indexOf('e') >= 0) {
      var f = pyFloatText(t); if (f == null) throw PyErr('ValueError', "could not convert string to float: '" + t + "'");
      return { k: 'f', n: f, s: pyFloatStr(f) };
    }
    var q = String(t).replace(/^[\s]+|[\s]+$/g, '');
    if (!/^[+-]?\d(_?\d)*$/.test(q)) throw PyErr('ValueError', "invalid literal for int() with base 10: '" + t + "'");
    q = q.replace(/_/g, ''); var neg = q.charAt(0) === '-'; q = q.replace(/^[+-]/, '').replace(/^0+(?=\d)/, '');
    return { k: 'i', n: (neg ? -1 : 1) * Number(q), s: (neg && q !== '0' ? '-' : '') + q };
  }
  /* float() في بايثون على نصٍّ رقميّ: فواصلُ «_» بين الأرقام، وinf/nan — يُعاد null إن لم يكن رقماً */
  function pyFloatText(t) {
    var q = String(t).replace(/^[\t\n\x0b\x0c\r\x1c-\x1f \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\t\n\x0b\x0c\r\x1c-\x1f \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g, '');
    var m = /^([+-]?)(inf|infinity|nan)$/i.exec(q); if (m) return /nan/i.test(m[2]) ? NaN : (m[1] === '-' ? -Infinity : Infinity);
    if (!/^[+-]?(?:(?:\d(?:_?\d)*)?\.\d(?:_?\d)*|\d(?:_?\d)*\.?)(?:[eE][+-]?\d(?:_?\d)*)?$/.test(q)) return null;
    return Number(q.replace(/_/g, ''));
  }
  function colIdx(s) { var n = 0; s = String(s).toUpperCase(); if (s.length > 3) throw PyErr('ValueError', "'" + s + "' is not a valid column name. Column names are from A to ZZZ"); for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64); return n; }
  function rangeBounds(ref) {
    var m = /^\$?([A-Za-z]{1,3})?\$?(\d+)?(:\$?([A-Za-z]{1,3})?\$?(\d+)?)?$/.exec(ref || '');
    if (!m) throw PyErr('ValueError', ref + ' is not a valid coordinate or range');
    var c1 = m[1] ? colIdx(m[1]) : null, r1 = m[2] ? +m[2] : null, c2 = m[4] ? colIdx(m[4]) : c1, r2 = m[5] ? +m[5] : r1;
    if (m[3] && !((m[1] && m[2] && m[4] && m[5]) || (m[1] && m[4] && !m[2] && !m[5]) || (m[2] && m[5] && !m[1] && !m[4]))) throw PyErr('ValueError', ref + ' is not a valid coordinate or range');
    return [c1, r1, c2, r2];
  }
  /* parseBook(buf) → { sheets:[أسماء]، active:اسمُ النشطة أو null، rows:[صفوفٌ كثيفة من الصف ١]، chart:النشطةُ ورقةُ رسم } */
  async function parseBook(buf) {
    var z;
    try { z = await readEntries(buf); } catch (e) { throw PyErr('BadZipFile', 'File is not a zip file'); }
    var txt = async function (name) {
      if (!z.entries[name]) throw PyErr('KeyError', '"There is no item named \'' + name + '\' in the archive"');
      try { return await entryText(z, name); } catch (e) { throw PyErr('BadZipFile', 'Bad CRC-32 for file \'' + name + '\''); }
    };
    var ct = xDoc(await txt('[Content_Types].xml'), '[Content_Types].xml').documentElement;
    var OV = xKids(ct, 'Override'), DF = xKids(ct, 'Default');
    var WBT = ['application/vnd.ms-excel.template.macroEnabled.main+xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml',
      'application/vnd.ms-excel.sheet.macroEnabled.main+xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'];
    var wbPart = null;
    WBT.forEach(function (t) { if (wbPart) return; OV.forEach(function (o) { if (!wbPart && xAttr(o, 'ContentType') === t) wbPart = String(xAttr(o, 'PartName') || '').replace(/^\//, ''); }); });
    if (!wbPart && DF.some(function (d) { return WBT.indexOf(xAttr(d, 'ContentType')) >= 0; })) wbPart = 'xl/workbook.xml';
    if (!wbPart) throw PyErr('OSError', 'File contains no valid workbook part');
    var shared = [], ssPart = null;
    OV.forEach(function (o) { if (!ssPart && xAttr(o, 'ContentType') === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml') ssPart = String(xAttr(o, 'PartName') || '').replace(/^\//, ''); });
    if (ssPart) { var sd = xDoc(await txt(ssPart), ssPart); shared = Array.prototype.map.call(sd.getElementsByTagNameNS('*', 'si'), function (si) { return xRich(si).split('x005F_').join(''); }); }
    var wbDoc = xDoc(await txt(wbPart), wbPart).documentElement;
    var slash = wbPart.lastIndexOf('/'), wbDir = slash >= 0 ? wbPart.slice(0, slash) : '', relsPart = (wbDir ? wbDir + '/' : '') + '_rels/' + wbPart.slice(slash + 1) + '.rels';
    var relDoc = xDoc(await txt(relsPart), relsPart).documentElement, rels = {};
    xKids(relDoc, 'Relationship').forEach(function (r) { if (xAttr(r, 'TargetMode') === 'External') return; rels[xAttr(r, 'Id')] = { type: xAttr(r, 'Type') || '', target: bookPath(wbDir, xAttr(r, 'Target') || '') }; });
    var pr = xKid(wbDoc, 'workbookPr'), mac = !!pr && /^(1|true)$/i.test(xAttr(pr, 'date1904') || '');
    var act = 0, bv = xKid(wbDoc, 'bookViews');
    xKids(bv, 'workbookView').some(function (v) { var a = xAttr(v, 'activeTab'); if (a != null) { act = parseInt(a, 10) || 0; return true; } return false; });
    var list = [];
    xKids(xKid(wbDoc, 'sheets'), 'sheet').forEach(function (sh) {
      var id = xAttr(sh, 'id'); if (!id) return;
      var rel = rels[id]; if (!rel) throw PyErr('KeyError', "'Unknown relationship: " + id + "'");
      if (!z.entries[rel.target]) return;
      list.push({ name: xAttr(sh, 'name') || '', path: rel.target, chart: rel.type.indexOf('chartsheet') >= 0 });
    });
    /* التنسيقاتُ: أيُّ نمطِ خليةٍ (xf) يحمل تنسيقَ تاريخٍ أو مدّة */
    var dateXf = {}, tdXf = {};
    if (z.entries['xl/styles.xml']) {
      var st = xDoc(await txt('xl/styles.xml'), 'xl/styles.xml').documentElement, cust = {};
      xKids(xKid(st, 'numFmts'), 'numFmt').forEach(function (n) { cust[+xAttr(n, 'numFmtId')] = xAttr(n, 'formatCode'); });
      xKids(xKid(st, 'cellXfs'), 'xf').forEach(function (xf, i) {
        var id = +(xAttr(xf, 'numFmtId') || 0), f = Object.prototype.hasOwnProperty.call(cust, id) ? cust[id] : (BUILTIN_NF[id] == null ? null : BUILTIN_NF[id]);
        if (nfIsDate(f)) dateXf[i] = 1; if (nfIsTd(f)) tdXf[i] = 1;
      });
    }
    var out = { sheets: list.map(function (s) { return s.name; }), active: null, rows: null, chart: false };
    var ws = list[act] || null; if (!ws) return out;
    out.active = ws.name; if (ws.chart) { out.chart = true; return out; }
    var sh = xDoc(await txt(ws.path), ws.path).documentElement, maxCol = null, maxRow = null;
    var dim = xKid(sh, 'dimension'); if (dim) { var b = rangeBounds(xAttr(dim, 'ref')); if (b.some(function (x) { return x != null; })) { maxCol = b[2]; maxRow = b[3]; } }
    var rows = [], counter = 1, idx = 1, rowCounter = 0, empty = [];
    if (maxCol != null) for (var e0 = 0; e0 < maxCol; e0++) empty.push(null);
    var rowEls = xKids(xKid(sh, 'sheetData'), 'row');
    /* ما يقع أثناء قراءة الصفوف كان خارج «فتح المصنَّف» في الخادم القديم (خطأ 500 لا 400) — يُعلَّم ليُصاغ كذلك */
    try {
    for (var ri = 0; ri < rowEls.length; ri++) {
      var re = rowEls[ri], ra = xAttr(re, 'r');
      if (ra != null) { if (/^\s*[+-]?\d+\s*$/.test(ra)) rowCounter = parseInt(ra, 10); else { var fv = pyFloatText(ra); if (fv == null || fv !== Math.floor(fv)) throw PyErr('ValueError', ra + ' is not a valid row number'); rowCounter = fv; } }
      else rowCounter += 1;
      idx = rowCounter;
      var colCounter = 0, cells = [];
      xKids(re, 'c').forEach(function (c) {
        var t = xAttr(c, 't') || 'n', rf = xAttr(c, 'r'), s = xAttr(c, 's'), sid = s ? parseInt(s, 10) : 0, col;
        var v = null; if (t !== 'inlineStr') { var ve = xKid(c, 'v'); v = ve ? (ve.textContent || null) : null; }
        if (rf) { var m = /^\$?([A-Za-z]+)\$?(\d+)$/.exec(rf); if (!m) throw PyErr('ValueError', "invalid literal for int() with base 10: '" + rf + "'"); col = colIdx(m[1]); colCounter = col; }
        else { colCounter += 1; col = colCounter; }
        if (v != null) {
          if (t === 'n') { v = castNum(v); if (dateXf[sid]) v = fromExcel(v.n, mac, !!tdXf[sid]); }
          else if (t === 's') { var si = parseInt(v, 10); if (!(si >= 0 && si < shared.length)) throw PyErr('IndexError', 'list index out of range'); v = shared[si]; }
          else if (t === 'b') { if (!/^\s*[+-]?\d+\s*$/.test(v)) throw PyErr('ValueError', "invalid literal for int() with base 10: '" + v + "'"); v = { k: 'b', n: parseInt(v, 10) ? 1 : 0, s: parseInt(v, 10) ? 'True' : 'False' }; }
          else if (t === 'd') v = fromIso(v);
        } else if (t === 'inlineStr') { var is = xKid(c, 'is'); if (is) v = xRich(is); }
        cells.push({ col: col, v: v });
      });
      if (maxRow != null && idx > maxRow) break;
      while (counter < idx) { counter++; rows.push(empty); }
      if (counter <= idx) {
        if (!cells.length && !maxCol) rows.push([]);
        else { var w = maxCol || cells[cells.length - 1].col, arr = []; for (var k = 0; k < w; k++) arr.push(null);
          cells.forEach(function (q) { if (q.col >= 1 && q.col <= w) arr[q.col - 1] = q.v; }); rows.push(arr); }
        counter++;
      }
    }
    } catch (e) { if (e && typeof e === 'object') e.rowPhase = true; throw e; }
    if (maxRow != null && maxRow < idx) for (var c2 = counter; c2 <= maxRow; c2++) rows.push(empty);
    out.rows = rows;
    return out;
  }

  /* ═══ R185: مصنَّفٌ منسَّق (قالبُ الاستيراد): اسمُ ورقة، اتجاهٌ من اليمين، عرضُ أعمدة، ارتفاعُ الصف الأول، وترويسةٌ ملوّنة ═══
     o = { sheet, rtl, widths:[...], rows:[[...]], head:{ fill:'B99751', color:'FFFFFF', bold:true, font:'Calibri', height:38 } } */
  function buildStyled(o) {
    var H = o.head || {}, rowsXml = '', r, c, maxC = 0;
    for (r = 0; r < o.rows.length; r++) maxC = Math.max(maxC, (o.rows[r] || []).length);
    for (r = 0; r < o.rows.length; r++) {
      var row = o.rows[r] || [], cells = '', hd = r === 0;
      for (c = 0; c < row.length; c++) {
        var v = row[c], ref = colName(c) + (r + 1), sa = hd ? ' s="1"' : '';
        if (v === '' || v == null) { if (hd) cells += '<c r="' + ref + '"' + sa + '/>'; continue; }
        if (typeof v === 'number' && isFinite(v)) cells += '<c r="' + ref + '"' + sa + '><v>' + v + '</v></c>';
        else cells += '<c r="' + ref + '"' + sa + ' t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
      }
      rowsXml += '<row r="' + (r + 1) + '"' + (hd && H.height ? ' ht="' + H.height + '" customHeight="1"' : '') + '>' + cells + '</row>';
    }
    var cols = (o.widths || []).map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('');
    var X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
    var sheet = X + '<worksheet ' + NS + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<dimension ref="A1:' + colName(Math.max(0, maxC - 1)) + Math.max(1, o.rows.length) + '"/>' +
      '<sheetViews><sheetView ' + (o.rtl ? 'rightToLeft="1" ' : '') + 'tabSelected="1" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/>' +
      (cols ? '<cols>' + cols + '</cols>' : '') + '<sheetData>' + rowsXml + '</sheetData><pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/></worksheet>';
    var styles = X + '<styleSheet ' + NS + '>' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font>' + (H.bold ? '<b/>' : '') + '<sz val="11"/><color rgb="FF' + (H.color || '000000') + '"/><name val="' + esc(H.font || 'Calibri') + '"/><family val="2"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      (H.fill ? '<fill><patternFill patternType="solid"><fgColor rgb="FF' + H.fill + '"/><bgColor indexed="64"/></patternFill></fill>' : '<fill><patternFill patternType="none"/></fill>') + '</fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">' +
      '<alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    var ctx = X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
    var rels = X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var wb = X + '<workbook ' + NS + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews>' +
      '<sheets><sheet name="' + esc(o.sheet || 'Sheet1') + '" sheetId="1" r:id="rId1"/></sheets></workbook>';
    var wbRels = X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    return zipStored([{ name: '[Content_Types].xml', data: u8(ctx) }, { name: '_rels/.rels', data: u8(rels) }, { name: 'xl/workbook.xml', data: u8(wb) },
      { name: 'xl/_rels/workbook.xml.rels', data: u8(wbRels) }, { name: 'xl/worksheets/sheet1.xml', data: u8(sheet) }, { name: 'xl/styles.xml', data: u8(styles) }]);
  }
  function saveBytes(bytes, filename) {
    var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  var PY = { floatStr: pyFloatStr, floatText: pyFloatText };

  var parse0 = parse;
  parse = function(buf){ var B = KIVO.BassamBusy; return B ? B.wrap(parse0(buf), 'جارٍ قراءة ملف الإكسل…', { sub: buf && buf.byteLength ? B.fmtBytes(buf.byteLength) : '' }) : parse0(buf); };
  return { build: build, parse: parse, download: download, parseBook: parseBook, buildStyled: buildStyled, saveBytes: saveBytes, py: PY };
})();

