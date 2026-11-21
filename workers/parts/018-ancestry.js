/* ══ سلسلة الأسلاف على الخادم ══════════════════════════════════════════════
   أبُ الإدارة حقل gid، وأبُ العقدة الفوقية حقل pid. والمشي صعوداً محدودٌ بـ64
   خطوة: سجلٌّ تالفٌ يدور على نفسه يجب أن يتوقّف لا أن يعلّق الطلب.
   F01 · الأقسام (قرار المالك — خطة التوحيد): القسمُ وحدةُ بياناتٍ أبوها إدارة (gid = معرّفُ الإدارة · kind 'قسم'). كلُّ مرحلةٍ تُحلّ في العقد
   أولاً (pid) ثم في الوحدات (gid) — فيمرّ المشيُ من القسم بإدارته إلى العقد فوقها، فيصل مديرُ العقدة القسمَ ويُقرأ سقفُ ما فوق الإدارة عليه. */
function ancParentOf(A, c) {
  var nd = (A.nodes || []).filter(function (x) { return x && x.id === c; })[0];
  if (nd) return nd.pid || '';
  var dd = (A.depts || []).filter(function (x) { return x && x.id === c; })[0];
  return dd ? (dd.gid || '') : '';
}
function ancChain(A, d) {
  var out = [], seen = {}, n = 0;
  var c = d ? ancParentOf(A, d) : '';
  while (c && !seen[c] && n++ < 64) {
    seen[c] = 1; out.push(c);
    c = ancParentOf(A, c);
  }
  return out;
}
/* عقدةٌ فوقيةٌ قائمة (bassam_gdepts_v1) — لا وحدةُ بيانات */
function isNodeId(A, id) { return !!id && (A.nodes || []).some(function (x) { return x && x.id === id; }); }
/* ══ وحدةُ البيانات (AD-7) ══
   وحدةُ البيانات سجلٌّ في bassam_depts_v1 (إدارةٌ أو قسم) — وحدها تحمل بياناتٍ (مفاتيحَ bsdept:<d>:* وصفوفاً بـdepartment_id) وحساباتٍ ومفاتيح.
   العقدةُ الفوقية والمعرّفُ المجهول ليسا وحدة: لا نطاقَ ولا إدارةَ ولا مفتاحَ عليهما لأحدٍ غير مدير النظام. والوحداتُ التي يُنشئها سجلُّ
   الوحدات المقبولُ في الحفظة نفسِها (unitBatchAdd) وحداتٌ لبقية مفاتيح تلك الحفظة. */
