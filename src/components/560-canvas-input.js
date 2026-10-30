/* ═══ طبقةُ إدخال الكانفس — الإيماءةُ بلا إعادة رسمٍ للصفحة ═══
   القياسُ (معالجٌ بقوّة تابلت، خطةٌ بـ١٩١ عنصراً): كلُّ إطارٍ كان يُعيد رسمَ الصفحة
   كلِّها — أكثرَ من ألفي عنصر، نحو ١٠٠–١٥٠ms — فالتكبيرُ ٧ إطاراتٍ في الثانية.
   والعلاجُ ما تفعله التطبيقاتُ المحترفة: أثناء الإيماءة لا يُمسّ إلا ما يتحرّك،
   ثم رسمةٌ واحدةٌ للصفحة عند رفع الإصبع أو القلم.
     • إطارُ العرض: viewBox يُكتب مباشرةً على الرسم، ويُعتمد في الحالة عند الرفع.
     • السحب: منطقُ الصفحة يعمل كما هو ويكتب حالتَه فوراً (فلا يتغيّر أيُّ حساب)،
       لكنّ رسمَ React يُؤجَّل إلى الرفع، ويُحرَّك العنصرُ المسحوب وحدَه في الرسم:
       شكلُ المصلّى بمساره، والبابُ والمعلمُ ومجموعاتُ المسار والنطاق بإزاحةٍ تُصحّح
       نفسَها، ومقابضُ التحرير تُخفى أثناء السحب وتعود عند الرفع.
     • الرسم: خيطُ المضلّع يتبع القلمَ مباشرة، وتُطلب رسمةٌ فقط حين يتبدّل «قربُ الإغلاق».
   وأيُّ عنصرٍ لا يُعرَف موضعُه في الرسم يعود إلى المسار القديم فوراً — لا يُكسر شيء.
   التعريفُ بمفاتيح React التي تضعها الصفحةُ نفسُها (g0_3 · mk0_1 · pa0_2 · sec4…). */
