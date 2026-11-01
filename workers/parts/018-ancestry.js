/* ══ سلسلة الأسلاف على الخادم ══════════════════════════════════════════════
   أبُ الإدارة حقل gid، وأبُ العقدة الفوقية حقل pid. والمشي صعوداً محدودٌ بـ64
   خطوة: سجلٌّ تالفٌ يدور على نفسه يجب أن يتوقّف لا أن يعلّق الطلب. */
function ancChain(A, d) {
  var out = [], seen = {}, n = 0;
  var dd = (A.depts || []).filter(function (x) { return x && x.id === d; })[0];
  var c = dd ? (dd.gid || '') : '';
  while (c && !seen[c] && n++ < 64) {
    seen[c] = 1; out.push(c);
    var nd = (A.nodes || []).filter(function (x) { return x && x.id === c; })[0];
    c = nd ? (nd.pid || '') : '';
  }
  return out;
}
function deptInScope(A, d) {
  var u = A.u;
  if (u.role === 'super') return true;
  if (u.role === 'dept' || u.role === 'staff') return !!d && u.deptId === d;
  /* كان يشترط أن تكون الإدارة ابناً مباشراً (dd.gid === u.gid) — فمدير القطاع
     يُرفض على كل إدارةٍ تحته، لأن أبناءه المباشرين إداراتٌ عامة لا إدارات.
     صار النطاق: عقدةُ المستخدم في سلسلة أسلاف الإدارة بأيّ عمق. */
  if (u.role === 'gm') return !!d && !!u.gid && ancChain(A, d).indexOf(u.gid) !== -1;
  return false;
}
function isMgrOf(A, d) {
  var u = A.u;
  if (u.role === 'super') return true;
  if (u.role === 'dept') return u.deptId === d;
  if (u.role === 'staff') return !!u.mgr && u.deptId === d;
  if (u.role === 'gm') return deptInScope(A, d);
  return false;
}
/* الصفحات التي يملك فيها فعل كتابة داخل إدارة d */
function writePages(A, d) {
  var u = A.u, caps = (A.perms.caps || {})[d]; caps = Array.isArray(caps) ? caps : [];
  /* وحدة مطفأة على مستوى المنصة: لا تُكتب صفحاتها من أحد — حتى لو بقيت في سقف الإدارة */
  if (A.off && A.off.length) caps = caps.filter(function (k) { return A.off.indexOf(k) === -1; });
  if (u.role === 'super') return null;                       /* بلا حدود */
  if (u.role === 'dept') return caps.slice();
  /* مدير الإدارة (مفتاحه mgr:<did>) يرث سقف إدارته ما لم تُخزَّن له ورقةُ
     صلاحياتٍ صراحةً — مطابقةً لقاعدة myPerms في المتصفّح. بدونها كان الخادم
     يرفض كتابته بصمت فيظهر له كل شيء ولا يُحفظ منه شيء. */
  var sheet0 = ((A.perms.emps || {})[d] || {})[u.ekey];
  var hasSheet0 = !!(sheet0 && typeof sheet0 === 'object');
  if (u.role === 'staff' && String(u.ekey || '').slice(0, 4) === 'mgr:' && !hasSheet0) return caps.slice();
  var ep = sheet0 || {};
  /* مفاتيح الأوراق «pk/sk» تُنسب إلى صفحتها الحاوية */
  var out = {};
  Object.keys(ep).forEach(function (k) { var pk = String(k).split('/')[0]; if (caps.indexOf(pk) !== -1 && (ep[k] || []).some(function (a) { return WRITE_ACTS[a]; })) out[pk] = 1; });
  return Object.keys(out);
}
/* رصد الميدان: موظف صلاحيته على المتابعة اليومية هي ورقة «رصد الميدان» وحدها (بلا كتابة على الجولات) —
   يكتب على جولة اليوم حقولَ الرصد فقط، وعلى الباب الذي يحوي مفتاحه فقط */
var FIELD_KEYS = { fst: 1, flow: 1, fAt: 1, fBy: 1, fKind: 1, fLog: 1, closed: 1, off: 1, cAt: 1, cAtMs: 1, cWhy: 1, cBy: 1 };
/* الرصد يجري على موقع تسكين الموظف أياً كان نوعه: باب · مصلى · معلم */
var FIELD_KINDS = { gates: 1, zones: 1, marks: 1 };
function dailyFieldOnly(A, d) {
  var u = A.u; if (u.role === 'super' || u.role === 'dept') return false;
  var ep = ((A.perms.emps || {})[d] || {})[u.ekey] || {}; var writes = [], field = false;
  Object.keys(ep).forEach(function (k) { if (String(k).split('/')[0] !== 'daily') return; var acts = ep[k] || []; if (k === 'daily/field' && acts.length) field = true; if (k !== 'daily/field' && acts.some(function (a) { return WRITE_ACTS[a]; })) writes.push(k); });
  return field && !writes.length;
}
function pickIdx(arr, seg) { if (!Array.isArray(arr)) return null; if (/^\d+$/.test(seg)) return arr[+seg] || null; var id = seg.slice(1, -1); return arr.filter(function (x) { return isObj(x) && (String(x.id) === id || String(x.eid) === id || String(x.key) === id || String(x.k) === id); })[0] || null; }
function fieldObsOnly(A, newVal, curVal) {
  var diffs = walkDiff(curVal, newVal); if (!diffs.length) return false;
  var NV = parseJson(newVal, null); if (!isObj(NV)) return false;
  return diffs.every(function (d) {
    var m = /^([^.]+)\.d\.(\d+|\[[^\]]*\])\.(gates|zones|marks)\.(\d+|\[[^\]]*\])\.([A-Za-z]+)(?:\..*)?$/.exec(d.p); if (!m || !FIELD_KINDS[m[3]] || !FIELD_KEYS[m[5]]) return false;
    var day = NV[m[1]]; var fl = day ? pickIdx(day.d, m[2]) : null; var g = fl ? pickIdx(fl[m[3]], m[4]) : null;
    return !!(g && Array.isArray(g.emp) && g.emp.indexOf(A.u.ekey) !== -1);
  });
}
function anyWriter(A) {
  if (A && A.enf) return enfAnyWriter(A);                                     /* KIVO_243 */
  var u = A.u;
  if (u.role === 'super' || u.role === 'dept') return true;
  if (u.role === 'staff') return writePages(A, u.deptId).length > 0;
  /* وهنا أيضاً: الفرع كله لا الأبناء المباشرين — وإلا حُسب مدير القطاع «لا يكتب
     شيئاً» فرُفض طلبه قبل أن يُفحص مفتاحٌ واحد */
  if (u.role === 'gm') return A.depts.some(function (d) { return d && deptInScope(A, d.id) && writePages(A, d.id).length > 0; });
  return false;
}
function empKeyOf(e) { return (e && (e.eid || e.nid || e.name)) || ''; }
/* الموظف يعدّل بريده في سجلّه هو فقط (صفحة حسابي) */
function selfEmailOnly(A, newJson, curJson) {
  var a = parseJson(curJson, null), b = parseJson(newJson, null);
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !A.u.ekey) return false;
  var hits = 0;
  for (var i = 0; i < a.length; i++) {
    if (deq(a[i], b[i])) continue;
    if (String(empKeyOf(a[i])) !== String(A.u.ekey) || !eqExcept(a[i], b[i], ['email'])) return false;
    hits++;
  }
  return hits <= 1;
}
/* مهام الموظف: يقبل مهمته ويعتذر عنها وينهيها بتوثيقها — على صفّه هو وحده، وبحقوله وحدها.
   لا يضيف صفاً ولا يحذفه ولا يمسّ عنوان المهمة ولا وقتها ولا إسنادها. */
