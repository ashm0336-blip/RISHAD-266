/* ═══ KIVO_265 · ملاحظةُ المالك (2026-10-19 · أمن): رقمُ الهوية ورقمُ الجوال والرقمُ الوظيفي لا تتكرّر — داخل الإدارة ولا عبر الإدارات
   كلها ولا مع حسابات الدخول (أسماءُ المستخدمين = هوية أو جوال). كان الفحصُ في العميل وحده (dupCheck في النموذج · seen* في الاستيراد
   بما في ذاكرة المتصفح من الإدارات الأخرى) فيمكن تجاوزُه بطلبٍ مصنوع أو بمتصفحٍ لا يحمل بياناتِ بقية الإدارات. القاعدةُ هنا على
   الخادم: الهوياتُ الجديدة أو المتغيّرة في هذه الدفعة (ليست في القيمة الحالية) تُرفض «emp-dup» إن وُجدت في إدارةٍ أخرى أو في حسابٍ
   خارج هذه الإدارة أو تكرّرت داخل الدفعة. القديمُ القائم لا يُحاسَب حتى لا يُقفل سجلٌّ موروث. ═══ */
function empIdents(rows) {
  var m = { n: {}, p: {}, o: {} };
  (Array.isArray(rows) ? rows : []).forEach(function (e) {
    if (!isObj(e)) return;
    var n = String(e.nid || '').trim(), p = String(e.phone || '').trim(), o = String(e.empno || '').trim();
    if (n) m.n[n] = 1; if (p) m.p[p] = 1; if (o) m.o[o] = 1;
  });
  return m;
}
function empDupWhy(A, a, b, d, ctx) {
  var E = ctx && ctx.ed; if (!E || !Array.isArray(b)) return '';
  var old = empIdents(a), seen = { n: {}, p: {}, o: {} }, other = { n: {}, p: {}, o: {} }, dd, i, e, n, p, o, m;
  for (dd in E.others) { if (dd === d) continue; m = empIdents(E.others[dd]); for (i in m.n) other.n[i] = 1; for (i in m.p) other.p[i] = 1; for (i in m.o) other.o[i] = 1; }
  (Array.isArray(E.users) ? E.users : []).forEach(function (u) {
    if (!isObj(u) || u.deptId === d) return;
    if (u.un) { other.n[String(u.un)] = 1; other.p[String(u.un)] = 1; }
    if (u.alt) { other.n[String(u.alt)] = 1; other.p[String(u.alt)] = 1; }
  });
  for (i = 0; i < b.length; i++) {
    e = b[i]; if (!isObj(e)) continue;
    n = String(e.nid || '').trim(); p = String(e.phone || '').trim(); o = String(e.empno || '').trim();
    if (n) { if (seen.n[n] && !old.n[n]) return 'emp-dup'; seen.n[n] = 1; if (!old.n[n] && other.n[n]) return 'emp-dup'; }
    if (p) { if (seen.p[p] && !old.p[p]) return 'emp-dup'; seen.p[p] = 1; if (!old.p[p] && other.p[p]) return 'emp-dup'; }
    if (o) { if (seen.o[o] && !old.o[o]) return 'emp-dup'; seen.o[o] = 1; if (!old.o[o] && other.o[o]) return 'emp-dup'; }
  }
  return '';
}
@@SYS:task.rawWhy@@/* KIVO_264 · D14 · OD-7: حكمُ تعديل صاحب الحساب لسجلّه هو (a المخزَّن · b الوارد) — null مقبول، وإلا سببُ الرفض:
   'self' حقلٌ خارج قائمة دوره (SELF_FIELDS_BY_ROLE · 017) · 'self-un' اسمُ دخولٍ بصيغةٍ غير صالحة · 'self-cur' اسمُ دخولٍ بلا كلمة المرور الحالية.
   st = حالةُ «cur» المحسوبة في applySave (selfCurState · 054): { ok: كلمةُ المرور الحالية صحيحة · forced: الدخولُ الأوّل الإجباري } أو null (لم يتغيّر اسمُ الدخول).
   الدخولُ الأوّل الإجباري (شاشةُ الدخول — 335-identity-gate): اسمُ دخولٍ قديم بصيغةٍ غير صالحة (admin مثلاً) في حالة «يجب التغيير» بجلسةٍ حديثة
   يُستبدل باسمٍ صالح مع كلمة مرورٍ جديدة في الحفظة نفسِها — un وحده يُضاف إلى قائمة الدور حينها. */
function selfLoginMoved(a, b) { return SELF_CUR_FIELDS.some(function (f) { return String(a[f] == null ? '' : a[f]) !== String(b[f] == null ? '' : b[f]); }); }
function selfLoginWhy(a, b, st) {
  if (!selfLoginMoved(a, b)) return null;
  if (!unCheck(b.un) || (b.alt != null && b.alt !== '' && !unCheck(b.alt))) return 'self-un';
  if (st && st.ok) return null;
  var altMoved = String(a.alt == null ? '' : a.alt) !== String(b.alt == null ? '' : b.alt);
  return (st && st.forced && !altMoved) ? null : (st && st.locked ? 'self-lock' : 'self-cur');   /* الإجباريُّ يستبدل un وحده · KIVO_264 (F6): المقفلُ يُسمّى */
}
function selfAcctWhy(A, a, b, st) {
  if (!a || !b) return 'self';
  var allow = selfFieldsOf(A.u);
  if (st && st.forced && allow.indexOf('un') === -1) allow = allow.concat(['un']);
  if (!eqExcept(a, b, allow)) return 'self';
  return selfLoginWhy(a, b, st);
}
/* مراجعةُ التكامل W1-CRIT (دفاعٌ في العمق): الحكمُ أدناه على آخر نسخةٍ من المعرّف والدخولُ (actorOf · /api/login) يأخذ أوّلَها — فمعرّفٌ مكرَّرٌ في القائمة
   الواردة كلُّ نسخةٍ منه نسخةٌ مخزَّنةٌ كما هي (عدا ph الغائب و«no» المورَّث) وإلا 'users'. البوابةُ لكلّ حفظٍ قبلها في 054 applySave (usersDupIdIn) */
