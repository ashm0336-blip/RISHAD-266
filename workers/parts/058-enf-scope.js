/* ══ (2) النطاق — سجلُّ النطاق المنفصل (bsdept:<d>:bassam_scope_v1 · v24.6 §17.2) وتقييمُ الأبعاد في وضع الإنفاذ ══
   السقف (Department Scope Ceiling):  ceiling['Site' | 'Zone/Element'] = { mode: ALL | list | unknown, list: [...] }
   الموظف (Employee Scope):           emp[ekey]['Site' | 'Zone/Element'] = { mode: inherit | list | single | unknown, value, list }
                                      emp[ekey]['Shift'] = { mode: staffing-bound | list | n/a | unknown, list }
   القواعد: R1 الدورُ ≠ ALL · R2 GM يُقيَّم بسقف الإدارة المستهدفة · R3 super يحترم سقفَ الإدارة · R4 Shift للمدير بلا قيد ·
            R6 لا قيمةَ بلا دليل · Default Deny: غيابُ القيمة أو unknown ⇒ رفض (الإنفاذ) · قيمةُ الموظف ضمن السقف دائماً. */
var ENF_SCOPE_MODES = { 'Site': { ALL: 1, list: 1, unknown: 1 }, 'Zone/Element': { ALL: 1, list: 1, unknown: 1 } };
var ENF_EMP_MODES = { 'Site': { inherit: 1, list: 1, single: 1, unknown: 1 }, 'Zone/Element': { inherit: 1, list: 1, single: 1, unknown: 1 }, 'Shift': { 'staffing-bound': 1, list: 1, 'n/a': 1, unknown: 1 } };
function enfScopeKey(d) { return 'bsdept:' + d + ':' + ENF_SCOPE_RES; }
function enfScopeParse(raw) { var v = typeof raw === 'string' ? parseJson(raw, null) : raw; return isObj(v) ? v : null; }
/* سجلّاتُ النطاق للإدارات المعنية — قراءةٌ واحدة لكل إدارة (أو من مفاتيحَ حُمّلت سلفاً) */
async function enfScopeRecs(env, depts, keys) {
  var out = {}, i, d;
  for (i = 0; i < depts.length; i++) {
    d = depts[i]; if (!d || out[d] !== undefined) continue;
    var raw = keys && Object.prototype.hasOwnProperty.call(keys, enfScopeKey(d)) ? keys[enfScopeKey(d)] : (keys ? null : await kvGet(env, 'kv', enfScopeKey(d)));
    out[d] = enfScopeParse(raw);
  }
  return out;
}
/* سقفُ الإدارة لبُعد: 'ALL' · قائمة · null (غيرُ مهاجر/مجهول ⇒ unknown) */
function enfCeilingOf(E, d, dim) {
  var r = E && E.recs ? E.recs[d] : null, c = r && isObj(r.ceiling) ? r.ceiling[dim] : null;
  if (!isObj(c)) return null;
  if (c.mode === 'ALL') return 'ALL';
  if (c.mode === 'list' && Array.isArray(c.list)) return c.list.map(String);
  return null;
}
function enfEmpScopeOf(E, d, ekey, dim) {
  if (!ekey) return null;
  var r = E && E.recs ? E.recs[d] : null, s = r && isObj(r.emp) && isObj(r.emp[ekey]) ? r.emp[ekey][dim] : null;
  if (!isObj(s) || !ENF_EMP_MODES[dim] || !ENF_EMP_MODES[dim][s.mode]) return null;
  return s;
}
/* خطةُ إدارةٍ «غير موجودة»: لا قيمة أو لا موقعَ ولا عنصرَ فيها — لا شيءَ مما يُحدَّد منه السقف
   KIVO_263 · مراجعة مستقلة: «بلا طوابق» وحدها كانت تعدّ «فارغةً» خطةً طوابقُها العليا فارغة وفيها خطةُ شهرٍ (months[k]: مصفوفةً أو {c, d})
   أو عناصرُ في مرآة الجذر (zones · gates · marks · paths) — فيعدّل مديرُ النظام ذلك المحتوى أو يحذفه بلا سقف. الآن يُسأل مستخرِجُ المحرّك نفسُه
   (KIVO_SCOPE.extract بوضع القراءة: floors · months[k] بشكليها · عناصرُ كل طابق · مرآةُ الجذر): أيُّ بندٍ يحمل هويةَ موقعٍ أو عنصر ⇒ الخطةُ موجودة.
   فالخطةُ «الفارغة» لا يُرى في كتابتها موقعٌ ولا عنصرٌ إلا مضافاً — الاستثناءُ لإنشاء الخطة الأولى وحده. */
