/* ══ (4) القراءة — مفاتيحُ القراءة المربوطة صراحةً (readBindings · P4.1.1-01) محمولةٌ في الإدارة ∧ Department/Branch،
   ثم إسقاطُ السجلات خارج النطاق (D4-01): المصدر · المسنَد (P4.2-05) · العدساتُ المعطّلة.
   RISHAD-266: الوردية (D4-09) والموقع/العنصر كانت تُسقَط بسقف النطاق القديم (bassam_scope_v1) — أُلغي، فلا تقيّد القراءةَ بعده.
   الإسقاطُ لا الحذف حيث يرسم السجلُّ خريطة (الطوابق والعناصر تبقى هياكلَ بلا حقول الحالة)، والأجزاءُ المحجوبة تُعاد
   من الخادم عند الكتابة (merge-on-write) فلا يمحوها من لا يراها، ولا يكتب فيها من لا يملكها.
   fail-closed (P4.1.1-04): لا ميزانيةَ تتخطّى سجلاً — أيُّ خطأٍ في الإسقاط ⇒ القراءةُ مرفوضة. ══ */
function canReadEnf(A, k) {
  if (!A || !A.u) return false;
  var u = A.u, P = parseKey(k), rn = resName(k), i;
  if (u.role === 'super') return true;                                       /* مديرُ النظام يقرأ كلَّ شيء (Global) — كما AS‑IS */
  if (!P.dept) {
@@SYS:enf.read.dstats@@    if (P.name === K_NSYS) return false;
    var R = resOf(k); if (!R) return false;                                  /* موردٌ مجهول = رفض */
    return R.scope === 'global';                                             /* السجلاتُ العامة للجلسة (I-06 · allowlist) */
  }
  if (!deptInScope(A, P.dept)) return false;
  if (rn === ENF_SCOPE_RES) return false;                                    /* RISHAD-266: سقفُ النطاق القديم أُلغي — لا يُسلَّم لغير مدير النظام */
  if (rn === ENF_GRANTS_RES) return isMgrOf(A, P.dept);                      /* سجلُّ المنح: مديرُ الإدارة (والموظفُ يتسلّم مفاتيحَه الفعلية في الإقلاع) */
  var R2 = resOf(k);
  if (!R2 || R2.scope !== 'dept') return false;
  if (R2.rule) {
    if (P.name.indexOf('bassam_notif_dev_v1:') === 0) return P.name === 'bassam_notif_dev_v1:' + u.id || isMgrOf(A, P.dept);   /* Own */
    return true;                                                             /* التنبيهاتُ (self) · الراياتُ التقنية · الملف — قواعدُها تحرسها */
  }
  /* KIVO_264 · QA-264-D1: سقفُ الإدارة أولاً — كالقديم حرفاً (resOnCeiling · 050). مفاتيحُ القراءة تُحمل بسقف صفحاتها هي (enfKeyOnCeiling)،
     فكان backup.view (والمراجعُ المشتركة: emp.view للجائزة …) يفتح قيمةَ موردٍ صفحتُه خارج سقف الإدارة أو وحدتُه مطفأة — في /api/get والإقلاع
     ورفضِ الحفظ (curSafe) والصور والسجلّ؛ والكتابةُ كانت مرفوضةً أصلاً. */
  if (!resOnCeiling(A, P.dept, R2)) return false;
  var RK = KIVO_SCOPE.readKeysFor(rn);
  if (!RK.known || !RK.keys.length) return false;
  for (i = 0; i < RK.keys.length; i++) if (enfHeld(A, P.dept, RK.keys[i]) && (RK.keys[i] !== 'backup.view' || bkReadAnyOk(A, P.dept, rn))) return true;   /* IP39 (019u) */
  return false;
}
/* رقمُ المراجعة بلا قيمة: لمن يقرأ أو يكتب المورد أو يملك تبعةً تكتب فيه (الاستبدال · حذفُ الموظف · إعادةُ تسمية الوردية) */
function canSeeEnf(A, k) {
  if (canReadEnf(A, k)) return true;
  var P = parseKey(k); if (!P.dept || !deptInScope(A, P.dept)) return false;
  var R = resOf(k); if (!R || R.scope !== 'dept') return false;
  if (R.rule) return true;
  if (enfResWriter(A, P.dept, resName(k))) return true;
  return enfHeld(A, P.dept, 'import.replace') || enfHeld(A, P.dept, 'emp.record.delete') || enfHeld(A, P.dept, 'emp.record.bulk.delete') || enfHeld(A, P.dept, 'ref.shift.edit');
}
/* ── سياقُ العرض لفاعلٍ على موردٍ في إدارة: الأبعادُ المقيِّدة = ما تشترك فيه كلُّ مفاتيح القراءة المحمولة (أيُّ مفتاحٍ بلا البُعد يكفي لرفع قيده — كما evaluateRead) ── */
function enfDimsOf(key) { var e = KIVO_REGISTRY.byKey[key]; return e ? e.scopeDims : []; }
function enfViewCtx(A, d, rn, refs) {
  var cache = A.__enfV || (A.__enfV = {}), ck = d + '|' + rn;
  if (cache[ck]) return cache[ck];
  var RK = KIVO_SCOPE.readKeysFor(rn), held = [], i;
  for (i = 0; i < RK.keys.length; i++) if (enfHeld(A, d, RK.keys[i]) && (RK.keys[i] !== 'backup.view' || bkReadAnyOk(A, d, rn))) held.push(RK.keys[i]);   /* IP39 (019u): لا يرفع قيدَ نطاقٍ مفتاحٌ لا يفتح القراءة */
  /* RISHAD-266: Shift · Site · Zone/Element لا تقيّد (سقفُ النطاق القديم أُلغي) — Assigned · Source كما كانا */
  var dims = ['Assigned', 'Source'], rs = { 'Shift': false, 'Site': false, 'Zone/Element': false }, j;
  for (j = 0; j < dims.length; j++) { var all = held.length > 0; for (i = 0; i < held.length && all; i++) if (enfDimsOf(held[i]).indexOf(dims[j]) === -1) all = false; rs[dims[j]] = all; }
  var V = { d: d, rn: rn, held: held, restrict: rs, sources: enfSources(A, 'read'), fieldOnly: enfFieldOnly(A, d), ekey: String(A.u.ekey || ''),
    lens: {}, toks: @@SYS:enf.toks.daily|empty="null"@@ };
  /* KIVO_259 · AUD-030: العدساتُ من الإضافات (KIVO_LENS_PLUGINS.keys) — بوابةُ كلٍّ منها بالمرجع نفسِه */
  for (var li = 0; li < KIVO_LENS_PLUGINS.keys.length; li++) V.lens[KIVO_LENS_PLUGINS.keys[li]] = KIVO_BUILD.lensGate(A.perms, A.u, d, KIVO_LENS_PLUGINS.keys[li]).on;
  return (cache[ck] = V);
}
/* هويّاتُ المحرّك نفسُها (KIVO_238 IH-01/02: uid أولاً · sid للطابق) */
var ENF_ID = {
  zones: function (e) { if (!isObj(e)) return null; if (e.uid != null && e.uid !== '') return 'u:' + e.uid; var v = e.code || e.ser || e.name || e.id || e.eid; return v == null || v === '' ? null : 'z:' + v; },
  gates: function (e) { if (!isObj(e)) return null; if (e.uid != null && e.uid !== '') return 'u:' + e.uid; if (e.id != null && e.id !== '') return 'g:' + e.id; if (e.gid != null && e.leafNo != null) return 'gl:' + e.gid + '/' + e.leafNo; if (e.gid != null) return 'gg:' + e.gid; if (e.num != null && e.num !== '') return 'gn:' + e.num; if (e.label) return 'gL:' + e.label; return null; },
  marks: function (e) { if (!isObj(e)) return null; if (e.uid != null && e.uid !== '') return 'u:' + e.uid; if (e.id != null && e.id !== '') return 'm:' + e.id; if (e.label) return 'mL:' + e.label; return null; },
  paths: function (e) { if (!isObj(e)) return null; if (e.uid != null && e.uid !== '') return 'u:' + e.uid; var v = e.id || e.code || e.name; return v == null || v === '' ? null : 'p:' + v; },
  floor: function (e, i) { if (!isObj(e)) return '#' + i; var v = e.sid || e.id; return v == null || v === '' ? '#' + i : 'f:' + v; },
};
/* KIVO_259 · AUD-030 (ADR-018): أعمدةُ عناصر العدسات وحقولُ العدسات فوق العناصر والطابق من الإضافات (KIVO_LENS_PLUGINS — مولَّد) —
   كانت حرفيّة: ENF_LENS_COLS ['zones', 'gates', 'marks', 'paths'] · ENF_DIST_KEYS (emp · needN · needS · uniNeed على كل عمودٍ عدا paths) · ENF_DENS_KEYS (count · pc على zones) · dens على الطابق.
   الترتيبُ نفسُه (seq الأعمدة · ترتيبُ الإضافات: التوزيع ثم الكثافة) فالأقنعةُ والإسقاطُ والدمجُ بايتاً كما كانت (tests/unit/plugins.test.mjs: التفاضلُ مع 256). */
