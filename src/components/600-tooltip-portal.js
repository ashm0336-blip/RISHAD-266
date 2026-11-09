
(function(){
  var portal = null, curIc = null;
  function ensure(){
    if(portal) return portal;
    portal = document.createElement('div');
    portal.id = 'bs-tip-portal';
    portal.style.cssText = 'position:fixed;z-index:2147483646;background:var(--bg-tooltip);color:var(--text-tooltip);border:1px solid var(--border-tooltip);border-radius:10px;padding:9px 12px;font-size:11.5px;line-height:1.75;text-align:right;direction:rtl;box-shadow:var(--shadow-tooltip);pointer-events:none;opacity:0;transition:opacity .15s ease;font-family:inherit';
    document.body.appendChild(portal);
    return portal;
  }
  function show(ic){
    /* مصدر المحتوى يحسم طريقة الإدراج: عقدة .bs-tip تحمل HTML مؤلَّفاً مقصوداً
       (آمن)، أما data-tip فمصدره سمة title وهي نصّ خام قد يكون اسم إدارة/موظف —
       يُدرَج نصّاً عبر textContent فلا يُنفَّذ أي وسم مثل <img onerror> (ثغرة XSS). */
    var html = null, isHtml = false;
    var tip = ic.querySelector ? ic.querySelector('.bs-tip') : null;
    if(tip){ html = tip.innerHTML; isHtml = true; }
    else if(ic.getAttribute) html = ic.getAttribute('data-tip');
    if(!html) return;
    var p = ensure();
    document.body.appendChild(p);
    p.style.width = 'auto'; p.style.maxWidth = '260px'; p.style.whiteSpace = 'normal';
    p.className = 'bs-tooltip';
    if(isHtml) p.innerHTML = html; else p.textContent = html;
    p.style.opacity = '0'; p.style.display = 'block';
    var r = ic.getBoundingClientRect(), pad = 10;
    // measure
    p.style.left = '0px'; p.style.top = '0px';
    var w = p.offsetWidth, h = p.offsetHeight;
    var left = r.left + r.width/2 - w/2;
    if(left < pad) left = pad;
    if(left + w > innerWidth - pad) left = innerWidth - pad - w;
    var top = r.bottom + 9, above = false;
    if(top + h > innerHeight - pad) { top = r.top - 9 - h; above = true; }
    /* CORE-02: أيقونةُ شريط المركز المطويّ — التلميحُ بجانبها نحو الصفحة (لا فوق الأيقونة التالية) */
    var rail = ic.closest ? ic.closest('.bsb--rail') : null, edge = rail ? rail.getBoundingClientRect().left : 0;
    var side = !!rail && edge - 9 - w >= pad;
    if(side){ left = edge - 9 - w; top = Math.max(pad, Math.min(innerHeight - pad - h, r.top + r.height/2 - h/2)); }
    p.style.left = left + 'px'; p.style.top = top + 'px';
    /* السهم: يتبع مركزَ العنصر (حتى بعد قصّ الحافة) ويقلب مع الحاوية */
    p.setAttribute('data-pos', side ? 'side' : above ? 'above' : 'below');
    p.style.setProperty('--tip-ax', Math.max(12, Math.min(w - 12, r.left + r.width/2 - left)) + 'px');
    requestAnimationFrame(function(){ p.style.opacity = '1'; });
  }
  var supIc = null;
  function hide(){ if(portal){ portal.style.opacity = '0'; portal.style.display = 'none'; } curIc = null; }
  document.addEventListener('mouseover', function(e){
    var t = e.target;
    if(t && t.closest){
      var titled = t.closest('[title]');
      if(titled && titled.getAttribute('title')){
        titled.setAttribute('data-tip', titled.getAttribute('title'));
        titled.removeAttribute('title');
      }
    }
    var ic = t && t.closest ? t.closest('.bs-info,.bs-tip-host,[data-tip]') : null;
    /* بعد الضغط يبقى التلميح مكتوماً ما دام المؤشر على العنصر نفسه */
    if(supIc){ if(ic === supIc) return; supIc = null; }
    if(ic && ic !== curIc){ curIc = ic; show(ic); }
    else if(!ic && curIc){ hide(); }
  }, true);
  /* الضغط على الزر يُخفي تلميحه فوراً — كسلوك المواقع المحترفة */
  document.addEventListener('pointerdown', function(e){
    var t = e.target;
    var ic = t && t.closest ? t.closest('.bs-info,.bs-tip-host,[data-tip]') : null;
    supIc = ic || curIc;
    if(curIc || ic) hide();
  }, true);
  /* CORE-02: في شريط المركز المطويّ يظهر اسمُ الأيقونة عند التركيز بلوحة المفاتيح أيضاً (لا بالتحويم وحده) */
  document.addEventListener('focusin', function(e){
    var t = e.target;
    if(!t || !t.closest || !t.closest('.bsb--rail') || !t.matches(':focus-visible')) return;
    if(t.getAttribute('title')){ t.setAttribute('data-tip', t.getAttribute('title')); t.removeAttribute('title'); }
    if(t.getAttribute('data-tip')){ supIc = null; curIc = t; show(t); }
  }, true);
  document.addEventListener('focusout', function(e){ if(curIc && e.target === curIc) hide(); }, true);
  document.addEventListener('scroll', hide, true);
  document.addEventListener('wheel', function(e){
    if (e.target && e.target.closest && e.target.closest('svg[data-map-zoom]')) e.preventDefault();
  }, { passive: false });
  // suppress inline tips entirely
  var st = document.createElement('style');
  st.textContent = '.bs-tip{display:none !important} #bs-tip-portal b{color:var(--brand-tooltip);font-weight:600}' + '#bs-tip-portal::after{content:"";position:absolute;width:8px;height:8px;left:calc(var(--tip-ax,50%) - 4px);top:-5px;background:var(--bg-tooltip);border-left:1px solid var(--border-tooltip);border-top:1px solid var(--border-tooltip);transform:rotate(45deg)}' + '#bs-tip-portal[data-pos=above]::after{top:auto;bottom:-5px;border:0;border-right:1px solid var(--border-tooltip);border-bottom:1px solid var(--border-tooltip)}' + '#bs-tip-portal[data-pos=side]::after{left:auto;right:-5px;top:calc(50% - 4px);border:0;border-top:1px solid var(--border-tooltip);border-right:1px solid var(--border-tooltip)}';
  document.head.appendChild(st);
})();