function isUnitId(A, id) {
  if (!A || id == null || id === '') return false;
  var s = String(id), c = A.__unitIx, L = Array.isArray(A.depts) ? A.depts : [];
  if (A.__batchUnits && A.__batchUnits[s]) return true;
  if (!c || c.src !== A.depts || c.n !== L.length) {
    c = { src: A.depts, n: L.length, m: nmap() };
    L.forEach(function (x) { if (isObj(x) && x.id != null && x.id !== '') c.m[String(x.id)] = 1; });
    A.__unitIx = c;
  }
  return !!c.m[s];
}
/* الوحداتُ الجديدة في سجلّ الوحدات الذي قبلته الحفظة — وحداتٌ لبقية مفاتيحها (تُسقط ذاكرةُ أحكامها)؛ والتي أزالها (A.__batchGone) */
function unitBatchAdd(A, newJson) {
  var b = parseJson(newJson, null); if (!Array.isArray(b)) return;
  var now = nmap();
  b.forEach(function (x) {
    if (!isObj(x) || x.id == null || x.id === '') return;
    now[String(x.id)] = 1;
    if (isUnitId(A, x.id)) return;
    (A.__batchUnits || (A.__batchUnits = nmap()))[String(x.id)] = 1;
    enfMemoDrop(A, String(x.id));
  });
  (Array.isArray(A.depts) ? A.depts : []).forEach(function (x) {
    if (isObj(x) && x.id != null && x.id !== '' && !now[String(x.id)]) (A.__batchGone || (A.__batchGone = nmap()))[String(x.id)] = 1;
  });
}
/* والعقدُ الجديدة في سجلّ الهيكل الذي قبلته الحفظة — لفحص تصادم المعرّفات في بقية الحفظة */
function nodeBatchAdd(A, newJson) {
  var b = parseJson(newJson, null); if (!Array.isArray(b)) return;
  b.forEach(function (x) { if (isObj(x) && x.id != null && x.id !== '' && !isNodeId(A, x.id)) (A.__batchNodes || (A.__batchNodes = nmap()))[String(x.id)] = 1; });
}
/* ترتيبُ الحفظة لا يغيّر الحكم: سجلّا الهيكل يُحكم عليهما قبل كلّ مفتاح (054 applySave)؛ وما قُبل حكمُه ثم لم يُكتب تُنقض علاماتُه */
function batchRegMark(A) {
  var cp = function (m) { var o = nmap(); for (var q in (m || {})) o[q] = 1; return o; };
  return { u: cp(A.__batchUnits), n: cp(A.__batchNodes), g: cp(A.__batchGone) };
}
function batchRegUndo(A, m) {
  var q;
  for (q in (A.__batchUnits || {})) if (!m.u[q]) { delete A.__batchUnits[q]; enfMemoDrop(A, q); }
  for (q in (A.__batchNodes || {})) if (!m.n[q]) delete A.__batchNodes[q];
  for (q in (A.__batchGone || {})) if (!m.g[q]) delete A.__batchGone[q];
}
/* السجلّان معاً وأحدُهما لم يُكتب ⇒ يُعاد الحكمُ على المكتوب بالمخزَّن من الآخر */
function regPairWhy(A, k, v, cur, rst, failedK) {
  if (A.__regNext) delete A.__regNext[failedK];
  if (k === K_DEPTS) return deptShapeWhy(A, v, cur, rst);
  return k === K_GDEPTS ? nodeShapeWhy(A, v, cur, rst) : '';
}
/* مفاتيحُ وحدةٍ لم تعد وحدة (أزالها السجلُّ المقبولُ في الحفظة نفسِها أو يتيمٌ بعد حذفٍ سابق) — يحذفها مديرُ النظام */
function unitGoneOf(A, d) { return !!d && (!!(A.__batchGone && A.__batchGone[d]) || !isUnitId(A, d)); }
var DEPT_SEC_KIND = 'قسم', DEPT_UNIT_KIND = 'إدارة';
function unitRecOf(A, d) {
  var s = String(d == null ? '' : d), r = (A.depts || []).filter(function (x) { return isObj(x) && String(x.id) === s; })[0];
  if (!r && A.__batchUnits && A.__batchUnits[s] && A.__regNext && Array.isArray(A.__regNext[K_DEPTS])) r = A.__regNext[K_DEPTS].filter(function (x) { return isObj(x) && String(x.id) === s; })[0];
  return isObj(r) ? r : null;
}
/* الإدارةُ الأم لقسمٍ قائم ('' لغير القسم) — إدارةٌ قائمةٌ ليست قسماً ولا عقدة */
function secParentOf(A, d) {
  if (!d || !isUnitId(A, d)) return '';
  var r = unitRecOf(A, d); if (!r || r.kind !== DEPT_SEC_KIND || r.gid == null || r.gid === '') return '';
  var g = String(r.gid), p = unitRecOf(A, g);
  return p && p.kind !== DEPT_SEC_KIND && isUnitId(A, g) && !isNodeId(A, g) ? g : '';
}
/* مديرُ الإدارة الأم يدير أقسامَها (خطة التوحيد): حسابُ الإدارة أو حاملُ الشارة في الإدارة الأم — وموظفوها العاديون خارج القسم */
function secMgrOf(A, d) {
  var u = A.u, p = secParentOf(A, d); if (!p || !u) return false;
  if (u.role === 'dept') return u.deptId === p;
  return u.role === 'staff' && !!u.mgr && u.deptId === p;
}
function deptInScope(A, d) {
  var u = A.u;
  if (u.role === 'super') return true;
  /* AD-7: النطاقُ وحداتُ بياناتٍ وحدها — لا عقدةٌ فوقية ولا معرّفٌ مجهول (ولا وحدةٌ حُذفت وبقي حسابُها) لأيّ دورٍ غير مدير النظام */
  if (!d || !isUnitId(A, d)) return false;
  if (u.role === 'dept' || u.role === 'staff') return u.deptId === d || secMgrOf(A, d);
  if (u.role === 'display') return u.deptId === d;   /* V7 · د5-هـ (x1): شاشةُ العرض — إدارتُها وحدها */
  /* كان يشترط أن تكون الإدارة ابناً مباشراً (dd.gid === u.gid) — فمدير القطاع
     يُرفض على كل إدارةٍ تحته، لأن أبناءه المباشرين إداراتٌ عامة لا إدارات.
     صار النطاق: عقدةُ المستخدم في سلسلة أسلاف الإدارة بأيّ عمق — وعقدتُه عقدةٌ فوقيةٌ قائمة (حسابُ gm معرّفُ عقدته معرّفُ وحدة لا يرث شيئاً) */
  if (u.role === 'gm') return !!u.gid && isNodeId(A, u.gid) && ancChain(A, d).indexOf(u.gid) !== -1;
  return false;
}
/* ══ شكلُ سجلّي الهيكل (الأقسام · AD-7) — قاعدةُ الموضع على الخادم ══════════
   مشّاءٌ واحدٌ للسجلّين: أبُ المعرّف بترتيب ancParentOf (العقدُ أولاً ثم الوحدات)، وأولُ سجلٍّ بالمعرّف هو المعتمد.
   القائمتان: ما تحمله الحفظةُ نفسُها لكلٍّ منهما (A.__regNext — 054) وإلا المخزَّن. يُفحص المضافُ والمتغيّرُ وحدَه. */
