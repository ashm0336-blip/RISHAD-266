
/* ── بثّ التغيّر في مخزن المنظومة ───────────────────────────────────────────
   الصفحات مركّبة معاً في وقت واحد، وكل صفحة تقرأ ما تحتاجه من التخزين المحلي
   عند الرسم فقط — فاعتمادُ الخطة في صفحةٍ لا تراه صفحةُ الجولات إلا حين تُعاد
   زيارتها. هذا البثّ يُعلم المستمعين بأي كتابة على مفاتيح المنظومة لحظياً
   (وفي التبويبات الأخرى عبر حدث storage). */
(function(){
  try {
    var P = window.Storage && Storage.prototype; if (!P || P.__bsWrapped) return; P.__bsWrapped = true;
    var o = P.setItem;
    P.setItem = function(k, v){ var r = o.apply(this, arguments); try { if (this === window.localStorage && /^bassam_/.test(String(k))) window.dispatchEvent(new CustomEvent("bassam:store", { detail: { key: String(k) } })); } catch (e) {} return r; };
    window.addEventListener("storage", function(e){ try { var k = e && e.key; if (k && /(^|:)bassam_/.test(k)) window.dispatchEvent(new CustomEvent("bassam:store", { detail: { key: k, remote: true } })); } catch (e2) {} });
  } catch (e) {}
})();
