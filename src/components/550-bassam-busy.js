
/* ═ BassamBusy — مؤشر التحميل الموحّد ═
   start(label,{sub,pct,btn,min}) → رمز له set({label,sub,pct}) و done() و fail(msg)
   wrap(promise,label,opts) · run(fn,label,opts) للعمل المتزامن الثقيل (يُرسم المؤشر أولاً ثم يُنفَّذ)
   flash(label,sub,tone) إشعار قصير بعد عملٍ انتهى · fmtBytes(n)
   الحدّ الأدنى للعرض 350ms كي لا يرفّ المؤشر، والزر الذي كان مضغوطاً يتجمّد تلقائياً. */
(function(){
  var MIN = 350, host = null, bar = null, barI = null, pill = null, lbl = null, sub = null, pct = null, sp = null;
  var toks = [], hideT = null, seq = 0;
  function el(){
    if (host) return host;
    host = document.createElement('div'); host.id = 'bs-busy'; host.hidden = true; host.setAttribute('role','status'); host.setAttribute('aria-live','polite');
    host.innerHTML = '<div class="bsb-bar"><i></i></div><div class="bsb-pill"><span class="bsb-sp"></span><div class="bsb-txt"><span class="bsb-lbl"></span><span class="bsb-sub"></span></div><span class="bsb-pct"></span></div>';
    (document.body || document.documentElement).appendChild(host);
    bar = host.firstChild; barI = bar.firstChild; pill = host.lastChild; sp = pill.firstChild; lbl = pill.querySelector('.bsb-lbl'); sub = pill.querySelector('.bsb-sub'); pct = pill.querySelector('.bsb-pct');
    return host;
  }
  function fmtBytes(n){ n = +n || 0; if (n < 1024) return n + ' B'; if (n < 1048576) return (n/1024).toFixed(n < 10240 ? 1 : 0) + ' KB'; return (n/1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB'; }
  function paint(){
    el();
    var live = toks.filter(function(t){ return !t.ended; });
    if (!live.length) return;
    var t = live[live.length - 1];
    lbl.textContent = t.label || 'جارٍ التحميل…';
    var s = t.sub || '';
    if (live.length > 1) s = (s ? s + ' · ' : '') + '+' + (live.length - 1) + (live.length - 1 === 1 ? ' عملية أخرى' : ' عمليات أخرى');
    sub.textContent = s;
    var p = t.pct;
    if (p != null && isFinite(p)) { p = Math.max(0, Math.min(100, Math.round(p))); pct.textContent = p + '٪'; bar.classList.add('det'); barI.style.width = p + '%'; }
    else { pct.textContent = ''; bar.classList.remove('det'); barI.style.width = ''; }
    clearTimeout(hideT); hideT = null;
    host.hidden = false; host.style.display = '';
    requestAnimationFrame(function(){ host.classList.add('on'); });
  }
  function hideSoon(){
    var live = toks.filter(function(t){ return !t.ended; });
    if (live.length) { paint(); return; }
    var last = toks[toks.length - 1], wait = last ? Math.max(0, MIN - (Date.now() - last.t0)) : 0;
    clearTimeout(hideT);
    hideT = setTimeout(function(){
      if (toks.some(function(t){ return !t.ended; })) return;
      toks = [];
      host.classList.remove('on');
      setTimeout(function(){ if (!toks.length) { host.hidden = true; } }, 220);
    }, wait);
  }
  function freeze(b){
    try {
      if (!b || !b.classList || b.__bsbFrozen) return null;
      b.__bsbFrozen = 1; b.classList.add('bsb-frozen'); b.setAttribute('aria-busy','true');
      var s = document.createElement('span'); s.className = 'bsb-btnsp'; b.insertBefore(s, b.firstChild);
      return function(){ try { b.classList.remove('bsb-frozen'); b.removeAttribute('aria-busy'); s.remove(); delete b.__bsbFrozen; } catch(e){} };
    } catch(e){ return null; }
  }
  function autoBtn(){
    try { var a = document.activeElement; if (!a) return null; var b = a.closest ? a.closest('button,[role=button],label') : null; return b && b !== document.body ? b : null; } catch(e){ return null; }
  }
  function start(label, o){
    o = o || {};
    var t = { id: ++seq, label: label || 'جارٍ التحميل…', sub: o.sub || '', pct: o.pct, t0: Date.now(), ended: false, unfreeze: null };
    var b = o.btn === null ? null : (o.btn || autoBtn());
    t.unfreeze = freeze(b);
    toks.push(t); paint();
    var tok = {
      set: function(x){ if (t.ended || !x) return tok; if (typeof x === 'string') x = { label: x }; if (x.label != null) t.label = x.label; if (x.sub != null) t.sub = x.sub; if ('pct' in x) t.pct = x.pct; paint(); return tok; },
      done: function(){ if (t.ended) return; t.ended = true; if (t.unfreeze) t.unfreeze(); hideSoon(); },
      fail: function(msg){ if (t.ended) return; t.ended = true; if (t.unfreeze) t.unfreeze(); if (msg) flash(msg, '', 'err'); hideSoon(); }
    };
    return tok;
  }
  function wrap(p, label, o){
    var tok = start(label, o);
    var pr = typeof p === 'function' ? Promise.resolve().then(p) : Promise.resolve(p);
    return pr.then(function(v){ tok.done(); return v; }, function(e){ tok.done(); throw e; });
  }
  /* عملٌ متزامن ثقيل: يُرسم المؤشر أولاً (إطار + مهلة قصيرة) ثم يُنفَّذ — وإلا لما ظهر شيء قبل انتهائه */
  function run(fn, label, o){
    var tok = start(label, o);
    return new Promise(function(res, rej){
      requestAnimationFrame(function(){ setTimeout(function(){
        var out; try { out = fn(tok); } catch(e){ tok.done(); rej(e); return; }
        Promise.resolve(out).then(function(v){ tok.done(); res(v); }, function(e){ tok.done(); rej(e); });
      }, 30); });
    });
  }
  /* إشعارٌ قصير بعد عملٍ انتهى (كحفظٍ طال) — CORE-01: عبر التوست الواحد (KIVO.bsToast · 280) لا عبر حبّة المؤشر */
  function flash(label, s, tone){
    try { KIVO.bsToast((label || '') + (s ? ' — ' + s : ''), { tone: tone === 'err' ? 'err' : '', ms: tone === 'err' ? 4200 : 2600 }); } catch(e){}
  }
  KIVO.BassamBusy = { start: start, wrap: wrap, run: run, flash: flash, fmtBytes: fmtBytes, active: function(){ return toks.filter(function(t){ return !t.ended; }).length; } };

  /* الطباعة / PDF: كل نداء window.print() يمرّ من هنا — يُرسَم المؤشر ثم تُفتح نافذة الطباعة */
  try {
    var oPrint = window.print.bind(window);
    window.print = function(){
      var B = KIVO.BassamBusy, tok = B.start('جارٍ تجهيز الطباعة / PDF…', { sub: 'تُفتح نافذة الطباعة بعد لحظات' });
      setTimeout(function(){ try { oPrint(); } finally { tok.done(); } }, 90);
    };
  } catch(e){}
})();
