/* Replacement for the retired442 ir_day poll. One active department, one
   Riyadh civil day, SQL aggregates only, and the existing NF once mechanism. */
function irDailyManager(A) {
  var u = A && A.u;
  return !!(u && (u.role === 'super' || u.role === 'dept' || u.role === 'gm' || (u.role === 'staff' && u.mgr)));
}
function irDailyPlan(ctx, day) {
  var scope = irQueryScope(ctx, 'r'), p = { args: scope.args.slice() },
    where = scope.sql + ' AND r.hijri_year=' + irQueryParam(p, day.y) +
      ' AND r.hijri_month=' + irQueryParam(p, day.m) + ' AND r.hijri_day=' + irQueryParam(p, day.d),
    label = "COALESCE(NULLIF(r.location,''),'—')",
    count = 'SELECT COUNT(*) FROM irshad_reports r WHERE ' + where,
    top = 'SELECT ' + label + ' FROM irshad_reports r WHERE ' + where + ' GROUP BY ' + label + ' ORDER BY COUNT(*) DESC,MIN(r.sequence) LIMIT 1';
  return { args: p.args, count: count, top: top };
}
async function nfIrshadDaily(env, actor, url) {
  var now = Date.now(), minutes = pfRiyadhMins(now), d = url.searchParams.get('dept') || '';
  if (minutes < 1410 || !d || !irDailyManager(actor)) return { emitted: 0 };
  var ctx;
  try { ctx = await irQueryContext(env, actor, d); }
  catch (e) {
    if (e.irStatus === 403) return { emitted: 0 };
    if (e.irCode) throw nfErr(e.irCode, e.irStatus === 409 ? 409 : 503);
    throw e;
  }
  if (!irDailyManager(ctx.A)) return { emitted: 0 };
  var day = pfHijriAt(now), once = 'ir_day:' + day.dk, scope = nfScope(d),
    existing = await ctx.env.DB.prepare('SELECT 1 FROM notification_dedup WHERE scope=?1 AND once_key=?2').bind(scope, once).first();
  if (existing) return { emitted: 0, checked: 1, settled: 1 };   /* checked/settled: the shared due gate (019 nfDueRun · decision h) */
  var aggregate = irDailyPlan(ctx, day), guards = ctx.guards.concat([rsEpochGuard(ctx.env.DB, ctx.base.epoch), irRetiredGuard(ctx.env)]), result;
  try {
    result = await ctx.env.DB.batch(guards.concat([
      rsBound(ctx.env.DB.prepare('SELECT (' + aggregate.count + ') n,(' + aggregate.top + ') location'), aggregate.args),
    ]));
  } catch (e) {
    if (/KIVO_IRSHAD_LEGACY_SOURCE/.test(String(e))) throw nfErr('irshad-legacy-source-present', 503);
    if (/KIVO_RESTORE_TARGET|KIVO_RESTORE_EPOCH/.test(String(e))) throw nfErr('conflict', 409);
    throw e;
  }
  var summary = (result[guards.length].results || [])[0];
  if (!summary || !Number.isSafeInteger(summary.n) || summary.n < 0) throw nfErr('irshad-daily-summary', 503);
  if (!summary.n) return { emitted: 0, checked: 1 };
  // The original observer reduced items[].n. Current supported IR reports have
  // no items field, so beneficiaries stays0; langs/count is not substituted.
  var plan = await nfPlanEvents(ctx.env, ctx.A, [{ type: 'ir_day', dept: d,
      vars: { 'المحاضر': summary.n, 'المستفيدون': 0, 'الموقع': String(summary.location).slice(0, 4000) }, once: once, at: now }], true);
  if (!plan.plans.length) return { emitted: 0, checked: 1 };
  var seenGuard = ctx.env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM notification_dedup WHERE scope=?1 AND once_key=?2) THEN json_extract('{}','KIVO_IRSHAD_DAILY_SEEN') END").bind(scope, once),
    sourceArgs = aggregate.args.slice(), sourcePlan = { args: sourceArgs },
    nSlot = irQueryParam(sourcePlan, summary.n), locationSlot = irQueryParam(sourcePlan, summary.location),
    sourceGuard = rsBound(ctx.env.DB.prepare('SELECT CASE WHEN (' + aggregate.count + ')<>' + nSlot +
      ' OR (' + aggregate.top + ') IS NOT ' + locationSlot + " THEN json_extract('{}','KIVO_IRSHAD_DAILY_SOURCE_CHANGED') END"), sourceArgs),
    statements = guards.concat(plan.guards, [sourceGuard, seenGuard]);
  statements.push.apply(statements, bdBumpStatements(ctx.env, NF_REV, false));
  statements.push.apply(statements, plan.statements);
  statements.push.apply(statements, nfRetention(ctx.env, now, plan.scopes));
  try { await ctx.env.DB.batch(statements); }
  catch (e) {
    if (/KIVO_IRSHAD_DAILY_SEEN/.test(String(e))) {
      var duplicate = await ctx.env.DB.prepare('SELECT 1 FROM notification_dedup WHERE scope=?1 AND once_key=?2').bind(scope, once).first();
      if (duplicate) return { emitted: 0, checked: 1, settled: 1 };
    }
    if (/KIVO_IRSHAD_LEGACY_SOURCE/.test(String(e))) throw nfErr('irshad-legacy-source-present', 503);
    if (/KIVO_NOTIFICATION_LEGACY_SOURCE/.test(String(e))) throw nfErr('notification-legacy-source-present', 503);
    if (/KIVO_RESTORE_TARGET|KIVO_RESTORE_EPOCH|KIVO_IRSHAD_DAILY_SOURCE_CHANGED|KIVO_IRSHAD_DAILY_SEEN/.test(String(e)))
      throw nfErr('conflict', 409);
    throw e;
  }
  preOff(ctx.env);
  return { emitted: plan.plans.length, checked: 1, settled: 1 };
}
