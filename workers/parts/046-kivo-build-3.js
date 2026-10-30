/* ═══ R196 · Phase 3 — Build Missing Guards (shadow): PERMV3 — أحكامُ TO-BE للـ10 to-build تُحسب وتُقارَن بحكم canWrite ولا تغيّره ═══
   A) import.run: من علامةٍ صريحة في الطلب (ops) — لا استدلالَ بالشكل؛ TO-BE = import.run ∧ حرّاسُ المورد الحالية.
   B) backup.restore: علامةٌ صريحة + سياسةُ super OR (role:mgr AND backup.restore) تُحسب للحفظة (wouldAllow/wouldDeny + السبب + missingReason).
   C) lens.*.enable (6): حارسٌ مركزيّ ظلّي = سقفُ العدسة للإدارة ∧ عدساتُ الموظف ∧ مفتاحُ العملية — مصفوفةٌ لكل عدسة.
   D/E) ir.rec.retro.open · sz.rec.retro.open: قاعدةُ الفترة المغلقة + نوافذُ الاستدراك (حالةٌ خادمية) — wouldBlock · wouldAllowRetro · retroWindowExpired · missingRetroPermission.
   التصنيفُ الثلاثي لكل قياس: agree (الظلُّ = AS‑IS) · expected (اختلافٌ معلَنٌ بالتصميم) · unexpected (يجب أن يبقى 0). */
function pv3Lens() { return { n: 0, cells: {}, agree: 0, expected: 0, unexpected: 0, byExpected: {}, samples: [] }; }
function pv3Retro() { return { writes: 0, openPeriod: 0, closedPeriod: 0, wouldBlock: 0, wouldAllowRetro: 0, retroWindowExpired: 0, otherScope: 0, missingRetroPermission: 0, opens: 0, closes: 0, missingReason: 0, openDecisions: { agree: 0, disagree: 0 }, agree: 0, expected: 0, unexpected: 0, samples: [] }; }
var PERMV3 = {
  phase: 3, mode: 'shadow',
  markers: { batches: 0, withOps: 0, accepted: 0, dropped: 0, byOp: {} },
  importRun: { batches: 0, byMode: {}, keys: 0, wouldAllow: 0, wouldDeny: 0, byWhy: {}, heuristicWithoutMarker: 0, markerOutsideImportSet: 0, agree: 0, expected: 0, unexpected: 0, samples: [] },
  restore: { batches: 0, byScope: {}, byWhy: {}, wouldAllow: 0, wouldDeny: 0, missingReason: 0, markerWithoutAud: 0, audWithoutMarker: 0, both: 0, keys: 0, agree: 0, expected: 0, unexpected: 0, samples: [] },
  lens: { zones: pv3Lens(), paths: pv3Lens(), gates: pv3Lens(), marks: pv3Lens(), dist: pv3Lens(), dens: pv3Lens() },
  retro: { irshad: pv3Retro(), seized: pv3Retro() }
};
var RETRO = { irshad: { cap: 'irshad/records', key: 'ir.rec.retro.open', res: 'bassam_irshad_v1', state: 'bassam_irshad_retro_v1', name: 'الاسترشاد' },
              seized: { cap: 'seized/records', key: 'sz.rec.retro.open', res: 'bassam_seized_v1', state: 'bassam_seized_retro_v1', name: 'المضبوطات' } };
