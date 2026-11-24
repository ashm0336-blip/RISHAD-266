  if (domains.dailyStats !== undefined) {
    rsShape(domains.dailyStats, ['version', 'rev', 'data']);
    if (domains.dailyStats.version !== 1 || !dsDomainShape(domains.dailyStats.data)) rsBCFail('daily-stats-shape');
  } else if (scope.kind === 'full' && legacy) {
    if (dsKeys.length > 1 || (dsKeys.length === 1 && dsKeys[0] !== K_DSTATS)) rsBCFail('daily-stats-scope');
    if (dsKeys.length) domains.dailyStats = { version: 1, data: dsLegacyConvert(keys[dsKeys[0]]) };
    else {
      var current = await rsDSCurrent(env);
      domains.dailyStats = { version: 1, data: current.data };
      summary.preservedGlobals.push('dailyStats');
      [
        ['days', 'daily_stats_days', ['site', 'greg_date', 'field_mask'].concat(DS_METRICS, ['meta_json', 'fields_json'])],
        ['months', 'daily_stats_month_locks', ['site', 'greg_year', 'greg_month', 'approved', 'reopened', 'legacy_boolean']],
        ['locks', 'daily_stats_day_locks', ['site', 'greg_year', 'greg_month', 'greg_day', 'is_open', 'is_shut']],
      ].forEach(function (spec) {
        readGuards.push.apply(readGuards, rsWitness(env, spec[1], spec[2], current.rows[spec[0]]));
      });
    }
  }
