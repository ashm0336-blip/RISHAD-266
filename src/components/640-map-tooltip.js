
/* ── بطاقة تلميح الخريطة ───────────────────────────────────────────────────────
   ثلاث علل عملية صحّحت هنا:
   ١) كانت تُرسم داخل الـSVG فيتضخّم مقاسها مع تكبير الخريطة — صارت HTML بمقاس ثابت.
   ٢) كانت تُثبَّت على «مركز الشكل»، فتحويمك على طرف منطقة كبيرة يفتحها بعيداً عنك —
      صارت تتبع المؤشر بإزاحة قصيرة كأي بطاقة خرائط محترفة، وتنقلب عند الحواف.
   ٣) كانت تُقصّ بالارتفاع عند ضيق المكان فتختفي بيانات بلا إشعار — لا قصّ بعد اليوم:
      البطاقة مضغوطة تكفي المساحة، وتُزاح داخل إطار اللوحة كاملةً. */
(function(){
  function px(n){ return Math.round(n) + "px"; }
  function alpha(hex, a){
    var h = String(hex || "#b99751").replace("#","");
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var n = parseInt(h, 16);
    return "rgba(" + ((n>>16)&255) + "," + ((n>>8)&255) + "," + (n&255) + "," + a + ")";
  }
  var TONE_L = { ok:"#0B7A4B", bad:"#8B1A3A", warn:"#A24E17", off:"#626A71", info:"#2A6F9F" };
  var TONE_D = { ok:"#5FCB98", bad:"#EC8FA7", warn:"#FFCA79", off:"#AEB3B8", info:"#8FC5EA" };
  var TONE = TONE_D;
  function toneNow(){ return document.documentElement.getAttribute("data-theme") === "dark" ? TONE_D : TONE_L; }
  var last = { x: -1, y: -1 };
  function mapRect(){
    var sv = document.querySelector("svg[data-map-zoom], svg[data-ds-zoom]");
    if (!sv || !sv.getBoundingClientRect) return null;
    var r = sv.getBoundingClientRect();
    return (r.width && r.height) ? r : null;
  }
  /* المواءمة: إن طالت البطاقة عن المساحة المرئية من اللوحة، تُطوى صفوف الأشخاص
     صفّاً صفّاً ويُذكر عددهم في «+ N آخرين» — فلا تُقصّ بيانات ولا تهرب البطاقة خارج
     الإطار (وهذا ما كان يحدث على الشاشات القصيرة) */
  function fit(el){
    var b = mapRect(), vh = window.innerHeight || 800;
    var top = b ? Math.max(6, b.top + 6) : 6, bot = b ? Math.min(vh - 6, b.bottom - 6) : vh - 6;
    var avail = Math.max(150, bot - top);
    var list = el.querySelector("[data-tip-people]");
    var moreEl = el.querySelector("[data-tip-more]");
    var base = +(el.getAttribute("data-more") || 0), hid = 0;
    if (list) {
      var rows = [].slice.call(list.children);
      while (el.offsetHeight > avail && hid < rows.length) {
        rows[rows.length - 1 - hid].style.display = "none"; hid++;
      }
      if (hid === rows.length) list.style.display = "none";
    }
    if (moreEl) {
      var extra = base + hid;
      /* نصٌّ مخصص من البنّاء (كسطر «من ورديات أخرى» تحت حصر الوردية) لا تدوسه المواءمة —
         وإن طُويت صفوف لضيق المساحة يُلحق عددها به بدل استبداله */
      var customTx = el.getAttribute("data-moretxt") || "";
      if (extra > 0) {
        moreEl.textContent = customTx
          ? (hid > 0 ? (customTx + " · و" + hid + " من القائمة طُووا لضيق المساحة") : customTx)
          : ("+ " + extra + " آخرين");
        moreEl.style.display = "";
      }
      else moreEl.style.display = "none";
    }
  }
  /* الموضع: بجوار المؤشر مباشرة، وكامل البطاقة داخل إطار اللوحة — لا قصّ ولا خروج */
  function place(el){
    fit(el);
    if (!el) return;
    var W = el.offsetWidth || 274, H = el.offsetHeight || 200;
    var vw = window.innerWidth || 1280, vh = window.innerHeight || 800;
    var b = mapRect();
    var L = b ? Math.max(6, b.left + 6) : 6, R = b ? Math.min(vw - 6, b.right - 6) : vw - 6;
    var T = b ? Math.max(6, b.top + 6) : 6, B = b ? Math.min(vh - 6, b.bottom - 6) : vh - 6;
    if (R - L < W) { L = 6; R = vw - 6; }                 // اللوحة أضيق من البطاقة → إطار الشاشة
    if (B - T < H) { T = 6; B = vh - 6; }
    var g = 16, x = last.x - g - W;                        // في RTL نفضّل يسار المؤشر
    if (x < L) x = last.x + g;
    x = Math.max(L, Math.min(R - W, x));
    var y = last.y + g;
    if (y + H > B) y = last.y - g - H;
    y = Math.max(T, Math.min(B - H, y));
    el.style.left = px(x); el.style.top = px(y);
  }
  try {
    document.addEventListener("mousemove", function(e){
      last.x = e.clientX; last.y = e.clientY;
      var el = document.getElementById("bsTipCard");
      if (el) place(el);
    }, true);
  } catch(e){}
  /* p = { accent, code, title, status:{text,tone}, hero:{value,unit,text,label,bar,barColor},
          stats:[{label,value,color,wide}], people:[{name,color,phone,rest}], more, foot } */
  function card(p){
    if (!p) return null;
    var R = React.createElement, W = 274;
    var accent = p.accent || "#b99751";
    var box = { position:"fixed", left:px(last.x), top:px(last.y), width:px(W), zIndex:9300, pointerEvents:"none",
      fontFamily:"'Cairo',sans-serif", direction:"rtl", textAlign:"right",
      background:"var(--bg-tooltip)",
      border:"1px solid var(--border-tooltip)", borderRadius:"14px", overflow:"hidden",
      boxShadow:"var(--shadow-tooltip), 0 0 0 1px " + alpha(accent, 0.16) };
    var ch = [];
    ch.push(R("div", { key:"ac", style:{ height:"2.5px", background:"linear-gradient(270deg," + accent + "," + alpha(accent,0.15) + ")" } }));
    var head = [];
    if (p.code) head.push(R("span", { key:"c", dir:"ltr", style:{ fontFamily:"'Cairo',sans-serif", fontFeatureSettings:"'tnum'", fontSize:"10px", fontWeight:600,
      color:"var(--fg-xe6d29d)", background:"var(--bg-a185151810p15)", border:"1px solid var(--bd-a185151810p32)", borderRadius:"6px", padding:"1.5px 6px", flexShrink:0 } }, p.code));
    if (p.title) head.push(R("span", { key:"t", style:{ fontSize:"10.5px", fontWeight:600, color:"var(--text-tooltip)", flex:"1 1 auto", minWidth:0,
      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" } }, p.title));
    if (p.status) { var TN = toneNow(); var tc = TN[p.status.tone] || TN.off;
      head.push(R("span", { key:"s", style:{ fontSize:"8.5px", fontWeight:600, color:tc, background:alpha(tc,0.13), border:"1px solid "+alpha(tc,0.34),
        borderRadius:"999px", padding:"2px 7px", flexShrink:0, lineHeight:1.25 } }, p.status.text)); }
    if (head.length) ch.push(R("div", { key:"hd", style:{ display:"flex", alignItems:"center", gap:"5px", padding:"7px 9px 0" } }, head));
    if (p.hero) {
      var hv = [];
      if (p.hero.value != null) {
        hv.push(R("span", { key:"v", dir:"ltr", style:{ fontSize:"18px", fontWeight:700, lineHeight:1, color:accent, letterSpacing:"-0.02em", fontFeatureSettings:"'tnum'" } }, String(p.hero.value)));
        if (p.hero.unit) hv.push(R("span", { key:"u", style:{ fontSize:"10px", fontWeight:400, color:"var(--text-tooltip-muted)", marginRight:"4px" } }, p.hero.unit));
      } else if (p.hero.text) hv.push(R("span", { key:"x", style:{ fontSize:"13px", fontWeight:700, lineHeight:1.2, color:accent } }, p.hero.text));
      var hb = [ R("div", { key:"r", style:{ display:"flex", alignItems:"baseline", gap:"1px" } }, hv) ];
      if (p.hero.label) hb.push(R("div", { key:"l", style:{ fontSize:"9px", fontWeight:400, color:"var(--text-tooltip-muted)", marginTop:"2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" } }, p.hero.label));
      if (p.hero.bar != null) hb.push(R("div", { key:"b", style:{ height:"4px", borderRadius:"999px", background:"var(--tooltip-well)", marginTop:"6px", overflow:"hidden" } },
        R("div", { style:{ height:"100%", borderRadius:"999px", width:Math.max(2, Math.min(100, p.hero.bar * 100)) + "%",
          background:"linear-gradient(90deg," + alpha(p.hero.barColor || accent, 0.65) + "," + (p.hero.barColor || accent) + ")" } })));
      ch.push(R("div", { key:"hero", style:{ padding:"5px 9px 0" } }, hb));
    }
    if (p.stats && p.stats.length) {
      /* كان السقف ستّ خانات، والباب أكثر العناصر حقولاً (الموقع والنوع والمسار
         والتصنيف والفئات = خمس) فيدفع «الاحتياج» و«التغطية» خارج القصّ — فيبدوان
         غائبين عن الأبواب وحدها بينما يظهران في المناطق والمعالم. صار السقف
         ثمانياً، ورقما التشغيل يتصدّران القائمة فلا يُقصّان أصلاً. */
      var st6 = p.stats.slice(0, 8);
      ch.push(R("div", { key:"st", style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px", padding:"7px 9px 0" } },
        st6.map(function(x, i){
          return R("div", { key:i, style:{ background:"var(--tooltip-well)", border:"1px solid var(--tooltip-sep)", borderRadius:"7px", padding:"4px 6px", minWidth:0,
            gridColumn: x.wide ? "1 / -1" : "auto" } },
            R("div", { style:{ fontSize:"8px", fontWeight:400, color:"var(--text-tooltip-muted)", marginBottom:"1px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" } }, x.label),
            R("div", { style:{ fontSize:"9.5px", fontWeight:600, color:x.color || "var(--text-tooltip)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" } }, x.value));
        })));
    }
    if (p.people && p.people.length) {
      ch.push(R("div", { key:"pp", "data-tip-people":"1", style:{ marginTop:"6px", borderTop:"1px solid var(--tooltip-sep)", padding:"6px 9px 0", display:"flex", flexDirection:"column", gap:"2.5px" } },
        p.people.map(function(m, i){
          var dc = m.color || "#b99751";
          return R("div", { key:i, style:{ display:"flex", alignItems:"center", gap:"5px", minWidth:0 } },
            R("span", { style:{ width:"4px", height:"4px", borderRadius:"999px", background:dc, boxShadow:"0 0 0 1.5px "+alpha(dc,0.18), flexShrink:0 } }),
            R("span", { title:m.name, style:{ fontSize:"9.5px", fontWeight:400, color:"var(--text-tooltip)", flex:"1 1 auto", minWidth:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", lineHeight:1.45 } }, m.name),
            m.shName ? R("span", { style:{ fontSize:"7px", fontWeight:600, color:dc, background:alpha(dc,0.14), border:"1px solid "+alpha(dc,0.4), borderRadius:"999px", padding:"0.5px 4.5px", flexShrink:0, whiteSpace:"nowrap", lineHeight:1.5 } }, m.shName) : null, m.rest ? R("span", { style:{ fontSize:"7px", fontWeight:600, color:"var(--fg-xfcd34d)", background:"var(--bg-a245158110p14)", border:"1px solid var(--bd-a245158110p4)", borderRadius:"999px", padding:"0.5px 4.5px", flexShrink:0, lineHeight:1.5 } }, "في راحة") : null,
            (m.st && m.st.txt) ? R("span", { style:{ fontSize:"7px", fontWeight:700, color:m.st.color || "var(--fg-xfcd34d)", background:alpha(m.st.color || "var(--bg-xfcd34d)",0.14), border:"1px solid "+alpha(m.st.color || "var(--bd-xfcd34d)",0.45), borderRadius:"999px", padding:"0.5px 4.5px", flexShrink:0, whiteSpace:"nowrap", lineHeight:1.5 } }, m.st.txt) : null,
            m.phone ? R("span", { dir:"ltr", style:{ fontFamily:"'Cairo',sans-serif", fontFeatureSettings:"'tnum'", fontSize:"8px", fontWeight:400, color:"var(--fg-x8a96a6)", flexShrink:0, letterSpacing:"0.01em" } }, m.phone) : null);
        })));
    }
    /* سطر «الآخرين» مستقل عن القائمة — تحت حصر الوردية قد يكون كل المسكّنين من ورديات أخرى */
    if (p.more) ch.push(R("div", { key:"mo", "data-tip-more":"1", style:{ fontSize:"9px", fontWeight:400, color:"var(--fg-x7f8b9c)", padding:"2px 9px 0" } }, p.moreTxt || ("+ " + p.more + " آخرين")));
    ch.push(R("div", { key:"sp", style:{ height:"6px" } }));
    if (p.foot) ch.push(R("div", { key:"fo", style:{ borderTop:"1px solid var(--bd-a2552552550p06)", padding:"5px 9px", fontSize:"8px", fontWeight:400, color:"var(--fg-x6f7c8d)", background:"var(--bg-a0000p18)" } }, p.foot));
    return R("div", { id:"bsTipCard", "data-more": String(p.more || 0), "data-moretxt": String(p.moreTxt || ""), style:box, ref:function(el){ if (el) place(el); } }, ch);
  }
  KIVO.BassamTip = { card: card };
})();
