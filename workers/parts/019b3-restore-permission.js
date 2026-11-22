async function cuRestorePermission(A, dept, opt) {
  if (!deptInScope(A, dept)) throw cuError('custody-denied', 403);
  if (opt.scope === 'full' && A.u.role !== 'super') throw cuError('custody-restore-full-super-only', 403);
  var has =
    A.u.role === 'super' || enfHeld(A, dept, 'backup.restore');   /* V7 · د5-ح: المحرّكُ النافذ وحده */
  var policy = KIVO_BUILD.restorePolicy(A.u.role === 'super', isMgrOf(A, dept), has, opt.reason);
  if (!policy.ok || (policy.missingReason && !reasonExempt(A))) throw cuError('custody-restore-permission', 403);
}
