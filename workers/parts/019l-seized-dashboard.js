/* Dashboard aggregates over scoped typed rows, never a whole reports document. */
function szDashboardPlan(ctx, catalog, range, previous) {
  var p = szPlan(ctx, catalog),
    current = irQueryRange(p, range),
    prior = irQueryRange(p, previous);
  p.prefix +=
    ", selected AS(SELECT * FROM data WHERE " +
    current +
    "), previous AS(SELECT * FROM data WHERE " +
    prior +
    ") ";
  return p;
}
function szActionMetrics(source, correlation) {
  return (
    "COALESCE((SELECT json_group_object(k,n)FROM(SELECT COALESCE(i.action_key,'')k,SUM(i.qty)n FROM line i JOIN " +
    source +
    " x ON i.report_id=x.report_id WHERE " +
    (correlation || "1") +
    " GROUP BY i.action_key)),'{}')actions"
  );
}
function szDashboardMetric(row) {
  return szMetrics(row, parseJson((row && row.actions) || "{}", {}));
}
async function szDashboard(ctx, q, clock, catalog) {
  var available = szPlan(ctx, catalog);
  available.sql =
    "SELECT hijri_year y,hijri_month m,MIN(hijri_day)d,COUNT(*)n FROM data GROUP BY hijri_year,hijri_month ORDER BY hijri_year,hijri_month";
  var availability = (await szPlans(ctx, [available]))[0],
    years = [],
    first = null,
    total = 0;
  availability.forEach(function (r) {
    total += r.n;
    if (r.y && years.indexOf(r.y) < 0) years.push(r.y);
    if (r.y && r.m && r.d != null) {
      var c = { y: r.y, m: r.m, d: r.d };
      if (
        !first ||
        c.y * 10000 + c.m * 100 + c.d <
          first.y * 10000 + first.m * 100 + first.d
      )
        first = c;
    }
  });
  years.sort(function (a, b) {
    return b - a;
  });
  if (!years.length) years.push(clock.y);
  var mode = q.mode || "all",
    year = irQueryInt(q.year, years[0], 1000, 9999),
    month =
      q.month === "all" || mode === "all"
        ? "all"
        : irQueryInt(q.month, clock.m, 1, 12),
    heatYear = irQueryInt(q.heatYear, year, 1000, 9999),
    bucket = q.bucket || (month === "all" ? "month" : "day"),
    range = {},
    previous = null,
    selection = {
      mode: mode,
      year: year,
      month: month,
      heatYear: heatYear,
      bucket: bucket,
      from: null,
      to: null,
      previousFrom: null,
      previousTo: null,
    };
  if (
    ["all", "month", "custom"].indexOf(mode) < 0 ||
    ["day", "month"].indexOf(bucket) < 0
  )
    throw szError("seized-range");
  if (mode === "custom") {
    var from = irQueryDate(q.from),
      to = irQueryDate(q.to),
      pf = irQueryDate(q.previousFrom),
      pt = irQueryDate(q.previousTo);
    if (from.n > to.n || pf.n > pt.n) throw szError("seized-range");
    range = { from: from.n, to: to.n };
    previous = { from: pf.n, to: pt.n };
    Object.assign(selection, {
      from: from.text,
      to: to.text,
      previousFrom: pf.text,
      previousTo: pt.text,
    });
  } else if (mode === "month") {
    range = { y: year };
    if (month !== "all") range.m = month;
    previous =
      month === "all"
        ? { y: year - 1 }
        : { y: month === 1 ? year - 1 : year, m: month === 1 ? 12 : month - 1 };
    if (year === clock.y && (month === "all" || month === clock.m))
      previous.to =
        previous.y * 10000 +
        (month === "all" ? clock.m : previous.m) * 100 +
        clock.d;
  }
  var plans = [],
    names = irQueryShiftNames(ctx),
    day = bucket === "day" ? "hijri_day" : "NULL",
    group = "hijri_year,hijri_month" + (bucket === "day" ? ",hijri_day" : ""),
    correlation =
      "x.hijri_year IS r.hijri_year AND x.hijri_month IS r.hijri_month" +
      (bucket === "day" ? " AND x.hijri_day IS r.hijri_day" : "");
  function add(sql) {
    var p = szDashboardPlan(ctx, catalog, range, previous);
    p.sql = sql;
    plans.push(p);
    return p;
  }
  add(
    "SELECT " +
      szMetricsSql() +
      "," +
      szActionMetrics("selected") +
      " FROM selected",
  );
  add(
    "SELECT " +
      szMetricsSql() +
      "," +
      szActionMetrics("previous") +
      " FROM previous",
  );
  add(
    "SELECT hijri_year y,hijri_month m," +
      day +
      " d," +
      szMetricsSql() +
      "," +
      szActionMetrics("selected", correlation) +
      " FROM selected r GROUP BY " +
      group +
      " ORDER BY " +
      group,
  );
  add(
    "SELECT hijri_year y,hijri_month m," +
      day +
      " d," +
      szMetricsSql() +
      "," +
      szActionMetrics("previous", correlation) +
      " FROM previous r GROUP BY " +
      group +
      " ORDER BY " +
      group,
  );
  var heat = szPlan(ctx, catalog);
  heat.sql =
    "SELECT hijri_year y,hijri_month m,hijri_day d,SUM(qty)qty FROM data WHERE hijri_year=" +
    irQueryParam(heat, heatYear) +
    " GROUP BY hijri_month,hijri_day ORDER BY hijri_month,hijri_day";
  plans.push(heat);
  var categories = szDashboardPlan(ctx, catalog, range, previous);
  irQueryTopGroups(
    categories,
    "SELECT i.category name,SUM(i.qty)value,0 previous,MIN(r.sequence)firstSequence,MIN(printf('%020d:%020d',r.sequence,i.position))orderKey FROM line i JOIN selected r ON i.report_id=r.report_id GROUP BY i.category",
    "تصنيفات أخرى",
  );
  plans.push(categories);
  var locations = szDashboardPlan(ctx, catalog, range, previous);
  irQueryTopGroups(
    locations,
    "SELECT location name,SUM(qty)value,COALESCE((SELECT SUM(p.qty)FROM previous p WHERE p.location IS r.location),0)previous,MIN(sequence)firstSequence,MIN(sequence)orderKey FROM selected r WHERE location IS NOT NULL AND location!='' GROUP BY location",
    "مواقع أخرى",
  );
  plans.push(locations);
  add(
    "SELECT effective_shift name," +
      szMetricsSql() +
      "," +
      szActionMetrics("selected", "x.effective_shift IS r.effective_shift") +
      " FROM selected r GROUP BY effective_shift",
  );
  var shiftPoints = add("");
  shiftPoints.sql =
    "SELECT effective_shift name,hijri_year y,hijri_month m," +
    day +
    " d,SUM(qty)qty FROM selected WHERE effective_shift IN(SELECT value FROM json_each(" +
    irQueryParam(shiftPoints, JSON.stringify(names)) +
    ")) GROUP BY effective_shift," +
    group +
    " ORDER BY " +
    group;
  var locationNames = Array.isArray(catalog.effective.locations)
      ? catalog.effective.locations.slice(0, 6)
      : [],
    locationPoints = add("");
  locationPoints.sql =
    "SELECT location name,hijri_year y,hijri_month m," +
    day +
    " d,SUM(qty)qty FROM selected WHERE location IN(SELECT value FROM json_each(" +
    irQueryParam(locationPoints, JSON.stringify(locationNames)) +
    ")) GROUP BY location," +
    group +
    " ORDER BY " +
    group;
  add(
    "SELECT rec_key key,COUNT(*)reports,SUM(qty)qty,MIN(sequence)firstSequence,MAX(sequence)lastSequence FROM selected WHERE rec_key!='' GROUP BY rec_key ORDER BY qty DESC,firstSequence LIMIT 6",
  );
  var results = await szPlans(ctx, plans),
    byShift = new Map();
  results[7].forEach(function (r) {
    byShift.set(r.name, Object.assign({ name: r.name }, szDashboardMetric(r)));
  });
  var shifts = names.map(function (n) {
      return byShift.get(n) || Object.assign({ name: n }, szMetrics());
    }),
    summaryRows = KIVO_FIND.filter(
      irQueryText(q.sumQ, 500).trim(),
      shifts,
      function (r) {
        return [r.name, undefined, undefined];
      },
    ),
    summary = szDashboardPlan(ctx, catalog, range, previous),
    selectedNames = irQueryParam(
      summary,
      JSON.stringify(
        summaryRows.map(function (r) {
          return r.name;
        }),
      ),
    );
  summary.prefix +=
    ", summary AS(SELECT * FROM selected WHERE effective_shift IN(SELECT value FROM json_each(" +
    selectedNames +
    "))) ";
  summary.sql =
    "SELECT " +
    szMetricsSql() +
    "," +
    szActionMetrics("summary") +
    " FROM summary";
  var snapshots = szDashboardPlan(ctx, catalog, range, previous);
  snapshots.sql =
    "SELECT sequence,rec_name name,effective_shift shift FROM selected WHERE sequence IN(SELECT value FROM json_each(" +
    irQueryParam(
      snapshots,
      JSON.stringify(
        results[10].map(function (r) {
          return r.lastSequence;
        }),
      ),
    ) +
    "))";
  var previousEmployees = szDashboardPlan(ctx, catalog, range, previous);
  previousEmployees.sql =
    "SELECT rec_key key,SUM(qty)qty FROM previous WHERE rec_key IN(SELECT value FROM json_each(" +
    irQueryParam(
      previousEmployees,
      JSON.stringify(
        results[10].map(function (r) {
          return r.key;
        }),
      ),
    ) +
    ")) GROUP BY rec_key";
  var extra = await szPlans(ctx, [summary, snapshots, previousEmployees]),
    last = new Map(),
    prior = new Map();
  extra[1].forEach(function (r) {
    last.set(r.sequence, r);
  });
  extra[2].forEach(function (r) {
    prior.set(r.key, r.qty);
  });
  function points(rows) {
    return rows.map(function (r) {
      return Object.assign({ y: r.y, m: r.m, d: r.d }, szDashboardMetric(r));
    });
  }
  function series(rows, configured) {
    return configured.map(function (n) {
      return {
        name: n,
        series: rows
          .filter(function (r) {
            return r.name === n;
          })
          .map(function (r) {
            return { y: r.y, m: r.m, d: r.d, qty: r.qty };
          }),
      };
    });
  }
  var color = new Map();
  ((catalog.effective.catalog || {}).cats || []).forEach(function (c) {
    color.set(c.name, c.color || "#94a3b8");
  });
  return {
    dashboard: {
      available: {
        total: total,
        years: years,
        first: first,
        months: availability
          .filter(function (r) {
            return r.y && r.m;
          })
          .map(function (r) {
            return { y: r.y, m: r.m };
          }),
      },
      selection: selection,
      totals: szDashboardMetric(results[0][0]),
      previous: szDashboardMetric(results[1][0]),
      series: points(results[2]),
      previousSeries: points(results[3]),
      heat: results[4],
      categories: results[5].map(function (r) {
        return {
          name: r.name,
          value: r.value,
          color: color.get(r.name) || "#94a3b8",
          other: !!r.other,
        };
      }),
      locations: results[6].map(function (r) {
        return {
          name: r.name,
          value: r.value,
          previous: r.previous,
          other: !!r.other,
        };
      }),
      employees: results[10].map(function (r) {
        var snap = last.get(r.lastSequence) || {};
        return {
          key: r.key,
          name: snap.name || "—",
          shift: snap.shift || "",
          qty: r.qty,
          reports: r.reports,
          previous: prior.get(r.key) || 0,
        };
      }),
      shifts: shifts,
      shiftSeries: series(results[8], names),
      locationSeries: series(results[9], locationNames),
      summary: {
        rows: summaryRows,
        totals: szDashboardMetric(extra[0][0]),
        all: shifts.length,
        matched: summaryRows.length,
      },
    },
  };
}