function enfPlanEmpty(a) {
  if (!a || typeof a !== 'object') return true;
  if (Array.isArray(a.floors) && a.floors.length) return false;                       /* موقعٌ في floors ⇒ موجودة (كما كان · بلا مشي) */
  var its = KIVO_SCOPE.extract('bassam_plan_v1', undefined, a, { read: true }), i;
  for (i = 0; i < its.length; i++) if (enfSides(its[i], 'site').length || enfSides(its[i], 'element').length) return false;
  return true;
}
function enfHas(list, v) { for (var i = 0; i < list.length; i++) if (String(list[i]) === String(v)) return true; return false; }
function enfSides(it, f) {
  var o = it[f]; if (!o) return [];
  var out = [];
  if (it.kind !== 'added' && o.old != null && o.old !== '') out.push({ side: 'old', v: o.old });
  if (it.kind !== 'removed' && o.new != null && o.new !== '') out.push({ side: 'new', v: o.new });
  if (!out.length && it.kind === 'added' && o.new != null) out.push({ side: 'new', v: o.new });
  return out;
}
function enfR(r, why, x) { var o = { r: r, why: why || '' }; if (x) for (var q in x) o[q] = x[q]; return o; }
/* Site · Zone/Element — قيمةُ الموظف (أو الوراثة) ضمن سقف الإدارة؛ فاعلو السقف بسقف الإدارة المستهدفة */
function enfValueDim(dim, field) {
  return function (item, key, ctx, res) {
    var vs = enfSides(item, field);
    if (!vs.length) return enfR('not_applicable', 'no-' + field + '-identity');
    /* الاسترشاد/المضبوطات: Site = loc (مواقعُ السجلات) — خارج نموذج ترحيل Site (§17.2 «خارج هذا الترحيل») ⇒ لا قيدَ موقعٍ عليها حتى يُعتمد نموذجُه (معلَن) */
    if (dim === 'Site' && (res === 'bassam_irshad_v1' || res === 'bassam_seized_v1')) return enfR('not_applicable', 'loc-outside-site-migration (declared)');
    var E = ctx.enf, ds0 = enfSides(item, 'dept'), tgt = ds0.length ? String(ds0[ds0.length - 1].v) : ctx.dept;
    var actor = ctx.actor || {}, ceilActor = KIVO_SCOPE.isCeiling(actor), i, v;
    var lst = null;
    if (!ceilActor) {
      var es = enfEmpScopeOf(E, tgt, actor.ekey, dim);
      if (!es || es.mode === 'unknown') return enfR('unknown', 'unmigrated-' + (dim === 'Site' ? 'site' : 'element') + '-scope', { migrationNeeded: true, value: vs.map(function (x) { return x.v; }) });
      if (es.mode === 'list') lst = Array.isArray(es.list) ? es.list : [];
      else if (es.mode === 'single') lst = es.value != null ? [es.value] : [];
    }
    if (lst) for (i = 0; i < vs.length; i++) if (!enfHas(lst, vs[i].v)) return enfR('deny', dim + '-out-of-scope (' + vs[i].side + ':' + vs[i].v + ')', { basis: 'explicit employee scope' });
    var ceil = enfCeilingOf(E, tgt, dim);
    /* KIVO_263 · SOT-188 «الخطةُ الأولى»: إدارةٌ بلا خطةٍ ولا سقف ⇒ لا مواقعَ يُحدَّد منها السقف ولا سقفَ تُنشأ به الخطة (طريقٌ مسدود).
       يُفتح لمدير النظام وحده إنشاءُ الخطة الأولى (الخطةُ القديمة بلا موقعٍ ولا عنصر — enfPlanEmpty) — لا سقفَ يُفترض ولا وصولَ يُمنح: مديرُ الإدارة وموظفوها
       يبقون مرفوضين «scope-unknown» حتى يحسم المالكُ السقف، وأيُّ تعديلٍ لاحقٍ للخطة (حتى من مدير النظام) يعود إلى القاعدة نفسِها. */
    if (ceil === null && actor.role === 'super' && E && E.firstPlan && String(E.firstPlan) === String(tgt)) return enfR('allow', 'first-plan-bootstrap (system admin · department has no plan and no ceiling yet)', { basis: 'SOT-188 first plan — no ceiling assumed' });
    if (ceil === null) return enfR('unknown', 'unmigrated-department-ceiling', { migrationNeeded: true, basis: 'D4-04 / R1' });
    if (ceil !== 'ALL') for (i = 0; i < vs.length; i++) { v = vs[i].v; if (!enfHas(ceil, v)) return enfR('deny', dim + '-outside-department-ceiling (' + vs[i].side + ':' + v + ')', { basis: 'D4-04 explicit Department Scope Ceiling' }); }
    return enfR('allow', dim + (lst ? '-in-employee-scope' : '-within-department-ceiling'), { basis: lst ? 'explicit employee scope ∧ ceiling' : (ceilActor ? 'ceiling actor (D4-04)' : 'inherit (ceiling)') });
  };
}
/* Shift (D4-09: قراءةً وكتابةً) — فاعلو السقف بلا قيد (R4) · الموظف: مربوطٌ بالجدول الشهري الحيّ أو قائمةٌ صريحة */
function enfShiftDim(item, key, ctx) {
  var vs = enfSides(item, 'shift'); if (!vs.length) return enfR('not_applicable', 'no-shift-identity');
  var actor = ctx.actor || {}, i;
  if (KIVO_SCOPE.isCeiling(actor)) return enfR('allow', 'manager-unconstrained (R4)');
  var es = enfEmpScopeOf(ctx.enf, ctx.dept, actor.ekey, 'Shift');
  if (!es || es.mode === 'unknown') return enfR('unknown', 'unmigrated-shift-scope', { migrationNeeded: true });
  if (es.mode === 'n/a') return enfR('allow', 'shift-not-applicable (explicit employee scope)');
  if (es.mode === 'list') { var L = Array.isArray(es.list) ? es.list : []; for (i = 0; i < vs.length; i++) if (!enfHas(L, vs[i].v)) return enfR('deny', 'shift-out-of-scope (' + vs[i].side + ':' + vs[i].v + ')'); return enfR('allow', 'shift-in-scope (list)'); }
  var p = item.period && (item.period.new || item.period.old), mine = typeof ctx.actorShift === 'function' ? ctx.actorShift(p ? p.y + '-' + p.m : '') : null;
  if (!mine) return enfR('deny', 'no-staffing-shift (staffing-bound: no schedule row for ' + (p ? p.y + '-' + p.m : 'the period') + ')');
  for (i = 0; i < vs.length; i++) if (String(vs[i].v) !== String(mine)) return enfR('deny', 'shift-out-of-scope (' + vs[i].side + ':' + vs[i].v + ' ≠ ' + mine + ')', { basis: 'staffing-bound' });
  return enfR('allow', 'staffing-shift-match');
}
/* تركيبُ المقيِّمات على المحرّك نفسِه: تعمل فقط حين ctx.enf (وضع الإنفاذ) — الظلُّ القديم يمرّ إلى المقيِّمات الأصلية كما هي */
(function () {
  var D = KIVO_SCOPE._D, o = { Site: D['Site'], Zone: D['Zone/Element'], Shift: D['Shift'] };
  var vSite = enfValueDim('Site', 'site'), vZone = enfValueDim('Zone/Element', 'element');
  D['Site'] = function (item, key, ctx, res) { return ctx && ctx.enf ? vSite(item, key, ctx, res) : o.Site(item, key, ctx, res); };
  D['Zone/Element'] = function (item, key, ctx, res) { return ctx && ctx.enf ? vZone(item, key, ctx, res) : o.Zone(item, key, ctx, res); };
  D['Shift'] = function (item, key, ctx, res) { return ctx && ctx.enf ? enfShiftDim(item, key, ctx, res) : o.Shift(item, key, ctx, res); };
})();
/* المصدر (Source) في الإحصائيات: كتابةً = أوراقُ الإدخال/الاعتماد · قراءةً = العرضُ والتحليل (تحليلُ مسجدٍ يقرأ مصدره · المقارنتان تقرآن الاثنين — تفسيرٌ معلَن) */
var ENF_SRC_READ = { haram: ['dstats.haram.view', 'dstats.anHaram.view', 'dstats.anCmp.view', 'dstats.anTime.view'], nabawi: ['dstats.nabawi.view', 'dstats.anNabawi.view', 'dstats.anCmp.view', 'dstats.anTime.view'] };
var ENF_SRC_WRITE = { haram: ['dstats.haram.entry', 'dstats.haram.approve', 'dstats.haram.reopen'], nabawi: ['dstats.nabawi.entry', 'dstats.nabawi.approve', 'dstats.nabawi.reopen'] };
function enfSources(A, mode) {
  if (A.u.role === 'super') return { haram: true, nabawi: true };
  var T = mode === 'write' ? ENF_SRC_WRITE : ENF_SRC_READ, out = { haram: false, nabawi: false }, s, i;
  for (s in T) for (i = 0; i < T[s].length && !out[s]; i++) if (enfHeldAnyDept(A, T[s][i])) out[s] = true;
  return out;
}
/* سياقُ التقييم في وضع الإنفاذ: سياقُ الظلّ نفسُه (permv4Ctx: الفاعل · سقفُ الفرع · اليومُ الهجري · نوافذُ الاستدراك · الأقفال · جدولُ الورديات)
   + سجلّاتُ النطاق الصريحة + المصادر + مفاتيحُ الفاعل المحمولة (لا قرارُ الظلّ) */
