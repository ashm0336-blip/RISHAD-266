
/* ═ محرّك الجداول (bsTables): يعمّم المعالجة على كل .bs-rtable بلا استثناء ═
   (١) bs-fitcols + إعادة تثبيت أدنى عرضٍ (important) — يمنع الانكماش على الجوال
       ويجعل الجدول ينزلق أفقياً بدل أن ينكسر المحتوى إلى أسطر.
   (٢) يثبّت أعمدة الهوية: الأعمدة الضيّقة الأولى (تحديد/رقم) + أوّل عمود عريض
       (الاسم/التسمية) بحدٍّ أقصى ثلاثة أعمدة و٤٥٪ من عرض الجدول؛ يقرّرها مرّةً
       ويحفظها في data-bsfz، ثم يعيد تطبيق الأصناف بعد كل إعادة رسمٍ للصفوف.
   (٣) يضبط إزاحات الأعمدة المثبّتة من عرضها الفعلي — متينٌ مع أي بيانات ومقاس.
   المراقبةُ تعالج الجدولَ الذي تغيّر وحدَه؛ والجدولُ المخفيُّ (تعذّر قياسُه) يُعاد
   فحصُه مرّةً واحدةً بعد هدوء الطفرات — لا تمرّةً دوريّةً على الوثيقة كلِّها. */
