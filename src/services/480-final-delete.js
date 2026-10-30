
/* ── الحذف النهائي ────────────────────────────────────────────────────────────
   القاعدة: أي عنصر يُحذف يُمحى أثره من كل مكان — فإن أُعيد إدخاله لاحقاً بدأ
   عنصراً جديداً كلياً بلا ذاكرة سابقة. هنا الأدوات المشتركة بين الصفحات:
   ١) كنس صور الخرائط اليتيمة من IndexedDB (كانت تبقى للأبد وتُحزم في كل نسخة
      احتياطية رغم أن مواقعها حُذفت)، ومرجعها كل مفاتيح التخزين لكل الإدارات
      فلا تُمسّ صورة ما زالت مستعملة في إدارة أو شهر آخر.
   ٢) كنس أثر عنصر من خطة/جولات (تمريرة موحّدة بدل تكرارها في كل صفحة). */
(function(){
  var RAW = KIVO.__BS_RAWLS;
  function allKeys(){
    if (RAW && RAW.allKeys) { try { return RAW.allKeys(); } catch(e){} }
    var out = []; try { for (var i=0;i<localStorage.length;i++) out.push(localStorage.key(i)); } catch(e){}
    return out;
  }
  function readRaw(k){
    try { return (RAW && RAW.getItem ? RAW.getItem.call(localStorage, k) : localStorage.getItem(k)) || ""; } catch(e){ return ""; }
  }
  /* كل معرّفات الصور المذكورة في أي مفتاح تخزين — عبر كل الإدارات.
     والتعبيرُ هو عينُ تعبير الخادم (imgIdsIn) بادئةً بادئة: img_ للخطة
     والجلسات و«ملفي» (img_tsk)، و szp_ للمضبوطات. كان يقتصر على img_
     فتُعَدُّ صورةُ بلاغِ مضبوطاتٍ مربوطةً «بلا مرجع» فيحذفها الكنسُ والبلاغُ
     ما زال يشير إليها — فرقُ دلالةٍ بين طرفين لا يُغتفر في الحذف. */
  function referencedImages(){
    var ids = {}, R = KIVO.BassamImgRefs;
    allKeys().forEach(function(k){ var l = R ? R.idsIn(readRaw(k)) : []; for (var i=0;i<l.length;i++) ids[l[i]] = 1; });
    return ids;
  }
  /* في وضع الخادم لا يحمل المتصفح إلا مفاتيح إدارة المستخدم، فصور الإدارات الأخرى
     لا تظهر «مُشار إليها» رغم أنها حيّة — لذا لا تُحذف إلا صورة سبق أن رآها هذا
     المتصفح مُشاراً إليها في مفاتيحه (أو رفعها هو). و«keep» يحمي صورةً قديمة
     أثناء استبدالها حتى يُعرف مصير الرفع الجديد. */
  var SEEN = {}, KEEP = {}, onSrv = !!(window.__BS_BOOT && window.__BS_BOOT.srv);
  function noteSeen(){ try { Object.keys(referencedImages()).forEach(function(k){ SEEN[k] = 1; }); } catch(e){} }
  noteSeen(); try { window.addEventListener("load", noteSeen); } catch(e){}
  KIVO.BassamPurge = {
    referencedImages: referencedImages,
    seen: function(k){ if (k) SEEN[k] = 1; },
    keep: function(k){ if (k) KEEP[k] = Date.now(); },
    unkeep: function(k){ if (k) delete KEEP[k]; },
    /* يحذف كل صورة لم يعد يشير إليها أي مفتاح — يُستدعى بعد كل حذف/استبدال */
    gcImages: function(){
      if (!KIVO.BassamIDB) return Promise.resolve(0);
      var inflight = (KIVO.__BS_IMG_INFLIGHT || []).slice();
      return Promise.all(inflight.map(function(p){ return p.catch(function(){}); }))
        .then(function(){ return new Promise(function(r){ setTimeout(r, 120); }); })
        .then(function(){ return KIVO.BassamIDB.getAll(); })
        .then(function(all){
          var live = referencedImages(), gone = [], now = Date.now();
          Object.keys(all || {}).forEach(function(k){
            if (live[k]) return;
            if (KEEP[k] && now - KEEP[k] < 18e4) return;
            if (onSrv && !SEEN[k]) return;
            gone.push(k);
          });
          Object.keys(live).forEach(function(k){ SEEN[k] = 1; });
          gone.forEach(function(k){ try { KIVO.BassamIDB.del(k); } catch(e){} });
          return gone.length;
        }).catch(function(){ return 0; });
    },
    /* تمريرة موحّدة على كل «أوراق» البيانات: جذر الخطة، مواقعها، لقطات أشهرها،
       ومواقع كل جولة. fn(fd) يعدّل الورقة موضعياً. */
    sweepAll: function(fn){
      var touched = 0;
      try {
        var pl = JSON.parse(localStorage.getItem("bassam_plan_v1"));
        if (pl) {
          fn(pl);
          if (Array.isArray(pl.floors)) pl.floors.forEach(fn);
          if (pl.months) Object.keys(pl.months).forEach(function(k){
            var e = pl.months[k], d = e ? (Array.isArray(e) ? e : e.d) : null;
            if (Array.isArray(d)) d.forEach(fn);
          });
          localStorage.setItem("bassam_plan_v1", JSON.stringify(pl)); touched++;
        }
      } catch(e){}
      try {
        var r = JSON.parse(localStorage.getItem("bassam_rounds_v1"));
        if (r && typeof r === "object") {
          Object.keys(r).forEach(function(k){ var rec = r[k]; if (rec && Array.isArray(rec.d)) rec.d.forEach(fn); });
          localStorage.setItem("bassam_rounds_v1", JSON.stringify(r)); touched++;
        }
      } catch(e){}
      return touched;
    }
  };
})();
