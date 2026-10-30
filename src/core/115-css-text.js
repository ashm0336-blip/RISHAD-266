/* ═══ KIVO_242 · نصُّ الأنماط والخطوط للطباعة وتصدير الصور — BassamCssText ═══
   الطباعةُ (الخطة التشغيلية · المتابعة اليومية) وتصديرُ الخريطة صورةً ومفتاحُ استعادة مدير النظام وسندُ العهدة تنسخ أنماطَ الصفحة نصّاً
   إلى وثيقةٍ مستقلّة. كانت الأنماطُ كلُّها <style> مضمّنة فيُقرأ textContent؛ صارت ملفاتٍ خارجية ذاتَ بصمة (<link>) تُخزَّن سنة —
   فيُقرأ نصُّ الورقة المرتبطة من CSSOM (قواعدُها نفسُها بترتيبها). عنصرُ <style> يُقرأ كما كان: textContent حرفاً.
   والخطوطُ صارت ملفاتِ woff2 ذاتَ بصمة (url) بدل data: داخل الأنماط. موضعان يُضمِّنان الخطَّ نفسَه في وثيقةٍ أخرى بالبحث عن
   قواعد @font-face التي مصدرُها data:font: صورةُ الخريطة في الطباعة (SVG المرسومُ صورةً لا يجلب ملفاً خارجياً) وسندُ العهدة.
   fontData() تجلب ملفاتِ الخطوط المذكورة في قواعد @font-face (من ذاكرة المتصفح غالباً) وتبني ورقةً غيرَ ملحقةٍ بالوثيقة، قواعدُها
   هي القواعدُ نفسُها بترتيبها ومصدرُها data:font/woff2;base64 — أي نصَّ KIVO_240 نفسَه؛ وfontSheets() تُعيدها لذَينك الموضعين
   (أو document.styleSheets ما دامت الخطوطُ مضمّنةً أصلاً كما في البناء الأحادي). */
(function () {
  function sheetText(el) {
    try { var r = el.sheet && el.sheet.cssRules, out = [], i; if (!r) return ""; for (i = 0; i < r.length; i++) out.push(r[i].cssText); return out.join("\n"); } catch (e) { return ""; }
  }
  function textOf(el) {
    if (!el) return "";
    if (el.tagName === "STYLE") return el.textContent || "";
    if (el.tagName === "LINK") return sheetText(el);
    return "";
  }
  var fontSheet = null, fontJob = null;
  function faceRules() {
    var out = [];
    [].forEach.call(document.styleSheets, function (s) { var r; try { r = s.cssRules; } catch (e) { return; } if (r) [].forEach.call(r, function (x) { if (x.type === 5) out.push(x); }); });
    return out;
  }
  function urlOf(css) { var m = /url\("([^"]+)"\)/.exec(css || ""); return m && m[1].indexOf("data:") !== 0 ? m : null; }
  function hasUrlFaces() { return faceRules().some(function (x) { return !!urlOf(x.cssText); }); }
  function b64(buf) { var u = new Uint8Array(buf), s = "", i; for (i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); }
  function fontData() {
    if (fontJob) return fontJob;
    if (!hasUrlFaces()) return Promise.resolve();
    var rules = faceRules(), texts = [], jobs = [];
    rules.forEach(function (x, i) {
      var css = x.cssText, m = urlOf(css), href;
      texts[i] = css;
      if (!m) return;
      try { href = new URL(m[1], (x.parentStyleSheet && x.parentStyleSheet.href) || location.href).href; } catch (e) { return; }
      jobs.push(fetch(href).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
        .then(function (b) { texts[i] = css.replace(m[0], 'url("data:font/woff2;base64,' + b64(b) + '")'); }, function () {}));
    });
    /* خطٌّ تعذّر جلبُه يبقى بمصدره url فلا يلتقطه البحثُ عن data:font — تُطبع الوثيقةُ بالخطّ البديل ولا تتوقّف */
    fontJob = Promise.all(jobs).then(function () {
      try { var s = new CSSStyleSheet(); s.replaceSync(texts.join("\n")); fontSheet = s; } catch (e) { fontSheet = { cssRules: [] }; }
    });
    return fontJob;
  }
  KIVO.BassamCssText = {
    byId: function (id) { return textOf(document.getElementById(id)); },
    all: function () { return [].map.call(document.querySelectorAll('style, link[rel~="stylesheet"]'), textOf).join("\n"); },
    fontData: fontData,
    fontReady: function () { return !!fontSheet || !hasUrlFaces(); },
    fontSheets: function () { return fontSheet ? [fontSheet] : document.styleSheets; }
  };
})();
