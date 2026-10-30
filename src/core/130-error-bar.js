
/* شريط الأخطاء الظاهر — بديل وحدة التحكم لمن لا يفتحها: أي استثناء غير
   ملتقط يُعرض بنصّه وموضعه في شريط أحمر أسفل الشاشة، والنقر يخفيه.
   وجوده لا يغيّر أي سلوك — التقاط للعرض فقط. */
(function(){
  function show(msg){
    try{
      var d = document.getElementById('bsErrBar');
      if(!d){ d = document.createElement('div'); d.id='bsErrBar';
        d.style.cssText='position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;background:var(--bg-x7f1d1d);color:var(--fg-xffffff);font:700 11px/1.7 Tahoma,Arial;padding:8px 12px;border-radius:10px;box-shadow:var(--shadow-elevated);direction:rtl;text-align:right;cursor:pointer;word-break:break-all';
        d.title='انقر للإخفاء'; d.onclick=function(){ d.remove(); };
        (document.body||document.documentElement).appendChild(d); }
      d.textContent = '⚠ خطأ تشغيل: ' + msg + '  — انقلها لي نصاً أو صورة';
    }catch(_e){}
  }
  window.addEventListener('error', function(e){
    var m = (e && e.message) || 'خطأ غير معروف';
    var w = (e && e.filename) ? (e.filename.split('/').pop() + ':' + e.lineno) : '';
    show(m + (w ? ' @ ' + w : ''));
  });
  window.addEventListener('unhandledrejection', function(e){
    var r = e && e.reason; show('وعد مرفوض: ' + ((r && r.message) || String(r)).slice(0,180));
  });
})();
