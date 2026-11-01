/* ══ (3) الكتابة — كلُّ كتابةٍ تُصنَّف إلى مفاتيح v24.9 (المصنِّف المربوط · خريطةُ الموارد غير المصنَّفة · بدائلُ via المعلنة)
   ثم: المفتاحُ محمول (سقف الإدارة ∧ بوابة العدسة ∧ الدور ∧ المنح) ∧ النطاقُ على كل عنصرٍ متأثر ∧ السببُ حيث يوجبه السجل.
   الثوابتُ البنيوية للبيانات (الشكل · الهوية · الإلحاق · العمليات المحمية) تبقى كما هي — ليست صلاحيات. ══ */
/* الموارد التي لا مصنِّفَ لها: فعلُ AS‑IS (classifyMutation) → مفاتيحُ المورد المربوطة صراحةً (anyOf لكل فعل) */
var ENF_UNCOV = (function () {
  function crud(p) { return { add: [p + '.create'], edit: [p + '.edit'], del: [p + '.delete'] }; }
  function join() { var o = { add: [], edit: [], del: [] }, i, a; for (i = 0; i < arguments.length; i++) for (a in o) o[a] = o[a].concat(arguments[i][a] || []); return o; }
  function all(keys) { return { add: keys, edit: keys, del: keys, approve: keys }; }
  return {
    'bassam_options_v1': join(crud('ref.employment_type'), crud('ref.work_type')),
    'bassam_zone_opts_v1': crud('ref.zone.type'), 'bassam_gate_opts_v1': crud('ref.gate.type'), 'bassam_mark_kinds_v1': crud('ref.mark.kind'),
    'bassam_shift_options_v1': crud('ref.shift'),
    'bassam_irshad_langs_v1': crud('ref.irshad.language'), 'bassam_irshad_locs_v1': crud('ref.irshad.location'),
    'bassam_seized_cat_v1': join(crud('ref.seized.category'), crud('ref.seized.item')), 'bassam_seized_acts_v1': crud('ref.seized.action'),
    'bassam_seized_locs_v1': crud('ref.seized.location'), 'bassam_seized_jew_v1': crud('ref.seized.kind'),
    'bassam_leave_kinds_v1': crud('ref.leave_type'), 'bassam_callsigns_v1': crud('ref.callsign'),
    'bassam_award_docs_v1': crud('award.doc'),
    'bassam_perm_limit_v1': all(['staff.permission_limit.set']),
    'bassam_staffing_snap_v1': all(['staff.lock', 'staff.reopen', 'staff.callsign.assign', 'report.callsign.assign']),
    'bassam_dayshift_v1': all(['round.edit', 'report.edit', 'round.create', 'report.create']),
    'bassam_dayfocus_v1': all(['round.edit', 'report.edit', 'round.create', 'report.create']),
    'bassam_dr_grp_v1': all(['report.edit', 'report.create'])
  };
})();
/* السببُ المرافق للكتابة: body.why[k] (طبقةُ المزامنة) أو سببُ علامة العملية (الاستعادة) */
function enfReasonOf(X) { var r = X && (X.why || (X.op && X.op.reason)); r = String(r == null ? '' : r).trim(); return r.length >= 3 ? r.slice(0, 300) : ''; }
/* بدائلُ via المعلنة في السجل (guard.kind = via) + تبعاتُ العمليات المحمية — كلٌّ بمفتاحه في TO-BE لا بورقة AS‑IS */
function enfVia(A, k, rn, d, curVal, newVal, ctx) {
  if (curVal == null || newVal == null) return null;
  var ds = null, i, f, need = {};
  function diffs() { if (!ds) ds = walkDiff(curVal, newVal); return ds; }
  /* EMP_FIELDS: الجدولُ الشهري يكتب في سجل الموظفين حقلَي نوع العمل/التوظيف (والهوية القانونية eid) وحدها */
  if (rn === 'bassam_employees_v1' && diffs().length && diffs().every(EMP_FIELDS)) {
    for (i = 0; i < ds.length; i++) { f = ds[i].p.split('.').pop(); if (f === 'work') need['staff.work_type.assign'] = 1; else if (f === 'type') need['staff.employment_type.assign'] = 1; }
    var ks = Object.keys(need);
    if (!ks.length) return enfHeld(A, d, 'staff.work_type.assign') || enfHeld(A, d, 'staff.employment_type.assign') ? { keys: [enfHeld(A, d, 'staff.work_type.assign') ? 'staff.work_type.assign' : 'staff.employment_type.assign'], tag: 'via:EMP_FIELDS(eid)' } : null;
    for (i = 0; i < ks.length; i++) if (!enfHeld(A, d, ks[i])) return null;
    return { keys: ks, tag: 'via:EMP_FIELDS' };
  }
  /* CS_ONLY · SNAP_CS_ONLY: التقريرُ اليومي يُسند رمزَ النداء في الجدول (حقل cs وحده) */
  if ((rn === 'bassam_staffing_v3' && diffs().length && diffs().every(CS_ONLY)) || (rn === 'bassam_staffing_snap_v1' && diffs().length && diffs().every(SNAP_CS_ONLY))) {
    if (enfHeld(A, d, 'report.callsign.assign')) return { keys: ['report.callsign.assign'], tag: 'via:CS_ONLY' };
    if (enfHeld(A, d, 'staff.callsign.assign')) return { keys: ['staff.callsign.assign'], tag: 'via:CS_ONLY(staff)' };
    return null;
  }
  /* SEED_ONLY: بذرُ قوالب الصلاحيات الافتراضية لأول مرّة (القائمةُ فارغة) من صفحة التقرير */
  if (rn === 'bassam_perm_tpls_v1' && diffs().length && diffs().every(SEED_ONLY)) {
    var sk = ['tpl.create', 'report.create', 'report.edit'];
    for (i = 0; i < sk.length; i++) if (enfHeld(A, d, sk[i])) return { keys: [sk[i]], tag: 'via:SEED_ONLY' };
    return null;
  }
  /* تبعةُ إعادة تسمية الوردية (عمليةٌ محمية): حقلُ shift وحده من الاسم القديم إلى الجديد، ولا يبقى صفٌّ على القديم — بمفتاح ref.shift.edit */
  if ((rn === 'bassam_staffing_v3' || rn === 'bassam_staffing_v2') && ctx && ctx.shRen) {
    var sd = diffs(); if (!sd.length) return null;
    for (i = 0; i < sd.length; i++) { if (!/(^|\.)shift$/.test(sd[i].p) || String(sd[i].f) !== ctx.shRen.o || String(sd[i].t) !== ctx.shRen.n) return null; }
    if (shiftLeft(parseJson(newVal, null), ctx.shRen.o)) return null;
    return enfHeld(A, d, 'ref.shift.edit') ? { keys: ['ref.shift.edit'], tag: 'cascade:shiftRename' } : null;
  }
  return null;
}
/* KIVO_259 · AUD-030 (ADR-018): حقولُ عدسات الإضافات الجديدة (خارج المرجع KIVO_BUILD.LENSES) — الحارسُ المرجعي يصنّف حقلَ عنصرٍ لا يعرفه تعديلاً عامّاً
   لعموده (KIVO_LENS_PLUGINS.edit) وحقلَ طابقٍ لا يعرفه تعديلاً للموقع/الجولة (site.edit · round.edit)؛ فيُحوَّل ذلك إلى مفتاح الإضافة التي تعلن الحقل.
   العدساتُ المضمَّنة في المرجع مستثناةٌ من الجدول أصلاً — تصنيفُها كما هو حرفاً (tools/plugins.py ④ · plugins.test.mjs). */
