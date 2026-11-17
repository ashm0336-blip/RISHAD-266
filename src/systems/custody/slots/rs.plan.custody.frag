  if (domains.custody) {
    if (!Array.isArray(domains.custody)) throw rsError('restore-custody-shape');
    var seenDept = new Set();
    for (var cd of domains.custody) {
      var d = cd && cd.scope && cd.scope.departmentId;
      if (!d || !finalDeptIds.has(d) || seenDept.has(d) || removedDepartments.indexOf(d) >= 0 || (body.scope.kind === 'dept' && d !== dept))
        throw rsError('restore-custody-scope');
      seenDept.add(d);
      var cp = await cuPlanRestore(env, A, cd, {
        dept: d,
        base: (body.base.custody || {})[d],
        scope: body.scope.kind,
        mode: 'replace',
        reason: body.reason,
        finalKeys: keys,
      });
      if (
        body.mode === 'merge' &&
        ((body.base.custody || {})[d] !== 0 ||
          Object.values(cp.snapshotRows).some(function (rows) {
            return rows.length;
          }))
      )
        throw rsError('restore-merge-identity-collision', 409);
      var snapshotStart = plan.snapshots.length,
        receiptRows = await rsCustodyReceiptPreimage(env, d, plan),
        emptyUnchanged =
          receiptRows === 0 &&
          Object.keys(cp.snapshotRows).every(function (n) {
            return cp.snapshotRows[n].length === 0 && cd.rows[n].length === 0;
          });
      plan.guards.push.apply(plan.guards, cp.guards);
      if (!emptyUnchanged) {
        plan.statements.push.apply(plan.statements, cp.statements);
        plan.revisionKeys.push.apply(plan.revisionKeys, cp.revisionKeys);
        Object.keys(cp.snapshotRows || {}).forEach(function (n) {
          plan.snapshots.push({ domain: 'custody', table: d + ':' + n, rows: cp.snapshotRows[n] });
        });
      } else plan.snapshots.splice(snapshotStart);
      plan.counts.custody++;
    }
  }
