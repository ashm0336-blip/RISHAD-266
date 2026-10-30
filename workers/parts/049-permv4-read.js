/* ═══ D4‑01 (v24.5) — ظلُّ نطاق القراءة: يُستدعى بعد حكم canRead (canRead0 لم تُمسّ) في مسارَي القراءة الفعليين (حقنُ __BS_BOOT · /api/get).
   لا يغيّر الحكمَ ولا البياناتِ المرتجعة: لا filtering · لا إخفاء rows · لا deny فعلي — قياسٌ ومقارنةٌ وtelemetry (PERMV4.read) فقط.
   مفاتيحُ القراءة = جدولُ الربط الصريح (KIVO_SCOPE.readBindings[res] · P4.1.1‑01 — مولَّدٌ من مسارات AS‑IS: RD_REG · RD_ANY · DS_READ · rule · السجلاتُ العامة × ذرّات cap:view) لا guard.kind=read وحده؛
   المختارُ للتقييم = المحمولُ منها (KIVO_REGISTRY.can بسياق الفاعل · selectionMode = held)؛ وإن لم يحمل شيئاً: قراءةٌ مرفوضةٌ قديماً ⇒ مسبارُ المسارات المعلَن (route-probe:asis-deny — كلُّ مفاتيح المورد المربوطة) · مقبولةٌ قديماً ⇒ فجوةُ ربطٍ unexpected (يجب 0).
   القراءةُ Resource-level والبياناتُ سجلاتٌ متعددة ⇒ النطاقُ يُقاس على كل سجلٍّ (rows) — إذنُ المورد ليس إذناً لكل rows. غيرُ المهاجر unknown. ميزانيةُ العناصر لكل طلب تحمي زمنَ الخادم (skippedBudget معلَن). */
/* سقفُ السجلات لكل قراءة وميزانيةُ الطلب (boot · /api/get): قِيس أثرُهما على بياناتٍ كبيرة (3 إدارات × مئات السجلات) ≈ +20 مللي ثانية للصفحة — المتجاوَز يُحصى truncated/skippedBudget ولا يُخفى.
   P4.1.1‑04 (v24.5.1): هاتان ميزانيتا Shadow Telemetry فقط. عند Read Enforcement مستقبلاً لا يجوز تخطّي rows بسبب الميزانية ولا الاعتمادُ على truncated/skippedBudget في أي قرارٍ أمني؛
   كلُّ record يُقيَّم أو يُرفض الطلبُ بأمان (fail-closed). لا Enforcement الآن. */
var PV4_READ_MAX = 200, PV4_READ_BUDGET = 1000, PV4_READ_KEYS = null, PV4_READ_CHECK = null;
/* P4.1.1‑01 (v24.5.1): مفاتيحُ القراءة لكل مورد من جدول الربط الصريح (KIVO_SCOPE.readBindings — مولَّدٌ من مسارات AS‑IS: RD_REG · RD_ANY · DS_READ · rule · السجلاتُ العامة × ذرّات cap:view
   ومثبَّتٌ في الوثيقة v24.5.1) — لا من guard.kind = read وحده (كان يُسقط field.view: مفتاحَ قراءةٍ فعلياً لـbassam_rounds_v1 بحارس rule). */