var ENF_PLUG_OPS = null;
function enfPlugOps(res) {
  if (!res) return res;
  if (!ENF_PLUG_OPS) {
    var T = { el: {}, fl: {}, n: 0 }, ref = KIVO_BUILD.LENSES || [];
    KIVO_LENS_PLUGINS.elem.forEach(function (f) { if (ref.indexOf(f.lens) !== -1) return; f.cols.forEach(function (c) { f.fields.forEach(function (x) { T.el[c + '.' + x] = f.op; T.n++; }); }); });
    KIVO_LENS_PLUGINS.floor.forEach(function (f) { if (ref.indexOf(f.lens) !== -1) return; T.fl[f.field] = f.op; T.n++; });
    ENF_PLUG_OPS = T;
  }
  if (!ENF_PLUG_OPS.n) return res;
  for (var i = 0, m, o; i < res.ops.length; i++) {
    o = res.ops[i];
    if ((m = /(?:^|\.)([a-z]+)\[[^\]]*\]\.([A-Za-z0-9_]+)$/.exec(o.path)) && KIVO_LENS_PLUGINS.edit[m[1]] === o.key && ENF_PLUG_OPS.el[m[1] + '.' + m[2]]) o.key = ENF_PLUG_OPS.el[m[1] + '.' + m[2]];
    else if ((o.key === 'site.edit' || o.key === 'round.edit') && (m = /\.([A-Za-z0-9_]+)$/.exec(o.path)) && ENF_PLUG_OPS.fl[m[1]]) o.key = ENF_PLUG_OPS.fl[m[1]];
  }
  return res;
}
/* KIVO_264 · KIVO-Tasks (الرقعة 06): هويةُ الذات التي يراها مصنِّفُ الحرّاس — على مخزن المهام من المسار الذاتي وحده (وفي غيره كما كانت) */
function enfTaskSelfEkey(A, rn) { return rn === 'bassam_tasks_v1' && !A.__tkSelf ? null : A.u.ekey; }
/* القرارُ الكامل لكتابةٍ واحدة على موردٍ إداريّ (أو منصّيّ بسياق) — heldFn(key) يُعطى للموارد المنصّية */
function enfDecide(A, k, rn, d, a, b, curVal, newVal, ctx, X, opts) {
  opts = opts || {};
  var ix = enfIx(), held = opts.held || function (key) { return enfHeld(A, d, key); };
  /* KIVO_264 · KIVO-Tasks (الرقعة 06): «self.task.respond» للمسار الذاتي وحده (POST /api/me/tasks/act — 062c يسِم الفاعلَ في الخادم A.__tkSelf
     ولا يصل إليه مدخلٌ من الطلب). مصنِّفُ المهام في الوحدة المرجعية 006 (classifyTaskRow — لا تُمسّ: 004–016 = v24.9 بايتاً) يعدّ الصفَّ
     «ذاتياً» حين actor.ekey = العمود 14؛ فلا يُعطى هويةَ الذات على مخزن المهام إلا من ذلك المسار — والحفظُ الخامّ /api/save يُصنَّف بمفاتيح
     الفعل نفسِها (task.accept · task.finish · task.evidence …) بلا بديل «الذات» — كان يصنع «منجزة» بأداءٍ وطوابعَ بلا سياسة إثبات ولا مراجِع */
  var cx = { dept: d, actor: { id: A.u.id, ekey: enfTaskSelfEkey(A, rn), role: A.u.role }, imp: !!(X && X.imp), empsEmpty: !!(ctx && ctx.empsEmpty), emps: (ctx && ctx.emps) || null, restore: !!(X && X.restore), op: (X && X.op && X.op.op) || '' };
  var res = KIVO_GUARDS.covers.indexOf(rn) !== -1 ? enfPlugOps(KIVO_GUARDS.classify(rn, a, b, cx)) : null;
  var real = [], anyG = [], alt = [], i, j, key;
  if (res) {
    var raw = res.keys();
    for (i = 0; i < raw.length; i++) { if (raw[i].indexOf('__') === 0) return enfNo('unmapped', { detail: raw[i] }); real.push(raw[i]); }
    if (res.residual.length) return enfNo('residual', { detail: res.residual.slice(0, 4).map(function (x) { return x.path + (x.note ? ' (' + x.note + ')' : ''); }).join(' · ') });
    for (i = 0; i < res.any.length; i++) anyG.push(res.any[i].keys.slice());
    alt = res.alt.slice();
    if (!real.length && !anyG.length && !alt.length) {
      /* لا عمليةَ مصنَّفة: تغييرٌ تقنيّ (cfg · pMig · created · تبنّي eid · ترقيةُ العدسات …) أو حفظٌ بلا تغيير — لمن يكتب هذا المورد */
      if (opts.techOk ? opts.techOk() : enfResWriter(A, d, rn)) return enfOk([], { tech: res.tech.slice(0, 4) });
      return enfNo('perm', { missing: ['write(' + rn + ')'], tech: res.tech.slice(0, 4) });
    }
  } else {
    var UM = ENF_UNCOV[rn]; if (!UM) return enfNo('unbound', { detail: rn });
    var R = resOf(k), E = entOf(k), O = opsOf(k), PV = { a: function () { return a; }, b: function () { return b; } };
    var need = classifyMutation(R, curVal, newVal, E, O, PV), acts = Object.keys(need).filter(function (x) { return x === 'add' || x === 'edit' || x === 'del' || x === 'approve'; });
    if (!acts.length) acts = ['edit'];
    for (i = 0; i < acts.length; i++) { var g = UM[acts[i]] || UM.edit; if (!g || !g.length) return enfNo('unbound', { detail: rn + ':' + acts[i] }); anyG.push(g.slice()); }
  }
  var used = [], missing = [];
  for (i = 0; i < real.length; i++) { if (held(real[i])) used.push(real[i]); else missing.push(real[i]); }
  for (i = 0; i < anyG.length; i++) { var hit = ''; for (j = 0; j < anyG[i].length && !hit; j++) if (held(anyG[i][j])) hit = anyG[i][j]; if (hit) used.push(hit); else missing.push('anyOf(' + anyG[i].join('|') + ')'); }
  var path = 'keys';
  if (missing.length && alt.length) for (i = 0; i < alt.length; i++) if (held(alt[i])) { used = [alt[i]]; missing = []; path = 'self'; break; }
  if (missing.length && !opts.noVia) { var v = enfVia(A, k, rn, d, curVal, newVal, ctx); if (v) { used = v.keys; missing = []; path = v.tag; } }
  used = enfUniq(used);
  if (missing.length) return enfNo('perm', { missing: missing, keys: real });
  /* النطاق — كلُّ عنصرٍ متأثر (deny أو unknown ⇒ رفض) */
  var sc = opts.noScope ? { composite: 'not_applicable', denyDims: [], unknownDims: [], items: 0, why: '' } : enfScopeEval(A, d, k, rn, a, b, used, X);
  if (sc.composite === 'deny') return enfNo('scope', { keys: used, dims: sc.denyDims, detail: sc.why, items: sc.items });
  if (sc.composite === 'unknown') return enfNo('scope-unknown', { keys: used, dims: sc.unknownDims, detail: sc.why, items: sc.items });
  /* السببُ الإلزامي (audit.reason في السجل · §12) */
  var needR = []; for (i = 0; i < used.length; i++) if (ix.reason[used[i]]) needR.push(used[i]);
  if (needR.length && !enfReasonOf(X)) return enfNo('reason', { keys: used, reasonKeys: needR });
  return enfOk(used, { path: path, reasonKeys: needR, reason: needR.length ? enfReasonOf(X) : '', items: sc.items, dims: [] });
}
/* ── الحساباتُ (عامّ): البنيةُ كما usersRule (المدير على موظفيه في نطاقه · الذات على حقولها) والقرارُ بمفاتيح كل إدارةٍ على مستخدميها ── */
function enfUsersWrite(A, k, newVal, curVal, ctx, X) {
  var inc = parseJson(newVal, null), cur = parseJson(curVal, []);
  if (!Array.isArray(inc)) return enfNo('users');
  if (!Array.isArray(cur)) cur = [];
  if (inc.some(function (x) { return !x || !x.id || badAcctId(x.id); })) return enfNo('users');   /* KIVO_261: معرّفٌ خبيثٌ (__proto__…) أو بلا معرّف */
  var byA = nmap(), byB = nmap(), ids = nmap(), kk, sup = A.u.role === 'super', depts = {}, selfOnly = true, mgrEk = null;
  if (!sup) { var dcw9 = usersDupCopyWhy(inc, cur); if (dcw9) return enfNo(dcw9); }   /* مراجعةُ التكامل W1-CRIT (دفاعٌ في العمق · 018): كلُّ نسخةٍ من معرّفٍ مكرَّرٍ مخزَّنةٌ كما هي */
  cur.forEach(function (x) { if (x && x.id) { byA[x.id] = x; ids[x.id] = 1; } });
  inc.forEach(function (x) { byB[x.id] = x; ids[x.id] = 1; });
  for (kk in ids) {
    var a = byA[kk], b = byB[kk];
    if (a && b && eqExcept(a, b, ['ph']) && (!b.ph || b.ph === a.ph)) continue;
    if (kk === A.u.id) { var sw9 = selfAcctWhy(A, a, b, ctx && ctx.selfCur); if (!sw9 && (sup || (userRecOk(b) && phNewOk(a, b)))) continue; return enfNo(sw9 || 'self'); }   /* KIVO_261 · AUD-057 · KIVO_262: بصمةٌ حديثة · KIVO_264 · D14: حقولُ الدور وحدها واسمُ الدخول بـ cur (018) */
    selfOnly = false;
    if (sup) continue;
    var d = (a && a.deptId) || (b && b.deptId) || '';
    if (!isMgrOf(A, d)) return enfNo('mgr');
    if (a && (a.role !== 'staff' || a.mgr || a.deptId !== d)) return enfNo('mgr');
    if (b && (b.role !== 'staff' || b.mgr || b.deptId !== d)) return enfNo('mgr');
    /* «فحص الصلاحيات العميق (2026-10-21)» · D1: مفتاحُ mgr:/gm: لمدير النظام وحده (018 usersRule) — والجولة 2 (M-B · L3): ومفتاحُ حسابِ مديرٍ قائم
       (رقمُ هوية مديرِ عقدةٍ قديم · حاملُ الشارة · المجمَّدُ منها) كذلك؛ والقائمُ بمفتاح مديرٍ يُجمَّد ويُحذف ولا يُفكّ تجميدُه — R3-1 (018 usersEkeyWhy) */
    if (!mgrEk) mgrEk = usersMgrEkSet(cur);
    var ekw9 = usersEkeyWhy(a, b, mgrEk); if (ekw9) return enfNo(ekw9);
    var grw9 = usersGrantWhy(A, a, b, ctx && ctx.gx); if (grw9) return enfNo('grant', { detail: grw9 });   /* الجولة 2 · R3-2: منحٌ صريحٌ باقٍ على المفتاح (018) */
    var shw9 = usersSheetWhy(A, a, b, ctx && ctx.gx, true); if (shw9) return enfNo('grant', { detail: shw9 });   /* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-2: وورقةٌ باقية — مفاتيحُها ثم صفحاتُها (018) */
    if (b && !userRecOk(b)) return enfNo('shape');                                    /* KIVO_261 · AUD-057 */
    if (!phNewOk(a, b)) return enfNo('ph');                                            /* KIVO_262: بصمةٌ حديثة وحدها */
    depts[d] = 1;
  }
  var a19 = usersA1Why(inc, cur); if (a19) return enfNo(a19);   /* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · I4w: لكلّ فاعلٍ ومنهم مدير النظام — بعد أحكام الصفوف (018) */
  if (sup) return enfOk(['sys.users.manage']);
  if (selfOnly) return enfOk(['self.profile.edit']);
  var used = [], d9;
  for (d9 in depts) {
    var la = cur.filter(function (x) { return x && x.deptId === d9; }), lb = inc.filter(function (x) { return x && x.deptId === d9; });
    var r = enfDecide(A, k, 'bassam_auth_users_v1', d9, la, lb, JSON.stringify(la), JSON.stringify(lb), ctx, X, { noVia: true });
    if (!r.ok) return r;
    used = used.concat(r.keys);
  }
  return enfOk(enfUniq(used));
}
/* ── الصلاحيات (عامّ): حكمُ permsRule القائم (البنيةُ · السقف · التضييقُ الذاتي) ثم مفاتيحُ المصنِّف (أوراقٌ/عدساتُ موظف/قوالب ⇒ perm.assign · سقوفٌ ⇒ sys.ceiling.set) ── */
function enfPermsWrite(A, k, newVal, curVal, ctx, X) {
  var n = parseJson(newVal, null), o = curVal == null ? {} : parseJson(curVal, {});
  if (!isObj(n)) return enfNo('perms');
  if (!isObj(o)) o = {};
  var sup = A.u.role === 'super', cow = capOwnWhy(newVal, curVal);
  if (cow) return enfNo(cow);   /* caps-own: the mode, any role (021) */
  /* غيرُ مدير النظام: permsRule هو حكمُ perm.assign نفسُه (أوراقُ موظفي إدارته · عدساتُهم · قوالبُهم — لا سقوف ولا توسيعَ ذاتيّ ولا منحَ ما ليس في يده) */
  if (!sup) {
    /* حزمةُ الدمج · الجولة 5: رفضُ «grant» بقاعدة المانح (018 permsGrantWhy) يُسمّي المفتاحَ إن وجده حكمُ الإنفاذ نفسُه (enfPermsHeldWhy) — كان إسقاطُ ورقةِ
       مديرٍ يرث (الجولة 4) وصفحةُ العدسة المضافة (L-4) يُرفضان هنا بلا تفصيل فلا يعرف المانحُ أيَّ مفتاحٍ لا يحمله. الحكمُ نفسُه لا يتغيّر */
    var pr = permsRule(A, newVal, curVal);
    if (!pr.ok) { var hw0 = pr.why === 'grant' ? enfPermsHeldWhy(A, n, o) : ''; return enfNo(pr.why, hw0 ? { detail: hw0 + ' (grantor does not hold it)' } : null); }
    var hw = enfPermsHeldWhy(A, n, o); return hw ? enfNo('grant', { detail: hw + ' (grantor does not hold it)' }) : enfOk(['perm.assign']);
  }
  var res = KIVO_GUARDS.classify('bassam_perms_v1', o, n, { dept: '', actor: { id: A.u.id, ekey: A.u.ekey, role: A.u.role } }), keys = res.keys(), i;
  for (i = 0; i < keys.length; i++) if (keys[i].indexOf('__') === 0) return enfNo('unmapped', { detail: keys[i] });
  return enfOk(keys.length ? keys : ['sys.ceiling.set']);
}
/* «فحص الصلاحيات العميق (2026-10-21)» · N1: في الإنفاذ يُحكم المانحُ بمفاتيح v24.9 لا بالورقة — تضييقُ مدير النظام بالإسقاط (minus في سجل المنح)
   لا يظهر في ورقة المدير، فكان يعطي موظفَه الورقةَ كاملةً من الجدول الشهري أو القالب فيملك الموظفُ ما سُحب من مديره.
   الآن: كلُّ مفتاحٍ يضيفه الحفظُ لصاحب الورقة (ورقتُه أو عدساتُه الجديدة) يحمله المانحُ نفسُه في الوحدة (enfHeld) — كما enfGrantsWrite للمنح الصريح.
   يعيد أولَ مفتاحٍ لا يحمله المانح ('' = لا شيء) */
