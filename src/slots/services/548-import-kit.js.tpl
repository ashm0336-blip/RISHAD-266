/* V7 · 53 تقويم (REVIEW 23–27): أداةُ الاستيراد — تُجلب مرةً عند أول استيراد (548-atomic-backup.js · kit()) ولا تُحمَّل مع الغلاف.
   نُقل إليها مسارُ الاستيراد كما هو (التقطيع · الأجزاء · الملخّص · التأكيد · نصوصُ الرفض) بلا تغيير سلوك، ومعه:
   · dateIn — كاشفُ التاريخ ملفوفاً حول المحوّل الواحد (calDateInCore: النصُّ نفسُه في 019v حول calConvDay؛ هنا حول مرآته بأم القرى)؛
   · fileDates — تواريخُ نسخة الإدارة/ملف Production قبل الرفع («كما في الملف ← كما سيُحفظ» · ما لا يوجد يومُه يوقف الرفع)؛
   · تنبيهُ المغادرة أثناء استيرادٍ لم يُعتمد. */
(function () {
  'use strict';
  KIVO.BackupRestore.register(function (core) {
  var clone = core.clone, integer = core.integer, record = core.record, context = core.context, same = core.same;
  function request(url, options, stamp, ms) { return core.request(url, options, stamp, ms).then(function (r) { return r.ok ? r : failure(r.err, r.status, r.details); }); }
  var tickets = new WeakMap();
  function counts(value) {
    return (
      record(value) &&
      @@SYS:bk.counts.dstats|pre="['kv', 'operations', "|empty="['kv', 'operations', "@@'notifications', @@SYS:bk.counts.systems|post="'kept']"|empty="'kept']"@@.every(function (k) {
        return integer(value[k]);
      })
    );
  }
  /* V7 · 53 (ملحق 5): أسبابُ رفض صلاحيات الموظفين بالعربي (018c permsRule/permsGrantWhy) — لا يُعرض رمزٌ للمستخدم */
  var PERM_WHY = { grant: 'تتضمّن صلاحية لا تملك منحها', cap: 'تتضمّن صفحة خارج سقف الإدارة', super: 'تغيّر سقف الإدارة (لمدير المنصة وحده)' };   /* الذاتُ والهدفُ لا يبقيان بعد التضييق (018c) */
  /* أسماءُ الموظفين من سجلّ الموظفين في آخر نسخةٍ قُرئت — للملخّص ورسالة الرفض */
  var NAMES = {};
  function namesOf(file) { NAMES = {}; try { JSON.parse(file.data.bassam_employees_v1).forEach(function (x) { if (x && x.name) NAMES[x.eid] = String(x.name); }); } catch (e) { /* بلا أسماء: يُعرض المفتاح */ } }
  function empName(ek) { return NAMES[ek] || ek; }
  /* V7 · 53: صفحةٌ لم تعد في هذا البناء (ورقةٌ أُلغيت في نسخةٍ قديمة) تُسمّى «صفحة أُلغيت» تحت قسمها — لا رمزَ ولا اسمَ ورقةٍ محذوفة (v7_d5h_deleted_residue ①) */
  function pageName(p) {
    var P = KIVO.BassamPerm, n = P && P.nameOf ? String(P.nameOf(p)) : String(p);
    if (!/[A-Za-z]/.test(n)) return n;
    var head = n.replace(/\s*·?\s*[A-Za-z][\w\/.:-]*$/, '').trim();
    return (head && !/[A-Za-z]/.test(head) ? head + ' · ' : '') + 'صفحة أُلغيت';
  }
  /* المُسقَطُ بالعربي مجمَّعاً لكل موظفٍ وصفحة: { k: اسمُ الموظف, why: 'perm-grant', text: الصفحةُ والإجراءات } */
  function permItems(list) {
    var by = {}, A = (KIVO.BassamPerm || {}).ACT_NAMES || {};
    (list || []).forEach(function (x) { if (x && x.why === 'perm-grant' && x.e) { var g = by[x.e + ' ' + x.p] = by[x.e + ' ' + x.p] || { k: empName(x.e), why: x.why, n: null, p: x.p, a: [] }; if (g.a.indexOf(A[x.a] || x.a) < 0) g.a.push(A[x.a] || x.a); } });
    return Object.keys(by).map(function (id) { var g = by[id]; return { k: g.k, why: g.why, n: null, text: 'الصفحة «' + pageName(g.p) + '» — ' + g.a.join('، ') + ' (لا تملك منحها)' }; });
  }
  /* معاينةُ التضييق قبل الرفع — المحرّكُ المشترك نفسُه (perm44 narrowSheets) بأدوات الواجهة (331): ما لا تستطيع منحه من أوراق موظفي النسخة. الخادمُ يحسمه بعد الرفع */
  function permPreview(file, scope) {
    try {
      var P = KIVO.BassamPerm, u = KIVO.BassamAuth.user(), d = scope.departmentId, mine = null, cap = P.deptCap(d), cur = {}, inc = {}, k, mgr = function (x) { return /^mgr:/.test(x); };
      if (u.role === 'super' || scope.kind !== 'dept') return [];
      var c0 = (JSON.parse(localStorage.getItem('bassam_perms_v1')).emps || {})[d] || {}, mi = {};
      P.p24.grantOf(u.ekey, d).minus.forEach(function (x) { ((P.p24.R().byKey[x] || {}).asisMap || []).forEach(function (y) { mi[y] = 1; }); });   /* ما ضيّقه مديرُ المنصة بالمنح الصريح (كمفاتيح الإنفاذ في الخادم) */
      for (k in c0) if (!mgr(k)) cur[k] = c0[k];
      for (k in file.perms.emps) if (!mgr(k)) inc[k] = file.perms.emps[k];
      return KIVO.Perm44.narrowSheets(cur, inc, {
        self: String(u.ekey || ''), target: function (x) { return !mgr(x); }, kind: function () { return {}; }, isContainer: P.isContainer, lensHosts: function () { return []; },
        expand: function (x) { return P.expandPerms(x, d); }, capAll: function () { return P.capAllPerms(d); }, inCap: function (pk) { return cap.indexOf(pk.split('/')[0]) !== -1; },
        have: function (lf) { return ((mine || (mine = P.myPerms()))[lf] || []).filter(function (a) { return !mi[lf + ':' + a]; }); },
      }).drops.map(function (x) { x.why = 'perm-grant'; return x; });
    } catch (e) { return []; }
  }
  function failure(code, status, data) {
    var messages = {
      session: 'سجّل الدخول بالحساب الحالي أولًا؛ كلمة ملف النسخة ليست مصادقة على الخادم',
      network: 'تعذّر تأكيد الاستعادة؛ الملف محفوظ، أعد المحاولة بالطلب نفسه',
      invalid: 'لم يصل إقرار كامل من الخادم؛ لم يُعرض نجاح',
      conflict: 'تغيّرت البيانات؛ راجع الجرد مجددًا قبل اعتماد الاستعادة',
      cancelled: 'أُلغيت الاستعادة دون كتابة',
      'backup-image-reuse-rejected': 'تعذّر اعتماد صور النسخة؛ تُقبل فقط صور موجودة ومطابقة ومصرّح بمرجعها. إن كانت النسخة تحمل صورة أُزيل مرجعها من سجلّها (بانتظار انتهاء مهلتها) فاطلب من مسؤول المنصة أو مدير إدارتها الأصلية تنفيذ الاستعادة ليُعاد ربطها، وإلا فبعد انتهاء المهلة تُستعاد البيانات وتظهر الصورة مفقودة',
      'restore-credential-change': 'النسخة تغيّر بيانات دخول حساب قائم؛ أُوقفت لحماية كلمات المرور الحالية',
      'restore-self-identity-change': 'النسخة تغيّر اسم دخول صاحب الجلسة؛ غيّره من إعدادات الحساب بالمصادقة الحالية',
      'restore-redacted': 'هذه النسخة صُدّرت دون البيانات الشخصية فلا تصلح للاستعادة — استعِد نسخةً كاملة صدّرها مدير الوحدة أو مسؤول المنصة',
      /* V7 · د6: كلُّ رفضٍ يُعرض بسببه */
      'body-large': 'الجزء المرسل أكبر من حد الطلب؛ لم يتغيّر شيء',
      'restore-policy': 'لا تملك صلاحية استعادة النسخة لهذه الإدارة؛ لم يتغيّر شيء',
      /* V7 · 53 تقويم (REVIEW 24): بياناتُ نظامٍ مطفأ لعقدةٍ يستورد إليها مديرُها — لا تُسقط بصمت ولا يُخفى سببُ الرفض (مديرُ المنصة يحفظها «محفوظة — غير مفعّلة») */
      'restore-operations-resource-denied': 'في النسخة بياناتُ نظامٍ مطفأ لهذه العقدة أو خارج صلاحيتك؛ لم يتغيّر شيء — يستوردها مدير المنصة فتُحفظ «محفوظة — غير مفعّلة» ولا يُسقط منها شيء، أو فعّل النظام للعقدة من «الصلاحيات ← الأنظمة» ثم أعد الاستيراد',
      /* V7 · 53 تقويم (REVIEW 23): تاريخٌ لا يُعرف يومُه في الملف — الخادمُ يسمّي موضعه (at) */
      'calendar-unmapped': 'في النسخة تاريخٌ لا يُعرف يومُه' + (data && data.details && data.details.at ? ' في «' + data.details.at + '»' : '') + ' (ليس ميلادياً YYYY-MM-DD ولا يوماً هجرياً موجوداً)؛ لم يتغيّر شيء — صحّحه في الملف ثم أعد الاستيراد',
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
      'restore-reason': 'طلب الاستيراد غير صالح (النمط أو ملاحظة أطول من 300 حرف)؛ لم يتغيّر شيء',
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
    /* V7 · 53 (ملحق 5): الرفضُ بالعربي بلا رموز (grant · cap …) — والصلاحياتُ تُسمّي الموظفَ والصفحة وما يفعله المستخدم */
    Object.assign(why, PERM_WHY);
    if (code === 'restore-key-denied' && denied)
      messages[code] = 'رفض الخادم ' + Object.keys(denied).length + ' مجموعة بيانات؛ لم يتغيّر شيء: ' +
        Object.keys(denied).slice(0, 4).map(function (k) {
          var d = denied[k] || {}, w = d.why;
          if (k === 'bassam_perms_v1') return 'مجموعة «صلاحيات موظفي الإدارة» (bassam_perms_v1)' + (d.who ? ': ورقة الموظف «' + empName(d.who.e) + '»' + (d.who.p ? ' في صفحة «' + pageName(d.who.p) + '»' : '') : '') + ' ' + (why[w] || 'رفضتها قواعد الصلاحية') +
            '. ما العمل: اطلب من مدير المنصة منح هذه الصلاحية أو استيراد النسخة بنفسه، أو احذفها من ورقة الموظف في النسخة ثم أعد المحاولة';
          return k.replace(/^bsdept:[^:]+:/, '') + ' (' + (why[w] || 'مرفوض') + ')';
        }).join(' · ');
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
  function split(file, spec, min, full) {
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
    var ops0 = record(file.domains) && Array.isArray(file.domains.operations) ? file.domains.operations : [], tags = full ? [] : [''];
    /* V7 · د7: النسخةُ الشاملة تُقسم لكل إدارةٍ فيها بالمسار نفسِه — مفاتيحُها «bsdept:<إدارة>:<مورد>» وصفوفُها بإدارتها، والدفعةُ «<إدارة>/<مورد>#n» */
    if (full) Object.keys(record(file.data) ? file.data : {}).map(function (k) { return (/^bsdept:([^:]+):/.exec(k) || [])[1]; }).concat(ops0.map(function (d) { return record(d) && record(d.scope) && d.scope.departmentId; })).forEach(function (x) { if (typeof x === 'string' && x && tags.indexOf(x + '/') < 0) tags.push(x + '/'); });
    tags.forEach(function (tag) {
    var pre = tag && 'bsdept:' + tag.slice(0, -1) + ':';
    function mine(d) { return record(d) && (!tag || (record(d.scope) && d.scope.departmentId + '/' === tag)); }
    function weight(name) {
      var raw = record(file.data) ? file.data[pre + name] : null, w = typeof raw === 'string' ? raw.length : 0;
      ops0.forEach(function (d) { if (mine(d) && d.resource === name && record(d.rows)) w = Math.max(w, JSON.stringify(d.rows).length); });
      return w;
    }
    function due(name) {
      return (Array.isArray(spec[name]) && Array.isArray(spec[name][1]) ? spec[name][1] : [name]).some(function (n) { return Object.prototype.hasOwnProperty.call(spec, n) && weight(n) >= min; });
    }
    Object.keys(spec || {}).forEach(function (name) {
      var rx, raw = record(file.data) ? file.data[pre + name] : null, doc;
      if (!min) return;
      /* موردٌ لا ينقسم بأعضائه (النمط null): يُرسل كلُّه دفعةً واحدة في طلبه — دائماً، فلا يدخل كلفةَ بقية النسخة ولا يُحمَّل القائمُ منه في الهدف */
      if (!spec[name][0]) {
        var at0 = -1;
        ops0.forEach(function (d, i) { if (mine(d) && d.resource === name && record(d.rows)) at0 = i; });
        if (typeof raw === 'string' && raw.length > 2) {
          if (rest.data === file.data) rest.data = Object.assign({}, file.data);
          delete rest.data[pre + name];
          whole(tag + name, raw);
        } else if (at0 >= 0 && (ops0[at0].rows.ops_nodes || []).length) {
          var blank = {};
          Object.keys(ops0[at0].rows).forEach(function (t) { blank[t] = []; });
          whole(tag + name, JSON.stringify({ version: ops0[at0].version, scope: ops0[at0].scope, resource: name, rows: ops0[at0].rows }));
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
        if (!plan) { if (over >= 0 && !big) big = tag + name + ' › ' + days[over]; return; }
        var texts = plan.map(function (idx) { var g = Object.assign({}, shared); idx.forEach(function (i) { g[days[i]] = doc[days[i]]; }); return JSON.stringify(g); });
        if (texts.some(function (t) { return t.length > 1000000; })) return;
        if (rest.data === file.data) rest.data = Object.assign({}, file.data);
        delete rest.data[pre + name];
        add(tag + name, texts);
        return;
      }
      /* نسخةٌ حديثة: صفوفُ المورد في domains.operations — تُجمع صفوفُ كل عضوٍ (بادئةُ مفتاح صفّه) مع الجذر والأعضاء المشتركة */
      var ops = record(file.domains) && Array.isArray(file.domains.operations) ? file.domains.operations : [], at = -1;
      ops.forEach(function (d, i) { if (mine(d) && d.resource === name && record(d.rows) && Array.isArray(d.rows.ops_nodes)) at = i; });
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
      if (!plan2) { if (over >= 0 && !big) big = tag + name + ' › ' + dayKids[over].member_key; return; }
      /* V7 · د6 (posfix): الحقلُ الثابت القياسي للجذر (__pMig: عمودُ <حقل>_position في صفّ كيانه) عضوٌ مشترك — المشتركةُ بمواضعها ثم الأيام */
      var head = sharedKids.map(function (r) { return { p: r.position, k: r.row_key }; }), fix = {};
      tables.forEach(function (t) {
        if (t === 'ops_nodes') return;
        (bucket[''][t] || []).forEach(function (r) {
          if (r.row_key !== root.row_key && !/^\/p:\d+$/.test(String(r.row_key).slice(root.row_key.length))) return;
          Object.keys(r).forEach(function (c) { var m = /^(.+)_position$/.exec(c); if (m && r[c] != null && r[m[1] + '_kind']) head.push({ p: r[c], f: [t, r.row_key, c] }); });
        });
      });
      head.sort(function (x, y) { return x.p - y.p; });
      var texts2 = plan2.map(function (idx) {
        var rows = {}, pos = {};
        head.forEach(function (h, i) { if (h.k != null) pos[h.k] = i; else (fix[h.f[0] + '\u0000' + h.f[1]] = fix[h.f[0] + '\u0000' + h.f[1]] || {})[h.f[2]] = i; });
        idx.forEach(function (i, n) { pos[dayKids[i].row_key] = head.length + n; });
        tables.forEach(function (t) {
          rows[t] = (bucket[''][t] || []).slice();
          idx.forEach(function (i) { rows[t] = rows[t].concat(bucket[dayKids[i].row_key][t] || []); });
          if (t === 'ops_nodes') rows[t] = rows[t].map(function (r) { return Object.prototype.hasOwnProperty.call(pos, r.row_key) ? Object.assign({}, r, { position: pos[r.row_key] }) : r; });
          else rows[t] = rows[t].map(function (r) { var f = fix[t + '\u0000' + r.row_key]; return f ? Object.assign({}, r, f) : r; });
        });
        return JSON.stringify({ version: entry.version, scope: entry.scope, resource: entry.resource, rows: rows });
      });
      if (texts2.some(function (t) { return t.length > 1000000; })) return;
      var empty = {};
      tables.forEach(function (t) { empty[t] = []; });
      rest.domains = Object.assign({}, rest.domains || file.domains, { operations: ((rest.domains || file.domains).operations).map(function (d, i) { return i === at ? Object.assign({}, d, { rows: empty }) : d; }) });
      add(tag + name, texts2);
    });
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
  var PERM_NOTE = core.PERM_NOTE;
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
    return (Array.isArray(list) ? list : []).filter(function (x) { return record(x) && typeof x.k === 'string'; }).map(function (x) { var o = { k: x.k, why: String(x.why || ''), n: integer(x.n) ? x.n : null, text: (WHY[x.why] || String(x.why || '')) + (integer(x.n) ? ' — العدد: ' + x.n : '') }; if (x.why === 'perm-grant') { o.e = x.e; o.p = x.p; o.a = x.a; } return o; });
  }
  /* V7 · 53 (بقايا 52): تضييقُ العدسات الذي سيجريه الاستيراد (019d rsDeptLensNarrow: عدساتُ الوحدة ∩ عدساتُ النسخة) يُذكر في الملخّص — «العدسات 3 من 6» */
  function lensNarrow(file, scope) {
    try { var P = KIVO.BassamPerm, L = file.perms.lenses, h = P.deptLenses(scope.departmentId), n = h.filter(function (x) { return L.indexOf(x) >= 0; }).length; return n < h.length ? n + ' من ' + P.LENS_KEYS.length : 0; } catch (e) { return 0; }
  }
  /* ملخّصُ ما قبل التأكيد — لا يودِع شيئاً (begin dry): الخادمُ يفحص الصلاحية ويعيد ما لن يُنقل من نسخةٍ قديمة */
  async function summary(file, scope) {
    var stamp = context(), id = identity();
    if (!stamp) return failure('session', 401);
    if (!id || !record(file) || !record(file.data) || !record(scope)) return failure('invalid');
    var parts = split(file, {}, 0), legacy = !file.manifest, keys = {}, names = Object.keys(file.data);
    namesOf(file);
    names.forEach(function (k) { keys[k] = file.data[k] === null ? 1 : 0; });
    var read = await post({ op: 'begin', dry: true, requestId: id, scope: scope, keys: legacy ? keys : {} }, stamp);
    if (!read.ok) return read;
    var bytes = parts.text.length;
    parts.ids.forEach(function (k) { bytes += String(parts.images[k]).length; });
    return { ok: 1, legacy: legacy, kind: file.kind || scope.kind, dept: typeof file.dept === 'string' ? file.dept : '', exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
      keys: names.length, images: parts.ids.length, bytes: bytes, noPerms: file.perms == null, lens: lensNarrow(file, scope),
      /* المنحُ القديمة تُذكر بعددها (يُحسب من الملف؛ والخادمُ يعيده مؤكَّداً بعد الرفع) */
      skip: skipList((read.data.skip || []).map(function (x) { var n = null; if (x && x.why === 'grants') { try { n = Object.keys((JSON.parse(file.data[x.k]) || {}).emp || {}).length; } catch (e) { n = null; } } return n === null ? x : Object.assign({}, x, { n: n }); })).concat(permItems(permPreview(file, scope))),
      /* V7 · 53 (ملحق 5): سطرٌ واحد بعد المُسقَط من صلاحيات الموظفين */
      permNote: PERM_NOTE,
      /* V7 · 53 تقويم (REVIEW 23): التواريخُ قبل الرفع — كما في الملف ← كما سيُحفظ، وما لا يوجد يومُه يوقف الرفع */
      dates: fileDates(file) };
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
    namesOf(file);   /* V7 · 53 (ملحق 5): أسماءُ الموظفين للملخّص ورسالة الرفض */
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
    /* V7 · 53 تقويم (REVIEW 23 · 26): «فحص التواريخ» مرحلةٌ ظاهرة قبل أي طلب — ولا تخمينَ صامت: يومٌ لا يوجد في شهره يوقف الرفع ويُسمّى بموضعه */
    var fdates = null;
    if (!job) {
      progress({ step: 'check' });
      fdates = fileDates(file);
      progress({ step: 'check', dates: fdates.days + fdates.months + fdates.values, bad: fdates.bad.length });
      if (fdates.bad.length) return Object.assign(failure('import-dates', 422), { message: 'لم يُرفع شيء ولم يتغيّر شيء:' + dateLine({ days: 0, months: 0, values: 0, conv: [], bad: fdates.bad }) + ' صحّح هذه التواريخ في الملف ثم ارفعه من جديد.', dates: fdates });
    }
    if (!job) {
      /* V7 · 53 (noreason · قرارُ المالك): لا يُسأل أحدٌ عن سبب — نافذةُ المراجعة قبل الاستيراد هي التأكيد؛ ملاحظةٌ يمرّرها المستدعي (opt.reason) تُرسل كما هي وإلا فارغة */
      var reason = typeof opt.reason === 'string' ? opt.reason.trim() : '';
      if (!same(stamp)) return failure('session', 401);
      /* ما قد يُقسم دفعاتٍ يعلنه الخادم (begin dry): أسماءُ الموارد في النسخة — مفاتيحُ data في القديمة، ومواردُ domains.operations في الحديثة */
      var legacyKeys = {}, resources = {}, spec = {}, min = 0, old = !file.manifest && record(file.data);
      if (old) Object.keys(file.data).forEach(function (k) { legacyKeys[k] = resources[k] = file.data[k] === null ? 1 : 0; });
      else if (record(file.domains) && Array.isArray(file.domains.operations)) file.domains.operations.forEach(function (d) { if (record(d) && typeof d.resource === 'string') if (scope.kind !== 'full') resources[d.resource] = 0; else if (record(d.scope)) resources['bsdept:' + d.scope.departmentId + ':' + d.resource] = record(d.rows) && Array.isArray(d.rows.ops_nodes) && d.rows.ops_nodes.length ? 0 : 1; });   /* V7 · د7: الشاملة بإدارتها · 1 = بلا صفوف */
      if (Object.keys(resources).length) {
        var asked = await post({ op: 'begin', dry: true, requestId: id, scope: scope, resources: resources, mode: opt.mode }, stamp);
        if (!asked.ok) return asked;
        if (record(asked.data.slice) && integer(asked.data.sliceMin)) { spec = asked.data.slice; min = asked.data.sliceMin; }
      }
      var parts = split(file, spec, min, scope.kind === 'full'), texts = cut(parts.text, 1000000), sizes = {}, list = [], imageOf = {};
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
    return { ok: 1, ticket: ticket, inspection: clone(inspection), dates: fdates || fileDates(file) };
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
      permLost = permItems(lost),   /* V7 · 53 (ملحق 5) */
      keysLost = lost.filter(function (x) { return !FIELD_WHY[x.why] && !nfItem(x) && x.why !== 'perm-grant'; }),
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
        (permLost.length ? ' لن يُنقل من صلاحيات الموظفين (' + permLost.length + '): ' + permLost.map(function (x) { return '«' + x.k + '»: ' + x.text; }).join(' · ') + '. ' + PERM_NOTE : '') +
        (nfLost.length ? ' تنبيهات لن تُنقل (' + nfLost.reduce(function (n, x) { return n + (x.n || 0); }, 0) + '): ' + nfLost.map(function (x) { return x.k + ' — ' + x.text; }).join(' · ') + '.' : '') +
        remapLine(i.summary) +
        permsLine(c) +
        /* V7 · 53 تقويم (REVIEW 23): التواريخُ المحوَّلة (كما في الملف ← كما سيُحفظ) */
        dateLine(prepared.dates) +
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
  /* @@CAL_DATEIN_BEGIN — V7 · 53 تقويم (REVIEW 23 · 28): كاشفُ التاريخ في الاستيراد، ملفوفٌ حول المحوّل الواحد (calConvDay). نصٌّ واحد حرفاً في الخادم
     (workers/parts/019v-calendar-convert.js) وأداة الاستيراد (src/slots/services/548-import-kit.js.tpl)، يفرضه tests/unit/v7_cal_datein.test.mjs.
     نقيٌّ سريع: لا تخزين ولا ساعة ولا طلب. التحويلُ نفسُه من المستدعي (A.day: الخادمُ calConvDay · الواجهةُ مرآتُه بـKIVO.BassamCal.hOf) — لا جدولَ ثانياً ولا محرّكَ ثانٍ.
     A = { yc(y) ⇒ 'h'|'g'|null · md(y, m) أيامُ الشهر الميلادي · key(y, m, d) ⇒ 'YYYY-MM-DD' · day('y-m-d' هجري) ⇒ يومُه الميلادي أو null · G · H أسماءُ الأشهر }.
     dateIn(v) ⇒ { ok:1, cal, k:'YYYY-MM-DD', from, h? } · { ok:0, empty:1, from } · { ok:0, from, why } (السببُ بالعربي).
     القاعدة: السنةُ أولاً (1300–1599 هجري · 1900–2199 ميلادي) ثم اللاحقة («هـ» · «م») واسمُ الشهر — وتعارضُها خطأٌ لا ترجيح. الصيغ: yyyy-mm-dd · dd/mm/yyyy · d/m/yyyy
     (و«.» و«\») · yyyymmdd · رقمُ Excel التسلسلي وخليةُ التاريخ ({k:'d'|'dt'|'i'|'f'} من 570) · الأرقامُ العربية والفارسية والغربية · أسماءُ الأشهر الهجرية والميلادية
     (والشامية والمغاربية والإنجليزية) · اسمُ اليوم قبلها · وقتٌ بعدها. الملتبسُ (ترتيبٌ · سنةٌ بخانتين) ويومٌ لا يوجد في شهره ⇒ مرفوضٌ بسببه. */
  function calDateInCore(A) {
    var MN = {};
    function fold(s) { return String(s).replace(/[ً-ْـ‎‏؜]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ \s]+/g, ' ').trim().toLowerCase(); }
    [['h', A.H], ['g', A.G], ['g', 'january february march april may june july august september october november december'.split(' ')], ['g', 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ')]]
      .forEach(function (L) { L[1].forEach(function (x, i) { MN[fold(x)] = [L[0], i + 1]; }); });
    /* أسماءٌ أخرى للشهر نفسِه: <التقويم><الرقم><الاسم> */
    ('h1المحرم|h3ربيع أول|h4ربيع الثاني|h4ربيع ثاني|h5جماد أول|h6جمادى الثانية|h6جماد ثاني|h11ذي القعدة|h12ذي الحجة|g1كانون الثاني|g2شباط|g3آذار|g4نيسان|g5أيار|g6حزيران|g7تموز|g8آب|g9أيلول|' +
     'g10تشرين الأول|g11تشرين الثاني|g12كانون الأول|g4إبريل|g6يونيه|g7يوليه|g1جانفي|g2فيفري|g4أفريل|g5ماي|g6جوان|g7جويلية|g8أوت|g9sept').split('|')
      .forEach(function (x) { var m = /^([hg])(\d+)(.+)$/.exec(x); MN[fold(m[3])] = [m[1], +m[2]]; });
    function bad(from, why) { return { ok: 0, from: from, why: why }; }
    return function dateIn(v) {
      var o = !!v && typeof v === 'object' && !Array.isArray(v), from = v == null ? '' : o ? String(v.s != null ? v.s : v.n != null ? v.n : '') : String(v), s = '', m, y, mo, d, ac = '', mc = '', serial = null, nm, hit;
      if (o && (v.k === 'd' || v.k === 'dt')) s = from.slice(0, 10);                       /* خليةُ تاريخ Excel: ميلاديةٌ دائماً */
      else if (o && (v.k === 'i' || v.k === 'f')) serial = +v.n;
      else if (o && v.k) return bad(from, 'القيمة ليست تاريخاً (وقتٌ أو مدّة)');
      else if (typeof v === 'number') serial = v;
      if (serial === null) {
        s = fold((s || from).replace(/[٠-٩]/g, function (c) { return c.charCodeAt(0) - 0x660; }).replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 0x6f0; }));
        if (!s) return { ok: 0, empty: 1, from: from };
        s = s.replace(/[,،]/g, ' ').replace(/^(?:يوم )?(?:الاحد|الاثنين|الثلاثاء|الاربعاء|الخميس|الجمعه|السبت|sun\w*|mon\w*|tue\w*|wed\w*|thu\w*|fri\w*|sat\w*) /, '').replace(/[ t]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?: ?[ap]m| ?ص| ?م)?$/, '').replace(/ +/g, ' ').trim();
        if ((m = /^(.*\d) ?(ه|هجري|هجريه|h|ah)\.?$/.exec(s))) { ac = 'h'; s = m[1]; } else if ((m = /^(.*\d) ?(م|ميلادي|ميلاديه|g|ad)\.?$/.exec(s))) { ac = 'g'; s = m[1]; }
        if (/^\d{5,6}$/.test(s)) serial = +s;
      }
      if (serial !== null) {
        if (!(serial >= 1 && serial < 109573) || serial === 60) return bad(from, 'رقمُ تاريخ Excel خارج المدى');
        s = new Date(Date.UTC(1899, 11, serial < 60 ? 31 : 30) + Math.floor(serial) * 864e5).toISOString().slice(0, 10); ac = 'g';
      }
      if ((m = /^(\d{4})[-/.\\](\d{1,2})[-/.\\](\d{1,2})$/.exec(s)) || (m = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
      else if ((m = /^(\d{1,2})[-/.\\](\d{1,2})[-/.\\](\d{4})$/.exec(s))) {
        d = +m[1]; mo = +m[2]; y = +m[3];
        if (mo > 12 && d <= 12) return bad(from, 'ترتيبُ اليوم والشهر ملتبس — المقبول يوم/شهر/سنة');
      } else if ((m = /^(\d{1,2}) (\D+?) (\d{4})$/.exec(s)) || (m = /^(\D+?) (\d{1,2}) (\d{4})$/.exec(s))) {
        nm = /^\d/.test(m[1]) ? m[2] : m[1]; hit = MN[nm] || MN[nm.replace(/^ال/, '')];
        if (!hit) return bad(from, 'اسمُ الشهر «' + nm + '» غير معروف');
        mc = hit[0]; mo = hit[1]; d = +(/^\d/.test(m[1]) ? m[1] : m[2]); y = +m[3];
      } else if (/^\d{1,2}[-/.\\]\d{1,2}[-/.\\]\d{2}$/.test(s)) return bad(from, 'السنةُ بخانتين لا تكفي — اكتبها كاملة (1448 أو 2026)');
      else return bad(from, 'صيغةُ تاريخ غير معروفة');
      var cal = A.yc(y), CN = { h: 'هجرية', g: 'ميلادية' };
      if (!cal) return bad(from, 'السنة ' + y + ' خارج المدى (هجري 1300–1599 · ميلادي 1900–2199)');
      if (ac && ac !== cal) return bad(from, 'السنة ' + y + ' ' + CN[cal] + ' واللاحقةُ «' + (ac === 'h' ? 'هـ' : 'م') + '» ' + CN[ac] + ' — صحّح أحدهما');
      if (mc && mc !== cal) return bad(from, 'الشهر «' + (mc === 'h' ? A.H : A.G)[mo - 1] + '» ' + (mc === 'h' ? 'هجري' : 'ميلادي') + ' والسنة ' + y + ' ' + CN[cal]);
      if (!(mo >= 1 && mo <= 12)) return bad(from, 'الشهر ' + mo + ' غير موجود');
      if (cal === 'g') {
        var n = A.md(y, mo);
        return d >= 1 && d <= n ? { ok: 1, cal: 'g', k: A.key(y, mo, d), from: from } : bad(from, 'اليوم ' + d + ' غير موجود في ' + A.G[mo - 1] + ' ' + y + ' (' + n + ' يوماً)');
      }
      var g = d >= 1 && d <= 30 ? A.day(y + '-' + mo + '-' + d) : null;
      return g ? { ok: 1, cal: 'h', k: g, from: from, h: { y: y, m: mo, d: d } } : bad(from, 'اليوم ' + d + ' غير موجود في ' + A.H[mo - 1] + ' ' + y + ' هـ بتقويم أم القرى' + (d === 30 ? ' (الشهرُ 29 يوماً)' : ''));
    };
  }
  /* @@CAL_DATEIN_END */
  /* مرآةُ calConvDay في الواجهة: اليومُ الهجري ⇐ الميلادي بأم القرى (KIVO.BassamCal.hOf — تقويمُ المنصة الواحد) · يومٌ لا وجود له ⇒ null */
  var CAL = KIVO.BassamCal, H2G = {};
  function hToG(k) {
    var p = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(k), y, m, d, g, i, h, off;
    if (!p) return null; if (k in H2G) return H2G[k]; y = +p[1]; m = +p[2]; d = +p[3];
    g = new Date(Date.UTC(622, 6, 16) + Math.round(864e5 * (354.36667 * (y - 1) + 29.5306 * (m - 1) + (d - 1)))).toISOString().slice(0, 10);
    for (i = 0; i < 12 && g; i++) {
      h = CAL.hOf(g); if (!h) break;
      if (h.y === y && h.m === m && h.d === d) return (H2G[k] = g);
      off = (h.y - y) * 354.367 + (h.m - m) * 29.53 + (h.d - d);
      g = CAL.gAddDays(g, -(Math.round(off) || (off > 0 ? 1 : -1)));
    }
    return (H2G[k] = null);
  }
  var dateIn0 = null;   /* يُبنى عند أول قيمة — تقويمُ المنصة (385) حاضرٌ حينها */
  function dateIn(v) { CAL = KIVO.BassamCal; return (dateIn0 || (dateIn0 = calDateInCore({ yc: function (y) { return CAL.keyCal(y + '-1'); }, md: CAL.gMonthDays, key: CAL.gKey, day: hToG, G: CAL.G_MONTHS, H: CAL.H_MONTHS })))(v); }
  /* ══ V7 · 53 تقويم (REVIEW 23): تواريخُ نسخة الإدارة/ملف Production قبل الرفع — مفاتيحُ الأيام والأشهر في مواردها وتواريخُ السجلات {y,m,d}، كلٌّ بالكاشف نفسِه.
     الخادمُ يحوّلها عند الاستيراد بالقاعدة نفسِها (019f/019g calMigDoc); وهنا تُعرض قبل الرفع: «كما في الملف ← كما سيُحفظ»، وما لا يوجد يومُه يُسمّى بموضعه ويوقف الرفع. ══ */
  /* الأساسُ لا يعرف أسماءَ موارد الأنظمة (العزل): يُفحص كلُّ موردٍ في الملف بشكله — مفاتيحُ أيامٍ/أشهرٍ في جذره وفي months، وسجلاتُ {y,m,d} في moves/reports */
  function fileDates(file) {
    var out = { days: 0, months: 0, values: 0, conv: [], bad: [] }, seen = {};
    function one(at, raw, kind) {
      var p = /^(m:)?(\d{4})-(\d{1,2})(?:-(\d{1,2})(-.+)?)?$/.exec(raw); if (!p || CAL.keyCal(p[2] + '-1') !== 'h') return;
      if (p[4] == null) {                                          /* شهرٌ هجري ⇐ الشهران الميلاديان اللذان يلمسهما (يحسم الخادمُ الأغلبية ق4/ق5) */
        var a = dateIn(p[2] + '-' + p[3] + '-1');
        if (!a.ok) { out.bad.push({ at: at, from: raw, why: a.why }); return; }
        var b = dateIn(p[2] + '-' + p[3] + '-29'); out.months++;
        if (out.conv.length < 24 && !seen[raw]) { seen[raw] = 1; out.conv.push({ at: at, from: raw, to: (p[1] || '') + a.k.slice(0, 7) + (b.ok && b.k.slice(0, 7) !== a.k.slice(0, 7) ? ' و' + b.k.slice(0, 7) : '') }); }
        return;
      }
      var r = dateIn(p[2] + '-' + p[3] + '-' + p[4]);
      if (!r.ok) { out.bad.push({ at: at, from: raw, why: r.why }); return; }
      if (kind) out.values++; else out.days++;
      if (out.conv.length < 24 && !seen[raw]) { seen[raw] = 1; out.conv.push({ at: at, from: raw, to: r.k + (p[5] || '') }); }
    }
    function walk(res, doc) {
      if (!record(doc) && !Array.isArray(doc)) return;
      if (record(doc)) Object.keys(doc).forEach(function (k) { one(res + ' › ' + k, k); });
      if (record(doc) && record(doc.months)) Object.keys(doc.months).forEach(function (k) { one(res + ' › months › ' + k, k); });
      /* سجلاتٌ بتاريخ {y,m,d} (العهدة · الاسترشاد · المضبوطات) — اليومُ 0 «غير معروف» (ق10) يُقبل في شهر يومه الأول */
      [].concat(record(doc) ? [doc.moves, doc.reports] : [doc]).forEach(function (L) {
        (Array.isArray(L) ? L : []).forEach(function (x, i) { if (record(x) && +x.y >= 1300 && +x.y <= 1599) one(res + ' › ' + (x.id || '#' + (i + 1)), x.y + '-' + x.m + '-' + (+x.d || 1), 1); });
      });
    }
    Object.keys(record(file && file.data) ? file.data : {}).forEach(function (k) {
      var v = file.data[k], doc;
      if (typeof v !== 'string' || !/^[[{]/.test(v)) return;
      try { doc = JSON.parse(v); } catch (e) { return; }
      walk(k, doc);
    });
    /* نسخةٌ حديثة: أسماءُ أعضاء الجذر في صفوف الموارد التشغيلية */
    (record(file && file.domains) && Array.isArray(file.domains.operations) ? file.domains.operations : []).forEach(function (d) {
      if (!record(d) || !record(d.rows) || !Array.isArray(d.rows.ops_nodes)) return;
      d.rows.ops_nodes.forEach(function (r) { if (r && typeof r.member_key === 'string') one(d.resource + ' › ' + r.member_key, r.member_key); });
    });
    return out;
  }
  function dateLine(fd) {
    if (!fd || !(fd.days + fd.months + fd.values) && !fd.bad.length) return '';
    return (fd.days + fd.months + fd.values ? ' تواريخ هجرية تُحوَّل إلى الميلادي (أم القرى): ' + fd.days + ' يوماً و' + fd.months + ' شهراً' + (fd.values ? ' و' + fd.values + ' سجلاً' : '') +
      ' — كما في الملف ← كما سيُحفظ: ' + fd.conv.slice(0, 6).map(function (x) { return x.from + ' ← ' + x.to; }).join(' · ') + (fd.conv.length > 6 ? ' · …' : '') + '.' : '') +
      (fd.bad.length ? ' ' + fd.bad.length + ' تاريخاً لا يوجد يومُه — لا يُرفع شيء حتى يُصحَّح: ' + fd.bad.slice(0, 8).map(function (x) { return '«' + x.at + '» ' + x.from + ': ' + x.why; }).join(' · ') + '.' : '');
  }
  /* ══ V7 · 53 تقويم (REVIEW 26): لا مغادرةَ صامتة أثناء استيرادٍ لم يُعتمد — تنبيهُ المتصفح نفسُه (كتنبيه الحفظ في 280) ══ */
  if (typeof window !== 'undefined' && window.addEventListener)
    window.addEventListener('beforeunload', function (e) { if (!live.size) return; try { e.preventDefault(); e.returnValue = ''; } catch (x) { /* متصفحٌ قديم */ } return ''; });
  return { summary: summary, prepare: prepare, approve: approve, send: send, cancel: cancel, confirm: confirm, remapLine: remapLine, permsLine: permsLine, permItems: permItems,
    dateIn: dateIn, fileDates: fileDates, dateLine: dateLine };
  });
})();
