  for (var irRemoved of removedDepartments) {
    var irWipe = await irPlanWipe(env, A, {
      dept: irRemoved, base: (body.base.irshad || {})[irRemoved], intent: 'dept-delete',
      reason: body.reason, finalKeys: keys,
    });
    plan.guards.push.apply(plan.guards, irWipe.guards);
    plan.statements.push.apply(plan.statements, irWipe.statements);
    plan.revisionKeys.push.apply(plan.revisionKeys, irWipe.revisionKeys);
    Object.keys(irWipe.snapshotRows).forEach(function (kind) {
      plan.snapshots.push({ domain: 'irshad', table: irRemoved + ':' + kind, rows: irWipe.snapshotRows[kind] });
    });
  }
