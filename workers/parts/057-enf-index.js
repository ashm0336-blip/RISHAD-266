/* ══ (1) فهارسُ السجل — تُبنى مرّةً لكل نسخةٍ من الخادم ══ */
var ENF_IX = null;
var ENF_LEAF_RE = /^([A-Za-z]+(?:\/[A-Za-z]+)?):(view|add|edit|del|approve|export)$/;
/* D-19 (v24.3 F-14): كاتبُ رصد الميدان يستهلك status.change على العناصر المسنَدة إليه فقط — بنطاق Assigned الذي يفرضه المحرّك (fieldOnly) */
var ENF_DERIVE = { 'field.view': ['lens.zones.status.change', 'lens.gates.status.change', 'lens.marks.status.change'] };
/* RISHAD-266 · V7 P3-sec — «المسنَد فقط» للراصد أياً كان مصدرُ المنح. كان حصرُ Assigned يُحسب من الورقة المخزَّنة وحدها (018 dailyFieldOnly):
   من جاءه field.view بمنحٍ صريح (bassam_grants_v1 — بلا ورقة) ومعه عرضُ «الجولات» أو «التشغيل الميداني» عومل كمشرفٍ بلا حصر، فكتب
   حالةَ عناصرَ غيرِ مسنَدةٍ إليه (القبولُ الحيّ لـV7 P3). القاعدة:
     • ورقةٌ مخزَّنةٌ فيها daily/field ⇒ حكمُها كما كان حرفاً (dailyFieldOnly) — الراصدُ والمشرفُ صاحبا الورقة لا يتغيّر لهما شيء.
     • وإلا: حاملُ field.view بمنحٍ صريح محصورٌ بالمسنَد إليه ما لم يحمل كتابةً صريحةً غيرَ مشتقّة على الجولات أو عدساتها
       (ENF_FIELD_LIFT — كتابةُ المشرف اليوم) — مفاتيحُ العرض الأخرى لا ترفع الحصر، والمشتقّةُ الثلاثة (ENF_DERIVE) ليست كتابةً صريحة.
     • مسؤولُ المنصة · حسابُ الإدارة · المديرُ الوارث (بلا منحٍ صريح لـfield.view): غيرُ محصورين كما كانوا.
   في الوضع القديم لا سجلَّ منحٍ مرفقاً ⇒ الورقةُ وحدها كما كانت. */
