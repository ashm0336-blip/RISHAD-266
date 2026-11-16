  for (var irDept of wipeDepartments) {
    var irBase = opt.__irshadBase;
    if (!irBase) {
      irBase = {};
      IR_RES_NAMES.forEach(function (name, i) { irBase[name] = (body.base || {})[irKey(irDept, i)]; });
    }
    var irWipe = await irPlanWipe(env, A, {
      dept: irDept, base: irBase, intent: opt.__wipeKind === 'delete' ||
        !finalDepartments.some(function (d) { return d.id === irDept; }) ? 'dept-delete' : 'dept-wipe',
      reason: body.reason || '',
    });
    plan.guards.push.apply(plan.guards, irWipe.guards);
    plan.statements.push.apply(plan.statements, irWipe.statements);
    plan.revisionKeys.push.apply(plan.revisionKeys, irWipe.revisionKeys);
    plan.counts.irshad = (plan.counts.irshad || 0) + irWipe.snapshotRows.reports.length + irWipe.snapshotRows.catalogs.length + irWipe.snapshotRows.windows.length;
    Object.keys(irWipe.snapshotRows).forEach(function (kind) {
      plan.snapshots.push({ domain: 'irshad', table: irDept + ':' + kind, rows: irWipe.snapshotRows[kind] });
    });
  }