var RETRO_SYS_OF = { 'bassam_irshad_v1': 'irshad', 'bassam_seized_v1': 'seized' };
function retroKey(d, sys) { return 'bsdept:' + d + ':' + RETRO[sys].state; }
async function retroState(env, d, sys) {
  if (sys === 'irshad') { await irGuardRetired(env); return (await irRetroSnapshot(env, d)).state; }
  if(sys==='seized'){await szGuardRetired(env);return (await szRetroSnapshot(env,d)).state;}
  throw rsError('retro-resource');
}
/* من يفتح نافذةَ استدراك: مدير النظام، أو حاملُ approve على ورقة السجلات في الإدارة — ذرّةُ G‑08 نفسُها التي تفتح الشهرَ واجهياً اليوم (وهي ترجمةُ ir/sz.rec.retro.open) */
function retroMay(A, d, sys) { if (A && A.enf) return enfRetroMay(A, d, sys); if (A.u.role === 'super') return true; return !!d && deptInScope(A, d) && actsHeldOn(A, d, RETRO[sys].cap, ['approve']); }
function retroScopeKey(sc) { return sc.y + '-' + sc.m + (sc.d == null ? '' : '-' + sc.d); }
/* سياقُ الاستدراك للحفظة: نوافذُ كلِّ (إدارة · نظام) تمسّه الكتابةُ — قراءةٌ واحدة لكلٍّ */
async function permv3RetroLoad(env, set, del) {
  var out = {}, k, i, ks = Object.keys(set || {}); for (i = 0; i < (del || []).length; i++) ks.push(String(del[i]));
  for (i = 0; i < ks.length; i++) { k = ks[i]; var sys = RETRO_SYS_OF[resName(k)]; if (!sys) continue; var d = parseKey(k).dept; if (!d) continue; var id = d + '|' + sys; if (out[id]) continue; out[id] = (await retroState(env, d, sys)).windows; }
  return out;
}
/* الآلياتُ على مستوى الكتابة الواحدة — تُستدعى من permv2Bind بعد الحكم والتصنيف */
function permv3After(A, rn, P, a, b, res, real, okMap, asisOk, cat, cx, ctx, v) {
  var i, L, key, d = P.dept || A.u.deptId || '';
  /* C) Lens Enable Gates */
  for (i = 0; i < real.length; i++) {
    key = real[i]; L = KIVO_BUILD.lensOf(key); if (!L) continue;
    var S = PERMV3.lens[L], g = KIVO_BUILD.lensGate(A.perms, A.u, d, L), opOk = !!okMap[key], shadow = g.on && opOk;
    var cell = g.cell + (opOk ? 'P1' : 'P0'), C9 = S.cells[cell] = S.cells[cell] || { n: 0, asisOk: 0, asisDeny: 0, shadowAllow: 0, shadowDeny: 0, agree: 0, expected: 0, unexpected: 0 };
    S.n++; C9.n++; if (asisOk) C9.asisOk++; else C9.asisDeny++; if (shadow) C9.shadowAllow++; else C9.shadowDeny++;
    var kind;
    if (shadow === asisOk) kind = 'agree';
    else if (asisOk && !g.on) kind = 'expected:lens-disabled (' + (!g.deptOn ? 'dept' : 'emp') + ')';
    else if (asisOk && g.on && !opOk && cat && cat.indexOf('design:') === 0) kind = 'expected:phase2.1 ' + cat;
    else kind = 'unexpected';
    if (kind === 'agree') { S.agree++; C9.agree++; } else if (kind.indexOf('expected:') === 0) { S.expected++; C9.expected++; S.byExpected[kind] = (S.byExpected[kind] || 0) + 1; } else { S.unexpected++; C9.unexpected++; }
    if (S.samples.length < 24 && kind !== 'agree') S.samples.push({ key: key, res: rn, role: A.u.role, ekey: A.u.ekey, cell: cell, deptOn: g.deptOn, empOn: g.empOn, empSrc: g.empSrc, opPerm: opOk, asis: asisOk, shadow: shadow, kind: kind, cat: cat || '' });
  }
  /* A) import.run — من العلامة فقط؛ الشكلُ الجماعي يُحصى */
  if (res.flags && res.flags.importHeuristic && cx.op !== 'import.run') PERMV3.importRun.heuristicWithoutMarker++;
  if (cx.op === 'import.run') {
    var IR = PERMV3.importRun; IR.keys++;
    if (!KIVO_BUILD.isImportRes(rn)) IR.markerOutsideImportSet++;
    var held = !!okMap['import.run'], toBe = held && asisOk, why = held ? 'held' : 'not-held';
    if (held) IR.wouldAllow++; else IR.wouldDeny++; IR.byWhy[why] = (IR.byWhy[why] || 0) + 1;
    var ik = toBe === asisOk ? 'agree' : (asisOk && !held ? 'expected:import.run-not-held (F-10)' : 'unexpected');
    if (ik === 'agree') IR.agree++; else if (ik.indexOf('expected') === 0) IR.expected++; else IR.unexpected++;
    if (IR.samples.length < 24 && ik !== 'agree') IR.samples.push({ res: rn, role: A.u.role, ekey: A.u.ekey, held: held, asis: asisOk, kind: ik, mode: (ctx && ctx.op && ctx.op.mode) || '' });
  }
  /* B) backup.restore — على مستوى المفتاح يُحصى فقط؛ السياسةُ على مستوى الحفظة في permv3Batch */
  if (cx.restore) PERMV3.restore.keys++;
  /* D/E) الاستدراك */
  var sys = RETRO_SYS_OF[rn];
  if (sys && ctx && ctx.retroWin) {
    var RS = PERMV3.retro[sys], T = dsToday(Date.now()), now = Date.now(), dates = KIVO_BUILD.retroDates(a, b), wins = ctx.retroWin[d + '|' + sys] || [], closed = [], allCovered = true, anyExpired = false, anyOther = false, j;
    RS.writes++;
    for (j = 0; j < dates.length; j++) { var dt = dates[j]; if (!KIVO_BUILD.retroClosed(T, dt.y, dt.m, dt.d)) continue; var cv = KIVO_BUILD.retroCover(wins, dt.y, dt.m, dt.d, now); closed.push({ y: dt.y, m: dt.m, d: dt.d, kind: dt.kind, covered: cv.covered, expired: cv.expired, window: cv.window }); if (!cv.covered) { allCovered = false; if (cv.expired) anyExpired = true; else if (wins.length) anyOther = true; } }
    if (!closed.length) { RS.openPeriod++; RS.agree++; return; }
    RS.closedPeriod++;
    var shadowR = asisOk && allCovered, rk;
    if (allCovered) RS.wouldAllowRetro++; else if (anyExpired) RS.retroWindowExpired++; else { RS.wouldBlock++; if (anyOther) RS.otherScope++; }
    rk = shadowR === asisOk ? 'agree' : (asisOk && !allCovered ? 'expected:closed-period (G-08 ' + (anyExpired ? 'retroWindowExpired' : 'wouldBlock') + ')' : 'unexpected');
    if (rk === 'agree') RS.agree++; else if (rk.indexOf('expected') === 0) RS.expected++; else RS.unexpected++;
    if (RS.samples.length < 30) RS.samples.push({ res: rn, role: A.u.role, ekey: A.u.ekey, dept: d, today: T, closed: closed.slice(0, 6), windows: wins.length, asis: asisOk, shadow: shadowR, kind: rk });
  }
}
/* الآلياتُ على مستوى الحفظة — بعد تقييم كلِّ المفاتيح (لا كتابة بعدُ) */
function permv3Batch(A, set, del, evald, todo, pv3M, pv3Restore, pv2Restore) {
  var k, i, M = PERMV3.markers; M.batches++;
  if (pv3M.n || pv3M.bad) M.withOps++; M.accepted += pv3M.n; M.dropped += pv3M.bad; for (k in pv3M.byOp) M.byOp[k] = (M.byOp[k] || 0) + pv3M.byOp[k];
  var impMode = null; for (k in pv3M.ops) if (pv3M.ops[k].op === 'import.run') { impMode = pv3M.ops[k].mode || 'add'; break; }
  if (impMode !== null) { PERMV3.importRun.batches++; PERMV3.importRun.byMode[impMode] = (PERMV3.importRun.byMode[impMode] || 0) + 1; }
  if (!pv3Restore && !pv2Restore) return;
  var RS = PERMV3.restore; RS.batches++;
  if (pv3Restore && pv2Restore) RS.both++; else if (pv3Restore) RS.markerWithoutAud++; else RS.audWithoutMarker++;
  var scope = pv3Restore ? (pv3Restore.scope || 'dept') : 'aud-only'; RS.byScope[scope] = (RS.byScope[scope] || 0) + 1;
  var depts = {}, glob = false, ks = Object.keys(set || {}); for (i = 0; i < (del || []).length; i++) ks.push(String(del[i]));
  for (i = 0; i < ks.length; i++) { var dd = parseKey(ks[i]).dept; if (dd) depts[dd] = 1; else glob = true; }
  var isSuper = A.u.role === 'super', isMgr = !glob, hasKey = isSuper, d;
  for (d in depts) { if (!isMgrOf(A, d)) isMgr = false; if (!isSuper && !KIVO_GUARDS.decide('backup.restore', permv2Ctx(A, d)).ok) hasKey = false; }
  if (!Object.keys(depts).length) isMgr = false;
  var pol = KIVO_BUILD.restorePolicy(isSuper, isMgr, hasKey, pv3Restore ? pv3Restore.reason : '');
  if (pol.ok) RS.wouldAllow++; else RS.wouldDeny++; RS.byWhy[pol.finalWhy] = (RS.byWhy[pol.finalWhy] || 0) + 1; if (pol.missingReason) RS.missingReason++;
  var asisBatchOk = true, denied = 0; for (i = 0; i < evald.length; i++) if (evald[i] && evald[i].deny) { asisBatchOk = false; denied++; }
  var kind = pol.final === asisBatchOk ? 'agree' : (asisBatchOk && !pol.final ? 'expected:restore-policy (' + pol.finalWhy + ')' : 'unexpected');
  if (kind === 'agree') RS.agree++; else if (kind.indexOf('expected') === 0) RS.expected++; else RS.unexpected++;
  if (RS.samples.length < 24) RS.samples.push({ scope: scope, mode: pv3Restore ? (pv3Restore.mode || '') : '', role: A.u.role, ekey: A.u.ekey, depts: Object.keys(depts), global: glob, why: pol.why, finalWhy: pol.finalWhy, missingReason: pol.missingReason, asis: asisBatchOk, denied: denied, keys: ks.length, marker: !!pv3Restore, aud: !!pv2Restore, kind: kind });
}