var ENF_FIELD_LIFT = null;
function enfFieldLift() {
  if (ENF_FIELD_LIFT) return ENF_FIELD_LIFT;
  var R = KIVO_REGISTRY, out = [], der = {}, s, i, k, e;
  for (s in ENF_DERIVE) for (i = 0; i < ENF_DERIVE[s].length; i++) der[ENF_DERIVE[s][i]] = 1;
  for (i = 0; i < R.keys.length; i++) {
    k = R.keys[i]; e = R.byKey[k];
    if (!e || e.status !== 'active' || der[k] || k.indexOf('ref.') === 0) continue;
    if (e.type === 'access' || e.type === 'view' || e.type === 'capability') continue;
    if (e.owner === 'daily/rounds' || e.ownerKind === 'lens') out.push(k);
  }
  return (ENF_FIELD_LIFT = out);
}
function enfFieldOnly(A, d) {
  var u = A && A.u; if (!u || !d || u.role === 'super' || u.role === 'dept') return false;
  var ep = ((A.perms.emps || {})[d] || {})[u.ekey] || {};
  if ((ep['daily/field'] || []).length && capOnDept(A, d, 'daily/field')) return dailyFieldOnly(A, d);   /* الورقةُ المخزَّنة تحكم كما كانت */
  /* V7 sec (fail-closed): تعذُّرُ قراءة سجلّ المنح له حالتان. الوضعُ القديم (لا A.enf): لا سجلَّ منحٍ بالتصميم ⇒ الورقةُ وحدها كما كانت (غيرُ محصور).
     وضعُ الإنفاذ (A.enf): السجلُّ يُرفق دائماً عند إنشاء الفاعل، فغيابُه أو عطلُ قراءته خطأٌ حقيقي ⇒ محصورٌ بالمسنَد (لا يُفتح الحصرُ بخطأ) */
  var g; try { g = enfGrantOf(A, d); } catch (e0) { return !!A.enf; }
  if (!g.plus['field.view'] || !enfHeld(A, d, 'field.view')) return false;
  var L = enfFieldLift(), i;
  for (i = 0; i < L.length; i++) if (enfHeld(A, d, L[i])) return false;                                  /* كتابةٌ صريحةٌ غيرُ مشتقّة ⇒ بلا حصر، كالمشرف */
  return true;
}
/* D3-01 / §14.2: ربطُ approve → retro.open توافقٌ مؤقّت ينتهي عند ترحيل الصلاحيات (المنحُ الصريح وحده بعده) */
var ENF_COMPAT = { 'ir.rec.retro.open': 'irshad/records:approve', 'sz.rec.retro.open': 'seized/records:approve' };
/* KIVO_265 · قرارُ المالك 2026-10-20 («هذا الإجراء يتطلب سبباً … لا أرغب بها، أزلها»): تغييرُ حالة عناصر الخطة التشغيلية من «التشغيل الميداني»
   (المصلى · البوابة · المعلم · المسار — حقولُ الحالة: fst · flow · closed · off …) لم يعد يطلب سبباً إلزامياً. الصلاحيةُ والنطاقُ يُحكمان كما كانا،
   والفعلُ يُسجَّل في سجل التدقيق كما كان؛ السببُ وحده لم يعد شرطاً للحفظ. المرجعُ v24.9 (audit.reason في السجلّ) لا يُمسّ — الاستثناءُ هنا في فهرس الإنفاذ.
   باقيةٌ بسببها: رفعُ الخريطة واستبدالُها (map.replace) · إعادةُ فتح الخطة المعتمدة (plan.reopen) · وسائرُ مفاتيح السبب */
var ENF_REASON_OFF = { 'lens.zones.status.change': 1, 'lens.gates.status.change': 1, 'lens.marks.status.change': 1, 'lens.paths.status.change': 1 };
/* KIVO_259 · AUD-030 (ADR-018): عدسةُ مفتاحٍ من الإضافات (KIVO_LENS_PLUGINS) — للعدسات الجديدة خارج المرجع v24.9 (KIVO_BUILD.LENSES)؛
   المضمَّنةُ يعيدها المرجعُ نفسُه أولاً فلا يتغيّر شيءٌ لها. بوابةُ عدسة الإضافة = بوابةُ المرجع (KIVO_BUILD.lensGate عامّةٌ لأيّ عدسة). */
