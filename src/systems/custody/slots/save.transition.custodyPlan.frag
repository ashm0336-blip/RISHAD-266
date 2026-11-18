,
      resource = cuKey(dept),
      observed = Object.prototype.hasOwnProperty.call(kvPlan.revs || {}, resource) ? kvPlan.revs[resource] : await cuRev(env, dept),
      supplied = Object.prototype.hasOwnProperty.call(body.base || {}, resource),
      clientBase = supplied ? body.base[resource] : undefined;
    if (supplied && (!Number.isSafeInteger(clientBase) || clientBase < 0 || clientBase !== observed))
      throw cuError('custody-conflict', 409);
    if (candidate.intent !== 'employee-delete' && !supplied) throw cuError('custody-base-required', 409);
    var marker = markers.ops[candidate.employeeKey],
      reason = (body.why || {})[candidate.employeeKey] || (marker && marker.reason) || '';
    var plan = await cuPlanCleanup(env, A, {
      dept: dept,
      base: observed,
      intent: candidate.intent,
      oldEmployees: candidate.before,
      newEmployees: candidate.after,
      reason: reason,
    });
    if (candidate.intent === 'employee-delete' && plan.checks.affectedMoves && !supplied) throw cuError('custody-base-required', 409);
    result.guards.push.apply(result.guards, plan.guards);
    result.statements.push.apply(result.statements, plan.statements);
    result.revisionKeys.push.apply(result.revisionKeys, plan.revisionKeys);
    Object.keys(plan.snapshotRows).forEach(function (table) {
      result.snapshotRows[dept + ':' + table] = plan.snapshotRows[table];
    });