function enfPermsHeldWhy(A, n, o) {
  var ds = nmap(), d, ek, key, B = permOnAll(A);   /* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · M-C: كأنّ الوحدات كلَّها مشغَّلة (018 permOnAll) */
  ['emps', 'empLens'].forEach(function (s) { [n, o].forEach(function (P) { if (isObj(P) && isObj(P[s])) Object.keys(P[s]).forEach(function (x) { ds[x] = 1; }); }); });
  for (d in ds) {
    var eo = (o.emps || {})[d], en = (n.emps || {})[d], lo = (o.empLens || {})[d], ln = (n.empLens || {})[d], eks = nmap();
    eo = isObj(eo) ? eo : {}; en = isObj(en) ? en : {}; lo = isObj(lo) ? lo : {}; ln = isObj(ln) ? ln : {};
    [eo, en, lo, ln].forEach(function (m) { Object.keys(m).forEach(function (x) { eks[x] = 1; }); });
    for (ek in eks) {
      if (deq(eo[ek], en[ek]) && deq(lo[ek], ln[ek])) continue;
      /* الجولة 2 · M-A: ما كان بأضيق وراثةٍ للمفتاح (inhAll) وما يصير بأوسعها (inh) — حسابٌ واحدٌ يرث يكفي ليُحكم حذفُ الورقة توسيعاً */
      var t = permTargetOf(A, ek), t0 = { kind: t.kind, inh: t.inhAll }, was = enfSheetKeys(B, d, t0, eo[ek], lo[ek]), now = enfSheetKeys(B, d, t, en[ek], ln[ek]);
      for (key in now) if (!was[key] && !enfHeld(B, d, key)) return key;
    }
  }
  return '';
}
/* المفاتيحُ التي تعطيها ورقةٌ وعدساتٌ لصاحبها في الوحدة d — مسارُ الترجمة في enfHeld0 نفسُه (ترجمةُ الورقة المقصوصة بالسقف · ENF_DERIVE ·
   سقفُ المفتاح · بوابةُ العدسة · ENF_COMPAT بعد الترحيل)؛ وما لا تمنحه الورقةُ أصلاً (الذات · الدور · مدير النظام · مفاتيحُ المدير لغير المدير) خارجها */