function enfScopeCtx(A, d, k, heldMap, X, mode) {
  X = X || {};
  var cx = permv4Ctx(A, d, k, heldMap, { pv4: X.pv4 || {}, retroWin: X.retroWin || {} });
  cx.enf = { recs: X.recs || {}, mode: mode || 'write', firstPlan: X.firstPlan || null };
  cx.sources = enfSources(A, mode || 'write');
  cx.deptCeiling = function (dim, dept) { return enfCeilingOf(cx.enf, dept, dim); };
  cx.scopeValues = null;
  return cx;
}
/* خريطةُ «المحمول» للمحرّك: المفاتيحُ الممنوحة فعلاً (لا قواعدُ الذات — ليُفرض Own/Assigned عليها) */
function enfHeldMap(A, d, keys) { var m = {}, i, ix = enfIx(); for (i = 0; i < keys.length; i++) if (!ix.selfK[keys[i]] && enfHeld(A, d, keys[i])) m[keys[i]] = true; return m; }
/* KIVO_263 · مراجعة مستقلة: محتوى الحاويات في كتابة الخطة — المحرّكُ المثبَّت (010 · v24.9) لا يرى في وضع الكتابة: شهراً أُضيف أو حُذف كاملاً
   (بندُ «شهر» بلا موقعٍ ولا عنصر) · عناصرَ طابقٍ أُضيف أو حُذف (في floors أو داخل شهر) · تعديلَ حقلٍ غيرِ عدسيٍّ لطابقٍ داخل شهر (الاسمُ مثلاً —
   وفي floors يراه floorEdit). فكان يُدخَل موقعٌ خارج السقف بشهرٍ يحمله، ويُحذف شهرٌ بمواقعَ خارجه، وتُنشأ عناصرُ لا يُسأل عنها بُعدُ Zone/Element.
   الهويّاتُ من مستخرِج المحرّك نفسِه (KIVO_SCOPE.extract: كتابةً على حاوياتٍ معزولة ⇒ المضافُ والمحذوفُ وfloorEdit بمطابقته · قراءةً ⇒ محتواها
   بهويّاتها f:<sid> · u:<uid> …)، وتُقيَّم بمقيِّمَي الإنفاذ (Site · Zone/Element) في سياق الكتابة نفسِه: السقفُ (ومديرُ النظام · D4-04) · نطاقُ الموظف ·
   ALL · null ⇒ unknown · الخطةُ الأولى. الجديدُ بجانب new · المحذوفُ بجانب old · المعدَّلُ بالجانبين. للخطة في الإنفاذ وحده — القراءةُ والوضعُ القديم كما هما. */
