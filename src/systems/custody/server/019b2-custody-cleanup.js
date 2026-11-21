async function cuCleanupPermission(env, A, dept, intent, oldEmployees, newEmployees, moves, reason) {
  if (!deptInScope(A, dept)) throw cuError('custody-denied', 403);
  if (intent === 'dept-wipe' && A.u.role !== 'super') throw cuError('custody-denied', 403);
  var live = cuLiveEmployees(newEmployees),
    ctx = { emps: { live: live }, empsEmpty: newEmployees.length === 0 },
    key = cuKey(dept);
  var before = {
      items: [{ name: 'CLEANUP_WITNESS', qty: 0 }],
      moves: moves.map(function (r, i) {
        return { t: r.kind, eid: r.holder_key, item: 'CLEANUP_WITNESS', ser: 'W-' + i, y: r.hijri_year, m: r.hijri_month, d: r.hijri_day };
      }),
    },
    after = { items: before.items, moves: [] };
  // Preserve the classifier's distinction between deleting selected holders and
  // clearing a complete ledger, without serializing unrelated real history.
  if (intent === 'employee-delete' && before.moves.length) {
    var survivor = '__custody_cleanup_witness__';
    while (
      live[survivor] ||
      moves.some(function (r) {
        return r.holder_key === survivor;
      })
    )
      survivor += '_';
    live[survivor] = 1;
    var unchanged = { t: 'out', eid: survivor, item: 'CLEANUP_WITNESS', ser: 'W-SURVIVOR', y: 1448, m: 1, d: 1 };
    before.moves.push(unchanged);
    after.moves = [unchanged];
  }
  if (intent === 'employee-delete' && before.moves.length && !custodyGoneOk(before, after, ctx))
    throw cuError('custody-cleanup-live-holder', 409);
  var set = {},
    keys = {},
    why = {};
  set[key] = JSON.stringify(after);
  keys[key] = 1;
  why[key] = String(reason || '');
  /* V7 · د5-ح (القفل): المحرّكُ النافذ وحده */
  var ops = {};
  if (intent === 'import-replace') ops[key] = { op: 'import.run', mode: 'replace', reason: String(reason || '') };
  var markers = KIVO_BUILD.markers(ops, keys),
    X = await enfSavePrep(env, A, { why: why }, set, [], keys, markers, null, false, false, {}, {});
  ctx.enf = enfCtxFor(X, key, dept);
  if (intent === 'import-replace') ctx.enf.imp = true;
  if (X.batchDeny) throw cuError('custody-denied', 403);
  if (!before.moves.length) {
    var held = intent === 'import-replace'
      ? enfHeld(A, dept, 'import.replace')
      : enfHeld(A, dept, 'emp.record.delete') || enfHeld(A, dept, 'emp.record.bulk.delete');
    if (intent !== 'dept-wipe' && !held) throw cuError('custody-denied', 403);
    return;
  }
  // This server-only workflow has already constrained the deletion through 040
  // and the trusted intent. Raw history writes remain append-only. Invoke the
  // existing operation classifier directly for this protected cleanup operation.
  var verdict = enfSuperGate(A, enfDecide(A, key, CU_RESOURCE, dept, before, after, JSON.stringify(before), JSON.stringify(after), ctx, ctx.enf));   /* برومت 43 · الجذر 1 (056) */
  if (!verdict.ok) throw cuError('custody-cleanup-permission', 403);
  if (intent === 'dept-wipe') {
    var empty = { items: [], moves: [] },
      drop = canWrite(A, key, JSON.stringify(empty), JSON.stringify(after), ctx);
    if (!drop.ok) throw cuError('custody-cleanup-permission', 403);
  }
}
async function cuPlanCleanup(env, A, opt) {
  cuShape(opt, ['dept', 'base', 'intent', 'oldEmployees', 'newEmployees', 'reason', 'finalKeys']);
  var dept = cuString(opt.dept, 200, false),
    intent = opt.intent,
    base = opt.base;
  if (['employee-delete', 'employee-wipe', 'import-replace', 'dept-wipe'].indexOf(intent) < 0 || !Number.isSafeInteger(base) || base < 0)
    throw cuError('custody-cleanup-intent');
  if (!Array.isArray(opt.oldEmployees) || !Array.isArray(opt.newEmployees)) throw cuError('custody-employees-shape');
  cuLiveEmployees(opt.oldEmployees);
  cuLiveEmployees(opt.newEmployees);
  if ((intent === 'employee-wipe' || intent === 'dept-wipe') && opt.newEmployees.length)
    throw cuError('custody-cleanup-employees-not-empty');
  if (await cuLegacyPresent(env)) throw cuError('custody-legacy-source-present', 503);
  if ((await cuRev(env, dept)) !== base) throw cuError('custody-conflict', 409);
  var employeeKey = 'bsdept:' + dept + ':bassam_employees_v1',
    actual = parseJson(await opResourceGet(env, employeeKey), []);
  if (!deq(actual, opt.oldEmployees)) throw cuError('custody-employee-source-mismatch', 409);
  var all = intent !== 'employee-delete',
    holderKeys = all ? [] : cuRemovedHolderKeys(opt.oldEmployees, opt.newEmployees),
    selection = cuSelection(dept, all ? null : 'holder_key', holderKeys);
  var moves =
    (await cuBind(env, 'SELECT * FROM custody_movements WHERE ' + selection.where + ' ORDER BY sequence', selection.args).all()).results ||
    [];
  var issueIds = Array.from(
      new Set(
        moves.map(function (r) {
          return r.issue_id;
        }),
      ),
    ),
    issueSelection = cuSelection(dept, all ? null : 'issue_id', issueIds);
  var issues =
    (await cuBind(env, 'SELECT * FROM custody_issues WHERE ' + issueSelection.where + ' ORDER BY issue_id', issueSelection.args).all())
      .results || [];
  var items =
    intent === 'dept-wipe'
      ? (await env.DB.prepare('SELECT * FROM custody_items WHERE department_id=?1 ORDER BY item_id').bind(dept).all()).results || []
      : [];
  if ((await cuRev(env, dept)) !== base) throw cuError('custody-conflict', 409);
  await cuCleanupPermission(env, A, dept, intent, opt.oldEmployees, opt.newEmployees, moves, opt.reason);
  var guards = [
      revGuard(env, cuKey(dept), base),
      cuRowsGuard(env, CU_TABLES.moves[0], CU_TABLES.moves[1], moves, selection),
      cuRowsGuard(env, CU_TABLES.issues[0], CU_TABLES.issues[1], issues, issueSelection),
    ],
    statements = [];
  if (intent === 'dept-wipe') {
    guards.push(cuRowsGuard(env, CU_TABLES.items[0], CU_TABLES.items[1], items, cuSelection(dept)));
    statements.push(
      env.DB.prepare('DELETE FROM custody_request_outputs WHERE department_id=?1').bind(dept),
      env.DB.prepare('DELETE FROM custody_requests WHERE department_id=?1').bind(dept),
    );
  }
  if (moves.length) statements.push(cuBind(env, 'DELETE FROM custody_movements WHERE ' + selection.where, selection.args));
  if (issues.length)
    statements.push(
      cuBind(
        env,
        'DELETE FROM custody_issues WHERE ' +
          issueSelection.where +
          ' AND NOT EXISTS(SELECT 1 FROM custody_movements m WHERE m.department_id=custody_issues.department_id AND m.issue_id=custody_issues.issue_id)',
        issueSelection.args,
      ),
    );
  if (intent === 'dept-wipe') statements.push(env.DB.prepare('DELETE FROM custody_items WHERE department_id=?1').bind(dept));
  return {
    guards: guards,
    statements: statements,
    revisionKeys: statements.length ? [cuKey(dept)] : [],
    snapshotRows: { items: items, issues: issues, moves: moves },
    checks: {
      employeeGuardRequired: true,
      trustedEmployeeTransitionRequired: true,
      receiptPreimageRequired: intent === 'dept-wipe',
      expectedEmployeeKey: employeeKey,
      affectedMoves: moves.length,
      affectedIssues: issues.length,
    },
    metadata: { departmentId: dept, kind: intent, partialSnapshot: intent !== 'dept-wipe', reason: reasonLogged(A, opt.reason) },
  };
}
function cuValidateDomain(domain, dept) {
  cuShape(domain, ['version', 'scope', 'rows']);
  if (domain.version !== 1) throw cuError('custody-domain-version');
  cuShape(domain.scope, ['departmentId']);
  if (domain.scope.departmentId !== dept) throw cuError('custody-domain-scope');
  cuShape(domain.rows, ['items', 'issues', 'moves']);
  var rows = domain.rows,
    items = new Map(),
    names = new Set(),
    issues = new Map(),
    serials = new Set(),
    moveIds = new Set(),
    sequences = new Set();
  Object.keys(CU_TABLES).forEach(function (k) {
    if (!Array.isArray(rows[k])) throw cuError('custody-domain-rows');
    rows[k].forEach(function (r) {
      cuShape(r, CU_TABLES[k][1]);
      if (Object.keys(r).length !== CU_TABLES[k][1].length || r.department_id !== dept) throw cuError('custody-domain-row-scope');
    });
  });
  rows.items.forEach(function (r) {
    cuString(r.item_id, 200, false);
    cuString(r.name, 4096, false);
    if (items.has(r.item_id) || names.has(r.name)) throw cuError('custody-domain-item-duplicate');
    if (
      typeof r.qty !== 'number' ||
      !Number.isFinite(r.qty) ||
      r.qty < 0 ||
      !Number.isSafeInteger(r.presence_mask) ||
      r.presence_mask < 0 ||
      r.presence_mask > 7
    )
      throw cuError('custody-domain-item');
    if (!(r.presence_mask & 1) && r.qty !== 0) throw cuError('custody-domain-presence');
    ['prefix', 'color'].forEach(function (k, i) {
      if (r.presence_mask & (2 << i)) cuString(r[k], 4096, true);
      else if (r[k] !== null) throw cuError('custody-domain-presence');
    });
    items.set(r.item_id, r);
    names.add(r.name);
  });
  rows.issues.forEach(function (r) {
    cuString(r.issue_id, 200, false);
    cuString(r.item_id, 200, false);
    cuString(r.serial, 4096, true);
    if (!items.has(r.item_id) || issues.has(r.issue_id)) throw cuError('custody-domain-issue-reference');
    var suffix = /([0-9]+)\s*$/.exec(r.serial),
      expected = suffix ? Number(suffix[1]) : 0;
    if (!Number.isSafeInteger(r.serial_number) || r.serial_number !== expected) throw cuError('custody-domain-serial');
    if (r.legacy_identity !== null) cuString(r.legacy_identity, 16384, false);
    var serialKey = JSON.stringify([r.item_id, r.serial]);
    if (r.serial && serials.has(serialKey)) throw cuError('custody-domain-serial-duplicate');
    serials.add(serialKey);
    issues.set(r.issue_id, r);
  });
  rows.moves.forEach(function (r) {
    cuString(r.move_id, 200, false);
    cuString(r.holder_key, 4096, false);
    var issue = issues.get(r.issue_id);
    if (!issue || issue.item_id !== r.item_id || moveIds.has(r.move_id) || sequences.has(r.sequence))
      throw cuError('custody-domain-move-reference');
    if (
      !Number.isSafeInteger(r.sequence) ||
      r.sequence < 0 ||
      !Number.isSafeInteger(r.hijri_year) ||
      r.hijri_year < 1000 ||
      r.hijri_year > 9999 ||
      !Number.isSafeInteger(r.hijri_month) ||
      r.hijri_month < 1 ||
      r.hijri_month > 12 ||
      !Number.isSafeInteger(r.hijri_day) ||
      r.hijri_day < 0 ||
      r.hijri_day > 30 ||
      ['out', 'in', 'dmg', 'lost'].indexOf(r.kind) < 0 ||
      !Number.isSafeInteger(r.presence_mask) ||
      r.presence_mask < 0 ||
      r.presence_mask > 127
    )
      throw cuError('custody-domain-move');
    ['condition', 'note', 'color_snapshot', 'actor_label', 'holder_nid_snapshot', 'holder_empno_snapshot', 'holder_name_snapshot'].forEach(
      function (k, i) {
        if (r.presence_mask & (1 << i)) cuHistoricalText(r[k]);
        else if (r[k] !== null) throw cuError('custody-domain-presence');
      },
    );
    if (r.actor_uid !== null) cuString(r.actor_uid, 200, false);
    if (r.created_at !== null && (!Number.isSafeInteger(r.created_at) || r.created_at < 0)) throw cuError('custody-domain-created-at');
    moveIds.add(r.move_id);
    sequences.add(r.sequence);
  });
  return rows;
}