function enfSheetKeys(A, d, t, sheet, el) {
  var ix = enfIx(), R = KIVO_REGISTRY, out = {}, cut = {}, leaf, key, s, i;
  var src = isObj(sheet) ? (Object.keys(sheet).some(pgIsContainer) ? expandPermsOf(A, d, sheet) : sheet) : (t.inh ? capAllPermsOf(A, d) : {});
  for (leaf in src) if (capOnDept(A, d, leaf)) cut[leaf] = src[leaf];
  var T = R.translate(cut);
  for (s in ENF_DERIVE) if (T.keys[s]) for (i = 0; i < ENF_DERIVE[s].length; i++) T.keys[ENF_DERIVE[s][i]] = true;
  for (key in T.keys) {
    var e = R.byKey[key], L = ix.lens[key];
    if (!T.keys[key] || !e || e.status !== 'active' || e.grant === 'self' || e.grant === 'role' || ix.superOnly[key]) continue;
    if (ix.needMgr[key] && t.kind === 'staff') continue;
    if (ENF_COMPAT[key] && enfPermMigrated(A)) continue;
    if (!enfKeyOnCeiling(A, d, key)) continue;
    if (L && Array.isArray(el) && el.indexOf(L) === -1) continue;
    out[key] = 1;
  }
  return out;
}
/* ── المنحُ الصريح (bsdept:<d>:bassam_grants_v1): مديرُ الإدارة (perm.assign) لموظفي إدارته لا لنفسه — مفتاحٌ قابلٌ للمنح · داخل سقف الإدارة · يملكه المانح؛
   الإسقاطُ (minus) لأيّ مفتاحٍ نشط · مديرُ النظام بلا قيد المانح · حذفُ السجل كلِّه لمدير النظام وحده ── */