function enfPlugLensOf(key) { var m = /^lens\.([a-z]+)\./.exec(String(key || '')); return m && KIVO_LENS_PLUGINS.keys.indexOf(m[1]) !== -1 ? m[1] : null; }
function enfIx() {
  if (ENF_IX) return ENF_IX;
  var R = KIVO_REGISTRY, ix = { lens: {}, reason: {}, sens: {}, leaf: {}, hosts: {}, superOnly: {}, needMgr: {}, atomless: {}, selfK: {}, roleK: {}, byRes: {}, write: {}, order: [], pos: {} }, i, j;
  var atomT = {}, a;
  for (a in R.atoms) { var at = R.atoms[a]; for (j = 0; j < at.targets.length; j++) atomT[at.targets[j]] = 1; }
  for (i = 0; i < R.keys.length; i++) {
    var key = R.keys[i], e = R.byKey[key];
    ix.pos[key] = ix.order.length; ix.order.push(key);
    if (e.status !== 'active') continue;
    var L = KIVO_BUILD.lensOf(key) || enfPlugLensOf(key); if (L) ix.lens[key] = L;
    if (e.audit && e.audit.reason && !ENF_REASON_OFF[key]) ix.reason[key] = 1;
    if (e.sensitive) ix.sens[key] = 1;
    if (e.grant === 'self') ix.selfK[key] = 1;
    if (e.grant === 'role') ix.roleK[key] = 1;
    if (e.type !== 'view' && e.type !== 'access') ix.write[key] = 1;
    var am = e.asisMap || [], leaves = [];
    for (j = 0; j < am.length; j++) {
      var s = String(am[j]);
      if (s === 'role:super') ix.superOnly[key] = 1;
      else if (s === 'role:mgr') ix.needMgr[key] = 1;
      else { var m = ENF_LEAF_RE.exec(s); if (m && leaves.indexOf(m[1]) === -1) leaves.push(m[1]); }
    }
    if (!atomT[key]) ix.atomless[key] = 1;
    var o = R.owners[e.owner];
    if (e.ownerKind === 'page') ix.leaf[key] = e.owner;
    else if (e.ownerKind === 'reference') ix.leaf[key] = (o && o.managedIn) || leaves[0] || '';
    else if (e.ownerKind === 'lens') ix.hosts[key] = leaves.length ? leaves : ['plan', 'daily/rounds'];
    var rs = (e.guard && e.guard.resources) || [];
    for (j = 0; j < rs.length; j++) (ix.byRes[rs[j]] = ix.byRes[rs[j]] || []).push(key);
  }
  ENF_IX = ix; return ix;
}
/* سقفُ العدسة للإدارة: perms.lenses[d] (غيابُه = كلُّ العدسات — نصُّ الواجهة نفسُه) */
function enfLensDeptOn(A, d, L) { var dl = ((A.perms && A.perms.lenses) || {})[d]; return Array.isArray(dl) ? dl.indexOf(L) !== -1 : true; }
/* Department Ceiling: المفتاحُ داخل سقف الإدارة؟ (صفحتُه/ورقتُه على السقف · مضيفُ العدسة على السقف ∧ العدسةُ في سقف الإدارة)
   — لا يتجاوزه أحدٌ ولو مُنح صراحةً؛ والإعداداتُ لمدير النظام دائماً (admFree كما في AS‑IS) */
function enfKeyOnCeiling(A, d, key) {
  var ix = enfIx(), e = KIVO_REGISTRY.byKey[key];
  if (!e || e.status !== 'active') return false;
  if (e.ownerKind === 'platform') return true;
  if (ix.hosts[key]) {
    var L = ix.lens[key]; if (L && !enfLensDeptOn(A, d, L)) return false;
    var hs = ix.hosts[key]; for (var i = 0; i < hs.length; i++) if (capOnDept(A, d, hs[i])) return true;
    return false;
  }
  var leaf = ix.leaf[key]; if (!leaf) return true;
  if (A.u.role === 'super' && leaf.indexOf('admin') === 0) return true;
  return capOnDept(A, d, leaf);
}
/* ترجمةُ الورقة الحالية (ذرّاتُ AS‑IS المقصوصة بسقف الإدارة) إلى مفاتيح v24.9 — طبقةُ التوافق نفسُها التي قاسها الظلّ (permv2Ctx) */
function enfTranslated(A, d) {
  var c = A.__enfT || (A.__enfT = {}); if (c[d]) return c[d];
  var sheet = myPermsOf(A, d), cut = {}, admFree = A.u.role === 'super', leaf;
  for (leaf in sheet) if ((admFree && leaf.indexOf('admin') === 0) || capOnDept(A, d, leaf)) cut[leaf] = sheet[leaf];
  var T = KIVO_REGISTRY.translate(cut), src;
  for (src in ENF_DERIVE) if (T.keys[src]) for (var i = 0; i < ENF_DERIVE[src].length; i++) T.keys[ENF_DERIVE[src][i]] = true;
  return (c[d] = T);
}
/* المنحُ الصريح (Permission Migration · perm.assign) — سجلٌّ مستقلٌّ لكل إدارة: bsdept:<d>:bassam_grants_v1 = { v: 1, emp: { <ekey>: { plus: [مفاتيح], minus: [مفاتيح] } } }
   plus يضيف مفتاحاً لا ذرّةَ له في الورقة (to-build: backup.restore · retro.open …) · minus يُسقط مفتاحاً ترجمته الورقة (تضييقٌ دقيق).
   خارجَ bassam_perms_v1 عمداً: الواجهةُ القديمة تعيد كتابة الصلاحيات بأقسامها المعروفة فقط — فلو سكن المنحُ فيها لمحاه حفظُ مدير النظام
   ولرفض النظامُ القديم حفظَ مدير الإدارة بعد الرجوع (Kill Switch)؛ ومستقلاً يبقى الرجوعُ عن ترحيله لا يمسّ أوراقَ الصلاحيات. والمفتاحُ مجهولٌ
   للنظام القديم (RES_REG) فلا يقرؤه ولا يكتبه أحدٌ فيه — عدا قراءة مدير النظام الشاملة كما لكل مفتاح. */
