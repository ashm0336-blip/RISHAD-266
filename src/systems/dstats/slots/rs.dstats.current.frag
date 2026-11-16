async function rsDSCurrent(env) {
  var b = await env.DB.batch([
      env.DB.prepare('SELECT * FROM daily_stats_days'),
      env.DB.prepare('SELECT * FROM daily_stats_month_locks'),
      env.DB.prepare('SELECT * FROM daily_stats_day_locks'),
      env.DB.prepare('SELECT rev FROM revs WHERE k=?1').bind(K_DSTATS),
    ]),
    rows = { days: b[0].results || [], months: b[1].results || [], locks: b[2].results || [] };
  return { rows: rows, data: dsDomainInflate(rows), rev: b[3].results[0] ? b[3].results[0].rev : 0 };
}
