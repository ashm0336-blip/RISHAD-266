
/* ── منع تظليل النص عند النقر على عناصر الواجهة ────────────────────────────────
   كان النقر المزدوج على كرت الشهر (وكل ما له نقرة مزدوجة: شرائح الأيام، المناطق
   على الخريطة، الخريطة نفسها — ١٢ موضعاً في أربع شاشات) يُظلّل النص داخله كأنه
   فقرة قابلة للنسخ. السلوك المتعارف عليه أن عناصر التحكم لا تُظلَّل.
   الحل من شقّين حتى لا نخسر النسخ:
   ١) تعطيل التظليل ثابتاً على عناصر التحكم الواضحة (أزرار، روابط، أيقونات).
   ٢) عند النقر المزدوج فقط، وإذا كان الهدف داخل عنصر قابل للنقر، نمنع التظليل —
      والسحب بنقرة واحدة يبقى يعمل في كل مكان، فأرقام الجوال والهويات وأسماء
      الموظفين تبقى قابلة للتحديد والنسخ كما هي. */
(function(){
  var css = 'button,a,svg,[role="button"],summary{-webkit-user-select:none;-moz-user-select:none;user-select:none}'
          + 'input,textarea,select,[contenteditable="true"]{-webkit-user-select:text;-moz-user-select:text;user-select:text}';
  function addCss(){
    if (document.getElementById('bs-nosel')) return;
    var st = document.createElement('style'); st.id = 'bs-nosel'; st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }
  if (document.head) addCss(); else document.addEventListener('DOMContentLoaded', addCss);

  function isTextField(el){
    if (!el || el.nodeType !== 1) return false;
    var t = el.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable;
  }
  /* عنصر «قابل للنقر»: زر أو رابط أو أي عنصر نسّقه التطبيق بمؤشر يد */
  function clickableAncestor(el){
    for (var n = el, i = 0; n && n.nodeType === 1 && i < 12; n = n.parentElement, i++) {
      if (n === document.body) return null;
      var t = n.tagName;
      if (t === 'BUTTON' || t === 'A' || t === 'LABEL' || n.getAttribute('role') === 'button') return n;
      var cs;
      try { cs = getComputedStyle(n); } catch (e) { continue; }
      if (cs && cs.cursor === 'pointer') return n;
    }
    return null;
  }
  document.addEventListener('mousedown', function(e){
    if (e.detail < 2) return;                      // النقرة الأولى وسحبها لا يُمسّان
    var t = e.target;
    if (!t || t.nodeType !== 1) return;
    if (isTextField(t) || (t.closest && t.closest('input,textarea,select,[contenteditable="true"]'))) return;
    if (!clickableAncestor(t)) return;             // نص عادي — يبقى التحديد بالنقر المزدوج متاحاً
    e.preventDefault();
    try { var s = window.getSelection(); if (s && !s.isCollapsed) s.removeAllRanges(); } catch (err) {}
  }, true);
})();