var ENF_GRANT_FIELDS = { plus: 1, minus: 1, at: 1, by: 1, src: 1 };
function enfGrantsWrite(A, k, newVal, curVal, ctx) {
  var P = parseKey(k), d = P.dept, sup = A.u.role === 'super';
  if (!d) return enfNo('scope');
  if (!sup && !deptInScope(A, d)) return enfNo('dept');
  if (newVal == null) return sup ? enfOk(['perm.assign']) : enfNo('super');
  var n = parseJson(newVal, null), o = curVal == null ? {} : parseJson(curVal, null);
  if (!isObj(n) || !isObj(o)) return enfNo('shape');
  if (n.emp !== undefined && !isObj(n.emp)) return enfNo('shape', { detail: 'emp' });
  var top = {}, q; Object.keys(n).concat(Object.keys(o)).forEach(function (x) { top[x] = 1; });
  /* «فحص الصلاحيات العميق (2026-10-21)» · DX-05: أولُ سجلٍّ في وحدةٍ لا سجلَّ لها يُنشأ بـ v:1 (شكلُ الواجهة 331) — كان الحقلُ يُقارَن بسجلٍّ غائب
     فيُرفض منحُ المدير الأولُ «لمدير النظام وحده» ويأخذ الموظفُ أقلَّ من قالبه */
  for (q in top) { if (q === 'emp' || deq(o[q], n[q]) || (q === 'v' && curVal == null && n.v === 1)) continue; if (!sup) return enfNo('super', { detail: q }); }
  var eo = isObj(o.emp) ? o.emp : {}, en = isObj(n.emp) ? n.emp : {}, all = {}, e, i;
  if (deq(eo, en)) return enfOk(['perm.assign']);
  if (!sup && !isMgrOf(A, d)) return enfNo('mgr');
  for (e in eo) all[e] = 1; for (e in en) all[e] = 1;
  for (e in all) {
    if (deq(eo[e], en[e])) continue;
    if (!sup && e === String(A.u.ekey || '')) return enfNo('self', { detail: e });                                    /* لا يمنح نفسَه ولا يُسقط عنها */
    if (!sup && !permTargetOk(A, e)) return enfNo('target', { detail: e });                                           /* «فحص الصلاحيات العميق (2026-10-21)» · M5/PAR-4: منحُ المديرين لمدير النظام أو لمدير فرعٍ فوقهم (018) */
    var gb = en[e];                                                                                                   /* undefined: سحبُ المنح كلِّه */
    if (gb !== undefined) {
      if (!isObj(gb)) return enfNo('shape', { detail: e });
      for (q in gb) if (!ENF_GRANT_FIELDS[q]) return enfNo('shape', { detail: e + '.' + q });
      if ((gb.plus !== undefined && !Array.isArray(gb.plus)) || (gb.minus !== undefined && !Array.isArray(gb.minus))) return enfNo('shape', { detail: e });
    }
    if (!sup) { var lw = enfMinusLiftWhy(A, d, e, eo[e], gb, ctx && ctx.pa); if (lw) return enfNo('grant', { detail: lw + ' (grantor does not hold it)' }); }   /* الجولة 2 · M-D · R3-4 */
    if (gb === undefined) continue;
    var plus = gb.plus || [], minus = gb.minus || [], prev = isObj(eo[e]) && Array.isArray(eo[e].plus) ? eo[e].plus.map(String) : [];
    for (i = 0; i < plus.length; i++) {
      var key = String(plus[i]), re = KIVO_REGISTRY.byKey[key];
      if (!re || re.status !== 'active' || re.grant !== 'assignable') return enfNo('grant', { detail: key + ' (not assignable)' });
      if (prev.indexOf(key) !== -1) continue;                                                                         /* قائمٌ سلفاً */
      if (!enfKeyOnCeiling(A, d, key)) return enfNo('cap', { detail: key + ' (outside department ceiling)' });
      if (!sup && !enfHeld(A, d, key)) return enfNo('grant', { detail: key + ' (grantor does not hold it)' });
    }
    for (i = 0; i < minus.length; i++) { var km = KIVO_REGISTRY.byKey[String(minus[i])]; if (!km || km.status !== 'active') return enfNo('grant', { detail: String(minus[i]) + ' (unknown/inactive)' }); }
  }
  return enfOk(['perm.assign']);
}
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · M-D: رفعُ الإسقاط منح — إزالةُ مفتاحٍ من minus موظفٍ (أو حذفُ مدخله كلِّه وفيه إسقاط) تعيد إليه ما
   ترجمته ورقتُه، فيحمله المانحُ نفسُه في الوحدة (enfHeld — كأنّ الوحدات كلَّها مشغَّلة: M-C) كما يُحكم plus. كان مديرُ الإدارة المضيَّقُ عليه يمحو
   إسقاطَ مدير النظام عن موظفه (report.reopen …) فيحمل الموظفُ ما لا يحمله مانحُه. ويرفع المانحُ ما يحمل مفتاحَه — ومنه تضييقُه هو على موظفه؛
   و«by» في المدخل يكتبه العميل فلا يُنسب به مفتاحٌ إلى أحد. وما لا يعضّ فيه الإسقاطُ أصلاً لا يُحكم: مفتاحٌ مجهولٌ أو غيرُ قابلٍ للمنح (ذاتيٌّ ·
   بالدور · لمدير النظام وحده · perm.assign — enfHeld0 يحكم فيها قبل الإسقاط) · وخارجُ سقف الوحدة لموظفٍ لا يرث (سقفُ مدير النظام، والأوراقُ
   تُقصّ معه — setDeptCap؛ وإطفاءُ المنصة ليس سقفاً). يعيد أولَ مفتاحٍ لا يحمله المانح ('' = لا شيء)
   «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-4: ورفعُ الإسقاط منحٌ حين يحمل الموظفُ المفتاحَ بعد الحفظ وحده — بورقته وعدساته بعد الحفظ
   (PA: الصلاحياتُ كما ستُكتب في هذه الحفظة إن قُبلت فيها bassam_perms_v1 — 054 applySave — وإلا المخزَّنة) أو بـplus الجديد. كان القالبُ يُسند بورقةٍ
   لا تمنح مفتاحاً أسقطه مديرُ النظام فيسقط الإسقاطُ من الفرق (العميلُ يحسب minus = T − E) فيُرفض منحُ القالب كلُّه وهو لا يمنح شيئاً */