var TASK_SELF = { 3: 1, 6: 1, 11: 1, 12: 1, 20: 1, 21: 1 };
var TASK_ST = { pending: 1, in_progress: 1, done: 1, declined: 1 };
function selfTaskOnly(A, newJson, curJson) {
  var a = parseJson(curJson, null), b = parseJson(newJson, null);
  /* KIVO_264 · KIVO-Tasks (الرقعة 06): كتابةُ الذات على مخزن المهام من المسار الذاتي وحده (POST /api/me/tasks/act — 062c يسِم الفاعلَ في الخادم
     A.__tkSelf ولا يصل إليه مدخلٌ من الطلب). الحفظُ الخامّ /api/save ممّن يقرأ المخزن (task.view) كان يصنع «منجزة» وأداءً وطوابعَ بلا سياسة إثبات
     ولا مراجِع (ق2 · ق3) — يُرفض الآن ما لم يملك صاحبُه مفاتيحَ الفعل نفسَها */
  if (!isObj(a) || !isObj(b) || !A.u.ekey || !A.__tkSelf) return false;
  var ks = {}, k, hits = 0;
  Object.keys(a).forEach(function (x) { ks[x] = 1; }); Object.keys(b).forEach(function (x) { ks[x] = 1; });
  for (k in ks) {
    var x = a[k], y = b[k];
    if (deq(x, y)) continue;
    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return false;   /* لا إضافة ولا حذف */
    for (var i = 0; i < x.length; i++) {
      var r0 = x[i], r1 = y[i];
      if (deq(r0, r1)) continue;
      if (!Array.isArray(r0) || !Array.isArray(r1)) return false;
      if (String(r0[14] == null ? '' : r0[14]) !== String(A.u.ekey)) return false;        /* ليست مهمّته */
      if (r0[3] === 'done' || r0[3] === 'declined') return false;                          /* المنتهية لا تُمسّ */
      if (!TASK_ST[String(r1[3])]) return false;
      var n = Math.max(r0.length, r1.length);
      for (var j = 0; j < n; j++) {
        if (TASK_SELF[j]) continue;
        var v0 = r0[j] === undefined ? null : r0[j], v1 = r1[j] === undefined ? null : r1[j];
        if (!deq(v0, v1)) return false;
      }
      if (++hits > 12) return false;
    }
  }
  return hits > 0;
}
/* KIVO_265 · H-1 (المراجعةُ المستقلة لدمج 265 — عالٍ · بالوضعين): العمودُ 23 (x — حقولُ الإدارة) في مخزن المهام يكتبه الخادمُ وحده.
   كان محرّكُ التكرار (073) يكتب باسم x.by.u المخزَّن، وحاملُ task.edit يعيد كتابةَ x بحفظٍ خامّ /api/save ⇒ نسخٌ «باسم مدير النظام».
   حقولُه كلُّها للخادم (x كلُّها تُقارَن حرفاً — وما لم يُعدَّ هنا كذلك): v · by المنشئ · pol سياسةُ الإثبات · rv المراجِع · dec · needs · elig ·
   ext التمديد · rev/revh قرارُ المراجعة · asg/can/re/from الإلغاءُ وإعادةُ الإسناد · rec التكرار · idem · det · relink.
   تُكتب من مسارات /api/tasks/* ومن التكرار وحدها بوسمِ الخادم A.__tkSrv (071 tkSrvMark — كوسم الذات __tkSelf: الفاعلُ يُبنى في الخادم
   من الجلسة ولا يصل إليه مدخلٌ من الطلب). الحفظُ الخامّ — مهما كانت صلاحيةُ صاحبه، مديرُ النظام أيضاً — يحمل x كلِّ صفٍّ كما هي حرفاً
   أو يحذف الصفَّ كلَّه: إضافتُها · تغييرُها · نسخُها إلى صفٍّ آخر · نزعُها عن صفٍّ باقٍ ⇒ رفضٌ 'task-x'. ويُستثنى وحده الاستعادةُ المخوَّلة
   (taskSrvExempt: الإنفاذ ctx.enf.restore بعد سياسة enfSavePrep · القديم ctx.rst = علامةُ الاستعادة في الحفظة — 054 applySave).
   المراجعةُ الموحّدة (R-8 — منخفض): x صفِّها هو بهويته (13 · 14) — كانت المطابقةُ بـ13 وحدها فتتبادل صفوفُ هويةٍ مشتركة (المجموعاتُ القديمة) x
   بحفظٍ خامّ (يُفتح الملغى ويُلغى غيرُه) أو تُنزع بتغيير المكلَّف. صفُّ الهوية الوحيد يبقى صفَّها وإن تغيّر مكلَّفُه (نموذجُ التعديل قبل النشاط — R-1).
   a/b القيمتان محلَّلتين (المخزَّنة · الواردة) ⇒ '' مقبول أو 'task-x' */
/* الاستثناءُ الوحيد من أحكام الحفظ الخامّ لمخزن المهام (H-1 · R-1 · R-2): وسمُ الخادم · والاستعادةُ المخوَّلة — في الإنفاذ بسياستها (X.restore)،
   وفي القديم بعلامتها لمدير النظام ولمدير الإدارة نفسِها (isMgrOf — المراجعةُ الموحّدة R-5: كانت لمدير النظام وحده فتُرفض استعادةُ مدير الإدارة
   نسخةَ إدارته — ومعها سجلُّ الموظفين ذرّياً — وكانت تمضي في 264؛ ومرآةُ سياسة الإنفاذ: «لمدير النظام أو لمدير الإدارة الممنوح مفتاحها»).
   إعادةُ المراجعة (N-6): والعلامةُ على مفتاح المهام نفسِه (ctx.rst لكل مفتاح — 054) بالوضعين — كانت علامةُ أيّ مفتاحٍ في الحفظة تستثنيه */
function taskSrvExempt(A, d, ctx) {
  if (A && A.__tkSrv) return true;
  if (!(ctx && ctx.rst)) return false;
  if (ctx.enf) return !!ctx.enf.restore;                                             /* الإنفاذ: سياسةُ الاستعادة (المفتاحُ · السببُ · النسخةُ قبلها) */
  /* KIVO_265 · F-2/R-21 (RBAC_AUDIT_265 — بديلُ R-21 الموصى به): في القديم العلامةُ يدّعيها العميل فلا تُقبل إلا لمدير النظام — كان مديرُ الإدارة (ومعه
     staff+mgr وgm على فرعه · F-4) يزوّر بها العمودَ 23 (صاحبَ سلسلة تكرارٍ يكتب الخادمُ نُسخَها باسمه). استعادةُ مدير الإدارة لمهام إدارته تُرفض كما في acf31dc */
  return !!(A && A.u && A.u.role === 'super');
}
function taskXRows(S) {
  var o = nmap(), dk, L, i, r, id;                                                   /* بلا نموذجٍ أب: هويةُ صفٍّ «__proto__» مفتاحٌ عاديّ */
  if (!isObj(S)) return o;
  for (dk in S) {
    L = S[dk]; if (!Array.isArray(L)) continue;
    for (i = 0; i < L.length; i++) {
      r = L[i]; if (!Array.isArray(r)) continue;
      /* صفٌّ بلا هوية (13) لا يُعفى: صفوفُه تحت هويةٍ محجوزةٍ واحدة — وإلا حمل x مزوَّرةً (سلسلةً بمعرّفٍ حقيقيٍّ وإصدارٍ أعلى تصير نموذجَها في 073) */
      id = r[13] == null ? '\u0000' : String(r[13]); (o[id] = o[id] || []).push({ x: r.length > 23 && r[23] != null ? r[23] : null, e: String(r[14] == null ? '' : r[14]), u: 0, r: r });
    }
  }
  return o;
}
function taskXWhy(A, a, b, d, ctx) {
  if (taskSrvExempt(A, d, ctx)) return '';
  if (!isObj(b)) return '';
  var O = taskXRows(a), N = taskXRows(b), id, i, j;
  /* إعادةُ المراجعة (N-1 — انحدارٌ من R-8): تنظيفُ حذف الموظف (040 tasksGoneOk) يفرّغ مكلَّفَ صفوف المحذوف ويُبقي x في موضعها — فصفُّه (13 · المحذوف)
     هو صفُّ (13 · '') في الحفظة. كانت مطابقةُ المكلَّف نفسِه في الهوية المشتركة (المجموعاتُ القديمة) ترفضه 'task-x' فيُرفض حذفُ الموظف ذرّياً */
  var same = function (oe, ne) { return oe === ne || (ne === '' && goneKey(ctx, oe)); };
  for (id in N) {
    var nl = N[id], ol = O[id] || [], one = ol.length === 1 && nl.length === 1;
    for (i = 0; i < nl.length; i++) {
      if (nl[i].x == null) continue;
      var hit = -1;
      for (j = 0; j < ol.length && hit < 0; j++) if (!ol[j].u && ol[j].x != null && ol[j].e === nl[i].e && deq(ol[j].x, nl[i].x)) hit = j;   /* صفُّه بعينه أولاً */
      for (j = 0; j < ol.length && hit < 0; j++) if (!ol[j].u && ol[j].x != null && (one || same(ol[j].e, nl[i].e)) && deq(ol[j].x, nl[i].x)) hit = j;
      if (hit < 0) return 'task-x';                                                 /* x جديدة · معدَّلة · منسوخةٌ إلى صفٍّ آخر أو مكلَّفٍ آخر في هويةٍ مشتركة */
      ol[hit].u = 1;
    }
  }
  for (id in O) {                                                                    /* نزعُ x عن صفٍّ باقٍ */
    var ol2 = O[id], nl2 = N[id]; if (!nl2) continue;                                /* حُذفت صفوفُ الهوية كلُّها ⇒ حذفٌ لا نزع */
    var one2 = ol2.length === 1 && nl2.length === 1, oe = nmap();
    for (j = 0; j < ol2.length; j++) oe[ol2[j].e] = 1;
    for (i = 0; i < ol2.length; i++) {
      if (ol2[i].x == null || ol2[i].u) continue;
      /* صفُّه (13 · 14) في الحفظة بلا x · أو صفُّ الهوية الوحيد · أو مكلَّفٌ جديدٌ في هويةٍ مشتركة بلا x (نُقل الصفُّ وسقطت x — R-8) */
      for (j = 0; j < nl2.length; j++) if (nl2[j].x == null && (one2 || nl2[j].e === ol2[i].e || !oe[nl2[j].e])) return 'task-x';
    }
  }
  return '';
}
/* KIVO_265 · المراجعةُ الموحّدة (R-1 — عالٍ · بالوضعين): RC-13 في الخادم — مهمةٌ بدأها الموظفُ أو أنهاها أو اعتذر عنها أو أغلقها الخادم (070 tkRowActive)
   لا يُغيَّر مكلَّفُها بالحفظ الخامّ: لا يدخل هويتَها (13) مكلَّفٌ جديد — ولا تُنزع منه (مهمةٌ عامة بإثبات غيره) — وإعادةُ الإسناد بمسارها
   (/api/tasks/reassign: نسخةٌ جديدة ويبقى سجلُّ الأول وإثباتُه). كان الحكمُ في صفحة «المهام» وحدها على نسختها (_tkHasActivity) فيمرّ تعديلُ نسخةٍ
   قديمة، ويُركّب دمجُ 280 (merge3) الصفَّ: المكلَّفُ الجديد مع «تم» الأول وإثباته — فيقرأ الزميلُ صورتَه (P0) ويختفي «تم» صاحبه (F-10) ⇒ 'task-asg'.
   «النشاطُ» لصفٍّ مسنَد (14 غيرُ فارغ — كالواجهة). ويمضي: تنظيفُ حذف الموظف (040 tasksGoneOk: إسنادُ المحذوف في الدفعة نفسِها يُفرَّغ) ·
   مساراتُ الخادم والاستعادةُ المخوَّلة (taskSrvExempt).
   R-7 (منخفض): ولا يصير المكلَّفُ الجديدُ مراجِعَ المهمة نفسَه (x.rv.e) فيعتمد تسليمَه بنفسه ⇒ 'task-rv' (والمساراتُ في 071 تمنعه) */
