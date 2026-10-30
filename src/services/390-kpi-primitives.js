
/* ── بدائيات عرض المؤشرات ──────────────────────────────────────────────────────
   كانت أنماط صفّ المؤشر تُبنى في سبعة مواضع بين صفحتَي الخريطة، وهذا بالضبط
   حيث ظهر كل انحراف بصري: عرض العمود بمقياسين، و min-width في موضع دون آخر.
   موضع واحد الآن — فما يُصحَّح هنا يسري على الخمسة تبويبات في الصفحتين معاً.
   المدخلات: pc النسبة، lead هل هو الصفّ الأعلى، color لون التعبئة والرقم،
   track لون المسار، num لون الرقم إن خالف color، numWidth عرض خانة الرقم. */
(function(){
  /* الترتيب هنا مطابق للأصل حرفاً — إعادة الهيكلة يجب أن تُثبت أنها لا تغيّر شيئاً */
  var MONO = "text-align:left;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';";
  function rowStyles(o){
    o = o || {};
    var pc    = +o.pc || 0;
    var color = o.color || "#b99751";
    var track = o.track || "rgba(185,151,81,0.12)";
    var num   = o.num || "#9A7E40";
    var nw    = o.numWidth || 24;
    var lead  = !!o.lead;
    return {
      /* الصفّ سطر واحد: العيّنة والاسم والشريط والأعداد جنباً إلى جنب.
         كان عموداً من سطرين فيأخذ ضعف الارتفاع، والنِسَب انتقلت إلى التلميح. */
      item: "display:flex;align-items:center;gap:6px;min-width:0;cursor:default;height:15px",
      head: "display:flex;align-items:center;gap:6px;min-width:0",
      /* عرض الاسم يتبع طوله: البُعد المركّب «نوع · فئة» يبلغ 25 حرفاً بينما
         74px تسع 14 — فيُقتطع كل صفّ. wide يمنحه ضعف العرض. */
      name: "flex:0 0 " + (o.wide ? 132 : 74) + "px;min-width:0;font-size:9.5px;line-height:1.35;font-weight:" + (lead ? "800" : "600")
        + ";color:" + (lead ? "var(--fg-x3f3f3f)" : "var(--fg-x6f7276)") + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
      line: "display:flex;align-items:center;gap:6px;min-width:0;height:13px",
      /* العمود صار أربعين خانة مستديرة بدل شريط متصل: العين تعدّ الخانات المضاءة
         فتقرأ النسبة بلا رقم — وكل خانة 2.5%. الخانات عناصر حقيقية لا تدرّجاً
         مقنّعاً، لأن الاستدارة لا تتحقّق بالتقنيع. */
      track: "position:relative;flex:1 1 auto;min-width:20px;display:flex;gap:1.5px",
      fill: "position:absolute;top:0;bottom:0;right:0;border-radius:9999px;min-width:3px;width:" + pc + "%;background:" + color,
      cells: (function(){
        /* التقريب وحده يجعل 99% تضيء الأربعين كالمئة تماماً — والفرق بينهما
           تشغيليّ: «كلّها» غير «كلّها إلا واحدة». فالامتلاء الكامل للمئة وحدها،
           وأيّ نسبة موجبة تضيء خانةً على الأقلّ. */
        /* اثنتا عشرة خانة لا أربعون: الصفّ الواحد يترك للشريط نحو 175px، وأربعون
           خانة فيه تعني 2.9px لكلٍّ — تبدو خطّاً متقطّعاً لا خانات. اثنتا عشرة
           تعطي 13px لكلٍّ، ودقّة 8.3% كافية لمؤشّر بصريّ بجانبه رقمه الدقيق. */
        var N = 12, out = [];
        var lit = pc >= 100 ? N
                : pc <= 0 ? 0
                : Math.min(N - 1, Math.max(1, Math.round(pc / 100 * N)));
        for (var q = 0; q < N; q++)
          out.push("flex:1 1 0;min-width:0;height:7px;border-radius:9999px;background:"
            + (q < lit ? color : track));
        return out;
      })(),
      /* ثلاثة أعمدة متطابقة العرض: المفعَّل والمعطَّل والإجمالي. النِسَب في صفّ
         العنوان والأعداد في صفّ الشريط — فكل نسبة تقع فوق عددها بالضبط لأن
         العمودين يستعملان نفس العروض ونفس الترتيب. */
      num:    "flex:0 0 " + nw + "px;text-align:left;" + MONO + "font-size:9.5px;font-weight:600;line-height:1.3;color:" + num,
      numOn:  "flex:0 0 " + nw + "px;text-align:left;" + MONO + "font-size:9.5px;font-weight:600;line-height:1.3;color:var(--fg-x16a34a)",
      numOff: "flex:0 0 " + nw + "px;text-align:left;" + MONO + "font-size:9.5px;font-weight:600;line-height:1.3;color:var(--fg-x94a3b8)",
    };
  }
  /* ── الحلقة ────────────────────────────────────────────────────────────────
     كانت تُبنى في ستة مواضع، وبنسختين مختلفتين: واحدة بقطر ١٠٤ وفواصل بيضاء
     بين القطاعات، وأخرى قديمة بقطر ١٠٠ بلا فواصل. فكان التبويب الواحد يبدو
     مختلفاً بين الخطة والمتابعة. موضع واحد الآن، والنسخة المعتمدة هي ذات
     الفواصل لأنها تُقرأ حدودها. */
  /* ═══ الحلقة: أقواس منفصلة بأطراف مدوّرة على مسار خافت ═══
     كانت conic-gradient بفجوات بيضاء — مسطّحة وأطرافها حادّة والفجوة تبدو
     شقّاً في القرص. الآن كل قيمة قوسٌ مستقل بطرفين مدوّرين فوق مسار رمادي
     يمثّل الكل. تُعاد صورةَ SVG مضمّنة في background فلا يتغيّر شيء عند
     المستدعين — النداء والقالب وطبقة التلميح كما هي. */
  /* الحلقة صارت تُرسم داخل SVG (donutHit)؛ هنا الحاوية وظلّها فقط. */
  function donutCss(items, total, size){
    var d = size || 104;
    var sh = "filter:drop-shadow(0 " + (d * 0.03).toFixed(1) + "px " + (d * 0.045).toFixed(1) + "px rgba(15,23,42,0.22));";
    return "position:relative;width:" + d + "px;height:" + d + "px;border-radius:9999px;display:grid;place-items:center;" + sh;
  }

  /* ── تلميح قطاعات الحلقة ─────────────────────────────────────────────────────
     الحلقة تُرسم بـconic-gradient على عنصر واحد فلا قطاعات تُحوَّم عليها. هنا
     طبقة SVG فوقها: قوسٌ شفّاف لكل قطاع بنفس زواياه يحمل <title> — والمتصفّح
     يعرضه بنفسه. لا معالجات ولا تغيير في المركز: محاولات سابقة أضافت تحديداً
     وتبديلاً لنصّ المركز فانكسرت.
     والحدّ الداخلي = نصف عرض قرص المركز بالضبط، وإلا غطّته الأقواس فيُصاب
     قطاع بحسب الزاوية لا بحسب موضع المؤشّر. */
  function donutHit(items, total, size, unit, coreW){
    var d = size || 104, list = items || [];
    if (!(total > 0) || !list.length) return null;
    var R = React, cx = d / 2, cy = d / 2;
    var ro = d / 2 - 1, ri = (coreW || 66) / 2;
    /* كان يُبطل الحلقة كلها في المقاسات الصغيرة لأن قرص المركز الافتراضي (66)
       أكبر من نصف القطر — الآن يُقصّ نصف القطر الداخلي بدل إسقاط الرسم. */
    if (!(ro > ri)) ri = Math.max(2, ro * 0.42);
    var pt = function(rad, a){ var t = (a - 90) * Math.PI / 180;
      return [(cx + rad * Math.cos(t)).toFixed(2), (cy + rad * Math.sin(t)).toFixed(2)]; };
    var ringPath = function(a0, a1){
      var big = (a1 - a0) > 180 ? 1 : 0;
      var o0 = pt(ro, a0), o1 = pt(ro, a1), i1 = pt(ri, a1), i0 = pt(ri, a0);
      return "M" + o0[0] + "," + o0[1] + "A" + ro + "," + ro + " 0 " + big + " 1 " + o1[0] + "," + o1[1]
           + "L" + i1[0] + "," + i1[1] + "A" + ri + "," + ri + " 0 " + big + " 0 " + i0[0] + "," + i0[1] + "Z";
    };
    /* التحويم يعتّم البقيّة ولا يحرّك القطاع: الحركة في مؤشّر إحصائي تشتّت،
       والتعتيم يجيب السؤال مباشرةً — أين هذا القطاع من الحلقة.
       طبقتان لكل قطاع: حجابٌ أبيض يبهت أخواته، وقوسٌ شفّاف يلتقط المؤشّر.
       الملتقِط لا يتحرّك أبداً — ولو تحرّك لخرج من تحت المؤشّر فتذبذبت الحالة. */
    /* التحويم يُبهت الأقواس الأخرى ويُبقي المقصود بلونه الكامل. كان حجاباً أبيض
       على أسافين لا تطابق شكل الأقواس المدوّرة، فيبدو التحديد مشوّهاً. */
    var veil = function(e, keep){
      var host = e.currentTarget.parentNode;
      if (!host) return;
      var as = host.querySelectorAll("[data-arc]");
      for (var k = 0; k < as.length; k++)
        as[k].setAttribute("opacity", (keep == null || as[k].getAttribute("data-arc") === keep) ? "1" : "0.22");
    };
    /* ═══ الحلقة نفسها تُرسم هنا: أقواس منفصلة بأطراف مدوّرة فوق مسار خافت.
       كانت صورةَ SVG في background فلم تظهر إطلاقاً (النمط يُحقن في سمة style
       والعنوان يكسرها). الرسم داخل هذا الـsvg أضمن — نفس العنصر الذي يحمل
       طبقة التلميح، فلا يزيد شيء ولا تنزاح الزوايا. ═══ */
    var W2 = Math.max(7, d * 0.115), Rr = d / 2 - W2 / 2 - Math.max(2, d * 0.02);
    /* الحلقة بهيئة حلقة كروت الجدول الشهري: مسار ذهبي خافت وقطاعات متصلة بأطراف
       مستقيمة تفصلها فواصل رفيعة — بدل الأقواس المنفصلة ذات الأطراف المدوّرة. */
    var gap2 = list.length > 1 ? 1.6 : 0;
    var arcNodes = [R.createElement("circle", { key: "trk", cx: cx, cy: cy, r: Rr.toFixed(2),
      fill: "none", stroke: "rgba(185,151,81,0.13)", strokeWidth: W2.toFixed(1) })];
    (function(){
      var ac2 = 0;
      for (var q = 0; q < list.length; q++){
        var xx = list[q], vv = (+xx.n || 0) / total * 360;
        var aa = ac2 - 90 + gap2, bb = ac2 + vv - 90 - gap2;
        ac2 += vv;
        if (!(bb > aa)) continue;
        var rr = Math.PI / 180;
        var px1 = (cx + Rr * Math.cos(aa * rr)).toFixed(2), py1 = (cy + Rr * Math.sin(aa * rr)).toFixed(2);
        var px2 = (cx + Rr * Math.cos(bb * rr)).toFixed(2), py2 = (cy + Rr * Math.sin(bb * rr)).toFixed(2);
        arcNodes.push(R.createElement("path", { key: "arc" + q,
          d: "M" + px1 + " " + py1 + " A" + Rr.toFixed(2) + " " + Rr.toFixed(2) + " 0 " +
             ((bb - aa) > 180 ? 1 : 0) + " 1 " + px2 + " " + py2,
          fill: "none", stroke: (xx.color || "#b99751"), strokeWidth: W2.toFixed(1), strokeLinecap: "butt",
          opacity: 1, "data-arc": (xx.label || ""),
          style: { pointerEvents: "none", transition: "opacity .13s" } }));
      }
    })();
    var acc = 0, veils = [], hits = [], sig = "";
    for (var i = 0; i < list.length; i++){
      var x = list[i], n = +x.n || 0;
      sig += (x.label || "") + ":" + n + ";";
      if (n <= 0) continue;
      var a0 = acc; acc += n / total * 360;
      var a1 = Math.min(acc, 359.99);
      var dd = ringPath(a0, a1);
      var nm = x.label || "";
      var pc = Math.round(n / total * 100);
      /* R183: العددُ بوحدته على قاعدة العدّ إن كانت الوحدةُ في القاموس («مصلى واحد» · «٣ مصليات») */
      var _BC = KIVO.BassamCount, _uk = unit && _BC ? _BC.key(unit) : "";
      var txt = nm + " — " + (_uk ? _BC(n, _uk) : (n + (unit ? (" " + unit) : ""))) + " · " + pc + "٪";
      veils.push(R.createElement("path", { key: "v" + nm + "|" + i, d: dd, fill: "#ffffff",
        opacity: 0, "data-veil": nm,
        style: { pointerEvents: "none", transition: "opacity .13s" } }));
      hits.push(R.createElement("path", {
        key: "h" + nm + "|" + i, d: dd, fill: "transparent",
        onMouseEnter: (function(nm){ return function(e){ veil(e, nm); }; })(nm),
        onMouseLeave: function(e){ veil(e, null); }
      }, R.createElement("title", { key: "t" + nm + "|" + i }, txt)));
    }
    if (!hits.length) return null;
    return R.createElement("svg", { key: "dh" + sig, width: d, height: d, viewBox: "0 0 " + d + " " + d,
      style: { position: "absolute", inset: 0, zIndex: 1 } }, arcNodes.concat(hits));   /* الحُجُب البيضاء استُبدلت بتعتيم الأقواس */
  }
  /* ── شارة البُعد ───────────────────────────────────────────────────────────
     كانت ١٠ نسخ بثلاثة أشكال: بعضها بلا اقتطاع فتفيض التسمية الطويلة أو تنضغط.
     الاقتطاع الآن دائم، وحجم الخط يُشتقّ من عدد الشارات — فإن أضيف بُعد جديد
     ضبط نفسه بلا تدخّل. */
  function tabStyle(active, count){
    /* كانت 22px بخط 9px بلا أيقونات — نحيفة. صارت 26px بخط أثقل وأيقونة
       لكل بُعد (dimIcon أدناه)، والمقاسات تنكمش تدريجياً حين تكثر الشارات */
    var fs = (count >= 6) ? "8.5" : (count >= 5) ? "9" : "9.5";
    return "flex:1;min-width:0;height:26px;border:0;border-radius:9999px;cursor:pointer;"
      + "display:flex;align-items:center;justify-content:center;gap:" + (count >= 5 ? "3" : "5") + "px;"
      + "font-family:'Cairo',sans-serif;font-size:" + fs + "px;font-weight:700;transition:all .16s;"
      + "padding:0 " + (count >= 5 ? "4" : "8") + "px;white-space:nowrap;overflow:hidden;"
      + (active ? "background:var(--bg-xb99751);color:var(--text-on-brand);box-shadow:0 2px 6px -1px rgba(185,151,81,0.55)"
                : "background:transparent;color:var(--fg-x8a8d91)");
  }
  /* أيقونة كل بُعد في التبويبات الفرعية — خريطة واحدة فتتطابق الشاشتان.
     مساران لكل مفتاح (الثاني قد يكون فارغاً)، والمجهول يعود فارغاً بلا كسر */
  var DIM_ICONS = {
    summary: ["M21.21 15.89A10 10 0 1 1 8 2.83", "M22 12A10 10 0 0 0 12 2v10z"],
    dsum:    ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"],
    cov:     ["M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z", "m9 12 2 2 4-4"],
    dens:    ["M19 5 5 19", "M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
    paths:   ["M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15", "M9 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0"],
    region:  ["M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0", "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0"],
    ztype:   ["M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z", "M7.5 7.5h.01"],
    type:    ["M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z", "M7.5 7.5h.01"],
    zcat:    ["m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z", "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"],
    cat:     ["m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z", "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"],
    ready:   ["M21.801 10A10 10 0 1 1 17 3.335", "m9 11 3 3L22 4"],
    shift:   ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20", "M12 6v6l4 2"],
    place:   ["M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z", "M15 5.764v14.472"],
    state:   ["M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2", ""],
    active:  ["M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2", ""],
    dir:     ["m16 3 4 4-4 4", "M20 7H4"],
    fill:    ["m12 14 4-4", "M3.34 19a10 10 0 1 1 17.32 0"],
    read:    ["M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z", ""]
  };
  function dimIcon(k){
    var p = DIM_ICONS[k];
    return p ? { a: p[0], b: p[1] || "" } : { a: "", b: "" };
  }
  /* ── علامتا الطرفين ───────────────────────────────────────────────────────
     سهم صاعد على الأكبر وهابط على الأصغر، بجانب الرقم. اللون محايد عمداً:
     المؤشرات تقيس «كبير وصغير» لا «جيد وسيئ» — و«مفعّلة» أو «مسكَّن» أو
     «لها سعة» كلها تأتي في الأعلى، فلونٌ تحذيري عليها يقلب المعنى.
     يُخفى في نفس حالات السطر: أقلّ من ثلاث قيم · تعادل في أي طرف · تساويهما. */
  function marks(items){
    var l = items || [], i, n, none = { top: -1, low: -1 };
    if (l.length < 3) return none;
    var max = -Infinity, min = Infinity;
    for (i = 0; i < l.length; i++){ n = +l[i].n || 0; if (n > max) max = n; if (n < min) min = n; }
    if (max === min) return none;
    var ti = -1, li = -1, tc = 0, lc = 0;
    for (i = 0; i < l.length; i++){
      n = +l[i].n || 0;
      if (n === max){ tc++; ti = i; }
      if (n === min){ lc++; li = i; }
    }
    return { top: tc === 1 ? ti : -1, low: lc === 1 ? li : -1 };
  }
  function markOf(mk, i){
    if (!mk) return null;
    if (i === mk.top) return { ch: "\u25B2", title: "الأعلى" };
    if (i === mk.low) return { ch: "\u25BC", title: "الأدنى" };
    return null;
  }
  var MARK_STYLE = "flex:0 0 auto;font-size:7px;line-height:1;color:var(--fg-xa2a6aa);opacity:.85";
  KIVO.BassamMix = { rowStyles: rowStyles, donutCss: donutCss, donutHit: donutHit, tabStyle: tabStyle, dimIcon: dimIcon,
                       marks: marks, markOf: markOf, markStyle: MARK_STYLE };
})();