function enfMinusLiftWhy(A, d, e, g0, g1, PA) {
  var m0 = isObj(g0) && Array.isArray(g0.minus) ? g0.minus.map(String) : [];
  if (!m0.length) return '';
  var m1 = isObj(g1) && Array.isArray(g1.minus) ? g1.minus.map(String) : [], B = permOnAll(A), ix = enfIx(), t = null, i, after = null;
  var p1 = isObj(g1) && Array.isArray(g1.plus) ? g1.plus.map(String) : [];
  for (i = 0; i < m0.length; i++) {
    var key = m0[i], re = KIVO_REGISTRY.byKey[key];
    if (m1.indexOf(key) !== -1) continue;
    if (!re || re.status !== 'active' || re.grant !== 'assignable' || ix.superOnly[key] || (ix.needMgr[key] && ix.atomless[key])) continue;
    if (!t) t = permTargetOf(A, e);
    var on9 = enfKeyOnCeiling(B, d, key);
    if (!on9 && !t.inh) continue;
    if (on9 && p1.indexOf(key) === -1) {
      if (!after) { var P9 = isObj(PA) ? PA : (A.perms || {}); after = enfSheetKeys(B, d, t, ((P9.emps || {})[d] || {})[e], ((P9.empLens || {})[d] || {})[e]); }
      if (!after[key]) continue;                                                     /* لا يحمله بعد الحفظ: إسقاطٌ زال بزوال ما يمنحه */
    }
    if (!enfHeld(B, d, key)) return key;
  }
  return '';
}
/* ── الإحصائياتُ اليومية (عامّ): الشكلُ والأقفال كما dstatsRule، والقرارُ بمفاتيح الإدخال/الاعتماد/إعادة الفتح بإدارات الفاعل + Source + DateRange (D4-02: لا استثناءَ لمدير النظام) ── */
function enfDstatsWrite(A, k, newVal, curVal, ctx, X) {
  var n = parseJson(newVal, null), o = curVal == null ? {} : parseJson(curVal, null), top = {}, q, kk;
  if (!isObj(n) || !isObj(o)) return enfNo('dstats');
  Object.keys(n).concat(Object.keys(o)).forEach(function (x) { top[x] = 1; });
  for (kk in top) {
    if (deq(o[kk], n[kk])) continue;
    if (DS_SITES.indexOf(kk) !== -1) {
      var a9 = o[kk] === undefined ? {} : o[kk], b9 = n[kk] === undefined ? {} : n[kk];
      if (!isObj(a9) || !isObj(b9)) return enfNo('dstats');
      for (q in b9) if (!deq(a9[q], b9[q]) && (!/^\d{4}-\d{2}-\d{2}$/.test(q) || !dsDayOk(b9[q]))) return enfNo('dstats');
      continue;
    }
    if (kk === 'locks') {
      var la = o.locks === undefined ? {} : o.locks, lb = n.locks === undefined ? {} : n.locks;
      if (!isObj(la) || !isObj(lb)) return enfNo('dstats');
      for (q in lb) if (!deq(la[q], lb[q]) && (!/^(haram|nabawi)\|\d{4}-\d{1,2}$/.test(String(q)) || !dsLockOk(lb[q]))) return enfNo('dstats');
      for (q in la) if (lb[q] === undefined && !/^(haram|nabawi)\|\d{4}-\d{1,2}$/.test(String(q))) return enfNo('dstats');
      continue;
    }
    if (A.u.role !== 'super') return enfNo('super');
  }
  var sup = A.u.role === 'super';
  var r = enfDecide(A, k, K_DSTATS, '', o, n, curVal, newVal, ctx, X, {
    held: function (key) { return sup || enfHeldAnyDept(A, key); },
    techOk: function () { return sup || enfHeldAnyDept(A, 'dstats.haram.entry') || enfHeldAnyDept(A, 'dstats.nabawi.entry'); }, noVia: true });
  return r;
}
/* ── سجلُّ النطاق (bsdept:<d>:bassam_scope_v1 — خارج RES_REG: مجهولٌ مرفوضٌ في النظام القديم كما كان) ──
   السقف (ceiling) لمدير النظام (sys.ceiling.set) · نطاقُ الموظفين (emp) لمدير الإدارة (perm.assign) ضمن السقف · ما سواهما لمدير النظام */