(function(){
  var NARROW=70, MAXFZ=3;
  function colRow(tbl){
    var trs=tbl.querySelectorAll('thead tr'), best=null;
    for(var i=0;i<trs.length;i++){ if(!best||trs[i].children.length>best.children.length) best=trs[i]; }
    return best;
  }
  function minWidthFor(tbl,hr){
    var mw=tbl.style.minWidth;
    if(mw && /\d/.test(mw)) return mw;
    var n=(hr&&hr.children.length)||6;
    return Math.min(1600, Math.max(640, n*110))+'px';
  }
  function addCls(el,arr){ for(var i=0;i<arr.length;i++){ if(!el.classList.contains(arr[i])) el.classList.add(arr[i]); } }
  function clsFor(f,last){ var c=['bs-fz','bs-fz'+(f+1)]; if(f===last) c.push('bs-fzkeep'); return c; }
  function detectFrozen(tbl){
    var hr=colRow(tbl); if(!hr) return null;
    var kids=hr.children; if(!kids.length) return null;
    if(!kids[0].getBoundingClientRect().width) return null;   /* مخفي الآن → أعِد لاحقاً */
    var tw=tbl.getBoundingClientRect().width||1, out=[], acc=0;
    for(var i=0;i<kids.length;i++){
      var w=kids[i].getBoundingClientRect().width;
      if(i>0 && (acc+w)>tw*0.45) break;
      out.push(i); acc+=w;
      if(w>NARROW) break;
      if(out.length>=MAXFZ) break;
    }
    return out;
  }
  /* الموجة 2 · IRSZ-1: خلايا الصفّ عند مواضع الأعمدة المثبّتة بحسب مجموع colSpan لا عددِ الأبناء — نقصُ <th> واحدةٍ في آخر
     الترويسة (عمودُ الإجراءات في سجلّ الاسترشاد) كان يُسقط كلَّ صفوف الجسم من التثبيت فتبقى ترويسةُ العمود مثبّتةً فوق غيره.
     الصفُّ الذي يمرّ فيه عمودٌ مثبّتٌ داخل خليةٍ ممتدّة (صفُّ الحالة الفارغة · صفُّ مجموع) يُتجاوز كلُّه كما كان. */
  function cellsAt(row,pos){
    var kids=row.children, out=[], k=0, col=0;
    for(var g=0;g<pos.length;g++){
      while(k<kids.length && col+(kids[k].colSpan||1)<=pos[g]){ col+=kids[k].colSpan||1; k++; }
      if(k>=kids.length || (kids[k].colSpan||1)!==1) return null;
      out.push(kids[k]);
    }
    return out;
  }
  function applyFrozen(tbl,idxs){
    var hr=colRow(tbl); if(!hr) return;
    var hk=hr.children, last=idxs.length-1, pos=[];
    for(var f=0;f<idxs.length;f++){ if(hk[idxs[f]]) addCls(hk[idxs[f]], clsFor(f,last)); }
    for(var i=0,col=0;i<hk.length;i++){ for(var j=0;j<idxs.length;j++){ if(idxs[j]===i) pos[j]=col; } col+=hk[i].colSpan||1; }
    for(var q=0;q<idxs.length;q++){ if(pos[q]==null) return; }
    var rows=tbl.querySelectorAll('tbody tr'), multi=tbl.querySelectorAll('thead tr').length>1;   /* ترويسةٌ بصفّين: المطابقةُ بالعدد كما كانت */
    for(var r=0;r<rows.length;r++){
      if(multi && rows[r].children.length!==hk.length) continue;
      var cs=cellsAt(rows[r],pos); if(!cs) continue;
      for(var g=0;g<cs.length;g++) addCls(cs[g], clsFor(g,last));
    }
  }
  function setFzOn(ts){
    for(var i=0;i<ts.length;i++){
      var hr=ts[i].querySelector('thead tr'); if(!hr||hr.children.length<2) continue;
      var w0=hr.children[0].getBoundingClientRect().width, w1=hr.children[1].getBoundingClientRect().width;
      if(w0>0){ var a=w0+'px', b=(w0+w1)+'px', st=ts[i].style; if(st.getPropertyValue('--fz2')!==a) st.setProperty('--fz2', a); if(st.getPropertyValue('--fz3')!==b) st.setProperty('--fz3', b); }
    }
  }
  function setFz(){ setFzOn(document.querySelectorAll('table.bs-rtable.bs-fitcols')); }
  /* ═ صيغة الامتلاء bs-fill: يبدأ من 12.5px وينزل نصف نقطة حتى يتّسع أطول اسم في
     نصيبه من الصفّ بلا اقتطاع (أدناه 8.5px). يُعاد الضبط حين يتغيّر عرض الشريط أو
     نصوصه، أو إن ظهر اقتطاع لاحقاً (تحمّل الخطوط مثلاً). */
  function fitSubsegOn(fl){
    for(var f=0;f<fl.length;f++){
      var el=fl[f]; if(!el.offsetParent) continue;
      var bt=el.querySelectorAll('.bs-subbtn'); if(!bt.length) continue;
      var clips=function(){
        for(var i=0;i<bt.length;i++){
          if(bt[i].scrollWidth>bt[i].clientWidth+1) return true;
          var sp=bt[i].getElementsByTagName('span');
          for(var j=0;j<sp.length;j++){ if(sp[j].scrollWidth>sp[j].clientWidth) return true;
            /* الاقتطاع يبدأ بأجزاء البكسل — قِس النص نفسه لا الأعداد الصحيحة */
            try{ var rg=document.createRange(); rg.selectNodeContents(sp[j]); if(rg.getBoundingClientRect().width>sp[j].getBoundingClientRect().width+0.5) return true; }catch(e){} }
        }
        return el.scrollWidth>el.clientWidth+1;
      };
      var key=el.clientWidth+'|'+(el.textContent||'').replace(/\s+/g,' ').trim();
      if(el.getAttribute('data-bsfit')===key && !clips()) continue;
      var fs=12.5; el.style.setProperty('--bs-fs', fs+'px');
      var g=0; while(g++<9 && fs>8.5 && clips()){ fs-=0.5; el.style.setProperty('--bs-fs', fs+'px'); }
      el.setAttribute('data-bsfit', key);
    }
  }
  function fitSubseg(){ fitSubsegOn(document.querySelectorAll('.bs-subseg.bs-fill')); }
  var deferred = [];   /* جداولٌ تعذّر قياسُها (مخفيّة) — تُعاد وحدَها */
  function defer(tbl){ if (deferred.indexOf(tbl) === -1) deferred.push(tbl); }
  function runTables(ts){
    for(var i=0;i<ts.length;i++){
      var tbl=ts[i]; if(!tbl.isConnected) continue;
      if(!tbl.classList.contains('bs-fitcols')) tbl.classList.add('bs-fitcols');
      var hr=colRow(tbl), mw=minWidthFor(tbl,hr);
      if(tbl.style.getPropertyValue('min-width')!==mw || tbl.style.getPropertyPriority('min-width')!=='important')
        tbl.style.setProperty('min-width', mw, 'important');
      var memo=tbl.getAttribute('data-bsfz');
      if(memo===null){
        var det=detectFrozen(tbl);
        if(det===null){ defer(tbl); continue; }             /* مخفي → لا تقرّر الآن، أعِد لاحقاً */
        memo = det.length ? det.join(',') : 'none';
        tbl.setAttribute('data-bsfz', memo);
      }
      if(memo && memo!=='none'){
        var parts=memo.split(','), idxs=[];
        for(var k=0;k<parts.length;k++) idxs.push(+parts[k]);
        applyFrozen(tbl, idxs);
      }
    }
  }
  function runHs(hs){ for(var h=0;h<hs.length;h++){ var ov=hs[h].scrollWidth-hs[h].clientWidth>4; if(ov!==hs[h].classList.contains('bs-xgrab')) hs[h].classList.toggle('bs-xgrab', ov); } }
  function run(){
    runTables(document.querySelectorAll('table.bs-rtable'));
    runHs(document.querySelectorAll('.bs-hscroll'));
    fitSubseg();
    setFz();
  }
  /* المتأثّرُ بطفرة: الجدولُ/الشريطُ الحاضنُ للعقدة المتغيّرة، وما أُضيف تحتها */
  function collect(roots, sel){
    var out=[];
    function add(x){ if(x && out.indexOf(x)===-1) out.push(x); }
    for(var r=0;r<roots.length;r++){
      var el=roots[r]; if(!el||el.nodeType!==1||!el.isConnected) continue;
      try{ add(el.closest(sel)); var xs=el.querySelectorAll(sel); for(var i=0;i<xs.length;i++) add(xs[i]); }catch(e){}
    }
    return out;
  }
  function runScoped(roots){
    var ts=collect(roots,'table.bs-rtable');
    if(ts.length){ runTables(ts); var fz=[]; for(var i=0;i<ts.length;i++) if(ts[i].classList.contains('bs-fitcols')) fz.push(ts[i]); setFzOn(fz); }
    var hs=collect(roots,'.bs-hscroll'); if(hs.length) runHs(hs);
    var fl=collect(roots,'.bs-subseg.bs-fill'); if(fl.length) fitSubsegOn(fl);
  }
  /* المؤجَّل: مرةً واحدة بعد هدوء الطفرات (لا دورياً) */
  var defT=0;
  function retryDeferred(){
    defT=0; if(!deferred.length) return;
    var ds=deferred; deferred=[];
    var live=[]; for(var i=0;i<ds.length;i++) if(ds[i].isConnected && ds[i].getAttribute('data-bsfz')===null) live.push(ds[i]);
    if(live.length){ runTables(live); setFzOn(live); }
  }
  var pend=false, pendRoots=[];
  function schedule(){ if(pend) return; pend=true; setTimeout(function(){ KIVO.__bsAfterQuiet(function(){ pend=false; var rs=pendRoots; pendRoots=[]; runScoped(rs); if(deferred.length && !defT) defT=setTimeout(retryDeferred, 900); }); },60); }
  window.addEventListener('resize', setFz);
  window.addEventListener('resize', fitSubseg);
  try{ new MutationObserver(function(muts){ for(var i=0;i<muts.length && pendRoots.length<400;i++) pendRoots.push(muts[i].target); schedule(); }).observe(document.documentElement,{childList:true,subtree:true}); }catch(e){}
  KIVO.__bsTick.add(function(){ setFz(); fitSubseg(); retryDeferred(); }, "geo");   /* هندسة: مقاييسُ الأعمدة والأشرطة والمؤجَّل */
  KIVO.__bsTick.add(run);
  if(document.readyState!=='loading') run(); else document.addEventListener('DOMContentLoaded', run);
})();
