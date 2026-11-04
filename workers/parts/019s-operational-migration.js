/* One-time canonical KV cutover. Runtime access is typed SQL in019r; this
   reader exists only while initialization validates the original documents. */
function opLegacyNames() {
  return opDefinitions().map(function (definition) {
    return definition.resource;
  });
}
function opLegacyPredicate() {
  return "EXISTS(SELECT 1 FROM json_each(?1) op_legacy WHERE k=op_legacy.value OR k GLOB op_legacy.value||':*' OR k GLOB '*:'||op_legacy.value OR k GLOB '*:'||op_legacy.value||':*')";
}
function opRetiredGuard(env) {
  return env.DB.prepare(
    "SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE " +
      opLegacyPredicate() +
      ") THEN json_extract('{}','KIVO_OPERATIONS_LEGACY_SOURCE')END",
  ).bind(JSON.stringify(opLegacyNames()));
}
async function opGuardRetired(env) {
  if (
    await env.DB.prepare(
      "SELECT 1 FROM kv WHERE " + opLegacyPredicate() + " LIMIT 1",
    )
      .bind(JSON.stringify(opLegacyNames()))
      .first()
  ) {
    var error = ocError("legacy-source-present");
    error.status = 503;
    throw error;
  }
}
function opEmptyTargetGuards(env, tables) {
  var statements = [];
  // Bounded OR groups avoid D1's compound SELECT and expression-depth limits.
  for (var i = 0; i < tables.length; i += 20) {
    statements.push(
      env.DB.prepare(
        "SELECT CASE WHEN " +
          tables
            .slice(i, i + 20)
            .map(function (table) {
              return "EXISTS(SELECT 1 FROM " + table + ")";
            })
            .join(" OR ") +
          " THEN json_extract('{}','KIVO_OPERATIONS_TARGET_CHANGED')END",
      ),
    );
  }
  return statements;
}
async function opLegacyPrepare(env) {
  var predicate = opLegacyPredicate(),
    args = [JSON.stringify(opLegacyNames())];
  var captured = await env.DB.batch([
    env.DB.prepare(
      "SELECT k,seq,v FROM kv WHERE " + predicate + " ORDER BY k,seq",
    ).bind(args[0]),
    env.DB.prepare("SELECT k,seq,v FROM kv WHERE k=?1 ORDER BY seq").bind(
      K_DEPTS,
    ),
    env.DB.prepare(
      "SELECT k,rev FROM revs WHERE " + predicate + " ORDER BY k",
    ).bind(args[0]),
  ]);
  if (
    captured.some(function (result) {
      return !result || result.success === false;
    })
  )
    throw ocError("cutover-read");
  var rows = captured[0].results || [],
    departmentRows = captured[1].results || [],
    revisionRows = captured[2].results || [];
  var known = new Set(),
    departments,
    chunks = new Map(),
    domains = [],
    imageRows = [];
  departmentRows.forEach(function (row, index) {
    if (row.seq !== index || typeof row.v !== "string")
      throw ocError("cutover-departments");
  });
  try {
    departments = JSON.parse(
      departmentRows
        .map(function (row) {
          return row.v;
        })
        .join("") || "[]",
    );
  } catch (error) {
    throw ocError("cutover-departments");
  }
  if (!Array.isArray(departments)) throw ocError("cutover-departments");
  departments.forEach(function (department) {
    if (
      !ocObj(department) ||
      typeof department.id !== "string" ||
      !department.id ||
      department.id.length > 200 ||
      department.id.indexOf(":") >= 0 ||
      known.has(department.id)
    )
      throw ocError("cutover-departments");
    known.add(department.id);
  });
  function canonical(key) {
    var info;
    try {
      info = opInfo(key);
    } catch (error) {
      throw ocError("cutover-scope");
    }
    if (!info) throw ocError("cutover-scope");
    return info;
  }
  function scoped(key) {
    var info = canonical(key);
    if (!known.has(info.dept)) throw ocError("cutover-scope");
    return info;
  }
  rows.forEach(function (row) {
    scoped(row.k);
    var list = chunks.get(row.k) || [];
    if (row.seq !== list.length || typeof row.v !== "string")
      throw ocError("cutover-chunks");
    list.push(row.v);
    chunks.set(row.k, list);
  });
  revisionRows.forEach(function (row) {
    // Revision-only tombstones survive an authorized department deletion. They
    // contain no business document to import and must retain their exact value.
    // Live KV documents above still require a registered department.
    canonical(row.k);
    if (!Number.isSafeInteger(row.rev) || row.rev < 0)
      throw ocError("cutover-revision");
  });
  chunks.forEach(function (parts, key) {
    var value,
      info = scoped(key);
    try {
      value = JSON.parse(parts.join(""));
    } catch (error) {
      throw ocError("cutover-json");
    }
    // Every source document is decoded and validated before any DDL or write.
    var domain = ocConvert(
      info.prepared,
      info.dept,
      info.resource,
      value,
      true,
    );
    ocInflate(info.prepared, domain);
    domains.push(domain);
    Object.keys(imgIdsIn(parts.join("")))
      .sort()
      .forEach(function (image) {
        imageRows.push({ img: image, k: key });
      });
  });
  var imageKeys = Array.from(chunks.keys()),
    imageArgs = [JSON.stringify(imageKeys)],
    imageWhere = "k IN(SELECT value FROM json_each(?1))",
    oldImageRows = [];
  if (imageKeys.length) {
    var imageRead = await env.DB.prepare(
      "SELECT img,k FROM imgref WHERE " + imageWhere + " ORDER BY img,k",
    )
      .bind(imageArgs[0])
      .all();
    if (!imageRead || imageRead.success === false)
      throw ocError("cutover-read");
    oldImageRows = imageRead.results || [];
  }
  var tables = Object.keys(opPhysicalTables()),
    present = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN(SELECT value FROM json_each(?1))",
    )
      .bind(JSON.stringify(tables))
      .all();
  if (!present || present.success === false) throw ocError("cutover-read");
  var existing = present.results || [];
  if (existing.length) {
    var checked = await env.DB.batch(
      existing.map(function (table) {
        return env.DB.prepare("SELECT 1 FROM " + table.name + " LIMIT 1");
      }),
    );
    if (
      checked.some(function (result) {
        return !result || result.success === false;
      })
    )
      throw ocError("cutover-read");
    if (
      checked.some(function (result) {
        return result.results && result.results.length;
      })
    )
      throw ocError("cutover-target-not-empty");
  }
  var before = rsWitness(
    env,
    "kv",
    ["k", "seq", "v"],
    rows,
    predicate,
    args,
  ).concat(
    rsWitness(env, "kv", ["k", "seq", "v"], departmentRows, "k=?1", [K_DEPTS]),
    rsWitness(env, "revs", ["k", "rev"], revisionRows, predicate, args),
  );
  if (imageKeys.length)
    before.push.apply(
      before,
      rsWitness(
        env,
        "imgref",
        ["img", "k"],
        oldImageRows,
        imageWhere,
        imageArgs,
      ),
    );
  before.push(
    env.DB.prepare(
      "INSERT INTO meta(k,v)VALUES('operations_cutover_ready','validated')ON CONFLICT(k)DO UPDATE SET v=excluded.v",
    ),
  );
  var after = opEmptyTargetGuards(env, tables);
  domains.forEach(function (domain) {
    after.push.apply(after, opBulkInstall(env, domain.resource, domain));
  });
  if (imageKeys.length) {
    after.push(
      env.DB.prepare("DELETE FROM imgref WHERE " + imageWhere).bind(
        imageArgs[0],
      ),
    );
    rsChunks(imageRows).forEach(function (part) {
      after.push(
        env.DB.prepare(
          "INSERT INTO imgref(img,k)SELECT json_extract(j.value,'$.img'),json_extract(j.value,'$.k')FROM json_each(?1)j",
        ).bind(JSON.stringify(part)),
      );
    });
  }
  after.push(
    env.DB.prepare("DELETE FROM kv WHERE " + predicate).bind(args[0]),
    env.DB.prepare("DELETE FROM meta WHERE k='operations_cutover_ready'"),
  );
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
    n: domains.length,
    departmentRowsSha256: hex(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(departmentRows)),
      ),
    ),
  };
}
