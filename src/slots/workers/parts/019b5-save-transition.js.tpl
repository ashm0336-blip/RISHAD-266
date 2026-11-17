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
@@SYS:save.transition.custodyHistory@@      }
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
      candidate = pair[1]@@SYS:save.transition.custodyPlan|empty=";\n"@@    result.transitions.push({ departmentId: dept, intent: candidate.intent@@SYS:save.transition.custodyChecks@@ });
  }
  return result;
}
