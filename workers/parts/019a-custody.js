/* Canonical custody domain: typed D1 storage, validated legacy cutover and scoped operations. */
var CU_RESOURCE = 'bassam_custody_v1';
var CU_TABLES = {
  items: ['custody_items', ['department_id', 'item_id', 'name', 'qty', 'prefix', 'color', 'presence_mask']],
  issues: ['custody_issues', ['department_id', 'issue_id', 'item_id', 'serial', 'serial_number', 'legacy_identity']],
  moves: [
    'custody_movements',
    [
      'department_id',
      'move_id',
      'issue_id',
      'item_id',
      'sequence',
      'kind',
      'holder_key',
      'hijri_year',
      'hijri_month',
      'hijri_day',
      'condition',
      'note',
      'color_snapshot',
      'actor_uid',
      'actor_label',
      'holder_nid_snapshot',
      'holder_empno_snapshot',
      'holder_name_snapshot',
      'presence_mask',
      'created_at',
    ],
  ],
};
/* cuError → 016-base-shared.js (V7 · المرحلة 2 · الحزمة أ) */
function cuShape(value, fields) {
  if (
    !isObj(value) ||
    Object.keys(value).some(function (k) {
      return fields.indexOf(k) < 0;
    })
  )
    throw cuError('custody-shape');
}
function cuString(v, max, empty) {
  if (typeof v !== 'string' || v.length > max || (!empty && !v.trim())) throw cuError('custody-text');
  return v;
}
/* Existing movement text was grandfathered by the legacy save validator.
   Migration/restore must preserve it, rather than applying the new-write 4096
   limit retroactively. The existing UTF-8 SQL-row transport cap still applies;
   cuJsonChunks separately validates the complete serialized row before writes. */
