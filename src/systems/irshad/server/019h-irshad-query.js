/* Irshad SQL reads. Authority is captured once from named references, never
   from all KV or from a client-supplied principal/scope. */

function irQueryParam(plan, value) {
  plan.args.push(value);
  return '?' + plan.args.length;
}
function irQueryBase(ctx) {
  return Object.assign({}, ctx.base);
}
async function irQueryContext(env, actor, d, options) {
  return bdQueryContext(env, actor, d, {
    resources: IR_RES, resourceNames: IR_RES_NAMES,
    metaKeys: function (dept) { return [irMetaKey(dept), irMetaKey(dept) + ':retro-version']; },
    error: function (code, status) { return irError('irshad-' + code, status); },
    validateMeta: function (meta, dept) {
      var presence = irOwn(meta, irMetaKey(dept)) ? Number(meta[irMetaKey(dept)]) : 0;
      if (!Number.isSafeInteger(presence) || presence < 0 || presence > 63) throw irError('irshad-presence-invalid', 503);
    },
  }, options);
}
async function irRowRead(env, d, ids) {
  if (!Array.isArray(ids) || ids.length > 200 || ids.some(function (id) { return typeof id !== 'string'; }))
    throw irError('irshad-row-query');
  if (!ids.length) return [];
  var out = await env.DB.batch([
      env.DB.prepare('SELECT * FROM irshad_reports WHERE department_id=?1 AND report_id IN(SELECT value FROM json_each(?2)) ORDER BY sequence').bind(d, JSON.stringify(ids)),
      env.DB.prepare('SELECT * FROM irshad_report_languages WHERE department_id=?1 AND report_id IN(SELECT value FROM json_each(?2)) ORDER BY report_id,position').bind(d, JSON.stringify(ids)),
    ]), domain = irEmptyDomain(d);
  domain.resources.reports = true;
  domain.rows.reports = out[0].results || [];
  domain.rows.languages = out[1].results || [];
  return irInflate(domain).reports.reports;
}
function irQueryScope(ctx, alias) {
  alias = alias || 'r';
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(alias)) throw irError('irshad-query');
  /* RISHAD-266: قيدُ الوردية من سقف النطاق القديم أُلغي — الإدارةُ وحدها تحدّ الصفوف هنا (القراءةُ نفسُها محكومةٌ قبلها بمفاتيحها وسقف الوحدة).
     Free-text location is deliberately not a Site ACL dimension. */
  var args = [ctx.d], where = 'r.department_id=?1';
  where = where.replace(/\br\./g, alias + '.');
  return { args: args, where: where, sql: where };
}
function irQueryPlan(ctx) {
  var scope = irQueryScope(ctx);
  return { args: scope.args.slice(), prefix: 'WITH scoped AS(SELECT r.*,COALESCE((SELECT SUM(l.count) FROM irshad_report_languages l WHERE l.department_id=r.department_id AND l.report_id=r.report_id),0) trans FROM irshad_reports r WHERE ' + scope.where + '), data AS(SELECT *,trans+COALESCE(brochures,0)+COALESCE(prosecution,0)+COALESCE(police,0) ben FROM scoped) ', sql: '' };
}
function irQueryStatement(ctx, plan) {
  return cuBind(ctx.env, plan.prefix + plan.sql, plan.args);
}
async function irQueryBatch(ctx, plans) {
  var guards = ctx.guards.slice();
  if (typeof irRetiredGuard === 'function') guards.push(irRetiredGuard(ctx.env));
  try {
    var result = await ctx.env.DB.batch(guards.concat(plans.map(function (p) { return irQueryStatement(ctx, p); })));
    return result.slice(guards.length).map(function (r) {
      if (!r || r.success === false) throw irError('irshad-read', 503);
      return r.results || [];
    });
  } catch (e) {
    if (/KIVO_IRSHAD_LEGACY_SOURCE/.test(String(e && e.message))) throw irError('irshad-legacy-source-present', 503);
    if (/KIVO_RESTORE_TARGET|KIVO_RESTORE_EPOCH/.test(String(e && e.message))) throw irError('irshad-read-race', 409);
    throw e;
  }
}
function irQueryMetricSql() {
  return "COUNT(*) reports,COUNT(DISTINCT NULLIF(employee_key,'')) employees,COALESCE(SUM(trans),0) trans,COALESCE(SUM(brochures),0) bro,COALESCE(SUM(prosecution),0) pros,COALESCE(SUM(police),0) pol,COALESCE(SUM(ben),0) ben";
}
function irQueryMetrics(row) {
  var out = {};
  ['reports', 'employees', 'trans', 'bro', 'pros', 'pol', 'ben'].forEach(function (k) { out[k] = Number(row && row[k] || 0); });
  return out;
}
function irQueryInt(v, fallback, min, max) {
  var n = v === undefined || v === null || v === '' ? fallback : Number(v);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw irError('irshad-query');
  return n;
}
function irQueryText(v, max) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string' || v.length > max) throw irError('irshad-query');
  return v;
}
function irQueryMonth(plan, y, m) {
  return 'hijri_year=' + irQueryParam(plan, y) + ' AND hijri_month=' + irQueryParam(plan, m);
}
function irQueryCatalogPlan(ctx) {
  var p = irQueryPlan(ctx);
  p.sql = 'SELECT kind,value FROM irshad_catalog_entries WHERE department_id=?1 ORDER BY kind,position';
  return p;
}
function irQueryCatalogDto(ctx, rows) {
  var values = { languages: [], locations: [] }, mask = Number(ctx.meta[irMetaKey(ctx.d)] || 0);
  rows.forEach(function (r) { if (values[r.kind]) values[r.kind].push(r.value); });
  return { catalogs: { languages: { present: !!(mask & 2), values: values.languages }, locations: { present: !!(mask & 4), values: values.locations } } };
}
async function irQueryCatalogs(ctx) {
  return irQueryCatalogDto(ctx, (await irQueryBatch(ctx, [irQueryCatalogPlan(ctx)]))[0]);
}
async function irQueryCalendar(ctx, q, clock) {
  var y = irQueryInt(q.year, clock.y, 1000, 9999), m = irQueryInt(q.month, clock.m, 1, 12),
    total = irQueryPlan(ctx), months = irQueryPlan(ctx), days = irQueryPlan(ctx), stats = irQueryPlan(ctx);
  total.sql = 'SELECT COUNT(*) total,COALESCE(SUM(hijri_year=' + irQueryParam(total, y) + '),0) yearTotal FROM data';
  months.sql = 'SELECT hijri_month m,COUNT(*) n FROM data WHERE hijri_year=' + irQueryParam(months, y) + ' GROUP BY hijri_month ORDER BY hijri_month';
  days.sql = 'SELECT hijri_day d,COUNT(*) n FROM data WHERE ' + irQueryMonth(days, y, m) + ' GROUP BY hijri_day ORDER BY hijri_day';
  stats.sql = 'SELECT ' + irQueryMetricSql() + ' FROM data WHERE ' + irQueryMonth(stats, y, m);
  var rows = await irQueryBatch(ctx, [total, months, days, stats]), metrics = irQueryMetrics(rows[3][0]);
  delete metrics.employees;
  return { year: y, month: m, total: rows[0][0].total, yearTotal: rows[0][0].yearTotal,
    months: rows[1].filter(function (r) { return r.m >= 1 && r.m <= 12; }),
    days: rows[2].filter(function (r) { return r.d >= 1 && r.d <= 30; }), monthTotals: metrics };
}
async function irQueryRecords(ctx, q, clock) {
  var y = irQueryInt(q.year, clock.y, 1000, 9999), m = irQueryInt(q.month, clock.m, 1, 12),
    limit = irQueryInt(q.limit, 10, 1, 200), query = irQueryText(q.q, 500).trim(),
    shift = q.shift == null ? null : irQueryText(q.shift, 4000),
    loc = q.loc == null ? null : irQueryText(q.loc, 4000),
    descriptor = { year: y, month: m, limit: limit, q: query, shift: shift, loc: loc, clock: [clock.y, clock.m, clock.d] }, token = null;
  if (q.cursor) {
    try { token = cuUncursor(irQueryText(q.cursor, 12000)); } catch (e) { throw irError('irshad-cursor'); }
    irShape(token, ['v', 'uid', 'dept', 'w', 'query', 'page'], 'cursor');
  }
  var page = irQueryInt(q.page, token ? token.page : 1, 1, Number.MAX_SAFE_INTEGER);
  if (token && (token.v !== 1 || token.w !== ctx.witness || token.uid !== ctx.A.u.id || token.dept !== ctx.d || !deq(token.query, descriptor) || token.page !== page))
    throw irError('irshad-cursor-stale', 409);
  function filtered(p) {
    var f = irQueryMonth(p, y, m);
    if (shift !== null && shift !== 'all') f += ' AND shift=' + irQueryParam(p, shift);
    if (loc !== null && loc !== 'all') f += " AND COALESCE(location,'')=" + irQueryParam(p, loc);
    return f;
  }
  var ids = null;
  if (query) {
    var search = irQueryPlan(ctx);
    search.sql = 'SELECT report_id,employee_name,location,shift FROM data WHERE ' + filtered(search);
    // Only the selected month and minimal search metadata enter JavaScript.
    // KIVO_FIND is generated from the canonical client engine, not a new search.
    ids = (await irQueryBatch(ctx, [search]))[0].filter(function (r) {
      return KIVO_FIND.match(query, [r.employee_name, r.location, r.shift, undefined]);
    }).map(function (r) { return r.report_id; });
  }
  function matches(p) {
    return filtered(p) + (ids ? ' AND report_id IN(SELECT value FROM json_each(' + irQueryParam(p, JSON.stringify(ids)) + '))' : '');
  }
  var count = irQueryPlan(ctx), monthCount = irQueryPlan(ctx);
  count.sql = 'SELECT COUNT(*) n FROM data WHERE ' + matches(count);
  monthCount.sql = 'SELECT COUNT(*) n FROM data WHERE ' + irQueryMonth(monthCount, y, m);
  var counts = await irQueryBatch(ctx, [count, monthCount]), total = counts[0][0].n,
    pages = Math.max(1, Math.ceil(total / limit));
  page = Math.min(page, pages);
  var anchor = irQueryPlan(ctx), order = ' ORDER BY COALESCE(hijri_day,0) DESC,COALESCE(created_at,0) DESC,sequence';
  anchor.sql = 'SELECT COALESCE(hijri_day,0) d,COALESCE(created_at,0) ts,sequence FROM data WHERE ' + matches(anchor) + order + ' LIMIT 1 OFFSET ' + ((page - 1) * limit);
  var edge = (await irQueryBatch(ctx, [anchor]))[0][0], dto = [];
  if (edge) {
    var selected = irQueryPlan(ctx), f = matches(selected), dslot = irQueryParam(selected, edge.d), tslot = irQueryParam(selected, edge.ts), sslot = irQueryParam(selected, edge.sequence);
    selected.sql = 'SELECT report_id FROM data WHERE ' + f + ' AND (COALESCE(hijri_day,0)<' + dslot + ' OR (COALESCE(hijri_day,0)=' + dslot + ' AND (COALESCE(created_at,0)<' + tslot + ' OR (COALESCE(created_at,0)=' + tslot + ' AND sequence>=' + sslot + '))))' + order + ' LIMIT ' + limit;
    var selectedIds = (await irQueryBatch(ctx, [selected]))[0].map(function (r) { return r.report_id; }),
      decoded = await irRowRead(ctx.env, ctx.d, selectedIds), map = new Map();
    decoded.forEach(function (r) { map.set(r.id, r); });
    dto = selectedIds.map(function (id) { if (!map.has(id)) throw irError('irshad-read-race', 409); return map.get(id); });
  }
  function cursor(n) { return cuCursor({ v: 1, uid: ctx.A.u.id, dept: ctx.d, w: ctx.witness, query: descriptor, page: n }); }
  return { year: y, month: m, rows: dto, total: total, monthTotal: counts[1][0].n, page: page, pageSize: limit,
    next: page < pages ? cursor(page + 1) : '', prev: page > 1 ? cursor(page - 1) : '' };
}
function irQueryDate(value) {
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value || '');
  if (!m) throw irError('irshad-range');
  var y = irQueryInt(m[1], 0, 1000, 9999), mo = irQueryInt(m[2], 0, 1, 12), d = irQueryInt(m[3], 0, 1, 30);
  return { text: y + '-' + mo + '-' + d, n: y * 10000 + mo * 100 + d };
}
function irQueryRange(plan, range) {
  if (!range) return '0';
  var clauses = [];
  if (range.y !== undefined) clauses.push('hijri_year=' + irQueryParam(plan, range.y));
  if (range.m !== undefined) clauses.push('hijri_month=' + irQueryParam(plan, range.m));
  if (range.from !== undefined) clauses.push('hijri_year*10000+hijri_month*100+hijri_day>=' + irQueryParam(plan, range.from));
  if (range.to !== undefined) clauses.push('hijri_year*10000+hijri_month*100+hijri_day<=' + irQueryParam(plan, range.to));
  return clauses.length ? clauses.join(' AND ') : '1';
}
function irQueryShiftNames(ctx) {
  var configured = parseJson(ctx.rawKeys['bsdept:' + ctx.d + ':bassam_shift_options_v1'], null);
  return Array.isArray(configured) && configured.length && configured.every(function (r) { return r && r.name; })
    ? configured.map(function (r) { return r.name; })
    : ['الوردية الأولى', 'الوردية الثانية', 'الوردية الثالثة', 'الوردية الرابعة'];
}
function irQueryTopGroups(plan, groupSql, label) {
  plan.prefix += ', groups AS(' + groupSql + '), ranked AS(SELECT *,ROW_NUMBER() OVER(ORDER BY value DESC,orderKey) rn,COUNT(*) OVER() n FROM groups) ';
  plan.sql = "SELECT name,value,previous,firstSequence,other FROM(SELECT name,value,previous,firstSequence,0 other,rn position FROM ranked WHERE n<=7 OR rn<=6 UNION ALL SELECT '" + label + " ('||COUNT(*)||')',SUM(value),SUM(previous),MIN(firstSequence),1,7 FROM ranked WHERE n>7 AND rn>6 HAVING COUNT(*)>0) ORDER BY position";
}
async function irQueryDashboard(ctx, q, clock) {
  var availability = irQueryPlan(ctx);
  availability.sql = 'SELECT hijri_year y,hijri_month m,COUNT(*) n,MIN(hijri_day) firstDay FROM data GROUP BY hijri_year,hijri_month ORDER BY hijri_year,hijri_month';
  var initial = await irQueryBatch(ctx, [availability, irQueryCatalogPlan(ctx)]),
    availableRows = initial[0], catalog = irQueryCatalogDto(ctx, initial[1]), years = [], first = null, total = 0;
  availableRows.forEach(function (r) {
    total += r.n;
    if (r.y && years.indexOf(r.y) < 0) years.push(r.y);
    if (r.y && r.m && r.firstDay != null) {
      var candidate = { y: r.y, m: r.m, d: r.firstDay };
      if (!first || candidate.y * 10000 + candidate.m * 100 + candidate.d < first.y * 10000 + first.m * 100 + first.d) first = candidate;
    }
  });
  years.sort(function (a, b) { return b - a; });
  if (!years.length) years.push(clock.y);
  var mode = q.mode || 'all', year = irQueryInt(q.year, years[0], 1000, 9999),
    month = q.month === 'all' || mode === 'all' ? 'all' : irQueryInt(q.month, clock.m, 1, 12),
    heatYear = irQueryInt(q.heatYear, year, 1000, 9999), bucket = q.bucket || (month === 'all' ? 'month' : 'day'),
    selection = { mode: mode, year: year, month: month, from: null, to: null, previousFrom: null, previousTo: null, heatYear: heatYear, bucket: bucket },
    range = {}, previous = null;
  if (['all', 'month', 'custom'].indexOf(mode) < 0 || ['day', 'month'].indexOf(bucket) < 0) throw irError('irshad-range');
  if (mode === 'custom') {
    var from = irQueryDate(q.from), to = irQueryDate(q.to), pf = irQueryDate(q.previousFrom), pt = irQueryDate(q.previousTo);
    if (from.n > to.n || pf.n > pt.n) throw irError('irshad-range');
    range = { from: from.n, to: to.n }; previous = { from: pf.n, to: pt.n };
    Object.assign(selection, { from: from.text, to: to.text, previousFrom: pf.text, previousTo: pt.text });
  } else if (mode === 'month') {
    range = { y: year };
    if (month !== 'all') range.m = month;
    previous = month === 'all' ? { y: year - 1 } : { y: month === 1 ? year - 1 : year, m: month === 1 ? 12 : month - 1 };
    if (year === clock.y && (month === 'all' || month === clock.m))
      previous.to = previous.y * 10000 + (month === 'all' ? clock.m : previous.m) * 100 + clock.d;
  }
  var plans = [], names = irQueryShiftNames(ctx);
  function plan(sql, r) {
    var p = irQueryPlan(ctx); p.sql = sql.replace('$WHERE', irQueryRange(p, r)); plans.push(p); return p;
  }
  plan('SELECT ' + irQueryMetricSql() + ' FROM data WHERE $WHERE', range);
  plan('SELECT ' + irQueryMetricSql() + ' FROM data WHERE $WHERE', previous);
  var day = bucket === 'day' ? 'hijri_day' : 'NULL', groups = 'hijri_year,hijri_month' + (bucket === 'day' ? ',hijri_day' : '');
  plan('SELECT hijri_year y,hijri_month m,' + day + ' d,' + irQueryMetricSql() + ' FROM data WHERE $WHERE GROUP BY ' + groups + ' ORDER BY ' + groups, range);
  plan('SELECT hijri_year y,hijri_month m,' + day + ' d,' + irQueryMetricSql() + ' FROM data WHERE $WHERE GROUP BY ' + groups + ' ORDER BY ' + groups, previous);
  plan('SELECT hijri_month m,hijri_day d,SUM(ben) ben FROM data WHERE $WHERE GROUP BY hijri_month,hijri_day ORDER BY hijri_month,hijri_day', { y: heatYear, to: clock.y * 10000 + clock.m * 100 + clock.d });
  var languages = irQueryPlan(ctx), languageWhere = irQueryRange(languages, range);
  irQueryTopGroups(languages, "SELECT CASE WHEN (l.presence_mask & 1)=0 THEN 'undefined' WHEN l.language IS NULL THEN 'null' ELSE l.language END name,COALESCE(SUM(l.count),0) value,0 previous,MIN(r.sequence) firstSequence,MIN(printf('%020d:%020d',r.sequence,l.position)) orderKey FROM data r JOIN irshad_report_languages l ON l.department_id=r.department_id AND l.report_id=r.report_id WHERE " + languageWhere + ' GROUP BY name', 'لغات أخرى');
  plans.push(languages);
  var locations = irQueryPlan(ctx), locationWhere = irQueryRange(locations, range), previousLocationWhere = irQueryRange(locations, previous);
  irQueryTopGroups(locations, "SELECT location name,SUM(ben) value,COALESCE((SELECT SUM(p.ben) FROM data p WHERE p.location=r.location AND " + previousLocationWhere + "),0) previous,MIN(sequence) firstSequence,MIN(sequence) orderKey FROM data r WHERE " + locationWhere + " AND location IS NOT NULL AND location!='' GROUP BY location", 'مواقع أخرى');
  plans.push(locations);
  plan('SELECT shift name,' + irQueryMetricSql() + ' FROM data WHERE $WHERE GROUP BY shift', range);
  var shiftPoints = irQueryPlan(ctx);
  shiftPoints.sql = 'SELECT shift name,hijri_year y,hijri_month m,' + day + ' d,SUM(ben) ben FROM data WHERE ' + irQueryRange(shiftPoints, range) + ' AND shift IN(SELECT value FROM json_each(' + irQueryParam(shiftPoints, JSON.stringify(names)) + ')) GROUP BY shift,' + groups + ' ORDER BY ' + groups;
  plans.push(shiftPoints);
  var locationNames = catalog.catalogs.locations.values.slice(0, 6), locationPoints = irQueryPlan(ctx);
  locationPoints.sql = 'SELECT location name,hijri_year y,hijri_month m,' + day + ' d,SUM(ben) ben FROM data WHERE ' + irQueryRange(locationPoints, range) + ' AND location IN(SELECT value FROM json_each(' + irQueryParam(locationPoints, JSON.stringify(locationNames)) + ')) GROUP BY location,' + groups + ' ORDER BY ' + groups;
  plans.push(locationPoints);
  plan("SELECT employee_key key,COUNT(*) reports,SUM(ben) ben,MIN(sequence) firstSequence,MAX(sequence) lastSequence FROM data WHERE $WHERE AND employee_key IS NOT NULL AND employee_key!='' GROUP BY employee_key ORDER BY ben DESC,firstSequence LIMIT 6", range);
  var results = await irQueryBatch(ctx, plans), shiftsByName = new Map();
  results[7].forEach(function (r) { shiftsByName.set(r.name, Object.assign({ name: r.name }, irQueryMetrics(r))); });
  var shifts = names.map(function (name) { return shiftsByName.get(name) || Object.assign({ name: name }, irQueryMetrics()); }),
    summaryRows = KIVO_FIND.filter(irQueryText(q.sumQ, 500).trim(), shifts, function (r) { return [r.name, undefined, undefined]; }),
    union = irQueryPlan(ctx), unionWhere = irQueryRange(union, range), matchedNames = summaryRows.map(function (r) { return r.name; });
  union.sql = 'SELECT ' + irQueryMetricSql() + ' FROM data WHERE ' + unionWhere + ' AND shift IN(SELECT value FROM json_each(' + irQueryParam(union, JSON.stringify(matchedNames)) + '))';
  var previousEmployees = new Map(),
    employeeSnapshots = irQueryPlan(ctx), lastSequences = results[10].map(function (r) { return r.lastSequence; }), previousEmployeePlan = irQueryPlan(ctx);
  employeeSnapshots.sql = 'SELECT sequence,employee_name name,shift FROM data WHERE sequence IN(SELECT value FROM json_each(' + irQueryParam(employeeSnapshots, JSON.stringify(lastSequences)) + '))';
  previousEmployeePlan.sql = 'SELECT employee_key key,SUM(ben) ben FROM data WHERE ' + irQueryRange(previousEmployeePlan, previous) + ' AND employee_key IN(SELECT value FROM json_each(' + irQueryParam(previousEmployeePlan, JSON.stringify(results[10].map(function (r) { return r.key; }))) + ')) GROUP BY employee_key';
  var snapshots = new Map();
  var employeeResults = await irQueryBatch(ctx, [union, employeeSnapshots, previousEmployeePlan]), summaryTotals = irQueryMetrics(employeeResults[0][0]);
  employeeResults[1].forEach(function (r) { snapshots.set(r.sequence, r); });
  employeeResults[2].forEach(function (r) { previousEmployees.set(r.key, r.ben); });
  function series(rows, configured) {
    return configured.map(function (name) { return { name: name, points: rows.filter(function (r) { return r.name === name; }).map(function (r) { return { y: r.y, m: r.m, d: r.d, ben: r.ben }; }) }; });
  }
  return { dashboard: { available: { total: total, first: first, years: years, months: availableRows.filter(function (r) { return r.y && r.m; }).map(function (r) { return { y: r.y, m: r.m }; }) },
    selection: selection, totals: irQueryMetrics(results[0][0]), previous: irQueryMetrics(results[1][0]),
    series: results[2], previousSeries: results[3], heat: results[4],
    languages: results[5].map(function (r) { return { name: r.name, value: r.value, firstSequence: r.firstSequence, other: !!r.other }; }),
    locations: results[6].map(function (r) { return Object.assign({}, r, { other: !!r.other }); }), shifts: shifts,
    shiftSeries: series(results[8], names), locationSeries: series(results[9], locationNames),
    employees: results[10].map(function (r) { var snapshot = snapshots.get(r.lastSequence) || {}; return { key: r.key, name: snapshot.name || '—', shift: snapshot.shift || '', reports: r.reports, ben: r.ben, previous: previousEmployees.get(r.key) || 0 }; }),
    summary: { rows: summaryRows, totals: summaryTotals, all: shifts.length, matched: summaryRows.length } } };
}
async function irRead(env, actor, query) {
  var q = query && query.searchParams ? Object.fromEntries(query.searchParams.entries()) : query || {},
    view = q.view || 'calendar', ctx = await irQueryContext(env, actor, q.dept), now = Date.now(),
    clock = Object.assign(cuClock(), { now: now }), out;
  if (view === 'catalogs') out = await irQueryCatalogs(ctx);
  else if (view === 'calendar') out = await irQueryCalendar(ctx, q, clock);
  else if (view === 'records') out = await irQueryRecords(ctx, q, clock);
  else if (view === 'dashboard') out = await irQueryDashboard(ctx, q, clock);
  else throw irError('irshad-query');
  var after = await irQueryContext(env, actor, ctx.d);
  if (after.witness !== ctx.witness) throw irError('irshad-read-race', 409);
  return Object.assign({ ok: 1, dept: ctx.d, base: irQueryBase(ctx), clock: clock, view: view }, out);
}
