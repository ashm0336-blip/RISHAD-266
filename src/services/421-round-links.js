/* ═══ الجولات اليومية — قراءاتٌ وأوامرُ معلنة لبرامجَ أخرى (V7 · د5-هـ · p4) ═══
   كلُّ ما هنا معلنٌ في عقد البرنامج (src/contracts/rounds.json ← provides). التشغيلُ الميداني لا يسمّي مفتاحَ الجولات: يقرأ بالاسم،
   ويغيّر أيامَ الجولات (تنقيةُ خيارٍ محذوف · نشرُ اسمٍ معدَّل · حذفُ شهرٍ أو موقع · إضافةُ موقع) بأمرٍ معلن داخل مسودة حفظه — فيبقى الحفظُ
   طلباً واحداً ذرّياً. بغياب هذا الملف القراءةُ تعيد undefined والأمرُ { ok:0, absent:1 } فلا يُكتب في الجولات شيء.
   قاعدةُ المالك (برومت 43 · الجذر 3): ما يأتي من الخطة إلى أيام الجولات محصورٌ في الحاضر والمستقبل غيرِ المعتمد — يومٌ (y-m-d) اليومَ أو بعده
   أو علامةُ شهرٍ (m:y-m) هذا الشهرَ أو بعده؛ الأيامُ الماضية والمعتمدة لا تُمسّ.
     read     rounds.days@1(via?)          وثيقةُ الجولات { 'y-m-d': { ap, d:[موقع] }, 'm:y-m': {…} } (via كما في 404-plan-p4: مسودة أو قارئُ صفحة أو بلا).
     read     rounds.lensFilter@1(sites)   المواقعُ بعد تصفيتها بعدسات سقف الإدارة (كما تُنسخ إلى الجولة).
     read     rounds.names@1()             { مفتاحُ مورد الجولات: اسمُه للعرض } — لرسالة «لم يُحدَّث معه».
     command  rounds.sites.patch@1 { site }  كلُّ موقعٍ غير معتمد في يومٍ غير معتمد من اليوم فصاعداً ← site(موقع).
     command  rounds.month.clear@1 { y, m }  يحذف أيامَ الشهر وعلامتَه.
     command  rounds.site.remove@1 { index } يحذف الموقعَ بموضعه من كل يوم.
     command  rounds.sites.pad@1 { sites }   يكمّل مواقعَ كل يومٍ غير معتمد من اليوم فصاعداً حتى عدد sites (بهويّاتها sid). */
(function () {
  var bus = KIVO.bus, KEY = 'bassam_rounds_v1';
  function via(how) {
    if (typeof how === 'function') return how(KEY);
    if (how && typeof how.get === 'function') return how.get(KEY);
    var service = KIVO.__BS_SRV && KIVO.__BS_SRV.operations;
    if (!service) throw Error('operations-read-required');
    return service.get(KEY);
  }
  function drafted(name, draft) {
    if (!draft || typeof draft.get !== 'function' || typeof draft.set !== 'function') throw Error('bus-draft-required: ' + name);
    return draft;
  }
  /* اليومُ (يومُ الرياض) أو بعده — مفتاحُ يوم أو علامةُ شهر */
  function keyNow(key) {
    try {
      var now = KIVO.BassamCal.hPartsRiyadh(new Date()),
        m = /^(?:m:)?(\d+)-(\d+)(?:-(\d+))?$/.exec(String(key));
      if (!m) return false;
      var y = +m[1], mo = +m[2], d = null == m[3] ? null : +m[3];
      return y !== now.y ? y > now.y : mo !== now.m ? mo > now.m : null == d || d >= now.d;
    } catch (e) {
      return false;
    }
  }
  bus.provide('rounds.days@1', function (how) { return via(how); });
  bus.provide('rounds.lensFilter@1', function (sites) {
    return KIVO.BassamRound && KIVO.BassamRound.lensFilter ? KIVO.BassamRound.lensFilter(sites) : sites;
  });
  bus.provide('rounds.names@1', function () { var o = {}; o[KEY] = 'الجولات اليومية'; return o; });

  bus.command('rounds.sites.patch@1', function (payload, draft) {
    drafted('rounds.sites.patch@1', draft);
    var rounds = draft.get(KEY), site = payload.site, changed = false;
    if (rounds && typeof rounds === 'object') {
      Object.keys(rounds).forEach(function (key) {
        var rec = rounds[key];
        if (rec && Array.isArray(rec.d) && !rec.ap && keyNow(key))
          rec.d = rec.d.map(function (floor) {
            if (!floor || floor.ap) return floor;
            changed = true;
            return site(floor);
          });
      });
      if (changed) draft.set(KEY, rounds);
    }
    return { ok: 1, changed: changed };
  });

  bus.command('rounds.month.clear@1', function (payload, draft) {
    drafted('rounds.month.clear@1', draft);
    var rounds = draft.get(KEY), changed = false;
    if (rounds && typeof rounds === 'object') {
      var day = payload.y + '-' + payload.m + '-', mark = 'm:' + payload.y + '-' + payload.m;
      Object.keys(rounds).forEach(function (key) {
        if (key.indexOf(day) === 0 || key === mark) { delete rounds[key]; changed = true; }
      });
      if (changed) draft.set(KEY, rounds);
    }
    return { ok: 1, changed: changed };
  });

  bus.command('rounds.site.remove@1', function (payload, draft) {
    drafted('rounds.site.remove@1', draft);
    var rounds = draft.get(KEY), index = payload.index;
    if (!(rounds && typeof rounds === 'object')) return { ok: 1, changed: false };
    Object.keys(rounds).forEach(function (key) {
      var rec = rounds[key];
      if (rec && Array.isArray(rec.d) && rec.d.length > index) rec.d.splice(index, 1);
    });
    draft.set(KEY, rounds);   /* كما كان: تُكتب الوثيقةُ مع حذف الموقع ولو لم يحمله يوم */
    return { ok: 1, changed: true };
  });

  bus.command('rounds.sites.pad@1', function (payload, draft) {
    drafted('rounds.sites.pad@1', draft);
    var rounds = draft.get(KEY), sites = payload.sites || [], changed = false;
    if (rounds && typeof rounds === 'object') {
      Object.keys(rounds).forEach(function (key) {
        var rec = rounds[key];
        if (rec && Array.isArray(rec.d) && !rec.ap && keyNow(key))
          while (rec.d.length < sites.length) {
            rec.d.push({ zones: [], gates: [], marks: [], paths: [], sid: (sites[rec.d.length] || {}).sid });
            changed = true;
          }
      });
      if (changed) draft.set(KEY, rounds);
    }
    return { ok: 1, changed: changed };
  });
})();