function shapeFirst(L) { var m = nmap(); (Array.isArray(L) ? L : []).forEach(function (x) { if (isObj(x) && x.id != null && x.id !== '' && !m[String(x.id)]) m[String(x.id)] = x; }); return m; }
function shapeCount(L) { var m = nmap(); (Array.isArray(L) ? L : []).forEach(function (x) { if (isObj(x) && x.id != null && x.id !== '') m[String(x.id)] = (m[String(x.id)] || 0) + 1; }); return m; }
function shapeList(A, k) { var X = A.__regNext; return X && Array.isArray(X[k]) ? X[k] : (k === K_GDEPTS ? A.nodes : A.depts); }
function shapeRef(x, f) { return x[f] == null || x[f] === '' ? '' : String(x[f]); }
function shapeUp(N, U, c) { if (N[c]) return shapeRef(N[c], 'pid'); if (U[c]) return shapeRef(U[c], 'gid'); return ''; }
function shapeLoop(N, U, id, p) { var seen = nmap(), c = p, n = 0; seen[id] = 1; while (c) { if (seen[c] || ++n > 64) return true; seen[c] = 1; c = shapeUp(N, U, c); } return false; }
function shapeDiff(b, a) {
  var old = shapeFirst(a), cb = shapeCount(b), ca = shapeCount(a), ch = [], dup = false, q;
  for (q in cb) if (cb[q] > 1 && cb[q] > (ca[q] || 0)) dup = true;
  b.forEach(function (r) { if (!isObj(r)) return; var o = r.id != null ? old[String(r.id)] : null; if (!o || !deq(o, r)) ch.push(r); });
  return { old: old, ch: ch, dup: dup };
}
/* bassam_depts_v1: kind غائبٌ أو «قسم» أو «إدارة» · أبو القسم إدارةٌ قائمة (لا قسمٌ ولا عقدة) · لا شيءَ تحت قسم · لا دورة ·
   ولا تُحذف إدارةٌ وأقسامُها باقية ⇒ «dept-shape». ووحدةٌ مضافةٌ أو متغيّرةٌ معرّفُها معرّفُ عقدة ⇒ «id-clash» (AD-7). */
