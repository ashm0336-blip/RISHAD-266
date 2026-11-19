/* مَن يملك أفعال الكتابة كلها على هذا المورد لا يحتاج تصنيفاً: أيّاً كانت
   العملية فهي في يده. يوفّر هذا مقارنةَ فرقٍ كاملة على القيم الكبيرة في
   المسار الأكثر شيوعاً (المدير يحفظ جدولاً أو خطة) فلا تُزاد كلفة CPU. */
function holdsAllWrites(A, key, R) {
  var need = ['add', 'edit', 'del'], O = opsOf(key);
  if (O && O.approve) need.push('approve');
  for (var i = 0; i < need.length; i++) if (!authorize(A, key, need[i]).ok) return false;
  return true;
}
/* هل يملك الفاعل هذه الأفعال كلها على ورقةٍ بعينها؟ */
function actsHeldOn(A, d, cap, acts) {
  if (A && A.u && A.u.role === 'super') return true;   /* V7 · د1-ج (قرار صاحب المنصة): مدير المنصة بلا قيد صلاحية — قبل السقف والوحدات المطفأة والعدسة والأوراق */
  if (!capOnDept(A, d, cap)) return false;
  var have = myPermsOf(A, d)[cap] || [];
  for (var i = 0; i < acts.length; i++) if (have.indexOf(acts[i]) === -1) return false;
  return true;
}