var ENF_LENS_COLS = KIVO_LENS_PLUGINS.cols;
var ENF_FIELD_KEYS = ['fst', 'flow', 'fAt', 'fBy', 'fKind', 'fLog', 'closed', 'off', 'cAt', 'cAtMs', 'cWhy', 'cBy'];
var ENF_LENS_ELEM = KIVO_LENS_PLUGINS.elem, ENF_LENS_FLOOR = KIVO_LENS_PLUGINS.floor;
function enfAnyLensOff(V) { for (var L in V.lens) if (!V.lens[L]) return true; return false; }
function enfColsOf(v) { var r = {}; for (var i = 0; i < ENF_LENS_COLS.length; i++) r[ENF_LENS_COLS[i]] = v[ENF_LENS_COLS[i]]; return r; }
function enfShallow(o) { var r = {}, q; for (q in o) r[q] = o[q]; return r; }
/* F24 (بلاغ راصد الميدان): التسكينُ (emp[]) قد يحمل رقمَ الموظف أو هويتَه أو اسمَه والواجهةُ تقبلها كلَّها — فالخادمُ كذلك:
   مفتاحُ الحساب ∪ رموزُ سجلّ الموظف الذي يطابقه (employees من enfRefsFor/enfEmpsLoad) */
function enfToksOf(raw, ek) {
  var t = nmap(), L = parseJson(raw == null ? '[]' : String(raw), []), i, j, e, ks; if (!ek) return t; t[ek] = 1;
  for (i = 0; Array.isArray(L) && i < L.length; i++) { e = L[i]; if (!isObj(e)) continue; ks = [e.eid, e.nid, e.name].filter(function (x) { return x != null && x !== ''; }).map(String); if (ks.indexOf(ek) !== -1) for (j = 0; j < ks.length; j++) t[ks[j]] = 1; }
  return t;
}
function enfMine(V, emp) { if (!Array.isArray(emp)) return false; for (var i = 0; i < emp.length; i++) if (V.toks ? V.toks[String(emp[i])] : String(emp[i]) === V.ekey) return true; return false; }
/* سجلُّ الموظفين لإدارات الجولات والخطة في الحفظ (refs بلا keys) */
async function enfEmpsLoad(env, refs, ks) {
  for (var i = 0; i < ks.length; i++) { var rn = resName(ks[i]), d = parseKey(ks[i]).dept; if (d && (@@SYS:enf.empsLoad.daily|empty="false"@@@@SYS:enf.empsLoad.plan@@) && !(d in refs.emps)) refs.emps[d] = await opResourceGet(env, 'bsdept:' + d + ':bassam_employees_v1'); }
}
/* عنصرٌ كما يراه الفاعل: يُسقَط منه ما لا يراه (حالةُ الرصد خارج النطاق · التسكين بلا عدسة التوزيع · الكثافة بلا عدستها) */
function enfElemMask(V, col, e, rounds) {
  var mask = [], i;
  if (!isObj(e)) return mask;
  var stub = !!rounds && V.restrict.Assigned && col !== 'paths' && !enfMine(V, e.emp);
  if (stub && col !== 'paths') mask = mask.concat(ENF_FIELD_KEYS);
  for (i = 0; i < ENF_LENS_ELEM.length; i++) if (!V.lens[ENF_LENS_ELEM[i].lens] && ENF_LENS_ELEM[i].cols.indexOf(col) !== -1) mask = mask.concat(ENF_LENS_ELEM[i].fields);
  return mask;
}
function enfMaskApply(e, mask) { if (!mask.length || !isObj(e)) return e; var o = enfShallow(e); for (var i = 0; i < mask.length; i++) delete o[mask[i]]; return o; }
function enfMaskRestore(e, ce, mask) { if (!mask.length || !isObj(e) || !isObj(ce)) return e; var o = enfShallow(e), i, f; for (i = 0; i < mask.length; i++) { f = mask[i]; if (Object.prototype.hasOwnProperty.call(ce, f)) o[f] = ce[f]; else delete o[f]; } return o; }
/* حاوية عناصر (طابق خطة · طابق جولة · مرآة الجذر): إسقاط */
function enfFloorProj(V, fl, rounds) {
  if (!isObj(fl)) return fl;
  var o = enfShallow(fl), c, col, i;
  for (c = 0; c < ENF_LENS_COLS.length; c++) {
    col = ENF_LENS_COLS[c]; if (!Array.isArray(fl[col])) continue;
    if (!V.lens[col]) { o[col] = []; continue; }
    var out = []; for (i = 0; i < fl[col].length; i++) out.push(enfMaskApply(fl[col][i], enfElemMask(V, col, fl[col][i], rounds)));
    o[col] = out;
  }
  for (c = 0; c < ENF_LENS_FLOOR.length; c++) if (!V.lens[ENF_LENS_FLOOR[c].lens] && Object.prototype.hasOwnProperty.call(o, ENF_LENS_FLOOR[c].field)) delete o[ENF_LENS_FLOOR[c].field];
  return o;
}
/* …ودمج: المحجوبُ يعود من القيمة الحالية (الخادمُ مرجعُه) — الجديدُ الذي لا نظيرَ له يبقى كما أرسله العميل فيُصنَّف ويُحكم */
function enfFloorMerge(V, nf, cf, rounds) {
  if (!isObj(nf) || !isObj(cf)) return nf;
  var o = enfShallow(nf), c, col, i;
  for (c = 0; c < ENF_LENS_COLS.length; c++) {
    col = ENF_LENS_COLS[c];
    if (!V.lens[col]) { if (cf[col] !== undefined) o[col] = cf[col]; else delete o[col]; continue; }
    if (!Array.isArray(nf[col]) || !(rounds || Array.isArray(cf[col]))) continue;
    /* F24: النظيرُ بالهوية؛ وعند تكرّرها (عناصرُ قديمةٌ بلا uid بالرمز نفسِه) فالذي في الموضع نفسِه ثم أولُ غيرِ مستعمل · وفي الجولات:
       عنصرٌ جديدٌ بلا نظير لا يُكتب فيه ما لا يراه الفاعل (الجولةُ تُنسخ من الخطة فتحمل حالاتِ عناصرِ غيره) */
    var cc = Array.isArray(cf[col]) ? cf[col] : [], byId = {}, used = {}, L, pick, q;
    for (i = 0; i < cc.length; i++) { var id0 = ENF_ID[col](cc[i]); if (id0 != null) (byId[id0] = byId[id0] || []).push(i); }
    var out = [];
    for (i = 0; i < nf[col].length; i++) {
      var e = nf[col][i], id = ENF_ID[col](e); L = id != null ? byId[id] : null; pick = -1;
      if (L) { if (L.indexOf(i) !== -1 && !used[i]) pick = i; else for (q = 0; q < L.length && pick < 0; q++) if (!used[L[q]]) pick = L[q]; }
      if (pick >= 0) { used[pick] = 1; out.push(enfMaskRestore(e, cc[pick], enfElemMask(V, col, cc[pick], rounds))); }
      else out.push(rounds ? enfMaskApply(e, enfElemMask(V, col, e, rounds)) : e);
    }
    o[col] = out;
  }
  for (c = 0; c < ENF_LENS_FLOOR.length; c++) { var ff = ENF_LENS_FLOOR[c].field; if (V.lens[ENF_LENS_FLOOR[c].lens]) continue; if (Object.prototype.hasOwnProperty.call(cf, ff)) o[ff] = cf[ff]; else delete o[ff]; }
  return o;
}
/* نظيرٌ فارغ لطابقٍ جديد: أعمدةُ العدسات المفعّلة فارغة · والمطفأةُ وحقولُها كما أُرسلت */
function enfFloorBlank(V, fl) { var o = {}, c, f; if (!isObj(fl)) return o; for (c = 0; c < ENF_LENS_COLS.length; c++) { f = ENF_LENS_COLS[c]; if (fl[f] !== undefined) o[f] = V.lens[f] ? [] : fl[f]; } for (c = 0; c < ENF_LENS_FLOOR.length; c++) { f = ENF_LENS_FLOOR[c].field; if (fl[f] !== undefined && !V.lens[ENF_LENS_FLOOR[c].lens]) o[f] = fl[f]; } return o; }
function enfMonthD(v) { return Array.isArray(v) ? { arr: true, d: v } : (isObj(v) && Array.isArray(v.d) ? { arr: false, d: v.d } : null); }
var ENF_PROJ = {
@@SYS:enf.proj.dstats@@@@SYS:enf.proj.plan@@@@SYS:enf.proj.daily@@};
/* مرجعياتُ الإسقاط لطلب: جداولُ الورديات وسجلُّ الموظفين للإدارات المعنية — الشكلُ { recs, staffing, emps } ثابتٌ لمستدعيه (019k · 019r · 019t · 020 · 062 · 063)؛
   RISHAD-266: recs فارغٌ دائماً (سقفُ النطاق القديم أُلغي فلا يُقرأ سجلُّه) */