function taskAsgRows(S) {
  var o = nmap(), dk, L, i, r, id, e, x;
  if (!isObj(S)) return o;
  for (dk in S) {
    L = S[dk]; if (!Array.isArray(L)) continue;
    for (i = 0; i < L.length; i++) {
      r = L[i]; if (!Array.isArray(r)) continue;
      id = r[13] == null ? '\u0000' : String(r[13]); e = String(r[14] == null ? '' : r[14]);
      var g = o[id] || (o[id] = { n: nmap(), act: nmap(), rows: [] });
      g.n[e] = (g.n[e] || 0) + 1; if (e && tkRowActive(r)) g.act[e] = (g.act[e] || 0) + 1;
      x = r.length > 23 && isObj(r[23]) ? r[23] : null; g.rows.push({ e: e, rv: x && isObj(x.rv) && x.rv.e != null ? String(x.rv.e) : '' });
    }
  }
  return o;
}
function taskAsgWhy(A, a, b, d, ctx) {
  if (taskSrvExempt(A, d, ctx) || !isObj(b)) return '';
  var O = taskAsgRows(a), N = taskAsgRows(b), id, e, i;
  for (id in N) {
    var o = O[id], n = N[id], added = [], gone = true, act = 0;
    for (i = 0; i < n.rows.length; i++) if (n.rows[i].e && n.rows[i].rv && n.rows[i].e === n.rows[i].rv && (!o || (o.n[n.rows[i].e] || 0) < (n.n[n.rows[i].e] || 0))) return 'task-rv';
    if (!o) continue;                                                                /* هويةٌ جديدة: لا نشاطَ قائمٌ لها (وحسابُ مكلَّفها في taskAcctWhy) */
    for (e in n.n) if (n.n[e] > (o.n[e] || 0)) added.push(e);
    if (!added.length) continue;                                                     /* لا مكلَّفَ جديد (تعديلٌ أو حذف) */
    for (e in o.act) act += o.act[e];
    if (!act) continue;
    /* تنظيفُ حذف الموظف: المضافُ «بلا مكلَّف» وحده وكلُّ من خرج من الهوية موظفٌ محذوفٌ في الدفعة نفسِها */
    for (e in o.n) if ((n.n[e] || 0) < o.n[e] && !goneKey(ctx, e)) gone = false;
    if (gone && added.length === 1 && added[0] === '') continue;
    return 'task-asg';
  }
  return '';
}
/* KIVO_265 · المراجعةُ الموحّدة (R-2 — متوسط · بالوضعين): قاعدةُ الحساب النشط (قرارُ المالك 15:13 · البند 4: «تطبيق المنع في الخادم») على الحفظ
   الخامّ أيضاً — كلُّ مكلَّفٍ جديدٍ في الحفظة بهوية صفّه (13 · 14): صفٌّ جديد · تغييرُ المكلَّف · إسنادُ مهمةٍ عامة («قبولٌ نيابةً» في صفحة «المهام») ·
   التبويباتُ القديمة — حسابُه نشطٌ بالمعرّف الذي يُسند به (070 tkAcctTok) وإلا 'task-acct'. الصفوفُ القائمة بهويتها لا تُمسّ (ومنها صفوفُ من عُطِّل
   حسابُه بعد إسنادها) · ومساراتُ الخادم والاستعادةُ المخوَّلة (taskSrvExempt). ctx.tk = {users · emps} لإدارة المفتاح (054 applySave) */
function taskAcctWhy(A, a, b, d, ctx) {
  if (taskSrvExempt(A, d, ctx) || !isObj(b)) return '';
  var cnt = function (S) {                                                           /* المكلَّف ⇒ الهوية (13) ⇒ عددُ الصفوف */
    var o = nmap(), dk, L, i, r, t, id;
    if (!isObj(S)) return o;
    for (dk in S) {
      L = S[dk]; if (!Array.isArray(L)) continue;
      for (i = 0; i < L.length; i++) {
        r = L[i]; if (!Array.isArray(r) || r[14] == null || r[14] === '') continue;
        t = String(r[14]); id = r[13] == null ? '\u0000' : String(r[13]);
        var m = o[t] || (o[t] = nmap()); m[id] = (m[id] || 0) + 1;
      }
    }
    return o;
  };
  var O = cnt(a), N = cnt(b), tok, id, T = ctx && ctx.tk;
  for (tok in N) {
    var nw = false, om = O[tok] || nmap();
    for (id in N[tok]) if (N[tok][id] > (om[id] || 0)) { nw = true; break; }
    if (!nw) continue;
    if (!T) return 'task-acct';                                                      /* بلا سياقٍ لا حكمَ بالإيجاب (fail-closed) */
    if (!T.ix) T.ix = tkAcctIx(T.users, T.emps, d);                                  /* فهرسٌ واحدٌ للحفظة (إعادةُ المراجعة N-3) */
    if (tkAcctTok(null, null, d, tok, T.ix).st !== 'active') return 'task-acct';
    /* KIVO_265 · G-2 (تحقّقُ الخلفية — منخفض · بالوضعين): حفظةٌ تحمل سجلَّ الحسابات أيضاً ⇒ نشطٌ في القائمتين: قبل الدفعة (أعلاه) وبعدها (T.users2 — 054).
       كان تعطيلُ الحساب وإسنادُ مهمةٍ إليه في حفظةٍ واحدة يمضي (حساباتُ ما قبل الدفعة وحدها) */
    if (T.users2) { if (!T.ix2) T.ix2 = tkAcctIx(T.users2, T.emps, d); if (tkAcctTok(null, null, d, tok, T.ix2).st !== 'active') return 'task-acct'; }
  }
  return '';
}
/* إعادةُ المراجعة (N-5 — منخفض · P0): العمودان 20 و21 (الاستلامُ والاعتذارُ والتعثّر · التوثيقُ وصورُ الإثبات) ملكُ الموظف — يكتبهما المسارُ الذاتي
   (A.__tkSelf) ومساراتُ الخادم وحدها، وصفحةُ «المهام» تنسخهما مع الصفّ ولا تؤلّف فيهما (F-10). فالحفظُ الخامّ لا يزيد صفوفَ (13 · 14) التي تحملهما:
   كان حفظٌ مصنوعٌ ينقل صفَّ الموظف المنجزَ أو ينسخه إلى زميلٍ بهويةٍ جديدة (13) فيقرأ الزميلُ صورةَ إثباته ⇒ 'task-asg' (استعمل إعادةَ الإسناد)
   تحقّقُ 648242f (V-2 — منخفض · P0): ولا يزيد الحفظُ الخامّ معرّفاتِ الصور في 21 (imgs · h[].imgs) لأيّ مكلَّفٍ عمّا في الخادم لصفوفه كلِّها — فقراءةُ
   صورة الإثبات (062c meTkImg) بذكرها في 21 صفٍّ له. صفوفُ الهوية المطابَقة يعيد tkKeepSelf (054) عمودَيها من الخادم قبل الحكم؛ وكان الصفُّ القديمُ
   بلا هوية (13) — لا يطابقه — يحمل صورةَ زميلٍ أُضيفت إليه فيقرؤها صاحبُه ⇒ 'task-asg' */
function taskOwnWhy(A, a, b, d, ctx) {
  if (taskSrvExempt(A, d, ctx) || (A && A.__tkSelf) || !isObj(b)) return '';
  var ims = function (v, m) { if (Array.isArray(v)) for (var k = 0; k < v.length; k++) if (v[k] != null && v[k] !== '') m[String(v[k])] = 1; };
  var cnt = function (S) {                                                           /* 14 ⇒ { n: (13) ⇒ عددُ صفوفه التي تحمل 20 أو 21 · im: معرّفاتُ صور 21 في صفوفه } */
    var o = nmap(), dk, L, i, r, j;
    if (!isObj(S)) return o;
    for (dk in S) {
      L = S[dk]; if (!Array.isArray(L)) continue;
      for (i = 0; i < L.length; i++) {
        r = L[i]; if (!Array.isArray(r) || r[14] == null || r[14] === '' || !(r[20] || r[21])) continue;
        var q = String(r[14]), g = o[q] || (o[q] = { n: nmap(), im: nmap(), sub: 0, acc: 0 }), id = r[13] == null ? '\u0000' : String(r[13]); g.n[id] = (g.n[id] || 0) + 1;
        if (isObj(r[21])) { ims(r[21].imgs, g.im); if (Array.isArray(r[21].h)) for (j = 0; j < r[21].h.length; j++) if (isObj(r[21].h[j])) ims(r[21].h[j].imgs, g.im); if (r[21].sub) g.sub++; }
        if (r[11]) g.acc++;
      }
    }
    return o;
  };
  var O = cnt(a), N = cnt(b), e, id;
  for (e in N) {
    var og = O[e] || { n: nmap(), im: nmap(), sub: 0, acc: 0 };
    for (id in N[e].n) if (N[e].n[id] > (og.n[id] || 0)) return 'task-asg';
    for (id in N[e].im) if (!og.im[id]) return 'task-asg';                          /* V-2: صورةٌ ليست في صفوفه في الخادم */
  }
  /* KIVO_265 · حادثةُ الصور (سقيا زمزم): ولا يُنقص الحفظُ الخامّ توثيقَ الموظف في صفٍّ باقٍ له بهويته (13 · 14): صورةُ إثباتٍ في الخادم تغيب ·
     تسليمٌ (21.sub) أو بدءٌ (11) يُنزع — كان حفظُ مديرٍ من نسخةٍ قديمة لصفٍّ مكرّر الهوية (لا يحميه tkKeepSelf) يمحو العمودَ 21 فتُكنس الصورُ ⇒ 'task-own'.
     الهويةُ التي تغيّر مكلَّفُها (تنظيفُ حذف الموظف · إسنادُ العامة) أو غابت (حذف) ليست هنا: يحكمها taskAsgWhy وtaskDelWhy. والمكرّرةُ تُجمع: يكفي أن يبقى
     الإثباتُ في إحدى نسخها */
  var own = function (S) {
    var o = nmap(), dk, L, i, r, j, k;
    if (!isObj(S)) return o;
    for (dk in S) {
      L = S[dk]; if (!Array.isArray(L)) continue;
      for (i = 0; i < L.length; i++) {
        r = L[i]; if (!Array.isArray(r) || r[13] == null || r[14] == null || r[14] === '') continue;
        k = String(r[13]) + '|' + String(r[14]); var g = o[k] || (o[k] = { im: nmap(), sub: 0, acc: 0, n: 0 }); g.n++;
        if (isObj(r[21])) { ims(r[21].imgs, g.im); if (Array.isArray(r[21].h)) for (j = 0; j < r[21].h.length; j++) if (isObj(r[21].h[j])) ims(r[21].h[j].imgs, g.im); if (r[21].sub) g.sub = 1; }
        if (r[11]) g.acc = 1;
      }
    }
    return o;
  };
  var OA = own(a), NA = own(b), k;
  for (k in OA) {
    var ng = NA[k]; if (!ng) continue;
    for (id in OA[k].im) if (!ng.im[id]) return 'task-own';
    if (ng.sub < OA[k].sub || ng.acc < OA[k].acc) return 'task-own';
  }
  return '';
}
/* KIVO_265 · حادثةُ الصور (البند 5 من قائمة صفحة المهام): الحذفُ الفعليُّ (الصفُّ يغيب من المخزن) للأخطاء الحديثة وحدها — صفٌّ عليه نشاطٌ
   (قبولٌ · بدءٌ · توثيقٌ · تسليمٌ · إنجازٌ · اعتذارٌ · أغلقه الخادم) يبقى بسجلّه ويُلغى من قائمته ⇒ 'task-del'. الهويةُ (13) وحدها عبر الأيام كلِّها:
   نقلُ الصفّ إلى يومٍ آخر وتغييرُ مكلَّفه (تنظيفُ حذف الموظف · إسنادُ العامة — يحكمهما taskAsgWhy) ليسا حذفاً · ومساراتُ الخادم والاستعادةُ المخوَّلة
   معفاة (taskSrvExempt) · والحكمُ بعد taskOwnWhy فيبقى «نقلُ الإثبات إلى زميل» task-asg كما كان */
