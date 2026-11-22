/* ═══ التقرير اليومي — قراءاتُه المعلنة لغيره (V7 · د5-هـ · م2) ═══
   كلُّ ما هنا معلنٌ في عقد البرنامج (src/systems/dreport/contract.json ← provides). القاعدةُ والبرامجُ الأخرى لا تسمّي مفاتيحَ التقرير:
   تسأل بالاسم. بغياب هذا الملف القراءةُ تعيد undefined، وسلوكُ كلِّ مستهلكٍ عند الغياب مكتوبٌ في عقده (consumes ← absent) أو في _base.json.
   «via» اختياريّ — طريقُ القراءة الذي كان المستهلكُ يقرأ به، ليبقى السلوكُ حرفاً بحرف:
       بلا via            قراءةُ Operations المباشرة — ترمي ما كانت ترميه إن لم يُقرأ الموردُ (أو operations-read-required بلا خدمة).
       مسودة ({ get })    القراءةُ داخل مسودة المستدعي (draft.get): تسجّل اعتمادَ القراءة في حفظه الذرّي.
       دالة (name ⇒ قيمة)  قارئُ صفحة المستدعي: المالكُ يسمّي المفتاح والصفحةُ تقرأ بطريقتها.
       "granted"          كالمباشرة، لكن undefined إن حُجبت القراءة.
       "text"             نسخةٌ من نصّ المورد (JSON.parse) أو null.
     read     dreport.doc@1(via?)          وثيقةُ التقرير اليومي { "سنة-شهر-يوم": { created, shifts … }, "m:سنة-شهر": { … } } كما هي مخزَّنة.
     read     dreport.leaveKinds@1(via?)   أنواعُ الإجازات (القائمة المرجعية) كما هي مخزَّنة.
     read     dreport.resources@1(…kinds)  أسماءُ موارد التقرير بحسب النوع: doc · leaveKinds (بلا نوعٍ: كلُّها) — لمن ينتظر تغيّرَها. */
(function () {
  var bus = KIVO.bus;
  var RES = { doc: 'bassam_dreport_v1', leaveKinds: 'bassam_leave_kinds_v1' };
  function via(how, key) {
    if (typeof how === 'function') return how(key);
    if (how && typeof how.get === 'function') return how.get(key);
    var S = KIVO.__BS_SRV && KIVO.__BS_SRV.operations;
    if (how === 'granted' && S && S.state(key) === 'denied') return undefined;
    if (how === 'text' && S) { var t = S.text(key); return t == null ? null : JSON.parse(t); }
    if (!S) throw Error('operations-read-required');
    return S.get(key);
  }
  bus.provide('dreport.doc@1', function (how) { return via(how, RES.doc); });
  bus.provide('dreport.leaveKinds@1', function (how) { return via(how, RES.leaveKinds); });
  bus.provide('dreport.resources@1', function () {
    var kinds = arguments.length ? Array.prototype.slice.call(arguments) : Object.keys(RES);
    return kinds.map(function (kind) { return RES[kind]; }).filter(Boolean);
  });
})();