/* مراجعةُ التكامل (الجولة الثانية · كبوابة 054 usersDupIdIn): R2-LEGACYLOCK — نسخٌ واردةٌ متطابقةٌ حرفاً لا تزيد على المخزَّنة المتطابقة تُقبل (الأولى هي
   المحكومُ عليها) · R2-SUBSET — معرّفٌ نسخُه المخزَّنة مختلفة: نسخُه الواردةُ هي المخزَّنة بعددها وترتيبها (البوابةُ تضعها كلَّها) وإلا 'users' */
function usersDupCopyWhy(inc, cur) {
  var byI = nmap(), byC = nmap(), i, id, x;
  var asC = function (b, a) { return isObj(a) && eqExcept(a, b, ['ph', 'no']) && (!b.ph || b.ph === a.ph); };
  for (i = 0; i < inc.length; i++) { id = String(inc[i].id); (byI[id] = byI[id] || []).push(inc[i]); }
  (Array.isArray(cur) ? cur : []).forEach(function (c) { if (c && c.id != null) (byC[String(c.id)] = byC[String(c.id)] || []).push(c); });
  for (id in byC) {
    var cs = byC[id]; if (cs.length < 2 || cs.every(function (c) { return deq(c, cs[0]); })) continue;
    var is = byI[id] || [];
    if (is.length !== cs.length) return 'users';
    for (i = 0; i < is.length; i++) if (!asC(is[i], cs[i])) return 'users';
  }
  for (id in byI) {
    var bs = byI[id], cs2 = byC[id] || []; if (bs.length < 2) continue;
    if (bs.length <= cs2.length && bs.every(function (b) { return deq(b, bs[0]); })) continue;
    for (i = 0; i < bs.length; i++) { x = bs[i]; if (!cs2.some(function (a) { return asC(x, a); })) return 'users'; }
  }
  return '';
}
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · M-B: مفاتيحُ المديرين في قائمة الحسابات المخزَّنة — كلُّ مفتاحٍ يحمله حسابٌ مدير (دورُه غيرُ staff:
   gm · dept · super — أو يحمل الشارة mgr) نشطاً كان أو مجمَّداً. مفتاحُ mgr:/gm: صفةُ منصبٍ بنفسه (usersSynKey) ولا يحتاج حساباً */
function usersMgrEkSet(list) {
  var s = nmap();
  (Array.isArray(list) ? list : []).forEach(function (x) { if (x && x.ekey != null && x.ekey !== '' && (x.role !== 'staff' || x.mgr)) s[String(x.ekey)] = 1; });
  return s;
}
function usersMgrEk(ek, S) { return usersSynKey(ek) || (ek != null && ek !== '' && !!S[String(ek)]); }
/* D1 · M-B · L3 — لغير مدير النظام، حسابٌ مفتاحُه مفتاحُ مدير (usersMgrEk): لا يُنشأ، ولا يُغيَّر إليه مفتاحٌ ولا منه؛ والقائمُ منه يُجمَّد
   (dis وحده) ويُحذف — ولا تعديلَ سواه (اسمٌ · كلمةُ مرور · إدارة · فكُّ التجميد: R3-1). كان مديرُ الإدارة يُنشئ حساباً «staff» نشطاً بمفتاح مدير عقدةٍ قديم (رقمِ
   هويته — usersDupEkey يتخطّى حساباتِ gm) فيدخل به ويحمل ورقتَه ومنحَه في الوحدة؛ أو مجمَّداً بمفتاح زميله حامل الشارة (usersDupEkey يتخطّى
   المجمَّد) فيُحكم على الزميل «موظفاً عادياً». والإصلاحُ الأوّل (D1) كان يمنع تجميدَ حسابٍ بمفتاح mgr: فيبقى ما خلّفته الدُّمى نشطاً — L3
   «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-1: والاستثناءُ اتجاهٌ واحد — التجميدُ (dis من 0 إلى 1) والحذفُ وحدهما. كان فكُّ التجميد مقبولاً
   فيعيد مديرُ الإدارة الدميةَ أو الحسابَ البديل الذي جمّده مديرُ النظام إلى العمل بكلمة المرور التي اختارها هو — فكُّه لمدير النظام وحده */