function tkRowActiveRaw(r) {
  var x = r.length > 23 && isObj(r[23]) ? r[23] : null;
  return !!(r[11] || r[12] || r[20] || r[21] || (r[3] && r[3] !== 'pending') || (x && (x.asg === 'cancelled' || x.asg === 'reassigned')));
}
function taskDelWhy(A, a, b, d, ctx) {
  if (taskSrvExempt(A, d, ctx) || (A && A.__tkSelf) || !isObj(a) || !isObj(b)) return '';
  var cnt = function (S, act) {
    var o = nmap(), dk, L, i, r, k;
    for (dk in S) {
      L = S[dk]; if (!Array.isArray(L)) continue;
      for (i = 0; i < L.length; i++) { r = L[i]; if (!Array.isArray(r) || r[13] == null) continue; if (act && !tkRowActiveRaw(r)) continue; k = String(r[13]); o[k] = (o[k] || 0) + 1; }
    }
    return o;
  };
  var O = cnt(a, true), N = cnt(b, false), k;
  for (k in O) if ((N[k] || 0) < O[k]) return 'task-del';
  return '';
}
/* أحكامُ الحفظ الخامّ لمخزن المهام بترتيبها (044 القديم · 060 الإنفاذ — قبل كلّ صلاحيةٍ ومسارٍ مختصر): العمودُ 23 · المكلَّفُ بعد النشاط · ملكُ الموظف ·
   الحسابُ النشط. TK_RAW_WHY: أسبابُها — على base قديمٍ تعارضٌ لا رفض (054 applySave · R-4) */
var TK_RAW_WHY = { 'task-x': 1, 'task-asg': 1, 'task-rv': 1, 'task-acct': 1, 'task-own': 1, 'task-del': 1 };
/* ═══ KIVO_265 · ملاحظةُ المالك (2026-10-19 · أمن): رقمُ الهوية ورقمُ الجوال والرقمُ الوظيفي لا تتكرّر — داخل الإدارة ولا عبر الإدارات
   كلها ولا مع حسابات الدخول (أسماءُ المستخدمين = هوية أو جوال). كان الفحصُ في العميل وحده (dupCheck في النموذج · seen* في الاستيراد
   بما في ذاكرة المتصفح من الإدارات الأخرى) فيمكن تجاوزُه بطلبٍ مصنوع أو بمتصفحٍ لا يحمل بياناتِ بقية الإدارات. القاعدةُ هنا على
   الخادم: الهوياتُ الجديدة أو المتغيّرة في هذه الدفعة (ليست في القيمة الحالية) تُرفض «emp-dup» إن وُجدت في إدارةٍ أخرى أو في حسابٍ
   خارج هذه الإدارة أو تكرّرت داخل الدفعة. القديمُ القائم لا يُحاسَب حتى لا يُقفل سجلٌّ موروث. ═══ */
function empIdents(rows) {
  var m = { n: {}, p: {}, o: {} };
  (Array.isArray(rows) ? rows : []).forEach(function (e) {
    if (!isObj(e)) return;
    var n = String(e.nid || '').trim(), p = String(e.phone || '').trim(), o = String(e.empno || '').trim();
    if (n) m.n[n] = 1; if (p) m.p[p] = 1; if (o) m.o[o] = 1;
  });
  return m;
}
function empDupWhy(A, a, b, d, ctx) {
  var E = ctx && ctx.ed; if (!E || !Array.isArray(b)) return '';
  var old = empIdents(a), seen = { n: {}, p: {}, o: {} }, other = { n: {}, p: {}, o: {} }, dd, i, e, n, p, o, m;
  for (dd in E.others) { if (dd === d) continue; m = empIdents(E.others[dd]); for (i in m.n) other.n[i] = 1; for (i in m.p) other.p[i] = 1; for (i in m.o) other.o[i] = 1; }
  (Array.isArray(E.users) ? E.users : []).forEach(function (u) {
    if (!isObj(u) || u.deptId === d) return;
    if (u.un) { other.n[String(u.un)] = 1; other.p[String(u.un)] = 1; }
    if (u.alt) { other.n[String(u.alt)] = 1; other.p[String(u.alt)] = 1; }
  });
  for (i = 0; i < b.length; i++) {
    e = b[i]; if (!isObj(e)) continue;
    n = String(e.nid || '').trim(); p = String(e.phone || '').trim(); o = String(e.empno || '').trim();
    if (n) { if (seen.n[n] && !old.n[n]) return 'emp-dup'; seen.n[n] = 1; if (!old.n[n] && other.n[n]) return 'emp-dup'; }
    if (p) { if (seen.p[p] && !old.p[p]) return 'emp-dup'; seen.p[p] = 1; if (!old.p[p] && other.p[p]) return 'emp-dup'; }
    if (o) { if (seen.o[o] && !old.o[o]) return 'emp-dup'; seen.o[o] = 1; if (!old.o[o] && other.o[o]) return 'emp-dup'; }
  }
  return '';
}
function taskRawWhy(A, a, b, d, ctx) { return taskXWhy(A, a, b, d, ctx) || taskAsgWhy(A, a, b, d, ctx) || taskOwnWhy(A, a, b, d, ctx) || taskDelWhy(A, a, b, d, ctx) || taskAcctWhy(A, a, b, d, ctx); }
/* KIVO_264 · D14 · OD-7: حكمُ تعديل صاحب الحساب لسجلّه هو (a المخزَّن · b الوارد) — null مقبول، وإلا سببُ الرفض:
   'self' حقلٌ خارج قائمة دوره (SELF_FIELDS_BY_ROLE · 017) · 'self-un' اسمُ دخولٍ بصيغةٍ غير صالحة · 'self-cur' اسمُ دخولٍ بلا كلمة المرور الحالية.
   st = حالةُ «cur» المحسوبة في applySave (selfCurState · 054): { ok: كلمةُ المرور الحالية صحيحة · forced: الدخولُ الأوّل الإجباري } أو null (لم يتغيّر اسمُ الدخول).
   الدخولُ الأوّل الإجباري (شاشةُ الدخول — 335-identity-gate): اسمُ دخولٍ قديم بصيغةٍ غير صالحة (admin مثلاً) في حالة «يجب التغيير» بجلسةٍ حديثة
   يُستبدل باسمٍ صالح مع كلمة مرورٍ جديدة في الحفظة نفسِها — un وحده يُضاف إلى قائمة الدور حينها. */
function selfLoginMoved(a, b) { return SELF_CUR_FIELDS.some(function (f) { return String(a[f] == null ? '' : a[f]) !== String(b[f] == null ? '' : b[f]); }); }
function selfLoginWhy(a, b, st) {
  if (!selfLoginMoved(a, b)) return null;
  if (!unCheck(b.un) || (b.alt != null && b.alt !== '' && !unCheck(b.alt))) return 'self-un';
  if (st && st.ok) return null;
  var altMoved = String(a.alt == null ? '' : a.alt) !== String(b.alt == null ? '' : b.alt);
  return (st && st.forced && !altMoved) ? null : (st && st.locked ? 'self-lock' : 'self-cur');   /* الإجباريُّ يستبدل un وحده · KIVO_264 (F6): المقفلُ يُسمّى */
}
function selfAcctWhy(A, a, b, st) {
  if (!a || !b) return 'self';
  var allow = selfFieldsOf(A.u);
  if (st && st.forced && allow.indexOf('un') === -1) allow = allow.concat(['un']);
  if (!eqExcept(a, b, allow)) return 'self';
  return selfLoginWhy(a, b, st);
}
/* مديرُ النظام في المسار القديم حرٌّ في السجلات العامة (044 — كما كان) عدا اسمَ دخوله هو: الصيغةُ وكلمةُ المرور الحالية (أو الدخولُ الأوّل الإجباري).
   (في الإنفاذ يمرّ مديرُ النظام بـ selfAcctWhy كغيره — قائمتُه الحقولُ الستّ كما كانت SELF_FIELDS هناك) */
