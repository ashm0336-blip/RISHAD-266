/* ═══ R194/R195/R196/R197/R198 · Phase 2 → 2.1 → 3 → 4 → 4.1 — Guard Binding (shadow): حكمُ canWrite للنظام القديم كما هو حرفاً بحرف، ويُقاس بجانبه حكمُ السجل الحالي v24.9 المبنيُّ على ربط الحرّاس ═══
   يُستدعى من applySave بعد canWrite (التي لم تُمسّ). لكل كتابةٍ (مورد · قديم → جديد): المصنِّفُ (KIVO_GUARDS.classify) → مفاتيحُ v24.9 المطلوبة → هل يملكها الفاعل بترجمة ورقته
   (permv2Ctx كما في Phase 1، مع decide: مفاتيحُ «role:mgr + ورقة» تشترط الاثنين كما في usersRule/permsRule)?
   يُقارَن بحكم canWrite0 ويُحصى: اتفاق · اختلاف مصنَّف (تصميمٌ معلَن · خطأُ ربط · فارقٌ خشِن) · بقايا · بلا مفتاح. لا يغيّر الحكم. */
PERMV2.bind = { calls: 0, compared: 0, agree: 0, disagree: 0, uncovered: 0, skipped: { size: 0, keydel: 0, shape: 0, invariant: 0, nokey: 0, tech: 0 },
                residual: 0, residualSamples: [], unmapped: {}, byKey: {}, byAny: {}, byCat: {}, samples: [], nokeySamples: [], flags: { rejectNoReason: 0, restoreBatches: 0, anyOfGroups: 0 } };