function usersEkeyWhy(a, b, S) {
  if (!b) return '';
  var mb = usersMgrEk(b.ekey, S);
  if (!a) return mb ? 'ekey' : '';
  if (!mb && !usersMgrEk(a.ekey, S)) return '';
  if (String(a.ekey == null ? '' : a.ekey) !== String(b.ekey == null ? '' : b.ekey)) return 'ekey';
  return usersFreezeOnly(a, b) ? '' : 'ekey';
}
/* التجميدُ وحده: dis من غير مجمَّدٍ إلى مجمَّد، وما سواه كما خُزِّن (ph الغائبُ يُورَث) */
function usersFreezeOnly(a, b) { return !!a && !!b && !a.dis && !!b.dis && eqExcept(a, b, ['dis', 'ph']) && (!b.ph || b.ph === a.ph); }
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · I4w (المواصفة §0.4): حسابٌ «staff» مفتاحُه mgr: بلا الشارة (mgr:true) ليس مديراً عند isMgrOf
   ويرث سقفَ الوحدة كلَّه عند myPermsOf (022) — شكلٌ لا يصنعه إلا نزعُ الشارة عن حساب مدير الإدارة. فلا يُكتب لأحدٍ ولو مدير النظام:
   الصفُّ القائمُ بهذا الشكل كما خُزِّن يمرّ (فلا يتعطّل حفظُ القائمة كلِّها) ولا يُعدَّل إلا تجميداً أو حذفاً — وتنزيلُ المدير حذفُ حسابه.
   يُفحص كلُّ صفٍّ واردٍ بنسخه (المكرَّرُ القديم يُطابَق بأيّ نسخةٍ مخزَّنة له) · السبب 'mgr-key'
   والتنظيف L-05 (أ): حسابُ «الإدارة» (role dept) أُلغي — صفٌّ جديدٌ أو متغيّرٌ به يُرفض 'shape' كذلك، والقائمُ كما خُزِّن يمرّ حتى يحذفه المالك. */
function usersA1(x) { return isObj(x) && x.role === 'staff' && isMgrKey(x.ekey) && !x.mgr; }
function usersA1Why(inc, cur) {
  var byA = nmap(), i;
  (Array.isArray(cur) ? cur : []).forEach(function (x) { if (x && x.id != null) (byA[String(x.id)] = byA[String(x.id)] || []).push(x); });
  for (i = 0; i < (Array.isArray(inc) ? inc.length : 0); i++) {
    var b = inc[i], dep = isObj(b) && b.role === 'dept'; if (!dep && !usersA1(b)) continue;
    var cs = byA[String(b.id)] || [];
    if (cs.some(function (a) { return eqExcept(a, b, ['ph']) && (!b.ph || b.ph === a.ph); })) continue;   /* كما خُزِّن */
    if (dep) return 'dept-role';                                                                                  /* التنظيف L-05 (أ): حسابُ «الإدارة» أُلغي — لا يُنشأ ولا يُعدَّل */
    if (cs.some(function (a) { return usersA1(a) && usersFreezeOnly(a, b); })) continue;                     /* تجميدُه */
    return 'mgr-key';
  }
  return '';
}
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-2: مفاتيحُ المديرين تُعرف من الحسابات المخزَّنة — فإذا حذف مديرُ النظام مديرَ عقدةٍ قديماً أو مديراً
   بدوره (مفتاحُه بلا بادئة) بقي مدخلُه في سجلّ المنح الصريح (bsdept:<d>:bassam_grants_v1) فيُنشئ مديرُ الإدارة حساباً بذلك المفتاح فيرث منحَه.
   الآن: ربطُ حسابٍ بمفتاحٍ لغير مدير النظام (إنشاؤه أو تغييرُ مفتاحه) يُحكم كمنح — كلُّ مفتاح plus نشطٍ قابلٍ للمنح في مدخلٍ باقٍ لذلك المفتاح يحمله الكاتبُ
   في وحدته (enfHeld كأنّ الوحدات كلَّها مشغَّلة) · ومدخلٌ باقٍ فيه plus في وحدةٍ لا يديرها الكاتبُ يرفض الربط. بالوضعين (السجلُّ يُقرأ في الإنفاذ،
   ويبقى لمن يعود إليه). GX = { recs: {وحدة: سجل}, byEk: {مفتاح: [وحدات]} } يحمّله applySave (054 usersGrantsLoad) — وغيابُه رفضٌ (fail-closed).
   تجميدُ حسابٍ قائمٍ أو فكُّه أو تعديلُه بمفتاحه نفسِه ليس ربطاً. يعيد التفصيل ('' = لا شيء) */
