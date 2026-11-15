  if (domains.dailyStats) {
    if (!sup) throw rsError('restore-policy', 403);
    var ds = domains.dailyStats;
    rsShape(ds, ['version', 'rev', 'data']);
    if (ds.rev !== undefined) rsNat(ds.rev);
    if (ds.version !== 1 || !dsDomainShape(ds.data)) throw rsError('restore-dstats-shape');
    rsNat(body.base.dailyStats);
    var current = await rsDSCurrent(env),
      next = ds.data;
    if (body.mode === 'merge') {
      next = {
        haram: Object.assign({}, current.data.haram, ds.data.haram),
        nabawi: Object.assign({}, current.data.nabawi, ds.data.nabawi),
        locks: Object.assign({}, current.data.locks, ds.data.locks),
      };
    }
    plan.guards.push(revGuard(env, K_DSTATS, body.base.dailyStats));
    var specs = [
      ['daily_stats_days', ['site', 'hijri_date', 'field_mask'].concat(DS_METRICS, ['meta_json', 'fields_json'])],
      ['daily_stats_month_locks', ['site', 'hijri_year', 'hijri_month', 'approved', 'reopened', 'legacy_boolean']],
      ['daily_stats_day_locks', ['site', 'hijri_year', 'hijri_month', 'hijri_day', 'is_open', 'is_shut']],
    ];
    var dsChanges = dsDomainStatements(env, current.data, next);
    for (var sp of specs) {
      var rr = current.rows[sp[0] === 'daily_stats_days' ? 'days' : sp[0] === 'daily_stats_month_locks' ? 'months' : 'locks'];
      plan.guards.push.apply(plan.guards, rsWitness(env, sp[0], sp[1], rr));
      if (dsChanges.length) plan.snapshots.push({ domain: 'dailyStats', table: sp[0], rows: rr });
    }
    plan.statements.push.apply(plan.statements, dsChanges);
    if (dsChanges.length) plan.revisionKeys.push(K_DSTATS);
    plan.counts.dailyStats = dsDomainRows(next).days.length;
  }