function enfScopeWrite(A, k, newVal, curVal) {
  var P = parseKey(k), d = P.dept, sup = A.u.role === 'super';
  if (!d) return enfNo('scope');
  if (!sup && !deptInScope(A, d)) return enfNo('dept');
  if (newVal == null) return sup ? enfOk(['sys.ceiling.set']) : enfNo('super');
  var n = parseJson(newVal, null), o = curVal == null ? {} : parseJson(curVal, null);
  if (!isObj(n) || !isObj(o)) return enfNo('shape');
  var top = {}, q; Object.keys(n).concat(Object.keys(o)).forEach(function (x) { top[x] = 1; });
  var keys = [];
  for (q in top) {
    if (deq(o[q], n[q])) continue;
    if (q === 'emp') continue;
    if (!sup) return enfNo('super', { detail: q });
    if (q === 'ceiling') { if (!isObj(n.ceiling)) return enfNo('shape'); for (var dim in n.ceiling) { var c = n.ceiling[dim]; if (!ENF_SCOPE_MODES[dim] || !isObj(c) || !ENF_SCOPE_MODES[dim][c.mode] || (c.mode === 'list' && !Array.isArray(c.list))) return enfNo('shape', { detail: 'ceiling.' + dim }); } keys.push('sys.ceiling.set'); }
  }
  var eo = isObj(o.emp) ? o.emp : {}, en = isObj(n.emp) ? n.emp : {}, ek, E = { recs: {} }; E.recs[d] = n;
  if (!deq(eo, en)) {
    if (!sup && !isMgrOf(A, d)) return enfNo('mgr');
    var all = {}; for (ek in eo) all[ek] = 1; for (ek in en) all[ek] = 1;
    for (ek in all) {
      if (deq(eo[ek], en[ek])) continue;
      if (!sup && ek === String(A.u.ekey || '')) return enfNo('self');
      var s = en[ek]; if (s === undefined) continue;
      if (!isObj(s)) return enfNo('shape');
      for (var dm in s) {
        var v = s[dm];
        if (!ENF_EMP_MODES[dm] || !isObj(v) || !ENF_EMP_MODES[dm][v.mode]) return enfNo('shape', { detail: 'emp.' + ek + '.' + dm });
        var L = v.mode === 'list' ? v.list : (v.mode === 'single' ? [v.value] : null);
        if (L && !Array.isArray(L)) return enfNo('shape');
        if (L && dm !== 'Shift') { var ceil = enfCeilingOf(E, d, dm); if (ceil === null) return enfNo('scope-unknown', { detail: 'ceiling ' + dm + ' unmigrated' }); if (ceil !== 'ALL') for (var li = 0; li < L.length; li++) if (!enfHas(ceil, L[li])) return enfNo('scope', { detail: dm + ' ' + L[li] + ' outside ceiling' }); }
      }
    }
    keys.push(sup ? 'sys.ceiling.set' : 'perm.assign');
  }
  return enfOk(enfUniq(keys));
}
