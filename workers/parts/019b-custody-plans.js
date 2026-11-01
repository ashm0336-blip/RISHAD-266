/* Server-only plans: no batch, revision allocation, session effect or audit write here. */
function cuSelection(dept, column, ids) {
  var args = [dept],
    where = 'department_id=?1';
  if (column) {
    if (['holder_key', 'issue_id'].indexOf(column) < 0) throw cuError('custody-plan-column');
    var chunks = cuJsonChunks(ids),
      queries = chunks.map(function (chunk) {
        args.push(chunk);
        return 'SELECT value FROM json_each(?' + args.length + ')';
      });
    where += ' AND ' + column + ' IN (' + (queries.length ? queries.join(' UNION ALL ') : 'SELECT NULL WHERE 0') + ')';
  }
  return { where: where, args: args };
}
function cuRowsGuard(env, table, columns, rows, selection) {
  var args = selection.args.slice(),
    expected = cuJsonChunks(rows).map(function (chunk) {
      args.push(chunk);
      return (
        'SELECT ' +
        columns
          .map(function (c) {
            return "json_extract(value,'$." + c + "')";
          })
          .join(',') +
        ' FROM json_each(?' +
        args.length +
        ')'
      );
    });
  var count = '(SELECT COUNT(*) FROM ' + table + ' WHERE ' + selection.where + ')!=' + rows.length;
  var diff = expected.length
    ? ' OR EXISTS(SELECT ' +
      columns
        .map(function (c) {
          return '"' + c + '"';
        })
        .join(',') +
      ' FROM ' +
      table +
      ' WHERE ' +
      selection.where +
      ' EXCEPT SELECT * FROM (' +
      expected.join(' UNION ALL ') +
      '))'
    : '';
  return cuBind(env, 'SELECT CASE WHEN ' + count + diff + " THEN json_extract('{}','KIVO_CUSTODY_TARGET_CHANGED') END", args);
}
async function cuSnapshotRows(env, dept) {
  var rows = {};
  for (var k of Object.keys(CU_TABLES))
    rows[k] =
      (
        await env.DB.prepare(
          'SELECT * FROM ' +
            CU_TABLES[k][0] +
            ' WHERE department_id=?1 ORDER BY ' +
            (k === 'items' ? 'item_id' : k === 'issues' ? 'issue_id' : 'sequence'),
        )
          .bind(dept)
          .all()
      ).results || [];
  return rows;
}
function cuLiveEmployees(employees) {
  if (!Array.isArray(employees)) throw cuError('custody-employees-shape');
  var live = Object.create(null);
  employees.forEach(function (e) {
    if (typeof e === 'string' && e) {
      live[e] = 1;
      return;
    }
    if (!isObj(e)) throw cuError('custody-employees-shape');
    ['eid', 'nid', 'name', 'empno'].forEach(function (k) {
      if (e[k]) live[String(e[k])] = 1;
    });
  });
  return live;
}
function cuRemovedHolderKeys(before, after) {
  var aligned = alignOld(entOf('bassam_employees_v1'), before, after, {});
  var liveKeys = new Set(
      after.map(function (e) {
        return typeof e === 'string' ? e : e && (e.eid || e.name);
      }),
    ),
    survivorNames = new Set(
      after
        .map(function (e) {
          return typeof e === 'string' ? e : e && e.name;
        })
        .filter(Boolean),
    ),
    keys = new Set();
  before.forEach(function (e, index) {
    if (typeof e === 'string' && e) {
      if (!survivorNames.has(e)) keys.add(e);
      return;
    }
    if (!isObj(e)) throw cuError('custody-employees-shape');
    var previous = Array.isArray(aligned) ? aligned[index] : e;
    if (liveKeys.has(previous && (previous.eid || previous.name))) return;
    if (e.eid) keys.add(String(e.eid));
    if (e.nid) keys.add(String(e.nid));
    if (e.name && !survivorNames.has(String(e.name))) keys.add(String(e.name));
  });
  return Array.from(keys);
}
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
  if (A.enf) {
    var ops = {};
    if (intent === 'import-replace') ops[key] = { op: 'import.run', mode: 'replace', reason: String(reason || '') };
    var markers = KIVO_BUILD.markers(ops, keys),
      X = await enfSavePrep(env, A, { why: why }, set, [], keys, markers, null, false, false, {}, {});
    ctx.enf = enfCtxFor(X, key, dept);
    if (intent === 'import-replace') ctx.enf.imp = true;
    if (X.batchDeny) throw cuError('custody-denied', 403);
  }
  if (!before.moves.length) {
    var held = A.enf
      ? intent === 'import-replace'
        ? enfHeld(A, dept, 'import.replace')
        : enfHeld(A, dept, 'emp.record.delete') || enfHeld(A, dept, 'emp.record.bulk.delete')
      : intent === 'import-replace'
        ? actsHeldOn(A, dept, 'admin/import', ['del'])
        : empCleanAllowed(A, dept, ctx);
    if (intent !== 'dept-wipe' && !held) throw cuError('custody-denied', 403);
    return;
  }
  // This server-only workflow has already constrained the deletion through 040
  // and the trusted intent. Raw history writes remain append-only. Invoke the
  // existing operation classifier directly for this protected cleanup operation.
  var verdict = A.enf
    ? enfDecide(A, key, CU_RESOURCE, dept, before, after, JSON.stringify(before), JSON.stringify(after), ctx, ctx.enf)
    : canWrite(A, key, JSON.stringify(after), JSON.stringify(before), ctx);
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
    metadata: { departmentId: dept, kind: intent, partialSnapshot: intent !== 'dept-wipe', reason: String(opt.reason || '').slice(0, 300) },
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
async function cuRestorePermission(A, dept, opt) {
  if (!deptInScope(A, dept)) throw cuError('custody-denied', 403);
  if (opt.scope === 'full' && A.u.role !== 'super') throw cuError('custody-restore-full-super-only', 403);
  var has =
    A.u.role === 'super' || (A.enf ? enfHeld(A, dept, 'backup.restore') : KIVO_GUARDS.decide('backup.restore', permv2Ctx(A, dept)).ok);
  var policy = KIVO_BUILD.restorePolicy(A.u.role === 'super', isMgrOf(A, dept), has, opt.reason);
  if (!policy.ok || policy.missingReason) throw cuError('custody-restore-permission', 403);
}
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

