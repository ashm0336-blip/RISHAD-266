/* ═══ R193 · Phase 1 — الظلّ: authorize() يُبقي حكم النظام القديم حرفاً بحرف ويقيس معه حكم السجل الحالي v24.9 (v24.2 → v24.3 → v24.4 → v24.5 → v24.5.1 → v24.6 → v24.7 → v24.8 → v24.9؛ المفاتيحُ نفسُها منذ v24.3) ═══
   لكل سؤالٍ (مورد · فعل): الأوراقُ القانونية للمورد (capForAct) → ذرّاتُها (ورقة:فعل) → مفاتيحُ v24.9 → هل يملكها الفاعل
   بترجمة ورقته الحالية (myPermsOf مقصوصةً بسقف الإدارة كما يفعل authorize0)? يُحصى الاتفاقُ والاختلاف في الذاكرة فقط. */
var PERMV2 = { stats: { calls: 0, reads: 0, agree: 0, obsolete: 0, design: 0, disagree: 0, skipped: 0, byWhy: {}, samples: [] }, validation: null };
function permv2Ctx(A, d) {
  var c = A.__pv2 = A.__pv2 || {}; if (c[d]) return c[d];
  var sheet = myPermsOf(A, d), cut = {}, admFree = A.u.role === 'super', leaf;
  for (leaf in sheet) if ((admFree && leaf.indexOf('admin') === 0) || capOnDept(A, d, leaf)) cut[leaf] = sheet[leaf];
  var ctx = { 'super': admFree, mgr: isMgrOf(A, d), sheet: cut };
  ctx.translated = KIVO_REGISTRY.translate(cut);
  return (c[d] = ctx);
}
function permv2Note(A, key, act, v) {
  if (PERMV2.mute) return;
  var R = resOf(key); if (!R || R.scope !== 'dept' || R.rule) { PERMV2.stats.skipped++; return; }
  var P = parseKey(key); if (!P.dept) { PERMV2.stats.skipped++; return; }
  var caps = capForAct(R, act), ctx = permv2Ctx(A, P.dept), newOk = false, why = 'none', hit = '', i;
  var dsg = false;
  for (i = 0; i < caps.length; i++) { var r = KIVO_REGISTRY.atomOk(caps[i], act, ctx); if (r.design) dsg = true; if (r.ok === true) { newOk = true; why = r.why; hit = r.key; break; } if (r.ok === null) why = 'no-atom'; else if (r.why === 'obsolete') why = 'obsolete'; }
  PERMV2.stats.calls++;
  if (why === 'obsolete' && !newOk) { PERMV2.stats.obsolete++; return; }          /* ذرّةٌ ميتة منذ v24.3 (السجلُّ الحالي v24.9) — لا نظير بالتصميم */
  if (newOk === !!v.ok) { PERMV2.stats.agree++; return; }
  if (dsg) { PERMV2.stats.design++; return; }                                     /* ورقةٌ استُبدلت بمرجع — فرقٌ بالتصميم معلَن */
  PERMV2.stats.disagree++;
  var w = (v.ok ? 'old-ok/v2-no:' : 'old-no/v2-ok:') + why;
  PERMV2.stats.byWhy[w] = (PERMV2.stats.byWhy[w] || 0) + 1;
  if (PERMV2.stats.samples.length < 40) PERMV2.stats.samples.push({ res: resName(key), act: act, caps: caps, old: !!v.ok, oldWhy: v.why || v.cap || '', v2: newOk, v2Why: why, key: hit, role: A.u.role });
}
function authorize(A, key, act) {
  var v = authorize0(A, key, act);
  try { if (A && A.u) permv2Note(A, key, act, v); } catch (e) { swallow('permv2-note', e); }
  return v;
}
/* القراءة كذلك تُقاس ظلّياً (الأوراقُ القارئة للمورد readCapsOf × view) — ولا تغيّر الحكم */
function permv2NoteRead(A, k, r) {
  if (PERMV2.mute) return;
  var R = resOf(k); if (!R || R.scope !== 'dept' || R.rule) return;
  var P = parseKey(k); if (!P.dept) return;
  if (A.u.role === 'super') return;                                               /* مدير النظام يقرأ كل شيء في الطرفين */
  var caps = readCapsOf(P.name, R), ctx = permv2Ctx(A, P.dept), newOk = false, why = 'none', i;
  var dsg = false;
  for (i = 0; i < caps.length; i++) { var q = KIVO_REGISTRY.atomOk(caps[i], 'view', ctx); if (q.design) dsg = true; if (q.ok === true) { newOk = true; why = q.why; break; } }
  PERMV2.stats.reads++;
  if (newOk === !!r) return;
  if (dsg) { PERMV2.stats.design++; return; }
  PERMV2.stats.disagree++;
  var w = (r ? 'read-ok/v2-no:' : 'read-no/v2-ok:') + why;
  PERMV2.stats.byWhy[w] = (PERMV2.stats.byWhy[w] || 0) + 1;
  if (PERMV2.stats.samples.length < 40) PERMV2.stats.samples.push({ res: resName(k), act: 'read', caps: caps, old: !!r, v2: newOk, v2Why: why, role: A.u.role });
}
function canRead(A, k) {
  if (A && A.enf) return canReadEnf(A, k);                                    /* KIVO_243: القراءة من سجل v24.9 */
  var r = canRead0(A, k);
  try { if (A && A.u) permv2NoteRead(A, k, r); } catch (e) { swallow('permv2-noteRead', e); }
  return r;
}
/* الكتابة: كل فعلٍ ظهر في التصنيف يجب أن يكون في يد الفاعل — لا «أيُّ فعل يكفي» */
function authorizeActs(A, key, acts) {
  if (!acts.length) return { ok: false, why: 'noop' };
  for (var i = 0; i < acts.length; i++) {
    var v = authorize(A, key, acts[i]);
    if (!v.ok) return { ok: false, why: v.why, act: acts[i] };
  }
  return { ok: true };
}

