/* ═══ التشغيل الميداني — قراءاتٌ وأوامرُ معلنة لبرامجَ أخرى (V7 · د5-هـ · p4) ═══
   كلُّ ما هنا معلنٌ في عقد البرنامج (src/systems/plan/contract.json ← provides). الجولاتُ اليومية والتقريرُ اليومي لا يسمّون مفاتيحَ الخطة
   ولا خياراتِها: يسألون بالاسم، ويكتبون فيها بأمرٍ معلن داخل مسودة حفظهم (فيبقى الحفظُ طلباً واحداً ذرّياً). بغياب هذا الملف القراءةُ تعيد
   undefined والأمرُ { ok:0, absent:1 } فلا يُكتب شيء — وسلوكُ كلِّ مستهلكٍ عند الغياب مكتوبٌ في عقده هو (consumes ← absent).
   «via» اختياريّ — طريقُ القراءة الذي كان المستهلكُ يقرأ به، ليبقى السلوكُ حرفاً بحرف:
       بلا via            قراءةُ Operations المباشرة — ترمي ما كانت ترميه إن لم يُقرأ الموردُ أو مُنع (أو operations-read-required بلا خدمة).
       مسودة ({ get })    القراءةُ داخل مسودة المستدعي (draft.get): تسجّل اعتمادَ القراءة في حفظه الذرّي كما كان.
       دالة (name ⇒ قيمة)  قارئُ صفحة المستدعي (مسودةُ الصفحة): المالكُ يسمّي المفتاح والصفحةُ تقرأ بطريقتها.
       "granted"          كالمباشرة، لكن undefined إن حُجبت القراءة (صفحاتُ القاعدة: ملفي).
       "text"             نسخةٌ من نصّ المورد (JSON.parse) أو null.
     read     plan.doc@1(via?)            وثيقةُ الخطة { floors, months, zones, gates, … } كما هي مخزَّنة (أو undefined/null).
     read     plan.zoneOpts@1(via?)       خياراتُ المصليات (المناطق · الأدوار · الأنواع · الفئات وأنماطها).
     read     plan.gateOpts@1(via?)       خياراتُ الأبواب.
     read     plan.resources@1(…kinds)    أسماءُ موارد الخطة بحسب النوع: doc · zoneOpts · gateOpts (بلا نوعٍ: كلُّها) — لمن ينتظر تغيّرَها.
     command  plan.doc.set@1      { value } داخل مسودة المستدعي: يكتب وثيقةَ الخطة كما أعدّها.
     command  plan.zoneOpts.set@1 { value } داخل مسودة المستدعي: يكتب خياراتِ المصليات.
     command  plan.optRef@1 { kind, was, reg?, name, code? } ← Promise: الأمرُ الخادمي المعلن (V7 · 53) — تعديلُ الخيار بالمرجع في كل الأشهر والجولات.
     command  plan.gateOpts.set@1 { value } داخل مسودة المستدعي: يكتب خياراتِ الأبواب. */
(function () {
  var bus = KIVO.bus;
  var RES = { doc: 'bassam_plan_v1', zoneOpts: 'bassam_zone_opts_v1', gateOpts: 'bassam_gate_opts_v1' };
  function via(how, key) {
    if (typeof how === 'function') return how(key);
    if (how && typeof how.get === 'function') return how.get(key);
    var S = KIVO.__BS_SRV && KIVO.__BS_SRV.operations;
    if (how === 'granted' && S && S.state(key) === 'denied') return undefined;
    if (how === 'text' && S) { var t = S.text(key); return t == null ? null : JSON.parse(t); }
    var service = KIVO.__BS_SRV && KIVO.__BS_SRV.operations;
    if (!service) throw Error('operations-read-required');
    return service.get(key);
  }
  bus.provide('plan.doc@1', function (how) { return via(how, RES.doc); });
  bus.provide('plan.zoneOpts@1', function (how) { return via(how, RES.zoneOpts); });
  bus.provide('plan.gateOpts@1', function (how) { return via(how, RES.gateOpts); });
  bus.provide('plan.resources@1', function () {
    var kinds = arguments.length ? Array.prototype.slice.call(arguments) : Object.keys(RES);
    return kinds.map(function (kind) { return RES[kind]; }).filter(Boolean);
  });
  /* V7 · د5-هـ: الكتابةُ في المسودة وحدها — لا قراءةَ قبلها (من لم يقرأ المورد يُرفض حفظُه كما كان: operations-review-required) */
  function setter(name, key) {
    bus.command(name, function (payload, draft) {
      if (!draft || typeof draft.set !== 'function') throw Error('bus-draft-required: ' + name);
      draft.set(key, payload && payload.value);
      return { ok: 1 };
    });
  }
  setter('plan.doc.set@1', RES.doc);
  setter('plan.zoneOpts.set@1', RES.zoneOpts);
  setter('plan.gateOpts.set@1', RES.gateOpts);
  /* V7 · 53 (port-sync · بند 3 · قرار المالك 24 نوفمبر): تعديلُ اسم خيار المصلى أو رمزه يسري على كل الأشهر والجولات (المقفلة والمعتمدة والمنقضية)
     بالأمر الخادمي المعلن plan.optRef (POST /api/plan/opt-ref — src/systems/plan/server/019p6): يُرسل الخيارُ وحده لا الوثائق، وأساسُه نسخةُ الكتالوج
     التي قرأها المعدِّل؛ وبعد النجاح تُعاد قراءةُ مجموعة القراءة فيصل الأثرُ إلى الصفحات بالانعكاس الحيّ. ← { ok, zones } أو { ok:0, err } */
  bus.command('plan.optRef@1', function (p) {
    var S = KIVO.__BS_SRV, O = S && S.operations, c = O && O.context && O.context();
    if (!c || !p) return Promise.resolve({ ok: 0, err: 'session' });
    var body = { uid: c.uid, dept: c.dept, kind: p.kind, was: p.was, name: p.name, base: S.rev(O.key(RES.zoneOpts)) || 0 };
    if (p.reg) body.reg = p.reg; if (p.kind !== 'zcat') body.code = p.code;
    return fetch('/api/plan/opt-ref', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (j) { return j && j.ok === 1 && S.resync ? S.resync().then(function () { return j; }) : j || { ok: 0, err: 'invalid' }; })
      .catch(function () { return { ok: 0, err: 'network' }; });
  });
})();
