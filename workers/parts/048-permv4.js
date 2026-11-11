/* ═══ R197/R198 · Phase 4 → 4.1 — Data Scope Shadow Mode: PERMV4 = { write, read } — نطاقُ كلِّ كتابةٍ (evaluateWrite) وكلِّ قراءةٍ فعلية (evaluateRead · D4‑01) يُحسب بـKIVO_SCOPE ويُقارَن بالحكم القديم ولا يغيّره ═══
   Phase 4.1 (v24.5): D4‑02/D4‑03 بدل AC‑01/AC‑02 (deny معلَن لمدير النظام على الفترات المقفلة/المغلقة بلا نافذة — السلوكُ الحالي كما هو) · D4‑04 ctx.deptCeiling (لا سجلَّ سقفٍ ⇒ unmigrated) · telemetry مستقل scope.write / scope.read.
   السياقُ يُستخرج خادمياً: الإدارةُ من المفتاح · الفاعلُ من الجلسة · سقفُ الفرع من deptInScope/ancChain · اليومُ الهجري للخادم · نوافذُ الاستدراك ·
   أقفالُ الجدول/المهام وجدولُ الورديات من D1 (قراءةٌ واحدة لكل إدارة) · قرارُ الصلاحية من Phase 2.1 (okMap) · بوابةُ العدسة من Phase 3.
   علاماتُ العمليات (import.run · backup.restore) لا تمرّ إلى المحرّك أصلاً — لا تحدّد ولا توسّع النطاق.
   التصنيفُ الرباعي لكل كتابة: agree · expected (design) · unknown/migration-needed · unexpected (يجب أن يبقى 0). */
function pv4Cnt() { return { calls: 0, allow: 0, deny: 0, unknown: 0, notApplicable: 0 }; }
var PERMV4 = {
  phase: 4.1, mode: 'shadow',
  /* الكتابة (Phase 4 كما اعتُمدت) — تحت write؛ scope.stats في /api/permv2 اسمٌ بديل لها للتوافق */
  write: { phase: 4.1, patch: '4.5', mode: 'shadow', seen: 0, calls: 0, allow: 0, deny: 0, unknown: 0, notApplicable: 0, unknownByActor: {},
    byDimension: {}, byPermission: {}, byResource: {}, byKind: {}, agree: 0, expectedMismatch: 0, unknownMigration: 0, unexpectedMismatch: 0,
    missingEvidence: 0, missingEvidenceByDim: {}, migrationNeeded: 0, migrationNeededByDim: {}, transitions: 0, bulk: { writes: 0, items: 0, allowed: 0, denied: 0, unknown: 0, mixed: 0 },
    lensFull: { n: 0, agree: 0, expected: 0, unknown: 0, unexpected: 0, byPart: { ceilingOff: 0, assignmentOff: 0, permissionOff: 0, scopeDeny: 0, scopeUnknown: 0 } },
    decisions: {}, samples: [], unexpectedSamples: [], unknownSamples: [] },
  /* القراءة (D4‑01) — مستقلةٌ تماماً عن الكتابة */
  read: { phase: 4.1, patch: '4.5', mode: 'shadow', seen: 0, calls: 0, allow: 0, deny: 0, unknown: 0, notApplicable: 0, asisDeny: 0, noReadKey: 0, heldKeyReads: 0, nonHolderReads: 0, unknownByActor: {},
    bySelectionMode: {}, bySelectedKey: {}, byBindingSource: {}, byNoReadKeyClass: {}, allowedWithoutSelectedKey: 0, fieldViewReads: 0, fieldViewProbeReads: 0,
    byWhere: {}, byDimension: {}, byPermission: {}, byResource: {}, byKind: {}, agree: 0, expectedMismatch: 0, unknownMigration: 0, unexpectedMismatch: 0,
    rows: { items: 0, allowed: 0, denied: 0, unknown: 0, notApplicable: 0 }, truncatedReads: 0, truncatedItems: 0, skippedBudget: 0,
    missingEvidence: 0, missingEvidenceByDim: {}, migrationNeeded: 0, migrationNeededByDim: {}, samples: [], unexpectedSamples: [], unknownSamples: [] }
};
/* الفاعلُ وسقفُه (Branch ceiling → allowed Departments) — من الجلسة وسجل الإدارات لا من العميل */
function permv4Actor(A) {
  var u = A.u, out = { id: u.id, ekey: String(u.ekey || ''), role: u.role, deptId: String(u.deptId || ''), mgr: !!u.mgr || String(u.ekey || '').slice(0, 4) === 'mgr:', gid: String(u.gid || '') };
  var allowed = null;
  if (u.role !== 'super') { allowed = []; for (var i = 0; i < (A.depts || []).length; i++) { var d = A.depts[i]; if (d && d.id && deptInScope(A, d.id)) allowed.push(d.id); } if (!allowed.length && u.deptId && deptInScope(A, u.deptId)) allowed.push(u.deptId); }
  return { actor: out, allowedDepts: allowed };
}
/* P4.2 (v24.6): مفتاحُ الفاعل في عدّادات unknownByActor — فاعلو السقف (super · dept · gm · mgr) يُقرؤون بسقف الإدارة المستهدفة (role:…)، والموظفُ بمفتاحه؛ يُستهلك في Dry-Run لإسقاط ما سيُحسم */
function pv4ActorKey(A, d) { var u = A.u, ceil = u.role === 'super' || u.role === 'dept' || u.role === 'gm' || !!u.mgr || String(u.ekey || '').slice(0, 4) === 'mgr:'; return (ceil ? 'role:' + u.role + (u.ekey ? ':' + u.ekey : '') : (u.ekey || ('u:' + u.id))) + '|' + (d || ''); }
function pv4NoteUnknown(ST, A, d, dims) { if (!dims.length) return; var ak = pv4ActorKey(A, d), UA = ST.unknownByActor[ak] = ST.unknownByActor[ak] || {}, i; for (i = 0; i < dims.length; i++) UA[dims[i]] = (UA[dims[i]] || 0) + 1; }
function permv4Sources(A) {
  var out = { haram: false, nabawi: false }, ds = dsDepts(A), s, i;
  if (A.u.role === 'super') return { haram: true, nabawi: true };
  for (s in out) for (i = 0; i < ds.length && !out[s]; i++) if ((myPermsOf(A, ds[i])['dstats/' + s] || []).length) out[s] = true;
  return out;
}
/* D4‑04 (v24.5): سقفُ نطاق الإدارة الصريح لكل بُعد — لا سجلَّ سقفٍ في D1 اليوم (غيرُ مهاجر) ⇒ null ⇒ unknown:unmigrated-department-ceiling.
   هذه الدالّةُ هي نقطةُ الربط الوحيدة للترحيل اللاحق (ALL · قائمة · deny)؛ لا تقرأ شيئاً من العميل ولا تكتب شيئاً. gm: union سقوف إدارات فرعه · super: سقفُ الإدارة المستهدفة — كلاهما null حتى الترحيل. */