function superSelfWhy(A, newJson, curJson, ctx) {
  var inc = parseJson(newJson, null), cur = parseJson(curJson, null), me = A.u.id;
  if (!Array.isArray(inc) || !Array.isArray(cur)) return null;
  var a = cur.filter(function (x) { return x && x.id === me; })[0], b = inc.filter(function (x) { return x && x.id === me; })[0];
  return a && b ? selfLoginWhy(a, b, ctx && ctx.selfCur) : null;
}
/* مراجعةُ التكامل W1-CRIT (دفاعٌ في العمق): الحكمُ أدناه على آخر نسخةٍ من المعرّف والدخولُ (actorOf · /api/login) يأخذ أوّلَها — فمعرّفٌ مكرَّرٌ في القائمة
   الواردة كلُّ نسخةٍ منه نسخةٌ مخزَّنةٌ كما هي (عدا ph الغائب و«no» المورَّث) وإلا 'users'. البوابةُ لكلّ حفظٍ قبلها في 054 applySave (usersDupIdIn) */
/* مراجعةُ التكامل (الجولة الثانية · كبوابة 054 usersDupIdIn): R2-LEGACYLOCK — نسخٌ واردةٌ متطابقةٌ حرفاً لا تزيد على المخزَّنة المتطابقة تُقبل (الأولى هي
   المحكومُ عليها) · R2-SUBSET — معرّفٌ نسخُه المخزَّنة مختلفة: نسخُه الواردةُ هي المخزَّنة بعددها وترتيبها (البوابةُ تضعها كلَّها) وإلا 'users' */
function usersDupCopyWhy(inc, cur) {
  var byI = nmap(), byC = nmap(), i, id, x;
  var asC = function (b, a) { return isObj(a) && eqExcept(a, b, ['ph', 'no']) && (!b.ph || b.ph === a.ph); };
  for (i = 0; i < inc.length; i++) { id = String(inc[i].id); (byI[id] = byI[id] || []).push(inc[i]); }
  (Array.isArray(cur) ? cur : []).forEach(function (c) { if (c && c.id != null) (byC[String(c.id)] = byC[String(c.id)] || []).push(c); });
  for (id in byC) {
    var cs = byC[id]; if (cs.length < 2 || cs.every(function (c) { return deq(c, cs[0]); })) continue;
    var is = byI[id] || [];
    if (is.length !== cs.length) return 'users';
    for (i = 0; i < is.length; i++) if (!asC(is[i], cs[i])) return 'users';
  }
  for (id in byI) {
    var bs = byI[id], cs2 = byC[id] || []; if (bs.length < 2) continue;
    if (bs.length <= cs2.length && bs.every(function (b) { return deq(b, bs[0]); })) continue;
    for (i = 0; i < bs.length; i++) { x = bs[i]; if (!cs2.some(function (a) { return asC(x, a); })) return 'users'; }
  }
  return '';
}
/* الحسابات: الموظف على كلمة مروره وحدها، والمدير على حسابات موظفيه في نطاقه */
function usersRule(A, newJson, curJson, ctx) {
  var inc = parseJson(newJson, null), cur = parseJson(curJson, []);
  if (!Array.isArray(inc)) return { ok: false, why: 'users' };
  if (inc.some(function (x) { return !x || !x.id || badAcctId(x.id); })) return { ok: false, why: 'users' };   /* KIVO_261: معرّفٌ خبيثٌ (__proto__…) أو بلا معرّف */
  var dcw = usersDupCopyWhy(inc, cur); if (dcw) return { ok: false, why: dcw };                                /* مراجعةُ التكامل W1-CRIT */
  var byA = nmap(), byB = nmap(), ids = nmap(), k, mgrEk = null;                                               /* null-prototype: «__proto__» خاصيّةٌ عادية تُفحص */
  (Array.isArray(cur) ? cur : []).forEach(function (x) { if (x && x.id) { byA[x.id] = x; ids[x.id] = 1; } });
  inc.forEach(function (x) { if (x && x.id) { byB[x.id] = x; ids[x.id] = 1; } else return; });
  for (k in ids) {
    var a = byA[k], b = byB[k];
    if (a && b && eqExcept(a, b, ['ph']) && (!b.ph || b.ph === a.ph)) continue;   /* لم يتغيّر (ph الغائب يُورَث) */
    if (k === A.u.id) {                                                            /* سجلّي: حقولُ دوري وحدها (KIVO_264 · D14) — لا دوري ولا نطاقي */
      var sw = selfAcctWhy(A, a, b, ctx && ctx.selfCur);
      if (!sw && userRecOk(b) && phNewOk(a, b)) continue;   /* KIVO_261 · AUD-057 · KIVO_262: وبصمةٌ حديثة */
      return { ok: false, why: sw || 'self' };
    }
    var d = (a && a.deptId) || (b && b.deptId) || '';
    if (!isMgrOf(A, d)) return { ok: false, why: 'mgr' };
    /* إدارةُ الحسابات ليست صفةَ منصبٍ بل صلاحيةٌ فعلية على «بيانات الموظفين»:
       الإنشاء add · التعديل والتجميد وإعادة التعيين edit · الحذف del.
       فمديرٌ ورقتُه الصريحة لا تشملها لا يُنشئ حساباً ولا يجمّده. */
    var act0 = (a && b) ? 'edit' : (b ? 'add' : 'del');
    if (!actsHeldOn(A, d, 'emps/data', [act0])) return { ok: false, why: 'act' };
    if (a && (a.role !== 'staff' || a.mgr || a.deptId !== d)) return { ok: false, why: 'mgr' };
    if (b && (b.role !== 'staff' || b.mgr || b.deptId !== d)) return { ok: false, why: 'mgr' };
    /* «فحص الصلاحيات العميق (2026-10-21)» · D1: مفتاحُ الحساب mgr:/gm: صفةُ منصبٍ — به يرث الحسابُ سقفَ الوحدة كلَّه (022 myPermsOf) ويُعامَل
       ممثّلاً لسقف النطاق (010) — فكان مديرٌ ضيّق عليه مديرُ النظام يُنشئ حساباً «staff» مفتاحُه mgr:<d>:N فيرث ما سُحب منه.
       فلا يُنشئه غيرُ مدير النظام، ولا يغيّر إليه مفتاحاً، ولا يعدّل حساباً يحمله (والحذفُ يبقى كما كان)
       «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · M-B · L3: ومفتاحٌ يحمله حسابُ مديرٍ قائم (رقمُ هوية مديرِ عقدةٍ قديم · مفتاحُ حامل الشارة —
       نشطاً أو مجمَّداً) مفتاحُ مديرٍ كذلك؛ والحسابُ القائمُ بمفتاح مديرٍ يجمّده المديرُ ويحذفه (والجولة 3 · R3-1: لا يفكّ تجميدَه) — usersEkeyWhy */
    if (!mgrEk) mgrEk = usersMgrEkSet(cur);
    var ekw = usersEkeyWhy(a, b, mgrEk); if (ekw) return { ok: false, why: ekw };
    if (usersGrantWhy(A, a, b, ctx && ctx.gx)) return { ok: false, why: 'grant' };   /* «… المرحلة 0 (الجولة 2)» · R3-2: منحٌ صريحٌ باقٍ على المفتاح */
    if (usersSheetWhy(A, a, b, ctx && ctx.gx, false)) return { ok: false, why: 'grant' };   /* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-2: وورقةٌ باقية */
    if (b && !userRecOk(b)) return { ok: false, why: 'shape' };                     /* KIVO_261 · AUD-057 */
    if (!phNewOk(a, b)) return { ok: false, why: 'ph' };                              /* KIVO_262: بصمةٌ حديثة وحدها */
  }
  var a1w = usersA1Why(inc, cur); if (a1w) return { ok: false, why: a1w };   /* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · I4w — بعد أحكام الصفوف (D1 «ekey» أوّلاً) */
  return { ok: true };
}
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · M-B: مفاتيحُ المديرين في قائمة الحسابات المخزَّنة — كلُّ مفتاحٍ يحمله حسابٌ مدير (دورُه غيرُ staff:
   gm · dept · super — أو يحمل الشارة mgr) نشطاً كان أو مجمَّداً. مفتاحُ mgr:/gm: صفةُ منصبٍ بنفسه (usersSynKey) ولا يحتاج حساباً */
function usersMgrEkSet(list) {
  var s = nmap();
  (Array.isArray(list) ? list : []).forEach(function (x) { if (x && x.ekey != null && x.ekey !== '' && (x.role !== 'staff' || x.mgr)) s[String(x.ekey)] = 1; });
  return s;
}
function usersMgrEk(ek, S) { return usersSynKey(ek) || (ek != null && ek !== '' && !!S[String(ek)]); }
/* D1 · M-B · L3 — لغير مدير النظام، حسابٌ مفتاحُه مفتاحُ مدير (usersMgrEk): لا يُنشأ، ولا يُغيَّر إليه مفتاحٌ ولا منه؛ والقائمُ منه يُجمَّد
   (dis وحده) ويُحذف — ولا تعديلَ سواه (اسمٌ · كلمةُ مرور · إدارة · فكُّ التجميد: R3-1). كان مديرُ الإدارة يُنشئ حساباً «staff» نشطاً بمفتاح مدير عقدةٍ قديم (رقمِ
   هويته — usersDupEkey يتخطّى حساباتِ gm) فيدخل به ويحمل ورقتَه ومنحَه في الوحدة؛ أو مجمَّداً بمفتاح زميله حامل الشارة (usersDupEkey يتخطّى
   المجمَّد) فيُحكم على الزميل «موظفاً عادياً». والإصلاحُ الأوّل (D1) كان يمنع تجميدَ حسابٍ بمفتاح mgr: فيبقى ما خلّفته الدُّمى نشطاً — L3
   «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-1: والاستثناءُ اتجاهٌ واحد — التجميدُ (dis من 0 إلى 1) والحذفُ وحدهما. كان فكُّ التجميد مقبولاً
   فيعيد مديرُ الإدارة الدميةَ أو الحسابَ البديل الذي جمّده مديرُ النظام إلى العمل بكلمة المرور التي اختارها هو — فكُّه لمدير النظام وحده */
