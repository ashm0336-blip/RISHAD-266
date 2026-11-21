var KIVO_GUARDS = (function (B, R) {
  'use strict';
  /* ═══ R200 · Phase 4.2 — Guard Binding (shadow) على v24.5.1 (المصنِّفُ كما في Phase 3): يُصنِّف كلَّ كتابةٍ (قديم → جديد) إلى مفاتيح v24.5.1 المطلوبة — للقياس فقط ═══
     V7 · د5-ح (القفل): المصنِّفُ يُستدعى من محرّك الإنفاذ (059 enfDecide) — لا حكمَ قديماً ولا عدّاداتِ ظلّ ولا تقريرَ لها. */
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
  var GEOM = {@@SYS:guard.lens.geom@@};   /* V7 · د5-ح: جداولُ العدسات من قطعتها (src/systems/_shared/lenses) — فارغةٌ بغياب مضيفَيها */
  var DIST_ASSIGN = { emp: 1 }, DIST_NEED = { needN: 1, needS: 1, uniNeed: 1 }, DENS = { count: 1, pc: 1 }, DERIVED_Z = { cap: 1 };
  var LENS_COLS = {@@SYS:guard.lens.cols@@};
  var EDIT_KEY = {@@SYS:guard.lens.editKey@@};
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
@@SYS:guard.sectors.plan@@  /* موقعٌ/طابق: في الخطة floors[i] وmonths[k].d[i] — وفي الجولة ["y-m-d"].d[i] */
  function classifyFloor(R, x, y, p, host, ctx) {
    x = isObj(x) ? x : {}; y = isObj(y) ? y : {};
    var ks = union(x, y), i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(x[k], y[k])) continue;
      if (LENS_COLS[k]) { classifyLensCol(R, k, arr(x[k]), arr(y[k]), p + '.' + k, ctx); continue; }
@@SYS:guard.floor.sectors.plan@@@@SYS:guard.floor.daily@@@@SYS:guard.floor.plan@@    }
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
@@SYS:guard.classify.plan@@@@SYS:guard.classify.daily@@@@SYS:guard.classify.dreport@@@@SYS:guard.classify.tasks@@  /* ═══ أقفالُ الأشهر (الجدول الشهري · المهام) ═══ */
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
@@SYS:guard.classify.tasks.locks@@@@SYS:guard.classify.staff@@@@SYS:guard.classify.dstats@@@@SYS:guard.classify.custody@@@@SYS:guard.classify.award@@  /* ═══ الموظفون ═══ */
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
  @@SYS:guard.classify.records|sep=" "@@
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
           _h: { deq: deq, matchById: matchById, classifyMonthRec: classifyMonthRec, @@SYS:guard.h.attKey.dreport@@FIELD_KEYS: FIELD_KEYS, GEOM: GEOM } };
})(KIVO_GUARD_BINDINGS, KIVO_REGISTRY);

