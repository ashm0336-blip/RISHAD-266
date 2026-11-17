  /* Employee cleanup shares the same planner/transaction. An explicit restored
     custody candidate is its final state and must be validated by cuPlanRestore. */
  var cleaned = new Set();
  for (var ep of kv.pend) {
    if (resName(ep.k) !== 'bassam_employees_v1') continue;
    var d = parseKey(ep.k).dept;
    cleaned.add(d);
    if (
      (domains.custody || []).some(function (c) {
        return c.scope.departmentId === d;
      })
    )
      continue;
    var oldEmployees = parseJson(ep.cur, []),
      newEmployees = ep.act === 'del' ? [] : parseJson(ep.v, []);
    /* Backup replace is not the import wizard's trusted start-clean operation.
       An absent custody domain preserves history, apart from the established
       cleanup for employees actually removed. Metadata-only edits do nothing. */
    if (removedDepartments.indexOf(d) < 0 && !cuRemovedHolderKeys(oldEmployees, newEmployees).length) continue;
    var cl = await cuPlanCleanup(env, A, {
      dept: d,
      base: (body.base.custody || {})[d],
      intent: removedDepartments.indexOf(d) >= 0 ? 'dept-wipe' : 'employee-delete',
      oldEmployees: oldEmployees,
      newEmployees: newEmployees,
      reason: body.reason,
      finalKeys: keys,
    });
    plan.guards.push.apply(plan.guards, cl.guards);
    plan.statements.push.apply(plan.statements, cl.statements);
    plan.revisionKeys.push.apply(plan.revisionKeys, cl.revisionKeys);
    Object.keys(cl.snapshotRows || {}).forEach(function (n) {
      plan.snapshots.push({ domain: 'custody', table: d + ':' + n, rows: cl.snapshotRows[n] });
    });
  }
  for (var removed of removedDepartments) {
    if (cleaned.has(removed)) continue;
    var wipe = await cuPlanCleanup(env, A, {
      dept: removed,
      base: (body.base.custody || {})[removed],
      intent: 'dept-wipe',
      oldEmployees: [],
      newEmployees: [],
      reason: body.reason,
      finalKeys: keys,
    });
    await rsCustodyReceiptPreimage(env, removed, plan);
    plan.guards.push.apply(plan.guards, wipe.guards);
    plan.statements.push.apply(plan.statements, wipe.statements);
    plan.revisionKeys.push.apply(plan.revisionKeys, wipe.revisionKeys);
    Object.keys(wipe.snapshotRows || {}).forEach(function (n) {
      plan.snapshots.push({ domain: 'custody', table: removed + ':' + n, rows: wipe.snapshotRows[n] });
    });
  }
