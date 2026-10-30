
/* ═══ سجلُّ الأنشطة والتغييرات — محرّكُ الأحداث في المتصفح (Candidate 205 / R169) ═══
   ما هذا؟ طبقةُ التخزين تحفظ مفاتيحَ JSON كاملة، والخادمُ يوثّق فرقَ المواضع تقنيّاً (audit). أمّا هذا المحرّك فيحوّل
   الفرقَ بين القيمة الثابتة (آخر ما أقرّه الخادم) والقيمة المُرسَلة إلى أحداثٍ تشغيليّة ذات معنى على الكيانات:
   أُنشئ مصلًّى، عُدِّل شكله، تغيّرت حالته، أُعيد توزيعه، اعتُمد، حُذف… — بمعرّفٍ ثابتٍ للكيان (eid/sid/id) يبقى بعد حذفه.
   · الأحداثُ تُحسب عند الإرسال (لا عند كل ضغطة)، وتُرسل مع /api/save نفسِه، وcid حتميٌّ فلا تكرار عند إعادة الإرسال.
   · الفاعلُ والوقتُ لا يُرسلان: الخادمُ يضعهما من الجلسة. الحقولُ التقنيّة (القراءات، ذاكرة الحالة الميدانيّة، الرسم) لا تُدوَّن.
   · المعرّفاتُ الثابتة: legacyId حتميٌّ من حقولٍ مستقرّة (تُحسب متطابقةً في كل متصفح لكيانٍ قديم)، وnewId عشوائيٌّ للجديد. */
