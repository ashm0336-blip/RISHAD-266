/* ═══ V7 · د5-ح (القفل): permv2Ctx — سياقُ ترجمة الورقة (المقصوصة بسقف الإدارة) إلى مفاتيح v24.9 — يقرؤه المحرّكُ النافذ (الجائزة · 057b perm44Held)،
   الاسمُ باقٍ توافقاً · وcanRead = canReadEnf (061). حُذفت معه طبقةُ القياس الظلّية وحكمُ النظام القديم (authorize · authorizeActs · 042 authorize0). ═══ */
function permv2Ctx(A, d) {
  var c = A.__pv2 = A.__pv2 || {}; if (c[d]) return c[d];
  var sheet = myPermsOf(A, d), cut = {}, admFree = A.u.role === 'super', leaf;
  for (leaf in sheet) if ((admFree && leaf.indexOf('admin') === 0) || capOnDept(A, d, leaf)) cut[leaf] = sheet[leaf];
  var ctx = { 'super': admFree, mgr: isMgrOf(A, d), sheet: cut };
  ctx.translated = KIVO_REGISTRY.translate(cut);
  return (c[d] = ctx);
}
function canRead(A, k) { return canReadEnf(A, k); }   /* KIVO_243: القراءة من سجل v24.9 · V7 · د5-ح (القفل): وحده */