function usersEkeyWhy(a, b, S) {
  if (!b) return '';
  var mb = usersMgrEk(b.ekey, S);
  if (!a) return mb ? 'ekey' : '';
  if (!mb && !usersMgrEk(a.ekey, S)) return '';
  if (String(a.ekey == null ? '' : a.ekey) !== String(b.ekey == null ? '' : b.ekey)) return 'ekey';
  return usersFreezeOnly(a, b) ? '' : 'ekey';
}
/* التجميدُ وحده: dis من غير مجمَّدٍ إلى مجمَّد، وما سواه كما خُزِّن (ph الغائبُ يُورَث) */
function usersFreezeOnly(a, b) { return !!a && !!b && !a.dis && !!b.dis && eqExcept(a, b, ['dis', 'ph']) && (!b.ph || b.ph === a.ph); }
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · I4w (المواصفة §0.4): حسابٌ «staff» مفتاحُه mgr: بلا الشارة (mgr:true) ليس مديراً عند isMgrOf
   ويرث سقفَ الوحدة كلَّه عند myPermsOf (022) — شكلٌ لا يصنعه إلا نزعُ الشارة عن حساب مدير الإدارة. فلا يُكتب لأحدٍ ولو مدير النظام:
   الصفُّ القائمُ بهذا الشكل كما خُزِّن يمرّ (فلا يتعطّل حفظُ القائمة كلِّها) ولا يُعدَّل إلا تجميداً أو حذفاً — وتنزيلُ المدير حذفُ حسابه.
   يُفحص كلُّ صفٍّ واردٍ بنسخه (المكرَّرُ القديم يُطابَق بأيّ نسخةٍ مخزَّنة له) · السبب 'mgr-key'
   والتنظيف L-05 (أ): حسابُ «الإدارة» (role dept) أُلغي — صفٌّ جديدٌ أو متغيّرٌ به يُرفض 'shape' كذلك، والقائمُ كما خُزِّن يمرّ حتى يحذفه المالك. */
function usersA1(x) { return isObj(x) && x.role === 'staff' && isMgrKey(x.ekey) && !x.mgr; }
function usersA1Why(inc, cur) {
  var byA = nmap(), i;
  (Array.isArray(cur) ? cur : []).forEach(function (x) { if (x && x.id != null) (byA[String(x.id)] = byA[String(x.id)] || []).push(x); });
  for (i = 0; i < (Array.isArray(inc) ? inc.length : 0); i++) {
    var b = inc[i], dep = isObj(b) && b.role === 'dept'; if (!dep && !usersA1(b)) continue;
    var cs = byA[String(b.id)] || [];
    if (cs.some(function (a) { return eqExcept(a, b, ['ph']) && (!b.ph || b.ph === a.ph); })) continue;   /* كما خُزِّن */
    if (dep) return 'shape';                                                                                  /* التنظيف L-05 (أ): حسابُ «الإدارة» أُلغي — لا يُنشأ ولا يُعدَّل */
    if (cs.some(function (a) { return usersA1(a) && usersFreezeOnly(a, b); })) continue;                     /* تجميدُه */
    return 'mgr-key';
  }
  return '';
}
function usersA1Of(newJson, curJson) { var inc = parseJson(newJson, null); return Array.isArray(inc) ? usersA1Why(inc, parseJson(curJson, [])) : ''; }
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-2: مفاتيحُ المديرين تُعرف من الحسابات المخزَّنة — فإذا حذف مديرُ النظام مديرَ عقدةٍ قديماً أو مديراً
   بدوره (مفتاحُه بلا بادئة) بقي مدخلُه في سجلّ المنح الصريح (bsdept:<d>:bassam_grants_v1) فيُنشئ مديرُ الإدارة حساباً بذلك المفتاح فيرث منحَه.
   الآن: ربطُ حسابٍ بمفتاحٍ لغير مدير النظام (إنشاؤه أو تغييرُ مفتاحه) يُحكم كمنح — كلُّ مفتاح plus نشطٍ قابلٍ للمنح في مدخلٍ باقٍ لذلك المفتاح يحمله الكاتبُ
   في وحدته (enfHeld كأنّ الوحدات كلَّها مشغَّلة) · ومدخلٌ باقٍ فيه plus في وحدةٍ لا يديرها الكاتبُ يرفض الربط. بالوضعين (السجلُّ يُقرأ في الإنفاذ،
   ويبقى لمن يعود إليه). GX = { recs: {وحدة: سجل}, byEk: {مفتاح: [وحدات]} } يحمّله applySave (054 usersGrantsLoad) — وغيابُه رفضٌ (fail-closed).
   تجميدُ حسابٍ قائمٍ أو فكُّه أو تعديلُه بمفتاحه نفسِه ليس ربطاً. يعيد التفصيل ('' = لا شيء) */
function usersGrantWhy(A, a, b, GX) {
  if (!b) return '';
  var ek = b.ekey == null ? '' : String(b.ekey);
  if (!ek || (a && String(a.ekey == null ? '' : a.ekey) === ek)) return '';
  if (!GX || !GX.byEk || !GX.recs) return 'grants (not loaded)';
  var ds = GX.byEk[ek] || [], B = null, i, j;
  for (i = 0; i < ds.length; i++) {
    var g = (GX.recs[ds[i]] && GX.recs[ds[i]].emp) ? GX.recs[ds[i]].emp[ek] : null, act = [];
    (isObj(g) && Array.isArray(g.plus) ? g.plus : []).forEach(function (x) { var re = KIVO_REGISTRY.byKey[String(x)]; if (re && re.status === 'active' && re.grant === 'assignable') act.push(String(x)); });
    if (!act.length) continue;
    if (!isMgrOf(A, ds[i])) return ds[i] + ' (leftover grants in a unit outside your management)';
    if (!B) B = usersGrantorOf(A, GX);
    for (j = 0; j < act.length; j++) if (!enfHeld(B, ds[i], act[j])) return act[j] + ' (grantor does not hold it)';
  }
  return '';
}
/* المانحُ كأنّ الوحدات كلَّها مشغَّلة (M-C) ومعه سجلاتُ المنح لكلّ الوحدات — نسخةٌ سطحيةٌ بلا مخابئ الحكم، مرّةً لكلّ حفظةٍ (A.__usB) */
function usersGrantorOf(A, GX) {
  if (A.__usB && A.__usB.__gx === GX) return A.__usB;
  var B = {}, q;
  for (q in A) if (q.slice(0, 2) !== '__' || q === '__ekIx') B[q] = A[q];
  B.off = []; B.__grants = GX.recs; B.__gx = GX;
  return (A.__usB = B);
}
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-2 (التتمّة): والورقةُ الباقيةُ كالمنح الباقي — حسابُ «staff» يقرأ ورقةَ مفتاحه في إدارته وعدساتِه
   (022 myPermsOf ← empPermsOf: perms.emps[وحدتُه][مفتاحُه])، فكان مديرُ الإدارة المضيَّقُ عليه يُنشئ حساباً بمفتاحٍ له في إدارته ورقةٌ باقيةٌ من حسابٍ
   حُذف (مديرُ عقدةٍ قديمٌ برقم هويته نُقلت الإدارةُ من فرعه قبل حذفه — 330 removeGroupManager كان يحذف أوراقَه في وحدات فرعه وقتَ الحذف وحدها)
   فيحمل الحسابُ ما لا يحمله مديرُه. الآن: ربطُ حسابٍ بمفتاحٍ (إنشاؤه أو تغييرُ مفتاحه) لغير مدير النظام يُحكم كإنشاء تلك الورقة بعدساتها لموظفٍ
   عاديٍّ لا ورقةَ له — قاعدةُ المانح نفسُها (permsGrantWhy: الصفحاتُ والأفعالُ والعدساتُ كأنّ الوحدات كلَّها مشغَّلة) بالوضعين، وفي الإنفاذ مفاتيحُها
   كذلك (enfSheetKeys بلا ما يُسقطه المنحُ الصريح في الوحدة — يحملها المانح: enfHeld). والقالبُ (tplOf) هويةٌ لا تمنح بنفسها، والورقةُ في وحدةٍ أخرى
   لا يقرؤها حسابُ هذه الوحدة. تجميدُ القائم وفكُّه وتعديلُه بمفتاحه نفسِه ليس ربطاً. keys: الإنفاذ. يعيد التفصيل ('' = لا شيء) */
function usersSheetWhy(A, a, b, GX, keys) {
  if (!b) return '';
  var ek = b.ekey == null ? '' : String(b.ekey), d = b.deptId == null ? '' : String(b.deptId);
  if (!ek || !d || (a && String(a.ekey == null ? '' : a.ekey) === ek)) return '';
  var P = A.perms || {}, own = function (m) { return isObj(m) && Object.prototype.hasOwnProperty.call(m, ek) ? m[ek] : undefined; };
  var sh = own((P.emps || {})[d]), el = own((P.empLens || {})[d]), one = nmap(), ln = null, mi = [];
  if (!isObj(sh)) return '';
  if (keys) {
    if (!GX || !GX.recs) return 'grants (not loaded)';
    var g = own(GX.recs[d] && GX.recs[d].emp); mi = isObj(g) && Array.isArray(g.minus) ? g.minus.map(String) : [];
  }
  /* الحكمُ بمحتوى الورقة لا بصاحبها (المفتاحُ هنا موظفٌ عاديّ — مفتاحُ المدير رُفض قبله «ekey» · usersEkeyWhy) — فالدفعةُ بقالبٍ واحد تُحكم مرّةً */
  var memo = A.__usSv || (A.__usSv = nmap()), mk = (keys ? 'k|' : 'l|') + d + '|' + JSON.stringify(sh) + '|' + JSON.stringify(el === undefined ? null : el) + '|' + mi.join(',');
  if (mk in memo) return memo[mk];
  var out = '';
  if (keys) {
    var B = usersGrantorOf(A, GX), ks = enfSheetKeys(B, d, { kind: 'staff', inh: false }, sh, el);
    for (var key in ks) if (mi.indexOf(key) === -1 && !enfHeld(B, d, key)) { out = key + ' (grantor does not hold it)'; break; }
  }
  if (!out) {
    /* ما في الورقة خارجَ سقف الوحدة لا يمنح شيئاً (يُقصّ عند القراءة — authorize0) فلا يُحكم */
    var C = permOnAll(A), src = expandPermsOf(C, d, sh), cut = nmap(), leaf;
    for (leaf in src) if (capOnDept(C, d, leaf)) cut[leaf] = src[leaf];
    one[ek] = cut; if (el !== undefined) { ln = nmap(); ln[ek] = el; }
    if (permsGrantWhy(A, d, null, one, null, null, null, ln)) out = 'sheet (leftover permissions the grantor does not hold)';
  }
  return (memo[mk] = out);
}
/* KIVO_261 (إصلاح · AUD-055/AUD-057 — كشفهما المراجعُ الأمنيّ المستقل): ما يكتبه غيرُ مدير النظام في المفاتيح العامّة كان بلا شكلٍ ولا حدّ —
   اسمٌ بستة ميغابايت في سجلّ الحساب، أو نصٌّ ضخم في أشجار الإدارة داخل bassam_perms_v1 — يُحقن في صفحة كلّ مستخدم. الآن حدودٌ سخيّةٌ لا تمسّ الاستعمال:
   حقولُ الحساب الذاتية نصوصٌ بطولٍ محدود والسجلُّ كلُّه ≤ 4 KB · ورقةُ الموظف كائنُ «ورقة ← أفعال من الستة» · القالبُ معرّفٌ قصير · عدساتُ الموظف مصفوفةُ مفاتيح قصيرة.
   يُفحص المتغيّرُ وحده (ما لم يتغيّر من بياناتٍ قديمة لا يُعطّل حفظاً). */