function usersGrantWhy(A, a, b, GX) {
  if (!b) return '';
  var ek = b.ekey == null ? '' : String(b.ekey);
  if (!ek || (a && String(a.ekey == null ? '' : a.ekey) === ek)) return '';
  if (!GX || !GX.byEk || !GX.recs) return 'grants (not loaded)';
  var ds = GX.byEk[ek] || [], B = null, i, j;
  for (i = 0; i < ds.length; i++) {
    var g = (GX.recs[ds[i]] && GX.recs[ds[i]].emp) ? GX.recs[ds[i]].emp[ek] : null, act = [];
    (isObj(g) && Array.isArray(g.plus) ? g.plus : []).forEach(function (x) { var re = KIVO_REGISTRY.byKey[String(x)]; if (re && re.status === 'active' && re.grant === 'assignable') act.push(String(x)); });
    if (!act.length) continue;
    if (!isMgrOf(A, ds[i])) return ds[i] + ' (leftover grants in a unit outside your management)';
    if (!B) B = usersGrantorOf(A, GX);
    for (j = 0; j < act.length; j++) if (!enfHeld(B, ds[i], act[j])) return act[j] + ' (grantor does not hold it)';
  }
  return '';
}
/* المانحُ كأنّ الوحدات كلَّها مشغَّلة (M-C) ومعه سجلاتُ المنح لكلّ الوحدات — نسخةٌ سطحيةٌ بلا مخابئ الحكم، مرّةً لكلّ حفظةٍ (A.__usB) */
function usersGrantorOf(A, GX) {
  if (A.__usB && A.__usB.__gx === GX) return A.__usB;
  var B = {}, q;
  for (q in A) if (q.slice(0, 2) !== '__' || q === '__ekIx') B[q] = A[q];
  B.off = []; B.__grants = GX.recs; B.__gx = GX;
  return (A.__usB = B);
}
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-2 (التتمّة): والورقةُ الباقيةُ كالمنح الباقي — حسابُ «staff» يقرأ ورقةَ مفتاحه في إدارته وعدساتِه
   (022 myPermsOf ← empPermsOf: perms.emps[وحدتُه][مفتاحُه])، فكان مديرُ الإدارة المضيَّقُ عليه يُنشئ حساباً بمفتاحٍ له في إدارته ورقةٌ باقيةٌ من حسابٍ
   حُذف (مديرُ عقدةٍ قديمٌ برقم هويته نُقلت الإدارةُ من فرعه قبل حذفه — 330 removeGroupManager كان يحذف أوراقَه في وحدات فرعه وقتَ الحذف وحدها)
   فيحمل الحسابُ ما لا يحمله مديرُه. الآن: ربطُ حسابٍ بمفتاحٍ (إنشاؤه أو تغييرُ مفتاحه) لغير مدير النظام يُحكم كإنشاء تلك الورقة بعدساتها لموظفٍ
   عاديٍّ لا ورقةَ له — قاعدةُ المانح نفسُها (permsGrantWhy: الصفحاتُ والأفعالُ والعدساتُ كأنّ الوحدات كلَّها مشغَّلة) بالوضعين، وفي الإنفاذ مفاتيحُها
   كذلك (enfSheetKeys بلا ما يُسقطه المنحُ الصريح في الوحدة — يحملها المانح: enfHeld). والقالبُ (tplOf) هويةٌ لا تمنح بنفسها، والورقةُ في وحدةٍ أخرى
   لا يقرؤها حسابُ هذه الوحدة. تجميدُ القائم وفكُّه وتعديلُه بمفتاحه نفسِه ليس ربطاً. keys: الإنفاذ. يعيد التفصيل ('' = لا شيء) */
function usersSheetWhy(A, a, b, GX, keys) {
  if (!b) return '';
  var ek = b.ekey == null ? '' : String(b.ekey), d = b.deptId == null ? '' : String(b.deptId);
  if (!ek || !d || (a && String(a.ekey == null ? '' : a.ekey) === ek)) return '';
  var P = A.perms || {}, own = function (m) { return isObj(m) && Object.prototype.hasOwnProperty.call(m, ek) ? m[ek] : undefined; };
  var sh = own((P.emps || {})[d]), el = own((P.empLens || {})[d]), one = nmap(), ln = null, mi = [];
  if (!isObj(sh)) return '';
  if (keys) {
    if (!GX || !GX.recs) return 'grants (not loaded)';
    var g = own(GX.recs[d] && GX.recs[d].emp); mi = isObj(g) && Array.isArray(g.minus) ? g.minus.map(String) : [];
  }
  /* الحكمُ بمحتوى الورقة لا بصاحبها (المفتاحُ هنا موظفٌ عاديّ — مفتاحُ المدير رُفض قبله «ekey» · usersEkeyWhy) — فالدفعةُ بقالبٍ واحد تُحكم مرّةً */
  var memo = A.__usSv || (A.__usSv = nmap()), mk = (keys ? 'k|' : 'l|') + d + '|' + JSON.stringify(sh) + '|' + JSON.stringify(el === undefined ? null : el) + '|' + mi.join(',');
  if (mk in memo) return memo[mk];
  var out = '';
  if (keys) {
    var B = usersGrantorOf(A, GX), ks = enfSheetKeys(B, d, { kind: 'staff', inh: false }, sh, el);
    for (var key in ks) if (mi.indexOf(key) === -1 && !enfHeld(B, d, key)) { out = key + ' (grantor does not hold it)'; break; }
  }
  if (!out) {
    /* ما في الورقة خارجَ سقف الوحدة لا يمنح شيئاً (يُقصّ عند القراءة — capOnDept) فلا يُحكم */
    var C = permOnAll(A), src = expandPermsOf(C, d, sh), cut = nmap(), leaf;
    for (leaf in src) if (capOnDept(C, d, leaf)) cut[leaf] = src[leaf];
    one[ek] = cut; if (el !== undefined) { ln = nmap(); ln[ek] = el; }
    if (permsGrantWhy(A, d, null, one, null, null, null, ln)) out = 'sheet (leftover permissions the grantor does not hold)';
  }
  return (memo[mk] = out);
}
/* KIVO_261 (إصلاح · AUD-055/AUD-057 — كشفهما المراجعُ الأمنيّ المستقل): ما يكتبه غيرُ مدير النظام في المفاتيح العامّة كان بلا شكلٍ ولا حدّ —
   اسمٌ بستة ميغابايت في سجلّ الحساب، أو نصٌّ ضخم في أشجار الإدارة داخل bassam_perms_v1 — يُحقن في صفحة كلّ مستخدم. الآن حدودٌ سخيّةٌ لا تمسّ الاستعمال:
   حقولُ الحساب الذاتية نصوصٌ بطولٍ محدود والسجلُّ كلُّه ≤ 4 KB · ورقةُ الموظف كائنُ «ورقة ← أفعال من الستة» · القالبُ معرّفٌ قصير · عدساتُ الموظف مصفوفةُ مفاتيح قصيرة.
   يُفحص المتغيّرُ وحده (ما لم يتغيّر من بياناتٍ قديمة لا يُعطّل حفظاً). */
