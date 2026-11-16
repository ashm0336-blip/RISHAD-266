  if (domains.irshad) {
    var irSeen = new Set();
    for (var irDomain of domains.irshad) {
      var irDept = irDomain && irDomain.scope && irDomain.scope.departmentId;
      if (!irDept || !finalDeptIds.has(irDept) || irSeen.has(irDept) || removedDepartments.indexOf(irDept) >= 0 ||
          (body.scope.kind === 'dept' && irDept !== dept)) throw rsError('restore-irshad-scope');
      irSeen.add(irDept);
      var ip = await irPlanRestore(env, A, irDomain, {
        dept: irDept, base: (body.base.irshad || {})[irDept], scope: body.scope.kind,
        mode: 'replace', reason: body.reason, finalKeys: keys,
      });
      if (body.mode === 'merge' && (Object.values((body.base.irshad || {})[irDept] || {}).some(function (v) { return v !== 0; }) ||
          Object.values(ip.snapshotRows).some(function (rows) { return rows.length; })))
        throw rsError('restore-merge-identity-collision', 409);
      plan.guards.push.apply(plan.guards, ip.guards);
      if (ip.changed) {
        plan.statements.push.apply(plan.statements, ip.statements);
        plan.revisionKeys.push.apply(plan.revisionKeys, ip.revisionKeys);
        Object.keys(ip.snapshotRows).forEach(function (kind) {
          plan.snapshots.push({ domain: 'irshad', table: irDept + ':' + kind, rows: ip.snapshotRows[kind] });
        });
      }
      plan.counts.irshad++;
    }
  }
