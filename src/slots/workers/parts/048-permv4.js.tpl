/* ═══ V7 · د5-هـ (44): سياقُ النطاق (permv4Ctx: الفاعل · سقفُ الفرع · اليومُ الهجري · نوافذُ الاستدراك · الأقفال · مصادرُ الإحصائيات) ومرجعياتُه المخزّنة (permv4RefsLoad) —
   يقرؤهما الإنفاذ (058 enfScopeCtx · 062 enfSavePrep) والإحصائيات. كانت هنا طبقةُ القياس الظلّية PERMV4 (R197/R198 · Phase 4/4.1: عدّاداتُ نطاق الكتابة والقراءة —
   permv4Write · permv4Early · و049 permv4Read) — حُذفت: لم تحكم يوماً. وفحصُ ربط القراءة (permv4ReadBindingCheck — تقريرُ /api/permv2) انتقل هنا من 049 المحذوف. ═══ */
/* الفاعلُ وسقفُه (Branch ceiling → allowed Departments) — من الجلسة وسجل الإدارات لا من العميل */
function permv4Actor(A) {
  var u = A.u, out = { id: u.id, ekey: String(u.ekey || ''), role: u.role, deptId: String(u.deptId || ''), mgr: !!u.mgr || String(u.ekey || '').slice(0, 4) === 'mgr:', gid: String(u.gid || '') };
  var allowed = null;
  if (u.role !== 'super') { allowed = []; for (var i = 0; i < (A.depts || []).length; i++) { var d = A.depts[i]; if (d && d.id && deptInScope(A, d.id)) allowed.push(d.id); } if (!allowed.length && u.deptId && deptInScope(A, u.deptId)) allowed.push(u.deptId); }
  return { actor: out, allowedDepts: allowed };
}
function permv4Sources(A) {
  var out = { haram: false, nabawi: false }, ds = @@SYS:permv4.sources.depts|empty="[]"@@, s, i;
  if (A.u.role === 'super') return { haram: true, nabawi: true };
@@SYS:permv4.sources.held@@  return out;
}
/* D4‑04 (v24.5): سقفُ نطاق الإدارة الصريح لكل بُعد — لا سجلَّ سقفٍ في D1 اليوم (غيرُ مهاجر) ⇒ null ⇒ unknown:unmigrated-department-ceiling.
   هذه الدالّةُ هي نقطةُ الربط الوحيدة للترحيل اللاحق (ALL · قائمة · deny)؛ لا تقرأ شيئاً من العميل ولا تكتب شيئاً. gm: union سقوف إدارات فرعه · super: سقفُ الإدارة المستهدفة — كلاهما null حتى الترحيل. */