var USER_FMAX = { name: 120, email: 254, phone: 32, un: 64, alt: 64, ph: 600 };
function userRecOk(b) {
  if (!isObj(b)) return false;
  for (var f in USER_FMAX) { var v = b[f]; if (v === undefined || v === null || v === '') continue; if (typeof v !== 'string' || v.length > USER_FMAX[f]) return false; }
  return JSON.stringify(b).length <= 4096;
}
/* KIVO_262 (تصليب · مراجعةُ الازدواج المعماري): بصمةُ كلمة مرورٍ جديدة يكتبها غيرُ مدير النظام (المديرُ لموظفه · المستخدمُ لنفسه)
   تُقبل بصيغة PBKDF2 الحديثة وحدها وبعدد تكراراتٍ مضبوط — فلا تُخفَّض إلى djb2 القديمة (p1$) أو نصٍّ اعتباطيّ من عميلٍ قديم أو معدَّل.
   البصمةُ القائمةُ دون تغيير تمرّ كما هي (بياناتٌ قديمة)، ومديرُ النظام مستثنى (الاستعادةُ من نسخٍ قديمة تحمل p1$). */
var PH_NEW_RX = /^p2\$(\d{4,7})\$[0-9a-f]{32}\$[0-9a-f]{64}$/;
function phNewOk(a, b) {
  if (!b || b.ph === undefined || b.ph === null || b.ph === '' || (a && a.ph === b.ph)) return true;
  var m = PH_NEW_RX.exec(String(b.ph)); if (!m) return false;
  var it = +m[1]; return it >= PBKDF2_ITER && it <= PBKDF2_MAX;
}
var PERM_LEAF_RX = /^[a-z][A-Za-z0-9_]{0,31}(?:\/[A-Za-z][A-Za-z0-9_]{0,31})?$/;
function sheetShapeOk(sh) {
  if (!isObj(sh)) return false;
  var ks = Object.keys(sh); if (ks.length > 64) return false;
  for (var i = 0; i < ks.length; i++) {
    var acts = sh[ks[i]];
    if (!PERM_LEAF_RX.test(ks[i]) || !Array.isArray(acts) || acts.length > ACTS_ALL.length) return false;
    for (var j = 0; j < acts.length; j++) if (ACTS_ALL.indexOf(acts[j]) === -1 || acts.indexOf(acts[j]) !== j) return false;
  }
  return true;
}
function deptPermShapeOk(eo, en, to, tn, lo, ln) {
  var chk = function (o, n, ok) {
    if (n === undefined || n === null) return true;
    if (!isObj(n)) return false;
    var ks = Object.keys(n);
    for (var i = 0; i < ks.length; i++) { var ek = ks[i]; if (isObj(o) && deq(o[ek], n[ek])) continue; if (ek.length > 128 || !ok(n[ek])) return false; }
    return true;
  };
  return chk(eo, en, sheetShapeOk)
      && chk(to, tn, function (v) { return v === null || (typeof v === 'string' && v.length <= 64); })
      && chk(lo, ln, function (v) { return Array.isArray(v) && v.length <= 32 && v.every(function (x) { return typeof x === 'string' && x.length <= 32; }); });
}
/* الصلاحيات: السقوف والعدسات والتبويبات لمدير النظام، وصلاحيات الموظفين لمدير إدارتهم داخل السقف */
function permsRule(A, newJson, curJson) {
  var n = parseJson(newJson, null), o = parseJson(curJson, {});
  if (!isObj(n)) return { ok: false, why: 'perms' };
  if (!isObj(o)) o = {};
  var top = {}, k; Object.keys(n).concat(Object.keys(o)).forEach(function (x) { top[x] = 1; });
  for (k in top) {
    if (k === 'emps' || k === 'tplOf' || k === 'empLens') continue;
    /* KIVO_261 (إصلاح · AUD-054 — كشفه k261tamper): lensZ علامةُ ترقية العدسات (331: إن غابت أُضيفت «المناطق» ثم lensZ = 1 وحُفظ — يحفظها أيُّ مستخدمٍ
       عند أوّل تحميل) وكانت تُتخطّى كلياً فيكتب فيها غيرُ مدير النظام أيَّ قيمةٍ وبأيّ حجم في مفتاحٍ عامّ يقرؤه الجميع. الآن: كما هي أو 1 من غياب — وما سواها ممنوع */
    if (k === 'lensZ') { if (deq(o.lensZ, n.lensZ) || (n.lensZ === 1 && !o.lensZ)) continue; return { ok: false, why: 'super' }; }
    if (k === 'lenses' && lensesUpgradeOnly(o.lenses, n.lenses)) continue;
    var ov = o[k] === undefined ? {} : o[k], nv = n[k] === undefined ? {} : n[k];   /* الغائب والفارغ سواء */
    if (!deq(ov, nv)) return { ok: false, why: 'super' };   /* V7 · د5-هـ (44): السقفُ لمدير المنصة وحده — بذرُ سقف القسم الجديد ذهب مع إنشائه (الأقسامُ لمدير المنصة) */
  }
  var ds = {}; Object.keys(n.emps || {}).concat(Object.keys(o.emps || {}), Object.keys(n.tplOf || {}), Object.keys(o.tplOf || {}), Object.keys(n.empLens || {}), Object.keys(o.empLens || {})).forEach(function (d) { ds[d] = 1; });
  for (var d in ds) {
    var eo = (o.emps || {})[d], en = (n.emps || {})[d], to = (o.tplOf || {})[d], tn = (n.tplOf || {})[d], lo = (o.empLens || {})[d], ln = (n.empLens || {})[d];
    if (deq(eo, en) && deq(to, tn) && deq(lo, ln)) continue;
    if (!isMgrOf(A, d)) return { ok: false, why: 'mgr' };
    if (!deptPermShapeOk(eo, en, to, tn, lo, ln)) return { ok: false, why: 'shape' };   /* KIVO_261 · AUD-057 */
    /* «فحص الصلاحيات العميق (2026-10-21)» · PAR-1/DX-04: السقفُ الفعليّ للوحدة (capSetAnywhereOf/effCapOf — حكمُ deptCapOf نفسُه؛ والوحدةُ المطفأة
       على مستوى المنصة مفتاحُ تشغيلٍ لا سقف) لا السجلُّ الخامّ caps[d] الذي يقرأ الغائبَ «لا شيء» — فكان كلُّ قالبٍ يعطيه المديرُ في وحدةٍ مفتوحة
       يُرفض «خارج السقف». والأوراقُ التي تغيّرت في هذا الحفظ وحدها: ورقةٌ قديمةٌ لموظفٍ آخر لا تُسقط حفظاً لا شأن له بها.
       مفتاح الورقة «pk/sk» يُحكم بصفحته الحاوية */
    var cap = capSetAnywhereOf(A, d) ? effCapOf(A, d) : PG_OPEN.slice();
    /* caps-own · latent grants: a leaf outside the ceiling stays stored (read-time narrowing), so only what the save ADDS outside it is
       refused — a leaf or action the owner did not hold in his stored sheet before (the same key); kept or narrowed latent leaves pass.
       The same for lenses switched off for the unit: kept in an explicit list, never added to one */
    var bad = Object.keys(en || {}).some(function (ek) {
      var s0 = isObj(eo) && isObj(eo[ek]) ? eo[ek] : null, x0 = null; if (s0 && deq(s0, en[ek])) return false;
      return Object.keys(en[ek] || {}).some(function (pk) {
        if (cap.indexOf(String(pk).split('/')[0]) !== -1) return false;
        if (s0 && !x0) x0 = expandPermsOf(A, d, s0);
        var h = s0 ? [].concat(s0[pk] || [], x0[pk] || []) : [];
        return (Array.isArray(en[ek][pk]) ? en[ek][pk] : []).some(function (a) { return h.indexOf(a) === -1; });
      });
    });
    var dl = isObj(o.lenses) ? o.lenses[d] : null;
    if (!bad && Array.isArray(dl) && isObj(ln)) bad = Object.keys(ln).some(function (ek) {
      var L0 = isObj(lo) ? lo[ek] : undefined, L1 = ln[ek];
      return Array.isArray(L0) && Array.isArray(L1) && L1.some(function (L) { return dl.indexOf(L) === -1 && L0.indexOf(L) === -1; });
    });
    if (bad) return { ok: false, why: 'cap' };
    if (A.u.role !== 'super') { var gw = permsGrantWhy(A, d, eo, en, to, tn, lo, ln); if (gw) return { ok: false, why: gw }; }
  }
  return { ok: true };
}
/* «فحص الصلاحيات العميق (2026-10-21)» — صاحبُ الورقة: موظفٌ عاديّ أو مدير. المديرُ مفتاحُه mgr:/gm: أو حسابُه دورُه غيرُ staff أو يحمل الشارة؛
   والحسابُ يُعرف بمفتاحه في قائمة الحسابات الكاملة (A.users) — فحسابُ gm قديمٌ مفتاحُه رقمُ هوية مديرٌ كذلك. inh: يرث سقف الوحدة حين لا ورقةَ له */
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · M-A: يُحكم على المفتاح بكلّ الحسابات التي تحمله (نشطةً ومجمَّدة) لا بأوّلها — كان حسابٌ «staff»
   مجمَّدٌ بمفتاح حامل الشارة (أو نشطٌ بمفتاح مديرِ عقدةٍ قديم) يوضع قبله في القائمة فيُحكم على المدير «موظفاً عادياً» فيضيّق عليه مديرُ الإدارة
   ولا يُرجعها. المفتاحُ مديرٌ إن حمله حسابٌ مديرٌ واحد · inh: يرث سقفَ الوحدة بلا ورقةٍ إن ورثه حسابٌ واحدٌ منها (الأشدُّ لما يصير إليه الحفظ)
   · inhAll: إن ورثه كلُّها (الأشدُّ لما كان قبله) — كما myPermsOf في 022: gm · dept · super يرثون، والموظفُ بمفتاح mgr: */
