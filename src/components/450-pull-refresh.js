/* ── السحب للتحديث في التطبيق المثبّت ────────────────────────────────────
   لا شريط متصفح في التطبيق، فبدل زر التحديث: اسحب الصفحة من أعلاها إلى الأسفل
   بالإصبع فتظهر حلقة، وعند تجاوز العتبة وترك الإصبع يُعاد تحميل الصفحة. */
(function(){
  function appMode(){ try { return (window.matchMedia && (window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || window.matchMedia("(display-mode: minimal-ui)").matches)) || window.navigator.standalone === true; } catch(e){ return false; } }
  if (!appMode() || !("ontouchstart" in window)) return;
  var TH = 88, startY = 0, pull = 0, active = false, el = null;
  function atTop(){ var se = document.scrollingElement || document.documentElement; if ((se.scrollTop || window.scrollY || 0) > 0) return false; var m = document.querySelector("main"); if (m && m.scrollTop > 0) return false; return true; }
  function box(){ if (el) return el; el = document.createElement("div"); el.setAttribute("dir","rtl"); el.style.cssText = "position:fixed;top:0;left:50%;transform:translate(-50%,-60px);z-index:400;display:flex;align-items:center;gap:8px;padding:7px 14px;border-radius:9999px;background:var(--bg-xffffff);color:var(--fg-x25343f);font:700 11.5px 'Cairo',sans-serif;box-shadow:var(--shadow-elevated);border:1px solid var(--bd-a185151810p35);transition:transform .12s;pointer-events:none;white-space:nowrap";
    el.innerHTML = '<svg id="bsPtrIco" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb99751)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transition:transform .15s"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg><span id="bsPtrTxt">اسحب للتحديث</span>'; document.body.appendChild(el); return el; }
  function scrollLocked(){ var ae = document.activeElement; if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.tagName === "SELECT")) return true; return !!document.querySelector('[style*="position:fixed"][style*="inset:0"], [style*="position: fixed"][style*="inset: 0"]'); }
  /* CANVAS-2 (W1): سطحٌ يملك إيماءاتِه (الخريطة: touch-action:none — السحبُ فيها تحريكٌ للعرض أو للعنصر) ليس سحباً للصفحة —
     كان سحبُ الخريطة إلى الأسفل في التطبيق المثبّت يُعيد تحميلَ الصفحة كلِّها في منتصف التحرير */
  function ownsGesture(n){ for (; n && n.nodeType === 1 && n !== document.body; n = n.parentNode) { if (n.style && n.style.touchAction === "none") return true; if (n.matches && n.matches("svg[data-map-zoom],svg[data-ds-zoom]")) return true; } return false; }
  window.addEventListener("touchstart", function(e){ if (e.touches.length !== 1 || !atTop() || scrollLocked() || ownsGesture(e.target)) { active = false; return; } startY = e.touches[0].clientY; pull = 0; active = true; }, { passive: true });
  window.addEventListener("touchmove", function(e){ if (!active) return; var dy = e.touches[0].clientY - startY; if (dy <= 0 || !atTop()) { pull = 0; if (el) el.style.transform = "translate(-50%,-60px)"; return; }
    pull = Math.min(dy * 0.55, 140); var b = box(); b.style.transform = "translate(-50%," + (pull - 50) + "px)"; var ok = pull >= TH; document.getElementById("bsPtrTxt").textContent = ok ? "حرّر للتحديث" : "اسحب للتحديث"; document.getElementById("bsPtrIco").style.transform = "rotate(" + Math.min(pull * 3, 360) + "deg)"; }, { passive: true });
  function end(){ if (!active) return; active = false; if (pull >= TH) { var b = box(); document.getElementById("bsPtrTxt").textContent = "جارٍ التحديث…"; b.style.transform = "translate(-50%,14px)";
      var rl9 = 0, go9 = function(){ if (rl9++) return; location.reload(); };
      try { var f9 = KIVO.__BS_SRV && KIVO.__BS_SRV.flushAsync ? KIVO.__BS_SRV.flushAsync(4000) : null;
            if (f9 && f9.then) f9.then(go9, go9); } catch(e){}
      setTimeout(go9, 4200); } else if (el) el.style.transform = "translate(-50%,-60px)"; pull = 0; }
  window.addEventListener("touchend", end, { passive: true }); window.addEventListener("touchcancel", end, { passive: true });
  try { document.documentElement.style.overscrollBehaviorY = "contain"; } catch(e){}
})();
