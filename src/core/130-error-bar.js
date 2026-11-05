/* شريط الأخطاء الظاهر (#bsErrBar) — بديل وحدة التحكم لمن لا يفتحها. الالتقاطُ للعرض فقط: وجوده لا يغيّر أي سلوك.
   CORE-01: نصُّ الاستثناء وموضعُه («انقلها لي») لمدير المنصة أو بيئة التطوير وحدهما؛ ولغيرهما سطرٌ هادئ بلغةٍ عادية
   يختفي وحده. الوعودُ المرفوضة غيرُ الملتقطة تذهب إلى وحدة التحكم وحدها — لا شريطَ لها. */
(function(){
  var hideT = null, who = null;
  /* KIVO.bsTechView(): هل يرى هذا المستخدمُ التفصيلَ التقني (نصَّ الاستثناء · اسمَ المكوّن)؟ — بيئةُ التطوير دائماً،
     وإلا ما تسجّله طبقةُ الهوية (330: مديرُ المنصة) عبر KIVO.bsTechWho(fn) — فلا يعرف core الهويةَ ولا الصلاحيات */
  function tech(){
    try {
      var h = location.hostname || '';
      if (location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1') return true;
      return !!(who && who());
    } catch(_e){ return false; }
  }
  KIVO.bsTechView = tech;
  KIVO.bsTechWho = function(fn){ who = typeof fn === 'function' ? fn : null; };
  function show(raw){
    try{
      var t = tech();
      var d = document.getElementById('bsErrBar');
      if(!d){ d = document.createElement('div'); d.id='bsErrBar'; d.setAttribute('role','status');
        d.style.cssText='position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;background:var(--bg-x7f1d1d);color:var(--fg-xffffff);font:700 11px/1.7 var(--font-ui,Tahoma,Arial);padding:8px 12px;border-radius:10px;box-shadow:var(--shadow-elevated);direction:rtl;text-align:right;cursor:pointer;word-break:break-word';
        d.title='انقر للإخفاء'; d.onclick=function(){ d.remove(); };
        (document.body||document.documentElement).appendChild(d); }
      d.textContent = t ? '⚠ خطأ تشغيل: ' + raw + '  — انقلها لي نصاً أو صورة' : 'حدث خلل غير متوقع — أعد فتح الشاشة';
      clearTimeout(hideT); hideT = t ? null : setTimeout(function(){ try { d.remove(); } catch(_e){} }, 6000);
    }catch(_e){}
  }
  window.addEventListener('error', function(e){
    var m = (e && e.message) || 'خطأ غير معروف';
    var w = (e && e.filename) ? (e.filename.split('/').pop() + ':' + e.lineno) : '';
    show(m + (w ? ' @ ' + w : ''));
  });
  window.addEventListener('unhandledrejection', function(e){
    try { console.warn('[unhandled rejection]', e && e.reason); } catch(_e){}
  });
})();