var USER_FMAX = { name: 120, email: 254, phone: 32, un: 64, alt: 64, ph: 600 };
function userRecOk(b) {
  if (!isObj(b)) return false;
  for (var f in USER_FMAX) { var v = b[f]; if (v === undefined || v === null || v === '') continue; if (typeof v !== 'string' || v.length > USER_FMAX[f]) return false; }
  return JSON.stringify(b).length <= 4096;
}
/* KIVO_262 (تصليب · مراجعةُ الازدواج المعماري): بصمةُ كلمة مرورٍ جديدة يكتبها غيرُ مدير النظام (المديرُ لموظفه · المستخدمُ لنفسه)
   تُقبل بصيغة PBKDF2 الحديثة وحدها وبعدد تكراراتٍ مضبوط — فلا تُخفَّض إلى djb2 القديمة (p1$) أو نصٍّ اعتباطيّ من عميلٍ قديم أو معدَّل.
   البصمةُ القائمةُ دون تغيير تمرّ كما هي (بياناتٌ قديمة)، ومديرُ النظام مستثنى (الاستعادةُ من نسخٍ قديمة تحمل p1$). */
var PH_NEW_RX = /^p2\$(\d{4,7})\$[0-9a-f]{32}\$[0-9a-f]{64}$/;
function phNewOk(a, b) {
  if (!b || b.ph === undefined || b.ph === null || b.ph === '' || (a && a.ph === b.ph)) return true;
  var m = PH_NEW_RX.exec(String(b.ph)); if (!m) return false;
  var it = +m[1]; return it >= PBKDF2_ITER && it <= PBKDF2_MAX;
}
var PERM_LEAF_RX = /^[a-z][A-Za-z0-9_]{0,31}(?:\/[A-Za-z][A-Za-z0-9_]{0,31})?$/;
function sheetShapeOk(sh) {
  if (!isObj(sh)) return false;
  var ks = Object.keys(sh); if (ks.length > 64) return false;
  for (var i = 0; i < ks.length; i++) {
    var acts = sh[ks[i]];
    if (!PERM_LEAF_RX.test(ks[i]) || !Array.isArray(acts) || acts.length > ACTS_ALL.length) return false;
    for (var j = 0; j < acts.length; j++) if (ACTS_ALL.indexOf(acts[j]) === -1 || acts.indexOf(acts[j]) !== j) return false;
  }
  return true;
}
function deptPermShapeOk(eo, en, to, tn, lo, ln) {
  var chk = function (o, n, ok) {
    if (n === undefined || n === null) return true;
    if (!isObj(n)) return false;
    var ks = Object.keys(n);
    for (var i = 0; i < ks.length; i++) { var ek = ks[i]; if (isObj(o) && deq(o[ek], n[ek])) continue; if (ek.length > 128 || !ok(n[ek])) return false; }
    return true;
  };
  return chk(eo, en, sheetShapeOk)
      && chk(to, tn, function (v) { return v === null || (typeof v === 'string' && v.length <= 64); })
      && chk(lo, ln, function (v) { return Array.isArray(v) && v.length <= 32 && v.every(function (x) { return typeof x === 'string' && x.length <= 32; }); });
}
/* الصلاحيات: السقوف والعدسات والتبويبات لمدير النظام، وصلاحيات الموظفين لمدير إدارتهم داخل السقف */
function permsRule(A, newJson, curJson) {
  var n = parseJson(newJson, null), o = parseJson(curJson, {});
  if (!isObj(n)) return { ok: false, why: 'perms' };
  if (!isObj(o)) o = {};
  var top = {}, k; Object.keys(n).concat(Object.keys(o)).forEach(function (x) { top[x] = 1; });
  for (k in top) {
    if (k === 'emps' || k === 'tplOf' || k === 'empLens') continue;
    /* KIVO_261 (إصلاح · AUD-054 — كشفه k261tamper): lensZ علامةُ ترقية العدسات (331: إن غابت أُضيفت «المناطق» ثم lensZ = 1 وحُفظ — يحفظها أيُّ مستخدمٍ
       عند أوّل تحميل) وكانت تُتخطّى كلياً فيكتب فيها غيرُ مدير النظام أيَّ قيمةٍ وبأيّ حجم في مفتاحٍ عامّ يقرؤه الجميع. الآن: كما هي أو 1 من غياب — وما سواها ممنوع */
    if (k === 'lensZ') { if (deq(o.lensZ, n.lensZ) || (n.lensZ === 1 && !o.lensZ)) continue; return { ok: false, why: 'super' }; }
    if (k === 'lenses' && lensesUpgradeOnly(o.lenses, n.lenses)) continue;
    var ov = o[k] === undefined ? {} : o[k], nv = n[k] === undefined ? {} : n[k];   /* الغائب والفارغ سواء */
    if (!deq(ov, nv)) return { ok: false, why: 'super' };
  }
  var ds = {}; Object.keys(n.emps || {}).concat(Object.keys(o.emps || {}), Object.keys(n.tplOf || {}), Object.keys(o.tplOf || {}), Object.keys(n.empLens || {}), Object.keys(o.empLens || {})).forEach(function (d) { ds[d] = 1; });
  for (var d in ds) {
    var eo = (o.emps || {})[d], en = (n.emps || {})[d], to = (o.tplOf || {})[d], tn = (n.tplOf || {})[d], lo = (o.empLens || {})[d], ln = (n.empLens || {})[d];
    if (deq(eo, en) && deq(to, tn) && deq(lo, ln)) continue;
    if (!isMgrOf(A, d)) return { ok: false, why: 'mgr' };
    if (!deptPermShapeOk(eo, en, to, tn, lo, ln)) return { ok: false, why: 'shape' };   /* KIVO_261 · AUD-057 */
    /* «فحص الصلاحيات العميق (2026-10-21)» · PAR-1/DX-04: السقفُ الفعليّ للوحدة (capSetAnywhereOf/effCapOf — حكمُ deptCapOf نفسُه؛ والوحدةُ المطفأة
       على مستوى المنصة مفتاحُ تشغيلٍ لا سقف) لا السجلُّ الخامّ caps[d] الذي يقرأ الغائبَ «لا شيء» — فكان كلُّ قالبٍ يعطيه المديرُ في وحدةٍ مفتوحة
       يُرفض «خارج السقف». والأوراقُ التي تغيّرت في هذا الحفظ وحدها: ورقةٌ قديمةٌ لموظفٍ آخر لا تُسقط حفظاً لا شأن له بها.
       مفتاح الورقة «pk/sk» يُحكم بصفحته الحاوية */
    var cap = capSetAnywhereOf(A, d) ? effCapOf(A, d) : PG_KEYS.slice();
    var bad = Object.keys(en || {}).some(function (ek) { if (deq((eo || {})[ek], en[ek])) return false; return Object.keys(en[ek] || {}).some(function (pk) { return cap.indexOf(String(pk).split('/')[0]) === -1; }); });
    if (bad) return { ok: false, why: 'cap' };
    if (A.u.role !== 'super') { var gw = permsGrantWhy(A, d, eo, en, to, tn, lo, ln); if (gw) return { ok: false, why: gw }; }
  }
  return { ok: true };
}
/* «فحص الصلاحيات العميق (2026-10-21)» — صاحبُ الورقة: موظفٌ عاديّ أو مدير. المديرُ مفتاحُه mgr:/gm: أو حسابُه دورُه غيرُ staff أو يحمل الشارة؛
   والحسابُ يُعرف بمفتاحه في قائمة الحسابات الكاملة (A.users) — فحسابُ gm قديمٌ مفتاحُه رقمُ هوية مديرٌ كذلك. inh: يرث سقف الوحدة حين لا ورقةَ له */
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · M-A: يُحكم على المفتاح بكلّ الحسابات التي تحمله (نشطةً ومجمَّدة) لا بأوّلها — كان حسابٌ «staff»
   مجمَّدٌ بمفتاح حامل الشارة (أو نشطٌ بمفتاح مديرِ عقدةٍ قديم) يوضع قبله في القائمة فيُحكم على المدير «موظفاً عادياً» فيضيّق عليه مديرُ الإدارة
   ولا يُرجعها. المفتاحُ مديرٌ إن حمله حسابٌ مديرٌ واحد · inh: يرث سقفَ الوحدة بلا ورقةٍ إن ورثه حسابٌ واحدٌ منها (الأشدُّ لما يصير إليه الحفظ)
   · inhAll: إن ورثه كلُّها (الأشدُّ لما كان قبله) — كما myPermsOf في 022: gm · dept · super يرثون، والموظفُ بمفتاح mgr: */