function cuHistoricalText(v) {
  if (typeof v !== 'string' || v.length > 600000 || (v.length > 4096 && new TextEncoder().encode(v).length > 600000))
    throw cuError('custody-text');
  return v;
}
function cuKey(dept) {
  return 'bsdept:' + dept + ':' + CU_RESOURCE;
}
function cuLegacyKey(k) {
  return resName(k) === CU_RESOURCE;
}
function cuBulk(env, table, columns, rows) {
  if (!rows.length) return [];
  return cuJsonChunks(rows).map(function (chunk) {
    return env.DB.prepare(
      'INSERT INTO ' +
        table +
        '(' +
        columns
          .map(function (c) {
            return '"' + c + '"';
          })
          .join(',') +
        ') SELECT ' +
        columns
          .map(function (c) {
            return "json_extract(value,'$." + c + "')";
          })
          .join(',') +
        ' FROM json_each(?1)',
    ).bind(chunk);
  });
}
function cuJsonChunks(rows) {
  var chunks = [],
    part = [],
    bytes = 2,
    encoder = new TextEncoder();
  rows.forEach(function (row) {
    var text = JSON.stringify(row),
      n = encoder.encode(text).length;
    if (n + 2 > 600000) throw cuError('custody-row-too-large', 413);
    if (bytes + n + (part.length ? 1 : 0) > 600000) {
      chunks.push('[' + part.join(',') + ']');
      part = [];
      bytes = 2;
    }
    part.push(text);
    bytes += n + (part.length > 1 ? 1 : 0);
  });
  if (part.length) chunks.push('[' + part.join(',') + ']');
  return chunks;
}
async function cuLegacyPresent(env) {
  return !!(await env.DB.prepare("SELECT 1 FROM kv WHERE k='bassam_custody_v1' OR k GLOB 'bsdept:*:bassam_custody_v1' LIMIT 1").first());
}
function cuConvert(dept, doc) {
  cuShape(doc, ['items', 'moves']);
  if (!Array.isArray(doc.items) || !Array.isArray(doc.moves)) throw cuError('custody-cutover-shape');
  var out = { items: [], issues: [], moves: [] },
    names = new Map(),
    issues = new Map(),
    serialOwners = new Map(),
    projectionOwners = new Map();
  doc.items.forEach(function (item, index) {
    cuShape(item, ['name', 'qty', 'prefix', 'color']);
    cuString(item.name, 4096, false);
    if (names.has(item.name)) throw cuError('custody-cutover-item-ambiguous');
    if (item.qty !== undefined && (typeof item.qty !== 'number' || !Number.isFinite(item.qty) || item.qty < 0))
      throw cuError('custody-cutover-quantity');
    ['prefix', 'color'].forEach(function (k) {
      if (item[k] !== undefined) cuString(item[k], 4096, true);
    });
    var r = {
      department_id: dept,
      item_id: 'legacy-item-' + index,
      name: item.name,
      qty: item.qty === undefined ? 0 : item.qty,
      prefix: item.prefix === undefined ? null : item.prefix,
      color: item.color === undefined ? null : item.color,
      presence_mask: (item.qty !== undefined ? 1 : 0) | (item.prefix !== undefined ? 2 : 0) | (item.color !== undefined ? 4 : 0),
    };
    names.set(item.name, r);
    out.items.push(r);
  });
  doc.moves.forEach(function (m, index) {
    cuShape(m, ['t', 'eid', 'item', 'ser', 'y', 'm', 'd', 'cond', 'note', 'by', 'nid', 'empno', 'name', 'color']);
    ['eid', 'item', 'ser'].forEach(function (k) {
      cuString(m[k], 4096, k === 'ser');
    });
    if (
      ['out', 'in', 'dmg', 'lost'].indexOf(m.t) < 0 ||
      ![m.y, m.m, m.d].every(Number.isSafeInteger) ||
      m.y < 1000 ||
      m.y > 9999 ||
      m.m < 1 ||
      m.m > 12 ||
      m.d < 0 ||
      m.d > 30
    )
      throw cuError('custody-cutover-date-kind');
    ['cond', 'note', 'by', 'nid', 'empno', 'name', 'color'].forEach(function (k) {
      if (m[k] !== undefined) cuHistoricalText(m[k]);
    });
    var item = names.get(m.item);
    if (!item) throw cuError('custody-cutover-item-missing');
    if (m.ser && serialOwners.has(m.ser) && serialOwners.get(m.ser) !== m.item) throw cuError('custody-cutover-serial-ambiguous');
    if (m.ser) serialOwners.set(m.ser, m.item);
    var identity = m.ser ? 'serial:' + m.ser : 'holder:' + m.item.length + ':' + m.item + ':' + m.eid,
      projection = m.ser || m.item + '#' + m.eid;
    if (projectionOwners.has(projection) && projectionOwners.get(projection) !== identity)
      throw cuError('custody-cutover-identity-ambiguous');
    projectionOwners.set(projection, identity);
    var issue = issues.get(identity);
    if (!issue) {
      var suffix = /([0-9]+)\s*$/.exec(m.ser),
        n = suffix ? Number(suffix[1]) : 0;
      if (!Number.isSafeInteger(n)) throw cuError('custody-cutover-serial-range');
      issue = {
        department_id: dept,
        issue_id: 'legacy-issue-' + issues.size,
        item_id: item.item_id,
        serial: m.ser,
        serial_number: n,
        legacy_identity: identity,
      };
      issues.set(identity, issue);
      out.issues.push(issue);
    }
    var r = {
      department_id: dept,
      move_id: 'legacy-move-' + index,
      issue_id: issue.issue_id,
      item_id: item.item_id,
      sequence: index,
      kind: m.t,
      holder_key: m.eid,
      hijri_year: m.y,
      hijri_month: m.m,
      hijri_day: m.d,
      presence_mask: 0,
      created_at: null,
      actor_uid: null,
    };
    var optional = {
      cond: 'condition',
      note: 'note',
      color: 'color_snapshot',
      by: 'actor_label',
      nid: 'holder_nid_snapshot',
      empno: 'holder_empno_snapshot',
      name: 'holder_name_snapshot',
    };
    Object.keys(optional).forEach(function (k, i) {
      r[optional[k]] = m[k] === undefined ? null : m[k];
      if (m[k] !== undefined) r.presence_mask |= 1 << i;
    });
    out.moves.push(r);
  });
  return out;
}
async function cuLegacyPrepare(env) {
  var rows =
    (await env.DB.prepare("SELECT k,seq,v FROM kv WHERE k='bassam_custody_v1' OR k GLOB 'bsdept:*:bassam_custody_v1' ORDER BY k,seq").all())
      .results || [];
  if (!rows.length) return { before: [], after: [], n: 0 };
  var groups = new Map();
  rows.forEach(function (r) {
    if (r.k === CU_RESOURCE) throw cuError('custody-cutover-scope-unknown');
    var p = parseKey(r.k);
    if (!p.dept || r.k !== cuKey(p.dept)) throw cuError('custody-cutover-scope-unknown');
    var g = groups.get(r.k) || [];
    if (!Number.isSafeInteger(r.seq) || r.seq !== g.length || typeof r.v !== 'string') throw cuError('custody-cutover-chunks');
    g.push(r);
    groups.set(r.k, g);
  });
  var data = [];
  groups.forEach(function (g, k) {
    var d;
    try {
      d = JSON.parse(
        g
          .map(function (r) {
            return r.v;
          })
          .join(''),
      );
    } catch (e) {
      throw cuError('custody-cutover-json');
    }
    data.push(cuConvert(parseKey(k).dept, d));
  });
  var names = Object.keys(CU_TABLES)
    .map(function (k) {
      return CU_TABLES[k][0];
    })
    .concat(['custody_requests', 'custody_request_outputs']);
  var existing =
    (
      await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN (SELECT value FROM json_each(?1))")
        .bind(JSON.stringify(names))
        .all()
    ).results || [];
  for (var t of existing) {
    if (await env.DB.prepare('SELECT 1 FROM ' + t.name + ' LIMIT 1').first()) throw cuError('custody-cutover-target-not-empty');
  }
  var before = [
    env.DB.prepare(
      "SELECT CASE WHEN (SELECT COUNT(*) FROM kv WHERE k='bassam_custody_v1' OR k GLOB 'bsdept:*:bassam_custody_v1')!=?1 THEN json_extract('{}','KIVO_CUSTODY_SOURCE_CHANGED') END",
    ).bind(rows.length),
  ];
  rows.forEach(function (r) {
    before.push(
      env.DB.prepare(
        "SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM kv WHERE k=?1 AND seq=?2 AND v=?3) THEN json_extract('{}','KIVO_CUSTODY_SOURCE_CHANGED') END",
      ).bind(r.k, r.seq, r.v),
    );
  });
  before.push(env.DB.prepare("INSERT INTO meta(k,v) VALUES('cu_cutover_ready','validated') ON CONFLICT(k) DO UPDATE SET v=excluded.v"));
  var after = [
      env.DB.prepare(
        'SELECT CASE WHEN EXISTS(' +
          names
            .map(function (n) {
              return 'SELECT 1 FROM ' + n;
            })
            .join(' UNION ALL ') +
          " LIMIT 1) THEN json_extract('{}','KIVO_CUSTODY_TARGET_CHANGED') END",
      ),
    ],
    n = 0;
  data.forEach(function (d) {
    Object.keys(CU_TABLES).forEach(function (k) {
      after.push.apply(after, cuBulk(env, CU_TABLES[k][0], CU_TABLES[k][1], d[k]));
    });
    n += d.moves.length;
  });
  after.push(env.DB.prepare("DELETE FROM kv WHERE k GLOB 'bsdept:*:bassam_custody_v1'"));
  after.push(
    env.DB.prepare(
      "INSERT INTO meta(k,v) VALUES('rev',CAST(COALESCE((SELECT MAX(rev) FROM revs),0)+1 AS TEXT)) ON CONFLICT(k) DO UPDATE SET v=CAST(MAX(CAST(meta.v AS INTEGER),COALESCE((SELECT MAX(rev) FROM revs),0))+1 AS TEXT)",
    ),
  );
  groups.forEach(function (g, k) {
    after.push(
      env.DB.prepare(
        "INSERT INTO revs(k,rev) VALUES(?1,CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER)) ON CONFLICT(k) DO UPDATE SET rev=excluded.rev",
      ).bind(k),
    );
  });
  return { before: before, after: after, n: n };
}
/* cuClock → 016-base-shared.js (V7 · المرحلة 2 · الحزمة أ) */
async function cuRev(env, d) {
  var r = await env.DB.prepare('SELECT rev FROM revs WHERE k=?1').bind(cuKey(d)).first();
  return r ? r.rev : 0;
}
function cuLatest(deptSlot, cutoffSlot) {
  return (
    'm.department_id=' +
    deptSlot +
    ' AND m.hijri_year*12+m.hijri_month<=' +
    cutoffSlot +
    ' AND NOT EXISTS(SELECT 1 FROM custody_movements z WHERE z.department_id=m.department_id AND z.issue_id=m.issue_id AND z.hijri_year*12+z.hijri_month<=' +
    cutoffSlot +
    ' AND (z.hijri_year,z.hijri_month,z.hijri_day,z.sequence)>(m.hijri_year,m.hijri_month,m.hijri_day,m.sequence))'
  );
}
async function cuAuthority(env, A, d, op, meta) {
  if (!deptInScope(A, d)) throw cuError('custody-denied', 403);
  var item = { name: 'TEST_WITNESS', qty: 1, prefix: 'RD', color: '#b99751' },
    before = { items: [item], moves: [] },
    after = { items: [Object.assign({}, item)], moves: [] };
  if (op === 'type-create') {
    before.items = [];
  } else if (op === 'type-edit') {
    after.items[0].qty = 2;
  } else if (op === 'type-delete') {
    after.items = [];
  } else {
    after.moves = [{ t: op === 'close' ? 'in' : 'out', eid: 'WITNESS', item: item.name, ser: 'WITNESS-001', y: 1448, m: 1, d: 1 }];
  }
  var k = cuKey(d),
    ctx = {},
    X = null,
    set = {},
    keys = {};
  set[k] = JSON.stringify(after);
  keys[k] = 1;
  if (A.enf) {
    X = await enfSavePrep(env, A, {}, set, [], keys, KIVO_BUILD.markers({}, keys), null, false, false, {}, {});
    ctx.enf = enfCtxFor(X, k, '');
  }
  var v = X && X.batchDeny ? enfNo(X.batchDeny.why, X.batchDeny) : canWrite(A, k, JSON.stringify(after), JSON.stringify(before), ctx);
  if (v.ok) return v;
  var st = [secStmt(env, { uid: A.u.id, act: 'denied', target: k, detail: 'custody:' + op, ip: (meta && meta.ip) || '' })];
  if (A.enf) {
    var log = enfLogRow(A, k, v, '/api/custody/act', meta || {});
    if (log) st.push(enfLogStmt(env, log));
  }
  await env.DB.batch(st);
  throw cuError('custody-denied', 403);
}
/* cuCanonical → 016-base-shared.js (V7 · المرحلة 2 · الحزمة أ) */
/* cuFingerprint → 016-base-shared.js (V7 · المرحلة 2 · الحزمة أ) */
async function cuReceipt(env, A, d, rid, hash) {
  var r = await env.DB.prepare('SELECT * FROM custody_requests WHERE department_id=?1 AND account_uid=?2 AND request_id=?3')
    .bind(d, A.u.id, rid)
    .first();
  if (!r) return null;
  if (r.fingerprint !== hash) throw cuError('custody-request-reused', 409);
  var rows =
    (
      await env.DB.prepare(
        'SELECT issue_id AS issueId,move_id AS moveId,serial FROM custody_request_outputs WHERE department_id=?1 AND account_uid=?2 AND request_id=?3 ORDER BY position',
      )
        .bind(d, A.u.id, rid)
        .all()
    ).results || [];
  var ack = { ok: 1, rev: r.resource_rev, requestId: rid, op: r.operation, n: r.result_n, outputs: rows };
  if (r.item_id) ack.itemId = r.item_id;
  return ack;
}
async function cuNotifyCommitted(env, A, d, ack) {
  if (!ack.outputs.length) return;
  var rows =
    (
      await env.DB.prepare(
        'SELECT m.*,i.name,s.serial FROM custody_request_outputs o JOIN custody_movements m ON m.department_id=o.department_id AND m.move_id=o.move_id JOIN custody_items i ON i.department_id=m.department_id AND i.item_id=m.item_id JOIN custody_issues s ON s.department_id=m.department_id AND s.issue_id=m.issue_id WHERE o.department_id=?1 AND o.account_uid=?2 AND o.request_id=?3 ORDER BY o.position',
      )
        .bind(d, A.u.id, ack.requestId)
        .all()
    ).results || [];
  var events = rows.map(function (r) {
    return {
      type: r.kind === 'out' ? 'cu_out' : r.kind === 'in' ? 'cu_in' : 'cu_lost',
      dept: d,
      own: [r.holder_key],
      once: 'custody:' + r.move_id,
      vars: {
        العهدة: r.name,
        الرقم: r.serial,
        الاسم: r.holder_name_snapshot || r.holder_key,
        الحالة: r.kind === 'dmg' ? 'تالفة' : 'مفقودة',
        التاريخ: r.hijri_year + '-' + r.hijri_month + '-' + r.hijri_day,
      },
    };
  });
  if (ack.op === 'issue-batch')
    events.push({
      type: 'cu_bond',
      dept: d,
      own: Array.from(
        new Set(
          rows.map(function (r) {
            return r.holder_key;
          }),
        ),
      ),
      once: 'custody:bond:' + A.u.id + ':' + ack.requestId,
      vars: { النوع: 'تسليم', الرقم: ack.requestId, العدد: rows.length },
    });
  var c = cuClock(),
    seen = new Set();
  for (var row of rows) {
    if (row.kind !== 'out' || seen.has(row.item_id)) continue;
    seen.add(row.item_id);
    var stock = await env.DB.prepare(
      'SELECT qty-(SELECT COUNT(*) FROM custody_movements m WHERE ' +
        cuLatest('?1', '?2') +
        " AND m.item_id=?3 AND m.kind IN ('out','dmg','lost')) AS available FROM custody_items WHERE department_id=?1 AND item_id=?3",
    )
      .bind(d, c.y * 12 + c.m, row.item_id)
      .first();
    if (stock && stock.available <= 0)
      events.push({
        type: 'cu_stock',
        dept: d,
        once: 'custody:stock:' + A.u.id + ':' + ack.requestId + ':' + row.item_id,
        vars: { الصنف: row.name },
      });
  }
  events.forEach(function (event) {
    event.own = (event.own || []).filter(function (id) {
      return typeof id === 'string' && id.length <= 200;
    });
    Object.keys(event.vars || {}).forEach(function (key) {
      event.vars[key] = String(event.vars[key]).slice(0, 4000);
    });
  });
  for (var offset = 0; offset < events.length; offset += 200) await nfEmitEvents(env, A, events.slice(offset, offset + 200), true);
}
function cuItem(row) {
  return { id: row.item_id, name: row.name, qty: row.qty, prefix: row.prefix || 'RD', color: row.color || '#b99751' };
}
function cuCursor(x) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(x))))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
function cuUncursor(s) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')))));
  } catch (e) {
    throw cuError('custody-cursor');
  }
}
function cuResolvedCte(allMoves) {
  var where = allMoves ? 'm.department_id=?1 AND m.hijri_year*12+m.hijri_month=?2' : cuLatest('?1', '?2');
  return (
    "WITH employees AS (SELECT COALESCE(NULLIF(json_extract(value,'$.eid'),''),json_extract(value,'$.name')) AS ek,json_extract(value,'$.nid') AS nid,json_extract(value,'$.empno') AS empno,json_extract(value,'$.name') AS name FROM json_each(?3)), base AS (SELECT m.*,s.serial,i.name AS item_name FROM custody_movements m JOIN custody_issues s ON s.department_id=m.department_id AND s.issue_id=m.issue_id JOIN custody_items i ON i.department_id=m.department_id AND i.item_id=m.item_id WHERE " +
    where +
    "), matches AS (SELECT b.*,(SELECT MIN(ek) FROM employees e WHERE e.ek=b.holder_key) AS exact_key,(SELECT COUNT(DISTINCT ek) FROM employees e WHERE (b.holder_nid_snapshot!='' AND e.nid=b.holder_nid_snapshot) OR (b.holder_empno_snapshot!='' AND e.empno=b.holder_empno_snapshot) OR (b.holder_key!='' AND e.nid=b.holder_key)) AS alias_n,(SELECT MIN(ek) FROM employees e WHERE (b.holder_nid_snapshot!='' AND e.nid=b.holder_nid_snapshot) OR (b.holder_empno_snapshot!='' AND e.empno=b.holder_empno_snapshot) OR (b.holder_key!='' AND e.nid=b.holder_key)) AS alias_key FROM base b), resolved AS (SELECT *,COALESCE(exact_key,CASE WHEN alias_n=1 THEN alias_key END,holder_key) AS hkey FROM matches) "
  );
}
function cuBind(env, sql, args) {
  if (/^WITH /.test(sql)) sql = 'SELECT * FROM (' + sql + ')';
  var statement = env.DB.prepare(sql);
  return statement.bind.apply(statement, args);
}
function cuIssueDto(row) {
  return {
    issueId: row.issue_id,
    moveId: row.move_id,
    itemId: row.item_id,
    item: row.item_name,
    ser: row.serial,
    color: row.color_snapshot || '#b99751',
    cond: row.condition || '',
    kind: row.kind,
    eid: row.hkey,
    hid: row.holder_key,
    snapshot: { nid: row.holder_nid_snapshot || '', empno: row.holder_empno_snapshot || '', name: row.holder_name_snapshot || '' },
    y: row.hijri_year,
    m: row.hijri_month,
    d: row.hijri_day,
    note: row.note || '',
    by: row.actor_label || '',
    orphan: !row.exact_key && row.alias_n !== 1,
    ambiguous: !row.exact_key && row.alias_n > 1,
  };
}
function cuCatalogSql(limit, after) {
  return (
    'SELECT i.*,COALESCE((SELECT COUNT(*) FROM custody_movements m WHERE ' +
    cuLatest('?1', '?2') +
    " AND m.item_id=i.item_id AND m.kind='out'),0) AS held,COALESCE((SELECT COUNT(*) FROM custody_movements m WHERE " +
    cuLatest('?1', '?2') +
    " AND m.item_id=i.item_id AND m.kind='dmg'),0) AS dmg,COALESCE((SELECT COUNT(*) FROM custody_movements m WHERE " +
    cuLatest('?1', '?2') +
    " AND m.item_id=i.item_id AND m.kind='lost'),0) AS lost,(SELECT COUNT(*) FROM custody_movements m WHERE m.department_id=i.department_id AND m.item_id=i.item_id) AS moveCount FROM custody_items i WHERE i.department_id=?1" +
    (after ? ' AND i.item_id>?3' : '') +
    ' ORDER BY i.item_id LIMIT ' +
    (limit + 1)
  );
}
function cuCatalogDto(row) {
  return Object.assign(cuItem(row), {
    held: row.held,
    dead: row.dmg + row.lost,
    dmg: row.dmg,
    lost: row.lost,
    available: Math.max(0, row.qty - row.held - row.dmg - row.lost),
    moveCount: row.moveCount,
  });
}
async function cuRead(env, A, q) {
  var d = cuString(q.dept, 200, false),
    k = cuKey(d);
  if (!canRead(A, k)) throw cuError('custody-denied', 403);
  if (await cuLegacyPresent(env)) throw cuError('custody-legacy-source-present', 503);
  var clock = cuClock(),
    y = q.year === undefined ? clock.y : Number(q.year),
    m = q.month === undefined ? clock.m : Number(q.month),
    view = q.view || 'month',
    limit = q.limit === undefined ? 100 : Number(q.limit),
    query = q.q === undefined ? '' : cuString(q.q, 200, true),
    holder = q.holderKey === undefined ? '' : cuString(q.holderKey, 4096, false),
    kind = q.kind || '';
  if (
    !Number.isSafeInteger(y) ||
    y < 1000 ||
    y > 9999 ||
    !Number.isSafeInteger(m) ||
    m < 1 ||
    m > 12 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 200 ||
    ['month', 'holder', 'moves', 'catalog'].indexOf(view) < 0 ||
    (view === 'holder' && !holder) ||
    (kind && ['out', 'in', 'dmg', 'lost'].indexOf(kind) < 0)
  )
    throw cuError('custody-query');
  if (view === 'month') limit = Math.min(limit, 100);
  var token = q.cursor ? cuUncursor(q.cursor) : null,
    cutoff = y * 12 + m,
    currentCutoff = clock.y * 12 + clock.m,
    employeeDoc = parseJson(await opResourceGet(env, 'bsdept:' + d + ':bassam_employees_v1'), []);
  if (!Array.isArray(employeeDoc)) throw cuError('custody-employees-shape');
  var employeeJson = JSON.stringify(employeeDoc);
  // PRIVACY (019u (10)): holders outside the register ⇒ an opaque token for a reader not allowed personal data
  if (!privPersonalOk(A, d)) privCustodyOrph(A, d, (await env.DB.prepare('SELECT m.holder_key k,m.move_id mv FROM custody_movements m WHERE m.department_id=?1 AND m.sequence=(SELECT MIN(x.sequence) FROM custody_movements x WHERE x.department_id=?1 AND x.holder_key=m.holder_key)').bind(d).all()).results || [], employeeJson);
  var cte = cuResolvedCte(view === 'moves'),
    latestCte = cuResolvedCte(false),
    args = [d, cutoff, employeeJson, query, privCustodyHolder(A, d, holder, employeeJson), kind];   // PRIVACY (019u): a holder token the reader got (the cursor keeps the token)
  var label = "COALESCE((SELECT MIN(name) FROM employees e WHERE e.ek=r.hkey),r.holder_name_snapshot,'')";
  var search =
    "(?4='' OR instr(lower(r.item_name),lower(?4))>0 OR instr(lower(r.serial),lower(?4))>0 OR " +
    // PRIVACY (019u): the holder nid/empno snapshots are searched only for a reader who receives them — else the match is an oracle
    (privPersonalOk(A, d) ? "instr(lower(COALESCE(r.holder_nid_snapshot,'')),lower(?4))>0 OR instr(lower(COALESCE(r.holder_empno_snapshot,'')),lower(?4))>0 OR " : '') +
    "instr(lower(" +
    label +
    '),lower(?4))>0)';
  var filters = "(?5='' OR r.hkey=?5) AND (?6='' OR r.kind=?6)";
  for (var attempt = 0; attempt < 3; attempt++) {
    var rev = await cuRev(env, d);
    if (
      token &&
      (token.rev !== rev ||
        token.uid !== A.u.id ||
        token.dept !== d ||
        token.view !== view ||
        token.y !== y ||
        token.m !== m ||
        token.q !== query ||
        token.holder !== holder ||
        token.kind !== kind ||
        token.clock !== currentCutoff)
    )
      throw cuError('custody-cursor-stale', 409);
    if (token && (!Array.isArray(token.key) || token.key.length !== (['month', 'catalog'].includes(view) ? 1 : 5) || (view === 'month' && !(Number.isSafeInteger(token.key[0]) && token.key[0] > 0))))
      throw cuError('custody-cursor');
    var from = ' FROM resolved r WHERE ' + filters + ' AND ' + search;
    if (view === 'month')
      from = " FROM resolved r WHERE r.kind='out' AND " + filters + ' AND r.hkey IN (SELECT r.hkey FROM resolved r WHERE ' + search + ')';
    else if (view === 'holder') from += " AND r.kind='out'";
    var countSql = cte + 'SELECT COUNT(*) n' + (view === 'month' ? ' FROM (SELECT r.hkey' + from + ' GROUP BY r.hkey)' : ' ' + from),
      pageArgs = args.slice(),
      pageSql;
    if (view === 'month') {
      pageSql =
        cte +
        "SELECT r.hkey AS holderKey,COUNT(*) AS heldCount,MAX(r.hijri_year*10000+r.hijri_month*100+r.hijri_day) AS last_day,MAX(COALESCE((SELECT MIN(name) FROM employees e WHERE e.ek=r.hkey),r.holder_name_snapshot,'')) AS name,MAX(COALESCE(r.holder_nid_snapshot,'')) AS nid,MAX(COALESCE(r.holder_empno_snapshot,'')) AS empno,MAX(CASE WHEN r.exact_key IS NULL AND r.alias_n!=1 THEN 1 ELSE 0 END) AS orphan,MAX(CASE WHEN r.exact_key IS NULL AND r.alias_n>1 THEN 1 ELSE 0 END) AS ambiguous" +
        from +
        ' GROUP BY r.hkey ORDER BY r.hkey LIMIT ' +
        (limit + 1) +
        // PRIVACY (019u): month pages by position — the cursor is bound to rev/uid/filters (stale ⇒ 409), so no holder key (a nid in old data) is encoded
        (token ? ' OFFSET ' + token.key[0] : '');
    } else {
      pageSql =
        cte +
        'SELECT r.*' +
        from +
        (token ? ' AND (r.hijri_year,r.hijri_month,r.hijri_day,r.sequence,r.move_id)>(?7,?8,?9,?10,?11)' : '') +
        ' ORDER BY r.hijri_year,r.hijri_month,r.hijri_day,r.sequence,r.move_id LIMIT ' +
        (limit + 1);
      if (token) pageArgs.push.apply(pageArgs, token.key);
    }
    var countArgs = args,
      catArgs = [d, cutoff],
      catalogLimit = view === 'catalog' ? limit : 200;
    if (view === 'catalog') {
      catArgs = token ? [d, cutoff, token.key[0]] : [d, cutoff];
      pageSql = cuCatalogSql(limit, !!token);
      pageArgs = catArgs;
      countSql = 'SELECT COUNT(*) n FROM custody_items WHERE department_id=?1';
      countArgs = [d];
    }
    var stateSql =
      "SELECT SUM(kind='out') AS held,SUM(kind='dmg') AS dmg,SUM(kind='lost') AS lost FROM custody_movements m WHERE " +
      cuLatest('?1', '?2');
    var topSql =
      latestCte +
      "SELECT r.hkey AS holderKey,MAX(COALESCE((SELECT MIN(name) FROM employees e WHERE e.ek=r.hkey),r.holder_name_snapshot,'')) AS name,COUNT(*) n FROM resolved r WHERE r.kind='out' GROUP BY r.hkey ORDER BY n DESC,r.hkey LIMIT 4";
    var st = [
      env.DB.prepare('SELECT rev FROM revs WHERE k=?1').bind(k),
      cuBind(env, pageSql, pageArgs),
      cuBind(env, countSql, countArgs),
      env.DB.prepare(stateSql).bind(d, cutoff),
      env.DB.prepare(stateSql).bind(d, cutoff - 1),
      env.DB.prepare(
        'SELECT kind,COUNT(*) n FROM custody_movements WHERE department_id=?1 AND hijri_year=?2 AND hijri_month=?3 GROUP BY kind',
      ).bind(d, y, m),
      cuBind(env, topSql, [d, cutoff, employeeJson]),
    ];
    if (view !== 'catalog') st.push(cuBind(env, cuCatalogSql(catalogLimit, false), catArgs));
    var totalsIndex = st.length;
    st.push(
      env.DB.prepare(
        'SELECT COUNT(*) catalogTotal,COALESCE(SUM(i.qty),0) totalQty,COALESCE(SUM(MAX(0,i.qty-(SELECT COUNT(*) FROM custody_movements m WHERE ' +
          cuLatest('?1', '?2') +
          " AND m.item_id=i.item_id AND m.kind IN ('out','dmg','lost')))),0) available FROM custody_items i WHERE i.department_id=?1",
      ).bind(d, cutoff),
    );
    var batch = await env.DB.batch(st),
      actual = batch[0].results[0] ? batch[0].results[0].rev : 0;
    if (actual !== rev) continue;
    var rows = batch[1].results || [],
      more = rows.length > limit;
    rows = rows.slice(0, limit);
    var last = rows[rows.length - 1],
      state = batch[3].results[0] || {},
      summary = {
        held: state.held || 0,
        dmg: state.dmg || 0,
        lost: state.lost || 0,
        dead: (state.dmg || 0) + (state.lost || 0),
        openingHeld: (batch[4].results[0] || {}).held || 0,
        out: 0,
        in: 0,
        monthlyDmg: 0,
        monthlyLost: 0,
        topHolders: privCustodyRows(A, d, batch[6].results || [], employeeJson),   // PRIVACY (019u): a holder key that is a hidden nid
        maxHeld: 0,
      };
    (batch[5].results || []).forEach(function (r) {
      summary[r.kind === 'dmg' ? 'monthlyDmg' : r.kind === 'lost' ? 'monthlyLost' : r.kind] = r.n;
    });
    if (summary.topHolders.length) summary.maxHeld = summary.topHolders[0].n;
    Object.assign(summary, batch[totalsIndex].results[0]);
    function cursor(v, key) {
      return cuCursor({
        uid: A.u.id,
        dept: d,
        rev: rev,
        view: v,
        y: y,
        m: m,
        q: query,
        holder: holder,
        kind: kind,
        clock: currentCutoff,
        key: key,
      });
    }
    var catalog = view === 'catalog' ? rows : (batch[7].results || []).slice(0, catalogLimit),
      catMore = view !== 'catalog' && (batch[7].results || []).length > catalogLimit;
    var mapped =
      view === 'month'
        ? rows.map(function (r) {
            return {
              holderKey: r.holderKey,
              snapshot: { eid: r.holderKey, name: r.name, nid: r.nid, empno: r.empno },
              heldCount: r.heldCount,
              last: { y: Math.floor(r.last_day / 10000), m: Math.floor(r.last_day / 100) % 100, d: r.last_day % 100 },
              orphan: !!r.orphan,
              ambiguous: !!r.ambiguous,
            };
          })
        : rows.map(cuIssueDto);
    return {
      ok: 1,
      rev: rev,
      clock: clock,
      year: y,
      month: m,
      view: view,
      items: catalog.map(cuCatalogDto),
      rows: view === 'catalog' ? [] : privCustodyRows(A, d, mapped, employeeJson),   // PRIVACY batch (019u): holder nid/empno snapshots by purpose
      total: batch[2].results[0].n,
      summary: summary,
      next: more
        ? cursor(
            view,
            view === 'month'
              ? [(token ? token.key[0] : 0) + rows.length]
              : view === 'catalog'
                ? [last.item_id]
                : [last.hijri_year, last.hijri_month, last.hijri_day, last.sequence, last.move_id],
          )
        : '',
      catalogNext: catMore ? cursor('catalog', [catalog[catalog.length - 1].item_id]) : '',
    };
  }
  throw cuError('custody-read-race', 409);
}

