/* Seized SQL reads. Only page rows and bounded catalogs reach the application;
   historical aggregates remain in SQL and use the existing scope/Find engines. */
function szQueryScope(ctx, alias) {
  alias = alias || "r";
  if (!/^[a-z][a-z0-9_]*$/i.test(alias)) throw szError("seized-query");
  var args = [ctx.d],
    where = "r.department_id=?1";
  if (ctx.A.enf && ctx.A.u.role !== "super") {
    var V = enfViewCtx(ctx.A, ctx.d, SZ_RES[0], ctx.refs);
    if (ENF_PROJ[SZ_RES[0]].on(V)) {
      var es = enfEmpScopeOf(V.E, ctx.d, V.ekey, "Shift"),
        allowed = [],
        monthly = [];
      if (es && es.mode === "list")
        (es.list || []).forEach(function (s) {
          if (V.shiftOk(s, "")) allowed.push(String(s));
        });
      else if (es && es.mode === "staffing-bound")
        Object.keys(ctx.refs.staffing[ctx.d] || {}).forEach(function (ym) {
          var p = ym.split("-"),
            row = (ctx.refs.staffing[ctx.d][ym] || {})[V.ekey],
            shift = row && row.shift;
          if (
            p.length === 2 &&
            Number(p[0]) + "-" + Number(p[1]) === ym &&
            shift &&
            V.shiftOk(shift, ym)
          )
            monthly.push({
              y: Number(p[0]),
              m: Number(p[1]),
              shift: String(shift),
            });
        });
      if (!(es && es.mode === "n/a")) {
        args.push(JSON.stringify(allowed), JSON.stringify(monthly));
        where +=
          " AND(r.shift IS NULL OR r.shift='' OR r.hijri_year IS NULL OR r.hijri_month IS NULL OR r.shift IN(SELECT value FROM json_each(?2))OR EXISTS(SELECT 1 FROM json_each(?3)a WHERE r.hijri_year=json_extract(a.value,'$.y')AND r.hijri_month=json_extract(a.value,'$.m')AND r.shift=json_extract(a.value,'$.shift')))";
      }
    }
  }
  return { args: args, sql: where.replace(/\br\./g, alias + ".") };
}
async function szReadBatch(ctx, statements) {
  try {
    var guards = ctx.guards.concat([
        rsEpochGuard(ctx.env.DB, ctx.base.epoch),
        szRetiredGuard(ctx.env),
      ]),
      out = await ctx.env.DB.batch(guards.concat(statements));
    return out.slice(guards.length).map(function (r) {
      if (!r || r.success === false) throw szError("seized-read", 503);
      return r.results || [];
    });
  } catch (e) {
    if (/KIVO_SEIZED_LEGACY_SOURCE/.test(String(e)))
      throw szError("seized-legacy-source-present", 503);
    if (/KIVO_RESTORE_TARGET|KIVO_RESTORE_EPOCH/.test(String(e)))
      throw szError("seized-read-race", 409);
    throw e;
  }
}
async function szCatalogSnapshot(ctx) {
  var kinds = ["resources", "categories", "catalogItems", "actions", "lists"],
    rows = await szReadBatch(
      ctx,
      kinds.map(function (k) {
        return ctx.env.DB.prepare(
          "SELECT * FROM " +
            SZ_TABLES[k][0] +
            " WHERE department_id=?1" +
            (k === "resources"
              ? " AND resource IN('catalog','actions','locations','jew')"
              : ""),
        ).bind(ctx.d);
      }),
    ),
    domain = szEmptyDomain(ctx.d);
  kinds.forEach(function (k, i) {
    domain.rows[k] = rows[i];
  });
  domain.rows.resources.forEach(function (r) {
    domain.resources[r.resource] = true;
  });
  szValidateDomain(domain, ctx.d);
  var docs = szInflate(domain),
    effective = {
      // Same presentation as the original loaders. Raw null/empty/absence
      // remain distinct in domain/export; a read never installs defaults.
      catalog:
        docs.catalog &&
        Array.isArray(docs.catalog.cats) &&
        docs.catalog.cats.length
          ? docs.catalog
          : SZ_DEFAULTS.catalog,
      actions:
        Array.isArray(docs.actions) && docs.actions.length
          ? docs.actions
          : SZ_DEFAULTS.actions,
      locations: Array.isArray(docs.locations) ? docs.locations : [],
      jew:
        Array.isArray(docs.jew) && docs.jew.length
          ? docs.jew.filter(function (v) {
              return typeof v === "string" && v && v !== "أخرى";
            })
          : SZ_DEFAULTS.kinds,
    },
    guards = [];
  kinds.forEach(function (k, i) {
    guards.push.apply(
      guards,
      rsWitness(
        ctx.env,
        SZ_TABLES[k][0],
        SZ_TABLES[k][1],
        rows[i],
        "department_id=?1" +
          (k === "resources"
            ? " AND resource IN('catalog','actions','locations','jew')"
            : ""),
        [ctx.d],
      ),
    );
  });
  return { domain: domain, docs: docs, effective: effective, guards: guards };
}
function szCatalogDto(snapshot) {
  var out = {};
  ["catalog", "actions", "locations", "jew"].forEach(function (k) {
    out[k] = {
      present: snapshot.domain.resources[k],
      value: snapshot.effective[k],
    };
  });
  return { catalogs: out };
}
function szCatalogIndex(snapshot) {
  var out = [];
  ((snapshot.effective.catalog || {}).cats || []).forEach(function (c) {
    (c.items || []).forEach(function (i) {
      out.push({
        id: String(i.id),
        name: i.name || "",
        category: c.name || "",
        color: c.color || "#94a3b8",
        unit: i.unit || "pc",
      });
    });
  });
  return out;
}
function szShiftExpression(ctx, p) {
  var configured = parseJson(
      ctx.rawKeys["bsdept:" + ctx.d + ":bassam_shift_options_v1"],
      null,
    ),
    periods = [];
  if (
    Array.isArray(configured) &&
    configured.length &&
    configured.every(function (s) {
      return s && s.name;
    })
  )
    configured.forEach(function (s) {
      function minute(t) {
        var a = String(t || "").split(":");
        return a.length === 2 &&
          Number.isFinite(+a[0]) &&
          Number.isFinite(+a[1])
          ? 60 * +a[0] + +a[1]
          : null;
      }
      var from = minute(s.tStart),
        to = minute(s.tEnd);
      if (from !== null && to !== null)
        periods.push({ name: s.name, from: from, to: to });
    });
  var slot = irQueryParam(p, JSON.stringify(periods)),
    minute =
      "(CAST(strftime('%H',r.created_at/1000,'unixepoch','+3 hours')AS INTEGER)*60+CAST(strftime('%M',r.created_at/1000,'unixepoch','+3 hours')AS INTEGER))",
    from = "json_extract(s.value,'$.from')",
    to = "json_extract(s.value,'$.to')";
  // Operational time is Riyadh, matching the server's Hijri date contract.
  return (
    "CASE WHEN COALESCE(r.shift,'')!='' THEN r.shift WHEN COALESCE(r.created_at,0)=0 THEN '' ELSE COALESCE((SELECT json_extract(s.value,'$.name')FROM json_each(" +
    slot +
    ")s WHERE (" +
    from +
    "<=" +
    to +
    " AND " +
    minute +
    ">=" +
    from +
    " AND " +
    minute +
    "<" +
    to +
    ")OR(" +
    from +
    ">" +
    to +
    " AND(" +
    minute +
    ">=" +
    from +
    " OR " +
    minute +
    "<" +
    to +
    "))ORDER BY CAST(s.key AS INTEGER)LIMIT 1),'')END"
  );
}
function szPlan(ctx, catalog, range) {
  var scope = ctx.recordViewScope || szQueryScope(ctx),
    p = { args: scope.args.slice(), sql: "" };
  if (range)
    scope = { sql: scope.sql + " AND(" + irQueryRange(p, range) + ")" };
  var slot = irQueryParam(p, JSON.stringify(szCatalogIndex(catalog))),
    displayShift = szShiftExpression(ctx, p);
  p.prefix =
    "WITH catalog AS(SELECT json_extract(value,'$.id')id,json_extract(value,'$.name')name,json_extract(value,'$.category')category,json_extract(value,'$.color')color,json_extract(value,'$.unit')unit FROM json_each(" +
    slot +
    ")), scoped AS(SELECT r.* FROM seized_reports r WHERE " +
    scope.sql +
    "), line AS(SELECT i.*,COALESCE(c.name,'')item_name,COALESCE(c.category,'')category,COALESCE(c.color,'#94a3b8')color,CASE WHEN COALESCE(c.unit,'pc')='sar' THEN 1 ELSE CAST(COALESCE(i.quantity,0)AS INTEGER)END qty,CASE COALESCE(c.unit,'pc')WHEN 'sar' THEN CAST(COALESCE(i.quantity,0)AS INTEGER)WHEN 'pcval' THEN CAST(COALESCE(i.value,0)AS INTEGER)ELSE 0 END sar FROM seized_items i JOIN scoped r ON i.department_id=r.department_id AND i.report_id=r.report_id LEFT JOIN catalog c ON i.id_token=c.id), data AS(SELECT r.*," +
    displayShift +
    " effective_shift,COALESCE(NULLIF(r.actor_key,''),NULLIF(r.employee_key,''),r.actor_label,'')rec_key,COALESCE(NULLIF(r.actor_label,''),r.employee_name,'')rec_name,COALESCE((SELECT SUM(qty)FROM line i WHERE i.report_id=r.report_id),0)qty,COALESCE((SELECT SUM(sar)FROM line i WHERE i.report_id=r.report_id),0)sar FROM scoped r) ";
  return p;
}
function szRecordViewScope(ctx, q, clock) {
  var scope = szQueryScope(ctx),
    context = szDayContext(ctx, q, clock);
  if (context.locked) {
    var actorKey = String(ctx.A.u.ekey || ctx.A.u.id || ctx.A.u.un || ""),
      parts = [
        "COALESCE(NULLIF(r.actor_key,''),NULLIF(r.employee_key,''),r.actor_label,'')=?" +
          (scope.args.length + 1),
      ];
    scope.args.push(actorKey);
    if (context.myEmp) {
      parts.push("r.employee_key=?" + (scope.args.length + 1));
      scope.args.push(context.myEmp.eid);
    }
    scope.sql += " AND(" + parts.join(" OR ") + ")";
  }
  return scope;
}
async function szPlans(ctx, plans) {
  return szReadBatch(
    ctx,
    plans.map(function (p) {
      return rsBound(ctx.env.DB.prepare(p.prefix + p.sql), p.args);
    }),
  );
}
function szMetricsSql() {
  return "COUNT(*) reports,COALESCE(SUM(qty),0)qty,COALESCE(SUM(sar),0)sar,COUNT(DISTINCT NULLIF(rec_key,''))employees";
}
function szMetrics(row, actions) {
  return {
    reports: Number((row && row.reports) || 0),
    qty: Number((row && row.qty) || 0),
    sar: Number((row && row.sar) || 0),
    employees: Number((row && row.employees) || 0),
    actions: actions || {},
  };
}
async function szReportSnapshot(ctx, where, args) {
  var names = ["reports", "items", "photos", "history"],
    query = names.map(function (k) {
      return rsBound(
        ctx.env.DB.prepare(
          "SELECT * FROM " + SZ_TABLES[k][0] + " WHERE " + where,
        ),
        args,
      );
    });
  query.push(
    ctx.env.DB.prepare(
      "SELECT * FROM seized_resource_state WHERE department_id=?1 AND resource='reports'",
    ).bind(ctx.d),
  );
  var result = await szReadBatch(ctx, query),
    domain = szEmptyDomain(ctx.d),
    guards = [];
  names.forEach(function (k, i) {
    domain.rows[k] = result[i];
    guards.push.apply(
      guards,
      rsWitness(
        ctx.env,
        SZ_TABLES[k][0],
        SZ_TABLES[k][1],
        result[i],
        where,
        args,
      ),
    );
  });
  domain.rows.resources = result[4];
  domain.resources.reports = result[4].length > 0;
  guards.push.apply(
    guards,
    rsWitness(
      ctx.env,
      SZ_TABLES.resources[0],
      SZ_TABLES.resources[1],
      result[4],
      "department_id=?1 AND resource='reports'",
      [ctx.d],
    ),
  );
  szValidateDomain(domain, ctx.d);
  return {
    domain: domain,
    reports: (szInflate(domain).reports || {}).reports || [],
    guards: guards,
  };
}
async function szRows(ctx, ids) {
  if (!ids.length) return [];
  var snap = await szReportSnapshot(
      ctx,
      "department_id=?1 AND report_id IN(SELECT value FROM json_each(?2))",
      [ctx.d, JSON.stringify(ids)],
    ),
    by = new Map();
  snap.reports.forEach(function (r) {
    by.set(r.id, r);
  });
  return ids.map(function (id) {
    if (!by.has(id)) throw szError("seized-read-race", 409);
    return by.get(id);
  });
}
async function szCalendar(ctx, q, clock, catalog) {
  var y = irQueryInt(q.year, clock.y, 1000, 9999),
    m = irQueryInt(q.month, clock.m, 1, 12),
    plans = [];
  function add(sql) {
    var p = szPlan(
      ctx,
      catalog,
      sql.indexOf("$MONTH") >= 0 ? { y: y, m: m } : null,
    );
    if (sql.indexOf("$MONTH") >= 0)
      sql = sql.replace("$MONTH", irQueryMonth(p, y, m));
    if (sql.indexOf("$YEAR") >= 0)
      sql = sql.replace("$YEAR", irQueryParam(p, y));
    p.sql = sql;
    plans.push(p);
  }
  add(
    "SELECT COUNT(*)total,COALESCE(SUM(hijri_year=$YEAR),0)yearTotal FROM data",
  );
  add(
    "SELECT hijri_month m,COUNT(*)n FROM data WHERE hijri_year=$YEAR GROUP BY hijri_month ORDER BY hijri_month",
  );
  add(
    "SELECT hijri_day d,COUNT(*)n FROM data WHERE $MONTH GROUP BY hijri_day ORDER BY hijri_day",
  );
  add("SELECT " + szMetricsSql() + " FROM data WHERE $MONTH");
  add(
    "SELECT i.action_key k,SUM(i.qty)qty FROM line i JOIN data r ON i.report_id=r.report_id WHERE $MONTH GROUP BY i.action_key",
  );
  add(
    "SELECT DISTINCT COALESCE(location,'')value FROM data WHERE $MONTH ORDER BY value",
  );
  var r = await szPlans(ctx, plans),
    actions = {};
  r[4].forEach(function (x) {
    actions[x.k || ""] = x.qty;
  });
  return {
    year: y,
    month: m,
    total: r[0][0].total,
    yearTotal: r[0][0].yearTotal,
    months: r[1].filter(function (x) {
      return x.m >= 1 && x.m <= 12;
    }),
    days: r[2].filter(function (x) {
      return x.d >= 1 && x.d <= 30;
    }),
    monthTotals: szMetrics(r[3][0], actions),
    facets: {
      locations: r[5].map(function (x) {
        return x.value;
      }),
    },
  };
}
async function szRecords(ctx, q, clock, catalog) {
  var y = irQueryInt(q.year, clock.y, 1000, 9999),
    m = irQueryInt(q.month, clock.m, 1, 12),
    limit = irQueryInt(q.limit, 10, 1, 200),
    term = irQueryText(q.q, 500).trim(),
    loc = q.loc == null ? null : irQueryText(q.loc, 4000),
    category = q.category == null ? null : irQueryText(q.category, 4000),
    action = q.action == null ? null : irQueryText(q.action, 4000),
    descriptor = {
      year: y,
      month: m,
      day: irQueryInt(q.day, clock.d, 1, 30),
      limit: limit,
      q: term,
      loc: loc,
      category: category,
      action: action,
    },
    token = null;
  if (q.cursor) {
    try {
      token = cuUncursor(irQueryText(q.cursor, 12000));
    } catch (e) {
      throw szError("seized-cursor");
    }
    szShape(token, ["v", "uid", "dept", "w", "query", "page"], "cursor");
  }
  var page = irQueryInt(
    q.page,
    token ? token.page : 1,
    1,
    Number.MAX_SAFE_INTEGER,
  );
  if (
    token &&
    (token.v !== 1 ||
      token.uid !== ctx.A.u.id ||
      token.dept !== ctx.d ||
      token.w !== ctx.witness ||
      !deq(token.query, descriptor) ||
      token.page !== page)
  )
    throw szError("seized-cursor-stale", 409);
  function where(p) {
    var w = irQueryMonth(p, y, m);
    if (loc !== null && loc !== "all")
      w += " AND COALESCE(location,'')=" + irQueryParam(p, loc);
    if (category !== null && category !== "all")
      w +=
        " AND EXISTS(SELECT 1 FROM line i WHERE i.report_id=data.report_id AND i.category=" +
        irQueryParam(p, category) +
        ")";
    if (action !== null && action !== "all")
      w +=
        " AND EXISTS(SELECT 1 FROM line i WHERE i.report_id=data.report_id AND i.action_key=" +
        irQueryParam(p, action) +
        ")";
    return w;
  }
  var ids = null;
  if (term) {
    var search = szPlan(ctx, catalog, { y: y, m: m });
    search.sql =
      "SELECT report_id,rec_name,location,record_number,(SELECT json_group_array(item_name||' '||CASE WHEN kind='أخرى' THEN COALESCE(NULLIF(trim(kind_text),''),'أخرى')ELSE COALESCE(kind,'')END)FROM line i WHERE i.report_id=data.report_id)items FROM data WHERE " +
      where(search);
    ids = (await szPlans(ctx, [search]))[0]
      .filter(function (r) {
        return KIVO_FIND.match(
          term,
          [r.rec_name, r.location, r.record_number].concat(
            parseJson(r.items, []),
          ),
        );
      })
      .map(function (r) {
        return r.report_id;
      });
  }
  function matches(p) {
    return (
      where(p) +
      (ids
        ? " AND report_id IN(SELECT value FROM json_each(" +
          irQueryParam(p, JSON.stringify(ids)) +
          "))"
        : "")
    );
  }
  var count = szPlan(ctx, catalog, { y: y, m: m });
  count.sql = "SELECT COUNT(*)n FROM data WHERE " + matches(count);
  var total = (await szPlans(ctx, [count]))[0][0].n,
    pages = Math.max(1, Math.ceil(total / limit));
  page = Math.min(page, pages);
  var selected = szPlan(ctx, catalog, { y: y, m: m });
  selected.sql =
    "SELECT report_id FROM data WHERE " +
    matches(selected) +
    " ORDER BY COALESCE(hijri_day,0)DESC,COALESCE(created_at,0)DESC,sequence LIMIT " +
    limit +
    " OFFSET " +
    (page - 1) * limit;
  var selectedIds = (await szPlans(ctx, [selected]))[0].map(function (r) {
      return r.report_id;
    }),
    rows = await szRows(ctx, selectedIds),
    calendar = await szCalendar(ctx, q, clock, catalog);
  function cursor(n) {
    return cuCursor({
      v: 1,
      uid: ctx.A.u.id,
      dept: ctx.d,
      w: ctx.witness,
      query: descriptor,
      page: n,
    });
  }
  return Object.assign(calendar, {
    rows: rows,
    total: total,
    monthTotal: calendar.monthTotals.reports,
    page: page,
    pageSize: limit,
    next: page < pages ? cursor(page + 1) : "",
    prev: page > 1 ? cursor(page - 1) : "",
  });
}
function szReference(ctx, name) {
  var k = "bsdept:" + ctx.d + ":" + name;
  if (!canRead(ctx.A, k)) return null;
  return parseJson(enfProjectStr(ctx.A, k, ctx.rawKeys[k], ctx.refs), null);
}
function szDayContext(ctx, q, clock) {
  var y = irQueryInt(q.year, clock.y, 1000, 9999),
    m = irQueryInt(q.month, clock.m, 1, 12),
    day = irQueryInt(q.day, clock.d, 1, 30),
    key = y + "-" + m + "-" + day,
    employees = szReference(ctx, "bassam_employees_v1"),
    index = Object.create(null);
  (Array.isArray(employees) ? employees : []).forEach(function (e) {
    [e.eid, e.nid, e.name].forEach(function (k) {
      if (k) index[String(k)] = e;
    });
  });
  var report = (szReference(ctx, "bassam_dreport_v1") || {})[key],
    staff = (szReference(ctx, "bassam_staffing_v3") || {})[y + "-" + m] || {},
    round = (szReference(ctx, "bassam_rounds_v1") || {})[key],
    shifts = [],
    rows = {},
    leaders = {},
    spots = {},
    labels = [],
    weekday = typeof q.weekday === "string" ? q.weekday : "";
  Object.keys((report && report.shifts) || {}).forEach(function (shift) {
    var s = report.shifts[shift];
    if (!s || !s.pulled) return;
    shifts.push(shift);
    leaders[shift] = {
      chief: (s.leaders && s.leaders.chief) || "",
      deputy: (s.leaders && s.leaders.deputy) || "",
    };
    rows[shift] = (s.roster || [])
      .map(function (r) {
        if (!r || !r.ekey || ["ab", "pm", "lv"].indexOf(r.st || "pr") >= 0)
          return null;
        var e = index[String(r.ekey)],
          assignment =
            staff[r.ekey] || (e && (staff[e.eid] || staff[e.nid])) || {},
          rest = (s.rest && s.rest[r.ekey]) || assignment.rest || [];
        if (
          weekday &&
          Array.isArray(rest) &&
          rest.some(function (v) {
            return (
              v === weekday || "ال" + v === weekday || v === "ال" + weekday
            );
          })
        )
          return null;
        return {
          eid: e ? e.eid : r.ekey,
          name: (e && e.name) || r.name || r.ekey,
          key: r.ekey,
          tin: !!r.tin,
        };
      })
      .filter(Boolean);
  });
  var lens = function (k) {
    return KIVO_BUILD.lensGate(ctx.A.perms, ctx.A.u, ctx.d, k).on;
  };
  (round && Array.isArray(round.d) ? round.d : []).forEach(function (floor) {
    ["gates", "zones"].forEach(function (kind) {
      if (!lens(kind)) return;
      (floor[kind] || []).forEach(function (item) {
        if (!item) return;
        var label =
          kind === "zones"
            ? item.code || item.name || "مصلى"
            : item.label || "باب " + (item.num || "");
        if (labels.indexOf(label) < 0) labels.push(label);
        (item.emp || []).forEach(function (k) {
          var e = index[String(k)];
          spots[e ? e.eid : String(k)] = label;
        });
      });
    });
  });
  var me = ctx.A.u,
    my = index[String(me.ekey)] || null,
    isMgr =
      me.role === "super" ||
      me.role === "dept" ||
      me.role === "gm" ||
      (me.role === "staff" && !!me.mgr),
    myRow = null,
    present = [],
    seen = new Set(),
    leader = false;
  shifts.forEach(function (s) {
    rows[s].forEach(function (r) {
      if (!seen.has(r.eid)) {
        seen.add(r.eid);
        present.push(r);
      }
      if (my && r.eid === my.eid)
        myRow = { shift: s, eid: r.eid, name: r.name };
    });
    if (
      my &&
      [leaders[s].chief, leaders[s].deputy].some(function (k) {
        return k && (k === my.name || k === my.eid || k === my.nid);
      })
    )
      leader = true;
  });
  var dayShift = (szReference(ctx, "bassam_dayshift_v1") || {})[key] || "";
  if (typeof dayShift !== "string") dayShift = "";
  // BassamDayShift.get pins ordinary staff to their pulled/monthly shift.
  if (me.role === "staff" && !/^mgr:/.test(String(me.ekey || ""))) {
    var mine = "";
    Object.keys((report && report.shifts) || {}).some(function (n) {
      var sr = report.shifts[n];
      if (!sr || !sr.pulled) return false;
      return (sr.roster || []).some(function (r) {
        if (!r || !r.ekey) return false;
        var emp = index[String(r.ekey)],
          matched = my ? emp && emp.eid === my.eid : r.ekey === me.ekey;
        if (matched) mine = n;
        return matched;
      });
    });
    if (!mine) {
      var monthly = staff[my ? my.eid : me.ekey] || (my && staff[my.nid]);
      mine = (monthly && monthly.shift) || "";
    }
    dayShift = mine;
  }
  return {
    year: y,
    month: m,
    day: day,
    rep: !!report,
    shifts: shifts,
    rows: rows,
    leaders: leaders,
    spots: spots,
    labels: labels,
    present: present,
    myEmp: my ? { eid: my.eid, name: my.name, nid: my.nid } : null,
    isMgr: isMgr,
    amLeader: leader,
    locked: me.role === "staff" && !isMgr && !leader,
    myRow: myRow,
    dayShift: shifts.indexOf(dayShift) >= 0 ? dayShift : shifts[0] || dayShift,
    hasRound: !!(
      round &&
      Array.isArray(round.d) &&
      round.d.length &&
      (lens("gates") || lens("zones"))
    ),
  };
}
async function hSeizedGet(env, A, url) {
  var q =
      url && url.searchParams
        ? Object.fromEntries(url.searchParams)
        : url || {},
    view = q.view || "calendar",
    ctx = await szQueryContext(env, A, q.dept),
    clock = Object.assign(cuClock(), { now: Date.now() }),
    catalog = await szCatalogSnapshot(ctx),
    out;
  if (view === "calendar" || view === "records")
    ctx.recordViewScope = szRecordViewScope(ctx, q, clock);
  if (view === "catalogs") out = szCatalogDto(catalog);
  else if (view === "calendar") out = await szCalendar(ctx, q, clock, catalog);
  else if (view === "records") out = await szRecords(ctx, q, clock, catalog);
  else if (view === "context") out = { context: szDayContext(ctx, q, clock) };
  else if (view === "dashboard")
    out = await szDashboard(ctx, q, clock, catalog);
  else throw szError("seized-query");
  if ((await szQueryContext(env, A, ctx.d)).witness !== ctx.witness)
    throw szError("seized-read-race", 409);
  return Object.assign(
    { ok: 1, dept: ctx.d, view: view, clock: clock, base: ctx.base },
    out,
  );
}
