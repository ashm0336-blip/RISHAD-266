async function cuRestorePermission(A, dept, opt) {
  if (!deptInScope(A, dept)) throw cuError('custody-denied', 403);
  if (opt.scope === 'full' && A.u.role !== 'super') throw cuError('custody-restore-full-super-only', 403);
  var has =
    A.u.role === 'super' || (A.enf ? enfHeld(A, dept, 'backup.restore') : KIVO_GUARDS.decide('backup.restore', permv2Ctx(A, dept)).ok);
  var policy = KIVO_BUILD.restorePolicy(A.u.role === 'super', isMgrOf(A, dept), has, opt.reason);
  if (!policy.ok || (policy.missingReason && !reasonExempt(A))) throw cuError('custody-restore-permission', 403);
}