/* The caller supplies an internal applySave plan after canonical authorization.
   Client fields cannot mint serverDepartmentWipes or a validated kvPlan. */
async function cuPlanSaveTransition(env, A, body, kvPlan) {
  if (!kvPlan || kvPlan.__plan !== 1) throw cuError('custody-transition-plan');
  body = body || {};
  var pend = Array.isArray(kvPlan.pend) ? kvPlan.pend : [],
    byKey = new Map(
      pend.map(function (p) {
        return [p.k, p];
      }),
    ),
    requested = Object.keys(body.set || {}).concat(body.del || []),
    allowedKeys = {};
  requested.forEach(function (k) {
    allowedKeys[k] = 1;
  });
  var markers = KIVO_BUILD.markers(body.ops || {}, allowedKeys),
    potential = kvPlan.protectedOp === 'empDelete',
    candidates = new Map(),
    blocked = !kvPlan.ok,
    privileged = kvPlan.serverDepartmentWipes || [],
    invalidEmployees = {};
  if (!Array.isArray(privileged)) throw cuError('custody-transition-server-intent');
  function requestIntent(key, before, after, present) {
    var trusted = kvPlan.serverEmployeeIntent;
    if (trusted && trusted.dept === parseKey(key).dept) {
      if (['employee-delete', 'employee-wipe', 'import-replace'].indexOf(trusted.kind) < 0)
        throw cuError('custody-transition-server-intent');
      return trusted.kind === 'employee-delete' && !cuRemovedHolderKeys(before, after).length ? null : trusted.kind;
    }
    var marker = markers.ops[key];
    if (marker && marker.op === 'import.run' && marker.mode === 'replace') return 'import-replace';
    if (after.length === 0 && (before.length > 0 || present === 'delete')) return 'employee-wipe';
    return cuRemovedHolderKeys(before, after).length ? 'employee-delete' : null;
  }
  for (var key of requested) {
    if (resName(key) !== 'bassam_employees_v1') continue;
    var dept = parseKey(key).dept;
    if (!dept) continue;
    var pd = byKey.get(key),
      before = pd ? parseJson(pd.cur, []) : parseJson(await opResourceGet(env, key), []),
      after = pd
        ? pd.act === 'del'
          ? []
          : parseJson(pd.v, null)
        : (body.del || []).indexOf(key) >= 0
          ? []
          : parseJson((body.set || {})[key], invalidEmployees);
    if (after === invalidEmployees) {
      /* The retired barrier interpreted parseJson's fallback (malformed text
         or JSON null) as removing all holders. Preserve its whole-batch refusal
         only when that old holder set has history; valid nonarrays keep the
         existing partial-save behavior. This branch never compiles a write. */
      if (blocked && !potential && Array.isArray(before)) {
        var aliases = [];
        before.forEach(function (employee) {
          if (!employee) return;
          [employee.eid || employee.name, employee.nid, employee.empno].filter(Boolean).forEach(function (value) {
            aliases.push(String(value));
          });
        });
        if (aliases.length)
          potential = !!(await env.DB.prepare(
            'SELECT 1 FROM custody_movements WHERE department_id=?1 AND (holder_key IN (SELECT value FROM json_each(?2)) OR holder_nid_snapshot IN (SELECT value FROM json_each(?2)) OR holder_empno_snapshot IN (SELECT value FROM json_each(?2))) LIMIT 1',
          )
            .bind(dept, JSON.stringify(aliases))
            .first());
      }
      continue;
    }
    if (!Array.isArray(before) || !Array.isArray(after)) continue;
    var intent = requestIntent(key, before, after, (body.del || []).indexOf(key) >= 0 ? 'delete' : 'set');
    if (intent) potential = true;
    if (!blocked && intent) {
      // No changed employee pend is legitimate only for an explicit replacement
      // whose employee document was validated but stayed exactly identical.
      if (!pd && !(intent === 'import-replace' && deq(before, after))) throw cuError('custody-transition-employee-plan');
      candidates.set(dept, { intent: intent, before: before, after: after, employeeKey: key });
    }
  }
  for (var definition of pend) {
    if (definition.k !== K_DEPTS) continue;
    var was = parseJson(definition.cur, []),
      next = definition.act === 'del' ? [] : parseJson(definition.v, null);
    if (!Array.isArray(was) || !Array.isArray(next)) throw cuError('custody-transition-departments');
    var remaining = new Set(
      next.map(function (d) {
        return d && d.id;
      }),
    );
    for (var d of was) {
      if (!d || !d.id || remaining.has(d.id)) continue;
      potential = true;
      privileged = privileged.concat([d.id]);
    }
  }
  if (blocked && !potential && Object.prototype.hasOwnProperty.call(body.set || {}, K_DEPTS)) {
    var desired = parseJson(body.set[K_DEPTS], null);
    if (Array.isArray(desired)) {
      var desiredIds = new Set(
        desired.map(function (d) {
          return d && d.id;
        }),
      );
      potential = (A.depts || []).some(function (d) {
        return d && !desiredIds.has(d.id);
      });
    }
  }
  if (blocked && (body.del || []).indexOf(K_DEPTS) >= 0) potential = true;
  for (var dept of Array.from(new Set(privileged))) {
    potential = true;
    if (
      A.u.role !== 'super' ||
      !(A.depts || []).some(function (d) {
        return d && d.id === dept;
      })
    )
      throw cuError('custody-transition-wipe-permission', 403);
    if (blocked) continue;
    var key = 'bsdept:' + dept + ':bassam_employees_v1',
      pd = byKey.get(key),
      before = pd ? parseJson(pd.cur, []) : parseJson(await opResourceGet(env, key), []),
      after = pd ? (pd.act === 'del' ? [] : parseJson(pd.v, null)) : before;
    if (!Array.isArray(before) || !Array.isArray(after)) throw cuError('custody-transition-employees');
    if (after.length) throw cuError('custody-transition-wipe-employee-plan');
    candidates.set(dept, { intent: 'dept-wipe', before: before, after: [], employeeKey: key });
  }
  var result = {
    coupled: potential,
    blocked: blocked && potential,
    guards: [],
    statements: [],
    revisionKeys: [],
    snapshotRows: {},
    transitions: [],
    checks: { allRequestedKeysRequired: potential },
    metadata: { kind: 'save-transition' },
  };
  if (!potential || result.blocked) return result;
  if (!kvPlan.ok) throw cuError('custody-transition-denied', 403);
  for (var pair of candidates) {
    var dept = pair[0],
      candidate = pair[1],
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
    result.transitions.push({ departmentId: dept, intent: candidate.intent, checks: plan.checks, metadata: plan.metadata });
  }
  return result;
}