PERMV2.mute = 0;
var PV2_SIZE = 300000;                                              /* سقفُ حجم القيمتَين معاً للتصنيف الظلّي (≈8ms على أكبر حمولةٍ مسموحة — حمايةُ وقت المعالج في Workers) */
var PV2_PERM_WHY = { act: 1, page: 1, view: 1, 'super': 1, mgr: 1, cap: 1, grant: 1, self: 1 };   /* أسبابُ رفضٍ هي صلاحيةٌ لا ثابتٌ */
function permv2Depts(A, rn, a, b, d) {
  var ds = {}, i, k;
  if (d) ds[d] = 1;
  else if (rn === 'bassam_auth_users_v1') {
    var la = Array.isArray(a) ? a : [], lb = Array.isArray(b) ? b : [], by = {};
    for (i = 0; i < la.length; i++) if (la[i] && la[i].id) by[la[i].id] = la[i];
    for (i = 0; i < lb.length; i++) { var u = lb[i]; if (!u || !u.id) continue; if (!deq(by[u.id], u)) { if (u.deptId) ds[u.deptId] = 1; if (by[u.id] && by[u.id].deptId) ds[by[u.id].deptId] = 1; } delete by[u.id]; }
    for (k in by) if (by[k].deptId) ds[by[k].deptId] = 1;
  } else if (rn === 'bassam_perms_v1') {
    var sect = ['emps', 'tplOf', 'empLens', 'caps', 'subs', 'lenses'];
    for (i = 0; i < sect.length; i++) { var xa = isObj(a) && isObj(a[sect[i]]) ? a[sect[i]] : {}, xb = isObj(b) && isObj(b[sect[i]]) ? b[sect[i]] : {}; for (k in xa) if (!deq(xa[k], xb[k])) ds[k] = 1; for (k in xb) if (!deq(xa[k], xb[k])) ds[k] = 1; }
  } else if (rn === 'bassam_dstats_v1') { var dd = dsDepts(A); for (i = 0; i < dd.length; i++) ds[dd[i]] = 1; }
  var out = []; for (k in ds) out.push(k);
  if (!out.length && A.u.deptId) out.push(A.u.deptId);
  return out;
}
/* إعادةُ اشتقاق فرع canWrite الذي أجاز الكتابة — للقراءة فقط، ولا تُستدعى إلا عند الاختلاف */
function permv2How(A, k, newVal, curVal, ctx) {
  PERMV2.mute++;
  try {
    var R0 = resOf(k), P = parseKey(k);
    if (!R0) return 'unknown';
    if (A.u.role === 'super' && R0.scope === 'global') return 'global-super';
    if (!P.dept) return 'rule:' + (R0.rule || '');
    if (R0.rule) return 'rule:' + R0.rule;
    if (newVal == null) return 'keydel';
    var E9 = entOf(k), O9 = opsOf(k), PA, PB, ha = 0, hb = 0;
    var PV = { a: function () { if (!ha) { ha = 1; PA = curVal == null ? undefined : parseJson(curVal, undefined); } return PA; },
               b: function () { if (!hb) { hb = 1; PB = parseJson(newVal, undefined); } return PB; } };
    if (dreportCleanup(A, k, newVal, curVal, ctx) || custodyCleanup(A, k, newVal, curVal, ctx) || awardCleanup(A, k, newVal, curVal, ctx)) return 'cleanup';
    var cmv = custodyMoveOp(A, k, curVal, newVal, PV); if (cmv === true) return 'custodyMove'; if (cmv === false) return 'custodyMove-deny';
    if (empGoneCleanup(A, k, newVal, curVal, ctx, PV)) return 'empGone';
    if (shiftRenameOk(A, k, newVal, curVal, ctx)) return 'shiftRename';
    if (holdsAllWrites(A, k, R0)) return 'holdsAll';
    var need = classifyMutation(R0, curVal, newVal, E9, O9, PV), acts = Object.keys(need); if (!acts.length) acts = ['edit'];
    if (authorizeActs(A, k, acts).ok) return 'acts:' + acts.join('+');
    if (R0.field === 'daily' && !need.keyDelete && (myPermsOf(A, P.dept)['daily/field'] || []).indexOf('view') !== -1 && capOnDept(A, P.dept, 'daily/field') && fieldObsOnly(A, newVal, curVal)) return 'field';
    var via = R0.via || {}, vp, diffs = null;
    for (vp in via) { if (!actsHeldOn(A, P.dept, vp, acts)) continue; var fn = VIA_FN[via[vp]]; if (!fn) continue; if (!diffs) diffs = walkDiff(curVal, newVal); if (diffs.length && diffs.every(fn)) return 'via:' + vp; }
    if (R0.self === 'email' && selfEmailOnly(A, newVal, curVal)) return 'selfEmail';
    if (R0.self === 'task' && selfTaskOnly(A, newVal, curVal)) return 'selfTask';
    return 'none:' + acts.join('+');
  } catch (e) { return 'err'; } finally { PERMV2.mute--; }
}
function permv2BindCat(A, k, newVal, curVal, ctx, v, keys, missing, asisOk) {
  var rn = resName(k), i, e;
  if (asisOk) {
    for (i = 0; i < missing.length; i++) { e = KIVO_REGISTRY.byKey[missing[i]]; if (e && e.grant === 'none') return 'design:reserved-key'; }
    for (i = 0; i < missing.length; i++) { e = KIVO_REGISTRY.byKey[missing[i]]; if (e && !e.asisMap.length) return 'design:new-key (' + missing[i] + ')'; }
    var how = permv2How(A, k, newVal, curVal, ctx);
    if (how === 'field') return 'design:field-scope (D-19)';
    if (how.indexOf('via:') === 0) return 'coarse:via-rule (' + how + ')';
    if (how === 'selfEmail' || how === 'selfTask') return 'design:self-rule (' + how + ')';
    if (how === 'cleanup' || how === 'empGone' || how === 'shiftRename') return 'design:cleanup-path (' + how + ')';
    if (how === 'custodyMove') return 'error:asisMap (D-01)';
    if (missing.indexOf('import.run') !== -1) return 'design:new-check import.run (D-15)';
    if (how === 'global-super' || how.indexOf('rule:') === 0) return 'design:rule-vs-key (' + how + ')';
    return 'coarse:legacy-wider (' + how + ')';
  }
  if (rn === 'bassam_custody_v1') for (i = 0; i < keys.length; i++) if (keys[i] === 'cust.move.return' || keys[i] === 'cust.move.damage' || keys[i] === 'cust.move.lost') return 'error:asisMap (D-01)';
  return 'coarse:translation-wider (' + (v.why || '') + ')';
}
function permv2Bind(A, k, newVal, curVal, ctx, v) {
  var ST = PERMV2.bind; ST.calls++; PERMV4.write.seen++;
  var rn = resName(k);
  if (KIVO_GUARDS.covers.indexOf(rn) === -1) { ST.uncovered++; return; }
  if (newVal == null) { ST.skipped.keydel++; return; }
  if (String(newVal).length + (curVal == null ? 0 : String(curVal).length) > PV2_SIZE) { ST.skipped.size++; return; }
  var P = parseKey(k), E = entOf(k);
  var a = curVal == null ? parseJson((E && E.empty) || 'null', null) : parseJson(curVal, null), b = parseJson(newVal, null);
  if (b === null) { ST.skipped.shape++; return; }
  /* KIVO_264 · KIVO-Tasks (الرقعة 06): التصنيفُ الظلّي يرى ما يراه الإنفاذ — هويةُ الذات على مخزن المهام من المسار الذاتي وحده (059 enfTaskSelfEkey) */
  var cx = { dept: P.dept, actor: { id: A.u.id, ekey: rn === 'bassam_tasks_v1' && !A.__tkSelf ? null : A.u.ekey, role: A.u.role }, imp: !!(ctx && ctx.imp), empsEmpty: !!(ctx && ctx.empsEmpty), emps: (ctx && ctx.emps) || null, restore: !!(ctx && ctx.restore),
             op: (ctx && ctx.op && ctx.op.op) || '' };   /* Phase 3: علامةُ العملية الصريحة (للتصنيف الظلّي فقط) */
  var res = KIVO_GUARDS.classify(rn, a, b, cx); if (!res) { ST.uncovered++; return; }
  if (cx.restore) ST.flags.restoreBatches++;
  var keys = res.keys(), i, q, real = [], key;
  for (i = 0; i < keys.length; i++) { key = keys[i]; if (key.indexOf('__') === 0) { ST.unmapped[key] = (ST.unmapped[key] || 0) + 1; continue; } real.push(key); var s = ST.byKey[key] = ST.byKey[key] || { n: 0, agree: 0, disagree: 0 }; s.n++; }
  for (i = 0; i < res.residual.length; i++) { ST.residual++; if (ST.residualSamples.length < 30) ST.residualSamples.push({ res: rn, path: res.residual[i].path, note: res.residual[i].note }); }
  if (res.flags && res.flags.rejectNoReason) ST.flags.rejectNoReason += res.flags.rejectNoReason;
  var anyG = res.any || []; for (i = 0; i < anyG.length; i++) { ST.flags.anyOfGroups++; var ag = anyG[i].keys.join('|'); ST.byAny[ag] = (ST.byAny[ag] || 0) + 1; }
  if (!real.length && !res.alt.length && !anyG.length) { if (res.tech.length && !res.residual.length) ST.skipped.tech++; else { ST.skipped.nokey++; if (ST.nokeySamples.length < 20) ST.nokeySamples.push({ res: rn, keys: keys, tech: res.tech, asis: !!v.ok, why: v.why || '' }); } return; }
  var asisOk = !!v.ok;
  if (!asisOk && !PV2_PERM_WHY[v.why]) { ST.skipped.invariant++; if (PV4_SCOPE_WHY[v.why]) { try { permv4Early(A, k, rn, P, a, b, res, real, v, cx, ctx); } catch (e4e) { swallow('permv4-early', e4e); } } return; }          /* رفضٌ لثابتٍ (shape · append · ident · dslock …) لا لصلاحية — Phase 4: الرفضُ النطاقي (dept · dslock) يُقاس نطاقُه */
  var depts = permv2Depts(A, rn, a, b, P.dept), ctxs = [];
  if (A.u.role === 'super') ctxs.push({ 'super': true });
  for (q = 0; q < depts.length; q++) ctxs.push(permv2Ctx(A, depts[q]));
  if (!ctxs.length) ctxs.push({ sheet: {}, translated: KIVO_REGISTRY.translate({}) });
  var v2ok = true, missing = [], okMap = {};
  for (i = 0; i < real.length; i++) { var okK = false; for (q = 0; q < ctxs.length && !okK; q++) if (KIVO_GUARDS.decide(real[i], ctxs[q]).ok) okK = true; okMap[real[i]] = okK; if (!okK) { v2ok = false; missing.push(real[i]); } }
  /* مجموعاتُ anyOf (قاعدةٌ خلفية مشتركة): يكفي مفتاحٌ واحدٌ من المجموعة */
  for (i = 0; i < anyG.length; i++) { var okG = false, z; for (z = 0; z < anyG[i].keys.length && !okG; z++) for (q = 0; q < ctxs.length && !okG; q++) if (KIVO_GUARDS.decide(anyG[i].keys[z], ctxs[q]).ok) okG = true; if (!okG) { v2ok = false; missing.push('anyOf(' + anyG[i].keys.join('|') + ')'); } }
  if (!v2ok && res.alt.length) for (i = 0; i < res.alt.length && !v2ok; i++) for (q = 0; q < ctxs.length && !v2ok; q++) if (KIVO_GUARDS.decide(res.alt[i], ctxs[q]).ok) { v2ok = true; missing = []; }
  ST.compared++;
  if (v2ok === asisOk) { ST.agree++; for (i = 0; i < real.length; i++) ST.byKey[real[i]].agree++; try { permv3After(A, rn, P, a, b, res, real, okMap, asisOk, null, cx, ctx, v); } catch (e3a) { swallow('permv3-after', e3a); } try { permv4Write(A, k, rn, P, a, b, res, real, okMap, asisOk, null, cx, ctx, v, v2ok); } catch (e4a) { swallow('permv4-write', e4a); } return; }
  ST.disagree++; for (i = 0; i < real.length; i++) ST.byKey[real[i]].disagree++;
  var cat = permv2BindCat(A, k, newVal, curVal, ctx, v, real, missing, asisOk);
  if (!asisOk && v2ok && anyG.length && rn === 'bassam_dreport_v1') { var qn = false; for (i = 0; i < anyG.length; i++) if (anyG[i].note.indexOf('permission_quota') !== -1) qn = true; if (qn) cat = 'design:rule-quota (F-03) — AS-IS يصنّف سجلَّ m:y-m الجديد add'; }
  ST.byCat[cat] = (ST.byCat[cat] || 0) + 1;
  if (ST.samples.length < 60) ST.samples.push({ res: rn, keys: real, alt: res.alt, missing: missing, asis: asisOk, why: v.why || '', cat: cat, role: A.u.role, paths: res.ops.slice(0, 6).map(function (o) { return o.path; }) });
  try { permv3After(A, rn, P, a, b, res, real, okMap, asisOk, cat, cx, ctx, v); } catch (e3b) { swallow('permv3-after', e3b); }
  try { permv4Write(A, k, rn, P, a, b, res, real, okMap, asisOk, cat, cx, ctx, v, v2ok); } catch (e4b) { swallow('permv4-write', e4b); }
}