function deptShapeWhy(A, newJson, curJson, rst) {
  var b = parseJson(newJson, null), a = parseJson(curJson, null), i, r;
  if (!Array.isArray(b)) return '';
  var S = shapeDiff(b, a); if (S.dup) return 'dept-shape';
  var U = shapeFirst(b), N = shapeFirst(shapeList(A, K_GDEPTS));
  var isSec = function (x) { return isObj(x) && x.kind === DEPT_SEC_KIND; };
  /* RISHAD266 (قرار المالك): لا تختفي وحدةٌ بحفظٍ عاديّ — الحذفُ ذرّيٌّ في الخادم (/api/admin/dept-delete لمدير المنصة: ينظّف الحسابات والمفاتيح ويرفض
     إدارةً لها أقسام). وإدارةٌ لها أقسامٌ في السجل المخزَّن لا تُحذف ولو حُذفت أقسامُها معها في الحفظة نفسِها (لا حذفَ متتابع). الاستعادةُ الكاملة لقطةٌ لا حذف */
  if (!(rst && A.__srvRst) && !A.__udel) for (var oq in S.old) if (!U[oq]) return (a || []).some(function (x) { return isSec(x) && shapeRef(x, 'gid') === oq; }) ? 'dept-has-sections' : 'unit-delete-route';
  for (i = 0; i < S.ch.length; i++) {
    r = S.ch[i];
    var id = String(r.id == null ? '' : r.id), g = shapeRef(r, 'gid');
    if (id && (N[id] || (A.__batchNodes && A.__batchNodes[id]))) return 'id-clash';
    if (Object.prototype.hasOwnProperty.call(r, 'kind') && r.kind !== DEPT_SEC_KIND && r.kind !== DEPT_UNIT_KIND) return 'dept-shape';
    if (g && isSec(U[g])) return 'dept-shape';
    if (isSec(r)) {
      if (!g || !isObj(U[g]) || N[g]) return 'dept-shape';
      if (b.some(function (x) { return isObj(x) && shapeRef(x, 'gid') === id; })) return 'dept-shape';
      for (var nq in N) if (shapeRef(N[nq], 'pid') === id) return 'dept-shape';
    } else if (id && !S.old[id] && !rst) {
      for (var nq2 in N) if (shapeRef(N[nq2], 'pid') === id) return 'dept-shape';
    }
    if (shapeLoop(N, U, id, g)) return 'dept-shape';
  }
  for (i = 0; i < b.length; i++) { r = b[i]; if (isSec(r) && shapeRef(r, 'gid') && S.old[shapeRef(r, 'gid')] && !U[shapeRef(r, 'gid')]) return 'dept-shape'; }
  return '';
}
/* bassam_gdepts_v1: عقدةٌ مضافةٌ أو متغيّرةٌ معرّفُها معرّفُ وحدة ⇒ «id-clash»؛ وحين يتغيّر موضعُها: لا تحت وحدة بيانات (إلا عقدةً قديمةً
   تعيدها استعادة تحت إدارة) ولا أبٌ معلَّق ولا دورة ⇒ «dept-shape». وإعادةُ التسمية في الموضع نفسِه تمرّ. */
function nodeShapeWhy(A, newJson, curJson, rst) {
  var b = parseJson(newJson, null), a = parseJson(curJson, null), i, r;
  if (!Array.isArray(b)) return '';
  var S = shapeDiff(b, a); if (S.dup) return 'dept-shape';
  var N = shapeFirst(b), U = shapeFirst(shapeList(A, K_DEPTS)), BU = A.__batchUnits || nmap();
  if (!rst) { var rw = nodeRemoveWhy(A, S.old, N); if (rw) return rw; }
  for (i = 0; i < S.ch.length; i++) {
    r = S.ch[i]; if (r.id == null || r.id === '') continue;
    var id = String(r.id), p = shapeRef(r, 'pid'), o = S.old[id];
    if (U[id] || BU[id] || isUnitId(A, id)) return 'id-clash';
    if (o && shapeRef(o, 'pid') === p) continue;
    if (p && (U[p] || BU[p]) && !(rst && U[p] && U[p].kind !== DEPT_SEC_KIND)) return 'dept-shape';
    if (p && !N[p] && !U[p] && !BU[p] && !rst) return 'dept-shape';
    if (shapeLoop(N, U, id, p)) return 'dept-shape';
  }
  return '';
}
/* V7 P0: removing a node is judged on the graph the save leaves behind (both registries as the batch leaves them — shapeList), not on the
   changed rows only (the removed rows were never looked at, so a direct save could orphan children past the client's guard):
   · no node or data unit may still point at a removed node ⇒ «node-has-children» (move them first);
   · no node of the stored graph may be removed together with its removed parent ⇒ «node-cascade» (no chained delete in one save);
   · no general-manager account may still be bound to a removed node ⇒ «node-has-manager» (remove the account first).
   An empty node is removed as before. A restore (rst) keeps its own path. Old dangling references the save did not create are left alone. */
