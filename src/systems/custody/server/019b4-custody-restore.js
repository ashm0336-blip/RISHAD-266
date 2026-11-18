async function cuPlanRestore(env, A, domain, opt) {
  cuShape(opt, ['dept', 'base', 'scope', 'mode', 'reason', 'finalKeys']);
  var dept = cuString(opt.dept, 200, false);
  cuString(opt.reason, 300, false);
  if (opt.mode !== 'replace') throw cuError('custody-restore-mode');
  if (['dept', 'full'].indexOf(opt.scope) < 0) throw cuError('custody-restore-scope');
  if (!Number.isSafeInteger(opt.base) || opt.base < 0) throw cuError('custody-restore-base');
  await cuRestorePermission(A, dept, opt);
  if (await cuLegacyPresent(env)) throw cuError('custody-legacy-source-present', 503);
  var rows = cuValidateDomain(domain, dept);
  if ((await cuRev(env, dept)) !== opt.base) throw cuError('custody-conflict', 409);
  var before = await cuSnapshotRows(env, dept);
  if ((await cuRev(env, dept)) !== opt.base) throw cuError('custody-conflict', 409);
  var guards = [revGuard(env, cuKey(dept), opt.base)],
    statements = [];
  Object.keys(CU_TABLES).forEach(function (k) {
    guards.push(cuRowsGuard(env, CU_TABLES[k][0], CU_TABLES[k][1], before[k], cuSelection(dept)));
  });
  ['custody_request_outputs', 'custody_requests', 'custody_movements', 'custody_issues', 'custody_items'].forEach(function (table) {
    statements.push(env.DB.prepare('DELETE FROM ' + table + ' WHERE department_id=?1').bind(dept));
  });
  Object.keys(CU_TABLES).forEach(function (k) {
    statements.push.apply(statements, cuBulk(env, CU_TABLES[k][0], CU_TABLES[k][1], rows[k]));
  });
  return {
    guards: guards,
    statements: statements,
    revisionKeys: [cuKey(dept)],
    snapshotRows: before,
    checks: {
      finalDepartmentGuardRequired: true,
      receiptPreimageRequired: true,
      before: { items: before.items.length, issues: before.issues.length, moves: before.moves.length },
      after: { items: rows.items.length, issues: rows.issues.length, moves: rows.moves.length },
    },
    metadata: { departmentId: dept, kind: 'restore-replace', partialSnapshot: false, reason: String(opt.reason).slice(0, 300) },
  };
}
async function cuExport(env, A, url) {
  var dept = url.searchParams.get('dept') || '';
  if (
    (!dept && A.u.role !== 'super') ||
    (dept && !bkExportOk(A, dept))   /* IP39 (019u): backup.view alone does not export */
  )
    throw cuError('custody-export-permission', 403);
  if (await cuLegacyPresent(env)) throw cuError('custody-legacy-source-present', 503);
  for (var retry = 0; retry < 3; retry++) {
    var rev0 = await curRev(env),
      known = dept ? [] : parseJson(await kvGet(env, 'kv', K_DEPTS), []);
    if (!Array.isArray(known)) throw cuError('custody-export-departments');
    var depts = dept
      ? [dept]
      : Array.from(
          new Set(
            known
              .map(function (d) {
                return d.id;
              })
              .concat(
                (
                  (
                    await env.DB.prepare(
                      'SELECT department_id FROM custody_items UNION SELECT department_id FROM custody_issues UNION SELECT department_id FROM custody_movements',
                    ).all()
                  ).results || []
                ).map(function (r) {
                  return r.department_id;
                }),
              ),
          ),
        ).sort();
    var st = [env.DB.prepare("SELECT v FROM meta WHERE k='rev'")];
    Object.keys(CU_TABLES).forEach(function (k) {
      st.push(
        env.DB.prepare(
          'SELECT * FROM ' +
            CU_TABLES[k][0] +
            ' WHERE department_id IN (SELECT value FROM json_each(?1)) ORDER BY department_id,' +
            (k === 'items' ? 'item_id' : k === 'issues' ? 'issue_id' : 'sequence'),
        ).bind(JSON.stringify(depts)),
      );
    });
    var snapshot = await env.DB.batch(st),
      actual = Number((snapshot[0].results[0] || {}).v) || 0;
    if (actual !== rev0) continue;
    var redacted = [], domains = depts.map(function (d) {
      var rows = {};
      Object.keys(CU_TABLES).forEach(function (k, i) {
        rows[k] = (snapshot[i + 1].results || []).filter(function (r) {
          return r.department_id === d;
        });
      });
      var dom = { version: 1, scope: { departmentId: d }, rows: rows };   // PRIVACY batch (019u): holder snapshots by purpose · the copy marked redacted
      if (!privPersonalOk(A, d) && privRowsBlank(A, dom, 'moves', ['holder_nid_snapshot', 'holder_empno_snapshot'], 'holder_key')) redacted.push('custody:' + d);
      return dom;
    });
    return Object.assign({ ok: 1, domains: domains, globalRev: actual }, redacted.length ? { redacted: redacted } : {});
  }
  throw cuError('custody-export-race', 409);
}

