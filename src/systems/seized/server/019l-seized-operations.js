/* Closed commands over affected rows; one commit includes data, images,
   revisions, notifications, request receipt and audit. */
function szCheckBase(base) {
  szShape(base, ["epoch"].concat(SZ_NAMES), "base");
  ["epoch"].concat(SZ_NAMES).forEach(function (k) {
    if (!Number.isSafeInteger(base[k]) || base[k] < 0)
      throw szError("seized-base");
  });
}
function szAffected(b) {
  return b.op === "catalog-replace"
    ? [b.kind]
    : b.op === "jew-rename"
      ? ["reports", "jew"]
      : ["reports"];
}
function szAuthority(ctx, b, affectedItems) {
  (b.op === "jew-rename" && !(affectedItems > 0)
    ? ["jew"]
    : szAffected(b)
  ).forEach(function (resource) {
    var k = szKey(ctx.d, SZ_NAMES.indexOf(resource));
    if (
      !deptInScope(ctx.A, ctx.d) ||
      !resOnCeiling(ctx.A, ctx.d, resOf(k)) ||
      !(ctx.A.enf
        ? enfResWriter(ctx.A, ctx.d, resName(k))
        : authorizeActs(ctx.A, k, [
            b.op === "create"
              ? "add"
              : b.op.indexOf("delete") === 0
                ? "del"
                : "edit",
          ]).ok)
    )
      throw szError("seized-denied", 403);
  });
}
async function szReceipt(ctx, b, fingerprint) {
  var rows = await szReadBatch(ctx, [
      ctx.env.DB.prepare(
        "SELECT * FROM seized_requests WHERE department_id=?1 AND account_uid=?2 AND request_id=?3",
      ).bind(ctx.d, ctx.A.u.id, b.requestId),
    ]),
    r = rows[0][0];
  if (!r) return null;
  if (r.fingerprint !== fingerprint)
    throw szError("seized-request-reused", 409);
  if (
    !Number.isSafeInteger(r.resource_rev) ||
    r.resource_rev < 0 ||
    r.operation !== b.op ||
    r.resource_key !== szKey(ctx.d, SZ_NAMES.indexOf(szAffected(b)[0]))
  )
    throw szError("seized-receipt-invalid", 503);
  if (
    !Number.isSafeInteger(r.result_n) ||
    r.result_n < 0 ||
    r.permission_mode !== (ctx.A.enf ? "enforce" : "legacy")
  )
    throw szError("seized-receipt-invalid", 503);
  var required = parseJson(r.permission_keys, null);
  if (
    !Array.isArray(required) ||
    required.length > 1000 ||
    new Set(required).size !== required.length ||
    required.some(function (k) {
      if (typeof k !== "string") return true;
      if (r.permission_mode === "enforce") return !KIVO_REGISTRY.byKey[k];
      var p = k.split(":");
      return (
        p.length !== 2 ||
        SZ_NAMES.indexOf(p[0]) < 0 ||
        ["add", "edit", "del", "approve"].indexOf(p[1]) < 0
      );
    })
  )
    throw szError("seized-receipt-invalid", 503);
  szAuthority(ctx, b, r.result_n);
  if (
    ctx.A.enf &&
    required.some(function (k) {
      return !enfHeld(ctx.A, ctx.d, k);
    })
  )
    throw szError("seized-denied", 403);
  if (
    !ctx.A.enf &&
    required.some(function (k) {
      var p = k.split(":");
      return !authorizeActs(ctx.A, szKey(ctx.d, SZ_NAMES.indexOf(p[0])), [p[1]])
        .ok;
    })
  )
    throw szError("seized-denied", 403);
  var base = Object.assign({}, b.base),
    affected = szAffected(b);
  affected.forEach(function (k) {
    base[k] = r.resource_rev;
  });
  var ack = {
    ok: 1,
    requestId: b.requestId,
    op: r.operation,
    rev: r.resource_rev,
    n: r.result_n,
    base: base,
    affected: affected,
  };
  if (r.result_id !== null) ack.id = r.result_id;
  return ack;
}
async function szPermission(ctx, resource, before, after, reason) {
  var k = szKey(ctx.d, SZ_NAMES.indexOf(resource)),
    retro = await szRetroSnapshot(ctx.env, ctx.d),
    retroWin = {},
    pv4 = {},
    set = {},
    keys = {},
    body = { why: {} };
  retroWin[ctx.d + "|seized"] = retro.state.windows;
  pv4[ctx.d] = ctx.pv4;
  set[k] = JSON.stringify(after);
  keys[k] = 1;
  if (reason) body.why[k] = reason;
  var X = ctx.A.enf
      ? await enfSavePrep(
          ctx.env,
          ctx.A,
          body,
          set,
          [],
          keys,
          KIVO_BUILD.markers({}, keys),
          null,
          false,
          false,
          retroWin,
          pv4,
        )
      : null,
    c = X ? { enf: enfCtxFor(X, k, ctx.d) } : {},
    decision =
      X && X.batchDeny
        ? enfNo(X.batchDeny.why, X.batchDeny)
        : canWrite(
            ctx.A,
            k,
            JSON.stringify(after),
            before === undefined ? null : JSON.stringify(before),
            c,
          );
  if (!decision.ok) {
    var e = szError("seized-denied", 403);
    e.szDecision = decision;
    throw e;
  }
  var actualActs = [];
  if (!ctx.A.enf) {
    actualActs = Object.keys(
      classifyMutation(
        resOf(k),
        before === undefined ? null : JSON.stringify(before),
        JSON.stringify(after),
        entOf(k),
        opsOf(k),
      ),
    );
    if (!actualActs.length) actualActs = ["edit"];
  }
  return {
    guards: retro.guards,
    decision: decision,
    key: k,
    actualActs: actualActs,
    resource: resource,
  };
}
function szItemData(ctx, value, old, index, catalog, now) {
  szShape(
    value,
    ["id", "n", "val", "act", "kind", "kindTxt", "photos", "sourceIndex"],
    "item",
  );
  if (
    (typeof value.id !== "number" && typeof value.id !== "string") ||
    !String(value.id)
  )
    throw szError("seized-item-id");
  ["n", "val"].forEach(function (k) {
    if (!Number.isSafeInteger(value[k]) || value[k] < 0)
      throw szError("seized-item-number");
  });
  ["act", "kind", "kindTxt"].forEach(function (k) {
    if (typeof value[k] !== "string" || value[k].length > 4000)
      throw szError("seized-item-text");
  });
  if (
    !Array.isArray(value.photos) ||
    value.photos.length > 200 ||
    value.photos.some(function (id) {
      return (
        typeof id !== "string" || !/^(?:img|szp)_[a-z0-9]+_[a-z0-9]+$/.test(id)
      );
    })
  )
    throw szError("seized-photo");
  var ix = szCatalogIndex(catalog),
    entry = ix.find(function (i) {
      return i.id === String(value.id);
    });
  if (!entry && !(old && String(old.id) === String(value.id)))
    throw szError("seized-item-catalog");
  if (
    !(
      Array.isArray(catalog.effective.actions) ? catalog.effective.actions : []
    ).some(function (a) {
      return a.k === value.act;
    }) &&
    !(old && old.act === value.act)
  )
    throw szError("seized-item-action");
  var out = Object.assign({}, value);
  delete out.sourceIndex;
  if (old && irOwn(old, "hist"))
    out.hist = old.hist === null ? null : old.hist.slice();
  else out.hist = [];
  if (old && old.act !== out.act) {
    out.hist = Array.isArray(out.hist) ? out.hist : [];
    out.hist.push({
      from: old.act || "",
      to: out.act,
      at: new Date(now).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }),
      by: String(ctx.A.u.name || ctx.A.u.un || ctx.A.u.id),
      t: now,
    });
  }
  return out;
}
function szReportData(ctx, b, old, catalog, now) {
  var create = b.op === "create";
  szShape(
    b.data,
    (create ? ["y", "m", "d"] : []).concat(["loc", "no", "note", "items"]),
    "data",
  );
  ["loc", "no", "note"].forEach(function (k) {
    if (typeof b.data[k] !== "string" || b.data[k].length > 100000)
      throw szError("seized-data");
  });
  if (
    !Array.isArray(b.data.items) ||
    !b.data.items.length ||
    b.data.items.length > 200
  )
    throw szError("seized-items");
  var used = new Set(),
    oldItems = old && Array.isArray(old.items) ? old.items : [];
  var items = b.data.items.map(function (item, index) {
    var previous = null;
    if (!create) {
      var source = irOwn(item, "sourceIndex") ? item.sourceIndex : null;
      if (source === null) {
        var matches = [];
        oldItems.forEach(function (v, i) {
          if (v.id === item.id) matches.push(i);
        });
        if (matches.length > 1) throw szError("seized-item-history-ambiguous");
        if (matches.length === 1) source = matches[0];
      }
      if (source !== null) {
        if (
          !Number.isSafeInteger(source) ||
          source < 0 ||
          source >= oldItems.length ||
          used.has(source) ||
          oldItems[source].id !== item.id
        )
          throw szError("seized-item-source");
        used.add(source);
        previous = oldItems[source];
      }
    }
    return szItemData(ctx, item, previous, index, catalog, now);
  });
  var out = Object.assign({}, old || {}, b.data, { items: items });
  if (create) {
    ["y", "m", "d"].forEach(function (k) {
      if (!Number.isSafeInteger(out[k])) throw szError("seized-date");
    });
    if (
      out.y < 1000 ||
      out.y > 9999 ||
      out.m < 1 ||
      out.m > 12 ||
      out.d < 1 ||
      out.d > 30
    )
      throw szError("seized-date");
    out.id = "sz-" + randTok();
    out.ts = now;
    out.actor = String(ctx.A.u.name || ctx.A.u.un || ctx.A.u.id);
    out.actorKey = String(ctx.A.u.ekey || ctx.A.u.id || ctx.A.u.un || "");
  } else {
    out.editedTs = now;
    out.editedBy = String(ctx.A.u.name || ctx.A.u.un || ctx.A.u.id);
  }
  szConvert(ctx.d, { reports: { reports: [out] } });
  return out;
}
function szResourceStatements(env, d, domain, name) {
  var keys =
      name === "catalog"
        ? ["categories", "catalogItems"]
        : name === "actions"
          ? ["actions"]
          : ["lists"],
    out = [];
  // Explicitly bound deletion predicates; each command owns one resource only.
  out = keys
    .slice()
    .reverse()
    .map(function (k) {
      var st = env.DB.prepare(
        "DELETE FROM " +
          SZ_TABLES[k][0] +
          " WHERE department_id=?1" +
          (k === "lists" ? " AND resource=?2" : ""),
      );
      return k === "lists" ? st.bind(d, name) : st.bind(d);
    });
  out.push(
    env.DB.prepare(
      "DELETE FROM seized_resource_state WHERE department_id=?1 AND resource=?2",
    ).bind(d, name),
  );
  out.push.apply(
    out,
    rsBulk(
      env,
      SZ_TABLES.resources[0],
      SZ_TABLES.resources[1],
      domain.rows.resources,
    ),
  );
  keys.forEach(function (k) {
    out.push.apply(
      out,
      rsBulk(env, SZ_TABLES[k][0], SZ_TABLES[k][1], domain.rows[k]),
    );
  });
  return out;
}
function szMarkReports(env, d) {
  return env.DB.prepare(
    "INSERT INTO seized_resource_state(department_id,resource,value_kind,list_kind,version_kind,version_number,version_text)VALUES(?1,'reports',2,2,0,NULL,NULL)ON CONFLICT(department_id,resource)DO UPDATE SET value_kind=2,list_kind=2",
  ).bind(d);
}
async function szCatalogInUse(ctx, name, before, after) {
  var removed = [];
  if (name === "catalog") {
    var next = new Set();
    ((after || {}).cats || []).forEach(function (c) {
      (c.items || []).forEach(function (i) {
        next.add(String(i.id));
      });
    });
    ((before || {}).cats || []).forEach(function (c) {
      (c.items || []).forEach(function (i) {
        if (!next.has(String(i.id))) removed.push(String(i.id));
      });
    });
  } else {
    var nextValues = new Set(
      (after || []).map(function (v) {
        return name === "actions" ? v.k : v;
      }),
    );
    (before || []).forEach(function (v) {
      var k = name === "actions" ? v.k : v;
      if (!nextValues.has(k)) removed.push(k);
    });
  }
  if (!removed.length) return [];
  var table = name === "locations" ? "seized_reports" : "seized_items",
    column =
      name === "catalog"
        ? "id_token"
        : name === "actions"
          ? "action_key"
          : name === "locations"
            ? "location"
            : "kind",
    sql =
      "SELECT 1 FROM " +
      table +
      " WHERE department_id=?1 AND " +
      column +
      " IN(SELECT value FROM json_each(?2))LIMIT 1",
    args = [ctx.d, JSON.stringify(removed)];
  if (await rsBound(ctx.env.DB.prepare(sql), args).first())
    throw szError("seized-catalog-in-use", 409);
  return [
    rsBound(
      ctx.env.DB.prepare(
        "SELECT CASE WHEN EXISTS(" +
          sql.replace("LIMIT 1", "") +
          ")THEN json_extract('{}','KIVO_SEIZED_TARGET_CHANGED')END",
      ),
      args,
    ),
  ];
}
async function szImagePlan(ctx, before, after, ids) {
  var oldIds =
      (
        await ctx.env.DB.prepare(
          "SELECT DISTINCT image_id FROM seized_item_photos WHERE department_id=?1 ORDER BY image_id",
        )
          .bind(ctx.d)
          .all()
      ).results || [],
    remaining =
      (
        await ctx.env.DB.prepare(
          "SELECT DISTINCT image_id FROM seized_item_photos WHERE department_id=?1 AND report_id NOT IN(SELECT value FROM json_each(?2))ORDER BY image_id",
        )
          .bind(ctx.d, JSON.stringify(ids))
          .all()
      ).results || [],
    images = new Set(
      remaining.map(function (r) {
        return r.image_id;
      }),
    );
  after.forEach(function (r) {
    (r.items || []).forEach(function (i) {
      (i.photos || []).forEach(function (id) {
        images.add(id);
      });
    });
  });
  if (images.size > IMG_CAP) throw szError("seized-image-reference-limit", 503);
  var k = szKey(ctx.d),
    oldProjection = JSON.stringify({
      photos: oldIds.map(function (r) {
        return r.image_id;
      }),
    }),
    projection = JSON.stringify({ photos: Array.from(images) });
  var guard = ctx.env.DB.prepare(
      "SELECT CASE WHEN(SELECT COUNT(DISTINCT image_id)FROM seized_item_photos WHERE department_id=?1)<>json_array_length(?2)OR EXISTS(SELECT 1 FROM seized_item_photos WHERE department_id=?1 AND NOT EXISTS(SELECT 1 FROM json_each(?2)e WHERE e.value IS image_id))THEN json_extract('{}','KIVO_SEIZED_TARGET_CHANGED')END",
    ).bind(
      ctx.d,
      JSON.stringify(
        oldIds.map(function (r) {
          return r.image_id;
        }),
      ),
    ),
    plan = {
      guards: [guard],
      statements: [],
      imgTouch: [{ k: k, v: projection }],
      relationalImageBefore: {},
      operation: "save",
      kv: { pend: [] },
    };
  plan.relationalImageBefore[k] = oldProjection;
  var reference = { inputKeys: {} };
  reference.inputKeys[k] = projection;
  await rsImageMetadataPlan(ctx.env, ctx.A, plan, reference);
  // Ownership is checked after the metadata snapshot that is fenced by the
  // shared planner. A change before capture cannot turn a prior check stale.
  if (await imgForeignIn(ctx.env, ctx.A, k, projection, oldProjection))
    throw szError("seized-image-denied", 403);
  plan.guards.push(
    ctx.env.DB.prepare(
      "SELECT CASE WHEN(SELECT COUNT(DISTINCT image_id)FROM seized_item_photos WHERE department_id=?1 AND report_id NOT IN(SELECT value FROM json_each(?2)))<>json_array_length(?3)OR EXISTS(SELECT 1 FROM seized_item_photos WHERE department_id=?1 AND report_id NOT IN(SELECT value FROM json_each(?2))AND NOT EXISTS(SELECT 1 FROM json_each(?3)e WHERE e.value IS image_id))THEN json_extract('{}','KIVO_SEIZED_TARGET_CHANGED')END",
    ).bind(
      ctx.d,
      JSON.stringify(ids),
      JSON.stringify(
        remaining.map(function (r) {
          return r.image_id;
        }),
      ),
    ),
  );
  var newImages = Array.from(images).filter(function (id) {
      return !oldIds.some(function (r) {
        return r.image_id === id;
      });
    }),
    bodies =
      (
        await ctx.env.DB.prepare(
          "SELECT DISTINCT k FROM imgs WHERE k IN(SELECT value FROM json_each(?1)) ORDER BY k",
        )
          .bind(JSON.stringify(newImages))
          .all()
      ).results || [];
  plan.guards.push(
    ctx.env.DB.prepare(
      "SELECT CASE WHEN(SELECT COUNT(DISTINCT k)FROM imgs WHERE k IN(SELECT value FROM json_each(?1)))<>json_array_length(?2)OR EXISTS(SELECT 1 FROM imgs WHERE k IN(SELECT value FROM json_each(?1))AND NOT EXISTS(SELECT 1 FROM json_each(?2)e WHERE e.value IS k))THEN json_extract('{}','KIVO_SEIZED_TARGET_CHANGED')END",
    ).bind(
      JSON.stringify(newImages),
      JSON.stringify(
        bodies.map(function (r) {
          return r.k;
        }),
      ),
    ),
  );
  // The existence snapshot is also followed by the same ownership check;
  // body/owner changes after it are rejected by the two transaction fences.
  if (await imgForeignIn(ctx.env, ctx.A, k, projection, oldProjection))
    throw szError("seized-image-denied", 403);
  return plan;
}
async function szNotifications(ctx, b, before, after, catalog) {
  var events = [],
    index = szCatalogIndex(catalog),
    acts = Array.isArray(catalog.effective.actions)
      ? catalog.effective.actions
      : [],
    who = String(ctx.A.u.name || ctx.A.u.un || ctx.A.u.id);
  function itemName(i) {
    var e = index.find(function (x) {
      return x.id === String(i.id);
    });
    return e
      ? e.name +
          (i.kind
            ? " · " + (i.kind === "أخرى" ? i.kindTxt || "أخرى" : i.kind)
            : "") +
          " ×" +
          (i.n || 1)
      : "بند " + i.id;
  }
  function actName(k) {
    var a = acts.find(function (x) {
      return x.k === k;
    });
    return a
      ? a.name
      : {
          sec: "أُحيل للجهة الأمنية",
          des: "أُتلف / صودر",
          sto: "محفوظ بالمستودع",
        }[k] || k;
  }
  function emit(type, r, vars) {
    events.push({
      type: type,
      dept: ctx.d,
      vars: vars,
      report: r.id,
      order: events.length,
    });
  }
  if (b.op === "create")
    after.forEach(function (r) {
      var items = r.items || [];
      emit("bx_new", r, {
        الرقم: r.no || "—",
        القطع: items.reduce(function (n, i) {
          return n + (parseInt(i.n, 10) || 0);
        }, 0),
        الموقع: r.loc || "—",
        الموظف: r.actor || r.name || "",
      });
      var sec = items.filter(function (i) {
        return i.act === "sec";
      });
      if (sec.length)
        emit("bx_sec", r, {
          الرقم: r.no || "—",
          البند: sec.map(itemName).join("، "),
          الموظف: r.actor || r.name || "",
        });
      var sar = items.reduce(function (n, i) {
        return (
          n + (i.id === 23 ? parseInt(i.n, 10) || 0 : parseInt(i.val, 10) || 0)
        );
      }, 0);
      if (sar >= 50000)
        emit("bx_cash", r, {
          الرقم: r.no || "—",
          المبلغ: sar.toLocaleString("en-US"),
          الحد: "50,000",
        });
    });
  if (b.op === "delete" || b.op === "delete-month")
    before.forEach(function (r) {
      emit("bx_del", r, { الرقم: r.no || "—", المُعدّل: who });
    });
  if (["edit", "item-action"].indexOf(b.op) >= 0)
    after.forEach(function (r) {
      var old = before.find(function (x) {
        return x.id === r.id;
      });
      (r.items || []).forEach(function (i, n) {
        var pi = old && (old.items || [])[n];
        if (pi && pi.act !== i.act)
          emit("bx_upd", r, {
            الرقم: r.no || "—",
            البند: itemName(i),
            من: actName(pi.act),
            إلى: actName(i.act),
            المُعدّل: who,
          });
      });
    });
  var out = { guards: [], statements: [], active: 0 };
  for (var start = 0; start < events.length; start += 200) {
    var part = [];
    for (var e of events.slice(start, start + 200)) {
      Object.keys(e.vars).forEach(function (k) {
        if (typeof e.vars[k] === "string") e.vars[k] = e.vars[k].slice(0, 4000);
      });
      part.push({
        type: e.type,
        dept: ctx.d,
        vars: e.vars,
        link: e.type === "bx_del" ? "" : "seized:" + e.report,
        once:
          "seized:" +
          (await cuFingerprint({
            request: b.requestId,
            uid: ctx.A.u.id,
            report: e.report,
            type: e.type,
            order: e.order,
          })),
      });
    }
    var p = await nfPlanEvents(ctx.env, ctx.A, part, true);
    out.guards.push.apply(out.guards, p.guards);
    out.statements.push.apply(out.statements, p.statements);
    out.statements.push.apply(
      out.statements,
      nfRetention(ctx.env, Date.now(), p.scopes),
    );
    out.active += p.plans.length;
  }
  return out;
}
async function hSeizedAct(env, actor, b, meta) {
  var fields = {
    create: ["data"],
    edit: ["id", "data"],
    delete: ["id"],
    "delete-month": ["year", "month", "day"],
    "item-action": ["id", "index", "act"],
    "photo-delete": ["id", "index", "image"],
    "catalog-replace": ["kind", "value"],
    "jew-rename": ["from", "to"],
  };
  szShape(
    b,
    ["uid", "dept", "base", "requestId", "op", "reason"].concat(
      fields[b && b.op] || [],
    ),
    "body",
  );
  if (!irOwn(fields, b.op)) throw szError("seized-operation");
  irRequestString(b.requestId, 100);
  irRequestString(b.dept, 200);
  szCheckBase(b.base);
  if (b.uid !== undefined && b.uid !== actor.u.id)
    throw szError("session-changed", 409);
  if (
    b.reason !== undefined &&
    (typeof b.reason !== "string" || b.reason.length > 100000)
  )
    throw szError("seized-reason");
  if (
    b.op === "catalog-replace" &&
    ["catalog", "actions", "locations", "jew"].indexOf(b.kind) < 0
  )
    throw szError("seized-catalog-kind");
  await szGuardRetired(env);
  var ctx = await szQueryContext(env, actor, b.dept, { write: true });
  env = ctx.env;
  var A = ctx.A;
  if (ctx.base.epoch !== b.base.epoch)
    throw szError("restore-epoch-changed", 409);
  szAuthority(ctx, b);
  var fp = await cuFingerprint({ body: b }),
    receipt = await szReceipt(ctx, b, fp);
  if (receipt) return receipt;
  if (
    ["epoch"].concat(SZ_NAMES).some(function (k) {
      return ctx.base[k] !== b.base[k];
    })
  )
    throw szError("seized-conflict", 409);
  var catalog = await szCatalogSnapshot(ctx),
    before = [],
    after = [],
    guards = ctx.guards.concat(catalog.guards, [
      rsEpochGuard(env.DB, b.base.epoch),
      szRetiredGuard(env),
    ]),
    statements = [],
    permissions = [],
    affected = szAffected(b),
    now = Date.now(),
    reason = String(b.reason || "")
      .trim()
      .slice(0, 300),
    n = 1,
    id = null;
  if (b.op === "catalog-replace") {
    var resource = b.kind,
      docs = {};
    docs[resource] = b.value;
    var domain = szConvert(ctx.d, docs),
      old = catalog.docs[resource],
      value = b.value;
    if (resource === "catalog") {
      if (!isObj(value) || !Array.isArray(value.cats))
        throw szError("seized-catalog-shape");
      n = value.cats.length;
    } else {
      if (!Array.isArray(value)) throw szError("seized-catalog-shape");
      n = value.length;
    }
    guards.push.apply(
      guards,
      await szCatalogInUse(ctx, resource, catalog.effective[resource], value),
    );
    permissions.push(await szPermission(ctx, resource, old, value, reason));
    statements.push.apply(
      statements,
      szResourceStatements(env, ctx.d, domain, resource),
    );
  } else {
    var selected = [],
      where,
      raw = [];
    if (b.op === "create") {
      var reportPresence = await szReportSnapshot(
        ctx,
        "department_id=?1 AND report_id IN(SELECT value FROM json_each(?2))",
        [ctx.d, "[]"],
      );
      guards.push.apply(guards, reportPresence.guards);
      var seq = await env.DB.prepare(
        "SELECT COALESCE(MAX(sequence),-1)+1 n FROM seized_reports WHERE department_id=?1",
      )
        .bind(ctx.d)
        .first();
      if (!Number.isSafeInteger(seq.n) || seq.n < 0)
        throw szError("seized-sequence", 503);
      guards.push(
        env.DB.prepare(
          "SELECT CASE WHEN(SELECT COALESCE(MAX(sequence),-1)+1 FROM seized_reports WHERE department_id=?1)IS NOT ?2 THEN json_extract('{}','KIVO_SEIZED_TARGET_CHANGED')END",
        ).bind(ctx.d, seq.n),
      );
      after = [szReportData(ctx, b, null, catalog, now)];
      var created = szConvert(ctx.d, { reports: { reports: after } });
      created.rows.reports[0].sequence = seq.n;
      ["reports", "items", "photos", "history"].forEach(function (k) {
        statements.push.apply(
          statements,
          rsBulk(env, SZ_TABLES[k][0], SZ_TABLES[k][1], created.rows[k]),
        );
      });
      id = after[0].id;
    } else {
      if (b.op === "delete-month") {
        if (!canRead(A, szKey(ctx.d))) throw szError("seized-denied", 403);
        var scope = szRecordViewScope(
            ctx,
            { year: b.year, month: b.month, day: b.day },
            cuClock(),
          ),
          p = { args: scope.args.slice() };
        where =
          scope.sql +
          " AND r.hijri_year=" +
          irQueryParam(p, irQueryInt(b.year, 0, 1000, 9999)) +
          " AND r.hijri_month=" +
          irQueryParam(p, irQueryInt(b.month, 0, 1, 12));
        selected = (
          await szReadBatch(ctx, [
            rsBound(
              env.DB.prepare(
                "SELECT r.report_id FROM seized_reports r WHERE " +
                  where +
                  " ORDER BY r.sequence",
              ),
              p.args,
            ),
          ])
        )[0].map(function (r) {
          return r.report_id;
        });
      } else if (b.op === "jew-rename") {
        if (
          typeof b.from !== "string" ||
          !b.from ||
          typeof b.to !== "string" ||
          !b.to ||
          b.from === b.to ||
          b.to === "أخرى" ||
          !Array.isArray(catalog.effective.jew) ||
          catalog.effective.jew.indexOf(b.from) < 0 ||
          catalog.effective.jew.indexOf(b.to) >= 0
        )
          throw szError("seized-kind-rename");
        selected = (
          await szReadBatch(ctx, [
            env.DB.prepare(
              "SELECT DISTINCT report_id FROM seized_items WHERE department_id=?1 AND kind=?2",
            ).bind(ctx.d, b.from),
          ])
        )[0].map(function (r) {
          return r.report_id;
        });
      } else {
        irRequestString(b.id, 100000);
        selected = [b.id];
        id = b.id;
      }
      var snap = await szReportSnapshot(
        ctx,
        "department_id=?1 AND report_id IN(SELECT value FROM json_each(?2))",
        [ctx.d, JSON.stringify(selected)],
      );
      guards.push.apply(guards, snap.guards);
      raw = snap.domain.rows.reports;
      before = snap.reports;
      if (!before.length && b.op !== "delete-month" && b.op !== "jew-rename")
        throw szError("seized-report-missing", 404);
      if (b.op === "edit")
        after = [szReportData(ctx, b, before[0], catalog, now)];
      else if (b.op === "item-action" || b.op === "photo-delete") {
        if (
          !Number.isSafeInteger(b.index) ||
          b.index < 0 ||
          !before[0].items ||
          !before[0].items[b.index]
        )
          throw szError("seized-item-missing", 404);
        var r = JSON.parse(JSON.stringify(before[0])),
          item = r.items[b.index];
        if (b.op === "item-action") {
          if (
            typeof b.act !== "string" ||
            !(catalog.effective.actions || []).some(function (a) {
              return a.k === b.act;
            })
          )
            throw szError("seized-item-action");
          if (item.act === b.act) throw szError("seized-no-change", 409);
          item.hist = Array.isArray(item.hist) ? item.hist : [];
          item.hist.push({
            from: item.act || "",
            to: b.act,
            at: new Date(now).toLocaleString("ar-SA", {
              timeZone: "Asia/Riyadh",
            }),
            by: String(A.u.name || A.u.un || A.u.id),
            t: now,
          });
          item.act = b.act;
        } else {
          if (
            typeof b.image !== "string" ||
            !Array.isArray(item.photos) ||
            item.photos.indexOf(b.image) < 0
          )
            throw szError("seized-photo-missing", 404);
          item.photos = item.photos.filter(function (i) {
            return i !== b.image;
          });
        }
        r.editedTs = now;
        r.editedBy = String(A.u.name || A.u.un || A.u.id);
        after = [r];
      } else if (b.op === "jew-rename") {
        n = 0;
        after = before.map(function (row) {
          var r = JSON.parse(JSON.stringify(row));
          (r.items || []).forEach(function (i) {
            if (i.kind === b.from) {
              i.kind = b.to;
              n++;
            }
          });
          return r;
        });
        var jewel = catalog.effective.jew.map(function (v) {
            return v === b.from ? b.to : v;
          }),
          jdoc = szConvert(ctx.d, { jew: jewel });
        permissions.push(
          await szPermission(ctx, "jew", catalog.docs.jew, jewel, reason),
        );
        statements.push.apply(
          statements,
          szResourceStatements(env, ctx.d, jdoc, "jew"),
        );
      } else n = before.length;
      if (selected.length) {
        statements.push(
          env.DB.prepare(
            "DELETE FROM seized_reports WHERE department_id=?1 AND report_id IN(SELECT value FROM json_each(?2))",
          ).bind(ctx.d, JSON.stringify(selected)),
        );
        if (after.length) {
          var next = szConvert(ctx.d, { reports: { reports: after } });
          next.rows.reports.forEach(function (row) {
            row.sequence = raw.find(function (r) {
              return r.report_id === row.report_id;
            }).sequence;
          });
          ["reports", "items", "photos", "history"].forEach(function (k) {
            statements.push.apply(
              statements,
              rsBulk(env, SZ_TABLES[k][0], SZ_TABLES[k][1], next.rows[k]),
            );
          });
        }
      }
    }
    if (b.op !== "jew-rename" || n > 0) {
      permissions.push(
        await szPermission(
          ctx,
          "reports",
          { reports: before },
          { reports: after },
          reason,
        ),
      );
      var images = await szImagePlan(
        ctx,
        before,
        after,
        before.map(function (r) {
          return r.id;
        }),
      );
      guards.push.apply(guards, images.guards);
      statements.push.apply(statements, images.statements);
      statements.push(szMarkReports(env, ctx.d));
    }
  }
  permissions.forEach(function (p) {
    guards.push.apply(guards, p.guards);
  });
  var nf = await szNotifications(ctx, b, before, after, catalog);
  guards.push.apply(guards, nf.guards);
  statements.push.apply(
    statements,
    bdBumpStatements(
      env,
      szKey(ctx.d, SZ_NAMES.indexOf(affected[0])),
      nf.active > 0,
    ),
  );
  affected.slice(1).forEach(function (resource) {
    statements.push(
      env.DB.prepare(
        "INSERT INTO revs(k,rev)VALUES(?1,CAST((SELECT v FROM meta WHERE k='rev')AS INTEGER))ON CONFLICT(k)DO UPDATE SET rev=excluded.rev",
      ).bind(szKey(ctx.d, SZ_NAMES.indexOf(resource))),
    );
  });
  statements.push.apply(statements, nf.statements);
  statements.push(
    env.DB.prepare(
      "INSERT INTO seized_requests(department_id,account_uid,request_id,fingerprint,resource_key,resource_rev,operation,result_n,result_id,permission_mode,permission_keys,created_at)VALUES(?1,?2,?3,?4,?5,CAST((SELECT v FROM meta WHERE k='rev')AS INTEGER),?6,?7,?8,?9,?10,?11)",
    ).bind(
      ctx.d,
      A.u.id,
      b.requestId,
      fp,
      szKey(ctx.d, SZ_NAMES.indexOf(affected[0])),
      b.op,
      n,
      id,
      A.enf ? "enforce" : "legacy",
      JSON.stringify(
        Array.from(
          new Set(
            permissions.flatMap(function (p) {
              return A.enf
                ? p.decision.keys || []
                : p.actualActs.map(function (act) {
                    return p.resource + ":" + act;
                  });
            }),
          ),
        ).sort(),
      ),
      now,
    ),
  );
  statements.push(
    env.DB.prepare(
      "INSERT INTO aud(cid,ts,uid,un,dept,k,rev,etype,eid,ename,act,ctx,bef,aft,ip,dev,city)VALUES(?1,?2,?3,?4,?5,?6,CAST((SELECT v FROM meta WHERE k='rev')AS INTEGER),'seized',?7,'seized',?8,?9,'','',?10,?11,?12)",
    ).bind(
      "seized_" + randTok(),
      now,
      A.u.id,
      String(A.u.un || ""),
      ctx.d,
      szKey(ctx.d),
      id || b.requestId,
      b.op,
      JSON.stringify({ requestId: b.requestId, n: n, reason: reason }),
      (meta && meta.ip) || "",
      (meta && meta.dev) || "",
      (meta && meta.city) || "",
    ),
  );
  permissions.forEach(function (p) {
    var log =
      A.enf && enfLogRow(A, p.key, p.decision, "/api/seized/act", meta || {});
    if (log) statements.push(enfLogStmt(env, log));
  });
  try {
    await env.DB.batch(guards.concat(statements));
  } catch (e) {
    preOff(env);
    var fresh = await szQueryContext(env, actor, b.dept, { write: true });
    if (fresh.base.epoch !== b.base.epoch)
      throw szError("restore-epoch-changed", 409);
    szAuthority(fresh, b);
    receipt = await szReceipt(fresh, b, fp);
    if (receipt) return receipt;
    if (
      isRevConflict(e) ||
      /KIVO_RESTORE_TARGET|KIVO_SEIZED_TARGET_CHANGED|UNIQUE constraint/.test(
        String(e),
      )
    )
      throw szError("seized-conflict", 409);
    throw e;
  }
  preOff(env);
  var acknowledged = await szQueryContext(env, actor, b.dept, { write: true });
  if (acknowledged.base.epoch !== b.base.epoch)
    throw szError("restore-epoch-changed", 409);
  szAuthority(acknowledged, b);
  receipt = await szReceipt(acknowledged, b, fp);
  if (!receipt) throw szError("seized-receipt-unavailable", 503);
  return receipt;
}