function nodeRemoveWhy(A, old, N) {
  var G = nmap(), any = false, q, i;
  for (q in old) if (!N[q]) { G[q] = 1; any = true; }
  if (!any) return '';
  for (q in N) if (G[shapeRef(N[q], 'pid')]) return 'node-has-children';
  var L = shapeList(A, K_DEPTS) || [];
  for (i = 0; i < L.length; i++) if (isObj(L[i]) && G[shapeRef(L[i], 'gid')]) return 'node-has-children';
  for (q in old) if (G[q] && G[shapeRef(old[q], 'pid')]) return 'node-cascade';
  var us = Array.isArray(A.users) ? A.users : [];
  for (i = 0; i < us.length; i++) if (isObj(us[i]) && us[i].role === 'gm' && G[shapeRef(us[i], 'gid')]) return 'node-has-manager';
  return '';
}
/* V7 · issue #4 — a node's ceiling records live and die with the node (the unit counterpart is the atomic unit delete: 019e rsWipeRoute).
   bassam_perms_v1 holds a node's ceiling in caps · subs · lenses [<id>] and its capOwn[<id>] flag. Judged on the node registry as this
   save leaves it (gNew) against the stored one (gCur) — only when the node rules above accepted the save (054 applySave):
   · a node the save removes: its records go in the same save (nodeRemoveWhy decides whether it may be removed at all);
   · a node the save adds (the id did not exist before — an import, a restore, a re-used id):
       – the save CARRIES a record for it (pNew holds one, equal to the stored record or not) ⇒ kept exactly as sent. An import brings a
         node back with its ceiling (owner decision); the server cannot tell «copied along» from «decided», and taking a restrictive
         record away would silently open every unit under the node that has no record of its own (021 effCapOf: absence = open);
       – the save carries no record for it ⇒ a record stored before it is a leftover of a deleted node and is dropped — but only for a
         node with nothing under it in the graph this save leaves (a node made by hand is always empty). A node that arrives with
         children keeps the stored record: fail-closed, the same reason.
   The verified server restore (rst) that brings its own registry (pNew) keeps it verbatim. An id that is a data unit is never touched.
   pNew = the registry this save writes (null: it carries none) · pCur = the stored one. Returns
   { v: the registry to write instead (pNew if carried, else pCur) without those records — null when nothing changes ·
     couple: this save writes a record for a node it adds ⇒ both registries are written together or not at all (otherwise a retried
     structure would find its own fresh record «stored before it») }. The capOwn map itself stays, even empty (021 capOwnWhy). */
var NODE_CAP_MAPS = ['caps', 'subs', 'lenses', 'capOwn'];
function nodeCapRec(P, id) {
  var r = {}, n = 0;
  NODE_CAP_MAPS.forEach(function (f) { if (isObj(P[f]) && Object.prototype.hasOwnProperty.call(P[f], id)) { r[f] = P[f][id]; n++; } });
  return n ? r : null;
}
function nodeHasKids(id, N, L) {
  for (var q in N) if (shapeRef(N[q], 'pid') === id) return true;
  for (var i = 0; i < L.length; i++) if (isObj(L[i]) && shapeRef(L[i], 'gid') === id) return true;
  return false;
}
function nodeCapSweep(A, gNew, gCur, pNew, pCur, rst) {
  var out = { v: null, couple: false }, b = parseJson(gNew, null), a = parseJson(gCur, null);
  if (!Array.isArray(b)) return out;
  var S = parseJson(pCur, null), P = pNew == null ? null : parseJson(pNew, null);
  if (!isObj(S)) S = {};
  if (pNew != null && !isObj(P)) return out;
  var L = shapeList(A, K_DEPTS) || [], N = shapeFirst(b), O = shapeFirst(a), U = shapeFirst(L), T = P || S, drop = [], q, rs, rp;
  for (q in N) if (!O[q] && !U[q]) {
    rs = nodeCapRec(S, q); rp = P ? nodeCapRec(P, q) : null;
    if (rp) out.couple = true;
    else if (rs && !P && !nodeHasKids(q, N, L)) drop.push(q);
  }
  /* a removal the node rules did not check (a restore-flagged save skips nodeRemoveWhy) may leave units pointing at the node:
     its record then still ceilings them — dropped only when nothing in the graph this save leaves points at it (fail-closed) */
  if (!(rst && P)) for (q in O) if (!N[q] && !U[q] && nodeCapRec(T, q) && !nodeHasKids(q, N, L)) drop.push(q);
  if (!drop.length) return out;
  var R = Object.assign({}, T), hit = false;
  NODE_CAP_MAPS.forEach(function (f) {
    if (!isObj(T[f])) return;
    var m = null;
    drop.forEach(function (id) { if (Object.prototype.hasOwnProperty.call(T[f], id)) { m = m || Object.assign({}, T[f]); delete m[id]; } });
    if (m) { R[f] = m; hit = true; }
  });
  if (hit) out.v = JSON.stringify(R);
  return out;
}
/* ══ مديرُ الإدارة يعيد تسميةَ أقسام إدارته (F01 · خطة التوحيد) ══
   V7 · د5-هـ (44) (قرار المالك): الأقسامُ يضيفها مديرُ المنصة من «الإدارات» وحده — لا قسمَ جديداً من غيره (كان مديرُ الإدارة الأم يُنشئه).
   غيرُ مدير النظام يكتب سجلَّ الوحدات بشرطٍ واحد: كلُّ ما تغيّر قسمٌ قائمٌ أُعيدت تسميتُه تحت إدارةٍ يديرها هو (isMgrOf — وليست قسماً)،
   وما سواه كما خُزِّن حرفاً: لا إضافةَ ولا حذفَ (الحذفُ ذرّيٌّ في الخادم: /api/admin/dept-delete لمدير النظام) ولا نقلَ ولا إدارةٌ جديدة. ثم قاعدةُ الشكل كاملةً. */
