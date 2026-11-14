var KIVO_GUARDS = (function (B, R) {
  'use strict';
  /* ═══ R200 · Phase 4.2 — Guard Binding (shadow) على v24.5.1 (المصنِّفُ كما في Phase 3): يُصنِّف كلَّ كتابةٍ (قديم → جديد) إلى مفاتيح v24.5.1 المطلوبة — للقياس فقط ═══
     لا يحكم: الحكمُ النافذ للنظام القديم (canWrite0). النتيجةُ تُقارَن وتُحصى في الذاكرة ثم تُقرأ من /api/permv2. */
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function deq(a, b) {
    if (a === b) return true;
    if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return a == null && b == null ? true : false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (!deq(a[i], b[i])) return false; return true; }
    var ka = Object.keys(a), kb = Object.keys(b); if (ka.length !== kb.length) return false;
    for (var q = 0; q < ka.length; q++) { if (!Object.prototype.hasOwnProperty.call(b, ka[q]) || !deq(a[ka[q]], b[ka[q]])) return false; }
    return true;
  }
  function union(a, b) { var s = {}, o = [], k; a = isObj(a) ? a : {}; b = isObj(b) ? b : {}; for (k in a) if (!s[k]) { s[k] = 1; o.push(k); } for (k in b) if (!s[k]) { s[k] = 1; o.push(k); } return o; }
  function strip(o, k) { var r = {}, q; if (!isObj(o)) return {}; for (q in o) if (q !== k) r[q] = o[q]; return r; }
  function emptyObj(o) { return isObj(o) && !Object.keys(o).length; }
  function prefixEq(la, lb) { if (lb.length < la.length) return false; for (var i = 0; i < la.length; i++) if (!deq(la[i], lb[i])) return false; return true; }
  function gone(ctx, v) { if (v == null || v === '' || String(v) === '__shifts') return false; return !!(ctx && ctx.emps && ctx.emps.live && !ctx.emps.live[String(v)]); }
  /* نتيجةُ التصنيف: ops (مفتاح · مسار · ملاحظة) · alt (مفاتيحُ بديلةٌ تكفي وحدها: القواعدُ الذاتية) · residual (مساراتٌ لم تُنسب) · tech */
  function Res() { this.ops = []; this.alt = []; this.any = []; this.residual = []; this.tech = []; this.flags = {}; }
  Res.prototype.op = function (key, path, note) { this.ops.push({ key: key, path: String(path), note: note || '' }); return this; };
  /* anyOf: مجموعةُ مفاتيح يكفي واحدٌ منها لهذا المسار (قاعدةٌ خلفية مشتركة) */
  Res.prototype.anyOf = function (keys, path, note) { this.any.push({ keys: keys, path: String(path), note: note || '' }); return this; };
  Res.prototype.res = function (path, note) { this.residual.push({ path: String(path), note: note || '' }); return this; };
  Res.prototype.tec = function (path) { this.tech.push(String(path)); return this; };
  Res.prototype.keys = function () { var s = {}, o = [], i; for (i = 0; i < this.ops.length; i++) if (!s[this.ops[i].key]) { s[this.ops[i].key] = 1; o.push(this.ops[i].key); } return o; };
  Res.prototype.allKeys = function () { var o = this.keys(), s = {}, i, j; for (i = 0; i < o.length; i++) s[o[i]] = 1; for (i = 0; i < this.any.length; i++) for (j = 0; j < this.any[i].keys.length; j++) if (!s[this.any[i].keys[j]]) { s[this.any[i].keys[j]] = 1; o.push(this.any[i].keys[j]); } return o; };
  /* ── مواءمةُ مجموعةٍ بالهوية: ما لا هويةَ له يُزاوَج بترتيبه ── */
  function matchById(la, lb, idf) {
    var ma = {}, mb = {}, ua = [], ub = [], out = { added: [], removed: [], changed: [] }, i, id, ids = {}, k;
    for (i = 0; i < la.length; i++) { id = idf(la[i], i); if (id != null && ma[id] === undefined) { ma[id] = i; ids[id] = 1; } else ua.push(i); }
    for (i = 0; i < lb.length; i++) { id = idf(lb[i], i); if (id != null && mb[id] === undefined) { mb[id] = i; ids[id] = 1; } else ub.push(i); }
    for (k in ids) {
      var ia = ma[k], ib = mb[k];
      if (ia === undefined) out.added.push({ id: k, b: lb[ib], i: ib });
      else if (ib === undefined) out.removed.push({ id: k, a: la[ia], i: ia });
      else if (!deq(la[ia], lb[ib])) out.changed.push({ id: k, a: la[ia], b: lb[ib] });
    }
    var n = Math.min(ua.length, ub.length);
    for (i = 0; i < n; i++) if (!deq(la[ua[i]], lb[ub[i]])) out.changed.push({ id: '#' + ub[i], a: la[ua[i]], b: lb[ub[i]] });
    for (i = n; i < ua.length; i++) out.removed.push({ id: '#' + ua[i], a: la[ua[i]], i: ua[i] });
    for (i = n; i < ub.length; i++) out.added.push({ id: '#' + ub[i], b: lb[ub[i]], i: ub[i] });
    return out;
  }
  /* إعادةُ تسمية: كيانٌ «زال» وآخر «ظهر» في الموضع نفسِه وبهندسةٍ واحدة = تعديلُ هويةٍ لا حذفٌ وإنشاء */
  function repairRename(m, geomEq) {
    var i, j, keepR = [], used = {};
    for (i = 0; i < m.removed.length; i++) {
      var hit = -1;
      for (j = 0; j < m.added.length && hit < 0; j++) if (!used[j] && m.added[j].i === m.removed[i].i && geomEq(m.removed[i].a, m.added[j].b)) hit = j;
      if (hit >= 0) { used[hit] = 1; m.changed.push({ id: m.removed[i].id + '→' + m.added[hit].id, a: m.removed[i].a, b: m.added[hit].b }); }
      else keepR.push(m.removed[i]);
    }
    var keepA = []; for (j = 0; j < m.added.length; j++) if (!used[j]) keepA.push(m.added[j]);
    m.removed = keepR; m.added = keepA; return m;
  }
  /* ═══ العدسات: أصنافُ الحقول (من الواجهة الفعلية — Operational Plan · Daily Sessions · BassamField) ═══ */
  var FIELD_KEYS = { fst: 1, flow: 1, fAt: 1, fBy: 1, fKind: 1, fLog: 1, closed: 1, off: 1, cAt: 1, cAtMs: 1, cWhy: 1, cBy: 1 };
  var GEOM = { zones: { d: 1, hs: 1, cx: 1, cy: 1, rawA: 1, kind: 1, unp: 1 }, paths: { pts: 1 }, gates: { x: 1, y: 1, unp: 1 }, marks: { x: 1, y: 1, unp: 1 } };
  var DIST_ASSIGN = { emp: 1 }, DIST_NEED = { needN: 1, needS: 1, uniNeed: 1 }, DENS = { count: 1, pc: 1 }, DERIVED_Z = { cap: 1 };
  var LENS_COLS = { zones: 1, gates: 1, marks: 1, paths: 1 };
  var EDIT_KEY = { zones: 'lens.zones.data.edit', gates: 'lens.gates.edit', marks: 'lens.marks.edit', paths: 'lens.paths.edit' };
  /* KIVO_238 · IH‑02: الهويةُ الثابتة uid أولاً ('u:'+uid) — وإلا المخطّطُ القديم للسجلات القديمة */
  function uidOf(e) { return isObj(e) && e.uid != null && e.uid !== '' ? 'u:' + e.uid : null; }
  var ID = {
    zones: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; var v = e.code || e.ser || e.name || e.id || e.eid; return v == null || v === '' ? null : 'z:' + v; },
    gates: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; if (e.id != null && e.id !== '') return 'g:' + e.id; if (e.gid != null && e.leafNo != null) return 'gl:' + e.gid + '/' + e.leafNo; if (e.gid != null) return 'gg:' + e.gid; if (e.num != null && e.num !== '') return 'gn:' + e.num; if (e.label) return 'gL:' + e.label; return null; },
    marks: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; if (e.id != null && e.id !== '') return 'm:' + e.id; if (e.label) return 'mL:' + e.label; return null; },
    paths: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; var v = e.id || e.code || e.name; return v == null || v === '' ? null : 'p:' + v; },
    sectors: function (e) { if (!isObj(e)) return null; var v = e.id || e.code || e.name; return v == null || v === '' ? null : 's:' + v; },
    floors: function (e, i) { if (!isObj(e)) return '#' + i; var v = e.sid || e.id; return v == null || v === '' ? '#' + i : 'f:' + v; }
  };
  function geomEq(col) { return function (a, b) { var g = GEOM[col], k; if (!isObj(a) || !isObj(b)) return false; var any = false; for (k in g) { if (a[k] === undefined && b[k] === undefined) continue; any = true; if (!deq(a[k], b[k])) return false; } return any; }; }
  function classifyEntity(R, col, x, y, p, ctx) {
    var ks = union(x, y), i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(x[k], y[k])) continue;
      if (col === 'zones' && DERIVED_Z[k]) continue;                                                   /* cap مشتقٌّ من area×mpu×dens */
      if (GEOM[col][k]) { R.op('lens.' + col + '.geometry.edit', p + '.' + k); continue; }
      if (col === 'paths' && k === 'active') { R.op('lens.paths.status.change', p + '.active', 'v24.3 F-06'); continue; }
      if (col !== 'paths' && FIELD_KEYS[k]) { R.op('lens.' + col + '.status.change', p + '.' + k); continue; }
      if (col !== 'paths' && DIST_ASSIGN[k]) {
        var oa = arr(x[k]), ob = arr(y[k]);
        if (ob.length < oa.length && goneOnly(oa, ob, ctx)) { R.op(ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete', p + '.emp', 'cleanup-gone'); continue; }
        R.op('lens.dist.assign.edit', p + '.emp'); continue;
      }
      if (col !== 'paths' && DIST_NEED[k]) { R.op('lens.dist.need.edit', p + '.' + k); continue; }
      if (col === 'zones' && DENS[k]) { R.op('lens.dens.reading.record', p + '.' + k); continue; }
      R.op(EDIT_KEY[col], p + '.' + k);
    }
  }
  function goneOnly(oa, ob, ctx) { var kept = [], i, hit = 0; for (i = 0; i < oa.length; i++) { if (gone(ctx, oa[i])) { hit++; continue; } kept.push(oa[i]); } return hit > 0 && deq(kept, ob); }
  function classifyLensCol(R, col, la, lb, p, ctx) {
    var m = repairRename(matchById(la, lb, ID[col]), geomEq(col)), i;
    for (i = 0; i < m.added.length; i++) R.op('lens.' + col + '.create', p + '[' + m.added[i].id + ']');
    for (i = 0; i < m.removed.length; i++) R.op('lens.' + col + '.delete', p + '[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) classifyEntity(R, col, m.changed[i].a, m.changed[i].b, p + '[' + m.changed[i].id + ']', ctx);
  }
  function classifySectors(R, la, lb, p) {
    var m = matchById(la, lb, ID.sectors), i;
    for (i = 0; i < m.added.length; i++) R.op('sector.create', p + '[' + m.added[i].id + ']');
    for (i = 0; i < m.removed.length; i++) R.op('sector.delete', p + '[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) R.op('sector.edit', p + '[' + m.changed[i].id + ']');
  }
  /* موقعٌ/طابق: في الخطة floors[i] وmonths[k].d[i] — وفي الجولة ["y-m-d"].d[i] */
  function classifyFloor(R, x, y, p, host, ctx) {
    x = isObj(x) ? x : {}; y = isObj(y) ? y : {};
    var ks = union(x, y), i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(x[k], y[k])) continue;
      if (LENS_COLS[k]) { classifyLensCol(R, k, arr(x[k]), arr(y[k]), p + '.' + k, ctx); continue; }
      if (k === 'sectors') { classifySectors(R, arr(x[k]), arr(y[k]), p + '.sectors'); continue; }
      if (host === 'rounds') {
        if (k === 'ap') { R.op(y.ap ? 'round.approve' : 'round.reopen', p + '.ap'); continue; }
        R.op('round.edit', p + '.' + k); continue;                                                     /* hideZones/hidePaths/hideGates/hideMarks/showCodes */
      }
      if (k === 'approved') { R.op(y.approved ? (p.indexOf('months') === 0 ? 'plan.approve' : 'site.approve') : 'plan.reopen', p + '.approved'); continue; }
      if (k === 'iid' || k === 'img' || k === 'imgW' || k === 'imgH') { R.op('map.replace', p + '.' + k); continue; }
      if (k === 'mpu') { R.op('map.calibrate', p + '.mpu'); continue; }
      if (k === 'dens') { R.op('lens.dens.threshold.configure', p + '.dens', 'v24.3 F-06'); continue; }
      R.op('site.edit', p + '.' + k);                                                                   /* name · num · chip · chipTone · create · hide* · showCodes */
    }
  }
  function normMonth(v) { if (Array.isArray(v)) return { c: 1, d: v }; return isObj(v) ? v : {}; }
  function normLock(v) { if (v === true || v === 1) return { ap: 1 }; return isObj(v) ? v : {}; }
  function dayMap(R, xa, xb, p, kAdd, kDel) { xa = isObj(xa) ? xa : {}; xb = isObj(xb) ? xb : {}; var ks = union(xa, xb), i; for (i = 0; i < ks.length; i++) { if (deq(xa[ks[i]], xb[ks[i]])) continue; if (xa[ks[i]] === undefined) R.op(kAdd, p + '[' + ks[i] + ']'); else if (xb[ks[i]] === undefined) R.op(kDel, p + '[' + ks[i] + ']'); else R.res(p + '[' + ks[i] + ']', 'flag-shape'); } }
  /* سجلُّ قفل شهرٍ {ap · mo · dopen · dshut} — الاتجاهُ لا الحقل: ap↑/mo↓/dshut+/dopen− = قفل · العكسُ فتح */
  function classifyMonthRec(R, x, y, p, kAp, kRe) {
    x = normLock(x); y = normLock(y);
    if (!!x.ap !== !!y.ap) R.op(y.ap ? kAp : kRe, p + '.ap');
    if (!!x.mo !== !!y.mo) R.op(y.mo ? kRe : kAp, p + '.mo');
    if (!deq(x.dopen, y.dopen)) dayMap(R, x.dopen, y.dopen, p + '.dopen', kRe, kAp);
    if (!deq(x.dshut, y.dshut)) dayMap(R, x.dshut, y.dshut, p + '.dshut', kAp, kRe);
    var ks = union(x, y), i; for (i = 0; i < ks.length; i++) { var k = ks[i]; if (k === 'ap' || k === 'mo' || k === 'dopen' || k === 'dshut' || k === 'auto' || k === 'perm') continue; if (!deq(x[k], y[k])) R.res(p + '.' + k, 'unlisted-lock-field'); }
  }
  var C = {};
  /* ═══ الخطة التشغيلية ═══ */
  C['bassam_plan_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var m = matchById(arr(a.floors), arr(b.floors), ID.floors), i, k;
    for (i = 0; i < m.added.length; i++) R.op('site.create', 'floors[' + m.added[i].id + ']');
    for (i = 0; i < m.removed.length; i++) R.op('site.delete', 'floors[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) classifyFloor(R, m.changed[i].a, m.changed[i].b, 'floors[' + m.changed[i].id + ']', 'plan', ctx);
    var cols = ['zones', 'gates', 'marks', 'paths'];
    for (i = 0; i < cols.length; i++) if (!deq(a[cols[i]], b[cols[i]])) classifyLensCol(R, cols[i], arr(a[cols[i]]), arr(b[cols[i]]), cols[i], ctx);   /* مرآةُ الموقع النشط في الجذر */
    var ma = isObj(a.months) ? a.months : {}, mb = isObj(b.months) ? b.months : {}, ks = union(ma, mb);
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(ma[k], mb[k])) continue;
      if (ma[k] === undefined) { R.op('plan.create', 'months[' + k + ']'); continue; }
      if (mb[k] === undefined) { R.op('plan.delete', 'months[' + k + ']'); continue; }
      var x = normMonth(ma[k]), y = normMonth(mb[k]);
      if (!!x.mo !== !!y.mo) R.op(y.mo ? 'plan.reopen' : 'plan.approve', 'months[' + k + '].mo');
      var mm = matchById(arr(x.d), arr(y.d), ID.floors), q;
      for (q = 0; q < mm.added.length; q++) R.op('site.create', 'months[' + k + '].d[' + mm.added[q].id + ']');
      for (q = 0; q < mm.removed.length; q++) R.op('site.delete', 'months[' + k + '].d[' + mm.removed[q].id + ']');
      for (q = 0; q < mm.changed.length; q++) classifyFloor(R, mm.changed[q].a, mm.changed[q].b, 'months[' + k + '].d[' + mm.changed[q].id + ']', 'plan', ctx);
    }
    var da = isObj(a.delMonths) ? a.delMonths : {}, db = isObj(b.delMonths) ? b.delMonths : {}; ks = union(da, db);
    for (i = 0; i < ks.length; i++) { if (deq(da[ks[i]], db[ks[i]])) continue; R.op(db[ks[i]] === undefined ? 'plan.create' : 'plan.delete', 'delMonths[' + ks[i] + ']'); }
    if (!deq(a.cfg, b.cfg)) R.tec('cfg'); if (!deq(a.pMig, b.pMig)) R.tec('pMig');
    ks = union(a, b); for (i = 0; i < ks.length; i++) { k = ks[i]; if (k === 'floors' || k === 'months' || k === 'delMonths' || k === 'cfg' || k === 'pMig' || LENS_COLS[k]) continue; if (!deq(a[k], b[k])) R.res(k, 'unknown-root-key'); }
  };
  /* ═══ الجولات اليومية ═══ */
  function classifyShAp(R, x, y, p) { x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; var ks = union(x, y), i; for (i = 0; i < ks.length; i++) { if (deq(x[ks[i]], y[ks[i]])) continue; var on = isObj(y[ks[i]]) && !!y[ks[i]].ap; R.op(on ? 'round.approve' : 'round.reopen', p + '[' + ks[i] + ']'); } }
  function classifyDay(R, x, y, k, ctx) {
    if (x === undefined) { R.op('round.create', k); return; }
    if (y === undefined) { R.op('round.delete', k); return; }
    if (!isObj(x) || !isObj(y)) { R.res(k, 'shape'); return; }
    var synced = !deq(x.synced, y.synced) && y.synced != null, ks = union(x, y), i, f;
    for (i = 0; i < ks.length; i++) {
      f = ks[i]; if (deq(x[f], y[f])) continue;
      if (f === 'ap') { R.op(y.ap ? 'round.approve' : 'round.reopen', k + '.ap'); continue; }
      if (f === 'shAp') { classifyShAp(R, x.shAp, y.shAp, k + '.shAp'); continue; }
      if (f === 'synced') { R.op('round.sync.plan', k + '.synced'); continue; }
      if (f === 'd') {
        if (synced) { R.op('round.sync.plan', k + '.d', 'collapsed'); continue; }
        var m = matchById(arr(x.d), arr(y.d), function (e, i2) { return '#' + i2; }), q;
        for (q = 0; q < m.added.length; q++) R.op('round.edit', k + '.d[' + m.added[q].id + ']', 'site-added');
        for (q = 0; q < m.removed.length; q++) R.op('round.edit', k + '.d[' + m.removed[q].id + ']', 'site-removed');
        for (q = 0; q < m.changed.length; q++) classifyFloor(R, m.changed[q].a, m.changed[q].b, k + '.d[' + m.changed[q].id + ']', 'rounds', ctx);
        continue;
      }
      if (f === 'off') { R.op('__unmapped:rounds.day.off(reserved:round.day.disable)', k + '.off', 'v24.3 F-05 — محجوز؛ لا قدرة يومية في المصدر'); continue; }
      if (f === 'mvLog') { R.op('lens.dist.assign.edit', k + '.mvLog', 'coverage-log'); continue; }
      if (f === 't' || f === 'from' || f === 'imp' || f === 'auto') { R.op('round.edit', k + '.' + f); continue; }
      R.res(k + '.' + f, 'unlisted-day-field');
    }
  }
  C['bassam_rounds_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(a[k], b[k])) continue;
      if (k === '__pMig') { R.tec(k); continue; }
      if (/^m:\d{4}-\d{1,2}$/.test(k)) { if (b[k] === undefined && a[k] && normLock(a[k]).ap) { R.op('round.reopen', k, 'month-record-removed'); continue; } classifyMonthRec(R, a[k], b[k], k, 'round.approve', 'round.reopen'); continue; }
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(k)) { classifyDay(R, a[k], b[k], k, ctx); continue; }
      if (/^\d{4}-\d{1,2}-\d{1,2}-/.test(k)) { R.op(b[k] === undefined ? 'round.delete' : 'round.edit', k, 'legacy-key'); continue; }
      R.res(k, 'unknown-root-key');
    }
  };
  /* ═══ التقرير اليومي ═══ */
  function attKey(r) { if (!isObj(r)) return null; var st = String(r.st || 'pr'); if (st === 'ab') return 'report.att.absence'; if (st === 'lv') return 'report.att.leave'; if (st === 'pm') return String(r.pmk || 'out') === 'in' ? 'report.att.late_in' : 'report.att.early_out'; return null; }
  function classifyRoster(R, la, lb, p, pulledNow, toutGain) {
    var m = matchById(la, lb, function (e) { return isObj(e) && e.ekey != null ? String(e.ekey) : null; }), i, c, f, ks;
    for (i = 0; i < m.added.length; i++) { var nb = m.added[i].b; R.op(isObj(nb) && nb.tin ? 'report.transfer' : (pulledNow ? 'report.create' : 'report.edit'), p + '[' + m.added[i].id + ']', 'row-added'); }
    for (i = 0; i < m.removed.length; i++) R.op(toutGain[m.removed[i].id] ? 'report.transfer' : 'report.edit', p + '[' + m.removed[i].id + ']', 'row-removed');
    for (i = 0; i < m.changed.length; i++) {
      c = m.changed[i]; ks = union(c.a, c.b);
      var stCh = !deq(c.a.st, c.b.st), pmCh = !deq(c.a.pmk, c.b.pmk), lvCh = !deq(c.a.lvk, c.b.lvk), other = [];
      for (f = 0; f < ks.length; f++) { var fk = ks[f]; if (deq(c.a[fk], c.b[fk])) continue; if (fk === 'st' || fk === 'pmk' || fk === 'lvk') continue; if (fk === 'tin' || fk === 'tfrom' || fk === 'treason') { R.op('report.transfer', p + '[' + c.id + '].' + fk); continue; } other.push(fk); }
      if (stCh) R.op(attKey(c.b) || attKey(c.a) || 'report.edit', p + '[' + c.id + '].st ' + (c.a.st || 'pr') + '→' + (c.b.st || 'pr'));
      else if (pmCh && String(c.b.st) === 'pm') R.op(attKey(c.b), p + '[' + c.id + '].pmk');
      else if (lvCh && String(c.b.st) === 'lv') R.op('report.att.leave', p + '[' + c.id + '].lvk');
      else if (pmCh || lvCh) R.op('report.edit', p + '[' + c.id + '].pmk/lvk');
      if (other.length) R.op('report.edit', p + '[' + c.id + '].' + other.join('/'));
    }
  }
  function classifyShift(R, x, y, p) {
    x = isObj(x) ? x : {}; y = isObj(y) ? y : {};
    var pulledNow = !x.pulled && !!y.pulled, ks = union(x, y), i, f, toutGain = {}, ta = isObj(x.tout) ? x.tout : {}, tb = isObj(y.tout) ? y.tout : {}, tk;
    for (tk in tb) if (!deq(ta[tk], tb[tk])) toutGain[tk] = 1;
    for (i = 0; i < ks.length; i++) {
      f = ks[i]; if (deq(x[f], y[f])) continue;
      if (f === 'ap' || f === 'apAt' || f === 'apBy') { if (f === 'ap' || deq(x.ap, y.ap)) R.op(y.ap ? 'report.approve' : 'report.reopen', p + '.' + f); continue; }
      if (f === 'tout') { R.op('report.transfer', p + '.tout'); continue; }
      if (f === 'roster') { classifyRoster(R, arr(x.roster), arr(y.roster), p + '.roster', pulledNow, toutGain); continue; }
      if (pulledNow) { R.op('report.create', p + '.' + f, 'pull'); continue; }                          /* سحبُ الوردية: pulled · sig · def · rest · muk … عمليةٌ واحدة */
      R.op('report.edit', p + '.' + f);                                                                /* leaders · rest · restSrc · muk */
    }
  }
  C['bassam_dreport_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    if (emptyObj(b) && !emptyObj(a) && ctx && (ctx.imp || ctx.empsEmpty)) { R.op(ctx.imp ? 'import.replace' : 'emp.record.bulk.delete', '*', 'wipe'); return; }
    var ks = union(a, b), i, k, x, y;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; x = a[k]; y = b[k]; if (deq(x, y)) continue;
      if (k === '__ldcs') { R.op('report.edit', k); continue; }
      if (/^m:/.test(k)) { x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; classifyMonthRec(R, x, y, k, 'report.approve', 'report.reopen'); if (!deq(x.perm, y.perm)) R.anyOf(['report.att.late_in', 'report.att.early_out'], k + '.perm', 'rule.report.permission_quota (v24.3 F-03)'); continue; }
      if (x === undefined) { R.op('report.create', k); continue; }
      if (y === undefined) { R.op('report.day.delete', k, 'v24.3 F-08 (drRsDo)'); continue; }
      if (!isObj(x) || !isObj(y)) { R.res(k, 'shape'); continue; }
      var sx = isObj(x.shifts) ? x.shifts : {}, sy = isObj(y.shifts) ? y.shifts : {}, sk = union(sx, sy), q;
      for (q = 0; q < sk.length; q++) {
        var sh = sk[q]; if (deq(sx[sh], sy[sh])) continue;
        var p = k + '.shifts[' + sh + ']';
        if (sx[sh] === undefined) { var ro = isObj(sy[sh]) ? arr(sy[sh].roster) : [], tin = false, z; for (z = 0; z < ro.length; z++) if (isObj(ro[z]) && ro[z].tin) tin = true; R.op(tin ? 'report.transfer' : 'report.create', p, 'shift-added'); continue; }
        if (sy[sh] === undefined) { R.op('__unmapped:dreport.shift.delete', p); continue; }
        classifyShift(R, sx[sh], sy[sh], p);
      }
      var dk = union(x, y); for (q = 0; q < dk.length; q++) if (dk[q] !== 'shifts' && !deq(x[dk[q]], y[dk[q]])) { if (dk[q] === 'created') R.tec(k + '.created'); else R.res(k + '.' + dk[q], 'unlisted-day-field'); }
    }
  };
  /* ═══ المهام ═══ */
  var TASK_SELF = { 3: 1, 6: 1, 11: 1, 12: 1, 20: 1, 21: 1 }, TASK_ST = { pending: 1, in_progress: 1, done: 1, declined: 1 }, ASSIGN_COLS = { 7: 1, 8: 1, 14: 1, 17: 1, 18: 1 };
  function taskIds(x, y) { var dup = {}; function scan(rows) { var seen = {}, i, k; for (i = 0; i < rows.length; i++) { k = String(Array.isArray(rows[i]) ? rows[i][13] : ''); if (seen[k]) dup[k] = 1; seen[k] = 1; } } scan(x); scan(y); return function (r) { if (!Array.isArray(r) || r[13] == null) return null; var id = String(r[13]); return dup[id] ? id + '|' + String(r[14] == null ? '' : r[14]) : id; }; }
  function classifyTaskRow(R, r0, r1, p, ctx) {
    var n = Math.max(r0.length, r1.length), j, C = [], self = !!(ctx && ctx.actor && ctx.actor.ekey && String(r0[14] == null ? '' : r0[14]) === String(ctx.actor.ekey));
    for (j = 0; j < n; j++) { var v0 = r0[j] === undefined ? null : r0[j], v1 = r1[j] === undefined ? null : r1[j]; if (!deq(v0, v1)) C.push(j); }
    var selfOk = self && !(r0[3] === 'done' || r0[3] === 'declined') && TASK_ST[String(r1[3])], q;
    for (q = 0; q < C.length && selfOk; q++) if (!TASK_SELF[C[q]]) selfOk = false;
    if (selfOk) R.alt.push('self.task.respond');
    var abs = {}, rest = [];
    if (C.indexOf(3) !== -1) {
      var f = String(r0[3]), t = String(r1[3]), key;
      if (f === 'pending' && (t === 'in_progress' || t === 'declined')) { key = 'task.accept'; abs[11] = abs[12] = abs[20] = 1; }
      else if (t === 'done') { key = 'task.finish'; abs[12] = abs[6] = 1; }
      else if ((f === 'done' || f === 'declined') && (t === 'in_progress' || t === 'pending')) { key = 'task.reopen'; abs[11] = abs[12] = abs[6] = 1; }
      else key = 'task.edit';
      R.op(key, p + '[3] ' + f + '→' + t);
    }
    if (C.indexOf(21) !== -1) R.op('task.evidence', p + '[21]');
    var asg = []; for (q = 0; q < C.length; q++) if (ASSIGN_COLS[C[q]]) asg.push(C[q]);
    if (asg.length) R.op('task.assign', p + '[' + asg.join('/') + ']');
    for (q = 0; q < C.length; q++) { j = C[q]; if (j === 3 || j === 21 || ASSIGN_COLS[j] || abs[j]) continue; rest.push(j); }
    if (rest.length) R.op('task.edit', p + '[' + rest.join('/') + ']');
  }
  C['bassam_tasks_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, removed = [], q;
    for (i = 0; i < ks.length; i++) {
      var day = ks[i], x = arr(a[day]), y = arr(b[day]); if (deq(x, y)) continue;
      var m = matchById(x, y, taskIds(x, y));
      for (q = 0; q < m.added.length; q++) R.op('task.create', day + '[' + m.added[q].id + ']');
      for (q = 0; q < m.removed.length; q++) removed.push(day + '[' + m.removed[q].id + ']');
      for (q = 0; q < m.changed.length; q++) {
        var c = m.changed[q];
        if (Array.isArray(c.a) && Array.isArray(c.b) && gone(ctx, c.a[14]) && c.b[14] === '' && c.b[8] === '' && Array.isArray(c.b[7]) && !c.b[7].length) { R.op(ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete', day + '[' + c.id + ']', 'cleanup-gone'); continue; }
        if (Array.isArray(c.a) && Array.isArray(c.b)) classifyTaskRow(R, c.a, c.b, day + '[' + c.id + ']', ctx); else R.res(day + '[' + c.id + ']', 'row-shape');
      }
    }
    if (removed.length >= 2) R.op('task.bulk.delete', removed.join(' · '), 'n=' + removed.length); else for (q = 0; q < removed.length; q++) R.op('task.delete', removed[q]);
  };
  /* ═══ أقفالُ الأشهر (الجدول الشهري · المهام) ═══ */
  function lockMap(kLock, kOpen) {
    return function (R, a, b) {
      a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
      var ks = union(a, b), i, x, y, k;
      for (i = 0; i < ks.length; i++) {
        k = ks[i]; x = a[k]; y = b[k]; if (deq(x, y)) continue;
        var xl = x === true, yl = y === true, xm = isObj(x) && !!x.mo, ym = isObj(y) && !!y.mo;
        if (yl && !xl) R.op(kLock, k, (xm ? '{mo:1}' : '∅') + '→true');
        else if (xl && !yl) R.op(kOpen, k, 'true→' + (ym ? '{mo:1}' : '∅'));
        else if (ym && !xm) R.op(kOpen, k, '→{mo:1}');
        else if (xm && !ym) R.op(kLock, k, '{mo:1}→∅');
        else R.res(k, 'lock-shape');
      }
    };
  }
  C['bassam_tasks_locks_v1'] = lockMap('task.month.lock', 'task.month.reopen');
  C['bassam_staffing_locks_v1'] = lockMap('staff.lock', 'staff.reopen');
  /* ═══ الجدول الشهري ═══ */
  function staffing(R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, mk, x, y;
    for (i = 0; i < ks.length; i++) {
      mk = ks[i]; x = a[mk]; y = b[mk]; if (deq(x, y)) continue;
      if (x === undefined) { R.op('staff.create', mk); continue; }
      if (y === undefined) { R.op('staff.bulk.delete', mk, 'month-removed'); continue; }
      if (!isObj(x) || !isObj(y)) { R.res(mk, 'shape'); continue; }
      var eks = union(x, y), q, removed = [], cleaned = 0, rowsBefore = 0, ek, r0, r1, p;
      for (ek in x) if (ek !== '__shifts') rowsBefore++;
      for (q = 0; q < eks.length; q++) {
        ek = eks[q]; r0 = x[ek]; r1 = y[ek]; if (deq(r0, r1)) continue; p = mk + '[' + ek + ']';
        if (ek === '__shifts') { R.op(r1 !== undefined ? 'staff.lock' : 'staff.reopen', p, 'snapshot'); continue; }
        if (r0 === undefined) { R.op('staff.shift.assign', p, 'row-added (D-18)'); continue; }
        if (r1 === undefined) { if (gone(ctx, ek)) { cleaned++; R.op(ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete', p, 'cleanup-gone'); } else removed.push(p); continue; }
        if (!isObj(r0) || !isObj(r1)) { R.res(p, 'shape'); continue; }
        var fs = union(r0, r1), z;
        for (z = 0; z < fs.length; z++) {
          var f = fs[z]; if (deq(r0[f], r1[f])) continue;
          if (f === 'shift') R.op('staff.shift.assign', p + '.shift');
          else if (f === 'rest' || f === 'leaves' || f === 'perm') R.op('staff.rest', p + '.' + f);
          else if (f === 'cs') R.op('staff.callsign.assign', p + '.cs');
          else if (f === 'muk') R.op('staff.tasking.assign', p + '.muk');
          else R.res(p + '.' + f, 'unlisted-field');
        }
      }
      if (removed.length && rowsBefore > 0 && removed.length + cleaned >= rowsBefore) R.op('staff.bulk.delete', mk, 'all-rows-removed');
      else if (removed.length >= 2) R.op('staff.bulk.delete', removed.join(' · '), 'n=' + removed.length);
      else for (q = 0; q < removed.length; q++) R.op('staff.delete', removed[q]);
    }
  }
  C['bassam_staffing_v3'] = staffing; C['bassam_staffing_v2'] = staffing;
  /* ═══ الإحصائيات اليومية (عامّ) ═══ */
  C['bassam_dstats_v1'] = function (R, a, b) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, k, x, y, q;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; x = a[k]; y = b[k]; if (deq(x, y)) continue;
      if (k === 'haram' || k === 'nabawi') { x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; var dk = union(x, y), n = 0; for (q = 0; q < dk.length; q++) if (!deq(x[dk[q]], y[dk[q]])) n++; if (n) R.op('dstats.' + k + '.entry', k, n + ' day(s)'); continue; }
      if (k === 'locks') { x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; var lk = union(x, y); for (q = 0; q < lk.length; q++) { if (deq(x[lk[q]], y[lk[q]])) continue; var mt = /^(haram|nabawi)\|/.exec(lk[q]); if (!mt) { R.res('locks[' + lk[q] + ']', 'bad-lock-key'); continue; } classifyMonthRec(R, x[lk[q]], y[lk[q]], 'locks[' + lk[q] + ']', 'dstats.' + mt[1] + '.approve', 'dstats.' + mt[1] + '.reopen'); } continue; }
      R.res(k, 'unknown-root-key');
    }
  };
  /* ═══ العهد ═══ */
  var MOVE_KEY = { out: 'cust.move.issue', 'in': 'cust.move.return', dmg: 'cust.move.damage', lost: 'cust.move.lost' };
  C['bassam_custody_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ia = arr(a.items), ib = arr(b.items), m = matchById(ia, ib, function (e) { return isObj(e) && e.name != null && e.name !== '' ? 'n:' + e.name : null; }), i;
    var ren = Math.min(m.added.length, m.removed.length);                                                /* إعادةُ تسمية صنف: زوالٌ وظهورٌ بعددٍ واحد */
    for (i = 0; i < ren; i++) R.op('ref.custody_type.edit', 'items[' + m.removed[i].id + '→' + m.added[i].id + ']', 'rename');
    for (i = ren; i < m.added.length; i++) R.op('ref.custody_type.create', 'items[' + m.added[i].id + ']');
    for (i = ren; i < m.removed.length; i++) R.op('ref.custody_type.delete', 'items[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) R.op('ref.custody_type.edit', 'items[' + m.changed[i].id + ']');
    var ma = arr(a.moves), mb = arr(b.moves);
    if (deq(ma, mb)) { /* لا شيء في الحركات */ }
    else if (!mb.length && ma.length && deq(strip(a, 'moves'), strip(b, 'moves'))) R.op(ctx && ctx.imp ? 'import.replace' : (ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : '__unmapped:custody.moves.wipe'), 'moves', 'wipe');
    else if (mb.length > ma.length && prefixEq(ma, mb)) { for (i = ma.length; i < mb.length; i++) { var t = isObj(mb[i]) ? String(mb[i].t) : ''; R.op(MOVE_KEY[t] || ('__unmapped:custody.move.t=' + t), 'moves[' + i + '].t=' + t); } }
    else if (mb.length < ma.length && goneOnly(ma.map(function (mv) { return isObj(mv) ? mv.eid : null; }), mb.map(function (mv) { return isObj(mv) ? mv.eid : null; }), ctx) && deq(ma.filter(function (mv) { return !gone(ctx, isObj(mv) ? mv.eid : null); }), mb)) R.op(ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete', 'moves', 'cleanup-gone');
    else if (mb.length === ma.length && ren > 0) { var onlyItem = true; for (i = 0; i < ma.length && onlyItem; i++) if (!deq(ma[i], mb[i]) && !deq(strip(ma[i], 'item'), strip(mb[i], 'item'))) onlyItem = false; if (onlyItem) R.op('ref.custody_type.edit', 'moves[].item', 'rename-cascade'); else R.res('moves', 'non-append-change'); }
    else R.res('moves', 'non-append-change');
    var ks = union(a, b); for (i = 0; i < ks.length; i++) if (ks[i] !== 'items' && ks[i] !== 'moves' && !deq(a[ks[i]], b[ks[i]])) R.res(ks[i], 'unknown-root-key');
  };
  /* ═══ جائزةُ التميز ═══ */
  C['bassam_award_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ra = arr(a.recs), rb = arr(b.recs), i;
    if (!rb.length && ra.length && deq(strip(a, 'recs'), strip(b, 'recs'))) { R.op(ctx && ctx.imp ? 'import.replace' : (ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : '__unmapped:award.recs.wipe'), 'recs', 'wipe'); return; }
    var m = matchById(ra, rb, function (e) { return isObj(e) && e.id != null ? 'r:' + e.id : null; });
    for (i = 0; i < m.added.length; i++) R.op('award.new.create', 'recs[' + m.added[i].id + ']');
    for (i = 0; i < m.removed.length; i++) R.op(gone(ctx, isObj(m.removed[i].a) ? m.removed[i].a.ekey : null) ? (ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete') : 'award.res.delete', 'recs[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) {
      var c = m.changed[i], p = 'recs[' + c.id + ']', ks = union(c.a, c.b), q, other = [];
      for (q = 0; q < ks.length; q++) { if (deq(c.a[ks[q]], c.b[ks[q]])) continue; if (ks[q] === 'st') continue; other.push(ks[q]); }
      if (!deq(c.a.st, c.b.st)) {
        var to = String(c.b.st);
        if (to === 'معتمد') R.op('award.res.approve', p + '.st ' + c.a.st + '→' + to);
        else if (to === 'مستبعد') { R.op('award.res.reject', p + '.st ' + c.a.st + '→' + to); if (!(c.b.stWhy || c.b.why || c.b.reason)) R.flags.rejectNoReason = (R.flags.rejectNoReason || 0) + 1; }
        else R.op('__unmapped:award.st.back(reserved:award.res.reopen)', p + '.st ' + c.a.st + '→' + to, 'v24.3 F-09 — يُرفض ما دام محجوزاً');
      }
      if (other.length) R.op('award.res.edit', p + '.' + other.join('/'));
    }
    var rk = union(a, b); for (i = 0; i < rk.length; i++) if (rk[i] !== 'recs' && !deq(a[rk[i]], b[rk[i]])) R.res(rk[i], 'unknown-root-key');
  };
  C['bassam_award_docs_v2'] = function (R, a, b) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, g, x, y;
    for (i = 0; i < ks.length; i++) {
      g = ks[i]; x = a[g]; y = b[g]; if (deq(x, y)) continue;
      if (x === undefined) { R.op('award.doc.create', g, 'group-created'); continue; }
      if (y === undefined) { R.op('award.doc.delete', g, 'group-removed'); continue; }
      x = isObj(x) ? x : {}; y = isObj(y) ? y : {};
      var sx = arr(x.secs), sy = arr(y.secs), meta = 0, q, diff = 0, n = Math.max(sx.length, sy.length);
      if (!deq(x.title, y.title)) meta++; if (!deq(x.lead, y.lead)) meta++; if (!deq(x.foot, y.foot)) meta++;
      for (q = 0; q < n; q++) if (!deq(sx[q], sy[q])) diff++;
      var reset = (meta === 3 && !deq(sx, sy)) || (n >= 2 && diff === n && meta >= 1);                  /* كلُّ الأقسام تبدّلت ومعها الترويسة = استبدالٌ كامل */
      if (reset) { R.op('award.doc.reset', g, 'full-replace-shape'); continue; }
      if (!deq(sx, sy)) { if (sy.length > sx.length && prefixEq(sx, sy)) R.op('award.doc.create', g + '.secs', 'appended'); else if (sy.length < sx.length) R.op('award.doc.delete', g + '.secs'); else R.op('award.doc.edit', g + '.secs'); }
      if (meta) R.op('award.doc.edit', g + '.meta');
    }
  };
  /* ═══ الموظفون ═══ */
  C['bassam_employees_v1'] = function (R, a, b, ctx) {
    var la = arr(a), lb = arr(b), i;
    var m = matchById(la, lb, function (e) { if (!isObj(e)) return null; var v = e.nid || e.eid || e.empno || e.name; return v == null || v === '' ? null : 'e:' + v; });
    if (m.removed.length >= 2 || (!lb.length && la.length)) R.op('emp.record.bulk.delete', 'n=' + m.removed.length, 'D-10');
    else for (i = 0; i < m.removed.length; i++) R.op('emp.record.delete', '[' + m.removed[i].id + ']');
    /* Phase 3 (F-10): لا استدلالَ بالشكل — import.run يأتي من marker الطلب (ctx.op) في classify()؛ الشكلُ الجماعي يُسجَّل علماً للقياس فقط */
    if (m.added.length + m.changed.length >= 2) R.flags.importHeuristic = (R.flags.importHeuristic || 0) + 1;
    for (i = 0; i < m.added.length; i++) R.op('emp.record.create', '[' + m.added[i].id + ']');
    for (i = 0; i < m.changed.length; i++) {
      var c = m.changed[i], ks = union(c.a, c.b), q, f = [];
      for (q = 0; q < ks.length; q++) if (!deq(c.a[ks[q]], c.b[ks[q]])) f.push(ks[q]);
      if (f.length === 1 && f[0] === 'email' && ctx && ctx.actor && String(c.a.eid || c.a.nid || c.a.name) === String(ctx.actor.ekey)) { R.alt.push('self.profile.edit'); }
      if (f.length === 1 && f[0] === 'eid' && (c.a.eid == null || c.a.eid === '')) { R.tec('[' + c.id + '].eid (adopt)'); continue; }
      if (f.length === 1 && f[0] === 'job') { R.tec('[' + c.id + '].job (drop)'); continue; }
      R.op('emp.record.edit', '[' + c.id + '].' + f.join('/'));
    }
  };
  /* ═══ الحسابات (عامّ) ═══ */
  var SELF_FIELDS = { ph: 1, name: 1, email: 1, phone: 1, un: 1, alt: 1 };
  C['bassam_auth_users_v1'] = function (R, a, b, ctx) {
    var la = arr(a), lb = arr(b), i, me = ctx && ctx.actor ? String(ctx.actor.id || '') : '';
    var m = matchById(la, lb, function (e) { return isObj(e) && e.id != null ? 'u:' + e.id : null; }), act = [], frz = [];
    function plainStaff(u) { return isObj(u) && u.role === 'staff' && !u.mgr; }
    for (i = 0; i < m.added.length; i++) { if (plainStaff(m.added[i].b)) act.push('[' + m.added[i].id + '] new'); else R.op('sys.users.manage', '[' + m.added[i].id + '] new ' + (m.added[i].b && m.added[i].b.role)); }
    for (i = 0; i < m.removed.length; i++) { if (plainStaff(m.removed[i].a)) R.op('emp.record.delete', '[' + m.removed[i].id + '] removed', 'D-20'); else R.op('sys.users.manage', '[' + m.removed[i].id + '] removed'); }
    for (i = 0; i < m.changed.length; i++) {
      var c = m.changed[i], ks = union(c.a, c.b), q, f = [];
      for (q = 0; q < ks.length; q++) { if (deq(c.a[ks[q]], c.b[ks[q]])) continue; if (ks[q] === 'ph' && (c.b.ph === undefined || c.b.ph === '')) continue; f.push(ks[q]); }   /* ph الغائب يُورَث (usersRule) */
      if (!f.length) continue;
      if (me && 'u:' + me === c.id) { var onlySelf = true; for (q = 0; q < f.length; q++) if (!SELF_FIELDS[f[q]]) onlySelf = false; if (onlySelf) { R.op(f.length === 1 && f[0] === 'ph' ? 'self.password.change' : 'self.profile.edit', '[' + c.id + '].' + f.join('/')); continue; } R.op('sys.users.manage', '[' + c.id + '].' + f.join('/'), 'self-non-self-field'); continue; }
      if (!plainStaff(c.a) || !plainStaff(c.b)) { R.op('sys.users.manage', '[' + c.id + '].' + f.join('/')); continue; }
      var disA = !!c.a.dis, disB = !!c.b.dis;
      if (!disA && disB) frz.push('[' + c.id + '].dis 0→1');
      else if (disA && !disB) act.push('[' + c.id + '].dis 1→0');
      else { var cred = false; for (q = 0; q < f.length; q++) if (f[q] === 'un' || f[q] === 'alt' || f[q] === 'ph' || f[q] === 'name' || f[q] === 'no' || f[q] === 'mc') cred = true; if (cred && f.length) act.push('[' + c.id + '].' + f.join('/') + ' refresh'); else R.op('sys.users.manage', '[' + c.id + '].' + f.join('/'), 'role/scope-field'); }
    }
    if (act.length >= 2) R.op('emp.account.bulk.activate', act.join(' · '), 'n=' + act.length); else for (i = 0; i < act.length; i++) R.op('emp.account.activate', act[i]);
    if (frz.length >= 2) R.op('emp.account.bulk.freeze', frz.join(' · '), 'n=' + frz.length); else for (i = 0; i < frz.length; i++) R.op('emp.account.freeze', frz[i]);
  };
  /* ═══ الصلاحيات (عامّ) ═══ */
  var PERM_GRANT = { emps: 1, tplOf: 1, empLens: 1 };
  C['bassam_perms_v1'] = function (R, a, b) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, k, x, y, q, dk;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; x = a[k]; y = b[k]; if (deq(x, y)) continue;
      x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; dk = union(x, y);
      if (PERM_GRANT[k]) { for (q = 0; q < dk.length; q++) if (!deq(x[dk[q]], y[dk[q]])) R.op('perm.assign', k + '[' + dk[q] + ']'); continue; }
      if (k === 'lenses') { var up = true; for (q = 0; q < dk.length && up; q++) { var lo = arr(x[dk[q]]), ln = arr(y[dk[q]]), z; for (z = 0; z < lo.length && up; z++) if (ln.indexOf(lo[z]) === -1) up = false; for (z = 0; z < ln.length && up; z++) if (lo.indexOf(ln[z]) === -1 && ln[z] !== 'zones') up = false; } if (up) { R.tec('lenses (zones upgrade)'); continue; } }
      for (q = 0; q < dk.length; q++) if (!deq(x[dk[q]], y[dk[q]])) R.op('sys.ceiling.set', k + '[' + dk[q] + ']');
    }
  };
  /* ═══ قوالبُ الصلاحيات ═══ */
  C['bassam_perm_tpls_v1'] = function (R, a, b) {
    var la = arr(a), lb = arr(b), i, m = matchById(la, lb, function (e) { return isObj(e) && e.id != null ? 't:' + e.id : null; });
    for (i = 0; i < m.added.length; i++) R.op('tpl.create', '[' + m.added[i].id + ']');
    for (i = 0; i < m.removed.length; i++) R.op('tpl.delete', '[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) { var c = m.changed[i], ks = union(c.a, c.b), q, f = []; for (q = 0; q < ks.length; q++) if (!deq(c.a[ks[q]], c.b[ks[q]])) f.push(ks[q]); if (f.indexOf('sup') !== -1) R.op('tpl.supervisory', '[' + c.id + '].sup'); var rest = f.filter(function (z) { return z !== 'sup'; }); if (rest.length) R.op('tpl.edit', '[' + c.id + '].' + rest.join('/')); }
    if (!m.added.length && !m.removed.length && !m.changed.length && !deq(la, lb)) R.op('tpl.edit', '[] reorder');
  };
  C['bassam_perm_tpls_named_v1'] = function (R) { R.tec('migration-flag'); };
  /* ═══ الاسترشاد · المضبوطات ═══ */
  function recBulk(prefix) {
    return function (R, a, b) {
      a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
      var m = matchById(arr(a.reports), arr(b.reports), function (e) { return isObj(e) && e.id != null ? 'r:' + e.id : null; }), i;
      for (i = 0; i < m.added.length; i++) R.op(prefix + '.create', 'reports[' + m.added[i].id + ']');
      if (m.removed.length >= 2) R.op(prefix + '.bulk.delete', 'reports n=' + m.removed.length, 'D-10'); else for (i = 0; i < m.removed.length; i++) R.op(prefix + '.delete', 'reports[' + m.removed[i].id + ']');
      for (i = 0; i < m.changed.length; i++) R.op(prefix + '.edit', 'reports[' + m.changed[i].id + ']');
      var ks = union(a, b); for (i = 0; i < ks.length; i++) if (ks[i] !== 'reports' && !deq(a[ks[i]], b[ks[i]])) R.res(ks[i], 'unknown-root-key');
    };
  }
  C['bassam_irshad_v1'] = recBulk('ir.rec'); C['bassam_seized_v1'] = recBulk('sz.rec');
  C['bassam_last_export_v1'] = function (R) { R.op('backup.create', 'stamp'); };
  /* ═══ الواجهة ═══ */
  function classify(resName, a, b, ctx) {
    var fn = C[resName]; if (!fn) return null;
    var R = new Res(); fn(R, a, b, ctx || {});
    if (ctx && ctx.restore) R.op('backup.restore', '*', 'restore-batch (marker/aud — F-13)');
    /* Phase 3 (F-10): علامةُ الاستيراد الصريحة من تدفق الاستيراد الحقيقي — لكل مفتاحٍ في حفظتها */
    if (ctx && ctx.op === 'import.run') R.op('import.run', '*', 'import-marker (Phase 3)');
    return R;
  }
  /* قرارُ v24.5 الظلّي لمفتاحٍ واحد (المنطقُ نفسُه منذ v24.3): مفاتيحُ «role:mgr + ورقة» تشترط الاثنين (usersRule/permsRule في المصدر) — وما سواه كما في KIVO_REGISTRY.can */
  function decide(key, ctx) {
    var e = R.byKey[key]; if (!e) return { ok: false, why: 'unknown' };
    if (ctx && ctx['super']) return { ok: true, why: 'super' };
    var v = R.can(key, ctx);
    if (v.ok && e.grant !== 'role' && e.grant !== 'self' && e.asisMap.indexOf('role:mgr') !== -1) {
      var hasLeaf = false, i; for (i = 0; i < e.asisMap.length; i++) if (e.asisMap[i].indexOf('role:') !== 0) hasLeaf = true;
      if (hasLeaf) { var T = (ctx && ctx.translated) || R.translate(ctx && ctx.sheet); if (!T.keys[key]) return { ok: false, why: 'mgr-without-sheet' }; }
    }
    return v;
  }
  var covers = Object.keys(C);
  return { version: B.version, phase: 4.1, mode: 'shadow', bindings: B.bindings, shadowOnly: B.shadowOnly, decisions: B.decisions, counts: B.counts, covers: covers, classify: classify, decide: decide,
           _h: { deq: deq, matchById: matchById, classifyMonthRec: classifyMonthRec, attKey: attKey, FIELD_KEYS: FIELD_KEYS, GEOM: GEOM } };
})(KIVO_GUARD_BINDINGS, KIVO_REGISTRY);

