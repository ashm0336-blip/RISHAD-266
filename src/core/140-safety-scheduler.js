
/* ═══ المجدول الموحّد لشبكات الأمان البصرية ═══
   كان يدور كل ١٫٢ ثانية خلال ثانيتين بعد أيِّ نشاطٍ أو طفرةٍ في الوثيقة فيمرّ على الوثيقة كلِّها
   ليسأل «هل تغيّر شيء؟». الآن: لا مؤقّتَ دوريّاً البتّة. تمرّةٌ كاملةٌ واحدةٌ مجمَّعةٌ عند
   سببٍ صريحٍ فقط: تحجيمُ النافذة · التنقّلُ إلى صفحة · نهايةُ حركة الشريط الجانبيّ أو الإطار
   الرئيس · عودةُ التبويب للظهور. وما بين ذلك تعالج مراقباتُ الطفرات العقدَ المتغيّرةَ وحدَها. */
(function(){
  /* نافذةُ هدوء: حركةُ الشريط الجانبيّ (300ms) لا يجوز أن تقاطعها مكانسُ
     الأنماط والتخطيط؛ من يريد الكنسَ يمرّ من هنا فيُؤجَّل إلى ما بعدها. */
  var quietUntil = 0;
  KIVO.__bsQuiet = function (ms) { var t = Date.now() + (ms || 350); if (t > quietUntil) quietUntil = t; };
  KIVO.__bsAfterQuiet = function (fn) { var d = quietUntil - Date.now(); if (d > 0) setTimeout(function(){ KIVO.__bsAfterQuiet(fn); }, d + 16); else fn(); };
  /* نوعان: مهامُّ هندسةٍ (عروضٌ وارتفاعاتٌ ومواضع — تتأثّر بتغيّر المقاس) ومهامُّ كاملة
     (إتاحة · توحيدُ أشرطة · أزرارُ بحث — لا تتأثّر بالمقاس). تغيّرُ المقاس (تحجيمٌ · نهايةُ
     حركة الشريط) يشغّل الهندسةَ وحدَها؛ التنقّلُ وعودةُ التبويب يشغّلان الكلَّ. */
  var tasks = [], geo = [], n = 0, pend = 0, full = false;
  function runNow(list){ for (var i = 0; i < list.length; i++) { try { list[i](); } catch (e) {} } }
  /* أعمالُ التمرّة تقرأ التخطيط؛ تُنفَّذ في فراغِ الخيط بمهلةٍ قصوى فلا تتأخّر أكثرَ من 300ms */
  function runAll(all){
    if (all) full = true;
    if (pend) return;
    pend = 1;
    KIVO.__bsAfterQuiet(function(){
      var go = function(){ pend = 0; n++; var f = full; full = false; runNow(geo); if (f) runNow(tasks); };
      if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 300 });
      else setTimeout(go, 50);
    });
  }
  function mark(){ if (document.hidden) return; runAll(true); }
  function markGeo(){ if (document.hidden) return; runAll(false); }
  ["resize","orientationchange"].forEach(function(ev){ window.addEventListener(ev, markGeo, true); });
  window.addEventListener("load", mark, true);
  /* نهايةُ حركة الشريط الجانبيّ أو الإطار الرئيس وحدَها — لا كلُّ انتقالٍ في الصفحة (تلوينُ زرٍّ عند التحويم مثلاً) */
  ["transitionend","animationend"].forEach(function(ev){ window.addEventListener(ev, function(e){ var t = e && e.target; if (!t || !t.closest) return; if (t.closest("aside.bsb") || t.tagName === "MAIN") markGeo(); }, true); });
  document.addEventListener("visibilitychange", function(){ if (!document.hidden) mark(); });
  KIVO.__bsTick = { add: function(f, kind){ (kind === "geo" ? geo : tasks).push(f); mark(); }, mark: mark, markGeo: markGeo, active: function(){ return !!pend; }, count: function(){ return n; } };
})();