var ENF_GRANTS_RES = 'bassam_grants_v1';
function enfGrantsKey(d) { return 'bsdept:' + d + ':' + ENF_GRANTS_RES; }
function enfGrantRec(raw) { var v = typeof raw === 'string' ? parseJson(raw, null) : raw; return isObj(v) && isObj(v.emp) ? v : null; }
/* يُرفق المنحُ بالفاعل عند إنشائه في وضع الإنفاذ: قراءةٌ واحدة لسجلات إداراته (مديرُ النظام لا يحتاجها) — وغيابُ الإرفاق ⇒ رفض (fail-closed) */
async function enfAttachGrants(env, A) {
  var out = {}, ds = A.u.role === 'super' ? [] : enfDeptsOf(A), i, j;
  for (i = 0; i < ds.length; i += 80) {
    var part = ds.slice(i, i + 80), ph = part.map(function (x, n) { return '?' + (n + 1); }).join(', ');
    var stmt = env.DB.prepare('SELECT k, v FROM kv WHERE k IN (' + ph + ') ORDER BY k, seq');
    var r = await stmt.bind.apply(stmt, part.map(enfGrantsKey)).all();
    var acc = {}; ((r && r.results) || []).forEach(function (row) { acc[row.k] = (acc[row.k] || '') + row.v; });
    for (j = 0; j < part.length; j++) out[part[j]] = enfGrantRec(acc[enfGrantsKey(part[j])] == null ? null : acc[enfGrantsKey(part[j])]);
  }
  A.__grants = out; return A;
}
function enfAttachGrantsKeys(A, keys) {
  var out = {}, ds = A.u.role === 'super' ? [] : enfDeptsOf(A), i;
  for (i = 0; i < ds.length; i++) out[ds[i]] = enfGrantRec(keys ? keys[enfGrantsKey(ds[i])] : null);
  A.__grants = out; return A;
}
function enfGrantOf(A, d) {
  var c = A.__enfG || (A.__enfG = {}); if (c[d]) return c[d];
  if (!A.__grants) throw new Error('enf-grants-not-attached');
  var ek = A.u.ekey ? String(A.u.ekey) : '', rec = A.__grants[d], g = ek && rec ? rec.emp[ek] : null, out = { plus: {}, minus: {}, has: false }, i;
  if (isObj(g)) {
    out.has = true;
    if (Array.isArray(g.plus)) for (i = 0; i < g.plus.length; i++) out.plus[String(g.plus[i])] = 1;
    if (Array.isArray(g.minus)) for (i = 0; i < g.minus.length; i++) out.minus[String(g.minus[i])] = 1;
  }
  return (c[d] = out);
}
function enfPermMigrated(A) { return !!(A && A.enf && A.enf.perm && A.enf.perm.applied); }
/* هل يحمل الفاعلُ المفتاحَ في الإدارة d؟ (سقف الإدارة ∧ بوابة العدسة ∧ الدور ∧ الترجمة/المنح الصريح − الإسقاط) */
function enfHeld(A, d, key) {
  if (!A || !A.u) return false;
  var c = A.__enfH || (A.__enfH = {}), dk = d || '', m = c[dk] || (c[dk] = {});
  if (m[key] !== undefined) return m[key];
  var v = false; try { v = enfHeld0(A, dk, key); } catch (e) { v = false; }
  return (m[key] = v);
}
function enfHeld0(A, d, key) {
  var R = KIVO_REGISTRY, e = R.byKey[key], ix = enfIx(), u = A.u;
  if (!e || e.status !== 'active') return false;                         /* محجوزٌ أو مجهول: Default Deny */
  if (e.grant === 'self') return true;                                    /* قواعدُ الذات تُطبَّق تلقائياً — بنطاق Own في المحرّك */
  var sup = u.role === 'super';
  if (ix.superOnly[key]) return sup;
  /* AD-7 (F01): مفتاحُ دور الإدارة (role:mgr) على وحدة بيانات وحدها — ومديرُ النظام معهم */
  if (e.grant === 'role') return ix.needMgr[key] ? (!!d && isUnitId(A, d) && isMgrOf(A, d)) : sup;
  if (!d) return false;
  /* …وكلُّ مفتاحٍ بعدها: لا مفتاحَ على عقدةٍ فوقية ولا معرّفٍ مجهول لأحد (gm على عقدةٍ كان يحمل على العقدة تحتها مفاتيحَ الوحدة) */
  if (!isUnitId(A, d)) return false;
  if (!sup && !deptInScope(A, d)) return false;
  if (!enfKeyOnCeiling(A, d, key)) return false;
  var L = ix.lens[key];
  if (L) {                                                               /* D3-04: Ceiling ∧ Employee Lens Assignment — enable بوابةٌ لا تمنح العملية */
    var g = KIVO_BUILD.lensGate(A.perms, u, d, L);
    if (!g.on) return false;
    if (key === 'lens.' + L + '.enable') return true;
  }
  if (sup) return true;
  if (ix.needMgr[key] && !isMgrOf(A, d)) return false;
  if (ix.needMgr[key] && ix.atomless[key]) return true;                   /* perm.assign: الدورُ (مدير الإدارة) — الوسمُ النصّي في asisMap ليس ذرّة */
  var G = enfGrantOf(A, d);
  if (G.minus[key]) return false;
  if (G.plus[key]) return e.grant === 'assignable';
  var T = enfTranslated(A, d);
  if (!T.keys[key]) return false;
  if (ENF_COMPAT[key] && enfPermMigrated(A)) return false;              /* انتهى التوافقُ المؤقّت: المفتاحُ الصريحُ وحده */
  return true;
}
/* وحدةٌ عُرِّفت أثناء الحفظة (018 unitBatchAdd): تُسقط ذاكرةُ أحكامها — حُكم عليها قبلُ بأنها ليست وحدة */
function enfMemoDrop(A, d) {
  if (!A) return;
  if (A.__enfH) delete A.__enfH[d];
  if (A.__enfT) delete A.__enfT[d];
  if (A.__enfG) delete A.__enfG[d];
  if (A.__enfV) for (var vk in A.__enfV) if (vk.indexOf(d + '|') === 0) delete A.__enfV[vk];
}
/* هل يحمل الفاعلُ أيَّ مفتاحٍ كتابيٍّ في الإدارة؟ (الراياتُ التقنية rule:'tech' · رفعُ صورةٍ جديدة · صورةٌ مربوطةٌ برايةٍ تقنية)
   RISHAD-266 · V7-C (قرارُ المالك — الخيار 1): مفتاحُ النوع capability (lens.<L>.enable) بوابةٌ لا كتابة — enfHeld0 يجيب عنه «محمول» متى فُتحت
   بوابةُ العدسة أياً كانت الورقة، فكان صاحبُ ورقة العرض فقط، ومن لا ورقةَ له أصلاً، «كاتباً» في كل وحدةٍ على سقفها مضيفُ عدسة (plan · daily/rounds):
   يكتب الراياتِ التقنية ويرفع صورةً جديدة. يُستثنى هنا كما يستثنيه enfFieldLift؛ ومفاتيحُ الراصد المشتقّة من field.view (status.change — نوعها
   operation) تُعدّ كتابةً فقط حين يُرفع الحصر (enfDerivedBare أدناه — قرار المالك: الراصد المحصور ليس كاتباً، كما في الوضع القديم). الوضعُ القديم لا يمرّ من هنا (018 anyWriter · 044 · 054) فلا يتغيّر فيه شيء. */