function permEkIx(A) {
  if (A.__ekIx) return A.__ekIx;
  var ix = A.__ekIx = nmap();
  (A.users || []).forEach(function (x) {
    if (!x || x.ekey == null || x.ekey === '') return;
    var k = String(x.ekey), e = ix[k] || (ix[k] = { n: 0, inh: 0, mgr: false, gids: [] });
    e.n++;
    if (x.role === 'gm') e.gids.push(String(x.gid || ''));
    else if (x.role !== 'staff' || x.mgr) e.mgr = true;
    if (x.role === 'gm' || x.role === 'dept' || x.role === 'super' || (x.role === 'staff' && isMgrKey(k))) e.inh++;
  });
  return ix;
}
function permTargetOf(A, ek) {
  ek = String(ek == null ? '' : ek);
  var e = permEkIx(A)[ek] || null, gids = e ? e.gids.slice() : [], syn = ek.slice(0, 4) === 'mgr:';
  if (ek.slice(0, 3) === 'gm:') gids.push(ek.split(':')[1] || '');
  var inh = syn || !!(e && e.inh), inhAll = syn || !!(e && e.inh === e.n);
  if (gids.length) return { kind: 'gm', gid: gids[0], gids: gids, inh: inh, inhAll: inhAll };
  if (syn || (e && e.mgr)) return { kind: 'mgr', inh: inh, inhAll: inhAll };
  return { kind: 'staff', inh: false, inhAll: false };
}
/* M5/PAR-4: غيرُ مدير النظام يكتب أوراقَ الموظفين العاديين وحدهم (وقوالبَهم وعدساتِهم ومنحَهم) — أوراقُ المديرين يكتبها مديرُ النظام أو مديرُ فرعٍ
   فوقهم (gm في نطاقه)، وورقةُ مدير عقدةٍ يكتبها مديرُ عقدةٍ أعلى منه وحده. كان مديرُ الإدارة يضيّق على مديره العام وزميله فلا يُرجعانها.
   (الجولة 2 · M-A: مفتاحٌ يحمله أكثرُ من مدير عقدة يكتبه من هو فوقهم جميعاً) */
