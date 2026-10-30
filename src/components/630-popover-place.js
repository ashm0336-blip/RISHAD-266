
(function(){
  var SIG = '0px 12px 32px -8px';
  function place(el, anchor, centered, alignLeft){
    if (!el.isConnected) return;
    var ar = anchor.getBoundingClientRect();
    if (!ar.width && !ar.height) return; // layout not ready yet
    var w = el.offsetWidth, h = Math.max(el.scrollHeight, el.offsetHeight);
    var pad = 8;
    var left;
    if (centered) left = ar.left + ar.width / 2 - w / 2;
    else if (alignLeft) left = ar.left;
    else left = ar.right - w;
    left = Math.max(pad, Math.min(window.innerWidth - w - pad, left));
    var top = ar.bottom + 4;
    if (top + h > window.innerHeight - pad) top = Math.max(pad, ar.top - h - 4);
    el.style.position = 'fixed';
    el.style.top = top + 'px';
    el.style.left = left + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.transform = 'none';
    el.style.marginTop = '0';
    el.style.zIndex = '2147483000';
    el.style.maxHeight = Math.min(h, window.innerHeight - top - pad) + 'px';
    el.style.overflowY = 'auto';
  }
  var live = [];
  function fixPanel(el){
    if (el.__ddFixed) return;
    var st = el.getAttribute('style') || '';
    /* R177: الوسمُ الصريح data-bs-dd — الظلُّ الحرفيّ وحده صار ‎var(--shadow-elevated)‎ منذ توحيد الظلال */
    if (st.indexOf(SIG) === -1 && !(el.hasAttribute && el.hasAttribute('data-bs-dd'))) return;
    var cs = getComputedStyle(el);
    if (cs.position !== 'absolute') return;
    var anchor = el.parentElement; if (!anchor) return;
    el.__ddFixed = true;
    var centered = st.indexOf('translateX(-50%)') > -1 || st.indexOf('left:50%') > -1 || st.indexOf('left: 50%') > -1;
    var alignLeft = st.indexOf('left: 0px') > -1 && st.indexOf('right: 0px') === -1;
    var entry = { el: el, anchor: anchor, c: centered, l: alignLeft };
    live.push(entry);
    place(el, anchor, centered, alignLeft);
    // re-measure after layout settles (KPI charts/images above may still be reflowing)
    requestAnimationFrame(function(){ place(el, anchor, centered, alignLeft);
      requestAnimationFrame(function(){ place(el, anchor, centered, alignLeft); }); });
    setTimeout(function(){ place(el, anchor, centered, alignLeft); }, 120);
  }
  function replaceAll(){
    for (var i = live.length - 1; i >= 0; i--) {
      if (!live[i].el.isConnected) { live.splice(i, 1); continue; }
      place(live[i].el, live[i].anchor, live[i].c, live[i].l);
    }
  }
  window.addEventListener('scroll', replaceAll, true);
  window.addEventListener('resize', replaceAll);
  function scan(root){
    if (root.nodeType !== 1) return;
    var st = root.getAttribute && (root.getAttribute('style') || '');
    if ((st && st.indexOf(SIG) > -1) || (root.hasAttribute && root.hasAttribute('data-bs-dd'))) fixPanel(root);
    if (root.querySelectorAll) {
      var list = root.querySelectorAll('div[style*="' + SIG + '"],div[data-bs-dd]');
      for (var i = 0; i < list.length; i++) fixPanel(list[i]);
    }
  }
  new MutationObserver(function(muts){
    for (var i = 0; i < muts.length; i++) {
      for (var j = 0; j < muts[i].addedNodes.length; j++) scan(muts[i].addedNodes[j]);
      if (muts[i].removedNodes.length) {
        for (var k = live.length - 1; k >= 0; k--) if (!live[k].el.isConnected) live.splice(k, 1);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Close any open dropdown/menu panel when clicking anywhere outside it —
  // standard behavior on professional sites. Works by re-clicking the
  // panel's own toggle button so the component state stays in sync.
  document.addEventListener('mousedown', function(ev){
    var panels = document.querySelectorAll('div[style*="12px 32px -8px"],div[data-bs-dd]');
    for (var i = 0; i < panels.length; i++) {
      var el = panels[i];
      if (!el.__ddFixed) continue;
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      var anchor = el.parentElement;
      if (el.contains(ev.target)) continue;
      if (anchor && anchor.contains(ev.target) && !el.contains(ev.target)) {
        // click on the toggle itself — let the toggle handle open/close
        continue;
      }
      // ':scope > button' فقط: زر التبديل المباشر — لا أي زر داخل اللوحة نفسها.
      var btn = null;
      if (anchor) {
        try { btn = anchor.querySelector(':scope > button'); } catch (eSc) { btn = null; }
        if (!btn) {
          var ch = anchor.children;
          for (var q = 0; q < ch.length; q++) { if (ch[q] !== el && ch[q].tagName === 'BUTTON') { btn = ch[q]; break; } }
        }
      }
      if (btn && !el.contains(btn)) {
        if (el.__ddLastClose && Date.now() - el.__ddLastClose < 400) continue; // لا تكرار لا نهائي حين يكون المبدّل معطّلاً
        el.__ddLastClose = Date.now();
        try { btn.click(); } catch (e) {}
      }
    }
  }, true);
})();
