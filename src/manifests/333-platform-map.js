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
    /* V7 P4 · G11: الاحتياطُ ومجموعتا «مراجع» و«الإدارة» من البيان — صفحةُ قمةٍ بلا وحدة (module) مرجعٌ عامّ، وما تفعيلُه always إدارة */
    var keys = (KIVO.BassamPlat && KIVO.BassamPlat.NAVKEYS) || KIVO.KIVO_MANIFEST.clone('navOrder');
    var top = PAGE_REG.filter(function(p){ return !p.under; });
    var mgmt = top.filter(function(p){ return p.activation === 'always'; }).map(function(p){ return p.key; });
    var gen = top.filter(function(p){ return !p.module && mgmt.indexOf(p.key) === -1 && keys.indexOf(p.key) === -1; }).map(function(p){ return p.key; });
    var order = (((P && P.side && P.side.order) || [])).filter(function(k){ return keys.indexOf(k) >= 0; });
    keys.forEach(function(k, i){ if (order.indexOf(k) >= 0) return; var prev = i > 0 ? order.indexOf(keys[i - 1]) : -1; order.splice(prev + 1, 0, k); });
    /* صفحة جديدة في السجل لم تدخل NAVKEYS بعد: تلحق بمجموعة العمل لا تضيع */
    var known = order.concat(gen, mgmt);
    PAGE_REG.forEach(function(p){ if (!p.under && known.indexOf(p.key) === -1) order.push(p.key); });
    var hidden = ((P && P.side && P.side.hidden) || []).concat((P && P.mods && P.mods.off) || []);
    return { groups: [ { key:'work', name:'عمل الإدارة', keys:order }, { key:'refs', name:'مراجع', keys:gen }, { key:'mgmt', name:'الإدارة', keys:mgmt } ], hidden: hidden };
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
     ثم ما هو خارج السقف بحكم طبيعته (الدخول · الملف الشخصي · مدير النظام).
     V7 P4 (G9/G10/G12): o.center = تبويباتُ «مركز إدارة رشاد» من قائمتها الواحدة في وحدة الإدارة (لا أسماءَ حرفية هنا) ·
     o.struct = بنيةُ شجرة الصلاحيات (t24Struct) ومنها أقسامُ العدسات والمنصة والمراجع · شارةُ السقف تسمّي الإدارةَ التي حُسبت لها. */
  var TAB_ADDR = KIVO.KIVO_MANIFEST.clone('tabAddr');   /* الصفحات التي لتبويباتها عناوين #/page/tab */
  function siteMap(o){
    o = o || {};
    var NO = navOrder(), rows = [], GRP = {}, GRPO = {};
    var capOf = ''; try { var cd = I.curDept(), dl = KIVO.BassamDepts.list().filter(function(x){ return x.id === cd; })[0]; capOf = dl ? dl.name : ''; } catch (e) {}
    var capTxt = capOf ? 'خارج سقف «' + capOf + '»' : 'خارج سقف الإدارة النشطة';
    NAV_REG.forEach(function(g){ (g.refs || []).forEach(function(k){ GRP[k] = g.key; GRPO[k] = g; }); });
    var B = { box:['حاوية','#8A6F35','rgba(185,151,81,0.1)','rgba(185,151,81,0.35)'], page:['صفحة','#4A5C68','#F4F5F7','#E1E1E1'], tab:['تبويب','#0e7490','rgba(14,116,144,0.08)','rgba(14,116,144,0.3)'],
              off:['خارج الصفحة','#b45309','rgba(180,83,9,0.07)','rgba(180,83,9,0.25)'], ref:['ورقة مرجعية','#0e7490','rgba(14,116,144,0.08)','rgba(14,116,144,0.3)'], win:['نافذة','#64748b','transparent','#CBD5E1'],
              srv:['خادم فقط','#64748b','transparent','#CBD5E1'],
              sup:['مسؤول المنصة','#b91c1c','rgba(185,28,28,0.07)','rgba(185,28,28,0.25)'], lens:['عدسة','#0e7490','rgba(14,116,144,0.08)','rgba(14,116,144,0.3)'],
              plat:['منصة','#64748b','transparent','#CBD5E1'], rdat:['مرجع','#6d28d9','rgba(109,40,217,0.06)','rgba(109,40,217,0.25)'], grp:['','','',''] };
    function row(depth, name, kind, addr, hint, platOff, capOff){
      var b = B[kind] || B.page, isG = kind === 'grp';
      rows.push({ name:name, badge:b[0], kind:kind, addr:addr || '', hint:hint || '', isGroup:isG, capOffTxt: capOff ? capTxt : '',
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
            row(1, (nv.names && nv.names[r]) || (x && x.name) || r, 'ref', '', (sp.sub ? 'ورقة من «' : 'لوحةُ صفحة «') + (pp ? pp.name : sp.page) + '»', off, !onCap(r)); }); return; }
        var p = PAGE_OF[k]; if (p && !p.under) page(p, 0);
      });
    });
    /* العدسات · المنصة · المراجع — من بنّاء شجرة الصلاحيات نفسِه (المالكون وأسماؤهم من السجلّ، ومضيفو العدسة من ملفّها) */
    var S = o.struct || [], cont = function(kind){ return S.filter(function(c){ return c.kind === kind; })[0]; };
    var nm = function(id){ var out = id; S.forEach(function(c){ if (c.id === id) out = c.label; (c.leaves || []).forEach(function(l){ if (l.owner === id) out = l.label; }); }); return out; };
    var nk = function(l){ return (l.keys || []).length; };
    var LZ = cont('plugins'), PF = cont('platform'), RF = cont('reference');
    if (LZ && LZ.leaves.length) { row(0, LZ.label + ' — إضافاتٌ على مضيفيها، لا صفحةَ لها', 'grp');
      LZ.leaves.forEach(function(l){ row(0, l.label, 'lens', l.route, 'على ' + (l.hosts || []).map(function(h){ return '«' + nm(h) + '»'; }).join(' و'), false, !onCap(l.lens)); }); }
    /* خارج السقف بحكم طبيعتها */
    row(0, 'خارج السقف — لا تُمنح', 'grp');
    row(0, 'شاشة تسجيل الدخول', 'page', '', 'تسجيل الدخول · تأمين الحساب (أول دخول) · تعذّر الدخول؟');
    /* نوافذُ «ملفي» وألواحُه: لا مصدرَ يعلنها (pages.json والسجلُّ يعرفان الصفحةَ مالكاً بلا أجزاء؛ والنوافذُ في قالب الصفحة وحده) —
       فتبقى هنا حرفيةً كما كانت قبل V7 P4، تحت صفّ المالك «profile» المشتقّ من الشجرة */
    var PF_SUB = [['الإدارة — البيانات الوظيفية','win'],['بياناتي','win'],['الأمان — بيانات الدخول والجلسات','win'],
                  ['يومك / أسبوعك · رصد الميدان','tab','لوحة الرصد تمنحها ورقة «رصد الميدان» في المتابعة اليومية']];
    if (PF) PF.leaves.forEach(function(l){ var self = (l.keys || []).length && (l.keys || []).every(function(k){ var e = KIVO.KIVO_REGISTRY && KIVO.KIVO_REGISTRY.byKey[k]; return e && e.grant === 'self'; });
      row(0, l.label, 'plat', l.owner === 'profile' ? '#/profile' : '', nk(l) ? (self ? 'ذاتيّ لكل مستخدم' : 'بالدور') + ' · ' + KIVO.BassamCount(nk(l), 'مفتاح') : 'بلا مفاتيح');
      if (l.owner === 'profile') PF_SUB.forEach(function(x){ row(1, x[0], x[1], '', x[2] || ''); }); });
    if (RF) RF.leaves.forEach(function(l){ row(0, l.label, 'rdat', '', 'مرجعٌ مستقلّ يُدار في «' + nm(l.managedIn) + '»'); });
    row(0, 'مركز إدارة رشاد', 'sup', '#/sysadmin', 'لمسؤول المنصة وحده');
    /* t.srv = الحقلُ الرابع في قائمة تبويبات المركز (CON_TABS): تبويبٌ يعمل مع الخادم وحده ⇒ شارةُ «خادم فقط» */
    (o.center || []).forEach(function(t){ row(1, t.name, t.srv ? 'srv' : 'tab', t.addr, t.hint || ''); });
    return rows;
  }
  /* → للأجزاء الأخرى */
  I.navOrder = navOrder; I.orderRows = orderRows; I.siteMap = siteMap;
})();