function permv4DeptCeiling(dim, dept, actor) { return null; }
function permv4Ctx(A, d, k, okMap, ctx) {
  var ac = permv4Actor(A), pv4 = (ctx && ctx.pv4) || {}, staffing = pv4.staffing || null;
  return { dept: d, keyName: k, actor: ac.actor, allowedDepts: ac.allowedDepts, deptInScope: function (x) { return deptInScope(A, x); }, today: dsToday(Date.now()), now: Date.now(),
           retroWin: (ctx && ctx.retroWin) || {}, locks: { staffing: pv4.staffingLocks, tasks: pv4.tasksLocks },
           actorShift: function (mk) { var m = staffing && isObj(staffing) ? staffing[mk] : null; var r = m && isObj(m) ? m[A.u.ekey] : null; return (r && isObj(r) && r.shift) ? String(r.shift) : null; },
           held: okMap || {}, fieldOnly: !!d && enfFieldOnly(A, d), sources: permv4Sources(A), scopeValues: null, deptCeiling: permv4DeptCeiling };
}
function pv4Bump(o, r) { o.calls++; if (r === 'allow') o.allow++; else if (r === 'deny') o.deny++; else if (r === 'unknown') o.unknown++; else o.notApplicable++; }
function permv4Write(A, k, rn, P, a, b, res, real, okMap, asisOk, cat, cx, ctx, v, v2ok) {
  var ST = PERMV4.write; if (!real.length) return;
  var d = P.dept || '', cx4 = permv4Ctx(A, d, k, okMap, ctx), W = KIVO_SCOPE.evaluateWrite(real, cx4.actor, rn, a, b, cx4), i, key, dm, r;
  pv4Bump(ST, W.composite);
  var BR = ST.byResource[rn] = ST.byResource[rn] || pv4Cnt(); pv4Bump(BR, W.composite);
  for (key in W.perKey) { r = W.perKey[key]; var BP = ST.byPermission[key] = ST.byPermission[key] || pv4Cnt(); pv4Bump(BP, r.composite);
    for (dm in r.results) { var BD = ST.byDimension[dm] = ST.byDimension[dm] || pv4Cnt(); pv4Bump(BD, r.results[dm].r); } }
  for (i = 0; i < W.migrationNeeded.length; i++) ST.migrationNeededByDim[W.migrationNeeded[i]] = (ST.migrationNeededByDim[W.migrationNeeded[i]] || 0) + 1;
  for (i = 0; i < W.missingEvidence.length; i++) ST.missingEvidenceByDim[W.missingEvidence[i]] = (ST.missingEvidenceByDim[W.missingEvidence[i]] || 0) + 1;
  if (W.migrationNeeded.length) ST.migrationNeeded++; if (W.missingEvidence.length) ST.missingEvidence++;
  if (asisOk) pv4NoteUnknown(ST, A, d, W.migrationNeeded);   /* P4.2: ما كان unknown اليوم على كتابةٍ مقبولة قديماً — بحسب الفاعل والبُعد (للإسقاط) */
  ST.transitions += W.transitions.length;
  if (W.items > 1) { ST.bulk.writes++; ST.bulk.items += W.items; ST.bulk.allowed += W.bulk.allowed; ST.bulk.denied += W.bulk.denied; ST.bulk.unknown += W.bulk.unknown; if (W.bulk.denied && (W.bulk.allowed || W.bulk.unknown)) ST.bulk.mixed++; }
  /* بوابةُ العدسة (Phase 3) لمفاتيح العدسات في هذه الكتابة */
  var lensKeys = 0, lensOff = '', L, g;
  for (i = 0; i < real.length; i++) { L = KIVO_BUILD.lensOf(real[i]); if (!L) continue; lensKeys++; g = KIVO_BUILD.lensGate(A.perms, A.u, d, L); if (!g.on && !lensOff) lensOff = !g.deptOn ? 'ceiling' : 'assignment'; }
  var permOk = !!v2ok, lensOk = !lensOff, scopeDeny = W.composite === 'deny', scopeUnk = W.composite === 'unknown', kind, whys = [];
  for (key in W.perKey) { r = W.perKey[key]; for (i = 0; i < r.denyDims.length; i++) whys.push(r.denyDims[i] + '=' + r.results[r.denyDims[i]].why); }
  var why = whys.join(' · ');
  /* ترتيبُ الحسم: الصلاحيةُ (Phase 2.1) ← بوابةُ العدسة (Phase 3) ← النطاقُ deny ← النطاقُ unknown ← الاتفاق — كلُّ جزءٍ معروفٍ يُحسم قبل المجهول */
  if (!permOk || !lensOk) {
    if (!asisOk) kind = 'agree';
    else if (!permOk) kind = (cat && cat.indexOf('design:') === 0) ? 'expected:phase2.1 ' + cat : 'unexpected:permission ' + (cat || '');
    else kind = 'expected:lens-disabled (' + lensOff + ')';
  } else if (scopeDeny) {
    if (!asisOk) kind = 'agree';
    else if (/closed-period|retro-window-expired/.test(why)) kind = A.u.role === 'super' ? 'expected:D4-03 super∧closed-period (no retro window)' : 'expected:D3-07 closed-period';
    else if (/dslock/.test(why)) kind = A.u.role === 'super' ? 'expected:D4-02 super∧dslock (shadow deny until reopen)' : 'unexpected:scope ' + why;
    else if (/locked-period/.test(why)) kind = 'expected:locked-period (ui-only lock · I-02/I-03)';
    else kind = 'unexpected:scope ' + why;
  } else if (scopeUnk) kind = 'unknown/migration-needed';
  else kind = asisOk ? 'agree' : 'unexpected:asis-deny/shadow-allow (' + (v.why || '') + ')';
  if (kind.indexOf('expected:D4-0') === 0) { var dcid = kind.slice(9, 14); ST.decisions[dcid] = (ST.decisions[dcid] || 0) + 1; }
  ST.byKind[kind] = (ST.byKind[kind] || 0) + 1;
  if (kind === 'agree') ST.agree++; else if (kind.indexOf('expected') === 0) ST.expectedMismatch++; else if (kind.indexOf('unknown') === 0) ST.unknownMigration++; else ST.unexpectedMismatch++;
  var smp = { res: rn, keys: real.slice(0, 6), role: A.u.role, ekey: A.u.ekey, asis: asisOk, asisWhy: v.why || '', perm: permOk, lens: lensOff || 'on', scope: W.composite, denyDims: W.denyDims, unknownDims: W.unknownDims, why: why.slice(0, 300), kind: kind, items: W.items, bulk: W.bulk, transitions: W.transitions.slice(0, 3), migrationNeeded: W.migrationNeeded, missingEvidence: W.missingEvidence };
  if (kind !== 'agree' && ST.samples.length < 80) ST.samples.push(smp);
  if (kind.indexOf('unexpected') === 0 && ST.unexpectedSamples.length < 40) ST.unexpectedSamples.push(smp);
  if (kind.indexOf('unknown') === 0 && ST.unknownSamples.length < 40) ST.unknownSamples.push(smp);
  /* Lens Gate + Scope: القياسُ الكامل (Ceiling ∧ Assignment ∧ Permission ∧ Scope) بأجزائه */
  if (lensKeys) {
    var LF = ST.lensFull; LF.n++;
    if (lensOff === 'ceiling') LF.byPart.ceilingOff++; if (lensOff === 'assignment') LF.byPart.assignmentOff++; if (!permOk) LF.byPart.permissionOff++; if (scopeDeny) LF.byPart.scopeDeny++; if (scopeUnk) LF.byPart.scopeUnknown++;
    if (kind === 'agree') LF.agree++; else if (kind.indexOf('expected') === 0) LF.expected++; else if (kind.indexOf('unknown') === 0) LF.unknown++; else LF.unexpected++;
  }
}
/* رفضُ AS‑IS لسببٍ نطاقيّ (dept · dslock) يسبق تصنيفَ Phase 2.1 (يُحصى invariant هناك) — يُقاس هنا نطاقُه أيضاً لئلا تغيب حالاتُ Department/Branch/DateRange المرفوضة عن القياس */
var PV4_SCOPE_WHY = { dept: 1, dslock: 1 };
function permv4Early(A, k, rn, P, a, b, res, real, v, cx, ctx) {
  var okMap = {}, all = true, i, q, depts = permv2Depts(A, rn, a, b, P.dept), ctxs = [];
  if (A.u.role === 'super') ctxs.push({ 'super': true });
  for (q = 0; q < depts.length; q++) ctxs.push(permv2Ctx(A, depts[q]));
  if (!ctxs.length) ctxs.push({ sheet: {}, translated: KIVO_REGISTRY.translate({}) });
  for (i = 0; i < real.length; i++) { var okK = false; for (q = 0; q < ctxs.length && !okK; q++) if (KIVO_GUARDS.decide(real[i], ctxs[q]).ok) okK = true; okMap[real[i]] = okK; if (!okK) all = false; }
  permv4Write(A, k, rn, P, a, b, res, real, okMap, false, null, cx, ctx, v, all);
}
/* مرجعياتُ النطاق المخزّنة (D1) لكل إدارةٍ تمسّها الحفظة: أقفالُ الجدول/المهام (الحالةُ قبل الحفظ) وجدولُ الورديات — قراءةٌ واحدة لكلٍّ */
async function permv4RefsLoad(env, set, del) {
  var out = {}, k, i, ks = Object.keys(set || {}); for (i = 0; i < (del || []).length; i++) ks.push(String(del[i]));
  for (i = 0; i < ks.length; i++) {
    k = ks[i]; var rn = resName(k), d = parseKey(k).dept; if (!d) continue;
    var o = out[d] = out[d] || {};
    if ((rn === 'bassam_staffing_v3' || rn === 'bassam_staffing_v2') && o.staffingLocks === undefined) o.staffingLocks = parseJson(await opResourceGet(env, 'bsdept:' + d + ':bassam_staffing_locks_v1'), {}) || {};
    if (rn === 'bassam_tasks_v1' && o.tasksLocks === undefined) o.tasksLocks = parseJson(await opResourceGet(env, 'bsdept:' + d + ':bassam_tasks_locks_v1'), {}) || {};
    if ((rn === 'bassam_dreport_v1' || rn === 'bassam_rounds_v1' || rn === 'bassam_irshad_v1' || rn === 'bassam_staffing_v3') && o.staffing === undefined) o.staffing = parseJson(await opResourceGet(env, 'bsdept:' + d + ':bassam_staffing_v3'), null);
  }
  return out;
}
