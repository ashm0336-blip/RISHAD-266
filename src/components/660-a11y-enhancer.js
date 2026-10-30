
/* ═══ طبقة تحسين الإتاحة (Accessibility) ═══
   لا تغيّر أي سلوك: تُسمّي الحقول من عناوينها المرئية، وتجعل العناصر
   التفاعلية (التبويبات، القوائم) قابلةً للتشغيل بلوحة المفاتيح، وتُظهر
   إطار التركيز. تُعاد بعد كل إعادة رسم عبر MutationObserver — كمعالج
   القوائم المنسدلة تماماً. */
(function(){
  "use strict";
  try{ if(!document.documentElement.getAttribute("lang")){ document.documentElement.setAttribute("lang","ar"); } }catch(e){}
  try{
    var st=document.createElement("style"); st.setAttribute("data-a11y","1");
    st.textContent=":focus-visible{outline:2px solid var(--focus-ring)!important;outline-offset:2px!important;border-radius:6px}"+
      "@media(prefers-reduced-motion:reduce){*{animation-duration:.001ms!important;transition-duration:.001ms!important;scroll-behavior:auto!important}}";
    (document.head||document.documentElement).appendChild(st);
  }catch(e){}
  function clean(s){ return (s||"").replace(/\s+/g," ").replace(/[*:：]\s*$/,"").trim(); }
  function nameFor(el){
    try{ if(el.id){ var esc=(window.CSS&&CSS.escape)?CSS.escape(el.id):el.id; var l=document.querySelector('label[for="'+esc+'"]'); if(l){var t=clean(l.textContent); if(t)return t;} } }catch(e){}
    var w=el.closest?el.closest("label"):null; if(w){ var wt=clean(w.textContent); if(wt) return wt; }
    var g=el;
    for(var i=0;i<3&&g;i++){ g=g.parentElement; if(!g)break; var lab=g.querySelector?g.querySelector("label"):null; if(lab){ var lt=clean(lab.textContent); if(lt) return lt; } }
    return clean(el.getAttribute("title"))||clean(el.getAttribute("placeholder"))||"";
  }
  function enhance(root){
    try{
      var R = (root && root.nodeType === 1 && root.isConnected) ? root : document;
      var i, c=R.querySelectorAll("input,select,textarea");
      if (R !== document && R.matches && R.matches("input,select,textarea")) c = [R].concat(Array.prototype.slice.call(c));
      for(i=0;i<c.length;i++){ var el=c[i]; if(el.__a11y)continue; el.__a11y=1;
        if(el.type==="hidden")continue;
        if(el.getAttribute("aria-label")||el.getAttribute("aria-labelledby"))continue;
        var nm=nameFor(el); if(nm) el.setAttribute("aria-label", nm);
      }
      var b=R.querySelectorAll('button,[role="button"]');
      for(i=0;i<b.length;i++){ var bt=b[i]; if(bt.__a11yb)continue; bt.__a11yb=1;
        if(bt.getAttribute("aria-label")||bt.getAttribute("aria-labelledby"))continue;
        if(clean(bt.textContent))continue;
        var tt=clean(bt.getAttribute("title")); if(tt) bt.setAttribute("aria-label", tt);
      }
      /* KIVO_263 · SOT-058 (لا اعتمادَ على hover): ما يكشفه المرورُ بالفأرة (تلميحُ المعلومة · نقاطُ الرسم) يُكشف بالتركيز أيضاً —
         لمسةٌ على الجوال أو Tab بلوحة المفاتيح تركّزه فيظهر (‎:focus في الأنماط)، ونصُّ التلميح اسمُه للقارئ */
      var hv=R.querySelectorAll(".bs-info,.dz-hz");
      for(i=0;i<hv.length;i++){ var h=hv[i]; if(h.__a11yh)continue; h.__a11yh=1;
        if(!h.hasAttribute("tabindex")) h.setAttribute("tabindex","0");
        if(!h.getAttribute("aria-label")){ var tp=h.querySelector(".bs-tip,.dz-tip"); var tn=clean(tp?tp.textContent:""); if(tn) h.setAttribute("aria-label", tn); }
      }
      var d=R.querySelectorAll("div,span");
      if (R !== document && (R.tagName === "DIV" || R.tagName === "SPAN")) d = [R].concat(Array.prototype.slice.call(d));
      for(i=0;i<d.length;i++){ var e2=d[i]; if(e2.__a11yk)continue;
        var s=e2.getAttribute("style"); if(!s||(s.indexOf("cursor:pointer")===-1&&s.indexOf("cursor: pointer")===-1))continue;
        e2.__a11yk=1;
        if(e2.hasAttribute("tabindex")||e2.getAttribute("role")==="button")continue;
        if(e2.closest("button,a"))continue;
        if(e2.querySelector("button,a,input,select,textarea"))continue;
        e2.setAttribute("role","button"); e2.setAttribute("tabindex","0");
        if(!e2.getAttribute("aria-label")){ var kn=clean(e2.textContent)||clean(e2.getAttribute("title")); if(kn) e2.setAttribute("aria-label", kn); }
      }
    }catch(e){}
  }
  document.addEventListener("keydown",function(e){
    if(e.key!=="Enter"&&e.key!==" "&&e.key!=="Spacebar")return;
    var el=e.target; if(!el||!el.getAttribute)return;
    var tg=el.tagName, role=el.getAttribute("role");
    /* KIVO_254 (AUD-020): روابطُ التنقّل <a> بلا href (التوجيهُ بالحالة لا بالعنوان) تُفعَّل بـEnter كالروابط الحقيقية؛ وعناصرُ role=button غيرُ الأصلية بـEnter/Space */
    var linkless=(tg==="A"&&!el.hasAttribute("href"));
    if(linkless){ if(e.key!=="Enter")return; e.preventDefault(); try{el.click();}catch(x){ /* كالنقر: فشلُ المعالج شأنُ الصفحة */ } return; }
    if(role!=="button")return;
    if(tg==="BUTTON"||tg==="A"||tg==="INPUT"||tg==="SELECT"||tg==="TEXTAREA")return;
    e.preventDefault(); try{el.click();}catch(x){}
  },true);
  /* KIVO_254 · SOT-055/058 (البند ٤ من RM-3): على أجهزة اللمس (pointer: coarse) كلُّ هدفٍ تفاعليّ أصغرُ من 44×44 يحصل على حاشيةٍ شفافة
     (::after) تكمّل مساحةَ الاستجابة إلى 44 بكسل دون تغيير شكله ولا تخطيطه — لا يُمسّ عنصرٌ موضوعٌ absolute/fixed أو يستعمل ::after أصلاً. */
  var COARSE=false; try{ COARSE=!!(window.matchMedia&&window.matchMedia("(pointer: coarse)").matches); }catch(e){ /* بلا matchMedia = لا حاشية */ }
  var TAPSEL='button,a,[role="button"],[role="link"],input[type="checkbox"],input[type="radio"],select,summary';
  /* KIVO_254 (تصحيح — اكتُشف في بوابة 254): الحاشيةُ تُحسب من المقاس الحاليّ كلّما تغيّر لا مرّةً واحدة لحظةَ الإضافة.
     كان القياسُ الوحيد يسبق أحياناً اكتمالَ الخط فيُبقي حاشيةَ مقاسٍ زائل (زرٌّ صار 34 بكسل بحاشية 37 = 41 < 44)،
     أو يتخطّى هدفاً كان ≥ 44 ثم صغُر — فتتأرجح حصّةُ الأهداف بين تشغيلٍ وآخر. ResizeObserver يعيد الحساب عند كلّ تغيّر. */
  /* KIVO_259 (إصلاح — كشفه k258layout على اللوحي): الحاشيتان المتجاورتان كانتا تتراكبان فيسرق الهدفُ اللاحقُ في الوثيقة نقراتِ سابقه —
     زرّا الزيادة/الإنقاص (26×14.5) في الإرشاد والمضبوطات: حاشيةُ «إنقاص» (14.75px فوقه) تغطي «زيادة» كلَّه فنقرُ «+» يُنقص.
     الآن تُحسب الحاشيةُ لكل جهةٍ على حدة (--bs-tt/tb/tl/tr): لا تبلغ مستطيلَ أقرب هدفٍ تفاعليٍّ مجاورٍ في تلك الجهة أبداً (فمركزُ كلِّ هدفٍ
     ومستطيلُه له وحده)، وما قُصّ من جهةٍ يُعوَّض من مقابلتها. القراءةُ كلُّها (المستطيلُ والجيران) قبل الكتابة؛ وهدفٌ يُحشى أوّلَ مرّةٍ يضمّ
     جيرانَه المحشوّين إلى الدفعة نفسِها (جارٌ ظهر بعدهم) — بلا حلقة. */
  function nbOf(el){
    var out=[], host=el.parentElement&&(el.parentElement.parentElement||el.parentElement), c, i, n, q;
    if(!host) return out;
    c=host.querySelectorAll(TAPSEL);
    for(i=0;i<c.length&&i<80;i++){ n=c[i]; if(n===el||n.contains(el)||el.contains(n)) continue; q=n.getBoundingClientRect(); if(q.width&&q.height) out.push({e:n,r:q}); }
    return out;
  }
  function padOf(r,nb){
    /* سقفُ كلِّ جهة = الفجوةُ إلى أقرب جارٍ فيها (تلامسُ الحدّ لا تراكب) ضمن أقصى حاشيةٍ ممكنة (الحاجةُ كلُّها في جهةٍ واحدة) — فلا تمسّ الحاشيةُ مستطيلَ
       جارٍ أبداً (ما بين الهدفين فجوةٌ لا يملكها أحدهما)؛ ثم تُوزَّع الحاجةُ نصفين وما قصّه السقفُ في جهةٍ يُعطى للمقابلة إن اتّسعت — فيبلغ الهدفُ 44 حيث أمكن */
    var nh=Math.max(0,44-r.width), nv=Math.max(0,44-r.height), cT=1e9, cB=1e9, cL=1e9, cR=1e9, i, q, gU, gD, gL, gR, best, T, B, Lf, Rt;
    for(i=0;i<nb.length;i++){ q=nb[i].r;
      if(q.right<=r.left-nh||q.left>=r.right+nh||q.bottom<=r.top-nv||q.top>=r.bottom+nv) continue;   /* أبعدُ من أقصى حاشية */
      gU=q.bottom<=r.top?r.top-q.bottom:-1; gD=q.top>=r.bottom?q.top-r.bottom:-1; gL=q.right<=r.left?r.left-q.right:-1; gR=q.left>=r.right?q.left-r.right:-1;
      best=Math.max(gU,gD,gL,gR); if(best<0) continue;   /* متراكبان أصلاً — لا تصلحه حاشية */
      if(best===gU) cT=Math.min(cT,gU); else if(best===gD) cB=Math.min(cB,gD); else if(best===gL) cL=Math.min(cL,gL); else cR=Math.min(cR,gR);
    }
    T=Math.min(cT,nv/2); B=Math.min(cB,nv/2); T=Math.min(cT,nv-B); B=Math.min(cB,nv-T);
    Lf=Math.min(cL,nh/2); Rt=Math.min(cR,nh/2); Lf=Math.min(cL,nh-Rt); Rt=Math.min(cR,nh-Lf);
    return [T,B,Lf,Rt];
  }
  /* الأسماءُ حرفيةٌ في setProperty: حارسُ الرموز (chkvar) يعدّ ما يُضبط وقتَ التشغيل معرَّفاً بقراءة هذا النصّ */
  function padTo(el,r,nb){
    if(!r.width||!r.height) return;
    var p=(r.width>=44&&r.height>=44)?[0,0,0,0]:padOf(r,nb||[]), f=function(x){ return (-Math.floor(x*10)/10).toFixed(1)+"px"; };
    if(p[0]<0.05&&p[1]<0.05&&p[2]<0.05&&p[3]<0.05){ if(el.classList.contains("bs-tap")){ el.classList.remove("bs-tap"); el.style.removeProperty("--bs-tt"); el.style.removeProperty("--bs-tb"); el.style.removeProperty("--bs-tl"); el.style.removeProperty("--bs-tr"); } return; }
    el.classList.add("bs-tap"); el.style.setProperty("--bs-tt",f(p[0])); el.style.setProperty("--bs-tb",f(p[1])); el.style.setProperty("--bs-tl",f(p[2])); el.style.setProperty("--bs-tr",f(p[3]));
  }
  var RO=null;
  try{ if(COARSE&&window.ResizeObserver) RO=new ResizeObserver(function(ents){
    /* قراءةٌ ثم كتابة (بلا تناوبٍ يُجبر التخطيط) — والكتابةُ لا تغيّر مقاسَ العنصر نفسِه (::after مطلقٌ داخله) فلا حلقة */
    /* هدفٌ يُحشى أوّلَ مرّة يضمّ جيرانَه المحشوّين إلى الدفعة نفسِها (قراءتُهم قبل أيّ كتابة) — لا إعادةَ مراقبةٍ داخل الاستدعاء
       (كانت تُطلق «ResizeObserver loop completed with undelivered notifications» فيظهر شريطُ الأخطاء) */
    var i, j, t, n, rs=[], nbs=[], L=[], seen=new Set();
    for(i=0;i<ents.length;i++){ t=ents[i].target; if(!seen.has(t)){ seen.add(t); L.push(t); } }
    for(i=0;i<L.length;i++){ t=L[i]; if(!t.isConnected){ rs.push(null); nbs.push(null); continue; } rs.push(t.getBoundingClientRect()); nbs.push(nbOf(t));
      if(!t.__a11yp) for(j=0;j<nbs[i].length;j++){ n=nbs[i][j].e; if(n.__a11yp&&n.classList.contains("bs-tap")&&!seen.has(n)){ seen.add(n); L.push(n); } } }
    for(i=0;i<L.length;i++){ t=L[i]; if(!rs[i]){ RO.unobserve(t); t.__a11yt=0; continue; } padTo(t,rs[i],nbs[i]); t.__a11yp=1; }
  }); }catch(e){ RO=null; /* متصفحٌ بلا ResizeObserver: قياسٌ مرّةً واحدة كما كان */ }
  function tapify(root){
    if(!COARSE) return;
    try{
      var R=(root&&root.nodeType===1&&root.isConnected)?root:document, i;
      var c=R.querySelectorAll(TAPSEL);
      if(R!==document&&R.matches&&R.matches(TAPSEL)) c=[R].concat(Array.prototype.slice.call(c));
      for(i=0;i<c.length;i++){ var el=c[i]; if(el.__a11yt) continue;
        var r=el.getBoundingClientRect(); if(!r.width||!r.height) continue; /* غيرُ معروضٍ بعد — تمرّةٌ لاحقة */
        el.__a11yt=1;
        var cs=getComputedStyle(el); if(cs.position!=="static"&&cs.position!=="relative") continue;
        var af=getComputedStyle(el,"::after"); if(af&&af.content&&af.content!=="none"&&af.content!=='""') continue;
        if(RO) RO.observe(el); else padTo(el,r,nbOf(el));
      }
    }catch(e){ /* تحسينٌ لا يُسقط الصفحة */ }
  }
  function boot(){ enhance(); tapify();
    /* العقدُ المضافةُ وحدَها — لا كلُّ حقلٍ وزرٍّ وdiv في الوثيقة بعد كلِّ طفرة */
    try{ var pend=false, pendNodes=[]; var mo=new MutationObserver(function(muts){ for(var i=0;i<muts.length;i++){ var a=muts[i].addedNodes; for(var j=0;j<a.length && pendNodes.length<400;j++) if(a[j].nodeType===1) pendNodes.push(a[j]); } if(pend||!pendNodes.length)return; pend=true; setTimeout(function(){ KIVO.__bsAfterQuiet(function(){ pend=false; var ns=pendNodes; pendNodes=[]; for(var k=0;k<ns.length;k++){ enhance(ns[k]); tapify(ns[k]); } }); },150); });
      mo.observe(document.body,{childList:true,subtree:true}); }catch(e){}
    try{ KIVO.__bsTick.add(function(){ enhance(); tapify(); }); }catch(e){}
  }
  if(document.body) boot(); else document.addEventListener("DOMContentLoaded", boot);
})();