(function () {
  "use strict";
  var MAPW = 1000, MAPH = 600, RATIO = 0.6;   /* لوحةُ الخريطة وثباتُ نسبتها — كما في الصفحتين */
  var G = null;                                /* الإيماءةُ الجارية — واحدةٌ لا أكثر */

  function rect(el) {
    if (!el || !el.getBoundingClientRect) return { left: 0, top: 0, width: 1, height: 1 };
    var t = (window.performance && performance.now) ? performance.now() : Date.now();
    if (rect._el === el && (t - rect._t) < 16) return rect._r;
    rect._el = el; rect._t = t; rect._r = el.getBoundingClientRect();
    return rect._r;
  }
  function toMap(cx, cy, r, v) {
    var n = Math.min(r.width / v.w, r.height / v.h);
    if (!(n > 0)) return { x: v.x, y: v.y };
    return { x: v.x + (cx - r.left - (r.width - v.w * n) / 2) / n,
             y: v.y + (cy - r.top - (r.height - v.h * n) / 2) / n };
  }
  /* لقطةُ الحدث: currentTarget تُصفَّر بعد التوزيع — نلتقط ما يحتاجه المعالجُ والحدثُ بين يديه */
  function NOOP() {}
  function snap(e) {
    return { clientX: e.clientX, clientY: e.clientY, pageX: e.pageX, pageY: e.pageY,
      shiftKey: !!e.shiftKey, ctrlKey: !!e.ctrlKey, metaKey: !!e.metaKey, altKey: !!e.altKey,
      buttons: e.buttons, button: e.button, detail: e.detail,
      pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary, pressure: e.pressure,
      target: e.target, currentTarget: e.currentTarget,
      nativeEvent: e.nativeEvent || e, preventDefault: NOOP, stopPropagation: NOOP };
  }
  function pts(g) { var a = [], k; for (k in g.pts) a.push(g.pts[k]); return a; }
  function touches(g) { var n = 0, k; for (k in g.pts) if (g.pts[k].t === 'touch') n++; return n; }
  function tpts(g) { var a = [], k; for (k in g.pts) if (g.pts[k].t === 'touch') a.push(g.pts[k]); return a; }
  function sched(g, cb) { g.cb = cb; if (g.raf) return;
    g.raf = requestAnimationFrame(function () { g.raf = 0; var c = g.cb; g.cb = null; if (c) try { c(); } catch (e) {} }); }
  function flush(g) { if (g.raf) { try { cancelAnimationFrame(g.raf); } catch (e) {} g.raf = 0; }
    var c = g.cb; g.cb = null; if (c) try { c(); } catch (e) {} }

  /* ══ إطارُ العرض الحيّ ══ */
  /* بصيغة الصفحتين نفسِها حرفاً (x+" "+y+" "+w+" "+h) — فلا فرقَ ولا قفزةَ عند الاعتماد */
  function vbStr(v) { return v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h; }
  function svgFor(A, host) {
    if (host && host.tagName && String(host.tagName).toLowerCase() === 'svg' && host.isConnected) return host;
    try { return A.cfg ? document.querySelector(A.cfg.sel) : null; } catch (e) { return null; }
  }
  function curView(A) { return A.lv ? A.lv.v : (A.getView ? A.getView() : null); }
  function liveView(A, host, v) {
    var svg = A.lv ? A.lv.svg : svgFor(A, host);
    if (!svg || !svg.isConnected) { A.lv = null; A.setView(v); return; }
    if (!A.lv) A.lv = { svg: svg, v: v }; else A.lv.v = v;
    svg.setAttribute('viewBox', vbStr(v));
  }
  function commitView(A) { var L = A && A.lv; if (!L) return; A.lv = null; try { A.setView(L.v); } catch (e) {} }
  function panTo(A, v) { if (!A) return false; var g = G; liveView(A, g && g.api === A ? g.host : null, v); return true; }

  function startPinch(g) {
    var L = tpts(g); if (L.length < 2) return;
    var r = g.host && g.host.getBoundingClientRect ? g.host.getBoundingClientRect() : null;
    var v = curView(g.api);
    if (!r || !v) return;
    var a = L[0], b = L[1], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    g.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), r: r,
                v: { x: v.x, y: v.y, w: v.w, h: v.h }, p: toMap(mx, my, r, v) };
  }
  /* النقطةُ بين الإصبعين تبقى ملتصقةً بموضعها من الخريطة — وهذا ما يجعل الإيماءةَ «طبيعية» */
  function applyPinch(g) {
    var P = g.pinch; if (!P) return;
    var L = tpts(g); if (L.length < 2) return;
    var a = L[0], b = L[1], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (!(d > 2) || !(P.d > 2)) return;
    var w = Math.max(25, Math.min(MAPW, P.v.w * (P.d / d))), h = w * RATIO;
    var r = P.r, n = Math.min(r.width / w, r.height / h);
    if (!(n > 0)) return;
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    var x = P.p.x - (mx - r.left - (r.width - w * n) / 2) / n;
    var y = P.p.y - (my - r.top - (r.height - h * n) / 2) / n;
    liveView(g.api, g.host, { x: Math.max(0, Math.min(MAPW - w, x)),
                              y: Math.max(0, Math.min(MAPH - h, y)), w: w, h: h });
  }

  /* ══ الجلسةُ الحيّة: السحبُ والرسمُ بلا رسمِ React ══ */
  function fkey(el) {
    var ks = Object.keys(el);
    for (var i = 0; i < ks.length; i++) if (ks[i].indexOf('__reactFiber$') === 0) { var f = el[ks[i]]; return f && f.key != null ? String(f.key) : null; }
    return null;
  }
  function keyMap(svg) {
    var m = {}, gs = svg.querySelectorAll('g');
    for (var i = 0; i < gs.length; i++) { var k = fkey(gs[i]); if (k != null && !(k in m)) m[k] = gs[i]; }
    return m;
  }
  function firstXY(d) { var m = /(-?\d*\.?\d+(?:e-?\d+)?)[\s,]+(-?\d*\.?\d+(?:e-?\d+)?)/.exec(String(d || '')); return m ? [+m[1], +m[2]] : null; }
  function ptsStr(P) { var a = []; for (var i = 0; i < P.length; i++) a.push(P[i].x + ',' + P[i].y); return a.join(' '); }
  function secD(P) { var a = []; for (var i = 0; i < P.length; i++) a.push(P[i].x + ' ' + P[i].y); return 'M' + a.join(' L') + ' Z'; }
  function hide(ls, el) { if (!el || el.__bpHid) return; el.__bpHid = 1; ls.vis.push([el, el.style.visibility]); el.style.visibility = 'hidden'; }
  /* إزاحةٌ تُصحّح نفسَها: الهدفُ ناقصُ ما رسمه React فعلاً — فإن رسم React في منتصف
     السحب لسببٍ آخر، لم تتضاعف الإزاحة */
  function placeGroup(ls, g, rx, ry, tx, ty) {
    if (!g) return;
    if (!ls.t0.has(g)) ls.t0.set(g, g.getAttribute('transform'));
    var base = ls.t0.get(g) || '', dx = tx - rx, dy = ty - ry;
    var tr = (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) ? base
           : ('translate(' + (+dx.toFixed(3)) + ' ' + (+dy.toFixed(3)) + ')' + (base ? ' ' + base : ''));
    if (tr) g.setAttribute('transform', tr); else g.removeAttribute('transform');
  }
  function zonePath(ls, d) {
    if (ls.zpath && ls.zpath.isConnected) return ls.zpath;
    var ps = ls.svg.querySelectorAll('path');
    for (var i = 0; i < ps.length; i++) {
      if (ps[i].getAttribute('d') === d && !(ps[i].closest && ps[i].closest('defs,clipPath,mask'))) { ls.zpath = ps[i]; return ps[i]; }
    }
    throw new Error('zone-path');
  }
  function hideHandles(ls) {
    var ch = ls.svg.children;
    for (var i = 0; i < ch.length; i++) { var t = String(ch[i].tagName).toLowerCase(); if (t === 'line' || t === 'circle' || t === 'rect') hide(ls, ch[i]); }
  }
  /* ══ R184: المقابضُ تتبع الشكلَ لحظةً بلحظة — مواضعُها من الحالة الحيّة بقاعدة الصفحة نفسِها ══
     المفاتيح: رؤوس h# · منتصفات m# · انحناء g#in/out و gl#in/out · تدوير rot و rot-arm · دائرة cr-* ·
     مسار pv# و pm# · نطاق sv# و sm#. الأضلاعُ الشفّافة (e#) لا تُرى فلا تُمسّ. */
  var HKZ = /^(?:h\d+|m\d+|g\d+(?:in|out)|gl\d+(?:in|out)|rot|rot-arm|cr-arm|cr-c|cr-h|pv\d+|pm\d+|sv\d+|sm\d+)$/;
  var HOVER = { hoverZone: 1, hoverGate: 1, hoverMark: 1, hoverPath: 1, hoverSector: 1, dsHovZ: 1, dsHovG: 1, dsHovM: 1 };
  /* رؤوسُ المصلّى من مساره — كدالة الصفحة (الخطة التشغيلية) حرفاً */
  function gPts(d) {
    var e = String(d || '').match(/[MLHVQCZ]|-?\d+(?:\.\d+)?/gi) || [], s = [], n = 0, a = 0, i = 0, r = '';
    for (; n < e.length;) {
      var t = e[n];
      if (/^[MLHVQCZ]$/i.test(t)) { r = t.toUpperCase(); n++; }
      else if (r === 'M' || r === 'L') { a = +e[n]; i = +e[n + 1]; n += 2; s.push({ x: a, y: i }); }
      else if (r === 'Q') { a = +e[n + 2]; i = +e[n + 3]; n += 4; s.push({ x: a, y: i }); }
      else if (r === 'C') { a = +e[n + 4]; i = +e[n + 5]; n += 6; s.push({ x: a, y: i }); }
      else if (r === 'H') { a = +e[n]; n++; s.push({ x: a, y: i }); }
      else if (r === 'V') { i = +e[n]; n++; s.push({ x: a, y: i }); }
      else n++;
    }
    if (s.length > 1) { var f = s[0], l = s[s.length - 1]; if (Math.abs(f.x - l.x) < .6 && Math.abs(f.y - l.y) < .6) s.pop(); }
    return s;
  }
  /* رؤوسُ المصلّى وانحناءاتُه من مساره — كدالة الصفحة (المتابعة اليومية) حرفاً */
  function dsPH(d) {
    var e = String(d || '').match(/[MLHVQCZ]|-?\d+(?:\.\d+)?/gi) || [], s = [], n = [], i = 0, o = 0, r = 0, a = '', Z = function () { return { x: 0, y: 0 }; };
    for (; i < e.length;) {
      var t = e[i];
      if (/^[MLHVQCZ]$/i.test(t)) { a = t.toUpperCase(); i++; }
      else if (a === 'M' || a === 'L') { o = +e[i]; r = +e[i + 1]; i += 2; s.push({ x: o, y: r }); n.push({ in: Z(), out: Z() }); }
      else if (a === 'C') {
        var c1x = +e[i], c1y = +e[i + 1], c2x = +e[i + 2], c2y = +e[i + 3], px = +e[i + 4], py = +e[i + 5]; i += 6;
        var g = s[s.length - 1]; if (g) n[n.length - 1].out = { x: c1x - g.x, y: c1y - g.y };
        s.push({ x: px, y: py }); n.push({ in: { x: c2x - px, y: c2y - py }, out: Z() }); o = px; r = py;
      }
      else if (a === 'H') { o = +e[i]; i++; s.push({ x: o, y: r }); n.push({ in: Z(), out: Z() }); }
      else if (a === 'V') { r = +e[i]; i++; s.push({ x: o, y: r }); n.push({ in: Z(), out: Z() }); }
      else i++;
    }
    if (s.length > 1) { var f = s[0], l = s[s.length - 1]; if (Math.abs(f.x - l.x) < .6 && Math.abs(f.y - l.y) < .6) { n[0].in = n[n.length - 1].in; s.pop(); n.pop(); } }
    return { pts: s, hs: n };
  }
  /* مقابضُ المصلّى — بقاعدة الصفحتين نفسِها (الترتيبُ والحسابُ حرفاً) */
  function zoneGeo(t, c, n, kind) {
    var out = [], L = t.length, o = t.map(function (q) { return q.x; }), d = t.map(function (q) { return q.y; });
    var h = (Math.min.apply(null, o) + Math.max.apply(null, o)) / 2, p = (Math.min.apply(null, d) + Math.max.apply(null, d)) / 2;
    if (kind === 'circle') {
      var rr = (Math.max.apply(null, o) - Math.min.apply(null, o)) / 2, ex = h + rr;
      out.push({ k: 'cr-arm', l: 1, x1: h, y1: p, x2: ex, y2: p }); out.push({ k: 'cr-c', c: 1, x: h, y: p }); out.push({ k: 'cr-h', c: 1, x: ex, y: p });
      return out;
    }
    var g = 13 * n;
    t.forEach(function (e, a) {
      var i = t[(a - 1 + L) % L], r = t[(a + 1) % L], l = c[a] || {};
      var ov = (function () { var q = r.x - e.x, s = r.y - e.y, m = Math.hypot(q, s) || 1; return { x: q / m * g, y: s / m * g }; })();
      var iv = (function () { var q = i.x - e.x, s = i.y - e.y, m = Math.hypot(q, s) || 1; return { x: q / m * g, y: s / m * g }; })();
      [['out', l.out && Math.abs(l.out.x) + Math.abs(l.out.y) > 1 ? l.out : ov], ['in', l.in && Math.abs(l.in.x) + Math.abs(l.in.y) > 1 ? l.in : iv]].forEach(function (pr) {
        var x2 = e.x + pr[1].x, y2 = e.y + pr[1].y;
        out.push({ k: 'gl' + a + pr[0], l: 1, x1: e.x, y1: e.y, x2: x2, y2: y2 }); out.push({ k: 'g' + a + pr[0], c: 1, x: x2, y: y2 });
      });
    });
    t.forEach(function (e, a) { var i = t[(a + 1) % L]; out.push({ k: 'm' + a, c: 1, x: (e.x + i.x) / 2, y: (e.y + i.y) / 2 }); });
    t.forEach(function (e, a) { out.push({ k: 'h' + a, c: 1, x: e.x, y: e.y }); });
    var m = h, y = Math.min.apply(null, d), A = y - 26 * n;
    out.push({ k: 'rot-arm', l: 1, x1: m, y1: y, x2: m, y2: A }); out.push({ k: 'rot', c: 1, x: m, y: A });
    return out;
  }
  /* مقابضُ المسار (مفتوح) والنطاق (مغلق): منتصفاتٌ ثمّ رؤوس */
  function lineGeo(P, closed, pv, pm) {
    var out = [], L = P.length, i;
    for (i = 0; i < (closed ? L : L - 1); i++) { var a = P[i], b = P[(i + 1) % L]; out.push({ k: pm + i, c: 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); }
    for (i = 0; i < L; i++) out.push({ k: pv + i, c: 1, x: P[i].x, y: P[i].y });
    return out;
  }
  function fObj(S, fl, i) { var o = S[fl]; return o && o.i === i ? o : null; }
  /* الشكلُ المحدَّد ومقابضُه في حالةٍ ما (حيّةٍ أو لحظةِ البدء) */
  function geoFor(A, S) {
    var i, P;
    if (A.cfg === CFG.plan) {
      var n = ((S.view && S.view.w) || 1000) / 1e3, sel = S.sel; if (!sel) return [];
      if (sel.t === 'zone') { var z = (S.zones || [])[sel.i]; if (!z) return []; P = gPts(z.d); return P.length < 3 ? [] : zoneGeo(P, z.hs || [], n, z.kind); }
      if (sel.t === 'path') { var pa = (S.paths || [])[sel.i]; return pa && Array.isArray(pa.pts) ? lineGeo(pa.pts, false, 'pv', 'pm') : []; }
      if (sel.t === 'sector') { var fo = (S.floors || [])[S.floor], ss = fo && Array.isArray(fo.sectors) ? fo.sectors : [], sc = ss[sel.i];
        return sc && Array.isArray(sc.pts) ? lineGeo(sc.pts, true, 'sv', 'sm') : []; }
      return [];
    }
    if (A.cfg === CFG.daily) {
      var n2 = ((S.dview && S.dview.w) || 1000) / 1e3, ds = S.dsSel; if (!ds) return [];
      i = ds.i;
      if (ds.t === 'zone') {
        var z2 = (S.dsZoneTmp && S.dsZoneTmp.i === i) ? S.dsZoneTmp.z : null;
        if (!z2) { var fz = fObj(S, 'vdrag', i) || fObj(S, 'zdrag', i) || fObj(S, 'edrag', i) || fObj(S, 'tdrag', i) || fObj(S, 'cresize', i) || fObj(S, 'rotdrag', i); z2 = fz && fz.z; }
        if (!z2) { try { z2 = (A.logic._curFloorZones() || [])[i]; } catch (x) { z2 = null; } }
        if (!z2) return [];
        var q = dsPH(z2.d); return q.pts.length < 3 ? [] : zoneGeo(q.pts, q.hs, n2, z2.kind);
      }
      if (ds.t === 'path') {
        var pp = (S.dsPathTmp && S.dsPathTmp.i === i) ? S.dsPathTmp.pts : null;
        if (!pp) { var fp = fObj(S, 'dspvdrag', i) || fObj(S, 'dspdrag', i); pp = fp && fp.pts; }
        if (!pp) { try { var cp = (A.logic._curFloorPaths() || [])[i]; pp = cp && cp.pts; } catch (x) { pp = null; } }
        return Array.isArray(pp) ? lineGeo(pp, false, 'pv', 'pm') : [];
      }
    }
    return [];
  }
  function hmap(svg) {
    var m = {}, els = svg.querySelectorAll('circle,line');
    for (var i = 0; i < els.length; i++) { var k = fkey(els[i]); if (k != null && HKZ.test(k) && !(k in m)) m[k] = els[i]; }
    return m;
  }
  function near(a, b) { return Math.abs(a - b) < 0.02; }
  function sameAt(el, o) {
    if (o.c) return near(+el.getAttribute('cx'), o.x) && near(+el.getAttribute('cy'), o.y);
    return near(+el.getAttribute('x1'), o.x1) && near(+el.getAttribute('y1'), o.y1) && near(+el.getAttribute('x2'), o.x2) && near(+el.getAttribute('y2'), o.y2);
  }
  var NAMES_C = ['cx', 'cy'], NAMES_L = ['x1', 'y1', 'x2', 'y2'];
  function setAt(ls, el, o) {
    var nm = o.c ? NAMES_C : NAMES_L, v = o.c ? [o.x, o.y] : [o.x1, o.y1, o.x2, o.y2];
    if (!el.__bpA) { el.__bpA = 1; ls.attrs.push([el, nm, nm.map(function (q) { return el.getAttribute(q); })]); }
    for (var i = 0; i < nm.length; i++) { var s = String(+v[i].toFixed(3)); if (el.getAttribute(nm[i]) !== s) el.setAttribute(nm[i], s); }
    if (el.__bpHid && el.style.visibility === 'hidden') { var v0 = ''; for (var q = 0; q < ls.vis.length; q++) if (ls.vis[q][0] === el) { v0 = ls.vis[q][1]; break; } el.style.visibility = v0; }
  }
  function unseen(ls, el) { if (!el.__bpHid) hide(ls, el); else el.style.visibility = 'hidden'; }
  /* رأسٌ جديدٌ لا عنصرَ له بعد (المُضاف من النقطة البيضاء): نسخةٌ مؤقّتةٌ من أخيه — تزول عند الرفع */
  function cloneFor(ls, k) {
    var kind = String(k).replace(/\d+/, '#'), best = null, bk = -1;
    for (var q in ls.hm) { if (String(q).replace(/\d+/, '#') !== kind) continue; var nn = parseInt(String(q).replace(/\D+/g, ''), 10) || 0; if (nn > bk) { bk = nn; best = ls.hm[q]; } }
    if (!best || !best.parentNode) return null;
    var c = best.cloneNode(false); c.style.pointerEvents = 'none'; c.removeAttribute('id');
    best.parentNode.insertBefore(c, best.nextSibling);
    ls.clones.push(c); ls.hm[k] = c;
    return c;
  }
  function paintHandles(A, ls, S) {
    if (ls.hoff) return;
    if (!ls.hm) {
      ls.hm = hmap(ls.svg); ls.attrs = ls.attrs || []; ls.clones = ls.clones || [];
      var ks = Object.keys(ls.hm); if (!ks.length) { ls.hoff = 1; return; }
      var g0 = ls.g0 || geoFor(A, ls.s0), by = {}, ok = g0.length > 0;
      for (var j = 0; j < g0.length; j++) by[g0[j].k] = g0[j];
      for (var q = 0; q < ks.length && ok; q++) { var o0 = by[ks[q]]; if (!o0 || !sameAt(ls.hm[ks[q]], o0)) ok = false; }
      if (!ok) { ls.hoff = 1; for (var w1 in ls.hm) hide(ls, ls.hm[w1]); hideHandles(ls); return; }   /* القاعدةُ لم تطابق الرسم: تُخفى كما كانت */
    }
    var geo = geoFor(A, S), seen = {};
    for (var i = 0; i < geo.length; i++) { var o = geo[i], el = ls.hm[o.k] || cloneFor(ls, o.k); if (!el) continue; seen[o.k] = 1; setAt(ls, el, o); }
    for (var k in ls.hm) if (!seen[k]) unseen(ls, ls.hm[k]);
  }
  /* التحويمُ لا يرسم أثناء السحب — والتلميحُ يُخفى أثناءه ويُمحى عند الرفع */
  function hoverOff(A, ls) {
    var L = A.logic; if (!L || ls.hf) return;
    var own = Object.prototype.hasOwnProperty.call(L, 'setState'), prev = L.setState;
    ls.hf = { own: own, prev: prev };
    L.setState = function (u, cb) {
      if (u && typeof u === 'object' && typeof cb !== 'function') { var ks = Object.keys(u); if (ks.length && ks.every(function (k) { return HOVER[k]; })) return; }
      var r = prev.apply(L, arguments);
      try { if (A.ls === ls && flagOf(A) !== ls.flag) endLive(A, false); } catch (x) {}   /* أُنهي السحبُ من خارجه (Esc): رسمةٌ واحدة */
      return r;
    };
    var tip = document.getElementById('bsTipCard'); if (tip) hide(ls, tip);
  }
  function hoverOn(A, ls) {
    var L = A.logic, H = ls.hf; if (!L || !H) return; ls.hf = null;
    if (H.own) L.setState = H.prev; else delete L.setState;
    var st = L.state || {}, clr = null;
    for (var k in HOVER) if (st[k] != null) { (clr || (clr = {}))[k] = null; }
    if (clr) L.state = Object.assign({}, st, clr);
  }

  function previewLine(ls) {
    if (ls.pline && ls.pline.isConnected) return ls.pline;
    var ch = ls.svg.children;
    for (var i = ch.length - 1; i >= 0; i--) {
      var el = ch[i];
      if (String(el.tagName).toLowerCase() === 'g' && fkey(el) == null && el.querySelector('polyline')) {
        var ln = el.querySelector('line'); if (!ln) return null;
        ls.pline = ln;
        var sub = el.querySelectorAll('*');
        for (var k = 0; k < sub.length; k++) if (fkey(sub[k]) === 'pvC') hide(ls, sub[k]);   /* سهمُ الخيط يعود مع الرسمة التالية */
        return ln;
      }
    }
    return null;
  }

  function paintDraw(A, ls, S, c) {
    var cur = S[c.cur], P = S[c.pts]; if (!cur || !P || !P.length) return;
    var ln = previewLine(ls);
    if (!ln) { if (!ls.asked) { ls.asked = 1; try { A.logic.setState({}); } catch (e) {} } return; }  /* الخيطُ لم يُرسم بعد: رسمةٌ واحدةٌ تُنشئه */
    if (ln.getAttribute('x2') !== String(cur.x)) ln.setAttribute('x2', cur.x);
    if (ln.getAttribute('y2') !== String(cur.y)) ln.setAttribute('y2', cur.y);
    var v = S[c.view], t = v ? v.w / 1000 : 1, last = P[P.length - 1], near;
    if (S.tool === 'path') near = P.length >= 2 && Math.hypot(cur.x - last.x, cur.y - last.y) <= 10 * t;
    else near = P.length >= 3 && Math.hypot(cur.x - P[0].x, cur.y - P[0].y) <= 14 * t;
    if (ls.near != null && near !== ls.near) { try { A.logic.setState({}); } catch (e) {} }   /* «انقر للإغلاق ✓» بقرار الصفحة */
    ls.near = near;
  }

  function secOf(S, i) { var f = (S.floors || [])[S.floor || 0]; var ss = f && f.sectors; return ss ? ss[i] : null; }

  function paintPlan(A, ls, S) {
    var s0 = ls.s0, f = S.floor || 0, fl = ls.flag;
    if (fl === 'draw') return paintDraw(A, ls, S, A.cfg.draw);
    if (/^(zdrag|vdrag|edrag|rdrag|cresize|rotdrag|tdrag)$/.test(fl)) {
      var sel = S.sel; if (!sel || sel.t !== 'zone') throw new Error('sel');
      var i = sel.i, z0 = (s0.zones || [])[i], z1 = (S.zones || [])[i]; if (!z0 || !z1) throw new Error('zone');
      var p = zonePath(ls, z0.d); if (p.getAttribute('d') !== z1.d) p.setAttribute('d', z1.d);
      if (fl === 'zdrag') {
        var lab = ls.map['zl' + f + '_' + i], tx = lab && lab.querySelector('text');
        if (tx) {
          if (!ls.lab0) ls.lab0 = [+tx.getAttribute('x'), +tx.getAttribute('y')];
          var a = firstXY(z0.d), b = firstXY(z1.d);
          if (a && b) placeGroup(ls, lab, +tx.getAttribute('x'), +tx.getAttribute('y'), ls.lab0[0] + (b[0] - a[0]), ls.lab0[1] + (b[1] - a[1]));
        }
      }
      return;
    }
    if (fl === 'gdrag' || fl === 'mdrag') {
      var arr = fl === 'gdrag' ? 'gates' : 'marks', pre = fl === 'gdrag' ? 'g' : 'mk';
      var L0 = s0[arr] || [], L1 = S[arr] || [], main = S[fl] && S[fl].i, seen = false;
      for (var k = 0; k < L1.length; k++) {
        if (L1[k] === L0[k]) continue;
        var g = ls.map[pre + f + '_' + k]; if (!g) { if (k === main) throw new Error(pre); continue; }
        var c = g.querySelector('circle'); if (!c) throw new Error('circle');
        placeGroup(ls, g, +c.getAttribute('cx'), +c.getAttribute('cy'), L1[k].x, L1[k].y);
        if (k === main) seen = true;
      }
      return;
    }
    if (fl === 'pdrag' || fl === 'pvdrag') {
      var di = S[fl] && S[fl].i, P1 = (S.paths || [])[di], g2 = ls.map['pa' + f + '_' + di];
      if (!P1 || !g2) throw new Error('path');
      var pl = g2.querySelectorAll('polyline'); if (!pl.length) throw new Error('polyline');
      if (fl === 'pdrag') { var fp = firstXY(pl[0].getAttribute('points')); placeGroup(ls, g2, fp[0], fp[1], P1.pts[0].x, P1.pts[0].y); return; }
      if (!ls.pchk) {
        var P0 = (s0.paths || [])[di]; if (!P0 || ptsStr(P0.pts) !== pl[0].getAttribute('points')) throw new Error('path-fmt');
        ls.pchk = 1; var dec = g2.children;
        for (var q = 0; q < dec.length; q++) if (String(dec[q].tagName).toLowerCase() !== 'polyline') hide(ls, dec[q]);
      }
      var ps = ptsStr(P1.pts);
      for (var q2 = 0; q2 < pl.length; q2++) if (pl[q2].getAttribute('points') !== ps) pl[q2].setAttribute('points', ps);
      return;
    }
    if (fl === 'sdrag' || fl === 'svdrag') {
      var si = S[fl] && S[fl].i, sc1 = secOf(S, si), sc0 = secOf(s0, si), gs = ls.map['sec' + si];
      if (!sc1 || !gs) throw new Error('sector');
      var sp = gs.querySelector('path'); if (!sp) throw new Error('sec-path');
      if (fl === 'sdrag') { var f1 = firstXY(sp.getAttribute('d')); placeGroup(ls, gs, f1[0], f1[1], sc1.pts[0].x, sc1.pts[0].y); return; }
      if (!ls.schk) { if (!sc0 || secD(sc0.pts) !== sp.getAttribute('d')) throw new Error('sec-fmt'); ls.schk = 1; var lg = gs.querySelector('g'); if (lg) hide(ls, lg); }
      var dd = secD(sc1.pts); if (sp.getAttribute('d') !== dd) sp.setAttribute('d', dd);
      return;
    }
    throw new Error('flag');
  }

  function paintDaily(A, ls, S) {
    var fl = ls.flag, f = S.floor || 0;
    if (fl === 'draw') return paintDraw(A, ls, S, A.cfg.draw);
    if (/^(zdrag|vdrag|edrag|tdrag|cresize|rotdrag)$/.test(fl)) {
      var d0 = ls.zd0 || (ls.s0[fl] && ls.s0[fl].z && ls.s0[fl].z.d), T = S.dsZoneTmp;
      if (!d0) throw new Error('dz'); if (!T || !T.z) return;
      var p = zonePath(ls, d0); if (p.getAttribute('d') !== T.z.d) p.setAttribute('d', T.z.d);
      return;
    }
    if (fl === 'dspdrag' || fl === 'dspvdrag') {
      var T2 = S.dsPathTmp; if (!T2 || !T2.pts || !T2.pts.length) return;
      var g = ls.map['pa' + f + '_' + T2.i]; if (!g) throw new Error('dpath');
      var pl = g.querySelectorAll('polyline'); if (!pl.length) throw new Error('dpl');
      if (fl === 'dspdrag') { var fp = firstXY(pl[0].getAttribute('points')); placeGroup(ls, g, fp[0], fp[1], T2.pts[0].x, T2.pts[0].y); return; }
      if (!ls.pchk) { var dec = g.children; for (var q = 0; q < dec.length; q++) if (String(dec[q].tagName).toLowerCase() !== 'polyline') hide(ls, dec[q]); ls.pchk = 1; }
      var s = ptsStr(T2.pts); for (var k = 0; k < pl.length; k++) if (pl[k].getAttribute('points') !== s) pl[k].setAttribute('points', s);
      return;
    }
    throw new Error('flag');
  }

  /* geo: ما يحرّكه السحبُ من حالة الصفحة — يعود منه إن تبيّن أنّ الإصبعَ الأوّل كان بدايةَ تكبير (CANVAS-1 · undoLead) */
  var CFG = {
    plan:  { sel: 'svg[data-map-zoom]', paint: paintPlan,
             flags: ['sdrag', 'svdrag', 'pdrag', 'pvdrag', 'rotdrag', 'zdrag', 'rdrag', 'vdrag', 'edrag', 'cresize', 'tdrag', 'gdrag', 'mdrag'],
             geo: ['zones', 'gates', 'marks', 'paths', 'floors'],
             draw: { tools: ['poly', 'path', 'sector'], pts: 'polyPts', cur: 'polyCursor', view: 'view' } },
    daily: { sel: 'svg[data-ds-zoom]', paint: paintDaily,
             flags: ['zdrag', 'vdrag', 'edrag', 'tdrag', 'cresize', 'rotdrag', 'dspdrag', 'dspvdrag'],
             geo: ['dsZoneTmp', 'dsPathTmp'],
             draw: { tools: ['poly', 'path'], pts: 'dsPolyPts', cur: 'dsPolyCursor', view: 'dview' } }
  };

  function flagOf(A) {
    var s = A.logic && A.logic.state, c = A.cfg; if (!s || !c) return null;
    if (s.draft || (s.calMode && s.calMode.a)) return null;                  /* مسوّدةُ شكلٍ ومعايرة: على المسار القديم */
    for (var i = 0; i < c.flags.length; i++) if (s[c.flags[i]]) return c.flags[i];
    var d = c.draw; if (d && d.tools.indexOf(s.tool) >= 0 && s[d.pts] && s[d.pts].length) return 'draw';
    return null;
  }
  function beginLive(A, flag, s0, g0, zd0) {
    var svg = svgFor(A, G && G.api === A ? G.host : null); if (!svg) return null;
    var ls = { flag: flag, s0: s0 || A.logic.state, svg: svg, map: keyMap(svg), t0: new Map(), vis: [], cbs: [], near: null, attrs: [], clones: [], g0: g0 || null, zd0: zd0 || null };
    A.ls = ls;
    if (flag !== 'draw') {                                                    /* R184: المقابضُ تتبع الشكل (أو تُخفى إن لم تُعرف) */
      hoverOff(A, ls);
      try { paintHandles(A, ls, ls.s0); } catch (e) { ls.hoff = 1; hideHandles(ls); }
    }
    return ls;
  }
  function endLive(A, sync) {
    var ls = A.ls; if (!ls) return; A.ls = null;
    ls.t0.forEach(function (base, g) { try { if (base == null) g.removeAttribute('transform'); else g.setAttribute('transform', base); } catch (e) {} });
    for (var i = 0; i < ls.vis.length; i++) { try { ls.vis[i][0].style.visibility = ls.vis[i][1]; ls.vis[i][0].__bpHid = 0; } catch (e) {} }
    /* R184: مواضعُ المقابض كما رسمتها الصفحة، والنسخُ المؤقّتة تزول — ثمّ رسمةُ الاعتماد تضعها حيث استقرّت */
    for (var a9 = 0; a9 < (ls.attrs || []).length; a9++) { try { var r9 = ls.attrs[a9]; for (var b9 = 0; b9 < r9[1].length; b9++) { if (r9[2][b9] == null) r9[0].removeAttribute(r9[1][b9]); else r9[0].setAttribute(r9[1][b9], r9[2][b9]); } r9[0].__bpA = 0; } catch (e) {} }
    for (var c9 = 0; c9 < (ls.clones || []).length; c9++) { try { ls.clones[c9].remove(); } catch (e) {} }
    hoverOn(A, ls);
    var L = A.logic, cbs = ls.cbs, run = function () {
      L.setState({}, cbs.length ? function () { for (var k = 0; k < cbs.length; k++) try { cbs[k](); } catch (x) {} } : undefined); };
    try { var RD = window.ReactDOM; if (sync && RD && typeof RD.flushSync === 'function') RD.flushSync(run); else run(); } catch (e) { try { run(); } catch (x) {} }
  }
  function runMove(A, fn, self, ev) {
    var L = A.logic;
    if (!L || !A.cfg) { fn.call(self, ev); return; }
    var flag = flagOf(A);
    if (!flag || (A.offF && A.offF[flag])) { if (A.ls) endLive(A, true); fn.call(self, ev); return; }
    if (A.ls && A.ls.flag !== flag) endLive(A, true);
    var ls = A.ls || beginLive(A, flag);
    if (!ls) { fn.call(self, ev); return; }
    /* منطقُ الصفحة يكتب حالتَه كما يكتبها دائماً — فوراً — لكن بلا رسمِ React */
    var own = Object.prototype.hasOwnProperty.call(L, 'setState'), orig = L.setState;
    L.setState = function (u, cb) {
      var prev = L.state, patch = (typeof u === 'function') ? u(prev, L.props) : u;
      if (patch && typeof patch === 'object') L.state = Object.assign({}, prev, patch);
      if (typeof cb === 'function') ls.cbs.push(cb);
    };
    try { fn.call(self, ev); } finally { if (own) L.setState = orig; else delete L.setState; }
    try { A.cfg.paint(A, ls, L.state); }
    catch (e) { (A.offF || (A.offF = {}))[flag] = 1; endLive(A, true); return; }      /* عنصرٌ لم يُعرَف: المسارُ القديمُ لهذا النوع */
    try { paintHandles(A, ls, L.state); } catch (e) { ls.hoff = 1; for (var k9 in (ls.hm || {})) hide(ls, ls.hm[k9]); hideHandles(ls); }   /* R184 */
  }

  function api(getView, setView, cancel, logic, tag) {
    return { getView: getView, setView: setView, cancel: cancel, _up: null, logic: logic || null, cfg: CFG[tag] || null, lv: null, ls: null, offF: null };
  }

  /* ══ CANVAS-1 (W1): الإصبعُ الثاني تكبيرٌ دائماً — ولو نزل على مصلّى أو بابٍ أو معلمٍ أو مقبض ══
     كان معالجُ العنصر تحت الإصبع (onPointerDown ثمّ stopPropagation) يحجب الضغطةَ عن متتبّع الإيماءة فلا تُعرف إيماءةٌ جارية:
     يأخذ الإصبعُ الثاني السحبَ من الأوّل، وتتناوب حركتا الإصبعين على العنصر نفسِه كلَّ إطار (الاهتزاز)، ثمّ يُحفظ حيث وقف.
     الآن: كلُّ ضغطةِ لمسٍ أو قلمٍ على الخريطة تفتح الإيماءةَ في الالتقاط قبل أيّ معالج (فالحركاتُ تُرشَّح بمعرّف المؤشّر) ·
     والإصبعُ الثاني يُلتقط هناك فيصير تكبيراً ولا يبلغ العنصرَ تحته · وما بدأه الأوّلُ قبله بلحظة (سحبٌ · نقطةُ رسم · مسوّدةُ شكل)
     يعود كما كان: كان بدايةَ تكبيرٍ لا عملاً. */
  var GRACE = 350;                                 /* ms: الإصبعُ الثاني خلالها من نزول الأوّل ⇒ الإيماءةُ تكبيرٌ من أوّلها */
  function tnow() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function newG(A, host, e, lead) {
    var g = { api: A, pts: {}, two: false, pinch: null, raf: 0, cb: null, host: host, lead: lead, id: e.pointerId,
              ptype: e.pointerType, t0: tnow(), s0: A.logic ? A.logic.state : null, w: null };
    g.pts[e.pointerId] = { x: e.clientX, y: e.clientY, t: e.pointerType };
    A.offF = null;
    return g;
  }
  /* ══ W1-C2: ما كتبه الإصبعُ الأوّل وحدَه ══
     كان undoLead يُعيد كلَّ مفتاحٍ هندسيٍّ تغيّر منذ النزول إلى قيمته لحظتَها — فيُمحى معه ما وصل بين الإصبعين من غير الإيماءة:
     صورةُ الموقع من IndexedDB (_loadFloorImages) تختفي، وتحديثُ جهازٍ آخر (_bsLiveReload) يعود في الحالة والمخزنُ يحمله فيكتب الحفظُ التالي القديمَ فوقه.
     الآن تُسجَّل الكتابةُ حين تُسلِّم الطبقةُ حدثَ الإصبع الأوّل للصفحة (ضغطةُ المقبض · ضغطةُ الخريطة · كلُّ حركة) — استدعاءٌ متزامن
     لا يتخلّله ردٌّ غير متزامن — ويُعاد ما كتبته وحدَه: عنصراً عنصراً وحقلاً حقلاً، وما دام يحمل قيمتَها؛ وما غيّره غيرُها لا يُمسّ.
     (ضغطةُ جسم المصلّى/الباب/المعلم/المسار يعالجها React خارج الطبقة: لا تكتب هندسةً — رايةُ السحب والتحديد فقط، والرايةُ تُلغى كما كانت) */
  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  /* هويةُ العنصر: المصلّى والباب والمعلم uid ثمّ eid (يختمه الحفظُ لما سبقه) · المسارُ والنطاق uid ثمّ id · الموقع sid */
  var IDF = ['uid', 'eid', 'id', 'sid'];
  function ident(v) {
    if (!plain(v)) return null;
    for (var i = 0; i < IDF.length; i++) if (v[IDF[i]] != null && v[IDF[i]] !== '') return IDF[i] + ':' + v[IDF[i]];
    return null;
  }
  /* سجلُّ قيمة: o قبل أوّل كتابةٍ للإيماءة · l آخرُ ما كتبته · x كتب غيرُها بين كتابتين · c ما تحتها
     deep: 2 مصفوفةٌ — c قائمةُ عناصرها: كلٌّ بهويته k (أو بلا هوية: بآخر ما كتبته الإيماءةُ فيه وفهرسِه i) · 1 كائنٌ — c حقولُه بأسمائها · 0 قيمة.
     في أدقّ مستوى يصير ما كتبه غيرُها بين كتابتين نقطةَ العودة.
     R3-REC: كان عنصرُ المصفوفة يُعرف بفهرسه — فإن أدرج كاتبٌ آخر (تحديثٌ حيّ) عنصراً أو حذفه أو رتّب العناصرَ بين كتابتين للإيماءة
     صار للعنصر الواحد سجلّان بفهرسين، فيُعاد إلى موضعٍ وسيط أو يُكتب على عنصرٍ آخر. الآن يُتبَع بهويته في المصفوفة الحالية */
  function note(N, b, a, deep) {
    var kids = (deep === 2 ? (Array.isArray(b) && Array.isArray(a) && b.length === a.length) : deep === 1 ? (plain(b) && plain(a)) : false) && !(N && !N.c), j, r, id;
    if (kids && deep === 2) for (j = 0; j < a.length; j++) if (b[j] !== a[j] && ident(b[j]) !== ident(a[j])) kids = false;   /* موضعٌ تبدّل عنصرُه */
    if (!N) N = { o: b, l: b, x: 0, c: kids ? (deep === 2 ? [] : {}) : null, lost: 0 };
    if (N.l !== b) N.x = 1;
    if (!kids) {
      if (N.c && N.x) N.lost = 1;                  /* تبدّل الشكلُ (عددُ العناصر) بعد كتابةٍ من غيرها: لا يُعرف ما يخصّها — لا يُعاد */
      if (N.l !== b) N.o = b;
      N.c = null; N.l = a; return N;
    }
    N.l = a;
    if (deep === 2) {
      for (j = 0; j < a.length; j++) {
        if (b[j] === a[j]) continue;
        id = ident(a[j]); r = rec(N.c, b[j], id);
        /* late: عنصرٌ أوّلُ كتابةٍ للإيماءة فيه بعد أن كتب غيرُها المصفوفة، وهو بلا هوية (أو في السجلّ عنصرٌ بلا هوية) —
           قد يكون عنصرَها نفسَه أعاد غيرُها كتابتَه فلا يُعرف ما قبل الإيماءة: يبقى كما هو */
        if (!r) N.c.push(r = { k: id, late: N.x === 1 && (id === null || idless(N.c)), i: j, n: null });
        r.i = j; r.n = note(r.n, b[j], a[j], 1);
      }
    } else {
      for (j in b) if (b[j] !== a[j]) N.c[j] = note(N.c[j], b[j], a[j], 0);
      for (j in a) if (!(j in b)) N.c[j] = note(N.c[j], undefined, a[j], 0);
    }
    return N;
  }
  function idless(L) { for (var i = 0; i < L.length; i++) if (L[i].k === null) return true; return false; }
  /* سجلُّ العنصر: ما زال يحمل آخرَ ما كتبته الإيماءة (المرجعُ نفسُه) · أو بهويته (وما خُتم بعد كتابته يُعرف بهويته الآن) */
  function rec(L, prev, id) {
    for (var i = 0; i < L.length; i++) {
      var r = L[i];
      if (r.n.l === prev) return r;
      if (id !== null && (r.k === id || (r.k === null && ident(r.n.l) === id))) { r.k = id; return r; }
    }
    return null;
  }
  /* موضعُ العنصر في المصفوفة الحالية: بهويته (وحيدةً) · وبلا هوية: بالمرجع، ثمّ بفهرسه إن كان ما فيه نسخةً منه
     (حقولُه التي لم تكتبها الإيماءةُ هي هي — كنسخ الصورة) ولا التباسَ في السجلّ (amb) — وما لا يُعرف (-1) يبقى كما هو الآن */
  function locate(cur, r, amb) {
    var q, at = -1, id = r.k !== null ? r.k : ident(r.n.l);
    if (r.late) return -1;
    if (id !== null) { for (q = 0; q < cur.length; q++) if (ident(cur[q]) === id) { if (at >= 0) return -1; at = q; } return at; }   /* هويةٌ مكرّرة: لا يُعرف أيُّهما */
    for (q = 0; q < cur.length; q++) if (cur[q] === r.n.l) return q;
    return !amb && r.i < cur.length && copyOf(cur[r.i], r.n) ? r.i : -1;
  }
  function copyOf(v, n) {
    if (!plain(v) || !n.c || Array.isArray(n.c) || ident(v) !== null) return false;
    var k, any = false;
    for (k in v) if (!(k in n.c)) { if (v[k] !== n.l[k]) return false; any = true; }
    for (k in n.l) if (!(k in n.c) && !(k in v)) return false;
    return any;
  }
  /* القيمةُ بعد إعادة ما كتبته الإيماءةُ وحدَها: كما كانت إن لم يكتب غيرُها شيئاً — وإلا فما تحتها ما دام يحمل قيمتَها */
  function back(N, cur) {
    if (N.lost) return cur;
    if (!N.c) return cur === N.l ? N.o : cur;
    if (!N.x && cur === N.l) return N.o;
    var out = null, j, q, v, used = {}, amb = false;
    if (Array.isArray(N.c)) {
      if (!Array.isArray(cur)) return cur;
      for (j = 0; j < N.c.length; j++) if (N.c[j].late) amb = true;
      for (j = 0; j < N.c.length; j++) {
        q = locate(cur, N.c[j], amb); if (q < 0 || used[q]) continue;
        used[q] = 1; v = back(N.c[j].n, cur[q]); if (v === cur[q]) continue;
        (out = out || cur.slice())[q] = v;
      }
      return out || cur;
    }
    if (!plain(cur) || (ident(N.l) !== null && ident(N.l) !== ident(cur))) return cur;          /* عنصرٌ آخر */
    for (j in N.c) {
      v = back(N.c[j], cur[j]); if (v === cur[j]) continue;
      out = out || Object.assign({}, cur);
      if (v === undefined) delete out[j]; else out[j] = v;
    }
    return out || cur;
  }
  function wrote(A, g, b, a) {
    var c = A.cfg; if (!c || !c.geo || !g || !b || !a || b === a || !(tnow() - g.t0 <= GRACE)) return;
    var W = g.w || (g.w = {});
    for (var i = 0; i < c.geo.length; i++) { var k = c.geo[i]; if (b[k] !== a[k]) W[k] = note(W[k], b[k], a[k], 2); }
  }
  /* تسليمُ حدثِ الإصبع الأوّل للصفحة — وما كتبته في أثنائه يُنسب إلى الإيماءة */
  function byLead(A, g, fn, self, ev) {
    var L = A.logic, b = L && L.state;
    try { return fn.call(self, ev); } finally { if (L && g && G === g) wrote(A, g, b, L.state); }
  }
  /* ما كتبه الإصبعُ الأوّل منذ نزوله يعود — بلا رسم؛ يرسمه من يستدعيها. لا يُمسّ ما أنشأته الضغطة (عنصرٌ جديد) ولا ما كتبه غيرُها (W1-C2) */
  function undoLead(A, g) {
    var L = A.logic, c = A.cfg, s0 = g.s0, S = L && L.state, p = {}, i, k, v, drag = false, W = g.w || {}, own = Object.keys(W).length > 0;
    if (!c || !c.geo || !s0 || !S || S === s0 || !(tnow() - g.t0 <= GRACE)) return false;
    for (i = 0; i < c.flags.length; i++) if (S[c.flags[i]] && !s0[c.flags[i]]) drag = true;
    if (drag) {                                    /* سحبٌ بدأ بهذه الضغطة: العنصرُ إلى موضعه · والسحبُ يُلغى فلا يُحفظ شيء */
      for (i = 0; i < c.flags.length; i++) if (S[c.flags[i]]) p[c.flags[i]] = null;
      for (k in W) { v = back(W[k], S[k]); if (v !== S[k]) p[k] = v; }
    } else if (!own) {                             /* نقطةُ رسمٍ أضافتها الضغطة · مسوّدةُ شكلٍ بدأتها */
      var d = c.draw, P0 = s0[d.pts] || [], P1 = S[d.pts] || [];
      if (P1.length === P0.length + 1) { p[d.pts] = s0[d.pts]; p[d.cur] = s0[d.cur] || null; }
      if (S.draft && !s0.draft) p.draft = null;
    }
    if (!Object.keys(p).length) return false;
    L.state = Object.assign({}, S, p);
    return true;
  }
  /* إصبعٌ ثانٍ على خريطةٍ فيها إيماءةُ لمسٍ جارية: يُنهى السحبُ المفرد (أو يُلغى إن كان بدايةَ التكبير) ثمّ يبدأ التكبير */
  function second(A, svg, e) {
    var g = G;
    e.stopPropagation();                                                       /* العنصرُ تحت الإصبع الثاني لا يأخذ السحب */
    g.pts[e.pointerId] = { x: e.clientX, y: e.clientY, t: 'touch' };
    if (!g.host || !g.host.isConnected) g.host = svg;
    if (!g.two && touches(g) >= 2) {
      g.two = true; flush(g);
      var un = undoLead(A, g);
      if (A.ls) endLive(A, false);
      try { A._up && A._up.call(svg, e); } catch(x) { /* لا يمنع العرض — يُتجاوز بصمت */ }
      try { A.cancel && A.cancel(); } catch(x) { /* لا يمنع العرض — يُتجاوز بصمت */ }
      if (un) { try { A.logic.setState({}); } catch(x) { /* لا يمنع العرض — يُتجاوز بصمت */ } }                  /* رسمةٌ واحدةٌ بما عاد */
    }
    if (g.two) startPinch(g);
  }
  /* المؤشّراتُ المضغوطة الآن — من التقاط النافذة فلا يحجبها معالج. رفعٌ لم يبلغ معالجَ الخريطة (عنصرٌ أُزيل تحت الإصبع ·
     معالجٌ أوقف الحدث) لا يُبقي إيماءةً معلّقة تبتلع اللمساتِ التالية أو تجعل لمسةً واحدةً تكبيراً */
  var LIVE = {};
  function dropG() { var g = G; if (!g) return; G = null; flush(g); commitView(g.api); if (g.api.ls) endLive(g.api, false); }
  function sweep(id, ev) {
    var g = G; if (!g || !g.pts[id]) return;                                   /* عالجه معالجُ الخريطة كالمعتاد */
    var A = g.api, mine = !g.two && (g.id == null || g.id === id);
    delete g.pts[id];
    if (g.two && touches(g) < 2) g.pinch = null;
    if (pts(g).length && !mine) return;
    dropG();
    if (mine) { try { A._up && A._up.call(null, ev); } catch(x) { /* لا يمنع العرض — يُتجاوز بصمت */ } }        /* رفعُ السحب المفرد: يُعتمد كما لو بلغ المعالج */
  }

  function w(kind, fn, A) {
    if (!A) return fn;
    if (kind === 'up') A._up = fn;
    var W9 = function (e) {
      var g = G, self = this;
      if (kind === 'down') {
        if (A.ls) endLive(A, false);                                          /* نقرةٌ تُضيف نقطة: الرسمُ يلحق أوّلاً */
        if (!g || g.api !== A) { g = G = newG(A, null, e, null); g.id = null; }
        g.host = (e.currentTarget && e.currentTarget.ownerSVGElement) || e.currentTarget || g.host;
        g.pts[e.pointerId] = { x: e.clientX, y: e.clientY, t: e.pointerType };
        if (g.lead == null) {
          g.lead = e.pointerType; g.id = e.pointerId; g.two = false; g.pinch = null;
          return byLead(A, g, fn, self, e);                                       /* W1-C2: ما تكتبه ضغطةُ الخريطة يُنسب إلى الإيماءة */
        }
        if (g.lead === 'touch' && e.pointerType === 'touch' && touches(g) >= 2) {
          if (!g.two) {                       /* إصبعٌ ثانٍ نزل: تُنهى الإيماءةُ المفردة ثمّ يبدأ التكبير */
            g.two = true; flush(g);
            if (A.ls) endLive(A, false);
            try { A._up && A._up.call(self, e); } catch (x) {}
            try { A.cancel && A.cancel(); } catch (x) {}
          }
          startPinch(g);
          return;
        }
        return;                               /* لمسةٌ طارئةٌ على سحبةِ قلمٍ (راحةُ الكفّ): تُهمَل */
      }
      if (!g || g.api !== A) {
        /* لا إيماءةَ جارية: تحويمٌ أو خيطُ رسمٍ — منظَّمٌ بإطار العرض */
        if (kind !== 'move') { commitView(A); if (A.ls) endLive(A, false); return fn.call(self, e); }
        if (e.isPrimary === false) return;                                     /* CANVAS-1: مؤشّرٌ ثانٍ بلا إيماءة لا يقود سحباً أبداً */
        var h = A._h || (A._h = { raf: 0, cb: null, last: null });
        h.last = snap(e);
        sched(h, function () { var ev = h.last; h.last = null; if (ev) runMove(A, fn, self, ev); });
        return;
      }
      if (g.pts[e.pointerId]) { g.pts[e.pointerId].x = e.clientX; g.pts[e.pointerId].y = e.clientY; }
      if (kind === 'move') {
        if (g.two) { sched(g, function () { applyPinch(g); }); return; }
        if (g.id != null && e.pointerId !== g.id) return;
        g.last = snap(e);
        sched(g, function () { var ev = g.last; g.last = null; if (ev) byLead(A, g, function (x) { runMove(A, fn, self, x); }, null, ev); });   /* W1-C2 */
        return;
      }
      var mine = (g.id == null || e.pointerId === g.id);
      delete g.pts[e.pointerId];
      var left = pts(g).length;
      if (g.two) {
        if (touches(g) < 2) g.pinch = null;
        if (left === 0) { flush(g); G = null; commitView(A); }                 /* رفعُ الإصبعين: رسمةٌ واحدة */
        return;
      }
      if (!mine) return;
      flush(g); G = null;
      commitView(A);                                                            /* السحبُ باليد: إطارُ العرض يُعتمد */
      if (A.ls) endLive(A, false);                                              /* السحبُ بالقلم: رسمةٌ واحدة عند الرفع */
      return fn.call(self, e);
    };
    if (kind === 'down') W9.__bpA = A;
    return W9;
  }

  /* ══ R184: الضغطُ على النقاط باللمس والقلم ══
     منطقةُ لمسٍ أوسع (الأقربُ يفوز، والنقطةُ تغلب الضلعَ والجسمَ تحتها) · الضغطُ يبدأ السحبَ الحيَّ بلا رسمٍ للصفحة ·
     النقرُ المزدوجُ تحسبه المنصّة · راحةُ الكفّ على أيّ عنصرٍ أثناء سحبةِ القلم تُهمَل. للأحداث الموثوقة وحدَها. */
  var HIT = { pen: 12, touch: 20, mouse: 4 }, DBL = { pen: 16, touch: 28, mouse: 8 }, TAP = null, DBLX = 0;
  function propsOf(el) { if (!el) return null; for (var k in el) if (k.indexOf('__reactProps$') === 0) return el[k]; return null; }
  function mapOf(t) {
    var svg = t && t.closest ? t.closest('svg[data-map-zoom],svg[data-ds-zoom]') : null; if (!svg) return null;
    var pr = propsOf(svg), A = pr && pr.onPointerDown && pr.onPointerDown.__bpA;
    return A && A.logic && A.cfg ? { svg: svg, A: A } : null;
  }
  function pickHandle(svg, e) {
    var t = e.target, k, pr, edge = null;
    if (t && t.tagName) {
      var tg = String(t.tagName).toLowerCase(); k = (tg === 'circle' || tg === 'line') ? fkey(t) : null;
      if (k != null && HKZ.test(k) && tg === 'circle') { pr = propsOf(t); if (pr && typeof pr.onPointerDown === 'function') return { el: t, k: k, props: pr }; }
      if (k != null && /^e\d+$/.test(k)) { pr = propsOf(t); if (pr && typeof pr.onPointerDown === 'function') edge = { el: t, k: k, props: pr }; }
    }
    var T = HIT[e.pointerType] || 0, best = null, bd = 1e9;
    if (T > 0) {
      var cs = svg.querySelectorAll('circle');
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i]; k = fkey(c); if (k == null || !HKZ.test(k)) continue;
        pr = propsOf(c); if (!pr || typeof pr.onPointerDown !== 'function') continue;
        if (c.style.visibility === 'hidden' || c.style.pointerEvents === 'none') continue;
        var r = c.getBoundingClientRect(); if (!r.width) continue;
        var dd = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) - r.width / 2;
        var sc = dd - (/^(?:h|pv|sv)\d+$/.test(k) ? 4 : (k === 'rot' || k === 'cr-h') ? 2 : 0);   /* الرأسُ أولى حين تتقارب النقاط */
        if (dd <= T && sc < bd) { bd = sc; best = { el: c, k: k, props: pr }; }
      }
    }
    return best || edge;
  }
  function fakeEv(e, el) { var o = snap(e); o.currentTarget = el; o.target = el; o.nativeEvent = e; return o; }
  function pressHandle(A, svg, hit, e) {
    var L = A.logic, s0 = L.state, cbs = [], any = false, g0 = null, zd0 = null;
    if (A.ls) endLive(A, false);
    /* ما رسمته الصفحةُ الآن — قبل أن يكتب المعالجُ شيئاً (بعضُها يكتب بياناتِ الجولة فوراً) */
    try { g0 = geoFor(A, s0); } catch (x) { g0 = null; }
    if (A.cfg === CFG.daily && s0.dsSel && s0.dsSel.t === 'zone') { try { var zi = s0.dsSel.i, zz = (s0.dsZoneTmp && s0.dsZoneTmp.i === zi) ? s0.dsZoneTmp.z : (L._curFloorZones() || [])[zi]; if (zz) zd0 = zz.d; } catch (x) {} }
    try { svg.setPointerCapture(e.pointerId); } catch (x) {}
    G = newG(A, svg, e, e.pointerType);
    /* معالجُ النقطة يعمل كما هو ويكتب حالتَه — بلا رسمٍ للصفحة */
    var own = Object.prototype.hasOwnProperty.call(L, 'setState'), orig = L.setState;
    L.setState = function (u, cb) {
      var prev = L.state, patch = (typeof u === 'function') ? u(prev, L.props) : u;
      if (patch && typeof patch === 'object') { L.state = Object.assign({}, prev, patch); any = true; }
      if (typeof cb === 'function') cbs.push(cb);
    };
    try { byLead(A, G, hit.props.onPointerDown, hit.props, fakeEv(e, hit.el)); } catch (x) {} finally { if (own) L.setState = orig; else delete L.setState; }   /* W1-C2 */
    var flag = flagOf(A);
    if (flag && flag !== 'draw') {
      var ls = beginLive(A, flag, s0, g0, zd0);
      if (ls) {
        for (var i = 0; i < cbs.length; i++) ls.cbs.push(cbs[i]);
        try { A.cfg.paint(A, ls, L.state); } catch (x) { (A.offF || (A.offF = {}))[flag] = 1; endLive(A, true); return; }
        try { paintHandles(A, ls, L.state); } catch (x) { ls.hoff = 1; for (var k9 in (ls.hm || {})) hide(ls, ls.hm[k9]); hideHandles(ls); }
        return;
      }
    }
    /* لا سحب: تُرسم الصفحةُ الآن بما كتبه المعالج */
    if (any || cbs.length) L.setState({}, cbs.length ? function () { for (var q = 0; q < cbs.length; q++) try { cbs[q](); } catch (x) {} } : undefined);
  }
  /* ══ CANVAS-3 (W1): النقرةُ المولَّدة من ضغطةٍ بدأت على الخريطة لا تقع خارجها ══
     ضغطةٌ على الخريطة قد تفتح نافذةً في الحال (إغلاقُ المضلّع ⇒ محرّرُ المصلّى · الباب · المعلم · المسار · النطاق · المعايرة)،
     والمتصفّحُ يُطلق نقرةَ اللمسة نفسِها عند الرفع حيث الإصبع — فتقع على خلفية النافذة الجديدة فتُغلقها (وتحذف الجديد).
     نقرةُ تلك الضغطة لا تعمل إلا على الخريطة نفسِها؛ والنقرةُ المقصودة ضغطةٌ جديدة. */
  var MAPS = 'svg[data-map-zoom],svg[data-ds-zoom]', PRESS = null;
  try {
    window.addEventListener('pointerdown', function (e) {
      LIVE[e.pointerId] = 1;
      var t = e.target, s = e.isTrusted && t && t.closest ? t.closest(MAPS) : null;
      PRESS = s ? { t: tnow() } : null;
    }, true);
    var up9 = function (e) {
      var id = e.pointerId; delete LIVE[id];
      /* الإيماءةُ نفسُها والمؤشّرُ لم ينزل من جديد قبل المهلة (نقرٌ مزدوجٌ بالقلم أو الفأرة على صفحةٍ مشغولة: المعرّفُ نفسُه) */
      var g0 = G; if (g0 && g0.pts[id]) { var ev = snap(e); setTimeout(function () { if (G === g0 && !LIVE[id]) sweep(id, ev); }, 0); }
    };
    window.addEventListener('pointerup', up9, true);
    window.addEventListener('pointercancel', up9, true);
    window.addEventListener('click', function (e) {
      var P = PRESS; PRESS = null;
      if (!P || !e.isTrusted || !(e.detail > 0) || tnow() - P.t > 1500) return;
      var t = e.target; if (t && t.closest && t.closest(MAPS)) return;          /* على الخريطة نفسِها: كما كانت */
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
    }, true);
  } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ }
  try {
    document.addEventListener('pointerdown', function (e) {
      if (!e.isTrusted) return;
      var M = mapOf(e.target); if (!M) return;
      var A = M.A, svg = M.svg;
      if (G && G.api === A) {                                                   /* مؤشّراتٌ رُفعت ولم يُرَ رفعُها: إيماءةٌ معلّقة */
        for (var k0 in G.pts) if (!LIVE[k0]) delete G.pts[k0];
        if (!pts(G).length) dropG();
      }
      if (G && G.api === A) {                                                   /* إيماءةٌ جارية */
        var ld = G.lead || G.ptype;
        if (e.pointerType === 'touch' && ld === 'touch') return second(A, svg, e);   /* CANVAS-1 */
        if (!(e.pointerType !== 'touch' && e.pointerType === ld)) {
          if (ld === 'pen' && e.pointerType === 'touch') e.stopPropagation();   /* راحةُ الكفّ */
          return;
        }
        G = null; if (A.ls) endLive(A, false);                                  /* قلمٌ أو فأرةٌ نزلا من جديد: الرفعُ السابقُ ضاع */
      }
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var now = (window.performance && performance.now) ? performance.now() : Date.now(), tp = e.pointerType || 'mouse', hit = null, dbl = false;
      /* ضغطةٌ ثانيةٌ قريبةٌ في الزمن والمكان من الأولى: النقرُ المزدوجُ على نقطةِ الأولى نفسِها */
      if (TAP && TAP.svg === svg && TAP.type === tp && now - TAP.t <= 420 && TAP.el && TAP.el.isConnected && Math.hypot(e.clientX - TAP.x, e.clientY - TAP.y) <= (DBL[tp] || 8)) {
        var pr2 = propsOf(TAP.el); if (pr2 && typeof pr2.onDoubleClick === 'function') { hit = { el: TAP.el, k: TAP.k, props: pr2 }; dbl = true; }
      }
      if (!hit) hit = pickHandle(svg, e);
      if (!hit) {
        TAP = null;
        /* CANVAS-1: الإيماءةُ تُفتح هنا — معالجُ المصلّى/الباب/المعلم يوقف الحدثَ قبل الخريطة فلا يراها متتبّعُها.
           القائدُ يحدّده معالجُ الخريطة إن بلغته الضغطة؛ وإلا فنوعُ المؤشّر (G.ptype) */
        if ((e.pointerType === 'touch' || e.pointerType === 'pen') && (!G || G.api !== A)) G = newG(A, svg, e, null);
        return;
      }
      e.stopPropagation();
      if (dbl && typeof hit.props.onDoubleClick === 'function') {
        TAP = null; DBLX = now + 700;
        if (A.ls) endLive(A, true);
        try { hit.props.onDoubleClick(fakeEv(e, hit.el)); } catch (x) {}
        return;
      }
      TAP = { k: hit.k, el: hit.el, svg: svg, type: tp, t: now, x: e.clientX, y: e.clientY };
      pressHandle(A, svg, hit, e);
    }, true);
    document.addEventListener('dblclick', function (e) {
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      if (now < DBLX && mapOf(e.target)) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }
    }, true);
  } catch (e) {}

  /* R184: انحناءاتُ المصلّى عند إضافة رأسٍ أو حذفه — يبقى ما سوى موضع التغيير كما هو */
  KIVO.BassamCurve = {
    ins: function (hs, n, at, full) {
      var Z = function () { return { in: { x: 0, y: 0 }, out: { x: 0, y: 0 } }; };
      var H = (Array.isArray(hs) ? hs : []).map(function (q) { q = q || {}; return { in: { x: (q.in && q.in.x) || 0, y: (q.in && q.in.y) || 0 }, out: { x: (q.out && q.out.x) || 0, y: (q.out && q.out.y) || 0 } }; });
      if (!H.length && !full) return [];
      while (H.length < n) H.push(Z());
      H.splice(at, 0, Z());
      return H;
    },
    del: function (hs, at) { return (Array.isArray(hs) ? hs : []).filter(function (q, j) { return j !== at; }); }
  };
  KIVO.BassamPointer = { rect: rect, api: api, w: w, toMap: toMap, panTo: panTo, _geo: geoFor, _hit: HIT,
    /* للفحص وحدَه */ _live: function (A) { return !!(A && (A.ls || A.lv)); } };
})();
