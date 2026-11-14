var KIVO_BUILD = (function (B, R, G) {
  'use strict';
  /* ═══ R196/R197/R198/R199 · Phase 3 → 4 → 4.1 → 4.1.1 — Build Missing Guards (shadow): الآلياتُ المبنيّة للـ10 to-build — دوالُّ نقيّةٌ تُحسب بها أحكامُ TO-BE وتُقارَن بحكم النظام القديم ولا تغيّره ═══ */
  var LENSES = ['zones', 'paths', 'gates', 'marks', 'dist', 'dens'];
  var OPS = { 'import.run': 1, 'backup.restore': 1 };
  var IMPORT_RES = B.importRes, byRes = {}; for (var ir = 0; ir < IMPORT_RES.length; ir++) byRes[IMPORT_RES[ir]] = 1;
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  /* ── C: Lens Enable Gate — مرآةُ BassamPerm.lensOn في الواجهة: سقفُ الإدارة (غيابُه = الكل) ∧ عدساتُ الموظف (غيابُها = كلُّ عدسات الإدارة؛ لـstaff/gm) ── */
  function lensOf(key) { var m = /^lens\.([a-z]+)\./.exec(String(key || '')); return m && LENSES.indexOf(m[1]) !== -1 ? m[1] : null; }
  function lensGate(perms, u, d, L) {
    perms = isObj(perms) ? perms : {};
    var dl = (perms.lenses || {})[d], deptOn = Array.isArray(dl) ? dl.indexOf(L) !== -1 : true;
    var empOn = true, src = 'role';
    if (u && (u.role === 'staff' || u.role === 'gm')) { var el = ((perms.empLens || {})[d] || {})[u.ekey]; if (Array.isArray(el)) { empOn = el.indexOf(L) !== -1; src = 'empLens'; } else src = 'inherit'; }
    else if (u && u.role === 'super') src = 'super';
    return { lens: L, deptOn: deptOn, empOn: empOn, empSrc: src, on: deptOn && empOn, cell: (deptOn ? 'D1' : 'D0') + (empOn ? 'E1' : 'E0') };
  }
  /* ── D/E: فترةُ الاستدراك — قاعدةُ الإغلاق كما في الواجهة (G‑08): شهرٌ منقضٍ، أو يومٌ منقضٍ من الشهر الجاري (T = اليومُ الهجري للخادم) ── */
  function retroClosed(T, y, m, d) {
    if (!T) return false; y = +y; m = +m; d = (d == null || d === '') ? null : +d;
    if (!(y > 0 && m > 0)) return false;
    if (12 * y + m < 12 * T.y + T.m) return true;
    if (12 * y + m > 12 * T.y + T.m) return false;
    return d != null && d < T.d;
  }
  /* نافذةٌ تغطي التاريخ: نطاقُها الشهرُ نفسُه (d فارغ) أو اليومُ نفسُه — سارية = غيرُ مغلقة وuntil > now */
  function retroCover(windows, y, m, d, now) {
    var out = { covered: false, expired: false, window: null, matching: 0 }, i, w, sc;
    windows = Array.isArray(windows) ? windows : [];
    for (i = 0; i < windows.length; i++) {
      w = windows[i]; if (!isObj(w) || !isObj(w.scope)) continue; sc = w.scope;
      if (+sc.y !== +y || +sc.m !== +m) continue;
      if (sc.d != null && sc.d !== '' && (d == null || +sc.d !== +d)) continue;
      out.matching++;
      if (!w.closedAt && +w.until > +now) { out.covered = true; out.window = w.id; return out; }
      out.expired = true; if (!out.window) out.window = w.id;
    }
    return out;
  }
  /* تواريخُ السجلات المتأثرة بكتابةٍ على reports[] (مضاف · محذوف · معدَّل بتاريخَيه) */
  function retroDates(a, b) {
    var ra = isObj(a) && Array.isArray(a.reports) ? a.reports : [], rb = isObj(b) && Array.isArray(b.reports) ? b.reports : [], A = {}, i, r, out = [], seen = {};
    var push = function (x, kind) { if (!isObj(x) || x.y == null || x.m == null) return; var k = x.y + '-' + x.m + '-' + (x.d == null ? '' : x.d) + '|' + kind; if (seen[k]) return; seen[k] = 1; out.push({ y: +x.y, m: +x.m, d: x.d == null ? null : +x.d, kind: kind, id: x.id }); };
    for (i = 0; i < ra.length; i++) if (isObj(ra[i]) && ra[i].id != null) A[String(ra[i].id)] = ra[i];
    for (i = 0; i < rb.length; i++) { r = rb[i]; if (!isObj(r) || r.id == null) continue; var o = A[String(r.id)]; if (!o) push(r, 'added'); else { if (JSON.stringify(o) !== JSON.stringify(r)) { push(r, 'changed'); if (o.y !== r.y || o.m !== r.m || o.d !== r.d) push(o, 'changed-from'); } delete A[String(r.id)]; } }
    for (var k in A) push(A[k], 'removed');
    return out;
  }
  /* ── B: سياسةُ الاستعادة المستهدفة: super OR (role:mgr AND backup.restore) · السببُ إلزاميٌّ في TO-BE (يُحصى غيابُه ولا يمنع في Phase 3) ── */
  function restorePolicy(isSuper, isMgr, hasKey, reason) {
    var why = isSuper ? 'super' : (isMgr ? (hasKey ? 'mgr-key' : 'mgr-no-key') : 'not-mgr');
    var ok = !!isSuper || (!!isMgr && !!hasKey), missingReason = !(reason && String(reason).trim());
    return { ok: ok, why: why, missingReason: missingReason, final: ok && !missingReason, finalWhy: ok ? (missingReason ? 'missing-reason' : why) : why };
  }
  /* ── A/B: علاماتُ العمليات (غيرُ موثوقة) — تعقيمٌ صارم: op من قائمةٍ مغلقة · حقولٌ قصيرة · مفاتيحُ هذا الطلب فقط؛ لا تُستعمل في أي حكمٍ نافذ ── */
  function marker(x) {
    if (!isObj(x) || !OPS[x.op]) return null;
    var o = { op: x.op };
    if (typeof x.mode === 'string' && /^[a-z]{1,12}$/.test(x.mode)) o.mode = x.mode;
    if (x.scope === 'dept' || x.scope === 'full') o.scope = x.scope;
    if (typeof x.n === 'number' && isFinite(x.n) && x.n >= 0) o.n = Math.min(1000000, Math.floor(x.n));
    if (typeof x.reason === 'string') o.reason = x.reason.slice(0, 300);
    if (typeof x.cid === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(x.cid)) o.cid = x.cid;
    return o;
  }
  function markers(ops, keysOk) {
    var out = { ops: {}, n: 0, bad: 0, byOp: {} }, k, m;
    if (!isObj(ops)) return out;
    for (k in ops) { if (!keysOk || !keysOk[k]) { out.bad++; continue; } m = marker(ops[k]); if (!m) { out.bad++; continue; } out.ops[k] = m; out.n++; out.byOp[m.op] = (out.byOp[m.op] || 0) + 1; }
    return out;
  }
  function isImportRes(rn) { return !!byRes[rn]; }
  var impl = { lensOf: lensOf, lensGate: lensGate, retroClosed: retroClosed, retroCover: retroCover, retroDates: retroDates, restorePolicy: restorePolicy, marker: marker, markers: markers, isImportRes: isImportRes };
  return { version: B.version, docSha256: B.docSha256, phase: 4.1, mode: 'shadow', bindings: B.bindings, counts: B.counts, LENSES: LENSES, IMPORT_RES: IMPORT_RES, RETRO_MAX_H: B.retroMaxH, RETRO_DEF_H: B.retroDefH,
           lensOf: lensOf, lensGate: lensGate, retroClosed: retroClosed, retroCover: retroCover, retroDates: retroDates, restorePolicy: restorePolicy, marker: marker, markers: markers, isImportRes: isImportRes, _impl: impl };
})(KIVO_BUILD_BINDINGS, KIVO_REGISTRY, KIVO_GUARDS);

