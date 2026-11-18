function rsBCRemapCU(domain, source, target) {
  var original = cuValidateDomain(domain, source),
    next = { version: 1, scope: { departmentId: target }, rows: rsBCClone(original) };
  Object.keys(CU_TABLES).forEach(function (n) {
    next.rows[n].forEach(function (r) {
      r.department_id = target;
    });
  });
  cuValidateDomain(next, target);
  return next;
}
