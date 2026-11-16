  if (domains.irshad !== undefined) {
    if (!Array.isArray(domains.irshad)) rsBCFail('irshad-shape');
    domains.irshad = domains.irshad.map(function (domain) {
      var d = domain && domain.scope && domain.scope.departmentId;
      if (typeof d !== 'string' || (scope.kind === 'full' ? deptIds.indexOf(d) < 0 : d !== source)) rsBCFail('irshad-scope');
      return rsBCRemapIR(domain, d, scope.kind === 'dept' ? target : d);
    });
    if (new Set(domains.irshad.map(function (d) { return d.scope.departmentId; })).size !== domains.irshad.length) rsBCFail('irshad-duplicate');
  } else if (legacy || file.manifest.version === 1) {
    domains.irshad = deptIds.map(function (d) {
      var docs = {};
      IR_RES_NAMES.forEach(function (name, i) {
        var key = irKey(d, i);
        if (rsBCOwn(keys, key)) docs[name] = rsBCParse(keys[key]);
      });
      if (!Object.keys(docs).length) summary.emptyDomains.push('irshad:' + d);
      return irValidateDomain(irConvert(d, docs), d);
    });
  }