(function () {
  var W = window;
  function fnv(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function hash(str) { str = String(str); var a = fnv(str), b = fnv('\u0001' + str.length + '\u0002' + str); return a.toString(36) + b.toString(36); }
  function newId(p) { return (p || 'e') + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36); }
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function deq(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (!deq(a[i], b[i])) return false; return true; }
    var ka = Object.keys(a), kb = Object.keys(b); if (ka.length !== kb.length) return false;
    for (var j = 0; j < ka.length; j++) if (!Object.prototype.hasOwnProperty.call(b, ka[j]) || !deq(a[ka[j]], b[ka[j]])) return false;
    return true;
  }
  var MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  function mLabel(key) { var m = /^(\d+)-(\d+)$/.exec(String(key || '')); return m ? (MONTHS[+m[2] - 1] || m[2]) + ' ' + m[1] : String(key || ''); }
  function dLabel(key) { var m = /^(\d+)-(\d+)-(\d+)$/.exec(String(key || '')); return m ? 'يوم ' + m[3] + ' ' + (MONTHS[+m[2] - 1] || m[2]) + ' ' + m[1] : String(key || ''); }
  function unscope(k) { var m = /^bsdept:([^:]+):(.+)$/.exec(String(k || '')); return m ? m[2] : String(k || ''); }
  function deptOf(k) { var m = /^bsdept:([^:]+):/.exec(String(k || '')); return m ? m[1] : ''; }

  /* ── المعرّفاتُ الثابتة ── */
  var STABLE = {
    zone: ['code', 'ser', 'name', 'cat'], gate: ['num', 'label', 'x', 'y'], mark: ['label', 'kind', 'x', 'y'],
    path: ['id', 'name', 'label'], sector: ['id', 'code', 'name'], site: ['name', 'num', 'iid']
  };
  function ptsSig(e) {
    if (!e) return '';
    if (typeof e.d === 'string') return e.d.slice(0, 40);
    if (Array.isArray(e.pts) && e.pts.length) { var p = e.pts[0] || {}; return e.pts.length + ':' + (p.x == null ? '' : Math.round(+p.x)) + ',' + (p.y == null ? '' : Math.round(+p.y)); }
    return '';
  }
  function legacyId(et, e) {
    if (!isObj(e)) return '';
    var f = STABLE[et] || ['name'], parts = [];
    for (var i = 0; i < f.length; i++) parts.push(e[f[i]] == null ? '' : String(e[f[i]]));
    if (et === 'zone' || et === 'path' || et === 'sector') parts.push(ptsSig(e));
    return 'L' + hash(et + '|' + parts.join('|'));
  }
  /* معرّفُ المهمة القديمة: من طابع إنشائها والمكلَّف — لا من عنوانها (العنوانُ يُعدَّل) */
  function taskId(t) { return Array.isArray(t) ? 'T' + hash(String(t[13] || '') + '|' + String(t[14] || '') + '|' + String(t[8] || '') + '|' + (Array.isArray(t[7]) ? t[7].join(',') : '')) : ''; }
  /* ختمُ قائمةٍ من الكيانات: الموجودُ يبقى، والناقصُ يأخذ معرّفاً حتميّاً (قديم) أو عشوائيّاً (جديد) — مع فضّ التصادم */
  function stampList(arr, et, field, fresh) {
    var n = 0; if (!Array.isArray(arr)) return 0;
    var seen = {};
    for (var i = 0; i < arr.length; i++) { var e = arr[i]; if (isObj(e) && e[field]) seen[String(e[field])] = 1; }
    for (var j = 0; j < arr.length; j++) {
      var x = arr[j]; if (!isObj(x) || x[field]) continue;
      var id = fresh ? newId(et.charAt(0) + '_') : legacyId(et, x), base = id, c = 1;
      while (seen[id]) id = base + '_' + (c++);
      x[field] = id; seen[id] = 1; n++;
    }
    return n;
  }
  var SITE_LISTS = [['zones', 'zone', 'eid'], ['gates', 'gate', 'eid'], ['marks', 'mark', 'eid'], ['paths', 'path', 'id'], ['sectors', 'sector', 'id']];
  function stampSite(f, fresh) { var n = 0; if (!isObj(f)) return 0; for (var i = 0; i < SITE_LISTS.length; i++) n += stampList(f[SITE_LISTS[i][0]], SITE_LISTS[i][1], SITE_LISTS[i][2], fresh); return n; }
  /* خطةُ التشغيل الميداني: المواقع (sid) وكيانات كلِّ شهرٍ وكيانات المواقع الحيّة */
  function stampPlan(p, fresh) {
    var n = 0; if (!isObj(p)) return 0;
    n += stampList(p.floors, 'site', 'sid', fresh);
    (p.floors || []).forEach(function (f) { n += stampSite(f, fresh); });
    var M = p.months || p.planMonths;
    if (isObj(M)) Object.keys(M).forEach(function (mk) { var m = M[mk]; var d = m ? (Array.isArray(m) ? m : m.d) : null; if (Array.isArray(d)) d.forEach(function (f) { n += stampSite(f, fresh); }); });
    [['zones', 'zone', 'eid'], ['gates', 'gate', 'eid'], ['marks', 'mark', 'eid'], ['paths', 'path', 'id']].forEach(function (L) { n += stampList(p[L[0]], L[1], L[2], fresh); });
    return n;
  }
  function stampRounds(R, fresh) {
    var n = 0; if (!isObj(R)) return 0;
    Object.keys(R).forEach(function (rk) { var r = R[rk]; if (!r || !Array.isArray(r.d)) return; r.d.forEach(function (f) { n += stampSite(f, fresh); }); if (r.shAp && isObj(r.shAp)) Object.keys(r.shAp).forEach(function (s) { var sn = r.shAp[s]; if (sn && Array.isArray(sn.snap)) sn.snap.forEach(function (f) { n += stampSite(f, fresh); }); }); });
    return n;
  }
  function stampTasks(T) { var n = 0; if (!isObj(T)) return 0; Object.keys(T).forEach(function (dk) { var L = T[dk]; if (!Array.isArray(L)) return; L.forEach(function (t) { if (Array.isArray(t) && !t[22]) { t[22] = taskId(t); n++; } }); }); return n; }

  /* ── الحقول ── */
  var GEO = { zone: ['d', 'cx', 'cy', 'hs', 'rot', 'pts', 'r'], gate: ['x', 'y'], mark: ['x', 'y'], path: ['pts'], sector: ['pts'] };
  var STAT = { zone: ['off'], gate: ['closed'], mark: ['off'], site: [], path: ['active'], sector: [] };   /* المسار: active=false يعني معطَّل */
  /* ما لا يُسجَّل: القراءاتُ والسجلّاتُ المحلّية والمعرّفاتُ والحقولُ المشتقّة، وأعلامُ العرض التجميليّة (التسميات والألوان وسماكة الخطوط والشارات) */
  /* R190: unp — وسمُ «بلا موضع» للعنصر المستورَد حتى يُحرَّك — حالةُ عرضٍ لا حقلٌ يُعدَّل */
  /* KIVO_238 · IH‑02: uid هويةٌ ثابتة لا تتغيّر — تُستثنى من اللقطات والفروق كـ eid كي لا تستهلك خانةً من الـ14 (لقطةُ الحذف تحمل الاسمَ كما كانت) */
  var SKIP = { zone: ['count', 'pc', 'fLog', 'fst', 'fAt', 'fBy', 'cAt', 'cAtMs', 'cBy', 'cWhy', 'flow', 'fdBy', 'eid', 'uid', 'rawA', 'cap', 'capAt', 'hideLabel', 'lang', 'lsz', 'unp'],
               gate: ['fLog', 'fst', 'fAt', 'fBy', 'cAt', 'cAtMs', 'cBy', 'cWhy', 'flow', 'eid', 'uid', 'needS', 'hideLabel', 'unp'],
               mark: ['fLog', 'fst', 'fAt', 'fBy', 'cAt', 'cAtMs', 'cBy', 'cWhy', 'eid', 'uid', 'hideLabel', 'unp'], path: ['id', 'uid', 'hideLabel', 'line', 'w', 'color'], sector: ['id', 'showLbl', 'color'],
               site: ['zones', 'gates', 'marks', 'paths', 'sectors', 'img', 'imgW', 'imgH', 'mpu', 'sid', 'showCodes', 'create', 'approved', 'chip', 'chipTone', 'hideSectors'],
               employee: ['eid', 'account'], task: [], seized: ['items'], irshad: [], award: [], staffing: [], dreport: ['roster'] };
  var NAMEF = { zone: ['code', 'name'], gate: ['num', 'label'], mark: ['label'], path: ['name', 'label', 'id'], sector: ['code', 'name'], site: ['name'], employee: ['name'], seized: ['no', 'loc'], irshad: ['name', 'loc'], award: ['declName', 'ekey'] };
  function nameOf(et, e) {
    if (!isObj(e)) return '';
    if (et === 'gate') return (e.num != null && e.num !== '' ? '#' + e.num + ' ' : '') + (e.label || e.name || 'باب');
    if (et === 'zone') return (e.code ? e.code + ' — ' : '') + (e.name || 'مصلى');
    if (et === 'sector') return (e.code ? e.code + ' — ' : '') + (e.name || 'نطاق');
    if (et === 'seized') return (e.no ? 'محضر ' + e.no : 'محضر') + (e.loc ? ' — ' + e.loc : '');
    if (et === 'irshad') return (e.name || 'تقرير') + (e.loc ? ' — ' + e.loc : '');
    var f = NAMEF[et] || ['name', 'label'];
    for (var i = 0; i < f.length; i++) if (e[f[i]] != null && e[f[i]] !== '') return String(e[f[i]]);
    return '';
  }
  function bbox(e) {
    var xs = [], ys = [];
    if (e && typeof e.d === 'string') { var re = /(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, m; while ((m = re.exec(e.d))) { xs.push(+m[1]); ys.push(+m[2]); } }
    else if (e && Array.isArray(e.pts)) e.pts.forEach(function (p) { if (p && p.x != null) { xs.push(+p.x); ys.push(+p.y); } });
    else if (e && e.x != null) return { x: Math.round(+e.x), y: Math.round(+e.y) };
    if (!xs.length) return null;
    var r = function (v) { return Math.round(v); };
    return { x: r(Math.min.apply(null, xs)), y: r(Math.min.apply(null, ys)), w: r(Math.max.apply(null, xs) - Math.min.apply(null, xs)), h: r(Math.max.apply(null, ys) - Math.min.apply(null, ys)), n: xs.length };
  }
  function clipV(v) {
    if (v == null) return v;
    if (typeof v === 'string') return v.length > 90 ? v.slice(0, 90) + '…' : v;
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    if (Array.isArray(v)) { if (v.length > 12) return { n: v.length, first: v.slice(0, 6).map(clipV) }; return v.map(clipV); }
    if (isObj(v)) { var o = {}, ks = Object.keys(v).slice(0, 10); ks.forEach(function (q) { o[q] = clipV(v[q]); }); if (Object.keys(v).length > 10) o['…'] = Object.keys(v).length - 10; return o; }
    return String(v);
  }
  function snap(et, e, isTask) {
    if (isTask) return { title: e[0], desc: clipV(e[1]), prio: e[2], status: e[3], to: e[8] || (Array.isArray(e[7]) ? e[7].join('،') : ''), by: e[9], dur: e[10], from: e[15], until: e[16], wt: e[19] };
    if (!isObj(e)) return null;
    var out = {}, skip = SKIP[et] || [], geo = GEO[et] || [], n = 0;
    Object.keys(e).forEach(function (q) {
      if (skip.indexOf(q) !== -1 || geo.indexOf(q) !== -1 || n >= 14) return;
      if (q === 'emp' && Array.isArray(e[q])) { out.emp = e[q].length; return; }
      out[q] = clipV(e[q]); n++;
    });
    if (geo.length) { var b = bbox(e); if (b) out.geo = b; }
    return out;
  }
  function fieldDiff(et, a, b) {
    var skip = SKIP[et] || [], geo = GEO[et] || [], stat = STAT[et] || [], ch = {}, geoCh = false, statCh = {}, empCh = null, n = 0;
    var ks = {}; Object.keys(a || {}).concat(Object.keys(b || {})).forEach(function (q) { ks[q] = 1; });
    Object.keys(ks).forEach(function (q) {
      if (skip.indexOf(q) !== -1) return;
      var x = a ? a[q] : undefined, y = b ? b[q] : undefined;
      /* غيابُ الحقل = فراغُه = «لا» = قائمةٌ فارغة: لا حدثَ لتطبيعٍ صامت (إلا active حيث false وحدَها تعني التعطيل) */
      var nz = function (v) { return (v == null || v === '' || v === false || (Array.isArray(v) && !v.length)) ? null : v; };
      var nx = q === 'active' ? (x === false ? false : null) : nz(x), ny = q === 'active' ? (y === false ? false : null) : nz(y);
      if (deq(nx, ny)) return;
      if (x == null || x === '') x = null; if (y == null || y === '') y = null;
      if (geo.indexOf(q) !== -1) { geoCh = true; return; }
      if (stat.indexOf(q) !== -1) { statCh[q] = [x, y]; return; }
      if (q === 'emp') { empCh = [Array.isArray(x) ? x.length : 0, Array.isArray(y) ? y.length : 0, Array.isArray(y) ? y.slice(0, 8) : []]; return; }
      if (n < 14) { ch[q] = [clipV(x), clipV(y)]; n++; }
    });
    return { ch: ch, nCh: n, geo: geoCh, stat: statCh, emp: empCh };
  }

  /* ── مخطّطاتُ المفاتيح: أين الكيانات داخل القيمة ── */
  function siteName(f, i) { return f && f.name ? String(f.name) : ('موقع ' + (i + 1)); }
  function entListsOf(f, ctx) {
    var out = [];
    SITE_LISTS.forEach(function (L) { (Array.isArray(f && f[L[0]]) ? f[L[0]] : []).forEach(function (e) { if (isObj(e)) out.push({ et: L[1], id: e[L[2]] || legacyId(L[1], e), e: e, ctx: ctx }); }); });
    return out;
  }
  function planEnts(p) {
    var out = [];
    if (!isObj(p)) return out;
    (p.floors || []).forEach(function (f, i) { if (isObj(f)) out.push({ et: 'site', id: f.sid || legacyId('site', f), e: f, ctx: {} }); });
    var M = p.months || p.planMonths || {};
    Object.keys(M).forEach(function (mk) {
      var m = M[mk], d = m ? (Array.isArray(m) ? m : m.d) : null;
      if (!Array.isArray(d)) return;
      var ap = d.filter(function (f) { return f && f.approved; }).length;
      out.push({ et: 'plan', id: mk, e: { sites: d.length, approved: d.length > 0 && ap === d.length, mo: !!(m && m.mo), zones: d.reduce(function (s, f) { return s + ((f && f.zones) || []).length; }, 0), gates: d.reduce(function (s, f) { return s + ((f && f.gates) || []).length; }, 0) }, ctx: { plan: mk }, name: 'خطة ' + mLabel(mk) });
      d.forEach(function (f, i) {
        if (!isObj(f)) return;
        var sn = siteName(f, i);
        out.push({ et: 'plan_site', id: mk + '|' + (f.sid || legacyId('site', f)), e: { approved: !!f.approved }, ctx: { plan: mk, site: sn }, name: 'خطة ' + mLabel(mk) + ' — ' + sn });
        entListsOf(f, { plan: mk, site: sn }).forEach(function (x) { out.push(x); });
      });
    });
    return out;
  }
  /* أسماءُ مواقع الجولة: الجولةُ مصفوفةٌ بترتيب مواقع الخطة بلا أسماء — تُقرأ الأسماءُ من خطة الإدارة (بذاكرةٍ على نصّ الخطة) */
  var snCache = { s: null, names: [] };
  function planSiteNames(dept) {
    try {
      var plan = KIVO.__BS_SRV.operations.reference('bsdept:' + dept + ':bassam_plan_v1'); if (!plan) return [];
      var sv = JSON.stringify(plan);
      if (snCache.s !== sv) { var pv = JSON.parse(sv); snCache = { s: sv, names: (pv && Array.isArray(pv.floors) ? pv.floors : []).map(function (f, i) { return siteName(f, i); }) }; }
      return snCache.names;
    } catch (e) { return []; }
  }
  function roundsEnts(R, dept) {
    var out = [], names = dept ? planSiteNames(dept) : [];
    if (!isObj(R)) return out;
    Object.keys(R).forEach(function (rk) {
      var r = R[rk]; if (!r || typeof r !== 'object') return;
      if (/^m:/.test(rk)) {
        var mk = rk.slice(2);
        out.push({ et: 'round_month', id: mk, e: { approved: !!r.ap, auto: !!r.auto, mo: !!r.mo }, ctx: { plan: mk }, name: 'جولات ' + mLabel(mk) });
        Object.keys(r.dopen || {}).forEach(function (d) { out.push({ et: 'round_lock', id: mk + '-' + d, e: { open: true }, ctx: { day: mk + '-' + d }, name: dLabel(mk + '-' + d) }); });
        Object.keys(r.dshut || {}).forEach(function (d) { out.push({ et: 'round_lock', id: mk + '-' + d, e: { shut: true }, ctx: { day: mk + '-' + d }, name: dLabel(mk + '-' + d) }); });
        return;
      }
      if (!/^\d+-\d+-\d+$/.test(rk) || !Array.isArray(r.d)) return;
      out.push({ et: 'round', id: rk, e: { approved: !!r.ap, sites: r.d.length, from: r.from || '', synced: !!r.synced }, ctx: { day: rk }, name: 'جولة ' + dLabel(rk) });
      r.d.forEach(function (f, i) {
        if (!isObj(f)) return;
        var sn = f && f.name ? String(f.name) : (names[i] || siteName(f, i));
        out.push({ et: 'round_site', id: rk + '|' + i, e: { approved: !!f.ap }, ctx: { day: rk, site: sn }, name: 'جولة ' + dLabel(rk) + ' — ' + sn });
        entListsOf(f, { day: rk, site: sn }).forEach(function (x) { out.push(x); });
      });
      if (isObj(r.shAp)) Object.keys(r.shAp).forEach(function (s) { var v = r.shAp[s]; out.push({ et: 'round_shift', id: rk + '|' + s, e: { approved: !!(v && v.ap), at: v && v.at || '' }, ctx: { day: rk, shift: s }, name: 'جولة ' + dLabel(rk) + ' — ' + s }); });
    });
    return out;
  }
  function tasksEnts(T) {
    var out = [];
    if (!isObj(T)) return out;
    Object.keys(T).forEach(function (dk) { (Array.isArray(T[dk]) ? T[dk] : []).forEach(function (t) { if (Array.isArray(t)) out.push({ et: 'task', id: t[22] || taskId(t), e: t, ctx: { day: dk }, task: true, name: String(t[0] || 'مهمة') }); }); });
    return out;
  }
  function listEnts(arr, et) { var out = []; (Array.isArray(arr) ? arr : []).forEach(function (e) { if (isObj(e)) out.push({ et: et, id: e.id || e.eid || e.nid || e.name || legacyId(et, e), e: e, ctx: e.y && e.m && e.d ? { day: e.y + '-' + e.m + '-' + e.d } : {} }); }); return out; }
  var empNames = null, empNamesAt = 0;
  function empName(dept, key) {
    try {
      var now = Date.now();
      if (!empNames || now - empNamesAt > 3000) { empNames = {}; empNamesAt = now; var raw = W.localStorage.getItem((dept ? 'bsdept:' + dept + ':' : '') + 'bassam_employees_v1'); var L = raw ? JSON.parse(raw) : []; (Array.isArray(L) ? L : []).forEach(function (e) { if (!e) return; [e.eid, e.nid, e.name].forEach(function (t) { if (t) empNames[t] = e.name || t; }); }); }
      return empNames[key] || key;
    } catch (e) { return key; }
  }
  var SCHEMA = {
    bassam_plan_v1: function (v) { return planEnts(v); },
    bassam_rounds_v1: function (v, dept) { return roundsEnts(v, dept); },
    bassam_tasks_v1: function (v) { return tasksEnts(v); },
    bassam_employees_v1: function (v) { return listEnts(v, 'employee'); },
    bassam_seized_v1: function (v) { return listEnts(v && v.reports, 'seized'); },
    bassam_irshad_v1: function (v) { return listEnts(v && v.reports, 'irshad'); },
    bassam_award_v1: function (v) { return listEnts(v && v.recs, 'award'); },
    bassam_staffing_v3: function (v, dept) { var out = []; if (!isObj(v)) return out; Object.keys(v).forEach(function (mk) { var b = v[mk]; if (!isObj(b)) return; Object.keys(b).forEach(function (ek) { if (isObj(b[ek])) out.push({ et: 'staffing', id: ek, e: b[ek], ctx: { plan: mk }, name: empName(dept, ek) + ' — ' + mLabel(mk) }); }); }); return out; },
    bassam_dreport_v1: function (v) { var out = []; if (!isObj(v)) return out; Object.keys(v).forEach(function (dk) { var d = v[dk]; if (!isObj(d) || !isObj(d.shifts)) return; Object.keys(d.shifts).forEach(function (sn) { var s = d.shifts[sn]; if (!isObj(s)) return; out.push({ et: 'dreport', id: dk + '|' + sn, e: { pulled: !!s.pulled, roster: Array.isArray(s.roster) ? s.roster.length : 0, ap: !!s.ap, leaders: s.leaders || null }, ctx: { day: dk, shift: sn }, name: 'تقرير ' + dLabel(dk) + ' — ' + sn }); }); }); return out; }
  };
  var CAP_PER_KEY = 250;

  /* ── الأحداث: القيمةُ الثابتة → القيمةُ المُرسَلة ── */
  /* R185: سطرٌ مُعلَنٌ لكتابةٍ بعينها (القيمةُ نفسُها) — «استيراد البيانات التاريخية» يُسجَّل بنصّ الموقع القديم وتفاصيله
     بدلَ سطرِ «مجموعة البيانات» العامّ. يطابق القيمةَ المُرسَلة حرفاً، فلا يلتصق بكتابةٍ لاحقة. */
  var NOTES = {};
  function note(k, ev, v) { if (ev && ev.act) NOTES[k] = { ev: ev, v: v }; }
  function events(k, oldS, newS, baseRev, mode) {
    var name = unscope(k), sch = SCHEMA[name];
    var nt = NOTES[k];
    if (nt && nt.v === newS && oldS !== newS) return finish([{ k: k, etype: 'dataset', eid: name, ename: String(nt.ev.ename || name), act: String(nt.ev.act), ctx: {}, before: null, after: nt.ev.after == null ? null : nt.ev.after }], k, baseRev);
    if (!sch || oldS === newS) return [];
    var dept = deptOf(k), oldV = null, newV = null;
    try { oldV = oldS == null ? null : JSON.parse(oldS); } catch (e) { oldV = null; }
    try { newV = newS == null ? null : JSON.parse(newS); } catch (e) { return []; }
    var A = {}, B = {}, ao = [], bo = [];
    /* مفتاحُ المطابقة = النوع + النطاق (خطةُ الشهر أو يومُ الجولة) + المعرّف الثابت: المصلّى نفسُه يظهر في أشهرٍ وأيامٍ عدّة
       بمعرّفه نفسِه (النسخُ من شهرٍ سابق وبدءُ الجولة من الخطة)، فتغييرُه في يومٍ لا يحجبه وجودُه في يومٍ آخر */
    var qk = function (x) { var c = x.ctx || {}; return x.et + '|' + (c.day || c.plan || '') + '|' + x.id; };
    try { (oldV == null ? [] : sch(oldV, dept)).forEach(function (x) { var q = qk(x); if (!A[q]) { A[q] = x; ao.push(q); } }); } catch (e) {}
    try { (newV == null ? [] : sch(newV, dept)).forEach(function (x) { var q = qk(x); if (!B[q]) { B[q] = x; bo.push(q); } }); } catch (e) { return []; }
    var out = [];
    var push = function (x, act, before, after) {
      out.push({ k: k, etype: x.et, eid: String(x.id), ename: (x.name != null ? x.name : nameOf(x.et, x.e)) || '', act: act, ctx: x.ctx || {}, before: before == null ? null : before, after: after == null ? null : after });
    };
    if (mode) {
      var added = bo.filter(function (q) { return !A[q]; }).length, removed = ao.filter(function (q) { return !B[q]; }).length, changed = bo.filter(function (q) { return A[q] && !deq(A[q].e, B[q].e); }).length;
      out.push({ k: k, etype: 'dataset', eid: name, ename: (KIVO.BassamKeyLabels ? KIVO.BassamKeyLabels.label(k) : name), act: mode, ctx: {}, before: null, after: { added: added, removed: removed, changed: changed, total: bo.length } });
      return finish(out, k, baseRev);
    }
    ao.forEach(function (q) { if (!B[q]) { var x = A[q]; if (x.et === 'round_lock') { push(x, x.e.open ? 'locked' : 'unlocked', x.e, null); return; } push(x, 'deleted', x.task ? snap('task', x.e, true) : snap(x.et, x.e), null); } });
    bo.forEach(function (q) {
      var y = B[q], x = A[q];
      if (!x) { if (y.et === 'round_lock') { push(y, y.e.open ? 'unlocked' : 'locked', null, y.e); return; } if (y.et === 'round_site' || y.et === 'plan_site') return; push(y, 'created', null, y.task ? snap('task', y.e, true) : snap(y.et, y.e)); return; }
      if (deq(x.e, y.e)) return;
      var et = y.et;
      if (et === 'task') {
        var a = x.e, b = y.e;
        if (a[3] !== b[3]) push(y, b[3] === 'done' ? 'completed' : b[3] === 'declined' ? 'declined' : 'status_changed', { status: a[3] }, { status: b[3], why: b[20] && b[20].why ? clipV(b[20].why) : undefined });
        var asA = String(a[8] || '') + '|' + JSON.stringify(a[7] || []) + '|' + String(a[14] || ''), asB = String(b[8] || '') + '|' + JSON.stringify(b[7] || []) + '|' + String(b[14] || '');
        if (asA !== asB) push(y, 'reassigned', { to: a[8] || (a[7] || []).join('،') }, { to: b[8] || (b[7] || []).join('،') });
        var f = {}, nf = 0; [[0, 'title'], [1, 'desc'], [2, 'prio'], [10, 'dur'], [15, 'from'], [16, 'until'], [19, 'wt'], [21, 'note']].forEach(function (pr) { if (!deq(a[pr[0]], b[pr[0]])) { f[pr[1]] = [clipV(a[pr[0]]), clipV(b[pr[0]])]; nf++; } });
        if (nf) push(y, 'edited', null, { f: f });
        return;
      }
      if (et === 'plan' || et === 'round' || et === 'round_month' || et === 'plan_site' || et === 'round_site' || et === 'round_shift' || et === 'round_lock' || et === 'dreport') {
        var a1 = x.e, b1 = y.e;
        if (a1.approved !== b1.approved && b1.approved != null) push(y, b1.approved ? 'approved' : 'approval_revoked', { approved: !!a1.approved }, { approved: !!b1.approved });
        if (et === 'round_lock' || et === 'plan' || et === 'round_month') { if (!!a1.mo !== !!b1.mo) push(y, b1.mo ? 'unlocked' : 'locked', { open: !!a1.mo }, { open: !!b1.mo }); if (!!a1.shut !== !!b1.shut) push(y, b1.shut ? 'locked' : 'unlocked', { shut: !!a1.shut }, { shut: !!b1.shut }); if (!!a1.open !== !!b1.open) push(y, b1.open ? 'unlocked' : 'locked', { open: !!a1.open }, { open: !!b1.open }); }
        if (et === 'dreport') { if (!a1.pulled && b1.pulled) push(y, 'created', null, b1); else if (a1.roster !== b1.roster || !deq(a1.leaders, b1.leaders)) push(y, 'edited', a1, b1); }
        if (et === 'round' && a1.synced !== b1.synced && b1.synced) push(y, 'synced', null, { from: 'الخطة' });
        return;
      }
      if (et === 'staffing') { var s1 = x.e, s2 = y.e; if (s1.shift !== s2.shift) push(y, 'reassigned', { shift: s1.shift || '' }, { shift: s2.shift || '' }); var fd0 = fieldDiff('staffing', { rest: s1.rest, muk: s1.muk, cs: s1.cs }, { rest: s2.rest, muk: s2.muk, cs: s2.cs }); if (fd0.nCh) push(y, 'edited', null, { f: fd0.ch }); return; }
      var fd = fieldDiff(et, x.e, y.e);
      if (fd.geo) { var bx = bbox(x.e), by = bbox(y.e); var moved = bx && by && bx.n != null && bx.n === by.n && bx.w === by.w && bx.h === by.h; push(y, moved || (bx && bx.n == null) ? 'moved' : 'geometry_changed', bx, by); }
      Object.keys(fd.stat).forEach(function (q) { var pr = fd.stat[q]; var on = q === 'active' ? pr[1] !== false : !pr[1]; push(y, on ? 'enabled' : 'disabled', { field: q, value: q === 'active' ? pr[0] !== false : !!pr[0] }, { field: q, value: q === 'active' ? pr[1] !== false : !!pr[1], why: y.e.cWhy != null ? clipV(y.e.cWhy) : undefined }); });
      if (fd.emp) push(y, 'reassigned', { emp: fd.emp[0] }, { emp: fd.emp[1], list: fd.emp[2].map(function (t) { return empName(dept, t); }) });
      if (fd.nCh) push(y, 'edited', null, { f: fd.ch });
    });
    return finish(out, k, baseRev);
  }
  function finish(out, k, baseRev) {
    if (out.length > CAP_PER_KEY) {
      var kept = out.slice(0, CAP_PER_KEY), n = out.length - CAP_PER_KEY;
      kept.push({ k: k, etype: 'dataset', eid: unscope(k), ename: (KIVO.BassamKeyLabels ? KIVO.BassamKeyLabels.label(k) : unscope(k)), act: 'bulk', ctx: {}, before: null, after: { more: n } });
      out = kept;
    }
    for (var i = 0; i < out.length; i++) {
      var e = out[i];
      e.cid = 'c' + hash(k + '|' + (baseRev || 0) + '|' + e.etype + '|' + e.eid + '|' + e.act + '|' + JSON.stringify(e.ctx || {}) + '|' + JSON.stringify(e.before) + '|' + JSON.stringify(e.after)) + i.toString(36);
    }
    return out;
  }

  /* ── العرض: نصٌّ عربيّ للحدث، وصفوفٌ للوحة ── */
  var ACT_AR = { created: 'أُنشئ', edited: 'عُدِّل', deleted: 'حُذف', status_changed: 'تغيّرت حالته', enabled: 'أُعيد تفعيله', disabled: 'عُطِّل', geometry_changed: 'عُدِّل شكله', moved: 'نُقل موضعه', reassigned: 'أُعيد توزيعه', approved: 'اعتُمد', approval_revoked: 'أُلغي اعتماده', locked: 'أُقفل', unlocked: 'فُتح', completed: 'أُنجز', declined: 'اعتُذر عنه', synced: 'حُدِّث من الخطة', restore: 'استُعيدت نسخة', import: 'استُورد', wipe: 'مُسحت بيانات', reset: 'تهيئة المنصة', bulk: 'تغييرات كثيرة' };
  var ET_AR = { zone: 'المصلى', gate: 'الباب', mark: 'المعلم', path: 'المسار', sector: 'النطاق', site: 'الموقع', plan: 'خطة الشهر', plan_site: 'خطة الموقع', round: 'جولة اليوم', round_site: 'موقع الجولة', round_month: 'جولات الشهر', round_shift: 'جولة الوردية', round_lock: 'قفل اليوم', task: 'المهمة', employee: 'الموظف', staffing: 'التسكين الشهري', dreport: 'التقرير اليومي', seized: 'محضر المضبوطات', irshad: 'تقرير الاسترشاد', award: 'ترشيح الجائزة', dataset: 'مجموعة البيانات', system: 'المنصة' };
  var ET_FILTER = [['zone', 'المصليات'], ['gate', 'الأبواب'], ['mark', 'المعالم'], ['path', 'المسارات'], ['sector', 'النطاقات'], ['site', 'المواقع'], ['plan', 'خطط الشهور'], ['round', 'الجولات'], ['task', 'المهام'], ['employee', 'الموظفون'], ['staffing', 'التسكين الشهري'], ['dreport', 'التقرير اليومي'], ['seized', 'المضبوطات'], ['irshad', 'الاسترشاد'], ['award', 'الجائزة'], ['dataset', 'مجموعات البيانات']];
  var ACT_FILTER = [['created', 'إنشاء'], ['edited', 'تعديل'], ['geometry_changed', 'تعديل الشكل'], ['moved', 'نقل'], ['enabled', 'تفعيل'], ['disabled', 'تعطيل'], ['status_changed', 'تغيير حالة'], ['reassigned', 'إعادة توزيع'], ['approved', 'اعتماد'], ['approval_revoked', 'إلغاء اعتماد'], ['locked', 'قفل'], ['unlocked', 'فتح'], ['completed', 'إنجاز'], ['deleted', 'حذف'], ['restore', 'استعادة'], ['import', 'استيراد'], ['wipe', 'مسح بيانات']];
  var FIELD_AR = { name: 'الاسم', code: 'الرمز', ser: 'التسلسل', cat: 'الفئة', label: 'التسمية', num: 'الرقم', kind: 'النوع', loc: 'الموقع', gtype: 'نوع الباب', route: 'المسار', cls: 'التصنيف', pri: 'الأولوية', cats: 'الفئات', needN: 'الاحتياج', hideLabel: 'إخفاء التسمية', region: 'المنطقة', level: 'الدور', ztype: 'النوع', zcat: 'الفئة', yard: 'الساحة', off: 'معطَّل', closed: 'مغلق', active: 'مفعَّل', color: 'اللون', line: 'الخط', w: 'العرض', lead: 'المسؤول', note: 'ملاحظة', showLbl: 'إظهار التسمية', chip: 'الشارة', iid: 'الخريطة', phone: 'الجوال', email: 'البريد', type: 'النوع', work: 'نوع العمل', gender: 'الجنس', shift: 'الوردية', group: 'المجموعة', nid: 'الهوية', empno: 'الرقم الوظيفي', title: 'العنوان', desc: 'الوصف', prio: 'الأولوية', dur: 'المدة', from: 'من', until: 'إلى', wt: 'نوع العمل', rest: 'الراحة', muk: 'مكلَّف', cs: 'رمز النداء', status: 'الحالة', st: 'الحالة', ok: 'مقبول', score: 'الدرجة', items: 'الأصناف', langs: 'اللغات', bro: 'مطويات', pros: 'نشرات', pol: 'استطلاع', actor: 'المنفّذ', lsz: 'حجم الخط', lang: 'دوران الخط', hideSectors: 'إخفاء النطاقات' };
  function fieldAr(q) { return FIELD_AR[q] || q; }
  function ctxText(ctx) {
    var c = ctx; if (typeof c === 'string') { try { c = JSON.parse(c); } catch (e) { c = null; } }
    if (!isObj(c)) return '';
    var parts = [];
    if (c.plan) parts.push('خطة ' + mLabel(c.plan));
    if (c.day) parts.push(dLabel(c.day));
    if (c.shift) parts.push(c.shift);
    if (c.site) parts.push(c.site);
    return parts.join(' · ');
  }
  function describe(r) {
    var et = ET_AR[r.etype] || r.etype, act = ACT_AR[r.act] || r.act;
    var nm = r.ename ? ' «' + r.ename + '»' : '';
    if (r.etype === 'dataset' || r.etype === 'system') return act + ' — ' + (r.ename || et);
    return act + ' ' + et + nm;
  }
  function parseJ(s) { if (s == null || s === '') return null; if (typeof s !== 'string') return s; try { return JSON.parse(s); } catch (e) { return s; } }
  function valTxt(v) { if (v == null || v === '') return '—'; if (v === true) return 'نعم'; if (v === false) return 'لا'; if (Array.isArray(v)) return v.map(valTxt).join('، '); if (isObj(v)) return Object.keys(v).map(function (q) { return fieldAr(q) + ': ' + valTxt(v[q]); }).join(' · '); return String(v); }
  /* تفصيلُ الحدث: أسطرُ قبل/بعد مقروءة */
  function detailRows(r) {
    var b = parseJ(r.bef != null ? r.bef : r.before), a = parseJ(r.aft != null ? r.aft : r.after), rows = [];
    if (r.act === 'edited' && isObj(a) && isObj(a.f)) { Object.keys(a.f).forEach(function (q) { var pr = a.f[q]; rows.push({ f: fieldAr(q), from: valTxt(pr && pr[0]), to: valTxt(pr && pr[1]) }); }); return rows; }
    if ((r.act === 'geometry_changed' || r.act === 'moved') && (isObj(b) || isObj(a))) { var g = function (o) { return o ? (o.w != null ? 'مربّع الإحاطة ' + o.x + '،' + o.y + ' — ' + o.w + '×' + o.h + (o.n ? ' (' + KIVO.BassamCount(o.n, "نقطة") + ')' : '') : 'الموضع ' + o.x + '،' + o.y) : '—'; }; rows.push({ f: 'الشكل', from: g(b), to: g(a) }); return rows; }
    if ((r.act === 'enabled' || r.act === 'disabled') && isObj(a)) { rows.push({ f: fieldAr(a.field || 'status'), from: valTxt(b && b.value), to: valTxt(a.value) }); if (a.why) rows.push({ f: 'السبب', from: '', to: String(a.why) }); return rows; }
    if (r.act === 'reassigned' && isObj(a)) { rows.push({ f: 'التوزيع', from: valTxt(b && (b.emp != null ? KIVO.BassamCount(b.emp, "موظف") : b.to != null ? b.to : b.shift)), to: valTxt(a.emp != null ? KIVO.BassamCount(a.emp, "موظف") + (a.list && a.list.length ? ' (' + a.list.join('، ') + ')' : '') : a.to != null ? a.to : a.shift) }); return rows; }
    if (r.act === 'created' && isObj(a)) { Object.keys(a).slice(0, 14).forEach(function (q) { rows.push({ f: fieldAr(q), from: '', to: valTxt(a[q]) }); }); return rows; }
    if (r.act === 'deleted' && isObj(b)) { Object.keys(b).slice(0, 14).forEach(function (q) { rows.push({ f: fieldAr(q), from: valTxt(b[q]), to: '' }); }); return rows; }
    if (isObj(a) || isObj(b)) { var ks = {}; Object.keys(isObj(b) ? b : {}).concat(Object.keys(isObj(a) ? a : {})).forEach(function (q) { ks[q] = 1; }); Object.keys(ks).slice(0, 14).forEach(function (q) { rows.push({ f: fieldAr(q), from: valTxt(b && b[q]), to: valTxt(a && a[q]) }); }); }
    return rows;
  }
  function clock(ts) { try { var d = new Date(+ts); var h = d.getHours(), m = d.getMinutes(); return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + (h >= 12 ? ' م' : ' ص'); } catch (e) { return ''; } }
  function dateTxt(ts) { try { var d = new Date(+ts); var H = KIVO.BassamHijri && KIVO.BassamHijri.now ? KIVO.BassamHijri.now(d) : null; return (H ? H.d + ' ' + (MONTHS[H.m - 1] || H.m) + ' ' + H.y : d.toLocaleDateString('ar-SA')); } catch (e) { return ''; } }
  function rowVM(r) {
    return { id: r.id, ts: r.ts, t: clock(r.ts), date: dateTxt(r.ts), by: r.name || r.un || '—', act: describe(r), actKey: r.act, etype: r.etype, eid: r.eid, ename: r.ename || '', ctx: ctxText(r.ctx), deleted: r.act === 'deleted', details: detailRows(r), dev: r.dev === 'm' ? 'جوال' : r.dev === 'd' ? 'حاسوب' : '', city: r.city || '', dept: r.dept || '' };
  }
  /* جلبٌ عند الطلب (لا استطلاع): سجلُّ كيانٍ واحد أو استعلامٌ مرشَّح */
  function fetchAud(params) {
    var q = [];
    Object.keys(params || {}).forEach(function (k) { if (params[k] != null && params[k] !== '') q.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k]))); });
    return fetch('/api/aud?' + q.join('&')).then(function (r) { return r.ok ? r.json() : { ok: 0, err: 'HTTP ' + r.status }; }).then(function (j) { return { ok: !!(j && j.ok), rows: (j && j.rows) || [], next: (j && j.next) || 0, err: j && j.err || '' }; }).catch(function (e) { return { ok: false, rows: [], next: 0, err: String(e && e.message || e) }; });
  }
  function entityHistory(etype, eid, dept) { return fetchAud({ etype: etype, eid: eid, dept: dept || (KIVO.BassamDepts ? KIVO.BassamDepts.active() : ''), limit: 120 }); }
  function panelNodes(R, rows, opts) {
    opts = opts || {}; var h = R.createElement;
    var vm = (rows || []).map(rowVM);
    var kids = vm.map(function (v, i) {
      return h('div', { key: 'a' + (v.id || i), style: { display: 'flex', gap: 7, fontSize: opts.fs || 9, color: 'var(--text-secondary)', lineHeight: 1.85, borderTop: '1px solid var(--border-subtle)', padding: '3px 0', alignItems: 'flex-start' } },
        h('span', { style: { color: 'var(--text-faint)', minWidth: 74, fontFeatureSettings: "'tnum'", whiteSpace: 'nowrap' }, title: v.date }, v.date + ' ' + v.t),
        h('span', { style: { minWidth: 70, maxWidth: 110, color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, title: v.by }, v.by),
        h('span', { style: { flex: 1, minWidth: 0 } }, v.act + (v.ctx ? ' — ' + v.ctx : ''),
          v.deleted ? h('span', { style: { marginRight: 6, padding: '0 6px', borderRadius: 6, fontSize: 8.5, fontWeight: 700, background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' } }, 'محذوف') : null,
          v.details.length && opts.details !== false ? h('div', { style: { color: 'var(--text-muted)', fontSize: (opts.fs || 9) - 0.5 } }, v.details.slice(0, 6).map(function (d, j) { return h('div', { key: 'd' + j }, d.f + ': ' + (d.from ? d.from + ' → ' : '') + (d.to || '')); })) : null));
    });
    if (!vm.length) kids.push(h('div', { key: 'e', style: { fontSize: opts.fs || 9, color: 'var(--text-faint)' } }, opts.empty || 'لا أحداث مسجّلة لهذا الكيان بعد'));
    return h('div', { style: { margin: '2px 0 4px', padding: '7px 9px', borderRadius: 8, border: '1px dashed var(--border-default)', background: 'var(--bg-surface-2)' } },
      h('div', { style: { fontSize: (opts.fs || 9) - 0.5, fontWeight: 700, color: 'var(--brand-text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 } }, opts.title || 'سجل الحركة', opts.loading ? h('span', { style: { color: 'var(--text-faint)', fontWeight: 400 } }, '— جارٍ التحميل…') : null, opts.err ? h('span', { style: { color: 'var(--danger-text)', fontWeight: 400 } }, '— ' + opts.err) : null),
      kids);
  }

  KIVO.BassamAudit = { VER: 1, note: note, hash: hash, newId: newId, legacyId: legacyId, taskId: taskId, stampPlan: stampPlan, stampRounds: stampRounds, stampTasks: stampTasks, stampList: stampList, stampSite: stampSite,
    events: events, describe: describe, rowVM: rowVM, detailRows: detailRows, ctxText: ctxText, fetch: fetchAud, entityHistory: entityHistory, panelNodes: panelNodes,
    ACT_AR: ACT_AR, ET_AR: ET_AR, ET_FILTER: ET_FILTER, ACT_FILTER: ACT_FILTER, MONTHS: MONTHS, mLabel: mLabel, dLabel: dLabel, clock: clock, dateTxt: dateTxt, fieldAr: fieldAr, SCHEMA_KEYS: Object.keys(SCHEMA) };
})();

