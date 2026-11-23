/* One backup transport for admin, department settings and the authenticated gate.
   Files/tickets remain in memory. No local storage overlay or image upload. */
/* V7 · د6: النسخةُ تُرسل على أجزاء (POST /api/backup/import — 019g): حدُّ الطلب 8MB لا يُرفع، ونسخةُ إدارةٍ حقيقية 31MB (مفتاحٌ واحد 8.4MB).
   prepare = بدءٌ ← أجزاءُ نصّ الملف (بلا صوره) ← الصورُ واحدةً واحدة ← فحصُ الخادم (بلا كتابة) · send = الاعتمادُ (طلبٌ صغير، دفعةٌ واحدة في الخادم).
   الجزءُ الفاشل يُعاد وحده (ثلاثُ محاولاتٍ تلقائية، ثم «إعادة المحاولة» من الواجهة تكمل من الجزء نفسِه: options.resume)؛ الإلغاءُ وإغلاقُ الصفحة يحذفان المؤقت.
   summary = ملخّصُ ما قبل التأكيد (الإدارة · تاريخ التصدير · المفاتيح والصور · الحجم · ما لن يُنقل وسببُه — من الخادم نفسِه). */
(function () {
  'use strict';
  var tickets = new WeakMap();
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function integer(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }
  function record(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
  function counts(value) {
    return (
      record(value) &&
      @@SYS:bk.counts.dstats|pre="['kv', 'operations', "|empty="['kv', 'operations', "@@'notifications', @@SYS:bk.counts.systems|post="'kept']"|empty="'kept']"@@.every(function (k) {
        return integer(value[k]);
      })
    );
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
  function failure(code, status, data) {
    var messages = {
      session: 'سجّل الدخول بالحساب الحالي أولًا؛ كلمة ملف النسخة ليست مصادقة على الخادم',
      network: 'تعذّر تأكيد الاستعادة؛ الملف محفوظ، أعد المحاولة بالطلب نفسه',
      invalid: 'لم يصل إقرار كامل من الخادم؛ لم يُعرض نجاح',
      conflict: 'تغيّرت البيانات؛ راجع الجرد مجددًا قبل اعتماد الاستعادة',
      reason: 'أُلغي الاستيراد لعدم إدخال سبب',
      cancelled: 'أُلغيت الاستعادة دون كتابة',
      'backup-image-reuse-rejected': 'تعذّر اعتماد صور النسخة؛ تُقبل فقط صور موجودة ومطابقة ومصرّح بمرجعها. إن كانت النسخة تحمل صورة أُزيل مرجعها من سجلّها (بانتظار انتهاء مهلتها) فاطلب من مسؤول المنصة أو مدير إدارتها الأصلية تنفيذ الاستعادة ليُعاد ربطها، وإلا فبعد انتهاء المهلة تُستعاد البيانات وتظهر الصورة مفقودة',
      'restore-credential-change': 'النسخة تغيّر بيانات دخول حساب قائم؛ أُوقفت لحماية كلمات المرور الحالية',
      'restore-self-identity-change': 'النسخة تغيّر اسم دخول صاحب الجلسة؛ غيّره من إعدادات الحساب بالمصادقة الحالية',
      'restore-redacted': 'هذه النسخة صُدّرت دون البيانات الشخصية فلا تصلح للاستعادة — استعِد نسخةً كاملة صدّرها مدير الوحدة أو مسؤول المنصة',
      /* V7 · د6: كلُّ رفضٍ يُعرض بسببه */
      'body-large': 'الجزء المرسل أكبر من حد الطلب؛ لم يتغيّر شيء',
      'restore-policy': 'لا تملك صلاحية استعادة النسخة لهذه الإدارة؛ لم يتغيّر شيء',
      'import-unknown': 'لم يجد الخادم ملف الاستيراد المؤقت (أُلغي أو بدأ استيراد آخر بالحساب نفسه)؛ لم يتغيّر شيء — أعد المحاولة من البداية',
      'import-expired': 'انقضت مهلة الاستيراد (ساعة) وحُذف المؤقت؛ لم يتغيّر شيء — أعد المحاولة من البداية',
      'import-incomplete': 'لم تكتمل أجزاء النسخة على الخادم؛ لم يتغيّر شيء — أعد المحاولة من البداية',
      'import-part': 'رفض الخادم جزءًا من النسخة (محتواه غير صالح)؛ لم يتغيّر شيء',
      'import-shape': 'بيان النسخة غير صالح (حجم صورة أو معرّفها' + (data && data.details && data.details.k ? ': ' + data.details.k : '') + ')؛ لم يتغيّر شيء',
      'import-too-heavy': 'النسخة أكبر مما يُعالَج بأمان في طلب واحد؛ لم يتغيّر شيء ولم يُرسل منها شيء. ' +
        (data && data.details && data.details.kind === 'full'
          ? 'النسخة الشاملة بهذا الحجم لا تُستورد دفعةً واحدة: استورد نسخ الإدارات واحدةً واحدة.'
          : data && data.details && data.details.k ? 'السبب: «' + data.details.k + '» وحده أكبر مما يُعالَج في طلب واحد.' : 'اختر «استبدال كامل» بحساب مدير المنصة (تُرسل البيانات الكبيرة على دفعات)، أو امسح بيانات الإدارة الهدف أولاً ثم استورد.'),
      'import-too-large': 'النسخة أكبر من سقف الاستيراد؛ لم يتغيّر شيء ولم يُرسل منها شيء. حجمها ' + (data && data.details && data.details.chars ? Math.round(data.details.chars / 1e6) : '؟') + ' مليون حرف، والحدّ ' + (data && data.details && data.details.limit ? Math.round(data.details.limit / 1e6) : 256) + ' مليون حرف.',
      'restore-epoch-changed': 'جرت استعادة أخرى أثناء الاستيراد؛ لم يتغيّر شيء — أعد المحاولة',
      'restore-reason': 'سبب الاستيراد مطلوب (300 حرف على الأكثر)؛ لم يتغيّر شيء',
      'authz-unavailable': 'خدمة الصلاحيات غير متاحة الآن؛ لم يتغيّر شيء — أعد المحاولة بعد قليل',
      'backup-data-shape': 'في النسخة قيمة ليست نصًّا صالحًا؛ لم يتغيّر شيء',
      'backup-unknown-resource': 'في النسخة مفتاح لا تعرفه المنصة الحالية؛ لم يتغيّر شيء',
      'backup-identity': 'الملف ليس نسخة صادرة عن هذه المنصة أو نوعه لا يطابق الوجهة؛ لم يتغيّر شيء',
      'backup-file-shape': 'بنية ملف النسخة غير صالحة؛ لم يتغيّر شيء',
      'backup-ambiguous-department': 'النسخة تحمل بيانات أكثر من إدارة؛ لم يتغيّر شيء',
      'restore-personal-blank': 'لم يُكتب شيء: هذه النسخة كانت ستمحو بياناتٍ شخصية محفوظة (الهوية أو الجوال أو البريد أو الرقم الوظيفي أو جهة التواصل أو الجنس) لسجلاتٍ قائمة، فلا يمكن التحقق من أنها نسخةٌ كاملة. استعِد نسخةً كاملة صدّرها مدير الوحدة أو مسؤول المنصة بعد إدخال تلك البيانات',
    };
    /* V7 · د6: مفتاحٌ رفضه الخادم يُذكر باسمه وسببه (مثلاً موظفٌ مسجَّل في إدارةٍ أخرى) · وخطأُ الخادم (5xx أو ردٌّ بلا إقرار) يُقال صراحةً · وغيرُ المعروف يُعرض رمزُه */
    var denied = data && data.details && data.details.denied, why = { 'emp-dup': 'موظف مسجَّل في إدارة أخرى بالهوية نفسها', shape: 'شكل غير مقبول', 'not-mgr': 'خارج صلاحيتك', 'mgr-no-key': 'لا تملك مفتاح الاستعادة' };
    if (code === 'restore-key-denied' && denied)
      messages[code] = 'رفض الخادم ' + Object.keys(denied).length + ' مجموعة بيانات؛ لم يتغيّر شيء: ' +
        Object.keys(denied).slice(0, 4).map(function (k) { return k.replace(/^bsdept:[^:]+:/, '') + ' (' + (why[denied[k].why] || denied[k].why || 'مرفوض') + ')'; }).join(' · ');
    if (!messages[code] && status >= 500) messages[code] = 'تعذّر على الخادم إكمال الخطوة (رمز ' + status + ')؛ لم يتغيّر شيء — أعد المحاولة، وإن تكرّر فالنسخة أكبر مما يحتمله الخادم في طلب واحد';
    return {
      ok: 0,
      err: code,
      status: status || 0,
      message: messages[code] || 'رفض الخادم النسخة (' + code + (data && data.at ? ' · ' + data.at : '') + ')؛ لم يتغيّر شيء',
      uncertain: ['invalid', 'session', 'network'].includes(code) || !status || status >= 500,
      details: data,
    };
  }
  async function request(url, options, stamp, ms) {
    if (!stamp || !same(stamp)) return failure('session', 401);
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
        return failure('invalid', response.status);
      }
      if (!same(stamp)) return failure('session', 401);
      if (!response.ok || !data || data.ok !== 1)
        return failure(response.status === 401 ? 'session' : String((data && data.err) || 'invalid'), response.status, data);
      return { ok: 1, data: data };
    } catch (e) {
      return failure(same(stamp) ? 'network' : 'session', same(stamp) ? 0 : 401);
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
      if(!response.ok||!current()||value.globalRev!==options.v||!Array.isArray(value.domains))throw Error('تعذّر تصدير المجال كاملًا');
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
  function identity() {
    if (!window.crypto || !window.crypto.getRandomValues) return null;
    var bytes = new Uint8Array(20);
    window.crypto.getRandomValues(bytes);
    return (
      'rs-' +
      Array.from(bytes, function (n) {
        return n.toString(16).padStart(2, '0');
      }).join('')
    );
  }
  function askReason(scope) {
    var srv = KIVO.__BS_SRV;
    if (!srv || typeof srv.askReason !== 'function') return Promise.resolve('');
    return new Promise(function (resolve) {
      srv.askReason(
        scope.kind === 'dept' ? 'bsdept:' + scope.departmentId + ':bassam_employees_v1' : 'bassam_depts_v1',
        ['backup.restore'],
        function (reason) {
          resolve(String(reason || ''));
        },
      );
    });
  }
  /* V7 · د6 — النقلُ على أجزاء */
  var IMPORT = '/api/backup/import', LONG = 180000, jobs = new WeakMap(), live = new Set();
  function post(body, stamp, ms) {
    return request(IMPORT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, stamp, ms);
  }
  /* تقطيعٌ لا يشقّ زوجاً بديلاً (الخادمُ يرفض جزءاً يبدأ أو ينتهي بنصف زوج) */
  function cut(text, size) {
    var out = [], at = 0, end;
    while (at < text.length) {
      end = Math.min(text.length, at + size);
      if (end < text.length && (text.charCodeAt(end - 1) & 0xfc00) === 0xd800) end--;
      out.push(text.slice(at, end));
      at = end;
    }
    return out;
  }
  /* المفتاحُ الكبير (يعلنه الخادم: الاسم ونمطُ أعضائه التي تُقسم) يُرسل دفعاتٍ كلٌّ منها وثيقةٌ صغيرة: الأعضاءُ المشتركة + مجموعةُ أيام (≤ ~0.7M حرف) —
     فلا يحمله الخادمُ كلَّه في ذاكرته. ما لا ينقسم (ليس خريطةً · يومٌ واحد أكبر من الحد) يبقى في نصّ الملف كما كان. */
  function split(file, spec, min) {
    var images = record(file.idbImages) ? file.idbImages : {}, rest = Object.assign({}, file), slices = {}, list = [], big = '', over = -1;
    delete rest.idbImages;
    function add(name, texts) {
      texts.forEach(function (t, n) { slices[name + '#' + n] = t.length; list.push({ k: '#' + name + '#' + n, s: 0, t: t }); });
    }
    function whole(name, text) {
      slices[name + '#0'] = text.length;
      cut(text, 1000000).forEach(function (t, n) { list.push({ k: '#' + name + '#0', s: n, t: t }); });
    }
    /* تجميعٌ عام: رأسٌ مشترك (head) + عناصرُ بأحجامها ⇒ مجموعاتٌ ≤ ~0.7M حرف؛ null إن لم ينقسم */
    function groups(head, sizes) {
      var out = [], cur = [], size = head;
      over = -1;
      if (head > 200000) return null;
      for (var i = 0; i < sizes.length; i++) {
        if (head + sizes[i] > 950000) { over = i; return null; }
        if (size + sizes[i] > 700000 && cur.length) { out.push(cur); cur = []; size = head; }
        cur.push(i); size += sizes[i];
      }
      out.push(cur);
      return out;
    }
    /* أسرةُ الموارد تُقسم معاً إن بلغ أحدُها الحد (الحيُّ وأرشيفُه: خطوةُ الأرشفة تجري في دفعاتهما) */
    var ops0 = record(file.domains) && Array.isArray(file.domains.operations) ? file.domains.operations : [];
    function weight(name) {
      var raw = record(file.data) ? file.data[name] : null, w = typeof raw === 'string' ? raw.length : 0;
      ops0.forEach(function (d) { if (record(d) && d.resource === name && record(d.rows)) w = Math.max(w, JSON.stringify(d.rows).length); });
      return w;
    }
    function due(name) {
      return (Array.isArray(spec[name]) && Array.isArray(spec[name][1]) ? spec[name][1] : [name]).some(function (n) { return Object.prototype.hasOwnProperty.call(spec, n) && weight(n) >= min; });
    }
    Object.keys(spec || {}).forEach(function (name) {
      var rx, raw = record(file.data) ? file.data[name] : null, doc;
      if (!min) return;
      /* موردٌ لا ينقسم بأعضائه (النمط null): يُرسل كلُّه دفعةً واحدة في طلبه — دائماً، فلا يدخل كلفةَ بقية النسخة ولا يُحمَّل القائمُ منه في الهدف */
      if (!spec[name][0]) {
        var at0 = -1;
        ops0.forEach(function (d, i) { if (record(d) && d.resource === name && record(d.rows)) at0 = i; });
        if (typeof raw === 'string' && raw.length > 2) {
          if (rest.data === file.data) rest.data = Object.assign({}, file.data);
          delete rest.data[name];
          whole(name, raw);
        } else if (at0 >= 0 && (ops0[at0].rows.ops_nodes || []).length) {
          var blank = {};
          Object.keys(ops0[at0].rows).forEach(function (t) { blank[t] = []; });
          whole(name, JSON.stringify({ version: ops0[at0].version, scope: ops0[at0].scope, resource: name, rows: ops0[at0].rows }));
          rest.domains = Object.assign({}, rest.domains || file.domains, { operations: ((rest.domains || file.domains).operations).map(function (d, i) { return i === at0 ? Object.assign({}, d, { rows: blank }) : d; }) });
        }
        return;
      }
      if (!due(name)) return;
      try { rx = new RegExp(spec[name][0]); } catch (e) { return; }
      /* نسخةٌ قديمة: الوثيقةُ نصٌّ في data */
      if (typeof raw === 'string') {
        try { doc = JSON.parse(raw); } catch (e) { return; }
        if (!record(doc)) return;
        var shared = {}, days = Object.keys(doc).filter(function (k) { if (rx.test(k)) return true; shared[k] = doc[k]; return false; });
        var plan = groups(JSON.stringify(shared).length, days.map(function (k) { return JSON.stringify(doc[k]).length + k.length + 4; }));
        if (!plan) { if (over >= 0 && !big) big = name + ' › ' + days[over]; return; }
        var texts = plan.map(function (idx) { var g = Object.assign({}, shared); idx.forEach(function (i) { g[days[i]] = doc[days[i]]; }); return JSON.stringify(g); });
        if (texts.some(function (t) { return t.length > 1000000; })) return;
        if (rest.data === file.data) rest.data = Object.assign({}, file.data);
        delete rest.data[name];
        add(name, texts);
        return;
      }
      /* نسخةٌ حديثة: صفوفُ المورد في domains.operations — تُجمع صفوفُ كل عضوٍ (بادئةُ مفتاح صفّه) مع الجذر والأعضاء المشتركة */
      var ops = record(file.domains) && Array.isArray(file.domains.operations) ? file.domains.operations : [], at = -1;
      ops.forEach(function (d, i) { if (record(d) && d.resource === name && record(d.rows) && Array.isArray(d.rows.ops_nodes)) at = i; });
      if (at < 0) return;
      var entry = ops[at], nodes = entry.rows.ops_nodes, root = nodes.filter(function (r) { return r && r.parent_key == null; })[0], tables = Object.keys(entry.rows);
      if (!root) return;
      var kids = nodes.filter(function (r) { return r.parent_key === root.row_key && r.member_key != null; }).sort(function (x, y) { return x.position - y.position; }),
        owner = {}, bucket = { '': {} }, cut0 = root.row_key.length + 1;
      kids.forEach(function (r) { owner[r.row_key] = rx.test(r.member_key) ? r.row_key : ''; bucket[owner[r.row_key]] = bucket[owner[r.row_key]] || {}; });
      tables.forEach(function (t) {
        (entry.rows[t] || []).forEach(function (r) {
          var k = String(r.row_key), next = k.indexOf('/', cut0), top = k === root.row_key ? '' : next < 0 ? k : k.slice(0, next), o = Object.prototype.hasOwnProperty.call(owner, top) ? owner[top] : '';
          (bucket[o][t] = bucket[o][t] || []).push(r);
        });
      });
      var dayKids = kids.filter(function (r) { return owner[r.row_key]; }), sharedKids = kids.filter(function (r) { return !owner[r.row_key]; });
      var plan2 = groups(JSON.stringify(bucket['']).length, dayKids.map(function (r) { return JSON.stringify(bucket[r.row_key]).length; }));
      if (!plan2) { if (over >= 0 && !big) big = name + ' › ' + dayKids[over].member_key; return; }
      var texts2 = plan2.map(function (idx) {
        var rows = {}, pos = {};
        sharedKids.forEach(function (r, i) { pos[r.row_key] = i; });
        idx.forEach(function (i, n) { pos[dayKids[i].row_key] = sharedKids.length + n; });
        tables.forEach(function (t) {
          rows[t] = (bucket[''][t] || []).slice();
          idx.forEach(function (i) { rows[t] = rows[t].concat(bucket[dayKids[i].row_key][t] || []); });
          if (t === 'ops_nodes') rows[t] = rows[t].map(function (r) { return Object.prototype.hasOwnProperty.call(pos, r.row_key) ? Object.assign({}, r, { position: pos[r.row_key] }) : r; });
        });
        return JSON.stringify({ version: entry.version, scope: entry.scope, resource: entry.resource, rows: rows });
      });
      if (texts2.some(function (t) { return t.length > 1000000; })) return;
      var empty = {};
      tables.forEach(function (t) { empty[t] = []; });
      rest.domains = Object.assign({}, rest.domains || file.domains, { operations: ((rest.domains || file.domains).operations).map(function (d, i) { return i === at ? Object.assign({}, d, { rows: empty }) : d; }) });
      add(name, texts2);
    });
    /* لا عضوَ أكبر من الدفعة: يُسمّى أكبرُ ما بقي في نصّ الملف (≥ 1M حرف) إن رُفض لثقله */
    if (!big && record(rest.data)) Object.keys(rest.data).forEach(function (k) { var v = rest.data[k]; if (typeof v === 'string' && v.length >= 1e6 && (!big || v.length > rest.data[big].length)) big = k; });
    return { text: JSON.stringify(rest), images: images, ids: Object.keys(images), slices: slices, list: list, big: big };
  }
  function wait(ms) {
    return new Promise(function (go) { setTimeout(go, ms); });
  }
  var WHY = {
    null: 'فارغ في النسخة (لا قيمة له)',
    device: 'تفضيل خاص بجهاز أو مستخدم — لا يُنقل بين المنصات',
    tpls: 'صلاحيات بنظام قديم أُلغي — الأدوار بديله، ولا تُفتح بها صلاحية',
    grants: 'منح صلاحيات صريحة لموظفين — لا تُنقل حتى لا تُفتح صلاحية لم تكن',
    unknown: 'لا مقابل له في المنصة الحالية',
    'image-unreferenced': 'صورة لا يشير إليها أي سجل في النسخة',
    /* V7 · د6 (schemafix): حقولٌ داخل الموارد — الاستيرادُ يكمل بغيرها */
    transient: 'حقل عابر للعرض بلا قيمة في النسخة',
    field: 'حقل لا مقابل له في المنصة — قيمته لن تُنقل',
    'field-type': 'قيمة بشكل لا يقبله الحقل — لن تُنقل',
    /* V7 · د6 (remap): بنودُ التنبيهات التي تُسقط وحدها — والملفُّ يُنقل */
    'nf-type': 'تنبيه بنوع لا يعرفه الإصدار الحالي',
    'nf-department': 'تنبيه لإدارة غير إدارة النسخة',
    'nf-state-message-unknown': 'علامة قراءة لتنبيه ليس في النسخة',
    'nf-state-identity-unknown': 'علامة قراءة لحساب ليس في الوحدة',
    /* V7 · د6 (QA ٦ — قرارُ المالك ب1) */
    'mgr-sheet': 'صحيفة صلاحيات مدير المصدر — مدير الوحدة يبقى كامل الصلاحية في إدارته، والسقف كما هو',
  };
  function nfItem(x) { return /^nf-/.test(x.why); }
  /* «أُعيد ربط N إشارة من <المصدر> إلى <الهدف>» بتفصيلها لكل مورد · ومعرّفاتٌ أخرى لم تُربط · وما بقي فيه المعرّفُ المصدر نصاً — '' إن لم يكن ربط */
  function remapLine(s) {
    var r = s && s.remap, list = function (o) { return Object.keys(o || {}).map(function (k) { return k + ': ' + o[k]; }).join(' · '); };   /* وسومُ الموارد بالعربية من الخادم */
    if (!record(r) || !(r.n > 0 || Object.keys(r.foreign || {}).length)) return '';
    return (r.n > 0 ? ' أُعيد ربط ' + r.n + ' إشارة من «' + r.from + '» إلى «' + r.to + '» (' + list(r.by) + ').' : '') +
      (Object.keys(r.foreign || {}).length ? ' معرّفات إدارات أخرى في النسخة لم يُعَد ربطها: ' + list(r.foreign) + '.' : '') +
      (Object.keys(r.left || {}).length ? ' بقي المعرّف المصدر نصاً في: ' + list(r.left) + '.' : '');
  }
  /* V7 · د6 (QA ٦ — قرارُ المالك ب4): الصلاحياتُ المنقولة بعددها من الخادم (counts.perms — 019d rsPermsCounts): الأدوار · الإسنادات · وما لا أثرَ له لكل نظامٍ مطفأٍ في سقف الوحدة. مصدرٌ واحد للتأكيد ولملخّص النجاح (root-logic) */
  function permsLine(c) {
    var p = record(c) && record(c.perms) ? c.perms : null; if (!p) return '';
    var inert = record(p.inert) ? Object.keys(p.inert).map(function (k) { return k + ': ' + p.inert[k]; }) : [];
    return ' الصلاحيات: ' + (p.roles || 0) + ' دور و' + (p.assignments || 0) + ' إسناد تنتقل — ويبقى سقف الوحدة ومديرها كما هما' + (inert.length ? '؛ لا أثر لها لأن النظام مطفأ في الوحدة: ' + inert.join(' · ') : '') + '.';
  }
  var FIELD_WHY = { transient: 1, field: 1, 'field-type': 1 };
  function skipList(list) {
    return (Array.isArray(list) ? list : []).filter(function (x) { return record(x) && typeof x.k === 'string'; }).map(function (x) { return { k: x.k, why: String(x.why || ''), n: integer(x.n) ? x.n : null, text: (WHY[x.why] || String(x.why || '')) + (integer(x.n) ? ' — العدد: ' + x.n : '') }; });
  }
  /* ملخّصُ ما قبل التأكيد — لا يودِع شيئاً (begin dry): الخادمُ يفحص الصلاحية ويعيد ما لن يُنقل من نسخةٍ قديمة */
  async function summary(file, scope) {
    var stamp = context(), id = identity();
    if (!stamp) return failure('session', 401);
    if (!id || !record(file) || !record(file.data) || !record(scope)) return failure('invalid');
    var parts = split(file, {}, 0), legacy = !file.manifest, keys = {}, names = Object.keys(file.data);
    names.forEach(function (k) { keys[k] = file.data[k] === null ? 1 : 0; });
    var read = await post({ op: 'begin', dry: true, requestId: id, scope: scope, keys: legacy ? keys : {} }, stamp);
    if (!read.ok) return read;
    var bytes = parts.text.length;
    parts.ids.forEach(function (k) { bytes += String(parts.images[k]).length; });
    return { ok: 1, legacy: legacy, kind: file.kind || scope.kind, dept: typeof file.dept === 'string' ? file.dept : '', exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
      keys: names.length, images: parts.ids.length, bytes: bytes, noPerms: file.perms == null,
      /* المنحُ القديمة تُذكر بعددها (يُحسب من الملف؛ والخادمُ يعيده مؤكَّداً بعد الرفع) */
      skip: skipList((read.data.skip || []).map(function (x) { var n = null; if (x && x.why === 'grants') { try { n = Object.keys((JSON.parse(file.data[x.k]) || {}).emp || {}).length; } catch (e) { n = null; } } return n === null ? x : Object.assign({}, x, { n: n }); })) };
  }
  /* الأجزاء: كلُّ جزءٍ طلبٌ؛ الفاشلُ بلا ردٍّ مؤكَّد يُعاد وحده ثلاثاً، ثم يُعاد الفشلُ ومعه job لإكمالٍ لاحق من الجزء نفسِه */
  async function upload(job, stamp, progress) {
    for (; job.next < job.parts.length; job.next++) {
      if (job.stop && job.stop()) return failure('cancelled');
      var part = job.parts[job.next], sent;
      for (var tries = 1; ; tries++) {
        progress({ step: 'upload', part: job.next + 1, parts: job.parts.length, image: part.k ? job.imageOf[job.next] : 0, images: job.images });
        sent = await post({ op: 'part', requestId: job.id, items: [part] }, stamp, LONG);
        if (sent.ok || !sent.uncertain || tries >= 3 || !same(stamp)) break;
        await wait(700 * tries);
      }
      if (!sent.ok) return sent;
      job.parts[job.next] = null;
    }
    /* دفعاتُ المفتاح الكبير: كلُّ دفعةٍ يحكم عليها الخادمُ ويحوّلها في طلبها (بالترتيب) — والفاشلةُ تُعاد وحدها */
    for (; job.sliced < job.slices; job.sliced++) {
      if (job.stop && job.stop()) return failure('cancelled');
      for (var again = 1; ; again++) {
        progress({ step: 'slice', part: job.sliced + 1, parts: job.slices });
        sent = await post({ phase: 'slice', requestId: job.id, i: job.sliced, reason: job.reason }, stamp, LONG);
        if (sent.ok || !sent.uncertain || again >= 3 || !same(stamp)) break;
        await wait(700 * again);
      }
      if (!sent.ok) return sent;
    }
    return { ok: 1 };
  }
  function gone(result) {
    return !result.ok && !result.uncertain && result.err !== 'conflict' && result.err !== 'restore-epoch-changed';   /* كما يحكم الخادم (019g): التعارضُ يُبقي المؤقت */
  }
  async function prepare(file, options) {
    var stamp = context(),
      opt = options || {},
      scope = clone(opt.scope || { kind: 'full' }),
      progress = typeof opt.onProgress === 'function' ? opt.onProgress : function () {},
      job = opt.resume && jobs.get(opt.resume),
      id = job ? job.id : identity();
    if (!stamp) return failure('session', 401);
    if (!id || !file || typeof file !== 'object' || !['replace', 'merge'].includes(opt.mode) || !['full', 'dept'].includes(scope.kind))
      return failure('invalid');
    /* PRIVACY batch (019u privRedacted): a copy exported without personal data is refused before any request (the server refuses it too) */
    var fd = file.domains && typeof file.domains === 'object' ? file.domains : {};
    if ((file.manifest && file.manifest.redacted) || Object.keys(fd).some(function (k) { return [].concat(fd[k]).some(function (x) { return !!(x && x.redacted); }); }))
      return failure('restore-redacted', 409);
    function fail(result) {
      if (job && !gone(result)) jobs.set(result, job);
      else if (job) live.delete(job.id);
      result.resumable = !!job && !gone(result);
      return result;
    }
    if (!job) {
      /* مدير المنصة لا يُطلب منه سبب: لا نافذة، ويُرسل السبب فارغاً (الخادمُ يقبله منه وحده ويسجّل «بلا سبب (مدير المنصة)») */
      var srvR = KIVO.__BS_SRV, exempt = !!(srvR && typeof srvR.reasonExempt === 'function' && srvR.reasonExempt());
      var reason = typeof opt.reason === 'string' ? opt.reason.trim() : exempt ? '' : await askReason(scope);
      if (!reason && !exempt) return failure('reason', 403);
      if (!same(stamp)) return failure('session', 401);
      /* ما قد يُقسم دفعاتٍ يعلنه الخادم (begin dry): أسماءُ الموارد في النسخة — مفاتيحُ data في القديمة، ومواردُ domains.operations في الحديثة */
      var legacyKeys = {}, resources = {}, spec = {}, min = 0, old = !file.manifest && record(file.data);
      if (old) Object.keys(file.data).forEach(function (k) { legacyKeys[k] = resources[k] = file.data[k] === null ? 1 : 0; });
      else if (record(file.domains) && Array.isArray(file.domains.operations)) file.domains.operations.forEach(function (d) { if (record(d) && typeof d.resource === 'string') resources[d.resource] = 0; });
      if (scope.kind === 'dept' && Object.keys(resources).length) {
        var asked = await post({ op: 'begin', dry: true, requestId: id, scope: scope, resources: resources, mode: opt.mode }, stamp);
        if (!asked.ok) return asked;
        if (record(asked.data.slice) && integer(asked.data.sliceMin)) { spec = asked.data.slice; min = asked.data.sliceMin; }
      }
      var parts = split(file, spec, min), texts = cut(parts.text, 1000000), sizes = {}, list = [], imageOf = {};
      texts.forEach(function (t, n) { list.push({ k: '', s: n, t: t }); });
      parts.list.forEach(function (item) { list.push(item); });
      parts.ids.forEach(function (k, i) {
        var v = String(parts.images[k]);
        sizes[k] = v.length;
        cut(v, 4000000).forEach(function (t, n) { imageOf[list.length] = i + 1; list.push({ k: k, s: n, t: t }); });
      });
      live.add(id);   /* قبل الطلب: صفحةٌ تُغلق وردُّ البدء لم يصل تطلب حذفَ مؤقتها كذلك */
      var began = await post({ op: 'begin', requestId: id, scope: scope, n: parts.text.length, f: texts.length, images: sizes, slices: parts.slices, resources: resources, keys: legacyKeys, mode: opt.mode }, stamp);
      if (!began.ok) {
        if (!began.uncertain) live.delete(id);
        /* عضوٌ واحد أكبر مما يُرسل في دفعة: الرفضُ يسمّيه */
        if (began.err === 'import-too-heavy' && parts.big && record(began.details) && record(began.details.details) && !began.details.details.k) return failure(began.err, began.status, Object.assign({}, began.details, { details: Object.assign({}, began.details.details, { k: parts.big }) }));
        return began;
      }
      job = { id: id, parts: list, next: 0, images: parts.ids.length, imageOf: imageOf, mode: opt.mode, reason: reason, legacy: !file.manifest, slices: Object.keys(parts.slices).length, sliced: 0 };   /* V7 · د6: عددُ الدفعات لا عددُ أجزائها (موردٌ كاملٌ أكبر من 1M حرف يُرفع جزأين وهو دفعةٌ واحدة) */
    } else if (job.mode !== opt.mode) return fail(failure('invalid'));
    job.stop = typeof opt.shouldStop === 'function' ? opt.shouldStop : null;
    var up = await upload(job, stamp, progress);
    if (!up.ok && up.err === 'cancelled') { live.delete(job.id); await post({ op: 'cancel', requestId: job.id }, stamp); return up; }
    if (!up.ok) return fail(up);
    progress({ step: 'inspect', part: job.parts.length, parts: job.parts.length, image: job.images, images: job.images });
    var departments = [];
    try {
      departments = JSON.parse((file.data && file.data.bassam_depts_v1) || '[]').map(function (d) {
        return d.id;
      });
    } catch (e) {}
    var query = new URLSearchParams({ kind: scope.kind, departments: JSON.stringify(departments) });
    if (scope.kind === 'dept') query.set('dept', scope.departmentId || '');
    var read = await request('/api/backup/restore?' + query.toString(), {}, stamp);
    if (!read.ok) return fail(read);
    var base = read.data.base;
    if (!base || !integer(base.epoch) || !base.kv@@SYS:bk.restore.base@@) return fail(failure('invalid'));
    var body = {
        requestId: id,
        scope: scope,
        mode: job.mode,
        reason: job.reason,
        base: clone(base),
        legacyConsent: false,
        phase: 'inspect',
      },
      checked = await post(body, stamp, LONG);
    if (!checked.ok) return fail(checked);
    var inspection = checked.data.inspection;
    if (
      !inspection ||
      !counts(inspection.counts) ||
      !record(inspection.base) ||
      !record(inspection.summary) ||
      typeof inspection.summary.legacy !== 'boolean' ||
      !integer(inspection.summary.imagesReused) ||
      !Array.isArray(inspection.summary.emptyDomains) ||
      !Array.isArray(inspection.summary.preservedGlobals) ||
      JSON.stringify(inspection.scope) !== JSON.stringify(scope)
    )
      return fail(failure('invalid'));
    inspection.summary.notTransferred = skipList(inspection.summary.notTransferred);
    body.base = clone(inspection.base);
    body.phase = 'commit';
    var ticket = Object.freeze({ requestId: id });
    tickets.set(ticket, { stamp: stamp, body: body, inspection: clone(inspection), approved: false });
    return { ok: 1, ticket: ticket, inspection: clone(inspection) };
  }
  function approve(ticket) {
    var entry = tickets.get(ticket);
    if (!entry || !same(entry.stamp)) return failure('session', 401);
    entry.approved = true;
    entry.body.legacyConsent = !!entry.inspection.summary.legacy;
    return { ok: 1 };
  }
  async function send(ticket, options) {
    var entry = tickets.get(ticket);
    if (!entry || !entry.approved || !same(entry.stamp)) return failure('session', 401);
    if (options && typeof options.onProgress === 'function') options.onProgress({ step: 'commit' });
    var result = await post(entry.body, entry.stamp, LONG);
    if (!result.ok) {
      if (gone(result)) live.delete(entry.body.requestId);
      return result;
    }
    var ack = result.data;
    if (
      ack.requestId !== entry.body.requestId ||
      !integer(ack.rev) ||
      typeof ack.snapshot !== 'string' ||
      !ack.snapshot ||
      ack.mode !== entry.body.mode ||
      !ack.scope ||
      JSON.stringify(ack.scope) !== JSON.stringify(entry.body.scope) ||
      !integer(ack.imagesReused) ||
      ack.imagesReused !== entry.inspection.summary.imagesReused ||
      !counts(ack.counts) ||
      JSON.stringify(ack.counts) !== JSON.stringify(entry.inspection.counts) ||
      typeof ack.reauthRequired !== 'boolean' ||
      !record(ack.revs) ||
      Object.values(ack.revs).some(function (v) {
        return !integer(v) || v > ack.rev;
      })
    )
      return failure('invalid');
    live.delete(entry.body.requestId);
    try { if (KIVO.__BS_SRV && KIVO.__BS_SRV.mine) KIVO.__BS_SRV.mine(ack.revs); } catch (e) { /* V7 · د6 (QA) · البند ٥: استيرادُ النسخة/استعادتُها من فعلي */ }
    return { ok: 1, receipt: clone(ack) };
  }
  /* الإلغاء: يحذف مؤقتَ طلبٍ لم يُعتمد (تذكرةٌ جاهزة أو فشلٌ قابلٌ للإكمال) — لا أثرَ له بعد الاعتماد */
  async function cancel(handle) {
    var entry = tickets.get(handle), job = jobs.get(handle), id = entry ? entry.body.requestId : job ? job.id : '', stamp = context();
    if (!id) return { ok: 1 };
    tickets.delete(handle);
    jobs.delete(handle);
    live.delete(id);
    return stamp ? post({ op: 'cancel', requestId: id }, stamp) : failure('session', 401);
  }
  /* إغلاقُ الصفحة أثناء استيرادٍ لم يُعتمد: يُطلب حذفُ مؤقته (وإن لم يصل الطلب فمهلةُ الساعة في الخادم تحذفه) */
  if (typeof window !== 'undefined' && window.addEventListener)
    window.addEventListener('pagehide', function () {
      live.forEach(function (id) {
        try { fetch(IMPORT, { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'cancel', requestId: id }) }); } catch (e) { /* مهلةُ الخادم تكفي */ }
      });
    });
  /* V7 · د6: التأكيدُ الوحيد — بعد الرفع والتحقق، بملخّص الخادم المؤكَّد. labels: عنوانُه وزرُّه لمن يسمّيه (استبدالُ الإدارة: «نعم، استبدل») */
  async function confirm(prepared, labels) {
    if (!prepared || !prepared.ok) return false;
    var i = prepared.inspection,
      c = i.counts || {},
      lost = Array.isArray(i.summary.notTransferred) ? i.summary.notTransferred : [],
      fieldsLost = lost.filter(function (x) { return FIELD_WHY[x.why]; }),
      nfLost = lost.filter(nfItem),
      keysLost = lost.filter(function (x) { return !FIELD_WHY[x.why] && !nfItem(x); }),
      legacy = i.summary && i.summary.legacy,
      text =
        'سيُعتمد ' +
        (c.kv || 0) +
        ' مجموعة بيانات و' + (c.operations||0) + ' موردًا تشغيليًا@@SYS:bk.restore.summary@@. ستبقى كلمات مرور الحسابات الحالية كما هي.' +
        (legacy ? ' ستُحوَّل النسخة القديمة إلى المخطط الحالي قبل الكتابة.' : '') +
        /* V7 · د6: ما لن يُنقل يُذكر قبل الاعتماد في كل مدخل (نسخةُ الإدارة والنسخةُ الشاملة) · والصورُ التي ستُكتب من النسخة */
        (keysLost.length
          ? ' لن يُنقل ' + keysLost.length + ' (لا مقابل له في المنصة الحالية): ' + keysLost.slice(0, 12).map(function (x) { return x.k + ' — ' + x.text; }).join(' · ') + (keysLost.length > 12 ? ' · …' : '') + '.'
          : '') +
        /* V7 · د6 (schemafix): حقولُ الموارد التي لن تُنقل — كلُّها بمسارها وعددها، والباقي يُنقل */
        (fieldsLost.length ? ' حقول لن تُنقل (' + fieldsLost.length + '): ' + fieldsLost.map(function (x) { return x.k + ' — ' + x.text; }).join(' · ') + '.' : '') +
        (nfLost.length ? ' تنبيهات لن تُنقل (' + nfLost.reduce(function (n, x) { return n + (x.n || 0); }, 0) + '): ' + nfLost.map(function (x) { return x.k + ' — ' + x.text; }).join(' · ') + '.' : '') +
        remapLine(i.summary) +
        permsLine(c) +
        (i.summary.imagesNew > 0 ? ' ستُكتب ' + i.summary.imagesNew + ' صورة تحملها النسخة وليست على المنصة.' : '') +
        (i.summary.imagesReused
          ? ' سيُعاد استخدام ' + i.summary.imagesReused + ' صورة موجودة بعد تطابقها؛ أجسامها الحالية تبقى معتمدة.'
          : '') +
        (i.summary.imagesMissing > 0
          ? ' تشير النسخة إلى ' + i.summary.imagesMissing + ' صورة لم تعد موجودة على الخادم (حُذفت بعد انتهاء مهلتها)؛ تُستعاد البيانات وتظهر هذه الصور مفقودة' +
            (Array.isArray(i.summary.imagesMissingIds) && i.summary.imagesMissingIds.length ? ': ' + i.summary.imagesMissingIds.slice(0, 20).join(' · ') : '') + '.' +
            (Array.isArray(i.summary.imagesMissingAtBackup) && i.summary.imagesMissingAtBackup.length
              ? ' منها ما كان مفقودًا أصلًا وقت إنشاء النسخة: ' + i.summary.imagesMissingAtBackup.slice(0, 20).join(' · ') + '.'
              : '')
          : '') +
        (i.summary.emptyDomains.length
          ? ' لا تتضمن النسخة ' + i.summary.emptyDomains.length + ' مجموعة بيانات؛ في وضع الاستبدال تُستعاد المجموعات المفقودة فارغة.'
          : '') +
        (i.summary.preservedGlobals.length ? ' سيُحافظ على ' + i.summary.preservedGlobals.length + ' مورد عام غير مشمول بالنسخة.' : '');
    return KIVO.bsConfirm
      ? !!(await KIVO.bsConfirm({ title: (labels && labels.title) || 'اعتماد استعادة النسخة', msg: text, ok: (labels && labels.ok) || 'استعادة النسخة', cancel: 'إلغاء' }))
      : !!window.confirm(text);
  }
  async function refresh() {
    try {
      if (KIVO.__BS_SRV && KIVO.__BS_SRV.resync) await KIVO.__BS_SRV.resync(false);
      if (KIVO.BassamNotif && KIVO.BassamNotif.refresh) await KIVO.BassamNotif.refresh();
      return { ok: 1 };
    } catch (e) {
      return failure('network');
    }
  }
  KIVO.BackupRestore = Object.freeze({
    context: context,
    exportDomains: exportDomains,
    missingNote: missingNote,
    summary: summary,
    prepare: prepare,
    approve: approve,
    send: send,
    cancel: cancel,
    confirm: confirm,
    remapLine: remapLine,
    permsLine: permsLine,
    refresh: refresh,
  });
})();
