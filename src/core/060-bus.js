/* ═══ ناقلُ الأحداث — القاعدةُ وسيطٌ فقط (V7 · د5-ب) ═══
   لا اسمَ برنامجٍ هنا ولا معرفةَ بما يُنشر: كلُّ برنامجٍ يعلن في عقده (contract.json) ما يوفّره وما يستهلكه، ويتعامل مع غيره بالاسم المُصدَّر
   «مالك.شيء@إصدار» وحده. غيابُ الطرف الآخر ليس خطأً: القراءةُ تعيد undefined، والأمرُ يعيد { ok:0, absent:1 }، والحدثُ بلا مستمعٍ يمرّ بصمت.
   خمسةُ أشكالٍ من الربط:
     read        provide(name, fn) · read(name, …args)            قراءةٌ معلنة يوفّرها المالك.
     command     command(name, fn) · call(name, payload, draft?)   أمرٌ يغيّر به المالكُ بياناتِه هو؛ draft اختياريّ ليُنفَّذ داخل مسودة المستدعي.
     event       subscribe(name, fn) · publish(name, payload)      إعلامٌ بعد الوقوع؛ خطأُ مستمعٍ لا يمسّ الناشر ولا بقيةَ المستمعين.
     participant participant(name, fn) · participate(name, payload, draft)
                 ◄ المشاركُ داخل المسودة نفسها (المعاملةُ الذرّية): الناشرُ ينادي participate من داخل دالة التعديل لحفظه هو، ويسلّم مسودتَه؛
                   كلُّ مشاركٍ يضيف تغييرَه (مفاتيحَه هو) إلى المسودة نفسِها بـdraft.set. فيُرسل الجميعُ في طلب حفظٍ واحد: يُقبل كلُّه أو يُرفض كلُّه.
                   المشاركون متزامنون ويُنادَون بترتيب التسجيل؛ خطأُ أحدهم يُرمى إلى الناشر فيفشل تعديلُه كلُّه ولا يُرسل شيء — لا نصفَ تطبيق.
     has(name)   هل للاسم مزوّدٌ حاضر (قراءةً أو أمراً أو مشاركاً) — لتُخفي الواجهةُ زرّاً غاب مالكُه.
   الاسم: حروفٌ صغيرة ونقاط ثم @رقم الإصدار (مثل thing.changed@1). اسمٌ بغير هذا الشكل خطأُ برمجةٍ يُرمى فوراً. */
(function () {
  var NAME = /^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+@[1-9][0-9]*$/;
  var reads = Object.create(null), commands = Object.create(null), subscribers = Object.create(null), participants = Object.create(null);
  function named(name) { if (typeof name !== 'string' || !NAME.test(name)) throw Error('bus-name: ' + String(name)); return name; }
  function fn(f) { if (typeof f !== 'function') throw Error('bus-handler'); return f; }
  function single(table, kind, name, f) {
    named(name); fn(f);
    if (table[name] && table[name] !== f) throw Error('bus-' + kind + '-taken: ' + name);   /* مزوّدٌ واحد لكل اسم */
    table[name] = f;
    return function () { if (table[name] === f) delete table[name]; };
  }
  function many(table, name, f) {
    named(name); fn(f);
    var list = table[name] || (table[name] = []);
    if (list.indexOf(f) === -1) list.push(f);
    return function () { var i = list.indexOf(f); if (i !== -1) list.splice(i, 1); if (!list.length && table[name] === list) delete table[name]; };
  }
  var bus = {
    provide: function (name, f) { return single(reads, 'read', name, f); },
    read: function (name) { var f = reads[named(name)]; return f ? f.apply(null, Array.prototype.slice.call(arguments, 1)) : undefined; },
    command: function (name, f) { return single(commands, 'command', name, f); },
    call: function (name, payload, draft) { var f = commands[named(name)]; return f ? f(payload, draft) : { ok: 0, absent: 1 }; },
    subscribe: function (name, f) { return many(subscribers, name, f); },
    publish: function (name, payload) {
      var list = (subscribers[named(name)] || []).slice(), n = 0;
      for (var i = 0; i < list.length; i++) { try { list[i](payload); n++; } catch (error) { try { console.error(error); } catch (e) { /* إبلاغٌ فقط */ } } }
      return n;
    },
    participant: function (name, f) { return many(participants, name, f); },
    participate: function (name, payload, draft) {
      named(name);
      if (!draft || typeof draft.set !== 'function' || typeof draft.get !== 'function') throw Error('bus-draft-required: ' + name);
      var list = (participants[name] || []).slice();
      for (var i = 0; i < list.length; i++) list[i](payload, draft);   /* خطأُ مشاركٍ يُرمى: المسودةُ كلُّها لا تُرسل */
      return list.length;
    },
    has: function (name) { named(name); return !!(reads[name] || commands[name] || (participants[name] && participants[name].length)); }
  };
  KIVO.bus = Object.freeze(bus);
})();