async function cuAct(env, A, b, meta) {
  cuShape(b, [
    'uid',
    'dept',
    'base',
    'requestId',
    'op',
    'item',
    'itemId',
    'patch',
    'holderKey',
    'condition',
    'color',
    'lines',
    'issueId',
    'kind',
    'note',
  ]);
  var d = cuString(b.dept, 200, false),
    op = b.op,
    rid = cuString(b.requestId, 100, false),
    k = cuKey(d),
    ops = ['type-create', 'type-edit', 'type-delete', 'issue', 'issue-batch', 'close'];
  if (ops.indexOf(op) < 0 || !Number.isSafeInteger(b.base) || b.base < 0) throw cuError('custody-operation');
  var opFields = {
    'type-create': ['item'],
    'type-edit': ['itemId', 'patch'],
    'type-delete': ['itemId'],
    issue: ['itemId', 'holderKey', 'condition', 'color'],
    'issue-batch': ['lines'],
    close: ['issueId', 'kind', 'note'],
  };
  cuShape(b, ['uid', 'dept', 'base', 'requestId', 'op'].concat(opFields[op]));
  if (b.uid !== undefined && b.uid !== A.u.id) throw cuError('session-changed', 409);
  if (await cuLegacyPresent(env)) throw cuError('custody-legacy-source-present', 503);
  await cuAuthority(env, A, d, op, meta);
  var hash = await cuFingerprint(b),
    receipt = await cuReceipt(env, A, d, rid, hash);
  if (receipt) {
    try {
      await cuNotifyCommitted(env, A, d, receipt);
    } catch (e) {
      swallow('custody-notify', e, env.__rid);
    }
    return receipt;
  }
  var base = await cuRev(env, d);
  if (base !== b.base) throw cuError('custody-conflict', 409);
  var clock = cuClock(),
    now = Date.now(),
    cutoff = clock.y * 12 + clock.m,
    outputs = [],
    st = [],
    itemId = null,
    n = 1;
  function quota(id, extra, qty) {
    var q =
        'SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM custody_items WHERE department_id=?1 AND item_id=?3) OR COALESCE((SELECT COUNT(*) FROM custody_movements m WHERE ' +
        cuLatest('?1', '?2') +
        " AND m.item_id=?3 AND m.kind IN ('out','dmg','lost')),0)+?4>" +
        (qty === undefined ? '(SELECT qty FROM custody_items WHERE department_id=?1 AND item_id=?3)' : '?5') +
        " THEN json_extract('{}','KIVO_CUSTODY_QUOTA') END",
      args = [d, cutoff, id, extra];
    if (qty !== undefined) args.push(qty);
    return env.DB.prepare(q).bind.apply(env.DB.prepare(q), args);
  }
  function normalizeItem(v) {
    cuShape(v, ['name', 'qty', 'prefix', 'color']);
    var name = cuString(v.name, 4096, false).trim(),
      qty = v.qty === undefined ? 0 : v.qty;
    if (typeof qty !== 'number' || !Number.isFinite(qty) || qty < 0) throw cuError('custody-quantity');
    return {
      department_id: d,
      item_id: 'item-' + randTok(),
      name: name,
      qty: qty,
      prefix: v.prefix === undefined ? 'RD' : cuString(v.prefix, 4096, true),
      color: v.color === undefined ? '#b99751' : cuString(v.color, 4096, true),
      presence_mask: 7,
    };
  }
  if (op === 'type-create') {
    var created = normalizeItem(b.item);
    itemId = created.item_id;
    st.push.apply(st, cuBulk(env, CU_TABLES.items[0], CU_TABLES.items[1], [created]));
  } else if (op === 'type-edit' || op === 'type-delete') {
    itemId = cuString(b.itemId, 200, false);
    var old = await env.DB.prepare('SELECT * FROM custody_items WHERE department_id=?1 AND item_id=?2').bind(d, itemId).first();
    if (!old) throw cuError('custody-item-missing', 404);
    if (op === 'type-delete') {
      st.push(
        env.DB.prepare(
          "SELECT CASE WHEN EXISTS(SELECT 1 FROM custody_movements WHERE department_id=?1 AND item_id=?2) THEN json_extract('{}','KIVO_CUSTODY_HISTORY') END",
        ).bind(d, itemId),
      );
      st.push(env.DB.prepare('DELETE FROM custody_items WHERE department_id=?1 AND item_id=?2').bind(d, itemId));
    } else {
      cuShape(b.patch, ['name', 'qty', 'prefix', 'color']);
      var value = normalizeItem(
        Object.assign({ name: old.name, qty: old.qty, prefix: old.prefix || 'RD', color: old.color || '#b99751' }, b.patch),
      );
      st.push(quota(itemId, 0, value.qty));
      st.push(
        env.DB.prepare(
          'UPDATE custody_items SET name=?1,qty=?2,prefix=?3,color=?4,presence_mask=7 WHERE department_id=?5 AND item_id=?6',
        ).bind(value.name, value.qty, value.prefix, value.color, d, itemId),
      );
    }
  } else {
    var seqRow = await env.DB.prepare('SELECT COALESCE(MAX(sequence),-1) AS n FROM custody_movements WHERE department_id=?1')
        .bind(d)
        .first(),
      sequence = seqRow.n;
    var plans = { issues: [], moves: [] },
      required = new Map(),
      serials = new Map(),
      catalog = new Map(),
      employees = null;
    if (op !== 'close') {
      var lines = op === 'issue' ? [{ itemId: b.itemId, holderKey: b.holderKey, condition: b.condition, color: b.color }] : b.lines;
      if (!Array.isArray(lines) || !lines.length || lines.length > 100) throw cuError('custody-lines');
      n = lines.length;
      // Existing employee documents are references only. The retired custody document is never read.
      employees = parseJson(await opResourceGet(env, 'bsdept:' + d + ':bassam_employees_v1'), []);
      if (!Array.isArray(employees)) throw cuError('custody-employees-shape');
      for (var line of lines) {
        cuShape(line, ['itemId', 'holderKey', 'condition', 'color']);
        var id = cuString(line.itemId, 200, false),
          holder = cuString(line.holderKey, 4096, false),
          item = catalog.get(id);
        if (PRIV_NX.test(holder)) throw cuError('privacy-hidden', 409);   // 019u (10): a hand-out needs a register record, never a token
        if (!item) {
          item = await env.DB.prepare('SELECT * FROM custody_items WHERE department_id=?1 AND item_id=?2').bind(d, id).first();
          if (!item) throw cuError('custody-item-missing', 404);
          catalog.set(id, item);
        }
        if (!serials.has(id)) {
          var suffix = await env.DB.prepare(
            'SELECT COALESCE(MAX(serial_number),0) AS n FROM custody_issues WHERE department_id=?1 AND item_id=?2',
          )
            .bind(d, id)
            .first();
          serials.set(id, suffix.n);
        }
        var next = serials.get(id) + 1;
        if (!Number.isSafeInteger(next)) throw cuError('custody-serial-range');
        serials.set(id, next);
        var serial = (item.prefix || 'RD').toUpperCase() + '-' + String(next).padStart(3, '0'),
          issueId = 'issue-' + randTok(),
          moveId = 'move-' + randTok();
        plans.issues.push({ department_id: d, issue_id: issueId, item_id: id, serial: serial, serial_number: next, legacy_identity: null });
        var matches = employees.filter(function (e) {
            return e && (e.eid || e.name) === holder;
          }),
          employee = matches.length === 1 ? matches[0] : {};
        var move = {
          department_id: d,
          move_id: moveId,
          issue_id: issueId,
          item_id: id,
          sequence: ++sequence,
          kind: 'out',
          holder_key: holder,
          hijri_year: clock.y,
          hijri_month: clock.m,
          hijri_day: clock.d,
          condition: line.condition === undefined ? 'جديد' : cuString(line.condition, 4096, true),
          note: null,
          color_snapshot: line.color === undefined ? item.color || '#b99751' : cuString(line.color, 4096, true),
          actor_uid: A.u.id,
          actor_label: String(A.u.name || A.u.id),
          holder_nid_snapshot: String(employee.nid || ''),
          holder_empno_snapshot: String(employee.empno || ''),
          holder_name_snapshot: String(employee.name || ''),
          presence_mask: 125,
          created_at: now,
        };
        plans.moves.push(move);
        outputs.push({ issueId: issueId, moveId: moveId, serial: serial });
        required.set(id, (required.get(id) || 0) + 1);
      }
      required.forEach(function (count, id) {
        st.push(quota(id, count));
      });
    } else {
      var closeId = cuString(b.issueId, 200, false);
      if (['in', 'dmg', 'lost'].indexOf(b.kind) < 0) throw cuError('custody-close-kind');
      var held = await env.DB.prepare(
        'SELECT m.*,s.serial FROM custody_movements m JOIN custody_issues s ON s.department_id=m.department_id AND s.issue_id=m.issue_id WHERE m.department_id=?1 AND m.issue_id=?2 ORDER BY m.hijri_year DESC,m.hijri_month DESC,m.hijri_day DESC,m.sequence DESC LIMIT 1',
      )
        .bind(d, closeId)
        .first();
      if (!held) throw cuError('custody-issue-missing', 404);
      var closed = Object.assign({}, held, {
        move_id: 'move-' + randTok(),
        sequence: ++sequence,
        kind: b.kind,
        hijri_year: clock.y,
        hijri_month: clock.m,
        hijri_day: clock.d,
        note: b.note === undefined ? '' : cuString(b.note, 4096, true),
        actor_uid: A.u.id,
        actor_label: String(A.u.name || A.u.id),
        created_at: now,
      });
      closed.presence_mask |= 10;
      plans.moves.push(closed);
      outputs.push({ issueId: closeId, moveId: closed.move_id, serial: held.serial });
    }
    st.push.apply(st, cuBulk(env, CU_TABLES.issues[0], CU_TABLES.issues[1], plans.issues));
    st.push.apply(st, cuBulk(env, CU_TABLES.moves[0], CU_TABLES.moves[1], plans.moves));
    if (op === 'close') st.push(quota(plans.moves[0].item_id, 0));
  }
  st.unshift(revGuard(env, k, base));
  st.push(
    env.DB.prepare(
      "INSERT INTO meta(k,v) VALUES('rev',CAST(COALESCE((SELECT MAX(rev) FROM revs),0)+1 AS TEXT)) ON CONFLICT(k) DO UPDATE SET v=CAST(MAX(CAST(meta.v AS INTEGER),COALESCE((SELECT MAX(rev) FROM revs),0))+1 AS TEXT)",
    ),
  );
  st.push(
    env.DB.prepare(
      "INSERT INTO revs(k,rev) VALUES(?1,CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER)) ON CONFLICT(k) DO UPDATE SET rev=excluded.rev",
    ).bind(k),
  );
  st.push(
    env.DB.prepare(
      "INSERT INTO custody_requests(department_id,account_uid,request_id,fingerprint,resource_rev,operation,result_n,item_id,created_at) VALUES(?1,?2,?3,?4,CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER),?5,?6,?7,?8)",
    ).bind(d, A.u.id, rid, hash, op, n, itemId, now),
  );
  var outRows = outputs.map(function (x, i) {
    return {
      department_id: d,
      account_uid: A.u.id,
      request_id: rid,
      position: i,
      issue_id: x.issueId,
      move_id: x.moveId,
      serial: x.serial,
    };
  });
  st.push.apply(
    st,
    cuBulk(
      env,
      'custody_request_outputs',
      ['department_id', 'account_uid', 'request_id', 'position', 'issue_id', 'move_id', 'serial'],
      outRows,
    ),
  );
  st.push(
    env.DB.prepare(
      "INSERT INTO aud(cid,ts,uid,un,dept,k,rev,etype,eid,ename,act,ctx,bef,aft,ip,dev,city) VALUES(?1,?2,?3,'',?4,?5,CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER),'dataset',?6,'custody',?7,?8,'','',?9,?10,?11)",
    ).bind(
      'custody_' + randTok(),
      now,
      A.u.id,
      d,
      k,
      itemId || rid,
      op,
      JSON.stringify({ requestId: rid, n: n }),
      (meta && meta.ip) || '',
      (meta && meta.dev) || '',
      (meta && meta.city) || '',
    ),
  );
  try {
    await env.DB.batch(st);
  } catch (e) {
    receipt = await cuReceipt(env, A, d, rid, hash);
    if (receipt) return receipt;
    if (isRevConflict(e)) throw cuError('custody-conflict', 409);
    if (/KIVO_CUSTODY_QUOTA/.test(e.message)) throw cuError('custody-quota', 409);
    if (/KIVO_CUSTODY_HISTORY/.test(e.message)) throw cuError('custody-history', 409);
    if (/UNIQUE constraint failed/.test(e.message)) throw cuError('custody-duplicate', 409);
    throw e;
  }
  var ack = await cuReceipt(env, A, d, rid, hash);
  try {
    await cuNotifyCommitted(env, A, d, ack);
  } catch (e) {
    swallow('custody-notify', e, env.__rid);
  }
  return ack;
}
async function cuRoute(env, request, url, ss) {
  try {
    if (
      !(
        ((url.pathname === '/api/custody' || url.pathname === '/api/custody/export') && request.method === 'GET') ||
        (url.pathname === '/api/custody/act' && request.method === 'POST')
      )
    )
      return json({ ok: 0, err: 'method' }, 405);
    var mismatch = sessUidMismatch(env, url, ss, '/api/custody');
    if (mismatch) return mismatch;
    var A = await actorOf(env, ss.uid);
    if (!A) return json({ ok: 0, err: 'session' }, 401);
    if (url.pathname === '/api/custody/export') return json(await cuExport(env, A, url));
    if (request.method === 'GET') return json(await cuRead(env, A, Object.fromEntries(url.searchParams)));
    var bytes = await request.arrayBuffer();
    if (bytes.byteLength > 1024 * 1024) return json({ ok: 0, err: 'body-large' }, 413);
    var body;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      return json({ ok: 0, err: 'bad-body', at: '$' }, 400);
    }
    var bodyError = bodyCheck('/api/custody/act', body); if (bodyError) return json({ok:0,err:'bad-body',at:bodyError},400);
    var limit = await rlHit(env, 'sv', A.u.id, RL_SAVE);
    if (limit) return tooMany(limit);
    return json(await cuAct(env, A, body, reqMeta(request)));
  } catch (e) {
    if (e.cuCode) return json({ ok: 0, err: e.cuCode }, e.cuStatus);
    throw e;
  }
}
