/* ═══ V7 · د5-هـ (44): طبقةُ القياس الظلّية PERMV2 (R193 · Phase 1 — عدّادُ «حكمُ السجلّ v24.9 بجانب القديم» في authorize · canRead · /api/permv2) حُذفت:
   لم تحكم يوماً. يبقى هنا ما يحكم: authorize · canRead · authorizeActs (حكمُ النظام القديم كما هو حرفاً) و permv2Ctx — سياقُ ترجمة الورقة إلى مفاتيح v24.9
   الذي تقرؤه أحكامٌ حيّة بالوضع القديم (019b3 · 019u · 047 · الجائزة · المهام · 057b perm44Held) — الاسمُ باقٍ توافقاً. ═══ */
function permv2Ctx(A, d) {
  var c = A.__pv2 = A.__pv2 || {}; if (c[d]) return c[d];
  var sheet = myPermsOf(A, d), cut = {}, admFree = A.u.role === 'super', leaf;
  for (leaf in sheet) if ((admFree && leaf.indexOf('admin') === 0) || capOnDept(A, d, leaf)) cut[leaf] = sheet[leaf];
  var ctx = { 'super': admFree, mgr: isMgrOf(A, d), sheet: cut };
  ctx.translated = KIVO_REGISTRY.translate(cut);
  return (c[d] = ctx);
}
function authorize(A, key, act) { return authorize0(A, key, act); }
function canRead(A, k) {
  k = resReadAs(k);                                                            /* V7 · د5-ح (13): أرشيفُ الجولات بسياسة الجولات (023 RES_READ_AS) */
  if (A && A.enf) return canReadEnf(A, k);                                    /* KIVO_243: القراءة من سجل v24.9 */
  return canRead0(A, k);
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