function permv4DeptCeiling(dim, dept, actor) { return null; }
function permv4Ctx(A, d, k, okMap, ctx) {
  var ac = permv4Actor(A), pv4 = (ctx && ctx.pv4) || {}@@SYS:permv4.ctx.roster.staff@@;
  return { dept: d, keyName: k, actor: ac.actor, allowedDepts: ac.allowedDepts, deptInScope: function (x) { return deptInScope(A, x); }, today: dsToday(Date.now()), now: Date.now(),
           retroWin: (ctx && ctx.retroWin) || {}, locks: { @@SYS:permv4.locks.ctx.staff|empty="none: null"@@@@SYS:permv4.locks.ctx.tasks@@ },
           actorShift: @@SYS:permv4.actorShift.staff|empty="function () { return null; }"@@,
           held: okMap || {}, fieldOnly: !!d && enfFieldOnly(A, d), sources: permv4Sources(A), scopeValues: null, deptCeiling: permv4DeptCeiling };
}
/* مرجعياتُ النطاق المخزّنة (D1) لكل إدارةٍ تمسّها الحفظة: أقفالُ الجدول/المهام (الحالةُ قبل الحفظ) وجدولُ الورديات — قراءةٌ واحدة لكلٍّ */
async function permv4RefsLoad(env, set, del) {
  var out = {}, k, i, ks = Object.keys(set || {}); for (i = 0; i < (del || []).length; i++) ks.push(String(del[i]));
  for (i = 0; i < ks.length; i++) {
    k = ks[i]; var rn = resName(k), d = parseKey(k).dept; if (!d) continue;
    var o = out[d] = out[d] || {};
@@SYS:permv4.locks.load.staff@@@@SYS:permv4.locks.load.tasks@@    if ((@@SYS:permv4.roster.res.dreport@@@@SYS:permv4.roster.res.daily|empty="false"@@@@SYS:permv4.staffing.irshad@@@@SYS:permv4.roster.own.staff@@)@@SYS:permv4.roster.load.staff|empty=") { }"@@
  }
  return out;
}
/* الفحصُ الحيّ: اشتقاقُ مسارات القراءة من RD_REG/RES_REG/DS_READ الحيّة × الذرّات (الخوارزميةُ نفسُها التي ولّدت الجدول) ومقارنتُها بالجدول الصريح — missing/extra يجب 0.
   يُحسب مرّةً عند أول طلب /api/permv2 ولا يدخل في أي حكم. */
var PV4_READ_CHECK = null;
function permv4ReadBindingCheck() {
  if (PV4_READ_CHECK) return PV4_READ_CHECK;
  var out = { ok: true, resources: 0, missing: [], extra: [], unknownResource: [], extraResource: [], stateKeys: [] }, RB = KIVO_SCOPE.readBindings && KIVO_SCOPE.readBindings.byResource, R = KIVO_REGISTRY, name, Rr, i, j;
  var primaryOf = function (cap, targets) {
    var acc = [], own = [], own2 = [], mg = [], t, e, q;
    for (q = 0; q < targets.length; q++) { t = targets[q]; e = R.byKey[t]; if (!e) continue; if (e.owner === cap && e.type === 'access') acc.push(t); if (e.owner === cap && !/^ref\./.test(t)) own.push(t); if (e.owner === cap) own2.push(t); if (e.managedIn === cap) mg.push(t); }
    return acc.length ? acc : (own.length ? own : (own2.length ? own2 : (mg.length ? mg : targets)));
  };
  var SP = (KIVO_SCOPE.readBindings && KIVO_SCOPE.readBindings.special) || { keys: {}, rule: {} };
  for (name in RES_REG) {
    Rr = RES_REG[name]; if (Rr.scope === 'device') continue;
    var expect = [];
    if (Rr.scope === 'global') {
@@SYS:permv4.read.dstats@@    } else if (Rr.rule) { expect = (SP.rule[name] && SP.rule[name].keys) || []; }
    else {
      var caps = readCapsOf(name, Rr), seen = {};
      for (i = 0; i < caps.length; i++) {
        var cap = caps[i]; if (seen[cap]) continue; seen[cap] = 1;
        var at = R.atoms[cap + ':view']; if (!at || at.disposition === 'obsolete') continue;
        var targets = [], prim; for (j = 0; j < at.targets.length; j++) if (R.byKey[at.targets[j]] && R.byKey[at.targets[j]].status === 'active') targets.push(at.targets[j]);
        prim = primaryOf(cap, targets);
        for (j = 0; j < targets.length; j++) {
          var t = targets[j], e = R.byKey[t], bound = e.guard.kind === 'read' && e.guard.resources.indexOf(name) !== -1, isPrim = prim.indexOf(t) !== -1;
          var sp = SP.keys[t] && (SP.keys[t].resources === '*dept' || SP.keys[t].resources.indexOf(name) !== -1);
          if (bound || sp || (isPrim && e.guard.kind === 'read')) expect.push(t);
        }
      }
    }
    var ex = {}, got = {}, k; for (i = 0; i < expect.length; i++) ex[expect[i]] = 1;
    if (!RB || !RB[name]) { out.unknownResource.push(name); out.ok = false; continue; }
    out.resources++; for (i = 0; i < RB[name].keys.length; i++) got[RB[name].keys[i]] = 1;
    for (k in ex) if (!got[k]) { out.missing.push(name + ':' + k); out.ok = false; }
    for (k in got) if (!ex[k]) { out.extra.push(name + ':' + k); out.ok = false; }
  }
  /* موردٌ في الجدول خارج RES_REG: مسموحٌ فقط لمفاتيح الحالة المعلَنة (dept-state — RETRO.*.state) وبلا مفاتيح؛ غيرُ ذلك extraResource */
  var stateNames = {}; for (k in RETRO) stateNames[RETRO[k].state] = 1;
  for (name in RB) { if (RES_REG[name]) continue; if (RB[name].scope === 'dept-state' && stateNames[name] && !RB[name].keys.length) { out.stateKeys.push(name); continue; } out.extraResource.push(name); out.ok = false; }
  for (k in stateNames) if (!RB[k]) { out.missing.push(k + ':(state key not in table)'); out.ok = false; }
  PV4_READ_CHECK = out; return out;
}
