
/* ═══ R193 · Phase 1 — طبقةُ التوافق الظلّية BassamPermV2: لا تحكم؛ تُترجم وتقارن وتُحصي ═══
   القرارُ النافذ للنظام القديم (BassamPerm.can على PAGE_REG) حرفاً بحرف؛ هذه الطبقة تغلّفه بعدّادٍ لا يغيّر الناتج. */
(function(){
  var R = KIVO_REGISTRY, PM = KIVO.BassamPerm, AU = KIVO.BassamAuth;
  KIVO.KIVO_REGISTRY = R;
  if (!R || !PM) return;
  var S = { calls: 0, agree: 0, feature: 0, obsolete: 0, design: 0, disagree: 0, byAtom: {}, samples: [], validation: null, enabled: true };
  try { S.validation = R.validate(); if (!S.validation.ok) { try { console.warn('KIVO registry v24.9: validation errors', S.validation.errors); } catch (e0) {} } } catch (e) { S.validation = { ok: false, err: String(e && e.message || e) }; }
  var cMp = null, cCtx = null;
  function ctxNow(){
    var mp = PM.myPerms();
    if (mp === cMp && cCtx) return cCtx;
    var u = null; try { u = AU && AU.user ? AU.user() : null; } catch (e) {}
    var sup = !!(u && u.role === 'super');
    var mgr = !!(u && (u.role === 'gm' || u.role === 'dept' || (u.role === 'staff' && (u.mgr || String(u.ekey || '').slice(0, 4) === 'mgr:'))));
    cMp = mp; cCtx = { 'super': sup, mgr: mgr, sheet: mp, translated: R.translate(mp) };
    return cCtx;
  }
  var last = {};
  function note(leaf, act, oldOk){
    if (!S.enabled) return;
    var now = Date.now(), id = leaf + ':' + (act || 'view');
    var l = last[id]; if (l && now - l < 400) return; last[id] = now;
    var ctx = ctxNow(), res;
    if (PM.isContainer && PM.isContainer(leaf)) {
      /* الحاوية في النظام القديم = اتحادُ أوراقها (subs · tabs) وصفحاتِها الساكنة تحتها (under) */
      var ls = PM.leafKeysOf(leaf), any = false, why = 'none', i, nObs = 0, feat = false, dsg = false;
      PM.PAGE_REG.forEach(function(pp){ if (pp.under === leaf) ls.push(pp.key); });
      for (i = 0; i < ls.length; i++) { var r0 = R.atomOk(ls[i], act || 'view', ctx); if (r0.ok === true) { any = true; why = r0.why; feat = !!r0.feature; dsg = !!r0.design; break; } if (r0.why === 'obsolete') nObs++; if (r0.feature) feat = true; if (r0.design) dsg = true; }
      res = { ok: any, why: (!any && nObs === ls.length) ? 'obsolete' : why, feature: feat, design: dsg };
    } else res = R.atomOk(leaf, act || 'view', ctx);
    if (res.ok === null) return;                          /* ليست ورقةً في السجل (مثل kpis) */
    S.calls++;
    if (res.why === 'obsolete') { S.obsolete++; S.byAtom[id] = 'obsolete'; return; }   /* ذرّةٌ ميتة منذ v24.3 (السجلُّ الحالي v24.9) — لا نظير بالتصميم */
    if (res.feature) S.feature++;
    if (res.ok === !!oldOk) S.agree++;
    else if (res.design) { S.design++; S.byAtom[id] = 'design'; }                   /* ورقةٌ استُبدلت بمرجع منذ v24.3 (daily/kpi* — السجلُّ الحالي v24.9) — فرقٌ بالتصميم معلَن */
    else { S.disagree++; S.byAtom[id] = (S.byAtom[id] || 0) + 1; if (S.samples.length < 40) S.samples.push({ atom: id, old: !!oldOk, v2: res.ok, why: res.why }); }
  }
  var can0 = PM.can, canSub0 = PM.canSub;
  PM.can = function(p, a){ var r = can0(p, a); try { note(p, a, r); } catch (e) {} return r; };
  PM.canSub = function(pk, sk, a){ var r = canSub0(pk, sk, a); try { note(pk + '/' + sk, a, r); } catch (e) {} return r; };
  KIVO.BassamPermV2 = {
    version: R.version, docSha256: R.docSha256, phase: 1, mode: 'shadow', registry: R,
    can: function(key, ctx){ return R.can(key, ctx || ctxNow()); },
    translateCurrent: function(){ return ctxNow().translated; },
    compare: function(leaf, act){ return { old: can0(leaf, act), v2: R.atomOk(leaf, act || 'view', ctxNow()) }; },
    report: function(){ return { version: R.version, docSha256: R.docSha256, phase: 1, mode: 'shadow', counts: R.counts, validation: S.validation, stats: { calls: S.calls, agree: S.agree, feature: S.feature, obsolete: S.obsolete, design: S.design, disagree: S.disagree, byAtom: S.byAtom, samples: S.samples } }; },
    enable: function(on){ S.enabled = on !== false; },
    _orig: { can: can0, canSub: canSub0 }
  };
})();