function permEkIx(A) {
  if (A.__ekIx) return A.__ekIx;
  var ix = A.__ekIx = nmap();
  (A.users || []).forEach(function (x) {
    if (!x || x.ekey == null || x.ekey === '') return;
    var k = String(x.ekey), e = ix[k] || (ix[k] = { n: 0, inh: 0, mgr: false, gids: [] });
    e.n++;
    if (x.role === 'gm') e.gids.push(String(x.gid || ''));
    else if (x.role !== 'staff' || x.mgr) e.mgr = true;
    if (x.role === 'gm' || x.role === 'dept' || x.role === 'super' || (x.role === 'staff' && isMgrKey(k))) e.inh++;
  });
  return ix;
}
function permTargetOf(A, ek) {
  ek = String(ek == null ? '' : ek);
  var e = permEkIx(A)[ek] || null, gids = e ? e.gids.slice() : [], syn = ek.slice(0, 4) === 'mgr:';
  if (ek.slice(0, 3) === 'gm:') gids.push(ek.split(':')[1] || '');
  var inh = syn || !!(e && e.inh), inhAll = syn || !!(e && e.inh === e.n);
  if (gids.length) return { kind: 'gm', gid: gids[0], gids: gids, inh: inh, inhAll: inhAll };
  if (syn || (e && e.mgr)) return { kind: 'mgr', inh: inh, inhAll: inhAll };
  return { kind: 'staff', inh: false, inhAll: false };
}
/* M5/PAR-4: غيرُ مدير النظام يكتب أوراقَ الموظفين العاديين وحدهم (وقوالبَهم وعدساتِهم ومنحَهم) — أوراقُ المديرين يكتبها مديرُ النظام أو مديرُ فرعٍ
   فوقهم (gm في نطاقه)، وورقةُ مدير عقدةٍ يكتبها مديرُ عقدةٍ أعلى منه وحده. كان مديرُ الإدارة يضيّق على مديره العام وزميله فلا يُرجعانها.
   (الجولة 2 · M-A: مفتاحٌ يحمله أكثرُ من مدير عقدة يكتبه من هو فوقهم جميعاً) */
function permTargetOk(A, ek) {
  var u = A.u; if (u.role === 'super') return true;
  var t = permTargetOf(A, ek);
  if (t.kind === 'staff') return true;
  if (u.role !== 'gm') return false;
  if (t.kind === 'mgr') return true;
  for (var i = 0; i < t.gids.length; i++) if (!permGidBelow(A, t.gids[i], u.gid)) return false;
  return true;
}
/* العقدةُ c تحت العقدة top تماماً (سلسلةُ الآباء في A.nodes · محدودةٌ ضدّ الدورات) */
function permGidBelow(A, c, top) {
  var seen = nmap(), n = 0;
  c = String(c == null ? '' : c); top = String(top == null ? '' : top);
  if (!c || !top || c === top) return false;
  while (c && !seen[c] && n++ < 64) {
    seen[c] = 1;
    var nd = (A.nodes || []).filter(function (x) { return x && x.id === c; })[0];
    c = nd ? String(nd.pid || '') : '';
    if (c && c === top) return true;
  }
  return false;
}
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · M-C: إطفاءُ الوحدة على مستوى المنصة (A.off) مفتاحُ تشغيلٍ لا صلاحية — يُحكم المانحُ كأنّ الوحدات
   كلَّها مشغَّلة، وإلا جهّز لموظفه وهي مطفأة ورقةً أو منحاً لا يملكه هو فيحمله الموظفُ يوم يعيد مديرُ النظام تشغيلها (والسقفُ في permsRule بلا
   إطفاءٍ أصلاً: effCapOf). نسخةٌ سطحيةٌ من الفاعل بلا الوحدات المطفأة وبلا مخابئ الحكم (__enfH · __enfT …) — ويبقى المنحُ المرفق (__grants) */
function permOnAll(A) {
  if (!A || !A.off || !A.off.length) return A;
  if (A.__onAll) return A.__onAll;
  var B = {}, k;
  for (k in A) if (k.slice(0, 2) !== '__' || k === '__grants' || k === '__ekIx') B[k] = A[k];
  B.off = [];
  return (A.__onAll = B);
}
/* N1 · M4 · M5/PAR-4: قاعدةُ المانح لغير مدير النظام في وحدةٍ يديرها — لكل صاحبِ ورقةٍ تغيّرت ورقتُه أو قالبُه أو عدساتُه:
     (أ) ليس الفاعلَ نفسَه — كانت الحمايةُ لمن له ورقةٌ مخزَّنة وحده، فحاملُ الشارة بلا ورقةٍ يكتب لنفسه سقفَ الإدارة كلَّه؛
     (ب) موظفٌ عاديّ أو مديرٌ تحت مدير فرعٍ يكتب له (permTargetOk)؛
     (ج) لا يضيف ورقةً أو فعلاً أو عدسةً لا يملكها الفاعلُ نفسُه في هذه الوحدة — كان الفحصُ لصاحب الورقة الصريحة وحده، فالمديرُ الذي يرث
         والمضيَّقُ عليه في الإنفاذ بالإسقاط يمنحان ما ليس في يدهما (ومفاتيحُ v24.9 في الإنفاذ: enfPermsHeldWhy في 059). وما كان قبل الحفظ
         يبقى بلا حكم: المانحُ يضيّق ويعدّل ما منحه غيرُه ولا يزيد عليه. والقالبُ هويةٌ لا تمنح شيئاً بنفسها — يُحكم بورقته. */
function permsGrantWhy(A, d, eo, en, to, tn, lo, ln) {
  var me = String(A.u.ekey || ''), eks = nmap(), ek, mine = null, B = permOnAll(A);
  [eo, en, to, tn, lo, ln].forEach(function (m) { if (isObj(m)) Object.keys(m).forEach(function (x) { eks[x] = 1; }); });
  var dl = ((A.perms && A.perms.lenses) || {})[d], allL = KIVO_LENS_PLUGINS.keys;
  var lensOn = function (arr, L) { return (Array.isArray(dl) ? dl.indexOf(L) !== -1 : true) && (Array.isArray(arr) ? arr.indexOf(L) !== -1 : true); };
  for (ek in eks) {
    var s0 = isObj(eo) ? eo[ek] : undefined, s1 = isObj(en) ? en[ek] : undefined, l0 = isObj(lo) ? lo[ek] : undefined, l1 = isObj(ln) ? ln[ek] : undefined;
    var chS = !deq(s0, s1), chL = !deq(l0, l1);
    if (!chS && !chL && deq(isObj(to) ? to[ek] : undefined, isObj(tn) ? tn[ek] : undefined)) continue;
    if (me && ek === me) return 'self';
    if (!permTargetOk(A, ek)) return 'target';
    var t = permTargetOf(A, ek);
    if (chS) {
      /* الجولة 2: ما كان بأضيق وراثةٍ (inhAll) وما يصير بأوسعها (inh) · والمانحُ وما يرثه الهدفُ كأنّ الوحدات كلَّها مشغَّلة (M-C: B) — كان
         ما في وحدةٍ مطفأةٍ يُتخطّى فيُجهَّز للموظف ما لا يملكه مانحُه */
      var was = isObj(s0) ? expandPermsOf(B, d, s0) : (t.inhAll ? capAllPermsOf(B, d) : {}), now = isObj(s1) ? expandPermsOf(B, d, s1) : (t.inh ? capAllPermsOf(B, d) : {});
      if (!mine) mine = myPermsOf(B, d);
      for (var pk in now) {
        var acts = now[pk] || [], had = was[pk] || [], have = mine[pk] || [];
        for (var i = 0; i < acts.length; i++) if (had.indexOf(acts[i]) === -1 && have.indexOf(acts[i]) === -1) return 'grant';
      }
    }
    /* L1 (الجولة 2): العدساتُ تعمل على ورقة — حذفُ ورقة موظفٍ لا يرث مع عدساته (حذفُ حسابه · clearEmpPerms · dropEmpPerms · pruneOrphanEmpPerms)
       لا يمنحه عدسة؛ كان غيابُ قائمته يُقرأ «كلَّ العدسات» فيُرفض التنظيفُ «grant» ويبقى السجلُّ اليتيم */
    if (chL && (isObj(s1) || t.inh)) for (var j = 0; j < allL.length; j++) if (lensOn(l1, allL[j]) && !lensOn(l0, allL[j]) && !KIVO_BUILD.lensGate(A.perms, A.u, d, allL[j]).on) return 'grant';
    /* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-6: ورقةٌ تُنشأ (أو تعود) لصاحبٍ لا يرث — عدساتُه قبلها لم تمنح شيئاً، فكلُّ عدسةٍ تعمل بالورقة
       الجديدة (على صفحةٍ تحملها: الخطة · الجولات) تُحكم كعدسةٍ مضافة. كان حفظان يتخطّيان الحكم: الأوّلُ يحذف الورقة ويضع العدسات (L1)، والثاني يعيد الورقة */
    if (isObj(s1) && !isObj(s0) && !t.inhAll) {
      var nowB = expandPermsOf(B, d, s1);
      for (var j2 = 0; j2 < allL.length; j2++) if (lensOn(l1, allL[j2]) && permLensHosted(nowB, allL[j2]) && !KIVO_BUILD.lensGate(A.perms, A.u, d, allL[j2]).on) return 'grant';
    }
  }
  return '';
}
/* هل تحمل الورقةُ (الموسَّعة) صفحةً تعمل عليها العدسةُ L؟ (مضيفو مفتاح lens.<L>.view في فهرس الإنفاذ — الخطة والجولات افتراضاً) */
function permLensHosted(sheet, L) {
  var hs = enfIx().hosts['lens.' + L + '.view'] || ['plan', 'daily/rounds'];
  for (var i = 0; i < hs.length; i++) for (var pk in sheet) if ((pk === hs[i] || pk.indexOf(hs[i] + '/') === 0) && (sheet[pk] || []).length) return true;
  return false;
}
