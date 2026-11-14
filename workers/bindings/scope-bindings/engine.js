var KIVO_SCOPE = (function (S, R) {
  'use strict';
  /* ═══ R197/R198 · Phase 4 → 4.1 — Data Scope Shadow Mode: محرّكُ النطاق المركزي (ES5 · بلا I/O) ═══
     evaluate(permissionKey, actor, resource, oldValue, newValue, context) → نتيجةُ كلِّ بُعدٍ (allow · deny · unknown · not_applicable) والقرارُ المركّب.
     Phase 4.1 (v24.5): • D4‑01 evaluateRead(readKeys, actor, resource, value, context): نطاقُ القراءة على كل سجلٍّ داخل المورد بعد حكم canRead0 — قياسٌ فقط (telemetry مستقل scope.read).
       • D4‑02/D4‑03: لا استثناءَ لمدير النظام من DateRange (dslock · الفترةُ المغلقة بلا نافذة ⇒ deny معلَن؛ نافذةٌ سارية ⇒ allow).
       • D4‑04: الفاعلُ على سقف الإدارة لا يُعطى Site/Zone = ALL بالدور؛ يرث سقفَ الإدارة الصريح ctx.deptCeiling(dim, dept) — غيرُ مهاجر ⇒ unknown:unmigrated-department-ceiling.
       • D4‑05: قاموسُ المصطلحات في S.terminology · Shift للمدير بلا قيد (v24.4 §7 — لم يتغيّر).
     Phase 4.1.1 (v24.5.1): • P4.1.1‑01 readKeysFor(resource): مفاتيحُ القراءة من جدول ربطٍ صريح (S.readBindings — مولَّدٌ من مسارات AS‑IS RD_REG/RD_ANY/DS_READ/rule/public × ذرّات cap:view) لا من guard.kind=read وحده؛
       field.view (rule) وbackup.view (RD_ANY) قدراتُ قراءةٍ خاصة صريحة · reference-read معلَن · no-read-key allowlist. المختارُ للتقييم يقرّره المستدعي (المحمولُ من المربوط) — لا fallback صامت.
     • الصلاحيةُ تجيب «ماذا؟» والنطاقُ يجيب «على أيّ بيانات؟» — لا مفاتيحَ جديدة للأبعاد.
     • AND بين الأبعاد: deny واحد ⇒ deny · لا deny ويوجد unknown ⇒ unknown · الباقي allow/not_applicable ⇒ allow.
     • غيابُ قيمة نطاقٍ غيرِ مهاجرة (Site · Zone/Element · Shift للموظف) ⇒ unknown:unmigrated — لا deny (v24.4: Default Deny بعد ترحيل القيم فقط).
     • الهويةُ تُستخرج خادمياً من المورد الفعلي والقيمتين القديمة والجديدة وهوية الجلسة؛ علاماتُ العمليات لا تمسّ النطاق.
     • create → newValue · delete → oldValue · edit → oldValue ∧ newValue (نقلُ سجلٍّ عبر الحدود يظهر deny).
     • Bulk: كلُّ عنصرٍ متأثر يمرّ بالنطاق (all affected items) مع عدّادات allowed/denied/unknown.
     Shadow فقط — لا يحكم ولا يُستدعى من canWrite. */
  var DIMS = ['Department', 'Branch', 'Site', 'Zone/Element', 'Shift', 'Assigned', 'Own', 'DateRange', 'Source', 'Global'];
  var BYKEY = {}; for (var bi = 0; bi < S.bindings.length; bi++) BYKEY[S.bindings[bi].key] = S.bindings[bi];
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function obj(x) { return isObj(x) ? x : {}; }
  function deq(a, b) {
    if (a === b) return true;
    if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return a == null && b == null;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (!deq(a[i], b[i])) return false; return true; }
    var ka = Object.keys(a), kb = Object.keys(b); if (ka.length !== kb.length) return false;
    for (var j = 0; j < ka.length; j++) if (!Object.prototype.hasOwnProperty.call(b, ka[j]) || !deq(a[ka[j]], b[ka[j]])) return false;
    return true;
  }
  function union(x, y) { var s = {}, o = [], k; for (k in obj(x)) if (!s[k]) { s[k] = 1; o.push(k); } for (k in obj(y)) if (!s[k]) { s[k] = 1; o.push(k); } return o; }
  function str(v) { return v == null ? '' : String(v); }
  function has(list, v) { for (var i = 0; i < list.length; i++) if (String(list[i]) === String(v)) return true; return false; }
  /* ── النتائج ── */
  function rs(r, why, x) { var o = { r: r, why: why || '' }; if (x) for (var k in x) o[k] = x[k]; return o; }
  function allow(w, x) { return rs('allow', w, x); } function deny(w, x) { return rs('deny', w, x); } function unk(w, x) { return rs('unknown', w, x); } function na(w, x) { return rs('not_applicable', w, x); }
  var RANK = { deny: 3, unknown: 2, allow: 1, not_applicable: 0 };
  /* دمجُ نتائج عدّة عناصر لبُعدٍ واحد: deny > unknown > allow > n/a — مع عدّ العناصر */
  function fold(list) {
    var out = null, n = { allow: 0, deny: 0, unknown: 0, not_applicable: 0 }, i, r;
    for (i = 0; i < list.length; i++) { r = list[i]; n[r.r]++; if (!out || RANK[r.r] > RANK[out.r]) out = r; }
    if (!out) out = na('no-items');
    var o = rs(out.r, out.why, out); o.n = n; return o;
  }
  /* القرارُ المركّب على أبعاد المفتاح: deny ⇒ deny · unknown ⇒ unknown · وإلا allow (كلُّها allow/n/a) */
  function compose(per, dims) {
    var i, d, r, denyD = [], unkD = [], allowD = [], naD = [];
    for (i = 0; i < dims.length; i++) { d = dims[i]; r = per[d]; if (!r) continue; if (r.r === 'deny') denyD.push(d); else if (r.r === 'unknown') unkD.push(d); else if (r.r === 'allow') allowD.push(d); else naD.push(d); }
    var c = denyD.length ? 'deny' : (unkD.length ? 'unknown' : (allowD.length ? 'allow' : 'not_applicable'));
    return { composite: c, denyDims: denyD, unknownDims: unkD, allowDims: allowD, naDims: naD };
  }
  /* ── الهجري: اليومُ المغلق (G‑08) والتغطية بنافذة استدراك (كما KIVO_BUILD) ── */
  function closedPeriod(T, y, m, d) { if (!T) return false; y = +y; m = +m; d = (d == null || d === '') ? null : +d; if (!(y > 0 && m > 0)) return false; if (12 * y + m < 12 * T.y + T.m) return true; if (12 * y + m > 12 * T.y + T.m) return false; return d != null && d < T.d; }
  function retroCover(wins, y, m, d, now) {
    var i, w, hit = null, expired = false;
    for (i = 0; i < arr(wins).length; i++) {
      w = wins[i]; if (!isObj(w) || !isObj(w.scope)) continue;
      if (+w.scope.y !== +y || +w.scope.m !== +m) continue;
      if (w.scope.d != null && (d == null || +w.scope.d !== +d)) continue;
      var live = !w.closedAt && +w.until > +now;
      if (live) { hit = w; break; } expired = true;
    }
    return { covered: !!hit, expired: !hit && expired, window: hit ? hit.id : null };
  }
  /* سجلُّ قفل شهرٍ {ap · mo · dopen · dshut} — قاعدةُ dsLockedIn نفسُها (R183 الملاحظة ٩ · I‑02) */
  function normLock(v) { if (v === true || v === 1) return { ap: 1 }; return isObj(v) ? v : {}; }
  function lockedIn(rec, y, m, d, T) {
    rec = normLock(rec); if (rec.ap) return true;
    var mPast = !!T && (y < T.y || (y === T.y && m < T.m)), dPast = mPast || (!!T && y === T.y && m === T.m && d != null && d < T.d);
    if (mPast && !rec.mo) return true;
    if (d == null) return false;
    return dPast ? !(isObj(rec.dopen) && rec.dopen[d]) : !!(isObj(rec.dshut) && rec.dshut[d]);
  }
  function parseDay(k) { var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(k)); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function parseMonth(k) { var m = /^(?:m:)?(\d{4})-(\d{1,2})$/.exec(String(k)); return m ? { y: +m[1], m: +m[2], d: null } : null; }
  function ymd(x) { if (!isObj(x) || x.y == null || x.m == null) return null; return { y: +x.y, m: +x.m, d: x.d == null ? null : +x.d }; }
  function pk(p) { return p ? p.y + '-' + p.m + (p.d == null ? '' : '-' + p.d) : ''; }
  function sides(it, f) { var o = it[f]; if (!o) return []; var out = []; if (it.kind !== 'added' && o.old != null && o.old !== '') out.push({ side: 'old', v: o.old }); if (it.kind !== 'removed' && o.new != null && o.new !== '') out.push({ side: 'new', v: o.new }); if (!out.length && it.kind === 'added' && o.new != null) out.push({ side: 'new', v: o.new }); return out; }
  function pair(a, b) { return { old: a == null ? null : a, new: b == null ? null : b }; }
  function changedPair(p) { return !!p && p.old != null && p.new != null && String(p.old) !== String(p.new); }
  function periodChanged(p) { return !!p && p.old != null && p.new != null && pk(p.old) !== pk(p.new); }
  /* ── مطابقةُ المجموعات بالهوية (كما مصنِّف الحرّاس) ── */
  function matchById(la, lb, idf) {
    var ma = {}, mb = {}, ua = [], ub = [], out = { added: [], removed: [], changed: [] }, i, id, ids = {}, k;
    for (i = 0; i < la.length; i++) { id = idf(la[i], i); if (id != null && ma[id] === undefined) { ma[id] = i; ids[id] = 1; } else ua.push(i); }
    for (i = 0; i < lb.length; i++) { id = idf(lb[i], i); if (id != null && mb[id] === undefined) { mb[id] = i; ids[id] = 1; } else ub.push(i); }
    for (k in ids) { var ia = ma[k], ib = mb[k]; if (ia === undefined) out.added.push({ id: k, b: lb[ib], i: ib }); else if (ib === undefined) out.removed.push({ id: k, a: la[ia], i: ia }); else if (!deq(la[ia], lb[ib])) out.changed.push({ id: k, a: la[ia], b: lb[ib], i: ib }); }
    var n = Math.min(ua.length, ub.length);
    for (i = 0; i < n; i++) if (!deq(la[ua[i]], lb[ub[i]])) out.changed.push({ id: '#' + ub[i], a: la[ua[i]], b: lb[ub[i]], i: ub[i] });
    for (i = n; i < ua.length; i++) out.removed.push({ id: '#' + ua[i], a: la[ua[i]], i: ua[i] });
    for (i = n; i < ub.length; i++) out.added.push({ id: '#' + ub[i], b: lb[ub[i]], i: ub[i] });
    return out;
  }
  /* KIVO_238 · IH‑02: الهويةُ الثابتة uid أولاً ('u:'+uid) — وإلا المخطّطُ القديم للسجلات القديمة */
  function uidOf(e) { return isObj(e) && e.uid != null && e.uid !== '' ? 'u:' + e.uid : null; }
  var ID = {
    zones: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; var v = e.code || e.ser || e.name || e.id || e.eid; return v == null || v === '' ? null : 'z:' + v; },
    gates: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; if (e.id != null && e.id !== '') return 'g:' + e.id; if (e.gid != null && e.leafNo != null) return 'gl:' + e.gid + '/' + e.leafNo; if (e.gid != null) return 'gg:' + e.gid; if (e.num != null && e.num !== '') return 'gn:' + e.num; if (e.label) return 'gL:' + e.label; return null; },
    marks: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; if (e.id != null && e.id !== '') return 'm:' + e.id; if (e.label) return 'mL:' + e.label; return null; },
    paths: function (e) { if (!isObj(e)) return null; var u = uidOf(e); if (u) return u; var v = e.id || e.code || e.name; return v == null || v === '' ? null : 'p:' + v; },
    floors: function (e, i) { if (!isObj(e)) return '#' + i; var v = e.sid || e.id; return v == null || v === '' ? '#' + i : 'f:' + v; }
  };
  /* KIVO_238 · IH‑01: طابقُ الجولة ذو sid يحمل هويةَ الخطة نفسَها (f:<sid>) — وإلا الهويةُ القديمة rounds:<name|num|#i> */
  function roundsSite(fl, idx) { fl = obj(fl); if (fl.sid != null && fl.sid !== '') return 'f:' + fl.sid; return 'rounds:' + (fl.name || fl.num || idx); }
  var LENS_COLS = ['zones', 'gates', 'marks', 'paths'], EMP_COLS = { zones: 1, gates: 1, marks: 1 };
  function it(o) { o.kind = o.kind || 'changed'; o.what = o.what || 'record'; return o; }
  function kindOf(x, y) { return x === undefined ? 'added' : (y === undefined ? 'removed' : 'changed'); }
  function empOf(e) { return isObj(e) && Array.isArray(e.emp) ? e.emp.map(String) : []; }
  /* عناصرُ موقعٍ (الخطة · الجولة): مجموعاتُ العدسات داخل الموقع */
  function floorElems(items, x, y, site, period, path, lock) {
    x = obj(x); y = obj(y);
    for (var c = 0; c < LENS_COLS.length; c++) {
      var col = LENS_COLS[c]; if (deq(x[col], y[col])) continue;
      var m = matchById(arr(x[col]), arr(y[col]), ID[col]), q;
      for (q = 0; q < m.added.length; q++) items.push(it({ what: 'element', col: col, kind: 'added', id: m.added[q].id, path: path + '.' + col + '[' + m.added[q].id + ']', site: pair(null, site), element: pair(null, m.added[q].id), period: pair(null, period), emp: EMP_COLS[col] ? pair([], empOf(m.added[q].b)) : null, lock: lock }));
      for (q = 0; q < m.removed.length; q++) items.push(it({ what: 'element', col: col, kind: 'removed', id: m.removed[q].id, path: path + '.' + col + '[' + m.removed[q].id + ']', site: pair(site, null), element: pair(m.removed[q].id, null), period: pair(period, null), emp: EMP_COLS[col] ? pair(empOf(m.removed[q].a), []) : null, lock: lock }));
      for (q = 0; q < m.changed.length; q++) items.push(it({ what: 'element', col: col, kind: 'changed', id: m.changed[q].id, path: path + '.' + col + '[' + m.changed[q].id + ']', site: pair(site, site), element: pair(m.changed[q].id, m.changed[q].id), period: pair(period, period), emp: EMP_COLS[col] ? pair(empOf(m.changed[q].a), empOf(m.changed[q].b)) : null, lock: lock }));
    }
  }
  var X = {};
  /* ═══ الخطة التشغيلية ═══ */
  X.planItems = function (a, b, ctx) {
    a = obj(a); b = obj(b); var items = [], i, k, T = ctx.today;
    var fm = matchById(arr(a.floors), arr(b.floors), ID.floors);
    for (i = 0; i < fm.added.length; i++) { items.push(it({ what: 'floor', kind: 'added', id: fm.added[i].id, path: 'floors[' + fm.added[i].id + ']', site: pair(null, fm.added[i].id), lock: { locked: false, why: 'new-site' } })); if (ctx.read) floorElems(items, {}, fm.added[i].b, fm.added[i].id, null, 'floors[' + fm.added[i].id + ']', { locked: false, why: 'read' }); }
    for (i = 0; i < fm.removed.length; i++) items.push(it({ what: 'floor', kind: 'removed', id: fm.removed[i].id, path: 'floors[' + fm.removed[i].id + ']', site: pair(fm.removed[i].id, null), lock: { locked: !!obj(fm.removed[i].a).approved, why: 'site-approved' } }));
    for (i = 0; i < fm.changed.length; i++) {
      var fx = obj(fm.changed[i].a), fy = obj(fm.changed[i].b), fid = fm.changed[i].id, lk = { locked: !!fx.approved, why: fx.approved ? 'site-approved' : 'open' };
      if (!!fx.approved !== !!fy.approved) items.push(it({ what: 'floorAp', kind: 'changed', id: fid, path: 'floors[' + fid + '].approved', site: pair(fid, fid), lockOp: true }));
      floorElems(items, fx, fy, fid, null, 'floors[' + fid + ']', lk);
      var fk = union(fx, fy), q, other = 0; for (q = 0; q < fk.length; q++) { k = fk[q]; if (k === 'approved' || has(LENS_COLS, k)) continue; if (!deq(fx[k], fy[k])) other++; }
      if (other) items.push(it({ what: 'floorEdit', kind: 'changed', id: fid, path: 'floors[' + fid + ']', site: pair(fid, fid), lock: lk }));
    }
    /* مرآةُ الجذر (الموقعُ النشط): تُسجَّل فقط حين لا نظيرَ لها في floors/months */
    var mirror = [];
    floorElems(mirror, { zones: a.zones, gates: a.gates, marks: a.marks, paths: a.paths }, { zones: b.zones, gates: b.gates, marks: b.marks, paths: b.paths }, null, null, 'root', { locked: false, why: 'root-mirror' });
    var ma = obj(a.months), mb = obj(b.months), ks = union(ma, mb);
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(ma[k], mb[k])) continue; var per = parseMonth(k);
      if (ma[k] === undefined) {
        items.push(it({ what: 'month', kind: 'added', id: k, path: 'months[' + k + ']', period: pair(null, per), lock: { locked: false, why: 'new-month' } }));
        if (ctx.read) { var y0 = Array.isArray(mb[k]) ? { c: 1, d: mb[k] } : obj(mb[k]), d0 = arr(y0.d), q0; for (q0 = 0; q0 < d0.length; q0++) { var fid0 = ID.floors(d0[q0], q0); items.push(it({ what: 'floor', kind: 'added', id: fid0, path: 'months[' + k + '].d[' + fid0 + ']', site: pair(null, fid0), period: pair(null, per), lock: { locked: false, why: 'read' } })); floorElems(items, {}, d0[q0], fid0, per, 'months[' + k + '].d[' + fid0 + ']', { locked: false, why: 'read' }); } }
        continue;
      }
      if (mb[k] === undefined) { items.push(it({ what: 'month', kind: 'removed', id: k, path: 'months[' + k + ']', period: pair(per, null), lock: { locked: per ? (closedPeriod(T, per.y, per.m, null) && !obj(ma[k]).mo) : false, why: 'past-month' } })); continue; }
      var x = Array.isArray(ma[k]) ? { c: 1, d: ma[k] } : obj(ma[k]), y = Array.isArray(mb[k]) ? { c: 1, d: mb[k] } : obj(mb[k]);
      var mlock = { locked: !!(per && closedPeriod(T, per.y, per.m, null) && !x.mo), why: 'past-month-without-mo' };
      if (!!x.mo !== !!y.mo) items.push(it({ what: 'monthLock', kind: 'changed', id: k, path: 'months[' + k + '].mo', period: pair(per, per), lockOp: true }));
      var dm = matchById(arr(x.d), arr(y.d), ID.floors), q2;
      for (q2 = 0; q2 < dm.added.length; q2++) items.push(it({ what: 'floor', kind: 'added', id: dm.added[q2].id, path: 'months[' + k + '].d[' + dm.added[q2].id + ']', site: pair(null, dm.added[q2].id), period: pair(null, per), lock: mlock }));
      for (q2 = 0; q2 < dm.removed.length; q2++) items.push(it({ what: 'floor', kind: 'removed', id: dm.removed[q2].id, path: 'months[' + k + '].d[' + dm.removed[q2].id + ']', site: pair(dm.removed[q2].id, null), period: pair(per, null), lock: mlock }));
      for (q2 = 0; q2 < dm.changed.length; q2++) {
        var dx = obj(dm.changed[q2].a), dy = obj(dm.changed[q2].b), did = dm.changed[q2].id, dl = { locked: mlock.locked || !!dx.approved, why: mlock.locked ? mlock.why : (dx.approved ? 'site-approved' : 'open') };
        if (!!dx.approved !== !!dy.approved) items.push(it({ what: 'floorAp', kind: 'changed', id: did, path: 'months[' + k + '].d[' + did + '].approved', site: pair(did, did), period: pair(per, per), lockOp: true }));
        floorElems(items, dx, dy, did, per, 'months[' + k + '].d[' + did + ']', dl);
      }
    }
    for (i = 0; i < mirror.length; i++) { var dup = false; for (k = 0; k < items.length; k++) if (items[k].what === 'element' && items[k].col === mirror[i].col && items[k].id === mirror[i].id) { dup = true; break; } if (!dup) { mirror[i].mirror = true; items.push(mirror[i]); } }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'plan', path: '*' }));
    return items;
  };
  /* ═══ الجولات اليومية ═══ */
  X.roundsItems = function (a, b, ctx) {
    a = obj(a); b = obj(b); var items = [], i, k, q, ks = union(a, b), T = ctx.today;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(a[k], b[k])) continue;
      if (/^m:\d{4}-\d{1,2}$/.test(k)) { items.push(it({ what: 'monthLock', kind: kindOf(a[k], b[k]), id: k, path: k, period: pair(parseMonth(k), parseMonth(k)), lockOp: true })); continue; }
      var day = parseDay(k); if (!day) { items.push(it({ what: 'dayOther', kind: kindOf(a[k], b[k]), id: k, path: k })); continue; }
      var rec = a['m:' + day.y + '-' + day.m], x = a[k], y = b[k];
      var locked = !!(isObj(x) && x.ap) || lockedIn(rec, day.y, day.m, day.d, T), lk = { locked: locked, why: (isObj(x) && x.ap) ? 'day-approved' : (locked ? 'period-locked (m:y-m/dsLockedIn)' : 'open') };
      if (x === undefined) {
        items.push(it({ what: 'day', kind: 'added', id: k, path: k, period: pair(null, day), lock: { locked: lockedIn(rec, day.y, day.m, day.d, T), why: 'period-locked' } }));
        if (ctx.read) { var yd = obj(y), dl0 = arr(yd.d), q1; for (q1 = 0; q1 < dl0.length; q1++) { var fl1 = obj(dl0[q1]), sid1 = roundsSite(fl1, '#' + q1); items.push(it({ what: 'floor', kind: 'added', id: '#' + q1, path: k + '.d[#' + q1 + ']', site: pair(null, sid1), period: pair(null, day), lock: lk })); floorElems(items, {}, fl1, sid1, day, k + '.d[#' + q1 + ']', lk); } }
        continue;
      }
      if (y === undefined) { items.push(it({ what: 'day', kind: 'removed', id: k, path: k, period: pair(day, null), lock: lk })); continue; }
      x = obj(x); y = obj(y); var fk = union(x, y), other = 0;
      for (q = 0; q < fk.length; q++) {
        var f = fk[q]; if (deq(x[f], y[f])) continue;
        if (f === 'ap') { items.push(it({ what: 'dayAp', kind: 'changed', id: k, path: k + '.ap', period: pair(day, day), lockOp: true })); continue; }
        if (f === 'shAp') { var sx = obj(x.shAp), sy = obj(y.shAp), sk = union(sx, sy), z; for (z = 0; z < sk.length; z++) if (!deq(sx[sk[z]], sy[sk[z]])) items.push(it({ what: 'shiftAp', kind: 'changed', id: k + '|' + sk[z], path: k + '.shAp[' + sk[z] + ']', period: pair(day, day), shift: pair(sk[z], sk[z]), lockOp: true })); continue; }
        if (f === 'd') {
          var m = matchById(arr(x.d), arr(y.d), function (e, i2) { return '#' + i2; }), z2;
          for (z2 = 0; z2 < m.changed.length; z2++) { var fla = obj(m.changed[z2].a), flb = obj(m.changed[z2].b); floorElems(items, m.changed[z2].a, m.changed[z2].b, roundsSite((fla.sid != null && fla.sid !== '') ? fla : flb, m.changed[z2].id), day, k + '.d[' + m.changed[z2].id + ']', lk); }
          for (z2 = 0; z2 < m.added.length; z2++) items.push(it({ what: 'floor', kind: 'added', id: m.added[z2].id, path: k + '.d[' + m.added[z2].id + ']', site: pair(null, roundsSite(m.added[z2].b, m.added[z2].id)), period: pair(null, day), lock: lk }));
          for (z2 = 0; z2 < m.removed.length; z2++) items.push(it({ what: 'floor', kind: 'removed', id: m.removed[z2].id, path: k + '.d[' + m.removed[z2].id + ']', site: pair(roundsSite(m.removed[z2].a, m.removed[z2].id), null), period: pair(day, null), lock: lk }));
          continue;
        }
        other++;
      }
      if (other) items.push(it({ what: 'dayEdit', kind: 'changed', id: k, path: k, period: pair(day, day), lock: lk }));
    }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'rounds', path: '*' }));
    return items;
  };
  /* ═══ التقرير اليومي ═══ */
  X.dreportItems = function (a, b, ctx) {
    a = obj(a); b = obj(b); var items = [], i, k, q, ks = union(a, b), T = ctx.today;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(a[k], b[k])) continue;
      if (/^m:/.test(k)) { var lx = normLock(a[k]), ly = normLock(b[k]), per = parseMonth(k); if (!deq(lx.perm, ly.perm)) items.push(it({ what: 'monthPerm', kind: 'changed', id: k, path: k + '.perm', period: pair(per, per), lock: { locked: lockedIn(a[k], per.y, per.m, null, T), why: 'month-lock' } })); var rest = union(lx, ly).filter(function (f) { return f !== 'perm' && !deq(lx[f], ly[f]); }); if (rest.length) items.push(it({ what: 'monthLock', kind: kindOf(a[k], b[k]), id: k, path: k, period: pair(per, per), lockOp: true })); continue; }
      var day = parseDay(k); if (!day) { items.push(it({ what: 'dayOther', kind: kindOf(a[k], b[k]), id: k, path: k })); continue; }
      var rec = a['m:' + day.y + '-' + day.m], dayLocked = lockedIn(rec, day.y, day.m, day.d, T), lk = { locked: dayLocked, why: dayLocked ? 'period-locked (m:y-m/dsLockedIn)' : 'open' };
      var x = a[k], y = b[k];
      if (x === undefined) {
        items.push(it({ what: 'day', kind: 'added', id: k, path: k, period: pair(null, day), lock: lk }));
        if (ctx.read) { var sy0 = obj(obj(y).shifts), sk0 = union({}, sy0), q2; for (q2 = 0; q2 < sk0.length; q2++) { var sh0 = sk0[q2], p0 = k + '.shifts[' + sh0 + ']', ro0 = arr(obj(sy0[sh0]).roster), z0; items.push(it({ what: 'shift', kind: 'added', id: k + '|' + sh0, path: p0, period: pair(null, day), shift: pair(null, sh0), lock: lk })); for (z0 = 0; z0 < ro0.length; z0++) { var ek0 = isObj(ro0[z0]) && ro0[z0].ekey != null ? String(ro0[z0].ekey) : ('#' + z0); items.push(it({ what: 'roster', kind: 'added', id: ek0, path: p0 + '.roster[' + ek0 + ']', period: pair(null, day), shift: pair(null, sh0), owner: pair(null, ek0), lock: lk })); } } }
        continue;
      }
      if (y === undefined) { items.push(it({ what: 'day', kind: 'removed', id: k, path: k, period: pair(day, null), lock: lk })); continue; }
      x = obj(x); y = obj(y); var sx = obj(x.shifts), sy = obj(y.shifts), sk = union(sx, sy);
      for (q = 0; q < sk.length; q++) {
        var sh = sk[q]; if (deq(sx[sh], sy[sh])) continue; var p = k + '.shifts[' + sh + ']';
        if (sx[sh] === undefined) { items.push(it({ what: 'shift', kind: 'added', id: k + '|' + sh, path: p, period: pair(null, day), shift: pair(null, sh), lock: lk })); continue; }
        if (sy[sh] === undefined) { items.push(it({ what: 'shift', kind: 'removed', id: k + '|' + sh, path: p, period: pair(day, null), shift: pair(sh, null), lock: lk })); continue; }
        var ox = obj(sx[sh]), oy = obj(sy[sh]), shLock = { locked: dayLocked || !!ox.ap, why: dayLocked ? lk.why : (ox.ap ? 'shift-approved' : 'open') };
        if (!deq(ox.ap, oy.ap) || !deq(ox.apAt, oy.apAt) || !deq(ox.apBy, oy.apBy)) items.push(it({ what: 'shiftAp', kind: 'changed', id: k + '|' + sh, path: p + '.ap', period: pair(day, day), shift: pair(sh, sh), lockOp: true }));
        if (!deq(ox.roster, oy.roster)) {
          var m = matchById(arr(ox.roster), arr(oy.roster), function (e) { return isObj(e) && e.ekey != null ? String(e.ekey) : null; }), z;
          for (z = 0; z < m.added.length; z++) items.push(it({ what: 'roster', kind: 'added', id: m.added[z].id, path: p + '.roster[' + m.added[z].id + ']', period: pair(null, day), shift: pair(null, sh), lock: shLock }));
          for (z = 0; z < m.removed.length; z++) items.push(it({ what: 'roster', kind: 'removed', id: m.removed[z].id, path: p + '.roster[' + m.removed[z].id + ']', period: pair(day, null), shift: pair(sh, null), lock: shLock }));
          for (z = 0; z < m.changed.length; z++) items.push(it({ what: 'roster', kind: 'changed', id: m.changed[z].id, path: p + '.roster[' + m.changed[z].id + ']', period: pair(day, day), shift: pair(sh, sh), lock: shLock }));
        }
        var ok2 = union(ox, oy), other = 0, z3; for (z3 = 0; z3 < ok2.length; z3++) { var f2 = ok2[z3]; if (f2 === 'ap' || f2 === 'apAt' || f2 === 'apBy' || f2 === 'roster') continue; if (!deq(ox[f2], oy[f2])) other++; }
        if (other) items.push(it({ what: 'shiftEdit', kind: 'changed', id: k + '|' + sh, path: p, period: pair(day, day), shift: pair(sh, sh), lock: shLock }));
      }
      var dk = union(x, y), oth = 0, z4; for (z4 = 0; z4 < dk.length; z4++) if (dk[z4] !== 'shifts' && !deq(x[dk[z4]], y[dk[z4]])) oth++;
      if (oth) items.push(it({ what: 'dayEdit', kind: 'changed', id: k, path: k, period: pair(day, day), lock: lk }));
    }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'dreport', path: '*' }));
    return items;
  };
  /* ═══ الجدولُ الشهري ═══ */
  function lockState(locks, mk) { if (locks === undefined || locks === null) return null; var v = obj(locks)[mk]; return v === true || v === 1; }
  X.staffingItems = function (a, b, ctx) {
    a = obj(a); b = obj(b); var items = [], i, k, q, ks = union(a, b), L = ctx.locks ? ctx.locks.staffing : undefined;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(a[k], b[k])) continue; var per = parseMonth(k), ls = lockState(L, k), lk = { locked: ls, why: ls === null ? 'lock-evidence-missing (bassam_staffing_locks_v1 not loaded)' : (ls ? 'month-locked' : 'open') };
      if (a[k] === undefined) {
        items.push(it({ what: 'month', kind: 'added', id: k, path: k, period: pair(null, per), lock: lk }));
        if (ctx.read) { var ym = obj(b[k]), q3; for (q3 in ym) { if (q3 === '__shifts') continue; var r3 = obj(ym[q3]); items.push(it({ what: 'row', kind: 'added', id: k + '|' + q3, path: k + '[' + q3 + ']', period: pair(null, per), owner: pair(null, q3), shift: pair(null, r3.shift || null), lock: lk })); } }
        continue;
      }
      if (b[k] === undefined) { items.push(it({ what: 'month', kind: 'removed', id: k, path: k, period: pair(per, null), lock: lk })); continue; }
      var x = obj(a[k]), y = obj(b[k]), eks = union(x, y);
      for (q = 0; q < eks.length; q++) {
        var ek = eks[q]; if (deq(x[ek], y[ek])) continue;
        if (ek === '__shifts') { items.push(it({ what: 'snapshot', kind: kindOf(x[ek], y[ek]), id: k + '|__shifts', path: k + '[__shifts]', period: pair(per, per), lockOp: true })); continue; }
        var r0 = obj(x[ek]), r1 = obj(y[ek]), kd = kindOf(x[ek], y[ek]);
        items.push(it({ what: 'row', kind: kd, id: k + '|' + ek, path: k + '[' + ek + ']', period: pair(kd === 'added' ? null : per, kd === 'removed' ? null : per), owner: pair(kd === 'added' ? null : ek, kd === 'removed' ? null : ek), shift: pair(kd === 'added' ? null : (r0.shift || null), kd === 'removed' ? null : (r1.shift || null)), lock: lk }));
      }
    }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'staffing', path: '*' }));
    return items;
  };
  /* ═══ المهام ═══ */
  X.tasksItems = function (a, b, ctx) {
    a = obj(a); b = obj(b); var items = [], i, k, q, ks = union(a, b), L = ctx.locks ? ctx.locks.tasks : undefined;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; var x = arr(a[k]), y = arr(b[k]); if (deq(x, y)) continue; var day = parseDay(k), mk = day ? day.y + '-' + day.m : '', ls = lockState(L, mk), lk = { locked: ls, why: ls === null ? 'lock-evidence-missing (bassam_tasks_locks_v1 not loaded)' : (ls ? 'month-locked' : 'open') };
      var m = matchById(x, y, function (r) { return Array.isArray(r) && r[13] != null ? String(r[13]) : null; });
      for (q = 0; q < m.added.length; q++) items.push(it({ what: 'task', kind: 'added', id: m.added[q].id, path: k + '[' + m.added[q].id + ']', period: pair(null, day), owner: pair(null, str(arr(m.added[q].b)[14])), lock: lk }));
      for (q = 0; q < m.removed.length; q++) items.push(it({ what: 'task', kind: 'removed', id: m.removed[q].id, path: k + '[' + m.removed[q].id + ']', period: pair(day, null), owner: pair(str(arr(m.removed[q].a)[14]), null), lock: lk }));
      for (q = 0; q < m.changed.length; q++) items.push(it({ what: 'task', kind: 'changed', id: m.changed[q].id, path: k + '[' + m.changed[q].id + ']', period: pair(day, day), owner: pair(str(arr(m.changed[q].a)[14]), str(arr(m.changed[q].b)[14])), lock: lk }));
    }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'tasks', path: '*' }));
    return items;
  };
  /* ═══ الاسترشاد · المضبوطات ═══ */
  X.reportItems = function (a, b) {
    var ra = arr(obj(a).reports), rb = arr(obj(b).reports), items = [], i;
    var m = matchById(ra, rb, function (e) { return isObj(e) && e.id != null ? String(e.id) : null; });
    var mk = function (kind, id, x, y) { return it({ what: 'record', kind: kind, id: id, path: 'reports[' + id + ']', period: pair(x ? ymd(x) : null, y ? ymd(y) : null), site: pair(x ? (x.loc || null) : null, y ? (y.loc || null) : null), shift: pair(x ? (x.shift || null) : null, y ? (y.shift || null) : null) }); };
    for (i = 0; i < m.added.length; i++) items.push(mk('added', m.added[i].id, null, obj(m.added[i].b)));
    for (i = 0; i < m.removed.length; i++) items.push(mk('removed', m.removed[i].id, obj(m.removed[i].a), null));
    for (i = 0; i < m.changed.length; i++) items.push(mk('changed', m.changed[i].id, obj(m.changed[i].a), obj(m.changed[i].b)));
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'reports', path: '*' }));
    return items;
  };
  /* ═══ الموظفون · العهد · الجائزة · الحسابات · الصلاحيات · الإحصائيات ═══ */
  function empKey(e) { return isObj(e) ? str(e.eid || e.nid || e.name) : ''; }
  X.employeeItems = function (a, b) {
    var m = matchById(arr(a), arr(b), function (e) { var k = empKey(e); return k || null; }), items = [], i;
    for (i = 0; i < m.added.length; i++) items.push(it({ what: 'employee', kind: 'added', id: m.added[i].id, path: '[' + m.added[i].id + ']', owner: pair(null, m.added[i].id) }));
    for (i = 0; i < m.removed.length; i++) items.push(it({ what: 'employee', kind: 'removed', id: m.removed[i].id, path: '[' + m.removed[i].id + ']', owner: pair(m.removed[i].id, null) }));
    for (i = 0; i < m.changed.length; i++) items.push(it({ what: 'employee', kind: 'changed', id: m.changed[i].id, path: '[' + m.changed[i].id + ']', owner: pair(m.changed[i].id, m.changed[i].id) }));
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'employees', path: '*' }));
    return items;
  };
  X.custodyItems = function (a, b) {
    a = obj(a); b = obj(b); var items = [], i;
    var m = matchById(arr(a.items), arr(b.items), function (e) { return isObj(e) && e.name != null ? String(e.name) : null; });
    for (i = 0; i < m.added.length; i++) items.push(it({ what: 'custodyType', kind: 'added', id: m.added[i].id, path: 'items[' + m.added[i].id + ']' }));
    for (i = 0; i < m.removed.length; i++) items.push(it({ what: 'custodyType', kind: 'removed', id: m.removed[i].id, path: 'items[' + m.removed[i].id + ']' }));
    for (i = 0; i < m.changed.length; i++) items.push(it({ what: 'custodyType', kind: 'changed', id: m.changed[i].id, path: 'items[' + m.changed[i].id + ']' }));
    var ma = arr(a.moves), mb = arr(b.moves);
    for (i = ma.length; i < mb.length; i++) items.push(it({ what: 'move', kind: 'added', id: '#' + i, path: 'moves[' + i + ']', period: pair(null, ymd(mb[i])), lock: { locked: false, why: 'no-temporal-lock' } }));
    if (mb.length < ma.length) items.push(it({ what: 'move', kind: 'removed', id: 'moves', path: 'moves', lock: { locked: false, why: 'no-temporal-lock' } }));
    if (!items.length && !deq(a, b)) items.push(it({ what: 'resource', kind: 'changed', id: 'custody', path: '*' }));
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'custody', path: '*' }));
    return items;
  };
  X.awardItems = function (a, b) {
    var m = matchById(arr(obj(a).recs), arr(obj(b).recs), function (e) { return isObj(e) && e.id != null ? String(e.id) : null; }), items = [], i;
    for (i = 0; i < m.added.length; i++) items.push(it({ what: 'nomination', kind: 'added', id: m.added[i].id, path: 'recs[' + m.added[i].id + ']', owner: pair(null, str(obj(m.added[i].b).ekey)) }));
    for (i = 0; i < m.removed.length; i++) items.push(it({ what: 'nomination', kind: 'removed', id: m.removed[i].id, path: 'recs[' + m.removed[i].id + ']', owner: pair(str(obj(m.removed[i].a).ekey), null) }));
    for (i = 0; i < m.changed.length; i++) items.push(it({ what: 'nomination', kind: 'changed', id: m.changed[i].id, path: 'recs[' + m.changed[i].id + ']', owner: pair(str(obj(m.changed[i].a).ekey), str(obj(m.changed[i].b).ekey)) }));
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'award', path: '*' }));
    return items;
  };
  X.dstatsItems = function (a, b, ctx) {
    a = obj(a); b = obj(b); var items = [], i, q, T = ctx.today, sites = ['haram', 'nabawi'];
    for (i = 0; i < sites.length; i++) {
      var s = sites[i], x = obj(a[s]), y = obj(b[s]), ks = union(x, y);
      for (q = 0; q < ks.length; q++) { var dk = ks[q]; if (deq(x[dk], y[dk])) continue; var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dk), day = dm ? { y: +dm[1], m: +dm[2], d: +dm[3] } : null, locked = day ? (lockedIn(obj(a.locks)[s + '|' + day.y + '-' + day.m], day.y, day.m, day.d, T) && lockedIn(obj(b.locks)[s + '|' + day.y + '-' + day.m], day.y, day.m, day.d, T)) : false;
        items.push(it({ what: 'dsDay', kind: kindOf(x[dk], y[dk]), id: s + '|' + dk, path: s + '[' + dk + ']', source: s, period: pair(day, day), lock: { locked: locked, why: locked ? 'dslock (locked before and after)' : 'open' } })); }
    }
    var la = obj(a.locks), lb = obj(b.locks), lk = union(la, lb);
    for (q = 0; q < lk.length; q++) { if (deq(la[lk[q]], lb[lk[q]])) continue; var lm = /^(haram|nabawi)\|(\d{4})-(\d{1,2})$/.exec(lk[q]); items.push(it({ what: 'dsLock', kind: kindOf(la[lk[q]], lb[lk[q]]), id: lk[q], path: 'locks[' + lk[q] + ']', source: lm ? lm[1] : null, period: pair(lm ? { y: +lm[2], m: +lm[3], d: null } : null, lm ? { y: +lm[2], m: +lm[3], d: null } : null), lockOp: true })); }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'dstats', path: '*' }));
    return items;
  };
  X.userItems = function (a, b) {
    /* الحساباتُ تُقرأ بلا بصمات (ph) وتُعاد بلا ph: الغائبُ يُورَث (قاعدةُ usersRule نفسُها) — فلا يُعدّ السجلُّ متغيّراً لمجرّد غياب ph */
    var la = arr(a), lb0 = arr(b), byId = {}, i, lb = [];
    for (i = 0; i < la.length; i++) if (isObj(la[i]) && la[i].id != null) byId[String(la[i].id)] = la[i];
    for (i = 0; i < lb0.length; i++) { var e = lb0[i]; if (isObj(e) && e.id != null && (e.ph === undefined || e.ph === null || e.ph === '') && byId[String(e.id)] && byId[String(e.id)].ph) { var c = {}; for (var q in e) c[q] = e[q]; c.ph = byId[String(e.id)].ph; lb.push(c); } else lb.push(e); }
    var m = matchById(la, lb, function (e) { return isObj(e) && e.id != null ? String(e.id) : null; }), items = [];
    for (i = 0; i < m.added.length; i++) items.push(it({ what: 'user', kind: 'added', id: m.added[i].id, path: '[' + m.added[i].id + ']', dept: pair(null, str(obj(m.added[i].b).deptId)), owner: pair(null, m.added[i].id) }));
    for (i = 0; i < m.removed.length; i++) items.push(it({ what: 'user', kind: 'removed', id: m.removed[i].id, path: '[' + m.removed[i].id + ']', dept: pair(str(obj(m.removed[i].a).deptId), null), owner: pair(m.removed[i].id, null) }));
    for (i = 0; i < m.changed.length; i++) items.push(it({ what: 'user', kind: 'changed', id: m.changed[i].id, path: '[' + m.changed[i].id + ']', dept: pair(str(obj(m.changed[i].a).deptId), str(obj(m.changed[i].b).deptId)), owner: pair(m.changed[i].id, m.changed[i].id) }));
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'users', path: '*' }));
    return items;
  };
  X.permsItems = function (a, b) {
    a = obj(a); b = obj(b); var items = [], i, q, sect = ['caps', 'subs', 'lenses', 'empLens', 'emps', 'tplOf', 'lensZ'];
    for (i = 0; i < sect.length; i++) { var x = obj(a[sect[i]]), y = obj(b[sect[i]]), ks = union(x, y); for (q = 0; q < ks.length; q++) if (!deq(x[ks[q]], y[ks[q]])) items.push(it({ what: 'permSection', kind: kindOf(x[ks[q]], y[ks[q]]), id: sect[i] + '|' + ks[q], path: sect[i] + '[' + ks[q] + ']', dept: pair(ks[q], ks[q]) })); }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'perms', path: '*' }));
    return items;
  };
  X.wholeItem = function (a, b) { return [it({ what: 'resource', kind: kindOf(a, b), id: '*', path: '*' })]; };
  /* ═══ الفاعل ═══ */
  function isCeiling(actor) { if (!actor) return false; var r = actor.role; return r === 'super' || r === 'dept' || r === 'gm' || !!actor.mgr || String(actor.ekey || '').slice(0, 4) === 'mgr:'; }
  function heldFor(ctx, key) { return !!(ctx && ctx.held && ctx.held[key]); }
  function RETRO_SYS(res) { return res === 'bassam_irshad_v1' ? 'irshad' : (res === 'bassam_seized_v1' ? 'seized' : ''); }
  /* ═══ مقيّمو الأبعاد: fn(item, key, ctx, res) → نتيجة ═══ */
  var D = {};
  D['Department'] = function (item, key, ctx) {
    var ds = sides(item, 'dept'), i, d, bad = [];
    if (!ds.length) { if (!ctx.dept) return na('global-resource (no department identity)'); ds = [{ side: 'key', v: ctx.dept }]; }
    for (i = 0; i < ds.length; i++) { d = ds[i].v; if (!ctx.deptInScope(d)) bad.push(ds[i].side + ':' + d); }
    if (bad.length) return deny('department-out-of-scope (' + bad.join(' · ') + ')', { basis: 'as-is deptInScope', transition: changedPair(item.dept) });
    return allow('deptInScope (' + ds.map(function (x) { return x.v; }).join('→') + ')', { basis: 'as-is deptInScope', transition: changedPair(item.dept) });
  };
  D['Branch'] = function (item, key, ctx) {
    var ds = sides(item, 'dept'), i, d, bad = [], allowed = ctx.allowedDepts;
    if (!ds.length) { if (!ctx.dept) return na('global-resource (no department identity)'); ds = [{ side: 'key', v: ctx.dept }]; }
    if (allowed === null || allowed === undefined) return allow('ceiling: all departments (super)', { basis: 'role super', ceiling: '*' });
    for (i = 0; i < ds.length; i++) { d = ds[i].v; if (!has(allowed, d)) bad.push(ds[i].side + ':' + d); }
    if (bad.length) return deny('outside-branch-ceiling (' + bad.join(' · ') + ')', { basis: 'ancChain/deptInScope', ceiling: allowed.slice(0, 12) });
    return allow('within-branch-ceiling', { basis: 'ancChain/deptInScope', ceiling: allowed.slice(0, 12) });
  };
  function valueDim(dimName, field, unkWhy) {
    return function (item, key, ctx) {
      var vs = sides(item, field);
      if (!vs.length) return na('no-' + field + '-identity');
      var transition = changedPair(item[field]), vals = vs.map(function (x) { return x.v; });
      if (isCeiling(ctx.actor)) {
        /* D4‑04 (v24.5): الدورُ لا يعني ALL — مديرُ الإدارة يرث سقفَ الإدارة الصريح؛ gm = union سقوف إدارات فرعه؛ super يحترم سقفَ الإدارة المستهدفة (ctx.deptCeiling يُجيب عن الدور) */
        var ds0 = sides(item, 'dept'), tgt = ds0.length ? ds0[ds0.length - 1].v : ctx.dept, roleTxt = 'role ' + ctx.actor.role + (ctx.actor.mgr ? '/mgr' : '');
        var ceil = (typeof ctx.deptCeiling === 'function') ? ctx.deptCeiling(dimName, tgt, ctx.actor) : undefined;
        if (ceil === undefined || ceil === null) return unk('unmigrated-department-ceiling', { basis: 'D4‑04: ' + roleTxt + ' inherits the explicit Department Scope Ceiling — no ceiling record for ' + dimName + ' (unmigrated)', transition: transition, value: vals, ceiling: 'unmigrated', migrationNeeded: true });
        if (ceil === 'ALL' || ceil === '*') return allow('department-ceiling ALL (' + dimName + ')', { basis: 'D4‑04 explicit Department Scope Ceiling · ' + roleTxt, transition: transition, value: vals, ceiling: 'ALL' });
        if (Array.isArray(ceil)) { for (var ci = 0; ci < vs.length; ci++) if (!has(ceil, vs[ci].v)) return deny(dimName + '-outside-department-ceiling (' + vs[ci].side + ':' + vs[ci].v + ')', { basis: 'D4‑04 explicit Department Scope Ceiling · ' + roleTxt, transition: transition, value: vals, ceiling: ceil.slice(0, 12) }); return allow(dimName + '-within-department-ceiling', { basis: 'D4‑04 explicit Department Scope Ceiling · ' + roleTxt, transition: transition, value: vals, ceiling: ceil.slice(0, 12) }); }
        return unk('unmigrated-department-ceiling', { basis: 'D4‑04: ceiling record of unknown shape for ' + dimName, transition: transition, value: vals, ceiling: 'invalid', migrationNeeded: true });
      }
      var ex = ctx.scopeValues && ctx.scopeValues[dimName];
      if (Array.isArray(ex)) { for (var i = 0; i < vs.length; i++) if (!has(ex, vs[i].v)) return deny(dimName + '-out-of-scope (' + vs[i].side + ':' + vs[i].v + ')', { basis: 'explicit scope value', transition: transition }); return allow(dimName + '-in-scope', { basis: 'explicit scope value', transition: transition }); }
      var ev = 'none';
      if (item.emp && ctx.actor && ctx.actor.ekey) { var inO = has(arr(item.emp.old), ctx.actor.ekey), inN = has(arr(item.emp.new), ctx.actor.ekey); ev = (inO || inN) ? 'assigned-here' : 'not-assigned-here'; }
      return unk(unkWhy, { basis: 'no explicit ' + dimName + ' scope value for employee', transition: transition, value: vals, evidence: ev, migrationNeeded: true });
    };
  }
  D['Site'] = valueDim('Site', 'site', 'unmigrated-site-scope');
  D['Zone/Element'] = valueDim('Zone/Element', 'element', 'unmigrated-element-scope');
  D['Shift'] = function (item, key, ctx) {
    var vs = sides(item, 'shift'); if (!vs.length) return na('no-shift-identity');
    var transition = changedPair(item.shift), i;
    if (isCeiling(ctx.actor)) return allow('manager-unconstrained (v24.4 §7 Shift ceiling)', { basis: 'role ' + ctx.actor.role + (ctx.actor.mgr ? '/mgr' : ''), transition: transition, value: vs.map(function (x) { return x.v; }) });
    var ex = ctx.scopeValues && ctx.scopeValues.Shift;
    if (Array.isArray(ex)) { for (i = 0; i < vs.length; i++) if (!has(ex, vs[i].v)) return deny('shift-out-of-scope (' + vs[i].side + ':' + vs[i].v + ')', { basis: 'explicit scope value', transition: transition }); return allow('shift-in-scope', { basis: 'explicit scope value', transition: transition }); }
    var mine = null, p = item.period && (item.period.new || item.period.old); if (typeof ctx.actorShift === 'function') mine = ctx.actorShift(p ? p.y + '-' + p.m : '');
    var ev = mine ? (vs.every(function (x) { return String(x.v) === String(mine); }) ? 'staffing-shift-match' : 'staffing-shift-mismatch') : 'no-staffing-evidence';
    return unk('unmigrated-shift-scope', { basis: 'no explicit Shift scope value for employee', transition: transition, value: vs.map(function (x) { return x.v; }), evidence: ev, actorShift: mine || null, migrationNeeded: true, missingEvidence: !mine });
  };
  D['Assigned'] = function (item, key, ctx) {
    var ek = ctx.actor && ctx.actor.ekey;
    if (item.emp) {
      if (!(ctx.fieldOnly || !heldFor(ctx, key))) return na('supervisor/holder unrestricted (v24.4 §7 Assigned · I‑04)');
      var inO = has(arr(item.emp.old), ek), inN = has(arr(item.emp.new), ek);
      if (item.kind === 'current') return inN ? allow('assigned', { basis: 'element.emp[] ∋ actor (read)' }) : deny('not-assigned', { basis: 'element.emp[] ∌ actor (read)' });
      if (item.kind === 'added') return inN ? allow('assigned (new)', { basis: 'element.emp[] ∋ actor' }) : deny('not-assigned (new element)', { basis: 'element.emp[]' });
      if (item.kind === 'removed') return inO ? allow('assigned (old)', { basis: 'element.emp[] ∋ actor' }) : deny('not-assigned (removed element)', { basis: 'element.emp[]' });
      if (inO && inN) return allow('assigned (old ∧ new)', { basis: 'element.emp[] ∋ actor' });
      if (inO && !inN) return deny('assignment-change: actor removed from emp[]', { basis: 'element.emp[]', transition: true });
      if (!inO && inN) return deny('assignment-change: actor added to emp[]', { basis: 'element.emp[]', transition: true });
      return deny('not-assigned', { basis: 'element.emp[] ∌ actor' });
    }
    if (item.what === 'task') {
      if (heldFor(ctx, key)) return na('holder acts by permission (I‑04)');
      var os = sides(item, 'owner'), i; if (!os.length) return na('no-assignee');
      for (i = 0; i < os.length; i++) if (String(os[i].v) !== String(ek)) return deny('task-not-assigned-to-actor (' + os[i].side + ')', { basis: 'row[14]', transition: changedPair(item.owner) });
      return allow('task-assigned-to-actor', { basis: 'row[14] = ekey', transition: changedPair(item.owner) });
    }
    return na('no-assignment-field');
  };
  D['Own'] = function (item, key, ctx) {
    if (!item.owner) return na('no-owner-identity');
    if (heldFor(ctx, key)) return na('holder acts by permission (I‑04)');
    var os = sides(item, 'owner'), me = [str(ctx.actor && ctx.actor.ekey), str(ctx.actor && ctx.actor.id)], i;
    if (!os.length) return na('no-owner-identity');
    if (changedPair(item.owner)) return deny('owner-change (' + item.owner.old + '→' + item.owner.new + ')', { basis: 'session identity', transition: true });
    for (i = 0; i < os.length; i++) if (!has(me, os[i].v)) return deny('not-own (' + os[i].v + ')', { basis: 'session identity' });
    return allow('own', { basis: 'session identity' });
  };
  D['DateRange'] = function (item, key, ctx, res) {
    if (ctx.read) return na('read: temporal locks and retro windows govern writes only (I‑05 — no read-side DateRange scope value in v24.5)');
    if (item.lockOp) return na('lock-operation itself (approve/reopen key governs)');
    var ps = sides(item, 'period'); if (!ps.length) return na('no-period-identity');
    var sys = RETRO_SYS(res), i, p, T = ctx.today, now = ctx.now || 0;
    if (sys) {
      var wins = (ctx.retroWin && ctx.retroWin[ctx.dept + '|' + sys]) || [], anyClosed = false, badWhy = '', cov = [];
      for (i = 0; i < ps.length; i++) { p = ps[i].v; if (!p || !closedPeriod(T, p.y, p.m, p.d)) continue; anyClosed = true; var c = retroCover(wins, p.y, p.m, p.d, now); if (c.covered) cov.push(ps[i].side + ':' + pk(p) + '→' + c.window); else badWhy = badWhy || (c.expired ? 'retro-window-expired (' + ps[i].side + ':' + pk(p) + ')' : (wins.length ? 'closed-period: window-other-scope (' + ps[i].side + ':' + pk(p) + ')' : 'closed-period: no-window (' + ps[i].side + ':' + pk(p) + ')')); }
      if (!anyClosed) return allow('open-period', { basis: 'G‑08 hijri today', transition: periodChanged(item.period) });
      if (badWhy) return deny(badWhy, { basis: 'D3‑07 closed-period ∧ retro window' + (ctx.actor && ctx.actor.role === 'super' ? ' — super included (D4‑03: no silent bypass; open a window first)' : ''), transition: periodChanged(item.period), design: (ctx.actor && ctx.actor.role === 'super') ? 'D4-03' : 'D3-07' });
      return allow('retro-window-covers (' + cov.join(' · ') + ')', { basis: 'D3‑07 retro window', transition: periodChanged(item.period), retro: true });
    }
    if (!item.lock) return allow('no-temporal-lock', { basis: 'resource has no lock model' });
    if (item.lock.locked === null) return unk('lock-evidence-missing', { basis: item.lock.why, missingEvidence: true });
    if (item.lock.locked) return deny('locked-period: ' + item.lock.why, { basis: res === 'bassam_dstats_v1' ? ('as-is dslock' + (ctx.actor && ctx.actor.role === 'super' ? ' — super included (D4‑02: Global ≠ DateRange bypass; dstats.*.reopen first)' : '')) : 'ui-only lock (I‑02/I‑03)', design: res === 'bassam_dstats_v1' ? ((ctx.actor && ctx.actor.role === 'super') ? 'D4-02' : '') : 'locked-period' });
    return allow('open (' + item.lock.why + ')', { basis: 'lock model' });
  };
  D['Source'] = function (item, key, ctx) {
    if (!item.source) return na('not-a-source-record');
    var srcs = ctx.sources || {};
    return srcs[item.source] ? allow('source-in-scope (' + item.source + ')', { basis: 'as-is dstats/<site> sheets (dsHeld)' }) : deny('cross-source (' + item.source + ')', { basis: 'as-is dstats/<site> sheets (dsHeld)' });
  };
  D['Global'] = function () { return na('no-record-scope (Global) — لا يتجاوز الصلاحية ولا بوابة العدسة ولا الدور ولا السياسة الحسّاسة'); };
  /* ═══ الاستخراج ═══ */
  function extractorFor(res) { var b = S.byResource[res] || S.byResource.__default__; return b; }
  function extract(res, oldValue, newValue, ctx) {
    var b = extractorFor(res), fn = X[b.items] || X.wholeItem;
    var items = fn(oldValue, newValue, ctx || {});
    if (res === 'bassam_notif_dev_v1' && ctx && ctx.keyName) { var uid = String(ctx.keyName).split(':').pop(); for (var i = 0; i < items.length; i++) items[i].owner = pair(uid, uid); }
    return items;
  }
  function dimsFor(key) { var e = R.byKey[key]; return e ? e.scopeDims.slice() : []; }
  /* تقييمُ مفتاحٍ واحد على عناصر الكتابة */
  function evalKey(key, items, ctx, res) {
    var dims = dimsFor(key), per = {}, i, d, j, bind = BYKEY[key] || null, lists = {}, PI = [];
    /* تقييمٌ واحد لكل (عنصر × بُعد): منه يُشتقّ دمجُ البُعد (fold) والقرارُ المركّب لكل عنصر (Bulk: all affected items) */
    for (i = 0; i < dims.length; i++) lists[dims[i]] = [];
    for (j = 0; j < items.length; j++) {
      var pi = {};
      for (i = 0; i < dims.length; i++) { d = dims[i]; if (D[d]) { pi[d] = D[d](items[j], key, ctx, res); lists[d].push(pi[d]); } }
      PI.push(pi);
    }
    for (i = 0; i < dims.length; i++) {
      d = dims[i];
      if (!D[d]) { per[d] = unk('no-evaluator (' + d + ')', { missingEvidence: true }); continue; }
      per[d] = fold(lists[d]);
      if (bind && bind.dims[d]) { var bd0 = bind.dims[d], mg = S.migration[d] || {}; per[d].extractor = bd0[0]; per[d].migration = bd0[0] === 'na' ? 'n/a' : (mg.status || ''); per[d].confidence = mg.confidence || ''; }
    }
    var c = compose(per, dims), mig = [], miss = [];
    for (i = 0; i < dims.length; i++) { d = dims[i]; if (per[d] && per[d].migrationNeeded) mig.push(d); if (per[d] && per[d].missingEvidence) miss.push(d); }
    var bulk = { items: items.length, allowed: 0, denied: 0, unknown: 0, firstDenyReasons: [] }, perItem = ctx.read ? [] : null;
    for (j = 0; j < items.length; j++) {
      var cj = compose(PI[j], dims), cc = cj.composite;
      if (cc === 'deny') { bulk.denied++; if (bulk.firstDenyReasons.length < 5) bulk.firstDenyReasons.push(items[j].path + ': ' + cj.denyDims.map(function (x) { return x + '=' + PI[j][x].why; }).join(' · ')); }
      else if (cc === 'unknown') bulk.unknown++; else bulk.allowed++;
      if (perItem) perItem.push(cc);
    }
    if (perItem) bulk.perItem = perItem;
    var trans = []; for (j = 0; j < items.length; j++) { var itx = items[j], f, F = ['dept', 'site', 'element', 'shift', 'owner', 'period']; for (f = 0; f < F.length; f++) if (F[f] === 'period' ? periodChanged(itx.period) : changedPair(itx[F[f]])) trans.push({ path: itx.path, field: F[f], from: F[f] === 'period' ? pk(itx.period.old) : itx[F[f]].old, to: F[f] === 'period' ? pk(itx.period.new) : itx[F[f]].new }); }
    return { key: key, res: res, dims: dims, results: per, composite: c.composite, denyDims: c.denyDims, unknownDims: c.unknownDims, allowDims: c.allowDims, naDims: c.naDims, migrationNeeded: mig, missingEvidence: miss, bulk: bulk, transitions: trans.slice(0, 20), items: items.length };
  }
  function evaluate(permissionKey, actor, resource, oldValue, newValue, context) {
    var ctx = context || {}; ctx.actor = ctx.actor || actor || {}; if (typeof ctx.deptInScope !== 'function') ctx.deptInScope = function () { return false; };
    var items = extract(resource, oldValue, newValue, ctx);
    return evalKey(permissionKey, items, ctx, resource);
  }
  function evaluateWrite(keys, actor, resource, oldValue, newValue, context) {
    var ctx = context || {}; ctx.actor = ctx.actor || actor || {}; if (typeof ctx.deptInScope !== 'function') ctx.deptInScope = function () { return false; };
    var items = extract(resource, oldValue, newValue, ctx), out = { res: resource, items: items.length, perKey: {}, composite: 'not_applicable', denyDims: [], unknownDims: [], migrationNeeded: [], missingEvidence: [], transitions: [], bulk: { items: items.length, allowed: 0, denied: 0, unknown: 0 } }, i, k, r, rank = 0, seen = {};
    for (i = 0; i < keys.length; i++) {
      k = keys[i]; if (!R.byKey[k]) continue; r = evalKey(k, items, ctx, resource); out.perKey[k] = r;
      if (RANK[r.composite] > rank || (rank === 0 && r.composite !== 'not_applicable')) { rank = RANK[r.composite]; out.composite = r.composite; }
      var j; for (j = 0; j < r.denyDims.length; j++) if (!seen['d' + r.denyDims[j]]) { seen['d' + r.denyDims[j]] = 1; out.denyDims.push(r.denyDims[j]); }
      for (j = 0; j < r.unknownDims.length; j++) if (!seen['u' + r.unknownDims[j]]) { seen['u' + r.unknownDims[j]] = 1; out.unknownDims.push(r.unknownDims[j]); }
      for (j = 0; j < r.migrationNeeded.length; j++) if (!seen['m' + r.migrationNeeded[j]]) { seen['m' + r.migrationNeeded[j]] = 1; out.migrationNeeded.push(r.migrationNeeded[j]); }
      for (j = 0; j < r.missingEvidence.length; j++) if (!seen['e' + r.missingEvidence[j]]) { seen['e' + r.missingEvidence[j]] = 1; out.missingEvidence.push(r.missingEvidence[j]); }
      if (!out.transitions.length && r.transitions.length) out.transitions = r.transitions;
      out.bulk.allowed = Math.max(out.bulk.allowed, r.bulk.allowed); out.bulk.denied = Math.max(out.bulk.denied, r.bulk.denied); out.bulk.unknown = Math.max(out.bulk.unknown, r.bulk.unknown);
    }
    if (out.composite === 'not_applicable' && keys.length) { var any = false; for (k in out.perKey) if (out.perKey[k].composite !== 'not_applicable') any = true; if (!any) out.composite = 'not_applicable'; }
    return out;
  }
  /* ═══ D4‑01 (v24.5) — نطاقُ القراءة: كلُّ سجلٍّ حاليّ في المورد عنصرٌ (kind: current) — المستخرِجاتُ نفسُها بوضع read (المحتوياتُ المضافة تُمشى إلى عناصرها) ═══
     القراءةُ Resource-level ⇒ يُقاس النطاقُ على كل سجلٍّ مرشَّح؛ إذنُ المورد ليس إذناً تلقائياً لكل rows. سقفُ العناصر (ctx.readMaxItems · افتراضياً 400) يحمي ميزانية الخادم ويُعلَن truncated. */
  var READ_MAX = 400;
  function extractRead(res, value, ctx) {
    ctx = ctx || {}; ctx.read = true;
    var all = extract(res, undefined, value, ctx), items = [], i, cap = ctx.readMaxItems || READ_MAX;
    for (i = 0; i < all.length; i++) { if (all[i].lockOp) continue; all[i].kind = 'current'; all[i].read = true; items.push(all[i]); }
    var out = items.length > cap ? items.slice(0, cap) : items;
    out.truncated = items.length - out.length; out.total = items.length;
    return out;
  }
  function evaluateRead(keys, actor, resource, value, context) {
    var ctx = context || {}; ctx.actor = ctx.actor || actor || {}; ctx.read = true; if (typeof ctx.deptInScope !== 'function') ctx.deptInScope = function () { return false; };
    var items = extractRead(resource, value, ctx), i, j, k, r, seen = {};
    var out = { res: resource, mode: 'read', items: items.length, totalItems: items.total, truncated: items.truncated, perKey: {}, keys: [], heldKeys: 0, composite: 'not_applicable', why: '', denyDims: [], unknownDims: [], migrationNeeded: [], missingEvidence: [],
                rows: { items: items.length, allowed: 0, denied: 0, unknown: 0, notApplicable: 0, firstDenyReasons: [] } };
    for (i = 0; i < arr(keys).length; i++) if (R.byKey[keys[i]] && !seen['k' + keys[i]]) { seen['k' + keys[i]] = 1; out.keys.push(keys[i]); if (heldFor(ctx, keys[i])) out.heldKeys++; }
    if (!out.keys.length) { out.why = 'no-read-key'; out.rows.notApplicable = items.length; return out; }
    var best = [], rank = { allow: 0, not_applicable: 0, unknown: 1, deny: 2 };
    for (j = 0; j < items.length; j++) best.push(null);
    for (i = 0; i < out.keys.length; i++) {
      k = out.keys[i]; r = evalKey(k, items, ctx, resource); out.perKey[k] = r;
      for (j = 0; j < r.denyDims.length; j++) if (!seen['d' + r.denyDims[j]]) { seen['d' + r.denyDims[j]] = 1; out.denyDims.push(r.denyDims[j]); }
      for (j = 0; j < r.unknownDims.length; j++) if (!seen['u' + r.unknownDims[j]]) { seen['u' + r.unknownDims[j]] = 1; out.unknownDims.push(r.unknownDims[j]); }
      for (j = 0; j < r.migrationNeeded.length; j++) if (!seen['m' + r.migrationNeeded[j]]) { seen['m' + r.migrationNeeded[j]] = 1; out.migrationNeeded.push(r.migrationNeeded[j]); }
      for (j = 0; j < r.missingEvidence.length; j++) if (!seen['e' + r.missingEvidence[j]]) { seen['e' + r.missingEvidence[j]] = 1; out.missingEvidence.push(r.missingEvidence[j]); }
      var pi = r.bulk.perItem || [];
      /* السجلُّ مرئيٌّ إن سمح به أيُّ مفتاح قراءةٍ (المفاتيحُ منحٌ بديلة): allow/n/a > unknown > deny */
      for (j = 0; j < pi.length; j++) if (best[j] === null || rank[pi[j]] < rank[best[j]] || (rank[pi[j]] === rank[best[j]] && pi[j] === 'allow')) best[j] = pi[j];
      if (r.bulk.firstDenyReasons.length && out.rows.firstDenyReasons.length < 5) out.rows.firstDenyReasons = out.rows.firstDenyReasons.concat(r.bulk.firstDenyReasons.map(function (x) { return k + ' · ' + x; })).slice(0, 5);
      delete r.bulk.perItem;
    }
    for (j = 0; j < best.length; j++) { var b = best[j] || 'not_applicable'; if (b === 'allow') out.rows.allowed++; else if (b === 'deny') out.rows.denied++; else if (b === 'unknown') out.rows.unknown++; else out.rows.notApplicable++; }
    if (!out.rows.denied) out.rows.firstDenyReasons = [];     /* أسبابُ الرفض تُعرض فقط حين يبقى سجلٌّ مرفوضاً بعد كلّ مفاتيح القراءة */
    out.composite = out.rows.denied ? 'deny' : (out.rows.unknown ? 'unknown' : (out.rows.allowed ? 'allow' : 'not_applicable'));
    return out;
  }
  /* ═══ P4.1.1‑01 — مفاتيحُ القراءة المربوطة صراحةً بالمورد (Read Binding) ═══ */
  function readKeysFor(res) {
    var RB = S.readBindings && S.readBindings.byResource ? S.readBindings.byResource[res] : null;
    if (!RB) return { known: false, cls: 'unknown-resource', keys: [], sources: {}, routes: [] };
    var sources = {}, i; for (i = 0; i < RB.routes.length; i++) if (RB.routes[i].key && !sources[RB.routes[i].key]) sources[RB.routes[i].key] = RB.routes[i].source;
    return { known: true, cls: RB.cls, scope: RB.scope, keys: RB.keys.slice(), sources: sources, routes: RB.routes };
  }
  /* ═══ التحقق الداخلي: 10/10 أبعاد لها مقيّم · لا بُعدَ مجهولاً · كلُّ مفتاحٍ نشط له تفسيرٌ لكل بُعدٍ من أبعاده ═══ */
  function validate() {
    var errs = { noEvaluator: [], unknownDim: [], invalidDim: [], uninterpreted: [], missingExtractor: [] }, i, k, d, e, b;
    for (i = 0; i < DIMS.length; i++) if (typeof D[DIMS[i]] !== 'function') errs.noEvaluator.push(DIMS[i]);
    for (k in BYKEY) { b = BYKEY[k]; e = R.byKey[k]; if (!e) continue; for (i = 0; i < e.scopeDims.length; i++) { d = e.scopeDims[i]; if (DIMS.indexOf(d) === -1) errs.invalidDim.push(k + ':' + d); var bd = b.dims[d]; if (!bd) errs.uninterpreted.push(k + ':' + d); else if (bd[0] === 'missing') errs.uninterpreted.push(k + ':' + d); else if (bd[0] !== 'na' && typeof X[S.byResource[b.res === '__virtual__' ? '__virtual__' : (S.byResource[b.res] ? b.res : '__default__')].items] !== 'function') errs.missingExtractor.push(k + ':' + b.res); } }
    for (k in R.byKey) { e = R.byKey[k]; if (e.status === 'active' && !BYKEY[k]) errs.uninterpreted.push(k + ':*'); }
    for (k in S.byResource) { b = S.byResource[k]; if (typeof X[b.items] !== 'function') errs.missingExtractor.push(k + ':' + b.items); }
    /* P4.1.1‑01: كلُّ مفتاحٍ في جدول ربط القراءة نشطٌ ومعروفٌ في السجل وله سطرُ ربط نطاق */
    errs.readBindingBadKey = []; var RBR = (S.readBindings && S.readBindings.byResource) || {}, rk, rj;
    for (rk in RBR) for (rj = 0; rj < RBR[rk].keys.length; rj++) if (!R.byKey[RBR[rk].keys[rj]] || R.byKey[RBR[rk].keys[rj]].status !== 'active' || !BYKEY[RBR[rk].keys[rj]]) errs.readBindingBadKey.push(rk + ':' + RBR[rk].keys[rj]);
    var n = 0; for (k in errs) n += errs[k].length;
    return { ok: n === 0, errors: errs, errorCount: n, dims: DIMS.length, evaluators: DIMS.filter(function (x) { return typeof D[x] === 'function'; }).length, keys: Object.keys(BYKEY).length, pairs: S.counts.pairs, counts: S.counts, readBindings: S.readBindings ? Object.keys(S.readBindings.byResource).length : 0 };
  }
  return { version: S.version, docSha256: S.docSha256, phase: 4.1, mode: 'shadow', DIMS: DIMS, bindings: S.bindings, byKey: BYKEY, byResource: S.byResource, migration: S.migration, counts: S.counts, interpretations: S.interpretations, conflicts: S.conflicts, terminology: S.terminology, readPolicy: S.readPolicy, readBindings: S.readBindings, readBudgetPolicy: S.readBudgetPolicy, readKeysFor: readKeysFor, readMaxItems: READ_MAX,
           extract: extract, extractRead: extractRead, evaluate: evaluate, evaluateWrite: evaluateWrite, evaluateRead: evaluateRead, validate: validate, compose: compose, fold: fold, isCeiling: isCeiling,
           _D: D, _X: X, _h: { closedPeriod: closedPeriod, retroCover: retroCover, lockedIn: lockedIn, parseDay: parseDay, parseMonth: parseMonth, matchById: matchById } };
})(KIVO_SCOPE_BINDINGS, KIVO_REGISTRY);

