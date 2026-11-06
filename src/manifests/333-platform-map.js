/* ═══ خريطةُ المنصة: الترتيبُ الفعّال · الخريطةُ المولَّدة من السجلات ═══
   KIVO_257 · AUD-010: جزءٌ 4/6 من «src/auth/330-auth-perm.js» السابقة — مقسومةً بالمسؤولية بـtools/split_iife.mjs (tools/split/330-auth-perm.json)؛
   التبعياتُ بين الأجزاء صريحةٌ هنا وعبر المساحة الداخلية window.__BS_I.auth وحدها. */
(function(){
  var I = KIVO.__BS_I && KIVO.__BS_I.auth; if (!I || I.dead) return;   /* الجزءُ الأول لم يُحمَّل أو خرج مبكّراً ⇒ لا شيءَ بعده — كالـIIFE الواحدة */
  /* ← من الأجزاء السابقة */
  var NAV_REG = I.NAV_REG, PAGE_OF = I.PAGE_OF, PAGE_REG = I.PAGE_REG, isContainer = I.isContainer, onAny = I.onAny, onCap = I.onCap,
      splitLeaf = I.splitLeaf;
  /* ═══ الترتيب الفعّال للمنصة — مصدرٌ واحد تقرأه القائمة الجانبية والأشجار الثلاث (السقف · صلاحيات الموظف · القوالب) ═══
     المجموعة الأولى بترتيب مدير النظام من «المنصة ← القوائم» (وإلا الافتراضي NAVKEYS)، ثم المراجع، ثم الإدارة —
     وهو ترتيب القائمة الجانبية نفسه. ما أُطفئ على مستوى المنصة (side.hidden أو الوحدات) يُعاد في hidden
     ليُعرض في الأشجار باهتاً بشارة «مطفأة من المنصة» لا أن يختفي من القائمة ويبقى في السقف كأنه متاح. */
  function navOrder(){
    var P = null; try { P = KIVO.BassamPlat && KIVO.BassamPlat.get && KIVO.BassamPlat.get(); } catch (e) {}
    var keys = (KIVO.BassamPlat && KIVO.BassamPlat.NAVKEYS) || ['kpis','emps','planning','daily','irshad','seized','award'];
    var order = (((P && P.side && P.side.order) || [])).filter(function(k){ return keys.indexOf(k) >= 0; });
    keys.forEach(function(k, i){ if (order.indexOf(k) >= 0) return; var prev = i > 0 ? order.indexOf(keys[i - 1]) : -1; order.splice(prev + 1, 0, k); });
    /* صفحة جديدة في السجل لم تدخل NAVKEYS بعد: تلحق بمجموعة العمل لا تضيع */
    var known = order.concat(['links','help','admin']);
    PAGE_REG.forEach(function(p){ if (!p.under && known.indexOf(p.key) === -1) order.push(p.key); });
    var hidden = ((P && P.side && P.side.hidden) || []).concat((P && P.mods && P.mods.off) || []);
    return { groups: [ { key:'work', name:'عمل الإدارة', keys:order }, { key:'refs', name:'مراجع', keys:['links','help'] }, { key:'mgmt', name:'الإدارة', keys:['admin'] } ], hidden: hidden };
  }
  /* يعيد ترتيب صفوف شجرةٍ مسطّحة (رأسٌ يتبعه أبناؤه) على الترتيب الفعّال، ويدرج صفوف المجموعات، ويوسم المطفأ */
  function orderRows(rows){
    var NO = navOrder(), byName = {};
    PAGE_REG.forEach(function(p){ byName[p.name] = p.key; }); NAV_REG.forEach(function(g){ byName[g.name] = g.key; });
    var blocks = [], cur = null;
    (rows || []).forEach(function(r){
      var top = !(r.child || r.isChild);
      if (top) { cur = { key: r.key || byName[r.name] || r.name, rows: [r] }; blocks.push(cur); }
      else if (cur) cur.rows.push(r); else { cur = { key: r.key || r.name, rows: [r] }; blocks.push(cur); }
    });
    var used = {}, out = [];
    var hStyle = 'display:flex;align-items:center;gap:8px;padding:9px 12px 3px;font-size:9.5px;font-weight:800;color:var(--fg-x94a3b8);letter-spacing:.05em;border-bottom:1px solid var(--bd-xf1f3f5);';
    NO.groups.forEach(function(g){
      var picked = []; g.keys.forEach(function(k){ blocks.forEach(function(b){ if (!used[b.key] && b.key === k) { used[b.key] = 1; picked.push(b); } }); });
      if (!picked.length) return;
      out.push({ kind:'group', isGroup:true, isCont:false, isLeaf:false, isParent:false, isLeafRow:false, isChild:false, key:'grp:' + g.key, name:g.name, rowStyle:hStyle, platOff:false });
      picked.forEach(function(b){ var off = NO.hidden.indexOf(b.key) !== -1; b.rows.forEach(function(r){ r.platOff = off; if (off) r.rowStyle = (r.rowStyle || '') + 'opacity:.55;'; out.push(r); }); });
    });
    blocks.forEach(function(b){ if (!used[b.key]) b.rows.forEach(function(r){ r.platOff = false; out.push(r); }); });
    out.forEach(function(r){ if (r.isGroup === undefined) r.isGroup = false; if (r.platOff === undefined) r.platOff = false; });
    return out;
  }
  /* ═══ خريطة المنصة — تُولَّد من السجلات (PAGE_REG · NAV_REG · navOrder) لا تُكتب يدوياً ═══
     صفوف مسطّحة للعرض في «المنصة ← حول المنصة»: كل ما يدخل السقف بالترتيب الفعّال ومجموعاته وعناوينه،
     ثم ما هو خارج السقف بحكم طبيعته (الدخول · الملف الشخصي · مدير النظام) من سجل ثابت صغير هنا. */
  var TAB_ADDR = KIVO.KIVO_MANIFEST.clone('tabAddr');   /* الصفحات التي لتبويباتها عناوين #/page/tab */
  function siteMap(){
    var NO = navOrder(), rows = [], GRP = {}, GRPO = {};
    NAV_REG.forEach(function(g){ (g.refs || []).forEach(function(k){ GRP[k] = g.key; GRPO[k] = g; }); });
    var B = { box:['حاوية','#8A6F35','rgba(185,151,81,0.1)','rgba(185,151,81,0.35)'], page:['صفحة','#4A5C68','#F4F5F7','#E1E1E1'], tab:['تبويب','#0e7490','rgba(14,116,144,0.08)','rgba(14,116,144,0.3)'],
              off:['خارج الصفحة','#b45309','rgba(180,83,9,0.07)','rgba(180,83,9,0.25)'], ref:['ورقة مرجعية','#0e7490','rgba(14,116,144,0.08)','rgba(14,116,144,0.3)'], win:['نافذة','#64748b','transparent','#CBD5E1'],
              srv:['خادم فقط','#64748b','transparent','#CBD5E1'], sup:['مسؤول المنصة','#b91c1c','rgba(185,28,28,0.07)','rgba(185,28,28,0.25)'], grp:['','','',''] };
    function row(depth, name, kind, addr, hint, platOff, capOff){
      var b = B[kind] || B.page, isG = kind === 'grp';
      rows.push({ name:name, badge:b[0], addr:addr || '', hint:hint || '', isGroup:isG,
        rowStyle: isG ? 'display:flex;align-items:center;gap:8px;padding:12px 12px 3px;font-size:9.5px;font-weight:800;color:var(--fg-x94a3b8);letter-spacing:.05em;border-bottom:1px solid var(--bd-xf1f3f5)'
                      : 'display:flex;align-items:center;gap:8px;padding:7px 12px;padding-right:' + (12 + depth * 22) + 'px;border-bottom:1px solid var(--bd-xf4f4f4);font-size:12px;' + ((platOff || capOff) ? 'opacity:.55;' : ''),
        nameStyle: 'font-weight:' + (depth ? '600' : '700') + ';color:var(--fg-x141414);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0',
        badgeStyle: isG ? 'display:none' : 'font-size:9px;font-weight:700;border-radius:6px;padding:1px 7px;flex-shrink:0;color:' + b[1] + ';background:' + b[2] + ';border:1px solid ' + b[3],
        offStyle: platOff ? 'font-size:9px;color:var(--fg-x64748b);background:var(--bg-a1001161390p08);border:1px solid var(--bd-a1001161390p3);border-radius:6px;padding:1px 7px;flex-shrink:0' : 'display:none',
        capOffStyle: capOff ? 'font-size:9px;color:var(--fg-x64748b);background:var(--bg-a1001161390p08);border:1px solid var(--bd-a1001161390p3);border-radius:6px;padding:1px 7px;flex-shrink:0' : 'display:none',
        addrStyle: addr ? 'font-size:10.5px;color:var(--fg-x8a6f35);direction:ltr;unicode-bidi:isolate;white-space:nowrap;font-feature-settings:"tnum"' : 'display:none',
        hintStyle: hint ? 'font-size:10.5px;color:var(--fg-x94a3b8);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' : 'display:none',
        lineStyle: isG ? 'flex:1;height:1px;background:var(--bg-a3752630p08)' : 'flex:1' });
    }
    function page(p, depth){
      var off = NO.hidden.indexOf(p.key) !== -1, nav = p.nav ? '#/' + p.nav : '', coff = !onCap(p.key);
      row(depth, p.name, isContainer(p.key) ? 'box' : 'page', nav, p.under ? 'صفحة مستقلة تحت الحاوية' : '', off, coff);
      if (!isContainer(p.key)) return;
      var seq = p.seq || [].concat((p.subs || []).map(function(x){ return 'sub:' + x.key; }), (p.tabs || []).map(function(x){ return 'tab:' + x.key; }), PAGE_REG.filter(function(q){ return q.under === p.key; }).map(function(q){ return 'page:' + q.key; }));
      seq.forEach(function(e){ var t = e.split(':'), kind = t[0], k = t[1];
        if (kind === 'page') { var q = PAGE_OF[k]; if (q) page(q, depth + 1); return; }
        var reg = kind === 'sub' ? (p.subs || []) : (p.tabs || []); var x = reg.filter(function(z){ return z.key === k; })[0]; if (!x) return;
        var lk = p.key + '/' + k, g = GRPO[lk], ta = TAB_ADDR[p.key], addr = (ta === 1 || (ta && ta[k])) ? '#/' + p.nav + '/' + k : '';
        row(depth + 1, x.name, x.offPage ? 'off' : 'tab', addr, g ? 'تُعرض داخل «' + g.name + '»' : (x.offPage ? 'تُمنح وحدها ولا تفتح صفحتها' : ''), off, coff || !onCap(lk));
      });
    }
    NO.groups.forEach(function(g){
      var any = g.keys.some(function(k){ return PAGE_OF[k] || NAV_REG.some(function(n){ return n.key === k; }); }); if (!any) return;
      row(0, g.name, 'grp');
      g.keys.forEach(function(k){
        var nv = NAV_REG.filter(function(n){ return n.key === k; })[0];
        if (nv) { var off = NO.hidden.indexOf(k) !== -1; row(0, nv.name, 'box', '#/' + (nv.nav || k), 'حاوية عرض — أوراقها بمفاتيح صفحاتها', off, !onAny(nv.refs || []));
          (nv.refs || []).forEach(function(r){ var sp = splitLeaf(r), pp = PAGE_OF[sp.page], x = pp ? (pp.subs || []).concat(pp.tabs || []).filter(function(z){ return z.key === sp.sub; })[0] : null;
            row(1, (nv.names && nv.names[r]) || (x && x.name) || r, 'ref', '', 'ورقة من «' + (pp ? pp.name : sp.page) + '»', off, !onCap(r)); }); return; }
        var p = PAGE_OF[k]; if (p && !p.under) page(p, 0);
      });
    });
    /* خارج السقف بحكم طبيعتها */
    row(0, 'خارج السقف — لا تُمنح', 'grp');
    row(0, 'شاشة تسجيل الدخول', 'page', '', 'تسجيل الدخول · تأمين الحساب (أول دخول) · تعذّر الدخول؟');
    row(0, 'الملف الشخصي', 'page', '#/profile', 'من الصورة الرمزية أسفل القائمة');
    ['الإدارة — البيانات الوظيفية','بياناتي','الأمان — بيانات الدخول والجلسات'].forEach(function(n){ row(1, n, 'win'); });
    row(1, 'يومك / أسبوعك · رصد الميدان', 'tab', '', 'لوحة الرصد تمنحها ورقة «رصد الميدان» في المتابعة اليومية');
    row(0, 'مركز إدارة رشاد', 'sup', '#/sysadmin', 'صفحة الإعدادات في نمط «المنصة»');
    [['overview','نظرة عامة','srv'],['sec','الأمن','srv'],['users','مراقبة الحسابات','srv'],['perms','خريطة الصلاحيات','srv'],['plat','المنصة','tab'],['depts','الإدارات','tab'],['backup','النسخة الاحتياطية','tab'],['histimp','استيراد البيانات التاريخية','tab']]
      .forEach(function(t){ row(1, t[1], t[2], '#/sysadmin/' + t[0], t[0] === 'plat' ? 'هوية المنصة · الدخول · الجوال · القوائم · الطباعة · الوحدات · التهيئة · التنبيهات · حول المنصة' : (t[0] === 'depts' ? 'المستخدمون · سقف الصفحات' : '')); });
    return rows;
  }
  /* → للأجزاء الأخرى */
  I.navOrder = navOrder; I.orderRows = orderRows; I.siteMap = siteMap;
})();
