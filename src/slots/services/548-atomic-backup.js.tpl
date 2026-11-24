/* One backup transport for admin, department settings and the authenticated gate.
   Files/tickets remain in memory. No local storage overlay or image upload. */
/* V7 · د6: النسخةُ تُرسل على أجزاء (POST /api/backup/import — 019g): حدُّ الطلب 8MB لا يُرفع، ونسخةُ إدارةٍ حقيقية 31MB (مفتاحٌ واحد 8.4MB).
   prepare = بدءٌ ← أجزاءُ نصّ الملف (بلا صوره) ← الصورُ واحدةً واحدة ← فحصُ الخادم (بلا كتابة) · send = الاعتمادُ (طلبٌ صغير، دفعةٌ واحدة في الخادم).
   الجزءُ الفاشل يُعاد وحده (ثلاثُ محاولاتٍ تلقائية، ثم «إعادة المحاولة» من الواجهة تكمل من الجزء نفسِه: options.resume)؛ الإلغاءُ وإغلاقُ الصفحة يحذفان المؤقت.
   summary = ملخّصُ ما قبل التأكيد (الإدارة · تاريخ التصدير · المفاتيح والصور · الحجم · ما لن يُنقل وسببُه — من الخادم نفسِه). */
/* V7 · 53 تقويم (REVIEW 27 — قرارُ المالك: الهامش ≥4٪ بالتقليص لا برفع السقف): هذا الملف في الغلاف يحمل ما يلزم كلَّ صفحةٍ عند الفتح وحده —
   هويةُ الجلسة · التصدير (exportDomains) · تحذيرُ الصور المفقودة · التحديثُ بعد الاعتماد. مسارُ الاستيراد كلُّه (التقطيع · الأجزاء · الملخّص · التأكيد ·
   وما يذهب لكل نظام) في services/548-import-kit.js: يُجلب مرةً عند أول استيراد (kit()) ويسجّل نفسه هنا، فلا يُنزَّل ولا يُفسَّر عند كل فتح.
   الواجهةُ (KIVO.BackupRestore) كما هي: الدوالُّ اللاتزامنية تنتظر الأداة، والمتزامنةُ تعمل بعد أول تحضير (كما تُستدعى اليوم). */
