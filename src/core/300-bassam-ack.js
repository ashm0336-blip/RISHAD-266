
/* ═══ صدقُ رسائل النجاح — Candidate 203 ═══
   إدراجُ الكتابة في الطابور المحلّي ليس نجاحاً على الخادم. BassamAck.toast تُظهر رسالةَ «حُفظ/نُشر/وصل…» بعد إقرار الخادم
   للكتابات المعلّقة، وإلا «حُفظ محلياً — بانتظار المزامنة»؛ وإن رُفضت الكتابة فلا رسالةَ نجاح (طبقةُ التخزين تعلن الرفض).
   الكتابةُ لا تنتظر ولا تصبح متزامنة — الرسالةُ وحدَها هي التي تنتظر. */
(function(){
  var PENDING = "حُفظ محلياً — بانتظار المزامنة";
  function cf(){ try { return !!(window.__BS_BOOT && window.__BS_BOOT.cf); } catch (e) { return false; } }
  /* ack(ms): true إن أُقرّت كلُّ الكتابات المعلّقة خلال المهلة · false إن انقطع/تأخّر · {denied:true} إن رُفضت كتابةٌ خلالها */
  function ack(ms){
    var S = KIVO.__BS_SRV;
    if (!cf() || !S || !S.flushAsync) return Promise.resolve(true);
    var t0 = Date.now(), d0 = S.denied ? S.denied() : 0, f0 = S.fails ? S.fails() : 0, lim = ms || 8000;
    var loop = function(){
      var left = lim - (Date.now() - t0);
      return Promise.resolve(S.flushAsync(Math.max(600, left))).catch(function(){ return false; }).then(function(ok){
        if (S.denied && S.denied() !== d0) return { denied: true };
        if (ok) return true;
        if (S.fails && S.fails() !== f0) return false;          /* إخفاقُ إرسالٍ (انقطاع/خطأ/429): لم يُقرّ الآن — بلا انتظارٍ إضافي */
        if (Date.now() - t0 >= lim) return false;
        /* تجدّد الطابور بكتابةٍ أحدث أثناء الإرسال (كتابةٌ متلاحقة): جولةٌ أخرى قصيرة */
        if ((S.dirty && S.dirty()) || (S.inflight && S.inflight())) return new Promise(function(r){ setTimeout(r, 120); }).then(loop);
        return false;
      });
    };
    return loop();
  }
  /* toast(inst, msg, kind, o): o.local صيغةٌ للتخزين المحلّي الصِّرف (بلا خادم) · o.pending بديلُ رسالة الانتظار · o.ms المهلة */
  function toast(inst, msg, kind, o){
    o = o || {};
    var show = function(m, k){ try { if (inst && inst.bsToast) inst.bsToast(m, k); else if (window.bsToast) window.bsToast(m, k); } catch (e) {} };
    if (!cf()) { show(o.local || msg, kind); return Promise.resolve(true); }
    return ack(o.ms).then(function(r){
      if (r === true) { show(msg, kind); return true; }
      if (r && r.denied) return false;                       /* الرفضُ أُعلن من طبقة التخزين */
      show(o.pending || PENDING, "warn"); return false;
    });
  }
  KIVO.BassamAck = { ack: ack, toast: toast, PENDING: PENDING };
})();