function permTargetOk(A, ek, d) {
  var u = A.u; if (u.role === 'super') return true;
  var t = permTargetOf(A, ek);
  if (t.kind === 'staff') return true;
  /* F01: مديرُ الإدارة الأم يكتب ورقةَ مدير قسمها (مفتاحُه mgr:<القسم> أو حساباتُه كلُّها في القسم) — لا ورقةَ مديرٍ غيرِه */
  if (u.role !== 'gm') return t.kind === 'mgr' && !!d && secMgrOf(A, d) && permSecMgrEk(A, ek, d);
  if (t.kind === 'mgr') return true;
  for (var i = 0; i < t.gids.length; i++) if (!permGidBelow(A, t.gids[i], u.gid)) return false;
  return true;
}
function permSecMgrEk(A, ek, d) {
  ek = String(ek == null ? '' : ek); if (ek === 'mgr:' + d) return true;
  var hit = (A.users || []).filter(function (x) { return x && x.ekey != null && String(x.ekey) === ek; });
  return hit.length > 0 && hit.every(function (x) { return x.role === 'staff' && x.deptId === d; });
}
/* العقدةُ c تحت العقدة top تماماً (سلسلةُ الآباء في A.nodes · محدودةٌ ضدّ الدورات) */
function permGidBelow(A, c, top) {
  var seen = nmap(), n = 0;
  c = String(c == null ? '' : c); top = String(top == null ? '' : top);
  if (!c || !top || c === top) return false;
  while (c && !seen[c] && n++ < 64) {
    seen[c] = 1;
    var nd = (A.nodes || []).filter(function (x) { return x && x.id === c; })[0];
    c = nd ? String(nd.pid || '') : '';
    if (c && c === top) return true;
  }
  return false;
}
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · M-C: إطفاءُ الوحدة على مستوى المنصة (A.off) مفتاحُ تشغيلٍ لا صلاحية — يُحكم المانحُ كأنّ الوحدات
   كلَّها مشغَّلة، وإلا جهّز لموظفه وهي مطفأة ورقةً أو منحاً لا يملكه هو فيحمله الموظفُ يوم يعيد مديرُ النظام تشغيلها (والسقفُ في permsRule بلا
   إطفاءٍ أصلاً: effCapOf). نسخةٌ سطحيةٌ من الفاعل بلا الوحدات المطفأة وبلا مخابئ الحكم (__enfH · __enfT …) — ويبقى المنحُ المرفق (__grants) */
function permOnAll(A) {
  if (!A || !A.off || !A.off.length) return A;
  if (A.__onAll) return A.__onAll;
  var B = {}, k;
  for (k in A) if (k.slice(0, 2) !== '__' || k === '__grants' || k === '__ekIx') B[k] = A[k];
  B.off = [];
  return (A.__onAll = B);
}
/* N1 · M4 · M5/PAR-4: قاعدةُ المانح لغير مدير النظام في وحدةٍ يديرها — لكل صاحبِ ورقةٍ تغيّرت ورقتُه أو قالبُه أو عدساتُه:
     (أ) ليس الفاعلَ نفسَه — كانت الحمايةُ لمن له ورقةٌ مخزَّنة وحده، فحاملُ الشارة بلا ورقةٍ يكتب لنفسه سقفَ الإدارة كلَّه؛
     (ب) موظفٌ عاديّ أو مديرٌ تحت مدير فرعٍ يكتب له (permTargetOk)؛
     (ج) لا يضيف ورقةً أو فعلاً أو عدسةً لا يملكها الفاعلُ نفسُه في هذه الوحدة — كان الفحصُ لصاحب الورقة الصريحة وحده، فالمديرُ الذي يرث
         والمضيَّقُ عليه في الإنفاذ بالإسقاط يمنحان ما ليس في يدهما (ومفاتيحُ v24.9 في الإنفاذ: enfPermsHeldWhy في 059). وما كان قبل الحفظ
         يبقى بلا حكم: المانحُ يضيّق ويعدّل ما منحه غيرُه ولا يزيد عليه. والقالبُ هويةٌ لا تمنح شيئاً بنفسها — يُحكم بورقته. */
