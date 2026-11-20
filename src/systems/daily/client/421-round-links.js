/* ═══ الجولات اليومية — قراءاتٌ وأوامرُ معلنة لبرامجَ أخرى (V7 · د5-هـ · p4) ═══
   كلُّ ما هنا معلنٌ في عقد البرنامج (src/contracts/rounds.json ← provides). التشغيلُ الميداني لا يسمّي مفتاحَ الجولات: يقرأ بالاسم،
   ويغيّر أيامَ الجولات (تنقيةُ خيارٍ محذوف · نشرُ اسمٍ معدَّل · حذفُ شهرٍ أو موقع · إضافةُ موقع) بأمرٍ معلن داخل مسودة حفظه — فيبقى الحفظُ
   طلباً واحداً ذرّياً. بغياب هذا الملف القراءةُ تعيد undefined والأمرُ { ok:0, absent:1 } فلا يُكتب في الجولات شيء.
   قاعدةُ المالك (برومت 43 · الجذر 3): ما يأتي من الخطة إلى أيام الجولات محصورٌ في الحاضر والمستقبل غيرِ المعتمد — يومٌ (y-m-d) اليومَ أو بعده
   أو علامةُ شهرٍ (m:y-m) هذا الشهرَ أو بعده؛ الأيامُ الماضية والمعتمدة لا تُمسّ.
     read     daily.days@1(via?)          وثيقةُ الجولات { 'y-m-d': { ap, d:[موقع] }, 'm:y-m': {…} } (via كما في 404-plan-p4: مسودة أو قارئُ صفحة أو بلا).
     read     daily.lensFilter@1(sites)   المواقعُ بعد تصفيتها بعدسات سقف الإدارة (كما تُنسخ إلى الجولة).
     read     daily.names@1()             { مفتاحُ مورد الجولات: اسمُه للعرض } — لرسالة «لم يُحدَّث معه».
     command  daily.sites.patch@1 { site }  كلُّ موقعٍ غير معتمد في يومٍ غير معتمد من اليوم فصاعداً ← site(موقع).
     command  daily.month.clear@1 { y, m }  يحذف أيامَ الشهر وعلامتَه.
     command  daily.site.remove@1 { index } يحذف الموقعَ بموضعه من كل يوم.
     command  daily.sites.pad@1 { sites }   يكمّل مواقعَ كل يومٍ غير معتمد من اليوم فصاعداً حتى عدد sites (بهويّاتها sid).
   V7 · د5-هـ (r4) — روابطُ التقرير اليومي:
     read     daily.resources@1()          [مفتاحُ مورد الجولات] — لمن ينتظر تغيّرَه دون أن يسمّيه.
     command  daily.spot.set@1 { day, rec } يضع سجلَّ يوم الجولة day (بعد تسكين موظفٍ أو رفعه من التقرير) ويكتب الوثيقة.
     participant dreport.pulled@1 { y, m, d, shift, from? }   سحبُ وردية التقرير (أو متابعتُها): تُنشأ جولةُ اليوم في المسودة نفسِها (prepareEnsure)
                 والنتيجةُ تُكتب على الحدث نفسِه event.round ليقرأها الناشرُ لإشعاره. لا تُنشأ إن أُطفئت «الجولات» (daily/rounds) في الإدارة.
     participant dreport.shiftApproved@1 { y, m, d, shift, value }   اعتمادُ الوردية أو فتحُها: value ⇒ تُنشأ الجولةُ أولاً، ثم تُعتمد جولةُ الوردية
                 أو تُفتح (prepareShiftAp) ← event.round. */
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
  bus.provide('daily.days@1', function (how) { return via(how); });
  bus.provide('daily.lensFilter@1', function (sites) {
    return KIVO.BassamRound && KIVO.BassamRound.lensFilter ? KIVO.BassamRound.lensFilter(sites) : sites;
  });
  bus.provide('daily.names@1', function () { var o = {}; o[KEY] = 'الجولات اليومية'; return o; });
  bus.provide('daily.resources@1', function () { return [KEY]; });

  bus.command('daily.sites.patch@1', function (payload, draft) {
    drafted('daily.sites.patch@1', draft);
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

  bus.command('daily.month.clear@1', function (payload, draft) {
    drafted('daily.month.clear@1', draft);
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

  bus.command('daily.site.remove@1', function (payload, draft) {
    drafted('daily.site.remove@1', draft);
    var rounds = draft.get(KEY), index = payload.index;
    if (!(rounds && typeof rounds === 'object')) return { ok: 1, changed: false };
    Object.keys(rounds).forEach(function (key) {
      var rec = rounds[key];
      if (rec && Array.isArray(rec.d) && rec.d.length > index) rec.d.splice(index, 1);
    });
    draft.set(KEY, rounds);   /* كما كان: تُكتب الوثيقةُ مع حذف الموقع ولو لم يحمله يوم */
    return { ok: 1, changed: true };
  });

  bus.command('daily.sites.pad@1', function (payload, draft) {
    drafted('daily.sites.pad@1', draft);
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

  /* ── V7 · د5-هـ (r4): التقرير اليومي ── */
  bus.command('daily.spot.set@1', function (payload, draft) {
    drafted('daily.spot.set@1', draft);
    var rounds = draft.get(KEY);
    rounds = rounds && typeof rounds === 'object' ? rounds : {};
    rounds[payload.day] = payload.rec;
    draft.set(KEY, rounds);
    return { ok: 1, changed: true };
  });
  /* «الجولات» مفعَّلةٌ في الإدارة النشطة؟ — الشرطُ نفسُه الذي كان التقريرُ يسأله (bsOn("daily/rounds")) */
  function roundsOn() { try { var P = KIVO.BassamPerm; return !P || !P.on || !!P.on('daily/rounds'); } catch (e) { return true; } }
  bus.participant('dreport.pulled@1', function (event, draft) {
    if (!(KIVO.BassamRound && roundsOn())) return;
    event.round = KIVO.BassamRound.prepareEnsure(draft, event.y, event.m, event.d);
  });
  bus.participant('dreport.shiftApproved@1', function (event, draft) {
    if (!(KIVO.BassamRound && roundsOn())) return;
    if (event.value) KIVO.BassamRound.prepareEnsure(draft, event.y, event.m, event.d);
    event.round = KIVO.BassamRound.prepareShiftAp(draft, event.y, event.m, event.d, event.shift, event.value ? 1 : 0);
  });
})();