function enfAnyWriterDept(A, d) {
  if (A.u.role === 'super') return true;
  var ix = enfIx(), R = KIVO_REGISTRY.byKey, dv = enfDerivedBare(A, d), k; for (k in ix.write) if (!ix.selfK[k] && R[k].type !== 'capability' && !(dv && dv[k]) && enfHeld(A, d, k)) return true;
  return false;
}
/* RISHAD-266 · V7-D (قرارُ المالك: «الراصد في enforce لا يستبدل ولا يحذف صور الخطة والجولات، كما في legacy»): المفاتيحُ الثلاثة المشتقّة من field.view
   (ENF_DERIVE — status.change) كتابةُ حالةِ العنصر المسنَد وحدها، وليست كتابةً للمورد: كان enfResWriter يجيب بها «يكتب الخطة والجولات» فيستبدل الراصدُ
   ويحذف أيَّ صورةٍ مربوطةٍ بهما (خريطة الموقع)، وكان enfAnyWriterDept يعدّه بها «كاتباً» فيكتب الراياتِ التقنية ويرفع صورةً جديدة — والوضعُ القديم يرفض ذلك كلَّه.
   القاعدةُ هي قاعدةُ الحصر نفسُها (enfFieldOnly · enfFieldLift) لا قاعدةٌ موازية: المشتقّةُ لا تُحسب «كتابةَ مورد» إلا لمن رُفع عنه الحصر — غيرُ محصورٍ بالمسنَد
   ويحمل كتابةً صريحةً غيرَ مشتقّة على الجولات أو عدسة (مفتاحُ رفعٍ من enfFieldLift — كتابةُ المشرف) · ومسؤولُ المنصة وحسابُ الإدارة كما كانا.
   يعيد خريطةَ المشتقّة حين لا تُحسب، وnull حين تُحسب. تعذُّرُ قراءة المنح ⇒ لا تُحسب (fail-closed). حالةُ العناصر المسنَدة نفسُها (059 enfDecide) لا تمرّ من هنا. */