function permsGrantWhy(A, d, eo, en, to, tn, lo, ln) {
  var me = String(A.u.ekey || ''), eks = nmap(), ek, mine = null, B = permOnAll(A);
  [eo, en, to, tn, lo, ln].forEach(function (m) { if (isObj(m)) Object.keys(m).forEach(function (x) { eks[x] = 1; }); });
  var dl = ((A.perms && A.perms.lenses) || {})[d], allL = KIVO_LENS_PLUGINS.keys;
  var lensOn = function (arr, L) { return (Array.isArray(dl) ? dl.indexOf(L) !== -1 : true) && (Array.isArray(arr) ? arr.indexOf(L) !== -1 : true); };
  for (ek in eks) {
    var s0 = isObj(eo) ? eo[ek] : undefined, s1 = isObj(en) ? en[ek] : undefined, l0 = isObj(lo) ? lo[ek] : undefined, l1 = isObj(ln) ? ln[ek] : undefined;
    var chS = !deq(s0, s1), chL = !deq(l0, l1);
    if (!chS && !chL && deq(isObj(to) ? to[ek] : undefined, isObj(tn) ? tn[ek] : undefined)) continue;
    if (me && ek === me) return 'self';
    if (!permTargetOk(A, ek, d)) return 'target';
    var t = permTargetOf(A, ek);
    if (chS) {
      /* الجولة 2: ما كان بأضيق وراثةٍ (inhAll) وما يصير بأوسعها (inh) · والمانحُ وما يرثه الهدفُ كأنّ الوحدات كلَّها مشغَّلة (M-C: B) — كان
         ما في وحدةٍ مطفأةٍ يُتخطّى فيُجهَّز للموظف ما لا يملكه مانحُه */
      var was = isObj(s0) ? expandPermsOf(B, d, s0) : (t.inhAll ? capAllPermsOf(B, d) : {}), now = isObj(s1) ? expandPermsOf(B, d, s1) : (t.inh ? capAllPermsOf(B, d) : {});
      if (!mine) mine = myPermsOf(B, d);
      for (var pk in now) {
        var acts = now[pk] || [], had = was[pk] || [], have = mine[pk] || [];
        for (var i = 0; i < acts.length; i++) if (had.indexOf(acts[i]) === -1 && have.indexOf(acts[i]) === -1) return 'grant';
      }
    }
    /* L1 (الجولة 2): العدساتُ تعمل على ورقة — حذفُ ورقة موظفٍ لا يرث مع عدساته (حذفُ حسابه · clearEmpPerms · dropEmpPerms · pruneOrphanEmpPerms)
       لا يمنحه عدسة؛ كان غيابُ قائمته يُقرأ «كلَّ العدسات» فيُرفض التنظيفُ «grant» ويبقى السجلُّ اليتيم */
    if (chL && (isObj(s1) || t.inh)) for (var j = 0; j < allL.length; j++) if (lensOn(l1, allL[j]) && !lensOn(l0, allL[j]) && !KIVO_BUILD.lensGate(A.perms, A.u, d, allL[j]).on) return 'grant';
    /* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-6: ورقةٌ تُنشأ (أو تعود) لصاحبٍ لا يرث — عدساتُه قبلها لم تمنح شيئاً، فكلُّ عدسةٍ تعمل بالورقة
       الجديدة (على صفحةٍ تحملها: الخطة · الجولات) تُحكم كعدسةٍ مضافة. كان حفظان يتخطّيان الحكم: الأوّلُ يحذف الورقة ويضع العدسات (L1)، والثاني يعيد الورقة */
    if (isObj(s1) && !isObj(s0) && !t.inhAll) {
      var nowB = expandPermsOf(B, d, s1);
      for (var j2 = 0; j2 < allL.length; j2++) if (lensOn(l1, allL[j2]) && permLensHosted(nowB, allL[j2]) && !KIVO_BUILD.lensGate(A.perms, A.u, d, allL[j2]).on) return 'grant';
    }
  }
  return '';
}
/* هل تحمل الورقةُ (الموسَّعة) صفحةً تعمل عليها العدسةُ L؟ (مضيفو مفتاح lens.<L>.view في فهرس الإنفاذ — الخطة والجولات افتراضاً) */
function permLensHosted(sheet, L) {
  var hs = enfIx().hosts['lens.' + L + '.view'] || [@@SYS:enf.lens.hosts.plan@@@@SYS:enf.lens.hosts.daily@@];
  for (var i = 0; i < hs.length; i++) for (var pk in sheet) if ((pk === hs[i] || pk.indexOf(hs[i] + '/') === 0) && (sheet[pk] || []).length) return true;
  return false;
}