(function () {
  'use strict';
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function integer(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }
  function record(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
  function context() {
    var boot = window.__BS_BOOT || {},
      auth = KIVO.BassamAuth,
      user = auth && auth.user && auth.user();
    return boot.srv === 1 && boot.cf === 1 && boot.uid && user && String(user.id) === String(boot.uid) ? { uid: String(boot.uid) } : null;
  }
  function same(stamp) {
    var now = context();
    return !!now && now.uid === stamp.uid;
  }
  /* رفضٌ بلا نصّه الكامل — نصوصُ الرفض كلُّها في أداة الاستيراد (failure)؛ هنا ما قد يُعرض قبل تحميلها وحده */
  var MSG0 = { session: 'سجّل الدخول بالحساب الحالي أولًا؛ كلمة ملف النسخة ليست مصادقة على الخادم', network: 'تعذّر تأكيد الاستعادة؛ الملف محفوظ، أعد المحاولة بالطلب نفسه', invalid: 'لم يصل إقرار كامل من الخادم؛ لم يُعرض نجاح',
    kit: 'تعذّر تحميل أداة الاستيراد من المنصة (انقطع الاتصال أو تغيّر الإصدار)؛ لم يُرسل شيء ولم يتغيّر شيء — أعد تحميل الصفحة ثم أعد المحاولة' };
  function fail0(code, status, data) {
    return { ok: 0, err: code, status: status || 0, message: MSG0[code] || 'رفض الخادم الطلب (' + code + ')؛ لم يتغيّر شيء', uncertain: ['invalid', 'session', 'network'].includes(code) || !status || status >= 500, details: data };
  }
  async function request(url, options, stamp, ms) {
    if (!stamp || !same(stamp)) return fail0('session', 401);
    var controller = new AbortController(),
      timer = setTimeout(function () {
        controller.abort();
      }, ms || 20000);
    try {
      var response = await fetch(url, Object.assign({ credentials: 'same-origin', cache: 'no-store', signal: controller.signal }, options)),
        data;
      try {
        data = await response.json();
      } catch (e) {
        return fail0('invalid', response.status);
      }
      if (!same(stamp)) return fail0('session', 401);
      if (!response.ok || !data || data.ok !== 1)
        return fail0(response.status === 401 ? 'session' : String((data && data.err) || 'invalid'), response.status, data);
      return { ok: 1, data: data };
    } catch (e) {
      return fail0(same(stamp) ? 'network' : 'session', same(stamp) ? 0 : 401);
    } finally {
      clearTimeout(timer);
    }
  }
  async function exportDomains(options) {
    var stamp=context(),srv=KIVO.__BS_SRV;
    if(!stamp||!record(options)||!Array.isArray(options.departments)||!integer(options.v)||typeof options.full!=='boolean')throw Error('تعذّر تحديد نطاق النسخة');
    var departments=options.departments.slice().sort(),domains={},images=Object.assign({},options.images||{});
    if(new Set(departments).size!==departments.length||departments.some(function(d){return typeof d!=='string'||!d||d.includes(':');})||(!options.full&&departments.length!==1))throw Error('نطاق النسخة غير صالح');
    function current(){return same(stamp)&&window.__BS_BOOT.v===options.v&&srv&&!srv.dirty()&&!srv.inflight()&&!srv.sesChanged();}
    var specs=[
@@SYS:bk.export.specs@@    ];
    for(var spec of specs){
      if(!current())throw Error('تغيّرت البيانات قبل اكتمال النسخة');
      var route='/api/'+spec[0]+'/export?uid='+encodeURIComponent(stamp.uid)+(options.full?'':'&dept='+encodeURIComponent(departments[0])),response=await request(route,{},stamp),value=response.data;
      var expected=departments.concat(@@SYS:bk.export.awardGlobal|empty="[]"@@).sort();
      if(!response.ok||!current()||value.globalRev!==options.v||!Array.isArray(value.domains)){var pg=KIVO.BassamPerm&&KIVO.BassamPerm.PAGE_OF&&KIVO.BassamPerm.PAGE_OF[spec[0]];throw Error('تعذّر تصدير «'+((pg&&pg.name)||spec[0])+'»: '+(response.ok?'تغيّرت البيانات':response.message));}   /* V7 · 53 (قرار المالك ٦): الرسالةُ تذكر المجالَ وسببه */
      var scope=function(d){return d&&d.scope&&d.scope.kind==='global'?'':d&&d.scope&&d.scope.departmentId;};
      if(JSON.stringify(value.domains.map(scope).sort())!==JSON.stringify(expected)||value.domains.some(function(d){return d.version!==1||!record(d.resources)||!record(d.rows)||spec[1].some(function(k){return typeof d.resources[k]!=='boolean';})||JSON.stringify(Object.keys(d.rows).sort())!==JSON.stringify(spec[2].slice().sort())||spec[2].some(function(k){return !Array.isArray(d.rows[k])||d.rows[k].some(function(row){return !record(row)||row.department_id!==scope(d);});});}))throw Error('مجال النسخة ناقص أو خارج نطاقها');
      domains[@@SYS:bk.export.awardName@@spec[0]]=value.domains;
    }
    if(!current()||!srv.operations||!Array.isArray(srv.operations.resources))throw Error('خدمة البيانات التشغيلية غير جاهزة');
    var operationExport=await request('/api/operations/export?uid='+encodeURIComponent(stamp.uid)+(options.full?'':'&dept='+encodeURIComponent(departments[0])),{},stamp),operationData=operationExport.data;
    var expectedOperations=departments.flatMap(function(d){return srv.operations.resources.map(function(r){return d+'\0'+r;});}).sort();
    if(!operationExport.ok||!current()||operationData.globalRev!==options.v||!Array.isArray(operationData.domains)||
      JSON.stringify(operationData.domains.map(function(d){return d&&d.scope&&d.scope.departmentId+'\0'+d.resource;}).sort())!==JSON.stringify(expectedOperations)||
      operationData.domains.some(function(d){return d.version!==1||!record(d.rows)||!Array.isArray(d.rows.ops_nodes)||Object.keys(d.rows).some(function(table){return !/^[a-z][a-z0-9_]*$/.test(table)||!Array.isArray(d.rows[table])||d.rows[table].some(function(row){return !record(row)||row.department_id!==d.scope.departmentId||row.resource!==d.resource;});});}))throw Error('تعذّر تصدير البيانات التشغيلية كاملةً');
    domains.operations=operationData.domains;
    /* V7-F (owner blocker): every referenced id remembers WHERE it is referenced («<unit>:<resource>»), so an image the server confirms missing can be named in the warning */
    var where=new Map(),ids={add:function(id,at){if(!where.has(id))where.set(id,new Set());where.get(id).add(at);}};
@@SYS:bk.export.imageIds@@    domains.operations.forEach(function(d){Object.values(d.rows).forEach(function(rows){rows.forEach(function(row){Object.values(row).forEach(function(value){if(typeof value==='string')(value.match(/(?:img|szp)_[a-z0-9]+_[a-z0-9]+/g)||[]).forEach(function(id){ids.add(id,d.scope.departmentId+':'+d.resource);});});});});});
    /* The backup is CREATED when a record mentions an image whose bytes are gone (swept after its grace · restored as missing): the server's 404 is the
       confirmation, the image is skipped and NAMED (missing → the file's imagesMissing and the confirmation message). Anything else that is not the image
       itself — no connection, 5xx, a refusal, an empty body — still fails the whole backup: only a confirmed-missing image is skipped. */
    var missing=[];
    for(var id of where.keys()){
      if(!current())throw Error('تغيّرت الجلسة أثناء تجميع النسخة');
      if(!images[id]){
        if(!KIVO.BassamIDB||(!KIVO.BassamIDB.getInfo&&!KIVO.BassamIDB.get))throw Error('خدمة الصور غير متاحة');
        if(KIVO.BassamIDB.getInfo){
          var got=await KIVO.BassamIDB.getInfo(id);
          if(got&&got.ok===true&&typeof got.v==='string'&&got.v)images[id]=got.v;
          else if(got&&got.ok===false&&got.status===404){missing.push({id:id,at:Array.from(where.get(id)).sort()});continue;}
          else throw Error('تعذّر قراءة صورة؛ لم تُنشأ نسخة جزئية');
        }else images[id]=await KIVO.BassamIDB.get(id);
      }
      if(typeof images[id]!=='string'||!images[id])throw Error('تعذّر قراءة صورة؛ لم تُنشأ نسخة جزئية');
    }
    if(!current())throw Error('تغيّرت البيانات قبل اكتمال النسخة');
    missing.sort(function(a,b){return a.id<b.id?-1:a.id>b.id?1:0;});
    return {domains:domains,images:images,missing:missing};
  }
  /* the warning a backup shows (and a restore repeats) for images skipped as missing: each id with the unit and the record that mention it */
  function missingNote(missing) {
    if (!Array.isArray(missing) || !missing.length) return '';
    var names = {};
    try { (KIVO.BassamDepts.list() || []).forEach(function (d) { if (d && d.id) names[d.id] = d.name || d.id; }); } catch (e) {}
    var label = { @@SYS:bk.labels|sep=" "|post=" "@@@@SYS:bk.labels.plan@@@@SYS:bk.labels.daily|empty="'': ''"@@@@SYS:bk.labels.tasks@@ };
    var place = function (at) { var i = String(at).lastIndexOf(':'), d = at.slice(0, i), r = at.slice(i + 1); return (d ? '«' + (names[d] || d) + '» ' : '') + (label[r] || r); };
    return ' تحذير: ' + missing.length + ' صورة يشير إليها سجلٌّ ولم تعد موجودة على الخادم — تُخطّيت والنسخة أُنشئت بدونها: ' +
      missing.slice(0, 20).map(function (m) { return m.id + ' (' + (m.at || []).map(place).join('، ') + ')'; }).join(' · ') + (missing.length > 20 ? ' · …' : '') + '.';
  }
  var PERM_NOTE = 'يمنحها مدير المنصة لاحقاً إن لزم.';
  async function refresh() {
    try {
      if (KIVO.__BS_SRV && KIVO.__BS_SRV.resync) await KIVO.__BS_SRV.resync(false);
      if (KIVO.BassamNotif && KIVO.BassamNotif.refresh) await KIVO.BassamNotif.refresh();
      return { ok: 1 };
    } catch (e) {
      return fail0('network');
    }
  }
  /* أداةُ الاستيراد الكسولة: رابطُها ذو البصمة من البناء (@@KIVO_LAZY — tools/build.py) · تسجّل نفسها بـ register مرةً واحدة */
  var kit = null, kitP = null, KIT_URL = '@@KIVO_LAZY:services/548-import-kit.js@@', core = Object.freeze({ clone: clone, integer: integer, record: record, context: context, same: same, request: request, PERM_NOTE: PERM_NOTE });
  function load() {
    if (kit) return Promise.resolve(kit);
    if (!kitP)
      kitP = new Promise(function (ok, no) {
        if (typeof document === 'undefined' || !/^\/assets\//.test(KIT_URL)) return no(Error('kit'));   /* حزمةُ المونوليث (اختبار) واختبارُ الوحدة: الأداةُ تُحمَّل قبلُ نصّاً */
        var s = document.createElement('script');
        s.src = KIT_URL; s.async = true;
        s.onload = function () { if (kit) ok(kit); else no(Error('kit')); };
        s.onerror = function () { no(Error('kit')); };
        document.head.appendChild(s);
      }).catch(function (e) { kitP = null; throw e; });
    return kitP;
  }
  function later(name, anon) {
    return function () {
      var a = arguments;
      if (anon && !context()) return Promise.resolve(fail0('session', 401));   /* بلا جلسة: يُرفض قبل أي جلبٍ أو طلب */
      return load().then(function (k) { return k[name].apply(null, a); }, function () { return name === 'confirm' ? false : fail0('kit'); });
    };
  }
  function now(name, none) { return function () { return kit ? kit[name].apply(null, arguments) : typeof none === 'function' ? none() : none; }; }
  KIVO.BackupRestore = Object.freeze({
    context: context,
    exportDomains: exportDomains,
    missingNote: missingNote,
    summary: later('summary', 1),
    prepare: later('prepare', 1),
    approve: now('approve', function () { return fail0('session', 401); }),
    send: function (t, o) { return kit ? kit.send(t, o) : Promise.resolve(fail0('session', 401)); },
    cancel: function (h) { return kit ? kit.cancel(h) : Promise.resolve({ ok: 1 }); },
    confirm: later('confirm'),
    remapLine: now('remapLine', ''),
    permsLine: now('permsLine', ''),
    permItems: now('permItems', function () { return []; }),
    PERM_NOTE: PERM_NOTE,
    refresh: refresh,
    /* V7 · 53 تقويم: أداةُ الاستيراد نفسُها (تُجلب عند الحاجة) · وتسجيلُها — تسجّل مرةً واحدة */
    kit: load,
    register: function (make) { if (!kit && typeof make === 'function') kit = make(core); },
  });
})();
