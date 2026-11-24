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
      'greg_year',
      'greg_month',
      'greg_day',
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
      m.y < 1900 ||
      m.y > 2199 ||
      m.m < 1 ||
      m.m > 12 ||
      m.d < 0 ||
      m.d > calGMonthDays(m.y, m.m)
    )   /* V7 · 53 تقويم (ق1 · ق10 · §1.10): يومٌ ميلادي (الصفرُ = يومٌ غير معروف) — الحركةُ بتاريخٍ هجري تُرفض */
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
      greg_year: m.y,
      greg_month: m.m,
      greg_day: m.d,
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
    ' AND m.greg_year*12+m.greg_month<=' +
    cutoffSlot +
    ' AND NOT EXISTS(SELECT 1 FROM custody_movements z WHERE z.department_id=m.department_id AND z.issue_id=m.issue_id AND z.greg_year*12+z.greg_month<=' +
    cutoffSlot +
    ' AND (z.greg_year,z.greg_month,z.greg_day,z.sequence)>(m.greg_year,m.greg_month,m.greg_day,m.sequence))'
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
    set = {},
    keys = {};
  set[k] = JSON.stringify(after);
  keys[k] = 1;
  /* V7 · د5-ح (القفل): المحرّكُ النافذ وحده */
  var X = await enfSavePrep(env, A, {}, set, [], keys, KIVO_BUILD.markers({}, keys), null, false, false, {}, {});
  ctx.enf = enfCtxFor(X, k, '');
  var v = X.batchDeny ? enfNo(X.batchDeny.why, X.batchDeny) : canWrite(A, k, JSON.stringify(after), JSON.stringify(before), ctx);
  if (v.ok) return v;
  var st = [secStmt(env, { uid: A.u.id, act: 'denied', target: k, detail: 'custody:' + op, ip: (meta && meta.ip) || '' })];
  var log = enfLogRow(A, k, v, '/api/custody/act', meta || {});
  if (log) st.push(enfLogStmt(env, log));
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
        التاريخ: r.greg_day ? calGKey(r.greg_year, r.greg_month, r.greg_day) : calGYm(r.greg_year, r.greg_month),   /* V7 · 53 تقويم: ISO ميلادي */
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