async function enfRefsFor(env, depts, keys) {
  var out = { recs: {}, @@SYS:enf.refs.init.staff@@emps: {} }, i, d;
  for (i = 0; keys && i < depts.length; i++) { d = 'bsdept:' + depts[i] + ':bassam_employees_v1'; if (Object.prototype.hasOwnProperty.call(keys, d)) out.emps[depts[i]] = keys[d]; }   /* F24 (enfToksOf) */
@@SYS:enf.refs.load.staff@@  return out;
}
/* الإسقاطُ على نصّ قيمةٍ كما ستُرسل — يرمي عند الخطأ (fail-closed: المستدعي يرفض القراءة) */
function enfProjectStr(A, k, raw, refs) {
  if (raw == null || !A || A.u.role === 'super') return raw;
  var P = parseKey(k), rn = resName(k), PJ = ENF_PROJ[rn];
  if (!PJ) return raw;
  var V = enfViewCtx(A, P.dept || (A.u.deptId || ''), rn, refs);
  if (!PJ.on(V)) return raw;
  var v = parseJson(raw, undefined); if (v === undefined) throw new Error('enf-project-parse');
  var p = PJ.proj(v, V);
  return JSON.stringify(p);
}
/* الدمجُ عند الكتابة مع كشف العبث بالمحجوب: { v: القيمةُ بعد الدمج, hidden: هل في المرسَل ما لا يراه الفاعل }
   القاعدة: ما يرسله العميلُ يجب أن يساوي إسقاطَ ما سيُحفظ (proj(merge(cur, sent)) = sent). فإن زاد عليه
   (صفُّ ورديةٍ أخرى · حالةُ عنصرٍ خارج النطاق · عدسةٌ معطّلة · مصدرٌ لا يقرؤه · نسخةٌ قديمة قبل تغيّر نطاقه) ⇒ رفضٌ صريح (scope) لا إسقاطٌ صامت. */
function enfMergeChk(A, k, nextRaw, curRaw, refs) {
  var out = { v: nextRaw, hidden: false };
  if (nextRaw == null || curRaw == null || !A || A.u.role === 'super') return out;
  var P = parseKey(k), rn = resName(k), PJ = ENF_PROJ[rn];
  if (!PJ) return out;
  var V = enfViewCtx(A, P.dept || (A.u.deptId || ''), rn, refs);
  if (!PJ.on(V)) return out;
  var n = parseJson(nextRaw, undefined), c = parseJson(curRaw, undefined);
  if (n === undefined || c === undefined) throw new Error('enf-merge-parse');
  var m = PJ.merge(c, n, V);
  /* F24: الجولات — ما لا يراه الفاعل يعود من الخادم أو لا يُكتب (enfFloorMerge) فلا رفضَ لفرقٍ لم يصنعه (حالةٌ منسوخةٌ من الخطة · عنصران بلا uid · تسكينٌ برمزٍ قديم) */
  if (@@SYS:enf.mergeChk.daily|empty="true"@@ && !deq(PJ.proj(JSON.parse(JSON.stringify(m)), V), n)) out.hidden = true;
  out.v = deq(m, c) ? curRaw : JSON.stringify(m);
  return out;
}