var ENF_DERIVED = null;
function enfDerivedBare(A, d) {
  var u = A && A.u; if (!u || u.role === 'super' || u.role === 'dept') return null;
  var s, i;
  if (!ENF_DERIVED) { ENF_DERIVED = {}; for (s in ENF_DERIVE) for (i = 0; i < ENF_DERIVE[s].length; i++) ENF_DERIVED[ENF_DERIVE[s][i]] = 1; }
  try {
    if (!enfFieldOnly(A, d)) { var L = enfFieldLift(); for (i = 0; i < L.length; i++) if (enfHeld(A, d, L[i])) return null; }
  } catch (e0) { /* تعذّرت قراءةُ المنح ⇒ المشتقّةُ لا تُحسب */ }
  return ENF_DERIVED;
}
function enfAnyWriter(A) {
  var u = A.u; if (u.role === 'super') return true;
  if (u.role === 'gm') { for (var i = 0; i < (A.depts || []).length; i++) { var dd = A.depts[i]; if (dd && deptInScope(A, dd.id) && enfAnyWriterDept(A, dd.id)) return true; } return false; }
  return !!u.deptId && enfAnyWriterDept(A, u.deptId);
}
/* مفاتيحُ كتابةِ موردٍ بعينه (لصاحب الصورة · رقمُ المراجعة بلا قيمة) */
function enfResWriter(A, d, rn) {
  var ks = enfIx().byRes[rn] || [], i;
  for (i = 0; i < ks.length; i++) if (enfIx().write[ks[i]] && !enfIx().selfK[ks[i]] && enfHeld(A, d, ks[i])) return true;
  return false;
}
/* V7-D: كاتبُ موردِ الصورة — enfResWriter بلا المشتقّة من field.view لمن لم يُرفع عنه الحصر (enfDerivedBare)
   RISHAD-266 · V7-E (قرارُ المالك: «المشرف وخريطة الخطة في enforce: يُمنع كما في legacy»): مفاتيحُ العدسات تذكر في السجلّ الموردَين معاً
   (guard.resources: bassam_plan_v1 + bassam_rounds_v1 — عناصرُ العدسة تسكن الخطة وتُنسخ في الجولة)، وكتابةُ «الجولات» وحدها تُترجَم إليها
   (asisMap daily/rounds:edit). فكان صاحبُ كتابةِ الجولات وحدها — ورقةُ المشرف · منحُ round.edit مع مفاتيح الحالة · مفتاحُ عدسةٍ واحد — «كاتباً للخطة»
   فيستبدل ويحذف الصورةَ المربوطة بها (خريطة الموقع)، والوضعُ القديم يرفض: الصورةُ تتبع كتابةَ سجلّها، وسجلُّ الخطة تكتبه ورقةُ الخطة وحدها
   (023 RES_REG cap → 054 imgWriteOk → authorize)، وحفظُ السجلّ نفسِه بخريطةٍ أخرى مرفوضٌ لهم أصلاً (059 enfDecide: map.replace).
   القاعدة: مفتاحُ عدسةٍ تستضيفه ورقةُ «الجولات» (ix.hosts — أي تمنحه كتابةُ الجولات وحدها) كتابةُ عناصر العدسة من جهة الجولات، لا كتابةُ صورة السجلّ؛
   فلا يُحسب لصورة موردٍ إلا إذا كانت ورقةُ «الجولات» من الأوراق التي تكتب ذلك المورد (الأوراقُ نفسُها التي يسألها الوضع القديم: capForAct).
   صورةُ الخطة تحتاج إذن مفتاحاً لا تمنحه الجولات: من ورقة الخطة نفسِها (site.edit · map.replace … — ما تُترجَم إليه ورقةُ خطةٍ فيها كتابة) أو مفتاحَ عدسةٍ
   مضيفُه الخطةُ وحدها (lens.gates.geometry.edit · lens.dens.threshold.configure — كما كانا). صورةُ الجولات لا يتغيّر فيها شيءٌ لأحد، ولا كتابةُ السجلّين،
   ولا الوضعُ القديم. تعذُّرُ قراءة المنح ⇒ enfHeld يرفض (fail-closed). */
function enfImgResWriter(A, d, rn) {
  var ix = enfIx(), ks = ix.byRes[rn] || [], dv = enfDerivedBare(A, d), R = RES_REG[rn], i;
  var rnd = !!R && capForAct(R, 'edit').concat(capForAct(R, 'add')).indexOf('daily/rounds') !== -1;
  for (i = 0; i < ks.length; i++) if (ix.write[ks[i]] && !ix.selfK[ks[i]] && !(dv && dv[ks[i]]) && (rnd || !(ix.hosts[ks[i]] && ix.hosts[ks[i]].indexOf('daily/rounds') !== -1)) && enfHeld(A, d, ks[i])) return true;
  return false;
}
/* إدارات الفاعل التي يُحكم فيها على الموارد المنصّية (الإحصائيات): إداراتُه في نطاقه — كما dsDepts في AS‑IS */
function enfHeldAnyDept(A, key) {
  if (A.u.role === 'super') return true;
  var ds = dsDepts(A), i; for (i = 0; i < ds.length; i++) if (enfHeld(A, ds[i], key)) return true;
  return false;
}
