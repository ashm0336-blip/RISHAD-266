  if (domains.custody !== undefined) {
    if (!Array.isArray(domains.custody)) rsBCFail('custody-shape');
    domains.custody = domains.custody.map(function (domain) {
      var d = domain && domain.scope && domain.scope.departmentId;
      if (typeof d !== 'string' || (scope.kind === 'full' ? deptIds.indexOf(d) < 0 : d !== source)) rsBCFail('custody-scope');
      return rsBCRemapCU(domain, d, scope.kind === 'dept' ? target : d);
    });
    var seenCU = domains.custody.map(function (d) {
      return d.scope.departmentId;
    });
    if (new Set(seenCU).size !== seenCU.length) rsBCFail('custody-duplicate');
  } else if (legacy) {
    domains.custody = deptIds.map(function (d) {
      var key = 'bsdept:' + d + ':' + CU_RESOURCE,
        doc = rsBCOwn(keys, key) ? rsBCParse(keys[key]) : { items: [], moves: [] };
      if (!rsBCOwn(keys, key)) summary.emptyDomains.push('custody:' + d);
      var domain = { version: 1, scope: { departmentId: d }, rows: cuConvert(d, doc) };
      cuValidateDomain(domain, d);
      return domain;
    });
  }
  if (legacy && domains.custody) {
    var included = new Set(
      domains.custody.map(function (d) {
        return d.scope.departmentId;
      }),
    );
    deptIds.forEach(function (d) {
      if (!included.has(d)) {
        domains.custody.push({ version: 1, scope: { departmentId: d }, rows: { items: [], issues: [], moves: [] } });
        summary.emptyDomains.push('custody:' + d);
      }
    });
  }
