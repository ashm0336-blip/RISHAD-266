/* Typed seized domain. Codecs and plans are pure/prepared; only commands commit.
   Scalar masks, witnesses and bulk SQL reuse the existing domain/compiler helpers. */
var SZ_RES = [
  "bassam_seized_v1",
  "bassam_seized_cat_v1",
  "bassam_seized_acts_v1",
  "bassam_seized_locs_v1",
  "bassam_seized_jew_v1",
  "bassam_seized_retro_v1",
];
var SZ_NAMES = ["reports", "catalog", "actions", "locations", "jew", "retro"];
var SZ_REPORT_FIELDS = [
  ["id", "report_id", "text"],
  ["y", "hijri_year", "number"],
  ["m", "hijri_month", "number"],
  ["d", "hijri_day", "number"],
  ["ts", "created_at", "number"],
  ["loc", "location", "text"],
  ["actor", "actor_label", "text"],
  ["actorKey", "actor_key", "text"],
  ["no", "record_number", "text"],
  ["note", "note", "text"],
  ["shift", "shift", "text"],
  ["eid", "employee_key", "text"],
  ["name", "employee_name", "text"],
  ["editedTs", "edited_at", "number"],
  ["editedBy", "edited_by", "text"],
  ["by", "legacy_author", "text"],
  ["test", "test_marker", "text"],
];
var SZ_ITEM_FIELDS = [
  ["n", "quantity", "number"],
  ["val", "value", "number"],
  ["act", "action_key", "text"],
  ["kind", "kind", "text"],
  ["kindTxt", "kind_text", "text"],
];
var SZ_CATEGORY_FIELDS = [
  ["name", "name", "text"],
  ["color", "color", "text"],
  ["def", "default_action", "text"],
];
var SZ_CATALOG_ITEM_FIELDS = [
  ["name", "name", "text"],
  ["desc", "description", "text"],
  ["unit", "unit", "text"],
];
var SZ_ACTION_FIELDS = [
  ["k", "action_key", "text"],
  ["name", "name", "text"],
  ["color", "color", "text"],
];
var SZ_HISTORY_FIELDS = [
  ["from", "from_action", "text"],
  ["to", "to_action", "text"],
  ["at", "at_label", "text"],
  ["by", "actor_label", "text"],
  ["t", "created_at", "number"],
];
var SZ_REQUEST_COLS = [
  "department_id",
  "account_uid",
  "request_id",
  "fingerprint",
  "resource_key",
  "resource_rev",
  "operation",
  "result_n",
  "result_id",
  "permission_mode",
  "permission_keys",
  "created_at",
];
var SZ_TABLES = {
  resources: [
    "seized_resource_state",
    [
      "department_id",
      "resource",
      "value_kind",
      "list_kind",
      "version_kind",
      "version_number",
      "version_text",
    ],
  ],
  reports: [
    "seized_reports",
    ["department_id", "sequence"].concat(
      SZ_REPORT_FIELDS.map(function (f) {
        return f[1];
      }),
      ["presence_mask", "items_kind"],
    ),
  ],
  items: [
    "seized_items",
    [
      "department_id",
      "report_id",
      "position",
      "id_kind",
      "id_number",
      "id_text",
      "id_token",
    ].concat(
      SZ_ITEM_FIELDS.map(function (f) {
        return f[1];
      }),
      ["presence_mask", "photos_kind", "history_kind"],
    ),
  ],
  photos: [
    "seized_item_photos",
    ["department_id", "report_id", "item_position", "position", "image_id"],
  ],
  history: [
    "seized_item_history",
    ["department_id", "report_id", "item_position", "position"].concat(
      SZ_HISTORY_FIELDS.map(function (f) {
        return f[1];
      }),
      ["presence_mask"],
    ),
  ],
  categories: [
    "seized_categories",
    [
      "department_id",
      "position",
      "id_kind",
      "id_number",
      "id_text",
      "id_token",
    ].concat(
      SZ_CATEGORY_FIELDS.map(function (f) {
        return f[1];
      }),
      ["presence_mask", "items_kind"],
    ),
  ],
  catalogItems: [
    "seized_catalog_items",
    [
      "department_id",
      "category_position",
      "position",
      "id_kind",
      "id_number",
      "id_text",
      "id_token",
    ].concat(
      SZ_CATALOG_ITEM_FIELDS.map(function (f) {
        return f[1];
      }),
      ["presence_mask"],
    ),
  ],
  actions: [
    "seized_actions",
    [
      "department_id",
      "position",
      "id_kind",
      "id_number",
      "id_text",
      "id_token",
    ].concat(
      SZ_ACTION_FIELDS.map(function (f) {
        return f[1];
      }),
      ["presence_mask"],
    ),
  ],
  lists: [
    "seized_list_values",
    ["department_id", "resource", "position", "value"],
  ],
  windows: ["seized_retro_windows", IR_TABLES.windows[1]],
};
function szError(code, status, path) {
  var e = new Error(code);
  e.szCode = code;
  e.szStatus = status || 400;
  if (path) e.szPath = path;
  return e;
}
function szShape(value, keys, path) {
  if (
    !isObj(value) ||
    Object.keys(value).some(function (k) {
      return keys.indexOf(k) < 0;
    })
  )
    throw szError("seized-shape", 400, path);
}
function szKey(d, i) {
  return "bsdept:" + d + ":" + SZ_RES[i === undefined ? 0 : i];
}
var SZ_CONTEXT = {
  resources: SZ_RES,
  resourceNames: SZ_NAMES,
  error: function (c, s) {
    return szError("seized-" + c, s);
  },
  extraKeys: function (d) {
    return [
      "bassam_dreport_v1",
      "bassam_rounds_v1",
      "bassam_staffing_locks_v1",
      "bassam_dayshift_v1",
    ].map(function (k) {
      return "bsdept:" + d + ":" + k;
    });
  },
};
function szQueryContext(env, A, d, options) {
  return bdQueryContext(env, A, d, SZ_CONTEXT, options);
}
function szLegacyKey(k) {
  return SZ_RES.indexOf(resName(k)) >= 0;
}
function szPredicate() {
  return (
    "k IN(SELECT value FROM json_each(?1))" +
    SZ_RES.map(function (k) {
      return (
        " OR k GLOB 'bsdept:*:" +
        k +
        "' OR k GLOB 'bsdept:*:" +
        k +
        ":*' OR k GLOB '" +
        k +
        ":*'"
      );
    }).join("")
  );
}
function szRetiredGuard(env) {
  return env.DB.prepare(
    "SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE " +
      szPredicate() +
      ")THEN json_extract('{}','KIVO_SEIZED_LEGACY_SOURCE')END",
  ).bind(JSON.stringify(SZ_RES));
}
async function szGuardRetired(env) {
  if (
    await env.DB.prepare("SELECT 1 FROM kv WHERE " + szPredicate() + " LIMIT 1")
      .bind(JSON.stringify(SZ_RES))
      .first()
  )
    throw szError("seized-legacy-source-present", 503);
}
function szEmptyDomain(d) {
  if (typeof d !== "string" || !d || d.indexOf(":") >= 0)
    throw szError("seized-scope");
  var resources = {};
  SZ_NAMES.forEach(function (n) {
    resources[n] = false;
  });
  var rows = {};
  Object.keys(SZ_TABLES).forEach(function (n) {
    rows[n] = [];
  });
  return {
    version: 1,
    scope: { departmentId: d },
    resources: resources,
    rows: rows,
  };
}
function szListKind(value, key) {
  if (!irOwn(value, key)) return 0;
  if (value[key] === null) return 1;
  if (!Array.isArray(value[key])) throw szError("seized-list-shape", 400, key);
  return 2;
}
function szIdEncode(value, row) {
  row.id_kind = 0;
  row.id_number = null;
  row.id_text = null;
  row.id_token = null;
  if (!irOwn(value, "id")) return;
  if (value.id === null) {
    row.id_kind = 1;
    return;
  }
  if (typeof value.id === "number" && Number.isFinite(value.id)) {
    row.id_kind = 2;
    row.id_number = value.id;
    row.id_token = String(value.id);
    return;
  }
  if (typeof value.id === "string") {
    row.id_kind = 3;
    row.id_text = value.id;
    row.id_token = value.id;
    return;
  }
  throw szError("seized-id");
}
function szIdDecode(row, out) {
  if (row.id_kind)
    out.id =
      row.id_kind === 1
        ? null
        : row.id_kind === 2
          ? row.id_number
          : row.id_text;
  return out;
}
function szVersionEncode(doc, key, state) {
  state.version_kind = 0;
  state.version_number = null;
  state.version_text = null;
  if (!irOwn(doc, key)) return;
  var v = doc[key];
  if (v === null) state.version_kind = 1;
  else if (typeof v === "number" && Number.isFinite(v)) {
    state.version_kind = 2;
    state.version_number = v;
  } else if (typeof v === "string") {
    state.version_kind = 3;
    state.version_text = v;
  } else throw szError("seized-version");
}
function szVersionDecode(state, out, key) {
  if (state.version_kind)
    out[key] =
      state.version_kind === 1
        ? null
        : state.version_kind === 2
          ? state.version_number
          : state.version_text;
}
function szConvert(d, docs) {
  szShape(docs, SZ_NAMES, "documents");
  var out = szEmptyDomain(d),
    ids = new Set(),
    catalogIds = new Set();
  SZ_NAMES.forEach(function (name) {
    if (!irOwn(docs, name)) return;
    out.resources[name] = true;
    var value = docs[name],
      array = ["actions", "locations", "jew"].indexOf(name) >= 0,
      state = {
        department_id: d,
        resource: name,
        value_kind: value === null ? 1 : array ? 3 : 2,
        list_kind: 0,
        version_kind: 0,
        version_number: null,
        version_text: null,
      };
    if (value === null) {
      out.rows.resources.push(state);
      return;
    }
    if (array) {
      if (!Array.isArray(value)) throw szError("seized-root-shape", 400, name);
      state.list_kind = 2;
    } else if (!isObj(value)) throw szError("seized-root-shape", 400, name);
    if (name === "reports") {
      szShape(value, ["reports"], "reports");
      state.list_kind = szListKind(value, "reports");
      (state.list_kind === 2 ? value.reports : []).forEach(
        function (r, sequence) {
          szShape(
            r,
            SZ_REPORT_FIELDS.map(function (f) {
              return f[0];
            }).concat(["items"]),
            "report",
          );
          if (typeof r.id !== "string" || !r.id || ids.has(r.id))
            throw szError("seized-report-identity");
          ids.add(r.id);
          var row = { department_id: d, sequence: sequence };
          row.presence_mask = irEncodeFields(
            r,
            SZ_REPORT_FIELDS,
            row,
            "report",
          );
          row.items_kind = szListKind(r, "items");
          out.rows.reports.push(row);
          (row.items_kind === 2 ? r.items : []).forEach(
            function (item, position) {
              szShape(
                item,
                ["id", "photos", "hist"].concat(
                  SZ_ITEM_FIELDS.map(function (f) {
                    return f[0];
                  }),
                ),
                "item",
              );
              var child = {
                department_id: d,
                report_id: r.id,
                position: position,
              };
              szIdEncode(item, child);
              child.presence_mask = irEncodeFields(
                item,
                SZ_ITEM_FIELDS,
                child,
                "item",
              );
              child.photos_kind = szListKind(item, "photos");
              child.history_kind = szListKind(item, "hist");
              out.rows.items.push(child);
              (child.photos_kind === 2 ? item.photos : []).forEach(
                function (image, index) {
                  if (typeof image !== "string") throw szError("seized-photo");
                  out.rows.photos.push({
                    department_id: d,
                    report_id: r.id,
                    item_position: position,
                    position: index,
                    image_id: image,
                  });
                },
              );
              (child.history_kind === 2 ? item.hist : []).forEach(
                function (h, index) {
                  szShape(
                    h,
                    SZ_HISTORY_FIELDS.map(function (f) {
                      return f[0];
                    }),
                    "history",
                  );
                  var hr = {
                    department_id: d,
                    report_id: r.id,
                    item_position: position,
                    position: index,
                  };
                  hr.presence_mask = irEncodeFields(
                    h,
                    SZ_HISTORY_FIELDS,
                    hr,
                    "history",
                  );
                  out.rows.history.push(hr);
                },
              );
            },
          );
        },
      );
    } else if (name === "catalog") {
      szShape(value, ["ver", "cats"], "catalog");
      szVersionEncode(value, "ver", state);
      state.list_kind = szListKind(value, "cats");
      var names = new Set();
      (state.list_kind === 2 ? value.cats : []).forEach(
        function (cat, position) {
          szShape(
            cat,
            ["id", "items"].concat(
              SZ_CATEGORY_FIELDS.map(function (f) {
                return f[0];
              }),
            ),
            "category",
          );
          if (typeof cat.name !== "string" || names.has(cat.name))
            throw szError("seized-category-identity");
          names.add(cat.name);
          var row = { department_id: d, position: position };
          szIdEncode(cat, row);
          row.presence_mask = irEncodeFields(
            cat,
            SZ_CATEGORY_FIELDS,
            row,
            "category",
          );
          row.items_kind = szListKind(cat, "items");
          out.rows.categories.push(row);
          (row.items_kind === 2 ? cat.items : []).forEach(
            function (item, index) {
              szShape(
                item,
                ["id"].concat(
                  SZ_CATALOG_ITEM_FIELDS.map(function (f) {
                    return f[0];
                  }),
                ),
                "catalog-item",
              );
              if (
                (typeof item.id !== "number" && typeof item.id !== "string") ||
                !String(item.id) ||
                catalogIds.has(String(item.id))
              )
                throw szError("seized-catalog-identity");
              catalogIds.add(String(item.id));
              var child = {
                department_id: d,
                category_position: position,
                position: index,
              };
              szIdEncode(item, child);
              child.presence_mask = irEncodeFields(
                item,
                SZ_CATALOG_ITEM_FIELDS,
                child,
                "catalog-item",
              );
              out.rows.catalogItems.push(child);
            },
          );
        },
      );
    } else if (name === "actions") {
      var keys = new Set();
      value.forEach(function (action, position) {
        szShape(
          action,
          ["id"].concat(
            SZ_ACTION_FIELDS.map(function (f) {
              return f[0];
            }),
          ),
          "action",
        );
        if (typeof action.k !== "string" || !action.k || keys.has(action.k))
          throw szError("seized-action-identity");
        keys.add(action.k);
        var row = { department_id: d, position: position };
        szIdEncode(action, row);
        row.presence_mask = irEncodeFields(
          action,
          SZ_ACTION_FIELDS,
          row,
          "action",
        );
        out.rows.actions.push(row);
      });
    } else if (name === "locations" || name === "jew")
      value.forEach(function (v, position) {
        if (typeof v !== "string") throw szError("seized-list-value");
        out.rows.lists.push({
          department_id: d,
          resource: name,
          position: position,
          value: v,
        });
      });
    else if (name === "retro") {
      szShape(value, ["v", "windows"], "retro");
      szVersionEncode(value, "v", state);
      if (state.version_kind === 3) throw szError("seized-retro-version");
      state.list_kind = szListKind(value, "windows");
      if (state.list_kind === 1) throw szError("seized-retro-windows");
      out.rows.windows = irConvert(d, { retro: value }).rows.windows;
    }
    out.rows.resources.push(state);
  });
  return out;
}
function szInflate(domain) {
  var d = domain.scope.departmentId,
    rows = domain.rows,
    out = {},
    ordered = function (list, key) {
      return list.slice().sort(function (a, b) {
        return a[key] - b[key];
      });
    };
  rows.resources.forEach(function (state) {
    var name = state.resource;
    if (state.value_kind === 1) {
      out[name] = null;
      return;
    }
    var value = ["actions", "locations", "jew"].indexOf(name) >= 0 ? [] : {};
    if (name === "reports") {
      if (state.list_kind === 1) value.reports = null;
      if (state.list_kind === 2)
        value.reports = ordered(rows.reports, "sequence").map(function (r) {
          var v = irDecodeFields(r, SZ_REPORT_FIELDS, r.presence_mask);
          if (r.items_kind === 1) v.items = null;
          if (r.items_kind === 2)
            v.items = ordered(
              rows.items.filter(function (i) {
                return i.report_id === r.report_id;
              }),
              "position",
            ).map(function (i) {
              var item = szIdDecode(
                i,
                irDecodeFields(i, SZ_ITEM_FIELDS, i.presence_mask),
              );
              if (i.photos_kind === 1) item.photos = null;
              if (i.photos_kind === 2)
                item.photos = ordered(
                  rows.photos.filter(function (p) {
                    return (
                      p.report_id === r.report_id &&
                      p.item_position === i.position
                    );
                  }),
                  "position",
                ).map(function (p) {
                  return p.image_id;
                });
              if (i.history_kind === 1) item.hist = null;
              if (i.history_kind === 2)
                item.hist = ordered(
                  rows.history.filter(function (h) {
                    return (
                      h.report_id === r.report_id &&
                      h.item_position === i.position
                    );
                  }),
                  "position",
                ).map(function (h) {
                  return irDecodeFields(h, SZ_HISTORY_FIELDS, h.presence_mask);
                });
              return item;
            });
          return v;
        });
    } else if (name === "catalog") {
      szVersionDecode(state, value, "ver");
      if (state.list_kind === 1) value.cats = null;
      if (state.list_kind === 2)
        value.cats = ordered(rows.categories, "position").map(function (c) {
          var v = szIdDecode(
            c,
            irDecodeFields(c, SZ_CATEGORY_FIELDS, c.presence_mask),
          );
          if (c.items_kind === 1) v.items = null;
          if (c.items_kind === 2)
            v.items = ordered(
              rows.catalogItems.filter(function (i) {
                return i.category_position === c.position;
              }),
              "position",
            ).map(function (i) {
              return szIdDecode(
                i,
                irDecodeFields(i, SZ_CATALOG_ITEM_FIELDS, i.presence_mask),
              );
            });
          return v;
        });
    } else if (name === "actions")
      value = ordered(rows.actions, "position").map(function (a) {
        return szIdDecode(
          a,
          irDecodeFields(a, SZ_ACTION_FIELDS, a.presence_mask),
        );
      });
    else if (name === "locations" || name === "jew")
      value = ordered(
        rows.lists.filter(function (r) {
          return r.resource === name;
        }),
        "position",
      ).map(function (r) {
        return r.value;
      });
    else if (name === "retro") {
      var ir = irEmptyDomain(d);
      ir.resources.retro = true;
      ir.resources.retroVersionPresent = !!state.version_kind;
      ir.resources.retroVersion =
        state.version_kind === 1 ? null : state.version_number;
      ir.resources.retroWindowsPresent = state.list_kind === 2;
      ir.rows.windows = rows.windows;
      value = irInflate(ir).retro;
    }
    out[name] = value;
  });
  return out;
}
function szCanonical(value) {
  if (Array.isArray(value)) return value.map(szCanonical);
  if (value && typeof value === "object") {
    var out = {};
    Object.keys(value)
      .sort()
      .forEach(function (k) {
        out[k] = szCanonical(value[k]);
      });
    return out;
  }
  return value;
}
function szValidateDomain(domain, d) {
  szShape(domain, ["version", "scope", "resources", "rows"], "domain");
  if (domain.version !== 1) throw szError("seized-domain-version");
  szShape(domain.scope, ["departmentId"], "scope");
  if (domain.scope.departmentId !== d) throw szError("seized-domain-scope");
  szShape(domain.resources, SZ_NAMES, "resources");
  szShape(domain.rows, Object.keys(SZ_TABLES), "rows");
  Object.keys(SZ_TABLES).forEach(function (kind) {
    if (!Array.isArray(domain.rows[kind])) throw szError("seized-domain-rows");
    domain.rows[kind].forEach(function (row) {
      szShape(row, SZ_TABLES[kind][1], kind);
      if (
        row.department_id !== d ||
        SZ_TABLES[kind][1].some(function (c) {
          return !irOwn(row, c);
        })
      )
        throw szError("seized-domain-row");
    });
  });
  var expected;
  try {
    expected = szConvert(d, szInflate(domain));
  } catch (e) {
    throw szError("seized-domain-invalid");
  }
  // Valid report sequence gaps survive deletes; explicit stable sequence is not renumbered.
  var seen = new Set();
  domain.rows.reports.forEach(function (r) {
    if (
      !Number.isSafeInteger(r.sequence) ||
      r.sequence < 0 ||
      seen.has(r.sequence)
    )
      throw szError("seized-domain-sequence");
    seen.add(r.sequence);
    var match = expected.rows.reports.find(function (x) {
      return x.report_id === r.report_id;
    });
    if (match) match.sequence = r.sequence;
  });
  seen = new Set();
  domain.rows.windows.forEach(function (r) {
    if (
      !Number.isSafeInteger(r.sequence) ||
      r.sequence < 0 ||
      seen.has(r.sequence)
    )
      throw szError("seized-domain-sequence");
    seen.add(r.sequence);
    var match = expected.rows.windows.find(function (x) {
      return x.window_id === r.window_id;
    });
    if (match) match.sequence = r.sequence;
  });
  var canonicalRows = function (rows, cols) {
    return rows
      .map(function (r) {
        return JSON.stringify(
          cols.map(function (c) {
            return r[c];
          }),
        );
      })
      .sort();
  };
  if (
    !deq(domain.resources, expected.resources) ||
    Object.keys(SZ_TABLES).some(function (k) {
      return !deq(
        canonicalRows(domain.rows[k], SZ_TABLES[k][1]),
        canonicalRows(expected.rows[k], SZ_TABLES[k][1]),
      );
    })
  )
    throw szError("seized-domain-invalid");
  return expected;
}
async function szExportDomain(env, d) {
  var out = szEmptyDomain(d),
    names = Object.keys(SZ_TABLES),
    read = await env.DB.batch(
      names.map(function (k) {
        return env.DB.prepare(
          "SELECT * FROM " + SZ_TABLES[k][0] + " WHERE department_id=?1",
        ).bind(d);
      }),
    );
  names.forEach(function (k, i) {
    if (!read[i] || read[i].success === false)
      throw szError("seized-read", 503);
    out.rows[k] = read[i].results || [];
  });
  out.rows.resources.forEach(function (r) {
    if (SZ_NAMES.indexOf(r.resource) < 0) throw szError("seized-resource", 503);
    out.resources[r.resource] = true;
  });
  return szValidateDomain(out, d);
}
function szInstallStatements(env, domain) {
  var out = [];
  Object.keys(SZ_TABLES).forEach(function (k) {
    out.push.apply(
      out,
      rsBulk(env, SZ_TABLES[k][0], SZ_TABLES[k][1], domain.rows[k]),
    );
  });
  return out;
}
function szRevisionGuards(env, d, base) {
  if (
    !isObj(base) ||
    SZ_NAMES.some(function (n) {
      return !Number.isSafeInteger(base[n]) || base[n] < 0;
    })
  )
    throw szError("seized-base");
  var pairs = SZ_NAMES.map(function (n, i) {
    return { k: szKey(d, i), v: base[n] };
  });
  return [
    env.DB.prepare(
      "SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(?1)e WHERE COALESCE((SELECT rev FROM revs WHERE k=json_extract(e.value,'$.k')),0) IS NOT json_extract(e.value,'$.v'))THEN json_extract('{}','KIVO_REV_CONFLICT')END",
    ).bind(JSON.stringify(pairs)),
  ];
}
function szRevisionRowsStatement(env, d) {
  return env.DB.prepare(
    "SELECT k,rev FROM revs WHERE k IN(SELECT value FROM json_each(?1))",
  ).bind(
    JSON.stringify(
      SZ_RES.map(function (_, i) {
        return szKey(d, i);
      }),
    ),
  );
}
function szRevisionResult(rows, d) {
  var out = {};
  SZ_NAMES.forEach(function (n, i) {
    var r = rows.find(function (r) {
      return r.k === szKey(d, i);
    });
    out[n] = r ? r.rev : 0;
    if (!Number.isSafeInteger(out[n]) || out[n] < 0)
      throw szError("seized-revision", 503);
  });
  return out;
}
async function szRevs(env, d) {
  return szRevisionResult(
    (await szRevisionRowsStatement(env, d).all()).results || [],
    d,
  );
}
async function szRetroSnapshot(env, d) {
  var read = await env.DB.batch([
      env.DB.prepare(
        "SELECT * FROM seized_resource_state WHERE department_id=?1 AND resource='retro'",
      ).bind(d),
      env.DB.prepare(
        "SELECT * FROM seized_retro_windows WHERE department_id=?1 ORDER BY sequence",
      ).bind(d),
    ]),
    domain = szEmptyDomain(d);
  domain.rows.resources = read[0].results || [];
  domain.resources.retro = domain.rows.resources.length > 0;
  domain.rows.windows = read[1].results || [];
  szValidateDomain(domain, d);
  var state = szInflate(domain).retro;
  if (!isObj(state)) state = { v: 1, windows: [] };
  else if (!Array.isArray(state.windows))
    state = Object.assign({}, state, { windows: [] });
  return {
    state: state,
    guards: rsWitness(
      env,
      SZ_TABLES.resources[0],
      SZ_TABLES.resources[1],
      domain.rows.resources,
      "department_id=?1 AND resource='retro'",
      [d],
    ).concat(
      rsWitness(
        env,
        SZ_TABLES.windows[0],
        SZ_TABLES.windows[1],
        domain.rows.windows,
        "department_id=?1",
        [d],
      ),
    ),
  };
}
function szRetroStatements(env, d, state) {
  var domain = szConvert(d, { retro: state });
  return [
    env.DB.prepare(
      "DELETE FROM seized_retro_windows WHERE department_id=?1",
    ).bind(d),
    env.DB.prepare(
      "DELETE FROM seized_resource_state WHERE department_id=?1 AND resource='retro'",
    ).bind(d),
  ].concat(
    rsBulk(
      env,
      SZ_TABLES.resources[0],
      SZ_TABLES.resources[1],
      domain.rows.resources,
    ),
    rsBulk(
      env,
      SZ_TABLES.windows[0],
      SZ_TABLES.windows[1],
      domain.rows.windows,
    ),
  );
}
async function szDomainPlan(env, domain, d, options) {
  options = options || {};
  var next = szValidateDomain(domain, d),
    before = await szExportDomain(env, d),
    guards = [szRetiredGuard(env)],
    statements = [],
    snapshotRows = {},
    revisionKeys = [];
  Object.keys(SZ_TABLES).forEach(function (k) {
    var spec = SZ_TABLES[k];
    snapshotRows[k] = before.rows[k];
    guards.push.apply(
      guards,
      rsWitness(env, spec[0], spec[1], before.rows[k], "department_id=?1", [d]),
    );
  });
  var receipts =
    (
      await env.DB.prepare(
        "SELECT * FROM seized_requests WHERE department_id=?1",
      )
        .bind(d)
        .all()
    ).results || [];
  snapshotRows.requests = receipts;
  guards.push.apply(
    guards,
    rsWitness(
      env,
      "seized_requests",
      SZ_REQUEST_COLS,
      receipts,
      "department_id=?1",
      [d],
    ),
  );
  guards.push.apply(guards, szRevisionGuards(env, d, options.base));
  var same = Object.keys(SZ_TABLES).every(function (k) {
    var sorted = function (rows) {
      return rows
        .map(function (r) {
          return JSON.stringify(szCanonical(r));
        })
        .sort();
    };
    return deq(sorted(before.rows[k]), sorted(next.rows[k]));
  });
  if (same && !receipts.length) {
    var empty = Object.keys(SZ_TABLES).every(function (k) {
      return !before.rows[k].length;
    });
    if (empty) {
      var names = Object.keys(SZ_TABLES)
        .map(function (k) {
          return SZ_TABLES[k][0];
        })
        .concat(["seized_requests"]);
      guards = [szRetiredGuard(env)].concat(
        szRevisionGuards(env, d, options.base),
        [
          env.DB.prepare(
            "SELECT CASE WHEN EXISTS(" +
              names
                .map(function (n) {
                  return "SELECT 1 FROM " + n + " WHERE department_id=?1";
                })
                .join(" UNION ALL ") +
              " LIMIT 1)THEN json_extract('{}','KIVO_RESTORE_TARGET')END",
          ).bind(d),
        ],
      );
    }
    return {
      guards: guards,
      statements: [],
      revisionKeys: [],
      snapshotRows: snapshotRows,
      changed: false,
      counts: { seized: 0 },
    };
  }
  // A matching business snapshot can still retire old internal receipts.
  // It must not delete/reinsert the business rows that already match exactly.
  if (same)
    statements.push(
      env.DB.prepare("DELETE FROM seized_requests WHERE department_id=?1").bind(
        d,
      ),
    );
  else {
    // Children are removed before parents; business exports never contain receipts.
    [
      "requests",
      "photos",
      "history",
      "items",
      "reports",
      "catalogItems",
      "categories",
      "actions",
      "lists",
      "windows",
      "resources",
    ].forEach(function (k) {
      statements.push(
        env.DB.prepare(
          "DELETE FROM " +
            (k === "requests" ? "seized_requests" : SZ_TABLES[k][0]) +
            " WHERE department_id=?1",
        ).bind(d),
      );
    });
    statements.push.apply(statements, szInstallStatements(env, next));
  }
  SZ_NAMES.forEach(function (n, i) {
    if (
      !deq(
        before.rows.resources.filter(function (r) {
          return r.resource === n;
        }),
        next.rows.resources.filter(function (r) {
          return r.resource === n;
        }),
      ) ||
      !deq(szCanonical(szInflate(before)[n]), szCanonical(szInflate(next)[n]))
    )
      revisionKeys.push(szKey(d, i));
  });
  var result = {
    guards: guards,
    statements: statements,
    revisionKeys: revisionKeys,
    snapshotRows: snapshotRows,
    changed: revisionKeys.length > 0 || receipts.length > 0,
    counts: {
      seized: Object.keys(SZ_TABLES).reduce(function (n, k) {
        return n + before.rows[k].length;
      }, 0),
    },
  };
  if (!same)
    result.imageProjection = {
      k: szKey(d),
      before: JSON.stringify(szInflate(before).reports || {}),
      after: JSON.stringify(szInflate(next).reports || {}),
    };
  return result;
}
async function szLegacyPrepare(env) {
  var predicate = szPredicate(),
    args = [JSON.stringify(SZ_RES)],
    rows =
      (
        await env.DB.prepare(
          "SELECT k,seq,v FROM kv WHERE " + predicate + " ORDER BY k,seq",
        )
          .bind(args[0])
          .all()
      ).results || [],
    departmentRows =
      (
        await env.DB.prepare("SELECT k,seq,v FROM kv WHERE k=?1 ORDER BY seq")
          .bind(K_DEPTS)
          .all()
      ).results || [],
    registered = parseJson(kvJoin(departmentRows)[K_DEPTS] || "[]", null),
    known = new Set(),
    chunks = new Map(),
    documents = new Map();
  if (!Array.isArray(registered)) throw szError("seized-cutover-departments");
  departmentRows.forEach(function (r, i) {
    if (r.seq !== i || typeof r.v !== "string")
      throw szError("seized-cutover-departments");
  });
  registered.forEach(function (d) {
    if (
      !isObj(d) ||
      typeof d.id !== "string" ||
      !d.id ||
      d.id.indexOf(":") >= 0 ||
      known.has(d.id)
    )
      throw szError("seized-cutover-departments");
    known.add(d.id);
  });
  rows.forEach(function (r) {
    var d = parseKey(r.k).dept,
      i = SZ_RES.indexOf(resName(r.k));
    if (!d || i < 0 || r.k !== szKey(d, i) || !known.has(d))
      throw szError("seized-cutover-scope");
    var list = chunks.get(r.k) || [];
    if (r.seq !== list.length || typeof r.v !== "string")
      throw szError("seized-cutover-chunks");
    list.push(r.v);
    chunks.set(r.k, list);
  });
  chunks.forEach(function (parts, k) {
    var value;
    try {
      value = JSON.parse(parts.join(""));
    } catch (e) {
      throw szError("seized-cutover-json");
    }
    var d = parseKey(k).dept,
      docs = documents.get(d) || {};
    docs[SZ_NAMES[SZ_RES.indexOf(resName(k))]] = value;
    documents.set(d, docs);
  });
  var domains = [];
  documents.forEach(function (docs, d) {
    domains.push(szConvert(d, docs));
  });
  var tables = Object.keys(SZ_TABLES)
      .map(function (k) {
        return SZ_TABLES[k][0];
      })
      .concat(["seized_requests"]),
    existing =
      (
        await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name IN(SELECT value FROM json_each(?1))",
        )
          .bind(JSON.stringify(tables))
          .all()
      ).results || [];
  for (var t of existing)
    if (await env.DB.prepare("SELECT 1 FROM " + t.name + " LIMIT 1").first())
      throw szError("seized-cutover-target-not-empty");
  var before = rsWitness(
    env,
    "kv",
    ["k", "seq", "v"],
    rows,
    predicate,
    args,
  ).concat(
    rsWitness(env, "kv", ["k", "seq", "v"], departmentRows, "k=?1", [K_DEPTS]),
  );
  before.push(
    env.DB.prepare(
      "INSERT INTO meta(k,v)VALUES('seized_cutover_ready','validated')ON CONFLICT(k)DO UPDATE SET v=excluded.v",
    ),
  );
  var after = [
    env.DB.prepare(
      "SELECT CASE WHEN EXISTS(" +
        tables
          .map(function (n) {
            return "SELECT 1 FROM " + n;
          })
          .join(" UNION ALL ") +
        " LIMIT 1)THEN json_extract('{}','KIVO_SEIZED_TARGET_CHANGED')END",
    ),
  ];
  domains.forEach(function (domain) {
    after.push.apply(after, szInstallStatements(env, domain));
  });
  after.push(env.DB.prepare("DELETE FROM kv WHERE " + predicate).bind(args[0]));
  if (rows.length)
    after.push(
      env.DB.prepare(
        "INSERT INTO meta(k,v)VALUES('rev',CAST((SELECT MAX(n)+1 FROM(SELECT COALESCE(MAX(rev),0)n FROM revs UNION ALL SELECT COALESCE(CAST(v AS INTEGER),0)FROM meta WHERE k='rev'))AS TEXT))ON CONFLICT(k)DO UPDATE SET v=excluded.v",
      ),
    );
  return {
    before: before,
    after: after,
    domains: domains,
    n: domains.reduce(function (n, d) {
      return n + d.rows.reports.length;
    }, 0),
  };
}
