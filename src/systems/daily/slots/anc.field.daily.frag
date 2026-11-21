/* رصد الميدان: موظف صلاحيته على المتابعة اليومية هي ورقة «رصد الميدان» وحدها (بلا كتابة على الجولات) —
   يكتب على جولة اليوم حقولَ الرصد فقط، وعلى الباب الذي يحوي مفتاحه فقط */
function dailyFieldOnly(A, d) {
  var u = A.u; if (u.role === 'super' || u.role === 'dept') return false;
  var ep = ((A.perms.emps || {})[d] || {})[u.ekey] || {}; var writes = [], field = false;
  Object.keys(ep).forEach(function (k) { if (String(k).split('/')[0] !== 'daily' || !capOnDept(A, d, k)) return; var acts = ep[k] || []; if (k === 'daily/field' && acts.length) field = true; if (k !== 'daily/field' && acts.some(function (a) { return WRITE_ACTS[a]; })) writes.push(k); });
  return field && !writes.length;
}