function deptSecMgrWhy(A, newJson, curJson) {
  var b = parseJson(newJson, null), a = parseJson(curJson, []), i;
  if (!Array.isArray(b)) return 'super';
  var B = shapeFirst(b), O = shapeFirst(a), q;
  for (q in O) if (!B[q]) return 'super';
  if (b.length < (Array.isArray(a) ? a.length : 0)) return 'super';
  for (i = 0; i < b.length; i++) {
    var r = b[i]; if (!isObj(r) || r.id == null || r.id === '') return 'super';
    var o = O[String(r.id)]; if (o && deq(o, r)) continue;
    if (!o) return 'super';                                                     /* V7 · د5-هـ (44): إنشاءُ قسمٍ لمدير المنصة وحده */
    if (r.kind !== DEPT_SEC_KIND) return 'super';
    var g = shapeRef(r, 'gid'); if (!g || isNodeId(A, g)) return 'dept-shape';
    var p = (A.depts || []).filter(function (x) { return isObj(x) && String(x.id) === g; })[0];
    /* RISHAD266 (قرار المالك): القسمُ يضيفه مديرُ إدارته الأم نفسُها (حسابُ الإدارة أو مديرٌ بشارةٍ فيها) أو مديرُ المنصة — لا مديرُ عقدةٍ أعلى (gm) ولا مديرُ قسم */
    if (!p || p.kind === DEPT_SEC_KIND || String(A.u.deptId || '') !== g || !(A.u.role === 'dept' || (A.u.role === 'staff' && A.u.mgr))) return 'mgr';
    if (o && (o.kind !== DEPT_SEC_KIND || shapeRef(o, 'gid') !== g || !eqExcept(o, r, ['name']))) return 'super';
    if (typeof r.name !== 'string' || !r.name.trim() || r.name.length > 120) return 'shape';
    if (!o && Object.keys(r).some(function (f) { return ['id', 'name', 'gid', 'kind'].indexOf(f) === -1; })) return 'shape';
  }
  return deptShapeWhy(A, newJson, curJson, false);
}
function isMgrOf(A, d) {
  var u = A.u;
  if (u.role === 'super') return true;
  if (!d || !isUnitId(A, d)) return false;                                      /* AD-7: الإدارةُ على وحدة بيانات وحدها */
  if (u.role === 'dept') return u.deptId === d || secMgrOf(A, d);
  if (u.role === 'staff') return !!u.mgr && (u.deptId === d || secMgrOf(A, d));
  if (u.role === 'gm') return deptInScope(A, d);
  return false;
}
/* رصد الميدان: موظف صلاحيته على المتابعة اليومية هي ورقة «رصد الميدان» وحدها (بلا كتابة على الجولات) —
   يكتب على جولة اليوم حقولَ الرصد فقط، وعلى الباب الذي يحوي مفتاحه فقط */
function dailyFieldOnly(A, d) {
  var u = A.u; if (u.role === 'super' || u.role === 'dept') return false;
  var ep = ((A.perms.emps || {})[d] || {})[u.ekey] || {}; var writes = [], field = false;
  Object.keys(ep).forEach(function (k) { if (String(k).split('/')[0] !== 'daily' || !capOnDept(A, d, k)) return; var acts = ep[k] || []; if (k === 'daily/field' && acts.length) field = true; if (k !== 'daily/field' && acts.some(function (a) { return WRITE_ACTS[a]; })) writes.push(k); });
  return field && !writes.length;
}
function anyWriter(A) { return enfAnyWriter(A); }   /* KIVO_243 · V7 · د5-ح (القفل): المحرّكُ النافذ وحده */