var ENF_PLAN_RES = 'bassam_plan_v1';
function enfMonthFloors(v) { return Array.isArray(v) ? v : (isObj(v) && Array.isArray(v.d) ? v.d : []); }   /* months[k]: طوابقُ أو {c, d} — كتطبيع المحرّك */
/* محتوى طوابق كما يقرؤه المحرّك (طابقٌ ⇒ موقعُه · عنصرٌ ⇒ موقعُه وهويّتُه) منقولاً إلى جانبٍ — only: هويّاتُ الطوابق المختارة */
function enfPlanPush(out, floors, side, only) {
  var its = KIVO_SCOPE.extract(ENF_PLAN_RES, undefined, { floors: floors }, { read: true }), i, s, e;
  for (i = 0; i < its.length; i++) {
    s = its[i].site ? its[i].site.new : null; e = its[i].element ? its[i].element.new : null;
    if ((s == null && e == null) || (only && !(s != null && only[s]))) continue;
    out.push(side === 'new' ? { kind: 'added', site: { old: null, new: s }, element: { old: null, new: e } } : { kind: 'removed', site: { old: s, new: null }, element: { old: e, new: null } });
  }
}
/* قائمتا طوابق: المضافُ والمحذوفُ (بمطابقة المحرّك) ⇒ محتواه · edits (داخل شهر): floorEdit ⇒ الموقعُ بالجانبين */
function enfPlanFloors(out, la, lb, edits) {
  if (deq(la, lb)) return;
  var W = KIVO_SCOPE.extract(ENF_PLAN_RES, { floors: la }, { floors: lb }, {}), add = nmap(), rem = nmap(), nA = 0, nR = 0, i, x;
  for (i = 0; i < W.length; i++) {
    x = W[i];
    if (x.what === 'floor' && x.kind === 'added') { add[x.id] = 1; nA++; }
    else if (x.what === 'floor' && x.kind === 'removed') { rem[x.id] = 1; nR++; }
    else if (edits && x.what === 'floorEdit') out.push({ kind: 'changed', site: { old: x.id, new: x.id } });
  }
  if (nA) enfPlanPush(out, lb, 'new', add);
  if (nR) enfPlanPush(out, la, 'old', rem);
}
function enfPlanHidden(a, b) {
  a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
  var out = [], ma = isObj(a.months) ? a.months : {}, mb = isObj(b.months) ? b.months : {}, ks = nmap(), k;
  enfPlanFloors(out, Array.isArray(a.floors) ? a.floors : [], Array.isArray(b.floors) ? b.floors : [], false);   /* floorEdit في floors يراه المحرّك */
  for (k in ma) ks[k] = 1;
  for (k in mb) ks[k] = 1;
  for (k in ks) {
    if (deq(ma[k], mb[k])) continue;
    if (ma[k] === undefined) enfPlanPush(out, enfMonthFloors(mb[k]), 'new', null);
    else if (mb[k] === undefined) enfPlanPush(out, enfMonthFloors(ma[k]), 'old', null);
    else enfPlanFloors(out, enfMonthFloors(ma[k]), enfMonthFloors(mb[k]), true);
  }
  return out;
}
/* التقييم: لكتابةٍ يقيّد أحدَ مفاتيحها الموقعُ أو العنصر (مفاتيحُ الخطة كلُّها كذلك) — بمقيِّمَي المحرّك (D مركَّباً عليه الإنفاذ أعلاه) والسياقِ نفسِه */
function enfPlanHiddenEval(cx, keys, a, b) {
  var R = { n: 0, deny: [], unknown: [], denyDims: [], unknownDims: [] }, on = false, dims = ['Site', 'Zone/Element'], i, j, e, H, r, w;
  for (i = 0; i < keys.length && !on; i++) { e = KIVO_REGISTRY.byKey[keys[i]]; on = !!e && (e.scopeDims.indexOf('Site') !== -1 || e.scopeDims.indexOf('Zone/Element') !== -1); }
  if (!on) return R;
  H = enfPlanHidden(a, b); R.n = H.length;
  for (i = 0; i < H.length; i++) for (j = 0; j < dims.length; j++) {
    r = KIVO_SCOPE._D[dims[j]](H[i], keys[0], cx, ENF_PLAN_RES);
    if (r.r !== 'deny' && r.r !== 'unknown') continue;
    w = 'hidden:' + dims[j] + '=' + r.why;
    if (R[r.r].indexOf(w) === -1) R[r.r].push(w);
    if (R[r.r + 'Dims'].indexOf(dims[j]) === -1) R[r.r + 'Dims'].push(dims[j]);
  }
  return R;
}
function enfEmpCanon(v, tk, ek) {
  if (Array.isArray(v)) return v.map(function (x) { return enfEmpCanon(x, tk, ek); });
  if (!isObj(v)) return v;
  var o = {}, q; for (q in v) o[q] = q === 'emp' && Array.isArray(v[q]) ? v[q].map(function (t) { return tk[String(t)] ? ek : t; }) : enfEmpCanon(v[q], tk, ek);
  return o;
}
/* نطاقُ كتابةٍ واحدة: كلُّ عنصرٍ متأثر (Bulk: all affected items) — deny أو unknown ⇒ رفض (Default Deny) */
function enfScopeEval(A, d, k, rn, a, b, keys, X) {
  if (!keys.length) return { composite: 'not_applicable', denyDims: [], unknownDims: [], items: 0, why: '' };
  if (rn === 'bassam_plan_v1' && d && enfPlanEmpty(a)) { X = Object.assign({}, X || {}); X.firstPlan = d; }   // SOT-188: الخطةُ الأولى (انظر enfValueDim)
  /* F24: تسكينٌ برقم الموظف أو هويته أو اسمه يُقرأ مفتاحَ حسابه قبل المقيِّم المرجعي (Assigned يقارن بـekey وحده) — للتقييم وحده */
  var ek = String(A.u.ekey || ''), tk = ek && X && X.emps && (rn === 'bassam_rounds_v1' || rn === ENF_PLAN_RES) ? enfToksOf(X.emps[d], ek) : null;
  if (tk && Object.keys(tk).length > 1) { a = enfEmpCanon(a, tk, ek); b = enfEmpCanon(b, tk, ek); }
  var cx = enfScopeCtx(A, d, k, enfHeldMap(A, d, keys), X, 'write');
  var W = KIVO_SCOPE.evaluateWrite(keys, cx.actor, rn, a, b, cx), whys = [], key, r, i;
  for (key in W.perKey) { r = W.perKey[key]; for (i = 0; i < r.denyDims.length; i++) whys.push(key + ':' + r.denyDims[i] + '=' + r.results[r.denyDims[i]].why); for (i = 0; i < r.unknownDims.length; i++) whys.push(key + ':' + r.unknownDims[i] + '=' + r.results[r.unknownDims[i]].why); }
  /* KIVO_263 · مراجعة مستقلة: المحتوى المخفيّ في الخطة (enfPlanHidden) — deny ⇒ deny · unknown بلا deny ⇒ unknown · سببُه أولاً إن غيّر الحكم */
  var c = W.composite, H = rn === ENF_PLAN_RES ? enfPlanHiddenEval(cx, keys, a, b) : null, hw = H ? H.deny.concat(H.unknown) : [];
  if (hw.length) { var nc = H.deny.length || c === 'deny' ? 'deny' : 'unknown'; whys = nc !== c ? hw.concat(whys) : whys.concat(hw); c = nc; }
  return { composite: c, denyDims: H ? enfUniq(W.denyDims.concat(H.denyDims)) : W.denyDims, unknownDims: H ? enfUniq(W.unknownDims.concat(H.unknownDims)) : W.unknownDims, items: W.items, hidden: H ? H.n : 0, bulk: W.bulk, why: whys.slice(0, 8).join(' · ') };
}
