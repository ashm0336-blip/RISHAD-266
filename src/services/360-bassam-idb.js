
(function(){
  /* Cloud image transport only. Page memory may cache confirmed bytes, but a
     missing server or a failed request must never open a device database. */
  function u(k){ return "/api/img/" + encodeURIComponent(String(k)); }
  /* ══ R169-CC: خريطةٌ أصليّةٌ تعبر سقفَ الطلب ══════════════════════════════
     كان الرفعُ طلباً واحداً، وسقفُ جسم الطلب 512 ك.ب — فكلُّ خريطةٍ أكبر تُردُّ بـ413: لا تُرفع أولَ مرّة،
     ولا تعود في الاستعادة. الآن: ما جاوز الحدَّ يُقطَّع أجزاءً (400 ك.ب) يجمعها الخادمُ في دفعةٍ ذرّيّة،
     بلا أيِّ ضغطٍ أو تحويلٍ أو تسطيحِ شفافية — البايتاتُ كما هي. */
  var IMG_PART = 400 * 1024;
  function putErr(r){ return r.json().catch(function(){ return null; }).then(function(j){ throw new Error((j && j.err) ? (j.err + " (HTTP " + r.status + ")") : ("HTTP " + r.status)); }); }
  function putAck(r, length, part, count) {
    if (!r.ok) return putErr(r);
    return r.json().catch(function(){ return null; }).then(function(j){
      var valid = j && j.ok === 1;
      if (part != null && part < count - 1) valid = valid && j.part === part && j.of === count;
      else valid = valid && Number.isSafeInteger(j.n) && j.n === length && (part == null || j.parts === count);
      if (!valid) throw new Error('لم يؤكد الخادم حفظ الصورة — أعد المحاولة');
      return true;
    });
  }
  var srvIDB = {
    set: function(key, val){
      var v = String(val), n = Math.max(1, Math.ceil(v.length / IMG_PART)), epoch = imcEpoch;
      if (n === 1) return fetch(u(key), { method:"PUT", headers:{"Content-Type":"text/plain; charset=utf-8"}, body:v })
        .then(function(r){ return putAck(r, v.length, null, n); });
      var i = 0;
      var step = function(){
        imcRequire(epoch);
        if (i >= n) return true;
        var p = i++;
        return fetch(u(key) + "?p=" + p + "&n=" + n, { method:"PUT", headers:{"Content-Type":"text/plain; charset=utf-8"}, body:v.slice(p * IMG_PART, (p + 1) * IMG_PART) })
          .then(function(r){ return putAck(r, v.length, p, n); })
          .then(step);
      };
      return Promise.resolve().then(step);
    },
    get: function(key){
      var epoch = imcEpoch;
      return fetch(u(key)).then(function(r){ return r.ok ? r.text() : null; }).then(function(v){ return epoch === imcEpoch ? v : null; }).catch(function(){ return null; });
    },
    /* KIVO_265 · حادثةُ الصور: جلبٌ يسمّي سببَ الفشل (403 بسببه · 404 · لا اتصال) بدل null الصامت — لنافذة التوثيق عند المسؤول */
    getInfo: function(key){
      var epoch = imcEpoch;
      return fetch(u(key)).then(function(r){
        if (r.ok) return r.text().then(function(t){ return { ok: true, status: 200, v: t }; });
        return r.json().catch(function(){ return null; }).then(function(j){ return { ok: false, status: r.status, v: null, why: (j && (j.why || j.err)) || '' }; });
      }).then(function(r){ return epoch === imcEpoch ? r : { ok: false, status: 409, v: null, why: 'session-changed' }; })
        .catch(function(){ return { ok: false, status: 0, v: null, why: 'offline' }; });
    },
    del: function(key){
      return fetch(u(key), { method:"DELETE" }).then(function(){}).catch(function(){});
    },
    /* الجردُ مفاتيحُ لا صور: الخادمُ لا يقرأ جسمَ صورةٍ ليبني قائمة، والواجهةُ
       لا تحتاج إلا المفاتيح (جامعُ الصور يقارن المفاتيحَ بالمشار إليه). */
    getAll: function(){
      var epoch = imcEpoch;
      return fetch("/api/imgs?list=1").then(function(r){
        if (!r.ok) return putErr(r);
        return r.json();
      }).then(function(m){
        imcRequire(epoch);
        if (!m || typeof m !== 'object' || Array.isArray(m) || Object.keys(m).some(function(k){ return m[k] !== ''; }))
          throw new Error('تعذّر جرد الصور — لم تُنشأ نسخة احتياطية جزئية');
        return m;
      });
    },
    /* جلبٌ صارمٌ لصورةٍ واحدة: يرمي عند أيِّ إخفاق — تستعمله النسخةُ الشاملة
       وحدها، لأن نسخةً بصورةٍ ناقصةٍ أسوأُ من نسخةٍ لم تُكتب. */
    getStrict: function(key){
      var epoch = imcEpoch;
      return fetch(u(key)).then(function(r){
        if (!r.ok) throw new Error("تعذّر جلب الصورة " + key + " (HTTP " + r.status + ")");
        return r.text();
      }).then(function(v){ imcRequire(epoch); return v; });
    }
  };
  /* جلبٌ متتابعٌ بثلاثة عمّالٍ لا أكثر — لا آلافَ الطلبات المتوازية، وأولُ
     إخفاقٍ يوقف الجميع ويرفع الخطأ كما هو. */
  function poolGet(keys, n, get){
    return new Promise(function(res, rej){
      var out = {}, i = 0, live = 0, dead = false;
      var step = function(){
        if (dead) return;
        if (i >= keys.length && live === 0) return res(out);
        while (live < n && i < keys.length) (function(k){
          live++;
          get(k).then(function(v){
            if (v == null) throw new Error("الصورة " + k + " غير موجودة على الخادم");
            out[k] = v; live--; step();
          }).catch(function(e){ if (!dead) { dead = true; rej(e); } });
        })(keys[i++]);
      };
      step();
    });
  }
  /* ══ خطُّ ضغطٍ واحدٌ لكل صورةٍ تُرفع ══════════════════════════════════════
     صورةُ خريطةٍ من جوّالٍ حديث تبلغ ملايين البايتات، ومعالجةُ حمولةٍ بهذا
     الحجم في الخادم تتجاوز ميزانيتَه فيُقتل الطلبُ ويصل المستخدمَ 503 بلا
     بيان. فتُضغط هنا قبل أن تُرسل: أقصى ضلعٍ ٢٠٠٠ ثم ١٦٠٠ ثم ١٢٨٠، والجودة
     تنزل من ٠٫٨٠ إلى ٠٫٥٥، والنسبةُ بين العرض والارتفاع محفوظةٌ في كل خطوة.
     الهدفُ ٣٥٠ كيلوبايت، وما تعذّر إنزالُه دون ٥٠٠ لا يُرسَل أصلاً بل يُعلن
     سببُه. والقياسُ بالبايت لا بالمحارف — فالمقياسُ عينُ مقياس الخادم. */
  var IMG_TARGET = 350 * 1024, IMG_HARD = 500 * 1024;
  var IMG_SIDES = [2000, 1600, 1280], IMG_Q = [0.80, 0.73, 0.66, 0.59, 0.55];
  var IMG_PNG_SIDES = [2000, 1600, 1280, 1024, 800];      /* PNG بلا معاملِ جودة: تصغيرُ الأبعاد فقط (حين لا ترميزَ WebP) */
  function bytesOf(s9) { try { return new Blob([String(s9)]).size; } catch (e) { return String(s9).length; } }
  function isDataImg(v9) { return typeof v9 === 'string' && v9.indexOf('data:image/') === 0; }
  /* ══ الشفافيةُ تُحفَظ ══
     صيغٌ قادرةٌ على الألفا: تُفحص قناةُ الألفا فعلاً لا بالصيغة وحدها (PNG معتمٌ يبقى على طريق JPEG كما كان).
     الفحص: رسمٌ مصغَّر (≤512 ضلعاً) على لوحةٍ شفّافة ثم قراءةُ البكسلات — التصغيرُ لا يُنتج ألفا < 255 من صورةٍ معتمة. */
  var ALPHA_MIME = /^data:image\/(png|webp|gif|avif|svg\+xml|bmp|x-icon|vnd\.microsoft\.icon)/i;
  function dimsOf(im) { return { w: im.naturalWidth || im.width || 1, h: im.naturalHeight || im.height || 1 }; }
  function hasAlpha(im) {
    try {
      var d0 = dimsOf(im), r = Math.min(1, 512 / Math.max(d0.w, d0.h, 1));
      var w = Math.max(1, Math.round(d0.w * r)), h = Math.max(1, Math.round(d0.h * r));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data;
      for (var i = 3; i < d.length; i += 4) if (d[i] < 255) return true;
      return false;
    } catch (e) { return true; }                /* عند الشكّ تُعامَل شفّافةً — لا تعبئةَ بيضاءَ على الظنّ */
  }
  /* mode: 'jpeg' = كما كان حرفاً (تعبئةٌ بيضاء ثم JPEG) · 'webp' = بألفا بلا تعبئة (null إن لم يدعم المتصفحُ الترميز) · 'png' = بلا تعبئة */
  function drawTo(im, side, q, mode) {
    var d0 = dimsOf(im), r = Math.min(1, side / Math.max(d0.w, d0.h));
    var w = Math.max(1, Math.round(d0.w * r));
    var h = Math.max(1, Math.round(d0.h * r));
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    if (mode === 'webp') { x.drawImage(im, 0, 0, w, h); var o9 = c.toDataURL('image/webp', q); return o9.indexOf('data:image/webp') === 0 ? o9 : null; }
    if (mode === 'png') { x.drawImage(im, 0, 0, w, h); return c.toDataURL('image/png'); }
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    x.drawImage(im, 0, 0, w, h);
    return c.toDataURL('image/jpeg', q);
  }
  function imgFit(val) {
    var v = String(val == null ? '' : val);
    if (!isDataImg(v) || bytesOf(v) <= IMG_TARGET) return Promise.resolve({ v: v, done: false });
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () {
        try {
          var best = v, bestN = bytesOf(v), i, j, out, n;
          var alpha = ALPHA_MIME.test(v) && hasAlpha(im);
          if (!alpha) {
            /* معتمة: JPEG كما كان حرفاً */
            for (i = 0; i < IMG_SIDES.length; i++) {
              for (j = 0; j < IMG_Q.length; j++) {
                out = drawTo(im, IMG_SIDES[i], IMG_Q[j], 'jpeg'); n = bytesOf(out);
                if (n < bestN) { best = out; bestN = n; }
                if (n <= IMG_TARGET) return res({ v: out, done: true, n: n, alpha: false });
              }
            }
            if (bestN <= IMG_HARD) return res({ v: best, done: true, n: bestN, alpha: false });
            return rej(new Error('تعذّر تصغير الصورة إلى الحد الآمن (' + Math.round(bestN / 1024) + 'KB) — جرّب صورةً أوضح أو أقلَّ تعقيداً'));
          }
          /* شفّافة: WebP بألفا — الأضلاعُ والجوداتُ نفسُها، ولا تعبئةَ بيضاءَ أبداً */
          var webpOk = true;
          outer: for (i = 0; i < IMG_SIDES.length; i++) {
            for (j = 0; j < IMG_Q.length; j++) {
              out = drawTo(im, IMG_SIDES[i], IMG_Q[j], 'webp');
              if (out == null) { webpOk = false; break outer; }
              n = bytesOf(out);
              if (n < bestN) { best = out; bestN = n; }
              if (n <= IMG_TARGET) return res({ v: out, done: true, n: n, alpha: true });
            }
          }
          if (!webpOk) {
            /* لا ترميزَ WebP في هذا المتصفح: PNG بتصغير الأبعاد فقط */
            for (i = 0; i < IMG_PNG_SIDES.length; i++) {
              out = drawTo(im, IMG_PNG_SIDES[i], 1, 'png'); n = bytesOf(out);
              if (n < bestN) { best = out; bestN = n; }
              if (n <= IMG_TARGET) return res({ v: out, done: true, n: n, alpha: true });
            }
          }
          if (bestN <= IMG_HARD) return res({ v: best, done: true, n: bestN, alpha: true });
          rej(new Error('تعذّر تصغير الصورة الشفافة إلى الحد الآمن دون فقد شفافيتها (' + Math.round(bestN / 1024) + 'KB) — صغّر أبعادها أو بسّط محتواها قبل رفعها؛ لم تُسطَّح على الأبيض'));
        } catch (e) { rej(new Error('تعذّر تجهيز الصورة — جرّب صورةً أخرى')); }
      };
      im.onerror = function () { rej(new Error('تعذّرت قراءة الصورة — جرّب صورةً أخرى')); };
      im.src = v;
    });
  }
  var IMGFIT = { n: 0, alpha: 0 };            /* عدّادُ ما حُسِّن (وما حُفظت شفافيتُه منه) — تقرؤه الاستعادة فلا تكون صامتة */
  KIVO.BassamImgFit = { fit: imgFit, target: IMG_TARGET, hard: IMG_HARD, bytesOf: bytesOf, stats: IMGFIT, hasAlpha: hasAlpha, alphaMime: ALPHA_MIME };
  var baseRaw = srvIDB;
  /* ══ R169-CC: عقدُ الخريطة الأصلية ══════════════════════════════════════
     كان خطُّ الضغط يُطبَّق على كلِّ صورةٍ تُرفع: تصغيرٌ إلى ٢٠٠٠ ضلعاً وإعادةُ ترميزٍ وهدفٌ ٣٥٠ ك.ب،
     وما تعذّر إنزالُه دون ٥٠٠ ك.ب لا يُرسَل. سببُه أن الخادمَ كان يقبل طلباً واحداً بسقف ٥١٢ ك.ب.
     وقد صار الرفعُ مقطَّعاً، فالسببُ زال: ما يسعه المستودعُ (IMG_KEEP) يُرسَل كما هو — أبعادُه وشفافيتُه
     ونوعُه وجودتُه — ولا يبقى خطُّ الضغط إلا شبكةَ أمانٍ لما جاوز ذلك بكثير، فلا يُردُّ المستخدمُ خائباً. */
  var IMG_KEEP = 20 * 1024 * 1024;
  function imgKeepOrFit(val) {
    var v = String(val == null ? '' : val);
    if (isDataImg(v) && bytesOf(v) <= IMG_KEEP) return Promise.resolve({ v: v, done: false, kept: true });
    return imgFit(v);
  }
  KIVO.BassamImgFit.keep = imgKeepOrFit; KIVO.BassamImgFit.keepMax = IMG_KEEP;
  /* الحراسةُ في المخزن نفسِه: الأصلُ يمرّ كما هو، وما جاوز سقفَ المستودع يُضغط أو يُعلن سببُه */
  var base = Object.assign({}, baseRaw, {
    set: function (key, val) {
      var epoch = imcEpoch;
      return imgKeepOrFit(val).then(function (r) {
        imcRequire(epoch);
        if (r.done) { IMGFIT.n++; if (r.alpha) IMGFIT.alpha++; }
        if (!r.kept && bytesOf(r.v) > IMG_HARD) throw new Error('الصورة أكبر من الحد الآمن — لم تُرسل');
        /* ما خُزِّن فعلاً يُذكر — ضغطةٌ واحدةٌ لا ضغطتان */
        return Promise.resolve(baseRaw.set(key, r.v)).then(function (z) {
          imcRequire(epoch);
          try { imcPut(String(key), r.v); } catch (e) {}
          return z;
        });
      });
    }
  });
  /* يُسجَّل الرفع الجاري كي لا يكنس جامع الصور شيئاً قبل أن يُعرف مصيره، وما نجح رفعه يُعدّ «مرئياً» لهذا المتصفح */
  /* ══ ذاكرةُ صورٍ واحدةٌ للجلسة ══════════════════════════════════════════
     كانت كلُّ صفحةٍ تحتفظ بصورها في حالتها هي، فتموت الذاكرةُ بمغادرة الصفحة
     وتُعاد الصورُ من الخادم في كلِّ زيارة: أربعُ صورٍ فريدةٍ كلّفت عشرين تنزيلاً
     في جلسةٍ مقيسة. فصارت الذاكرةُ هنا — في مُحوِّل الصور وحدَه — فتنتفع بها
     كلُّ الصفحات بلا أن تتغيّر صفحةٌ واحدة.
     المفتاحُ ثابتُ المحتوى (كلُّ استبدالٍ يولّد مفتاحاً جديداً)، ومع ذلك
     يُحدَّث عند الكتابة ويُمحى عند الحذف فلا تبقى قيمةٌ بائدة.
     وهي ذاكرةُ جلسةٍ في الصفحة لا غير: لا تُكتب على قرصٍ، ولا تعبر خروجاً،
     لأن الصورَ محميّةٌ بالصلاحيات. والخادمُ يبقى no-store كما هو. */
  var IMC_MAX_N = 64, IMC_MAX_B = 24 * 1024 * 1024;
  var imcMap = new Map(), imcBytes = 0, imcPend = new Map(), imcEpoch = 0;
  var IMC = { hit: 0, miss: 0, join: 0, evict: 0 };
  function imcDrop(k) {
    if (!imcMap.has(k)) return;
    imcBytes -= imcMap.get(k).n; imcMap.delete(k);
  }
  function imcPut(k, v) {
    if (typeof v !== 'string' || !v) return;
    var n = v.length;
    if (n > IMC_MAX_B) return;                 /* صورةٌ أكبر من الحدِّ كلِّه لا تُذكر */
    imcDrop(k);
    imcMap.set(k, { v: v, n: n }); imcBytes += n;
    /* الأقدمُ استعمالاً يخرج أولاً — وMap تحفظ ترتيبَ الإدخال، والقراءةُ تُعيد الإدخال */
    while (imcMap.size > IMC_MAX_N || imcBytes > IMC_MAX_B) {
      var old = imcMap.keys().next();
      if (old.done) break;
      imcDrop(old.value); IMC.evict++;
    }
  }
  function imcGet(k) {
    if (!imcMap.has(k)) return undefined;
    var e = imcMap.get(k);
    imcMap.delete(k); imcMap.set(k, e);        /* لمسةُ استعمال: يصير الأحدث */
    return e.v;
  }
  function imcRequire(epoch) { if (epoch !== imcEpoch) throw new Error('تغيّرت الجلسة — لم يُعتمد رد الصورة السابق؛ أعد تحميل الصفحة'); }
  function imcClear() { imcEpoch++; imcMap.clear(); imcPend.clear(); imcBytes = 0; }
  KIVO.BassamImgCache = {
    clear: imcClear,
    stats: function () { return { n: imcMap.size, bytes: imcBytes, hit: IMC.hit, miss: IMC.miss, join: IMC.join, evict: IMC.evict, maxN: IMC_MAX_N, maxB: IMC_MAX_B }; },
    has: function (k) { return imcMap.has(String(k)); }
  };
  /* ══ رفعُ مجموعةِ صورٍ بتزامنٍ محدود ═════════════════════════════════════
     الاستعادةُ كانت تُطلق وعداً لكلِّ صورةٍ دفعةً واحدة، ثم تُعلن النجاح ولو
     أخفق رفعُ صورةٍ أو كلِّها — فيظنّ المستخدم أن نسخته عادت وهي ناقصة.
     الآن: ثلاثةُ عمّالٍ لا أكثر، وإعادةُ محاولةٍ مرّتين للعابر، وتوقّفٌ فوريٌّ
     عند انتهاء الجلسة، وتقريرٌ يذكر ما أخفق باسمه. */
  function putMany(map, opts) {
    opts = opts || {};
    var keys = Object.keys(map || {}), i = 0, live = 0, done = 0, failed = [], stop = null;
    var N = Math.max(1, Math.min(3, opts.conc || 3)), RETRY = 2;
    var onP = typeof opts.onProgress === 'function' ? opts.onProgress : null;
    return new Promise(function (res) {
      if (!keys.length) return res({ ok: true, done: 0, total: 0, failed: [], aborted: null });
      var step = function () {
        if (stop) { if (live === 0) res({ ok: false, done: done, total: keys.length, failed: failed, aborted: stop }); return; }
        if (i >= keys.length && live === 0) return res({ ok: !failed.length, done: done, total: keys.length, failed: failed, aborted: null });
        while (!stop && live < N && i < keys.length) (function (k) {
          live++;
          var tries = 0;
          var attempt = function () {
            tries++;
            base.set(k, map[k]).then(function () {
              live--; done++; if (onP) { try { onP(done, keys.length); } catch (e) {} } step();
            }, function (e) {
              var m = String((e && e.message) || e || '');
              if (/401/.test(m)) { stop = 'session'; live--; step(); return; }      /* الجلسةُ انتهت: توقّف */
              var transient = /HTTP 5\d\d|Failed to fetch|NetworkError|network/i.test(m) && !/413|429/.test(m);
              if (transient && tries <= RETRY) { setTimeout(attempt, 400 * tries); return; }
              var wait = 0, mm = /بعد (\d+) ثانية/.exec(m);
              if (/429/.test(m) && mm) wait = Math.min(60, +mm[1] || 1);
              if (wait && tries <= RETRY) { setTimeout(attempt, wait * 1000); return; }
              live--; failed.push({ k: k, err: m }); if (onP) { try { onP(done, keys.length); } catch (e2) {} } step();
            });
          };
          attempt();
        })(keys[i++]);
      };
      step();
    });
  }
  KIVO.BassamImgPut = putMany;
  /* ══ R169-CC: التحقّقُ بعد التخزين — قراءةٌ فعليّةٌ بمسار الإنتاج نفسِه ══
     «رُفعت» لا تكفي: تُقرأ كلُّ صورةٍ من GET /api/img/<id> ويُقارَن طولُها ببدايتها ونهايتها. ما لم يُقرأ
     كما خُزّن يُعدُّ إخفاقاً باسمه — فلا يُقال «تمّت الاستعادة» وخريطةٌ غائبة. */
  function verifyMany(map, opts) {
    opts = opts || {};
    var keys = Object.keys(map || {}), bad = [], i = 0, live = 0, N = Math.max(1, Math.min(3, opts.conc || 3));
    var onP = typeof opts.onProgress === 'function' ? opts.onProgress : null, done = 0;
    return new Promise(function (res) {
      if (!keys.length) return res({ ok: true, total: 0, bad: [] });
      var step = function () {
        if (i >= keys.length && live === 0) return res({ ok: !bad.length, total: keys.length, bad: bad });
        while (live < N && i < keys.length) (function (k) {
          live++;
          srvIDB.get(k).then(function (v) {
            var want = String(map[k] == null ? '' : map[k]);
            if (v == null) bad.push({ k: k, err: 'لا تُقرأ بعد التخزين' });
            else if (String(v).length !== want.length) bad.push({ k: k, err: 'الطول ' + String(v).length + ' ≠ ' + want.length });
            else if (String(v).slice(0, 64) !== want.slice(0, 64) || String(v).slice(-64) !== want.slice(-64)) bad.push({ k: k, err: 'المحتوى مختلف' });
            live--; done++; if (onP) { try { onP(done, keys.length); } catch (e) {} } step();
          }, function (e) { bad.push({ k: k, err: String((e && e.message) || e || 'تعذّرت القراءة') }); live--; done++; step(); });
        })(keys[i++]);
      };
      step();
    });
  }
  KIVO.BassamImgVerify = verifyMany;

  KIVO.BassamIDB = Object.assign({}, base, { get: function(key){
    /* لا مؤشّرَ انشغالٍ عامٌّ لقراءةٍ عادية: صورةٌ واحدةٌ كانت تُشعل شريطَ
       التطبيق كلِّه فيبدو مشغولاً وهو ليس كذلك. القراءةُ تملأ إطارَها وحدَه. */
    var k = String(key), epoch = imcEpoch;
    var c = imcGet(k);
    if (c !== undefined) { IMC.hit++; return Promise.resolve(c); }
    if (imcPend.has(k)) { IMC.join++; return imcPend.get(k); }
    IMC.miss++;
    var p = base.get(k).then(function (v) {
      if (imcPend.get(k) === p) imcPend.delete(k);
      if (epoch !== imcEpoch) return null;
      if (typeof v === 'string' && v) imcPut(k, v);
      return v;
    }, function (e) { if (imcPend.get(k) === p) imcPend.delete(k); throw e; });   /* الإخفاقُ لا يُذكر فتُعاد المحاولة */
    imcPend.set(k, p);
    return p;
  }, set: function(key, val){
    var p = base.set(key, val), B = KIVO.BassamBusy, epoch = imcEpoch;
    if (B) B.wrap(p, 'جارٍ رفع الصورة إلى الخادم…', { sub: B.fmtBytes(String(val == null ? '' : val).length) + ' · لا تغلق الصفحة' }).catch(function(){});
    /* الذاكرةُ تُمحى فور بدء الكتابة، وتُملأ من داخلها بالقيمة المخزَّنة فعلاً */
    imcDrop(String(key));
    try { KIVO.__BS_IMG_INFLIGHT = KIVO.__BS_IMG_INFLIGHT || []; KIVO.__BS_IMG_INFLIGHT.push(p); p.then(function(){ try { if (epoch === imcEpoch) KIVO.BassamPurge && KIVO.BassamPurge.seen(key); } catch(e){} }, function(){}).then(function(){ var a = KIVO.__BS_IMG_INFLIGHT, i = a.indexOf(p); i >= 0 && a.splice(i, 1); }); } catch(e){}
    return p;
  },
  del: function (key) { imcDrop(String(key)); return base.del(key); },
  /* Image reads return an explicit status; only confirmed page memory precedes the cloud read. */
  getInfo: function (key) {
    var k = String(key), c = imcGet(k), epoch = imcEpoch;
    if (c !== undefined) return Promise.resolve({ ok: true, status: 200, v: c });
    return baseRaw.getInfo(k).then(function (r) { if (epoch !== imcEpoch) return { ok: false, status: 409, v: null, why: 'session-changed' }; if (r && r.ok && typeof r.v === 'string' && r.v) imcPut(k, r.v); return r; });
  },

  /* Backup images use individually authorized cloud reads with bounded concurrency. */
  allForBackup: function(){
    var epoch = imcEpoch;
    return srvIDB.getAll().then(function(m){
      imcRequire(epoch);
      return poolGet(Object.keys(m), 3, function(k){ imcRequire(epoch); return srvIDB.getStrict(k); });
    }).then(function(m){ imcRequire(epoch); return m; });
  } });
})();
