/* ══ myPerms على الخادم — مطابقةٌ حرفية لنظيرتها في الواجهة ══════════════
   قرار تصميم مُثبَّت في هذه الجولة: role==='dept' يرث سقف إدارته دائماً، ولا
   تُطبَّق عليه ورقةُ تضييقٍ صريحة — كما في BASELINE 177 حرفاً بحرف. وتغييره
   سياسةُ منتَج لا إصلاحُ تطابقٍ أمنيّ. وقد وُضع المفتاح DEPT_SHEET أدناه كي
   يُفعَّل مستقبلاً بسطرٍ واحد بلا إعادة بناء المحرّك.
   وفي الحالين لا يتجاوز الدورُ سقفَ الإدارة ولا الوحدة المطفأة ولا سياسة
   المورد ولا قيوده الحقلية — تلك تُفحص بعد هذه الدالة لا قبلها. */
var DEPT_SHEET = false;
function myPermsOf(A, d) {
  var u = A.u;
  if (!d) return {};
  if (u.role === 'super') {
    var all = capAllPermsOf(A, d);
    all.admin = ACTS_ALL.slice();
    pgLeaves('admin').forEach(function (l) { all[l] = ACTS_ALL.slice(); });
    return all;
  }
  if (u.role === 'gm') {
    if (!deptInScope(A, d)) return {};
    return hasOwnSheetOf(A, u.ekey, d) ? empPermsOf(A, u.ekey, d) : capAllPermsOf(A, d);
  }
  if (u.deptId !== d) return {};
  if (u.role === 'dept') return (DEPT_SHEET && hasOwnSheetOf(A, u.ekey, d)) ? empPermsOf(A, u.ekey, d) : capAllPermsOf(A, d);
  if (u.role === 'staff') {
    if (isMgrKey(u.ekey) && !hasOwnSheetOf(A, u.ekey, d)) return capAllPermsOf(A, d);
    return empPermsOf(A, u.ekey, d);
  }
  return {};
}