function permv4ReadKeys(rn) {
  if (!PV4_READ_KEYS) PV4_READ_KEYS = {};
  if (!PV4_READ_KEYS[rn]) PV4_READ_KEYS[rn] = KIVO_SCOPE.readKeysFor(rn);
  return PV4_READ_KEYS[rn];
}
/* الفحصُ الحيّ: اشتقاقُ مسارات القراءة من RD_REG/RES_REG/DS_READ الحيّة × الذرّات (الخوارزميةُ نفسُها التي ولّدت الجدول) ومقارنتُها بالجدول الصريح — missing/extra يجب 0.
   يُحسب مرّةً عند أول طلب /api/permv2 ولا يدخل في أي حكم. */
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
      if (name === K_DSTATS) { for (i = 0; i < DS_READ.length; i++) { var atD = R.atoms['dstats/' + DS_READ[i] + ':view']; for (j = 0; atD && j < atD.targets.length; j++) if (R.byKey[atD.targets[j]] && R.byKey[atD.targets[j]].status === 'active') expect.push(atD.targets[j]); } }
    } else if (Rr.rule) { expect = (SP.rule[name] && SP.rule[name].keys) || []; }
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
function pv4ReadBudget() { return { items: 0, reads: 0 }; }
function permv4Read(A, k, value, oldOk, where, budget, refs) {
  var ST = PERMV4.read; ST.seen++;
  if (!A || !A.u || isDeviceKey(k)) return;
  if (budget && budget.items >= PV4_READ_BUDGET) { ST.skippedBudget++; return; }
  var P = parseKey(k), rn = resName(k), d = P.dept || '', RK = permv4ReadKeys(rn), keys = RK.keys, i, key, dm, r;
  var v = value == null ? null : (typeof value === 'string' ? parseJson(value, null) : value);
  var cx = d ? permv2Ctx(A, d) : { 'super': A.u.role === 'super', mgr: false, sheet: {}, translated: KIVO_REGISTRY.translate({}) };
  /* P4.1.1‑01: موردٌ منصّي بمفاتيح قراءة (الإحصائيات): الحملُ يُفحص على إدارات الفاعل نفسِها كما يفعل AS‑IS (dsHeld ⇐ dsDepts) — لا على ورقةٍ فارغة (كان ذلك يُسقط الحامل إلى fallback) */
  var cxs = [cx]; if (!d && keys.length && A.u.role !== 'super') { var dd0 = dsDepts(A), ci; cxs = []; for (ci = 0; ci < dd0.length; ci++) cxs.push(permv2Ctx(A, dd0[ci])); if (!cxs.length) cxs = [cx]; }
  var okMap = {}, held = [];
  for (i = 0; i < keys.length; i++) { var hk = false, cj; for (cj = 0; cj < cxs.length && !hk; cj++) if (KIVO_REGISTRY.can(keys[i], cxs[cj]).ok) hk = true; okMap[keys[i]] = hk; if (hk) held.push(keys[i]); }
  /* P4.1.1‑01: المختارُ للتقييم = المحمولُ من مفاتيح المورد المربوطة صراحةً (selectedReadKeys)؛ بلا مفتاحٍ محمول: قراءةٌ مرفوضةٌ قديماً ⇒ مسبارُ المسارات المعلَن (route-probe) · مقبولةٌ قديماً ⇒ فجوةُ ربطٍ (يجب 0) */
  var selMode = !keys.length ? 'no-read-key' : (held.length ? 'held' : (oldOk ? 'gap:allowed-without-selected-key' : 'route-probe:asis-deny'));
  var useKeys = held.length ? held : keys, srcs = [];
  for (i = 0; i < useKeys.length; i++) srcs.push(RK.sources[useKeys[i]] || 'unbound');
  var pv4 = (refs && d) ? { staffing: parseJson(refs['bsdept:' + d + ':bassam_staffing_v3'], null) } : {};
  var cx4 = permv4Ctx(A, d, k, okMap, { pv4: pv4 }); cx4.read = true; cx4.readMaxItems = PV4_READ_MAX;
  var R = KIVO_SCOPE.evaluateRead(useKeys, cx4.actor, rn, v, cx4);
  if (budget) { budget.items += R.items; budget.reads++; }
  pv4Bump(ST, R.composite);
  var BW = ST.byWhere[where] = ST.byWhere[where] || pv4Cnt(); pv4Bump(BW, R.composite);
  var BR = ST.byResource[rn] = ST.byResource[rn] || pv4Cnt(); pv4Bump(BR, R.composite);
  for (key in R.perKey) { r = R.perKey[key]; var BP = ST.byPermission[key] = ST.byPermission[key] || pv4Cnt(); pv4Bump(BP, r.composite);
    for (dm in r.results) { var BD = ST.byDimension[dm] = ST.byDimension[dm] || pv4Cnt(); pv4Bump(BD, r.results[dm].r); } }
  ST.rows.items += R.rows.items; ST.rows.allowed += R.rows.allowed; ST.rows.denied += R.rows.denied; ST.rows.unknown += R.rows.unknown; ST.rows.notApplicable += R.rows.notApplicable;
  if (R.truncated) { ST.truncatedReads++; ST.truncatedItems += R.truncated; }
  if (!keys.length) ST.noReadKey++; if (held.length) ST.heldKeyReads++; else if (keys.length) ST.nonHolderReads++;
  if (!oldOk) ST.asisDeny++;
  ST.bySelectionMode[selMode] = (ST.bySelectionMode[selMode] || 0) + 1; if (selMode.indexOf('gap') === 0) ST.allowedWithoutSelectedKey++;
  for (i = 0; i < useKeys.length; i++) { ST.bySelectedKey[useKeys[i]] = (ST.bySelectedKey[useKeys[i]] || 0) + 1; var sk = srcs[i].split(':')[0]; ST.byBindingSource[sk] = (ST.byBindingSource[sk] || 0) + 1; }
  if (held.indexOf('field.view') !== -1) ST.fieldViewReads++;
  if (!keys.length) { var nrk = RK.cls || 'unknown'; ST.byNoReadKeyClass[nrk] = (ST.byNoReadKeyClass[nrk] || 0) + 1; }
  for (i = 0; i < R.migrationNeeded.length; i++) ST.migrationNeededByDim[R.migrationNeeded[i]] = (ST.migrationNeededByDim[R.migrationNeeded[i]] || 0) + 1;
  for (i = 0; i < R.missingEvidence.length; i++) ST.missingEvidenceByDim[R.missingEvidence[i]] = (ST.missingEvidenceByDim[R.missingEvidence[i]] || 0) + 1;
  if (R.migrationNeeded.length) ST.migrationNeeded++; if (R.missingEvidence.length) ST.missingEvidence++;
  if (oldOk) pv4NoteUnknown(ST, A, d, R.migrationNeeded);   /* P4.2: unknown اليوم على قراءةٍ مقبولة قديماً — بحسب الفاعل والبُعد */
  if (selMode !== 'held' && keys.indexOf('field.view') !== -1) ST.fieldViewProbeReads++;   /* P4.2‑07: field.view داخل قائمة التقييم بلا حملٍ (route-probe) — bySelectedKey[field.view] = fieldViewReads + fieldViewProbeReads */
  /* التصنيفُ الرباعي للقراءة: الحكمُ القديم (الصلاحية + الإدارة) أولاً؛ ثم النطاقُ على السجلات */
  var kind, deptDeny = false, j;
  for (j = 0; j < R.denyDims.length; j++) if (R.denyDims[j] === 'Department' || R.denyDims[j] === 'Branch') deptDeny = true;
  if (!keys.length) kind = RK.known ? 'agree:no-read-key (I-06)' : 'unexpected:read-binding-unknown-resource';
  else if (selMode.indexOf('gap') === 0) kind = 'unexpected:read-binding-gap (allowed without selected key)';
  else if (!oldOk) kind = 'agree:asis-deny';
  else if (R.composite === 'allow' || R.composite === 'not_applicable') kind = 'agree';
  else if (R.composite === 'deny') kind = deptDeny ? 'unexpected:read-scope ' + R.denyDims.join('/') : 'expected:D4-01 row-scope (' + R.denyDims.join('/') + ')';
  else kind = 'unknown/migration-needed';
  ST.byKind[kind] = (ST.byKind[kind] || 0) + 1;
  if (kind.indexOf('agree') === 0) ST.agree++; else if (kind.indexOf('expected') === 0) ST.expectedMismatch++; else if (kind.indexOf('unknown') === 0) ST.unknownMigration++; else ST.unexpectedMismatch++;
  var smp = { where: where, res: rn, key: k.length > 90 ? k.slice(0, 90) : k, role: A.u.role, ekey: A.u.ekey, asis: !!oldOk, keys: useKeys.slice(0, 8), selectedReadKeys: useKeys.slice(0, 8), readBindingSource: srcs.slice(0, 8), selectionMode: selMode, held: held.length, scope: R.composite, rows: R.rows, denyDims: R.denyDims, unknownDims: R.unknownDims, migrationNeeded: R.migrationNeeded, missingEvidence: R.missingEvidence, truncated: R.truncated, kind: kind };
  if (kind.indexOf('agree') !== 0 && ST.samples.length < 60) ST.samples.push(smp);
  if (kind.indexOf('unexpected') === 0 && ST.unexpectedSamples.length < 40) ST.unexpectedSamples.push(smp);
  if (kind.indexOf('unknown') === 0 && ST.unknownSamples.length < 40) ST.unknownSamples.push(smp);
}
/* نطاق القراءة: ما يُحقن في الصفحة وما يُسحب لاحقاً */
