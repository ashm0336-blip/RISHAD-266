var KIVO_REGISTRY = (function (D) {
  'use strict';
  var byKey = {}, owners = {}, atoms = {}, keys = [], byOwner = {}, flags = {}, i;
  for (i = 0; i < D.registry.length; i++) { var e = D.registry[i]; byKey[e.key] = e; keys.push(e.key); (byOwner[e.owner] = byOwner[e.owner] || []).push(e.key); }
  for (i = 0; i < D.owners.length; i++) owners[D.owners[i].id] = D.owners[i];
  for (i = 0; i < D.atoms.length; i++) atoms[D.atoms[i].leaf + ':' + D.atoms[i].act] = D.atoms[i];
  for (i = 0; i < D.featureFlags.length; i++) flags[D.featureFlags[i]] = true;
  var LEAVES = []; for (i = 0; i < D.atoms.length; i++) if (D.atoms[i].act === 'view') LEAVES.push(D.atoms[i].leaf);
  /* ── التحقق الداخلي: يُجرى عند البناء وعند التشغيل — لا يغيّر سلوكاً ── */
  function validate() {
    var errs = { dupKeys: [], unknownOwner: [], ownerKindMismatch: [], invalidOwnerKind: [], brokenRefs: [], reservedGrantable: [], noGuard: [], badManagedIn: [], unmappedAtoms: [], badAtomTarget: [] };
    var seen = {}, k, e, r, a;
    for (i = 0; i < D.registry.length; i++) {
      e = D.registry[i]; k = e.key;
      if (seen[k]) errs.dupKeys.push(k); seen[k] = 1;
      if (D.ownerKinds.indexOf(e.ownerKind) === -1) errs.invalidOwnerKind.push(k);
      if (!owners[e.owner]) errs.unknownOwner.push(k);
      else if (owners[e.owner].kind !== e.ownerKind) errs.ownerKindMismatch.push(k);
      for (r = 0; r < e.references.length; r++) if (!owners[e.references[r]]) errs.brokenRefs.push(k + '→' + e.references[r]);
      if (e.status === 'reserved' && e.grant !== 'none') errs.reservedGrantable.push(k);
      if (e.status === 'active' && (!e.guard || !e.guard.kind || e.guard.kind === 'none' || !e.guard.detail)) errs.noGuard.push(k);
    }
    for (k in owners) if (owners[k].kind === 'reference') { var m = owners[k].managedIn; if (!m || !owners[m] || owners[m].kind !== 'page') errs.badManagedIn.push(k); }
    for (i = 0; i < LEAVES.length; i++) for (a = 0; a < D.actsAsIs.length; a++) {
      var at = atoms[LEAVES[i] + ':' + D.actsAsIs[a]];
      if (!at) { errs.unmappedAtoms.push(LEAVES[i] + ':' + D.actsAsIs[a]); continue; }
      for (r = 0; r < at.targets.length; r++) if (!byKey[at.targets[r]] && !flags[at.targets[r]]) errs.badAtomTarget.push(LEAVES[i] + ':' + D.actsAsIs[a] + '→' + at.targets[r]);
    }
    var n = 0; for (k in errs) n += errs[k].length;
    var cnt = { registry: D.registry.length, active: 0, reserved: 0, owners: D.owners.length, atoms: D.atoms.length, leaves: LEAVES.length, byKind: {} };
    for (i = 0; i < D.registry.length; i++) { e = D.registry[i]; if (e.status === 'active') { cnt.active++; cnt.byKind[e.ownerKind] = (cnt.byKind[e.ownerKind] || 0) + 1; } else cnt.reserved++; }
    return { ok: n === 0, errors: errs, errorCount: n, counts: cnt, version: D.version, docSha256: D.docSha256 };
  }
  /* ── طبقة التوافق: ذرّة AS-IS (ورقة:فعل) → مفاتيح v24.5 ── */
  function keysForAtom(leaf, act) { var at = atoms[leaf + ':' + act]; if (!at) return null; var out = []; for (var r = 0; r < at.targets.length; r++) if (byKey[at.targets[r]]) out.push(at.targets[r]); return out; }
  function atomsForKey(key) { var e = byKey[key]; return e ? e.asisMap.slice() : []; }
  /* ترجمةُ ورقة الصلاحيات الحالية {ورقة: [أفعال]} إلى مجموعة مفاتيح v24.5 (توسيعٌ محافظ كما في الوثيقة)؛
     الحاويات تُهمَل (ليست ذرّات)، والذرّات الميتة تُسقَط، والتصدير يصير أعلام ميزات. */
  function translate(sheet) {
    var out = { keys: {}, flags: {}, dropped: [], unknown: [] }, leaf, a, acts, at, r;
    if (!sheet) return out;
    for (leaf in sheet) {
      acts = sheet[leaf]; if (!acts || !acts.length) continue;
      for (a = 0; a < acts.length; a++) {
        at = atoms[leaf + ':' + acts[a]];
        if (!at) { if (LEAVES.indexOf(leaf) !== -1) out.unknown.push(leaf + ':' + acts[a]); continue; }
        if (at.disposition === 'obsolete') { out.dropped.push(leaf + ':' + acts[a]); continue; }
        for (r = 0; r < at.targets.length; r++) { if (byKey[at.targets[r]]) out.keys[at.targets[r]] = true; else if (flags[at.targets[r]]) out.flags[at.targets[r]] = true; }
      }
    }
    return out;
  }
  /* ── can(permissionKey, context) — Phase 1: تقييمٌ ظلّي لا يحكم؛ ctx = { sheet, super, mgr, translated? } ── */
  function can(key, ctx) {
    var e = byKey[key]; ctx = ctx || {};
    if (!e) { if (flags[key]) { var TF = ctx.translated || translate(ctx.sheet); return { ok: !!(ctx['super'] || TF.flags[key]), why: 'feature' }; } return { ok: false, why: 'unknown' }; }
    if (e.status !== 'active') return { ok: false, why: 'reserved' };
    if (ctx['super']) return { ok: true, why: 'super' };
    var needMgr = e.asisMap.indexOf('role:mgr') !== -1;
    if (e.grant === 'role') {
      if (e.asisMap.indexOf('role:super') !== -1) return { ok: false, why: 'super-only' };
      return needMgr ? (ctx.mgr ? { ok: true, why: 'mgr' } : { ok: false, why: 'mgr' }) : { ok: false, why: 'role' };
    }
    if (e.grant === 'self') return { ok: true, why: 'self' };
    var T = ctx.translated || translate(ctx.sheet);
    if (needMgr && !ctx.mgr) return { ok: false, why: 'mgr' };
    if (needMgr && ctx.mgr) return { ok: true, why: 'mgr' };
    return T.keys[key] ? { ok: true, why: 'sheet' } : { ok: false, why: 'no-atom' };
  }
  /* هل تملك الذرّةُ (ورقة:فعل) نظيراً ممنوحاً في v24.5 ضمن السياق؟ — لمقارنة قرارات النظام القديم */
  function atomOk(leaf, act, ctx) {
    var at = atoms[leaf + ':' + act], ks = keysForAtom(leaf, act);
    if (ks === null) return { ok: null, why: 'no-atom' };
    if (at.disposition === 'converted_to_feature') { var T2 = (ctx && ctx.translated) || translate(ctx && ctx.sheet); var f, on = !!(ctx && ctx['super']); for (f = 0; f < at.targets.length && !on; f++) if (T2.flags[at.targets[f]]) on = true; return { ok: on, why: 'feature', feature: true, key: at.targets[0] }; }
    if (!ks.length) return { ok: false, why: 'obsolete', obsolete: true };
    /* المفاتيحُ الأولية للورقة: ما تملكه الورقةُ نفسُها (أو يُدار فيها) — لا المفاتيحُ المشتركةُ مع مضيفين آخرين (العدسات)؛
       فإن لم يكن للذرّة مفتاحٌ أوليّ (ورقةٌ استُبدلت بمرجع، مثل daily/kpi*) فالفرقُ فرقُ تصميمٍ معلَن لا اختلاف. */
    var prim = [], r, e;
    for (r = 0; r < ks.length; r++) { e = byKey[ks[r]]; if (e.owner === leaf || e.managedIn === leaf) prim.push(ks[r]); }
    var design = prim.length === 0, cand = design ? ks : prim;
    for (r = 0; r < cand.length; r++) { var v = can(cand[r], ctx); if (v.ok) return { ok: true, why: v.why, key: cand[r], design: design }; }
    return { ok: false, why: 'none', keys: cand, design: design };
  }
  return { version: D.version, docSha256: D.docSha256, status: D.status, phase: D.phase, mode: D.mode, data: D, byKey: byKey, keys: keys, owners: owners, byOwner: byOwner, atoms: atoms, leaves: LEAVES, flags: flags,
           counts: D.counts, validate: validate, keysForAtom: keysForAtom, atomsForKey: atomsForKey, translate: translate, can: can, atomOk: atomOk };
})(KIVO_REGISTRY_DATA);
