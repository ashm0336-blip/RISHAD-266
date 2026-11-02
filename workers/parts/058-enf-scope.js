/* ══ (2) النطاق في وضع الإنفاذ ══
   RISHAD-266 · تقاعدُ «سقف النطاق القديم» (bsdept:<d>:bassam_scope_v1 — ceiling[Site|Zone/Element] · emp[ekey][Site|Zone/Element|Shift]):
   لا يُقرأ السجلُّ ولا يُكتب، وأبعادُ الموقع والعنصر والوردية لا تنطبق في الإنفاذ (not_applicable · legacy-scope-retired) — كان غيابُه يرفض
   (unmigrated-*) كلَّ كتابةٍ تحمل موقعاً أو عنصراً أو ورديةً لمن لا سجلَّ له. ما يضيّق الوصولَ الآن: سقفُ الوحدة (bassam_perms_v1 · caps/capOwn · 021)
   والمفاتيحُ المحمولة والعزلُ (Department/Branch: deptInScope · isMgrOf) والأبعادُ الباقية (Assigned · Source · Own · DateRange) كما كانت حرفاً.
   حذفُ ما بقي منه: خطوةُ «scope-retire» في /api/authz-migrate (063 enfRetirePlan). */
/* تركيبٌ على المحرّك نفسِه: يعمل فقط حين ctx.enf (وضع الإنفاذ) — الظلُّ القديم يمرّ إلى المقيِّمات الأصلية كما هي */
(function () {
  var D = KIVO_SCOPE._D, o = { Site: D['Site'], Zone: D['Zone/Element'], Shift: D['Shift'] };
  var retired = function () { return { r: 'not_applicable', why: 'legacy-scope-retired' }; };
  D['Site'] = function (item, key, ctx, res) { return ctx && ctx.enf ? retired() : o.Site(item, key, ctx, res); };
  D['Zone/Element'] = function (item, key, ctx, res) { return ctx && ctx.enf ? retired() : o.Zone(item, key, ctx, res); };
  D['Shift'] = function (item, key, ctx, res) { return ctx && ctx.enf ? retired() : o.Shift(item, key, ctx, res); };
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
   + المصادر + مفاتيحُ الفاعل المحمولة (لا قرارُ الظلّ) — cx.enf علامةُ الإنفاذ للمقيِّمات أعلاه */
function enfScopeCtx(A, d, k, heldMap, X, mode) {
  X = X || {};
  var cx = permv4Ctx(A, d, k, heldMap, { pv4: X.pv4 || {}, retroWin: X.retroWin || {} });
  cx.enf = { mode: mode || 'write' };
  cx.sources = enfSources(A, mode || 'write');
  cx.scopeValues = null;
  return cx;
}
/* خريطةُ «المحمول» للمحرّك: المفاتيحُ الممنوحة فعلاً (لا قواعدُ الذات — ليُفرض Own/Assigned عليها) */
function enfHeldMap(A, d, keys) { var m = {}, i, ix = enfIx(); for (i = 0; i < keys.length; i++) if (!ix.selfK[keys[i]] && enfHeld(A, d, keys[i])) m[keys[i]] = true; return m; }
function enfEmpCanon(v, tk, ek) {
  if (Array.isArray(v)) return v.map(function (x) { return enfEmpCanon(x, tk, ek); });
  if (!isObj(v)) return v;
  var o = {}, q; for (q in v) o[q] = q === 'emp' && Array.isArray(v[q]) ? v[q].map(function (t) { return tk[String(t)] ? ek : t; }) : enfEmpCanon(v[q], tk, ek);
  return o;
}
/* نطاقُ كتابةٍ واحدة: كلُّ عنصرٍ متأثر (Bulk: all affected items) — deny أو unknown ⇒ رفض (Default Deny) */
function enfScopeEval(A, d, k, rn, a, b, keys, X) {
  if (!keys.length) return { composite: 'not_applicable', denyDims: [], unknownDims: [], items: 0, why: '' };
  /* F24: تسكينٌ برقم الموظف أو هويته أو اسمه يُقرأ مفتاحَ حسابه قبل المقيِّم المرجعي (Assigned يقارن بـekey وحده) — للتقييم وحده */
  var ek = String(A.u.ekey || ''), tk = ek && X && X.emps && (rn === 'bassam_rounds_v1' || rn === 'bassam_plan_v1') ? enfToksOf(X.emps[d], ek) : null;
  if (tk && Object.keys(tk).length > 1) { a = enfEmpCanon(a, tk, ek); b = enfEmpCanon(b, tk, ek); }
  var cx = enfScopeCtx(A, d, k, enfHeldMap(A, d, keys), X, 'write');
  var W = KIVO_SCOPE.evaluateWrite(keys, cx.actor, rn, a, b, cx), whys = [], key, r, i;
  for (key in W.perKey) { r = W.perKey[key]; for (i = 0; i < r.denyDims.length; i++) whys.push(key + ':' + r.denyDims[i] + '=' + r.results[r.denyDims[i]].why); for (i = 0; i < r.unknownDims.length; i++) whys.push(key + ':' + r.unknownDims[i] + '=' + r.results[r.unknownDims[i]].why); }
  return { composite: W.composite, denyDims: W.denyDims, unknownDims: W.unknownDims, items: W.items, hidden: 0, bulk: W.bulk, why: whys.slice(0, 8).join(' · ') };
}
