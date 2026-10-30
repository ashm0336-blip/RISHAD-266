
/* ═ توحيد أشرطة تبويبات ترويسة الصفحات على مكوّن bs-tabstrip ═
   بعض الحاويات (كالخطة التشغيلية) تُبنى بنفس تنسيق شريط «موظفي الإدارة» لكن بلا
   صنفه، فتتكوّم عمودياً على الجوال بدل أن تنزلق أفقياً. هنا نكشف أي شريط ترويسة
   يحمل بصمة التنسيق نفسها ولا يحمل الصنف، فنضيف bs-hbar bs-tabstrip — فيصير شريطاً
   أفقياً واحداً ينزلق على الجوال بنفس تصميم وسلوك تبويبات موظفي الإدارة، بلا استثناء.
   المراقبةُ تفحص العقدَ المضافةَ وحدَها (وما تحتها)، لا كلَّ div[style] في الوثيقة. */
(function(){
  function check(el){
    var s=el.style;
    if(s && s.display==='flex' && s.alignItems==='center' && s.justifyContent==='center'
       && s.flexWrap==='wrap' && s.gap==='8px' && s.paddingTop==='4px' && s.paddingLeft==='0px'
       && el.children.length>=2 && el.children.length<=6
       && !el.classList.contains('bs-tabstrip')){
      var c0=el.children[0];
      try{ if(c0 && getComputedStyle(c0).cursor==='pointer'){ el.classList.add('bs-hbar'); el.classList.add('bs-tabstrip'); } }catch(e){}
    }
  }
  function unifyIn(root){
    if(!root||root.nodeType!==1||!root.isConnected) return;
    if(root.tagName==='DIV' && root.hasAttribute('style')) check(root);
    var ds=root.querySelectorAll('div[style]');
    for(var i=0;i<ds.length;i++) check(ds[i]);
  }
  function unify(){ unifyIn(document.body||document.documentElement); }
  var pend=false, pendNodes=[];
  function sched(){ if(pend) return; pend=true; setTimeout(function(){ KIVO.__bsAfterQuiet(function(){ pend=false; var ns=pendNodes; pendNodes=[]; for(var i=0;i<ns.length;i++) unifyIn(ns[i]); }); },80); }
  try{ new MutationObserver(function(muts){ for(var i=0;i<muts.length;i++){ var a=muts[i].addedNodes; for(var j=0;j<a.length && pendNodes.length<400;j++) if(a[j].nodeType===1) pendNodes.push(a[j]); } if(pendNodes.length) sched(); }).observe(document.documentElement,{childList:true,subtree:true}); }catch(e){}
  KIVO.__bsTick.add(unify);
  if(document.readyState!=='loading') unify(); else document.addEventListener('DOMContentLoaded', unify);
})();
