/* Generated from the marked pure engine in src/services/332-find-day.js. Do not edit. */
var KIVO_FIND = (function(){
    var AR_D = /[\u0660-\u0669]/g, FA_D = /[\u06F0-\u06F9]/g;
    /* KIVO_265 · أداء (ملاحظةُ المالك 2026-10-19): التطبيعُ يُطبَّق على نصّ كل صفٍّ في كل ضغطة مفتاح (1000 صفٍّ × 12 تعبيراً) — والنصوصُ نفسُها
       تتكرّر بين الضغطات، فتُذكَر مرةً (خريطةٌ محدودة تُفرَّغ عند امتلائها) */
    var _nc = new Map(), NC_MAX = 20000;
    function norm(v){
      var k0 = String(v == null ? "" : v), c0 = _nc.get(k0);
      if (c0 !== undefined) return c0;
      var s = k0.toLowerCase();
      s = s.replace(AR_D, function(d){ return String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48); });
      s = s.replace(FA_D, function(d){ return String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48); });
      s = s.replace(/[\u0640\u200e\u200f\u061c]/g, "");          /* تطويل وعلامات اتجاه */
      s = s.replace(/[\u064B-\u0652\u0670]/g, "");                /* تشكيل */
      s = s.replace(/[\u0623\u0625\u0622\u0671\u0672\u0673]/g, "\u0627");
      s = s.replace(/\u0649/g, "\u064A");
      s = s.replace(/\u0629/g, "\u0647");
      s = s.replace(/[\u0624\u0626]/g, "\u0621");
      s = s.replace(/[^0-9a-z\u0621-\u064A]+/g, " ");
      s = s.replace(/\s+/g, " ").trim();
      if (_nc.size >= NC_MAX) _nc.clear();
      _nc.set(k0, s);
      return s;
    }
    function tok(q){ var n = norm(q); return n ? n.split(" ") : []; }
    function hay(fields){
      var a = [];
      (fields || []).forEach(function(f){
        if (f == null) return;
        if (Array.isArray(f)) { a.push(f.join(" ")); return; }
        a.push(String(f));
      });
      return norm(a.join(" "));
    }
    /* المطابقة الواسعة: الكلمة موجودةٌ في أي موضع — تُستعمل عند خلوّ الدقيقة */
    function hitLoose(tokens, fields){
      if (!tokens || !tokens.length) return true;
      var h = hay(fields), wsL = h.split(" ");
      for (var i = 0; i < tokens.length; i++) {
        var t2 = tokens[i];
        if (h.indexOf(t2) !== -1) continue;
        /* المركّب الملتصق فقط («عبدالله» على «عبد الله») — لا لصقَ بين نهاية
           كلمةٍ وبداية أخرى، فذلك يخلط الاسمين */
        var okC = false;
        for (var j3 = 0; j3 < wsL.length && !okC; j3++) {
          if (t2.length > wsL[j3].length) {
            var jn2 = "", m3 = j3;
            while (m3 < wsL.length && jn2.length < t2.length) { jn2 += wsL[m3]; m3++; }
            if (jn2.indexOf(t2) === 0) okC = true;
          }
        }
        if (!okC) return false;
      }
      return true;
    }
    /* المطابقة الدقيقة — بالكلمات لا ببداية الحقل وحدها:
       كانت الكلمة تُطابَق من بداية الحقل كاملاً، فاستعلام «محمد ع» لا يجد
       «محمد عطاوي» بدقّة وينهار إلى المطابقة الواسعة فيغرق في النتائج.
       الآن: الكلمة تطابِق إن كانت بدايةَ كلمةٍ في الحقل («ع» تجد «عوض» لا
       «سعود»)، و«ال» التعريف لا تحجب فـ«غامدي» تجد «الغامدي»، والمركّب
       الملتصق مُدرَك فـ«عبدالله» تجد «عبد الله». وكلمات الاستعلام النصية
       تُطابَق مرتّبةً داخل الحقل الواحد: «محمد ع» تعني محمداً تليه كلمةٌ
       تبدأ بعين — لا أيَّ عينٍ في أي موضع. والأرقام تُطابَق بالاحتواء في
       أي حقل، لأن جزء الجوال أو الهوية يُبحث به من وسطه عادةً. */
    function fieldsNorm(fields){
      var out = [];
      (fields || []).forEach(function(f){
        if (f == null) return;
        var s = norm(Array.isArray(f) ? f.join(" ") : String(f));
        if (s) out.push(s);
      });
      return out;
    }
    /* كلمات الوصل «بن/بنت/ابن/ال» ليست هدفاً للمطابقة: من يكتب «ب» يقصد
       بدراً وبشرى، لا كلَّ من في اسمه «بن» أو «بنت» — وهي تبقى قابلةً
       للإيجاد نصاً من الطبقة المرتّبة إن كُتبت كاملةً */
    var CONN = { "بن": 1, "بنت": 1, "ابن": 1, "ال": 1 };
    function wordPref(w, t){
      if (CONN[w]) return false;
      if (w.indexOf(t) === 0) return true;
      if (w.indexOf("\u0627\u0644") === 0 && w.slice(2).indexOf(t) === 0) return true;
      if (t.length > 2 && t.indexOf("\u0627\u0644") === 0 && w.indexOf(t.slice(2)) === 0) return true;
      return false;
    }
    /* مطابقة كلمات الاستعلام مرتّبةً على كلمات حقلٍ واحد */
    function seqHit(ts, f){
      var ws = f.split(" "), i = 0;
      for (var k = 0; k < ts.length; k++) {
        var t = ts[k], hitAt = -1, adv = 0;
        for (var j = i; j < ws.length; j++) {
          if (wordPref(ws[j], t)) { hitAt = j; adv = 1; break; }
          if (t.length > ws[j].length) {
            var joined = "", m = j;
            while (m < ws.length && joined.length < t.length) { joined += ws[m]; m++; }
            if (joined.indexOf(t) === 0) { hitAt = j; adv = m - j; break; }
          }
        }
        if (hitAt < 0) return false;
        i = hitAt + adv;
      }
      return true;
    }
    function hit(tokens, fields){
      if (!tokens || !tokens.length) return true;
      var fs = fieldsNorm(fields), words = [], i, j;
      for (i = 0; i < tokens.length; i++) {
        var t2 = tokens[i];
        if (/^[0-9]+$/.test(t2)) {
          /* الرقم يُتابَع من أوّله رقماً رقماً: «618» تريك من رقمُه يبدأ
             بها لا من صادفت وسطَ رقمه — والبحث من وسط الرقم تتكفّل به
             الطبقتان التاليتان إن خلت هذه */
          var okN = false;
          for (j = 0; j < fs.length && !okN; j++) {
            var wn = fs[j].split(" ");
            for (var w2 = 0; w2 < wn.length; w2++) if (wn[w2].indexOf(t2) === 0) { okN = true; break; }
          }
          if (!okN) return false;
        } else words.push(t2);
      }
      if (!words.length) return true;
      /* «عبد الله» بمسافةٍ تجد «عبدالله» الملتصقة: تُجرَّب أيضاً صورُ دمج
         الكلمات المتجاورة في الاستعلام — وعددها محدود فلا كلفة تُذكر */
      var vars = [words];
      if (words.length > 1 && words.length <= 6) {
        var nMask = 1 << (words.length - 1);
        for (var msk = 1; msk < nMask; msk++) {
          var v = [words[0]];
          for (i = 1; i < words.length; i++) {
            if (msk & (1 << (i - 1))) v[v.length - 1] += words[i];
            else v.push(words[i]);
          }
          vars.push(v);
        }
      }
      for (j = 0; j < fs.length; j++)
        for (var vi = 0; vi < vars.length; vi++)
          if (seqHit(vars[vi], fs[j])) return true;
      return false;
    }
    /* الطبقة المرتّبة: إن لم تبدأ حروفُك كلمةً فهي على الأقل تظهر بترتيبك
       داخل حقلٍ واحد — «هيبي» تجد «اللهيبي»، و«محمد عو» لا تعطيك أبداً
       اسماً ليس فيه محمد فعوض بهذا الترتيب. الأرقام هنا بالاحتواء (بحثُ
       وسطِ الجوال أو الهوية). */
    function hitChain(tokens, fields){
      if (!tokens || !tokens.length) return true;
      var fs = fieldsNorm(fields), words = [], i, j, k, at;
      for (i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (/^[0-9]+$/.test(t)) {
          var okN = false;
          for (j = 0; j < fs.length; j++) if (fs[j].indexOf(t) !== -1) { okN = true; break; }
          if (!okN) return false;
        } else words.push(t);
      }
      if (!words.length) return true;
      for (j = 0; j < fs.length; j++) {
        var f = fs[j], p = 0, ok = true;
        for (k = 0; k < words.length; k++) { at = f.indexOf(words[k], p); if (at === -1) { ok = false; break; } p = at + words[k].length; }
        if (ok) return true;
        /* اللصق بين الأسماء ممنوع: لا يُعبَر إلى الاسم الثاني إلا إذا استُهلك
           الأول كاملاً من أوّله (المركّب كـ«عبدالله») — فلا تجد «دح» في
           «محمد حامد» ولا «دل» في «خالد لافي» */
        var ws2 = f.split(" "), iw = 0; ok = true;
        for (k = 0; k < words.length && ok; k++) {
          var t4 = words[k], fnd = -1, adv = 1;
          for (var j4 = iw; j4 < ws2.length; j4++) {
            if (ws2[j4].indexOf(t4) !== -1) { fnd = j4; adv = 1; break; }
            if (t4.length > ws2[j4].length) {
              var jn = "", m4 = j4;
              while (m4 < ws2.length && jn.length < t4.length) { jn += ws2[m4]; m4++; }
              if (jn.indexOf(t4) === 0) { fnd = j4; adv = m4 - j4; break; }
            }
          }
          if (fnd < 0) ok = false; else iw = fnd + adv;
        }
        if (ok) return true;
      }
      return false;
    }
    return {
      norm: norm, tok: tok, hay: hay, hit: hit,
      /* R183 (الملاحظة ١٤): طيُّ الأرقام وحدها (٠-٩ و۰-۹ ← 0-9) — لطرفَي المقارنة في البحوث الحرفية */
      dig: function(v){ return String(v == null ? "" : v).replace(AR_D, function(d){ return String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48); }).replace(FA_D, function(d){ return String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48); }); },
      match: function(q, fields){ return hit(tok(q), fields); },
      hitChain: hitChain, hitLoose: hitLoose,
      /* مصفاةٌ بثلاث طبقات كلها وفيّةٌ لترتيب ما كُتب: دقيقة (بدايات الكلمات
         وبالترتيب) ← مرتّبة (الحروف بترتيبها ولو وسط الكلام) ← واسعة (كل
         كلمةٍ موجودة ولو في حقلٍ آخر) — ولا تنزل طبقةً إلا إن خلت التي فوقها */
      filter: function(q, list, fieldsOf){
        var ts = tok(q);
        if (!ts.length) return (list || []).slice();
        var src = list || [];
        var out = src.filter(function(row){ return hit(ts, fieldsOf(row)); });
        if (!out.length) out = src.filter(function(row){ return hitChain(ts, fieldsOf(row)); });
        if (!out.length) out = src.filter(function(row){ return hitLoose(ts, fieldsOf(row)); });
        /* ترتيبٌ بالوجاهة لا بالهجاء وحده: من يبدأ اسمُه الأول بما كتبتَ
           أولاً، ثم من في اسمه كلمةٌ تبدؤه، ثم البقية (كعائلات أل التعريف)
           — فكتابة «ب» تُصدِّر بدراً وبشرى لا أصحاب الألف */
        var t0 = null;
        for (var i = 0; i < ts.length; i++) if (!/^[0-9]+$/.test(ts[i])) { t0 = ts[i]; break; }
        if (!t0 || out.length < 2) return out;
        var ranked = out.map(function(row, ix){
          var fs = fieldsNorm(fieldsOf(row)), r = 2;
          for (var j = 0; j < fs.length && r; j++) {
            var ws = fs[j].split(" ");
            for (var k = 0; k < ws.length; k++) {
              if (CONN[ws[k]]) continue;
              if (ws[k].indexOf(t0) === 0) { r = (k === 0 && j === 0) ? 0 : (r > 1 ? 1 : r); if (!r) break; }
            }
          }
          return { row: row, r: r, ix: ix };
        });
        ranked.sort(function(a, b){ return a.r - b.r || a.ix - b.ix; });
        return ranked.map(function(x){ return x.row; });
      }
    };
  })();
